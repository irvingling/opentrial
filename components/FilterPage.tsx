"use client";

import { useState } from "react";

const REGIONS = [
  { id: "north-america",      label: "North America",       emoji: "🌎" },
  { id: "europe",             label: "Europe",              emoji: "🌍" },
  { id: "asia-pacific",       label: "Asia Pacific",        emoji: "🌏" },
  { id: "middle-east-africa", label: "Middle East & Africa",emoji: "🌍" },
  { id: "latin-america",      label: "Latin America",       emoji: "🌎" },
];

const PHASES = [
  {
    id:          "EARLY_PHASE1",
    label:       "Early Phase 1",
    tagline:     "First-in-human",
    description: "Very early stage. First administration in humans. Highest uncertainty, maximum novelty.",
    badge:       "Exploratory",
    badgeColor:  "bg-orange-50 text-orange-700 border-orange-200",
  },
  {
    id:          "PHASE1",
    label:       "Phase 1",
    tagline:     "Safety & dosing",
    description: "Testing safety and dosing in small groups of 20–80 patients. Higher uncertainty but earliest access to novel agents.",
    badge:       "Early Access",
    badgeColor:  "bg-purple-50 text-purple-700 border-purple-200",
  },
  {
    id:          "PHASE2",
    label:       "Phase 2",
    tagline:     "Does it work?",
    description: "Testing efficacy in larger groups. Some data available but not yet compared to standard of care.",
    badge:       "Emerging Evidence",
    badgeColor:  "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    id:          "PHASE3",
    label:       "Phase 3",
    tagline:     "Large-scale confirmation",
    description: "Comparing directly against standard of care in hundreds to thousands of patients. Strongest evidence base.",
    badge:       "Most Selected ★",
    badgeColor:  "bg-green-50 text-green-700 border-green-200",
  },
  {
    id:          "PHASE4",
    label:       "Phase 4",
    tagline:     "Post-approval",
    description: "Real-world data after FDA approval. Drug is already proven safe and effective.",
    badge:       "Approved Agent",
    badgeColor:  "bg-gray-100 text-gray-600 border-gray-200",
  },
];

interface Props {
  trialCount: number;
  onApplyFilters: (regions: string[], phases: string[]) => void;
  onSkip: () => void;
}

export default function FilterPage({ trialCount, onApplyFilters, onSkip }: Props) {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedPhases, setSelectedPhases]   = useState<string[]>([]);

  function toggleRegion(id: string) {
    setSelectedRegions((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  }

  function togglePhase(id: string) {
    setSelectedPhases((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  const filterSummary = [
    selectedRegions.length > 0
      ? `${selectedRegions.length} region${selectedRegions.length > 1 ? "s" : ""}`
      : "",
    selectedPhases.length > 0
      ? `${selectedPhases.length} phase${selectedPhases.length > 1 ? "s" : ""}`
      : "",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

      {/* Header */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
          Refine Results
        </p>
        <h1 className="text-2xl font-bold text-gray-900">
          Narrow down the trials
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {trialCount} trials found — filter by location and phase to find the
          best fit for your patient.
        </p>
      </div>

      {/* Region picker */}
      <div>
        <h2 className="font-semibold text-gray-900 text-sm mb-1">
          Where is your patient located?
        </h2>
        <p className="text-xs text-gray-400 mb-3">
            Select all that apply — trials without location data will still appear.
            Confirm site locations in the trial detail view.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {REGIONS.map((region) => {
            const selected = selectedRegions.includes(region.id);
            return (
              <button
                key={region.id}
                onClick={() => toggleRegion(region.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border
                            text-left transition-all ${
                  selected
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <span className="text-xl">{region.emoji}</span>
                <span className="text-sm font-medium">{region.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Phase cards */}
      <div>
        <h2 className="font-semibold text-gray-900 text-sm mb-1">
          Which trial phases are you open to?
        </h2>
        <p className="text-xs text-gray-400 mb-3">
          Select all that apply — leave blank for all phases
        </p>
        <div className="space-y-2">
          {PHASES.map((phase) => {
            const selected = selectedPhases.includes(phase.id);
            return (
              <button
                key={phase.id}
                onClick={() => togglePhase(phase.id)}
                className={`w-full flex items-start gap-4 px-4 py-4 rounded-xl
                            border text-left transition-all ${
                  selected
                    ? "border-gray-900 bg-gray-900"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                {/* Checkbox */}
                <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0
                                 flex items-center justify-center transition-colors ${
                  selected ? "bg-white border-white" : "border-gray-300 bg-white"
                }`}>
                  {selected && (
                    <svg className="w-3 h-3 text-gray-900" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`font-semibold text-sm ${
                      selected ? "text-white" : "text-gray-900"
                    }`}>
                      {phase.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border
                                      font-medium ${
                      selected
                        ? "bg-white/20 text-white border-white/30"
                        : phase.badgeColor
                    }`}>
                      {phase.badge}
                    </span>
                  </div>
                  <p className={`text-xs font-medium mb-0.5 ${
                    selected ? "text-white/80" : "text-gray-500"
                  }`}>
                    {phase.tagline}
                  </p>
                  <p className={`text-xs leading-relaxed ${
                    selected ? "text-white/70" : "text-gray-400"
                  }`}>
                    {phase.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3 pt-2 pb-8">
        <button
          onClick={() => onApplyFilters(selectedRegions, selectedPhases)}
          className="w-full bg-gray-900 text-white font-semibold py-4 rounded-xl
                     hover:bg-gray-700 transition-colors text-sm"
        >
          Show matching trials
          {filterSummary && (
            <span className="ml-2 text-gray-400 font-normal">
              · {filterSummary} selected
            </span>
          )}
        </button>
        <button
          onClick={onSkip}
          className="w-full text-gray-400 text-sm py-2 hover:text-gray-600
                     transition-colors"
        >
          Skip — show all {trialCount} trials
        </button>
      </div>

    </div>
  );
}