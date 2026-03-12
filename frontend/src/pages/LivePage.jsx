// ═══════════════════════════════════════════════════════════
// LivePage — Live Match Hub · /live
// StatinSite
// ═══════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND = "https://football-stats-lw4b.onrender.com";

// ─── League config ────────────────────────────────────────
const LEAGUES = [
  { id: "epl",        label: "Premier League", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", color: "#60a5fa" },
  { id: "laliga",     label: "La Liga",        flag: "🇪🇸",       color: "#f97316" },
  { id: "seriea",     label: "Serie A",        flag: "🇮🇹",       color: "#34d399" },
  { id: "bundesliga", label: "Bundesliga",     flag: "🇩🇪",       color: "#f59e0b" },
  { id: "ligue1",     label: "Ligue 1",        flag: "🇫🇷",       color: "#a78bfa" },
];

const LEAGUE_FILTER = ["all", "epl", "laliga", "seriea", "bundesliga", "ligue1"];

// ─── Pulse dot ────────────────────────────────────────────
function LiveDot({ size = 6, color = "#ff4444" }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", width: size, height: size, flexShrink: 0 }}>
      <span style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: color, animation: "lp-pulse 1.8s ease-in-out infinite",
      }} />
      <span style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: color, opacity: 0.4, animation: "lp-ring 1.8s ease-out infinite",
      }} />
    </span>
  );
}

