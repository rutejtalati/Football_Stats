// ═══════════════════════════════════════════════════════════
// PredictionAccountabilitySection — Truthful verification module
//
// Uses two backend-computed payloads (no fake fallbacks):
//   performanceSummary:     rolling accuracy, confidence bands, trend
//   accountabilitySummary:  verified hit rate, recent verified results
//   recentResults:          basic recent results (legacy fallback)
// ═══════════════════════════════════════════════════════════
import { Link } from "react-router-dom";
import HomeSectionHeader from "./HomeSectionHeader";

export default function PredictionAccountabilitySection({
  performanceSummary = {},
  accountabilitySummary = {},
  recentResults = { results: [], correct: 0, total: 0 },
}) {
  const ps = performanceSummary;
  const acc = accountabilitySummary;
  const recentVerified = acc.recentVerified || [];
  const legacyResults = recentResults.results || [];
  const displayResults = recentVerified.length > 0 ? recentVerified : legacyResults;

  const confBands = ps.confidenceBands || [];
  const rollingAcc = ps.rollingAccuracy || [];
  const trend = ps.trend || [];

  const hasPerformance = !ps.insufficient && (ps.verifiedCount > 0 || ps.overallAccuracy != null);
  const hasAccountability = !acc.insufficient && acc.verifiedCount > 0;
  const hasAnything = hasPerformance || hasAccountability || displayResults.length > 0;

  if (!hasAnything) {
    return (
      <section className="hp-section">
        <HomeSectionHeader icon="✅" iconBg="rgba(56,189,248,0.1)" title="Accountability"
          subtitle="Prediction tracking and verification" />
        <div className="hp-empty">
          <div className="hp-empty-text">
            No verified predictions yet. Results are checked automatically after matches finish.
          </div>
        </div>
      </section>
    );
  }

  const cards = [];
  if (acc.hitRate != null) {
    cards.push({ label: "Verified Hit Rate", value: `${acc.hitRate}%`,
      accent: acc.hitRate >= 60 ? "#00e09e" : acc.hitRate >= 50 ? "#f2c94c" : "#ff4d6d",
      desc: `${acc.assessed || acc.verifiedCount} verified` });
  } else if (ps.overallAccuracy != null) {
    cards.push({ label: "Overall Accuracy", value: `${ps.overallAccuracy}%`, accent: "#00e09e" });
  }
  if (acc.highConfidenceHitRate != null && acc.highConfidenceCount > 0) {
    cards.push({ label: "High Conf. Accuracy", value: `${acc.highConfidenceHitRate}%`,
      accent: "#4f9eff", desc: `${acc.highConfidenceCount} high-conf picks` });
  }
  if (ps.last30Accuracy != null) {
    cards.push({ label: "Last 30", value: `${ps.last30Accuracy}%`, accent: "#f2c94c" });
  }
  if (acc.verifiedCount > 0) {
    cards.push({ label: "Verified", value: `${acc.verifiedCount}`, accent: "#b388ff",
      desc: acc.pendingCount > 0 ? `${acc.pendingCount} pending` : null });
  }
  if (ps.brierScore != null && ps.brierScore > 0) {
    cards.push({ label: "Brier Score", value: `${ps.brierScore.toFixed(3)}`, accent: "#2dd4bf",
      desc: "Lower = better" });
  }
  if (ps.averageConfidence != null) {
    cards.push({ label: "Avg Confidence", value: `${ps.averageConfidence}%`, accent: "#67b1ff" });
  }

  return (
    <section className="hp-section">
      <HomeSectionHeader icon="✅" iconBg="rgba(56,189,248,0.1)" title="Accountability"
        subtitle="Every prediction is tracked and verified against real results"
        linkTo="/predictions/premier-league" linkLabel="History" />

      {cards.length > 0 && (
        <div className="acc-grid">
          {cards.map((c, i) => (
            <div key={i} className="hp-card acc-card">
              <div className="acc-card-value" style={{ color: c.accent }}>{c.value}</div>
              <div className="acc-card-label">{c.label}</div>
              {c.desc && <div className="acc-card-trend acc-card-trend--neutral">{c.desc}</div>}
            </div>
          ))}
        </div>
      )}

      {rollingAcc.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, color: "#c8d8f0", marginBottom: 8 }}>
            Rolling Accuracy
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {rollingAcc.map((r, i) => {
              const color = r.accuracy >= 65 ? "#00e09e" : r.accuracy >= 50 ? "#f2c94c" : "#ff4d6d";
              return (
                <div key={i} className="hp-card" style={{ flex: 1, padding: "14px 16px", cursor: "default", borderTop: `3px solid ${color}` }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 900, color }}>{r.accuracy}%</div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "#4a6a8a", marginTop: 2 }}>{r.window}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#3a5a7a", marginTop: 2 }}>{r.count} matches</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {confBands.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, color: "#c8d8f0", marginBottom: 8 }}>
            Accuracy by Confidence Band
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
            {confBands.map((b, i) => {
              const color = (b.accuracy ?? 0) >= 65 ? "#00e09e" : (b.accuracy ?? 0) >= 50 ? "#f2c94c" : "#ff4d6d";
              return (
                <div key={i} className="hp-card" style={{ flexShrink: 0, padding: "12px 16px", minWidth: 140, borderLeft: `3px solid ${color}`, cursor: "default" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 900, color }}>{b.accuracy != null ? `${b.accuracy}%` : "—"}</div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "#4a6a8a", marginTop: 2 }}>{b.bracket}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#3a5a7a", marginTop: 2 }}>{b.correct}/{b.count} correct</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {trend.length > 3 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, color: "#c8d8f0", marginBottom: 8 }}>
            Accuracy Trend (10-match rolling)
          </div>
          <div style={{ display: "flex", gap: 4, overflowX: "auto", scrollbarWidth: "none", alignItems: "flex-end" }}>
            {trend.slice(-20).map((t, i) => {
              const color = t.accuracy >= 70 ? "#00e09e" : t.accuracy >= 50 ? "#f2c94c" : "#ff4d6d";
              const barH = Math.max(8, (t.accuracy / 100) * 60);
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ width: 14, height: barH, borderRadius: 3, background: color, opacity: 0.7 + (t.accuracy / 300) }} />
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: "#3a5a7a" }}>{t.accuracy}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {displayResults.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, color: "#c8d8f0", marginBottom: 8 }}>
            Recent Predictions
          </div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
            {displayResults.slice(0, 12).map((r, i) => {
              const ok = r.correct === true;
              const bad = r.correct === false;
              const pending = r.correct == null;
              const bdr = ok ? "rgba(0,224,158,0.2)" : bad ? "rgba(255,77,109,0.2)" : "rgba(255,255,255,0.04)";
              const home = r.home || "Home";
              const away = r.away || "Away";
              const score = r.score || "—";
              const pred = r.predictedOutcome || r.pred || "—";
              const conf = r.confidenceLabel || r.conf || "";
              const fid = r.fixtureId || null;
              const league = r.league || "";

              return (
                <Link key={fid || i} to={fid ? `/match/${fid}` : "/predictions/premier-league"}
                  style={{ flexShrink: 0, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.015)",
                    border: `1px solid ${bdr}`, textDecoration: "none", display: "flex", alignItems: "center",
                    gap: 6, minWidth: 170, transition: "all 0.2s" }}>
                  {ok && <span style={{ color: "#00e09e", fontSize: 13, fontWeight: 900 }}>✓</span>}
                  {bad && <span style={{ color: "#ff4d6d", fontSize: 13, fontWeight: 900 }}>✗</span>}
                  {pending && <span style={{ color: "#4a6a8a", fontSize: 12 }}>⏳</span>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 600, color: "#c8d8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {home} {score} {away}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, color: "#4a6a8a", marginTop: 1, display: "flex", gap: 4 }}>
                      <span>Pred: {pred}</span>
                      {conf && <span>· {conf}</span>}
                      {league && <span style={{ padding: "0 4px", borderRadius: 3, background: "rgba(255,255,255,0.03)", fontSize: 7 }}>{league}</span>}
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