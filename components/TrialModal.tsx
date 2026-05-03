"use client";

import { useEffect, useState } from "react";
import type { ClinicalTrial } from "@/types/trial";
import MechanismOfAction from "@/components/MechanismOfAction";
import TrialPitch from "@/components/TrialPitch";
import TrialProgress from "@/components/TrialProgress";
import ReferralSummary from "@/components/ReferralSummary";

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

// ── Collapsible section ───────────────────────────────────────────────────────
function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title:        string;
  icon:         string;
  children:     React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5
                   bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="font-semibold text-gray-900 text-sm">{title}</span>
        </div>
        <span className="text-gray-400 text-xs">
          {open ? "▲ Hide" : "▼ Show"}
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-2 border-t border-gray-100 bg-white">
          {children}
        </div>
      )}
    </div>
  );
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
        if (!res.ok) throw new Error(`Failed (${res.status})`);
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
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-0 overflow-y-auto py-6 px-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl mx-auto bg-white
                     rounded-2xl shadow-2xl"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between
                          px-6 py-4 bg-white border-b border-gray-100
                          rounded-t-2xl">
            <span className="text-xs font-mono text-gray-400">{nctId}</span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200
                         transition-colors flex items-center justify-center
                         text-gray-500 text-sm"
            >
              ✕
            </button>
          </div>

          <div className="px-6 py-6">
            {loading && (
              <div className="flex flex-col items-center py-16 gap-3">
                <div className="w-8 h-8 border-2 border-gray-900
                                border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Loading trial…</p>
              </div>
            )}
            {error && (
              <div className="py-16 text-center">
                <p className="text-red-500 font-medium mb-1">
                  Could not load trial
                </p>
                <p className="text-gray-400 text-sm">{error}</p>
              </div>
            )}
            {trial && (
              <TrialContent trial={trial} onClose={onClose} />
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
  const [pitchData, setPitchData]         = useState<any>(null);
  const [showPrint, setShowPrint]         = useState(false);
  const [globalData, setGlobalData]       = useState<any>(null);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [copied, setCopied]               = useState(false);

  const { protocolSection } = trial;
  const id         = protocolSection.identificationModule;
  const status     = protocolSection.statusModule;
  const sponsor    = protocolSection.sponsorCollaboratorsModule;
  const conditions = protocolSection.conditionsModule;
  const design     = protocolSection.designModule;
  const arms       = protocolSection.armsInterventionsModule;
  const locations  = protocolSection.contactsLocationsModule;

  useEffect(() => {
    fetch(`/api/trials/${id.nctId}/pitch`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setPitchData(d); })
      .catch(() => {});
  }, [id.nctId]);

  useEffect(() => {
    const condition = conditions?.conditions?.[0] ?? "";
    if (!condition) return;
    setLoadingGlobal(true);
    fetch(`/api/registries?q=${encodeURIComponent(condition)}`)
      .then((r) => r.json())
      .then((d) => setGlobalData(d))
      .catch(() => {})
      .finally(() => setLoadingGlobal(false));
  }, [id.nctId]);

  const centralContacts = locations?.centralContacts ?? [];
  const siteContacts    = (locations?.locations ?? [])
    .filter((l) => l.status === "RECRUITING")
    .flatMap((l) => l.contacts ?? [])
    .slice(0, 3);
  const allContacts = [...centralContacts, ...siteContacts];

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

  function handlePrint() {
    setShowPrint(true);
    setTimeout(() => window.print(), 300);
    setTimeout(() => setShowPrint(false), 1000);
  }

  function copyToClipboard() {
    const text = [
      `Trial: ${id.briefTitle}`,
      `NCT ID: ${id.nctId}`,
      `Status: ${formatStatus(status.overallStatus)}`,
      `Sponsor: ${sponsor.leadSponsor.name}`,
      `Link: https://clinicaltrials.gov/study/${id.nctId}`,
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      {showPrint && pitchData && (
        <div className="hidden print:block">
          <ReferralSummary
            nctId={id.nctId}
            title={id.briefTitle}
            phase={design?.phases?.map((p) => PHASE_LABELS[p] ?? p).join(", ") ?? ""}
            status={formatStatus(status.overallStatus)}
            sponsor={sponsor.leadSponsor.name}
            mechanism={arms?.interventions?.[0]?.name ?? ""}
            oneLiner={pitchData.oneLiner ?? ""}
            bullCase={pitchData.bullCase ?? []}
            eligibility={pitchData.eligibility ?? { qualifies: [], excluded: [] }}
            patientTalkingPoints={pitchData.patientTalkingPoints ?? ""}
            contacts={allContacts}
            sites={locations?.locations ?? []}
            generatedDate={new Date().toLocaleDateString("en-US", {
              year: "numeric", month: "long", day: "numeric",
            })}
          />
        </div>
      )}

      <div className="space-y-5 print:hidden">

        {/* Header */}
        <section>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium
                              border ${getStatusColor(status.overallStatus)}`}>
              {formatStatus(status.overallStatus)}
            </span>
            {design?.phases?.map((p) => (
              <span key={p}
                className="px-3 py-1 rounded-full text-xs font-medium
                           bg-indigo-50 text-indigo-700 border border-indigo-200">
                {formatPhase(p)}
              </span>
            ))}
            <span className="px-3 py-1 rounded-full text-xs font-mono
                             text-gray-400 bg-gray-100">
              {id.nctId}
            </span>
          </div>

          <h1 className="text-lg font-bold text-gray-900 leading-tight mb-1">
            {id.briefTitle}
          </h1>
          <p className="text-sm text-gray-400 mb-3">
            {sponsor.leadSponsor.name}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900
                         text-white text-xs font-medium rounded-lg
                         hover:bg-gray-700 transition-colors"
            >
              🖨 Print referral
            </button>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white
                         border border-gray-200 text-gray-600 text-xs
                         font-medium rounded-lg hover:bg-gray-50
                         transition-colors"
            >
              {copied ? "✅ Copied!" : "📋 Copy info"}
            </button>
            <a
              href={`https://clinicaltrials.gov/study/${id.nctId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white
                         border border-gray-200 text-gray-600 text-xs
                         font-medium rounded-lg hover:bg-gray-50
                         transition-colors"
            >
              ↗ ClinicalTrials.gov
            </a>
          </div>
        </section>

        {/* Quick stats */}
        <section className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Enrollment",
              value: design?.enrollmentInfo?.count?.toLocaleString() ?? "—",
            },
            {
              label: "Start",
              value: status.startDateStruct?.date ?? "—",
            },
            {
              label: "Est. Completion",
              value: status.primaryCompletionDateStruct?.date ?? "—",
            },
          ].map(({ label, value }) => (
            <div key={label}
              className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="font-semibold text-gray-900 text-sm">{value}</p>
            </div>
          ))}
        </section>

        {/* Trial progress */}
        <TrialProgress
          startDate={status.startDateStruct?.date}
          completionDate={
            status.primaryCompletionDateStruct?.date ??
            status.completionDateStruct?.date
          }
          enrollmentTarget={design?.enrollmentInfo?.count}
          locationCount={locationCount}
          status={status.overallStatus}
        />

        {/* Contacts */}
        {allContacts.length > 0 ? (
          <section>
            <h2 className="font-semibold text-gray-900 text-sm mb-3">
              Trial Contacts
            </h2>
            <div className="space-y-2">
              {allContacts.slice(0, 3).map((contact, i) => (
                <div key={i}
                  className="flex items-center justify-between p-3
                             bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200
                                    flex items-center justify-center
                                    text-xs font-medium text-gray-600
                                    flex-shrink-0">
                      {contact.name?.charAt(0) ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {contact.name ?? "Trial Coordinator"}
                      </p>
                      {contact.role && (
                        <p className="text-xs text-gray-400">{contact.role}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}?subject=Inquiry about ${id.nctId}&body=Dear ${contact.name ?? "Trial Coordinator"},%0A%0AI am writing to inquire about patient eligibility for trial ${id.nctId}: ${id.briefTitle}.%0A%0APlease let me know how to proceed.%0A%0AThank you.`}
                        className="flex items-center gap-1 px-3 py-1.5
                                   bg-blue-600 text-white text-xs font-medium
                                   rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        ✉ Email
                      </a>
                    )}
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-1 px-3 py-1.5
                                   bg-white border border-gray-200 text-gray-600
                                   text-xs font-medium rounded-lg
                                   hover:bg-gray-50 transition-colors"
                      >
                        📞 Call
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section>
            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl
                            flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Contact trial site
                </p>
                <p className="text-xs text-gray-400">
                  No direct contact listed
                </p>
              </div>
              <a
                href={`https://clinicaltrials.gov/study/${id.nctId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-gray-900 text-white text-xs
                           font-medium rounded-lg hover:bg-gray-700
                           transition-colors whitespace-nowrap"
              >
                View contacts ↗
              </a>
            </div>
          </section>
        )}

        {/* Pitch — always open */}
        <TrialPitch nctId={id.nctId} />

        {/* Drug / MOA — collapsed */}
        {arms?.interventions && arms.interventions.length > 0 && (
          <CollapsibleSection title="The Drug" icon="💊">
            <MechanismOfAction
              interventions={arms.interventions.map((i: any) => ({
                name: i.name,
                type: i.type,
              }))}
            />
          </CollapsibleSection>
        )}

        {/* Sites — collapsed */}
        {locationCount > 0 && (
          <CollapsibleSection
            title={`Sites (${locationCount})`}
            icon="📍"
          >
            <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
              {Object.entries(locationsByCountry).map(([country, locs]) => (
                <div key={country}>
                  <p className="text-xs font-medium text-gray-400 uppercase
                                 tracking-wide mb-1.5">
                    {country}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-1.5">
                    {(locs ?? []).map((loc, i) => (
                      <div key={i}
                        className="p-2.5 border border-gray-100 rounded-lg
                                   bg-gray-50">
                        {loc.facility && (
                          <p className="font-medium text-gray-800 text-xs">
                            {loc.facility}
                          </p>
                        )}
                        <p className="text-gray-400 text-xs">
                          {[loc.city, loc.state, loc.country]
                            .filter(Boolean).join(", ")}
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
          </CollapsibleSection>
        )}

        {/* Global registries — collapsed */}
        <CollapsibleSection
          title="Search global registries"
          icon="🌍"
        >
          {loadingGlobal ? (
            <div className="flex items-center gap-2 py-3">
              <div className="w-4 h-4 border-2 border-gray-300
                              border-t-gray-600 rounded-full animate-spin" />
              <p className="text-xs text-gray-400">Loading…</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">
                Phase 1 trials may only appear in these registries
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(globalData?.registries ?? []).map((reg: any) => (
                  <a
                    key={reg.shortName}
                    href={reg.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 bg-gray-50
                               border border-gray-100 rounded-xl
                               hover:bg-white hover:border-gray-200
                               hover:shadow-sm transition-all group"
                  >
                    <span className="text-xl flex-shrink-0">{reg.flag}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-xs font-semibold text-gray-800">
                          {reg.shortName}
                        </p>
                        <span className="text-gray-300
                                         group-hover:text-blue-400
                                         transition-colors text-xs">
                          ↗
                        </span>
                      </div>
                      <p className="text-xs text-blue-500">{reg.coverage}</p>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}
        </CollapsibleSection>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4
                        border-t border-gray-100">
          <button
            onClick={handlePrint}
            className="text-sm text-gray-500 hover:text-gray-700
                       transition-colors"
          >
            🖨 Print referral summary
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 border border-gray-200
                       rounded-lg hover:bg-gray-50 transition-colors"
          >
            ✕ Close
          </button>
        </div>

      </div>
    </>
  );
}