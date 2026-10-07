import { ASSESSMENT_TITLES } from "@/lib/types";
import type { PublicReport } from "@/lib/reports/model";
import { WebVerification } from "./WebVerification";
import { ReportActions } from "./ReportActions";

function formatWhen(value: string): string {
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function SharedReportView({ report, autoPrint = false }: { report: PublicReport; autoPrint?: boolean }) {
  const analysis = report.analysis;
  const nutrition = [
    ["Calories", analysis.nutrition.calories],
    ["Protein", analysis.nutrition.protein],
    ["Carbohydrates", analysis.nutrition.carbohydrates],
    ["Sugar", analysis.nutrition.sugar],
    ["Fat", analysis.nutrition.fat],
    ["Saturated fat", analysis.nutrition.saturatedFat],
    ["Sodium", analysis.nutrition.sodium],
  ] as const;

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">xilo-food inspector</p>
      <h1 className="mt-2 font-display text-4xl text-foreground">Food Analysis Report</h1>
      <p className="mt-3 text-lg font-medium text-foreground">{report.product.name || "Product name not detected"}</p>
      {report.product.brand && <p className="mt-1 text-sm text-muted">Brand: {report.product.brand}</p>}
      <p className="mt-2 text-sm text-muted">Created {formatWhen(report.createdAt)}</p>
      <p className="mt-1 text-sm text-muted">Anyone with this link can view this report. It expires on {formatWhen(report.expiresAt)}.</p>

      <ReportActions reportId={report.id} autoPrint={autoPrint} />

      <section className="mt-8 rounded-3xl border border-line bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Overall assessment</p>
        <h2 className="mt-2 font-display text-2xl text-foreground">{ASSESSMENT_TITLES[analysis.assessmentStatus]}</h2>
        <p className="mt-3 text-sm leading-6 text-foreground">{analysis.overallAssessment}</p>
        <p className="mt-3 text-sm leading-6 text-muted">{analysis.summary}</p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-2xl text-foreground">Nutrition</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {nutrition.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-line bg-white px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">{value || "Not detected"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-2xl text-foreground">Ingredients</h2>
        {analysis.ingredients.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No ingredients were saved with this report.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {analysis.ingredients.map((item) => (
              <li key={item} className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground">
                {item}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="font-display text-2xl text-foreground">Concerns</h2>
        {analysis.potentialConcerns.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No concerns were flagged in this report.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {analysis.potentialConcerns.map((item) => (
              <li key={`${item.title}-${item.userPreference}`} className="rounded-2xl border border-line bg-white px-4 py-3 text-sm">
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 leading-6 text-muted">{item.why}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {analysis.allergensDetected.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-2xl text-foreground">Allergens</h2>
          <p className="mt-3 text-sm text-foreground">{analysis.allergensDetected.join(", ")}</p>
        </section>
      )}

      {analysis.preferenceConflicts.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-2xl text-foreground">Preference notes</h2>
          <ul className="mt-3 space-y-2">
            {analysis.preferenceConflicts.map((item) => (
              <li key={item} className="text-sm leading-6 text-foreground">
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {analysis.positivePoints.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-2xl text-foreground">Positive observations</h2>
          <ul className="mt-3 space-y-2">
            {analysis.positivePoints.map((item) => (
              <li key={item} className="text-sm leading-6 text-foreground">
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6">
        <WebVerification
          verification={analysis.webVerification}
          unavailableMessage="Web verification unavailable."
        />
      </div>

      <footer className="mt-8 space-y-2 text-sm leading-6 text-muted">
        <p>Generated by xilo-food inspector.</p>
        <p>This report is for informational purposes only and is not a medical diagnosis or medical advice.</p>
      </footer>
    </article>
  );
}
