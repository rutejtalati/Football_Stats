// NewsTrackerPage.jsx v4 — StatinSite Intelligence Newsroom  ·  Part 3 refactor
// Changes:
//   • const BACKEND (hardcoded URL) → API_BASE from @/api/api
//   • All NB theme, normalise(), LM, TM, components — 100% preserved

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { API_BASE as BACKEND } from "@/api/api";

/* ── Neobrutalist theme constants ── */
const NB = { y:"#ffffff", k:"#080808", r:"#e2e8e4" };
const NB_CSS = `
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap");
  @keyframes nbPulse  { 0%,100%{opacity:1} 50%{opacity:0.35} }
  @keyframes nbBlink  { 50%{opacity:0} }
  @keyframes nbFadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  @keyframes nbShimmer{ 0%{background-position:-800px 0} 100%{background-position:800px 0} }
  ::-webkit-scrollbar { width:4px; height:4px; }
  ::-webkit-scrollbar-track { background:#080808; }
  ::-webkit-scrollbar-thumb { background:rgba(255,255,255,.18); border-radius:2px; }
  ::selection { background:#ffffff; color:#080808; }
  input[type=range] { accent-color:#ffffff; }
`;

function normalise(a) {
  return { ...a,
    home_team: a.meta?.home_team, away_team: a.meta?.away_team,
    home_win_prob: (a.meta?.home_win ?? 0)/100, draw_prob: (a.meta?.draw ?? 0)/100,
    away_win_prob: (a.meta?.away_win ?? 0)/100, confidence_score: (a.meta?.confidence ?? 0)/100,
    home_logo: a.meta?.home_logo, away_logo: a.meta?.away_logo,
    model_verdict: Array.isArray(a.body) ? a.body[a.body.length-1]?.replace(/\*\*/g,"") ?? "" : "",
  };
}

const LM = {
  epl:        { label:"Premier League",   abbr:"EPL", color:"#ffffff", bg:"rgba(255,255,255,0.06)"  },
  laliga:     { label:"La Liga",          abbr:"LAL", color:"#e2e8e4", bg:"rgba(255,255,255,0.05)"  },
  seriea:     { label:"Serie A",          abbr:"SA",  color:"#d4d4d4", bg:"rgba(255,255,255,0.05)"  },
  bundesliga: { label:"Bundesliga",       abbr:"BUN", color:"#cccccc", bg:"rgba(255,255,255,0.04)"  },
  ligue1:     { label:"Ligue 1",          abbr:"L1",  color:"#bbbbbb", bg:"rgba(255,255,255,0.04)" },
  ucl:        { label:"Champions League", abbr:"UCL", color:"#ffffff", bg:"rgba(255,255,255,0.06)"  },
  general:    { label:"Football",         abbr:"NEWS",color:"rgba(255,255,255,0.5)", bg:"rgba(255,255,255,0.03)" },
};
const TM = {
  match_preview: { label:"Preview",    color:"#ffffff",           fb:"preview"  },
  model_insight: { label:"Insight",    color:"rgba(255,255,255,.8)", fb:"insight" },
  title_race:    { label:"Title Race", color:"rgba(255,255,255,.8)", fb:"insight" },
  transfer:      { label:"Transfer",   color:"rgba(255,255,255,.75)", fb:"transfer" },
  injury:        { label:"Injury",     color:"rgba(255,255,255,.7)",  fb:"injury"   },
  manager:       { label:"Manager",    color:"rgba(255,255,255,.7)",  fb:"manager"  },
  analysis:      { label:"Analysis",   color:"rgba(255,255,255,.8)",  fb:"analysis" },
  news:          { label:"News",       color:"rgba(255,255,255,.55)", fb:"news"     },
  headline:      { label:"News",       color:"rgba(255,255,255,.55)", fb:"news"     },
};

const TEAM_COLOURS = {
  arsenal:["#EF0107","#063672"], chelsea:["#034694","#0252a1"], liverpool:["#C8102E","#00B2A9"],
  "manchester city":["#6CABDD","#1C2C5B"], "manchester united":["#DA291C","#FBE122"],
  tottenham:["#132257","#2d3e7a"], newcastle:["#241F20","#41B6E6"], "aston villa":["#670E36","#95BFE5"],
  "west ham":["#7A263A","#1BB1E7"], brighton:["#0057B8","#FFCD00"], everton:["#003399","#1f4db8"],
  wolves:["#FDB913","#231F20"], fulham:["#CC0000","#000000"], brentford:["#e30613","#000000"],
  "crystal palace":["#1B458F","#C4122E"], "real madrid":["#FEBE10","#00529F"],
  barcelona:["#A50044","#004D98"], atletico:["#CB3524","#272361"], bayern:["#DC052D","#0066B2"],
  dortmund:["#FDE100","#000000"], juventus:["#1d1d1b","#2d2d2d"], inter:["#003DA5","#000000"],
  milan:["#FB090B","#000000"], psg:["#004170","#DA291C"], napoli:["#12A0C7","#003078"],
  default:["rgba(255,255,255,.3)","#0a1a2a"],
};
function tc(n=""){ const l=n.toLowerCase(); for(const[k,v]of Object.entries(TEAM_COLOURS)){if(l.includes(k))return v;} return TEAM_COLOURS.default; }
function gl(a){ return LM[(a.league||"").toLowerCase()]||LM.general; }
function gt(a){ return TM[a.type]||TM.news; }
function timeAgo(ts){ if(!ts)return""; const m=Math.floor((Date.now()-new Date(ts))/60000); if(m<1)return"just now"; if(m<60)return m+"m ago"; if(m<1440)return Math.floor(m/60)+"h ago"; return Math.floor(m/1440)+"d ago"; }
function fmtKO(ts){ if(!ts)return null; const d=new Date(ts); return d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})+" "+d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}); }

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.026'/%3E%3C/svg%3E")`;

// SVG fallback patterns — no emojis, CSS-drawn football visuals
const FBP = {
  transfer: { bg:"#080808", accent:"rgba(255,255,255,.7)" },
  injury:   { bg:"#080808", accent:"rgba(255,255,255,.65)" },
  manager:  { bg:"#080808", accent:"rgba(255,255,255,.65)" },
  analysis: { bg:"#080808", accent:"rgba(255,255,255,.7)" },
  preview:  { bg:"#080808", accent:"rgba(255,255,255,.8)" },
  insight:  { bg:"#080808", accent:"rgba(255,255,255,.7)" },
  news:     { bg:"#080808", accent:"rgba(255,255,255,.5)" },
};
function getFB(t){ const k=t==="match_preview"?"preview":(t==="model_insight"||t==="title_race")?"insight":(TM[t]?.fb||"news"); return FBP[k]||FBP.news; }
function fbSvg(fb,lines){ return `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='400' height='220'><rect width='400' height='220' fill='"+fb.bg+"'/>" +lines+ "</svg>")}")`; }
function fbBg(fb){
  if(fb===FBP.transfer) return fbSvg(fb,"<line x1='200' y1='0' x2='0' y2='220' stroke='rgba(255,255,255,.07)'/><line x1='200' y1='0' x2='80' y2='220' stroke='rgba(255,255,255,.05)'/><line x1='200' y1='0' x2='320' y2='220' stroke='rgba(255,255,255,.05)'/><line x1='200' y1='0' x2='400' y2='220' stroke='rgba(255,255,255,.07)'/>");
  if(fb===FBP.injury)   return fbSvg(fb,"<circle cx='200' cy='110' r='55' fill='none' stroke='rgba(255,255,255,.08)'/><circle cx='200' cy='110' r='90' fill='none' stroke='rgba(255,255,255,.05)'/><circle cx='200' cy='110' r='130' fill='none' stroke='rgba(255,255,255,.03)'/>");
  if(fb===FBP.manager)  return fbSvg(fb,"<rect x='60' y='44' width='280' height='132' fill='none' stroke='rgba(255,255,255,.07)' rx='6'/><rect x='100' y='66' width='200' height='88' fill='none' stroke='rgba(255,255,255,.05)' rx='3'/>");
  if(fb===FBP.analysis) return fbSvg(fb,"<rect x='36' y='22' width='328' height='176' fill='none' stroke='rgba(255,255,255,.08)' rx='5'/><line x1='200' y1='22' x2='200' y2='198' stroke='rgba(255,255,255,.06)'/><circle cx='200' cy='110' r='42' fill='none' stroke='rgba(255,255,255,.07)'/><rect x='36' y='73' width='42' height='74' fill='none' stroke='rgba(255,255,255,.06)'/><rect x='322' y='73' width='42' height='74' fill='none' stroke='rgba(255,255,255,.06)'/>");
  if(fb===FBP.preview)  return fbSvg(fb,"<rect x='36' y='22' width='328' height='176' fill='none' stroke='rgba(255,255,255,.07)' rx='5'/><line x1='200' y1='22' x2='200' y2='198' stroke='rgba(255,255,255,.05)'/><circle cx='200' cy='110' r='38' fill='none' stroke='rgba(255,255,255,.07)'/>");
  if(fb===FBP.insight)  return fbSvg(fb,"<polyline points='36,180 100,126 166,148 230,80 296,96 364,44' fill='none' stroke='rgba(255,255,255,.15)' stroke-width='2'/><polyline points='36,196 100,162 166,174 230,132 296,148 364,112' fill='none' stroke='rgba(255,255,255,.06)'/>");
  return fbSvg(fb,"<line x1='40' y1='62' x2='360' y2='62' stroke='rgba(255,255,255,.07)'/><line x1='40' y1='95' x2='290' y2='95' stroke='rgba(255,255,255,.05)'/><line x1='40' y1='122' x2='320' y2='122' stroke='rgba(255,255,255,.05)'/><line x1='40' y1='148' x2='210' y2='148' stroke='rgba(255,255,255,.04)'/>");
}

function useReveal(){ const ref=useRef(null); const[vis,setVis]=useState(false); useEffect(()=>{ if(!ref.current)return; const io=new IntersectionObserver(([e])=>{ if(e.isIntersecting){setVis(true);io.disconnect();} },{threshold:0.06}); io.observe(ref.current); return()=>io.disconnect(); },[]); return[ref,vis]; }

const SOURCE_BRANDS={
  "bbc sport":          {bg:"#b00",      fg:"#fff",   abbr:"BBC"  },
  "sky sports":         {bg:"#0070c0",   fg:"#fff",   abbr:"SKY"  },
  "sky sports football":{bg:"#0070c0",   fg:"#fff",   abbr:"SKY"  },
  "the guardian":       {bg:"#005689",   fg:"#fff",   abbr:"GRD"  },
  "espn fc":            {bg:"#cc0000",   fg:"#fff",   abbr:"ESPN" },
  "goal.com":           {bg:"#1a1a1a",   fg:"#ffd700",abbr:"GOAL" },
  "sports illustrated": {bg:"#c8102e",   fg:"#fff",   abbr:"SI"   },
  "marca":              {bg:"#003580",   fg:"#fff",   abbr:"MCA"  },
  "fabrizio romano":    {bg:"#1a0a2e",   fg:"rgba(255,255,255,.7)",abbr:"FAB"  },
  "statinsite":         {bg:"#080808",   fg:"rgba(255,255,255,.85)",abbr:"SSI"  },
  "statinsite intelligence engine":{bg:"#080808",fg:"rgba(255,255,255,.85)",abbr:"SSI"},
};
function getSrcBrand(src=""){ return SOURCE_BRANDS[(src||"").toLowerCase().trim()]||null; }

