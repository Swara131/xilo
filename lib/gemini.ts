import { ALLERGIES, DIETARY_PREFERENCES, RESTRICTIONS, labelFor } from "./options";
import { normalizeAnalysis, readableLabelError } from "./normalize-analysis";
import type { FoodAnalysis, UserProfile } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELS = ["google/gemini-2.5-flash", "google/gemini-2.0-flash-001"];

function describeList(ids: string[], choices: { id: string; label: string }[], other: string): string {
  if (ids.length === 0) return "None stated";
  return ids
    .map((id) => (id === "other" ? other || "Other" : labelFor(choices, id)))
    .join(", ");
}

function describeProfile(profile: UserProfile): string {
  return [
    `Age: ${profile.age} (context only — do not give age-specific medical advice)`,
    `Dietary preferences: ${describeList(profile.dietaryPreferences, DIETARY_PREFERENCES, profile.dietaryPreferenceOther)}`,
    `Allergies: ${describeList(profile.allergies, ALLERGIES, profile.allergyOther)}`,
    `Things to avoid: ${describeList(profile.restrictions, RESTRICTIONS, profile.restrictionOther)}`,
    `Other notes from the user: ${profile.notes || "None"}`,
    "Notes are preferences, not a medical history.",
  ].join("\n");
}

function buildPrompt(profile: UserProfile): string {
  return `You are xilo-food inspector, an informational food-label assistant.
You are not a doctor. You do not diagnose, treat, or give medical advice.

Read the uploaded image and return JSON only, with exactly these keys:
{
  "error": "",
  "productName": "",
  "ingredients": [],
  "nutrition": {
    "calories": "",
    "protein": "",
    "carbohydrates": "",
    "sugar": "",
    "fat": "",
    "saturatedFat": "",
    "sodium": ""
  },
  "allergensDetected": [],
  "potentialConcerns": [{ "title": "", "why": "", "userPreference": "", "severity": "low" }],
  "positivePoints": [],
  "overallAssessment": "",
  "ingredientExplanations": [{ "ingredient": "", "explanation": "", "level": "low", "concern": "" }],
  "labelNotes": []
}
severity and level must be "low", "medium", or "high".

Steps:
1. Decide whether the image shows a packaged food ingredient list and/or nutrition label.
2. Extract only text that is actually visible or reasonably readable.
3. Compare that text with the user profile.
4. Explain ingredients in simple language.

Hard rules:
- Never invent ingredients, allergens, product names, or nutrition numbers.
- If a value is missing, blurry, or cut off, use an empty string. Do not guess typical values for a product category.
- Do not say a food is 100% safe, 100% unsafe, guaranteed, toxic, or that it will cause or prevent disease.
- Use cautious wording: "potential concern", "based on the information provided", "may require attention", "potentially suitable based on your preferences".
- Severity is an informational flag, not a medical risk score.
- high: a stated allergy or a clear dietary rule appears in the readable text.
- medium: a possible or ambiguous conflict.
- low: a minor note.
- If the image is not a food ingredient or nutrition label, set error to exactly: "This image does not appear to contain a readable food ingredient or nutrition label." Leave lists empty and nutrition values empty.
- If it is a food label but the text cannot be read, set error to exactly: "We could not read the ingredient or nutrition text in this photo. Try a closer, well-lit photo of the label."
- If the label can be read, set error to an empty string.
- ingredientExplanations must describe only ingredients you extracted. One short sentence each.
- positivePoints must be supported by extracted text. Say "no detected X in the readable label text" rather than promising the product is free of X.
- overallAssessment is one or two cautious sentences.
- For nutrition, copy the printed value and unit, such as "180 kcal" or "240 mg". Use an empty string when it is not visible.
- allergensDetected lists only allergens explicitly printed or clearly named in the ingredient list.
- labelNotes can include a serving size or other short facts that are actually printed. Do not add advice.

User profile:
${describeProfile(profile)}`;
}

function parseModelJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  return JSON.parse(cleaned);
}

function readMessageContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
        return part.text;
      }
      return "";
    })
    .join("");
}

function isModelMissing(status: number, message: string): boolean {
  return status === 404 || /not found|no endpoints|unknown model|is not supported|invalid model/i.test(message);
}

function providerErrorText(error: { message?: string } | string | undefined): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  return error.message || "";
}

function providerFailure(status: number, message: string): Error {
  const lower = message.toLowerCase();
  if (status === 401 || status === 403 || /invalid api key|unauthorized|unauthenticated|permission denied/.test(lower)) {
    return new Error("AUTH_REJECTED");
  }
  if (
    status === 402 ||
    /insufficient credits|more credits|can only afford|payment required|quota|credit limit/.test(lower)
  ) {
    return new Error("INSUFFICIENT_CREDITS");
  }
  if (status === 429 || /rate limit|too many requests/.test(lower)) {
    return new Error("RATE_LIMITED");
  }
  if (isModelMissing(status, message)) {
    const failure = new Error("MODEL_MISSING");
    failure.name = "MODEL_MISSING";
    return failure;
  }
  return new Error("PROVIDER_ERROR");
}

async function requestAnalysis(options: {
  apiKey: string;
  model: string;
  prompt: string;
  mimeType: string;
  base64: string;
}): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "xilo-food inspector",
    },
    body: JSON.stringify({
      model: options.model,
      temperature: 0.2,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: options.prompt },
            {
              type: "image_url",
              image_url: { url: `data:${options.mimeType};base64,${options.base64}` },
            },
          ],
        },
      ],
    }),
  });

  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string } | string;
    choices?: Array<{ message?: { content?: unknown } }>;
  } | null;
  const providerMessage = providerErrorText(body?.error).split(options.apiKey).join("");

  if (!response.ok || providerMessage) {
    throw providerFailure(response.status, providerMessage);
  }

  const text = readMessageContent(body?.choices?.[0]?.message?.content);
  if (!text.trim()) throw new Error("EMPTY_RESPONSE");
  return text;
}

export async function analyzeFoodLabel(options: {
  base64: string;
  mimeType: string;
  profile: UserProfile;
}): Promise<FoodAnalysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  const prompt = buildPrompt(options.profile);
  let lastError: unknown;

  for (const model of MODELS) {
    try {
      const text = await requestAnalysis({
        apiKey,
        model,
        prompt,
        mimeType: options.mimeType,
        base64: options.base64,
      });
      let parsed: unknown;
      try {
        parsed = parseModelJson(text);
      } catch {
        throw new Error("INVALID_JSON");
      }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("INVALID_JSON");
      }
      const labelError = readableLabelError(parsed);
      const analysis = normalizeAnalysis(parsed, options.profile);
      if (analysis.ingredients.length === 0) {
        const failure = new Error(labelError === "NOT_A_LABEL" ? "NOT_A_LABEL" : "UNREADABLE_INGREDIENTS");
        failure.name = "UNREADABLE_LABEL";
        throw failure;
      }
      return analysis;
    } catch (error) {
      if (error instanceof Error && (error.name === "UNREADABLE_LABEL" || error.message === "INVALID_JSON")) {
        throw error;
      }
      if (error instanceof SyntaxError) throw new Error("INVALID_JSON");
      lastError = error;
      if (!(error instanceof Error) || error.name !== "MODEL_MISSING") throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("ANALYSIS_FAILED");
}
