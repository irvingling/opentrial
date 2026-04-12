"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Button,
  Badge,
  Card,
  SearchInput,
  LoadingSpinner,
  ErrorMessage,
  PageHeader,
} from "@/components/ui";

// ── Status / Phase helpers ────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  ACTIVE_NOT_RECRUITING: "Active, Not Recruiting",
  COMPLETED:             "Completed",
  ENROLLING_BY_INVITATION: "Enrolling by Invitation",
  NOT_YET_RECRUITING:    "Not Yet Recruiting",
  RECRUITING:            "Recruiting",
  SUSPENDED:             "Suspended",
  TERMINATED:            "Terminated",
  WITHDRAWN:             "Withdrawn",
};

const PHASE_LABELS: Record<string, string> = {
  EARLY_PHASE1: "Early Phase 1",
  PHASE1: "Phase 1",
  PHASE2: "Phase 2",
  PHASE3: "Phase 3",
  PHASE4: "Phase 4",
  NA:     "N/A",
};

function formatStatus(s: string) { return STATUS_LABELS[s] ?? s; }
function formatPhase(p: string)  { return PHASE_LABELS[p]  ?? p; }

// Maps API status string to a Badge color
function statusColor(s: string): "green"|"gray"|"yellow"|"blue"|"red"|"orange" {
  const map: Record<string, "green"|"gray"|"yellow"|"blue"|"red"|"orange"> = {
    RECRUITING:            "green",
    COMPLETED:             "gray",
    ACTIVE_NOT_RECRUITING: "yellow",
    NOT_YET_RECRUITING:    "blue",
    TERMINATED:            "red",
    SUSPENDED:             "orange",
    WITHDRAWN:             "red",
  };
  return map[s] ?? "gray";
}

// ── Quick search pills ────────────────────────────────────────────────────────
const quickSearches = [
  "psoriasis",
  "Crohn disease",
  "ulcerative colitis",
  "bimekizumab",
  "deucravacitinib",
  "NCT06220604",
];

// ── Type ──────────────────────────────────────────────────────────────────────
interface Trial {
  protocolSection: {
    identificationModule:      { nctId: string; briefTitle: string };
    statusModule:              { overallStatus: string };
    conditionsModule?:         { conditions?: string[] };
    designModule?:             { phases?: string[]; enrollmentInfo?: { count: number } };
    descriptionModule?:        { briefSummary?: string };
    sponsorCollaboratorsModule: { leadSponsor: { name: string } };
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [query, setQuery]                 = useState("");
  const [trials, setTrials]               = useState<Trial[]>([]);
  const [loading, setLoading]             = useState(false);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [error, setError]                 = useState("");
  const [lastSearched, setLastSearched]   = useState("");
  const [hasSearched, setHasSearched]     = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [totalCount, setTotalCount]       = useState<number | null>(null);

  async function runSearch(term: string) {
    setLoading(true);
    setError("");
    setHasSearched(true);
    setTrials([]);
    setNextPageToken(null);
    setTotalCount(null);

    try {
      const res  = await fetch(`/api/trials?q=${encodeURIComponent(term)}&pageSize=20`, { cache: "no-store" });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();

      setTrials(data.studies ?? []);
      setNextPageToken(data.nextPageToken ?? null);
      setTotalCount(data.totalCount ?? data.studies?.length ?? 0);
      setLastSearched(term);
    } catch {
      setError("Could not load trials right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextPageToken || !lastSearched) return;
    setLoadingMore(true);
    setError("");

    try {
      const res  = await fetch(`/api/trials?q=${encodeURIComponent(lastSearched)}&pageSize=20&pageToken=${encodeURIComponent(nextPageToken)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Load more failed");
      const data = await res.json();

      setTrials((prev) => [...prev, ...(data.studies ?? [])]);
      setNextPageToken(data.nextPageToken ?? null);
    } catch {
      setError("Could not load more trials right now.");
    } finally {
      setLoadingMore(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) runSearch(query.trim());
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">

      <PageHeader
        title="OpenTrial"
        subtitle="Search and explore clinical trials from ClinicalTrials.gov"
      />

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by condition, drug, or NCT number..."
        />
        <Button type="submit" disabled={loading || !query.trim()}>
          {loading ? "Searching…" : "Search"}
        </Button>
      </form>

      {/* Quick search pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {quickSearches.map((term) => (
          <Button
            key={term}
            variant="outline"
            size="sm"
            onClick={() => { setQuery(term); runSearch(term); }}
          >
            {term}
          </Button>
        ))}
      </div>

      {/* Error */}
      {error && <ErrorMessage message={error} />}

      {/* Loading */}
      {loading && <LoadingSpinner message="Searching trials…" />}

      {/* Pre-search */}
      {!hasSearched && !loading && (
        <p className="text-center py-16 text-gray-400 text-sm">
          Enter a condition, drug name, or NCT number above
        </p>
      )}

      {/* No results */}
      {!loading && hasSearched && trials.length === 0 && !error && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-2">No trials found</p>
          <p className="text-gray-400 text-sm">Try a different condition, drug, or keyword</p>
        </div>
      )}

      {/* Result count */}
      {!loading && trials.length > 0 && totalCount !== null && (
        <p className="text-sm text-gray-400 mb-4">
          Showing <span className="font-medium text-gray-600">{trials.length}</span> of{" "}
          <span className="font-medium text-gray-600">{totalCount.toLocaleString()}</span> trials
          for <span className="font-medium text-gray-700">"{lastSearched}"</span>
        </p>
      )}

      {/* Trial cards */}
      {!loading && trials.length > 0 && (
        <div className="space-y-3">
          {trials.map((trial) => {
            const id   = trial.protocolSection.identificationModule;
            const stat = trial.protocolSection.statusModule;
            const cond = trial.protocolSection.conditionsModule;
            const des  = trial.protocolSection.designModule;
            const desc = trial.protocolSection.descriptionModule;
            const spon = trial.protocolSection.sponsorCollaboratorsModule;

            return (
              <Link key={id.nctId} href={`/trials/${id.nctId}`}>
                <Card hoverable className="mb-0">
                  <div className="flex items-start justify-between gap-4">

                    {/* Left */}
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-sm text-gray-900
                                     group-hover:text-blue-600 transition-colors
                                     leading-snug mb-1">
                        {id.briefTitle}
                      </h2>
                      <p className="text-xs text-gray-400 font-mono mb-2">
                        {id.nctId}
                      </p>
                      {desc?.briefSummary && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
                          {desc.briefSummary}
                        </p>
                      )}
                      {cond?.conditions && cond.conditions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {cond.conditions.slice(0, 3).map((c) => (
                            <Badge key={c} color="purple">{c}</Badge>
                          ))}
                          {cond.conditions.length > 3 && (
                            <span className="text-xs text-gray-400 self-center">
                              +{cond.conditions.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge color={statusColor(stat.overallStatus)}>
                        {formatStatus(stat.overallStatus)}
                      </Badge>
                      {des?.phases?.map((p) => (
                        <Badge key={p} color="indigo">{formatPhase(p)}</Badge>
                      ))}
                      {des?.enrollmentInfo?.count && (
                        <span className="text-xs text-gray-400">
                          {des.enrollmentInfo.count.toLocaleString()} participants
                        </span>
                      )}
                    </div>

                  </div>
                  <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100 truncate">
                    Sponsor: {spon.leadSponsor.name}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Load more */}
      {!loading && nextPageToken && trials.length > 0 && (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading more…" : "Load more trials"}
          </Button>
        </div>
      )}

    </main>
  );
}