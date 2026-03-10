// PredictionsPage.jsx — Datalytics v4
// Redesigned: stats-first hierarchy, premium animation, news panel, no emojis
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, NavLink } from "react-router-dom";
import {
  getStandings, getLeaguePredictions, getTopScorers, getTopAssists,
  getLeagueInjuries, getH2H, getFixtureOdds, getApiPrediction,
} from "../api/api";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  blue:"#ffffff",   blueDim:"rgba(255,255,255,0.08)", blueGlow:"rgba(255,255,255,0.15)",
  green:"#ffffff",  greenDim:"rgba(255,255,255,0.06)", greenGlow:"rgba(255,255,255,0.12)",
  red:"#bfbfbf",    redDim:"rgba(255,255,255,0.05)",   redGlow:"rgba(255,255,255,0.1)",
  gold:"#bfbfbf",   goldDim:"rgba(255,255,255,0.06)",
  purple:"#bfbfbf", purpleDim:"rgba(255,255,255,0.05)",
  orange:"#bfbfbf",
  panel:"#111111",  panelSoft:"rgba(255,255,255,0.02)",
  line:"#222222",   lineMid:"#333333",
  text:"#ffffff",   muted:"#7a7a7a", soft:"#444444",
};

const LEAGUE_META = {
  epl:    {label:"Premier League", color:"#ffffff", bg:"rgba(255,255,255,0.04)"},
  laliga: {label:"La Liga",        color:"#bfbfbf", bg:"rgba(255,255,255,0.03)"},
  seriea: {label:"Serie A",        color:"#ffffff", bg:"rgba(255,255,255,0.04)"},
  ligue1: {label:"Ligue 1",        color:"#bfbfbf", bg:"rgba(255,255,255,0.03)"},
};

// League → NewsAPI query terms (for news panel)
const LEAGUE_NEWS_QUERY = {
  epl:    "Premier League football",
  laliga: "La Liga football",
  seriea: "Serie A football",
  ligue1: "Ligue 1 football",
};

const ZONE = {
  cl:{color:"#ffffff",label:"Champions League"},
  el:{color:"#bfbfbf",label:"Europa League"},
  ecl:{color:"#888888",label:"Conference Lg"},
  rel:{color:"#666666",label:"Relegation"},
};

// ─── Date formatting ──────────────────────────────────────────────────────────
function fmtDate(raw) {
  if (!raw || raw === "TBD") return { day: "TBD", date: "", time: "" };
  // raw may be "2026-03-14 20:00" or "2026-03-14T20:00:00"
  const clean = raw.replace("T", " ");
  const [datePart, timePart] = clean.split(" ");
  if (!datePart) return { day: raw, date: "", time: "" };
  const d = new Date(datePart + "T12:00:00");
  const day  = d.toLocaleDateString("en-GB", { weekday: "short" });
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const time = timePart ? timePart.slice(0, 5) : "";
  return { day, date, time };
}

// ─── Micro components ─────────────────────────────────────────────────────────
const FormPip = ({ r }) => {
  const s = {
    W: { bg:"rgba(255,255,255,0.12)", c:"#ffffff", b:"rgba(255,255,255,0.25)" },
    D: { bg:"rgba(255,255,255,0.04)", c:"#7a7a7a", b:"rgba(255,255,255,0.1)" },
    L: { bg:"rgba(255,255,255,0.02)", c:"#444444", b:"rgba(255,255,255,0.06)" },
  }[r] || { bg:"rgba(255,255,255,0.04)", c:"#7a7a7a", b:"rgba(255,255,255,0.1)" };
  return (
    <span style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",
      width:20,height:20,borderRadius:5,fontSize:9,fontWeight:900,
      fontFamily:"JetBrains Mono,monospace",background:s.bg,color:s.c,border:"1px solid "+s.b }}>
      {r}
    </span>
  );
};

// ─── Dual xG bar (mirrored progress) ─────────────────────────────────────────
const XGDualBar = ({ xgHome, xgAway, homeTeam, awayTeam, homeColor, awayColor }) => {
  const h = parseFloat(xgHome) || 0, a = parseFloat(xgAway) || 0;
  const max = Math.max(h, a, 1.5);
  const hPct = (h / max) * 100, aPct = (a / max) * 100;
  const hName = (homeTeam || "Home").split(" ").pop();
  const aName = (awayTeam || "Away").split(" ").pop();
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:9, fontWeight:900, color:C.muted, letterSpacing:".1em" }}>EXPECTED GOALS</span>
        <span style={{ fontSize:9, color:C.soft }}>xG model</span>
      </div>
      {/* Home row */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:9, fontWeight:800, color:homeColor||C.blue, minWidth:48, textAlign:"right" }}>{hName}</span>
        <div style={{ flex:1, height:6, background:"rgba(255,255,255,0.05)", borderRadius:3, overflow:"hidden" }}>
          <div style={{ width:hPct+"%", height:"100%", background:"#ffffff", borderRadius:3,
            boxShadow:`0 0 6px ${(homeColor||C.blue)}66`, transition:"width 0.8s cubic-bezier(.4,0,.2,1)" }}/>
        </div>
        <span style={{ fontSize:13, fontWeight:900, color:homeColor||C.blue, fontFamily:"JetBrains Mono,monospace", minWidth:32 }}>{h.toFixed(2)}</span>
      </div>
      {/* Away row */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:9, fontWeight:800, color:awayColor||C.red, minWidth:48, textAlign:"right" }}>{aName}</span>
        <div style={{ flex:1, height:6, background:"rgba(255,255,255,0.05)", borderRadius:3, overflow:"hidden" }}>
          <div style={{ width:aPct+"%", height:"100%", background:"#bfbfbf", borderRadius:3,
            boxShadow:`0 0 6px ${(awayColor||C.red)}66`, transition:"width 0.8s cubic-bezier(.4,0,.2,1) 0.1s" }}/>
        </div>
        <span style={{ fontSize:13, fontWeight:900, color:awayColor||C.red, fontFamily:"JetBrains Mono,monospace", minWidth:32 }}>{a.toFixed(2)}</span>
      </div>
    </div>
  );
};


