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

function StatBar({ label, home, away, homeColor = "#3b82f6", awayColor = "#ef4444" }) {
  const hNum  = parseFloat(String(home ?? "0").replace("%","")) || 0;
  const aNum  = parseFloat(String(away ?? "0").replace("%","")) || 0;
  const total = hNum + aNum || 1;
  const hPct  = (hNum / total) * 100;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:13, fontWeight:800, color:"#e2e8f0", fontFamily:"'JetBrains Mono',monospace", minWidth:40 }}>{home ?? "–"}</span>
        <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.28)", letterSpacing:"0.06em", textTransform:"uppercase", textAlign:"center", flex:1 }}>{label}</span>
        <span style={{ fontSize:13, fontWeight:800, color:"#e2e8f0", fontFamily:"'JetBrains Mono',monospace", minWidth:40, textAlign:"right" }}>{away ?? "–"}</span>
      </div>
      <div style={{ display:"flex", height:4, borderRadius:3, overflow:"hidden", background:"rgba(255,255,255,0.06)" }}>
        <div className="lm-stat-bar" style={{ width:`${hPct}%`, "--w":`${hPct}%`, background:homeColor }} />
        <div style={{ width:`${100-hPct}%`, background:awayColor, transition:"width 0.6s ease" }} />
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
// Coordinate system (0-100 normalised):
//   x = pitch length (0=left goal, 100=right goal)
//   y = pitch width  (0=top touchline, 100=bottom touchline)
// LEFT TEAM  — GK near x≈10, attack near x≈45
// RIGHT TEAM — GK near x≈90, attack near x≈55
// Slot order: [GK, DEF left→right, MID left→right, FWD left→right]
const HF = {
  "4-3-3_left":   [[10,50],[23,82],[23,61],[23,39],[23,18],[34,66],[32,50],[34,34],[43,82],[45,50],[43,18]],
  "4-3-3_right":  [[90,50],[77,18],[77,39],[77,61],[77,82],[66,34],[68,50],[66,66],[57,18],[55,50],[57,82]],
  "4-2-3-1_left": [[10,50],[23,82],[23,61],[23,39],[23,18],[31,61],[31,39],[39,82],[39,50],[39,18],[46,50]],
  "4-2-3-1_right":[[90,50],[77,18],[77,39],[77,61],[77,82],[69,39],[69,61],[61,18],[61,50],[61,82],[54,50]],
  "4-4-2_left":   [[10,50],[23,82],[23,61],[23,39],[23,18],[34,82],[34,61],[34,39],[34,18],[43,61],[43,39]],
  "4-4-2_right":  [[90,50],[77,18],[77,39],[77,61],[77,82],[66,18],[66,39],[66,61],[66,82],[57,39],[57,61]],
  "4-5-1_left":   [[10,50],[23,82],[23,61],[23,39],[23,18],[34,82],[34,65],[33,50],[34,35],[34,18],[45,50]],
  "4-5-1_right":  [[90,50],[77,18],[77,39],[77,61],[77,82],[66,18],[66,35],[67,50],[66,65],[66,82],[55,50]],
  "4-1-4-1_left": [[10,50],[23,82],[23,61],[23,39],[23,18],[30,50],[38,82],[38,61],[38,39],[38,18],[46,50]],
  "4-1-4-1_right":[[90,50],[77,18],[77,39],[77,61],[77,82],[70,50],[62,18],[62,39],[62,61],[62,82],[54,50]],
  "3-5-2_left":   [[10,50],[22,68],[21,50],[22,32],[31,82],[33,65],[32,50],[33,35],[31,18],[44,62],[44,38]],
  "3-5-2_right":  [[90,50],[78,32],[79,50],[78,68],[69,18],[67,35],[68,50],[67,65],[69,82],[56,38],[56,62]],
  "3-4-3_left":   [[10,50],[22,68],[21,50],[22,32],[31,82],[31,61],[31,39],[31,18],[43,82],[45,50],[43,18]],
  "3-4-3_right":  [[90,50],[78,32],[79,50],[78,68],[69,18],[69,39],[69,61],[69,82],[57,18],[55,50],[57,82]],
  "5-3-2_left":   [[10,50],[22,82],[22,66],[21,50],[22,34],[22,18],[33,66],[32,50],[33,34],[44,62],[44,38]],
  "5-3-2_right":  [[90,50],[78,18],[78,34],[79,50],[78,66],[78,82],[67,34],[68,50],[67,66],[56,38],[56,62]],
  "5-4-1_left":   [[10,50],[22,82],[22,66],[21,50],[22,34],[22,18],[33,82],[33,61],[33,39],[33,18],[45,50]],
  "5-4-1_right":  [[90,50],[78,18],[78,34],[79,50],[78,66],[78,82],[67,18],[67,39],[67,61],[67,82],[55,50]],
  "4-3-2-1_left": [[10,50],[23,82],[23,61],[23,39],[23,18],[31,66],[31,50],[31,34],[39,62],[39,38],[46,50]],
  "4-3-2-1_right":[[90,50],[77,18],[77,39],[77,61],[77,82],[69,34],[69,50],[69,66],[61,38],[61,62],[54,50]],
  "4-2-2-2_left": [[10,50],[23,82],[23,61],[23,39],[23,18],[30,62],[30,38],[38,62],[38,38],[45,62],[45,38]],
  "4-2-2-2_right":[[90,50],[77,18],[77,39],[77,61],[77,82],[70,38],[70,62],[62,38],[62,62],[55,38],[55,62]],
  "3-4-2-1_left": [[10,50],[22,68],[21,50],[22,32],[31,82],[31,61],[31,39],[31,18],[39,62],[39,38],[46,50]],
  "3-4-2-1_right":[[90,50],[78,32],[79,50],[78,68],[69,18],[69,39],[69,61],[69,82],[61,38],[61,62],[54,50]],
};
function getHSlots(formation,side){
  return HF[`${formation}_${side}`]||HF[`4-3-3_${side}`];
}

