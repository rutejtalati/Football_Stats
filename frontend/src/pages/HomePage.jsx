// HomePage.jsx — StatinSite v4 (Ultimate Enhancement with Animated Graphics)
// ═══════════════════════════════════════════════════════════════════════════════════
// DESIGN DNA: Hero preserved, cards enhanced with animated graphics, no emojis
// FEATURES: Animated SVG graphics, smooth hover effects, professional styling
// ═══════════════════════════════════════════════════════════════════════════════════
import { Link } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
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

/* ─── Design tokens ─────────────────────────────────────── */
const C = {
  blue:"#4f9eff",   blueGlow:"rgba(79,158,255,0.35)",
  green:"#00e09e",  greenGlow:"rgba(0,224,158,0.28)",
  red:"#ff4d6d",    redGlow:"rgba(255,77,109,0.28)",
  gold:"#f2c94c",   goldGlow:"rgba(242,201,76,0.28)",
  purple:"#b388ff", purpleGlow:"rgba(179,136,255,0.28)",
  orange:"#ff8c42", teal:"#2dd4bf", pink:"#f472b6",
  panel:"rgba(12,18,30,0.95)",
  line:"rgba(255,255,255,0.07)",
  text:"#e8f0ff", muted:"#4a6a8a", soft:"#2a3f58",
};

/* ─── Global styles with advanced animations ─────── */
const HOME_CSS = `
  @keyframes fadeDown  { from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeUp    { from{opacity:0;transform:translateY(14px)}  to{opacity:1;transform:translateY(0)} }
  @keyframes cardIn    { from{opacity:0;transform:translateY(20px) scale(0.95)}  to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes livePulse { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(79,158,255,0.5)} 50%{opacity:.7;box-shadow:0 0 0 6px transparent} }
  @keyframes floatP    { 0%{transform:translateY(0)} 50%{transform:translateY(-20px)} 100%{transform:translateY(0)} }
  @keyframes tickerMove{ 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes orbFloat  { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(24px,-16px) scale(1.06)} 66%{transform:translate(-12px,20px) scale(.95)} 100%{transform:translate(0,0) scale(1)} }
  @keyframes pitchPulse{ 0%,100%{opacity:.04} 50%{opacity:.08} }
  @keyframes barGrow   { from{height:0} to{height:var(--h)} }
  @keyframes radarSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes countUp   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shimmer   { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes glow      { 0%,100%{box-shadow:0 0 12px currentColor} 50%{box-shadow:0 0 28px currentColor} }
  @keyframes ballMove  { 0%{cx:30} 50%{cx:90} 100%{cx:30} }
  @keyframes dashDraw  { to{stroke-dashoffset:0} }
  
  /* Enhanced animations */
  @keyframes graphicBounce {
    0%, 100% { transform: scale(1) translateY(0); }
    50% { transform: scale(1.08) translateY(-8px); }
  }
  
  @keyframes chartFlow {
    0% { opacity: 0.5; }
    50% { opacity: 1; }
    100% { opacity: 0.5; }
  }
  
  @keyframes radarGlow {
    0%, 100% { filter: drop-shadow(0 0 2px currentColor); }
    50% { filter: drop-shadow(0 0 12px currentColor); }
  }
  
  @keyframes fieldFlow {
    0% { opacity: 0.4; }
    100% { opacity: 0.8; }
  }
  
  @keyframes squadFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  
  @keyframes graphGrow {
    0% { transform: scaleY(0.5); }
    100% { transform: scaleY(1); }
  }
  
  @keyframes playerSpin {
    0% { transform: rotate(0deg) scale(1); }
    100% { transform: rotate(360deg) scale(1); }
  }
  
  @keyframes statsWave {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  
  /* Hover state animations */
  .hp-card { 
    transition: all 320ms cubic-bezier(0.22,1,0.36,1);
    position: relative;
  }
  .hp-card:hover { 
    transform: translateY(-12px) scale(1.03);
    box-shadow: 0 32px 80px rgba(0,0,0,0.5), inset 0 0 60px rgba(79,158,255,0.08);
  }
  
  .hp-card-graphic-container {
    transition: all 500ms cubic-bezier(0.22,1,0.36,1);
  }
  .hp-card:hover .hp-card-graphic-container {
    transform: scale(1.12) rotateY(8deg);
    filter: brightness(1.2) drop-shadow(0 8px 24px rgba(79,158,255,0.4));
  }
  
  .hp-card:hover .graphic-animated {
    animation: graphicBounce 600ms ease-in-out infinite;
  }
  
  .hp-btn  { 
    transition: all 200ms cubic-bezier(0.22,1,0.36,1);
    cursor: pointer; 
  }
  .hp-btn:hover  { 
    filter: brightness(1.2);
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.4);
  }
  .hp-tag:hover  { transform: translateY(-2px); }
  
  .stat-tile {
    transition: all 320ms cubic-bezier(0.22,1,0.36,1);
  }
  .stat-tile:hover {
    transform: translateY(-6px) scale(1.02);
  }
`;

/* ─── Animated Graphic Components ─────────────────────── */

