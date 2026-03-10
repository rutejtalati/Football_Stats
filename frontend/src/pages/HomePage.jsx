// HomePage.jsx — StatinSite v2
import { Link } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";


/* ── Responsive hook ─────────────────────────────────────── */
function useIsMobile(bp = 640) {
  const [m, setM] = React.useState(typeof window !== "undefined" ? window.innerWidth < bp : false);
  React.useEffect(() => {
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
  @keyframes fadeDown  { from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeUp    { from{opacity:0;transform:translateY(14px)}  to{opacity:1;transform:translateY(0)} }
  @keyframes cardIn    { from{opacity:0;transform:translateY(20px)}  to{opacity:1;transform:translateY(0)} }
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
  .hp-card { transition:all 220ms cubic-bezier(0.22,1,0.36,1); }
  .hp-card:hover { transform:translateY(-5px) !important; }
  .hp-btn  { transition:all 160ms ease; cursor:pointer; }
  .hp-btn:hover  { filter:brightness(1.15); transform:translateY(-2px); }
  .hp-tag:hover  { transform:translateY(-1px); }
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

/* ─── Dynamic stat tile (upgraded) ─────────────────────── */
function StatTile({ value, suffix="", label, color, delay=0, icon, trend }) {
  const [v, ref] = useCountUp(value, 1600, delay);
  const [hov, setHov] = useState(false);
  return (
    <div ref={ref}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", flexDirection:"column", gap:8,
        padding:"20px 22px", borderRadius:16,
        background: hov ? `linear-gradient(135deg,rgba(12,18,30,0.98),${color}12)` : "rgba(255,255,255,0.025)",
        border:`1px solid ${hov ? color+"55" : "rgba(255,255,255,0.07)"}`,
        flex:1, minWidth:0, position:"relative", overflow:"hidden",
        transition:"all 220ms cubic-bezier(0.22,1,0.36,1)",
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hov ? `0 12px 32px ${color}22` : "none",
        cursor:"default",
      }}>
      {/* Background glow */}
      <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",
        background:color,opacity:hov?.12:.04,filter:"blur(24px)",transition:"opacity 220ms",pointerEvents:"none"}}/>
      {/* Top row */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:18,lineHeight:1}}>{icon}</span>
        {trend && (
          <span style={{fontSize:9,fontWeight:800,color:C.green,background:`${C.green}14`,
            border:`1px solid ${C.green}30`,padding:"2px 7px",borderRadius:999,letterSpacing:"0.06em"}}>
            {trend}
          </span>
        )}
      </div>
      {/* Value */}
      <div style={{display:"flex",alignItems:"baseline",gap:2}}>
        <span style={{
          fontSize:36, fontWeight:900, fontFamily:"'JetBrains Mono',monospace",
          color, lineHeight:1, letterSpacing:"-0.03em",
          textShadow:hov?`0 0 28px ${color}88`:`0 0 14px ${color}44`,
          transition:"text-shadow 220ms",
        }}>{v.toLocaleString()}</span>
        <span style={{fontSize:16,fontWeight:700,color,opacity:.8}}>{suffix}</span>
      </div>
      {/* Label */}
      <span style={{fontSize:9,fontWeight:800,color:C.muted,
        letterSpacing:"0.12em",textTransform:"uppercase",fontFamily:"'Inter',sans-serif"}}>
        {label}
      </span>
      {/* Bottom bar */}
      <div style={{height:2,borderRadius:1,background:"rgba(255,255,255,0.05)"}}>
        <div style={{height:"100%",width:hov?"100%":"40%",background:color,borderRadius:1,
          transition:"width 600ms cubic-bezier(0.22,1,0.36,1)",opacity:.7}}/>
      </div>
    </div>
  );
}

/* ─── Live ticker ───────────────────────────────────────── */
const TICKER_ITEMS = [
  { label:"Salah xG/90", value:"0.74", col:C.gold },
  { label:"Haaland form", value:"8.2", col:C.green },
  { label:"Arsenal win prob", value:"68%", col:C.blue },
  { label:"PPDA elite threshold", value:"≤7.0", col:C.teal },
  { label:"PSxG top keeper", value:"+0.18", col:C.purple },
  { label:"Over 2.5 avg", value:"54%", col:C.orange },
  { label:"Model accuracy", value:"64%", col:C.green },
  { label:"Palmer xA/90", value:"0.31", col:C.pink },
  { label:"Mbeumo shots/90", value:"3.2", col:C.blue },
  { label:"Liverpool xG diff", value:"+0.62", col:C.red },
  { label:"Watkins ICT", value:"52.4", col:C.gold },
  { label:"BTTS Premier League", value:"58%", col:C.teal },
];

