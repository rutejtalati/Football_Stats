// HomePage.jsx — StatinSite v3 · Premium Analytics Dashboard
// Single /api/home/dashboard fetch powers every section.
import { Link } from "react-router-dom";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ─────────────────────────────────────────────────────────────
   DESIGN SYSTEM
   ───────────────────────────────────────────────────────────── */
const T = {
  // Colours
  navy:    "#05080f",
  panel:   "rgba(8,13,24,0.96)",
  glass:   "rgba(255,255,255,0.028)",
  border:  "rgba(255,255,255,0.072)",
  borderHi:"rgba(255,255,255,0.14)",
  blue:    "#4f9eff",
  green:   "#00e09e",
  red:     "#ff4d6d",
  gold:    "#f2c94c",
  purple:  "#b388ff",
  orange:  "#ff8c42",
  teal:    "#2dd4bf",
  pink:    "#f472b6",
  text:    "#ddeeff",
  muted:   "#3d5a78",
  dim:     "#1a2d42",
  // Shadows / glows
  gB:  (c,s=22) => `0 0 ${s}px ${c}44`,
  // Typography
  mono: "'JetBrains Mono',monospace",
  head: "'Sora','DM Sans',sans-serif",
  body: "'Outfit','DM Sans',sans-serif",
};

const FDR_COL = { 1:"#00e09e", 2:"#7cc97c", 3:"#f2c94c", 4:"#ff8c42", 5:"#ff4d6d" };

/* ─────────────────────────────────────────────────────────────
   CSS — all animations defined once
   ───────────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;700;800&family=Outfit:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  @keyframes tickerRoll  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes fadeUp      { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn      { from{opacity:0} to{opacity:1} }
  @keyframes scaleIn     { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
  @keyframes barFill     { from{width:0} to{width:var(--w)} }
  @keyframes barFillH    { from{height:0} to{height:var(--h)} }
  @keyframes shimmer     { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
  @keyframes pulseDot    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.6)} }
  @keyframes chipZoom    { 0%{transform:scale(1)} 40%{transform:scale(1.12)} 100%{transform:scale(1)} }
  @keyframes orb1        { 0%{transform:translate(0,0)} 50%{transform:translate(30px,-18px)} 100%{transform:translate(0,0)} }
  @keyframes orb2        { 0%{transform:translate(0,0)} 50%{transform:translate(-22px,24px)} 100%{transform:translate(0,0)} }
  @keyframes pitchPulse  { 0%,100%{opacity:.032} 50%{opacity:.065} }
  @keyframes countUp     { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ringPulse   { 0%{box-shadow:0 0 0 0 rgba(79,158,255,.55)} 70%{box-shadow:0 0 0 10px transparent} 100%{box-shadow:0 0 0 0 transparent} }
  @keyframes heatReveal  { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
  @keyframes sectionSlide{ from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }

  .hp3-card {
    transition: transform 220ms cubic-bezier(.22,1,.36,1),
                box-shadow 220ms ease,
                border-color 220ms ease;
  }
  .hp3-card:hover { transform: translateY(-4px); }

  .hp3-prob-bar {
    height: 100%;
    border-radius: 3px;
    width: var(--w, 0%);
    animation: barFill 900ms cubic-bezier(.22,1,.36,1) both;
    animation-delay: var(--d, 0ms);
  }

  .hp3-section {
    opacity: 0;
    transform: translateY(32px);
    transition: opacity 600ms ease, transform 600ms cubic-bezier(.22,1,.36,1);
  }
  .hp3-section.visible {
    opacity: 1;
    transform: translateY(0);
  }

  .hp3-skel {
    background: linear-gradient(90deg,
      rgba(255,255,255,0.04) 0%,
      rgba(255,255,255,0.09) 50%,
      rgba(255,255,255,0.04) 100%);
    background-size: 400px 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 8px;
  }

  .ticker-chip:hover { animation: chipZoom 300ms ease forwards; }
  .ticker-wrap:hover .ticker-track { animation-play-state: paused; }
`;

/* ─────────────────────────────────────────────────────────────
   API
   ───────────────────────────────────────────────────────────── */
const API = import.meta?.env?.VITE_API_URL ?? "";
let _dashCache = null;
let _dashCacheAt = 0;
const CACHE_MS = 60_000;

const FALLBACK_ENDPOINTS = [
  "top_predictions","model_edges","trending_players","form_table",
  "featured_fixtures","model_confidence","title_race","transfer_brief",
  "tactical_insight","model_metrics","power_rankings","xg_leaders",
  "value_players","high_scoring_matches","defense_table",
  "differential_captains","analytics_term","recent_results",
];

