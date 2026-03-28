// HowItWorksPage.jsx — Football crash course & how StatinSite works
import { useState, useRef, useEffect } from "react";
function useIsMobile(bp=768){const[m,setM]=useState(()=>typeof window!=="undefined"?window.innerWidth<bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<bp);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[bp]);return m;}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800;900&family=JetBrains+Mono:wght@700;900&family=Inter:wght@400;500;600;700&display=swap');

.hiw-page { min-height:100vh; background:var(--bg); color:var(--text); font-family:'Inter',sans-serif; }

/* ── Keyframes ── */
@keyframes hiwScanX { 0%{left:-40%} 100%{left:140%} }
@keyframes hiwFlow  { from{stroke-dashoffset:60} to{stroke-dashoffset:0} }
@keyframes hiwPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.55)} }
@keyframes hiwFadeUp{ from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes hiwGlow  { 0%,100%{box-shadow:0 0 12px var(--c,#28d97a)} 50%{box-shadow:0 0 28px var(--c,#28d97a),0 0 52px var(--c,#28d97a)44} }
@keyframes hiwFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes hiwBarIn { from{width:0} to{width:var(--w,50%)} }
@keyframes hiwCountUp{ from{opacity:0;transform:scale(.7)} to{opacity:1;transform:scale(1)} }
@keyframes hiwBorderFlow{ 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes hiwRingPulse{ 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.2);opacity:0} }
@keyframes hiwSlideRight{ 0%{transform:translateX(0)} 100%{transform:translateX(var(--dx,50px))} }
@keyframes hiwCardFlip{ 0%{transform:scaleY(0) rotate(-8deg)} 60%{transform:scaleY(1.1) rotate(2deg)} 100%{transform:scaleY(1) rotate(0deg)} }
@keyframes hiwBallFly{ 0%{offset-distance:0%} 100%{offset-distance:100%} }
@keyframes hiwFlagWave{ 0%,100%{transform:rotate(-18deg) translateX(0)} 50%{transform:rotate(18deg) translateX(2px)} }
@keyframes hiwShimmer{ 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes hiwLineGrow{ from{stroke-dashoffset:300} to{stroke-dashoffset:0} }
@keyframes hiwSpinSlow{ from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes hiwBounce{ 0%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} 60%{transform:translateY(-4px)} }

/* ── Shared card shell ── */
.hiw-card {
  background: #080808;
  border: 1px solid rgba(255,255,255,.09);
  border-radius: 16px;
  overflow: hidden;
  transition: border-color .25s, box-shadow .25s, transform .25s;
  cursor: pointer;
}
.hiw-card:hover {
  border-color: rgba(255,255,255,.22);
  box-shadow: 0 24px 60px rgba(0,0,0,.7);
  transform: translateY(-3px);
}

/* ── Info panel text — theme-aware ── */

/* DARK MODE (default): white text on dark panel */
.hiw-info-panel {
  background: var(--bg-secondary);
}
.hiw-rule-desc {
  font-size: 11px;
  color: rgba(255,255,255,0.62);
  line-height: 1.7;
  font-weight: 400;
}
.hiw-stat-tile-label {
  color: rgba(255,255,255,0.38);
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.09em; text-transform: uppercase;
}
.hiw-stat-tile-val {
  color: rgba(255,255,255,0.88);
  font-size: 18px; font-weight: 900; line-height: 1;
}

/* LIGHT MODE: dark text on white panel */
[data-theme="light"] .hiw-rule-desc {
  color: rgba(0,0,0,0.68) !important;
}
[data-theme="light"] .hiw-card {
  border-color: rgba(0,0,0,.12);
  box-shadow: 0 2px 16px rgba(0,0,0,.08);
}
[data-theme="light"] .hiw-card:hover {
  border-color: rgba(0,0,0,.22);
  box-shadow: 0 12px 40px rgba(0,0,0,.14);
}
[data-theme="light"] .hiw-card:hover .hiw-stat-tile {
  border-color: rgba(0,0,0,.18);
}
[data-theme="light"] .hiw-stat-tile {
  background: rgba(0,0,0,.04);
  border-color: rgba(0,0,0,.10);
}
[data-theme="light"] .hiw-stat-tile-label {
  color: rgba(0,0,0,.45) !important;
}
[data-theme="light"] .hiw-stat-tile-val {
  color: rgba(0,0,0,.85) !important;
}
[data-theme="light"] .hiw-tab {
  color: rgba(0,0,0,.55);
  border-bottom-color: rgba(0,0,0,.08);
  background: transparent;
}
[data-theme="light"] .hiw-tab:hover {
  color: rgba(0,0,0,.85);
  background: rgba(0,0,0,.04);
}
/* Any remaining text inside info panels not already handled */
[data-theme="light"] .hiw-info-panel span,
[data-theme="light"] .hiw-info-panel p {
  color: rgba(0,0,0,.68);
}

/* ── Scene area ── */
.hiw-scene {
  position: relative;
  overflow: hidden;
  background: #030a04;
}

/* ── Animated top border ── */
.hiw-top-border {
  height: 3px;
  background-size: 300% 100%;
  animation: hiwBorderFlow 3s ease infinite;
}

/* ── Hover-triggered animation states ── */
.hiw-card .anim-target { animation-play-state: paused; }
.hiw-card:hover .anim-target { animation-play-state: running; }

/* Flowing dash lines */
.hiw-dash-flow {
  stroke-dasharray: 8 4;
  stroke-dashoffset: 60;
  animation: hiwFlow 1.8s linear infinite;
  animation-play-state: paused;
}
.hiw-card:hover .hiw-dash-flow { animation-play-state: running; }

/* Section headers */
.hiw-section-head {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 24px;
}
.hiw-section-bar {
  width: 4px; height: 40px; border-radius: 2px; flex-shrink: 0;
}
.hiw-section-title {
  font-family: 'Sora', sans-serif;
  font-size: 22px; font-weight: 900;
  letter-spacing: -0.025em;
}
.hiw-section-sub {
  font-size: 12px; color: var(--text-muted);
  margin-top: 2px; font-weight: 500;
}

/* Stat tiles */
.hiw-stat-tile {
  background: var(--bg-glass);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 13px;
  transition: background .2s, border-color .2s;
}
.hiw-card:hover .hiw-stat-tile { border-color: rgba(255,255,255,.14); }

/* Rule description — defined above with theme variants */

/* Tabs */
.hiw-tab {
  flex: 1; padding: 8px 0;
  font-size: 11px; font-weight: 700;
  background: none; border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color .15s, border-color .15s, background .15s;
  font-family: 'Inter', sans-serif;
  color: var(--text-muted);
}
`;

/* ─────────────────────────────────────
   Reusable scene wrapper
───────────────────────────────────── */
function Scene({ height = 170, bg = "#030a04", children, style = {} }) {
  return (
    <div className="hiw-scene" style={{ height, background: bg, ...style }}>
      {children}
    </div>
  );
}
function SiteFooter() {
  return (
    <footer style={{ background: "#000", borderTop: "0.5px solid rgba(255,255,255,0.08)", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "0 28px", height: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
            <rect x="4"  y="3"  width="14" height="3.5" rx="1.75" fill="#0a84ff" />
            <rect x="4"  y="9"  width="10" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.65" />
            <rect x="4"  y="15" width="14" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.4" />
            <rect x="4"  y="21" width="7"  height="3.5" rx="1.75" fill="#0a84ff" opacity="0.22" />
            <rect x="20" y="15" width="3"  height="10"  rx="1.5"  fill="#30d158" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "-0.03em" }}>StatinSite</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Football Intelligence · ELO · Dixon-Coles · xG</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 16px", background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.09)", borderRadius: 999, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Built by</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>Rutej Talati</span>
        </div>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", flexShrink: 0, whiteSpace: "nowrap" }}>© {new Date().getFullYear()} StatinSite</span>
      </div>
    </footer>
  );
}
/* ─────────────────────────────────────
   OFFSIDE RULE
───────────────────────────────────── */
function OffsideCard() {
  const [hov, setHov] = useState(false);
  return (
    <div className="hiw-card" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div className="hiw-top-border" style={{ background: "linear-gradient(90deg,#ef4444,#f97316,#ef4444)", backgroundSize: "300% 100%" }} />
      <Scene height={180} bg="#0a0200">
        <svg width="100%" height="180" viewBox="0 0 340 180" preserveAspectRatio="xMidYMid meet">
          {/* Grass stripes */}
          {[0,34,68,102,136].map(y => <rect key={y} x="0" y={y} width="340" height="23" fill="rgba(255,255,255,.013)" />)}
          {/* Pitch boundary */}
          <rect x="8" y="6" width="324" height="168" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1.5" />
          {/* Penalty box */}
          <rect x="248" y="50" width="84" height="80" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="1" />
          <rect x="268" y="68" width="64" height="44" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
          {/* Goal */}
          <rect x="306" y="72" width="26" height="36" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" />

          {/* Defensive line */}
          <line x1="198" y1="6" x2="198" y2="174" stroke="rgba(103,177,255,.55)" strokeWidth="1.5" strokeDasharray="6 3" />
          <text x="201" y="18" fontSize="8" fill="rgba(103,177,255,.85)" fontFamily="'JetBrains Mono',monospace" fontWeight="700">LAST DEF</text>

          {/* Defenders */}
          <circle cx="198" cy="76" r="10" fill="#1d4ed8" stroke="rgba(255,255,255,.35)" strokeWidth="1.5" />
          <text x="198" y="80" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="700">D</text>
          <circle cx="198" cy="112" r="10" fill="#1d4ed8" stroke="rgba(255,255,255,.35)" strokeWidth="1.5" />
          <text x="198" y="116" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="700">D</text>

          {/* ONSIDE attacker */}
          <circle cx="168" cy="90" r="10" fill="#28d97a" stroke="#fff" strokeWidth="2" />
          <text x="168" y="94" textAnchor="middle" fontSize="8" fill="#000" fontWeight="900">A</text>
          {/* Onside tick */}
          <circle cx="168" cy="116" r="9" fill="rgba(40,217,122,.15)" stroke="#28d97a" strokeWidth="1.5" />
          <path d="M164 116 L167 119 L172 113" stroke="#28d97a" strokeWidth="2" fill="none" />

          {/* OFFSIDE attacker — animates right on hover */}
          <g style={{ transform: hov ? "translateX(44px)" : "translateX(0)", transition: "transform 1.4s cubic-bezier(.22,1,.36,1)" }}>
            <circle cx="182" cy="62" r="10" fill="#ef4444" stroke="#fff" strokeWidth="2" />
            <text x="182" y="66" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="900">A</text>
          </g>

          {/* Ball and pass line */}
          <circle cx="90" cy="88" r="6" fill="white" stroke="#aaa" strokeWidth="1" />
          <line x1="96" y1="86" x2="225" y2="64" stroke="rgba(255,255,255,.35)" strokeWidth="1.5" strokeDasharray="7 3"
            style={{ strokeDashoffset: hov ? 0 : 60, transition: hov ? "stroke-dashoffset 1.2s linear" : "none" }} />

          {/* FLAG — appears on hover */}
          <g style={{ opacity: hov ? 1 : 0, transition: "opacity .4s ease 1.2s" }}>
            <line x1="310" y1="20" x2="310" y2="56" stroke="#ef4444" strokeWidth="2.5" />
            <rect x="303" y="14" width="18" height="12" fill="#ef4444" rx="2"
              style={{ transformOrigin: "310px 20px", animation: hov ? "hiwFlagWave .5s ease-in-out infinite 1.2s" : "none" }} />
          </g>

          {/* OFFSIDE label flash */}
          <text x="170" y="158" textAnchor="middle" fontSize="18" fontWeight="900" fill="#ef4444" fontFamily="'Sora',sans-serif"
            style={{ opacity: hov ? 1 : 0, transition: "opacity .3s ease 1.4s" }}>
            OFFSIDE
          </text>
        </svg>
      </Scene>
      <div className="hiw-info-panel" style={{ padding: "13px 15px", background: "var(--bg-secondary)" }}>
        <div className="hiw-card-title" style={{ fontSize: 14, fontWeight: 800, color: "#ef4444", fontFamily: "'Sora',sans-serif", marginBottom: 5 }}>The Offside Rule</div>
        <div className="hiw-rule-desc">
          When a teammate plays the ball forward to you, your body (not arms) must have at least one defender between you and the goal at the exact moment the ball is kicked. The goalkeeper counts as one of those defenders. If you are ahead of everyone except the keeper when the pass is made, you are offside and the referee stops play. The green player is onside because a defender is still behind them. The red player has run too far forward and is caught offside as soon as the pass is made.
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   PENALTY CARD
───────────────────────────────────── */
function PenaltyCard() {
  const [hov, setHov] = useState(false);
  return (
    <div className="hiw-card" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div className="hiw-top-border" style={{ background: "linear-gradient(90deg,#fbbf24,#fb923c,#fbbf24)", backgroundSize: "300% 100%" }} />
      <Scene height={180} bg="#0a0800">
        <svg width="100%" height="180" viewBox="0 0 340 180" preserveAspectRatio="xMidYMid meet">
          {[0,34,68,102,136].map(y => <rect key={y} x="0" y={y} width="340" height="23" fill="rgba(255,255,255,.013)" />)}
          <rect x="8" y="6" width="324" height="168" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1.5" />
          <rect x="240" y="40" width="92" height="100" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1" />
          <rect x="268" y="62" width="64" height="56" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
          {/* Goal */}
          <rect x="298" y="68" width="34" height="44" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" />
          {/* Net lines */}
          {[307,316,325].map(x => <line key={x} x1={x} y1="68" x2={x} y2="112" stroke="rgba(255,255,255,.07)" strokeWidth=".8" />)}
          {[80,90,100].map(y => <line key={y} x1="298" y1={y} x2="332" y2={y} stroke="rgba(255,255,255,.07)" strokeWidth=".8" />)}

          {/* 9.15m line label */}
          <text x="246" y="158" fontSize="8" fill="rgba(255,255,255,.25)" fontFamily="'JetBrains Mono',monospace">12 yards</text>
          <line x1="268" y1="90" x2="250" y2="90" stroke="rgba(255,255,255,.15)" strokeWidth=".8" strokeDasharray="2 2" />

          {/* Penalty spot */}
          <circle cx="266" cy="90" r="4" fill="#fbbf24" />
          <circle cx="266" cy="90" r="10" fill="none" stroke="rgba(251,191,36,.3)" strokeWidth="1" />

          {/* Taker — runs on hover */}
          <g style={{ transform: hov ? "translateX(52px)" : "translateX(0)", transition: "transform .8s cubic-bezier(.22,1,.36,1)" }}>
            <circle cx="190" cy="90" r="11" fill="#fbbf24" stroke="#fff" strokeWidth="1.5" />
            <text x="190" y="94" textAnchor="middle" fontSize="8" fill="#000" fontWeight="900">T</text>
          </g>

          {/* Ball — flies on hover */}
          <g style={{ transform: hov ? "translate(42px,-22px)" : "translate(0,0)", transition: "transform .6s cubic-bezier(.22,1,.36,1) .75s" }}>
            <circle cx="266" cy="90" r="6" fill="white" stroke="#aaa" strokeWidth="1" />
          </g>

          {/* Keeper — dives on hover */}
          <g style={{
            transform: hov ? "translate(0,-22px) rotate(-30deg)" : "translate(0,0) rotate(0deg)",
            transformOrigin: "314px 90px",
            transition: "transform .45s cubic-bezier(.22,1,.36,1) .7s"
          }}>
            <circle cx="314" cy="90" r="11" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
            <text x="314" y="94" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="900">GK</text>
          </g>

          {/* GOAL flash */}
          <rect x="298" y="68" width="34" height="44" fill="rgba(40,217,122,0)" rx="2"
            style={{ fill: hov ? "rgba(40,217,122,.35)" : "rgba(40,217,122,0)", transition: "fill .3s ease 1.3s" }} />
          <text x="170" y="158" textAnchor="middle" fontSize="18" fontWeight="900" fill="#28d97a" fontFamily="'Sora',sans-serif"
            style={{ opacity: hov ? 1 : 0, transition: "opacity .3s ease 1.4s" }}>
            GOAL!
          </text>
        </svg>
      </Scene>
      <div className="hiw-info-panel" style={{ padding: "13px 15px", background: "var(--bg-secondary)" }}>
        <div className="hiw-card-title" style={{ fontSize: 14, fontWeight: 800, color: "#fbbf24", fontFamily: "'Sora',sans-serif", marginBottom: 5 }}>The Penalty Kick</div>
        <div className="hiw-rule-desc">
          A penalty is awarded when a defending player commits a foul inside their own penalty area. The attacking team gets a one on one chance from the penalty spot, which sits exactly 12 yards (11 metres) from the goal line. The goalkeeper must stay on the goal line until the ball is kicked. All other players must wait outside the penalty area. Penalties are scored approximately 76 percent of the time, making them one of the most decisive moments in any football match. Hover to watch the taker run up, strike the ball into the top corner and the keeper dive the wrong way.
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   FREE KICK CARD
───────────────────────────────────── */
function FreeKickCard() {
  const [hov, setHov] = useState(false);
  const [ballPos, setBallPos] = useState({ x: 95, y: 90 });

  useEffect(() => {
    if (!hov) { setBallPos({ x: 95, y: 90 }); return; }
    const pts = [
      { x: 95, y: 90 }, { x: 115, y: 78 }, { x: 138, y: 62 },
      { x: 158, y: 52 }, { x: 178, y: 50 }, { x: 200, y: 55 },
      { x: 222, y: 66 }, { x: 238, y: 72 },
    ];
    let i = 0;
    const iv = setInterval(() => {
      i++;
      if (i >= pts.length) { clearInterval(iv); return; }
      setBallPos(pts[i]);
    }, 100);
    return () => clearInterval(iv);
  }, [hov]);

  return (
    <div className="hiw-card" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div className="hiw-top-border" style={{ background: "linear-gradient(90deg,#28d97a,#00e5ff,#28d97a)", backgroundSize: "300% 100%" }} />
      <Scene height={180} bg="#030a04">
        <svg width="100%" height="180" viewBox="0 0 290 150" preserveAspectRatio="xMidYMid meet">
          {[0,28,56,84,112].map(y => <rect key={y} x="0" y={y} width="290" height="18" fill="rgba(255,255,255,.012)" />)}
          <rect x="6" y="4" width="278" height="142" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.2" />
          <rect x="220" y="28" width="64" height="94" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1" />
          <rect x="244" y="50" width="40" height="50" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
          {/* Goal */}
          <rect x="258" y="55" width="26" height="40" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.28)" strokeWidth="1.5" />
          {[265,272,279].map(x => <line key={x} x1={x} y1="55" x2={x} y2="95" stroke="rgba(255,255,255,.07)" strokeWidth=".8" />)}
          {[65,73,81,89].map(y => <line key={y} x1="258" y1={y} x2="284" y2={y} stroke="rgba(255,255,255,.07)" strokeWidth=".8" />)}

          {/* Wall */}
          {[55, 67, 79, 91].map((y, i) => (
            <g key={i}>
              <circle cx="180" cy={y} r="8" fill="#1d4ed8" stroke="rgba(255,255,255,.2)" strokeWidth="1.2" />
              <text x="180" y={y + 3} textAnchor="middle" fontSize="6" fill="#fff">W</text>
            </g>
          ))}
          {/* 9.15m line */}
          <line x1="180" y1="35" x2="180" y2="110" stroke="rgba(255,255,255,.18)" strokeWidth=".8" strokeDasharray="3 2" />
          <text x="160" y="32" fontSize="7" fill="rgba(255,255,255,.35)" fontFamily="'JetBrains Mono',monospace">9.15m</text>

          {/* FK taker */}
          <circle cx="72" cy="75" r="10" fill="#28d97a" stroke="#fff" strokeWidth="1.5" />
          <text x="72" y="79" textAnchor="middle" fontSize="8" fill="#000" fontWeight="900">FK</text>

          {/* Curve trail */}
          <path d="M95,90 Q138,44 238,72" fill="none" stroke="rgba(40,217,122,.35)" strokeWidth="1.5" strokeDasharray="6 3"
            style={{ strokeDashoffset: hov ? 0 : 120, transition: hov ? "stroke-dashoffset 1s linear" : "none" }} />

          {/* Ball */}
          <circle cx={ballPos.x} cy={ballPos.y} r="6" fill="white" stroke="#aaa" strokeWidth="1"
            style={{ transition: "cx .1s, cy .1s" }} />

          {/* Goal flash */}
          <rect x="258" y="55" width="26" height="40" fill="rgba(40,217,122,0)"
            style={{ fill: hov ? "rgba(40,217,122,.4)" : "rgba(40,217,122,0)", transition: "fill .3s ease 1s" }} />
          <text x="145" y="138" textAnchor="middle" fontSize="14" fontWeight="900" fill="#28d97a" fontFamily="'Sora',sans-serif"
            style={{ opacity: hov ? 1 : 0, transition: "opacity .3s ease 1.1s" }}>
            TOP CORNER!
          </text>
        </svg>
      </Scene>
      <div className="hiw-info-panel" style={{ padding: "13px 15px", background: "var(--bg-secondary)" }}>
        <div className="hiw-card-title" style={{ fontSize: 14, fontWeight: 800, color: "#28d97a", fontFamily: "'Sora',sans-serif", marginBottom: 5 }}>The Free Kick</div>
        <div className="hiw-rule-desc">
          A free kick is awarded whenever a player commits a foul outside the penalty area. Defenders are allowed to form a wall of players, but that wall must be at least 9.15 metres away from the ball. The kicker can strike the ball directly at goal on a direct free kick. The best free kick takers in the world generate enormous swerve and dip by striking through the side of the ball, causing it to curl around or over the defensive wall before dipping sharply into the net. Hover to see the ball trace its path over the wall and into the top corner.
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   YELLOW / RED CARD
───────────────────────────────────── */
function CardsCard() {
  const [hov, setHov] = useState(false);
  return (
    <div className="hiw-card" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div className="hiw-top-border" style={{ background: "linear-gradient(90deg,#fbbf24,#ef4444,#fbbf24)", backgroundSize: "300% 100%" }} />
      <Scene height={180} bg="#080500">
        <svg width="100%" height="180" viewBox="0 0 290 150" preserveAspectRatio="xMidYMid meet">
          {/* Background atmosphere */}
          <defs>
            <radialGradient id="yellowGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(251,191,36,.15)" />
              <stop offset="100%" stopColor="rgba(251,191,36,0)" />
            </radialGradient>
            <radialGradient id="redGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(239,68,68,.15)" />
              <stop offset="100%" stopColor="rgba(239,68,68,0)" />
            </radialGradient>
          </defs>

          {/* Referee */}
          <circle cx="70" cy="70" r="13" fill="#111" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" />
          <text x="70" y="74" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,.8)" fontWeight="700">REF</text>
          {/* Arm raised */}
          <line x1="82" y1="66" x2="110" y2="50" stroke="rgba(255,255,255,.35)" strokeWidth="2.5" strokeLinecap="round"
            style={{ transform: hov ? "rotate(-5deg)" : "none", transformOrigin: "82px 66px", transition: "transform .4s ease" }} />

          {/* Yellow card */}
          <rect x="108" y="28" width="22" height="32" fill="#fbbf24" rx="3" stroke="#000" strokeWidth="1"
            style={{
              transform: hov ? "scaleY(1) rotate(0deg)" : "scaleY(0) rotate(-10deg)",
              transformOrigin: "119px 28px",
              transition: "transform .45s cubic-bezier(.22,1,.36,1) .2s"
            }} />
          {/* Yellow glow */}
          <rect x="104" y="24" width="30" height="40" fill="none" rx="4" stroke="rgba(251,191,36,.7)" strokeWidth="2"
            style={{ opacity: hov ? 1 : 0, transition: "opacity .3s ease .5s" }} />
          <circle cx="119" cy="44" r="18" fill="url(#yellowGlow)" style={{ opacity: hov ? 1 : 0, transition: "opacity .4s ease .4s" }} />

          {/* Red card (second yellow scenario) */}
          <rect x="133" y="22" width="22" height="32" fill="#ef4444" rx="3" stroke="#000" strokeWidth="1"
            style={{
              transform: hov ? "scaleY(1) rotate(0deg)" : "scaleY(0) rotate(-10deg)",
              transformOrigin: "144px 22px",
              transition: "transform .4s cubic-bezier(.22,1,.36,1) .9s"
            }} />
          <rect x="129" y="18" width="30" height="40" fill="none" rx="4" stroke="rgba(239,68,68,.7)" strokeWidth="2"
            style={{ opacity: hov ? 1 : 0, transition: "opacity .3s ease 1.1s" }} />
          <circle cx="144" cy="38" r="18" fill="url(#redGlow)" style={{ opacity: hov ? 1 : 0, transition: "opacity .4s ease 1s" }} />

          {/* Player being carded */}
          <circle cx="185" cy="70" r="13" fill="#3b82f6" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" />
          <text x="185" y="74" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">P</text>

          {/* SENT OFF arrow */}
          <g style={{ opacity: hov ? 1 : 0, transition: "opacity .4s ease 1.4s" }}>
            <path d="M198 72 L220 90 L240 106 L258 122" stroke="#ef4444" strokeWidth="2" fill="none"
              strokeDasharray="6 3" style={{ strokeDashoffset: hov ? 0 : 60, transition: "stroke-dashoffset 1s ease 1.4s" }} />
            <text x="200" y="140" fontSize="9" fill="#ef4444" fontFamily="'JetBrains Mono',monospace" fontWeight="700">SENT OFF</text>
          </g>

          {/* 10 vs 11 */}
          <g style={{ opacity: hov ? 1 : 0, transition: "opacity .4s ease 1.8s" }}>
            <rect x="8" y="110" width="120" height="34" fill="rgba(239,68,68,.08)" stroke="rgba(239,68,68,.25)" strokeWidth="1" rx="7" />
            <text x="68" y="124" textAnchor="middle" fontSize="11" fill="#ef4444" fontWeight="700" fontFamily="'Sora',sans-serif">10 vs 11</text>
            <text x="68" y="138" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,.35)">rest of the match</text>
          </g>
        </svg>
      </Scene>
      <div className="hiw-info-panel" style={{ padding: "13px 15px", background: "var(--bg-secondary)" }}>
        <div className="hiw-card-title" style={{ fontSize: 14, fontWeight: 800, color: "#fbbf24", fontFamily: "'Sora',sans-serif", marginBottom: 5 }}>Yellow and Red Cards</div>
        <div className="hiw-rule-desc">
          Referees carry yellow and red cards to discipline players. A yellow card is a formal warning issued for reckless challenges, diving, time wasting or dissent. If a player receives two yellow cards in the same match they are shown a second yellow immediately followed by a red card and must leave the pitch. A direct red card can also be shown for violent conduct or denying an obvious goalscoring opportunity. Once a player is sent off, their team must play the rest of the match with only ten players against eleven, which is a significant disadvantage. Hover to see the cards being raised and the player being dismissed.
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   RESTARTS (throw / corner / goal kick)
───────────────────────────────────── */
function RestartsCard() {
  const [tab, setTab] = useState("throw");
  const [hov, setHov] = useState(false);
  const tabs = [
    { key: "throw", label: "Throw-In", col: "#a78bfa" },
    { key: "corner", label: "Corner", col: "#fbbf24" },
    { key: "gk", label: "Goal Kick", col: "#ef4444" },
  ];
  const info = {
    throw: { col: "#a78bfa", title: "The Throw-In", desc: "When the ball fully crosses the sideline (the long line running the length of the pitch), the team that did not touch it last is awarded a throw-in. The throwing player must face the pitch, keep both feet on or behind the sideline, hold the ball with both hands and release it from directly behind and over the head in a smooth continuous motion. You cannot score a goal directly from a throw-in, and the thrower cannot touch the ball again until another player has." },
    corner: { col: "#fbbf24", title: "The Corner Kick", desc: "A corner kick is awarded when the ball crosses the goal line and was last touched by a defending player. The attacking team places the ball in the small arc in the corner of the pitch nearest to where it went out. From here they can deliver the ball into the penalty area, where teammates attempt to score with a header or shot. A goal can be scored directly from a corner kick. The defending team must stay at least 9.15 metres away from the corner arc until the ball is kicked." },
    gk: { col: "#ef4444", title: "The Goal Kick", desc: "A goal kick is awarded when the ball crosses the goal line and was last touched by an attacking player. The goalkeeper or any outfield player places the ball anywhere within the six yard box and kicks it back into play. Since a rule change in 2019, opponents no longer need to leave the penalty area before the kick is taken, meaning teams can now build out from the back with short passes under pressure. The keeper often takes a long kick upfield to find a striker or wins the aerial duel." },
  };
  const current = info[tab];
  return (
    <div className="hiw-card" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div className="hiw-top-border" style={{ background: `linear-gradient(90deg,${current.col},${current.col}88,${current.col})`, backgroundSize: "300% 100%" }} />
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,.07)", background: "#050505" }}>
        {tabs.map(t => (
          <button key={t.key} className="hiw-tab" onClick={() => setTab(t.key)}
            style={{ color: tab === t.key ? t.col : "rgba(255,255,255,.35)", borderBottomColor: tab === t.key ? t.col : "transparent", background: tab === t.key ? t.col + "14" : "none" }}>
            {t.label}
          </button>
        ))}
      </div>
      <Scene height={150} bg="#030a04">
        <svg width="100%" height="150" viewBox="0 0 290 130" preserveAspectRatio="xMidYMid meet">
          {[0,26,52,78,104].map(y => <rect key={y} x="0" y={y} width="290" height="17" fill="rgba(255,255,255,.012)" />)}
          <rect x="6" y="4" width="278" height="122" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.2" />

          {tab === "throw" && <>
            {/* Sideline highlighted */}
            <line x1="6" y1="82" x2="284" y2="82" stroke="rgba(167,139,250,.5)" strokeWidth="2" />
            {/* Thrower */}
            <circle cx="40" cy="78" r="11" fill="#a78bfa" stroke="#fff" strokeWidth="1.5" />
            <text x="40" y="82" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="700">P</text>
            {/* Arms */}
            <line x1="32" y1="72" x2="24" y2="57" stroke="rgba(167,139,250,.6)" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="48" y1="72" x2="55" y2="57" stroke="rgba(167,139,250,.6)" strokeWidth="2.5" strokeLinecap="round" />
            {/* Arc */}
            <path d="M40,67 Q110,32 180,70" fill="none" stroke="rgba(167,139,250,.55)" strokeWidth="2" strokeDasharray="7 3"
              style={{ strokeDashoffset: hov ? 0 : 80, transition: hov ? "stroke-dashoffset 1.2s linear" : "none" }} />
            {/* Ball */}
            <circle cx={hov ? 180 : 40} cy={hov ? 70 : 62} r="6" fill="white" stroke="#aaa" strokeWidth="1"
              style={{ transition: hov ? "cx 1.2s cubic-bezier(.22,1,.36,1), cy 1.2s" : "none" }} />
            {/* Receiver */}
            <circle cx="180" cy="88" r="10" fill="#7c3aed" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" />
            <text x="180" y="92" textAnchor="middle" fontSize="8" fill="#fff">R</text>
            <text x="145" y="120" textAnchor="middle" fontSize="8" fill="rgba(167,139,250,.7)" fontFamily="'JetBrains Mono',monospace" fontWeight="700">Both feet on ground</text>
          </>}

          {tab === "corner" && <>
            <rect x="244" y="4" width="40" height="46" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="1" />
            <rect x="258" y="42" width="26" height="40" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.28)" strokeWidth="1.5" />
            {/* Corner arc */}
            <path d="M244 126 Q248 100 268 100" fill="none" stroke="rgba(251,191,36,.5)" strokeWidth="1.5" />
            {/* Corner flag */}
            <line x1="244" y1="126" x2="244" y2="106" stroke="#fbbf24" strokeWidth="2.5" />
            <rect x="237" y="100" width="14" height="9" fill="#fbbf24" rx="1"
              style={{ animation: hov ? "hiwFlagWave .6s ease-in-out infinite" : "none", transformOrigin: "244px 106px" }} />
            {/* Taker */}
            <circle cx="241" cy="119" r="10" fill="#fbbf24" stroke="#fff" strokeWidth="1.5" />
            <text x="241" y="123" textAnchor="middle" fontSize="7" fill="#000" fontWeight="900">C</text>
            {/* Cross */}
            <path d="M241,109 Q200,62 120,55" fill="none" stroke="rgba(251,191,36,.55)" strokeWidth="2" strokeDasharray="7 3"
              style={{ strokeDashoffset: hov ? 0 : 100, transition: hov ? "stroke-dashoffset 1.4s linear" : "none" }} />
            {/* Attacker */}
            <circle cx="120" cy="66" r="10" fill="#28d97a" stroke="#fff" strokeWidth="1.5" />
            <text x="120" y="70" textAnchor="middle" fontSize="8" fill="#000" fontWeight="700">A</text>
            <text x="120" y="118" textAnchor="middle" fontSize="8" fill="rgba(251,191,36,.7)" fontFamily="'JetBrains Mono',monospace" fontWeight="700">Defender last touch</text>
          </>}

          {tab === "gk" && <>
            <rect x="6" y="46" width="52" height="68" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.18)" strokeWidth="1" />
            <rect x="6" y="62" width="22" height="36" fill="rgba(255,255,255,.02)" stroke="rgba(255,255,255,.12)" strokeWidth="1" />
            {/* GK */}
            <circle cx="30" cy="80" r="11" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
            <text x="30" y="84" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="900">GK</text>
            {/* Long kick */}
            <path d="M40,78 Q120,28 220,82" fill="none" stroke="rgba(239,68,68,.5)" strokeWidth="2" strokeDasharray="7 3"
              style={{ strokeDashoffset: hov ? 0 : 120, transition: hov ? "stroke-dashoffset 1.6s linear" : "none" }} />
            {/* Ball */}
            <circle cx={hov ? 220 : 44} cy={hov ? 82 : 72} r="6" fill="white" stroke="#aaa" strokeWidth="1"
              style={{ transition: hov ? "cx 1.6s cubic-bezier(.22,1,.36,1), cy 1.6s" : "none" }} />
            {/* Striker */}
            <circle cx="220" cy="93" r="10" fill="#fbbf24" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" />
            <text x="220" y="97" textAnchor="middle" fontSize="8" fill="#000" fontWeight="700">S</text>
            <text x="145" y="118" textAnchor="middle" fontSize="8" fill="rgba(239,68,68,.7)" fontFamily="'JetBrains Mono',monospace" fontWeight="700">Attacker last touch</text>
          </>}
        </svg>
      </Scene>
      <div className="hiw-info-panel" style={{ padding: "13px 15px", background: "var(--bg-secondary)" }}>
        <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "'Sora',sans-serif", marginBottom: 5, color: current.col }}>{current.title}</div>
        <div className="hiw-rule-desc">{current.desc}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   TACTICS BOARD (interactive)
───────────────────────────────────── */
const TACTICS = {
  press: {
    label: "High Press", col: "#28d97a",
    title: "High Press (Gegenpressing)",
    desc: "A team that employs a high press sends its attackers to close down defenders and the goalkeeper immediately every time the opposition has the ball. The aim is to win the ball back as high up the pitch as possible, as close to the opponent's goal as possible. This creates high quality scoring chances from turnovers in dangerous areas. It requires extraordinary fitness levels, with players covering 12 to 13 kilometres per game. Teams like Liverpool under Klopp and Manchester City under Guardiola perfected this style. The pressure zones shown in green highlight exactly where the ball is hunted.",
    stats: [["PPDA", "6.2", "#28d97a"], ["Turnovers in opp half", "High", "#fbbf24"], ["xG from press", "+0.34/game", "#67b1ff"], ["Physical demand", "Very high", "#ef4444"]],
    example: "Klopp's Liverpool · Guardiola's City · Leverkusen"
  },
  counter: {
    label: "Counter Attack", col: "#fbbf24",
    title: "Counter Attack",
    desc: "A team that counter attacks deliberately sits deep and compact when the opposition has the ball, sacrificing possession and inviting pressure. The moment they win the ball back, they immediately transition from defence to attack at maximum speed with as few touches as possible. This style is brutally effective against teams that push many players forward, because winning the ball creates huge open spaces behind the opposing defence. The best counter attacking teams can get from their own box to the opponent's net in under 10 seconds. Hover to watch the rapid transition.",
    stats: [["Transition time", "Under 10s", "#fbbf24"], ["Open space created", "Very high", "#28d97a"], ["Possession avg", "Under 45%", "#ef4444"], ["Goals from transitions", "High", "#67b1ff"]],
    example: "Atletico Madrid · Inter under Mourinho · Leicester 2016"
  },
  block: {
    label: "Deep Block", col: "#ef4444",
    title: "The Deep Block",
    desc: "A deep block is a defensive system where a team organises two compact lines of four players sitting very deep in their own half, rarely attempting to press. The idea is to make the space between the lines and behind the defensive line as small as possible, forcing opponents to either shoot from distance or play sideways. This system drastically reduces the number of high quality chances the opponent generates, but it also severely limits the defending team's ability to attack, as they often have to absorb wave after wave of pressure for long periods.",
    stats: [["PPDA", "13 plus", "#ef4444"], ["xGA prevented", "+0.2/game", "#28d97a"], ["Possession held", "Under 38%", "#fbbf24"], ["Long balls away", "Very high", "#67b1ff"]],
    example: "Burnley · Cagliari · Classic Atletico away days"
  },
  halfspace: {
    label: "Half Spaces", col: "#c084fc",
    title: "Half Spaces and Positional Play",
    desc: "Half spaces are the zones on the pitch between the centre and the wide areas, roughly where the inside forwards and attacking midfielders operate. They are considered the most dangerous zones in football because a player receiving the ball there faces a defensive dilemma: the fullback is out of position, the centre back must step out, and suddenly a gap opens. Teams like Barcelona and Manchester City under Guardiola have built their entire attacking philosophy around overloading these zones with technical players who can dribble, shoot or pass in tight spaces.",
    stats: [["xG from half spaces", "+0.18/shot", "#c084fc"], ["Key attack zone", "Between lines", "#fbbf24"], ["Pass type", "Third man runs", "#67b1ff"], ["Defensive disruption", "Maximum", "#ef4444"]],
    example: "Pep Guardiola's City · Barcelona · Ajax"
  },
};

function TacticsBoardCard() {
  const [active, setActive] = useState("press");
  const isMobile = useIsMobile();
  const t = TACTICS[active];
  return (
    <div className="hiw-card" style={{ borderRadius: 16 }}>
      <div className="hiw-top-border" style={{ background: `linear-gradient(90deg,${t.col},${t.col}66,${t.col})`, backgroundSize: "300% 100%" }} />
      {/* Tab row */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,.07)", background: "#050505" }}>
        {Object.entries(TACTICS).map(([k, v]) => (
          <button key={k} className="hiw-tab" onClick={() => setActive(k)}
            style={{ color: active === k ? v.col : "rgba(255,255,255,.35)", borderBottomColor: active === k ? v.col : "transparent", background: active === k ? v.col + "14" : "none" }}>
            {v.label}
          </button>
        ))}
      </div>
      <div className="hiw-info-panel" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 220px", background: "var(--bg-tertiary)" }}>
        {/* Pitch SVG */}
        <div style={{ position: "relative", paddingTop: "62%", overflow: "hidden" }}>
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 340 210" preserveAspectRatio="xMidYMid meet">
            {[0,30,60,90,120,150,180].map(y => <rect key={y} x="0" y={y} width="340" height="20" fill="rgba(255,255,255,.014)" />)}
            <rect x="8" y="6" width="324" height="198" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1.5" />
            <line x1="8" y1="105" x2="332" y2="105" stroke="rgba(255,255,255,.18)" strokeWidth="1" />
            <circle cx="170" cy="105" r="28" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1" />
            <circle cx="170" cy="105" r="2.5" fill="rgba(255,255,255,.4)" />
            <rect x="8" y="62" width="56" height="86" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1" />
            <rect x="276" y="62" width="56" height="86" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1" />
            <rect x="8" y="80" width="22" height="50" fill="none" stroke="rgba(255,255,255,.13)" strokeWidth="1" />
            <rect x="310" y="80" width="22" height="50" fill="none" stroke="rgba(255,255,255,.13)" strokeWidth="1" />
            <rect x="0" y="88" width="8" height="34" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" />
            <rect x="332" y="88" width="8" height="34" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" />

            {active === "press" && <>
              <ellipse cx="295" cy="105" rx="40" ry="65" fill="rgba(40,217,122,.07)" stroke="rgba(40,217,122,.2)" strokeWidth="1.2" strokeDasharray="5 3" />
              {[[255,58],[235,105],[255,152]].map(([x,y],i) => (
                <g key={i}>
                  <circle cx={x} cy={y} r="10" fill="#fbbf24" stroke="#fff" strokeWidth="1.5" />
                  <text x={x} y={y+3} textAnchor="middle" fontSize="7" fill="#000" fontWeight="900">A</text>
                  <path d={`M${x+9} ${y-2} L${x+30} ${y-6}`} stroke="#28d97a" strokeWidth="1.5" strokeDasharray="5 3" fill="none"
                    style={{ strokeDashoffset: 0, animation: "hiwFlow 1.2s linear infinite" }} />
                </g>
              ))}
              {[[300,48],[315,105],[300,162]].map(([x,y],i) => (
                <g key={i}>
                  <circle cx={x} cy={y} r="9" fill="rgba(255,255,255,.65)" stroke="#000" strokeWidth="1.5" />
                  <text x={x} y={y+3} textAnchor="middle" fontSize="7" fill="#000">D</text>
                </g>
              ))}
              <text x="250" y="26" fontSize="8" fill="rgba(40,217,122,.85)" fontFamily="'JetBrains Mono',monospace" fontWeight="700">PRESS ZONE</text>
            </>}

            {active === "counter" && <>
              <rect x="20" y="55" width="2" height="100" fill="rgba(103,177,255,.4)" />
              <text x="25" y="50" fontSize="8" fill="rgba(103,177,255,.8)" fontFamily="'JetBrains Mono',monospace" fontWeight="700">DEFENSIVE SHAPE</text>
              {[[75,74],[70,105],[75,136],[80,90],[80,120]].map(([x,y],i) => (
                <g key={i}>
                  <circle cx={x} cy={y} r="9" fill="#67b1ff" stroke="#fff" strokeWidth="1.5" />
                  <text x={x} y={y+3} textAnchor="middle" fontSize="7" fill="#000" fontWeight="700">D</text>
                </g>
              ))}
              <path d="M95 105 Q180 72 275 56" stroke="#fbbf24" strokeWidth="2.5" fill="none" strokeDasharray="8 3" style={{ animation: "hiwFlow 1.4s linear infinite" }} />
              <circle cx="265" cy="72" r="10" fill="#fbbf24" stroke="#fff" strokeWidth="1.5" />
              <text x="265" y="76" textAnchor="middle" fontSize="7" fill="#000" fontWeight="900">ST</text>
              <text x="200" y="186" textAnchor="middle" fontSize="8" fill="rgba(251,191,36,.8)" fontFamily="'JetBrains Mono',monospace" fontWeight="700">FAST BREAK SPACE</text>
            </>}

            {active === "block" && <>
              <rect x="8" y="135" width="210" height="3" fill="rgba(239,68,68,.4)" />
              <text x="14" y="130" fontSize="8" fill="rgba(239,68,68,.8)" fontFamily="'JetBrains Mono',monospace" fontWeight="700">COMPACT BLOCK</text>
              {[[75,175],[105,175],[135,175],[165,175]].map(([x,y],i) => (
                <g key={i}><circle cx={x} cy={y} r="9" fill="#ef4444" stroke="#fff" strokeWidth="1.5" /><text x={x} y={y+3} textAnchor="middle" fontSize="7" fill="#fff" fontWeight="700">D</text></g>
              ))}
              {[[85,152],[115,150],[145,150],[172,152]].map(([x,y],i) => (
                <g key={i}><circle cx={x} cy={y} r="8" fill="#f97316" stroke="#fff" strokeWidth="1.5" /><text x={x} y={y+3} textAnchor="middle" fontSize="7" fill="#fff">M</text></g>
              ))}
              {[[220,125],[240,108]].map(([x,y],i) => (
                <g key={i}><circle cx={x} cy={y} r="9" fill="rgba(255,255,255,.65)" stroke="#000" strokeWidth="1.5" /><text x={x} y={y+3} textAnchor="middle" fontSize="7" fill="#000">A</text></g>
              ))}
            </>}

            {active === "halfspace" && <>
              <rect x="82" y="6" width="64" height="198" fill="rgba(192,132,252,.06)" stroke="rgba(192,132,252,.22)" strokeWidth="1" strokeDasharray="5 3" />
              <rect x="194" y="6" width="64" height="198" fill="rgba(192,132,252,.06)" stroke="rgba(192,132,252,.22)" strokeWidth="1" strokeDasharray="5 3" />
              <text x="100" y="20" textAnchor="middle" fontSize="8" fill="rgba(192,132,252,.85)" fontFamily="'JetBrains Mono',monospace" fontWeight="700">HALF SPACE</text>
              <text x="226" y="20" textAnchor="middle" fontSize="8" fill="rgba(192,132,252,.85)" fontFamily="'JetBrains Mono',monospace" fontWeight="700">HALF SPACE</text>
              <rect x="146" y="65" width="48" height="46" fill="rgba(239,68,68,.12)" stroke="rgba(239,68,68,.35)" strokeWidth="1" />
              <text x="170" y="92" textAnchor="middle" fontSize="9" fill="rgba(239,68,68,.9)" fontFamily="'JetBrains Mono',monospace" fontWeight="900">GAP</text>
              {[[110,72],[226,72],[170,52]].map(([x,y],i) => (
                <g key={i}><circle cx={x} cy={y} r="10" fill="#c084fc" stroke="#fff" strokeWidth="1.5" /><text x={x} y={y+3} textAnchor="middle" fontSize="7" fill="#fff" fontWeight="700">IF</text></g>
              ))}
              <path d="M110 80 L148 88" stroke="#c084fc" strokeWidth="2" fill="none" strokeDasharray="5 3" style={{ animation: "hiwFlow 1.4s linear infinite" }} />
              <path d="M226 80 L200 88" stroke="#c084fc" strokeWidth="2" fill="none" strokeDasharray="5 3" style={{ animation: "hiwFlow 1.2s linear infinite" }} />
            </>}
          </svg>
        </div>
        {/* Info panel */}
        <div style={{ padding: 14, borderLeft: "1px solid rgba(255,255,255,.07)", background: "#020602", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: t.col, fontFamily: "'Sora',sans-serif" }}>{t.title}</div>
          {t.stats.map(([l, v, c]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 8px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 7 }}>
              <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{l}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: c, fontFamily: "'JetBrains Mono',monospace" }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: "auto", padding: "7px 9px", background: t.col + "0e", borderRadius: 7, fontSize: 9, color: "var(--text-muted)", lineHeight: 1.6 }}>
            <span style={{ color: t.col, fontWeight: 700 }}>Examples: </span>{t.example}
          </div>
        </div>
      </div>
      <div className="hiw-info-panel" style={{ padding: "13px 15px", background: "var(--bg-secondary)" }}>
        <div className="hiw-rule-desc">{t.desc}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   POSITIONS EXPLAINER
───────────────────────────────────── */
const POSITIONS = {
  gk:  { col: "#fbbf24", label: "Goalkeeper", role: "Last line of defence", desc: "The goalkeeper is the only player allowed to handle the ball with their hands, and only within their own penalty area. A modern keeper is far more than just a shot stopper. They are expected to organise the entire defensive shape, command the penalty area for crosses and corners, act as a sweeper when the ball is played behind the defensive line, and increasingly to be a confident ball player who starts attacks with short passes or pinpoint long distribution. Key metrics for evaluating keepers include post shot expected goals (how many of the shots they faced were expected to be goals) and their save percentage above average.", stats: [["Shots faced per game", "3.5"], ["Save percentage", "72%"], ["Key metric", "PSxG"], ["Aerial claim rate", "38%"]], zone: { x: 18, y: 88, w: 38, h: 54 } },
  def: { col: "#67b1ff", label: "Defender", role: "Shape the backline and start attacks", desc: "The defensive unit has transformed dramatically over the past decade. Centre backs are now expected to be technically excellent on the ball, comfortable carrying it forward and able to play sharp passes under pressure into midfield. Fullbacks have become one of the most influential positions in modern football, tasked with overlapping wide to support attacks, delivering crosses, and sometimes cutting inside to shoot or combine. A good defender wins aerial duels, times their tackles, covers space intelligently and communicates constantly with teammates to maintain a coordinated shape.", stats: [["Clearances per game", "4.2"], ["Pass accuracy", "85%"], ["Key metric", "Aerial duels"], ["Interceptions per 90", "2.1"]], zone: { x: 36, y: 42, w: 28, h: 126 } },
  mid: { col: "#28d97a", label: "Midfielder", role: "Engine room of the team", desc: "Midfielders are the most statistically complex players in football because their responsibilities are so varied. A defensive midfielder (holding midfield or pivot) shields the back four by intercepting passes, winning duels and recycling possession simply. A box to box midfielder links defence and attack with high energy runs, covering the most ground of any position at around 12 kilometres per game. An attacking midfielder or number 10 operates between the lines, finding pockets of space, playing the killer pass and arriving late into the penalty area to score. Expected assists is the primary metric for creative midfielders.", stats: [["Distance covered per 90", "12km"], ["Pass accuracy", "88%"], ["Key metric", "xA and pressures"], ["Recoveries per 90", "3.2"]], zone: { x: 50, y: 32, w: 56, h: 146 } },
  fwd: { col: "#ef4444", label: "Forward", role: "Score goals and unsettle defences", desc: "Forwards are judged primarily on goals and assists, but the modern forward does much more. From the front they initiate the press, setting the defensive shape for the entire team by cutting off passing lanes with their movement. A centre forward holds up play under pressure, bringing wide players and midfielders into the game with clever link up play. Wide forwards and wingers need to be unpredictable in one on one situations, capable of cutting inside to shoot or staying wide to cross. Expected goals (xG) is the fairest way to evaluate forwards because it accounts for the quality and difficulty of the chances they receive, not just how many they convert.", stats: [["Shots per game", "2.8"], ["xG per 90", "0.35"], ["Key metric", "xG and xA"], ["Conversion rate", "14%"]], zone: { x: 90, y: 45, w: 38, h: 130 } },
};

function PositionsCard() {
  const [pos, setPos] = useState("gk");
  const isMobile = useIsMobile();
  const p = POSITIONS[pos];
  return (
    <div className="hiw-card">
      <div className="hiw-top-border" style={{ background: `linear-gradient(90deg,${p.col},${p.col}66,${p.col})`, backgroundSize: "300% 100%" }} />
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,.07)", background: "#050505" }}>
        {Object.entries(POSITIONS).map(([k, v]) => (
          <button key={k} className="hiw-tab" onClick={() => setPos(k)} style={{ color: pos === k ? v.col : "rgba(255,255,255,.35)", borderBottomColor: pos === k ? v.col : "transparent", background: pos === k ? v.col + "14" : "none" }}>
            {k.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="hiw-info-panel" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "130px 1fr", background: "var(--bg-tertiary)" }}>
        {/* Mini pitch */}
        <div style={{ borderRight: "1px solid rgba(255,255,255,.07)", padding: 4 }}>
          <svg width="122" height="175" viewBox="0 0 122 175">
            {[0,28,56,84,112,140].map(y => <rect key={y} x="0" y={y} width="122" height="18" fill="rgba(255,255,255,.012)" />)}
            <rect x="4" y="4" width="114" height="167" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.2" />
            <line x1="4" y1="87" x2="118" y2="87" stroke="rgba(255,255,255,.15)" strokeWidth=".8" />
            <circle cx="61" cy="87" r="18" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth=".8" />
            <rect x="4" y="54" width="28" height="67" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth=".8" />
            <rect x="90" y="54" width="28" height="67" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth=".8" />
            {/* Zone highlight */}
            <rect x={p.zone.x} y={p.zone.y} width={p.zone.w} height={p.zone.h} fill={p.col + "18"} stroke={p.col + "50"} strokeWidth="1.5" rx="3" />
            {/* Position icon */}
            <circle cx={p.zone.x + p.zone.w / 2} cy={p.zone.y + p.zone.h / 2} r="11" fill={p.col + "30"} stroke={p.col} strokeWidth="2" />
            <text x={p.zone.x + p.zone.w / 2} y={p.zone.y + p.zone.h / 2 + 4} textAnchor="middle" fontSize="9" fill={p.col} fontWeight="900" fontFamily="'Sora',sans-serif">{pos.toUpperCase()}</text>
          </svg>
        </div>
        {/* Stats */}
        <div style={{ padding: "12px 14px" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: p.col, fontFamily: "'Sora',sans-serif", marginBottom: 2 }}>{p.label}</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "var(--text-dim)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>{p.role}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(100px,1fr))", gap: 6 }}>
            {p.stats.map(([l, v]) => (
              <div key={l} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 8, padding: "7px 9px" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: p.col, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{v}</div>
                <div style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 700, letterSpacing: ".07em", marginTop: 2, textTransform: "uppercase" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="hiw-info-panel" style={{ padding: "13px 15px", background: "var(--bg-secondary)" }}>
        <div className="hiw-rule-desc">{p.desc}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   STAT GLOSSARY
───────────────────────────────────── */
const STATS_GLOSSARY = [
  { key: "xg", abbr: "xG", full: "Expected Goals", col: "#ef4444", desc: "Every shot in football gets a quality score between 0 and 1 based on exactly where it was taken from, at what angle, with which body part and in what game situation. A tap-in from two metres scores around 0.79, meaning it results in a goal 79 percent of the time. A speculative 35 yard effort might score 0.03. Adding up all a team or player's shot quality gives you xG. This tells you whether goals are a fair reflection of how a team played or whether they are running lucky or unlucky.", visual: "pitch" },
  { key: "xa", abbr: "xA", full: "Expected Assists", col: "#28d97a", desc: "Expected assists works the same way as xG but measures the quality of passes that lead to shots, rather than the shots themselves. If a midfielder plays a perfect cut back to a striker who is two metres from goal, the passer gets a high xA value regardless of whether the striker scores. This makes xA a much fairer way to measure a player's creative output than raw assists, which depend heavily on the finishing ability of teammates.", visual: "bar" },
  { key: "ppda", abbr: "PPDA", full: "Passes Allowed Per Defensive Action", col: "#fbbf24", desc: "PPDA measures how aggressively a team presses the opposition. It counts how many passes the opponent is allowed to make before a defending player makes a tackle, interception or foul. A low PPDA number means the team is pressing very intensely, winning the ball back quickly after only a few passes. A high PPDA number suggests a passive, deep defensive approach. Top pressing teams like Liverpool and Manchester City typically record a PPDA of 6 to 8, while deep blocking teams may have a PPDA above 13.", visual: "bar" },
  { key: "elo", abbr: "Elo", full: "Elo Rating System", col: "#67b1ff", desc: "The Elo rating system was originally invented for chess but has been adapted for football. Every team starts with a base rating and gains or loses points after each match. The critical feature is that you gain more points for beating a stronger opponent and fewer points for beating a weaker one. Losing to a strong team also costs fewer points than losing to a weak team. This makes the Elo rating a much more sensitive measure of current form and true team strength than the league table, which cannot capture the quality of opposition faced.", visual: "line" },
];

function StatGlossarySection() {
  const [hov, setHov] = useState(null);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
      {STATS_GLOSSARY.map(s => (
        <div key={s.key} className="hiw-card" onMouseEnter={() => setHov(s.key)} onMouseLeave={() => setHov(null)}>
          <div className="hiw-top-border" style={{ background: `linear-gradient(90deg,${s.col},${s.col}55,${s.col})`, backgroundSize: "300% 100%" }} />
          <Scene height={90} bg="#050508">
            <svg width="100%" height="90" viewBox="0 0 280 90" preserveAspectRatio="xMidYMid meet">
              {s.visual === "pitch" && <>
                <rect x="4" y="4" width="120" height="82" fill="#031503" stroke="rgba(255,255,255,.12)" strokeWidth="1" rx="4" />
                <rect x="4" y="4" width="28" height="82" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth=".8" />
                <circle cx="18" cy="45" r="10" fill="rgba(239,68,68,.55)" stroke="#ef4444" strokeWidth="2" />
                <text x="18" y="48" textAnchor="middle" fontSize="7" fill="#fff" fontWeight="700">0.79</text>
                <circle cx="38" cy="45" r="8" fill="rgba(239,68,68,.35)" stroke="#f97316" strokeWidth="1.5" />
                <text x="38" y="48" textAnchor="middle" fontSize="6.5" fill="#fff">0.38</text>
                <circle cx="60" cy="38" r="6" fill="rgba(251,191,36,.25)" stroke="#fbbf24" strokeWidth="1" />
                <text x="60" y="41" textAnchor="middle" fontSize="5.5" fill="#fff">0.12</text>
                <circle cx="90" cy="35" r="4.5" fill="rgba(52,211,153,.2)" stroke="#34d399" strokeWidth="1" />
                <text x="90" y="38" textAnchor="middle" fontSize="5" fill="#fff">0.04</text>
                <circle cx="115" cy="30" r="3" fill="rgba(96,165,250,.15)" stroke="#60a5fa" strokeWidth="1" />
                <text x="205" y="30" textAnchor="middle" fontSize="32" fontWeight="900" fill={s.col} fontFamily="'JetBrains Mono',monospace" style={{ opacity: .18 }}>{s.abbr}</text>
              </>}
              {s.visual === "bar" && <>
                {[["Penalty", 79, "#ef4444", 14], ["Header close", 38, "#f97316", 38], ["Box shot", 22, "#fbbf24", 62], ["Wide angle", 8, "#34d399", 80]].map(([l, pct, c, y]) => (
                  <g key={l}>
                    <text x="6" y={y + 4} fontSize="7.5" fill="rgba(255,255,255,.45)">{l}</text>
                    <rect x="80" y={y - 6} width="160" height="9" fill="rgba(255,255,255,.06)" rx="4" />
                    <rect x="80" y={y - 6} width={hov === s.key ? pct * 1.6 : 0} height="9" fill={c} rx="4"
                      style={{ transition: hov === s.key ? "width 0.8s cubic-bezier(.22,1,.36,1)" : "width .3s" }} />
                    <text x={84 + (hov === s.key ? pct * 1.6 : 0) + 4} y={y + 4} fontSize="7.5" fill={c} fontFamily="'JetBrains Mono',monospace" fontWeight="700"
                      style={{ transition: hov === s.key ? "all .8s" : "all .3s" }}>{pct}%</text>
                  </g>
                ))}
              </>}
              {s.visual === "line" && <>
                <svg viewBox="0 0 280 90" width="280" height="90">
                  <path d="M10,75 Q40,68 70,70 Q100,65 130,55 Q160,42 190,34 Q220,22 250,16" fill="none" stroke={s.col} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="300"
                    style={{ strokeDashoffset: hov === s.key ? 0 : 300, transition: "stroke-dashoffset 1.4s cubic-bezier(.22,1,.36,1)" }} />
                  <line x1="10" y1="44" x2="258" y2="44" stroke="rgba(255,255,255,.08)" strokeWidth="1" strokeDasharray="4 3" />
                  <text x="12" y="40" fontSize="7" fill="rgba(255,255,255,.25)" fontFamily="'JetBrains Mono',monospace">avg</text>
                  {hov === s.key && <circle cx="250" cy="16" r="4" fill={s.col} />}
                  <text x="10" y="86" fontSize="7" fill="rgba(255,255,255,.2)" fontFamily="'JetBrains Mono',monospace">GW1</text>
                  <text x="220" y="86" fontSize="7" fill="rgba(255,255,255,.2)" fontFamily="'JetBrains Mono',monospace">GW34</text>
                  <text x="200" y="38" fontSize="24" fontWeight="900" fill={s.col} fontFamily="'JetBrains Mono',monospace" style={{ opacity: .12 }}>{s.abbr}</text>
                </svg>
              </>}
            </svg>
          </Scene>
          <div className="hiw-info-panel" style={{ padding: "12px 14px", background: "var(--bg-secondary)" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: s.col, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{s.abbr}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{s.full}</span>
            </div>
            <div className="hiw-rule-desc">{s.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────
   MATCH STRUCTURE TIMELINE
───────────────────────────────────── */
function MatchStructureCard() {
  return (
    <div className="hiw-card">
      <div className="hiw-top-border" style={{ background: "linear-gradient(90deg,#28d97a,#fbbf24,#ef4444,#a78bfa)", backgroundSize: "300% 100%" }} />
      <div className="hiw-info-panel" style={{ padding: "16px 18px", background: "var(--bg-secondary)" }}>
        {/* Visual timeline */}
        <div style={{ position: "relative", height: 60, marginBottom: 14 }}>
          <div style={{ position: "absolute", top: 22, left: 0, right: 0, height: 10, background: "rgba(255,255,255,.06)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, width: "45%", height: "100%", background: "rgba(40,217,122,.4)", borderRadius: "999px 0 0 999px" }} />
            <div style={{ position: "absolute", left: "45%", width: "5%", height: "100%", background: "rgba(255,255,255,.1)" }} />
            <div style={{ position: "absolute", left: "50%", width: "44%", height: "100%", background: "rgba(103,177,255,.35)" }} />
            <div style={{ position: "absolute", left: "94%", width: "6%", height: "100%", background: "rgba(251,191,36,.5)", borderRadius: "0 999px 999px 0" }} />
          </div>
          {[["0'", "0%", "#28d97a"], ["45'", "44%", "#28d97a"], ["HT", "47.5%", "rgba(255,255,255,.4)"], ["90'", "94%", "#67b1ff"], ["ET", "97%", "#fbbf24"]].map(([l, left, c]) => (
            <div key={l} style={{ position: "absolute", top: 8, left, fontSize: 9, fontWeight: 700, color: c, fontFamily: "'JetBrains Mono',monospace", transform: "translateX(-50%)" }}>{l}</div>
          ))}
          {[["1st Half", "22%", "rgba(40,217,122,.7)"], ["2nd Half", "72%", "rgba(103,177,255,.7)"], ["ET", "97%", "rgba(251,191,36,.7)"]].map(([l, left, c]) => (
            <div key={l} style={{ position: "absolute", top: 38, left, fontSize: 8, color: c, fontWeight: 700, transform: "translateX(-50%)" }}>{l}</div>
          ))}
        </div>
        {/* Stat tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(88px,1fr))", gap: 7 }}>
          {[["90", "Standard mins", "#28d97a"], ["+5", "Avg stoppage", "#fbbf24"], ["15", "Half time break", "#67b1ff"], ["30", "Extra time mins", "#ef4444"], ["5", "Penalty shootout", "#a78bfa"]].map(([v, l, c]) => (
            <div key={l} style={{ background: c + "09", border: `1px solid ${c}22`, borderRadius: 9, padding: "9px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: c, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 700, letterSpacing: ".07em", marginTop: 3, textTransform: "uppercase", lineHeight: 1.4 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.7 }}>
          A standard football match lasts 90 minutes divided into two halves of 45 minutes each. Unlike basketball or American football, the clock never stops when play is interrupted. Instead the referee adds extra time at the end of each half to compensate for delays such as injuries, substitutions and goal celebrations. If a knockout match is level after 90 minutes, two additional periods of 15 minutes each (extra time) are played. If scores are still level, a penalty shootout decides the winner.
        </div>
      </div>
    </div>
  );
}


/* ─────────────────────────────────────
   MAIN PAGE
───────────────────────────────────── */
export default function HowItWorksPage() {
  const isMobile = useIsMobile();
  return (
    <div className="hiw-page">
      <style>{CSS}</style>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: isMobile ? "20px 14px 80px" : "32px 20px 80px" }}>

        {/* Hero header */}
        <div style={{ marginBottom: 48, paddingBottom: 24, borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
            <div style={{ width: 4, height: 52, borderRadius: 2, background: "linear-gradient(180deg,var(--green),var(--blue))", flexShrink: 0 }} />
            <div>
              <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: "clamp(26px,4vw,38px)", fontWeight: 900, letterSpacing: "-0.03em", margin: 0, color: "var(--text)" }}>
                How Football Works
              </h1>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0", fontWeight: 500 }}>
                Rules, tactics, positions and statistics explained graphically. Hover any card to start the animations.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Rules */}
        <div style={{ marginBottom: 52 }}>
          <div className="hiw-section-head">
            <div className="hiw-section-bar" style={{ background: "linear-gradient(180deg,#ef4444,transparent)" }} />
            <div>
              <div className="hiw-section-title" style={{ color: "#ef4444" }}>The Rules</div>
              <div className="hiw-section-sub">The fundamental laws that govern every match. Hover each card to animate.</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <OffsideCard />
            <PenaltyCard />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <FreeKickCard />
            <CardsCard />
            <RestartsCard />
          </div>
          <MatchStructureCard />
        </div>

        {/* Section 2: Tactics */}
        <div style={{ marginBottom: 52 }}>
          <div className="hiw-section-head">
            <div className="hiw-section-bar" style={{ background: "linear-gradient(180deg,#28d97a,transparent)" }} />
            <div>
              <div className="hiw-section-title" style={{ color: "#28d97a" }}>Tactics and Systems</div>
              <div className="hiw-section-sub">How teams organise themselves with and without the ball. Click the tabs to switch tactics.</div>
            </div>
          </div>
          <TacticsBoardCard />
        </div>

        {/* Section 3: Positions */}
        <div style={{ marginBottom: 52 }}>
          <div className="hiw-section-head">
            <div className="hiw-section-bar" style={{ background: "linear-gradient(180deg,#67b1ff,transparent)" }} />
            <div>
              <div className="hiw-section-title" style={{ color: "#67b1ff" }}>Positions Explained</div>
              <div className="hiw-section-sub">What each player is responsible for on the pitch. Click GK, DEF, MID or FWD.</div>
            </div>
          </div>
          <PositionsCard />
        </div>

        {/* Section 4: Stat glossary */}
        <div>
          <div className="hiw-section-head">
            <div className="hiw-section-bar" style={{ background: "linear-gradient(180deg,#fbbf24,transparent)" }} />
            <div>
              <div className="hiw-section-title" style={{ color: "#fbbf24" }}>The Stats Glossary</div>
              <div className="hiw-section-sub">The numbers behind every StatinSite prediction. Hover to animate each graphic.</div>
            </div>
          </div>
          <StatGlossarySection />
        </div>

      </div>
    </div>
  );
}