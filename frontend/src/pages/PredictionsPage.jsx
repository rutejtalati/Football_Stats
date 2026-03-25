// PredictionsPage.jsx  StatinSite v6
// VS Split Cards  League Themes  Floating Simulator  Key Players  Charts
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, NavLink, useNavigate } from "react-router-dom";
import {
  getStandings, getLeaguePredictions, getTopScorers, getTopAssists,
  getLeagueInjuries, getH2H, getFixtureOdds, getSeasonSimulation,
} from "../api/api";

/* ----------------------------------------------------------
   NEOBRUTALIST THEME  #e8ff47 yellow · #0a0a0a black · #ff2744 red
   Fonts: Bebas Neue (display) · Space Grotesk (body) · DM Mono (mono)
---------------------------------------------------------- */
const NB = {
  y:"#ffffff",   // white — primary text/accent
  k:"#0a0a0a",   // near-black background
  r:"#e2e8e4",   // off-white — secondary accent
  w:"#f5f5f5",   // light
};

const UNIFIED = {
  bg: NB.k,
  grad: "none",
  accent:  NB.y,
  accent2: NB.r,
  mid:     NB.k,
  panel:   NB.k,
  border:  `rgba(255,255,255,0.12)`,
  borderHi:`rgba(255,255,255,0.4)`,
  text:    NB.y,
  muted:   `rgba(255,255,255,0.45)`,
  faint:   `rgba(255,255,255,0.04)`,
  homeCol: NB.y,
  awayCol: NB.r,
  label:   "",
};

/* -- Responsive hook --------------------------------------- */
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w;
}

const LEAGUE_LABELS = {
  epl:"Premier League", laliga:"La Liga", bundesliga:"Bundesliga",
  seriea:"Serie A", ligue1:"Ligue 1",
  ucl:"Champions League", uel:"Europa League",
  uecl:"Conference League", facup:"FA Cup",
};

// Competition accent colours
const COMP_COLORS = {
  epl:"#60a5fa", laliga:"#f97316", bundesliga:"#f59e0b",
  seriea:"#e2e8e4", ligue1:"#a78bfa",
  ucl:"#1e40af",    // deep UCL blue
  uel:"#f97316",    // Europa orange
  uecl:"#16a34a",   // Conference green
  facup:"#dc2626",  // FA Cup red
};

// Competition theme overrides — all share the same NB base, different accents
const COMP_THEMES = {
  ucl:  {...UNIFIED, accent:NB.y,  accent2:"#dddddd", awayCol:"#dddddd", label:"Champions League"},
  uel:  {...UNIFIED, accent:NB.y,  accent2:"#cccccc", awayCol:"#cccccc", label:"Europa League"},
  uecl: {...UNIFIED, accent:NB.y,  accent2:"#cccccc", awayCol:"#cccccc", label:"Conference League"},
  facup:{...UNIFIED, accent:NB.y,  accent2:NB.r,      awayCol:NB.r,      label:"FA Cup"},
};

const THEMES = {
  ...Object.fromEntries(Object.entries(LEAGUE_LABELS).map(([code,label])=>[code,{...UNIFIED,label}])),
  ...COMP_THEMES,
};

const LEAGUE_TABS = [
  // Domestic
  {code:"epl",        slug:"premier-league",    label:"Premier League", group:"domestic"},
  {code:"laliga",     slug:"la-liga",           label:"La Liga",        group:"domestic"},
  {code:"bundesliga", slug:"bundesliga",        label:"Bundesliga",     group:"domestic"},
  {code:"seriea",     slug:"serie-a",           label:"Serie A",        group:"domestic"},
  {code:"ligue1",     slug:"ligue-1",           label:"Ligue 1",        group:"domestic"},
  // European
  {code:"ucl",        slug:"champions-league",  label:"UCL",            group:"european", hasKnockout:true},
  {code:"uel",        slug:"europa-league",     label:"UEL",            group:"european", hasKnockout:true},
  {code:"uecl",       slug:"conference-league", label:"UECL",           group:"european", hasKnockout:true},
  // Cup
  {code:"facup",      slug:"fa-cup",            label:"FA Cup",         group:"cup",      hasKnockout:true},
];

/* ----------------------------------------------------------
   TASK 3  KEY PLAYERS DATA
---------------------------------------------------------- */
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
  "PSG":             [{name:"Mbapp",pos:"CF",stat:"0.78 xG/90"},{name:"Dembl",pos:"RW",stat:"0.42 xA/90"},{name:"Donnarumma",pos:"GK",stat:"+0.18 PSxG"}],
  "Monaco":          [{name:"Embolo",pos:"ST",stat:"0.44 xG/90"},{name:"Golovin",pos:"AM",stat:"0.22 xA/90"},{name:"Majecki",pos:"GK",stat:"+0.10 PSxG"}],
  "Inter Milan":     [{name:"Lautaro",pos:"ST",stat:"0.62 xG/90"},{name:"Calhanoglu",pos:"CM",stat:"0.30 xA/90"},{name:"Sommer",pos:"GK",stat:"+0.16 PSxG"}],
  "AC Milan":        [{name:"Leao",pos:"LW",stat:"0.48 xG/90"},{name:"Reijnders",pos:"CM",stat:"0.28 xA/90"},{name:"Maignan",pos:"GK",stat:"+0.21 PSxG"}],
  "Juventus":        [{name:"Vlahovic",pos:"ST",stat:"0.55 xG/90"},{name:"Chiesa",pos:"LW",stat:"0.31 xA/90"},{name:"Szczesny",pos:"GK",stat:"+0.14 PSxG"}],
};
function getKeyPlayers(name) {
  if(!name)return[];
  if(KP[name])return KP[name];
  const k=Object.keys(KP).find(k=>name.toLowerCase().includes(k.toLowerCase().split(" ")[0])||k.toLowerCase().includes(name.toLowerCase().split(" ")[0]));
  return k?KP[k]:[{name:name.split(" ").pop()+" #9",pos:"ST",stat:""},{name:name.split(" ").pop()+" #8",pos:"CM",stat:""},{name:name.split(" ").pop()+" #1",pos:"GK",stat:""}];
}

/* --- Helpers ---------------------------------------------- */
function fmtDate(raw) {
  if(!raw||raw==="TBD")return{day:"TBD",date:"",time:""};
  const d=new Date(raw.replace("T"," ").split(" ")[0]+"T12:00:00");
  return{day:d.toLocaleDateString("en-GB",{weekday:"short"}),date:d.toLocaleDateString("en-GB",{day:"numeric",month:"short"}),time:raw.includes("T")?raw.split("T")[1]?.slice(0,5)||"":""};
}
function parseForm(raw){if(Array.isArray(raw))return raw.filter(c=>"WDL".includes(c));return String(raw||"").split("").filter(c=>"WDL".includes(c));}
function poisson(lam,k){let r=Math.exp(-lam);for(let i=0;i<k;i++)r*=lam/(i+1);return r;}
function buildProbs(xgH,xgA){let pH=0,pD=0,pA=0,topScore="1-0",topP=0;for(let h=0;h<=7;h++)for(let a=0;a<=7;a++){const p=poisson(xgH,h)*poisson(xgA,a);if(h>a)pH+=p;else if(h===a)pD+=p;else pA+=p;if(p>topP){topP=p;topScore=`${h}-${a}`;}}const tot=pH+pD+pA||1;return{pH:pH/tot,pD:pD/tot,pA:pA/tot,topScore};}

/* --- League Flag ------------------------------------------ */
const LeagueFlag=({code,size=18})=>{const h=Math.round(size*.72);if(code==="epl")return<svg width={size} height={h} viewBox="0 0 18 13" fill="none"><rect width="18" height="13" fill="#012169"/><path d="M0 0L18 13M18 0L0 13" stroke="#fff" strokeWidth="2.6"/><path d="M0 0L18 13M18 0L0 13" stroke="#C8102E" strokeWidth="1.6"/><path d="M9 0V13M0 6.5H18" stroke="#fff" strokeWidth="4.3"/><path d="M9 0V13M0 6.5H18" stroke="#C8102E" strokeWidth="2.6"/></svg>;if(code==="laliga")return<svg width={size} height={h} viewBox="0 0 18 13" fill="none"><rect width="18" height="3" fill="#c60b1e"/><rect y="3" width="18" height="7" fill="#ffc400"/><rect y="10" width="18" height="3" fill="#c60b1e"/></svg>;if(code==="bundesliga")return<svg width={size} height={h} viewBox="0 0 18 13" fill="none"><rect width="18" height="4.3" fill="#000"/><rect y="4.3" width="18" height="4.3" fill="#DD0000"/><rect y="8.6" width="18" height="4.4" fill="#FFCE00"/></svg>;if(code==="seriea")return<svg width={size} height={h} viewBox="0 0 18 13" fill="none"><rect width="6" height="13" fill="#009246"/><rect x="6" width="6" height="13" fill="#fff"/><rect x="12" width="6" height="13" fill="#ce2b37"/></svg>;if(code==="ligue1")return<svg width={size} height={h} viewBox="0 0 18 13" fill="none"><rect width="6" height="13" fill="#002395"/><rect x="6" width="6" height="13" fill="#fff"/><rect x="12" width="6" height="13" fill="#ED2939"/></svg>;return null;};

/* --- iOS Form Pip ----------------------------------------- */
const FormPip=({r,T})=>{
  const s={
    W:{bg:`${NB.y}18`,c:NB.y,b:NB.y,shadow:"none"},
    D:{bg:"rgba(255,255,255,0.06)",c:`rgba(255,255,255,.5)`,b:"rgba(255,255,255,.3)",shadow:"none"},
    L:{bg:`${NB.r}18`,c:NB.r,b:NB.r,shadow:"none"},
  }[r]||{bg:"rgba(255,255,255,.06)",c:NB.y,b:"rgba(255,255,255,.2)",shadow:"none"};
  return(
    <span style={{
      display:"inline-flex",alignItems:"center",justifyContent:"center",
      width:22,height:22,fontSize:11,fontWeight:900,
      fontFamily:"'Inter',sans-serif",
      background:s.bg,color:s.c,border:`2px solid ${s.b}`,
      letterSpacing:"0.02em",
    }}>{r}</span>
  );
};

/* --- iOS Mini Donut --------------------------------------- */
const MiniDonut=({value,max=3,color,size=56,label})=>{
  const pct=Math.min(value/max,1),r=20,circ=2*Math.PI*r,dash=pct*circ,gap=circ-dash;
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
      <div style={{position:"relative",width:size,height:size}}>
        <svg width={size} height={size} viewBox="0 0 52 52">
          <circle cx="26" cy="26" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4.5"/>
          <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="4.5"
            strokeDasharray={`${dash} ${gap}`} strokeLinecap="round"
            transform="rotate(-90 26 26)" opacity=".9"
            style={{filter:`drop-shadow(0 0 4px ${color}60)`}}/>
          <text x="26" y="30" fontSize="10.5" fontWeight="700" fill={color}
            textAnchor="middle" fontFamily="'DM Mono',monospace">
            {typeof value==="number"?value.toFixed(1):value}
          </text>
        </svg>
      </div>
      <span style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.55)",letterSpacing:"0.04em",textTransform:"uppercase",fontFamily:"'Inter',sans-serif"}}>{label}</span>
    </div>
  );
};

/* --- iOS Mini Radar --------------------------------------- */
const MiniRadar=({vals,color,size=60})=>{
  const n=vals.length,cx=size/2,cy=size/2,r=size*.38;
  const pts=vals.map((v,i)=>{const a=(i/n)*Math.PI*2-Math.PI/2;return[cx+Math.cos(a)*r*v,cy+Math.sin(a)*r*v];});
  const poly=pts.map(([x,y])=>`${x},${y}`).join(" ");
  return(
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[.33,.66,1].map((g,i)=><polygon key={i} points={Array.from({length:n}).map((_,j)=>{const a=(j/n)*Math.PI*2-Math.PI/2;return`${cx+Math.cos(a)*r*g},${cy+Math.sin(a)*r*g}`;}).join(" ")} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth=".7"/>)}
      {Array.from({length:n}).map((_,i)=>{const a=(i/n)*Math.PI*2-Math.PI/2;return<line key={i} x1={cx} y1={cy} x2={cx+Math.cos(a)*r} y2={cy+Math.sin(a)*r} stroke="rgba(255,255,255,0.05)" strokeWidth=".6"/>;  })}
      <polygon points={poly} fill={color} fillOpacity=".15" stroke={color} strokeWidth="1.5" strokeOpacity=".9" style={{filter:`drop-shadow(0 0 3px ${color}50)`}}/>
      {pts.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2.5" fill={color} opacity=".95"/>)}
    </svg>
  );
};

/* --- iOS Versus Bar --------------------------------------- */
const VersusBar=({label,hv,av,T,fmtFn})=>{
  const hNull=hv==null||hv===false,aNull=av==null||av===false;
  const h=hNull?0:parseFloat(hv)||0,a=aNull?0:parseFloat(av)||0;
  const tot=h+a||1,hp=h/tot*100,ap=a/tot*100;
  const fmt=fmtFn||(v=>v!=null?typeof v==="number"?v.toFixed(1):v:"");
  const noData=hNull&&aNull;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:900,color:hNull?`rgba(255,255,255,.5)`:NB.y,fontFamily:"'Inter',sans-serif",letterSpacing:".02em"}}>{hNull?"":fmt(h)}</span>
        <span style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.55)",letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:"'Inter',sans-serif"}}>{label}</span>
        <span style={{fontSize:13,fontWeight:900,color:aNull?`rgba(255,255,255,.5)`:NB.r,fontFamily:"'Inter',sans-serif",letterSpacing:".02em"}}>{aNull?"":fmt(a)}</span>
      </div>
      <div style={{display:"flex",height:5,overflow:"hidden",background:"rgba(255,255,255,.06)"}}>
        {noData
          ? <div style={{flex:1,background:"rgba(255,255,255,.08)"}}/>
          : <>
              <div style={{flex:hp,background:NB.y,transition:"flex 0.4s ease"}}/>
              <div style={{flex:ap,background:NB.r,transition:"flex 0.4s ease"}}/>
            </>
        }
      </div>
    </div>
  );
};

/* --- iOS Score Grid --------------------------------------- */
const ScoreGrid=({topScores,T})=>{
  if(!topScores?.length)return<div style={{padding:20,textAlign:"center",color:"rgba(255,255,255,.65)",fontSize:12,fontFamily:"'Inter',sans-serif"}}>No score data</div>;
  const G=5,pm={};let mx=0;
  topScores.forEach(({score,prob})=>{const[hg,ag]=score.split("-").map(Number);if(hg<G&&ag<G){pm[`${hg}-${ag}`]=prob;if(prob>mx)mx=prob;}});
  return(
    <div>
      <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.55)",letterSpacing:"0.06em",marginBottom:12,fontFamily:"'Inter',sans-serif",textTransform:"uppercase"}}>SCORE MATRIX  Home ↓ Away →</div>
      <div style={{display:"grid",gridTemplateColumns:"20px repeat(5,1fr)",gap:3}}>
        <div/>
        {[0,1,2,3,4].map(ag=><div key={ag} style={{textAlign:"center",fontSize:10,fontWeight:700,color:"rgba(255,255,255,.6)",fontFamily:"'Inter',sans-serif"}}>{ag}</div>)}
        {[0,1,2,3,4].map(hg=>[
          <div key={"r"+hg} style={{display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"rgba(255,255,255,.6)",fontFamily:"'Inter',sans-serif"}}>{hg}</div>,
          ...[0,1,2,3,4].map(ag=>{
            const p=pm[`${hg}-${ag}`]||0,pct=Math.round(p*100),isTop=p===mx&&mx>0;
            const alpha=mx>0?Math.min(p/mx,1):0;
            return(
              <div key={`${hg}-${ag}`} style={{
                aspectRatio:"1",minHeight:30,display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:900,
                background:isTop?NB.y:`rgba(255,255,255,${(alpha*.12+.02).toFixed(2)})`,
                color:isTop?NB.k:`rgba(255,255,255,${(alpha*.7+.2).toFixed(2)})`,
                fontFamily:"'Inter',sans-serif",
                border:isTop?`2px solid ${NB.y}`:`1px solid rgba(255,255,255,.08)`,
                boxShadow:isTop?`2px 2px 0 rgba(255,255,255,.3)`:"none",
              }} title={`${hg}-${ag}: ${(p*100).toFixed(1)}%`}>{pct>0?`${pct}%`:""}</div>
            );
          })
        ])}
      </div>
    </div>
  );
};

