import { Link } from "react-router-dom";
import HomeSectionHeader from "./HomeSectionHeader";

export default function EdgeBoardSection({ edges = { edges: [] }, tacticalInsight = { primary: {}, all: [] } }) {
  const edgeList = edges.edges || [];
  const insight = tacticalInsight.primary || {};
  const insightAll = tacticalInsight.all || [];

  if (edgeList.length === 0 && !insight.stat) return null;

  return (
    <section className="hp-section">
      <HomeSectionHeader icon="🎯" iconBg="rgba(0,224,158,0.1)" title="Intelligence Edge"
        subtitle="Model signals and tactical advantages" linkTo="/predictions/premier-league" linkLabel="Explore" />

      {/* Tactical insight — stat-of-the-day banner */}
      {insight.stat && insight.stat !== "—" && (
        <div style={{
          padding: "12px 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 14,
          background: "rgba(255,255,255,0.018)", border: "1px solid rgba(255,255,255,0.04)",
          borderLeft: `3px solid ${insight.col || "#f2c94c"}`, marginBottom: 12,
        }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 900, color: insight.col || "#f2c94c", lineHeight: 1 }}>
            {insight.stat}
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, color: "#e8f0ff" }}>
              {insight.player} — {insight.label}
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#4a6a8a", lineHeight: 1.45, marginTop: 2 }}>
              {insight.context}
            </div>
          </div>
        </div>
      )}

      {/* Edge cards */}
      {edgeList.length > 0 && (
        <div className="edge-grid">
          {edgeList.map((e, i) => (
            <Link key={e.fixtureId || i} to={e.fixtureId ? `/match/${e.fixtureId}` : "/predictions/premier-league"} className="hp-card edge-card">
              <div className="edge-card-header">
                <span className="edge-card-type" style={{ background: `${e.col}18`, color: e.col || "#00e09e" }}>
                  {e.direction} edge
                </span>
                <span className="edge-card-conf">{e.modelProb}%</span>
              </div>
              <div className="edge-card-title">{e.label}</div>
              <div className="edge-card-desc">+{e.edge}% vs market</div>
              <div className="edge-card-teams">{e.home} vs {e.away}</div>
              <div className="hp-card-reveal">
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.03)",
                  fontFamily: "var(--font-mono)", fontSize: 9, color: e.col || "#00e09e" }}>
                  Match intelligence →
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Additional tactical insights row */}
      {insightAll.length > 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 8, marginTop: 10 }}>
          {insightAll.slice(1, 4).map((ins, i) => (
            <div key={i} className="hp-card" style={{ padding: 12, cursor: "default" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 900, color: ins.col || "#4f9eff", marginBottom: 2 }}>
                {ins.stat}
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "#4a6a8a" }}>
                {ins.player} — {ins.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}