import { ClinicalTrial, SearchResponse } from "@/types/trial";

const BASE_URL = "https://clinicaltrials.gov/api/v2";

export class ClinicalTrialsAPIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "ClinicalTrialsAPIError";
  }
}

export async function fetchTrial(nctId: string): Promise<ClinicalTrial> {
  const id = nctId.trim().toUpperCase();

  if (!/^NCT\d{8}$/.test(id)) {
    throw new ClinicalTrialsAPIError(
      `Invalid NCT ID format: "${nctId}". Expected format: NCT########`
    );
  }

  const url = `${BASE_URL}/studies/${id}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
  } catch (networkError) {
    throw new ClinicalTrialsAPIError(
      `Network error while fetching trial ${id}: ${String(networkError)}`
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new ClinicalTrialsAPIError(
      `ClinicalTrials API returned ${response.status} for ${id}: ${body}`,
      response.status
    );
  }

  const data: ClinicalTrial = await response.json();
  return data;
}

export async function searchTrials(
  query: string,
  options: {
    pageSize?: number;
    pageToken?: string;
    status?: string[];
    phase?: string[];
    condition?: string;
    intervention?: string;
  } = {}
): Promise<SearchResponse> {
  const {
    pageSize = 10,
    pageToken,
    status,
    phase,
    condition,
    intervention,
  } = options;

  const params = new URLSearchParams();
  if (query) params.set("query.term", query);
  if (condition) params.set("query.cond", condition);
  if (intervention) params.set("query.intr", intervention);
  params.set("pageSize", String(Math.min(pageSize, 100)));
  if (pageToken) params.set("pageToken", pageToken);
  if (status?.length) params.set("filter.overallStatus", status.join(","));
  if (phase?.length) params.set("filter.phase", phase.join(","));
  params.set("format", "json");

  const url = `${BASE_URL}/studies?${params.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
  } catch (networkError) {
    throw new ClinicalTrialsAPIError(
      `Network error during search: ${String(networkError)}`
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new ClinicalTrialsAPIError(
      `Search failed (${response.status}): ${body}`,
      response.status
    );
  }

  const data: SearchResponse = await response.json();
  return data;
}

export const PHASE_LABELS: Record<string, string> = {
  EARLY_PHASE1: "Early Phase 1",
  PHASE1: "Phase 1",
  PHASE2: "Phase 2",
  PHASE3: "Phase 3",
  PHASE4: "Phase 4",
  NA: "N/A",
};

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE_NOT_RECRUITING: "Active, Not Recruiting",
  COMPLETED: "Completed",
  ENROLLING_BY_INVITATION: "Enrolling by Invitation",
  NOT_YET_RECRUITING: "Not Yet Recruiting",
  RECRUITING: "Recruiting",
  SUSPENDED: "Suspended",
  TERMINATED: "Terminated",
  WITHDRAWN: "Withdrawn",
  UNKNOWN: "Unknown",
};

export function formatPhase(phase: string): string {
  return PHASE_LABELS[phase] ?? phase;
}

export function formatStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function getStatusColor(status: string): string {
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
