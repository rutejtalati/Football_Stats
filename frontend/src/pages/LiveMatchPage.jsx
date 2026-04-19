// ═══════════════════════════════════════════════════════════════════
// StatinSite — LiveMatchPage  ·  Part 2 refactor
// ═══════════════════════════════════════════════════════════════════
// Changes from v9:
//   • useIsMobile         → imported from @/hooks
//   • COMP_NAV_GROUPS     → imported from @/constants
//   • COMP_NAV_TABS       → imported from @/constants
//   • CompetitionNav      → imported from @/components/CompetitionNav
//   • LIVE_STATUSES/FT_STATUSES → imported from @/constants (LIVE_SET/FINISHED_SET)
//   • BACKEND             → API_BASE from @/api/api
//   • All components, tabs, logic — 100% preserved
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useIsMobile } from "@/hooks";
import { API_BASE as BACKEND } from "@/api/api";
import CompetitionNav from "@/components/CompetitionNav";
import {
  COMP_NAV_TABS,
  SLUG_BY_CODE,
  COMP_BY_CODE,
  LIVE_SET  as LIVE_STATUSES,
  FINISHED_SET as FT_STATUSES,
} from "@/constants";

/* ── Neobrutalist theme constants ── */
const NB = { y:"#ffffff", k:"#000", r:"rgba(255,255,255,0.7)" };
const NB_CSS = `
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap");
  @keyframes nbPulse  { 0%,100%{opacity:1} 50%{opacity:0.35} }
  @keyframes nbBlink  { 50%{opacity:0} }
  @keyframes nbStripes{ to{background-position:90px 0} }
  @keyframes nbFadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes nbShimmer{ 0%{background-position:-800px 0} 100%{background-position:800px 0} }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:#0d0d0d; }
  ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.3); }
  ::selection { background:#ffffff; color:#0d0d0d; }
  input[type=range] { accent-color:#ffffff; }
`;

// ── Mode derivation ─────────────────────────────────────────────────────────

function deriveMode(statusShort) {
  if (!statusShort || statusShort === "NS" || statusShort === "TBD") return "prematch";
  if (LIVE_STATUSES.has(statusShort)) return "live";
  if (FT_STATUSES.has(statusShort))   return "fulltime";
  return "prematch";
}


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

// ─── Background decorator ─────────────────────────────────────────────────────

function MatchBg() {
  return (
    <div aria-hidden="true" className="sn-fixed-bg" style={{
      position:"fixed", top:0, right:0, bottom:0,
      pointerEvents:"none", zIndex:0, overflow:"hidden",
    }}>
      <div style={{position:"absolute",inset:0,background:"#080808"}}/>
      <div style={{position:"absolute",top:"-15%",left:"20%",width:"65vw",height:"65vw",
        background:"radial-gradient(ellipse,rgba(255,255,255,.014) 0%,transparent 62%)"}}/>
      <div style={{position:"absolute",bottom:"-8%",right:"5%",width:"50vw",height:"50vw",
        background:"radial-gradient(ellipse,rgba(255,255,255,.009) 0%,transparent 55%)"}}/>
      <div style={{position:"absolute",inset:0,
        backgroundImage:"linear-gradient(rgba(255,255,255,.026) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.026) 1px,transparent 1px)",
        backgroundSize:"44px 44px"}}/>
      <div style={{position:"absolute",inset:0,
        backgroundImage:"linear-gradient(rgba(255,255,255,.052) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.052) 1px,transparent 1px)",
        backgroundSize:"176px 176px"}}/>
    </div>
  );
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function SectionLabel({ children, accent }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      marginBottom: 14,
    }}>
      <span style={{ fontSize:10, fontWeight:500, letterSpacing:"0.16em", color:accent||"#ffffff", textTransform:"uppercase", fontFamily:"'Inter',sans-serif", paddingBottom:4, borderBottom:`1px solid ${accent||"rgba(255,255,255,.12)"}` }}>
        {children}
      </span>
    </div>
  );
}

