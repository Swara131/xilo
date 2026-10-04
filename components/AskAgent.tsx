"use client";

import { useEffect, useRef, useState } from "react";
import { ALLERGIES, DIETARY_PREFERENCES, RESTRICTIONS, labelFor } from "@/lib/options";
import { useFoodSession } from "@/lib/food-context";
import type { FoodAnalysis, UserProfile } from "@/lib/types";
import { MicIcon, StopIcon } from "./Icons";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function recognitionCtor(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const browser = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null;
}

function named(ids: string[], choices: { id: string; label: string }[], other: string): string {
  if (ids.length === 0) return "none stated";
  return ids.map((id) => (id === "other" ? other || "Other" : labelFor(choices, id))).join(", ");
}

function buildContext(profile: UserProfile | null, analysis: FoodAnalysis | null): string {
  const lines: string[] = [];
  if (profile) {
    lines.push(`Age: ${profile.age}`);
    lines.push(
      `Dietary preferences: ${named(profile.dietaryPreferences, DIETARY_PREFERENCES, profile.dietaryPreferenceOther)}`,
    );
    lines.push(`Allergies: ${named(profile.allergies, ALLERGIES, profile.allergyOther)}`);
    lines.push(`Avoids: ${named(profile.restrictions, RESTRICTIONS, profile.restrictionOther)}`);
    if (profile.notes) lines.push(`Notes: ${profile.notes}`);
  } else {
    lines.push("No dietary profile yet.");
  }
  if (analysis) {
    lines.push(`Product: ${analysis.productName ?? "not detected"}`);
    lines.push(`Ingredients: ${analysis.ingredients.join(", ") || "not detected"}`);
    lines.push(
      `Concerns: ${analysis.potentialConcerns.map((item) => item.title).join(", ") || "none flagged"}`,
    );
    const nutrition = Object.entries(analysis.nutrition)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0)
      .map(([key, value]) => `${key} ${value}`)
      .join(", ");
    lines.push(`Nutrition: ${nutrition || "not detected"}`);
    lines.push(`Assessment: ${analysis.overallAssessment}`);
  } else {
    lines.push("No food label has been scanned yet.");
  }
  return lines.join("\n").slice(0, 2500);
}

function safeError(data: unknown): string {
  const raw =
    data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error.trim() : "";
  if (raw && raw.length <= 240 && !/sk-or-|bearer\s|api[_ -]?key/i.test(raw)) return raw;
  return "We couldn't answer that just now. Please try again.";
}

export function AskAgent() {
  const { profile, analysis } = useFoodSession();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRec | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, busy, open]);

  function speak(text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  }

  async function send(question: string, aloud: boolean) {
    const text = question.trim();
    if (!text || busy) return;
    setNotice("");
    setDraft("");
    const history = messages.slice(-6);
    setMessages((current) => [...current, { role: "user", content: text }]);
    setBusy(true);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          history,
          context: buildContext(profile, analysis),
        }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok || !data || typeof data !== "object" || !("reply" in data) || typeof data.reply !== "string") {
        if (mountedRef.current) setNotice(safeError(data));
        return;
      }
      const reply = data.reply.trim();
      if (!reply) {
        if (mountedRef.current) setNotice("The assistant didn't return an answer. Please ask again.");
        return;
      }
      if (mountedRef.current) setMessages((current) => [...current, { role: "assistant", content: reply }]);
      if (aloud) speak(reply);
    } catch {
      if (mountedRef.current) setNotice("We couldn't reach the assistant. Check your connection and try again.");
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }

  function startListening() {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setNotice("Voice input isn't available in this browser. Type your question instead.");
      return;
    }
    window.speechSynthesis?.cancel();
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) void send(transcript, true);
    };
    recognition.onerror = (event) => {
      if (!mountedRef.current) return;
      setListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setNotice("Microphone access was blocked. Type your question instead.");
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        setNotice("We couldn't hear a question. Try again, or type it instead.");
      }
    };
    recognition.onend = () => {
      if (mountedRef.current) setListening(false);
    };
    recognitionRef.current = recognition;
    setNotice("");
    setListening(true);
    setOpen(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
      setNotice("The microphone is already in use. Try again in a moment.");
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2">
      {open ? (
        <section className="overflow-hidden rounded-3xl border border-line bg-white shadow-lg">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Ask xilo-food inspector</p>
              <p className="text-xs text-muted">Voice or text. Informational only.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                stopListening();
                window.speechSynthesis?.cancel();
                setOpen(false);
              }}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted transition hover:bg-accent-soft hover:text-accent-dark"
            >
              Close
            </button>
          </div>
          <div ref={listRef} className="max-h-72 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <p className="text-sm leading-6 text-muted">
                Ask about this label, an ingredient, or your preferences.
              </p>
            )}
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : ""}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6 ${
                    message.role === "user" ? "bg-accent text-white" : "bg-accent-soft text-foreground"
                  }`}
                >
                  <p>{message.content}</p>
                  {message.role === "assistant" && (
                    <button
                      type="button"
                      onClick={() => speak(message.content)}
                      className="mt-1 text-xs font-semibold text-accent-dark"
                    >
                      Play
                    </button>
                  )}
                </div>
              </div>
            ))}
            {busy && <p className="text-sm text-muted">Thinking...</p>}
          </div>
          {notice && (
            <p className="mx-4 mb-2 rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
              {notice}
            </p>
          )}
          <form
            className="flex items-center gap-2 border-t border-line p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft, false);
            }}
          >
            <label className="sr-only" htmlFor="ask-question">
              Ask a question
            </label>
            <input
              id="ask-question"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={listening ? "Listening..." : "Ask a question"}
              maxLength={500}
              className="min-w-0 flex-1 rounded-full border border-line bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              aria-pressed={listening}
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full transition ${
                listening ? "bg-rose-600 text-white" : "bg-accent-soft text-accent hover:bg-accent hover:text-white"
              }`}
              aria-label={listening ? "Stop listening" : "Ask with voice"}
            >
              {listening ? <StopIcon /> : <MicIcon />}
            </button>
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mx-auto flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-foreground shadow-lg transition hover:border-accent hover:text-accent-dark"
        >
          <MicIcon />
          Ask a question
        </button>
      )}
    </div>
  );
}
