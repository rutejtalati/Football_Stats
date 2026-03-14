// pages/PlayerProfile.jsx — StatinSite Stats Hub
// Top scorers, assisters, ratings, teams, clean sheets across all 5 leagues.
import { useState, useEffect, useRef, useCallback } from "react";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "https://football-stats-lw4b.onrender.com";

// ── Design tokens ────────────────────────────────────────────
const C = {
  bg:"#000810", card:"rgba(9,15,28,0.98)", border:"rgba(255,255,255,0.065)",
  text:"#f0f6ff", muted:"#5a7a9a", dim:"#1a3a5a", soft:"#c8d8f0",
  blue:"#38bdf8", green:"#34d399", amber:"#f59e0b", red:"#f87171",
  purple:"#a78bfa", orange:"#fb923c", pink:"#f472b6",
};

const LEAGUES = [
  {key:"all",label:"All Leagues",color:C.muted},
  {key:"epl",label:"Premier League",color:C.blue},
  {key:"laliga",label:"La Liga",color:C.amber},
  {key:"seriea",label:"Serie A",color:C.green},
  {key:"bundesliga",label:"Bundesliga",color:C.orange},
  {key:"ligue1",label:"Ligue 1",color:C.purple},
];

const LEAGUE_COLORS = {epl:C.blue,laliga:C.amber,seriea:C.green,bundesliga:C.orange,ligue1:C.purple,general:C.muted};
const LEAGUE_ABBR   = {epl:"EPL",laliga:"LAL",seriea:"SA",bundesliga:"BUN",ligue1:"L1"};

const POS_COLOR = p => {
  const l=(p||"").toLowerCase();
  if(l.includes("goal"))  return C.amber;
  if(l.includes("defend"))return C.green;
  if(l.includes("mid"))   return C.blue;
  if(l.includes("attack")||l.includes("forward")) return C.red;
  return C.muted;
};

function timeAgo(ts){if(!ts)return"";const m=Math.floor((Date.now()-new Date(ts))/60000);if(m<60)return m+"m ago";if(m<1440)return Math.floor(m/60)+"h ago";return Math.floor(m/1440)+"d ago";}

function useReveal(){
  const ref=useRef(null);const[vis,setVis]=useState(false);
  useEffect(()=>{if(!ref.current)return;const io=new IntersectionObserver(([e])=>{if(e.isIntersecting){setVis(true);io.disconnect();}},{threshold:0.05});io.observe(ref.current);return()=>io.disconnect();},[]);
  return[ref,vis];
}

function Skeleton({h=48,r=10}){
  return <div style={{height:h,borderRadius:r,background:"linear-gradient(90deg,rgba(255,255,255,0.025) 0%,rgba(255,255,255,0.055) 50%,rgba(255,255,255,0.025) 100%)",backgroundSize:"400% 100%",animation:"shimmer 1.5s ease-in-out infinite"}}/>;
}

