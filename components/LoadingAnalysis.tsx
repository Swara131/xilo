const STEPS = [
  "Reading your food label...",
  "Identifying ingredients...",
  "Analyzing nutrition...",
  "Personalizing your results...",
];

export function LoadingAnalysis({ step }: { step: number }) {
  const progress = Math.min(100, ((step + 1) / STEPS.length) * 100);

  return (
    <div className="rounded-3xl border border-line bg-white p-6 shadow-sm" aria-live="polite">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">Analyzing</p>
      <h2 className="mt-2 font-display text-2xl text-foreground">{STEPS[step]}</h2>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-accent-soft">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ol className="mt-5 space-y-3">
        {STEPS.map((label, index) => {
          const state = index < step ? "done" : index === step ? "current" : "upcoming";
          return (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                  state === "upcoming" ? "bg-[#eef3ef] text-muted" : "bg-accent text-white"
                }`}
              >
                {index < step ? "✓" : index + 1}
              </span>
              <span className={state === "current" ? "font-semibold text-foreground" : "text-muted"}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
