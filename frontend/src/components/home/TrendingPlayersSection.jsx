import { Link } from "react-router-dom";
import HomeSectionHeader from "./HomeSectionHeader";

export default function TrendingPlayersSection({ trendingPlayers = { items: [] }, xgLeaders = { leaders: [], league: "" } }) {
  const trending = trendingPlayers.items || [];
  const leaders = xgLeaders.leaders || [];
  if (trending.length === 0 && leaders.length === 0) return null;

  return (
    <section className="hp-section">
      <HomeSectionHeader icon="🔥" iconBg="rgba(167,139,250,0.1)" title="Players"
        subtitle="Top performers and trending names" linkTo="/player" linkLabel="Player Hub" />

      {/* xG Leaders */}
      {leaders.length > 0 && (
        <>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, color: "#c8d8f0", marginBottom: 10 }}>
            {xgLeaders.league ? `${xgLeaders.league} — ` : ""}G+A Leaders
          </div>
          <div className="players-grid">
            {leaders.slice(0, 8).map((p, i) => (
              <Link key={p.playerId || i} to={p.playerId ? `/player/${p.playerId}` : "/player"} className="hp-card player-card-hp">
                {p.photo ? (
                  <img className="player-card-hp-img" src={p.photo} alt={p.name} loading="lazy" />
                ) : (
                  <div className="player-card-hp-img" style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-display)", fontSize: 15, color: "#a78bfa",
                    background: "rgba(167,139,250,0.06)",
                  }}>{(p.name || "?")[0]}</div>
                )}
                <div className="player-card-hp-info">
                  <div className="player-card-hp-name">{p.name}</div>
                  <div className="player-card-hp-team">{p.team}</div>
                  <div className="player-card-hp-stats">
                    {p.goals > 0 && <span className="player-card-hp-stat"><b>{p.goals}</b><span>G</span></span>}
                    {p.assists > 0 && <span className="player-card-hp-stat"><b>{p.assists}</b><span>A</span></span>}
                    {p.gPlusA > 0 && <span className="player-card-hp-stat"><b>{p.gPlusA}</b><span>G+A</span></span>}
                  </div>
                </div>
                <div className="hp-card-reveal" style={{ width: "100%" }}>
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.03)",
                    display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 9 }}>
                    <span style={{ color: "#4a6a8a" }}>{p.played} apps</span>
                    <span style={{ color: "#a78bfa" }}>Profile →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* FPL trending strip */}
      {trending.length > 0 && (
        <div style={{ marginTop: leaders.length > 0 ? 18 : 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, color: "#c8d8f0", marginBottom: 10 }}>
            Trending in FPL
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
            {trending.slice(0, 8).map((t, i) => (
              <Link key={t.playerId || i} to="/player" className="hp-card"
                style={{ flexShrink: 0, width: 130, padding: "10px", textAlign: "center", borderLeft: `2px solid ${t.col}` }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, color: "#e8f0ff",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.label}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 900, color: t.col, margin: "3px 0" }}>{t.value}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "#4a6a8a" }}>{t.sub}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}