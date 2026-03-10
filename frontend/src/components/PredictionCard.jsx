// components/PredictionCard.jsx  — v4
// ═══════════════════════════════════════════════════════════════════════
//  Complete redesign — the definitive prediction card:
//
//  VISUAL STRUCTURE:
//    ┌─────────────────────────────────────────────────────┐
//    │  [Date · Kickoff time]       [Strength badge ●]     │
//    ├─────────────────────────────────────────────────────┤
//    │  🏟 Home        [Score]        Away 🏟              │
//    │  Win%           [───▓▓─]       Win%                 │
//    │                 H% · D% · A%                        │
//    ├─────────────────────────────────────────────────────┤
//    │  ╔══════════ MINI PITCH ANIMATION ══════════╗       │
//    │  ║ [⬜goal]  ~~~~●→→→→→→→→→→→→→[⬜goal]   ║       │
//    │  ╚══════════════════════════════════════════╝       │
//    ├─────────────────────────────────────────────────────┤
//    │  [Likely Winner]    [Prediction Strength]           │
//    │  [Goal Exp]  [Both Score]  [Clean Sheet Edge]       │
//    ├─────────────────────────────────────────────────────┤
//    │  Home  W W D L W   Away  L W W W D   (form)         │
//    ├─────────────────────────────────────────────────────┤
//    │  [ ▾ SHOW ADVANCED METRICS ]                        │
//    └─────────────────────────────────────────────────────┘
//
//  ANIMATION LOGIC (MiniPitch):
//    home win  → ball spawns left-of-centre, curves to away goal (right)
//    away win  → ball spawns right-of-centre, curves to home goal (left)
//    draw      → stronger side pushes ball towards centre, stops at midline
//
//  CSS approach: SVG offset-path motion-path for ball + CSS @keyframes.
//  Random unique IDs per mount prevent keyframe collision across cards.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useMemo, useId } from "react";

// ─── constants ────────────────────────────────────────────────
const MONO = "DM Mono,monospace";
const SANS = "Outfit,sans-serif";

// ─── pure helpers ─────────────────────────────────────────────
const p100  = v => Math.round((v || 0) * 100);
const r1    = v => (Math.round((v || 0) * 10) / 10).toFixed(1);
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

function parseForm(raw) {
  if (Array.isArray(raw)) return raw.filter(c => "WDL".includes(c));
  return String(raw || "").split("").filter(c => "WDL".includes(c));
}

function kickoffString(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", { weekday:"short", day:"numeric", month:"short" })
         + " · "
         + d.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });
  } catch { return dateStr; }
}

// ─── strength meta ────────────────────────────────────────────
function strength(conf) {
  if (conf >= 72) return { label:"Strong",    dot:"#28d97a", text:"#28d97a", bg:"rgba(40,217,122,.1)",  border:"rgba(40,217,122,.28)" };
  if (conf >= 52) return { label:"Moderate",  dot:"#f2c94c", text:"#f2c94c", bg:"rgba(242,201,76,.08)", border:"rgba(242,201,76,.25)" };
  if (conf >= 36) return { label:"Uncertain", dot:"#ff6b35", text:"#ff6b35", bg:"rgba(255,107,53,.08)", border:"rgba(255,107,53,.22)" };
  return               { label:"Low",        dot:"#6a7a9a", text:"#6a7a9a", bg:"rgba(255,255,255,.04)",border:"rgba(255,255,255,.1)"  };
}

function goalExp(over25) {
  const p = p100(over25);
  if (p >= 68) return { label:"High",   color:"#28d97a" };
  if (p >= 48) return { label:"Medium", color:"#f2c94c" };
  return               { label:"Low",   color:"#6a7a9a" };
}

