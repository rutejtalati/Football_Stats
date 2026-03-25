// components/LiveTicker3Row.jsx — Neobrutalist 3-Row Ticker
// ─────────────────────────────────────────────────────────────
// Matches concept1_neobrutalist.html chip styles EXACTLY:
//   Row 1 LIVE   — white chips: team | black score pill | red minute dot
//   Row 2 TODAY  — semi-transparent chips: team | dim score | FT status
//   Row 3 NEXT UP — black chips: yellow-dim team | yellow VS | dim time
//
// DATA: pulls from useLiveTicker hook (real backend).
// FALLBACK: shows static example chips while loading or when backend is cold.
// PLACEMENT: static block in HomePage, NOT fixed/position:fixed.
// Remove old <LiveTicker> from App.jsx (already done in previous session).

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveTicker } from "../hooks/useLiveTicker";

const Y = "#e8ff47";
const K = "#0a0a0a";
const R = "#ff2744";

/* ── Time helpers ───────────────────────────────────────── */
function fmtKickoff(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const diff = Math.round((d - Date.now()) / 86400000);
    const t = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    if (diff === 0) return t;
    if (diff === 1) return `Tomorrow ${t}`;
    if (diff > 1 && diff < 7) return `${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]} ${t}`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ` ${t}`;
  } catch { return ""; }
}

/* ── Parse "Arsenal 2 – 1 Chelsea 67'" ─────────────────── */
function parseLiveLabel(label) {
  if (!label) return { home: "?", away: "?", score: "?–?", min: "" };
  // "Home Score Away Min" e.g. "Man City 2–1 Arsenal 74'" or "Man City 2 - 1 Arsenal"
  const m = label.match(/^(.+?)\s+(\d+\s*[–-]\s*\d+)\s+(.+?)(?:\s+(\d+\+?\d*'))?$/);
  if (m) return { home: m[1].trim(), away: m[3].trim(), score: m[2].replace(/ /g,""), min: m[4] || "" };
  // try splitting on "vs"
  const vs = label.split(" vs ");
  if (vs.length === 2) return { home: vs[0].trim(), away: vs[1].trim(), score: "v", min: "" };
  return { home: label, away: "", score: "", min: "" };
}

/* ── Static fallback chips shown while backend wakes up ─── */
const FALLBACK_LIVE = [
  { type:"live_score", label:"Man City 2–1 Arsenal 74'", detail:"Premier League" },
  { type:"live_score", label:"Liverpool 1–1 Chelsea 61'", detail:"Premier League" },
  { type:"live_score", label:"Inter 1–0 Juventus 52'", detail:"Serie A" },
  { type:"live_score", label:"PSG 4–1 Monaco 83'", detail:"Ligue 1" },
  { type:"live_score", label:"Bayern 3–0 Leverkusen 67'", detail:"Bundesliga" },
];
const FALLBACK_TODAY = [
  { type:"today", label:"Real Madrid vs Barcelona", detail:"20:00" },
  { type:"today", label:"Napoli vs Roma", detail:"18:30" },
  { type:"today", label:"Dortmund vs Leipzig", detail:"17:30" },
  { type:"today", label:"Lyon vs Nice", detail:"20:00" },
  { type:"today", label:"Ajax vs PSV", detail:"18:30" },
];
const FALLBACK_NEXT = [
  { type:"upcoming", label:"Tottenham vs Newcastle", detail:"2026-03-26T20:00:00Z" },
  { type:"upcoming", label:"AC Milan vs Fiorentina", detail:"2026-03-26T20:45:00Z" },
  { type:"upcoming", label:"Porto vs Benfica", detail:"2026-03-27T21:15:00Z" },
  { type:"upcoming", label:"Celtic vs Rangers", detail:"2026-03-29T12:30:00Z" },
  { type:"upcoming", label:"Valencia vs Villarreal", detail:"2026-03-29T19:00:00Z" },
];

/* ── CHIP: LIVE match ────────────────────────────────────── */
function LiveChip({ chip }) {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);
  const { home, away, score, min } = parseLiveLabel(chip.label);

  return (
    <span
      onClick={() => navigate("/live")}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"inline-flex", alignItems:"center", margin:"0 6px",
        border:`2px solid ${K}`, background: hov ? K : "#fff",
        height:26, overflow:"hidden", cursor:"pointer",
        transition:"background .12s", flexShrink:0,
      }}
    >
      {/* Home team */}
      <span style={{ padding:"0 8px", fontFamily:"'Space Grotesk',sans-serif", fontSize:11, fontWeight:700, color: hov ? Y : K, whiteSpace:"nowrap", transition:"color .12s" }}>{home}</span>
      {/* Score */}
      {score && (
        <span style={{ padding:"0 8px", background: hov ? Y : K, color: hov ? K : Y, fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, borderLeft:`2px solid ${K}`, borderRight:`2px solid ${K}`, display:"flex", alignItems:"center", transition:"background .12s,color .12s" }}>{score}</span>
      )}
      {/* Away team */}
      <span style={{ padding:"0 8px", fontFamily:"'Space Grotesk',sans-serif", fontSize:11, fontWeight:700, color: hov ? Y : K, whiteSpace:"nowrap", transition:"color .12s" }}>{away}</span>
      {/* Minute */}
      {min && (
        <span style={{ padding:"0 6px", fontFamily:"'DM Mono',monospace", fontSize:8, color:R, letterSpacing:".08em", borderLeft:"1px solid rgba(0,0,0,.15)", display:"flex", alignItems:"center", gap:4 }}>
          <span style={{ width:4, height:4, borderRadius:"50%", background:R, animation:"nb3Blink 1.1s step-start infinite", flexShrink:0 }}/>
          {min}
        </span>
      )}
    </span>
  );
}

