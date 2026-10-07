import type { AnalysisLanguage } from "@/lib/i18n/language";
import type { FoodAnalysis } from "@/lib/types";

/** A stored report. Nutrition, ingredients, and concerns live on `analysis`. */
export interface SharedReport {
  id: string;
  createdAt: string;
  expiresAt: string;
  product: {
    name: string | null;
    brand: string | null;
  };
  analysis: FoodAnalysis;
  language: AnalysisLanguage;
  deleteToken: string;
}

/** What a person with the link is allowed to see. */
export type PublicReport = Omit<SharedReport, "deleteToken">;
