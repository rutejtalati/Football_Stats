// CaptaincyPage.jsx  — /captaincy
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
const API = import.meta?.env?.VITE_API_URL ?? "";
const C = { bg:"#060a14",panel:"rgba(12,18,30,0.95)",blue:"#4f9eff",green:"#00e09e",gold:"#f2c94c",red:"#ff4d6d",purple:"#b388ff",orange:"#ff8c42",teal:"#2dd4bf",pink:"#f472b6",line:"rgba(255,255,255,0.07)",text:"#e8f0ff",muted:"#4a6a8a",soft:"#2a3f58" };
const CSS=`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}.cap-card{transition:all 200ms cubic-bezier(0.22,1,0.36,1)}.cap-card:hover{transform:translateY(-4px)}.cap-btn{transition:all 150ms ease;cursor:pointer}.cap-btn:hover{filter:brightness(1.2)}.skel{background:linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.03) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:8px}`;
const FDR={1:"#00e09e",2:"#a8e063",3:"#f2c94c",4:"#ff8c42",5:"#ff4d6d"};
const POS={GK:"#f2c94c",DEF:"#4f9eff",MID:"#00e09e",FWD:"#ff4d6d"};
const Sk=({w="100%",h=16})=><div className="skel" style={{width:w,height:h}}/>;

function CaptainCard({pick,rank}){
  const [hov,setHov]=useState(false);
  const pc=POS[pick.position]||C.blue;
  const rc=rank<=3?["#f2c94c","#c0c0c0","#cd7f32"][rank-1]:C.muted;
  return(
    <Link to={`/player/${pick.player_id}`} style={{textDecoration:"none"}}>
      <div className="cap-card" onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{background:hov?`linear-gradient(135deg,rgba(12,18,30,0.98),${pc}10)`:"rgba(255,255,255,0.02)",border:`1px solid ${hov?pc+"44":C.line}`,borderRadius:16,padding:"16px 18px",position:"relative",overflow:"hidden",boxShadow:hov?`0 12px 32px ${pc}18`:"none"}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${pc}${hov?"88":"33"},transparent)`}}/>
        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          <div style={{width:36,height:36,borderRadius:"50%",flexShrink:0,background:`${rc}18`,border:`2px solid ${rc}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:rc,fontFamily:"'JetBrains Mono',monospace"}}>{rank}</div>
          {pick.photo?<img src={pick.photo} alt="" style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",border:`2px solid ${pc}44`,flexShrink:0}} onError={e=>e.target.style.display="none"}/>:<div style={{width:44,height:44,borderRadius:"50%",background:`${pc}20`,border:`2px solid ${pc}33`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👤</div>}
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
              <span style={{fontSize:15,fontWeight:800,color:C.text,fontFamily:"'Sora',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pick.name}</span>
              <span style={{fontSize:9,fontWeight:800,color:pc,background:`${pc}18`,border:`1px solid ${pc}33`,padding:"2px 6px",borderRadius:999}}>{pick.position}</span>
              {pick.differential&&<span style={{fontSize:9,fontWeight:800,color:C.teal,background:`${C.teal}14`,border:`1px solid ${C.teal}33`,padding:"2px 6px",borderRadius:999}}>DIFF</span>}
              {pick.home_fixture&&<span style={{fontSize:9,fontWeight:800,color:C.green,background:`${C.green}14`,border:`1px solid ${C.green}33`,padding:"2px 6px",borderRadius:999}}>HOME</span>}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:10,color:C.muted}}>{pick.team}</span>
              <span style={{fontSize:10,color:C.soft}}>£{pick.cost}m</span>
              <span style={{fontSize:10,color:C.muted}}>{pick.ownership}% owned</span>
              <span style={{fontSize:10,fontWeight:800,color:FDR[pick.fixture_difficulty]||C.gold,background:`${FDR[pick.fixture_difficulty]||C.gold}18`,padding:"2px 7px",borderRadius:999,border:`1px solid ${FDR[pick.fixture_difficulty]||C.gold}40`,fontFamily:"'JetBrains Mono',monospace"}}>{pick.next_opp||"TBD"}</span>
            </div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:26,fontWeight:900,color:pc,lineHeight:1,fontFamily:"'JetBrains Mono',monospace",textShadow:hov?`0 0 18px ${pc}88`:`0 0 10px ${pc}44`}}>{pick.captain_score.toFixed(1)}</div>
            <div style={{fontSize:8,color:C.muted,letterSpacing:"0.08em"}}>CAP SCORE</div>
            <div style={{fontSize:11,fontWeight:700,color:C.soft,marginTop:2}}>EP {pick.ep_next.toFixed(2)}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:16,marginTop:12,paddingTop:10,borderTop:`1px solid ${C.line}`,flexWrap:"wrap"}}>
          {[["Form",pick.form,C.green],["Min Sec",(pick.minutes_security*100).toFixed(0)+"%",C.blue],["FDR Run",pick.fixture_run_score+"/10",FDR[pick.fixture_difficulty]||C.gold],["Net Xfers",pick.transfer_momentum>0?"+"+pick.transfer_momentum.toLocaleString():pick.transfer_momentum.toLocaleString(),pick.transfer_momentum>0?C.green:C.red]].map(([l,v,col])=>(
            <div key={l} style={{display:"flex",flexDirection:"column",gap:2}}>
              <span style={{fontSize:8,color:C.muted,letterSpacing:"0.1em"}}>{l}</span>
              <span style={{fontSize:12,fontWeight:800,color:col,fontFamily:"'JetBrains Mono',monospace"}}>{v}</span>
            </div>
          ))}
          {pick.news&&<div style={{flex:1,fontSize:9,color:C.orange,background:`${C.orange}10`,border:`1px solid ${C.orange}25`,padding:"3px 8px",borderRadius:6,alignSelf:"center"}}>⚠ {pick.news}</div>}
        </div>
      </div>
    </Link>
  );
}

