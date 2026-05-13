"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getSlideEvidence } from "@/lib/slideData";

import { DrugReference, ChartEntry, ViewMode, ChartView, TcsMode, MainTab } from "@/lib/vantage/types";
import { getColor } from "@/lib/vantage/colors";
import { drugRefToEntry, drugRefToTcsEntry } from "@/lib/vantage/chartHelpers";
import { BarSection, ComparisonGrouped } from "@/components/vantage/BarChart";
import { FishboneTimeline } from "@/components/vantage/FishboneTimeline";
import { AskVantage } from "@/components/vantage/AskVantage";

const SESSION_KEY = "vantage_prefetch";

function norm(v: string) { return v.toLowerCase().trim(); }

const TCS_STUDY_LABELS: Record<string, string> = {
  dupilumab: "CHRONOS", tralokinumab: "ECZTRA 3", lebrikizumab: "ADhere",
  nemolizumab: "ARCADIA 1/2", upadacitinib: "AD Up",
  abrocitinib: "JADE COMPARE", baricitinib: "BREEZE-AD7",
};

// Read and consume the prefetch cache synchronously.
// Called once at module-init time (before first render) so state is pre-populated.
function readAndClearCache(query: string): any | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (cached.query === query && Date.now() - cached.ts < 30_000) {
      sessionStorage.removeItem(SESSION_KEY);
      return cached.data;
    }
  } catch { /* unavailable */ }
  return null;
}

// ── VantageInner ──────────────────────────────────────────────────────────────

function VantageInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const query        = searchParams.get("q") ?? "";

  // ── Key fix: initialise from cache synchronously so we never show loading ──
  // useState with an initialiser function runs once, before the first render.
  // If the search page pre-fetched and stored data, we start with it immediately.
  const [vantageData, setVantageData] = useState<any>(() => readAndClearCache(query));
  const [loading,     setLoading]     = useState(false);

  // Always scroll to top when this page mounts
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [selectedEndpoint,  setSelectedEndpoint]  = useState("");
  const [chartView,         setChartView]         = useState<ChartView>("bar");
  const [viewMode,          setViewMode]          = useState<ViewMode>("absolute");
  const [highlightOverride, setHighlightOverride] = useState<string[]>([]);
  const [tcsMode,           setTcsMode]           = useState<TcsMode>("mono");
  const [mainTab,           setMainTab]           = useState<MainTab>("efficacy");

  function applyData(d: any) {
    setVantageData(d);
    setSelectedEndpoint((prev) => {
      if (prev) return prev;
      const c = (d.condition ?? "").toLowerCase();
      if (c.includes("atopic") || c.includes("eczema")) return "EASI-75";
      if (c.includes("psoriasis")) return "PASI 90";
      return "Primary Endpoint";
    });
    if (d.comparisonDrugs?.length)       setHighlightOverride(d.comparisonDrugs);
    else if (d.highlightedDrugs?.length) setHighlightOverride(d.highlightedDrugs);
  }

  // Set endpoint/highlights from initial cache data on first render
  useEffect(() => {
    if (vantageData) applyData(vantageData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!query) return;
    // If we already have data (from cache init above), skip the fetch
    if (vantageData) return;

    // No cache — fetch fresh (direct URL load, refresh, etc.)
    setLoading(true);
    fetch("/api/vantage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    })
      .then((r) => r.json())
      .then(applyData)
      .catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const approvedDrugRefs: DrugReference[] = vantageData?.approvedDrugs   ?? [];
  const emergingDrugRefs: DrugReference[] = vantageData?.emergingDrugs   ?? [];
  const comparisonDrugs:  string[]        = vantageData?.comparisonDrugs ?? [];
  const intent:           string          = vantageData?.intent          ?? "broad";
  const condition:        string          = vantageData?.condition       ?? "";
  const ciCommentary:     string          = vantageData?.ciCommentary    ?? "";

  const rawSlide    = vantageData?.condition
    ? getSlideEvidence(vantageData.condition) ?? getSlideEvidence(query)
    : getSlideEvidence(query);
  const rawAny      = rawSlide as any;
  const approvedRaw: any[] = rawSlide?.evidence?.drugs ?? rawAny?.drugs ?? [];
  const emergingRaw: any[] = rawSlide?.emerging?.drugs ?? rawAny?.emerging ?? [];

  const isAtD        = condition.toLowerCase().includes("atopic") || condition.toLowerCase().includes("eczema");
  const isPso        = condition.toLowerCase().includes("psoriasis");
  const isComparison = intent === "comparison" && comparisonDrugs.length >= 2;

  const endpoints = isAtD
    ? ["IGA 0/1", "EASI-75", "EASI-90", "PP-NRS ≥4"]
    : isPso ? ["PASI 75", "PASI 90", "PASI 100", "IGA 0/1"]
    : ["Primary Endpoint"];

  // ── Chart entries ──────────────────────────────────────────────────────────
  const allApproved: ChartEntry[] = tcsMode === "tcs"
    ? approvedDrugRefs.map((d) => drugRefToTcsEntry(d, approvedRaw, emergingRaw, selectedEndpoint))
        .filter((e): e is ChartEntry => e !== null)
    : approvedDrugRefs.map((d) => drugRefToEntry(d, selectedEndpoint))
        .filter((e) => e.treatment !== null);

  const allEmerging: ChartEntry[] = tcsMode === "tcs"
    ? emergingDrugRefs.map((d) => drugRefToTcsEntry(d, approvedRaw, emergingRaw, selectedEndpoint))
        .filter((e): e is ChartEntry => e !== null)
    : emergingDrugRefs.map((d) => drugRefToEntry(d, selectedEndpoint))
        .filter((e) => e.treatment !== null || e.notDisclosed);

  // Comparison split
  const comparisonEntries: ChartEntry[] = isComparison
    ? comparisonDrugs
        .map((name) => {
          const n = norm(name);
          return [...allApproved, ...allEmerging].find(
            (b) => norm(b.drug).includes(n) || n.includes(norm(b.drug))
          );
        })
        .filter((b): b is ChartEntry => b != null)
    : [];

  const comparisonNames = comparisonEntries.map((e) => norm(e.drug));
  const restApproved    = isComparison ? allApproved.filter((e) => !comparisonNames.includes(norm(e.drug))) : allApproved;
  const restEmerging    = isComparison ? allEmerging.filter((e) => !comparisonNames.includes(norm(e.drug))) : allEmerging;
  const effectiveViewMode: ViewMode = tcsMode === "tcs" ? "adjusted" : viewMode;

  const tcsStudiesShown = allApproved
    .map((e) => TCS_STUDY_LABELS[e.drug.toLowerCase()])
    .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ");

  const lineData = () => [0, 4, 8, 12, 16, 24, 52].map((w) => {
    const pt: Record<string, any> = { week: w };
    approvedRaw.forEach((d: any) => {
      const tp = d.trials?.[0]?.timepoints?.find((t: any) => t.week === w);
      if (tp) pt[d.name] = tp.value;
    });
    return pt;
  });

  if (!query) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f7f5" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#6b7280", fontSize: 14 }}>No query provided.</p>
        <button onClick={() => router.push("/")}
          style={{ marginTop: 12, color: "#2563eb", fontSize: 13, background: "none", border: "none", cursor: "pointer" }}>
          ← Back to search
        </button>
      </div>
    </div>
  );

  // ── UI helpers ─────────────────────────────────────────────────────────────

  function TabBtn({ id, label }: { id: MainTab; label: string }) {
    return (
      <button onClick={() => setMainTab(id)} style={{
        fontSize: 13, padding: "8px 18px", background: "none", border: "none",
        fontWeight: mainTab === id ? 700 : 400,
        color: mainTab === id ? "#111827" : "#9ca3af",
        borderBottom: mainTab === id ? "2px solid #111827" : "2px solid transparent",
        marginBottom: -2, cursor: "pointer", transition: "all 0.15s",
      }}>{label}</button>
    );
  }

  function EndpointPill({ ep }: { ep: string }) {
    const active = selectedEndpoint === ep;
    return (
      <button onClick={() => setSelectedEndpoint(ep)} style={{
        fontSize: 12, padding: "4px 12px", borderRadius: 9999, cursor: "pointer",
        background: active ? "#111827" : "white", color: active ? "white" : "#6b7280",
        border: `1px solid ${active ? "#111827" : "#e5e7eb"}`,
        fontWeight: active ? 600 : 400, transition: "all 0.15s",
      }}>{ep}</button>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#f7f7f5", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Nav */}
      <nav style={{
        background: "white", borderBottom: "1px solid #e5e7eb",
        padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button onClick={() => router.push("/")}
          style={{ fontSize: 13, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}>
          ← OpenTrial
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Vantage</span>
        {mainTab === "efficacy" && (
          <div style={{ display: "flex", gap: 8 }}>
            {(["bar", "line"] as ChartView[]).map((v) => (
              <button key={v} onClick={() => setChartView(v)} style={{
                fontSize: 12, padding: "4px 12px", borderRadius: 6, cursor: "pointer",
                background: chartView === v ? "#111827" : "transparent",
                color: chartView === v ? "white" : "#6b7280",
                border: chartView === v ? "none" : "1px solid #e5e7eb",
              }}>
                {v === "bar" ? "Bar" : "Over time"}
              </button>
            ))}
          </div>
        )}
        {mainTab === "timeline" && <div style={{ width: 80 }} />}
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px" }}>

        {/* Query + badges */}
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <p style={{ fontSize: 18, fontWeight: 500, color: "#111827", margin: 0 }}>"{query}"</p>
          {condition && (
            <span style={{
              fontSize: 11, background: "#dbeafe", color: "#1d4ed8",
              border: "1px solid #bfdbfe", padding: "2px 10px", borderRadius: 9999, fontWeight: 500,
            }}>{condition}</span>
          )}
          {isComparison && (
            <span style={{
              fontSize: 11, background: "#fef3c7", color: "#92400e",
              border: "1px solid #fde68a", padding: "2px 10px", borderRadius: 9999,
            }}>⚖ Comparison</span>
          )}
        </div>

        {/* Fallback loading bar — only on direct URL / refresh, never from search page */}
        {loading && (
          <div style={{
            background: "white", border: "1px solid #e5e7eb",
            borderRadius: 12, padding: "20px 24px", marginBottom: 16,
          }}>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px" }}>Analysing landscape…</p>
            <div style={{ height: 4, background: "#f3f4f6", borderRadius: 9999, overflow: "hidden" }}>
              <div style={{
                height: "100%", background: "#111827", borderRadius: 9999,
                animation: "vantage-pulse 1.6s ease-in-out infinite",
              }} />
            </div>
            <style>{`
              @keyframes vantage-pulse {
                0%   { width: 8%;  opacity: 0.9; }
                50%  { width: 75%; opacity: 0.6; }
                100% { width: 8%;  opacity: 0.9; }
              }
            `}</style>
          </div>
        )}

        {/* All content — gated on data being ready */}
        {!loading && vantageData && (
          <>
            {/* Key Takeaways */}
            {vantageData.ciBullets?.length > 0 && (
              <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 8px" }}>Key Takeaways</p>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
                  {(vantageData.ciBullets as string[]).map((b: string, i: number) => (
                    <li key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
                      <span style={{ color: "#3b82f6", flexShrink: 0, marginTop: 2 }}>•</span>{b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tab strip */}
            <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb" }}>
              <TabBtn id="efficacy"  label="Efficacy" />
              <TabBtn id="timeline" label="LOE & Readouts" />
            </div>

            {/* Chart card */}
            <div style={{
              background: "white", border: "1px solid #e5e7eb", borderTop: "none",
              borderRadius: "0 0 12px 12px", padding: "16px 20px", marginBottom: 16,
            }}>

              {/* ── Efficacy tab ── */}
              {mainTab === "efficacy" && (
                <>
                  {isAtD && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "inline-flex", background: "#f3f4f6", borderRadius: 8, padding: 3 }}>
                        {(["mono", "tcs"] as TcsMode[]).map((mode) => (
                          <button key={mode} onClick={() => setTcsMode(mode)} style={{
                            fontSize: 12, padding: "4px 16px", borderRadius: 6, border: "none", cursor: "pointer",
                            background: tcsMode === mode ? "white" : "transparent",
                            color: tcsMode === mode ? "#111827" : "#6b7280",
                            boxShadow: tcsMode === mode ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
                            fontWeight: tcsMode === mode ? 600 : 400, transition: "all 0.15s",
                          }}>
                            {mode === "mono" ? "Monotherapy" : "With TCS"}
                          </button>
                        ))}
                      </div>
                      {tcsMode === "tcs" && (
                        <p style={{ fontSize: 11, color: "#2563eb", margin: "6px 0 0" }}>
                          Placebo-adjusted Δ from concomitant TCS trials
                          {tcsStudiesShown ? ` (${tcsStudiesShown})` : ""}
                          {" · Only drugs with published TCS data shown"}
                        </p>
                      )}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
                    {endpoints.map((ep) => <EndpointPill key={ep} ep={ep} />)}
                    {tcsMode === "mono" && (
                      <button
                        onClick={() => setViewMode((v) => v === "absolute" ? "adjusted" : "absolute")}
                        style={{
                          fontSize: 11, padding: "3px 10px", borderRadius: 9999, cursor: "pointer",
                          background: viewMode === "adjusted" ? "#eff6ff" : "white",
                          color: viewMode === "adjusted" ? "#2563eb" : "#9ca3af",
                          border: `1px solid ${viewMode === "adjusted" ? "#bfdbfe" : "#e5e7eb"}`,
                          fontWeight: viewMode === "adjusted" ? 600 : 400,
                        }}
                      >Δ Adjusted</button>
                    )}
                  </div>

                  <p style={{ fontSize: 10, color: "#d1d5db", marginBottom: 16 }}>
                    ▾ Hover over a drug name to see trial details
                  </p>

                  {chartView === "bar" ? (
                    <>
                      {isComparison && comparisonEntries.length >= 2 ? (
                        <>
                          <ComparisonGrouped
                            entries={comparisonEntries}
                            drugNames={comparisonDrugs}
                            endpoint={selectedEndpoint}
                            viewMode={effectiveViewMode}
                            commentary={ciCommentary || undefined}
                          />
                          {(restApproved.length > 0 || restEmerging.length > 0) && (
                            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 20px" }}>
                              <div style={{ flex: 1, height: 1, background: "#f3f4f6" }} />
                              <span style={{ fontSize: 11, color: "#9ca3af" }}>Landscape context</span>
                              <div style={{ flex: 1, height: 1, background: "#f3f4f6" }} />
                            </div>
                          )}
                          <BarSection title="Approved" count={restApproved.length} bars={restApproved}
                            accentColor="#3b82f6" viewMode={effectiveViewMode} dimmed />
                          <BarSection
                            title={tcsMode === "tcs" ? "Emerging — with TCS data" : "Emerging"}
                            count={restEmerging.length} bars={restEmerging}
                            accentColor="#f59e0b" viewMode={effectiveViewMode} dimmed />
                        </>
                      ) : (
                        <>
                          <BarSection title="Approved" count={allApproved.length} bars={allApproved}
                            accentColor="#3b82f6"
                            badge={vantageData?.isOralQuery ? "oral highlighted" : undefined}
                            viewMode={effectiveViewMode} />
                          <BarSection
                            title={tcsMode === "tcs" ? "Emerging — with TCS data" : "Emerging"}
                            count={allEmerging.length} bars={allEmerging}
                            accentColor="#f59e0b" viewMode={effectiveViewMode} />
                        </>
                      )}
                    </>
                  ) : (
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>Response over time — Approved</p>
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 12px" }}>Data from first pivotal trial timepoints</p>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={lineData()} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="week" tickFormatter={(v) => `Wk ${v}`} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                          <Tooltip formatter={(v) => (typeof v === "number" ? `${v}%` : String(v))} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          {approvedRaw.map((d: any) => (
                            <Line key={d.name} type="monotone" dataKey={d.name}
                              stroke={getColor(d.drugClass)} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}

              {mainTab === "timeline" && (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 2px" }}>
                      LOE & Pipeline Readout Timeline · 2026 – 2042
                    </p>
                    <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
                      Approved (above axis): estimated loss of exclusivity.
                      Pipeline (below axis): expected data readout.
                    </p>
                  </div>
                  <FishboneTimeline approvedDrugs={approvedDrugRefs} emergingDrugs={emergingDrugRefs} />
                </>
              )}
            </div>

            {/* Safety */}
            {(vantageData?.safetyBullets?.length > 0 || vantageData?.safetyCommentary) && (
              <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 8px" }}>Safety</p>
                {vantageData.safetyCommentary && (
                  <p style={{
                    fontSize: 12, color: "#374151", lineHeight: 1.6,
                    background: "#fef9ec", border: "1px solid #fde68a",
                    borderRadius: 8, padding: "8px 12px", marginBottom: 10,
                  }}>
                    {vantageData.safetyCommentary}
                  </p>
                )}
                {vantageData.safetyBullets?.length > 0 && (
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                    {(vantageData.safetyBullets as string[]).map((b: string, i: number) => (
                      <li key={i} style={{ fontSize: 12, color: "#374151", display: "flex", gap: 8, lineHeight: 1.5 }}>
                        <span style={{ color: "#ef4444", flexShrink: 0, marginTop: 2 }}>•</span>{b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {vantageData?.suggestTrialMatch && (
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <button onClick={() => router.push(`/trial?q=${encodeURIComponent(query)}`)}
                  style={{ fontSize: 13, color: "#2563eb", background: "none", border: "none", cursor: "pointer" }}>
                  Looking for trials for a specific patient? → Try Trial Match
                </button>
              </div>
            )}

            <AskVantage condition={condition || query} onFilterChange={setHighlightOverride} />
          </>
        )}
      </div>
    </div>
  );
}

export default function VantagePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#f7f7f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading…</p>
      </div>
    }>
      <VantageInner />
    </Suspense>
  );
}
