// ═════════════════════════════════════════════════════════════════
// StatinSite — Live Centre
// State-aware cards: scheduled / live / fulltime
// ═════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND = "https://football-stats-lw4b.onrender.com";

// ─── League config ────────────────────────────────────────────────

const LEAGUES = {
  epl:        { label:"Premier League",  color:"#60a5fa" },
  laliga:     { label:"La Liga",         color:"#f97316" },
  seriea:     { label:"Serie A",         color:"#34d399" },
  bundesliga: { label:"Bundesliga",      color:"#f59e0b" },
  ligue1:     { label:"Ligue 1",         color:"#a78bfa" },
};

const LEAGUE_FILTER = ["all","epl","laliga","seriea","bundesliga","ligue1"];

function normalizeLeague(l) {
  if (!l) return "";
  const v = String(l).toLowerCase();
  if (v === "39"  || v.includes("premier"))                        return "epl";
  if (v === "140" || (v.includes("liga") && !v.includes("bundes"))) return "laliga";
  if (v === "135" || v.includes("serie"))                          return "seriea";
  if (v === "78"  || v.includes("bundes"))                         return "bundesliga";
  if (v === "61"  || v.includes("ligue"))                          return "ligue1";
  return v;
}

// ─── Status derivation ────────────────────────────────────────────

const LIVE_STATUSES = new Set(["1H","2H","HT","ET","BT","P"]);
const FT_STATUSES   = new Set(["FT","AET","PEN","AWD","WO"]);

function cardMode(status) {
  if (!status || status === "NS" || status === "TBD") return "scheduled";
  if (LIVE_STATUSES.has(status)) return "live";
  if (FT_STATUSES.has(status))   return "fulltime";
  return "scheduled";
}

// ─── Formatting helpers ───────────────────────────────────────────

function fmtKickoff(isoString) {
  if (!isoString) return "";
  const d        = new Date(isoString);
  const today    = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  const sameDay  = (a,b) =>
    a.getDate()===b.getDate() && a.getMonth()===b.getMonth() && a.getFullYear()===b.getFullYear();
  const timeStr = d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  if (sameDay(d, today))    return timeStr;
  if (sameDay(d, tomorrow)) return `Tomorrow · ${timeStr}`;
  return d.toLocaleDateString([], { weekday:"short", day:"numeric", month:"short" }) + ` · ${timeStr}`;
}