// ─── Improved Scoring Pattern chart ──────────────────────────────────────────
const ScoringPatterns = ({ hStats, aStats, homeTeam, awayTeam, homeColor, awayColor }) => {
  if (!hStats && !aStats) return null;
  const periods = ["0-15","16-30","31-45","46-60","61-75","76-90"];
  const getMin = (obj, per) => { if (!obj) return 0; const d = obj[per] || {}; return (d.total || d) || 0; };
  const hGoals = (hStats && hStats.goals_by_minute) || {};
  const aGoals = (aStats && aStats.goals_by_minute) || {};
  const vals = periods.map(p => ({ h: getMin(hGoals,p), a: getMin(aGoals,p) }));
  const maxVal = Math.max(...vals.map(v => Math.max(v.h, v.a)), 1);
  // Find peak period
  const peakIdx = vals.reduce((best, v, i) => (v.h+v.a > vals[best].h+vals[best].a ? i : best), 0);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ fontSize:10, fontWeight:900, color:C.muted, letterSpacing:".1em" }}>GOAL TIMING</div>
      <div style={{ display:"flex", gap:4, alignItems:"flex-end", height:72 }}>
        {vals.map((v, i) => {
          const isPeak = i === peakIdx && (v.h + v.a) > 0;
          return (
            <div key={periods[i]} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              {isPeak && <div style={{ width:"100%", height:2, borderRadius:1, background:"rgba(242,201,76,0.4)", marginBottom:2 }}/>}
              <div style={{ width:"100%", display:"flex", gap:1, alignItems:"flex-end", height:54 }}>
                <div style={{ flex:1, background:isPeak?(homeColor||C.blue):(homeColor||C.blue)+"99",
                  borderRadius:"2px 2px 0 0", height:(v.h/maxVal*100)+"%",
                  transition:"height 0.7s cubic-bezier(.4,0,.2,1)", minHeight:v.h>0?2:0,
                  boxShadow:isPeak?`0 0 5px ${(homeColor||C.blue)}88`:"none" }}/>
                <div style={{ flex:1, background:isPeak?(awayColor||C.red):(awayColor||C.red)+"99",
                  borderRadius:"2px 2px 0 0", height:(v.a/maxVal*100)+"%",
                  transition:"height 0.7s cubic-bezier(.4,0,.2,1) 0.05s", minHeight:v.a>0?2:0,
                  boxShadow:isPeak?`0 0 5px ${(awayColor||C.red)}88`:"none" }}/>
              </div>
              <span style={{ fontSize:7.5, color:isPeak?C.gold:C.soft, fontFamily:"JetBrains Mono,monospace", textAlign:"center" }}>{periods[i]}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
        {[(homeTeam||"Home").split(" ").pop(), homeColor||C.blue,
          (awayTeam||"Away").split(" ").pop(), awayColor||C.red].reduce((acc,_,i,a)=>{
          if(i%2===0) acc.push({name:a[i],color:a[i+1]});
          return acc;
        },[]).map(({name,color})=>(
          <span key={name} style={{ fontSize:9, color, display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ width:8, height:8, borderRadius:2, background:color, display:"inline-block" }}/>
            {name}
          </span>
        ))}
      </div>
    </div>
  );
};

// ─── Stat bar ────────────────────────────────────────────────────────────────
const StatBar = ({ label, homeVal, awayVal, homeColor, awayColor, fmt }) => {
  const h = parseFloat(homeVal)||0, a = parseFloat(awayVal)||0, tot = h+a||1;
  const hp = h/tot*100, ap = a/tot*100;
  const f = fmt || (v => v);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:13, fontWeight:800, color:homeColor||C.blue, fontFamily:"JetBrains Mono,monospace" }}>{f(h)}</span>
        <span style={{ fontSize:9, fontWeight:900, color:C.muted, letterSpacing:".1em", textTransform:"uppercase" }}>{label}</span>
        <span style={{ fontSize:13, fontWeight:800, color:awayColor||C.red, fontFamily:"JetBrains Mono,monospace" }}>{f(a)}</span>
      </div>
      <div style={{ display:"flex", height:5, borderRadius:3, overflow:"hidden", gap:1 }}>
        <div style={{ flex:hp, background:"#ffffff", borderRadius:"3px 0 0 3px", transition:"flex 0.6s ease" }}/>
        <div style={{ flex:ap, background:"#bfbfbf", borderRadius:"0 3px 3px 0", transition:"flex 0.6s ease" }}/>
      </div>
    </div>
  );
};

// ─── Heatmap ──────────────────────────────────────────────────────────────────
const Heatmap = ({ topScores, homeTeam, awayTeam }) => {
  if (!topScores || !topScores.length) return null;
  const G = 5, pm = {}; let mx = 0;
  topScores.forEach(({ score, prob }) => {
    const [h, a] = score.split("-").map(Number);
    if (h < G && a < G) { pm[h+"-"+a] = prob; if (prob > mx) mx = prob; }
  });
  const heat = (p, m) => {
    if (!m) return "rgba(255,255,255,0.02)";
    const t = Math.min(p/m, 1);
    if (t < 0.25) return `rgba(200,200,200,${(t/0.25*0.3+0.04).toFixed(2)})`;
    if (t < 0.6)  return `rgba(150,150,150,${((t-0.25)/0.35*0.5+0.15).toFixed(2)})`;
    return `rgba(80,80,80,${((t-0.6)/0.4*0.55+0.35).toFixed(2)})`;
  };
  const rows = [0,1,2,3,4];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <span style={{ fontSize:10, fontWeight:900, color:C.muted, letterSpacing:".1em" }}>CORRECT SCORE GRID</span>
        <div style={{ display:"flex", gap:8 }}>
          <span style={{ fontSize:9, color:"#ffffff" }}>{(homeTeam||"H").split(" ").pop().slice(0,4)} scored</span>
          <span style={{ fontSize:9, color:"#bfbfbf" }}>{(awayTeam||"A").split(" ").pop().slice(0,4)} scored</span>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"22px repeat(5,1fr)", gap:3 }}>
        <div/>
        {rows.map(a => <div key={a} style={{ textAlign:"center",fontSize:10,fontWeight:700,color:C.soft,fontFamily:"JetBrains Mono,monospace" }}>{a}</div>)}
        {rows.map(h => [
          <div key={"r"+h} style={{ display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:C.soft,fontFamily:"JetBrains Mono,monospace" }}>{h}</div>,
          ...rows.map(a => {
            const p = pm[h+"-"+a]||0, pct = Math.round(p*100), isTop = p===mx&&mx>0;
            return (
              <div key={h+"-"+a}
                style={{ aspectRatio:1,minHeight:26,display:"flex",alignItems:"center",justifyContent:"center",
                  borderRadius:5,background:heat(p,mx),fontSize:9,fontWeight:800,color:"rgba(255,255,255,0.75)",
                  fontFamily:"JetBrains Mono,monospace",outline:isTop?"1.5px solid rgba(255,255,255,0.35)":"none",
                  transition:"transform 0.15s",cursor:"default" }}
                onMouseEnter={e=>{ e.currentTarget.style.transform="scale(1.15)"; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform=""; }}
                title={`${h}-${a}: ${(p*100).toFixed(1)}%`}>
                {pct > 0 ? pct+"%" : ""}
              </div>
            );
          })
        ])}
      </div>
      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
        <span style={{ fontSize:9, color:"#ffffff" }}>Low</span>
        <div style={{ flex:1,height:3,borderRadius:2,background:"linear-gradient(to right,#222,#888,#ffffff)" }}/>
        <span style={{ fontSize:9, color:"#bfbfbf" }}>High</span>
      </div>
    </div>
  );
};


