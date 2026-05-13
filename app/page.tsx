"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const VANTAGE_SESSION_KEY = "vantage_prefetch";

const VANTAGE_EXAMPLES = [
  "Show me all atopic dermatitis treatments",
  "How does Pfizer trispecific compare in AtD?",
  "Post-dupilumab options in atopic dermatitis",
  "Psoriasis oral therapies comparison",
  "How does Oruka Ph2a PsO data compare?",
];

const TRIAL_EXAMPLES = [
  "severe psoriasis failed anti-TNF",
  "Crohn's disease IL-23 recruiting",
  "refractory lupus failed biologic",
];

const LOADING_STEPS = [
  "Understanding your query",
  "Identifying condition and therapies",
  "Searching competitive intelligence",
  "Building landscape view",
  "Almost ready",
];

export default function LandingPage() {
  const router = useRouter();
  const [query,    setQuery]    = useState("");
  const [mode,     setMode]     = useState<"vantage" | "trial">("vantage");
  const [loading,  setLoading]  = useState(false);
  const [loadStep, setLoadStep] = useState(0);

  async function navigate(q: string) {
    if (loading || !q.trim()) return;

    if (mode === "trial") {
      router.push(`/trial?q=${encodeURIComponent(q)}`);
      return;
    }

    // Vantage: step through loading messages while fetching,
    // then store the result and navigate — only ONE wait.
    setLoading(true);
    setLoadStep(0);

    const stepInterval = setInterval(() => {
      setLoadStep((prev) => Math.min(prev + 1, LOADING_STEPS.length - 2));
      // Stay at second-to-last step until fetch completes
    }, 900);

    try {
      const res  = await fetch("/api/vantage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      // Store before navigating so Vantage page reads it instantly
      sessionStorage.setItem(
        VANTAGE_SESSION_KEY,
        JSON.stringify({ query: q, data, ts: Date.now() })
      );
      setLoadStep(LOADING_STEPS.length - 1); // snap to "Almost ready"
    } catch {
      // Fetch failed — Vantage will re-fetch itself
    } finally {
      clearInterval(stepInterval);
      router.push(`/vantage?q=${encodeURIComponent(q)}`);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(query.trim());
  }

  const examples = mode === "vantage" ? VANTAGE_EXAMPLES : TRIAL_EXAMPLES;
  const progressPct = ((loadStep + 1) / LOADING_STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-[#f7f7f5] font-['DM_Sans',sans-serif] flex flex-col">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');`}</style>

      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
              <span className="text-white text-xs font-bold">OT</span>
            </div>
            <span className="font-semibold text-gray-900">OpenTrial</span>
          </div>
          <p className="text-xs text-gray-400">For research purposes only · Not for clinical use</p>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl w-full mx-auto">

          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">OpenTrial</h1>
            <p className="text-gray-500 text-lg">
              Explore the drug landscape or find the right trial.
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex items-stretch gap-2 bg-white border border-gray-200 rounded-2xl p-1.5 mb-4 shadow-sm">
            <button
              onClick={() => setMode("vantage")}
              className={`flex-1 flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                mode === "vantage" ? "bg-gray-900 shadow-sm" : "hover:bg-gray-50"
              }`}
            >
              <span className="text-xl mt-0.5">🔬</span>
              <div>
                <p className={`text-sm font-semibold ${mode === "vantage" ? "text-white" : "text-gray-900"}`}>
                  Vantage
                </p>
                <p className={`text-xs mt-0.5 ${mode === "vantage" ? "text-gray-400" : "text-gray-500"}`}>
                  Drug landscape · Approved vs emerging · AI competitive intelligence
                </p>
              </div>
            </button>

            <button
              onClick={() => setMode("trial")}
              className={`flex-1 flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                mode === "trial" ? "bg-gray-900 shadow-sm" : "hover:bg-gray-50"
              }`}
            >
              <span className="text-xl mt-0.5">🎯</span>
              <div>
                <p className={`text-sm font-semibold ${mode === "trial" ? "text-white" : "text-gray-900"}`}>
                  Trial Match
                </p>
                <p className={`text-xs mt-0.5 ${mode === "trial" ? "text-gray-400" : "text-gray-500"}`}>
                  Find trials for your patient · AI-ranked · Location & phase filters
                </p>
              </div>
            </button>
          </div>

          {/* Loading state — progress bar */}
          {loading ? (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-7">
              <p className="text-xs text-gray-400 text-center mb-4">"{query}"</p>

              {/* Current step */}
              <p className="text-sm font-semibold text-gray-900 text-center mb-5">
                {LOADING_STEPS[loadStep]}…
              </p>

              {/* Progress bar track */}
              <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div
                  className="absolute left-0 top-0 h-full bg-gray-900 rounded-full"
                  style={{
                    width: `${progressPct}%`,
                    transition: "width 0.7s ease-out",
                  }}
                />
              </div>

              {/* Step markers */}
              <div className="flex justify-between px-0.5">
                {LOADING_STEPS.map((step, i) => (
                  <span
                    key={i}
                    className="text-[10px] text-center"
                    style={{
                      color: i <= loadStep ? "#111827" : "#d1d5db",
                      fontWeight: i === loadStep ? 600 : 400,
                      maxWidth: `${100 / LOADING_STEPS.length}%`,
                      transition: "color 0.3s",
                    }}
                  >
                    {step}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Search bar */}
              <form onSubmit={handleSubmit} className="relative mb-4">
                <div className="flex items-center bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm focus-within:border-gray-400 transition-colors">
                  <div className="pl-5 pr-3 text-gray-400 flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                    placeholder={
                      mode === "vantage"
                        ? "e.g. Show me all atopic dermatitis treatments"
                        : "e.g. severe psoriasis failed anti-TNF, what trial options?"
                    }
                    className="flex-1 py-4 pr-4 text-base bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none"
                  />
                  <div className="pr-2 flex-shrink-0">
                    <button
                      type="submit"
                      disabled={!query.trim()}
                      className="px-5 py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-xl disabled:opacity-30 transition-colors"
                    >
                      {mode === "vantage" ? "Explore" : "Search"}
                    </button>
                  </div>
                </div>
              </form>

              {/* Example chips */}
              <div className="flex flex-wrap gap-2 justify-center">
                {examples.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => { setQuery(ex); navigate(ex); }}
                    className="px-3 py-1.5 text-xs text-gray-500 bg-white border border-gray-200 rounded-full hover:border-gray-400 hover:text-gray-800 transition-all"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="text-center pb-8">
        <p className="text-xs text-gray-300">
          Data: ClinicalTrials.gov · FDA labels · Published Phase 2/3 RCTs · Last updated May 2026
        </p>
      </footer>
    </div>
  );
}
