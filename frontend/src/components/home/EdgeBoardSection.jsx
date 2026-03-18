// ═══════════════════════════════════════════════════════════
// EdgeBoardSection — Model edges & tactical insights
// edges: { edges: [{ fixtureId, home, away, modelProb, edge, direction, label, col }] }
// tacticalInsight: { primary: { stat, label, player, context, col }, all: [...] }
// ═══════════════════════════════════════════════════════════
import { Link } from "react-router-dom";
import HomeSectionHeader from "./HomeSectionHeader";

export default function EdgeBoardSection({
  edges = { edges: [] },
  tacticalInsight = { primary: {}, all: [] },
}) {
  const edgeList = edges.edges || [];
  const insight = tacticalInsight.primary || {};
  const insightAll = tacticalInsight.all || [];

  if (edgeList.length === 0 && !insight.stat) return null;

  return (
    <section className="hp-section">
      <HomeSectionHeader
        icon="🎯"
        iconBg="rgba(52,211,153,0.1)"
        title="Intelligence Edge"
        subtitle="Data-driven signals and tactical advantages"
        linkTo="/predictions/premier-league"
        linkLabel="Explore"
      />

      {/* Tactical insight banner */}
      {insight.stat && insight.stat !== "—" && (
        <div style={{
          padding: "16px 20px", borderRadius: 12,
          background: `rgba(${insight.col === "#f2c94c" ? "242,201,76" : "0,224,158"},0.04)`,
          border: `1px solid ${insight.col || "#f2c94c"}22`,
          marginBottom: 20, display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 900,
            color: insight.col || "#f2c94c", lineHeight: 1,
          }}>
            {insight.stat}
          </div>
          <div>
            <div style={{
              fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 800,
              color: "#f0f6ff", marginBottom: 2,
            }}>
              {insight.player} — {insight.label}
            </div>
            <div style={{
              fontFamily: "var(--font-body)", fontSize: 12,
              color: "#5a7a9a", lineHeight: 1.5,
            }}>
              {insight.context}
            </div>
          </div>
        </div>
      )}

      {/* Edge cards */}
      {edgeList.length > 0 && (
        <div className="edge-grid">
          {edgeList.map((e, i) => (
            <Link
              key={e.fixtureId || i}
              to={e.fixtureId ? `/match/${e.fixtureId}` : "/predictions/premier-league"}
              className="hp-card edge-card"
            >
              <div className="edge-card-header">
                <span className="edge-card-type" style={{
                  background: `${e.col}18`, color: e.col || "#00e09e",
                }}>
                  {e.direction} edge
                </span>
                <span className="edge-card-conf">{e.modelProb}% model</span>
              </div>
              <div className="edge-card-title">{e.label}</div>
              <div className="edge-card-desc">
                +{e.edge}% edge vs market
              </div>
              <div className="edge-card-teams">
                <span>{e.home} vs {e.away}</span>
              </div>

              <div className="hp-card-reveal">
                <div style={{
                  marginTop: 12, paddingTop: 12,
                  borderTop: "1px solid rgba(255,255,255,0.04)",
                  fontFamily: "var(--font-mono)", fontSize: 10,
                  color: e.col || "#00e09e",
                }}>
                  View full match intelligence →
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Additional tactical insights row */}
      {insightAll.length > 1 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12, marginTop: 16,
        }}>
          {insightAll.slice(1, 4).map((ins, i) => (
            <div key={i} className="hp-card" style={{ padding: 16, cursor: "default" }}>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 900,
                color: ins.col || "#4f9eff", marginBottom: 4,
              }}>
                {ins.stat}
              </div>
              <div style={{
                fontFamily: "var(--font-body)", fontSize: 11, color: "#5a7a9a",
              }}>
                {ins.player} — {ins.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}