// ─── H2H widget ───────────────────────────────────────────────────────────────
const H2HWidget = ({ homeId, awayId, homeTeam, awayTeam, homeColor, awayColor }) => {
  const [data,setData]=useState(null); const [loading,setLoading]=useState(true);
  useEffect(()=>{
    if(!homeId||!awayId){setLoading(false);return;}
    getH2H(homeId,awayId,8).then(d=>{setData(d);setLoading(false);}).catch(()=>setLoading(false));
  },[homeId,awayId]);
  if(loading) return <div style={{height:80,borderRadius:10,background:"rgba(255,255,255,0.03)"}}/>;
  if(!data||!data.results||!data.results.length)
    return <div style={{padding:"12px",textAlign:"center",color:C.muted,fontSize:12}}>No H2H data</div>;
  const res=data.results; let hw=0,d2=0,aw=0;
  res.forEach(r=>{
    const isHome=r.home_team===homeTeam;
    if(r.home_goals>r.away_goals){if(isHome)hw++;else aw++;}
    else if(r.home_goals===r.away_goals) d2++;
    else {if(isHome)aw++;else hw++;}
  });
  const tot=hw+d2+aw||1;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {/* Visual H2H summary */}
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        {[{label:(homeTeam||"").split(" ").pop(),val:hw,color:homeColor||C.blue},
          {label:"Draw",val:d2,color:C.muted},
          {label:(awayTeam||"").split(" ").pop(),val:aw,color:awayColor||C.red}
        ].map(({label,val,color})=>(
          <div key={label} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,
            padding:"8px 4px",borderRadius:8,background:"rgba(255,255,255,0.03)",border:"1px solid "+C.line}}>
            <span style={{fontSize:24,fontWeight:900,color,fontFamily:"JetBrains Mono,monospace"}}>{val}</span>
            <span style={{fontSize:9,fontWeight:800,color:C.muted,letterSpacing:".07em"}}>{label.slice(0,7)}</span>
            <span style={{fontSize:9,color:C.soft}}>{Math.round(val/tot*100)}%</span>
          </div>
        ))}
      </div>
      {/* Bar */}
      <div style={{display:"flex",height:6,borderRadius:3,overflow:"hidden",gap:1}}>
        <div style={{flex:hw,background:"#ffffff",transition:"flex 0.6s ease"}}/>
        <div style={{flex:d2,background:"rgba(120,130,150,0.3)"}}/>
        <div style={{flex:aw,background:"#bfbfbf",transition:"flex 0.6s ease"}}/>
      </div>
      {/* Recent results */}
      <div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:180,overflowY:"auto"}}>
        {res.slice(0,6).map((r,i)=>{
          const isHome=r.home_team===homeTeam,hg=r.home_goals,ag=r.away_goals;
          const win=(hg>ag&&isHome)||(ag>hg&&!isHome)?"W":hg===ag?"D":"L";
          const wc={W:"#ffffff",D:"#7a7a7a",L:"#444444"}[win];
          return(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:6,background:"rgba(255,255,255,0.02)"}}>
              <span style={{fontSize:10,color:C.soft,minWidth:72,fontFamily:"JetBrains Mono,monospace"}}>{r.date}</span>
              <span style={{flex:1,fontSize:11,fontWeight:700,color:C.muted,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.home_team}</span>
              <span style={{padding:"2px 8px",borderRadius:4,background:"rgba(255,255,255,0.05)",fontSize:12,fontWeight:900,color:"#fff",fontFamily:"JetBrains Mono,monospace",minWidth:40,textAlign:"center"}}>
                {r.home_goals} – {r.away_goals}
              </span>
              <span style={{flex:1,fontSize:11,fontWeight:700,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.away_team}</span>
              <span style={{width:18,height:18,borderRadius:4,background:wc+"22",border:"1px solid "+wc+"55",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:wc}}>{win}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Injuries widget ──────────────────────────────────────────────────────────
const InjuryWidget = ({ homeTeam, awayTeam, homeColor, awayColor, allInjuries }) => {
  const filter = team => (allInjuries||[]).filter(i=>i.team_name===team).slice(0,5);
  const homeInj=filter(homeTeam), awayInj=filter(awayTeam);
  const PersonIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.3" opacity="0.5"/>
      <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
  if(!homeInj.length&&!awayInj.length) return(
    <div style={{padding:"12px",textAlign:"center",color:C.muted,fontSize:12,display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round"/></svg>
      No current injuries reported
    </div>);
  const typeColor = t => t&&t.toLowerCase().includes("suspend")?"#bfbfbf":C.red;
  const Side = ({team,injuries,color}) => (
    <div style={{flex:1}}>
      <div style={{fontSize:10,fontWeight:900,color,letterSpacing:".08em",marginBottom:6,borderBottom:"1px solid "+color+"33",paddingBottom:4}}>
        {team.split(" ").pop()}
      </div>
      {injuries.length===0
        ?<div style={{fontSize:11,color:C.soft,padding:"6px 0"}}>Full squad available</div>
        :injuries.map((inj,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
            {inj.player_photo
              ?<img src={inj.player_photo} style={{width:24,height:24,borderRadius:"50%",objectFit:"cover"}} onError={e=>{e.currentTarget.style.display="none";}}/>
              :<div style={{width:24,height:24,borderRadius:"50%",background:"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.3)"}}><PersonIcon/></div>}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,fontWeight:800,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inj.player_name}</div>
              <div style={{fontSize:9,color:typeColor(inj.type)}}>{inj.reason||inj.type}</div>
            </div>
          </div>
        ))
      }
    </div>
  );
  return(
    <div style={{display:"flex",gap:16}}>
      <Side team={homeTeam} injuries={homeInj} color={homeColor||C.blue}/>
      <div style={{width:1,background:C.line}}/>
      <Side team={awayTeam} injuries={awayInj} color={awayColor||C.red}/>
    </div>
  );
};

// ─── Odds widget ──────────────────────────────────────────────────────────────
const OddsWidget = ({ fixtureId, pHome, pDraw, pAway, homeTeam, awayTeam }) => {
  const [odds,setOdds]=useState(null);
  useEffect(()=>{ if(!fixtureId) return; getFixtureOdds(fixtureId).then(setOdds).catch(()=>{}); },[fixtureId]);
  const impliedProb = odd => odd?Math.round(1/parseFloat(odd)*100):0;
  const modelPct = p => Math.round((p||0)*100);
  const diff = (model,implied) => { const d=model-implied; if(Math.abs(d)<3) return null; return{val:d>0?"+"+d:String(d),color:d>0?"#ffffff":"#7a7a7a"}; };
  if(!odds||!odds.bookmakers||!odds.bookmakers.length)
    return <div style={{padding:"12px",textAlign:"center",color:C.muted,fontSize:12}}>Loading odds data...</div>;
  const bk=odds.bookmakers[0], mw=bk.bets["Match Winner"]||{};
  const homeOdd=mw["Home"], drawOdd=mw["Draw"], awayOdd=mw["Away"];
  const outcomes=[
    {label:(homeTeam||"").split(" ").pop().slice(0,8),odd:homeOdd,model:modelPct(pHome),color:"#ffffff"},
    {label:"Draw",odd:drawOdd,model:modelPct(pDraw),color:C.muted},
    {label:(awayTeam||"").split(" ").pop().slice(0,8),odd:awayOdd,model:modelPct(pAway),color:"#bfbfbf"},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      <div style={{display:"flex",gap:4}}>
        {outcomes.map(({label,odd,model,color})=>{
          const imp=impliedProb(odd), d=imp?diff(model,imp):null;
          return(
            <div key={label} style={{flex:1,display:"flex",flexDirection:"column",gap:3,alignItems:"center",
              padding:"8px 4px",borderRadius:8,background:"rgba(255,255,255,0.02)",border:"1px solid "+C.line}}>
              <span style={{fontSize:9,fontWeight:800,color:C.muted,letterSpacing:".06em"}}>{label}</span>
              <span style={{fontSize:20,fontWeight:900,color:"#fff",fontFamily:"JetBrains Mono,monospace"}}>{odd||"—"}</span>
              <span style={{fontSize:10,color:C.soft}}>Implied: {imp}%</span>
              <span style={{fontSize:10,color}}>Model: {model}%</span>
              {d&&<span style={{fontSize:10,fontWeight:800,color:d.color,background:"rgba(255,255,255,0.08)",padding:"1px 6px",borderRadius:4}}>Edge {d.val}%</span>}
            </div>
          );
        })}
      </div>
      <div style={{fontSize:9,color:C.soft,textAlign:"center"}}>{bk.name}</div>
    </div>
  );
};


// ─── Team Stats comparison ────────────────────────────────────────────────────
const TeamStatsWidget = ({ hStats, aStats, homeTeam, awayTeam, homeColor, awayColor }) => {
  if(!hStats&&!aStats) return <div style={{padding:"12px",textAlign:"center",color:C.muted,fontSize:12}}>Stats loading...</div>;
  const h=hStats||{}, a=aStats||{};
  const bars=[
    {label:"Goals/Game",hv:h.played_home+h.played_away>0?((h.scored_home||0)+(h.scored_away||0))/(h.played_home+h.played_away||1):0,
     av:a.played_home+a.played_away>0?((a.scored_home||0)+(a.scored_away||0))/(a.played_home+a.played_away||1):0,fmt:v=>v.toFixed(2)},
    {label:"Shots/Game",   hv:h.shots_pg||0, av:a.shots_pg||0, fmt:v=>v.toFixed(1)},
    {label:"On Target %",  hv:h.shots_on_target_pct||0, av:a.shots_on_target_pct||0, fmt:v=>v.toFixed(0)+"%"},
    {label:"Possession",   hv:h.possession_avg||50, av:a.possession_avg||50, fmt:v=>v+"%"},
    {label:"Pass Acc.",    hv:h.pass_accuracy||0, av:a.pass_accuracy||0, fmt:v=>v.toFixed(0)+"%"},
    {label:"Yellow/Game",  hv:h.yellow_pg||0, av:a.yellow_pg||0, fmt:v=>v.toFixed(2), reverse:true},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
        <span style={{fontSize:11,fontWeight:800,color:homeColor||C.blue}}>{(homeTeam||"").split(" ").pop()}</span>
        <span style={{fontSize:11,fontWeight:800,color:awayColor||C.red}}>{(awayTeam||"").split(" ").pop()}</span>
      </div>
      {bars.map(({label,hv,av,fmt,reverse})=>{
        const hBetter=reverse?hv<av:hv>av, aBetter=reverse?av<hv:av>hv;
        return <StatBar key={label} label={label} homeVal={hv} awayVal={av}
          homeColor={hBetter?(homeColor||C.blue):C.soft} awayColor={aBetter?(awayColor||C.red):C.soft} fmt={fmt}/>;
      })}
      {(h.formation||a.formation)&&(
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.muted,marginTop:4}}>
          {h.formation&&<span style={{display:"flex",alignItems:"center",gap:5}}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 9L5 1L9 9H1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
            {h.formation}
          </span>}
          {a.formation&&<span style={{display:"flex",alignItems:"center",gap:5}}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 9L5 1L9 9H1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
            {a.formation}
          </span>}
        </div>
      )}
    </div>
  );
};

// ─── API prediction widget ────────────────────────────────────────────────────
const APIPredWidget = ({ fixtureId, homeTeam, awayTeam, homeColor, awayColor }) => {
  const [pred,setPred]=useState(null);
  useEffect(()=>{ if(!fixtureId) return; getApiPrediction(fixtureId).then(setPred).catch(()=>{}); },[fixtureId]);
  if(!pred||!pred.advice) return null;
  const comp=pred.comparison||{};
  const axes=Object.entries({Form:"form",Attack:"att",Defence:"def","H2H":"h2h",Goals:"goals"});
  return(
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {pred.advice&&(
        <div style={{padding:"8px 12px",borderRadius:8,background:"rgba(150,150,150,0.08)",border:"1px solid rgba(150,150,150,0.2)",
          fontSize:12,color:"#bfbfbf",fontWeight:700,textAlign:"center",display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="5" stroke={C.gold} strokeWidth="1.3"/><path d="M6 4v3M6 8.5v.5" stroke={C.gold} strokeWidth="1.3" strokeLinecap="round"/></svg>
          {pred.advice}
        </div>
      )}
      {axes.map(([label,key])=>{
        const hv=parseFloat(comp[key]&&comp[key].home)||0;
        const av=parseFloat(comp[key]&&comp[key].away)||0;
        if(!hv&&!av) return null;
        return <StatBar key={key} label={label} homeVal={hv} awayVal={av}
          homeColor={homeColor||C.blue} awayColor={awayColor||C.red} fmt={v=>v.toFixed(0)+"%"}/>;
      })}
    </div>
  );
};

// ─── Confidence / Prediction Strength meter ───────────────────────────────────
const ConfMeter = ({ value }) => {
  const color=value>=72?"#ffffff":value>=52?"#bfbfbf":value>=36?"#888888":"#555555";
  const label=value>=72?"Strong":value>=52?"Moderate":value>=36?"Uncertain":"Low";
  return(
    <div style={{display:"flex",alignItems:"center",gap:7}}>
      <span style={{fontSize:8,fontWeight:900,color:"#2a4a6a",letterSpacing:".07em",whiteSpace:"nowrap"}}>STRENGTH</span>
      <div style={{width:68,height:4,borderRadius:2,background:"rgba(255,255,255,0.05)",overflow:"hidden"}}>
        <div style={{width:value+"%",height:"100%",background:color,borderRadius:2,
          boxShadow:`0 0 5px ${color}66`,transition:"width 0.85s cubic-bezier(.4,0,.2,1)"}}/>
      </div>
      <span style={{fontSize:10,fontWeight:900,color,fontFamily:"JetBrains Mono,monospace",minWidth:52}}>{label}</span>
    </div>
  );
};


// ─── Passing Network Animation ─────────────────────────────────────────────────
// Replaces the old ball-path animation.
// Shows players as glowing nodes, passes flowing between them as animated
// dashed lines, culminating in a shot on goal. Secondary players pulse with
// "movement" blobs. Outcome changes which side scores / where ball ends up.
const MiniPitch = ({ outcome, homeProb, awayProb, homeTeam, awayTeam, leagueColor }) => {
  const uid = React.useRef(Math.random().toString(36).slice(2, 8)).current;
  const W = 340, H = 64;
  const MY = H / 2;
  const isHome = outcome === "home";
  const isAway = outcome === "away";
  const isDraw = outcome === "draw";
  const lc = leagueColor || "#ffffff";

  // Team colours
  const hCol = lc;
  const aCol = isAway ? "#bfbfbf" : "rgba(80,80,80,0.5)";

  // Player node positions [x, y, team("h"/"a"), role]
  // Home players on left half, away on right half
  const nodes = [
    // Home (attacking toward right)
    { x:18,  y:MY,     t:"h", r:"gk"  },
    { x:70,  y:MY-16, t:"h", r:"def" },
    { x:70,  y:MY+16, t:"h", r:"def" },
    { x:120, y:MY-10, t:"h", r:"mid" },
    { x:120, y:MY+10, t:"h", r:"mid" },
    { x:168, y:MY,    t:"h", r:"fwd" },
    // Away (attacking toward left)
    { x:322, y:MY,     t:"a", r:"gk"  },
    { x:272, y:MY-16, t:"a", r:"def" },
    { x:272, y:MY+16, t:"a", r:"def" },
    { x:224, y:MY-10, t:"a", r:"mid" },
    { x:224, y:MY+10, t:"a", r:"mid" },
    { x:178, y:MY,    t:"a", r:"fwd" },
  ];

  // Pass sequences — each is a list of node indices the ball travels through
  // For home win: ball flows home side → goal right
  // For away win: ball flows away side → goal left
  // For draw: ball flows to centre, bounces back
  const homePassSeq = [2, 4, 5];   // def → mid → fwd
  const awayPassSeq = [8, 10, 11]; // def → mid → fwd
  const drawSeq     = [4, 5, 11];  // home mid → home fwd → away fwd (contested)

  const activeSeq = isHome ? homePassSeq : isAway ? awayPassSeq : drawSeq;

  // Goal mouth positions
  const goalR = { x:W-6,  y:MY, gy1:MY-10, gy2:MY+10 };
  const goalL = { x:6,    y:MY, gy1:MY-10, gy2:MY+10 };
  const shotEnd = isHome ? goalR : isAway ? goalL : { x:W/2, y:MY };

  // Build SVG path for pass sequence + final shot
  const seqPts = activeSeq.map(i => nodes[i]);
  const fullPath = [
    ...seqPts,
    shotEnd,
  ];

  // Build cubic bezier path through all points
  const pathD = fullPath.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = fullPath[i-1];
    const cpx1 = prev.x + (pt.x - prev.x) * 0.4;
    const cpy1 = prev.y;
    const cpx2 = prev.x + (pt.x - prev.x) * 0.6;
    const cpy2 = pt.y;
    return acc + ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${pt.x} ${pt.y}`;
  }, "");

  // Approximate path length for dash offset
  const pathLen = fullPath.reduce((sum, pt, i) => {
    if (i === 0) return 0;
    const prev = fullPath[i-1];
    return sum + Math.hypot(pt.x-prev.x, pt.y-prev.y);
  }, 0) * 1.1;

  const DELAY = 0.3;
  const DUR   = isDraw ? 1.6 : 2.2;
  const glowCol = isHome ? hCol : isAway ? "#bfbfbf" : "#888888";

  const css = `
    @keyframes mn_ball_${uid}  { 0%{offset-distance:0%} 100%{offset-distance:100%} }
    @keyframes mn_trail_${uid} { 0%{stroke-dashoffset:${pathLen};opacity:0} 8%{opacity:.55}
                                  80%{stroke-dashoffset:0;opacity:.4} 100%{opacity:0} }
    @keyframes mn_glow_${uid}  { 0%,70%{opacity:0;r:6} 85%{opacity:1;r:12} 100%{opacity:0;r:20} }
    @keyframes mn_net_${uid}   { 0%,72%{opacity:0} 84%{opacity:.35} 100%{opacity:0} }
    @keyframes mn_pulse_${uid} { 0%{r:12;opacity:.35} 100%{r:22;opacity:0} }
    @keyframes mn_nod_${uid}   { 0%,100%{opacity:.45;r:4.5} 50%{opacity:.8;r:5.5} }
    @keyframes mn_act_${uid}   { 0%,100%{opacity:.7;r:5} 30%{opacity:1;r:6.5} }
    @keyframes mn_halo_${uid}  { 0%{r:8;opacity:.25} 100%{r:16;opacity:0} }
  `;

  const NodeEl = ({ node, idx }) => {
    const col = node.t === "h" ? hCol : aCol;
    const isActive = activeSeq.includes(idx);
    const animDur  = 1.8 + idx * 0.13;
    const animDel  = idx * 0.08;
    return (
      <g key={idx}>
        {/* Subtle halo for active nodes */}
        {isActive && (
          <circle cx={node.x} cy={node.y} r="8" fill={col} opacity="0"
            style={{ animation:`mn_halo_${uid} 1.2s ${DELAY+0.4}s ease-out forwards` }}/>
        )}
        {/* Node */}
        <circle cx={node.x} cy={node.y} r={node.r==="gk"?4:isActive?5:4.5}
          fill={col}
          opacity={node.r==="gk" ? 0.35 : isActive ? 0.9 : 0.45}
          style={{ animation:isActive
            ? `mn_act_${uid} ${animDur}s ${animDel}s ease-in-out infinite`
            : `mn_nod_${uid} ${animDur}s ${animDel}s ease-in-out infinite` }}/>
        {/* Position dot */}
        <circle cx={node.x} cy={node.y} r="1.5" fill="rgba(255,255,255,0.6)" opacity={isActive?0.9:0.3}/>
      </g>
    );
  };

  // Static connection lines between teammates (faint)
  const connections = [
    [0,1],[0,2],[1,3],[2,4],[3,5],[4,5],     // home side
    [6,7],[6,8],[7,9],[8,10],[9,11],[10,11],  // away side
    [5,11],                                    // fwd duel
  ];

  return (
    <div style={{ width:"100%", marginTop:10, marginBottom:0, lineHeight:0 }}>
      <style>{css}</style>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ display:"block", borderRadius:8, opacity:0.82 }} aria-hidden="true">
        <defs>
          <linearGradient id={`pg_${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#091f0d"/>
            <stop offset="100%" stopColor="#050f06"/>
          </linearGradient>
          <pattern id={`ps_${uid}`} width="34" height={H} patternUnits="userSpaceOnUse">
            <rect width="17" height={H} fill="rgba(255,255,255,0.015)"/>
          </pattern>
          <radialGradient id={`ball_${uid}`} cx="35%" cy="28%" r="65%">
            <stop offset="0%" stopColor="#ffffff"/>
            <stop offset="100%" stopColor="#aaccdd"/>
          </radialGradient>
          <filter id={`gf_${uid}`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3"/>
          </filter>
          <filter id={`nf_${uid}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2"/>
          </filter>
        </defs>

        {/* Pitch */}
        <rect x="0" y="0" width={W} height={H} rx="8" fill={`url(#pg_${uid})`}/>
        <rect x="0" y="0" width={W} height={H} rx="8" fill={`url(#ps_${uid})`}/>

        {/* Pitch markings */}
        <line x1={W/2} y1="4" x2={W/2} y2={H-4}
          stroke="rgba(255,255,255,0.09)" strokeWidth="0.7" strokeDasharray="3 2"/>
        <circle cx={W/2} cy={MY} r="10" fill="none"
          stroke="rgba(255,255,255,0.08)" strokeWidth="0.7"/>
        <circle cx={W/2} cy={MY} r="1.5" fill="rgba(255,255,255,0.2)"/>
        <rect x="2" y={MY-11} width="16" height="22" rx="1.5"
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.7"/>
        <rect x={W-18} y={MY-11} width="16" height="22" rx="1.5"
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.7"/>

        {/* Goals */}
        {/* Left goal */}
        <line x1="2" y1={MY-10} x2="8" y2={MY-10} stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round"/>
        <line x1="2" y1={MY+10} x2="8" y2={MY+10} stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round"/>
        <line x1="2.5" y1={MY-10} x2="2.5" y2={MY+10} stroke="rgba(255,255,255,0.65)" strokeWidth="2"/>
        {/* Net flash left */}
        {isAway && <rect x="2" y={MY-10} width="6" height="20" rx="1"
          fill="rgba(255,255,255,0.3)" opacity="0"
          style={{animation:`mn_net_${uid} 0.7s ${DELAY+DUR*0.88}s ease-out forwards`}}/>}

        {/* Right goal */}
        <line x1={W-8} y1={MY-10} x2={W-2} y2={MY-10} stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round"/>
        <line x1={W-8} y1={MY+10} x2={W-2} y2={MY+10} stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round"/>
        <line x1={W-2.5} y1={MY-10} x2={W-2.5} y2={MY+10} stroke="rgba(255,255,255,0.65)" strokeWidth="2"/>
        {/* Net flash right */}
        {isHome && <rect x={W-8} y={MY-10} width="6" height="20" rx="1"
          fill={lc} opacity="0"
          style={{animation:`mn_net_${uid} 0.7s ${DELAY+DUR*0.88}s ease-out forwards`}}/>}

        {/* Team abbreviations */}
        <text x="24" y={H-4} fontSize="6.5" fontWeight="900"
          fill={`${hCol}55`} textAnchor="middle" fontFamily="Sora,sans-serif">
          {(homeTeam||"HOME").slice(0,3).toUpperCase()}
        </text>
        <text x={W-24} y={H-4} fontSize="6.5" fontWeight="900"
          fill={`${isAway?"#bfbfbf":"rgba(180,180,180,0.35)"}55`} textAnchor="middle" fontFamily="Sora,sans-serif">
          {(awayTeam||"AWAY").slice(0,3).toUpperCase()}
        </text>

        {/* Static connection lines */}
        {connections.map(([a,b], i) => (
          <line key={i}
            x1={nodes[a].x} y1={nodes[a].y}
            x2={nodes[b].x} y2={nodes[b].y}
            stroke={nodes[a].t==="h" ? hCol : aCol}
            strokeWidth="0.6" opacity="0.12"/>
        ))}

        {/* Player nodes */}
        {nodes.map((node, i) => <NodeEl key={i} node={node} idx={i}/>)}

        {/* Animated pass trail */}
        <path d={pathD} fill="none" stroke={glowCol} strokeWidth="1.8"
          strokeDasharray="5 7" strokeDashoffset={pathLen} opacity="0"
          style={{
            animation:`mn_trail_${uid} ${DUR}s ${DELAY}s ease-in-out forwards`,
            filter:`drop-shadow(0 0 3px ${glowCol}88)`,
          }}/>

        {/* Ball glow */}
        <circle r={6} fill={glowCol} opacity="0" filter={`url(#gf_${uid})`}
          style={{
            offsetPath:`path("${pathD}")`,
            offsetDistance:"0%",
            animation:`mn_ball_${uid} ${DUR}s ${DELAY}s cubic-bezier(.2,0,.4,1) forwards`,
          }}/>

        {/* Main ball */}
        <circle r="4" fill={`url(#ball_${uid})`} stroke="rgba(0,0,0,0.3)" strokeWidth="0.5"
          style={{
            offsetPath:`path("${pathD}")`,
            offsetDistance:"0%",
            animation:`mn_ball_${uid} ${DUR}s ${DELAY}s cubic-bezier(.2,0,.4,1) forwards`,
            filter:`drop-shadow(0 1px 2px ${glowCol}66)`,
          }}/>

        {/* Goal impact burst */}
        {!isDraw && (
          <circle cx={shotEnd.x} cy={shotEnd.y} r="6" fill={glowCol} opacity="0"
            style={{
              animation:`mn_glow_${uid} 0.9s ${DELAY+DUR*0.87}s ease-out forwards`,
              transformOrigin:`${shotEnd.x}px ${shotEnd.y}px`,
              filter:`url(#gf_${uid})`,
            }}/>
        )}

        {/* Draw centre pulse */}
        {isDraw && (
          <circle cx={W/2} cy={MY} r="12" fill="none" stroke={glowCol} strokeWidth="1" opacity="0"
            style={{animation:`mn_pulse_${uid} 0.9s ${DELAY+DUR*0.9}s ease-out forwards`}}/>
        )}
      </svg>
    </div>
  );
};



// ─── Scenario Explorer (replaces News Panel) ─────────────────────────────────
// A sandbox for model assumptions. Does NOT modify official predictions.
const ScenarioExplorer = ({ match }) => {
  const [mods, setMods] = React.useState({ homeAtk:0, awayAtk:0, homeDef:0, awayDef:0, tempo:0 });
  const reset = () => setMods({ homeAtk:0, awayAtk:0, homeDef:0, awayDef:0, tempo:0 });

  // Derive scenario probabilities using simple Poisson approximation
  const scenario = React.useMemo(() => {
    if (!match) return null;
    const baseXgH = parseFloat(match.xg_home) || 1.3;
    const baseXgA = parseFloat(match.xg_away) || 1.1;
    const tempMult = 1 + (mods.tempo / 100);
    const xgH = Math.max(0.1, baseXgH * (1 + mods.homeAtk/100) * (1 - mods.awayDef/200) * tempMult);
    const xgA = Math.max(0.1, baseXgA * (1 + mods.awayAtk/100) * (1 - mods.homeDef/200) * tempMult);

    // Monte Carlo via Poisson PMF
    const poisson = (lam, k) => {
      let r = Math.exp(-lam); for (let i=0;i<k;i++) r*=lam/(i+1); return r;
    };
    let pH=0, pD=0, pA=0, topScore="1-0", topP=0;
    for (let h=0;h<=6;h++) for (let a=0;a<=6;a++) {
      const p = poisson(xgH,h)*poisson(xgA,a);
      if (h>a) pH+=p; else if (h===a) pD+=p; else pA+=p;
      if (p>topP) { topP=p; topScore=`${h}-${a}`; }
    }
    const tot = pH+pD+pA||1;
    return {
      pH: Math.round(pH/tot*100), pD: Math.round(pD/tot*100), pA: Math.round(pA/tot*100),
      xgH: xgH.toFixed(2), xgA: xgA.toFixed(2), topScore,
    };
  }, [match, mods]);

  // Default message when no match selected
  if (!match) return (
    <div style={{background:"#111",border:"1px solid #222",borderRadius:10,padding:20,
      display:"flex",flexDirection:"column",gap:8,alignItems:"center",justifyContent:"center",height:200}}>
      <span style={{fontSize:11,color:"#7a7a7a",textAlign:"center"}}>
        Click a match card to load the Scenario Explorer
      </span>
    </div>
  );

  const Slider = ({ label, key2, min=-20, max=20 }) => {
    const val = mods[key2];
    const sign = val > 0 ? "+" : "";
    return (
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:10,color:"#bfbfbf",fontFamily:"Inter,sans-serif"}}>{label}</span>
          <span style={{fontSize:11,fontWeight:700,color:val===0?"#7a7a7a":val>0?"#ffffff":"#bfbfbf",
            fontFamily:"JetBrains Mono,monospace",minWidth:36,textAlign:"right"}}>{sign}{val}%</span>
        </div>
        <input type="range" min={min} max={max} value={val}
          onChange={e => setMods(prev => ({...prev,[key2]:parseInt(e.target.value)}))}
          style={{width:"100%",accentColor:"#ffffff",cursor:"pointer"}}/>
      </div>
    );
  };

  const ProbBar = ({ label, pct, isHighlight }) => (
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:10,color:"#bfbfbf",fontFamily:"Inter,sans-serif"}}>{label}</span>
        <span style={{fontSize:12,fontWeight:900,color:isHighlight?"#ffffff":"#7a7a7a",
          fontFamily:"JetBrains Mono,monospace"}}>{pct}%</span>
      </div>
      <div style={{height:4,background:"#222",borderRadius:2,overflow:"hidden"}}>
        <div style={{width:pct+"%",height:"100%",background:isHighlight?"#ffffff":"#444",
          borderRadius:2,transition:"width 0.3s ease"}}/>
      </div>
    </div>
  );

  const maxP = Math.max(scenario.pH, scenario.pD, scenario.pA);

  return (
    <div style={{background:"#111",border:"1px solid #222",borderRadius:10,overflow:"hidden",
      display:"flex",flexDirection:"column",position:"sticky",top:72}}>

      {/* Header */}
      <div style={{padding:"12px 14px",borderBottom:"1px solid #222"}}>
        <div style={{fontSize:11,fontWeight:900,color:"#ffffff",letterSpacing:".06em",
          fontFamily:"Sora,sans-serif",marginBottom:4}}>SCENARIO SIMULATOR</div>
        <div style={{fontSize:9,color:"#7a7a7a",lineHeight:1.5,fontFamily:"Inter,sans-serif"}}>
          Adjust assumptions to explore hypothetical outcomes. Official predictions remain unchanged.
        </div>
      </div>

      {/* Match context */}
      <div style={{padding:"10px 14px",borderBottom:"1px solid #222",
        display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:11,fontWeight:700,color:"#ffffff",fontFamily:"Sora,sans-serif",
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"45%"}}>
          {match.home_team}
        </span>
        <span style={{fontSize:9,color:"#7a7a7a",fontFamily:"JetBrains Mono,monospace"}}>vs</span>
        <span style={{fontSize:11,fontWeight:700,color:"#bfbfbf",fontFamily:"Sora,sans-serif",
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"45%",textAlign:"right"}}>
          {match.away_team}
        </span>
      </div>

      {/* Sliders */}
      <div style={{padding:"12px 14px",borderBottom:"1px solid #222",display:"flex",flexDirection:"column",gap:10}}>
        <div style={{fontSize:9,fontWeight:900,color:"#7a7a7a",letterSpacing:".1em",
          fontFamily:"Inter,sans-serif",marginBottom:2}}>ASSUMPTIONS</div>
        <Slider label="Home Attack Modifier"  key2="homeAtk"/>
        <Slider label="Away Attack Modifier"  key2="awayAtk"/>
        <Slider label="Home Defense Modifier" key2="homeDef"/>
        <Slider label="Away Defense Modifier" key2="awayDef"/>
        <Slider label="Match Tempo"           key2="tempo" min={-10} max={10}/>
      </div>

      {/* Results */}
      <div style={{padding:"12px 14px",borderBottom:"1px solid #222",display:"flex",flexDirection:"column",gap:8}}>
        <div style={{fontSize:9,fontWeight:900,color:"#7a7a7a",letterSpacing:".1em",
          fontFamily:"Inter,sans-serif",marginBottom:2}}>SIMULATION RESULT</div>
        <ProbBar label="Home Win" pct={scenario.pH} isHighlight={scenario.pH===maxP}/>
        <ProbBar label="Draw"     pct={scenario.pD} isHighlight={scenario.pD===maxP}/>
        <ProbBar label="Away Win" pct={scenario.pA} isHighlight={scenario.pA===maxP}/>
      </div>

      {/* xG + scoreline */}
      <div style={{padding:"12px 14px",borderBottom:"1px solid #222"}}>
        <div style={{fontSize:9,fontWeight:900,color:"#7a7a7a",letterSpacing:".1em",
          fontFamily:"Inter,sans-serif",marginBottom:8}}>EXPECTED GOALS</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:900,color:"#ffffff",fontFamily:"JetBrains Mono,monospace"}}>{scenario.xgH}</div>
            <div style={{fontSize:9,color:"#7a7a7a",fontFamily:"Inter,sans-serif"}}>Home xG</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:13,fontWeight:900,color:"#7a7a7a",fontFamily:"JetBrains Mono,monospace",
              letterSpacing:".1em"}}>LIKELY</div>
            <div style={{fontSize:24,fontWeight:900,color:"#ffffff",fontFamily:"JetBrains Mono,monospace"}}>{scenario.topScore}</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:900,color:"#bfbfbf",fontFamily:"JetBrains Mono,monospace"}}>{scenario.xgA}</div>
            <div style={{fontSize:9,color:"#7a7a7a",fontFamily:"Inter,sans-serif"}}>Away xG</div>
          </div>
        </div>
      </div>

      {/* Reset button */}
      <div style={{padding:"10px 14px"}}>
        <button onClick={reset}
          style={{width:"100%",padding:"8px",borderRadius:6,border:"1px solid #333",background:"transparent",
            color:"#bfbfbf",fontSize:11,fontWeight:700,fontFamily:"Inter,sans-serif",cursor:"pointer",
            transition:"all 0.15s"}}
          onMouseEnter={e=>{e.currentTarget.style.background="#222";e.currentTarget.style.color="#fff";}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#bfbfbf";}}>
          Reset to Official Prediction
        </button>
      </div>
    </div>
  );
};



