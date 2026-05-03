"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    id:      "query",
    label:   "Understanding your query",
    detail:  "Extracting condition, treatment history and patient context",
    icon:    "🔍",
  },
  {
    id:      "search",
    label:   "Searching clinical databases",
    detail:  "Running parallel searches across ClinicalTrials.gov",
    icon:    "🔬",
  },
  {
    id:      "guidelines",
    label:   "Reviewing treatment guidelines",
    detail:  "Cross-referencing AAD, EULAR, NCCN and disease-specific guidelines",
    icon:    "📋",
  },
  {
    id:      "ranking",
    label:   "Ranking best matches",
    detail:  "Scoring trials by relevance, phase and recruiting status",
    icon:    "🏆",
  },
];

interface Props {
  currentStep: number; // 0-3
  query:       string;
}

export default function SearchProgress({ currentStep, query }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const progress = Math.min(((currentStep + 1) / STEPS.length) * 100, 95);

  return (
    <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center px-6">
      <div className="w-full max-w-lg">

        {/* Query echo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5
                          bg-gray-100 rounded-full text-xs text-gray-500
                          font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500
                             animate-pulse" />
            Searching for trials
          </div>
          <p className="text-gray-500 text-sm italic max-w-sm mx-auto
                        line-clamp-2">
            "{query}"
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-200 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-gray-900 rounded-full transition-all
                       duration-700 ease-in-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {STEPS.map((step, i) => {
            const isDone    = i < currentStep;
            const isActive  = i === currentStep;
            const isPending = i > currentStep;

            return (
              <div
                key={step.id}
                className={`flex items-start gap-4 p-4 rounded-xl
                            transition-all duration-500 ${
                  isActive
                    ? "bg-white border border-gray-200 shadow-sm"
                    : isDone
                    ? "bg-white border border-gray-100 opacity-60"
                    : "opacity-30"
                }`}
              >
                {/* Status icon */}
                <div className={`w-8 h-8 rounded-full flex items-center
                                 justify-center flex-shrink-0 transition-all ${
                  isDone
                    ? "bg-gray-900"
                    : isActive
                    ? "bg-gray-100"
                    : "bg-gray-100"
                }`}>
                  {isDone ? (
                    <svg className="w-4 h-4 text-white" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isActive ? (
                    <div className="w-4 h-4 border-2 border-gray-900
                                    border-t-transparent rounded-full
                                    animate-spin" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    isDone || isActive ? "text-gray-900" : "text-gray-400"
                  }`}>
                    {step.icon} {step.label}
                  </p>
                  {isActive && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {step.detail}
                    </p>
                  )}
                  {isDone && (
                    <p className="text-xs text-gray-400 mt-0.5">Done</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Elapsed time */}
        <p className="text-xs text-gray-300 text-center mt-6">
          {elapsed < 3
            ? "This usually takes 8–12 seconds"
            : elapsed < 8
            ? `${elapsed}s elapsed — almost there`
            : `${elapsed}s elapsed — complex query, still working…`}
        </p>

      </div>
    </div>
  );
}