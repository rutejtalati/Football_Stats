// LiveTicker3Row.jsx — Surgical Precision Theme
// #000 black · #00fff0 cyan · DM Mono terminal chips · 1px borders
// Static fallback while backend wakes up

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveTicker } from "../hooks/useLiveTicker";

const C  = "#00fff0";
const CR = "#ff2744";
const K  = "#000";

function fmtKickoff(iso) {
  if (!iso) return "";
  try {
    const d=new Date(iso);
    const diff=Math.round((d-Date.now())/86400000);
    const t=d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
    if(diff===0) return t;
    if(diff===1) return `Tomorrow ${t}`;
    if(diff>1&&diff<7) return `${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]} ${t}`;
    return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"})+` ${t}`;
  } catch { return ""; }
}

function parseLive(label) {
  if(!label) return{home:"?",away:"?",score:"?–?",min:""};
  const m=label.match(/^(.+?)\s+(\d+\s*[–-]\s*\d+)\s+(.+?)(?:\s+(\d+\+?\d*'))?$/);
  if(m) return{home:m[1].trim(),away:m[3].trim(),score:m[2].replace(/ /g,""),min:m[4]||""};
  const vs=label.split(" vs ");
  if(vs.length===2) return{home:vs[0].trim(),away:vs[1].trim(),score:"v",min:""};
  return{home:label,away:"",score:"",min:""};
}

const FALLBACK_LIVE=[
  {type:"live_score",label:"Man City 2–1 Arsenal 74'",detail:"Premier League"},
  {type:"live_score",label:"Liverpool 1–1 Chelsea 61'",detail:"Premier League"},
  {type:"live_score",label:"Inter 1–0 Juventus 52'",detail:"Serie A"},
  {type:"live_score",label:"PSG 4–1 Monaco 83'",detail:"Ligue 1"},
  {type:"live_score",label:"Bayern 3–0 Leverkusen 67'",detail:"Bundesliga"},
];
const FALLBACK_TODAY=[
  {type:"today",label:"Real Madrid vs Barcelona",detail:"20:00"},
  {type:"today",label:"Napoli vs Roma",detail:"18:30"},
  {type:"today",label:"Dortmund vs Leipzig",detail:"17:30"},
  {type:"today",label:"Lyon vs Nice",detail:"20:00"},
];
const FALLBACK_NEXT=[
  {type:"upcoming",label:"Tottenham vs Newcastle",detail:"2026-03-26T20:00:00Z"},
  {type:"upcoming",label:"AC Milan vs Fiorentina",detail:"2026-03-26T20:45:00Z"},
  {type:"upcoming",label:"Porto vs Benfica",detail:"2026-03-27T21:15:00Z"},
  {type:"upcoming",label:"Celtic vs Rangers",detail:"2026-03-29T12:30:00Z"},
];

function LiveChip({ chip }) {
  const navigate=useNavigate();
  const [hov,setHov]=useState(false);
  const{home,away,score,min}=parseLive(chip.label);
  return (
    <span onClick={()=>navigate("/live")} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"inline-flex",alignItems:"center",margin:"0 5px",border:`1px solid ${hov?C:"rgba(0,255,240,.2)"}`,background:hov?"rgba(0,255,240,.06)":K,height:24,overflow:"hidden",cursor:"pointer",transition:"all .12s",flexShrink:0}}>
      <span style={{padding:"0 7px",fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:500,color:hov?C:"rgba(0,255,240,.7)",whiteSpace:"nowrap",transition:"color .12s"}}>{home}</span>
      {score&&<span style={{padding:"0 7px",background:hov?"rgba(0,255,240,.1)":"rgba(0,255,240,.06)",fontFamily:"'DM Mono',monospace",fontSize:13,letterSpacing:1,borderLeft:`1px solid rgba(0,255,240,.12)`,borderRight:`1px solid rgba(0,255,240,.12)`,display:"flex",alignItems:"center",color:C,transition:"background .12s"}}>{score}</span>}
      <span style={{padding:"0 7px",fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:500,color:hov?C:"rgba(0,255,240,.7)",whiteSpace:"nowrap",transition:"color .12s"}}>{away}</span>
      {min&&(
        <span style={{padding:"0 5px",fontFamily:"'DM Mono',monospace",fontSize:7.5,color:CR,letterSpacing:".08em",borderLeft:"1px solid rgba(255,39,68,.15)",display:"flex",alignItems:"center",gap:3}}>
          <span style={{width:3,height:3,borderRadius:"50%",background:CR,animation:"sp3Blink 1.1s step-start infinite",flexShrink:0}}/>
          {min}
        </span>
      )}
    </span>
  );
}

function TodayChip({ chip }) {
  const navigate=useNavigate();
  const [hov,setHov]=useState(false);
  const label=chip.label||"", detail=chip.detail||"";
  const sm=label.match(/^(.+?)\s+(\d+[–-]\d+)\s+(.+)$/);
  const home=sm?sm[1]:label.split(" vs ")[0]||label;
  const score=sm?sm[2]:null;
  const away=sm?sm[3]:label.split(" vs ")[1]||"";
  return (
    <span onClick={()=>navigate("/predictions/premier-league")} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"inline-flex",alignItems:"center",margin:"0 5px",border:`1px solid ${hov?"rgba(0,255,240,.2)":"rgba(0,255,240,.08)"}`,background:hov?"rgba(0,255,240,.04)":K,height:24,overflow:"hidden",cursor:"pointer",transition:"all .12s",flexShrink:0}}>
      <span style={{padding:"0 7px",fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:500,color:hov?C:"rgba(0,255,240,.5)",whiteSpace:"nowrap",transition:"color .12s"}}>{home}</span>
      {score?(
        <span style={{padding:"0 6px",background:"rgba(0,255,240,.05)",fontFamily:"'DM Mono',monospace",fontSize:13,borderLeft:"1px solid rgba(0,255,240,.08)",borderRight:"1px solid rgba(0,255,240,.08)",display:"flex",alignItems:"center",color:C}}>{score}</span>
      ):(
        <span style={{padding:"0 5px",fontFamily:"'DM Mono',monospace",fontSize:11,color:"rgba(0,255,240,.2)",borderLeft:"1px solid rgba(0,255,240,.06)",borderRight:"1px solid rgba(0,255,240,.06)"}}>vs</span>
      )}
      {away&&<span style={{padding:"0 7px",fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:500,color:hov?C:"rgba(0,255,240,.5)",whiteSpace:"nowrap",transition:"color .12s"}}>{away}</span>}
      {detail&&<span style={{padding:"0 6px 0 0",fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(0,255,240,.2)",letterSpacing:".06em",whiteSpace:"nowrap"}}>· {detail}</span>}
    </span>
  );
}

function NextChip({ chip }) {
  const navigate=useNavigate();
  const [hov,setHov]=useState(false);
  const parts=(chip.label||"").split(" vs ");
  const home=parts[0]?.trim()||"", away=parts[1]?.trim()||"";
  const time=chip.detail?(chip.detail.includes("T")||chip.detail.includes("-")?fmtKickoff(chip.detail.split(" · ")[0]):chip.detail.split(" · ")[0]):"";
  return (
    <span onClick={()=>navigate("/predictions/premier-league")} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"inline-flex",alignItems:"center",margin:"0 5px",border:`1px solid ${hov?C:"rgba(0,255,240,.12)"}`,background:hov?"rgba(0,255,240,.05)":K,height:24,overflow:"hidden",cursor:"pointer",transition:"all .12s",flexShrink:0}}>
      <span style={{padding:"0 7px",fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:500,color:hov?C:"rgba(0,255,240,.45)",whiteSpace:"nowrap",transition:"color .12s"}}>{home}</span>
      <span style={{padding:"0 5px",fontFamily:"'DM Mono',monospace",fontSize:11,color:hov?C:"rgba(0,255,240,.2)",borderLeft:"1px solid rgba(0,255,240,.08)",borderRight:"1px solid rgba(0,255,240,.08)",transition:"color .12s"}}>vs</span>
      <span style={{padding:"0 7px",fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:500,color:hov?C:"rgba(0,255,240,.45)",whiteSpace:"nowrap",transition:"color .12s"}}>{away}</span>
      {time&&<span style={{padding:"0 7px",fontFamily:"'DM Mono',monospace",fontSize:7.5,color:hov?C:"rgba(0,255,240,.25)",letterSpacing:".1em",whiteSpace:"nowrap",transition:"color .12s"}}>{time}</span>}
    </span>
  );
}

