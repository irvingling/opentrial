import TrialPitch from "@/components/TrialPitch";
import MechanismOfAction from "@/components/MechanismOfAction";
import SimilarTrials from "@/components/SimilarTrials";
import { notFound } from "next/navigation";
import {
  fetchTrial,
  formatPhase,
  formatStatus,
  getStatusColor,
} from "@/lib/clinicaltrials";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ nctId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nctId } = await params;
  try {
    const trial = await fetchTrial(nctId);
    const title = trial.protocolSection.identificationModule.briefTitle;
    const description = trial.protocolSection.descriptionModule?.briefSummary;
    return {
      title:       `${title} | OpenTrial`,
      description: description?.slice(0, 160),
    };
  } catch {
    return { title: `${nctId} | OpenTrial` };
  }
}

export default async function TrialPage({ params }: Props) {
  const { nctId } = await params;

  let trial;
  try {
    trial = await fetchTrial(nctId);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("404")) {
      notFound();
    }
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">
          Failed to load trial
        </h1>
        <p className="text-gray-600 mb-4">
          Could not retrieve data for{" "}
          <span className="font-mono">{nctId}</span>.
        </p>
        <a
          href="/"
          className="mt-6 inline-block px-4 py-2 bg-gray-900 text-white
                     rounded-lg text-sm hover:bg-gray-700"
        >
          ← Back to search
        </a>
      </div>
    );
  }

  const { protocolSection } = trial;
  const id         = protocolSection.identificationModule;
  const status     = protocolSection.statusModule;
  const sponsor    = protocolSection.sponsorCollaboratorsModule;
  const conditions = protocolSection.conditionsModule;
  const design     = protocolSection.designModule;
  const arms       = protocolSection.armsInterventionsModule;
  const locations  = protocolSection.contactsLocationsModule;

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
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Back */}
      <a
        href="/"
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors
                   flex items-center gap-1"
      >
        ← Back to search
      </a>

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
          <span className="px-3 py-1 rounded-full text-xs font-mono
                           text-gray-400 bg-gray-100">
            {id.nctId}
          </span>
        </div>

        <h1 className="text-xl font-bold text-gray-900 leading-tight mb-1">
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
          <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
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
                      className="p-2.5 border border-gray-100 rounded-lg
                                 bg-white"
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
                        <span className="text-xs text-green-600 font-medium">
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

      {/* ── Similar trials ── */}
      {conditions?.conditions && conditions.conditions.length > 0 && (
        <SimilarTrials
          conditions={conditions.conditions}
          phases={design?.phases ?? []}
          currentNctId={id.nctId}
        />
      )}

      {/* ── Footer ── */}
      <section className="pt-4 border-t flex items-center justify-between">
        <a
          href={`https://clinicaltrials.gov/study/${id.nctId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900
                     text-white rounded-lg text-sm hover:bg-gray-700
                     transition-colors"
        >
          View on ClinicalTrials.gov ↗
        </a>
        <span className="text-xs text-gray-400">
          Updated: {status.lastUpdatePostDateStruct?.date ?? "—"}
        </span>
      </section>

    </main>
  );
}