function CardImage({src,type,style={},zoom=false,source=""}){
  const[loaded,setLoaded]=useState(false);
  const[failed,setFailed]=useState(false);
  const fb=getFB(type);
  const brand=getSrcBrand(source);
  if(!src||failed){
    const bg=brand?brand.bg:fb.bg;
    const accent=brand?brand.fg:fb.accent;
    const abbr=brand?.abbr||null;
    const sz=Math.min(parseInt(style.height||style.minHeight||60)/2.2,28);
    return(
      <div style={{position:"relative",overflow:"hidden",...style,background:bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{NB_CSS}</style>


        <div style={{position:"absolute",inset:0,backgroundImage:fbBg(fb),backgroundSize:"cover",opacity:brand?0.12:1}}/>
        {abbr&&<span style={{position:"relative",zIndex:1,fontSize:sz,fontWeight:900,fontFamily:"'Inter',sans-serif",color:accent,opacity:0.22,letterSpacing:"-0.04em",userSelect:"none"}}>{abbr}</span>}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:2.5,background:accent,opacity:0.65}}/>
        <div style={{position:"absolute",top:7,left:7,width:5,height:5,borderRadius:"50%",background:accent,opacity:0.5}}/>
      </div>);
  }
  return(
    <div style={{position:"relative",overflow:"hidden",...style}}>
      {!loaded&&<div style={{position:"absolute",inset:0,background:fb.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
        {brand&&<span style={{fontSize:18,fontWeight:900,fontFamily:"'Inter',sans-serif",color:brand.fg,opacity:0.18,letterSpacing:"-0.04em"}}>{brand.abbr}</span>}
      </div>}
      <img src={src} alt="" loading="lazy" onLoad={()=>setLoaded(true)} onError={()=>setFailed(true)}
        style={{width:"100%",height:"100%",objectFit:"cover",display:"block",
          transform:zoom?"scale(1.06)":"scale(1)",opacity:loaded?1:0,
          transition:"transform 0.35s cubic-bezier(.22,1,.36,1),opacity 0.3s ease"}}/>
      {loaded&&<div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.12) 0%,transparent 35%,rgba(4,8,20,0.55) 100%)",pointerEvents:"none"}}/>}
    </div>);
}

function WinProbBar({home,draw,away,homeTeam,awayTeam,large}){
  const h=Math.round((home||0)*100),d=Math.round((draw||0)*100),a=Math.round((away||0)*100);
  const win=h>a?"home":a>h?"away":"draw";
  const fs=large?13:11, fsMono=large?14:11;
  return(<div style={{width:"100%"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:large?10:5}}>
      <span style={{fontSize:fs,fontWeight:800,color:win==="home"?"#ffffff":"rgba(255,255,255,.4)",maxWidth:"36%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{homeTeam}</span>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <span style={{fontFamily:"'Inter',sans-serif",fontSize:fsMono,fontWeight:900,color:win==="home"?"#ffffff":"rgba(255,255,255,.35)"}}>{h}%</span>
        <span style={{fontSize:11,color:"rgba(255,255,255,.25)",fontWeight:700}}>{d}%</span>
        <span style={{fontFamily:"'Inter',sans-serif",fontSize:fsMono,fontWeight:900,color:win==="away"?"rgba(255,255,255,.8)":"rgba(255,255,255,.35)"}}>{a}%</span>
      </div>
      <span style={{fontSize:fs,fontWeight:800,color:win==="away"?"#ffffff":"rgba(255,255,255,.4)",maxWidth:"36%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"right"}}>{awayTeam}</span>
    </div>
    <div style={{display:"flex",height:large?6:3,borderRadius:999,overflow:"hidden",gap:1}}>
      <div style={{width:h+"%",background:"rgba(255,255,255,.85)",borderRadius:"999px 0 0 999px",transition:"width 0.6s ease"}}/>
      <div style={{width:d+"%",background:"rgba(255,255,255,.07)"}}/>
      <div style={{width:a+"%",background:"rgba(255,255,255,.5)",borderRadius:"0 999px 999px 0",transition:"width 0.6s ease"}}/>
    </div>
  </div>);
}

function MatchInfoBar({article}){
  const league=gl(article);
  const hp=article.home_win_prob||(article.meta?.home_win??0)/100;
  const dp=article.draw_prob||(article.meta?.draw??0)/100;
  const ap=article.away_win_prob||(article.meta?.away_win??0)/100;
  const ht=article.home_team||article.meta?.home_team;
  const at=article.away_team||article.meta?.away_team;
  if(!ht||!at)return null;
  const cells=[{l:"Fixture",v:ht+" vs "+at},{l:"Competition",v:league.label},
    article.meta?.kickoff&&{l:"Kickoff",v:fmtKO(article.meta.kickoff)},
    article.meta?.most_likely_score&&{l:"Projected",v:article.meta.most_likely_score}].filter(Boolean);
  return(<div style={{borderRadius:0,border:"1px solid "+league.color+"1e",background:"rgba(255,255,255,0.014)",padding:"16px 20px",marginBottom:28,}}>
    <div style={{display:"flex",flexWrap:"wrap",gap:0,marginBottom:16}}>
      {cells.map((c,i)=>(
        <div key={i} style={{flex:"1 1 130px",padding:"0 20px 8px 0",minWidth:100}}>
          <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.25)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4}}>{c.l}</div>
          <div style={{fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:700,color:"#ffffff"}}>{c.v}</div>
        </div>))}
    </div>
    <WinProbBar home={hp} draw={dp} away={ap} homeTeam={ht} awayTeam={at} large/>
  </div>);
}

function CatBadge({type,league,small}){
  const tm=gt({type}); const lm=LM[league]||LM.general;
  const sz=small?{fontSize:8,padding:"2px 6px",borderRadius:4}:{fontSize:9,padding:"3px 9px",borderRadius:6};
  return(<div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
    <span style={{fontWeight:900,letterSpacing:"0.12em",textTransform:"uppercase",color:tm.color,background:tm.color+"0f",border:"1px solid "+tm.color+"24",whiteSpace:"nowrap",...sz}}>{tm.label}</span>
    {league&&league!=="general"&&<span style={{fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",color:lm.color,background:lm.bg,border:"1px solid "+lm.color+"20",whiteSpace:"nowrap",...sz}}>{lm.abbr}</span>}
  </div>);
}

function HeroVSBanner({homeTeam,awayTeam,homeLogo,awayLogo,height=165,hp=0,dp=0,ap=0,leagueColor="rgba(255,255,255,.85)"}){
  const[hc1,hc2]=tc(homeTeam); const[ac1,ac2]=tc(awayTeam);
  const hPct=Math.round(hp*100); const dPct=Math.round(dp*100); const aPct=Math.round(ap*100);
  const hasPct=hPct+dPct+aPct>0;
  const pitchSvg="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='170'%3E%3Crect x='30' y='12' width='340' height='146' fill='none' stroke='white' stroke-width='1' opacity='.13'/%3E%3Cline x1='200' y1='12' x2='200' y2='158' stroke='white' stroke-width='1' opacity='.13'/%3E%3Ccircle cx='200' cy='85' r='34' fill='none' stroke='white' stroke-width='1' opacity='.13'/%3E%3Crect x='30' y='38' width='52' height='64' fill='none' stroke='white' stroke-width='1' opacity='.1'/%3E%3Crect x='318' y='38' width='52' height='64' fill='none' stroke='white' stroke-width='1' opacity='.1'/%3E%3C/svg%3E";
  return(
    <div style={{position:"relative",height,overflow:"hidden",flexShrink:0,background:"rgba(18,18,18,0.98)"}}>
      {/* Team colour wedges */}
      <div style={{position:"absolute",left:0,top:0,width:"54%",height:"100%",background:"linear-gradient(140deg,"+hc1+"cc,"+hc2+"88)",clipPath:"polygon(0 0,65% 0,48% 100%,0 100%)"}}/>
      <div style={{position:"absolute",right:0,top:0,width:"54%",height:"100%",background:"linear-gradient(220deg,"+ac1+"cc,"+ac2+"88)",clipPath:"polygon(52% 0,100% 0,100% 100%,35% 100%)"}}/>
      {/* Pitch overlay */}
      <div style={{position:"absolute",inset:0,backgroundImage:`url("${pitchSvg}")`,backgroundSize:"100% 100%"}}/>
      {/* Dark overlay */}
      <div style={{position:"absolute",inset:0,background:"rgba(8,8,8,.82)"}}/>
      {/* HUD corner brackets */}
      {[{t:6,l:6,bt:"top",bl:"left"},{t:6,r:6,bt:"top",bl:"right"},{b:2,l:6,bt:"bottom",bl:"left"},{b:2,r:6,bt:"bottom",bl:"right"}].map((c,i)=>(
        <div key={i} style={{position:"absolute",width:10,height:10,zIndex:6,
          top:c.t,bottom:c.b,left:c.l,right:c.r,
          borderTop:c.bt==="top"?"1.5px solid "+leagueColor+"99":undefined,
          borderBottom:c.bt==="bottom"?"1.5px solid "+leagueColor+"44":undefined,
          borderLeft:c.bl==="left"?"1.5px solid "+leagueColor+(c.bt==="top"?"99":"44"):undefined,
          borderRight:c.bl==="right"?"1.5px solid "+leagueColor+(c.bt==="top"?"99":"44"):undefined,
        }}/>
      ))}
      {/* Scanline */}
      <div style={{position:"absolute",top:0,bottom:0,width:"35%",background:"linear-gradient(90deg,transparent,"+leagueColor+"09,transparent)",animation:"scanH 5s ease-in-out infinite",zIndex:3}}/>
      {/* Teams */}
      {[{team:homeTeam,logo:homeLogo,c1:hc1,c2:hc2,pos:"17%"},{team:awayTeam,logo:awayLogo,c1:ac1,c2:ac2,pos:"83%"}].map(({team,logo,c1,c2,pos})=>(
        <div key={team} style={{position:"absolute",left:pos,top:"50%",transform:"translate(-50%,-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:6,zIndex:4}}>
          <div style={{width:52,height:52,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.18)",background:"rgba(18,18,18,0.98)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",boxShadow:"3px 3px 0 rgba(255,255,255,.15)"}}>
            {logo
              ?<img src={logo} alt={team} style={{width:"100%",height:"100%",objectFit:"contain"}} onError={e=>{e.currentTarget.style.display="none";e.currentTarget.parentNode.style.background="linear-gradient(135deg,"+c1+","+c2+")";}}/>
              :<div style={{fontSize:11,fontWeight:900,color:"#ffffff",fontFamily:"'Inter',sans-serif"}}>{(team||"?").slice(0,3).toUpperCase()}</div>}
          </div>
          <span style={{fontFamily:"'Inter',sans-serif",fontSize:10,fontWeight:900,color:"#ffffff",textShadow:"0 1px 8px rgba(0,0,0,.95)",textAlign:"center",maxWidth:72,lineHeight:1.2}}>{team}</span>
        </div>
      ))}
      {/* VS badge */}
      <div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:38,height:38,borderRadius:"50%",background:"rgba(18,18,18,0.98)",border:"1.5px solid rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:5,boxShadow:"0 0 20px rgba(0,0,0,.9)"}}>
        <span style={{fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.6)",letterSpacing:"0.05em"}}>VS</span>
      </div>
      {/* Probability strip fused to base */}
      {hasPct&&(
        <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:6}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 10px 2px",zIndex:7,position:"relative"}}>
            <span style={{fontFamily:"'Inter',sans-serif",fontSize:10,fontWeight:900,color:hPct>aPct?"#60a5fa":"rgba(255,255,255,.4)"}}>{hPct}%</span>
            <span style={{fontSize:11,color:"rgba(255,255,255,.3)",fontWeight:700}}>{dPct}%</span>
            <span style={{fontFamily:"'Inter',sans-serif",fontSize:10,fontWeight:900,color:aPct>hPct?"rgba(255,255,255,.65)":"rgba(255,255,255,.4)"}}>{aPct}%</span>
          </div>
          <div style={{display:"flex",height:5}}>
            <div style={{flex:hPct||1,background:"linear-gradient(90deg,#1d4ed8,#3b82f6)"}}/>
            <div style={{flex:dPct||1,background:"rgba(255,255,255,.1)"}}/>
            <div style={{flex:aPct||1,background:"linear-gradient(90deg,#dc2626,#ef4444)"}}/>
          </div>
        </div>
      )}
      {!hasPct&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:48,background:"linear-gradient(to top,rgba(0,0,0,1),transparent)"}}/>}
    </div>
  );
}

function MatchPreviewCard({article,featured=false,onClick}){
  const[hov,setHov]=useState(false); const[ref,vis]=useReveal();
  const league=gl(article);
  const homeTeam=article.home_team||article.meta?.home_team||"Home";
  const awayTeam=article.away_team||article.meta?.away_team||"Away";
  const kickoff=article.meta?.kickoff||article.published_at;
  const hp=article.home_win_prob||(article.meta?.home_win??0)/100;
  const dp=article.draw_prob||(article.meta?.draw??0)/100;
  const ap=article.away_win_prob||(article.meta?.away_win??0)/100;
  const xgH=article.meta?.xg_home;const xgA=article.meta?.xg_away;
  const score=article.meta?.most_likely_score;
  const btts=article.meta?.p_btts;const over=article.meta?.p_over25;
  return(<div ref={ref} onClick={()=>onClick(article)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    style={{borderRadius:8,overflow:"hidden",cursor:"pointer",background:"rgba(16,16,16,0.98)",
      border:hov?"1px solid "+league.color+"55":"1px solid rgba(255,255,255,0.09)",
      boxShadow:hov?"0 0 36px "+league.color+"18,0 24px 56px rgba(0,0,0,.65)":"0 8px 28px rgba(0,0,0,0.45)",
      transform:hov?"translateY(-4px)":vis?"translateY(0)":"translateY(14px)",
      opacity:vis?1:0,transition:"all 0.28s cubic-bezier(.22,1,.36,1)",display:"flex",flexDirection:"column"}}>
    <HeroVSBanner homeTeam={homeTeam} awayTeam={awayTeam}
      homeLogo={article.home_logo||article.meta?.home_logo}
      awayLogo={article.away_logo||article.meta?.away_logo}
      height={featured?190:160}
      hp={hp} dp={dp} ap={ap} leagueColor={league.color}/>
    <div style={{padding:"11px 14px 13px",background:"rgba(18,18,18,0.98)"}}>
      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:8}}>
        <CatBadge type={article.type} league={article.league} small/>
        {kickoff&&<span style={{marginLeft:"auto",fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,.25)",fontWeight:700}}>{fmtKO(kickoff)||timeAgo(kickoff)}</span>}
      </div>
      {/* xG + markets row */}
      {(xgH||xgA||score||btts||over)&&(
        <div style={{display:"flex",gap:0,marginBottom:9,background:"rgba(255,255,255,.03)",borderRadius:0,overflow:"hidden",border:"2px solid rgba(255,255,255,.15)"}}>
          {xgH&&<div style={{flex:1,padding:"6px 10px",borderRight:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:900,color:"#60a5fa",lineHeight:1}}>{Number(xgH).toFixed(2)}</div>
            <div style={{fontSize:7,fontWeight:700,color:"rgba(255,255,255,.25)",letterSpacing:"0.09em",textTransform:"uppercase",marginTop:2}}>xG</div>
          </div>}
          {score&&<div style={{flex:1.2,padding:"6px 10px",borderRight:"1px solid rgba(255,255,255,0.06)",textAlign:"center"}}>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:900,color:"#ffffff",lineHeight:1}}>{score}</div>
            <div style={{fontSize:7,fontWeight:700,color:"rgba(255,255,255,.25)",letterSpacing:"0.09em",textTransform:"uppercase",marginTop:2}}>Projected</div>
          </div>}
          {xgA&&<div style={{flex:1,padding:"6px 10px",borderRight:btts||over?"1px solid rgba(255,255,255,0.06)":undefined}}>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:900,color:"rgba(255,255,255,.65)",lineHeight:1,textAlign:"right"}}>{Number(xgA).toFixed(2)}</div>
            <div style={{fontSize:7,fontWeight:700,color:"rgba(255,255,255,.25)",letterSpacing:"0.09em",textTransform:"uppercase",marginTop:2,textAlign:"right"}}>xG</div>
          </div>}
          {over!=null&&<div style={{flex:1,padding:"6px 10px",borderRight:btts?"1px solid rgba(255,255,255,0.06)":undefined}}>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:900,color:"rgba(255,255,255,.8)",lineHeight:1}}>{Math.round(over>1?over:over*100)}%</div>
            <div style={{fontSize:7,fontWeight:700,color:"rgba(255,255,255,.25)",letterSpacing:"0.09em",textTransform:"uppercase",marginTop:2}}>O2.5</div>
          </div>}
          {btts!=null&&<div style={{flex:1,padding:"6px 10px"}}>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:900,color:"rgba(255,255,255,.75)",lineHeight:1}}>{Math.round(btts>1?btts:btts*100)}%</div>
            <div style={{fontSize:7,fontWeight:700,color:"rgba(255,255,255,.25)",letterSpacing:"0.09em",textTransform:"uppercase",marginTop:2}}>BTTS</div>
          </div>}
        </div>
      )}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,0.25)",letterSpacing:"0.06em",textTransform:"uppercase"}}>StatinSite Model</span>
        <span style={{fontSize:11,fontWeight:800,color:league.color}}>Full preview →</span>
      </div>
    </div>
  </div>);
}

