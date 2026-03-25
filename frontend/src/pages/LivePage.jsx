// LivePage.jsx — StatinSite · Neobrutalist Edition
// Design: #0a0a0a black · #e8ff47 yellow · #ff2744 red
// Bebas Neue headings · DM Mono data · Space Grotesk body
// All data logic, calendar, filters, sidebar — 100% preserved.

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND = "https://football-stats-lw4b.onrender.com";

const Y = "#e8ff47";
const K = "#0a0a0a";
const R = "#ff2744";

/* ─── League registry — colours updated to neo palette ─── */
const LEAGUES = {
  epl:        { label:"Premier League", short:"PL", color:Y    },
  laliga:     { label:"La Liga",        short:"LL", color:"#ff6600" },
  seriea:     { label:"Serie A",        short:"SA", color:"#00d4aa" },
  bundesliga: { label:"Bundesliga",     short:"BL", color:"#ffcc00" },
  ligue1:     { label:"Ligue 1",        short:"L1", color:"#b388ff" },
};

const LEAGUE_FILTER = ["all","epl","laliga","seriea","bundesliga","ligue1"];
const LIVE_SET = new Set(["1H","2H","HT","ET","BT","P"]);
const FT_SET   = new Set(["FT","AET","PEN","AWD","WO"]);

/* ─── Pure helpers (unchanged logic) ──────────────────── */
function normalizeLeague(l) {
  if (!l) return "";
  const v = String(l).toLowerCase();
  if (v==="39"  || v.includes("premier"))                          return "epl";
  if (v==="140" || (v.includes("liga") && !v.includes("bundes"))) return "laliga";
  if (v==="135" || v.includes("serie"))                            return "seriea";
  if (v==="78"  || v.includes("bundes"))                           return "bundesliga";
  if (v==="61"  || v.includes("ligue"))                            return "ligue1";
  return v;
}
function cardMode(status) {
  if (!status || status==="NS" || status==="TBD") return "scheduled";
  if (LIVE_SET.has(status)) return "live";
  if (FT_SET.has(status))   return "fulltime";
  return "scheduled";
}
function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
}
function fmtKickoffLabel(iso) {
  if (!iso) return "";
  const d=new Date(iso), now=new Date(), tom=new Date();
  tom.setDate(now.getDate()+1);
  const t=d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
  if (d.toDateString()===now.toDateString()) return t;
  if (d.toDateString()===tom.toDateString()) return `Tomorrow ${t}`;
  return d.toLocaleDateString([],{weekday:"short",day:"numeric",month:"short"})+` ${t}`;
}
function dayBucket(iso) {
  if (!iso) return "upcoming";
  const d=new Date(iso), now=new Date(), tom=new Date();
  tom.setDate(now.getDate()+1);
  if (d.toDateString()===now.toDateString()) return "today";
  if (d.toDateString()===tom.toDateString()) return "tomorrow";
  return d.toLocaleDateString([],{weekday:"long",month:"short",day:"numeric"});
}
function insightLine(f) {
  if (f.insight) return f.insight;
  const {p_home_win:hw,p_draw:d,p_away_win:aw}=f;
  if (hw!=null&&aw!=null) {
    if (hw>=60) return `${f.home_team?.split(" ").pop()} favoured — ${hw}%`;
    if (aw>=60) return `${f.away_team?.split(" ").pop()} favoured — ${aw}%`;
    if (d>=35)  return "Tight matchup · draw likely";
    return "Even contest";
  }
  if (f.xg_home!=null&&f.xg_away!=null) {
    const diff=Math.abs(f.xg_home-f.xg_away);
    if (diff<0.12) return "xG model: even matchup";
    const fav=f.xg_home>f.xg_away?f.home_team?.split(" ").pop():f.away_team?.split(" ").pop();
    return `xG edge: ${fav}`;
  }
  return null;
}
function marketBadge(f) {
  if (f.p_btts!=null   && f.p_btts>=55)   return `BTTS ${f.p_btts}%`;
  if (f.p_over25!=null && f.p_over25>=60) return `O2.5 ${f.p_over25}%`;
  return null;
}