/* ── CHIP: TODAY / result ─────────────────────────────────── */
function TodayChip({ chip }) {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);
  // label is "Team A vs Team B" or "Team A 2–1 Team B"
  const label = chip.label || "";
  const detail = chip.detail || "";

  // Try to extract score from label
  const scoreMatch = label.match(/^(.+?)\s+(\d+[–-]\d+)\s+(.+)$/);
  const home = scoreMatch ? scoreMatch[1] : label.split(" vs ")[0] || label;
  const score = scoreMatch ? scoreMatch[2] : null;
  const away = scoreMatch ? scoreMatch[3] : label.split(" vs ")[1] || "";

  return (
    <span
      onClick={() => navigate("/predictions/premier-league")}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"inline-flex", alignItems:"center", margin:"0 6px",
        border:`2px solid ${hov ? K : "rgba(0,0,0,.18)"}`,
        background: hov ? K : "transparent",
        height:26, overflow:"hidden", cursor:"pointer",
        transition:"all .12s", flexShrink:0,
      }}
    >
      <span style={{ padding:"0 8px", fontFamily:"'Space Grotesk',sans-serif", fontSize:11, fontWeight:700, color: hov ? Y : "rgba(0,0,0,.6)", whiteSpace:"nowrap", transition:"color .12s" }}>{home}</span>
      {score ? (
        <span style={{ padding:"0 8px", background:"rgba(0,0,0,.08)", fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:1, borderLeft:"1px solid rgba(0,0,0,.15)", borderRight:"1px solid rgba(0,0,0,.15)", display:"flex", alignItems:"center", color: hov ? Y : K, transition:"color .12s" }}>{score}</span>
      ) : (
        <span style={{ padding:"0 6px", fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color: hov ? Y : "rgba(0,0,0,.3)", borderLeft:"1px solid rgba(0,0,0,.1)", borderRight:"1px solid rgba(0,0,0,.1)" }}>vs</span>
      )}
      {away && <span style={{ padding:"0 8px", fontFamily:"'Space Grotesk',sans-serif", fontSize:11, fontWeight:700, color: hov ? Y : "rgba(0,0,0,.6)", whiteSpace:"nowrap", transition:"color .12s" }}>{away}</span>}
      {detail && <span style={{ padding:"0 7px", fontFamily:"'DM Mono',monospace", fontSize:8, color: hov ? "rgba(232,255,71,.5)" : "rgba(0,0,0,.35)", letterSpacing:".06em", whiteSpace:"nowrap", transition:"color .12s" }}>{detail}</span>}
    </span>
  );
}

/* ── CHIP: UPCOMING ──────────────────────────────────────── */
function NextChip({ chip }) {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);
  const parts = (chip.label || "").split(" vs ");
  const home = parts[0]?.trim() || "";
  const away = parts[1]?.trim() || "";
  // detail is ISO date string or "HH:MM"
  const time = chip.detail ? (chip.detail.includes("T") || chip.detail.includes("-") ? fmtKickoff(chip.detail.split(" · ")[0]) : chip.detail.split(" · ")[0]) : "";

  return (
    <span
      onClick={() => navigate("/predictions/premier-league")}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"inline-flex", alignItems:"center", margin:"0 6px",
        border:`2px solid ${K}`, background: hov ? Y : K,
        height:26, overflow:"hidden", cursor:"pointer",
        transition:"background .12s", flexShrink:0,
      }}
    >
      <span style={{ padding:"0 8px", fontFamily:"'Space Grotesk',sans-serif", fontSize:10, fontWeight:700, color: hov ? K : "rgba(232,255,71,.6)", whiteSpace:"nowrap", transition:"color .12s" }}>{home}</span>
      <span style={{ padding:"0 6px", fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color: hov ? K : Y, borderLeft:`1px solid ${hov ? "rgba(0,0,0,.2)" : "rgba(232,255,71,.15)"}`, borderRight:`1px solid ${hov ? "rgba(0,0,0,.2)" : "rgba(232,255,71,.15)"}`, transition:"color .12s,border-color .12s" }}>VS</span>
      <span style={{ padding:"0 8px", fontFamily:"'Space Grotesk',sans-serif", fontSize:10, fontWeight:700, color: hov ? K : "rgba(232,255,71,.6)", whiteSpace:"nowrap", transition:"color .12s" }}>{away}</span>
      {time && <span style={{ padding:"0 8px", fontFamily:"'DM Mono',monospace", fontSize:8, color: hov ? "rgba(0,0,0,.4)" : "rgba(232,255,71,.4)", letterSpacing:".1em", whiteSpace:"nowrap", transition:"color .12s" }}>{time}</span>}
    </span>
  );
}

