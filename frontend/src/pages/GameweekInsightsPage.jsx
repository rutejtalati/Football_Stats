// pages/GameweekInsightsPage.jsx
// ═══════════════════════════════════════════════════════════
//  GW INTELLIGENCE HUB
//  Left panel:  Live news ticker + squad alerts (scrolling feed)
//               → completely different from BestTeamPage's static stat cards
//  Centre:      Dense insight grid — 8 hero stat cards (count-up), radar
//               chart, fixture heatmap table, form wave comparison
//  Right panel: Hexagonal radar profiles per position group
//               → completely different from BestTeamPage's leaderboard rows
//  All widgets: entrance stagger, count-up, pulse, hover glow,
//               progress rings, heat bars, animated sparklines
// ═══════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useMemo } from "react";
import {
  getFplBootstrap, getFplPredictorTable,
  getTopScorers, getTopAssists,
  getLeagueInjuries, getStandings,
} from "../api/api";

// ─────────── helpers ──────────────────────────────────────
function sn(n) {
  if (!n) return "?";
  const p = n.trim().split(/\s+/).filter(Boolean);
  return p.length === 1 ? p[0] : `${p[0][0]}. ${p[p.length-1]}`;
}
function getNextGW(bootstrap) {
  const ev = bootstrap?.events || [];
  const nxt = ev.find(e => !e.finished && e.is_next);
  if (nxt?.id) return { id: nxt.id, deadline: nxt.deadline_time };
  const cur = ev.find(e => !e.finished && e.is_current);
  if (cur?.id) return { id: cur.id, deadline: cur.deadline_time };
  return { id: 30, deadline: null };
}
function normalise(row) {
  if (!row) return null;
  const pts = Number(row.pts_gw_1 ?? 0);
  const merit = Number(row.merit ?? 0);
  const form  = Number(row.form  ?? 0);
  // ── Composite score: same formula as BestTeamPage/SquadBuilderPage ──
  const ppg  = Number(row.points_so_far ?? 0) / Math.max(Number(row.played ?? 1), 1);
  const ict  = Number(row.ict_index ?? 0);
  const prob = Number(row.prob_appear ?? row.appearance_prob ?? 0.92);
  const raw  = (pts*0.40) + (form*0.35) + (ppg*0.15) + ((ict/30)*0.10);
  const formGate    = form >= 1.5 ? 1.0 : Math.max(form/1.5, 0.25);
  const probPenalty = Math.pow(Math.max(prob, 0), 1.4);
  const composite   = raw * formGate * probPenalty;
  return {
    ...row,
    id: row.id ?? row.player_id,
    player_id: row.player_id ?? row.id,
    name: row.name ?? row.player ?? "?",
    projected_points: composite,
    cost: Number(row.cost ?? 0),
    form, pts_gw_1: pts,
    pts_gw_2: Number(row.pts_gw_2 ?? 0),
    pts_gw_3: Number(row.pts_gw_3 ?? 0),
    pts_gw_4: Number(row.pts_gw_4 ?? 0),
    pts_gw_5: Number(row.pts_gw_5 ?? 0),
    selected_by_pct: Number(row.selected_by_pct ?? 0),
    appearance_prob: Number(row.prob_appear ?? row.appearance_prob ?? 0.92),
    ict_index: Number(row.ict_index ?? 0),
    value_rest_season: Number(row.value_rest_season ?? 0),
    fixture_difficulty: Number(row.fixture_difficulty ?? 3),
    transfers_in_gw: Number(row.transfers_in_gw ?? 0),
    transfers_out_gw: Number(row.transfers_out_gw ?? row.transfers_out_event ?? 0),
  };
}

// ─────────── CSS keyframes (injected once) ───────────────
const GW_CSS = `
@keyframes gwIn   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
@keyframes gwPop  { 0%{transform:scale(.82);opacity:0} 60%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
@keyframes gwPulse{ 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.55;transform:scale(1.35)} }
@keyframes gwGlow { 0%,100%{box-shadow:0 0 8px rgba(40,217,122,.25)} 50%{box-shadow:0 0 22px rgba(40,217,122,.65)} }
@keyframes gwSpin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
@keyframes gwFeed { 0%{transform:translateY(0)} 100%{transform:translateY(-50%)} }
@keyframes gwSkel { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
@keyframes gwFlash{ 0%,100%{opacity:1} 40%{opacity:.3} }
@keyframes gwCountUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
@keyframes gwBarFill  { from{width:0} to{width:var(--w)} }
@keyframes gwRingFill {
  from { stroke-dasharray: 0 1000 }
  to   { stroke-dasharray: var(--dash) 1000 }
}
@keyframes gwRadarIn {
  from { opacity:0; transform: scale(.7) rotate(-15deg) }
  to   { opacity:1; transform: scale(1) rotate(0) }
}
@keyframes gwTickerScroll {
  0%   { transform: translateX(0) }
  100% { transform: translateX(-50%) }
}
@keyframes gwSlideR { from{opacity:0;transform:translateX(18px)} to{opacity:1;transform:none} }
@keyframes gwSlideL { from{opacity:0;transform:translateX(-18px)} to{opacity:1;transform:none} }
@keyframes gwWave {
  0%,100% { transform: scaleY(1) }
  50%     { transform: scaleY(1.6) }
}
.gw-hover-lift { transition: transform .2s, box-shadow .2s, border-color .2s; }
.gw-hover-lift:hover { transform: translateY(-3px) scale(1.012); }
`;

// ─────────── count-up hook ────────────────────────────────
function useCount(target, dur=1100, dec=0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!target && target!==0) return;
    const t0 = performance.now();
    let raf;
    function tick(now) {
      const pct = Math.min((now-t0)/dur,1);
      const ease = 1-Math.pow(1-pct,3);
      setV(+(ease*target).toFixed(dec));
      if (pct<1) raf=requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[target,dur,dec]);
  return v;
}

// ─────────── visibility hook ─────────────────────────────
function useVis(ref) {
  const [v,setV] = useState(false);
  useEffect(()=>{
    const io = new IntersectionObserver(([e])=>{ if(e.isIntersecting) setV(true); },{threshold:.1});
    if(ref.current) io.observe(ref.current);
    return ()=>io.disconnect();
  },[]);
  return v;
}

// ─────────── skeleton ─────────────────────────────────────
const SKEL = ({h=18,w="100%",r=8})=>(
  <div style={{height:h,width:w,borderRadius:r,flexShrink:0,
    background:"linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.09) 50%,rgba(255,255,255,.04) 75%)",
    backgroundSize:"200% 100%",animation:"gwSkel 1.4s linear infinite"}}/>
);

// ─────────── animated horizontal bar ─────────────────────
function ABar({pct,color="#28d97a",h=5,delay=0}) {
  const [w,setW] = useState(0);
  useEffect(()=>{ const t=setTimeout(()=>setW(Math.min(pct,100)),delay+60); return()=>clearTimeout(t); },[pct,delay]);
  return (
    <div style={{flex:1,height:h,borderRadius:3,background:"rgba(255,255,255,.05)",overflow:"hidden"}}>
      <div style={{height:"100%",width:w+"%",background:color,borderRadius:3,
        transition:"width .85s cubic-bezier(.4,0,.2,1)",
        boxShadow:`0 0 6px ${color}55`}}/>
    </div>
  );
}

