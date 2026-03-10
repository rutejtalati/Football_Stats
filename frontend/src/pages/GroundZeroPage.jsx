// GroundZeroPage.jsx — StatinSite Analytics Academy
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";


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
const C = {
  bg:"#060a14", panel:"rgba(8,13,24,0.98)", line:"rgba(255,255,255,0.07)",
  text:"#f4f7fb", muted:"#8a9ab8", soft:"#3a5272",
  green:"#28d97a", blue:"#67b1ff", gold:"#f2c94c", red:"#ff5d5d",
  purple:"#b388ff", teal:"#2dd4bf", orange:"#fb923c", cyan:"#22d3ee", pink:"#f472b6",
};

const GZ_CSS = `
  @keyframes gzPop  { from{opacity:0;transform:scale(0.94) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
  @keyframes gzSlide{ from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
  @keyframes gzOrb  { 0%{transform:translate(0,0)} 33%{transform:translate(28px,-18px)} 66%{transform:translate(-14px,22px)} 100%{transform:translate(0,0)} }
  @keyframes gzCount{ from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes gzFloat{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
  .gz-step{transition:all 180ms cubic-bezier(0.22,1,0.36,1);cursor:pointer;}
  .gz-step:hover{transform:translateX(3px);}
  .gz-btn{transition:all 150ms;cursor:pointer;}
  .gz-btn:hover{filter:brightness(1.14);transform:translateY(-1px);}
  .gz-tab{transition:all 160ms;cursor:pointer;background:none;border:none;}
  .gz-card{transition:all 200ms cubic-bezier(0.22,1,0.36,1);}
  .gz-card:hover{transform:translateY(-3px);}
`;

const card = (col=C.line,extra={}) => ({background:C.panel,border:`1px solid ${col}`,borderRadius:14,...extra});
const tag  = col => ({display:"inline-block",padding:"2px 9px",borderRadius:999,background:`${col}18`,border:`1px solid ${col}44`,fontSize:9,fontWeight:900,color:col,letterSpacing:"0.1em",fontFamily:"'Inter',sans-serif"});
const mono = col => ({fontFamily:"'JetBrains Mono',monospace",color:col,background:`${col}0e`,border:`1px solid ${col}1e`,borderRadius:8,padding:"8px 12px",fontSize:11.5,lineHeight:1.7});

// Poisson math
function poisson(lam,k){if(k<0||!isFinite(lam)||lam<=0)return 0;let lg=-lam+k*Math.log(lam);for(let i=1;i<=k;i++)lg-=Math.log(i);return Math.exp(lg);}
function buildGrid(hl,al,max=6){const g=[];for(let h=0;h<=max;h++){const r=[];for(let a=0;a<=max;a++)r.push(poisson(hl,h)*poisson(al,a)*100);g.push(r);}return g;}
function dixonColes(ph,pa){const tau=(h,a)=>h===0&&a===0?1-ph*pa*(-0.13):h===0&&a===1?1+ph*(-0.13):h===1&&a===0?1+pa*(-0.13):h===1&&a===1?1-(-0.13):1;const g=buildGrid(ph,pa);return g.map((row,h)=>row.map((p,a)=>p*tau(h,a)));}
function getProbs(grid){let hw=0,aw=0,dr=0;grid.forEach((row,h)=>row.forEach((p,a)=>{if(h>a)hw+=p;else if(h<a)aw+=p;else dr+=p;}));const t=hw+aw+dr;return{hw:hw/t*100,aw:aw/t*100,draw:dr/t*100};}

// Animated counter
function Counter({target,suffix="",dur=1400}){
  const[v,sv]=useState(0);const r=useRef();
  useEffect(()=>{const s=Date.now();const t=()=>{const p=Math.min((Date.now()-s)/dur,1);const e=1-Math.pow(1-p,3);sv(Math.round(target*e));if(p<1)r.current=requestAnimationFrame(t);};r.current=requestAnimationFrame(t);return()=>cancelAnimationFrame(r.current);},[target,dur]);
  return <>{v.toLocaleString()}{suffix}</>;
}

