// StatsLearnPage.jsx — StatinSite — Full-page dense card grid
// Main 2-col cards + narrow side-column cards — zero empty space
import { useState, useRef, useEffect, useCallback } from "react";

const C = {
  bg:"#060a14", panel:"rgba(10,16,30,0.97)", glass:"rgba(255,255,255,0.025)",
  border:"rgba(255,255,255,0.07)", text:"#e2eeff", muted:"#3a5a7a",
  blue:"#60a5fa", green:"#34d399", red:"#f87171", gold:"#fbbf24",
  purple:"#c084fc", orange:"#fb923c", teal:"#2dd4bf", pink:"#f472b6", cyan:"#22d3ee",
};

// ── Interactive Widgets ────────────────────────────────────────

function PoissonChart(){
  const [lam,setLam]=useState(1.4);
  const f=n=>n<=1?1:n*f(n-1);
  const p=(k,l)=>(Math.pow(l,k)*Math.exp(-l))/f(k);
  const bars=Array.from({length:8},(_,k)=>({k,p:p(k,lam)}));
  const max=Math.max(...bars.map(b=>b.p));
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <span style={{fontSize:10,color:C.muted,fontFamily:"Inter",minWidth:50}}>λ = {lam.toFixed(1)}</span>
        <input type="range" min="0.3" max="4" step="0.1" value={lam} onChange={e=>setLam(+e.target.value)} style={{flex:1,accentColor:C.blue}}/>
      </div>
      <div style={{display:"flex",gap:3,alignItems:"flex-end",height:80}}>
        {bars.map(({k,p:prob})=>(
          <div key={k} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:8,color:C.gold,fontFamily:"JetBrains Mono"}}>{(prob*100).toFixed(0)}%</span>
            <div style={{width:"100%",borderRadius:"2px 2px 0 0",height:Math.max(2,prob/max*64),background:k===Math.round(lam)?C.blue:C.blue+"44",transition:"height .3s ease"}}/>
            <span style={{fontSize:8,color:C.muted,fontFamily:"JetBrains Mono"}}>{k}</span>
          </div>
        ))}
      </div>
      <p style={{fontSize:9,color:C.muted,margin:"6px 0 0",fontFamily:"Inter"}}>Drag λ to see probability distribution shift</p>
    </div>
  );
}

