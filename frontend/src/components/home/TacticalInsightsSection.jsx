// ═══════════════════════════════════════════════════════════
// TacticalInsightsSection — Standalone tactical insight cards
// tacticalInsight: { primary: {stat, label, player, context, col}, all: [...] }
// ═══════════════════════════════════════════════════════════
import HomeSectionHeader from "./HomeSectionHeader";

export default function TacticalInsightsSection({ tacticalInsight = { primary: {}, all: [] } }) {
  const all = tacticalInsight.all || [];
  if (all.length === 0) return null;

  return (
    <section className="hp-section">
      <HomeSectionHeader
        icon="♟️"
        iconBg="rgba(103,177,255,0.1)"
        title="Tactical Board"
        subtitle="Key tactical observations from the top leagues"
      />

      <div className="edge-grid">
        {all.map((ins, i) => (
          <div key={i} className="hp-card edge-card" style={{ cursor: "default" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 900,
                color: ins.col || "#4f9eff",
              }}>
                {ins.stat}
              </span>
              <span style={{
                fontFamily: "var(--font-body)", fontSize: 11, color: "#5a7a9a",
              }}>
                {ins.label}
              </span>
            </div>
            <div className="edge-card-title">{ins.player}</div>
            {ins.context && (
              <div className="edge-card-desc">{ins.context}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}