// ── All recognized country names ──────────────────────────────────────────────
export const ALL_COUNTRIES = new Set([
  // North America
  "United States", "Canada", "Mexico",
  // Europe
  "United Kingdom", "Germany", "France", "Spain", "Italy",
  "Netherlands", "Belgium", "Sweden", "Switzerland", "Denmark",
  "Norway", "Finland", "Austria", "Poland", "Portugal",
  "Czech Republic", "Hungary", "Romania", "Greece", "Ireland",
  "Russia", "Ukraine", "Serbia", "Croatia", "Slovakia",
  "Bulgaria", "Lithuania", "Latvia", "Estonia", "Slovenia",
  "Luxembourg", "Malta", "Cyprus", "Iceland", "Albania",
  "Georgia", "Armenia", "Azerbaijan", "Belarus", "Moldova",
  "North Macedonia", "Bosnia and Herzegovina", "Montenegro",
  "Kosovo", "Andorra", "San Marino", "Liechtenstein", "Monaco",
  // Asia Pacific
  "China", "Japan", "South Korea", "Australia", "India",
  "Singapore", "Taiwan", "Hong Kong", "New Zealand", "Thailand",
  "Malaysia", "Indonesia", "Philippines", "Vietnam", "Pakistan",
  "Bangladesh", "Sri Lanka", "Nepal", "Myanmar", "Cambodia",
  "Laos", "Brunei", "Mongolia", "Maldives", "Fiji",
  "Papua New Guinea", "Samoa", "Tonga",
  // Middle East & Africa
  "Israel", "Saudi Arabia", "United Arab Emirates", "Turkey",
  "South Africa", "Egypt", "Jordan", "Lebanon", "Kuwait",
  "Qatar", "Bahrain", "Oman", "Iran", "Iraq",
  "Nigeria", "Kenya", "Morocco", "Tunisia", "Algeria",
  "Ethiopia", "Ghana", "Tanzania", "Uganda", "Rwanda",
  "Senegal", "Cameroon", "Zimbabwe",
  // Latin America
  "Brazil", "Argentina", "Colombia", "Chile", "Peru",
  "Venezuela", "Ecuador", "Bolivia", "Uruguay", "Paraguay",
  "Panama", "Costa Rica", "Guatemala", "Honduras", "El Salvador",
  "Nicaragua", "Cuba", "Dominican Republic", "Puerto Rico",
  "Trinidad and Tobago", "Jamaica",
]);

// ── Country name aliases / abbreviations ──────────────────────────────────────
export const COUNTRY_ALIASES: Record<string, string> = {
  "usa":                         "United States",
  "us":                          "United States",
  "united states of america":    "United States",
  "america":                     "United States",
  "uk":                          "United Kingdom",
  "england":                     "United Kingdom",
  "britain":                     "United Kingdom",
  "great britain":               "United Kingdom",
  "scotland":                    "United Kingdom",
  "wales":                       "United Kingdom",
  "uae":                         "United Arab Emirates",
  "emirates":                    "United Arab Emirates",
  "south korea":                 "South Korea",
  "korea":                       "South Korea",
  "republic of georgia":         "Georgia",
  "georgia europe":              "Georgia",
  "drc":                         "Democratic Republic of Congo",
  "czechia":                     "Czech Republic",
  "slovak republic":             "Slovakia",
  "bih":                         "Bosnia and Herzegovina",
  "hong kong":                   "Hong Kong",
  "north macedonia":             "North Macedonia",
  "trinidad":                    "Trinidad and Tobago",
  "tobago":                      "Trinidad and Tobago",
  "new zealand":                 "New Zealand",
  "saudi":                       "Saudi Arabia",
  "iran":                        "Iran",
  "burma":                       "Myanmar",
  "ivory coast":                 "Ivory Coast",
  "cote d'ivoire":               "Ivory Coast",
};