// ─── count-up hook ────────────────────────────────────────────
function useCountUp(target, ms = 900) {
  const [v, set] = useState(0);
  useEffect(() => {
    set(0);
    const t0 = performance.now();
    let raf;
    const tick = now => {
      const prog = Math.min((now - t0) / ms, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      set(Math.round(ease * target));
      if (prog < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

// ─── animated % ───────────────────────────────────────────────
function CountPct({ value, color, size = 11 }) {
  const v = useCountUp(p100(value), 950);
  return (
    <span style={{ color, fontFamily: MONO, fontWeight: 900, fontSize: size }}>
      {v}%
    </span>
  );
}

// ─── animated probability tri-bar ────────────────────────────
function ProbBar({ hp, dp, ap }) {
  const [go, setGo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setGo(true), 80); return () => clearTimeout(t); }, []);
  const total = (hp + dp + ap) || 1;

  return (
    <div style={{ display:"flex", gap:2, height:7, borderRadius:5, overflow:"hidden", width:"100%" }}>
      {[
        { v: hp, g: "linear-gradient(90deg,#1d4ed8,#3b9eff)", r: "5px 0 0 5px" },
        { v: dp, g: "linear-gradient(90deg,#374151,#6b7280)", r: "0" },
        { v: ap, g: "linear-gradient(90deg,#b91c1c,#e05050)", r: "0 5px 5px 0" },
      ].map(({ v, g, r }, i) => (
        <div key={i} style={{
          flex: go ? v / total : 0,
          background: g,
          borderRadius: r,
          transition: "flex 1s cubic-bezier(0.34,1.2,0.64,1)",
          minWidth: go && v > 0 ? 4 : 0,
        }} />
      ))}
    </div>
  );
}

// ─── insight chip ─────────────────────────────────────────────
function Chip({ label, value, color = "#6a7a9a", bg, border, grow = true }) {
  const [hov, setHov] = useState(false);
  const activeBg     = bg     || `${color}12`;
  const activeBorder = border || `${color}30`;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", flexDirection: "column", gap: 3,
        padding: "7px 11px", borderRadius: 10,
        flex: grow ? 1 : "none", minWidth: 0,
        background: hov ? `${color}1e` : activeBg,
        border: `1px solid ${hov ? color + "55" : activeBorder}`,
        transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? `0 6px 18px rgba(0,0,0,.4), 0 0 0 1px ${color}22` : "none",
        transition: "all .18s cubic-bezier(.4,0,.2,1)",
        cursor: "default",
      }}>
      <span style={{
        fontSize: 7, fontWeight: 900, letterSpacing: ".12em",
        color: "#2a4a6a", lineHeight: 1, whiteSpace: "nowrap"
      }}>
        {label.toUpperCase()}
      </span>
      <span style={{
        fontSize: 12, fontWeight: 800, color,
        lineHeight: 1.2, whiteSpace: "nowrap",
        overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {value}
      </span>
    </div>
  );
}

// ─── form pip ────────────────────────────────────────────────
function FormPip({ r: result }) {
  const s = {
    W: { bg:"rgba(40,217,122,.15)",  c:"#28d97a", b:"rgba(40,217,122,.32)" },
    D: { bg:"rgba(150,150,170,.1)",  c:"#8a9aaa", b:"rgba(150,150,170,.2)" },
    L: { bg:"rgba(220,70,70,.15)",   c:"#e05050", b:"rgba(220,70,70,.28)"  },
  }[result] || { bg:"rgba(255,255,255,.04)", c:"#4a6a8a", b:"rgba(255,255,255,.1)" };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 19, height: 19, borderRadius: 5,
      fontSize: 8.5, fontWeight: 900, fontFamily: MONO,
      background: s.bg, color: s.c, border: `1px solid ${s.b}`,
      flexShrink: 0,
    }}>
      {result}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════
//  MINI PITCH ANIMATION
//  Uses CSS motion-path (offset-path) so the ball follows a
//  cubic-bezier curve rather than a straight line.
//  Random unique suffix per render avoids @keyframe collisions
//  when multiple cards appear on the same page simultaneously.
// ══════════════════════════════════════════════════════════════
function MiniPitch({ outcome, homeProb, awayProb, homeTeam, awayTeam }) {
  // stable IDs per component instance
  const uid = useRef(Math.random().toString(36).slice(2, 8)).current;

  const W = 280, H = 52;
  const MY = H / 2;               // vertical midpoint
  const MX = W / 2;               // horizontal midpoint

  // ── Goalpost geometry ─────────────────────────────────────
  // Each goal: a U-shape open toward the pitch
  // Posts are 2px wide, crossbar 1.5px tall, net area filled with faint colour
  const GH    = 20;              // goal opening height
  const GD    = 9;               // goal depth (how far into the pitch)
  const GYTP  = MY - GH / 2;     // goal top Y
  const GYBP  = MY + GH / 2;     // goal bottom Y

  // Home goal — left side (mouth faces RIGHT)
  const HG = { x: 0, mouthX: GD, topY: GYTP, botY: GYBP };
  // Away goal — right side (mouth faces LEFT)
  const AG = { x: W, mouthX: W - GD, topY: GYTP, botY: GYBP };

  // ── Ball path calculation ──────────────────────────────────
  let startX, startY, endX, endY, cp1x, cp1y, cp2x, cp2y;

  const BALL_R = 4.5;

  if (outcome === "home") {
    // Ball starts in home half, arcs to inside away goal
    startX = W * 0.3;  startY = MY;
    endX   = AG.mouthX + 2;
    endY   = MY;
    cp1x   = W * 0.52; cp1y = MY - 12;
    cp2x   = W * 0.78; cp2y = MY + 7;
  } else if (outcome === "away") {
    // Ball starts in away half, arcs to inside home goal
    startX = W * 0.7;  startY = MY;
    endX   = HG.mouthX - 2;
    endY   = MY;
    cp1x   = W * 0.48; cp1y = MY - 12;
    cp2x   = W * 0.22; cp2y = MY + 7;
  } else {
    // Draw — stronger side pushes toward centre, stops at midline
    const stronger = homeProb >= awayProb ? "home" : "away";
    if (stronger === "home") {
      startX = W * 0.28; startY = MY;
      endX   = MX;       endY   = MY + 1;
      cp1x   = W * 0.40; cp1y   = MY - 9;
      cp2x   = W * 0.50; cp2y   = MY + 5;
    } else {
      startX = W * 0.72; startY = MY;
      endX   = MX;       endY   = MY + 1;
      cp1x   = W * 0.60; cp1y   = MY - 9;
      cp2x   = W * 0.50; cp2y   = MY + 5;
    }
  }

  const pathD = `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;

  // ── Colours ───────────────────────────────────────────────
  const glowCol   = outcome==="home" ? "#3b9eff" : outcome==="away" ? "#e05050" : "#f2c94c";
  const homeGoalC = outcome==="away" ? "#ff4d4d" : "rgba(255,255,255,0.55)";
  const awayGoalC = outcome==="home" ? "#3b9eff" : "rgba(255,255,255,0.55)";

  // ── Timing ────────────────────────────────────────────────
  const DELAY    = 0.55;           // seconds before motion starts
  const DUR      = outcome==="draw" ? 1.3 : 1.9;

  // ── CSS injected once per card ────────────────────────────
  const css = `
    /* Ball motion along cubic bezier path */
    @keyframes pc_ball_${uid} {
      0%   { offset-distance: 0%;   opacity: 1; }
      100% { offset-distance: 100%; opacity: 1; }
    }
    /* Glow burst at destination */
    @keyframes pc_glow_${uid} {
      0%, 75%  { opacity: 0; transform: scale(0.4); }
      88%      { opacity: 0.85; transform: scale(1.0); }
      100%     { opacity: 0; transform: scale(1.8); }
    }
    /* Dashed trail fades in then out */
    @keyframes pc_trail_${uid} {
      0%         { stroke-dashoffset: 280; opacity: 0;   }
      12%        { opacity: 0.5; }
      85%        { stroke-dashoffset: 0;   opacity: 0.35; }
      100%       { opacity: 0; }
    }
    /* Ball idle float before animation */
    @keyframes pc_idle_${uid} {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-1.5px); }
    }
    /* Goal flash on scoring */
    @keyframes pc_goalflash_${uid} {
      0%, 70%  { opacity: 0; }
      80%      { opacity: 0.35; }
      100%     { opacity: 0; }
    }
  `;

  // ── Goal net flash colour ──────────────────────────────────
  const homeNetFlash = outcome === "away"
    ? `rgba(255,77,77,0.22) 0s ${DELAY + DUR * 0.9}s forwards`
    : "none";
  const awayNetFlash = outcome === "home"
    ? `rgba(59,158,255,0.22) 0s ${DELAY + DUR * 0.9}s forwards`
    : "none";

  return (
    <div style={{ width: "100%", lineHeight: 0 }}>
      <style>{css}</style>
      <svg
        width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", borderRadius: 8, overflow: "visible" }}
        aria-hidden="true"
      >
        <defs>
          {/* Pitch gradient — subtle grass stripes */}
          <linearGradient id={`pg_${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0c3318" />
            <stop offset="100%" stopColor="#082810" />
          </linearGradient>
          {/* Alternating stripe pattern */}
          <pattern id={`ps_${uid}`} width="28" height={H} patternUnits="userSpaceOnUse">
            <rect width="14" height={H} fill="rgba(255,255,255,0.022)" />
          </pattern>
          {/* Ball radial gradient */}
          <radialGradient id={`ball_${uid}`} cx="35%" cy="30%" r="65%">
            <stop offset="0%"   stopColor="#ffffff" />
            <stop offset="100%" stopColor="#ccddee" />
          </radialGradient>
          {/* Glow filter */}
          <filter id={`blur_${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* ── Pitch background ── */}
        <rect x="0" y="0" width={W} height={H} rx="8" fill={`url(#pg_${uid})`} />
        <rect x="0" y="0" width={W} height={H} rx="8" fill={`url(#ps_${uid})`} />

        {/* ── Pitch markings ── */}
        {/* Centre line */}
        <line
          x1={MX} y1="5" x2={MX} y2={H - 5}
          stroke="rgba(255,255,255,0.13)" strokeWidth="0.8" strokeDasharray="3 2.5"
        />
        {/* Centre circle */}
        <circle cx={MX} cy={MY} r="11"
          fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="0.8" />
        {/* Centre spot */}
        <circle cx={MX} cy={MY} r="1.5" fill="rgba(255,255,255,0.18)" />

        {/* Left penalty area */}
        <rect x="0" y={MY - 14} width="26" height="28" rx="1.5"
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
        {/* Right penalty area */}
        <rect x={W - 26} y={MY - 14} width="26" height="28" rx="1.5"
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />

        {/* ── Home goal (left) ── */}
        {/* Net flash */}
        <rect x="0" y={HG.topY} width={HG.mouthX} height={GH}
          fill="rgba(255,77,77,0)" rx="1"
          style={{ animation: homeNetFlash !== "none"
            ? `pc_goalflash_${uid} 0.6s ${DELAY + DUR * 0.9}s ease-out forwards`
            : "none" }}
        />
        {/* Crossbar (top) */}
        <line x1="0" y1={HG.topY} x2={HG.mouthX} y2={HG.topY}
          stroke={homeGoalC} strokeWidth="1.5" strokeLinecap="round" />
        {/* Bottom bar */}
        <line x1="0" y1={HG.botY} x2={HG.mouthX} y2={HG.botY}
          stroke={homeGoalC} strokeWidth="1.5" strokeLinecap="round" />
        {/* Back post (far left) */}
        <line x1="1" y1={HG.topY} x2="1" y2={HG.botY}
          stroke={homeGoalC} strokeWidth="1.5" strokeLinecap="round" />
        {/* Net lines */}
        {[0.33, 0.66].map((f, i) => (
          <line key={i}
            x1={f * HG.mouthX} y1={HG.topY}
            x2={f * HG.mouthX} y2={HG.botY}
            stroke="rgba(255,255,255,0.07)" strokeWidth="0.7" />
        ))}

        {/* ── Away goal (right) ── */}
        {/* Net flash */}
        <rect x={AG.mouthX} y={AG.topY} width={W - AG.mouthX} height={GH}
          fill="rgba(59,158,255,0)" rx="1"
          style={{ animation: awayNetFlash !== "none"
            ? `pc_goalflash_${uid} 0.6s ${DELAY + DUR * 0.9}s ease-out forwards`
            : "none" }}
        />
        {/* Crossbar */}
        <line x1={AG.mouthX} y1={AG.topY} x2={W} y2={AG.topY}
          stroke={awayGoalC} strokeWidth="1.5" strokeLinecap="round" />
        {/* Bottom bar */}
        <line x1={AG.mouthX} y1={AG.botY} x2={W} y2={AG.botY}
          stroke={awayGoalC} strokeWidth="1.5" strokeLinecap="round" />
        {/* Back post (far right) */}
        <line x1={W - 1} y1={AG.topY} x2={W - 1} y2={AG.botY}
          stroke={awayGoalC} strokeWidth="1.5" strokeLinecap="round" />
        {/* Net lines */}
        {[0.33, 0.66].map((f, i) => (
          <line key={i}
            x1={AG.mouthX + f * (W - AG.mouthX)} y1={AG.topY}
            x2={AG.mouthX + f * (W - AG.mouthX)} y2={AG.botY}
            stroke="rgba(255,255,255,0.07)" strokeWidth="0.7" />
        ))}

        {/* Team initials (faint watermark) */}
        <text x={W * 0.17} y={H - 5} fontSize="7.5" fontWeight="800"
          fill="rgba(255,255,255,0.18)" textAnchor="middle" fontFamily={SANS}>
          {(homeTeam || "H").slice(0, 3).toUpperCase()}
        </text>
        <text x={W * 0.83} y={H - 5} fontSize="7.5" fontWeight="800"
          fill="rgba(255,255,255,0.18)" textAnchor="middle" fontFamily={SANS}>
          {(awayTeam || "A").slice(0, 3).toUpperCase()}
        </text>

        {/* ── Ball trail (dashed glow line) ── */}
        <path
          d={pathD}
          fill="none"
          stroke={glowCol}
          strokeWidth="2"
          strokeDasharray="5 7"
          strokeDashoffset="280"
          style={{
            animation: `pc_trail_${uid} ${DUR}s ${DELAY}s ease-in-out forwards`,
            opacity: 0,
            filter: `drop-shadow(0 0 2px ${glowCol})`,
          }}
        />

        {/* ── Destination glow burst ── */}
        <circle
          cx={endX} cy={endY} r="9"
          fill={glowCol}
          filter={`url(#blur_${uid})`}
          style={{
            animation: `pc_glow_${uid} 0.7s ${DELAY + DUR * 0.87}s ease-out forwards`,
            opacity: 0,
            transformOrigin: `${endX}px ${endY}px`,
          }}
        />

        {/* ── Animated football ── */}
        {/* Glow halo behind ball */}
        <circle
          r={BALL_R + 3}
          fill={glowCol}
          opacity="0.22"
          filter={`url(#blur_${uid})`}
          style={{
            offsetPath: `path("${pathD}")`,
            offsetDistance: "0%",
            animation: `pc_ball_${uid} ${DUR}s ${DELAY}s cubic-bezier(0.3,0,0.5,1) forwards`,
          }}
        />
        {/* Ball body */}
        <circle
          r={BALL_R}
          fill={`url(#ball_${uid})`}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="0.6"
          style={{
            offsetPath: `path("${pathD}")`,
            offsetDistance: "0%",
            animation: `pc_ball_${uid} ${DUR}s ${DELAY}s cubic-bezier(0.3,0,0.5,1) forwards`,
            filter: `drop-shadow(0 0 3px ${glowCol}88)`,
          }}
        />
        {/* Ball pentagon details */}
        {[[0,-1.8],[1.7,0.6],[-1.7,0.6]].map(([ox,oy],i) => (
          <circle key={i} r="1" fill="rgba(0,0,0,0.18)"
            style={{
              offsetPath: `path("${pathD}")`,
              offsetDistance: "0%",
              animation: `pc_ball_${uid} ${DUR}s ${DELAY}s cubic-bezier(0.3,0,0.5,1) forwards`,
              transform: `translate(${ox}px, ${oy}px)`,
            }}
          />
        ))}
      </svg>
    </div>
  );
}

// ─── Advanced expanded section ────────────────────────────────
function Advanced({ match, fav }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 40); return () => clearTimeout(t); }, []);

  const xgH = parseFloat(r1(match.xg_home));
  const xgA = parseFloat(r1(match.xg_away));
  const csH  = p100(match.home_clean_sheet);
  const csA  = p100(match.away_clean_sheet);
  const o25  = p100(match.over_2_5);
  const o35  = p100(match.over_3_5);

  const bars = [
    { label:"Expected Goals (Home)", val:`${r1(match.xg_home)} xG`, pct: clamp(xgH/3,0,1)*100, color:"#3b9eff" },
    { label:"Expected Goals (Away)", val:`${r1(match.xg_away)} xG`, pct: clamp(xgA/3,0,1)*100, color:"#e05050" },
    { label:"Home Clean Sheet",      val:`${csH}%`,                  pct: csH,                   color:"#28d97a" },
    { label:"Away Clean Sheet",      val:`${csA}%`,                  pct: csA,                   color:"#9ff1b4" },
    { label:"Goals 2+ (Over 2.5)",   val:`${o25}%`,                  pct: o25,                   color:"#f2c94c" },
    { label:"Goals 3+ (Over 3.5)",   val:`${o35}%`,                  pct: o35,                   color:"#ff6b35" },
  ];

  const homeInj = match.home_injuries || [];
  const awayInj = match.away_injuries || [];
  const hasInj  = homeInj.length > 0 || awayInj.length > 0;

  return (
    <div style={{
      borderTop: "1px solid rgba(255,255,255,.07)",
      paddingTop: 13, marginTop: 2,
      display: "flex", flexDirection: "column", gap: 12,
      animation: "pc_adv_in .22s cubic-bezier(.4,0,.2,1) both",
    }}>
      <style>{`@keyframes pc_adv_in { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:none} }`}</style>

      {/* Metric bars */}
      <div>
        <div style={{ fontSize:8, fontWeight:900, letterSpacing:".12em", color:"#2a4060", marginBottom:8 }}>
          DETAILED METRICS
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {bars.map(b => (
            <div key={b.label} style={{ display:"flex", alignItems:"center", gap:9 }}>
              <span style={{ fontSize:9, color:"#3a6080", minWidth:168, flexShrink:0 }}>{b.label}</span>
              <div style={{ flex:1, height:4, borderRadius:2, background:"rgba(255,255,255,.06)", overflow:"hidden" }}>
                <div style={{
                  height:"100%", width: ready ? `${b.pct}%` : "0%", background:b.color,
                  borderRadius:2, boxShadow:`0 0 6px ${b.color}55`,
                  transition:"width .85s cubic-bezier(.4,0,.2,1)",
                }}/>
              </div>
              <span style={{ fontSize:10, fontWeight:900, color:b.color, fontFamily:MONO, minWidth:44, textAlign:"right" }}>
                {b.val}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Injuries */}
      {hasInj && (
        <div style={{ display:"flex", gap:10 }}>
          {[
            { label:"Home Injuries", list:homeInj, color:"#3b9eff" },
            { label:"Away Injuries", list:awayInj, color:"#e05050" },
          ].map(({ label, list, color }) => list.length > 0 && (
            <div key={label} style={{ flex:1, display:"flex", flexDirection:"column", gap:4 }}>
              <div style={{ fontSize:7.5, fontWeight:900, color:"#1a3050", letterSpacing:".1em" }}>
                {label.toUpperCase()}
              </div>
              {list.slice(0, 4).map((inj, i) => (
                <div key={i} style={{
                  fontSize:9.5, color:"#ff4d6d", padding:"3px 8px", borderRadius:5,
                  background:"rgba(255,77,109,.07)", border:"1px solid rgba(255,77,109,.15)",
                  whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                }}>
                  🏥 {inj.player_name || inj}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Context row: venue / referee / model tag */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:6 }}>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          {match.venue && (
            <span style={{
              fontSize:8.5, color:"#3a6080", padding:"3px 8px", borderRadius:5,
              background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)",
            }}>📍 {match.venue}</span>
          )}
          {match.referee && (
            <span style={{
              fontSize:8.5, color:"#3a6080", padding:"3px 8px", borderRadius:5,
              background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.07)",
            }}>🟨 {match.referee}</span>
          )}
        </div>
        <span style={{
          fontSize:8.5, fontWeight:800, color:"#28d97a", padding:"3px 9px", borderRadius:5,
          background:"rgba(40,217,122,.07)", border:"1px solid rgba(40,217,122,.18)",
        }}>
          Dixon-Coles + Elo
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN CARD COMPONENT
// ══════════════════════════════════════════════════════════════
export default function PredictionCard({ match, animDelay = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const [hovered,  setHovered]  = useState(false);

  if (!match) return null;

  // ── core values ───────────────────────────────────────────
  const hp   = (match.p_home_win || 0);
  const dp   = (match.p_draw     || 0);
  const ap   = (match.p_away_win || 0);
  const hPct = p100(hp), dPct = p100(dp), aPct = p100(ap);
  const conf = match.confidence || 0;

  const fav = hPct > aPct && hPct > dPct ? "home"
            : aPct > hPct && aPct > dPct ? "away"
            : "draw";

  const sm = strength(conf);
  const gl = goalExp(match.over_2_5);

  // ── derived labels ────────────────────────────────────────
  const winnerName  = fav==="home" ? (match.home_team||"Home")
                    : fav==="away" ? (match.away_team||"Away")
                    : "Draw";
  const winnerColor = fav==="home" ? "#3b9eff" : fav==="away" ? "#e05050" : "#f2c94c";

  const bttsPct   = p100(match.btts);
  const bttsLabel = bttsPct >= 55 ? "Likely" : bttsPct >= 38 ? "Possible" : "Unlikely";
  const bttsColor = bttsPct >= 55 ? "#28d97a" : bttsPct >= 38 ? "#f2c94c" : "#6a7a9a";

  const csH  = p100(match.home_clean_sheet);
  const csA  = p100(match.away_clean_sheet);
  const csEdge = csH > csA + 8
    ? (match.home_team || "Home").split(" ").pop()
    : csA > csH + 8
    ? (match.away_team || "Away").split(" ").pop()
    : "Neither";
  const csColor = csEdge !== "Neither" ? "#28d97a" : "#6a7a9a";

  const homeForm = parseForm(match.home_form);
  const awayForm = parseForm(match.away_form);
  const kickoff  = kickoffString(match.date);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "rgba(255,255,255,.027)",
        border: `1px solid ${hovered ? winnerColor + "44" : "rgba(255,255,255,.08)"}`,
        borderRadius: 14,
        padding: "15px 16px 14px",
        display: "flex", flexDirection: "column", gap: 11,
        position: "relative", overflow: "hidden",
        transform: hovered ? "translateY(-3px) scale(1.009)" : "translateY(0) scale(1)",
        boxShadow: hovered
          ? `0 14px 40px rgba(0,0,0,.5), 0 0 0 1px ${winnerColor}22`
          : "0 3px 14px rgba(0,0,0,.26)",
        transition: "transform .22s cubic-bezier(.4,0,.2,1), box-shadow .22s, border-color .18s",
        animationDelay: `${animDelay}ms`,
        animation: "pc_enter .3s ease both",
      }}
    >
      <style>{`
        @keyframes pc_enter { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes pc_pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
      `}</style>

      {/* Left accent bar */}
      <div style={{
        position: "absolute", left: 0, top: "15%", bottom: "15%", width: 3,
        background: `linear-gradient(180deg, transparent, ${winnerColor}, transparent)`,
        borderRadius: "0 2px 2px 0",
        opacity: hovered ? 1 : 0.5,
        transition: "opacity .22s",
      }} />

      {/* ════ HEADER ════ */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, paddingLeft:8 }}>
        <span style={{ fontSize:9, fontWeight:700, color:"#2a4a6a", letterSpacing:".03em" }}>
          {kickoff}
        </span>
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 10px 4px 8px", borderRadius: 999,
          background: sm.bg, border: `1px solid ${sm.border}`,
          flexShrink: 0,
        }}>
          <div style={{
            width: 5.5, height: 5.5, borderRadius: "50%",
            background: sm.dot, boxShadow: `0 0 7px ${sm.dot}`,
            animation: "pc_pulse 2.2s ease-in-out infinite",
            flexShrink: 0,
          }} />
          <span style={{ fontSize:8, fontWeight:900, color:sm.text, letterSpacing:".09em", whiteSpace:"nowrap" }}>
            {sm.label.toUpperCase()} PREDICTION
          </span>
        </div>
      </div>

      {/* ════ TEAMS + SCORE ════ */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>

        {/* Home */}
        <div style={{
          flex: 1, display:"flex", alignItems:"center", gap:8, minWidth:0,
          opacity: fav==="away" ? 0.5 : 1,
          transition: "opacity .2s",
        }}>
          {match.home_logo && (
            <img src={match.home_logo} alt=""
              style={{ width:28, height:28, objectFit:"contain", flexShrink:0 }}
              onError={e => e.currentTarget.style.display="none"} />
          )}
          <div style={{ minWidth:0 }}>
            <div style={{
              fontSize: 13.5, fontWeight: 900, color: "#e8f0ff",
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
              fontFamily: SANS,
            }}>{match.home_team}</div>
            <CountPct value={hp} color="#3b9eff" size={10} />
          </div>
        </div>

        {/* Score + prob bar */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, flexShrink:0, minWidth:110 }}>
          <div style={{
            fontSize: 24, fontWeight: 900, color: "#fff",
            fontFamily: MONO, letterSpacing: ".1em",
            textShadow: `0 0 24px ${winnerColor}66`,
          }}>
            {match.most_likely_score || "?–?"}
          </div>
          <ProbBar hp={hp} dp={dp} ap={ap} />
          <div style={{ display:"flex", justifyContent:"space-between", width:"100%" }}>
            <span style={{ fontSize:8.5, color:"#3b9eff",  fontFamily:MONO, fontWeight:800 }}>{hPct}%</span>
            <span style={{ fontSize:8.5, color:"#4a6a8a",  fontFamily:MONO }}>{dPct}% D</span>
            <span style={{ fontSize:8.5, color:"#e05050",  fontFamily:MONO, fontWeight:800 }}>{aPct}%</span>
          </div>
        </div>

        {/* Away */}
        <div style={{
          flex: 1, display:"flex", alignItems:"center", gap:8,
          flexDirection: "row-reverse", minWidth:0,
          opacity: fav==="home" ? 0.5 : 1,
          transition: "opacity .2s",
        }}>
          {match.away_logo && (
            <img src={match.away_logo} alt=""
              style={{ width:28, height:28, objectFit:"contain", flexShrink:0 }}
              onError={e => e.currentTarget.style.display="none"} />
          )}
          <div style={{ minWidth:0, textAlign:"right" }}>
            <div style={{
              fontSize: 13.5, fontWeight: 900, color: "#e8f0ff",
              whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
              fontFamily: SANS,
            }}>{match.away_team}</div>
            <CountPct value={ap} color="#e05050" size={10} />
          </div>
        </div>
      </div>

      {/* ════ MINI PITCH ANIMATION ════ */}
      <MiniPitch
        outcome={fav}
        homeProb={hp}
        awayProb={ap}
        homeTeam={match.home_team}
        awayTeam={match.away_team}
      />

      {/* ════ INSIGHT CHIPS — Row 1 ════ */}
      <div style={{ display:"flex", gap:7 }}>
        <Chip
          label="Likely Winner"
          value={winnerName}
          color={winnerColor}
          bg={`${winnerColor}0d`}
          border={`${winnerColor}30`}
        />
        <Chip
          label="Prediction Strength"
          value={sm.label}
          color={sm.text}
          bg={sm.bg}
          border={sm.border}
        />
      </div>

      {/* ════ INSIGHT CHIPS — Row 2 ════ */}
      <div style={{ display:"flex", gap:7 }}>
        <Chip
          label="Goal Expectation"
          value={gl.label}
          color={gl.color}
          bg={`${gl.color}0d`}
          border={`${gl.color}28`}
        />
        <Chip
          label="Both Teams to Score"
          value={bttsLabel}
          color={bttsColor}
          bg={`${bttsColor}0d`}
          border={`${bttsColor}24`}
        />
        <Chip
          label="Clean Sheet Edge"
          value={csEdge}
          color={csColor}
          bg={`${csColor}0d`}
          border={`${csColor}24`}
        />
      </div>

      {/* ════ FORM ROWS ════ */}
      {(homeForm.length > 0 || awayForm.length > 0) && (
        <div style={{
          display:"flex", flexDirection:"column", gap:5,
          borderTop:"1px solid rgba(255,255,255,.05)", paddingTop:9,
        }}>
          {[{ name:match.home_team, form:homeForm }, { name:match.away_team, form:awayForm }]
            .filter(({ form }) => form.length > 0)
            .map(({ name, form }) => (
              <div key={name} style={{ display:"flex", alignItems:"center", gap:9 }}>
                <span style={{
                  fontSize:9.5, color:"#2a4a6a", fontWeight:700, flexShrink:0,
                  minWidth:78, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                }}>{name}</span>
                <div style={{ display:"flex", gap:3 }}>
                  {form.slice(-5).map((r, i) => <FormPip key={i} r={r} />)}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* ════ EXPAND BUTTON ════ */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "7px 0", borderRadius: 8, width: "100%", cursor: "pointer",
          background: expanded ? "rgba(59,158,255,.09)" : "rgba(255,255,255,.03)",
          border: `1px solid ${expanded ? "rgba(59,158,255,.24)" : "rgba(255,255,255,.07)"}`,
          color: expanded ? "#3b9eff" : "#2a4060",
          fontSize: 8.5, fontWeight: 900, letterSpacing: ".08em",
          transition: "all .15s ease", fontFamily: SANS,
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transition:"transform .22s", transform: expanded ? "rotate(180deg)" : "none", flexShrink:0 }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {expanded ? "HIDE ADVANCED METRICS" : "SHOW ADVANCED METRICS"}
      </button>

      {/* ════ ADVANCED SECTION ════ */}
      {expanded && <Advanced match={match} fav={fav} />}
    </div>
  );
}