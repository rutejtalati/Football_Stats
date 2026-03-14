// pages/PlayerProfile.jsx — StatinSite Player Database
// General player analytics across Europe's top 5 leagues via API-Football.
// NOT fantasy football — full season stats, comparisons, per-90 metrics.
import { useState, useEffect, useRef } from "react";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "https://football-stats-lw4b.onrender.com";

const C = {
  bg:"#000810", card:"rgba(9,15,28,0.98)", border:"rgba(255,255,255,0.065)",
  accent:"#38bdf8", green:"#34d399", amber:"#f59e0b", red:"#f87171", purple:"#a78bfa",
  text:"#f0f6ff", muted:"#5a7a9a", dim:"#1a3a5a",
};

const LEAGUE_OPTS = [
  {key:"",label:"All Leagues"},{key:"epl",label:"Premier League"},
  {key:"laliga",label:"La Liga"},{key:"seriea",label:"Serie A"},
  {key:"bundesliga",label:"Bundesliga"},{key:"ligue1",label:"Ligue 1"},
];
const POS_OPTS = ["","Goalkeeper","Defender","Midfielder","Attacker"];

function posColor(pos=""){
  const p=(pos||"").toLowerCase();
  if(p.includes("goal")) return C.amber;
  if(p.includes("defend")) return C.green;
  if(p.includes("mid")) return C.accent;
  if(p.includes("attack")||p.includes("forward")) return C.red;
  return C.muted;
}

function timeAgo(ts){
  if(!ts)return"";
  const m=Math.floor((Date.now()-new Date(ts))/60000);
  if(m<60)return m+"m ago";
  if(m<1440)return Math.floor(m/60)+"h ago";
  return Math.floor(m/1440)+"d ago";
}

function Skeleton({h=80,r=12}){
  return <div style={{borderRadius:r,height:h,background:"linear-gradient(90deg,rgba(255,255,255,0.025) 0%,rgba(255,255,255,0.055) 50%,rgba(255,255,255,0.025) 100%)",backgroundSize:"400% 100%",animation:"shimmer 1.5s ease-in-out infinite"}}/>;
}

function useReveal(){
  const ref=useRef(null);const[vis,setVis]=useState(false);
  useEffect(()=>{if(!ref.current)return;const io=new IntersectionObserver(([e])=>{if(e.isIntersecting){setVis(true);io.disconnect();}},{threshold:0.05});io.observe(ref.current);return()=>io.disconnect();},[]);
  return[ref,vis];
}

// ── Stat pill ─────────────────────────────────────────────────
function Pill({label,value,color=C.accent}){
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"10px 14px",borderRadius:12,background:"rgba(255,255,255,0.025)",border:"1px solid "+color+"20",minWidth:68}}>
      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:17,fontWeight:900,color}}>{value??"\u2014"}</span>
      <span style={{fontSize:8,fontWeight:800,color:C.dim,letterSpacing:"0.1em",textTransform:"uppercase"}}>{label}</span>
    </div>
  );
}

// ── Horizontal bar ────────────────────────────────────────────
function Bar({label,value=0,max=1,color=C.accent}){
  const pct=Math.min(100,Math.round((value/Math.max(max,1))*100));
  return(
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:11,color:C.muted,width:96,flexShrink:0,textAlign:"right"}}>{label}</span>
      <div style={{flex:1,height:5,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
        <div style={{width:pct+"%",height:"100%",background:color,borderRadius:999,transition:"width 0.6s ease"}}/>
      </div>
      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color,width:26,textAlign:"right",fontWeight:700,flexShrink:0}}>{value}</span>
    </div>
  );
}

