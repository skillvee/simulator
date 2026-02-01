"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { versions } from "./current-test/versions";

export default function UITester() {
  const [idx, setIdx] = useState(0);

  if (!versions || versions.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="text-center">
          <p className="text-lg font-medium text-stone-700">No test active</p>
          <p className="mt-1 text-sm text-stone-500">
            Run <code className="rounded bg-stone-200 px-1.5 py-0.5 font-mono text-xs">/ui-test [url]</code> to start
          </p>
        </div>
      </div>
    );
  }

  const current = versions[idx];
  const Component = current.component;
  const goPrev = () => setIdx((i) => (i > 0 ? i - 1 : versions.length - 1));
  const goNext = () => setIdx((i) => (i < versions.length - 1 ? i + 1 : 0));

  return (
    <div className="min-h-screen">
      <Component />

      {/* Floating navigator */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
        {/* Version info */}
        <div className="rounded-lg border bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm">
          <p className="text-sm font-medium text-stone-800">{current.name}</p>
          <p className="text-xs text-stone-500">{current.description}</p>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1 rounded-full border bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur-sm">
          <button
            type="button"
            onClick={goPrev}
            className="flex h-7 w-7 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
            aria-label="Previous version"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[80px] text-center text-xs font-medium text-stone-700">
            {idx + 1} / {versions.length}
          </span>
          <button
            type="button"
            onClick={goNext}
            className="flex h-7 w-7 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
            aria-label="Next version"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
