// ═══════════════════════════════════════════════════════════
// FeaturedMatchPanel — Large showcase card for top prediction
// Receives a single mapPrediction object
// ═══════════════════════════════════════════════════════════
import { Link } from "react-router-dom";
import { formatXg } from "../../utils/homeDataMappers";

export default function FeaturedMatchPanel({ match }) {
  if (!match) return null;

  const confColor =
    match.conf === "high" ? "#00e09e" :
    match.conf === "medium" ? "#f2c94c" : "#5a7a9a";

  return (
    <Link
      to={match.fixtureId ? `/match/${match.fixtureId}` : "/predictions/premier-league"}
      className="featured-match"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div className="featured-match-inner">
        <div className="featured-match-label">Featured Intelligence</div>

        <div className="featured-match-teams">
          <div className="featured-match-team">
            {match.homeLogo && (
              <img src={match.homeLogo} alt={match.home} />
            )}
            <div className="featured-match-team-name">{match.home}</div>
          </div>

          <div className="featured-match-center">
            <div className="featured-match-vs">VS</div>
            <div className="featured-match-datetime">
              {match.kickoff}{match.time ? ` · ${match.time}` : ""}
            </div>
            {match.score && match.score !== "—" && (
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 11,
                color: "#5a7a9a", marginTop: 4,
              }}>
                Predicted: {match.score}
              </div>
            )}
          </div>

          <div className="featured-match-team">
            {match.awayLogo && (
              <img src={match.awayLogo} alt={match.away} />
            )}
            <div className="featured-match-team-name">{match.away}</div>
          </div>
        </div>

        <div className="featured-match-meta">
          <div className="featured-match-stat">
            <div className="val">{match.homeProb}%</div>
            <div className="lbl">Home Win</div>
          </div>
          <div className="featured-match-stat">
            <div className="val">{match.draw}%</div>
            <div className="lbl">Draw</div>
          </div>
          <div className="featured-match-stat">
            <div className="val">{match.awayProb}%</div>
            <div className="lbl">Away Win</div>
          </div>
          {match.xgHome !== null && (
            <div className="featured-match-stat">
              <div className="val">{formatXg(match.xgHome)}</div>
              <div className="lbl">xG Home</div>
            </div>
          )}
          {match.xgAway !== null && (
            <div className="featured-match-stat">
              <div className="val">{formatXg(match.xgAway)}</div>
              <div className="lbl">xG Away</div>
            </div>
          )}
          <div className="featured-match-stat">
            <div className="val" style={{ color: confColor }}>
              {match.confPct}%
            </div>
            <div className="lbl">Confidence</div>
          </div>
        </div>

        <div className="featured-match-cta">
          <span className="hero-btn hero-btn--ghost" style={{ fontSize: 12, padding: "8px 20px" }}>
            Full Analysis →
          </span>
        </div>
      </div>
    </Link>
  );
}