// ── Player card in list ───────────────────────────────────────
function PlayerRow({player,onClick,compareMode,onCompare,comparing}){
  const[hov,setHov]=useState(false);
  const[ref,vis]=useReveal();
  const ac=posColor(player.position);
  const sel=comparing?.some(p=>p.id===player.id);
  return(
    <div ref={ref}
      onClick={()=>compareMode?onCompare(player):onClick(player)}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:14,cursor:"pointer",
        background:sel?"rgba(56,189,248,0.08)":hov?"rgba(12,20,38,0.99)":C.card,
        border:sel?"1.5px solid rgba(56,189,248,0.45)":hov?"1px solid "+ac+"35":"1px solid "+C.border,
        transform:hov?"translateY(-1px)":vis?"translateY(0)":"translateY(8px)",
        opacity:vis?1:0,transition:"all 0.2s cubic-bezier(.22,1,.36,1)"}}>
      {/* Photo */}
      <div style={{width:44,height:44,borderRadius:"50%",overflow:"hidden",flexShrink:0,
        background:ac+"12",border:"2px solid "+ac+"30"}}>
        {player.photo
          ?<img src={player.photo} alt={player.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.currentTarget.style.display="none"}/>
          :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:ac,fontWeight:900}}>{(player.name||"?")[0]}</div>}
      </div>
      {/* Name + team */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
          <span style={{fontSize:8,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",color:ac,background:ac+"10",border:"1px solid "+ac+"22",borderRadius:4,padding:"1px 5px",flexShrink:0}}>{player.position||"\u2014"}</span>
          {player.rating&&<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:C.green,fontWeight:700}}>{Number(player.rating).toFixed(1)}</span>}
          {player.nationality&&<span style={{fontSize:9,color:C.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{player.nationality}</span>}
        </div>
        <p style={{fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:800,color:hov?C.text:"#d0e8ff",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{player.name}</p>
        <div style={{display:"flex",gap:6,alignItems:"center",marginTop:2}}>
          {player.team_logo&&<img src={player.team_logo} alt="" style={{width:13,height:13,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
          <span style={{fontFamily:"'Inter',sans-serif",fontSize:10,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{player.team}</span>
        </div>
      </div>
      {/* Key stats */}
      <div style={{display:"flex",gap:16,flexShrink:0}}>
        {[{l:"G",v:player.goals,c:C.red},{l:"A",v:player.assists,c:C.green},{l:"Apps",v:player.appearances,c:C.accent}].map(s=>(
          <div key={s.l} style={{textAlign:"center",minWidth:28}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:900,color:s.c}}>{s.v??0}</div>
            <div style={{fontSize:8,color:C.dim,fontWeight:700,letterSpacing:"0.08em"}}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Player profile slide-in panel ─────────────────────────────
function ProfilePanel({player,onClose}){
  const ac=posColor(player.position);
  const min=player.minutes||1;
  const p90=(k)=>((player[k]||0)/min*90).toFixed(2);

  const bars=[
    {l:"Goals",v:player.goals||0,max:35,color:C.red},
    {l:"Assists",v:player.assists||0,max:25,color:C.green},
    {l:"Shots",v:player.shots_total||0,max:160,color:C.accent},
    {l:"On Target",v:player.shots_on||0,max:90,color:C.accent},
    {l:"Key Passes",v:player.key_passes||0,max:90,color:C.amber},
    {l:"Dribbles",v:player.dribbles||0,max:110,color:C.purple},
    {l:"Duels Won",v:player.duels_won||0,max:320,color:C.muted},
  ];

  return(
    <div style={{position:"fixed",inset:0,zIndex:1100,display:"flex",alignItems:"flex-start",justifyContent:"flex-end",padding:16,pointerEvents:"none"}}>
      <div style={{width:360,maxHeight:"calc(100vh - 32px)",overflowY:"auto",pointerEvents:"auto",
        borderRadius:20,background:"rgba(4,9,20,0.99)",border:"1px solid "+ac+"28",
        boxShadow:"0 0 40px "+ac+"14,0 32px 80px rgba(0,0,0,0.8)",
        animation:"slideIn 0.22s cubic-bezier(.22,1,.36,1)",scrollbarWidth:"thin",scrollbarColor:ac+"18 transparent"}}>
        <div style={{height:2,background:"linear-gradient(90deg,"+ac+",transparent)"}}/>
        {/* Header */}
        <div style={{padding:"18px 18px 0",display:"flex",gap:12,alignItems:"flex-start"}}>
          <div style={{width:64,height:64,borderRadius:"50%",overflow:"hidden",flexShrink:0,border:"2px solid "+ac+"35",background:ac+"10"}}>
            {player.photo
              ?<img src={player.photo} alt={player.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.currentTarget.style.display="none"}/>
              :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:ac,fontWeight:900}}>{(player.name||"?")[0]}</div>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:900,color:C.text,margin:"0 0 4px",lineHeight:1.2}}>{player.name}</h2>
            <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:8,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",color:ac,background:ac+"10",border:"1px solid "+ac+"22",borderRadius:4,padding:"2px 6px"}}>{player.position}</span>
              <span style={{fontSize:10,color:C.muted}}>{player.nationality}</span>
              {player.age&&<span style={{fontSize:10,color:C.dim}}>Age {player.age}</span>}
            </div>
            <div style={{display:"flex",gap:5,alignItems:"center",marginTop:5}}>
              {player.team_logo&&<img src={player.team_logo} alt="" style={{width:16,height:16,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
              <span style={{fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:700,color:C.muted}}>{player.team}</span>
            </div>
            {player.league&&<span style={{fontSize:9,color:C.dim}}>{player.league}</span>}
          </div>
          <button onClick={onClose} style={{width:30,height:30,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:C.muted,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.12)";e.currentTarget.style.color=C.text;}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color=C.muted;}}>&#x2715;</button>
        </div>
        {/* Key stats */}
        <div style={{padding:"14px 18px",display:"flex",gap:7,flexWrap:"wrap"}}>
          <Pill label="Goals"   value={player.goals}        color={C.red}/>
          <Pill label="Assists" value={player.assists}      color={C.green}/>
          <Pill label="Apps"    value={player.appearances}  color={C.accent}/>
          <Pill label="Mins"    value={player.minutes}      color={C.muted}/>
          {player.rating&&<Pill label="Rating" value={Number(player.rating).toFixed(1)} color={C.amber}/>}
        </div>
        {/* Bars */}
        <div style={{padding:"0 18px 18px",display:"flex",flexDirection:"column",gap:8}}>
          <div style={{fontSize:9,fontWeight:900,color:ac,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4}}>Season Statistics</div>
          {bars.map(b=><Bar key={b.l} {...b}/>)}
        </div>
        {/* Per 90 */}
        {player.minutes>90&&(
          <div style={{margin:"0 18px 18px",padding:"13px 15px",borderRadius:12,background:"rgba(255,255,255,0.018)",border:"1px solid "+ac+"14"}}>
            <div style={{fontSize:9,fontWeight:900,color:ac,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>Per 90 Minutes</div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              {[{l:"Goals",k:"goals"},{l:"Assists",k:"assists"},{l:"Shots",k:"shots_total"},{l:"Key Pass",k:"key_passes"}].map(s=>(
                <div key={s.l}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:900,color:ac}}>{p90(s.k)}</div>
                  <div style={{fontSize:8,fontWeight:800,color:C.dim,letterSpacing:"0.08em",textTransform:"uppercase"}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Compare modal ─────────────────────────────────────────────
function CompareModal({a,b,onClose}){
  const KEYS=[
    {k:"goals",l:"Goals",color:C.red},
    {k:"assists",l:"Assists",color:C.green},
    {k:"appearances",l:"Apps",color:C.accent},
    {k:"minutes",l:"Minutes",color:C.muted},
    {k:"shots_total",l:"Shots",color:C.accent},
    {k:"shots_on",l:"On Target",color:C.accent},
    {k:"key_passes",l:"Key Passes",color:C.amber},
    {k:"dribbles",l:"Dribbles",color:C.purple},
    {k:"duels_won",l:"Duels Won",color:C.muted},
  ];
  return(
    <div style={{position:"fixed",inset:0,zIndex:1200,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,animation:"fadeIn 0.2s ease"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:680,maxHeight:"90vh",overflowY:"auto",borderRadius:22,background:"rgba(4,9,20,0.99)",border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 32px 80px rgba(0,0,0,0.7)",scrollbarWidth:"thin"}}>
        <div style={{height:2,background:"linear-gradient(90deg,#38bdf8,#34d399,transparent)"}}/>
        <div style={{padding:"22px 26px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
            <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:19,fontWeight:900,color:C.text,margin:0}}>Player Comparison</h2>
            <button onClick={onClose} style={{width:34,height:34,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:C.muted,cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>&#x2715;</button>
          </div>
          {/* Player headers */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 60px 1fr",gap:8,marginBottom:24,alignItems:"center"}}>
            {[a,b].map((p,i)=>(
              <div key={i} style={{textAlign:i===0?"left":"right"}}>
                <div style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:900,color:C.text}}>{p.name}</div>
                <div style={{fontSize:11,color:C.muted}}>{p.team}</div>
                <div style={{fontSize:8,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",color:posColor(p.position),marginTop:3}}>{p.position}</div>
              </div>
            ))}
            <div style={{textAlign:"center",fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:900,color:"rgba(255,255,255,0.18)"}}>VS</div>
          </div>
          {/* Comparison bars */}
          {KEYS.map(({k,l,color})=>{
            const va=(a[k]||0); const vb=(b[k]||0); const mx=Math.max(va,vb,1); const wA=va>=vb;
            return(
              <div key={k} style={{display:"grid",gridTemplateColumns:"1fr 64px 1fr",gap:6,alignItems:"center",marginBottom:9}}>
                <div style={{display:"flex",gap:6,alignItems:"center",justifyContent:"flex-end"}}>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:900,color:wA?color:C.muted}}>{va}</span>
                  <div style={{width:Math.round((va/mx)*80)+"px",height:5,borderRadius:999,background:wA?color:"rgba(255,255,255,0.06)",minWidth:3,transition:"width 0.5s ease"}}/>
                </div>
                <div style={{textAlign:"center",fontSize:8,fontWeight:800,color:C.dim,letterSpacing:"0.08em",textTransform:"uppercase"}}>{l}</div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <div style={{width:Math.round((vb/mx)*80)+"px",height:5,borderRadius:999,background:!wA?color:"rgba(255,255,255,0.06)",minWidth:3,transition:"width 0.5s ease"}}/>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:900,color:!wA?color:C.muted}}>{vb}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PlayerProfilePage(){
  const[players,setPlayers]=useState([]);
  const[topScorers,setTopScorers]=useState([]);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState(null);
  const[selected,setSelected]=useState(null);
  const[compareMode,setCompareMode]=useState(false);
  const[comparing,setComparing]=useState([]);
  const[showCompare,setShowCompare]=useState(false);
  const[search,setSearch]=useState("");
  const[league,setLeague]=useState("");
  const[position,setPosition]=useState("");
  const[sortBy,setSortBy]=useState("goals");
  const debounce=useRef(null);

  useEffect(()=>{
    fetch(BACKEND+"/api/players/top-scorers?limit=12")
      .then(r=>r.json()).then(d=>setTopScorers(Array.isArray(d)?d:[])).catch(()=>{});
  },[]);

  useEffect(()=>{
    clearTimeout(debounce.current);
    debounce.current=setTimeout(()=>{
      const p=new URLSearchParams({limit:60,offset:0});
      if(search)   p.set("search",search);
      if(league)   p.set("league",league);
      if(position) p.set("position",position);
      setLoading(true); setError(null);
      fetch(BACKEND+"/api/players/?"+p)
        .then(r=>{ if(!r.ok)throw new Error("HTTP "+r.status); return r.json(); })
        .then(d=>setPlayers(d.players||[]))
        .catch(e=>setError(e.message))
        .finally(()=>setLoading(false));
    },350);
  },[search,league,position]);

  const sorted=[...players].sort((a,b)=>(b[sortBy]||0)-(a[sortBy]||0));

  function handleCompare(p){
    setComparing(prev=>{
      if(prev.some(x=>x.id===p.id)) return prev.filter(x=>x.id!==p.id);
      if(prev.length>=2) return[prev[1],p];
      return[...prev,p];
    });
  }

  const SORT_OPTS=[{k:"goals",l:"Goals"},{k:"assists",l:"Assists"},{k:"appearances",l:"Apps"},{k:"minutes",l:"Minutes"},{k:"ict_index",l:"ICT Index"},{k:"rating",l:"Rating"}];

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Sora',sans-serif"}}>
      <style>{"@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}"}</style>

      {selected&&<ProfilePanel player={selected} onClose={()=>setSelected(null)}/>}
      {showCompare&&comparing.length===2&&<CompareModal a={comparing[0]} b={comparing[1]} onClose={()=>setShowCompare(false)}/>}

      <div style={{maxWidth:1280,margin:"0 auto",padding:"0 20px 80px"}}>
        {/* Header */}
        <div style={{padding:"28px 0 22px",borderBottom:"1px solid rgba(255,255,255,0.045)",marginBottom:24}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:4,height:48,borderRadius:2,background:"linear-gradient(180deg,#38bdf8,#34d399)",flexShrink:0}}/>
              <div>
                <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:27,fontWeight:900,color:C.text,margin:0,letterSpacing:"-0.03em"}}>Player Database</h1>
                <p style={{fontFamily:"'Inter',sans-serif",fontSize:12,color:C.dim,margin:"3px 0 0",fontWeight:600}}>
                  Top 5 leagues · Goals, assists, ratings, per 90 metrics · Click any player for full stats
                </p>
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <button onClick={()=>setCompareMode(m=>!m)}
                style={{padding:"8px 15px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:800,fontFamily:"'Inter',sans-serif",
                  background:compareMode?"rgba(56,189,248,0.12)":"rgba(255,255,255,0.04)",
                  border:compareMode?"1.5px solid rgba(56,189,248,0.45)":"1.5px solid rgba(255,255,255,0.08)",
                  color:compareMode?C.accent:C.muted,transition:"all 0.15s",
                  boxShadow:compareMode?"0 0 14px rgba(56,189,248,0.18)":"none"}}>
                {compareMode?"Cancel":"Compare Players"}
              </button>
              {compareMode&&comparing.length===2&&(
                <button onClick={()=>setShowCompare(true)}
                  style={{padding:"8px 16px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:800,background:C.accent,color:"#000",border:"none",fontFamily:"'Inter',sans-serif"}}>
                  Compare ({comparing[0].name.split(" ").pop()} vs {comparing[1].name.split(" ").pop()}) →
                </button>
              )}
              {compareMode&&comparing.length>0&&comparing.length<2&&(
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.accent,fontWeight:700}}>Select 1 more</span>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
          {/* Search */}
          <div style={{position:"relative",flex:"1 1 220px",minWidth:180}}>
            <svg style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search player or team..."
              style={{width:"100%",padding:"9px 12px 9px 30px",borderRadius:11,boxSizing:"border-box",
                background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",
                color:C.text,fontFamily:"'Inter',sans-serif",fontSize:12,outline:"none"}}
              onFocus={e=>e.target.style.borderColor=C.accent+"55"}
              onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.08)"}/>
          </div>
          {/* League */}
          <select value={league} onChange={e=>setLeague(e.target.value)}
            style={{padding:"9px 12px",borderRadius:11,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:C.muted,fontSize:12,fontFamily:"'Inter',sans-serif",cursor:"pointer",outline:"none"}}>
            {LEAGUE_OPTS.map(l=><option key={l.key} value={l.key} style={{background:"#0a1020"}}>{l.label}</option>)}
          </select>
          {/* Position */}
          <select value={position} onChange={e=>setPosition(e.target.value)}
            style={{padding:"9px 12px",borderRadius:11,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:C.muted,fontSize:12,fontFamily:"'Inter',sans-serif",cursor:"pointer",outline:"none"}}>
            {POS_OPTS.map(p=><option key={p} value={p} style={{background:"#0a1020"}}>{p||"All Positions"}</option>)}
          </select>
          {/* Sort */}
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
            style={{padding:"9px 12px",borderRadius:11,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:C.muted,fontSize:12,fontFamily:"'Inter',sans-serif",cursor:"pointer",outline:"none"}}>
            {SORT_OPTS.map(s=><option key={s.k} value={s.k} style={{background:"#0a1020"}}>Sort: {s.l}</option>)}
          </select>
        </div>

        {error&&<div style={{padding:"12px 16px",borderRadius:10,marginBottom:16,background:"rgba(248,113,113,0.06)",border:"1px solid rgba(248,113,113,0.2)",fontFamily:"'Inter',sans-serif",fontSize:12,color:C.red}}>{error}</div>}

        {/* Two column layout */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:20,alignItems:"start"}}>
          {/* Player list */}
          <div>
            {!loading&&!error&&sorted.length>0&&(
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.dim,fontWeight:700}}>{sorted.length} players</span>
                {compareMode&&<span style={{fontSize:10,color:C.accent,fontWeight:700,fontFamily:"'Inter',sans-serif"}}>· Compare mode: tap to select</span>}
              </div>
            )}
            {loading&&<div style={{display:"flex",flexDirection:"column",gap:9}}>{[1,2,3,4,5,6,7,8].map(i=><Skeleton key={i} h={70} r={14}/>)}</div>}
            {!loading&&sorted.length===0&&!error&&(
              <div style={{padding:"56px 20px",textAlign:"center",color:C.dim,fontFamily:"'Inter',sans-serif",fontSize:13}}>
                {search||league||position?"No players found. Try adjusting your filters.":"Start searching or select a league above."}
              </div>
            )}
            {!loading&&sorted.length>0&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {sorted.map(p=>(
                  <PlayerRow key={p.id} player={p}
                    onClick={setSelected}
                    compareMode={compareMode}
                    onCompare={handleCompare}
                    comparing={comparing}/>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar: top scorers */}
          <div style={{position:"sticky",top:20}}>
            <div style={{borderRadius:16,overflow:"hidden",background:C.card,border:"1px solid rgba(255,255,255,0.065)"}}>
              <div style={{height:2,background:"linear-gradient(90deg,"+C.red+",transparent)"}}/>
              <div style={{padding:"13px 15px",borderBottom:"1px solid rgba(255,255,255,0.055)",display:"flex",alignItems:"center",gap:9}}>
                <div style={{width:3,height:18,borderRadius:2,background:"linear-gradient(180deg,"+C.red+",transparent)"}}/>
                <span style={{fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:900,color:C.text}}>Top Scorers</span>
              </div>
              {topScorers.length===0&&<div style={{padding:"20px 15px",fontFamily:"'Inter',sans-serif",fontSize:11,color:C.dim,textAlign:"center"}}>Loading…</div>}
              {topScorers.map((p,i)=>(
                <div key={p.id} onClick={()=>setSelected(p)}
                  style={{display:"flex",gap:9,padding:"9px 13px",cursor:"pointer",
                    borderBottom:i<topScorers.length-1?"1px solid rgba(255,255,255,0.035)":"none",
                    transition:"background 0.12s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:900,color:C.dim,width:18,flexShrink:0,paddingTop:1}}>{i+1}</span>
                  {p.photo&&<img src={p.photo} alt={p.name} style={{width:28,height:28,borderRadius:"50%",objectFit:"cover",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>}
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:700,color:C.text,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</p>
                    <p style={{fontFamily:"'Inter',sans-serif",fontSize:9,color:C.muted,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.team}</p>
                  </div>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:900,color:C.red,flexShrink:0}}>{p.goals}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}