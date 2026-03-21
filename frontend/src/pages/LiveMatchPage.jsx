// ═══════════════════════════════════════════════════════════════════
// StatinSite — Match Detail Page
// Mode-driven: prematch / live / fulltime
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

const BACKEND = "https://football-stats-lw4b.onrender.com";

// ─── Mode derivation ─────────────────────────────────────────────────────────

const LIVE_STATUSES = new Set(["1H","2H","HT","ET","BT","P"]);
const FT_STATUSES   = new Set(["FT","AET","PEN","AWD","WO"]);

function deriveMode(statusShort) {
  if (!statusShort || statusShort === "NS" || statusShort === "TBD") return "prematch";
  if (LIVE_STATUSES.has(statusShort)) return "live";
  if (FT_STATUSES.has(statusShort))   return "fulltime";
  return "prematch";
}

// ─── Utility helpers ─────────────────────────────────────────────────────────

function fmtMin(elapsed, extra) {
  if (!elapsed) return "";
  return extra ? `${elapsed}+${extra}'` : `${elapsed}'`;
}

function getStat(statsArr, teamId, key) {
  return statsArr?.find(s => s.team?.id === teamId)
    ?.statistics?.find(s => s.type === key)?.value ?? null;
}

function fmtKickoff(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(); tomorrow.setDate(now.getDate() + 1);
  const sameDay = (a, b) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay(d, now))       return `Today · ${timeStr}`;
  if (sameDay(d, tomorrow))  return `Tomorrow · ${timeStr}`;
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" }) + ` · ${timeStr}`;
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function SectionLabel({ children, accent }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      marginBottom: 14,
    }}>
      {accent && <span style={{ width:3, height:16, borderRadius:2, background:accent, display:"inline-block", flexShrink:0 }} />}
      <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.14em",
        color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
        {children}
      </span>
    </div>
  );
}

function Pill({ children, color = "rgba(255,255,255,0.07)", textColor = "rgba(255,255,255,0.5)" }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
      background: color, color: textColor,
      padding: "3px 8px", borderRadius: 999,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      {children}
    </span>
  );
}

function LiveDot() {
  return (
    <span style={{
      width: 5, height: 5, borderRadius: "50%",
      background: "#ff4444",
      animation: "livePulse 1.5s ease-in-out infinite",
      display: "inline-block",
    }} />
  );
}

function EventIcon({ type, detail }) {
  const t = (type   || "").toLowerCase();
  const d = (detail || "").toLowerCase();
  const base = { width: 10, height: 10, borderRadius: "50%", display: "inline-block", flexShrink: 0 };

  if (t === "goal" && d.includes("own"))
    return <span style={{ ...base, background: "#ef4444" }} title="Own Goal" />;
  if (t === "goal" && d.includes("penalty"))
    return <span style={{ ...base, background: "#facc15" }} title="Penalty Goal" />;
  if (t === "goal")
    return <span style={{ ...base, background: "#34d399" }} title="Goal" />;
  if (t === "card" && d.includes("red"))
    return <span style={{ ...base, borderRadius: 2, background: "#ef4444" }} title="Red Card" />;
  if (t === "card" && d.includes("yellow"))
    return <span style={{ ...base, borderRadius: 2, background: "#fbbf24" }} title="Yellow Card" />;
  if (t === "subst")
    return <span style={{ fontSize: 9, color: "#4ade80", fontWeight: 900 }}>SUB</span>;
  if (t === "var")
    return <span style={{ fontSize: 9, color: "#a78bfa", fontWeight: 900 }}>VAR</span>;
  return <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>–</span>;
}

function StatBar({ label, home, away, homeColor = "#3b82f6", awayColor = "#ef4444", highlight = false }) {
  const hNum  = parseFloat(String(home ?? "0").replace("%","")) || 0;
  const aNum  = parseFloat(String(away ?? "0").replace("%","")) || 0;
  const total = hNum + aNum || 1;
  const hPct  = (hNum / total) * 100;
  const homeLeads = hNum > aNum;
  const awayLeads = aNum > hNum;

  return (
    <div style={{
      display:"flex", flexDirection:"column", gap:5,
      padding: highlight ? "8px 12px" : "7px 0",
      borderRadius: highlight ? 8 : 0,
      background: highlight ? "rgba(167,139,250,.06)" : "transparent",
      border: highlight ? "1px solid rgba(167,139,250,.14)" : "none",
      marginBottom: highlight ? 6 : 0,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{
          fontSize:13, fontWeight:800, fontFamily:"'JetBrains Mono',monospace", minWidth:40,
          color: homeLeads ? "#fff" : "rgba(255,255,255,.6)",
        }}>{home ?? "–"}</span>
        <span style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.3)", letterSpacing:"0.08em", textTransform:"uppercase", textAlign:"center", flex:1 }}>{label}</span>
        <span style={{
          fontSize:13, fontWeight:800, fontFamily:"'JetBrains Mono',monospace", minWidth:40, textAlign:"right",
          color: awayLeads ? "#fff" : "rgba(255,255,255,.6)",
        }}>{away ?? "–"}</span>
      </div>
      <div style={{ display:"flex", height:4, borderRadius:3, overflow:"hidden", background:"rgba(255,255,255,0.06)" }}>
        <div className="lm-stat-bar" style={{ width:`${hPct}%`, "--w":`${hPct}%`, background:homeColor, borderRadius:"3px 0 0 3px" }} />
        <div style={{ width:`${100-hPct}%`, background:awayColor, borderRadius:"0 3px 3px 0", transition:"width 0.6s ease" }} />
      </div>
    </div>
  );
}

function PitchSvg() {
  return (
    <svg viewBox="0 0 340 220" style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}>
      <rect x="0" y="0" width="340" height="220" fill="#0a1f0d" rx="4" />
      {[...Array(8)].map((_,i) => (
        <rect key={i} x={i*42.5} y="0" width="21.25" height="220" fill="rgba(255,255,255,0.018)" />
      ))}
      <rect x="8" y="8" width="324" height="204" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      <line x1="170" y1="8" x2="170" y2="212" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      <circle cx="170" cy="110" r="34" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      <circle cx="170" cy="110" r="2" fill="rgba(255,255,255,0.35)" />
      <rect x="8"   y="62" width="54" height="96" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      <rect x="8"   y="86" width="22" height="48" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      <circle cx="62"  cy="110" r="1.5" fill="rgba(255,255,255,0.35)" />
      <rect x="278" y="62" width="54" height="96" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      <rect x="310" y="86" width="22" height="48" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
      <circle cx="278" cy="110" r="1.5" fill="rgba(255,255,255,0.35)" />
    </svg>
  );
}

// ─── PREMATCH components ──────────────────────────────────────────────────────

function PreMatchHero({ fixture, homeTeam, awayTeam, status }) {
  const kickoff = fmtKickoff(fixture?.date);
  return (
    <div style={{
      position:"relative",
      background:"#000",
      borderBottom:"1px solid rgba(255,255,255,0.06)",
      overflow:"hidden",
      padding:"28px 24px 24px",
    }}>
      <div style={{ position:"absolute", top:-80, left:"10%",  width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(96,165,250,0.06),transparent 70%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", top:-80, right:"10%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(239,68,68,0.06),transparent 70%)",  pointerEvents:"none" }} />

      {/* Competition */}
      <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:8, marginBottom:22 }}>
        {fixture?.league?.logo && (
          <img src={fixture.league.logo} alt="" width={16} height={16} style={{ objectFit:"contain" }} />
        )}
        <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.3)", letterSpacing:"0.1em", textTransform:"uppercase" }}>
          {fixture?.league?.name}{fixture?.league?.round ? ` · ${fixture.league.round}` : ""}
        </span>
      </div>

      {/* Teams */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, maxWidth:600, margin:"0 auto" }}>
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
          <img src={homeTeam?.logo} alt={homeTeam?.name} width={60} height={60}
            style={{ objectFit:"contain" }} onError={e => e.currentTarget.style.opacity="0"} />
          <span style={{ fontSize:14, fontWeight:900, color:"#f0f6ff", textAlign:"center" }}>{homeTeam?.name}</span>
          <Pill textColor="#94a3b8">Home</Pill>
        </div>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, flexShrink:0 }}>
          {kickoff ? (
            <>
              <span style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.25)", letterSpacing:"0.06em" }}>KICK OFF</span>
              <span style={{ fontSize:18, fontWeight:900, color:"#f0f6ff", letterSpacing:"-0.01em" }}>{kickoff}</span>
            </>
          ) : (
            <span style={{ fontSize:16, fontWeight:700, color:"rgba(255,255,255,0.2)" }}>VS</span>
          )}
          {fixture?.venue?.name && (
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.2)", textAlign:"center", maxWidth:160 }}>
              {fixture.venue.name}{fixture?.venue?.city ? `, ${fixture.venue.city}` : ""}
            </span>
          )}
        </div>

        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
          <img src={awayTeam?.logo} alt={awayTeam?.name} width={60} height={60}
            style={{ objectFit:"contain" }} onError={e => e.currentTarget.style.opacity="0"} />
          <span style={{ fontSize:14, fontWeight:900, color:"#f0f6ff", textAlign:"center" }}>{awayTeam?.name}</span>
          <Pill textColor="#94a3b8">Away</Pill>
        </div>
      </div>
    </div>
  );
}

