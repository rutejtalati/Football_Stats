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
  blue:"#4f9eff", blueDim:"rgba(79,158,255,0.12)", blueGlow:"rgba(79,158,255,0.3)",
  green:"#00e09e", greenDim:"rgba(0,224,158,0.1)", greenGlow:"rgba(0,224,158,0.25)",
  red:"#ff4d6d",  redDim:"rgba(255,77,109,0.1)",   redGlow:"rgba(255,77,109,0.25)",
  gold:"#f2c94c", goldDim:"rgba(242,201,76,0.1)",
  purple:"#b388ff",purpleDim:"rgba(179,136,255,0.1)",
  orange:"#ff8c42",
  panel:"rgba(12,18,30,0.97)", panelSoft:"rgba(255,255,255,0.025)",
  line:"rgba(255,255,255,0.07)", lineMid:"rgba(255,255,255,0.13)",
  text:"#e8f0ff", muted:"#4a6a8a", soft:"#2a3f58",
};

const LEAGUE_META = {
  epl:    {label:"Premier League", color:"#4f9eff", bg:"rgba(79,158,255,0.07)"},
  laliga: {label:"La Liga",        color:"#ff6b35", bg:"rgba(255,107,53,0.07)"},
  seriea: {label:"Serie A",        color:"#00e09e", bg:"rgba(0,224,158,0.07)"},
  ligue1: {label:"Ligue 1",        color:"#b388ff", bg:"rgba(179,136,255,0.07)"},
};

// League → NewsAPI query terms (for news panel)
const LEAGUE_NEWS_QUERY = {
  epl:    "Premier League football",
  laliga: "La Liga football",
  seriea: "Serie A football",
  ligue1: "Ligue 1 football",
};