/* --- iOS H2H Widget --------------------------------------- */
const H2HWidget=({homeId,awayId,homeTeam,awayTeam,T})=>{
  const[data,setData]=useState(null);const[loading,setLoading]=useState(true);
  useEffect(()=>{if(!homeId||!awayId){setLoading(false);return;}getH2H(homeId,awayId,8).then(d=>{setData(d);setLoading(false);}).catch(()=>setLoading(false));},[homeId,awayId]);
  if(loading)return<div style={{height:100,background:"rgba(255,255,255,.05)",border:`2px solid rgba(255,255,255,.1)`,animation:"nbPulse 1.5s ease infinite"}}/>;
  if(!data?.results?.length)return<div style={{padding:20,textAlign:"center",color:"rgba(255,255,255,.4)",fontSize:12,fontFamily:"'Inter',sans-serif"}}>No H2H data available</div>;
  const res=data.results;let hw=0,dw=0,aw=0;
  res.forEach(r=>{const isHome=r.home_team===homeTeam;if(r.home_goals>r.away_goals){if(isHome)hw++;else aw++;}else if(r.home_goals===r.away_goals)dw++;else{if(isHome)aw++;else hw++;}});
  const tot=hw+dw+aw||1;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Summary pills */}
      <div style={{display:"flex",gap:8}}>
        {[{label:(homeTeam||"").split(" ").slice(-1)[0],val:hw,col:NB.y},{label:"Draw",val:dw,col:`rgba(255,255,255,.4)`},{label:(awayTeam||"").split(" ").slice(-1)[0],val:aw,col:NB.r}].map(({label,val,col})=>(
          <div key={label} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"12px 8px",background:"rgba(255,255,255,.05)",border:`2px solid rgba(255,255,255,.15)`}}>
            <span style={{fontSize:28,fontWeight:900,color:col,fontFamily:"'Inter',sans-serif",lineHeight:1,letterSpacing:"-.02em"}}>{val}</span>
            <span style={{fontSize:10,color:"rgba(255,255,255,.55)",fontFamily:"'Inter',sans-serif",letterSpacing:"0.04em",textTransform:"uppercase"}}>{label.slice(0,8)}</span>
            <span style={{fontSize:11,fontWeight:700,color:col,fontFamily:"'Inter',sans-serif"}}>{Math.round(val/tot*100)}%</span>
          </div>
        ))}
      </div>
      {/* Bar */}
      <div style={{display:"flex",height:6,overflow:"hidden",background:"rgba(255,255,255,.05)"}}>
        <div style={{flex:hw,background:NB.y,transition:"flex 0.5s ease"}}/>
        <div style={{flex:dw,background:"rgba(255,255,255,.2)"}}/>
        <div style={{flex:aw,background:NB.r,transition:"flex 0.5s ease"}}/>
      </div>
      {/* Recent results */}
      <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:200,overflowY:"auto"}}>
        {res.slice(0,6).map((r,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"rgba(255,255,255,.03)",border:`1px solid rgba(255,255,255,.08)`}}>
            <span style={{fontSize:11,color:"rgba(255,255,255,.35)",minWidth:70,fontFamily:"'Inter',sans-serif"}}>{r.date}</span>
            <span style={{flex:1,fontSize:11,fontWeight:700,color:`rgba(255,255,255,.6)`,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Inter',sans-serif"}}>{r.home_team}</span>
            <span style={{padding:"3px 10px",background:"#ffffff",fontSize:12,fontWeight:900,color:"#0a0a0a",fontFamily:"'Inter',sans-serif",minWidth:44,textAlign:"center",letterSpacing:".05em"}}>{r.home_goals}–{r.away_goals}</span>
            <span style={{flex:1,fontSize:11,fontWeight:700,color:`rgba(255,255,255,.6)`,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Inter',sans-serif"}}>{r.away_team}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* --- iOS Odds Widget -------------------------------------- */
const OddsWidget=({fixtureId,pHome,pDraw,pAway,homeTeam,awayTeam,T})=>{
  const[odds,setOdds]=useState(null);
  useEffect(()=>{if(fixtureId)getFixtureOdds(fixtureId).then(setOdds).catch(()=>{});},[fixtureId]);
  if(!odds?.bookmakers?.length)return<div style={{padding:20,textAlign:"center",color:"rgba(255,255,255,.4)",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"'Inter',sans-serif"}}><div style={{width:12,height:12,border:`2px solid rgba(255,255,255,.2)`,borderTopColor:NB.y,animation:"spin 0.8s linear infinite"}}/> Loading odds</div>;
  const bk=odds.bookmakers[0],mw=bk.bets?.["Match Winner"]||{};
  const imp=odd=>odd?Math.round(1/parseFloat(odd)*100):0;
  const outcomes=[
    {label:(homeTeam||"").split(" ").slice(-1)[0].slice(0,9),odd:mw["Home"],model:Math.round((pHome||0)*100)},
    {label:"Draw",odd:mw["Draw"],model:Math.round((pDraw||0)*100)},
    {label:(awayTeam||"").split(" ").slice(-1)[0].slice(0,9),odd:mw["Away"],model:Math.round((pAway||0)*100)},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",gap:8}}>
        {outcomes.map(({label,odd,model})=>{
          const implied=imp(odd),diff=implied?model-implied:0,hasEdge=Math.abs(diff)>=3;
          return(
            <div key={label} style={{flex:1,display:"flex",flexDirection:"column",gap:6,alignItems:"center",padding:"14px 8px",background:hasEdge&&diff>0?`rgba(255,255,255,.08)`:"rgba(255,255,255,.03)",border:`2px solid ${hasEdge&&diff>0?NB.y:"rgba(255,255,255,.12)"}`,transition:"all 0.2s",boxShadow:hasEdge&&diff>0?"0 0 0 1px rgba(255,255,255,0.5)":"none"}}>
              <span style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.55)",fontFamily:"'Inter',sans-serif",letterSpacing:"0.04em",textTransform:"uppercase"}}>{label}</span>
              <span style={{fontSize:26,fontWeight:900,color:"#ffffff",fontFamily:"'Inter',sans-serif",lineHeight:1,letterSpacing:"-.02em"}}>{odd||""}</span>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                <span style={{fontSize:10,color:"rgba(255,255,255,.5)",fontFamily:"'Inter',sans-serif"}}>Implied {implied}%</span>
                <span style={{fontSize:11,fontWeight:700,color:"#e2e8f0",fontFamily:"'Inter',sans-serif"}}>Model {model}%</span>
              </div>
              {hasEdge&&<span style={{fontSize:11,fontWeight:900,color:diff>0?NB.k:NB.r,background:diff>0?NB.y:"transparent",border:diff>0?"none":`2px solid ${NB.r}`,padding:"2px 8px",fontFamily:"'Inter',sans-serif",letterSpacing:".06em"}}>{diff>0?"+":""}{diff}% edge</span>}
            </div>
          );
        })}
      </div>
      <div style={{fontSize:10,color:"rgba(255,255,255,.3)",textAlign:"center",fontFamily:"'Inter',sans-serif",letterSpacing:".1em"}}>{bk.name}</div>
    </div>
  );
};

/* ----------------------------------------------------------
   iOS MATCH CARD  frosted glass, big rounded corners,
   clean VS split, smooth probability bars
---------------------------------------------------------- */

// ─── Sidebar match row ────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════
// KNOCKOUT BRACKET VISUALISER
// Works for UCL / UEL / UECL / FA Cup
// ══════════════════════════════════════════════════════════════════

const BRACKET_ROUNDS = {
  ucl:   ["Play-Offs","R16","QF","SF","Final"],
  uel:   ["Play-Offs","R16","QF","SF","Final"],
  uecl:  ["Play-Offs","R16","QF","SF","Final"],
  facup: ["R5","QF","SF","Final"],
};

// Seeded mock bracket data — in production this comes from /api/predictions/:league
// structured as { rounds: [{name, ties:[{home,away,home_prob,agg}]}] }
function buildMockBracket(league) {
  const teams = {
    ucl:  ["Arsenal","PSG","Bayern","Real Madrid","Inter","Man City","Atletico","Benfica",
            "Barcelona","Dortmund","Liverpool","Porto","Leverkusen","AC Milan","Juventus","Ajax"],
    uel:  ["Man United","Roma","Lazio","Fiorentina","Sevilla","Lyon","Ajax","Anderlecht",
            "Villarreal","Betis","Frankfurt","Lens","Braga","Fenerbahce","AZ","PSV"],
    uecl: ["Chelsea","Fiorentina","Gent","Legia","Shamrock","Villarreal","Maccabi","Panathinaikos",
            "Partizan","Rapid","Slavia","Basaksehir","AZ","Breidablik","Molde","Nordsjælland"],
    facup:["Arsenal","Chelsea","Man City","Tottenham","Liverpool","Man United","Newcastle","West Ham"],
  }[league] || [];

  const rounds = BRACKET_ROUNDS[league] || [];
  let current = [...teams];
  return rounds.map((name, ri) => {
    const ties = [];
    for (let i = 0; i < current.length; i += 2) {
      const home = current[i] || "TBD";
      const away = current[i+1] || "TBD";
      const hp = 40 + Math.floor(Math.random()*20);
      const winner = Math.random() > 0.5 ? home : away;
      ties.push({ home, away, home_prob: hp, away_prob: 100-hp, winner: ri < rounds.length-1 ? winner : null });
    }
    current = ties.map(t => t.winner || "TBD");
    return { name, ties };
  });
}

function BracketTie({ tie, isLast, accent, roundIdx }) {
  const [hov, setHov] = useState(false);
  const homeWin = tie.home_prob > tie.away_prob;
  const diff = Math.abs(tie.home_prob - tie.away_prob);
  const confidence = diff > 20 ? "Clear" : diff > 10 ? "Likely" : "50/50";
  const confColor = diff > 20 ? "#cccccc" : diff > 10 ? NB.y : `rgba(255,255,255,.4)`;

  return (
    <div
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        border:`2px solid ${hov?NB.y:"rgba(255,255,255,.2)"}`,
        background: hov ? NB.y : NB.k,
        overflow:"hidden",
        transition:"all 0.12s ease",
        boxShadow: hov ? `4px 4px 0 rgba(255,255,255,.3)` : "none",
        transform: hov ? "translate(-2px,-2px)" : "none",
        cursor:"default",
        minWidth:160,
      }}
    >
      {/* Home */}
      <div style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"8px 10px",
        borderBottom:`1px solid ${hov?"rgba(0,0,0,.1)":"rgba(255,255,255,.08)"}`,
        background: tie.winner===tie.home ? (hov?"rgba(0,0,0,.08)":"rgba(255,255,255,.06)") : "transparent",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
          {tie.winner===tie.home && <div style={{width:4,height:4,background:"#ffffff",flexShrink:0}}/>}
          <span style={{fontSize:12,fontWeight:tie.winner===tie.home?900:600,color:hov?NB.k:"#ffffff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Inter',sans-serif",transition:"color 0.12s"}}>{tie.home}</span>
        </div>
        <span style={{fontSize:12,fontWeight:900,color:homeWin?(hov?NB.k:NB.y):(hov?"rgba(0,0,0,.5)":"rgba(255,255,255,.4)"),fontFamily:"'Inter',sans-serif",flexShrink:0,marginLeft:6,letterSpacing:".02em",transition:"color 0.12s"}}>{tie.home_prob}%</span>
      </div>
      {/* Away */}
      <div style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"8px 10px",
        background: tie.winner===tie.away ? (hov?"rgba(0,0,0,.08)":"rgba(255,255,255,.06)") : "transparent",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
          {tie.winner===tie.away && <div style={{width:4,height:4,background:"rgba(255,255,255,0.6)",flexShrink:0}}/>}
          <span style={{fontSize:12,fontWeight:tie.winner===tie.away?900:600,color:hov?NB.k:"#ffffff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Inter',sans-serif",transition:"color 0.12s"}}>{tie.away}</span>
        </div>
        <span style={{fontSize:12,fontWeight:900,color:!homeWin?(hov?NB.k:NB.r):(hov?"rgba(0,0,0,.5)":"rgba(255,255,255,.4)"),fontFamily:"'Inter',sans-serif",flexShrink:0,marginLeft:6,letterSpacing:".02em",transition:"color 0.12s"}}>{tie.away_prob}%</span>
      </div>
      {/* Prob bar */}
      <div style={{display:"flex",height:3}}>
        <div style={{flex:tie.home_prob,background:hov?NB.k:NB.y,transition:"flex 0.5s ease"}}/>
        <div style={{flex:tie.away_prob,background:hov?"rgba(0,0,0,.15)":"rgba(255,255,255,.08)"}}/>
      </div>
      {/* Confidence badge */}
      <div style={{padding:"3px 10px",display:"flex",justifyContent:"flex-end"}}>
        <span style={{fontSize:10,fontWeight:900,color:hov?NB.k:confColor,letterSpacing:"0.1em",fontFamily:"'Inter',sans-serif",textTransform:"uppercase",transition:"color 0.12s"}}>{confidence}</span>
      </div>
    </div>
  );
}

function KnockoutBracketTab({league, T}) {
  const accent = COMP_COLORS[league] || T.accent;
  const rounds = useMemo(()=>buildMockBracket(league),[league]);
  const isMobile = useWindowWidth() < 768;

  // Render the final separately as the trophy card
  const regularRounds = rounds.slice(0,-1);
  const finalRound    = rounds[rounds.length-1];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20,paddingTop:16}}>
      {/* Header */}
      <div style={{
        padding:"18px 22px",
        background:"rgba(10,10,10,0.95)",
        border:`3px solid ${NB.y}`,
        boxShadow:`5px 5px 0 rgba(255,255,255,.2)`,
        display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,
      }}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <div style={{width:8,height:8,background:NB.r,animation:"nbBlink 1.1s step-start infinite"}}/>
            <span style={{fontSize:10,fontWeight:900,color:"rgba(255,255,255,.65)",letterSpacing:"0.18em",textTransform:"uppercase",fontFamily:"'Inter',sans-serif"}}>KNOCKOUT BRACKET</span>
          </div>
          <div style={{fontSize:28,fontWeight:900,color:NB.y,fontFamily:"'Inter',sans-serif",letterSpacing:".02em"}}>
            {LEAGUE_LABELS[league] || league.toUpperCase()}
          </div>
          <div style={{fontSize:10,color:"rgba(255,255,255,.4)",marginTop:2,fontFamily:"'Inter',sans-serif",letterSpacing:".08em"}}>
            Model win probabilities · Poisson + ELO
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {(BRACKET_ROUNDS[league]||[]).map((r,i)=>(
            <div key={r} style={{
              padding:"4px 12px",
              background:i===rounds.length-1?"#ffffff":"transparent",
              border:`1px solid ${i===rounds.length-1?"#ffffff":"rgba(255,255,255,.2)"}`,
              fontSize:11,fontWeight:700,color:i===rounds.length-1?"#0a0a0a":"rgba(255,255,255,0.7)",
              letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'Inter',sans-serif",
            }}>{r}</div>
          ))}
        </div>
      </div>

      {/* Bracket grid */}
      <div style={{overflowX:"auto",paddingBottom:8}}>
        <div style={{
          display:"flex",gap:12,alignItems:"flex-start",
          minWidth: isMobile ? `${regularRounds.length * 200}px` : "auto",
        }}>
          {regularRounds.map((round, ri) => (
            <div key={round.name} style={{flex:1,minWidth:160,display:"flex",flexDirection:"column",gap:0}}>
              <div style={{
                fontSize:10,fontWeight:900,letterSpacing:"0.16em",
                color:"rgba(255,255,255,.65)",textTransform:"uppercase",
                marginBottom:10,textAlign:"center",fontFamily:"'Inter',sans-serif",
                paddingBottom:8,borderBottom:`2px solid rgba(255,255,255,.15)`,
              }}>
                {round.name}
                <span style={{marginLeft:6,fontSize:10,fontWeight:700,color:"rgba(255,255,255,.3)"}}>
                  {round.ties.length} ties
                </span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap: ri===0 ? 8 : 8 + (ri * 16)}}>
                {round.ties.map((tie,ti)=>(
                  <div key={ti} style={{display:"flex",flexDirection:"column",alignItems:"stretch"}}>
                    <BracketTie tie={tie} accent={NB.y} roundIdx={ri}/>
                    {ti % 2 === 0 && ri < regularRounds.length - 1 && (
                      <div style={{height: 8 + ri * 8,borderRight:`1px dashed rgba(255,255,255,.2)`,marginLeft:"auto",width:"50%"}}/>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Final */}
          {finalRound && (
            <div style={{minWidth:180,display:"flex",flexDirection:"column",gap:0}}>
              <div style={{fontSize:10,fontWeight:900,letterSpacing:"0.16em",color:NB.y,textTransform:"uppercase",marginBottom:10,textAlign:"center",fontFamily:"'Inter',sans-serif",paddingBottom:8,borderBottom:`2px solid rgba(255,255,255,.3)`}}>
                {finalRound.name}
              </div>
              <div style={{border:`3px solid ${NB.y}`,background:"rgba(10,10,10,0.95)",boxShadow:`4px 4px 0 rgba(255,255,255,.2)`}}>
                <div style={{padding:"14px 16px 10px",display:"flex",flexDirection:"column",alignItems:"center",gap:4,borderBottom:`2px solid rgba(255,255,255,.15)`}}>
                  <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
                    <path d="M14 2l2.5 5 5.5.8-4 3.9 1 5.5L14 15.3l-5 2.9 1-5.5L6 8.8l5.5-.8L14 2z" stroke={NB.y} strokeWidth="1.5" strokeLinejoin="round" fill="rgba(255,255,255,0.15)"/>
                    <path d="M9 23h10M11 23v3M17 23v3" stroke={NB.y} strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  <span style={{fontSize:10,fontWeight:900,color:"rgba(255,255,255,.65)",letterSpacing:"0.14em",fontFamily:"'Inter',sans-serif"}}>THE FINAL</span>
                </div>
                {finalRound.ties.map((tie,ti)=>(
                  <div key={ti}>
                    {[{name:tie.home,prob:tie.home_prob},{name:tie.away,prob:tie.away_prob}].map(({name,prob},si)=>(
                      <div key={si} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderBottom:si===0?`1px solid rgba(255,255,255,.1)`:"none"}}>
                        <span style={{fontSize:12,fontWeight:700,color:NB.y,fontFamily:"'Inter',sans-serif"}}>{name}</span>
                        <span style={{fontSize:16,fontWeight:900,color:NB.y,fontFamily:"'Inter',sans-serif",letterSpacing:".02em"}}>{prob}%</span>
                      </div>
                    ))}
                    <div style={{display:"flex",height:4}}>
                      <div style={{flex:tie.home_prob,background:NB.y}}/>
                      <div style={{flex:tie.away_prob,background:"rgba(255,255,255,.1)"}}/>
                    </div>
                    <div style={{padding:"10px 14px",textAlign:"center"}}>
                      <div style={{fontSize:10,fontWeight:900,color:"rgba(255,255,255,.4)",marginBottom:4,fontFamily:"'Inter',sans-serif",letterSpacing:".12em",textTransform:"uppercase"}}>Predicted Winner</div>
                      <div style={{fontSize:20,fontWeight:900,color:NB.y,fontFamily:"'Inter',sans-serif",letterSpacing:".02em"}}>
                        {tie.home_prob > tie.away_prob ? tie.home : tie.away}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* UEFA format note */}
      {(league==="ucl"||league==="uel"||league==="uecl")&&(
        <div style={{padding:"12px 16px",background:`rgba(255,255,255,.04)`,border:`2px solid rgba(255,255,255,.15)`,fontSize:10,color:`rgba(255,255,255,.6)`,lineHeight:1.7,fontFamily:"'Inter',sans-serif"}}>
          <span style={{color:NB.y,fontWeight:900,fontFamily:"'Inter',sans-serif"}}>NEW FORMAT: </span>
          36-team league phase · Top 8 advance directly to R16 · Places 9–24 enter knockout play-offs · Places 25–36 eliminated.
        </div>
      )}

      <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:11,color:"rgba(255,255,255,.4)",padding:"10px 14px",background:"rgba(255,255,255,.03)",border:`1px solid rgba(255,255,255,.08)`,fontFamily:"'Inter',sans-serif",letterSpacing:".06em"}}>
        {[{c:NB.y,l:"Win probability"},{c:"#cccccc",l:"Clear favourite"},{c:NB.y,l:"Likely"},{c:`rgba(255,255,255,.4)`,l:"50/50"}].map(({c,l})=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:8,height:8,background:c}}/>
            <span>{l}</span>
          </div>
        ))}
        <span style={{marginLeft:"auto",fontStyle:"italic"}}>Probabilities from Poisson + ELO model</span>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════
// DASHBOARD PREDICTIONS UI — replaces the old MatchCard grid
// Inspired by the reference dashboard screenshot
// ══════════════════════════════════════════════════════════════════

// ─── Animated ring gauge (like the donut in reference image) ──────
function RingGauge({value, size=64, color, label, sublabel}) {
  const r = (size/2) - 7;
  const circ = 2*Math.PI*r;
  const dash  = (value/100)*circ;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
      <div style={{position:"relative",width:size,height:size}}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={r}
            fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={5}/>
          <circle cx={size/2} cy={size/2} r={r}
            fill="none" stroke={color} strokeWidth={5}
            strokeDasharray={`${dash} ${circ-dash}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{filter:`drop-shadow(0 0 5px ${color}80)`,transition:"stroke-dasharray 0.8s ease"}}/>
          <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
            fontSize={size>56?13:11} fontWeight={800} fill={color}
            fontFamily="'DM Mono',monospace">{value}%</text>
        </svg>
      </div>
      {label && <span style={{fontSize:11,fontWeight:700,color:NB.y,textTransform:"uppercase",letterSpacing:"0.07em",textAlign:"center"}}>{label}</span>}
      {sublabel && <span style={{fontSize:10,color:`rgba(255,255,255,.6)`}}>{sublabel}</span>}
    </div>
  );
}

// ─── Animated horizontal bar ─────────────────────────────────────
function AnimBar({pct, color, height=6, delay=0}) {
  const [w,setW] = useState(0);
  useEffect(()=>{const t=setTimeout(()=>setW(pct),50+delay);return()=>clearTimeout(t);},[pct,delay]);
  return (
    <div style={{height,borderRadius:999,background:"rgba(255,255,255,.05)",overflow:"hidden",position:"relative"}}>
      <div style={{
        position:"absolute",left:0,top:0,height:"100%",
        width:`${w}%`,
        background:`linear-gradient(90deg,${color}99,${color})`,
        borderRadius:999,
        boxShadow:`0 0 8px ${color}50`,
        transition:`width 0.8s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}/>
    </div>
  );
}

// ─── Mini spark line ─────────────────────────────────────────────
function SparkLine({values, color, width=80, height=28}) {
  if(!values||values.length<2) return null;
  const max=Math.max(...values,1), min=Math.min(...values,0);
  const range=max-min||1;
  const pts=values.map((v,i)=>{
    const x=(i/(values.length-1))*(width-4)+2;
    const y=height-2-((v-min)/range)*(height-4);
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{display:"block"}}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.8}/>
      {/* last dot */}
      <circle cx={pts[pts.length-1]?.split(",")[0]} cy={pts[pts.length-1]?.split(",")[1]} r={2.5} fill={color} opacity={0.9}/>
    </svg>
  );
}

// ─── Dashboard stat tile (top row KPI cards) ─────────────────────
function KPITile({label, value, delta, color, icon, sublabel, spark}) {
  const posChange = delta>0;
  return (
    <div style={{
      padding:"16px 18px",
      background:"rgba(10,10,10,0.92)",
      border:"1px solid rgba(255,255,255,0.15)",
      borderRight:"none",
      borderBottom:"none",
      boxShadow:"inset 0 1px 0 rgba(255,255,255,0.04)",
      backdropFilter:"blur(12px)",
      display:"flex",flexDirection:"column",gap:8,
      position:"relative",overflow:"hidden",
      transition:"transform 0.1s, box-shadow 0.1s",
      cursor:"default",
    }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translate(-2px,-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(255,255,255,.06)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 4px 12px rgba(255,255,255,.03)";}}
    >
      {/* Corner deco number */}
      <div style={{position:"absolute",top:-8,right:6,fontFamily:"'Inter',sans-serif",fontSize:64,fontWeight:900,color:"rgba(255,255,255,.03)",lineHeight:1,pointerEvents:"none",userSelect:"none"}}>{value}</div>
      {/* Icon + delta row */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{
          width:32,height:32,
          background:"rgba(255,255,255,0.12)",
          border:"1px solid rgba(255,255,255,0.3)",
          borderRadius:8,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:14,color:"#ffffff",
        }}>{icon}</div>
        {delta!=null&&(
          <span style={{
            fontSize:11,fontWeight:800,
            color:posChange?"#0a0a0a":"rgba(255,255,255,0.6)",
            background:posChange?"#ffffff":"transparent",
            border:posChange?"none":"1px solid rgba(255,255,255,0.3)",
            padding:"2px 7px",fontFamily:"'Inter',sans-serif",letterSpacing:"0.06em",
          }}>
            {posChange?"+":""}{delta}%
          </span>
        )}
      </div>
      {/* Value */}
      <div>
        <div style={{fontSize:30,fontWeight:900,color:"#ffffff",fontFamily:"'Inter',sans-serif",lineHeight:1,letterSpacing:"-.03em"}}>{value}</div>
        <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.6)",textTransform:"uppercase",letterSpacing:"0.08em",marginTop:4,fontFamily:"'Inter',sans-serif"}}>{label}</div>
        {sublabel&&<div style={{fontSize:10,color:"rgba(255,255,255,.5)",marginTop:2,fontFamily:"'Inter',sans-serif"}}>{sublabel}</div>}
      </div>
      {spark&&<SparkLine values={spark} color={NB.y}/>}
    </div>
  );
}

// ─── Prediction row — new VS split card design ───────────────────
function PredRow({match, T, onSelect, isSelected, navigate, index}) {
  const [open,setOpen]   = useState(false);
  const [hov,setHov]     = useState(false);
  const [tab2,setTab2]   = useState("stats");
  const [visible,setVisible] = useState(false);
  useEffect(()=>{const t=setTimeout(()=>setVisible(true),index*40);return()=>clearTimeout(t);},[index]);

  const hp  = match.p_home_win||0;
  const dp  = match.p_draw||0;
  const ap  = match.p_away_win||0;
  const tot = hp+dp+ap||1;
  const hPct= Math.round(hp/tot*100);
  const dPct= Math.round(dp/tot*100);
  const aPct= Math.round(ap/tot*100);
  const xgH = parseFloat(match.xg_home)||0;
  const xgA = parseFloat(match.xg_away)||0;
  const btts= Math.round((match.btts>1?match.btts:match.btts*100)||0);
  const o25 = Math.round((match.over_2_5>1?match.over_2_5:match.over_2_5*100)||0);
  const conf= Math.round(match.confidence||0);
  const fav = hPct>aPct+8?"home":aPct>hPct+8?"away":null;
  const {day,time} = fmtDate(match.date);
  const hForm = (Array.isArray(match.home_form)?match.home_form:String(match.home_form||"").split("").filter(c=>"WDL".includes(c))).slice(-5);
  const aForm = (Array.isArray(match.away_form)?match.away_form:String(match.away_form||"").split("").filter(c=>"WDL".includes(c))).slice(-5);
  const fc = r=>r==="W"?"#e2e8e4":r==="D"?"#f59e0b":"#f87171";

  // Predicted scoreline from Poisson
  const {topScore} = buildProbs(xgH||1.2, xgA||1.0);

  // Outcome colour for left border
  const outCol = fav==="home"?"#ffffff":fav==="away"?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.15)";

  const LogoBadge = ({src,size=52})=>(
    <div style={{
      width:size,height:size,
      background:hov?"rgba(255,255,255,.1)":"rgba(255,255,255,.05)",
      border:`1px solid ${hov?"rgba(255,255,255,.35)":"rgba(255,255,255,.08)"}`,
      borderRadius:10,
      display:"flex",alignItems:"center",justifyContent:"center",
      flexShrink:0,padding:6,
      boxShadow:hov?`0 4px 16px rgba(255,255,255,.2)`:"0 2px 8px rgba(0,0,0,.3)",
      transition:"all 0.15s ease",
    }}>
      {src
        ? <img src={src} style={{width:size-14,height:size-14,objectFit:"contain",filter:"drop-shadow(0 1px 3px rgba(0,0,0,.4))"}} onError={e=>e.currentTarget.style.opacity="0"}/>
        : <div style={{width:size-16,height:size-16,background:"rgba(255,255,255,.12)",borderRadius:6}}/>
      }
    </div>
  );

  const FormPips = ({form})=>(
    <div style={{display:"flex",gap:3,marginTop:4}}>
      {form.map((r,i)=>(
        <div key={i} style={{width:17,height:17,borderRadius:4,background:`${fc(r)}18`,border:`1.5px solid ${fc(r)}80`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:fc(r),fontFamily:"'Inter',sans-serif"}}>{r}</div>
      ))}
    </div>
  );

  return (
    <div style={{opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(8px)",transition:"opacity 0.35s ease, transform 0.35s ease"}}>

      {/* ── COLLAPSED CARD ─────────────────────── */}
      <div
        onMouseEnter={()=>setHov(true)}
        onMouseLeave={()=>setHov(false)}
        style={{
          overflow:"hidden",
          background:hov?NB.y:NB.k,
          border:`3px solid ${isSelected?NB.r:NB.y}`,
          borderLeft:`6px solid ${outCol}`,
          boxShadow:hov?`5px 5px 0 ${NB.y}`:isSelected?`4px 4px 0 ${NB.r}`:`3px 3px 0 rgba(255,255,255,.15)`,
          transition:"all 0.12s ease",
          cursor:"pointer",
          transform:hov?"translate(-2px,-2px)":"none",
        }}
        onClick={()=>onSelect&&onSelect()}
      >
        {/* ── MAIN ROW ─────────────────────────── */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr auto":"1fr 1px auto 1px 1fr auto",alignItems:"center"}}>

          {/* HOME SIDE */}
          <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12,minWidth:0}}>
            <LogoBadge src={match.home_logo}/>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontSize:14,fontWeight:fav==="home"?900:700,color:hov?NB.k:"#ffffff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Inter',sans-serif",transition:"color 0.12s"}}>
                {match.home_team}
                {fav==="home"&&<span style={{marginLeft:6,fontSize:10,fontWeight:900,color:"#0a0a0a",background:"#ffffff",padding:"2px 6px",fontFamily:"'Inter',sans-serif",letterSpacing:".08em"}}>FAV</span>}
              </div>
              <FormPips form={hForm}/>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:22,fontWeight:900,color:hov?NB.k:"#ffffff",fontFamily:"'Inter',sans-serif",lineHeight:1,letterSpacing:"-.02em",transition:"color 0.12s"}}>{hPct}%</div>
              {xgH>0&&<div style={{fontSize:11,color:hov?"rgba(0,0,0,.6)":"rgba(255,255,255,.65)",marginTop:3,fontFamily:"'Inter',sans-serif",fontSize:10,transition:"color 0.12s"}}>xG {xgH.toFixed(1)}</div>}
            </div>
          </div>

          {/* CENTRE DIVIDER */}
          <div style={{width:1,background:hov?"rgba(255,255,255,.2)":"rgba(255,255,255,.08)",alignSelf:"stretch",transition:"background 0.12s"}}/>

          {/* CENTRE SCORE + BAR */}
          <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",alignItems:"center",gap:6,minWidth:140}}>
            <div style={{fontSize:20,fontWeight:900,color:hov?NB.k:"#ffffff",fontFamily:"'Inter',sans-serif",letterSpacing:"0.02em",transition:"color 0.12s"}}>{topScore}</div>
            {/* Three-segment bar — hard edges, no radius */}
            <div style={{display:"flex",height:6,overflow:"hidden",gap:2,width:"100%"}}>
              <div style={{flex:hPct,background:hov?NB.k:NB.y,minWidth:8}}/>
              <div style={{flex:dPct,background:hov?"rgba(255,255,255,.15)":"rgba(255,255,255,.18)",minWidth:4}}/>
              <div style={{flex:aPct,background:NB.r,minWidth:8}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",width:"100%",fontSize:11,fontFamily:"'Inter',sans-serif",fontWeight:700}}>
              <span style={{color:hov?NB.k:"#e2e8f0",transition:"color 0.12s"}}>{hPct}%</span>
              <span style={{color:hov?"rgba(0,0,0,.5)":"rgba(255,255,255,.5)"}}>D {dPct}%</span>
              <span style={{color:NB.r}}>{aPct}%</span>
            </div>
            <div style={{fontSize:10,color:hov?"rgba(0,0,0,.5)":"rgba(255,255,255,.55)",fontFamily:"'Inter',sans-serif",letterSpacing:"0.01em",transition:"color 0.12s"}}>{day} {time}</div>
          </div>

          {/* CENTRE DIVIDER */}
          <div style={{width:1,background:hov?"rgba(255,255,255,.2)":"rgba(255,255,255,.08)",alignSelf:"stretch",transition:"background 0.12s"}}/>

          {/* AWAY SIDE */}
          <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12,minWidth:0,justifyContent:"flex-end"}}>
            <div style={{textAlign:"left",flexShrink:0}}>
              <div style={{fontSize:22,fontWeight:900,color:NB.r,fontFamily:"'Inter',sans-serif",lineHeight:1,letterSpacing:"-.02em"}}>{aPct}%</div>
              {xgA>0&&<div style={{fontSize:11,color:hov?"rgba(0,0,0,.6)":"rgba(255,255,255,.65)",marginTop:3,fontFamily:"'Inter',sans-serif",fontSize:10,transition:"color 0.12s"}}>xG {xgA.toFixed(1)}</div>}
            </div>
            <div style={{minWidth:0,flex:1,textAlign:"right"}}>
              <div style={{fontSize:14,fontWeight:fav==="away"?900:700,color:hov?NB.k:"#ffffff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Inter',sans-serif",transition:"color 0.12s"}}>
                {fav==="away"&&<span style={{marginRight:6,fontSize:10,fontWeight:900,color:"#0a0a0a",background:"rgba(255,255,255,0.85)",padding:"2px 6px",fontFamily:"'Inter',sans-serif",letterSpacing:".08em"}}>FAV</span>}
                {match.away_team}
              </div>
              <div style={{display:"flex",gap:3,marginTop:4,justifyContent:"flex-end"}}>
                {aForm.map((r,i)=>(
                  <div key={i} style={{width:17,height:17,borderRadius:4,background:`${fc(r)}18`,border:`1.5px solid ${fc(r)}80`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:fc(r)}}>{r}</div>
                ))}
              </div>
            </div>
            <LogoBadge src={match.away_logo}/>
          </div>

          {/* EXPAND BUTTON */}
          <button
            onClick={e=>{e.stopPropagation();setOpen(o=>!o);}}
            style={{
              padding:"0 14px",alignSelf:"stretch",display:"flex",alignItems:"center",justifyContent:"center",
              background:open?NB.y:"transparent",
              border:"none",borderLeft:"1px solid rgba(255,255,255,0.12)",
              cursor:"pointer",gap:5,minWidth:80,flexDirection:"column",
              transition:"background 0.12s",
            }}
          >
            <span style={{fontSize:10,fontWeight:700,color:open?NB.k:"#e2e8f0",letterSpacing:"0.04em",whiteSpace:"nowrap",fontFamily:"'Inter',sans-serif",textTransform:"uppercase"}}>{open?"Hide":"See why"}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{transition:"transform 0.2s",transform:open?"rotate(180deg)":"rotate(0)"}}>
              <path d="M2 3.5l3 3 3-3" stroke={open?NB.k:NB.y} strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── EXPANDED PANEL ────────────────────── */}
        {open&&(
          <div style={{borderTop:`3px solid ${NB.y}`}} onClick={e=>e.stopPropagation()}>
            {/* Sub-tab bar */}
            <div style={{display:"flex",background:"rgba(10,10,10,0.95)",borderBottom:`2px solid rgba(255,255,255,.2)`,overflowX:"auto"}}>
              {[["stats","Team Stats"],["scorelines","Scorelines"],["markets","Markets"],["h2h","H2H"]].map(([id,lbl])=>(
                <button key={id} onClick={()=>setTab2(id)} style={{
                  padding:"9px 16px",fontSize:11,fontWeight:800,cursor:"pointer",
                  background:tab2===id?NB.y:"transparent",border:"none",letterSpacing:"0.12em",textTransform:"uppercase",
                  color:tab2===id?NB.k:NB.y,
                  borderRight:`1px solid rgba(255,255,255,.1)`,
                  whiteSpace:"nowrap",transition:"all 0.12s",
                  fontFamily:"'Inter',sans-serif",
                }}>{lbl}</button>
              ))}
            </div>

            <div style={{padding:16,background:NB.k}}>

              {/* STATS TAB */}
              {tab2==="stats"&&(
                <div>
                  {/* Reasoning insight */}
                  {(xgH>0||xgA>0)&&(
                    <div style={{background:"rgba(255,255,255,.06)",borderLeft:`4px solid ${NB.y}`,padding:"9px 12px",marginBottom:14,fontSize:12,color:`rgba(255,255,255,.8)`,lineHeight:1.5,fontFamily:"'Inter',sans-serif"}}>
                      {fav==="home"
                        ? `${match.home_team?.split(" ").slice(-1)[0]} favoured — xG edge ${xgH.toFixed(2)} vs ${xgA.toFixed(2)}. Model gives ${hPct}% win probability.`
                        : fav==="away"
                        ? `${match.away_team?.split(" ").slice(-1)[0]} favoured away — xG ${xgH.toFixed(2)} vs ${xgA.toFixed(2)}. Model gives ${aPct}% win probability.`
                        : `Even contest — xG split ${xgH.toFixed(2)} vs ${xgA.toFixed(2)}. Draw probability ${dPct}% is significant.`
                      }
                    </div>
                  )}
                  {/* Side-by-side stats */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1px 1fr",gap:0}}>
                    {/* Home */}
                    <div style={{paddingRight:16,display:"flex",flexDirection:"column",gap:12}}>
                      <div style={{fontSize:11,fontWeight:900,color:NB.y,marginBottom:2,fontFamily:"'Inter',sans-serif",letterSpacing:".05em"}}>{match.home_team}</div>
                      {[
                        {label:"xG",val:xgH.toFixed(2),pct:Math.min(xgH/3,1)*100,col:NB.y},
                        {label:"Win prob",val:`${hPct}%`,pct:hPct,col:NB.y},
                        {label:"Form",val:null,form:hForm},
                      ].map(({label,val,pct,col,form},i)=>(
                        <div key={i}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                            <span style={{fontSize:10,color:"rgba(255,255,255,.65)",textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:"'Inter',sans-serif"}}>{label}</span>
                            {val&&<span style={{fontSize:14,fontWeight:900,color:col,fontFamily:"'Inter',sans-serif",letterSpacing:".02em"}}>{val}</span>}
                          </div>
                          {pct!=null&&<div style={{height:4,background:"rgba(255,255,255,.08)",overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:col}}/></div>}
                          {form&&<div style={{display:"flex",gap:3}}>{form.map((r,i)=><div key={i} style={{width:20,height:20,borderRadius:5,background:`${fc(r)}18`,border:`1px solid ${fc(r)}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:fc(r)}}>{r}</div>)}</div>}
                        </div>
                      ))}
                    </div>
                    {/* Divider */}
                    <div style={{width:3,background:`rgba(255,255,255,.15)`,margin:"0 0"}}/>
                    {/* Away */}
                    <div style={{paddingLeft:16,display:"flex",flexDirection:"column",gap:12}}>
                      <div style={{fontSize:11,fontWeight:900,color:NB.r,marginBottom:2,textAlign:"right",fontFamily:"'Inter',sans-serif",letterSpacing:".05em"}}>{match.away_team}</div>
                      {[
                        {label:"xG",val:xgA.toFixed(2),pct:Math.min(xgA/3,1)*100,col:NB.r},
                        {label:"Win prob",val:`${aPct}%`,pct:aPct,col:NB.r},
                        {label:"Form",val:null,form:aForm},
                      ].map(({label,val,pct,col,form},i)=>(
                        <div key={i}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                            {val&&<span style={{fontSize:14,fontWeight:900,color:col,fontFamily:"'Inter',sans-serif",letterSpacing:".02em"}}>{val}</span>}
                            <span style={{fontSize:10,color:"rgba(255,255,255,.65)",textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:"'Inter',sans-serif"}}>{label}</span>
                          </div>
                          {pct!=null&&<div style={{height:4,background:"rgba(255,255,255,.08)",overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:col,marginLeft:"auto"}}/></div>}
                          {form&&<div style={{display:"flex",gap:3,justifyContent:"flex-end"}}>{form.map((r,i)=><div key={i} style={{width:20,height:20,borderRadius:5,background:`${fc(r)}18`,border:`1px solid ${fc(r)}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:fc(r)}}>{r}</div>)}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SCORELINES TAB */}
              {tab2==="scorelines"&&(
                <div>
                  <ScoreGrid topScores={match.top_scorelines||[]} T={T}/>
                </div>
              )}

              {/* MARKETS TAB */}
              {tab2==="markets"&&(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {[
                    {label:"Both Teams to Score",val:btts,col:"#cccccc",hot:btts>=55},
                    {label:"Over 2.5 Goals",val:o25,col:NB.y,hot:o25>=60},
                    {label:"Home Win",val:hPct,col:NB.y,hot:hPct>=60},
                    {label:"Draw",val:dPct,col:`rgba(255,255,255,.5)`,hot:dPct>=32},
                    {label:"Away Win",val:aPct,col:NB.r,hot:aPct>=60},
                  ].map(({label,val,col,hot})=>(
                    <div key={label} style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:11,color:`rgba(255,255,255,.7)`,flex:1,fontFamily:"'Inter',sans-serif"}}>{label}</span>
                      <div style={{flex:2,height:5,background:"rgba(255,255,255,.07)",overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${val}%`,background:col,opacity:hot?1:0.5}}/>
                      </div>
                      <span style={{fontSize:13,fontWeight:900,color:hot?col:`rgba(255,255,255,.5)`,fontFamily:"'Inter',sans-serif",minWidth:36,textAlign:"right",letterSpacing:".02em"}}>{val}%</span>
                      {hot&&<span style={{fontSize:10,fontWeight:900,color:NB.k,background:col,padding:"2px 7px",letterSpacing:"0.08em",fontFamily:"'Inter',sans-serif"}}>HOT</span>}
                    </div>
                  ))}
                  {conf>0&&<div style={{marginTop:4,padding:"8px 12px",background:"rgba(255,255,255,.05)",border:`2px solid rgba(255,255,255,.2)`,fontSize:11,color:NB.y,fontFamily:"'Inter',sans-serif"}}>Model confidence: <span style={{color:conf>=65?"#cccccc":conf>=45?NB.y:NB.r,fontWeight:900,fontFamily:"'Inter',sans-serif",fontSize:16,letterSpacing:".02em"}}>{conf}%</span></div>}
                </div>
              )}

              {/* H2H TAB */}
              {tab2==="h2h"&&(
                <H2HWidget homeId={match.home_team_id} awayId={match.away_team_id} homeTeam={match.home_team} awayTeam={match.away_team} T={T}/>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function SidebarMatchRow({match,T,navigate,showEdge,showXg}){
  const [hov,setHov]=useState(false);
  const hp=match.p_home_win||0,ap=match.p_away_win||0;
  const conf=Math.round(match.confidence||0);
  const confC=conf>=72?"#cccccc":conf>=52?NB.y:NB.r;
  return(
    <div
      onClick={()=>navigate(`/match/${match.fixture_id}`)}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        padding:"8px 10px",cursor:"pointer",
        background:hov?NB.y:NB.k,
        border:`2px solid ${hov?NB.y:"rgba(255,255,255,.2)"}`,
        borderLeft:`4px solid ${hov?NB.k:NB.y}`,
        transition:"all 0.12s",
        transform:hov?"translate(-2px,-2px)":"none",
        boxShadow:hov?`3px 3px 0 rgba(255,255,255,.3)`:"none",
      }}
    >
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
        <span style={{fontSize:11,fontWeight:700,color:hov?NB.k:NB.y,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,fontFamily:"'Inter',sans-serif",transition:"color 0.12s"}}>
          {match.home_team?.split(" ").pop()} vs {match.away_team?.split(" ").pop()}
        </span>
        {showEdge&&match.model_edge!=null&&(
          <span style={{fontSize:11,fontWeight:900,color:match.model_edge>0?NB.y:NB.r,marginLeft:6,flexShrink:0,fontFamily:"'Inter',sans-serif"}}>
            {match.model_edge>0?"+":""}{match.model_edge}%
          </span>
        )}
        {showXg&&(
          <span style={{fontSize:11,fontWeight:700,color:"#cccccc",marginLeft:6,flexShrink:0,fontFamily:"'Inter',sans-serif"}}>
            xG {(parseFloat(match.xg_home)||0).toFixed(1)}+{(parseFloat(match.xg_away)||0).toFixed(1)}
          </span>
        )}
        {!showEdge&&!showXg&&(
          <span style={{fontSize:11,fontWeight:900,color:hov?NB.k:confC,marginLeft:6,flexShrink:0,fontFamily:"'Inter',sans-serif",transition:"color 0.12s"}}>{conf}%</span>
        )}
      </div>
      <div style={{display:"flex",height:3,overflow:"hidden",background:`rgba(255,255,255,.08)`}}>
        <div style={{flex:Math.round(hp*100),background:hov?NB.k:NB.y}}/>
        <div style={{flex:Math.round((match.p_draw||0)*100),background:"rgba(255,255,255,.2)"}}/>
        <div style={{flex:Math.round(ap*100),background:NB.r}}/>
      </div>
    </div>
  );
}

// ─── Confidence colour helper ─────────────────────────────────────
function confColor(c){return c>=72?"#e2e8e4":c>=52?"#f59e0b":c>=36?"#fb923c":"#fff";}

// ─── NEW: PredictionRow — horizontal probability bar system ──────────────────
//
// Replaces the old MatchCard grid with a clean analytics dashboard row.
// Fields used (all from existing API):
//   p_home_win, p_draw, p_away_win, xg_home, xg_away, btts, over_2_5,
//   confidence, top_scores, fixture_id, home_form, away_form,
//   home_team, away_team, home_logo, away_logo, date
// ─────────────────────────────────────────────────────────────────────────────

function ProbTooltip({ label, value, sub, color, visible }) {
  if (!visible) return null;
  return (
    <div style={{
      position:"absolute", bottom:"calc(100% + 8px)", left:"50%",
      transform:"translateX(-50%)", zIndex:30,
      background:"rgba(5,8,16,0.98)", border:`1px solid ${color}50`,
       padding:"8px 12px", minWidth:120,
      boxShadow:`0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px ${color}20`,
      pointerEvents:"none", whiteSpace:"nowrap",
    }}>
      <div style={{fontSize:11,fontWeight:800,color,marginBottom:3}}>{label}</div>
      <div style={{fontSize:16,fontWeight:900,color:NB.y,fontFamily:"'Inter',sans-serif"}}>{value}</div>
      {sub && <div style={{fontSize:10,color:NB.y,marginTop:2}}>{sub}</div>}
      <div style={{position:"absolute",bottom:-5,left:"50%",
        width:8,height:8,background:"#0a0a0a",border:`1px solid ${color}40`,
        borderTop:"none",borderLeft:"none",transform:"translateX(-50%) rotate(45deg)"}}/>
    </div>
  );
}

const PRESETS=[
  {label:"Normal",icon:"○",mods:{homeAtk:0,awayAtk:0,homeDef:0,awayDef:0,tempo:0}},
  {label:"Home Press",icon:"○",mods:{homeAtk:15,awayAtk:-5,homeDef:5,awayDef:-10,tempo:5}},
  {label:"Both Attack",icon:"↕",mods:{homeAtk:10,awayAtk:10,homeDef:-10,awayDef:-10,tempo:8}},
  {label:"Defensive",icon:"■",mods:{homeAtk:-10,awayAtk:-10,homeDef:15,awayDef:15,tempo:-8}},
  {label:"Away Upset",icon:"■",mods:{homeAtk:-10,awayAtk:18,homeDef:-5,awayDef:5,tempo:3}},
];

const ScenarioSimulator=({match,T})=>{
  const[mods,setMods]=useState({homeAtk:0,awayAtk:0,homeDef:0,awayDef:0,tempo:0});
  const[activePreset,setActivePreset]=useState(0);
  const applyPreset=i=>{setActivePreset(i);setMods({...PRESETS[i].mods});};
  const official=useMemo(()=>{if(!match)return null;const xgH=parseFloat(match.xg_home)||1.3,xgA=parseFloat(match.xg_away)||1.1;return{...buildProbs(xgH,xgA),xgH:xgH.toFixed(2),xgA:xgA.toFixed(2)};},[match]);
  const scenario=useMemo(()=>{if(!match)return null;const baseH=parseFloat(match.xg_home)||1.3,baseA=parseFloat(match.xg_away)||1.1,tMult=1+mods.tempo/100;const xgH=Math.max(.1,baseH*(1+mods.homeAtk/100)*(1-mods.awayDef/200)*tMult),xgA=Math.max(.1,baseA*(1+mods.awayAtk/100)*(1-mods.homeDef/200)*tMult);return{...buildProbs(xgH,xgA),xgH:xgH.toFixed(2),xgA:xgA.toFixed(2)};},[match,mods]);
  const isModified=JSON.stringify(mods)!==JSON.stringify(PRESETS[0].mods);

  const cardStyle={
    background:"rgba(10,10,10,0.95)",
    border:`3px solid ${NB.y}`,
    boxShadow:`4px 4px 0 rgba(255,255,255,.2)`,
    overflow:"hidden",
  };

  if(!match)return(
    <div style={{...cardStyle,padding:32,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:240,gap:14}}>
      <div style={{width:48,height:48,background:"rgba(255,255,255,.06)",border:`2px solid rgba(255,255,255,.2)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,color:"rgba(255,255,255,.4)"}}>—</div>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:13,fontWeight:700,color:`rgba(255,255,255,.6)`,fontFamily:"'Inter',sans-serif",lineHeight:1.6}}>Select a match card</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,.35)",fontFamily:"'Inter',sans-serif",marginTop:4,letterSpacing:".06em"}}>to load the scenario simulator</div>
      </div>
    </div>
  );

  return(
    <div style={cardStyle}>
      {/* Header */}
      <div style={{padding:"12px 16px",borderBottom:`2px solid rgba(255,255,255,.15)`,background:"rgba(255,255,255,.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
          <div style={{width:6,height:6,background:NB.y}}/>
          <span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.65)",letterSpacing:"0.08em",fontFamily:"'Inter',sans-serif",textTransform:"uppercase"}}>SCENARIO SIMULATOR</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#ffffff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,fontFamily:"'Inter',sans-serif"}}>
            {match.home_team} <span style={{color:"rgba(255,255,255,.4)",fontWeight:400}}>vs</span> {match.away_team}
          </div>
          {isModified&&<button onClick={()=>applyPreset(0)} style={{fontSize:10,fontWeight:900,color:"#0a0a0a",background:"#ffffff",border:"none",padding:"3px 10px",cursor:"pointer",flexShrink:0,marginLeft:8,borderRadius:5,fontFamily:"'Inter',sans-serif",letterSpacing:".04em",textTransform:"uppercase"}}>Reset</button>}
        </div>
      </div>

      {/* Presets */}
      <div style={{padding:"10px 14px",borderBottom:`1px solid rgba(255,255,255,.1)`}}>
        <div style={{fontSize:10,fontWeight:900,color:"rgba(255,255,255,.4)",letterSpacing:"0.16em",marginBottom:8,fontFamily:"'Inter',sans-serif",textTransform:"uppercase"}}>QUICK SCENARIOS</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {PRESETS.map((p,i)=>(
            <button key={i} onClick={()=>applyPreset(i)} style={{
              display:"flex",alignItems:"center",gap:5,padding:"5px 10px",fontSize:11,fontWeight:800,
              cursor:"pointer",transition:"all 0.12s",fontFamily:"'Inter',sans-serif",
              background:activePreset===i?NB.y:"transparent",
              border:`2px solid ${activePreset===i?NB.y:"rgba(255,255,255,.2)"}`,
              color:activePreset===i?NB.k:NB.y,
              letterSpacing:".06em",textTransform:"uppercase",
            }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div style={{padding:"12px 14px",borderBottom:`1px solid rgba(255,255,255,.1)`,display:"flex",flexDirection:"column",gap:10}}>
        <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.55)",letterSpacing:"0.06em",fontFamily:"'Inter',sans-serif",textTransform:"uppercase"}}>FINE TUNE</div>
        {[{label:"Home Attack",k:"homeAtk"},{label:"Away Attack",k:"awayAtk"},{label:"Home Defense",k:"homeDef"},{label:"Away Defense",k:"awayDef"},{label:"Tempo",k:"tempo"}].map(({label,k})=>{
          const val=mods[k];
          const col=val===0?`rgba(255,255,255,.4)`:val>0?NB.y:NB.r;
          return(
            <div key={k} style={{display:"flex",flexDirection:"column",gap:4}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,color:"rgba(255,255,255,.75)",fontFamily:"'Inter',sans-serif"}}>{label}</span>
                <span style={{fontSize:11,fontWeight:900,fontFamily:"'Inter',sans-serif",color:col,letterSpacing:".02em"}}>{val>0?"+":""}{val}%</span>
              </div>
              <input type="range" min={-25} max={25} value={val}
                onChange={e=>{setActivePreset(-1);setMods(p=>({...p,[k]:parseInt(e.target.value)}));}}
                style={{width:"100%",accentColor:NB.y,cursor:"pointer",height:3}}/>
            </div>
          );
        })}
      </div>

      {/* Comparison */}
      {official&&scenario&&(
        <div style={{padding:"12px 14px",borderBottom:`1px solid rgba(255,255,255,.1)`}}>
          <div style={{fontSize:10,fontWeight:900,color:"rgba(255,255,255,.4)",letterSpacing:"0.16em",marginBottom:10,fontFamily:"'Inter',sans-serif",textTransform:"uppercase"}}>OFFICIAL vs SCENARIO</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {[{label:"Official",data:official,col:NB.y},{label:"Scenario",data:scenario,col:NB.r}].map(({label,data,col})=>(
              <div key={label} style={{padding:"10px 12px",background:label==="Scenario"?`rgba(255,39,68,.06)`:"rgba(255,255,255,.05)",border:`2px solid ${label==="Scenario"?NB.r:NB.y}`}}>
                <div style={{fontSize:10,fontWeight:900,color:col,letterSpacing:"0.14em",marginBottom:7,fontFamily:"'Inter',sans-serif",textTransform:"uppercase"}}>{label}</div>
                <div style={{fontSize:26,fontWeight:800,color:col,fontFamily:"'Inter',sans-serif",textAlign:"center",marginBottom:6,letterSpacing:"-.01em"}}>{data.topScore}</div>
                <div style={{display:"flex",height:4,overflow:"hidden",marginBottom:6,background:"rgba(255,255,255,.06)"}}>
                  <div style={{flex:data.pH,background:NB.y}}/><div style={{flex:data.pD,background:"rgba(255,255,255,.2)"}}/><div style={{flex:data.pA,background:NB.r}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  {[{v:Math.round(data.pH*100),c:NB.y},{v:Math.round(data.pD*100),c:`rgba(255,255,255,.4)`},{v:Math.round(data.pA*100),c:NB.r}].map(({v,c},i)=>(
                    <span key={i} style={{fontSize:13,fontWeight:900,color:c,fontFamily:"'Inter',sans-serif",letterSpacing:".02em"}}>{v}%</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {isModified&&(
            <div style={{marginTop:8,display:"flex",gap:4,flexWrap:"wrap"}}>
              {[{l:"Home Win",d:Math.round((scenario.pH-official.pH)*100)},{l:"Draw",d:Math.round((scenario.pD-official.pD)*100)},{l:"Away Win",d:Math.round((scenario.pA-official.pA)*100)}].map(({l,d})=>d!==0&&(
                <span key={l} style={{fontSize:11,fontWeight:900,color:d>0?"#0a0a0a":"#e2e8e4",background:d>0?"#ffffff":"transparent",border:d>0?"none":"1px solid rgba(255,255,255,0.3)",borderRadius:999,padding:"2px 8px",fontFamily:"'Inter',sans-serif",letterSpacing:".06em"}}>{l} {d>0?"+":""}{d}%</span>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{padding:"10px 14px",fontSize:10,color:"rgba(255,255,255,.4)",lineHeight:1.6,fontFamily:"'Inter',sans-serif"}}>Adjusts xG assumptions only. Official predictions unchanged.</div>
    </div>
  );
};

/* ----------------------------------------------------------
   TASK 6  STANDINGS + SCORERS
---------------------------------------------------------- */
const StandingsTable=({rows,loading,T})=>{ // iOS REDESIGN
  const[sortCol,setSortCol]=useState("rank");const[dir,setDir]=useState(1);
  const total=rows.length||20;
  const ZONE_COL={cl:NB.y,el:"#cccccc",ecl:`rgba(255,255,255,.5)`,rel:NB.r};
  function getZone(pos){if(pos<=4)return"cl";if(pos===5)return"el";if(pos===6)return"ecl";if(pos>=total-2)return"rel";return null;}
  const sorted=useMemo(()=>{if(loading)return[];return[...rows].sort((a,b)=>{let va=a[sortCol],vb=b[sortCol];if(va==null)va=sortCol==="rank"?999:0;if(vb==null)vb=sortCol==="rank"?999:0;if(typeof va==="string"){va=va.toLowerCase();vb=vb.toLowerCase();}return va<vb?-dir:va>vb?dir:0;});},[rows,sortCol,dir,loading]);
  const toggle=col=>{if(sortCol===col)setDir(d=>-d);else{setSortCol(col);setDir(col==="rank"?1:-1);}};

  const colStyle=(col,align)=>({
    padding:"11px 12px",fontSize:10,fontWeight:700,letterSpacing:"0.06em",
    color:sortCol===col?"#ffffff":"rgba(255,255,255,.45)",
    borderBottom:`3px solid rgba(255,255,255,.2)`,
    background:"rgba(10,10,10,0.95)",
    textAlign:align||"center",cursor:"pointer",userSelect:"none",
    transition:"color 0.12s",fontFamily:"'Inter',sans-serif",
    whiteSpace:"nowrap",textTransform:"uppercase",
  });
  const Th=({col,children,align,width})=>(
    <th onClick={()=>toggle(col)} style={{...colStyle(col,align),width}}>
      {children}{sortCol===col?<span style={{marginLeft:3,opacity:.7}}>{dir===1?"↓":"↑"}</span>:null}
    </th>
  );

  return(
    <div style={{background:"rgba(10,10,10,0.95)",border:`3px solid ${NB.y}`,boxShadow:`5px 5px 0 rgba(255,255,255,.15)`,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"'Inter',sans-serif"}}>
          <thead>
            <tr>
              <Th col="rank" width={52}>#</Th>
              <Th col="team_name" align="left">Club</Th>
              <Th col="played" width={40}>P</Th>
              <Th col="won" width={40}>W</Th>
              <Th col="drawn" width={40}>D</Th>
              <Th col="lost" width={40}>L</Th>
              <Th col="goals_for" width={40}>GF</Th>
              <Th col="goals_against" width={40}>GA</Th>
              <Th col="goal_diff" width={48}>GD</Th>
              <Th col="points" width={52}>Pts</Th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({length:10}).map((_,i)=>(
                  <tr key={i}>
                    {Array.from({length:10}).map((_2,j)=>(
                      <td key={j} style={{padding:"11px 12px"}}>
                        <div style={{height:11,background:"rgba(255,255,255,.05)",animation:"nbPulse 1.5s ease infinite",animationDelay:`${i*0.06}s`}}/>
                      </td>
                    ))}
                  </tr>
                ))
              : sorted.map((row,i)=>{
                  const pos=row.rank||i+1;
                  const zone=getZone(pos);
                  const zoneColor=zone?ZONE_COL[zone]:null;
                  return(
                    <tr key={row.team_id||i}
                      style={{borderBottom:`1px solid rgba(255,255,255,.07)`,transition:"background 0.12s",cursor:"default"}}
                      onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.05)";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="";}}>

                      {/* Rank with zone bar */}
                      <td style={{padding:"11px 12px",textAlign:"center"}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                          {zoneColor
                            ? <div style={{width:3,height:18,background:zoneColor,flexShrink:0}}/>
                            : <div style={{width:3,height:18,flexShrink:0}}/>
                          }
                          <span style={{fontSize:12,fontWeight:900,color:NB.y,fontFamily:"'Inter',sans-serif",letterSpacing:".02em"}}>{pos}</span>
                        </div>
                      </td>

                      {/* Club */}
                      <td style={{padding:"11px 12px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          {row.logo
                            ? <div style={{width:26,height:26,background:"rgba(255,255,255,.06)",border:`1px solid rgba(255,255,255,.15)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,padding:2}}>
                                <img src={row.logo} style={{width:20,height:20,objectFit:"contain"}} onError={e=>{e.currentTarget.parentElement.style.display="none";}}/>
                              </div>
                            : <div style={{width:26,height:26,background:"rgba(255,255,255,.06)",border:`1px solid rgba(255,255,255,.15)`,flexShrink:0}}/>
                          }
                          <span style={{fontSize:13,fontWeight:700,color:NB.y,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>{row.team_name}</span>
                        </div>
                      </td>

                      {/* Stats */}
                      {[row.played,row.won,row.drawn,row.lost,row.goals_for,row.goals_against].map((v,j)=>(
                        <td key={j} style={{padding:"11px 12px",textAlign:"center",fontSize:12,color:`rgba(255,255,255,.6)`,fontFamily:"'Inter',sans-serif"}}>{v??"-"}</td>
                      ))}

                      {/* GD */}
                      <td style={{padding:"11px 12px",textAlign:"center",fontSize:13,fontWeight:900,fontFamily:"'Inter',sans-serif",letterSpacing:".02em",
                        color:(row.goal_diff||0)>0?NB.y:(row.goal_diff||0)<0?NB.r:`rgba(255,255,255,.4)`}}>
                        {(row.goal_diff||0)>0?"+":""}{row.goal_diff??"-"}
                      </td>

                      {/* Points */}
                      <td style={{padding:"11px 12px",textAlign:"center"}}>
                        <span style={{
                          fontSize:16,fontWeight:900,color:NB.k,
                          fontFamily:"'Inter',sans-serif",letterSpacing:".02em",
                          background:NB.y,padding:"2px 10px",
                        }}>{row.points??"-"}</span>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
      {/* Legend */}
      <div style={{display:"flex",gap:14,padding:"10px 16px",borderTop:`2px solid rgba(255,255,255,.15)`,flexWrap:"wrap",background:"rgba(255,255,255,.03)"}}>
        {[{c:NB.y,l:"Champions League"},{c:"#cccccc",l:"Europa League"},{c:`rgba(255,255,255,.5)`,l:"Conference"},{c:NB.r,l:"Relegation"}].map(({c,l})=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:3,height:14,background:c}}/>
            <span style={{fontSize:10,color:"rgba(255,255,255,.4)",fontFamily:"'Inter',sans-serif",letterSpacing:".1em",textTransform:"uppercase"}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* -- iOS ScorersWidget ------------------------------------- */
const ScorersWidget=({league,T})=>{
  const[tab,setTab]=useState("goals");
  const[scorers,setScorers]=useState([]);
  const[assists,setAssists]=useState([]);
  const[loading,setLoading]=useState(true);
  const navigate=useNavigate();

  useEffect(()=>{
    setLoading(true);
    Promise.allSettled([getTopScorers(league),getTopAssists(league)]).then(([sr,ar])=>{
      if(sr.status==="fulfilled")setScorers(sr.value.scorers||[]);
      if(ar.status==="fulfilled")setAssists(ar.value.assists||[]);
      setLoading(false);
    });
  },[league]);

  const data=tab==="goals"?scorers:assists;
  const statKey=tab==="goals"?"goals":"assists";
  const maxVal=Math.max(...data.map(p=>p[statKey]||0),1);

  const medalColor=i=>i===0?"#FFD60A":i===1?"rgba(255,255,255,0.6)":i===2?"#CD7F32":"rgba(255,255,255,0.96)";

  return(
    <div style={{background:"rgba(10,10,10,0.95)",border:`3px solid ${NB.y}`,boxShadow:`5px 5px 0 rgba(255,255,255,.15)`,overflow:"hidden"}}>
      {/* Tab switcher */}
      <div style={{display:"flex",background:"rgba(10,10,10,0.95)",borderBottom:`3px solid ${NB.y}`}}>
        {[["goals","Top Scorers"],["assists","Top Assists"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{
            flex:1,padding:"12px 12px",fontSize:10,fontWeight:900,cursor:"pointer",
            background:tab===k?NB.y:"transparent",border:"none",fontFamily:"'Inter',sans-serif",
            color:tab===k?NB.k:NB.y,
            borderRight:k==="goals"?`1px solid rgba(255,255,255,.2)`:"none",
            transition:"all 0.12s",letterSpacing:"0.1em",textTransform:"uppercase",
          }}>{l}</button>
        ))}
      </div>

      {/* List */}
      <div style={{maxHeight:520,overflowY:"auto"}}>
        {loading
          ? Array.from({length:8}).map((_,i)=>(
              <div key={i} style={{display:"flex",gap:12,padding:"12px 16px",alignItems:"center"}}>
                <div style={{width:22,height:22,background:"rgba(255,255,255,.05)",border:`1px solid rgba(255,255,255,.1)`}}/>
                <div style={{width:38,height:38,background:"rgba(255,255,255,.05)",border:`1px solid rgba(255,255,255,.1)`}}/>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:5}}>
                  <div style={{height:11,background:"rgba(255,255,255,.05)",width:"60%"}}/>
                  <div style={{height:7,background:"rgba(255,255,255,.03)",width:"85%"}}/>
                </div>
                <div style={{width:40,height:40,background:"rgba(255,255,255,.05)"}}/>
              </div>
            ))
          : data.slice(0,10).map((p,i)=>(
              <div key={p.player_id||i}
                onClick={()=>navigate(`/player?search=${encodeURIComponent(p.name)}`)}
                style={{
                  display:"flex",alignItems:"center",gap:12,
                  padding:"12px 16px",cursor:"pointer",
                  borderBottom:`1px solid rgba(255,255,255,.07)`,
                  transition:"background 0.12s",
                }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.05)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="";}}>

                {/* Rank badge */}
                <div style={{
                  width:24,height:24,
                  background:i<3?NB.y:"transparent",
                  border:`2px solid ${i===0?NB.y:i===1?"rgba(255,255,255,.5)":i===2?"rgba(255,255,255,.3)":"rgba(255,255,255,.15)"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                }}>
                  <span style={{fontSize:10,fontWeight:900,color:i<3?NB.k:NB.y,fontFamily:"'Inter',sans-serif",letterSpacing:".02em"}}>{i+1}</span>
                </div>

                {/* Photo */}
                {p.photo
                  ? <img src={p.photo} style={{width:38,height:38,objectFit:"cover",flexShrink:0,border:`2px solid rgba(255,255,255,.2)`}} onError={e=>{e.currentTarget.style.display="none";}}/>
                  : <div style={{width:38,height:38,background:"rgba(255,255,255,.06)",flexShrink:0,border:`2px solid rgba(255,255,255,.15)`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <span style={{fontSize:14,color:"rgba(255,255,255,.3)"}}>–</span>
                    </div>
                }

                {/* Name + bar + team */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:NB.y,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Inter',sans-serif",marginBottom:4}}>{p.name}</div>
                  <div style={{height:3,background:"rgba(255,255,255,.07)",marginBottom:4,overflow:"hidden"}}>
                    <div style={{width:`${(p[statKey]||0)/maxVal*100}%`,height:"100%",background:NB.y,transition:"width 0.5s cubic-bezier(.22,1,.36,1)"}}/>
                  </div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.4)",fontFamily:"'Inter',sans-serif",letterSpacing:".04em"}}>{p.team_name}  {p.played||0} apps</div>
                </div>

                {/* Stat number */}
                <div style={{
                  minWidth:40,height:40,
                  background:i===0?NB.y:"transparent",
                  border:`2px solid ${i===0?NB.y:"rgba(255,255,255,.25)"}`,
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                  flexShrink:0,
                }}>
                  <span style={{fontSize:20,fontWeight:900,color:i===0?NB.k:NB.y,fontFamily:"'Inter',sans-serif",lineHeight:1,letterSpacing:".02em"}}>{p[statKey]||0}</span>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  );
};

/* ----------------------------------------------------------
   SEASON SIMULATOR  Monte Carlo engine v2
   Fixes: fixture shuffling, correct relegation zones per league,
   probability scaling, league-specific home advantage
   New: Title Race Chart, Points Projection, Relegation Battle Card,
        What-If toggle
---------------------------------------------------------- */

// -- League config (authoritative source of truth) ---------
const LEAGUE_CFG = {
  epl:        { total:20, games:38, ucl:4, uel:5, uecl:6, relPlay:null, relStart:18, homeAdv:0.32, avgGoals:1.36, label:"Premier League" },
  laliga:     { total:20, games:38, ucl:4, uel:5, uecl:null, relPlay:null, relStart:18, homeAdv:0.28, avgGoals:1.30, label:"La Liga" },
  seriea:     { total:20, games:38, ucl:4, uel:5, uecl:null, relPlay:null, relStart:18, homeAdv:0.25, avgGoals:1.28, label:"Serie A" },
  bundesliga: { total:18, games:34, ucl:4, uel:5, uecl:6,  relPlay:16,  relStart:17, homeAdv:0.30, avgGoals:1.48, label:"Bundesliga" },
  ligue1:     { total:18, games:34, ucl:3, uel:4, uecl:null, relPlay:null, relStart:16, homeAdv:0.27, avgGoals:1.25, label:"Ligue 1" },
};
// Legacy alias
const ZONE_CONFIG = LEAGUE_CFG;

function getZoneStyle(pos, cfg, T) {
  if (!cfg) return null;
  if (pos <= cfg.ucl)                            return { color:NB.y,           label:"UCL",  bg:`rgba(255,255,255,.08)` };
  if (pos === cfg.uel)                           return { color:"#cccccc",       label:"UEL",  bg:"rgba(0,212,170,.08)"  };
  if (cfg.uecl && pos === cfg.uecl)             return { color:"rgba(255,255,255,.65)", label:"UECL", bg:`rgba(255,255,255,.05)` };
  if (cfg.relPlay && pos === cfg.relPlay)        return { color:NB.r,            label:"Play", bg:`rgba(255,39,68,.08)`  };
  if (pos >= cfg.relStart)                      return { color:NB.r,            label:"REL",  bg:`rgba(255,39,68,.08)`  };
  return null;
}

// -- Poisson RNG -------------------------------------------
function poissonRandom(lambda) {
  const L = Math.exp(-Math.min(lambda, 20));
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

// -- Fisher-Yates shuffle ----------------------------------
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// -- Monte Carlo engine (fixed) ----------------------------
function runMonteCarlo(teams, league, sims = 8000, excludeIdx = null) {
  if (!teams.length) return [];
  const cfg = LEAGUE_CFG[league] || LEAGUE_CFG.epl;
  const n = teams.length;
  const gamesPlayed = teams[0]?.played || 20;
  const gamesLeft   = cfg.games - gamesPlayed;

  // Strength ratings: attack/defense relative to league average
  const avgGF = teams.reduce((s,t) => s+(t.goals_for||0),0) / n / Math.max(gamesPlayed,1);
  const avgGA = teams.reduce((s,t) => s+(t.goals_against||0),0) / n / Math.max(gamesPlayed,1);

  const strength = teams.map((t, idx) => {
    const gp  = Math.max(t.played || gamesPlayed, 1);
    const atk = idx === excludeIdx ? 0.3   // "what-if: team stripped of attack"
      : (t.goals_for||0) / gp / Math.max(avgGF, 0.01);
    const def = idx === excludeIdx ? 2.5   // "what-if: team stripped of defence"
      : (t.goals_against||0) / gp / Math.max(avgGA, 0.01);
    return { atk: Math.max(atk, 0.25), def: Math.max(def, 0.25) };
  });

  // Generate ALL possible fixtures for remaining round-robin
  const allFixtures = [];
  for (let i = 0; i < n; i++)
    for (let j = i+1; j < n; j++)
      allFixtures.push([i,j]);

  // How many unique fixture slots do we need per sim?
  // Each team plays gamesLeft more games  n*gamesLeft/2 fixtures total
  const fixturesNeeded = Math.round(n * gamesLeft / 2);

  // Accumulators
  const titleCount = new Array(n).fill(0);
  const uclCount   = new Array(n).fill(0);
  const uelCount   = new Array(n).fill(0);
  const relegCount = new Array(n).fill(0);
  const relPlayCount = new Array(n).fill(0);
  const pointsSum  = new Array(n).fill(0);
  const posSum     = new Array(n).fill(0);

  for (let s = 0; s < sims; s++) {
    const pts = teams.map(t => t.points || 0);
    const gd  = teams.map(t => t.goal_diff || 0);
    const gf  = teams.map(t => t.goals_for || 0);

    // // shuffle fixtures each simulation so all matchups get sampled
    const pool = shuffle([...allFixtures]);
    const usedFixtures = pool.slice(0, fixturesNeeded);

    for (const [h, a] of usedFixtures) {
      const xgH = Math.max(0.2, cfg.avgGoals * strength[h].atk / strength[a].def * (1 + cfg.homeAdv));
      const xgA = Math.max(0.2, cfg.avgGoals * strength[a].atk / strength[h].def);
      const gh  = poissonRandom(xgH);
      const ga  = poissonRandom(xgA);
      gd[h] += gh - ga; gd[a] += ga - gh;
      gf[h] += gh;      gf[a] += ga;
      if      (gh > ga) { pts[h] += 3; }
      else if (gh < ga) { pts[a] += 3; }
      else              { pts[h]++; pts[a]++; }
    }

    // Rank by pts ? GD ? GF
    const order = Array.from({length:n},(_,i)=>i)
      .sort((a,b) => pts[b]-pts[a] || gd[b]-gd[a] || gf[b]-gf[a]);

    order.forEach((ti, pos) => {
      pointsSum[ti] += pts[ti];
      posSum[ti]    += pos + 1;
      if (pos === 0)                                     titleCount[ti]++;
      if (pos < cfg.ucl)                                 uclCount[ti]++;
      if (pos === cfg.uel - 1)                           uelCount[ti]++;
      // // use league-specific relegation zone
      if (cfg.relPlay && pos === cfg.relPlay - 1)        relPlayCount[ti]++;
      if (pos >= cfg.relStart - 1)                       relegCount[ti]++;
    });
  }

  return teams.map((t,i) => ({
    ...t,
    avg_pts:         Math.round(pointsSum[i] / sims * 10) / 10,
    avg_position:    Math.round(posSum[i] / sims * 10) / 10,
    title_prob:      Math.round(titleCount[i] / sims * 100 * 10) / 10,
    top4_prob:       Math.round(uclCount[i] / sims * 100 * 10) / 10,
    uel_prob:        Math.round(uelCount[i] / sims * 100 * 10) / 10,
    relplay_prob:    Math.round(relPlayCount[i] / sims * 100 * 10) / 10,
    relegation_prob: Math.round(relegCount[i] / sims * 100 * 10) / 10,
  })).sort((a,b) => a.avg_position - b.avg_position);
}

// -- Shared UI components ----------------------------------
const ProbBar = ({ pct, color, bg="rgba(255,255,255,0.05)" }) => (
  <div style={{position:"relative",height:4,borderRadius:2,background:bg,overflow:"hidden",minWidth:60}}>
    <div style={{position:"absolute",left:0,top:0,height:"100%",width:`${Math.min(pct,100)}%`,
      background:color,borderRadius:2,transition:"width 0.6s cubic-bezier(.22,1,.36,1)"}}/>
  </div>
);

const ChancePill = ({ value, color, label }) => {
  const v = Math.round(value) || 0;
  const alpha = v > 50 ? 0.22 : v > 20 ? 0.14 : v > 5 ? 0.09 : 0.05;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,minWidth:54}}>
      <div style={{padding:"4px 10px",borderRadius:999,
        background:`${color}${Math.round(alpha*255).toString(16).padStart(2,"0")}`,
        border:`1px solid ${color}${v>5?"44":"1a"}`,
        fontSize:12,fontWeight:900,
        color:v>0?color:`rgba(255,255,255,.7)`,
        fontFamily:"'Inter',sans-serif",
        minWidth:46,textAlign:"center"}}>
        {v > 0 ? `${v}%` : ""}
      </div>
      <span style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.4)",letterSpacing:"0.06em",textTransform:"uppercase"}}>{label}</span>
    </div>
  );
};

// -- Title Race Chart --------------------------------------
const TitleRaceChart = ({ data, cfg, T }) => {
  const contenders = data.filter(r => r.title_prob > 1).slice(0, 8);
  if (!contenders.length) return null;
  const max = Math.max(...contenders.map(r => r.title_prob), 1);

  return (
    <div style={{background:T.panel,border:`1px solid ${T.border}`,padding:"20px 24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}>
        
        <div>
          <div style={{fontSize:13,fontWeight:900,color:T.text,fontFamily:"'Inter',sans-serif"}}>Title Race</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>Championship probability distribution</div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {contenders.map((row, i) => (
          <div key={row.team_name} style={{display:"grid",gridTemplateColumns:"110px 1fr 46px",alignItems:"center",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
              {row.logo
                ? <img src={row.logo} alt="" style={{width:20,height:20,objectFit:"contain",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>
                : <div style={{width:20,height:20,borderRadius:"50%",background:`#6366f118`,flexShrink:0,border:`1px solid ${T.border}`}}/>}
              <span style={{fontSize:11,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Inter',sans-serif"}}>
                {row.team_name}
              </span>
            </div>
            <div style={{position:"relative",height:20,borderRadius:4,background:"rgba(255,255,255,.05)",overflow:"hidden"}}>
              <div style={{
                position:"absolute",left:0,top:0,height:"100%",
                width:`${(row.title_prob/max)*100}%`,
                background:`linear-gradient(90deg,#6366f1,#8b5cf6)`,
                borderRadius:4,
                transition:"width 0.8s cubic-bezier(.22,1,.36,1)",
                opacity: i===0 ? 1 : 0.65 + (0.35 * (1 - i/contenders.length)),
              }}/>
              <div style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",
                fontSize:11,fontWeight:800,color:"rgba(255,255,255,0.8)",fontFamily:"'Inter',sans-serif"}}>
                {row.title_prob > 2 ? `${row.title_prob}%` : ""}
              </div>
            </div>
            <div style={{fontSize:12,fontWeight:900,color:"#6366f1",fontFamily:"'Inter',sans-serif",textAlign:"right"}}>
              {row.title_prob}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// -- Points Projection -------------------------------------
const PointsProjection = ({ data, cfg, T }) => {
  const top10 = data.slice(0, 10);
  if (!top10.length) return null;

  return (
    <div style={{background:T.panel,border:`1px solid ${T.border}`,padding:"20px 24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}>
        
        <div>
          <div style={{fontSize:13,fontWeight:900,color:T.text,fontFamily:"'Inter',sans-serif"}}>Points Projection</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>Current vs projected final points</div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {top10.map(row => {
          const curr = row.currentPts ?? row.points ?? 0;
          const proj = row.avg_pts || row.avg_points || 0;
          const delta = proj - curr;
          return (
            <div key={row.team_name} style={{display:"grid",gridTemplateColumns:"110px 1fr 80px",alignItems:"center",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
                {row.logo
                  ? <img src={row.logo} alt="" style={{width:18,height:18,objectFit:"contain",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>
                  : <div style={{width:18,height:18,borderRadius:"50%",background:"rgba(255,255,255,.06)",flexShrink:0}}/>}
                <span style={{fontSize:11,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {row.team_name}
                </span>
              </div>
              <div style={{position:"relative",height:6,borderRadius:3,background:"rgba(255,255,255,.05)"}}>
                {/* Current pts bar */}
                <div style={{position:"absolute",left:0,top:0,height:"100%",
                  width:`${Math.min((curr/110)*100,100)}%`,
                  background:"rgba(255,255,255,0.96)",borderRadius:3}}/>
                {/* Projected pts extension */}
                <div style={{position:"absolute",left:`${Math.min((curr/110)*100,100)}%`,top:0,height:"100%",
                  width:`${Math.min((delta/110)*100,100)}%`,
                  background:"linear-gradient(90deg,#10b981,#6366f1)",borderRadius:"0 3px 3px 0",
                  transition:"width 0.8s cubic-bezier(.22,1,.36,1)"}}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
                <span style={{fontSize:11,fontWeight:900,color:T.text,fontFamily:"'Inter',sans-serif"}}>{proj}</span>
                <span style={{fontSize:11,fontWeight:800,
                  color: delta > 0 ? "#10b981" : "#ef4444",
                  background: delta > 0 ? "#10b98115" : "#ef444415",
                  border: `1px solid ${delta > 0 ? "#10b98130" : "#ef444430"}`,
                  borderRadius:4,padding:"1px 5px",fontFamily:"'Inter',sans-serif"}}>
                  +{delta}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:12,fontSize:11,color:"rgba(255,255,255,.55)",display:"flex",gap:16}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:12,height:4,borderRadius:2,background:"rgba(255,255,255,0.96)"}}/>
          <span>Current pts</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:12,height:4,borderRadius:2,background:"linear-gradient(90deg,#10b981,#6366f1)"}}/>
          <span>Projected gain</span>
        </div>
      </div>
    </div>
  );
};

// -- Relegation Battle Card --------------------------------
const RelegationBattleCard = ({ data, cfg, T }) => {
  // Get bottom zone teams  those in or near relegation
  const dangerZone = data.filter(r => {
    const pos = Math.round(r.avg_position);
    return pos >= cfg.relStart - 3; // show 3 above relegation too
  });
  if (!dangerZone.length) return null;
  const maxRel = Math.max(...dangerZone.map(r => r.relegation_prob), 1);

  return (
    <div style={{background:"rgba(239,68,68,0.04)",border:"1px solid rgba(239,68,68,0.2)",padding:"20px 24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        
        <div>
          <div style={{fontSize:13,fontWeight:900,color:"#ef4444",fontFamily:"'Inter',sans-serif"}}>Relegation Battle</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>Survival probabilities for bottom clubs</div>
        </div>
      </div>
      <div style={{marginBottom:16,fontSize:10,color:"rgba(255,255,255,.55)",padding:"8px 12px",background:"rgba(239,68,68,0.06)",borderRadius:8,border:"1px solid rgba(239,68,68,0.12)"}}>
        Relegation zone: positions {cfg.relStart}{cfg.total}  {cfg.total - cfg.relStart + 1} teams go down
        {cfg.relPlay ? `  Position ${cfg.relPlay} enters playoff` : ""}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[...dangerZone].sort((a,b) => b.relegation_prob - a.relegation_prob).map(row => {
          const rel   = row.relegation_prob;
          const surv  = Math.round(100 - rel);
          const pos   = Math.round(row.avg_position);
          const isRel = pos >= cfg.relStart;
          const isPlay = cfg.relPlay && pos === cfg.relPlay;

          return (
            <div key={row.team_name} style={{
              background: isRel ? "rgba(239,68,68,0.08)" : isPlay ? "rgba(249,115,22,0.06)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${isRel?"rgba(239,68,68,0.3)":isPlay?"rgba(249,115,22,0.25)":"rgba(255,255,255,0.06)"}`,
              padding:"14px 16px",
            }}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {row.logo
                    ? <img src={row.logo} alt="" style={{width:22,height:22,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>
                    : <div style={{width:22,height:22,borderRadius:"50%",background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)"}}/>}
                  <div>
                    <div style={{fontSize:12,fontWeight:800,color:T.text,fontFamily:"'Inter',sans-serif"}}>{row.team_name}</div>
                    <div style={{fontSize:11,color:T.muted}}>Avg pos: {row.avg_position?.toFixed(1)}  {row.currentPts ?? "?"} pts</div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:20,fontWeight:900,color:rel>50?"#ef4444":rel>25?"#f97316":"#10b981",fontFamily:"'Inter',sans-serif"}}>
                    {rel}%
                  </div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.55)",fontWeight:700}}>RELEGATION RISK</div>
                </div>
              </div>
              {/* Survival bar */}
              <div style={{position:"relative",height:8,borderRadius:4,background:"rgba(239,68,68,0.15)",overflow:"hidden"}}>
                <div style={{
                  position:"absolute",right:0,top:0,height:"100%",
                  width:`${surv}%`,
                  background:surv>75?"#10b981":surv>50?"#f59e0b":"#ef4444",
                  borderRadius:4,
                  transition:"width 0.8s cubic-bezier(.22,1,.36,1)",
                }}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:5,fontSize:11,color:T.muted}}>
                <span style={{color:"#ef4444",fontWeight:700}}>Relegated</span>
                <span style={{color:"#10b981",fontWeight:700}}>Survival: {surv}%</span>
              </div>
              {isPlay && (
                <div style={{marginTop:8,fontSize:11,fontWeight:800,color:"#f97316",
                  background:"rgba(249,115,22,0.1)",border:"1px solid rgba(249,115,22,0.2)",
                  borderRadius:6,padding:"4px 8px",display:"inline-block"}}>
                  Relegation Play-off spot
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// -- What-If Toggle ----------------------------------------
const WhatIfPanel = ({ standings, league, T, onResult }) => {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [running, setRunning]           = useState(false);

  const teams = standings || [];

  const runWhatIf = () => {
    if (!selectedTeam || !teams.length) return;
    setRunning(true);
    setTimeout(() => {
      const idx = teams.findIndex(t =>
        (t.team_name || "").toLowerCase() === selectedTeam.toLowerCase()
      );
      if (idx === -1) { setRunning(false); return; }
      const results = runMonteCarlo(teams, league, 6000, idx);
      onResult(results, selectedTeam);
      setRunning(false);
    }, 50);
  };

  return (
    <div style={{background:T.panel,border:`1px solid ${T.border}`,padding:"20px 24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        
        <div>
          <div style={{fontSize:13,fontWeight:900,color:T.text,fontFamily:"'Inter',sans-serif"}}>What-If Simulator</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>Remove a team's strength  see how the table changes</div>
        </div>
      </div>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <select value={selectedTeam} onChange={e=>setSelectedTeam(e.target.value)}
          style={{flex:1,minWidth:160,padding:"8px 12px",borderRadius:8,fontSize:12,
            background:"rgba(255,255,255,.06)",border:`1px solid ${T.border}`,
            color:T.text,outline:"none",cursor:"pointer"}}>
          <option value="">Select a team to weaken</option>
          {teams.map(t => (
            <option key={t.team_name} value={t.team_name}>{t.team_name}</option>
          ))}
        </select>
        <button onClick={runWhatIf} disabled={!selectedTeam || running}
          style={{padding:"8px 18px",borderRadius:8,fontSize:11,fontWeight:800,cursor:"pointer",
            background:selectedTeam?"rgba(99,102,241,0.15)":"rgba(255,255,255,0.04)",
            border:`1px solid ${selectedTeam?"#6366f140":"rgba(255,255,255,0.08)"}`,
            color:selectedTeam?"#6366f1":"#fff"}}>
          {running ? "Simulating" : "Run Simulation"}
        </button>
        {selectedTeam && (
          <button onClick={()=>{setSelectedTeam("");onResult(null);}}
            style={{padding:"8px 14px",borderRadius:8,fontSize:11,fontWeight:800,cursor:"pointer",
              background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444"}}>
            Reset
          </button>
        )}
      </div>
      {selectedTeam && !running && (
        <div style={{marginTop:10,fontSize:10,color:"#f59e0b",
          background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",
          borderRadius:8,padding:"8px 12px"}}>
          ? Simulating season with <strong>{selectedTeam}</strong> performing at relegation-level strength  showing how other teams benefit
        </div>
      )}
    </div>
  );
};

/* ----------------------------------------------------------
   SEASON SIMULATOR TAB
---------------------------------------------------------- */
const SeasonSimulatorTab = ({ standings, standLoad, league, T }) => {
  const isMobile = useWindowWidth() < 640;
  const [simData,     setSimData]     = useState(null);
  const [simLoad,     setSimLoad]     = useState(true);
  const [simErr,      setSimErr]      = useState(null);
  const [sortKey,     setSortKey]     = useState("avg_position");
  const [sortDir,     setSortDir]     = useState(1);
  const [hovered,     setHovered]     = useState(null);
  const [activeView,  setActiveView]  = useState("table"); // table | title | points | relegation
  const [whatIfData,  setWhatIfData]  = useState(null);
  const [whatIfTeam,  setWhatIfTeam]  = useState(null);

  const cfg = LEAGUE_CFG[league] || LEAGUE_CFG.epl;

  useEffect(() => {
    setSimLoad(true); setSimErr(null); setSimData(null); setWhatIfData(null);
    const cacheKey = "sim_v2_" + league;
    try {
      const r = sessionStorage.getItem(cacheKey);
      if (r) {
        const p = JSON.parse(r);
        if (Date.now() - p.ts < 1800000) { setSimData(p.data); setSimLoad(false); return; }
      }
    } catch {}

    getSeasonSimulation(league)
      .then(raw => {
        // // Handle { league, results:[...] } format from backend
        const items = Array.isArray(raw?.results) ? raw.results
          : Array.isArray(raw) ? raw
          : Object.entries(raw).filter(([k]) => k !== "league").map(([name,d]) => ({team:name,...d}));

        const rows = items.map(d => ({
          team_name:       d.team || d.team_name || "",
          avg_position:    parseFloat(d.avg_position)    || 0,
          avg_pts:         parseFloat(d.avg_points || d.avg_pts) || 0,
          // // backend already sends percentages (e.g. 39.87), don't multiply by 100
          title_prob:      parseFloat(d.title_prob)      || 0,
          top4_prob:       parseFloat(d.top4_prob)       || 0,
          uel_prob:        parseFloat(d.top5_prob)       || 0,
          relegation_prob: parseFloat(d.relegation_prob) || 0,
        }));
        try { sessionStorage.setItem(cacheKey, JSON.stringify({data:rows, ts:Date.now()})); } catch {}
        setSimData(rows);
      })
      .catch(() => {
        if (standings?.length > 0) {
          const results = runMonteCarlo(standings, league, 6000);
          const rows = results.map(r => ({
            team_name:       r.team_name,
            avg_position:    r.avg_position,
            avg_pts:         r.avg_pts,
            title_prob:      r.title_prob,
            top4_prob:       r.top4_prob,
            uel_prob:        r.uel_prob,
            relegation_prob: r.relegation_prob,
            logo:            r.logo,
            currentPts:      r.points,
            played:          r.played,
            _clientSide:     true,
          }));
          try { sessionStorage.setItem(cacheKey, JSON.stringify({data:rows, ts:Date.now()})); } catch {}
          setSimData(rows);
        } else {
          setSimErr("Waiting for standings data try switching to the Table tab first.");
        }
      })
      .finally(() => setSimLoad(false));
  }, [league, standings]);

  // Merge sim rows with live standings for logos + pts
  const merged = useMemo(() => {
    const source = whatIfData || simData;
    if (!source) return [];
    return source.map(row => {
      const live = standings?.find(s =>
        s.team_name === row.team_name ||
        (s.team_name||"").toLowerCase().includes((row.team_name||"").toLowerCase().split(" ")[0]) ||
        (row.team_name||"").toLowerCase().includes((s.team_name||"").toLowerCase().split(" ")[0])
      );
      return { ...row, logo:live?.logo, currentPts:live?.points, played:live?.played,
               goals_for:live?.goals_for, goals_against:live?.goals_against, goal_diff:live?.goal_diff };
    });
  }, [simData, whatIfData, standings]);

  const sorted = useMemo(() => {
    return [...merged].sort((a,b) => {
      const va = a[sortKey]??0, vb = b[sortKey]??0;
      return sortKey==="avg_position" ? (va-vb)*sortDir : (vb-va)*sortDir;
    });
  }, [merged, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey===key) setSortDir(d=>-d);
    else { setSortKey(key); setSortDir(key==="avg_position"?1:-1); }
  };

  // Only block on simLoad  standLoad just means logos/pts may not be merged yet
  const loading = simLoad;

  const zones = [
    { color:"#6366f1", label:"Champions League" },
    { color:"#f59e0b", label:"Europa League" },
    ...(cfg.uecl ? [{ color:"#10b981", label:"Conference League" }] : []),
    ...(cfg.relPlay ? [{ color:"#f97316", label:"Relegation Play-off" }] : []),
    { color:"#ef4444", label:"Relegation" },
  ];

  const ViewBtn = ({ id, icon, label }) => (
    <button onClick={()=>setActiveView(id)} style={{
      display:"flex",alignItems:"center",gap:5,
      padding:"7px 14px",borderRadius:8,fontSize:11,fontWeight:800,cursor:"pointer",
      background:activeView===id?"rgba(99,102,241,0.15)":"rgba(255,255,255,0.04)",
      border:`1px solid ${activeView===id?"#6366f140":"rgba(255,255,255,0.08)"}`,
      color:activeView===id?"#6366f1":"rgba(255,255,255,0.78)",transition:"all .15s"}}>
      <span>{icon}</span>{label}
    </button>
  );

  const SortBtn = ({ k, label }) => (
    <button onClick={()=>toggleSort(k)} style={{
      padding:"5px 12px",fontSize:10,fontWeight:700,cursor:"pointer",
      border:`1px solid ${sortKey===k?"#6366f1":T.border}`,
      background:sortKey===k?"rgba(99,102,241,0.12)":"transparent",
      color:sortKey===k?"#6366f1":T.muted,
      transition:"all 0.13s",display:"flex",alignItems:"center",gap:4}}>
      {label}{sortKey===k && <span style={{fontSize:9}}>{sortDir===1?"?":"?"}</span>}
    </button>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>

      {/* -- Header */}
      <div style={{
        background:`linear-gradient(135deg,rgba(99,102,241,0.12) 0%,${T.faint} 50%,${T.panel} 100%)`,
        border:`1px solid rgba(99,102,241,0.2)`,padding:"20px 24px",
        display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:14}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#6366f1",boxShadow:"0 0 10px #6366f1"}}/>
            <span style={{fontSize:11,fontWeight:900,color:"#6366f1",letterSpacing:"0.12em"}}>SEASON SIMULATOR</span>
            {whatIfTeam && (
              <span style={{fontSize:11,fontWeight:800,color:"#f59e0b",background:"rgba(245,158,11,0.12)",
                border:"1px solid rgba(245,158,11,0.3)",borderRadius:999,padding:"2px 8px"}}>
                WHAT-IF: {whatIfTeam} weakened
              </span>
            )}
          </div>
          <div style={{fontSize:22,fontWeight:900,color:T.text,fontFamily:"'Inter',sans-serif",letterSpacing:"-0.02em"}}>
            {cfg.label}  Final Day Predictions
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.55)",marginTop:4}}>
            Monte Carlo · 8,000 simulations  Poisson xG · Shuffled fixtures · League-specific zones
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:isMobile?"nowrap":"wrap",overflowX:isMobile?"auto":"visible",WebkitOverflowScrolling:"touch",paddingBottom:isMobile?4:0,scrollbarWidth:"none"}}>
          {zones.map(z=>(
            <div key={z.label} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:3,height:14,borderRadius:2,background:z.color}}/>
              <span style={{fontSize:11,color:T.muted}}>{z.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* -- View switcher */}
      {!loading && !simErr && (
        <div style={{display:"flex",gap:6,flexWrap:"wrap",overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:4,scrollbarWidth:"none"}}>
          <ViewBtn id="table" icon="≡" label="Full Table" />
          <ViewBtn id="title" icon="◆" label="Title Race" />
          <ViewBtn id="points" icon="↗" label="Points Projection" />
          <ViewBtn id="relegation" icon="▼" label="Relegation Battle" />
          <ViewBtn id="whatif" icon="⊘" label="What-If" />
        </div>
      )}

      {/* -- Error */}
      {simErr && (
        <div style={{padding:24,background:T.panel,border:`1px solid ${T.border}`,textAlign:"center"}}>
          <div style={{width:40,height:40,borderRadius:8,background:"rgba(255,255,255,.05)",border:`1px solid rgba(255,255,255,.1)`,margin:"0 auto 10px"}}></div>
          <div style={{color:"rgba(255,255,255,.55)",fontSize:13}}>Could not load simulation data</div>
          <div style={{color:"#ef4444",fontSize:11,marginTop:6,fontFamily:"'Inter',sans-serif"}}>{simErr}</div>
        </div>
      )}

      {/* -- Loading */}
      {loading && !simErr && (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {Array.from({length:8}).map((_,i)=>(
            <div key={i} style={{height:72,
              background:`linear-gradient(90deg,${T.panel} 25%,${T.faint} 50%,${T.panel} 75%)`,
              backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite",
              opacity:1-i*0.08,border:`1px solid ${T.border}`}}/>
          ))}
          <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        </div>
      )}

      {/* -- TITLE RACE */}
      {!loading && !simErr && activeView==="title" && (
        <TitleRaceChart data={sorted} cfg={cfg} T={T}/>
      )}

      {/* -- POINTS PROJECTION */}
      {!loading && !simErr && activeView==="points" && (
        <PointsProjection data={sorted} cfg={cfg} T={T}/>
      )}

      {/* -- RELEGATION BATTLE */}
      {!loading && !simErr && activeView==="relegation" && (
        <RelegationBattleCard data={sorted} cfg={cfg} T={T}/>
      )}

      {/* -- WHAT-IF */}
      {!loading && !simErr && activeView==="whatif" && (
        <WhatIfPanel
          standings={standings}
          league={league}
          T={T}
          onResult={(results, team) => {
            if (!results) { setWhatIfData(null); setWhatIfTeam(null); return; }
            const rows = results.map(r => ({
              team_name:       r.team_name,
              avg_position:    r.avg_position,
              avg_pts:         r.avg_pts,
              title_prob:      r.title_prob,
              top4_prob:       r.top4_prob,
              relegation_prob: r.relegation_prob,
              logo:            r.logo,
              currentPts:      r.points,
              played:          r.played,
            }));
            setWhatIfData(rows);
            setWhatIfTeam(team);
            setActiveView("table");
          }}
        />
      )}

      {/* -- FULL TABLE */}
      {!loading && !simErr && activeView==="table" && (
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {/* Sort controls */}
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
            <span style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>Sort by:</span>
            <SortBtn k="avg_position"    label="Predicted Pos" />
            <SortBtn k="title_prob"      label="Title %" />
            <SortBtn k="top4_prob"       label="Top 4 %" />
            <SortBtn k="relegation_prob" label="Relegation %" />
            <span style={{marginLeft:"auto",fontSize:10,color:"rgba(255,255,255,.55)",fontFamily:"'Inter',sans-serif"}}>
              {sorted.length} teams{whatIfTeam ? `  ★ ${whatIfTeam} weakened` : ""}
            </span>
          </div>

          {sorted.map((row, i) => {
            const pos   = Math.round(row.avg_position) || i+1;
            const zone  = getZoneStyle(pos, cfg, T);
            // // values already in % from backend, don't multiply again
            const titleP = Math.round(row.title_prob);
            const top4P  = Math.round(row.top4_prob);
            const relegP = Math.round(row.relegation_prob);
            const projPts = row.avg_pts || row.avg_points || 0;
            const currPts = row.currentPts ?? 0;
            const delta   = projPts ? Math.round(projPts - currPts) : null;
            const isHov   = hovered === row.team_name;
            const isWhatIfTeam = whatIfTeam && row.team_name === whatIfTeam;

            return (
              <div key={row.team_name}
                onMouseEnter={()=>setHovered(row.team_name)}
                onMouseLeave={()=>setHovered(null)}
                style={{
                  display:"grid",
                  gridTemplateColumns:isMobile ? "40px 1fr 60px 60px" : "52px 1fr 70px 70px 70px 70px",
                  alignItems:"center",gap:isMobile?8:12,padding:isMobile?"10px 12px":"14px 16px",
                  background: isWhatIfTeam ? "rgba(245,158,11,0.06)" : isHov ? "rgba(99,102,241,0.06)" : T.panel,
                  border:`1px solid ${isWhatIfTeam?"rgba(245,158,11,0.3)":zone?`${zone.color}22`:isHov?"rgba(99,102,241,0.25)":T.border}`,
                  transition:"all 0.15s",
                }}>

                {/* Pos + zone bar */}
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  {zone && <div style={{width:3,height:36,borderRadius:2,background:zone.color,flexShrink:0}}/>}
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:18,fontWeight:900,
                      color:zone?zone.color:"rgba(255,255,255,.55)",
                      fontFamily:"'Inter',sans-serif",lineHeight:1}}>
                      {pos}
                    </div>
                    {zone && (
                      <div style={{fontSize:7,fontWeight:800,color:zone.color,letterSpacing:"0.06em",marginTop:2}}>
                        {zone.label}
                      </div>
                    )}
                  </div>
                </div>

                {/* Team */}
                <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                  {row.logo
                    ? <img src={row.logo} alt="" style={{width:28,height:28,objectFit:"contain",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>
                    : <div style={{width:28,height:28,borderRadius:"50%",background:"rgba(99,102,241,0.1)",flexShrink:0,border:`1px solid ${T.border}`}}/>}
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:800,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Inter',sans-serif"}}>
                      {row.team_name}
                      {isWhatIfTeam && <span style={{marginLeft:6,fontSize:11,color:"#f59e0b"}}>★ weakened</span>}
                    </div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,.55)",fontFamily:"'Inter',sans-serif",marginTop:1,display:"flex",gap:8}}>
                      {row.currentPts != null && <span>{row.currentPts} pts</span>}
                      {delta != null && delta > 0 && <span style={{color:"#10b981"}}>? {Math.round(projPts)} proj (+{delta})</span>}
                      {row.played && <span> {row.played} played</span>}
                    </div>
                  </div>
                </div>

                {/* Avg Pos */}
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:16,fontWeight:900,color:T.text,fontFamily:"'Inter',sans-serif"}}>
                    {row.avg_position?.toFixed(1)}
                  </div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.55)",marginTop:2}}>Avg Pos</div>
                  <ProbBar pct={(cfg.total - row.avg_position)/cfg.total*100} color="#6366f1"/>
                </div>

                {/* Title % */}
                <div style={{textAlign:"center"}}>
                  <ChancePill value={titleP} color="#6366f1" label="Title"/>
                </div>

                {/* Top 4 % */}
                <div style={{textAlign:"center"}}>
                  <ChancePill value={top4P} color="#f59e0b" label="Top 4"/>
                </div>

                {/* Relegation %  hidden on mobile */}
                {!isMobile && <div style={{textAlign:"center"}}>
                  <ChancePill value={relegP}
                    color={relegP>40?"#ef4444":relegP>20?"#f97316":relegP>5?"#f59e0b":T.muted}
                    label="Rel %"/>
                </div>}

                {/* Avg Pos  hidden on mobile (shown inline) */}
                {!isMobile && <div style={{textAlign:"center"}}>
                  <div style={{fontSize:16,fontWeight:900,color:T.text,fontFamily:"'Inter',sans-serif"}}>
                    {row.avg_position?.toFixed(1)}
                  </div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.55)",marginTop:2}}>Avg Pos</div>
                  <ProbBar pct={(cfg.total-row.avg_position)/cfg.total*100} color="#6366f1"/>
                </div>}
              </div>
            );
          })}
        </div>
      )}

      {/* -- Footer */}
      {!loading && !simErr && (
        <div style={{padding:"12px 16px",background:T.faint,border:`1px solid ${T.border}`,display:"flex",gap:8,alignItems:"flex-start"}}>
          
          <span style={{fontSize:10,color:"rgba(255,255,255,.55)",lineHeight:1.6}}>
            Monte Carlo simulation (8,000 runs) using Poisson goal models with shuffled fixture sampling, league-specific home advantage ({(cfg.homeAdv*100).toFixed(0)}% for {cfg.label}), and per-team attack/defence ratings derived from current season stats. Relegation zones reflect {cfg.label} rules ({cfg.total-cfg.relStart+1} teams relegated). Not guaranteed predictions.
          </span>
        </div>
      )}
    </div>
  );
};


/* ----------------------------------------------------------
   MAIN PAGE
---------------------------------------------------------- */

// Maps frontend league code // backend API code
// All codes now match directly  bundesliga added to backend LEAGUE_IDS
const BACKEND_LEAGUE = {
  epl:        "epl",
  laliga:     "laliga",
  bundesliga: "bundesliga",
  seriea:     "seriea",
  ligue1:     "ligue1",
  ucl:        "ucl",
  uel:        "uel",
  uecl:       "uecl",
  facup:      "facup",
};


// ── Intricate animated background ───────────────────────────────────────────
function IntricateBg() {
  return (
    <div aria-hidden="true" style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:"#080808"}}/>
      {/* Radial glows */}
      <div style={{position:"absolute",top:"-20%",left:"20%",width:"70vw",height:"70vw",
        background:"radial-gradient(ellipse,rgba(255,255,255,.018) 0%,transparent 60%)",transform:"rotate(-12deg)"}}/>
      <div style={{position:"absolute",bottom:"-10%",right:"10%",width:"55vw",height:"55vw",
        background:"radial-gradient(ellipse,rgba(255,255,255,.012) 0%,transparent 55%)"}}/>
      {/* Fine grid */}
      <div style={{position:"absolute",inset:0,
        backgroundImage:"linear-gradient(rgba(255,255,255,.028) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.028) 1px,transparent 1px)",
        backgroundSize:"40px 40px"}}/>
      {/* Bold grid */}
      <div style={{position:"absolute",inset:0,
        backgroundImage:"linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px)",
        backgroundSize:"160px 160px"}}/>
      {/* SVG patterns */}
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="pr-slash" width="100" height="100" patternUnits="userSpaceOnUse">
            <line x1="0" y1="100" x2="100" y2="0" stroke="rgba(255,255,255,.012)" strokeWidth="0.7"/>
          </pattern>
          <pattern id="pr-dot" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="0.7" fill="rgba(255,255,255,.07)"/>
          </pattern>
          <pattern id="pr-diamond" width="60" height="60" patternUnits="userSpaceOnUse">
            <polygon points="30,2 58,30 30,58 2,30" fill="none" stroke="rgba(255,255,255,.016)" strokeWidth="0.6"/>
          </pattern>
          <pattern id="pr-hex" width="52" height="44" patternUnits="userSpaceOnUse">
            <polygon points="26,2 50,12 50,32 26,42 2,32 2,12" fill="none" stroke="rgba(255,255,255,.018)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pr-slash)"/>
        <rect width="100%" height="100%" fill="url(#pr-dot)"/>
        <rect x="0" y="0" width="40%" height="55%" fill="url(#pr-diamond)" opacity="0.7"/>
        <rect x="62%" y="50%" width="38%" height="50%" fill="url(#pr-hex)" opacity="0.6"/>
      </svg>
      {/* HUD corner brackets — all 4 */}
      <svg style={{position:"absolute",top:0,left:0,width:180,height:180,opacity:.1}} viewBox="0 0 180 180">
        <polyline points="12,70 12,12 70,12" fill="none" stroke="white" strokeWidth="1.2"/>
        <polyline points="12,90 12,12 90,12" fill="none" stroke="white" strokeWidth=".4"/>
        <circle cx="12" cy="12" r="2.5" fill="none" stroke="white" strokeWidth=".8"/>
      </svg>
      <svg style={{position:"absolute",top:0,right:0,width:180,height:180,opacity:.08}} viewBox="0 0 180 180">
        <polyline points="168,70 168,12 110,12" fill="none" stroke="white" strokeWidth="1.2"/>
        <polyline points="168,90 168,12 90,12" fill="none" stroke="white" strokeWidth=".4"/>
      </svg>
      <svg style={{position:"absolute",bottom:0,left:0,width:180,height:180,opacity:.07}} viewBox="0 0 180 180">
        <polyline points="12,110 12,168 70,168" fill="none" stroke="white" strokeWidth="1"/>
      </svg>
      <svg style={{position:"absolute",bottom:0,right:0,width:180,height:180,opacity:.07}} viewBox="0 0 180 180">
        <polyline points="168,110 168,168 110,168" fill="none" stroke="white" strokeWidth="1"/>
      </svg>
      {/* Ghost text */}
      <div style={{position:"absolute",top:"5vh",left:"-1%",fontFamily:"'Inter',sans-serif",fontWeight:900,
        fontSize:"clamp(80px,13vw,170px)",color:"rgba(255,255,255,.02)",lineHeight:1,userSelect:"none",letterSpacing:"-.05em"}}>xG</div>
      <div style={{position:"absolute",top:"42vh",right:"-1%",fontFamily:"'Inter',sans-serif",fontWeight:900,
        fontSize:"clamp(55px,9vw,130px)",color:"rgba(255,255,255,.015)",lineHeight:1,userSelect:"none",letterSpacing:"-.05em"}}>ELO</div>
      <div style={{position:"absolute",bottom:"6vh",left:"4%",fontFamily:"'Inter',sans-serif",fontWeight:900,
        fontSize:"clamp(40px,7vw,100px)",color:"rgba(255,255,255,.013)",lineHeight:1,userSelect:"none",letterSpacing:"-.04em"}}>1–0</div>
    </div>
  );
}


// ── Page Footer ──────────────────────────────────────────────────────────────
function PageFooter({isMobile}) {
  return (
    <footer style={{
      borderTop:"1px solid rgba(255,255,255,0.08)",
      marginTop:48,paddingTop:32,paddingBottom:max_pb,
      position:"relative",zIndex:2,
    }}>
      <div style={{
        display:"flex",flexDirection:isMobile?"column":"row",
        alignItems:isMobile?"flex-start":"center",
        justifyContent:"space-between",gap:isMobile?20:24,
      }}>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:3,height:22,background:"rgba(255,255,255,.7)",borderRadius:2}}/>
            <span style={{fontSize:20,fontWeight:900,color:"#ffffff",letterSpacing:"-.04em",fontFamily:"'Inter',sans-serif"}}>StatinSite</span>
          </div>
          <span style={{fontSize:11,color:"rgba(255,255,255,.35)",fontFamily:"'Inter',sans-serif",letterSpacing:".03em",paddingLeft:13}}>
            Football Intelligence · ELO · Dixon-Coles · xG
          </span>
        </div>
        <div style={{
          display:"flex",flexDirection:"column",alignItems:isMobile?"flex-start":"center",gap:4,
          padding:"14px 28px",border:"1px solid rgba(255,255,255,0.1)",
          borderRadius:10,background:"rgba(255,255,255,0.03)",
        }}>
          <div style={{fontSize:10,color:"rgba(255,255,255,.3)",letterSpacing:".14em",textTransform:"uppercase",fontFamily:"'Inter',sans-serif"}}>Built by</div>
          <div style={{fontSize:17,fontWeight:800,color:"#ffffff",letterSpacing:"-.02em",fontFamily:"'Inter',sans-serif"}}>Rutej Talati</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:isMobile?"flex-start":"flex-end",gap:5}}>
          <span style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,.55)",fontFamily:"'Inter',sans-serif"}}>statinsite.com</span>
          <span style={{fontSize:10,color:"rgba(255,255,255,.2)",fontFamily:"'Inter',sans-serif"}}>© 2025 StatinSite</span>
        </div>
      </div>
    </footer>
  );
}
const max_pb = 40;

export default function PredictionsPage({league:propLeague,slugMap}){
  const isMobile = useWindowWidth() < 640;
  const{league:paramLeague}=useParams();
  const navigate=useNavigate();
  const raw=paramLeague||propLeague||"premier-league";
  const DEFAULTS={"premier-league":"epl","la-liga":"laliga","serie-a":"seriea","ligue-1":"ligue1","champions-league":"ucl","europa-league":"uel","conference-league":"uecl","fa-cup":"facup","epl":"epl","laliga":"laliga","bundesliga":"bundesliga","seriea":"seriea","ligue1":"ligue1","ucl":"ucl","uel":"uel","uecl":"uecl","facup":"facup"};
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
    const apiLeague = BACKEND_LEAGUE[league] || league;
    cache("stn_v6_"+league,()=>getStandings(apiLeague),setStandings,setStandLoad,setStandErr);
    cache("pred_v6_"+league,()=>getLeaguePredictions(apiLeague),setMatches,setPredLoad,setPredErr);
    setSelectedMatch(null);
  },[league,cache]);

  const sorted=useMemo(()=>{if(!matches.length)return matches;return[...matches].sort((a,b)=>{if(sort==="confidence")return(b.confidence||0)-(a.confidence||0);if(sort==="date")return(a.date||"").localeCompare(b.date||"");if(sort==="home")return(b.p_home_win||0)-(a.p_home_win||0);return 0;});},[matches,sort]);


  const[predFilter,setPredFilter]=useState("all");
  const filtered=useMemo(()=>{
    if(predFilter==="all")return sorted;
    if(predFilter==="high")return sorted.filter(m=>m.confidence>=65);
    if(predFilter==="edge")return sorted.filter(m=>m.model_edge!=null&&Math.abs(m.model_edge)>=5);
    if(predFilter==="over25")return sorted.filter(m=>(m.over_2_5||0)>=0.6);
    if(predFilter==="btts")return sorted.filter(m=>(m.btts||0)>=0.55);
    if(predFilter==="upsets")return sorted.filter(m=>{
      const hp=m.p_home_win||0,ap=m.p_away_win||0;
      const fav=hp>ap?"home":"away";
      return(fav==="home"&&ap>0.35)||(fav==="away"&&hp>0.35);
    });
    return sorted;
  },[sorted,predFilter]);
  const homeWins=matches.filter(m=>m.p_home_win>m.p_away_win&&m.p_home_win>m.p_draw).length;
  const draws=matches.filter(m=>m.p_draw>=m.p_home_win&&m.p_draw>=m.p_away_win).length;
  const avgConf=matches.length?Math.round(matches.reduce((s,m)=>s+(m.confidence||0),0)/matches.length):0;
  const bttsCount=matches.filter(m=>(m.btts||0)>=0.55).length;
  const avgXgH=matches.length?(matches.reduce((s,m)=>s+(parseFloat(m.xg_home)||0),0)/matches.length).toFixed(2):"0.00";
  const avgXgA=matches.length?(matches.reduce((s,m)=>s+(parseFloat(m.xg_away)||0),0)/matches.length).toFixed(2):"0.00";

  return(
    <div className="sn-page-wrap" style={{background:"#080808",position:"relative",fontFamily:"'Inter',sans-serif",color:"#ffffff"}}>

      {/* ── Intricate Background ────────────────── */}
      <IntricateBg/>
      <div style={{position:"fixed",top:"50vh",right:"0%",fontFamily:"'Inter',sans-serif",fontSize:"clamp(70px,12vw,150px)",color:"rgba(255,255,255,.025)",pointerEvents:"none",zIndex:0,lineHeight:1,userSelect:"none"}}>2–1</div>

      <div style={{position:"relative",zIndex:1,maxWidth:1440,margin:"0 auto",padding:isMobile?"0 12px 80px":"0 24px 64px"}}>

        {/* -- HEADER ------------------------------------------ */}
        <div style={{padding:isMobile?"16px 0 14px":"28px 0 24px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:16,borderBottom:'1px solid rgba(255,255,255,0.2)'}}>

          {/* Title block */}
          <div style={{display:"flex",alignItems:"center",gap:0}}>
            {/* Black kicker pill */}
            <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6,padding:"4px 14px",marginRight:16,flexShrink:0}}>
              <span style={{width:6,height:6,background:"#ffffff",borderRadius:"50%",animation:"nbBlink 1.1s step-start infinite",flexShrink:0}}/>
              <span style={{fontFamily:"'Inter',sans-serif",fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:"#ffffff",fontWeight:600}}>PREDICTIONS</span>
            </div>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <LeagueFlag code={league} size={22}/>
                <h1 style={{
                  fontSize:isMobile?28:40,fontWeight:900,color:"#ffffff",
                  margin:0,letterSpacing:"-.02em",
                  fontFamily:"'Inter',sans-serif",
                }}>{T.label}</h1>
              </div>
              <p style={{
                fontSize:11,color:"rgba(255,255,255,.55)",margin:0,
                fontFamily:"'Inter',sans-serif",
                letterSpacing:"0.08em",textTransform:"uppercase",
              }}>ELO · DIXON-COLES · REAL xG · PRO DATA</p>
            </div>
          </div>

          {/* League nav pills */}
          <nav style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            {[
              {group:"domestic", label:"Domestic"},
              {group:"european", label:"European"},
              {group:"cup",      label:"Cup"},
            ].map(({group,label})=>{
              const groupTabs = LEAGUE_TABS.filter(t=>t.group===group);
              return groupTabs.length===0 ? null : (
                <div key={group} style={{display:"flex",alignItems:"center",gap:4,flexWrap:"nowrap"}}>
                  <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.4)",letterSpacing:"0.08em",textTransform:"uppercase",flexShrink:0,paddingRight:6,borderRight:"1px solid rgba(255,255,255,.1)",marginRight:4,fontFamily:"'Inter',sans-serif"}}>{label}</span>
                  {groupTabs.map(({code,slug,label:tabLabel})=>{
                    const active=league===code;
                    return(
                      <NavLink key={code} to={`/predictions/${slug}`} style={{
                        display:"flex",alignItems:"center",gap:7,
                        padding:"6px 13px",fontSize:12,fontWeight:600,borderRadius:8,
                        textDecoration:"none",whiteSpace:"nowrap",letterSpacing:"0.08em",textTransform:"uppercase",
                        border:`2px solid ${active?NB.y:"rgba(255,255,255,.2)"}`,
                        color:active?NB.k:NB.y,
                        background:active?"#ffffff":"transparent",
                        transition:"all 0.12s",
                        boxShadow:active?`3px 3px 0 rgba(255,255,255,.3)`:"none",
                        transform:active?"translate(-1px,-1px)":"none",
                        fontFamily:"'Inter',sans-serif",
                      }}
                        onMouseEnter={e=>{if(!active){e.currentTarget.style.background=NB.y;e.currentTarget.style.color=NB.k;e.currentTarget.style.transform="translate(-2px,-2px)";e.currentTarget.style.boxShadow=`4px 4px 0 rgba(255,255,255,.3)`;}}}
                        onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color=NB.y;e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}}
                      >
                        {(code==="epl"||code==="laliga"||code==="bundesliga"||code==="seriea"||code==="ligue1")&&<LeagueFlag code={code} size={14}/>}
                        {(code==="ucl")&&<img src="https://media.api-sports.io/football/leagues/2.png" style={{width:16,height:16,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
                        {(code==="uel")&&<img src="https://media.api-sports.io/football/leagues/3.png" style={{width:16,height:16,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
                        {(code==="uecl")&&<img src="https://media.api-sports.io/football/leagues/848.png" style={{width:16,height:16,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
                        {(code==="facup")&&<img src="https://media.api-sports.io/football/leagues/45.png" style={{width:16,height:16,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
                        {tabLabel}
                      </NavLink>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>



        {/* -- TAB BAR ---------------------------------------- */}
        <div style={{
          display:"flex",marginBottom:0,overflowX:"auto",
          WebkitOverflowScrolling:"touch",scrollbarWidth:"none",
          background:"rgba(10,10,10,0.95)",
          borderBottom:`3px solid ${NB.y}`,
          gap:0,
        }}>
          {[
            {key:"predictions",label:"Predictions",badge:!predLoad?matches.length:null},
            {key:"standings",label:"Table",badge:!standLoad?standings.length:null},
            {key:"scorers",label:"Scorers"},
            {key:"simulator",label:"Season Sim"},
            {key:"knockout",label:"Bracket",badge:null},
          ].map(({key,label,badge})=>(
            <button key={key} onClick={()=>setTab(key)} style={{
              display:"flex",alignItems:"center",gap:6,
              padding:"12px 22px",fontSize:12,fontWeight:600,
              cursor:"pointer",border:"none",whiteSpace:"nowrap",
              fontFamily:"'Inter',sans-serif",letterSpacing:"0.06em",textTransform:"uppercase",
              color:tab===key?"#0a0a0a":"rgba(255,255,255,0.7)",
              background:tab===key?"#ffffff":"transparent",
              borderRight:`1px solid rgba(255,255,255,.1)`,
              transition:"all 0.12s",
              position:"relative",
            }}>
              {label}
              {badge!=null&&(
                <span style={{
                  background:tab===key?"rgba(6,13,26,0.8)":"rgba(255,255,255,0.15)",
                  color:tab===key?"#ffffff":"rgba(255,255,255,0.8)",
                  borderRadius:999,
                  padding:"1px 7px",fontSize:11,
                  fontFamily:"'Inter',sans-serif",fontWeight:700,
                  marginLeft:4,
                }}>{badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* -- PREDICTIONS TAB -------------------------------- */}
        {tab==="predictions"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16,paddingTop:20,minWidth:0}}>



            {/* ── MAIN GRID ─────────────────────────────────────── */}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 260px",gap:16,alignItems:"start"}}>

              {/* LEFT: filters + prediction rows ─────────────── */}
              <div style={{display:"flex",flexDirection:"column",gap:12}}>

                {/* Filter + sort bar */}
                {!predLoad&&matches.length>0&&(
                  <div style={{
                    padding:"10px 14px",
                    background:"rgba(10,10,10,0.95)",border:`3px solid ${NB.y}`,
                    display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",
                    marginTop:16,
                  }}>
                    <span style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.6)",letterSpacing:"0.06em",textTransform:"uppercase",flexShrink:0,fontFamily:"'Inter',sans-serif"}}>Filter</span>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap",flex:1}}>
                      {[
                        {key:"all",   label:"All"},
                        {key:"high",  label:"High Conf"},
                        {key:"edge",  label:"Model Edge"},
                        {key:"over25",label:"O2.5"},
                        {key:"btts",  label:"BTTS"},
                        {key:"upsets",label:"Upsets"},
                      ].map(({key,label})=>(
                        <button key={key} onClick={()=>setPredFilter(key)} style={{
                          padding:"5px 13px",fontSize:11,fontWeight:600,cursor:"pointer",
                          letterSpacing:"0.04em",textTransform:"uppercase",
                          border:`2px solid ${predFilter===key?NB.y:"rgba(255,255,255,.2)"}`,
                          background:predFilter===key?NB.y:"transparent",
                          color:predFilter===key?NB.k:NB.y,
                          transition:"all 0.1s",fontFamily:"'Inter',sans-serif",
                        }}>{label}</button>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:4,borderLeft:`2px solid rgba(255,255,255,.15)`,paddingLeft:8}}>
                      {[["confidence","Conf"],["date","Date"],["home","Home%"]].map(([s,l])=>(
                        <button key={s} onClick={()=>setSort(s)} style={{
                          padding:"5px 10px",fontSize:11,fontWeight:600,cursor:"pointer",
                          background:sort===s?NB.y:"transparent",
                          border:`1px solid ${sort===s?NB.y:"rgba(255,255,255,.2)"}`,
                          color:sort===s?NB.k:NB.y,
                          transition:"all 0.1s",fontFamily:"'Inter',sans-serif",letterSpacing:"0.06em",
                        }}>{l}</button>
                      ))}
                    </div>
                    <span style={{fontSize:11,color:"rgba(255,255,255,.5)",fontFamily:"'Inter',sans-serif",flexShrink:0}}>{filtered.length}</span>
                  </div>
                )}

                {/* Column headers */}
                {!predLoad&&filtered.length>0&&(
                  <div style={{
                    display:"grid",
                    gridTemplateColumns:isMobile?"1fr":"1fr 180px 1fr 160px auto",
                    gap:0,padding:"5px 14px",marginTop:4,
                  }}>
                    {["Home","Probability","Away","Markets",""].map((h,i)=>(
                      <div key={i} style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.45)",letterSpacing:"0.06em",textTransform:"uppercase",textAlign:i===3?"left":i===4?"center":i===1?"center":i===2?"right":"left",fontFamily:"'Inter',sans-serif"}}>{h}</div>
                    ))}
                  </div>
                )}

                {/* Error */}
                {predErr&&(
                  <div style={{padding:"14px 18px",background:"rgba(255,50,50,0.06)",border:"1px solid rgba(255,50,50,0.15)",color:"rgba(255,100,100,0.8)",fontSize:13}}>{predErr}</div>
                )}

                {/* Skeletons */}
                {predLoad&&(
                  <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:16}}>
                    {Array.from({length:6}).map((_,i)=>(
                      <div key={i} style={{height:68,background:`rgba(255,255,255,.04)`,border:`2px solid rgba(255,255,255,.1)`,animation:"nbPulse 1.5s ease infinite",animationDelay:`${i*0.08}s`}}/>
                    ))}
                  </div>
                )}

                {!predLoad&&!predErr&&filtered.length===0&&(
                  <div style={{padding:48,textAlign:"center",color:`rgba(255,255,255,.7)`,fontSize:13}}>
                    <div style={{width:40,height:40,borderRadius:8,background:"rgba(255,255,255,.05)",border:`1px solid rgba(255,255,255,.1)`,margin:"0 auto 12px"}}/>
                    No fixtures match this filter.
                  </div>
                )}

                {/* Prediction rows */}
                {!predLoad&&!predErr&&(
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {filtered.map((m,i)=>(
                      <PredRow
                        key={(m.home_team||"")+(m.away_team||"")+i}
                        match={m} T={T} index={i}
                        onSelect={()=>setSelectedMatch(m)}
                        isSelected={selectedMatch===m}
                        navigate={navigate}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* RIGHT SIDEBAR ──────────────────────────────── */}
              <div style={{position:"sticky",top:"calc(var(--bar-total,84px) + 16px)",display:"flex",flexDirection:"column",gap:12}}>

                {/* Scenario simulator */}
                <ScenarioSimulator match={selectedMatch||sorted[0]} T={T}/>

                {/* Intelligence panels */}
                {!predLoad&&matches.length>0&&(
                  <>
                    {/* Top confidence */}
                    <div style={{background:"rgba(10,10,10,0.95)",border:`3px solid ${NB.y}`,padding:"14px 15px",overflow:"hidden"}}>
                      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",color:"rgba(255,255,255,.65)",textTransform:"uppercase",marginBottom:12,fontFamily:"'Inter',sans-serif"}}>
                        Top Confidence
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        {[...matches].sort((a,b)=>(b.confidence||0)-(a.confidence||0)).slice(0,4).map((m,i)=>(
                          <SidebarMatchRow key={i} match={m} T={T} navigate={navigate}/>
                        ))}
                      </div>
                    </div>

                    {/* Model edges */}
                    {matches.some(m=>m.model_edge!=null)&&(
                      <div style={{background:"rgba(10,10,10,0.95)",border:`3px solid ${NB.y}`,padding:"14px 15px"}}>
                        <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",color:"rgba(255,255,255,.65)",textTransform:"uppercase",marginBottom:12,fontFamily:"'Inter',sans-serif"}}>Best Edges</div>
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          {[...matches].filter(m=>m.model_edge!=null).sort((a,b)=>Math.abs(b.model_edge)-Math.abs(a.model_edge)).slice(0,3).map((m,i)=>(
                            <SidebarMatchRow key={i} match={m} T={T} navigate={navigate} showEdge/>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Goal heavy */}
                    <div style={{background:"rgba(10,10,10,0.95)",border:`3px solid ${NB.y}`,padding:"14px 15px"}}>
                      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",color:"rgba(255,255,255,.65)",textTransform:"uppercase",marginBottom:12,fontFamily:"'Inter',sans-serif"}}>Goal Heavy</div>
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        {[...matches].sort((a,b)=>((parseFloat(b.xg_home)||0)+(parseFloat(b.xg_away)||0))-((parseFloat(a.xg_home)||0)+(parseFloat(a.xg_away)||0))).slice(0,3).map((m,i)=>(
                          <SidebarMatchRow key={i} match={m} T={T} navigate={navigate} showXg/>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* -- STANDINGS TAB ---------------------------------- */}
        {tab==="standings"&&(
          <div>
            {standErr
              ? <div style={{padding:20,color:"rgba(248,113,113,0.8)",fontSize:13}}>{standErr}</div>
              : <StandingsTable rows={standings} loading={standLoad} T={T}/>
            }
          </div>
        )}

        {/* -- SCORERS TAB ------------------------------------ */}
        {tab==="scorers"&&(
          <div style={{maxWidth:640}}>
            <ScorersWidget league={league} T={T}/>
          </div>
        )}

        {/* -- SEASON SIM TAB --------------------------------- */}
        {tab==="simulator"&&(
          <SeasonSimulatorTab standings={standings} standLoad={standLoad} league={league} T={T}/>
        )}

      </div>


        {/* -- KNOCKOUT BRACKET TAB */}
        {tab==="knockout"&&(
          <div>
            {!BRACKET_ROUNDS[league]&&(
              <div style={{padding:40,textAlign:"center",color:`rgba(255,255,255,.7)`,fontSize:13}}>
                Knockout bracket not available for {T.label}.
              </div>
            )}
            {BRACKET_ROUNDS[league]&&(
              <KnockoutBracketTab league={league} T={T}/>
            )}
          </div>
        )}

      <PageFooter isMobile={isMobile}/>

      {/* -- Page-specific CSS --------------------------------------- */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;700;900&family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700;900&family=Sora:wght@700;900&display=swap');
        @keyframes nbPulse  { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes nbBlink  { 50%{opacity:0} }
        @keyframes nbStripes{ to{background-position:90px 0} } @keyframes hp6FadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        input[type=range]   { height:4px; border-radius:0; outline:none; accent-color:#ffffff; }
        ::selection         { background:#ffffff; color:#0a0a0a; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:rgba(10,10,10,0.8); }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.3); }
      `}</style>
    </div>
  );
}