function Pill({ children, color = "rgba(255,255,255,0.07)", textColor = "rgba(255,255,255,0.5)" }) {
  return (
    <span style={{
      fontSize: 8, fontWeight: 900, letterSpacing: "0.1em",
      background: color, color: textColor,
      padding: "2px 8px",
      display: "inline-flex", alignItems: "center", gap: 4,
      fontFamily: "'DM Mono', monospace",
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

function StatBar({ label, home, away, homeColor = "#ffffff", awayColor = "#ef4444", highlight = false }) {
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
          fontSize:13, fontWeight:800, fontFamily:"'Inter',sans-serif", minWidth:40,
          color: homeLeads ? "#fff" : "rgba(255,255,255,.6)",
        }}>{home ?? "–"}</span>
        <span style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,.25)", letterSpacing:"0.08em", textTransform:"uppercase", textAlign:"center", flex:1 }}>{label}</span>
        <span style={{
          fontSize:13, fontWeight:800, fontFamily:"'Inter',sans-serif", minWidth:40, textAlign:"right",
          color: awayLeads ? "#fff" : "rgba(255,255,255,.6)",
        }}>{away ?? "–"}</span>
      </div>
      <div style={{ display:"flex", height:4, borderRadius:3, overflow:"hidden", background:"rgba(255,255,255,.06)" }}>
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
      background:"#080808",
      borderBottom:"2px solid rgba(255,255,255,.12)",
      overflow:"hidden",
      padding:"28px 24px 24px",
    }}>
      <div style={{ position:"absolute", top:-80, left:"10%",  width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,255,255,0.06),transparent 70%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", top:-80, right:"10%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(239,68,68,0.06),transparent 70%)",  pointerEvents:"none" }} />

      {/* Competition */}
      <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:8, marginBottom:22 }}>
        {fixture?.league?.logo && (
          <img src={fixture.league.logo} alt="" width={16} height={16} style={{ objectFit:"contain" }} />
        )}
        <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.25)", letterSpacing:"0.1em", textTransform:"uppercase" }}>
          {fixture?.league?.name}{fixture?.league?.round ? ` · ${fixture.league.round}` : ""}
        </span>
      </div>

      {/* Teams */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, maxWidth:600, margin:"0 auto" }}>
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
          <img src={homeTeam?.logo} alt={homeTeam?.name} width={52} height={52}
            style={{ objectFit:"contain" }} onError={e => e.currentTarget.style.opacity="0"} />
          <span style={{ fontSize:13, fontWeight:900, color:"#ffffff", textAlign:"center" }}>{homeTeam?.name}</span>
          <Pill textColor="#94a3b8">Home</Pill>
        </div>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, flexShrink:0 }}>
          {kickoff ? (
            <>
              <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.25)", letterSpacing:"0.06em" }}>KICK OFF</span>
              <span style={{ fontSize:16, fontWeight:900, color:"#ffffff", letterSpacing:"-0.01em", textAlign:"center" }}>{kickoff}</span>
            </>
          ) : (
            <span style={{ fontSize:16, fontWeight:700, color:"rgba(255,255,255,.2)" }}>VS</span>
          )}
          {fixture?.venue?.name && (
            <span style={{ fontSize:10, color:"rgba(255,255,255,.2)", textAlign:"center", maxWidth:140 }}>
              {fixture.venue.name}{fixture?.venue?.city ? `, ${fixture.venue.city}` : ""}
            </span>
          )}
        </div>

        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
          <img src={awayTeam?.logo} alt={awayTeam?.name} width={52} height={52}
            style={{ objectFit:"contain" }} onError={e => e.currentTarget.style.opacity="0"} />
          <span style={{ fontSize:13, fontWeight:900, color:"#ffffff", textAlign:"center" }}>{awayTeam?.name}</span>
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
      background: highlight ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.025)",
      border: `1px solid ${highlight ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)"}`,
      borderRadius:0, flex:1, minWidth:80,
    }}>
      <span style={{ fontSize:18, fontWeight:900, color: highlight ? "#ffffff" : "#f0f6ff", fontFamily:"'Inter',sans-serif" }}>{value}</span>
      <span style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,.25)", letterSpacing:"0.08em", textTransform:"uppercase", textAlign:"center" }}>{label}</span>
    </div>
  );

  return (
    <div style={{ padding:"20px 24px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
      <SectionLabel>Model Prediction</SectionLabel>

      {/* Win prob bar */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:11, fontWeight:800 }}>
          <span style={{ color:"#ffffff" }}>{homeTeam?.name?.split(" ").pop()} {p_home_win}%</span>
          <span style={{ color:"rgba(255,255,255,.3)" }}>Draw {p_draw}%</span>
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
          <div style={{ fontSize:9, fontWeight:800, color:"rgba(255,255,255,.2)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>
            Likely Scorelines
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {top_scorelines.slice(0,5).map(s => (
              <div key={s.score} style={{
                padding:"4px 10px", borderRadius:0,
                background:"rgba(255,255,255,.05)",
                border:"2px solid rgba(255,255,255,.15)",
                fontSize:11, fontWeight:800, color:"#e2e8f0",
                fontFamily:"'Inter',sans-serif",
              }}>
                {s.score} <span style={{ color:"rgba(255,255,255,.25)", fontSize:9 }}>{s.probability}%</span>
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
      <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.25)", width:80 }}>{label}</span>
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
        <span style={{ fontSize:10, color:"rgba(255,255,255,.25)", fontWeight:600 }}>{type}</span>
      </div>
    );
  };

  return (
    <div style={{ padding:"20px 24px", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
      <SectionLabel>Availability</SectionLabel>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:20 }}>
        {[{ team:homeTeam, list:homeInj },{ team:awayTeam, list:awayInj }].map(({ team, list }) => (
          <div key={team?.id}>
            <div style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,.25)", marginBottom:8 }}>
              {team?.name}
              <span style={{ marginLeft:6, fontSize:9, color:"#f87171", fontWeight:700 }}>
                {list.length > 0 ? `${list.length} doubt${list.length > 1 ? "s" : ""}` : ""}
              </span>
            </div>
            {list.length === 0
              ? <span style={{ fontSize:11, color:"rgba(255,255,255,.2)" }}>No known issues</span>
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
  "4-3-3_left":    [[12,50],[20,88],[20,63],[20,37],[20,12],[34,69],[33,50],[34,31],[46,85],[47,50],[46,15]],
  "4-3-3_right":   [[88,50],[80,12],[80,37],[80,63],[80,88],[66,31],[67,50],[66,69],[54,15],[53,50],[54,85]],
  "4-2-3-1_left":  [[12,50],[20,85],[20,62],[20,38],[20,15],[31,63],[31,37],[40,85],[40,50],[40,15],[47,50]],
  "4-2-3-1_right": [[88,50],[80,15],[80,38],[80,62],[80,85],[69,37],[69,63],[60,15],[60,50],[60,85],[53,50]],
  "4-4-2_left":    [[12,50],[20,85],[20,62],[20,38],[20,15],[34,85],[34,62],[34,38],[34,15],[45,65],[45,35]],
  "4-4-2_right":   [[88,50],[80,15],[80,38],[80,62],[80,85],[66,15],[66,38],[66,62],[66,85],[55,35],[55,65]],
  "4-5-1_left":    [[12,50],[20,85],[20,62],[20,38],[20,15],[34,88],[34,66],[33,50],[34,34],[34,12],[46,50]],
  "4-5-1_right":   [[88,50],[80,15],[80,38],[80,62],[80,85],[66,12],[66,34],[67,50],[66,66],[66,88],[54,50]],
  "4-1-4-1_left":  [[12,50],[20,85],[20,62],[20,38],[20,15],[30,50],[39,85],[39,62],[39,38],[39,15],[47,50]],
  "4-1-4-1_right": [[88,50],[80,15],[80,38],[80,62],[80,85],[70,50],[61,15],[61,38],[61,62],[61,85],[53,50]],
  "3-5-2_left":    [[12,50],[21,72],[20,50],[21,28],[32,85],[33,66],[32,50],[33,34],[32,15],[45,65],[45,35]],
  "3-5-2_right":   [[88,50],[79,28],[80,50],[79,72],[68,15],[67,34],[68,50],[67,66],[68,85],[55,35],[55,65]],
  "3-4-3_left":    [[12,50],[21,72],[20,50],[21,28],[32,85],[32,62],[32,38],[32,15],[45,85],[46,50],[45,15]],
  "3-4-3_right":   [[88,50],[79,28],[80,50],[79,72],[68,15],[68,38],[68,62],[68,85],[55,15],[54,50],[55,85]],
  "5-3-2_left":    [[12,50],[21,88],[21,66],[20,50],[21,34],[21,12],[33,68],[32,50],[33,32],[45,65],[45,35]],
  "5-3-2_right":   [[88,50],[79,12],[79,34],[80,50],[79,66],[79,88],[67,32],[68,50],[67,68],[55,35],[55,65]],
  "5-4-1_left":    [[12,50],[21,88],[21,66],[20,50],[21,34],[21,12],[33,85],[33,62],[33,38],[33,15],[46,50]],
  "5-4-1_right":   [[88,50],[79,12],[79,34],[80,50],[79,66],[79,88],[67,15],[67,38],[67,62],[67,85],[54,50]],
  "4-3-2-1_left":  [[12,50],[20,85],[20,62],[20,38],[20,15],[31,68],[31,50],[31,32],[40,65],[40,35],[47,50]],
  "4-3-2-1_right": [[88,50],[80,15],[80,38],[80,62],[80,85],[69,32],[69,50],[69,68],[60,35],[60,65],[53,50]],
  "4-2-2-2_left":  [[12,50],[20,85],[20,62],[20,38],[20,15],[30,65],[30,35],[39,65],[39,35],[46,65],[46,35]],
  "4-2-2-2_right": [[88,50],[80,15],[80,38],[80,62],[80,85],[70,35],[70,65],[61,35],[61,65],[54,35],[54,65]],
  "3-4-2-1_left":  [[12,50],[21,72],[20,50],[21,28],[32,85],[32,62],[32,38],[32,15],[40,65],[40,35],[47,50]],
  "3-4-2-1_right": [[88,50],[79,28],[80,50],[79,72],[68,15],[68,38],[68,62],[68,85],[60,35],[60,65],[53,50]],
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
    const sz=40;
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
            background:"#080808",overflow:"hidden",flexShrink:0,
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
            fontSize:"9.5px",fontWeight:800,color:"#ffffff",
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
                  fontFamily:"'Inter',sans-serif"}}>{reason}</span>
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
    if(p==="D") return "#ffffff";
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
              background:"#080808",
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
                boxShadow:"3px 3px 0 rgba(255,255,255,.15)",
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
              fontSize:10,fontWeight:900,color:"#ffffff",
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
      background:"#080808",borderRadius:0,border:"1px solid rgba(255,255,255,.08)",
      overflow:"hidden",margin:"0 auto",maxWidth:760,
      fontFamily:"'Inter','Inter',sans-serif",
    }}>

      {/* ── Full-width bezel-less pitch ── */}
      <div style={{position:"relative",width:"100%",paddingBottom:"44%",overflow:"hidden",background:"#080808"}}>
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}}
          viewBox="0 0 200 112" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="pitchClip">
              <rect x="3" y="5" width="194" height="102" rx="1"/>
            </clipPath>
          </defs>
          <rect width="200" height="112" fill="#000"/>
          {/* Half tints clipped exactly to pitch outline — no bleed */}
          <rect x="3" y="5" width="97" height="102" fill={hc} opacity="0.22" clipPath="url(#pitchClip)"/>
          <rect x="100" y="5" width="97" height="102" fill={ac} opacity="0.22" clipPath="url(#pitchClip)"/>
          {/* Pitch outline — inset so players never clip border */}
          <rect x="3" y="5" width="194" height="102" rx="1" fill="none" stroke="rgba(255,255,255,.82)" strokeWidth=".65"/>
          {/* Halfway */}
          <line x1="100" y1="5" x2="100" y2="107" stroke="rgba(255,255,255,.82)" strokeWidth=".65"/>
          {/* Centre circle */}
          <circle cx="100" cy="56" r="17" fill="none" stroke="rgba(255,255,255,.72)" strokeWidth=".6"/>
          <circle cx="100" cy="56" r="1.3" fill="rgba(255,255,255,.96)"/>
          {/* Left penalty box */}
          <rect x="3" y="30" width="26" height="52" fill="none" stroke="rgba(255,255,255,.72)" strokeWidth=".55"/>
          <rect x="3" y="41" width="10" height="30" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth=".44"/>
          <circle cx="19" cy="56" r="1" fill="rgba(255,255,255,.88)"/>
          <path d="M29,42 A16,16 0 0,1 29,70" fill="none" stroke="rgba(255,255,255,.38)" strokeWidth=".4"/>
          <rect x="0" y="47" width="3" height="18" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.74)" strokeWidth=".48"/>
          {/* Right penalty box */}
          <rect x="171" y="30" width="26" height="52" fill="none" stroke="rgba(255,255,255,.72)" strokeWidth=".55"/>
          <rect x="187" y="41" width="10" height="30" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth=".44"/>
          <circle cx="181" cy="56" r="1" fill="rgba(255,255,255,.88)"/>
          <path d="M171,42 A16,16 0 0,0 171,70" fill="none" stroke="rgba(255,255,255,.38)" strokeWidth=".4"/>
          <rect x="197" y="47" width="3" height="18" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.74)" strokeWidth=".48"/>
          {/* Corners */}
          <path d="M3,5 Q5,5 5,7"       fill="none" stroke="rgba(255,255,255,.64)" strokeWidth=".44"/>
          <path d="M197,5 Q195,5 195,7" fill="none" stroke="rgba(255,255,255,.64)" strokeWidth=".44"/>
          <path d="M3,107 Q5,107 5,105" fill="none" stroke="rgba(255,255,255,.64)" strokeWidth=".44"/>
          <path d="M197,107 Q195,107 195,105" fill="none" stroke="rgba(255,255,255,.64)" strokeWidth=".44"/>

        </svg>
        {/* Tokens layer — pointer events on */}
        <div style={{position:"absolute",inset:0,zIndex:2}}>
          <Tokens lineup={home} side="left"  colour={hc}/>
          <Tokens lineup={away} side="right" colour={ac}/>
        </div>
      </div>

      {/* ── Two detached squad cards below ── */}
      <div style={{
        display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:8,
        padding:"8px",background:"rgba(0,0,0,.6)",
      }}>
        {/* Home squad card */}
        <SquadCard lineup={home} team={homeTeam} colour={hc} isRight={false}/>
        {/* Away squad card */}
        <SquadCard lineup={away} team={awayTeam} colour={ac} isRight={true}/>
      </div>

    </div>
  );
}