/* ─── Atoms ────────────────────────────────────────────── */
function LiveDot({ size=5 }) {
  return <span style={{ width:size, height:size, borderRadius:"50%", background:R, display:"inline-block", flexShrink:0, animation:"nb-pulse 1.4s ease-in-out infinite" }}/>;
}
function Logo({ src, size=18 }) {
  return src
    ? <img src={src} alt="" width={size} height={size} style={{objectFit:"contain",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>
    : <div style={{width:size,height:size,flexShrink:0}}/>;
}
function LeagueTag({ k, small }) {
  const c=LEAGUES[k]; if (!c) return null;
  return (
    <span style={{ fontSize:small?7:8, fontWeight:900, letterSpacing:".12em", color:K, background:c.color, padding:"2px 7px", fontFamily:"'DM Mono',monospace", textTransform:"uppercase" }}>
      {small?c.short:c.label}
    </span>
  );
}

/* ─── MATCH CARDS ──────────────────────────────────────── */
function LiveCard({ fixture, onClick }) {
  const [hov, setHov]=useState(false);
  const lg=LEAGUES[fixture.league];
  const hS=fixture.home_score??0, aS=fixture.away_score??0;
  const hw=hS>aS, aw=aS>hS;
  const isHT=fixture.status==="HT";

  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      position:"relative", overflow:"hidden", padding:"14px 16px 12px",
      background:hov?K:"#0a0a0a", border:`2px solid ${R}`,
      boxShadow:hov?`5px 5px 0 ${R}`:"3px 3px 0 rgba(255,39,68,.4)",
      transform:hov?"translate(-2px,-2px)":"none",
      cursor:"pointer", transition:"all .15s",
    }}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:R}}/>
      <div style={{paddingTop:3}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <LeagueTag k={fixture.league}/>
          {isHT
            ? <span style={{fontSize:8,fontWeight:900,color:K,background:"#ffcc00",padding:"2px 8px",fontFamily:"'DM Mono',monospace"}}>HALF TIME</span>
            : <span style={{display:"flex",alignItems:"center",gap:5,fontSize:8,fontWeight:900,color:"#fff",background:R,padding:"2px 8px",fontFamily:"'DM Mono',monospace"}}><LiveDot size={4}/>{fixture.minute?`${fixture.minute}'`:"LIVE"}</span>
          }
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:9}}>
          {[[fixture.home_logo,fixture.home_team,hS,hw],[fixture.away_logo,fixture.away_team,aS,aw]].map(([logo,name,score,bold],i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
              <Logo src={logo} size={16}/>
              <span style={{fontSize:12,fontWeight:bold?900:600,color:bold?Y:"rgba(232,255,71,0.5)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Space Grotesk',sans-serif"}}>{name}</span>
              <span style={{fontSize:20,fontWeight:900,color:bold?Y:"rgba(232,255,71,.15)",fontFamily:"'Bebas Neue',sans-serif",minWidth:22,textAlign:"center",letterSpacing:"0.04em"}}>{score}</span>
            </div>
          ))}
        </div>
        <div style={{borderTop:`1px solid rgba(232,255,71,.08)`,paddingTop:7,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {fixture.xg_home!=null && <span style={{fontSize:9,color:"rgba(232,255,71,.4)",fontFamily:"'DM Mono',monospace"}}><span style={{color:Y,fontWeight:700}}>xG</span> {fixture.xg_home}–{fixture.xg_away}</span>}
          {fixture.latest_event && <span style={{fontSize:9,color:"rgba(232,255,71,.3)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'DM Mono',monospace"}}>{fixture.latest_event}</span>}
        </div>
      </div>
    </div>
  );
}