async function fetchDashboard() {
  const now = Date.now();
  if (_dashCache && now - _dashCacheAt < CACHE_MS) return _dashCache;
  // Try single dashboard endpoint first
  try {
    const r = await fetch(`${API}/api/home/dashboard`);
    if (r.ok) {
      const d = await r.json();
      _dashCache = d; _dashCacheAt = now;
      return d;
    }
  } catch {}
  // Fallback: parallel individual fetches
  try {
    const results = await Promise.allSettled(
      FALLBACK_ENDPOINTS.map(ep =>
        fetch(`${API}/api/home/${ep}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    );
    const d = {};
    FALLBACK_ENDPOINTS.forEach((ep, i) => {
      d[ep] = results[i].status === "fulfilled" ? results[i].value : null;
    });
    _dashCache = d; _dashCacheAt = now;
    return d;
  } catch {}
  return null;
}

function useDashboard() {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    fetchDashboard().then(data => { if (live) { setD(data); setLoading(false); } });
    return () => { live = false; };
  }, []);
  return { d, loading };
}

/* ─────────────────────────────────────────────────────────────
   HOOKS
   ───────────────────────────────────────────────────────────── */
function useVisible(threshold = 0.15) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, vis];
}

function useCountUp(target, ms = 1200, delay = 0, active = true) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf;
    const start = performance.now() + delay;
    const tick = (now) => {
      const t = Math.min(Math.max(now - start, 0) / ms, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setV(Math.round(ease * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, delay, active]);
  return v;
}

function useIsMobile(bp = 768) {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < bp : false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", h, { passive: true });
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return m;
}

/* ─────────────────────────────────────────────────────────────
   PRIMITIVES
   ───────────────────────────────────────────────────────────── */
function Skel({ w = "100%", h = 16, r = 6, style = {} }) {
  return <div className="hp3-skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

function SectionLabel({ children, color = T.blue, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <div style={{ width: 3, height: 20, borderRadius: 2, background: color, boxShadow: T.gB(color, 12), flexShrink: 0 }} />
      {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
      <span style={{ fontSize: 10, fontWeight: 800, color, letterSpacing: "0.14em", fontFamily: T.body, textTransform: "uppercase" }}>
        {children}
      </span>
    </div>
  );
}

function SectionHeading({ title, sub, color = T.blue, cta, ctaTo }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
      <div>
        <div style={{ width: 32, height: 3, borderRadius: 2, background: color, marginBottom: 10, boxShadow: T.gB(color, 10) }} />
        <h2 style={{ margin: 0, fontSize: "clamp(18px,2.2vw,24px)", fontWeight: 900, color: T.text, fontFamily: T.head, letterSpacing: "-0.02em" }}>{title}</h2>
        {sub && <p style={{ margin: "4px 0 0", fontSize: 12, color: T.muted, fontFamily: T.body }}>{sub}</p>}
      </div>
      {cta && ctaTo && (
        <Link to={ctaTo} style={{ fontSize: 11, fontWeight: 700, color, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontFamily: T.body, opacity: 0.85 }}>
          {cta}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
      )}
    </div>
  );
}

function Section({ children, style = {} }) {
  const [ref, vis] = useVisible();
  return (
    <section
      ref={ref}
      className={`hp3-section${vis ? " visible" : ""}`}
      style={{ maxWidth: 1240, margin: "0 auto", padding: "0 20px 64px", ...style }}
    >
      {children}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────
   BACKGROUND — animated pitch grid + floating orbs
   ───────────────────────────────────────────────────────────── */
function Background() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      {/* Deep gradient */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(79,158,255,0.09) 0%, transparent 70%)" }} />
      {/* Floating orbs */}
      {[
        [T.blue,   0.05, "-8%",  "5%",   "68s"],
        [T.green,  0.04, "72%",  "52%",  "82s"],
        [T.purple, 0.04, "40%",  "-8%",  "74s"],
        [T.gold,   0.03, "18%",  "68%",  "90s"],
      ].map(([c, op, l, t, dur], i) => (
        <div key={i} style={{
          position: "absolute", width: 600, height: 600, borderRadius: "50%",
          left: l, top: t, background: c, opacity: op, filter: "blur(130px)",
          animation: `orb${(i % 2) + 1} ${dur} ease-in-out infinite`,
          animationDelay: `${i * 10}s`,
        }} />
      ))}
      {/* Pitch SVG */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", animation: "pitchPulse 8s ease-in-out infinite" }}
        viewBox="0 0 1400 700" preserveAspectRatio="xMidYMid slice">
        <rect x="30" y="20" width="1340" height="660" rx="8" fill="none" stroke="white" strokeWidth="1.2" opacity=".5" />
        <line x1="700" y1="20" x2="700" y2="680" stroke="white" strokeWidth=".8" opacity=".5" />
        <circle cx="700" cy="350" r="90" fill="none" stroke="white" strokeWidth=".8" opacity=".5" />
        <circle cx="700" cy="350" r="4" fill="white" opacity=".4" />
        <rect x="30" y="210" width="120" height="280" fill="none" stroke="white" strokeWidth=".8" opacity=".5" />
        <rect x="1250" y="210" width="120" height="280" fill="none" stroke="white" strokeWidth=".8" opacity=".5" />
        <rect x="30" y="262" width="54" height="176" fill="none" stroke="white" strokeWidth=".8" opacity=".4" />
        <rect x="1316" y="262" width="54" height="176" fill="none" stroke="white" strokeWidth=".8" opacity=".4" />
        <circle cx="270" cy="350" r="3" fill="white" opacity=".4" />
        <circle cx="1130" cy="350" r="3" fill="white" opacity=".4" />
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LIVE TICKER
   ───────────────────────────────────────────────────────────── */
const TICKER_FB = [
  { label: "Model accuracy", value: "64%",  col: T.green  },
  { label: "Haaland xG/90", value: "0.82",  col: T.gold   },
  { label: "Arsenal win prob",value:"68%",  col: T.blue   },
  { label: "PPDA elite",     value: "≤7.0", col: T.teal   },
  { label: "PSxG top GK",    value: "+0.21",col: T.purple },
  { label: "Over 2.5 avg",   value: "54%",  col: T.orange },
  { label: "Palmer xA/90",   value: "0.31", col: T.pink   },
  { label: "Salah xG/90",    value: "0.74", col: T.gold   },
  { label: "BTTS rate",       value: "58%",  col: T.teal   },
  { label: "Liverpool xG+",  value: "+0.62",col: T.red    },
];

function LiveTicker({ d }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
  const [minute, setMinute] = useState(new Date().getMinutes());

  useEffect(() => {
    const t = setInterval(() => setMinute(new Date().getMinutes()), 15000);
    return () => clearInterval(t);
  }, []);

  const rawItems = useMemo(() => {
    if (d?.trending_players?.items?.length) {
      return d.trending_players.items.map(p => ({ label: p.label, value: p.value, col: p.col }));
    }
    const mc = d?.model_confidence;
    const extras = mc ? [{ label: "Confidence avg", value: `${mc.avg_confidence}%`, col: T.green }] : [];
    return [...extras, ...TICKER_FB];
  }, [d]);

  const items = [...rawItems, ...rawItems]; // doubled for seamless loop

  return (
    <div style={{
      position: "fixed", top: 48, left: 0, right: 0, zIndex: 190,
      borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`,
      background: "rgba(5,8,15,0.92)", backdropFilter: "blur(20px)",
      overflow: "hidden", padding: "0",
    }} className="ticker-wrap">
      {/* Fade edges */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 80, background: "linear-gradient(to right,rgba(5,8,15,.98),transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80, background: "linear-gradient(to left,rgba(5,8,15,.98),transparent)", zIndex: 2, pointerEvents: "none" }} />

      {/* Live indicator */}
      <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 3, display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, animation: "pulseDot 1.8s ease infinite", boxShadow: `0 0 8px ${T.green}` }} />
        <span style={{ fontSize: 8, fontWeight: 900, color: T.green, letterSpacing: "0.12em", fontFamily: T.body }}>LIVE</span>
        <span style={{ fontSize: 8, color: T.muted, fontFamily: T.mono }}>{minute}'</span>
      </div>

      <div className="ticker-track" style={{ display: "flex", width: "max-content", animation: "tickerRoll 48s linear infinite", paddingLeft: 80 }}>
        {items.map((item, i) => (
          <div
            key={i}
            className="ticker-chip"
            onMouseEnter={(e) => {
              setHoveredIdx(i % rawItems.length);
              const r = e.currentTarget.getBoundingClientRect();
              setPreviewPos({ x: r.left + r.width / 2, y: r.bottom + 6 });
            }}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 22px", borderRight: `1px solid ${T.border}`,
              flexShrink: 0, cursor: "default",
            }}
          >
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: item.col, boxShadow: `0 0 7px ${item.col}`, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: T.muted, fontFamily: T.body, fontWeight: 600, whiteSpace: "nowrap" }}>{item.label}</span>
            <span style={{ fontSize: 11, fontWeight: 900, color: item.col, fontFamily: T.mono, whiteSpace: "nowrap" }}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* Hover preview card */}
      {hoveredIdx !== null && rawItems[hoveredIdx] && (
        <div style={{
          position: "fixed", left: previewPos.x, top: previewPos.y,
          transform: "translateX(-50%)", zIndex: 999,
          background: T.panel, border: `1px solid ${rawItems[hoveredIdx].col}44`,
          borderRadius: 10, padding: "10px 14px", minWidth: 140,
          boxShadow: `0 16px 40px rgba(0,0,0,.7), 0 0 0 1px ${rawItems[hoveredIdx].col}22`,
          animation: "scaleIn 180ms ease both", pointerEvents: "none",
        }}>
          <div style={{ fontSize: 9, color: T.muted, fontFamily: T.body, marginBottom: 4 }}>{rawItems[hoveredIdx].label}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: rawItems[hoveredIdx].col, fontFamily: T.mono, lineHeight: 1 }}>{rawItems[hoveredIdx].value}</div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   HERO — large prediction card with heatmap on hover
   ───────────────────────────────────────────────────────────── */
function HeroMatchCard({ d, loading }) {
  const [hov, setHov] = useState(false);
  const [ref, vis] = useVisible(0.1);
  const pred = d?.top_predictions?.predictions?.[0];

  const homeProb = pred?.homeProb ?? 62;
  const drawProb = pred?.draw    ?? 20;
  const awayProb = pred?.awayProb ?? 18;
  const xgh      = pred?.xg_home ?? 1.72;
  const xga      = pred?.xg_away ?? 0.88;
  const confPct  = pred?.conf_pct ?? 71;

  const homeV = useCountUp(homeProb, 1000, 300, vis);
  const drawV = useCountUp(drawProb, 1000, 400, vis);
  const awayV = useCountUp(awayProb, 1000, 500, vis);
  const xghV  = useCountUp(Math.round(xgh * 100), 900, 200, vis);
  const xgaV  = useCountUp(Math.round(xga * 100), 900, 250, vis);
  const confV = useCountUp(confPct, 800, 600, vis);

  const confCol = confPct >= 70 ? T.green : confPct >= 55 ? T.gold : T.orange;

  if (loading && !pred) {
    return (
      <div ref={ref} style={{ borderRadius: 24, border: `1px solid ${T.border}`, padding: 32, background: T.glass }}>
        <Skel h={200} r={12} />
      </div>
    );
  }

  const home = pred?.home ?? "Arsenal";
  const away = pred?.away ?? "Man City";

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="hp3-card"
      style={{
        position: "relative", borderRadius: 24, overflow: "hidden",
        border: `1px solid ${hov ? T.blue + "55" : T.border}`,
        background: hov
          ? "linear-gradient(135deg,rgba(8,13,24,0.99),rgba(79,158,255,0.06))"
          : T.panel,
        boxShadow: hov ? `0 32px 80px rgba(0,0,0,.7), 0 0 0 1px ${T.blue}22` : "0 8px 32px rgba(0,0,0,.4)",
        transition: "all 300ms cubic-bezier(.22,1,.36,1)",
        cursor: "pointer",
        animation: vis ? "scaleIn 500ms ease both" : "none",
      }}
    >
      {/* Accent line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${T.blue},${T.green},${T.purple})` }} />

      {/* Pitch heatmap overlay on hover */}
      <div style={{
        position: "absolute", inset: 0, opacity: hov ? 1 : 0,
        transition: "opacity 400ms ease",
        background: "radial-gradient(ellipse 70% 50% at 38% 50%, rgba(79,158,255,0.12) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 68% 50%, rgba(0,224,158,0.09) 0%, transparent 60%)",
        animation: hov ? "heatReveal 400ms ease both" : "none",
        pointerEvents: "none",
      }} />
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: hov ? 0.07 : 0.025, transition: "opacity 400ms", pointerEvents: "none" }}
        viewBox="0 0 800 360" preserveAspectRatio="xMidYMid slice">
        <rect x="8" y="8" width="784" height="344" rx="4" fill="none" stroke="white" strokeWidth="1.2" />
        <line x1="400" y1="8" x2="400" y2="352" stroke="white" strokeWidth=".8" />
        <circle cx="400" cy="180" r="52" fill="none" stroke="white" strokeWidth=".8" />
        <rect x="8" y="110" width="72" height="140" fill="none" stroke="white" strokeWidth=".8" />
        <rect x="720" y="110" width="72" height="140" fill="none" stroke="white" strokeWidth=".8" />
      </svg>

      <div style={{ position: "relative", zIndex: 1, padding: "28px 32px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, animation: "pulseDot 2s ease infinite", boxShadow: `0 0 10px ${T.green}` }} />
            <span style={{ fontSize: 9, fontWeight: 900, color: T.green, letterSpacing: "0.16em", fontFamily: T.body }}>TOP PREDICTION</span>
          </div>
          {pred?.league && <span style={{ fontSize: 10, color: T.muted, fontFamily: T.body }}>{pred.league}</span>}
          {pred?.kickoff && <span style={{ fontSize: 10, color: T.muted, fontFamily: T.mono }}>{pred.kickoff}</span>}
        </div>

        {/* Teams */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "clamp(20px,3.5vw,36px)", fontWeight: 900, color: T.text, fontFamily: T.head, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{home}</div>
            <div style={{ fontSize: 10, color: T.muted, fontFamily: T.body, marginTop: 4 }}>Home</div>
          </div>
          <div style={{ textAlign: "center", flex: 1, padding: "0 20px" }}>
            <div style={{
              fontSize: "clamp(16px,2.5vw,28px)", fontWeight: 900, fontFamily: T.mono,
              color: T.text, letterSpacing: "0.1em",
              textShadow: hov ? `0 0 24px ${T.blue}88` : "none", transition: "text-shadow 300ms",
            }}>{pred?.score ?? "2-1"}</div>
            <div style={{ fontSize: 9, color: T.muted, fontFamily: T.body, letterSpacing: "0.08em", marginTop: 4 }}>PREDICTED</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "clamp(20px,3.5vw,36px)", fontWeight: 900, color: T.text, fontFamily: T.head, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{away}</div>
            <div style={{ fontSize: 10, color: T.muted, fontFamily: T.body, marginTop: 4 }}>Away</div>
          </div>
        </div>

        {/* Probability bars */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 2, height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 10 }}>
            {vis && [
              { prob: homeProb, col: T.blue,  d: "0ms"   },
              { prob: drawProb, col: T.gold,  d: "80ms"  },
              { prob: awayProb, col: T.purple, d: "160ms" },
            ].map((b, i) => (
              <div key={i} className="hp3-prob-bar" style={{
                "--w": `${b.prob}%`, "--d": b.d,
                background: b.col, opacity: 0.85,
              }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {[
              [homeV + "%", T.blue,   "Home Win"],
              [drawV + "%", T.gold,   "Draw"],
              [awayV + "%", T.purple, "Away Win"],
            ].map(([v, c, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: c, fontFamily: T.mono, lineHeight: 1, textShadow: T.gB(c) }}>{v}</div>
                <div style={{ fontSize: 8, color: T.muted, fontFamily: T.body, letterSpacing: "0.06em", marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics row */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "xG Home",    val: (xghV / 100).toFixed(2), col: T.blue   },
            { label: "xG Away",    val: (xgaV / 100).toFixed(2), col: T.purple },
            { label: "Confidence", val: confV + "%",              col: confCol  },
          ].map(({ label, val, col }) => (
            <div key={label} style={{
              flex: 1, minWidth: 90, padding: "10px 14px", borderRadius: 12,
              background: `${col}0e`, border: `1px solid ${col}28`, textAlign: "center",
            }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: col, fontFamily: T.mono, lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 8, color: T.muted, fontFamily: T.body, letterSpacing: "0.08em", marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PREDICTION CARDS (smaller grid)
   ───────────────────────────────────────────────────────────── */
function PredCard({ p, i }) {
  const [ref, vis] = useVisible(0.1);
  const [hov, setHov] = useState(false);
  const hw = useCountUp(p.homeProb, 800, i * 80, vis);
  const dw = useCountUp(p.draw, 800, i * 80 + 60, vis);
  const aw = useCountUp(p.awayProb, 800, i * 80 + 120, vis);
  const confCol = p.conf === "High" || p.conf === "high" ? T.green : p.conf === "Medium" || p.conf === "medium" ? T.gold : T.orange;
  const col = p.col || T.blue;

  return (
    <Link ref={ref} to={p.fixture_id ? `/match-preview/${p.fixture_id}` : "/predictions/premier-league"} style={{ textDecoration: "none" }}>
      <div
        className="hp3-card"
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          background: hov ? `linear-gradient(135deg,rgba(8,13,24,0.99),${col}0c)` : T.glass,
          border: `1px solid ${hov ? col + "44" : T.border}`,
          borderRadius: 16, padding: "16px 18px", position: "relative", overflow: "hidden",
          boxShadow: hov ? `0 16px 40px rgba(0,0,0,.5), ${T.gB(col)}` : "none",
          animation: vis ? `fadeUp 400ms ${i * 60}ms ease both` : "none",
          opacity: vis ? 1 : 0,
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${col}66,transparent)` }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.text, fontFamily: T.head }}>{p.home}</span>
          <span style={{ fontSize: 9, color: T.muted, background: T.glass, padding: "2px 7px", borderRadius: 999, border: `1px solid ${T.border}`, fontFamily: T.body }}>vs</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.text, fontFamily: T.head }}>{p.away}</span>
        </div>
        <div style={{ display: "flex", height: 5, borderRadius: 3, overflow: "hidden", gap: 1, marginBottom: 10 }}>
          {vis && [
            { flex: p.homeProb, c: T.blue },
            { flex: p.draw, c: T.gold },
            { flex: p.awayProb, c: T.purple },
          ].map((b, j) => (
            <div key={j} className="hp3-prob-bar" style={{ "--w": `${b.flex}%`, "--d": `${j * 60}ms`, flex: b.flex, height: "100%", background: b.c, opacity: 0.85, width: "unset" }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 10 }}>
            {[[hw + "%", T.blue, "H"], [dw + "%", T.gold, "D"], [aw + "%", T.purple, "A"]].map(([v, c, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: c, fontFamily: T.mono }}>{v}</div>
                <div style={{ fontSize: 8, color: T.muted }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: col, fontFamily: T.mono }}>{p.score}</div>
            <div style={{ fontSize: 8, fontWeight: 800, color: confCol, background: `${confCol}14`, border: `1px solid ${confCol}30`, padding: "1px 6px", borderRadius: 999, marginTop: 2, display: "inline-block" }}>
              {typeof p.conf === "string" ? p.conf.charAt(0).toUpperCase() + p.conf.slice(1).toLowerCase() : p.conf} conf.
            </div>
          </div>
        </div>
        {p.kickoff && (
          <div style={{ marginTop: 8, fontSize: 9, color: T.muted, fontFamily: T.mono }}>{p.kickoff} {p.time}</div>
        )}
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────
   POWER RANKINGS
   ───────────────────────────────────────────────────────────── */
function PowerRankingCard({ team, rank, vis }) {
  const col = rank === 1 ? T.gold : rank <= 3 ? T.blue : T.muted;
  const barW = team.power_pct ?? 0;
  return (
    <Link to={`/team/${team.team_id}`} style={{ textDecoration: "none" }}>
      <div className="hp3-card" style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 14px", borderRadius: 12,
        background: T.glass, border: `1px solid ${T.border}`,
        animation: vis ? `fadeUp 350ms ${rank * 50}ms ease both` : "none",
        opacity: vis ? 1 : 0,
      }}>
        <span style={{ width: 24, textAlign: "center", fontSize: 13, fontWeight: 900, color: col, fontFamily: T.mono }}>{rank}</span>
        {team.logo && <img src={team.logo} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />}
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.body }}>{team.team_name}</span>
        <div style={{ display: "flex", gap: 3, marginRight: 8 }}>
          {(team.form_letters || []).slice(-5).map((c, j) => (
            <div key={j} style={{
              width: 14, height: 14, borderRadius: 3, fontSize: 7, fontWeight: 900,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: c === "W" ? `${T.green}22` : c === "D" ? `${T.gold}22` : `${T.red}22`,
              color: c === "W" ? T.green : c === "D" ? T.gold : T.red,
              border: `1px solid ${c === "W" ? T.green : c === "D" ? T.gold : T.red}33`,
            }}>{c}</div>
          ))}
        </div>
        <div style={{ textAlign: "right", minWidth: 70 }}>
          <div style={{ height: 4, borderRadius: 2, background: T.dim, overflow: "hidden", marginBottom: 3 }}>
            <div className="hp3-prob-bar" style={{ "--w": `${barW}%`, background: col, height: "100%", borderRadius: 2 }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 800, color: col, fontFamily: T.mono }}>{barW}%</span>
        </div>
        {team.rank_delta !== 0 && (
          <span style={{ fontSize: 9, fontWeight: 800, color: team.rank_delta > 0 ? T.green : T.red, minWidth: 20, textAlign: "center" }}>
            {team.rank_delta > 0 ? `↑${team.rank_delta}` : `↓${Math.abs(team.rank_delta)}`}
          </span>
        )}
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────
   TITLE RACE
   ───────────────────────────────────────────────────────────── */
function TitleRaceCard({ d, vis }) {
  const top4 = d?.top4 ?? [];
  return (
    <div style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: 20, padding: "20px 22px" }}>
      <SectionLabel color={T.gold} icon="🏆">Title Race</SectionLabel>
      {top4.map((t, i) => {
        const pts = t.points;
        const gap = t.gap_to_leader;
        const col = i === 0 ? T.gold : i === 1 ? "#c0c0c0" : T.blue;
        return (
          <div key={t.team_id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, animation: vis ? `fadeUp 350ms ${i * 70}ms ease both` : "none", opacity: vis ? 1 : 0 }}>
            <span style={{ width: 18, fontSize: 12, fontWeight: 900, color: col, fontFamily: T.mono }}>{i + 1}</span>
            {t.logo && <img src={t.logo} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />}
            <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: T.text, fontFamily: T.body, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.team_name}</span>
            <div style={{ height: 5, width: 80, borderRadius: 3, background: T.dim, overflow: "hidden" }}>
              <div className="hp3-prob-bar" style={{ "--w": `${100 - gap * 8}%`, background: col, height: "100%", borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 900, color: col, fontFamily: T.mono, minWidth: 28, textAlign: "right" }}>{pts}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   xG LEADERS
   ───────────────────────────────────────────────────────────── */
function XGLeaderRow({ p, rank, vis }) {
  const col = rank === 1 ? T.gold : rank <= 3 ? T.green : T.blue;
  return (
    <Link to={`/player/${p.player_id}`} style={{ textDecoration: "none" }}>
      <div className="hp3-card" style={{
        display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
        borderRadius: 10, background: T.glass, border: `1px solid ${T.border}`,
        animation: vis ? `fadeUp 300ms ${rank * 50}ms ease both` : "none",
        opacity: vis ? 1 : 0,
      }}>
        <span style={{ width: 20, fontSize: 11, fontWeight: 900, color: col, fontFamily: T.mono, textAlign: "center" }}>{rank}</span>
        {p.photo && <img src={p.photo} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: `1px solid ${col}44` }} onError={e => e.target.style.display = "none"} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.text, fontFamily: T.head, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
          <div style={{ fontSize: 9, color: T.muted }}>{p.team}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: col, fontFamily: T.mono, lineHeight: 1 }}>{p.g_plus_a}</div>
          <div style={{ fontSize: 8, color: T.muted }}>G+A</div>
        </div>
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────
   VALUE PLAYERS
   ───────────────────────────────────────────────────────────── */
const POS_COL = { GK: T.gold, DEF: T.blue, MID: T.green, FWD: T.red };
function ValuePlayerCard({ p, i, vis }) {
  const [hov, setHov] = useState(false);
  const col = POS_COL[p.position] || T.blue;
  return (
    <Link to={`/player/${p.player_id}`} style={{ textDecoration: "none" }}>
      <div
        className="hp3-card"
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          padding: "14px 16px", borderRadius: 14,
          background: hov ? `linear-gradient(135deg,rgba(8,13,24,.99),${col}0c)` : T.glass,
          border: `1px solid ${hov ? col + "44" : T.border}`,
          animation: vis ? `fadeUp 350ms ${i * 60}ms ease both` : "none",
          opacity: vis ? 1 : 0,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: col, background: `${col}18`, border: `1px solid ${col}33`, padding: "2px 6px", borderRadius: 999 }}>{p.position}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: T.text, fontFamily: T.mono }}>£{p.cost}m</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 2, fontFamily: T.head, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
        <div style={{ fontSize: 9, color: T.muted, marginBottom: 10 }}>{p.team_short}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: col, fontFamily: T.mono, lineHeight: 1 }}>{p.value_score}</span>
          <span style={{ fontSize: 9, color: T.muted }}>pts/£m</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: T.muted }}>
          <span>{p.total_points} pts</span>
          <span>{p.ownership}% owned</span>
        </div>
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────
   CAPTAIN PICKS
   ───────────────────────────────────────────────────────────── */
function CaptainCard({ p, rank, vis }) {
  const [hov, setHov] = useState(false);
  const rankColors = [T.gold, "#c0c0c0", "#cd7f32"];
  const rc = rank <= 3 ? rankColors[rank - 1] : T.muted;
  return (
    <Link to={`/player/${p.player_id}`} style={{ textDecoration: "none" }}>
      <div
        className="hp3-card"
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "12px 16px", borderRadius: 14,
          background: hov ? `linear-gradient(135deg,rgba(8,13,24,.99),${T.gold}08)` : T.glass,
          border: `1px solid ${hov ? T.gold + "33" : T.border}`,
          animation: vis ? `fadeUp 350ms ${rank * 50}ms ease both` : "none",
          opacity: vis ? 1 : 0,
        }}
      >
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${rc}18`, border: `2px solid ${rc}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: rc, fontFamily: T.mono, flexShrink: 0 }}>{rank}</div>
        {p.photo
          ? <img src={p.photo} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: `2px solid ${T.gold}33`, flexShrink: 0 }} onError={e => e.target.style.display = "none"} />
          : <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${T.gold}18`, border: `2px solid ${T.gold}22`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: T.text, fontFamily: T.head, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
          <div style={{ fontSize: 9, color: T.muted }}>{p.team} · £{p.cost}m · {p.ownership}% owned</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: T.gold, fontFamily: T.mono, lineHeight: 1 }}>{p.captain_score?.toFixed(1)}</div>
          <div style={{ fontSize: 8, color: T.muted }}>CAP SCORE</div>
          <div style={{ fontSize: 9, color: T.dim, marginTop: 2 }}>EP {p.ep_next?.toFixed(2)}</div>
        </div>
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────
   FIXTURE DIFFICULTY MINI-HEATMAP
   ───────────────────────────────────────────────────────────── */
function MiniHeatmap({ d, vis }) {
  const teams = (d?.fixture_difficulty?.teams || []).slice(0, 8);
  const gws   = d?.fixture_difficulty?.gws   || [];
  if (!teams.length) return null;

  return (
    <div style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: 20, padding: "20px 22px", overflow: "hidden" }}>
      <SectionLabel color={T.teal} icon="🗓">Fixture Runs</SectionLabel>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 300 }}>
          <thead>
            <tr>
              <th style={{ fontSize: 8, color: T.muted, fontWeight: 700, padding: "4px 10px 4px 0", textAlign: "left", fontFamily: T.body, whiteSpace: "nowrap" }}>Team</th>
              {gws.slice(0, 5).map(gw => (
                <th key={gw} style={{ fontSize: 8, color: T.muted, fontWeight: 700, padding: "4px 5px", textAlign: "center", fontFamily: T.mono }}>GW{gw}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((team, i) => (
              <tr key={team.team_id} style={{ animation: vis ? `fadeUp 300ms ${i * 40}ms ease both` : "none", opacity: vis ? 1 : 0 }}>
                <td style={{ fontSize: 11, fontWeight: 700, color: T.text, padding: "3px 10px 3px 0", whiteSpace: "nowrap", fontFamily: T.body }}>{team.short || team.short_name}</td>
                {gws.slice(0, 5).map(gw => {
                  const cell = team.fixtures?.[gw];
                  const col  = cell ? FDR_COL[cell.difficulty] || T.muted : T.dim;
                  return (
                    <td key={gw} title={cell ? `${cell.opp} ${cell.home ? "(H)" : "(A)"} FDR${cell.difficulty}` : "BGW"} style={{ padding: "3px 5px", textAlign: "center" }}>
                      <div style={{ width: 36, height: 22, borderRadius: 5, background: `${col}22`, border: `1px solid ${col}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: col, fontFamily: T.body, margin: "0 auto", cursor: "default" }}>
                        {cell ? `${cell.opp.slice(0, 3)}${cell.home ? "H" : "A"}` : "—"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link to="/fixture-difficulty" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 14, fontSize: 11, fontWeight: 700, color: T.teal, textDecoration: "none", fontFamily: T.body }}>
        Full heatmap →
      </Link>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MODEL PERFORMANCE CHART
   ───────────────────────────────────────────────────────────── */
function ModelPerfChart({ d, vis }) {
  const mm    = d?.model_metrics ?? {};
  const trend = mm.trend ?? [];
  const mkts  = mm.by_market ?? [
    { l: "Match Result", v: 64, col: T.green },
    { l: "BTTS",         v: 71, col: T.blue  },
    { l: "Over 2.5",     v: 68, col: T.gold  },
    { l: "Correct Score",v: 38, col: T.purple},
  ];
  const avg   = mm.overall_accuracy ?? 64;
  const maxAcc = Math.max(...trend.map(t => t.acc ?? t.accuracy ?? 0), 1);

  return (
    <div style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: 20, padding: "20px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <SectionLabel color={T.green} icon="📊">Model Accuracy</SectionLabel>
        <Link to="/model-performance" style={{ fontSize: 10, color: T.green, textDecoration: "none", fontFamily: T.body }}>Details →</Link>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80, marginBottom: 16 }}>
        {trend.map((t, i) => {
          const acc = t.acc ?? t.accuracy ?? 0;
          const col = acc >= 70 ? T.green : acc >= 60 ? T.gold : T.orange;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
              <span style={{ fontSize: 8, fontWeight: 800, color: col, fontFamily: T.mono }}>{acc}%</span>
              <div style={{
                width: "100%", borderRadius: "3px 3px 0 0",
                background: col, opacity: 0.8,
                height: vis ? `${(acc / maxAcc) * 85}%` : "0%",
                transition: `height 700ms ${i * 80}ms cubic-bezier(.22,1,.36,1)`,
              }} />
              <span style={{ fontSize: 7, color: T.muted, fontFamily: T.mono }}>{t.gw}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {mkts.map((m, i) => (
          <div key={m.l}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: T.text, fontFamily: T.body }}>{m.l}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: m.col, fontFamily: T.mono }}>{m.v}%</span>
            </div>
            <div style={{ height: 3, borderRadius: 2, background: T.dim }}>
              <div style={{ height: "100%", borderRadius: 2, background: m.col, width: vis ? `${m.v}%` : "0%", transition: `width 800ms ${200 + i * 100}ms cubic-bezier(.22,1,.36,1)`, boxShadow: T.gB(m.col, 8) }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   RECENT RESULTS / ACCOUNTABILITY
   ───────────────────────────────────────────────────────────── */
function RecentResults({ d, vis }) {
  const rows = d?.recent_results?.results ?? [];
  const correct = d?.recent_results?.correct ?? rows.filter(r => r.correct === true).length;
  const total   = d?.recent_results?.total   ?? rows.filter(r => r.correct != null).length;

  return (
    <div style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: 20, padding: "20px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <SectionLabel color={T.blue} icon="✓">Recent Predictions</SectionLabel>
        {total > 0 && (
          <span style={{ fontSize: 11, fontWeight: 800, color: T.green, background: `${T.green}14`, border: `1px solid ${T.green}30`, padding: "3px 10px", borderRadius: 999, fontFamily: T.mono }}>
            {correct}/{total} correct
          </span>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {rows.slice(0, 5).map((r, i) => {
          const isPending = r.correct == null;
          const bc = isPending ? T.muted : r.correct ? T.green : T.red;
          return (
            <Link key={i} to={r.fixture_id ? `/match-preview/${r.fixture_id}` : "/model-performance"} style={{ textDecoration: "none" }}>
              <div className="hp3-card" style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 10,
                background: `${bc}06`, border: `1px solid ${bc}18`,
                animation: vis ? `fadeUp 300ms ${i * 50}ms ease both` : "none",
                opacity: vis ? 1 : 0,
              }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${bc}20`, border: `1px solid ${bc}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0 }}>
                  {isPending ? "⏳" : r.correct ? "✓" : "✗"}
                </div>
                <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: T.text, fontFamily: T.body }}>{r.home} vs {r.away}</span>
                <span style={{ fontSize: 9, color: T.muted }}>{r.pred}</span>
                <span style={{ fontSize: 12, fontWeight: 900, color: bc, fontFamily: T.mono }}>{r.score}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   FOOTBALL INTEL (transfer brief, tactical insight, term)
   ───────────────────────────────────────────────────────────── */
function IntelCard({ title, col, icon, children, to }) {
  const [hov, setHov] = useState(false);
  const inner = (
    <div
      className="hp3-card"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: "18px 20px", borderRadius: 16, height: "100%",
        background: hov ? `linear-gradient(135deg,rgba(8,13,24,.99),${col}0c)` : T.glass,
        border: `1px solid ${hov ? col + "44" : T.border}`,
        boxShadow: hov ? `0 12px 36px rgba(0,0,0,.5), ${T.gB(col)}` : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: col, letterSpacing: "0.1em", fontFamily: T.body, textTransform: "uppercase" }}>{title}</span>
      </div>
      {children}
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: "none", display: "block" }}>{inner}</Link> : inner;
}

function AnalyticsTermCard({ d }) {
  const term = d?.analytics_term;
  if (!term) return null;
  const col = term.col || T.teal;
  return (
    <IntelCard title="Analytics Term" col={col} icon={term.icon || "📐"} to="/learn">
      <div style={{ fontSize: 20, fontWeight: 900, color: T.text, fontFamily: T.head, marginBottom: 6 }}>{term.short}</div>
      <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.65, margin: "0 0 12px", fontFamily: T.body }}>{(term.definition || "").slice(0, 120)}…</p>
      <div style={{ fontSize: 22, fontWeight: 900, color: col, fontFamily: T.mono, lineHeight: 1 }}>{term.example_value}</div>
      <div style={{ fontSize: 9, color: T.muted, fontFamily: T.body, marginTop: 2 }}>{term.example_unit}</div>
    </IntelCard>
  );
}

function TransferCard({ d }) {
  const tb = d?.transfer_brief ?? {};
  const col = T.orange;
  return (
    <IntelCard title="Transfer Brief" col={col} icon="📰" to="/news">
      {tb.summary
        ? <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.7, margin: 0, fontFamily: T.body }}>{tb.summary}</p>
        : <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.7, margin: 0, fontFamily: T.body }}>Loading transfer intelligence…</p>
      }
    </IntelCard>
  );
}

function TacticalCard({ d }) {
  const ti = d?.tactical_insight?.primary;
  const col = T.purple;
  return (
    <IntelCard title="Tactical Insight" col={col} icon="⚡">
      {ti
        ? (
          <>
            <div style={{ fontSize: 24, fontWeight: 900, color: col, fontFamily: T.mono, lineHeight: 1, marginBottom: 6 }}>{ti.stat}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 4, fontFamily: T.head }}>{ti.label} — {ti.player}</div>
            <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.65, margin: 0, fontFamily: T.body }}>{(ti.context || "").slice(0, 140)}…</p>
          </>
        )
        : <p style={{ fontSize: 12, color: T.muted, fontFamily: T.body }}>Loading tactical data…</p>
      }
    </IntelCard>
  );
}

/* ─────────────────────────────────────────────────────────────
   STAT TILES  (hero row)
   ───────────────────────────────────────────────────────────── */
function StatTile({ value, suffix = "", label, color, delay = 0, icon, trend, vis }) {
  const v = useCountUp(value, 1400, delay, vis);
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, minWidth: 0, padding: "18px 20px", borderRadius: 16,
        background: hov ? `linear-gradient(135deg,rgba(8,13,24,.98),${color}12)` : T.glass,
        border: `1px solid ${hov ? color + "55" : T.border}`,
        position: "relative", overflow: "hidden",
        transition: "all 220ms cubic-bezier(.22,1,.36,1)",
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hov ? `0 12px 32px ${color}22` : "none",
        animation: vis ? `fadeUp 500ms ${delay}ms ease both` : "none",
        opacity: vis ? 1 : 0,
      }}
    >
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: color, opacity: hov ? 0.12 : 0.04, filter: "blur(24px)", transition: "opacity 220ms", pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        {trend && <span style={{ fontSize: 8, fontWeight: 800, color: T.green, background: `${T.green}14`, border: `1px solid ${T.green}30`, padding: "2px 7px", borderRadius: 999 }}>{trend}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 4 }}>
        <span style={{ fontSize: 32, fontWeight: 900, fontFamily: T.mono, color, lineHeight: 1, textShadow: hov ? `0 0 24px ${color}88` : `0 0 12px ${color}44`, transition: "text-shadow 220ms" }}>{v.toLocaleString()}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color, opacity: 0.8 }}>{suffix}</span>
      </div>
      <div style={{ fontSize: 9, fontWeight: 800, color: T.muted, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: T.body }}>{label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN HOMEPAGE
   ───────────────────────────────────────────────────────────── */
export default function HomePage() {
  const { d, loading } = useDashboard();
  const isMobile = useIsMobile();
  const [statRef, statVis] = useVisible(0.1);

  const preds   = d?.top_predictions?.predictions ?? [];
  const heroP   = preds[0] ?? null;
  const gridP   = preds.slice(1, 4);
  const rankings= d?.power_rankings?.rankings ?? [];
  const xgList  = d?.xg_leaders?.leaders      ?? [];
  const valuePs = d?.value_players?.players   ?? [];
  const captains= d?.differential_captains?.captains ?? [];

  const accuracy = d?.model_metrics?.overall_accuracy ?? 64;

  return (
    <div style={{ minHeight: "100vh", background: T.navy, color: T.text, position: "relative", paddingTop: 80 }}>
      <style>{CSS}</style>
      <Background />

      {/* ── LIVE TICKER ── */}
      <LiveTicker d={d} />

      {/* ── HERO SECTION ── */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1240, margin: "0 auto", padding: "48px 20px 0" }}>
        {/* Hero headline */}
        <div style={{ marginBottom: 32, animation: "fadeUp 600ms ease both" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 999, background: "rgba(79,158,255,0.1)", border: `1px solid rgba(79,158,255,0.22)`, marginBottom: 16 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.blue, animation: "ringPulse 2s ease infinite" }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: T.blue, letterSpacing: "0.12em", fontFamily: T.body }}>FOOTBALL ANALYTICS PLATFORM</span>
          </div>
          <h1 style={{ fontSize: "clamp(32px,5vw,64px)", fontWeight: 900, margin: "0 0 8px", fontFamily: T.head, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            Where Football Meets<br />
            <span style={{ background: "linear-gradient(135deg,#4f9eff 0%,#00e09e 55%,#f2c94c 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Data Science</span>
          </h1>
          <p style={{ fontSize: "clamp(13px,1.8vw,17px)", color: T.muted, maxWidth: 580, margin: 0, lineHeight: 1.7, fontFamily: T.body }}>
            Predictions powered by Dixon-Coles, Elo, and xG models across 4 major leagues.
          </p>
        </div>

        {/* Hero grid: big card left, predictions right */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 360px", gap: 16, marginBottom: 16 }}>
          <HeroMatchCard d={d} loading={loading} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {loading && !preds.length
              ? Array.from({ length: 3 }).map((_, i) => <Skel key={i} h={110} r={16} />)
              : gridP.map((p, i) => <PredCard key={i} p={p} i={i} />)
            }
            <Link to="/predictions/premier-league" style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "12px", borderRadius: 14, background: T.glass, border: `1px solid ${T.border}`,
              fontSize: 12, fontWeight: 700, color: T.blue, textDecoration: "none", fontFamily: T.body,
            }}>
              All predictions →
            </Link>
          </div>
        </div>
      </div>

      {/* ── STAT TILES ── */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1240, margin: "0 auto", padding: "24px 20px 56px" }}>
        <div ref={statRef} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatTile value={4}        suffix=" leagues"  label="Leagues Covered"   color={T.blue}   delay={0}   icon="🌍" trend="↑ 2025" vis={statVis} />
          <StatTile value={380}      suffix="+"          label="Fixtures Predicted" color={T.green}  delay={100} icon="📊" trend="Season" vis={statVis} />
          <StatTile value={5000}     suffix="+"          label="Players Tracked"    color={T.gold}   delay={200} icon="👤" vis={statVis} />
          <StatTile value={3}        suffix=" models"   label="Prediction Models"  color={T.purple} delay={300} icon="🧠" trend="Active" vis={statVis} />
          <StatTile value={accuracy} suffix="%"          label="Match Accuracy"     color={T.teal}   delay={400} icon="🎯" trend="Avg"    vis={statVis} />
        </div>
      </div>

      {/* ── MODEL INSIGHTS ── */}
      <Section>
        <SectionHeading title="Model Insights" sub="Prediction engine performance and market edges" color={T.green} cta="Full report" ctaTo="/model-performance" />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          <ModelPerfChart d={d} vis={true} />
          <RecentResults d={d} vis={true} />
        </div>
      </Section>

      {/* ── TEAM ANALYTICS ── */}
      <Section>
        <SectionHeading title="Team Analytics" sub="Power rankings, defensive records, title race" color={T.blue} cta="All teams" ctaTo="/leagues" />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          {/* Power Rankings */}
          <div>
            <div style={{ marginBottom: 12 }}><SectionLabel color={T.blue} icon="⚡">Power Rankings</SectionLabel></div>
            {loading && !rankings.length
              ? Array.from({ length: 6 }).map((_, i) => <Skel key={i} h={40} r={12} style={{ marginBottom: 6 }} />)
              : rankings.slice(0, 6).map((t, i) => <div key={t.team_id} style={{ marginBottom: 6 }}><PowerRankingCard team={t} rank={i + 1} vis={true} /></div>)
            }
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <TitleRaceCard d={d} vis={true} />
            <MiniHeatmap d={d} vis={true} />
          </div>
        </div>
      </Section>

      {/* ── PLAYER ANALYTICS ── */}
      <Section>
        <SectionHeading title="Player Analytics" sub="xG leaders, value picks, trending performers" color={T.purple} cta="All players" ctaTo="/player" />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          {/* xG Leaders */}
          <div>
            <div style={{ marginBottom: 12 }}><SectionLabel color={T.gold} icon="⚽">xG Leaders</SectionLabel></div>
            {loading && !xgList.length
              ? Array.from({ length: 6 }).map((_, i) => <Skel key={i} h={44} r={10} style={{ marginBottom: 5 }} />)
              : xgList.slice(0, 6).map((p, i) => <div key={p.player_id} style={{ marginBottom: 5 }}><XGLeaderRow p={p} rank={i + 1} vis={true} /></div>)
            }
          </div>
          {/* Value Players */}
          <div>
            <div style={{ marginBottom: 12 }}><SectionLabel color={T.teal} icon="💎">Value Players</SectionLabel></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {loading && !valuePs.length
                ? Array.from({ length: 4 }).map((_, i) => <Skel key={i} h={120} r={14} />)
                : valuePs.slice(0, 4).map((p, i) => <ValuePlayerCard key={p.player_id} p={p} i={i} vis={true} />)
              }
            </div>
          </div>
        </div>
      </Section>

      {/* ── FANTASY INTELLIGENCE ── */}
      <Section>
        <SectionHeading title="Fantasy Intelligence" sub="Captain picks, differentials, fixture runs" color={T.gold} cta="FPL tools" ctaTo="/best-team" />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
          {/* Captain Picks */}
          <div>
            <div style={{ marginBottom: 12 }}><SectionLabel color={T.gold} icon="©">Captain Picks</SectionLabel></div>
            {loading && !captains.length
              ? Array.from({ length: 4 }).map((_, i) => <Skel key={i} h={56} r={14} style={{ marginBottom: 6 }} />)
              : captains.slice(0, 4).map((p, i) => <div key={p.player_id} style={{ marginBottom: 6 }}><CaptainCard p={p} rank={i + 1} vis={true} /></div>)
            }
            <div style={{ display:"flex", gap:12, marginTop:6, flexWrap:"wrap" }}>
              <Link to="/captaincy"    style={{ fontSize:11, fontWeight:700, color:T.gold,  textDecoration:"none", fontFamily:T.body }}>Captain tool →</Link>
              <Link to="/best-xi"      style={{ fontSize:11, fontWeight:700, color:T.blue,  textDecoration:"none", fontFamily:T.body }}>Best XI →</Link>
              <Link to="/differentials"style={{ fontSize:11, fontWeight:700, color:T.teal,  textDecoration:"none", fontFamily:T.body }}>Differentials →</Link>
              <Link to="/transfer-planner" style={{ fontSize:11, fontWeight:700, color:T.green, textDecoration:"none", fontFamily:T.body }}>Transfers →</Link>
            </div>
          </div>
          {/* Differentials + form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: 20, padding: "20px 22px" }}>
              <SectionLabel color={T.green} icon="🎯">Differentials</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(d?.differential_captains?.captains ?? []).slice(0, 3).map((p, i) => (
                  <Link key={p.player_id} to={`/player/${p.player_id}`} style={{ textDecoration: "none" }}>
                    <div className="hp3-card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: T.glass, border: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: POS_COL[p.position] || T.blue, background: `${POS_COL[p.position] || T.blue}18`, border: `1px solid ${POS_COL[p.position] || T.blue}33`, padding: "2px 6px", borderRadius: 999 }}>{p.position}</span>
                      <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: T.text, fontFamily: T.body }}>{p.name}</span>
                      <span style={{ fontSize: 9, color: T.muted }}>{p.ownership}% owned</span>
                      <span style={{ fontSize: 11, fontWeight: 900, color: T.green, fontFamily: T.mono }}>{p.form}</span>
                    </div>
                  </Link>
                ))}
              </div>
              <Link to="/differentials" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 12, fontSize: 11, fontWeight: 700, color: T.green, textDecoration: "none", fontFamily: T.body }}>Find differentials →</Link>
            </div>
            {/* Transfer planner CTA */}
            <Link to="/transfer-planner" style={{ textDecoration: "none" }}>
              <div className="hp3-card" style={{ background: `linear-gradient(135deg,rgba(8,13,24,.98),${T.blue}10)`, border: `1px solid ${T.blue}33`, borderRadius: 20, padding: "20px 22px" }}>
                <SectionLabel color={T.blue} icon="↔">Transfer Planner</SectionLabel>
                <p style={{ fontSize: 12, color: T.muted, margin: "0 0 12px", lineHeight: 1.65, fontFamily: T.body }}>EP-ranked transfer targets in and out based on upcoming fixtures, form, and value.</p>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: T.blue, fontFamily: T.body }}>
                  Open Transfer Planner →
                </div>
              </div>
            </Link>
          </div>
        </div>
      </Section>

      {/* ── FOOTBALL INTEL ── */}
      <Section>
        <SectionHeading title="Football Intel" sub="Transfers, tactics, and model reports" color={T.orange} />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
          <TransferCard  d={d} />
          <TacticalCard  d={d} />
          <AnalyticsTermCard d={d} />
        </div>
      </Section>

      {/* ── LATEST / HOW IT WORKS ── */}
      <Section>
        <div style={{ padding: "28px 32px", borderRadius: 20, background: T.glass, border: `1px solid ${T.border}`, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: 260, height: 180, background: "radial-gradient(circle at 100% 0%,rgba(79,158,255,0.07),transparent 70%)", pointerEvents: "none" }} />
          <h2 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 900, color: T.text, fontFamily: T.head, letterSpacing: "-0.02em" }}>How the models work</h2>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 18, fontFamily: T.body }}>
            {[
              ["Dixon-Coles Poisson", T.blue,   "Corrects for low-score bias in standard Poisson. Recalibrated every 48h from xG-adjusted team stats across all 5 leagues."],
              ["Elo Rating System",   T.gold,   "Rebuilt from scratch each season using actual results. Home advantage is treated as a contextual multiplier, not a constant."],
              ["xG Integration",     T.green,  "Goals scored are noisy. We weight team attack/defence using xG rates alongside actual goals to reduce luck amplification."],
              ["Monte Carlo Season", T.purple, "50,000 simulated seasons from current standings. Title, top-4, and relegation probabilities updated after every matchday."],
            ].map(([title, col, body]) => (
              <div key={title} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: T.text, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: col, flexShrink: 0, boxShadow: T.gB(col) }} />
                  {title}
                </div>
                <p style={{ margin: 0, fontSize: 11, color: T.muted, lineHeight: 1.7 }}>{body}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
            {["xG Model", "Poisson Distribution", "Dixon-Coles", "Elo Ratings", "Form Weighting", "Monte Carlo"].map(t => (
              <span key={t} style={{ fontSize: 9, fontWeight: 800, color: T.muted, background: T.glass, border: `1px solid ${T.border}`, padding: "3px 9px", borderRadius: 999, letterSpacing: "0.06em", fontFamily: T.body }}>{t}</span>
            ))}
          </div>
          <Link to="/learn" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 16, fontSize: 12, fontWeight: 700, color: T.pink, textDecoration: "none", fontFamily: T.body }}>
            Learn all the models in Ground Zero →
          </Link>
        </div>
      </Section>


      {/* ── LATEST ARTICLES ── */}
      <Section>
        <SectionHeading title="Latest Articles" sub="Analysis, tactics, and model deep-dives" color={T.pink} cta="All articles" ctaTo="/news" />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 14 }}>
          {[
            { tag: "Analysis",    col: T.gold,   title: "Haaland's xG returns to elite levels after injury layoff",                to: "/news" },
            { tag: "Tactics",     col: T.blue,   title: "Why Arsenal's PPDA is the best defensive pressing metric in Europe",       to: "/news" },
            { tag: "Fantasy",     col: T.green,  title: "FPL Gameweek transfer guide: differentials worth the risk this week",      to: "/news" },
            { tag: "Model",       col: T.purple, title: "Poisson vs Dixon-Coles: comparing prediction accuracy across 38 GWs",     to: "/news" },
            { tag: "Predictions", col: T.teal,   title: "La Liga title race: Elo model says it's closer than the table shows",      to: "/news" },
            { tag: "Learn",       col: T.pink,   title: "Ground Zero explainer: How to read a PSxG chart and what it means",        to: "/learn" },
          ].map((a, i) => (
            <Link key={i} to={a.to} style={{ textDecoration: "none" }}>
              <div
                className="hp3-card"
                style={{
                  background: T.glass, border: `1px solid ${T.border}`, borderRadius: 16,
                  padding: "18px 20px", height: "100%", display: "flex", flexDirection: "column",
                  animation: `fadeUp 500ms ${i * 70}ms ease both`,
                  position: "relative", overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${a.col}55,transparent)` }} />
                <span style={{
                  display: "inline-block", fontSize: 8, fontWeight: 800, letterSpacing: "0.1em",
                  padding: "2px 8px", borderRadius: 4, marginBottom: 10,
                  background: `${a.col}18`, border: `1px solid ${a.col}33`, color: a.col,
                  fontFamily: T.body, textTransform: "uppercase",
                }}>{a.tag}</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.55, flex: 1, fontFamily: T.body }}>
                  {a.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12, fontSize: 11, fontWeight: 700, color: a.col, fontFamily: T.body }}>
                  Read more
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* ── LEAGUES STRIP ── */}
      <Section>
        <div style={{ padding: "24px 28px", borderRadius: 20, background: T.glass, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ margin: "0 0 4px", fontSize: 10, color: T.muted, fontFamily: T.body, letterSpacing: "0.1em", textTransform: "uppercase" }}>Covering 4 top leagues</p>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: T.text, fontFamily: T.head }}>Pick your league</h3>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { to: "/predictions/premier-league", name: "Premier League", col: "#4f9eff", flag: <svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#012169" /><path d="M0 0l18 13M18 0L0 13" stroke="white" strokeWidth="3" /><path d="M0 0l18 13M18 0L0 13" stroke="#C8102E" strokeWidth="1.8" /><path d="M9 0v13M0 6.5h18" stroke="white" strokeWidth="4" /><path d="M9 0v13M0 6.5h18" stroke="#C8102E" strokeWidth="2.4" /></svg> },
              { to: "/predictions/la-liga", name: "La Liga", col: "#ff6b35", flag: <svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#AA151B" /><rect y="2.8" width="18" height="7.4" fill="#F1BF00" /></svg> },
              { to: "/predictions/serie-a", name: "Serie A", col: "#00e09e", flag: <svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#009246" /><rect x="6" width="6" height="13" fill="white" /><rect x="12" width="6" height="13" fill="#CE2B37" /></svg> },
              { to: "/predictions/ligue-1", name: "Ligue 1", col: "#b388ff", flag: <svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#002395" /><rect x="6" width="6" height="13" fill="white" /><rect x="12" width="6" height="13" fill="#ED2939" /></svg> },
            ].map(({ to, name, col, flag }) => (
              <Link key={to} to={to} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 12,
                background: col + "12", border: `1.5px solid ${col}35`, color: col,
                fontSize: 12, fontWeight: 700, textDecoration: "none", fontFamily: T.body,
                transition: "all 150ms ease",
              }}>
                <span style={{ display: "flex", alignItems: "center", borderRadius: 2, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.4)" }}>{flag}</span>
                {name}
              </Link>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}