// ─────────── animated radial ring ────────────────────────
function Ring({pct,size=52,stroke=4.5,color="#28d97a",label,sub,delay=0}) {
  const [dash,setDash]=useState(0);
  const r=(size-stroke*2)/2, C=2*Math.PI*r;
  useEffect(()=>{ const t=setTimeout(()=>setDash(Math.min(pct/100,1)*C),delay+80); return()=>clearTimeout(t); },[pct,C,delay]);
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
      <div style={{position:"relative",width:size,height:size}}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:"rotate(-90deg)"}}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={stroke}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${C}`} strokeLinecap="round"
            style={{transition:"stroke-dasharray 1.1s cubic-bezier(.4,0,.2,1)",filter:`drop-shadow(0 0 5px ${color}88)`}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:size*.19,fontWeight:900,color,fontFamily:"DM Mono,monospace"}}>
          {Math.round(pct)}
        </div>
      </div>
      {label&&<div style={{fontSize:8,fontWeight:900,color:"#3a6080",letterSpacing:".1em",textAlign:"center"}}>{label}</div>}
      {sub&&<div style={{fontSize:7.5,color:"#2a4060",textAlign:"center"}}>{sub}</div>}
    </div>
  );
}

// ─────────── hexagonal radar SVG ─────────────────────────
// Completely different from BestTeamPage's leaderboard lists
function Radar({data,size=150,color="#3b9eff",animated=true}) {
  const [drawn,setDrawn]=useState(!animated);
  useEffect(()=>{ if(animated){ const t=setTimeout(()=>setDrawn(true),200); return()=>clearTimeout(t); } },[animated]);
  const n=data.length||6, cx=size/2, cy=size/2, R=(size/2)-20;
  const pt=(i,r)=>({ x:cx+r*Math.sin((2*Math.PI*i)/n), y:cy-r*Math.cos((2*Math.PI*i)/n) });
  const gridR=[.25,.5,.75,1], colors=["#ff6b35","#28d97a","#f2c94c","#3b9eff","#b388ff","#ff4d6d"];
  const valPts = data.map((d,i)=>{
    const p=pt(i,(drawn?d.value/100:0.05)*R);
    return `${p.x},${p.y}`;
  }).join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{display:"block",overflow:"visible",animation:animated?"gwRadarIn .7s cubic-bezier(.4,0,.2,1) both":"none"}}>
      {gridR.map(f=>(
        <polygon key={f}
          points={Array.from({length:n},(_,i)=>{const p=pt(i,R*f);return`${p.x},${p.y}`;}).join(" ")}
          fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="1"/>
      ))}
      {Array.from({length:n},(_,i)=>{
        const a=pt(i,R);
        return <line key={i} x1={cx} y1={cy} x2={a.x} y2={a.y} stroke="rgba(255,255,255,.05)" strokeWidth="1"/>;
      })}
      <polygon points={valPts} fill={`${color}18`} stroke={color} strokeWidth="1.5"
        style={{transition:"points 1.1s cubic-bezier(.4,0,.2,1)",filter:`drop-shadow(0 0 8px ${color}55)`}}/>
      {data.map((d,i)=>{
        const p=pt(i,(drawn?d.value/100:0.05)*R);
        return <circle key={i} cx={p.x} cy={p.y} r="3" fill={colors[i%colors.length]}
          stroke="rgba(0,0,0,.6)" strokeWidth=".8"
          style={{transition:`cx 1.1s, cy 1.1s`,filter:`drop-shadow(0 0 3px ${colors[i%colors.length]})`}}/>;
      })}
      {data.map((d,i)=>{
        const a=pt(i,R), dx=a.x-cx, dy=a.y-cy, nm=Math.sqrt(dx*dx+dy*dy)||1;
        const lx=a.x+(dx/nm)*13, ly=a.y+(dy/nm)*13;
        return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
          fontSize="8" fontWeight="800" fill="rgba(255,255,255,.45)" fontFamily="Outfit,sans-serif">{d.label}</text>;
      })}
    </svg>
  );
}

// ─────────── mini sparkline ───────────────────────────────
function Spark({vals,w=72,h=22,color="#3b9eff"}) {
  if(!vals?.length) return <SKEL h={h} w={w}/>;
  const max=Math.max(...vals,1), min=Math.min(...vals,0);
  const range=max-min||1;
  const pad=3;
  const pts=vals.map((v,i)=>({
    x:pad+(i/(vals.length-1))*(w-pad*2),
    y:h-pad-((v-min)/range)*(h-pad*2),
  }));
  const d=pts.map((p,i)=>`${i===0?"M":"L"}${p.x} ${p.y}`).join(" ");
  const uid=`sk${Math.random().toString(36).slice(2,7)}`;
  return (
    <svg width={w} height={h} style={{display:"block",overflow:"visible",flexShrink:0}}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={`${color}55`}/>
          <stop offset="100%" stopColor={color}/>
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke={`url(#${uid})`} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round"/>
      {pts.map((p,i)=>{
        const isLast=i===pts.length-1;
        return isLast
          ? <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color}
              stroke="rgba(0,0,0,.5)" strokeWidth=".8"
              style={{filter:`drop-shadow(0 0 3px ${color})`}}/>
          : null;
      })}
    </svg>
  );
}

// ─────────── news / alert item ────────────────────────────
// Left panel: scrolling feed format — very different from BestTeamPage's static number cards
function FeedItem({icon,tag,tagCol,headline,sub,meta,idx}) {
  const [hov,setHov]=useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        display:"flex",gap:10,padding:"11px 12px",borderRadius:11,
        background:hov?"rgba(255,255,255,.055)":"rgba(255,255,255,.018)",
        border:`1px solid ${hov?tagCol+"44":"rgba(255,255,255,.05)"}`,
        borderLeft:`3px solid ${tagCol}`,
        transition:"all .18s ease",
        transform:hov?"translateX(4px)":"none",
        animation:`gwSlideL ${.08+idx*.04}s ease both`,
        cursor:"default",
      }}>
      <div style={{fontSize:18,lineHeight:1.2,flexShrink:0}}>{icon}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
          <span style={{fontSize:7.5,fontWeight:900,padding:"1px 5px",borderRadius:999,
            background:`${tagCol}20`,color:tagCol,letterSpacing:".1em"}}>{tag}</span>
          {meta&&<span style={{fontSize:7.5,color:"#2a4060"}}>{meta}</span>}
        </div>
        <div style={{fontSize:11.5,fontWeight:700,color:"#dce8f8",lineHeight:1.4}}>{headline}</div>
        {sub&&<div style={{fontSize:9.5,color:"#3a6080",marginTop:2}}>{sub}</div>}
      </div>
    </div>
  );
}

// ─────────── hero stat card ───────────────────────────────
function HeroCard({label,rawVal,dec=1,prefix="",suffix="",sub,color,icon,pulse,rank,idx,extra}) {
  const ref=useRef(null);
  const vis=useVis(ref);
  const num=useCount(vis?parseFloat(rawVal)||0:0,1200,dec);
  const display = isNaN(parseFloat(rawVal)) ? rawVal
    : prefix+(dec===0?Math.round(num):num.toFixed(dec))+suffix;
  const [hov,setHov]=useState(false);
  return (
    <div ref={ref} className="gw-hover-lift"
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        position:"relative",overflow:"hidden",borderRadius:14,
        padding:"15px 14px 13px",
        background:hov?`rgba(${color==="green"?"40,217,122":color==="blue"?"59,158,255":color==="gold"?"242,201,76":color==="purple"?"179,136,255":color==="orange"?"255,107,53":"255,77,109"},.07)`:"rgba(255,255,255,.025)",
        border:`1px solid ${hov?`${getHex(color)}55`:"rgba(255,255,255,.07)"}`,
        boxShadow:hov?`0 8px 28px rgba(0,0,0,.4),0 0 0 1px ${getHex(color)}33`:"none",
        animation:`gwPop ${.1+idx*.07}s ease both`,
        cursor:"default",
      }}>
      {/* Top-right dot */}
      <div style={{position:"absolute",top:10,right:10,width:7,height:7,borderRadius:"50%",
        background:getHex(color),boxShadow:`0 0 9px ${getHex(color)}`,
        animation:pulse?"gwPulse 2s ease-in-out infinite":"none"}}/>
      {/* Left accent */}
      <div style={{position:"absolute",left:0,top:14,bottom:14,width:3,
        background:getHex(color),borderRadius:"0 2px 2px 0",boxShadow:`0 0 7px ${getHex(color)}88`}}/>
      <div style={{fontSize:7.5,fontWeight:900,color:"#2a4a6a",letterSpacing:".14em",paddingLeft:8,marginBottom:3}}>{label}</div>
      <div style={{fontSize:21,fontWeight:900,color:getHex(color),fontFamily:"DM Mono,monospace",lineHeight:1.05,paddingLeft:8}}>
        {icon&&<span style={{marginRight:5,fontSize:15}}>{icon}</span>}{display}
      </div>
      {sub&&<div style={{fontSize:9,color:"#3a6080",paddingLeft:8,marginTop:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sub}</div>}
      {extra&&<div style={{paddingLeft:8,marginTop:5}}>{extra}</div>}
      {rank&&<div style={{position:"absolute",bottom:8,right:10,fontSize:8,color:"#1a3050",fontFamily:"DM Mono,monospace"}}>#{rank}</div>}
      <div style={{position:"absolute",inset:0,borderRadius:14,
        background:`radial-gradient(ellipse at 85% 15%,${getHex(color)}07,transparent 55%)`,
        pointerEvents:"none"}}/>
    </div>
  );
}
function getHex(c) {
  return {green:"#28d97a",blue:"#3b9eff",gold:"#f2c94c",purple:"#b388ff",orange:"#ff6b35",red:"#ff4d6d"}[c]||"#67b1ff";
}

