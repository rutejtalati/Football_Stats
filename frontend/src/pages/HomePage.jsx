// HomePage.jsx — StatinSite v2 (backend-connected)
// ═══════════════════════════════════════════════════════════
// DESIGN DNA: 100% preserved from old homepage
// CHANGES: backend data, hero text, 9 leagues, no fake arrays
// ═══════════════════════════════════════════════════════════
import { Link } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { mapDashboard } from "../utils/homeDataMappers";
import LiveTicker3Row from "../components/LiveTicker3Row";

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

/* ─── Global styles ─────────────────────────────────────── */
const HOME_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;700;900&family=DM+Mono:wght@400;500&display=swap');
  @keyframes hpFadeDown  { from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes hpFadeUp    { from{opacity:0;transform:translateY(14px)}  to{opacity:1;transform:translateY(0)} }
  @keyframes hpCardIn    { from{opacity:0;transform:translateY(14px)}  to{opacity:1;transform:translateY(0)} }
  @keyframes hpPulse     { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.6)} }
  @keyframes hpMarquee   { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes hpBlink     { 50%{opacity:0} }
  @keyframes hpBarGrow   { from{width:0} to{width:var(--w)} }
  @keyframes hpHeightGrow{ from{height:0} to{height:var(--h)} }
  .hp-card { transition: all 160ms ease; cursor: pointer; }
  .hp-card:hover { border-color: #00fff0 !important; }
  .hp-btn  { transition: all 120ms ease; cursor: pointer; }
  .hp-btn:hover { background: #00fff0 !important; color: #000 !important; }
`;



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

/* ─── Stat tile — neobrutalist ─────────────────────────── */
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
        background: hov ? "rgba(0,255,240,.06)" : "#000",
        border: "1px solid rgba(0,255,240,.2)",
        borderColor: hov ? "#00fff0" : "rgba(0,255,240,.2)",
        boxShadow: "none",
        flex: 1, minWidth: 0, position: "relative", overflow: "hidden",
        transition: "all 160ms cubic-bezier(.22,1,.36,1)",
        transform: hov ? "translate(-2px,-2px)" : "none",
        cursor: "default",
      }}
    >
      {/* Corner glow blob */}
      <div style={{
        position: "absolute", top: -30, right: -30, width: 100, height: 100,
        borderRadius: "50%", background: color,
        opacity: hov ? 0.15 : 0.05, filter: "blur(30px)",
        transition: "opacity 260ms", pointerEvents: "none",
      }} />

      {/* Bottom accent line */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        opacity: hov ? 0.7 : 0, transition: "opacity 260ms",
      }} />

      {/* SVG icon row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ color, opacity: hov ? 1 : 0.7, transition: "opacity 260ms" }}>{svg}</div>
        {trend && (
          <span style={{
            fontSize: 9, fontWeight: 800, color: C.green,
            background: `${C.green}14`, border: `1px solid ${C.green}35`,
            padding: "2px 8px", borderRadius: 999, letterSpacing: "0.06em",
          }}>{trend}</span>
        )}
      </div>

      {/* Big number */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <span style={{
          fontSize: 40, fontWeight: 900,
          fontFamily: "'Bebas Neue', sans-serif",
          color: "#00fff0", lineHeight: 1, letterSpacing: "0.02em",
          textShadow: "none",
          transition: "text-shadow 260ms",
        }}>{v.toLocaleString()}</span>
        <span style={{ fontSize: 18, fontWeight: 700, color, opacity: 0.8 }}>{suffix}</span>
      </div>

      {/* Label + sublabel */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{
          fontSize: 9, fontWeight: 900, color: C.muted,
          letterSpacing: "0.14em", textTransform: "uppercase",
          fontFamily: "'Inter', sans-serif",
        }}>{label}</span>
        {sublabel && (
          <span style={{
            fontSize: 10, color: C.muted, fontFamily: "'Inter', sans-serif",
            opacity: 0.7, lineHeight: 1.4,
          }}>{sublabel}</span>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, borderRadius: 1, background: "rgba(255,255,255,0.05)" }}>
        <div style={{
          height: "100%", borderRadius: 1, background: color, opacity: 0.8,
          width: hov ? "100%" : "40%",
          boxShadow: hov ? `0 0 8px ${color}` : "none",
          transition: "width 700ms cubic-bezier(0.22,1,0.36,1), box-shadow 260ms",
        }} />
      </div>
    </div>
  );
}

/* ─── Live ticker (backend-driven) ──────────────────────── */
function LiveTicker({ items = [] }) {
  if (items.length === 0) return null;
  const doubled = [...items, ...items];
  return (
    <div style={{
      borderTop:`1px solid ${C.line}`, borderBottom:`1px solid ${C.line}`,
      background:"rgba(255,255,255,0.015)", overflow:"hidden", padding:"10px 0",
      position:"relative",
    }}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:80,
        background:"linear-gradient(to right,#060a14,transparent)",zIndex:2,pointerEvents:"none"}}/>
      <div style={{position:"absolute",right:0,top:0,bottom:0,width:80,
        background:"linear-gradient(to left,#060a14,transparent)",zIndex:2,pointerEvents:"none"}}/>
      <div style={{display:"flex",gap:0,animation:"tickerMove 40s linear infinite",width:"max-content"}}>
        {doubled.map((item, i) => (
          <div key={i} style={{
            display:"flex",alignItems:"center",gap:8,padding:"0 28px",
            borderRight:`1px solid ${C.line}`,flexShrink:0,
          }}>
            <div style={{width:5,height:5,borderRadius:"50%",background:item.col,
              boxShadow:`0 0 6px ${item.col}`,flexShrink:0}}/>
            <span style={{fontSize:10,color:C.muted,fontFamily:"'Inter',sans-serif",
              fontWeight:600,whiteSpace:"nowrap"}}>{item.label}</span>
            <span style={{fontSize:12,fontWeight:900,color:item.col,
              fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Pitch grid background ─────────────────────────────── */
function PitchGridBg() {
  return (
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none",zIndex:0}}>
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-60%)",
        width:800,height:500,background:"radial-gradient(ellipse,rgba(79,158,255,0.07) 0%,rgba(0,224,158,0.03) 45%,transparent 70%)",}}/>
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:.045,animation:"pitchPulse 6s ease-in-out infinite"}}
        viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
        <rect x="40" y="20" width="1120" height="560" rx="8" fill="none" stroke="white" strokeWidth="1.5"/>
        <line x1="600" y1="20" x2="600" y2="580" stroke="white" strokeWidth="1"/>
        <circle cx="600" cy="300" r="80" fill="none" stroke="white" strokeWidth="1"/>
        <circle cx="600" cy="300" r="4" fill="white"/>
        <rect x="40" y="180" width="110" height="240" fill="none" stroke="white" strokeWidth="1"/>
        <rect x="1050" y="180" width="110" height="240" fill="none" stroke="white" strokeWidth="1"/>
        <rect x="40" y="230" width="50" height="140" fill="none" stroke="white" strokeWidth="1"/>
        <rect x="1110" y="230" width="50" height="140" fill="none" stroke="white" strokeWidth="1"/>
        <circle cx="240" cy="300" r="2" fill="white"/>
        <circle cx="960" cy="300" r="2" fill="white"/>
      </svg>
      {[[C.blue,.06,"-5%","10%","55s"],[C.green,.05,"78%","55%","68s"],[C.purple,.04,"42%","-6%","62s"],[C.gold,.04,"20%","70%","72s"]].map(([col,op,l,t,dur],i)=>(
        <div key={i} style={{position:"absolute",width:500,height:500,borderRadius:"50%",left:l,top:t,
          background:col,opacity:op,filter:"blur(110px)",animation:`orbFloat ${dur} ease-in-out infinite`,animationDelay:`${i*9}s`}}/>
      ))}
      {Array.from({length:18},(_,i)=>({
        x:Math.random()*100,y:Math.random()*100,s:Math.random()*1.4+.4,
        op:Math.random()*.18+.04,sp:Math.random()*28+18,dl:Math.random()*-28,
      })).map((p,i)=>(
        <div key={i} style={{position:"absolute",left:p.x+"%",top:p.y+"%",width:p.s,height:p.s,
          borderRadius:"50%",background:"white",opacity:p.op,
          animation:`floatP ${p.sp}s ${p.dl}s linear infinite`}}/>
      ))}
    </div>
  );
}

/* ─── Animated feature card graphics ───────────────────── */
function PitchGraphic({ color, hov }) {
  return (
    <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
      <rect x="2" y="2" width="176" height="96" rx="7" stroke={color} strokeWidth="1.5" strokeOpacity={hov?.5:.25}/>
      <line x1="90" y1="2" x2="90" y2="98" stroke={color} strokeWidth="0.8" strokeOpacity={hov?.3:.15}/>
      <circle cx="90" cy="50" r="20" stroke={color} strokeWidth="0.8" strokeOpacity={hov?.3:.15}/>
      <rect x="2" y="32" width="24" height="36" rx="2" stroke={color} strokeWidth="0.8" strokeOpacity={hov?.3:.2}/>
      <rect x="154" y="32" width="24" height="36" rx="2" stroke={color} strokeWidth="0.8" strokeOpacity={hov?.3:.2}/>
      <path d="M 40 62 C 65 28 120 25 148 50" stroke={color} strokeWidth="2" strokeOpacity={hov?.9:.55}
        strokeDasharray="5 3" strokeLinecap="round"
        style={{strokeDashoffset: hov?0:100, transition:"stroke-dashoffset 600ms ease"}}/>
      <circle cx={hov?148:40} cy={hov?50:62} r="6" fill={color} opacity={hov?.95:.7}
        style={{transition:"cx 600ms ease, cy 600ms ease"}}/>
      <circle cx={hov?148:40} cy={hov?50:62} r="11" fill={color} opacity={hov?.2:.08}
        style={{transition:"cx 600ms ease, cy 600ms ease"}}/>
      {[[40,62],[62,36],[62,72],[108,38],[108,68]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={i===0?5:4} fill={color} opacity={i===0?0:hov?.55:.3}
          style={{transition:"opacity 220ms"}}/>
      ))}
    </svg>
  );
}

function BarGraphic({ color, hov }) {
  const bars = [0.42,0.68,0.52,0.88,0.61,0.78,0.95];
  return (
    <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
      <line x1="14" y1="90" x2="170" y2="90" stroke={color} strokeOpacity="0.15" strokeWidth="0.8"/>
      {bars.map((h,i)=>(
        <rect key={i} x={16+i*22} y={90-h*72} width="15" height={h*72} rx="3"
          fill={color} opacity={hov ? 0.25+h*.6 : 0.12+h*.3}
          style={{transition:`opacity 220ms, height 500ms ${i*50}ms`}}/>
      ))}
      <polyline points={bars.map((h,i)=>`${23.5+i*22},${90-h*72}`).join(" ")}
        fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        opacity={hov?.95:.65} style={{transition:"opacity 220ms"}}/>
      {bars.filter((_,i)=>i%2===0).map((h,i)=>(
        <circle key={i} cx={23.5+(i*2)*22} cy={90-h*72} r="3.5" fill={color} opacity={hov?.95:.7}
          style={{transition:"opacity 220ms"}}/>
      ))}
    </svg>
  );
}

function FormationGraphic({ color, hov }) {
  const pos = [[90,88],[38,68],[63,68],[117,68],[142,68],[50,46],[90,40],[130,46],[60,18],[90,12],[120,18]];
  return (
    <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
      <rect x="2" y="2" width="176" height="96" rx="7" stroke={color} strokeWidth="1" strokeOpacity={hov?.25:.12}/>
      <line x1="2" y1="50" x2="178" y2="50" stroke={color} strokeWidth="0.5" strokeOpacity={hov?.15:.07}/>
      <circle cx="90" cy="50" r="16" stroke={color} strokeWidth="0.5" strokeOpacity={hov?.15:.07}/>
      {pos.map(([x,y],i)=>(
        <g key={i}>
          <circle cx={x} cy={y} r={6} fill={color} opacity={i===0?hov?.5:.3:hov?.9:.6} style={{transition:`opacity 220ms ${i*18}ms`}}/>
          <circle cx={x} cy={y} r={11} fill={color} opacity={hov?.12:.05} style={{transition:`opacity 220ms ${i*18}ms`}}/>
        </g>
      ))}
      <text x="90" y="15" fontSize="6" fill="white" textAnchor="middle" dominantBaseline="middle" fontWeight="900" opacity={hov?.8:.4}>10</text>
    </svg>
  );
}

function RadarGraphic({ color, hov }) {
  const pts=6, vals=[0.88,0.72,0.94,0.67,0.81,0.90];
  const cx=90,cy=50,r=36;
  const poly=vals.map((v,i)=>{const a=(i/pts)*Math.PI*2-Math.PI/2;return[cx+Math.cos(a)*r*v,cy+Math.sin(a)*r*v];}).map(([x,y])=>`${x},${y}`).join(" ");
  return(
    <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
      {[.33,.66,1].map(g=><polygon key={g} points={vals.map((_,i)=>{const a=(i/pts)*Math.PI*2-Math.PI/2;return`${cx+Math.cos(a)*r*g},${cy+Math.sin(a)*r*g}`;}).join(" ")} fill="none" stroke={color} strokeWidth=".7" strokeOpacity={hov?.25:.12}/>)}
      {Array.from({length:pts}).map((_,i)=>{const a=(i/pts)*Math.PI*2-Math.PI/2;return<line key={i} x1={cx} y1={cy} x2={cx+Math.cos(a)*r} y2={cy+Math.sin(a)*r} stroke={color} strokeWidth=".5" strokeOpacity={hov?.2:.08}/>;} )}
      <polygon points={poly} fill={color} fillOpacity={hov?.28:.13} stroke={color} strokeWidth="1.8" strokeOpacity={hov?.9:.6} style={{transition:"all 300ms"}}/>
      {vals.map((v,i)=>{const a=(i/pts)*Math.PI*2-Math.PI/2;return<circle key={i} cx={cx+Math.cos(a)*r*v} cy={cy+Math.sin(a)*r*v} r="3.5" fill={color} opacity={hov?.95:.65} style={{transition:`opacity 220ms ${i*30}ms`}}/>;} )}
    </svg>
  );
}

function TrendGraphic({ color, hov }) {
  const pts=[[10,76],[24,63],[38,68],[52,50],[66,42],[80,54],[94,36],[108,30],[122,20],[136,14],[150,8]];
  const poly=pts.map(([x,y])=>`${x},${y}`).join(" ");
  const area=`${pts[0][0]},90 ${poly} ${pts[pts.length-1][0]},90`;
  return(
    <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
      {[25,50,75].map(y=><line key={y} x1="8" y1={y} x2="158" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth=".8"/>)}
      <polygon points={area} fill={color} fillOpacity={hov?.12:.05} style={{transition:"fill-opacity 220ms"}}/>
      <polyline points={poly} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity={hov?.95:.65} style={{transition:"opacity 220ms"}}/>
      {pts.filter((_,i)=>i%3===0).map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="3.5" fill={color} opacity={hov?.9:.6} style={{transition:"opacity 220ms"}}/>
      ))}
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="6" fill={color} opacity={hov?.95:.8}>
        {hov && <animate attributeName="r" values="5;8;5" dur="1.2s" repeatCount="indefinite"/>}
      </circle>
    </svg>
  );
}

function HeatmapGraphic({ color, hov }) {
  const cells=Array.from({length:35},(_,i)=>.15+Math.sin(i*.7)*.35+Math.cos(i*.4)*.25);
  return(
    <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
      <rect x="12" y="8" width="156" height="84" rx="4" fill="none" stroke={color} strokeWidth=".8" strokeOpacity={hov?.35:.18}/>
      {Array.from({length:7}).map((_,row)=>Array.from({length:5}).map((_,col)=>{
        const v=cells[row*5+col];
        return<rect key={row*5+col} x={12+col*31.2} y={8+row*12} width="31.2" height="12"
          fill={color} opacity={hov?v*.75:v*.4} rx="1" style={{transition:`opacity 250ms ${(row*5+col)*8}ms`}}/>;
      }))}
      <line x1="90" y1="8" x2="90" y2="92" stroke={color} strokeWidth=".6" strokeOpacity={hov?.3:.15}/>
    </svg>
  );
}

function GameGraphic({ color, hov }) {
  return(
    <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
      <rect x="20" y="20" width="140" height="60" rx="12" fill={color} fillOpacity={hov?.1:.05} stroke={color} strokeWidth="1.5" strokeOpacity={hov?.5:.25}/>
      <circle cx="90" cy="50" r="18" fill={color} fillOpacity={hov?.15:.07} stroke={color} strokeWidth="1.2" strokeOpacity={hov?.5:.25}/>
      <path d="M84 50l-6-4v8l6-4z" fill={color} opacity={hov?.9:.6}/>
      <path d="M96 50l6-4v8l-6-4z" fill={color} opacity={hov?.9:.6}/>
      <rect x="86" y="44" width="8" height="12" rx="1" fill={color} opacity={hov?.3:.15}/>
      {[[32,50],[148,50]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={8} fill={color} fillOpacity={hov?.2:.08} stroke={color} strokeOpacity={hov?.5:.25} strokeWidth="1"/>)}
      {[[32,44],[32,56],[148,44],[148,56]].map(([x,y],i)=><rect key={i} x={x-4} y={y-2} width="8" height="4" rx="1" fill={color} opacity={hov?.7:.4}/>)}
    </svg>
  );
}

function LearnGraphic({ color, hov }) {
  const nodes=[[90,20],[50,50],[90,50],[130,50],[70,80],[110,80]];
  return(
    <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
      {[[0,1],[0,2],[0,3],[1,4],[2,4],[2,5],[3,5]].map(([a,b],i)=>(
        <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]}
          stroke={color} strokeWidth="1.2" strokeOpacity={hov?.5:.22}
          style={{transition:`stroke-opacity 220ms ${i*40}ms`}}/>
      ))}
      {nodes.map(([x,y],i)=>(
        <g key={i}>
          <circle cx={x} cy={y} r="8" fill={color} opacity={hov?.3:.12} style={{transition:`opacity 220ms ${i*40}ms`}}/>
          <circle cx={x} cy={y} r="4.5" fill={color} opacity={hov?.9:.55} style={{transition:`opacity 220ms ${i*40}ms`}}/>
        </g>
      ))}
      <text x="90" y="24" fontSize="5.5" fill="white" textAnchor="middle" dominantBaseline="middle" fontWeight="900" opacity={hov?.8:.4}>xG</text>
    </svg>
  );
}

/* ─── Feature card — neobrutalist ───────────────────────── */
function FeatureCard({ to, color, title, subtitle, description, badge, delay = 0, index = 1 }) {
  const [hov, setHov] = useState(false);
  return (
    <Link to={to} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      className="hp-card"
      style={{
        display: "flex", flexDirection: "column",
        background: hov ? "rgba(0,255,240,.06)" : "#000",
        border: "1px solid rgba(0,255,240,.2)", borderRight: "none",
        textDecoration: "none",
        boxShadow: hov ? "6px 6px 0 #0a0a0a" : "none",
        animationDelay: delay + "ms", animation: "hpCardIn 500ms ease both",
        position: "relative", overflow: "hidden",
        transition: "background 160ms, box-shadow 160ms",
      }}>
      {/* Corner number — concept .feat-n */}
      <div style={{ position:"absolute", top:8, right:10, fontFamily:"'Bebas Neue',sans-serif", fontSize:72, color: hov ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.04)", lineHeight:1, pointerEvents:"none", userSelect:"none" }}>{String(index).padStart(2,"0")}</div>
      {/* Accent top on hover */}
      <div style={{ height:1, background: hov ? "#00fff0" : "rgba(0,255,240,.12)", transition:"background 160ms" }}/>
      <div style={{ padding:"24px 26px 26px", flex:1, display:"flex", flexDirection:"column", gap:8 }}>
        {/* Icon */}
        <div style={{ width:42, height:42, background: hov ? "#ff2744" : "rgba(0,255,240,.06)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:8, boxShadow: hov ? "4px 4px 0 #0a0a0a" : "3px 3px 0 rgba(0,0,0,.2)", transition:"background .15s,box-shadow .15s", flexShrink:0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00fff0" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14 14 0 0 1 0 20M2 12h20"/></svg>
        </div>
        {/* Title */}
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:1, color: hov ? "#00fff0" : "rgba(0,255,240,.8)", lineHeight:1.1, transition:"color 160ms" }}>{title}</div>
        {/* Description */}
        <p style={{ fontSize:12, lineHeight:1.7, color: hov ? "rgba(255,255,255,.5)" : "rgba(0,0,0,.5)", margin:0, fontFamily:"'Space Grotesk',sans-serif", transition:"color 160ms" }}>{description}</p>
        {/* CTA link */}
        <div style={{ marginTop:"auto", paddingTop:10, fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:".18em", textTransform:"uppercase", color: hov ? "#ff2744" : "rgba(0,0,0,.35)", display:"flex", alignItems:"center", gap:6, opacity: hov ? 1 : 0, transform: hov ? "translateX(0)" : "translateX(-6px)", transition:"all .2s" }}>
          {subtitle} →
        </div>
      </div>
    </Link>
  );
}

/* ─── Prediction strip (backend-driven) ─────────────────── */
function PredictionStrip({ predictions = [] }) {
  if (predictions.length === 0) return null;
 
  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 52px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: C.green, boxShadow: `0 0 8px ${C.green}`,
            animation: "livePulse 2s ease infinite",
          }} />
          <span style={{
            fontSize: 12, fontWeight: 900, color: C.text,
            fontFamily: "'Sora', sans-serif", letterSpacing: "0.07em",
          }}>
            TOP PREDICTIONS
          </span>
        </div>
        <Link to="/predictions/premier-league" style={{
          fontSize: 11, fontWeight: 700, color: C.blue,
          textDecoration: "none", fontFamily: "'Inter', sans-serif",
          display: "flex", alignItems: "center", gap: 5,
          opacity: 0.85, transition: "opacity 150ms",
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = "1"}
          onMouseLeave={e => e.currentTarget.style.opacity = "0.85"}
        >
          All fixtures
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2 6h8M7 3l3 3-3 3" stroke={C.blue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
 
      {/* Cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {predictions.slice(0, 4).map((p, i) => {
          const confCol = p.conf === "high" ? C.green : p.conf === "medium" ? C.gold : C.orange;
          const confLabel = (p.conf || "").charAt(0).toUpperCase() + (p.conf || "").slice(1);
          const accentCol = p.col || C.blue;
 
          return (
            <Link
              key={p.fixtureId || i}
              to={p.fixtureId ? `/match/${p.fixtureId}` : "/predictions/premier-league"}
              style={{ textDecoration: "none", display: "block" }}
              className="hp-card"
            >
              <div style={{
                background: "rgba(0,255,240,.05)",
                border: "1px solid rgba(0,255,240,.15)",
                borderRadius: 0,
                padding: "16px 18px",
                position: "relative",
                overflow: "hidden",
                transition: "border-color 220ms, box-shadow 220ms",
              }}
                onMouseEnter={e=>{e.currentTarget.style.background="#000";e.currentTarget.style.boxShadow="5px 5px 0 #0a0a0a";e.currentTarget.style.transform="translate(-2px,-2px)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(0,255,240,.06)";e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="none";}}
              >
                {/* Top accent stripe */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, transparent, ${accentCol}88, transparent)`,
                }} />
 
                {/* Team names */}
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 12, gap: 8,
                }}>
                  <span style={{
                    fontSize: 13, fontWeight: 800, color: C.text,
                    fontFamily: "'Sora', sans-serif", flex: 1,
                  }}>{p.home}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 800, color: C.muted,
                    background: "rgba(255,255,255,0.05)", padding: "2px 8px",
                    borderRadius: 999, border: `1px solid ${C.line}`,
                    letterSpacing: "0.06em", flexShrink: 0,
                  }}>VS</span>
                  <span style={{
                    fontSize: 13, fontWeight: 800, color: C.text,
                    fontFamily: "'Sora', sans-serif", flex: 1, textAlign: "right",
                  }}>{p.away}</span>
                </div>
 
                {/* Win prob bar — taller + glowing */}
                <div style={{
                  display: "flex", height: 8, borderRadius: 999,
                  overflow: "hidden", marginBottom: 10, gap: 2,
                }}>
                  <div style={{
                    flex: p.homeProb,
                    background: `linear-gradient(90deg, ${C.blue}cc, ${C.blue})`,
                    boxShadow: `0 0 8px ${C.blue}66`,
                    borderRadius: "999px 0 0 999px",
                  }} />
                  <div style={{
                    flex: p.draw,
                    background: C.gold,
                    opacity: 0.7,
                  }} />
                  <div style={{
                    flex: p.awayProb,
                    background: `linear-gradient(90deg, ${C.red}, ${C.red}cc)`,
                    boxShadow: `0 0 8px ${C.red}66`,
                    borderRadius: "0 999px 999px 0",
                  }} />
                </div>
 
                {/* Percentages + predicted score */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    {[[p.homeProb + "%", C.blue, "H"], [p.draw + "%", C.gold, "D"], [p.awayProb + "%", C.red, "A"]].map(([v, c, l]) => (
                      <div key={l} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <span style={{
                          fontSize: 13, fontWeight: 900, color: c,
                          fontFamily: "'JetBrains Mono', monospace",
                          textShadow: `0 0 10px ${c}55`,
                        }}>{v}</span>
                        <span style={{ fontSize: 8, color: C.muted, letterSpacing: "0.06em" }}>{l}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <span style={{
                      fontSize: 16, fontWeight: 900, color: accentCol,
                      fontFamily: "'JetBrains Mono', monospace",
                      textShadow: `0 0 14px ${accentCol}66`,
                    }}>{p.score || "—"}</span>
                    <span style={{
                      fontSize: 8, fontWeight: 800, color: confCol,
                      background: `${confCol}14`, border: `1px solid ${confCol}35`,
                      padding: "2px 7px", borderRadius: 999, letterSpacing: "0.06em",
                    }}>{confLabel} conf.</span>
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
/* ─── Model performance (backend-driven) ────────────────── */
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
    <section style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 64px"}} ref={ref}>
      <div style={{display:"grid",gridTemplateColumns:byMarket.length > 0 ? "1fr 340px" : "1fr",gap:0,alignItems:"stretch",border:"1px solid rgba(0,255,240,.2)",boxShadow:"6px 6px 0 rgba(0,0,0,.2)"}}>
        {/* Bar chart */}
        {trend.length > 0 && (
          <div style={{background:"#000",padding:"24px 28px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <div>
                <div style={{fontSize:9,fontWeight:900,color:"rgba(0,255,240,.5)",letterSpacing:"0.14em",marginBottom:4}}>MODEL ACCURACY</div>
                <div style={{fontSize:18,fontWeight:900,color:"#00fff0",fontFamily:"'Bebas Neue',sans-serif",letterSpacing:1}}>Rolling Gameweeks</div>
              </div>
              {overallAccuracy > 0 && (
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:32,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",
                    color:C.green,lineHeight:1,textShadow:`0 0 18px ${C.green}55`}}>{overallAccuracy}%</div>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em"}}>OVERALL</div>
                </div>
              )}
            </div>
            <div style={{display:"flex",alignItems:"flex-end",gap:8,height:120}}>
              {trend.map((d,i) => (
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,height:"100%",justifyContent:"flex-end"}}>
                  <span style={{fontSize:9,fontWeight:800,color:d.acc>=70?C.green:d.acc>=60?C.gold:C.orange,
                    fontFamily:"'JetBrains Mono',monospace"}}>{d.acc}%</span>
                  <div style={{width:"100%",borderRadius:"4px 4px 0 0",
                    background:d.acc>=70?C.green:d.acc>=60?C.gold:C.orange,
                    height:visible?`${(d.acc/maxAcc)*90}%`:"0%",
                    opacity:d.acc>=70?.85:.6,
                    transition:`height 700ms ${i*80}ms cubic-bezier(0.22,1,0.36,1)`}}/>
                  <span style={{fontSize:8,color:"rgba(0,255,240,.35)"}}>{d.gw}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* By market breakdown */}
        {byMarket.length > 0 && (
          <div style={{background:"#111",borderLeft:"1px solid rgba(0,255,240,.2)",
            padding:"24px 24px",display:"flex",flexDirection:"column",gap:14,justifyContent:"center"}}>
            <div style={{fontSize:9,fontWeight:900,color:"rgba(0,255,240,.5)",letterSpacing:"0.14em",marginBottom:2}}>BY MARKET</div>
            {byMarket.map((m,i)=>(
              <div key={m.label}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#00fff0"}}>{m.label}</span>
                  <span style={{fontSize:16,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:m.col,
                    textShadow:`0 0 10px ${m.col}44`}}>{m.value}%</span>
                </div>
                <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.06)"}}>
                  <div style={{height:"100%",borderRadius:2,background:m.col,
                    width:visible?`${m.value}%`:"0%",
                    boxShadow:`0 0 8px ${m.col}66`,
                    transition:`width 800ms ${200+i*120}ms cubic-bezier(0.22,1,0.36,1)`}}/>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Stat of the moment (backend-driven) ────────────────── */
function StatOfMoment({ insight }) {
  if (!insight || !insight.stat || insight.stat === "—") return null;
  const s = insight;
  const col = s.col || C.gold;
 
  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 52px" }}>
      <div style={{
        background: `linear-gradient(135deg, rgba(12,18,30,0.98), ${col}0e)`,
        border: `1px solid ${col}33`,
        borderRadius: 20, padding: "28px 36px",
        display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap",
        position: "relative", overflow: "hidden",
        transition: "box-shadow 300ms",
      }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 60px ${col}18`}
        onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
      >
        {/* Background glow */}
        <div style={{
          position: "absolute", top: 0, right: 0, width: 350, height: 250,
          background: `radial-gradient(circle at 100% 0%, ${col}18, transparent 70%)`,
          pointerEvents: "none",
        }} />
 
        {/* Animated dot + label */}
        <div style={{ position: "absolute", top: 20, left: 36, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: col, boxShadow: `0 0 8px ${col}`,
            animation: "livePulse 2.5s ease infinite",
          }} />
          <span style={{
            fontSize: 9, fontWeight: 900, color: col,
            letterSpacing: "0.18em", textTransform: "uppercase",
          }}>STAT SPOTLIGHT</span>
        </div>
 
        {/* Big number */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span style={{
              fontSize: 64, fontWeight: 900,
              fontFamily: "'JetBrains Mono', monospace",
              color: col, lineHeight: 1,
              textShadow: `0 0 32px ${col}77`,
            }}>{s.stat}</span>
            <div>
              <div style={{
                fontSize: 18, fontWeight: 800, color: C.text,
                fontFamily: "'Sora', sans-serif", letterSpacing: "-0.01em",
              }}>{s.label}</div>
              <div style={{ fontSize: 12, color: col, fontWeight: 700, marginTop: 3 }}>{s.player}</div>
            </div>
          </div>
        </div>
 
        {/* Context text */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{
            fontSize: 14, color: C.muted, lineHeight: 1.72,
            margin: 0, fontFamily: "'Inter', sans-serif",
          }}>{s.context}</p>
        </div>
      </div>
    </section>
  );
}
/* ─── Recent results (backend-driven) ────────────────────── */
function RecentResults({ results = [], correct = 0, total = 0 }) {
  if (results.length === 0) return null;
 
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
 
  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 64px" }}>
      <div style={{
        background: "#000",
        border: "1px solid rgba(0,255,240,.2)",
        boxShadow: "6px 6px 0 rgba(0,0,0,.25)",
        padding: "24px 28px",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: 20,
        }}>
          <div>
            <div style={{
              fontSize: 9, fontWeight: 900, color: "rgba(0,255,240,.5)",
              letterSpacing: "0.18em", marginBottom: 5, fontFamily:"'DM Mono',monospace",
            }}>ACCOUNTABILITY</div>
            <div style={{
              fontSize: 22, fontWeight: 900, color: "#00fff0",
              fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1,
            }}>Recent Predictions</div>
          </div>
 
          {total > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Mini circular-ish accuracy indicator */}
              <div style={{ textAlign: "right" }}>
                <div style={{
                  fontSize: 28, fontWeight: 900, lineHeight: 1,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: pct >= 70 ? C.green : pct >= 55 ? C.gold : C.orange,
                  textShadow: `0 0 18px ${pct >= 70 ? C.green : pct >= 55 ? C.gold : C.orange}55`,
                }}>{pct}%</div>
                <div style={{ fontSize: 9, color: "rgba(0,255,240,.4)", letterSpacing: "0.08em", marginTop: 2 }}>
                  {correct}/{total} correct
                </div>
              </div>
            </div>
          )}
        </div>
 
        {/* Result rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {results.map((r, i) => {
            const ok = r.correct === true;
            const bad = r.correct === false;
            const borderCol = ok ? C.green : bad ? C.red : "rgba(0,255,240,0.3)";
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
                    padding: "11px 16px", borderRadius: 12,
                    background: `${borderCol}07`,
                    border: `1px solid ${borderCol}20`,
                    transition: "all 180ms",
                    position: "relative", overflow: "hidden",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `${borderCol}12`;
                    e.currentTarget.style.borderColor = `${borderCol}35`;
                    e.currentTarget.style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = `${borderCol}07`;
                    e.currentTarget.style.borderColor = `${borderCol}20`;
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  {/* Left glow accent */}
                  <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                    background: borderCol, opacity: ok ? 0.9 : bad ? 0.7 : 0.3,
                    borderRadius: "3px 0 0 3px",
                  }} />
 
                  {/* Icon badge */}
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                    background: `${borderCol}20`, border: `1.5px solid ${borderCol}50`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: ok || bad ? 13 : 18, fontWeight: 900, color: borderCol,
                  }}>
                    {icon}
                  </div>
 
                  {/* Match info */}
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 13, fontWeight: 700, color: "#00fff0", minWidth: 130,
                      fontFamily: "'Space Grotesk',sans-serif",
                    }}>
                      {r.home} vs {r.away}
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(0,255,240,.4)", fontFamily:"'DM Mono',monospace" }}>
                      Predicted: <b style={{ color: "#fff", fontFamily: "'DM Mono', monospace" }}>{r.pred}</b>
                    </span>
                    {r.actual && r.actual !== "Pending" && (
                      <span style={{ fontSize: 11, color: "rgba(0,255,240,.4)", fontFamily:"'DM Mono',monospace" }}>
                        Result: <b style={{ color: "#fff", fontFamily: "'DM Mono', monospace" }}>{r.actual}</b>
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        {/* Footer link */}
        <div style={{ marginTop:18, paddingTop:16, borderTop:"1px solid rgba(0,255,240,.12)", display:"flex", justifyContent:"flex-end" }}>
          <Link to="/predictions/premier-league" style={{
            fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:".18em",
            textTransform:"uppercase", color:"#ff2744", textDecoration:"none",
            display:"flex", alignItems:"center", gap:6,
            transition:"letter-spacing 160ms",
          }}
            onMouseEnter={e=>e.currentTarget.style.letterSpacing=".22em"}
            onMouseLeave={e=>e.currentTarget.style.letterSpacing=".18em"}
          >
            Full predictions log →
          </Link>
        </div>
      </div>
    </section>
  );
}
 
/* ─── Feature cards data ─────────────────────────────────── */
const FEATURES = [
  { to:"/predictions/premier-league", color:C.blue,   title:"Match Predictions",    subtitle:"This week's fixtures →",  description:"Win probabilities, expected scorelines, and model confidence across 9 competitions.", graphic:PitchGraphic,    badge:"LIVE" },
  { to:"/best-team",                  color:C.green,  title:"Best XI Builder",       subtitle:"Build your squad →",      description:"Optimal fantasy XI using composite scoring: fixtures, form, ICT index and season PPG.", graphic:FormationGraphic, badge:"FPL"  },
  { to:"/squad-builder",              color:C.gold,   title:"Squad Builder",         subtitle:"Plan transfers →",         description:"Full FPL squads with budget constraints. Best value picks, differentials and captain options.", graphic:BarGraphic,       badge:"FPL"  },
  { to:"/player",                     color:C.purple, title:"Player Profiles",       subtitle:"Analyse any player →",     description:"Deep statistical profiles with form trends and fixture difficulty across the season.", graphic:RadarGraphic,     badge:"STATS"},
  { to:"/gameweek-insights",          color:C.orange, title:"GW Insights",           subtitle:"This gameweek →",          description:"FDR, captain picks, differential watchlist and injury news all in one place.", graphic:TrendGraphic,     badge:"FPL"  },
  { to:"/fpl-table",                  color:C.red,    title:"Player Stats Table",    subtitle:"Full stats table →",       description:"Sortable stats for all players. Filter by position, team, price. Find hidden gems.", graphic:HeatmapGraphic,  badge:"STATS"},
  { to:"/live",                       color:C.teal,   title:"Live Scores",           subtitle:"Watch now →",              description:"Real-time scores and live match intelligence across 9 competitions — updated every 30 seconds.", graphic:PitchGraphic,    badge:"LIVE" },
  { to:"/news",                       color:"#ff2744", title:"News Tracker",          subtitle:"Latest updates →",         description:"Transfer rumours, injury alerts, and squad news. Stay ahead of your FPL rivals.", graphic:TrendGraphic,    badge:"NEW"  },
  { to:"/predictions/premier-league", color:C.gold,   title:"Prediction Tracker",    subtitle:"Check the model →",        description:"Full accountability log. Every prediction we've made, verified against real results with accuracy stats.", graphic:BarGraphic,      badge:"DATA" },
  { to:"/games",                      color:C.pink,   title:"Sports Arcade",         subtitle:"Play games →",             description:"Penalty shootouts, analytics quizzes, 2048 and more. Learn stats through play.", graphic:GameGraphic,      badge:"FUN"  },
  { to:"/learn",                      color:"#b388ff", title:"Ground Zero",           subtitle:"Explore methodology →",    description:"How the platform thinks. Research lab, model transparency, and the science behind forecasting.", graphic:LearnGraphic,    badge:"LAB"  },
  { to:"/about",                      color:"#ff2744", title:"About Me",               subtitle:"Meet the builder →",       description:"The person behind StatinSite. Football obsessive, data nerd, building tools that actually work.", graphic:LearnGraphic,    badge:"👋"   },
];

/* ─── Leagues data ───────────────────────────────────────── */
const LEAGUES = [
  {to:"/predictions/premier-league",name:"Premier League",col:"#4f9eff",flag:<svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#012169"/><path d="M0 0l18 13M18 0L0 13" stroke="white" strokeWidth="3"/><path d="M0 0l18 13M18 0L0 13" stroke="#C8102E" strokeWidth="1.8"/><path d="M9 0v13M0 6.5h18" stroke="white" strokeWidth="4"/><path d="M9 0v13M0 6.5h18" stroke="#C8102E" strokeWidth="2.4"/></svg>},
  {to:"/predictions/la-liga",name:"La Liga",col:"#ff6b35",flag:<svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#AA151B"/><rect y="2.8" width="18" height="7.4" fill="#F1BF00"/></svg>},
  {to:"/predictions/serie-a",name:"Serie A",col:"#00e09e",flag:<svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#009246"/><rect x="6" width="6" height="13" fill="white"/><rect x="12" width="6" height="13" fill="#CE2B37"/></svg>},
  {to:"/predictions/bundesliga",name:"Bundesliga",col:"#ff8c42",flag:<svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#000"/><rect y="4.33" width="18" height="4.34" fill="#DD0000"/><rect y="8.67" width="18" height="4.33" fill="#FFCC00"/></svg>},
  {to:"/predictions/ligue-1",name:"Ligue 1",col:"#b388ff",flag:<svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#002395"/><rect x="6" width="6" height="13" fill="white"/><rect x="12" width="6" height="13" fill="#ED2939"/></svg>},
  {to:"/predictions/champions-league",name:"UCL",col:"#0e1e5b",
    flag:<img src="https://media.api-sports.io/football/leagues/2.png" alt="UCL" style={{width:28,height:28,objectFit:"contain",display:"block"}} onError={e=>e.currentTarget.style.display="none"} />},
  {to:"/predictions/europa-league",name:"UEL",col:"#e35f10",
    flag:<img src="https://media.api-sports.io/football/leagues/3.png" alt="UEL" style={{width:28,height:28,objectFit:"contain",display:"block"}} onError={e=>e.currentTarget.style.display="none"} />},
  {to:"/predictions/conference-league",name:"UECL",col:"#00843d",
    flag:<img src="https://media.api-sports.io/football/leagues/848.png" alt="UECL" style={{width:28,height:28,objectFit:"contain",display:"block"}} onError={e=>e.currentTarget.style.display="none"} />},
  {to:"/predictions/fa-cup",name:"FA Cup",col:"#c62828",
    flag:<img src="https://media.api-sports.io/football/leagues/45.png" alt="FA Cup" style={{width:28,height:28,objectFit:"contain",display:"block"}} onError={e=>e.currentTarget.style.display="none"} />},
];

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE — backend-connected
═══════════════════════════════════════════════════════════ */
export default function HomePage() {
  const isMobile = useIsMobile();
  const [d, setD] = useState(null);   // mapDashboard output
  const [raw, setRaw] = useState({}); // raw dashboard for new blocks
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

  if (loading) {
  return (
    <div style={{ minHeight: "100vh", background: "#060a14", padding: "80px 20px 0" }}>
      <style>{`
        @keyframes shimmerSlide {
          0%   { background-position: -800px 0; }
          100% { background-position:  800px 0; }
        }
        .sk { 
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 800px 100%;
          animation: shimmerSlide 1.5s infinite linear;
          border-radius: 12px;
        }
      `}</style>
 
      {/* Hero skeleton */}
      <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", marginBottom: 48 }}>
        <div className="sk" style={{ height: 28, width: 220, margin: "0 auto 24px", borderRadius: 999 }} />
        <div className="sk" style={{ height: 72, width: "90%", margin: "0 auto 12px" }} />
        <div className="sk" style={{ height: 72, width: "60%", margin: "0 auto 24px" }} />
        <div className="sk" style={{ height: 18, width: "80%", margin: "0 auto 8px" }} />
        <div className="sk" style={{ height: 18, width: "65%", margin: "0 auto 36px" }} />
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          {[140, 130, 120, 110].map((w, i) => (
            <div key={i} className="sk" style={{ height: 44, width: w, borderRadius: 12, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
 
      {/* Stat tiles skeleton */}
      <div style={{ maxWidth: 1100, margin: "0 auto 48px", display: "flex", gap: 12 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="sk" style={{ flex: 1, height: 100, borderRadius: 16, animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
 
      {/* Cards skeleton */}
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="sk" style={{ height: 200, borderRadius: 16, animationDelay: `${i * 0.06}s` }} />
        ))}
      </div>
    </div>
  );
}

  // ── Extract data from mapDashboard output ──
  const predictions = (d?.predictions?.predictions) || [];
  const tickerItems = (d?.trendingPlayers?.items) || [];
  const insight = (d?.tacticalInsight?.primary) || null;
  const trend = (d?.modelMetrics?.trend) || [];
  const byMarket = (d?.modelMetrics?.byMarket) || [];
  const overallAcc = (d?.modelMetrics?.overallAccuracy) || 0;
  const results = (d?.recentResults?.results) || [];
  const resCorrect = (d?.recentResults?.correct) || 0;
  const resTotal = (d?.recentResults?.total) || 0;
  const mc = d?.modelConfidence || {};
 const hs = d?.heroStats || {};
const compsCount = hs.competitionsCount || LEAGUES.length;
const fixturesPred = hs.fixturesPredicted || 0;
const verifiedAcc = hs.verifiedAccuracy || 0;

  return (
    <div style={{ minHeight:"100vh", background:"#000", color:"#00fff0", overflow:"hidden", position:"relative" }}>
      <style>{HOME_CSS}</style>

      {/* Grid drift is handled by body::after in index.css */}

      {/* ── BG FLOATERS (concept decorative text) ── */}
      <div style={{ position:"fixed", fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(120px,18vw,220px)", color:"rgba(0,255,240,.03)", pointerEvents:"none", zIndex:0, top:"8vh", left:"-2%", lineHeight:1, userSelect:"none" }}>xG</div>
      <div style={{ position:"fixed", fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(80px,14vw,160px)", color:"rgba(0,255,240,.03)", pointerEvents:"none", zIndex:0, top:"52vh", right:"0%", lineHeight:1, userSelect:"none" }}>2–1</div>
      <div style={{ position:"fixed", fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(60px,11vw,130px)", color:"rgba(0,255,240,.03)", pointerEvents:"none", zIndex:0, bottom:"8vh", left:"35%", lineHeight:1, userSelect:"none" }}>89%</div>

      <div style={{ position:"relative", zIndex:1 }}>

        {/* ── 3-ROW LIVE TICKER ── */}
        <LiveTicker3Row/>

        {/* ══════════════════════════════════════════
            HERO — centered, Bebas Neue, concept style
        ══════════════════════════════════════════ */}
        <section style={{ padding:"clamp(48px,7vh,80px) 20px clamp(40px,6vh,64px)", textAlign:"center", position:"relative", overflow:"hidden" }}>

          {/* Kicker */}
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"transparent", color:"#00fff0", border:"1px solid rgba(0,255,240,.3)", padding:"4px 14px", fontFamily:"'DM Mono',monospace", fontSize:8, letterSpacing:".2em", textTransform:"uppercase", marginBottom:24, animation:"hpFadeDown .5s ease both" }}>
            <span style={{ width:6, height:6, background:"#ff2744", animation:"hpPulse 1.6s ease infinite", flexShrink:0 }}/>
            ◈ SEASON 2025/26 · LIVE DATA ENGINE
          </div>

          {/* H1 — Bebas Neue, giant, centered */}
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(80px,13vw,180px)", lineHeight:.88, letterSpacing:".02em", margin:"0 0 20px", animation:"hpFadeDown .55s .08s ease both" }}>
            <span style={{ display:"block", color:"rgba(0,255,240,.88)" }}>READ THE</span>
            <span style={{ display:"block", WebkitTextStroke:"1px #00fff0", WebkitTextFillColor:"transparent" }}>GAME</span>
          </h1>

          {/* Sub */}
          <p style={{ fontSize:"clamp(13px,1.8vw,15px)", color:"rgba(0,255,240,.4)", maxWidth:480, margin:"0 auto 36px", lineHeight:1.8, fontFamily:"'Space Grotesk',sans-serif", animation:"hpFadeDown .55s .16s ease both" }}>
            <strong style={{ color:"rgba(0,255,240,.88)", fontWeight:700 }}>Raw stats. No spin.</strong> Football intelligence for predictions, FPL decisions, and deeper match insight.
          </p>

          {/* CTA buttons — concept style */}
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", animation:"hpFadeDown .55s .24s ease both" }}>
            {[
              { to:"/predictions/premier-league", label:"Explore Live Data →", primary:true },
              { to:"/best-team",                  label:"Build FPL Team",      primary:false },
              { to:"/live",                       label:"Live Scores",          live:true },
              { to:"/learn",                      label:"Ground Zero",          primary:false },
            ].map(({ to, label, primary, live }, i) => (
              <Link key={i} to={to} className="hp-btn" style={{
                display:"inline-flex", alignItems:"center", gap:8,
                padding:"13px 26px",
                background: primary ? "#00fff0" : live ? "#ff2744" : "transparent",
                border: `1px solid ${primary ? "#00fff0" : live ? "#ff2744" : "rgba(0,255,240,.3)"}`,
                color: primary ? "#000" : live ? "#fff" : "#00fff0",
                boxShadow: "none",
                fontSize:11, fontWeight:700, textDecoration:"none",
                fontFamily:"'Space Grotesk',sans-serif", letterSpacing:".12em", textTransform:"uppercase",
              }}>{label}</Link>
            ))}
          </div>

          {/* Stat strip — concept hss style */}
          {(fixturesPred > 0 || verifiedAcc > 0) && (
            <div style={{ display:"inline-flex", marginTop:48, borderTop:"1px solid rgba(0,255,240,.2)", borderLeft:"1px solid rgba(0,255,240,.2)", borderRight:"1px solid rgba(0,255,240,.2)", animation:"hpFadeUp .6s .3s ease both" }}>
              {[
                fixturesPred > 0 && { n: `${fixturesPred}+`, l:"Fixtures Predicted" },
                verifiedAcc > 0  && { n: `${verifiedAcc}%`,  l:"Verified Accuracy"  },
                predictions.length > 0 && { n: predictions.length, l:"Live Predictions" },
              ].filter(Boolean).map((s, i, arr) => (
                <div key={i} style={{ padding:"16px 28px", borderRight: i < arr.length-1 ? "1px solid rgba(0,255,240,.1)" : "none", textAlign:"center" }}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:52, lineHeight:1, color:"rgba(0,255,240,.88)" }}>{s.n}</div>
                  <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, letterSpacing:".18em", textTransform:"uppercase", color:"rgba(0,255,240,.3)", marginTop:4 }}>{s.l}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════
            PREDICTIONS STRIP
        ══════════════════════════════════════════ */}
        <PredictionStrip predictions={predictions}/>

        {/* ══════════════════════════════════════════
            STAT SPOTLIGHT
        ══════════════════════════════════════════ */}
        <StatOfMoment insight={insight}/>

        {/* ══════════════════════════════════════════
            DIVIDER MARQUEE (concept style — black bg)
        ══════════════════════════════════════════ */}
        <div style={{ background:"#000", borderTop:"1px solid rgba(0,255,240,.12)", borderBottom:"1px solid rgba(0,255,240,.12)", height:52, overflow:"hidden", display:"flex", alignItems:"center" }}>
          <div style={{ display:"flex", animation:"hpMarquee 28s linear infinite", whiteSpace:"nowrap" }}>
            {["Premier League","La Liga","Bundesliga","Serie A","Champions League","Ligue 1","Eredivisie","Copa Libertadores","MLS","FA Cup","Europa League","World Cup",
              "Premier League","La Liga","Bundesliga","Serie A","Champions League","Ligue 1","Eredivisie","Copa Libertadores","MLS","FA Cup","Europa League","World Cup",
            ].map((name, i) => (
              <div key={i} style={{ padding:"0 34px", fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:3, textTransform:"uppercase", color: i%3===0 ? "#00fff0" : "rgba(0,255,240,.12)", display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
                <span style={{ width:4, height:4, borderRadius:"50%", background: i%3===0 ? "#ff2744" : "rgba(0,255,240,.3)", boxShadow:"none", flexShrink:0 }}/>
                {name}
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            FEATURE CARDS — concept grid style
        ══════════════════════════════════════════ */}
        <section style={{ borderTop:"1px solid rgba(0,255,240,.1)", borderBottom:"1px solid rgba(0,255,240,.1)" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))" }}>
            {FEATURES.map((f, i) => <FeatureCard key={f.to} {...f} index={i+1} delay={i*55}/>)}
          </div>
        </section>

        {/* ══════════════════════════════════════════
            MODEL PERFORMANCE
        ══════════════════════════════════════════ */}

        {/* ── ACCOUNTABILITY DIVIDER ── */}
        <div style={{ background:"#000", borderTop:"1px solid rgba(0,255,240,.1)", borderBottom:"1px solid rgba(0,255,240,.1)", padding:"40px 24px 36px", textAlign:"center", position:"relative", overflow:"hidden" }}>
          {/* faint watermark */}
          <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(80px,14vw,160px)", color:"rgba(0,255,240,.03)", lineHeight:1, pointerEvents:"none", userSelect:"none", whiteSpace:"nowrap" }}>PREDICTION LOG</div>
          <div style={{ position:"relative", zIndex:1 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:10, background:"#000", padding:"4px 14px", marginBottom:14 }}>
              <span style={{ width:6, height:6, background:"#ff2744", display:"inline-block", animation:"hpPulse 1.6s ease infinite", flexShrink:0 }}/>
              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:".2em", textTransform:"uppercase", color:"rgba(0,255,240,.6)" }}>MODEL ACCOUNTABILITY</span>
            </div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(38px,6vw,72px)", lineHeight:.9, color:"rgba(0,255,240,.88)", letterSpacing:".02em", marginBottom:10 }}>
              EVERY PREDICTION.<br/><span style={{ WebkitTextStroke:"2px #0a0a0a", WebkitTextFillColor:"transparent" }}>VERIFIED.</span>
            </div>
            <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:13, color:"rgba(0,0,0,.5)", maxWidth:440, margin:"0 auto", lineHeight:1.7 }}>
              No cherry-picking. No hiding misses. Full log of every match predicted by the model — wins, draws, losses and scorelines — tracked against real results.
            </p>
          </div>
        </div>

        <ModelPerformance trend={trend} byMarket={byMarket} overallAccuracy={overallAcc}/>

        {/* ══════════════════════════════════════════
            RECENT RESULTS
        ══════════════════════════════════════════ */}
        <RecentResults results={results} correct={resCorrect} total={resTotal}/>

        {/* ══════════════════════════════════════════
            LEAGUES STRIP
        ══════════════════════════════════════════ */}
        <section style={{ padding:"0 20px 60px", maxWidth:1200, margin:"0 auto" }}>
          <div style={{ background:"#040408", border:"1px solid rgba(0,255,240,.12)", padding:"28px 32px" }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, letterSpacing:".2em", textTransform:"uppercase", color:"rgba(0,255,240,.3)", marginBottom:6 }}>Covering {LEAGUES.length} competitions</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:2, color:"#00fff0", marginBottom:20 }}>Pick Your League</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {LEAGUES.map(({ to, name, flag, col }) => (
                <Link key={to} to={to} className="hp-btn" style={{
                  display:"flex", alignItems:"center", gap:8,
                  padding:"9px 16px", background:"transparent",
                  border:"1px solid rgba(0,255,240,.2)", color:"rgba(0,255,240,.5)",
                  fontSize:12, fontWeight:700, textDecoration:"none",
                  fontFamily:"'Space Grotesk',sans-serif",
                  boxShadow:"none",
                }}
                  onMouseEnter={e=>{e.currentTarget.style.background="#00fff0";e.currentTarget.style.color="#000";e.currentTarget.style.borderColor="#00fff0";e.currentTarget.style.transform="translate(-2px,-2px)";e.currentTarget.style.boxShadow="4px 4px 0 #0a0a0a";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#00fff0";e.currentTarget.style.borderColor="rgba(0,255,240,.25)";e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}
                >
                  <span style={{ display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, width:32, height:26 }}>{flag}</span>
                  {name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            HOW IT WORKS / BOTTOM CTA
        ══════════════════════════════════════════ */}
        <section style={{ background:"#000", borderTop:"1px solid rgba(0,255,240,.12)", padding:"72px 48px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:40, flexWrap:"wrap" }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(52px,5vw,84px)", lineHeight:.88, color:"rgba(0,255,240,.8)", marginBottom:14 }}>
              EVERY STAT.<br/><span style={{ color:"#00fff0" }}>NO PAYWALLS.</span>
            </div>
            <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:13, lineHeight:1.75, color:"rgba(0,255,240,.25)", maxWidth:340, margin:0 }}>
              Full access to all leagues, all players, all advanced metrics. Free forever — no credit card required.
            </p>
          </div>
          <Link to="/predictions/premier-league" className="hp-btn" style={{
            padding:"18px 48px", background:"#00fff0", color:"#000",
            border:"none", boxShadow:"none",
            fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:2,
            textDecoration:"none", flexShrink:0,
          }}>Start For Free →</Link>
        </section>

      </div>
    </div>
  );
}