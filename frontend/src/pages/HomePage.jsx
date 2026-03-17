// ═══════════════════════════════════════════════════════════════
// StatinSite — HomePage  v3  "The War Room"
// ═══════════════════════════════════════════════════════════════
//
// Concept: You've just walked into a football intelligence bunker.
// Everything is data. Everything moves. Nothing is decorative.
//
// Sections:
//   1. CinematicHero        — full-viewport, diagonal type, live counter
//   2. LivePulse            — scrolling live scores strip
//   3. ToolGrid             — 8 asymmetric bento-style portal cards
//   4. TodaySlate           — horizontal fixture scroll with prob arcs
//   5. CompetitionRail      — UCL / UEL / UECL / FA Cup / Big 5 tiles
//   6. FPLCommand           — FPL tools as terminal-style list
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = "https://football-stats-lw4b.onrender.com";

// ─── Tokens ─────────────────────────────────────────────────
const T = {
  bg:     "#000810",
  card:   "rgba(6,11,22,0.98)",
  border: "rgba(255,255,255,0.06)",
  text:   "#e8f0ff",
  muted:  "#3d5a78",
  dim:    "#1a3050",
  blue:   "#38bdf8",
  green:  "#34d399",
  amber:  "#f59e0b",
  red:    "#f87171",
  live:   "#ff3333",
  purple: "#a78bfa",
  cyan:   "#67e8f9",
  orange: "#fb923c",
};

// ─── Status helpers ──────────────────────────────────────────
const LIVE = new Set(["1H","2H","HT","ET","BT","P"]);
const FT   = new Set(["FT","AET","PEN"]);
const isToday = d => d && new Date(d).toDateString() === new Date().toDateString();

// ─── Intersection reveal ─────────────────────────────────────
function useReveal(threshold = 0.1) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold });
    o.observe(el);
    return () => o.disconnect();
  }, []);
  return [ref, vis];
}

