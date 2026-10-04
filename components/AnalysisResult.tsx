"use client";

import { useState } from "react";
import { ASSESSMENT_TITLES, type FoodAnalysis } from "@/lib/types";
import { ConcernCard } from "./ConcernCard";
import { IngredientList } from "./IngredientList";
import { NutritionSection } from "./NutritionSection";
import { VoiceSummary } from "./VoiceSummary";

const STATUS_STYLES = {
  compatible: "border-emerald-100 bg-emerald-50",
  concerns: "border-amber-100 bg-amber-50",
  attention: "border-sky-100 bg-sky-50",
};

export function AnalysisResult({
  analysis,
  onScanAnother,
  onStartOver,
}: {
  analysis: FoodAnalysis;
  onScanAnother: () => void;
  onStartOver: () => void;
}) {
  const [showAlternativesNote, setShowAlternativesNote] = useState(false);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">Report</p>
        <h1 className="mt-2 font-display text-3xl text-foreground sm:text-4xl">Your Food Analysis</h1>
        <p className="mt-3 text-lg font-medium text-foreground">
          {analysis.productName ?? "Product name not detected"}
        </p>
      </header>

      <section className={`rounded-3xl border p-6 shadow-sm ${STATUS_STYLES[analysis.assessmentStatus]}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Overall assessment</p>
        <h2 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">
          {ASSESSMENT_TITLES[analysis.assessmentStatus]}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground">{analysis.overallAssessment}</p>
      </section>

      {analysis.allergensDetected.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
            Allergens read from the label
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {analysis.allergensDetected.map((item) => (
              <span key={item} className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-foreground shadow-sm">
                {item}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl text-foreground">Potential concerns</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            These flags are informational. They are not medical risk scores.
          </p>
        </div>
        {analysis.potentialConcerns.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-line bg-white px-5 py-8 text-sm text-muted">
            No potential concerns were flagged from the information we could read and the preferences you shared.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {analysis.potentialConcerns.map((concern) => (
              <ConcernCard key={`${concern.title}-${concern.userPreference}`} concern={concern} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl text-foreground">Ingredient analysis</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Names come from the label. Explanations are simplified interpretations.
          </p>
        </div>
        <IngredientList items={analysis.ingredientExplanations} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl text-foreground">Nutrition</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Values are shown only when they could be read.</p>
        </div>
        <NutritionSection nutrition={analysis.nutrition} />
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl text-foreground">What&apos;s good</h2>
        {analysis.positivePoints.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-line bg-white px-5 py-8 text-sm text-muted">
            No extra positive observations were supported by the readable label.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {analysis.positivePoints.map((point) => (
              <li key={point} className="rounded-3xl border border-line bg-white px-5 py-4 text-sm leading-6 text-foreground shadow-sm">
                <span className="mr-2 text-accent">✓</span>
                {point}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-line bg-white p-6 shadow-sm">
        <h2 className="font-display text-2xl text-foreground">Looking for an alternative?</h2>
        <p className="mt-2 text-sm text-muted">Look for products that are:</p>
        <ul className="mt-4 space-y-2">
          {analysis.alternativeCriteria.map((item) => (
            <li key={item} className="text-sm text-foreground">
              <span className="mr-2 text-accent">✓</span>
              {item}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setShowAlternativesNote(true)}
          className="mt-5 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark"
        >
          Find alternatives
        </button>
        {showAlternativesNote && (
          <p className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm leading-6 text-accent-dark">
            Product recommendations will be added in a future version. For now, use the criteria above when you shop.
          </p>
        )}
      </section>

      {analysis.labelNotes.length > 0 && (
        <section>
          <h2 className="font-display text-2xl text-foreground">Also on the label</h2>
          <ul className="mt-3 space-y-2">
            {analysis.labelNotes.map((note) => (
              <li key={note} className="text-sm leading-6 text-muted">
                {note}
              </li>
            ))}
          </ul>
        </section>
      )}

      <VoiceSummary summary={analysis.summary} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onScanAnother}
          className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-dark"
        >
          Scan Another Food
        </button>
        <button
          type="button"
          onClick={onStartOver}
          className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent"
        >
          Start Over
        </button>
      </div>

      <p className="text-xs leading-5 text-muted">
        xilo-food inspector is an informational food-label assistant. It is not a medical diagnostic tool
        and does not replace advice from a qualified professional.
      </p>
    </div>
  );
}
