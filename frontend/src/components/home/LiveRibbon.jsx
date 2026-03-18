import { Link } from "react-router-dom";

const LIVE = new Set(["1H","2H","HT","ET","BT","P","LIVE","INT"]);

export default function LiveRibbon({ matches = [] }) {
  if (!matches || matches.length === 0) return null;
  const live = matches.filter((m) => LIVE.has(m.status));
  const display = live.length > 0 ? live : matches.slice(0, 10);
  const hasLive = live.length > 0;

  return (
    <div className="live-ribbon">
      <div className="hp-inner">
        <div className="live-ribbon-header">
          {hasLive && <div className="live-pulse" />}
          <span className="live-ribbon-title">{hasLive ? `${live.length} Live` : "Upcoming"}</span>
        </div>
        <div className="live-ribbon-scroll">
          {display.map((m, i) => {
            const isLive = LIVE.has(m.status);
            return (
              <Link key={m.fixture_id || i} to={m.fixture_id ? `/match/${m.fixture_id}` : "/live"} className="live-card">
                {isLive && m.minute != null && <span className="live-card-minute">{m.minute}'</span>}
                <div className="live-card-league">{m.league_name || ""}</div>
                <div className="live-card-teams">
                  <div className="live-card-team">
                    {m.home_logo && <img src={m.home_logo} alt="" loading="lazy" />}
                    <span>{m.home_team || "Home"}</span>
                  </div>
                  <div className="live-card-score">
                    {isLive ? (<><b>{m.home_score ?? 0}</b><span>-</span><b>{m.away_score ?? 0}</b></>) : (<span style={{ fontSize: 10, color: "#1a3a5a" }}>vs</span>)}
                  </div>
                  <div className="live-card-team" style={{ justifyContent: "flex-end" }}>
                    <span>{m.away_team || "Away"}</span>
                    {m.away_logo && <img src={m.away_logo} alt="" loading="lazy" />}
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