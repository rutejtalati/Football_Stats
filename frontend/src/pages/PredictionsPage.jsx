// PredictionsPage.jsx — StatinSite v6
// VS Split Cards · League Themes · Floating Simulator · Key Players · Charts
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, NavLink, useNavigate } from "react-router-dom";
import {
  getStandings, getLeaguePredictions, getTopScorers, getTopAssists,
  getLeagueInjuries, getH2H, getFixtureOdds, getSeasonSimulation,
} from "../api/api";

/* ══════════════════════════════════════════════════════════
   TASK 1 — LEAGUE THEMES
══════════════════════════════════════════════════════════ */
const THEMES = {
  // EPL — England flag: red (#C8102E) + navy (#012169) + white
  epl: {
    bg:"#060a12",
    grad:"radial-gradient(ellipse at 20% 20%,rgba(200,16,46,0.14) 0%,transparent 55%),radial-gradient(ellipse at 80% 80%,rgba(1,33,105,0.18) 0%,transparent 55%)",
    accent:"#C8102E", accent2:"#4a7fff", mid:"#012169",
    panel:"rgba(6,10,18,0.96)", border:"rgba(200,16,46,0.28)", borderHi:"rgba(200,16,46,0.6)",
    text:"#f0f4ff", muted:"#6070a0", faint:"rgba(200,16,46,0.10)",
    homeCol:"#C8102E", awayCol:"#4a7fff", label:"Premier League",
  },
  // La Liga — Spain flag: red (#AA151B) + gold (#F1BF00)
  laliga: {
    bg:"#0e0700",
    grad:"radial-gradient(ellipse at 20% 20%,rgba(241,191,0,0.16) 0%,transparent 55%),radial-gradient(ellipse at 80% 80%,rgba(170,21,27,0.14) 0%,transparent 55%)",
    accent:"#F1BF00", accent2:"#AA151B", mid:"#e07800",
    panel:"rgba(16,9,0,0.96)", border:"rgba(241,191,0,0.25)", borderHi:"rgba(241,191,0,0.55)",
    text:"#fff8e0", muted:"#8a7040", faint:"rgba(241,191,0,0.10)",
    homeCol:"#F1BF00", awayCol:"#AA151B", label:"La Liga",
  },
  // Serie A — Italy flag: green (#009246) + red (#CE2B37) + white
  seriea: {
    bg:"#030d06",
    grad:"radial-gradient(ellipse at 20% 20%,rgba(0,146,70,0.16) 0%,transparent 55%),radial-gradient(ellipse at 80% 80%,rgba(206,43,55,0.14) 0%,transparent 55%)",
    accent:"#00b856", accent2:"#CE2B37", mid:"#007a38",
    panel:"rgba(3,12,6,0.96)", border:"rgba(0,146,70,0.28)", borderHi:"rgba(0,184,86,0.55)",
    text:"#e8fff2", muted:"#3a7055", faint:"rgba(0,146,70,0.10)",
    homeCol:"#00b856", awayCol:"#CE2B37", label:"Serie A",
  },
  // Bundesliga — Germany flag: black (#000) + red (#DD0000) + gold (#FFCE00)
  bundesliga: {
    bg:"#080600",
    grad:"radial-gradient(ellipse at 20% 20%,rgba(255,206,0,0.16) 0%,transparent 55%),radial-gradient(ellipse at 80% 80%,rgba(221,0,0,0.14) 0%,transparent 55%)",
    accent:"#FFCE00", accent2:"#DD0000", mid:"#e08800",
    panel:"rgba(12,10,0,0.96)", border:"rgba(255,206,0,0.22)", borderHi:"rgba(255,206,0,0.52)",
    text:"#fffbe0", muted:"#8a7a30", faint:"rgba(255,206,0,0.08)",
    homeCol:"#FFCE00", awayCol:"#DD0000", label:"Bundesliga",
  },
  ligue1: {
    bg:"#020510",
    grad:"radial-gradient(ellipse at 20% 20%,rgba(0,35,149,0.18) 0%,transparent 55%),radial-gradient(ellipse at 80% 80%,rgba(237,41,57,0.14) 0%,transparent 55%)",
    accent:"#4d7fff", accent2:"#ED2939", mid:"#002395",
    panel:"rgba(2,5,16,0.96)", border:"rgba(0,35,149,0.30)", borderHi:"rgba(77,127,255,0.55)",
    text:"#eef2ff", muted:"#4050a0", faint:"rgba(0,35,149,0.12)",
    homeCol:"#4d7fff", awayCol:"#ED2939", label:"Ligue 1",
  },
};

const LEAGUE_TABS = [
  {code:"epl",slug:"premier-league",label:"Premier League"},
  {code:"laliga",slug:"la-liga",label:"La Liga"},
  {code:"bundesliga",slug:"bundesliga",label:"Bundesliga"},
  {code:"seriea",slug:"serie-a",label:"Serie A"},
  {code:"ligue1",slug:"ligue-1",label:"Ligue 1"},
];

/* ══════════════════════════════════════════════════════════
   TASK 3 — KEY PLAYERS DATA
══════════════════════════════════════════════════════════ */
const KP = {
  "Arsenal":         [{name:"Saka",pos:"RW",stat:"0.52 xA/90"},{name:"Havertz",pos:"ST",stat:"0.41 xG/90"},{name:"Raya",pos:"GK",stat:"+0.18 PSxG"}],
  "Chelsea":         [{name:"Palmer",pos:"AM",stat:"0.31 xA/90"},{name:"Jackson",pos:"ST",stat:"0.38 xG/90"},{name:"Caicedo",pos:"CM",stat:"6.2 PPDA"}],
  "Man City":        [{name:"Haaland",pos:"ST",stat:"0.82 xG/90"},{name:"De Bruyne",pos:"CM",stat:"0.44 xA/90"},{name:"Ederson",pos:"GK",stat:"+0.12 PSxG"}],
  "Liverpool":       [{name:"Salah",pos:"RW",stat:"0.74 xG/90"},{name:"Szoboszlai",pos:"CM",stat:"0.28 xA/90"},{name:"Van Dijk",pos:"CB",stat:"91% aerial"}],
  "Man United":      [{name:"Rashford",pos:"LW",stat:"0.35 xG/90"},{name:"Fernandes",pos:"AM",stat:"0.32 xA/90"},{name:"Onana",pos:"GK",stat:"+0.08 PSxG"}],
  "Tottenham":       [{name:"Son",pos:"LW",stat:"0.45 xG/90"},{name:"Maddison",pos:"AM",stat:"0.29 xA/90"},{name:"Vicario",pos:"GK",stat:"+0.14 PSxG"}],
  "Newcastle":       [{name:"Isak",pos:"ST",stat:"0.58 xG/90"},{name:"Gordon",pos:"LW",stat:"0.31 xA/90"},{name:"Pope",pos:"GK",stat:"+0.22 PSxG"}],
  "West Ham":        [{name:"Kudus",pos:"AM",stat:"0.42 xG/90"},{name:"Bowen",pos:"RW",stat:"0.38 xG/90"},{name:"Areola",pos:"GK",stat:"0.00 PSxG"}],
  "Aston Villa":     [{name:"Watkins",pos:"ST",stat:"0.52 xG/90"},{name:"McGinn",pos:"CM",stat:"0.18 xA/90"},{name:"Martinez",pos:"GK",stat:"+0.19 PSxG"}],
  "Barcelona":       [{name:"Yamal",pos:"RW",stat:"0.34 xA/90"},{name:"Lewandowski",pos:"ST",stat:"0.61 xG/90"},{name:"Ter Stegen",pos:"GK",stat:"+0.17 PSxG"}],
  "Real Madrid":     [{name:"Vinicius",pos:"LW",stat:"0.55 xG/90"},{name:"Bellingham",pos:"CM",stat:"0.40 xG/90"},{name:"Courtois",pos:"GK",stat:"+0.20 PSxG"}],
  "Atletico Madrid": [{name:"Griezmann",pos:"AM",stat:"0.38 xG/90"},{name:"Morata",pos:"ST",stat:"0.35 xG/90"},{name:"Oblak",pos:"GK",stat:"+0.25 PSxG"}],
  "PSG":             [{name:"Mbappé",pos:"CF",stat:"0.78 xG/90"},{name:"Dembélé",pos:"RW",stat:"0.42 xA/90"},{name:"Donnarumma",pos:"GK",stat:"+0.18 PSxG"}],
  "Monaco":          [{name:"Embolo",pos:"ST",stat:"0.44 xG/90"},{name:"Golovin",pos:"AM",stat:"0.22 xA/90"},{name:"Majecki",pos:"GK",stat:"+0.10 PSxG"}],
  "Inter Milan":     [{name:"Lautaro",pos:"ST",stat:"0.62 xG/90"},{name:"Calhanoglu",pos:"CM",stat:"0.30 xA/90"},{name:"Sommer",pos:"GK",stat:"+0.16 PSxG"}],
  "AC Milan":        [{name:"Leao",pos:"LW",stat:"0.48 xG/90"},{name:"Reijnders",pos:"CM",stat:"0.28 xA/90"},{name:"Maignan",pos:"GK",stat:"+0.21 PSxG"}],
  "Juventus":        [{name:"Vlahovic",pos:"ST",stat:"0.55 xG/90"},{name:"Chiesa",pos:"LW",stat:"0.31 xA/90"},{name:"Szczesny",pos:"GK",stat:"+0.14 PSxG"}],
};
function getKeyPlayers(name) {
  if(!name)return[];
  if(KP[name])return KP[name];
  const k=Object.keys(KP).find(k=>name.toLowerCase().includes(k.toLowerCase().split(" ")[0])||k.toLowerCase().includes(name.toLowerCase().split(" ")[0]));
  return k?KP[k]:[{name:name.split(" ").pop()+" #9",pos:"ST",stat:"—"},{name:name.split(" ").pop()+" #8",pos:"CM",stat:"—"},{name:name.split(" ").pop()+" #1",pos:"GK",stat:"—"}];
}