// PIPELINE STEPS
const STEPS=[
  {id:"xg",    label:"Raw xG Data",   color:C.green,  tag:"INPUT",      title:"Expected Goals (xG)",        subtitle:"Shot quality model — 0 to 1 probability of scoring",                    formula:"xG = f(distance, angle, body_part, assist_type, game_state)",                            desc:"Each shot gets a 0-1 probability from historical shots in the same context. A penalty is ~0.79 xG. A speculative 30-yarder might be 0.03. The model trains on 500k+ shots.",interactive:"xg_map"},
  {id:"elo",   label:"Elo Ratings",   color:C.blue,   tag:"MODEL",      title:"Elo Rating System",          subtitle:"Dynamic team strength updated after every match",                       formula:"E = 1/(1+10^((Eloₒₚₚ - Eloₜₑₐₘ)/400))\nΔElo = K(S - E)",                               desc:"Teams start at 1500. K=32 so a major upset shifts ratings significantly. Home advantage adds ~100 Elo points. Ratings update after every match.",interactive:"elo_sim"},
  {id:"lam",   label:"Team λ Calc",   color:C.teal,   tag:"CALC",       title:"Attack/Defence λ",           subtitle:"Team-specific scoring rates for the Poisson model",                     formula:"λ_home = attack_home × defence_away × league_avg_home\nλ_away = attack_away × defence_home × league_avg_away", desc:"Each team has attack and defence ratings from recent xG data. These multiply with league averages to give match-specific expected goals (lambda).",interactive:"lambda_calc"},
  {id:"poi",   label:"Poisson Grid",  color:C.purple, tag:"ALGORITHM",  title:"Poisson Distribution",      subtitle:"Models goals as random discrete events",                                formula:"P(k goals) = (λᵏ · e⁻λ) / k!",                                                           desc:"Using lambda values we calculate probability of every scoreline 0-0 through 6-6. The full grid gives P(H=h, A=a) for all combinations simultaneously.",interactive:"poisson_grid"},
  {id:"dc",    label:"Dixon-Coles",   color:C.gold,   tag:"CORRECTION", title:"Dixon-Coles Correction",    subtitle:"Fixes Poisson's systematic under-prediction of low scores",             formula:"P_DC(h,a) = P(h) · P(a) · τ(h,a,ρ)  [ρ ≈ -0.13]",                                       desc:"Poisson overestimates 0-0 and 1-1 draws. Dixon-Coles applies correlation factor τ to scorelines with 0 or 1 goals, improving accuracy by ~3-4%.",interactive:"dc_compare"},
  {id:"odds",  label:"3-Way Odds",    color:C.orange, tag:"OUTPUT",     title:"Win Probabilities",         subtitle:"Summing the scoreline grid for 1X2 odds",                              formula:"P(H win) = Σ P(h,a) for all h > a\nConfidence = |P(H) - P(A)|",                           desc:"Sum all scorelines where H>A for home win, H=A for draw, H<A for away. Confidence score drives the prediction display strength.",interactive:"odds_grid"},
  {id:"btts",  label:"BTTS / Markets",color:C.cyan,   tag:"MARKET",     title:"Both Teams To Score",       subtitle:"Using Poisson to model each team scoring at least once",                formula:"P(BTTS) = [1 - P(H scores 0)] × [1 - P(A scores 0)]",                                    desc:"From the same Poisson model we derive BTTS, Over 2.5, and Asian Handicap. Each market is a direct derivation from the scoreline probability grid.",interactive:"btts_calc"},
  {id:"sig",   label:"Confidence",    color:C.pink,   tag:"SIGNAL",     title:"Confidence Scoring",        subtitle:"Combining model signals into a final confidence %",                     formula:"Conf = 0.40×xG + 0.35×Form + 0.15×PPG + 0.10×ICT",                                       desc:"Final confidence blends Poisson probability with recent form, season PPG, and ICT. Higher confidence = stronger signal from multiple corroborating sources.",interactive:"signal_weights"},
];