function InsightCard({article,featured=false,onClick,idx=0}){
  const[hov,setHov]=useState(false); const[ref,vis]=useReveal();
  const isTitle=article.type==="title_race";
  const leaguePalette={epl:["rgba(255,255,255,.85)","#0c4a6e"],laliga:["rgba(255,255,255,.8)","#78350f"],seriea:["rgba(255,255,255,.75)","#064e3b"],bundesliga:["#ff7c2a","#7c2d12"],ligue1:["rgba(255,255,255,.65)","#4c1d95"],ucl:["rgba(255,255,255,.8)","#78350f"]};
  const [accent,accentDark]=leaguePalette[article.league]||(isTitle?["rgba(255,255,255,.8)","#92400e"]:["rgba(255,255,255,.75)","#065f46"]);
  const gap=article.meta?.gap;
  const leader=article.meta?.leader;
  const standings=article.meta?.standings||[];
  const useTableDesign=idx%2===0; // alternate: even=table, odd=race bars

  // Visual header — sparkline bg + giant gap number + live dot
  const VisualHeader=()=>(
    <div style={{height:100,position:"relative",overflow:"hidden",flexShrink:0,
      background:"linear-gradient(135deg,#000,"+accentDark+"33)"}}>
      {/* SVG sparkline bg */}
      <svg style={{position:"absolute",inset:0,width:"100%",height:100,opacity:.18}} viewBox="0 0 400 100" preserveAspectRatio="none">
        <polyline points="0,85 60,68 120,74 180,50 240,38 300,22 360,14 400,8" fill="none" stroke={accent} strokeWidth="2"/>
        <polyline points="0,90 80,80 160,82 240,72 320,66 400,60" fill="none" stroke={accent} strokeWidth="1.2" opacity=".5"/>
      </svg>
      {/* Bottom accent */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:2.5,background:"linear-gradient(90deg,"+accent+","+accent+"55,transparent)"}}/>
      {/* Live dot + league label */}
      <div style={{position:"absolute",top:9,left:12,display:"flex",alignItems:"center",gap:5,zIndex:2}}>
        <div style={{width:6,height:6,borderRadius:"50%",background:accent,boxShadow:"0 0 8px "+accent,animation:"snLivePulse 2s ease-in-out infinite"}}/>
        <span style={{fontSize:10,fontWeight:600,color:accent,letterSpacing:"0.12em",textTransform:"uppercase",opacity:.85}}>
          {(LM[article.league]?.label||"Football")+" · "+(isTitle?"Title Race":"Model Insight")}
        </span>
      </div>
      {/* Giant gap number */}
      {gap!=null?(
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",gap:18,zIndex:2}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:44,fontWeight:900,color:accent,lineHeight:1,textShadow:"0 0 32px "+accent+"60"}}>{gap}</div>
            <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.3)",letterSpacing:"0.12em",textTransform:"uppercase"}}>point gap</div>
          </div>
          {leader&&<>
            <div style={{width:1,height:44,background:"rgba(255,255,255,.1)"}}/>
            <div>
              <div style={{fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:900,color:"#ffffff"}}>{leader}</div>
              <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.3)",letterSpacing:"0.1em",textTransform:"uppercase",marginTop:2}}>Leader</div>
            </div>
          </>}
        </div>
      ):(
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:2}}>
          <div style={{fontFamily:"'Inter',sans-serif",fontSize:16,fontWeight:900,color:"rgba(255,255,255,.5)",textAlign:"center",padding:"0 20px"}}>{article.title}</div>
        </div>
      )}
    </div>
  );

  // Design 1: Mini standings table
  const TableBody=()=>(
    <div style={{padding:"11px 13px 13px"}}>
      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:8}}>
        <CatBadge type={article.type} league={article.league} small/>
        <span style={{marginLeft:"auto",fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,.25)",fontWeight:700}}>{timeAgo(article.published_at)}</span>
      </div>
      <h3 style={{fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:900,color:"#ffffff",lineHeight:1.3,margin:"0 0 10px"}}>{article.title}</h3>
      {standings.length>0?(
        <div style={{background:"rgba(255,255,255,.03)",border:"2px solid rgba(255,255,255,.15)",borderRadius:9,overflow:"hidden",marginBottom:10}}>
          {standings.slice(0,3).map((s,i)=>{
            const isLeader=i===0;
            const form=(s.form||"").split("").slice(-3);
            return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",
                background:isLeader?"rgba(255,255,255,0.08)":"transparent",
                borderLeft:isLeader?"2.5px solid "+accent:"2.5px solid transparent",
                borderBottom:i<2?"1px solid rgba(255,255,255,0.05)":"none"}}>
                <span style={{fontSize:11,fontWeight:600,fontFamily:"'Inter',sans-serif",color:isLeader?accent:"rgba(255,255,255,0.3)",width:14,flexShrink:0}}>{i+1}</span>
                <span style={{fontSize:11,fontWeight:700,color:isLeader?"#fff":"rgba(255,255,255,0.65)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.team||s.name}</span>
                <div style={{display:"flex",gap:2}}>
                  {form.map((r,j)=>(
                    <span key={j} style={{width:14,height:14,borderRadius:3,fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",
                      background:r==="W"?"rgba(255,255,255,.18)":r==="D"?"rgba(255,255,255,.15)":"rgba(239,68,68,.15)",
                      color:r==="W"?"rgba(255,255,255,.75)":r==="D"?"rgba(255,255,255,.8)":"rgba(255,255,255,.65)"}}>{r}</span>
                  ))}
                </div>
                <span style={{fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:700,color:isLeader?accent:"rgba(255,255,255,0.45)",minWidth:22,textAlign:"right"}}>{s.points||s.pts}</span>
              </div>
            );
          })}
        </div>
      ):(
        <p style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,.4)",lineHeight:1.55,margin:"0 0 10px",overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{article.standfirst||article.summary}</p>
      )}
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <span style={{fontSize:11,fontWeight:800,color:accent}}>Full analysis →</span>
      </div>
    </div>
  );

  // Design 2: Race bars
  const RaceBody=()=>(
    <div style={{padding:"11px 13px 13px"}}>
      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:8}}>
        <CatBadge type={article.type} league={article.league} small/>
        <span style={{marginLeft:"auto",fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,.25)",fontWeight:700}}>{timeAgo(article.published_at)}</span>
      </div>
      <h3 style={{fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:900,color:"#ffffff",lineHeight:1.3,margin:"0 0 10px"}}>{article.title}</h3>
      {standings.length>0?(
        <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:10}}>
          {standings.slice(0,3).map((s,i)=>{
            const maxPts=standings[0]?.points||standings[0]?.pts||80;
            const pts=s.points||s.pts||0;
            const pct=Math.round(pts/maxPts*100);
            const isLeader=i===0;
            return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{fontSize:9,fontWeight:600,color:isLeader?accent:"rgba(255,255,255,0.45)",width:70,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.team||s.name}</span>
                <div style={{flex:1,height:6,background:"rgba(255,255,255,.06)",borderRadius:999,overflow:"hidden"}}>
                  <div style={{height:"100%",width:pct+"%",borderRadius:999,
                    background:isLeader?"linear-gradient(90deg,"+accentDark+","+accent+")"
                      :"rgba(255,255,255,0.2)"}}/>
                </div>
                <span style={{fontFamily:"'Inter',sans-serif",fontSize:10,fontWeight:700,color:isLeader?accent:"rgba(255,255,255,0.4)",minWidth:22,textAlign:"right"}}>{pts}</span>
              </div>
            );
          })}
        </div>
      ):(
        <p style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,.4)",lineHeight:1.55,margin:"0 0 10px",overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{article.standfirst||article.summary}</p>
      )}
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <span style={{fontSize:11,fontWeight:800,color:accent}}>Full analysis →</span>
      </div>
    </div>
  );

  return(<div ref={ref} onClick={()=>onClick(article)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    style={{borderRadius:8,overflow:"hidden",cursor:"pointer",background:"rgba(16,16,16,0.98)",
      border:hov?"1px solid "+accent+"50":"1px solid rgba(255,255,255,0.09)",
      boxShadow:hov?"0 0 32px "+accent+"18,0 20px 52px rgba(0,0,0,.65)":"0 8px 28px rgba(0,0,0,0.4)",
      transform:hov?"translateY(-4px)":vis?"translateY(0)":"translateY(14px)",
      opacity:vis?1:0,transition:"all 0.28s cubic-bezier(.22,1,.36,1)",display:"flex",flexDirection:"column"}}>
    <VisualHeader/>
    {useTableDesign?<TableBody/>:<RaceBody/>}
  </div>);
}

