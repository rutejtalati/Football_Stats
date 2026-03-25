// LeaguesPage.jsx — StatinSite · Neobrutalist Edition
// Design: #000 black · #e8ff47 yellow · #ff2744 red
// All data fetching, MiniStandings, MiniScorers, LeagueCard — logic 100% preserved.

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const BACKEND = "https://football-stats-lw4b.onrender.com";
const Y = #00fff0";
const K = "#000";
const R = "#ff2744";

const LEAGUES = [
  { id:"epl",        name:"Premier League", country:"England", shortName:"PL",  color:Y,        logo:"https://media.api-sports.io/football/leagues/39.png",  flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id:"laliga",     name:"La Liga",        country:"Spain",   shortName:"LL",  color:"#ff6600", logo:"https://media.api-sports.io/football/leagues/140.png", flag:"🇪🇸" },
  { id:"seriea",     name:"Serie A",        country:"Italy",   shortName:"SA",  color:"#00d4aa", logo:"https://media.api-sports.io/football/leagues/135.png", flag:"🇮🇹" },
  { id:"bundesliga", name:"Bundesliga",     country:"Germany", shortName:"BUN", color:"#ffcc00", logo:"https://media.api-sports.io/football/leagues/78.png",  flag:"🇩🇪" },
  { id:"ligue1",     name:"Ligue 1",        country:"France",  shortName:"L1",  color:"#b388ff", logo:"https://media.api-sports.io/football/leagues/61.png",  flag:"🇫🇷" },
];

