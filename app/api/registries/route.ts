import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url   = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";

  if (!query) {
    return NextResponse.json({ error: "No query" }, { status: 400 });
  }

  const encoded = encodeURIComponent(query);

  return NextResponse.json({
    trials: [],
    registries: [
      {
        name:        "EU Clinical Trials Register",
        shortName:   "EU CTR",
        description: "European Phase 1–3 trials including EMA-regulated studies",
        url:         `https://www.clinicaltrialsregister.eu/ctr-search/search?query=${encoded}`,
        flag:        "🇪🇺",
        coverage:    "Europe",
      },
      {
        name:        "ANZCTR",
        shortName:   "ANZCTR",
        description: "Australia & New Zealand clinical trials registry",
        url:         `https://www.anzctr.org.au/TrialSearch.aspx#&&searchTxt=${encoded}`,
        flag:        "🇦🇺",
        coverage:    "Australia · New Zealand",
      },
      {
        name:        "ISRCTN Registry",
        shortName:   "ISRCTN",
        description: "UK and international trials, strong Phase 1 coverage",
        url:         `https://www.isrctn.com/search?q=${encoded}`,
        flag:        "🇬🇧",
        coverage:    "UK · International",
      },
      {
        name:        "Japan Registry (jRCT)",
        shortName:   "jRCT",
        description: "Japanese clinical trials including early phase studies",
        url:         `https://jrct.niph.go.jp/en-latest-search?name=${encoded}`,
        flag:        "🇯🇵",
        coverage:    "Japan",
      },
      {
        name:        "WHO ICTRP",
        shortName:   "WHO ICTRP",
        description: "Aggregates 17+ global registries in one search",
        url:         `https://trialsearch.who.int/Trial2.aspx?TrialID=&utn=&title=&intervention=&condition=${encoded}&country=&phase=&recruitingstatus=&age=&gender=&datesearch=&records=10&searchtype=terms&Submit=Search`,
        flag:        "🌐",
        coverage:    "Global · 17+ registries",
      },
    ],
  });
}