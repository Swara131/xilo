import { ALLERGIES, RESTRICTIONS, labelFor } from "./options";
import { amountInReferenceUnit, NUTRIENTS } from "./nutrition";
import type { FoodAnalysis, PotentialConcern, Severity, UserProfile } from "./types";

interface TermRule {
  id: string;
  terms: string[];
  exceptions?: string[];
  title: string;
  why: (match: string) => string;
  userPreference: string;
  severity: Severity;
}

const DAIRY_TERMS = [
  "milk",
  "whey",
  "casein",
  "lactose",
  "butter",
  "cheese",
  "ghee",
  "cream",
  "yogurt",
  "yoghurt",
  "buttermilk",
  "curd",
];

const DAIRY_EXCEPTIONS = [
  "coconut milk",
  "almond milk",
  "oat milk",
  "soy milk",
  "rice milk",
  "nut milk",
];

const MEAT_TERMS = [
  "beef",
  "pork",
  "chicken",
  "turkey",
  "lamb",
  "mutton",
  "bacon",
  "ham",
  "lard",
  "meat",
  "poultry",
];

const FISH_TERMS = ["fish", "anchovy", "tuna", "salmon", "cod", "sardine", "bass"];
const SHELLFISH_TERMS = ["shrimp", "prawn", "crab", "lobster", "crayfish", "shellfish"];

function hasTerm(line: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, "i").test(line);
}

function findMatch(line: string, terms: string[], exceptions: string[] = []): string | null {
  const lower = line.toLowerCase();
  if (exceptions.some((phrase) => lower.includes(phrase))) return null;
  return terms.find((term) => hasTerm(line, term)) ?? null;
}

function linesFrom(analysis: FoodAnalysis): string[] {
  return [
    ...analysis.ingredients,
    ...analysis.ingredientExplanations.map((item) => item.ingredient),
    ...analysis.allergensDetected,
  ]
    .map((line) => line.trim())
    .filter(Boolean);
}

function concernKey(concern: PotentialConcern): string {
  return `${concern.title}|${concern.userPreference}`.toLowerCase();
}

function addConcern(concerns: PotentialConcern[], next: PotentialConcern) {
  const key = concernKey(next);
  if (!concerns.some((item) => concernKey(item) === key)) concerns.push(next);
}

