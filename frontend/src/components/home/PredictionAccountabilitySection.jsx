import { Link } from "react-router-dom";
import HomeSectionHeader from "./HomeSectionHeader";

export default function PredictionAccountabilitySection({ modelMetrics = {}, recentResults = { results: [], correct: 0, total: 0 } }) {
  const results = recentResults.results || [];
  const byMarket = modelMetrics.byMarket || [];
  const trend = modelMetrics.trend || [];

  // Build summary cards
  const cards = [];
  if (modelMetrics.overallAccuracy > 0) cards.push({ label: "Overall Accuracy", value: `${modelMetrics.overallAccuracy}%`, trend: "up" });
  if (modelMetrics.last30Accuracy > 0) cards.push({ label: "Last 30", value: `${modelMetrics.last30Accuracy}%`, trend: "neutral" });
  if (recentResults.total > 0) {
    const pct = Math.round((recentResults.correct / recentResults.total) * 100);
    cards.push({ label: "Recent Record", value: `${recentResults.correct}/${recentResults.total}`, desc: `${pct}%`, trend: pct >= 55 ? "up" : "neutral" });
  }
  if (modelMetrics.brierScore > 0) cards.push({ label: "Brier Score", value: modelMetrics.brierScore.toFixed(2), trend: "neutral" });
  if (modelMetrics.fixturesCount) cards.push({ label: "Fixtures", value: modelMetrics.fixturesCount, trend: "neutral" });

  if (cards.length === 0 && results.length === 0 && byMarket.length === 0) return null;

  return (
    <section className="hp-section">
      <HomeSectionHeader icon="✅" iconBg="rgba(56,189,248,0.1)" title="Accountability"
        subtitle="Every prediction is tracked and verified" linkTo="/predictions/premier-league" linkLabel="History" />

      {/* Metric cards */}
      {cards.length > 0 && (
        <div className="acc-grid">
          {cards.map((c, i) => (
            <div key={i} className="hp-card acc-card">
              <div className="acc-card-value">{c.value}</div>
              <div className="acc-card-label">{c.label}</div>
              {c.desc && <div className={`acc-card-trend acc-card-trend--${c.trend}`}>{c.desc}</div>}
            </div>
          ))}
        </div>
      )}

      {/* By-market accuracy (like old heat-map row) */}
      {byMarket.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, overflowX: "auto", scrollbarWidth: "none" }}>
          {byMarket.map((m, i) => (
            <div key={i} className="hp-card" style={{
              flexShrink: 0, padding: "12px 16px", minWidth: 120, borderLeft: `3px solid ${m.col}`, cursor: "default",
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 900, color: "#f0f6ff" }}>{m.value}%</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "#4a6a8a", marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Accuracy trend sparkline (text-based) */}
      {trend.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginTop: 12, overflowX: "auto", scrollbarWidth: "none" }}>
          {trend.map((t, i) => {
            const color = t.acc >= 70 ? "#00e09e" : t.acc >= 50 ? "#f2c94c" : "#ff4d6d";
            return (
              <div key={i} style={{
                flexShrink: 0, textAlign: "center", padding: "6px 10px", borderRadius: 6,
                background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)",
              }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800, color }}>{t.acc}%</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 8, color: "#4a6a8a", marginTop: 1 }}>{t.gw}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent results strip */}
      {results.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, color: "#c8d8f0", marginBottom: 8 }}>
            Recent Results
          </div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
            {results.slice(0, 10).map((r, i) => {
              const ok = r.correct === true;
              const bad = r.correct === false;
              const bdr = ok ? "rgba(0,224,158,0.2)" : bad ? "rgba(255,77,109,0.2)" : "rgba(255,255,255,0.04)";
              return (
                <Link key={r.fixtureId || i} to={r.fixtureId ? `/match/${r.fixtureId}` : "/predictions/premier-league"}
                  style={{
                    flexShrink: 0, padding: "8px 12px", borderRadius: 8,
                    background: "rgba(255,255,255,0.015)", border: `1px solid ${bdr}`,
                    textDecoration: "none", display: "flex", alignItems: "center", gap: 6,
                    minWidth: 150, transition: "all 0.2s",
                  }}>
                  {ok && <span style={{ color: "#00e09e", fontSize: 12, fontWeight: 800 }}>✓</span>}
                  {bad && <span style={{ color: "#ff4d6d", fontSize: 12, fontWeight: 800 }}>✗</span>}
                  {r.correct == null && <span style={{ color: "#4a6a8a", fontSize: 12 }}>·</span>}
                  <div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 600, color: "#c8d8f0", whiteSpace: "nowrap" }}>
                      {r.home} {r.score} {r.away}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#4a6a8a", marginTop: 1 }}>
                      Pred: {r.pred} · {r.conf}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}