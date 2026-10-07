"use client";

import { useState } from "react";
import type { FoodAnalysis } from "@/lib/types";

interface CreatedShare {
  id: string;
  deleteToken: string;
  expiresAt: string;
  url: string;
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function ShareReport({ analysis }: { analysis: FoodAnalysis }) {
  const [open, setOpen] = useState(false);
  const [share, setShare] = useState<CreatedShare | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [canShare, setCanShare] = useState(false);

  async function openModal() {
    setOpen(true);
    setError("");
    setNotice("");
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    if (share || creating) return;
    setCreating(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis }),
      });
      const data: unknown = await response.json().catch(() => null);
      const record = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
      if (!response.ok || typeof record?.id !== "string" || typeof record.deleteToken !== "string") {
        setError("We couldn't create your shareable report. Your analysis is still available.");
        return;
      }
      setShare({
        id: record.id,
        deleteToken: record.deleteToken,
        expiresAt: typeof record.expiresAt === "string" ? record.expiresAt : "",
        url: `${window.location.origin}/report/${record.id}`,
      });
    } catch {
      setError("We couldn't create your shareable report. Your analysis is still available.");
    } finally {
      setCreating(false);
    }
  }

  async function copyLink() {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.url);
      setNotice("Link copied.");
      setError("");
    } catch {
      setError("We couldn't copy the link. Select it and copy it manually.");
    }
  }

  async function shareNative() {
    if (!share) return;
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: "xilo-food inspector Report",
        text: analysis.summary,
        url: share.url,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setNotice("Sharing isn't available here. Copy the link instead.");
    }
  }

  async function downloadReport() {
    if (!share) return;
    try {
      const response = await fetch(`/api/reports/${share.id}/download`);
      if (!response.ok) throw new Error("download");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "food-analysis-report.html";
      link.click();
      URL.revokeObjectURL(objectUrl);
      setNotice("Report downloaded. Open it and print if you need a PDF.");
      setError("");
    } catch {
      const popup = window.open(`/report/${share.id}?print=1`, "_blank", "noopener");
      if (!popup) {
        setError("We couldn't download the file. Open the report link and use your browser's print option.");
      }
    }
  }

  async function emailReport() {
    if (!share) return;
    setError("");
    try {
      const response = await fetch(`/api/reports/${share.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email }),
      });
      const data: unknown = await response.json().catch(() => null);
      const record = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
      if (!response.ok || typeof record?.mailto !== "string") {
        setError(
          typeof record?.error === "string"
            ? record.error
            : "We couldn't open an email. Copy the report link instead.",
        );
        return;
      }
      window.location.href = record.mailto;
      setNotice("Your email app should open with the report link.");
    } catch {
      setError("We couldn't open an email. Copy the report link instead.");
    }
  }

  async function deleteReport() {
    if (!share) return;
    const response = await fetch(`/api/reports/${share.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteToken: share.deleteToken }),
    });
    if (!response.ok) {
      setError("This shared report could not be deleted.");
      return;
    }
    setShare(null);
    setNotice("Shared report deleted.");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void openModal()}
        className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent"
      >
        Share Report
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#1c2b22]/40 px-4 py-8">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-report-title"
            className="max-h-full w-full max-w-lg overflow-y-auto rounded-3xl border border-line bg-white p-6 shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="share-report-title" className="font-display text-2xl text-foreground">
                  Share Report
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">Anyone with this link can view this report.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted hover:bg-accent-soft hover:text-accent-dark"
              >
                Close
              </button>
            </div>

            {creating && <p className="mt-4 text-sm text-muted">Creating your link...</p>}
            {error && (
              <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
                {error}
              </p>
            )}
            {notice && <p className="mt-4 text-sm text-accent-dark">{notice}</p>}

            {share && (
              <div className="mt-5 space-y-4">
                <p className="break-all rounded-2xl bg-accent-soft px-4 py-3 text-sm text-foreground">{share.url}</p>
                {share.expiresAt && (
                  <p className="text-sm text-muted">This link expires on {formatWhen(share.expiresAt)}.</p>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => void copyLink()} className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark">
                    Copy Report Link
                  </button>
                  {canShare && (
                    <button type="button" onClick={() => void shareNative()} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-foreground hover:border-accent">
                      Share
                    </button>
                  )}
                  <button type="button" onClick={() => void downloadReport()} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-foreground hover:border-accent">
                    Download Report
                  </button>
                  <button type="button" onClick={() => void deleteReport()} className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                    Delete shared report
                  </button>
                </div>
                <form
                  className="space-y-2 border-t border-line pt-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void emailReport();
                  }}
                >
                  <label htmlFor="report-email" className="text-sm font-semibold text-foreground">
                    Email Report
                  </label>
                  <p className="text-sm text-muted">Opens your email app with a short summary and the report link.</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      id="report-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@email.com"
                      className="min-w-0 flex-1 rounded-full border border-line px-4 py-2.5 text-sm outline-none focus:border-accent"
                    />
                    <button type="submit" className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-foreground hover:border-accent">
                      Email Report
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
