import { applyProfileChecks, buildAlternativeCriteria } from "./preference-checks";
import {
  ASSESSMENT_TITLES,
  EMPTY_NUTRITION,
  type AssessmentStatus,
  type FoodAnalysis,
  type IngredientExplanation,
  type NutritionFacts,
  type PotentialConcern,
  type Severity,
  type UserProfile,
} from "./types";

const BANNED = /100\s*%|guarantee|diagnos|cure your|will kill|toxic|safe to eat|unsafe to eat|medical certainty/i;
const MISSING =
  /^(not detected|not shown|not listed|not provided|missing|unknown|n\/a|none|unreadable|not visible|not available|-|—)$/i;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function missingToNull(value: string): string | null {
  if (!value || MISSING.test(value)) return null;
  return value;
}

function asStringList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  for (const item of value) {
    const text = asString(item);
    if (!text || MISSING.test(text)) continue;
    unique.add(text);
    if (unique.size >= limit) break;
  }
  return [...unique];
}

function asSeverity(value: unknown, fallback: Severity = "low"): Severity {
  return value === "low" || value === "medium" || value === "high" ? value : fallback;
}

function soften(text: string, fallback: string): string {
  if (!text || BANNED.test(text)) return fallback;
  return text;
}

function asConcerns(value: unknown): PotentialConcern[] {
  if (!Array.isArray(value)) return [];
  const concerns: PotentialConcern[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) {
      concerns.push({
        title: item.trim(),
        why: "Based on the information provided, this may require attention.",
        userPreference: "Your profile",
        severity: "medium",
      });
      continue;
    }
    const record = asRecord(item);
    if (!record) continue;
    const title = asString(record.title);
    if (!title) continue;
    concerns.push({
      title,
      why: soften(
        asString(record.why),
        "Based on the information provided, this may require attention.",
      ),
      userPreference: asString(record.userPreference) || "Your profile",
      severity: asSeverity(record.severity, "medium"),
    });
  }
  return concerns.slice(0, 20);
}

function asExplanations(value: unknown): IngredientExplanation[] {
  if (!Array.isArray(value)) return [];
  const explanations: IngredientExplanation[] = [];
  for (const item of value) {
    const record = asRecord(item);
    if (!record) continue;
    const ingredient = asString(record.ingredient);
    if (!ingredient || MISSING.test(ingredient)) continue;
    const concern = missingToNull(asString(record.concern));
    explanations.push({
      ingredient,
      explanation: soften(
        asString(record.explanation),
        "Listed on the label. A plain-language explanation was not available from the reading.",
      ),
      level: asSeverity(record.level),
      concern,
    });
  }
  return explanations.slice(0, 80);
}

function asNutrition(value: unknown): NutritionFacts {
  const record = asRecord(value) ?? {};
  const read = (key: keyof NutritionFacts) => missingToNull(asString(record[key]));
  return {
    calories: read("calories"),
    protein: read("protein"),
    carbohydrates: read("carbohydrates"),
    sugar: read("sugar"),
    fat: read("fat"),
    saturatedFat: read("saturatedFat"),
    sodium: read("sodium"),
  };
}

export function deriveAssessmentStatus(
  concerns: PotentialConcern[],
  ingredientCount: number,
): AssessmentStatus {
  if (concerns.some((item) => item.severity === "high" || item.severity === "medium")) {
    return "concerns";
  }
  if (concerns.length > 0 || ingredientCount === 0) return "attention";
  return "compatible";
}

function assessmentCopy(status: AssessmentStatus, productName: string | null): string {
  const name = productName ?? "This product";
  if (status === "concerns") {
    return `${name} may require attention based on the preferences and allergies you shared. The notes below are informational flags, not a medical conclusion.`;
  }
  if (status === "attention") {
    return "Some label details may require attention, or parts of the label could not be read. Review what we could extract before you decide.";
  }
  return `${name} looks potentially suitable based on your preferences and the label text we could read. This is not a guarantee.`;
}

function spokenSummary(analysis: Pick<FoodAnalysis, "productName" | "assessmentStatus" | "potentialConcerns">): string {
  const name = analysis.productName ?? "This product";
  const status = ASSESSMENT_TITLES[analysis.assessmentStatus];
  const concernText =
    analysis.potentialConcerns.length > 0
      ? `Potential concerns include ${analysis.potentialConcerns
          .slice(0, 3)
          .map((item) => item.title)
          .join(", ")}.`
      : "No potential concerns were flagged from the label text we could read.";
  return `${name}. ${status}. ${concernText} These flags are informational and are not a medical diagnosis.`;
}

export function normalizeAnalysis(input: unknown, profile: UserProfile): FoodAnalysis {
  const record = asRecord(input) ?? {};
  const explanations = asExplanations(record.ingredientExplanations);
  const ingredients = asStringList(record.ingredients, 80);
  for (const item of explanations) {
    if (!ingredients.some((name) => name.toLowerCase() === item.ingredient.toLowerCase())) {
      ingredients.push(item.ingredient);
    }
  }

  const nutrition = asNutrition(record.nutrition);
  const hasNutrition = Object.values(nutrition).some(Boolean);
  const productName = missingToNull(asString(record.productName));

  const draft: FoodAnalysis = {
    productName,
    ingredients: ingredients.slice(0, 80),
    nutrition: hasNutrition ? nutrition : { ...EMPTY_NUTRITION },
    allergensDetected: asStringList(record.allergensDetected, 20),
    potentialConcerns: asConcerns(record.potentialConcerns),
    preferenceConflicts: [],
    positivePoints: asStringList(record.positivePoints, 8),
    overallAssessment: "",
    assessmentStatus: "attention",
    summary: "",
    ingredientExplanations: explanations,
    alternativeCriteria: buildAlternativeCriteria(profile),
    labelNotes: asStringList(record.labelNotes, 8),
  };

  const checked = applyProfileChecks(draft, profile);
  const assessmentStatus = deriveAssessmentStatus(
    checked.potentialConcerns,
    checked.ingredients.length,
  );
  const overallAssessment = assessmentCopy(assessmentStatus, productName);

  return {
    ...checked,
    nutrition: checked.nutrition,
    assessmentStatus,
    overallAssessment,
    summary: spokenSummary({
      productName,
      assessmentStatus,
      potentialConcerns: checked.potentialConcerns,
    }),
  };
}

export function readableLabelError(input: unknown): string | null {
  const record = asRecord(input);
  if (!record) return null;
  const error = asString(record.error);
  if (!error || /^(none|no error|ok|null|n\/a)$/i.test(error)) return null;
  if (/does not appear to contain a readable food/i.test(error)) return "NOT_A_LABEL";
  return "UNREADABLE_INGREDIENTS";
}
