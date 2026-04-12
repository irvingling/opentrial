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
    const description =
      trial.protocolSection.descriptionModule?.briefSummary;
    return {
      title: `${title} | OpenTrial`,
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
        <p className="text-sm text-gray-400">
          {err instanceof Error ? err.message : "Unknown error"}
        </p>
        <a
          href="/trials"
          className="mt-6 inline-block px-4 py-2 bg-blue-600 text-white
                     rounded hover:bg-blue-700"
        >
          ← Back to search
        </a>
      </div>
    );
  }

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
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">

      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 flex items-center gap-1">
        <a href="/trials" className="hover:text-blue-600 hover:underline">
          Trials
        </a>
        <span>/</span>
        <span className="font-mono">{id.nctId}</span>
      </nav>

      {/* Header */}
      <section>
        <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
          {id.briefTitle}
        </h1>
        {id.officialTitle && id.officialTitle !== id.briefTitle && (
          <p className="text-sm text-gray-500 mb-3 italic">
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

      {/* Key Facts */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4
                          bg-gray-50 rounded-xl border">
        {[
          { label: "NCT ID",   value: id.nctId },
          { label: "Sponsor",  value: sponsor.leadSponsor.name },
          { label: "Start",    value: status.startDateStruct?.date ?? "—" },
          {
            label: "Enrollment",
            value: design?.enrollmentInfo?.count?.toLocaleString() ?? "—",
          },
          {
            label: "Primary Completion",
            value: status.primaryCompletionDateStruct?.date ?? "—",
          },
          {
            label: "Study Completion",
            value: status.completionDateStruct?.date ?? "—",
          },
          {
            label: "Allocation",
            value: design?.designInfo?.allocation ?? "—",
          },
          {
            label: "Primary Purpose",
            value: design?.designInfo?.primaryPurpose ?? "—",
          },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">
              {label}
            </p>
            <p className="font-medium text-gray-800 text-sm">{value}</p>
          </div>
        ))}
      </section>

      {/* Summary */}
      {desc?.briefSummary && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Summary</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
            {desc.briefSummary}
          </p>
        </section>
      )}

      {/* Conditions */}
      {conditions?.conditions && conditions.conditions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Conditions</h2>
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

      {/* Eligibility */}
      {eligibility && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Eligibility</h2>
          <div className="flex flex-wrap gap-6 mb-4 text-sm">
            {eligibility.sex && (
              <div>
                <span className="text-gray-400 uppercase text-xs">Sex </span>
                <span className="capitalize">
                  {eligibility.sex.toLowerCase()}
                </span>
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
                            whitespace-pre-wrap leading-relaxed font-mono border">
              {eligibility.eligibilityCriteria}
            </div>
          )}
        </section>
      )}

      {/* Interventions */}
      {arms?.interventions && arms.interventions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Interventions ({arms.interventions.length})
          </h2>
          <div className="space-y-3">
            {arms.interventions.map((inv, i) => (
              <div key={i} className="p-4 border rounded-lg bg-white">
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
                {inv.otherNames && inv.otherNames.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Also known as: {inv.otherNames.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Primary Outcomes */}
      {outcomes?.primaryOutcomes && outcomes.primaryOutcomes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Primary Outcomes</h2>
          <div className="space-y-3">
            {outcomes.primaryOutcomes.map((o, i) => (
              <div key={i} className="p-4 border rounded-lg bg-white">
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

      {/* Locations */}
      {locations?.locations && locations.locations.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Locations ({locations.locations.length})
          </h2>
          <div className="grid sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
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

      {/* External Link */}
      <section className="pt-4 border-t">
        <a
          href={`https://clinicaltrials.gov/study/${id.nctId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600
                     text-white rounded-lg text-sm hover:bg-blue-700
                     transition-colors"
        >
          View on ClinicalTrials.gov ↗
        </a>
      </section>

    </main>
  );
}