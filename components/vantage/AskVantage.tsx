// components/vantage/AskVantage.tsx
"use client";
import { useState, useRef, useCallback, useEffect } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  chartFilter?: string[];
}

export function AskVantage({
  condition,
  onFilterChange,
}: {
  condition: string;
  onFilterChange: (drugs: string[]) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const submit = useCallback(async () => {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput("");
    setMessages((p) => [...p, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res  = await fetch("/api/vantage/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, condition }),
      });
      const data = await res.json();
      setMessages((p) => [...p, { role: "assistant", text: data.text, chartFilter: data.chartFilter }]);
      if (data.chartFilter?.length) onFilterChange(data.chartFilter);
    } catch {
      setMessages((p) => [...p, { role: "assistant", text: "Could not get a response. Try again." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, condition, onFilterChange]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, background: "white", marginTop: 16 }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #f3f4f6" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>Ask Vantage</p>
        <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>
          Filter the chart or ask about the data
        </p>
      </div>

      <div style={{ maxHeight: 160, overflowY: "auto", padding: "8px 14px" }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 11, color: "#d1d5db" }}>
            Try: "Show only oral agents" · "Best option post-dupilumab?" · "Compare bimekizumab to risankizumab"
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            fontSize: 12, padding: "6px 10px", borderRadius: 8, marginBottom: 4,
            background: m.role === "user" ? "#eff6ff" : "#f9fafb",
            color:      m.role === "user" ? "#1e40af" : "#374151",
            marginLeft:  m.role === "user" ? 24 : 0,
            marginRight: m.role === "user" ? 0 : 24,
          }}>
            {m.text}
            {m.chartFilter?.length ? (
              <p style={{ fontSize: 10, color: "#6366f1", margin: "2px 0 0" }}>
                ↑ Chart updated: {m.chartFilter.join(", ")}
              </p>
            ) : null}
          </div>
        ))}
        {loading && <p style={{ fontSize: 11, color: "#d1d5db" }}>Thinking…</p>}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "8px 12px", display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ask about the landscape…"
          style={{
            flex: 1, fontSize: 13, border: "1px solid #e5e7eb",
            borderRadius: 8, padding: "6px 10px", background: "#f9fafb", outline: "none",
          }}
        />
        <button
          onClick={submit}
          disabled={loading || !input.trim()}
          style={{
            padding: "6px 14px", background: "#2563eb", color: "white",
            border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer",
            opacity: loading || !input.trim() ? 0.4 : 1,
          }}
        >→</button>
      </div>
    </div>
  );
}
