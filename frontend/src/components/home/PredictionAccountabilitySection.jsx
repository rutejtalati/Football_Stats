// ═══════════════════════════════════════════════════════════
// PredictionAccountabilitySection — Model performance + recent results
// modelMetrics: { overallAccuracy, last30Accuracy, brierScore,
//   trend: [{gw, acc}], byMarket: [{label, value, col}], fixturesCount }
// recentResults: { results: [{home, away, pred, actual, score,
//   conf, correct, fixtureId}], correct, total }
// modelConfidence: { high, medium, low, avg }
// ═══════════════════════════════════════════════════════════
import { Link } from "react-router-dom";
import HomeSectionHeader from "./HomeSectionHeader";

export default function PredictionAccountabilitySection({
  modelMetrics = {},
  recentResults = { results: [], correct: 0, total: 0 },
  modelConfidence = {},
}) {
  const results = recentResults.results || [];
  const byMarket = modelMetrics.byMarket || [];

  // Build stat cards
  const cards = [];
  if (modelMetrics.overallAccuracy > 0) {
    cards.push({ label: "Overall Accuracy", value: `${modelMetrics.overallAccuracy}%`, trend: "up" });
  }
  if (modelMetrics.last30Accuracy > 0) {
    cards.push({ label: "Last 30 Accuracy", value: `${modelMetrics.last30Accuracy}%`, trend: "neutral" });
  }
  if (recentResults.total > 0) {
    const pct = Math.round((recentResults.correct / recentResults.total) * 100);
    cards.push({
      label: "Recent Record",
      value: `${recentResults.correct}/${recentResults.total}`,
      desc: `${pct}% hit rate`,
      trend: pct >= 55 ? "up" : pct >= 45 ? "neutral" : "down",
    });
  }
  if (modelMetrics.brierScore !== null && modelMetrics.brierScore > 0) {
    cards.push({ label: "Brier Score", value: modelMetrics.brierScore.toFixed(2), trend: "neutral" });
  }
  if (modelMetrics.fixturesCount) {
    cards.push({ label: "Fixtures Analyzed", value: modelMetrics.fixturesCount, trend: "neutral" });
  }

  if (cards.length === 0 && results.length === 0 && byMarket.length === 0) return null;

  return (
    <section className="hp-section">
      <HomeSectionHeader
        icon="✅"
        iconBg="rgba(56,189,248,0.1)"
        title="Prediction Accountability"
        subtitle="Transparent model performance — every prediction is tracked"
        linkTo="/predictions/premier-league"
        linkLabel="Full History"
      />

      {/* Metric cards */}
      {cards.length > 0 && (
        <div className="acc-grid">
          {cards.map((c, i) => (
            <div key={i} className="hp-card acc-card">
              <div className="acc-card-value">{c.value}</div>
              <div className="acc-card-label">{c.label}</div>
              {(c.desc || c.trend) && (
                <div className={`acc-card-trend acc-card-trend--${c.trend || "neutral"}`}>
                  {c.trend === "up" ? "↑" : c.trend === "down" ? "↓" : "·"}{" "}
                  {c.desc || c.trend}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* By-market accuracy breakdown */}
      {byMarket.length > 0 && (
        <div style={{
          display: "flex", gap: 12, marginTop: 20,
          overflowX: "auto", scrollbarWidth: "none", paddingBottom: 4,
        }}>
          {byMarket.map((m, i) => (
            <div key={i} className="hp-card" style={{
              flexShrink: 0, padding: "16px 20px", minWidth: 140,
              borderLeft: `3px solid ${m.col}`, cursor: "default",
            }}>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 900,
                color: "#f0f6ff",
              }}>
                {m.value}%
              </div>
              <div style={{
                fontFamily: "var(--font-body)", fontSize: 11,
                color: "#5a7a9a", marginTop: 4,
              }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent results strip */}
      {results.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{
            fontFamily: "var(--font-display)", fontSize: 13,
            fontWeight: 800, color: "#c8d8f0", marginBottom: 12,
          }}>
            Recent Results
          </div>
          <div style={{
            display: "flex", gap: 8, overflowX: "auto",
            scrollbarWidth: "none", paddingBottom: 4,
          }}>
            {results.slice(0, 10).map((r, i) => {
              const isCorrect = r.correct === true;
              const isWrong = r.correct === false;
              const borderColor = isCorrect
                ? "rgba(0,224,158,0.25)"
                : isWrong
                ? "rgba(255,77,109,0.25)"
                : "rgba(255,255,255,0.05)";

              return (
                <Link
                  key={r.fixtureId || i}
                  to={r.fixtureId ? `/match/${r.fixtureId}` : "/predictions/premier-league"}
                  style={{
                    flexShrink: 0, padding: "10px 14px", borderRadius: 10,
                    background: "rgba(9,15,28,0.95)", border: `1px solid ${borderColor}`,
                    textDecoration: "none", display: "flex", alignItems: "center",
                    gap: 8, transition: "all 0.25s var(--ease)", minWidth: 170,
                  }}
                >
                  {isCorrect && <span style={{ color: "#00e09e", fontSize: 14, fontWeight: 800 }}>✓</span>}
                  {isWrong && <span style={{ color: "#ff4d6d", fontSize: 14, fontWeight: 800 }}>✗</span>}
                  {r.correct == null && <span style={{ color: "#5a7a9a", fontSize: 14 }}>·</span>}
                  <div>
                    <div style={{
                      fontFamily: "var(--font-body)", fontSize: 11,
                      fontWeight: 600, color: "#c8d8f0", whiteSpace: "nowrap",
                    }}>
                      {r.home} {r.score} {r.away}
                    </div>
                    <div style={{
                      fontFamily: "var(--font-mono)", fontSize: 9,
                      color: "#5a7a9a", marginTop: 2,
                    }}>
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