// ─── HORIZONTAL PITCH LINEUP ─────────────────────────────────────────────────
function PitchLineup({homeLineup,awayLineup,homeTeam,awayTeam}){
  if(!homeLineup&&!awayLineup) return null;
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
        return{id:pl.id,name:pl.name||"",
          photo:pl.photo||(pl.id?`https://media.api-sports.io/football/players/${pl.id}.png`:null)};
      }),
    };
  }

  const home=norm(homeLineup);
  const away=norm(awayLineup);
  const isPredicted=home?.predicted||away?.predicted;

  // Player token rendered as absolute-positioned div over the pitch
  function Tokens({lineup,side,colour}){
    if(!lineup?.xi?.length) return null;
    const slots=getHSlots(lineup.formation,side);
    return lineup.xi.slice(0,11).map((p,i)=>{
      const [x,y]=slots[i]||[50,50];
      const isGK=i===0;
      const short=(p.name||"").split(" ").pop().slice(0,11);
      return(
        <div key={i} style={{
          position:"absolute",left:`${x}%`,top:`${y}%`,
          transform:"translate(-50%,-50%)",
          display:"flex",flexDirection:"column",alignItems:"center",gap:1.5,
          zIndex:3,pointerEvents:"none",
        }}>
          <div style={{
            width:isGK?26:22,height:isGK?26:22,borderRadius:"50%",
            border:`${isGK?2.5:2}px solid ${colour}`,
            boxShadow:isGK?`0 0 0 2px #0c2410,0 0 0 4px ${colour}66,0 2px 8px rgba(0,0,0,.7)`:`0 1px 6px rgba(0,0,0,.6)`,
            background:"#0a1c0b",overflow:"hidden",flexShrink:0,
          }}>
            {p.photo&&<img src={p.photo} alt="" width={isGK?26:22} height={isGK?26:22}
              style={{objectFit:"cover",objectPosition:"top center",display:"block"}}
              onError={e=>{e.currentTarget.style.display="none";}}/>}
          </div>
          <div style={{
            fontSize:"6.5px",fontWeight:700,color:"rgba(255,255,255,.93)",
            textShadow:"0 1px 5px #000",background:"rgba(0,0,0,.72)",
            padding:"1px 3.5px",borderRadius:3,whiteSpace:"nowrap",
            maxWidth:54,overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.35,
            letterSpacing:"0.02em",fontFamily:"'Inter','Sora',sans-serif",
          }}>{short}</div>
          {p.confidence!==undefined&&(
            <div style={{width:22,height:1.5,borderRadius:999,background:"rgba(255,255,255,.08)",overflow:"hidden"}}>
              <div style={{width:`${p.confidence}%`,height:"100%",background:colour,opacity:.6}}/>
            </div>
          )}
        </div>
      );
    });
  }

  function BenchStrip({lineup,colour,align}){
    if(!lineup?.bench?.length) return null;
    const isRight=align==="right";
    return(
      <div style={{flex:1,overflow:"hidden",minWidth:0}}>
        <div style={{fontSize:"6.5px",fontWeight:900,color:`${colour}80`,letterSpacing:".12em",
          textTransform:"uppercase",marginBottom:4,display:"flex",alignItems:"center",
          justifyContent:isRight?"flex-end":"flex-start",gap:4}}>
          {isRight&&<span style={{width:5,height:5,borderRadius:"50%",background:colour,display:"inline-block"}}/>}
          Bench
          {!isRight&&<span style={{width:5,height:5,borderRadius:"50%",background:colour,display:"inline-block"}}/>}
        </div>
        <div style={{display:"flex",gap:3,flexWrap:"nowrap",overflow:"hidden",
          justifyContent:isRight?"flex-end":"flex-start"}}>
          {lineup.bench.slice(0,7).map((p,i)=>(
            <div key={i} style={{flexShrink:0,display:"flex",alignItems:"center",gap:3,
              padding:isRight?"2px 3px 2px 5px":"2px 5px 2px 3px",borderRadius:5,
              background:"rgba(255,255,255,.025)",
              border:"1px solid rgba(255,255,255,.06)",
              borderLeft:isRight?"1px solid rgba(255,255,255,.06)":`2px solid ${colour}`,
              borderRight:isRight?`2px solid ${colour}`:"1px solid rgba(255,255,255,.06)"}}>
              {isRight&&<span style={{fontSize:"7px",fontWeight:700,color:"rgba(255,255,255,.42)",
                whiteSpace:"nowrap",fontFamily:"'Inter',sans-serif"}}>
                {(p.name||"").split(" ").pop().slice(0,10)}
              </span>}
              <div style={{width:17,height:17,borderRadius:"50%",overflow:"hidden",
                background:"#111",border:`1px solid ${colour}33`,flexShrink:0}}>
                {p.photo&&<img src={p.photo} alt="" width="17" height="17"
                  style={{objectFit:"cover",objectPosition:"top"}}
                  onError={e=>e.currentTarget.style.display="none"}/>}
              </div>
              {!isRight&&<span style={{fontSize:"7px",fontWeight:700,color:"rgba(255,255,255,.42)",
                whiteSpace:"nowrap",fontFamily:"'Inter',sans-serif"}}>
                {(p.name||"").split(" ").pop().slice(0,10)}
              </span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const allUnavail=[
    ...(home?.injuries||[]).map(p=>({...p,tm:"home"})),
    ...(home?.doubts||[]).map(p=>({...p,tm:"home",doubt:true})),
    ...(away?.injuries||[]).map(p=>({...p,tm:"away"})),
    ...(away?.doubts||[]).map(p=>({...p,tm:"away",doubt:true})),
  ];

  return(
    <div style={{background:"#060f07",borderRadius:14,border:"1px solid rgba(255,255,255,.07)",
      overflow:"hidden",margin:"14px 18px",fontFamily:"'Inter','Sora',sans-serif"}}>

      {/* ── Header bar ── */}
      <div style={{display:"flex",alignItems:"center",padding:"10px 16px 8px",
        borderBottom:"1px solid rgba(255,255,255,.05)",gap:12}}>

        {/* Home */}
        <div style={{flex:1,display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:30,height:30,borderRadius:"50%",border:`2px solid ${hc}`,
            overflow:"hidden",background:"#111",display:"flex",alignItems:"center",
            justifyContent:"center",flexShrink:0}}>
            {homeTeam?.logo&&<img src={homeTeam.logo} alt="" width="22" height="22"
              style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:900,color:"#fff",letterSpacing:"-0.01em",lineHeight:1.1}}>
              {homeTeam?.name}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2}}>
              {home?.formation&&<span style={{fontSize:8,fontWeight:800,color:hc,
                background:`${hc}14`,border:`1px solid ${hc}30`,borderRadius:4,padding:"1px 5px",
                letterSpacing:".04em"}}>{home.formation}</span>}
              {home?.confidence!==undefined&&<span style={{fontSize:7.5,fontWeight:700,
                color:"rgba(52,211,153,.8)",fontFamily:"'JetBrains Mono',monospace"}}>
                {home.confidence}% conf</span>}
            </div>
          </div>
        </div>

        {/* Centre badge */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flexShrink:0}}>
          {isPredicted&&<span style={{fontSize:7,fontWeight:900,color:"#f59e0b",
            background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.22)",
            borderRadius:4,padding:"2px 7px",letterSpacing:".08em"}}>PREDICTED</span>}
          <span style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.2)",letterSpacing:".06em"}}>LINEUP</span>
        </div>

        {/* Away */}
        <div style={{flex:1,display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end"}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:13,fontWeight:900,color:"#fff",letterSpacing:"-0.01em",lineHeight:1.1}}>
              {awayTeam?.name}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2,justifyContent:"flex-end"}}>
              {away?.confidence!==undefined&&<span style={{fontSize:7.5,fontWeight:700,
                color:"rgba(52,211,153,.8)",fontFamily:"'JetBrains Mono',monospace"}}>
                {away.confidence}% conf</span>}
              {away?.formation&&<span style={{fontSize:8,fontWeight:800,color:ac,
                background:`${ac}14`,border:`1px solid ${ac}30`,borderRadius:4,padding:"1px 5px",
                letterSpacing:".04em"}}>{away.formation}</span>}
            </div>
          </div>
          <div style={{width:30,height:30,borderRadius:"50%",border:`2px solid ${ac}`,
            overflow:"hidden",background:"#111",display:"flex",alignItems:"center",
            justifyContent:"center",flexShrink:0}}>
            {awayTeam?.logo&&<img src={awayTeam.logo} alt="" width="22" height="22"
              style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
          </div>
        </div>
      </div>

      {/* ── Landscape pitch — 2:1 aspect ratio ── */}
      <div style={{position:"relative",width:"100%",paddingBottom:"50%",overflow:"hidden"}}>

        {/* SVG pitch markings */}
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}}
          viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="hplTurf" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0c2410"/>
              <stop offset="50%" stopColor="#0f2d14"/>
              <stop offset="100%" stopColor="#0c2410"/>
            </linearGradient>
            <pattern id="hplStripes" x="0" y="0" width="20" height="100" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="10" height="100" fill="rgba(255,255,255,0.02)"/>
            </pattern>
          </defs>
          <rect width="200" height="100" fill="url(#hplTurf)"/>
          <rect width="200" height="100" fill="url(#hplStripes)"/>
          {/* Pitch outline */}
          <rect x="4" y="4" width="192" height="92" rx="1" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth=".5"/>
          {/* Halfway */}
          <line x1="100" y1="4" x2="100" y2="96" stroke="rgba(255,255,255,.5)" strokeWidth=".5"/>
          {/* Centre circle */}
          <circle cx="100" cy="50" r="15" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth=".45"/>
          <circle cx="100" cy="50" r=".9" fill="rgba(255,255,255,.9)"/>
          {/* Left penalty box */}
          <rect x="4" y="26" width="24" height="48" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth=".45"/>
          <rect x="4" y="37" width="9" height="26" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth=".35"/>
          <circle cx="19" cy="50" r=".75" fill="rgba(255,255,255,.8)"/>
          <path d="M28,38 A14,14 0 0,1 28,62" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth=".35"/>
          <rect x="0" y="41" width="4" height="18" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.55)" strokeWidth=".4"/>
          {/* Right penalty box */}
          <rect x="172" y="26" width="24" height="48" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth=".45"/>
          <rect x="187" y="37" width="9" height="26" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth=".35"/>
          <circle cx="181" cy="50" r=".75" fill="rgba(255,255,255,.8)"/>
          <path d="M172,38 A14,14 0 0,0 172,62" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth=".35"/>
          <rect x="196" y="41" width="4" height="18" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.55)" strokeWidth=".4"/>
          {/* Corner arcs */}
          <path d="M4,4 Q6,4 6,6"       fill="none" stroke="rgba(255,255,255,.45)" strokeWidth=".4"/>
          <path d="M196,4 Q194,4 194,6"  fill="none" stroke="rgba(255,255,255,.45)" strokeWidth=".4"/>
          <path d="M4,96 Q6,96 6,94"     fill="none" stroke="rgba(255,255,255,.45)" strokeWidth=".4"/>
          <path d="M196,96 Q194,96 194,94" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth=".4"/>
          {/* Attack direction labels */}
          <text x="27" y="8.5" textAnchor="middle" fontSize="3.2" fontFamily="Inter,sans-serif"
            fontWeight="700" fill={`${hc}55`} letterSpacing=".5">
            {(homeTeam?.name||"").split(" ").pop().slice(0,6)} →
          </text>
          <text x="173" y="8.5" textAnchor="middle" fontSize="3.2" fontFamily="Inter,sans-serif"
            fontWeight="700" fill={`${ac}55`} letterSpacing=".5">
            ← {(awayTeam?.name||"").split(" ").pop().slice(0,6)}
          </text>
        </svg>

        {/* Player tokens */}
        <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
          <Tokens lineup={home} side="left"  colour={hc}/>
          <Tokens lineup={away} side="right" colour={ac}/>
        </div>
      </div>

      {/* ── Coach row ── */}
      {(home?.coach||away?.coach)&&(
        <div style={{display:"flex",justifyContent:"space-between",
          padding:"6px 16px",borderTop:"1px solid rgba(255,255,255,.04)",
          background:"rgba(0,0,0,.12)"}}>
          {home?.coach&&(
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              {home.coach.photo&&<img src={home.coach.photo} alt="" width="20" height="20"
                style={{borderRadius:"50%",objectFit:"cover",objectPosition:"top",border:`1px solid ${hc}44`}}
                onError={e=>e.currentTarget.style.display="none"}/>}
              <div>
                <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.6)"}}>{home.coach.name}</div>
                <div style={{fontSize:8,color:"rgba(255,255,255,.22)"}}>Manager</div>
              </div>
            </div>
          )}
          {away?.coach&&(
            <div style={{display:"flex",alignItems:"center",gap:6,flexDirection:"row-reverse"}}>
              {away.coach.photo&&<img src={away.coach.photo} alt="" width="20" height="20"
                style={{borderRadius:"50%",objectFit:"cover",objectPosition:"top",border:`1px solid ${ac}44`}}
                onError={e=>e.currentTarget.style.display="none"}/>}
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.6)"}}>{away.coach.name}</div>
                <div style={{fontSize:8,color:"rgba(255,255,255,.22)"}}>Manager</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Bench strip ── */}
      {(home?.bench?.length>0||away?.bench?.length>0)&&(
        <div style={{display:"flex",gap:8,padding:"7px 12px 8px",
          borderTop:"1px solid rgba(255,255,255,.04)",background:"rgba(0,0,0,.18)",alignItems:"flex-start"}}>
          <BenchStrip lineup={home} colour={hc} align="left"/>
          <div style={{width:1,alignSelf:"stretch",background:"rgba(255,255,255,.06)",flexShrink:0}}/>
          <BenchStrip lineup={away} colour={ac} align="right"/>
        </div>
      )}

      {/* ── Unavailable ── */}
      {allUnavail.length>0&&(
        <div style={{margin:"0 12px 10px",padding:"7px 10px",
          background:"rgba(248,113,113,.025)",border:"1px solid rgba(248,113,113,.08)",borderRadius:8}}>
          <div style={{fontSize:8,fontWeight:900,letterSpacing:".1em",textTransform:"uppercase",
            color:"rgba(248,113,113,.3)",marginBottom:5}}>Unavailable</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {allUnavail.slice(0,14).map((p,i)=>(
              <span key={i} style={{display:"inline-flex",alignItems:"center",gap:3,
                padding:"2px 7px",borderRadius:4,
                background:"rgba(248,113,113,.05)",border:"1px solid rgba(248,113,113,.12)"}}>
                <span style={{fontSize:8.5,fontWeight:700,color:"rgba(248,113,113,.7)"}}>{p.name}</span>
                <span style={{fontSize:7.5,color:"rgba(248,113,113,.35)",fontFamily:"'JetBrains Mono',monospace"}}>
                  {p.doubt?"Doubt":(p.type||p.reason||"Inj")}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
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
  // Use backend momentum data if available, fall back to event-based
  const useBackend = !!momentumData?.home_momentum;

  const bins = useBackend ? null : (() => {
    const b = Array(18).fill(null).map(() => ({ home:0, away:0 }));
    (events || []).forEach(ev => {
      const min = ev?.time?.elapsed || 0;
      const bin = Math.min(Math.floor(min / 5), 17);
      if (ev?.team?.id === ev?.homeTeamId) b[bin].home++;
      else b[bin].away++;
    });
    return b;
  })();

  const home90 = useBackend ? momentumData.home_momentum : null;
  const away90 = useBackend ? momentumData.away_momentum : null;

  return (
    <div style={{ padding:"16px 24px", background:"rgba(255,255,255,0.012)", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <SectionLabel>Match Momentum</SectionLabel>
        {momentumData?.overall && (
          <div style={{ display:"flex", gap:12, fontSize:10, fontWeight:700 }}>
            <span style={{ color:"#60a5fa" }}>
              {momentumData.home_team?.split(" ").pop()} {momentumData.overall.home_pct}%
            </span>
            <span style={{ color:"#f87171" }}>
              {momentumData.away_team?.split(" ").pop()} {momentumData.overall.away_pct}%
            </span>
          </div>
        )}
      </div>

      {useBackend ? (
        <div style={{ display:"flex", height:48, gap:1, alignItems:"flex-end" }}>
          {home90.map((h, i) => {
            const a     = away90[i] || 0;
            const total = Math.max(h + a, 0.1);
            const hPct  = (h / total) * 100;
            const barH  = Math.min(100, (total / 2) * 100);
            return (
              <div key={i} style={{ flex:1, height:"100%", display:"flex", flexDirection:"column", justifyContent:"center", gap:1 }}>
                <div style={{ height:`${Math.max(hPct * barH / 100, 4)}%`, background:"rgba(59,130,246,0.55)", borderRadius:"2px 2px 0 0", transition:"height 0.4s" }} />
                <div style={{ height:`${Math.max((100-hPct) * barH / 100, 4)}%`, background:"rgba(239,68,68,0.55)", borderRadius:"0 0 2px 2px" }} />
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display:"flex", height:36, gap:1, alignItems:"center" }}>
          {(bins || []).map((b, i) => {
            const total = b.home + b.away || 1;
            const hPct  = (b.home / total) * 100;
            return (
              <div key={i} style={{ flex:1, height:"100%", display:"flex", flexDirection:"column", justifyContent:"center", gap:1 }}>
                <div style={{ height:`${Math.max(hPct, 8)}%`, background:"rgba(59,130,246,0.55)", borderRadius:"2px 2px 0 0" }} />
                <div style={{ height:`${Math.max(100-hPct, 8)}%`, background:"rgba(239,68,68,0.55)", borderRadius:"0 0 2px 2px" }} />
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
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

function StatsPanel({ stats, homeTeam, awayTeam }) {
  if (!stats?.length) return null;
  const hStats = stats.find(s => s.team?.id === homeTeam?.id)?.statistics || [];
  const aStats = stats.find(s => s.team?.id === awayTeam?.id)?.statistics || [];

  const KEY_STATS = [
    "Ball Possession","Total Shots","Shots on Goal","Shots insidebox",
    "Corner Kicks","Fouls","Offsides","Yellow Cards","Red Cards",
    "Passes %","Blocked Shots","expected_goals",
  ];

  const rows = KEY_STATS.map(key => {
    const hVal = hStats.find(s => s.type === key)?.value ?? null;
    const aVal = aStats.find(s => s.type === key)?.value ?? null;
    if (hVal === null && aVal === null) return null;
    return {
      label: key === "expected_goals" ? "xG" : key.replace("insidebox","inside box"),
      home: hVal ?? 0, away: aVal ?? 0,
    };
  }).filter(Boolean);

  if (!rows.length) return null;
  return (
    <div style={{ padding:"20px 24px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        {homeTeam?.logo && <img src={homeTeam.logo} alt="" width={14} height={14} style={{ objectFit:"contain" }} />}
        <SectionLabel>Match Statistics</SectionLabel>
        {awayTeam?.logo && <img src={awayTeam.logo} alt="" width={14} height={14} style={{ objectFit:"contain" }} />}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {rows.map(r => <StatBar key={r.label} label={r.label} home={r.home} away={r.away} />)}
      </div>
    </div>
  );
}

function LineupsPanel({lineups,homeTeam,awayTeam}){
  if(!lineups?.length) return null;
  const home=lineups.find(l=>l.team?.id===homeTeam?.id)||lineups[0];
  const away=lineups.find(l=>l.team?.id===awayTeam?.id)||lineups[1];
  if(!home&&!away) return null;
  return <PitchLineup homeLineup={home} awayLineup={away} homeTeam={homeTeam} awayTeam={awayTeam}/>;
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
              return (
                <tr key={i} style={{ borderBottom:"1px solid rgba(255,255,255,0.025)", transition:"background 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,0.025)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}
                >
                  <td style={{ padding:"7px 8px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      {p.teamLogo && <img src={p.teamLogo} alt="" width={13} height={13} style={{ objectFit:"contain" }} />}
                      <span style={{ fontSize:12, fontWeight:700, color: p.isHome ? "#93c5fd" : "#fca5a5" }}>{p.player?.name}</span>
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
    </div>
  );
}

// ─── Tab configs by mode ──────────────────────────────────────────────────────

const TABS_BY_MODE = {
  prematch: ["Preview","Lineups","Odds"],
  live:     ["Overview","Events","Stats","Lineups","Players"],
  fulltime: ["Overview","Events","Stats","Players"],
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

      // Lineups from match-intelligence
      if(d.lineups){const hp=d._meta?.has_official_lineups===false||d.lineups?.home?.predicted||d.lineups?.away?.predicted;applyLineup({mode:hp?"predicted":"official",home:d.lineups?.home||null,away:d.lineups?.away||null});}

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
          <div style={{ maxWidth:900, margin:"0 auto", padding:"0 0 60px" }}>

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
                  ? <LineupsPanel lineups={lineups} homeTeam={homeTeam} awayTeam={awayTeam} />
                  : <PitchLineup homeLineup={predictedHome} awayLineup={predictedAway} homeTeam={homeTeam} awayTeam={awayTeam} />
                }
                <InjuryPanel injuries={injuries} homeTeam={homeTeam} awayTeam={awayTeam} />
              </>
            )}
            {mode === "prematch" && tab === "Odds" && (
              <PredictionStrip winProb={winProb} homeTeam={homeTeam} awayTeam={awayTeam} />
            )}

            {/* ═══ LIVE TABS ═══ */}
            {mode === "live" && tab === "Overview" && (
              <>
                {stats.length > 0 && <StatsPanel stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} />}
                {events.length > 0 && <Timeline events={events} homeTeam={homeTeam} awayTeam={awayTeam} />}
              </>
            )}
            {mode === "live" && tab === "Events"   && <Timeline events={events} homeTeam={homeTeam} awayTeam={awayTeam} />}
            {mode === "live" && tab === "Stats"    && <StatsPanel stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} />}
            {mode === "live" && tab === "Lineups"  && <LineupsPanel lineups={lineups} homeTeam={homeTeam} awayTeam={awayTeam} />}
            {mode === "live" && tab === "Players"  && <PlayerTable players={players} homeTeam={homeTeam} awayTeam={awayTeam} />}

            {/* ═══ FULLTIME TABS ═══ */}
            {mode === "fulltime" && tab === "Overview" && (
              <>
                {stats.length > 0 && <StatsPanel stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} />}
                <ShotMapPanel shotMapData={shotMapData} events={events} homeTeam={homeTeam} awayTeam={awayTeam} />
                {events.length > 0 && <Timeline events={events} homeTeam={homeTeam} awayTeam={awayTeam} />}
              </>
            )}
            {mode === "fulltime" && tab === "Events"  && <Timeline events={events} homeTeam={homeTeam} awayTeam={awayTeam} />}
            {mode === "fulltime" && tab === "Stats"   && <StatsPanel stats={stats} homeTeam={homeTeam} awayTeam={awayTeam} />}
            {mode === "fulltime" && tab === "Players" && <PlayerTable players={players} homeTeam={homeTeam} awayTeam={awayTeam} />}

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