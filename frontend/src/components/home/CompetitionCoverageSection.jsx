// ═══════════════════════════════════════════════════════════
// CompetitionCoverageSection — League entry cards
// leagueCoverage: { leagues: [{ code, name, color, country,
//   topTeam, topTeamLogo, leaderPoints, tracked }] }
// ═══════════════════════════════════════════════════════════
import { Link } from "react-router-dom";
import HomeSectionHeader from "./HomeSectionHeader";

// Map league code → prediction route slug (must match App.jsx SLUG_MAP)
const SLUG_MAP = {
  epl: "premier-league",
  laliga: "la-liga",
  seriea: "serie-a",
  bundesliga: "bundesliga",
  ligue1: "ligue-1",
};

const EMOJI_MAP = {
  epl: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  laliga: "🇪🇸",
  seriea: "🇮🇹",
  bundesliga: "🇩🇪",
  ligue1: "🇫🇷",
};

export default function CompetitionCoverageSection({ leagueCoverage = { leagues: [] } }) {
  const leagues = leagueCoverage.leagues || [];

  return (
    <section className="hp-section">
      <HomeSectionHeader
        icon="🌍"
        iconBg="rgba(52,211,153,0.1)"
        title="Competition Coverage"
        subtitle="Full predictions and analysis across Europe's top leagues"
      />

      <div className="comp-grid">
        {leagues.map((lg) => {
          const slug = SLUG_MAP[lg.code] || lg.code;
          return (
            <Link
              key={lg.code}
              to={`/predictions/${slug}`}
              className="hp-card comp-card"
              style={{ "--comp-color": lg.color }}
            >
              <div className="comp-card-emoji">
                {EMOJI_MAP[lg.code] || "⚽"}
              </div>
              <div className="comp-card-name">{lg.name}</div>
              <div className="comp-card-sub">
                {lg.country} · Predictions · Analysis
              </div>
              <div className="comp-card-bar" />

              {/* Hover reveal: leader info */}
              <div className="hp-card-reveal">
                <div style={{ marginTop: 12 }}>
                  {lg.topTeam && lg.topTeam !== "—" && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      fontFamily: "var(--font-body)", fontSize: 11, color: "#c8d8f0",
                    }}>
                      {lg.topTeamLogo && (
                        <img src={lg.topTeamLogo} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} />
                      )}
                      {lg.topTeam}
                      {lg.leaderPoints > 0 && (
                        <span style={{ color: "#5a7a9a" }}>· {lg.leaderPoints} pts</span>
                      )}
                    </div>
                  )}
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: 10,
                    color: lg.color, marginTop: 6, opacity: 0.8,
                  }}>
                    View predictions →
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}