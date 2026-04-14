"use client";

import { useEffect, useState } from "react";
import type { ClinicalTrial } from "@/types/trial";
import MechanismOfAction from "@/components/MechanismOfAction";
import SimilarTrials from "@/components/SimilarTrials";

// ── Helpers (same ones used on the detail page) ───────────────────────────────
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
    RECRUITING:            "bg-green-100 text-green-800 border-green-200",
    COMPLETED:             "bg-gray-100 text-gray-700 border-gray-200",
    ACTIVE_NOT_RECRUITING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    NOT_YET_RECRUITING:    "bg-blue-100 text-blue-800 border-blue-200",
    TERMINATED:            "bg-red-100 text-red-700 border-red-200",
    SUSPENDED:             "bg-orange-100 text-orange-800 border-orange-200",
    WITHDRAWN:             "bg-red-100 text-red-700 border-red-200",
  };
  return map[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  nctId:   string;
  onClose: () => void;
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export default function TrialModal({ nctId, onClose }: Props) {
  const [trial,   setTrial]   = useState<ClinicalTrial | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // ── Fetch trial data when modal opens ─────────────────────────────────────
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

    // Lock background scroll while modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [nctId]);

  // ── Close on Escape key ───────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    // ── Full screen container ──────────────────────────────────────────────
    <div className="fixed inset-0 z-50 flex items-start justify-center">

      {/* Blurred backdrop — click to close */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Scrollable area so tall modals don't get cut off */}
      <div className="absolute inset-0 overflow-y-auto py-8 px-4">
        <div
          // Stop clicks inside the modal from closing it
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl mx-auto bg-white rounded-2xl
                     shadow-2xl"
        >

          {/* ── Sticky header bar with close button ── */}
          <div className="sticky top-0 z-10 flex items-center justify-between
                          px-6 py-4 bg-white border-b border-gray-100
                          rounded-t-2xl">
            <span className="text-sm font-mono text-gray-400">{nctId}</span>

            <button
              onClick={onClose}
              aria-label="Close"
              className="flex items-center justify-center w-8 h-8 rounded-full
                         bg-gray-100 hover:bg-gray-200 transition-colors
                         text-gray-600 font-medium text-sm"
            >
              ✕
            </button>
          </div>

          {/* ── Modal body ── */}
          <div className="px-6 py-6">

            {/* Loading */}
            {loading && (
              <div className="flex justify-center py-20">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-blue-600
                                  border-t-transparent rounded-full
                                  animate-spin mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Loading trial…</p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="py-20 text-center">
                <p className="text-red-500 font-medium mb-1">
                  Could not load trial
                </p>
                <p className="text-gray-400 text-sm">{error}</p>
              </div>
            )}

            {/* Trial content */}
            {trial && <TrialContent trial={trial} onClose={onClose} />}

          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TrialContent — all the trial detail sections rendered inside the modal
// ─────────────────────────────────────────────────────────────────────────────
function TrialContent({
  trial,
  onClose,
}: {
  trial:   ClinicalTrial;
  onClose: () => void;
}) {
  const { protocolSection } = trial;

  const id          = protocolSection.identificationModule;
  const status      = protocolSection.statusModule;
  const sponsor     = protocolSection.sponsorCollaboratorsModule;
  const desc        = protocolSection.descriptionModule;
  const conditions  = protocolSection.conditionsModule;
  const design      = protocolSection.designModule;
  const eligibility = protocolSection.eligibilityModule;
  const arms        = protocolSection.armsInterventionsModule;
  const outcomes    = protocolSection.outcomesModule;
  const locations   = protocolSection.contactsLocationsModule;

  return (
    <div className="space-y-8">

      {/* ── Title + badges ── */}
      <section>
        <h1 className="text-xl font-bold text-gray-900 leading-tight mb-2">
          {id.briefTitle}
        </h1>
        {id.officialTitle && id.officialTitle !== id.briefTitle && (
          <p className="text-sm text-gray-500 italic mb-3">
            {id.officialTitle}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium border
                        ${getStatusColor(status.overallStatus)}`}
          >
            {formatStatus(status.overallStatus)}
          </span>

          {design?.phases?.map((p) => (
            <span
              key={p}
              className="px-3 py-1 rounded-full text-sm font-medium
                         bg-indigo-100 text-indigo-800 border border-indigo-200"
            >
              {formatPhase(p)}
            </span>
          ))}

          {design?.studyType && (
            <span className="px-3 py-1 rounded-full text-sm font-medium
                             bg-slate-100 text-slate-700 border border-slate-200">
              {design.studyType}
            </span>
          )}
        </div>
      </section>

      {/* ── Key facts grid ── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4
                          bg-gray-50 rounded-xl border border-gray-100">
        {[
          { label: "NCT ID",             value: id.nctId },
          { label: "Sponsor",            value: sponsor.leadSponsor.name },
          { label: "Start",              value: status.startDateStruct?.date ?? "—" },
          { label: "Enrollment",         value: design?.enrollmentInfo?.count?.toLocaleString() ?? "—" },
          { label: "Primary Completion", value: status.primaryCompletionDateStruct?.date ?? "—" },
          { label: "Study Completion",   value: status.completionDateStruct?.date ?? "—" },
          { label: "Allocation",         value: design?.designInfo?.allocation ?? "—" },
          { label: "Primary Purpose",    value: design?.designInfo?.primaryPurpose ?? "—" },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">
              {label}
            </p>
            <p className="font-medium text-gray-800 text-sm">{value}</p>
          </div>
        ))}
      </section>

      {/* ── Summary ── */}
      {desc?.briefSummary && (
        <section>
          <h2 className="text-base font-semibold mb-2">Summary</h2>
          <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
            {desc.briefSummary}
          </p>
        </section>
      )}

      {/* ── Conditions ── */}
      {conditions?.conditions && conditions.conditions.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-2">Conditions</h2>
          <div className="flex flex-wrap gap-2">
            {conditions.conditions.map((c) => (
              <span
                key={c}
                className="px-3 py-1 bg-purple-50 text-purple-800
                           border border-purple-200 rounded-full text-sm"
              >
                {c}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Eligibility ── */}
      {eligibility && (
        <section>
          <h2 className="text-base font-semibold mb-3">Eligibility</h2>
          <div className="flex flex-wrap gap-6 mb-4 text-sm">
            {eligibility.sex && (
              <div>
                <span className="text-gray-400 uppercase text-xs">Sex </span>
                <span className="capitalize">{eligibility.sex.toLowerCase()}</span>
              </div>
            )}
            {eligibility.minimumAge && (
              <div>
                <span className="text-gray-400 uppercase text-xs">Min Age </span>
                <span>{eligibility.minimumAge}</span>
              </div>
            )}
            {eligibility.maximumAge && (
              <div>
                <span className="text-gray-400 uppercase text-xs">Max Age </span>
                <span>{eligibility.maximumAge}</span>
              </div>
            )}
            {eligibility.healthyVolunteers !== undefined && (
              <div>
                <span className="text-gray-400 uppercase text-xs">
                  Healthy Volunteers{" "}
                </span>
                <span>{eligibility.healthyVolunteers ? "Yes" : "No"}</span>
              </div>
            )}
          </div>
          {eligibility.eligibilityCriteria && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700
                            whitespace-pre-wrap leading-relaxed font-mono border
                            max-h-60 overflow-y-auto">
              {eligibility.eligibilityCriteria}
            </div>
          )}
        </section>
      )}

      {/* ── Interventions ── */}
      {arms?.interventions && arms.interventions.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3">
            Interventions ({arms.interventions.length})
          </h2>
          <div className="space-y-2">
            {arms.interventions.map((inv, i) => (
              <div key={i} className="p-3 border rounded-lg bg-white">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs px-2 py-0.5 bg-gray-100
                                   text-gray-600 rounded uppercase tracking-wide">
                    {inv.type}
                  </span>
                  <span className="font-medium text-sm">{inv.name}</span>
                </div>
                {inv.description && (
                  <p className="text-sm text-gray-600 mt-1">{inv.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Mechanism of Action ── */}
      {arms?.interventions && arms.interventions.length > 0 && (
        <MechanismOfAction
          interventions={arms.interventions.map((i) => ({
            name: i.name,
            type: i.type,
          }))}
        />
      )}

      {/* ── Primary Outcomes ── */}
      {outcomes?.primaryOutcomes && outcomes.primaryOutcomes.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3">Primary Outcomes</h2>
          <div className="space-y-2">
            {outcomes.primaryOutcomes.map((o, i) => (
              <div key={i} className="p-3 border rounded-lg bg-white">
                <p className="font-medium text-sm">{o.measure}</p>
                {o.timeFrame && (
                  <p className="text-xs text-gray-500 mt-1">
                    Time Frame: {o.timeFrame}
                  </p>
                )}
                {o.description && (
                  <p className="text-sm text-gray-600 mt-1">{o.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Locations ── */}
      {locations?.locations && locations.locations.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3">
            Locations ({locations.locations.length})
          </h2>
          <div className="grid sm:grid-cols-2 gap-2 max-h-60
                          overflow-y-auto pr-1">
            {locations.locations.map((loc, i) => (
              <div key={i} className="p-3 border rounded-lg text-sm bg-white">
                {loc.facility && (
                  <p className="font-medium text-gray-800">{loc.facility}</p>
                )}
                <p className="text-gray-500">
                  {[loc.city, loc.state, loc.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {loc.status && (
                  <span className={`text-xs font-medium ${
                    loc.status === "RECRUITING"
                      ? "text-green-600"
                      : "text-gray-400"
                  }`}>
                    {loc.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Similar Trials ── */}
      {conditions?.conditions && conditions.conditions.length > 0 && (
        <SimilarTrials
          conditions={conditions.conditions}
          phases={design?.phases ?? []}
          currentNctId={id.nctId}
        />
      )}

      {/* ── Footer: link to full page + close ── */}
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