// ─── CountUp ─────────────────────────────────────────────────
function Num({ n, suffix = "" }) {
  const [v, setV] = useState(0);
  const [ref, vis] = useReveal(0.2);
  const ran = useRef(false);
  useEffect(() => {
    if (!vis || ran.current || !n) return;
    ran.current = true;
    const start = Date.now(), dur = 800;
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      setV(Math.round((1 - Math.pow(1 - p, 3)) * n));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [vis, n]);
  return <span ref={ref} style={{ fontFamily: "'JetBrains Mono',monospace" }}>{v}{suffix}</span>;
}

// ─── Diagonal grid texture ────────────────────────────────────
const GRID_BG = `
  repeating-linear-gradient(
    -45deg,
    rgba(255,255,255,0.012) 0px,
    rgba(255,255,255,0.012) 1px,
    transparent 1px,
    transparent 32px
  )
`;

// ══════════════════════════════════════════════════════════════
// 1. CINEMATIC HERO
// ══════════════════════════════════════════════════════════════
function CinematicHero({ fixtures, loading }) {
  const nav = useNavigate();
  const containerRef = useRef(null);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const [tick, setTick] = useState(0);

  // Slow tick for animated numbers
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const onMove = useCallback(e => {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    setMouse({ x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
  }, []);

  const liveCount  = fixtures.filter(f => LIVE.has(f.status)).length;
  const todayCount = fixtures.filter(f => isToday(f.kickoff)).length;
  const avgConf    = useMemo(() => {
    const w = fixtures.filter(f => f.confidence);
    return w.length ? Math.round(w.reduce((s, f) => s + f.confidence, 0) / w.length) : null;
  }, [fixtures]);

  const gx = (mouse.x - 0.5) * 40;
  const gy = (mouse.y - 0.5) * 28;

  return (
    <div
      ref={containerRef}
      onMouseMove={onMove}
      style={{
        position: "relative",
        minHeight: "100vh",
        background: T.bg,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 0 80px",
      }}
    >
      {/* Diagonal grid */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: GRID_BG, pointerEvents: "none" }} />

      {/* Parallax orbs */}
      {[
        { x: 18, y: 22, w: 800, c: "rgba(56,189,248,0.055)", dx: 0.5, dy: 0.4 },
        { x: 75, y: 65, w: 600, c: "rgba(52,211,153,0.045)", dx: -0.3, dy: -0.3 },
        { x: 88, y: 15, w: 400, c: "rgba(167,139,250,0.04)", dx: 0.6, dy: 0.5 },
      ].map((o, i) => (
        <div key={i} style={{
          position: "absolute",
          top: `calc(${o.y}% + ${gy * o.dy}px)`,
          left: `calc(${o.x}% + ${gx * o.dx}px)`,
          width: o.w, height: o.w,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${o.c} 0%, transparent 65%)`,
          transform: "translate(-50%,-50%)",
          transition: "top 0.18s ease, left 0.18s ease",
          pointerEvents: "none",
        }} />
      ))}

      {/* Vertical label — left edge */}
      <div style={{
        position: "absolute",
        left: 28,
        top: "50%",
        transform: "translateY(-50%) rotate(-90deg)",
        fontSize: 8,
        fontWeight: 900,
        letterSpacing: "0.22em",
        color: T.muted,
        textTransform: "uppercase",
        fontFamily: "'Inter',sans-serif",
        whiteSpace: "nowrap",
        opacity: 0.6,
      }}>
        Football Intelligence Platform
      </div>

      {/* Main content */}
      <div style={{
        position: "relative", zIndex: 1,
        maxWidth: 1200,
        margin: "0 auto",
        padding: "0 60px",
        width: "100%",
      }}>

        {/* Eyebrow */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 28,
          animation: "hp3-up 0.5s ease 0.1s both",
        }}>
          {liveCount > 0 ? (
            <>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: T.live,
                boxShadow: `0 0 12px ${T.live}`,
                animation: "hp3-pulse 1.6s ease-in-out infinite",
              }} />
              <span style={{
                fontSize: 10, fontWeight: 900, letterSpacing: "0.18em",
                color: T.live, textTransform: "uppercase",
              }}>
                {liveCount} Match{liveCount > 1 ? "es" : ""} Live
              </span>
            </>
          ) : (
            <span style={{
              fontSize: 10, fontWeight: 900, letterSpacing: "0.18em",
              color: T.muted, textTransform: "uppercase",
            }}>
              ELO · Dixon-Coles · Poisson · xG
            </span>
          )}
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${T.muted}40, transparent)` }} />
        </div>

        {/* Headline — oversized, diagonal feel via word wrap */}
        <h1 style={{
          fontSize: "clamp(44px, 7.5vw, 88px)",
          fontWeight: 900,
          fontFamily: "'Sora',sans-serif",
          letterSpacing: "-0.04em",
          lineHeight: 0.95,
          color: T.text,
          margin: "0 0 20px",
          animation: "hp3-up 0.6s ease 0.15s both",
        }}>
          Read The
          <br />
          <span style={{
            background: `linear-gradient(135deg, ${T.blue} 0%, ${T.cyan} 45%, ${T.green} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            Game.
          </span>
        </h1>

        {/* Sub */}
        <p style={{
          fontSize: "clamp(13px,1.5vw,16px)",
          color: T.muted,
          maxWidth: 440,
          lineHeight: 1.7,
          margin: "0 0 48px",
          animation: "hp3-up 0.6s ease 0.22s both",
        }}>
          Poisson models, ELO ratings, live xG tracking and FPL intelligence —
          every data point you need, before and during the match.
        </p>

        {/* CTA pair */}
        <div style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 72,
          animation: "hp3-up 0.6s ease 0.3s both",
        }}>
          <button
            onClick={() => nav("/live")}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 28px", borderRadius: 999,
              background: liveCount > 0
                ? `linear-gradient(135deg, ${T.live}, rgba(255,60,60,0.7))`
                : `linear-gradient(135deg, ${T.blue}, rgba(56,189,248,0.65))`,
              color: "#000",
              fontSize: 13, fontWeight: 900,
              border: "none", cursor: "pointer",
              boxShadow: liveCount > 0
                ? `0 0 36px rgba(255,44,44,0.35), 0 6px 20px rgba(0,0,0,0.4)`
                : `0 0 36px rgba(56,189,248,0.3), 0 6px 20px rgba(0,0,0,0.4)`,
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
          >
            {liveCount > 0 && (
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#000", opacity: 0.6, animation: "hp3-pulse 1.6s ease-in-out infinite" }} />
            )}
            {liveCount > 0 ? "Watch Live" : "Live Centre"}
          </button>
          <button
            onClick={() => nav("/predictions/premier-league")}
            style={{
              padding: "12px 28px", borderRadius: 999,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid rgba(255,255,255,0.1)`,
              color: "rgba(255,255,255,0.7)",
              fontSize: 13, fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
          >
            Predictions
          </button>
          <button
            onClick={() => nav("/best-team")}
            style={{
              padding: "12px 28px", borderRadius: 999,
              background: "rgba(40,217,122,0.06)",
              border: "1px solid rgba(40,217,122,0.18)",
              color: T.green,
              fontSize: 13, fontWeight: 800,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(40,217,122,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(40,217,122,0.06)"; }}
          >
            FPL Tools
          </button>
        </div>

        {/* Live stat row */}
        <div style={{
          display: "flex",
          gap: 0,
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          overflow: "hidden",
          maxWidth: 520,
          animation: "hp3-up 0.6s ease 0.38s both",
        }}>
          {[
            { label: "Live Now",      val: liveCount,     color: T.live,  live: true },
            { label: "Today",         val: todayCount,    color: T.blue              },
            { label: "Model Conf.",   val: avgConf,       color: T.green, suffix: "%" },
          ].map(({ label, val, color, live, suffix = "" }, i) => (
            <div key={label} style={{
              flex: 1,
              padding: "16px 14px",
              borderRight: i < 2 ? `1px solid ${T.border}` : "none",
              display: "flex", flexDirection: "column", gap: 5,
              alignItems: "center",
            }}>
              <div style={{
                fontSize: 26, fontWeight: 900, color: loading || val == null ? T.dim : color,
                fontFamily: "'JetBrains Mono',monospace",
                display: "flex", alignItems: "center", gap: 7, lineHeight: 1,
              }}>
                {live && val > 0 && !loading && (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.live, animation: "hp3-pulse 1.6s ease-in-out infinite" }} />
                )}
                {loading || val == null
                  ? <div style={{ width: 32, height: 26, borderRadius: 4, background: "rgba(255,255,255,0.05)", animation: "hp3-shimmer 1.4s ease infinite" }} />
                  : <Num n={val} suffix={suffix} />
                }
              </div>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.12em", color: T.dim, textTransform: "uppercase" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll hint */}
      <div style={{
        position: "absolute",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        animation: "hp3-fadeinhalf 1s ease 1.4s both",
      }}>
        <div style={{ width: 1, height: 32, background: `linear-gradient(180deg, transparent, ${T.muted}60)` }} />
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.muted, animation: "hp3-bounce 2s ease-in-out infinite" }} />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 2. LIVE PULSE STRIP
// ══════════════════════════════════════════════════════════════
function LivePulse({ fixtures }) {
  const nav = useNavigate();
  const live = fixtures.filter(f => LIVE.has(f.status));
  if (!live.length) return null;
  const chips = [...live, ...live, ...live];
  return (
    <div style={{
      background: "rgba(255,30,30,0.04)",
      borderTop: "1px solid rgba(255,30,30,0.1)",
      borderBottom: "1px solid rgba(255,30,30,0.1)",
      overflow: "hidden",
      height: 40,
      position: "relative",
    }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 48, background: `linear-gradient(to right, ${T.bg}, transparent)`, zIndex: 2, pointerEvents: "none" }} />
      <div style={{
        display: "flex",
        height: "100%",
        animation: `hp3-ticker ${live.length * 6}s linear infinite`,
        width: "max-content",
      }}>
        {chips.map((f, i) => (
          <div
            key={i}
            onClick={() => nav(`/match/${f.fixture_id}`)}
            style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "0 20px", height: "100%",
              borderRight: "1px solid rgba(255,30,30,0.07)",
              cursor: "pointer", flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,30,30,0.05)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.live, animation: "hp3-pulse 1.6s ease-in-out infinite" }} />
            {f.home_logo && <img src={f.home_logo} width={13} height={13} style={{ objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />}
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" }}>
              {f.home_team?.split(" ").slice(-1)[0]}
            </span>
            <span style={{ fontSize: 14, fontWeight: 900, color: T.text, fontFamily: "'JetBrains Mono',monospace" }}>
              {f.home_score ?? 0}–{f.away_score ?? 0}
            </span>
            {f.away_logo && <img src={f.away_logo} width={13} height={13} style={{ objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />}
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" }}>
              {f.away_team?.split(" ").slice(-1)[0]}
            </span>
            {f.minute && (
              <span style={{ fontSize: 8, fontWeight: 900, color: T.live, background: "rgba(255,30,30,0.1)", padding: "1px 5px", borderRadius: 3, fontFamily: "'JetBrains Mono',monospace" }}>
                {f.minute}'
              </span>
            )}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 48, background: `linear-gradient(to left, ${T.bg}, transparent)`, zIndex: 2, pointerEvents: "none" }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 3. TOOL GRID — asymmetric bento layout
// ══════════════════════════════════════════════════════════════
const TOOLS = [
  {
    to: "/live",
    label: "Live Centre",
    sub: "Real-time scores, minute-by-minute",
    color: T.live,
    span: 2,   // wide
    tall: true,
    graphic: "radar",
  },
  {
    to: "/predictions/premier-league",
    label: "Predictions",
    sub: "Dixon-Coles · ELO · xG",
    color: T.blue,
    span: 1,
    tall: false,
    graphic: "bar",
  },
  {
    to: "/match/0",
    label: "Match Hub",
    sub: "Lineups · H2H · xG · Injuries",
    color: T.purple,
    span: 1,
    tall: false,
    graphic: "pitch",
  },
  {
    to: "/best-team",
    label: "FPL Best XI",
    sub: "Optimal starting lineup",
    color: T.green,
    span: 1,
    tall: true,
    graphic: "star",
  },
  {
    to: "/squad-builder",
    label: "Squad Builder",
    sub: "Build your 15-man squad",
    color: T.green,
    span: 1,
    tall: false,
    graphic: "grid",
  },
  {
    to: "/player",
    label: "Players",
    sub: "500+ profiles · xG · FPL stats",
    color: T.amber,
    span: 1,
    tall: false,
    graphic: "person",
  },
  {
    to: "/news",
    label: "News",
    sub: "Transfers · Injuries · Updates",
    color: "#f472b6",
    span: 1,
    tall: false,
    graphic: "news",
  },
  {
    to: "/games",
    label: "Mini Games",
    sub: "Score predictor · Quizzes",
    color: T.orange,
    span: 1,
    tall: false,
    graphic: "game",
  },
];

// SVG graphics for each card
function CardGraphic({ type, color }) {
  if (type === "radar") return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" opacity="0.3">
      {[0.25,0.5,0.75,1].map((r,i) => (
        <polygon key={i} points={Array.from({length:6}).map((_,j)=>{
          const a=(j/6)*Math.PI*2-Math.PI/2;
          return `${40+Math.cos(a)*r*34},${40+Math.sin(a)*r*34}`;
        }).join(" ")} fill="none" stroke={color} strokeWidth="0.8"/>
      ))}
      {Array.from({length:6}).map((_,j)=>{
        const a=(j/6)*Math.PI*2-Math.PI/2;
        return <line key={j} x1="40" y1="40" x2={40+Math.cos(a)*34} y2={40+Math.sin(a)*34} stroke={color} strokeWidth="0.6"/>;
      })}
      <polygon points={[0.9,0.7,0.85,0.75,0.8,0.65].map((r,j)=>{
        const a=(j/6)*Math.PI*2-Math.PI/2;
        return `${40+Math.cos(a)*r*34},${40+Math.sin(a)*r*34}`;
      }).join(" ")} fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.2"/>
    </svg>
  );
  if (type === "bar") return (
    <svg width="70" height="48" viewBox="0 0 70 48" fill="none" opacity="0.35">
      {[
        {x:3, h:28}, {x:14,h:38}, {x:25,h:22}, {x:36,h:44}, {x:47,h:32}, {x:58,h:36},
      ].map(({x,h},i) => (
        <rect key={i} x={x} y={48-h} width={8} height={h} rx="2" fill={color} opacity={i===3?0.9:0.4+(i*0.08)}/>
      ))}
    </svg>
  );
  if (type === "pitch") return (
    <svg width="72" height="52" viewBox="0 0 72 52" fill="none" opacity="0.25">
      <rect x="1" y="1" width="70" height="50" rx="3" stroke={color} strokeWidth="1.2"/>
      <line x1="36" y1="1" x2="36" y2="51" stroke={color} strokeWidth="0.8"/>
      <circle cx="36" cy="26" r="9" stroke={color} strokeWidth="0.8"/>
      <rect x="1" y="16" width="14" height="20" stroke={color} strokeWidth="0.8"/>
      <rect x="57" y="16" width="14" height="20" stroke={color} strokeWidth="0.8"/>
    </svg>
  );
  if (type === "star") return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" opacity="0.3">
      <path d="M28 4l5.5 11 12 1.7L36 25.5l2.1 12L28 32l-10.1 5.5 2.1-12L10.5 16.7l12-1.7L28 4z"
        stroke={color} strokeWidth="1.4" fill={color} fillOpacity="0.15" strokeLinejoin="round"/>
    </svg>
  );
  if (type === "grid") return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" opacity="0.3">
      {[0,1,2,3].map(r => [0,1,2,3].map(c => (
        <rect key={`${r}${c}`} x={c*13+1} y={r*13+1} width="11" height="11" rx="2"
          fill={color} fillOpacity={0.1+(r+c)*0.05} stroke={color} strokeWidth="0.6" strokeOpacity="0.4"/>
      )))}
    </svg>
  );
  if (type === "person") return (
    <svg width="48" height="56" viewBox="0 0 48 56" fill="none" opacity="0.3">
      <circle cx="24" cy="14" r="10" stroke={color} strokeWidth="1.4"/>
      <path d="M4 54c0-11 9-20 20-20s20 9 20 20" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
  if (type === "news") return (
    <svg width="60" height="52" viewBox="0 0 60 52" fill="none" opacity="0.3">
      <rect x="1" y="1" width="58" height="50" rx="4" stroke={color} strokeWidth="1.2"/>
      <rect x="8" y="10" width="44" height="6" rx="2" fill={color} fillOpacity="0.5"/>
      <rect x="8" y="22" width="32" height="3" rx="1.5" fill={color} fillOpacity="0.3"/>
      <rect x="8" y="29" width="38" height="3" rx="1.5" fill={color} fillOpacity="0.25"/>
      <rect x="8" y="36" width="26" height="3" rx="1.5" fill={color} fillOpacity="0.2"/>
    </svg>
  );
  if (type === "game") return (
    <svg width="62" height="48" viewBox="0 0 62 48" fill="none" opacity="0.3">
      <rect x="1" y="8" width="60" height="32" rx="8" stroke={color} strokeWidth="1.4"/>
      <circle cx="18" cy="24" r="7" stroke={color} strokeWidth="1"/>
      <line x1="15" y1="24" x2="21" y2="24" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="18" y1="21" x2="18" y2="27" stroke={color} strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="44" cy="21" r="2" fill={color} opacity="0.6"/>
      <circle cx="50" cy="26" r="2" fill={color} opacity="0.4"/>
    </svg>
  );
  return null;
}

function ToolCard({ tool, index }) {
  const [hov, setHov] = useState(false);
  const [ref, vis] = useReveal(0.05);
  return (
    <div
      ref={ref}
      style={{
        gridColumn: `span ${tool.span}`,
        gridRow: tool.tall ? "span 2" : "span 1",
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(18px)",
        transition: `opacity 0.5s ease ${index * 55}ms, transform 0.5s ease ${index * 55}ms`,
      }}
    >
      <Link to={tool.to} style={{ textDecoration: "none", display: "block", height: "100%" }}>
        <div
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            height: "100%",
            minHeight: tool.tall ? 220 : 100,
            borderRadius: 18,
            background: hov ? `linear-gradient(145deg, ${tool.color}12, ${T.card})` : T.card,
            border: `1px solid ${hov ? tool.color + "40" : T.border}`,
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
            boxShadow: hov
              ? `0 0 40px ${tool.color}18, 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)`
              : `0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.025)`,
            transform: hov ? "translateY(-3px)" : "translateY(0)",
            transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)",
            cursor: "pointer",
          }}
        >
          {/* Top accent line */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2,
            background: hov ? `linear-gradient(90deg, ${tool.color}80, ${tool.color}20)` : "transparent",
            transition: "background 0.2s",
          }} />

          {/* Background graphic */}
          <div style={{
            position: "absolute",
            bottom: 12, right: 16,
            opacity: hov ? 0.6 : 0.3,
            transition: "opacity 0.2s, transform 0.2s",
            transform: hov ? "scale(1.08) translateY(-3px)" : "scale(1)",
          }}>
            <CardGraphic type={tool.graphic} color={tool.color} />
          </div>

          {/* Content */}
          <div>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${tool.color}18`,
              border: `1px solid ${tool.color}28`,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 12,
              boxShadow: hov ? `0 0 16px ${tool.color}25` : "none",
              transition: "box-shadow 0.2s",
            }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: tool.color }} />
            </div>
            <div style={{
              fontSize: 15, fontWeight: 900, color: T.text,
              letterSpacing: "-0.02em", marginBottom: 5,
              fontFamily: "'Sora',sans-serif",
            }}>
              {tool.label}
            </div>
            <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
              {tool.sub}
            </div>
          </div>

          {/* Arrow */}
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 10, fontWeight: 700,
            color: hov ? tool.color : T.dim,
            transition: "color 0.18s, transform 0.18s",
            transform: hov ? "translateX(4px)" : "translateX(0)",
            marginTop: 8,
          }}>
            Open
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </Link>
    </div>
  );
}

function ToolGrid() {
  const [ref, vis] = useReveal(0.05);
  return (
    <section style={{ padding: "80px 40px", background: T.bg, maxWidth: 1200, margin: "0 auto" }}>
      <div ref={ref} style={{
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        marginBottom: 32,
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.18em", color: T.muted, textTransform: "uppercase", marginBottom: 6 }}>
            — Platform
          </div>
          <h2 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 900, fontFamily: "'Sora',sans-serif", letterSpacing: "-0.025em", color: T.text, margin: 0 }}>
            Every tool, one platform.
          </h2>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted }}>
          8 tools
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gridAutoRows: "110px",
        gap: 10,
      }}>
        {TOOLS.map((t, i) => <ToolCard key={t.to} tool={t} index={i} />)}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// 4. TODAY'S SLATE — horizontal scroll fixtures
// ══════════════════════════════════════════════════════════════
function ProbArc({ home, draw, away, color }) {
  const r = 28, circ = Math.PI * r;
  const hd = (home / 100) * circ, dd = (draw / 100) * circ, ad = (away / 100) * circ;
  return (
    <svg width="64" height="36" viewBox="-2 -2 68 38">
      <path d="M2 34 A30 30 0 0 1 62 34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5"/>
      <path d={`M2 34 A30 30 0 0 1 62 34`} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={`${hd} ${circ - hd}`}
        strokeLinecap="round" opacity="0.9"
        style={{ filter: `drop-shadow(0 0 4px ${color}70)` }}/>
      <text x="32" y="30" textAnchor="middle" fontSize="9" fontWeight="800" fill={color} fontFamily="'JetBrains Mono',monospace">
        {home}%
      </text>
    </svg>
  );
}

function FixtureChip({ f }) {
  const nav = useNavigate();
  const [hov, setHov] = useState(false);
  const isLive = LIVE.has(f.status);
  const hp = Math.round((f.p_home_win || 0) * 100);
  const dp = Math.round((f.p_draw || 0) * 100);
  const ap = Math.round((f.p_away_win || 0) * 100);
  const fav = hp > ap + 8 ? "home" : ap > hp + 8 ? "away" : null;
  const color = isLive ? T.live : T.blue;

  return (
    <div
      onClick={() => nav(`/match/${f.fixture_id}`)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flexShrink: 0,
        width: 200,
        borderRadius: 16,
        background: hov ? `linear-gradient(145deg, ${color}10, ${T.card})` : T.card,
        border: `1px solid ${hov ? color + "40" : isLive ? "rgba(255,44,44,0.18)" : T.border}`,
        padding: "14px 16px",
        cursor: "pointer",
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hov ? `0 12px 36px rgba(0,0,0,0.45)` : "0 2px 10px rgba(0,0,0,0.3)",
        transition: "all 0.18s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left accent */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: color, borderRadius: "3px 0 0 3px", opacity: 0.7 }} />

      <div style={{ paddingLeft: 8 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 8, fontWeight: 900, color: color, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {f.league_name || "Match"}
          </span>
          {isLive ? (
            <span style={{ fontSize: 8, fontWeight: 900, color: T.live, display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.live, animation: "hp3-pulse 1.6s ease-in-out infinite" }} />
              {f.minute ? `${f.minute}'` : "LIVE"}
            </span>
          ) : f.kickoff ? (
            <span style={{ fontSize: 9, fontWeight: 700, color: T.muted, fontFamily: "'JetBrains Mono',monospace" }}>
              {new Date(f.kickoff).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : null}
        </div>

        {/* Teams */}
        {[
          { logo: f.home_logo, name: f.home_team, score: f.home_score, bold: f.home_score > f.away_score },
          { logo: f.away_logo, name: f.away_team, score: f.away_score, bold: f.away_score > f.home_score },
        ].map(({ logo, name, score, bold }) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
            {logo
              ? <img src={logo} width={16} height={16} style={{ objectFit: "contain", flexShrink: 0 }} onError={e => e.currentTarget.style.display = "none"} />
              : <div style={{ width: 16, height: 16, flexShrink: 0 }} />
            }
            <span style={{
              fontSize: 11, fontWeight: bold ? 800 : 600, flex: 1,
              color: bold ? T.text : "rgba(255,255,255,0.55)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{name}</span>
            {score != null && (
              <span style={{ fontSize: 14, fontWeight: 900, color: bold ? T.text : "rgba(255,255,255,0.28)", fontFamily: "'JetBrains Mono',monospace" }}>
                {score}
              </span>
            )}
          </div>
        ))}

        {/* Prob arc */}
        {hp > 0 && (
          <div style={{ marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <ProbArc home={hp} draw={dp} away={ap} color={fav === "home" ? T.blue : fav === "away" ? T.green : "rgba(255,255,255,0.3)"} />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.green, fontFamily: "'JetBrains Mono',monospace" }}>{ap}%</div>
              <div style={{ fontSize: 7, color: T.muted }}>Away</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TodaySlate({ fixtures }) {
  const [ref, vis] = useReveal(0.05);
  const pool = useMemo(() => {
    const live = fixtures.filter(f => LIVE.has(f.status));
    const today = fixtures.filter(f => isToday(f.kickoff) && !LIVE.has(f.status) && !FT.has(f.status));
    const seen = new Set();
    return [...live, ...today].filter(f => { if (seen.has(f.fixture_id)) return false; seen.add(f.fixture_id); return true; }).slice(0, 10);
  }, [fixtures]);

  if (!pool.length) return null;

  return (
    <section style={{ padding: "0 0 80px", background: T.bg }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px" }}>
        <div ref={ref} style={{
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(14px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
          display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20,
        }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.18em", color: T.muted, textTransform: "uppercase", marginBottom: 5 }}>— Today</div>
            <h2 style={{ fontSize: "clamp(18px,2.5vw,26px)", fontWeight: 900, fontFamily: "'Sora',sans-serif", letterSpacing: "-0.02em", color: T.text, margin: 0 }}>
              Today's Slate
            </h2>
          </div>
          <Link to="/live" style={{ textDecoration: "none", fontSize: 11, fontWeight: 700, color: T.blue, display: "flex", alignItems: "center", gap: 4 }}>
            All fixtures
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M2 4.5h5M4.5 2l2.5 2.5L4.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </Link>
        </div>
        <div style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          paddingBottom: 8,
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}>
          {pool.map(f => <FixtureChip key={f.fixture_id} f={f} />)}
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════
// 5. COMPETITION RAIL
// ══════════════════════════════════════════════════════════════
const COMPS = [
  { label: "Premier League", slug: "premier-league",   color: "#60a5fa", logo: "https://media.api-sports.io/football/leagues/39.png",  flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { label: "La Liga",        slug: "la-liga",          color: "#fb923c", logo: "https://media.api-sports.io/football/leagues/140.png", flag: "🇪🇸" },
  { label: "Bundesliga",     slug: "bundesliga",       color: "#f59e0b", logo: "https://media.api-sports.io/football/leagues/78.png",  flag: "🇩🇪" },
  { label: "Serie A",        slug: "serie-a",          color: "#34d399", logo: "https://media.api-sports.io/football/leagues/135.png", flag: "🇮🇹" },
  { label: "Ligue 1",        slug: "ligue-1",          color: "#a78bfa", logo: "https://media.api-sports.io/football/leagues/61.png",  flag: "🇫🇷" },
  { label: "UCL",            slug: "champions-league", color: "#3b82f6", logo: "https://media.api-sports.io/football/leagues/2.png",   flag: "⭐" },
  { label: "UEL",            slug: "europa-league",    color: "#f97316", logo: "https://media.api-sports.io/football/leagues/3.png",   flag: "🟠" },
  { label: "UECL",           slug: "conference-league",color: "#22c55e", logo: "https://media.api-sports.io/football/leagues/848.png", flag: "🟢" },
  { label: "FA Cup",         slug: "fa-cup",           color: "#ef4444", logo: "https://media.api-sports.io/football/leagues/45.png",  flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
];

function CompRail() {
  const [ref, vis] = useReveal(0.05);
  return (
    <section style={{ padding: "0 0 80px", background: T.bg }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px" }}>
        <div ref={ref} style={{
          opacity: vis ? 1 : 0,
          transform: vis ? "translateY(0)" : "translateY(14px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
          marginBottom: 20,
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.18em", color: T.muted, textTransform: "uppercase", marginBottom: 5 }}>— Competitions</div>
            <h2 style={{ fontSize: "clamp(18px,2.5vw,26px)", fontWeight: 900, fontFamily: "'Sora',sans-serif", letterSpacing: "-0.02em", color: T.text, margin: 0 }}>
              9 competitions covered
            </h2>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {COMPS.map((c, i) => <CompTile key={c.slug} comp={c} index={i} />)}
        </div>
      </div>
    </section>
  );
}

function CompTile({ comp, index }) {
  const [hov, setHov] = useState(false);
  const [ref, vis] = useReveal(0.05);
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translateY(0)" : "translateY(10px)",
      transition: `opacity 0.4s ease ${index * 35}ms, transform 0.4s ease ${index * 35}ms`,
    }}>
      <Link to={`/predictions/${comp.slug}`} style={{ textDecoration: "none" }}>
        <div
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 16px",
            borderRadius: 12,
            background: hov ? `${comp.color}10` : T.card,
            border: `1px solid ${hov ? comp.color + "38" : T.border}`,
            cursor: "pointer",
            transform: hov ? "translateY(-2px)" : "translateY(0)",
            boxShadow: hov ? `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${comp.color}14` : "none",
            transition: "all 0.16s ease",
          }}
        >
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: `${comp.color}14`,
            border: `1px solid ${comp.color}22`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <img src={comp.logo} width={20} height={20} style={{ objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: hov ? T.text : "rgba(255,255,255,0.6)", whiteSpace: "nowrap", transition: "color 0.15s" }}>
            {comp.label}
          </span>
        </div>
      </Link>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 6. FPL COMMAND — terminal-style list
// ══════════════════════════════════════════════════════════════
const FPL_TOOLS = [
  { to: "/best-team",          label: "Best XI",            stat: "Optimal 11",          color: T.green  },
  { to: "/squad-builder",      label: "Squad Builder",      stat: "15-man squad",        color: T.blue   },
  { to: "/gameweek-insights",  label: "GW Insights",        stat: "This gameweek",       color: T.amber  },
  { to: "/fpl-table",          label: "FPL Table",          stat: "Live standings",      color: T.purple },
  { to: "/captaincy",          label: "Captaincy",          stat: "Captain picks",       color: T.orange },
  { to: "/fixture-difficulty", label: "Fixture Difficulty", stat: "FDR heatmap",         color: T.cyan   },
  { to: "/transfer-planner",   label: "Transfer Planner",   stat: "Plan your moves",     color: T.red    },
  { to: "/differentials",      label: "Differentials",      stat: "Low-owned picks",     color: "#f472b6" },
];

function FPLCommand() {
  const [ref, vis] = useReveal(0.05);
  return (
    <section style={{ padding: "0 0 100px", background: T.bg }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>

          {/* Left: header */}
          <div ref={ref} style={{
            opacity: vis ? 1 : 0,
            transform: vis ? "translateX(0)" : "translateX(-16px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.18em", color: T.muted, textTransform: "uppercase", marginBottom: 10 }}>
              — Fantasy Premier League
            </div>
            <h2 style={{ fontSize: "clamp(22px,3vw,36px)", fontWeight: 900, fontFamily: "'Sora',sans-serif", letterSpacing: "-0.03em", color: T.text, margin: "0 0 16px", lineHeight: 1.05 }}>
              8 FPL tools.<br />
              <span style={{ color: T.green }}>One command.</span>
            </h2>
            <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.7, maxWidth: 320, margin: "0 0 32px" }}>
              From squad selection to differential hunting — every FPL decision backed by data.
            </p>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 999,
              background: "rgba(40,217,122,0.07)",
              border: "1px solid rgba(40,217,122,0.2)",
              fontSize: 11, fontWeight: 800, color: T.green,
              fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: "0.04em",
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green }} />
              FPL INTEL SUITE
            </div>
          </div>

          {/* Right: tool list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {FPL_TOOLS.map((tool, i) => (
              <FPLRow key={tool.to} tool={tool} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FPLRow({ tool, index }) {
  const [hov, setHov] = useState(false);
  const [ref, vis] = useReveal(0.05);
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? "translateX(0)" : "translateX(16px)",
      transition: `opacity 0.4s ease ${index * 45}ms, transform 0.4s ease ${index * 45}ms`,
    }}>
      <Link to={tool.to} style={{ textDecoration: "none" }}>
        <div
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "11px 14px",
            borderRadius: 10,
            background: hov ? `${tool.color}0a` : "rgba(255,255,255,0.018)",
            border: `1px solid ${hov ? tool.color + "28" : "rgba(255,255,255,0.042)"}`,
            cursor: "pointer",
            transform: hov ? "translateX(4px)" : "translateX(0)",
            transition: "all 0.15s ease",
          }}
        >
          {/* Index number */}
          <span style={{
            fontSize: 9, fontWeight: 900, color: T.dim,
            fontFamily: "'JetBrains Mono',monospace",
            minWidth: 16, flexShrink: 0,
          }}>
            {String(index + 1).padStart(2, "0")}
          </span>
          {/* Dot */}
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: tool.color,
            flexShrink: 0,
            boxShadow: hov ? `0 0 10px ${tool.color}` : "none",
            transition: "box-shadow 0.15s",
          }} />
          {/* Label */}
          <span style={{
            fontSize: 12, fontWeight: 800, color: hov ? T.text : "rgba(255,255,255,0.65)",
            flex: 1, transition: "color 0.15s",
          }}>
            {tool.label}
          </span>
          {/* Stat */}
          <span style={{ fontSize: 9, fontWeight: 700, color: T.dim }}>
            {tool.stat}
          </span>
          {/* Arrow */}
          <div style={{ color: hov ? tool.color : "transparent", transition: "color 0.15s" }}>
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M2 4.5h5M4.5 2l2.5 2.5L4.5 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </Link>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// DIVIDER
// ══════════════════════════════════════════════════════════════
function Div() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto 0", padding: "0 40px" }}>
      <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${T.border}, transparent)` }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════
export default function HomePage() {
  const [fixtures, setFixtures] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch(`${API}/api/matches/upcoming`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const raw = d.matches || d.chips || [];
        setFixtures(raw.map(c => ({
          fixture_id:  c.fixture_id,
          home_team:   c.home_team,
          away_team:   c.away_team,
          home_logo:   c.home_logo,
          away_logo:   c.away_logo,
          home_score:  c.home_score ?? null,
          away_score:  c.away_score ?? null,
          status:      c.status,
          minute:      c.minute,
          kickoff:     c.kickoff || c.date,
          league_id:   c.league_id,
          league_name: c.league_name || c.league,
          p_home_win:  c.p_home_win ?? null,
          p_draw:      c.p_draw     ?? null,
          p_away_win:  c.p_away_win ?? null,
          confidence:  c.confidence ?? null,
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <style>{`
        @keyframes hp3-up       { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes hp3-fadeinhalf { from{opacity:0} to{opacity:0.45} }
        @keyframes hp3-pulse    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.6)} }
        @keyframes hp3-shimmer  { 0%{opacity:.3} 50%{opacity:.7} 100%{opacity:.3} }
        @keyframes hp3-ticker   { from{transform:translateX(0)} to{transform:translateX(-33.333%)} }
        @keyframes hp3-bounce   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(5px)} }
        @media (max-width:768px){
          .hp3-tool-grid { grid-template-columns: repeat(2,1fr) !important; }
          .hp3-fpl-split { grid-template-columns: 1fr !important; }
        }
        @media (max-width:520px){
          .hp3-tool-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'Inter','Sora',system-ui,sans-serif" }}>
        <CinematicHero fixtures={fixtures} loading={loading} />
        <LivePulse fixtures={fixtures} />
        <div style={{ height: 80 }} />
        <ToolGrid />
        <Div />
        <div style={{ height: 80 }} />
        <TodaySlate fixtures={fixtures} />
        <Div />
        <div style={{ height: 80 }} />
        <CompRail />
        <Div />
        <div style={{ height: 80 }} />
        <FPLCommand />
      </div>
    </>
  );
}