const Sep=()=><span style={{width:1,height:10,background:"rgba(0,255,240,.1)",flexShrink:0,display:"inline-block",margin:"0 2px"}}/>;

function Row({label,labelBg,labelColor,chips,Chip,dir="left",speed=24,isLast=false}){
  const[paused,setPaused]=useState(false);
  const all=[...chips,...chips];
  const anim=dir==="right"?"sp3ScrollR":"sp3ScrollL";
  return (
    <div onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)}
      style={{height:34,display:"flex",alignItems:"stretch",overflow:"hidden",borderBottom:isLast?"none":"1px solid rgba(0,255,240,.06)"}}>
      <div style={{flexShrink:0,display:"flex",alignItems:"center",padding:"0 12px",minWidth:76,justifyContent:"center",background:labelBg,color:labelColor,fontFamily:"'DM Mono',monospace",fontSize:7.5,letterSpacing:".2em",textTransform:"uppercase",fontWeight:500,borderRight:"1px solid rgba(0,255,240,.1)",gap:5,whiteSpace:"nowrap"}}>
        {label==="LIVE"&&<span style={{width:4,height:4,borderRadius:"50%",background:"#fff",animation:"sp3Blink 1.1s step-start infinite",flexShrink:0}}/>}
        {label}
      </div>
      <div style={{flex:1,overflow:"hidden",display:"flex",alignItems:"center"}}>
        {chips.length>0?(
          <div style={{display:"inline-flex",alignItems:"center",whiteSpace:"nowrap",willChange:"transform",animation:`${anim} ${speed}s linear infinite`,animationPlayState:paused?"paused":"running"}}>
            {all.map((chip,i)=>(
              <span key={i} style={{display:"inline-flex",alignItems:"center",flexShrink:0}}>
                <Chip chip={chip}/>
                {i<all.length-1&&<Sep/>}
              </span>
            ))}
          </div>
        ):(
          <span style={{padding:"0 14px",fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(0,255,240,.15)",letterSpacing:".1em"}}>No matches right now</span>
        )}
      </div>
    </div>
  );
}

