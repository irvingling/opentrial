"use client";

import { useState } from "react";
import Link from "next/link";

// ── Status and Phase helpers ───────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  ACTIVE_NOT_RECRUITING: "Active, Not Recruiting",
  COMPLETED: "Completed",
  ENROLLING_BY_INVITATION: "Enrolling by Invitation",
  NOT_YET_RECRUITING: "Not Yet Recruiting",
  RECRUITING: "Recruiting",
  SUSPENDED: "Suspended",
  TERMINATED: "Terminated",
  WITHDRAWN: "Withdrawn",
};

const PHASE_LABELS: Record<string, string> = {
  EARLY_PHASE1: "Early Phase 1",
  PHASE1: "Phase 1",
  PHASE2: "Phase 2",
  PHASE3: "Phase 3",
  PHASE4: "Phase 4",
  NA: "N/A",
};

function formatStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function formatPhase(phase: string): string {
  return PHASE_LABELS[phase] ?? phase;
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    RECRUITING: "bg-green-100 text-green-800 border-green-200",
    COMPLETED: "bg-gray-100 text-gray-700 border-gray-200",
    ACTIVE_NOT_RECRUITING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    NOT_YET_RECRUITING: "bg-blue-100 text-blue-800 border-blue-200",
    TERMINATED: "bg-red-100 text-red-700 border-red-200",
    SUSPENDED: "bg-orange-100 text-orange-800 border-orange-200",
    WITHDRAWN: "bg-red-100 text-red-700 border-red-200",
  };
  return map[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

// ── Type definitions ──────────────────────────────────────────────────────────
interface TrialSummary {
  protocolSection: {
    identificationModule: {
      nctId: string;
      briefTitle: string;
    };
    statusModule: {
      overallStatus: string;
    };
    conditionsModule?: {
      conditions?: string[];
    };
    designModule?: {
      phases?: string[];
      enrollmentInfo?: { count: number; type: string };
    };
    descriptionModule?: {
      briefSummary?: string;
    };
    sponsorCollaboratorsModule: {
      leadSponsor: { name: string };
    };
  };
}

// ── Main search page ──────────────────────────────────────────────────────────
export default function TrialsPage() {
  const [query, setQuery] = useState("");
  const [trials, setTrials] = useState<TrialSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);
    setTrials([]);

    try {
      const res = await fetch(
        `/api/trials?q=${encodeURIComponent(query.trim())}&pageSize=20`
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errData.error ?? `Request failed (${res.status})`);
      }

      const data = await res.json();

      // ── THE KEY FIX ────────────────────────────────────────────────────────
      // ClinicalTrials.gov v2 API returns:
      //   { studies: [...], totalCount: 1234, nextPageToken: "..." }
      //
      // NOT a plain array — you MUST use data.studies, not just data
      // ──────────────────────────────────────────────────────────────────────
      setTrials(data.studies ?? []);
      setTotalCount(data.totalCount ?? data.studies?.length ?? 0);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setTrials([]);
      setTotalCount(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">

      {/* ── Page header ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">OpenTrial</h1>
        <p className="text-gray-500 text-sm">
          Search and explore clinical trials from ClinicalTrials.gov
        </p>
      </div>

      {/* ── Search form ── */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. psoriasis, breast cancer, metformin..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {/* ── Error message ── */}
      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm font-medium">Something went wrong</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* ── Results count ── */}
      {!loading && hasSearched && totalCount !== null && trials.length > 0 && (
        <p className="text-sm text-gray-500 mb-4">
          Showing {trials.length} of{" "}
          <span className="font-medium">{totalCount.toLocaleString()}</span>{" "}
          trials for{" "}
          <span className="font-medium text-gray-700">"{query}"</span>
        </p>
      )}

      {/* ── Loading spinner ── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent
                            rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Searching trials...</p>
          </div>
        </div>
      )}

      {/* ── No results ── */}
      {!loading && hasSearched && trials.length === 0 && !error && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-2">No trials found</p>
          <p className="text-gray-400 text-sm">
            Try a different condition name, drug, or keyword
          </p>
        </div>
      )}

      {/* ── Before first search ── */}
      {!hasSearched && !loading && (
        <div className="text-center py-16 text-gray-400 text-sm">
          Enter a search term above to find clinical trials
        </div>
      )}

      {/* ── Results list ── */}
      {!loading && trials.length > 0 && (
        <div className="space-y-4">
          {trials.map((trial) => {
            const idMod   = trial.protocolSection.identificationModule;
            const statMod = trial.protocolSection.statusModule;
            const condMod = trial.protocolSection.conditionsModule;
            const desMod  = trial.protocolSection.designModule;
            const descMod = trial.protocolSection.descriptionModule;
            const sponMod = trial.protocolSection.sponsorCollaboratorsModule;

            return (
              <Link
                key={idMod.nctId}
                href={`/trials/${idMod.nctId}`}
                className="block p-5 border border-gray-200 rounded-xl bg-white
                           hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-4">

                  {/* Left: title, ID, summary, conditions */}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900
                                   group-hover:text-blue-600 transition-colors
                                   mb-1 leading-snug">
                      {idMod.briefTitle}
                    </h2>
                    <p className="text-xs text-gray-400 font-mono mb-2">
                      {idMod.nctId}
                    </p>

                    {descMod?.briefSummary && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {descMod.briefSummary}
                      </p>
                    )}

                    {/* Condition tags */}
                    {condMod?.conditions && condMod.conditions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {condMod.conditions.slice(0, 3).map((c) => (
                          <span
                            key={c}
                            className="text-xs px-2 py-0.5 bg-purple-50
                                       text-purple-700 border border-purple-100
                                       rounded-full"
                          >
                            {c}
                          </span>
                        ))}
                        {condMod.conditions.length > 3 && (
                          <span className="text-xs text-gray-400 self-center">
                            +{condMod.conditions.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: status badge, phase badge, enrollment */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full
                                      font-medium border
                                      ${getStatusColor(statMod.overallStatus)}`}>
                      {formatStatus(statMod.overallStatus)}
                    </span>

                    {desMod?.phases?.map((p) => (
                      <span
                        key={p}
                        className="text-xs px-2.5 py-1 rounded-full font-medium
                                   bg-indigo-50 text-indigo-700 border border-indigo-100"
                      >
                        {formatPhase(p)}
                      </span>
                    ))}

                    {desMod?.enrollmentInfo?.count && (
                      <span className="text-xs text-gray-400">
                        {desMod.enrollmentInfo.count.toLocaleString()} participants
                      </span>
                    )}
                  </div>

                </div>

                {/* Sponsor line */}
                <p className="text-xs text-gray-400 mt-3 truncate">
                  Sponsor: {sponMod.leadSponsor.name}
                </p>
              </Link>
            );
          })}
        </div>
      )}

    </main>
  );
}
