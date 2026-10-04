"use client";

import { useEffect, useState } from "react";
import { PlayIcon, StopIcon } from "./Icons";

export function VoiceSummary({ summary }: { summary: string }) {
  const [supported, setSupported] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  function play() {
    if (!window.speechSynthesis) {
      setSupported(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(summary);
    utterance.rate = 1;
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);
    setPlaying(true);
    window.speechSynthesis.speak(utterance);
  }

  function stop() {
    window.speechSynthesis?.cancel();
    setPlaying(false);
  }

  return (
    <section className="rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-2xl text-foreground">Listen to your summary</h2>
      <p className="mt-3 text-sm leading-6 text-muted">{summary}</p>
      {supported ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={play}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark"
          >
            <PlayIcon /> Play Summary
          </button>
          <button
            type="button"
            onClick={stop}
            disabled={!playing}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <StopIcon /> Stop
          </button>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent-dark">
          Voice playback isn&apos;t available in this browser. You can still read the summary above.
        </p>
      )}
    </section>
  );
}
