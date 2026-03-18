import { Link } from "react-router-dom";
import { formatXg } from "../../utils/homeDataMappers";

export default function FeaturedMatchPanel({ match }) {
  if (!match) return null;
  const confColor = match.conf === "high" ? "#00e09e" : match.conf === "medium" ? "#f2c94c" : "#4a6a8a";

  return (
    <Link to={match.fixtureId ? `/match/${match.fixtureId}` : "/predictions/premier-league"}
      className="featured-match" style={{ textDecoration: "none", color: "inherit" }}>
      <div className="featured-match-inner">
        <div className="featured-match-label">Featured Intelligence</div>
        <div className="featured-match-teams">
          <div className="featured-match-team">
            {match.homeLogo && <img src={match.homeLogo} alt={match.home} />}
            <div className="featured-match-team-name">{match.home}</div>
          </div>
          <div className="featured-match-center">
            <div className="featured-match-vs">VS</div>
            <div className="featured-match-datetime">{match.kickoff}{match.time ? ` · ${match.time}` : ""}</div>
            {match.score && match.score !== "—" && (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#4a6a8a", marginTop: 2 }}>Predicted: {match.score}</div>
            )}
          </div>
          <div className="featured-match-team">
            {match.awayLogo && <img src={match.awayLogo} alt={match.away} />}
            <div className="featured-match-team-name">{match.away}</div>
          </div>
        </div>
        <div className="featured-match-meta">
          <div className="featured-match-stat"><div className="val">{match.homeProb}%</div><div className="lbl">Home</div></div>
          <div className="featured-match-stat"><div className="val">{match.draw}%</div><div className="lbl">Draw</div></div>
          <div className="featured-match-stat"><div className="val">{match.awayProb}%</div><div className="lbl">Away</div></div>
          {match.xgHome !== null && <div className="featured-match-stat"><div className="val">{formatXg(match.xgHome)}</div><div className="lbl">xG H</div></div>}
          {match.xgAway !== null && <div className="featured-match-stat"><div className="val">{formatXg(match.xgAway)}</div><div className="lbl">xG A</div></div>}
          <div className="featured-match-stat"><div className="val" style={{ color: confColor }}>{match.confPct}%</div><div className="lbl">Conf</div></div>
        </div>
        <div className="featured-match-cta">
          <span className="hero-btn hero-btn--ghost" style={{ fontSize: 11, padding: "6px 16px" }}>Full Analysis →</span>
        </div>
      </div>
    </Link>
  );
}