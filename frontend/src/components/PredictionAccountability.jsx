// components/PredictionAccountability.jsx
// Displays model performance stats, confidence brackets, and prediction history.
// Drop into any page with: <PredictionAccountability />
// or as a full page wrapped in the page shell.

import { useState, useEffect } from "react";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "https://football-stats-lw4b.onrender.com";

const C = {
  bg:"#000810", card:"rgba(9,15,28,0.98)", border:"rgba(255,255,255,0.065)",
  text:"#f0f6ff", muted:"#5a7a9a", dim:"#1a3a5a", soft:"#c8d8f0",
  blue:"#38bdf8", green:"#34d399", amber:"#f59e0b", red:"#f87171",
};

const LEAGUES = [
  {key:"",label:"All Leagues"},
  {key:"Premier League",label:"Premier League"},
  {key:"La Liga",label:"La Liga"},
  {key:"Serie A",label:"Serie A"},
  {key:"Bundesliga",label:"Bundesliga"},
  {key:"Ligue 1",label:"Ligue 1"},
];

function Sk({h=32,r=8}){
  return <div style={{height:h,borderRadius:r,background:"linear-gradient(90deg,rgba(255,255,255,0.022) 0%,rgba(255,255,255,0.05) 50%,rgba(255,255,255,0.022) 100%)",backgroundSize:"400% 100%",animation:"shimmer 1.5s ease-in-out infinite",marginBottom:8}}/>;
}