// ─────────── scorer row ───────────────────────────────────
function ScoRow({rank,name,team,val,valLbl,sub,color="#28d97a",maxVal,idx}) {
  const [hov,setHov]=useState(false);
  const medals=["#f2c94c","#9ab8d4","#c97d50"];
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"flex",alignItems:"center",gap:8,padding:"6px 9px",borderRadius:9,
        background:hov?"rgba(255,255,255,.06)":"rgba(255,255,255,.025)",
        border:`1px solid ${hov?"rgba(255,255,255,.1)":"rgba(255,255,255,.04)"}`,
        transform:hov?"translateX(4px)":"none",
        transition:"all .16s ease",animation:`gwIn ${.06+idx*.05}s ease both`}}>
      <div style={{width:19,height:19,borderRadius:"50%",flexShrink:0,
        background:medals[rank-1]||"rgba(255,255,255,.07)",
        display:"flex",alignItems:"center",justifyContent:"center",fontSize:8.5,fontWeight:900,color:"#000"}}>
        {rank}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:11,fontWeight:800,color:"#e8f0ff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{name}</div>
        <div style={{fontSize:8.5,color:"#2a4060"}}>{team}{sub?` · ${sub}`:""}</div>
      </div>
      {maxVal&&<ABar pct={(val/maxVal)*100} color={color} h={3}/>}
      <div style={{textAlign:"center",flexShrink:0,minWidth:28}}>
        <div style={{fontSize:14,fontWeight:900,color,fontFamily:"DM Mono,monospace",lineHeight:1}}>{val}</div>
        <div style={{fontSize:7,color:"#2a4060",letterSpacing:".07em"}}>{valLbl}</div>
      </div>
    </div>
  );
}

// ─────────── panel wrapper ────────────────────────────────
function Panel({children,style={}}) {
  return (
    <div style={{background:"rgba(255,255,255,.025)",border:"1px solid rgba(255,255,255,.07)",
      borderRadius:16,padding:"15px 14px",display:"flex",flexDirection:"column",gap:10,...style}}>
      {children}
    </div>
  );
}

// ─────────── section label ────────────────────────────────
function SecLabel({text,sub,accent="#3b9eff",right}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:7}}>
        <div style={{width:3,height:15,background:accent,borderRadius:2,boxShadow:`0 0 7px ${accent}`}}/>
        <div>
          <div style={{fontSize:10.5,fontWeight:900,color:"#bcd4f0",letterSpacing:".07em"}}>{text}</div>
          {sub&&<div style={{fontSize:8.5,color:"#2a4060"}}>{sub}</div>}
        </div>
      </div>
      {right&&<div style={{fontSize:9,color:"#2a4060"}}>{right}</div>}
    </div>
  );
}

// ─────────── injury pill ──────────────────────────────────
function InjPill({player,team,reason,status}) {
  const col=status==="Injured"?"#ff4d6d":status==="Doubtful"?"#ffaa44":"#4a7a9a";
  return (
    <div style={{display:"flex",alignItems:"center",gap:7,padding:"5px 9px",borderRadius:8,
      background:"rgba(255,255,255,.02)",border:`1px solid ${col}22`,
      transition:"background .15s"}}
    onMouseEnter={e=>e.currentTarget.style.background=`${col}0d`}
    onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.02)"}>
      <div style={{width:6,height:6,borderRadius:"50%",background:col,flexShrink:0,boxShadow:`0 0 5px ${col}`}}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:10.5,fontWeight:800,color:"#c8d8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{player}</div>
        <div style={{fontSize:8.5,color:"#2a4060"}}>{team}</div>
      </div>
      <div style={{fontSize:8.5,fontWeight:800,color:col,flexShrink:0}}>{(reason||status||"").slice(0,12)}</div>
    </div>
  );
}

// ─────────── tab button ───────────────────────────────────
function Tab({label,active,onClick}) {
  return (
    <button onClick={onClick} style={{
      padding:"8px 15px",borderRadius:"8px 8px 0 0",
      fontSize:10.5,fontWeight:800,letterSpacing:".05em",
      background:active?"rgba(59,158,255,.12)":"transparent",
      border:`1px solid ${active?"rgba(59,158,255,.3)":"transparent"}`,
      borderBottom:"none",color:active?"#67b1ff":"#2a4a6a",
      cursor:"pointer",transition:"all .15s",
    }}>{label}</button>
  );
}

// ─────────── standings row ────────────────────────────────
function StandRow({rank,team,pts,played,won,drawn,lost,gd,form5,idx}) {
  const [hov,setHov]=useState(false);
  const zone=rank<=4?"#3b9eff":rank===5?"#28d97a":rank===6?"#f2c94c":rank>=18?"#ff4d6d":"transparent";
  const zL=rank<=4?"UCL":rank===5?"UEL":rank===6?"UECL":rank>=18?"REL":"";
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"flex",alignItems:"center",gap:7,padding:"6px 9px",borderRadius:8,
        background:hov?"rgba(255,255,255,.05)":"rgba(255,255,255,.02)",
        borderLeft:`3px solid ${zone}`,
        transition:"background .15s",animation:`gwIn ${.04+idx*.03}s ease both`}}>
      <span style={{fontSize:9.5,fontWeight:900,color:"#3a6080",width:18,flexShrink:0}}>{rank}</span>
      <span style={{flex:1,fontSize:11,fontWeight:700,color:"#dce8f8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{team}</span>
      {zL&&<span style={{fontSize:7,fontWeight:900,padding:"1px 4px",borderRadius:4,background:`${zone}20`,color:zone,flexShrink:0}}>{zL}</span>}
      <div style={{display:"flex",gap:10,flexShrink:0}}>
        {[{v:played,l:"P"},{v:won,l:"W"},{v:drawn,l:"D"},{v:lost,l:"L"}].map(({v,l})=>(
          <span key={l} style={{fontSize:9.5,color:"#3a6080",width:16,textAlign:"center"}}>{v??0}</span>
        ))}
        <span style={{fontSize:10,fontWeight:700,color:gd>0?"#28d97a":gd<0?"#ff4d6d":"#4a7a9a",width:24,textAlign:"right",fontFamily:"DM Mono,monospace"}}>
          {gd>0?"+":""}{gd??0}
        </span>
        <span style={{fontSize:12,fontWeight:900,color:"#9ff1b4",width:24,textAlign:"right",fontFamily:"DM Mono,monospace"}}>{pts??0}</span>
      </div>
    </div>
  );
}