// 1. Match Predictions - Football Field Heat Map
function PredictionGraphic() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" className="graphic-animated" style={{width:"100%", height:"100%"}}>
      <defs>
        <linearGradient id="fieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4f9eff" stopOpacity="0.4"/>
          <stop offset="100%" stopColor="#00e09e" stopOpacity="0.2"/>
        </linearGradient>
      </defs>
      {/* Field outline */}
      <rect x="8" y="15" width="84" height="70" rx="3" fill="url(#fieldGrad)" stroke="#4f9eff" strokeWidth="1" opacity="0.6"/>
      {/* Center line */}
      <line x1="50" y1="15" x2="50" y2="85" stroke="#4f9eff" strokeWidth="0.8" opacity="0.4" strokeDasharray="2,2"/>
      {/* Heat points - animated */}
      <circle cx="35" cy="30" r="2.5" fill="#4f9eff" opacity="0.9">
        <animate attributeName="r" values="2.5;4;2.5" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="50" cy="25" r="2" fill="#4f9eff" opacity="0.7">
        <animate attributeName="r" values="2;3.5;2" dur="2.4s" repeatCount="indefinite"/>
      </circle>
      <circle cx="65" cy="35" r="1.8" fill="#00e09e" opacity="0.6">
        <animate attributeName="r" values="1.8;3;1.8" dur="2.2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="42" cy="50" r="2.2" fill="#4f9eff" opacity="0.8">
        <animate attributeName="r" values="2.2;3.8;2.2" dur="2.1s" repeatCount="indefinite"/>
      </circle>
      <circle cx="58" cy="55" r="2" fill="#00e09e" opacity="0.7">
        <animate attributeName="r" values="2;3.2;2" dur="2.3s" repeatCount="indefinite"/>
      </circle>
      <circle cx="50" cy="70" r="2.3" fill="#4f9eff" opacity="0.85">
        <animate attributeName="r" values="2.3;4.2;2.3" dur="2.5s" repeatCount="indefinite"/>
      </circle>
      {/* Goal areas */}
      <rect x="8" y="38" width="6" height="24" fill="none" stroke="#4f9eff" strokeWidth="0.6" opacity="0.3"/>
      <rect x="86" y="38" width="6" height="24" fill="none" stroke="#4f9eff" strokeWidth="0.6" opacity="0.3"/>
    </svg>
  );
}

// 2. Best XI Builder - Formation (11 dots)
function BuilderGraphic() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" className="graphic-animated" style={{width:"100%", height:"100%"}}>
      {/* Formation positions - 4-3-3 */}
      {/* Goalkeeper */}
      <circle cx="50" cy="15" r="3.5" fill="#00e09e" opacity="0.9">
        <animate attributeName="cy" values="15;12;15" dur="2.8s" repeatCount="indefinite"/>
        <animate attributeName="r" values="3.5;4.5;3.5" dur="2.8s" repeatCount="indefinite"/>
      </circle>
      
      {/* Defense line (4 players) */}
      {[20, 35, 65, 80].map((cx, i) => (
        <circle key={`def-${i}`} cx={cx} cy="35" r="3" fill="#4f9eff" opacity="0.85">
          <animate attributeName="cy" values="35;32;35" dur={`${2.6 + i*0.1}s`} repeatCount="indefinite"/>
        </circle>
      ))}
      
      {/* Midfield line (3 players) */}
      {[30, 50, 70].map((cx, i) => (
        <circle key={`mid-${i}`} cx={cx} cy="55" r="2.8" fill="#f2c94c" opacity="0.8">
          <animate attributeName="cy" values="55;52;55" dur={`${2.5 + i*0.15}s`} repeatCount="indefinite"/>
        </circle>
      ))}
      
      {/* Forward line (3 players) */}
      {[25, 50, 75].map((cx, i) => (
        <circle key={`fwd-${i}`} cx={cx} cy="78" r="3" fill="#ff4d6d" opacity="0.85">
          <animate attributeName="cy" values="78;75;78" dur={`${2.7 + i*0.12}s`} repeatCount="indefinite"/>
        </circle>
      ))}
      
      {/* Connecting lines for field */}
      <line x1="15" y1="40" x2="85" y2="40" stroke="#4f9eff" strokeWidth="0.5" opacity="0.2"/>
      <line x1="15" y1="60" x2="85" y2="60" stroke="#4f9eff" strokeWidth="0.5" opacity="0.2"/>
    </svg>
  );
}

// 3. Squad Builder - Ascending bars (chart)
function SquadGraphic() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" className="graphic-animated" style={{width:"100%", height:"100%"}}>
      <defs>
        <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f2c94c" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#f2c94c" stopOpacity="0.3"/>
        </linearGradient>
      </defs>
      {/* Animated bars ascending */}
      {[20, 35, 50, 65, 80].map((cx, i) => {
        const heights = [25, 40, 55, 70, 85];
        const height = heights[i];
        return (
          <g key={`bar-${i}`}>
            <rect x={cx-6} y={100-height} width="12" height={height} fill="url(#barGrad)" rx="1.5">
              <animate attributeName="y" values={`${100-height};${100-height-5};${100-height}`} dur={`${2.2 + i*0.15}s`} repeatCount="indefinite"/>
              <animate attributeName="height" values={`${height};${height+5};${height}`} dur={`${2.2 + i*0.15}s`} repeatCount="indefinite"/>
            </rect>
          </g>
        );
      })}
      {/* Base line */}
      <line x1="10" y1="90" x2="90" y2="90" stroke="#f2c94c" strokeWidth="1" opacity="0.4"/>
    </svg>
  );
}

// 4. Player Insight - Radar chart (hexagon)
function InsightGraphic() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" className="graphic-animated" style={{width:"100%", height:"100%"}}>
      {/* Hexagon radar */}
      <g transform="translate(50,50)">
        {/* Background hexagons */}
        <polygon points="0,-30 26,-15 26,15 0,30 -26,15 -26,-15" fill="none" stroke="#b388ff" strokeWidth="0.8" opacity="0.2"/>
        <polygon points="0,-20 17,-10 17,10 0,20 -17,10 -17,-10" fill="none" stroke="#b388ff" strokeWidth="0.6" opacity="0.15"/>
        <polygon points="0,-10 8,-5 8,5 0,10 -8,5 -8,-5" fill="none" stroke="#b388ff" strokeWidth="0.5" opacity="0.1"/>
        
        {/* Animated data polygon */}
        <g>
          <polygon points="0,-28 24,-14 22,16 -2,28 -24,14 -20,-12" fill="#b388ff" opacity="0.25" stroke="#b388ff" strokeWidth="1.2">
            <animate attributeName="points" 
              values="0,-28 24,-14 22,16 -2,28 -24,14 -20,-12; 0,-32 28,-16 25,18 -2,32 -28,16 -23,-14; 0,-28 24,-14 22,16 -2,28 -24,14 -20,-12"
              dur="3s" repeatCount="indefinite"/>
          </polygon>
        </g>
        
        {/* Vertex points */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x = Math.cos(rad) * 22;
          const y = Math.sin(rad) * 22;
          return (
            <circle key={`vertex-${i}`} cx={x} cy={y} r="2.5" fill="#b388ff" opacity="0.8">
              <animate attributeName="r" values="2.5;3.5;2.5" dur={`${2.4 + i*0.2}s`} repeatCount="indefinite"/>
            </circle>
          );
        })}
      </g>
    </svg>
  );
}

