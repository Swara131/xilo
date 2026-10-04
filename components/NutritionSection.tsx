import { NUTRIENTS, scalePercent } from "@/lib/nutrition";
import type { NutritionFacts } from "@/lib/types";

function Ring({ percent }: { percent: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;
  return (
    <svg viewBox="0 0 96 96" className="h-24 w-24" aria-hidden="true">
      <circle cx="48" cy="48" r={radius} fill="none" stroke="#e7f6ec" strokeWidth="8" />
      <circle
        cx="48"
        cy="48"
        r={radius}
        fill="none"
        stroke="#1f8a4c"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference - dash}`}
        transform="rotate(-90 48 48)"
      />
    </svg>
  );
}

export function NutritionSection({ nutrition }: { nutrition: NutritionFacts }) {
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {NUTRIENTS.map((meta) => {
          const value = nutrition[meta.key];
          const percent = scalePercent(value, meta);
          const isCalories = meta.key === "calories";
          return (
            <article
              key={meta.key}
              className={`rounded-3xl border border-line bg-white p-5 shadow-sm ${isCalories ? "sm:col-span-2" : ""}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-muted">{meta.label}</h3>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{value ?? "Not detected"}</p>
                </div>
                {isCalories && percent != null && (
                  <div className="relative grid place-items-center">
                    <Ring percent={percent} />
                    <span className="absolute text-xs font-semibold text-accent-dark">{Math.round(percent)}%</span>
                  </div>
                )}
              </div>
              {percent != null && (
                <div className="mt-4">
                  <div className="h-2 overflow-hidden rounded-full bg-accent-soft">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted">
                    Visual scale versus a common daily reference of {meta.referenceLabel}. This is not a health target.
                  </p>
                </div>
              )}
              {value && percent == null && (
                <p className="mt-3 text-xs leading-5 text-muted">
                  Shown exactly as read. A comparison bar needs a clear unit, so none is drawn here.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
