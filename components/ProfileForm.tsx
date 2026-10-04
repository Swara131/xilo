"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ALLERGIES, DIETARY_PREFERENCES, RESTRICTIONS } from "@/lib/options";
import { useFoodSession } from "@/lib/food-context";
import { validateProfile, type ProfileErrors } from "@/lib/validate-profile";

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
        selected
          ? "border-accent bg-accent-soft text-accent-dark"
          : "border-line bg-white text-foreground hover:border-accent/40"
      }`}
    >
      {label}
    </button>
  );
}

export function ProfileForm() {
  const router = useRouter();
  const { ready, profile, setProfile } = useFoodSession();
  const [age, setAge] = useState("");
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [dietaryPreferenceOther, setDietaryPreferenceOther] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyOther, setAllergyOther] = useState("");
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [restrictionOther, setRestrictionOther] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [appliedProfile, setAppliedProfile] = useState(false);

  if (ready && profile && !appliedProfile) {
    setAppliedProfile(true);
    setAge(String(profile.age));
    setDietaryPreferences(profile.dietaryPreferences);
    setDietaryPreferenceOther(profile.dietaryPreferenceOther);
    setAllergies(profile.allergies);
    setAllergyOther(profile.allergyOther);
    setRestrictions(profile.restrictions);
    setRestrictionOther(profile.restrictionOther);
    setNotes(profile.notes);
  }

  function toggle(list: string[], id: string, exclusiveId?: string) {
    if (exclusiveId && id === exclusiveId) return [exclusiveId];
    const withoutExclusive = exclusiveId ? list.filter((item) => item !== exclusiveId) : list;
    if (withoutExclusive.includes(id)) return withoutExclusive.filter((item) => item !== id);
    return [...withoutExclusive, id];
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validateProfile({
      age,
      dietaryPreferences,
      dietaryPreferenceOther,
      allergies,
      allergyOther,
      restrictions,
      restrictionOther,
      notes,
    });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setProfile(result.profile);
    router.push("/scanner");
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl" noValidate>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">Your profile</p>
        <h1 className="mt-2 font-display text-3xl text-foreground sm:text-4xl">
          Tell us a little about yourself
        </h1>
        <p className="mt-3 text-base leading-7 text-muted">
          This helps us personalize your food analysis.
        </p>
      </div>

      <div className="space-y-8 rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-8">
        <div>
          <label htmlFor="age" className="text-sm font-semibold text-foreground">
            Age
          </label>
          <input
            id="age"
            type="number"
            inputMode="numeric"
            min={1}
            max={120}
            value={age}
            onChange={(event) => setAge(event.target.value)}
            className="mt-2 w-full max-w-[10rem] rounded-2xl border border-line bg-white px-4 py-3 text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          {errors.age && <p className="mt-2 text-sm text-rose-700">{errors.age}</p>}
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-foreground">Dietary preferences</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {DIETARY_PREFERENCES.map((choice) => (
              <Chip
                key={choice.id}
                label={choice.label}
                selected={dietaryPreferences.includes(choice.id)}
                onClick={() =>
                  setDietaryPreferences(toggle(dietaryPreferences, choice.id, "none"))
                }
              />
            ))}
          </div>
          {dietaryPreferences.includes("other") && (
            <input
              aria-label="Other dietary preference"
              value={dietaryPreferenceOther}
              onChange={(event) => setDietaryPreferenceOther(event.target.value)}
              placeholder="Describe your preference"
              className="mt-3 w-full rounded-2xl border border-line px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          )}
          {errors.dietaryPreferences && (
            <p className="mt-2 text-sm text-rose-700">{errors.dietaryPreferences}</p>
          )}
          {errors.dietaryPreferenceOther && (
            <p className="mt-2 text-sm text-rose-700">{errors.dietaryPreferenceOther}</p>
          )}
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-foreground">Allergies</legend>
          <p className="mt-1 text-sm text-muted">Select any that apply. You can leave this blank.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ALLERGIES.map((choice) => (
              <Chip
                key={choice.id}
                label={choice.label}
                selected={allergies.includes(choice.id)}
                onClick={() => setAllergies(toggle(allergies, choice.id))}
              />
            ))}
          </div>
          {allergies.includes("other") && (
            <input
              aria-label="Other allergy"
              value={allergyOther}
              onChange={(event) => setAllergyOther(event.target.value)}
              placeholder="Other allergy"
              className="mt-3 w-full rounded-2xl border border-line px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          )}
          {errors.allergyOther && <p className="mt-2 text-sm text-rose-700">{errors.allergyOther}</p>}
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold text-foreground">
            Dietary restrictions / things to avoid
          </legend>
          <p className="mt-1 text-sm text-muted">Optional. Select anything you want flagged.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {RESTRICTIONS.map((choice) => (
              <Chip
                key={choice.id}
                label={choice.label}
                selected={restrictions.includes(choice.id)}
                onClick={() => setRestrictions(toggle(restrictions, choice.id))}
              />
            ))}
          </div>
          {restrictions.includes("other") && (
            <input
              aria-label="Other restriction"
              value={restrictionOther}
              onChange={(event) => setRestrictionOther(event.target.value)}
              placeholder="Anything else to avoid"
              className="mt-3 w-full rounded-2xl border border-line px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
          )}
          {errors.restrictionOther && (
            <p className="mt-2 text-sm text-rose-700">{errors.restrictionOther}</p>
          )}
        </fieldset>

        <div>
          <label htmlFor="notes" className="text-sm font-semibold text-foreground">
            Anything else to keep in mind? <span className="font-normal text-muted">(optional)</span>
          </label>
          <p className="mt-1 text-sm leading-6 text-muted">
            Preferences or ingredients you avoid. This application does not provide medical advice
            and does not ask for a diagnosis.
          </p>
          <textarea
            id="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="mt-3 w-full rounded-2xl border border-line px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          {errors.notes && <p className="mt-2 text-sm text-rose-700">{errors.notes}</p>}
        </div>

        <button
          type="submit"
          className="w-full rounded-full bg-accent px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:w-auto"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
