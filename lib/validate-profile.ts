import { ALLERGIES, DIETARY_PREFERENCES, RESTRICTIONS } from "./options";
import type { UserProfile } from "./types";

export interface ProfileErrors {
  age?: string;
  dietaryPreferences?: string;
  dietaryPreferenceOther?: string;
  allergyOther?: string;
  restrictionOther?: string;
  notes?: string;
}

const preferenceIds = new Set(DIETARY_PREFERENCES.map((item) => item.id));
const allergyIds = new Set(ALLERGIES.map((item) => item.id));
const restrictionIds = new Set(RESTRICTIONS.map((item) => item.id));

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asIdList(value: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item === "string" && allowed.has(item)) unique.add(item);
  }
  return [...unique];
}

export function validateProfile(
  input: unknown,
): { ok: true; profile: UserProfile } | { ok: false; errors: ProfileErrors } {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const errors: ProfileErrors = {};

  const ageText = asString(source.age);
  const age = typeof source.age === "number" ? source.age : Number(source.age);
  if (typeof source.age !== "number" && ageText === "") {
    errors.age = "Enter your age to continue.";
  } else if (!Number.isFinite(age) || !Number.isInteger(age) || age < 1 || age > 120) {
    errors.age = "Age should be a whole number from 1 to 120.";
  }

  let dietaryPreferences = asIdList(source.dietaryPreferences, preferenceIds);
  if (dietaryPreferences.includes("none") && dietaryPreferences.length > 1) {
    dietaryPreferences = ["none"];
  }
  if (dietaryPreferences.length === 0) {
    errors.dietaryPreferences = "Select at least one dietary preference.";
  }

  const dietaryPreferenceOther = asString(source.dietaryPreferenceOther);
  if (dietaryPreferences.includes("other") && dietaryPreferenceOther.length < 2) {
    errors.dietaryPreferenceOther = "Tell us what you mean by Other.";
  }

  const allergies = asIdList(source.allergies, allergyIds);
  const allergyOther = asString(source.allergyOther);
  if (allergies.includes("other") && allergyOther.length < 2) {
    errors.allergyOther = "Name the other allergy so we can look for it.";
  }

  const restrictions = asIdList(source.restrictions, restrictionIds);
  const restrictionOther = asString(source.restrictionOther);
  if (restrictions.includes("other") && restrictionOther.length < 2) {
    errors.restrictionOther = "Tell us what else you want to avoid.";
  }

  const notes = asString(source.notes);
  if (notes.length > 500) {
    errors.notes = "Keep optional notes under 500 characters.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    profile: {
      age,
      dietaryPreferences,
      dietaryPreferenceOther: dietaryPreferences.includes("other")
        ? dietaryPreferenceOther.slice(0, 120)
        : "",
      allergies,
      allergyOther: allergies.includes("other") ? allergyOther.slice(0, 120) : "",
      restrictions,
      restrictionOther: restrictions.includes("other")
        ? restrictionOther.slice(0, 120)
        : "",
      notes: notes.slice(0, 500),
    },
  };
}
