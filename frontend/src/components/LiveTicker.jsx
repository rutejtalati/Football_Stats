// LiveTicker.jsx — Surgical Precision Theme
// Pure black · cyan chips · red live dot · DM Mono · 1px borders

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveTicker } from "../hooks/useLiveTicker";

const C  = "#00fff0";
const CR = "#ff2744";
const K  = "#000";

const CATS = {
  live_score: { tag:"LIVE",  color:CR, bg:"rgba(255,39,68,.08)"   },
  upcoming:   { tag:"SOON",  color:C,  bg:"rgba(0,255,240,.05)"   },
  model_edge: { tag:"MODEL", color:C,  bg:"rgba(0,255,240,.05)"   },
  title_race: { tag:"TABLE", color:C,  bg:"rgba(0,255,240,.05)"   },
  news:       { tag:"NEWS",  color:C,  bg:"rgba(0,255,240,.05)"   },
  fpl:        { tag:"FPL",   color:C,  bg:"rgba(0,255,240,.05)"   },
  default:    { tag:"INFO",  color:"rgba(0,255,240,.35)", bg:"rgba(0,255,240,.03)" },
};

function humanDate(str) {
  if (!str) return "";
  try {
    const d=new Date(str); if(isNaN(d)) return str;
    const diff=Math.round((d-Date.now())/86400000);
    const time=d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
    const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    if(diff===0) return `Today ${time}`;
    if(diff===1) return `Tomorrow ${time}`;
    if(diff>1&&diff<7) return `${days[d.getDay()]} ${time}`;
    return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"})+` ${time}`;
  } catch { return str; }
}

function getRoute(chip) {
  switch(chip.type) {
    case "live_score": return "/live";
    case "upcoming":   return "/predictions/premier-league";
    case "news":       return "/news";
    case "fpl":        return "/best-team";
    default:           return "/";
  }
}

function LiveDot({ color="#ff2744" }) {
  return <span style={{width:4,height:4,borderRadius:"50%",background:color,display:"inline-block",flexShrink:0,animation:"spTkDot 1.4s ease-in-out infinite"}}/>;
}

function Chip({ chip }) {
  const navigate=useNavigate();
  const [hov,setHov]=useState(false);
  const cfg=CATS[chip.type]||CATS.default;
  const isLive=chip.type==="live_score";

  let main=chip.label||"", detail="", score=null;
  if(isLive){
    const m=main.match(/(.+?)\s+(\d+)\s*[-–]\s*(\d+)\s+(.+)/);
    if(m){score=`${m[2]}–${m[3]}`;main=`${m[1]} vs ${m[4]}`;}
    detail=chip.detail||"";
  } else if(chip.type==="upcoming"&&chip.detail){
    detail=humanDate(chip.detail.split(" · ")[0]?.trim());
  } else if(chip.detail){
    detail=chip.detail;
  }

  let prob=null;
  if(chip.type==="model_edge"){const m=main.match(/(\d+)%/);if(m)prob=m[1];}

  return (
    <span
      onClick={()=>navigate(getRoute(chip))}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        display:"inline-flex",alignItems:"center",gap:0,
        height:26,flexShrink:0,overflow:"hidden",
        border:`1px solid ${isLive?"rgba(255,39,68,.3)":hov?C:"rgba(0,255,240,.12)"}`,
        background:hov?(isLive?"rgba(255,39,68,.1)":"rgba(0,255,240,.05)"):K,
        cursor:"pointer",transition:"border-color .12s,background .12s",userSelect:"none",
      }}
    >
      {/* Left accent line */}
      <span style={{width:2,height:"100%",flexShrink:0,background:cfg.color}}/>
      {/* Tag */}
      <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"0 7px",height:"100%",background:cfg.bg,borderRight:`1px solid ${isLive?"rgba(255,39,68,.15)":"rgba(0,255,240,.08)"}`,fontSize:7,fontWeight:500,letterSpacing:".16em",color:cfg.color,textTransform:"uppercase",fontFamily:"'DM Mono',monospace",flexShrink:0}}>
        {isLive&&<LiveDot/>}{cfg.tag}
      </span>
      {/* Logos */}
      {(chip.home_logo||chip.away_logo)&&(
        <span style={{display:"inline-flex",alignItems:"center",gap:2,padding:"0 5px"}}>
          {chip.home_logo&&<img src={chip.home_logo} alt="" width={12} height={12} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
          {chip.away_logo&&<img src={chip.away_logo} alt="" width={12} height={12} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
        </span>
      )}
      {/* Main text */}
      <span style={{padding:"0 8px",fontSize:10.5,fontWeight:500,color:hov?C:"rgba(0,255,240,.75)",whiteSpace:"nowrap",letterSpacing:".02em",fontFamily:"'Space Grotesk',sans-serif",transition:"color .12s"}}>{main}</span>
      {/* Score */}
      {score&&(
        <span style={{margin:"0 5px 0 0",padding:"1px 6px",background:"rgba(0,255,240,.06)",border:"1px solid rgba(0,255,240,.15)",fontSize:12,fontWeight:500,color:C,fontFamily:"'DM Mono',monospace",letterSpacing:".04em",flexShrink:0}}>{score}</span>
      )}
      {/* Prob */}
      {prob&&<span style={{margin:"0 7px 0 0",fontSize:12,fontWeight:500,color:C,fontFamily:"'DM Mono',monospace",flexShrink:0}}>{prob}%</span>}
      {/* Detail */}
      {detail&&<span style={{padding:"0 8px 0 0",fontSize:9,fontWeight:400,color:"rgba(0,255,240,.22)",whiteSpace:"nowrap",fontFamily:"'DM Mono',monospace",letterSpacing:".04em",flexShrink:0}}>· {detail}</span>}
    </span>
  );
}

