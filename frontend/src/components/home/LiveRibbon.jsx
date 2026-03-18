// ═══════════════════════════════════════════════════════════
// LiveRibbon — Scrollable horizontal live / upcoming matches
// Data shape from GET /api/matches/upcoming:
//   { matches: [{ fixture_id, home_team, away_team, home_logo,
//     away_logo, home_score, away_score, status, minute,
//     league_name, kickoff }], count }
// ═══════════════════════════════════════════════════════════
import { Link } from "react-router-dom";

const LIVE_STATUSES = new Set(["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT"]);

export default function LiveRibbon({ matches = [] }) {
  if (!matches || matches.length === 0) return null;

  const live = matches.filter((m) => LIVE_STATUSES.has(m.status));
  const display = live.length > 0 ? live : matches.slice(0, 10);
  const hasLive = live.length > 0;

  return (
    <div className="live-ribbon">
      <div className="hp-inner">
        <div className="live-ribbon-header">
          {hasLive && <div className="live-pulse" />}
          <span className="live-ribbon-title">
            {hasLive
              ? `${live.length} Match${live.length > 1 ? "es" : ""} Live`
              : "Upcoming Matches"}
          </span>
        </div>

        <div className="live-ribbon-scroll">
          {display.map((m, i) => {
            const isLive = LIVE_STATUSES.has(m.status);
            return (
              <Link
                key={m.fixture_id || i}
                to={m.fixture_id ? `/match/${m.fixture_id}` : "/live"}
                className="live-card"
              >
                {isLive && m.minute != null && (
                  <span className="live-card-minute">{m.minute}'</span>
                )}
                <div className="live-card-league">
                  {m.league_name || ""}
                </div>
                <div className="live-card-teams">
                  <div className="live-card-team">
                    {m.home_logo && (
                      <img src={m.home_logo} alt="" loading="lazy" />
                    )}
                    <span>{m.home_team || "Home"}</span>
                  </div>
                  <div className="live-card-score">
                    {isLive ? (
                      <>
                        <b>{m.home_score ?? 0}</b>
                        <span>-</span>
                        <b>{m.away_score ?? 0}</b>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: "#2a4a6a" }}>vs</span>
                    )}
                  </div>
                  <div className="live-card-team" style={{ justifyContent: "flex-end" }}>
                    <span>{m.away_team || "Away"}</span>
                    {m.away_logo && (
                      <img src={m.away_logo} alt="" loading="lazy" />
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}