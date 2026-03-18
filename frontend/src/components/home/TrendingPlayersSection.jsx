// ═══════════════════════════════════════════════════════════
// TrendingPlayersSection — Trending players + xG leaders
// trendingPlayers: { items: [{ label, value, col, playerId, type, sub }] }
// xgLeaders: { leaders: [{ playerId, name, photo, team, teamLogo,
//   goals, assists, gPlusA, per90, played }], league }
// ═══════════════════════════════════════════════════════════
import { Link } from "react-router-dom";
import HomeSectionHeader from "./HomeSectionHeader";

export default function TrendingPlayersSection({
  trendingPlayers = { items: [] },
  xgLeaders = { leaders: [], league: "" },
}) {
  const trending = trendingPlayers.items || [];
  const leaders = xgLeaders.leaders || [];
  const hasContent = trending.length > 0 || leaders.length > 0;

  if (!hasContent) return null;

  return (
    <section className="hp-section">
      <HomeSectionHeader
        icon="🔥"
        iconBg="rgba(167,139,250,0.1)"
        title="Players"
        subtitle="Top performers and trending names across top leagues"
        linkTo="/player"
        linkLabel="Player Hub"
      />

      {/* xG Leaders grid (API-Football data — has photos, can link to /player/:id) */}
      {leaders.length > 0 && (
        <>
          <div style={{
            fontFamily: "var(--font-display)", fontSize: 13,
            fontWeight: 800, color: "#c8d8f0", marginBottom: 14,
          }}>
            {xgLeaders.league ? `${xgLeaders.league} — ` : ""}Goals + Assists Leaders
          </div>
          <div className="players-grid">
            {leaders.slice(0, 8).map((p, i) => (
              <Link
                key={p.playerId || i}
                to={p.playerId ? `/player/${p.playerId}` : "/player"}
                className="hp-card player-card-hp"
              >
                {p.photo ? (
                  <img className="player-card-hp-img" src={p.photo} alt={p.name} loading="lazy" />
                ) : (
                  <div className="player-card-hp-img" style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-display)", fontSize: 18, color: "#a78bfa",
                    background: "rgba(167,139,250,0.08)",
                  }}>
                    {(p.name || "?")[0]}
                  </div>
                )}
                <div className="player-card-hp-info">
                  <div className="player-card-hp-name">{p.name}</div>
                  <div className="player-card-hp-team">{p.team}</div>
                  <div className="player-card-hp-stats">
                    {p.goals > 0 && (
                      <span className="player-card-hp-stat"><b>{p.goals}</b><span>G</span></span>
                    )}
                    {p.assists > 0 && (
                      <span className="player-card-hp-stat"><b>{p.assists}</b><span>A</span></span>
                    )}
                    {p.gPlusA > 0 && (
                      <span className="player-card-hp-stat"><b>{p.gPlusA}</b><span>G+A</span></span>
                    )}
                  </div>
                </div>

                <div className="hp-card-reveal" style={{ width: "100%" }}>
                  <div style={{
                    marginTop: 10, paddingTop: 10,
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                    display: "flex", justifyContent: "space-between",
                    fontFamily: "var(--font-mono)", fontSize: 10,
                  }}>
                    <span style={{ color: "#5a7a9a" }}>{p.played} apps · {p.per90}/90</span>
                    <span style={{ color: "#a78bfa" }}>Profile →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Trending FPL players (FPL data — ticker items, link to /player browse) */}
      {trending.length > 0 && (
        <div style={{ marginTop: leaders.length > 0 ? 28 : 0 }}>
          <div style={{
            fontFamily: "var(--font-display)", fontSize: 13,
            fontWeight: 800, color: "#c8d8f0", marginBottom: 14,
          }}>
            Trending in FPL
          </div>
          <div style={{
            display: "flex", gap: 10, overflowX: "auto",
            scrollbarWidth: "none", paddingBottom: 4,
          }}>
            {trending.slice(0, 8).map((t, i) => (
              <Link
                key={t.playerId || i}
                to="/player"
                className="hp-card"
                style={{
                  flexShrink: 0, width: 150, padding: "14px 12px",
                  textAlign: "center", borderLeft: `3px solid ${t.col}`,
                }}
              >
                <div style={{
                  fontFamily: "var(--font-display)", fontSize: 13,
                  fontWeight: 700, color: "#f0f6ff",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {t.label}
                </div>
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 18,
                  fontWeight: 900, color: t.col, margin: "4px 0",
                }}>
                  {t.value}
                </div>
                <div style={{
                  fontFamily: "var(--font-body)", fontSize: 10,
                  color: "#5a7a9a",
                }}>
                  {t.sub}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}