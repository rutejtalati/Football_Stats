// NewsTrackerPage.jsx v4 — StatinSite Intelligence Newsroom
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
const BACKEND = import.meta.env.VITE_BACKEND_URL || "https://football-stats-lw4b.onrender.com";

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
  epl:        { label:"Premier League",   abbr:"EPL", color:"#38bdf8", bg:"rgba(56,189,248,0.07)"  },
  laliga:     { label:"La Liga",          abbr:"LAL", color:"#f59e0b", bg:"rgba(245,158,11,0.07)"  },
  seriea:     { label:"Serie A",          abbr:"SA",  color:"#34d399", bg:"rgba(52,211,153,0.07)"  },
  bundesliga: { label:"Bundesliga",       abbr:"BUN", color:"#fb923c", bg:"rgba(251,146,60,0.07)"  },
  ligue1:     { label:"Ligue 1",          abbr:"L1",  color:"#a78bfa", bg:"rgba(167,139,250,0.07)" },
  ucl:        { label:"Champions League", abbr:"UCL", color:"#fbbf24", bg:"rgba(251,191,36,0.07)"  },
  general:    { label:"Football",         abbr:"NEWS",color:"#64748b", bg:"rgba(100,116,139,0.05)" },
};
const TM = {
  match_preview: { label:"Preview",    color:"#38bdf8", fb:"preview"  },
  model_insight: { label:"Insight",    color:"#34d399", fb:"insight"  },
  title_race:    { label:"Title Race", color:"#fbbf24", fb:"insight"  },
  transfer:      { label:"Transfer",   color:"#f59e0b", fb:"transfer" },
  injury:        { label:"Injury",     color:"#f87171", fb:"injury"   },
  manager:       { label:"Manager",    color:"#c084fc", fb:"manager"  },
  analysis:      { label:"Analysis",   color:"#34d399", fb:"analysis" },
  news:          { label:"News",       color:"#64748b", fb:"news"     },
  headline:      { label:"News",       color:"#64748b", fb:"news"     },
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
  default:["#1a3a5a","#0a1a2a"],
};
function tc(n=""){ const l=n.toLowerCase(); for(const[k,v]of Object.entries(TEAM_COLOURS)){if(l.includes(k))return v;} return TEAM_COLOURS.default; }
function gl(a){ return LM[(a.league||"").toLowerCase()]||LM.general; }
function gt(a){ return TM[a.type]||TM.news; }
function timeAgo(ts){ if(!ts)return""; const m=Math.floor((Date.now()-new Date(ts))/60000); if(m<1)return"just now"; if(m<60)return m+"m ago"; if(m<1440)return Math.floor(m/60)+"h ago"; return Math.floor(m/1440)+"d ago"; }
function fmtKO(ts){ if(!ts)return null; const d=new Date(ts); return d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})+" "+d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}); }

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.026'/%3E%3C/svg%3E")`;

