import { Link } from "react-router-dom";
import HomeSectionHeader from "./HomeSectionHeader";

const SLUG_MAP = { epl: "premier-league", laliga: "la-liga", seriea: "serie-a", bundesliga: "bundesliga", ligue1: "ligue-1" };
const EMOJI_MAP = { epl: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", laliga: "🇪🇸", seriea: "🇮🇹", bundesliga: "🇩🇪", ligue1: "🇫🇷" };

export default function CompetitionCoverageSection({ leagueCoverage = { leagues: [] } }) {
  const leagues = leagueCoverage.leagues || [];

  return (
    <section className="hp-section">
      <HomeSectionHeader icon="🌍" iconBg="rgba(0,224,158,0.1)" title="Leagues"
        subtitle="Full predictions across Europe's top leagues" />
      <div className="comp-grid">
        {leagues.map((lg) => (
          <Link key={lg.code} to={`/predictions/${SLUG_MAP[lg.code] || lg.code}`}
            className="hp-card comp-card" style={{ "--comp-color": lg.color }}>
            <div className="comp-card-emoji">{EMOJI_MAP[lg.code] || "⚽"}</div>
            <div className="comp-card-name">{lg.name}</div>
            <div className="comp-card-sub">{lg.country}</div>
            <div className="comp-card-bar" />
            <div className="hp-card-reveal">
              <div style={{ marginTop: 8 }}>
                {lg.topTeam && lg.topTeam !== "—" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-body)", fontSize: 10, color: "#c8d8f0" }}>
                    {lg.topTeamLogo && <img src={lg.topTeamLogo} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} />}
                    {lg.topTeam}{lg.leaderPoints > 0 && <span style={{ color: "#4a6a8a" }}>· {lg.leaderPoints}pts</span>}
                  </div>
                )}
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: lg.color, marginTop: 4 }}>View predictions →</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}