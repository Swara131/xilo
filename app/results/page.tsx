"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnalysisResult } from "@/components/AnalysisResult";
import { useFoodSession } from "@/lib/food-context";

export default function ResultsPage() {
  const router = useRouter();
  const { ready, analysis, clearAnalysis, resetAll } = useFoodSession();

  useEffect(() => {
    if (ready && !analysis) router.replace("/scanner");
  }, [analysis, ready, router]);

  if (!ready || !analysis) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted">Loading your report...</main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <AnalysisResult
        analysis={analysis}
        onScanAnother={() => {
          clearAnalysis();
          router.push("/scanner");
        }}
        onStartOver={() => {
          resetAll();
          router.push("/");
        }}
      />
    </main>
  );
}
