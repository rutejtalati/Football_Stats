// ═══════════════════════════════════════════════════════════
// FPLSpotlightSection — Fantasy tools + differential captain picks
// fplSpotlight: {
//   captains: [{ playerId, name, team, teamShort, position,
//     ownership, form, cost, totalPoints, diffScore }],
//   valuePlayers: [{ playerId, name, team, teamShort, position,
//     cost, totalPoints, form, valueScore, ownership }]
// }
// ═══════════════════════════════════════════════════════════
import { Link } from "react-router-dom";
import HomeSectionHeader from "./HomeSectionHeader";

const FPL_TOOLS = [
  { to: "/best-team",          icon: "⭐", name: "Best XI",            desc: "Optimal FPL starting eleven" },
  { to: "/squad-builder",      icon: "🏗️", name: "Squad Builder",      desc: "Build your 15-man squad" },
  { to: "/captaincy",          icon: "©️", name: "Captaincy",          desc: "Captain & vice-captain picks" },
  { to: "/fixture-difficulty",  icon: "📅", name: "Fixture Difficulty", desc: "FDR heatmap across GWs" },
  { to: "/transfer-planner",   icon: "🔄", name: "Transfer Planner",   desc: "Plan transfers ahead" },
  { to: "/differentials",      icon: "💎", name: "Differentials",      desc: "Low-owned high-ceiling picks" },
];

export default function FPLSpotlightSection({ fplSpotlight = { captains: [], valuePlayers: [] } }) {
  const captains = fplSpotlight.captains || [];
  const valuePlayers = fplSpotlight.valuePlayers || [];
  const picks = captains.length > 0 ? captains : valuePlayers;
  const pickLabel = captains.length > 0 ? "Differential Captains" : "Value Picks";

  return (
    <section className="hp-section">
      <HomeSectionHeader
        icon="⭐"
        iconBg="rgba(40,217,122,0.1)"
        title="Fantasy Spotlight"
        subtitle="FPL tools, captaincy picks, and value insights"
        linkTo="/best-team"
        linkLabel="All FPL Tools"
      />

      {/* Tool cards */}
      <div className="fpl-grid">
        {FPL_TOOLS.map((t) => (
          <Link key={t.to} to={t.to} className="hp-card fpl-tool-card">
            <div className="fpl-tool-icon">{t.icon}</div>
            <div className="fpl-tool-name">{t.name}</div>
            <div className="fpl-tool-desc">{t.desc}</div>
            <div className="hp-card-reveal">
              <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 10, color: "#28d97a" }}>
                Open tool →
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Player picks */}
      {picks.length > 0 && (
        <>
          <div style={{ marginTop: 28, marginBottom: 12 }}>
            <span style={{
              fontFamily: "var(--font-display)", fontSize: 13,
              fontWeight: 800, color: "#c8d8f0", letterSpacing: "-0.01em",
            }}>
              {pickLabel}
            </span>
          </div>

          <div className="fpl-picks-row">
            {picks.slice(0, 8).map((p, i) => (
              <Link
                key={p.playerId || i}
                to={captains.length > 0 ? "/differentials" : "/best-team"}
                className="hp-card fpl-pick"
              >
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "rgba(40,217,122,0.1)", margin: "0 auto 8px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-display)", fontSize: 16, color: "#28d97a",
                  border: "2px solid rgba(40,217,122,0.2)",
                }}>
                  {(p.name || "?")[0]}
                </div>
                <div className="fpl-pick-name">{p.name}</div>
                <div className="fpl-pick-team">{p.teamShort || p.team}</div>
                <div className="fpl-pick-stat">
                  {captains.length > 0
                    ? `${p.form} form`
                    : `${p.totalPoints} pts`
                  }
                </div>
                <div className="fpl-pick-stat-lbl">
                  £{p.cost}m · {p.ownership}% owned
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}