function ScheduledCard({ fixture, onClick }) {
  const [hov, setHov]=useState(false);
  const lg=LEAGUES[fixture.league];
  const line=insightLine(fixture), market=marketBadge(fixture);

  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      position:"relative", overflow:"hidden", padding:"12px 14px 11px",
      background:hov?K:"#0a0a0a", border:`2px solid ${hov?Y:"rgba(232,255,71,.15)"}`,
      boxShadow:hov?`4px 4px 0 ${Y}`:"none",
      transform:hov?"translate(-2px,-2px)":"none",
      cursor:"pointer", transition:"all .15s",
    }}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:lg?.color||Y}}/>
      <div style={{paddingLeft:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <LeagueTag k={fixture.league}/>
          <span style={{fontSize:9,fontWeight:700,color:"rgba(232,255,71,.35)",fontFamily:"'DM Mono',monospace"}}>{fmtKickoffLabel(fixture.kickoff)}</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:(line||market)?9:0}}>
          {[[fixture.home_logo,fixture.home_team],[fixture.away_logo,fixture.away_team]].map(([logo,name],i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:7}}>
              <Logo src={logo} size={15}/>
              <span style={{fontSize:12,fontWeight:700,color:hov?Y:"rgba(232,255,71,.65)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Space Grotesk',sans-serif"}}>{name}</span>
            </div>
          ))}
        </div>
        {(line||market)&&(
          <div style={{borderTop:`1px solid rgba(232,255,71,.06)`,paddingTop:7,display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
            {line   && <span style={{fontSize:9,color:"rgba(232,255,71,.3)",fontStyle:"italic",flex:1,fontFamily:"'DM Mono',monospace"}}>{line}</span>}
            {market && <span style={{fontSize:8,fontWeight:900,letterSpacing:".06em",color:K,background:Y,padding:"2px 7px",fontFamily:"'DM Mono',monospace"}}>{market}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function FullTimeCard({ fixture, onClick }) {
  const [hov, setHov]=useState(false);
  const lg=LEAGUES[fixture.league];
  const hS=fixture.home_score??0, aS=fixture.away_score??0;
  const hw=hS>aS, aw=aS>hS;

  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      position:"relative", overflow:"hidden", padding:"12px 14px 11px",
      background:hov?K:"#0a0a0a", border:`2px solid rgba(232,255,71,.08)`,
      boxShadow:hov?`3px 3px 0 rgba(232,255,71,.3)`:"none",
      transform:hov?"translate(-1px,-1px)":"none",
      cursor:"pointer", transition:"all .15s", opacity:hov?1:.75,
    }}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:lg?.color||"rgba(232,255,71,.2)",opacity:.35}}/>
      <div style={{paddingLeft:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <LeagueTag k={fixture.league}/>
          <span style={{fontSize:8,fontWeight:900,color:"rgba(232,255,71,.25)",background:"rgba(232,255,71,.04)",padding:"2px 7px",fontFamily:"'DM Mono',monospace",letterSpacing:".08em"}}>FT</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {[[fixture.home_logo,fixture.home_team,hS,hw],[fixture.away_logo,fixture.away_team,aS,aw]].map(([logo,name,score,bold],i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:7}}>
              <Logo src={logo} size={15}/>
              <span style={{fontSize:12,fontWeight:bold?800:500,color:bold?"rgba(232,255,71,.8)":"rgba(232,255,71,.3)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Space Grotesk',sans-serif"}}>{name}</span>
              <span style={{fontSize:16,fontWeight:bold?900:600,color:bold?"rgba(232,255,71,.7)":"rgba(232,255,71,.12)",fontFamily:"'Bebas Neue',sans-serif",minWidth:18,textAlign:"center",letterSpacing:"0.04em"}}>{score}</span>
            </div>
          ))}
        </div>
        {fixture.xg_home!=null&&(
          <div style={{borderTop:`1px solid rgba(232,255,71,.04)`,paddingTop:6,marginTop:8}}>
            <span style={{fontSize:9,color:"rgba(232,255,71,.2)",fontFamily:"'DM Mono',monospace"}}><span style={{color:"rgba(0,212,170,.4)",fontWeight:700}}>xG</span> {fixture.xg_home}–{fixture.xg_away}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Featured rail ──────────────────────────────────────── */
function FeaturedCard({ f, onClick }) {
  const [hov, setHov]=useState(false);
  const lg=LEAGUES[f.league];
  const mode=cardMode(f.status);
  const isL=mode==="live", isFT=mode==="fulltime";
  const hS=f.home_score??null, aS=f.away_score??null;
  const hasSc=hS!==null&&aS!==null;
  const hw=hasSc&&hS>aS, aw=hasSc&&aS>hS;

  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      position:"relative", overflow:"hidden", flexShrink:0,
      width:272, padding:"18px 18px 14px",
      background:K, border:`3px solid ${isL?R:hov?Y:"rgba(232,255,71,.2)"}`,
      boxShadow:hov?`6px 6px 0 ${isL?R:Y}`:"3px 3px 0 rgba(232,255,71,.15)",
      transform:hov?"translate(-3px,-3px)":"none",
      cursor:"pointer", transition:"all .18s",
    }}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:isL?R:lg?.color||Y}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <LeagueTag k={f.league}/>
        {isL && <span style={{display:"flex",alignItems:"center",gap:5,fontSize:8,fontWeight:900,color:"#fff",background:R,padding:"2px 9px",fontFamily:"'DM Mono',monospace"}}><LiveDot size={4}/>{f.minute?`${f.minute}'`:"LIVE"}</span>}
        {isFT && <span style={{fontSize:8,fontWeight:900,color:"rgba(232,255,71,.3)",fontFamily:"'DM Mono',monospace",letterSpacing:".1em"}}>FULL TIME</span>}
        {!isL&&!isFT && <span style={{fontSize:10,fontWeight:700,color:"rgba(232,255,71,.35)",fontFamily:"'DM Mono',monospace"}}>{fmtKickoffLabel(f.kickoff)}</span>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
        {[[f.home_logo,f.home_team,hS,hw],[f.away_logo,f.away_team,aS,aw]].map(([logo,name,score,bold],i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:9}}>
            <Logo src={logo} size={22}/>
            <span style={{fontSize:13,fontWeight:bold?900:600,color:bold?Y:"rgba(232,255,71,.5)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Space Grotesk',sans-serif"}}>{name}</span>
            {hasSc&&<span style={{fontSize:22,fontWeight:900,color:bold?Y:"rgba(232,255,71,.1)",fontFamily:"'Bebas Neue',sans-serif",minWidth:24,textAlign:"center",letterSpacing:"0.04em"}}>{score}</span>}
          </div>
        ))}
      </div>
      <div style={{borderTop:`1px solid rgba(232,255,71,.06)`,paddingTop:10,minHeight:22}}>
        {f.xg_home!=null&&<span style={{fontSize:9,color:"rgba(232,255,71,.35)",marginRight:10,fontFamily:"'DM Mono',monospace"}}><span style={{color:Y,fontWeight:700}}>xG</span> {f.xg_home}–{f.xg_away}</span>}
        {!hasSc&&insightLine(f)&&<span style={{fontSize:9,color:"rgba(232,255,71,.28)",fontStyle:"italic",fontFamily:"'DM Mono',monospace"}}>{insightLine(f)}</span>}
      </div>
    </div>
  );
}