// SVG fallback patterns — no emojis, CSS-drawn football visuals
const FBP = {
  transfer: { bg:"#060d18", accent:"#f59e0b" },
  injury:   { bg:"#0e0505", accent:"#f87171" },
  manager:  { bg:"#060510", accent:"#c084fc" },
  analysis: { bg:"#010a05", accent:"#34d399" },
  preview:  { bg:"#020a14", accent:"#38bdf8" },
  insight:  { bg:"#010a04", accent:"#34d399" },
  news:     { bg:"#030608", accent:"#64748b" },
};
function getFB(t){ const k=t==="match_preview"?"preview":(t==="model_insight"||t==="title_race")?"insight":(TM[t]?.fb||"news"); return FBP[k]||FBP.news; }
function fbSvg(fb,lines){ return `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='400' height='220'><rect width='400' height='220' fill='"+fb.bg+"'/>" +lines+ "</svg>")}")`; }
function fbBg(fb){
  if(fb===FBP.transfer) return fbSvg(fb,"<line x1='200' y1='0' x2='0' y2='220' stroke='rgba(245,158,11,.07)'/><line x1='200' y1='0' x2='80' y2='220' stroke='rgba(245,158,11,.05)'/><line x1='200' y1='0' x2='320' y2='220' stroke='rgba(245,158,11,.05)'/><line x1='200' y1='0' x2='400' y2='220' stroke='rgba(245,158,11,.07)'/>");
  if(fb===FBP.injury)   return fbSvg(fb,"<circle cx='200' cy='110' r='55' fill='none' stroke='rgba(248,113,113,.08)'/><circle cx='200' cy='110' r='90' fill='none' stroke='rgba(248,113,113,.05)'/><circle cx='200' cy='110' r='130' fill='none' stroke='rgba(248,113,113,.03)'/>");
  if(fb===FBP.manager)  return fbSvg(fb,"<rect x='60' y='44' width='280' height='132' fill='none' stroke='rgba(192,132,252,.07)' rx='6'/><rect x='100' y='66' width='200' height='88' fill='none' stroke='rgba(192,132,252,.05)' rx='3'/>");
  if(fb===FBP.analysis) return fbSvg(fb,"<rect x='36' y='22' width='328' height='176' fill='none' stroke='rgba(52,211,153,.08)' rx='5'/><line x1='200' y1='22' x2='200' y2='198' stroke='rgba(52,211,153,.06)'/><circle cx='200' cy='110' r='42' fill='none' stroke='rgba(52,211,153,.07)'/><rect x='36' y='73' width='42' height='74' fill='none' stroke='rgba(52,211,153,.06)'/><rect x='322' y='73' width='42' height='74' fill='none' stroke='rgba(52,211,153,.06)'/>");
  if(fb===FBP.preview)  return fbSvg(fb,"<rect x='36' y='22' width='328' height='176' fill='none' stroke='rgba(56,189,248,.07)' rx='5'/><line x1='200' y1='22' x2='200' y2='198' stroke='rgba(56,189,248,.05)'/><circle cx='200' cy='110' r='38' fill='none' stroke='rgba(56,189,248,.07)'/>");
  if(fb===FBP.insight)  return fbSvg(fb,"<polyline points='36,180 100,126 166,148 230,80 296,96 364,44' fill='none' stroke='rgba(52,211,153,.15)' stroke-width='2'/><polyline points='36,196 100,162 166,174 230,132 296,148 364,112' fill='none' stroke='rgba(52,211,153,.06)'/>");
  return fbSvg(fb,"<line x1='40' y1='62' x2='360' y2='62' stroke='rgba(100,116,139,.07)'/><line x1='40' y1='95' x2='290' y2='95' stroke='rgba(100,116,139,.05)'/><line x1='40' y1='122' x2='320' y2='122' stroke='rgba(100,116,139,.05)'/><line x1='40' y1='148' x2='210' y2='148' stroke='rgba(100,116,139,.04)'/>");
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
  "fabrizio romano":    {bg:"#1a0a2e",   fg:"#a78bfa",abbr:"FAB"  },
  "statinsite":         {bg:"#0a1628",   fg:"#38bdf8",abbr:"SSI"  },
  "statinsite intelligence engine":{bg:"#0a1628",fg:"#38bdf8",abbr:"SSI"},
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
        <div style={{position:"absolute",inset:0,backgroundImage:fbBg(fb),backgroundSize:"cover",opacity:brand?0.12:1}}/>
        {abbr&&<span style={{position:"relative",zIndex:1,fontSize:sz,fontWeight:900,fontFamily:"'Sora',sans-serif",color:accent,opacity:0.22,letterSpacing:"-0.04em",userSelect:"none"}}>{abbr}</span>}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:2.5,background:accent,opacity:0.65}}/>
        <div style={{position:"absolute",top:7,left:7,width:5,height:5,borderRadius:"50%",background:accent,opacity:0.5}}/>
      </div>);
  }
  return(
    <div style={{position:"relative",overflow:"hidden",...style}}>
      {!loaded&&<div style={{position:"absolute",inset:0,background:fb.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
        {brand&&<span style={{fontSize:18,fontWeight:900,fontFamily:"'Sora',sans-serif",color:brand.fg,opacity:0.18,letterSpacing:"-0.04em"}}>{brand.abbr}</span>}
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
      <span style={{fontSize:fs,fontWeight:800,color:win==="home"?"#f0f6ff":"#3a5a7a",maxWidth:"36%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{homeTeam}</span>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:fsMono,fontWeight:900,color:win==="home"?"#38bdf8":"#1a3a5a"}}>{h}%</span>
        <span style={{fontSize:9,color:"#1a3a5a",fontWeight:700}}>{d}%</span>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:fsMono,fontWeight:900,color:win==="away"?"#f87171":"#1a3a5a"}}>{a}%</span>
      </div>
      <span style={{fontSize:fs,fontWeight:800,color:win==="away"?"#f0f6ff":"#3a5a7a",maxWidth:"36%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"right"}}>{awayTeam}</span>
    </div>
    <div style={{display:"flex",height:large?6:3,borderRadius:999,overflow:"hidden",gap:1}}>
      <div style={{width:h+"%",background:"linear-gradient(90deg,#155e8a,#38bdf8)",borderRadius:"999px 0 0 999px",transition:"width 0.6s ease"}}/>
      <div style={{width:d+"%",background:"rgba(255,255,255,0.07)"}}/>
      <div style={{width:a+"%",background:"linear-gradient(90deg,#8b2020,#f87171)",borderRadius:"0 999px 999px 0",transition:"width 0.6s ease"}}/>
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
  return(<div style={{borderRadius:14,border:"1px solid "+league.color+"1e",background:"rgba(255,255,255,0.014)",padding:"16px 20px",marginBottom:28,backdropFilter:"blur(4px)"}}>
    <div style={{display:"flex",flexWrap:"wrap",gap:0,marginBottom:16}}>
      {cells.map((c,i)=>(
        <div key={i} style={{flex:"1 1 130px",padding:"0 20px 8px 0",minWidth:100}}>
          <div style={{fontSize:9,fontWeight:900,color:"#1a3a5a",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4}}>{c.l}</div>
          <div style={{fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:700,color:"#c8d8f0"}}>{c.v}</div>
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

function HeroVSBanner({homeTeam,awayTeam,homeLogo,awayLogo,height=165,hp=0,dp=0,ap=0,leagueColor="#38bdf8"}){
  const[hc1,hc2]=tc(homeTeam); const[ac1,ac2]=tc(awayTeam);
  const hPct=Math.round(hp*100); const dPct=Math.round(dp*100); const aPct=Math.round(ap*100);
  const hasPct=hPct+dPct+aPct>0;
  const pitchSvg="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='170'%3E%3Crect x='30' y='12' width='340' height='146' fill='none' stroke='white' stroke-width='1' opacity='.13'/%3E%3Cline x1='200' y1='12' x2='200' y2='158' stroke='white' stroke-width='1' opacity='.13'/%3E%3Ccircle cx='200' cy='85' r='34' fill='none' stroke='white' stroke-width='1' opacity='.13'/%3E%3Crect x='30' y='38' width='52' height='64' fill='none' stroke='white' stroke-width='1' opacity='.1'/%3E%3Crect x='318' y='38' width='52' height='64' fill='none' stroke='white' stroke-width='1' opacity='.1'/%3E%3C/svg%3E";
  return(
    <div style={{position:"relative",height,overflow:"hidden",flexShrink:0,background:"#000"}}>
      {/* Team colour wedges */}
      <div style={{position:"absolute",left:0,top:0,width:"54%",height:"100%",background:"linear-gradient(140deg,"+hc1+"cc,"+hc2+"88)",clipPath:"polygon(0 0,65% 0,48% 100%,0 100%)"}}/>
      <div style={{position:"absolute",right:0,top:0,width:"54%",height:"100%",background:"linear-gradient(220deg,"+ac1+"cc,"+ac2+"88)",clipPath:"polygon(52% 0,100% 0,100% 100%,35% 100%)"}}/>
      {/* Pitch overlay */}
      <div style={{position:"absolute",inset:0,backgroundImage:`url("${pitchSvg}")`,backgroundSize:"100% 100%"}}/>
      {/* Dark overlay */}
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.42)"}}/>
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
          <div style={{width:52,height:52,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.18)",background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",boxShadow:"0 4px 16px rgba(0,0,0,.7)"}}>
            {logo
              ?<img src={logo} alt={team} style={{width:"100%",height:"100%",objectFit:"contain"}} onError={e=>{e.currentTarget.style.display="none";e.currentTarget.parentNode.style.background="linear-gradient(135deg,"+c1+","+c2+")";}}/>
              :<div style={{fontSize:11,fontWeight:900,color:"#fff",fontFamily:"'Sora',sans-serif"}}>{(team||"?").slice(0,3).toUpperCase()}</div>}
          </div>
          <span style={{fontFamily:"'Sora',sans-serif",fontSize:10,fontWeight:900,color:"#fff",textShadow:"0 1px 8px rgba(0,0,0,.95)",textAlign:"center",maxWidth:72,lineHeight:1.2}}>{team}</span>
        </div>
      ))}
      {/* VS badge */}
      <div style={{position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",width:38,height:38,borderRadius:"50%",background:"rgba(0,0,0,0.92)",border:"1.5px solid rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:5,boxShadow:"0 0 20px rgba(0,0,0,.9)"}}>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:900,color:"rgba(255,255,255,.6)",letterSpacing:"0.05em"}}>VS</span>
      </div>
      {/* Probability strip fused to base */}
      {hasPct&&(
        <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:6}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 10px 2px",zIndex:7,position:"relative"}}>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:900,color:hPct>aPct?"#60a5fa":"rgba(255,255,255,.4)"}}>{hPct}%</span>
            <span style={{fontSize:9,color:"rgba(255,255,255,.3)",fontWeight:700}}>{dPct}%</span>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:900,color:aPct>hPct?"#f87171":"rgba(255,255,255,.4)"}}>{aPct}%</span>
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
    style={{borderRadius:16,overflow:"hidden",cursor:"pointer",background:"#000",
      border:hov?"1px solid "+league.color+"55":"1px solid rgba(255,255,255,0.09)",
      boxShadow:hov?"0 0 36px "+league.color+"18,0 24px 56px rgba(0,0,0,.65)":"0 8px 28px rgba(0,0,0,0.45)",
      transform:hov?"translateY(-4px)":vis?"translateY(0)":"translateY(14px)",
      opacity:vis?1:0,transition:"all 0.28s cubic-bezier(.22,1,.36,1)",display:"flex",flexDirection:"column"}}>
    <HeroVSBanner homeTeam={homeTeam} awayTeam={awayTeam}
      homeLogo={article.home_logo||article.meta?.home_logo}
      awayLogo={article.away_logo||article.meta?.away_logo}
      height={featured?190:160}
      hp={hp} dp={dp} ap={ap} leagueColor={league.color}/>
    <div style={{padding:"11px 14px 13px",background:"#000"}}>
      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:8}}>
        <CatBadge type={article.type} league={article.league} small/>
        {kickoff&&<span style={{marginLeft:"auto",fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.3)",fontWeight:700}}>{fmtKO(kickoff)||timeAgo(kickoff)}</span>}
      </div>
      {/* xG + markets row */}
      {(xgH||xgA||score||btts||over)&&(
        <div style={{display:"flex",gap:0,marginBottom:9,background:"rgba(255,255,255,0.025)",borderRadius:8,overflow:"hidden",border:"1px solid rgba(255,255,255,0.07)"}}>
          {xgH&&<div style={{flex:1,padding:"6px 10px",borderRight:"1px solid rgba(255,255,255,0.06)"}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:900,color:"#60a5fa",lineHeight:1}}>{Number(xgH).toFixed(2)}</div>
            <div style={{fontSize:7,fontWeight:700,color:"rgba(255,255,255,0.3)",letterSpacing:"0.09em",textTransform:"uppercase",marginTop:2}}>xG</div>
          </div>}
          {score&&<div style={{flex:1.2,padding:"6px 10px",borderRight:"1px solid rgba(255,255,255,0.06)",textAlign:"center"}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:900,color:"#fff",lineHeight:1}}>{score}</div>
            <div style={{fontSize:7,fontWeight:700,color:"rgba(255,255,255,0.3)",letterSpacing:"0.09em",textTransform:"uppercase",marginTop:2}}>Projected</div>
          </div>}
          {xgA&&<div style={{flex:1,padding:"6px 10px",borderRight:btts||over?"1px solid rgba(255,255,255,0.06)":undefined}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:900,color:"#f87171",lineHeight:1,textAlign:"right"}}>{Number(xgA).toFixed(2)}</div>
            <div style={{fontSize:7,fontWeight:700,color:"rgba(255,255,255,0.3)",letterSpacing:"0.09em",textTransform:"uppercase",marginTop:2,textAlign:"right"}}>xG</div>
          </div>}
          {over!=null&&<div style={{flex:1,padding:"6px 10px",borderRight:btts?"1px solid rgba(255,255,255,0.06)":undefined}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:900,color:"#fbbf24",lineHeight:1}}>{Math.round(over>1?over:over*100)}%</div>
            <div style={{fontSize:7,fontWeight:700,color:"rgba(255,255,255,0.3)",letterSpacing:"0.09em",textTransform:"uppercase",marginTop:2}}>O2.5</div>
          </div>}
          {btts!=null&&<div style={{flex:1,padding:"6px 10px"}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:900,color:"#34d399",lineHeight:1}}>{Math.round(btts>1?btts:btts*100)}%</div>
            <div style={{fontSize:7,fontWeight:700,color:"rgba(255,255,255,0.3)",letterSpacing:"0.09em",textTransform:"uppercase",marginTop:2}}>BTTS</div>
          </div>}
        </div>
      )}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.25)",letterSpacing:"0.06em",textTransform:"uppercase"}}>StatinSite Model</span>
        <span style={{fontSize:11,fontWeight:800,color:league.color}}>Full preview →</span>
      </div>
    </div>
  </div>);
}