// XG SHOT MAP
function XgShotMap(){
  const[hov,setHov]=useState(null);const[sel,setSel]=useState(null);
  const ZONES=[
    {id:"pen", x:46,y:70,r:6, xg:0.79,label:"Penalty",    desc:"12 yards, central"},
    {id:"tap", x:46,y:82,r:5, xg:0.96,label:"Tap-in",     desc:"2 yards, open goal"},
    {id:"h6a", x:30,y:74,r:5, xg:0.28,label:"6yd Header", desc:"Corner delivery"},
    {id:"h6b", x:62,y:74,r:5, xg:0.28,label:"6yd Header", desc:"Far post header"},
    {id:"bx1", x:46,y:62,r:5, xg:0.14,label:"Box edge",   desc:"22 yards central"},
    {id:"an1", x:22,y:78,r:4, xg:0.07,label:"Tight angle",desc:"Right angle"},
    {id:"an2", x:70,y:78,r:4, xg:0.07,label:"Tight angle",desc:"Left angle"},
    {id:"ou1", x:32,y:55,r:4, xg:0.05,label:"Outside box",desc:"25 yards right"},
    {id:"ou2", x:60,y:55,r:4, xg:0.05,label:"Outside box",desc:"25 yards left"},
    {id:"lng", x:46,y:45,r:4, xg:0.03,label:"Long range", desc:"30+ yards"},
  ];
  const xgCol=xg=>xg>=.7?C.green:xg>=.4?"#a3e635":xg>=.15?C.gold:xg>=.07?C.orange:C.red;
  const active=sel||hov;const zone=ZONES.find(z=>z.id===active);
  return(
    <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
      <div style={{flexShrink:0}}>
        <svg width={200} height={190} viewBox="0 0 92 100" style={{display:"block",borderRadius:8}}>
          <rect x={0} y={0} width={92} height={100} fill="#0a1f10" rx={4}/>
          <rect x={18} y={52} width={56} height={48} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={.7}/>
          <rect x={32} y={72} width={28} height={28} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={.6}/>
          <rect x={38} y={94} width={16} height={6} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={1}/>
          <circle cx={46} cy={70} r={.8} fill="rgba(255,255,255,0.4)"/>
          <path d="M 28,52 A 18,18 0 0,0 64,52" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={.6}/>
          {ZONES.map(z=>(
            <circle key={z.id} cx={z.x} cy={z.y} r={z.r}
              fill={xgCol(z.xg)} opacity={active===z.id?.9:.55}
              stroke={active===z.id?"#fff":"transparent"} strokeWidth={.8}
              style={{cursor:"pointer",transition:"all 150ms"}}
              onMouseEnter={()=>setHov(z.id)} onMouseLeave={()=>setHov(null)}
              onClick={()=>setSel(s=>s===z.id?null:z.id)}/>
          ))}
        </svg>
        <div style={{display:"flex",gap:6,marginTop:6,justifyContent:"center"}}>
          {[[C.green,"High"],[C.gold,"Mid"],[C.red,"Low"]].map(([col,l])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:C.muted}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:col}}/>{l}
            </div>
          ))}
        </div>
      </div>
      <div style={{flex:1}}>
        {zone?(
          <div style={{animation:"gzPop 0.2s ease"}}>
            <div style={{fontSize:9,fontWeight:900,color:C.soft,letterSpacing:"0.1em",marginBottom:4}}>SELECTED ZONE</div>
            <div style={{fontSize:16,fontWeight:900,color:C.text,marginBottom:4}}>{zone.label}</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:10}}>{zone.desc}</div>
            <div style={{fontSize:9,color:C.soft,marginBottom:3}}>EXPECTED GOALS</div>
            <div style={{fontSize:38,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:xgCol(zone.xg),lineHeight:1}}>{zone.xg.toFixed(2)}</div>
            <div style={{marginTop:8,height:5,borderRadius:2,background:"rgba(255,255,255,0.06)"}}>
              <div style={{height:"100%",width:`${zone.xg*100}%`,background:xgCol(zone.xg),borderRadius:2,transition:"width 400ms cubic-bezier(0.22,1,0.36,1)"}}/>
            </div>
            <div style={{fontSize:10,color:C.soft,marginTop:6}}>{zone.xg>=.7?"Elite chance — clinical finishers score these":zone.xg>=.3?"Decent — 1 goal every ~3 shots":zone.xg>=.1?"Low quality — needs exceptional finish":"Speculative — rarely scored even by elite strikers"}</div>
          </div>
        ):(
          <div style={{color:C.soft,fontSize:11}}>
            <div style={{fontSize:13,fontWeight:700,color:C.muted,marginBottom:8}}>Tap a zone on the pitch</div>
            <div style={{lineHeight:1.7}}>Green = high danger, red = speculative. xG is trained on <b style={{color:C.text}}>500k+ historical shots</b> across Europe's top leagues.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ELO SIM
function EloSim(){
  const[tA,setA]=useState(1650);const[tB,setB]=useState(1480);const[res,setRes]=useState(null);
  const K=32,ea=1/(1+Math.pow(10,(tB-tA)/400)),eb=1-ea;
  const sa=res==="A"?1:res==="D"?.5:res==="B"?0:null;
  const nA=sa!=null?Math.round(tA+K*(sa-ea)):null;
  const nB=sa!=null?Math.round(tB+K*((1-sa)-eb)):null;
  const sl=col=>({width:"100%",accentColor:col,cursor:"pointer"});
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
        {[["Team A",tA,setA,C.blue],["Team B",tB,setB,C.orange]].map(([l,v,s,col])=>(
          <div key={l} style={{background:`${col}0a`,border:`1px solid ${col}22`,borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:9,fontWeight:900,color:col,letterSpacing:"0.1em",marginBottom:4}}>{l}</div>
            <div style={{fontSize:26,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:col,marginBottom:6}}>{v}</div>
            <input type="range" min={1200} max={2000} value={v} onChange={e=>{s(+e.target.value);setRes(null);}} style={sl(col)}/>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.soft,marginTop:2}}>
              <span>1200</span><span>2000</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${C.line}`,borderRadius:10,padding:"10px 14px"}}>
        <div style={{fontSize:9,color:C.soft,letterSpacing:"0.1em",marginBottom:8,fontWeight:900}}>EXPECTED OUTCOME</div>
        <div style={{display:"flex",gap:0,borderRadius:8,overflow:"hidden",marginBottom:10}}>
          {[["A Wins",ea*100,C.blue],["Draw",(1-ea-eb<0?.15:1-ea-eb)*100,C.gold],["B Wins",eb*100,C.orange]].map(([l,p,col],i)=>(
            <div key={l} style={{flex:Math.max(p,10),background:`${col}18`,padding:"6px 0",textAlign:"center",borderRight:i<2?`1px solid ${C.line}`:"none"}}>
              <div style={{fontSize:14,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:col}}>{Math.abs(p).toFixed(0)}%</div>
              <div style={{fontSize:8,color:C.soft}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:9,color:C.soft,marginBottom:6,fontWeight:900}}>SIMULATE RESULT:</div>
        <div style={{display:"flex",gap:6}}>
          {[["A Wins","A",C.blue],["Draw","D",C.gold],["B Wins","B",C.orange]].map(([l,r,col])=>(
            <button key={r} className="gz-btn" onClick={()=>setRes(r)} style={{flex:1,padding:"7px 0",borderRadius:8,cursor:"pointer",background:res===r?`${col}20`:"rgba(255,255,255,0.04)",border:`1px solid ${res===r?col+"55":C.line}`,color:res===r?col:C.muted,fontSize:11,fontWeight:800,fontFamily:"'Inter',sans-serif"}}>{l}</button>
          ))}
        </div>
      </div>
      {nA!=null&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,animation:"gzPop 0.25s ease"}}>
          {[[nA,tA,C.blue,"Team A"],[nB,tB,C.orange,"Team B"]].map(([nv,ov,col,l])=>{
            const d=nv-ov;
            return(<div key={l} style={{background:`${col}0a`,border:`1px solid ${col}22`,borderRadius:9,padding:"8px 11px"}}>
              <div style={{fontSize:9,color:col,fontWeight:900,marginBottom:3}}>{l} NEW ELO</div>
              <div style={{fontSize:22,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:col}}>{nv}</div>
              <div style={{fontSize:11,color:d>=0?C.green:C.red}}>{d>=0?"+":""}{d}</div>
            </div>);
          })}
        </div>
      )}
    </div>
  );
}

// LAMBDA CALC
function LambdaCalc(){
  const[hA,setHA]=useState(1.2);const[aD,setAD]=useState(0.85);const[aA,setAA]=useState(0.9);const[hD,setHD]=useState(1.1);
  const lg=1.35,la2=1.1;
  const lh=+(hA*aD*lg).toFixed(2),la=+(aA*hD*la2).toFixed(2);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[["Home Attack",hA,setHA,C.blue],["Away Defence",aD,setAD,C.red],["Away Attack",aA,setAA,C.orange],["Home Defence",hD,setHD,C.teal]].map(([l,v,s,col])=>(
          <div key={l} style={{background:`${col}0a`,border:`1px solid ${col}20`,borderRadius:8,padding:"8px 10px"}}>
            <div style={{fontSize:9,color:col,fontWeight:900,marginBottom:3}}>{l}</div>
            <div style={{fontSize:20,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:col,marginBottom:5}}>{v.toFixed(2)}</div>
            <input type="range" min={0.4} max={2} step={0.05} value={v} onChange={e=>s(+e.target.value)} style={{width:"100%",accentColor:col}}/>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[["λ Home (xG)",lh,C.blue],["λ Away (xG)",la,C.red]].map(([l,v,col])=>(
          <div key={l} style={{background:`${col}12`,border:`1px solid ${col}33`,borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
            <div style={{fontSize:9,color:col,fontWeight:900,marginBottom:4}}>{l}</div>
            <div style={{fontSize:32,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:col}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={mono(C.teal)}>λ_home = {hA} × {aD} × {lg} = <span style={{color:C.blue}}>{lh}</span>{"\n"}λ_away = {aA} × {hD} × {la2} = <span style={{color:C.red}}>{la}</span></div>
    </div>
  );
}

// POISSON GRID
function PoissonGrid(){
  const[hl,setHL]=useState(1.6);const[al,setAL]=useState(1.1);const[dc,setDC]=useState(true);const[hov,setHov]=useState(null);
  const MAX=5;
  const rawG=useMemo(()=>buildGrid(hl,al,MAX),[hl,al]);
  const dcG=useMemo(()=>dixonColes(hl,al),[hl,al]);
  const grid=dc?dcG:rawG;
  const probs=useMemo(()=>getProbs(grid),[grid]);
  const maxP=useMemo(()=>Math.max(...grid.flat()),[grid]);
  const cellCol=(p,h,a)=>{const i=p/maxP;const col=h>a?C.blue:h===a?C.gold:C.red;return `${col}${Math.round(i*200+10).toString(16).padStart(2,"0")}`;};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[["Home λ",hl,setHL,C.blue],["Away λ",al,setAL,C.red]].map(([l,v,s,col])=>(
          <div key={l} style={{background:`${col}0a`,border:`1px solid ${col}22`,borderRadius:9,padding:"8px 10px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:9,color:col,fontWeight:900}}>{l}</span>
              <span style={{fontSize:15,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:col}}>{v.toFixed(1)}</span>
            </div>
            <input type="range" min={0.2} max={3.5} step={0.1} value={v} onChange={e=>s(+e.target.value)} style={{width:"100%",accentColor:col}}/>
          </div>
        ))}
      </div>
      <button onClick={()=>setDC(d=>!d)} style={{alignSelf:"flex-start",padding:"4px 12px",borderRadius:999,cursor:"pointer",background:dc?`${C.gold}15`:"rgba(255,255,255,0.04)",border:`1px solid ${dc?C.gold+"44":C.line}`,color:dc?C.gold:C.soft,fontSize:10,fontWeight:800,fontFamily:"'Inter',sans-serif"}}>
        {dc?"✓":"○"} Dixon-Coles correction
      </button>
      <div style={{overflowX:"auto"}}>
        <div style={{display:"flex",gap:2,marginBottom:2,paddingLeft:36}}>
          {Array.from({length:MAX+1}).map((_,a)=><div key={a} style={{width:34,textAlign:"center",fontSize:9,color:C.muted,fontWeight:700}}>{a}</div>)}
        </div>
        {Array.from({length:MAX+1}).map((_,h)=>(
          <div key={h} style={{display:"flex",gap:2,marginBottom:2,alignItems:"center"}}>
            <div style={{width:34,fontSize:9,color:C.muted,fontWeight:700,textAlign:"right",paddingRight:6,flexShrink:0}}>{h===0?<span style={{fontSize:7,color:C.blue,fontWeight:900}}>H↓\A→</span>:h}</div>
            {Array.from({length:MAX+1}).map((_,a)=>{
              const p=grid[h]?.[a]??0;const isH=hov?.h===h&&hov?.a===a;
              return(<div key={a} onMouseEnter={()=>setHov({h,a,p})} onMouseLeave={()=>setHov(null)} style={{width:34,height:26,borderRadius:4,background:cellCol(p,h,a),display:"flex",alignItems:"center",justifyContent:"center",fontSize:isH?9.5:8,fontWeight:800,fontFamily:"'JetBrains Mono',monospace",color:p>maxP*.5?C.text:C.muted,border:isH?"1px solid rgba(255,255,255,0.3)":"1px solid transparent",cursor:"default",transition:"all 100ms",transform:isH?"scale(1.1)":"scale(1)",position:"relative",zIndex:isH?2:1}}>{p.toFixed(1)}%</div>);
            })}
          </div>
        ))}
      </div>
      {hov&&<div style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${C.line}`,borderRadius:8,padding:"7px 11px",fontSize:11}}>
        <b style={{color:C.text}}>{hov.h}–{hov.a}</b><span style={{color:C.muted}}> — {hov.p.toFixed(2)}%</span>
        <span style={{color:hov.h>hov.a?C.blue:hov.h===hov.a?C.gold:C.red,marginLeft:8}}>{hov.h>hov.a?"Home win":hov.h===hov.a?"Draw":"Away win"}</span>
      </div>}
      <div style={{display:"flex",gap:0,borderRadius:10,overflow:"hidden",border:`1px solid ${C.line}`}}>
        {[["Home Win",probs.hw,C.blue],["Draw",probs.draw,C.gold],["Away Win",probs.aw,C.red]].map(([l,p,col],i)=>(
          <div key={l} style={{flex:1,background:`${col}12`,padding:"10px 8px",textAlign:"center",borderRight:i<2?`1px solid ${C.line}`:"none"}}>
            <div style={{fontSize:18,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:col}}>{p.toFixed(1)}%</div>
            <div style={{fontSize:9,color:C.soft,marginTop:1}}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// DC COMPARE
function DcCompare(){
  const[lam,setL]=useState(1.4);
  const data=[0,1,2,3,4].map(k=>({k:`${k}`,raw:+(poisson(lam,k)*100).toFixed(2),dc:+(poisson(lam,k)*100*(k<=1?(1+(-0.13)*(k===0?1:-1)):1)).toFixed(2)}));
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:9,color:C.soft,fontWeight:900,flexShrink:0}}>Team λ:</span>
        <input type="range" min={0.3} max={3} step={0.1} value={lam} onChange={e=>setL(+e.target.value)} style={{flex:1,accentColor:C.gold}}/>
        <span style={{fontSize:14,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:C.gold,minWidth:30}}>{lam.toFixed(1)}</span>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data} barGap={2}>
          <XAxis dataKey="k" tick={{fill:C.soft,fontSize:10}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fill:C.soft,fontSize:9}} axisLine={false} tickLine={false} unit="%"/>
          <Tooltip contentStyle={{background:C.panel,border:`1px solid ${C.line}`,borderRadius:8,fontSize:11}} formatter={v=>[`${v}%`]}/>
          <Bar dataKey="raw" name="Poisson" fill={C.blue} radius={[3,3,0,0]} fillOpacity={0.7}/>
          <Bar dataKey="dc" name="Dixon-Coles" fill={C.gold} radius={[3,3,0,0]} fillOpacity={0.85}/>
        </BarChart>
      </ResponsiveContainer>
      <div style={{display:"flex",gap:12,fontSize:10}}><span style={{color:C.blue}}>■ Raw Poisson</span><span style={{color:C.gold}}>■ Dixon-Coles</span><span style={{color:C.soft,marginLeft:"auto"}}>Low scores corrected by ρ≈-0.13</span></div>
    </div>
  );
}