function FeaturedRail({ fixtures, onNavigate }) {
  const cards=useMemo(()=>{
    const live=fixtures.filter(f=>LIVE_SET.has(f.status));
    const today=fixtures.filter(f=>!LIVE_SET.has(f.status)&&!FT_SET.has(f.status)&&dayBucket(f.kickoff)==="today");
    const pool=[...live,...today,...fixtures];
    const seen=new Set();
    return pool.filter(f=>{if(seen.has(f.fixture_id))return false;seen.add(f.fixture_id);return true;}).slice(0,3);
  },[fixtures]);
  if(!cards.length) return null;
  return (
    <div style={{marginBottom:32}}>
      <div style={{fontSize:8,fontWeight:900,letterSpacing:".2em",color:"rgba(232,255,71,.4)",textTransform:"uppercase",marginBottom:12,fontFamily:"'DM Mono',monospace"}}>Featured</div>
      <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:4}}>
        {cards.map(f=><FeaturedCard key={f.fixture_id} f={f} onClick={()=>onNavigate(f.fixture_id)}/>)}
      </div>
    </div>
  );
}

/* ─── Section wrapper ────────────────────────────────────── */
function Section({ title, count, accent, collapsible, defaultOpen=true, children }) {
  const [open, setOpen]=useState(defaultOpen);
  return (
    <div style={{marginBottom:24}}>
      <div onClick={collapsible?()=>setOpen(o=>!o):undefined}
        style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,cursor:collapsible?"pointer":"default",userSelect:"none",borderBottom:`2px solid ${accent||"rgba(232,255,71,.1)"}`,paddingBottom:8}}>
        <span style={{fontSize:10,fontWeight:900,letterSpacing:".18em",color:accent||Y,textTransform:"uppercase",fontFamily:"'Bebas Neue',sans-serif",fontSize:16}}>{title}</span>
        {count!=null&&<span style={{fontSize:8,fontWeight:900,color:K,background:accent||Y,padding:"1px 8px",fontFamily:"'DM Mono',monospace"}}>{count}</span>}
        {collapsible&&<span style={{marginLeft:"auto",fontSize:11,color:"rgba(232,255,71,.3)",display:"inline-block",transition:"transform .2s",transform:open?"rotate(0)":"rotate(-90deg)"}}>▾</span>}
      </div>
      {(!collapsible||open)&&<div style={{display:"flex",flexDirection:"column",gap:7}}>{children}</div>}
    </div>
  );
}

function CardRouter({ f, onNavigate }) {
  const mode=cardMode(f.status);
  const go=()=>onNavigate(f.fixture_id);
  if (mode==="live")     return <LiveCard     fixture={f} onClick={go}/>;
  if (mode==="fulltime") return <FullTimeCard fixture={f} onClick={go}/>;
  return                        <ScheduledCard fixture={f} onClick={go}/>;
}

/* ─── Sidebar widgets — neobrutalist ─────────────────────── */
function WidgetShell({ title, children, accent=Y }) {
  return (
    <div style={{background:K,border:`3px solid ${accent}`,padding:"14px 16px",marginBottom:10,boxShadow:`4px 4px 0 rgba(232,255,71,.2)`}}>
      <div style={{fontSize:10,fontWeight:900,letterSpacing:".18em",color:accent,textTransform:"uppercase",marginBottom:12,fontFamily:"'Bebas Neue',sans-serif",fontSize:14,borderBottom:`2px solid ${accent}`,paddingBottom:6}}>{title}</div>
      {children}
    </div>
  );
}

function NextKickoffWidget({ fixtures }) {
  const next=useMemo(()=>{
    const now=Date.now();
    return fixtures.filter(f=>cardMode(f.status)==="scheduled"&&f.kickoff).sort((a,b)=>new Date(a.kickoff)-new Date(b.kickoff)).find(f=>new Date(f.kickoff).getTime()>now);
  },[fixtures]);
  const [cd,setCd]=useState("");
  useEffect(()=>{
    if(!next) return;
    const tick=()=>{
      const diff=new Date(next.kickoff).getTime()-Date.now();
      if(diff<=0){setCd("Kick off!");return;}
      const h=Math.floor(diff/3_600_000),m=Math.floor((diff%3_600_000)/60_000),s=Math.floor((diff%60_000)/1_000);
      setCd(h>0?`${h}h ${m}m`:`${m}m ${s}s`);
    };
    tick(); const id=setInterval(tick,1_000); return()=>clearInterval(id);
  },[next]);
  if(!next) return null;
  return (
    <WidgetShell title="Next Kick Off" accent={Y}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <Logo src={next.home_logo} size={18}/>
        <span style={{fontSize:10,fontWeight:700,color:"rgba(232,255,71,.5)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Space Grotesk',sans-serif"}}>{next.home_team?.split(" ").pop()}</span>
        <span style={{fontSize:9,color:"rgba(232,255,71,.2)",fontWeight:600,fontFamily:"'DM Mono',monospace"}}>vs</span>
        <span style={{fontSize:10,fontWeight:700,color:"rgba(232,255,71,.5)",flex:1,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Space Grotesk',sans-serif"}}>{next.away_team?.split(" ").pop()}</span>
        <Logo src={next.away_logo} size={18}/>
      </div>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:36,fontWeight:900,color:Y,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.06em",lineHeight:1}}>{cd}</div>
        <div style={{fontSize:9,color:"rgba(232,255,71,.3)",marginTop:4,fontFamily:"'DM Mono',monospace"}}>{fmtTime(next.kickoff)} · <LeagueTag k={next.league} small/></div>
      </div>
    </WidgetShell>
  );
}

function LiveTrackerWidget({ fixtures }) {
  const live=fixtures.filter(f=>LIVE_SET.has(f.status));
  return (
    <WidgetShell title="Live Tracker" accent={R}>
      {live.length===0
        ? <div style={{fontSize:11,color:"rgba(232,255,71,.3)",textAlign:"center",padding:"6px 0",fontFamily:"'DM Mono',monospace"}}>No matches in progress</div>
        : <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {live.map(f=>(
              <div key={f.fixture_id} style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontSize:9,fontWeight:900,color:R,minWidth:26,fontFamily:"'DM Mono',monospace"}}>{f.minute?`${f.minute}'`:"–"}</span>
                <span style={{fontSize:10,fontWeight:700,color:"rgba(232,255,71,.45)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Space Grotesk',sans-serif"}}>
                  {f.home_team?.split(" ").pop()} {f.home_score??0}–{f.away_score??0} {f.away_team?.split(" ").pop()}
                </span>
                <div style={{width:5,height:5,background:LEAGUES[f.league]?.color||Y,flexShrink:0}}/>
              </div>
            ))}
          </div>
      }
    </WidgetShell>
  );
}

