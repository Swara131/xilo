"use client";

import { useEffect } from "react";

export function ReportActions({ reportId, autoPrint }: { reportId: string; autoPrint: boolean }) {
  useEffect(() => {
    if (!autoPrint) return;
    const timer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  return (
    <div className="no-print mt-6">
      <a
        href={`/api/reports/${reportId}/download`}
        className="inline-flex rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark"
      >
        Download Report
      </a>
      <button
        type="button"
        onClick={() => window.print()}
        className="ml-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-foreground hover:border-accent"
      >
        Print
      </button>
    </div>
  );
}