// 5. GW Insights - Signal wave
function InsightsGraphic() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" className="graphic-animated" style={{width:"100%", height:"100%"}}>
      <defs>
        <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.3"/>
          <stop offset="50%" stopColor="#2dd4bf" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.3"/>
        </linearGradient>
      </defs>
      {/* Wave signal */}
      <path d="M10,50 Q20,35 30,50 T50,50 T70,50 T90,50" 
        fill="none" stroke="url(#waveGrad)" strokeWidth="2.5" strokeLinecap="round">
        <animate attributeName="d" 
          values="M10,50 Q20,35 30,50 T50,50 T70,50 T90,50; M10,50 Q20,40 30,50 T50,50 T70,50 T90,50; M10,50 Q20,35 30,50 T50,50 T70,50 T90,50"
          dur="2.5s" repeatCount="indefinite"/>
      </path>
      
      {/* Radio circles - concentric */}
      {[15, 25, 35].map((r, i) => (
        <circle key={`ring-${i}`} cx="50" cy="50" r={r} fill="none" stroke="#2dd4bf" strokeWidth="0.8" opacity={0.7 - i*0.2}>
          <animate attributeName="r" values={`${r};${r+8};${r}`} dur={`${2.2 + i*0.3}s`} repeatCount="indefinite"/>
          <animate attributeName="opacity" values={`${0.7 - i*0.2};0;${0.7 - i*0.2}`} dur={`${2.2 + i*0.3}s`} repeatCount="indefinite"/>
        </circle>
      ))}
      
      {/* Center point */}
      <circle cx="50" cy="50" r="3.5" fill="#2dd4bf" opacity="0.9">
        <animate attributeName="r" values="3.5;4.5;3.5" dur="1.5s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}

// 6. Player Stats Table - Stacked bars
function StatsGraphic() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" className="graphic-animated" style={{width:"100%", height:"100%"}}>
      {/* Three row stacked bars */}
      {[25, 50, 75].map((y, row) => (
        <g key={`row-${row}`}>
          {[20, 40, 60, 80].map((x, col) => {
            const lengths = [
              [25, 35, 20, 15],
              [30, 25, 35, 18],
              [20, 30, 25, 32]
            ];
            const colors = ['#f472b6', '#4f9eff', '#00e09e', '#f2c94c'];
            return (
              <rect key={`bar-${row}-${col}`} 
                x={x} y={y-4} width={lengths[row][col]/5} height="8" 
                fill={colors[col]} opacity="0.8" rx="1">
                <animate attributeName="width" 
                  values={`${lengths[row][col]/5};${lengths[row][col]/4};${lengths[row][col]/5}`}
                  dur={`${2.3 + col*0.15}s`} repeatCount="indefinite"/>
              </rect>
            );
          })}
        </g>
      ))}
    </svg>
  );
}

// 7. Live Matches - Ball movement
function LiveGraphic() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" className="graphic-animated" style={{width:"100%", height:"100%"}}>
      {/* Field */}
      <rect x="10" y="15" width="80" height="70" rx="2" fill="none" stroke="#ff4d6d" strokeWidth="0.8" opacity="0.3"/>
      <line x1="50" y1="15" x2="50" y2="85" stroke="#ff4d6d" strokeWidth="0.6" opacity="0.2"/>
      
      {/* Center circle */}
      <circle cx="50" cy="50" r="8" fill="none" stroke="#ff4d6d" strokeWidth="0.8" opacity="0.2"/>
      <circle cx="50" cy="50" r="2" fill="#ff4d6d" opacity="0.4"/>
      
      {/* Animated ball with trail */}
      <g>
        {/* Trail dots */}
        {[0, 1, 2, 3].map(i => (
          <circle key={`trail-${i}`} cx="30" cy="30" r="2.5-i" fill="#ff4d6d" opacity={0.4 - i*0.1}>
            <animate attributeName="cx" 
              values="30;60;30" dur="3s" repeatCount="indefinite" begin={`${-i*0.3}s`}/>
            <animate attributeName="cy" 
              values="30;70;30" dur="3s" repeatCount="indefinite" begin={`${-i*0.3}s`}/>
          </circle>
        ))}
        {/* Main ball */}
        <circle cx="30" cy="30" r="3.5" fill="#ff4d6d" opacity="0.95">
          <animate attributeName="cx" values="30;60;30" dur="3s" repeatCount="indefinite"/>
          <animate attributeName="cy" values="30;70;30" dur="3s" repeatCount="indefinite"/>
          <animate attributeName="r" values="3.5;4;3.5" dur="3s" repeatCount="indefinite"/>
        </circle>
      </g>
    </svg>
  );
}