// ODDS GRID (same as PoissonGrid with read-only)
function OddsGrid(){return <PoissonGrid/>;}

// BTTS CALC
function BttsCalc(){
  const[hl,setH]=useState(1.5);const[al,setA]=useState(1.2);
  const p0h=poisson(hl,0),p0a=poisson(al,0);
  const pB=(1-p0h)*(1-p0a)*100;
  const pO=Math.min((1-([0,1,2].reduce((s,k)=>{const g=buildGrid(hl,al,4);return s+(g[k]?g[k].slice(0,3-k).reduce((a,b)=>a+b,0):0);},0)))*120,99);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {[["Home λ",hl,setH,C.blue],["Away λ",al,setA,C.red]].map(([l,v,s,col])=>(
        <div key={l} style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:9,color:col,fontWeight:900,minWidth:80}}>{l}</span>
          <input type="range" min={0.2} max={3} step={0.1} value={v} onChange={e=>s(+e.target.value)} style={{flex:1,accentColor:col}}/>
          <span style={{fontSize:13,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:col,minWidth:26}}>{v.toFixed(1)}</span>
        </div>
      ))}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginTop:4}}>
        {[["BTTS YES",`${pB.toFixed(1)}%`,C.green],["Over 2.5",`${pO.toFixed(1)}%`,C.gold],["Home CS",`${(p0a*100).toFixed(1)}%`,C.blue]].map(([l,v,col])=>(
          <div key={l} style={{background:`${col}0e`,border:`1px solid ${col}28`,borderRadius:9,padding:"10px 8px",textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:col}}>{v}</div>
            <div style={{fontSize:9,color:C.soft,marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={mono(C.teal)}>P(BTTS) = [1-{p0h.toFixed(3)}] × [1-{p0a.toFixed(3)}] = <span style={{color:C.green}}>{(pB/100).toFixed(3)} ({pB.toFixed(1)}%)</span></div>
    </div>
  );
}

// SIGNAL WEIGHTS
function SignalWeights(){
  const[w,setW]=useState({xg:40,form:35,ppg:15,ict:10});
  const tot=Object.values(w).reduce((a,b)=>a+b,0);
  const sigs=[{k:"xg",l:"Projected xG pts",col:C.green},{k:"form",l:"Recent Form",col:C.blue},{k:"ppg",l:"Season PPG",col:C.gold},{k:"ict",l:"ICT Index",col:C.purple}];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {sigs.map(s=>(
        <div key={s.k}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:12,fontWeight:700,color:C.text}}>{s.l}</span>
            <span style={{fontSize:18,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:s.col}}>{w[s.k]}%</span>
          </div>
          <input type="range" min={0} max={70} step={5} value={w[s.k]} onChange={e=>setW(p=>({...p,[s.k]:+e.target.value}))} style={{width:"100%",accentColor:s.col}}/>
          <div style={{height:3,background:"rgba(255,255,255,0.05)",borderRadius:2,marginTop:3}}>
            <div style={{height:"100%",width:`${(w[s.k]/70)*100}%`,background:s.col,borderRadius:2,transition:"width 150ms"}}/>
          </div>
        </div>
      ))}
      <div style={{marginTop:4,padding:"9px 12px",borderRadius:9,background:`${tot===100?C.green:C.red}0a`,border:`1px solid ${tot===100?C.green:C.red}33`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:11,color:C.muted}}>Total: <b style={{color:tot===100?C.green:C.red}}>{tot}%</b></span>
          <span style={{fontSize:12,fontWeight:900,color:C.gold}}>~{Math.min(100,((w.xg*.9+w.form*.8+w.ppg*.7+w.ict*.6)/tot*100)).toFixed(0)}% confidence</span>
        </div>
      </div>
    </div>
  );
}

