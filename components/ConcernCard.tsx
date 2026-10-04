import type { PotentialConcern } from "@/lib/types";

const SEVERITY_STYLES = {
  low: "bg-emerald-50 text-emerald-800",
  medium: "bg-amber-50 text-amber-800",
  high: "bg-rose-50 text-rose-800",
};

export function ConcernCard({ concern }: { concern: PotentialConcern }) {
  return (
    <article className="rounded-3xl border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Potential concern</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">{concern.title}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${SEVERITY_STYLES[concern.severity]}`}>
          {concern.severity}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-foreground">
        <span className="font-semibold">Why: </span>
        {concern.why}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted">
        <span className="font-semibold text-foreground">Your preference: </span>
        {concern.userPreference}
      </p>
    </article>
  );
}