// 8. Ground Zero - Molecule/Network
function LearnGraphic() {
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" fill="none" className="graphic-animated" style={{width:"100%", height:"100%"}}>
      {/* Central node */}
      <circle cx="50" cy="50" r="4" fill="#f472b6" opacity="0.95">
        <animate attributeName="r" values="4;5.5;4" dur="2s" repeatCount="indefinite"/>
      </circle>
      
      {/* Outer nodes and connections */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = 50 + Math.cos(rad) * 28;
        const y = 50 + Math.sin(rad) * 28;
        
        return (
          <g key={`node-${i}`}>
            {/* Connection line */}
            <line x1="50" y1="50" x2={x} y2={y} stroke="#f472b6" strokeWidth="0.8" opacity="0.4">
              <animate attributeName="opacity" values="0.4;0.7;0.4" dur={`${2.5 + i*0.15}s`} repeatCount="indefinite"/>
            </line>
            {/* Outer node */}
            <circle cx={x} cy={y} r="2.5" fill="#f472b6" opacity="0.75">
              <animate attributeName="r" values="2.5;3.5;2.5" dur={`${2.3 + i*0.2}s`} repeatCount="indefinite"/>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Animated count-up ─────────────────────────────────── */
function useCountUp(target, duration=1800, delay=0) {
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

/* ─── Dynamic stat tile ─────────────────────────────────── */
function StatTile({ value, suffix="", label, color, delay=0, icon, trend }) {
  const [v, ref] = useCountUp(value, 1600, delay);
  const [hov, setHov] = useState(false);
  return (
    <div ref={ref}
      className="stat-tile"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", flexDirection:"column", gap:8,
        padding:"20px 22px", borderRadius:16,
        background: hov ? `linear-gradient(135deg,rgba(12,18,30,0.98),${color}12)` : "rgba(255,255,255,0.025)",
        border:`1px solid ${hov ? color+"55" : "rgba(255,255,255,0.07)"}`,
        flex:1, minWidth:0, position:"relative", overflow:"hidden",
        transition:"all 320ms cubic-bezier(0.22,1,0.36,1)",
        transform: hov ? "translateY(-6px) scale(1.02)" : "translateY(0) scale(1)",
        boxShadow: hov ? `0 12px 40px ${color}28, inset 0 0 20px ${color}08` : "0 0 0px transparent",
        cursor:"default",
      }}>
      <div style={{
        position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",
        background:color,opacity:hov?.15:.05,filter:"blur(28px)",transition:"all 320ms cubic-bezier(0.22,1,0.36,1)",
        pointerEvents:"none",transform:hov?"scale(1.2)":"scale(1)"
      }}/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{
          fontSize:24,lineHeight:1,opacity:hov?1:0.8,
          transition:"all 320ms cubic-bezier(0.22,1,0.36,1)",
          filter:hov?`drop-shadow(0 0 12px ${color}88)`:"drop-shadow(0 0 0px transparent)"
        }}>
          {icon}
        </div>
        {trend && (
          <span style={{
            fontSize:9,fontWeight:800,color:C.green,background:`${C.green}14`,
            border:`1px solid ${C.green}30`,padding:"2px 7px",borderRadius:999,letterSpacing:"0.06em",
            transition:"all 180ms ease",transform:hov?"scale(1.05)":"scale(1)"
          }}>
            {trend}
          </span>
        )}
      </div>
      <div style={{display:"flex",alignItems:"baseline",gap:2}}>
        <span style={{
          fontSize:36, fontWeight:900, fontFamily:"'JetBrains Mono',monospace",
          color, lineHeight:1, letterSpacing:"-0.03em",
          textShadow:hov?`0 0 32px ${color}99`:`0 0 16px ${color}55`,
          transition:"text-shadow 320ms cubic-bezier(0.22,1,0.36,1)",
        }}>{v.toLocaleString()}</span>
        <span style={{fontSize:16,fontWeight:700,color,opacity:.8,transition:"opacity 320ms"}}>{suffix}</span>
      </div>
      <span style={{fontSize:9,fontWeight:800,color:C.muted,
        letterSpacing:"0.12em",textTransform:"uppercase",fontFamily:"'Inter',sans-serif"}}>
        {label}
      </span>
      <div style={{height:2,borderRadius:1,background:"rgba(255,255,255,0.05)"}}>
        <div style={{
          height:"100%",width:hov?"100%":"40%",background:color,borderRadius:1,
          transition:"width 600ms cubic-bezier(0.22,1,0.36,1)",opacity:.7
        }}/>
      </div>
    </div>
  );
}

/* ─── Enhanced Feature Card with animated graphics ──────── */
function FeatureCard({ to, title, desc, color, gradient, Graphic, delay }) {
  const [hov, setHov] = useState(false);
  return (
    <Link to={to} style={{textDecoration:"none"}} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <div className="hp-card" style={{
        display:"flex", flexDirection:"column", gap:16,
        padding:24, borderRadius:16, minHeight:280,
        background: hov ? `linear-gradient(135deg,${gradient})` : `linear-gradient(135deg,rgba(12,18,30,0.95),rgba(20,35,60,0.9))`,
        border:`1.5px solid ${hov ? color+"44" : "rgba(255,255,255,0.08)"}`,
        position:"relative", overflow:"hidden",
        cursor:"pointer",
        animation:`cardIn 600ms ${delay}ms cubic-bezier(0.22,1,0.36,1) both`,
        boxShadow: hov ? `0 32px 80px ${color}28, inset 0 0 60px ${color}12` : `0 4px 12px rgba(0,0,0,0.3)`,
      }}>
        {/* Animated gradient background */}
        <div style={{
          position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:"50%",
          background:`radial-gradient(circle, ${color}40, transparent)`,
          filter:"blur(60px)",
          opacity:hov?1:0,
          transition:"opacity 500ms cubic-bezier(0.22,1,0.36,1)",
          pointerEvents:"none",
        }}/>
        
        {/* Animated graphic container */}
        <div className="hp-card-graphic-container" style={{
          display:"flex",alignItems:"center",justifyContent:"center",
          height:120, borderRadius:12,
          background:`linear-gradient(135deg,${color}15,${color}05)`,
          border:`1px solid ${color}22`,
          position:"relative",
          transition:"all 500ms cubic-bezier(0.22,1,0.36,1)",
          transform:hov?"scale(1.08) rotate(4deg)":"scale(1) rotate(0deg)",
          perspective:"1000px",
        }}>
          <div style={{
            width:"80%", height:"80%",
            filter:hov?`drop-shadow(0 8px 24px ${color}88)`:"drop-shadow(0 0 0px transparent)",
            transition:"filter 500ms cubic-bezier(0.22,1,0.36,1)",
          }}>
            <Graphic />
          </div>
        </div>
        
        {/* Content */}
        <div style={{flex:1, position:"relative", zIndex:2}}>
          <h3 style={{
            margin:"0 0 8px",
            fontSize:16, fontWeight:800, color:C.text, fontFamily:"'Sora',sans-serif",
            transition:"color 320ms ease"
          }}>{title}</h3>
          <p style={{
            margin:0, fontSize:13, color:hov?C.text:C.muted, lineHeight:1.6,
            fontFamily:"'Inter',sans-serif",
            transition:"color 320ms ease"
          }}>{desc}</p>
        </div>
        
        {/* CTA indicator */}
        <div style={{
          display:"flex", alignItems:"center", gap:8,
          fontSize:12, fontWeight:600, color,
          opacity:hov?1:0.6,
          transition:"all 320ms cubic-bezier(0.22,1,0.36,1)",
          transform:hov?"translateX(4px)":"translateX(0)",
        }}>
          Explore
          <span style={{
            fontSize:16,
            transition:"transform 320ms cubic-bezier(0.22,1,0.36,1)",
            transform:hov?"translateX(6px)":"translateX(0)",
          }}>→</span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Live ticker (backend-driven) ──────────────────────── */
function LiveTicker({ items = [] }) {
  const html = items.map(p => `${p.name} • ${p.price}`).join("  |  ");
  const doubled = html + "  |  " + html;
  return (
    <div style={{maxWidth:"100%",margin:"32px auto 0",overflow:"hidden"}}>
      <div style={{
        background:"linear-gradient(90deg,transparent,rgba(79,158,255,0.08),transparent)",
        padding:"16px 0",
        borderTop:"1px solid rgba(255,255,255,0.06)",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{display:"flex",whiteSpace:"nowrap",animation:"tickerMove 40s linear infinite",
          willChange:"transform"}}>
          <span style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif",marginRight:40}}>
            {doubled}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Prediction strip ──────────────────────────────────── */
function PredictionStrip({ predictions = [] }) {
  if (!predictions.length) return null;
  const p = predictions.slice(0,5);
  return (
    <section style={{maxWidth:1200,margin:"52px auto 0",padding:"0 20px"}}>
      <div style={{marginBottom:20}}>
        <h2 style={{fontSize:18,fontWeight:900,color:C.text,margin:0,fontFamily:"'Sora',sans-serif"}}>
          This week's predictions
        </h2>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
        {p.map((pred, i) => (
          <div key={i} className="hp-card" style={{
            padding:16, borderRadius:12, background:"rgba(255,255,255,0.04)",
            border:`1px solid rgba(255,255,255,0.08)`,
            cursor:"default",
            animation:`cardIn 600ms ${i*60+400}ms cubic-bezier(0.22,1,0.36,1) both`,
          }}>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:8}}>
              {pred.competition}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:700,color:C.text}}>{pred.home}</div>
                <div style={{fontSize:12,fontWeight:700,color:C.text}}>{pred.away}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{fontSize:14,fontWeight:900,color:C.blue}}>{pred.confidence}%</div>
                <div style={{fontSize:9,color:C.muted}}>Conf</div>
              </div>
            </div>
            <div style={{height:1,background:"rgba(255,255,255,0.08)",marginBottom:12}}/>
            <div style={{display:"flex",gap:6,fontSize:9,fontWeight:700}}>
              <span style={{flex:1,color:C.blue,background:`${C.blue}14`,padding:"4px 6px",borderRadius:4,textAlign:"center"}}>
                {pred.homeWin}% Win
              </span>
              <span style={{flex:1,color:C.muted,background:"rgba(255,255,255,0.05)",padding:"4px 6px",borderRadius:4,textAlign:"center"}}>
                {pred.draw}% Draw
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Stat of the moment ─────────────────────────────────── */
function StatOfMoment({ insight = {} }) {
  if (!insight.text) return null;
  return (
    <section style={{maxWidth:900,margin:"52px auto 0",padding:"0 20px"}}>
      <div style={{
        padding:"28px 32px", borderRadius:16,
        background:`linear-gradient(135deg,${insight.color}08,${insight.color}04)`,
        border:`1.5px solid ${insight.color}22`,
        position:"relative",overflow:"hidden",
        animation:"cardIn 600ms 200ms cubic-bezier(0.22,1,0.36,1) both"
      }}>
        <div style={{position:"absolute",top:-60,right:-60,width:180,height:180,
          borderRadius:"50%",background:`radial-gradient(circle,${insight.color}30,transparent)`,
          filter:"blur(50px)",pointerEvents:"none"}}/>
        <div style={{position:"relative",zIndex:2}}>
          <div style={{fontSize:11,fontWeight:900,color:insight.color,letterSpacing:"0.1em",
            textTransform:"uppercase",marginBottom:8}}>Stat of the Moment</div>
          <p style={{margin:0,fontSize:14,color:C.text,lineHeight:1.7,fontFamily:"'Inter',sans-serif",maxWidth:600}}>
            {insight.text}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ─── Model performance ──────────────────────────────────── */
function ModelPerformance({ trend = [], byMarket = {}, overallAccuracy = 0 }) {
  if (!trend.length) return null;
  return (
    <section style={{maxWidth:1200,margin:"52px auto 0",padding:"0 20px 64px"}}>
      <div style={{marginBottom:28}}>
        <h2 style={{fontSize:22,fontWeight:900,color:C.text,margin:"0 0 8px",fontFamily:"'Sora',sans-serif"}}>
          Model Performance
        </h2>
        <p style={{fontSize:13,color:C.muted,margin:0,fontFamily:"'Inter',sans-serif"}}>
          Verified accuracy across all competitions
        </p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
        {Object.entries(byMarket).map(([market, acc], i) => (
          <div key={market} className="hp-card" style={{
            padding:20, borderRadius:16, background:"rgba(255,255,255,0.03)",
            border:`1px solid rgba(255,255,255,0.08)`,
            animation:`cardIn 600ms ${i*60}ms cubic-bezier(0.22,1,0.36,1) both`,
          }}>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:12,textTransform:"uppercase"}}>
              {market}
            </div>
            <div style={{fontSize:32,fontWeight:900,color:C.green,lineHeight:1,marginBottom:8}}>
              {acc}%
            </div>
            <div style={{height:2,background:"rgba(255,255,255,0.05)",borderRadius:1}}>
              <div style={{height:"100%",width:acc+"%",background:C.green,borderRadius:1,opacity:0.7}}/>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Recent results ─────────────────────────────────────── */
function RecentResults({ results = [], correct = 0, total = 0 }) {
  if (!results.length) return null;
  return (
    <section style={{maxWidth:1200,margin:"52px auto 0",padding:"0 20px 64px"}}>
      <div style={{marginBottom:28}}>
        <h2 style={{fontSize:22,fontWeight:900,color:C.text,margin:"0 0 8px",fontFamily:"'Sora',sans-serif"}}>
          Recent Predictions
        </h2>
        <p style={{fontSize:13,color:C.muted,margin:0,fontFamily:"'Inter',sans-serif"}}>
          {total > 0 ? `${correct} correct out of ${total} fixtures` : "Loading..."}
        </p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
        {results.map((r, i) => (
          <div key={i} className="hp-card" style={{
            padding:14, borderRadius:12, background:r.correct?"rgba(0,224,158,0.08)":"rgba(255,107,107,0.08)",
            border:`1px solid ${r.correct?"rgba(0,224,158,0.25)":"rgba(255,107,107,0.25)"}`,
            animation:`cardIn 600ms ${i*50}ms cubic-bezier(0.22,1,0.36,1) both`,
          }}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{fontSize:11,fontWeight:700,color:C.muted}}>{r.competition}</div>
              <div style={{
                fontSize:10,fontWeight:900,color:r.correct?C.green:C.red,
                background:r.correct?`${C.green}14`:`${C.red}14`,
                padding:"2px 6px",borderRadius:4
              }}>
                {r.correct?"✓":"✕"}
              </div>
            </div>
            <div style={{fontSize:12,fontWeight:700,color:C.text}}>{r.home} {r.homeScore}-{r.awayScore} {r.away}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Main component ─────────────────────────────────────── */
export default function HomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/home/dashboard`);
        if (!res.ok) throw new Error();
        const d = await res.json();
        setData(mapDashboard(d));
      } catch (e) {
        console.error("Home load err:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:C.muted}}>Loading...</div>;

  const {
    compsCount=0, fixturesPred=0, verifiedAcc=0, avgConf=0,
    predictions=[], insight={}, trend=[], byMarket={}, overallAcc=0,
    results=[], resCorrect=0, resTotal=0, tickerItems=[]
  } = data || {};

  const LEAGUES = [
    {to:"/predictions/premier-league",name:"Premier League",col:C.blue,flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
    {to:"/predictions/la-liga",name:"La Liga",col:C.orange,flag:"🇪🇸"},
    {to:"/predictions/serie-a",name:"Serie A",col:C.green,flag:"🇮🇹"},
    {to:"/predictions/bundesliga",name:"Bundesliga",col:C.red,flag:"🇩🇪"},
    {to:"/predictions/ligue-1",name:"Ligue 1",col:C.purple,flag:"🇫🇷"},
    {to:"/predictions/champions-league",name:"Champions League",col:C.gold,flag:"🏆"},
    {to:"/predictions/europa-league",name:"Europa League",col:C.teal,flag:"🎖️"},
    {to:"/predictions/conference-league",name:"Conference League",col:"#f97316",flag:"🎯"},
    {to:"/predictions/fa-cup",name:"FA Cup",col:"#8b5cf6",flag:"🎪"},
  ];

  const FEATURES = [
    {
      to:"/predictions/premier-league",
      title:"Match Predictions",
      desc:"Win probabilities, expected scorelines, and model confidence across 9 competitions.",
      color:C.blue,
      gradient:`${C.blue}15, ${C.blue}05`,
      Graphic:PredictionGraphic
    },
    {
      to:"/squad-builder",
      title:"Best XI Builder",
      desc:"Optimal fantasy XI using composite scoring: fixtures, form, ICT index and PPG.",
      color:C.green,
      gradient:`${C.green}15, ${C.green}05`,
      Graphic:BuilderGraphic
    },
    {
      to:"/squad-builder",
      title:"Squad Builder",
      desc:"Full FPL squads with budget constraints. Best value picks, differentials and captains.",
      color:C.gold,
      gradient:`${C.gold}15, ${C.gold}05`,
      Graphic:SquadGraphic
    },
    {
      to:"/player/",
      title:"Player Insight",
      desc:"Deep statistical profiles with form trends and fixture difficulty analysis.",
      color:C.purple,
      gradient:`${C.purple}15, ${C.purple}05`,
      Graphic:InsightGraphic
    },
    {
      to:"/live",
      title:"GW Insights",
      desc:"FDR, captain picks, differential watchlist and injury news all in one place.",
      color:C.teal,
      gradient:`${C.teal}15, ${C.teal}05`,
      Graphic:InsightsGraphic
    },
    {
      to:"/player/",
      title:"Player Stats Table",
      desc:"Sortable stats for all players. Filter by position, team, and price.",
      color:C.pink,
      gradient:`${C.pink}15, ${C.pink}05`,
      Graphic:StatsGraphic
    },
    {
      to:"/live",
      title:"Live Matches",
      desc:"Real-time scores, xG data, possession and latest match events.",
      color:C.red,
      gradient:`${C.red}15, ${C.red}05`,
      Graphic:LiveGraphic
    },
    {
      to:"/learn",
      title:"Ground Zero",
      desc:"Documentation on how our models work, methodology and research.",
      color:C.pink,
      gradient:`${C.pink}15, ${C.pink}05`,
      Graphic:LearnGraphic
    },
  ];

  return (
    <div style={{background:"#050810",color:C.text,fontFamily:"'Inter','Sora',sans-serif",minHeight:"100vh"}}>
      <style>{HOME_CSS}</style>

      {/* ── HERO SECTION (Preserved) ── */}
      <section style={{maxWidth:1200,margin:"0 auto",padding:isMobile?"60px 20px 40px":"100px 20px 80px",textAlign:"center"}}>
        <div style={{marginBottom:24,animation:"fadeDown 700ms 100ms ease both"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:999,
            background:"rgba(79,158,255,0.1)",border:`1px solid ${C.blue}33`,fontSize:11,fontWeight:700,color:C.blue,
            letterSpacing:"0.06em",marginBottom:20}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:C.blue,boxShadow:`0 0 8px ${C.blue}`}}/>
            FOOTBALL INTELLIGENCE PLATFORM
          </div>
          <h1 style={{margin:"0 0 20px",fontSize:isMobile?36:56,fontWeight:900,lineHeight:1.1,
            letterSpacing:"-0.02em",fontFamily:"'Sora',sans-serif"}}>
            Read the <span style={{background:"linear-gradient(90deg,#4f9eff,#00e09e,#f2c94c)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>Game</span>
          </h1>
          <p style={{margin:0,fontSize:isMobile?14:16,color:C.muted,maxWidth:600,margin:"0 auto",lineHeight:1.6}}>
            Football intelligence for predictions, FPL decisions, and deeper match insight.
          </p>
        </div>

        {/* CTA Buttons */}
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",animation:"fadeUp 700ms 300ms ease both",marginTop:32}}>
          <Link to="/predictions/premier-league" className="hp-btn" style={{
            display:"inline-flex",alignItems:"center",gap:8,padding:"14px 32px",borderRadius:14,
            background:C.blue,border:"none",color:"#fff",fontSize:14,fontWeight:700,textDecoration:"none",
            fontFamily:"'Inter',sans-serif",boxShadow:`0 8px 32px ${C.blue}40`
          }}>
            Predictions
          </Link>
          <Link to="/squad-builder" className="hp-btn" style={{
            display:"inline-flex",alignItems:"center",gap:8,padding:"14px 32px",borderRadius:14,
            background:`${C.green}15`,border:`1.5px solid ${C.green}44`,color:C.green,fontSize:14,
            fontWeight:700,textDecoration:"none",fontFamily:"'Inter',sans-serif"
          }}>
            Build FPL Team
          </Link>
          <Link to="/live" className="hp-btn" style={{
            display:"inline-flex",alignItems:"center",gap:8,padding:"14px 32px",borderRadius:14,
            background:`${C.red}15`,border:`1.5px solid ${C.red}44`,color:C.red,fontSize:14,
            fontWeight:700,textDecoration:"none",fontFamily:"'Inter',sans-serif"
          }}>
            Live Matches
          </Link>
          <Link to="/learn" className="hp-btn" style={{
            display:"inline-flex",alignItems:"center",gap:8,padding:"14px 32px",borderRadius:14,
            background:`${C.purple}15`,border:`1.5px solid ${C.purple}44`,color:C.purple,fontSize:14,
            fontWeight:700,textDecoration:"none",fontFamily:"'Inter',sans-serif"
          }}>
            Ground Zero
          </Link>
        </div>
      </section>

      {/* ── LIVE TICKER (backend trending players) ── */}
      <LiveTicker items={tickerItems}/>

      {/* ── STAT TILES (backend-driven) ── */}
      <section style={{maxWidth:1100,margin:"0 auto",padding:"40px 20px 48px"}}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",animation:"fadeUp 600ms 400ms ease both"}}>
          <StatTile value={compsCount} suffix=""           label="Competitions"       color={C.blue}   delay={0}   icon="🌍"/>
          {fixturesPred > 0 && <StatTile value={fixturesPred} suffix="+" label="Fixtures Predicted" color={C.green}  delay={100} icon="📊"/>}
          {verifiedAcc > 0  && <StatTile value={verifiedAcc}  suffix="%" label="Verified Accuracy"  color={C.teal}   delay={200} icon="🎯"/>}
          {avgConf > 0  && <StatTile value={Math.round(avgConf)} suffix="%" label="Avg Confidence" color={C.purple} delay={300} icon="🧠"/>}
        </div>
      </section>

      {/* ── PREDICTIONS STRIP (backend) ── */}
      <PredictionStrip predictions={predictions}/>

      {/* ── STAT OF THE DAY (backend tactical insight) ── */}
      <StatOfMoment insight={insight}/>

      {/* ── DIVIDER ── */}
      <div style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 48px"}}>
        <div style={{height:1,background:"linear-gradient(90deg,transparent,rgba(79,158,255,0.3),rgba(0,224,158,0.3),transparent)"}}/>
      </div>

      {/* ── WHAT IS THIS ── */}
      <section style={{maxWidth:900,margin:"0 auto",padding:"0 20px 64px"}}>
        <div style={{padding:"32px 36px",borderRadius:24,background:"rgba(255,255,255,0.02)",
          border:`1px solid ${C.line}`,position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,right:0,width:300,height:200,
            background:"radial-gradient(circle at 100% 0%,rgba(79,158,255,0.07),transparent 70%)",pointerEvents:"none"}}/>
          <h2 style={{fontSize:22,fontWeight:900,color:"#f4f8ff",margin:"0 0 16px",
            fontFamily:"'Sora',sans-serif",letterSpacing:"-0.02em"}}>Built for football fans who love numbers</h2>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:20,fontFamily:"'Inter',sans-serif"}}>
            {[
              ["Planning FPL transfers?",C.blue,"Get data driven squad recommendations with FDR, form ratings and projected points for the next 6 gameweeks."],
              ["Want smarter predictions?",C.gold,"Model generated win probabilities and expected scorelines for every fixture across 9 competitions."],
              ["Is Saturday worth watching?",C.green,"Predicted scorelines, expected goal totals and match style indicators tell you whether it will be a thriller or bore draw."],
              ["Just love football stats?",C.purple,"Deep player profiles, scoring patterns, passing accuracy and head to head records across Europe's top leagues."],
            ].map(([title,col,body],i)=>(
              <div key={i} style={{display:"flex",flexDirection:"column",gap:5}}>
                <div style={{fontSize:13,fontWeight:800,color:C.text,display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:col,flexShrink:0,boxShadow:`0 0 6px ${col}`}}/>
                  {title}
                </div>
                <p style={{margin:0,fontSize:12,color:C.muted,lineHeight:1.65}}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE CARDS (Enhanced with animated graphics) ── */}
      <section style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 64px"}}>
        <div style={{marginBottom:28,textAlign:"center"}}>
          <h2 style={{fontSize:24,fontWeight:900,color:"#f4f8ff",margin:"0 0 8px",
            fontFamily:"'Sora',sans-serif",letterSpacing:"-0.02em"}}>Everything you need, in one place</h2>
          <p style={{fontSize:13,color:C.muted,margin:0,fontFamily:"'Inter',sans-serif"}}>8 tools. One platform. Pick where to start.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14}}>
          {FEATURES.map((f,i) => <FeatureCard key={f.to+i} {...f} delay={i*55}/>)}
        </div>
      </section>

      {/* ── MODEL PERFORMANCE (backend) ── */}
      <ModelPerformance trend={trend} byMarket={byMarket} overallAccuracy={overallAcc}/>

      {/* ── RECENT RESULTS (backend) ── */}
      <RecentResults results={results} correct={resCorrect} total={resTotal}/>

      {/* ── LEAGUES STRIP (9 competitions) ── */}
      <section style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 80px"}}>
        <div style={{padding:"26px 32px",borderRadius:20,background:"rgba(255,255,255,0.02)",
          border:`1px solid ${C.line}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:20}}>
          <div>
            <p style={{margin:"0 0 4px",fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif",letterSpacing:"0.1em",textTransform:"uppercase"}}>Covering {LEAGUES.length} competitions</p>
            <h3 style={{margin:0,fontSize:18,fontWeight:900,color:C.text,fontFamily:"'Sora',sans-serif"}}>Pick your league</h3>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {LEAGUES.map(({to,name,col,flag})=>(
              <Link key={to} to={to} className="hp-btn" style={{display:"flex",alignItems:"center",gap:8,
                padding:"10px 18px",borderRadius:12,background:col+"12",border:`1.5px solid ${col}35`,
                color:col,fontSize:13,fontWeight:700,textDecoration:"none",fontFamily:"'Inter',sans-serif",
                transition:"all 180ms cubic-bezier(0.22,1,0.36,1)",
              }}>
                <span style={{display:"flex",alignItems:"center",fontSize:16}}>{flag}</span>
                {name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS (points to Ground Zero) ── */}
      <section style={{maxWidth:900,margin:"0 auto",padding:"0 20px 80px"}}>
        <div style={{padding:"28px 36px",borderRadius:20,background:"rgba(255,255,255,0.02)",
          border:`1px solid ${C.line}`,display:"flex",gap:24,alignItems:"flex-start",flexWrap:"wrap"}}>
          <div style={{flex:"0 0 auto"}}>
            <svg width="120" height="68" viewBox="0 0 120 68" fill="none" style={{display:"block"}}>
              <rect x="1" y="1" width="118" height="66" rx="5" fill="#0a2a10" stroke="rgba(255,255,255,0.1)" strokeWidth=".8"/>
              <line x1="60" y1="1" x2="60" y2="67" stroke="rgba(255,255,255,0.1)" strokeWidth=".6"/>
              <circle cx="60" cy="34" r="12" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth=".6"/>
              <rect x="1" y="22" width="16" height="24" rx="1" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth=".6"/>
              <rect x="103" y="22" width="16" height="24" rx="1" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth=".6"/>
              <path d="M30 34 C48 20 74 20 95 34" stroke="#4f9eff" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" opacity=".7"/>
              <circle cx="95" cy="34" r="4" fill="#4f9eff" opacity=".9">
                <animate attributeName="r" values="4;6;4" dur="1.2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values=".9;.4;.9" dur="1.2s" repeatCount="indefinite"/>
              </circle>
            </svg>
          </div>
          <div>
            <h3 style={{margin:"0 0 8px",fontSize:15,fontWeight:800,color:C.text,fontFamily:"'Sora',sans-serif"}}>How do our predictions work?</h3>
            <p style={{margin:"0 0 10px",fontSize:12,color:C.muted,lineHeight:1.65,fontFamily:"'Inter',sans-serif",maxWidth:520}}>
              Every prediction is generated by combining multiple statistical models with real match data. The deeper methodology, model details, and research are all documented in Ground Zero.
            </p>
            <Link to="/learn" style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:4,
              fontSize:12,fontWeight:700,color:C.pink,textDecoration:"none",fontFamily:"'Inter',sans-serif",
              transition:"all 180ms ease",transform:"translateX(0)"
            }} onMouseEnter={e=>e.currentTarget.style.transform="translateX(6px)"}
            onMouseLeave={e=>e.currentTarget.style.transform="translateX(0)"}>
              Explore Ground Zero →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}