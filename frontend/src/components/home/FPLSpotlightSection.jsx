import { Link } from "react-router-dom";
import HomeSectionHeader from "./HomeSectionHeader";

const FPL_TOOLS = [
  { to: "/best-team", icon: "⭐", name: "Best XI", desc: "Optimal starting 11" },
  { to: "/squad-builder", icon: "🏗️", name: "Squad Builder", desc: "15-man squad" },
  { to: "/captaincy", icon: "©️", name: "Captaincy", desc: "Captain picks" },
  { to: "/fixture-difficulty", icon: "📅", name: "FDR", desc: "Fixture heatmap" },
  { to: "/transfer-planner", icon: "🔄", name: "Transfers", desc: "Plan ahead" },
  { to: "/differentials", icon: "💎", name: "Differentials", desc: "Low-owned picks" },
];

export default function FPLSpotlightSection({ fplSpotlight = { captains: [], valuePlayers: [] } }) {
  const captains = fplSpotlight.captains || [];
  const valuePlayers = fplSpotlight.valuePlayers || [];
  const picks = captains.length > 0 ? captains : valuePlayers;
  const pickLabel = captains.length > 0 ? "Differential Captains" : "Value Picks";

  return (
    <section className="hp-section">
      <HomeSectionHeader icon="⭐" iconBg="rgba(40,217,122,0.1)" title="FPL Spotlight"
        subtitle="Fantasy tools and player picks" linkTo="/best-team" linkLabel="All Tools" />
      <div className="fpl-grid">
        {FPL_TOOLS.map((t) => (
          <Link key={t.to} to={t.to} className="hp-card fpl-tool-card">
            <div className="fpl-tool-icon">{t.icon}</div>
            <div className="fpl-tool-name">{t.name}</div>
            <div className="fpl-tool-desc">{t.desc}</div>
            <div className="hp-card-reveal">
              <div style={{ marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 9, color: "#00e09e" }}>Open →</div>
            </div>
          </Link>
        ))}
      </div>
      {picks.length > 0 && (
        <>
          <div style={{ marginTop: 18, marginBottom: 8, fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 800, color: "#c8d8f0" }}>{pickLabel}</div>
          <div className="fpl-picks-row">
            {picks.slice(0, 8).map((p, i) => (
              <Link key={p.playerId || i} to={captains.length > 0 ? "/differentials" : "/best-team"} className="hp-card fpl-pick">
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(40,217,122,0.08)",
                  margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-display)", fontSize: 13, color: "#00e09e", border: "1.5px solid rgba(40,217,122,0.15)" }}>
                  {(p.name || "?")[0]}
                </div>
                <div className="fpl-pick-name">{p.name}</div>
                <div className="fpl-pick-team">{p.teamShort || p.team}</div>
                <div className="fpl-pick-stat">{captains.length > 0 ? `${p.form} form` : `${p.totalPoints} pts`}</div>
                <div className="fpl-pick-sub">£{p.cost}m · {p.ownership}%</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}