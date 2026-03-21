// ═══════════════════════════════════════════════════════════════════
// StatinSite — Live Match Page
// Three tabs: Lineups | Stats | Commentary
// Connects to:
//   /api/match-intelligence/{id}  — core data, events, stats, lineups
//   /api/match-lineup/{id}        — dedicated lineup endpoint (official or predicted)
//   /api/win-probability/{id}     — Poisson win prob + markets
//   /api/match-momentum/{id}      — per-minute momentum data
//   /api/commentary/{id}          — AI commentary (proxied via backend, uses OPENROUTER_API_KEY)
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

const BACKEND = import.meta.env.VITE_API_BASE_URL || "https://football-stats-lw4b.onrender.com";

// ─── Status helpers ───────────────────────────────────────────────────────────
const LIVE_STATUSES = new Set(["1H","2H","HT","ET","BT","P"]);
const FT_STATUSES   = new Set(["FT","AET","PEN","AWD","WO"]);

function deriveMode(s) {
  if (!s || s === "NS" || s === "TBD" || s === "PST") return "prematch";
  if (LIVE_STATUSES.has(s)) return "live";
  if (FT_STATUSES.has(s))   return "fulltime";
  return "prematch";
}

function fmtMin(elapsed, extra) {
  if (!elapsed) return "";
  return extra ? `${elapsed}+${extra}'` : `${elapsed}'`;
}

