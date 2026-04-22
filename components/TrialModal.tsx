"use client";

import { useEffect, useState } from "react";
import type { ClinicalTrial } from "@/types/trial";
import MechanismOfAction from "@/components/MechanismOfAction";
import TrialPitch from "@/components/TrialPitch";

const STATUS_LABELS: Record<string, string> = {
  ACTIVE_NOT_RECRUITING:   "Active, Not Recruiting",
  COMPLETED:               "Completed",
  ENROLLING_BY_INVITATION: "Enrolling by Invitation",
  NOT_YET_RECRUITING:      "Not Yet Recruiting",
  RECRUITING:              "Recruiting",
  SUSPENDED:               "Suspended",
  TERMINATED:              "Terminated",
  WITHDRAWN:               "Withdrawn",
};

const PHASE_LABELS: Record<string, string> = {
  EARLY_PHASE1: "Early Phase 1",
  PHASE1:       "Phase 1",
  PHASE2:       "Phase 2",
  PHASE3:       "Phase 3",
  PHASE4:       "Phase 4",
  NA:           "N/A",
};

function formatStatus(s: string) { return STATUS_LABELS[s] ?? s; }
function formatPhase(p: string)  { return PHASE_LABELS[p]  ?? p; }

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    RECRUITING:            "bg-emerald-50 text-emerald-700 border-emerald-200",
    COMPLETED:             "bg-gray-100 text-gray-600 border-gray-200",
    ACTIVE_NOT_RECRUITING: "bg-amber-50 text-amber-700 border-amber-200",
    NOT_YET_RECRUITING:    "bg-blue-50 text-blue-700 border-blue-200",
    TERMINATED:            "bg-red-50 text-red-700 border-red-200",
    SUSPENDED:             "bg-orange-50 text-orange-700 border-orange-200",
    WITHDRAWN:             "bg-red-50 text-red-700 border-red-200",
  };
  return map[status] ?? "bg-gray-100 text-gray-600 border-gray-200";
}

interface Props {
  nctId:   string;
  onClose: () => void;
}

export default function TrialModal({ nctId, onClose }: Props) {
  const [trial,   setTrial]   = useState<ClinicalTrial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    setTrial(null);

    fetch(`/api/trials/${nctId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load trial (${res.status})`);
        return res.json();
      })
      .then((data) => setTrial(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [nctId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">

      {/* Blurred backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Scrollable container */}
      <div className="absolute inset-0 overflow-y-auto py-6 px-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl mx-auto bg-white rounded-2xl
                     shadow-2xl"
        >

          {/* Sticky header */}
          <div className="sticky top-0 z-10 flex items-center justify-between
                          px-6 py-4 bg-white border-b border-gray-100
                          rounded-t-2xl">
            <span className="text-xs font-mono text-gray-400">{nctId}</span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200
                         transition-colors flex items-center justify-center
                         text-gray-500 text-sm font-medium"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6">

            {loading && (
              <div className="flex flex-col items-center py-20 gap-3">
                <div className="w-8 h-8 border-2 border-gray-900
                                border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Loading trial…</p>
              </div>
            )}

            {error && (
              <div className="py-20 text-center">
                <p className="text-red-500 font-medium mb-1">
                  Could not load trial
                </p>
                <p className="text-gray-400 text-sm">{error}</p>
              </div>
            )}

            {trial && (
              <TrialContent
                trial={trial}
                onClose={onClose}
              />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

function TrialContent({
  trial,
  onClose,
}: {
  trial:   ClinicalTrial;
  onClose: () => void;
}) {
  const { protocolSection } = trial;

  const id        = protocolSection.identificationModule;
  const status    = protocolSection.statusModule;
  const sponsor   = protocolSection.sponsorCollaboratorsModule;
  const conditions = protocolSection.conditionsModule;
  const design    = protocolSection.designModule;
  const arms      = protocolSection.armsInterventionsModule;
  const locations = protocolSection.contactsLocationsModule;

  // Group locations by country
  const locationsByCountry = (locations?.locations ?? []).reduce(
    (acc, loc) => {
      const country = loc.country ?? "Other";
      if (!acc[country]) acc[country] = [];
      acc[country].push(loc);
      return acc;
    },
    {} as Record<string, NonNullable<typeof locations>["locations"]>
  );

  const locationCount = locations?.locations?.length ?? 0;

  return (
    <div className="space-y-6">

      {/* Header */}
      <section>
        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border
                            ${getStatusColor(status.overallStatus)}`}>
            {formatStatus(status.overallStatus)}
          </span>
          {design?.phases?.map((p) => (
            <span
              key={p}
              className="px-3 py-1 rounded-full text-xs font-medium
                         bg-indigo-50 text-indigo-700 border border-indigo-200"
            >
              {formatPhase(p)}
            </span>
          ))}
        </div>

        <h1 className="text-lg font-bold text-gray-900 leading-tight mb-1">
          {id.briefTitle}
        </h1>
        <p className="text-sm text-gray-400">{sponsor.leadSponsor.name}</p>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Enrollment",
            value: design?.enrollmentInfo?.count?.toLocaleString() ?? "—",
          },
          {
            label: "Start Date",
            value: status.startDateStruct?.date ?? "—",
          },
          {
            label: "Est. Completion",
            value: status.primaryCompletionDateStruct?.date ?? "—",
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-gray-50 rounded-xl p-3 border border-gray-100"
          >
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="font-semibold text-gray-900 text-sm">{value}</p>
          </div>
        ))}
      </section>

      {/* ── Pitch deck ── */}
      <TrialPitch nctId={id.nctId} />

      {/* ── Drug / MOA ── */}
      {arms?.interventions && arms.interventions.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-900 text-sm mb-3">
            The Drug
          </h2>
          <MechanismOfAction
            interventions={arms.interventions.map((i: any) => ({
              name: i.name,
              type: i.type,
            }))}
          />
        </section>
      )}

      {/* ── Sites ── */}
      {locationCount > 0 && (
        <section>
          <h2 className="font-semibold text-gray-900 text-sm mb-3">
            Sites ({locationCount})
          </h2>
          <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
            {Object.entries(locationsByCountry).map(([country, locs]) => (
              <div key={country}>
                <p className="text-xs font-medium text-gray-400 uppercase
                               tracking-wide mb-1.5">
                  {country}
                </p>
                <div className="grid sm:grid-cols-2 gap-1.5">
                  {(locs ?? []).map((loc, i) => (
                    <div
                      key={i}
                      className="p-2.5 border border-gray-100 rounded-lg bg-white"
                    >
                      {loc.facility && (
                        <p className="font-medium text-gray-800 text-xs">
                          {loc.facility}
                        </p>
                      )}
                      <p className="text-gray-400 text-xs">
                        {[loc.city, loc.state].filter(Boolean).join(", ")}
                      </p>
                      {loc.status === "RECRUITING" && (
                        <span className="text-xs text-emerald-600 font-medium">
                          ● Recruiting
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t
                      border-gray-100">
        <a
          href={`https://clinicaltrials.gov/study/${id.nctId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          View on ClinicalTrials.gov ↗
        </a>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-500 border border-gray-200
                     rounded-lg hover:bg-gray-50 transition-colors"
        >
          ✕ Close
        </button>
      </div>

    </div>
  );
}