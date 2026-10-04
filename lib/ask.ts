const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
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
  return new Error("PROVIDER_ERROR");
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

function systemPrompt(context: string): string {
  return `You are the xilo-food inspector voice assistant.
Answer in 2 to 4 short sentences that are easy to say aloud.
You are not a doctor. Do not diagnose, prescribe, or say a food is 100% safe or unsafe.
Use only the label facts in the context. If a fact is missing, say it was not detected. Do not invent ingredients or nutrition numbers.
If no label has been scanned, you may explain general food-label terms and suggest scanning a label for a personal reading.

Context:
${context}`;
}

export async function askFoodQuestion(input: {
  question: string;
  history: ChatTurn[];
  context: string;
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("MISSING_API_KEY");

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "xilo-food inspector",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 512,
      messages: [
        { role: "system", content: systemPrompt(input.context) },
        ...input.history,
        { role: "user", content: input.question },
      ],
    }),
  });

  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string } | string;
    choices?: Array<{ message?: { content?: unknown } }>;
  } | null;
  const providerMessage = providerErrorText(body?.error).split(apiKey).join("");
  if (!response.ok || providerMessage) {
    throw providerFailure(response.status, providerMessage);
  }

  const text = readMessageContent(body?.choices?.[0]?.message?.content).trim();
  if (!text) throw new Error("EMPTY_RESPONSE");
  return text.slice(0, 1200);
}
