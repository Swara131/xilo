"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FoodUpload } from "@/components/FoodUpload";
import { LoadingAnalysis } from "@/components/LoadingAnalysis";
import { useFoodSession } from "@/lib/food-context";
import { isFoodAnalysis, isWebVerification, type FoodAnalysis, type WebVerification } from "@/lib/types";

const UNVERIFIED: WebVerification = {
  verified: false,
  source: null,
  webFindings: "",
  matches: { productName: false, ingredients: "not_found", nutrition: "not_found" },
  confidence: "low",
};

async function requestVerification(analysis: FoodAnalysis): Promise<WebVerification> {
  try {
    const response = await fetch("/api/verify-food", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: analysis.productName,
        ingredients: analysis.ingredients.slice(0, 12),
        nutrition: analysis.nutrition,
      }),
      signal: AbortSignal.timeout(70000),
    });
    const data: unknown = await response.json().catch(() => null);
    return response.ok && isWebVerification(data) ? data : UNVERIFIED;
  } catch {
    return UNVERIFIED;
  }
}

export default function ScannerPage() {
  const router = useRouter();
  const { ready, profile, setAnalysis } = useFoodSession();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (ready && !profile) router.replace("/onboarding");
  }, [profile, ready, router]);

  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => {
      setStep((current) => (current < 1 ? current + 1 : current));
    }, 1400);
    return () => window.clearInterval(timer);
  }, [loading]);

  async function analyze() {
    if (!file) {
      setError("Add a photo of a food label before analyzing.");
      return;
    }
    if (!profile) {
      router.push("/onboarding");
      return;
    }

    setError("");
    setStep(0);
    setLoading(true);
    const form = new FormData();
    form.append("image", file);
    form.append("profile", JSON.stringify(profile));

    try {
      const response = await fetch("/api/analyze-food", { method: "POST", body: form });
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        setError("We couldn't read the analysis. Please try the photo again.");
        setLoading(false);
        return;
      }
      if (!response.ok || !isFoodAnalysis(data)) {
        const raw =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error.trim()
            : "";
        const safe =
          raw && raw.length <= 240 && !/sk-or-|bearer\s|api[_ -]?key/i.test(raw)
            ? raw
            : "We couldn't analyze this label. Please try another photo.";
        setError(safe);
        setLoading(false);
        return;
      }
      setStep(2);
      const verification = await requestVerification(data);
      setAnalysis({ ...data, webVerification: verification });
      router.push("/results");
    } catch {
      setError("We couldn't reach the analysis service. Check your connection and try again.");
      setLoading(false);
    }
  }

  if (!ready || !profile) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted">
        Loading your preferences...
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">Label photo</p>
      <h1 className="mt-2 font-display text-3xl text-foreground sm:text-4xl">Scan your food</h1>
      <p className="mt-3 text-base leading-7 text-muted">
        Take a photo or upload an image of the ingredient and nutrition label.
      </p>
      <p className="mt-2 text-sm text-muted">
        Using the preferences you entered.{" "}
        <Link href="/onboarding" className="font-semibold text-accent hover:text-accent-dark">
          Edit preferences
        </Link>
      </p>

      <div className="mt-8">
        {loading ? (
          <LoadingAnalysis step={step} />
        ) : (
          <FoodUpload
            file={file}
            onFileChange={(next, message) => {
              setFile(next);
              setError(message ?? "");
            }}
          />
        )}
      </div>

      {!loading && (
        <p className="mt-3 text-center text-xs font-medium text-muted">Scan Barcode · Coming soon</p>
      )}

      {error && (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      )}

      {!loading && (
        <button
          type="button"
          onClick={analyze}
          disabled={!file}
          className="mt-6 w-full rounded-full bg-accent px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          Analyze Food
        </button>
      )}
    </main>
  );
}
