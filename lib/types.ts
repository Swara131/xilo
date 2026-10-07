export type Severity = "low" | "medium" | "high";

export type AssessmentStatus = "compatible" | "concerns" | "attention";

export interface UserProfile {
  age: number;
  dietaryPreferences: string[];
  dietaryPreferenceOther: string;
  allergies: string[];
  allergyOther: string;
  restrictions: string[];
  restrictionOther: string;
  notes: string;
}

export interface NutritionFacts {
  calories: string | null;
  protein: string | null;
  carbohydrates: string | null;
  sugar: string | null;
  fat: string | null;
  saturatedFat: string | null;
  sodium: string | null;
}

export interface PotentialConcern {
  title: string;
  why: string;
  userPreference: string;
  severity: Severity;
}

export interface IngredientExplanation {
  ingredient: string;
  explanation: string;
  level: Severity;
  concern: string | null;
}

export type MatchLevel = "match" | "partial" | "no_match" | "not_found";

export interface WebVerification {
  verified: boolean;
  source: { title: string; url: string } | null;
  webFindings: string;
  matches: {
    productName: boolean;
    ingredients: MatchLevel;
    nutrition: MatchLevel;
  };
  confidence: "high" | "medium" | "low";
}

export interface FoodAnalysis {
  productName: string | null;
  ingredients: string[];
  nutrition: NutritionFacts;
  allergensDetected: string[];
  potentialConcerns: PotentialConcern[];
  preferenceConflicts: string[];
  positivePoints: string[];
  overallAssessment: string;
  assessmentStatus: AssessmentStatus;
  summary: string;
  ingredientExplanations: IngredientExplanation[];
  alternativeCriteria: string[];
  labelNotes: string[];
  webVerification?: WebVerification | null;
}

export interface AnalysisError {
  error: string;
}

export const EMPTY_NUTRITION: NutritionFacts = {
  calories: null,
  protein: null,
  carbohydrates: null,
  sugar: null,
  fat: null,
  saturatedFat: null,
  sodium: null,
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function isFoodAnalysis(value: unknown): value is FoodAnalysis {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.productName != null && typeof record.productName !== "string") return false;
  if (!isStringArray(record.ingredients)) return false;
  if (!isStringArray(record.allergensDetected)) return false;
  if (!isStringArray(record.preferenceConflicts)) return false;
  if (!isStringArray(record.positivePoints)) return false;
  if (!isStringArray(record.alternativeCriteria)) return false;
  if (!isStringArray(record.labelNotes)) return false;
  if (typeof record.overallAssessment !== "string" || typeof record.summary !== "string") return false;
  if (
    record.assessmentStatus !== "compatible" &&
    record.assessmentStatus !== "concerns" &&
    record.assessmentStatus !== "attention"
  ) {
    return false;
  }

  const nutrition = record.nutrition;
  if (!nutrition || typeof nutrition !== "object" || Array.isArray(nutrition)) return false;
  const facts = nutrition as Record<string, unknown>;
  for (const key of ["calories", "protein", "carbohydrates", "sugar", "fat", "saturatedFat", "sodium"]) {
    const item = facts[key];
    if (item != null && typeof item !== "string") return false;
  }

  if (!Array.isArray(record.potentialConcerns)) return false;
  for (const concern of record.potentialConcerns) {
    if (!concern || typeof concern !== "object") return false;
    const item = concern as Record<string, unknown>;
    if (typeof item.title !== "string" || typeof item.why !== "string" || typeof item.userPreference !== "string") {
      return false;
    }
    if (item.severity !== "low" && item.severity !== "medium" && item.severity !== "high") return false;
  }

  if (!Array.isArray(record.ingredientExplanations)) return false;
  for (const explanation of record.ingredientExplanations) {
    if (!explanation || typeof explanation !== "object") return false;
    const item = explanation as Record<string, unknown>;
    if (typeof item.ingredient !== "string" || typeof item.explanation !== "string") return false;
    if (item.level !== "low" && item.level !== "medium" && item.level !== "high") return false;
    if (item.concern != null && typeof item.concern !== "string") return false;
  }

  if (record.webVerification != null && !isWebVerification(record.webVerification)) return false;

  return true;
}

export function isWebVerification(value: unknown): value is WebVerification {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (typeof record.verified !== "boolean") return false;
  if (typeof record.webFindings !== "string") return false;
  if (record.confidence !== "high" && record.confidence !== "medium" && record.confidence !== "low") return false;
  if (record.source != null) {
    if (!record.source || typeof record.source !== "object") return false;
    const source = record.source as Record<string, unknown>;
    if (typeof source.title !== "string" || typeof source.url !== "string") return false;
  }
  if (!record.matches || typeof record.matches !== "object") return false;
  const matches = record.matches as Record<string, unknown>;
  const level = (item: unknown) =>
    item === "match" || item === "partial" || item === "no_match" || item === "not_found";
  return typeof matches.productName === "boolean" && level(matches.ingredients) && level(matches.nutrition);
}

export const ASSESSMENT_TITLES: Record<AssessmentStatus, string> = {
  compatible: "Looks compatible with your preferences",
  concerns: "Potential concerns detected",
  attention: "Some information requires attention",
};