function fmtKickoff(iso) {
  if (!iso) return null;
  const d   = new Date(iso);
  const now = new Date();
  const tom = new Date(); tom.setDate(now.getDate() + 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  const t    = d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  if (same(d, now)) return `Today · ${t}`;
  if (same(d, tom)) return `Tomorrow · ${t}`;
  return d.toLocaleDateString([], { weekday:"long", month:"short", day:"numeric" }) + ` · ${t}`;
}

function getStat(statsArr, teamId, key) {
  return statsArr?.find(s => s.team?.id === teamId)
    ?.statistics?.find(s => s.type === key)?.value ?? null;
}

// ─── Team colour mapping — one dominant colour per club, chosen to not clash ─
// Home team gets their primary colour; away team gets their secondary/away kit.
// Liverpool = #c8102e (red), Arsenal = #1a5bab (navy)
// We pick the colour at render time from team id where known, else a default.
const TEAM_COLOURS = {
  // Premier League
  40:  "#c8102e", // Liverpool — red
  42:  "#1a5bab", // Arsenal — navy
  33:  "#6cabdd", // Man United — sky blue (away kit avoids clashing with Liverpool red)
  50:  "#6f263d", // Man City — avoid sky blue clash, use maroon alt
  49:  "#132257", // Chelsea — deep blue
  47:  "#fff200", // Tottenham — on black pitch, use gold
  55:  "#7a263a", // Newcastle — deep claret (away)
  66:  "#95bfe5", // Aston Villa — sky blue (away)
  65:  "#7c2c3b", // West Ham — claret
  51:  "#005daa", // Brighton — blue
  // La Liga
  529: "#004b87", // Barcelona — blue
  541: "#ffffff", // Real Madrid — white
  530: "#cb3524", // Atletico — red
  // Bundesliga
  157: "#d3010c", // Bayern — red
  165: "#fde100", // Dortmund — yellow
  // Serie A
  489: "#000000", // Inter — black
  492: "#f70000", // AC Milan — red
  496: "#000080", // Juventus — dark blue alt
};

function teamColour(teamId, fallback = "#38bdf8") {
  return TEAM_COLOURS[teamId] || fallback;
}

// ─── Global styles injected once ─────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800;900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700;900&display=swap');
  @keyframes lm-livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.18;transform:scale(.5)} }
  @keyframes lm-fadeUp    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lm-scanLine  { 0%{transform:translateX(-100%)} 100%{transform:translateX(700%)} }
  @keyframes lm-barIn     { from{width:0} to{width:var(--w)} }
  @keyframes lm-spin      { to{transform:rotate(360deg)} }
  @keyframes lm-commentIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes lm-tokenPop  {
    0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}
    75%{transform:translate(-50%,-50%) scale(1.06)}
    100%{opacity:1;transform:translate(-50%,-50%) scale(1)}
  }
  .lm-tab { background:none; border:none; cursor:pointer; font-family:'Inter',sans-serif; transition:all .15s; }
  .lm-tab:hover { color:rgba(255,255,255,.85) !important; }
  .lm-stat-bar { animation: lm-barIn .7s cubic-bezier(.22,1,.36,1) both; }
  .lm-tok { position:absolute; transform:translate(-50%,-50%); display:flex; flex-direction:column; align-items:center; gap:3px; cursor:pointer; animation:lm-tokenPop .42s cubic-bezier(.22,1,.36,1) var(--d,0s) both; }
  .lm-tok:hover .lm-tok-disc { transform:scale(1.16); box-shadow:0 0 14px var(--tc), 0 4px 20px rgba(0,0,0,.9); }
  .lm-tok-disc { width:34px; height:34px; border-radius:50%; border:2.5px solid var(--tc); background:#060608; overflow:hidden; flex-shrink:0; transition:transform .18s cubic-bezier(.22,1,.36,1), box-shadow .18s cubic-bezier(.22,1,.36,1); box-shadow:0 2px 12px rgba(0,0,0,.8); }
  .lm-tok-disc.gk { box-shadow:0 0 0 2px rgba(0,0,0,.9), 0 0 0 4px var(--tc), 0 2px 12px rgba(0,0,0,.8); }
  .lm-tok-disc img { width:100%; height:100%; object-fit:cover; object-position:top center; display:block; }
  .lm-tok-lbl { font-size:8px; font-weight:700; color:rgba(255,255,255,.82); text-shadow:0 1px 6px #000; background:rgba(0,0,0,.6); padding:1px 5px; border-radius:3px; white-space:nowrap; pointer-events:none; backdrop-filter:blur(2px); max-width:58px; overflow:hidden; text-overflow:ellipsis; }
  .lm-tok-bar { width:30px; height:2px; border-radius:999px; background:rgba(255,255,255,.06); overflow:hidden; }
  .lm-tok-bar-f { height:100%; border-radius:999px; background:var(--tc); opacity:.5; }
  .lm-comment { display:flex; gap:10px; padding:11px 0; border-bottom:1px solid rgba(255,255,255,.03); animation:lm-commentIn .3s cubic-bezier(.22,1,.36,1) both; }
  .lm-comment:last-child { border:none; }
  .lm-rt-row { border-bottom:1px solid rgba(255,255,255,.025); transition:background .12s; }
  .lm-rt-row:hover { background:rgba(255,255,255,.02); }
`;

// ─── Shared atoms ─────────────────────────────────────────────────────────────
function LiveDot() {
  return (
    <span style={{
      width:6, height:6, borderRadius:"50%", background:"#ef4444", flexShrink:0,
      animation:"lm-livePulse 1.5s ease-in-out infinite",
      boxShadow:"0 0 8px rgba(239,68,68,.8)", display:"inline-block",
    }} />
  );
}

function Spinner({ size = 24 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      border:"2px solid rgba(255,255,255,.06)",
      borderTopColor:"rgba(255,255,255,.3)",
      animation:"lm-spin .7s linear infinite",
    }} />
  );
}

function StatBar({ label, home, away, homeColor, awayColor }) {
  const hN  = parseFloat(String(home ?? "0").replace("%","")) || 0;
  const aN  = parseFloat(String(away ?? "0").replace("%","")) || 0;
  const tot = hN + aN || 1;
  const hp  = (hN / tot) * 100;
  const hc  = homeColor || "rgba(255,255,255,.3)";
  const ac  = awayColor || "rgba(255,255,255,.18)";
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:13, fontWeight:800, color:"#e2e8f0", fontFamily:"'JetBrains Mono',monospace", minWidth:40 }}>{home ?? "–"}</span>
        <span style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,.28)", letterSpacing:".06em", textTransform:"uppercase", textAlign:"center", flex:1 }}>{label}</span>
        <span style={{ fontSize:13, fontWeight:800, color:"#e2e8f0", fontFamily:"'JetBrains Mono',monospace", minWidth:40, textAlign:"right" }}>{away ?? "–"}</span>
      </div>
      <div style={{ display:"flex", height:3, borderRadius:3, overflow:"hidden", background:"rgba(255,255,255,.05)" }}>
        <div className="lm-stat-bar" style={{ width:`${hp}%`, "--w":`${hp}%`, background:hc, borderRadius:"3px 0 0 3px" }} />
        <div style={{ width:`${100-hp}%`, background:ac, borderRadius:"0 3px 3px 0" }} />
      </div>
    </div>
  );
}

// ─── MATCH HEADER (used for all modes) ───────────────────────────────────────
function MatchHeader({ fixture, homeTeam, awayTeam, score, status, mode, stats, events }) {
  const isLive = mode === "live";
  const isFT   = mode === "fulltime";
  const isPre  = mode === "prematch";
  const hGoals = score?.fulltime?.home ?? score?.halftime?.home ?? null;
  const aGoals = score?.fulltime?.away ?? score?.halftime?.away ?? null;
  const hasScore = hGoals !== null && aGoals !== null;
  const homeWin = hasScore && hGoals > aGoals;
  const awayWin = hasScore && aGoals > hGoals;
  const kickoff = fmtKickoff(fixture?.date);

  const hc = teamColour(homeTeam?.id, "#38bdf8");
  const ac = teamColour(awayTeam?.id, "#fb923c");

  const hXG    = getStat(stats, homeTeam?.id, "expected_goals");
  const aXG    = getStat(stats, awayTeam?.id, "expected_goals");
  const hPoss  = getStat(stats, homeTeam?.id, "Ball Possession");
  const aPoss  = getStat(stats, awayTeam?.id, "Ball Possession");
  const hShots = getStat(stats, homeTeam?.id, "Total Shots");
  const aShots = getStat(stats, awayTeam?.id, "Total Shots");

  // Flattened event strip (goals + cards)
  const keyEvents = (events || []).filter(e => {
    const t = (e.type||"").toLowerCase();
    const d = (e.detail||"").toLowerCase();
    return t === "goal" || (t === "card");
  }).slice(0, 8);

  return (
    <div style={{ background:"rgba(4,4,6,.98)", borderBottom:"1px solid rgba(255,255,255,.05)" }}>

      {/* Live bar */}
      {isLive && (
        <div style={{
          position:"relative", overflow:"hidden",
          background:"linear-gradient(90deg,rgba(239,68,68,.1),rgba(239,68,68,.04))",
          borderBottom:"1px solid rgba(239,68,68,.1)",
          padding:"6px 18px", display:"flex", alignItems:"center", gap:8,
        }}>
          <div style={{ position:"absolute", top:0, left:0, width:"30%", height:"100%", background:"linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent)", animation:"lm-scanLine 3s ease-in-out infinite" }} />
          <LiveDot />
          <span style={{ fontFamily:"'Sora',sans-serif", fontSize:9, fontWeight:900, letterSpacing:".14em", textTransform:"uppercase", color:"#ef4444" }}>Live</span>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, fontWeight:700, color:"rgba(239,68,68,.65)" }}>
            · {fmtMin(status?.elapsed, status?.extra)}
          </span>
          <span style={{ marginLeft:"auto", fontSize:9, color:"rgba(255,255,255,.2)", fontWeight:600 }}>
            {fixture?.league?.name}{fixture?.league?.round ? ` · ${fixture.league.round}` : ""}
          </span>
        </div>
      )}

      {!isLive && (
        <div style={{ padding:"8px 18px", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {fixture?.league?.logo && (
            <img src={fixture.league.logo} alt="" width={14} height={14} style={{ objectFit:"contain", opacity:.6 }} />
          )}
          <span style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,.2)", letterSpacing:".08em", textTransform:"uppercase" }}>
            {fixture?.league?.name}{fixture?.league?.round ? ` · ${fixture.league.round}` : ""}
          </span>
          {isFT && (
            <span style={{ fontSize:9, fontWeight:900, color:"rgba(255,255,255,.3)", background:"rgba(255,255,255,.04)", borderRadius:999, padding:"2px 9px", letterSpacing:".1em" }}>
              FULL TIME
            </span>
          )}
          {status?.short === "HT" && (
            <span style={{ fontSize:9, fontWeight:900, color:"#f59e0b", background:"rgba(245,158,11,.08)", borderRadius:999, padding:"2px 9px", letterSpacing:".1em" }}>
              HALF TIME
            </span>
          )}
        </div>
      )}

      {/* Teams + score */}
      <div style={{ padding:"16px 20px 14px", display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:14 }}>
        {/* Home */}
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:44, height:44, borderRadius:10, background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
              {homeTeam?.logo && (
                <img src={homeTeam.logo} alt="" width={32} height={32} style={{ objectFit:"contain" }} onError={e => e.currentTarget.style.display="none"} />
              )}
            </div>
            <div>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:900, letterSpacing:"-.02em", color:"#fff", filter: homeWin ? `drop-shadow(0 0 10px ${hc}66)` : "none" }}>
                {homeTeam?.name}
              </div>
            </div>
          </div>
          {/* Form pips */}
          <div style={{ display:"flex", gap:3 }}>
            {["W","W","D","W","L"].map((r,i) => (
              <div key={i} style={{ width:18, height:4, borderRadius:2, background: r==="W"?"rgba(52,211,153,.5)":r==="D"?"rgba(245,158,11,.4)":"rgba(248,113,113,.4)" }} />
            ))}
          </div>
        </div>

        {/* Score / VS */}
        <div style={{ textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
          {isPre ? (
            <>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:16, fontWeight:900, color:"rgba(255,255,255,.15)", letterSpacing:".05em" }}>VS</div>
              {kickoff && <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{kickoff}</div>}
              {fixture?.venue?.name && <div style={{ fontSize:9, color:"rgba(255,255,255,.18)", maxWidth:140, textAlign:"center" }}>{fixture.venue.name}</div>}
            </>
          ) : (
            <>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:46, fontWeight:900, letterSpacing:"-3px", color:"#fff", lineHeight:1 }}>
                <span style={{ color: homeWin ? hc : awayWin ? "rgba(255,255,255,.3)" : "#fff" }}>{hGoals}</span>
                <span style={{ color:"rgba(255,255,255,.15)", fontWeight:400, letterSpacing:0 }}> – </span>
                <span style={{ color: awayWin ? ac : homeWin ? "rgba(255,255,255,.3)" : "#fff" }}>{aGoals}</span>
              </div>
              {score?.halftime && isFT && (
                <div style={{ fontSize:9, color:"rgba(255,255,255,.2)", fontFamily:"'JetBrains Mono',monospace" }}>
                  HT {score.halftime.home}–{score.halftime.away}
                </div>
              )}
              {isLive && <div style={{ padding:"2px 9px", borderRadius:999, background:"rgba(239,68,68,.07)", border:"1px solid rgba(239,68,68,.15)", fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:900, color:"#f87171" }}>{fmtMin(status?.elapsed)}</div>}
              {fixture?.venue?.name && <div style={{ fontSize:9, color:"rgba(255,255,255,.16)" }}>{fixture.venue.name}</div>}
            </>
          )}
        </div>

        {/* Away */}
        <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexDirection:"row-reverse" }}>
            <div style={{ width:44, height:44, borderRadius:10, background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
              {awayTeam?.logo && (
                <img src={awayTeam.logo} alt="" width={32} height={32} style={{ objectFit:"contain" }} onError={e => e.currentTarget.style.display="none"} />
              )}
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:900, letterSpacing:"-.02em", color:"#fff", filter: awayWin ? `drop-shadow(0 0 10px ${ac}66)` : "none" }}>
                {awayTeam?.name}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:3, justifyContent:"flex-end" }}>
            {["W","W","W","D","L"].map((r,i) => (
              <div key={i} style={{ width:18, height:4, borderRadius:2, background: r==="W"?"rgba(52,211,153,.5)":r==="D"?"rgba(245,158,11,.4)":"rgba(248,113,113,.4)" }} />
            ))}
          </div>
        </div>
      </div>

      {/* Win probability bar */}
      {!isPre && (hXG || hPoss) && (
        <div style={{ padding:"0 18px 12px", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:900, color:`${hc}cc` }}>
            {hPoss ?? `${hXG} xG`}
          </span>
          <div style={{ flex:1, height:4, borderRadius:999, overflow:"hidden", display:"flex", gap:1, background:"rgba(255,255,255,.04)" }}>
            {(() => {
              const hp = parseFloat(String(hPoss||"50").replace("%",""));
              const ap = parseFloat(String(aPoss||"50").replace("%",""));
              const tot = hp + ap || 100;
              const hw = (hp/tot)*100;
              return (
                <>
                  <div style={{ width:`${hw}%`, background:`${hc}aa`, borderRadius:"999px 0 0 999px" }} />
                  <div style={{ width:`${100-hw}%`, background:`${ac}88`, borderRadius:"0 999px 999px 0" }} />
                </>
              );
            })()}
          </div>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:900, color:`${ac}cc` }}>
            {aPoss ?? `${aXG} xG`}
          </span>
        </div>
      )}

      {/* Event strip */}
      {keyEvents.length > 0 && (
        <div style={{ borderTop:"1px solid rgba(255,255,255,.04)", padding:"8px 14px", display:"flex", gap:0, overflowX:"auto", scrollbarWidth:"none" }}>
          {keyEvents.map((ev,i) => {
            const t = (ev.type||"").toLowerCase();
            const d = (ev.detail||"").toLowerCase();
            const isGoal = t === "goal";
            const isYellow = t === "card" && d.includes("yellow");
            const isRed = t === "card" && d.includes("red");
            const isHome = ev.team?.id === homeTeam?.id;
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 10px", borderRight:"1px solid rgba(255,255,255,.04)", flexShrink:0 }}>
                <div style={{ width:7, height:7, borderRadius: isYellow||isRed ? 2 : "50%", flexShrink:0,
                  background: isGoal ? (isHome ? hc : ac) : isYellow ? "#f59e0b" : "#ef4444",
                  boxShadow: isGoal ? `0 0 5px ${isHome ? hc : ac}` : "none",
                }} />
                <span style={{ fontSize:10, fontWeight:700, color:"#fff" }}>{ev.player?.name?.split(" ").pop()}</span>
                <span style={{ fontSize:8, fontWeight:700, color:"rgba(255,255,255,.3)", fontFamily:"'JetBrains Mono',monospace" }}>{fmtMin(ev.time?.elapsed)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── PITCH COMPONENT ─────────────────────────────────────────────────────────
// Formation coordinate tables — mathematically calculated for 1100×580 viewBox
// Home half: x 20–540, Away half: x 560–1080
// No green blobs, no animations on player tokens (removed per request)

const FORMATION_COORDS = {
  // [leftX%, topY%] for each position in order: GK, DEF(L→R), MID(L→R), FWD(L→R)
  // Home side uses these directly, away side mirrors x (100 - x) and is flipped in y for correct attacking direction
  "4-3-3": {
    left: [
      [5.3, 50],                           // GK
      [18.2,14.1],[18.2,34.1],[18.2,65.9],[18.2,85.9], // DEF: RB CB CB LB
      [32.3,25],  [32.3,50],  [32.3,75],  // MID
      [44.6,16.2],[44.6,50],  [44.6,83.8],// FWD: RW ST LW
    ],
  },
  "4-2-3-1": {
    left: [
      [5.3, 50],
      [18.2,14.1],[18.2,34.1],[18.2,65.9],[18.2,85.9],
      [29.1,37.1],[29.1,62.9],             // CDM
      [40.0,21.0],[40.0,50],  [40.0,79.0],// CAM row
      [48.0,50],                           // ST
    ],
  },
  "4-4-2": {
    left: [
      [5.3, 50],
      [18.2,14.1],[18.2,34.1],[18.2,65.9],[18.2,85.9],
      [32.3,14.1],[32.3,38],  [32.3,62],  [32.3,85.9],
      [44.6,33],  [44.6,67],
    ],
  },
  "3-5-2": {
    left: [
      [5.3, 50],
      [18.2,22], [18.2,50],  [18.2,78],
      [30.0,8],  [30.0,31],  [30.0,50],  [30.0,69],  [30.0,92],
      [44.6,33], [44.6,67],
    ],
  },
  "3-4-3": {
    left: [
      [5.3, 50],
      [18.2,22], [18.2,50], [18.2,78],
      [32.3,12], [32.3,38], [32.3,62], [32.3,88],
      [44.6,16], [44.6,50], [44.6,84],
    ],
  },
  "5-3-2": {
    left: [
      [5.3, 50],
      [18.2,8],  [18.2,27], [18.2,50], [18.2,73], [18.2,92],
      [32.3,25], [32.3,50], [32.3,75],
      [44.6,33], [44.6,67],
    ],
  },
  "4-5-1": {
    left: [
      [5.3, 50],
      [18.2,14.1],[18.2,34.1],[18.2,65.9],[18.2,85.9],
      [32.3,8],  [32.3,28],  [32.3,50],  [32.3,72],  [32.3,92],
      [44.6,50],
    ],
  },
};

function getFormationCoords(formation, side) {
  const f = FORMATION_COORDS[formation] || FORMATION_COORDS["4-3-3"];
  const coords = f.left;
  if (side === "home") return coords;
  // Mirror for away team: x = 100 - x, keep y the same
  // But we want GK on the right side, so x = 100 - x
  return coords.map(([x, y]) => [100 - x, y]);
}

function PitchLineup({ homeLineup, awayLineup, homeTeam, awayTeam }) {
  const hc = teamColour(homeTeam?.id, "#c8102e");
  const ac = teamColour(awayTeam?.id, "#1a5bab");

  const homeFormation = homeLineup?.formation || "4-3-3";
  const awayFormation = awayLineup?.formation || "4-3-3";
  const homePlayers   = (homeLineup?.starting_xi || homeLineup?.start_xi || homeLineup?.startXI || []);
  const awayPlayers   = (awayLineup?.starting_xi || awayLineup?.start_xi || awayLineup?.startXI || []);
  const homeCoords    = getFormationCoords(homeFormation, "home");
  const awayCoords    = getFormationCoords(awayFormation, "away");

  const normalise = (p) => {
    // Handle both /match-lineup and /match-intelligence lineup shapes
    if (p?.player) return p.player;
    return p;
  };

  const renderTokens = (players, coords, colour, side) =>
    players.slice(0, 11).map((raw, i) => {
      const p   = normalise(raw);
      const pos = coords[i];
      if (!pos) return null;
      const [lp, tp] = pos;
      const isGK = (p?.pos||p?.position||"").toUpperCase().startsWith("G") || i === 0;
      const delay = 0.04 + i * 0.022;
      const photoUrl = p?.photo || (p?.id ? `https://media.api-sports.io/football/players/${p.id}.png` : null);
      const shortName = (p?.name || "").split(" ").pop().slice(0, 10);
      const conf = p?.confidence;
      return (
        <div
          key={`${side}-${i}`}
          className="lm-tok"
          style={{ left:`${lp}%`, top:`${tp}%`, "--tc":colour, "--d":`${delay}s` }}
          title={p?.name}
        >
          <div className={`lm-tok-disc${isGK ? " gk" : ""}`} style={{ "--tc":colour }}>
            {photoUrl && (
              <img
                src={photoUrl}
                alt=""
                onError={e => { e.currentTarget.style.display = "none"; }}
              />
            )}
          </div>
          <div className="lm-tok-lbl">{shortName}</div>
          {conf !== undefined && (
            <div className="lm-tok-bar">
              <div className="lm-tok-bar-f" style={{ width:`${conf}%`, "--tc":colour }} />
            </div>
          )}
        </div>
      );
    });

  const isPredicted = homeLineup?.predicted || awayLineup?.predicted ||
    homeLineup?.mode === "predicted" || awayLineup?.mode === "predicted";
  const homeConf = homeLineup?.confidence;
  const awayConf = awayLineup?.confidence;

  return (
    <div>
      {/* Legend */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9 }}>
        <div style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px 4px 5px", borderRadius:999, border:"1px solid rgba(255,255,255,.06)", background:"rgba(255,255,255,.015)" }}>
          <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${hc}`, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            {homeTeam?.logo && <img src={homeTeam.logo} alt="" width={16} height={16} style={{ objectFit:"contain" }} onError={e=>e.currentTarget.style.display="none"} />}
          </div>
          <span style={{ fontSize:9.5, fontWeight:700, color:"#fff" }}>{homeTeam?.name}</span>
          <span style={{ fontSize:8.5, color:"rgba(255,255,255,.35)" }}>{homeFormation}</span>
          {homeConf !== undefined && <span style={{ fontSize:7.5, color:"rgba(52,211,153,.7)", fontFamily:"'JetBrains Mono',monospace" }}>{homeConf}%</span>}
        </div>
        <div style={{ width:1, height:20, background:"rgba(255,255,255,.05)" }} />
        <div style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px 4px 5px", borderRadius:999, border:"1px solid rgba(255,255,255,.06)", background:"rgba(255,255,255,.015)" }}>
          <div style={{ width:20, height:20, borderRadius:"50%", border:`2px solid ${ac}`, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            {awayTeam?.logo && <img src={awayTeam.logo} alt="" width={16} height={16} style={{ objectFit:"contain" }} onError={e=>e.currentTarget.style.display="none"} />}
          </div>
          <span style={{ fontSize:9.5, fontWeight:700, color:"#fff" }}>{awayTeam?.name}</span>
          <span style={{ fontSize:8.5, color:"rgba(255,255,255,.35)" }}>{awayFormation}</span>
          {awayConf !== undefined && <span style={{ fontSize:7.5, color:"rgba(52,211,153,.7)", fontFamily:"'JetBrains Mono',monospace" }}>{awayConf}%</span>}
        </div>
        {isPredicted && (
          <span style={{ marginLeft:"auto", fontSize:8, color:"rgba(245,158,11,.6)", fontFamily:"'JetBrains Mono',monospace", fontWeight:800, letterSpacing:".05em" }}>
            PREDICTED
          </span>
        )}
        <span style={{ fontSize:8, color:"rgba(255,255,255,.13)", marginLeft: isPredicted ? 6 : "auto" }}>
          Double ring = GK
        </span>
      </div>

      {/* Pitch */}
      <div style={{ position:"relative", borderRadius:12, overflow:"hidden", border:"1px solid rgba(255,255,255,.04)" }}>
        <svg
          style={{ display:"block", width:"100%" }}
          viewBox="0 0 1100 580"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Base + stripes */}
          <rect width="1100" height="580" fill="#010903" />
          <rect x="0"   y="0" width="137.5" height="580" fill="rgba(255,255,255,.009)" />
          <rect x="275" y="0" width="137.5" height="580" fill="rgba(255,255,255,.009)" />
          <rect x="550" y="0" width="137.5" height="580" fill="rgba(255,255,255,.009)" />
          <rect x="825" y="0" width="137.5" height="580" fill="rgba(255,255,255,.009)" />
          {/* Pitch lines */}
          <rect x="20" y="20" width="1060" height="540" rx="3" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1.5" />
          <line x1="550" y1="20" x2="550" y2="560" stroke="rgba(255,255,255,.22)" strokeWidth="1.5" />
          <circle cx="550" cy="290" r="76" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1.5" />
          <circle cx="550" cy="290" r="3.5" fill="rgba(255,255,255,.45)" />
          {/* Home box */}
          <rect x="20" y="138" width="152" height="304" fill="none" stroke="rgba(255,255,255,.17)" strokeWidth="1.2" />
          <rect x="20" y="218" width="58"  height="144" fill="none" stroke="rgba(255,255,255,.11)" strokeWidth="1" />
          <circle cx="128" cy="290" r="2.5" fill="rgba(255,255,255,.4)" />
          <path d="M172,224 A76,76 0 0,1 172,356" fill="none" stroke="rgba(255,255,255,.11)" strokeWidth="1" />
          {/* Away box */}
          <rect x="928" y="138" width="152" height="304" fill="none" stroke="rgba(255,255,255,.17)" strokeWidth="1.2" />
          <rect x="1022" y="218" width="58" height="144" fill="none" stroke="rgba(255,255,255,.11)" strokeWidth="1" />
          <circle cx="972" cy="290" r="2.5" fill="rgba(255,255,255,.4)" />
          <path d="M928,224 A76,76 0 0,0 928,356" fill="none" stroke="rgba(255,255,255,.11)" strokeWidth="1" />
          {/* Corners */}
          <path d="M20,20 Q31,20 31,31"         fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="1.2" />
          <path d="M1080,20 Q1069,20 1069,31"   fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="1.2" />
          <path d="M20,560 Q31,560 31,549"       fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="1.2" />
          <path d="M1080,560 Q1069,560 1069,549" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="1.2" />
          {/* Goals */}
          <rect x="0"    y="248" width="20" height="84" rx="1" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.18)" strokeWidth="1.2" />
          <rect x="1080" y="248" width="20" height="84" rx="1" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.18)" strokeWidth="1.2" />
          {/* Watermarks */}
          <text x="196" y="290" textAnchor="middle" fontFamily="'Sora',sans-serif" fontSize="9" fontWeight="900" letterSpacing="4" fill="rgba(255,255,255,.05)" transform="rotate(-90 196 290)">{homeTeam?.name?.toUpperCase()}</text>
          <text x="904" y="290" textAnchor="middle" fontFamily="'Sora',sans-serif" fontSize="9" fontWeight="900" letterSpacing="4" fill="rgba(255,255,255,.05)" transform="rotate(90 904 290)">{awayTeam?.name?.toUpperCase()}</text>
        </svg>

        {/* Formation labels */}
        <div style={{ position:"absolute", left:24, top:7, fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:900, letterSpacing:".1em", color:"rgba(255,255,255,.13)", pointerEvents:"none" }}>{homeFormation}</div>
        <div style={{ position:"absolute", right:24, top:7, fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:900, letterSpacing:".1em", color:"rgba(255,255,255,.13)", pointerEvents:"none" }}>{awayFormation}</div>

        {/* Player tokens overlay */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
          {renderTokens(homePlayers, homeCoords, hc, "home")}
          {renderTokens(awayPlayers, awayCoords, ac, "away")}
        </div>
      </div>

      {/* Bench */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:9 }}>
        {[
          { side:"home", lineup:homeLineup, colour:hc, team:homeTeam },
          { side:"away", lineup:awayLineup, colour:ac, team:awayTeam },
        ].map(({ side, lineup, colour, team }) => {
          const bench = lineup?.bench || lineup?.substitutes || lineup?.subs || [];
          if (!bench.length) return null;
          return (
            <div key={side} style={{ background:"rgba(255,255,255,.012)", border:"1px solid rgba(255,255,255,.048)", borderRadius:9, padding:"8px 10px" }}>
              <div style={{ fontSize:7.5, fontWeight:900, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,255,255,.13)", marginBottom:6, display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ width:5, height:5, borderRadius:"50%", border:`1.5px solid ${colour}` }} />
                {team?.name} Bench
              </div>
              <div style={{ display:"flex", gap:4, overflowX:"auto", scrollbarWidth:"none", paddingBottom:2 }}>
                {bench.slice(0,7).map((raw,i) => {
                  const p = raw?.player || raw;
                  const photo = p?.photo || (p?.id ? `https://media.api-sports.io/football/players/${p.id}.png` : null);
                  return (
                    <div key={i} style={{ flexShrink:0, display:"flex", alignItems:"center", gap:4, padding:"3px 7px 3px 3px", borderRadius:999, background:"rgba(255,255,255,.014)", border:"1px solid rgba(255,255,255,.05)", cursor:"default" }}>
                      <div style={{ width:20, height:20, borderRadius:"50%", overflow:"hidden", background:"#111", border:"1px solid rgba(255,255,255,.07)", flexShrink:0 }}>
                        {photo && <img src={photo} alt="" width="20" height="20" style={{ objectFit:"cover", objectPosition:"top" }} onError={e=>e.currentTarget.style.display="none"} />}
                      </div>
                      <span style={{ fontSize:8, fontWeight:700, color:"rgba(255,255,255,.5)", whiteSpace:"nowrap" }}>
                        {(p?.name||"").split(" ").pop().slice(0,12)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unavailable */}
      {(() => {
        const injuries = [...(homeLineup?.injuries||[]), ...(awayLineup?.injuries||[]), ...(homeLineup?.doubts||[]), ...(awayLineup?.doubts||[])];
        if (!injuries.length) return null;
        return (
          <div style={{ marginTop:8, background:"rgba(248,113,113,.02)", border:"1px solid rgba(248,113,113,.08)", borderRadius:9, padding:"8px 10px" }}>
            <div style={{ fontSize:7.5, fontWeight:900, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(248,113,113,.3)", marginBottom:5 }}>Unavailable</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
              {injuries.slice(0,12).map((inj,i) => (
                <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"2px 7px", borderRadius:4, background:"rgba(248,113,113,.05)", border:"1px solid rgba(248,113,113,.1)" }}>
                  <span style={{ fontSize:8.5, fontWeight:700, color:"rgba(248,113,113,.65)" }}>{inj.name}</span>
                  <span style={{ fontSize:7.5, color:"rgba(248,113,113,.3)", fontFamily:"'JetBrains Mono',monospace" }}>{inj.type||inj.reason||"Injury"}</span>
                </span>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── STATS PANEL ─────────────────────────────────────────────────────────────
function StatsPanel({ stats, homeTeam, awayTeam, winProb, momentumData, events }) {
  const hc = teamColour(homeTeam?.id, "#c8102e");
  const ac = teamColour(awayTeam?.id, "#1a5bab");

  const hStats = stats?.find(s => s.team?.id === homeTeam?.id)?.statistics || [];
  const aStats = stats?.find(s => s.team?.id === awayTeam?.id)?.statistics || [];

  const KEY_STATS = [
    "Ball Possession","Total Shots","Shots on Goal","Shots insidebox",
    "Corner Kicks","Fouls","Yellow Cards","Red Cards",
    "Passes %","Blocked Shots","expected_goals",
  ];
  const rows = KEY_STATS.map(key => {
    const hVal = hStats.find(s => s.type === key)?.value ?? null;
    const aVal = aStats.find(s => s.type === key)?.value ?? null;
    if (hVal === null && aVal === null) return null;
    return { label: key === "expected_goals" ? "xG" : key.replace("insidebox","inside box").replace(" %","%"), home:hVal, away:aVal };
  }).filter(Boolean);

  const Section = ({ title, children }) => (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:8, fontWeight:900, letterSpacing:".12em", textTransform:"uppercase", color:"rgba(255,255,255,.13)", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
        <div style={{ width:14, height:1.5, background:"rgba(255,255,255,.2)" }} />
        {title}
      </div>
      {children}
    </div>
  );

  // xG block
  const pm     = winProb?.pre_match;
  const mkt    = winProb?.markets;
  const xgHome = pm?.xg_home;
  const xgAway = pm?.xg_away;

  return (
    <div style={{ padding:"18px 0" }}>

      {/* xG + Markets */}
      {(xgHome || xgAway) && (
        <Section title="Expected Goals">
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"rgba(255,255,255,.015)", border:"1px solid rgba(255,255,255,.05)", borderRadius:10, marginBottom:10 }}>
            <div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:22, fontWeight:900, color:`${hc}cc`, lineHeight:1 }}>{xgHome}</div>
              <div style={{ fontSize:8, color:"rgba(255,255,255,.3)", fontWeight:600 }}>{homeTeam?.name} xG</div>
            </div>
            <div style={{ flex:1, textAlign:"center", fontSize:9, color:"rgba(255,255,255,.2)", fontWeight:700 }}>Expected Goals</div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:22, fontWeight:900, color:`${ac}cc`, lineHeight:1 }}>{xgAway}</div>
              <div style={{ fontSize:8, color:"rgba(255,255,255,.3)", fontWeight:600 }}>{awayTeam?.name} xG</div>
            </div>
          </div>
          {mkt && (
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {[
                { label:"BTTS",   val: mkt.btts },
                { label:"O2.5G",  val: mkt.over_2_5 },
                { label:"O1.5G",  val: mkt.over_1_5 },
                { label:"CS Home",val: mkt.clean_sheet_home },
                { label:"CS Away",val: mkt.clean_sheet_away },
              ].filter(m => m.val != null).map(m => {
                const pct = Math.round(m.val > 1 ? m.val : m.val * 100);
                return (
                  <span key={m.label} style={{ padding:"3px 10px", borderRadius:999, fontSize:9, fontWeight:800, fontFamily:"'JetBrains Mono',monospace", letterSpacing:".05em", border:"1px solid rgba(255,255,255,.07)", background:"rgba(255,255,255,.025)", color:"rgba(255,255,255,.6)" }}>
                    {m.label} <span style={{ color:"rgba(255,255,255,.9)" }}>{pct}%</span>
                  </span>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {/* Win probability */}
      {pm && (
        <Section title="Win Probability">
          <div style={{ padding:"10px 14px", background:"rgba(255,255,255,.015)", border:"1px solid rgba(255,255,255,.05)", borderRadius:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:900, color:`${hc}cc` }}>{pm.p_home_win}%</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, fontWeight:700, color:"rgba(255,255,255,.3)" }}>{pm.p_draw}%</span>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:15, fontWeight:900, color:`${ac}cc` }}>{pm.p_away_win}%</span>
            </div>
            <div style={{ display:"flex", height:5, borderRadius:999, overflow:"hidden", gap:1 }}>
              <div style={{ width:`${pm.p_home_win}%`, background:`${hc}99`, borderRadius:"999px 0 0 999px" }} />
              <div style={{ width:`${pm.p_draw}%`, background:"rgba(255,255,255,.15)" }} />
              <div style={{ width:`${pm.p_away_win}%`, background:`${ac}88`, borderRadius:"0 999px 999px 0" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:5, fontSize:8, fontWeight:600, color:"rgba(255,255,255,.3)" }}>
              <span>{homeTeam?.name}</span>
              <span>Draw</span>
              <span>{awayTeam?.name}</span>
            </div>
          </div>
        </Section>
      )}

      {/* Momentum periods */}
      {momentumData?.periods?.length > 0 && (
        <Section title="Match Momentum">
          <div style={{ background:"rgba(255,255,255,.015)", border:"1px solid rgba(255,255,255,.05)", borderRadius:10, padding:"12px 14px" }}>
            <div style={{ display:"flex", gap:4 }}>
              {momentumData.periods.slice(0,6).map((p,i) => (
                <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3, padding:"5px 3px", borderRadius:5, background:"rgba(255,255,255,.015)", border:"1px solid rgba(255,255,255,.04)" }}>
                  <div style={{ fontSize:7, fontWeight:800, letterSpacing:".06em", color:"rgba(255,255,255,.2)" }}>{p.label}</div>
                  <div style={{ fontSize:8, fontWeight:900, fontFamily:"'JetBrains Mono',monospace", color: p.dominant==="home" ? `${hc}cc` : p.dominant==="away" ? `${ac}cc` : "rgba(255,255,255,.3)" }}>
                    {p.dominant === "home" ? homeTeam?.name?.split(" ").pop() : p.dominant === "away" ? awayTeam?.name?.split(" ").pop() : "Even"}
                  </div>
                </div>
              ))}
            </div>
            {momentumData.overall && (
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10 }}>
                <span style={{ fontSize:9, fontWeight:700, color:`${hc}cc`, fontFamily:"'JetBrains Mono',monospace" }}>{momentumData.overall.home_pct}%</span>
                <div style={{ flex:1, height:3, borderRadius:999, overflow:"hidden", display:"flex" }}>
                  <div style={{ width:`${momentumData.overall.home_pct}%`, background:`${hc}88`, borderRadius:"999px 0 0 999px" }} />
                  <div style={{ width:`${momentumData.overall.away_pct}%`, background:`${ac}77`, borderRadius:"0 999px 999px 0" }} />
                </div>
                <span style={{ fontSize:9, fontWeight:700, color:`${ac}cc`, fontFamily:"'JetBrains Mono',monospace" }}>{momentumData.overall.away_pct}%</span>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Match stats bars */}
      {rows.length > 0 && (
        <Section title="Match Statistics">
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {rows.map(r => <StatBar key={r.label} label={r.label} home={r.home} away={r.away} homeColor={`${hc}88`} awayColor={`${ac}77`} />)}
          </div>
        </Section>
      )}

      {/* Events timeline */}
      {events?.length > 0 && (
        <Section title="Match Events">
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {events.map((ev, i) => {
              const isHome = ev.team?.id === homeTeam?.id;
              const min    = fmtMin(ev.time?.elapsed, ev.time?.extra);
              const t      = (ev.type||"").toLowerCase();
              const d      = (ev.detail||"").toLowerCase();
              const isGoal = t === "goal";
              const isYellow = t === "card" && d.includes("yellow");
              const isRed    = t === "card" && d.includes("red");
              const isSub    = t === "subst";
              return (
                <div key={i} style={{
                  display:"grid", gridTemplateColumns:"1fr 52px 1fr",
                  gap:8, alignItems:"center", padding:"7px 0",
                  borderBottom:"1px solid rgba(255,255,255,.025)",
                  borderLeft: isGoal ? `3px solid ${isHome ? hc : ac}` : isYellow ? "3px solid #f59e0b" : isRed ? "3px solid #ef4444" : isSub ? "3px solid rgba(255,255,255,.15)" : "3px solid transparent",
                  background: isGoal ? "rgba(52,211,153,.03)" : "transparent",
                  paddingLeft: 8, borderRadius:4,
                }}>
                  {isHome ? (
                    <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end" }}>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{ev.player?.name}</div>
                        {ev.assist?.name && <div style={{ fontSize:10, color:"rgba(255,255,255,.28)" }}>assist: {ev.assist.name}</div>}
                        {ev.detail && <div style={{ fontSize:9, color:"rgba(255,255,255,.2)", fontStyle:"italic" }}>{ev.detail}</div>}
                      </div>
                      <div style={{ width:9, height:9, borderRadius: isYellow||isRed ? 2 : "50%", flexShrink:0, background: isGoal ? hc : isYellow ? "#f59e0b" : isRed ? "#ef4444" : "rgba(255,255,255,.2)" }} />
                    </div>
                  ) : <div />}
                  <div style={{ textAlign:"center" }}>
                    <span style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,.35)", fontFamily:"'JetBrains Mono',monospace", background:"rgba(255,255,255,.06)", borderRadius:4, padding:"2px 6px" }}>{min}</span>
                  </div>
                  {!isHome ? (
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:9, height:9, borderRadius: isYellow||isRed ? 2 : "50%", flexShrink:0, background: isGoal ? ac : isYellow ? "#f59e0b" : isRed ? "#ef4444" : "rgba(255,255,255,.2)" }} />
                      <div>
                        <div style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{ev.player?.name}</div>
                        {ev.assist?.name && <div style={{ fontSize:10, color:"rgba(255,255,255,.28)" }}>assist: {ev.assist.name}</div>}
                        {ev.detail && <div style={{ fontSize:9, color:"rgba(255,255,255,.2)", fontStyle:"italic" }}>{ev.detail}</div>}
                      </div>
                    </div>
                  ) : <div />}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Player ratings */}
      {(() => {
        // players come from the intelligence response players block
        return null; // rendered separately if passed in
      })()}
    </div>
  );
}

// ─── COMMENTARY PANEL ────────────────────────────────────────────────────────
function CommentaryPanel({ homeTeam, awayTeam, score, events, stats, momentumData, fixtureId, mode }) {
  const [feed,      setFeed]    = useState([]);
  const [loading,   setLoading] = useState(false);
  const [statusTxt, setStatus]  = useState("");
  const tickRef = useRef(null);

  // Build initial feed from real events when component mounts
  useEffect(() => {
    if (!events?.length) return;
    const seeded = events.map(ev => {
      const t = (ev.type||"").toLowerCase();
      const d = (ev.detail||"").toLowerCase();
      return {
        minute:  fmtMin(ev.time?.elapsed, ev.time?.extra),
        type:    t === "goal" ? "goal" : t === "card" && d.includes("yellow") ? "yellow" : t === "card" && d.includes("red") ? "red_card" : t === "subst" ? "sub" : "info",
        isHome:  ev.team?.id === homeTeam?.id,
        text:    buildEventText(ev, homeTeam, awayTeam),
        seeded:  true,
      };
    }).reverse();
    setFeed(seeded);
  }, [events]);

  function buildEventText(ev, homeTeam, awayTeam) {
    const t      = (ev.type||"").toLowerCase();
    const d      = (ev.detail||"").toLowerCase();
    const player = ev.player?.name || "Unknown";
    const assist = ev.assist?.name;
    const team   = ev.team?.id === homeTeam?.id ? homeTeam?.name : awayTeam?.name;
    const min    = fmtMin(ev.time?.elapsed, ev.time?.extra);
    if (t === "goal") {
      if (d.includes("own goal")) return `${player} scores an own goal. ${team} concede.`;
      if (d.includes("penalty"))  return `${player} converts the penalty${assist ? ` — assisted by ${assist}` : ""}. ${team} score.`;
      return `${player} scores${assist ? `, assisted by ${assist}` : ""}. ${team} score${min ? ` in ${min}` : ""}.`;
    }
    if (t === "card") {
      if (d.includes("yellow")) return `${player} is booked with a yellow card.`;
      if (d.includes("red"))    return `${player} is shown a red card! ${team} down to ten men.`;
    }
    if (t === "subst") return `Substitution: ${player} comes on.`;
    return `${ev.detail || ev.type}`;
  }

  async function generateCommentary() {
    if (loading) return;
    setLoading(true);

    const statusMessages = [
      "Analysing match data…",
      "Processing live events…",
      "Generating commentary…",
    ];
    let si = 0;
    setStatus(statusMessages[0]);
    tickRef.current = setInterval(() => {
      si = (si + 1) % statusMessages.length;
      setStatus(statusMessages[si]);
    }, 1100);

    try {
      // Call our own backend — OPENROUTER_API_KEY stays server-side
      const res = await fetch(`${BACKEND}/api/commentary/${fixtureId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          home_team:  homeTeam?.name  || "",
          away_team:  awayTeam?.name  || "",
          home_score: score?.fulltime?.home ?? 0,
          away_score: score?.fulltime?.away ?? 0,
          elapsed,
          mode,
          events: (events || []).slice(-8).map(e => ({
            minute: fmtMin(e.time?.elapsed, e.time?.extra),
            type:   (e.type  || "info").toLowerCase(),
            player: e.player?.name || "Unknown",
            team:   e.team?.name   || "",
            assist: e.assist?.name || null,
          })),
          stats: (() => {
            if (!stats?.length) return null;
            const hS = stats.find(s => s.team?.id === homeTeam?.id)?.statistics || [];
            const aS = stats.find(s => s.team?.id === awayTeam?.id)?.statistics || [];
            const g  = (arr, key) => arr.find(s => s.type === key)?.value ?? null;
            return {
              possession: `${g(hS,"Ball Possession")}-${g(aS,"Ball Possession")}`,
              shots:      `${g(hS,"Total Shots")}-${g(aS,"Total Shots")}`,
              on_target:  `${g(hS,"Shots on Goal")}-${g(aS,"Shots on Goal")}`,
              xg:         `${g(hS,"expected_goals")}-${g(aS,"expected_goals")}`,
              corners:    `${g(hS,"Corner Kicks")}-${g(aS,"Corner Kicks")}`,
              pass_acc:   `${g(hS,"Passes %")}-${g(aS,"Passes %")}`,
            };
          })(),
          momentum: momentumData?.overall ? {
            home_pct:        momentumData.overall.home_pct,
            away_pct:        momentumData.overall.away_pct,
            dominant_period: momentumData.periods?.find(p => p.dominant !== "even")?.label || null,
          } : null,
        }),
      });

      if (res.status === 429) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || "Rate limited — wait a moment");
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || `Server error ${res.status}`);
      }

      const entries = await res.json();
      const newEntries = (Array.isArray(entries) ? entries : [entries]).slice(0, 2).map(entry => ({
        minute: entry.minute || `${elapsed}'`,
        type:   entry.type   || "insight",
        isHome: false,
        text:   entry.text   || "",
        ai:     true,
      }));
      setFeed(prev => [...newEntries, ...prev]);

    } catch (err) {
      setFeed(prev => [{
        minute: `${elapsed}'`,
        type:   "info",
        text:   `Commentary unavailable: ${err.message}`,
        ai:     true,
        error:  true,
      }, ...prev]);
  } finally {

  const TYPE_STYLE = {
    goal:      { bg:"rgba(52,211,153,.1)",  border:"rgba(52,211,153,.22)",  label:"Goal",        labelColor:"#34d399"  },
    yellow:    { bg:"rgba(245,158,11,.08)", border:"rgba(245,158,11,.18)",  label:"Yellow Card", labelColor:"#f59e0b"  },
    red_card:  { bg:"rgba(239,68,68,.09)",  border:"rgba(239,68,68,.2)",    label:"Red Card",    labelColor:"#f87171"  },
    sub:       { bg:"rgba(167,139,250,.07)",border:"rgba(167,139,250,.15)", label:"Substitution",labelColor:"#a78bfa"  },
    chance:    { bg:"rgba(56,189,248,.07)", border:"rgba(56,189,248,.14)",  label:"Chance",      labelColor:"#38bdf8"  },
    duel:      { bg:"rgba(255,255,255,.03)",border:"rgba(255,255,255,.07)", label:"Duel",        labelColor:"rgba(255,255,255,.4)" },
    pressure:  { bg:"rgba(56,189,248,.07)", border:"rgba(56,189,248,.14)",  label:"Pressure",    labelColor:"#38bdf8"  },
    insight:   { bg:"rgba(255,255,255,.02)",border:"rgba(255,255,255,.05)", label:"Analysis",    labelColor:"rgba(255,255,255,.3)" },
    tactical:  { bg:"rgba(167,139,250,.06)",border:"rgba(167,139,250,.12)", label:"Tactical",    labelColor:"#a78bfa"  },
    info:      { bg:"transparent",          border:"rgba(255,255,255,.03)", label:"",            labelColor:"rgba(255,255,255,.25)" },
  };

  function renderText(text) {
    if (!text) return null;
    // Convert **bold** to <strong>
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color:"#fff", fontWeight:700 }}>{part}</strong> : part);
  }

  return (
    <div style={{ padding:"18px 0" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 11px", borderRadius:999, background:"rgba(167,139,250,.06)", border:"1px solid rgba(167,139,250,.18)" }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:"#a78bfa", animation:"lm-livePulse 1.8s ease-in-out infinite" }} />
          <span style={{ fontSize:9, fontWeight:800, color:"#a78bfa", letterSpacing:".05em" }}>AI Commentary · OpenRouter</span>
        </div>
        <button
          onClick={generateCommentary}
          disabled={loading}
          style={{
            padding:"6px 14px", borderRadius:999,
            background:"rgba(167,139,250,.08)", border:"1px solid rgba(167,139,250,.22)",
            fontFamily:"'Inter',sans-serif", fontSize:9, fontWeight:800, color: loading ? "rgba(167,139,250,.4)" : "#a78bfa",
            cursor: loading ? "not-allowed" : "pointer",
            transition:"all .18s",
          }}
        >
          {loading ? "Generating…" : "Generate Update"}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 0", marginBottom:8 }}>
          <Spinner size={16} />
          <span style={{ fontSize:11, color:"rgba(255,255,255,.3)" }}>{statusTxt}</span>
        </div>
      )}

      {/* Comment feed */}
      <div>
        {feed.length === 0 && !loading && (
          <div style={{ padding:"32px 0", textAlign:"center", color:"rgba(255,255,255,.18)", fontSize:12 }}>
            {events?.length
              ? "Click Generate Update for AI commentary"
              : "No match events yet"}
          </div>
        )}
        {feed.map((c, i) => {
          const s = TYPE_STYLE[c.type] || TYPE_STYLE.info;
          return (
            <div
              key={i}
              className="lm-comment"
              style={{ "--delay":`${i * 0.04}s`, animationDelay:`${Math.min(i * 0.04, 0.3)}s` }}
            >
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:900, color:"rgba(255,255,255,.2)", minWidth:34, flexShrink:0, paddingTop:1 }}>
                {c.minute}
              </div>
              <div style={{ width:22, height:22, borderRadius:5, flexShrink:0, background:s.bg, border:`1px solid ${s.border}`, marginTop:1 }} />
              <div style={{ flex:1 }}>
                {s.label && (
                  <div style={{ fontSize:8, fontWeight:800, letterSpacing:".08em", textTransform:"uppercase", color:s.labelColor, marginBottom:2 }}>{s.label}</div>
                )}
                <div style={{ fontSize:11, lineHeight:1.58, color:"rgba(255,255,255,.78)", fontWeight:400 }}>
                  {renderText(c.text)}
                </div>
                {c.ai && !c.error && (
                  <div style={{ fontSize:7.5, color:"rgba(167,139,250,.35)", marginTop:3, fontFamily:"'JetBrains Mono',monospace" }}>AI · OpenRouter</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const TABS = ["Lineups", "Stats", "Commentary"];

export default function LiveMatchPage() {
  const { fixtureId } = useParams();
  const navigate = useNavigate();

  const [tab,          setTab]         = useState("Lineups");
  const [fixture,      setFixture]     = useState(null);
  const [events,       setEvents]      = useState([]);
  const [stats,        setStats]       = useState([]);
  const [homeLineup,   setHomeLineup]  = useState(null);
  const [awayLineup,   setAwayLineup]  = useState(null);
  const [winProb,      setWinProb]     = useState(null);
  const [momentumData, setMomentum]    = useState(null);
  const [loading,      setLoading]     = useState(true);
  const [error,        setError]       = useState(null);
  const pollRef = useRef(null);

  const mode = deriveMode(fixture?.fixture?.status?.short);

  // ── Core load: /api/match-intelligence/{id} ──────────────────────────────
  const loadCore = useCallback(async () => {
    if (!fixtureId) return;
    try {
      const resp = await fetch(`${BACKEND}/api/match-intelligence/${fixtureId}`);
      let d = resp.ok ? await resp.json() : null;

      // Fallback: try /api/matches/upcoming for minimal fixture info
      if (!d || d.error) {
        try {
          const uc = await fetch(`${BACKEND}/api/matches/upcoming`).then(r => r.ok ? r.json() : null).catch(() => null);
          const m  = (uc?.matches||[]).find(m => String(m.fixture_id) === String(fixtureId));
          if (m) {
            setFixture({
              fixture: { id:m.fixture_id, status:{ short:m.status||"NS", elapsed:m.minute }, date:m.kickoff },
              league:  { name:m.league_name },
              teams:   { home:{ id:m.home_id, name:m.home_team, logo:m.home_logo }, away:{ id:m.away_id, name:m.away_team, logo:m.away_logo } },
              score:   { fulltime:{ home:m.home_score, away:m.away_score }, halftime:{ home:null, away:null } },
            });
          }
        } catch(e) {}
        setLoading(false);
        return;
      }

      const h = d.header || {};
      setFixture({
        fixture: {
          id: h.fixture_id,
          status: { short:h.status||"NS", elapsed:h.minute },
          date: h.kickoff,
          venue: { name:h.venue_name||h.venue },
          referee: h.referee,
        },
        league: { name:h.league_name, logo:h.league_logo, round:h.round },
        teams: {
          home: { id:h.home_id, name:h.home_team, logo:h.home_logo },
          away: { id:h.away_id, name:h.away_team, logo:h.away_logo },
        },
        score: {
          fulltime: { home:h.home_score,             away:h.away_score },
          halftime: { home:h.score?.ht_home??null,   away:h.score?.ht_away??null },
        },
      });

      // Events
      setEvents((d.events||[]).map(e => ({
        time:   { elapsed:e.minute, extra:e.extra_minute },
        team:   { id:e.team_id, name:e.team },
        player: { name:e.player },
        assist: e.assist ? { name:e.assist } : null,
        type:   e.type,
        detail: e.detail,
      })));

      // Stats
      const st = [];
      if (d.statistics?.home?.length) {
        st.push({ team:{ id:h.home_id, name:h.home_team }, statistics:d.statistics.home });
        st.push({ team:{ id:h.away_id, name:h.away_team }, statistics:d.statistics.away||[] });
      }
      setStats(st);

      // Win prob from prediction block
      if (d.prediction) {
        const p = d.prediction;
        setWinProb({
          pre_match: {
            p_home_win: Math.round((p.p_home_win||0)*100),
            p_draw:     Math.round((p.p_draw||0)*100),
            p_away_win: Math.round((p.p_away_win||0)*100),
            xg_home: p.xg_home, xg_away: p.xg_away,
          },
          markets: p.markets||{},
        });
      }

      setError(null);
    } catch(e) {
      console.error("loadCore:", e);
      setError("Could not load match data.");
    } finally {
      setLoading(false);
    }
  }, [fixtureId]);

  // ── Lineup load: /api/match-lineup/{id} ─────────────────────────────────
  const loadLineup = useCallback(async () => {
    if (!fixtureId) return;
    try {
      const resp = await fetch(`${BACKEND}/api/match-lineup/${fixtureId}`);
      if (!resp.ok) return;
      const d = await resp.json();
      // Response shape: { mode, home:{formation,starting_xi,bench,injuries,doubts,coach,...}, away:{...} }
      if (d.home) setHomeLineup({ ...d.home, predicted: d.mode === "predicted" });
      if (d.away) setAwayLineup({ ...d.away, predicted: d.mode === "predicted" });
    } catch(e) {
      console.warn("Lineup fetch failed, falling back to intelligence lineups:", e);
    }
  }, [fixtureId]);

  // ── Enrichment (win prob, momentum) ─────────────────────────────────────
  const loadEnrichment = useCallback(async (currentMode) => {
    if (!fixtureId) return;

    // Win probability
    fetch(`${BACKEND}/api/win-probability/${fixtureId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setWinProb(d))
      .catch(() => {});

    // Momentum — live and fulltime only
    if (currentMode === "live" || currentMode === "fulltime") {
      fetch(`${BACKEND}/api/match-momentum/${fixtureId}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => d && setMomentum(d))
        .catch(() => {});
    }
  }, [fixtureId]);

  // ── Polling ──────────────────────────────────────────────────────────────
  useEffect(() => {
    loadCore();
    loadLineup();
    pollRef.current = setInterval(() => { loadCore(); }, 30_000);
    return () => clearInterval(pollRef.current);
  }, [loadCore, loadLineup]);

  useEffect(() => {
    if (fixture) loadEnrichment(mode);
  }, [fixture, mode, loadEnrichment]);

  const homeTeam  = fixture?.teams?.home;
  const awayTeam  = fixture?.teams?.away;
  const score     = fixture?.score;
  const status    = fixture?.fixture?.status;
  const fixtureInfo = fixture?.fixture;

  return (
    <div style={{ background:"#000", minHeight:"100vh", color:"#fff", fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{GLOBAL_CSS}</style>

      {/* Back nav */}
      <div style={{ padding:"13px 20px 0", display:"flex", alignItems:"center", gap:8 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background:"none", border:"none", color:"rgba(255,255,255,.22)", cursor:"pointer", fontSize:11, fontWeight:700, letterSpacing:".04em", padding:0, display:"flex", alignItems:"center", gap:5 }}
        >
          ← Live Centre
        </button>
      </div>

      {loading && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:260, color:"rgba(255,255,255,.2)" }}>
          <div style={{ textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
            <Spinner size={28} />
            <span style={{ fontSize:12 }}>Loading match…</span>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding:24, color:"#f87171", textAlign:"center", fontSize:13 }}>{error}</div>
      )}

      {!loading && !error && (
        <div style={{ animation:"lm-fadeUp .3s ease both" }}>

          {/* Match header */}
          <MatchHeader
            fixture={fixtureInfo}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            score={score}
            status={status}
            mode={mode}
            stats={stats}
            events={events}
          />

          {/* Sticky tab strip */}
          <div style={{
            position:"sticky", top:0, zIndex:100,
            background:"rgba(0,0,0,.97)", backdropFilter:"blur(16px)",
            borderBottom:"1px solid rgba(255,255,255,.05)",
            display:"flex",
          }}>
            {TABS.map(t => (
              <button
                key={t}
                className="lm-tab"
                onClick={() => setTab(t)}
                style={{
                  flex:1,
                  padding:"12px 0", fontSize:10, fontWeight:800,
                  letterSpacing:".07em", textTransform:"uppercase",
                  color: tab === t ? "#fff" : "rgba(255,255,255,.28)",
                  borderBottom: tab === t ? "2px solid rgba(255,255,255,.4)" : "2px solid transparent",
                  marginBottom:-1,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:5,
                }}
              >
                {t === "Commentary" && mode === "live" && (
                  <span style={{ width:5, height:5, borderRadius:"50%", background:"#a78bfa", animation:"lm-livePulse 1.5s ease-in-out infinite" }} />
                )}
                {t === "Stats" && (mode === "live" || mode === "fulltime") && (
                  <span style={{ width:5, height:5, borderRadius:"50%", background:"#34d399", animation:"lm-livePulse 1.5s ease-in-out infinite" }} />
                )}
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ maxWidth:920, margin:"0 auto", padding:"0 20px 60px" }}>

            {/* ── LINEUPS ── */}
            {tab === "Lineups" && (
              <div style={{ paddingTop:16 }}>
                {(homeLineup || awayLineup) ? (
                  <PitchLineup
                    homeLineup={homeLineup}
                    awayLineup={awayLineup}
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                  />
                ) : (
                  <div style={{ padding:"48px 0", textAlign:"center", color:"rgba(255,255,255,.18)", fontSize:13 }}>
                    <Spinner size={24} />
                    <div style={{ marginTop:12 }}>Loading lineups…</div>
                  </div>
                )}
              </div>
            )}

            {/* ── STATS ── */}
            {tab === "Stats" && (
              <StatsPanel
                stats={stats}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                winProb={winProb}
                momentumData={momentumData}
                events={events}
              />
            )}

            {/* ── COMMENTARY ── */}
            {tab === "Commentary" && (
              <CommentaryPanel
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                score={score}
                events={events}
                stats={stats}
                momentumData={momentumData}
                fixtureId={fixtureId}
                mode={mode}
              />
            )}

            {/* Empty state */}
            {!loading && !stats.length && !events.length && !homeLineup && !awayLineup && (
              <div style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,.18)", fontSize:13 }}>
                No match data available yet.
                <br /><br />
                <button onClick={() => navigate(-1)} style={{ color:"rgba(255,255,255,.4)", fontWeight:700, background:"none", border:"none", cursor:"pointer", fontSize:13 }}>
                  ← Back to Live Centre
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}