const ZONE = {
  cl:{color:"#4f9eff",label:"Champions League"},
  el:{color:"#ffc107",label:"Europa League"},
  ecl:{color:"#b388ff",label:"Conference Lg"},
  rel:{color:"#ff4d6d",label:"Relegation"},
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
    W: { bg:"rgba(0,224,158,0.15)",  c:"#00e09e", b:"rgba(0,224,158,0.3)"  },
    D: { bg:"rgba(120,130,150,0.1)", c:"#7a8a9a", b:"rgba(120,130,150,0.2)"},
    L: { bg:"rgba(255,77,109,0.15)", c:"#ff4d6d", b:"rgba(255,77,109,0.3)" },
  }[r] || { bg:"rgba(120,130,150,0.1)", c:"#7a8a9a", b:"rgba(120,130,150,0.2)" };
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
          <div style={{ width:hPct+"%", height:"100%", background:homeColor||C.blue, borderRadius:3,
            boxShadow:`0 0 6px ${(homeColor||C.blue)}66`, transition:"width 0.8s cubic-bezier(.4,0,.2,1)" }}/>
        </div>
        <span style={{ fontSize:13, fontWeight:900, color:homeColor||C.blue, fontFamily:"JetBrains Mono,monospace", minWidth:32 }}>{h.toFixed(2)}</span>
      </div>
      {/* Away row */}
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:9, fontWeight:800, color:awayColor||C.red, minWidth:48, textAlign:"right" }}>{aName}</span>
        <div style={{ flex:1, height:6, background:"rgba(255,255,255,0.05)", borderRadius:3, overflow:"hidden" }}>
          <div style={{ width:aPct+"%", height:"100%", background:awayColor||C.red, borderRadius:3,
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
        <div style={{ flex:hp, background:homeColor||C.blue, borderRadius:"3px 0 0 3px", transition:"flex 0.6s ease" }}/>
        <div style={{ flex:ap, background:awayColor||C.red, borderRadius:"0 3px 3px 0", transition:"flex 0.6s ease" }}/>
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
    if (t < 0.25) return `rgba(79,158,255,${(t/0.25*0.3+0.04).toFixed(2)})`;
    if (t < 0.6)  return `rgba(255,193,7,${((t-0.25)/0.35*0.5+0.15).toFixed(2)})`;
    return `rgba(255,77,109,${((t-0.6)/0.4*0.55+0.35).toFixed(2)})`;
  };
  const rows = [0,1,2,3,4];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <span style={{ fontSize:10, fontWeight:900, color:C.muted, letterSpacing:".1em" }}>CORRECT SCORE GRID</span>
        <div style={{ display:"flex", gap:8 }}>
          <span style={{ fontSize:9, color:C.blue }}>{(homeTeam||"H").split(" ").pop().slice(0,4)} scored</span>
          <span style={{ fontSize:9, color:C.red }}>{(awayTeam||"A").split(" ").pop().slice(0,4)} scored</span>
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
        <span style={{ fontSize:9, color:C.blue }}>Low</span>
        <div style={{ flex:1,height:3,borderRadius:2,background:"linear-gradient(to right,rgba(79,158,255,0.5),rgba(255,193,7,0.6),rgba(255,77,109,0.8))" }}/>
        <span style={{ fontSize:9, color:C.red }}>High</span>
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
  if(loading) return <div style={{height:80,borderRadius:10,background:"rgba(255,255,255,0.03)",animation:"pulse 1.5s ease infinite"}}/>;
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
        <div style={{flex:hw,background:homeColor||C.blue,transition:"flex 0.6s ease"}}/>
        <div style={{flex:d2,background:"rgba(120,130,150,0.3)"}}/>
        <div style={{flex:aw,background:awayColor||C.red,transition:"flex 0.6s ease"}}/>
      </div>
      {/* Recent results */}
      <div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:180,overflowY:"auto"}}>
        {res.slice(0,6).map((r,i)=>{
          const isHome=r.home_team===homeTeam,hg=r.home_goals,ag=r.away_goals;
          const win=(hg>ag&&isHome)||(ag>hg&&!isHome)?"W":hg===ag?"D":"L";
          const wc={W:"#00e09e",D:"#7a8a9a",L:"#ff4d6d"}[win];
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
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="#00e09e" strokeWidth="1.8" strokeLinecap="round"/></svg>
      No current injuries reported
    </div>);
  const typeColor = t => t&&t.toLowerCase().includes("suspend")?"#ffc107":C.red;
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
  const diff = (model,implied) => { const d=model-implied; if(Math.abs(d)<3) return null; return{val:d>0?"+"+d:String(d),color:d>0?"#00e09e":"#ff4d6d"}; };
  if(!odds||!odds.bookmakers||!odds.bookmakers.length)
    return <div style={{padding:"12px",textAlign:"center",color:C.muted,fontSize:12}}>Loading odds data...</div>;
  const bk=odds.bookmakers[0], mw=bk.bets["Match Winner"]||{};
  const homeOdd=mw["Home"], drawOdd=mw["Draw"], awayOdd=mw["Away"];
  const outcomes=[
    {label:(homeTeam||"").split(" ").pop().slice(0,8),odd:homeOdd,model:modelPct(pHome),color:C.blue},
    {label:"Draw",odd:drawOdd,model:modelPct(pDraw),color:C.muted},
    {label:(awayTeam||"").split(" ").pop().slice(0,8),odd:awayOdd,model:modelPct(pAway),color:C.red},
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
              {d&&<span style={{fontSize:10,fontWeight:800,color:d.color,background:d.color+"22",padding:"1px 6px",borderRadius:4}}>Edge {d.val}%</span>}
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
        <div style={{padding:"8px 12px",borderRadius:8,background:"rgba(255,193,7,0.08)",border:"1px solid rgba(255,193,7,0.2)",
          fontSize:12,color:C.gold,fontWeight:700,textAlign:"center",display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}>
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
  const color=value>=72?"#28d97a":value>=52?"#f2c94c":value>=36?"#ff6b35":"#7a8a9a";
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
  const lc = leagueColor || "#4f9eff";

  // Team colours
  const hCol = lc;
  const aCol = isAway ? "#ff4d6d" : "rgba(255,77,109,0.5)";

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
  const glowCol = isHome ? hCol : isAway ? "#ff4d6d" : "#f2c94c";

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
          fill="#ff4d6d" opacity="0"
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
          fill={`${isAway?"#ff4d6d":"rgba(255,77,109,0.35)"}55`} textAnchor="middle" fontFamily="Sora,sans-serif">
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



// ─── News Panel ───────────────────────────────────────────────────────────────
// Uses NewsAPI.org (free tier). To enable: add VITE_NEWS_API_KEY to .env
// Free tier: 100 req/day. Key: https://newsapi.org/register
// If no key, shows empty state with instructions.
const NewsPanel = ({ league }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const meta = LEAGUE_META[league] || {};
  const query = LEAGUE_NEWS_QUERY[league] || "football";

  useEffect(() => {
    setLoading(true); setError(null); setArticles([]);
    const cacheKey = `news_v2_${league}_${new Date().toDateString()}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) { setArticles(JSON.parse(cached)); setLoading(false); return; }
    } catch {}
    // Uses backend proxy at /api/news/{league} which reads NEWS_API_KEY from .env
    // No frontend API key needed — all calls go through FastAPI backend
    fetch(`http://localhost:8003/api/news/${league}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        const items = (data.articles || []).slice(0, 10);
        if (data.error) { setError("no_key"); setLoading(false); return; }
        setArticles(items);
        try { sessionStorage.setItem(cacheKey, JSON.stringify(items)); } catch {}
        setLoading(false);
      })
      .catch(() => { setError("fetch_failed"); setLoading(false); });
  }, [league]);

  const fmtAge = iso => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    return h < 1 ? "Just now" : h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`;
  };

  const ExternalIcon = () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M4 2H2a1 1 0 00-1 1v5a1 1 0 001 1h5a1 1 0 001-1V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M6 1h3v3M9 1L5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:0,
      background:C.panel, border:"1px solid "+C.line,
      borderRadius:16, overflow:"hidden", height:"100%" }}>

      {/* Panel header */}
      <div style={{ padding:"14px 16px", borderBottom:"1px solid "+C.line,
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:3, height:18, borderRadius:2, background:meta.color||C.blue }}/>
          <span style={{ fontSize:11, fontWeight:900, color:C.text, letterSpacing:".06em",
            fontFamily:"Sora,sans-serif" }}>LATEST NEWS</span>
        </div>
        <span style={{ fontSize:9, color:C.muted, fontFamily:"JetBrains Mono,monospace" }}>
          {meta.label}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", padding:"4px 0" }}>

        {loading && Array.from({length:5}).map((_,i) => (
          <div key={i} style={{ padding:"10px 16px", borderBottom:"1px solid "+C.line, display:"flex", gap:10 }}>
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
              <div style={{ height:10, borderRadius:3, background:"rgba(255,255,255,0.04)",
                width:"85%", animation:"pulse 1.5s ease infinite", animationDelay:i*120+"ms" }}/>
              <div style={{ height:8, borderRadius:3, background:"rgba(255,255,255,0.03)",
                width:"60%", animation:"pulse 1.5s ease infinite", animationDelay:i*120+60+"ms" }}/>
            </div>
          </div>
        ))}

        {error === "no_key" && (
          <div style={{ padding:"20px 16px", display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ padding:"12px", borderRadius:10, background:"rgba(79,158,255,0.07)",
              border:"1px solid rgba(79,158,255,0.18)" }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.blue, marginBottom:6 }}>
                Enable live news
              </div>
              <div style={{ fontSize:10, color:C.muted, lineHeight:1.6 }}>
                Add <code style={{ background:"rgba(255,255,255,0.06)",padding:"1px 5px",borderRadius:3,fontFamily:"JetBrains Mono,monospace" }}>VITE_NEWS_API_KEY</code> to your .env file.
              </div>
              <div style={{ fontSize:10, color:C.soft, marginTop:6, lineHeight:1.6 }}>
                Free API key at newsapi.org (100 req/day). Then add a /api/news/:league backend route that proxies NewsAPI.
              </div>
            </div>
          </div>
        )}

        {error === "fetch_failed" && (
          <div style={{ padding:"16px", textAlign:"center", color:C.muted, fontSize:12 }}>
            Unable to load news
          </div>
        )}

        {!loading && !error && articles.length === 0 && (
          <div style={{ padding:"16px", textAlign:"center", color:C.muted, fontSize:12 }}>
            No news items found
          </div>
        )}

        {articles.map((a, i) => (
          <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
            style={{ display:"flex", flexDirection:"column", gap:4, padding:"10px 16px",
              borderBottom:i < articles.length-1 ? "1px solid "+C.line : "none",
              textDecoration:"none", transition:"background 0.12s", cursor:"pointer" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = ""; }}>
            <div style={{ fontSize:11.5, fontWeight:700, color:C.text, lineHeight:1.45,
              display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden",
              fontFamily:"Inter,sans-serif" }}>
              {a.title?.replace(/\s*-\s*[^-]+$/, "")}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:9, color:C.muted, fontWeight:700 }}>
                {a.source?.name}
              </span>
              <span style={{ width:2, height:2, borderRadius:"50%", background:C.soft }}/>
              <span style={{ fontSize:9, color:C.soft, fontFamily:"JetBrains Mono,monospace" }}>
                {fmtAge(a.publishedAt)}
              </span>
              <span style={{ marginLeft:"auto", color:C.soft }}><ExternalIcon/></span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};


// ─── League Stats Panel (left column summary) ────────────────────────────────
// Sits above the match cards — shows aggregate stats for the prediction set
const LeagueStatsPanel = ({ matches, loading, meta, league }) => {
  if (loading || !matches.length) return null;

  // Compute aggregate stats from current predictions
  const avgXgHome  = matches.reduce((s,m)=>s+(m.xg_home||0),0)/matches.length;
  const avgXgAway  = matches.reduce((s,m)=>s+(m.xg_away||0),0)/matches.length;
  const avgConf    = matches.reduce((s,m)=>s+(m.confidence||0),0)/matches.length;
  const highBTTS   = matches.filter(m=>(m.btts||0)>=0.55).length;
  const highGoals  = matches.filter(m=>(m.over_2_5||0)>=0.65).length;
  const homeWins   = matches.filter(m=>m.p_home_win>m.p_away_win&&m.p_home_win>m.p_draw).length;
  const awayWins   = matches.filter(m=>m.p_away_win>m.p_home_win&&m.p_away_win>m.p_draw).length;
  const draws      = matches.filter(m=>m.p_draw>=m.p_home_win&&m.p_draw>=m.p_away_win).length;

  // Best bet (highest confidence)
  const best = [...matches].sort((a,b)=>(b.confidence||0)-(a.confidence||0))[0];
  const bestFav = best
    ? (best.p_home_win>best.p_away_win?best.home_team:best.away_team)
    : null;

  const lc = meta.color || C.blue;

  // Mini donut chart for outcome distribution
  const total = matches.length || 1;
  const hw = homeWins/total, dw = draws/total, aw = awayWins/total;
  const R = 24, stroke = 8, circ = 2*Math.PI*R;
  // Stack: home (blue), draw (grey), away (red)
  const homeArc  = hw * circ;
  const drawArc  = dw * circ;
  const awayArc  = aw * circ;
  const homeOffset  = 0;
  const drawOffset  = -(homeArc);
  const awayOffset  = -(homeArc + drawArc);

  return (
    <div style={{
      marginBottom:14,
      background:C.panel,
      border:`1px solid ${lc}28`,
      borderRadius:14,
      overflow:"hidden",
      padding:"14px 16px",
    }}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <span style={{fontSize:10,fontWeight:900,color:C.muted,letterSpacing:".1em",fontFamily:"Inter,sans-serif"}}>
          GAMEWEEK OVERVIEW
        </span>
        <span style={{fontSize:9,color:C.soft,fontFamily:"JetBrains Mono,monospace"}}>
          {matches.length} fixture{matches.length!==1?"s":""}
        </span>
      </div>

      {/* Two columns: donut + stats grid */}
      <div style={{display:"flex",gap:16,alignItems:"center"}}>

        {/* Outcome donut */}
        <div style={{flexShrink:0,position:"relative",width:68,height:68,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="68" height="68" viewBox="0 0 68 68" style={{position:"absolute",top:0,left:0}}>
            {/* Background ring */}
            <circle cx="34" cy="34" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke}/>
            {/* Home wins arc */}
            <circle cx="34" cy="34" r={R} fill="none" stroke={lc} strokeWidth={stroke}
              strokeDasharray={`${homeArc} ${circ}`}
              strokeDashoffset={circ * 0.25}
              strokeLinecap="butt" style={{transition:"stroke-dasharray 0.8s ease"}}/>
            {/* Draw arc */}
            <circle cx="34" cy="34" r={R} fill="none" stroke="rgba(120,140,160,0.5)" strokeWidth={stroke}
              strokeDasharray={`${drawArc} ${circ}`}
              strokeDashoffset={circ * 0.25 + drawOffset}
              strokeLinecap="butt"/>
            {/* Away arc */}
            <circle cx="34" cy="34" r={R} fill="none" stroke={C.red} strokeWidth={stroke}
              strokeDasharray={`${awayArc} ${circ}`}
              strokeDashoffset={circ * 0.25 + awayOffset}
              strokeLinecap="butt"/>
          </svg>
          {/* Centre label */}
          <div style={{textAlign:"center",zIndex:1}}>
            <div style={{fontSize:15,fontWeight:900,color:"#fff",fontFamily:"JetBrains Mono,monospace",lineHeight:1}}>{matches.length}</div>
            <div style={{fontSize:7,color:C.muted,fontFamily:"Inter,sans-serif",marginTop:1}}>games</div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {[
            {label:"Home Wins",    val:homeWins,   color:lc},
            {label:"Away Wins",    val:awayWins,   color:C.red},
            {label:"Draws",        val:draws,       color:C.muted},
            {label:"Goals 2.5+",   val:highGoals,  color:C.gold},
            {label:"BTTS likely",  val:highBTTS,   color:C.green},
            {label:"Avg conf.",    val:Math.round(avgConf)+"%", color:"#ffc107", raw:true},
          ].map(({label,val,color,raw})=>(
            <div key={label} style={{
              display:"flex",alignItems:"center",gap:6,
              padding:"5px 8px",borderRadius:7,
              background:"rgba(255,255,255,0.025)",
            }}>
              <div style={{width:3,height:16,borderRadius:2,background:color,flexShrink:0}}/>
              <div>
                <div style={{fontSize:14,fontWeight:900,color,fontFamily:"JetBrains Mono,monospace",lineHeight:1}}>
                  {raw ? val : val}
                </div>
                <div style={{fontSize:8,color:C.muted,fontFamily:"Inter,sans-serif",letterSpacing:".05em"}}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* xG comparison strip */}
      {avgXgHome > 0 && (
        <div style={{marginTop:12,padding:"8px 10px",borderRadius:8,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)"}}>
          <div style={{fontSize:8,fontWeight:900,color:C.muted,letterSpacing:".1em",marginBottom:6,fontFamily:"Inter,sans-serif"}}>AVG xG THIS ROUND</div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {[
              {label:"Home",val:avgXgHome,color:lc},
              {label:"Away",val:avgXgAway,color:C.red},
            ].map(({label,val,color})=>{
              const pct = (val/Math.max(avgXgHome,avgXgAway,1))*100;
              return(
                <div key={label} style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:9,fontWeight:700,color,minWidth:28,fontFamily:"Inter,sans-serif"}}>{label}</span>
                  <div style={{flex:1,height:4,background:"rgba(255,255,255,0.05)",borderRadius:2,overflow:"hidden"}}>
                    <div style={{width:pct+"%",height:"100%",background:color,borderRadius:2,boxShadow:`0 0 5px ${color}66`,transition:"width 0.8s ease"}}/>
                  </div>
                  <span style={{fontSize:11,fontWeight:900,color,fontFamily:"JetBrains Mono,monospace",minWidth:28,textAlign:"right"}}>{val.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Best bet highlight */}
      {best && bestFav && (
        <div style={{marginTop:10,padding:"8px 10px",borderRadius:8,
          background:lc+"0e",border:`1px solid ${lc}28`,
          display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:3,height:24,borderRadius:2,background:lc,flexShrink:0,boxShadow:`0 0 6px ${lc}88`}}/>
          <div>
            <div style={{fontSize:8,fontWeight:900,color:C.muted,letterSpacing:".1em",fontFamily:"Inter,sans-serif"}}>HIGHEST CONFIDENCE</div>
            <div style={{fontSize:13,fontWeight:800,color:lc,fontFamily:"Sora,sans-serif"}}>{bestFav} to win</div>
            <div style={{fontSize:9,color:C.soft,fontFamily:"JetBrains Mono,monospace"}}>
              {best.home_team} vs {best.away_team} · {Math.round(best.confidence)}% conf.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Full match card (stats-first hierarchy) ──────────────────────────────────
const MatchCard = ({ match, idx, league, injuries }) => {
  const [open, setOpen]       = useState(false);
  const [activeTab, setActiveTab] = useState("stats");
  const hp = match.p_home_win||0, dp = match.p_draw||0, ap = match.p_away_win||0;
  const fav = hp>ap&&hp>dp?"home":ap>hp&&ap>dp?"away":"draw";
  const meta = LEAGUE_META[league] || {};
  const hColor = fav==="home" ? (meta.color||C.blue) : C.soft;
  const aColor = fav==="away" ? (meta.color||C.red)  : C.soft;
  const { day, date, time } = fmtDate(match.date);

  const hForm = Array.isArray(match.home_form)
    ? match.home_form
    : String(match.home_form||"").split("").filter(c=>"WDL".includes(c));
  const aForm = Array.isArray(match.away_form)
    ? match.away_form
    : String(match.away_form||"").split("").filter(c=>"WDL".includes(c));

  // Chip helpers
  const bttsPct    = Math.round((match.btts||0)*100);
  const bttsLabel  = bttsPct>=55?"Likely":bttsPct>=38?"Possible":"Unlikely";
  const bttsColor  = bttsPct>=55?C.green:bttsPct>=38?C.gold:C.muted;
  const o25        = Math.round((match.over_2_5||0)*100);
  const goalLabel  = o25>=68?"High":o25>=48?"Medium":"Low";
  const goalColor  = o25>=68?C.green:o25>=48?C.gold:C.muted;
  const csH = Math.round((match.home_clean_sheet||0)*100);
  const csA = Math.round((match.away_clean_sheet||0)*100);
  const csEdge = csH>csA+8?(match.home_team||"Home").split(" ").pop():csA>csH+8?(match.away_team||"Away").split(" ").pop():"Neither";
  const csColor = csEdge!=="Neither"?C.green:C.muted;
  const confMeta = match.confidence>=72?{l:"Strong",c:C.green}:match.confidence>=52?{l:"Moderate",c:C.gold}:match.confidence>=36?{l:"Uncertain",c:C.orange}:{l:"Low",c:C.muted};
  const winnerName = fav==="home"?(match.home_team||"Home"):fav==="away"?(match.away_team||"Away"):"Draw";
  const winnerColor = fav==="home"?(meta.color||C.blue):fav==="away"?C.red:C.gold;

  const Chip = ({ topLabel, val, color, active }) => (
    <div style={{ display:"flex",flexDirection:"column",gap:2,padding:"7px 10px",borderRadius:9,
      flex:1,minWidth:0,cursor:"default",
      background:active?color+"12":"rgba(255,255,255,0.025)",
      border:"1px solid "+(active?color+"35":"rgba(255,255,255,0.07)") }}>
      <span style={{ fontSize:7.5,fontWeight:900,letterSpacing:".1em",color:"#2a4a6a",whiteSpace:"nowrap",textTransform:"uppercase" }}>{topLabel}</span>
      <span style={{ fontSize:12,fontWeight:800,color,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontFamily:"Inter,sans-serif" }}>{val}</span>
    </div>
  );

  const tabs = ["stats","h2h","injuries","odds","grid"];
  const tabLabels = {stats:"Stats",h2h:"H2H",injuries:"Injuries",odds:"Odds",grid:"Score Grid"};

  return (
    <div style={{ background:C.panel, border:"1px solid "+(open?"rgba(79,158,255,0.22)":C.line),
      borderRadius:16, overflow:"hidden", transition:"border-color 0.2s, box-shadow 0.2s",
      boxShadow:open?"0 8px 36px rgba(0,0,0,0.45)":"none",
      animation:"fadeUp 350ms ease both", animationDelay:idx*40+"ms" }}
      onMouseEnter={e=>{ if(!open) e.currentTarget.style.borderColor=C.lineMid; }}
      onMouseLeave={e=>{ if(!open) e.currentTarget.style.borderColor=C.line; }}>

      {/* ── Card clickable header area ── */}
      <div style={{ padding:"16px 18px 14px", cursor:"pointer" }} onClick={() => setOpen(o=>!o)}>

        {/* DATE HEADER — large, premium, clear */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {/* Date badge */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-start" }}>
              <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
                <span style={{ fontSize:13, fontWeight:700, color:meta.color||C.blue, fontFamily:"Sora,sans-serif", letterSpacing:"-0.01em" }}>
                  {day}
                </span>
                <span style={{ fontSize:15, fontWeight:800, color:C.text, fontFamily:"Sora,sans-serif", letterSpacing:"-0.02em" }}>
                  {date}
                </span>
                {time && (
                  <span style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,0.55)",
                    fontFamily:"JetBrains Mono,monospace", marginLeft:4 }}>
                    {time}
                  </span>
                )}
              </div>
              {match.venue && (
                <span style={{ fontSize:9, color:C.muted, marginTop:1, display:"flex", alignItems:"center", gap:4 }}>
                  <svg width="8" height="8" viewBox="0 0 10 12" fill="none">
                    <path d="M5 1C3.067 1 1 2.5 1 5c0 3.5 4 7 4 7s4-3.5 4-7c0-2.5-2.067-4-4-4z" stroke="currentColor" strokeWidth="1.2"/>
                    <circle cx="5" cy="5" r="1.3" fill="currentColor"/>
                  </svg>
                  {match.venue}
                </span>
              )}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {match.referee && (
              <span style={{ fontSize:9, color:C.soft, display:"flex", alignItems:"center", gap:4 }}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2"/>
                  <rect x="3" y="2" width="4" height="6" rx="0.5" fill="currentColor" opacity="0.4"/>
                </svg>
                {match.referee}
              </span>
            )}
            <span style={{ fontSize:9, color:C.muted }}>
              {open ? "▲" : "▼"}
            </span>
          </div>
        </div>

        {/* ── HERO: Teams + Score + Prob bar ── */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>

          {/* Home team */}
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:10, justifyContent:"flex-end" }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:17, fontWeight:900, color:fav==="home"?"#fff":"#4a6a8a",
                transition:"color 0.2s", fontFamily:"Sora,sans-serif", letterSpacing:"-0.01em" }}>
                {match.home_team}
              </div>
              <div style={{ display:"flex", gap:3, justifyContent:"flex-end", marginTop:4 }}>
                {hForm.slice(-5).map((r,i) => <FormPip key={i} r={r}/>)}
              </div>
            </div>
            {match.home_logo && (
              <img src={match.home_logo} alt="" style={{ width:40, height:40, objectFit:"contain", flexShrink:0 }}
                onError={e=>{ e.currentTarget.style.display="none"; }}/>
            )}
          </div>

          {/* Centre — score + prob bar */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, minWidth:148, flexShrink:0 }}>
            <div style={{ fontSize:30, fontWeight:900, color:"#fff", fontFamily:"JetBrains Mono,monospace",
              letterSpacing:"0.06em", textShadow:"0 0 24px rgba(255,255,255,0.12)", lineHeight:1 }}>
              {match.most_likely_score||"?–?"}
            </div>
            {/* 3-way prob bar */}
            <div style={{ display:"flex", width:136, height:5, borderRadius:3, overflow:"hidden", gap:1 }}>
              <div style={{ flex:hp, background:meta.color||C.blue, borderRadius:"3px 0 0 3px", transition:"flex 0.6s" }}/>
              <div style={{ flex:dp, background:"rgba(100,120,140,0.35)" }}/>
              <div style={{ flex:ap, background:C.red, borderRadius:"0 3px 3px 0", transition:"flex 0.6s" }}/>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", width:136 }}>
              <span style={{ fontSize:11, fontWeight:800, color:meta.color||C.blue, fontFamily:"JetBrains Mono,monospace" }}>
                {Math.round(hp*100)}%
              </span>
              <span style={{ fontSize:10, color:C.soft, fontFamily:"JetBrains Mono,monospace" }}>
                {Math.round(dp*100)}%
              </span>
              <span style={{ fontSize:11, fontWeight:800, color:C.red, fontFamily:"JetBrains Mono,monospace" }}>
                {Math.round(ap*100)}%
              </span>
            </div>
            <ConfMeter value={match.confidence||0}/>
          </div>

          {/* Away team */}
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:10 }}>
            {match.away_logo && (
              <img src={match.away_logo} alt="" style={{ width:40, height:40, objectFit:"contain", flexShrink:0 }}
                onError={e=>{ e.currentTarget.style.display="none"; }}/>
            )}
            <div>
              <div style={{ fontSize:17, fontWeight:900, color:fav==="away"?"#fff":"#4a6a8a",
                transition:"color 0.2s", fontFamily:"Sora,sans-serif", letterSpacing:"-0.01em" }}>
                {match.away_team}
              </div>
              <div style={{ display:"flex", gap:3, marginTop:4 }}>
                {aForm.slice(-5).map((r,i) => <FormPip key={i} r={r}/>)}
              </div>
            </div>
          </div>
        </div>

        {/* ── PRIMARY STATS BLOCK (chips + xG bar) — main reading area ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>

          {/* Row 1: Winner + Strength */}
          <div style={{ display:"flex", gap:5 }}>
            <Chip topLabel="Likely Winner" val={winnerName} color={winnerColor} active/>
            <Chip topLabel="Prediction Strength" val={confMeta.l} color={confMeta.c} active/>
          </div>

          {/* Row 2: Goal Outlook + Both Teams Score + Clean Sheet */}
          <div style={{ display:"flex", gap:5 }}>
            <Chip topLabel="Goal Outlook" val={goalLabel} color={goalColor} active={o25>=48}/>
            <Chip topLabel="Both Teams Score" val={bttsLabel} color={bttsColor} active={bttsPct>=38}/>
            <Chip topLabel="Clean Sheet Edge" val={csEdge} color={csColor} active={csEdge!=="Neither"}/>
          </div>

          {/* xG dual progress bar — primary graphic */}
          {(match.xg_home||match.xg_away) && (
            <div style={{ padding:"10px 12px", borderRadius:10,
              background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }}>
              <XGDualBar
                xgHome={match.xg_home} xgAway={match.xg_away}
                homeTeam={match.home_team} awayTeam={match.away_team}
                homeColor={meta.color||C.blue} awayColor={C.red}/>
            </div>
          )}
        </div>

        {/* ── SECONDARY: Pitch animation — subtle, reduced height ── */}
        <MiniPitch
          outcome={fav}
          homeProb={hp} awayProb={ap}
          homeTeam={match.home_team} awayTeam={match.away_team}
          leagueColor={meta.color}/>

      </div>

      {/* ── Expanded section ── */}
      {open && (
        <div style={{ borderTop:"1px solid "+C.line, background:"rgba(0,0,0,0.18)" }}>
          {/* Tab bar — no emojis */}
          <div style={{ display:"flex", borderBottom:"1px solid "+C.line, overflowX:"auto" }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                style={{ padding:"10px 14px", fontSize:11, fontWeight:800, cursor:"pointer",
                  fontFamily:"Inter,sans-serif", background:"none", border:"none", whiteSpace:"nowrap",
                  color:activeTab===t?(meta.color||C.blue):C.muted,
                  borderBottom:"2px solid "+(activeTab===t?(meta.color||C.blue):"transparent"),
                  transition:"all 0.15s" }}>
                {tabLabels[t]}
              </button>
            ))}
          </div>

          <div style={{ padding:"16px 18px" }}>
            {activeTab==="stats" && (
              <>
                <TeamStatsWidget hStats={match.home_stats} aStats={match.away_stats}
                  homeTeam={match.home_team} awayTeam={match.away_team}
                  homeColor={meta.color} awayColor={C.red}/>
                {(match.home_stats||match.away_stats) && (
                  <div style={{ marginTop:16 }}>
                    <ScoringPatterns hStats={match.home_stats} aStats={match.away_stats}
                      homeTeam={match.home_team} awayTeam={match.away_team}
                      homeColor={meta.color} awayColor={C.red}/>
                  </div>
                )}
                <div style={{ marginTop:16 }}>
                  <APIPredWidget fixtureId={match.fixture_id}
                    homeTeam={match.home_team} awayTeam={match.away_team}
                    homeColor={meta.color} awayColor={C.red}/>
                </div>
              </>
            )}
            {activeTab==="h2h" && (
              <H2HWidget homeId={match.home_id} awayId={match.away_id}
                homeTeam={match.home_team} awayTeam={match.away_team}
                homeColor={meta.color} awayColor={C.red}/>
            )}
            {activeTab==="injuries" && (
              <InjuryWidget homeTeam={match.home_team} awayTeam={match.away_team}
                homeColor={meta.color} awayColor={C.red} allInjuries={injuries}/>
            )}
            {activeTab==="odds" && (
              <OddsWidget fixtureId={match.fixture_id}
                pHome={hp} pDraw={dp} pAway={ap}
                homeTeam={match.home_team} awayTeam={match.away_team}/>
            )}
            {activeTab==="grid" && (
              <Heatmap topScores={match.top_scores}
                homeTeam={match.home_team} awayTeam={match.away_team}/>
            )}
          </div>

          {/* Model badges */}
          <div style={{ display:"flex", gap:6, padding:"8px 18px 14px", flexWrap:"wrap" }}>
            {[["Dixon-Coles","#00e09e"],["Elo Rating","#ffc107"],["Real xG","#4f9eff"]].map(([l,c])=>(
              <span key={l} style={{ fontSize:9,fontWeight:800,letterSpacing:".05em",padding:"2px 8px",borderRadius:5,
                background:c+"15",border:"1px solid "+c+"30",color:c }}>{l}</span>
            ))}
            {match.elo_diff!=null && (
              <span style={{ fontSize:9,color:C.soft,fontFamily:"JetBrains Mono,monospace" }}>
                Elo gap: {match.elo_diff>0?"+":""}{Math.round(match.elo_diff)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


// ─── Top scorers / assists ────────────────────────────────────────────────────
const ScorersWidget = ({ league }) => {
  const [tab,setTab]=useState("goals");
  const [scorers,setScorers]=useState([]); const [assists,setAssists]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    setLoading(true);
    Promise.allSettled([getTopScorers(league),getTopAssists(league)]).then(([sr,ar])=>{
      if(sr.status==="fulfilled") setScorers(sr.value.scorers||[]);
      if(ar.status==="fulfilled") setAssists(ar.value.assists||[]);
      setLoading(false);
    });
  },[league]);
  const meta=LEAGUE_META[league]||{};
  const data=tab==="goals"?scorers:assists;
  const statKey=tab==="goals"?"goals":"assists";
  const PersonIcon=()=>(<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.3" opacity="0.5"/><path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.5"/></svg>);
  return(
    <div style={{background:C.panel,border:"1px solid "+C.line,borderRadius:16,overflow:"hidden"}}>
      <div style={{display:"flex",borderBottom:"1px solid "+C.line}}>
        {[["goals","Top Scorers"],["assists","Top Assists"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{flex:1,padding:"12px",fontSize:11,fontWeight:800,cursor:"pointer",
              background:"none",border:"none",fontFamily:"Inter,sans-serif",
              color:tab===k?(meta.color||C.blue):C.muted,
              borderBottom:"2px solid "+(tab===k?(meta.color||C.blue):"transparent"),
              transition:"all 0.15s"}}>
            {l}
          </button>))}
      </div>
      <div style={{padding:"8px 0",maxHeight:340,overflowY:"auto"}}>
        {loading?Array.from({length:8}).map((_,i)=>(
          <div key={i} style={{display:"flex",gap:10,padding:"8px 14px",alignItems:"center"}}>
            <div style={{width:16,height:16,borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>
            <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>
            <div style={{flex:1,height:12,borderRadius:4,background:"rgba(255,255,255,0.04)"}}/>
            <div style={{width:24,height:16,borderRadius:4,background:"rgba(255,255,255,0.04)"}}/>
          </div>
        )):data.slice(0,10).map((p,i)=>(
          <div key={p.player_id||i}
            style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",transition:"background 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.025)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="";}}>
            <span style={{fontSize:11,fontWeight:900,color:i<3?meta.color||C.blue:C.muted,
              width:16,textAlign:"center",fontFamily:"JetBrains Mono,monospace"}}>{i+1}</span>
            {p.photo
              ?<img src={p.photo} style={{width:32,height:32,borderRadius:"50%",objectFit:"cover",flexShrink:0}}
                onError={e=>{e.currentTarget.replaceWith(Object.assign(document.createElement("div"),{innerHTML:'<svg/>'}));}}/>
              :<div style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.3)"}}><PersonIcon/></div>}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:800,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {p.team_logo&&<img src={p.team_logo} style={{width:12,height:12,objectFit:"contain"}} onError={e=>{e.currentTarget.style.display="none";}}/>}
                <span style={{fontSize:10,color:C.muted}}>{p.team_name}</span>
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:20,fontWeight:900,color:meta.color||C.blue,fontFamily:"JetBrains Mono,monospace"}}>{p[statKey]||0}</div>
              <div style={{fontSize:9,color:C.soft}}>{p.played||0} apps</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Standings table ──────────────────────────────────────────────────────────
const getZone=(pos,total)=>{
  if(pos<=4) return "cl"; if(pos===5) return "el"; if(pos===6) return "ecl";
  if(pos>=total-2) return "rel"; return null;
};

const StandingsTable=({rows,loading,league})=>{
  const [sort,setSort]=useState("rank"); const [dir,setDir]=useState(1);
  const total=rows.length||(LEAGUE_META[league]&&20);
  const meta=LEAGUE_META[league]||{};
  const sorted=useMemo(()=>{
    if(loading) return [];
    return [...rows].sort((a,b)=>{
      let va=a[sort],vb=b[sort];
      if(va==null)va=sort==="rank"?999:0; if(vb==null)vb=sort==="rank"?999:0;
      if(typeof va==="string"){va=va.toLowerCase();vb=vb.toLowerCase();}
      return va<vb?-dir:va>vb?dir:0;
    });
  },[rows,sort,dir,loading]);
  const toggle=col=>{ if(sort===col) setDir(d=>-d); else{setSort(col);setDir(col==="rank"?1:-1);} };
  const Th=({col,children,align,width})=>(
    <th onClick={()=>toggle(col)} style={{padding:"10px",fontSize:9,fontWeight:900,letterSpacing:".1em",
      color:sort===col?(meta.color||C.blue):C.muted,borderBottom:"1px solid "+C.line,
      background:"rgba(0,0,0,0.5)",textAlign:align||"center",width,cursor:"pointer",
      userSelect:"none",whiteSpace:"nowrap"}}>
      {children}{sort===col?(dir===1?" ↑":" ↓"):""}
    </th>);
  return(
    <div style={{overflowX:"auto",borderRadius:12}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,fontFamily:"Sora,sans-serif"}}>
        <thead><tr>
          <Th col="rank" width={36}>#</Th>
          <Th col="team_name" align="left">Club</Th>
          <Th col="played" width={34}>P</Th>
          <Th col="won"    width={34}>W</Th>
          <Th col="drawn"  width={34}>D</Th>
          <Th col="lost"   width={34}>L</Th>
          <Th col="goals_for"     width={38}>GF</Th>
          <Th col="goals_against" width={38}>GA</Th>
          <Th col="goal_diff"     width={38}>GD</Th>
          <Th col="points"        width={42}>Pts</Th>
          <th style={{padding:"10px",fontSize:9,fontWeight:900,color:C.muted,borderBottom:"1px solid "+C.line,background:"rgba(0,0,0,0.5)",width:108,textAlign:"center",letterSpacing:".1em"}}>FORM</th>
        </tr></thead>
        <tbody>
          {loading?Array.from({length:14}).map((_,i)=>(
            <tr key={i}>{Array.from({length:11}).map((_,j)=>(
              <td key={j} style={{padding:"10px",borderBottom:"1px solid "+C.line}}>
                <div style={{height:12,borderRadius:4,background:"rgba(255,255,255,0.04)",width:j===1?120:28,animation:"pulse 1.5s ease infinite"}}/>
              </td>))}</tr>
          )):sorted.map((row,i)=>{
            const pos=row.rank??i+1, zone=getZone(pos,total);
            const zc=zone?ZONE[zone].color:"transparent", gd=row.goal_diff??0;
            const form=String(row.form||"");
            return(
              <tr key={row.team_id??i}
                style={{borderLeft:"3px solid "+zc,transition:"background 0.12s"}}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(79,158,255,0.04)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="";}}>
                <td style={{padding:"10px",textAlign:"center",color:C.muted,fontWeight:800,borderBottom:"1px solid "+C.line}}>{pos}</td>
                <td style={{padding:"10px",borderBottom:"1px solid "+C.line}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    {row.logo&&<img src={row.logo} alt="" style={{width:20,height:20,objectFit:"contain"}} onError={e=>{e.currentTarget.style.display="none";}}/>}
                    <span style={{fontWeight:800,color:C.text,whiteSpace:"nowrap"}}>{row.team_name}</span>
                  </div>
                </td>
                <td style={{padding:"10px",textAlign:"center",borderBottom:"1px solid "+C.line}}>{row.played}</td>
                <td style={{padding:"10px",textAlign:"center",color:"#00e09e",fontWeight:800,borderBottom:"1px solid "+C.line}}>{row.won}</td>
                <td style={{padding:"10px",textAlign:"center",color:C.soft,borderBottom:"1px solid "+C.line}}>{row.drawn}</td>
                <td style={{padding:"10px",textAlign:"center",color:C.red,fontWeight:800,borderBottom:"1px solid "+C.line}}>{row.lost}</td>
                <td style={{padding:"10px",textAlign:"center",borderBottom:"1px solid "+C.line}}>{row.goals_for}</td>
                <td style={{padding:"10px",textAlign:"center",borderBottom:"1px solid "+C.line}}>{row.goals_against}</td>
                <td style={{padding:"10px",textAlign:"center",borderBottom:"1px solid "+C.line,color:gd>0?"#00e09e":gd<0?C.red:undefined}}>{gd>0?"+":""}{gd}</td>
                <td style={{padding:"10px",textAlign:"center",borderBottom:"1px solid "+C.line}}><strong style={{color:"#fff",fontSize:15}}>{row.points}</strong></td>
                <td style={{padding:"10px",borderBottom:"1px solid "+C.line}}>
                  <div style={{display:"flex",gap:2,justifyContent:"center"}}>
                    {form.split("").slice(-5).map((r,j)=><FormPip key={j} r={r}/>)}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!loading&&(
        <div style={{display:"flex",gap:16,flexWrap:"wrap",padding:"12px 12px 8px",borderTop:"1px solid "+C.line}}>
          {Object.entries(ZONE).map(([k,{color,label}])=>(
            <span key={k} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.muted,fontWeight:700}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:color,flexShrink:0}}/>
              {label}
            </span>
          ))}
        </div>
      )}
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
  const meta = LEAGUE_META[league] || { label:league.toUpperCase(), color:C.blue };

  const [tab,setTab]             = useState("predictions");
  const [standings,setStandings] = useState([]);
  const [matches,setMatches]     = useState([]);
  const [injuries,setInjuries]   = useState([]);
  const [standLoad,setStandLoad] = useState(true);
  const [predLoad,setPredLoad]   = useState(true);
  const [standErr,setStandErr]   = useState(null);
  const [predErr,setPredErr]     = useState(null);
  const [sort,setSort]           = useState("confidence");

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
          <div style={{ width:4,height:52,borderRadius:4,background:meta.color,
            boxShadow:"0 0 12px "+meta.color+"66",flexShrink:0 }}/>
          <div>
            <h1 style={{ fontSize:28,fontWeight:900,color:"#f0f6ff",margin:"0 0 3px",
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
                  border:"1.5px solid "+(active?lm.color:"rgba(255,255,255,0.07)"),
                  color:active?lm.color:"#2a4a6a",
                  background:active?lm.color+"14":"transparent",
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
              color:tab===key?(meta.color||C.blue):"#2a4a6a",
              borderBottom:"2px solid "+(tab===key?(meta.color||C.blue):"transparent"),
              transition:"all 0.15s" }}>
            {label}
            {badge!=null&&(
              <span style={{ background:tab===key?(meta.color+"25"):"rgba(255,255,255,0.05)",
                color:tab===key?(meta.color||C.blue):"#2a4a6a",
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
            {/* League stats panel at top of left column */}
            <LeagueStatsPanel matches={matches} loading={predLoad} meta={meta} league={league}/>
            {/* Summary bar */}
            {!predLoad&&!predErr&&matches.length>0&&(
              <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",
                background:"rgba(255,255,255,0.025)",border:"1px solid "+C.line,
                borderRadius:12,padding:"12px 18px",marginBottom:14 }}>
                {[
                  {val:matches.length,     label:"Fixtures",  color:meta.color},
                  {val:homeWins,           label:"Home fav",  color:"#4f9eff"},
                  {val:draws,              label:"Draw fav",  color:"#7a8a9a"},
                  {val:matches.length-homeWins-draws,label:"Away fav",color:C.red},
                  {val:avgConf,            label:"Avg conf",  color:"#ffc107"},
                  {val:injuries.length,    label:"Injuries",  color:"#ff6b35"},
                ].map(({val,label,color},i)=>([
                  i>0&&<div key={"sep"+i} style={{width:1,height:32,background:C.line}}/>,
                  <div key={label} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                    <span style={{fontSize:22,fontWeight:900,fontFamily:"JetBrains Mono,monospace",color}}>{val}</span>
                    <span style={{fontSize:9,fontWeight:800,color:"#1a3a5a",letterSpacing:".1em"}}>{label}</span>
                  </div>
                ]))}
                <div style={{marginLeft:"auto",display:"flex",gap:4,alignItems:"center"}}>
                  <span style={{fontSize:10,color:C.muted,fontWeight:800}}>Sort:</span>
                  {["confidence","date","home"].map(s=>(
                    <button key={s} onClick={()=>setSort(s)}
                      style={{padding:"4px 10px",borderRadius:999,fontSize:10,fontWeight:800,cursor:"pointer",
                        fontFamily:"Inter,sans-serif",
                        border:"1px solid "+(sort===s?(meta.color||C.blue)+"44":"rgba(255,255,255,0.07)"),
                        background:sort===s?(meta.color||C.blue)+"15":"rgba(255,255,255,0.03)",
                        color:sort===s?(meta.color||C.blue):"#2a4a6a",transition:"all 0.13s"}}>
                      {s==="confidence"?"Confidence":s==="date"?"Date":"Home %"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {predErr&&<div style={{padding:20,background:"rgba(255,77,109,0.07)",border:"1px solid rgba(255,77,109,0.2)",borderRadius:12,color:C.red,fontSize:13}}>Error: {predErr}</div>}

            {predLoad&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
              {Array.from({length:4}).map((_,i)=>(
                <div key={i} style={{height:120,borderRadius:16,background:"rgba(255,255,255,0.025)",
                  animation:"shimmer 1.5s ease-in-out infinite",animationDelay:i*80+"ms"}}/>
              ))}
            </div>}

            {!predLoad&&!predErr&&matches.length===0&&(
              <div style={{padding:40,textAlign:"center",color:C.muted,fontSize:14}}>No upcoming fixtures found.</div>
            )}

            {!predLoad&&!predErr&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {sorted.map((m,i)=>(
                  <MatchCard key={(m.home_team||"")+(m.away_team||"")+i}
                    match={m} idx={i} league={league} injuries={injuries}/>
                ))}
              </div>
            )}
          </div>

          {/* Right: news panel */}
          <div style={{ position:"sticky", top:72, maxHeight:"calc(100vh - 100px)", display:"flex", flexDirection:"column" }}>
            <NewsPanel league={league}/>
          </div>
        </div>
      )}

      {/* ── Standings ── */}
      {tab==="standings"&&(
        <div style={{background:C.panel,border:"1px solid "+C.line,borderRadius:16,overflow:"hidden"}}>
          {standErr
            ?<div style={{padding:20,color:C.red}}>Error: {standErr}</div>
            :<StandingsTable rows={standings} loading={standLoad} league={league}/>}
        </div>
      )}

      {/* ── Scorers ── */}
      {tab==="scorers"&&<ScorersWidget league={league}/>}

      <style>{`
        @keyframes fadeUp   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer  { 0%{background-position:-800px 0} 100%{background-position:800px 0} }
        @keyframes pulse    { 0%,100%{opacity:.4} 50%{opacity:.8} }
        ::-webkit-scrollbar       { width:4px; height:4px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px }
        @media(max-width:900px){
          .pred-grid { grid-template-columns:1fr !important; }
        }
      `}</style>
    </div>
  );
}