function rulesForProfile(profile: UserProfile): TermRule[] {
  const rules: TermRule[] = [];
  const prefs = new Set(profile.dietaryPreferences);

  const avoidsMeat = prefs.has("vegetarian") || prefs.has("vegan") || prefs.has("eggetarian");
  const avoidsFish = avoidsMeat;
  const avoidsDairy = prefs.has("vegan") || prefs.has("dairy-free") || profile.allergies.includes("milk");
  const avoidsEggs = prefs.has("vegan") || profile.allergies.includes("eggs");
  const avoidsGluten = prefs.has("gluten-free") || profile.allergies.includes("wheat");

  if (avoidsMeat) {
    const preference = prefs.has("vegan")
      ? "Vegan"
      : prefs.has("eggetarian")
        ? "Eggetarian"
        : "Vegetarian";
    rules.push({
      id: "meat",
      terms: MEAT_TERMS,
      title: "Animal ingredient detected",
      why: (match) =>
        `The readable label includes "${match}", which may conflict with a ${preference.toLowerCase()} preference.`,
      userPreference: preference,
      severity: "high",
    });
  }

  if (avoidsFish) {
    rules.push({
      id: "fish-diet",
      terms: FISH_TERMS,
      title: "Fish detected",
      why: (match) =>
        `The readable label includes "${match}". This may require attention for the dietary preference you selected.`,
      userPreference: prefs.has("vegan") ? "Vegan" : prefs.has("eggetarian") ? "Eggetarian" : "Vegetarian",
      severity: "high",
    });
    rules.push({
      id: "shellfish-diet",
      terms: SHELLFISH_TERMS,
      title: "Shellfish detected",
      why: (match) =>
        `The readable label includes "${match}". This may require attention for the dietary preference you selected.`,
      userPreference: prefs.has("vegan") ? "Vegan" : prefs.has("eggetarian") ? "Eggetarian" : "Vegetarian",
      severity: "high",
    });
  }

  if (prefs.has("vegetarian") || prefs.has("vegan") || prefs.has("eggetarian")) {
    rules.push({
      id: "gelatin",
      terms: ["gelatin", "rennet"],
      title: "Source may require attention",
      why: (match) =>
        `"${match}" is often animal-derived, and the label text we read does not state the source.`,
      userPreference: prefs.has("vegan") ? "Vegan" : prefs.has("eggetarian") ? "Eggetarian" : "Vegetarian",
      severity: "medium",
    });
  }

  if (avoidsDairy) {
    const dairyReasons = [
      profile.allergies.includes("milk") ? "Allergy: Milk" : null,
      prefs.has("vegan") ? "Vegan" : null,
      prefs.has("dairy-free") ? "Dairy-free" : null,
    ].filter((item): item is string => Boolean(item));
    rules.push({
      id: "dairy",
      terms: DAIRY_TERMS,
      exceptions: DAIRY_EXCEPTIONS,
      title: "Milk or dairy detected",
      why: (match) =>
        `This product appears to contain "${match}" based on the ingredient label.`,
      userPreference: dairyReasons.join(", ") || "Dairy-free",
      severity: "high",
    });
  }

  if (avoidsEggs) {
    rules.push({
      id: "eggs",
      terms: ["egg", "eggs", "albumen"],
      title: "Egg detected",
      why: (match) => `The readable label includes "${match}".`,
      userPreference: profile.allergies.includes("eggs") ? "Allergy: Eggs" : "Vegan",
      severity: "high",
    });
  }

  if (prefs.has("vegan")) {
    rules.push({
      id: "honey",
      terms: ["honey", "beeswax"],
      title: "Animal-derived ingredient detected",
      why: (match) => `The readable label includes "${match}", which is not typically vegan.`,
      userPreference: "Vegan",
      severity: "high",
    });
  }

  if (prefs.has("halal")) {
    rules.push({
      id: "pork",
      terms: ["pork", "bacon", "ham", "lard"],
      title: "Pork ingredient detected",
      why: (match) =>
        `The readable label includes "${match}", which may conflict with a halal preference.`,
      userPreference: "Halal",
      severity: "high",
    });
    rules.push({
      id: "alcohol",
      terms: ["alcohol", "wine", "beer", "rum", "ethanol"],
      title: "Alcohol detected",
      why: (match) =>
        `The readable label includes "${match}". This may require attention if you follow a halal preference.`,
      userPreference: "Halal",
      severity: "high",
    });
    rules.push({
      id: "gelatin-halal",
      terms: ["gelatin"],
      title: "Gelatin source not stated",
      why: () =>
        "Gelatin's source was not specified in the readable label text. It may require attention for a halal preference.",
      userPreference: "Halal",
      severity: "medium",
    });
  }

  if (avoidsGluten) {
    rules.push({
      id: "gluten",
      terms: ["wheat", "barley", "rye", "malt", "semolina", "durum", "spelt", "farro", "triticale"],
      title: "Gluten source detected",
      why: (match) =>
        `The readable label includes "${match}", which is a gluten source based on the ingredient text.`,
      userPreference: profile.allergies.includes("wheat") ? "Allergy: Wheat" : "Gluten-free",
      severity: "high",
    });
  }

  for (const allergyId of profile.allergies) {
    if (allergyId === "other") continue;
    if (allergyId === "milk" && avoidsDairy) continue;
    if (allergyId === "eggs" && avoidsEggs) continue;
    if (allergyId === "wheat" && avoidsGluten) continue;
    if ((allergyId === "fish" || allergyId === "shellfish") && avoidsFish) continue;
    const rule = allergenRule(allergyId);
    if (rule) rules.push(rule);
  }

  if (profile.allergies.includes("other") && profile.allergyOther) {
    rules.push({
      id: "allergy-other",
      terms: [profile.allergyOther],
      title: `${profile.allergyOther} detected`,
      why: (match) =>
        `The readable label includes "${match}", which matches the other allergy you entered.`,
      userPreference: `Allergy: ${profile.allergyOther}`,
      severity: "high",
    });
  }

  if (profile.restrictions.includes("added-sugar")) {
    rules.push({
      id: "added-sugar",
      terms: [
        "sugar",
        "cane sugar",
        "corn syrup",
        "dextrose",
        "fructose",
        "glucose syrup",
        "maltose",
        "molasses",
        "invert sugar",
      ],
      title: "Added sugar ingredient detected",
      why: (match) =>
        `The ingredient list includes "${match}". This may require attention because you asked to avoid added sugar.`,
      userPreference: "Avoid added sugar",
      severity: "medium",
    });
  }

  if (profile.restrictions.includes("hfcs")) {
    rules.push({
      id: "hfcs",
      terms: ["high fructose corn syrup", "high-fructose corn syrup"],
      title: "High-fructose corn syrup detected",
      why: () =>
        "High-fructose corn syrup appears in the readable ingredient list, and you asked to avoid it.",
      userPreference: "Avoid high-fructose corn syrup",
      severity: "medium",
    });
  }

  const restrictionTerms: Record<string, string[]> = {
    "artificial-sweeteners": ["aspartame", "sucralose", "acesulfame", "saccharin", "neotame"],
    "artificial-colors": ["red 40", "yellow 5", "yellow 6", "blue 1", "blue 2", "green 3"],
    preservatives: ["sodium benzoate", "potassium sorbate", "bha", "bht", "sodium nitrite"],
    msg: ["monosodium glutamate", "msg"],
    "palm-oil": ["palm oil", "palm kernel"],
    caffeine: ["caffeine", "guarana"],
    alcohol: ["alcohol", "wine", "beer", "rum", "ethanol"],
  };

  for (const [id, terms] of Object.entries(restrictionTerms)) {
    if (!profile.restrictions.includes(id)) continue;
    const label = labelFor(RESTRICTIONS, id);
    rules.push({
      id,
      terms,
      title: `${label} detected`,
      why: (match) =>
        `The readable label includes "${match}". You asked to avoid ${label.toLowerCase()}.`,
      userPreference: `Avoid ${label.toLowerCase()}`,
      severity: "medium",
    });
  }

  if (profile.restrictions.includes("other") && profile.restrictionOther) {
    rules.push({
      id: "restriction-other",
      terms: [profile.restrictionOther],
      title: `${profile.restrictionOther} detected`,
      why: (match) =>
        `The readable label includes "${match}", which matches something you asked to avoid.`,
      userPreference: `Avoid ${profile.restrictionOther}`,
      severity: "medium",
    });
  }

  return rules;
}