export default function LiveTicker3Row() {
  const{chips,loading}=useLiveTicker(75_000);
  const liveChips=chips.filter(c=>c.type==="live_score");
  const upcomingChips=chips.filter(c=>c.type==="upcoming");
  const todayChips=upcomingChips.length>0?upcomingChips:chips.filter(c=>c.type!=="live_score");
  const row1=liveChips.length>0?liveChips:FALLBACK_LIVE;
  const row2=todayChips.length>0?todayChips:FALLBACK_TODAY;
  const row3=upcomingChips.length>0?upcomingChips:FALLBACK_NEXT;
  return (
    <>
      <style>{`
        @keyframes sp3ScrollL{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes sp3ScrollR{0%{transform:translateX(-50%)}100%{transform:translateX(0)}}
        @keyframes sp3Blink{50%{opacity:0}}
      `}</style>
      <div style={{borderTop:"1px solid rgba(0,255,240,.12)",borderBottom:"1px solid rgba(0,255,240,.12)"}}>
        <Row label="LIVE"  labelBg="rgba(255,39,68,.08)"  labelColor={CR} chips={row1} Chip={LiveChip}  dir="left"  speed={22} isLast={false}/>
        <Row label="TODAY" labelBg="rgba(0,255,240,.04)"  labelColor={C}  chips={row2} Chip={TodayChip} dir="right" speed={28} isLast={false}/>
        <Row label="NEXT"  labelBg="rgba(0,255,240,.02)"  labelColor="rgba(0,255,240,.5)"  chips={row3} Chip={NextChip}  dir="left"  speed={18} isLast={true}/>
      </div>
    </>
  );
}