/* ─── Helpers ────────────────────────────────────────────── */
function fmtDate(raw) {
  if(!raw||raw==="TBD")return{day:"TBD",date:"",time:""};
  const d=new Date(raw.replace("T"," ").split(" ")[0]+"T12:00:00");
  return{day:d.toLocaleDateString("en-GB",{weekday:"short"}),date:d.toLocaleDateString("en-GB",{day:"numeric",month:"short"}),time:raw.includes("T")?raw.split("T")[1]?.slice(0,5)||"":""};
}
function parseForm(raw){if(Array.isArray(raw))return raw.filter(c=>"WDL".includes(c));return String(raw||"").split("").filter(c=>"WDL".includes(c));}
function poisson(lam,k){let r=Math.exp(-lam);for(let i=0;i<k;i++)r*=lam/(i+1);return r;}
function buildProbs(xgH,xgA){let pH=0,pD=0,pA=0,topScore="1-0",topP=0;for(let h=0;h<=7;h++)for(let a=0;a<=7;a++){const p=poisson(xgH,h)*poisson(xgA,a);if(h>a)pH+=p;else if(h===a)pD+=p;else pA+=p;if(p>topP){topP=p;topScore=`${h}-${a}`;}}const tot=pH+pD+pA||1;return{pH:pH/tot,pD:pD/tot,pA:pA/tot,topScore};}

/* ─── League Flag ────────────────────────────────────────── */
const LeagueFlag=({code,size=18})=>{const h=Math.round(size*.72);if(code==="epl")return<svg width={size} height={h} viewBox="0 0 18 13" fill="none"><rect width="18" height="13" fill="#012169"/><path d="M0 0L18 13M18 0L0 13" stroke="#fff" strokeWidth="2.6"/><path d="M0 0L18 13M18 0L0 13" stroke="#C8102E" strokeWidth="1.6"/><path d="M9 0V13M0 6.5H18" stroke="#fff" strokeWidth="4.3"/><path d="M9 0V13M0 6.5H18" stroke="#C8102E" strokeWidth="2.6"/></svg>;if(code==="laliga")return<svg width={size} height={h} viewBox="0 0 18 13" fill="none"><rect width="18" height="3" fill="#c60b1e"/><rect y="3" width="18" height="7" fill="#ffc400"/><rect y="10" width="18" height="3" fill="#c60b1e"/></svg>;if(code==="bundesliga")return<svg width={size} height={h} viewBox="0 0 18 13" fill="none"><rect width="18" height="4.3" fill="#000"/><rect y="4.3" width="18" height="4.3" fill="#DD0000"/><rect y="8.6" width="18" height="4.4" fill="#FFCE00"/></svg>;if(code==="seriea")return<svg width={size} height={h} viewBox="0 0 18 13" fill="none"><rect width="6" height="13" fill="#009246"/><rect x="6" width="6" height="13" fill="#fff"/><rect x="12" width="6" height="13" fill="#ce2b37"/></svg>;if(code==="ligue1")return<svg width={size} height={h} viewBox="0 0 18 13" fill="none"><rect width="6" height="13" fill="#002395"/><rect x="6" width="6" height="13" fill="#fff"/><rect x="12" width="6" height="13" fill="#ED2939"/></svg>;return null;};

