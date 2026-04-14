"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Props {
  conditions: string[];
  phases: string[];
  currentNctId: string;
}

interface TrialSummary {
  nctId: string;
  title: string;
  status: string;
  phase: string;
  interventions: string[];
  sponsor: string;
  enrollment: number | null;
  locations: number;
}

const STATUS_COLOR: Record<string, string> = {
  RECRUITING:            "bg-green-100 text-green-800 border-green-200",
  COMPLETED:             "bg-gray-100 text-gray-700 border-gray-200",
  ACTIVE_NOT_RECRUITING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  NOT_YET_RECRUITING:    "bg-blue-100 text-blue-800 border-blue-200",
  TERMINATED:            "bg-red-100 text-red-700 border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE_NOT_RECRUITING: "Active, Not Recruiting",
  COMPLETED:             "Completed",
  NOT_YET_RECRUITING:    "Not Yet Recruiting",
  RECRUITING:            "Recruiting",
  TERMINATED:            "Terminated",
};

export default function SimilarTrials({
  conditions,
  phases,
  currentNctId,
}: Props) {
  const [trials, setTrials]   = useState<TrialSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [loaded, setLoaded]   = useState(false);

  async function loadSimilarTrials() {
  if (!conditions[0]) return;
  setLoading(true);
  setError("");

  try {
    // Build the query — condition is required, phase is optional
    const params = new URLSearchParams({
      condition: conditions[0],
      pageSize:  "8",
    });

    // Only add phase if we have one — omitting it returns all phases
    // which is fine for similar trial discovery
    if (phases[0]) {
      params.set("phase", phases[0]);
    }

    const res  = await fetch(`/api/trials?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();

    const filtered = (data.studies ?? [])
      .filter(
        (s: any) =>
          s.protocolSection.identificationModule.nctId !== currentNctId
      )
      .slice(0, 6)
      .map((s: any) => {
        const ps = s.protocolSection;
        return {
          nctId:  ps.identificationModule.nctId,
          title:  ps.identificationModule.briefTitle,
          status: ps.statusModule.overallStatus,
          phase:  ps.designModule?.phases?.join(", ") ?? "N/A",
          interventions:
            ps.armsInterventionsModule?.interventions
              ?.filter((i: any) =>
                ["DRUG", "BIOLOGICAL"].includes(i.type?.toUpperCase())
              )
              .map((i: any) => i.name) ?? [],
          sponsor:
            ps.sponsorCollaboratorsModule?.leadSponsor?.name ?? "N/A",
          enrollment:
            ps.designModule?.enrollmentInfo?.count ?? null,
          locations:
            ps.contactsLocationsModule?.locations?.length ?? 0,
        };
      });

    setTrials(filtered);
    setLoaded(true);
  } catch {
    setError("Could not load similar trials.");
  } finally {
    setLoading(false);
  }
}

  return (
    <section className="border border-gray-200 rounded-xl bg-white p-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            🔄 Similar Trials
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Other{" "}
            <span className="font-medium">{conditions[0] ?? "related"}</span>
            {phases[0] ? ` · ${phases[0]}` : ""} trials
          </p>
        </div>

        {!loaded && (
          <button
            onClick={loadSimilarTrials}
            disabled={loading}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg
                       hover:bg-gray-700 disabled:opacity-50
                       disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? "Loading…" : "Find Similar Trials"}
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600
                          rounded-full animate-spin shrink-0" />
          Searching ClinicalTrials.gov… (free — no AI)
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-500 py-2">{error}</p>
      )}

      {/* No results */}
      {loaded && trials.length === 0 && !loading && (
        <p className="text-sm text-gray-400 py-2">
          No similar trials found for {conditions[0]}.
        </p>
      )}

      {/* Trial table */}
      {trials.length > 0 && (
        <div className="space-y-3">
          {trials.map((trial) => (
            <Link
              key={trial.nctId}
              href={`/trials/${trial.nctId}`}
              className="block border border-gray-100 rounded-lg p-4
                         hover:border-blue-300 hover:bg-blue-50
                         transition-all group"
            >
              <div className="flex items-start justify-between gap-3">

                {/* Left */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900
                                group-hover:text-blue-600 transition-colors
                                leading-snug mb-1">
                    {trial.title}
                  </p>
                  <p className="text-xs text-gray-400 font-mono mb-2">
                    {trial.nctId}
                  </p>

                  {/* Drug names */}
                  {trial.interventions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {trial.interventions.slice(0, 4).map((name) => (
                        <span
                          key={name}
                          className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700
                                     border border-blue-100 rounded-full"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: status + stats */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium
                                border ${
                                  STATUS_COLOR[trial.status] ??
                                  "bg-gray-100 text-gray-600 border-gray-200"
                                }`}
                  >
                    {STATUS_LABEL[trial.status] ?? trial.status}
                  </span>

                  {trial.phase && trial.phase !== "N/A" && (
                    <span className="text-xs text-gray-400">{trial.phase}</span>
                  )}

                  {trial.enrollment && (
                    <span className="text-xs text-gray-400">
                      {trial.enrollment.toLocaleString()} pts
                    </span>
                  )}

                  {trial.locations > 0 && (
                    <span className="text-xs text-gray-400">
                      {trial.locations} sites
                    </span>
                  )}
                </div>
              </div>

              {/* Sponsor */}
              <p className="text-xs text-gray-400 mt-2 pt-2
                             border-t border-gray-100 truncate">
                {trial.sponsor}
              </p>
            </Link>
          ))}

          <p className="text-xs text-gray-400 pt-2 text-center">
            Data from ClinicalTrials.gov · No AI used · Always free
          </p>
        </div>
      )}
    </section>
  );
}