// ─── League Flag SVG (inline, no emojis) ─────────────────────────────────────
const LeagueFlag = ({ code, size=18 }) => {
  const flags = {
    epl:    (<svg width={size} height={Math.round(size*0.72)} viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#012169"/><path d="M0 0l18 13M18 0L0 13" stroke="white" strokeWidth="3"/><path d="M0 0l18 13M18 0L0 13" stroke="#C8102E" strokeWidth="1.8"/><path d="M9 0v13M0 6.5h18" stroke="white" strokeWidth="4"/><path d="M9 0v13M0 6.5h18" stroke="#C8102E" strokeWidth="2.4"/></svg>),
    laliga: (<svg width={size} height={Math.round(size*0.72)} viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#AA151B"/><rect y="2.8" width="18" height="7.4" fill="#F1BF00"/></svg>),
    seriea: (<svg width={size} height={Math.round(size*0.72)} viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#009246"/><rect x="6" width="6" height="13" fill="white"/><rect x="12" width="6" height="13" fill="#CE2B37"/></svg>),
    ligue1: (<svg width={size} height={Math.round(size*0.72)} viewBox="0 0 18 13" fill="none"><rect width="18" height="13" rx="2" fill="#002395"/><rect x="6" width="6" height="13" fill="white"/><rect x="12" width="6" height="13" fill="#ED2939"/></svg>),
  };
  return flags[code] || null;
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PredictionsPage({ league: propLeague, slugMap }) {
  const { league: paramLeague } = useParams();
  const raw = paramLeague || propLeague || "premier-league";
  const DEFAULTS = {
    "premier-league":"epl","la-liga":"laliga","serie-a":"seriea","ligue-1":"ligue1",
    "epl":"epl","laliga":"laliga","seriea":"seriea","ligue1":"ligue1",
  };
  const resolveMap = slugMap || DEFAULTS;
  const league = resolveMap[raw] || raw;
  const meta = LEAGUE_META[league] || { label:league.toUpperCase(), color:"#ffffff" };

  const [tab,setTab]             = useState("predictions");
  const [standings,setStandings] = useState([]);
  const [matches,setMatches]     = useState([]);
  const [injuries,setInjuries]   = useState([]);
  const [standLoad,setStandLoad] = useState(true);
  const [predLoad,setPredLoad]   = useState(true);
  const [standErr,setStandErr]   = useState(null);
  const [predErr,setPredErr]     = useState(null);
  const [sort,setSort]           = useState("confidence");
  const [selectedMatch, setSelectedMatch] = useState(null);

  const cache = useCallback((key,fn,setter,setLoading,setErr)=>{
    setLoading(true); setErr&&setErr(null);
    try{const r=sessionStorage.getItem(key);if(r){const{data,ts}=JSON.parse(r);if(Date.now()-ts<3600000){setter(data);setLoading(false);return;}}}catch{}
    fn().then(json=>{
      const d=json.standings||json.predictions||json.data||json||[];
      const arr=Array.isArray(d)?d:[];
      setter(arr);
      try{sessionStorage.setItem(key,JSON.stringify({data:arr,ts:Date.now()}));}catch{}
    }).catch(e=>{setErr&&setErr(e.message);}).finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{
    cache(`stn_v4_${league}`,()=>getStandings(league),setStandings,setStandLoad,setStandErr);
    cache(`pred_v4_${league}`,()=>getLeaguePredictions(league),setMatches,setPredLoad,setPredErr);
    getLeagueInjuries(league).then(d=>setInjuries(d.injuries||[])).catch(()=>{});
  },[league,cache]);

  const sorted = useMemo(()=>{
    if(!matches.length) return matches;
    return [...matches].sort((a,b)=>{
      if(sort==="confidence") return (b.confidence||0)-(a.confidence||0);
      if(sort==="date")       return (a.date||"").localeCompare(b.date||"");
      if(sort==="home")       return (b.p_home_win||0)-(a.p_home_win||0);
      return 0;
    });
  },[matches,sort]);

  const homeWins = matches.filter(m=>m.p_home_win>m.p_away_win&&m.p_home_win>m.p_draw).length;
  const draws    = matches.filter(m=>m.p_draw>=m.p_home_win&&m.p_draw>=m.p_away_win).length;
  const avgConf  = matches.length ? Math.round(matches.reduce((s,m)=>s+(m.confidence||0),0)/matches.length) : 0;

  const LEAGUE_TABS = [
    {code:"epl",    slug:"premier-league", label:"Premier League"},
    {code:"laliga", slug:"la-liga",         label:"La Liga"},
    {code:"seriea", slug:"serie-a",          label:"Serie A"},
    {code:"ligue1", slug:"ligue-1",           label:"Ligue 1"},
  ];

  return (
    <div className="page-shell" style={{ maxWidth:1400, margin:"0 auto", padding:"0 20px 48px" }}>

      {/* ── Page header ── */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
        flexWrap:"wrap", gap:14, padding:"24px 0 20px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:4,height:52,borderRadius:4,background:"#ffffff"}}/>
          <div>
            <h1 style={{ fontSize:28,fontWeight:900,color:"#ffffff",margin:"0 0 3px",
              letterSpacing:"-0.02em",fontFamily:"Sora,sans-serif",
              display:"flex",alignItems:"center",gap:10 }}>
              <LeagueFlag code={league} size={22}/>
              {meta.label}
            </h1>
            <p style={{ fontSize:12,color:C.muted,margin:0,fontWeight:600 }}>
              Live predictions · Elo · Dixon-Coles Poisson · Real xG · Pro data
            </p>
          </div>
        </div>

        {/* League selector pills */}
        <nav style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          {LEAGUE_TABS.map(({code,slug,label})=>{
            const lm=LEAGUE_META[code]||{};
            const active=league===code;
            return(
              <NavLink key={code} to={"/predictions/"+slug}
                style={{
                  display:"flex",alignItems:"center",gap:7,
                  padding:"7px 13px",borderRadius:999,fontSize:11,fontWeight:800,
                  textDecoration:"none",whiteSpace:"nowrap",
                  border:"1.5px solid "+(active?"#ffffff":"#333"),
                  color:active?"#ffffff":"#7a7a7a",
                  background:active?"rgba(255,255,255,0.06)":"transparent",
                  transition:"all 0.15s",
                }}>
                <span style={{display:"flex",alignItems:"center"}}><LeagueFlag code={code} size={16}/></span>
                {label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* ── Tab bar — no emojis ── */}
      <div style={{ display:"flex", borderBottom:"1px solid "+C.line, marginBottom:20 }}>
        {[
          ["predictions","Predictions",!predLoad?matches.length:null],
          ["standings","Table",!standLoad?standings.length:null],
          ["scorers","Scorers",null],
        ].map(([key,label,badge])=>(
          <button key={key} onClick={()=>setTab(key)}
            style={{ display:"flex",alignItems:"center",gap:7,padding:"12px 18px",
              fontSize:12,fontWeight:800,cursor:"pointer",background:"none",border:"none",
              fontFamily:"Inter,sans-serif",letterSpacing:".04em",
              color:tab===key?"#ffffff":"#7a7a7a",
              borderBottom:"2px solid "+(tab===key?"#ffffff":"transparent"),
              transition:"all 0.15s" }}>
            {label}
            {badge!=null&&(
              <span style={{ background:tab===key?(meta.color+"25"):"rgba(255,255,255,0.05)",
                color:tab===key?"#ffffff":"#7a7a7a",
                borderRadius:999,padding:"1px 7px",fontSize:10 }}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Main layout: predictions list + news sidebar ── */}
      {tab==="predictions" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20, alignItems:"start" }}>

          {/* Left: match cards with stats header */}
          <div>

            {/* ── Gameweek Overview — 2×4 stat tiles ── */}
            {!predLoad&&!predErr&&matches.length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:9,fontWeight:900,color:"#7a7a7a",letterSpacing:".12em",
                  fontFamily:"Inter,sans-serif",marginBottom:10}}>GAMEWEEK OVERVIEW</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                  {[
                    {val:matches.length,  label:"Fixtures"},
                    {val:homeWins,         label:"Home Favored"},
                    {val:draws,            label:"Draw Favored"},
                    {val:matches.length-homeWins-draws, label:"Away Favored"},
                    {val:(matches.reduce((s,m)=>s+(parseFloat(m.xg_home)||0),0)/matches.length||0).toFixed(2), label:"Avg xG Home"},
                    {val:(matches.reduce((s,m)=>s+(parseFloat(m.xg_away)||0),0)/matches.length||0).toFixed(2), label:"Avg xG Away"},
                    {val:matches.filter(m=>(m.btts||0)>=0.55).length, label:"BTTS Likely"},
                    {val:avgConf+"%",      label:"Avg Confidence"},
                  ].map(({val,label})=>(
                    <div key={label} style={{background:"#111",border:"1px solid #222",
                      borderRadius:8,padding:"12px 10px",display:"flex",flexDirection:"column",gap:3,
                      transition:"background 0.15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.background="#1a1a1a";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="#111";}}>
                      <span style={{fontSize:22,fontWeight:900,color:"#ffffff",
                        fontFamily:"JetBrains Mono,monospace",lineHeight:1}}>{val}</span>
                      <span style={{fontSize:9,color:"#7a7a7a",fontFamily:"Inter,sans-serif",
                        letterSpacing:".05em"}}>{label}</span>
                    </div>
                  ))}
                </div>
                {/* Sort controls */}
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:10}}>
                  <span style={{fontSize:10,color:"#7a7a7a",fontWeight:700,fontFamily:"Inter,sans-serif"}}>Sort:</span>
                  {["confidence","date","home"].map(s=>(
                    <button key={s} onClick={()=>setSort(s)}
                      style={{padding:"4px 10px",borderRadius:4,fontSize:10,fontWeight:700,cursor:"pointer",
                        fontFamily:"Inter,sans-serif",
                        border:"1px solid "+(sort===s?"#ffffff":"#333"),
                        background:sort===s?"rgba(255,255,255,0.08)":"transparent",
                        color:sort===s?"#ffffff":"#7a7a7a",transition:"all 0.13s"}}>
                      {s==="confidence"?"Confidence":s==="date"?"Date":"Home %"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {predErr&&<div style={{padding:20,background:"rgba(80,80,80,0.07)",border:"1px solid rgba(80,80,80,0.2)",borderRadius:12,color:"#bfbfbf",fontSize:13}}>Error: {predErr}</div>}

            {predLoad&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
              {Array.from({length:4}).map((_,i)=>(
                <div key={i} style={{height:120,borderRadius:16,background:"rgba(255,255,255,0.025)",animationDelay:i*80+"ms"}}/>
              ))}
            </div>}

            {!predLoad&&!predErr&&matches.length===0&&(
              <div style={{padding:40,textAlign:"center",color:C.muted,fontSize:14}}>No upcoming fixtures found.</div>
            )}

            {!predLoad&&!predErr&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {sorted.map((m,i)=>(
                  <MatchCard key={(m.home_team||"")+(m.away_team||"")+i}
                    match={m} idx={i} league={league} injuries={injuries}
                    onSelect={()=>setSelectedMatch(m)} isSelected={selectedMatch===m}/>
                ))}
              </div>
            )}
          </div>

          {/* Right: Scenario Explorer */}
          <div style={{ position:"sticky", top:72, maxHeight:"calc(100vh - 100px)", overflowY:"auto" }}>
            <ScenarioExplorer match={selectedMatch||sorted[0]}/>
          </div>
        </div>
      )}

      {/* ── Standings ── */}
      {tab==="standings"&&(
        <div style={{background:C.panel,border:"1px solid "+C.line,borderRadius:16,overflow:"hidden"}}>
          {standErr
            ?<div style={{padding:20,color:"#bfbfbf"}}>Error: {standErr}</div>
            :<StandingsTable rows={standings} loading={standLoad} league={league}/>}
        </div>
      )}

      {/* ── Scorers ── */}
      {tab==="scorers"&&<ScorersWidget league={league}/>}

      <style>{`
        ::-webkit-scrollbar       { width:4px; height:4px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:#333; border-radius:2px }
        input[type=range] { height:3px; }
        input[type=range]::-webkit-slider-track { background:#333; border-radius:2px; }
        input[type=range]::-webkit-slider-thumb { width:14px; height:14px; background:#fff; border-radius:50%; cursor:pointer; }
        @media(max-width:900px){
          .pred-grid { grid-template-columns:1fr !important; }
        }
      `}</style>
    </div>
  );
}