function AccuracyRing({pct}){
  const r=36, sw=6, cx=44, cy=44, W=88;
  const span=2*Math.PI*r, fill=(pct/100)*span;
  const color = pct>=65?C.green:pct>=50?C.amber:C.red;
  return(
    <svg width={W} height={W} viewBox={`0 0 ${W} ${W}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw}/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${fill} ${span}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{transition:"stroke-dasharray 0.8s cubic-bezier(.22,1,.36,1)",filter:`drop-shadow(0 0 6px ${color}80)`}}/>
      <text x={cx} y={cy-4} textAnchor="middle" fontSize="16" fontWeight="900"
        fill={color} fontFamily="'JetBrains Mono',monospace">{pct}%</text>
      <text x={cx} y={cy+12} textAnchor="middle" fontSize="8" fontWeight="800"
        fill={C.dim} fontFamily="'Inter',sans-serif" letterSpacing="0.08em">ACCURACY</text>
    </svg>
  );
}

function StatCard({label,value,sub,color=C.blue,icon}){
  return(
    <div style={{borderRadius:14,background:C.card,border:`1px solid ${C.border}`,
      padding:"14px 16px",display:"flex",flexDirection:"column",gap:6}}>
      <div style={{fontSize:9,fontWeight:900,color:C.dim,letterSpacing:"0.12em",textTransform:"uppercase",fontFamily:"'Inter',sans-serif"}}>{icon} {label}</div>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,fontWeight:900,color,lineHeight:1}}>{value??"\u2014"}</div>
      {sub&&<div style={{fontFamily:"'Inter',sans-serif",fontSize:10,color:C.muted}}>{sub}</div>}
    </div>
  );
}

function ConfidenceBar({bracket,count,correct,accuracy}){
  const color = accuracy>=65?C.green:accuracy>=50?C.amber:C.red;
  const pct = Math.min(100,accuracy);
  return(
    <div style={{padding:"10px 0",borderBottom:`1px solid rgba(255,255,255,0.04)`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
        <span style={{fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:700,color:C.soft}}>{bracket}</span>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontFamily:"'Inter',sans-serif",fontSize:10,color:C.muted}}>{correct}/{count}</span>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:900,color}}>{accuracy}%</span>
        </div>
      </div>
      <div style={{height:4,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
        <div style={{width:pct+"%",height:"100%",background:color,borderRadius:999,
          transition:"width 0.7s cubic-bezier(.22,1,.36,1)"}}/>
      </div>
    </div>
  );
}

function OutcomeRow({label,correct,total,color}){
  const pct=total>0?Math.round(correct/total*100):0;
  return(
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:C.muted,width:70,flexShrink:0}}>{label}</span>
      <div style={{flex:1,height:5,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
        <div style={{width:pct+"%",height:"100%",background:color,borderRadius:999,transition:"width 0.6s cubic-bezier(.22,1,.36,1)"}}/>
      </div>
      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:900,color,width:36,textAlign:"right",flexShrink:0}}>{pct}%</span>
    </div>
  );
}

function PredictionRow({p}){
  const sym   = p.symbol || "⏳";
  const isOk  = sym === "✓";
  const isPend= sym === "⏳";
  const symColor = isPend?C.muted:isOk?C.green:C.red;
  const bg = isPend?"transparent":isOk?"rgba(52,211,153,0.04)":"rgba(248,113,113,0.04)";
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:12,
      background:bg,border:`1px solid rgba(255,255,255,0.04)`,marginBottom:5}}>
      {/* Symbol */}
      <div style={{width:24,height:24,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",
        justifyContent:"center",background:`${symColor}12`,border:`1px solid ${symColor}30`,
        fontSize:11,fontWeight:900,color:symColor}}>{sym}</div>
      {/* Match */}
      <div style={{flex:1,minWidth:0}}>
        <p style={{fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:700,color:C.soft,
          margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {p.home_team} vs {p.away_team}
        </p>
        <div style={{display:"flex",gap:6,marginTop:2,flexWrap:"wrap"}}>
          <span style={{fontFamily:"'Inter',sans-serif",fontSize:9,color:C.dim}}>{p.league}</span>
          {p.fixture_date&&<span style={{fontFamily:"'Inter',sans-serif",fontSize:9,color:C.dim}}>· {p.fixture_date.slice(0,10)}</span>}
        </div>
      </div>
      {/* Prediction */}
      <div style={{textAlign:"right",flexShrink:0}}>
        <div style={{display:"flex",gap:6,alignItems:"center",justifyContent:"flex-end",marginBottom:2}}>
          <span style={{fontFamily:"'Inter',sans-serif",fontSize:9,color:C.dim}}>Predicted:</span>
          <span style={{fontSize:8,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",
            color:C.blue,background:`${C.blue}12`,border:`1px solid ${C.blue}22`,borderRadius:4,
            padding:"1px 5px"}}>{p.predicted_outcome}</span>
        </div>
        {!isPend&&(
          <div style={{display:"flex",gap:6,alignItems:"center",justifyContent:"flex-end"}}>
            <span style={{fontFamily:"'Inter',sans-serif",fontSize:9,color:C.dim}}>Result:</span>
            <span style={{fontSize:8,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",
              color:symColor,background:`${symColor}12`,border:`1px solid ${symColor}22`,borderRadius:4,
              padding:"1px 5px"}}>{p.actual_outcome} ({p.score})</span>
          </div>
        )}
        {isPend&&<span style={{fontFamily:"'Inter',sans-serif",fontSize:9,color:C.muted}}>Awaiting result</span>}
      </div>
      {/* Confidence */}
      <div style={{textAlign:"center",flexShrink:0,minWidth:40}}>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:900,
          color:p.confidence>=70?C.green:p.confidence>=50?C.amber:C.red}}>{p.confidence}</div>
        <div style={{fontSize:7,fontWeight:800,color:C.dim,letterSpacing:"0.1em",textTransform:"uppercase"}}>CONF</div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function PredictionAccountability({compact=false}){
  const[perf,setPerf]=useState(null);
  const[history,setHistory]=useState([]);
  const[league,setLeague]=useState("");
  const[loading,setLoading]=useState(true);
  const[tab,setTab]=useState("performance");

  useEffect(()=>{
    setLoading(true);
    const lp = league?"&league="+encodeURIComponent(league):"";
    Promise.all([
      fetch(BACKEND+"/api/predictions/performance?window=50"+lp).then(r=>r.json()).catch(()=>null),
      fetch(BACKEND+"/api/predictions/history?limit=30"+lp).then(r=>r.json()).catch(()=>null),
    ]).then(([p,h])=>{
      setPerf(p);
      setHistory(h?.history||[]);
      setLoading(false);
    });
  },[league]);

  return(
    <div style={{fontFamily:"'Sora',sans-serif"}}>
      <style>{"@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}"}</style>

      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",
        flexWrap:"wrap",gap:12,marginBottom:20}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:3,height:36,borderRadius:2,background:`linear-gradient(180deg,${C.blue},transparent)`,flexShrink:0}}/>
          <div>
            <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:900,color:C.text,
              margin:0,letterSpacing:"-0.02em"}}>Model Performance</h2>
            <p style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:C.dim,margin:"2px 0 0",fontWeight:600}}>
              Prediction accuracy · Confidence calibration · Historical results
            </p>
          </div>
        </div>
        {/* League filter */}
        <select value={league} onChange={e=>setLeague(e.target.value)}
          style={{padding:"7px 12px",borderRadius:10,background:"rgba(255,255,255,0.04)",
            border:"1px solid rgba(255,255,255,0.08)",color:C.muted,fontSize:12,
            fontFamily:"'Inter',sans-serif",cursor:"pointer",outline:"none"}}>
          {LEAGUES.map(l=><option key={l.key} value={l.key} style={{background:"#0a1020"}}>{l.label}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:5,marginBottom:20}}>
        {[{key:"performance",label:"Performance"},{key:"history",label:"Prediction History"}].map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{padding:"7px 14px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:800,
              fontFamily:"'Inter',sans-serif",transition:"all .15s",
              border:tab===t.key?`1.5px solid ${C.blue}50`:"1.5px solid rgba(255,255,255,0.07)",
              background:tab===t.key?`${C.blue}12`:"rgba(255,255,255,0.025)",
              color:tab===t.key?C.blue:C.muted}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading&&<div style={{display:"flex",flexDirection:"column",gap:8}}>{[1,2,3,4].map(i=><Sk key={i} h={48}/>)}</div>}

      {/* Performance tab */}
      {!loading&&tab==="performance"&&(
        <div>
          {!perf||perf.assessed===0?(
            <div style={{padding:"40px 20px",textAlign:"center",borderRadius:16,
              background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.05)"}}>
              <div style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:6}}>No verified predictions yet</div>
              <div style={{fontSize:11,color:C.dim,fontFamily:"'Inter',sans-serif",maxWidth:320,margin:"0 auto"}}>
                Predictions are verified automatically after matches finish. Visit the Predictions page to generate forecasts.
              </div>
            </div>
          ):(
            <div>
              {/* Top stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:20}}>
                <div style={{borderRadius:14,background:C.card,border:`1px solid ${C.border}`,
                  padding:"16px",display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
                  <AccuracyRing pct={perf.accuracy}/>
                  <div style={{fontFamily:"'Inter',sans-serif",fontSize:10,color:C.muted,fontWeight:700,textAlign:"center"}}>
                    {perf.correct} correct from {perf.assessed} predictions
                  </div>
                </div>
                <StatCard label="Predictions Assessed" value={perf.assessed}
                  sub={`Last ${perf.window} verified`} color={C.blue} icon="📊"/>
                <StatCard label="Avg xG Error" value={perf.avg_xg_error??"\u2014"}
                  sub="Lower is better" color={C.amber} icon="⚽"/>
                <StatCard label="Correct Outcomes" value={perf.correct}
                  sub={`${100-perf.accuracy}% incorrect`} color={C.green} icon="✓"/>
              </div>

              {/* Outcome accuracy */}
              {perf.outcome_accuracy&&(
                <div style={{borderRadius:14,background:C.card,border:`1px solid ${C.border}`,padding:"16px",marginBottom:12}}>
                  <div style={{fontSize:9,fontWeight:900,color:C.dim,letterSpacing:"0.12em",textTransform:"uppercase",
                    fontFamily:"'Inter',sans-serif",marginBottom:12}}>Accuracy by Outcome</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    <OutcomeRow label="Home Win" correct={perf.outcome_accuracy.home||0}
                      total={perf.outcome_counts?.home||0} color={C.blue}/>
                    <OutcomeRow label="Draw" correct={perf.outcome_accuracy.draw||0}
                      total={perf.outcome_counts?.draw||0} color={C.amber}/>
                    <OutcomeRow label="Away Win" correct={perf.outcome_accuracy.away||0}
                      total={perf.outcome_counts?.away||0} color={C.green}/>
                  </div>
                </div>
              )}

              {/* Confidence brackets */}
              {perf.confidence_breakdown?.length>0&&(
                <div style={{borderRadius:14,background:C.card,border:`1px solid ${C.border}`,padding:"16px"}}>
                  <div style={{fontSize:9,fontWeight:900,color:C.dim,letterSpacing:"0.12em",textTransform:"uppercase",
                    fontFamily:"'Inter',sans-serif",marginBottom:12}}>Confidence vs Accuracy</div>
                  <div style={{fontFamily:"'Inter',sans-serif",fontSize:10,color:C.muted,marginBottom:12}}>
                    Well-calibrated models show higher accuracy for higher confidence predictions.
                  </div>
                  {perf.confidence_breakdown.map(b=>(
                    <ConfidenceBar key={b.bracket} bracket={b.bracket}
                      count={b.count} correct={b.correct} accuracy={b.accuracy}/>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {!loading&&tab==="history"&&(
        <div>
          {history.length===0?(
            <div style={{padding:"40px 20px",textAlign:"center",borderRadius:16,
              background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.05)"}}>
              <div style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:6}}>No predictions logged yet</div>
              <div style={{fontSize:11,color:C.dim,fontFamily:"'Inter',sans-serif"}}>
                Predictions are recorded when you visit the Predictions page.
              </div>
            </div>
          ):(
            <div>
              <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:14}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.dim,fontWeight:700}}>
                  {history.length} predictions
                </span>
                <span style={{fontFamily:"'Inter',sans-serif",fontSize:10,color:C.muted}}>
                  · {history.filter(p=>p.symbol==="✓").length} correct
                  · {history.filter(p=>p.symbol==="✗").length} incorrect
                  · {history.filter(p=>p.symbol==="⏳").length} pending
                </span>
              </div>
              {history.map((p,i)=><PredictionRow key={p.fixture_id||i} p={p}/>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}