const INTERACTIVES={xg_map:<XgShotMap/>,elo_sim:<EloSim/>,lambda_calc:<LambdaCalc/>,poisson_grid:<PoissonGrid/>,dc_compare:<DcCompare/>,odds_grid:<OddsGrid/>,btts_calc:<BttsCalc/>,signal_weights:<SignalWeights/>};

function StepPanel({step}){
  return(
    <div style={{animation:"gzPop 0.25s ease",display:"flex",flexDirection:"column",gap:14}}>
      <div>
        <div style={{marginBottom:6}}><span style={tag(step.color)}>{step.tag}</span></div>
        <h2 style={{fontSize:21,fontWeight:900,color:C.text,fontFamily:"'Sora',sans-serif",letterSpacing:"-0.02em",margin:"0 0 6px"}}>{step.title}</h2>
        <div style={{fontSize:12,color:C.muted,fontStyle:"italic"}}>{step.subtitle}</div>
      </div>
      <div style={mono(step.color)}>{step.formula.split("\n").map((l,i)=><div key={i}>{l}</div>)}</div>
      <div style={{fontSize:12,color:C.muted,lineHeight:1.75}}>{step.desc}</div>
      <div style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${step.color}1e`,borderRadius:12,padding:"14px 14px"}}>
        <div style={{fontSize:9,fontWeight:900,color:step.color,letterSpacing:"0.12em",marginBottom:12}}>⚡ INTERACTIVE DEMO</div>
        {INTERACTIVES[step.interactive]}
      </div>
    </div>
  );
}

function PipelineSidebar({active,onSelect}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      <div style={{fontSize:9,fontWeight:900,color:C.soft,letterSpacing:"0.14em",marginBottom:8,padding:"0 4px"}}>PREDICTION PIPELINE</div>
      {STEPS.map((s,i)=>{
        const isA=active===s.id;
        return(
          <div key={s.id} className="gz-step" onClick={()=>onSelect(s.id)} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:9,background:isA?`${s.color}14`:"transparent",border:`1px solid ${isA?s.color+"44":"transparent"}`,boxShadow:isA?`0 0 16px ${s.color}18`:"none"}}>
            <div style={{width:20,height:20,borderRadius:"50%",flexShrink:0,background:isA?s.color:"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:isA?"#000":C.soft,boxShadow:isA?`0 0 8px ${s.color}88`:"none",transition:"all 200ms"}}>{i+1}</div>
            <div style={{fontSize:11.5,fontWeight:700,color:isA?C.text:C.muted,transition:"color 150ms",flex:1}}>{s.label}</div>
            {isA&&<div style={{width:4,height:4,borderRadius:"50%",background:s.color,flexShrink:0}}/>}
          </div>
        );
      })}
    </div>
  );
}

function AccuracySidebar(){
  const m=[{l:"Match Result",v:64,col:C.green},{l:"BTTS",v:71,col:C.blue},{l:"Over 2.5",v:68,col:C.gold},{l:"Correct Score",v:38,col:C.purple}];
  return(
    <div style={{...card(`${C.green}22`),padding:"14px 16px",marginTop:10}}>
      <div style={{fontSize:9,fontWeight:900,color:C.green,letterSpacing:"0.12em",marginBottom:10}}>MODEL ACCURACY</div>
      {m.map(x=>(
        <div key={x.l} style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:10,color:C.muted}}>{x.l}</span>
            <span style={{fontSize:14,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:x.col}}>{x.v}%</span>
          </div>
          <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:2}}>
            <div style={{height:"100%",width:`${x.v}%`,background:x.col,borderRadius:2}}/>
          </div>
        </div>
      ))}
      <div style={{fontSize:10,color:C.soft,marginTop:6,lineHeight:1.6}}>Measured across <b style={{color:C.text}}>15,000+</b> fixtures across EPL, La Liga, Serie A, Ligue 1.</div>
    </div>
  );
}

function QuickGlossary(){
  const terms=[["xG","Shot quality 0–1"],["xA","Assist quality 0–1"],["λ","Expected goals (Poisson)"],["Elo","Dynamic team strength"],["PPDA","Pressing intensity"],["PSxG","Post-shot xG"],["ICT","FPL involvement"],["DC","Dixon-Coles fix"]];
  return(
    <div style={{...card(C.line),padding:"14px 16px"}}>
      <div style={{fontSize:9,fontWeight:900,color:C.blue,letterSpacing:"0.12em",marginBottom:10}}>QUICK GLOSSARY</div>
      {terms.map(([t,d])=>(
        <div key={t} style={{display:"flex",gap:9,marginBottom:7,alignItems:"baseline"}}>
          <span style={{fontSize:11,fontWeight:900,color:C.green,fontFamily:"'JetBrains Mono',monospace",minWidth:40}}>{t}</span>
          <span style={{fontSize:10,color:C.soft}}>{d}</span>
        </div>
      ))}
    </div>
  );
}

function PipelineTab(){
  const[activeStep,setStep]=useState("xg");
  const step=STEPS.find(s=>s.id===activeStep);
  return(
    <div style={{display:"grid",gridTemplateColumns:"190px 1fr 210px",gap:14,alignItems:"start"}}>
      <div>
        <PipelineSidebar active={activeStep} onSelect={setStep}/>
        <AccuracySidebar/>
      </div>
      <div style={{...card(`${step.color}22`),padding:"18px 16px",minHeight:480}}>
        <StepPanel step={step}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <QuickGlossary/>
        <div style={{...card(C.line),padding:"12px 14px"}}>
          <div style={{fontSize:9,fontWeight:900,color:C.soft,letterSpacing:"0.12em",marginBottom:8}}>NEXT STEP</div>
          {(()=>{const idx=STEPS.findIndex(s=>s.id===activeStep);const nxt=STEPS[idx+1];if(!nxt)return<div style={{fontSize:11,color:C.soft}}>Full pipeline explored! ✓</div>;return(<button onClick={()=>setStep(nxt.id)} className="gz-btn" style={{width:"100%",padding:"10px 12px",borderRadius:10,cursor:"pointer",background:`${nxt.color}12`,border:`1px solid ${nxt.color}33`,color:nxt.color,fontSize:11,fontWeight:800,fontFamily:"'Sora',sans-serif",textAlign:"left"}}><div style={{fontSize:8,color:C.soft,marginBottom:3,letterSpacing:"0.1em"}}>{nxt.tag}</div>{nxt.title} →</button>);})()}
        </div>
      </div>
    </div>
  );
}

function Counter2({target,suffix="",dur=1400}){return<Counter target={target} suffix={suffix} dur={dur}/>;}

function Hero(){
  const stats=[{v:3,s:"",l:"PREDICTION MODELS",col:C.text},{v:12,s:"+",l:"STAT SIGNALS",col:C.green},{v:15000,s:"+",l:"HISTORICAL FIXTURES",col:C.gold},{v:64,s:"%",l:"MATCH ACCURACY",col:C.purple},{v:4,s:" leagues",l:"COVERAGE",col:C.blue}];
  return(
    <div style={{padding:"28px 0 22px",borderBottom:`1px solid ${C.line}`}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:24}}>
        <div style={{width:4,height:44,background:C.gold,borderRadius:2,flexShrink:0,marginTop:3}}/>
        <div>
          <h1 style={{fontSize:34,fontWeight:900,color:C.text,fontFamily:"'Sora',sans-serif",letterSpacing:"-0.03em",margin:"0 0 6px",lineHeight:1}}>Ground Zero</h1>
          <div style={{fontSize:13,color:C.muted}}>The algorithms, models and statistics that power every prediction on StatinSite</div>
        </div>
      </div>
      <div style={{display:"flex",gap:0,flexWrap:"wrap"}}>
        {stats.map((s,i)=>(
          <div key={s.l} style={{flex:"1 1 100px",padding:"0 20px 0 0",borderRight:i<stats.length-1?`1px solid ${C.line}`:"none",marginRight:i<stats.length-1?20:0}}>
            <div style={{fontSize:26,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:s.col,lineHeight:1,marginBottom:4}}><Counter target={s.v} suffix={s.s} dur={1200+i*150}/></div>
            <div style={{fontSize:8,fontWeight:900,color:C.soft,letterSpacing:"0.14em"}}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const TABS=[{id:"pipeline",l:"🔬 Pipeline",d:"How predictions are built"},{id:"lab",l:"⚗️ The Lab",d:"Interactive tools"},{id:"glossary",l:"📖 Glossary",d:"Every term explained"},{id:"paths",l:"🎓 Learn",d:"Guided learning paths"}];

// PLACEHOLDER TABS — filled in Part 2 & 3
function LabTab(){return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300,flexDirection:"column",gap:8}}><div style={{fontSize:28}}>⚗️</div><div style={{fontSize:14,color:C.soft}}>The Lab — Part 2</div></div>;}
function GlossaryTab(){return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300,flexDirection:"column",gap:8}}><div style={{fontSize:28}}>📖</div><div style={{fontSize:14,color:C.soft}}>Glossary — Part 3</div></div>;}
function PathsTab(){return<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300,flexDirection:"column",gap:8}}><div style={{fontSize:28}}>🎓</div><div style={{fontSize:14,color:C.soft}}>Learning Paths — Part 3</div></div>;}

export default function GroundZeroPage(){
  const[tab,setTab]=useState("pipeline");
  return(
    <>
      <style>{GZ_CSS}</style>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
        {[[C.gold,.07,"-10%","5%","55s"],[C.blue,.06,"75%","50%","70s"],[C.purple,.05,"45%","-8%","62s"]].map(([col,op,l,t,dur],i)=>(
          <div key={i} style={{position:"absolute",width:600,height:600,borderRadius:"50%",left:l,top:t,background:col,opacity:op,filter:"blur(130px)",animation:`gzOrb ${dur} ease-in-out infinite`,animationDelay:`${i*9}s`}}/>
        ))}
      </div>
      <div style={{position:"relative",zIndex:1,minHeight:"100vh",padding:"0 24px 60px",maxWidth:1200,margin:"0 auto"}}>
        <Hero/>
        <div style={{marginTop:24}}>
          <div style={{display:"flex",gap:0,borderBottom:`1px solid ${C.line}`,marginBottom:22}}>
            {TABS.map(t=>{const isA=tab===t.id;return(
              <button key={t.id} className="gz-tab" onClick={()=>setTab(t.id)} style={{padding:"11px 18px",borderBottom:`2px solid ${isA?C.gold:"transparent"}`,color:isA?C.text:C.soft,fontSize:12,fontWeight:isA?800:600,fontFamily:"'Sora',sans-serif",marginBottom:-1,display:"flex",flexDirection:"column",alignItems:"flex-start",gap:2}}>
                {t.l}
                <span style={{fontSize:8,color:isA?C.muted:C.soft,fontFamily:"'Inter',sans-serif",fontWeight:400}}>{t.d}</span>
              </button>
            );})}
          </div>
          {tab==="pipeline"&&<PipelineTab/>}
          {tab==="lab"&&<LabTab/>}
          {tab==="glossary"&&<GlossaryTab/>}
          {tab==="paths"&&<PathsTab/>}
        </div>
      </div>
    </>
  );
}