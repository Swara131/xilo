export interface Choice {
  id: string;
  label: string;
}

export const DIETARY_PREFERENCES: Choice[] = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "eggetarian", label: "Eggetarian" },
  { id: "halal", label: "Halal" },
  { id: "gluten-free", label: "Gluten-free" },
  { id: "dairy-free", label: "Dairy-free" },
  { id: "none", label: "No specific preference" },
  { id: "other", label: "Other" },
];

export const ALLERGIES: Choice[] = [
  { id: "milk", label: "Milk" },
  { id: "peanuts", label: "Peanuts" },
  { id: "tree-nuts", label: "Tree nuts" },
  { id: "soy", label: "Soy" },
  { id: "wheat", label: "Wheat" },
  { id: "eggs", label: "Eggs" },
  { id: "fish", label: "Fish" },
  { id: "shellfish", label: "Shellfish" },
  { id: "other", label: "Other" },
];

export const RESTRICTIONS: Choice[] = [
  { id: "added-sugar", label: "Added sugar" },
  { id: "high-sodium", label: "High sodium" },
  { id: "artificial-sweeteners", label: "Artificial sweeteners" },
  { id: "artificial-colors", label: "Artificial colors" },
  { id: "preservatives", label: "Preservatives" },
  { id: "msg", label: "MSG" },
  { id: "palm-oil", label: "Palm oil" },
  { id: "caffeine", label: "Caffeine" },
  { id: "alcohol", label: "Alcohol" },
  { id: "hfcs", label: "High-fructose corn syrup" },
  { id: "other", label: "Other" },
];

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function labelFor(choices: Choice[], id: string): string {
  return choices.find((choice) => choice.id === id)?.label ?? id;
}