// ── Country → region ──────────────────────────────────────────────────────────
const COUNTRY_TO_REGION: Record<string, string> = {
  // North America
  "United States": "north-america",
  "Canada":        "north-america",
  "Mexico":        "north-america",
  // Europe (including Caucasus countries that are culturally/clinically European)
  "United Kingdom":          "europe",
  "Germany":                 "europe",
  "France":                  "europe",
  "Spain":                   "europe",
  "Italy":                   "europe",
  "Netherlands":             "europe",
  "Belgium":                 "europe",
  "Sweden":                  "europe",
  "Switzerland":             "europe",
  "Denmark":                 "europe",
  "Norway":                  "europe",
  "Finland":                 "europe",
  "Austria":                 "europe",
  "Poland":                  "europe",
  "Portugal":                "europe",
  "Czech Republic":          "europe",
  "Hungary":                 "europe",
  "Romania":                 "europe",
  "Greece":                  "europe",
  "Ireland":                 "europe",
  "Russia":                  "europe",
  "Ukraine":                 "europe",
  "Serbia":                  "europe",
  "Croatia":                 "europe",
  "Slovakia":                "europe",
  "Bulgaria":                "europe",
  "Lithuania":               "europe",
  "Latvia":                  "europe",
  "Estonia":                 "europe",
  "Slovenia":                "europe",
  "Luxembourg":              "europe",
  "Malta":                   "europe",
  "Cyprus":                  "europe",
  "Iceland":                 "europe",
  "Albania":                 "europe",
  "Georgia":                 "europe",
  "Armenia":                 "europe",
  "Azerbaijan":              "europe",
  "Belarus":                 "europe",
  "Moldova":                 "europe",
  "North Macedonia":         "europe",
  "Bosnia and Herzegovina":  "europe",
  "Montenegro":              "europe",
  "Kosovo":                  "europe",
  // Asia Pacific
  "China":         "asia-pacific",
  "Japan":         "asia-pacific",
  "South Korea":   "asia-pacific",
  "Australia":     "asia-pacific",
  "India":         "asia-pacific",
  "Singapore":     "asia-pacific",
  "Taiwan":        "asia-pacific",
  "Hong Kong":     "asia-pacific",
  "New Zealand":   "asia-pacific",
  "Thailand":      "asia-pacific",
  "Malaysia":      "asia-pacific",
  "Indonesia":     "asia-pacific",
  "Philippines":   "asia-pacific",
  "Vietnam":       "asia-pacific",
  "Pakistan":      "asia-pacific",
  "Bangladesh":    "asia-pacific",
  "Sri Lanka":     "asia-pacific",
  "Nepal":         "asia-pacific",
  "Myanmar":       "asia-pacific",
  "Cambodia":      "asia-pacific",
  // Middle East & Africa
  "Israel":               "middle-east-africa",
  "Saudi Arabia":         "middle-east-africa",
  "United Arab Emirates": "middle-east-africa",
  "Turkey":               "middle-east-africa",
  "South Africa":         "middle-east-africa",
  "Egypt":                "middle-east-africa",
  "Jordan":               "middle-east-africa",
  "Lebanon":              "middle-east-africa",
  "Kuwait":               "middle-east-africa",
  "Qatar":                "middle-east-africa",
  "Bahrain":              "middle-east-africa",
  "Oman":                 "middle-east-africa",
  "Iran":                 "middle-east-africa",
  "Nigeria":              "middle-east-africa",
  "Kenya":                "middle-east-africa",
  "Morocco":              "middle-east-africa",
  "Tunisia":              "middle-east-africa",
  "Algeria":              "middle-east-africa",
  "Ghana":                "middle-east-africa",
  "Tanzania":             "middle-east-africa",
  // Latin America
  "Brazil":             "latin-america",
  "Argentina":          "latin-america",
  "Colombia":           "latin-america",
  "Chile":              "latin-america",
  "Peru":               "latin-america",
  "Venezuela":          "latin-america",
  "Ecuador":            "latin-america",
  "Bolivia":            "latin-america",
  "Uruguay":            "latin-america",
  "Paraguay":           "latin-america",
  "Panama":             "latin-america",
  "Costa Rica":         "latin-america",
  "Guatemala":          "latin-america",
  "Honduras":           "latin-america",
  "El Salvador":        "latin-america",
  "Nicaragua":          "latin-america",
  "Cuba":               "latin-america",
  "Dominican Republic": "latin-america",
};

