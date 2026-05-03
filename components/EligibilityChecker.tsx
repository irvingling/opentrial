"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface PatientProfile {
  age:               string;
  sex:               string;
  diagnosis:         string;
  severity:          string;
  priorTreatments:   string;
  currentMedications:string;
  comorbidities:     string;
  location:          string;
}

interface EligibilityResult {
  nctId:             string;
  verdict:           "QUALIFIES" | "POSSIBLE" | "EXCLUDED";
  confidence:        "HIGH" | "MEDIUM" | "LOW";
  summary:           string;
  matchedCriteria:   string[];
  flaggedCriteria:   string[];
  excludingCriteria: string[];
  recommendedAction: string;
}

interface EligibilityData {
  results:        EligibilityResult[];
  overallSummary: string;
}

interface Props {
  nctIds:        string[];
  query:         string;
  trialTitles:   Record<string, string>;
}

const VERDICT_CONFIG = {
  QUALIFIES: {
    label:  "Likely Qualifies",
    color:  "bg-emerald-50 border-emerald-200",
    badge:  "bg-emerald-100 text-emerald-800",
    icon:   "✅",
    dot:    "bg-emerald-500",
  },
  POSSIBLE: {
    label:  "Needs Clarification",
    color:  "bg-amber-50 border-amber-200",
    badge:  "bg-amber-100 text-amber-800",
    icon:   "⚠️",
    dot:    "bg-amber-500",
  },
  EXCLUDED: {
    label:  "Likely Excluded",
    color:  "bg-red-50 border-red-200",
    badge:  "bg-red-100 text-red-800",
    icon:   "❌",
    dot:    "bg-red-500",
  },
};