function EloWidget(){
  const [a,setA]=useState(1500);const [b,setB]=useState(1400);const [res,setRes]=useState("A");
  const ea=1/(1+Math.pow(10,(b-a)/400));const sa=res==="A"?1:res==="draw"?0.5:0;
  const na=Math.round(a+32*(sa-ea));const nb=Math.round(b+32*((1-sa)-(1-ea)));
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {[[a,setA,C.blue,"Team A"],[b,setB,C.red,"Team B"]].map(([val,set,col,label])=>(
        <div key={label}>
          <div style={{fontSize:9,color:col,fontFamily:"Inter",marginBottom:2}}>{label}: {val}</div>
          <input type="range" min="1000" max="2200" step="10" value={val} onChange={e=>set(+e.target.value)} style={{width:"100%",accentColor:col}}/>
        </div>
      ))}
      <div style={{display:"flex",gap:4}}>
        {[["A","A wins"],["draw","Draw"],["B","B wins"]].map(([v,label])=>(
          <button key={v} onClick={()=>setRes(v)} style={{flex:1,padding:"5px 0",borderRadius:7,cursor:"pointer",background:res===v?"rgba(96,165,250,0.15)":"rgba(255,255,255,0.03)",border:`1px solid ${res===v?"rgba(96,165,250,0.4)":"rgba(255,255,255,0.07)"}`,color:res===v?C.blue:C.muted,fontSize:9,fontWeight:700,fontFamily:"Inter"}}>{label}</button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:4}}>
        {[["E(A)",(ea*100).toFixed(0)+"%",C.blue],["E(B)",((1-ea)*100).toFixed(0)+"%",C.red],["→A",na,na>a?C.green:C.red],["→B",nb,nb>b?C.green:C.red]].map(([l,v,col])=>(
          <div key={l} style={{padding:"5px 0",borderRadius:7,background:"rgba(255,255,255,0.025)",textAlign:"center"}}>
            <div style={{fontSize:8,color:C.muted,fontFamily:"Inter"}}>{l}</div>
            <div style={{fontSize:13,fontWeight:900,color:col,fontFamily:"JetBrains Mono"}}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function XGHalfPitch(){
  const shots=[{x:72,y:50,xg:.72,label:"Close header"},{x:28,y:42,xg:.07,label:"Long range"},{x:62,y:48,xg:.40,label:"1v1"},{x:50,y:54,xg:.12,label:"Outside box"},{x:58,y:47,xg:.30,label:"Cut-back"},{x:75,y:42,xg:.60,label:"Penalty area"}];
  const [hov,setHov]=useState(null);
  return(
    <div>
      <div style={{position:"relative",width:"100%",paddingBottom:"50%",background:"#14532d",borderRadius:8,overflow:"hidden",marginBottom:6}}>
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} viewBox="0 0 100 50" preserveAspectRatio="none">
          <rect width="100" height="50" fill="#14532d"/>
          <rect x="72" y="18" width="28" height="14" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth=".5"/>
          <rect x="83" y="21" width="17" height="8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth=".4"/>
          <circle cx="0" cy="25" r="12" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth=".4"/>
          <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.06)" strokeWidth=".3"/>
          <rect x="96" y="22" width="4" height="6" fill="rgba(255,255,255,0.4)"/>
        </svg>
        {shots.map((s,i)=>(
          <div key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}
            style={{position:"absolute",left:s.x+"%",top:s.y+"%",transform:"translate(-50%,-50%)",
              width:Math.max(12,s.xg*32),height:Math.max(12,s.xg*32),borderRadius:"50%",cursor:"pointer",
              background:`rgba(${s.xg>.5?"52,211,153":s.xg>.25?"251,191,36":"248,113,113"},${.3+s.xg*.5})`,
              border:`1.5px solid rgba(${s.xg>.5?"52,211,153":s.xg>.25?"251,191,36":"248,113,113"},.9)`,
              boxShadow:`0 0 ${s.xg*16}px rgba(${s.xg>.5?"52,211,153":s.xg>.25?"251,191,36":"248,113,113"},.5)`,
              transition:"all 140ms",
            }}>
            {hov===i&&<div style={{position:"absolute",bottom:"120%",left:"50%",transform:"translateX(-50%)",background:"rgba(4,8,18,.97)",border:"1px solid rgba(255,255,255,.1)",borderRadius:7,padding:"4px 8px",whiteSpace:"nowrap",zIndex:99,pointerEvents:"none"}}>
              <div style={{fontSize:10,fontWeight:700,color:C.text,fontFamily:"Sora"}}>{s.label}</div>
              <div style={{fontSize:11,fontWeight:900,color:s.xg>.5?C.green:s.xg>.25?C.gold:C.red,fontFamily:"JetBrains Mono"}}>xG {s.xg.toFixed(2)}</div>
            </div>}
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8,fontSize:9,fontFamily:"Inter",color:C.muted}}>
        <span style={{color:C.green}}>● High xG (0.5+)</span>
        <span style={{color:C.gold}}>● Medium (0.25–0.5)</span>
        <span style={{color:C.red}}>● Low (&lt;0.25)</span>
      </div>
    </div>
  );
}

function DixonGrid(){
  const [hA,setHA]=useState(1.6);const [aA,setAA]=useState(1.1);
  const f=n=>n<=1?1:n*f(n-1);const p=(k,l)=>(Math.pow(l,k)*Math.exp(-l))/f(k);
  const tau=(x,y,mh,ma)=>{const r=-.13;if(x===0&&y===0)return 1-mh*ma*r;if(x===0&&y===1)return 1+mh*r;if(x===1&&y===0)return 1+ma*r;if(x===1&&y===1)return 1-r;return 1;};
  const grid=Array.from({length:5},(_,h)=>Array.from({length:5},(_,a)=>p(h,hA)*p(a,aA)*tau(h,a,hA,aA)));
  const max=Math.max(...grid.flat());
  return(
    <div>
      <div style={{display:"flex",gap:8,marginBottom:8}}>
        {[["Home λ",hA,setHA,C.blue],["Away λ",aA,setAA,C.red]].map(([l,v,s,col])=>(
          <div key={l} style={{flex:1}}>
            <div style={{fontSize:9,color:C.muted,fontFamily:"Inter",marginBottom:2}}>{l}: {v.toFixed(1)}</div>
            <input type="range" min=".5" max="3.5" step=".1" value={v} onChange={e=>s(+e.target.value)} style={{width:"100%",accentColor:col}}/>
          </div>
        ))}
      </div>
      <table style={{borderCollapse:"collapse",width:"100%",fontSize:9}}>
        <thead><tr><th style={{padding:"2px 4px",color:C.muted,fontFamily:"JetBrains Mono"}}>H\A</th>{[0,1,2,3,4].map(a=><th key={a} style={{padding:"2px 4px",color:C.red,fontFamily:"JetBrains Mono"}}>{a}</th>)}</tr></thead>
        <tbody>{grid.map((row,h)=><tr key={h}><td style={{padding:"2px 4px",color:C.blue,fontFamily:"JetBrains Mono",fontWeight:700}}>{h}</td>{row.map((v,a)=>{const pct=v/max;return<td key={a} style={{padding:"2px 4px",textAlign:"center",background:`rgba(96,165,250,${pct*.55})`,borderRadius:3,fontFamily:"JetBrains Mono",color:pct>.5?"#fff":"#7ab8ff",fontSize:9}}>{(v*100).toFixed(1)}%</td>;})}
        </tr>)}</tbody>
      </table>
    </div>
  );
}

function BTTSWidget(){
  const [hxg,setH]=useState(1.5);const [axg,setA]=useState(1.2);
  const ph=1-Math.exp(-hxg);const pa=1-Math.exp(-axg);const btts=ph*pa;
  const col=btts>.5?C.green:btts>.35?C.gold:C.red;
  return(
    <div>
      {[["Home xG",hxg,setH,C.blue],["Away xG",axg,setA,C.red]].map(([l,v,s,col2])=>(
        <div key={l} style={{marginBottom:8}}>
          <div style={{fontSize:9,color:C.muted,fontFamily:"Inter",marginBottom:2}}>{l}: {v.toFixed(1)}</div>
          <input type="range" min=".2" max="3.5" step=".1" value={v} onChange={e=>s(+e.target.value)} style={{width:"100%",accentColor:col2}}/>
        </div>
      ))}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5}}>
        {[["P(H)",`${(ph*100).toFixed(0)}%`,C.blue],["P(A)",`${(pa*100).toFixed(0)}%`,C.red],["BTTS",`${(btts*100).toFixed(0)}%`,col]].map(([l,v,c])=>(
          <div key={l} style={{padding:"7px 0",borderRadius:7,background:"rgba(255,255,255,0.025)",textAlign:"center"}}>
            <div style={{fontSize:8,color:C.muted,fontFamily:"Inter"}}>{l}</div>
            <div style={{fontSize:15,fontWeight:900,color:c,fontFamily:"JetBrains Mono"}}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PPDASlider(){
  const [v,setV]=useState(8.2);
  const int=v<6?"Elite press":v<8?"High press":v<11?"Mid-press":v<14?"Moderate":"Low/deep block";
  const col=v<6?C.red:v<8?C.orange:v<11?C.gold:v<14?C.muted:"#4a5568";
  const ex=v<6?"Man City 23/24":v<8?"Liverpool":v<11?"Arsenal":v<14?"Chelsea":"Burnley";
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <span style={{fontSize:10,color:C.muted,fontFamily:"Inter",minWidth:64}}>PPDA: {v.toFixed(1)}</span>
        <input type="range" min="3.5" max="18" step=".1" value={v} onChange={e=>setV(+e.target.value)} style={{flex:1,accentColor:col}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        {[["Intensity",int,col],["Comparable",ex,C.muted]].map(([l,vv,c])=>(
          <div key={l} style={{padding:"8px 10px",borderRadius:8,background:"rgba(255,255,255,0.025)"}}>
            <div style={{fontSize:8,color:C.muted,fontFamily:"Inter"}}>{l}</div>
            <div style={{fontSize:12,fontWeight:800,color:c,fontFamily:"Sora"}}>{vv}</div>
          </div>
        ))}
      </div>
      {/* Gauge bar */}
      <div style={{marginTop:8,height:6,borderRadius:3,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
        <div style={{height:"100%",width:`${((18-v)/14.5)*100}%`,background:`linear-gradient(to right,${C.red},${C.gold})`,borderRadius:3,transition:"width .3s"}}/>
      </div>
      <p style={{fontSize:9,color:C.muted,margin:"5px 0 0",fontFamily:"Inter"}}>Lower PPDA = more aggressive pressing in opponent half</p>
    </div>
  );
}

function CompositeWidget(){
  const [pts,setPts]=useState(8.2);const [form,setForm]=useState(2.8);const [ppg,setPpg]=useState(5.1);const [ict,setIct]=useState(42);const [prob,setProb]=useState(.72);
  const raw=pts*.40+form*.35+ppg*.15+(ict/30)*.10;
  const gate=form<1.5?Math.max(form/1.5,.25):1;
  const final=(raw*gate*Math.pow(prob,1.4)).toFixed(2);
  return(
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {[["pts_gw1 ×0.40",pts,setPts,0,20,.1,C.blue,(pts*.4).toFixed(2)],["form ×0.35",form,setForm,0,12,.1,C.green,(form*.35).toFixed(2)],["PPG ×0.15",ppg,setPpg,0,10,.1,C.gold,(ppg*.15).toFixed(2)],["ICT/30 ×0.10",ict,setIct,0,100,1,C.purple,(ict/30*.10).toFixed(2)]].map(([l,val,set,min,max,step,col,contrib])=>(
        <div key={l}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
            <span style={{fontSize:9,color:col,fontFamily:"Inter",fontWeight:700}}>{l} = {contrib}</span>
          </div>
          <div style={{height:3,background:"rgba(255,255,255,.05)",borderRadius:2,marginBottom:4,overflow:"hidden"}}>
            <div style={{width:`${(val/max)*100}%`,height:"100%",background:col,transition:"width .2s"}}/>
          </div>
          <input type="range" min={min} max={max} step={step} value={val} onChange={e=>set(+e.target.value)} style={{width:"100%",accentColor:col}}/>
        </div>
      ))}
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:9,color:C.muted,fontFamily:"Inter",minWidth:56}}>Prob: {prob.toFixed(2)}</span>
        <input type="range" min=".05" max="1" step=".01" value={prob} onChange={e=>setProb(+e.target.value)} style={{flex:1,accentColor:C.orange}}/>
      </div>
      <div style={{padding:"8px 14px",borderRadius:9,background:"rgba(251,191,36,.07)",border:"1px solid rgba(251,191,36,.22)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:10,color:C.muted,fontFamily:"Inter"}}>Final score</span>
        <span style={{fontSize:22,fontWeight:900,color:C.gold,fontFamily:"JetBrains Mono"}}>{final}</span>
      </div>
    </div>
  );
}

function WinProbDonut(){
  const [hp,setHp]=useState(52);const [dp,setDp]=useState(24);const ap=Math.max(0,100-hp-dp);
  const adj=(f,v)=>{const n=Math.min(100,v);if(f==="h")setHp(n);else setDp(Math.min(v,100-hp));};
  // SVG donut
  const total=360;const h=hp/100*total;const d=dp/100*total;const a=ap/100*total;
  const arc=(start,end,col)=>{const r=36,cx=50,cy=50;const s1=((start-90)*Math.PI)/180;const e1=((start+end-90)*Math.PI)/180;const laf=end>180?1:0;return`<path d="M${cx+r*Math.cos(s1)},${cy+r*Math.sin(s1)} A${r},${r},0,${laf},1,${cx+r*Math.cos(e1)},${cy+r*Math.sin(e1)}" fill="none" stroke="${col}" stroke-width="14"/>`};
  return(
    <div>
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:10}}>
        <svg width="80" height="80" viewBox="0 0 100 100" style={{flexShrink:0}} dangerouslySetInnerHTML={{__html:arc(0,h,C.blue)+arc(h,d,"rgba(100,120,140,.7)")+arc(h+d,a,C.red)+`<text x="50" y="46" textAnchor="middle" fontSize="11" fontWeight="900" fill="white" fontFamily="JetBrains Mono">${hp}%</text><text x="50" y="58" textAnchor="middle" fontSize="8" fill="#3a5a7a" fontFamily="Inter">H WIN</text>`}}/>
        <div style={{flex:1}}>
          {[["Home win",hp,v=>adj("h",v),C.blue],["Draw",dp,v=>adj("d",v),"rgba(100,120,140,.8)"]].map(([l,v,s,col])=>(
            <div key={l} style={{marginBottom:6}}>
              <div style={{fontSize:9,color:col,fontFamily:"Inter",fontWeight:700,marginBottom:2}}>{l}: {v}%</div>
              <input type="range" min="0" max="100" step="1" value={v} onChange={e=>s(+e.target.value)} style={{width:"100%",accentColor:col}}/>
            </div>
          ))}
          <div style={{fontSize:9,color:C.red,fontFamily:"Inter"}}>Away win: {ap}%</div>
        </div>
      </div>
    </div>
  );
}

function ICTWidget(){
  const [inf,setInf]=useState(35);const [cre,setCre]=useState(52);const [thr,setThr]=useState(48);
  const ict=((inf*.45)+(cre*.35)+(thr*.20)).toFixed(1);
  return(
    <div>
      {[["Influence",inf,setInf,C.purple,.45],["Creativity",cre,setCre,C.blue,.35],["Threat",thr,setThr,C.orange,.20]].map(([l,v,s,col,w])=>(
        <div key={l} style={{marginBottom:7}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
            <span style={{fontSize:9,color:col,fontFamily:"Inter",fontWeight:700}}>{l} ×{w}</span>
            <span style={{fontSize:9,color:C.muted,fontFamily:"JetBrains Mono"}}>{v}</span>
          </div>
          <div style={{height:4,background:"rgba(255,255,255,.05)",borderRadius:2,overflow:"hidden",marginBottom:3}}>
            <div style={{width:`${v}%`,height:"100%",background:col,transition:"width .2s"}}/>
          </div>
          <input type="range" min="0" max="100" step="1" value={v} onChange={e=>s(+e.target.value)} style={{width:"100%",accentColor:col}}/>
        </div>
      ))}
      <div style={{padding:"7px 12px",borderRadius:8,background:"rgba(192,132,252,.07)",border:"1px solid rgba(192,132,252,.2)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:9,color:C.muted,fontFamily:"Inter"}}>ICT Index</span>
        <span style={{fontSize:20,fontWeight:900,color:C.purple,fontFamily:"JetBrains Mono"}}>{ict}</span>
      </div>
    </div>
  );
}

// ── Animated counter ──────────────────────────────────────────
function AnimNum({to,suffix="",decimals=0}){
  const [v,setV]=useState(0);const ref=useRef();
  useEffect(()=>{const el=ref.current;if(!el)return;const obs=new IntersectionObserver(([e])=>{if(!e.isIntersecting)return;obs.disconnect();let s=null;const tick=(ts)=>{if(!s)s=ts;const p=Math.min((ts-s)/900,1);const ease=1-Math.pow(1-p,3);setV(+(ease*to).toFixed(decimals));if(p<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);},{threshold:.4});obs.observe(el);return()=>obs.disconnect();},[to,decimals]);
  return <span ref={ref}>{v.toFixed(decimals)}{suffix}</span>;
}

// ── Main card sections ────────────────────────────────────────
const MAIN_CARDS = [
  {
    id:"xg", color:C.green, tag:"CORE STAT", wide:true,
    title:"Expected Goals (xG)",
    tldr:"Measures shot quality, not just outcome",
    formula:"xG = f(distance, angle, body_part, assist_type, game_state)",
    body:"xG assigns a probability 0–1 to every shot, trained on 100,000+ historical events. A close-range header might have xG 0.72. A speculative long shot: 0.03. A striker on 15 goals from 9 xG is massively overperforming. xA extends the metric to the pass that created the chance.",
    facts:["Used by StatsBomb, Opta, FBref","Goalkeepers have xGOT (on-target only)","xG overperformance usually reverts to mean"],
    widget: <XGHalfPitch/>,
  },
  {
    id:"poisson", color:C.blue, tag:"ALGORITHM",
    title:"Poisson Distribution",
    tldr:"Models goals as random discrete events",
    formula:"P(k goals) = (λᵏ · e⁻λ) ÷ k!",
    body:"If a team averages λ=1.4 goals, Poisson gives us exact probabilities for 0, 1, 2, 3… goals. We compute team-specific λ from attack vs opponent defence strength, adjusted for home advantage.",
    facts:["Assumes goal independence","λ comes from Elo-adjusted xG","Joint P(H-A) = P(H) × P(A)"],
    widget: <PoissonChart/>,
  },
  {
    id:"elo", color:C.purple, tag:"RATING SYSTEM",
    title:"Elo Rating System",
    tldr:"Dynamic strength ratings updated after every match",
    formula:"E = 1/(1+10^((Eloₒₚₚ−Eloₜₑₐₘ)/400))  ·  ΔElo = K(S−E)",
    body:"Every team starts at 1500. Win and you gain; lose and you drop. Beating a much stronger side = huge gain. Beating a weak side = small gain. K=32 controls sensitivity per match. Our model includes home advantage.",
    facts:["Originally designed for chess (1960)","FiveThirtyEight adapted Elo for soccer","We use K=32; FIFA uses K=50"],
    widget: <EloWidget/>,
  },
  {
    id:"dc", color:C.orange, tag:"CORRECTION",
    title:"Dixon-Coles Correction",
    tldr:"Fixes Poisson's systematic under-prediction of low scores",
    formula:"P_DC(h,a) = P(h) · P(a) · τ(h,a,ρ)  [ρ ≈ −0.13]",
    body:"Pure Poisson underestimates 0-0, 1-0, 0-1, 1-1 by up to 20%. Dixon & Coles (1997) proved this and introduced τ, a correction factor estimated from data. Especially important for tight defensive matches.",
    facts:["Applied Statistics paper, 1997","ρ ≈ −0.13 from historical fitting","Biggest impact on 0-0 and 1-1 scorelines"],
    widget: <DixonGrid/>,
  },
  {
    id:"winprob", color:C.teal, tag:"OUTPUT",
    title:"Win Probability",
    tldr:"Summing the scoreline grid to get 3-way odds",
    formula:"P(H win) = Σ P(h,a) for all h > a  ·  Confidence = |P(H)−P(A)|",
    body:"After building the full scoreline probability matrix, we sum all cells where home > away for home win probability, equal for draw, away > home for away win. The three always sum to 1.0. Confidence score reflects how dominant the favourite is.",
    facts:["Over 2.5 = sum of cells with h+a≥3","BTTS = sum of cells where both h>0,a>0","Our 64% accuracy vs ~50% random baseline"],
    widget: <WinProbDonut/>,
  },
  {
    id:"btts", color:C.pink, tag:"MARKET",
    title:"Both Teams To Score",
    tldr:"Using Poisson to model each team scoring at least once",
    formula:"P(score) = 1 − e⁻λ  ·  BTTS = P(H scores) × P(A scores)",
    body:"From each team's expected goals λ, the probability of scoring at least once is simply 1 minus the probability of scoring zero. Multiply both teams together. Elegant, simple, and highly accurate for betting markets.",
    facts:["BTTS markets are among the most liquid","Our model: 61%+ BTTS accuracy","Correlates with combined xG"],
    widget: <BTTSWidget/>,
  },
  {
    id:"ppda", color:C.red, tag:"PRESSING",
    title:"PPDA — Press Intensity",
    tldr:"Passes allowed per defensive action in opponent's 60%",
    formula:"PPDA = opp. passes in own 60% ÷ defensive actions in that zone",
    body:"Popularised by StatsBomb. Lower PPDA = more aggressive press. Klopp's Liverpool achieved PPDA under 7 in peak years. We use it as a confidence modifier — matches with high pressing teams vs deep-blocks produce predictable outcomes.",
    facts:["StatsBomb metric, ~2014","Correlates strongly with xGA","PPDA < 7 = elite pressing"],
    widget: <PPDASlider/>,
  },
  {
    id:"composite", color:C.gold, tag:"FPL MODEL", wide:true,
    title:"Composite FPL Score & Form Gate",
    tldr:"Our algorithm for ranking FPL players",
    formula:"raw = pts_gw1×0.40 + form×0.35 + PPG×0.15 + ICT/30×0.10  |  final = raw × gate × prob^1.4",
    body:"Four signals combine with weighted importance: next-GW projected points (40% — most forward-looking), recent form (35% — in-form is king), season PPG (15% — baseline quality), ICT index (10% — attacking involvement). The result is then multiplied by a Form Gate and probability raised to 1.4 power, making it non-linear.",
    facts:["Form gate protects against recommending out-of-form players","prob^1.4 makes injury-risk non-linear","Fixture difficulty is baked into pts_gw_1"],
    widget: <CompositeWidget/>,
  },
  {
    id:"ict", color:C.purple, tag:"FPL INDEX",
    title:"ICT Index",
    tldr:"FPL's own multi-signal attacking index",
    formula:"ICT ≈ Influence×0.45 + Creativity×0.35 + Threat×0.20",
    body:"FPL's official composite index. Influence = match impact events. Creativity = chance creation, pre-assists. Threat = shots in box, attacking positions. High ICT but low points usually means volume without efficiency.",
    facts:["Published via FPL API","Dominated by box-to-box midfielders","We weight it at 10% in our model"],
    widget: <ICTWidget/>,
  },
];

// ── Side column cards (narrow, tall, graphic-heavy) ──────────
const SIDE_CARDS = [
  {
    id:"pipeline", color:C.cyan, title:"Prediction Pipeline",
    content: (
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {[["Raw xG data",C.muted],["Elo ratings",C.purple],["Team λ calc",C.blue],["Poisson grid",C.blue],["Dixon-Coles",C.orange],["Scoreline P",C.teal],["3-way odds",C.green],["Confidence",C.gold],["Output",C.red]].map(([l,col],i,arr)=>(
          <div key={l} style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
            <div style={{padding:"6px 12px",borderRadius:7,background:col+"15",border:`1px solid ${col}28`,fontSize:10,fontWeight:700,color:col,fontFamily:"Inter",width:"100%",textAlign:"center"}}>{l}</div>
            {i<arr.length-1&&<div style={{width:1,height:8,background:"rgba(255,255,255,0.12)"}}/>}
          </div>
        ))}
      </div>
    )
  },
  {
    id:"accuracy", color:C.green, title:"Model Accuracy",
    content: (
      <div>
        {[["Match result","64%",C.green],["BTTS","61%",C.blue],["Over 2.5","60%",C.gold],["Correct score","14%",C.purple]].map(([l,v,col])=>(
          <div key={l} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontSize:9,color:C.muted,fontFamily:"Inter"}}>{l}</span>
              <span style={{fontSize:11,fontWeight:900,color:col,fontFamily:"JetBrains Mono"}}>{v}</span>
            </div>
            <div style={{height:5,background:"rgba(255,255,255,.05)",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:v,background:col,borderRadius:3}}/>
            </div>
          </div>
        ))}
        <p style={{fontSize:9,color:C.muted,fontFamily:"Inter",marginTop:10,lineHeight:1.5}}>Benchmarked against 15,000+ historical fixtures across 4 leagues (2015–2025)</p>
      </div>
    )
  },
  {
    id:"formgate", color:C.orange, title:"Form Gate Chart",
    content: (
      <div>
        <svg width="100%" height="100" viewBox="0 0 200 100">
          <defs><linearGradient id="fg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f87171"/><stop offset=".5" stopColor="#fbbf24"/><stop offset="1" stopColor="#34d399"/></linearGradient></defs>
          <path d="M0,80 L50,80 Q80,80 100,40 L200,12" stroke="url(#fg)" strokeWidth="2.5" fill="none"/>
          <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="3 3"/>
          <text x="53" y="94" fontSize="8" fill="#3a5a7a" fontFamily="Inter">form 1.5</text>
          <text x="2" y="94" fontSize="8" fill="#f87171" fontFamily="Inter">gate 0.25</text>
          <text x="160" y="16" fontSize="8" fill="#34d399" fontFamily="Inter">gate 1.0</text>
          <rect x="0" y="0" width="50" height="100" fill="rgba(248,113,113,0.05)"/>
        </svg>
        <p style={{fontSize:9,color:C.muted,fontFamily:"Inter",marginTop:6,lineHeight:1.5}}>Below form 1.5: gate = max(form/1.5, 0.25). Above: gate = 1.0 (no penalty).</p>
        <div style={{display:"flex",gap:5,marginTop:8}}>
          {[["form 0.5","gate 0.33",C.red],["form 1.0","gate 0.67",C.gold],["form 2.0","gate 1.0",C.green]].map(([f,g,col])=>(
            <div key={f} style={{flex:1,padding:"5px 4px",borderRadius:6,background:col+"12",border:`1px solid ${col}25`,textAlign:"center"}}>
              <div style={{fontSize:8,color:col,fontFamily:"JetBrains Mono",fontWeight:700}}>{f}</div>
              <div style={{fontSize:8,color:C.muted,fontFamily:"Inter"}}>{g}</div>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id:"signals", color:C.blue, title:"Signal Weights",
    content: (
      <div>
        {[["Projected pts","40%","Most forward-looking signal",C.blue],["Recent form","35%","Rolling 30-day performance",C.green],["Season PPG","15%","Baseline quality indicator",C.gold],["ICT Index","10%","Attack involvement proxy",C.purple]].map(([l,v,desc,col])=>(
          <div key={l} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
              <span style={{fontSize:10,fontWeight:700,color:col,fontFamily:"Inter"}}>{l}</span>
              <span style={{fontSize:13,fontWeight:900,color:col,fontFamily:"JetBrains Mono"}}>{v}</span>
            </div>
            <div style={{height:3,background:"rgba(255,255,255,.04)",borderRadius:2,margin:"3px 0 2px",overflow:"hidden"}}>
              <div style={{width:v,height:"100%",background:col}}/>
            </div>
            <span style={{fontSize:8,color:C.muted,fontFamily:"Inter"}}>{desc}</span>
          </div>
        ))}
      </div>
    )
  },
  {
    id:"glossary", color:C.teal, title:"Quick Glossary",
    content: (
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        {[["xG","Shot quality 0–1"],["xA","Assist quality 0–1"],["Elo","Dynamic team strength"],["PPDA","Pressing intensity"],["PPG","Points per game"],["ICT","FPL involvement index"],["τ (tau)","DC low-score fix"],["λ","Mean goals/game"],["BTTS","Both teams score"],["K-factor","Elo sensitivity"],["xGOT","On-target xG"],["Conf.","Model certainty %"]].map(([t,d])=>(
          <div key={t} style={{display:"flex",gap:8,alignItems:"baseline",padding:"4px 6px",borderRadius:5,background:"rgba(255,255,255,0.02)"}}>
            <code style={{fontSize:9,fontWeight:900,color:C.teal,fontFamily:"JetBrains Mono",flexShrink:0,minWidth:44}}>{t}</code>
            <span style={{fontSize:9,color:C.muted,fontFamily:"Inter",lineHeight:1.4}}>{d}</span>
          </div>
        ))}
      </div>
    )
  },
  {
    id:"leagues", color:C.gold, title:"Data Coverage",
    content: (
      <div>
        {[["Premier League","380 fixtures/season",C.blue],["La Liga","380 fixtures/season",C.orange],["Serie A","380 fixtures/season",C.green],["Ligue 1","306 fixtures/season",C.purple]].map(([l,d,col])=>(
          <div key={l} style={{marginBottom:8,padding:"7px 10px",borderRadius:8,background:"rgba(255,255,255,0.025)",border:`1px solid ${col}20`}}>
            <div style={{fontSize:10,fontWeight:700,color:col,fontFamily:"Inter",marginBottom:1}}>{l}</div>
            <div style={{fontSize:9,color:C.muted,fontFamily:"Inter"}}>{d}</div>
          </div>
        ))}
        <div style={{padding:"6px 10px",borderRadius:8,background:"rgba(251,191,36,.07)",border:"1px solid rgba(251,191,36,.2)",marginTop:6}}>
          <div style={{fontSize:9,fontWeight:700,color:C.gold,fontFamily:"Inter"}}>10 seasons of data</div>
          <div style={{fontSize:9,color:C.muted,fontFamily:"Inter"}}>15,000+ historical matches</div>
        </div>
      </div>
    )
  },
];

// ── Section card ──────────────────────────────────────────────
function MainCard({ card }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      background: C.panel,
      border: `1.5px solid ${open ? card.color+"45" : C.border}`,
      borderRadius: 16, overflow: "hidden",
      transition: "border-color 180ms",
      gridColumn: card.wide ? "span 2" : "span 1",
    }}>
      {/* Header — always visible */}
      <div onClick={()=>setOpen(v=>!v)} style={{
        padding: "16px 18px", cursor: "pointer",
        background: `linear-gradient(135deg,${card.color}0e,rgba(0,0,0,0))`,
        borderBottom: open ? `1px solid ${card.color}1a` : "none",
      }}>
        <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
              <span style={{fontSize:8,fontWeight:900,padding:"2px 7px",borderRadius:4,background:card.color+"20",color:card.color,fontFamily:"Inter",letterSpacing:".08em"}}>{card.tag}</span>
              <h3 style={{fontSize:15,fontWeight:800,color:C.text,margin:0,fontFamily:"Sora"}}>{card.title}</h3>
            </div>
            <p style={{fontSize:11,color:"#7ab8ff",margin:"0 0 8px",fontFamily:"Inter",fontStyle:"italic"}}>{card.tldr}</p>
            <code style={{fontSize:10,color:card.color,fontFamily:"JetBrains Mono",display:"block",background:card.color+"0c",padding:"6px 10px",borderRadius:7,lineHeight:1.6,wordBreak:"break-all"}}>{card.formula}</code>
          </div>
          <div style={{fontSize:14,color:open?card.color:C.muted,transform:open?"rotate(180deg)":"none",transition:"all 200ms",marginTop:2}}>▾</div>
        </div>
      </div>
      {/* Expanded content */}
      {open && (
        <div style={{padding:"16px 18px",display:"grid",gridTemplateColumns:card.wide?"1fr 1fr":"1fr",gap:18}}>
          <div>
            <p style={{fontSize:12,color:"#b8ccde",lineHeight:1.75,fontFamily:"Inter",margin:"0 0 14px"}}>{card.body}</p>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {card.facts.map((f,i)=>(
                <div key={i} style={{display:"flex",gap:8,padding:"5px 9px",borderRadius:7,background:C.glass}}>
                  <div style={{width:5,height:5,borderRadius:"50%",background:card.color,flexShrink:0,marginTop:5}}/>
                  <span style={{fontSize:11,color:C.muted,fontFamily:"Inter",lineHeight:1.5}}>{f}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{background:C.glass,borderRadius:10,padding:"14px"}}>
            <div style={{fontSize:8,fontWeight:900,color:C.muted,letterSpacing:".1em",fontFamily:"Inter",marginBottom:12}}>INTERACTIVE DEMO</div>
            {card.widget}
          </div>
        </div>
      )}
    </div>
  );
}

function SideCard({ card }) {
  return (
    <div style={{
      background: C.panel,
      border: `1.5px solid rgba(255,255,255,0.07)`,
      borderTop: `3px solid ${card.color}`,
      borderRadius: 14, padding: "14px",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2}}>
        <div style={{width:3,height:16,borderRadius:2,background:card.color,boxShadow:`0 0 6px ${card.color}66`}}/>
        <h4 style={{fontSize:12,fontWeight:800,color:C.text,margin:0,fontFamily:"Sora"}}>{card.title}</h4>
      </div>
      {card.content}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function StatsLearnPage() {
  return (
    <div style={{maxWidth:1440,margin:"0 auto",padding:"28px 24px 80px"}}>
      {/* Header */}
      <div style={{marginBottom:24}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:8}}>
          <div style={{width:5,height:40,borderRadius:3,background:`linear-gradient(to bottom,${C.gold},${C.orange})`,boxShadow:`0 0 14px ${C.gold}66`}}/>
          <div>
            <h1 style={{fontSize:30,fontWeight:900,color:"#f1f5ff",margin:0,fontFamily:"Sora",letterSpacing:"-0.03em"}}>Stats Academy</h1>
            <p style={{fontSize:12,color:C.muted,margin:0,fontFamily:"Inter",marginTop:2}}>The algorithms, models and statistics that power every prediction on StatinSite</p>
          </div>
        </div>
        {/* Stat tiles */}
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:16}}>
          {[{to:3,suf:"",label:"Prediction models",col:C.blue},{to:12,suf:"+",label:"Stat signals",col:C.green},{to:15000,suf:"+",label:"Historical fixtures",col:C.gold},{to:64,suf:"%",label:"Match accuracy",col:C.purple},{to:4,suf:" leagues",label:"Coverage",col:C.orange}].map(({to,suf,label,col})=>(
            <div key={label} style={{flex:"1 1 110px",padding:"12px 14px",borderRadius:12,background:C.glass,border:C.border}}>
              <div style={{fontSize:22,fontWeight:900,color:col,fontFamily:"JetBrains Mono",lineHeight:1}}><AnimNum to={to} suffix={suf}/></div>
              <div style={{fontSize:9,color:C.muted,fontFamily:"Inter",letterSpacing:".06em",marginTop:3,textTransform:"uppercase"}}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Full layout: left side col + main + right side col */}
      <div style={{display:"grid",gridTemplateColumns:"210px 1fr 210px",gap:14,alignItems:"start"}}>

        {/* LEFT side column */}
        <div style={{display:"flex",flexDirection:"column",gap:12,position:"sticky",top:74}}>
          {SIDE_CARDS.slice(0,3).map(card=><SideCard key={card.id} card={card}/>)}
        </div>

        {/* Main content area */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {MAIN_CARDS.map(card=><MainCard key={card.id} card={card}/>)}
        </div>

        {/* RIGHT side column */}
        <div style={{display:"flex",flexDirection:"column",gap:12,position:"sticky",top:74}}>
          {SIDE_CARDS.slice(3).map(card=><SideCard key={card.id} card={card}/>)}
        </div>

      </div>
    </div>
  );
}