function LiveTicker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]; // doubled for seamless loop
  return (
    <div style={{
      borderTop:`1px solid ${C.line}`, borderBottom:`1px solid ${C.line}`,
      background:"rgba(255,255,255,0.015)", overflow:"hidden", padding:"10px 0",
      position:"relative",
    }}>
      {/* Fade edges */}
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:80,
        background:"linear-gradient(to right,#060a14,transparent)",zIndex:2,pointerEvents:"none"}}/>
      <div style={{position:"absolute",right:0,top:0,bottom:0,width:80,
        background:"linear-gradient(to left,#060a14,transparent)",zIndex:2,pointerEvents:"none"}}/>
      <div style={{display:"flex",gap:0,animation:"tickerMove 40s linear infinite",width:"max-content"}}>
        {items.map((item, i) => (
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
      {/* Radial gradient mesh */}
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-60%)",
        width:800,height:500,background:"radial-gradient(ellipse,rgba(79,158,255,0.07) 0%,rgba(0,224,158,0.03) 45%,transparent 70%)",}}/>
      {/* Pitch SVG overlay */}
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
        <path d="M 190,300 A 80,80 0 0,0 190,299.9" fill="none" stroke="white" strokeWidth="1"/>
        <circle cx="240" cy="300" r="2" fill="white"/>
        <circle cx="960" cy="300" r="2" fill="white"/>
      </svg>
      {/* Floating orbs */}
      {[[C.blue,.06,"-5%","10%","55s"],[C.green,.05,"78%","55%","68s"],[C.purple,.04,"42%","-6%","62s"],[C.gold,.04,"20%","70%","72s"]].map(([col,op,l,t,dur],i)=>(
        <div key={i} style={{position:"absolute",width:500,height:500,borderRadius:"50%",left:l,top:t,
          background:col,opacity:op,filter:"blur(110px)",animation:`orbFloat ${dur} ease-in-out infinite`,animationDelay:`${i*9}s`}}/>
      ))}
      {/* Floating particles */}
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
      {/* Animated ball path */}
      <path d="M 40 62 C 65 28 120 25 148 50" stroke={color} strokeWidth="2" strokeOpacity={hov?.9:.55}
        strokeDasharray="5 3" strokeLinecap="round"
        style={{strokeDashoffset: hov?0:100, transition:"stroke-dashoffset 600ms ease"}}/>
      {/* Ball */}
      <circle cx={hov?148:40} cy={hov?50:62} r="6" fill={color} opacity={hov?.95:.7}
        style={{transition:"cx 600ms ease, cy 600ms ease"}}>
      </circle>
      <circle cx={hov?148:40} cy={hov?50:62} r="11" fill={color} opacity={hov?.2:.08}
        style={{transition:"cx 600ms ease, cy 600ms ease"}}/>
      {/* Players */}
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
          <circle cx={x} cy={y} r={6} fill={color} opacity={i===0?hov?.5:.3:hov?.9:.6}
            style={{transition:`opacity 220ms ${i*18}ms`}}/>
          <circle cx={x} cy={y} r={11} fill={color} opacity={hov?.12:.05}
            style={{transition:`opacity 220ms ${i*18}ms`}}/>
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