const SEX_OPTIONS = ["Not specified", "Male", "Female", "Other"];
const SEVERITY_OPTIONS = [
  "Not specified",
  "Mild",
  "Moderate",
  "Severe",
  "Very severe / refractory",
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function EligibilityChecker({ nctIds, query, trialTitles }: Props) {
  const [isOpen, setIsOpen]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [data, setData]           = useState<EligibilityData | null>(null);
  const [error, setError]         = useState(false);

  const [profile, setProfile] = useState<PatientProfile>({
    age:                "",
    sex:                "Not specified",
    diagnosis:          extractDiagnosis(query),
    severity:           extractSeverity(query),
    priorTreatments:    extractPriorTreatments(query),
    currentMedications: "",
    comorbidities:      "",
    location:           "",
  });

  function update(field: keyof PatientProfile, value: string) {
    setProfile((p) => ({ ...p, [field]: value }));
  }

  async function handleScreen() {
    setLoading(true);
    setError(false);
    setData(null);

    try {
      const res = await fetch("/api/eligibility", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ nctIds, patientProfile: profile }),
      });
      const d = await res.json();
      if (d.error) setError(true);
      else setData(d);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const filledFields = Object.values(profile).filter(
    (v) => v && v !== "Not specified"
  ).length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

      {/* Header — always visible */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4
                   hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center
                          justify-center text-base flex-shrink-0">
            🎯
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-sm">
              Pre-screen your patient
            </p>
            <p className="text-xs text-gray-400">
              Enter patient details — Claude checks eligibility against each trial
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {filledFields > 0 && (
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5
                             rounded-full font-medium">
              {filledFields} fields filled
            </span>
          )}
          <span className="text-gray-400 text-sm">
            {isOpen ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {/* Expandable form */}
      {isOpen && (
        <div className="px-5 pb-5 border-t border-gray-100">

          {/* Form */}
          {!data && (
            <div className="pt-4 space-y-4">
              <p className="text-xs text-gray-400">
                Pre-filled from your search query — update as needed
              </p>

              {/* Row 1 — Age + Sex */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Age
                  </label>
                  <input
                    type="number"
                    value={profile.age}
                    onChange={(e) => update("age", e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full px-3 py-2 text-sm border border-gray-200
                               rounded-lg focus:outline-none focus:border-gray-400
                               bg-white text-gray-800 placeholder-gray-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Sex
                  </label>
                  <select
                    value={profile.sex}
                    onChange={(e) => update("sex", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200
                               rounded-lg focus:outline-none focus:border-gray-400
                               bg-white text-gray-800"
                  >
                    {SEX_OPTIONS.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Diagnosis */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Diagnosis
                </label>
                <input
                  type="text"
                  value={profile.diagnosis}
                  onChange={(e) => update("diagnosis", e.target.value)}
                  placeholder="e.g. Moderate-severe plaque psoriasis"
                  className="w-full px-3 py-2 text-sm border border-gray-200
                             rounded-lg focus:outline-none focus:border-gray-400
                             bg-white text-gray-800 placeholder-gray-300"
                />
              </div>

              {/* Severity */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Disease severity
                </label>
                <div className="flex flex-wrap gap-2">
                  {SEVERITY_OPTIONS.filter((o) => o !== "Not specified").map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => update("severity", o)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium
                                  border transition-all ${
                        profile.severity === o
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prior treatments */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Prior treatments (failed or completed)
                </label>
                <input
                  type="text"
                  value={profile.priorTreatments}
                  onChange={(e) => update("priorTreatments", e.target.value)}
                  placeholder="e.g. Etanercept (failed), Methotrexate (intolerant)"
                  className="w-full px-3 py-2 text-sm border border-gray-200
                             rounded-lg focus:outline-none focus:border-gray-400
                             bg-white text-gray-800 placeholder-gray-300"
                />
              </div>

              {/* Current medications */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Current medications
                </label>
                <input
                  type="text"
                  value={profile.currentMedications}
                  onChange={(e) => update("currentMedications", e.target.value)}
                  placeholder="e.g. Methotrexate 15mg weekly, folic acid"
                  className="w-full px-3 py-2 text-sm border border-gray-200
                             rounded-lg focus:outline-none focus:border-gray-400
                             bg-white text-gray-800 placeholder-gray-300"
                />
              </div>

              {/* Comorbidities */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Key comorbidities or contraindications
                </label>
                <input
                  type="text"
                  value={profile.comorbidities}
                  onChange={(e) => update("comorbidities", e.target.value)}
                  placeholder="e.g. Mild renal impairment, history of TB, pregnancy"
                  className="w-full px-3 py-2 text-sm border border-gray-200
                             rounded-lg focus:outline-none focus:border-gray-400
                             bg-white text-gray-800 placeholder-gray-300"
                />
              </div>

              {/* Location */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">
                  Patient location (city or region)
                </label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="e.g. Boston MA, London UK, Sydney AU"
                  className="w-full px-3 py-2 text-sm border border-gray-200
                             rounded-lg focus:outline-none focus:border-gray-400
                             bg-white text-gray-800 placeholder-gray-300"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleScreen}
                disabled={loading || !profile.diagnosis}
                className="w-full py-3 bg-gray-900 text-white text-sm
                           font-semibold rounded-xl hover:bg-gray-700
                           disabled:opacity-40 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white
                                     border-t-transparent rounded-full
                                     animate-spin" />
                    Checking eligibility…
                  </span>
                ) : (
                  "Check eligibility for all trials →"
                )}
              </button>

              {error && (
                <p className="text-xs text-red-500 text-center">
                  Could not check eligibility. Please try again.
                </p>
              )}

              <p className="text-xs text-gray-300 text-center">
                This is a pre-screen only. Always confirm with trial coordinators.
              </p>
            </div>
          )}

          {/* Results */}
          {data && (
            <div className="pt-4 space-y-4">

              {/* Overall summary */}
              <div className="bg-gray-900 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 mb-1">Overall assessment</p>
                <p className="text-sm text-white leading-relaxed">
                  {data.overallSummary}
                </p>
              </div>

              {/* Per-trial results */}
              <div className="space-y-3">
                {data.results
                  .sort((a, b) => {
                    const order = { QUALIFIES: 0, POSSIBLE: 1, EXCLUDED: 2 };
                    return order[a.verdict] - order[b.verdict];
                  })
                  .map((result) => {
                    const config = VERDICT_CONFIG[result.verdict];
                    return (
                      <div
                        key={result.nctId}
                        className={`rounded-xl border p-4 ${config.color}`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between
                                        gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-gray-400">
                                {result.nctId}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full
                                               font-medium ${config.badge}`}>
                                {config.icon} {config.label}
                              </span>
                              {result.confidence === "LOW" && (
                                <span className="text-xs text-gray-400">
                                  · Low confidence
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-gray-700
                                          line-clamp-1">
                              {trialTitles[result.nctId] ?? result.nctId}
                            </p>
                          </div>
                        </div>

                        {/* Summary */}
                        <p className="text-sm text-gray-700 mb-3">
                          {result.summary}
                        </p>

                        {/* Criteria breakdown */}
                        <div className="space-y-2">
                          {result.matchedCriteria.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-emerald-700
                                            mb-1">
                                ✓ Criteria met
                              </p>
                              <ul className="space-y-1">
                                {result.matchedCriteria.map((c, i) => (
                                  <li key={i}
                                    className="text-xs text-gray-600 flex
                                               items-start gap-1.5">
                                    <span className="text-emerald-400
                                                     flex-shrink-0 mt-0.5">
                                      •
                                    </span>
                                    {c}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {result.flaggedCriteria.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-amber-700
                                            mb-1">
                                ⚠ Needs clarification
                              </p>
                              <ul className="space-y-1">
                                {result.flaggedCriteria.map((c, i) => (
                                  <li key={i}
                                    className="text-xs text-gray-600 flex
                                               items-start gap-1.5">
                                    <span className="text-amber-400
                                                     flex-shrink-0 mt-0.5">
                                      •
                                    </span>
                                    {c}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {result.excludingCriteria.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-red-700
                                            mb-1">
                                ✗ Likely excluded
                              </p>
                              <ul className="space-y-1">
                                {result.excludingCriteria.map((c, i) => (
                                  <li key={i}
                                    className="text-xs text-gray-600 flex
                                               items-start gap-1.5">
                                    <span className="text-red-400
                                                     flex-shrink-0 mt-0.5">
                                      •
                                    </span>
                                    {c}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Recommended action */}
                        {result.recommendedAction && (
                          <div className="mt-3 pt-3 border-t border-black/5">
                            <p className="text-xs text-gray-500">
                              <span className="font-medium text-gray-700">
                                Next step:{" "}
                              </span>
                              {result.recommendedAction}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Reset */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-300">
                  Pre-screen only · verify with trial coordinators
                </p>
                <button
                  onClick={() => { setData(null); setError(false); }}
                  className="text-xs text-gray-400 hover:text-gray-600
                             underline transition-colors"
                >
                  Edit patient details
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Extract fields from search query ─────────────────────────────────────────
function extractDiagnosis(query: string): string {
  const lower = query.toLowerCase();
  const conditions = [
    "psoriasis", "lupus", "sle", "rheumatoid arthritis", "ra",
    "crohn", "ulcerative colitis", "uc", "multiple sclerosis", "ms",
    "ankylosing spondylitis", "psoriatic arthritis", "atopic dermatitis",
    "eczema", "vasculitis", "myositis", "scleroderma",
  ];
  for (const c of conditions) {
    if (lower.includes(c)) {
      return c.charAt(0).toUpperCase() + c.slice(1);
    }
  }
  return "";
}

function extractSeverity(query: string): string {
  const lower = query.toLowerCase();
  if (lower.includes("severe") || lower.includes("refractory")) return "Severe";
  if (lower.includes("moderate")) return "Moderate";
  if (lower.includes("mild")) return "Mild";
  return "Not specified";
}

function extractPriorTreatments(query: string): string {
  const lower = query.toLowerCase();
  const drugs = [
    "etanercept", "adalimumab", "humira", "enbrel",
    "infliximab", "remicade", "methotrexate", "mtx",
    "secukinumab", "cosentyx", "ixekizumab", "taltz",
    "ustekinumab", "stelara", "belimumab", "benlysta",
    "rituximab", "abatacept",
  ];
  const found = drugs.filter((d) => lower.includes(d));
  if (found.length > 0) {
    return found.map((d) => `${d.charAt(0).toUpperCase() + d.slice(1)} (failed)`).join(", ");
  }

  if (lower.includes("anti-tnf") || lower.includes("biologic")) {
    return "Anti-TNF biologic (failed)";
  }
  return "";
}