function InsightCard({article,featured=false,onClick,idx=0}){
  const[hov,setHov]=useState(false); const[ref,vis]=useReveal();
  const isTitle=article.type==="title_race";
  const leaguePalette={epl:["#38bdf8","#0c4a6e"],laliga:["#fbbf24","#78350f"],seriea:["#34d399","#064e3b"],bundesliga:["#ff7c2a","#7c2d12"],ligue1:["#c084fc","#4c1d95"],ucl:["#fbbf24","#78350f"]};
  const [accent,accentDark]=leaguePalette[article.league]||(isTitle?["#fbbf24","#92400e"]:["#34d399","#065f46"]);
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
        <span style={{fontSize:8,fontWeight:700,color:accent,letterSpacing:"0.12em",textTransform:"uppercase",opacity:.85}}>
          {(LM[article.league]?.label||"Football")+" · "+(isTitle?"Title Race":"Model Insight")}
        </span>
      </div>
      {/* Giant gap number */}
      {gap!=null?(
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",gap:18,zIndex:2}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:44,fontWeight:900,color:accent,lineHeight:1,textShadow:"0 0 32px "+accent+"60"}}>{gap}</div>
            <div style={{fontSize:8,fontWeight:700,color:"rgba(255,255,255,.3)",letterSpacing:"0.12em",textTransform:"uppercase"}}>point gap</div>
          </div>
          {leader&&<>
            <div style={{width:1,height:44,background:"rgba(255,255,255,.1)"}}/>
            <div>
              <div style={{fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:900,color:"#fff"}}>{leader}</div>
              <div style={{fontSize:8,fontWeight:700,color:"rgba(255,255,255,.3)",letterSpacing:"0.1em",textTransform:"uppercase",marginTop:2}}>Leader</div>
            </div>
          </>}
        </div>
      ):(
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:2}}>
          <div style={{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:900,color:"rgba(255,255,255,.5)",textAlign:"center",padding:"0 20px"}}>{article.title}</div>
        </div>
      )}
    </div>
  );

  // Design 1: Mini standings table
  const TableBody=()=>(
    <div style={{padding:"11px 13px 13px"}}>
      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:8}}>
        <CatBadge type={article.type} league={article.league} small/>
        <span style={{marginLeft:"auto",fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.3)",fontWeight:700}}>{timeAgo(article.published_at)}</span>
      </div>
      <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:900,color:"#fff",lineHeight:1.3,margin:"0 0 10px"}}>{article.title}</h3>
      {standings.length>0?(
        <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:9,overflow:"hidden",marginBottom:10}}>
          {standings.slice(0,3).map((s,i)=>{
            const isLeader=i===0;
            const form=(s.form||"").split("").slice(-3);
            return(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",
                background:isLeader?"rgba("+( accent==="#fbbf24"?"251,191,36":"52,211,153" )+",0.06)":"transparent",
                borderLeft:isLeader?"2.5px solid "+accent:"2.5px solid transparent",
                borderBottom:i<2?"1px solid rgba(255,255,255,0.05)":"none"}}>
                <span style={{fontSize:9,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:isLeader?accent:"rgba(255,255,255,0.3)",width:14,flexShrink:0}}>{i+1}</span>
                <span style={{fontSize:11,fontWeight:700,color:isLeader?"#fff":"rgba(255,255,255,0.65)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.team||s.name}</span>
                <div style={{display:"flex",gap:2}}>
                  {form.map((r,j)=>(
                    <span key={j} style={{width:14,height:14,borderRadius:3,fontSize:8,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",
                      background:r==="W"?"rgba(52,211,153,.18)":r==="D"?"rgba(245,158,11,.15)":"rgba(239,68,68,.15)",
                      color:r==="W"?"#34d399":r==="D"?"#fbbf24":"#f87171"}}>{r}</span>
                  ))}
                </div>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:700,color:isLeader?accent:"rgba(255,255,255,0.45)",minWidth:22,textAlign:"right"}}>{s.points||s.pts}</span>
              </div>
            );
          })}
        </div>
      ):(
        <p style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,0.5)",lineHeight:1.55,margin:"0 0 10px",overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{article.standfirst||article.summary}</p>
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
        <span style={{marginLeft:"auto",fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.3)",fontWeight:700}}>{timeAgo(article.published_at)}</span>
      </div>
      <h3 style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:900,color:"#fff",lineHeight:1.3,margin:"0 0 10px"}}>{article.title}</h3>
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
                <div style={{flex:1,height:6,background:"rgba(255,255,255,0.06)",borderRadius:999,overflow:"hidden"}}>
                  <div style={{height:"100%",width:pct+"%",borderRadius:999,
                    background:isLeader?"linear-gradient(90deg,"+accentDark+","+accent+")"
                      :"rgba(255,255,255,0.2)"}}/>
                </div>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:700,color:isLeader?accent:"rgba(255,255,255,0.4)",minWidth:22,textAlign:"right"}}>{pts}</span>
              </div>
            );
          })}
        </div>
      ):(
        <p style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,0.5)",lineHeight:1.55,margin:"0 0 10px",overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{article.standfirst||article.summary}</p>
      )}
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <span style={{fontSize:11,fontWeight:800,color:accent}}>Full analysis →</span>
      </div>
    </div>
  );

  return(<div ref={ref} onClick={()=>onClick(article)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    style={{borderRadius:16,overflow:"hidden",cursor:"pointer",background:"#000",
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
    style={{display:"flex",borderRadius:16,overflow:"hidden",cursor:"pointer",
      background:hov?"rgba(11,19,36,0.98)":"rgba(9,15,28,0.97)",
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
        <span style={{fontSize:8,fontWeight:900,letterSpacing:"0.12em",textTransform:"uppercase",color:tm.color,background:tm.color+"0e",border:"1px solid "+tm.color+"20",borderRadius:4,padding:"2px 6px",flexShrink:0}}>{tm.label}</span>
        {article.source&&<span style={{fontFamily:"'Inter',sans-serif",fontSize:9,color:"#2a4a6a",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{article.source}</span>}
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#1a3a5a",fontWeight:700,flexShrink:0}}>{timeAgo(article.published_at)}</span>
      </div>
      <p style={{fontFamily:"'Sora',sans-serif",fontSize:12.5,fontWeight:700,lineHeight:1.38,color:hov?"#e0ecff":"#6a8aa8",margin:0,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",flex:1}}>{article.title}</p>
    </div>
  </div>);
}


// ── Magazine card components ─────────────────────────────────────────
function MagHeroCard({article,onClick}){
  const[hov,setHov]=useState(false);
  const accent=gl(article).color; const tm=gt(article);
  return(
    <div onClick={()=>onClick(article)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{position:"relative",borderRadius:14,overflow:"hidden",cursor:"pointer",minHeight:240,
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
          <span style={{fontSize:8,fontWeight:900,letterSpacing:"0.12em",textTransform:"uppercase",color:tm.color,background:"rgba(0,0,0,0.65)",border:"1px solid "+tm.color+"40",borderRadius:4,padding:"2px 7px"}}>{tm.label}</span>
          {article.source&&<span style={{fontSize:8,fontWeight:700,color:"rgba(255,255,255,0.6)",background:"rgba(0,0,0,0.65)",borderRadius:4,padding:"2px 7px"}}>{article.source}</span>}
        </div>
        <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:900,color:"#fff",lineHeight:1.28,margin:"0 0 7px",letterSpacing:"-0.02em"}}>{article.title}</h2>
        {article.standfirst&&<p style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"rgba(255,255,255,0.6)",lineHeight:1.5,margin:"0 0 9px",overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{article.standfirst}</p>}
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:10,fontWeight:700,color:accent}}>Read more →</span>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"rgba(255,255,255,0.3)",marginLeft:"auto"}}>{timeAgo(article.published_at)}</span>
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
      style={{borderRadius:12,overflow:"hidden",cursor:"pointer",display:"flex",flexDirection:"column",
        background:"rgba(255,255,255,0.025)",
        border:hov?"1px solid "+tm.color+"45":"1px solid rgba(255,255,255,0.07)",
        transform:hov?"translateY(-2px)":vis?"translateY(0)":"translateY(8px)",
        opacity:vis?1:0,transition:"all 0.2s cubic-bezier(.22,1,.36,1)",
        boxShadow:hov?"0 8px 24px rgba(0,0,0,0.45)":"none"}}>
      <div style={{height:2.5,background:tm.color,flexShrink:0}}/>
      <div style={{height:64,overflow:"hidden",flexShrink:0,position:"relative"}}>
        <CardImage src={article.image} type={article.type} source={article.source||""} style={{width:"100%",height:"100%"}} zoom={hov}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,0.5),transparent)",pointerEvents:"none"}}/>
      </div>
      <div style={{padding:"8px 10px",flex:1,display:"flex",flexDirection:"column",gap:5}}>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          <span style={{fontSize:8,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",color:tm.color,background:tm.color+"12",border:"1px solid "+tm.color+"25",borderRadius:3,padding:"1px 5px"}}>{tm.label}</span>
          {article.league&&article.league!=="general"&&<span style={{fontSize:8,fontWeight:700,color:league.color,background:league.bg,borderRadius:3,padding:"1px 5px"}}>{league.abbr}</span>}
        </div>
        <p style={{fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:700,lineHeight:1.35,color:hov?"#fff":"rgba(255,255,255,0.85)",margin:0,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",flex:1}}>{article.title}</p>
        <div style={{display:"flex",alignItems:"center",gap:4,marginTop:"auto"}}>
          {article.source&&<span style={{fontFamily:"'Inter',sans-serif",fontSize:8,color:"rgba(255,255,255,0.35)",fontWeight:600,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{article.source}</span>}
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"rgba(255,255,255,0.25)",flexShrink:0}}>{timeAgo(article.published_at)}</span>
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
    style={{position:"relative",borderRadius:24,overflow:"hidden",minHeight:320,cursor:"pointer",
      background:"linear-gradient(165deg,rgba(8,14,28,0.99),rgba(4,8,16,0.99))",
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
      <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(5,10,22,0.97) 35%,rgba(5,10,22,0.5) 75%,transparent)",pointerEvents:"none"}}/>
    </>):(<>
      <div style={{position:"absolute",inset:0,background:FBP[fb.constructor===Object?Object.keys(FBP).find(k=>FBP[k]===fb)||"news":"news"]?.bg||fb.bg}}/>
      <div style={{position:"absolute",inset:0,backgroundImage:fbBg(fb),backgroundSize:"cover"}}/>
    </>)}
    <div style={{position:"absolute",inset:0,backgroundImage:NOISE,backgroundSize:"200px 200px",pointerEvents:"none"}}/>
    <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,"+accent+",transparent)"}}/>
    <div style={{position:"absolute",top:28,left:32,display:"flex",gap:8}}>
      <span style={{fontSize:9,fontWeight:900,letterSpacing:"0.14em",textTransform:"uppercase",color:accent,background:accent+"14",border:"1px solid "+accent+"38",borderRadius:6,padding:"3px 10px"}}>FEATURED</span>
      <CatBadge type={article.type} league={article.league}/>
    </div>
    <div style={{position:"relative",zIndex:1}}>
      <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:28,fontWeight:900,color:"#f0f6ff",lineHeight:1.2,letterSpacing:"-0.025em",margin:"0 0 10px"}}>{article.title}</h2>
      <p style={{fontFamily:"'Inter',sans-serif",fontSize:14,color:"rgba(200,215,230,0.85)",lineHeight:1.6,margin:"0 0 20px",maxWidth:580}}>{article.standfirst||article.summary}</p>
      <div style={{display:"flex",alignItems:"center",gap:18}}>
        <span style={{fontSize:12,fontWeight:800,color:accent}}>Read full analysis →</span>
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#1a3a5a",fontWeight:700}}>{timeAgo(article.published_at)}</span>
      </div>
    </div>
  </div>);
}

function RelatedCard({article,onClick}){
  const[hov,setHov]=useState(false); const tm=gt(article); const league=gl(article);
  const isP=article.type==="match_preview";
  return(<div onClick={()=>onClick(article)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    style={{display:"flex",gap:10,alignItems:"flex-start",padding:"11px 12px",borderRadius:12,cursor:"pointer",
      background:hov?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.02)",
      border:hov?"1px solid rgba(255,255,255,0.1)":"1px solid rgba(255,255,255,0.05)",transition:"all 0.15s ease"}}>
    {isP?(
      <div style={{width:44,height:36,flexShrink:0,display:"flex",gap:2,overflow:"hidden",borderRadius:6}}>
        {article.home_logo&&<img src={article.home_logo} style={{width:20,height:36,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"} alt=""/>}
        {article.away_logo&&<img src={article.away_logo} style={{width:20,height:36,objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"} alt=""/>}
      </div>
    ):<div style={{width:44,height:36,flexShrink:0,borderRadius:8,overflow:"hidden"}}><CardImage src={article.image} type={article.type} source={article.source||""} style={{width:"100%",height:"100%"}}/></div>}
    <div style={{flex:1,minWidth:0}}>
      <div style={{display:"flex",gap:5,marginBottom:4}}>
        <span style={{fontSize:7,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",color:tm.color,background:tm.color+"10",borderRadius:4,padding:"1px 5px"}}>{tm.label}</span>
        {article.league&&article.league!=="general"&&<span style={{fontSize:7,fontWeight:900,letterSpacing:"0.08em",textTransform:"uppercase",color:league.color,background:league.bg,borderRadius:4,padding:"1px 5px"}}>{league.abbr}</span>}
      </div>
      <p style={{fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:700,color:hov?"#e8f0ff":"#7a9ab8",lineHeight:1.35,margin:0,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{article.title}</p>
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
  if(!article)return null;
  const league=gl(article); const isPreview=article.type==="match_preview";
  const isExt=article.source_type==="external";
  const accent=isPreview?league.color:article.type==="title_race"?"#fbbf24":"#34d399";
  const ht=article.home_team||article.meta?.home_team;
  const at=article.away_team||article.meta?.away_team;
  const paras=Array.isArray(article.body)?article.body.filter(p=>p?.trim()).map(p=>p.replace(/\*\*/g,"")):[]; 
  const ms=article.meta?.match_stats;
  const related=allArticles.filter(a=>a.id!==article.id&&(a.league===article.league||a.type===article.type||[ht,at].filter(Boolean).some(t=>a.home_team===t||a.away_team===t))).slice(0,5);
  return(<>
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:1100,background:"rgba(0,0,0,0.9)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",animation:"apBack .22s ease both"}}/>
    <div ref={pageRef} style={{position:"fixed",inset:0,zIndex:1101,overflowY:"auto",overflowX:"hidden",background:"linear-gradient(170deg,rgba(5,10,22,0.995),rgba(2,5,12,0.995))",scrollbarWidth:"thin",scrollbarColor:"rgba(255,255,255,0.05) transparent",animation:"apUp .3s cubic-bezier(.22,1,.36,1) both"}}>
      <div style={{height:2,background:"linear-gradient(90deg,"+accent+",transparent)",position:"sticky",top:0,zIndex:10}}/>
      <button onClick={onClose} style={{position:"fixed",top:16,right:20,zIndex:1200,width:40,height:40,borderRadius:"50%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.14)",color:"#6a8aa8",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.14)";e.currentTarget.style.color="#f0f6ff";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.07)";e.currentTarget.style.color="#6a8aa8";}}>&#x2715;</button>
      <div style={{maxWidth:1080,margin:"0 auto",padding:"0 24px 80px"}}>
        {isPreview&&ht&&at
          ?<HeroVSBanner homeTeam={ht} awayTeam={at} homeLogo={article.home_logo||article.meta?.home_logo} awayLogo={article.away_logo||article.meta?.away_logo} height={220}/>
          :<div style={{width:"100%",height:260,overflow:"hidden",borderRadius:"0 0 20px 20px",position:"relative"}}>
            <CardImage src={article.image} type={article.type} source={article.source||""} style={{width:"100%",height:"100%"}}/>
            <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(5,10,22,1),rgba(5,10,22,0.35) 55%,transparent)",pointerEvents:"none"}}/>
            <div style={{position:"absolute",bottom:20,left:24}}><CatBadge type={article.type} league={article.league}/></div>
          </div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 290px",gap:36,marginTop:32,alignItems:"start"}}>
          <div>
            <div style={{display:"flex",gap:10,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
              {!article.image&&!isPreview&&<CatBadge type={article.type} league={article.league}/>}
              {article.author&&<span style={{fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:800,color:"#c8d8f0"}}>{article.author}</span>}
              {article.source&&<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#2a4a6a",fontWeight:700}}>{article.source_type==="external"?"via "+article.source:"StatinSite Intelligence Desk"}</span>}
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#1a3a5a",fontWeight:700}}>{timeAgo(article.published_at)}</span>
            </div>
            <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:28,fontWeight:900,color:"#f0f6ff",lineHeight:1.2,letterSpacing:"-0.025em",margin:"0 0 14px"}}>{article.title}</h1>
            {article.standfirst&&<p style={{fontFamily:"'Inter',sans-serif",fontSize:16,lineHeight:1.7,color:"#7a9ab8",margin:"0 0 24px",borderLeft:"3px solid "+accent+"40",paddingLeft:16}}>{article.standfirst}</p>}
            {isPreview&&<MatchInfoBar article={article}/>}
            {!isExt&&paras.length>0&&(
              <div style={{display:"flex",flexDirection:"column",gap:18,marginBottom:32}}>
                {paras.map((p,i)=>(
                  <p key={i} style={{fontFamily:"'Inter',sans-serif",fontSize:15.5,lineHeight:1.82,color:i===paras.length-1?"#c8d8f0":"rgba(200,215,230,0.85)",margin:0,fontWeight:i===paras.length-1?600:400,...(i===paras.length-1?{borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:18}:{})}}>{p}</p>
                ))}
              </div>)}
            {isExt&&(<div style={{display:"flex",flexDirection:"column",gap:18,marginBottom:32}}>
              {paras.length>0
                ?paras.map((p,i)=><p key={i} style={{fontFamily:"'Inter',sans-serif",fontSize:15.5,lineHeight:1.82,color:i===paras.length-1?"#c8d8f0":"rgba(200,215,230,0.85)",margin:0}}>{p}</p>)
                :<p style={{fontFamily:"'Inter',sans-serif",fontSize:15,lineHeight:1.75,color:"rgba(200,215,230,0.85)",margin:0}}>{article.standfirst||article.summary}</p>}
              {article.url&&<a href={article.url} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"10px 22px",borderRadius:999,background:accent,color:"#000",fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:800,textDecoration:"none",width:"fit-content",marginTop:8}}>Read full article at {article.source} →</a>}
            </div>)}
            {ms&&(<div style={{marginTop:32,padding:"18px 20px",borderRadius:14,background:"rgba(255,255,255,0.018)",border:"1px solid "+accent+"14"}}>
              <div style={{fontSize:9,fontWeight:900,color:accent,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:16}}>Key Statistics</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:22}}>
                {[{l:"xG Home",v:ms.expected_goals_home},{l:"xG Away",v:ms.expected_goals_away},
                  {l:"Over 2.5",v:ms.over25_probability!=null?ms.over25_probability+"%":null},
                  {l:"BTTS",v:ms.btts_probability!=null?ms.btts_probability+"%":null},
                  {l:"Confidence",v:ms.confidence!=null?ms.confidence+"%":null},
                  {l:"Projected",v:ms.most_likely_score}].filter(s=>s.v!=null).map((s,i)=>(
                  <div key={i}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:17,fontWeight:900,color:accent}}>{s.v}</div>
                    <div style={{fontSize:9,fontWeight:800,color:"#1a3a5a",letterSpacing:"0.08em",textTransform:"uppercase",marginTop:2}}>{s.l}</div>
                  </div>))}
              </div>
            </div>)}
          </div>
          <div style={{position:"sticky",top:60,display:"flex",flexDirection:"column",gap:16}}>
            {!isExt&&article.model_verdict&&(
              <div style={{borderRadius:16,padding:"16px 18px",background:accent+"07",border:"1px solid "+accent+"1e"}}>
                <div style={{fontSize:9,fontWeight:900,color:accent,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>Model Verdict</div>
                <p style={{fontFamily:"'Inter',sans-serif",fontSize:12,lineHeight:1.65,color:"#7a9ab8",margin:0}}>{article.model_verdict}</p>
              </div>)}
            {related.length>0&&(<div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{width:2,height:18,borderRadius:2,background:"linear-gradient(180deg,"+accent+",transparent)"}}/>
                <span style={{fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:900,color:"#f0f6ff"}}>Related</span>
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
    <span style={{fontSize:9,fontWeight:900,letterSpacing:"0.12em",color:"#1a3a5a",textTransform:"uppercase",flexShrink:0}}>Trending</span>
    {clubs.map(club=>(<button key={club} onClick={()=>onSelect(club===activeClub?null:club)}
      style={{fontSize:10,fontWeight:800,color:club===activeClub?"#f0f6ff":"#6a8aa8",
        background:club===activeClub?"rgba(56,189,248,0.12)":"rgba(255,255,255,0.035)",
        border:club===activeClub?"1px solid rgba(56,189,248,0.38)":"1px solid rgba(255,255,255,0.07)",
        borderRadius:999,padding:"5px 12px",flexShrink:0,cursor:"pointer",transition:"all .17s ease",
        boxShadow:club===activeClub?"0 0 12px rgba(56,189,248,0.14)":"none",fontFamily:"'Inter',sans-serif"}}>{club}</button>))}
  </div>);
}

function Chip({label,active,color="#38bdf8",onClick,count}){
  const[hov,setHov]=useState(false);
  return(<button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
    style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 16px",borderRadius:20,
      border:active?"1.5px solid "+color+"60":hov?"1.5px solid rgba(255,255,255,0.14)":"1.5px solid rgba(255,255,255,0.07)",
      background:active?color+"12":hov?"rgba(255,255,255,0.055)":"rgba(255,255,255,0.025)",
      backdropFilter:"blur(6px)",WebkitBackdropFilter:"blur(6px)",
      color:active?color:hov?"#c8d8f0":"#3a5a7a",
      fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:800,letterSpacing:"0.04em",
      cursor:"pointer",transition:"all .17s ease",whiteSpace:"nowrap",flexShrink:0,
      boxShadow:active?"0 0 16px "+color+"18":"none"}}>
    {active&&<span style={{width:5,height:5,borderRadius:"50%",background:color,boxShadow:"0 0 7px "+color,flexShrink:0}}/>}
    {label}
    {count!=null&&<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:900,color:active?color:"#1a3a5a",background:active?color+"18":"rgba(255,255,255,0.035)",borderRadius:999,padding:"1px 5px"}}>{count}</span>}
  </button>);
}

function Skeleton({h=200}){
  return(<div style={{borderRadius:18,height:h,background:"linear-gradient(90deg,rgba(255,255,255,0.025) 0%,rgba(255,255,255,0.055) 50%,rgba(255,255,255,0.025) 100%)",backgroundSize:"400% 100%",animation:"shimmer 1.6s ease-in-out infinite",border:"1px solid rgba(255,255,255,0.04)"}}/>);
}

function SectionHead({title,sub,accent="#38bdf8",count}){
  return(<div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:20}}>
    <div style={{width:3,height:36,borderRadius:2,background:"linear-gradient(180deg,"+accent+",transparent)",flexShrink:0,marginTop:2}}/>
    <div style={{flex:1}}>
      <h2 style={{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:900,color:"#f0f6ff",margin:0,letterSpacing:"-0.02em"}}>{title}</h2>
      {sub&&<p style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"#1a3a5a",margin:"2px 0 0",fontWeight:600}}>{sub}</p>}
    </div>
    {count!=null&&<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:"#1a3a5a",fontWeight:700,marginTop:6}}>{count}</span>}
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
  const COLORS={green:"#34d399",red:"#f87171",blue:"#38bdf8",amber:"#f59e0b"};
  return(<div style={{width:"100%",background:"rgba(255,255,255,0.02)",borderBottom:"1px solid rgba(255,255,255,0.06)",borderTop:"1px solid rgba(255,255,255,0.06)",padding:"8px 0",overflow:"hidden",position:"relative",marginBottom:24}}>
    <div style={{display:"flex",alignItems:"center",gap:0}}>
      <div style={{flexShrink:0,padding:"0 16px",borderRight:"1px solid rgba(255,255,255,0.08)",marginRight:16}}>
        <span style={{fontSize:8,fontWeight:900,color:"#38bdf8",letterSpacing:"0.14em",textTransform:"uppercase",fontFamily:"'Inter',sans-serif"}}>Live</span>
      </div>
      <div style={{flex:1,overflow:"hidden"}}>
        <div style={{display:"flex",gap:40,animation:"tickerScroll 40s linear infinite",whiteSpace:"nowrap"}}>
          {[...items,...items].map((item,i)=>{
            const c=COLORS[item.color]||"#94a3b8";
            return(<span key={i} style={{fontSize:11,fontWeight:600,color:c,fontFamily:"'Inter',sans-serif",display:"inline-flex",alignItems:"center",gap:8,flexShrink:0}}>
              <span style={{width:4,height:4,borderRadius:"50%",background:c,display:"inline-block",flexShrink:0}}/>
              {item.text}
            </span>);
          })}
        </div>
      </div>
    </div>
    <style>{"@keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}"}</style>
  </div>);
}

// ── Transfer Hub Sidebar ──────────────────────────────────────
function TransferHub({items}){
  const[open,setOpen]=useState(null);
  if(!items?.length)return null;
  return(<div style={{background:"rgba(10,16,30,0.98)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:16,overflow:"hidden"}}>
    <div style={{padding:"14px 16px",borderBottom:"1px solid rgba(245,158,11,0.12)",display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:3,height:20,borderRadius:2,background:"linear-gradient(180deg,#f59e0b,transparent)",flexShrink:0}}/>
      <span style={{fontFamily:"'Sora',sans-serif",fontSize:14,fontWeight:900,color:"#f0f6ff"}}>Transfer Hub</span>
      <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#f59e0b",fontWeight:700,marginLeft:"auto"}}>{items.length}</span>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
      {items.slice(0,8).map((t,i)=>(
        <a key={i} href={t.url||"#"} target="_blank" rel="noopener noreferrer"
          style={{display:"flex",gap:10,padding:"10px 14px",borderBottom:i<7?"1px solid rgba(255,255,255,0.04)":"none",textDecoration:"none",transition:"background 0.15s ease"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(245,158,11,0.05)"}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          {t.image
            ?<img src={t.image} alt="" style={{width:44,height:36,objectFit:"cover",borderRadius:6,flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>
            :<div style={{width:44,height:36,borderRadius:6,flexShrink:0,background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4"/></svg></div>}
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontFamily:"'Sora',sans-serif",fontSize:11,fontWeight:700,color:"#8aabb8",margin:"0 0 3px",overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",lineHeight:1.35}}>{t.headline||t.title}</p>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <span style={{fontFamily:"'Inter',sans-serif",fontSize:8,color:"#2a4a6a",fontWeight:700}}>{t.source}</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:8,color:"#1a3a5a",fontWeight:700}}>{timeAgo(t.published_at)}</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  </div>);
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

  const TF=[{key:"all",label:"All",color:"#64748b"},{key:"preview",label:"Previews",color:"#38bdf8"},{key:"insight",label:"Insights",color:"#34d399"},{key:"news",label:"News",color:"#f59e0b"}];
  const LF=[{key:"all",label:"All Leagues",color:"#64748b"},{key:"epl",label:"Premier League",color:"#38bdf8"},{key:"laliga",label:"La Liga",color:"#f59e0b"},{key:"seriea",label:"Serie A",color:"#34d399"},{key:"bundesliga",label:"Bundesliga",color:"#fb923c"},{key:"ligue1",label:"Ligue 1",color:"#a78bfa"}];
  const SF=[{key:"matchday",label:"Matchday"},{key:"latest",label:"Latest"},{key:"trending",label:"Trending"}];

  return(<div style={{minHeight:"100vh",background:"#000",fontFamily:"'Sora',sans-serif",position:"relative"}}>
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,opacity:0.016,
      backgroundImage:"linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)",
      backgroundSize:"80px 80px"}}/>
    <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:800,height:300,background:"radial-gradient(ellipse at center top,rgba(56,189,248,0.04) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>

    <style>{"@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.75)}}@keyframes apBack{from{opacity:0}to{opacity:1}}@keyframes apUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}@keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}@keyframes scanH{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}@keyframes snLivePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.55)}}"}</style>

    <ArticlePage article={selectedArticle} allArticles={articles} onClose={closeArticle} onNavigate={navArticle}/>

    <div style={{maxWidth:1320,margin:"0 auto",padding:"0 20px 80px",position:"relative",zIndex:1}}>
      {/* Header */}
      <div style={{padding:"30px 0 18px",borderBottom:"1px solid rgba(255,255,255,0.045)",marginBottom:0}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:14}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:4,height:48,borderRadius:2,background:"linear-gradient(180deg,#38bdf8,#34d399)",flexShrink:0}}/>
            <div>
              <h1 style={{fontFamily:"'Sora',sans-serif",fontSize:30,fontWeight:900,color:"#f0f6ff",margin:0,letterSpacing:"-0.03em",lineHeight:1.1}}>Football Intelligence</h1>
              <p style={{fontFamily:"'Inter',sans-serif",fontSize:12,color:"#1a3a5a",margin:"4px 0 0",fontWeight:600}}>
                Model previews · Transfer hub · Tactical insights · Live signals
                {lastUpdated&&<span style={{marginLeft:10,fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#0f2a3a"}}>· Updated {timeAgo(lastUpdated)}</span>}
              </p>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:7,padding:"6px 14px",borderRadius:999,background:"rgba(52,211,153,0.05)",border:"1px solid rgba(52,211,153,0.18)"}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:"#34d399",boxShadow:"0 0 9px rgba(52,211,153,0.8)",animation:"pulse 2.2s ease-in-out infinite",display:"inline-block"}}/>
              <span style={{fontSize:9,fontWeight:900,color:"#34d399",letterSpacing:"0.12em",textTransform:"uppercase",fontFamily:"'Inter',sans-serif"}}>Live feed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Intelligence Ticker */}
      <IntelligenceTicker/>

      {/* Trending + Filters */}
      <TrendingBar clubs={trending} activeClub={activeClub} onSelect={setActiveClub}/>
      <div style={{marginBottom:24}}>
        <div style={{display:"flex",gap:6,flexWrap:"nowrap",overflowX:"auto",paddingBottom:8,scrollbarWidth:"none",alignItems:"center"}}>
          {TF.map(f=><Chip key={f.key} label={f.label} active={activeType===f.key} color={f.color} count={counts[f.key]} onClick={()=>setActiveType(f.key)}/>)}
          <div style={{width:1,height:22,background:"rgba(255,255,255,0.06)",flexShrink:0,margin:"0 4px"}}/>
          {LF.map(f=><Chip key={f.key} label={f.label} active={activeLeague===f.key} color={f.color} onClick={()=>setActiveLeague(f.key)}/>)}
          <div style={{width:1,height:22,background:"rgba(255,255,255,0.06)",flexShrink:0,margin:"0 4px"}}/>
          {SF.map(s=><Chip key={s.key} label={s.label} active={sortMode===s.key} color="#64748b" onClick={()=>setSortMode(s.key)}/>)}
        </div>
      </div>

      {error&&<div style={{padding:"14px 18px",borderRadius:12,marginBottom:20,background:"rgba(248,113,113,0.05)",border:"1px solid rgba(248,113,113,0.18)",fontFamily:"'Inter',sans-serif",fontSize:13,color:"#f87171"}}>Failed to load: {error}</div>}

      {loading&&(<div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Skeleton h={320}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:24}}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>{[1,2,3,4,5,6].map(i=><Skeleton key={i} h={90}/>)}</div>
          <Skeleton h={480}/>
        </div>
      </div>)}

      {!loading&&!error&&(<div style={{display:"flex",flexDirection:"column",gap:40}}>

        {/* Featured */}
        {featured&&<FeaturedCard article={featured} onClick={openArticle}/>}

        {/* Main two-column layout: feed left, Transfer Hub right */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:28,alignItems:"start"}}>

          {/* LEFT — unified newsroom feed */}
          <div style={{display:"flex",flexDirection:"column",gap:40}}>

            {/* ── Latest News: magazine hero grid (news articles) ── */}
            {newsFeed.length>0&&(<section style={{marginBottom:32}}>
              <SectionHead title="Latest News" sub="Breaking football news · Transfers · Injuries" accent="#ffd60a" count={newsFeed.length}/>
              {/* Magazine hero: first article large, next 2 stacked right */}
              {newsFeed.length>=3&&(
                <div style={{display:"grid",gridTemplateColumns:"1.8fr 1fr",gridTemplateRows:"auto auto",gap:8,marginBottom:8}}>
                  <div style={{gridRow:"1/3"}}><MagHeroCard article={newsFeed[0]} onClick={openArticle}/></div>
                  <MagSmallCard article={newsFeed[1]} onClick={openArticle}/>
                  <MagSmallCard article={newsFeed[2]} onClick={openArticle}/>
                </div>
              )}
              {newsFeed.length===2&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  {newsFeed.slice(0,2).map((a,i)=><MagSmallCard key={a.id||i} article={a} onClick={openArticle}/>)}
                </div>
              )}
              {newsFeed.length===1&&<MagHeroCard article={newsFeed[0]} onClick={openArticle}/>}
              {/* Rest in 3-col grid */}
              {newsFeed.length>3&&(
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                  {newsFeed.slice(3,21).map((a,i)=><MagSmallCard key={a.id||i} article={a} onClick={openArticle}/>)}
                </div>
              )}
            </section>)}

            {/* ── Match Previews ── */}
            {previews.length>0&&(<section style={{marginBottom:32}}>
              <SectionHead title="Match Previews" sub="Model analysis for upcoming fixtures" accent="#38bdf8" count={previews.length}/>
              <div style={{display:"grid",gridTemplateColumns:previews.length===1?"1fr":previews.length===2?"1fr 1fr":"repeat(3,1fr)",gap:12}}>
                {previews.slice(0,6).map((a,i)=><MatchPreviewCard key={a.id||i} article={a} onClick={openArticle}/>)}
              </div>
            </section>)}

            {/* ── Model Insights ── */}
            {insights.length>0&&(<section>
              <SectionHead title="Model Insights" sub="Title race analysis · Form spotlights" accent="#00ff9d" count={insights.length}/>
              <div style={{display:"grid",gridTemplateColumns:insights.length===1?"1fr":"1fr 1fr",gap:12}}>
                {insights.slice(0,6).map((a,i)=><InsightCard key={a.id||i} article={a} onClick={openArticle} idx={i}/>)}
              </div>
            </section>)}

            {sorted.length===0&&newsFeed.length===0&&previews.length===0&&insights.length===0&&(
              <div style={{padding:"60px 20px",textAlign:"center",color:"rgba(255,255,255,0.3)",fontSize:14}}>No articles match the current filters</div>
            )}


          </div>

          {/* RIGHT — sticky Transfer Hub */}
          <div style={{position:"sticky",top:20,display:"flex",flexDirection:"column",gap:20}}>
            <TransferHub items={transferItems}/>
          </div>
        </div>

        {/* Footer attribution */}
        <div style={{borderTop:"1px solid rgba(255,255,255,0.045)",paddingTop:24,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div>
            <span style={{fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:700,color:"#1a3a5a"}}>StatinSite Intelligence Engine</span>
            <span style={{fontFamily:"'Inter',sans-serif",fontSize:11,color:"#0f2238",marginLeft:10}}>Built by Rutej Talati</span>
          </div>
          <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:"#0a1828",fontWeight:700}}>statinsite.com</span>
        </div>
      </div>)}
    </div>
  </div>);
}