function EditorialNewsCard({article,onClick}){
  const[hov,setHov]=useState(false); const[ref,vis]=useReveal();
  const tm=gt(article);
  return(<div ref={ref} onClick={()=>onClick(article)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    style={{display:"flex",borderRadius:8,overflow:"hidden",cursor:"pointer",
      background:hov?"rgba(10,10,10,0.98)":"rgba(10,10,10,0.97)",
      border:hov?"1px solid rgba(255,255,255,0.12)":"1px solid rgba(255,255,255,0.056)",
      boxShadow:hov?"0 0 26px rgba(0,0,0,0.5),0 1px 0 "+tm.color+"18":"0 4px 16px rgba(0,0,0,0.24)",
      transform:hov?"translateY(-3px)":vis?"translateY(0)":"translateY(10px)",
      opacity:vis?1:0,transition:"all 0.24s cubic-bezier(.22,1,.36,1)",minHeight:90}}>
    <div style={{width:2,flexShrink:0,background:"linear-gradient(180deg,"+tm.color+"60,"+tm.color+"10)"}}/>
    <div style={{width:112,minWidth:112,flexShrink:0}}>
      <CardImage src={article.image} type={article.type} source={article.source||""} style={{width:"100%",height:"100%",minHeight:90}} zoom={hov}/>
    </div>
    <div style={{flex:1,padding:"11px 14px",display:"flex",flexDirection:"column",justifyContent:"space-between",minWidth:0}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,overflow:"hidden"}}>
        <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:tm.color,background:tm.color+"0e",border:"1px solid "+tm.color+"20",borderRadius:4,padding:"2px 6px",flexShrink:0}}>{tm.label}</span>
        {article.source&&<span style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,.35)",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{article.source}</span>}
        <span style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,.25)",fontWeight:700,flexShrink:0}}>{timeAgo(article.published_at)}</span>
      </div>
      <p style={{fontFamily:"'Inter',sans-serif",fontSize:12.5,fontWeight:700,lineHeight:1.38,color:hov?"#ffffff":"rgba(255,255,255,.55)",margin:0,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",flex:1}}>{article.title}</p>
    </div>
  </div>);
}


// ── Magazine card components ─────────────────────────────────────────
function MagHeroCard({article,onClick}){
  const[hov,setHov]=useState(false);
  const accent=gl(article).color; const tm=gt(article);
  return(
    <div onClick={()=>onClick(article)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{position:"relative",borderRadius:10,overflow:"hidden",cursor:"pointer",minHeight:240,
        border:hov?"1px solid "+accent+"55":"1px solid rgba(255,255,255,0.08)",
        transition:"all 0.22s cubic-bezier(.22,1,.36,1)",
        transform:hov?"translateY(-3px)":"translateY(0)",
        boxShadow:hov?"0 20px 48px rgba(0,0,0,.6),0 0 0 1px "+accent+"18":"0 8px 24px rgba(0,0,0,0.4)"}}>
      <div style={{position:"absolute",inset:0}}>
        <CardImage src={article.image} type={article.type} source={article.source||""} style={{width:"100%",height:"100%"}} zoom={hov}/>
      </div>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.95) 40%,rgba(0,0,0,0.35) 75%,rgba(0,0,0,0.1))",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:accent}}/>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:"16px 18px"}}>
        <div style={{display:"flex",gap:6,marginBottom:7}}>
          <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:tm.color,background:"rgba(18,18,18,0.98)",border:"1px solid "+tm.color+"40",borderRadius:4,padding:"2px 7px"}}>{tm.label}</span>
          {article.source&&<span style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.45)",background:"rgba(18,18,18,0.98)",borderRadius:4,padding:"2px 7px"}}>{article.source}</span>}
        </div>
        <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:18,fontWeight:900,color:"#ffffff",lineHeight:1.25,margin:"0 0 8px",letterSpacing:"-0.025em"}}>{article.title}</h2>
        {article.standfirst&&<p style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,.45)",lineHeight:1.5,margin:"0 0 9px",overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{article.standfirst}</p>}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,fontWeight:700,color:accent}}>Read more →</span>
          <span style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,.25)",marginLeft:"auto"}}>{timeAgo(article.published_at)}</span>
        </div>
      </div>
    </div>
  );
}

function MagSmallCard({article,onClick}){
  const[hov,setHov]=useState(false);const[ref,vis]=useReveal();
  const tm=gt(article);const league=gl(article);
  return(
    <div ref={ref} onClick={()=>onClick(article)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{borderRadius:8,overflow:"hidden",cursor:"pointer",display:"flex",flexDirection:"column",
        background:"var(--bg-card)",
        border:hov?"1px solid "+tm.color+"45":"1px solid var(--border)",
        transform:hov?"translateY(-2px)":vis?"translateY(0)":"translateY(8px)",
        opacity:vis?1:0,transition:"all 0.2s cubic-bezier(.22,1,.36,1)",
        boxShadow:hov?"var(--shadow-card)":"none"}}>
      <div style={{height:2.5,background:tm.color,flexShrink:0}}/>
      <div style={{height:64,overflow:"hidden",flexShrink:0,position:"relative"}}>
        <CardImage src={article.image} type={article.type} source={article.source||""} style={{width:"100%",height:"100%"}} zoom={hov}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.5),transparent)",pointerEvents:"none"}}/>
      </div>
      <div style={{padding:"8px 10px",flex:1,display:"flex",flexDirection:"column",gap:5}}>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:tm.color,background:tm.color+"12",border:"1px solid "+tm.color+"25",borderRadius:3,padding:"1px 5px"}}>{tm.label}</span>
          {article.league&&article.league!=="general"&&<span style={{fontSize:10,fontWeight:600,color:league.color,background:league.bg,borderRadius:3,padding:"1px 5px"}}>{league.abbr}</span>}
        </div>
        <p style={{fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:700,lineHeight:1.35,color:hov?"var(--text)":"var(--text-secondary)",margin:0,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",flex:1}}>{article.title}</p>
        <div style={{display:"flex",alignItems:"center",gap:4,marginTop:"auto"}}>
          {article.source&&<span style={{fontFamily:"'Inter',sans-serif",fontSize:8,color:"var(--text-muted)",fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{article.source}</span>}
          <span style={{fontFamily:"'Inter',sans-serif",fontSize:8,color:"var(--text-dim)",flexShrink:0}}>{timeAgo(article.published_at)}</span>
        </div>
      </div>
    </div>
  );
}
function FeaturedCard({article,onClick}){
  const[hov,setHov]=useState(false);
  if(article.type==="match_preview")return<MatchPreviewCard article={article} featured onClick={onClick}/>;
  const league=gl(article); const accent=league.color; const fb=getFB(article.type);
  return(<div onClick={()=>onClick(article)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    style={{position:"relative",borderRadius:10,overflow:"hidden",minHeight:320,cursor:"pointer",
      background:"rgba(10,10,10,0.99)",
      border:hov?"1px solid "+accent+"50":"1px solid "+accent+"22",
      boxShadow:hov?"0 0 48px "+accent+"18,0 28px 64px rgba(0,0,0,0.6)":"0 24px 56px rgba(0,0,0,0.45)",
      transform:hov?"translateY(-4px)":"translateY(0)",transition:"all 0.32s cubic-bezier(.22,1,.36,1)",
      display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:36}}>
    {article.image?(<>
      <div style={{position:"absolute",inset:0}}>
        <img src={article.image} alt="" loading="lazy"
          style={{width:"100%",height:"100%",objectFit:"cover",filter:"brightness(0.28)",
            transform:hov?"scale(1.04)":"scale(1)",transition:"transform 0.4s cubic-bezier(.22,1,.36,1)"}}
          onError={e=>e.currentTarget.parentElement.remove()}/>
      </div>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.97) 35%,rgba(0,0,0,0.5) 75%,transparent)",pointerEvents:"none"}}/>
    </>):(<>
      <div style={{position:"absolute",inset:0,background:FBP[fb.constructor===Object?Object.keys(FBP).find(k=>FBP[k]===fb)||"news":"news"]?.bg||fb.bg}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:fbBg(fb),backgroundSize:"cover"}}/>
    </>)}
    <div style={{position:"absolute",inset:0,backgroundImage:NOISE,backgroundSize:"200px 200px",pointerEvents:"none"}}/>
    <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,"+accent+",transparent)"}}/>
    <div style={{position:"absolute",top:28,left:32,display:"flex",gap:8}}>
      <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.14em",textTransform:"uppercase",color:accent,background:accent+"14",border:"1px solid "+accent+"38",borderRadius:6,padding:"3px 10px"}}>FEATURED</span>
      <CatBadge type={article.type} league={article.league}/>
    </div>
    <div style={{position:"relative",zIndex:1}}>
      <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:26,fontWeight:900,color:"#ffffff",lineHeight:1.2,letterSpacing:"-0.03em",margin:"0 0 10px"}}>{article.title}</h2>
      <p style={{fontFamily:"'Inter',sans-serif",fontSize:14,color:"rgba(255,255,255,.7)",lineHeight:1.6,margin:"0 0 20px",maxWidth:580}}>{article.standfirst||article.summary}</p>
      <div style={{display:"flex",alignItems:"center",gap:18}}>
        <span style={{fontSize:12,fontWeight:800,color:accent}}>Read full analysis →</span>
        <span style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,.25)",fontWeight:700}}>{timeAgo(article.published_at)}</span>
      </div>
    </div>
  </div>);
}

