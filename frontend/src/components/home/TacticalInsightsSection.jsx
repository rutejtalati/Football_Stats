import HomeSectionHeader from "./HomeSectionHeader";

export default function TacticalInsightsSection({ tacticalInsight = { primary: {}, all: [] } }) {
  const all = tacticalInsight.all || [];
  if (all.length === 0) return null;

  return (
    <section className="hp-section">
      <HomeSectionHeader icon="♟️" iconBg="rgba(103,177,255,0.1)" title="Attacking Output"
        subtitle="Goals per game leaders from standings" />
      <div className="edge-grid">
        {all.map((ins, i) => (
          <div key={i} className="hp-card edge-card" style={{ cursor: "default" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 900, color: ins.col || "#4f9eff" }}>{ins.stat}</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "#4a6a8a" }}>{ins.label}</span>
            </div>
            <div className="edge-card-title">{ins.player}</div>
            {ins.context && <div className="edge-card-desc">{ins.context}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}