export function ScanIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -left-3 top-8 hidden h-24 w-24 rounded-full bg-accent-soft sm:block" />
      <div className="absolute -right-2 bottom-6 hidden h-16 w-16 rounded-full bg-[#e7f3ea] sm:block" />
      <div className="relative overflow-hidden rounded-3xl border border-line bg-white p-5 shadow-[0_18px_50px_rgba(28,43,34,0.08)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Label preview</p>
            <p className="mt-1 font-display text-xl text-foreground">Garden Pot Yogurt</p>
          </div>
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-dark">
            Scanning
          </span>
        </div>
        <div className="relative space-y-3 rounded-2xl bg-[#f7faf6] p-4">
          <div className="scan-line pointer-events-none absolute inset-x-4 h-0.5 rounded-full bg-accent/80" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Ingredients</p>
          <div className="space-y-2">
            <div className="h-2.5 w-11/12 rounded-full bg-[#d9e7dc]" />
            <div className="h-2.5 w-9/12 rounded-full bg-[#d9e7dc]" />
            <div className="h-2.5 w-7/12 rounded-full bg-[#d9e7dc]" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["120", "kcal"],
              ["8 g", "protein"],
              ["11 g", "sugar"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-xl bg-white px-2 py-3 text-center">
                <p className="text-sm font-semibold text-foreground">{value}</p>
                <p className="text-[11px] text-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">
          A clear photo of the ingredient and nutrition panel is enough to start a personalized reading.
        </p>
      </div>
    </div>
  );
}