function allergenRule(id: string): TermRule | null {
  const label = labelFor(ALLERGIES, id);
  const shared = {
    title: `${label} detected`,
    why: (match: string) =>
      `This product appears to contain ${label.toLowerCase()} based on the ingredient label ("${match}").`,
    userPreference: `Allergy: ${label}`,
    severity: "high" as const,
  };

  switch (id) {
    case "milk":
      return { id: "allergy-milk", terms: DAIRY_TERMS, exceptions: DAIRY_EXCEPTIONS, ...shared };
    case "peanuts":
      return { id: "allergy-peanuts", terms: ["peanut", "peanuts", "groundnut"], ...shared };
    case "tree-nuts":
      return {
        id: "allergy-tree-nuts",
        terms: ["almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut", "macadamia", "brazil nut", "pine nut"],
        ...shared,
      };
    case "soy":
      return { id: "allergy-soy", terms: ["soy", "soya", "soybean"], ...shared };
    case "wheat":
      return {
        id: "allergy-wheat",
        terms: ["wheat", "semolina", "durum", "spelt"],
        ...shared,
      };
    case "eggs":
      return { id: "allergy-eggs", terms: ["egg", "eggs", "albumen"], ...shared };
    case "fish":
      return { id: "allergy-fish", terms: FISH_TERMS, ...shared };
    case "shellfish":
      return { id: "allergy-shellfish", terms: SHELLFISH_TERMS, ...shared };
    default:
      return null;
  }
}

function sugarLineIsOnlyAFreeClaim(line: string): boolean {
  return /no added sugar|sugar[-\s]?free|without sugar|zero sugar/i.test(line);
}

function matchRule(line: string, rule: TermRule): string | null {
  if (rule.id === "added-sugar" && sugarLineIsOnlyAFreeClaim(line)) {
    const cleaned = line.replace(/no added sugar|sugar[-\s]?free|without sugar|zero sugar/gi, "");
    return findMatch(cleaned, rule.terms, rule.exceptions);
  }
  if (rule.id === "alcohol" && /alcohol[-\s]?free|no alcohol/i.test(line)) return null;
  return findMatch(line, rule.terms, rule.exceptions);
}

function sodiumConcern(analysis: FoodAnalysis, profile: UserProfile): PotentialConcern | null {
  if (!profile.restrictions.includes("high-sodium")) return null;
  const meta = NUTRIENTS.find((item) => item.key === "sodium");
  if (!meta) return null;
  const mg = amountInReferenceUnit(analysis.nutrition.sodium, meta);
  if (mg == null || mg < 600) return null;
  return {
    title: "Sodium may require attention",
    why: `Sodium is listed as ${analysis.nutrition.sodium}. That is toward the higher side of a common daily reference of 2,300 mg. This is an informational flag, not a medical risk score.`,
    userPreference: "Avoid high sodium",
    severity: "medium",
  };
}