// ─────────── fixture difficulty heatmap row ───────────────
// Right panel: heatmap table — completely different from BestTeamPage's ownership arc rings
function DiffHeatRow({name,team,vals,idx}) {
  const COLS={1:"#1a7a44",2:"#25a856",3:"#4a5a6a",4:"#8a2a2a",5:"#cc1818"};
  const LBLS={1:"VE",2:"E",3:"M",4:"H",5:"VH"};
  const [hov,setHov]=useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",borderRadius:8,
        background:hov?"rgba(255,255,255,.04)":"transparent",
        transition:"background .15s",animation:`gwIn ${.04+idx*.04}s ease both`}}>
      <div style={{minWidth:0,width:70,flexShrink:0}}>
        <div style={{fontSize:9.5,fontWeight:800,color:"#bcd4f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sn(name)}</div>
        <div style={{fontSize:7.5,color:"#2a4060"}}>{team}</div>
      </div>
      <div style={{display:"flex",gap:2,flex:1}}>
        {vals.map((d,i)=>(
          <div key={i} style={{
            flex:1,height:20,borderRadius:4,
            background:COLS[d]||"rgba(255,255,255,.06)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:7.5,fontWeight:900,color:"rgba(255,255,255,.7)",
            border:`1px solid rgba(255,255,255,.06)`,
            boxShadow:hov?`0 0 4px ${COLS[d]||"#333"}55`:"none",
            transition:"box-shadow .15s",
          }}>{LBLS[d]||"?"}</div>
        ))}
      </div>
    </div>
  );
}

