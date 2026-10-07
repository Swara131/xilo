import { NextResponse } from "next/server";
import { EMPTY_NUTRITION, type NutritionFacts } from "@/lib/types";
import { emptyVerification, verifyFoodOnWeb } from "@/lib/verify-food";

export const runtime = "nodejs";
export const maxDuration = 60;

function asText(value: unknown, limit: number): string {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function asNutrition(value: unknown): NutritionFacts {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...EMPTY_NUTRITION };
  const record = value as Record<string, unknown>;
  const read = (key: keyof NutritionFacts) => asText(record[key], 40) || null;
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

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    const productName = asText(record?.productName, 160);
    const brand = asText(record?.brand, 80);
    const ingredients = Array.isArray(record?.ingredients)
      ? record.ingredients.map((item) => asText(item, 80)).filter(Boolean).slice(0, 20)
      : [];
    const verification = await verifyFoodOnWeb({
      productName,
      brand,
      ingredients,
      nutrition: asNutrition(record?.nutrition),
    });
    return NextResponse.json(verification, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(emptyVerification(), { headers: { "Cache-Control": "no-store" } });
  }
}