function positivePoints(analysis: FoodAnalysis, profile: UserProfile, concerns: PotentialConcern[]): string[] {
  const points: string[] = [];
  const readableIngredients = analysis.ingredients.length > 0;
  const allergenConcern = concerns.some((item) => item.userPreference.startsWith("Allergy:"));

  if (readableIngredients && profile.allergies.length > 0 && !allergenConcern) {
    points.push("None of your selected allergies were detected in the readable label text.");
  }

  const proteinMeta = NUTRIENTS.find((item) => item.key === "protein");
  const protein = proteinMeta
    ? amountInReferenceUnit(analysis.nutrition.protein, proteinMeta)
    : null;
  if (protein != null && protein >= 5) {
    points.push(`Contains protein (listed as ${analysis.nutrition.protein}).`);
  }

  const sugarMeta = NUTRIENTS.find((item) => item.key === "sugar");
  const sugar = sugarMeta ? amountInReferenceUnit(analysis.nutrition.sugar, sugarMeta) : null;
  if (sugar != null && sugar <= 5) {
    points.push(
      `Sugar is listed as ${analysis.nutrition.sugar}, which is below this app's 5 g informational threshold.`,
    );
  }

  for (const point of analysis.positivePoints) {
    const banned = /100\s*%|guarantee|diagnos|safe to eat|unsafe|cure|doctor/i.test(point);
    if (!banned) points.push(point);
  }

  const unique = new Set<string>();
  return points.filter((point) => {
    const key = point.toLowerCase();
    if (unique.has(key)) return false;
    unique.add(key);
    return true;
  });
}

export function buildAlternativeCriteria(profile: UserProfile): string[] {
  const items: string[] = [];
  const prefs = new Set(profile.dietaryPreferences);

  if (prefs.has("vegan")) items.push("Vegan");
  if (prefs.has("vegetarian") || prefs.has("eggetarian")) items.push("Vegetarian");
  if (prefs.has("halal")) items.push("Halal");
  if (prefs.has("gluten-free") || profile.allergies.includes("wheat")) items.push("Gluten-free");
  if (prefs.has("dairy-free") || prefs.has("vegan") || profile.allergies.includes("milk")) {
    items.push("Dairy-free");
  }
  if (profile.allergies.length > 0) items.push("Free from your selected allergens");
  if (profile.restrictions.includes("added-sugar") || profile.restrictions.includes("hfcs")) {
    items.push("Lower in added sugar");
  }
  if (profile.restrictions.includes("high-sodium")) items.push("Lower in sodium");

  for (const id of profile.restrictions) {
    if (["other", "added-sugar", "high-sodium", "hfcs"].includes(id)) continue;
    items.push(`Without ${labelFor(RESTRICTIONS, id).toLowerCase()}`);
  }

  if (profile.restrictionOther) items.push(`Without ${profile.restrictionOther}`);
  if (prefs.has("other") && profile.dietaryPreferenceOther) {
    items.push(`Suitable for: ${profile.dietaryPreferenceOther}`);
  }
  if (items.length === 0) items.push("A short ingredient list you can read easily");

  return [...new Set(items)];
}

export function applyProfileChecks(analysis: FoodAnalysis, profile: UserProfile): FoodAnalysis {
  const concerns = [...analysis.potentialConcerns];
  const rules = rulesForProfile(profile);

  for (const line of linesFrom(analysis)) {
    for (const rule of rules) {
      const match = matchRule(line, rule);
      if (!match) continue;
      addConcern(concerns, {
        title: rule.title,
        why: rule.why(match),
        userPreference: rule.userPreference,
        severity: rule.severity,
      });
    }
  }

  const sodium = sodiumConcern(analysis, profile);
  if (sodium) addConcern(concerns, sodium);

  const ingredientExplanations = analysis.ingredients.map((ingredient) => {
    const existing = analysis.ingredientExplanations.find(
      (item) => item.ingredient.toLowerCase() === ingredient.toLowerCase(),
    );
    const related = concerns.find((concern) => {
      const escaped = ingredient.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`\\b${escaped}\\b`, "i");
      return pattern.test(concern.why) || pattern.test(concern.title);
    });
    const level = related?.severity ?? existing?.level ?? "low";
    return {
      ingredient,
      explanation:
        existing?.explanation ||
        "Listed on the label. A plain-language explanation was not available from the reading.",
      level,
      concern: related?.title ?? existing?.concern ?? null,
    };
  });

  return {
    ...analysis,
    potentialConcerns: concerns.slice(0, 20),
    preferenceConflicts: concerns.slice(0, 20).map((item) => `${item.title} — ${item.userPreference}`),
    positivePoints: positivePoints(analysis, profile, concerns).slice(0, 8),
    ingredientExplanations,
    alternativeCriteria: buildAlternativeCriteria(profile),
    overallAssessment: analysis.overallAssessment,
    summary: analysis.summary,
    labelNotes: analysis.labelNotes,
    productName: analysis.productName,
  };
}

