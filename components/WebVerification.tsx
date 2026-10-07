import type { MatchLevel, WebVerification as WebVerificationResult } from "@/lib/types";

function comparisonLabel(level: boolean | MatchLevel): string {
  if (level === true || level === "match") return "Match";
  if (level === "partial") return "Partial";
  return "Not verified";
}

function safeHttpUrl(value: string | undefined): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function WebVerification({
  verification,
  unavailableMessage = "Could not verify this product online. The analysis below is based on the uploaded label.",
}: {
  verification?: WebVerificationResult | null;
  unavailableMessage?: string;
}) {
  const sourceUrl = safeHttpUrl(verification?.source?.url);
  if (!verification?.verified || !sourceUrl || !verification.source) {
    return (
      <section className="rounded-3xl border border-line bg-white p-6 shadow-sm">
        <h2 className="font-display text-2xl text-foreground">Web Verification</h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          {unavailableMessage}
        </p>
      </section>
    );
  }

  const domain = domainOf(sourceUrl);
  const rows = [
    ["Product name", comparisonLabel(verification.matches.productName)],
    ["Ingredients", comparisonLabel(verification.matches.ingredients)],
    ["Nutrition", comparisonLabel(verification.matches.nutrition)],
  ];

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-sm">
      <h2 className="font-display text-2xl text-foreground">Web Verification</h2>
      <p className="mt-3 text-sm font-semibold text-foreground">✓ Product information found online</p>
      <p className="mt-2 text-sm text-muted">
        Source:{" "}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-accent hover:text-accent-dark"
        >
          {verification.source.title}
        </a>
      </p>
      {verification.webFindings && (
        <p className="mt-3 text-sm leading-6 text-foreground">{verification.webFindings}</p>
      )}
      <h3 className="mt-5 text-sm font-semibold text-foreground">How it compares</h3>
      <dl className="mt-3 grid gap-2 sm:grid-cols-3">
        {rows.map(([name, value]) => (
          <div key={name} className="rounded-2xl bg-accent-soft px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{name}</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-muted">
        Verified using live web information
        {domain ? (
          <>
            {" "}
            from{" "}
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-accent hover:text-accent-dark"
            >
              {domain}
            </a>
          </>
        ) : null}
        .
      </p>
    </section>
  );
}