/* ── Separator ───────────────────────────────────────────── */
const Sep = ({ onYellow }) => (
  <span style={{ width:1, height:12, background: onYellow ? "rgba(0,0,0,.12)" : "rgba(232,255,71,.15)", flexShrink:0, display:"inline-block", margin:"0 3px" }}/>
);

/* ── One scrolling row ───────────────────────────────────── */
function Row({ label, labelBg, labelColor, chips, Chip, dir="left", speed=24, onYellow=false, isLast=false }) {
  const [paused, setPaused] = useState(false);
  const all = [...chips, ...chips]; // duplicate for seamless loop
  const anim = dir === "right" ? "nb3ScrollR" : "nb3ScrollL";

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ height:38, display:"flex", alignItems:"stretch", overflow:"hidden", borderBottom: isLast ? "none" : `2px solid ${K}` }}
    >
      {/* Label */}
      <div style={{ flexShrink:0, display:"flex", alignItems:"center", padding:"0 14px", minWidth:84, justifyContent:"center", background:labelBg, color:labelColor, fontFamily:"'DM Mono',monospace", fontSize:8, letterSpacing:".22em", textTransform:"uppercase", fontWeight:700, borderRight:`3px solid ${K}`, gap:6, whiteSpace:"nowrap" }}>
        {label === "● LIVE" && <span style={{ width:5, height:5, borderRadius:"50%", background:"#fff", animation:"nb3Blink 1.1s step-start infinite", flexShrink:0 }}/>}
        {label.replace("● ","")}
      </div>

      {/* Track */}
      <div style={{ flex:1, overflow:"hidden", display:"flex", alignItems:"center" }}>
        <div style={{ display:"inline-flex", alignItems:"center", whiteSpace:"nowrap", willChange:"transform", animation:`${anim} ${speed}s linear infinite`, animationPlayState: paused ? "paused" : "running" }}>
          {all.map((chip, i) => (
            <span key={i} style={{ display:"inline-flex", alignItems:"center", flexShrink:0 }}>
              <Chip chip={chip}/>
              {i < all.length - 1 && <Sep onYellow={onYellow}/>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main export — place inside HomePage between nav and hero
══════════════════════════════════════════════════════════ */
export default function LiveTicker3Row() {
  const { chips, loading } = useLiveTicker(75_000);

  // Split real chips into buckets
  const liveChips     = chips.filter(c => c.type === "live_score");
  const upcomingChips = chips.filter(c => c.type === "upcoming");
  // "today" chips — scheduled matches that are neither live nor upcoming (or treat upcoming as today)
  const todayChips    = upcomingChips.length > 0 ? upcomingChips : chips.filter(c => c.type !== "live_score");

  // Use real data if available, fall back to static examples while loading/cold
  const row1 = liveChips.length > 0     ? liveChips     : FALLBACK_LIVE;
  const row2 = todayChips.length > 0    ? todayChips    : FALLBACK_TODAY;
  const row3 = upcomingChips.length > 0 ? upcomingChips : FALLBACK_NEXT;

  return (
    <>
      <style>{`
        @keyframes nb3ScrollL { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes nb3ScrollR { 0%{transform:translateX(-50%)} 100%{transform:translateX(0)} }
        @keyframes nb3Blink   { 50%{opacity:0} }
      `}</style>

      <div style={{ borderTop:`3px solid ${K}`, borderBottom:`4px solid ${K}` }}>
        <Row label="● LIVE"  labelBg={R}  labelColor="#fff" chips={row1} Chip={LiveChip}  dir="left"  speed={22} isLast={false}/>
        <Row label="TODAY"   labelBg={K}  labelColor={Y}   chips={row2} Chip={TodayChip} dir="right" speed={28} onYellow={false} isLast={false}/>
        <Row label="NEXT UP" labelBg={Y}  labelColor={K}   chips={row3} Chip={NextChip}  dir="left"  speed={18} onYellow={true}  isLast={true}/>
      </div>
    </>
  );
}