function RelatedCard({article,onClick}){
  const[hov,setHov]=useState(false); const tm=gt(article); const league=gl(article);
  const isP=article.type==="match_preview";
  return(<div onClick={()=>onClick(article)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    style={{display:"flex",gap:10,alignItems:"flex-start",padding:"11px 12px",borderRadius:0,cursor:"pointer",
      background:hov?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.02)",
      border:hov?"1px solid rgba(255,255,255,0.1)":"1px solid rgba(255,255,255,0.05)",transition:"all 0.15s ease"}}>
    {isP?(
      <div style={{width:44,height:36,flexShrink:0,display:"flex",gap:2,overflow:"hidden",borderRadius:6}}>
        {article.home_logo&&<img src={article.home_logo} style={{width:20,height:36,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"} alt=""/>}
        {article.away_logo&&<img src={article.away_logo} style={{width:20,height:36,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"} alt=""/>}
      </div>
    ):<div style={{width:44,height:36,flexShrink:0,borderRadius:0,overflow:"hidden"}}><CardImage src={article.image} type={article.type} source={article.source||""} style={{width:"100%",height:"100%"}}/></div>}
    <div style={{flex:1,minWidth:0}}>
      <div style={{display:"flex",gap:5,marginBottom:4}}>
        <span style={{fontSize:7,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",color:tm.color,background:tm.color+"10",borderRadius:4,padding:"1px 5px"}}>{tm.label}</span>
        {article.league&&article.league!=="general"&&<span style={{fontSize:7,fontWeight:900,letterSpacing:"0.08em",textTransform:"uppercase",color:league.color,background:league.bg,borderRadius:4,padding:"1px 5px"}}>{league.abbr}</span>}
      </div>
      <p style={{fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:700,color:hov?"#fff":"rgba(255,255,255,0.85)",lineHeight:1.35,margin:0,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{article.title}</p>
    </div>
  </div>);
}

function ArticlePage({article,allArticles,onClose,onNavigate}){
  const pageRef=useRef(null);
  useEffect(()=>{
    if(!article)return;
    const esc=e=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",esc); document.body.style.overflow="hidden";
    if(pageRef.current)pageRef.current.scrollTop=0;
    return()=>{window.removeEventListener("keydown",esc); document.body.style.overflow="";};
  },[article,onClose]);
  const [apWidth, setApWidth] = useState(()=>typeof window!=="undefined"?window.innerWidth:1200);
  useEffect(()=>{const h=()=>setApWidth(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  const apMob = apWidth < 640;
  const apTablet = apWidth < 900;
  if(!article)return null;
  const league=gl(article); const isPreview=article.type==="match_preview";
  const isExt=article.source_type==="external";
  const accent=isPreview?league.color:article.type==="title_race"?"rgba(255,255,255,.8)":"rgba(255,255,255,.75)";
  const ht=article.home_team||article.meta?.home_team;
  const at=article.away_team||article.meta?.away_team;
  const paras=Array.isArray(article.body)?article.body.filter(p=>p?.trim()).map(p=>p.replace(/\*\*/g,"")):[]; 
  const ms=article.meta?.match_stats;
  const related=allArticles.filter(a=>a.id!==article.id&&(a.league===article.league||a.type===article.type||[ht,at].filter(Boolean).some(t=>a.home_team===t||a.away_team===t))).slice(0,5);
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:1100,background:"rgba(18,18,18,0.98)",animation:"apBack .22s ease both"}}/>
    <div ref={pageRef} style={{position:"fixed",inset:0,zIndex:1101,overflowY:"auto",overflowX:"hidden",background:"linear-gradient(170deg,rgba(5,10,22,0.995),rgba(2,5,12,0.995))",scrollbarWidth:"thin",scrollbarColor:"rgba(255,255,255,0.05) transparent",animation:"apUp .3s cubic-bezier(.22,1,.36,1) both"}}>
      <div style={{height:2,background:"linear-gradient(90deg,"+accent+",transparent)",position:"sticky",top:0,zIndex:10}}/>
      <button onClick={onClose} style={{position:"fixed",top:16,right:20,zIndex:1200,width:40,height:40,borderRadius:"50%",background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,0.14)",color:"rgba(255,255,255,.55)",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.14)";e.currentTarget.style.color="#f0f6ff";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.07)";e.currentTarget.style.color="rgba(255,255,255,.55)";}}>&#x2715;</button>
      <div style={{maxWidth:1080,margin:"0 auto",padding:apMob?"0 14px 80px":"0 24px 80px"}}>
        {isPreview&&ht&&at
          ?<HeroVSBanner homeTeam={ht} awayTeam={at} homeLogo={article.home_logo||article.meta?.home_logo} awayLogo={article.away_logo||article.meta?.away_logo} height={apMob?160:220}/>
          :<div style={{width:"100%",height:apMob?180:260,overflow:"hidden",borderRadius:"0 0 20px 20px",position:"relative"}}>
            <CardImage src={article.image} type={article.type} source={article.source||""} style={{width:"100%",height:"100%"}}/>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(5,10,22,1),rgba(5,10,22,0.35) 55%,transparent)",pointerEvents:"none"}}/>
            <div style={{position:"absolute",bottom:20,left:24}}><CatBadge type={article.type} league={article.league}/></div>
          </div>}
        <div style={{display:"grid",gridTemplateColumns:apTablet?"1fr":"1fr 290px",gap:apTablet?0:36,marginTop:apMob?20:32,alignItems:"start"}}>
          <div>
            <div style={{display:"flex",gap:10,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
              {!article.image&&!isPreview&&<CatBadge type={article.type} league={article.league}/>}
              {article.author&&<span style={{fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:800,color:"rgba(255,255,255,.9)"}}>{article.author}</span>}
              {article.source&&<span style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,.35)",fontWeight:700}}>{article.source_type==="external"?"via "+article.source:"StatinSite Intelligence Desk"}</span>}
              <span style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,.25)",fontWeight:700}}>{timeAgo(article.published_at)}</span>
            </div>
            <h1 style={{fontFamily:"'Inter',sans-serif",fontSize:28,fontWeight:900,color:"#ffffff",lineHeight:1.2,letterSpacing:"-0.025em",margin:"0 0 14px"}}>{article.title}</h1>
            {article.standfirst&&<p style={{fontFamily:"'Inter',sans-serif",fontSize:16,lineHeight:1.7,color:"#7a9ab8",margin:"0 0 24px",borderLeft:"3px solid "+accent+"40",paddingLeft:16}}>{article.standfirst}</p>}
            {isPreview&&<MatchInfoBar article={article}/>}
            {!isExt&&paras.length>0&&(
              <div style={{display:"flex",flexDirection:"column",gap:18,marginBottom:32}}>
                {paras.map((p,i)=>(
                  <p key={i} style={{fontFamily:"'Inter',sans-serif",fontSize:15.5,lineHeight:1.82,color:i===paras.length-1?"rgba(255,255,255,.9)":"rgba(200,215,230,0.85)",margin:0,fontWeight:i===paras.length-1?600:400,...(i===paras.length-1?{borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:18}:{})}}>{p}</p>
                ))}
              </div>)}
            {isExt&&(<div style={{display:"flex",flexDirection:"column",gap:18,marginBottom:32}}>
              {paras.length>0
                ?paras.map((p,i)=><p key={i} style={{fontFamily:"'Inter',sans-serif",fontSize:15.5,lineHeight:1.82,color:i===paras.length-1?"rgba(255,255,255,.9)":"rgba(200,215,230,0.85)",margin:0}}>{p}</p>)
                :<p style={{fontFamily:"'Inter',sans-serif",fontSize:15,lineHeight:1.75,color:"rgba(255,255,255,.7)",margin:0}}>{article.standfirst||article.summary}</p>}
              {article.url&&<a href={article.url} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 22px",borderRadius:999,background:accent,color:"#080808",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:800,textDecoration:"none",width:"fit-content",marginTop:8}}>Read full article at {article.source} →</a>}
            </div>)}
            {ms&&(<div style={{marginTop:32,padding:"18px 20px",borderRadius:0,background:"rgba(255,255,255,0.018)",border:"1px solid "+accent+"14"}}>
              <div style={{fontSize:11,fontWeight:700,color:accent,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:16}}>Key Statistics</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:22}}>
                {[{l:"xG Home",v:ms.expected_goals_home},{l:"xG Away",v:ms.expected_goals_away},
                  {l:"Over 2.5",v:ms.over25_probability!=null?ms.over25_probability+"%":null},
                  {l:"BTTS",v:ms.btts_probability!=null?ms.btts_probability+"%":null},
                  {l:"Confidence",v:ms.confidence!=null?ms.confidence+"%":null},
                  {l:"Projected",v:ms.most_likely_score}].filter(s=>s.v!=null).map((s,i)=>(
                  <div key={i}>
                    <div style={{fontFamily:"'Inter',sans-serif",fontSize:17,fontWeight:900,color:accent}}>{s.v}</div>
                    <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.25)",letterSpacing:"0.08em",textTransform:"uppercase",marginTop:2}}>{s.l}</div>
                  </div>))}
              </div>
            </div>)}
          </div>
          <div style={{position:"sticky",top:60,display:apTablet?"none":"flex",flexDirection:"column",gap:16}}>
            {!isExt&&article.model_verdict&&(
              <div style={{borderRadius:0,padding:"16px 18px",background:accent+"07",border:"1px solid "+accent+"1e"}}>
                <div style={{fontSize:11,fontWeight:700,color:accent,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>Model Verdict</div>
                <p style={{fontFamily:"'Inter',sans-serif",fontSize:12,lineHeight:1.65,color:"#7a9ab8",margin:0}}>{article.model_verdict}</p>
              </div>)}
            {related.length>0&&(<div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{width:2,height:18,borderRadius:2,background:"linear-gradient(180deg,"+accent+",transparent)"}}/>
                <span style={{fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:900,color:"#ffffff"}}>Related</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {related.map(a=><RelatedCard key={a.id} article={a} onClick={a2=>{onNavigate(a2);if(pageRef.current)pageRef.current.scrollTop=0;}}/>)}
              </div>
            </div>)}
          </div>
        </div>
      </div>
    </div>
  </>);
}

function TrendingBar({clubs,activeClub,onSelect}){
  if(!clubs?.length)return null;
  return(<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18,overflowX:"auto",scrollbarWidth:"none",paddingBottom:2}}>
    <span style={{fontSize:11,fontWeight:700,letterSpacing:"0.12em",color:"var(--text-muted)",textTransform:"uppercase",flexShrink:0}}>Trending</span>
    {clubs.map(club=>(<button key={club} onClick={()=>onSelect(club===activeClub?null:club)}
      style={{fontSize:10,fontWeight:800,color:club===activeClub?"var(--text)":"var(--text-secondary)",
        background:club===activeClub?"var(--bg-active)":"var(--bg-glass)",
        border:club===activeClub?"1px solid var(--border-strong)":"1px solid var(--border)",
        borderRadius:999,padding:"5px 12px",flexShrink:0,cursor:"pointer",transition:"all .17s ease",
        boxShadow:club===activeClub?"var(--shadow-glow-blue)":"none",fontFamily:"'Inter',sans-serif"}}>{club}</button>))}
  </div>);
}

function Chip({label,active,color="var(--text-secondary)",onClick,count}){
  const[hov,setHov]=useState(false);
  return(<button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:0,
      border:active?"1.5px solid var(--border-strong)":hov?"1.5px solid var(--border-strong)":"1.5px solid var(--border)",
      background:active?"var(--bg-active)":hov?"var(--bg-hover)":"var(--bg-glass)",
      color:active?"var(--text)":hov?"var(--text-secondary)":"var(--text-muted)",
      fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:800,letterSpacing:"0.04em",
      cursor:"pointer",transition:"all .17s ease",whiteSpace:"nowrap",flexShrink:0,
      boxShadow:active?"var(--shadow-glow-blue)":"none"}}>
    {active&&<span style={{width:5,height:5,borderRadius:"50%",background:"var(--blue)",boxShadow:"0 0 7px var(--blue-glow)",flexShrink:0}}/>}
    {label}
    {count!=null&&<span style={{fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:700,color:active?"var(--blue)":"var(--text-muted)",background:active?"var(--blue-soft)":"var(--bg-glass)",borderRadius:999,padding:"1px 5px"}}>{count}</span>}
  </button>);
}

function Skeleton({h=200}){
  return(<div style={{borderRadius:18,height:h,background:"linear-gradient(90deg,var(--bg-glass) 0%,var(--bg-hover) 50%,var(--bg-glass) 100%)",backgroundSize:"400% 100%",animation:"shimmer 1.6s ease-in-out infinite",border:"1px solid var(--border)"}}/>);
}

function SectionHead({title,sub,accent="var(--blue)",count}){
  return(<div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:20}}>
    <div style={{width:3,height:36,borderRadius:2,background:"linear-gradient(180deg,"+accent+",transparent)",flexShrink:0,marginTop:2}}/>
    <div style={{flex:1}}>
      <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:18,fontWeight:900,color:"var(--text)",margin:0,letterSpacing:"-0.02em"}}>{title}</h2>
      {sub&&<p style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"var(--text-muted)",margin:"2px 0 0",fontWeight:600}}>{sub}</p>}
    </div>
    {count!=null&&<span style={{fontFamily:"'Inter',sans-serif",fontSize:10,color:"var(--text-muted)",fontWeight:700,marginTop:6}}>{count}</span>}
  </div>);
}