function LeagueSummaryWidget({ fixtures }) {
  const rows=LEAGUE_FILTER.filter(l=>l!=="all").map(key=>{
    const lx=fixtures.filter(f=>f.league===key);
    const live=lx.filter(f=>LIVE_SET.has(f.status)).length;
    return{key,live,total:lx.length};
  }).filter(r=>r.total>0);
  if(!rows.length) return null;
  return (
    <WidgetShell title="Leagues" accent="rgba(232,255,71,.5)">
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {rows.map(({key,live,total})=>{
          const c=LEAGUES[key];
          return (
            <div key={key} style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:3,height:14,background:c.color,flexShrink:0}}/>
              <span style={{fontSize:10,fontWeight:700,color:"rgba(232,255,71,.4)",flex:1,fontFamily:"'Space Grotesk',sans-serif"}}>{c.label}</span>
              {live>0&&<span style={{fontSize:8,fontWeight:900,color:"#fff",background:R,padding:"1px 6px",fontFamily:"'DM Mono',monospace"}}>{live} live</span>}
              <span style={{fontSize:9,fontWeight:700,color:Y,fontFamily:"'DM Mono',monospace"}}>{total}</span>
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────── */
export default function LivePage() {
  const navigate=useNavigate();
  const [chips,setChips]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [filter,setFilter]=useState("all");
  const [lastUp,setLastUp]=useState(null);
  const [dayOffset,setDayOffset]=useState(0);

  const fetchData=(offset=dayOffset)=>{
    setLoading(true); setError(null);
    let url;
    if(offset<0)      url=`${BACKEND}/api/matches/results?days_ago=${Math.abs(offset)}`;
    else if(offset>0) url=`${BACKEND}/api/matches/future?days_ahead=${offset}`;
    else              url=`${BACKEND}/api/matches/upcoming`;
    fetch(url)
      .then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();})
      .then(d=>{setChips(d.matches||d.chips||[]);setLoading(false);setLastUp(new Date());setError(null);})
      .catch(e=>{setError(e.message);setLoading(false);});
  };

  useEffect(()=>{
    fetchData(dayOffset);
    if(dayOffset===0){const id=setInterval(()=>fetchData(0),30_000);return()=>clearInterval(id);}
  },[dayOffset]);

  const [weekStart,setWeekStart]=useState(()=>{
    const d=new Date(), day=d.getDay(), monday=new Date(d);
    monday.setDate(d.getDate()-(day===0?6:day-1)); monday.setHours(0,0,0,0); return monday;
  });
  const weekDays=Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(weekStart.getDate()+i);return d;});

  function dayLabel(offset){
    if(offset===0) return"Today & Live";
    if(offset===-1) return"Yesterday";
    if(offset===1) return"Tomorrow";
    const d=new Date(); d.setDate(d.getDate()+offset);
    return d.toLocaleDateString([],{weekday:"short",day:"numeric",month:"short"});
  }
  function dateToOffset(d){
    const today=new Date(); today.setHours(0,0,0,0);
    const target=new Date(d); target.setHours(0,0,0,0);
    return Math.round((target-today)/86400000);
  }
  const prevWeek=()=>setWeekStart(ws=>{const d=new Date(ws);d.setDate(d.getDate()-7);return d;});
  const nextWeek=()=>setWeekStart(ws=>{const d=new Date(ws);d.setDate(d.getDate()+7);return d;});

  const fixtures=useMemo(()=>chips.map(c=>({
    fixture_id:c.fixture_id, league:normalizeLeague(c.league||c.league_id),
    home_team:c.home_team, away_team:c.away_team,
    home_logo:c.home_logo, away_logo:c.away_logo,
    home_score:c.home_score??null, away_score:c.away_score??null,
    status:c.status, minute:c.minute, kickoff:c.kickoff||c.date,
    xg_home:c.xg_home??null, xg_away:c.xg_away??null,
    p_home_win:c.p_home_win??null, p_draw:c.p_draw??null, p_away_win:c.p_away_win??null,
    p_btts:c.p_btts??null, p_over25:c.p_over25??null,
    insight:c.insight??null, latest_event:c.latest_event??null,
  })),[chips]);

  const filtered=useMemo(()=>filter==="all"?fixtures:fixtures.filter(f=>f.league===filter),[fixtures,filter]);
  const isPastView=dayOffset<0, isFutureView=dayOffset>0, isTodayView=dayOffset===0;
  const pastResults=isPastView?filtered:[];
  const futureResults=isFutureView?filtered:[];
  const liveAll=isTodayView?filtered.filter(f=>LIVE_SET.has(f.status)):[];
  const todayFix=isTodayView?filtered.filter(f=>!LIVE_SET.has(f.status)&&dayBucket(f.kickoff)==="today"):[];
  const ftToday=isTodayView?filtered.filter(f=>FT_SET.has(f.status)&&dayBucket(f.kickoff)==="today"):[];
  const upcoming=useMemo(()=>{
    if(!isTodayView) return{groups:{},order:[]};
    const groups={},order=[];
    filtered.filter(f=>!LIVE_SET.has(f.status)&&!FT_SET.has(f.status)&&dayBucket(f.kickoff)!=="today").forEach(f=>{
      const k=dayBucket(f.kickoff); if(!groups[k]){groups[k]=[];order.push(k);} groups[k].push(f);
    });
    return{groups,order};
  },[filtered,isTodayView]);

  const liveCount=fixtures.filter(f=>LIVE_SET.has(f.status)).length;
  const todayCount=fixtures.filter(f=>dayBucket(f.kickoff)==="today").length;
  const DAY_NAMES=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <>
      <style>{`
        @keyframes nb-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.68)} }
        @keyframes nb-spin   { to{transform:rotate(360deg)} }
        @keyframes nb-in     { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
        @keyframes nb-stripes { to{background-position:60px 0} }
        *{box-sizing:border-box}
      `}</style>

      <div style={{background:K,minHeight:"100vh",fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",position:"relative"}}>
        {/* Animated bg stripes */}
        <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",background:"repeating-linear-gradient(92deg,transparent 0,transparent 44px,rgba(232,255,71,.02) 44px,rgba(232,255,71,.02) 45px)",animation:"nb-stripes 25s linear infinite"}}/>

        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 20px",position:"relative",zIndex:1}}>

          {/* ══ HERO HEADER ══ */}
          <div style={{padding:"32px 0 20px",borderBottom:`4px solid ${Y}`,marginBottom:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18,flexWrap:"wrap",gap:12}}>
              <div>
                {/* Kicker */}
                <div style={{display:"inline-flex",alignItems:"center",gap:8,background:Y,color:K,padding:"3px 12px",fontFamily:"'DM Mono',monospace",fontSize:8,letterSpacing:".2em",textTransform:"uppercase",marginBottom:10}}>
                  <span style={{width:5,height:5,background:R,animation:"nb-pulse 1.6s ease infinite",flexShrink:0}}/>
                  LIVE CENTRE · TOP 5 LEAGUES
                </div>
                <h1 style={{fontSize:"clamp(48px,8vw,96px)",fontWeight:900,color:Y,margin:0,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:".04em",lineHeight:.9}}>
                  {isPastView?`Results`:"Live"}
                </h1>
                <p style={{color:"rgba(232,255,71,.4)",fontSize:12,margin:"6px 0 0",fontFamily:"'DM Mono',monospace",letterSpacing:".06em"}}>
                  {isPastView?`Results · ${dayLabel(dayOffset)}`:isFutureView?`Fixtures · ${dayLabel(dayOffset)}`:"Today & live · Top 5 leagues"}
                </p>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                {liveCount>0&&(
                  <div style={{display:"flex",alignItems:"center",gap:6,background:R,padding:"6px 14px"}}>
                    <LiveDot/><span style={{fontSize:11,fontWeight:900,color:"#fff",fontFamily:"'DM Mono',monospace",letterSpacing:".08em"}}>{liveCount} LIVE</span>
                  </div>
                )}
                <div style={{background:"transparent",border:`2px solid rgba(232,255,71,.2)`,padding:"6px 14px"}}>
                  <span style={{fontSize:11,fontWeight:700,color:"rgba(232,255,71,.4)",fontFamily:"'DM Mono',monospace"}}>{todayCount} Today</span>
                </div>
                {lastUp&&(
                  <div style={{background:"transparent",border:`2px solid rgba(232,255,71,.1)`,padding:"6px 12px"}}>
                    <span style={{fontSize:10,color:"rgba(232,255,71,.3)",fontFamily:"'DM Mono',monospace"}}>{lastUp.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Calendar week strip — Variant C: elevated cards with league pip row ── */}
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>

                {/* Prev week */}
                <button onClick={prevWeek} style={{
                  width:34,height:72,flexShrink:0,
                  border:`1.5px solid rgba(232,255,71,.15)`,
                  background:"transparent",color:"rgba(232,255,71,.4)",
                  fontSize:18,cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  borderRadius:3,transition:"all .15s",
                }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(232,255,71,.45)";e.currentTarget.style.color="#e8ff47";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(232,255,71,.15)";e.currentTarget.style.color="rgba(232,255,71,.4)";}}
                >‹</button>

                {/* Day cards */}
                <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(7,minmax(0,1fr))",gap:4}}>
                  {weekDays.map((d,i)=>{
                    const off=dateToOffset(d);
                    const isToday=off===0, isPast=off<0, isFuture=off>0;
                    const active=dayOffset===off;
                    const inRange=off>=-10&&off<=10;

                    // Determine accent colour for this day's state
                    const accentCol = isToday ? Y : isPast ? "rgba(232,255,71,.45)" : "rgba(0,212,170,.75)";

                    // Gather which leagues have fixtures on this day from loaded chips
                    const dayDate = new Date(d); dayDate.setHours(0,0,0,0);
                    const dayChips = chips.filter(c=>{
                      if(!c.kickoff&&!c.date) return false;
                      const cd=new Date(c.kickoff||c.date); cd.setHours(0,0,0,0);
                      return cd.getTime()===dayDate.getTime();
                    });
                    const leagueKeys=[...new Set(dayChips.map(c=>normalizeLeague(c.league||c.league_id)).filter(Boolean))];
                    const hasLive=dayChips.some(c=>LIVE_SET.has(c.status));
                    const total=dayChips.length;

                    // Border & shadow styling
                    const borderCol = active
                      ? accentCol
                      : "rgba(232,255,71,.09)";
                    const shadowStyle = active
                      ? (isToday
                          ? `0 4px 0 ${Y}`
                          : isFuture
                            ? `0 4px 0 rgba(0,212,170,.45)`
                            : `0 3px 0 rgba(232,255,71,.3)`)
                      : "none";

                    return (
                      <button
                        key={i}
                        onClick={()=>inRange&&setDayOffset(off)}
                        disabled={!inRange}
                        style={{
                          display:"flex",flexDirection:"column",alignItems:"center",
                          gap:3,padding:"8px 4px 7px",
                          border:`1.5px solid ${borderCol}`,
                          background:active?`rgba(232,255,71,.07)`:"transparent",
                          cursor:inRange?"pointer":"not-allowed",
                          borderRadius:3,
                          transition:"all .15s",
                          opacity:inRange?1:.3,
                          boxShadow:shadowStyle,
                          position:"relative",
                          transform:active?"translateY(-2px)":"none",
                        }}
                        onMouseEnter={e=>{if(!active&&inRange){e.currentTarget.style.borderColor="rgba(232,255,71,.28)";e.currentTarget.style.transform="translateY(-2px)";}}}
                        onMouseLeave={e=>{if(!active){e.currentTarget.style.borderColor=borderCol;e.currentTarget.style.transform="none";}}}
                      >
                        {/* Live pulse dot — top-right corner */}
                        {hasLive&&(
                          <div style={{
                            position:"absolute",top:4,right:4,
                            width:5,height:5,borderRadius:"50%",
                            background:R,flexShrink:0,
                            animation:"nb-pulse 1.4s ease-in-out infinite",
                          }}/>
                        )}

                        {/* Day name */}
                        <span style={{
                          fontSize:8,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",
                          color:"rgba(232,255,71,.3)",fontFamily:"'DM Mono',monospace",
                        }}>{DAY_NAMES[d.getDay()]}</span>

                        {/* Day number */}
                        <span style={{
                          fontSize:21,fontWeight:900,lineHeight:1,
                          fontFamily:"'Bebas Neue',sans-serif",
                          color:active ? accentCol : "rgba(232,255,71,.22)",
                        }}>{d.getDate()}</span>

                        {/* League pip row */}
                        <div style={{display:"flex",gap:2,alignItems:"center",justifyContent:"center",flexWrap:"wrap",minHeight:7}}>
                          {leagueKeys.length===0
                            ? <div style={{width:16,height:1,background:"rgba(232,255,71,.1)",borderRadius:1}}/>
                            : leagueKeys.slice(0,5).map(lk=>(
                                <div key={lk} style={{
                                  width:5,height:5,borderRadius:"50%",flexShrink:0,
                                  background:LEAGUES[lk]?.color||Y,
                                }}/>
                              ))
                          }
                        </div>

                        {/* Fixture count label */}
                        <span style={{
                          fontSize:8,fontWeight:700,letterSpacing:".04em",
                          fontFamily:"'DM Mono',monospace",
                          color: total>0
                            ? (active
                                ? (isToday ? Y : isFuture ? "rgba(0,212,170,.8)" : "rgba(232,255,71,.6)")
                                : "rgba(0,212,170,.6)")
                            : "rgba(232,255,71,.18)",
                        }}>
                          {total>0
                            ? (hasLive ? `${total} live` : `${total} fix`)
                            : "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Next week */}
                <button onClick={nextWeek} style={{
                  width:34,height:72,flexShrink:0,
                  border:`1.5px solid rgba(232,255,71,.15)`,
                  background:"transparent",color:"rgba(232,255,71,.4)",
                  fontSize:18,cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  borderRadius:3,transition:"all .15s",
                }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(232,255,71,.45)";e.currentTarget.style.color="#e8ff47";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(232,255,71,.15)";e.currentTarget.style.color="rgba(232,255,71,.4)";}}
                >›</button>
              </div>

              {/* Legend row */}
              <div style={{display:"flex",gap:14,marginTop:10,paddingLeft:40,flexWrap:"wrap"}}>
                {[
                  ["rgba(232,255,71,.45)","PAST"],
                  [Y,"TODAY & LIVE"],
                  ["rgba(0,212,170,.8)","UPCOMING"],
                ].map(([c,l])=>(
                  <span key={l} style={{fontSize:8,fontWeight:700,color:c,letterSpacing:".06em",display:"flex",alignItems:"center",gap:4,fontFamily:"'DM Mono',monospace"}}>
                    <span style={{width:6,height:2,background:c,display:"inline-block"}}/>{l}
                  </span>
                ))}
                <span style={{width:1,height:10,background:"rgba(232,255,71,.1)",display:"inline-block",margin:"0 2px"}}/>
                {Object.entries(LEAGUES).map(([k,v])=>(
                  <span key={k} style={{fontSize:8,fontWeight:700,color:v.color,letterSpacing:".04em",display:"flex",alignItems:"center",gap:3,fontFamily:"'DM Mono',monospace"}}>
                    <span style={{width:5,height:5,borderRadius:"50%",background:v.color,display:"inline-block",flexShrink:0}}/>{v.short}
                  </span>
                ))}
              </div>
            </div>

            {/* League filter tabs */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {LEAGUE_FILTER.map(l=>{
                const c=LEAGUES[l];
                const active=filter===l;
                const col=c?.color||Y;
                return (
                  <button key={l} onClick={()=>setFilter(l)} style={{
                    padding:"5px 14px",cursor:"pointer",
                    fontSize:11,fontWeight:700,letterSpacing:".06em",
                    border:active?`2px solid ${col}`:`2px solid rgba(232,255,71,.12)`,
                    background:active?col:"transparent",
                    color:active?K:"rgba(232,255,71,.35)",
                    fontFamily:"'Space Grotesk',sans-serif",
                    transition:"all .15s",
                  }}>
                    {l==="all"?"All":c?.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ══ STATES ══ */}
          {loading&&(
            <div style={{textAlign:"center",padding:"56px 0",color:Y,fontSize:13}}>
              <div style={{width:26,height:26,border:`3px solid rgba(232,255,71,.15)`,borderTopColor:Y,margin:"0 auto 12px",animation:"nb-spin .8s linear infinite"}}/>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:".1em"}}>Loading fixtures…</span>
            </div>
          )}
          {error&&(
            <div style={{background:"rgba(255,39,68,.06)",border:`2px solid ${R}`,padding:"14px 18px",color:R,fontSize:13,display:"flex",alignItems:"center",gap:10,fontFamily:"'DM Mono',monospace"}}>
              <span>Failed to load: {error}</span>
              <button onClick={fetchData} style={{background:R,border:"none",color:"#fff",padding:"4px 12px",cursor:"pointer",fontSize:11,fontFamily:"'DM Mono',monospace",letterSpacing:".08em"}}>RETRY</button>
            </div>
          )}

          {!loading&&!error&&(
            <div style={{animation:"nb-in .3s ease both"}}>
              <FeaturedRail fixtures={filtered} onNavigate={id=>navigate(`/match/${id}`)}/>
              <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 240px",gap:22,alignItems:"start"}}>
                <div>
                  {filtered.length===0&&<div style={{textAlign:"center",padding:"44px 0",color:"rgba(232,255,71,.3)",fontSize:13,fontFamily:"'DM Mono',monospace"}}>No fixtures for this filter.</div>}
                  {isPastView&&pastResults.length>0&&<Section title={`Results · ${dayLabel(dayOffset)}`} count={pastResults.length} accent="rgba(179,136,255,.8)">{pastResults.map(f=><CardRouter key={f.fixture_id} f={f} onNavigate={id=>navigate(`/match/${id}`)}/>)}</Section>}
                  {isFutureView&&futureResults.length>0&&<Section title={`Fixtures · ${dayLabel(dayOffset)}`} count={futureResults.length} accent="rgba(0,212,170,.8)">{futureResults.map(f=><CardRouter key={f.fixture_id} f={f} onNavigate={id=>navigate(`/match/${id}`)}/>)}</Section>}
                  {isTodayView&&(
                    <>
                      {liveAll.length>0&&<Section title="Live Now" count={liveAll.length} accent={R}>{liveAll.map(f=><CardRouter key={f.fixture_id} f={f} onNavigate={id=>navigate(`/match/${id}`)}/>)}</Section>}
                      {(todayFix.length>0||ftToday.length>0)&&<Section title="Today" count={todayFix.length+ftToday.length} accent={Y}>{[...todayFix,...ftToday].map(f=><CardRouter key={f.fixture_id} f={f} onNavigate={id=>navigate(`/match/${id}`)}/>)}</Section>}
                      {upcoming.order.map((day,i)=>(
                        <Section key={day} title={day} count={upcoming.groups[day].length} collapsible defaultOpen={i<2}>
                          {upcoming.groups[day].map(f=><CardRouter key={f.fixture_id} f={f} onNavigate={id=>navigate(`/match/${id}`)}/>)}
                        </Section>
                      ))}
                    </>
                  )}
                </div>
                <div style={{position:"sticky",top:16}}>
                  <NextKickoffWidget fixtures={filtered}/>
                  <LiveTrackerWidget fixtures={filtered}/>
                  <LeagueSummaryWidget fixtures={filtered}/>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}