function LeagueChip({league,color}){
  if(!league)return null;
  const abbr=LEAGUE_ABBR[league]||league.slice(0,3).toUpperCase();
  return <span style={{fontSize:8,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",color:color||C.muted,background:(color||C.muted)+"12",border:"1px solid "+(color||C.muted)+"25",borderRadius:4,padding:"1px 5px",flexShrink:0}}>{abbr}</span>;
}

// ── Bar ──────────────────────────────────────────────────────
function Bar({value=0,max=1,color=C.blue}){
  const pct=Math.min(100,max>0?Math.round(value/max*100):0);
  return(
    <div style={{flex:1,height:4,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
      <div style={{height:"100%",width:pct+"%",background:color,borderRadius:999,transition:"width 0.6s cubic-bezier(.22,1,.36,1)"}}/>
    </div>
  );
}

// ── Form pills ───────────────────────────────────────────────
function FormPills({form}){
  if(!form)return null;
  return(
    <div style={{display:"flex",gap:2}}>
      {form.split("").slice(-5).map((c,i)=>(
        <span key={i} style={{width:14,height:14,borderRadius:3,fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center",
          background:c==="W"?"rgba(52,211,153,0.25)":c==="D"?"rgba(245,158,11,0.2)":"rgba(248,113,113,0.2)",
          color:c==="W"?C.green:c==="D"?C.amber:C.red}}>{c}</span>
      ))}
    </div>
  );
}

// ── Rank badge ───────────────────────────────────────────────
function Rank({n,medal=false}){
  const colors=["#f2c94c","#94a3b8","#fb923c"];
  const c=medal&&n<=3?colors[n-1]:C.dim;
  return <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:900,color:c,width:24,textAlign:"right",flexShrink:0}}>{n}</span>;
}

// ── Player row in leaderboard ─────────────────────────────────
function PlayerRow({player,rank,statKey,statLabel,statColor,maxVal,onClick}){
  const[hov,setHov]=useState(false);
  const[ref,vis]=useReveal();
  const ac=POS_COLOR(player.position);
  const lc=LEAGUE_COLORS[player.league_slug]||C.muted;
  const val=player[statKey]||0;

  return(
    <div ref={ref}
      onClick={()=>onClick(player)}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:12,cursor:"pointer",
        background:hov?"rgba(12,20,38,0.99)":C.card,
        border:hov?"1px solid "+ac+"35":"1px solid "+C.border,
        transform:hov?"translateY(-1px)":vis?"translateY(0)":"translateY(8px)",
        opacity:vis?1:0,transition:"all 0.2s cubic-bezier(.22,1,.36,1)"}}>
      <Rank n={rank} medal={true}/>
      {/* Photo */}
      <div style={{width:36,height:36,borderRadius:"50%",overflow:"hidden",flexShrink:0,border:"1.5px solid "+ac+"30",background:ac+"10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:ac}}>
        {player.photo?<img src={player.photo} alt={player.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.currentTarget.style.display="none"}/>:(player.name||"?")[0]}
      </div>
      {/* Info */}
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
          <span style={{fontSize:8,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",color:ac,background:ac+"0f",border:"1px solid "+ac+"22",borderRadius:4,padding:"1px 5px",flexShrink:0}}>{player.position||"—"}</span>
          <LeagueChip league={player.league_slug} color={lc}/>
        </div>
        <p style={{fontFamily:"'Sora',sans-serif",fontSize:12.5,fontWeight:800,color:hov?C.text:C.soft,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{player.name}</p>
        <div style={{display:"flex",gap:5,alignItems:"center",marginTop:1}}>
          {player.team_logo&&<img src={player.team_logo} alt="" style={{width:11,height:11,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
          <span style={{fontFamily:"'Inter',sans-serif",fontSize:10,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{player.team}</span>
        </div>
      </div>
      {/* Bar + value */}
      <div style={{display:"flex",alignItems:"center",gap:8,minWidth:120,flexShrink:0}}>
        <Bar value={val} max={maxVal} color={statColor}/>
        <div style={{textAlign:"right",minWidth:36}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:15,fontWeight:900,color:statColor,lineHeight:1}}>{typeof val==="number"&&val%1!==0?val.toFixed(2):val}</div>
          <div style={{fontSize:8,fontWeight:800,color:C.dim,letterSpacing:"0.08em",textTransform:"uppercase"}}>{statLabel}</div>
        </div>
      </div>
    </div>
  );
}

// ── Team row ─────────────────────────────────────────────────
function TeamRow({team,rank,statKey,statLabel,statColor,maxVal,onClick}){
  const[hov,setHov]=useState(false);
  const[ref,vis]=useReveal();
  const lc=LEAGUE_COLORS[team.league_slug]||C.muted;
  const val=team[statKey]||0;

  return(
    <div ref={ref}
      onClick={()=>onClick(team)}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:12,cursor:"pointer",
        background:hov?"rgba(12,20,38,0.99)":C.card,
        border:hov?"1px solid "+lc+"35":"1px solid "+C.border,
        transform:hov?"translateY(-1px)":vis?"translateY(0)":"translateY(8px)",
        opacity:vis?1:0,transition:"all 0.2s cubic-bezier(.22,1,.36,1)"}}>
      <Rank n={rank} medal={true}/>
      <div style={{width:32,height:32,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        {team.team_logo?<img src={team.team_logo} alt={team.team} style={{width:28,height:28,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>:<div style={{width:28,height:28,borderRadius:6,background:lc+"18",border:"1px solid "+lc+"25"}}/>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
          <LeagueChip league={team.league_slug} color={lc}/>
          <FormPills form={team.form}/>
        </div>
        <p style={{fontFamily:"'Sora',sans-serif",fontSize:12.5,fontWeight:800,color:hov?C.text:C.soft,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{team.team}</p>
        <span style={{fontFamily:"'Inter',sans-serif",fontSize:9,color:C.dim}}>{team.played}PL · {team.wins}W {team.draws}D {team.losses}L</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,minWidth:120,flexShrink:0}}>
        <Bar value={val} max={maxVal} color={statColor}/>
        <div style={{textAlign:"right",minWidth:36}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:15,fontWeight:900,color:statColor,lineHeight:1}}>{typeof val==="number"&&val%1!==0?val.toFixed(2):val}</div>
          <div style={{fontSize:8,fontWeight:800,color:C.dim,letterSpacing:"0.08em",textTransform:"uppercase"}}>{statLabel}</div>
        </div>
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────
function Section({title,icon,color,children,loading,count}){
  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <div style={{width:3,height:32,borderRadius:2,background:"linear-gradient(180deg,"+color+",transparent)",flexShrink:0}}/>
        <div style={{flex:1}}>
          <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:900,color:C.text,margin:0,letterSpacing:"-0.02em"}}>{icon} {title}</h2>
        </div>
        {count!=null&&<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.dim,fontWeight:700}}>{count}</span>}
      </div>
      {loading?(
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {[1,2,3,4,5].map(i=><Skeleton key={i} h={58} r={12}/>)}
        </div>
      ):children}
    </div>
  );
}

// ── Player detail slide-in ────────────────────────────────────
function PlayerDetail({player,onClose}){
  const ac=POS_COLOR(player.position);
  const lc=LEAGUE_COLORS[player.league_slug]||C.muted;
  const min=player.minutes||1;

  const rows=[
    {l:"Goals",v:player.goals,max:35,c:C.red},
    {l:"Assists",v:player.assists,max:25,c:C.green},
    {l:"Shots",v:player.shots_total,max:200,c:C.blue},
    {l:"On Target",v:player.shots_on,max:100,c:C.blue},
    {l:"Key Passes",v:player.passes_key,max:100,c:C.amber},
    {l:"Dribbles",v:player.dribbles_success,max:120,c:C.purple},
    {l:"Tackles",v:player.tackles_total,max:150,c:C.green},
    {l:"Duels Won",v:player.duels_won,max:400,c:C.muted},
  ];

  return(
    <div style={{position:"fixed",inset:0,zIndex:1100,display:"flex",alignItems:"flex-start",justifyContent:"flex-end",padding:16,pointerEvents:"none"}}>
      <div style={{width:340,maxHeight:"calc(100vh - 32px)",overflowY:"auto",pointerEvents:"auto",
        borderRadius:20,background:"rgba(4,9,20,0.99)",border:"1px solid "+ac+"28",
        boxShadow:"0 0 40px "+ac+"14,0 32px 80px rgba(0,0,0,0.8)",
        animation:"slideIn 0.22s cubic-bezier(.22,1,.36,1)",scrollbarWidth:"thin"}}>
        <div style={{height:2,background:"linear-gradient(90deg,"+ac+",transparent)"}}/>
        <div style={{padding:"16px 16px 0",display:"flex",gap:10,alignItems:"flex-start"}}>
          <div style={{width:56,height:56,borderRadius:"50%",overflow:"hidden",flexShrink:0,border:"2px solid "+ac+"35",background:ac+"10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:900,color:ac}}>
            {player.photo?<img src={player.photo} alt={player.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.currentTarget.style.display="none"}/>:(player.name||"?")[0]}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:900,color:C.text,margin:"0 0 4px",lineHeight:1.2}}>{player.name}</h2>
            <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:8,fontWeight:900,textTransform:"uppercase",color:ac,background:ac+"10",border:"1px solid "+ac+"22",borderRadius:4,padding:"2px 5px"}}>{player.position}</span>
              <LeagueChip league={player.league_slug} color={lc}/>
              <span style={{fontSize:9,color:C.muted}}>{player.nationality}</span>
              {player.age&&<span style={{fontSize:9,color:C.dim}}>Age {player.age}</span>}
            </div>
            <div style={{display:"flex",gap:5,alignItems:"center",marginTop:4}}>
              {player.team_logo&&<img src={player.team_logo} alt="" style={{width:14,height:14,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
              <span style={{fontFamily:"'Sora',sans-serif",fontSize:10,fontWeight:700,color:C.muted}}>{player.team}</span>
            </div>
          </div>
          <button onClick={onClose} style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:C.muted,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.12)";e.currentTarget.style.color=C.text;}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color=C.muted;}}>✕</button>
        </div>
        {/* Key stats */}
        <div style={{padding:"12px 16px",display:"flex",gap:6,flexWrap:"wrap"}}>
          {[{l:"Goals",v:player.goals,c:C.red},{l:"Assists",v:player.assists,c:C.green},{l:"Apps",v:player.appearances,c:C.blue},{l:"Mins",v:player.minutes,c:C.muted},player.rating&&{l:"Rating",v:Number(player.rating).toFixed(1),c:C.amber}].filter(Boolean).map(s=>(
            <div key={s.l} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"8px 10px",borderRadius:10,background:"rgba(255,255,255,0.025)",border:"1px solid "+s.c+"1a",minWidth:56}}>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:15,fontWeight:900,color:s.c,lineHeight:1}}>{s.v??0}</span>
              <span style={{fontSize:7,fontWeight:800,color:C.dim,letterSpacing:"0.1em",textTransform:"uppercase"}}>{s.l}</span>
            </div>
          ))}
        </div>
        {/* Season bars */}
        <div style={{padding:"0 16px 12px"}}>
          <div style={{fontSize:8,fontWeight:900,color:ac,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Season Statistics</div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {rows.map(r=>(
              <div key={r.l} style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:10,color:C.muted,width:80,flexShrink:0,textAlign:"right"}}>{r.l}</span>
                <Bar value={r.v||0} max={r.max} color={r.c}/>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:r.c,width:24,textAlign:"right",fontWeight:700,flexShrink:0}}>{r.v||0}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Per 90 */}
        {player.minutes>90&&(
          <div style={{margin:"0 16px 16px",padding:"12px 14px",borderRadius:12,background:"rgba(255,255,255,0.018)",border:"1px solid "+ac+"14"}}>
            <div style={{fontSize:8,fontWeight:900,color:ac,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>Per 90 Minutes</div>
            <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
              {[{l:"Goals",v:player.goals_per90},{l:"Assists",v:player.assists_per90},{l:"Shots",v:player.shots_per90}].map(s=>(
                <div key={s.l}>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:900,color:ac}}>{(s.v||0).toFixed(2)}</div>
                  <div style={{fontSize:7,fontWeight:800,color:C.dim,letterSpacing:"0.08em",textTransform:"uppercase"}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Cards */}
        <div style={{margin:"0 16px 16px",display:"flex",gap:8}}>
          <div style={{flex:1,padding:"8px",borderRadius:10,background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",textAlign:"center"}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,fontWeight:900,color:C.amber}}>{player.yellow_cards||0}</div>
            <div style={{fontSize:7,fontWeight:800,color:C.dim,letterSpacing:"0.1em",textTransform:"uppercase"}}>Yellow</div>
          </div>
          <div style={{flex:1,padding:"8px",borderRadius:10,background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.2)",textAlign:"center"}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,fontWeight:900,color:C.red}}>{player.red_cards||0}</div>
            <div style={{fontSize:7,fontWeight:800,color:C.dim,letterSpacing:"0.1em",textTransform:"uppercase"}}>Red</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Team detail ───────────────────────────────────────────────
function TeamDetail({team,onClose}){
  const lc=LEAGUE_COLORS[team.league_slug]||C.muted;
  return(
    <div style={{position:"fixed",inset:0,zIndex:1100,display:"flex",alignItems:"flex-start",justifyContent:"flex-end",padding:16,pointerEvents:"none"}}>
      <div style={{width:320,maxHeight:"calc(100vh - 32px)",overflowY:"auto",pointerEvents:"auto",
        borderRadius:20,background:"rgba(4,9,20,0.99)",border:"1px solid "+lc+"28",
        boxShadow:"0 0 40px "+lc+"14,0 32px 80px rgba(0,0,0,0.8)",
        animation:"slideIn 0.22s cubic-bezier(.22,1,.36,1)"}}>
        <div style={{height:2,background:"linear-gradient(90deg,"+lc+",transparent)"}}/>
        <div style={{padding:"16px"}}>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:14}}>
            {team.team_logo&&<img src={team.team_logo} alt={team.team} style={{width:44,height:44,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
            <div style={{flex:1,minWidth:0}}>
              <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:900,color:C.text,margin:"0 0 3px"}}>{team.team}</h2>
              <div style={{display:"flex",gap:5,alignItems:"center"}}>
                <LeagueChip league={team.league_slug} color={lc}/>
                <span style={{fontSize:9,color:C.dim}}>#{team.rank}</span>
                <FormPills form={team.form}/>
              </div>
            </div>
            <button onClick={onClose} style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:C.muted,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.12)";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";}}>✕</button>
          </div>
          {/* Record */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:14}}>
            {[{l:"W",v:team.wins,c:C.green},{l:"D",v:team.draws,c:C.amber},{l:"L",v:team.losses,c:C.red},{l:"PTS",v:team.points,c:C.blue}].map(s=>(
              <div key={s.l} style={{textAlign:"center",padding:"8px 4px",borderRadius:10,background:"rgba(255,255,255,0.025)",border:"1px solid "+s.c+"1a"}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,fontWeight:900,color:s.c}}>{s.v}</div>
                <div style={{fontSize:7,fontWeight:800,color:C.dim,letterSpacing:"0.1em",textTransform:"uppercase"}}>{s.l}</div>
              </div>
            ))}
          </div>
          {/* Stats */}
          {[{l:"Goals Scored",v:team.goals_for,max:100,c:C.red},{l:"Goals Conceded",v:team.goals_against,max:80,c:C.muted},{l:"Clean Sheets",v:team.clean_sheets,max:20,c:C.green},{l:"Goals/Game",v:team.goals_per_game,max:4,c:C.amber},{l:"Conceded/Game",v:team.conceded_per_game,max:3,c:C.red},{l:"Win Rate",v:team.win_rate+"%",max:100,c:C.blue}].map(s=>(
            <div key={s.l} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{fontSize:10,color:C.muted,width:110,flexShrink:0,textAlign:"right"}}>{s.l}</span>
              <Bar value={parseFloat(s.v)||0} max={s.max} color={s.c}/>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:s.c,width:32,textAlign:"right",fontWeight:700,flexShrink:0}}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────
function TabBtn({label,active,color,onClick}){
  const[hov,setHov]=useState(false);
  return(
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{padding:"7px 14px",borderRadius:20,border:active?"1.5px solid "+(color||C.blue)+"55":"1.5px solid rgba(255,255,255,0.07)",
        background:active?(color||C.blue)+"12":"rgba(255,255,255,0.025)",
        color:active?(color||C.blue):hov?C.soft:C.muted,
        fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:800,letterSpacing:"0.04em",
        cursor:"pointer",transition:"all .15s ease",whiteSpace:"nowrap",flexShrink:0,
        boxShadow:active?"0 0 14px "+(color||C.blue)+"18":"none"}}>
      {active&&<span style={{width:5,height:5,borderRadius:"50%",background:color||C.blue,boxShadow:"0 0 6px "+(color||C.blue),display:"inline-block",marginRight:5,verticalAlign:"middle"}}/>}
      {label}
    </button>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
export default function PlayerProfilePage(){
  const[tab,setTab]=useState("scorers");
  const[league,setLeague]=useState("all");
  const[data,setData]=useState({});
  const[loading,setLoading]=useState({});
  const[selected,setSelected]=useState(null);
  const[selectedType,setSelectedType]=useState(null); // "player"|"team"
  const[search,setSearch]=useState("");
  const[searchResults,setSearchResults]=useState([]);
  const[searching,setSearching]=useState(false);
  const debounce=useRef(null);

  const TABS=[
    {key:"scorers",    label:"Top Scorers",    color:C.red,    endpoint:"/api/players/top-scorers",        statKey:"goals",      statLabel:"Goals",    statColor:C.red},
    {key:"assisters",  label:"Most Assists",   color:C.green,  endpoint:"/api/players/top-assisters",      statKey:"assists",    statLabel:"Assists",  statColor:C.green},
    {key:"rated",      label:"Best Rated",     color:C.amber,  endpoint:"/api/players/top-rated",          statKey:"rating",     statLabel:"Rating",   statColor:C.amber},
    {key:"contrib",    label:"Goal Involvmt",  color:C.blue,   endpoint:"/api/players/top-contributors",   statKey:"goal_contributions",statLabel:"G+A",statColor:C.blue},
    {key:"shots",      label:"Most Shots",     color:C.purple, endpoint:"/api/players/most-shots",         statKey:"shots_total",statLabel:"Shots",    statColor:C.purple},
    {key:"tackles",    label:"Top Tacklers",   color:C.orange, endpoint:"/api/players/top-tacklers",       statKey:"tackles_total",statLabel:"Tackles",statColor:C.orange},
    {key:"teamgoals",  label:"Team Goals",     color:C.red,    endpoint:"/api/players/teams/most-goals",   statKey:"goals_for",  statLabel:"Goals",    statColor:C.red,  isTeam:true},
    {key:"defence",    label:"Best Defence",   color:C.green,  endpoint:"/api/players/teams/best-defence", statKey:"goals_against",statLabel:"Conceded",statColor:C.green,isTeam:true},
    {key:"cleansheets",label:"Clean Sheets",   color:C.blue,   endpoint:"/api/players/teams/most-clean-sheets",statKey:"clean_sheets",statLabel:"CS",statColor:C.blue,isTeam:true},
    {key:"form",       label:"Best Form",      color:C.amber,  endpoint:"/api/players/teams/form",         statKey:"points",     statLabel:"Pts",      statColor:C.amber,isTeam:true},
  ];

  const currentTab=TABS.find(t=>t.key===tab)||TABS[0];
  const leagueParam=league==="all"?"":league;

  const loadTab=useCallback(async(tabKey,lg)=>{
    const t=TABS.find(x=>x.key===tabKey);
    if(!t)return;
    const cacheKey=tabKey+":"+lg;
    if(data[cacheKey])return;
    setLoading(l=>({...l,[cacheKey]:true}));
    try{
      const url=BACKEND+t.endpoint+(lg&&lg!=="all"?"?league="+lg+"&limit=20":"?limit=20");
      const res=await fetch(url);
      if(!res.ok)throw new Error("HTTP "+res.status);
      const raw=await res.json();
      setData(d=>({...d,[cacheKey]:Array.isArray(raw)?raw:(raw.teams||raw.players||[])}));
    }catch(e){setData(d=>({...d,[cacheKey]:[]}));}
    setLoading(l=>({...l,[cacheKey]:false}));
  },[data]);

  useEffect(()=>{loadTab(tab,league);},[tab,league]);

  // Search
  useEffect(()=>{
    clearTimeout(debounce.current);
    if(!search.trim()){setSearchResults([]);return;}
    setSearching(true);
    debounce.current=setTimeout(async()=>{
      try{
        const res=await fetch(BACKEND+"/api/players/search?q="+encodeURIComponent(search));
        const raw=await res.json();
        setSearchResults(Array.isArray(raw)?raw:[]);
      }catch{setSearchResults([]);}
      setSearching(false);
    },350);
  },[search]);

  const cacheKey=tab+":"+league;
  const rows=data[cacheKey]||[];
  const isLoading=loading[cacheKey];
  const maxVal=rows.length>0?Math.max(...rows.map(r=>parseFloat(r[currentTab.statKey])||0),1):1;

  const PLAYER_TABS=TABS.filter(t=>!t.isTeam);
  const TEAM_TABS=TABS.filter(t=>t.isTeam);

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Sora',sans-serif",backgroundImage:"linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)",backgroundSize:"80px 80px",backgroundAttachment:"fixed"}}>
      <style>{"@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}"}</style>

      {selected&&selectedType==="player"&&<PlayerDetail player={selected} onClose={()=>setSelected(null)}/>}
      {selected&&selectedType==="team"&&<TeamDetail team={selected} onClose={()=>setSelected(null)}/>}
      {/* Search overlay */}
      {search&&(
        <div style={{position:"fixed",top:"calc(48px + 8px)",left:"50%",transform:"translateX(-50%)",width:"min(560px,90vw)",zIndex:800,borderRadius:16,background:"rgba(4,9,20,0.99)",border:"1px solid rgba(255,255,255,0.1)",boxShadow:"0 24px 60px rgba(0,0,0,0.7)",overflow:"hidden"}}>
          <div style={{padding:"8px 12px 12px"}}>
            <div style={{fontSize:9,fontWeight:900,color:C.dim,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8,paddingLeft:4}}>Search Results</div>
            {searching&&[1,2,3].map(i=><Skeleton key={i} h={44} r={8}/>)}
            {!searching&&searchResults.length===0&&<p style={{fontFamily:"'Inter',sans-serif",fontSize:12,color:C.dim,padding:"8px 4px",margin:0}}>No players found for "{search}"</p>}
            {!searching&&searchResults.map(p=>(
              <div key={p.id} onClick={()=>{setSelected(p);setSelectedType("player");setSearch("");}}
                style={{display:"flex",gap:10,alignItems:"center",padding:"8px 8px",borderRadius:10,cursor:"pointer",transition:"background .12s"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{width:32,height:32,borderRadius:"50%",overflow:"hidden",flexShrink:0,background:POS_COLOR(p.position)+"10",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:POS_COLOR(p.position)}}>
                  {p.photo?<img src={p.photo} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.currentTarget.style.display="none"}/>:(p.name||"?")[0]}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:700,color:C.soft,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</p>
                  <p style={{fontFamily:"'Inter',sans-serif",fontSize:10,color:C.muted,margin:0}}>{p.team} · {p.position}</p>
                </div>
                <div style={{display:"flex",gap:10,flexShrink:0}}>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:900,color:C.red}}>{p.goals}G</span>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:900,color:C.green}}>{p.assists}A</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{maxWidth:1200,margin:"0 auto",padding:"0 20px 80px"}}>
        {/* Header */}
        <div style={{padding:"28px 0 20px",borderBottom:"1px solid rgba(255,255,255,0.045)",marginBottom:22}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:4,height:48,borderRadius:2,background:"linear-gradient(180deg,#38bdf8,#34d399)",flexShrink:0}}/>
              <div>
                <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:27,fontWeight:900,color:C.text,margin:0,letterSpacing:"-0.03em"}}>Stats Hub</h1>
                <p style={{fontFamily:"'Inter',sans-serif",fontSize:12,color:C.dim,margin:"3px 0 0",fontWeight:600}}>Players & teams across all 5 European leagues · Goals, assists, ratings, clean sheets & more</p>
              </div>
            </div>
            {/* Search */}
            <div style={{position:"relative",width:"min(320px,100%)"}}>
              <svg style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search any player…"
                style={{width:"100%",padding:"9px 12px 9px 30px",borderRadius:11,boxSizing:"border-box",
                  background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",
                  color:C.text,fontFamily:"'Inter',sans-serif",fontSize:12,outline:"none"}}
                onFocus={e=>e.target.style.borderColor=C.blue+"55"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.08)"}/>
              {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center"}}>✕</button>}
            </div>
          </div>
        </div>

        {/* League filter */}
        <div style={{display:"flex",gap:6,marginBottom:20,overflowX:"auto",scrollbarWidth:"none",paddingBottom:2}}>
          {LEAGUES.map(l=>(
            <button key={l.key} onClick={()=>setLeague(l.key)}
              style={{padding:"6px 13px",borderRadius:20,border:league===l.key?"1.5px solid "+(l.color)+"55":"1.5px solid rgba(255,255,255,0.07)",
                background:league===l.key?l.color+"12":"rgba(255,255,255,0.025)",
                color:league===l.key?l.color:C.muted,fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:800,
                cursor:"pointer",transition:"all .15s",flexShrink:0,whiteSpace:"nowrap"}}>
              {l.label}
            </button>
          ))}
        </div>

        {/* Main grid */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:28}}>
          {/* Player stats */}
          <div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:9,fontWeight:900,color:C.dim,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>Player Rankings</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {PLAYER_TABS.map(t=>(
                  <TabBtn key={t.key} label={t.label} active={tab===t.key} color={t.color} onClick={()=>setTab(t.key)}/>
                ))}
              </div>
            </div>
            <Section title={currentTab.label} color={currentTab.color} loading={isLoading&&!currentTab.isTeam} count={rows.length>0&&!currentTab.isTeam?rows.length:null}>
              {!currentTab.isTeam&&rows.map((p,i)=>(
                <div key={p.id||i} style={{marginBottom:6}}>
                  <PlayerRow player={p} rank={i+1} statKey={currentTab.statKey} statLabel={currentTab.statLabel} statColor={currentTab.statColor} maxVal={maxVal} onClick={p=>{setSelected(p);setSelectedType("player");}}/>
                </div>
              ))}
              {!currentTab.isTeam&&!isLoading&&rows.length===0&&<p style={{fontFamily:"'Inter',sans-serif",fontSize:12,color:C.dim,padding:"20px 0",margin:0,textAlign:"center"}}>No data yet. First load may take a moment.</p>}
            </Section>
          </div>

          {/* Team stats */}
          <div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:9,fontWeight:900,color:C.dim,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>Team Rankings</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {TEAM_TABS.map(t=>(
                  <TabBtn key={t.key} label={t.label} active={tab===t.key} color={t.color} onClick={()=>setTab(t.key)}/>
                ))}
              </div>
            </div>
            {(() => {
              const teamTab=TEAM_TABS.find(t=>t.key===tab)||TEAM_TABS[0];
              const teamCacheKey=teamTab.key+":"+league;
              const teamRows=data[teamCacheKey]||[];
              const teamLoading=loading[teamCacheKey];
              const teamMax=teamRows.length>0?Math.max(...teamRows.map(r=>parseFloat(r[teamTab.statKey])||0),1):1;
              return(
                <Section title={teamTab.label} color={teamTab.color} loading={teamLoading} count={teamRows.length>0?teamRows.length:null}>
                  {teamRows.map((t,i)=>(
                    <div key={t.team_id||i} style={{marginBottom:6}}>
                      <TeamRow team={t} rank={i+1} statKey={teamTab.statKey} statLabel={teamTab.statLabel} statColor={teamTab.statColor} maxVal={teamMax} onClick={t=>{setSelected(t);setSelectedType("team");}}/>
                    </div>
                  ))}
                  {!teamLoading&&teamRows.length===0&&<p style={{fontFamily:"'Inter',sans-serif",fontSize:12,color:C.dim,padding:"20px 0",margin:0,textAlign:"center"}}>Loading team data...</p>}
                </Section>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}