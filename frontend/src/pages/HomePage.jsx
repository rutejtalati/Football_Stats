// HomePage.jsx — StatinSite v3 (modernised from v2)
// Design DNA preserved · Backend connected · Routes updated
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
  @keyframes radarSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes shimmer   { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  .hp-card { transition:all 220ms cubic-bezier(0.22,1,0.36,1); }
  .hp-card:hover { transform:translateY(-5px) !important; }
  .hp-btn  { transition:all 160ms ease; cursor:pointer; }
  .hp-btn:hover  { filter:brightness(1.15); transform:translateY(-2px); }
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

/* ─── Dynamic stat tile ─────────────────────────────────── */
function StatTile({ value, suffix="", label, color, delay=0, icon, trend }) {
  const [v, ref] = useCountUp(value, 1600, delay);
  const [hov, setHov] = useState(false);
  return (
    <div ref={ref} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        display:"flex",flexDirection:"column",gap:8,padding:"20px 22px",borderRadius:16,
        background:hov?`linear-gradient(135deg,rgba(12,18,30,0.98),${color}12)`:"rgba(255,255,255,0.025)",
        border:`1px solid ${hov?color+"55":"rgba(255,255,255,0.07)"}`,
        flex:1,minWidth:0,position:"relative",overflow:"hidden",
        transition:"all 220ms cubic-bezier(0.22,1,0.36,1)",
        transform:hov?"translateY(-3px)":"translateY(0)",
        boxShadow:hov?`0 12px 32px ${color}22`:"none",cursor:"default",
      }}>
      <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",
        background:color,opacity:hov?.12:.04,filter:"blur(24px)",transition:"opacity 220ms",pointerEvents:"none"}}/>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:18,lineHeight:1}}>{icon}</span>
        {trend&&<span style={{fontSize:9,fontWeight:800,color:C.green,background:`${C.green}14`,
          border:`1px solid ${C.green}30`,padding:"2px 7px",borderRadius:999,letterSpacing:"0.06em"}}>{trend}</span>}
      </div>
      <div style={{display:"flex",alignItems:"baseline",gap:2}}>
        <span style={{fontSize:36,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color,lineHeight:1,
          letterSpacing:"-0.03em",textShadow:hov?`0 0 28px ${color}88`:`0 0 14px ${color}44`,
          transition:"text-shadow 220ms"}}>{v.toLocaleString()}</span>
        <span style={{fontSize:16,fontWeight:700,color,opacity:.8}}>{suffix}</span>
      </div>
      <span style={{fontSize:9,fontWeight:800,color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase",
        fontFamily:"'Inter',sans-serif"}}>{label}</span>
      <div style={{height:2,borderRadius:1,background:"rgba(255,255,255,0.05)"}}>
        <div style={{height:"100%",width:hov?"100%":"40%",background:color,borderRadius:1,
          transition:"width 600ms cubic-bezier(0.22,1,0.36,1)",opacity:.7}}/>
      </div>
    </div>
  );
}

/* ─── Live ticker (uses real data with fallback) ────────── */
const TICKER_FALLBACK = [
  {label:"Model accuracy",value:"64%",col:C.green},{label:"Leagues covered",value:"5",col:C.blue},
  {label:"Predictions active",value:"Live",col:C.gold},{label:"FPL tools",value:"8",col:C.teal},
];

function LiveTickerBar({ items }) {
  const display = items.length > 0 ? items : TICKER_FALLBACK;
  const doubled = [...display, ...display];
  return (
    <div style={{borderTop:`1px solid ${C.line}`,borderBottom:`1px solid ${C.line}`,
      background:"rgba(255,255,255,0.015)",overflow:"hidden",padding:"10px 0",position:"relative"}}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:80,
        background:"linear-gradient(to right,#060a14,transparent)",zIndex:2,pointerEvents:"none"}}/>
      <div style={{position:"absolute",right:0,top:0,bottom:0,width:80,
        background:"linear-gradient(to left,#060a14,transparent)",zIndex:2,pointerEvents:"none"}}/>
      <div style={{display:"flex",gap:0,animation:"tickerMove 40s linear infinite",width:"max-content"}}>
        {doubled.map((item,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"0 28px",
            borderRight:`1px solid ${C.line}`,flexShrink:0}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:item.col||C.blue,
              boxShadow:`0 0 6px ${item.col||C.blue}`,flexShrink:0}}/>
            <span style={{fontSize:10,color:C.muted,fontFamily:"'Inter',sans-serif",fontWeight:600,whiteSpace:"nowrap"}}>
              {item.label}</span>
            <span style={{fontSize:12,fontWeight:900,color:item.col||C.blue,
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
        width:800,height:500,background:"radial-gradient(ellipse,rgba(79,158,255,0.07) 0%,rgba(0,224,158,0.03) 45%,transparent 70%)"}}/>
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
      </svg>
      {[[C.blue,.06,"-5%","10%","55s"],[C.green,.05,"78%","55%","68s"],[C.purple,.04,"42%","-6%","62s"],[C.gold,.04,"20%","70%","72s"]].map(([col,op,l,t,dur],i)=>(
        <div key={i} style={{position:"absolute",width:500,height:500,borderRadius:"50%",left:l,top:t,
          background:col,opacity:op,filter:"blur(110px)",animation:`orbFloat ${dur} ease-in-out infinite`,animationDelay:`${i*9}s`}}/>
      ))}
      {Array.from({length:18},(_,i)=>({x:Math.random()*100,y:Math.random()*100,s:Math.random()*1.4+.4,
        op:Math.random()*.18+.04,sp:Math.random()*28+18,dl:Math.random()*-28,
      })).map((p,i)=>(
        <div key={i} style={{position:"absolute",left:p.x+"%",top:p.y+"%",width:p.s,height:p.s,
          borderRadius:"50%",background:"white",opacity:p.op,animation:`floatP ${p.sp}s ${p.dl}s linear infinite`}}/>
      ))}
    </div>
  );
}

