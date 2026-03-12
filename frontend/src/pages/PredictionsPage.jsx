// PredictionsPage.jsx — StatinSite v6
// VS Split Cards · League Themes · Floating Simulator · Key Players · Charts
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, NavLink, useNavigate } from "react-router-dom";
import {
  getStandings, getLeaguePredictions, getTopScorers, getTopAssists,
  getLeagueInjuries, getH2H, getFixtureOdds, getSeasonSimulation,
} from "../api/api";

/* ----------------------------------------------------------
   UNIFIED THEME — Professional monochrome + accent system
   Home: #E8F4FD (cool white-blue)  Away: #10B981 (emerald)
   Accent: #6366F1 (indigo) for highlights / selected states
---------------------------------------------------------- */
const UNIFIED = {
  bg:"#000000",
  grad:"radial-gradient(ellipse at 20% 10%,rgba(99,102,241,0.07) 0%,transparent 55%),radial-gradient(ellipse at 80% 90%,rgba(16,185,129,0.05) 0%,transparent 55%)",
  accent:"#818CF8",        // soft indigo — selected, FAV, active highlights
  accent2:"#F87171",       // soft red — relegation, negative
  mid:"rgba(255,255,255,0.55)",
  panel:"rgba(255,255,255,0.04)",
  border:"rgba(255,255,255,0.08)",
  borderHi:"rgba(129,140,248,0.35)",
  text:"rgba(255,255,255,0.92)",
  muted:"rgba(255,255,255,0.3)",
  faint:"rgba(255,255,255,0.04)",
  homeCol:"#E2E8F0",        // near-white slate — home team (neutral, clean)
  awayCol:"#10B981",        // emerald green — away team (professional, distinct)
  label:"",
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
};

const THEMES = Object.fromEntries(
  Object.entries(LEAGUE_LABELS).map(([code,label])=>[code,{...UNIFIED,label}])
);

const LEAGUE_TABS = [
  {code:"epl",slug:"premier-league",label:"Premier League"},
  {code:"laliga",slug:"la-liga",label:"La Liga"},
  {code:"bundesliga",slug:"bundesliga",label:"Bundesliga"},
  {code:"seriea",slug:"serie-a",label:"Serie A"},
  {code:"ligue1",slug:"ligue-1",label:"Ligue 1"},
];