/* ─── Feature card ──────────────────────────────────────── */
function FeatureCard({ to, color, title, subtitle, description, graphic: GraphicComp, badge, delay=0 }) {
  const [hov, setHov] = useState(false);
  return (
    <Link to={to}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="hp-card"
      style={{
        display:"flex", flexDirection:"column",
        background: hov ? `linear-gradient(135deg,rgba(12,18,30,0.98) 0%,${color}0d 100%)` : C.panel,
        border:`1px solid ${hov ? color+"50" : C.line}`,
        borderRadius:20, overflow:"hidden", textDecoration:"none",
        boxShadow: hov ? `0 20px 52px rgba(0,0,0,0.55), 0 0 0 1px ${color}22` : "none",
        animationDelay:delay+"ms", animation:"cardIn 500ms ease both",
        position:"relative",
      }}>
      {/* Top glow strip */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:1,
        background:`linear-gradient(90deg,transparent,${color}${hov?"88":"33"},transparent)`,
        transition:"opacity 220ms"}}/>
      {/* Graphic */}
      <div style={{
        height:130, display:"flex", alignItems:"center", justifyContent:"center",
        background:`linear-gradient(135deg,${color}0d 0%,rgba(0,0,0,0) 60%)`,
        borderBottom:`1px solid ${hov ? color+"30" : C.line}`,
        transition:"border-color 220ms", position:"relative",
      }}>
        <div style={{position:"absolute",top:0,right:0,width:100,height:100,
          background:`radial-gradient(circle at 100% 0%,${color}1a 0%,transparent 65%)`,pointerEvents:"none"}}/>
        <div style={{position:"relative",zIndex:1,transition:"transform 300ms",transform:hov?"scale(1.04)":"scale(1)"}}>
          <GraphicComp color={color} hov={hov}/>
        </div>
        {badge && (
          <div style={{position:"absolute",top:10,right:10,padding:"3px 9px",borderRadius:999,
            background:color+"22",border:`1px solid ${color}44`,fontSize:9,fontWeight:800,color,
            fontFamily:"'Inter',sans-serif",letterSpacing:"0.07em"}}>{badge}</div>
        )}
      </div>
      {/* Text */}
      <div style={{padding:"18px 20px 20px",flex:1,display:"flex",flexDirection:"column",gap:6}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:3,height:18,borderRadius:2,background:color,
            boxShadow:hov?`0 0 12px ${color}88`:`0 0 6px ${color}44`,
            transition:"box-shadow 220ms",flexShrink:0}}/>
          <span style={{fontSize:16,fontWeight:800,color:C.text,fontFamily:"'Sora',sans-serif",
            letterSpacing:"-0.01em"}}>{title}</span>
        </div>
        <p style={{fontSize:12,color:C.muted,margin:0,lineHeight:1.65,fontFamily:"'Inter',sans-serif"}}>{description}</p>
        <div style={{marginTop:"auto",paddingTop:12,display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:11,fontWeight:700,color,fontFamily:"'Inter',sans-serif"}}>{subtitle}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            style={{transform:hov?"translateX(4px)":"translateX(0)",transition:"transform 180ms"}}>
            <path d="M2 6h8M7 3l3 3-3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </Link>
  );
}

/* ─── Live predictions strip ────────────────────────────── */
const PREDICTIONS = [
  { home:"Arsenal",    away:"Chelsea",   homeProb:62, awayProb:18, draw:20, col:C.blue,   conf:"High",   score:"2-1" },
  { home:"Man City",   away:"Liverpool", homeProb:55, awayProb:26, draw:19, col:C.green,  conf:"Medium", score:"2-0" },
  { home:"Barcelona",  away:"Real Madrid",homeProb:44,awayProb:35, draw:21, col:C.gold,   conf:"Low",    score:"1-1" },
  { home:"PSG",        away:"Monaco",    homeProb:58, awayProb:22, draw:20, col:C.purple, conf:"High",   score:"2-0" },
];

