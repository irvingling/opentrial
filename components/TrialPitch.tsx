"use client";

import { useEffect, useState } from "react";

interface PitchData {
  oneLiner:             string;
  bullCase:             string[];
  bearCase:             string[];
  eligibility: {
    qualifies: string[];
    excluded:  string[];
  };
  patientTalkingPoints: string;
}

export default function TrialPitch({ nctId }: { nctId: string }) {
  const [data, setData]       = useState<PitchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    fetch(`/api/trials/${nctId}/pitch`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(true);
        else setData(d);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [nctId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
        ))}
        <p className="text-xs text-gray-400 text-center">
          Generating clinical summary…
        </p>
      </div>
    );
  }

  if (error || !data) return null;

  return (
    <div className="space-y-4">

      {/* One liner */}
      <div className="bg-gray-900 rounded-xl p-5 text-white">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
          In plain English
        </p>
        <p className="text-sm leading-relaxed">"{data.oneLiner}"</p>
      </div>

      {/* Bull / Bear */}
      <div className="grid sm:grid-cols-2 gap-3">

        {/* Bull case */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            <h3 className="font-semibold text-green-900 text-sm">
              Why consider this trial
            </h3>
          </div>
          <div className="space-y-2">
            {data.bullCase.map((point, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5 flex-shrink-0 text-xs">✓</span>
                <p className="text-sm text-green-800">{point}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bear case */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <h3 className="font-semibold text-red-900 text-sm">
              What to consider
            </h3>
          </div>
          <div className="space-y-2">
            {data.bearCase.map((point, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5 flex-shrink-0 text-xs">•</span>
                <p className="text-sm text-red-800">{point}</p>
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
                  <span className="text-green-400 mt-1 flex-shrink-0 text-xs">•</span>
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
                  <span className="text-red-400 mt-1 flex-shrink-0 text-xs">•</span>
                  <p className="text-sm text-gray-700">{c}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Patient talking points */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">💬</span>
          <h3 className="font-semibold text-blue-900 text-sm">
            What to tell your patient
          </h3>
        </div>
        <p className="text-sm text-blue-800 leading-relaxed">
          {data.patientTalkingPoints}
        </p>
      </div>

    </div>
  );
}