// ── Neighbor countries for fallback ───────────────────────────────────────────
// Ordered by likelihood of having clinical trial sites
const COUNTRY_NEIGHBORS: Record<string, string[]> = {
  // Caucasus / Eastern Europe
  "Georgia":    ["Turkey", "Poland", "Romania", "Germany", "Ukraine", "Israel"],
  "Armenia":    ["Turkey", "Georgia", "Poland", "Romania", "Germany"],
  "Azerbaijan": ["Turkey", "Georgia", "Poland", "Romania"],
  "Belarus":    ["Poland", "Germany", "Ukraine", "Russia"],
  "Moldova":    ["Romania", "Ukraine", "Poland"],
  "Ukraine":    ["Poland", "Germany", "Czech Republic", "Romania", "Israel"],
  // Southeast Asia
  "Malaysia":    ["Singapore", "Thailand", "Australia", "South Korea"],
  "Vietnam":     ["Thailand", "Singapore", "Australia", "South Korea"],
  "Philippines": ["Australia", "Singapore", "South Korea", "Japan"],
  "Indonesia":   ["Australia", "Singapore", "Thailand"],
  "Cambodia":    ["Thailand", "Singapore", "Australia"],
  "Myanmar":     ["Thailand", "Singapore", "India"],
  "Laos":        ["Thailand", "Singapore"],
  // South Asia
  "Pakistan":    ["India"],
  "Bangladesh":  ["India"],
  "Nepal":       ["India"],
  "Sri Lanka":   ["India", "Australia"],
  // Middle East
  "Jordan":   ["Israel", "Lebanon", "Turkey"],
  "Lebanon":  ["Israel", "Jordan", "Turkey"],
  "Kuwait":   ["Saudi Arabia", "United Arab Emirates"],
  "Qatar":    ["Saudi Arabia", "United Arab Emirates"],
  "Bahrain":  ["Saudi Arabia", "United Arab Emirates"],
  "Oman":     ["Saudi Arabia", "United Arab Emirates"],
  "Iran":     ["Turkey", "Israel"],
  // Africa
  "Egypt":       ["Israel", "Turkey", "Jordan"],
  "Morocco":     ["Spain", "France"],
  "Tunisia":     ["France", "Spain", "Italy"],
  "Algeria":     ["France", "Spain"],
  "Nigeria":     ["South Africa"],
  "Kenya":       ["South Africa", "Israel"],
  "Ethiopia":    ["South Africa", "Israel"],
  "Ghana":       ["South Africa"],
  "Tanzania":    ["South Africa"],
  "Uganda":      ["South Africa", "Kenya"],
  "Rwanda":      ["South Africa"],
  // Latin America
  "Bolivia":      ["Argentina", "Brazil", "Chile", "Colombia"],
  "Paraguay":     ["Argentina", "Brazil"],
  "Ecuador":      ["Colombia", "Peru"],
  "Venezuela":    ["Colombia", "Brazil"],
  "Guatemala":    ["Mexico", "Colombia"],
  "Honduras":     ["Mexico", "Colombia"],
  "El Salvador":  ["Mexico", "Colombia"],
  "Nicaragua":    ["Mexico", "Colombia"],
  "Costa Rica":   ["Mexico", "Colombia"],
  "Cuba":         ["Mexico", "Colombia"],
  "Dominican Republic": ["Mexico", "Colombia", "Brazil"],
  // Pacific
  "New Zealand":  ["Australia"],
  "Fiji":         ["Australia", "New Zealand"],
};

// ── Extract country from free text ────────────────────────────────────────────
export function extractCountryFromText(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  // Check aliases first (they're more specific)
  for (const [alias, country] of Object.entries(COUNTRY_ALIASES)) {
    if (lower.includes(alias)) return country;
  }

  // Check full country names (longest first to avoid partial matches)
  const sortedCountries = [...ALL_COUNTRIES].sort(
    (a, b) => b.length - a.length
  );
  for (const country of sortedCountries) {
    if (lower.includes(country.toLowerCase())) return country;
  }

  return null;
}

// ── Get region for a country ──────────────────────────────────────────────────
export function getCountryRegion(country: string): string | null {
  return COUNTRY_TO_REGION[country] ?? null;
}

// ── Get neighbor countries ────────────────────────────────────────────────────
export function getNeighborCountries(country: string): string[] {
  return COUNTRY_NEIGHBORS[country] ?? [];
}

// ── Location filter result ────────────────────────────────────────────────────
export interface LocationFilterResult {
  country:         string;
  region:          string | null;
  exactCount:      number; // trials with confirmed site in country
  nearbyCountries: string[]; // neighbor countries that DO have trials
  hasExact:        boolean;
  hasNearby:       boolean;
}

// ── Apply location filter to trial IDs ───────────────────────────────────────
export function filterTrialIdsByCountry(
  trials: Array<{
    nctId: string;
    locations: Array<{ country?: string }>;
  }>,
  targetCountry: string
): {
  exactIds:  string[]; // confirmed in target country
  noDataIds: string[]; // no location data — include, flag as TBC
  nearbyIds: string[]; // in neighbor countries
  nearbyCountriesFound: string[];
} {
  const neighbors = getNeighborCountries(targetCountry);
  const exactIds:  string[] = [];
  const noDataIds: string[] = [];
  const nearbyIds: string[] = [];
  const nearbyCountriesFound = new Set<string>();

  for (const trial of trials) {
    const countries = trial.locations
      .map((l) => l.country ?? "")
      .filter(Boolean);

    if (countries.length === 0) {
      // No location data — include but flag
      noDataIds.push(trial.nctId);
    } else if (countries.includes(targetCountry)) {
      // Confirmed in target country
      exactIds.push(trial.nctId);
    } else {
      // Check neighbors
      const matchedNeighbors = countries.filter((c) => neighbors.includes(c));
      if (matchedNeighbors.length > 0) {
        nearbyIds.push(trial.nctId);
        matchedNeighbors.forEach((c) => nearbyCountriesFound.add(c));
      }
      // Trials in completely different regions are excluded silently
    }
  }

  return {
    exactIds,
    noDataIds,
    nearbyIds,
    nearbyCountriesFound: [...nearbyCountriesFound],
  };
}