// lib/vantage/timelineData.ts
// Static LOE and pipeline readout data.
// Keys are all lowercase to match normalised drug name lookups.
// LOE end extended to 2042 to avoid clipping long-runway assets.

export interface LoeRecord {
  loeYear: number;
  loeType: "biologic" | "small_molecule";
  loeNotes: string;
}

export interface ReadoutRecord {
  readoutYear: number;
  readoutLabel: string;
}

export const LOE_DATA: Record<string, LoeRecord> = {
  // ── Atopic Dermatitis — approved ──────────────────────────────────────────
  dupilumab:       { loeYear: 2031, loeType: "biologic",       loeNotes: "Core composition patent ~2031; biosimilar entry expected 2031–2033" },
  tralokinumab:    { loeYear: 2034, loeType: "biologic",       loeNotes: "Composition patent ~2034" },
  lebrikizumab:    { loeYear: 2035, loeType: "biologic",       loeNotes: "Composition patent ~2035" },
  nemolizumab:     { loeYear: 2036, loeType: "biologic",       loeNotes: "Composition patent ~2036" },
  upadacitinib:    { loeYear: 2033, loeType: "small_molecule", loeNotes: "Composition patent ~2033; generic entry risk post-LOE" },
  abrocitinib:     { loeYear: 2034, loeType: "small_molecule", loeNotes: "Composition patent ~2034" },
  baricitinib:     { loeYear: 2029, loeType: "small_molecule", loeNotes: "Core patent ~2029; US AD indication limited" },
  // ── Psoriasis — approved ──────────────────────────────────────────────────
  risankizumab:    { loeYear: 2031, loeType: "biologic",       loeNotes: "Composition patent ~2031; biosimilar pipeline active" },
  guselkumab:      { loeYear: 2030, loeType: "biologic",       loeNotes: "Composition patent ~2030" },
  tildrakizumab:   { loeYear: 2028, loeType: "biologic",       loeNotes: "Composition patent ~2028" },
  bimekizumab:     { loeYear: 2036, loeType: "biologic",       loeNotes: "Composition patent ~2036" },
  secukinumab:     { loeYear: 2027, loeType: "biologic",       loeNotes: "Composition patent ~2027; biosimilar entry underway" },
  ixekizumab:      { loeYear: 2029, loeType: "biologic",       loeNotes: "Composition patent ~2029" },
  brodalumab:      { loeYear: 2028, loeType: "biologic",       loeNotes: "Composition patent ~2028" },
  deucravacitinib: { loeYear: 2038, loeType: "small_molecule", loeNotes: "Composition patent ~2038; long runway" },
  apremilast:      { loeYear: 2026, loeType: "small_molecule", loeNotes: "Generic entry 2026 per Otezla settlement" },
  ustekinumab:     { loeYear: 2023, loeType: "biologic",       loeNotes: "Biosimilars launched 2023; significant erosion underway" },
  icotrokinra:     { loeYear: 2041, loeType: "small_molecule", loeNotes: "Approved 2026; composition patent ~2041+" },
};

export const READOUT_DATA: Record<string, ReadoutRecord> = {
  // ── AtD pipeline ──────────────────────────────────────────────────────────
  amlitelimab:    { readoutYear: 2026, readoutLabel: "COAST Ph3 / SHORE Ph3 full data" },
  tilrekimig:     { readoutYear: 2027, readoutLabel: "Ph3 initiation / interim readout" },
  ompekimig:      { readoutYear: 2027, readoutLabel: "Ph2 full data" },
  galvokimig:     { readoutYear: 2027, readoutLabel: "Ph2b dose-ranging readout" },
  zumilokibart:   { readoutYear: 2026, readoutLabel: "APEX Part B readout" },
  afimkibart:     { readoutYear: 2027, readoutLabel: "Ph2 primary completion" },
  apg279:         { readoutYear: 2026, readoutLabel: "Ph1b vs dupilumab readout" },
  soquelitinib:   { readoutYear: 2027, readoutLabel: "SIERRA1 Ph2 primary completion" },
  // ── Psoriasis pipeline ────────────────────────────────────────────────────
  zasocitinib:    { readoutYear: 2026, readoutLabel: "LATITUDE Ph3 full publication" },
  envudeucitinib: { readoutYear: 2026, readoutLabel: "ONWARD Ph3 full data" },
  "orka-001":     { readoutYear: 2028, readoutLabel: "Ph3 initiation / interim readout" },
};