/* ─── SVG graphic components (all preserved from v2) ───── */
function PitchGraphic({color,hov}){return(
  <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
    <rect x="2" y="2" width="176" height="96" rx="7" stroke={color} strokeWidth="1.5" strokeOpacity={hov?.5:.25}/>
    <line x1="90" y1="2" x2="90" y2="98" stroke={color} strokeWidth="0.8" strokeOpacity={hov?.3:.15}/>
    <circle cx="90" cy="50" r="20" stroke={color} strokeWidth="0.8" strokeOpacity={hov?.3:.15}/>
    <rect x="2" y="32" width="24" height="36" rx="2" stroke={color} strokeWidth="0.8" strokeOpacity={hov?.3:.2}/>
    <rect x="154" y="32" width="24" height="36" rx="2" stroke={color} strokeWidth="0.8" strokeOpacity={hov?.3:.2}/>
    <path d="M 40 62 C 65 28 120 25 148 50" stroke={color} strokeWidth="2" strokeOpacity={hov?.9:.55}
      strokeDasharray="5 3" strokeLinecap="round" style={{strokeDashoffset:hov?0:100,transition:"stroke-dashoffset 600ms ease"}}/>
    <circle cx={hov?148:40} cy={hov?50:62} r="6" fill={color} opacity={hov?.95:.7} style={{transition:"cx 600ms ease, cy 600ms ease"}}/>
    <circle cx={hov?148:40} cy={hov?50:62} r="11" fill={color} opacity={hov?.2:.08} style={{transition:"cx 600ms ease, cy 600ms ease"}}/>
    {[[40,62],[62,36],[62,72],[108,38],[108,68]].map(([x,y],i)=>(
      <circle key={i} cx={x} cy={y} r={i===0?5:4} fill={color} opacity={i===0?0:hov?.55:.3} style={{transition:"opacity 220ms"}}/>
    ))}
  </svg>
)}
function BarGraphic({color,hov}){const bars=[0.42,0.68,0.52,0.88,0.61,0.78,0.95];return(
  <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
    <line x1="14" y1="90" x2="170" y2="90" stroke={color} strokeOpacity="0.15" strokeWidth="0.8"/>
    {bars.map((h,i)=><rect key={i} x={16+i*22} y={90-h*72} width="15" height={h*72} rx="3" fill={color} opacity={hov?0.25+h*.6:0.12+h*.3} style={{transition:`opacity 220ms, height 500ms ${i*50}ms`}}/>)}
    <polyline points={bars.map((h,i)=>`${23.5+i*22},${90-h*72}`).join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity={hov?.95:.65} style={{transition:"opacity 220ms"}}/>
  </svg>
)}
function FormationGraphic({color,hov}){const pos=[[90,88],[38,68],[63,68],[117,68],[142,68],[50,46],[90,40],[130,46],[60,18],[90,12],[120,18]];return(
  <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
    <rect x="2" y="2" width="176" height="96" rx="7" stroke={color} strokeWidth="1" strokeOpacity={hov?.25:.12}/>
    {pos.map(([x,y],i)=>(<g key={i}><circle cx={x} cy={y} r={6} fill={color} opacity={i===0?hov?.5:.3:hov?.9:.6} style={{transition:`opacity 220ms ${i*18}ms`}}/></g>))}
  </svg>
)}
function RadarGraphic({color,hov}){const pts=6,vals=[0.88,0.72,0.94,0.67,0.81,0.90],cx2=90,cy2=50,r=36;
  const poly=vals.map((v,i)=>{const a=(i/pts)*Math.PI*2-Math.PI/2;return[cx2+Math.cos(a)*r*v,cy2+Math.sin(a)*r*v];}).map(([x,y])=>`${x},${y}`).join(" ");
  return(<svg width="180" height="100" viewBox="0 0 180 100" fill="none">
    {[.33,.66,1].map(g=><polygon key={g} points={vals.map((_,i)=>{const a=(i/pts)*Math.PI*2-Math.PI/2;return`${cx2+Math.cos(a)*r*g},${cy2+Math.sin(a)*r*g}`;}).join(" ")} fill="none" stroke={color} strokeWidth=".7" strokeOpacity={hov?.25:.12}/>)}
    <polygon points={poly} fill={color} fillOpacity={hov?.28:.13} stroke={color} strokeWidth="1.8" strokeOpacity={hov?.9:.6} style={{transition:"all 300ms"}}/>
    {vals.map((v,i)=>{const a=(i/pts)*Math.PI*2-Math.PI/2;return<circle key={i} cx={cx2+Math.cos(a)*r*v} cy={cy2+Math.sin(a)*r*v} r="3.5" fill={color} opacity={hov?.95:.65}/>;} )}
  </svg>);
}
function TrendGraphic({color,hov}){const pts=[[10,76],[24,63],[38,68],[52,50],[66,42],[80,54],[94,36],[108,30],[122,20],[136,14],[150,8]];
  const poly=pts.map(([x,y])=>`${x},${y}`).join(" ");const area=`${pts[0][0]},90 ${poly} ${pts[pts.length-1][0]},90`;
  return(<svg width="180" height="100" viewBox="0 0 180 100" fill="none">
    <polygon points={area} fill={color} fillOpacity={hov?.12:.05}/>
    <polyline points={poly} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity={hov?.95:.65}/>
    <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="6" fill={color} opacity={hov?.95:.8}/>
  </svg>);
}
function HeatmapGraphic({color,hov}){const cells=Array.from({length:35},(_,i)=>.15+Math.sin(i*.7)*.35+Math.cos(i*.4)*.25);return(
  <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
    <rect x="12" y="8" width="156" height="84" rx="4" fill="none" stroke={color} strokeWidth=".8" strokeOpacity={hov?.35:.18}/>
    {Array.from({length:7}).map((_,row)=>Array.from({length:5}).map((_,col)=>{const v=cells[row*5+col];
      return<rect key={row*5+col} x={12+col*31.2} y={8+row*12} width="31.2" height="12" fill={color} opacity={hov?v*.75:v*.4} rx="1"/>;}))}
  </svg>
)}
function GameGraphic({color,hov}){return(
  <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
    <rect x="20" y="20" width="140" height="60" rx="12" fill={color} fillOpacity={hov?.1:.05} stroke={color} strokeWidth="1.5" strokeOpacity={hov?.5:.25}/>
    <circle cx="90" cy="50" r="18" fill={color} fillOpacity={hov?.15:.07} stroke={color} strokeWidth="1.2" strokeOpacity={hov?.5:.25}/>
    <path d="M84 50l-6-4v8l6-4z" fill={color} opacity={hov?.9:.6}/><path d="M96 50l6-4v8l-6-4z" fill={color} opacity={hov?.9:.6}/>
  </svg>
)}
function LearnGraphic({color,hov}){const nodes=[[90,20],[50,50],[90,50],[130,50],[70,80],[110,80]];return(
  <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
    {[[0,1],[0,2],[0,3],[1,4],[2,4],[2,5],[3,5]].map(([a,b],i)=>(
      <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke={color} strokeWidth="1.2" strokeOpacity={hov?.5:.22}/>))}
    {nodes.map(([x,y],i)=>(<g key={i}><circle cx={x} cy={y} r="8" fill={color} opacity={hov?.3:.12}/><circle cx={x} cy={y} r="4.5" fill={color} opacity={hov?.9:.55}/></g>))}
  </svg>
)}
function LiveGraphic({color,hov}){return(
  <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
    <circle cx="90" cy="50" r="30" fill={color} fillOpacity={hov?.12:.05} stroke={color} strokeWidth="1.5" strokeOpacity={hov?.4:.2}/>
    <circle cx="90" cy="50" r="18" fill={color} fillOpacity={hov?.2:.08} stroke={color} strokeWidth="1" strokeOpacity={hov?.5:.25}/>
    <circle cx="90" cy="50" r="8" fill={color} opacity={hov?.95:.6}>{hov&&<animate attributeName="r" values="7;10;7" dur="1.2s" repeatCount="indefinite"/>}</circle>
    {[[55,30],[125,30],[55,70],[125,70]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="4" fill={color} opacity={hov?.6:.3}/>)}
    <line x1="65" y1="85" x2="115" y2="85" stroke={color} strokeWidth="3" strokeLinecap="round" opacity={hov?.7:.35}/>
  </svg>
)}
function NewsGraphic({color,hov}){return(
  <svg width="180" height="100" viewBox="0 0 180 100" fill="none">
    <rect x="20" y="12" width="140" height="76" rx="8" fill={color} fillOpacity={hov?.08:.03} stroke={color} strokeWidth="1.2" strokeOpacity={hov?.4:.2}/>
    {[28,42,56].map((y,i)=><line key={i} x1="36" y1={y} x2={130-i*20} y2={y} stroke={color} strokeWidth="2" strokeLinecap="round" opacity={hov?.6:.3}/>)}
    <rect x="36" y="64" width="40" height="14" rx="3" fill={color} opacity={hov?.25:.1}/>
    <rect x="82" y="64" width="50" height="14" rx="3" fill={color} opacity={hov?.15:.06}/>
  </svg>
)}

/* ─── Feature card ──────────────────────────────────────── */
function FeatureCard({to,color,title,subtitle,description,graphic:Gfx,badge,delay=0}){
  const [hov,setHov]=useState(false);
  return(
    <Link to={to} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} className="hp-card"
      style={{display:"flex",flexDirection:"column",
        background:hov?`linear-gradient(135deg,rgba(12,18,30,0.98) 0%,${color}0d 100%)`:C.panel,
        border:`1px solid ${hov?color+"50":C.line}`,borderRadius:20,overflow:"hidden",textDecoration:"none",
        boxShadow:hov?`0 20px 52px rgba(0,0,0,0.55), 0 0 0 1px ${color}22`:"none",
        animationDelay:delay+"ms",animation:"cardIn 500ms ease both",position:"relative"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:1,
        background:`linear-gradient(90deg,transparent,${color}${hov?"88":"33"},transparent)`}}/>
      <div style={{height:130,display:"flex",alignItems:"center",justifyContent:"center",
        background:`linear-gradient(135deg,${color}0d 0%,rgba(0,0,0,0) 60%)`,
        borderBottom:`1px solid ${hov?color+"30":C.line}`,position:"relative"}}>
        <div style={{position:"relative",zIndex:1,transition:"transform 300ms",transform:hov?"scale(1.04)":"scale(1)"}}>
          <Gfx color={color} hov={hov}/>
        </div>
        {badge&&<div style={{position:"absolute",top:10,right:10,padding:"3px 9px",borderRadius:999,
          background:color+"22",border:`1px solid ${color}44`,fontSize:9,fontWeight:800,color,
          fontFamily:"'Inter',sans-serif",letterSpacing:"0.07em"}}>{badge}</div>}
      </div>
      <div style={{padding:"18px 20px 20px",flex:1,display:"flex",flexDirection:"column",gap:6}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:3,height:18,borderRadius:2,background:color,
            boxShadow:hov?`0 0 12px ${color}88`:`0 0 6px ${color}44`,flexShrink:0}}/>
          <span style={{fontSize:16,fontWeight:800,color:C.text,fontFamily:"'Sora',sans-serif"}}>{title}</span>
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

/* ─── Prediction strip (real data with fallback) ────────── */
const PRED_FALLBACK = [
  {home:"Arsenal",away:"Chelsea",homeProb:62,awayProb:18,draw:20,col:C.blue,conf:"High",confPct:72,score:"2-1",fixtureId:null},
  {home:"Man City",away:"Liverpool",homeProb:55,awayProb:26,draw:19,col:C.green,conf:"Medium",confPct:58,score:"2-0",fixtureId:null},
  {home:"Barcelona",away:"Real Madrid",homeProb:44,awayProb:35,draw:21,col:C.gold,conf:"Low",confPct:44,score:"1-1",fixtureId:null},
  {home:"PSG",away:"Monaco",homeProb:58,awayProb:22,draw:20,col:C.purple,conf:"High",confPct:68,score:"2-0",fixtureId:null},
];

function PredictionStrip({ predictions }) {
  const preds = (predictions?.predictions || []).length > 0 ? predictions.predictions : PRED_FALLBACK;
  return (
    <section style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 52px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:C.green,
            boxShadow:`0 0 8px ${C.green}`,animation:"livePulse 2s ease infinite"}}/>
          <span style={{fontSize:12,fontWeight:800,color:C.text,fontFamily:"'Sora',sans-serif",
            letterSpacing:"0.06em"}}>TOP PREDICTIONS</span>
        </div>
        <Link to="/predictions/premier-league" style={{fontSize:11,fontWeight:700,color:C.blue,
          textDecoration:"none",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",gap:5}}>
          All fixtures <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M7 3l3 3-3 3" stroke={C.blue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
        {preds.slice(0,4).map((p,i)=>{
          const confCol=p.conf==="high"||p.conf==="High"?C.green:p.conf==="medium"||p.conf==="Medium"?C.gold:C.orange;
          const hw=p.homeProb||33, aw=p.awayProb||33, dw=p.draw||34;
          return(
            <Link key={i} to={p.fixtureId?`/match/${p.fixtureId}`:"/predictions/premier-league"}
              style={{textDecoration:"none",display:"block"}} className="hp-card">
              <div style={{background:"rgba(255,255,255,0.025)",border:`1px solid ${C.line}`,borderRadius:14,
                padding:"14px 16px",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,
                  background:`linear-gradient(90deg,transparent,${p.col||C.blue}66,transparent)`}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:"'Sora',sans-serif"}}>{p.home}</span>
                  <span style={{fontSize:10,fontWeight:700,color:C.muted,background:"rgba(255,255,255,0.05)",
                    padding:"2px 7px",borderRadius:999,border:`1px solid ${C.line}`}}>vs</span>
                  <span style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:"'Sora',sans-serif"}}>{p.away}</span>
                </div>
                <div style={{display:"flex",height:6,borderRadius:3,overflow:"hidden",marginBottom:8,gap:1}}>
                  <div style={{flex:hw,background:C.blue,opacity:.8}}/>
                  <div style={{flex:dw,background:C.gold,opacity:.7}}/>
                  <div style={{flex:aw,background:C.red,opacity:.8}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",gap:10}}>
                    {[[hw+"%",C.blue,"H"],[dw+"%",C.gold,"D"],[aw+"%",C.red,"A"]].map(([v,c,l])=>(
                      <div key={l} style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                        <span style={{fontSize:12,fontWeight:900,color:c,fontFamily:"'JetBrains Mono',monospace"}}>{v}</span>
                        <span style={{fontSize:8,color:C.muted}}>{l}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                    <span style={{fontSize:14,fontWeight:900,color:p.col||C.blue,fontFamily:"'JetBrains Mono',monospace"}}>{p.score||"—"}</span>
                    <span style={{fontSize:8,fontWeight:800,color:confCol,background:`${confCol}14`,
                      border:`1px solid ${confCol}30`,padding:"1px 6px",borderRadius:999}}>{p.confPct||50}% conf</span>
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

/* ─── Stat of the moment (real data with fallback) ──────── */
const STAT_FALLBACK = {stat:"0.82",label:"xG per 90",player:"Erling Haaland",context:"Highest in Europe this season.",col:C.blue,icon:"⚽"};

function StatOfMoment({ insight }) {
  const p = insight?.primary || {};
  const s = (p.stat && p.stat !== "—") ? p : STAT_FALLBACK;
  return (
    <section style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 52px"}}>
      <div style={{background:`linear-gradient(135deg,rgba(12,18,30,0.98),${s.col||C.blue}0d)`,
        border:`1px solid ${s.col||C.blue}30`,borderRadius:20,padding:"24px 32px",
        display:"flex",gap:28,alignItems:"center",flexWrap:"wrap",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:0,right:0,width:300,height:200,
          background:`radial-gradient(circle at 100% 0%,${s.col||C.blue}14,transparent 70%)`,pointerEvents:"none"}}/>
        <div style={{display:"flex",flexDirection:"column",gap:2}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:s.col||C.blue,boxShadow:`0 0 8px ${s.col||C.blue}`,
              animation:"livePulse 2.5s ease infinite"}}/>
            <span style={{fontSize:9,fontWeight:900,color:s.col||C.blue,letterSpacing:"0.15em"}}>STAT OF THE DAY</span>
          </div>
          <div style={{display:"flex",alignItems:"baseline",gap:10}}>
            <span style={{fontSize:56,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",
              color:s.col||C.blue,lineHeight:1,textShadow:`0 0 28px ${s.col||C.blue}66`}}>{s.stat}</span>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:C.text,fontFamily:"'Sora',sans-serif"}}>{s.label}</div>
              <div style={{fontSize:11,color:s.col||C.blue,fontWeight:700}}>{s.player}</div>
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

/* ─── Model performance (real data with fallback) ────────── */
const PERF_FALLBACK = [{gw:"GW28",acc:71},{gw:"GW29",acc:64},{gw:"GW30",acc:78},{gw:"GW31",acc:60},
  {gw:"GW32",acc:82},{gw:"GW33",acc:68},{gw:"GW34",acc:74},{gw:"GW35",acc:70}];

function ModelPerformance({ metrics }) {
  const mm = metrics || {};
  const [visible,setVisible]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting){setVisible(true);obs.disconnect();}},{threshold:0.3});
    if(ref.current)obs.observe(ref.current);return()=>obs.disconnect();
  },[]);
  const trend = (mm.trend || []).length > 0 ? mm.trend : PERF_FALLBACK;
  const maxAcc = Math.max(...trend.map(d=>d.acc||0), 1);
  const byMarket = (mm.byMarket || []).length > 0 ? mm.byMarket : [
    {label:"Match Result",value:mm.overallAccuracy||64,col:C.green},
    {label:"BTTS",value:71,col:C.blue},{label:"Over 2.5",value:68,col:C.gold},
    {label:"Correct Score",value:38,col:C.purple},
  ];
  const seasonAvg = mm.overallAccuracy || 64;

  return(
    <section style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 64px"}} ref={ref}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:16,alignItems:"stretch"}}>
        <div style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${C.line}`,borderRadius:20,padding:"24px 28px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <div>
              <div style={{fontSize:9,fontWeight:900,color:C.muted,letterSpacing:"0.14em",marginBottom:4}}>MODEL ACCURACY</div>
              <div style={{fontSize:18,fontWeight:900,color:C.text,fontFamily:"'Sora',sans-serif"}}>Recent Trend</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:32,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",
                color:C.green,lineHeight:1,textShadow:`0 0 18px ${C.green}55`}}>{seasonAvg}%</div>
              <div style={{fontSize:9,color:C.muted,letterSpacing:"0.1em"}}>SEASON AVG</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"flex-end",gap:8,height:120}}>
            {trend.map((d,i)=>(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,height:"100%",justifyContent:"flex-end"}}>
                <span style={{fontSize:9,fontWeight:800,color:d.acc>=70?C.green:d.acc>=60?C.gold:C.orange,
                  fontFamily:"'JetBrains Mono',monospace"}}>{d.acc}%</span>
                <div style={{width:"100%",borderRadius:"4px 4px 0 0",
                  background:d.acc>=70?C.green:d.acc>=60?C.gold:C.orange,
                  height:visible?`${(d.acc/maxAcc)*90}%`:"0%",opacity:d.acc>=70?.85:.6,
                  transition:`height 700ms ${i*80}ms cubic-bezier(0.22,1,0.36,1)`}}/>
                <span style={{fontSize:8,color:C.muted}}>{d.gw}</span>
              </div>
            ))}
          </div>
          <div style={{fontSize:10,color:C.soft,marginTop:12,lineHeight:1.6}}>
            Based on <b style={{color:C.muted}}>{mm.fixturesCount||"15,000+"}</b> fixtures across EPL, La Liga, Serie A, Bundesliga, Ligue 1.
          </div>
        </div>
        <div style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${C.line}`,borderRadius:20,padding:"24px 24px",
          display:"flex",flexDirection:"column",gap:14,justifyContent:"center"}}>
          <div style={{fontSize:9,fontWeight:900,color:C.muted,letterSpacing:"0.14em",marginBottom:2}}>BY MARKET</div>
          {byMarket.map((m,i)=>(
            <div key={m.label||i}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:700,color:C.text}}>{m.label}</span>
                <span style={{fontSize:16,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:m.col,
                  textShadow:`0 0 10px ${m.col}44`}}>{m.value}%</span>
              </div>
              <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.06)"}}>
                <div style={{height:"100%",borderRadius:2,background:m.col,
                  width:visible?`${m.value}%`:"0%",boxShadow:`0 0 8px ${m.col}66`,
                  transition:`width 800ms ${200+i*120}ms cubic-bezier(0.22,1,0.36,1)`}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Recent results (real data with fallback) ─────────── */
const RESULTS_FALLBACK = [
  {home:"Arsenal",away:"Man City",pred:"Arsenal",actual:"Arsenal",score:"2-1",conf:"High",correct:true},
  {home:"Liverpool",away:"Chelsea",pred:"Draw",actual:"Liverpool",score:"1-0",conf:"Medium",correct:false},
  {home:"Barcelona",away:"Atletico",pred:"Barcelona",actual:"Barcelona",score:"3-1",conf:"High",correct:true},
  {home:"PSG",away:"Marseille",pred:"PSG",actual:"PSG",score:"2-0",conf:"High",correct:true},
  {home:"Juventus",away:"Inter",pred:"Draw",actual:"Draw",score:"1-1",conf:"Medium",correct:true},
];

function RecentResults({ recentResults }) {
  const rr = recentResults || {};
  const results = (rr.results || []).length > 0 ? rr.results : RESULTS_FALLBACK;
  const correctCount = rr.correct ?? results.filter(r=>r.correct).length;
  const total = rr.total ?? results.length;
  return(
    <section style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 64px"}}>
      <div style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${C.line}`,borderRadius:20,padding:"24px 28px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <div>
            <div style={{fontSize:9,fontWeight:900,color:C.muted,letterSpacing:"0.14em",marginBottom:4}}>ACCOUNTABILITY</div>
            <div style={{fontSize:18,fontWeight:900,color:C.text,fontFamily:"'Sora',sans-serif"}}>Recent Predictions</div>
          </div>
          <div style={{padding:"6px 14px",borderRadius:999,background:`${C.green}12`,
            border:`1px solid ${C.green}30`,fontSize:12,fontWeight:800,color:C.green,
            fontFamily:"'JetBrains Mono',monospace"}}>{correctCount}/{total} correct</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {results.map((r,i)=>(
            <Link key={i} to={r.fixtureId?`/match/${r.fixtureId}`:"/predictions/premier-league"}
              style={{textDecoration:"none",display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:10,
                background:`${r.correct?C.green:C.red}08`,border:`1px solid ${r.correct?C.green:C.red}18`,transition:"all 180ms"}}>
              <div style={{width:22,height:22,borderRadius:"50%",flexShrink:0,
                background:r.correct?`${C.green}20`:`${C.red}20`,
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,
                border:`1px solid ${r.correct?C.green:C.red}40`,color:r.correct?C.green:C.red}}>
                {r.correct?"✓":"✗"}
              </div>
              <div style={{flex:1,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:12,fontWeight:700,color:C.text,minWidth:120}}>{r.home} vs {r.away}</span>
                <span style={{fontSize:10,color:C.muted}}>Pred: <b style={{color:C.text}}>{r.pred}</b></span>
                <span style={{fontSize:10,color:C.muted}}>Result: <b style={{color:C.text}}>{r.actual||r.score}</b></span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                <span style={{fontSize:13,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",
                  color:r.correct?C.green:C.red}}>{r.score}</span>
                <span style={{fontSize:8,fontWeight:800,color:C.muted,background:"rgba(255,255,255,0.05)",
                  padding:"2px 7px",borderRadius:999,border:`1px solid ${C.line}`}}>{r.conf}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Feature cards (UPDATED for current product) ────────── */
const FEATURES = [
  { to:"/predictions/premier-league", color:C.blue,   title:"Match Predictions",    subtitle:"This week's fixtures →",  description:"Win probabilities, expected scorelines, confidence scores and betting edge analysis across 5 leagues.", graphic:PitchGraphic,      badge:"LIVE" },
  { to:"/live",                       color:C.red,    title:"Live Matches",          subtitle:"Watch live →",             description:"Real-time match intelligence — live scores, momentum shifts, win probability updates as games unfold.", graphic:LiveGraphic,       badge:"LIVE" },
  { to:"/best-team",                  color:C.green,  title:"Best XI Builder",       subtitle:"Build your squad →",      description:"Optimal fantasy XI using composite scoring: fixtures, form, ICT index and season PPG.", graphic:FormationGraphic,  badge:"FPL"  },
  { to:"/squad-builder",              color:C.gold,   title:"Squad Builder",         subtitle:"Plan transfers →",         description:"Full FPL squads with budget constraints. Best value picks, differentials and captain options.", graphic:BarGraphic,        badge:"FPL"  },
  { to:"/player",                     color:C.purple, title:"Player Insight",        subtitle:"Analyse any player →",     description:"Deep statistical profiles — goals, assists, form trends and fixture difficulty across the season.", graphic:RadarGraphic,      badge:"STATS"},
  { to:"/news",                       color:C.pink,   title:"News Intelligence",     subtitle:"Latest intel →",           description:"Curated football news with analytical context — transfers, tactical shifts, injury updates and match-day intel.", graphic:NewsGraphic,      badge:"NEW"  },
  { to:"/gameweek-insights",          color:C.orange, title:"GW Insights",           subtitle:"This gameweek →",          description:"FDR, captain picks, differential watchlist and injury news all in one place.", graphic:TrendGraphic,      badge:"FPL"  },
  { to:"/fpl-table",                  color:C.teal,   title:"FPL Table",             subtitle:"Full stats table →",       description:"Sortable stats for all players — filter by position, team, price. Find hidden gems.", graphic:HeatmapGraphic,    badge:"STATS"},
  { to:"/games",                      color:"#ff6b35",title:"Sports Arcade",         subtitle:"Play games →",             description:"Penalty shootouts, analytics quizzes, 2048 and more. Interactive football experiences.", graphic:GameGraphic,       badge:"PLAY" },
  { to:"/learn",                      color:"#a78bfa",title:"Ground Zero",           subtitle:"How it works →",           description:"The research lab behind every prediction — methodology deep-dives, model transparency and analytics glossary.", graphic:LearnGraphic,     badge:"LAB"  },
];

/* ─── Main page ─────────────────────────────────────────── */
export default function HomePage() {
  const isMobile = useIsMobile();
  const [dashData, setDashData] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`${API}/api/home/dashboard`);
        if (!res.ok) throw new Error();
        const raw = await res.json();
        if (mounted) setDashData(mapDashboard(raw));
      } catch {
        if (mounted) setDashData(mapDashboard(null));
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const d = dashData || mapDashboard(null);
  const mm = d.modelMetrics || {};
  const mc = d.modelConfidence || {};
  const preds = d.predictions?.predictions || [];
  const tickerItems = (d.trendingPlayers?.items || []).map(t => ({
    label: t.label, value: t.value, col: t.col || C.blue,
  }));

  return (
    <div style={{minHeight:"100vh",background:"transparent",overflow:"hidden"}}>
      <style>{HOME_CSS}</style>

      {/* ── HERO ── */}
      <section style={{position:"relative",padding:"80px 20px 60px",maxWidth:1200,margin:"0 auto",textAlign:"center",overflow:"hidden"}}>
        <PitchGridBg/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"5px 14px",borderRadius:999,
            background:"rgba(79,158,255,0.1)",border:"1px solid rgba(79,158,255,0.25)",marginBottom:24,
            animation:"fadeDown 600ms ease both"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:C.blue,animation:"livePulse 2s ease infinite"}}/>
            <span style={{fontSize:11,fontWeight:700,color:C.blue,letterSpacing:"0.1em",fontFamily:"'Inter',sans-serif"}}>FOOTBALL INTELLIGENCE PLATFORM</span>
          </div>
          <h1 style={{fontSize:"clamp(38px,6vw,74px)",fontWeight:900,color:"#f4f8ff",margin:"0 0 6px",
            fontFamily:"'Sora',sans-serif",letterSpacing:"-0.03em",lineHeight:1.06,animation:"fadeDown 600ms 100ms ease both"}}>
            Where Football Meets<br/>
            <span style={{background:"linear-gradient(135deg,#4f9eff 0%,#00e09e 55%,#f2c94c 100%)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Data Science</span>
          </h1>
          <p style={{fontSize:"clamp(14px,2vw,18px)",color:C.muted,maxWidth:640,margin:"18px auto 0",
            lineHeight:1.7,fontFamily:"'Inter',sans-serif",animation:"fadeDown 600ms 200ms ease both"}}>
            Whether you want to know <strong style={{color:"#7ab8ff"}}>who will win on Saturday</strong>,
            build the <strong style={{color:C.green}}>best FPL squad</strong>,
            or understand the <strong style={{color:C.gold}}>stats behind the game</strong> — you're in the right place.
          </p>
          <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",
            marginTop:36,animation:"fadeDown 600ms 300ms ease both"}}>
            {[
              {to:"/predictions/premier-league",label:"This Week's Predictions",col:"#3b7fd4",bg:"linear-gradient(135deg,#3b7fd4,#1a5fad)",shadow:"rgba(79,158,255,0.3)",icon:"📈"},
              {to:"/best-team",label:"Build My FPL Team",col:C.green,bg:`${C.green}18`,border:`${C.green}40`,icon:"⭐"},
              {to:"/live",label:"Live Matches",col:C.red,bg:`${C.red}14`,border:`${C.red}38`,icon:"🔴"},
              {to:"/learn",label:"Ground Zero",col:"#a78bfa",bg:"rgba(167,139,250,0.1)",border:"rgba(167,139,250,0.3)",icon:"🔬"},
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
      <LiveTickerBar items={tickerItems}/>

      {/* ── STAT TILES (real data where available) ── */}
      <section style={{maxWidth:1100,margin:"0 auto",padding:"40px 20px 48px"}}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",animation:"fadeUp 600ms 400ms ease both"}}>
          <StatTile value={5}    suffix=" leagues"  label="Leagues Covered"    color={C.blue}   delay={0}   icon="🌍" trend="↑ 2025"/>
          <StatTile value={preds.length > 0 ? preds.length * 38 : 380} suffix="+"  label="Fixtures Predicted" color={C.green}  delay={100} icon="📊" trend="This season"/>
          <StatTile value={5000} suffix="+"          label="Players Tracked"     color={C.gold}   delay={200} icon="👤"/>
          <StatTile value={3}    suffix=" models"   label="Prediction Models"   color={C.purple} delay={300} icon="🧠" trend="Active"/>
          <StatTile value={mm.overallAccuracy || 64} suffix="%" label="Match Accuracy" color={C.teal} delay={400} icon="🎯" trend="Season avg"/>
        </div>
      </section>

      {/* ── PREDICTIONS STRIP ── */}
      <PredictionStrip predictions={d.predictions}/>

      {/* ── STAT OF THE DAY ── */}
      <StatOfMoment insight={d.tacticalInsight}/>

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
              ["Want smarter predictions?",C.gold,"Our model identifies the highest-confidence fixtures. See predicted scorelines, win probabilities and xG for every match."],
              ["Watching the game live?",C.red,"Real-time match intelligence — momentum shifts, live win probability, and shot maps updated as the match unfolds."],
              ["Just love football stats?",C.purple,"Deep player profiles, scoring patterns, passing accuracy and head-to-head records across 5 top leagues."],
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

      {/* ── FEATURE CARDS (10 tools, current product) ── */}
      <section style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 64px"}}>
        <div style={{marginBottom:28,textAlign:"center"}}>
          <h2 style={{fontSize:24,fontWeight:900,color:"#f4f8ff",margin:"0 0 8px",
            fontFamily:"'Sora',sans-serif",letterSpacing:"-0.02em"}}>Everything you need, in one place</h2>
          <p style={{fontSize:13,color:C.muted,margin:0,fontFamily:"'Inter',sans-serif"}}>10 tools. One platform. Pick where to start.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14}}>
          {FEATURES.map((f,i)=><FeatureCard key={f.to} {...f} delay={i*55}/>)}
        </div>
      </section>

      {/* ── MODEL PERFORMANCE ── */}
      <ModelPerformance metrics={mm}/>

      {/* ── RECENT RESULTS ── */}
      <RecentResults recentResults={d.recentResults}/>

      {/* ── LEAGUES STRIP (5 leagues) ── */}
      <section style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 80px"}}>
        <div style={{padding:"26px 32px",borderRadius:20,background:"rgba(255,255,255,0.02)",
          border:`1px solid ${C.line}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:20}}>
          <div>
            <p style={{margin:"0 0 4px",fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif",letterSpacing:"0.1em",textTransform:"uppercase"}}>Covering 5 top leagues</p>
            <h3 style={{margin:0,fontSize:18,fontWeight:900,color:C.text,fontFamily:"'Sora',sans-serif"}}>Pick your league</h3>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            {[
              {to:"/predictions/premier-league",name:"Premier League",col:"#4f9eff",emoji:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
              {to:"/predictions/la-liga",name:"La Liga",col:"#ff6b35",emoji:"🇪🇸"},
              {to:"/predictions/serie-a",name:"Serie A",col:"#00e09e",emoji:"🇮🇹"},
              {to:"/predictions/bundesliga",name:"Bundesliga",col:"#ff4d6d",emoji:"🇩🇪"},
              {to:"/predictions/ligue-1",name:"Ligue 1",col:"#b388ff",emoji:"🇫🇷"},
            ].map(({to,name,col,emoji})=>(
              <Link key={to} to={to} className="hp-btn" style={{display:"flex",alignItems:"center",gap:8,
                padding:"10px 18px",borderRadius:12,background:col+"12",border:`1.5px solid ${col}35`,
                color:col,fontSize:13,fontWeight:700,textDecoration:"none",fontFamily:"'Inter',sans-serif"}}>
                <span>{emoji}</span>{name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── GROUND ZERO POINTER (simplified) ── */}
      <section style={{maxWidth:900,margin:"0 auto",padding:"0 20px 80px"}}>
        <Link to="/learn" style={{textDecoration:"none",display:"block"}}>
          <div className="hp-card" style={{padding:"24px 32px",borderRadius:20,background:"rgba(255,255,255,0.02)",
            border:`1px solid ${C.line}`,display:"flex",gap:24,alignItems:"center",flexWrap:"wrap",cursor:"pointer"}}>
            <div style={{flex:"0 0 auto"}}>
              <svg width="120" height="68" viewBox="0 0 120 68" fill="none" style={{display:"block"}}>
                <rect x="1" y="1" width="118" height="66" rx="5" fill="#0a2a10" stroke="rgba(255,255,255,0.1)" strokeWidth=".8"/>
                <line x1="60" y1="1" x2="60" y2="67" stroke="rgba(255,255,255,0.1)" strokeWidth=".6"/>
                <circle cx="60" cy="34" r="12" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth=".6"/>
                <path d="M30 34 C48 20 74 20 95 34" stroke="#4f9eff" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round" opacity=".7"/>
                <circle cx="95" cy="34" r="4" fill="#4f9eff" opacity=".9">
                  <animate attributeName="r" values="4;6;4" dur="1.2s" repeatCount="indefinite"/>
                </circle>
              </svg>
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{fontSize:9,fontWeight:900,color:"#a78bfa",letterSpacing:"0.12em",background:"rgba(167,139,250,0.1)",
                  border:"1px solid rgba(167,139,250,0.25)",padding:"3px 10px",borderRadius:999}}>GROUND ZERO</span>
              </div>
              <h3 style={{margin:"0 0 6px",fontSize:15,fontWeight:800,color:C.text,fontFamily:"'Sora',sans-serif"}}>
                How do our predictions work?
              </h3>
              <p style={{margin:0,fontSize:12,color:C.muted,lineHeight:1.65,fontFamily:"'Inter',sans-serif",maxWidth:520}}>
                Explore the research lab behind every prediction — interactive explainers for xG, Poisson, Elo, Dixon-Coles, and all the models that power the platform.
              </p>
              <span style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:8,
                fontSize:12,fontWeight:700,color:"#a78bfa",fontFamily:"'Inter',sans-serif"}}>
                Explore Ground Zero →
              </span>
            </div>
          </div>
        </Link>
      </section>
    </div>
  );
}