// ── Live Intelligence Ticker ─────────────────────────────────
function IntelligenceTicker(){
  const[items,setItems]=useState([]);
  const[pos,setPos]=useState(0);
  useEffect(()=>{
    fetch(BACKEND+'/api/intelligence/ticker').then(r=>r.ok?r.json():null).then(d=>{if(d?.items)setItems(d.items);}).catch(()=>{});
  },[]);
  useEffect(()=>{
    if(!items.length)return;
    const t=setInterval(()=>setPos(p=>(p+1)%items.length),4500);
    return()=>clearInterval(t);
  },[items.length]);
  if(!items.length)return null;
  const COLORS={green:"var(--green)",red:"var(--red)",blue:"var(--blue)",amber:"var(--amber)"};
  return(<div style={{width:"100%",background:"var(--bg-glass)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderBottom:"1px solid var(--border)",borderTop:"1px solid var(--border)",padding:"8px 0",overflow:"hidden",position:"relative",marginBottom:24}}>
    <div style={{display:"flex",alignItems:"center",gap:0}}>
      <div style={{flexShrink:0,padding:"0 16px",borderRight:"1px solid var(--border)",marginRight:16}}>
        <span style={{fontSize:10,fontWeight:700,color:"var(--text-secondary)",letterSpacing:"0.14em",textTransform:"uppercase",fontFamily:"'Inter',sans-serif"}}>Live</span>
      </div>
      <div style={{flex:1,overflow:"hidden"}}>
        <div style={{display:"flex",gap:40,animation:"tickerScroll 40s linear infinite",whiteSpace:"nowrap"}}>
          {[...items,...items].map((item,i)=>{
            const c=COLORS[item.color]||"var(--text-secondary)";
            return(<span key={i} style={{fontSize:11,fontWeight:600,color:c,fontFamily:"'Inter',sans-serif",display:"inline-flex",alignItems:"center",gap:8,flexShrink:0}}>
              <span style={{width:4,height:4,borderRadius:"50%",background:c,display:"inline-block",flexShrink:0}}/>
              {item.text}
            </span>);
          })}
        </div>
      </div>
    </div>
    <style>{"@keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}"}</style>
  </div>);
}

// ── Transfer Hub Sidebar ──────────────────────────────────────
function TransferHub({items}){
  const[open,setOpen]=useState(null);
  if(!items?.length)return null;
  return(<div style={{background:"rgba(10,16,30,0.98)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:0,overflow:"hidden"}}>
    <div style={{padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:3,height:20,borderRadius:2,background:"linear-gradient(180deg,#f59e0b,transparent)",flexShrink:0}}/>
      <span style={{fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:900,color:"#ffffff"}}>Transfer Hub</span>
      <span style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,.7)",fontWeight:700,marginLeft:"auto"}}>{items.length}</span>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
      {items.slice(0,8).map((t,i)=>(
        <a key={i} href={t.url||"#"} target="_blank" rel="noopener noreferrer"
          style={{display:"flex",gap:10,padding:"10px 14px",borderBottom:i<7?"1px solid rgba(255,255,255,0.04)":"none",textDecoration:"none",transition:"background 0.15s ease"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          {t.image
            ?<img src={t.image} alt="" style={{width:44,height:36,objectFit:"cover",borderRadius:6,flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>
            :<div style={{width:44,height:36,borderRadius:6,flexShrink:0,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="2"><path d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4"/></svg></div>}
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:700,color:"#fff",margin:"0 0 3px",overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",lineHeight:1.35}}>{t.headline||t.title}</p>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <span style={{fontFamily:"'Inter',sans-serif",fontSize:8,color:"rgba(255,255,255,.35)",fontWeight:700}}>{t.source}</span>
              <span style={{fontFamily:"'Inter',sans-serif",fontSize:8,color:"rgba(255,255,255,.25)",fontWeight:700}}>{timeAgo(t.published_at)}</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  </div>);
}


// ── Intricate animated background for NewsTracker ─────────────────────────
function NewsIntricateBg() {
  return (
    <div className="sn-fixed-bg" style={{position:"fixed",top:0,right:0,bottom:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:"var(--bg)"}}/>

      {/* Radial glows */}
      <div style={{position:"absolute",top:"-15%",right:"15%",width:"55vw",height:"55vw",
        background:"radial-gradient(ellipse,rgba(255,255,255,.022) 0%,transparent 60%)"}}/>
      <div style={{position:"absolute",bottom:"0%",left:"5%",width:"45vw",height:"45vw",
        background:"radial-gradient(ellipse,rgba(255,255,255,.015) 0%,transparent 55%)"}}/>

      {/* Fine grid */}
      <div style={{position:"absolute",inset:0,
        backgroundImage:"linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)",
        backgroundSize:"44px 44px"}}/>
      {/* Bold grid overlay */}
      <div style={{position:"absolute",inset:0,
        backgroundImage:"linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px)",
        backgroundSize:"176px 176px"}}/>

      {/* SVG intricate patterns */}
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <defs>
          {/* Diagonal hatch */}
          <pattern id="news-hatch" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            <line x1="0" y1="80" x2="80" y2="0" stroke="rgba(255,255,255,.014)" strokeWidth="0.8"/>
            <line x1="-20" y1="80" x2="60" y2="0" stroke="rgba(255,255,255,.008)" strokeWidth="0.5"/>
          </pattern>
          {/* Crosshair dots */}
          <pattern id="news-cross" x="0" y="0" width="88" height="88" patternUnits="userSpaceOnUse">
            <circle cx="44" cy="44" r="0.9" fill="rgba(255,255,255,.06)"/>
            <line x1="40" y1="44" x2="48" y2="44" stroke="rgba(255,255,255,.04)" strokeWidth="0.5"/>
            <line x1="44" y1="40" x2="44" y2="48" stroke="rgba(255,255,255,.04)" strokeWidth="0.5"/>
          </pattern>
          {/* Hexagon cells */}
          <pattern id="news-hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
            <polygon points="30,2 58,16 58,36 30,50 2,36 2,16" fill="none" stroke="rgba(255,255,255,.018)" strokeWidth="0.6"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#news-hatch)"/>
        <rect width="100%" height="100%" fill="url(#news-cross)"/>
        {/* Strategic hex zone — top right */}
        <g opacity="0.6">
          <rect x="60%" y="0" width="40%" height="40%" fill="url(#news-hex)"/>
        </g>
      </svg>

      {/* Corner brackets — top left */}
      <svg style={{position:"absolute",top:0,left:0,width:200,height:200,opacity:.1}} viewBox="0 0 200 200">
        <polyline points="12,80 12,12 80,12" fill="none" stroke="white" strokeWidth="1.2"/>
        <polyline points="12,100 12,12 100,12" fill="none" stroke="white" strokeWidth=".4"/>
        <circle cx="12" cy="12" r="3" fill="none" stroke="white" strokeWidth=".8"/>
      </svg>
      {/* Corner bracket — bottom right */}
      <svg style={{position:"absolute",bottom:0,right:0,width:200,height:200,opacity:.08}} viewBox="0 0 200 200">
        <polyline points="188,120 188,188 120,188" fill="none" stroke="white" strokeWidth="1.2"/>
        <polyline points="188,100 188,188 100,188" fill="none" stroke="white" strokeWidth=".4"/>
      </svg>

      {/* Giant ghost typography */}
      <div style={{position:"absolute",top:"4vh",left:"-1%",fontFamily:"'Inter',sans-serif",fontWeight:900,
        fontSize:"clamp(80px,13vw,160px)",color:"rgba(255,255,255,.018)",lineHeight:1,userSelect:"none",letterSpacing:"-.04em"}}>
        NEWS
      </div>
      <div style={{position:"absolute",bottom:"10vh",right:"-1%",fontFamily:"'Inter',sans-serif",fontWeight:900,
        fontSize:"clamp(60px,10vw,130px)",color:"rgba(255,255,255,.014)",lineHeight:1,userSelect:"none",letterSpacing:"-.04em"}}>
        LIVE
      </div>
    </div>
  );
}


// ── Intricate background ──────────────────────────────────────────────────────
function NewsBg() {
  return (
    <div aria-hidden="true" className="sn-fixed-bg" style={{position:"fixed",top:0,right:0,bottom:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:"var(--bg)"}}/>
      <div style={{position:"absolute",top:"-15%",left:"25%",width:"60vw",height:"60vw",background:"radial-gradient(ellipse,rgba(255,255,255,.012) 0%,transparent 65%)"}}/>
      <div style={{position:"absolute",bottom:"-5%",right:"10%",width:"45vw",height:"45vw",background:"radial-gradient(ellipse,rgba(255,255,255,.009) 0%,transparent 55%)"}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px)",backgroundSize:"44px 44px"}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,.042) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.042) 1px,transparent 1px)",backgroundSize:"176px 176px"}}/>
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="NewsBg-sl" width="110" height="110" patternUnits="userSpaceOnUse">
            <line x1="0" y1="110" x2="110" y2="0" stroke="rgba(255,255,255,.009)" strokeWidth="0.6"/>
          </pattern>
          <pattern id="NewsBg-dt" width="44" height="44" patternUnits="userSpaceOnUse">
            <circle cx="22" cy="22" r="0.65" fill="rgba(255,255,255,.055)"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#NewsBg-sl)"/>
        <rect width="100%" height="100%" fill="url(#NewsBg-dt)"/>
      </svg>
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
    <footer style={{
      borderTop: "1px solid var(--border)",
      paddingTop: 32,
      paddingBottom: 40,
    }}>
      <div style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
      }}>
        {/* Branding */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 3, height: 22, background: "var(--blue)", borderRadius: 2 }} />
            <span style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", letterSpacing: "-.04em" }}>StatinSite</span>
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: ".03em", paddingLeft: 13 }}>
            Football Intelligence · Model Predictions
          </span>
        </div>

        {/* Built by */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          padding: "16px 28px",
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "var(--bg-glass)",
        }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: ".14em", textTransform: "uppercase" }}>Built by</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", letterSpacing: "-.02em" }}>Rutej Talati</div>
        </div>

        {/* Right info */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: ".04em" }}>statinsite.com</span>
          <span style={{ fontSize: 10, color: "var(--text-dim)" }}>© {new Date().getFullYear()} StatinSite. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}


export default function NewsTrackerPage(){
  const[articles,setArticles]=useState([]);
  const[transferItems,setTransferItems]=useState([]);
  const[trending,setTrending]=useState([]);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState(null);
  const[lastUpdated,setLastUpdated]=useState(null);
  const[selectedArticle,setSelectedArticle]=useState(null);
  const[activeType,setActiveType]=useState("all");
  const[activeLeague,setActiveLeague]=useState("all");
  const[activeClub,setActiveClub]=useState(null);
  const[sortMode,setSortMode]=useState("matchday");

  const openArticle=useCallback(a=>setSelectedArticle(a),[]);
  const closeArticle=useCallback(()=>setSelectedArticle(null),[]);
  const navArticle=useCallback(a=>setSelectedArticle(a),[]);

  useEffect(()=>{
    async function load(){
      try{
        setLoading(true);setError(null);
        const res=await fetch(BACKEND+"/api/intelligence/feed?limit=60");
        if(!res.ok)throw new Error("HTTP "+res.status);
        const data=await res.json();
        setArticles((data.items||[]).map(normalise));
        setTrending(data.trending_clubs||[]);
        setTransferItems(data.transfer_items||[]);
        setLastUpdated(new Date());
      }catch(e){setError(e.message);}
      finally{setLoading(false);}
    }
    load();
    const t=setInterval(load,5*60*1000);
    return()=>clearInterval(t);
  },[]);

  const filtered=useMemo(()=>articles.filter(a=>{
    const typeOk=activeType==="all"||a.type===activeType
      ||(activeType==="insight"&&["model_insight","title_race"].includes(a.type))
      ||(activeType==="news"&&["news","headline","transfer","injury","manager","analysis"].includes(a.type));
    const leagueOk=activeLeague==="all"||a.league===activeLeague;
    const clubOk=!activeClub||[a.home_team,a.away_team,a.meta?.team].some(t=>t?.toLowerCase().includes(activeClub.toLowerCase()))
      ||(a.title+" "+(a.standfirst||"")).toLowerCase().includes(activeClub.toLowerCase());
    return typeOk&&leagueOk&&clubOk;
  }),[articles,activeType,activeLeague,activeClub]);

  const sorted=useMemo(()=>{
    const now=Date.now();
    return[...filtered].sort((a,b)=>{
      if(sortMode==="latest")return new Date(b.published_at)-new Date(a.published_at);
      if(sortMode==="matchday"){
        const aKO=a.meta?.kickoff?new Date(a.meta.kickoff).getTime():null;
        const bKO=b.meta?.kickoff?new Date(b.meta.kickoff).getTime():null;
        const a48=aKO&&aKO>now&&aKO-now<48*3600*1000;
        const b48=bKO&&bKO>now&&bKO-now<48*3600*1000;
        if(a48&&!b48)return-1;if(!a48&&b48)return 1;
        const aP=a.type==="match_preview",bP=b.type==="match_preview";
        if(aP&&!bP)return-1;if(!aP&&bP)return 1;
        return new Date(b.published_at)-new Date(a.published_at);
      }
      const ai=a.source_type==="internal",bi=b.source_type==="internal";
      if(ai&&!bi)return-1;if(!ai&&bi)return 1;
      return new Date(b.published_at)-new Date(a.published_at);
    });
  },[filtered,sortMode]);

  const previews=sorted.filter(a=>a.type==="match_preview");
  const insights=sorted.filter(a=>["model_insight","title_race"].includes(a.type));
  const newsFeed=sorted.filter(a=>!["match_preview","model_insight","title_race"].includes(a.type));
  const allFeed=sorted;
  const featured=previews[0]||insights[0]||newsFeed[0]||null;
  const counts={all:articles.length,
    preview:articles.filter(a=>a.type==="match_preview").length,
    insight:articles.filter(a=>["model_insight","title_race"].includes(a.type)).length,
    news:articles.filter(a=>["news","headline","transfer","injury","manager","analysis"].includes(a.type)).length};

  const TF=[{key:"all",label:"All",color:"rgba(255,255,255,.4)"},{key:"preview",label:"Previews",color:"rgba(255,255,255,.85)"},{key:"insight",label:"Insights",color:"rgba(255,255,255,.75)"},{key:"news",label:"News",color:"rgba(255,255,255,.7)"}];
  const LF=[{key:"all",label:"All Leagues",color:"rgba(255,255,255,.4)"},{key:"epl",label:"Premier League",color:"rgba(255,255,255,.85)"},{key:"laliga",label:"La Liga",color:"rgba(255,255,255,.7)"},{key:"seriea",label:"Serie A",color:"rgba(255,255,255,.75)"},{key:"bundesliga",label:"Bundesliga",color:"rgba(255,255,255,.7)"},{key:"ligue1",label:"Ligue 1",color:"rgba(255,255,255,.7)"}];
  const SF=[{key:"matchday",label:"Matchday"},{key:"latest",label:"Latest"},{key:"trending",label:"Trending"}];

  const isMobile = typeof window !== "undefined" ? window.innerWidth < 640 : false;
  const [mobileWidth, setMobileWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(()=>{const h=()=>setMobileWidth(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  const isMob = mobileWidth < 640;
  const isTablet = mobileWidth < 960;

  return(<div style={{fontFamily:"'Inter',sans-serif",position:"relative"}}>

    {/* ── Keyframes ────────────────────────────────────────── */}
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
      *{box-sizing:border-box;}
      @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
      @keyframes nbPulse{0%,100%{opacity:1}50%{opacity:0.35}}
      @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}
      @keyframes apBack{from{opacity:0}to{opacity:1}}
      @keyframes apUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
      @keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
      @keyframes scanH{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}
      @keyframes snLivePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.55)}}
      ::-webkit-scrollbar{width:4px;height:4px}
      ::-webkit-scrollbar-track{background:#080808}
      ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:2px}
      ::selection{background:#fff;color:#080808}
      .nt-hide-scroll{-ms-overflow-style:none;scrollbar-width:none}
      .nt-hide-scroll::-webkit-scrollbar{display:none}
    `}</style>

    {/* ── Intricate Background ─────────────────────────────── */}
    <div aria-hidden="true" className="sn-fixed-bg" style={{position:"fixed",top:0,right:0,bottom:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,background:"var(--bg)",transition:"background 0.25s"}}/>
      {/* Radial glows */}
      <div style={{position:"absolute",top:"-15%",right:"10%",width:"65vw",height:"65vw",
        background:"radial-gradient(ellipse,rgba(255,255,255,.016) 0%,transparent 60%)"}}/>
      <div style={{position:"absolute",bottom:"-5%",left:"5%",width:"50vw",height:"50vw",
        background:"radial-gradient(ellipse,rgba(255,255,255,.012) 0%,transparent 55%)"}}/>
      {/* Fine grid */}
      <div style={{position:"absolute",inset:0,
        backgroundImage:"linear-gradient(var(--border-soft) 1px,transparent 1px),linear-gradient(90deg,var(--border-soft) 1px,transparent 1px)",
        backgroundSize:"42px 42px"}}/>
      {/* Bold grid */}
      <div style={{position:"absolute",inset:0,
        backgroundImage:"linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)",
        backgroundSize:"168px 168px"}}/>
      {/* SVG intricate */}
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}} preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="nt-hatch" width="84" height="84" patternUnits="userSpaceOnUse">
            <line x1="0" y1="84" x2="84" y2="0" stroke="rgba(255,255,255,.011)" strokeWidth="0.8"/>
            <line x1="-21" y1="84" x2="63" y2="0" stroke="rgba(255,255,255,.006)" strokeWidth="0.5"/>
          </pattern>
          <pattern id="nt-cross" width="84" height="84" patternUnits="userSpaceOnUse">
            <circle cx="42" cy="42" r="0.9" fill="rgba(255,255,255,.065)"/>
            <line x1="38" y1="42" x2="46" y2="42" stroke="rgba(255,255,255,.035)" strokeWidth="0.5"/>
            <line x1="42" y1="38" x2="42" y2="46" stroke="rgba(255,255,255,.035)" strokeWidth="0.5"/>
          </pattern>
          <pattern id="nt-hex" width="56" height="48" patternUnits="userSpaceOnUse">
            <polygon points="28,2 54,14 54,34 28,46 2,34 2,14" fill="none" stroke="rgba(255,255,255,.02)" strokeWidth="0.6"/>
          </pattern>
          <pattern id="nt-circle" width="120" height="120" patternUnits="userSpaceOnUse">
            <circle cx="60" cy="60" r="28" fill="none" stroke="rgba(255,255,255,.014)" strokeWidth="0.6"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,.008)" strokeWidth="0.4"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#nt-hatch)"/>
        <rect width="100%" height="100%" fill="url(#nt-cross)"/>
        <rect x="55%" y="0" width="45%" height="45%" fill="url(#nt-hex)" opacity="0.8"/>
        <rect x="0" y="60%" width="35%" height="40%" fill="url(#nt-circle)" opacity="0.7"/>
      </svg>
      {/* Corner brackets */}
      <svg style={{position:"absolute",top:0,left:0,width:200,height:200,opacity:.09}} viewBox="0 0 200 200">
        <polyline points="14,90 14,14 90,14" fill="none" stroke="white" strokeWidth="1.4"/>
        <polyline points="14,110 14,14 110,14" fill="none" stroke="white" strokeWidth=".5"/>
        <circle cx="14" cy="14" r="3" fill="none" stroke="white" strokeWidth="1"/>
        <circle cx="14" cy="14" r="6" fill="none" stroke="white" strokeWidth=".4"/>
      </svg>
      <svg style={{position:"absolute",bottom:0,right:0,width:200,height:200,opacity:.07}} viewBox="0 0 200 200">
        <polyline points="186,110 186,186 110,186" fill="none" stroke="white" strokeWidth="1.4"/>
        <polyline points="186,90 186,186 90,186" fill="none" stroke="white" strokeWidth=".5"/>
      </svg>
      <svg style={{position:"absolute",top:0,right:0,width:160,height:160,opacity:.06}} viewBox="0 0 160 160">
        <polyline points="146,60 146,14 100,14" fill="none" stroke="white" strokeWidth="1"/>
      </svg>
      {/* Ghost text */}
      <div style={{position:"absolute",top:"3vh",left:"-1%",fontFamily:"'Inter',sans-serif",fontWeight:900,
        fontSize:"clamp(70px,11vw,150px)",color:"rgba(255,255,255,.016)",lineHeight:1,userSelect:"none",letterSpacing:"-.05em"}}>
        NEWS
      </div>
      <div style={{position:"absolute",bottom:"8vh",right:"-1%",fontFamily:"'Inter',sans-serif",fontWeight:900,
        fontSize:"clamp(50px,9vw,120px)",color:"rgba(255,255,255,.013)",lineHeight:1,userSelect:"none",letterSpacing:"-.05em"}}>
        LIVE
      </div>
      <div style={{position:"absolute",top:"45vh",left:"40%",fontFamily:"'Inter',sans-serif",fontWeight:900,
        fontSize:"clamp(40px,7vw,100px)",color:"rgba(255,255,255,.01)",lineHeight:1,userSelect:"none",letterSpacing:"-.04em"}}>
        xG
      </div>
    </div>

    <ArticlePage article={selectedArticle} allArticles={articles} onClose={closeArticle} onNavigate={navArticle}/>

    {/* ── Main Content ─────────────────────────────────────── */}
    <div style={{maxWidth:1360,margin:"0 auto",padding:isMob?"0 14px 100px":"0 28px 80px",position:"relative",zIndex:1}}>

      {/* ── PAGE HEADER ── */}
      <div className="sn-ph" style={{ background:"linear-gradient(175deg,rgba(255,159,10,0.05) 0%,transparent 55%)" }}>
        <div className="sn-ph-row">
          <div>
            <div className="sn-eyebrow">
              <div className="sn-eyebrow-dot" style={{ background:"#ff9f0a" }}/>
              <span className="sn-eyebrow-label" style={{ color:"#ff9f0a" }}>
                News Tracker{lastUpdated ? ` · ${timeAgo(lastUpdated)}` : ""}
              </span>
            </div>
            <h1 className="sn-page-title">Football Intelligence</h1>
            <p className="sn-page-sub">Model previews · Transfers · Tactical insights · Live signals</p>
          </div>
          <div className="sn-badge" style={{ color:"#ff9f0a", borderColor:"rgba(255,159,10,0.3)", background:"rgba(255,159,10,0.08)", flexShrink:0 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#ff9f0a", display:"inline-block", animation:"sn-pulse 2s infinite" }}/>
            Live feed
          </div>
        </div>
      </div>

      {/* ── STAT STRIP ── */}
      <div className="sn-strip">
        <div className="sn-chip">
          <div className="sn-chip-label">Articles today</div>
          <div className="sn-chip-value" style={{ color:"#ff9f0a" }}>{counts.all}</div>
        </div>
        <div className="sn-chip">
          <div className="sn-chip-label">Previews</div>
          <div className="sn-chip-value" style={{ color:"#0a84ff" }}>{counts.preview}</div>
        </div>
        <div className="sn-chip">
          <div className="sn-chip-label">Insights</div>
          <div className="sn-chip-value" style={{ color:"#30d158" }}>{counts.insight}</div>
        </div>
        <div className="sn-chip">
          <div className="sn-chip-label">News</div>
          <div className="sn-chip-value" style={{ color:"#fff" }}>{counts.news}</div>
        </div>
      </div>

      {/* Intelligence Ticker */}
      <IntelligenceTicker/>

      {/* ── FILTERS ──────────────────────────────────────────── */}
      <TrendingBar clubs={trending} activeClub={activeClub} onSelect={setActiveClub}/>

      <div style={{marginBottom:24,marginTop:4}}>
        {/* Type + league filters row */}
        <div className="nt-hide-scroll" style={{
          display:"flex",gap:6,flexWrap:"nowrap",
          overflowX:"auto",paddingBottom:8,alignItems:"center",
        }}>
          {TF.map(f=><Chip key={f.key} label={f.label} active={activeType===f.key} color={f.color} count={counts[f.key]} onClick={()=>setActiveType(f.key)}/>)}
          <div style={{width:1,height:20,background:"var(--border)",flexShrink:0,margin:"0 4px"}}/>
          {LF.map(f=><Chip key={f.key} label={f.label} active={activeLeague===f.key} color={f.color} onClick={()=>setActiveLeague(f.key)}/>)}
          <div style={{width:1,height:20,background:"var(--border)",flexShrink:0,margin:"0 4px"}}/>
          {SF.map(s=><Chip key={s.key} label={s.label} active={sortMode===s.key} color="rgba(255,255,255,.4)" onClick={()=>setSortMode(s.key)}/>)}
        </div>
      </div>

      {/* Error state */}
      {error&&(
        <div style={{
          padding:"14px 18px",marginBottom:20,
          background:"var(--bg-glass)",
          border:"1px solid var(--border)",
          borderRadius:8,fontSize:13,color:"var(--text-secondary)",
        }}>Failed to load: {error}</div>
      )}

      {/* Loading skeletons */}
      {loading&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Skeleton h={isMob?240:320}/>
          <div style={{display:"grid",gridTemplateColumns:isTablet?"1fr":"1fr 280px",gap:20}}>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[1,2,3,4,5,6].map(i=><Skeleton key={i} h={90}/>)}
            </div>
            {!isTablet&&<Skeleton h={480}/>}
          </div>
        </div>
      )}

      {/* ── CONTENT ──────────────────────────────────────────── */}
      {!loading&&!error&&(
        <div style={{display:"flex",flexDirection:"column",gap:isMob?28:40}}>

          {/* Featured article */}
          {featured&&<FeaturedCard article={featured} onClick={openArticle}/>}

          {/* Main layout: left feed + right sidebar */}
          <div style={{
            display:"grid",
            gridTemplateColumns:isTablet?"1fr":"1fr 300px",
            gap:isTablet?24:32,
            alignItems:"start",
          }}>

            {/* LEFT — news feed */}
            <div style={{display:"flex",flexDirection:"column",gap:isMob?28:40}}>

              {/* Latest News */}
              {newsFeed.length>0&&(
                <section>
                  <SectionHead title="Latest News" sub="Breaking news · Transfers · Injuries" accent="#ffffff" count={newsFeed.length}/>
                  {/* Mobile: single column stack */}
                  {isMob?(
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {newsFeed.slice(0,12).map((a,i)=><MagSmallCard key={a.id||i} article={a} onClick={openArticle}/>)}
                    </div>
                  ):(
                    <>
                      {newsFeed.length>=3&&(
                        <div style={{display:"grid",gridTemplateColumns:"1.7fr 1fr",gridTemplateRows:"auto auto",gap:10,marginBottom:10}}>
                          <div style={{gridRow:"1/3"}}><MagHeroCard article={newsFeed[0]} onClick={openArticle}/></div>
                          <MagSmallCard article={newsFeed[1]} onClick={openArticle}/>
                          <MagSmallCard article={newsFeed[2]} onClick={openArticle}/>
                        </div>
                      )}
                      {newsFeed.length===2&&(
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                          {newsFeed.slice(0,2).map((a,i)=><MagSmallCard key={a.id||i} article={a} onClick={openArticle}/>)}
                        </div>
                      )}
                      {newsFeed.length===1&&<MagHeroCard article={newsFeed[0]} onClick={openArticle}/>}
                      {newsFeed.length>3&&(
                        <div style={{display:"grid",gridTemplateColumns:isTablet?"1fr 1fr":"repeat(3,1fr)",gap:10}}>
                          {newsFeed.slice(3,21).map((a,i)=><MagSmallCard key={a.id||i} article={a} onClick={openArticle}/>)}
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}

              {/* Match Previews */}
              {previews.length>0&&(
                <section>
                  <SectionHead title="Match Previews" sub="Model analysis for upcoming fixtures" accent="rgba(255,255,255,.9)" count={previews.length}/>
                  <div style={{display:"grid",
                    gridTemplateColumns:isMob?"1fr":previews.length===1?"1fr":previews.length===2?"1fr 1fr":"repeat(3,1fr)",
                    gap:isMob?10:12}}>
                    {previews.slice(0,6).map((a,i)=><MatchPreviewCard key={a.id||i} article={a} onClick={openArticle}/>)}
                  </div>
                </section>
              )}

              {/* Model Insights */}
              {insights.length>0&&(
                <section>
                  <SectionHead title="Model Insights" sub="Title race analysis · Form spotlights" accent="rgba(255,255,255,.8)" count={insights.length}/>
                  <div style={{display:"grid",
                    gridTemplateColumns:isMob?"1fr":"1fr 1fr",
                    gap:isMob?10:12}}>
                    {insights.slice(0,6).map((a,i)=><InsightCard key={a.id||i} article={a} onClick={openArticle} idx={i}/>)}
                  </div>
                </section>
              )}

              {/* Mobile: transfer hub inline */}
              {isTablet&&transferItems.length>0&&(
                <section>
                  <SectionHead title="Transfer Hub" sub="Latest moves & rumours" accent="rgba(255,255,255,.75)" count={transferItems.length}/>
                  <TransferHub items={transferItems}/>
                </section>
              )}

              {sorted.length===0&&newsFeed.length===0&&previews.length===0&&insights.length===0&&(
                <div style={{padding:"60px 20px",textAlign:"center",color:"rgba(255,255,255,.25)",fontSize:14}}>
                  No articles match the current filters
                </div>
              )}
            </div>

            {/* RIGHT — sticky Transfer Hub (desktop only) */}
            {!isTablet&&(
              <div style={{position:"sticky",top:20,display:"flex",flexDirection:"column",gap:20}}>
                <TransferHub items={transferItems}/>
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          <footer className="sn-footer-v3">
            <div className="sn-footer-brand">
              <svg width="16" height="16" viewBox="0 0 28 28" fill="none">
                <rect x="4" y="3" width="14" height="3.5" rx="1.75" fill="#0a84ff"/>
                <rect x="4" y="9" width="10" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.65"/>
                <rect x="4" y="15" width="14" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.4"/>
                <rect x="4" y="21" width="7" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.22"/>
                <rect x="20" y="15" width="3" height="10" rx="1.5" fill="#30d158"/>
              </svg>
              StatinSite
              <span className="sn-footer-tagline">Football Intelligence · ELO · Dixon-Coles · xG</span>
            </div>
            <div className="sn-footer-built">Built by Rutej Talati</div>
            <span className="sn-footer-copy">© {new Date().getFullYear()} StatinSite</span>
          </footer>

        </div>
      )}
    </div>
  </div>);
}