function PredictionStrip({ winProb, homeTeam, awayTeam }) {
  if (!winProb) return null;
  const { pre_match, markets } = winProb;
  if (!pre_match) return null;

  const { p_home_win, p_draw, p_away_win, xg_home, xg_away, top_scorelines } = pre_match;

  const Edge = ({ label, value, highlight }) => (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center", gap:4,
      padding:"10px 16px",
      background: highlight ? "rgba(96,165,250,0.08)" : "rgba(255,255,255,0.025)",
      border: `1px solid ${highlight ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.05)"}`,
      borderRadius:12, flex:1, minWidth:80,
    }}>
      <span style={{ fontSize:18, fontWeight:900, color: highlight ? "#60a5fa" : "#f0f6ff", fontFamily:"'JetBrains Mono',monospace" }}>{value}</span>
      <span style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.3)", letterSpacing:"0.08em", textTransform:"uppercase", textAlign:"center" }}>{label}</span>
    </div>
  );

  return (
    <div style={{ padding:"20px 24px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
      <SectionLabel>Model Prediction</SectionLabel>

      {/* Win prob bar */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:11, fontWeight:800 }}>
          <span style={{ color:"#60a5fa" }}>{homeTeam?.name?.split(" ").pop()} {p_home_win}%</span>
          <span style={{ color:"rgba(255,255,255,0.35)" }}>Draw {p_draw}%</span>
          <span style={{ color:"#f87171" }}>{awayTeam?.name?.split(" ").pop()} {p_away_win}%</span>
        </div>
        <div style={{ display:"flex", height:8, borderRadius:999, overflow:"hidden", gap:2 }}>
          <div style={{ width:`${p_home_win}%`, background:"linear-gradient(90deg,#3b82f688,#3b82f6)", boxShadow: p_home_win > p_away_win ? "0 0 10px #3b82f699" : "none", borderRadius:"999px 0 0 999px", transition:"width 0.8s ease" }} />
          <div style={{ width:`${p_draw}%`,     background:"rgba(255,255,255,0.18)" }} />
          <div style={{ width:`${p_away_win}%`, background:"linear-gradient(90deg,#ef444488,#ef4444)", boxShadow: p_away_win > p_home_win ? "0 0 10px #ef444499" : "none", borderRadius:"0 999px 999px 0", transition:"width 0.8s ease" }} />
        </div>
      </div>

      {/* Key metrics */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {xg_home != null && <Edge label={`${homeTeam?.name?.split(" ").pop()} xG`} value={xg_home} />}
        {xg_away != null && <Edge label={`${awayTeam?.name?.split(" ").pop()} xG`} value={xg_away} />}
        {markets?.over_2_5 != null && <Edge label="Over 2.5" value={`${Math.round((markets.over_2_5 > 1 ? markets.over_2_5 : markets.over_2_5 * 100))}%`} highlight />}
        {markets?.btts     != null && <Edge label="BTTS"     value={`${Math.round((markets.btts > 1 ? markets.btts : markets.btts * 100))}%`} />}
      </div>

      {/* Top scorelines */}
      {top_scorelines?.length > 0 && (
        <div style={{ marginTop:14 }}>
          <div style={{ fontSize:9, fontWeight:800, color:"rgba(255,255,255,0.2)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>
            Likely Scorelines
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {top_scorelines.slice(0,5).map(s => (
              <div key={s.score} style={{
                padding:"4px 10px", borderRadius:8,
                background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(255,255,255,0.07)",
                fontSize:11, fontWeight:800, color:"#e2e8f0",
                fontFamily:"'JetBrains Mono',monospace",
              }}>
                {s.score} <span style={{ color:"rgba(255,255,255,0.3)", fontSize:9 }}>{s.probability}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FormRow({ label, form }) {
  if (!form) return null;
  const results = form.slice(-5).split("");
  const color = r => r === "W" ? "#34d399" : r === "L" ? "#f87171" : "#94a3b8";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.3)", width:80 }}>{label}</span>
      <div style={{ display:"flex", gap:4 }}>
        {results.map((r,i) => (
          <div key={i} style={{
            width:22, height:22, borderRadius:4,
            background:`${color(r)}22`,
            border:`1px solid ${color(r)}55`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:9, fontWeight:900, color:color(r),
          }}>{r}</div>
        ))}
      </div>
    </div>
  );
}

function MatchupPanel({ homeStats, awayStats, homeTeam, awayTeam }) {
  if (!homeStats && !awayStats) return null;

  const rows = [
    { label:"Avg Goals For",     h: homeStats?.scored_home,   a: awayStats?.scored_away   },
    { label:"Avg Goals Against", h: homeStats?.conceded_home, a: awayStats?.conceded_away  },
  ].filter(r => r.h != null || r.a != null);

  return (
    <div style={{ padding:"20px 24px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
      <SectionLabel>Recent Form</SectionLabel>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <FormRow label={homeTeam?.name?.split(" ").pop()} form={homeStats?.form} />
        <FormRow label={awayTeam?.name?.split(" ").pop()} form={awayStats?.form} />
      </div>
      {rows.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:16 }}>
          {rows.map(r => (
            <StatBar key={r.label} label={r.label} home={r.h} away={r.a} />
          ))}
        </div>
      )}
    </div>
  );
}

function InjuryPanel({ injuries, homeTeam, awayTeam }) {
  if (!injuries?.length) return null;

  const homeInj = injuries.filter(i => (i.team?.id ?? i.player?.team?.id) === homeTeam?.id);
  const awayInj = injuries.filter(i => (i.team?.id ?? i.player?.team?.id) === awayTeam?.id);
  if (!homeInj.length && !awayInj.length) return null;

  const InjRow = ({ inj }) => {
    const player = inj.player || {};
    const type   = inj.player?.type || inj.type || "Injury";
    return (
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
        <div style={{
          width:6, height:6, borderRadius:"50%",
          background: type.toLowerCase().includes("suspend") ? "#fbbf24" : "#f87171",
          flexShrink:0,
        }} />
        <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.7)", flex:1 }}>{player.name || "Unknown"}</span>
        <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontWeight:600 }}>{type}</span>
      </div>
    );
  };

  return (
    <div style={{ padding:"20px 24px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
      <SectionLabel>Availability</SectionLabel>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {[{ team:homeTeam, list:homeInj },{ team:awayTeam, list:awayInj }].map(({ team, list }) => (
          <div key={team?.id}>
            <div style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.3)", marginBottom:8 }}>
              {team?.name}
              <span style={{ marginLeft:6, fontSize:9, color:"#f87171", fontWeight:700 }}>
                {list.length > 0 ? `${list.length} doubt${list.length > 1 ? "s" : ""}` : ""}
              </span>
            </div>
            {list.length === 0
              ? <span style={{ fontSize:11, color:"rgba(255,255,255,0.2)" }}>No known issues</span>
              : list.slice(0,6).map((inj,i) => <InjRow key={i} inj={inj} />)
            }
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── TEAM COLOUR MAP ─────────────────────────────────────────────────────────
const TEAM_COLOURS_MAP = {
  40:"#c8102e",42:"#1a5bab",33:"#1d6fa4",50:"#6cacd4",49:"#034694",
  47:"#c8c8c8",55:"#8f8f8f",66:"#7B003C",51:"#0057b8",65:"#7a263a",
  36:"#cc0000",48:"#FDB913",45:"#003399",529:"#004b87",541:"#e8e8e8",
  530:"#cb3524",157:"#d3010c",165:"#fde100",489:"#010E80",492:"#fb090b",
};
function tColour(id,fb="#38bdf8"){return TEAM_COLOURS_MAP[id]||fb;}

// ─── HORIZONTAL FORMATION SLOTS ──────────────────────────────────────────────
// x = pitch length (0=left goal, 100=right goal)
// y = pitch width  (0=top touchline, 100=bottom touchline)
// LEFT TEAM  — GK near x≈10, attack near x≈45
// RIGHT TEAM — GK near x≈90, attack near x≈55
// Slot order: [GK, DEF L→R, MID L→R, FWD L→R]
const HF = {
  "4-3-3_left":    [[10,50],[23,82],[23,61],[23,39],[23,18],[34,66],[32,50],[34,34],[43,82],[45,50],[43,18]],
  "4-3-3_right":   [[90,50],[77,18],[77,39],[77,61],[77,82],[66,34],[68,50],[66,66],[57,18],[55,50],[57,82]],
  "4-2-3-1_left":  [[10,50],[23,82],[23,61],[23,39],[23,18],[31,61],[31,39],[39,82],[39,50],[39,18],[46,50]],
  "4-2-3-1_right": [[90,50],[77,18],[77,39],[77,61],[77,82],[69,39],[69,61],[61,18],[61,50],[61,82],[54,50]],
  "4-4-2_left":    [[10,50],[23,82],[23,61],[23,39],[23,18],[34,82],[34,61],[34,39],[34,18],[43,61],[43,39]],
  "4-4-2_right":   [[90,50],[77,18],[77,39],[77,61],[77,82],[66,18],[66,39],[66,61],[66,82],[57,39],[57,61]],
  "4-5-1_left":    [[10,50],[23,82],[23,61],[23,39],[23,18],[34,82],[34,65],[33,50],[34,35],[34,18],[45,50]],
  "4-5-1_right":   [[90,50],[77,18],[77,39],[77,61],[77,82],[66,18],[66,35],[67,50],[66,65],[66,82],[55,50]],
  "4-1-4-1_left":  [[10,50],[23,82],[23,61],[23,39],[23,18],[30,50],[38,82],[38,61],[38,39],[38,18],[46,50]],
  "4-1-4-1_right": [[90,50],[77,18],[77,39],[77,61],[77,82],[70,50],[62,18],[62,39],[62,61],[62,82],[54,50]],
  "3-5-2_left":    [[10,50],[22,68],[21,50],[22,32],[31,82],[33,65],[32,50],[33,35],[31,18],[44,62],[44,38]],
  "3-5-2_right":   [[90,50],[78,32],[79,50],[78,68],[69,18],[67,35],[68,50],[67,65],[69,82],[56,38],[56,62]],
  "3-4-3_left":    [[10,50],[22,68],[21,50],[22,32],[31,82],[31,61],[31,39],[31,18],[43,82],[45,50],[43,18]],
  "3-4-3_right":   [[90,50],[78,32],[79,50],[78,68],[69,18],[69,39],[69,61],[69,82],[57,18],[55,50],[57,82]],
  "5-3-2_left":    [[10,50],[22,82],[22,66],[21,50],[22,34],[22,18],[33,66],[32,50],[33,34],[44,62],[44,38]],
  "5-3-2_right":   [[90,50],[78,18],[78,34],[79,50],[78,66],[78,82],[67,34],[68,50],[67,66],[56,38],[56,62]],
  "5-4-1_left":    [[10,50],[22,82],[22,66],[21,50],[22,34],[22,18],[33,82],[33,61],[33,39],[33,18],[45,50]],
  "5-4-1_right":   [[90,50],[78,18],[78,34],[79,50],[78,66],[78,82],[67,18],[67,39],[67,61],[67,82],[55,50]],
  "4-3-2-1_left":  [[10,50],[23,82],[23,61],[23,39],[23,18],[31,66],[31,50],[31,34],[39,62],[39,38],[46,50]],
  "4-3-2-1_right": [[90,50],[77,18],[77,39],[77,61],[77,82],[69,34],[69,50],[69,66],[61,38],[61,62],[54,50]],
  "4-2-2-2_left":  [[10,50],[23,82],[23,61],[23,39],[23,18],[30,62],[30,38],[38,62],[38,38],[45,62],[45,38]],
  "4-2-2-2_right": [[90,50],[77,18],[77,39],[77,61],[77,82],[70,38],[70,62],[62,38],[62,62],[55,38],[55,62]],
  "3-4-2-1_left":  [[10,50],[22,68],[21,50],[22,32],[31,82],[31,61],[31,39],[31,18],[39,62],[39,38],[46,50]],
  "3-4-2-1_right": [[90,50],[78,32],[79,50],[78,68],[69,18],[69,39],[69,61],[69,82],[61,38],[61,62],[54,50]],
};
function getHSlots(formation,side){
  return HF[`${formation}_${side}`]||HF[`4-3-3_${side}`];
}

// ─── UNIFIED PITCH LINEUP (Horizontal) ───────────────────────────────────────
function PitchLineup({homeLineup,awayLineup,homeTeam,awayTeam,venueName}){
  if(!homeLineup&&!awayLineup) return null;
  const navigate = useNavigate();
  const hc=tColour(homeTeam?.id,"#38bdf8");
  const ac=tColour(awayTeam?.id,"#f97316");

  function norm(raw){
    if(!raw) return null;
    const xi=raw.startXI||raw.starting_xi||raw.start_xi||[];
    const bench=raw.substitutes||raw.bench||raw.subs||[];
    return{
      formation:raw.formation||"4-3-3",
      predicted:raw.predicted||false,
      confidence:raw.confidence,
      coach:raw.coach||null,
      injuries:raw.injuries||[],
      doubts:raw.doubts||[],
      xi:xi.map(p=>{
        const pl=p?.player||p||{};
        return{id:pl.id,name:pl.name||"",pos:pl.pos||pl.position||"",
          photo:pl.photo||(pl.id?`https://media.api-sports.io/football/players/${pl.id}.png`:null),
          confidence:p?.confidence??pl.confidence};
      }),
      bench:bench.slice(0,9).map(p=>{
        const pl=p?.player||p||{};
        return{id:pl.id,name:pl.name||"",pos:pl.pos||pl.position||"",
          photo:pl.photo||(pl.id?`https://media.api-sports.io/football/players/${pl.id}.png`:null)};
      }),
    };
  }

  const home=norm(homeLineup);
  const away=norm(awayLineup);
  const isPredicted=home?.predicted||away?.predicted;

  // All players same size — GK gets double ring, outfield gets single
  function Tokens({lineup,side,colour}){
    if(!lineup?.xi?.length) return null;
    const slots=getHSlots(lineup.formation,side);
    const sz=50;
    return lineup.xi.slice(0,11).map((p,i)=>{
      const [x,y]=slots[i]||[50,50];
      const isGK=i===0;
      const short=(p.name||"").split(" ").pop().slice(0,13);
      const pid=p.id;
      return(
        <div key={i} style={{
          position:"absolute",left:`${x}%`,top:`${y}%`,
          transform:"translate(-50%,-50%)",
          display:"flex",flexDirection:"column",alignItems:"center",gap:3,
          zIndex:3,
          pointerEvents: pid ? "auto" : "none",
          cursor: pid ? "pointer" : "default",
        }}
          onClick={pid ? () => navigate(`/player/${pid}`) : undefined}
        >
          <div style={{
            width:sz,height:sz,borderRadius:"50%",
            border:`3px solid ${colour}`,
            boxShadow:isGK
              ?`0 0 0 2px #000,0 0 0 5px ${colour}88,0 0 14px ${colour}44`
              :`0 0 0 1px ${colour}33`,
            background:"#000",overflow:"hidden",flexShrink:0,
            transition:"transform .15s",
          }}
            onMouseEnter={e=>{ if(pid) e.currentTarget.parentElement.style.transform="translate(-50%,-50%) scale(1.1)"; }}
            onMouseLeave={e=>{ e.currentTarget.parentElement.style.transform="translate(-50%,-50%) scale(1)"; }}
          >
            {p.photo&&<img src={p.photo} alt="" width={sz} height={sz}
              style={{objectFit:"cover",objectPosition:"top center",display:"block"}}
              onError={e=>{e.currentTarget.style.display="none";}}/>}
          </div>
          <div style={{
            fontSize:"9.5px",fontWeight:800,color:"#fff",
            textShadow:"0 1px 6px #000,0 0 12px #000",
            background: pid ? `${colour}28` : "rgba(0,0,0,.85)",
            border: pid ? `1px solid ${colour}50` : "none",
            padding:"2px 5px",borderRadius:4,whiteSpace:"nowrap",
            maxWidth:76,overflow:"hidden",textOverflow:"ellipsis",
            lineHeight:1.3,letterSpacing:"0.01em",fontFamily:"'Inter',sans-serif",
          }}>{short}</div>
        </div>
      );
    });
  }

  // Bench — horizontal pill strip matching HTML preview exactly
  function BenchStrip({lineup,colour,align}){
    if(!lineup?.bench?.length) return null;
    const isRight=align==="right";
    return(
      <div style={{flex:1,overflow:"hidden",minWidth:0}}>
        <div style={{
          fontSize:"7px",fontWeight:900,
          color:`${colour}`,opacity:.7,
          letterSpacing:".12em",textTransform:"uppercase",marginBottom:6,
          display:"flex",alignItems:"center",
          justifyContent:isRight?"flex-end":"flex-start",gap:4,
        }}>
          {!isRight&&<span style={{width:6,height:6,borderRadius:"50%",background:colour,display:"inline-block",flexShrink:0}}/>}
          BENCH
          {isRight&&<span style={{width:6,height:6,borderRadius:"50%",background:colour,display:"inline-block",flexShrink:0}}/>}
        </div>
        <div style={{
          display:"flex",gap:4,flexWrap:"nowrap",overflow:"hidden",
          justifyContent:isRight?"flex-end":"flex-start",
        }}>
          {lineup.bench.slice(0,7).map((p,i)=>(
            <div key={i} style={{
              flexShrink:0,display:"flex",alignItems:"center",gap:5,
              padding: isRight?"3px 5px 3px 7px":"3px 7px 3px 5px",
              borderRadius:6,
              background:"rgba(255,255,255,.03)",
              border:"1px solid rgba(255,255,255,.07)",
              borderLeft: isRight?"1px solid rgba(255,255,255,.07)":`2.5px solid ${colour}`,
              borderRight: isRight?`2.5px solid ${colour}`:"1px solid rgba(255,255,255,.07)",
            }}>
              {isRight&&<span style={{fontSize:"9.5px",fontWeight:700,color:"rgba(255,255,255,.55)",whiteSpace:"nowrap",fontFamily:"'Inter',sans-serif"}}>
                {(p.name||"").split(" ").pop().slice(0,12)}
              </span>}
              <div style={{width:24,height:24,borderRadius:"50%",overflow:"hidden",background:"#111",border:`1.5px solid ${colour}55`,flexShrink:0}}>
                {p.photo&&<img src={p.photo} alt="" width="24" height="24"
                  style={{objectFit:"cover",objectPosition:"top"}}
                  onError={e=>e.currentTarget.style.display="none"}/>}
              </div>
              {!isRight&&<span style={{fontSize:"9.5px",fontWeight:700,color:"rgba(255,255,255,.55)",whiteSpace:"nowrap",fontFamily:"'Inter',sans-serif"}}>
                {(p.name||"").split(" ").pop().slice(0,12)}
              </span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Unavailable block — split by team
  const homeUnavail=[...(home?.injuries||[]).map(p=>({...p,doubt:false})),...(home?.doubts||[]).map(p=>({...p,doubt:true}))];
  const awayUnavail=[...(away?.injuries||[]).map(p=>({...p,doubt:false})),...(away?.doubts||[]).map(p=>({...p,doubt:true}))];

  function UnavailBlock({players,colour}){
    if(!players.length) return null;
    return(
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {players.slice(0,8).map((p,i)=>{
            const reason=p.doubt?"Doubt":(p.type||p.reason||"Inj");
            return(
              <span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,
                padding:"3px 8px 3px 4px",borderRadius:6,
                background:`${colour}0d`,border:`1px solid ${colour}25`}}>
                <span style={{width:5,height:5,borderRadius:"50%",flexShrink:0,background:colour}}/>
                <span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.75)"}}>
                  {(p.name||p.player_name||"").split(" ").slice(-1)[0]}
                </span>
                <span style={{fontSize:8,fontWeight:700,color:`${colour}80`,
                  fontFamily:"'JetBrains Mono',monospace"}}>{reason}</span>
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  // ── position badge colour ──────────────────────────────────────────────────
  function posCol(pos){
    const p=(pos||"").toUpperCase().slice(0,1);
    if(p==="G") return "#f59e0b";
    if(p==="D") return "#60a5fa";
    if(p==="M") return "#34d399";
    return "#f87171";
  }

  // ── Sidebar: bench + injuries, vertical avatar rows ────────────────────────
  function Sidebar({lineup,team,colour,isRight}){
    const bench=(lineup?.bench||[]);
    const unavail=[
      ...(lineup?.injuries||[]).map(p=>({...p,doubt:false})),
      ...(lineup?.doubts||[]).map(p=>({...p,doubt:true})),
    ];

    function PlayerRow({p,isOut,reason,doubt}){
      const name=(p.name||p.player_name||"").split(" ").slice(-1)[0].slice(0,13)||"–";
      const pos=(p.pos||p.position||"").slice(0,1).toUpperCase();
      const pid=p.id;
      return(
        <div
          onClick={pid?()=>navigate(`/player/${pid}`):undefined}
          style={{
            display:"flex",alignItems:"center",gap:5,
            padding:"3px 0",
            flexDirection:isRight?"row-reverse":"row",
            cursor:pid?"pointer":"default",
            opacity:isOut?.52:1,
          }}
        >
          <div style={{position:"relative",flexShrink:0}}>
            <div style={{
              width:26,height:26,borderRadius:"50%",overflow:"hidden",
              background:"#0a0a0a",
              border:`1.5px solid ${isOut?"rgba(239,68,68,.45)":colour+"55"}`,
            }}>
              {p.photo&&<img src={p.photo} alt="" width="26" height="26"
                style={{objectFit:"cover",objectPosition:"top"}}
                onError={e=>e.currentTarget.style.display="none"}/>}
            </div>
            {!isOut&&pos&&(
              <span style={{
                position:"absolute",bottom:-2,right:isRight?"auto":-2,left:isRight?-2:"auto",
                fontSize:"6px",fontWeight:900,lineHeight:"11px",
                background:posCol(pos),color:"#000",
                borderRadius:3,padding:"0 2.5px",
                boxShadow:"0 1px 3px rgba(0,0,0,.8)",
              }}>{pos}</span>
            )}
            {isOut&&(
              <span style={{
                position:"absolute",bottom:-2,right:isRight?"auto":-2,left:isRight?-2:"auto",
                width:9,height:9,borderRadius:"50%",
                background:doubt?"#fbbf24":"#ef4444",
                border:"1.5px solid #000",display:"block",
              }}/>
            )}
          </div>
          <div style={{
            flex:1,minWidth:0,
            display:"flex",flexDirection:"column",
            alignItems:isRight?"flex-end":"flex-start",
          }}>
            <span style={{
              fontSize:"8.5px",fontWeight:700,
              color:isOut?"rgba(255,255,255,.42)":"rgba(255,255,255,.85)",
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
              lineHeight:1.3,
            }}>{name}</span>
            {reason&&<span style={{
              fontSize:"6.5px",fontWeight:700,lineHeight:1.2,
              color:isOut?(doubt?"#fbbf2488":"#ef444488"): `${colour}88`,
              fontFamily:"monospace",
            }}>{reason}</span>}
          </div>
        </div>
      );
    }

    return(
      <div style={{
        background:`linear-gradient(${isRight?"to left":"to right"},${colour}1e,${colour}07)`,
        borderRight:isRight?"none":`1px solid ${colour}25`,
        borderLeft:isRight?`1px solid ${colour}25`:"none",
        padding:"10px 8px",
        display:"flex",flexDirection:"column",
        minHeight:0,
      }}>
        {/* Team name + formation */}
        <div style={{
          marginBottom:8,paddingBottom:7,
          borderBottom:`1px solid ${colour}20`,
          display:"flex",flexDirection:"column",
          alignItems:isRight?"flex-end":"flex-start",gap:3,
        }}>
          <div style={{display:"flex",alignItems:"center",gap:5,flexDirection:isRight?"row-reverse":"row"}}>
            <div style={{
              width:20,height:20,borderRadius:"50%",
              border:`2px solid ${colour}`,overflow:"hidden",
              background:"#111",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
            }}>
              {team?.logo&&<img src={team.logo} alt="" width="16" height="16"
                style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
            </div>
            <span style={{
              fontSize:10,fontWeight:900,color:"#fff",
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
            }}>{team?.name?.split(" ").slice(-1)[0]||team?.name}</span>
          </div>
          {lineup?.formation&&(
            <span style={{
              fontSize:7.5,fontWeight:800,color:colour,
              background:`${colour}18`,border:`1px solid ${colour}30`,
              borderRadius:3,padding:"0 5px",letterSpacing:".04em",
            }}>{lineup.formation}</span>
          )}
          {lineup?.coach&&(
            <div style={{
              marginTop:2,display:"flex",alignItems:"center",gap:4,
              flexDirection:isRight?"row-reverse":"row",
            }}>
              <div style={{
                width:16,height:16,borderRadius:"50%",overflow:"hidden",
                background:"#111",border:`1px solid ${colour}44`,flexShrink:0,
              }}>
                {lineup.coach.photo&&<img src={lineup.coach.photo} alt="" width="16" height="16"
                  style={{objectFit:"cover",objectPosition:"top"}}
                  onError={e=>e.currentTarget.style.display="none"}/>}
              </div>
              <span style={{
                fontSize:"7px",fontWeight:700,
                color:"rgba(255,255,255,.45)",
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
              }}>{(lineup.coach.name||"").split(" ").slice(-1)[0]}</span>
            </div>
          )}
        </div>

        {/* Bench */}
        {bench.length>0&&(
          <>
            <div style={{
              fontSize:"6.5px",fontWeight:900,letterSpacing:".12em",
              textTransform:"uppercase",color:colour,opacity:.75,
              marginBottom:5,display:"flex",alignItems:"center",gap:4,
              justifyContent:isRight?"flex-end":"flex-start",
            }}>
              {!isRight&&<span style={{width:5,height:5,borderRadius:"50%",background:colour,display:"inline-block"}}/>}
              Bench
              {isRight&&<span style={{width:5,height:5,borderRadius:"50%",background:colour,display:"inline-block"}}/>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:2,marginBottom:8}}>
              {bench.map((p,i)=>(
                <PlayerRow key={i} p={p} isOut={false} reason={null} doubt={false}/>
              ))}
            </div>
          </>
        )}

        {/* Unavailable */}
        {unavail.length>0&&(
          <>
            <div style={{
              fontSize:"6.5px",fontWeight:900,letterSpacing:".12em",
              textTransform:"uppercase",color:"#ef4444",opacity:.75,
              marginBottom:5,paddingTop:6,
              borderTop:`1px solid rgba(239,68,68,.15)`,
              display:"flex",alignItems:"center",gap:4,
              justifyContent:isRight?"flex-end":"flex-start",
            }}>
              {!isRight&&<span style={{width:5,height:5,borderRadius:"50%",background:"#ef4444",display:"inline-block"}}/>}
              Out
              {isRight&&<span style={{width:5,height:5,borderRadius:"50%",background:"#ef4444",display:"inline-block"}}/>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              {unavail.map((p,i)=>{
                const reason=p.doubt?"Doubt":(p.type||p.reason||p.player_type||"Inj").slice(0,10);
                return <PlayerRow key={i} p={p} isOut={true} reason={reason} doubt={p.doubt}/>;
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  return(
    <div style={{
      background:"#000",borderRadius:10,border:"1px solid rgba(255,255,255,.08)",
      overflow:"hidden",margin:"0 auto",maxWidth:900,
      fontFamily:"'Inter','Sora',sans-serif",
    }}>
      {/* ── Compact header ── */}
      <div style={{
        display:"flex",alignItems:"center",padding:"8px 14px 7px",
        borderBottom:"1px solid rgba(255,255,255,.07)",background:"#000",gap:10,
      }}>
        {isPredicted&&<span style={{
          fontSize:7,fontWeight:900,color:"#f59e0b",
          background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.22)",
          borderRadius:3,padding:"2px 7px",letterSpacing:".08em",
        }}>PREDICTED</span>}
        <span style={{flex:1,fontSize:9,fontWeight:700,color:"rgba(255,255,255,.18)",
          letterSpacing:".06em",textAlign:"center"}}>LINEUP</span>
      </div>

      {/* ── Three-column main body: [HomeSidebar] [Pitch] [AwaySidebar] ── */}
      <div style={{display:"grid",gridTemplateColumns:"120px 1fr 120px",alignItems:"stretch"}}>

        {/* Home sidebar */}
        <Sidebar lineup={home} team={homeTeam} colour={hc} isRight={false}/>

        {/* Pitch — full height of grid row, no border, no padding */}
        <div style={{position:"relative",width:"100%",paddingBottom:"50%",overflow:"hidden",background:"#000"}}>
          <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}}
            viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
            <rect width="200" height="100" fill="#000"/>
            {/* Full-bleed half tints — edge to edge */}
            <rect x="0" y="0" width="100" height="100" fill={hc} opacity="0.18"/>
            <rect x="100" y="0" width="100" height="100" fill={ac} opacity="0.18"/>
            {/* Pitch markings */}
            <rect x="2" y="3" width="196" height="94" rx="1" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth=".6"/>
            <line x1="100" y1="3" x2="100" y2="97" stroke="rgba(255,255,255,.8)" strokeWidth=".6"/>
            <circle cx="100" cy="50" r="15" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth=".55"/>
            <circle cx="100" cy="50" r="1.1" fill="rgba(255,255,255,.95)"/>
            {/* Left penalty box */}
            <rect x="2" y="26" width="23" height="48" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth=".5"/>
            <rect x="2" y="36" width="8" height="28" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth=".42"/>
            <circle cx="16" cy="50" r=".9" fill="rgba(255,255,255,.88)"/>
            <path d="M25,37 A14,14 0 0,1 25,63" fill="none" stroke="rgba(255,255,255,.38)" strokeWidth=".38"/>
            <rect x="0" y="41" width="2" height="18" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.72)" strokeWidth=".45"/>
            {/* Right penalty box */}
            <rect x="175" y="26" width="23" height="48" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth=".5"/>
            <rect x="190" y="36" width="8" height="28" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth=".42"/>
            <circle cx="184" cy="50" r=".9" fill="rgba(255,255,255,.88)"/>
            <path d="M175,37 A14,14 0 0,0 175,63" fill="none" stroke="rgba(255,255,255,.38)" strokeWidth=".38"/>
            <rect x="198" y="41" width="2" height="18" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.72)" strokeWidth=".45"/>
            {/* Corners */}
            <path d="M2,3 Q4,3 4,5"     fill="none" stroke="rgba(255,255,255,.62)" strokeWidth=".42"/>
            <path d="M198,3 Q196,3 196,5" fill="none" stroke="rgba(255,255,255,.62)" strokeWidth=".42"/>
            <path d="M2,97 Q4,97 4,95"   fill="none" stroke="rgba(255,255,255,.62)" strokeWidth=".42"/>
            <path d="M198,97 Q196,97 196,95" fill="none" stroke="rgba(255,255,255,.62)" strokeWidth=".42"/>
            {/* Stadium name in free zone at top-centre */}
            {venueName&&(
              <text x="100" y="10" textAnchor="middle" fontSize="4.2" fontFamily="Inter,sans-serif"
                fontWeight="700" fill="rgba(255,255,255,.42)" letterSpacing=".25">
                {String(venueName).slice(0,28)}
              </text>
            )}
          </svg>
          <div style={{position:"absolute",inset:0,zIndex:2}}>
            <Tokens lineup={home} side="left"  colour={hc}/>
            <Tokens lineup={away} side="right" colour={ac}/>
          </div>
        </div>

        {/* Away sidebar */}
        <Sidebar lineup={away} team={awayTeam} colour={ac} isRight={true}/>

      </div>
    </div>
  );
}



function ScoreHero({ fixture, homeTeam, awayTeam, score, status, mode, stats }) {
  const isLive  = mode === "live";
  const isFT    = mode === "fulltime";
  const hGoals  = score?.fulltime?.home  ?? score?.halftime?.home  ?? 0;
  const aGoals  = score?.fulltime?.away  ?? score?.halftime?.away  ?? 0;
  const homeWin = hGoals > aGoals;
  const awayWin = aGoals > hGoals;

  const hXG   = getStat(stats, homeTeam?.id, "expected_goals");
  const aXG   = getStat(stats, awayTeam?.id, "expected_goals");
  const hPoss = getStat(stats, homeTeam?.id, "Ball Possession");
  const aPoss = getStat(stats, awayTeam?.id, "Ball Possession");
  const hShots = getStat(stats, homeTeam?.id, "Total Shots");
  const aShots = getStat(stats, awayTeam?.id, "Total Shots");

  return (
    <div style={{
      position:"relative",
      background:"#000",
      borderBottom:"1px solid rgba(255,255,255,0.07)",
      overflow:"hidden",
      padding:"28px 24px 22px",
    }}>
      <div style={{ position:"absolute", top:-80, left:"15%",  width:340, height:340, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,0.08),transparent 70%)",  pointerEvents:"none" }} />
      <div style={{ position:"absolute", top:-80, right:"15%", width:340, height:340, borderRadius:"50%", background:"radial-gradient(circle,rgba(239,68,68,0.08),transparent 70%)", pointerEvents:"none" }} />

      {/* Competition + status */}
      <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:10, marginBottom:20 }}>
        {fixture?.league?.logo && <img src={fixture.league.logo} alt="" width={16} height={16} style={{ objectFit:"contain" }} />}
        <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.3)", letterSpacing:"0.1em", textTransform:"uppercase" }}>
          {fixture?.league?.name}{fixture?.league?.round ? ` · ${fixture.league.round}` : ""}
        </span>
        {isLive && (
          <span style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(255,68,68,0.12)", border:"1px solid rgba(255,68,68,0.25)", borderRadius:999, padding:"2px 9px" }}>
            <LiveDot />
            <span style={{ fontSize:9, fontWeight:900, color:"#ff6666", letterSpacing:"0.1em" }}>
              {fmtMin(status?.elapsed, status?.extra) || "LIVE"}
            </span>
          </span>
        )}
        {isFT && (
          <span style={{ fontSize:9, fontWeight:900, color:"rgba(255,255,255,0.3)", background:"rgba(255,255,255,0.05)", borderRadius:999, padding:"2px 9px", letterSpacing:"0.1em" }}>
            FULL TIME
          </span>
        )}
        {status?.short === "HT" && (
          <Pill color="rgba(245,158,11,0.12)" textColor="#f59e0b">HALF TIME</Pill>
        )}
      </div>

      {/* Score row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, maxWidth:680, margin:"0 auto" }}>
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
          <img src={homeTeam?.logo} alt={homeTeam?.name} width={56} height={56}
            style={{ objectFit:"contain", filter: homeWin ? "drop-shadow(0 0 14px rgba(59,130,246,0.5))" : "none" }}
            onError={e => e.currentTarget.style.opacity="0"} />
          <span style={{ fontSize:14, fontWeight:900, color:"#f0f6ff", textAlign:"center" }}>{homeTeam?.name}</span>
        </div>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{
              fontSize:54, fontWeight:900, lineHeight:1,
              color: homeWin ? "#60a5fa" : awayWin ? "rgba(255,255,255,0.3)" : "#f0f6ff",
              fontFamily:"'JetBrains Mono',monospace",
              textShadow: homeWin ? "0 0 30px rgba(96,165,250,0.4)" : "none",
            }}>{hGoals}</span>
            <span style={{ fontSize:26, fontWeight:300, color:"rgba(255,255,255,0.18)", lineHeight:1 }}>–</span>
            <span style={{
              fontSize:54, fontWeight:900, lineHeight:1,
              color: awayWin ? "#f87171" : homeWin ? "rgba(255,255,255,0.3)" : "#f0f6ff",
              fontFamily:"'JetBrains Mono',monospace",
              textShadow: awayWin ? "0 0 30px rgba(248,113,113,0.4)" : "none",
            }}>{aGoals}</span>
          </div>
          {score?.halftime && isFT && (
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.2)", fontFamily:"'JetBrains Mono',monospace" }}>
              HT {score.halftime.home}–{score.halftime.away}
            </span>
          )}
          {fixture?.venue?.name && (
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.18)", marginTop:2 }}>
              {fixture.venue.name}
            </span>
          )}
        </div>

        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
          <img src={awayTeam?.logo} alt={awayTeam?.name} width={56} height={56}
            style={{ objectFit:"contain", filter: awayWin ? "drop-shadow(0 0 14px rgba(239,68,68,0.5))" : "none" }}
            onError={e => e.currentTarget.style.opacity="0"} />
          <span style={{ fontSize:14, fontWeight:900, color:"#f0f6ff", textAlign:"center" }}>{awayTeam?.name}</span>
        </div>
      </div>

      {/* Stat strip */}
      {(hXG || hPoss || hShots) && (
        <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:18, flexWrap:"wrap" }}>
          {[
            { label:"xG",   h:hXG,   a:aXG   },
            { label:"Shots", h:hShots, a:aShots },
            { label:"Poss",  h:hPoss,  a:aPoss  },
          ].filter(s => s.h || s.a).map(({ label, h, a }) => (
            <div key={label} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:12, fontWeight:800, color:"#60a5fa", fontFamily:"'JetBrains Mono',monospace" }}>{h ?? "–"}</span>
              <span style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.22)", letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</span>
              <span style={{ fontSize:12, fontWeight:800, color:"#f87171", fontFamily:"'JetBrains Mono',monospace" }}>{a ?? "–"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MomentumGraph({ momentumData, events }) {
  const useBackend = !!momentumData?.home_momentum;
  if (!useBackend && !events?.length) return null;

  const home90  = useBackend ? (momentumData.home_momentum || []) : null;
  const away90  = useBackend ? (momentumData.away_momentum || []) : null;
  const len     = useBackend ? home90.length : 18;
  const elapsed = momentumData?.elapsed || 0;

  const goalEvents = (events||[]).filter(e =>
    (e?.type||"").toLowerCase()==="goal" ||
    (e?.detail||"").toLowerCase().includes("goal")
  ).map(e => ({ min: e?.time?.elapsed||0, isHome: e?.team?.id === momentumData?.home_id }));

  const cardEvents = (events||[]).filter(e =>
    (e?.type||"").toLowerCase()==="card"
  ).map(e => ({ min: e?.time?.elapsed||0, isYellow: !(e?.detail||"").toLowerCase().includes("red") }));

  const bins = useBackend ? null : (() => {
    const b = Array(18).fill(null).map(() => ({ home:0, away:0 }));
    (events||[]).forEach(ev => {
      const min = ev?.time?.elapsed||0;
      const bin = Math.min(Math.floor(min/5), 17);
      if (ev?.team?.id === ev?.homeTeamId) b[bin].home++;
      else b[bin].away++;
    });
    return b;
  })();

  return (
    <div style={{ padding:"14px 20px 10px", background:"rgba(255,255,255,0.012)", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <SectionLabel>Match Momentum</SectionLabel>
        {momentumData?.overall && (
          <div style={{ display:"flex", gap:14, fontSize:10, fontWeight:700 }}>
            <span style={{ color:"#60a5fa", display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:"#60a5fa", display:"inline-block" }}/>
              {momentumData.home_team?.split(" ").pop()} {momentumData.overall.home_pct}%
            </span>
            <span style={{ color:"#f87171", display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:"#f87171", display:"inline-block" }}/>
              {momentumData.away_team?.split(" ").pop()} {momentumData.overall.away_pct}%
            </span>
          </div>
        )}
      </div>

      {/* Waveform */}
      <div style={{ position:"relative", height:64, borderRadius:7, overflow:"hidden", background:"rgba(255,255,255,.025)", border:"1px solid rgba(255,255,255,.05)" }}>
        <div style={{ position:"absolute", left:0, right:0, top:"50%", height:"1px", background:"rgba(255,255,255,.1)", zIndex:1 }}/>
        {elapsed > 0 && (
          <div style={{ position:"absolute", top:0, bottom:0, left:`${(elapsed/90)*100}%`, width:"1.5px", background:"rgba(255,255,255,.45)", zIndex:4 }}>
            <div style={{ position:"absolute", top:"-1px", left:"50%", transform:"translateX(-50%)", width:5, height:5, borderRadius:"50%", background:"#fff" }}/>
            <div style={{ position:"absolute", bottom:3, left:3, fontSize:7, fontWeight:800, color:"rgba(255,255,255,.6)", fontFamily:"monospace", whiteSpace:"nowrap" }}>{elapsed}'</div>
          </div>
        )}
        <div style={{ display:"flex", height:"100%", alignItems:"center", padding:"0 2px", gap:"1px" }}>
          {Array.from({ length: len }).map((_, i) => {
            const pct = i / len;
            const isFuture = elapsed > 0 && pct > elapsed/90;
            let h, a;
            if (useBackend) {
              h = home90[i] || 0; a = away90[i] || 0;
            } else {
              const bd = bins[i] || { home:0, away:0 };
              h = bd.home || 0.2; a = bd.away || 0.2;
            }
            const total = Math.max(h+a, 0.01);
            const hFrac = h/total;
            const scale = Math.min((h+a)*0.8, 1);
            const maxPx = 28;
            const hPx   = Math.max(Math.round(hFrac*scale*maxPx), 2);
            const aPx   = Math.max(Math.round((1-hFrac)*scale*maxPx), 2);
            return (
              <div key={i} style={{ flex:1, height:"100%", display:"flex", flexDirection:"column", justifyContent:"center", gap:"1px" }}>
                <div style={{ height:`${hPx}px`, background:`rgba(59,130,246,${isFuture?.15:.58})`, borderRadius:"2px 2px 0 0" }}/>
                <div style={{ height:`${aPx}px`, background:`rgba(239,68,68,${isFuture?.12:.5})`, borderRadius:"0 0 2px 2px" }}/>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase dominance strip */}
      {momentumData?.phases?.length > 0 && (
        <div style={{ marginTop:5, display:"flex", height:5, borderRadius:3, overflow:"hidden" }}>
          {momentumData.phases.map((ph, i) => {
            const w = ((ph.end-ph.start)/90)*100;
            return <div key={i} style={{ width:`${w}%`, background: ph.team==="home" ? "rgba(59,130,246,.5)" : "rgba(239,68,68,.45)" }}/>;
          })}
        </div>
      )}

      {/* Event markers */}
      {(goalEvents.length > 0 || cardEvents.length > 0) && (
        <div style={{ position:"relative", marginTop:6, height:20, background:"rgba(255,255,255,.02)", borderRadius:4 }}>
          <div style={{ position:"absolute", top:"50%", left:0, right:0, height:"1px", background:"rgba(255,255,255,.07)" }}/>
          {goalEvents.map((g,i) => (
            <div key={`g${i}`} style={{ position:"absolute", left:`${(g.min/90)*100}%`, top:"50%", transform:"translate(-50%,-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:1, zIndex:3 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"#34d399", border:"1.5px solid #060f07" }}/>
              <span style={{ fontSize:6.5, color:"#34d399", fontWeight:800, fontFamily:"monospace", whiteSpace:"nowrap" }}>{g.min}'</span>
            </div>
          ))}
          {cardEvents.map((c,i) => (
            <div key={`c${i}`} style={{ position:"absolute", left:`${(c.min/90)*100}%`, top:"50%", transform:"translate(-50%,-50%)", zIndex:3 }}>
              <div style={{ width:6, height:8, borderRadius:1, background: c.isYellow?"#fbbf24":"#ef4444", border:"1.5px solid #060f07" }}/>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, padding:"0 1px" }}>
        {["0'","15'","30'","45'","60'","75'","90'"].map(l => (
          <span key={l} style={{ fontSize:8, color:"rgba(255,255,255,0.18)" }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

function Timeline({ events, homeTeam, awayTeam }) {
  if (!events?.length) return null;
  return (
    <div style={{ padding:"20px 24px" }}>
      <SectionLabel>Match Events</SectionLabel>
      <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
        {events.map((ev, i) => {
          const isHome = ev.team?.id === homeTeam?.id;
          const min    = fmtMin(ev.time?.elapsed, ev.time?.extra);
          return (
            <div key={i} style={{
              display:"grid", gridTemplateColumns:"1fr 52px 1fr",
              gap:8, alignItems:"center",
              padding:"7px 10px",
              borderBottom:"1px solid rgba(255,255,255,0.025)",
              borderLeft: (ev.type||"").toLowerCase()==="goal" ? "3px solid #34d399" : (ev.detail||"").toLowerCase().includes("yellow") ? "3px solid #fbbf24" : (ev.detail||"").toLowerCase().includes("red") ? "3px solid #ef4444" : (ev.type||"").toLowerCase()==="subst" ? "3px solid #60a5fa" : "3px solid transparent",
              background: (ev.type||"").toLowerCase()==="goal" ? "rgba(52,211,153,.04)" : "transparent",
              borderRadius: 4,
            }}>
              {isHome ? (
                <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end" }}>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{ev.player?.name}</div>
                    {ev.assist?.name && <div style={{ fontSize:10, color:"rgba(255,255,255,0.28)" }}>assist: {ev.assist.name}</div>}
                    {ev.detail && <div style={{ fontSize:9, color:"rgba(255,255,255,0.2)", fontStyle:"italic" }}>{ev.detail}</div>}
                  </div>
                  <EventIcon type={ev.type} detail={ev.detail} />
                </div>
              ) : <div />}

              <div style={{ textAlign:"center" }}>
                <span style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.4)", fontFamily:"'JetBrains Mono',monospace", background:"rgba(255,255,255,0.06)", borderRadius:4, padding:"2px 6px" }}>
                  {min}
                </span>
              </div>

              {!isHome ? (
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <EventIcon type={ev.type} detail={ev.detail} />
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{ev.player?.name}</div>
                    {ev.assist?.name && <div style={{ fontSize:10, color:"rgba(255,255,255,0.28)" }}>assist: {ev.assist.name}</div>}
                    {ev.detail && <div style={{ fontSize:9, color:"rgba(255,255,255,0.2)", fontStyle:"italic" }}>{ev.detail}</div>}
                  </div>
                </div>
              ) : <div />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── LIVE OVERVIEW — Option 1 ─────────────────────────────────────────────────
function LiveOverview({ stats, homeTeam, awayTeam, events, momentumData, winProb, score, status }) {
  const hStats = (stats||[]).find(s => s.team?.id === homeTeam?.id)?.statistics || [];
  const aStats = (stats||[]).find(s => s.team?.id === awayTeam?.id)?.statistics || [];
  function gs(arr,key){ return arr.find(s=>s.type===key)?.value??null; }
  const hc = tColour(homeTeam?.id,"#38bdf8");
  const ac = tColour(awayTeam?.id,"#f97316");
  const hName = homeTeam?.name?.split(" ").pop()||"Home";
  const aName = awayTeam?.name?.split(" ").pop()||"Away";
  const hXG   = gs(hStats,"expected_goals");  const aXG   = gs(aStats,"expected_goals");
  const hPoss = gs(hStats,"Ball Possession");  const aPoss = gs(aStats,"Ball Possession");
  const hSOT  = gs(hStats,"Shots on Goal");    const aSOT  = gs(aStats,"Shots on Goal");
  const wp = winProb?.pre_match;
  const hWP = wp?.p_home_win??null, dWP = wp?.p_draw??null, aWP = wp?.p_away_win??null;

  function MetricCard({ label, hVal, aVal, colKey }) {
    const hN=parseFloat(String(hVal??"0").replace("%",""))||0;
    const aN=parseFloat(String(aVal??"0").replace("%",""))||0;
    const hLeads=hN>aN;
    const pct=hN/(hN+aN||1)*100;
    const bar=colKey==="xg"?hc:colKey==="poss"?"#60a5fa":"#34d399";
    const rgb=colKey==="xg"?"59,130,246":colKey==="poss"?"96,165,250":"52,211,153";
    return (
      <div style={{flex:1,minWidth:0,padding:"12px 14px 11px",borderRadius:10,
        background:`rgba(${rgb},.07)`,border:`1px solid rgba(${rgb},.18)`}}>
        <div style={{fontSize:7.5,fontWeight:800,letterSpacing:".1em",textTransform:"uppercase",
          color:"rgba(255,255,255,.28)",marginBottom:8}}>{label}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:9}}>
          <span style={{fontSize:22,fontWeight:900,fontFamily:"monospace",
            color:hLeads?"#fff":"rgba(255,255,255,.38)"}}>{hVal??"–"}</span>
          <span style={{fontSize:14,fontWeight:700,fontFamily:"monospace",
            color:"rgba(255,255,255,.25)"}}>{aVal??"–"}</span>
        </div>
        <div style={{height:3,borderRadius:2,overflow:"hidden",background:"rgba(255,255,255,.06)"}}>
          <div style={{width:`${pct}%`,height:"100%",background:bar}}/>
        </div>
      </div>
    );
  }

  if(!stats?.length&&!events?.length) return null;
  return (
    <div style={{padding:"14px 16px 4px"}}>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <MetricCard label="Expected Goals (xG)" hVal={hXG}   aVal={aXG}   colKey="xg"/>
        <MetricCard label="Possession"           hVal={hPoss} aVal={aPoss} colKey="poss"/>
        <MetricCard label="Shots on Target"      hVal={hSOT}  aVal={aSOT}  colKey="sot"/>
      </div>
      {hWP!=null&&(
        <div style={{padding:"12px 14px",borderRadius:10,background:"rgba(255,255,255,.025)",
          border:"1px solid rgba(255,255,255,.05)",marginBottom:10}}>
          <div style={{fontSize:7.5,fontWeight:800,letterSpacing:".1em",textTransform:"uppercase",
            color:"rgba(255,255,255,.25)",marginBottom:8}}>Win Probability</div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,fontWeight:800,marginBottom:7}}>
            <span style={{color:hc}}>{hName} {hWP}%</span>
            <span style={{color:"rgba(255,255,255,.28)"}}>Draw {dWP}%</span>
            <span style={{color:ac}}>{aName} {aWP}%</span>
          </div>
          <div style={{display:"flex",height:8,borderRadius:999,overflow:"hidden",gap:2}}>
            <div style={{width:`${hWP}%`,background:hc,borderRadius:"999px 0 0 999px"}}/>
            <div style={{width:`${dWP}%`,background:"rgba(255,255,255,.18)"}}/>
            <div style={{width:`${aWP}%`,background:ac,borderRadius:"0 999px 999px 0"}}/>
          </div>
        </div>
      )}
      <MomentumGraph momentumData={momentumData} events={events}/>
      {events.length>0&&(
        <div style={{marginTop:10,paddingBottom:10}}>
          <div style={{fontSize:7.5,fontWeight:900,letterSpacing:".12em",textTransform:"uppercase",
            color:"rgba(255,255,255,.22)",marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:"#34d399",display:"inline-block"}}/>
            Recent Events
          </div>
          {[...events].reverse().slice(0,5).map((ev,i)=>{
            const isHome=ev.team?.id===homeTeam?.id;
            const min=fmtMin(ev.time?.elapsed,ev.time?.extra);
            const isGoal=(ev.type||"").toLowerCase()==="goal";
            const isYel=(ev.detail||"").toLowerCase().includes("yellow");
            const isRed=(ev.detail||"").toLowerCase().includes("red");
            const accent=isGoal?"#34d399":isYel?"#fbbf24":isRed?"#ef4444":"rgba(255,255,255,.08)";
            return(
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 44px 1fr",gap:6,
                alignItems:"center",padding:"5px 8px",borderRadius:5,
                borderLeft:`2.5px solid ${accent}`,
                background:isGoal?"rgba(52,211,153,.04)":"transparent",marginBottom:2}}>
                {isHome?(
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{ev.player?.name}</div>
                    {ev.assist?.name&&<div style={{fontSize:9,color:"rgba(255,255,255,.28)"}}>ast: {ev.assist.name}</div>}
                  </div>
                ):<div/>}
                <div style={{textAlign:"center",fontSize:9,fontWeight:800,color:"rgba(255,255,255,.4)",
                  fontFamily:"monospace",background:"rgba(255,255,255,.06)",borderRadius:4,padding:"2px 4px"}}>{min}</div>
                {!isHome?(
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{ev.player?.name}</div>
                    {ev.assist?.name&&<div style={{fontSize:9,color:"rgba(255,255,255,.28)"}}>ast: {ev.assist.name}</div>}
                  </div>
                ):<div/>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── STATS PANEL — B (Shot Map) / C (Mirror Scanner) ─────────────────────────
function StatsPanel({ stats, homeTeam, awayTeam, shotMapData }) {
  const [view, setView] = useState("shotmap");
  if(!stats?.length) return null;
  const hStats=stats.find(s=>s.team?.id===homeTeam?.id)?.statistics||[];
  const aStats=stats.find(s=>s.team?.id===awayTeam?.id)?.statistics||[];
  const hc=tColour(homeTeam?.id,"#38bdf8");
  const ac=tColour(awayTeam?.id,"#f97316");
  const hName=homeTeam?.name?.split(" ").pop()||"Home";
  const aName=awayTeam?.name?.split(" ").pop()||"Away";
  function gs(arr,key){ return arr.find(s=>s.type===key)?.value??null; }

  const ALL=[
    {key:"Ball Possession",  label:"Possession"},
    {key:"expected_goals",   label:"xG"},
    {key:"Total Shots",      label:"Total Shots"},
    {key:"Shots on Goal",    label:"On Target"},
    {key:"Shots insidebox",  label:"Inside Box"},
    {key:"Corner Kicks",     label:"Corners"},
    {key:"Passes %",         label:"Pass Acc"},
    {key:"Total passes",     label:"Passes"},
    {key:"Fouls",            label:"Fouls"},
    {key:"Yellow Cards",     label:"Yellows"},
    {key:"Red Cards",        label:"Reds"},
    {key:"Offsides",         label:"Offsides"},
    {key:"Blocked Shots",    label:"Blocked"},
    {key:"Goalkeeper Saves", label:"GK Saves"},
  ].map(r=>({...r,home:gs(hStats,r.key),away:gs(aStats,r.key)}))
   .filter(r=>r.home!=null||r.away!=null);

  if(!ALL.length) return null;

  const Header=()=>(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,gap:8}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        {homeTeam?.logo&&<img src={homeTeam.logo} alt="" width={15} height={15} style={{objectFit:"contain"}}/>}
        <span style={{width:7,height:7,borderRadius:"50%",background:hc,display:"inline-block"}}/>
        <span style={{fontSize:12,fontWeight:800,color:"rgba(255,255,255,.8)"}}>{hName}</span>
      </div>
      <div style={{display:"flex",gap:2,background:"rgba(255,255,255,.05)",borderRadius:7,padding:2}}>
        <button onClick={()=>setView("shotmap")} style={{padding:"4px 12px",borderRadius:5,border:"none",
          cursor:"pointer",fontSize:10,fontWeight:800,
          background:view==="shotmap"?"rgba(255,255,255,.12)":"transparent",
          color:view==="shotmap"?"#fff":"rgba(255,255,255,.35)"}}>Shot Map</button>
        <button onClick={()=>setView("scanner")} style={{padding:"4px 12px",borderRadius:5,border:"none",
          cursor:"pointer",fontSize:10,fontWeight:800,
          background:view==="scanner"?"rgba(255,255,255,.12)":"transparent",
          color:view==="scanner"?"#fff":"rgba(255,255,255,.35)"}}>Scanner</button>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={{fontSize:12,fontWeight:800,color:"rgba(255,255,255,.8)"}}>{aName}</span>
        <span style={{width:7,height:7,borderRadius:"50%",background:ac,display:"inline-block"}}/>
        {awayTeam?.logo&&<img src={awayTeam.logo} alt="" width={15} height={15} style={{objectFit:"contain"}}/>}
      </div>
    </div>
  );

  // ── B: Shot map + key grid ────────────────────────────────────────────────
  if(view==="shotmap"){
    const hSIB=gs(hStats,"Shots insidebox"); const aSIB=gs(aStats,"Shots insidebox");
    const hSOT=gs(hStats,"Shots on Goal");   const aSOT=gs(aStats,"Shots on Goal");
    const hTS =gs(hStats,"Total Shots");      const aTS =gs(aStats,"Total Shots");
    const hSaves=gs(hStats,"Goalkeeper Saves"); const aSaves=gs(aStats,"Goalkeeper Saves");
    const hConv=hTS&&hSOT?`${Math.round(parseFloat(hSOT)/parseFloat(hTS)*100)}%`:null;
    const aConv=aTS&&aSOT?`${Math.round(parseFloat(aSOT)/parseFloat(aTS)*100)}%`:null;
    const allShots=shotMapData?[
      ...(shotMapData.home?.shots||[]).map(s=>({...s,side:"home"})),
      ...(shotMapData.away?.shots||[]).map(s=>({...s,side:"away"})),
    ]:[];
    const keyCards=[
      {label:"Shots inside box",h:hSIB, a:aSIB, rgb:"200,16,46"},
      {label:"Conversion rate", h:hConv,a:aConv,rgb:"52,211,153"},
      {label:"GK Saves",        h:hSaves,a:aSaves,rgb:"167,139,250"},
    ].filter(c=>c.h!=null||c.a!=null);
    const bottomStats=[
      {label:"Corners", h:gs(hStats,"Corner Kicks"),a:gs(aStats,"Corner Kicks")},
      {label:"Offsides",h:gs(hStats,"Offsides"),    a:gs(aStats,"Offsides")},
      {label:"Yellows", h:gs(hStats,"Yellow Cards"), a:gs(aStats,"Yellow Cards")},
      {label:"Pass Acc",h:gs(hStats,"Passes %"),     a:gs(aStats,"Passes %")},
    ].filter(r=>r.h!=null||r.a!=null);
    return(
      <div style={{padding:"16px 16px 14px",borderTop:"1px solid rgba(255,255,255,.04)"}}>
        <Header/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div>
            <div style={{fontSize:7.5,fontWeight:800,letterSpacing:".1em",textTransform:"uppercase",
              color:"rgba(255,255,255,.22)",marginBottom:6,display:"flex",alignItems:"center",gap:5}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:hc,display:"inline-block"}}/>
              {hName} Shot Zones
            </div>
            <div style={{position:"relative",paddingBottom:"60%",borderRadius:8,
              overflow:"hidden",border:"1px solid rgba(255,255,255,.07)",background:"#080d08"}}>
              <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} viewBox="0 0 120 72">
                <rect width="120" height="72" fill="#080d08"/>
                <rect x="2" y="2" width="116" height="68" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth=".5"/>
                <rect x="2" y="20" width="22" height="32" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth=".4"/>
                <rect x="2" y="28" width="9" height="16" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth=".35"/>
                <line x1="60" y1="2" x2="60" y2="70" stroke="rgba(255,255,255,.18)" strokeWidth=".4"/>
                <circle cx="60" cy="36" r="13" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth=".4"/>
                <rect x="96" y="20" width="22" height="32" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth=".4"/>
                {allShots.filter(s=>s.side==="home").map((s,i)=>(
                  <circle key={i} cx={(s.x||50)*1.2} cy={(s.y||50)*.72} r={s.is_goal?4:2.5}
                    fill={s.is_goal?hc:"rgba(59,130,246,.45)"}
                    stroke={s.is_goal?"rgba(255,255,255,.75)":"none"} strokeWidth="1"/>
                ))}
                {allShots.length===0&&[[26,36,true],[22,27,false],[30,43,false],[36,32,false],[42,36,false]].map(([cx,cy,g],i)=>(
                  <circle key={i} cx={cx} cy={cy} r={g?4:2.5} fill={g?hc:"rgba(59,130,246,.4)"}
                    stroke={g?"rgba(255,255,255,.7)":"none"} strokeWidth="1"/>
                ))}
              </svg>
              <div style={{position:"absolute",bottom:5,left:7,display:"flex",gap:9}}>
                <span style={{fontSize:7,color:"rgba(255,255,255,.38)",display:"flex",alignItems:"center",gap:3}}>
                  <span style={{width:7,height:7,borderRadius:"50%",background:hc,border:"1px solid rgba(255,255,255,.6)",display:"inline-block"}}/>Goal</span>
                <span style={{fontSize:7,color:"rgba(255,255,255,.38)",display:"flex",alignItems:"center",gap:3}}>
                  <span style={{width:7,height:7,borderRadius:"50%",background:"rgba(59,130,246,.45)",display:"inline-block"}}/>Shot</span>
              </div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {keyCards.map(({label,h,a,rgb})=>{
              const hN=parseFloat(String(h??"0").replace("%",""))||0;
              const aN=parseFloat(String(a??"0").replace("%",""))||0;
              const hLeads=hN>aN;
              return(
                <div key={label} style={{padding:"10px 12px",borderRadius:8,flex:1,
                  background:`rgba(${rgb},.07)`,border:`1px solid rgba(${rgb},.18)`}}>
                  <div style={{fontSize:7.5,fontWeight:700,color:"rgba(255,255,255,.3)",
                    textTransform:"uppercase",letterSpacing:".06em",marginBottom:5}}>{label}</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                    <span style={{fontSize:20,fontWeight:900,fontFamily:"monospace",
                      color:hLeads?"#fff":"rgba(255,255,255,.38)"}}>{h??0}</span>
                    <span style={{fontSize:13,fontWeight:700,fontFamily:"monospace",
                      color:"rgba(255,255,255,.28)"}}>{a??0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {bottomStats.length>0&&(
          <div style={{display:"grid",gridTemplateColumns:`repeat(${bottomStats.length},minmax(0,1fr))`,gap:6}}>
            {bottomStats.map(({label,h,a})=>{
              const hN=parseFloat(String(h??"0").replace("%",""))||0;
              const aN=parseFloat(String(a??"0").replace("%",""))||0;
              const hLeads=hN>aN; const aLeads=aN>hN;
              return(
                <div key={label} style={{padding:"8px 6px",borderRadius:7,
                  background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.05)",textAlign:"center"}}>
                  <div style={{fontSize:7,fontWeight:700,color:"rgba(255,255,255,.25)",
                    textTransform:"uppercase",letterSpacing:".04em",marginBottom:5}}>{label}</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:4}}>
                    <span style={{fontSize:13,fontWeight:900,fontFamily:"monospace",
                      color:hLeads?"#fff":hN===aN?"rgba(255,255,255,.55)":"rgba(255,255,255,.38)"}}>{h??"–"}</span>
                    <span style={{fontSize:8,color:"rgba(255,255,255,.18)"}}>–</span>
                    <span style={{fontSize:13,fontWeight:900,fontFamily:"monospace",
                      color:aLeads?"#fff":hN===aN?"rgba(255,255,255,.55)":"rgba(255,255,255,.38)"}}>{a??"–"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── C: Mirror scanner ─────────────────────────────────────────────────────
  return(
    <div style={{padding:"16px 16px 14px",borderTop:"1px solid rgba(255,255,255,.04)"}}>
      <Header/>
      <div>
        {ALL.map(r=>{
          const hN=parseFloat(String(r.home??"0").replace("%",""))||0;
          const aN=parseFloat(String(r.away??"0").replace("%",""))||0;
          const total=hN+aN||1;
          const hPct=(hN/total)*100;
          const hLeads=hN>aN; const aLeads=aN>hN;
          return(
            <div key={r.key} style={{display:"flex",alignItems:"center",gap:8,
              padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,.03)"}}>
              <span style={{fontSize:13,fontWeight:900,fontFamily:"monospace",width:44,
                textAlign:"right",flexShrink:0,
                color:hLeads?"#fff":"rgba(255,255,255,.35)"}}>{r.home??"–"}</span>
              <div style={{flex:1,height:4,borderRadius:2,overflow:"hidden",
                background:"rgba(255,255,255,.05)",transform:"scaleX(-1)"}}>
                <div style={{width:`${hPct}%`,height:"100%",background:hc,borderRadius:2}}/>
              </div>
              <span style={{fontSize:7.5,fontWeight:700,color:"rgba(255,255,255,.24)",
                textTransform:"uppercase",letterSpacing:".05em",width:76,
                textAlign:"center",flexShrink:0}}>{r.label}</span>
              <div style={{flex:1,height:4,borderRadius:2,overflow:"hidden",
                background:"rgba(255,255,255,.05)"}}>
                <div style={{width:`${100-hPct}%`,height:"100%",background:ac,borderRadius:2}}/>
              </div>
              <span style={{fontSize:13,fontWeight:900,fontFamily:"monospace",width:44,
                flexShrink:0,
                color:aLeads?"#fff":"rgba(255,255,255,.35)"}}>{r.away??"–"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function LineupsPanel({lineups,homeTeam,awayTeam,venueName}){
  if(!lineups?.length) return null;
  const tid = l => l.team?.id ?? l.team_id;
  const home=lineups.find(l=>tid(l)===homeTeam?.id)||lineups[0];
  const away=lineups.find(l=>tid(l)===awayTeam?.id)||lineups[1];
  if(!home&&!away) return null;
  return <PitchLineup homeLineup={home} awayLineup={away} homeTeam={homeTeam} awayTeam={awayTeam} venueName={venueName}/>;
}


function ShotMapPanel({ shotMapData, events, homeTeam, awayTeam }) {
  // Use backend shot map data if available
  if (shotMapData) {
    const { home, away } = shotMapData;
    const allShots = [
      ...(home?.shots || []).map(s => ({ ...s, side:"home" })),
      ...(away?.shots || []).map(s => ({ ...s, side:"away" })),
    ];
    if (!allShots.length) return null;
    return (
      <div style={{ padding:"20px 24px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
        <SectionLabel>Shot Map</SectionLabel>
        <div style={{ display:"flex", gap:16, marginBottom:10, flexWrap:"wrap" }}>
          {[
            { label: homeTeam?.name, data: home?.summary, color:"#60a5fa" },
            { label: awayTeam?.name, data: away?.summary, color:"#f87171" },
          ].map(({ label, data, color }) => data && (
            <div key={label} style={{ display:"flex", gap:12, fontSize:10, color:"rgba(255,255,255,0.4)" }}>
              <span style={{ fontWeight:800, color }}>{label?.split(" ").pop()}</span>
              <span>{data.total} shots</span>
              <span style={{ color: "#34d399" }}>xG {data.total_xg}</span>
              <span>{data.on_target} on target</span>
            </div>
          ))}
        </div>
        <div style={{ position:"relative", width:"100%", paddingBottom:"64.7%", borderRadius:12, overflow:"hidden" }}>
          <PitchSvg />
          {allShots.map((s,i) => {
            const isGoal = s.is_goal;
            const isHome = s.side === "home";
            return (
              <div key={i} title={`${s.player || ""} ${s.minute ? s.minute+"'" : ""} xG:${s.xg}`}
                style={{
                  position:"absolute",
                  left:`${s.x}%`, top:`${s.y}%`,
                  width: isGoal ? 10 : 7, height: isGoal ? 10 : 7,
                  borderRadius:"50%",
                  background: isGoal ? (isHome ? "#60a5fa" : "#f87171") : "rgba(255,255,255,0.22)",
                  border: isGoal ? "2px solid rgba(255,255,255,0.8)" : "1px solid rgba(255,255,255,0.2)",
                  transform:"translate(-50%,-50%)",
                  boxShadow: isGoal ? "0 0 8px currentColor" : "none",
                  cursor:"default",
                }}
              />
            );
          })}
        </div>
        <div style={{ display:"flex", gap:16, marginTop:8, justifyContent:"center" }}>
          {[
            { color:"#60a5fa", label:"Goal (Home)", border:true },
            { color:"#f87171", label:"Goal (Away)", border:true },
            { color:"rgba(255,255,255,0.22)", label:"Shot", border:false },
          ].map(({ color, label, border }) => (
            <span key={label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, color:"rgba(255,255,255,0.35)" }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:color, border: border ? "1.5px solid rgba(255,255,255,0.6)" : "1px solid rgba(255,255,255,0.2)" }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Fallback: goals only from events
  const goals = (events || []).filter(e => e.type === "Goal");
  if (!goals.length) return null;

  return (
    <div style={{ padding:"20px 24px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
      <SectionLabel>Goals</SectionLabel>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {goals.map((g,i) => {
          const isHome = g.team?.id === homeTeam?.id;
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.03)" }}>
              <span style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.35)", width:30, fontFamily:"'JetBrains Mono',monospace" }}>
                {fmtMin(g.time?.elapsed, g.time?.extra)}
              </span>
              <span style={{ width:8, height:8, borderRadius:"50%", background: isHome ? "#60a5fa" : "#f87171", flexShrink:0 }} />
              <span style={{ fontSize:12, fontWeight:700, color:"#e2e8f0", flex:1 }}>{g.player?.name}</span>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>{isHome ? homeTeam?.name : awayTeam?.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlayerTable({ players, homeTeam, awayTeam }) {
  const navigate = useNavigate();
  const [sort, setSort] = useState("rating");
  if (!players?.length) return null;

  const all = players.flatMap(t =>
    (t.players || []).map(p => ({
      ...p,
      teamName: t.team?.name,
      teamLogo: t.team?.logo,
      isHome: t.team?.id === homeTeam?.id,
    }))
  );

  const sortVal = (p) => {
    const stats = p.statistics?.[0];
    if (sort === "rating")  return parseFloat(stats?.games?.rating || 0);
    if (sort === "goals")   return parseInt(stats?.goals?.total || 0);
    if (sort === "assists") return parseInt(stats?.goals?.assists || 0);
    if (sort === "passes")  return parseFloat(stats?.passes?.accuracy || 0);
    return 0;
  };

  const sorted = [...all].sort((a,b) => sortVal(b) - sortVal(a));
  const cols = [
    { key:"rating",  label:"Rating" },
    { key:"goals",   label:"G" },
    { key:"assists", label:"A" },
    { key:"passes",  label:"Pass%" },
  ];

  return (
    <div style={{ padding:"20px 24px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
      <SectionLabel>Player Ratings</SectionLabel>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              <th style={{ padding:"6px 8px", textAlign:"left", fontSize:9, fontWeight:800, color:"rgba(255,255,255,0.25)", letterSpacing:"0.08em", textTransform:"uppercase" }}>Player</th>
              {cols.map(c => (
                <th key={c.key} onClick={() => setSort(c.key)} style={{
                  padding:"6px 8px", textAlign:"center", fontSize:9, fontWeight:800,
                  letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer",
                  color: sort === c.key ? "#60a5fa" : "rgba(255,255,255,0.25)",
                }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0,18).map((p,i) => {
              const stats   = p.statistics?.[0];
              const rating  = stats?.games?.rating  || "–";
              const goals   = stats?.goals?.total   ?? "–";
              const assists = stats?.goals?.assists  ?? "–";
              const passes  = stats?.passes?.accuracy ? `${stats.passes.accuracy}%` : "–";
              const playerId = p.player?.id;
              return (
                <tr key={i}
                  onClick={() => playerId && navigate(`/player/${playerId}`)}
                  style={{
                    borderBottom:"1px solid rgba(255,255,255,0.025)",
                    cursor: playerId ? "pointer" : "default",
                    transition:"background 0.12s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}
                >
                  <td style={{ padding:"7px 8px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      {p.teamLogo && <img src={p.teamLogo} alt="" width={13} height={13} style={{ objectFit:"contain" }} />}
                      <span style={{
                        fontSize:12, fontWeight:700,
                        color: p.isHome ? "#93c5fd" : "#fca5a5",
                        textDecoration: playerId ? "underline" : "none",
                        textDecorationColor: p.isHome ? "rgba(147,197,253,.35)" : "rgba(252,165,165,.35)",
                        textUnderlineOffset:3,
                      }}>{p.player?.name}</span>
                      {playerId && <span style={{ fontSize:8, color:"rgba(255,255,255,.2)", marginLeft:2 }}>↗</span>}
                    </div>
                  </td>
                  <td style={{ padding:"7px 8px", textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:800, color: parseFloat(rating) >= 8 ? "#34d399" : "#e2e8f0" }}>{rating}</td>
                  <td style={{ padding:"7px 8px", textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:"#e2e8f0" }}>{goals}</td>
                  <td style={{ padding:"7px 8px", textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:"#e2e8f0" }}>{assists}</td>
                  <td style={{ padding:"7px 8px", textAlign:"center", fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:"#e2e8f0" }}>{passes}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop:8, fontSize:10, color:"rgba(255,255,255,.18)", textAlign:"center" }}>
        Click any player to view their profile
      </div>
    </div>
  );
}

// ─── Commentary helpers ───────────────────────────────────────────────────────

function buildStatStr(statsObj, key) {
  const h = statsObj?.[key]?.home;
  const a = statsObj?.[key]?.away;
  if (h == null && a == null) return null;
  return `${String(h??0).replace("%","")}–${String(a??0).replace("%","")}`;
}

function buildCommentaryPayload({ d, fixture, events, stats, momentumData, lineups, predictedHome, predictedAway, winProb, mode }) {
  if (!d) return null;
  const h = d.header || {};
  const s = d.statistics || {};
  const elapsed = h.elapsed || fixture?.fixture?.status?.elapsed || 0;

  const evList = (d.events||[]).slice(-10).map(e => ({
    minute: e.minute, type: e.type||"", detail: e.detail||"",
    player: e.player_name||e.player||"",
    team:   e.team_name||e.team||"",
    assist: e.assist_name||e.assist||null,
  }));

  const statsP = {
    possession:        buildStatStr(s,"possession"),
    shots_total:       buildStatStr(s,"shots_total"),
    shots_on_target:   buildStatStr(s,"shots_on_target"),
    shots_inside_box:  buildStatStr(s,"shots_inside_box"),
    xg:                buildStatStr(s,"expected_goals"),
    corners:           buildStatStr(s,"corner_kicks"),
    pass_accuracy:     buildStatStr(s,"pass_accuracy"),
    total_passes:      buildStatStr(s,"total_passes"),
    fouls:             buildStatStr(s,"fouls"),
    yellow_cards:      buildStatStr(s,"yellow_cards"),
    goalkeeper_saves:  buildStatStr(s,"goalkeeper_saves"),
  };

  const mom = momentumData
    ? { home_pct: momentumData.home_pct, away_pct: momentumData.away_pct, dominant_period: momentumData.dominant_period||null }
    : null;

  const h2h = d.h2h||{};
  const h2hP = h2h.count ? {
    count: h2h.count, home_wins: h2h.home_wins, draws: h2h.draws, away_wins: h2h.away_wins,
    avg_goals: h2h.results?.length ? parseFloat((h2h.results.reduce((a,r)=>a+(r.home_goals||0)+(r.away_goals||0),0)/h2h.results.length).toFixed(2)) : null,
    results: (h2h.results||[]).slice(0,4).map(r=>({ date:r.date, home_team:r.home_team, away_team:r.away_team, home_goals:r.home_goals, away_goals:r.away_goals })),
  } : null;

  const fmtForm = l => (l||[]).slice(0,5).map(f=>({ date:f.date, opponent:f.opponent, result:f.result, goals_for:f.goals_for, goals_against:f.goals_against, home_away:f.home_away }));
  const fmtSeason = ss => ss?.played ? { played:ss.played, wins:ss.wins, draws:ss.draws, losses:ss.losses, goals_for_avg:ss.goals_for_avg?String(ss.goals_for_avg):null, goals_against_avg:ss.goals_against_avg?String(ss.goals_against_avg):null, clean_sheets:ss.clean_sheets, form:ss.form } : null;
  const fmtInj = l => (l||[]).map(p=>({ player_name:p.player_name||p.name||"", type:p.type||p.reason||"Injury" }));

  const inj = d.injuries||{}; const ven = d.venue||{}; const pred = d.prediction||{}; const ins = d.insights||[];
  const homeLu = (lineups||[]).find(l=>l.team?.id===h.home_id)||null;
  const awayLu = (lineups||[]).find(l=>l.team?.id===h.away_id)||null;
  const predP  = (pred.p_home_win!=null||winProb?.pre_match) ? {
    p_home_win: pred.p_home_win!=null ? pred.p_home_win*100 : winProb?.pre_match?.p_home_win,
    p_draw:     pred.p_draw!=null     ? pred.p_draw*100     : winProb?.pre_match?.p_draw,
    p_away_win: pred.p_away_win!=null ? pred.p_away_win*100 : winProb?.pre_match?.p_away_win,
    xg_home: pred.xg_home??winProb?.pre_match?.xg_home??null,
    xg_away: pred.xg_away??winProb?.pre_match?.xg_away??null,
    btts: pred.btts??null, over_2_5: pred.over_2_5??null,
  } : null;

  return {
    home_team: h.home_team||"", away_team: h.away_team||"",
    home_score: h.home_score??0, away_score: h.away_score??0,
    elapsed, mode, events: evList, stats: statsP, momentum: mom,
    h2h: h2hP,
    home_form: fmtForm(d.home_recent_form), away_form: fmtForm(d.away_recent_form),
    home_season_stats: fmtSeason(d.home_season_stats),
    away_season_stats: fmtSeason(d.away_season_stats),
    injuries: { home: fmtInj(inj.home||[]), away: fmtInj(inj.away||[]) },
    venue: ven.name ? { name:ven.name, city:ven.city, capacity:ven.capacity, surface:ven.surface } : null,
    referee: h.referee||null, league_round: h.round||null,
    home_lineup_formation: homeLu?.formation||predictedHome?.formation||null,
    away_lineup_formation: awayLu?.formation||predictedAway?.formation||null,
    player_ratings: [], prediction: predP,
    insights: ins.slice(0,4).map(i=>({ type:i.type||"", title:i.title||"", body:i.body||"" })),
  };
}

const COMM_TYPE_STYLE = {
  goal:         { color:"#34d399", bg:"rgba(52,211,153,.12)",  border:"rgba(52,211,153,.25)",  label:"GOAL"       },
  chance:       { color:"#f87171", bg:"rgba(248,113,113,.12)", border:"rgba(248,113,113,.25)", label:"CHANCE"     },
  pressure:     { color:"#fbbf24", bg:"rgba(251,191,36,.12)",  border:"rgba(251,191,36,.25)",  label:"PRESSURE"   },
  tactical:     { color:"#60a5fa", bg:"rgba(96,165,250,.12)",  border:"rgba(96,165,250,.22)",  label:"TACTICAL"   },
  insight:      { color:"#a78bfa", bg:"rgba(167,139,250,.12)", border:"rgba(167,139,250,.22)", label:"INSIGHT"    },
  duel:         { color:"#fb923c", bg:"rgba(251,146,60,.12)",  border:"rgba(251,146,60,.22)",  label:"DUEL"       },
  set_piece:    { color:"#e879f9", bg:"rgba(232,121,249,.12)", border:"rgba(232,121,249,.22)", label:"SET PIECE"  },
  substitution: { color:"#4ade80", bg:"rgba(74,222,128,.12)",  border:"rgba(74,222,128,.22)",  label:"SUB"        },
  preview:      { color:"#60a5fa", bg:"rgba(96,165,250,.12)",  border:"rgba(96,165,250,.22)",  label:"PREVIEW"    },
  prediction:   { color:"#a78bfa", bg:"rgba(167,139,250,.12)", border:"rgba(167,139,250,.22)", label:"PREDICTION" },
  h2h:          { color:"#fbbf24", bg:"rgba(251,191,36,.12)",  border:"rgba(251,191,36,.25)",  label:"H2H"        },
  form:         { color:"#34d399", bg:"rgba(52,211,153,.12)",  border:"rgba(52,211,153,.22)",  label:"FORM"       },
  card:         { color:"#fbbf24", bg:"rgba(251,191,36,.12)",  border:"rgba(251,191,36,.25)",  label:"CARD"       },
};
function commStyle(t){ return COMM_TYPE_STYLE[(t||"").toLowerCase()]||COMM_TYPE_STYLE.insight; }

function CommText({ text }) {
  return (
    <span>
      {(text||"").split(/\*\*(.+?)\*\*/g).map((p,i)=>
        i%2===1 ? <strong key={i} style={{color:"#fff",fontWeight:800}}>{p}</strong> : p
      )}
    </span>
  );
}

function CommentaryPanel({
  fixtureId, mode, fixture, events, stats, momentumData,
  lineups, predictedHome, predictedAway, winProb, matchIntelRaw,
  commentaryFeed, setCommentaryFeed,
  commLoading, setCommLoading,
  commCooldown, setCommCooldown, commCoolRef, commAutoFired,
  homeTeam, awayTeam,
}) {
  const elapsed = fixture?.fixture?.status?.elapsed||0;
  const hScore  = fixture?.score?.fulltime?.home??0;
  const aScore  = fixture?.score?.fulltime?.away??0;
  const isLive  = mode==="live";
  const isFT    = mode==="fulltime";

  function startCooldown(secs) {
    setCommCooldown(secs);
    if (commCoolRef.current) clearInterval(commCoolRef.current);
    commCoolRef.current = setInterval(()=>{
      setCommCooldown(prev=>{ if(prev<=1){clearInterval(commCoolRef.current);return 0;} return prev-1; });
    },1000);
  }

  async function generate() {
    if (commLoading||commCooldown>0) return;
    const payload = buildCommentaryPayload({ d:matchIntelRaw, fixture, events, stats, momentumData, lineups, predictedHome, predictedAway, winProb, mode });
    if (!payload) return;
    setCommLoading(true);
    try {
      const resp = await fetch(`${BACKEND}/api/commentary/${fixtureId}`,{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),
      });
      if (resp.ok) {
        const entries = await resp.json();
        if (Array.isArray(entries)&&entries.length) {
          setCommentaryFeed(prev=>[...entries.slice().reverse(),...prev].slice(0,40));
        }
      } else if (resp.status===429) {
        const body = await resp.json().catch(()=>({}));
        startCooldown(parseInt((body.detail||"").match(/\d+/)?.[0]||"20"));
      }
    } catch(e){ console.error("Commentary error",e); }
    finally { setCommLoading(false); }
    startCooldown(20);
  }

  // Auto-generate once when tab mounts and data is ready
  useEffect(()=>{
    if (commAutoFired.current) return;
    if (!matchIntelRaw) return;
    commAutoFired.current = true;
    generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[matchIntelRaw]);

  const isReady = !commLoading&&commCooldown===0;
  const st = matchIntelRaw?.statistics||{};
  const pills = [
    ["Possession", buildStatStr(st,"possession")],
    ["xG",         buildStatStr(st,"expected_goals")],
    ["Shots",      buildStatStr(st,"shots_total")],
    ["On target",  buildStatStr(st,"shots_on_target")],
    ["Pass acc",   buildStatStr(st,"pass_accuracy")],
    ["Corners",    buildStatStr(st,"corner_kicks")],
  ].filter(([,v])=>v&&!v.includes("null")&&v!=="0–0"&&v!=="undefined–undefined");

  const insights = (matchIntelRaw?.insights||[]).slice(0,3);

  return (
    <div style={{padding:"0 0 48px"}}>
      {/* Status bar */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 20px 6px",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {isLive&&<span style={{width:7,height:7,borderRadius:"50%",background:"#ef4444",display:"inline-block",flexShrink:0,animation:"livePulse 1.4s ease-in-out infinite"}}/>}
          <span style={{fontSize:11,fontWeight:800,color:isLive?"#ef4444":isFT?"#a78bfa":"#60a5fa",letterSpacing:".07em"}}>
            {isLive?`LIVE · ${elapsed}'`:isFT?"FULL TIME":"PRE-MATCH"}
          </span>
          <span style={{fontSize:11,color:"rgba(255,255,255,.3)"}}>{homeTeam?.name} {hScore}–{aScore} {awayTeam?.name}</span>
        </div>
        <span style={{fontSize:9,color:"rgba(255,255,255,.18)",fontFamily:"monospace"}}>OpenRouter · claude-haiku-4-5</span>
      </div>

      {/* Stat pills */}
      {pills.length>0&&(
        <div style={{padding:"8px 20px 2px",display:"flex",flexWrap:"wrap",gap:4}}>
          {pills.map(([label,val])=>(
            <span key={label} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 8px",borderRadius:5,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.07)",fontSize:10,fontWeight:700}}>
              <span style={{color:"rgba(255,255,255,.35)"}}>{label}</span>
              <span style={{color:"#e2e8f0",fontFamily:"'JetBrains Mono',monospace"}}>{val}</span>
            </span>
          ))}
        </div>
      )}

      {/* Refresh button */}
      <div style={{padding:"8px 20px 2px"}}>
        <button onClick={generate} disabled={!isReady} style={{
          display:"flex",alignItems:"center",gap:8,padding:"8px 16px",width:"100%",justifyContent:"center",
          background:isReady?"rgba(167,139,250,.1)":"rgba(255,255,255,.03)",
          border:`1px solid ${isReady?"rgba(167,139,250,.28)":"rgba(255,255,255,.07)"}`,
          borderRadius:8,cursor:isReady?"pointer":"not-allowed",fontSize:11,fontWeight:900,
          letterSpacing:".06em",textTransform:"uppercase",color:isReady?"#a78bfa":"rgba(255,255,255,.22)",transition:"all .15s",
        }}>
          {commLoading?(
            <><span style={{width:12,height:12,borderRadius:"50%",border:"1.5px solid rgba(167,139,250,.3)",borderTopColor:"#a78bfa",display:"inline-block",flexShrink:0,animation:"livePulse .7s linear infinite"}}/>Generating…</>
          ):commCooldown>0?(
            <span style={{fontFamily:"monospace",letterSpacing:".04em"}}>Refresh in {commCooldown}s</span>
          ):(
            <><svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{flexShrink:0}}><path d="M6.5 1v3M6.5 9v3M1 6.5h3M9 6.5h3M2.9 2.9l2.1 2.1M7.9 7.9l2.1 2.1M2.9 10.1l2.1-2.1M7.9 5.1l2.1-2.1" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/></svg>Refresh commentary</>
          )}
        </button>
      </div>

      {/* Loading skeleton */}
      {commLoading&&commentaryFeed.length===0&&(
        <div style={{padding:"14px 20px",display:"flex",flexDirection:"column",gap:14}}>
          {[1,2,3].map(i=>(
            <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <div style={{width:28,height:10,borderRadius:4,background:"rgba(255,255,255,.06)",flexShrink:0,marginTop:3}}/>
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
                <div style={{width:60,height:8,borderRadius:4,background:"rgba(167,139,250,.15)"}}/>
                <div style={{width:"92%",height:8,borderRadius:4,background:"rgba(255,255,255,.05)"}}/>
                <div style={{width:"78%",height:8,borderRadius:4,background:"rgba(255,255,255,.04)"}}/>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feed */}
      {commentaryFeed.length>0&&(
        <div style={{margin:"8px 0 0"}}>
          <div style={{fontSize:8,fontWeight:900,letterSpacing:".14em",textTransform:"uppercase",color:"rgba(255,255,255,.2)",padding:"0 20px 6px",display:"flex",alignItems:"center",gap:6}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:"#a78bfa",display:"inline-block"}}/>
            AI Commentary
          </div>
          {commentaryFeed.map((entry,i)=>{
            const cs=commStyle(entry.type);
            return(
              <div key={i} style={{display:"flex",gap:12,padding:"11px 20px",borderBottom:"1px solid rgba(255,255,255,.04)",alignItems:"flex-start",animation:"fadeUp .3s ease both",animationDelay:`${Math.min(i*.05,.25)}s`}}>
                <div style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,.28)",width:30,flexShrink:0,fontFamily:"'JetBrains Mono',monospace",paddingTop:2}}>{entry.minute||"–"}</div>
                <div style={{flex:1}}>
                  <span style={{display:"inline-block",fontSize:7,fontWeight:900,letterSpacing:".1em",textTransform:"uppercase",background:cs.bg,color:cs.color,border:`1px solid ${cs.border}`,borderRadius:4,padding:"2px 6px",marginBottom:6}}>{cs.label}</span>
                  <div style={{fontSize:12.5,lineHeight:1.7,color:"rgba(255,255,255,.78)",fontFamily:"'Inter','Sora',sans-serif"}}><CommText text={entry.text}/></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Match intelligence insights */}
      {insights.length>0&&(
        <div style={{margin:"12px 16px 0"}}>
          <div style={{fontSize:8,fontWeight:900,letterSpacing:".14em",textTransform:"uppercase",color:"rgba(255,255,255,.2)",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:"#34d399",display:"inline-block"}}/>
            Match Intelligence
          </div>
          {insights.map((ins,i)=>(
            <div key={i} style={{padding:"9px 13px",borderRadius:9,marginBottom:6,background:"rgba(52,211,153,.05)",border:"1px solid rgba(52,211,153,.12)"}}>
              <div style={{fontSize:9,fontWeight:800,color:"#34d399",letterSpacing:".06em",marginBottom:4}}>{(ins.title||"").toUpperCase()}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.6)",lineHeight:1.6}}>{ins.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab configs by mode ──────────────────────────────────────────────────────

const TABS_BY_MODE = {
  prematch: ["Preview","Lineups","Odds","Commentary"],
  live:     ["Overview","Events","Stats","Lineups","Players","Commentary"],
  fulltime: ["Overview","Events","Stats","Lineups","Commentary"],
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LiveMatchPage() {
  const { fixtureId } = useParams();
  const navigate = useNavigate();

  const [tab,           setTab]          = useState(null);
  const [fixture,       setFixture]      = useState(null);
  const [events,        setEvents]       = useState([]);
  const [stats,         setStats]        = useState([]);
  const [lineups,       setLineups]      = useState([]);
  const [players,       setPlayers]      = useState([]);
  const [winProb,       setWinProb]      = useState(null);
  const [momentumData,  setMomentumData] = useState(null);
  const [shotMapData,   setShotMapData]  = useState(null);
  const [predictedHome, setPredictedHome] = useState(null);
  const [predictedAway, setPredictedAway] = useState(null);
  const [injuries,      setInjuries]     = useState([]);
  // teamStats for prematch form/matchup — shape: { home: {form, scored_home,...}, away:{...} }
  const [teamStats,     setTeamStats]    = useState(null);
  const [loading,       setLoading]      = useState(true);
  const [error,         setError]        = useState(null);
  const pollRef = useRef(null);

  // ── Commentary state ──────────────────────────────────────────────────────
  const [matchIntelRaw,  setMatchIntelRaw]  = useState(null);
  const [commentaryFeed, setCommentaryFeed] = useState([]);
  const [commLoading,    setCommLoading]    = useState(false);
  const [commCooldown,   setCommCooldown]   = useState(0);
  const commCoolRef   = useRef(null);
  const commAutoFired = useRef(false);

  const mode = deriveMode(fixture?.fixture?.status?.short);

  const applyLineup = useCallback((lu) => {
    if(!lu) return;
    const isPredicted=lu.mode==="predicted";
    const normP=(p)=>{
      const pl=p?.player||p||{};
      return{id:pl.id,name:pl.name||"",number:pl.number,pos:pl.pos||pl.position||"",
        photo:pl.photo||(pl.id?`https://media.api-sports.io/football/players/${pl.id}.png`:null),
        confidence:p?.confidence??pl.confidence};
    };
    ["home","away"].forEach(side=>{
      const raw=lu[side]; if(!raw) return;
      const norm={formation:raw.formation||"4-3-3",predicted:isPredicted,
        confidence:raw.confidence??lu.confidence,coach:raw.coach||null,
        injuries:raw.injuries||[],doubts:raw.doubts||[],
        startXI:(raw.starting_xi||raw.start_xi||raw.startXI||[]).map(normP),
        substitutes:(raw.bench||raw.subs||raw.substitutes||[]).map(normP)};
      if(isPredicted){if(side==="home")setPredictedHome(norm);else setPredictedAway(norm);}
      else{setLineups(prev=>{const without=prev.filter(l=>l.team?.name!==raw.team_name);
        return[...without,{team:{id:raw.team_id,name:raw.team_name,logo:raw.logo||""},...norm}];});}
    });
  },[]);

  // ── Core data fetch — uses /api/match-intelligence/{id} ─────────────────
  const loadCore = useCallback(async () => {
    if (!fixtureId) return;
    try {
      const resp = await fetch(`${BACKEND}/api/match-intelligence/${fixtureId}`);
      let d = resp.ok ? await resp.json() : null;

      // On 404 — fixture not in API cache yet (prematch). Try to build minimal
      // fixture from the upcoming matches list so the page still renders.
      if (!d || d.error) {
        try {
          const upcoming = await fetch(`${BACKEND}/api/matches/upcoming`)
            .then(r => r.ok ? r.json() : null).catch(() => null);
          const match = (upcoming?.matches || []).find(m => String(m.fixture_id) === String(fixtureId));
          if (match) {
            setFixture({
              fixture: { id: match.fixture_id, status: { short: match.status || "NS", elapsed: match.minute }, date: match.kickoff },
              league: { name: match.league_name },
              teams: {
                home: { id: match.home_id, name: match.home_team, logo: match.home_logo },
                away: { id: match.away_id, name: match.away_team, logo: match.away_logo },
              },
              score: { fulltime: { home: match.home_score, away: match.away_score }, halftime: { home: null, away: null } },
            });
          }
        } catch(e) {}
        try{const r=await fetch(`${BACKEND}/api/match-lineup/${fixtureId}`);if(r.ok)applyLineup(await r.json());}catch(e){}
        fetch(`${BACKEND}/api/win-probability/${fixtureId}`).then(r=>r.ok?r.json():null).then(d=>d&&setWinProb(d)).catch(()=>{});
        setLoading(false);
        return;
      }

      const h = d.header || {};
      // Rebuild fixture shape expected by deriveMode / ScoreHero / PreMatchHero
      const fx = {
        fixture: {
          id: h.fixture_id,
          status: { short: h.status || "NS", elapsed: h.minute },
          date: h.kickoff,
          venue: { name: h.venue_name || h.venue },
          referee: h.referee,
        },
        league: { name: h.league_name, logo: h.league_logo, round: h.round },
        teams: {
          home: { id: h.home_id, name: h.home_team, logo: h.home_logo },
          away: { id: h.away_id, name: h.away_team, logo: h.away_logo },
        },
        score: {
          fulltime: { home: h.home_score,              away: h.away_score },
          halftime: { home: h.score?.ht_home ?? null,  away: h.score?.ht_away ?? null },
        },
      };
      setFixture(fx);

      // Events
      const ev = (d.events || []).map(e => ({
        time: { elapsed: e.minute, extra: e.extra_minute },
        team: { id: e.team_id, name: e.team },
        player: { name: e.player },
        assist: e.assist ? { name: e.assist } : null,
        type: e.type,
        detail: e.detail,
      }));
      setEvents(ev);

      // Statistics
      const st = [];
      if (d.statistics?.home?.length) {
        st.push({ team: { id: h.home_id, name: h.home_team }, statistics: d.statistics.home });
        st.push({ team: { id: h.away_id, name: h.away_team }, statistics: d.statistics.away || [] });
      }
      setStats(st);
      setMatchIntelRaw(d);

      // Lineups from match-intelligence
      // d.lineups is an array [{team_id, team_name, start_xi, subs, formation, ...}]
      if (d.lineups?.length) {
        const hId = h.home_id;
        const aId = h.away_id;
        const isPred = d._meta?.has_official_lineups === false;
        const normLu = (lu) => lu ? {
          ...lu,
          team_id:    lu.team_id   ?? lu.team?.id,
          team_name:  lu.team_name ?? lu.team?.name,
          logo:       lu.team_logo ?? lu.team?.logo ?? "",
          starting_xi: lu.start_xi || lu.startXI || lu.starting_xi || [],
          bench:       lu.subs     || lu.substitutes || lu.bench    || [],
        } : null;
        const homeLu = d.lineups.find(l=>(l.team_id??l.team?.id)===hId);
        const awayLu = d.lineups.find(l=>(l.team_id??l.team?.id)===aId)
                    || d.lineups.find(l=>(l.team_id??l.team?.id)!==hId);
        applyLineup({ mode:isPred?"predicted":"official", home:normLu(homeLu), away:normLu(awayLu) });
      }

      // Win probability from prediction block
      if (d.prediction && !winProb) {
        const p = d.prediction;
        setWinProb({
          pre_match: {
            p_home_win: Math.round((p.p_home_win||0)*100),
            p_draw:     Math.round((p.p_draw||0)*100),
            p_away_win: Math.round((p.p_away_win||0)*100),
            xg_home: p.xg_home, xg_away: p.xg_away,
            top_scorelines: p.top_scorelines || [],
          },
          markets: p.markets || {},
        });
      }

      setError(null);
    } catch (e) {
      console.error("loadCore error:", e);
      setError("Could not load match data.");
    } finally {
      setLoading(false);
    }
  }, [fixtureId]);

  // ── Enrichment fetches (non-blocking) ────────────────────────────────────
  const loadEnrichment = useCallback(async (currentMode) => {
    if (!fixtureId) return;

    // Win probability — useful for all modes
    fetch(`${BACKEND}/api/win-probability/${fixtureId}`)
      .then(r => r.ok ? r.json() : null).then(d => d && setWinProb(d)).catch(() => {});

    if (currentMode === "live" || currentMode === "fulltime") {
      // Momentum + shot map for live/FT
      fetch(`${BACKEND}/api/match-momentum/${fixtureId}`)
        .then(r => r.ok ? r.json() : null).then(d => d && setMomentumData(d)).catch(() => {});
      fetch(`${BACKEND}/api/shot-map/${fixtureId}`)
        .then(r => r.ok ? r.json() : null).then(d => d && setShotMapData(d)).catch(() => {});
    }

    fetch(`${BACKEND}/api/match-lineup/${fixtureId}`).then(r=>r.ok?r.json():null).then(d=>d&&applyLineup(d)).catch(()=>{});
  },[fixtureId,applyLineup]);

  useEffect(() => {
    loadCore();
    pollRef.current = setInterval(loadCore, 30_000);
    return () => clearInterval(pollRef.current);
  }, [loadCore]);

  // Load enrichment once fixture mode is known
  useEffect(() => {
    if (fixture) loadEnrichment(mode);
  }, [fixture, mode, loadEnrichment]);

  // Set default tab when mode is resolved
  useEffect(() => {
    if (mode && !tab) {
      setTab(TABS_BY_MODE[mode][0]);
    }
  }, [mode]);

  // Reset tab if mode changes (shouldn't happen often, but safety net)
  const prevMode = useRef(null);
  useEffect(() => {
    if (prevMode.current && prevMode.current !== mode) {
      setTab(TABS_BY_MODE[mode][0]);
    }
    prevMode.current = mode;
  }, [mode]);

  const homeTeam = fixture?.teams?.home || stats?.[0]?.team;
  const awayTeam = fixture?.teams?.away || stats?.[1]?.team;
  const score    = fixture?.score;
  const status   = fixture?.fixture?.status;
  const fixtureInfo = fixture?.fixture;

  const tabs = TABS_BY_MODE[mode] || TABS_BY_MODE.prematch;

  return (
    <div style={{ background:"#000", minHeight:"100vh", color:"#f0f6ff" }}>
      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.25;transform:scale(0.55)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lmScanX { 0%{left:-40%} 100%{left:140%} }
        @keyframes lmBorderFlow { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes lmBarIn { from{width:0} to{width:var(--w)} }
        @keyframes lmGlow { 0%,100%{box-shadow:0 0 8px var(--c,#60a5fa)} 50%{box-shadow:0 0 22px var(--c,#60a5fa)} }
        .lm-tab { background:none; border:none; cursor:pointer; font-family:'Inter','Sora',sans-serif; transition:all 0.15s; }
        .lm-tab:hover { color:rgba(255,255,255,0.85) !important; }
        .lm-stat-bar { animation: lmBarIn 0.7s cubic-bezier(.22,1,.36,1) both; }
        .lm-card { background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.08); border-radius:12px; transition:border-color .2s, box-shadow .2s; }
        .lm-card:hover { border-color:rgba(255,255,255,.16); box-shadow:0 8px 28px rgba(0,0,0,.5); }
      `}</style>

      {/* Back nav */}
      <div style={{ padding:"14px 20px 0", display:"flex", alignItems:"center", gap:8 }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background:"none", border:"none", color:"rgba(255,255,255,0.28)", cursor:"pointer", fontSize:11, fontWeight:700, letterSpacing:"0.04em", padding:0, display:"flex", alignItems:"center", gap:5 }}
        >
          ← Live Centre
        </button>
      </div>

      {loading && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:280, color:"rgba(255,255,255,0.25)", fontSize:13 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ width:28, height:28, borderRadius:"50%", border:"2px solid rgba(96,165,250,0.15)", borderTopColor:"#60a5fa", margin:"0 auto 14px", animation:"livePulse 0.8s linear infinite" }} />
            Loading match…
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding:24, color:"#f87171", textAlign:"center", fontSize:13 }}>{error}</div>
      )}

      {!loading && !error && (
        <div style={{ animation:"fadeUp 0.35s ease both" }}>

          {/* ── HERO — conditional by mode ── */}
          {mode === "prematch" ? (
            <PreMatchHero fixture={fixtureInfo} homeTeam={homeTeam} awayTeam={awayTeam} status={status} />
          ) : (
            <ScoreHero fixture={fixtureInfo} homeTeam={homeTeam} awayTeam={awayTeam} score={score} status={status} mode={mode} stats={stats} />
          )}

          {/* Momentum strip (live only, outside tabs for quick scan) */}
          {mode === "live" && (events.length > 0 || momentumData) && (
            <MomentumGraph momentumData={momentumData} events={events} />
          )}

          {/* ── Sticky tabs ── */}
          <div style={{
            position:"sticky", top:0, zIndex:100,
            background:"rgba(0,0,0,0.97)", backdropFilter:"blur(16px)",
            borderBottom:"1px solid rgba(255,255,255,0.08)",
            display:"flex", padding:"0 20px", overflowX:"auto",
          }}>
            {tabs.map(t => (
              <button key={t} className="lm-tab" onClick={() => setTab(t)} style={{
                padding:"12px 14px", fontSize:11, fontWeight:800,
                letterSpacing:"0.04em", textTransform:"uppercase",
                color: tab === t ? "#60a5fa" : "rgba(255,255,255,0.35)",
                borderBottom: tab === t ? "2px solid #60a5fa" : "2px solid transparent",
                marginBottom:-1, whiteSpace:"nowrap",
              }}>{t}</button>
            ))}
          </div>

          {/* ── Tab content ── */}
          <div style={{ margin:"0 auto", padding:"0 0 60px" }}>

            {/* ═══ PREMATCH TABS ═══ */}
            {mode === "prematch" && tab === "Preview" && (
              <>
                <PredictionStrip winProb={winProb} homeTeam={homeTeam} awayTeam={awayTeam} />
                <MatchupPanel homeStats={teamStats?.home} awayStats={teamStats?.away} homeTeam={homeTeam} awayTeam={awayTeam} />
                <InjuryPanel injuries={injuries} homeTeam={homeTeam} awayTeam={awayTeam} />
              </>
            )}
            {mode === "prematch" && tab === "Lineups" && (
              <>
                {lineups.length > 0
                  ? <LineupsPanel lineups={lineups} homeTeam={homeTeam} awayTeam={awayTeam} venueName={fixtureInfo?.venue?.name} />
                  : <PitchLineup homeLineup={predictedHome} awayLineup={predictedAway} homeTeam={homeTeam} awayTeam={awayTeam} venueName={fixtureInfo?.venue?.name} />
                }
                <InjuryPanel injuries={injuries} homeTeam={homeTeam} awayTeam={awayTeam} />
              </>
            )}
            {mode === "prematch" && tab === "Odds" && (
              <PredictionStrip winProb={winProb} homeTeam={homeTeam} awayTeam={awayTeam} />
            )}
            {mode === "prematch" && tab === "Commentary" && (
              <CommentaryPanel
                fixtureId={fixtureId} mode={mode} fixture={fixture}
                events={events} stats={stats} momentumData={momentumData}
                lineups={lineups} predictedHome={predictedHome} predictedAway={predictedAway}
                winProb={winProb} matchIntelRaw={matchIntelRaw}
                commentaryFeed={commentaryFeed} setCommentaryFeed={setCommentaryFeed}
                commLoading={commLoading} setCommLoading={setCommLoading}
                commCooldown={commCooldown} setCommCooldown={setCommCooldown}
                commCoolRef={commCoolRef} commAutoFired={commAutoFired}
                homeTeam={homeTeam} awayTeam={awayTeam}
              />
            )}

            {/* ═══ LIVE TABS ═══ */}
            {mode === "live" && tab === "Overview" && (
              <LiveOverview
                stats={stats} homeTeam={homeTeam} awayTeam={awayTeam}
                events={events} momentumData={momentumData} winProb={winProb}
                score={score} status={status}
              />
            )}
            {mode === "live" && tab === "Events"   && <Timeline events={events} homeTeam={homeTeam} awayTeam={awayTeam} />}
            {mode === "live" && tab === "Stats"    && <StatsPanel stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} shotMapData={shotMapData} />}
            {mode === "live" && tab === "Lineups"  && <LineupsPanel lineups={lineups} homeTeam={homeTeam} awayTeam={awayTeam} venueName={fixtureInfo?.venue?.name} />}
            {mode === "live" && tab === "Players"  && <PlayerTable players={players} homeTeam={homeTeam} awayTeam={awayTeam} />}
            {mode === "live" && tab === "Commentary" && (
              <CommentaryPanel
                fixtureId={fixtureId} mode={mode} fixture={fixture}
                events={events} stats={stats} momentumData={momentumData}
                lineups={lineups} predictedHome={predictedHome} predictedAway={predictedAway}
                winProb={winProb} matchIntelRaw={matchIntelRaw}
                commentaryFeed={commentaryFeed} setCommentaryFeed={setCommentaryFeed}
                commLoading={commLoading} setCommLoading={setCommLoading}
                commCooldown={commCooldown} setCommCooldown={setCommCooldown}
                commCoolRef={commCoolRef} commAutoFired={commAutoFired}
                homeTeam={homeTeam} awayTeam={awayTeam}
              />
            )}

            {/* ═══ FULLTIME TABS ═══ */}
            {mode === "fulltime" && tab === "Overview" && (
              <>
                <LiveOverview
                  stats={stats} homeTeam={homeTeam} awayTeam={awayTeam}
                  events={events} momentumData={momentumData} winProb={winProb}
                  score={score} status={status}
                />
                <ShotMapPanel shotMapData={shotMapData} events={events} homeTeam={homeTeam} awayTeam={awayTeam} />
              </>
            )}
            {mode === "fulltime" && tab === "Events"  && <Timeline events={events} homeTeam={homeTeam} awayTeam={awayTeam} />}
            {mode === "fulltime" && tab === "Stats"   && <StatsPanel stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} shotMapData={shotMapData} />}
            {mode === "fulltime" && tab === "Lineups" && <LineupsPanel lineups={lineups} homeTeam={homeTeam} awayTeam={awayTeam} venueName={fixtureInfo?.venue?.name} />}
            {mode === "fulltime" && tab === "Commentary" && (
              <CommentaryPanel
                fixtureId={fixtureId} mode={mode} fixture={fixture}
                events={events} stats={stats} momentumData={momentumData}
                lineups={lineups} predictedHome={predictedHome} predictedAway={predictedAway}
                winProb={winProb} matchIntelRaw={matchIntelRaw}
                commentaryFeed={commentaryFeed} setCommentaryFeed={setCommentaryFeed}
                commLoading={commLoading} setCommLoading={setCommLoading}
                commCooldown={commCooldown} setCommCooldown={setCommCooldown}
                commCoolRef={commCoolRef} commAutoFired={commAutoFired}
                homeTeam={homeTeam} awayTeam={awayTeam}
              />
            )}

            {/* Empty state */}
            {!stats.length && !events.length && !lineups.length && !winProb && (
              <div style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,0.18)", fontSize:13 }}>
                No detailed match data available for this fixture.
                <br /><br />
                <button onClick={() => navigate(-1)} style={{ color:"#60a5fa", fontWeight:700, background:"none", border:"none", cursor:"pointer", fontSize:13 }}>
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