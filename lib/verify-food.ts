import type { MatchLevel, NutritionFacts, WebVerification } from "./types";
import { fetchTinyFishPage, searchTinyFish, type TinyFishSearchResult } from "./tinyfish";

const STOP_WORDS = new Set(["the", "and", "with", "from", "for", "food", "original", "classic"]);

export interface VerifyInput {
  productName: string;
  brand: string;
  ingredients: string[];
  nutrition: NutritionFacts;
}

export function emptyVerification(): WebVerification {
  return {
    verified: false,
    source: null,
    webFindings: "",
    matches: {
      productName: false,
      ingredients: "not_found",
      nutrition: "not_found",
    },
    confidence: "low",
  };
}

function words(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function includesTerm(haystack: string, term: string): boolean {
  const tokens = words(term);
  if (tokens.length === 0) return false;
  const found = tokens.filter((token) => haystack.includes(token)).length;
  return found / tokens.length >= 0.6;
}

function scoreResult(result: TinyFishSearchResult, productName: string, ingredients: string[]): number {
  const haystack = `${result.title} ${result.snippet}`.toLowerCase();
  let score = 0;
  for (const word of words(productName)) {
    if (haystack.includes(word)) score += 2;
  }
  for (const ingredient of ingredients.slice(0, 6)) {
    const token = words(ingredient)[0];
    if (token && haystack.includes(token)) score += 1;
  }
  return score;
}

function compareIngredients(ingredients: string[], pageText: string): MatchLevel {
  const usable = ingredients.map((item) => item.trim()).filter((item) => words(item).length > 0);
  if (usable.length === 0 || !pageText) return "not_found";
  const found = usable.filter((item) => includesTerm(pageText, item)).length;
  if (found === 0) return "no_match";
  if (found / usable.length >= 0.6 && found >= 2) return "match";
  return "partial";
}

function compareNutrition(nutrition: NutritionFacts, pageText: string): MatchLevel {
  const numbers = Object.values(nutrition)
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map((value) => value.match(/(\d+(?:\.\d+)?)/)?.[1])
    .filter((value): value is string => !!value);
  if (numbers.length === 0 || !pageText) return "not_found";
  const found = numbers.filter((amount) => new RegExp(`(^|\\D)${amount}(\\D|$)`).test(pageText)).length;
  if (found === 0) return "no_match";
  if (found >= Math.min(3, numbers.length)) return "match";
  return "partial";
}

function findings(productMatch: boolean, ingredients: MatchLevel): string {
  if (productMatch && ingredients === "match") return "Web information supports the label analysis.";
  if (productMatch) return "Potential match found. Some information could not be verified.";
  return "Based on the available information, some details could not be verified.";
}

export function buildSearchQuery(input: Pick<VerifyInput, "productName" | "brand">): string {
  const brand =
    input.brand && !input.productName.toLowerCase().includes(input.brand.toLowerCase()) ? input.brand : "";
  return [brand, input.productName, "ingredients nutrition"].filter(Boolean).join(" ").replace(/\s+/g, " ").slice(0, 300);
}

export async function verifyFoodOnWeb(input: VerifyInput): Promise<WebVerification> {
  const productName = input.productName.trim();
  if (!productName) return emptyVerification();

  let results: TinyFishSearchResult[];
  try {
    const searched = await searchTinyFish(buildSearchQuery(input));
    if (!Array.isArray(searched)) {
      console.error("TinyFish search unavailable:", searched);
      return emptyVerification();
    }
    results = searched;
  } catch (error) {
    console.error("TinyFish search unavailable:", error instanceof Error ? error.message : "unavailable");
    return emptyVerification();
  }
  if (results.length === 0) return emptyVerification();

  const ranked = results
    .map((result) => ({ result, score: scoreResult(result, productName, input.ingredients) }))
    .filter((item) => item.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
  if (ranked.length === 0) return emptyVerification();

  for (const candidate of ranked) {
    let page: Awaited<ReturnType<typeof fetchTinyFishPage>>;
    try {
      page = await fetchTinyFishPage(candidate.result.url);
    } catch (error) {
      console.error("TinyFish fetch unavailable:", error instanceof Error ? error.message : "unavailable");
      continue;
    }
    if (typeof page === "string") {
      console.error("TinyFish fetch unavailable:", page);
      continue;
    }

    const pageText = `${page.title}\n${page.text}`.toLowerCase();
    const productMatch = includesTerm(pageText, productName);
    const ingredients = compareIngredients(input.ingredients, pageText);
    const nutrition = compareNutrition(input.nutrition, pageText);
    const confidence =
      productMatch && ingredients === "match"
        ? "high"
        : productMatch && (ingredients === "partial" || nutrition === "match" || nutrition === "partial")
          ? "medium"
          : "low";
    if (!productMatch || confidence === "low") continue;

    return {
      verified: true,
      source: { title: page.title || candidate.result.title, url: page.url },
      webFindings: findings(productMatch, ingredients),
      matches: { productName: true, ingredients, nutrition },
      confidence,
    };
  }

  return emptyVerification();
}
