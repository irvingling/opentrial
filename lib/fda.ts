// ─────────────────────────────────────────────────────────────────────────────
// lib/fda.ts
//
// Drug information from four free public sources:
//   1. openFDA     → approved drugs (full label text)
//   2. ChEMBL      → clinical-stage experimental drugs
//   3. PubChem     → broad compound coverage
//   4. Wikipedia   → plain-language summary for almost any drug
//
// No API keys. No tokens. Completely free.
// ─────────────────────────────────────────────────────────────────────────────

export interface DrugLabelInfo {
  brandName:         string | null;
  genericName:       string | null;
  // Short plain-language description (1–3 sentences) from Wikipedia
  summary:           string | null;
  mechanismOfAction: string | null;
  pharmacodynamics:  string | null;
  indications:       string | null;
  drugClass:         string | null;
  labelerName:       string | null;
  source:            "fda" | "pubchem" | "chembl" | "wikipedia";
  sourceLabel:       string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function firstItem(value: string | string[] | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0]?.trim() ?? null;
  return value.trim();
}

function cleanDrugName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\d+\s*mg.*/i, "")
    .replace(/injection|oral|tablet|capsule|solution|cream|gel/gi, "")
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Wikipedia — plain-language summary
// Returns 1–4 sentences describing what the drug is
// Works for approved drugs AND many experimental ones
// ─────────────────────────────────────────────────────────────────────────────
async function fetchFromWikipedia(
  drugName: string
): Promise<string | null> {
  // Try the exact name first, then a capitalised version
  const attempts = [
    drugName,
    drugName.charAt(0).toUpperCase() + drugName.slice(1),
  ];

  for (const name of attempts) {
    try {
      const url =
        `https://en.wikipedia.org/api/rest_v1/page/summary/` +
        encodeURIComponent(name);

      const res = await fetch(url, { next: { revalidate: 86400 } });
      if (!res.ok) continue;

      const data = await res.json();

      // Skip disambiguation pages — they're not useful
      if (data.type === "disambiguation") continue;
      if (!data.extract) continue;

      // Keep only the first 2–3 sentences so it stays concise
      const sentences = data.extract
        .replace(/\n/g, " ")
        .split(/(?<=[.!?])\s+/)
        .slice(0, 3)
        .join(" ");

      return sentences;
    } catch {
      continue;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// openFDA — full drug label for approved drugs
// ─────────────────────────────────────────────────────────────────────────────
async function fetchFromFDA(
  drugName: string
): Promise<Omit<DrugLabelInfo, "summary"> | null> {
  const searchTerms = [
    `openfda.brand_name:"${drugName}"`,
    `openfda.generic_name:"${drugName}"`,
    `openfda.substance_name:"${drugName}"`,
  ];

  for (const term of searchTerms) {
    try {
      const url =
        `https://api.fda.gov/drug/label.json` +
        `?search=${encodeURIComponent(term)}&limit=1`;

      const res = await fetch(url, { next: { revalidate: 86400 } });
      if (!res.ok) continue;

      const data   = await res.json();
      const result = data?.results?.[0];
      if (!result) continue;

      const moa = firstItem(result.mechanism_of_action);
      if (!moa) continue;

      return {
        brandName:         firstItem(result.openfda?.brand_name),
        genericName:       firstItem(result.openfda?.generic_name),
        mechanismOfAction: moa,
        pharmacodynamics:  firstItem(result.pharmacodynamics),
        indications:       firstItem(result.indications_and_usage),
        drugClass:         firstItem(result.openfda?.pharm_class_epc),
        labelerName:       firstItem(result.openfda?.manufacturer_name),
        source:            "fda",
        sourceLabel:       "FDA Drug Label (openFDA.gov)",
      };
    } catch {
      continue;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ChEMBL — clinical-stage drugs (Phase 1–3)
// ─────────────────────────────────────────────────────────────────────────────
async function fetchFromChEMBL(
  drugName: string
): Promise<Omit<DrugLabelInfo, "summary"> | null> {
  try {
    const searchUrl =
      `https://www.ebi.ac.uk/chembl/api/data/molecule` +
      `?pref_name__iexact=${encodeURIComponent(drugName.toUpperCase())}` +
      `&format=json&limit=1`;

    const searchRes = await fetch(searchUrl, { next: { revalidate: 86400 } });
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const molecule   = searchData?.molecules?.[0];
    if (!molecule) return null;

    const chemblId = molecule.molecule_chembl_id;
    if (!chemblId) return null;

    const mechUrl =
      `https://www.ebi.ac.uk/chembl/api/data/mechanism` +
      `?molecule_chembl_id=${chemblId}&format=json&limit=5`;

    const mechRes = await fetch(mechUrl, { next: { revalidate: 86400 } });

    let mechanismOfAction: string | null = null;
    let drugClass:         string | null = null;

    if (mechRes.ok) {
      const mechData   = await mechRes.json();
      const mechanisms: any[] = mechData?.mechanisms ?? [];

      if (mechanisms.length > 0) {
        const parts = mechanisms.map((m: any) => {
          const target = m.target_name ?? "unknown target";
          const action =
            (m.action_type ?? "MODULATOR").charAt(0).toUpperCase() +
            (m.action_type ?? "modulator").slice(1).toLowerCase();
          return `${action} of ${target}`;
        });
        mechanismOfAction = parts.join("; ");
        drugClass         = mechanisms[0]?.mechanism_of_action ?? null;
      }
    }

    if (!mechanismOfAction) return null;

    return {
      brandName:         null,
      genericName:       molecule.pref_name ?? drugName,
      mechanismOfAction: mechanismOfAction,
      pharmacodynamics:  null,
      indications:       null,
      drugClass:         drugClass,
      labelerName:       null,
      source:            "chembl",
      sourceLabel:       `ChEMBL · ${chemblId} (EMBL-EBI)`,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PubChem — broad compound database
// ─────────────────────────────────────────────────────────────────────────────
async function fetchFromPubChem(
  drugName: string
): Promise<Omit<DrugLabelInfo, "summary"> | null> {
  try {
    const cidUrl =
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/` +
      `${encodeURIComponent(drugName)}/cids/JSON`;

    const cidRes = await fetch(cidUrl, { next: { revalidate: 86400 } });
    if (!cidRes.ok) return null;

    const cidData = await cidRes.json();
    const cid     = cidData?.IdentifierList?.CID?.[0];
    if (!cid) return null;

    const descUrl =
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/` +
      `${cid}/description/JSON`;

    const descRes = await fetch(descUrl, { next: { revalidate: 86400 } });
    if (!descRes.ok) return null;

    const descData     = await descRes.json();
    const descriptions: any[] = descData?.InformationList?.Information ?? [];

    let mechanismOfAction: string | null = null;
    let indications:       string | null = null;

    for (const desc of descriptions) {
      const text: string = desc.Description ?? "";
      if (
        text.toLowerCase().includes("mechanism") ||
        text.toLowerCase().includes("inhibit")   ||
        text.toLowerCase().includes("receptor")  ||
        text.toLowerCase().includes("target")    ||
        text.toLowerCase().includes("pathway")
      ) {
        mechanismOfAction = text;
        break;
      }
    }

    if (!mechanismOfAction && descriptions[1]?.Description) {
      indications = descriptions[1].Description;
    }

    if (!mechanismOfAction && !indications) return null;

    return {
      brandName:         null,
      genericName:       drugName,
      mechanismOfAction: mechanismOfAction,
      pharmacodynamics:  null,
      indications:       indications,
      drugClass:         null,
      labelerName:       null,
      source:            "pubchem",
      sourceLabel:       `PubChem CID: ${cid} (NIH)`,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// Runs all lookups in parallel — combines the best MOA data with a
// Wikipedia summary so every drug shows a plain-language description
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchDrugInfo(
  drugName: string
): Promise<DrugLabelInfo | null> {
  if (!drugName?.trim()) return null;

  const cleaned = cleanDrugName(drugName);

  // Run everything in parallel for speed
  const [
    fdaResult,
    chemblResult,
    pubchemResult,
    wikiSummary,
  ] = await Promise.allSettled([
    fetchFromFDA(cleaned),
    fetchFromChEMBL(cleaned),
    fetchFromPubChem(cleaned),
    fetchFromWikipedia(cleaned),
  ]);

  // Get the Wikipedia summary (used by all sources)
  const summary =
    wikiSummary.status === "fulfilled" ? wikiSummary.value : null;

  // Pick the best MOA source in priority order
  const base =
    (fdaResult.status    === "fulfilled" && fdaResult.value    ? fdaResult.value    : null) ??
    (chemblResult.status === "fulfilled" && chemblResult.value ? chemblResult.value : null) ??
    (pubchemResult.status === "fulfilled" && pubchemResult.value ? pubchemResult.value : null);

  if (base) {
    // Attach the Wikipedia summary to whichever database result we found
    return { ...base, summary };
  }

  // Nothing in any technical database — but Wikipedia might still have info
  if (summary) {
    return {
      brandName:         null,
      genericName:       drugName,
      summary:           summary,
      mechanismOfAction: null,
      pharmacodynamics:  null,
      indications:       null,
      drugClass:         null,
      labelerName:       null,
      source:            "wikipedia",
      sourceLabel:       "Wikipedia",
    };
  }

  return null;
}