// ─────────── position radar group ────────────────────────
// Right panel: shows radar per position — different from BestTeamPage's leaderboard rows
function PosRadarCard({pos,player,vals,color}) {
  const [hov,setHov]=useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{padding:"12px",borderRadius:13,
        background:hov?`${color}0d`:"rgba(255,255,255,.025)",
        border:`1px solid ${hov?color+"44":"rgba(255,255,255,.06)"}`,
        transition:"all .2s",boxShadow:hov?`0 6px 22px rgba(0,0,0,.35)`:""
      }}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
        <div>
          <div style={{fontSize:8,fontWeight:900,color,letterSpacing:".12em"}}>{pos}</div>
          <div style={{fontSize:12,fontWeight:800,color:"#e8f0ff"}}>{sn(player?.name||"—")}</div>
          <div style={{fontSize:9,color:"#2a4060"}}>{player?.team} · £{player?.cost}m</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
          <div style={{fontSize:18,fontWeight:900,color,fontFamily:"DM Mono,monospace",lineHeight:1}}>{Number(player?.pts_gw_1||0).toFixed(1)}</div>
          <div style={{fontSize:7.5,color:"#2a4060"}}>pts</div>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <Radar data={vals} size={90} color={color} animated={true}/>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
          {vals.map((d,i)=>(
            <div key={d.label} style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:7.5,fontWeight:800,color:"#3a6080",width:26,flexShrink:0}}>{d.label}</span>
              <ABar pct={d.value} color={color} h={3} delay={i*60}/>
              <span style={{fontSize:8.5,fontWeight:900,color:"#bcd4f0",fontFamily:"DM Mono,monospace",width:22,textAlign:"right"}}>{Math.round(d.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════
export default function GameweekInsightsPage() {
  const [gw,setGw]             = useState(30);
  const [players,setPlayers]   = useState([]);
  const [scorers,setScorers]   = useState([]);
  const [assists,setAssists]   = useState([]);
  const [injuries,setInjuries] = useState([]);
  const [standings,setStandings] = useState([]);
  const [loading,setLoading]   = useState(true);
  const [tab,setTab]           = useState("overview");
  const [scorerTab,setScorerTab] = useState("goals");

  // Contextual FPL news — would come from a real feed in production;
  // these represent typical GW30-era headlines (mid-March)
  const NEWS = useMemo(()=>[
    {icon:"⚡",tag:"CAPTAIN ALERT",tagCol:"#f2c94c",
     headline:"Salah faces Palace away — captain risk despite form",
     sub:"Crystal Palace have kept 2 clean sheets in last 4 home games",meta:"GW30"},
    {icon:"🏥",tag:"INJURY",tagCol:"#ff4d6d",
     headline:"Trent Alexander-Arnold confirmed out until April",
     sub:"Liverpool name Jones at right-back — affects defensive clean sheet odds",meta:"Official"},
    {icon:"🔀",tag:"BLANK GW",tagCol:"#ff6b35",
     headline:"Arsenal, Chelsea & Spurs face blank in GW31",
     sub:"Plan transfers before Tuesday deadline if affected",meta:"Confirmed"},
    {icon:"💰",tag:"TRANSFER IN",tagCol:"#28d97a",
     headline:"João Pedro most transferred-in — 278k managers bought",
     sub:"Chelsea forward faces Newcastle in GW30 (Diff 3)",meta:"FPL Data"},
    {icon:"📊",tag:"STAT WATCH",tagCol:"#b388ff",
     headline:"Isak has taken 14 shots on target in last 5 GWs",
     sub:"xG: 4.2 — underlies output and flags as elite forward pick",meta:"Analysis"},
    {icon:"🎯",tag:"DIFFERENTIAL",tagCol:"#3b9eff",
     headline:"Damsgaard 6.9% owned — faces Wolves (Diff 2) at home",
     sub:"3 goals + 2 assists in last 6 — elite ICT underpriced at £5.6m",meta:"FPL Pick"},
    {icon:"⚠️",tag:"ROTATION RISK",tagCol:"#ffaa44",
     headline:"Bernardo Silva rotation concern — City in Europa League",
     sub:"Guardiola may rest midfield ahead of knockout tie",meta:"Risk"},
    {icon:"🔥",tag:"FORM",tagCol:"#ff6b35",
     headline:"Saka scored or assisted in 7 of last 8 Premier League games",
     sub:"Arsenal host Sheffield Utd — Diff 1 fixture for GW30",meta:"Form"},
  ],[]);

  useEffect(()=>{
    let cancelled=false;
    async function load() {
      try {
        setLoading(true);
        const boot = await getFplBootstrap();
        const {id:nextGw} = getNextGW(boot);
        if(cancelled) return;
        setGw(nextGw);
        const [tbl,sc,as,inj,std] = await Promise.allSettled([
          getFplPredictorTable({start_gw:nextGw}),
          getTopScorers("epl"),
          getTopAssists("epl"),
          getLeagueInjuries("epl"),
          getStandings("epl"),
        ]);
        if(cancelled) return;
        if(tbl.status==="fulfilled") setPlayers((tbl.value?.rows||[]).map(normalise).filter(Boolean));
        if(sc.status==="fulfilled")  setScorers(sc.value?.scorers||sc.value||[]);
        if(as.status==="fulfilled")  setAssists(as.value?.assists||as.value||[]);
        if(inj.status==="fulfilled") setInjuries(inj.value?.injuries||inj.value||[]);
        if(std.status==="fulfilled") setStandings(std.value?.standings||std.value||[]);
        setLoading(false);
      } catch(e){ console.error(e); if(!cancelled) setLoading(false); }
    }
    load();
    return ()=>{ cancelled=true; };
  },[]);

  // ── derived ──
  const sorted      = useMemo(()=>[...players].sort((a,b)=>Number(b.pts_gw_1||0)-Number(a.pts_gw_1||0)),[players]);
  const byForm      = useMemo(()=>[...players].sort((a,b)=>Number(b.form||0)-Number(a.form||0)),[players]);
  const byValue     = useMemo(()=>[...players].sort((a,b)=>Number(b.value_rest_season||0)-Number(a.value_rest_season||0)),[players]);
  const byOwn       = useMemo(()=>[...players].sort((a,b)=>Number(b.selected_by_pct||0)-Number(a.selected_by_pct||0)),[players]);
  const byTransIn   = useMemo(()=>[...players].sort((a,b)=>(b.transfers_in_gw||0)-(a.transfers_in_gw||0)),[players]);
  const diffs       = useMemo(()=>sorted.filter(p=>Number(p.selected_by_pct||0)<12),[sorted]);
  const atRisk      = useMemo(()=>[...players].sort((a,b)=>(a.appearance_prob||0)-(b.appearance_prob||0)),[players]);

  const topPts   = sorted[0], topForm=byForm[0], topVal=byValue[0], topOwned=byOwn[0];
  const topTransIn=byTransIn[0], bestDiff=diffs[0];
  const avgPts   = players.length ? (players.reduce((s,p)=>s+Number(p.pts_gw_1||0),0)/players.length) : 0;

  // ── per-position top player radar data ──
  function makeRadar(p){
    if(!p) return [];
    return [
      {label:"xG",  value:Math.min((Number(p.xg_per_90||0)/.9)*100,100)},
      {label:"FORM", value:Math.min((Number(p.form||0)/10)*100,100)},
      {label:"ICT",  value:Math.min((Number(p.ict_index||0)/350)*100,100)},
      {label:"APP%", value:Math.round((Number(p.appearance_prob||0))*100)},
      {label:"VAL",  value:Math.min((Number(p.value_rest_season||0)/15)*100,100)},
      {label:"OWN%", value:Math.min(Number(p.selected_by_pct||0),100)},
    ];
  }
  const posPlayers = useMemo(()=>{
    const best=pos=>[...players].filter(p=>p.position===pos).sort((a,b)=>(b.pts_gw_1||0)-(a.pts_gw_1||0))[0];
    return {GK:best("GK"),DEF:best("DEF"),MID:best("MID"),FWD:best("FWD")};
  },[players]);

  // ── fixture heatmap for top 10 players ──
  const heatPlayers = sorted.slice(0,10);

  // ── GW form sparkline for top 5 ──
  function sparkVals(p){
    return [p.pts_gw_5,p.pts_gw_4,p.pts_gw_3,p.pts_gw_2,p.pts_gw_1].map(Number);
  }

  if(loading) return (
    <div style={{minHeight:"100vh",background:"#000",padding:"24px 20px"}}>
      <style>{GW_CSS}</style>
      <div style={{maxWidth:1440,margin:"0 auto",display:"flex",flexDirection:"column",gap:16}}>
        <SKEL h={44} w={340} r={10}/>
        <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:10}}>
          {[...Array(8)].map((_,i)=><SKEL key={i} h={88} r={14}/>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"290px 1fr 300px",gap:16}}>
          <SKEL h={600} r={16}/>
          <SKEL h={600} r={16}/>
          <SKEL h={600} r={16}/>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#000",padding:"20px 20px 52px",fontFamily:"Outfit,sans-serif"}}>
      <style>{GW_CSS}</style>

      <div style={{maxWidth:1440,margin:"0 auto",display:"flex",flexDirection:"column",gap:18}}>

        {/* ══ HEADER ══ */}
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div style={{animation:"gwSlideL .25s ease both"}}>
            <div style={{fontSize:8,fontWeight:900,letterSpacing:".22em",color:"#1a3a5a",marginBottom:5}}>
              STATPITCH · EPL INTELLIGENCE HUB
            </div>
            <h1 style={{margin:0,fontSize:27,fontWeight:900,color:"#f0f8ff",letterSpacing:"-.02em"}}>
              Gameweek Insights
              <span style={{marginLeft:12,fontSize:17,fontWeight:700,
                background:"linear-gradient(135deg,#3b9eff,#28d97a)",
                WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                — GW{gw}
              </span>
            </h1>
            <div style={{fontSize:10.5,color:"#2a4a6a",marginTop:2}}>
              Live FPL projections · EPL scorers & standings · Injury tracker · Differential picks
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 14px",
            background:"rgba(40,217,122,.07)",border:"1px solid rgba(40,217,122,.22)",
            borderRadius:999,animation:"gwGlow 2.8s ease-in-out infinite"}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"#28d97a",
              boxShadow:"0 0 9px #28d97a",animation:"gwPulse 1.6s ease-in-out infinite"}}/>
            <span style={{fontSize:9.5,fontWeight:800,color:"#28d97a",letterSpacing:".12em"}}>LIVE DATA</span>
          </div>
        </div>

        {/* ══ 8 HERO STAT CARDS (count-up, stagger) ══ */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:10}}>
          <HeroCard idx={0} label="PLAYERS TRACKED" rawVal={players.length} dec={0}
            color="blue" pulse extra={
              <div style={{display:"flex",gap:3}}>
                {["GK","DEF","MID","FWD"].map(pos=>{
                  const c=players.filter(p=>p.position===pos).length;
                  const col={GK:"#f2c94c",DEF:"#3b9eff",MID:"#28d97a",FWD:"#ff6b35"}[pos];
                  return <span key={pos} style={{fontSize:7.5,fontWeight:900,padding:"1px 4px",borderRadius:4,background:`${col}22`,color:col}}>{pos}:{c}</span>;
                })}
              </div>
            }/>
          <HeroCard idx={1} label="TOP PROJECTED" rawVal={Number(topPts?.pts_gw_1||0)} dec={1} suffix=" pts"
            sub={`${topPts?.name||"—"} · ${topPts?.team||""}`} color="green" pulse icon="⚡"/>
          <HeroCard idx={2} label="TOP FORM" rawVal={Number(topForm?.form||0)} dec={1}
            sub={`${topForm?.name||"—"} · ${topForm?.team||""}`} color="gold" icon="🔥"/>
          <HeroCard idx={3} label="BEST VALUE" rawVal={Number(topVal?.value_rest_season||0)} dec={2}
            sub={`${topVal?.name||"—"} · £${topVal?.cost||0}m`} color="purple" icon="💎"/>
          <HeroCard idx={4} label="AVG PROJECTED" rawVal={avgPts} dec={1} suffix=" pts"
            sub="across all players" color="blue"/>
          <HeroCard idx={5} label="MOST OWNED" rawVal={Number(topOwned?.selected_by_pct||0)} dec={0} suffix="%"
            sub={`${topOwned?.name||"—"} · ${topOwned?.team||""}`} color="orange"/>
          <HeroCard idx={6} label="TRANSFERS IN↑" rawVal={Math.round((topTransIn?.transfers_in_gw||0)/1000)} dec={0} suffix="k"
            sub={`${topTransIn?.name||"—"}`} color="green" pulse icon="🔄"/>
          <HeroCard idx={7} label="BEST DIFF" rawVal={Number(bestDiff?.pts_gw_1||0)} dec={1} suffix=" pts"
            sub={`${bestDiff?.name||"—"} · ${Number(bestDiff?.selected_by_pct||0).toFixed(0)}% owned`}
            color="blue" icon="🎯"/>
        </div>

        {/* ══ TAB BAR ══ */}
        <div style={{display:"flex",gap:3,borderBottom:"1px solid rgba(255,255,255,.07)"}}>
          {[
            {k:"overview",l:"Overview"},
            {k:"players", l:"Top Players"},
            {k:"league",  l:"EPL League"},
            {k:"injuries",l:"Injuries & Risk"},
          ].map(({k,l})=><Tab key={k} label={l} active={tab===k} onClick={()=>setTab(k)}/>)}
        </div>

        {/* ═══════════ OVERVIEW ═══════════ */}
        {tab==="overview" && (
          <div style={{display:"grid",gridTemplateColumns:"290px 1fr 302px",gap:16,alignItems:"start"}}>

            {/* ── LEFT: SCROLLING INTELLIGENCE FEED ──
                Completely different from BestTeamPage's stat cards.
                BestTeamPage left = static number cards (GW, Formation, Pts, Cost, C/VC)
                This left = live scrolling news/alert feed with tags and badges */}
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Panel>
                <SecLabel text="GW INTELLIGENCE FEED" sub="FPL alerts · injuries · picks" accent="#3b9eff"/>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {NEWS.map((n,i)=><FeedItem key={i} {...n} idx={i}/>)}
                </div>
              </Panel>

              {/* Transfer momentum */}
              <Panel>
                <SecLabel text="TRANSFER MOMENTUM" sub="Net moves this GW" accent="#28d97a"/>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {byTransIn.slice(0,5).map((p,i)=>{
                    const net=(p.transfers_in_gw||0)-(p.transfers_out_gw||0);
                    const col=net>0?"#28d97a":"#ff4d6d";
                    const maxNet=Math.abs((byTransIn[0]?.transfers_in_gw||1)-(byTransIn[0]?.transfers_out_gw||0))||1;
                    return (
                      <div key={p.player_id||i} style={{display:"flex",alignItems:"center",gap:8,
                        padding:"6px 8px",borderRadius:8,background:"rgba(255,255,255,.02)",
                        border:"1px solid rgba(255,255,255,.04)",transition:"background .15s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.055)"}
                        onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.02)"}>
                        <span style={{fontSize:11,color:col,fontWeight:900,flexShrink:0}}>{net>0?"▲":"▼"}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:10.5,fontWeight:800,color:"#c8d8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sn(p.name)}</div>
                          <div style={{fontSize:8.5,color:"#2a4060"}}>{p.team} · {p.position} · £{p.cost}m</div>
                        </div>
                        <ABar pct={Math.abs(net)/maxNet*100} color={col} h={3}/>
                        <span style={{fontSize:9,fontWeight:900,color:col,fontFamily:"DM Mono,monospace",flexShrink:0,minWidth:30,textAlign:"right"}}>
                          {net>0?"+":""}{(net/1000).toFixed(0)}k
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>

            {/* ── CENTRE: INSIGHT GRID ── */}
            <div style={{display:"flex",flexDirection:"column",gap:14}}>

              {/* 6 insight hero tiles */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                {[
                  {icon:"👑",lbl:"BEST CAPTAIN",p:sorted[0],color:"#f2c94c",accent:"gold",val:sorted[0]?.pts_gw_1},
                  {icon:"🎯",lbl:"BEST DIFFERENTIAL",p:diffs[0],color:"#28d97a",accent:"green",val:diffs[0]?.pts_gw_1,
                   meta:`${Number(diffs[0]?.selected_by_pct||0).toFixed(1)}% owned`},
                  {icon:"💎",lbl:"BEST VALUE PICK",p:topVal,color:"#b388ff",accent:"purple",val:topVal?.value_rest_season?.toFixed(2),valSuf:"",
                   meta:`£${topVal?.cost||0}m`},
                  {icon:"⚡",lbl:`HIGHEST PROJ GW${gw}`,p:sorted[0],color:"#3b9eff",accent:"blue",val:sorted[0]?.pts_gw_1},
                  {icon:"🔄",lbl:"MOST TRANSFERRED IN",p:topTransIn,color:"#28d97a",accent:"green",
                   val:Math.round((topTransIn?.transfers_in_gw||0)/1000),valSuf:"k buys",meta:topTransIn?.team},
                  {icon:"🛡️",lbl:"SAFEST STARTER",p:atRisk[atRisk.length-1],color:"#67b1ff",accent:"blue",
                   val:`${Math.round((atRisk[atRisk.length-1]?.appearance_prob||0)*100)}%`,meta:"Appear Prob"},
                ].map(({icon,lbl,p,color,val,valSuf,meta},i)=>(
                  <div key={lbl} style={{
                    padding:"13px 12px",borderRadius:13,
                    background:`${color}07`,border:`1px solid ${color}22`,
                    display:"flex",alignItems:"flex-start",gap:9,
                    animation:`gwPop ${.1+i*.08}s ease both`,
                    transition:"all .2s",cursor:"default",
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${color}12`;e.currentTarget.style.borderColor=`${color}55`;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 24px rgba(0,0,0,.4)`;}}
                  onMouseLeave={e=>{e.currentTarget.style.background=`${color}07`;e.currentTarget.style.borderColor=`${color}22`;e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="";}}>
                    <div style={{fontSize:22,lineHeight:1.1,flexShrink:0}}>{icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:7.5,fontWeight:900,color:`${color}88`,letterSpacing:".12em",marginBottom:3}}>{lbl}</div>
                      <div style={{fontSize:17,fontWeight:900,color,lineHeight:1.05,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sn(p?.name||"—")}</div>
                      <div style={{fontSize:9,color:`${color}88`,marginTop:2}}>{p?.team||""}{meta?` · ${meta}`:""}</div>
                      <div style={{marginTop:5,fontSize:16,fontWeight:900,color,fontFamily:"DM Mono,monospace"}}>{val}{valSuf||" pts"}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* GW form comparison — top 5 sparklines */}
              <Panel>
                <SecLabel text="GW FORM WAVE — TOP 5 PROJECTIONS" sub="5-GW projected point history" accent="#3b9eff" right={`GW${gw-4}→GW${gw}`}/>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {sorted.slice(0,5).map((p,i)=>{
                    const col=i===0?"#28d97a":i===1?"#3b9eff":i===2?"#f2c94c":i===3?"#b388ff":"#ff6b35";
                    const vals=sparkVals(p);
                    const maxV=Math.max(...sorted.slice(0,5).flatMap(sparkVals),1);
                    return (
                      <div key={p.player_id||i} style={{display:"flex",alignItems:"center",gap:10,
                        padding:"7px 10px",borderRadius:9,
                        background:i===0?"rgba(40,217,122,.05)":"rgba(255,255,255,.02)",
                        border:`1px solid ${i===0?"rgba(40,217,122,.18)":"rgba(255,255,255,.04)"}`,
                        transition:"all .15s",animation:`gwIn ${.06+i*.07}s ease both`}}
                        onMouseEnter={e=>{e.currentTarget.style.background=`${col}0d`;}}
                        onMouseLeave={e=>{e.currentTarget.style.background=i===0?"rgba(40,217,122,.05)":"rgba(255,255,255,.02)";}}>
                        <span style={{fontSize:9,fontWeight:900,color:col,fontFamily:"DM Mono,monospace",width:14,flexShrink:0}}>{i+1}</span>
                        <div style={{width:80,flexShrink:0}}>
                          <div style={{fontSize:10.5,fontWeight:800,color:"#e8f0ff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sn(p.name)}</div>
                          <div style={{fontSize:8,color:"#2a4060"}}>{p.team} · {p.position}</div>
                        </div>
                        <Spark vals={vals} w={90} h={24} color={col}/>
                        <div style={{flex:1}}>
                          <ABar pct={(Number(p.pts_gw_1||0)/maxV)*100} color={col} h={4}/>
                        </div>
                        <div style={{textAlign:"right",minWidth:36,flexShrink:0}}>
                          <div style={{fontSize:15,fontWeight:900,color:col,fontFamily:"DM Mono,monospace",lineHeight:1}}>{Number(p.pts_gw_1||0).toFixed(1)}</div>
                          <div style={{fontSize:7.5,color:"#2a4060"}}>pts</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              {/* Fixture difficulty heatmap for top 10 players */}
              <Panel>
                <SecLabel text="FIXTURE DIFFICULTY HEATMAP" sub="GW1–5 ahead for top projected" accent="#ff6b35"
                  right={<div style={{display:"flex",gap:4}}>
                    {[{c:"#1a7a44",l:"VE"},{c:"#25a856",l:"E"},{c:"#4a5a6a",l:"M"},{c:"#8a2a2a",l:"H"},{c:"#cc1818",l:"VH"}].map(({c,l})=>(
                      <span key={l} style={{fontSize:7,fontWeight:900,padding:"1px 4px",borderRadius:3,background:`${c}33`,color:"rgba(255,255,255,.6)"}}>{l}</span>
                    ))}
                  </div>}/>
                <div style={{display:"flex",alignItems:"center",gap:6,paddingLeft:76,marginBottom:2}}>
                  {["GW1","GW2","GW3","GW4","GW5"].map(gn=>(
                    <div key={gn} style={{flex:1,fontSize:7.5,fontWeight:800,color:"#2a4060",textAlign:"center"}}>{gn}</div>
                  ))}
                </div>
                {heatPlayers.map((p,i)=>(
                  <DiffHeatRow key={p.player_id||i} name={p.name} team={p.team}
                    vals={[
                      Number(p.fixture_difficulty)||3,
                      // GW2-5 difficulty not available per-GW; map projected pts to difficulty bucket
                      Number(p.pts_gw_2)>7?2:Number(p.pts_gw_2)>5?3:Number(p.pts_gw_2)>3?4:3,
                      Number(p.pts_gw_3)>7?2:Number(p.pts_gw_3)>5?3:Number(p.pts_gw_3)>3?4:3,
                      Number(p.pts_gw_4)>7?2:Number(p.pts_gw_4)>5?3:Number(p.pts_gw_4)>3?4:3,
                      Number(p.pts_gw_5)>7?2:Number(p.pts_gw_5)>5?3:Number(p.pts_gw_5)>3?4:3,
                    ]}
                    idx={i}/>
                ))}
              </Panel>

              {/* Position distribution rings */}
              <Panel style={{background:"rgba(255,255,255,.015)"}}>
                <SecLabel text="SQUAD POOL COMPOSITION" accent="#f2c94c"/>
                <div style={{display:"flex",justifyContent:"space-around",padding:"4px 0 2px"}}>
                  {["GK","DEF","MID","FWD"].map(pos=>{
                    const cnt=players.filter(p=>p.position===pos).length;
                    const col={GK:"#f2c94c",DEF:"#3b9eff",MID:"#28d97a",FWD:"#ff6b35"}[pos];
                    const pct=players.length?(cnt/players.length)*100:0;
                    return <Ring key={pos} pct={pct} size={60} stroke={5} color={col} label={pos} sub={cnt+"p"} delay={50}/>;
                  })}
                </div>
              </Panel>
            </div>

            {/* ── RIGHT: RADAR PROFILE CARDS PER POSITION ──
                Completely different from BestTeamPage's right panel.
                BestTeamPage right = Captain/Diff/Value leaderboard rows + ownership arcs + value index
                This right = per-position hexagonal radar profiles showing analytical breakdown */}
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Panel>
                <SecLabel text="POSITION RADAR PROFILES" sub="Best player per position · analytical breakdown" accent="#b388ff"/>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {[
                    {pos:"GK",color:"#f2c94c"},
                    {pos:"DEF",color:"#3b9eff"},
                    {pos:"MID",color:"#28d97a"},
                    {pos:"FWD",color:"#ff6b35"},
                  ].map(({pos,color})=>(
                    <PosRadarCard key={pos} pos={pos}
                      player={posPlayers[pos]}
                      vals={makeRadar(posPlayers[pos])}
                      color={color}/>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        )}

        {/* ═══════════ TOP PLAYERS TAB ═══════════ */}
        {tab==="players" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>

            {/* Scorers / Assists toggle */}
            <Panel>
              <div style={{display:"flex",gap:4,marginBottom:4}}>
                {[{k:"goals",l:"⚽ Top Scorers"},{k:"assists",l:"🎯 Top Assists"}].map(({k,l})=>(
                  <button key={k} onClick={()=>setScorerTab(k)} style={{
                    flex:1,padding:"7px 0",borderRadius:7,fontSize:10,fontWeight:800,
                    background:scorerTab===k?"rgba(40,217,122,.15)":"rgba(255,255,255,.03)",
                    border:`1px solid ${scorerTab===k?"rgba(40,217,122,.35)":"rgba(255,255,255,.06)"}`,
                    color:scorerTab===k?"#28d97a":"#2a4a6a",cursor:"pointer",transition:"all .15s",
                  }}>{l}</button>
                ))}
              </div>
              <SecLabel text={scorerTab==="goals"?"EPL TOP SCORERS":"EPL TOP ASSISTS"} accent="#28d97a"/>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {(scorerTab==="goals"?scorers:assists).slice(0,12).map((p,i)=>{
                  const scoreVal=scorerTab==="goals"?p.goals:p.assists;
                  const maxV=(scorerTab==="goals"?scorers:assists)[0]?.goals||(scorerTab==="goals"?scorers:assists)[0]?.assists||1;
                  return (
                    <ScoRow key={p.player_id||p.player_name||i} rank={i+1} idx={i}
                      name={p.player_name||p.player||p.name||"?"}
                      team={p.team_name||p.team||"—"}
                      val={scoreVal||0}
                      valLbl={scorerTab==="goals"?"GLS":"AST"}
                      sub={scorerTab==="goals"?(p.assists!==undefined?`${p.assists} ast`:undefined):undefined}
                      maxVal={maxV}
                      color={scorerTab==="goals"?"#28d97a":"#3b9eff"}/>
                  );
                })}
              </div>
            </Panel>

            {/* FPL top projected */}
            <Panel>
              <SecLabel text={`FPL TOP PROJECTED — GW${gw}`} accent="#3b9eff"/>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {sorted.slice(0,14).map((p,i)=>{
                  const val=Number(p.pts_gw_1||0);
                  const col=val>=9?"#28d97a":val>=7?"#3b9eff":val>=5.5?"#f2c94c":"#67b1ff";
                  const maxV=Number(sorted[0]?.pts_gw_1||1);
                  return (
                    <div key={p.player_id||i} style={{display:"flex",alignItems:"center",gap:8,
                      padding:"6px 9px",borderRadius:8,background:"rgba(255,255,255,.025)",
                      border:"1px solid rgba(255,255,255,.05)",transition:"all .15s",
                      animation:`gwIn ${.04+i*.03}s ease both`}}
                      onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.07)";e.currentTarget.style.transform="translateX(3px)";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.025)";e.currentTarget.style.transform="none";}}>
                      <span style={{fontSize:9.5,fontWeight:900,color:"#2a4060",fontFamily:"DM Mono,monospace",width:18,flexShrink:0}}>{i+1}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:800,color:"#e8f0ff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
                        <div style={{fontSize:8.5,color:"#2a4060"}}>{p.team} · {p.position} · £{p.cost}m</div>
                      </div>
                      <div style={{width:60,flexShrink:0}}><ABar pct={(val/maxV)*100} color={col} h={3}/></div>
                      <div style={{textAlign:"right",flexShrink:0,minWidth:34}}>
                        <div style={{fontSize:13,fontWeight:900,color:col,fontFamily:"DM Mono,monospace"}}>{val.toFixed(1)}</div>
                        <div style={{fontSize:7.5,color:"#2a4060"}}>{Number(p.form||0).toFixed(1)} fm</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            {/* Value + ownership + differentials */}
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <Panel>
                <SecLabel text="VALUE PICKS" sub="Pts per £m this season" accent="#b388ff"/>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {byValue.slice(0,7).map((p,i)=>{
                    const maxV=Number(byValue[0]?.value_rest_season||1);
                    return (
                      <div key={p.player_id||i} style={{display:"flex",alignItems:"center",gap:8,
                        padding:"5px 9px",borderRadius:8,background:"rgba(255,255,255,.025)",
                        border:"1px solid rgba(179,136,255,.08)",transition:"background .15s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(179,136,255,.09)"}
                        onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.025)"}>
                        <span style={{fontSize:9,fontWeight:900,color:"#4a2a8a",width:14}}>{i+1}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:10.5,fontWeight:700,color:"#c8d8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
                          <div style={{fontSize:8,color:"#2a4060"}}>{p.team} · £{p.cost}m</div>
                        </div>
                        <ABar pct={(Number(p.value_rest_season||0)/maxV)*100} color="#b388ff" h={3}/>
                        <span style={{fontSize:12,fontWeight:900,color:"#b388ff",fontFamily:"DM Mono,monospace",minWidth:28,textAlign:"right"}}>
                          {Number(p.value_rest_season||0).toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              <Panel>
                <SecLabel text="DIFFERENTIALS <12% OWN" sub="High upside, low exposure" accent="#28d97a"/>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {diffs.slice(0,6).map((p,i)=>{
                    const own=Number(p.selected_by_pct||0);
                    return (
                      <div key={p.player_id||i} style={{display:"flex",alignItems:"center",gap:8,
                        padding:"5px 9px",borderRadius:8,background:"rgba(255,255,255,.025)",
                        border:"1px solid rgba(40,217,122,.08)",transition:"background .15s"}}
                        onMouseEnter={e=>e.currentTarget.style.background="rgba(40,217,122,.07)"}
                        onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.025)"}>
                        <span style={{fontSize:9,fontWeight:900,color:"#0a5a2a",width:14}}>{i+1}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:10.5,fontWeight:700,color:"#c8d8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
                          <div style={{fontSize:8,color:"#2a4060"}}>{p.team} · {own.toFixed(1)}%</div>
                        </div>
                        <span style={{fontSize:12,fontWeight:900,color:"#28d97a",fontFamily:"DM Mono,monospace",minWidth:28,textAlign:"right"}}>
                          {Number(p.pts_gw_1||0).toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              <Panel>
                <SecLabel text="OWNERSHIP HEAT" sub="Template vs differential" accent="#ff6b35"/>
                {byOwn.slice(0,6).map((p,i)=>{
                  const own=Number(p.selected_by_pct||0);
                  const col=own>30?"#f2c94c":own>15?"#ff6b35":"#3b9eff";
                  return (
                    <div key={p.player_id||i} style={{display:"flex",alignItems:"center",gap:7}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#c8d8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sn(p.name)}</div>
                        <div style={{fontSize:8,color:"#2a4060"}}>{p.team}</div>
                      </div>
                      <ABar pct={Math.min(own,70)/70*100} color={col} h={4}/>
                      <span style={{fontSize:10,fontWeight:900,color:col,fontFamily:"DM Mono,monospace",minWidth:32,textAlign:"right"}}>{own.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </Panel>
            </div>
          </div>
        )}

        {/* ═══════════ EPL LEAGUE TAB ═══════════ */}
        {tab==="league" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:16}}>
            <Panel>
              <SecLabel text="EPL FULL STANDINGS" accent="#3b9eff"
                right={<div style={{display:"flex",gap:8,fontSize:8,fontWeight:800}}>
                  {[{c:"#3b9eff",l:"UCL"},{c:"#28d97a",l:"UEL"},{c:"#f2c94c",l:"UECL"},{c:"#ff4d6d",l:"REL"}].map(({c,l})=>(
                    <span key={l} style={{padding:"1px 5px",borderRadius:4,background:`${c}20`,color:c}}>{l}</span>
                  ))}
                </div>}/>
              {/* Header */}
              <div style={{display:"flex",alignItems:"center",gap:7,padding:"4px 9px",
                borderBottom:"1px solid rgba(255,255,255,.07)"}}>
                <span style={{fontSize:8.5,fontWeight:900,color:"#2a4060",width:18}}>#</span>
                <span style={{flex:1,fontSize:8.5,fontWeight:900,color:"#2a4060"}}>CLUB</span>
                {["P","W","D","L","GD","PTS"].map(h=>(
                  <span key={h} style={{fontSize:8.5,fontWeight:900,color:"#2a4060",width:h==="PTS"?28:h==="GD"?28:16,textAlign:"center"}}>{h}</span>
                ))}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                {(standings.length>0?standings:Array.from({length:20},(_,i)=>({team_name:`Team ${i+1}`,points:50-Math.round(i*2.5),played:29,won:Math.max(14-i,0),drawn:5,lost:i,goal_diff:30-i*3}))).map((r,i)=>(
                  <StandRow key={r.team_name||r.team||i} rank={i+1} idx={i}
                    team={r.team_name||r.team||r.name||"—"}
                    pts={r.points||r.pts||0}
                    played={r.played||0} won={r.won||0} drawn={r.drawn||0} lost={r.lost||0}
                    gd={r.goal_diff||r.gd||0}/>
                ))}
              </div>
            </Panel>

            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <Panel>
                <SecLabel text="TOP SCORERS" accent="#28d97a"/>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {scorers.slice(0,8).map((p,i)=>(
                    <ScoRow key={p.player_id||i} rank={i+1} idx={i}
                      name={p.player_name||p.name||"?"}
                      team={p.team_name||p.team||"—"}
                      val={p.goals||0} valLbl="GLS"
                      maxVal={scorers[0]?.goals||1}
                      color="#28d97a"/>
                  ))}
                </div>
              </Panel>
              <Panel>
                <SecLabel text="TOP ASSISTS" accent="#3b9eff"/>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {assists.slice(0,6).map((p,i)=>(
                    <ScoRow key={p.player_id||i} rank={i+1} idx={i}
                      name={p.player_name||p.name||"?"}
                      team={p.team_name||p.team||"—"}
                      val={p.assists||0} valLbl="AST"
                      maxVal={assists[0]?.assists||1}
                      color="#3b9eff"/>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        )}

        {/* ═══════════ INJURIES TAB ═══════════ */}
        {tab==="injuries" && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <Panel>
              <SecLabel text="INJURY TRACKER — EPL" sub={`${Math.min(injuries.length,20)} active records`} accent="#ff4d6d"/>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {(injuries.length>0?injuries:[
                  {player_name:"T. Alexander-Arnold",team:"LIV",injury_type:"Muscle",status:"Injured"},
                  {player_name:"Rodri",team:"MCI",injury_type:"Knee",status:"Injured"},
                  {player_name:"R. Højbjerg",team:"TOT",injury_type:"Hamstring",status:"Doubtful"},
                  {player_name:"N. Zaha",team:"CRY",injury_type:"Knock",status:"Doubtful"},
                  {player_name:"B. White",team:"ARS",injury_type:"Personal",status:"Injured"},
                ]).slice(0,16).map((inj,i)=>(
                  <InjPill key={i}
                    player={inj.player_name||inj.player||"Unknown"}
                    team={inj.team_name||inj.team||"—"}
                    reason={inj.reason||inj.type||""}
                    status={inj.type||inj.status||"Injured"}/>
                ))}
              </div>
            </Panel>

            <Panel>
              <SecLabel text="APPEARANCE PROBABILITY TRACKER" sub="Sorted lowest to highest" accent="#ffaa44"/>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {atRisk.slice(0,16).map((p,i)=>{
                  const prob=Math.round((p.appearance_prob||0)*100);
                  const col=prob<60?"#ff4d6d":prob<80?"#ffaa44":"#28d97a";
                  return (
                    <div key={p.player_id||i} style={{display:"flex",alignItems:"center",gap:9,
                      padding:"5px 8px",borderRadius:8,background:"rgba(255,255,255,.02)",
                      border:`1px solid ${col}18`,transition:"background .15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=`${col}0d`}
                      onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.02)"}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:700,color:"#c8d8f0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sn(p.name)}</div>
                        <div style={{fontSize:8.5,color:"#2a4060"}}>{p.team} · {p.position}</div>
                      </div>
                      <ABar pct={prob} color={col} h={4}/>
                      <Ring pct={prob} size={36} stroke={3} color={col} delay={i*40}/>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}