function PredictionStrip() {
  return (
    <section style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 52px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:C.green,
            boxShadow:`0 0 8px ${C.green}`,animation:"livePulse 2s ease infinite"}}/>
          <span style={{fontSize:12,fontWeight:800,color:C.text,fontFamily:"'Sora',sans-serif",
            letterSpacing:"0.06em"}}>TODAY'S TOP PREDICTIONS</span>
        </div>
        <Link to="/predictions/premier-league" style={{fontSize:11,fontWeight:700,color:C.blue,
          textDecoration:"none",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",gap:5}}>
          All fixtures
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M7 3l3 3-3 3" stroke={C.blue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
        {PREDICTIONS.map((p, i) => {
          const confCol = p.conf==="High"?C.green:p.conf==="Medium"?C.gold:C.orange;
          return (
            <Link key={i} to="/predictions/premier-league"
              style={{textDecoration:"none",display:"block"}}
              className="hp-card">
              <div style={{
                background:"rgba(255,255,255,0.025)",border:`1px solid ${C.line}`,borderRadius:14,
                padding:"14px 16px",position:"relative",overflow:"hidden",
              }}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,
                  background:`linear-gradient(90deg,transparent,${p.col}66,transparent)`}}/>
                {/* Teams */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:"'Sora',sans-serif"}}>{p.home}</span>
                  <span style={{fontSize:10,fontWeight:700,color:C.muted,background:"rgba(255,255,255,0.05)",
                    padding:"2px 7px",borderRadius:999,border:`1px solid ${C.line}`}}>vs</span>
                  <span style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:"'Sora',sans-serif"}}>{p.away}</span>
                </div>
                {/* Probability bar */}
                <div style={{display:"flex",height:6,borderRadius:3,overflow:"hidden",marginBottom:8,gap:1}}>
                  <div style={{flex:p.homeProb,background:C.blue,opacity:.8}}/>
                  <div style={{flex:p.draw,background:C.gold,opacity:.7}}/>
                  <div style={{flex:p.awayProb,background:C.red,opacity:.8}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",gap:10}}>
                    {[[p.homeProb+"%",C.blue,"H"],[p.draw+"%",C.gold,"D"],[p.awayProb+"%",C.red,"A"]].map(([v,c,l])=>(
                      <div key={l} style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                        <span style={{fontSize:12,fontWeight:900,color:c,fontFamily:"'JetBrains Mono',monospace"}}>{v}</span>
                        <span style={{fontSize:8,color:C.muted}}>{l}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                    <span style={{fontSize:14,fontWeight:900,color:p.col,fontFamily:"'JetBrains Mono',monospace"}}>{p.score}</span>
                    <span style={{fontSize:8,fontWeight:800,color:confCol,background:`${confCol}14`,
                      border:`1px solid ${confCol}30`,padding:"1px 6px",borderRadius:999}}>{p.conf} conf.</span>
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

/* ─── Model performance chart ───────────────────────────── */
const PERF_DATA = [
  {gw:"GW28",acc:71},{gw:"GW29",acc:64},{gw:"GW30",acc:78},{gw:"GW31",acc:60},
  {gw:"GW32",acc:82},{gw:"GW33",acc:68},{gw:"GW34",acc:74},{gw:"GW35",acc:70},
];

function ModelPerformance() {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  const maxAcc = Math.max(...PERF_DATA.map(d => d.acc));
  const metrics = [
    { l:"Match Result", v:64, col:C.green },
    { l:"BTTS", v:71, col:C.blue },
    { l:"Over 2.5", v:68, col:C.gold },
    { l:"Correct Score", v:38, col:C.purple },
  ];
  return (
    <section style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 64px"}} ref={ref}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:16,alignItems:"stretch"}}>
        {/* Bar chart */}
        <div style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${C.line}`,
          borderRadius:20,padding:"24px 28px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <div>
              <div style={{fontSize:9,fontWeight:900,color:C.muted,letterSpacing:"0.14em",marginBottom:4}}>MODEL ACCURACY</div>
              <div style={{fontSize:18,fontWeight:900,color:C.text,fontFamily:"'Sora',sans-serif"}}>Last 8 Gameweeks</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:32,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",
                color:C.green,lineHeight:1,textShadow:`0 0 18px ${C.green}55`}}>64%</div>
              <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em"}}>SEASON AVG</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"flex-end",gap:8,height:120}}>
            {PERF_DATA.map((d,i) => (
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,height:"100%",justifyContent:"flex-end"}}>
                <span style={{fontSize:9,fontWeight:800,color:d.acc>=70?C.green:d.acc>=60?C.gold:C.orange,
                  fontFamily:"'JetBrains Mono',monospace"}}>{d.acc}%</span>
                <div style={{width:"100%",borderRadius:"4px 4px 0 0",
                  background:d.acc>=70?C.green:d.acc>=60?C.gold:C.orange,
                  height:visible?`${(d.acc/maxAcc)*90}%`:"0%",
                  opacity:d.acc>=70?.85:.6,
                  transition:`height 700ms ${i*80}ms cubic-bezier(0.22,1,0.36,1)`}}/>
                <span style={{fontSize:8,color:C.muted}}>{d.gw}</span>
              </div>
            ))}
          </div>
          <div style={{fontSize:10,color:C.soft,marginTop:12,lineHeight:1.6}}>
            Based on <b style={{color:C.muted}}>15,000+</b> fixtures across EPL, La Liga, Serie A, Ligue 1.
          </div>
        </div>
        {/* Accuracy breakdown */}
        <div style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${C.line}`,
          borderRadius:20,padding:"24px 24px",display:"flex",flexDirection:"column",gap:14,justifyContent:"center"}}>
          <div style={{fontSize:9,fontWeight:900,color:C.muted,letterSpacing:"0.14em",marginBottom:2}}>BY MARKET</div>
          {metrics.map((m,i)=>(
            <div key={m.l}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:700,color:C.text}}>{m.l}</span>
                <span style={{fontSize:16,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:m.col,
                  textShadow:`0 0 10px ${m.col}44`}}>{m.v}%</span>
              </div>
              <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.06)"}}>
                <div style={{height:"100%",borderRadius:2,background:m.col,
                  width:visible?`${m.v}%`:"0%",
                  boxShadow:`0 0 8px ${m.col}66`,
                  transition:`width 800ms ${200+i*120}ms cubic-bezier(0.22,1,0.36,1)`}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Stat of the moment ─────────────────────────────────── */
const STAT_MOMENTS = [
  { stat:"0.82", label:"xG per 90", player:"Erling Haaland", context:"Highest in Europe this season. Scores 1 in every 1.5 shots on target.", col:C.blue, icon:"⚽" },
  { stat:"+0.21", label:"PSxG-GA /game", player:"David Raya", context:"Elite shot-stopping. Saving shots he statistically shouldn't.", col:C.green, icon:"🧤" },
  { stat:"5.8", label:"PPDA", player:"Man City", context:"Elite pressing intensity. Allows fewer than 6 passes per defensive action.", col:C.gold, icon:"⚡" },
  { stat:"0.31", label:"xA per 90", player:"Cole Palmer", context:"Highest creative output in the Premier League this month.", col:C.purple, icon:"🎯" },
];

function StatOfMoment() {
  const idx = Math.floor(Date.now() / 86400000) % STAT_MOMENTS.length;
  const s = STAT_MOMENTS[idx];
  return (
    <section style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 52px"}}>
      <div style={{
        background:`linear-gradient(135deg,rgba(12,18,30,0.98),${s.col}0d)`,
        border:`1px solid ${s.col}30`,borderRadius:20,padding:"24px 32px",
        display:"flex",gap:28,alignItems:"center",flexWrap:"wrap",position:"relative",overflow:"hidden",
      }}>
        <div style={{position:"absolute",top:0,right:0,width:300,height:200,
          background:`radial-gradient(circle at 100% 0%,${s.col}14,transparent 70%)`,pointerEvents:"none"}}/>
        <div style={{display:"flex",flexDirection:"column",gap:2}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:s.col,boxShadow:`0 0 8px ${s.col}`,
              animation:"livePulse 2.5s ease infinite"}}/>
            <span style={{fontSize:9,fontWeight:900,color:s.col,letterSpacing:"0.15em"}}>STAT OF THE DAY</span>
          </div>
          <div style={{display:"flex",alignItems:"baseline",gap:10}}>
            <span style={{fontSize:56,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",
              color:s.col,lineHeight:1,textShadow:`0 0 28px ${s.col}66`}}>{s.stat}</span>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:C.text,fontFamily:"'Sora',sans-serif"}}>{s.label}</div>
              <div style={{fontSize:11,color:s.col,fontWeight:700}}>{s.icon} {s.player}</div>
            </div>
          </div>
        </div>
        <div style={{flex:1,minWidth:200}}>
          <p style={{fontSize:13,color:C.muted,lineHeight:1.7,margin:0,fontFamily:"'Inter',sans-serif"}}>{s.context}</p>
        </div>
      </div>
    </section>
  );
}

/* ─── Recent results ─────────────────────────────────────── */
const RECENT_RESULTS = [
  { home:"Arsenal",   away:"Man City",  pred:"Arsenal",  actual:"Arsenal",  score:"2-1", conf:"High",   correct:true  },
  { home:"Liverpool", away:"Chelsea",   pred:"Draw",     actual:"Liverpool",score:"1-0", conf:"Medium", correct:false },
  { home:"Barcelona", away:"Atletico",  pred:"Barcelona",actual:"Barcelona",score:"3-1", conf:"High",   correct:true  },
  { home:"PSG",       away:"Marseille", pred:"PSG",      actual:"PSG",      score:"2-0", conf:"High",   correct:true  },
  { home:"Juventus",  away:"Inter",     pred:"Draw",     actual:"Draw",     score:"1-1", conf:"Medium", correct:true  },
];

function RecentResults() {
  return (
    <section style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 64px"}}>
      <div style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${C.line}`,
        borderRadius:20,padding:"24px 28px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <div>
            <div style={{fontSize:9,fontWeight:900,color:C.muted,letterSpacing:"0.14em",marginBottom:4}}>ACCOUNTABILITY</div>
            <div style={{fontSize:18,fontWeight:900,color:C.text,fontFamily:"'Sora',sans-serif"}}>Recent Predictions</div>
          </div>
          <div style={{padding:"6px 14px",borderRadius:999,background:`${C.green}12`,
            border:`1px solid ${C.green}30`,fontSize:12,fontWeight:800,color:C.green,
            fontFamily:"'JetBrains Mono',monospace"}}>
            {RECENT_RESULTS.filter(r=>r.correct).length}/{RECENT_RESULTS.length} correct
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {RECENT_RESULTS.map((r,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",
              borderRadius:10,background:`${r.correct?C.green:C.red}08`,
              border:`1px solid ${r.correct?C.green:C.red}18`,transition:"all 180ms"}}>
              <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,
                background:r.correct?`${C.green}20`:`${C.red}20`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:12,border:`1px solid ${r.correct?C.green:C.red}40`}}>
                {r.correct?"✓":"✗"}
              </div>
              <div style={{flex:1,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:12,fontWeight:700,color:C.text,minWidth:120}}>
                  {r.home} vs {r.away}
                </span>
                <span style={{fontSize:10,color:C.muted}}>Predicted: <b style={{color:C.text}}>{r.pred}</b></span>
                <span style={{fontSize:10,color:C.muted}}>Result: <b style={{color:C.text}}>{r.actual}</b></span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                <span style={{fontSize:13,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",
                  color:r.correct?C.green:C.red}}>{r.score}</span>
                <span style={{fontSize:8,fontWeight:800,color:C.muted,background:"rgba(255,255,255,0.05)",
                  padding:"2px 7px",borderRadius:999,border:`1px solid ${C.line}`}}>{r.conf}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Feature cards data ─────────────────────────────────── */
const FEATURES = [
  { to:"/predictions/premier-league", color:C.blue,   title:"Match Predictions",    subtitle:"This week's fixtures →",  description:"Dixon-Coles Poisson + Elo models. Win probabilities, expected scorelines and betting edge analysis.", graphic:PitchGraphic,    badge:"LIVE" },
  { to:"/best-team",                  color:C.green,  title:"Best XI Builder",       subtitle:"Build your squad →",      description:"Optimal fantasy XI using composite scoring: fixtures, form, ICT index and season PPG.", graphic:FormationGraphic, badge:"FPL"  },
  { to:"/squad-builder",              color:C.gold,   title:"Squad Builder",         subtitle:"Plan transfers →",         description:"Full FPL squads with budget constraints. Best value picks, differentials and captain options.", graphic:BarGraphic,       badge:"FPL"  },
  { to:"/player",                     color:C.purple, title:"Player Insight",        subtitle:"Analyse any player →",     description:"Deep statistical profiles — xG, xA, form trends and fixture difficulty across the season.", graphic:RadarGraphic,     badge:"STATS"},
  { to:"/gameweek-insights",          color:C.orange, title:"GW Insights",           subtitle:"This gameweek →",          description:"FDR, captain picks, differential watchlist and injury news all in one place.", graphic:TrendGraphic,     badge:"FPL"  },
  { to:"/fpl-table",                  color:C.red,    title:"Player Stats Table",    subtitle:"Full stats table →",       description:"Sortable stats for all players — filter by position, team, price. Find hidden gems.", graphic:HeatmapGraphic,  badge:"STATS"},
  { to:"/games",                      color:C.teal,   title:"Sports Arcade",         subtitle:"Play 12 games →",          description:"Penalty shootouts, tennis, analytics quizzes, 2048 and more. Learn stats through play.", graphic:GameGraphic,      badge:"NEW"  },
  { to:"/learn",                      color:C.pink,   title:"Ground Zero",           subtitle:"Learn the models →",       description:"Interactive explainers for every algorithm: xG, Poisson, Elo, Dixon-Coles and more.", graphic:LearnGraphic,    badge:"EDU"  },
];

/* ─── Main page ─────────────────────────────────────────── */
export default function HomePage() {
  const isMobile = useIsMobile();
  return (
    <div style={{minHeight:"100vh",background:"transparent",overflow:"hidden"}}>
      <style>{HOME_CSS}</style>

      {/* ── HERO ── */}
      <section style={{position:"relative",padding:"80px 20px 60px",maxWidth:1200,margin:"0 auto",textAlign:"center",overflow:"hidden"}}>
        <PitchGridBg/>
        <div style={{position:"relative",zIndex:1}}>
          {/* Badge */}
          <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"5px 14px",borderRadius:999,
            background:"rgba(79,158,255,0.1)",border:"1px solid rgba(79,158,255,0.25)",marginBottom:24,
            animation:"fadeDown 600ms ease both"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:C.blue,animation:"livePulse 2s ease infinite"}}/>
            <span style={{fontSize:11,fontWeight:700,color:C.blue,letterSpacing:"0.1em",fontFamily:"'Inter',sans-serif"}}>FOOTBALL ANALYTICS PLATFORM</span>
          </div>
          {/* Headline */}
          <h1 style={{fontSize:"clamp(38px,6vw,74px)",fontWeight:900,color:"#f4f8ff",margin:"0 0 6px",
            fontFamily:"'Sora',sans-serif",letterSpacing:"-0.03em",lineHeight:1.06,animation:"fadeDown 600ms 100ms ease both"}}>
            Where Football Meets<br/>
            <span style={{background:"linear-gradient(135deg,#4f9eff 0%,#00e09e 55%,#f2c94c 100%)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Data Science</span>
          </h1>
          {/* Sub */}
          <p style={{fontSize:"clamp(14px,2vw,18px)",color:C.muted,maxWidth:640,margin:"18px auto 0",
            lineHeight:1.7,fontFamily:"'Inter',sans-serif",animation:"fadeDown 600ms 200ms ease both"}}>
            Whether you want to know <strong style={{color:"#7ab8ff"}}>who will win on Saturday</strong>,
            build the <strong style={{color:C.green}}>best FPL squad</strong>,
            or understand the <strong style={{color:C.gold}}>stats behind the game</strong> — you're in the right place.
          </p>
          {/* CTAs */}
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",
            marginTop:36,animation:"fadeDown 600ms 300ms ease both"}}>
            {[
              {to:"/predictions/premier-league",label:"This Week's Predictions",col:"#3b7fd4",bg:"linear-gradient(135deg,#3b7fd4,#1a5fad)",shadow:`rgba(79,158,255,0.3)`,icon:"📈"},
              {to:"/best-team",label:"Build My FPL Team",col:C.green,bg:`${C.green}18`,border:`${C.green}40`,icon:"⭐"},
              {to:"/learn",label:"Ground Zero",col:C.pink,bg:`${C.pink}14`,border:`${C.pink}38`,icon:"🔬"},
            ].map(({to,label,col,bg,border,shadow,icon},i)=>(
              <Link key={i} to={to} className="hp-btn" style={{
                display:"inline-flex",alignItems:"center",gap:8,padding:"13px 26px",borderRadius:12,
                background:bg,border:`1px solid ${border||"transparent"}`,color:i===0?"#fff":col,
                fontSize:14,fontWeight:700,textDecoration:"none",fontFamily:"'Inter',sans-serif",
                boxShadow:shadow?`0 4px 24px ${shadow}`:"none",
              }}><span>{icon}</span>{label}</Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE TICKER ── */}
      <LiveTicker/>

      {/* ── STAT TILES ── */}
      <section style={{maxWidth:1100,margin:"0 auto",padding:"40px 20px 48px"}}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",animation:"fadeUp 600ms 400ms ease both"}}>
          <StatTile value={4}    suffix=" leagues"  label="Leagues Covered"    color={C.blue}   delay={0}   icon="🌍" trend="↑ 2025"/>
          <StatTile value={380}  suffix="+"          label="Fixtures Predicted"  color={C.green}  delay={100} icon="📊" trend="This season"/>
          <StatTile value={5000} suffix="+"          label="Players Tracked"     color={C.gold}   delay={200} icon="👤"/>
          <StatTile value={3}    suffix=" models"   label="Prediction Models"   color={C.purple} delay={300} icon="🧠" trend="Active"/>
          <StatTile value={64}   suffix="%"          label="Match Accuracy"      color={C.teal}   delay={400} icon="🎯" trend="Season avg"/>
        </div>
      </section>

      {/* ── PREDICTIONS STRIP ── */}
      <PredictionStrip/>

      {/* ── STAT OF THE DAY ── */}
      <StatOfMoment/>

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
              ["Planning FPL transfers?",C.blue,"Get data-driven squad recommendations with FDR, form ratings and projected points for the next 6 gameweeks."],
              ["Want to bet smarter?",C.gold,"Our Poisson + Elo model identifies where bookmakers are mispriced. See model vs implied odds edge for every fixture."],
              ["Is Saturday worth watching?",C.green,"Predicted scorelines, expected goal totals and match style indicators tell you whether it'll be a banger or bore draw."],
              ["Just love football stats?",C.purple,"Deep player profiles, scoring patterns, passing accuracy, shot maps and head-to-head records across 4 top leagues."],
            ].map(([title,col,body],i)=>(
              <div key={i} style={{display:"flex",flexDirection:"column",gap:5}}>
                <div style={{fontSize:13,fontWeight:800,color:C.text,display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:col,flexShrink:0,
                    boxShadow:`0 0 6px ${col}`}}/>
                  {title}
                </div>
                <p style={{margin:0,fontSize:12,color:C.muted,lineHeight:1.65}}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE CARDS ── */}
      <section style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 64px"}}>
        <div style={{marginBottom:28,textAlign:"center"}}>
          <h2 style={{fontSize:24,fontWeight:900,color:"#f4f8ff",margin:"0 0 8px",
            fontFamily:"'Sora',sans-serif",letterSpacing:"-0.02em"}}>Everything you need, in one place</h2>
          <p style={{fontSize:13,color:C.muted,margin:0,fontFamily:"'Inter',sans-serif"}}>8 tools. One platform. Pick where to start.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14}}>
          {FEATURES.map((f,i) => <FeatureCard key={f.to} {...f} delay={i*55}/>)}
        </div>
      </section>

      {/* ── MODEL PERFORMANCE ── */}
      <ModelPerformance/>

      {/* ── RECENT RESULTS ── */}
      <RecentResults/>

      {/* ── LEAGUES STRIP ── */}
      <section style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 80px"}}>
        <div style={{padding:"26px 32px",borderRadius:20,background:"rgba(255,255,255,0.02)",
          border:`1px solid ${C.line}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:20}}>
          <div>
            <p style={{margin:"0 0 4px",fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif",letterSpacing:"0.1em",textTransform:"uppercase"}}>Covering 4 top leagues</p>
            <h3 style={{margin:0,fontSize:18,fontWeight:900,color:C.text,fontFamily:"'Sora',sans-serif"}}>Pick your league</h3>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {[
              {to:"/predictions/premier-league",name:"Premier League",col:"#4f9eff",flag:<svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#012169"/><path d="M0 0l18 13M18 0L0 13" stroke="white" strokeWidth="3"/><path d="M0 0l18 13M18 0L0 13" stroke="#C8102E" strokeWidth="1.8"/><path d="M9 0v13M0 6.5h18" stroke="white" strokeWidth="4"/><path d="M9 0v13M0 6.5h18" stroke="#C8102E" strokeWidth="2.4"/></svg>},
              {to:"/predictions/la-liga",name:"La Liga",col:"#ff6b35",flag:<svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#AA151B"/><rect y="2.8" width="18" height="7.4" fill="#F1BF00"/></svg>},
              {to:"/predictions/serie-a",name:"Serie A",col:"#00e09e",flag:<svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#009246"/><rect x="6" width="6" height="13" fill="white"/><rect x="12" width="6" height="13" fill="#CE2B37"/></svg>},
              {to:"/predictions/ligue-1",name:"Ligue 1",col:"#b388ff",flag:<svg width="22" height="16" viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#002395"/><rect x="6" width="6" height="13" fill="white"/><rect x="12" width="6" height="13" fill="#ED2939"/></svg>},
            ].map(({to,name,col,flag})=>(
              <Link key={to} to={to} className="hp-btn" style={{display:"flex",alignItems:"center",gap:8,
                padding:"10px 18px",borderRadius:12,background:col+"12",border:`1.5px solid ${col}35`,
                color:col,fontSize:13,fontWeight:700,textDecoration:"none",fontFamily:"'Inter',sans-serif"}}>
                <span style={{display:"flex",alignItems:"center",borderRadius:2,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.4)"}}>{flag}</span>
                {name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
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
              Each prediction combines: a <span style={{color:C.green,fontWeight:700}}>Dixon-Coles Poisson model</span> calibrated on real xG data, an <span style={{color:C.blue,fontWeight:700}}>Elo rating system</span> updated after every result, and a <span style={{color:C.gold,fontWeight:700}}>form-weighted scoring model</span>. Confidence scores reflect agreement between all three.
            </p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {["xG Model","Poisson Distribution","Dixon-Coles","Elo Ratings","Form Weighting"].map(t=>(
                <span key={t} style={{fontSize:9,fontWeight:800,color:C.muted,background:"rgba(255,255,255,0.05)",
                  border:`1px solid ${C.line}`,padding:"3px 9px",borderRadius:999,letterSpacing:"0.06em"}}>{t}</span>
              ))}
            </div>
            <Link to="/learn" style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:12,
              fontSize:12,fontWeight:700,color:C.pink,textDecoration:"none",fontFamily:"'Inter',sans-serif"}}>
              Learn how it all works in Ground Zero →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}