// ─── Fixture card ─────────────────────────────────────────
function FixtureCard({ fixture, isLive }) {
  const navigate = useNavigate();
  const leagueCfg = LEAGUES.find(l => l.id === fixture.league) || LEAGUES[0];

  return (
    <div
      onClick={() => fixture.fixture_id && navigate(`/match/${fixture.fixture_id}`)}
      style={{
        background: isLive
          ? "linear-gradient(160deg, rgba(14,20,32,0.98), rgba(8,12,20,0.98))"
          : "linear-gradient(160deg, rgba(10,15,26,0.95), rgba(6,10,18,0.95))",
        border: isLive
          ? "1.5px solid rgba(255,68,68,0.22)"
          : "1.5px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        padding: "16px 18px",
        cursor: fixture.fixture_id ? "pointer" : "default",
        transition: "border-color 0.18s, transform 0.18s, box-shadow 0.18s",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => {
        if (!fixture.fixture_id) return;
        e.currentTarget.style.borderColor = isLive ? "rgba(255,68,68,0.4)" : "rgba(96,165,250,0.25)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = isLive
          ? "0 8px 28px rgba(255,60,60,0.1)"
          : "0 8px 28px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = isLive ? "rgba(255,68,68,0.22)" : "rgba(255,255,255,0.07)";
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      {/* Live glow */}
      {isLive && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, transparent, rgba(255,68,68,0.5), transparent)",
        }} />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{
          fontSize: 9, fontWeight: 900, letterSpacing: "0.1em",
          color: leagueCfg.color, textTransform: "uppercase",
          fontFamily: "Inter, sans-serif",
        }}>
          {leagueCfg.flag} {leagueCfg.label}
        </span>
        {isLive ? (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "2px 8px", borderRadius: 999,
            background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.25)",
            fontSize: 9, fontWeight: 900, color: "#ff5252",
            fontFamily: "Inter, sans-serif", letterSpacing: "0.08em",
          }}>
            <LiveDot size={5} />
            {fixture.minute ? `${fixture.minute}'` : "LIVE"}
          </span>
        ) : (
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "Inter, sans-serif" }}>
            {fixture.kickoff || ""}
          </span>
        )}
      </div>

      {/* Teams + score */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Home */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          {fixture.home_logo && (
            <img src={fixture.home_logo} alt="" style={{ width: 32, height: 32, objectFit: "contain" }}
              onError={e => { e.currentTarget.style.display = "none"; }} />
          )}
          <span style={{ fontSize: 11, fontWeight: 700, color: "#c8d8f0", textAlign: "center", fontFamily: "Inter, sans-serif" }}>
            {fixture.home_team}
          </span>
        </div>

        {/* Score / VS */}
        <div style={{ textAlign: "center", flexShrink: 0, minWidth: 56 }}>
          {isLive || fixture.status === "FT" ? (
            <span style={{
              fontSize: 22, fontWeight: 900, color: "#f0f6ff",
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em",
            }}>
              {fixture.home_score ?? 0} – {fixture.away_score ?? 0}
            </span>
          ) : (
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.2)", fontFamily: "Inter, sans-serif" }}>
              vs
            </span>
          )}
          {fixture.status === "FT" && (
            <div style={{ fontSize: 8, fontWeight: 900, color: "rgba(255,255,255,0.25)", letterSpacing: "0.1em", marginTop: 2 }}>FT</div>
          )}
        </div>

        {/* Away */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          {fixture.away_logo && (
            <img src={fixture.away_logo} alt="" style={{ width: 32, height: 32, objectFit: "contain" }}
              onError={e => { e.currentTarget.style.display = "none"; }} />
          )}
          <span style={{ fontSize: 11, fontWeight: 700, color: "#c8d8f0", textAlign: "center", fontFamily: "Inter, sans-serif" }}>
            {fixture.away_team}
          </span>
        </div>
      </div>

      {/* Footer */}
      {fixture.fixture_id && (
        <div style={{
          marginTop: 12, paddingTop: 10,
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex", justifyContent: "flex-end",
        }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(96,165,250,0.55)", fontFamily: "Inter, sans-serif" }}>
            Match Details →
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────
function SectionHeader({ label, count, color = "#60a5fa", live }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      {live && <LiveDot color="#ff4444" />}
      <h2 style={{
        fontSize: 11, fontWeight: 900, letterSpacing: "0.12em",
        color, textTransform: "uppercase", fontFamily: "Inter, sans-serif",
        margin: 0, borderLeft: `2px solid ${color}`, paddingLeft: 10,
      }}>{label}</h2>
      {count != null && (
        <span style={{
          fontSize: 9, fontWeight: 900, padding: "1px 7px", borderRadius: 999,
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
          color, fontFamily: "Inter, sans-serif",
        }}>{count}</span>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div style={{
      background: "linear-gradient(90deg, rgba(14,20,32,0.8) 25%, rgba(20,28,42,0.8) 50%, rgba(14,20,32,0.8) 75%)",
      backgroundSize: "200% 100%",
      animation: "lp-skel 1.4s ease infinite",
      borderRadius: 16, height: 140,
      border: "1.5px solid rgba(255,255,255,0.05)",
    }} />
  );
}

// ─── Main page ────────────────────────────────────────────
export default function LivePage() {
  const [chips, setChips]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeLeague, setActiveLeague] = useState("all");

  useEffect(() => {
    fetch(`${BACKEND}/api/live/summary`)
      .then(r => r.json())
      .then(d => {
        setChips(Array.isArray(d.chips) ? d.chips : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Derive fixture lists from chips
  const liveChips     = chips.filter(c => c.type === "live_score");
  const upcomingChips = chips.filter(c => c.type === "upcoming");
  const insightChips  = chips.filter(c => c.type === "model_edge" || c.type === "title_race");

  // Convert chips to fixture-card shape
  const toFixture = (chip, isLive) => ({
    fixture_id: chip.fixture_id,
    league:     chip.league,
    home_team:  chip.home_team  || (chip.label?.split(" vs ")?.[0] ?? ""),
    away_team:  chip.away_team  || (chip.label?.split(" vs ")?.[1] ?? ""),
    home_logo:  chip.home_logo,
    away_logo:  chip.away_logo,
    home_score: chip.home_score,
    away_score: chip.away_score,
    minute:     chip.minute,
    kickoff:    chip.kickoff,
    status:     isLive ? "LIVE" : "NS",
  });

  return (
    <>
      <style>{`
        @keyframes lp-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.4; transform:scale(0.65); }
        }
        @keyframes lp-ring {
          0%   { transform:scale(1); opacity:0.5; }
          80%  { transform:scale(2.5); opacity:0; }
          100% { opacity:0; }
        }
        @keyframes lp-skel {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes lp-fade-up {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .lp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }
        .lp-league-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 12px; border-radius: 999px;
          font-size: 11px; font-weight: 700;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.38); cursor: pointer;
          font-family: 'Inter', sans-serif; white-space: nowrap;
          transition: all 0.15s;
        }
        .lp-league-pill:hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.07); }
        .lp-league-pill.active {
          color: #60a5fa;
          background: rgba(96,165,250,0.1);
          border-color: rgba(96,165,250,0.25);
        }
        .lp-insight-card {
          background: linear-gradient(160deg, rgba(10,15,26,0.98), rgba(6,10,18,0.98));
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 14px 16px;
          transition: border-color 0.15s;
        }
        .lp-insight-card:hover { border-color: rgba(96,165,250,0.2); }
        .lp-quick-link {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px; border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          text-decoration: none; cursor: pointer;
          transition: background 0.14s, border-color 0.14s, transform 0.14s;
        }
        .lp-quick-link:hover {
          background: rgba(96,165,250,0.06);
          border-color: rgba(96,165,250,0.18);
          transform: translateX(3px);
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#060a12",
        padding: "24px 0 80px",
        animation: "lp-fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>

          {/* ── Page header ──────────────────────────────── */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <LiveDot size={8} />
              <h1 style={{
                fontSize: 28, fontWeight: 900, color: "#f0f6ff",
                margin: 0, letterSpacing: "-0.03em",
                fontFamily: "'Sora', sans-serif",
              }}>Live Centre</h1>
            </div>
            <p style={{
              fontSize: 13, color: "rgba(255,255,255,0.3)",
              margin: 0, fontFamily: "Inter, sans-serif", maxWidth: 480,
            }}>
              Live scores, upcoming matches, and real-time model intelligence across the top 5 European leagues.
            </p>
          </div>

          {/* ── League filter ─────────────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            overflowX: "auto", paddingBottom: 4,
            scrollbarWidth: "none", marginBottom: 32,
          }}>
            {LEAGUE_FILTER.map(id => {
              const cfg = LEAGUES.find(l => l.id === id);
              return (
                <button
                  key={id}
                  className={`lp-league-pill${activeLeague === id ? " active" : ""}`}
                  onClick={() => setActiveLeague(id)}
                >
                  {cfg ? `${cfg.flag} ${cfg.label}` : "All Leagues"}
                </button>
              );
            })}
          </div>

          {/* ── Live now ──────────────────────────────────── */}
          {(loading || liveChips.length > 0) && (
            <section style={{ marginBottom: 36 }}>
              <SectionHeader
                label="Live Now"
                count={liveChips.length || undefined}
                color="#ff5252"
                live
              />
              {loading ? (
                <div className="lp-grid">
                  {[1,2,3].map(i => <CardSkeleton key={i} />)}
                </div>
              ) : liveChips.length === 0 ? null : (
                <div className="lp-grid">
                  {liveChips
                    .filter(c => activeLeague === "all" || c.league === activeLeague)
                    .map((c, i) => <FixtureCard key={i} fixture={toFixture(c, true)} isLive />)}
                </div>
              )}
            </section>
          )}

          {/* ── No live placeholder ───────────────────────── */}
          {!loading && liveChips.length === 0 && (
            <section style={{ marginBottom: 36 }}>
              <SectionHeader label="Live Now" color="#ff5252" live />
              <div style={{
                border: "1.5px dashed rgba(255,255,255,0.07)",
                borderRadius: 16, padding: "32px 24px",
                textAlign: "center", color: "rgba(255,255,255,0.2)",
                fontFamily: "Inter, sans-serif", fontSize: 13,
              }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>⚽</div>
                No live matches right now — check back on matchdays.
              </div>
            </section>
          )}

          {/* ── Upcoming ──────────────────────────────────── */}
          <section style={{ marginBottom: 36 }}>
            <SectionHeader label="Upcoming Today" count={upcomingChips.length || undefined} color="#60a5fa" />
            {loading ? (
              <div className="lp-grid">
                {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
              </div>
            ) : upcomingChips.length === 0 ? (
              <div style={{
                border: "1.5px dashed rgba(255,255,255,0.06)",
                borderRadius: 16, padding: "24px", textAlign: "center",
                color: "rgba(255,255,255,0.18)", fontSize: 13, fontFamily: "Inter, sans-serif",
              }}>
                No upcoming matches in the feed right now.
              </div>
            ) : (
              <div className="lp-grid">
                {upcomingChips
                  .filter(c => activeLeague === "all" || c.league === activeLeague)
                  .map((c, i) => <FixtureCard key={i} fixture={toFixture(c, false)} isLive={false} />)}
              </div>
            )}
          </section>

          {/* ── Model insights ────────────────────────────── */}
          {insightChips.length > 0 && (
            <section style={{ marginBottom: 36 }}>
              <SectionHeader label="Model Intelligence" color="#00e5a0" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                {insightChips.map((chip, i) => (
                  <div key={i} className="lp-insight-card">
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6,
                      marginBottom: 8,
                    }}>
                      <span style={{
                        fontSize: 8, fontWeight: 900, letterSpacing: "0.12em",
                        color: "#00e5a0", textTransform: "uppercase",
                        fontFamily: "Inter, sans-serif",
                        padding: "2px 6px", borderRadius: 4,
                        background: "rgba(0,229,160,0.08)",
                        border: "1px solid rgba(0,229,160,0.18)",
                      }}>MODEL</span>
                    </div>
                    <div style={{
                      fontSize: 13, fontWeight: 700, color: "#c8d8f0",
                      fontFamily: "Inter, sans-serif", marginBottom: 4,
                    }}>{chip.label}</div>
                    {chip.detail && (
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "Inter, sans-serif" }}>
                        {chip.detail}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Quick navigation ──────────────────────────── */}
          <section>
            <SectionHeader label="Quick Navigation" color="#a78bfa" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
              {[
                { label: "Predictions",    sub: "Match outcome models",     href: "/predictions/premier-league", color: "#60a5fa" },
                { label: "Leagues",        sub: "Standings & top scorers",  href: "/leagues",                   color: "#34d399" },
                { label: "News & Intel",   sub: "AI-powered match previews",href: "/news",                      color: "#f472b6" },
                { label: "Fantasy",        sub: "Optimal FPL team",         href: "/best-team",                 color: "#28d97a" },
              ].map(item => (
                <a key={item.href} href={item.href} className="lp-quick-link">
                  <div>
                    <div style={{
                      fontSize: 12.5, fontWeight: 700, color: "#c8d8f0",
                      fontFamily: "Inter, sans-serif", marginBottom: 2,
                    }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "Inter, sans-serif" }}>
                      {item.sub}
                    </div>
                  </div>
                  <span style={{ color: item.color, fontSize: 14 }}>→</span>
                </a>
              ))}
            </div>
          </section>

        </div>
      </div>
    </>
  );
}