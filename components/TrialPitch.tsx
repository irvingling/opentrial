"use client";

import { useEffect, useState } from "react";
import ProgressSteps, { ProgressStep } from "@/components/ProgressSteps";

const PITCH_STEPS: ProgressStep[] = [
  {
    id:     "criteria",
    label:  "Reading eligibility criteria",
    detail: "Parsing inclusion and exclusion criteria",
    icon:   "📋",
  },
  {
    id:     "pitch",
    label:  "Generating clinical summary",
    detail: "Analysing mechanism, safety signals and trial design",
    icon:   "⚖️",
  },
  {
    id:     "talking",
    label:  "Writing patient talking points",
    detail: "Translating to plain language",
    icon:   "💬",
  },
];

interface PitchData {
  oneLiner:             string;
  bullCase:             string[];
  bearCase:             string[];
  safetyHighlight?:     string;
  eligibility: {
    qualifies: string[];
    excluded:  string[];
  };
  patientTalkingPoints: string;
}

export default function TrialPitch({ nctId }: { nctId: string }) {
  const [data, setData]             = useState<PitchData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [pitchStep, setPitchStep]   = useState(0);
  const [showPatient, setShowPatient] = useState(false);

  useEffect(() => {
    // Simulate step progression while loading
    const t1 = setTimeout(() => setPitchStep(1), 1200);
    const t2 = setTimeout(() => setPitchStep(2), 2800);

    fetch(`/api/trials/${nctId}/pitch`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(true);
        else setData(d);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [nctId]);

  if (loading) {
    return (
      <ProgressSteps
        steps={PITCH_STEPS}
        currentStep={pitchStep}
        title="Generating clinical summary…"
        subtitle="Analysing trial data"
      />
    );
  }

  if (error || !data) return null;

  const [safetyConcern, ...otherConcerns] = data.bearCase;

  return (
    <div className="space-y-4">

      {/* One liner */}
      <div className="bg-gray-900 rounded-xl p-5 text-white">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
          In plain English
        </p>
        <p className="text-sm leading-relaxed">"{data.oneLiner}"</p>
      </div>

      {/* Safety highlight */}
      {(data.safetyHighlight || safetyConcern) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠️</span>
            <div>
              <p className="text-xs font-semibold text-amber-800 uppercase
                            tracking-wide mb-1">
                Key Safety Consideration
              </p>
              <p className="text-sm text-amber-800 leading-relaxed">
                {data.safetyHighlight ?? safetyConcern}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bull / Bear */}
      <div className="grid sm:grid-cols-2 gap-3">

        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            <h3 className="font-semibold text-green-900 text-sm">
              Why consider
            </h3>
          </div>
          <div className="space-y-2">
            {data.bullCase.map((point, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-green-500 flex-shrink-0 text-xs mt-0.5">
                  ✓
                </span>
                <p className="text-sm text-green-800 font-medium">{point}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <h3 className="font-semibold text-red-900 text-sm">
              What to consider
            </h3>
          </div>
          <div className="space-y-2">
            {otherConcerns.map((point, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-red-400 flex-shrink-0 text-xs mt-0.5">
                  •
                </span>
                <p className="text-sm text-red-800 font-medium">{point}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Eligibility */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">
          Can your patient get in?
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-green-700 uppercase
                          tracking-wide mb-2">
              ✅ Likely qualifies if…
            </p>
            <div className="space-y-1.5">
              {data.eligibility.qualifies.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-green-400 mt-1 flex-shrink-0 text-xs">
                    •
                  </span>
                  <p className="text-sm text-gray-700">{c}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-red-600 uppercase
                          tracking-wide mb-2">
              ❌ Likely excluded if…
            </p>
            <div className="space-y-1.5">
              {data.eligibility.excluded.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-red-400 mt-1 flex-shrink-0 text-xs">
                    •
                  </span>
                  <p className="text-sm text-gray-700">{c}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Patient talking points — collapsed by default */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowPatient((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3
                     hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">💬</span>
            <span className="font-semibold text-blue-900 text-sm">
              What to tell your patient
            </span>
          </div>
          <span className="text-blue-400 text-xs">
            {showPatient ? "▲ Hide" : "▼ Show"}
          </span>
        </button>
        {showPatient && (
          <div className="px-5 pb-4">
            <p className="text-sm text-blue-800 leading-relaxed">
              {data.patientTalkingPoints}
            </p>
          </div>
        )}
      </div>

    </div>
  );
}