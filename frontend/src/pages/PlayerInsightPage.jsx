// pages/PlayerProfile.jsx — StatinSite Stats Hub v2
import { useState, useEffect, useRef, useCallback } from "react";

const B = import.meta.env.VITE_BACKEND_URL || "https://football-stats-lw4b.onrender.com";

const C = {
  bg:"#080808",card:"rgba(6,6,10,0.98)",border:"rgba(255,255,255,0.09)",
  text:"#ffffff",muted:"rgba(220,230,245,0.9)",dim:"rgba(255,255,255,0.3)",soft:"#e8eeff",
  blue:"#ffffff",green:"#00ff9d",amber:"#ffd60a",red:"#ff4560",
  purple:"#c084fc",orange:"#ff7c2a",teal:"#00e5ff",pink:"#ff3ea5",
};

const LEAGUES=[
  {key:"all",label:"All Leagues",color:C.muted},
  {key:"epl",label:"Premier League",color:C.blue},
  {key:"laliga",label:"La Liga",color:C.amber},
  {key:"seriea",label:"Serie A",color:C.green},
  {key:"bundesliga",label:"Bundesliga",color:C.orange},
  {key:"ligue1",label:"Ligue 1",color:C.purple},
];
const LC={epl:C.blue,laliga:C.amber,seriea:C.green,bundesliga:C.orange,ligue1:C.purple};
const LA={epl:"EPL",laliga:"LAL",seriea:"SA",bundesliga:"BUN",ligue1:"L1"};
const PC=p=>{const l=(p||"").toLowerCase();if(l.includes("goal"))return C.amber;if(l.includes("defend"))return C.green;if(l.includes("mid"))return C.blue;if(l.includes("attack")||l.includes("forward"))return C.red;return C.muted;};

const PLAYER_TABS=[
  {key:"scorers",  label:"Top Scorers",  icon:"⚽",color:C.red,    ep:"/api/players/top-scorers",      sk:"goals",          sl:"Goals",   sc:C.red},
  {key:"assists",  label:"Top Assists",  icon:"🅰",color:C.green,  ep:"/api/players/top-assisters",    sk:"assists",        sl:"Assists", sc:C.green},
  {key:"contrib",  label:"G+A",          icon:"📊",color:C.blue,   ep:"/api/players/top-contributors", sk:"goal_contributions",sl:"G+A",  sc:C.blue},
  {key:"rated",    label:"Best Rated",   icon:"⭐",color:C.amber,  ep:"/api/players/top-rated",        sk:"rating",         sl:"Rating",  sc:C.amber},
  {key:"shots",    label:"Most Shots",   icon:"🎯",color:C.purple, ep:"/api/players/most-shots",       sk:"shots_total",    sl:"Shots",   sc:C.purple},
  {key:"tackles",  label:"Top Tacklers", icon:"🛡",color:C.orange, ep:"/api/players/top-tacklers",     sk:"tackles_total",  sl:"Tackles", sc:C.orange},
];
const TEAM_TABS=[
  {key:"tgoals",   label:"Most Goals",   icon:"⚽",color:C.red,   ep:"/api/players/teams/most-goals",         sk:"goals_for",     sl:"Goals",  sc:C.red},
  {key:"tdefence", label:"Best Defence", icon:"🧱",color:C.green, ep:"/api/players/teams/best-defence",       sk:"goals_against",  sl:"GA",     sc:C.green},
  {key:"tcs",      label:"Clean Sheets", icon:"🧤",color:C.blue,  ep:"/api/players/teams/most-clean-sheets",  sk:"clean_sheets",   sl:"CS",     sc:C.blue},
  {key:"tform",    label:"Best Form",    icon:"📈",color:C.amber, ep:"/api/players/teams/form",               sk:"points",         sl:"Pts",    sc:C.amber},
];