function dayKey(kickoff) {
  if (!kickoff) return "Upcoming";
  const d        = new Date(kickoff);
  const today    = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  const sameDay  = (a,b) =>
    a.getDate()===b.getDate() && a.getMonth()===b.getMonth() && a.getFullYear()===b.getFullYear();
  if (sameDay(d, today))    return "Today";
  if (sameDay(d, tomorrow)) return "Tomorrow";
  return d.toLocaleDateString([], { weekday:"long", month:"short", day:"numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────

function TeamRow({ logo, name, score, bold }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      {logo ? (
        <img src={logo} alt="" style={{ width:20, height:20, objectFit:"contain", flexShrink:0 }}
          onError={e => (e.currentTarget.style.display="none")} />
      ) : (
        <div style={{ width:20, height:20, flexShrink:0 }} />
      )}
      <span style={{
        fontSize:13, fontWeight: bold ? 800 : 600,
        color: bold ? "#f0f6ff" : "#94a3b8",
        flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
      }}>
        {name}
      </span>
      {score !== undefined && score !== null && (
        <span style={{
          fontSize:15, fontWeight:900,
          color: bold ? "#f0f6ff" : "#64748b",
          fontFamily:"'JetBrains Mono',monospace",
          minWidth:18, textAlign:"center",
        }}>
          {score}
        </span>
      )}
    </div>
  );
}

// ── Scheduled card ─────────────────────────────────────────────────

function ScheduledCard({ fixture, league, onClick }) {
  const [hov, setHov] = useState(false);
  const kickoffStr = fmtKickoff(fixture.kickoff);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding:"14px 16px",
        borderRadius:14,
        border:`1px solid ${hov ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.055)"}`,
        background: hov
          ? "linear-gradient(160deg,#0e1929,#080f1a)"
          : "linear-gradient(160deg,#0a1421,#060a12)",
        cursor:"pointer",
        transition:"all 0.15s",
        transform: hov ? "translateY(-1px)" : "translateY(0)",
        boxShadow: hov ? "0 6px 24px rgba(0,0,0,0.35)" : "none",
        position:"relative", overflow:"hidden",
      }}
    >
      {/* League accent */}
      <div style={{
        position:"absolute", left:0, top:0, bottom:0, width:3,
        background: league?.color || "transparent", opacity:0.6, borderRadius:"3px 0 0 3px",
      }} />

      <div style={{ paddingLeft:8 }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <span style={{ fontSize:9, fontWeight:900, letterSpacing:"0.1em", color: league?.color || "#aaa", textTransform:"uppercase" }}>
            {league?.label}
          </span>
          <span style={{ fontSize:11, fontWeight:700, color:"#4a6080", letterSpacing:"0.02em" }}>
            {kickoffStr}
          </span>
        </div>

        {/* Teams */}
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          <TeamRow logo={fixture.home_logo} name={fixture.home_team} />
          <TeamRow logo={fixture.away_logo} name={fixture.away_team} />
        </div>

        {/* Prediction snippet */}
        {(fixture.xg_home != null || fixture.p_home_win != null) && (
          <div style={{
            marginTop:10,
            display:"flex", gap:10, flexWrap:"wrap",
            borderTop:"1px solid rgba(255,255,255,0.04)", paddingTop:8,
          }}>
            {fixture.xg_home != null && (
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>
                <span style={{ color:"#34d399", fontWeight:700 }}>xG</span>{" "}
                {fixture.xg_home}–{fixture.xg_away}
              </span>
            )}
            {fixture.p_home_win != null && (
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>
                <span style={{ color:"#60a5fa", fontWeight:700 }}>{fixture.home_team?.split(" ").pop()}</span>{" "}
                {fixture.p_home_win}% · Draw {fixture.p_draw}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Live card ─────────────────────────────────────────────────────

function LiveCard({ fixture, league, onClick }) {
  const [hov, setHov] = useState(false);
  const isHT = fixture.status === "HT";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding:"14px 16px",
        borderRadius:14,
        border:`1px solid ${hov ? "rgba(255,82,82,0.3)" : "rgba(255,82,82,0.14)"}`,
        background: hov
          ? "linear-gradient(160deg,#160a0a,#0d0606)"
          : "linear-gradient(160deg,#110808,#090505)",
        cursor:"pointer",
        transition:"all 0.15s",
        transform: hov ? "translateY(-1px)" : "translateY(0)",
        boxShadow: hov ? "0 6px 24px rgba(0,0,0,0.4)" : "none",
        position:"relative", overflow:"hidden",
      }}
    >
      <div style={{
        position:"absolute", left:0, top:0, bottom:0, width:3,
        background: league?.color || "#ff4444", opacity:0.7, borderRadius:"3px 0 0 3px",
      }} />

      <div style={{ paddingLeft:8 }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <span style={{ fontSize:9, fontWeight:900, letterSpacing:"0.1em", color: league?.color || "#aaa", textTransform:"uppercase" }}>
            {league?.label}
          </span>
          {isHT ? (
            <span style={{ fontSize:9, fontWeight:900, color:"#f59e0b", background:"rgba(245,158,11,0.1)", padding:"2px 7px", borderRadius:999, letterSpacing:"0.06em" }}>
              HALF TIME
            </span>
          ) : (
            <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, fontWeight:900, color:"#ff5252", background:"rgba(255,82,82,0.1)", padding:"2px 8px", borderRadius:999 }}>
              <span style={{ width:5, height:5, borderRadius:"50%", background:"#ff5252", animation:"livePulse 1.2s ease-in-out infinite" }} />
              {fixture.minute ? `${fixture.minute}'` : "LIVE"}
            </span>
          )}
        </div>

        {/* Teams + scores */}
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          <TeamRow logo={fixture.home_logo} name={fixture.home_team} score={fixture.home_score} bold />
          <TeamRow logo={fixture.away_logo} name={fixture.away_team} score={fixture.away_score} bold />
        </div>

        {/* Live xG strip */}
        {fixture.xg_home != null && (
          <div style={{
            marginTop:9, borderTop:"1px solid rgba(255,255,255,0.04)", paddingTop:7,
            display:"flex", gap:6, alignItems:"center",
          }}>
            <span style={{ fontSize:9, fontWeight:900, color:"#34d399", letterSpacing:"0.06em" }}>xG</span>
            <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.4)" }}>
              {fixture.xg_home}–{fixture.xg_away}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Full-time card ────────────────────────────────────────────────

function FullTimeCard({ fixture, league, onClick }) {
  const [hov, setHov] = useState(false);
  const hScore = fixture.home_score ?? 0;
  const aScore = fixture.away_score ?? 0;
  const homeWon = hScore > aScore;
  const awayWon = aScore > hScore;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding:"14px 16px",
        borderRadius:14,
        border:`1px solid ${hov ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.045)"}`,
        background: hov
          ? "linear-gradient(160deg,#0c1520,#060c14)"
          : "linear-gradient(160deg,#090e16,#050810)",
        cursor:"pointer",
        transition:"all 0.15s",
        transform: hov ? "translateY(-1px)" : "translateY(0)",
        boxShadow: hov ? "0 6px 20px rgba(0,0,0,0.3)" : "none",
        position:"relative", overflow:"hidden",
        opacity: hov ? 1 : 0.85,
      }}
    >
      <div style={{
        position:"absolute", left:0, top:0, bottom:0, width:3,
        background: league?.color || "#555", opacity:0.35, borderRadius:"3px 0 0 3px",
      }} />

      <div style={{ paddingLeft:8 }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <span style={{ fontSize:9, fontWeight:900, letterSpacing:"0.1em", color: league?.color ? `${league.color}88` : "#555", textTransform:"uppercase" }}>
            {league?.label}
          </span>
          <span style={{ fontSize:9, fontWeight:800, color:"rgba(255,255,255,0.2)", background:"rgba(255,255,255,0.04)", padding:"2px 7px", borderRadius:999, letterSpacing:"0.06em" }}>
            FT
          </span>
        </div>

        {/* Teams + scores */}
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          <TeamRow logo={fixture.home_logo} name={fixture.home_team} score={hScore} bold={homeWon} />
          <TeamRow logo={fixture.away_logo} name={fixture.away_team} score={aScore} bold={awayWon} />
        </div>

        {/* xG summary */}
        {fixture.xg_home != null && (
          <div style={{
            marginTop:9, borderTop:"1px solid rgba(255,255,255,0.035)", paddingTop:7,
            fontSize:10, color:"rgba(255,255,255,0.25)", display:"flex", gap:6,
          }}>
            <span style={{ fontWeight:700, color:"rgba(52,211,153,0.6)" }}>xG</span>
            {fixture.xg_home}–{fixture.xg_away}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Day header ───────────────────────────────────────────────────

function DayHeader({ label, liveCount }) {
  return (
    <div style={{
      gridColumn:"1 / -1",
      display:"flex", alignItems:"center", gap:10,
      fontSize:10, fontWeight:900, letterSpacing:"0.12em",
      color:"#3a5070", textTransform:"uppercase",
      borderBottom:"1px solid rgba(255,255,255,0.04)",
      paddingBottom:7, marginTop:12,
    }}>
      <span>{label}</span>
      {liveCount > 0 && (
        <span style={{ fontSize:9, fontWeight:800, color:"#ff5252", background:"rgba(255,82,82,0.1)", padding:"2px 7px", borderRadius:999, display:"flex", alignItems:"center", gap:4 }}>
          <span style={{ width:4, height:4, borderRadius:"50%", background:"#ff5252", animation:"livePulse 1.2s ease-in-out infinite" }} />
          {liveCount} live
        </span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────

export default function LivePage() {
  const [chips,       setChips]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [league,      setLeague]      = useState("all");
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchData = () => {
    fetch(`${BACKEND}/api/matches/upcoming`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => {
        setChips(d.matches || d.chips || []);
        setLoading(false);
        setLastRefresh(new Date());
        setError(null);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, []);

  const fixtures = useMemo(() => chips.map(c => ({
    fixture_id:  c.fixture_id,
    league:      normalizeLeague(c.league || c.league_id),
    home_team:   c.home_team,
    away_team:   c.away_team,
    home_logo:   c.home_logo,
    away_logo:   c.away_logo,
    home_score:  c.home_score ?? null,
    away_score:  c.away_score ?? null,
    status:      c.status,
    minute:      c.minute,
    kickoff:     c.kickoff || c.date,
    xg_home:     c.xg_home ?? null,
    xg_away:     c.xg_away ?? null,
    p_home_win:  c.p_home_win ?? null,
    p_draw:      c.p_draw ?? null,
  })), [chips]);

  const filtered = fixtures.filter(f =>
    league === "all" || f.league === league
  );

  const grouped = useMemo(() => {
    const order = [];
    const groups = {};
    filtered.forEach(f => {
      const k = dayKey(f.kickoff);
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(f);
    });
    // Sort: live first within each day, then by kickoff
    Object.values(groups).forEach(arr => {
      arr.sort((a,b) => {
        const aLive = LIVE_STATUSES.has(a.status) ? 0 : 1;
        const bLive = LIVE_STATUSES.has(b.status) ? 0 : 1;
        if (aLive !== bLive) return aLive - bLive;
        return new Date(a.kickoff) - new Date(b.kickoff);
      });
    });
    return { order, groups };
  }, [filtered]);

  const liveCount = fixtures.filter(f => LIVE_STATUSES.has(f.status)).length;

  const navigate = useNavigate();

  return (
    <>
      <style>{`
        @keyframes livePulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.4; transform:scale(0.75); }
        }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      <div style={{
        background:"#060a12", minHeight:"100vh",
        padding:"28px 24px",
        fontFamily:"'Inter','Sora',sans-serif",
      }}>
        <div style={{ maxWidth:1240, margin:"0 auto" }}>

          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:22 }}>
            <div>
              <h1 style={{ fontSize:26, fontWeight:900, color:"#f0f6ff", margin:0, letterSpacing:"-0.02em" }}>
                Live Centre
              </h1>
              <p style={{ color:"#3a5070", fontSize:12, marginTop:4, marginBottom:0 }}>
                Next 7 days · Top 5 leagues
                {liveCount > 0 && (
                  <span style={{ marginLeft:10, color:"#ff5252", fontWeight:800 }}>
                    {liveCount} live now
                  </span>
                )}
              </p>
            </div>
            {lastRefresh && (
              <span style={{ fontSize:10, color:"#1e2d3d" }}>
                {lastRefresh.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
              </span>
            )}
          </div>

          {/* League filters */}
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:26 }}>
            {LEAGUE_FILTER.map(l => (
              <button
                key={l}
                onClick={() => setLeague(l)}
                style={{
                  padding:"5px 13px",
                  borderRadius:999,
                  border:`1px solid ${league===l
                    ? (LEAGUES[l]?.color || "#60a5fa") + "50"
                    : "rgba(255,255,255,0.055)"}`,
                  background: league===l
                    ? (LEAGUES[l]?.color || "#60a5fa") + "16"
                    : "rgba(255,255,255,0.018)",
                  color: league===l
                    ? (LEAGUES[l]?.color || "#60a5fa")
                    : "rgba(255,255,255,0.28)",
                  cursor:"pointer", fontSize:11, fontWeight:700,
                  transition:"all 0.15s", letterSpacing:"0.04em",
                }}
              >
                {l==="all" ? "All Leagues" : LEAGUES[l]?.label}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div style={{ color:"#3a5070", fontSize:13, paddingTop:48, textAlign:"center" }}>
              <div style={{
                width:28, height:28, borderRadius:"50%",
                border:"2px solid rgba(96,165,250,0.12)", borderTopColor:"#60a5fa",
                margin:"0 auto 14px",
                animation:"spin 0.8s linear infinite",
              }} />
              Loading fixtures…
            </div>
          ) : error ? (
            <div style={{
              color:"#ff5252", fontSize:13,
              background:"rgba(255,82,82,0.05)", border:"1px solid rgba(255,82,82,0.12)",
              borderRadius:12, padding:"14px 18px",
            }}>
              Failed to load: {error}
              <button onClick={fetchData} style={{
                marginLeft:12, background:"none",
                border:"1px solid rgba(255,82,82,0.25)",
                color:"#ff5252", borderRadius:6,
                padding:"3px 10px", cursor:"pointer", fontSize:11,
              }}>Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ color:"#1e2d3d", fontSize:13, textAlign:"center", paddingTop:56 }}>
              No fixtures found for this filter.
            </div>
          ) : (
            <div style={{
              display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(278px,1fr))",
              gap:10, alignItems:"start",
            }}>
              {grouped.order.map(day => {
                const matches  = grouped.groups[day];
                const dayLive  = matches.filter(f => LIVE_STATUSES.has(f.status)).length;
                return (
                  <React.Fragment key={day}>
                    <DayHeader label={day} liveCount={dayLive} />
                    {matches.map(f => {
                      const m       = cardMode(f.status);
                      const league  = LEAGUES[f.league];
                      const onClick = () => navigate(`/match/${f.fixture_id}`);
                      if (m === "live")     return <LiveCard     key={f.fixture_id} fixture={f} league={league} onClick={onClick} />;
                      if (m === "fulltime") return <FullTimeCard key={f.fixture_id} fixture={f} league={league} onClick={onClick} />;
                      return                      <ScheduledCard key={f.fixture_id} fixture={f} league={league} onClick={onClick} />;
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </>
  );
}