/* ─── Form Pip ───────────────────────────────────────────── */
const FormPip=({r,T})=>{const s={W:{bg:`${T.accent}22`,c:T.accent,b:`${T.accent}55`},D:{bg:"rgba(255,255,255,0.06)",c:T.muted,b:"rgba(255,255,255,0.12)"},L:{bg:`${T.accent2}18`,c:T.accent2,b:`${T.accent2}40`}}[r]||{bg:"rgba(255,255,255,0.06)",c:T.muted,b:"rgba(255,255,255,0.12)"};return<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:20,height:20,borderRadius:5,fontSize:9,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",background:s.bg,color:s.c,border:`1px solid ${s.b}`}}>{r}</span>;};

/* ─── Mini Donut ─────────────────────────────────────────── */
const MiniDonut=({value,max=3,color,size=54,label})=>{const pct=Math.min(value/max,1),r=19,circ=2*Math.PI*r,dash=pct*circ,gap=circ-dash;return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}><svg width={size} height={size} viewBox="0 0 52 52"><circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5"/><circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="5" strokeDasharray={`${dash} ${gap}`} strokeLinecap="round" transform="rotate(-90 26 26)" opacity=".85"/><text x="26" y="30" fontSize="11" fontWeight="900" fill={color} textAnchor="middle" fontFamily="'JetBrains Mono',monospace">{typeof value==="number"?value.toFixed(1):value}</text></svg><span style={{fontSize:8,fontWeight:700,color:"rgba(255,255,255,0.3)",letterSpacing:"0.06em",textTransform:"uppercase"}}>{label}</span></div>);};

/* ─── Mini Radar ─────────────────────────────────────────── */
const MiniRadar=({vals,color,size=60})=>{const n=vals.length,cx=size/2,cy=size/2,r=size*.38;const pts=vals.map((v,i)=>{const a=(i/n)*Math.PI*2-Math.PI/2;return[cx+Math.cos(a)*r*v,cy+Math.sin(a)*r*v];});const poly=pts.map(([x,y])=>`${x},${y}`).join(" ");return(<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{[.33,.66,1].map((g,i)=><polygon key={i} points={Array.from({length:n}).map((_,j)=>{const a=(j/n)*Math.PI*2-Math.PI/2;return`${cx+Math.cos(a)*r*g},${cy+Math.sin(a)*r*g}`;}).join(" ")} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth=".6"/>)}{Array.from({length:n}).map((_,i)=>{const a=(i/n)*Math.PI*2-Math.PI/2;return<line key={i} x1={cx} y1={cy} x2={cx+Math.cos(a)*r} y2={cy+Math.sin(a)*r} stroke="rgba(255,255,255,0.06)" strokeWidth=".5"/>;})}<polygon points={poly} fill={color} fillOpacity=".18" stroke={color} strokeWidth="1.5" strokeOpacity=".85"/>{pts.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2.5" fill={color} opacity=".9"/>)}</svg>);};

/* ─── Versus Bar ─────────────────────────────────────────── */
const VersusBar=({label,hv,av,T,fmtFn})=>{const h=parseFloat(hv)||0,a=parseFloat(av)||0,tot=h+a||1,hp=h/tot*100,ap=a/tot*100,fmt=fmtFn||(v=>typeof v==="number"?v.toFixed(1):v);return(<div style={{display:"flex",flexDirection:"column",gap:4}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,fontWeight:800,color:T.homeCol,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(h)}</span><span style={{fontSize:9,fontWeight:700,color:T.muted,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</span><span style={{fontSize:13,fontWeight:800,color:T.awayCol,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(a)}</span></div><div style={{display:"flex",height:4,borderRadius:2,overflow:"hidden",gap:1}}><div style={{flex:hp,background:T.homeCol,borderRadius:"2px 0 0 2px",opacity:.75}}/><div style={{flex:ap,background:T.awayCol,borderRadius:"0 2px 2px 0",opacity:.75}}/></div></div>);};

/* ─── Score Grid ─────────────────────────────────────────── */
const ScoreGrid=({topScores,T})=>{if(!topScores?.length)return<div style={{padding:12,textAlign:"center",color:T.muted,fontSize:12}}>No score data</div>;const G=5,pm={};let mx=0;topScores.forEach(({score,prob})=>{const[hg,ag]=score.split("-").map(Number);if(hg<G&&ag<G){pm[`${hg}-${ag}`]=prob;if(prob>mx)mx=prob;}});return(<div><div style={{fontSize:9,fontWeight:800,color:T.muted,letterSpacing:"0.12em",marginBottom:8}}>CORRECT SCORE GRID (Home → Away ↓)</div><div style={{display:"grid",gridTemplateColumns:"18px repeat(5,1fr)",gap:3}}><div/>{[0,1,2,3,4].map(ag=><div key={ag} style={{textAlign:"center",fontSize:9,fontWeight:700,color:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>{ag}</div>)}{[0,1,2,3,4].map(hg=>[<div key={"r"+hg} style={{display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>{hg}</div>,...[0,1,2,3,4].map(ag=>{const p=pm[`${hg}-${ag}`]||0,pct=Math.round(p*100),isTop=p===mx&&mx>0,alpha=mx>0?Math.min(p/mx,1):0;return<div key={`${hg}-${ag}`} style={{aspectRatio:"1",minHeight:26,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:5,background:`rgba(255,255,255,${(alpha*.22+.03).toFixed(2)})`,fontSize:9,fontWeight:800,color:isTop?T.accent:"rgba(255,255,255,0.65)",fontFamily:"'JetBrains Mono',monospace",outline:isTop?`1.5px solid ${T.accent}`:"none"}} title={`${hg}-${ag}: ${(p*100).toFixed(1)}%`}>{pct>0?`${pct}%`:""}</div>;})])}</div></div>);};

/* ─── H2H Widget ─────────────────────────────────────────── */
const H2HWidget=({homeId,awayId,homeTeam,awayTeam,T})=>{const[data,setData]=useState(null);const[loading,setLoading]=useState(true);useEffect(()=>{if(!homeId||!awayId){setLoading(false);return;}getH2H(homeId,awayId,8).then(d=>{setData(d);setLoading(false);}).catch(()=>setLoading(false));},[homeId,awayId]);if(loading)return<div style={{height:80,borderRadius:8,background:T.faint}}/>;if(!data?.results?.length)return<div style={{padding:12,textAlign:"center",color:T.muted,fontSize:12}}>No H2H data</div>;const res=data.results;let hw=0,dw=0,aw=0;res.forEach(r=>{const isHome=r.home_team===homeTeam;if(r.home_goals>r.away_goals){if(isHome)hw++;else aw++;}else if(r.home_goals===r.away_goals)dw++;else{if(isHome)aw++;else hw++;}});const tot=hw+dw+aw||1;return(<div style={{display:"flex",flexDirection:"column",gap:10}}><div style={{display:"flex",gap:6}}>{[{label:(homeTeam||"").split(" ").pop(),val:hw,col:T.homeCol},{label:"Draw",val:dw,col:T.muted},{label:(awayTeam||"").split(" ").pop(),val:aw,col:T.awayCol}].map(({label,val,col})=><div key={label} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"8px 4px",borderRadius:8,background:"rgba(255,255,255,0.03)",border:`1px solid ${T.border}`}}><span style={{fontSize:22,fontWeight:900,color:col,fontFamily:"'JetBrains Mono',monospace"}}>{val}</span><span style={{fontSize:9,color:T.muted}}>{label.slice(0,7)}</span><span style={{fontSize:9,color:T.muted,opacity:.6}}>{Math.round(val/tot*100)}%</span></div>)}</div><div style={{display:"flex",height:5,borderRadius:3,overflow:"hidden"}}><div style={{flex:hw,background:T.homeCol,opacity:.8}}/><div style={{flex:dw,background:"rgba(255,255,255,0.15)"}}/><div style={{flex:aw,background:T.awayCol,opacity:.8}}/></div><div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:180,overflowY:"auto"}}>{res.slice(0,6).map((r,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:6,background:"rgba(255,255,255,0.02)"}}><span style={{fontSize:10,color:T.muted,minWidth:72,fontFamily:"'JetBrains Mono',monospace"}}>{r.date}</span><span style={{flex:1,fontSize:11,fontWeight:700,color:T.muted,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.home_team}</span><span style={{padding:"2px 8px",borderRadius:4,background:"rgba(255,255,255,0.05)",fontSize:12,fontWeight:900,color:T.text,fontFamily:"'JetBrains Mono',monospace",minWidth:40,textAlign:"center"}}>{r.home_goals} – {r.away_goals}</span><span style={{flex:1,fontSize:11,fontWeight:700,color:T.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.away_team}</span></div>)}</div></div>);};

/* ─── Odds Widget ────────────────────────────────────────── */
const OddsWidget=({fixtureId,pHome,pDraw,pAway,homeTeam,awayTeam,T})=>{const[odds,setOdds]=useState(null);useEffect(()=>{if(fixtureId)getFixtureOdds(fixtureId).then(setOdds).catch(()=>{});},[fixtureId]);if(!odds?.bookmakers?.length)return<div style={{padding:12,textAlign:"center",color:T.muted,fontSize:12}}>Loading odds...</div>;const bk=odds.bookmakers[0],mw=bk.bets?.["Match Winner"]||{};const imp=odd=>odd?Math.round(1/parseFloat(odd)*100):0;const outcomes=[{label:(homeTeam||"").split(" ").pop().slice(0,8),odd:mw["Home"],model:Math.round((pHome||0)*100)},{label:"Draw",odd:mw["Draw"],model:Math.round((pDraw||0)*100)},{label:(awayTeam||"").split(" ").pop().slice(0,8),odd:mw["Away"],model:Math.round((pAway||0)*100)}];return(<div style={{display:"flex",flexDirection:"column",gap:8}}><div style={{display:"flex",gap:6}}>{outcomes.map(({label,odd,model})=>{const implied=imp(odd),diff=implied?model-implied:0;return<div key={label} style={{flex:1,display:"flex",flexDirection:"column",gap:4,alignItems:"center",padding:"10px 6px",borderRadius:10,background:"rgba(255,255,255,0.03)",border:`1px solid ${T.border}`}}><span style={{fontSize:9,fontWeight:800,color:T.muted}}>{label}</span><span style={{fontSize:22,fontWeight:900,color:T.text,fontFamily:"'JetBrains Mono',monospace"}}>{odd||"—"}</span><div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><span style={{fontSize:9,color:T.muted}}>Implied {implied}%</span><span style={{fontSize:10,fontWeight:800,color:T.accent}}>Model {model}%</span></div>{Math.abs(diff)>=3&&<span style={{fontSize:10,fontWeight:900,color:diff>0?T.accent:T.accent2,background:`${diff>0?T.accent:T.accent2}18`,padding:"2px 7px",borderRadius:999,border:`1px solid ${diff>0?T.accent:T.accent2}40`}}>{diff>0?"+":""}{diff}% edge</span>}</div>;})} </div><div style={{fontSize:9,color:T.muted,textAlign:"center"}}>{bk.name}</div></div>);};

/* ══════════════════════════════════════════════════════════
   TASK 2+3+4 — VS SPLIT MATCH CARD
══════════════════════════════════════════════════════════ */
const MatchCard=({match,T,injuries,onSelect,isSelected,navigate})=>{
  const[open,setOpen]=useState(false);
  const[activeTab,setActiveTab]=useState("stats");
  const hp=match.p_home_win||0,dp=match.p_draw||0,ap=match.p_away_win||0;
  const fav=hp>ap&&hp>dp?"home":ap>hp&&ap>dp?"away":"draw";
  const{day,date,time}=fmtDate(match.date);
  const hForm=parseForm(match.home_form),aForm=parseForm(match.away_form);
  const xgH=parseFloat(match.xg_home)||0,xgA=parseFloat(match.xg_away)||0;
  const bttsPct=Math.round((match.btts||0)*100),o25=Math.round((match.over_2_5||0)*100),conf=Math.round(match.confidence||0);
  const confLabel=conf>=72?"Strong":conf>=52?"Moderate":conf>=36?"Uncertain":"Low";
  const homePlayrs=getKeyPlayers(match.home_team),awayPlayrs=getKeyPlayers(match.away_team);
  const hS=match.home_stats||{},aS=match.away_stats||{};
  const hP=(hS.played_home||0)+(hS.played_away||0)||1,aP=(aS.played_home||0)+(aS.played_away||0)||1;
  const TABS=[{id:"stats",label:"Stats"},{id:"players",label:"Key Players"},{id:"h2h",label:"H2H"},{id:"odds",label:"Odds"},{id:"grid",label:"Score Grid"}];

  return(
    <div onClick={()=>onSelect&&onSelect()} style={{background:T.panel,borderRadius:16,overflow:"hidden",border:`1px solid ${isSelected?T.borderHi:T.border}`,boxShadow:isSelected?`0 0 0 1px ${T.accent}30,0 8px 32px rgba(0,0,0,0.5)`:open?"0 4px 24px rgba(0,0,0,0.5)":"none",transition:"all 0.2s",cursor:"pointer"}}
      onMouseEnter={e=>{if(!isSelected)e.currentTarget.style.borderColor=T.border+"cc";}}
      onMouseLeave={e=>{if(!isSelected)e.currentTarget.style.borderColor=T.border;}}>

      {/* DATE BAR */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 14px",borderBottom:`1px solid ${T.border}`,background:`linear-gradient(90deg,${T.faint},transparent)`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,fontWeight:900,color:T.accent,fontFamily:"'JetBrains Mono',monospace"}}>{day}</span>
          <span style={{fontSize:12,fontWeight:700,color:T.text}}>{date}</span>
          {time&&<span style={{fontSize:11,color:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>{time}</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {isSelected&&<span style={{fontSize:8,fontWeight:900,color:T.accent,background:`${T.accent}18`,border:`1px solid ${T.accent}40`,padding:"2px 8px",borderRadius:999}}>IN SIMULATOR</span>}
          <button onClick={e=>{e.stopPropagation();setOpen(o=>!o);}} style={{background:"none",border:`1px solid ${T.border}`,borderRadius:6,color:T.muted,fontSize:10,padding:"3px 8px",cursor:"pointer",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.muted;}}>
            {open?"▲":"▼ Details"}
          </button>
        </div>
      </div>

      {/* VS SPLIT */}
      <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr"}}>

        {/* HOME */}
        <div style={{padding:"16px 14px",background:`linear-gradient(135deg,${T.homeCol}09 0%,transparent 60%)`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            {match.home_logo&&<img src={match.home_logo} alt="" style={{width:32,height:32,objectFit:"contain",flexShrink:0}} onError={e=>{e.currentTarget.style.display="none";}}/>}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:900,color:fav==="home"?T.homeCol:T.text,fontFamily:"'Sora',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{match.home_team}</div>
              <div style={{fontSize:8,color:T.muted,marginTop:1}}>HOME</div>
            </div>
            {fav==="home"&&<span style={{fontSize:7,fontWeight:900,color:T.accent,background:`${T.accent}18`,border:`1px solid ${T.accent}40`,padding:"2px 6px",borderRadius:999,flexShrink:0}}>FAV</span>}
          </div>
          <div style={{display:"flex",gap:3,marginBottom:12,flexWrap:"wrap"}}>{hForm.slice(-5).map((r,i)=><FormPip key={i} r={r} T={T}/>)}</div>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12,justifyContent:"flex-start"}}>
            <MiniDonut value={xgH} max={3} color={T.homeCol} size={52} label="xG"/>
            <MiniDonut value={hS.shots_pg||2} max={20} color={T.homeCol} size={52} label="Shots"/>
            <MiniDonut value={hS.possession_avg||50} max={100} color={T.homeCol} size={52} label="Poss%"/>
          </div>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
              <div style={{flex:1,height:4,borderRadius:2,background:"rgba(255,255,255,0.06)"}}><div style={{width:`${Math.round(hp*100)}%`,height:"100%",borderRadius:2,background:T.homeCol,boxShadow:`0 0 6px ${T.homeCol}66`,transition:"width 0.5s"}}/></div>
              <span style={{fontSize:15,fontWeight:900,color:T.homeCol,fontFamily:"'JetBrains Mono',monospace",minWidth:36,textAlign:"right"}}>{Math.round(hp*100)}%</span>
            </div>
            <div style={{fontSize:8,color:T.muted}}>Win probability</div>
          </div>
        </div>

        {/* CENTER */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"16px 10px",borderLeft:`1px solid ${T.border}`,borderRight:`1px solid ${T.border}`,minWidth:120,gap:7}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:30,fontWeight:900,letterSpacing:"0.04em",lineHeight:1,fontFamily:"'JetBrains Mono',monospace",color:T.text}}>{match.most_likely_score||"?–?"}</div>
            <div style={{fontSize:7,color:T.muted,letterSpacing:"0.1em",marginTop:3}}>PREDICTED</div>
          </div>
          <div style={{display:"flex",gap:3,width:"100%"}}>
            {[{l:"H",v:Math.round(hp*100),c:T.homeCol},{l:"D",v:Math.round(dp*100),c:T.muted},{l:"A",v:Math.round(ap*100),c:T.awayCol}].map(({l,v,c})=>(
              <div key={l} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:1,padding:"5px 2px",borderRadius:6,background:"rgba(255,255,255,0.04)",border:`1px solid ${T.border}`}}>
                <span style={{fontSize:7,color:T.muted}}>{l}</span>
                <span style={{fontSize:12,fontWeight:900,color:c,fontFamily:"'JetBrains Mono',monospace"}}>{v}%</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",height:4,width:"100%",borderRadius:2,overflow:"hidden",gap:1}}>
            <div style={{flex:hp,background:T.homeCol,opacity:.85}}/><div style={{flex:dp,background:"rgba(255,255,255,0.2)"}}/><div style={{flex:ap,background:T.awayCol,opacity:.85}}/>
          </div>
          {[{l:"BTTS",v:`${bttsPct}%`,hi:bttsPct>=55},{l:"O2.5",v:`${o25}%`,hi:o25>=60},{l:"CONF",v:`${conf}%`,hi:conf>=65}].map(({l,v,hi})=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",padding:"4px 7px",borderRadius:5,background:hi?`${T.accent}10`:"rgba(255,255,255,0.03)",border:`1px solid ${hi?T.accent+"28":T.border}`}}>
              <span style={{fontSize:7,fontWeight:800,color:T.muted,letterSpacing:"0.08em"}}>{l}</span>
              <span style={{fontSize:10,fontWeight:900,color:hi?T.accent:T.text,fontFamily:"'JetBrains Mono',monospace"}}>{v}</span>
            </div>
          ))}
          <div style={{fontSize:8,fontWeight:700,color:conf>=65?T.accent:T.muted,textAlign:"center"}}>{confLabel} confidence</div>
        </div>

        {/* AWAY */}
        <div style={{padding:"16px 14px",background:`linear-gradient(225deg,${T.awayCol}09 0%,transparent 60%)`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexDirection:"row-reverse"}}>
            {match.away_logo&&<img src={match.away_logo} alt="" style={{width:32,height:32,objectFit:"contain",flexShrink:0}} onError={e=>{e.currentTarget.style.display="none";}}/>}
            <div style={{flex:1,minWidth:0,textAlign:"right"}}>
              <div style={{fontSize:14,fontWeight:900,color:fav==="away"?T.awayCol:T.text,fontFamily:"'Sora',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{match.away_team}</div>
              <div style={{fontSize:8,color:T.muted,marginTop:1}}>AWAY</div>
            </div>
            {fav==="away"&&<span style={{fontSize:7,fontWeight:900,color:T.accent2,background:`${T.accent2}18`,border:`1px solid ${T.accent2}40`,padding:"2px 6px",borderRadius:999,flexShrink:0}}>FAV</span>}
          </div>
          <div style={{display:"flex",gap:3,marginBottom:12,flexWrap:"wrap",justifyContent:"flex-end"}}>{aForm.slice(-5).map((r,i)=><FormPip key={i} r={r} T={T}/>)}</div>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12,justifyContent:"flex-end"}}>
            <MiniDonut value={aS.possession_avg||50} max={100} color={T.awayCol} size={52} label="Poss%"/>
            <MiniDonut value={aS.shots_pg||2} max={20} color={T.awayCol} size={52} label="Shots"/>
            <MiniDonut value={xgA} max={3} color={T.awayCol} size={52} label="xG"/>
          </div>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexDirection:"row-reverse"}}>
              <div style={{flex:1,height:4,borderRadius:2,background:"rgba(255,255,255,0.06)"}}><div style={{width:`${Math.round(ap*100)}%`,height:"100%",borderRadius:2,background:T.awayCol,boxShadow:`0 0 6px ${T.awayCol}66`,transition:"width 0.5s",marginLeft:"auto"}}/></div>
              <span style={{fontSize:15,fontWeight:900,color:T.awayCol,fontFamily:"'JetBrains Mono',monospace",minWidth:36}}>{Math.round(ap*100)}%</span>
            </div>
            <div style={{fontSize:8,color:T.muted,textAlign:"right"}}>Win probability</div>
          </div>
        </div>
      </div>

      {/* EXPANDABLE */}
      {open&&(
        <div style={{borderTop:`1px solid ${T.border}`}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",borderBottom:`1px solid ${T.border}`,overflowX:"auto"}}>
            {TABS.map(({id,label})=>(
              <button key={id} onClick={()=>setActiveTab(id)} style={{padding:"10px 14px",fontSize:11,fontWeight:800,cursor:"pointer",background:"none",border:"none",whiteSpace:"nowrap",fontFamily:"'Inter',sans-serif",color:activeTab===id?T.accent:T.muted,borderBottom:`2px solid ${activeTab===id?T.accent:"transparent"}`,transition:"all 0.15s"}}>{label}</button>
            ))}
          </div>
          <div style={{padding:"16px 14px"}}>
            {activeTab==="stats"&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11,fontWeight:800,color:T.homeCol}}>{(match.home_team||"").split(" ").pop()}</span>
                  <span style={{fontSize:11,fontWeight:800,color:T.awayCol}}>{(match.away_team||"").split(" ").pop()}</span>
                </div>
                {[
                  {l:"Goals/Game",hv:((hS.scored_home||0)+(hS.scored_away||0))/hP,av:((aS.scored_home||0)+(aS.scored_away||0))/aP,fmt:v=>v.toFixed(2)},
                  {l:"xG",hv:xgH,av:xgA,fmt:v=>v.toFixed(2)},
                  {l:"Shots/Game",hv:hS.shots_pg||0,av:aS.shots_pg||0,fmt:v=>v.toFixed(1)},
                  {l:"On Target %",hv:hS.shots_on_target_pct||0,av:aS.shots_on_target_pct||0,fmt:v=>v.toFixed(0)+"%"},
                  {l:"Possession",hv:hS.possession_avg||50,av:aS.possession_avg||50,fmt:v=>v+"%"},
                  {l:"Pass Accuracy",hv:hS.pass_accuracy||0,av:aS.pass_accuracy||0,fmt:v=>v.toFixed(0)+"%"},
                ].map(({l,hv,av,fmt})=><VersusBar key={l} label={l} hv={hv} av={av} T={T} fmtFn={fmt}/>)}
              </div>
            )}
            {activeTab==="players"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                {[{team:match.home_team,players:homePlayrs,col:T.homeCol,side:"HOME"},{team:match.away_team,players:awayPlayrs,col:T.awayCol,side:"AWAY"}].map(({team,players,col,side})=>(
                  <div key={side}>
                    <div style={{fontSize:9,fontWeight:900,color:col,letterSpacing:"0.12em",marginBottom:10}}>{side} · WATCH</div>
                    <div style={{display:"flex",flexDirection:"column",gap:7}}>
                      {players.map((p,i)=>(
                        <div key={i} onClick={()=>navigate(`/player?search=${encodeURIComponent(p.name)}`)}
                          style={{display:"flex",alignItems:"center",gap:8,padding:"9px 11px",borderRadius:10,background:`${col}0a`,border:`1px solid ${col}22`,cursor:"pointer",transition:"all 0.18s"}}
                          onMouseEnter={e=>{e.currentTarget.style.background=`${col}18`;e.currentTarget.style.borderColor=`${col}50`;e.currentTarget.style.transform="translateX(3px)";}}
                          onMouseLeave={e=>{e.currentTarget.style.background=`${col}0a`;e.currentTarget.style.borderColor=`${col}22`;e.currentTarget.style.transform="";}}>
                          <div style={{width:30,height:30,borderRadius:7,background:`${col}20`,border:`1px solid ${col}40`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            <span style={{fontSize:8,fontWeight:900,color:col}}>{p.pos}</span>
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:800,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                            <div style={{fontSize:10,fontWeight:700,color:col,fontFamily:"'JetBrains Mono',monospace"}}>{p.stat}</div>
                          </div>
                          <MiniRadar vals={[.6+Math.random()*.35,.5+Math.random()*.4,.55+Math.random()*.35,.5+Math.random()*.4,.6+Math.random()*.35]} color={col} size={48}/>
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" style={{flexShrink:0,opacity:.4}}><path d="M2 6h8M7 3l3 3-3 3" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab==="h2h"&&<H2HWidget homeId={match.home_id} awayId={match.away_id} homeTeam={match.home_team} awayTeam={match.away_team} T={T}/>}
            {activeTab==="odds"&&<OddsWidget fixtureId={match.fixture_id} pHome={hp} pDraw={dp} pAway={ap} homeTeam={match.home_team} awayTeam={match.away_team} T={T}/>}
            {activeTab==="grid"&&<ScoreGrid topScores={match.top_scores} T={T}/>}
          </div>
          <div style={{display:"flex",gap:4,padding:"6px 14px 12px",flexWrap:"wrap"}}>
            {["Dixon-Coles","Elo","Poisson","xG"].map(l=><span key={l} style={{fontSize:8,fontWeight:800,letterSpacing:"0.05em",padding:"2px 8px",borderRadius:4,background:`${T.accent}0e`,border:`1px solid ${T.accent}22`,color:T.muted}}>{l}</span>)}
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   TASK 5 — FLOATING SCENARIO SIMULATOR
══════════════════════════════════════════════════════════ */
const PRESETS=[
  {label:"Normal",icon:"⚖️",mods:{homeAtk:0,awayAtk:0,homeDef:0,awayDef:0,tempo:0}},
  {label:"Home Press",icon:"🔥",mods:{homeAtk:15,awayAtk:-5,homeDef:5,awayDef:-10,tempo:5}},
  {label:"Both Attack",icon:"⚽",mods:{homeAtk:10,awayAtk:10,homeDef:-10,awayDef:-10,tempo:8}},
  {label:"Defensive",icon:"🛡️",mods:{homeAtk:-10,awayAtk:-10,homeDef:15,awayDef:15,tempo:-8}},
  {label:"Away Upset",icon:"🌪️",mods:{homeAtk:-10,awayAtk:18,homeDef:-5,awayDef:5,tempo:3}},
];

const ScenarioSimulator=({match,T})=>{
  const[mods,setMods]=useState({homeAtk:0,awayAtk:0,homeDef:0,awayDef:0,tempo:0});
  const[activePreset,setActivePreset]=useState(0);
  const applyPreset=i=>{setActivePreset(i);setMods({...PRESETS[i].mods});};
  const official=useMemo(()=>{if(!match)return null;const xgH=parseFloat(match.xg_home)||1.3,xgA=parseFloat(match.xg_away)||1.1;return{...buildProbs(xgH,xgA),xgH:xgH.toFixed(2),xgA:xgA.toFixed(2)};},[match]);
  const scenario=useMemo(()=>{if(!match)return null;const baseH=parseFloat(match.xg_home)||1.3,baseA=parseFloat(match.xg_away)||1.1,tMult=1+mods.tempo/100;const xgH=Math.max(.1,baseH*(1+mods.homeAtk/100)*(1-mods.awayDef/200)*tMult),xgA=Math.max(.1,baseA*(1+mods.awayAtk/100)*(1-mods.homeDef/200)*tMult);return{...buildProbs(xgH,xgA),xgH:xgH.toFixed(2),xgA:xgA.toFixed(2)};},[match,mods]);
  const isModified=JSON.stringify(mods)!==JSON.stringify(PRESETS[0].mods);

  if(!match)return(
    <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,padding:28,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:220,gap:12}}>
      <span style={{fontSize:32,opacity:.3}}>🎯</span>
      <span style={{fontSize:12,color:T.muted,textAlign:"center",lineHeight:1.7}}>Click any match card to load the Scenario Simulator</span>
    </div>
  );

  return(
    <div style={{background:T.panel,border:`1px solid ${T.borderHi}`,borderRadius:16,overflow:"hidden",boxShadow:`0 0 0 1px ${T.accent}18,0 16px 48px rgba(0,0,0,0.6)`}}>
      {/* Header */}
      <div style={{padding:"13px 15px",borderBottom:`1px solid ${T.border}`,background:`linear-gradient(90deg,${T.accent}0e,transparent)`}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:T.accent,boxShadow:`0 0 7px ${T.accent}`}}/>
          <span style={{fontSize:10,fontWeight:900,color:T.accent,letterSpacing:"0.1em"}}>SCENARIO SIMULATOR</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:12,fontWeight:800,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>
            {match.home_team} <span style={{color:T.muted,fontWeight:400}}>vs</span> {match.away_team}
          </div>
          {isModified&&<button onClick={()=>applyPreset(0)} style={{fontSize:9,fontWeight:800,color:T.muted,background:"none",border:`1px solid ${T.border}`,borderRadius:5,padding:"2px 7px",cursor:"pointer",flexShrink:0,marginLeft:6}}>Reset</button>}
        </div>
      </div>

      {/* Presets */}
      <div style={{padding:"11px 13px",borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontSize:8,fontWeight:900,color:T.muted,letterSpacing:"0.12em",marginBottom:7}}>QUICK SCENARIOS</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {PRESETS.map((p,i)=>(
            <button key={i} onClick={()=>applyPreset(i)} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",borderRadius:7,fontSize:10,fontWeight:800,cursor:"pointer",transition:"all 0.15s",background:activePreset===i?`${T.accent}1a`:"rgba(255,255,255,0.04)",border:`1px solid ${activePreset===i?T.accent:T.border}`,color:activePreset===i?T.accent:T.muted}}>
              <span>{p.icon}</span>{p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div style={{padding:"11px 13px",borderBottom:`1px solid ${T.border}`,display:"flex",flexDirection:"column",gap:9}}>
        <div style={{fontSize:8,fontWeight:900,color:T.muted,letterSpacing:"0.12em",marginBottom:2}}>FINE TUNE</div>
        {[{label:"Home Attack",k:"homeAtk"},{label:"Away Attack",k:"awayAtk"},{label:"Home Defense",k:"homeDef"},{label:"Away Defense",k:"awayDef"},{label:"Tempo",k:"tempo"}].map(({label,k})=>{
          const val=mods[k];
          return(
            <div key={k} style={{display:"flex",flexDirection:"column",gap:3}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:10,color:T.muted}}>{label}</span>
                <span style={{fontSize:11,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:val===0?T.muted:val>0?T.accent:T.accent2}}>{val>0?"+":""}{val}%</span>
              </div>
              <input type="range" min={-25} max={25} value={val}
                onChange={e=>{setActivePreset(-1);setMods(p=>({...p,[k]:parseInt(e.target.value)}));}}
                style={{width:"100%",accentColor:T.accent,cursor:"pointer"}}/>
            </div>
          );
        })}
      </div>

      {/* Comparison */}
      {official&&scenario&&(
        <div style={{padding:"11px 13px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{fontSize:8,fontWeight:900,color:T.muted,letterSpacing:"0.12em",marginBottom:9}}>OFFICIAL vs SCENARIO</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            {[{label:"Official",data:official,col:T.muted},{label:"Scenario",data:scenario,col:T.accent}].map(({label,data,col})=>(
              <div key={label} style={{padding:"9px 11px",borderRadius:10,background:label==="Scenario"?`${T.accent}0a`:"rgba(255,255,255,0.02)",border:`1px solid ${label==="Scenario"?T.accent+"28":T.border}`}}>
                <div style={{fontSize:8,fontWeight:900,color:col,letterSpacing:"0.1em",marginBottom:6}}>{label.toUpperCase()}</div>
                <div style={{fontSize:22,fontWeight:900,color:T.text,fontFamily:"'JetBrains Mono',monospace",textAlign:"center",marginBottom:5}}>{data.topScore}</div>
                <div style={{display:"flex",height:3,borderRadius:2,overflow:"hidden",marginBottom:5}}>
                  <div style={{flex:data.pH,background:T.homeCol,opacity:.8}}/><div style={{flex:data.pD,background:"rgba(255,255,255,0.2)"}}/><div style={{flex:data.pA,background:T.awayCol,opacity:.8}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  {[{v:Math.round(data.pH*100),c:T.homeCol},{v:Math.round(data.pD*100),c:T.muted},{v:Math.round(data.pA*100),c:T.awayCol}].map(({v,c},i)=>(
                    <span key={i} style={{fontSize:11,fontWeight:900,color:c,fontFamily:"'JetBrains Mono',monospace"}}>{v}%</span>
                  ))}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:5}}>
                  <span style={{fontSize:9,color:T.homeCol,fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>H {data.xgH}</span>
                  <span style={{fontSize:9,color:T.awayCol,fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>A {data.xgA}</span>
                </div>
              </div>
            ))}
          </div>
          {isModified&&(
            <div style={{marginTop:7,display:"flex",gap:4,flexWrap:"wrap"}}>
              {[{l:"Home Win",d:Math.round((scenario.pH-official.pH)*100)},{l:"Draw",d:Math.round((scenario.pD-official.pD)*100)},{l:"Away Win",d:Math.round((scenario.pA-official.pA)*100)}].map(({l,d})=>d!==0&&(
                <span key={l} style={{fontSize:9,fontWeight:800,color:d>0?T.accent:T.accent2,background:`${d>0?T.accent:T.accent2}14`,border:`1px solid ${d>0?T.accent:T.accent2}30`,padding:"2px 7px",borderRadius:999}}>{l} {d>0?"+":""}{d}%</span>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{padding:"9px 13px",fontSize:9,color:T.muted,lineHeight:1.5}}>Adjusts xG assumptions only. Official predictions unchanged.</div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   TASK 6 — STANDINGS + SCORERS
══════════════════════════════════════════════════════════ */
const StandingsTable=({rows,loading,T})=>{
  const[sortCol,setSortCol]=useState("rank");const[dir,setDir]=useState(1);
  const total=rows.length||20;
  const ZONE_COL={cl:T.accent,el:T.mid,ecl:T.muted,rel:T.accent2};
  function getZone(pos){if(pos<=4)return"cl";if(pos===5)return"el";if(pos===6)return"ecl";if(pos>=total-2)return"rel";return null;}
  const sorted=useMemo(()=>{if(loading)return[];return[...rows].sort((a,b)=>{let va=a[sortCol],vb=b[sortCol];if(va==null)va=sortCol==="rank"?999:0;if(vb==null)vb=sortCol==="rank"?999:0;if(typeof va==="string"){va=va.toLowerCase();vb=vb.toLowerCase();}return va<vb?-dir:va>vb?dir:0;});},[rows,sortCol,dir,loading]);
  const toggle=col=>{if(sortCol===col)setDir(d=>-d);else{setSortCol(col);setDir(col==="rank"?1:-1);}};
  const Th=({col,children,align,width})=><th onClick={()=>toggle(col)} style={{padding:10,fontSize:9,fontWeight:900,letterSpacing:".1em",color:sortCol===col?T.accent:T.muted,borderBottom:`1px solid ${T.border}`,background:"rgba(0,0,0,0.3)",textAlign:align||"center",width,cursor:"pointer",userSelect:"none"}}>{children}{sortCol===col?(dir===1?" ↑":" ↓"):""}</th>;
  return(
    <div style={{overflowX:"auto",borderRadius:12}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,fontFamily:"'Sora',sans-serif"}}>
        <thead><tr><Th col="rank" width={36}>#</Th><Th col="team_name" align="left">Club</Th><Th col="played" width={34}>P</Th><Th col="won" width={34}>W</Th><Th col="drawn" width={34}>D</Th><Th col="lost" width={34}>L</Th><Th col="goals_for" width={34}>GF</Th><Th col="goals_against" width={34}>GA</Th><Th col="goal_diff" width={40}>GD</Th><Th col="points" width={40}>Pts</Th></tr></thead>
        <tbody>
          {loading?Array.from({length:10}).map((_,i)=><tr key={i}>{Array.from({length:10}).map((_2,j)=><td key={j} style={{padding:10,textAlign:"center"}}><div style={{height:12,borderRadius:3,background:T.faint}}/></td>)}</tr>):sorted.map((row,i)=>{const zone=getZone(row.rank||i+1);return(
            <tr key={row.team_id||i} style={{borderBottom:`1px solid ${T.border}`,transition:"background 0.12s"}} onMouseEnter={e=>{e.currentTarget.style.background=`${T.accent}08`;}} onMouseLeave={e=>{e.currentTarget.style.background="";}}>
              <td style={{padding:10,textAlign:"center"}}><div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>{zone&&<div style={{width:3,height:16,borderRadius:2,background:ZONE_COL[zone],flexShrink:0}}/>}<span style={{fontSize:12,fontWeight:800,color:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>{row.rank||i+1}</span></div></td>
              <td style={{padding:10}}><div style={{display:"flex",alignItems:"center",gap:8}}>{row.logo&&<img src={row.logo} style={{width:20,height:20,objectFit:"contain"}} onError={e=>{e.currentTarget.style.display="none";}}/>}<span style={{fontWeight:700,color:T.text}}>{row.team_name}</span></div></td>
              {[row.played,row.won,row.drawn,row.lost,row.goals_for,row.goals_against].map((v,j)=><td key={j} style={{padding:10,textAlign:"center",color:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>{v??"-"}</td>)}
              <td style={{padding:10,textAlign:"center",fontFamily:"'JetBrains Mono',monospace",color:(row.goal_diff||0)>0?T.accent:(row.goal_diff||0)<0?T.accent2:T.muted}}>{(row.goal_diff||0)>0?"+":""}{row.goal_diff??"-"}</td>
              <td style={{padding:10,textAlign:"center",fontWeight:900,color:T.text,fontFamily:"'JetBrains Mono',monospace"}}>{row.points??"-"}</td>
            </tr>
          );})}
        </tbody>
      </table>
      <div style={{display:"flex",gap:14,padding:"10px 14px",borderTop:`1px solid ${T.border}`,flexWrap:"wrap"}}>
        {[{c:T.accent,l:"Champions League"},{c:T.mid,l:"Europa League"},{c:T.muted,l:"Conference"},{c:T.accent2,l:"Relegation"}].map(({c,l})=><div key={l} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:3,height:12,borderRadius:2,background:c}}/><span style={{fontSize:9,color:T.muted}}>{l}</span></div>)}
      </div>
    </div>
  );
};

const ScorersWidget=({league,T})=>{
  const[tab,setTab]=useState("goals");const[scorers,setScorers]=useState([]);const[assists,setAssists]=useState([]);const[loading,setLoading]=useState(true);
  const navigate=useNavigate();
  useEffect(()=>{setLoading(true);Promise.allSettled([getTopScorers(league),getTopAssists(league)]).then(([sr,ar])=>{if(sr.status==="fulfilled")setScorers(sr.value.scorers||[]);if(ar.status==="fulfilled")setAssists(ar.value.assists||[]);setLoading(false);});},[league]);
  const data=tab==="goals"?scorers:assists,statKey=tab==="goals"?"goals":"assists",maxVal=Math.max(...data.map(p=>p[statKey]||0),1);
  return(
    <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
      <div style={{display:"flex",borderBottom:`1px solid ${T.border}`}}>
        {[["goals","Top Scorers"],["assists","Top Assists"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{flex:1,padding:12,fontSize:11,fontWeight:800,cursor:"pointer",background:"none",border:"none",fontFamily:"'Inter',sans-serif",color:tab===k?T.accent:T.muted,borderBottom:`2px solid ${tab===k?T.accent:"transparent"}`,transition:"all 0.15s"}}>{l}</button>
        ))}
      </div>
      <div style={{padding:"8px 0",maxHeight:440,overflowY:"auto"}}>
        {loading?Array.from({length:8}).map((_,i)=><div key={i} style={{display:"flex",gap:10,padding:"10px 14px",alignItems:"center"}}><div style={{width:18,height:18,borderRadius:"50%",background:T.faint}}/><div style={{width:36,height:36,borderRadius:"50%",background:T.faint}}/><div style={{flex:1,height:12,borderRadius:4,background:T.faint}}/></div>)
          :data.slice(0,10).map((p,i)=>(
            <div key={p.player_id||i} onClick={()=>navigate(`/player?search=${encodeURIComponent(p.name)}`)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",transition:"background 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.background=`${T.accent}08`;}} onMouseLeave={e=>{e.currentTarget.style.background="";}}>
              <span style={{fontSize:12,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:i<3?T.accent:T.muted,width:18,textAlign:"center"}}>{i+1}</span>
              {p.photo?<img src={p.photo} style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",flexShrink:0}} onError={e=>{e.currentTarget.style.display="none";}}/>:<div style={{width:36,height:36,borderRadius:"50%",background:T.faint,flexShrink:0}}/>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:800,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                <div style={{height:3,borderRadius:2,background:"rgba(255,255,255,0.05)",marginTop:4,marginBottom:2}}><div style={{width:`${(p[statKey]||0)/maxVal*100}%`,height:"100%",borderRadius:2,background:T.accent,opacity:.7}}/></div>
                <div style={{fontSize:9,color:T.muted}}>{p.team_name}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:22,fontWeight:900,color:T.accent,fontFamily:"'JetBrains Mono',monospace"}}>{p[statKey]||0}</div>
                <div style={{fontSize:9,color:T.muted}}>{p.played||0} apps</div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   SEASON SIMULATOR — Monte Carlo supercomputer
   Uses current standings + Poisson to simulate remaining GWs
══════════════════════════════════════════════════════════ */

// League-specific season metadata
const LEAGUE_META = {
  epl:    { total:38, relegZone:3, euroTop:4, elPos:5, confPos:6, name:"Premier League" },
  laliga: { total:38, relegZone:3, euroTop:4, elPos:5, confPos:null, name:"La Liga" },
  seriea: { total:38, relegZone:3, euroTop:4, elPos:5, confPos:null, name:"Serie A" },
  ligue1: { total:34, relegZone:3, euroTop:3, elPos:4, confPos:null, name:"Ligue 1" },
};

function poissonRandom(lambda) {
  let L = Math.exp(-lambda), k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function runMonteCarlo(teams, gamesPlayed, totalGames, sims = 8000) {
  if (!teams.length) return [];
  const n = teams.length;
  const remaining = totalGames - gamesPlayed;
  // Each team still plays ~remaining/2 home, ~remaining/2 away (simplified)
  const homeAdv = 0.35; // avg home xG advantage

  // Derive attack/defense strength from current goals scored/conceded
  const avgGF = teams.reduce((s,t) => s + (t.goals_for||0), 0) / n / Math.max(gamesPlayed, 1);
  const avgGA = teams.reduce((s,t) => s + (t.goals_against||0), 0) / n / Math.max(gamesPlayed, 1);

  const strength = teams.map(t => {
    const gp = Math.max(t.played || gamesPlayed, 1);
    const atk = (t.goals_for || 0) / gp / Math.max(avgGF, 0.01);
    const def = (t.goals_against || 0) / gp / Math.max(avgGA, 0.01);
    return { atk: Math.max(atk, 0.3), def: Math.max(def, 0.3) };
  });

  const avgLambda = 1.35; // league avg goals/game per team

  // Accumulators
  const titleCount   = new Array(n).fill(0);
  const top4Count    = new Array(n).fill(0);
  const top5Count    = new Array(n).fill(0);
  const relegCount   = new Array(n).fill(0);
  const pointsSum    = new Array(n).fill(0);
  const posSum       = new Array(n).fill(0);

  for (let s = 0; s < sims; s++) {
    // Clone current points
    const pts = teams.map(t => t.points || 0);
    const gd  = teams.map(t => t.goal_diff || 0);
    const gf  = teams.map(t => t.goals_for || 0);

    // Simulate remaining fixtures — round-robin style for remaining games
    const gamesLeft = Math.round(remaining);
    // Generate fixture pairs proportionally
    const fixtures = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        fixtures.push([i, j]);
      }
    }
    // Scale fixtures to ~match remaining game count per team
    const totalFixtures = Math.round((n * gamesLeft) / 2);
    const usedFixtures = fixtures.slice(0, totalFixtures);

    for (const [h, a] of usedFixtures) {
      const xgH = Math.max(0.3, avgLambda * strength[h].atk / strength[a].def * (1 + homeAdv));
      const xgA = Math.max(0.3, avgLambda * strength[a].atk / strength[h].def);
      const gh  = poissonRandom(xgH);
      const ga  = poissonRandom(xgA);
      gd[h] += gh - ga; gd[a] += ga - gh;
      gf[h] += gh;      gf[a] += ga;
      if (gh > ga)      { pts[h] += 3; }
      else if (gh < ga) { pts[a] += 3; }
      else              { pts[h]++; pts[a]++; }
    }

    // Rank teams
    const order = Array.from({length: n}, (_, i) => i)
      .sort((a, b) => pts[b] - pts[a] || gd[b] - gd[a] || gf[b] - gf[a]);

    order.forEach((ti, pos) => {
      pointsSum[ti] += pts[ti];
      posSum[ti]    += pos + 1;
      if (pos === 0)    titleCount[ti]++;
      if (pos < 4)      top4Count[ti]++;
      if (pos < 5)      top5Count[ti]++;
      if (pos >= n - 3) relegCount[ti]++;
    });
  }

  return teams.map((t, i) => ({
    ...t,
    simPts:    Math.round(pointsSum[i] / sims),
    simPos:    Math.round(posSum[i] / sims * 10) / 10,
    titlePct:  Math.round(titleCount[i] / sims * 100),
    top4Pct:   Math.round(top4Count[i] / sims * 100),
    top5Pct:   Math.round(top5Count[i] / sims * 100),
    relegPct:  Math.round(relegCount[i] / sims * 100),
  })).sort((a, b) => a.simPos - b.simPos);
}

// Animated probability bar
const ProbBar = ({ pct, color, bg = "rgba(255,255,255,0.05)" }) => (
  <div style={{ position: "relative", height: 4, borderRadius: 2, background: bg, overflow: "hidden", minWidth: 60 }}>
    <div style={{
      position: "absolute", left: 0, top: 0, height: "100%",
      width: `${Math.min(pct, 100)}%`,
      background: color,
      borderRadius: 2,
      transition: "width 0.6s cubic-bezier(.22,1,.36,1)",
    }}/>
  </div>
);

// Chance pill chip — iOS style
const ChancePill = ({ value, color, label }) => {
  const v = value || 0;
  const alpha = v > 50 ? 0.22 : v > 20 ? 0.14 : v > 5 ? 0.09 : 0.05;
  const textAlpha = v > 0 ? 1 : 0.3;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 54 }}>
      <div style={{
        padding: "4px 10px", borderRadius: 999,
        background: `${color}${Math.round(alpha * 255).toString(16).padStart(2,"0")}`,
        border: `1px solid ${color}${v > 5 ? "44" : "1a"}`,
        fontSize: 12, fontWeight: 900,
        color: v > 0 ? color : "rgba(255,255,255,0.2)",
        fontFamily: "'JetBrains Mono', monospace",
        opacity: textAlpha,
        minWidth: 46, textAlign: "center",
      }}>
        {v > 0 ? `${v}%` : "—"}
      </div>
      <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   SEASON SIMULATOR TAB — wired to getSeasonSimulation(league)
   API returns: { TeamName: { avg_position, title_prob, top4_prob, relegation_prob } }
   We merge with live standings for current pts/logo/played
══════════════════════════════════════════════════════════ */

// Zone config per league
const ZONE_CONFIG = {
  epl:    { ucl:4, uel:5, uecl:6, relStart:18, total:20, label:"Premier League" },
  laliga: { ucl:4, uel:5, uecl:null, relStart:18, total:20, label:"La Liga" },
  seriea: { ucl:4, uel:5, uecl:null, relStart:18, total:20, label:"Serie A" },
  bundesliga:{ ucl:4, uel:5, uecl:6, relStart:17, relPlay:16, total:18, label:"Bundesliga" },
  ligue1: { ucl:3, uel:4, uecl:null, relStart:17, total:18, label:"Ligue 1" },
};

function getZoneStyle(pos, cfg, T) {
  if (!cfg) return null;
  if (pos <= cfg.ucl)  return { color: T.accent,  label: "UCL",  border: `${T.accent}40` };
  if (pos === cfg.uel) return { color: T.mid,    label: "UEL",  border: `${T.mid}40` };
  if (cfg.uecl && pos === cfg.uecl) return { color: T.muted, label: "UECL", border: `${T.muted}40` };
  if (cfg.relPlay && pos === cfg.relPlay) return { color: "#f97316", label: "Play", border: "#f9731640" };
  if (pos >= cfg.relStart) return { color: T.accent2, label: "REL", border: `${T.accent2}40` };
  return null;
}

const SeasonSimulatorTab = ({ standings, standLoad, league, T }) => {
  const [simData, setSimData]   = useState(null);
  const [simLoad, setSimLoad]   = useState(true);
  const [simErr, setSimErr]     = useState(null);
  const [sortKey, setSortKey]   = useState("avg_position");
  const [sortDir, setSortDir]   = useState(1);
  const [hovered, setHovered]   = useState(null);

  const cfg = ZONE_CONFIG[league] || ZONE_CONFIG.epl;

  useEffect(() => {
    setSimLoad(true); setSimErr(null); setSimData(null);
    const cacheKey = "sim_v1_" + league;
    try {
      const r = sessionStorage.getItem(cacheKey);
      if (r) { const p = JSON.parse(r); if (Date.now() - p.ts < 1800000) { setSimData(p.data); setSimLoad(false); return; } }
    } catch {}
    getSeasonSimulation(league)
      .then(raw => {
        // raw = { "TeamName": { avg_position, title_prob, top4_prob, relegation_prob }, ... }
        const rows = Object.entries(raw).map(([name, d]) => ({
          team_name:      name,
          avg_position:   parseFloat(d.avg_position)   || 0,
          title_prob:     parseFloat(d.title_prob)     || 0,
          top4_prob:      parseFloat(d.top4_prob)      || 0,
          relegation_prob:parseFloat(d.relegation_prob)|| 0,
        }));
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ data: rows, ts: Date.now() })); } catch {}
        setSimData(rows);
      })
      .catch(e => setSimErr(e.message))
      .finally(() => setSimLoad(false));
  }, [league]);

  // Merge sim data with live standings for logos + current pts + played
  const merged = useMemo(() => {
    if (!simData) return [];
    return simData.map(row => {
      const live = standings.find(s =>
        s.team_name === row.team_name ||
        (s.team_name || "").toLowerCase().includes((row.team_name || "").toLowerCase().split(" ")[0]) ||
        (row.team_name || "").toLowerCase().includes((s.team_name || "").toLowerCase().split(" ")[0])
      );
      return { ...row, logo: live?.logo, currentPts: live?.points, played: live?.played };
    });
  }, [simData, standings]);

  const sorted = useMemo(() => {
    return [...merged].sort((a, b) => {
      const va = a[sortKey] ?? 0, vb = b[sortKey] ?? 0;
      return sortKey === "avg_position" ? (va - vb) * sortDir : (vb - va) * sortDir;
    });
  }, [merged, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => -d);
    else { setSortKey(key); setSortDir(1); }
  };

  const loading = simLoad || standLoad;

  // ── Legend zones
  const zones = [
    { color: T.accent,  label: "Champions League" },
    { color: T.mid,     label: "Europa League" },
    ...(cfg.uecl ? [{ color: T.muted, label: "Conference League" }] : []),
    ...(cfg.relPlay ? [{ color: "#f97316", label: "Relegation Play-off" }] : []),
    { color: T.accent2, label: "Relegation" },
  ];

  const SortBtn = ({ k, label }) => (
    <button onClick={() => toggleSort(k)} style={{
      padding: "5px 12px", borderRadius: 20, fontSize: 10, fontWeight: 700,
      cursor: "pointer", fontFamily: "'Inter',sans-serif",
      border: `1px solid ${sortKey === k ? T.accent : T.border}`,
      background: sortKey === k ? `${T.accent}18` : "transparent",
      color: sortKey === k ? T.accent : T.muted,
      transition: "all 0.13s", display: "flex", alignItems: "center", gap: 4,
    }}>
      {label}
      {sortKey === k && <span style={{ fontSize: 9 }}>{sortDir === 1 ? "↑" : "↓"}</span>}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header card */}
      <div style={{
        background: `linear-gradient(135deg, ${T.accent}14 0%, ${T.faint} 50%, ${T.panel} 100%)`,
        border: `1px solid ${T.borderHi}`,
        borderRadius: 20, padding: "20px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, boxShadow: `0 0 10px ${T.accent}` }}/>
            <span style={{ fontSize: 11, fontWeight: 900, color: T.accent, letterSpacing: "0.12em", fontFamily: "'Inter',sans-serif" }}>
              SEASON SIMULATOR
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: T.text, fontFamily: "'Sora',sans-serif", letterSpacing: "-0.02em" }}>
            {cfg.label} — Final Day Predictions
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 4, fontFamily: "'Inter',sans-serif" }}>
            Monte Carlo · 10,000 simulations · Poisson xG model · Updates each session
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {zones.map(z => (
            <div key={z.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 3, height: 14, borderRadius: 2, background: z.color }}/>
              <span style={{ fontSize: 9, color: T.muted, fontFamily: "'Inter',sans-serif" }}>{z.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sort controls */}
      {!loading && !simErr && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, color: T.muted, fontFamily: "'Inter',sans-serif" }}>Sort by:</span>
          <SortBtn k="avg_position"    label="Predicted Pos" />
          <SortBtn k="title_prob"      label="Title %" />
          <SortBtn k="top4_prob"       label="Top 4 %" />
          <SortBtn k="relegation_prob" label="Relegation %" />
          <span style={{ marginLeft: "auto", fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono',monospace" }}>
            {sorted.length} teams
          </span>
        </div>
      )}

      {/* ── Error */}
      {simErr && (
        <div style={{ padding: 24, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 10, opacity: .4 }}>⚠️</div>
          <div style={{ color: T.muted, fontSize: 13 }}>Could not load simulation data</div>
          <div style={{ color: T.accent2, fontSize: 11, marginTop: 6, fontFamily: "'JetBrains Mono',monospace" }}>{simErr}</div>
        </div>
      )}

      {/* ── Loading skeletons */}
      {loading && !simErr && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              height: 72, borderRadius: 14,
              background: `linear-gradient(90deg, ${T.panel} 25%, ${T.faint} 50%, ${T.panel} 75%)`,
              backgroundSize: "200% 100%",
              animation: "shimmer 1.4s infinite",
              opacity: 1 - i * 0.08,
              border: `1px solid ${T.border}`,
            }}/>
          ))}
          <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
        </div>
      )}

      {/* ── Team rows */}
      {!loading && !simErr && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sorted.map((row, i) => {
            const pos     = Math.round(row.avg_position) || i + 1;
            const zone    = getZoneStyle(pos, cfg, T);
            const titleP  = Math.round(row.title_prob * 100);
            const top4P   = Math.round(row.top4_prob * 100);
            const relegP  = Math.round(row.relegation_prob * 100);
            const isHov   = hovered === row.team_name;

            return (
              <div
                key={row.team_name}
                onMouseEnter={() => setHovered(row.team_name)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr 80px 80px 80px 80px",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 14,
                  background: isHov ? `${T.accent}0a` : T.panel,
                  border: `1px solid ${isHov ? T.borderHi : T.border}`,
                  transition: "all 0.15s",
                }}
              >
                {/* Pos + zone bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {zone && <div style={{ width: 3, height: 32, borderRadius: 2, background: zone.color, flexShrink: 0 }}/>}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: zone ? zone.color : T.muted, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>
                      {pos}
                    </div>
                    {zone && (
                      <div style={{ fontSize: 7, fontWeight: 800, color: zone.color, letterSpacing: "0.06em", marginTop: 2 }}>
                        {zone.label}
                      </div>
                    )}
                  </div>
                </div>

                {/* Team name + logo + current pts */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  {row.logo
                    ? <img src={row.logo} alt="" style={{ width: 28, height: 28, objectFit: "contain", flexShrink: 0 }} onError={e => e.currentTarget.style.display = "none"}/>
                    : <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${T.accent}18`, flexShrink: 0, border: `1px solid ${T.border}` }}/>
                  }
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: T.text, fontFamily: "'Sora',sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.team_name}
                    </div>
                    {row.currentPts != null && (
                      <div style={{ fontSize: 10, color: T.muted, fontFamily: "'JetBrains Mono',monospace", marginTop: 1 }}>
                        {row.currentPts} pts · {row.played} played
                      </div>
                    )}
                  </div>
                </div>

                {/* Avg final position */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: T.text, fontFamily: "'JetBrains Mono',monospace" }}>
                    {row.avg_position.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 8, color: T.muted, marginTop: 2 }}>Avg Pos</div>
                  <ProbBar pct={(cfg.total - row.avg_position) / cfg.total * 100} color={T.accent} />
                </div>

                {/* Title % */}
                <div style={{ textAlign: "center" }}>
                  <ChancePill value={titleP} color={T.accent} label="Title" />
                </div>

                {/* Top 4 % */}
                <div style={{ textAlign: "center" }}>
                  <ChancePill value={top4P} color={T.mid || T.accent} label="Top 4" />
                </div>

                {/* Relegation % */}
                <div style={{ textAlign: "center" }}>
                  <ChancePill value={relegP} color={relegP > 30 ? T.accent2 : relegP > 10 ? "#f97316" : T.muted} label="Rel %" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer note */}
      {!loading && !simErr && (
        <div style={{ padding: "12px 16px", borderRadius: 10, background: T.faint, border: `1px solid ${T.border}`, display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>🔬</span>
          <span style={{ fontSize: 10, color: T.muted, lineHeight: 1.6, fontFamily: "'Inter',sans-serif" }}>
            Probabilities generated via Monte Carlo simulation (10,000 runs) using Poisson goal models calibrated on current season xG and historical attack/defense ratings. Percentages reflect frequency across all simulated season outcomes — not guaranteed predictions.
          </span>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function PredictionsPage({league:propLeague,slugMap}){
  const{league:paramLeague}=useParams();
  const navigate=useNavigate();
  const raw=paramLeague||propLeague||"premier-league";
  const DEFAULTS={"premier-league":"epl","la-liga":"laliga","bundesliga":"bundesliga","serie-a":"seriea","ligue-1":"ligue1","epl":"epl","laliga":"laliga","bundesliga":"bundesliga","seriea":"seriea","ligue1":"ligue1"};
  const league=(slugMap||DEFAULTS)[raw]||raw;
  const T=THEMES[league]||THEMES.epl;

  const[tab,setTab]=useState("predictions");
  const[standings,setStandings]=useState([]);const[matches,setMatches]=useState([]);
  const[standLoad,setStandLoad]=useState(true);const[predLoad,setPredLoad]=useState(true);
  const[predErr,setPredErr]=useState(null);const[standErr,setStandErr]=useState(null);
  const[sort,setSort]=useState("confidence");const[selectedMatch,setSelectedMatch]=useState(null);

  const cache=useCallback((key,fn,setter,setLoading,setErr)=>{
    setLoading(true);setErr&&setErr(null);
    try{const r=sessionStorage.getItem(key);if(r){const p=JSON.parse(r);if(Date.now()-p.ts<3600000){setter(p.data);setLoading(false);return;}}}catch{}
    fn().then(json=>{const d=json.standings||json.predictions||json.data||json||[];const arr=Array.isArray(d)?d:[];setter(arr);try{sessionStorage.setItem(key,JSON.stringify({data:arr,ts:Date.now()}));}catch{}}).catch(e=>setErr&&setErr(e.message)).finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{
    cache("stn_v6_"+league,()=>getStandings(league),setStandings,setStandLoad,setStandErr);
    cache("pred_v6_"+league,()=>getLeaguePredictions(league),setMatches,setPredLoad,setPredErr);
    setSelectedMatch(null);
  },[league,cache]);

  const sorted=useMemo(()=>{if(!matches.length)return matches;return[...matches].sort((a,b)=>{if(sort==="confidence")return(b.confidence||0)-(a.confidence||0);if(sort==="date")return(a.date||"").localeCompare(b.date||"");if(sort==="home")return(b.p_home_win||0)-(a.p_home_win||0);return 0;});},[matches,sort]);

  const homeWins=matches.filter(m=>m.p_home_win>m.p_away_win&&m.p_home_win>m.p_draw).length;
  const draws=matches.filter(m=>m.p_draw>=m.p_home_win&&m.p_draw>=m.p_away_win).length;
  const avgConf=matches.length?Math.round(matches.reduce((s,m)=>s+(m.confidence||0),0)/matches.length):0;
  const bttsCount=matches.filter(m=>(m.btts||0)>=0.55).length;
  const avgXgH=matches.length?(matches.reduce((s,m)=>s+(parseFloat(m.xg_home)||0),0)/matches.length).toFixed(2):"0.00";
  const avgXgA=matches.length?(matches.reduce((s,m)=>s+(parseFloat(m.xg_away)||0),0)/matches.length).toFixed(2):"0.00";

  return(
    <div style={{minHeight:"100vh",background:T.bg,position:"relative"}}>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,background:T.grad}}/>
      <div style={{position:"relative",zIndex:1,maxWidth:1400,margin:"0 auto",padding:"0 20px 48px"}}>

        {/* HEADER */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:14,padding:"24px 0 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:4,height:52,borderRadius:4,background:T.accent,boxShadow:`0 0 16px ${T.accent}88`,flexShrink:0}}/>
            <div>
              <h1 style={{fontSize:28,fontWeight:900,color:T.text,margin:"0 0 4px",letterSpacing:"-0.02em",fontFamily:"'Sora',sans-serif",display:"flex",alignItems:"center",gap:10}}>
                <LeagueFlag code={league} size={24}/>{T.label}
              </h1>
              <p style={{fontSize:12,color:T.muted,margin:0,fontWeight:600,fontFamily:"'Inter',sans-serif"}}>Elo · Dixon-Coles · Real xG · Pro data</p>
            </div>
          </div>
          <nav style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {LEAGUE_TABS.map(({code,slug,label})=>{const active=league===code;const LT=THEMES[code];return(
              <NavLink key={code} to={`/predictions/${slug}`} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 14px",borderRadius:999,fontSize:11,fontWeight:800,textDecoration:"none",whiteSpace:"nowrap",border:`1.5px solid ${active?LT.accent:T.border}`,color:active?LT.accent:T.muted,background:active?`${LT.accent}12`:"transparent",transition:"all 0.15s"}}>
                <LeagueFlag code={code} size={15}/>{label}
              </NavLink>
            );})}
          </nav>
        </div>

        {/* TABS */}
        <div style={{display:"flex",borderBottom:`1px solid ${T.border}`,marginBottom:24,overflowX:"auto"}}>
          {[
            ["predictions","Predictions",!predLoad?matches.length:null],
            ["standings","Table",!standLoad?standings.length:null],
            ["scorers","Scorers",null],
            ["simulator","Season Sim",null],
          ].map(([key,label,badge])=>(
            <button key={key} onClick={()=>setTab(key)} style={{display:"flex",alignItems:"center",gap:7,padding:"12px 18px",fontSize:12,fontWeight:800,cursor:"pointer",background:"none",border:"none",fontFamily:"'Inter',sans-serif",letterSpacing:".04em",whiteSpace:"nowrap",color:tab===key?T.accent:T.muted,borderBottom:`2px solid ${tab===key?T.accent:"transparent"}`,transition:"all 0.15s"}}>
              {key==="simulator"&&<span style={{fontSize:11}}>🔬</span>}
              {label}
              {badge!=null&&<span style={{background:tab===key?`${T.accent}18`:"rgba(255,255,255,0.04)",color:tab===key?T.accent:T.muted,borderRadius:999,padding:"1px 7px",fontSize:10}}>{badge}</span>}
            </button>
          ))}
        </div>

        {/* PREDICTIONS TAB */}
        {tab==="predictions"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 290px",gap:20,alignItems:"start"}}>
            <div>
              {/* Sort bar */}
              {!predLoad&&!predErr&&matches.length>0&&(
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                  <span style={{fontSize:10,color:T.muted}}>Sort:</span>
                  {[["confidence","Confidence"],["date","Date"],["home","Home %"]].map(([s,l])=>(
                    <button key={s} onClick={()=>setSort(s)} style={{padding:"5px 12px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",border:`1px solid ${sort===s?T.accent:T.border}`,background:sort===s?`${T.accent}18`:"transparent",color:sort===s?T.accent:T.muted,transition:"all 0.13s"}}>{l}</button>
                  ))}
                  <span style={{marginLeft:"auto",fontSize:10,color:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>{matches.length} fixtures</span>
                </div>
              )}
              {predErr&&<div style={{padding:20,background:T.panel,border:`1px solid ${T.border}`,borderRadius:12,color:T.muted,fontSize:13}}>Error: {predErr}</div>}
              {predLoad&&<div style={{display:"flex",flexDirection:"column",gap:8}}>{Array.from({length:4}).map((_,i)=><div key={i} style={{height:160,borderRadius:16,background:T.panel,border:`1px solid ${T.border}`,opacity:1-i*.15}}/>)}</div>}
              {!predLoad&&!predErr&&matches.length===0&&<div style={{padding:40,textAlign:"center",color:T.muted,fontSize:14}}>No upcoming fixtures found.</div>}
              {/* 2-col grid */}
              {!predLoad&&!predErr&&(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(520px,1fr))",gap:12}}>
                  {sorted.map((m,i)=><MatchCard key={(m.home_team||"")+(m.away_team||"")+i} match={m} T={T} onSelect={()=>setSelectedMatch(m)} isSelected={selectedMatch===m} navigate={navigate}/>)}
                </div>
              )}
            </div>
            {/* Floating simulator */}
            <div style={{position:"sticky",top:24}}>
              <ScenarioSimulator match={selectedMatch||sorted[0]} T={T}/>
            </div>
          </div>
        )}

        {tab==="standings"&&(
          <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
            {standErr?<div style={{padding:20,color:T.muted}}>Error: {standErr}</div>:<StandingsTable rows={standings} loading={standLoad} T={T}/>}
          </div>
        )}

        {tab==="scorers"&&<ScorersWidget league={league} T={T}/>}

        {tab==="simulator"&&(
          <SeasonSimulatorTab standings={standings} standLoad={standLoad} league={league} T={T}/>
        )}
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px}
        input[type=range]{height:3px;border-radius:2px}
      `}</style>
    </div>
  );
}