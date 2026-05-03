// ── Generalized drug name classifier ─────────────────────────────────────────
//
// Returns true if the string looks like a real searchable drug name
// Returns false if it looks like a class, description, combination or generic term
//
// Rules based on linguistic patterns — not a hardcoded list

// Connectors that indicate a class or combination description
const CONNECTORS = [" or ", " and ", " + ", " / ", " vs ", " versus "];

// Route prefixes that indicate a drug class modifier not a drug name
const ROUTE_PREFIXES = [
  "topical ", "oral ", "inhaled ", "intravenous ", "subcutaneous ",
  "intramuscular ", "intranasal ", "transdermal ", "intrathecal ",
  "intraocular ", "ophthalmic ", "otic ", "rectal ", "vaginal ",
  "systemic ", "local ", "injectable ",
];

// Suffix words that indicate a description not a drug name
const CLASS_SUFFIXES = [
  "therapy", "treatment", "care", "medication", "agent", "drug",
  "inhibitor", "blocker", "antagonist", "agonist", "modulator",
  "regulator", "activator", "inducer", "suppressor",
];

// Words that alone indicate a non-specific term
const GENERIC_STANDALONE = [
  "placebo", "vehicle", "sham", "control", "observation",
  "watchful waiting", "emollient", "moisturizer", "sunscreen",
  "saline", "water", "observation only", "no treatment",
];

export function isRealDrugName(name: string): boolean {
  const lower = name.toLowerCase().trim();
  const words = lower.split(/\s+/);

  // 1 — Empty or too short
  if (!name || name.length < 3) return false;

  // 2 — Too many words — likely a description (real drug names are 1-3 words)
  if (words.length > 4) return false;

  // 3 — Contains connectors — "Drug A or Drug B" is a class not a drug
  if (CONNECTORS.some((c) => lower.includes(c))) return false;

  // 4 — Starts with a route prefix — "Topical X" describes class not drug
  if (ROUTE_PREFIXES.some((p) => lower.startsWith(p))) return false;

  // 5 — Ends with a class suffix — "JAK inhibitor" is a class
  if (CLASS_SUFFIXES.some((s) => lower.endsWith(s))) return false;

  // 6 — Is a generic standalone term
  if (GENERIC_STANDALONE.some((s) => lower === s || lower.startsWith(s + " "))) {
    return false;
  }

  // 7 — Contains parenthetical class descriptions
  // e.g. "Ruxolitinib (JAK inhibitor)" — actually still a real drug
  // but "JAK inhibitor (investigational)" is not
  if (/^\w+ (inhibitor|blocker|agonist)/i.test(name)) return false;

  // 8 — All lowercase multi-word = likely a class description
  // Real drug names are usually capitalized (Amlitelimab, not "amlitelimab cream")
  if (words.length > 1 && lower === name) return false;

  // 9 — Compound code pattern — always a real drug e.g. JNJ-2113, TAK-279
  if (/^[A-Z]{2,}-?\d{3,}/i.test(name.trim())) return true;

  // 10 — Passes all checks — treat as real drug name
  return true;
}