export default function CaptaincyPage(){
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [budget,setBudget]=useState(15.5);
  const [filter,setFilter]=useState("ALL");
  useEffect(()=>{
    setLoading(true);
    fetch(`${API}/api/fpl/captaincy?budget=${budget}&top_n=20`)
      .then(r=>r.ok?r.json():null).then(d=>{setData(d);setLoading(false);}).catch(()=>setLoading(false));
  },[budget]);
  const picks=(data?.picks||[]).filter(p=>filter==="DIFF"?p.differential:filter==="HOME"?p.home_fixture:true);
  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Inter',sans-serif"}}>
      <style>{CSS}</style>
      <div style={{padding:"32px 24px 24px",maxWidth:900,margin:"0 auto",animation:"fadeUp 500ms ease both"}}>
        <Link to="/gameweek-insights" style={{color:C.muted,textDecoration:"none",fontSize:12,display:"block",marginBottom:12}}>← GW Insights</Link>
        <div style={{fontSize:9,fontWeight:800,color:C.gold,letterSpacing:"0.15em",marginBottom:6}}>FPL CAPTAIN TOOL</div>
        <h1 style={{fontSize:"clamp(24px,4vw,38px)",fontWeight:900,margin:"0 0 8px",fontFamily:"'Sora',sans-serif",background:`linear-gradient(135deg,${C.gold},${C.orange})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Captain Picker</h1>
        <p style={{fontSize:13,color:C.muted,margin:0,lineHeight:1.6}}>Ranked by captain score — EP×2 adjusted for fixture difficulty and ownership differential.{data?.current_gw&&` GW${data.current_gw}.`}</p>
      </div>
      <div style={{maxWidth:900,margin:"0 auto",padding:"0 24px 20px"}}>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",background:"rgba(255,255,255,0.02)",border:`1px solid ${C.line}`,borderRadius:14,padding:"14px 18px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,color:C.muted,fontWeight:700}}>MAX COST</span>
            <select value={budget} onChange={e=>setBudget(+e.target.value)} style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${C.line}`,color:C.text,padding:"4px 10px",borderRadius:8,fontSize:12,cursor:"pointer"}}>
              {[6.5,7.5,8.5,9.5,10.5,11.5,12.5,13.5,14.5,15.5].map(v=><option key={v} value={v}>£{v}m</option>)}
            </select>
          </div>
          <div style={{display:"flex",gap:6}}>
            {[["ALL","All"],["DIFF","Differentials"],["HOME","Home only"]].map(([val,label])=>(
              <button key={val} className="cap-btn" onClick={()=>setFilter(val)} style={{padding:"4px 12px",borderRadius:999,fontSize:10,fontWeight:700,background:filter===val?`${C.gold}22`:"rgba(255,255,255,0.04)",border:`1px solid ${filter===val?C.gold+"55":C.line}`,color:filter===val?C.gold:C.muted,cursor:"pointer"}}>{label}</button>
            ))}
          </div>
          <div style={{marginLeft:"auto",fontSize:10,color:C.muted}}>{picks.length} picks</div>
        </div>
      </div>
      <div style={{maxWidth:900,margin:"0 auto",padding:"0 24px 80px"}}>
        {loading&&<div style={{display:"flex",flexDirection:"column",gap:10}}>{Array.from({length:8}).map((_,i)=><div key={i} style={{borderRadius:16,border:`1px solid ${C.line}`,padding:"20px 18px"}}><Sk h={18} w="60%"/><div style={{marginTop:10}}><Sk h={12} w="80%"/></div></div>)}</div>}
        {!loading&&picks.length===0&&<div style={{textAlign:"center",color:C.muted,padding:60}}>No picks match your filters.</div>}
        {!loading&&<div style={{display:"flex",flexDirection:"column",gap:10}}>{picks.map((p,i)=><div key={p.player_id} style={{animation:`fadeUp 400ms ${i*40}ms ease both`}}><CaptainCard pick={p} rank={i+1}/></div>)}</div>}
        <div style={{marginTop:40,padding:"18px 22px",borderRadius:14,background:"rgba(255,255,255,0.015)",border:`1px solid ${C.line}`,fontSize:11,color:C.muted,lineHeight:1.7}}>
          <span style={{color:C.gold,fontWeight:700}}>Captain Score = </span>EP × 2 × differential bonus. Players owned &lt;15% get full bonus; above 15% it decays. FDR is baked into EP via xG/xA rate model.
        </div>
      </div>
    </div>
  );
}