function useLeagueData(leagueId) {
  const [standings, setStandings] = useState([]);
  const [scorers,   setScorers]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${BACKEND}/api/standings/${leagueId}`).then(r=>r.json()).catch(()=>[]),
      fetch(`${BACKEND}/api/topscorers/${leagueId}`).then(r=>r.json()).catch(()=>[]),
    ]).then(([s, sc]) => {
      setStandings(Array.isArray(s) ? s.slice(0, 5) : []);
      setScorers(Array.isArray(sc)  ? sc.slice(0, 3) : []);
      setLoading(false);
    });
  }, [leagueId]);
  return { standings, scorers, loading };
}

/* ─── Mini standings — neo style ────────────────────────── */
function MiniStandings({ standings, leagueId, accent }) {
  if (!standings.length) return (
    <div style={{ padding:"20px 0", textAlign:"center", color:"rgba(0,255,240,.2)", fontSize:10, fontFamily:"'DM Mono',monospace" }}>Loading table…</div>
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
      {/* Header */}
      <div style={{ display:"grid", gridTemplateColumns:"20px 1fr 24px 24px 24px 32px", gap:4, padding:"4px 6px", fontSize:7.5, fontWeight:900, letterSpacing:".12em", color:"rgba(0,255,240,.25)", textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>
        <span>#</span><span>Club</span>
        <span style={{textAlign:"center"}}>W</span>
        <span style={{textAlign:"center"}}>D</span>
        <span style={{textAlign:"center"}}>L</span>
        <span style={{textAlign:"center"}}>Pts</span>
      </div>
      {standings.map((row, i) => (
        <Link key={row.team_id||i} to={`/team/${row.team_id}/${leagueId}`} style={{ textDecoration:"none" }}>
          <div style={{
            display:"grid", gridTemplateColumns:"20px 1fr 24px 24px 24px 32px",
            gap:4, padding:"7px 6px",
            background: i===0 ? `rgba(0,255,240,.07)` : "transparent",
            borderLeft: i===0 ? `3px solid ${accent}` : "3px solid transparent",
            alignItems:"center", transition:"background .13s, border-color .13s",
            cursor:"pointer",
          }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(0,255,240,.05)";e.currentTarget.style.borderLeftColor=accent;}}
            onMouseLeave={e=>{e.currentTarget.style.background=i===0?"rgba(0,255,240,.07)":"transparent";e.currentTarget.style.borderLeftColor=i===0?accent:"transparent";}}
          >
            <span style={{fontSize:9,fontWeight:900,color:i===0?accent:"rgba(0,255,240,.25)",fontFamily:"'DM Mono',monospace"}}>{row.rank||i+1}</span>
            <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
              {row.team_logo&&<img src={row.team_logo} alt="" width={13} height={13} style={{objectFit:"contain",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>}
              <span style={{fontSize:11,fontWeight:700,color:i===0?"#fff":"rgba(0,255,240,.6)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Space Grotesk',sans-serif"}}>{row.team_name||row.team}</span>
            </div>
            {[row.win??row.wins??"-", row.draw??row.draws??"-", row.lose??row.losses??"-"].map((v,j)=>(
              <span key={j} style={{fontSize:9,fontWeight:700,color:"rgba(0,255,240,.3)",textAlign:"center",fontFamily:"'DM Mono',monospace"}}>{v}</span>
            ))}
            <span style={{fontSize:12,fontWeight:900,color:i===0?accent:Y,textAlign:"center",fontFamily:"'DM Mono',monospace",letterSpacing:".02em"}}>{row.points??row.pts??"-"}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ─── Mini scorers — neo style ───────────────────────────── */
function MiniScorers({ scorers, accent }) {
  if (!scorers.length) return (
    <div style={{ padding:"20px 0", textAlign:"center", color:"rgba(0,255,240,.2)", fontSize:10, fontFamily:"'DM Mono',monospace" }}>Loading scorers…</div>
  );
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      {scorers.map((p, i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 6px", background:"rgba(0,255,240,.02)", borderLeft:`3px solid ${i===0?accent:"rgba(0,255,240,.08)"}`, transition:"background .13s" }}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(0,255,240,.05)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(0,255,240,.02)"}
        >
          <span style={{ width:20, height:20, flexShrink:0, background:i===0?accent:"rgba(0,255,240,.08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:900, color:i===0?K:"rgba(0,255,240,.4)", fontFamily:"'DM Mono',monospace" }}>{i+1}</span>
          {p.photo&&<img src={p.photo} alt="" width={22} height={22} style={{borderRadius:"50%",objectFit:"cover",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:700,color:"rgba(0,255,240,.8)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Space Grotesk',sans-serif"}}>{p.player_name||p.name}</div>
            <div style={{fontSize:8,color:"rgba(0,255,240,.3)",fontWeight:600,fontFamily:"'DM Mono',monospace"}}>{p.team_name||p.team}</div>
          </div>
          <span style={{fontSize:20,fontWeight:900,color:i===0?accent:Y,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:".04em"}}>{p.goals??p.total??"-"}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── League card — neo style ────────────────────────────── */
function LeagueCard({ league }) {
  const { standings, scorers, loading } = useLeagueData(league.id);
  const [tab, setTab] = useState("table");
  const [hov, setHov] = useState(false);
  const acc = league.color;

  const predPath = league.id==="epl"?"premier-league":league.id==="laliga"?"la-liga":league.id==="seriea"?"serie-a":league.id==="ligue1"?"ligue-1":league.id;

  return (
    <div
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        background:K, border:`1px solid ${hov?acc:"rgba(0,255,240,.15)"}`,
        overflow:"hidden", display:"flex", flexDirection:"column",
        boxShadow:"none",
        transform:"none",
        transition:"all .15s",
      }}
    >
      {/* Top accent bar */}
      <div style={{height:1,background:acc}}/>

      {/* Header */}
      <div style={{ padding:"16px 18px 14px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid rgba(0,255,240,.06)" }}>
        <img src={league.logo} alt={league.name} width={36} height={36} style={{objectFit:"contain",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>
        <div style={{flex:1}}>
          <div style={{fontSize:18,fontWeight:900,color:Y,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:".06em",lineHeight:1}}>{league.name}</div>
          <div style={{fontSize:9,color:"rgba(0,255,240,.35)",fontWeight:600,marginTop:2,fontFamily:"'DM Mono',monospace"}}>{league.flag} {league.country}</div>
        </div>
        <Link to={`/league/${league.id}`} style={{
          padding:"6px 14px", background:"transparent",
          border:`1px solid ${acc}`, color:acc,
          fontSize:9,fontWeight:500,letterSpacing:".1em",textDecoration:"none",
          flexShrink:0,fontFamily:"'DM Mono',monospace",
          boxShadow:"none", transition:"all .12s",
        }}
          onMouseEnter={e=>{e.currentTarget.style.background=acc;e.currentTarget.style.color=K;}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=acc;e.currentTarget.style.transform="none";}}
        >
          FULL VIEW →
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, borderBottom:"1px solid rgba(0,255,240,.06)" }}>
        {[["table","Table"],["scorers","Top Scorers"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{
            flex:1, padding:"10px 0", background:"none", border:"none",
            borderBottom:tab===t?`1px solid ${acc}`:"1px solid transparent",
            color:tab===t?acc:"rgba(0,255,240,.25)",
            fontSize:9,fontWeight:900,letterSpacing:".12em",textTransform:"uppercase",
            cursor:"pointer",transition:"color .15s",fontFamily:"'DM Mono',monospace",
            marginBottom:-2,
          }}>{l}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding:"12px 12px 16px", flex:1 }}>
        {loading?(
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {[...Array(5)].map((_,i)=>(
              <div key={i} style={{height:20,background:"rgba(0,255,240,.03)",animation:"nbShimmer 1.3s ease infinite",animationDelay:`${i*.1}s`}}/>
            ))}
          </div>
        ):tab==="table"?(
          <MiniStandings standings={standings} leagueId={league.id} accent={acc}/>
        ):(
          <MiniScorers scorers={scorers} accent={acc}/>
        )}
      </div>

      {/* Footer CTA */}
      <div style={{ padding:"10px 12px 14px", borderTop:`2px solid rgba(0,255,240,.06)` }}>
        <Link to={`/predictions/${predPath}`} style={{
          display:"flex",alignItems:"center",justifyContent:"center",
          gap:6,padding:"9px",
          background:"transparent",border:"1px solid rgba(0,255,240,.1)",
          color:"rgba(0,255,240,.35)",
          fontSize:9,fontWeight:900,textDecoration:"none",
          fontFamily:"'DM Mono',monospace",letterSpacing:".1em",
          transition:"all .13s",
        }}
          onMouseEnter={e=>{e.currentTarget.style.background=acc;e.currentTarget.style.color=K;e.currentTarget.style.borderColor=acc;}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(0,255,240,.35)";e.currentTarget.style.borderColor="rgba(0,255,240,.12)";}}
        >
          ⚡ VIEW PREDICTIONS
        </Link>
      </div>
    </div>
  );
}

/* ─── Main page export ───────────────────────────────────── */
export default function LeaguesPage() {
  return (
    <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 20px 60px", background:"#000", minHeight:"100vh", fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif" }}>
      <style>{`
        @keyframes nbShimmer { 0%,100%{opacity:.2} 50%{opacity:.5} }
        
      `}</style>

      {/* Animated bg stripes */}
      {/* Grid from index.css body::after */}

      <div style={{position:"relative",zIndex:1}}>
        {/* Page header */}
        <div style={{ padding:"32px 0 24px", borderBottom:`4px solid ${Y}`, marginBottom:28 }}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"transparent",border:"1px solid rgba(0,255,240,.3)",color:"#00fff0",padding:"3px 10px",fontFamily:"'DM Mono',monospace",fontSize:8,letterSpacing:".2em",textTransform:"uppercase",marginBottom:14}}>
            <span style={{width:5,height:5,background:R,flexShrink:0}}/>
            COVERING {LEAGUES.length} COMPETITIONS
          </div>
          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
            <h1 style={{margin:0,fontSize:"clamp(44px,7vw,84px)",fontWeight:900,color:"#00fff0",fontFamily:"'Bebas Neue',sans-serif",letterSpacing:".04em",lineHeight:.88}}>
              Leagues
            </h1>
            {/* Quick jump */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {LEAGUES.map(l=>(
                <a key={l.id} href={`#league-${l.id}`} style={{
                  padding:"6px 14px",
                  background:"transparent",border:"1px solid rgba(0,255,240,.1)",
                  color:"rgba(0,255,240,.35)",
                  fontSize:9,fontWeight:900,textDecoration:"none",letterSpacing:".1em",
                  fontFamily:"'DM Mono',monospace",transition:"all .13s",
                }}
                  onMouseEnter={e=>{e.currentTarget.style.background=l.color;e.currentTarget.style.color=K;e.currentTarget.style.borderColor=l.color;}}
                  onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(0,255,240,.35)";e.currentTarget.style.borderColor="rgba(0,255,240,.15)";}}
                >
                  {l.flag} {l.shortName}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* League grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:16 }}>
          {LEAGUES.map(league=>(
            <div key={league.id} id={`league-${league.id}`}>
              <LeagueCard league={league}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}