function Sep() {
  return <span style={{width:1,height:10,background:"rgba(0,255,240,.1)",flexShrink:0,display:"inline-block"}}/>;
}

export default function LiveTicker() {
  const { chips, isLive, loading }=useLiveTicker(75_000);
  const [paused,setPaused]=useState(false);

  return (
    <>
      <style>{`
        @keyframes spTkScroll{from{transform:translateX(0)}to{transform:translateX(-33.333%)}}
        @keyframes spTkDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.2;transform:scale(.6)}}
        .sp-tk-track{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;will-change:transform;animation:spTkScroll var(--dur,50s) linear infinite}
        .sp-tk-track.paused{animation-play-state:paused}
      `}</style>

      <div
        style={{position:"fixed",top:56,left:0,right:0,height:32,zIndex:199,background:K,borderBottom:`1px solid rgba(0,255,240,.1)`,display:"flex",alignItems:"center",overflow:"hidden"}}
        onMouseEnter={()=>setPaused(true)}
        onMouseLeave={()=>setPaused(false)}
      >
        {/* Label */}
        <div style={{display:"flex",alignItems:"center",gap:5,padding:"0 12px",borderRight:`1px solid rgba(0,255,240,.1)`,height:"100%",flexShrink:0,background:isLive?"rgba(255,39,68,.08)":"rgba(0,255,240,.04)"}}>
          {isLive&&<LiveDot/>}
          <span style={{fontSize:7.5,fontWeight:500,letterSpacing:".2em",color:isLive?CR:C,fontFamily:"'DM Mono',monospace",textTransform:"uppercase"}}>{isLive?"LIVE":"INTEL"}</span>
        </div>
        {/* Left fade */}
        <div style={{position:"absolute",left:72,top:0,bottom:0,width:16,background:"linear-gradient(to right,#000,transparent)",zIndex:2,pointerEvents:"none"}}/>
        {/* Track */}
        {!loading&&chips.length>0&&(()=>{
          const all=[...chips,...chips,...chips];
          const dur=Math.max(chips.length*10,50);
          return (
            <div style={{flex:1,overflow:"hidden",paddingLeft:6}}>
              <div className={`sp-tk-track${paused?" paused":""}`} style={{"--dur":`${dur}s`}}>
                {all.map((chip,i)=>(
                  <span key={i} style={{display:"inline-flex",alignItems:"center",gap:7,flexShrink:0}}>
                    <Chip chip={chip}/>
                    {i<all.length-1&&<Sep/>}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}
        {/* Right fade */}
        <div style={{position:"absolute",right:0,top:0,bottom:0,width:32,background:"linear-gradient(to left,#000,transparent)",zIndex:2,pointerEvents:"none"}}/>
      </div>
    </>
  );
}