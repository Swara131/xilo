import type { NutritionFacts } from "./types";

export type NutrientKey = keyof NutritionFacts;

export interface NutrientMeta {
  key: NutrientKey;
  label: string;
  reference: number;
  referenceUnit: "kcal" | "g" | "mg";
  referenceLabel: string;
}

export const NUTRIENTS: NutrientMeta[] = [
  {
    key: "calories",
    label: "Calories",
    reference: 2000,
    referenceUnit: "kcal",
    referenceLabel: "2,000 kcal",
  },
  {
    key: "protein",
    label: "Protein",
    reference: 50,
    referenceUnit: "g",
    referenceLabel: "50 g",
  },
  {
    key: "carbohydrates",
    label: "Carbohydrates",
    reference: 275,
    referenceUnit: "g",
    referenceLabel: "275 g",
  },
  {
    key: "sugar",
    label: "Sugar",
    reference: 50,
    referenceUnit: "g",
    referenceLabel: "50 g",
  },
  {
    key: "fat",
    label: "Fat",
    reference: 78,
    referenceUnit: "g",
    referenceLabel: "78 g",
  },
  {
    key: "saturatedFat",
    label: "Saturated Fat",
    reference: 20,
    referenceUnit: "g",
    referenceLabel: "20 g",
  },
  {
    key: "sodium",
    label: "Sodium",
    reference: 2300,
    referenceUnit: "mg",
    referenceLabel: "2,300 mg",
  },
];

function firstNumber(value: string): number | null {
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const amount = Number(match[1]);
  return Number.isFinite(amount) ? amount : null;
}

function unitOf(value: string): "kcal" | "g" | "mg" | null {
  const lower = value.toLowerCase();
  if (lower.includes("kcal") || lower.includes("calorie")) return "kcal";
  if (lower.includes("mg")) return "mg";
  if (/(^|[^a-z])g([^a-z]|$)/i.test(value)) return "g";
  return null;
}

/** Convert a printed label value into the unit used by the visual scale. */
export function amountInReferenceUnit(raw: string | null, meta: NutrientMeta): number | null {
  if (!raw) return null;
  const amount = firstNumber(raw);
  const unit = unitOf(raw);
  if (amount == null || unit == null) return null;

  if (unit === meta.referenceUnit) return amount;
  if (unit === "g" && meta.referenceUnit === "mg") return amount * 1000;
  if (unit === "mg" && meta.referenceUnit === "g") return amount / 1000;
  return null;
}

export function scalePercent(raw: string | null, meta: NutrientMeta): number | null {
  const amount = amountInReferenceUnit(raw, meta);
  if (amount == null || meta.reference <= 0) return null;
  return Math.max(0, Math.min(100, (amount / meta.reference) * 100));
}