// ─── SQUAD CARD (bench + injuries below pitch) ───────────────────────────────
function SquadCard({lineup,team,colour,isRight}){
  const navigate = useNavigate();
  const bench=(lineup?.bench||[]);
  const injuries=(lineup?.injuries||[]).map(p=>({...p,doubt:false}));
  const doubts=(lineup?.doubts||[]).map(p=>({...p,doubt:true}));
  const unavail=[...injuries,...doubts];

  function posColSC(pos){
    const p=(pos||"").toUpperCase().slice(0,1);
    if(p==="G") return{bg:"#f59e0b",label:"GK"};
    if(p==="D") return{bg:"#ffffff",label:"DEF"};
    if(p==="M") return{bg:"#34d399",label:"MID"};
    return{bg:"#f87171",label:"FWD"};
  }

  function Row({p,isOut,reason,doubt}){
    const name=(p.name||p.player_name||"").split(" ").slice(-1)[0].slice(0,14)||"–";
    const pos=posColSC(p.pos||p.position||"");
    const pid=p.id;
    return(
      <div onClick={pid?()=>navigate(`/player/${pid}`):undefined}
        style={{
          display:"flex",alignItems:"center",gap:6,padding:"4px 10px",
          flexDirection:isRight?"row-reverse":"row",
          cursor:pid?"pointer":"default",opacity:isOut?.5:1,
        }}>
        <div style={{position:"relative",flexShrink:0}}>
          <div style={{width:28,height:28,borderRadius:"50%",overflow:"hidden",
            background:"#080808",
            border:`1.5px solid ${isOut?"rgba(239,68,68,.4)":colour+"55"}`}}>
            {p.photo&&<img src={p.photo} alt="" width="28" height="28"
              style={{objectFit:"cover",objectPosition:"top"}}
              onError={e=>e.currentTarget.style.display="none"}/>}
          </div>
          {!isOut&&(
            <span style={{
              position:"absolute",bottom:-2,
              right:isRight?"auto":-2,left:isRight?-2:"auto",
              fontSize:"6px",fontWeight:900,lineHeight:"11px",
              background:pos.bg,color:"#000",borderRadius:3,
              padding:"0 3px",boxShadow:"3px 3px 0 rgba(255,255,255,.15)",
            }}>{pos.label}</span>
          )}
          {isOut&&<span style={{
            position:"absolute",bottom:-2,
            right:isRight?"auto":-2,left:isRight?-2:"auto",
            width:9,height:9,borderRadius:"50%",
            background:doubt?"#fbbf24":"#ef4444",
            border:"1.5px solid #000",display:"block",
          }}/>}
        </div>
        <div style={{flex:1,minWidth:0,
          display:"flex",flexDirection:"column",
          alignItems:isRight?"flex-end":"flex-start"}}>
          <span style={{fontSize:"9px",fontWeight:700,lineHeight:1.3,
            color:isOut?"rgba(255,255,255,.42)":"rgba(255,255,255,.88)",
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</span>
          {reason&&<span style={{fontSize:"7px",fontWeight:700,lineHeight:1.2,
            color:isOut?(doubt?"rgba(251,191,36,.6)":"rgba(239,68,68,.6)"):colour+"88",
            fontFamily:"monospace"}}>{reason}</span>}
        </div>
      </div>
    );
  }

  return(
    <div style={{
      borderRadius:0,overflow:"hidden",
      border:`1px solid ${colour}28`,
      background:"#07070a",
    }}>
      {/* Card header */}
      <div style={{
        padding:"8px 10px 7px",
        background:`linear-gradient(${isRight?"to left":"to right"},${colour}22,${colour}08)`,
        borderBottom:`1px solid ${colour}22`,
        display:"flex",alignItems:"center",gap:7,
        flexDirection:isRight?"row-reverse":"row",
      }}>
        <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${colour}`,
          overflow:"hidden",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {team?.logo&&<img src={team.logo} alt="" width="18" height="18"
            style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
        </div>
        <div style={{flex:1,minWidth:0,
          display:"flex",flexDirection:"column",
          alignItems:isRight?"flex-end":"flex-start",gap:1}}>
          <span style={{fontSize:10,fontWeight:900,color:"#ffffff",
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {team?.name?.split(" ").slice(-1)[0]||team?.name}
          </span>
          {lineup?.coach&&(
            <span style={{fontSize:7.5,fontWeight:600,color:"rgba(255,255,255,.38)",
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {(lineup.coach.name||"").split(" ").slice(-1)[0]}
            </span>
          )}
        </div>
        <span style={{
          fontSize:7.5,fontWeight:800,color:colour,flexShrink:0,
          background:`${colour}18`,border:`1px solid ${colour}30`,
          borderRadius:3,padding:"1px 5px",letterSpacing:".04em",
        }}>{lineup?.formation||""}</span>
      </div>

      {/* Bench */}
      {bench.length>0&&(
        <>
          <div style={{padding:"5px 10px 2px",display:"flex",alignItems:"center",gap:4,
            flexDirection:isRight?"row-reverse":"row"}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:colour,display:"inline-block",flexShrink:0}}/>
            <span style={{fontSize:"6.5px",fontWeight:900,color:colour,opacity:.8,
              letterSpacing:".12em",textTransform:"uppercase"}}>Bench</span>
          </div>
          {bench.map((p,i)=><Row key={i} p={p} isOut={false} reason={null} doubt={false}/>)}
        </>
      )}

      {/* Unavailable */}
      {unavail.length>0&&(
        <>
          <div style={{padding:"5px 10px 2px",
            marginTop:bench.length?4:0,
            borderTop:bench.length?"1px solid rgba(239,68,68,.1)":"none",
            display:"flex",alignItems:"center",gap:4,
            flexDirection:isRight?"row-reverse":"row"}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:"#ef4444",display:"inline-block",flexShrink:0}}/>
            <span style={{fontSize:"6.5px",fontWeight:900,color:"#ef4444",opacity:.8,
              letterSpacing:".12em",textTransform:"uppercase"}}>Out</span>
          </div>
          {unavail.map((p,i)=>{
            const reason=p.doubt?"Doubt":(p.type||p.reason||"Inj").slice(0,12);
            return <Row key={i} p={p} isOut={true} reason={reason} doubt={p.doubt}/>;
          })}
        </>
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
      background:"#080808",
      borderBottom:"2px solid rgba(255,255,255,.15)",
      overflow:"hidden",
      padding:"28px 24px 22px",
    }}>
      <div style={{ position:"absolute", top:-80, left:"15%",  width:340, height:340, borderRadius:"50%", background:"radial-gradient(circle,rgba(255,255,255,0.08),transparent 70%)",  pointerEvents:"none" }} />
      <div style={{ position:"absolute", top:-80, right:"15%", width:340, height:340, borderRadius:"50%", background:"radial-gradient(circle,rgba(239,68,68,0.08),transparent 70%)", pointerEvents:"none" }} />

      {/* Competition + status */}
      <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:10, marginBottom:20 }}>
        {fixture?.league?.logo && <img src={fixture.league.logo} alt="" width={16} height={16} style={{ objectFit:"contain" }} />}
        <span style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,.25)", letterSpacing:"0.1em", textTransform:"uppercase" }}>
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
          <span style={{ fontSize:9, fontWeight:900, color:"rgba(255,255,255,.25)", background:"rgba(255,255,255,.05)", borderRadius:999, padding:"2px 9px", letterSpacing:"0.1em" }}>
            FULL TIME
          </span>
        )}
        {status?.short === "HT" && (
          <Pill color="rgba(245,158,11,0.12)" textColor="#f59e0b">HALF TIME</Pill>
        )}
      </div>

      {/* Score row */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, maxWidth:680, margin:"0 auto" }}>
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
          <img src={homeTeam?.logo} alt={homeTeam?.name} width={48} height={48}
            style={{ objectFit:"contain", filter: homeWin ? "drop-shadow(0 0 14px rgba(255,255,255,0.5))" : "none" }}
            onError={e => e.currentTarget.style.opacity="0"} />
          <span style={{ fontSize:"clamp(11px,3vw,14px)", fontWeight:900, color:"#ffffff", textAlign:"center" }}>{homeTeam?.name}</span>
        </div>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{
              fontSize:"clamp(36px,10vw,54px)", fontWeight:900, lineHeight:1,
              color: homeWin ? "#ffffff" : awayWin ? "rgba(255,255,255,0.3)" : "#f0f6ff",
              fontFamily:"'Inter',sans-serif",
              textShadow: homeWin ? "0 0 30px rgba(255,255,255,0.4)" : "none",
            }}>{hGoals}</span>
            <span style={{ fontSize:"clamp(18px,5vw,26px)", fontWeight:300, color:"rgba(255,255,255,0.18)", lineHeight:1 }}>–</span>
            <span style={{
              fontSize:"clamp(36px,10vw,54px)", fontWeight:900, lineHeight:1,
              color: awayWin ? "#f87171" : homeWin ? "rgba(255,255,255,0.3)" : "#f0f6ff",
              fontFamily:"'Inter',sans-serif",
              textShadow: awayWin ? "0 0 30px rgba(248,113,113,0.4)" : "none",
            }}>{aGoals}</span>
          </div>
          {score?.halftime && isFT && (
            <span style={{ fontSize:10, color:"rgba(255,255,255,.2)", fontFamily:"'Inter',sans-serif" }}>
              HT {score.halftime.home}–{score.halftime.away}
            </span>
          )}
          {fixture?.venue?.name && (
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.18)", marginTop:2, textAlign:"center", maxWidth:140 }}>
              {fixture.venue.name}
            </span>
          )}
        </div>

        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
          <img src={awayTeam?.logo} alt={awayTeam?.name} width={48} height={48}
            style={{ objectFit:"contain", filter: awayWin ? "drop-shadow(0 0 14px rgba(239,68,68,0.5))" : "none" }}
            onError={e => e.currentTarget.style.opacity="0"} />
          <span style={{ fontSize:"clamp(11px,3vw,14px)", fontWeight:900, color:"#ffffff", textAlign:"center" }}>{awayTeam?.name}</span>
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
              <span style={{ fontSize:12, fontWeight:800, color:"#ffffff", fontFamily:"'Inter',sans-serif" }}>{h ?? "–"}</span>
              <span style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.22)", letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</span>
              <span style={{ fontSize:12, fontWeight:800, color:"#f87171", fontFamily:"'Inter',sans-serif" }}>{a ?? "–"}</span>
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
            <span style={{ color:"#ffffff", display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:"#ffffff", display:"inline-block" }}/>
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
                <div style={{ height:`${hPx}px`, background:`rgba(255,255,255,${isFuture?.15:.58})`, borderRadius:"2px 2px 0 0" }}/>
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
            return <div key={i} style={{ width:`${w}%`, background: ph.team==="home" ? "rgba(255,255,255,.5)" : "rgba(239,68,68,.45)" }}/>;
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
              display:"grid", gridTemplateColumns:"1fr minmax(40px,52px) 1fr",
              gap:8, alignItems:"center",
              padding:"7px 10px",
              borderBottom:"1px solid rgba(255,255,255,0.025)",
              borderLeft: (ev.type||"").toLowerCase()==="goal" ? "3px solid #34d399" : (ev.detail||"").toLowerCase().includes("yellow") ? "3px solid #fbbf24" : (ev.detail||"").toLowerCase().includes("red") ? "3px solid #ef4444" : (ev.type||"").toLowerCase()==="subst" ? "3px solid #60a5fa" : "3px solid transparent",
              background: (ev.type||"").toLowerCase()==="goal" ? "rgba(255,255,255,.009)" : "transparent",
              borderRadius: 4,
            }}>
              {isHome ? (
                <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end" }}>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{ev.player?.name}</div>
                    {ev.assist?.name && <div style={{ fontSize:10, color:"rgba(255,255,255,0.28)" }}>assist: {ev.assist.name}</div>}
                    {ev.detail && <div style={{ fontSize:9, color:"rgba(255,255,255,.2)", fontStyle:"italic" }}>{ev.detail}</div>}
                  </div>
                  <EventIcon type={ev.type} detail={ev.detail} />
                </div>
              ) : <div />}

              <div style={{ textAlign:"center" }}>
                <span style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,.35)", fontFamily:"'Inter',sans-serif", background:"rgba(255,255,255,.06)", borderRadius:4, padding:"2px 6px" }}>
                  {min}
                </span>
              </div>

              {!isHome ? (
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <EventIcon type={ev.type} detail={ev.detail} />
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{ev.player?.name}</div>
                    {ev.assist?.name && <div style={{ fontSize:10, color:"rgba(255,255,255,0.28)" }}>assist: {ev.assist.name}</div>}
                    {ev.detail && <div style={{ fontSize:9, color:"rgba(255,255,255,.2)", fontStyle:"italic" }}>{ev.detail}</div>}
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
  const [view, setView] = useState("bars"); // "bars" | "cards" | "table"
  if (!stats?.length) return null;

  const hStats = stats.find(s => s.team?.id === homeTeam?.id)?.statistics || [];
  const aStats = stats.find(s => s.team?.id === awayTeam?.id)?.statistics || [];
  const hc = "#ffffff";
  const ac = "#ef4444";

  function gs(arr, key) { return arr.find(s => s.type === key)?.value ?? null; }

  const hXG = gs(hStats,"expected_goals");
  const aXG = gs(aStats,"expected_goals");

  // All stat rows
  const ALL = [
    { key:"Ball Possession",   label:"Possession",    group:"attack"  },
    { key:"expected_goals",    label:"xG",            group:"attack"  },
    { key:"Total Shots",       label:"Total Shots",   group:"attack"  },
    { key:"Shots on Goal",     label:"On Target",     group:"attack"  },
    { key:"Shots insidebox",   label:"Inside Box",    group:"attack"  },
    { key:"Corner Kicks",      label:"Corners",       group:"attack"  },
    { key:"Passes %",          label:"Pass Acc",      group:"passing" },
    { key:"Total passes",      label:"Passes",        group:"passing" },
    { key:"Fouls",             label:"Fouls",         group:"defence" },
    { key:"Yellow Cards",      label:"Yellows",       group:"defence" },
    { key:"Red Cards",         label:"Reds",          group:"defence" },
    { key:"Offsides",          label:"Offsides",      group:"defence" },
    { key:"Blocked Shots",     label:"Blocked",       group:"defence" },
    { key:"Goalkeeper Saves",  label:"GK Saves",      group:"defence" },
  ].map(r => ({
    ...r,
    home: gs(hStats, r.key),
    away: gs(aStats, r.key),
  })).filter(r => r.home != null || r.away != null);

  if (!ALL.length) return null;

  const hName = homeTeam?.name?.split(" ").pop() || "Home";
  const aName = awayTeam?.name?.split(" ").pop() || "Away";

  // ── Shared header ──────────────────────────────────────────────────
  const Header = () => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:8 }}>
      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
        {homeTeam?.logo && <img src={homeTeam.logo} alt="" width={16} height={16} style={{ objectFit:"contain" }}/>}
        <span style={{ fontSize:12, fontWeight:800, color:"rgba(255,255,255,.75)" }}>{hName}</span>
      </div>

      {/* View toggle */}
      <div style={{ display:"flex", gap:2, background:"rgba(255,255,255,.05)", borderRadius:7, padding:2 }}>
        {[
          { id:"bars",  icon:"≡",  tip:"Bars"  },
          { id:"cards", icon:"⊞",  tip:"Cards" },
          { id:"table", icon:":::", tip:"Table" },
        ].map(v => (
          <button key={v.id} onClick={() => setView(v.id)} title={v.tip} style={{
            padding:"4px 10px", borderRadius:5, border:"none", cursor:"pointer", fontSize:11,
            fontWeight:900, letterSpacing:".04em",
            background: view===v.id ? "rgba(255,255,255,.12)" : "transparent",
            color: view===v.id ? "#fff" : "rgba(255,255,255,.35)",
            transition:"all .15s",
          }}>{v.icon}</button>
        ))}
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
        <span style={{ fontSize:12, fontWeight:800, color:"rgba(255,255,255,.75)" }}>{aName}</span>
        {awayTeam?.logo && <img src={awayTeam.logo} alt="" width={16} height={16} style={{ objectFit:"contain" }}/>}
      </div>
    </div>
  );

  // ── VIEW 1: Bars (existing, polished) ─────────────────────────────
  if (view === "bars") {
    const xgRow = ALL.find(r => r.key === "expected_goals");
    const singles = ALL.filter(r => ["Ball Possession","Passes %","Total passes"].includes(r.key));
    const pairedKeys = [
      ["Total Shots","Shots on Goal"],["Corner Kicks","Fouls"],
      ["Yellow Cards","Offsides"],["Goalkeeper Saves","Blocked Shots"],
    ];
    const pairs = pairedKeys.map(([k1,k2]) => [
      ALL.find(r=>r.key===k1), ALL.find(r=>r.key===k2),
    ]).filter(([a,b]) => a||b);

    return (
      <div style={{ padding:"18px 20px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
        <Header/>
        {xgRow && <StatBar label="Expected Goals (xG)" home={xgRow.home} away={xgRow.away} homeColor={hc} awayColor={ac} highlight={true}/>}
        <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
          {singles.map(r => r && (
            <div key={r.key} style={{ borderBottom:"1px solid rgba(255,255,255,.04)", paddingBottom:1 }}>
              <StatBar label={r.label} home={r.home} away={r.away} homeColor={hc} awayColor={ac}/>
            </div>
          ))}
        </div>
        {pairs.map(([left,right], i) => (
          <div key={i} style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12, borderBottom:"1px solid rgba(255,255,255,.04)", paddingBottom:1 }}>
            {left  && <StatBar label={left.label}  home={left.home}  away={left.away}  homeColor={hc} awayColor={ac}/>}
            {right && <StatBar label={right.label} home={right.home} away={right.away} homeColor={hc} awayColor={ac}/>}
          </div>
        ))}
      </div>
    );
  }

  // ── VIEW 2: Metric cards grid ──────────────────────────────────────
  if (view === "cards") {
    const groups = [
      { label:"Attack",  keys:["Ball Possession","expected_goals","Total Shots","Shots on Goal","Shots insidebox","Corner Kicks"] },
      { label:"Passing", keys:["Passes %","Total passes"] },
      { label:"Defence", keys:["Fouls","Yellow Cards","Red Cards","Offsides","Blocked Shots","Goalkeeper Saves"] },
    ];

    return (
      <div style={{ padding:"18px 20px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
        <Header/>
        {groups.map(grp => {
          const rows = grp.keys.map(k => ALL.find(r => r.key===k)).filter(Boolean);
          if (!rows.length) return null;
          return (
            <div key={grp.label} style={{ marginBottom:14 }}>
              <div style={{ fontSize:8, fontWeight:900, letterSpacing:".14em", textTransform:"uppercase",
                color:"rgba(255,255,255,.2)", marginBottom:8 }}>{grp.label}</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:6 }}>
                {rows.map(r => {
                  const hN = parseFloat(String(r.home??"0").replace("%","")) || 0;
                  const aN = parseFloat(String(r.away??"0").replace("%","")) || 0;
                  const hLeads = hN > aN;
                  const aLeads = aN > hN;
                  return (
                    <div key={r.key} style={{
                      padding:"10px 10px 8px",
                      borderRadius:0,
                      background:"rgba(255,255,255,.03)",
                      border:`1px solid ${hLeads ? hc+"30" : aLeads ? ac+"30" : "rgba(255,255,255,.07)"}`,
                    }}>
                      <div style={{ fontSize:8, fontWeight:700, color:"rgba(255,255,255,.3)",
                        textTransform:"uppercase", letterSpacing:".06em", marginBottom:6, textAlign:"center" }}>
                        {r.label}
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:4 }}>
                        <span style={{ fontSize:15, fontWeight:900, fontFamily:"'Inter',sans-serif",
                          color: hLeads ? "#fff" : "rgba(255,255,255,.45)" }}>
                          {r.home ?? "–"}
                        </span>
                        <span style={{ fontSize:8, color:"rgba(255,255,255,.18)", fontWeight:700 }}>vs</span>
                        <span style={{ fontSize:15, fontWeight:900, fontFamily:"'Inter',sans-serif",
                          color: aLeads ? "#fff" : "rgba(255,255,255,.45)", textAlign:"right" }}>
                          {r.away ?? "–"}
                        </span>
                      </div>
                      {/* mini bar */}
                      <div style={{ display:"flex", height:3, borderRadius:2, overflow:"hidden", background:"rgba(255,255,255,.06)", marginTop:7 }}>
                        <div style={{ width:`${(hN/(hN+aN||1))*100}%`, background:hc }}/>
                        <div style={{ flex:1, background:ac }}/>
                      </div>
                      {/* winner dot */}
                      {(hLeads||aLeads) && (
                        <div style={{ display:"flex", justifyContent: hLeads ? "flex-start" : "flex-end", marginTop:4 }}>
                          <span style={{ fontSize:7, fontWeight:800,
                            color: hLeads ? hc : ac,
                            background: hLeads ? `${hc}18` : `${ac}18`,
                            borderRadius:3, padding:"1px 5px" }}>
                            {hLeads ? hName : aName} ↑
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── VIEW 3: Compact table ──────────────────────────────────────────
  return (
    <div style={{ padding:"18px 20px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
      <Header/>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr>
              <th style={{ padding:"5px 10px", textAlign:"left", fontSize:10, fontWeight:800,
                color:hc, fontFamily:"'Inter',sans-serif", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
                {hName}
              </th>
              <th style={{ padding:"5px 10px", textAlign:"center", fontSize:8, fontWeight:700,
                color:"rgba(255,255,255,.25)", textTransform:"uppercase", letterSpacing:".08em",
                borderBottom:"1px solid rgba(255,255,255,.06)" }}>
                Stat
              </th>
              <th style={{ padding:"5px 10px", textAlign:"right", fontSize:10, fontWeight:800,
                color:ac, fontFamily:"'Inter',sans-serif", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
                {aName}
              </th>
              <th style={{ width:80, padding:"5px 8px", borderBottom:"1px solid rgba(255,255,255,.06)" }}/>
            </tr>
          </thead>
          <tbody>
            {ALL.map((r, i) => {
              const hN = parseFloat(String(r.home??"0").replace("%","")) || 0;
              const aN = parseFloat(String(r.away??"0").replace("%","")) || 0;
              const hLeads = hN > aN;
              const aLeads = aN > hN;
              const hPct = (hN/(hN+aN||1))*100;
              return (
                <tr key={r.key} style={{ borderBottom:"1px solid rgba(255,255,255,.03)",
                  background: i%2===0 ? "rgba(255,255,255,.01)" : "transparent" }}>
                  <td style={{ padding:"6px 10px", fontSize:12, fontWeight:800,
                    fontFamily:"'Inter',sans-serif",
                    color: hLeads ? "#fff" : "rgba(255,255,255,.45)" }}>
                    {r.home ?? "–"}
                  </td>
                  <td style={{ padding:"6px 10px", textAlign:"center", fontSize:9, fontWeight:700,
                    color:"rgba(255,255,255,.28)", textTransform:"uppercase", letterSpacing:".05em" }}>
                    {r.label}
                  </td>
                  <td style={{ padding:"6px 10px", textAlign:"right", fontSize:12, fontWeight:800,
                    fontFamily:"'Inter',sans-serif",
                    color: aLeads ? "#fff" : "rgba(255,255,255,.45)" }}>
                    {r.away ?? "–"}
                  </td>
                  <td style={{ padding:"6px 8px" }}>
                    <div style={{ display:"flex", height:4, borderRadius:2, overflow:"hidden", background:"rgba(255,255,255,.05)" }}>
                      <div style={{ width:`${hPct}%`, background:hc, borderRadius:"2px 0 0 2px" }}/>
                      <div style={{ flex:1, background:ac, borderRadius:"0 2px 2px 0" }}/>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
            { label: homeTeam?.name, data: home?.summary, color:"#ffffff" },
            { label: awayTeam?.name, data: away?.summary, color:"#f87171" },
          ].map(({ label, data, color }) => data && (
            <div key={label} style={{ display:"flex", gap:12, fontSize:10, color:"rgba(255,255,255,.35)" }}>
              <span style={{ fontWeight:800, color }}>{label?.split(" ").pop()}</span>
              <span>{data.total} shots</span>
              <span style={{ color: "#34d399" }}>xG {data.total_xg}</span>
              <span>{data.on_target} on target</span>
            </div>
          ))}
        </div>
        <div style={{ position:"relative", width:"100%", paddingBottom:"64.7%", borderRadius:0, overflow:"hidden" }}>
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
                  background: isGoal ? (isHome ? "#ffffff" : "#f87171") : "rgba(255,255,255,0.22)",
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
            { color:"#ffffff", label:"Goal (Home)", border:true },
            { color:"#f87171", label:"Goal (Away)", border:true },
            { color:"rgba(255,255,255,0.22)", label:"Shot", border:false },
          ].map(({ color, label, border }) => (
            <span key={label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, color:"rgba(255,255,255,.3)" }}>
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
              <span style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,.3)", width:30, fontFamily:"'Inter',sans-serif" }}>
                {fmtMin(g.time?.elapsed, g.time?.extra)}
              </span>
              <span style={{ width:8, height:8, borderRadius:"50%", background: isHome ? "#ffffff" : "#f87171", flexShrink:0 }} />
              <span style={{ fontSize:12, fontWeight:700, color:"#e2e8f0", flex:1 }}>{g.player?.name}</span>
              <span style={{ fontSize:10, color:"rgba(255,255,255,.25)" }}>{isHome ? homeTeam?.name : awayTeam?.name}</span>
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
            <tr style={{ borderBottom:"2px solid rgba(255,255,255,.12)" }}>
              <th style={{ padding:"6px 8px", textAlign:"left", fontSize:9, fontWeight:800, color:"rgba(255,255,255,0.25)", letterSpacing:"0.08em", textTransform:"uppercase" }}>Player</th>
              {cols.map(c => (
                <th key={c.key} onClick={() => setSort(c.key)} style={{
                  padding:"6px 8px", textAlign:"center", fontSize:9, fontWeight:800,
                  letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer",
                  color: sort === c.key ? "#ffffff" : "rgba(255,255,255,0.25)",
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
                  <td style={{ padding:"7px 8px", textAlign:"center", fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:800, color: parseFloat(rating) >= 8 ? "#34d399" : "#e2e8f0" }}>{rating}</td>
                  <td style={{ padding:"7px 8px", textAlign:"center", fontFamily:"'Inter',sans-serif", fontSize:12, color:"#e2e8f0" }}>{goals}</td>
                  <td style={{ padding:"7px 8px", textAlign:"center", fontFamily:"'Inter',sans-serif", fontSize:12, color:"#e2e8f0" }}>{assists}</td>
                  <td style={{ padding:"7px 8px", textAlign:"center", fontFamily:"'Inter',sans-serif", fontSize:12, color:"#e2e8f0" }}>{passes}</td>
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

function AnalysisPanel({ mode, fixture, events, stats, momentumData, winProb, matchIntelRaw, homeTeam, awayTeam }) {
  const hName = homeTeam?.name || "Home";
  const aName = awayTeam?.name || "Away";
  const isLive = mode === "live";
  const isFT   = mode === "fulltime";

  // ── Data helpers ─────────────────────────────────────────────────────────
  const insights     = (matchIntelRaw?.insights || []);
  const h2h          = matchIntelRaw?.h2h || {};
  const h2hMatches   = h2h.matches || h2h.results || [];
  const homeForm     = matchIntelRaw?.home_recent_form || [];
  const awayForm     = matchIntelRaw?.away_recent_form || [];
  const homeSeasonSt = matchIntelRaw?.home_season_stats || {};
  const awaySeasonSt = matchIntelRaw?.away_season_stats || {};
  const injuries     = matchIntelRaw?.injuries || {};
  const pred         = winProb?.pre_match || matchIntelRaw?.prediction || {};

  const getStat = (tid, key) =>
    stats?.find(s => s.team?.id === tid)?.statistics?.find(s => s.type === key)?.value ?? null;

  // ── Severity colour ───────────────────────────────────────────────────────
  const sevColour = (sev) => {
    if (sev === "positive") return { bg:"rgba(52,211,153,.1)", border:"rgba(52,211,153,.22)", dot:"#34d399" };
    if (sev === "warning")  return { bg:"rgba(251,191,36,.09)", border:"rgba(251,191,36,.22)", dot:"#fbbf24" };
    return                          { bg:"rgba(167,139,250,.08)", border:"rgba(167,139,250,.18)", dot:"#a78bfa" };
  };

  // ── Type label colour ─────────────────────────────────────────────────────
  const typeColour = (t) => {
    const m = { form:"#34d399", h2h:"#fbbf24", injury:"#f87171", model:"#a78bfa",
                market:"#60a5fa", goals:"#34d399", defence:"#94a3b8" };
    return m[(t||"").toLowerCase()] || "#a78bfa";
  };

  // ── Result badge ──────────────────────────────────────────────────────────
  const ResBadge = ({ r }) => {
    const c = r==="W"?"#34d399":r==="L"?"#f87171":"#94a3b8";
    return (
      <span style={{ width:20,height:20,borderRadius:4,background:`${c}18`,border:`1px solid ${c}44`,
        display:"inline-flex",alignItems:"center",justifyContent:"center",
        fontSize:9,fontWeight:900,color:c,flexShrink:0 }}>{r}</span>
    );
  };

  // ── Section header ────────────────────────────────────────────────────────
  const SH = ({ label, accent="#a78bfa" }) => (
    <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:12 }}>
      <span style={{ width:3,height:14,borderRadius:2,background:accent,flexShrink:0,display:"inline-block" }}/>
      <span style={{ fontSize:9,fontWeight:900,letterSpacing:".14em",textTransform:"uppercase",color:"rgba(255,255,255,.35)" }}>{label}</span>
    </div>
  );

  const hasAnything = insights.length || h2hMatches.length || homeForm.length || awayForm.length || pred.p_home_win != null;
  if (!hasAnything) return (
    <div style={{ padding:"48px 24px",textAlign:"center",color:"rgba(255,255,255,.25)",fontSize:13 }}>
      Match data is loading…
    </div>
  );

  return (
    <div style={{ padding:"0 0 60px",display:"flex",flexDirection:"column",gap:0 }}>

      {/* ── LIVE STATS SNAPSHOT (live/FT only) ─────────────────────────────── */}
      {(isLive||isFT) && stats?.length > 0 && (() => {
        const rows = [
          { key:"Ball Possession", label:"Possession" },
          { key:"expected_goals",  label:"xG"         },
          { key:"Total Shots",     label:"Shots"       },
          { key:"Shots on Goal",   label:"On Target"   },
          { key:"Corner Kicks",    label:"Corners"     },
        ].map(r=>({ ...r,
          h: getStat(homeTeam?.id, r.key),
          a: getStat(awayTeam?.id, r.key),
        })).filter(r=>r.h!=null||r.a!=null);
        if(!rows.length) return null;
        return (
          <div style={{ padding:"18px 20px",borderBottom:"1px solid rgba(255,255,255,.05)" }}>
            <SH label="Match Stats Snapshot" accent="#60a5fa"/>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
              {rows.map(r=>{
                const hN = parseFloat(String(r.h??"0").replace("%",""))||0;
                const aN = parseFloat(String(r.a??"0").replace("%",""))||0;
                const tot= hN+aN||1;
                const hW = hN>aN;
                return (
                  <div key={r.key} style={{ padding:"9px 11px",borderRadius:8,
                    background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)" }}>
                    <div style={{ fontSize:8,fontWeight:700,color:"rgba(255,255,255,.3)",
                      textTransform:"uppercase",letterSpacing:".06em",marginBottom:6,textAlign:"center" }}>{r.label}</div>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline" }}>
                      <span style={{ fontSize:15,fontWeight:900,color:hW?"#fff":"rgba(255,255,255,.4)" }}>{r.h??"–"}</span>
                      <span style={{ fontSize:8,color:"rgba(255,255,255,.18)",fontWeight:700 }}>vs</span>
                      <span style={{ fontSize:15,fontWeight:900,color:!hW&&hN!==aN?"#fff":"rgba(255,255,255,.4)" }}>{r.a??"–"}</span>
                    </div>
                    <div style={{ display:"flex",height:3,borderRadius:2,overflow:"hidden",background:"rgba(255,255,255,.06)",marginTop:7 }}>
                      <div style={{ width:`${(hN/tot)*100}%`,background:"#60a5fa",borderRadius:"2px 0 0 2px",transition:"width .6s" }}/>
                      <div style={{ flex:1,background:"#f87171",borderRadius:"0 2px 2px 0" }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── MODEL PREDICTION ────────────────────────────────────────────────── */}
      {pred.p_home_win != null && (
        <div style={{ padding:"18px 20px",borderBottom:"1px solid rgba(255,255,255,.05)" }}>
          <SH label="Model Prediction" accent="#a78bfa"/>
          {/* Probability bar */}
          <div style={{ marginBottom:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:11,fontWeight:800 }}>
              <span style={{ color:"#93c5fd" }}>{hName.split(" ").pop()} {pred.p_home_win}%</span>
              <span style={{ color:"rgba(255,255,255,.3)" }}>Draw {pred.p_draw}%</span>
              <span style={{ color:"#f87171" }}>{aName.split(" ").pop()} {pred.p_away_win}%</span>
            </div>
            <div style={{ display:"flex",height:8,borderRadius:999,overflow:"hidden",gap:2 }}>
              <div style={{ width:`${pred.p_home_win}%`,background:"linear-gradient(90deg,#3b82f688,#3b82f6)",borderRadius:"999px 0 0 999px",transition:"width .8s" }}/>
              <div style={{ width:`${pred.p_draw}%`,background:"rgba(255,255,255,.15)" }}/>
              <div style={{ width:`${pred.p_away_win}%`,background:"linear-gradient(90deg,#ef444488,#ef4444)",borderRadius:"0 999px 999px 0",transition:"width .8s" }}/>
            </div>
          </div>
          {/* xG + markets */}
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            {pred.xg_home!=null&&<div style={{ flex:1,minWidth:80,padding:"9px 12px",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:8,textAlign:"center" }}>
              <div style={{ fontSize:16,fontWeight:900,color:"#fff" }}>{pred.xg_home}</div>
              <div style={{ fontSize:9,color:"rgba(255,255,255,.3)",marginTop:2,textTransform:"uppercase",letterSpacing:".06em" }}>xG {hName.split(" ").pop()}</div>
            </div>}
            {pred.xg_away!=null&&<div style={{ flex:1,minWidth:80,padding:"9px 12px",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:8,textAlign:"center" }}>
              <div style={{ fontSize:16,fontWeight:900,color:"#fff" }}>{pred.xg_away}</div>
              <div style={{ fontSize:9,color:"rgba(255,255,255,.3)",marginTop:2,textTransform:"uppercase",letterSpacing:".06em" }}>xG {aName.split(" ").pop()}</div>
            </div>}
            {(pred.markets?.over_2_5??pred.over_2_5)!=null&&<div style={{ flex:1,minWidth:80,padding:"9px 12px",background:"rgba(52,211,153,.08)",border:"1px solid rgba(52,211,153,.2)",borderRadius:8,textAlign:"center" }}>
              <div style={{ fontSize:16,fontWeight:900,color:"#34d399" }}>{Math.round(pred.markets?.over_2_5??pred.over_2_5)}%</div>
              <div style={{ fontSize:9,color:"rgba(52,211,153,.6)",marginTop:2,textTransform:"uppercase",letterSpacing:".06em" }}>Over 2.5</div>
            </div>}
            {(pred.markets?.btts??pred.btts)!=null&&<div style={{ flex:1,minWidth:80,padding:"9px 12px",background:"rgba(251,191,36,.07)",border:"1px solid rgba(251,191,36,.18)",borderRadius:8,textAlign:"center" }}>
              <div style={{ fontSize:16,fontWeight:900,color:"#fbbf24" }}>{Math.round(pred.markets?.btts??pred.btts)}%</div>
              <div style={{ fontSize:9,color:"rgba(251,191,36,.6)",marginTop:2,textTransform:"uppercase",letterSpacing:".06em" }}>BTTS</div>
            </div>}
          </div>
          {/* Top scorelines */}
          {pred.top_scorelines?.length>0&&(
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:8,fontWeight:800,color:"rgba(255,255,255,.2)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:7 }}>Likely Scorelines</div>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                {pred.top_scorelines.slice(0,5).map(s=>(
                  <div key={s.score} style={{ padding:"5px 11px",borderRadius:6,background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.12)",fontSize:11,fontWeight:800,color:"#e2e8f0" }}>
                    {s.score} <span style={{ color:"rgba(255,255,255,.3)",fontSize:9 }}>{s.probability}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── INSIGHTS ─────────────────────────────────────────────────────────── */}
      {insights.length>0&&(
        <div style={{ padding:"18px 20px",borderBottom:"1px solid rgba(255,255,255,.05)" }}>
          <SH label="Match Intelligence" accent="#34d399"/>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {insights.map((ins,i)=>{
              const sc = sevColour(ins.severity);
              const tc = typeColour(ins.type);
              return(
                <div key={i} style={{ padding:"11px 14px",borderRadius:10,background:sc.bg,border:`1px solid ${sc.border}`,display:"flex",gap:10,alignItems:"flex-start" }}>
                  <span style={{ fontSize:16,flexShrink:0,lineHeight:1.3 }}>{ins.icon||"📊"}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:4 }}>
                      <span style={{ fontSize:9,fontWeight:900,letterSpacing:".08em",textTransform:"uppercase",color:tc }}>{ins.type||"insight"}</span>
                      <span style={{ fontSize:11,fontWeight:800,color:"#fff" }}>{ins.title}</span>
                    </div>
                    <div style={{ fontSize:12,color:"rgba(255,255,255,.65)",lineHeight:1.6 }}>{ins.body}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── H2H ──────────────────────────────────────────────────────────────── */}
      {h2hMatches.length>0&&(
        <div style={{ padding:"18px 20px",borderBottom:"1px solid rgba(255,255,255,.05)" }}>
          <SH label={`Head to Head · Last ${Math.min(h2hMatches.length,5)}`} accent="#fbbf24"/>
          {h2h.home_wins!=null&&(
            <div style={{ display:"flex",gap:8,marginBottom:12 }}>
              {[
                { label:`${hName.split(" ").pop()} wins`, val:h2h.home_wins??0, color:"#93c5fd" },
                { label:"Draws",                          val:h2h.draws??0,      color:"rgba(255,255,255,.4)" },
                { label:`${aName.split(" ").pop()} wins`, val:h2h.away_wins??0,  color:"#f87171" },
              ].map(({label,val,color})=>(
                <div key={label} style={{ flex:1,padding:"9px 8px",background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)",borderRadius:8,textAlign:"center" }}>
                  <div style={{ fontSize:20,fontWeight:900,color }}>{val}</div>
                  <div style={{ fontSize:9,color:"rgba(255,255,255,.3)",marginTop:2,textTransform:"uppercase",letterSpacing:".05em" }}>{label}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
            {h2hMatches.slice(0,5).map((m,i)=>{
              const hw=m.home_goals>m.away_goals, aw=m.away_goals>m.home_goals;
              return(
                <div key={i} style={{ display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",padding:"7px 10px",background:"rgba(255,255,255,.025)",borderRadius:7,border:"1px solid rgba(255,255,255,.05)" }}>
                  <span style={{ fontSize:11,fontWeight:hw?800:500,color:hw?"#fff":"rgba(255,255,255,.5)",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{m.home_team}</span>
                  <span style={{ fontSize:12,fontWeight:900,color:"rgba(255,255,255,.6)",fontFamily:"monospace",whiteSpace:"nowrap",padding:"2px 8px",background:"rgba(255,255,255,.05)",borderRadius:5 }}>{m.home_goals??m.home_score??0}–{m.away_goals??m.away_score??0}</span>
                  <span style={{ fontSize:11,fontWeight:aw?800:500,color:aw?"#fff":"rgba(255,255,255,.5)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{m.away_team}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── FORM ─────────────────────────────────────────────────────────────── */}
      {(homeForm.length>0||awayForm.length>0)&&(
        <div style={{ padding:"18px 20px",borderBottom:"1px solid rgba(255,255,255,.05)" }}>
          <SH label="Recent Form" accent="#34d399"/>
          {[
            { name:hName, form:homeForm,  color:"#93c5fd" },
            { name:aName, form:awayForm,  color:"#f87171" },
          ].map(({name,form,color})=>form.length>0&&(
            <div key={name} style={{ marginBottom:14 }}>
              <div style={{ fontSize:10,fontWeight:800,color:"rgba(255,255,255,.5)",marginBottom:7 }}>{name}</div>
              <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                {form.slice(0,5).map((r,i)=>{
                  const res = typeof r==="string" ? r : r.result;
                  const opp = r.opponent ? (typeof r.opponent==="string"?r.opponent:r.opponent?.name||"") : "";
                  const gf  = r.goals_for??r.goals_scored??null;
                  const ga  = r.goals_against??r.goals_conceded??null;
                  const ha  = r.home_away||"";
                  return(
                    <div key={i} style={{ display:"flex",alignItems:"center",gap:8,padding:"5px 9px",background:"rgba(255,255,255,.025)",borderRadius:6,border:"1px solid rgba(255,255,255,.04)" }}>
                      <ResBadge r={res}/>
                      {opp&&<span style={{ fontSize:11,fontWeight:600,color:"rgba(255,255,255,.55)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{ha==="H"?"vs":"@"} {opp}</span>}
                      {gf!=null&&<span style={{ fontSize:11,fontWeight:800,color:"rgba(255,255,255,.4)",fontFamily:"monospace",flexShrink:0 }}>{gf}–{ga}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SEASON STATS ─────────────────────────────────────────────────────── */}
      {(homeSeasonSt.played||awaySeasonSt.played)&&(
        <div style={{ padding:"18px 20px",borderBottom:"1px solid rgba(255,255,255,.05)" }}>
          <SH label="Season Stats" accent="#60a5fa"/>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            {[
              { team:hName, ss:homeSeasonSt, color:"#93c5fd" },
              { team:aName, ss:awaySeasonSt, color:"#f87171"  },
            ].map(({team,ss,color})=>ss.played&&(
              <div key={team} style={{ padding:"12px 13px",borderRadius:9,background:"rgba(255,255,255,.03)",border:"1px solid rgba(255,255,255,.07)" }}>
                <div style={{ fontSize:10,fontWeight:800,color,marginBottom:9,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{team}</div>
                {[
                  ["Played",   ss.played],
                  ["W/D/L",    `${ss.wins??"-"}/${ss.draws??"-"}/${ss.losses??"-"}`],
                  ["Goals/G",  ss.goals_for_avg],
                  ["Conceded", ss.goals_against_avg],
                  ["Clean Sh",ss.clean_sheets],
                ].filter(([,v])=>v!=null).map(([label,val])=>(
                  <div key={label} style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                    <span style={{ fontSize:10,color:"rgba(255,255,255,.35)",fontWeight:600 }}>{label}</span>
                    <span style={{ fontSize:10,color:"rgba(255,255,255,.8)",fontWeight:800,fontFamily:"monospace" }}>{val}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── INJURIES ─────────────────────────────────────────────────────────── */}
      {((injuries.home?.length||0)+(injuries.away?.length||0))>0&&(
        <div style={{ padding:"18px 20px" }}>
          <SH label="Availability" accent="#f87171"/>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14 }}>
            {[{label:hName,list:injuries.home||[]},{label:aName,list:injuries.away||[]}].map(({label,list})=>(
              <div key={label}>
                <div style={{ fontSize:10,fontWeight:800,color:"rgba(255,255,255,.4)",marginBottom:7 }}>
                  {label}
                  {list.length>0&&<span style={{ marginLeft:6,color:"#f87171",fontSize:9 }}>{list.length} out</span>}
                </div>
                {list.length===0
                  ? <span style={{ fontSize:11,color:"rgba(255,255,255,.2)" }}>No known issues</span>
                  : list.slice(0,6).map((p,i)=>{
                    const name = p.player_name||p.name||"Unknown";
                    const type = p.type||p.reason||"Injury";
                    const isS  = type.toLowerCase().includes("suspend");
                    return(
                      <div key={i} style={{ display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid rgba(255,255,255,.03)" }}>
                        <span style={{ width:6,height:6,borderRadius:"50%",background:isS?"#fbbf24":"#f87171",flexShrink:0 }}/>
                        <span style={{ fontSize:11,fontWeight:600,color:"rgba(255,255,255,.7)",flex:1 }}>{name}</span>
                        <span style={{ fontSize:9,color:"rgba(255,255,255,.3)",fontWeight:700 }}>{type}</span>
                      </div>
                    );
                  })
                }
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Tab configs by mode ──────────────────────────────────────────────────────

const TABS_BY_MODE = {
  prematch: ["Preview","Lineups","Odds","Analysis"],
  live:     ["Overview","Events","Stats","Lineups","Players","Analysis"],
  fulltime: ["Overview","Events","Stats","Lineups","Analysis"],
};

// ─── Main page ────────────────────────────────────────────────────────────────

function PageFooter() {
  return (
    <footer style={{position:"relative",zIndex:2,flexShrink:0,background:"rgba(255,255,255,0.025)",borderTop:"0.5px solid rgba(255,255,255,0.08)",fontFamily:"'Inter',system-ui,sans-serif"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:20,padding:"0 28px",height:52}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
            <rect x="4" y="3"  width="14" height="3.5" rx="1.75" fill="#0a84ff"/>
            <rect x="4" y="9"  width="10" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.65"/>
            <rect x="4" y="15" width="14" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.4"/>
            <rect x="4" y="21" width="7"  height="3.5" rx="1.75" fill="#0a84ff" opacity="0.22"/>
            <rect x="20" y="15" width="3" height="10"  rx="1.5"  fill="#30d158"/>
          </svg>
          <span style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.7)",letterSpacing:"-.03em"}}>StatinSite</span>
          <span style={{fontSize:11,color:"rgba(255,255,255,0.25)",letterSpacing:".01em"}}>Football Intelligence · ELO · Dixon-Coles · xG</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 16px",background:"rgba(255,255,255,0.04)",border:"0.5px solid rgba(255,255,255,0.09)",borderRadius:999,flexShrink:0}}>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.28)",letterSpacing:".1em",textTransform:"uppercase"}}>Built by</span>
          <span style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.75)"}}>Rutej Talati</span>
        </div>
        <span style={{fontSize:11,color:"rgba(255,255,255,0.2)",flexShrink:0}}>© {new Date().getFullYear()} StatinSite</span>
      </div>
    </footer>
  );
}

export default function LiveMatchPage() {
  const { fixtureId } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

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
  const [activeNavGroup,setActiveNavGroup] = useState("domestic");
  const pollRef = useRef(null);

  // ── Match intelligence raw (used by AnalysisPanel) ──────────────────────
  const [matchIntelRaw, setMatchIntelRaw] = useState(null);

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
    <div style={{ position:"relative" }}>
      <div style={{ minHeight:"100vh", color:"var(--text)", position:"relative" }}>
      <MatchBg/>
      <style>{NB_CSS}</style>
      <style>{`
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.25;transform:scale(0.55)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lmScanX { 0%{left:-40%} 100%{left:140%} }
        @keyframes lmBorderFlow { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes lmBarIn { from{width:0} to{width:var(--w)} }
        @keyframes lmGlow { 0%,100%{box-shadow:0 0 4px rgba(255,255,255,.2)} 50%{box-shadow:0 0 12px rgba(255,255,255,.4)} }
        
        @keyframes nb-mp-spin { to{transform:rotate(360deg)} }
        .lm-tab { background:none; border:none; cursor:pointer; font-family:'Space Grotesk','Inter',sans-serif; transition:all 0.15s; letter-spacing:0.08em; text-transform:uppercase; }
        .lm-tab:hover { color:#ffffff !important; }
        .lm-stat-bar { animation: lmBarIn 0.7s cubic-bezier(.22,1,.36,1) both; }
        .lm-card { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08); border-radius:12px; transition:border-color .2s, box-shadow .2s; }
        .lm-card:hover { border-color:rgba(255,255,255,.16); box-shadow:0 8px 28px rgba(0,0,0,.5); }
      `}</style>

      {/* Back nav + competition switcher */}
      <div style={{ borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ padding: isMobile ? "10px 12px 8px" : "12px 20px 10px", display:"flex", alignItems:"center", gap:10 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ background:"none", border:"none", color:"rgba(255,255,255,0.35)", cursor:"pointer", fontSize:11, fontWeight:700, letterSpacing:"0.04em", padding:0, display:"flex", alignItems:"center", gap:5 }}
          >
            ← Live Centre
          </button>
          <span style={{ width:1, height:12, background:"rgba(255,255,255,0.12)", flexShrink:0 }} />
          {/* Show competition logo + name from the live fixture data if available */}
          {fixture?.fixture?.league?.logo && (
            <img
              src={fixture.fixture.league.logo}
              alt=""
              width={16} height={16}
              style={{ objectFit:"contain", flexShrink:0, filter:"brightness(0) invert(1)", opacity:0.6 }}
              onError={e => { e.currentTarget.style.display="none"; }}
            />
          )}
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", letterSpacing:"0.06em", textTransform:"uppercase", fontWeight:600 }}>
            {fixture?.fixture?.league?.name || "Switch Competition"}
          </span>
        </div>
        <CompetitionNav
          activeCode={league}
          activeGroup={activeNavGroup}
          setActiveGroup={setActiveNavGroup}
          onSelect={(tab) => navigate(`/predictions/${tab.slug}`)}
        />
      </div>

      {loading && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:280, color:"rgba(255,255,255,0.25)", fontSize:13 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ width:28, height:28, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.15)", borderTopColor:"#ffffff", margin:"0 auto 14px", animation:"livePulse 0.8s linear infinite" }} />
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
            background:"#080808",
            borderBottom:"2px solid rgba(255,255,255,.18)",
            display:"flex", padding:"0 20px", overflowX:"auto",
          }}>
            {tabs.map(t => (
              <button key={t} className="lm-tab" onClick={() => setTab(t)} style={{
                padding:"12px 14px", fontSize:11, fontWeight:800,
                letterSpacing:"0.04em", textTransform:"uppercase",
                color: tab === t ? "#ffffff" : "rgba(255,255,255,0.35)",
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
            {mode === "prematch" && tab === "Analysis" && (
              <AnalysisPanel
                mode={mode} fixture={fixture}
                events={events} stats={stats} momentumData={momentumData}
                winProb={winProb} matchIntelRaw={matchIntelRaw}
                homeTeam={homeTeam} awayTeam={awayTeam}
              />
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
            {mode === "live" && tab === "Lineups"  && <LineupsPanel lineups={lineups} homeTeam={homeTeam} awayTeam={awayTeam} venueName={fixtureInfo?.venue?.name} />}
            {mode === "live" && tab === "Players"  && <PlayerTable players={players} homeTeam={homeTeam} awayTeam={awayTeam} />}
            {mode === "live" && tab === "Analysis" && (
              <AnalysisPanel
                mode={mode} fixture={fixture}
                events={events} stats={stats} momentumData={momentumData}
                winProb={winProb} matchIntelRaw={matchIntelRaw}
                homeTeam={homeTeam} awayTeam={awayTeam}
              />
            )}

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
            {mode === "fulltime" && tab === "Lineups" && <LineupsPanel lineups={lineups} homeTeam={homeTeam} awayTeam={awayTeam} venueName={fixtureInfo?.venue?.name} />}
            {mode === "fulltime" && tab === "Analysis" && (
              <AnalysisPanel
                mode={mode} fixture={fixture}
                events={events} stats={stats} momentumData={momentumData}
                winProb={winProb} matchIntelRaw={matchIntelRaw}
                homeTeam={homeTeam} awayTeam={awayTeam}
              />
            )}

            {/* Empty state */}
            {!stats.length && !events.length && !lineups.length && !winProb && (
              <div style={{ padding:48, textAlign:"center", color:"rgba(255,255,255,0.18)", fontSize:13 }}>
                No detailed match data available for this fixture.
                <br /><br />
                <button onClick={() => navigate(-1)} style={{ color:"#ffffff", fontWeight:700, background:"none", border:"none", cursor:"pointer", fontSize:13 }}>
                  ← Back to Live Centre
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );