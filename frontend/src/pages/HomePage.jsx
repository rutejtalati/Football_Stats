// HomePage.jsx — StatinSite · Neobrutalist Edition
// Design DNA: #e8ff47 yellow on #0a0a0a black. Thick borders, offset shadows,
// fill-from-bottom hovers, Bebas Neue display, DM Mono data font.
// All backend data wiring preserved exactly.

import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { mapDashboard } from "../utils/homeDataMappers";

const API = import.meta.env.VITE_API_URL || "";

/* ── Responsive hook ─────────────────────────────────────── */
function useIsMobile(bp = 640) {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < bp : false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return m;
}

/* ── Design tokens — neobrutalist palette ─────────────────── */
const Y  = "#e8ff47";   // primary yellow
const K  = "#0a0a0a";   // near-black
const R  = "#ff2744";   // red accent (live)
const W  = "#f5f5f0";   // off-white text
const DIM = "rgba(232,255,71,0.38)"; // dimmed yellow

/* Legacy C tokens mapped to neo equivalents (keeps sub-components working) */
const C = {
  blue:   Y,    blueGlow:  "rgba(232,255,71,0.35)",
  green:  Y,    greenGlow: "rgba(232,255,71,0.28)",
  red:    R,    redGlow:   "rgba(255,39,68,0.28)",
  gold:   Y,    goldGlow:  "rgba(232,255,71,0.28)",
  purple: Y,    purpleGlow:"rgba(232,255,71,0.28)",
  orange: R,    teal: Y,   pink: R,
  panel:  "#111111",
  line:   "rgba(232,255,71,0.12)",
  text:   W,
  muted:  "rgba(232,255,71,0.45)",
  soft:   "#1a1a1a",
};

/* ── Global CSS ──────────────────────────────────────────── */
const HOME_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;700;900&family=DM+Mono:wght@400;500&display=swap');

  @keyframes neoFadeDown  { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes neoFadeUp    { from{opacity:0;transform:translateY(12px)}  to{opacity:1;transform:translateY(0)} }
  @keyframes neoCardIn    { from{opacity:0;transform:translateY(18px)}  to{opacity:1;transform:translateY(0)} }
  @keyframes neoPulse     { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.55)} }
  @keyframes neoWiggle    { 0%,100%{transform:rotate(0deg)} 20%{transform:rotate(-3deg)} 70%{transform:rotate(3deg)} }
  @keyframes neoBarGrow   { from{width:0} to{width:var(--w)} }
  @keyframes neoHeightGrow{ from{height:0} to{height:var(--h)} }
  @keyframes neoShimmer   { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
  @keyframes neoBgStripes { to{background-position:60px 0;} }
  @keyframes neoDotFloat  { 0%{transform:translateY(0)} 50%{transform:translateY(-14px)} 100%{transform:translateY(0)} }

  /* Card hovers — slide up 4px */
  .hp-card { transition:all 200ms cubic-bezier(0.22,1,0.36,1); }
  .hp-card:hover { transform:translateY(-4px) !important; }

  /* Button hovers — offset shadow grows */
  .hp-btn  { transition:all 140ms ease; cursor:pointer; }
  .hp-btn:hover { transform:translate(-2px,-2px); }

  /* Neo bg stripes */
  .neo-bg-stripes {
    position:fixed;inset:0;z-index:0;pointer-events:none;
    background:repeating-linear-gradient(88deg,transparent 0,transparent 55px,rgba(232,255,71,0.025) 55px,rgba(232,255,71,0.025) 56px);
    animation:neoBgStripes 22s linear infinite;
  }
`;

/* ── Animated count-up (unchanged logic) ─────────────────── */
function useCountUp(target, duration = 1800, delay = 0) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; obs.disconnect();
      const start = performance.now() + delay;
      const tick = now => {
        const elapsed = Math.max(0, now - start);
        const pct = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - pct, 3);
        setVal(Math.round(ease * target));
        if (pct < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration, delay]);
  return [val, ref];
}

/* ── Stat tile — neobrutalist ─────────────────────────────── */
function StatTile({ value, suffix = "", label, sublabel, color, delay = 0, svg, trend }) {
  const [v, ref] = useCountUp(value, 1600, delay);
  const [hov, setHov] = useState(false);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", flexDirection: "column", gap: 10,
        padding: "22px 24px",
        background: hov ? Y : K,
        border: `3px solid ${Y}`,
        boxShadow: hov ? `6px 6px 0 ${Y}` : `4px 4px 0 rgba(232,255,71,0.3)`,
        flex: 1, minWidth: 0, position: "relative", overflow: "hidden",
        transition: "all 180ms cubic-bezier(0.22,1,0.36,1)",
        transform: hov ? "translate(-2px,-2px)" : "translate(0,0)",
        cursor: "default",
      }}
    >
      {/* Corner accent */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: 0, height: 0,
        borderStyle: "solid",
        borderWidth: "0 32px 32px 0",
        borderColor: `transparent ${hov ? R : Y} transparent transparent`,
        opacity: 0.5,
        transition: "border-color 180ms",
      }}/>

      {/* Icon + trend */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ color: hov ? K : Y, opacity: 1, transition: "color 180ms" }}>{svg}</div>
        {trend && (
          <span style={{
            fontSize: 9, fontWeight: 900,
            color: hov ? K : Y,
            background: hov ? "rgba(10,10,10,0.15)" : "rgba(232,255,71,0.12)",
            border: `1px solid ${hov ? "rgba(10,10,10,0.25)" : "rgba(232,255,71,0.3)"}`,
            padding: "2px 8px", letterSpacing: "0.06em",
            fontFamily: "'DM Mono', monospace",
            transition: "all 180ms",
          }}>{trend}</span>
        )}
      </div>

      {/* Big number */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <span style={{
          fontSize: 42, fontWeight: 900,
          fontFamily: "'Bebas Neue', sans-serif",
          color: hov ? K : Y,
          lineHeight: 1, letterSpacing: "0.02em",
          transition: "color 180ms",
        }}>{v.toLocaleString()}</span>
        <span style={{ fontSize: 20, fontWeight: 900, color: hov ? K : Y, transition: "color 180ms" }}>{suffix}</span>
      </div>

      {/* Label */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{
          fontSize: 9, fontWeight: 900,
          color: hov ? "rgba(10,10,10,0.6)" : DIM,
          letterSpacing: "0.18em", textTransform: "uppercase",
          fontFamily: "'DM Mono', monospace",
          transition: "color 180ms",
        }}>{label}</span>
        {sublabel && (
          <span style={{
            fontSize: 10, color: hov ? "rgba(10,10,10,0.5)" : DIM,
            fontFamily: "'DM Mono', monospace", lineHeight: 1.4,
            transition: "color 180ms",
          }}>{sublabel}</span>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{ height: 3, background: hov ? "rgba(10,10,10,0.2)" : "rgba(232,255,71,0.1)" }}>
        <div style={{
          height: "100%", background: hov ? K : Y,
          width: hov ? "100%" : "40%",
          transition: "width 600ms cubic-bezier(0.22,1,0.36,1)",
        }}/>
      </div>
    </div>
  );
}

/* ── Prediction strip — neobrutalist ─────────────────────── */
function PredictionStrip({ predictions = [] }) {
  if (predictions.length === 0) return null;

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 52px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 8, height: 8, background: Y, animation: "neoPulse 2s ease infinite" }}/>
          <span style={{
            fontSize: 12, fontWeight: 900, color: W,
            fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.18em", fontSize: 16,
          }}>TOP PREDICTIONS</span>
        </div>
        <Link to="/predictions/premier-league" style={{
          fontSize: 11, fontWeight: 700, color: Y,
          textDecoration: "none", fontFamily: "'DM Mono', monospace",
          display: "flex", alignItems: "center", gap: 5,
          border: `2px solid ${Y}`, padding: "5px 12px",
          transition: "all 0.12s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = Y; e.currentTarget.style.color = K; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = Y; }}
        >
          All fixtures →
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(255px, 1fr))", gap: 10 }}>
        {predictions.slice(0, 4).map((p, i) => {
          const confCol = p.conf === "high" ? Y : p.conf === "medium" ? Y : R;
          const confLabel = (p.conf || "").charAt(0).toUpperCase() + (p.conf || "").slice(1);
          return (
            <Link
              key={p.fixtureId || i}
              to={p.fixtureId ? `/match/${p.fixtureId}` : "/predictions/premier-league"}
              style={{ textDecoration: "none", display: "block" }}
              className="hp-card"
            >
              <div style={{
                background: K, border: `3px solid rgba(232,255,71,0.25)`,
                padding: "16px 18px", position: "relative", overflow: "hidden",
                transition: "border-color 200ms, box-shadow 200ms",
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = Y;
                  e.currentTarget.style.boxShadow = `5px 5px 0 ${Y}`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "rgba(232,255,71,0.25)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Top accent stripe */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: Y }}/>

                {/* Teams */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: W, fontFamily: "'Space Grotesk', sans-serif", flex: 1 }}>{p.home}</span>
                  <span style={{
                    fontSize: 8, fontWeight: 900, color: K,
                    background: Y, padding: "2px 8px",
                    letterSpacing: "0.1em", flexShrink: 0,
                    fontFamily: "'DM Mono', monospace",
                  }}>VS</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: W, fontFamily: "'Space Grotesk', sans-serif", flex: 1, textAlign: "right" }}>{p.away}</span>
                </div>

                {/* Win prob bar */}
                <div style={{ display: "flex", height: 6, overflow: "hidden", marginBottom: 12, gap: 2 }}>
                  <div style={{ flex: p.homeProb, background: Y }}/>
                  <div style={{ flex: p.draw, background: "rgba(232,255,71,0.3)" }}/>
                  <div style={{ flex: p.awayProb, background: R }}/>
                </div>

                {/* Percentages + score */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 14 }}>
                    {[[p.homeProb + "%", Y, "H"], [p.draw + "%", DIM, "D"], [p.awayProb + "%", R, "A"]].map(([v, c, l]) => (
                      <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: c, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}>{v}</span>
                        <span style={{ fontSize: 7, color: DIM, letterSpacing: "0.1em", fontFamily: "'DM Mono', monospace" }}>{l}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span style={{ fontSize: 20, fontWeight: 900, color: Y, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" }}>{p.score || "—"}</span>
                    <span style={{
                      fontSize: 7, fontWeight: 900, color: K,
                      background: confCol, padding: "2px 7px",
                      letterSpacing: "0.1em", fontFamily: "'DM Mono', monospace",
                    }}>{confLabel}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ── Model performance — neobrutalist ────────────────────── */
function ModelPerformance({ trend = [], byMarket = [], overallAccuracy = 0 }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  if (trend.length === 0 && byMarket.length === 0) return null;

  const maxAcc = Math.max(...trend.map(d => d.acc), 1);

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 64px" }} ref={ref}>
      <div style={{ display: "grid", gridTemplateColumns: byMarket.length > 0 ? "1fr 340px" : "1fr", gap: 10, alignItems: "stretch" }}>

        {/* Bar chart */}
        {trend.length > 0 && (
          <div style={{ background: K, border: `3px solid ${Y}`, padding: "24px 28px", boxShadow: `4px 4px 0 rgba(232,255,71,0.25)` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 8, fontWeight: 900, color: DIM, letterSpacing: "0.2em", marginBottom: 4, fontFamily: "'DM Mono',monospace" }}>MODEL ACCURACY</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: W, fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "0.1em" }}>Rolling Gameweeks</div>
              </div>
              {overallAccuracy > 0 && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 48, fontWeight: 900, fontFamily: "'Bebas Neue',sans-serif", color: Y, lineHeight: 1, letterSpacing: "0.04em" }}>{overallAccuracy}%</div>
                  <div style={{ fontSize: 8, color: DIM, letterSpacing: "0.14em", fontFamily: "'DM Mono',monospace" }}>OVERALL</div>
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
              {trend.map((d, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, height: "100%", justifyContent: "flex-end" }}>
                  <span style={{ fontSize: 9, fontWeight: 900, color: Y, fontFamily: "'DM Mono',monospace" }}>{d.acc}%</span>
                  <div style={{
                    width: "100%", background: Y,
                    height: visible ? `${(d.acc / maxAcc) * 90}%` : "0%",
                    transition: `height 700ms ${i * 80}ms cubic-bezier(0.22,1,0.36,1)`,
                    opacity: d.acc >= 70 ? 1 : 0.55,
                  }}/>
                  <span style={{ fontSize: 7.5, color: DIM, fontFamily: "'DM Mono',monospace" }}>{d.gw}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By market */}
        {byMarket.length > 0 && (
          <div style={{ background: K, border: `3px solid ${Y}`, padding: "24px", display: "flex", flexDirection: "column", gap: 14, justifyContent: "center", boxShadow: `4px 4px 0 rgba(232,255,71,0.25)` }}>
            <div style={{ fontSize: 8, fontWeight: 900, color: DIM, letterSpacing: "0.2em", fontFamily: "'DM Mono',monospace" }}>BY MARKET</div>
            {byMarket.map((m, i) => (
              <div key={m.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: W, fontFamily: "'Space Grotesk',sans-serif" }}>{m.label}</span>
                  <span style={{ fontSize: 20, fontWeight: 900, fontFamily: "'Bebas Neue',sans-serif", color: Y }}>{m.value}%</span>
                </div>
                <div style={{ height: 4, background: "rgba(232,255,71,0.08)" }}>
                  <div style={{
                    height: "100%", background: Y,
                    width: visible ? `${m.value}%` : "0%",
                    transition: `width 800ms ${200 + i * 120}ms cubic-bezier(0.22,1,0.36,1)`,
                  }}/>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Stat of moment — neobrutalist ────────────────────────── */
function StatOfMoment({ insight }) {
  if (!insight || !insight.stat || insight.stat === "—") return null;
  const s = insight;

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 52px" }}>
      <div style={{
        background: Y, border: `3px solid ${K}`,
        padding: "28px 36px",
        display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap",
        position: "relative", overflow: "hidden",
        boxShadow: `6px 6px 0 ${K}`,
      }}>
        {/* Diagonal pattern */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(10,10,10,0.04) 10px,rgba(10,10,10,0.04) 11px)",
        }}/>

        {/* Label */}
        <div style={{ position: "absolute", top: 14, left: 28, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, background: K, animation: "neoPulse 2s ease infinite" }}/>
          <span style={{ fontSize: 8, fontWeight: 900, color: K, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>STAT SPOTLIGHT</span>
        </div>

        {/* Big number */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 20, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <span style={{ fontSize: 72, fontWeight: 900, fontFamily: "'Bebas Neue',sans-serif", color: K, lineHeight: 1 }}>{s.stat}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: K, fontFamily: "'Space Grotesk',sans-serif" }}>{s.label}</div>
              <div style={{ fontSize: 12, color: "rgba(10,10,10,0.65)", fontWeight: 700, marginTop: 3, fontFamily: "'DM Mono',monospace" }}>{s.player}</div>
            </div>
          </div>
        </div>

        {/* Context */}
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <p style={{ fontSize: 14, color: "rgba(10,10,10,0.65)", lineHeight: 1.72, margin: 0, fontFamily: "'Space Grotesk',sans-serif" }}>{s.context}</p>
        </div>
      </div>
    </section>
  );
}

/* ── Recent results — neobrutalist ───────────────────────── */
function RecentResults({ results = [], correct = 0, total = 0 }) {
  if (results.length === 0) return null;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 64px" }}>
      <div style={{ background: K, border: `3px solid ${Y}`, padding: "24px 28px", boxShadow: `4px 4px 0 rgba(232,255,71,0.25)` }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 8, fontWeight: 900, color: DIM, letterSpacing: "0.2em", marginBottom: 5, fontFamily: "'DM Mono',monospace" }}>ACCOUNTABILITY</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: W, fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "0.08em" }}>Recent Predictions</div>
          </div>
          {total > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontSize: 44, fontWeight: 900, lineHeight: 1,
                fontFamily: "'Bebas Neue',sans-serif",
                color: pct >= 70 ? Y : pct >= 55 ? Y : R,
              }}>{pct}%</div>
              <div style={{ fontSize: 8, color: DIM, letterSpacing: "0.1em", marginTop: 2, fontFamily: "'DM Mono',monospace" }}>
                {correct}/{total} correct
              </div>
            </div>
          )}
        </div>

        {/* Result rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {results.map((r, i) => {
            const ok = r.correct === true;
            const bad = r.correct === false;
            const borderCol = ok ? Y : bad ? R : DIM;
            const icon = ok ? "✓" : bad ? "✗" : "·";

            return (
              <Link
                key={r.fixtureId || i}
                to={r.fixtureId ? `/match/${r.fixtureId}` : "/predictions/premier-league"}
                style={{ textDecoration: "none", display: "block" }}
              >
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "10px 14px",
                    background: "transparent",
                    border: `2px solid ${ok ? "rgba(232,255,71,0.2)" : bad ? "rgba(255,39,68,0.2)" : "rgba(232,255,71,0.08)"}`,
                    transition: "all 160ms",
                    position: "relative", overflow: "hidden",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = ok ? "rgba(232,255,71,0.06)" : bad ? "rgba(255,39,68,0.06)" : "rgba(232,255,71,0.03)";
                    e.currentTarget.style.borderColor = borderCol;
                    e.currentTarget.style.transform = "translateX(5px)";
                    e.currentTarget.style.boxShadow = `3px 0 0 ${borderCol}`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = ok ? "rgba(232,255,71,0.2)" : bad ? "rgba(255,39,68,0.2)" : "rgba(232,255,71,0.08)";
                    e.currentTarget.style.transform = "translateX(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 28, height: 28, flexShrink: 0,
                    background: ok ? Y : bad ? R : "rgba(232,255,71,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 900,
                    color: ok ? K : bad ? "#fff" : DIM,
                  }}>{icon}</div>

                  {/* Match info */}
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: W, minWidth: 130, fontFamily: "'Space Grotesk',sans-serif" }}>
                      {r.home} vs {r.away}
                    </span>
                    <span style={{ fontSize: 11, color: DIM, fontFamily: "'DM Mono',monospace" }}>
                      Pred: <b style={{ color: Y }}>{r.pred}</b>
                    </span>
                    {r.actual && r.actual !== "Pending" && (
                      <span style={{ fontSize: 11, color: DIM, fontFamily: "'DM Mono',monospace" }}>
                        Result: <b style={{ color: W }}>{r.actual}</b>
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Feature card — neobrutalist ─────────────────────────── */
function FeatureCard({ to, color, title, subtitle, description, badge, delay = 0 }) {
  const [hov, setHov] = useState(false);

  // Map color to neo palette
  const neoCol = Y;
  const cardColors = [Y, Y, Y, Y, Y, Y, Y, R]; // last two get red for variety
  const accent = badge === "NEW" || badge === "LAB" ? R : Y;

  return (
    <Link
      to={to}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="hp-card"
      style={{
        display: "flex", flexDirection: "column",
        background: hov ? Y : K,
        border: `3px solid ${hov ? K : "rgba(232,255,71,0.3)"}`,
        textDecoration: "none",
        boxShadow: hov ? `6px 6px 0 ${K}` : `3px 3px 0 rgba(232,255,71,0.15)`,
        animationDelay: delay + "ms", animation: "neoCardIn 500ms ease both",
        position: "relative", overflow: "hidden",
        transition: "background 180ms, border-color 180ms, box-shadow 180ms",
      }}
    >
      {/* Top accent */}
      <div style={{ height: 3, background: hov ? K : accent }}/>

      <div style={{ padding: "20px 22px 22px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Badge */}
        {badge && (
          <div style={{ marginBottom: 2 }}>
            <span style={{
              fontSize: 7.5, fontWeight: 900,
              color: hov ? "#fff" : K,
              background: hov ? K : accent,
              padding: "2px 8px", letterSpacing: "0.14em",
              fontFamily: "'DM Mono',monospace",
            }}>{badge}</span>
          </div>
        )}

        {/* Title */}
        <span style={{
          fontSize: 22, fontWeight: 900, color: hov ? K : W,
          fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "0.08em",
          transition: "color 180ms", lineHeight: 1.1,
        }}>{title}</span>

        {/* Description */}
        <p style={{
          fontSize: 12, color: hov ? "rgba(10,10,10,0.6)" : DIM,
          margin: 0, lineHeight: 1.65,
          fontFamily: "'Space Grotesk',sans-serif",
          transition: "color 180ms",
        }}>{description}</p>

        {/* Subtitle CTA */}
        <div style={{ marginTop: "auto", paddingTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: hov ? K : Y,
            fontFamily: "'DM Mono',monospace",
            transition: "color 180ms",
          }}>{subtitle}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            style={{ transform: hov ? "translateX(4px)" : "translateX(0)", transition: "transform 180ms" }}>
            <path d="M2 6h8M7 3l3 3-3 3" stroke={hov ? K : Y} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </Link>
  );
}

/* ── Inline ticker for homepage (backend trending) ───────── */
function HomeTicker({ items = [] }) {
  if (items.length === 0) return null;
  const doubled = [...items, ...items];
  return (
    <div style={{
      borderTop: `3px solid ${Y}`, borderBottom: `3px solid ${Y}`,
      background: K, overflow: "hidden", padding: "10px 0", position: "relative",
    }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 60, background: `linear-gradient(to right,${K},transparent)`, zIndex: 2, pointerEvents: "none" }}/>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 60, background: `linear-gradient(to left,${K},transparent)`, zIndex: 2, pointerEvents: "none" }}/>
      <div style={{ display: "flex", gap: 0, animation: "neoTkScroll 40s linear infinite", width: "max-content" }}>
        {doubled.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "0 22px",
            borderRight: `2px solid rgba(232,255,71,0.12)`, flexShrink: 0,
          }}>
            <div style={{ width: 6, height: 6, background: Y, flexShrink: 0 }}/>
            <span style={{ fontSize: 10, color: DIM, fontFamily: "'DM Mono',monospace", fontWeight: 600, whiteSpace: "nowrap" }}>{item.label}</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: Y, fontFamily: "'Bebas Neue',sans-serif", whiteSpace: "nowrap", letterSpacing: "0.06em" }}>{item.value}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes neoTkScroll { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }`}</style>
    </div>
  );
}

/* ── Feature cards data ───────────────────────────────────── */
const FEATURES = [
  { to:"/predictions/premier-league", color:C.blue,   title:"Match Predictions",  subtitle:"This week's fixtures →",  description:"Win probabilities, expected scorelines, and model confidence across 9 competitions.", badge:"LIVE" },
  { to:"/best-team",                  color:C.green,  title:"Best XI Builder",    subtitle:"Build your squad →",      description:"Optimal fantasy XI using composite scoring: fixtures, form, ICT index and season PPG.", badge:"FPL"  },
  { to:"/squad-builder",              color:C.gold,   title:"Squad Builder",      subtitle:"Plan transfers →",         description:"Full FPL squads with budget constraints. Best value picks, differentials and captain options.", badge:"FPL"  },
  { to:"/player",                     color:C.purple, title:"Player Insight",     subtitle:"Analyse any player →",    description:"Deep statistical profiles with form trends and fixture difficulty across the season.", badge:"STATS"},
  { to:"/gameweek-insights",          color:C.orange, title:"GW Insights",        subtitle:"This gameweek →",         description:"FDR, captain picks, differential watchlist and injury news all in one place.", badge:"FPL"  },
  { to:"/fpl-table",                  color:C.red,    title:"Player Stats Table", subtitle:"Full stats table →",      description:"Sortable stats for all players. Filter by position, team, price. Find hidden gems.", badge:"STATS"},
  { to:"/games",                      color:C.teal,   title:"Sports Arcade",      subtitle:"Play games →",            description:"Penalty shootouts, analytics quizzes, 2048 and more. Learn stats through play.", badge:"NEW"  },
  { to:"/learn",                      color:C.pink,   title:"Ground Zero",        subtitle:"Explore methodology →",   description:"How the platform thinks. Research lab, model transparency, and the science behind forecasting.", badge:"LAB"  },
];

/* ── Leagues data (unchanged) ─────────────────────────────── */
const LEAGUES = [
  {to:"/predictions/premier-league",name:"Premier League",col:"#e8ff47",flag:<svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#012169"/><path d="M0 0l18 13M18 0L0 13" stroke="white" strokeWidth="3"/><path d="M0 0l18 13M18 0L0 13" stroke="#C8102E" strokeWidth="1.8"/><path d="M9 0v13M0 6.5h18" stroke="white" strokeWidth="4"/><path d="M9 0v13M0 6.5h18" stroke="#C8102E" strokeWidth="2.4"/></svg>},
  {to:"/predictions/la-liga",name:"La Liga",col:"#e8ff47",flag:<svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#AA151B"/><rect y="2.8" width="18" height="7.4" fill="#F1BF00"/></svg>},
  {to:"/predictions/serie-a",name:"Serie A",col:"#e8ff47",flag:<svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#009246"/><rect x="6" width="6" height="13" fill="white"/><rect x="12" width="6" height="13" fill="#CE2B37"/></svg>},
  {to:"/predictions/bundesliga",name:"Bundesliga",col:"#e8ff47",flag:<svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#000"/><rect y="4.33" width="18" height="4.34" fill="#DD0000"/><rect y="8.67" width="18" height="4.33" fill="#FFCC00"/></svg>},
  {to:"/predictions/ligue-1",name:"Ligue 1",col:"#e8ff47",flag:<svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#002395"/><rect x="6" width="6" height="13" fill="white"/><rect x="12" width="6" height="13" fill="#ED2939"/></svg>},
  {to:"/predictions/champions-league",name:"UCL",col:"#e8ff47",flag:<span style={{fontSize:14}}>🏆</span>},
  {to:"/predictions/europa-league",name:"UEL",col:"#e8ff47",flag:<span style={{fontSize:14}}>🥈</span>},
  {to:"/predictions/conference-league",name:"UECL",col:"#e8ff47",flag:<span style={{fontSize:14}}>🥉</span>},
  {to:"/predictions/fa-cup",name:"FA Cup",col:"#e8ff47",flag:<span style={{fontSize:14}}>🏆</span>},
];

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function HomePage() {
  const isMobile = useIsMobile();
  const [d, setD] = useState(null);
  const [raw, setRaw] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`${API}/api/home/dashboard`);
        if (!res.ok) throw new Error("fail");
        const j = await res.json();
        if (!alive) return;
        setD(mapDashboard(j));
        setRaw(j);
      } catch {
        if (alive) { setD(mapDashboard(null)); setRaw({}); }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, []);

  /* ── Skeleton loader — neobrutalist ── */
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: K, padding: "80px 20px 0" }}>
        <style>{`
          @keyframes neoShimmerSlide {
            0%   { background-position: -600px 0; }
            100% { background-position:  600px 0; }
          }
          .nsk {
            background: linear-gradient(90deg, rgba(232,255,71,0.03) 25%, rgba(232,255,71,0.09) 50%, rgba(232,255,71,0.03) 75%);
            background-size: 600px 100%;
            animation: neoShimmerSlide 1.4s infinite linear;
            border: 2px solid rgba(232,255,71,0.1);
          }
        `}</style>
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", marginBottom: 48 }}>
          <div className="nsk" style={{ height: 24, width: 200, margin: "0 auto 24px" }}/>
          <div className="nsk" style={{ height: 68, width: "90%", margin: "0 auto 12px" }}/>
          <div className="nsk" style={{ height: 68, width: "60%", margin: "0 auto 24px" }}/>
          <div className="nsk" style={{ height: 16, width: "80%", margin: "0 auto 8px" }}/>
          <div className="nsk" style={{ height: 16, width: "65%", margin: "0 auto 36px" }}/>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            {[130, 120, 110, 100].map((w, i) => (
              <div key={i} className="nsk" style={{ height: 44, width: w, animationDelay: `${i * 0.1}s` }}/>
            ))}
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: "0 auto 48px", display: "flex", gap: 10 }}>
          {[1, 2, 3].map(i => <div key={i} className="nsk" style={{ flex: 1, height: 100, animationDelay: `${i * 0.08}s` }}/>)}
        </div>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="nsk" style={{ height: 190, animationDelay: `${i * 0.06}s` }}/>)}
        </div>
      </div>
    );
  }

  const predictions = (d?.predictions?.predictions) || [];
  const tickerItems = (d?.trendingPlayers?.items) || [];
  const insight = (d?.tacticalInsight?.primary) || null;
  const trend = (d?.modelMetrics?.trend) || [];
  const byMarket = (d?.modelMetrics?.byMarket) || [];
  const overallAcc = (d?.modelMetrics?.overallAccuracy) || 0;
  const results = (d?.recentResults?.results) || [];
  const resCorrect = (d?.recentResults?.correct) || 0;
  const resTotal = (d?.recentResults?.total) || 0;
  const hs = d?.heroStats || {};
  const fixturesPred = hs.fixturesPredicted || 0;
  const verifiedAcc = hs.verifiedAccuracy || 0;

  return (
    <div style={{ minHeight: "100vh", background: K, overflow: "hidden" }}>
      <style>{HOME_CSS}</style>

      {/* Animated bg stripes */}
      <div className="neo-bg-stripes"/>

      {/* ── HERO ── */}
      <section style={{ position: "relative", padding: "80px 20px 64px", maxWidth: 1200, margin: "0 auto", overflow: "hidden" }}>

        {/* Big decorative circle — neo style */}
        <div style={{
          position: "absolute", top: -80, right: -80,
          width: 400, height: 400, borderRadius: "50%",
          border: `3px solid rgba(232,255,71,0.08)`,
          pointerEvents: "none",
          animation: "neoDotFloat 10s ease-in-out infinite",
        }}/>
        <div style={{
          position: "absolute", top: 0, right: 60,
          width: 200, height: 200, borderRadius: "50%",
          border: `8px solid rgba(255,39,68,0.06)`,
          pointerEvents: "none",
          animation: "neoDotFloat 14s ease-in-out infinite reverse",
        }}/>

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Eyebrow */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "5px 14px",
            background: Y, border: `2px solid ${K}`,
            marginBottom: 28,
            animation: "neoFadeDown 500ms ease both",
            boxShadow: `3px 3px 0 ${K}`,
          }}>
            <div style={{ width: 7, height: 7, background: R, animation: "neoPulse 1.6s ease infinite" }}/>
            <span style={{ fontSize: 10, fontWeight: 900, color: K, letterSpacing: "0.16em", fontFamily: "'DM Mono',monospace" }}>FOOTBALL INTELLIGENCE PLATFORM</span>
          </div>

          {/* H1 */}
          <h1 style={{
            fontSize: "clamp(54px,9vw,120px)", fontWeight: 900, color: W,
            margin: "0 0 6px",
            fontFamily: "'Bebas Neue',sans-serif",
            letterSpacing: "0.06em", lineHeight: 0.95,
            animation: "neoFadeDown 600ms 80ms ease both",
          }}>
            Read the<br/>
            <span style={{
              WebkitTextStroke: `2px ${Y}`,
              WebkitTextFillColor: "transparent",
              color: Y,
            }}>Game</span>
          </h1>

          <p style={{
            fontSize: "clamp(13px,1.8vw,16px)", color: DIM, maxWidth: 520,
            margin: "20px 0 0",
            lineHeight: 1.72, fontFamily: "'Space Grotesk',sans-serif",
            animation: "neoFadeDown 600ms 160ms ease both",
          }}>
            Football intelligence for predictions, FPL decisions, and deeper match insight.
          </p>

          {/* CTA buttons */}
          <div style={{
            display: "flex", gap: 10, flexWrap: "wrap",
            marginTop: 36, animation: "neoFadeDown 600ms 240ms ease both",
          }}>
            {[
              { to: "/predictions/premier-league", label: "Predictions", primary: true },
              { to: "/best-team",                  label: "Build FPL Team" },
              { to: "/live",                       label: "Live Matches",  live: true },
              { to: "/learn",                      label: "Ground Zero" },
            ].map(({ to, label, primary, live }, i) => (
              <Link key={i} to={to} className="hp-btn" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 24px",
                background: primary ? Y : live ? R : "transparent",
                border: `3px solid ${primary ? K : live ? R : Y}`,
                color: primary ? K : live ? "#fff" : Y,
                fontSize: 13, fontWeight: 900, textDecoration: "none",
                fontFamily: "'Space Grotesk',sans-serif",
                letterSpacing: "0.04em",
                boxShadow: primary ? `4px 4px 0 ${K}` : live ? `4px 4px 0 rgba(255,39,68,0.4)` : `4px 4px 0 rgba(232,255,71,0.3)`,
              }}>{label}</Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── INLINE TICKER ── */}
      <HomeTicker items={tickerItems}/>

      {/* ── STAT TILES ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px 48px" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", animation: "neoFadeUp 600ms 350ms ease both" }}>
          {fixturesPred > 0 && (
            <StatTile
              value={fixturesPred} suffix="+"
              label="Fixtures Predicted" sublabel="across 5 leagues this season"
              color={Y} delay={0}
              svg={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 14l4-5 3 3 4-6 3 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.2" opacity="0.3"/></svg>}
            />
          )}
          {verifiedAcc > 0 && (
            <StatTile
              value={verifiedAcc} suffix="%"
              label="Verified Accuracy" sublabel="predictions matched final result"
              color={Y} delay={100}
              svg={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 10l4 4 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.2" opacity="0.3"/></svg>}
            />
          )}
          {predictions.length > 0 && (
            <StatTile
              value={predictions.length} suffix=""
              label="Live Predictions" sublabel="upcoming fixtures modelled now"
              color={Y} delay={200}
              svg={<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3" fill="currentColor"/><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.2" opacity="0.4"/><circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1" opacity="0.2"/></svg>}
            />
          )}
        </div>
      </section>

      {/* ── PREDICTIONS ── */}
      <PredictionStrip predictions={predictions}/>

      {/* ── STAT SPOTLIGHT ── */}
      <StatOfMoment insight={insight}/>

      {/* ── DIVIDER ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 48px" }}>
        <div style={{ height: 3, background: `linear-gradient(90deg,transparent,${Y},${R},${Y},transparent)` }}/>
      </div>

      {/* ── WHAT IS THIS ── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 64px" }}>
        <div style={{
          background: K,
          border: `3px solid ${Y}`,
          position: "relative", overflow: "hidden",
          boxShadow: `6px 6px 0 rgba(232,255,71,0.2)`,
        }}>
          {/* Header accent */}
          <div style={{ height: 3, background: Y }}/>

          <div style={{ padding: "28px 32px 20px" }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: W, margin: "0 0 4px", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "0.08em" }}>
              Built for football fans who love numbers
            </h2>
            <p style={{ fontSize: 12, color: DIM, margin: 0, fontFamily: "'Space Grotesk',sans-serif" }}>
              Pick a question. We've got the answer.
            </p>
          </div>

          <div style={{ height: 2, background: "rgba(232,255,71,0.1)", margin: "0 32px" }}/>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", fontFamily: "'Space Grotesk',sans-serif" }}>
            {[
              ["Planning FPL transfers?", "Get data driven squad recommendations with FDR, form ratings and projected points for the next 6 gameweeks.",
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M4 7h6M7 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>],
              ["Want smarter predictions?", "Model generated win probabilities and expected scorelines for every fixture across 9 competitions.",
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 10l3-4 2 2 3-5 2 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>],
              ["Is Saturday worth watching?", "Predicted scorelines, expected goal totals and match style indicators tell you whether it will be a thriller or bore draw.",
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>],
              ["Just love football stats?", "Deep player profiles, scoring patterns, passing accuracy and head to head records across Europe's top leagues.",
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="6" width="2.5" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="5.5" y="3.5" width="2.5" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="9.5" y="1" width="2.5" height="11.5" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>],
            ].map(([title, body, svgIcon], i) => (
              <div
                key={i}
                style={{
                  padding: "22px 32px",
                  borderRight: !isMobile && i % 2 === 0 ? `2px solid rgba(232,255,71,0.1)` : "none",
                  borderBottom: i < 2 ? `2px solid rgba(232,255,71,0.1)` : "none",
                  display: "flex", flexDirection: "column", gap: 8,
                  transition: "background 180ms", cursor: "default",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(232,255,71,0.04)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, flexShrink: 0,
                    background: Y, color: K,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {svgIcon}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: W, fontFamily: "'Space Grotesk',sans-serif" }}>{title}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: DIM, lineHeight: 1.7, paddingLeft: 38, fontFamily: "'Space Grotesk',sans-serif" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE CARDS ── */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 64px" }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 8, fontWeight: 900, color: DIM, letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "'DM Mono',monospace", margin: "0 0 4px" }}>Platform</p>
          <h2 style={{ fontSize: 34, fontWeight: 900, color: W, margin: 0, fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "0.08em" }}>
            Everything you need, in one place
          </h2>
          <div style={{ width: 40, height: 4, background: Y, marginTop: 8 }}/>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
          {FEATURES.map((f, i) => <FeatureCard key={f.to} {...f} delay={i * 55}/>)}
        </div>
      </section>

      {/* ── MODEL PERFORMANCE ── */}
      <ModelPerformance trend={trend} byMarket={byMarket} overallAccuracy={overallAcc}/>

      {/* ── RECENT RESULTS ── */}
      <RecentResults results={results} correct={resCorrect} total={resTotal}/>

      {/* ── LEAGUES STRIP ── */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 80px" }}>
        <div style={{
          padding: "28px 32px 32px",
          background: K,
          border: `3px solid ${Y}`,
          position: "relative", overflow: "hidden",
          boxShadow: `5px 5px 0 rgba(232,255,71,0.2)`,
        }}>
          <div style={{ height: 3, position: "absolute", top: 0, left: 0, right: 0, background: Y }}/>
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: "0 0 4px", fontSize: 8, color: DIM, fontFamily: "'DM Mono',monospace", letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Covering {LEAGUES.length} competitions
            </p>
            <h3 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: W, fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "0.08em" }}>
              Pick your league
            </h3>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {LEAGUES.map(({ to, name, flag }) => (
              <Link
                key={to}
                to={to}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 16px",
                  background: "transparent",
                  border: `2px solid rgba(232,255,71,0.25)`,
                  color: Y,
                  fontSize: 12, fontWeight: 700,
                  textDecoration: "none",
                  fontFamily: "'Space Grotesk',sans-serif",
                  transition: "all 140ms",
                  boxShadow: "none",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = Y;
                  e.currentTarget.style.color = K;
                  e.currentTarget.style.borderColor = Y;
                  e.currentTarget.style.transform = "translate(-2px,-2px)";
                  e.currentTarget.style.boxShadow = `4px 4px 0 ${K}`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = Y;
                  e.currentTarget.style.borderColor = "rgba(232,255,71,0.25)";
                  e.currentTarget.style.transform = "translate(0,0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{flag}</span>
                {name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px 80px" }}>
        <div style={{
          padding: "28px 32px",
          background: Y,
          border: `3px solid ${K}`,
          display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap",
          boxShadow: `6px 6px 0 ${K}`,
          position: "relative", overflow: "hidden",
        }}>
          {/* diagonal bg */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "repeating-linear-gradient(45deg,transparent,transparent 12px,rgba(10,10,10,0.03) 12px,rgba(10,10,10,0.03) 13px)",
          }}/>
          <div style={{ flex: "0 0 auto", position: "relative" }}>
            <svg width="110" height="64" viewBox="0 0 120 68" fill="none" style={{ display: "block" }}>
              <rect x="1" y="1" width="118" height="66" rx="5" fill="#0a2a10" stroke="rgba(0,0,0,0.2)" strokeWidth=".8"/>
              <line x1="60" y1="1" x2="60" y2="67" stroke="rgba(0,0,0,0.15)" strokeWidth=".6"/>
              <circle cx="60" cy="34" r="12" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth=".6"/>
              <path d="M30 34 C48 20 74 20 95 34" stroke="#0a0a0a" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" opacity=".7"/>
              <circle cx="95" cy="34" r="4" fill="#0a0a0a" opacity=".9">
                <animate attributeName="r" values="4;6;4" dur="1.2s" repeatCount="indefinite"/>
              </circle>
            </svg>
          </div>
          <div style={{ position: "relative" }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 900, color: K, fontFamily: "'Bebas Neue',sans-serif", letterSpacing: "0.08em" }}>
              How do our predictions work?
            </h3>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "rgba(10,10,10,0.65)", lineHeight: 1.65, fontFamily: "'Space Grotesk',sans-serif", maxWidth: 500 }}>
              Every prediction is generated by combining multiple statistical models with real match data. The deeper methodology, model details, and research are all documented in Ground Zero.
            </p>
            <Link to="/learn" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, fontWeight: 900, color: K, textDecoration: "none",
              fontFamily: "'DM Mono',monospace", background: K, color: Y,
              padding: "7px 16px", border: `2px solid ${K}`,
              boxShadow: `3px 3px 0 ${K}`,
              transition: "all 0.12s",
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translate(-2px,-2px)"; e.currentTarget.style.boxShadow = `5px 5px 0 ${K}`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translate(0,0)"; e.currentTarget.style.boxShadow = `3px 3px 0 ${K}`; }}
            >
              Explore Ground Zero →
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}