function useReveal(){const ref=useRef(null);const[v,sv]=useState(false);useEffect(()=>{if(!ref.current)return;const io=new IntersectionObserver(([e])=>{if(e.isIntersecting){sv(true);io.disconnect();}},{threshold:0.04});io.observe(ref.current);return()=>io.disconnect();},[]);return[ref,v];}
function Sk({h=52,r=10}){return <div style={{height:h,borderRadius:r,background:"linear-gradient(90deg,rgba(255,255,255,0.022) 0%,rgba(255,255,255,0.05) 50%,rgba(255,255,255,0.022) 100%)",backgroundSize:"400% 100%",animation:"shimmer 1.5s ease-in-out infinite",marginBottom:6}}/>;}
function Bar({v=0,max=1,color=C.blue}){const p=Math.min(100,max>0?Math.round(v/max*100):0);return <div style={{flex:1,height:4,background:"rgba(255,255,255,0.07)",overflow:"hidden"}}><div style={{height:"100%",width:p+"%",background:color,transition:"width 0.65s cubic-bezier(.22,1,.36,1)"}}/></div>;}
function Form({f}){if(!f)return null;return <div style={{display:"flex",gap:2}}>{f.split("").slice(-5).map((c,i)=><span key={i} style={{width:13,height:13,borderRadius:3,fontSize:7,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",background:c==="W"?"rgba(52,211,153,0.22)":c==="D"?"rgba(245,158,11,0.18)":"rgba(248,113,113,0.18)",color:c==="W"?C.green:c==="D"?C.amber:C.red}}>{c}</span>)}</div>;}
function Lbadge({slug,color}){if(!slug||slug==="all")return null;return <span style={{fontSize:7,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",color:color||C.muted,background:(color||C.muted)+"10",border:"1px solid "+(color||C.muted)+"25",borderRadius:4,padding:"1px 5px",flexShrink:0}}>{LA[slug]||slug.toUpperCase()}</span>;}

// ── Rank medal ────────────────────────────────────────────────
function Rnk({n}){const mc=["#f2c94c","#94a3b8","#fb923c"];const c=n<=3?mc[n-1]:C.dim;return <span style={{fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:900,color:c,width:20,textAlign:"right",flexShrink:0}}>{n}</span>;}

// ── Player row ─────────────────────────────────────────────────
function PRow({p,rank,sk,sl,sc,max,onClick}){
  const[hov,sh]=useState(false);const[ref,vis]=useReveal();
  const ac=PC(p.position);const lc=LC[p.league_slug]||C.muted;const val=p[sk];
  return(
    <div ref={ref} onClick={()=>onClick(p)} onMouseEnter={()=>sh(true)} onMouseLeave={()=>sh(false)}
      style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",borderRadius:12,cursor:"pointer",
        background:hov?"rgba(12,20,40,0.99)":C.card,
        border:hov?"1px solid "+ac+"40":"1px solid "+C.border,
        transform:hov?"translateY(-1px)":vis?"translateY(0)":"translateY(8px)",
        opacity:vis?1:0,transition:"all 0.2s cubic-bezier(.22,1,.36,1)",marginBottom:5}}>
      <Rnk n={rank}/>
      <div style={{width:34,height:34,borderRadius:"50%",overflow:"hidden",flexShrink:0,border:"1.5px solid "+ac+"28",background:ac+"0e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:ac}}>
        {p.photo?<img src={p.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.currentTarget.style.display="none"}/>:(p.name||"?")[0]}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
          <span style={{fontSize:7,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",color:ac,background:ac+"0e",border:"1px solid "+ac+"20",borderRadius:4,padding:"1px 4px",flexShrink:0}}>{p.position||"—"}</span>
          <Lbadge slug={p.league_slug} color={lc}/>
        </div>
        <p style={{fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:800,color:hov?C.text:C.soft,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</p>
        <div style={{display:"flex",gap:4,alignItems:"center",marginTop:1}}>
          {p.team_logo&&<img src={p.team_logo} alt="" style={{width:10,height:10,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
          <span style={{fontFamily:"'Inter',sans-serif",fontSize:9,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.team}</span>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:7,minWidth:100,flexShrink:0}}>
        <Bar v={val||0} max={max} color={sc}/>
        <div style={{textAlign:"right",minWidth:32}}>
          <div style={{fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:900,color:sc,lineHeight:1}}>{typeof val==="number"&&val%1!==0?val.toFixed(1):val??0}</div>
          <div style={{fontSize:7,fontWeight:800,color:C.dim,letterSpacing:"0.08em",textTransform:"uppercase"}}>{sl}</div>
        </div>
      </div>
    </div>
  );
}

// ── Team row ───────────────────────────────────────────────────
function TRow({t,rank,sk,sl,sc,max,onClick}){
  const[hov,sh]=useState(false);const[ref,vis]=useReveal();
  const lc=LC[t.league_slug]||C.muted;const val=t[sk];
  return(
    <div ref={ref} onClick={()=>onClick(t)} onMouseEnter={()=>sh(true)} onMouseLeave={()=>sh(false)}
      style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",borderRadius:12,cursor:"pointer",
        background:hov?"rgba(12,20,40,0.99)":C.card,
        border:hov?"1px solid "+lc+"35":"1px solid "+C.border,
        transform:hov?"translateY(-1px)":vis?"translateY(0)":"translateY(8px)",
        opacity:vis?1:0,transition:"all 0.2s cubic-bezier(.22,1,.36,1)",marginBottom:5}}>
      <Rnk n={rank}/>
      <div style={{width:26,height:26,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        {t.team_logo?<img src={t.team_logo} alt="" style={{width:24,height:24,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>:<div style={{width:22,height:22,borderRadius:5,background:lc+"14"}}/>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
          <Lbadge slug={t.league_slug} color={lc}/>
          <Form f={t.form}/>
        </div>
        <p style={{fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:800,color:hov?C.text:C.soft,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.team}</p>
        <span style={{fontFamily:"'Inter',sans-serif",fontSize:9,color:C.dim}}>{t.played}PL · {t.wins}W {t.draws}D {t.losses}L</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:7,minWidth:100,flexShrink:0}}>
        <Bar v={val||0} max={max} color={sc}/>
        <div style={{textAlign:"right",minWidth:32}}>
          <div style={{fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:900,color:sc,lineHeight:1}}>{typeof val==="number"&&val%1!==0?val.toFixed(1):val??0}</div>
          <div style={{fontSize:7,fontWeight:800,color:C.dim,letterSpacing:"0.08em",textTransform:"uppercase"}}>{sl}</div>
        </div>
      </div>
    </div>
  );
}

// ── Player detail panel ────────────────────────────────────────
function PDetail({p,onClose}){
  const ac=PC(p.position);const lc=LC[p.league_slug]||C.muted;const m=p.minutes||1;
  const bars=[{l:"Goals",v:p.goals||0,max:35,c:C.red},{l:"Assists",v:p.assists||0,max:25,c:C.green},{l:"Shots",v:p.shots_total||0,max:200,c:C.blue},{l:"On Target",v:p.shots_on||0,max:100,c:C.blue},{l:"Key Passes",v:p.passes_key||0,max:100,c:C.amber},{l:"Dribbles",v:p.dribbles_success||0,max:100,c:C.purple},{l:"Tackles",v:p.tackles_total||0,max:150,c:C.green}];
  return(
    <div style={{position:"fixed",inset:0,zIndex:1100,display:"flex",alignItems:"flex-start",justifyContent:"flex-end",padding:16,pointerEvents:"none"}}>
      <div style={{width:330,maxHeight:"calc(100vh - 32px)",overflowY:"auto",pointerEvents:"auto",borderRadius:20,background:"rgba(4,9,20,0.99)",border:"1px solid "+ac+"28",boxShadow:"0 0 40px "+ac+"14,0 32px 80px rgba(0,0,0,0.85)",animation:"slideIn 0.22s cubic-bezier(.22,1,.36,1)",scrollbarWidth:"thin",scrollbarColor:ac+"18 transparent"}}>
        <div style={{height:2,background:"linear-gradient(90deg,"+ac+",transparent)"}}/>
        <div style={{padding:"15px 15px 0",display:"flex",gap:10,alignItems:"flex-start"}}>
          <div style={{width:52,height:52,borderRadius:"50%",overflow:"hidden",flexShrink:0,border:"2px solid "+ac+"35",background:ac+"0e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:ac}}>
            {p.photo?<img src={p.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.currentTarget.style.display="none"}/>:(p.name||"?")[0]}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:15,fontWeight:900,color:C.text,margin:"0 0 3px",lineHeight:1.2}}>{p.name}</h2>
            <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:7,fontWeight:900,textTransform:"uppercase",color:ac,background:ac+"10",border:"1px solid "+ac+"22",borderRadius:4,padding:"2px 5px"}}>{p.position}</span>
              <Lbadge slug={p.league_slug} color={lc}/>
              <span style={{fontSize:9,color:C.muted}}>{p.nationality}</span>
              {p.age&&<span style={{fontSize:9,color:C.dim}}>Age {p.age}</span>}
            </div>
            <div style={{display:"flex",gap:4,alignItems:"center",marginTop:4}}>
              {p.team_logo&&<img src={p.team_logo} alt="" style={{width:13,height:13,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
              <span style={{fontSize:10,fontWeight:700,color:C.muted}}>{p.team}</span>
            </div>
          </div>
          <button onClick={onClose} style={{width:26,height:26,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:C.muted,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.12)";e.currentTarget.style.color=C.text;}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color=C.muted;}}>✕</button>
        </div>
        <div style={{padding:"11px 15px",display:"flex",gap:5,flexWrap:"wrap"}}>
          {[{l:"Goals",v:p.goals,c:C.red},{l:"Assists",v:p.assists,c:C.green},{l:"Apps",v:p.appearances,c:C.blue},{l:"Mins",v:p.minutes,c:C.muted},p.rating&&{l:"Rating",v:Number(p.rating).toFixed(1),c:C.amber}].filter(Boolean).map(s=>(
            <div key={s.l} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"7px 9px",borderRadius:9,background:"rgba(255,255,255,0.022)",border:"1px solid "+s.c+"18",minWidth:50}}>
              <span style={{fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:900,color:s.c,lineHeight:1}}>{s.v??0}</span>
              <span style={{fontSize:7,fontWeight:800,color:C.dim,letterSpacing:"0.1em",textTransform:"uppercase"}}>{s.l}</span>
            </div>
          ))}
        </div>
        <div style={{padding:"0 15px 12px"}}>
          <div style={{fontSize:7,fontWeight:900,color:ac,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Season Statistics</div>
          {bars.map(r=>(
            <div key={r.l} style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
              <span style={{fontSize:10,color:C.muted,width:76,flexShrink:0,textAlign:"right"}}>{r.l}</span>
              <Bar v={r.v} max={r.max} color={r.c}/>
              <span style={{fontFamily:"'Inter',sans-serif",fontSize:10,color:r.c,width:22,textAlign:"right",fontWeight:700,flexShrink:0}}>{r.v}</span>
            </div>
          ))}
        </div>
        {p.minutes>90&&(
          <div style={{margin:"0 15px 12px",padding:"11px 13px",borderRadius:11,background:"rgba(255,255,255,0.018)",border:"1px solid "+ac+"14"}}>
            <div style={{fontSize:7,fontWeight:900,color:ac,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:9}}>Per 90 Minutes</div>
            <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
              {[{l:"Goals",v:(p.goals_per90||0).toFixed(2)},{l:"Assists",v:(p.assists_per90||0).toFixed(2)},{l:"Shots",v:(p.shots_per90||0).toFixed(2)}].map(s=>(
                <div key={s.l}><div style={{fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:900,color:ac}}>{s.v}</div><div style={{fontSize:7,fontWeight:800,color:C.dim,letterSpacing:"0.08em",textTransform:"uppercase"}}>{s.l}</div></div>
              ))}
            </div>
          </div>
        )}
        <div style={{margin:"0 15px 15px",display:"flex",gap:7}}>
          <div style={{flex:1,padding:"8px",borderRadius:9,background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.18)",textAlign:"center"}}><div style={{fontFamily:"'Inter',sans-serif",fontSize:15,fontWeight:900,color:C.amber}}>{p.yellow_cards||0}</div><div style={{fontSize:7,fontWeight:800,color:C.dim,letterSpacing:"0.1em",textTransform:"uppercase"}}>Yellow</div></div>
          <div style={{flex:1,padding:"8px",borderRadius:9,background:"rgba(248,113,113,0.07)",border:"1px solid rgba(248,113,113,0.18)",textAlign:"center"}}><div style={{fontFamily:"'Inter',sans-serif",fontSize:15,fontWeight:900,color:C.red}}>{p.red_cards||0}</div><div style={{fontSize:7,fontWeight:800,color:C.dim,letterSpacing:"0.1em",textTransform:"uppercase"}}>Red</div></div>
        </div>
      </div>
    </div>
  );
}

// ── Team detail panel ──────────────────────────────────────────
function TDetail({t,onClose}){
  const lc=LC[t.league_slug]||C.muted;
  return(
    <div style={{position:"fixed",inset:0,zIndex:1100,display:"flex",alignItems:"flex-start",justifyContent:"flex-end",padding:16,pointerEvents:"none"}}>
      <div style={{width:300,maxHeight:"calc(100vh - 32px)",overflowY:"auto",pointerEvents:"auto",borderRadius:20,background:"rgba(4,9,20,0.99)",border:"1px solid "+lc+"28",boxShadow:"0 0 40px "+lc+"14,0 32px 80px rgba(0,0,0,0.85)",animation:"slideIn 0.22s cubic-bezier(.22,1,.36,1)"}}>
        <div style={{height:2,background:"linear-gradient(90deg,"+lc+",transparent)"}}/>
        <div style={{padding:"15px"}}>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:13}}>
            {t.team_logo&&<img src={t.team_logo} alt="" style={{width:40,height:40,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
            <div style={{flex:1,minWidth:0}}>
              <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:15,fontWeight:900,color:C.text,margin:"0 0 3px"}}>{t.team}</h2>
              <div style={{display:"flex",gap:5,alignItems:"center"}}>
                <Lbadge slug={t.league_slug} color={lc}/>
                <span style={{fontSize:9,color:C.dim}}>#{t.rank}</span>
                <Form f={t.form}/>
              </div>
            </div>
            <button onClick={onClose} style={{width:26,height:26,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:C.muted,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.12)";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";}}>✕</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:13}}>
            {[{l:"W",v:t.wins,c:C.green},{l:"D",v:t.draws,c:C.amber},{l:"L",v:t.losses,c:C.red},{l:"PTS",v:t.points,c:C.blue}].map(s=>(
              <div key={s.l} style={{textAlign:"center",padding:"7px 4px",borderRadius:9,background:"rgba(255,255,255,0.022)",border:"1px solid "+s.c+"18"}}>
                <div style={{fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:900,color:s.c}}>{s.v}</div>
                <div style={{fontSize:7,fontWeight:800,color:C.dim,letterSpacing:"0.1em",textTransform:"uppercase"}}>{s.l}</div>
              </div>
            ))}
          </div>
          {[{l:"Goals Scored",v:t.goals_for,max:100,c:C.red},{l:"Goals Against",v:t.goals_against,max:80,c:C.muted},{l:"Clean Sheets",v:t.clean_sheets,max:20,c:C.green},{l:"Goals/Game",v:t.goals_per_game,max:4,c:C.amber},{l:"Conceded/Game",v:t.conceded_per_game,max:3,c:C.orange},{l:"Win Rate",v:t.win_rate,max:100,c:C.blue}].map(s=>(
            <div key={s.l} style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
              <span style={{fontSize:9,color:C.muted,width:90,flexShrink:0,textAlign:"right"}}>{s.l}</span>
              <Bar v={parseFloat(s.v)||0} max={s.max} color={s.c}/>
              <span style={{fontFamily:"'Inter',sans-serif",fontSize:10,color:s.c,width:30,textAlign:"right",fontWeight:700,flexShrink:0}}>{typeof s.v==="number"?s.v.toFixed?s.v.toFixed(1):s.v:s.v||0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────
function SHead({title,color,count,loading}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
      <div style={{width:3,height:28,borderRadius:2,background:"linear-gradient(180deg,"+color+",transparent)",flexShrink:0}}/>
      <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:15,fontWeight:900,color:C.text,margin:0,flex:1,letterSpacing:"-0.02em"}}>{title}</h2>
      {loading&&<span style={{fontSize:9,color:C.dim,fontFamily:"'Inter',sans-serif"}}>Loading…</span>}
      {!loading&&count!=null&&<span style={{fontFamily:"'Inter',sans-serif",fontSize:10,color:C.dim,fontWeight:700}}>{count}</span>}
    </div>
  );
}


// ── League Donut (Viz 3) ──────────────────────────────────────────
const LEAGUE_COLORS_BRIGHT={epl:"#ffffff",laliga:"#ffd60a",seriea:"#00ff9d",bundesliga:"#ff7c2a",ligue1:"#c084fc",all:C.muted};
function LeagueDonut({rows,sk,color,label}){
  if(!rows||rows.length===0)return null;
  const byLeague={};
  rows.forEach(r=>{const lg=r.league_slug||r.league||"other";const v=parseFloat(r[sk])||0;byLeague[lg]=(byLeague[lg]||0)+v;});
  const entries=Object.entries(byLeague).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const total=entries.reduce((s,[,v])=>s+v,0)||1;
  const CIRC=2*Math.PI*34;
  let offset=0;
  const arcs=entries.map(([lg,v])=>{
    const pct=v/total;const dash=pct*CIRC;
    const arc={lg,v,pct,dash,offset,col:LEAGUE_COLORS_BRIGHT[lg]||"#666"};
    offset+=dash;return arc;
  });
  return(
    <div style={{display:"flex",alignItems:"center",gap:14,padding:"10px 12px",borderRadius:12,background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.08)",marginBottom:14}}>
      <svg width="72" height="72" viewBox="0 0 72 72" style={{flexShrink:0}}>
        <circle cx="36" cy="36" r="34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7"/>
        {arcs.map((a,i)=>(
          <circle key={i} cx="36" cy="36" r="34" fill="none" stroke={a.col} strokeWidth="7"
            strokeDasharray={`${a.dash} ${CIRC-a.dash}`}
            strokeDashoffset={-a.offset+(CIRC/4)}
            transform="rotate(-90 36 36)" strokeLinecap="butt"/>
        ))}
        <text x="36" y="33" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff" fontFamily="monospace">{Math.round(total)}</text>
        <text x="36" y="44" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.4)" fontFamily="sans-serif">{label}</text>
      </svg>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
        {arcs.map((a,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:7,height:7,borderRadius:2,background:a.col,flexShrink:0}}/>
            <span style={{fontSize:9,color:"rgba(255,255,255,0.55)",textTransform:"uppercase",letterSpacing:"0.06em",width:30,flexShrink:0}}>{(a.lg||"?").slice(0,3).toUpperCase()}</span>
            <div style={{flex:1,height:3,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
              <div style={{height:"100%",width:Math.round(a.pct*100)+"%",background:a.col,borderRadius:999}}/>
            </div>
            <span style={{fontSize:9,fontWeight:700,color:a.col,fontFamily:"monospace",minWidth:22,textAlign:"right"}}>{Math.round(a.v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat tiles row (Viz 4) ────────────────────────────────────────
function StatTiles({pRows,tRows,pCurrent,tCurrent}){
  const pTop=pRows[0];const tTop=tRows[0];
  const tiles=[
    pTop&&{label:pCurrent.sl+" leader",val:parseFloat(pTop[pCurrent.sk])?.toFixed(pCurrent.sl==="Rating"?1:0)||"—",name:pTop.name?.split(" ").pop()||"",col:pCurrent.color,sub:pTop.team||""},
    tTop&&{label:"Top team · "+tCurrent.sl,val:parseFloat(tTop[tCurrent.sk])?.toFixed(0)||"—",name:tTop.team?.split(" ").pop()||"",col:tCurrent.color,sub:""},
    pRows.length>0&&{label:"Players tracked",val:pRows.length,name:"across leagues",col:C.blue,sub:""},
    tRows.length>0&&{label:"Teams ranked",val:tRows.length,name:"in selection",col:C.teal,sub:""},
  ].filter(Boolean);
  if(tiles.length===0)return null;
  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
      {tiles.map((t,i)=>(
        <div key={i} style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,padding:"11px 13px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:t.col}}/>
          <div style={{fontSize:20,fontWeight:900,color:t.col,fontFamily:"'Inter',sans-serif",lineHeight:1,textShadow:`0 0 20px ${t.col}80`}}>{t.val}</div>
          <div style={{fontSize:8,fontWeight:700,color:"rgba(255,255,255,0.35)",letterSpacing:"0.1em",textTransform:"uppercase",marginTop:3}}>{t.label}</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.55)",marginTop:2}}>{t.name}</div>
        </div>
      ))}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────

// ── Intricate background ──────────────────────────────────────────────────────
function PageBg() {
  return (
    <div aria-hidden="true" className="sn-fixed-bg" style={{position:"fixed",top:0,right:0,bottom:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:"#080808"}}/>
      <div style={{position:"absolute",top:"-15%",left:"25%",width:"60vw",height:"60vw",background:"radial-gradient(ellipse,rgba(255,255,255,.012) 0%,transparent 65%)"}}/>
      <div style={{position:"absolute",bottom:"-5%",right:"10%",width:"45vw",height:"45vw",background:"radial-gradient(ellipse,rgba(255,255,255,.009) 0%,transparent 55%)"}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px)",backgroundSize:"44px 44px"}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,.042) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.042) 1px,transparent 1px)",backgroundSize:"176px 176px"}}/>
      <svg style={{position:"absolute",top:0,left:0,width:140,height:140,opacity:.07}} viewBox="0 0 140 140">
        <polyline points="10,55 10,10 55,10" fill="none" stroke="white" strokeWidth="1.1"/>
        <circle cx="10" cy="10" r="2" fill="none" stroke="white" strokeWidth=".7"/>
      </svg>
      <svg style={{position:"absolute",bottom:0,right:0,width:140,height:140,opacity:.06}} viewBox="0 0 140 140">
        <polyline points="130,85 130,130 85,130" fill="none" stroke="white" strokeWidth="1.1"/>
      </svg>
    </div>
  );
}

function PageFooter() {
  return (
    <footer style={{position:"relative",zIndex:2,flexShrink:0,background:"rgba(255,255,255,0.025)",borderTop:"0.5px solid rgba(255,255,255,0.08)",fontFamily:"'Inter',system-ui,sans-serif"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:20,padding:"0 28px",height:52}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
            <rect x="4" y="3"  width="14" height="3.5" rx="1.75" fill="#0a84ff"/>
            <rect x="4" y="9"  width="10" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.65"/>
            <rect x="4" y="15" width="14" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.4"/>
            <rect x="4" y="21" width="7"  height="3.5" rx="1.75" fill="#0a84ff" opacity="0.22"/>
            <rect x="20" y="15" width="3" height="10"  rx="1.5"  fill="#30d158"/>
          </svg>
          <span style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.7)",letterSpacing:"-.03em"}}>StatinSite</span>
          <span style={{fontSize:11,color:"rgba(255,255,255,0.25)",letterSpacing:".01em"}}>Football Intelligence · ELO · Dixon-Coles · xG</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 16px",background:"rgba(255,255,255,0.04)",border:"0.5px solid rgba(255,255,255,0.09)",borderRadius:999,flexShrink:0}}>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.28)",letterSpacing:".1em",textTransform:"uppercase"}}>Built by</span>
          <span style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.75)"}}>Rutej Talati</span>
        </div>
        <span style={{fontSize:11,color:"rgba(255,255,255,0.2)",flexShrink:0}}>© {new Date().getFullYear()} StatinSite</span>
      </div>
    </footer>
  );
}

export default function PlayerProfilePage(){
  const[league,setLeague]=useState("all");
  const[pTab,setPTab]=useState("scorers");
  const[tTab,setTTab]=useState("tgoals");
  const[cache,setCache]=useState({});
  const cacheRef=useRef({});
  const[loading,setLoading]=useState({});
  const[sel,setSel]=useState(null);
  const[selType,setSelType]=useState(null);
  const[search,setSearch]=useState("");
  const[srRes,setSrRes]=useState([]);
  const[srLoading,setSrLoading]=useState(false);
  const[srOpen,setSrOpen]=useState(false);
  const debRef=useRef(null);
  const searchRef=useRef(null);

  // Fetch helper
  const fetchTab=useCallback(async(ep,key)=>{
    if(cacheRef.current[key]!==undefined)return;
    setLoading(l=>({...l,[key]:true}));
    try{
      const params=new URLSearchParams({limit:"20"});
      if(league&&league!=="all") params.set("league",league);
      const res=await fetch(B+ep+"?"+params.toString());
      if(!res.ok)throw new Error("HTTP "+res.status);
      const raw=await res.json();
      const val=Array.isArray(raw)?raw:(raw.teams||raw.players||[]);
      cacheRef.current[key]=val;
      setCache(c=>({...c,[key]:val}));
    }catch(e){console.error(ep,e);setCache(c=>({...c,[key]:[]}));}
    setLoading(l=>({...l,[key]:false}));
  },[league]);

  const pCurrent=PLAYER_TABS.find(t=>t.key===pTab)||PLAYER_TABS[0];
  const tCurrent=TEAM_TABS.find(t=>t.key===tTab)||TEAM_TABS[0];
  const pKey=pCurrent.key+":"+league;
  const tKey=tCurrent.key+":"+league;

  useEffect(()=>{fetchTab(pCurrent.ep,pKey);},[pTab,league]);
  useEffect(()=>{fetchTab(tCurrent.ep,tKey);},[tTab,league]);
  // Preload defaults on mount
  useEffect(()=>{
    fetchTab(PLAYER_TABS[0].ep,PLAYER_TABS[0].key+":all");
    fetchTab(TEAM_TABS[0].ep,TEAM_TABS[0].key+":all");
  },[]);

  const pRows=cache[pKey]||[];const tRows=cache[tKey]||[];
  const pLoading=loading[pKey];const tLoading=loading[tKey];
  const pMax=pRows.length?Math.max(...pRows.map(r=>parseFloat(r[pCurrent.sk])||0),1):1;
  const tMax=tRows.length?Math.max(...tRows.map(r=>parseFloat(r[tCurrent.sk])||0),1):1;

  // Search
  useEffect(()=>{
    clearTimeout(debRef.current);
    if(!search.trim()){setSrRes([]);setSrOpen(false);return;}
    setSrLoading(true);setSrOpen(true);
    debRef.current=setTimeout(async()=>{
      try{
        const r=await fetch(B+"/api/players/search?q="+encodeURIComponent(search)+"&limit=20");
        const d=await r.json();
        setSrRes(Array.isArray(d)?d:[]);
      }catch{setSrRes([]);}
      setSrLoading(false);
    },350);
  },[search]);

  useEffect(()=>{
    const fn=e=>{if(searchRef.current&&!searchRef.current.contains(e.target)){setSrOpen(false);}};
    document.addEventListener("mousedown",fn);return()=>document.removeEventListener("mousedown",fn);
  },[]);

  const openPlayer=p=>{setSel(p);setSelType("player");setSrOpen(false);setSearch("");};
  const openTeam=t=>{setSel(t);setSelType("team");setSrOpen(false);setSearch("");};

  // League filter invalidates cache
  const onLeague=lg=>{setLeague(lg);cacheRef.current={};setCache({});};

  return(
    <div className="sn-page-wrap" style={{
      backgroundImage:"linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)",
      backgroundSize:"80px 80px",backgroundAttachment:"fixed",fontFamily:"'Inter',sans-serif"}}>
      <PageBg/>
      <style>{"@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@keyframes slideIn{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}"}</style>

      {sel&&selType==="player"&&<PDetail p={sel} onClose={()=>setSel(null)}/>}
      {sel&&selType==="team"&&<TDetail t={sel} onClose={()=>setSel(null)}/>}

      <div style={{maxWidth:1240,margin:"0 auto",padding:"0 20px 80px"}}>

        {/* ── Header ── */}
        <div style={{padding:"26px 0 18px",borderBottom:"1px solid rgba(255,255,255,0.045)",marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:4,height:46,borderRadius:2,background:"linear-gradient(180deg,#38bdf8,#34d399)",flexShrink:0}}/>
              <div>
                <h1 style={{fontFamily:"'Inter',sans-serif",fontSize:26,fontWeight:900,color:C.text,margin:0,letterSpacing:"-0.03em"}}>Stats Hub</h1>
                <p style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:C.dim,margin:"3px 0 0",fontWeight:600}}>Goals · Assists · Clean sheets · Team form across all 5 European leagues</p>
              </div>
            </div>
            {/* Search */}
            <div ref={searchRef} style={{position:"relative",width:"min(300px,100%)"}}>
              <svg style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search players or teams…"
                style={{width:"100%",padding:"9px 32px 9px 30px",borderRadius:11,boxSizing:"border-box",
                  background:"rgba(255,255,255,0.045)",border:"1px solid rgba(255,255,255,0.09)",
                  color:C.text,fontFamily:"'Inter',sans-serif",fontSize:12,outline:"none",transition:"border .15s"}}
                onFocus={e=>{e.target.style.borderColor=C.blue+"55";setSrOpen(!!search);}}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.09)"}/>
              {search&&<button onClick={()=>{setSearch("");setSrRes([]);setSrOpen(false);}} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",padding:0}}>✕</button>}
              {/* Search dropdown */}
              {srOpen&&(
                <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,zIndex:900,background:"rgba(4,9,20,0.99)",border:"1px solid rgba(255,255,255,0.1)",boxShadow:"0 24px 60px rgba(0,0,0,0.75)",overflow:"hidden",maxHeight:340,overflowY:"auto"}}>
                  <div style={{padding:"8px 12px 4px",fontSize:8,fontWeight:900,color:C.dim,letterSpacing:"0.1em",textTransform:"uppercase"}}>Search Results</div>
                  {srLoading&&[1,2,3].map(i=><div key={i} style={{padding:"8px 12px"}}><Sk h={38} r={8}/></div>)}
                  {!srLoading&&srRes.length===0&&<p style={{fontFamily:"'Inter',sans-serif",fontSize:12,color:C.dim,padding:"12px",margin:0}}>No results for "{search}"</p>}
                  {!srLoading&&srRes.map(p=>(
                    <div key={p.id} onClick={()=>openPlayer(p)}
                      style={{display:"flex",gap:10,alignItems:"center",padding:"9px 12px",cursor:"pointer",transition:"background .12s",borderTop:"1px solid rgba(255,255,255,0.04)"}}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{width:32,height:32,borderRadius:"50%",overflow:"hidden",flexShrink:0,background:PC(p.position)+"10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:PC(p.position),fontWeight:900}}>
                        {p.photo?<img src={p.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.currentTarget.style.display="none"}/>:(p.name||"?")[0]}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontFamily:"'Inter',sans-serif",fontSize:12,fontWeight:700,color:C.soft,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</p>
                        <p style={{fontFamily:"'Inter',sans-serif",fontSize:9,color:C.muted,margin:0}}>{p.team} · {p.position} · {p.league}</p>
                      </div>
                      <div style={{display:"flex",gap:8,flexShrink:0}}>
                        <span style={{fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:900,color:C.red}}>{p.goals}G</span>
                        <span style={{fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:900,color:C.green}}>{p.assists}A</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── League chips ── */}
        <div style={{display:"flex",gap:6,marginBottom:22,overflowX:"auto",scrollbarWidth:"none",paddingBottom:2}}>
          {LEAGUES.map(l=>(
            <button key={l.key} onClick={()=>onLeague(l.key)}
              style={{padding:"7px 16px",borderRadius:8,
                border:league===l.key?`2px solid ${l.color}`:"1px solid rgba(255,255,255,0.1)",
                background:league===l.key?l.color:"transparent",
                color:league===l.key?"#080808":"rgba(255,255,255,0.55)",
                fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:800,
                cursor:"pointer",transition:"all .16s",flexShrink:0,whiteSpace:"nowrap",
                boxShadow:league===l.key?`0 0 20px ${l.color}60`:"none",
                letterSpacing:"0.02em"}}>
              {l.label}
            </button>
          ))}
        </div>

        {/* ── Stat tiles (Viz 4) ── */}
        {(!pLoading&&!tLoading)&&<StatTiles pRows={pRows} tRows={tRows} pCurrent={pCurrent} tCurrent={tCurrent}/>}

        {/* ── Two-column grid ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>

          {/* LEFT — Player rankings */}
          <div>
            {/* Tab row */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:8,fontWeight:900,color:C.dim,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:9,fontFamily:"'Inter',sans-serif"}}>Player Rankings</div>
              <div style={{display:"flex",gap:0,borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
                {PLAYER_TABS.map(t=>(
                  <button key={t.key} onClick={()=>setPTab(t.key)}
                    style={{padding:"7px 12px",fontSize:11,fontWeight:700,fontFamily:"'Inter',sans-serif",cursor:"pointer",transition:"all .15s",flexShrink:0,whiteSpace:"nowrap",
                      background:"none",border:"none",borderBottom:pTab===t.key?`2px solid ${t.color}`:"2px solid transparent",marginBottom:"-1px",
                      color:pTab===t.key?t.color:"rgba(255,255,255,0.4)"}}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <SHead title={pCurrent.label} color={pCurrent.color} count={!pLoading?pRows.length:null} loading={pLoading}/>
            {pLoading&&[1,2,3,4,5,6,7].map(i=><Sk key={i}/>)}
            {!pLoading&&pRows.length===0&&(
              <div style={{padding:"32px 16px",textAlign:"center",background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.045)"}}>
                <div style={{fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:6}}>No data loaded yet</div>
                <div style={{fontSize:10,color:C.dim,fontFamily:"'Inter',sans-serif"}}>Check that the backend is running at {B}</div>
              </div>
            )}
            {!pLoading&&pRows.length>0&&league==="all"&&<LeagueDonut rows={pRows} sk={pCurrent.sk} color={pCurrent.color} label={pCurrent.sl}/>}
            {!pLoading&&pRows.map((p,i)=><PRow key={p.id||i} p={p} rank={i+1} sk={pCurrent.sk} sl={pCurrent.sl} sc={pCurrent.sc} max={pMax} onClick={openPlayer}/>)}
          </div>

          {/* RIGHT — Team rankings */}
          <div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:8,fontWeight:900,color:C.dim,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:9,fontFamily:"'Inter',sans-serif"}}>Team Rankings</div>
              <div style={{display:"flex",gap:0,borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
                {TEAM_TABS.map(t=>(
                  <button key={t.key} onClick={()=>setTTab(t.key)}
                    style={{padding:"7px 12px",fontSize:11,fontWeight:700,fontFamily:"'Inter',sans-serif",cursor:"pointer",transition:"all .15s",flexShrink:0,whiteSpace:"nowrap",
                      background:"none",border:"none",borderBottom:tTab===t.key?`2px solid ${t.color}`:"2px solid transparent",marginBottom:"-1px",
                      color:tTab===t.key?t.color:"rgba(255,255,255,0.4)"}}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <SHead title={tCurrent.label} color={tCurrent.color} count={!tLoading?tRows.length:null} loading={tLoading}/>
            {tLoading&&[1,2,3,4,5,6,7].map(i=><Sk key={i}/>)}
            {!tLoading&&tRows.length===0&&(
              <div style={{padding:"32px 16px",textAlign:"center",background:"rgba(255,255,255,0.018)",border:"1px solid rgba(255,255,255,0.045)"}}>
                <div style={{fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:6}}>No team data loaded</div>
                <div style={{fontSize:10,color:C.dim,fontFamily:"'Inter',sans-serif"}}>Standings load from API-Football. Check backend.</div>
              </div>
            )}
            {!tLoading&&tRows.length>0&&league==="all"&&<LeagueDonut rows={tRows} sk={tCurrent.sk} color={tCurrent.color} label={tCurrent.sl}/>}
            {!tLoading&&tRows.map((t,i)=><TRow key={t.team_id||i} t={t} rank={i+1} sk={tCurrent.sk} sl={tCurrent.sl} sc={tCurrent.sc} max={tMax} onClick={openTeam}/>)}
          </div>

        </div>

      </div>
      <PageFooter/>
    </div>
  );
}