/* ----------------------------------------------------------
   TASK 3 — KEY PLAYERS DATA
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
    W:{bg:`${T.accent}28`,c:T.accent,b:`${T.accent}60`,shadow:`0 0 8px ${T.accent}40`},
    D:{bg:"rgba(255,255,255,0.08)",c:"rgba(255,255,255,0.5)",b:"rgba(255,255,255,0.15)",shadow:"none"},
    L:{bg:`${T.accent2}20`,c:T.accent2,b:`${T.accent2}50`,shadow:`0 0 8px ${T.accent2}30`},
  }[r]||{bg:"rgba(255,255,255,0.06)",c:"rgba(255,255,255,0.3)",b:"rgba(255,255,255,0.10)",shadow:"none"};
  return(
    <span style={{
      display:"inline-flex",alignItems:"center",justifyContent:"center",
      width:22,height:22,borderRadius:7,fontSize:9,fontWeight:800,
      fontFamily:"'SF Mono','JetBrains Mono',monospace",
      background:s.bg,color:s.c,border:`1px solid ${s.b}`,
      boxShadow:s.shadow,letterSpacing:"0.02em",
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
            textAnchor="middle" fontFamily="'SF Mono','JetBrains Mono',monospace">
            {typeof value==="number"?value.toFixed(1):value}
          </text>
        </svg>
      </div>
      <span style={{fontSize:8,fontWeight:600,color:"rgba(255,255,255,0.28)",letterSpacing:"0.08em",textTransform:"uppercase",fontFamily:"'Inter',sans-serif"}}>{label}</span>
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
  const fmt=fmtFn||(v=>v!=null?typeof v==="number"?v.toFixed(1):v:"—");
  const noData=hNull&&aNull;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:5}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:700,color:hNull?"rgba(255,255,255,0.18)":T.homeCol,fontFamily:"'SF Mono','JetBrains Mono',monospace"}}>{hNull?"—":fmt(h)}</span>
        <span style={{fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.3)",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'Inter',sans-serif"}}>{label}</span>
        <span style={{fontSize:13,fontWeight:700,color:aNull?"rgba(255,255,255,0.18)":T.awayCol,fontFamily:"'SF Mono','JetBrains Mono',monospace"}}>{aNull?"—":fmt(a)}</span>
      </div>
      <div style={{display:"flex",height:5,borderRadius:999,overflow:"hidden",background:"rgba(255,255,255,0.05)"}}>
        {noData
          ? <div style={{flex:1,background:"rgba(255,255,255,0.06)",borderRadius:999}}/>
          : <>
              <div style={{flex:hp,background:`linear-gradient(90deg,${T.homeCol}99,${T.homeCol})`,borderRadius:"999px 0 0 999px",transition:"flex 0.4s ease"}}/>
              <div style={{flex:ap,background:`linear-gradient(90deg,${T.awayCol},${T.awayCol}99)`,borderRadius:"0 999px 999px 0",transition:"flex 0.4s ease"}}/>
            </>
        }
      </div>
    </div>
  );
};

/* --- iOS Score Grid --------------------------------------- */
const ScoreGrid=({topScores,T})=>{
  if(!topScores?.length)return<div style={{padding:20,textAlign:"center",color:"rgba(255,255,255,0.2)",fontSize:12}}>No score data</div>;
  const G=5,pm={};let mx=0;
  topScores.forEach(({score,prob})=>{const[hg,ag]=score.split("-").map(Number);if(hg<G&&ag<G){pm[`${hg}-${ag}`]=prob;if(prob>mx)mx=prob;}});
  return(
    <div>
      <div style={{fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.25)",letterSpacing:"0.12em",marginBottom:12,fontFamily:"'Inter',sans-serif"}}>SCORE MATRIX — Home ? Away ?</div>
      <div style={{display:"grid",gridTemplateColumns:"20px repeat(5,1fr)",gap:4}}>
        <div/>
        {[0,1,2,3,4].map(ag=><div key={ag} style={{textAlign:"center",fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.3)",fontFamily:"'SF Mono','JetBrains Mono',monospace"}}>{ag}</div>)}
        {[0,1,2,3,4].map(hg=>[
          <div key={"r"+hg} style={{display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.3)",fontFamily:"'SF Mono','JetBrains Mono',monospace"}}>{hg}</div>,
          ...[0,1,2,3,4].map(ag=>{
            const p=pm[`${hg}-${ag}`]||0,pct=Math.round(p*100),isTop=p===mx&&mx>0;
            const alpha=mx>0?Math.min(p/mx,1):0;
            return(
              <div key={`${hg}-${ag}`} style={{
                aspectRatio:"1",minHeight:30,display:"flex",alignItems:"center",justifyContent:"center",
                borderRadius:8,fontSize:9,fontWeight:700,
                background:isTop?`${T.accent}28`:`rgba(255,255,255,${(alpha*.15+.03).toFixed(2)})`,
                color:isTop?T.accent:"rgba(255,255,255,0.55)",
                fontFamily:"'SF Mono','JetBrains Mono',monospace",
                border:isTop?`1px solid ${T.accent}50`:"1px solid rgba(255,255,255,0.05)",
                boxShadow:isTop?`0 0 10px ${T.accent}30`:"none",
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
  if(loading)return<div style={{height:100,borderRadius:14,background:"rgba(255,255,255,0.03)",animation:"pulse 1.5s ease infinite"}}/>;
  if(!data?.results?.length)return<div style={{padding:20,textAlign:"center",color:"rgba(255,255,255,0.2)",fontSize:12}}>No H2H data available</div>;
  const res=data.results;let hw=0,dw=0,aw=0;
  res.forEach(r=>{const isHome=r.home_team===homeTeam;if(r.home_goals>r.away_goals){if(isHome)hw++;else aw++;}else if(r.home_goals===r.away_goals)dw++;else{if(isHome)aw++;else hw++;}});
  const tot=hw+dw+aw||1;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Summary pills */}
      <div style={{display:"flex",gap:8}}>
        {[{label:(homeTeam||"").split(" ").slice(-1)[0],val:hw,col:T.homeCol},{label:"Draw",val:dw,col:"rgba(255,255,255,0.4)"},{label:(awayTeam||"").split(" ").slice(-1)[0],val:aw,col:T.awayCol}].map(({label,val,col})=>(
          <div key={label} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"12px 8px",borderRadius:14,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
            <span style={{fontSize:26,fontWeight:800,color:col,fontFamily:"'SF Mono','JetBrains Mono',monospace",lineHeight:1}}>{val}</span>
            <span style={{fontSize:9,color:"rgba(255,255,255,0.3)",fontFamily:"'Inter',sans-serif"}}>{label.slice(0,8)}</span>
            <span style={{fontSize:10,fontWeight:700,color:col,fontFamily:"'SF Mono','JetBrains Mono',monospace"}}>{Math.round(val/tot*100)}%</span>
          </div>
        ))}
      </div>
      {/* Bar */}
      <div style={{display:"flex",height:6,borderRadius:999,overflow:"hidden",background:"rgba(255,255,255,0.05)"}}>
        <div style={{flex:hw,background:T.homeCol,opacity:.85,transition:"flex 0.5s ease"}}/>
        <div style={{flex:dw,background:"rgba(255,255,255,0.15)"}}/>
        <div style={{flex:aw,background:T.awayCol,opacity:.85,transition:"flex 0.5s ease"}}/>
      </div>
      {/* Recent results */}
      <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:200,overflowY:"auto"}}>
        {res.slice(0,6).map((r,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:10,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)"}}>
            <span style={{fontSize:9,color:"rgba(255,255,255,0.25)",minWidth:70,fontFamily:"'SF Mono','JetBrains Mono',monospace"}}>{r.date}</span>
            <span style={{flex:1,fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.6)",textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.home_team}</span>
            <span style={{padding:"3px 10px",borderRadius:8,background:"rgba(255,255,255,0.06)",fontSize:12,fontWeight:800,color:"rgba(255,255,255,0.9)",fontFamily:"'SF Mono','JetBrains Mono',monospace",minWidth:44,textAlign:"center",border:"1px solid rgba(255,255,255,0.08)"}}>{r.home_goals}–{r.away_goals}</span>
            <span style={{flex:1,fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.6)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.away_team}</span>
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
  if(!odds?.bookmakers?.length)return<div style={{padding:20,textAlign:"center",color:"rgba(255,255,255,0.2)",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><div style={{width:12,height:12,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.15)",borderTopColor:T.accent,animation:"spin 0.8s linear infinite"}}/> Loading odds…</div>;
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
            <div key={label} style={{flex:1,display:"flex",flexDirection:"column",gap:6,alignItems:"center",padding:"14px 8px",borderRadius:16,background:hasEdge&&diff>0?`${T.accent}0c`:"rgba(255,255,255,0.04)",border:`1px solid ${hasEdge&&diff>0?T.accent+"30":"rgba(255,255,255,0.07)"}`,transition:"all 0.2s"}}>
              <span style={{fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.35)",fontFamily:"'Inter',sans-serif"}}>{label}</span>
              <span style={{fontSize:26,fontWeight:700,color:"rgba(255,255,255,0.9)",fontFamily:"'SF Mono','JetBrains Mono',monospace",lineHeight:1}}>{odd||"—"}</span>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                <span style={{fontSize:9,color:"rgba(255,255,255,0.25)"}}>Implied {implied}%</span>
                <span style={{fontSize:10,fontWeight:700,color:T.accent}}>Model {model}%</span>
              </div>
              {hasEdge&&<span style={{fontSize:10,fontWeight:800,color:diff>0?T.accent:T.accent2,background:`${diff>0?T.accent:T.accent2}18`,padding:"3px 9px",borderRadius:999,border:`1px solid ${diff>0?T.accent:T.accent2}35`}}>{diff>0?"+":""}{diff}% edge</span>}
            </div>
          );
        })}
      </div>
      <div style={{fontSize:9,color:"rgba(255,255,255,0.2)",textAlign:"center",fontFamily:"'Inter',sans-serif"}}>{bk.name}</div>
    </div>
  );
};

/* ----------------------------------------------------------
   iOS MATCH CARD — frosted glass, big rounded corners,
   clean VS split, smooth probability bars
---------------------------------------------------------- */
const MatchCard=({match,T,injuries,onSelect,isSelected,navigate})=>{
  const isMobile=useWindowWidth()<640;
  const[open,setOpen]=useState(false);
  const[activeTab,setActiveTab]=useState("stats");
  const hp=match.p_home_win||0,dp=match.p_draw||0,ap=match.p_away_win||0;
  const fav=hp>ap&&hp>dp?"home":ap>hp&&ap>dp?"away":"draw";
  const{day,date,time}=fmtDate(match.date);
  const hForm=parseForm(match.home_form),aForm=parseForm(match.away_form);
  const xgH=parseFloat(match.xg_home)||0,xgA=parseFloat(match.xg_away)||0;
  const bttsPct=Math.round((match.btts||0)*100),o25=Math.round((match.over_2_5||0)*100),conf=Math.round(match.confidence||0);
  const confLabel=conf>=72?"Strong":conf>=52?"Moderate":conf>=36?"Uncertain":"Low";
  const confColor=conf>=72?T.accent:conf>=52?"rgba(255,200,80,0.9)":conf>=36?"rgba(255,150,50,0.8)":"rgba(255,255,255,0.3)";
  const homePlayrs=getKeyPlayers(match.home_team),awayPlayrs=getKeyPlayers(match.away_team);
  const hS=match.home_stats||{},aS=match.away_stats||{};
  const hP=(hS.played_home||0)+(hS.played_away||0)||1,aP=(aS.played_home||0)+(aS.played_away||0)||1;
  const TABS=[{id:"stats",label:"Stats"},{id:"players",label:"Players"},{id:"h2h",label:"H2H"},{id:"odds",label:"Odds"},{id:"grid",label:"Grid"}];

  return(
    <div
      onClick={()=>onSelect&&onSelect()}
      style={{
        background: isSelected
          ? `linear-gradient(145deg, ${T.accent}0a 0%, rgba(0,0,0,0.95) 100%)`
          : "rgba(0,0,0,0.75)",
        backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
        borderRadius:20,overflow:"hidden",
        border:`1px solid ${isSelected?T.accent+"50":"rgba(255,255,255,0.08)"}`,
        boxShadow: isSelected
          ? `0 0 0 1px ${T.accent}25, 0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)`
          : `0 2px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`,
        transition:"all 0.25s cubic-bezier(.22,1,.36,1)",
        cursor:"pointer",
      }}
      onMouseEnter={e=>{if(!isSelected){e.currentTarget.style.borderColor="rgba(255,255,255,0.14)";e.currentTarget.style.transform="translateY(-1px)";}}}
      onMouseLeave={e=>{if(!isSelected){e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";e.currentTarget.style.transform="";}}}
    >
      {/* -- TOP BAR: date + selected badge + toggle */}
      <div style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"10px 16px",
        background:"rgba(255,255,255,0.03)",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:11,fontWeight:700,color:T.accent,fontFamily:"'SF Mono','JetBrains Mono',monospace"}}>{day}</span>
            <span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.7)",fontFamily:"'Inter',sans-serif"}}>{date}</span>
            {time&&<span style={{fontSize:11,color:"rgba(255,255,255,0.3)",fontFamily:"'SF Mono','JetBrains Mono',monospace"}}>{time}</span>}
          </div>
          {/* Confidence badge */}
          <div style={{display:"flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:999,background:`${confColor}14`,border:`1px solid ${confColor}30`}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:confColor,boxShadow:`0 0 6px ${confColor}`}}/>
            <span style={{fontSize:9,fontWeight:700,color:confColor,fontFamily:"'Inter',sans-serif"}}>{confLabel}</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {isSelected&&<span style={{fontSize:8,fontWeight:700,color:T.accent,background:`${T.accent}18`,border:`1px solid ${T.accent}35`,padding:"3px 9px",borderRadius:999,letterSpacing:"0.05em",fontFamily:"'Inter',sans-serif"}}>SELECTED</span>}
          <button
            onClick={e=>{e.stopPropagation();setOpen(o=>!o);}}
            style={{
              background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:8,color:"rgba(255,255,255,0.5)",fontSize:10,fontWeight:600,
              padding:"4px 10px",cursor:"pointer",transition:"all 0.15s",fontFamily:"'Inter',sans-serif",
              display:"flex",alignItems:"center",gap:4,
            }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.1)";e.currentTarget.style.color="rgba(255,255,255,0.8)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color="rgba(255,255,255,0.5)";}}
          >
            {open
              ? <><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 7l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Less</>
              : <><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Details</>
            }
          </button>
        </div>
      </div>

      {/* -- VS SPLIT */}
      <div style={{display:isMobile?"flex":"grid",flexDirection:"column",gridTemplateColumns:isMobile?"1fr":"1fr 170px 1fr",gap:0,minWidth:0,overflowX:"hidden"}}>

        {/* HOME */}
        <div style={{padding:"16px 14px",background:`linear-gradient(160deg,${T.homeCol}07 0%,transparent 70%)`,minWidth:0,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            {match.home_logo&&<div style={{width:36,height:36,borderRadius:11,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,padding:4}}>
              <img src={match.home_logo} alt="" style={{width:26,height:26,objectFit:"contain"}} onError={e=>{e.currentTarget.parentElement.style.display="none";}}/>
            </div>}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:fav==="home"?T.homeCol:"rgba(255,255,255,0.88)",fontFamily:"'Inter',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"-0.01em"}}>{match.home_team}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.25)",marginTop:1,fontFamily:"'Inter',sans-serif",letterSpacing:"0.08em"}}>HOME</div>
            </div>
            {fav==="home"&&<span style={{fontSize:7,fontWeight:700,color:T.accent,background:`${T.accent}18`,border:`1px solid ${T.accent}35`,padding:"2px 6px",borderRadius:999,flexShrink:0,fontFamily:"'Inter',sans-serif"}}>FAV</span>}
          </div>
          {/* Form */}
          <div style={{display:"flex",gap:3,marginBottom:12,flexWrap:"wrap"}}>{hForm.slice(-5).map((r,i)=><FormPip key={i} r={r} T={T}/>)}</div>
          {/* Donuts */}
          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:12}}>
            <MiniDonut value={xgH} max={3} color={T.homeCol} size={48} label="xG"/>
            <MiniDonut value={hS.shots_pg>0?hS.shots_pg:0} max={20} color={T.homeCol} size={48} label="Shots"/>
            <MiniDonut value={hS.possession_avg>0?hS.possession_avg:0} max={100} color={T.homeCol} size={48} label="Poss"/>
          </div>
          {/* Win prob bar */}
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:9,color:"rgba(255,255,255,0.25)",fontFamily:"'Inter',sans-serif"}}>Win prob</span>
              <span style={{fontSize:15,fontWeight:700,color:T.homeCol,fontFamily:"'SF Mono','JetBrains Mono',monospace"}}>{Math.round(hp*100)}%</span>
            </div>
            <div style={{height:4,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
              <div style={{width:`${Math.round(hp*100)}%`,height:"100%",borderRadius:999,background:`linear-gradient(90deg,${T.homeCol}aa,${T.homeCol})`,boxShadow:`0 0 8px ${T.homeCol}50`,transition:"width 0.6s cubic-bezier(.22,1,.36,1)"}}/>
            </div>
          </div>
        </div>

        {/* CENTER */}
        <div style={{
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          padding:"18px 8px",
          borderLeft:"1px solid rgba(255,255,255,0.06)",
          borderRight:"1px solid rgba(255,255,255,0.06)",
          gap:10,
          background:"rgba(255,255,255,0.02)",
        }}>
          {/* Score */}
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:28,fontWeight:700,letterSpacing:"0.06em",lineHeight:1,fontFamily:"'SF Mono','JetBrains Mono',monospace",color:"rgba(255,255,255,0.92)"}}>{match.most_likely_score||"?–?"}</div>
            <div style={{fontSize:8,color:"rgba(255,255,255,0.2)",letterSpacing:"0.12em",marginTop:4,fontFamily:"'Inter',sans-serif"}}>PREDICTED</div>
          </div>
          {/* H D A pills */}
          <div style={{display:"flex",gap:3,width:"100%"}}>
            {[{l:"H",v:Math.round(hp*100),c:T.homeCol},{l:"D",v:Math.round(dp*100),c:"rgba(255,255,255,0.4)"},{l:"A",v:Math.round(ap*100),c:T.awayCol}].map(({l,v,c})=>(
              <div key={l} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 2px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)"}}>
                <span style={{fontSize:7,color:"rgba(255,255,255,0.25)",fontFamily:"'Inter',sans-serif"}}>{l}</span>
                <span style={{fontSize:12,fontWeight:700,color:c,fontFamily:"'SF Mono','JetBrains Mono',monospace"}}>{v}%</span>
              </div>
            ))}
          </div>
          {/* Tricolor bar */}
          <div style={{display:"flex",height:4,width:"100%",borderRadius:999,overflow:"hidden",background:"rgba(255,255,255,0.04)"}}>
            <div style={{flex:hp,background:T.homeCol,opacity:.85}}/><div style={{flex:dp,background:"rgba(255,255,255,0.2)"}}/><div style={{flex:ap,background:T.awayCol,opacity:.85}}/>
          </div>
          {/* BTTS / O2.5 / Conf */}
          {[{l:"BTTS",v:`${bttsPct}%`,hi:bttsPct>=55},{l:"O2.5",v:`${o25}%`,hi:o25>=60}].map(({l,v,hi})=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",padding:"5px 8px",borderRadius:8,background:hi?`${T.accent}0e`:"rgba(255,255,255,0.03)",border:`1px solid ${hi?T.accent+"28":"rgba(255,255,255,0.05)"}`}}>
              <span style={{fontSize:8,fontWeight:600,color:"rgba(255,255,255,0.3)",letterSpacing:"0.08em",fontFamily:"'Inter',sans-serif"}}>{l}</span>
              <span style={{fontSize:11,fontWeight:700,color:hi?T.accent:"rgba(255,255,255,0.6)",fontFamily:"'SF Mono','JetBrains Mono',monospace"}}>{v}</span>
            </div>
          ))}
        </div>

        {/* AWAY */}
        <div style={{padding:"16px 14px",background:`linear-gradient(200deg,${T.awayCol}07 0%,transparent 70%)`,minWidth:0,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexDirection:"row-reverse"}}>
            {match.away_logo&&<div style={{width:36,height:36,borderRadius:11,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,padding:4}}>
              <img src={match.away_logo} alt="" style={{width:26,height:26,objectFit:"contain"}} onError={e=>{e.currentTarget.parentElement.style.display="none";}}/>
            </div>}
            <div style={{flex:1,minWidth:0,textAlign:"right"}}>
              <div style={{fontSize:13,fontWeight:700,color:fav==="away"?T.awayCol:"rgba(255,255,255,0.88)",fontFamily:"'Inter',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"-0.01em"}}>{match.away_team}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.25)",marginTop:1,fontFamily:"'Inter',sans-serif",letterSpacing:"0.08em"}}>AWAY</div>
            </div>
            {fav==="away"&&<span style={{fontSize:7,fontWeight:700,color:T.accent2,background:`${T.accent2}18`,border:`1px solid ${T.accent2}35`,padding:"2px 6px",borderRadius:999,flexShrink:0,fontFamily:"'Inter',sans-serif"}}>FAV</span>}
          </div>
          <div style={{display:"flex",gap:3,marginBottom:12,flexWrap:"wrap",justifyContent:"flex-end"}}>{aForm.slice(-5).map((r,i)=><FormPip key={i} r={r} T={T}/>)}</div>
          <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:12,justifyContent:"flex-end"}}>
            <MiniDonut value={aS.possession_avg>0?aS.possession_avg:0} max={100} color={T.awayCol} size={48} label="Poss"/>
            <MiniDonut value={aS.shots_pg>0?aS.shots_pg:0} max={20} color={T.awayCol} size={48} label="Shots"/>
            <MiniDonut value={xgA} max={3} color={T.awayCol} size={48} label="xG"/>
          </div>
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontSize:15,fontWeight:700,color:T.awayCol,fontFamily:"'SF Mono','JetBrains Mono',monospace"}}>{Math.round(ap*100)}%</span>
              <span style={{fontSize:9,color:"rgba(255,255,255,0.25)",fontFamily:"'Inter',sans-serif"}}>Win prob</span>
            </div>
            <div style={{height:4,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
              <div style={{width:`${Math.round(ap*100)}%`,height:"100%",borderRadius:999,background:`linear-gradient(90deg,${T.awayCol},${T.awayCol}aa)`,boxShadow:`0 0 8px ${T.awayCol}50`,transition:"width 0.6s cubic-bezier(.22,1,.36,1)",marginLeft:"auto"}}/>
            </div>
          </div>
        </div>
      </div>

      {/* -- EXPANDABLE DETAIL PANEL */}
      {open&&(
        <div style={{borderTop:"1px solid rgba(255,255,255,0.07)"}} onClick={e=>e.stopPropagation()}>
          {/* Tab bar */}
          <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,0.06)",overflowX:"auto",background:"rgba(0,0,0,0.3)"}}>
            {TABS.map(({id,label})=>(
              <button key={id} onClick={()=>setActiveTab(id)} style={{
                padding:"11px 16px",fontSize:11,fontWeight:600,cursor:"pointer",
                background:"none",border:"none",whiteSpace:"nowrap",
                fontFamily:"'Inter',sans-serif",letterSpacing:"0.02em",
                color:activeTab===id?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.3)",
                borderBottom:`2px solid ${activeTab===id?T.accent:"transparent"}`,
                transition:"all 0.15s",
              }}>{label}</button>
            ))}
          </div>
          {/* Tab content */}
          <div style={{padding:"18px 16px"}}>
            {activeTab==="stats"&&(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{fontSize:12,fontWeight:700,color:T.homeCol,fontFamily:"'Inter',sans-serif"}}>{(match.home_team||"").split(" ").pop()}</span>
                  <span style={{fontSize:12,fontWeight:700,color:T.awayCol,fontFamily:"'Inter',sans-serif"}}>{(match.away_team||"").split(" ").pop()}</span>
                </div>
                {[
                  {
                    l:"Goals / Game",
                    hv:hP>1?((hS.scored_home||0)+(hS.scored_away||0))/hP:null,
                    av:aP>1?((aS.scored_home||0)+(aS.scored_away||0))/aP:null,
                    fmt:v=>v!=null?v.toFixed(2):"—"
                  },
                  {l:"xG",hv:xgH||null,av:xgA||null,fmt:v=>v!=null?v.toFixed(2):"—"},
                  {
                    l:"Shots / Game",
                    hv:hS.shots_pg>0?hS.shots_pg:null,
                    av:aS.shots_pg>0?aS.shots_pg:null,
                    fmt:v=>v!=null?v.toFixed(1):"—"
                  },
                  {
                    l:"On Target %",
                    hv:hS.shots_on_target_pct>0?hS.shots_on_target_pct:null,
                    av:aS.shots_on_target_pct>0?aS.shots_on_target_pct:null,
                    fmt:v=>v!=null?v.toFixed(0)+"%":"—"
                  },
                  {
                    l:"Possession",
                    hv:hS.possession_avg>0&&hS.possession_avg!==50?hS.possession_avg:null,
                    av:aS.possession_avg>0&&aS.possession_avg!==50?aS.possession_avg:null,
                    fmt:v=>v!=null?v+"%":"—"
                  },
                  {
                    l:"Pass Accuracy",
                    hv:hS.pass_accuracy>0?hS.pass_accuracy:null,
                    av:aS.pass_accuracy>0?aS.pass_accuracy:null,
                    fmt:v=>v!=null?v.toFixed(0)+"%":"—"
                  },
                  {
                    l:"Clean Sheets",
                    hv:hS.clean_sheets!=null?hS.clean_sheets:null,
                    av:aS.clean_sheets!=null?aS.clean_sheets:null,
                    fmt:v=>v!=null?String(v):"—"
                  },
                ].map(({l,hv,av,fmt})=><VersusBar key={l} label={l} hv={hv} av={av} T={T} fmtFn={fmt}/>)}
              </div>
            )}
            {activeTab==="players"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                {[{team:match.home_team,players:homePlayrs,col:T.homeCol,side:"HOME"},{team:match.away_team,players:awayPlayrs,col:T.awayCol,side:"AWAY"}].map(({team,players,col,side})=>(
                  <div key={side}>
                    <div style={{fontSize:9,fontWeight:700,color:col,letterSpacing:"0.1em",marginBottom:10,fontFamily:"'Inter',sans-serif"}}>{side} · WATCH</div>
                    <div style={{display:"flex",flexDirection:"column",gap:7}}>
                      {players.map((p,i)=>(
                        <div key={i} onClick={()=>navigate(`/player?search=${encodeURIComponent(p.name)}`)}
                          style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,background:`${col}08`,border:`1px solid ${col}18`,cursor:"pointer",transition:"all 0.18s"}}
                          onMouseEnter={e=>{e.currentTarget.style.background=`${col}14`;e.currentTarget.style.borderColor=`${col}40`;e.currentTarget.style.transform="translateX(2px)";}}
                          onMouseLeave={e=>{e.currentTarget.style.background=`${col}08`;e.currentTarget.style.borderColor=`${col}18`;e.currentTarget.style.transform="";}}>
                          <div style={{width:32,height:32,borderRadius:9,background:`${col}18`,border:`1px solid ${col}35`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            <span style={{fontSize:8,fontWeight:700,color:col,fontFamily:"'Inter',sans-serif"}}>{p.pos}</span>
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.88)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Inter',sans-serif"}}>{p.name}</div>
                            <div style={{fontSize:10,fontWeight:600,color:col,fontFamily:"'SF Mono','JetBrains Mono',monospace",marginTop:1}}>{p.stat}</div>
                          </div>
                          <MiniRadar vals={[.6+Math.random()*.35,.5+Math.random()*.4,.55+Math.random()*.35,.5+Math.random()*.4,.6+Math.random()*.35]} color={col} size={46}/>
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
          {/* Model tags */}
          <div style={{display:"flex",gap:5,padding:"8px 16px 14px",flexWrap:"wrap"}}>
            {["Dixon-Coles","Elo","Poisson","xG Model"].map(l=>(
              <span key={l} style={{fontSize:8,fontWeight:600,letterSpacing:"0.06em",padding:"3px 9px",borderRadius:999,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.25)",fontFamily:"'Inter',sans-serif"}}>{l}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ----------------------------------------------------------
   iOS SCENARIO SIMULATOR — frosted glass sidebar widget
---------------------------------------------------------- */
const PRESETS=[
  {label:"Normal",icon:"??",mods:{homeAtk:0,awayAtk:0,homeDef:0,awayDef:0,tempo:0}},
  {label:"Home Press",icon:"??",mods:{homeAtk:15,awayAtk:-5,homeDef:5,awayDef:-10,tempo:5}},
  {label:"Both Attack",icon:"?",mods:{homeAtk:10,awayAtk:10,homeDef:-10,awayDef:-10,tempo:8}},
  {label:"Defensive",icon:"???",mods:{homeAtk:-10,awayAtk:-10,homeDef:15,awayDef:15,tempo:-8}},
  {label:"Away Upset",icon:"???",mods:{homeAtk:-10,awayAtk:18,homeDef:-5,awayDef:5,tempo:3}},
];

const ScenarioSimulator=({match,T})=>{
  const[mods,setMods]=useState({homeAtk:0,awayAtk:0,homeDef:0,awayDef:0,tempo:0});
  const[activePreset,setActivePreset]=useState(0);
  const applyPreset=i=>{setActivePreset(i);setMods({...PRESETS[i].mods});};
  const official=useMemo(()=>{if(!match)return null;const xgH=parseFloat(match.xg_home)||1.3,xgA=parseFloat(match.xg_away)||1.1;return{...buildProbs(xgH,xgA),xgH:xgH.toFixed(2),xgA:xgA.toFixed(2)};},[match]);
  const scenario=useMemo(()=>{if(!match)return null;const baseH=parseFloat(match.xg_home)||1.3,baseA=parseFloat(match.xg_away)||1.1,tMult=1+mods.tempo/100;const xgH=Math.max(.1,baseH*(1+mods.homeAtk/100)*(1-mods.awayDef/200)*tMult),xgA=Math.max(.1,baseA*(1+mods.awayAtk/100)*(1-mods.homeDef/200)*tMult);return{...buildProbs(xgH,xgA),xgH:xgH.toFixed(2),xgA:xgA.toFixed(2)};},[match,mods]);
  const isModified=JSON.stringify(mods)!==JSON.stringify(PRESETS[0].mods);

  const cardStyle={
    background:"rgba(10,10,14,0.95)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",
    border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,overflow:"hidden",
    boxShadow:`0 0 0 1px ${T.accent}18, 0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)`,
  };

  if(!match)return(
    <div style={{...cardStyle,padding:32,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:240,gap:14}}>
      <div style={{width:48,height:48,borderRadius:14,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>??</div>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.5)",fontFamily:"'Inter',sans-serif",lineHeight:1.6}}>Select a match card</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.2)",fontFamily:"'Inter',sans-serif",marginTop:4}}>to load the scenario simulator</div>
      </div>
    </div>
  );

  return(
    <div style={cardStyle}>
      {/* Header */}
      <div style={{padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,0.07)",background:`linear-gradient(90deg,${T.accent}0c,transparent)`}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:T.accent,boxShadow:`0 0 8px ${T.accent}`}}/>
          <span style={{fontSize:9,fontWeight:700,color:T.accent,letterSpacing:"0.12em",fontFamily:"'Inter',sans-serif"}}>SCENARIO SIMULATOR</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.75)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,fontFamily:"'Inter',sans-serif"}}>
            {match.home_team} <span style={{color:"rgba(255,255,255,0.2)",fontWeight:400}}>vs</span> {match.away_team}
          </div>
          {isModified&&<button onClick={()=>applyPreset(0)} style={{fontSize:9,fontWeight:600,color:"rgba(255,255,255,0.4)",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:7,padding:"3px 9px",cursor:"pointer",flexShrink:0,marginLeft:8,fontFamily:"'Inter',sans-serif"}}>Reset</button>}
        </div>
      </div>

      {/* Presets */}
      <div style={{padding:"12px 14px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{fontSize:8,fontWeight:600,color:"rgba(255,255,255,0.2)",letterSpacing:"0.12em",marginBottom:8,fontFamily:"'Inter',sans-serif"}}>QUICK SCENARIOS</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
          {PRESETS.map((p,i)=>(
            <button key={i} onClick={()=>applyPreset(i)} style={{
              display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:9,fontSize:10,fontWeight:600,
              cursor:"pointer",transition:"all 0.15s",fontFamily:"'Inter',sans-serif",
              background:activePreset===i?`${T.accent}18`:"rgba(255,255,255,0.04)",
              border:`1px solid ${activePreset===i?T.accent+"40":"rgba(255,255,255,0.08)"}`,
              color:activePreset===i?T.accent:"rgba(255,255,255,0.4)",
            }}>
              <span style={{fontSize:11}}>{p.icon}</span>{p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div style={{padding:"12px 14px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column",gap:10}}>
        <div style={{fontSize:8,fontWeight:600,color:"rgba(255,255,255,0.2)",letterSpacing:"0.12em",fontFamily:"'Inter',sans-serif"}}>FINE TUNE</div>
        {[{label:"Home Attack",k:"homeAtk"},{label:"Away Attack",k:"awayAtk"},{label:"Home Defense",k:"homeDef"},{label:"Away Defense",k:"awayDef"},{label:"Tempo",k:"tempo"}].map(({label,k})=>{
          const val=mods[k];
          const col=val===0?"rgba(255,255,255,0.25)":val>0?T.accent:T.accent2;
          return(
            <div key={k} style={{display:"flex",flexDirection:"column",gap:4}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:10,color:"rgba(255,255,255,0.45)",fontFamily:"'Inter',sans-serif"}}>{label}</span>
                <span style={{fontSize:11,fontWeight:700,fontFamily:"'SF Mono','JetBrains Mono',monospace",color:col}}>{val>0?"+":""}{val}%</span>
              </div>
              <input type="range" min={-25} max={25} value={val}
                onChange={e=>{setActivePreset(-1);setMods(p=>({...p,[k]:parseInt(e.target.value)}));}}
                style={{width:"100%",accentColor:T.accent,cursor:"pointer",height:3}}/>
            </div>
          );
        })}
      </div>

      {/* Comparison */}
      {official&&scenario&&(
        <div style={{padding:"12px 14px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
          <div style={{fontSize:8,fontWeight:600,color:"rgba(255,255,255,0.2)",letterSpacing:"0.12em",marginBottom:10,fontFamily:"'Inter',sans-serif"}}>OFFICIAL vs SCENARIO</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[{label:"Official",data:official,col:"rgba(255,255,255,0.3)"},{label:"Scenario",data:scenario,col:T.accent}].map(({label,data,col})=>(
              <div key={label} style={{padding:"10px 12px",borderRadius:14,background:label==="Scenario"?`${T.accent}0a`:"rgba(255,255,255,0.03)",border:`1px solid ${label==="Scenario"?T.accent+"28":"rgba(255,255,255,0.06)"}`}}>
                <div style={{fontSize:8,fontWeight:700,color:col,letterSpacing:"0.1em",marginBottom:7,fontFamily:"'Inter',sans-serif"}}>{label.toUpperCase()}</div>
                <div style={{fontSize:24,fontWeight:700,color:"rgba(255,255,255,0.9)",fontFamily:"'SF Mono','JetBrains Mono',monospace",textAlign:"center",marginBottom:6}}>{data.topScore}</div>
                <div style={{display:"flex",height:4,borderRadius:999,overflow:"hidden",marginBottom:6,background:"rgba(255,255,255,0.05)"}}>
                  <div style={{flex:data.pH,background:T.homeCol,opacity:.8}}/><div style={{flex:data.pD,background:"rgba(255,255,255,0.2)"}}/><div style={{flex:data.pA,background:T.awayCol,opacity:.8}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  {[{v:Math.round(data.pH*100),c:T.homeCol},{v:Math.round(data.pD*100),c:"rgba(255,255,255,0.3)"},{v:Math.round(data.pA*100),c:T.awayCol}].map(({v,c},i)=>(
                    <span key={i} style={{fontSize:11,fontWeight:700,color:c,fontFamily:"'SF Mono','JetBrains Mono',monospace"}}>{v}%</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {isModified&&(
            <div style={{marginTop:8,display:"flex",gap:4,flexWrap:"wrap"}}>
              {[{l:"Home Win",d:Math.round((scenario.pH-official.pH)*100)},{l:"Draw",d:Math.round((scenario.pD-official.pD)*100)},{l:"Away Win",d:Math.round((scenario.pA-official.pA)*100)}].map(({l,d})=>d!==0&&(
                <span key={l} style={{fontSize:9,fontWeight:700,color:d>0?T.accent:T.accent2,background:`${d>0?T.accent:T.accent2}14`,border:`1px solid ${d>0?T.accent:T.accent2}30`,padding:"2px 8px",borderRadius:999,fontFamily:"'SF Mono','JetBrains Mono',monospace"}}>{l} {d>0?"+":""}{d}%</span>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{padding:"10px 14px",fontSize:9,color:"rgba(255,255,255,0.2)",lineHeight:1.6,fontFamily:"'Inter',sans-serif"}}>Adjusts xG assumptions only. Official predictions unchanged.</div>
    </div>
  );
};

/* ----------------------------------------------------------
   TASK 6 — STANDINGS + SCORERS
---------------------------------------------------------- */
const StandingsTable=({rows,loading,T})=>{ // iOS REDESIGN
  const[sortCol,setSortCol]=useState("rank");const[dir,setDir]=useState(1);
  const total=rows.length||20;
  const ZONE_COL={cl:T.accent,el:T.mid||T.accent,ecl:"rgba(255,255,255,0.35)",rel:T.accent2};
  function getZone(pos){if(pos<=4)return"cl";if(pos===5)return"el";if(pos===6)return"ecl";if(pos>=total-2)return"rel";return null;}
  const sorted=useMemo(()=>{if(loading)return[];return[...rows].sort((a,b)=>{let va=a[sortCol],vb=b[sortCol];if(va==null)va=sortCol==="rank"?999:0;if(vb==null)vb=sortCol==="rank"?999:0;if(typeof va==="string"){va=va.toLowerCase();vb=vb.toLowerCase();}return va<vb?-dir:va>vb?dir:0;});},[rows,sortCol,dir,loading]);
  const toggle=col=>{if(sortCol===col)setDir(d=>-d);else{setSortCol(col);setDir(col==="rank"?1:-1);}};

  const colStyle=(col,align)=>({
    padding:"11px 12px",fontSize:9,fontWeight:600,letterSpacing:"0.1em",
    color:sortCol===col?T.accent:"rgba(255,255,255,0.25)",
    borderBottom:"1px solid rgba(255,255,255,0.07)",
    background:"rgba(12,14,18,0.75)",
    textAlign:align||"center",cursor:"pointer",userSelect:"none",
    transition:"color 0.15s",fontFamily:"'Inter',sans-serif",
    whiteSpace:"nowrap",
  });
  const Th=({col,children,align,width})=>(
    <th onClick={()=>toggle(col)} style={{...colStyle(col,align),width}}>
      {children}{sortCol===col?<span style={{marginLeft:3,opacity:.7}}>{dir===1?"?":"?"}</span>:null}
    </th>
  );

  return(
    <div style={{
      background:"rgba(10,10,14,0.96)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
      borderRadius:20,overflow:"hidden",
      border:"1px solid rgba(255,255,255,0.08)",
      boxShadow:"0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
    }}>
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
                        <div style={{height:11,borderRadius:6,background:"rgba(255,255,255,0.05)",animation:"pulse 1.5s ease infinite",animationDelay:`${i*0.06}s`}}/>
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
                      style={{borderBottom:"1px solid rgba(255,255,255,0.05)",transition:"background 0.15s",cursor:"default"}}
                      onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.03)";}}
                      onMouseLeave={e=>{e.currentTarget.style.background="";}}>

                      {/* Rank with zone dot */}
                      <td style={{padding:"11px 12px",textAlign:"center"}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                          {zoneColor
                            ? <div style={{width:3,height:18,borderRadius:999,background:zoneColor,boxShadow:`0 0 6px ${zoneColor}60`,flexShrink:0}}/>
                            : <div style={{width:3,height:18,flexShrink:0}}/>
                          }
                          <span style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,0.45)",fontFamily:"'SF Mono','JetBrains Mono',monospace"}}>{pos}</span>
                        </div>
                      </td>

                      {/* Club */}
                      <td style={{padding:"11px 12px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:10}}>
                          {row.logo
                            ? <div style={{width:26,height:26,borderRadius:8,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,padding:2}}>
                                <img src={row.logo} style={{width:20,height:20,objectFit:"contain"}} onError={e=>{e.currentTarget.parentElement.style.display="none";}}/>
                              </div>
                            : <div style={{width:26,height:26,borderRadius:8,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",flexShrink:0}}/>
                          }
                          <span style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.88)",fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>{row.team_name}</span>
                        </div>
                      </td>

                      {/* Stats */}
                      {[row.played,row.won,row.drawn,row.lost,row.goals_for,row.goals_against].map((v,j)=>(
                        <td key={j} style={{padding:"11px 12px",textAlign:"center",fontSize:12,color:"rgba(255,255,255,0.4)",fontFamily:"'SF Mono','JetBrains Mono',monospace"}}>{v??"-"}</td>
                      ))}

                      {/* GD */}
                      <td style={{padding:"11px 12px",textAlign:"center",fontSize:12,fontWeight:700,fontFamily:"'SF Mono','JetBrains Mono',monospace",
                        color:(row.goal_diff||0)>0?T.accent:(row.goal_diff||0)<0?T.accent2:"rgba(255,255,255,0.35)"}}>
                        {(row.goal_diff||0)>0?"+":""}{row.goal_diff??"-"}
                      </td>

                      {/* Points */}
                      <td style={{padding:"11px 12px",textAlign:"center"}}>
                        <span style={{
                          fontSize:13,fontWeight:800,color:"rgba(255,255,255,0.92)",
                          fontFamily:"'SF Mono','JetBrains Mono',monospace",
                          background:"rgba(255,255,255,0.06)",
                          border:"1px solid rgba(255,255,255,0.1)",
                          padding:"2px 9px",borderRadius:8,
                        }}>{row.points??"-"}</span>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
      {/* Legend */}
      <div style={{display:"flex",gap:16,padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.07)",flexWrap:"wrap",background:"rgba(0,0,0,0.3)"}}>
        {[{c:T.accent,l:"Champions League"},{c:T.mid||T.accent,l:"Europa League"},{c:"rgba(255,255,255,0.35)",l:"Conference"},{c:T.accent2,l:"Relegation"}].map(({c,l})=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:3,height:14,borderRadius:999,background:c,boxShadow:`0 0 4px ${c}50`}}/>
            <span style={{fontSize:9,color:"rgba(255,255,255,0.3)",fontFamily:"'Inter',sans-serif"}}>{l}</span>
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

  const medalColor=i=>i===0?"#FFD60A":i===1?"rgba(255,255,255,0.6)":i===2?"#CD7F32":"rgba(255,255,255,0.2)";

  return(
    <div style={{
      background:"rgba(10,10,14,0.96)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
      borderRadius:20,overflow:"hidden",
      border:"1px solid rgba(255,255,255,0.08)",
      boxShadow:"0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
    }}>
      {/* Tab switcher */}
      <div style={{display:"flex",background:"rgba(255,255,255,0.03)",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
        {[["goals","? Top Scorers"],["assists","?? Top Assists"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{
            flex:1,padding:"14px 12px",fontSize:12,fontWeight:600,cursor:"pointer",
            background:"none",border:"none",fontFamily:"'Inter',sans-serif",
            color:tab===k?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.3)",
            borderBottom:`2px solid ${tab===k?T.accent:"transparent"}`,
            transition:"all 0.15s",letterSpacing:"0.02em",
          }}>{l}</button>
        ))}
      </div>

      {/* List */}
      <div style={{maxHeight:520,overflowY:"auto"}}>
        {loading
          ? Array.from({length:8}).map((_,i)=>(
              <div key={i} style={{display:"flex",gap:12,padding:"14px 16px",alignItems:"center"}}>
                <div style={{width:22,height:22,borderRadius:7,background:"rgba(255,255,255,0.04)"}}/>
                <div style={{width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:5}}>
                  <div style={{height:11,borderRadius:6,background:"rgba(255,255,255,0.04)",width:"60%"}}/>
                  <div style={{height:7,borderRadius:6,background:"rgba(255,255,255,0.03)",width:"85%"}}/>
                </div>
                <div style={{width:32,height:32,borderRadius:10,background:"rgba(255,255,255,0.04)"}}/>
              </div>
            ))
          : data.slice(0,10).map((p,i)=>(
              <div key={p.player_id||i}
                onClick={()=>navigate(`/player?search=${encodeURIComponent(p.name)}`)}
                style={{
                  display:"flex",alignItems:"center",gap:12,
                  padding:"13px 16px",cursor:"pointer",
                  borderBottom:"1px solid rgba(255,255,255,0.04)",
                  transition:"background 0.15s",
                }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.03)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="";}}>

                {/* Rank badge */}
                <div style={{
                  width:24,height:24,borderRadius:8,
                  background:i<3?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)",
                  border:`1px solid ${i<3?medalColor(i)+"40":"rgba(255,255,255,0.06)"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                }}>
                  <span style={{fontSize:10,fontWeight:700,color:medalColor(i),fontFamily:"'SF Mono','JetBrains Mono',monospace"}}>{i+1}</span>
                </div>

                {/* Photo */}
                {p.photo
                  ? <img src={p.photo} style={{width:38,height:38,borderRadius:"50%",objectFit:"cover",flexShrink:0,border:"1px solid rgba(255,255,255,0.1)"}} onError={e=>{e.currentTarget.style.display="none";}}/>
                  : <div style={{width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,0.05)",flexShrink:0,border:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <span style={{fontSize:14}}>??</span>
                    </div>
                }

                {/* Name + bar + team */}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.88)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Inter',sans-serif",marginBottom:4}}>{p.name}</div>
                  <div style={{height:3,borderRadius:999,background:"rgba(255,255,255,0.05)",marginBottom:4,overflow:"hidden"}}>
                    <div style={{width:`${(p[statKey]||0)/maxVal*100}%`,height:"100%",borderRadius:999,background:`linear-gradient(90deg,${T.accent}88,${T.accent})`,transition:"width 0.5s cubic-bezier(.22,1,.36,1)"}}/>
                  </div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",fontFamily:"'Inter',sans-serif"}}>{p.team_name} · {p.played||0} apps</div>
                </div>

                {/* Stat number */}
                <div style={{
                  minWidth:40,height:40,borderRadius:12,
                  background:i===0?`${T.accent}18`:"rgba(255,255,255,0.05)",
                  border:`1px solid ${i===0?T.accent+"30":"rgba(255,255,255,0.08)"}`,
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                  flexShrink:0,
                }}>
                  <span style={{fontSize:17,fontWeight:800,color:i===0?T.accent:"rgba(255,255,255,0.7)",fontFamily:"'SF Mono','JetBrains Mono',monospace",lineHeight:1}}>{p[statKey]||0}</span>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  );
};

/* ----------------------------------------------------------
   SEASON SIMULATOR — Monte Carlo engine v2
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
  if (pos <= cfg.ucl)                            return { color:"#6366f1", label:"UCL",  bg:"#6366f115" };
  if (pos === cfg.uel)                           return { color:"#f59e0b", label:"UEL",  bg:"#f59e0b15" };
  if (cfg.uecl && pos === cfg.uecl)             return { color:"#10b981", label:"UECL", bg:"#10b98115" };
  if (cfg.relPlay && pos === cfg.relPlay)        return { color:"#f97316", label:"Play", bg:"#f9731615" };
  if (pos >= cfg.relStart)                      return { color:"#ef4444", label:"REL",  bg:"#ef444415" };
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
  // Each team plays gamesLeft more games ˜ n*gamesLeft/2 fixtures total
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

    // ? FIX: shuffle fixtures each simulation so all matchups get sampled
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
      // ? FIX: use league-specific relegation zone
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
        color:v>0?color:"rgba(255,255,255,0.2)",
        fontFamily:"'JetBrains Mono',monospace",
        minWidth:46,textAlign:"center"}}>
        {v > 0 ? `${v}%` : "—"}
      </div>
      <span style={{fontSize:8,fontWeight:700,color:"rgba(255,255,255,0.25)",letterSpacing:"0.06em",textTransform:"uppercase"}}>{label}</span>
    </div>
  );
};

// -- Title Race Chart --------------------------------------
const TitleRaceChart = ({ data, cfg, T }) => {
  const contenders = data.filter(r => r.title_prob > 1).slice(0, 8);
  if (!contenders.length) return null;
  const max = Math.max(...contenders.map(r => r.title_prob), 1);

  return (
    <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,padding:"20px 24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}>
        <span style={{fontSize:16}}>??</span>
        <div>
          <div style={{fontSize:13,fontWeight:900,color:T.text,fontFamily:"'Sora',sans-serif"}}>Title Race</div>
          <div style={{fontSize:10,color:T.muted}}>Championship probability distribution</div>
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {contenders.map((row, i) => (
          <div key={row.team_name} style={{display:"grid",gridTemplateColumns:"110px 1fr 46px",alignItems:"center",gap:8}}>
            <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
              {row.logo
                ? <img src={row.logo} alt="" style={{width:20,height:20,objectFit:"contain",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>
                : <div style={{width:20,height:20,borderRadius:"50%",background:`#6366f118`,flexShrink:0,border:`1px solid ${T.border}`}}/>}
              <span style={{fontSize:11,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Sora',sans-serif"}}>
                {row.team_name}
              </span>
            </div>
            <div style={{position:"relative",height:20,borderRadius:4,background:"rgba(255,255,255,0.04)",overflow:"hidden"}}>
              <div style={{
                position:"absolute",left:0,top:0,height:"100%",
                width:`${(row.title_prob/max)*100}%`,
                background:`linear-gradient(90deg,#6366f1,#8b5cf6)`,
                borderRadius:4,
                transition:"width 0.8s cubic-bezier(.22,1,.36,1)",
                opacity: i===0 ? 1 : 0.65 + (0.35 * (1 - i/contenders.length)),
              }}/>
              <div style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",
                fontSize:9,fontWeight:800,color:"rgba(255,255,255,0.8)",fontFamily:"'JetBrains Mono',monospace"}}>
                {row.title_prob > 2 ? `${row.title_prob}%` : ""}
              </div>
            </div>
            <div style={{fontSize:12,fontWeight:900,color:"#6366f1",fontFamily:"'JetBrains Mono',monospace",textAlign:"right"}}>
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
    <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,padding:"20px 24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}>
        <span style={{fontSize:16}}>??</span>
        <div>
          <div style={{fontSize:13,fontWeight:900,color:T.text,fontFamily:"'Sora',sans-serif"}}>Points Projection</div>
          <div style={{fontSize:10,color:T.muted}}>Current vs projected final points</div>
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
                  : <div style={{width:18,height:18,borderRadius:"50%",background:"rgba(255,255,255,0.06)",flexShrink:0}}/>}
                <span style={{fontSize:11,fontWeight:700,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {row.team_name}
                </span>
              </div>
              <div style={{position:"relative",height:6,borderRadius:3,background:"rgba(255,255,255,0.05)"}}>
                {/* Current pts bar */}
                <div style={{position:"absolute",left:0,top:0,height:"100%",
                  width:`${Math.min((curr/110)*100,100)}%`,
                  background:"rgba(255,255,255,0.2)",borderRadius:3}}/>
                {/* Projected pts extension */}
                <div style={{position:"absolute",left:`${Math.min((curr/110)*100,100)}%`,top:0,height:"100%",
                  width:`${Math.min((delta/110)*100,100)}%`,
                  background:"linear-gradient(90deg,#10b981,#6366f1)",borderRadius:"0 3px 3px 0",
                  transition:"width 0.8s cubic-bezier(.22,1,.36,1)"}}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
                <span style={{fontSize:11,fontWeight:900,color:T.text,fontFamily:"'JetBrains Mono',monospace"}}>{proj}</span>
                <span style={{fontSize:9,fontWeight:800,
                  color: delta > 0 ? "#10b981" : "#ef4444",
                  background: delta > 0 ? "#10b98115" : "#ef444415",
                  border: `1px solid ${delta > 0 ? "#10b98130" : "#ef444430"}`,
                  borderRadius:4,padding:"1px 5px",fontFamily:"'JetBrains Mono',monospace"}}>
                  +{delta}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:12,fontSize:9,color:T.muted,display:"flex",gap:16}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:12,height:4,borderRadius:2,background:"rgba(255,255,255,0.2)"}}/>
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
  // Get bottom zone teams — those in or near relegation
  const dangerZone = data.filter(r => {
    const pos = Math.round(r.avg_position);
    return pos >= cfg.relStart - 3; // show 3 above relegation too
  });
  if (!dangerZone.length) return null;
  const maxRel = Math.max(...dangerZone.map(r => r.relegation_prob), 1);

  return (
    <div style={{background:"rgba(239,68,68,0.04)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:16,padding:"20px 24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <span style={{fontSize:16}}>??</span>
        <div>
          <div style={{fontSize:13,fontWeight:900,color:"#ef4444",fontFamily:"'Sora',sans-serif"}}>Relegation Battle</div>
          <div style={{fontSize:10,color:T.muted}}>Survival probabilities for bottom clubs</div>
        </div>
      </div>
      <div style={{marginBottom:16,fontSize:10,color:T.muted,padding:"8px 12px",background:"rgba(239,68,68,0.06)",borderRadius:8,border:"1px solid rgba(239,68,68,0.12)"}}>
        Relegation zone: positions {cfg.relStart}–{cfg.total} · {cfg.total - cfg.relStart + 1} teams go down
        {cfg.relPlay ? ` · Position ${cfg.relPlay} enters playoff` : ""}
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
              borderRadius:12,padding:"14px 16px",
            }}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {row.logo
                    ? <img src={row.logo} alt="" style={{width:22,height:22,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>
                    : <div style={{width:22,height:22,borderRadius:"50%",background:"rgba(239,68,68,0.15)",border:"1px solid rgba(239,68,68,0.3)"}}/>}
                  <div>
                    <div style={{fontSize:12,fontWeight:800,color:T.text,fontFamily:"'Sora',sans-serif"}}>{row.team_name}</div>
                    <div style={{fontSize:9,color:T.muted}}>Avg pos: {row.avg_position?.toFixed(1)} · {row.currentPts ?? "?"} pts</div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:20,fontWeight:900,color:rel>50?"#ef4444":rel>25?"#f97316":"#10b981",fontFamily:"'JetBrains Mono',monospace"}}>
                    {rel}%
                  </div>
                  <div style={{fontSize:8,color:T.muted,fontWeight:700}}>RELEGATION RISK</div>
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
              <div style={{display:"flex",justifyContent:"space-between",marginTop:5,fontSize:9,color:T.muted}}>
                <span style={{color:"#ef4444",fontWeight:700}}>Relegated</span>
                <span style={{color:"#10b981",fontWeight:700}}>Survival: {surv}%</span>
              </div>
              {isPlay && (
                <div style={{marginTop:8,fontSize:9,fontWeight:800,color:"#f97316",
                  background:"rgba(249,115,22,0.1)",border:"1px solid rgba(249,115,22,0.2)",
                  borderRadius:6,padding:"4px 8px",display:"inline-block"}}>
                  ? Relegation Play-off spot
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
    <div style={{background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,padding:"20px 24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <span style={{fontSize:16}}>??</span>
        <div>
          <div style={{fontSize:13,fontWeight:900,color:T.text,fontFamily:"'Sora',sans-serif"}}>What-If Simulator</div>
          <div style={{fontSize:10,color:T.muted}}>Remove a team's strength — see how the table changes</div>
        </div>
      </div>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        <select value={selectedTeam} onChange={e=>setSelectedTeam(e.target.value)}
          style={{flex:1,minWidth:160,padding:"8px 12px",borderRadius:8,fontSize:12,
            background:"rgba(255,255,255,0.06)",border:`1px solid ${T.border}`,
            color:T.text,outline:"none",cursor:"pointer"}}>
          <option value="">Select a team to weaken…</option>
          {teams.map(t => (
            <option key={t.team_name} value={t.team_name}>{t.team_name}</option>
          ))}
        </select>
        <button onClick={runWhatIf} disabled={!selectedTeam || running}
          style={{padding:"8px 18px",borderRadius:8,fontSize:11,fontWeight:800,cursor:"pointer",
            background:selectedTeam?"rgba(99,102,241,0.15)":"rgba(255,255,255,0.04)",
            border:`1px solid ${selectedTeam?"#6366f140":"rgba(255,255,255,0.08)"}`,
            color:selectedTeam?"#6366f1":"rgba(255,255,255,0.3)"}}>
          {running ? "Simulating…" : "Run Simulation"}
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
          ? Simulating season with <strong>{selectedTeam}</strong> performing at relegation-level strength — showing how other teams benefit
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
        // ? Handle { league, results:[...] } format from backend
        const items = Array.isArray(raw?.results) ? raw.results
          : Array.isArray(raw) ? raw
          : Object.entries(raw).filter(([k]) => k !== "league").map(([name,d]) => ({team:name,...d}));

        const rows = items.map(d => ({
          team_name:       d.team || d.team_name || "",
          avg_position:    parseFloat(d.avg_position)    || 0,
          avg_pts:         parseFloat(d.avg_points || d.avg_pts) || 0,
          // ? FIX: backend already sends percentages (e.g. 39.87), don't multiply by 100
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
          setSimErr("Waiting for standings data… try switching to the Table tab first.");
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

  // Only block on simLoad — standLoad just means logos/pts may not be merged yet
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
      color:activeView===id?"#6366f1":"rgba(255,255,255,0.45)",transition:"all .15s"}}>
      <span>{icon}</span>{label}
    </button>
  );

  const SortBtn = ({ k, label }) => (
    <button onClick={()=>toggleSort(k)} style={{
      padding:"5px 12px",borderRadius:20,fontSize:10,fontWeight:700,cursor:"pointer",
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
        border:`1px solid rgba(99,102,241,0.2)`,borderRadius:20,padding:"20px 24px",
        display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:14}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:"#6366f1",boxShadow:"0 0 10px #6366f1"}}/>
            <span style={{fontSize:11,fontWeight:900,color:"#6366f1",letterSpacing:"0.12em"}}>SEASON SIMULATOR</span>
            {whatIfTeam && (
              <span style={{fontSize:9,fontWeight:800,color:"#f59e0b",background:"rgba(245,158,11,0.12)",
                border:"1px solid rgba(245,158,11,0.3)",borderRadius:999,padding:"2px 8px"}}>
                ?? WHAT-IF: {whatIfTeam} weakened
              </span>
            )}
          </div>
          <div style={{fontSize:22,fontWeight:900,color:T.text,fontFamily:"'Sora',sans-serif",letterSpacing:"-0.02em"}}>
            {cfg.label} — Final Day Predictions
          </div>
          <div style={{fontSize:11,color:T.muted,marginTop:4}}>
            Monte Carlo · 8,000 simulations · Poisson xG · Shuffled fixtures · League-specific zones
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:isMobile?"nowrap":"wrap",overflowX:isMobile?"auto":"visible",WebkitOverflowScrolling:"touch",paddingBottom:isMobile?4:0,scrollbarWidth:"none"}}>
          {zones.map(z=>(
            <div key={z.label} style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:3,height:14,borderRadius:2,background:z.color}}/>
              <span style={{fontSize:9,color:T.muted}}>{z.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* -- View switcher */}
      {!loading && !simErr && (
        <div style={{display:"flex",gap:6,flexWrap:"wrap",overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:4,scrollbarWidth:"none"}}>
          <ViewBtn id="table"     icon="??" label="Full Table" />
          <ViewBtn id="title"     icon="??" label="Title Race" />
          <ViewBtn id="points"    icon="??" label="Points Projection" />
          <ViewBtn id="relegation" icon="??" label="Relegation Battle" />
          <ViewBtn id="whatif"    icon="??" label="What-If" />
        </div>
      )}

      {/* -- Error */}
      {simErr && (
        <div style={{padding:24,background:T.panel,border:`1px solid ${T.border}`,borderRadius:16,textAlign:"center"}}>
          <div style={{fontSize:28,marginBottom:10,opacity:.4}}>??</div>
          <div style={{color:T.muted,fontSize:13}}>Could not load simulation data</div>
          <div style={{color:"#ef4444",fontSize:11,marginTop:6,fontFamily:"'JetBrains Mono',monospace"}}>{simErr}</div>
        </div>
      )}

      {/* -- Loading */}
      {loading && !simErr && (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {Array.from({length:8}).map((_,i)=>(
            <div key={i} style={{height:72,borderRadius:14,
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
            <span style={{fontSize:10,color:T.muted}}>Sort by:</span>
            <SortBtn k="avg_position"    label="Predicted Pos" />
            <SortBtn k="title_prob"      label="Title %" />
            <SortBtn k="top4_prob"       label="Top 4 %" />
            <SortBtn k="relegation_prob" label="Relegation %" />
            <span style={{marginLeft:"auto",fontSize:10,color:T.muted,fontFamily:"'JetBrains Mono',monospace"}}>
              {sorted.length} teams{whatIfTeam ? ` · ?? ${whatIfTeam} weakened` : ""}
            </span>
          </div>

          {sorted.map((row, i) => {
            const pos   = Math.round(row.avg_position) || i+1;
            const zone  = getZoneStyle(pos, cfg, T);
            // ? FIX: values already in % from backend, don't multiply again
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
                  alignItems:"center",gap:isMobile?8:12,padding:isMobile?"10px 12px":"14px 16px",borderRadius:14,
                  background: isWhatIfTeam ? "rgba(245,158,11,0.06)" : isHov ? "rgba(99,102,241,0.06)" : T.panel,
                  border:`1px solid ${isWhatIfTeam?"rgba(245,158,11,0.3)":zone?`${zone.color}22`:isHov?"rgba(99,102,241,0.25)":T.border}`,
                  transition:"all 0.15s",
                }}>

                {/* Pos + zone bar */}
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  {zone && <div style={{width:3,height:36,borderRadius:2,background:zone.color,flexShrink:0}}/>}
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:18,fontWeight:900,
                      color:zone?zone.color:T.muted,
                      fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>
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
                    <div style={{fontSize:13,fontWeight:800,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Sora',sans-serif"}}>
                      {row.team_name}
                      {isWhatIfTeam && <span style={{marginLeft:6,fontSize:9,color:"#f59e0b"}}>?? weakened</span>}
                    </div>
                    <div style={{fontSize:10,color:T.muted,fontFamily:"'JetBrains Mono',monospace",marginTop:1,display:"flex",gap:8}}>
                      {row.currentPts != null && <span>{row.currentPts} pts</span>}
                      {delta != null && delta > 0 && <span style={{color:"#10b981"}}>? {Math.round(projPts)} proj (+{delta})</span>}
                      {row.played && <span>· {row.played} played</span>}
                    </div>
                  </div>
                </div>

                {/* Avg Pos */}
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:16,fontWeight:900,color:T.text,fontFamily:"'JetBrains Mono',monospace"}}>
                    {row.avg_position?.toFixed(1)}
                  </div>
                  <div style={{fontSize:8,color:T.muted,marginTop:2}}>Avg Pos</div>
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

                {/* Relegation % — hidden on mobile */}
                {!isMobile && <div style={{textAlign:"center"}}>
                  <ChancePill value={relegP}
                    color={relegP>40?"#ef4444":relegP>20?"#f97316":relegP>5?"#f59e0b":T.muted}
                    label="Rel %"/>
                </div>}

                {/* Avg Pos — hidden on mobile (shown inline) */}
                {!isMobile && <div style={{textAlign:"center"}}>
                  <div style={{fontSize:16,fontWeight:900,color:T.text,fontFamily:"'JetBrains Mono',monospace"}}>
                    {row.avg_position?.toFixed(1)}
                  </div>
                  <div style={{fontSize:8,color:T.muted,marginTop:2}}>Avg Pos</div>
                  <ProbBar pct={(cfg.total-row.avg_position)/cfg.total*100} color="#6366f1"/>
                </div>}
              </div>
            );
          })}
        </div>
      )}

      {/* -- Footer */}
      {!loading && !simErr && (
        <div style={{padding:"12px 16px",borderRadius:10,background:T.faint,border:`1px solid ${T.border}`,display:"flex",gap:8,alignItems:"flex-start"}}>
          <span style={{fontSize:14,flexShrink:0}}>??</span>
          <span style={{fontSize:10,color:T.muted,lineHeight:1.6}}>
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

// Maps frontend league code ? backend API code
// All codes now match directly — bundesliga added to backend LEAGUE_IDS
const BACKEND_LEAGUE = {
  epl:        "epl",
  laliga:     "laliga",
  bundesliga: "bundesliga",  // ? backend now has this in LEAGUE_IDS
  seriea:     "seriea",
  ligue1:     "ligue1",
};

export default function PredictionsPage({league:propLeague,slugMap}){
  const isMobile = useWindowWidth() < 640;
  const{league:paramLeague}=useParams();
  const navigate=useNavigate();
  const raw=paramLeague||propLeague||"premier-league";
  const DEFAULTS={"premier-league":"epl","la-liga":"laliga","serie-a":"seriea","ligue-1":"ligue1","epl":"epl","laliga":"laliga","bundesliga":"bundesliga","seriea":"seriea","ligue1":"ligue1"};
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

  const homeWins=matches.filter(m=>m.p_home_win>m.p_away_win&&m.p_home_win>m.p_draw).length;
  const draws=matches.filter(m=>m.p_draw>=m.p_home_win&&m.p_draw>=m.p_away_win).length;
  const avgConf=matches.length?Math.round(matches.reduce((s,m)=>s+(m.confidence||0),0)/matches.length):0;
  const bttsCount=matches.filter(m=>(m.btts||0)>=0.55).length;
  const avgXgH=matches.length?(matches.reduce((s,m)=>s+(parseFloat(m.xg_home)||0),0)/matches.length).toFixed(2):"0.00";
  const avgXgA=matches.length?(matches.reduce((s,m)=>s+(parseFloat(m.xg_away)||0),0)/matches.length).toFixed(2):"0.00";

  return(
    <div style={{minHeight:"100vh",background:"#000",position:"relative",fontFamily:"'Inter',sans-serif"}}>

      {/* -- Ambient gradient background */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
        <div style={{position:"absolute",inset:0,background:T.grad,opacity:0.7}}/>
        {/* Noise texture overlay */}
        <div style={{position:"absolute",inset:0,opacity:0.025,backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,backgroundSize:"150px"}}/>
      </div>

      <div style={{position:"relative",zIndex:1,maxWidth:1440,margin:"0 auto",padding:isMobile?"0 12px 80px":"0 24px 64px"}}>

        {/* -- HEADER ------------------------------------------ */}
        <div style={{padding:isMobile?"16px 0 14px":"28px 0 24px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>

          {/* Title block */}
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            {/* Accent pill */}
            <div style={{
              width:5,height:56,borderRadius:999,flexShrink:0,
              background:`linear-gradient(180deg,${T.accent},${T.accent2||T.accent}88)`,
              boxShadow:`0 0 20px ${T.accent}60`,
            }}/>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <LeagueFlag code={league} size={22}/>
                <h1 style={{
                  fontSize:30,fontWeight:700,color:"rgba(255,255,255,0.95)",
                  margin:0,letterSpacing:"-0.03em",
                  fontFamily:"'Inter',sans-serif",
                }}>{T.label}</h1>
              </div>
              <p style={{
                fontSize:11,color:"rgba(255,255,255,0.2)",margin:0,
                fontFamily:"'SF Mono','JetBrains Mono',monospace",
                letterSpacing:"0.06em",
              }}>ELO · DIXON-COLES · REAL xG · PRO DATA</p>
            </div>
          </div>

          {/* League nav pills */}
          <nav style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            {LEAGUE_TABS.map(({code,slug,label})=>{
              const active=league===code;
              return(
                <NavLink key={code} to={`/predictions/${slug}`} style={{
                  display:"flex",alignItems:"center",gap:6,
                  padding:"7px 14px",borderRadius:999,fontSize:11,fontWeight:600,
                  textDecoration:"none",whiteSpace:"nowrap",
                  border:`1px solid ${active?"rgba(255,107,53,0.5)":"rgba(255,255,255,0.1)"}`,
                  color:active?"#FF6B35":"rgba(255,255,255,0.4)",
                  background:active?"rgba(255,107,53,0.1)":"rgba(255,255,255,0.04)",
                  backdropFilter:"blur(10px)",
                  transition:"all 0.18s cubic-bezier(.22,1,.36,1)",
                  boxShadow:active?"0 0 14px rgba(255,107,53,0.2)":"none",
                  fontFamily:"'Inter',sans-serif",letterSpacing:"0.01em",
                }}>
                  <LeagueFlag code={code} size={13}/>
                  {label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* -- QUICK STATS ROW -------------------------------- */}
        {!predLoad&&matches.length>0&&(
          <div style={{
            display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(auto-fit,minmax(120px,1fr))",gap:10,
            marginBottom:24,
          }}>
            {[
              {label:"Fixtures",val:matches.length,mono:true},
              {label:"Home Wins",val:homeWins,mono:true},
              {label:"Draws",val:draws,mono:true},
              {label:"BTTS Likely",val:`${bttsCount}`,mono:true},
              {label:"Avg Confidence",val:`${avgConf}%`,accent:true},
              {label:"Avg xG Home",val:avgXgH,mono:true},
              {label:"Avg xG Away",val:avgXgA,mono:true},
            ].map(({label,val,accent,mono})=>(
              <div key={label} style={{
                padding:"13px 14px",borderRadius:14,
                background:"rgba(255,255,255,0.04)",
                border:"1px solid rgba(255,255,255,0.07)",
                backdropFilter:"blur(10px)",
                boxShadow:"inset 0 1px 0 rgba(255,255,255,0.05)",
              }}>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.25)",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'Inter',sans-serif",marginBottom:5}}>{label}</div>
                <div style={{fontSize:20,fontWeight:700,color:accent?T.accent:"rgba(255,255,255,0.85)",fontFamily:mono?"'SF Mono','JetBrains Mono',monospace":"'Inter',sans-serif",lineHeight:1}}>{val}</div>
              </div>
            ))}
          </div>
        )}

        {/* -- TAB BAR ---------------------------------------- */}
        <div style={{
          display:"flex",marginBottom:16,overflowX:"auto",
          WebkitOverflowScrolling:"touch",
          scrollbarWidth:"none",
          background:"rgba(255,255,255,0.03)",
          borderRadius:14,padding:4,gap:2,
          border:"1px solid rgba(255,255,255,0.07)",
          backdropFilter:"blur(10px)",
          width:isMobile?"100%":"fit-content",
        }}>
          {[
            {key:"predictions",label:"Predictions",badge:!predLoad?matches.length:null},
            {key:"standings",label:"Table",badge:!standLoad?standings.length:null},
            {key:"scorers",label:"Scorers"},
            {key:"simulator",label:"Season Sim"},
          ].map(({key,label,badge})=>(
            <button key={key} onClick={()=>setTab(key)} style={{
              display:"flex",alignItems:"center",gap:6,
              padding:"8px 18px",fontSize:12,fontWeight:600,
              cursor:"pointer",border:"none",whiteSpace:"nowrap",
              fontFamily:"'Inter',sans-serif",letterSpacing:"0.01em",
              borderRadius:10,transition:"all 0.2s cubic-bezier(.22,1,.36,1)",
              color:tab===key?"rgba(255,255,255,0.95)":"rgba(255,255,255,0.35)",
              background:tab===key?"rgba(255,255,255,0.1)":"transparent",
              boxShadow:tab===key?"0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)":"none",
            }}>
              {label}
              {badge!=null&&(
                <span style={{
                  background:tab===key?`${T.accent}28`:"rgba(255,255,255,0.07)",
                  color:tab===key?T.accent:"rgba(255,255,255,0.3)",
                  borderRadius:999,padding:"1px 7px",fontSize:9,
                  fontFamily:"'SF Mono','JetBrains Mono',monospace",fontWeight:700,
                }}>{badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* -- PREDICTIONS TAB -------------------------------- */}
        {tab==="predictions"&&(
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 300px",gap:20,alignItems:"start"}}>
            <div>
              {/* Sort controls */}
              {!predLoad&&!predErr&&matches.length>0&&(
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,flexWrap:"wrap"}}>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.25)",fontFamily:"'Inter',sans-serif",letterSpacing:"0.06em"}}>SORT</span>
                  <div style={{display:"flex",gap:5,padding:"3px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)"}}>
                    {[["confidence","Confidence"],["date","Date"],["home","Home Win %"]].map(([s,l])=>(
                      <button key={s} onClick={()=>setSort(s)} style={{
                        padding:"5px 12px",borderRadius:7,fontSize:10,fontWeight:600,
                        cursor:"pointer",border:"none",fontFamily:"'Inter',sans-serif",
                        background:sort===s?"rgba(255,255,255,0.1)":"transparent",
                        color:sort===s?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.3)",
                        transition:"all 0.15s",
                        boxShadow:sort===s?"0 1px 2px rgba(0,0,0,0.3)":"none",
                      }}>{l}</button>
                    ))}
                  </div>
                  <span style={{marginLeft:"auto",fontSize:10,color:"rgba(255,255,255,0.2)",fontFamily:"'SF Mono','JetBrains Mono',monospace"}}>{matches.length} fixtures</span>
                </div>
              )}

              {/* Error */}
              {predErr&&(
                <div style={{padding:"16px 20px",background:"rgba(255,50,50,0.06)",border:"1px solid rgba(255,50,50,0.15)",borderRadius:14,color:"rgba(255,100,100,0.8)",fontSize:13,fontFamily:"'Inter',sans-serif"}}>
                  ?? {predErr}
                </div>
              )}

              {/* Skeleton */}
              {predLoad&&(
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {Array.from({length:3}).map((_,i)=>(
                    <div key={i} style={{height:180,borderRadius:20,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",animation:"pulse 1.5s ease infinite",animationDelay:`${i*0.12}s`}}/>
                  ))}
                </div>
              )}

              {!predLoad&&!predErr&&matches.length===0&&(
                <div style={{padding:48,textAlign:"center",color:"rgba(255,255,255,0.2)",fontSize:14,fontFamily:"'Inter',sans-serif"}}>
                  <div style={{fontSize:36,marginBottom:12,opacity:.3}}>??</div>
                  No upcoming fixtures found.
                </div>
              )}

              {/* Match cards grid */}
              {!predLoad&&!predErr&&(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(480px,1fr))",gap:12}}>
                  {sorted.map((m,i)=>(
                    <MatchCard key={(m.home_team||"")+(m.away_team||"")+i} match={m} T={T}
                      onSelect={()=>setSelectedMatch(m)}
                      isSelected={selectedMatch===m}
                      navigate={navigate}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Sticky sidebar */}
            <div style={{position:"sticky",top:24,display:"flex",flexDirection:"column",gap:12}}>
              <ScenarioSimulator match={selectedMatch||sorted[0]} T={T}/>
            </div>
          </div>
        )}

        {/* -- STANDINGS TAB ---------------------------------- */}
        {tab==="standings"&&(
          <div>
            {standErr
              ? <div style={{padding:20,color:"rgba(255,100,100,0.7)",fontSize:13}}>{standErr}</div>
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

      {/* -- Global CSS --------------------------------------- */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:4px; height:4px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.12); border-radius:999px }
        ::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,0.22) }
        input[type=range] { height:4px; border-radius:999px; outline:none }
        input[type=range]::-webkit-slider-thumb { width:14px; height:14px; border-radius:50% }
        ::selection { background:${T.accent}40 }
      `}</style>
    </div>
  );
}
