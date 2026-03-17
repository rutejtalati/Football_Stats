// pages/SquadBuilderPage.jsx — FPL Transfer Market v2 — MOBILE + DESKTOP
// ALL original features kept: flip cards, compare modal, suggest banner, drag ghost,
// position zones, editable budget, undo, GW forecast, ICT bars, ownership rings,
// MiniSpark, AvailRow expand, auto-arrange, formation card.
// Mobile additions: tab switcher (⚽ Pitch / 👥 Players), scaled cards,
// touch-friendly tap targets, auto-switch tabs on interaction.

import { useState, useEffect, useRef, useCallback } from "react";
import { getFplPredictorTable } from "../api/api";

/* ── Mobile hook ─────────────────────────────────────────── */
function useIsMobile(bp = 768) {
  const [m, setM] = useState(
    typeof window !== "undefined" ? window.innerWidth < bp : false
  );
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return m;
}

/* ─── Constants ──────────────────────────────────────────── */
const MAX_SAME_TEAM = 3;

const SHIRT_IDS = {
  ARS:3,AVL:7,BOU:91,BRE:94,BHA:36,CHE:8,CRY:31,EVE:11,FUL:54,IPS:40,
  LEI:13,LIV:14,MCI:43,MUN:1,NEW:4,NFO:17,SOU:20,TOT:6,WHU:21,WOL:39,
};
const TEAM_COLORS = {
  ARS:"#EF0107",AVL:"#95BFE5",BOU:"#DA291C",BRE:"#E30613",BHA:"#0057B8",
  CHE:"#034694",CRY:"#1B458F",EVE:"#003399",FUL:"#CCCCCC",IPS:"#3A64A3",
  LEI:"#0053A0",LIV:"#C8102E",MCI:"#6CABDD",MUN:"#DA291C",NEW:"#241F20",
  NFO:"#DD0000",SOU:"#D71920",TOT:"#132257",WHU:"#7A263A",WOL:"#FDB913",
};
const GK_COLORS = {
  ARS:"#f5c518",AVL:"#00bfa5",BOU:"#1a237e",BRE:"#ffd600",BHA:"#fff176",
  CHE:"#66bb6a",CRY:"#ce93d8",EVE:"#fff9c4",FUL:"#1565c0",IPS:"#ff8a65",
  LEI:"#80deea",LIV:"#a5d6a7",MCI:"#f48fb1",MUN:"#ffe0b2",NEW:"#ffcc02",
  NFO:"#b0bec5",SOU:"#90caf9",TOT:"#ef9a9a",WHU:"#e6ee9c",WOL:"#b39ddb",
};
const DIFF = {
  1:{bg:"#0d5c2e",txt:"#80ffb0"},2:{bg:"#0d5c2e",txt:"#80ffb0"},
  3:{bg:"#5c4400",txt:"#ffd966"},4:{bg:"#5c1515",txt:"#ff9999"},
  5:{bg:"#3a0a0a",txt:"#ff6666"},
};
const SLOT_POSITION = {
  0:"GK",
  1:"DEF",2:"DEF",3:"DEF",4:"DEF",5:"DEF",
  6:"MID",7:"MID",8:"MID",9:"MID",10:"MID",
  11:"FWD",12:"FWD",13:"FWD",
  14:"GK",15:"DEF",16:"MID",17:"FWD",
};
const STARTER_INDICES = [0,1,2,3,4,5,6,7,8,9,10,11,12,13];
const BENCH_INDICES   = [14,15,16,17];
const MAX_STARTERS    = 11;

/* ─── Helpers ────────────────────────────────────────────── */
function shortName(n) {
  if (!n) return "—";
  const p = n.trim().split(" ");
  return p.length === 1 ? p[0] : `${p[0][0]}. ${p[p.length-1]}`;
}
function projTier(pts) {
  if (pts >= 9)   return "elite";
  if (pts >= 7)   return "high";
  if (pts >= 5.5) return "good";
  return "";
}

/* ─── Shirt ──────────────────────────────────────────────── */
function Shirt({ team, size=44, isGK=false }) {
  const [state, setState] = useState("primary");
  const id  = SHIRT_IDS[team];
  const sfx = isGK ? "_1-66.png" : "-66.png";
  const pri = id ? `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${id}${sfx}` : null;
  const sec = id ? `https://resources.premierleague.com/premierleague/shirts/standard/shirt_${id}${sfx}` : null;
  const bg  = isGK ? (GK_COLORS[team]||"#ffd600") : (TEAM_COLORS[team]||"#4f8cff");
  const tc  = ["FUL","WOL","AVL","MCI"].includes(team) ? "#111" : "#fff";
  const imgStyle = { objectFit:"contain", filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.6))", display:"block", flexShrink:0 };
  if (state==="primary"   && pri) return <img src={pri} alt={team||""} width={size} height={size} style={imgStyle} onError={()=>setState("secondary")}/>;
  if (state==="secondary" && sec) return <img src={sec} alt={team||""} width={size} height={size} style={imgStyle} onError={()=>setState("fallback")}/>;
  return (
    <div style={{
      width:size, height:size*0.9, borderRadius:6,
      background:`linear-gradient(160deg,${bg},${bg}cc)`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.2, fontWeight:900, color:tc,
      boxShadow:"0 2px 8px rgba(0,0,0,0.5)", flexShrink:0,
    }}>{isGK?"GK":(team||"?").slice(0,3)}</div>
  );
}

/* ─── Mini sparkline ─────────────────────────────────────── */
function MiniSpark({ player }) {
  const vals = [1,2,3,4,5].map(i => Number(player[`pts_gw_${i}`]||0));
  const max  = Math.max(...vals, 1);
  const W=72, H=20, pad=3;
  const uid  = player.player_id || player.id || "s";
  const pts  = vals.map((v,i) => {
    const x = pad+(i/(vals.length-1))*(W-pad*2);
    const y = H-pad-((v/max)*(H-pad*2));
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={W} height={H} style={{ display:"block", overflow:"visible" }}>
      <defs>
        <linearGradient id={`msp${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b9eff"/><stop offset="100%" stopColor="#9ff1b4"/>
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={`url(#msp${uid})`} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"/>
      {vals.map((v,i) => {
        const x = pad+(i/(vals.length-1))*(W-pad*2);
        const y = H-pad-((v/max)*(H-pad*2));
        return <circle key={i} cx={x} cy={y} r={2} fill={i===vals.length-1?"#9ff1b4":"#67b1ff"} stroke="rgba(0,0,0,0.5)" strokeWidth="1"/>;
      })}
    </svg>
  );
}

/* ─── Pitch slot card — flip on hover/tap ───────────────── */
function PitchSlot({ idx, player, isSelected, isDragOver, isBench, isInactive=false,
    onClick, onDragStart, onDragEnter, onDragLeave, onDrop, cardW }) {
  const [flipped, setFlipped] = useState(false);

  const pts     = Number(player?.projected_points||0);
  const tier    = player ? projTier(pts) : "";
  const diff    = DIFF[player?.fixture_difficulty] || DIFF[3];
  const slotPos = SLOT_POSITION[idx];
  const W       = cardW != null ? cardW : (isBench ? 86 : 104);

  const borderColor = isSelected    ? "#3b9eff"
    : isDragOver                    ? "#28d97a"
    : tier==="elite"                ? "rgba(40,217,122,0.55)"
    : tier==="high"                 ? "rgba(40,217,122,0.28)"
    : "rgba(255,255,255,0.1)";
  const shadow = isSelected         ? "0 0 24px rgba(59,158,255,0.5)"
    : isDragOver                    ? "0 0 20px rgba(40,217,122,0.4)"
    : tier==="elite"                ? "0 0 16px rgba(40,217,122,0.4)"
    : tier==="high"                 ? "0 0 10px rgba(40,217,122,0.2)"
    : "0 4px 12px rgba(0,0,0,0.4)";
  const ptColor = tier==="elite"    ? "#9ff1b4"
    : tier==="high"                 ? "#c5ffdc"
    : tier==="good"                 ? "#67b1ff"
    : "#8aafcc";

  const containerProps = {
    draggable: !!player,
    onClick: () => { if (player) setFlipped(f => !f); onClick(); },
    onDragStart: e => { e.dataTransfer.effectAllowed="move"; onDragStart(); },
    onDragEnter: e => { e.preventDefault(); onDragEnter(); },
    onDragOver:  e => { e.preventDefault(); e.dataTransfer.dropEffect="move"; },
    onDragLeave: onDragLeave,
    onDrop:      e => { e.preventDefault(); onDrop(); },
    onMouseEnter: () => player && setFlipped(true),
    onMouseLeave: () => setFlipped(false),
  };

  const shirtSz = isBench ? Math.round(W*0.46) : Math.round(W*0.5);

  if (!player) {
    return (
      <div {...containerProps} style={{
        width:W, flexShrink:0,
        background: isInactive ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.02)",
        border: isInactive ? "1.5px dashed rgba(255,255,255,0.05)" : "1.5px dashed rgba(255,255,255,0.1)",
        borderRadius:12, padding:"10px 6px 8px",
        display:"flex", flexDirection:"column", alignItems:"center", gap:5,
        cursor: isInactive ? "not-allowed" : "pointer", userSelect:"none",
        transition:"all 0.18s ease", opacity: isInactive ? 0.35 : 1,
      }}>
        <div style={{
          width:Math.round(W*0.42), height:Math.round(W*0.42),
          borderRadius:8, border:"1.5px dashed rgba(255,255,255,0.12)",
          display:"flex", alignItems:"center", justifyContent:"center",
          background:"rgba(255,255,255,0.02)",
        }}>
          {isInactive ? (
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none" opacity="0.3">
              <rect x="1" y="6" width="10" height="7" rx="2" stroke="white" strokeWidth="1.3"/>
              <path d="M3 6V4a3 3 0 016 0v2" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" opacity="0.2">
              <line x1="7" y1="2" x2="7" y2="12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="2" y1="7" x2="12" y2="7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        </div>
        <div style={{ fontSize:8, fontWeight:800,
          color: isInactive ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.18)",
          letterSpacing:"0.08em" }}>{isInactive ? "LOCKED" : slotPos}</div>
      </div>
    );
  }

  return (
    <div {...containerProps} style={{
      width:W, flexShrink:0, perspective:"600px", position:"relative",
      cursor:"pointer", userSelect:"none",
      transform: isSelected ? "scale(1.07)" : isDragOver ? "scale(1.04)" : "scale(1)",
      transition:"transform 0.15s ease", zIndex: flipped ? 20 : 1,
    }}>
      {isSelected && (
        <div style={{
          position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)",
          background:"#3b9eff", color:"#fff", fontSize:7, fontWeight:900,
          padding:"1px 7px", borderRadius:999, letterSpacing:"0.08em",
          whiteSpace:"nowrap", zIndex:30,
        }}>SELECTED</div>
      )}
      {/* Flip wrapper */}
      <div style={{
        position:"relative",
        transition:"transform 0.36s cubic-bezier(0.4,0,0.2,1)",
        transformStyle:"preserve-3d",
        transform: flipped ? "rotateY(180deg)" : "none",
        borderRadius:12, border:`1.5px solid ${borderColor}`, boxShadow:shadow,
      }}>
        {/* ── FRONT ── */}
        <div style={{
          backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden",
          background:"linear-gradient(160deg,#0c1a2a,#060e18)", borderRadius:11,
          padding: isBench ? "8px 5px 6px" : "9px 6px 7px",
          display:"flex", flexDirection:"column", alignItems:"center", gap:3,
          minHeight: isBench ? 110 : 128,
        }}>
          <Shirt team={player.team} size={shirtSz} isGK={player.position==="GK"}/>
          <div style={{
            fontSize: W < 80 ? 9 : (isBench ? 10 : 11),
            fontWeight:900, color:"#fff", textAlign:"center", lineHeight:1.2,
            maxWidth:"100%", overflow:"hidden", textOverflow:"ellipsis",
            whiteSpace:"nowrap", width:"100%",
            background:"rgba(0,0,0,0.6)", padding:"1px 5px", borderRadius:4,
            textShadow:"0 1px 4px rgba(0,0,0,0.9)",
          }}>{shortName(player.name)}</div>
          {player.next_opp && (
            <div style={{ fontSize:7, fontWeight:800, padding:"1px 5px", borderRadius:999,
              background:diff.bg, color:diff.txt, whiteSpace:"nowrap" }}>{player.next_opp}</div>
          )}
          <div style={{ fontSize: W < 80 ? 10 : (isBench ? 11 : 13), fontWeight:900, color:ptColor, lineHeight:1 }}>
            {pts.toFixed(1)}
          </div>
          <div style={{ fontSize:7, color:"rgba(255,255,255,0.18)", lineHeight:1 }}>↺</div>
        </div>
        {/* ── BACK ── */}
        <div style={{
          position:"absolute", inset:0,
          backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden",
          transform:"rotateY(180deg)",
          background:"linear-gradient(170deg,#06101c 0%,#030a14 100%)",
          border:"1.5px solid rgba(103,177,255,0.28)", borderRadius:12,
          padding:"9px 8px 8px", display:"flex", flexDirection:"column",
          gap:4, justifyContent:"center",
        }}>
          <div style={{
            fontSize:9, fontWeight:900, color:"#c8dff8", textAlign:"center", lineHeight:1.15,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
            width:"100%", paddingBottom:5, borderBottom:"1px solid rgba(103,177,255,0.1)",
          }}>{shortName(player.name)}</div>
          {[
            { lbl:"PROJ", val:`${pts.toFixed(1)} pts`, col:pts>=9?"#9ff1b4":pts>=6?"#7dcfff":"#c8d8f0", hi:true },
            { lbl:"FORM", val:Number(player.form||0).toFixed(1), col:"#c8d8f0" },
            { lbl:"COST", val:`£${player.cost}m`, col:"#c8d8f0" },
            { lbl:"APP",  val:`${Math.round((player.appearance_prob||player.prob_appear||0)*100)}%`,
              col:Math.round((player.appearance_prob||player.prob_appear||0)*100)>80?"#9ff1b4":"#ffaa44" },
            { lbl:"OWN",  val:`${Number(player.selected_by_pct||0).toFixed(0)}%`,
              col:Number(player.selected_by_pct||0)>30?"#f2c94c":Number(player.selected_by_pct||0)>10?"#7dcfff":"#9ff1b4" },
          ].map(({lbl,val,col,hi}) => (
            <div key={lbl} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"2.5px 5px",
              background:hi?"rgba(40,217,122,0.07)":"rgba(255,255,255,0.03)",
              borderRadius:5,
              borderLeft:hi?"2px solid rgba(40,217,122,0.35)":"2px solid rgba(255,255,255,0.06)",
            }}>
              <span style={{ fontSize:7, fontWeight:800, color:"#2a4060", letterSpacing:"0.05em" }}>{lbl}</span>
              <span style={{ fontSize:9.5, fontWeight:900, color:col, lineHeight:1 }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── ICT mini-bar ───────────────────────────────────────── */
function IctBar({ label, value, max=100, color }) {
  const pct = Math.min((value/max)*100,100);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
      <span style={{ fontSize:8, fontWeight:800, color:"rgba(255,255,255,0.45)", minWidth:22, letterSpacing:"0.06em" }}>{label}</span>
      <div style={{ flex:1, height:3, borderRadius:2, background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
        <div style={{ width:pct+"%", height:"100%", background:color, borderRadius:2, transition:"width 0.5s ease" }}/>
      </div>
      <span style={{ fontSize:9, fontWeight:800, color, minWidth:20, textAlign:"right", fontFamily:"DM Mono,monospace" }}>{Math.round(value)}</span>
    </div>
  );
}

/* ─── Ownership ring ─────────────────────────────────────── */
function OwnershipRing({ pct }) {
  const r=11, c=14, circ=2*Math.PI*r;
  const fill=Math.min(pct/100,1);
  const color = pct>30?"#f2c94c":pct>10?"#67b1ff":"#9ff1b4";
  return (
    <svg width={c*2} height={c*2} viewBox={`0 0 ${c*2} ${c*2}`} style={{flexShrink:0}}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5"/>
      <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={circ} strokeDashoffset={circ*(1-fill)}
        strokeLinecap="round" transform={`rotate(-90 ${c} ${c})`}
        style={{transition:"stroke-dashoffset 0.6s ease"}}/>
      <text x={c} y={c+3.5} textAnchor="middle" fontSize="6.5" fontWeight="800" fill={color} fontFamily="DM Mono,monospace">{Math.round(pct)}%</text>
    </svg>
  );
}

/* ─── Availability badge ─────────────────────────────────── */
function AvailBadge({ player }) {
  const avail  = player.official_availability||"Available";
  const chance = player.official_chance;
  if (avail==="Available")
    return <div style={{ width:7,height:7,borderRadius:"50%",background:"#28d97a",boxShadow:"0 0 5px rgba(40,217,122,0.7)",flexShrink:0 }}/>;
  if (avail.startsWith("Doubtful"))
    return <div title={avail} style={{ padding:"1px 5px",borderRadius:4,background:"rgba(255,170,68,0.15)",border:"1px solid rgba(255,170,68,0.3)",fontSize:8,fontWeight:800,color:"#ffaa44",whiteSpace:"nowrap",flexShrink:0 }}>{chance!=null?`${chance}%`:"D"}</div>;
  if (avail.startsWith("Injured"))
    return <div title={avail} style={{ padding:"1px 5px",borderRadius:4,background:"rgba(255,77,109,0.15)",border:"1px solid rgba(255,77,109,0.3)",fontSize:8,fontWeight:800,color:"#ff4d6d",whiteSpace:"nowrap",flexShrink:0 }}>INJ</div>;
  if (avail.startsWith("Suspended"))
    return <div title="Suspended" style={{ padding:"1px 5px",borderRadius:4,background:"rgba(255,77,109,0.12)",fontSize:8,fontWeight:800,color:"#ff4d6d",flexShrink:0 }}>SUS</div>;
  return null;
}

/* ─── GW forecast bars ───────────────────────────────────── */
function GwForecast({ player }) {
  const gws = [1,2,3,4,5].map(i=>Number(player[`pts_gw_${i}`]||0));
  const max  = Math.max(...gws,1);
  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:18 }}>
      {gws.map((v,i)=>{
        const h=Math.round((v/max)*16)||1;
        const isNext=i===0;
        const col=isNext?"#3b9eff":v>=7?"#9ff1b4":v>=5?"#67b1ff":"rgba(255,255,255,0.15)";
        return (
          <div key={i} title={`GW${i+1}: ${v.toFixed(1)} pts`}
            style={{ flex:1,height:h,borderRadius:"2px 2px 0 0",background:col,
              outline:isNext?"1px solid rgba(59,158,255,0.5)":undefined,
              transition:"height 0.4s ease" }}/>
        );
      })}
    </div>
  );
}

/* ─── Available player row — full with expand panel ─────── */
function AvailRow({ player, isHighlighted, blocked, blockReason,
    onClick, onDragStart, onDragEnd, onDragEnter, onDragLeave, onDrop, isDragOver, isMobile }) {
  const [expanded, setExpanded] = useState(false);
  const pts    = Number(player.projected_points||0);
  const tier   = projTier(pts);
  const diff   = DIFF[player.fixture_difficulty]||DIFF[3];
  const ptColor= tier==="elite"?"#9ff1b4":tier==="high"?"#c5ffdc":"#67b1ff";
  const form   = Number(player.form||0);
  const ict    = Number(player.ict_index||0);
  const inf    = Number(player.influence||0);
  const cre    = Number(player.creativity||0);
  const thr    = Number(player.threat||0);
  const own    = Number(player.selected_by_pct||0);
  const probPct= Math.round((player.prob_appear||player.appearance_prob||0)*100);
  const tIn    = player.transfers_in_gw||0;
  const tOut   = player.transfers_out_gw||0;
  const trendUp= tIn > tOut, trendDn= tOut > tIn;

  const bg     = isDragOver?"rgba(40,217,122,0.1)":isHighlighted?"rgba(59,158,255,0.1)":expanded?"rgba(59,158,255,0.05)":"rgba(255,255,255,0.025)";
  const border = isHighlighted?"1px solid rgba(59,158,255,0.35)":isDragOver?"1px solid rgba(40,217,122,0.45)":expanded?"1px solid rgba(59,158,255,0.18)":"1px solid rgba(255,255,255,0.055)";

  return (
    <div
      draggable={!blocked}
      onDragStart={e=>{ if(blocked){e.preventDefault();return;} e.dataTransfer.effectAllowed="move"; onDragStart(e); }}
      onDragEnd={()=>onDragEnd?.()}
      onDragEnter={e=>{e.preventDefault();onDragEnter?.();}}
      onDragOver={e=>e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={e=>{e.preventDefault();onDrop?.();}}
      style={{ borderRadius:11, background:bg, border, opacity:blocked?0.3:1,
        transform:isDragOver?"scale(1.02) translateY(-1px)":"scale(1)",
        boxShadow:isDragOver?"0 6px 22px rgba(40,217,122,0.18)":expanded?"0 4px 16px rgba(0,0,0,0.35)":"none",
        transition:"all 0.14s ease", overflow:"visible", position:"relative",
        WebkitTapHighlightColor:"transparent",
      }}
    >
      {/* Main row */}
      <div
        onClick={blocked?undefined:onClick}
        style={{ display:"flex", alignItems:"center", gap:8,
          padding: isMobile?"9px 10px 9px 8px":"8px 10px 8px 8px",
          cursor:blocked?"not-allowed":"grab",
          minHeight: isMobile?50:46, borderRadius:11 }}
      >
        {/* Drag handle — desktop only */}
        {!blocked && !isMobile && (
          <div style={{color:"rgba(255,255,255,0.1)",fontSize:11,flexShrink:0,cursor:"grab",userSelect:"none",lineHeight:1}}>⠿</div>
        )}
        {/* Shirt */}
        <div style={{flexShrink:0,position:"relative"}}>
          <Shirt team={player.team} size={30} isGK={player.position==="GK"}/>
          <div style={{position:"absolute",top:-2,right:-2}}><AvailBadge player={player}/></div>
        </div>
        {/* Name + meta */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:800,color:"#e8f0ff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.3}}>
            {player.name}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5,marginTop:1}}>
            <span style={{fontSize:9,fontWeight:800,color:"#4a7a9a"}}>{player.team}</span>
            <span style={{width:2,height:2,borderRadius:"50%",background:"rgba(255,255,255,0.18)",flexShrink:0}}/>
            <span style={{fontSize:9,fontWeight:700,color:"#4a7a9a"}}>{player.position}</span>
            {form>5&&<span style={{fontSize:9,fontWeight:800,color:"#9ff1b4",background:"rgba(40,217,122,0.1)",padding:"0px 4px",borderRadius:3}}>🔥{form.toFixed(1)}</span>}
          </div>
        </div>
        {/* Transfer trend — desktop only */}
        {!isMobile && (
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1,flexShrink:0,minWidth:22}}>
            {trendUp&&<span style={{fontSize:9,color:"#9ff1b4",fontWeight:800,lineHeight:1}}>▲</span>}
            {trendDn&&<span style={{fontSize:9,color:"#ff4d6d",fontWeight:800,lineHeight:1}}>▼</span>}
            {!trendUp&&!trendDn&&<span style={{fontSize:9,color:"rgba(255,255,255,0.1)",lineHeight:1}}>—</span>}
          </div>
        )}
        {/* Fixture */}
        {player.next_opp && (
          <div style={{fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:999,background:diff.bg,color:diff.txt,whiteSpace:"nowrap",flexShrink:0}}>
            {player.next_opp}
          </div>
        )}
        {/* Pts + cost */}
        <div style={{textAlign:"right",flexShrink:0,minWidth:44}}>
          <div style={{fontSize:13,fontWeight:900,color:ptColor,fontFamily:"DM Mono,monospace",lineHeight:1.1}}>{pts.toFixed(1)}</div>
          <div style={{fontSize:9,color:"#4a7a9a",lineHeight:1.1}}>£{player.cost}m</div>
        </div>
        {/* Ownership ring — hide on small mobile */}
        {!isMobile && <OwnershipRing pct={own}/>}
        {/* Expand toggle */}
        <button
          onClick={e=>{e.stopPropagation();setExpanded(v=>!v);}}
          style={{background:"none",border:"none",cursor:"pointer",padding:"4px",color:"rgba(255,255,255,0.18)",fontSize:11,lineHeight:1,flexShrink:0,borderRadius:4,minWidth:24,minHeight:36,display:"flex",alignItems:"center",justifyContent:"center"}}
          title="Show detailed stats"
        >{expanded?"▲":"▼"}</button>
        {/* Block icon */}
        {blocked&&blockReason&&(
          <span title={blockReason} style={{fontSize:11,flexShrink:0}}>
            {blockReason.includes("budget")?"💸":blockReason.includes("team")?"⚠️":"🚫"}
          </span>
        )}
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div style={{
          borderTop:"1px solid rgba(255,255,255,0.06)",
          padding:"10px 12px 12px",
          background:"rgba(5,15,28,0.85)",
          display:"flex", flexDirection:"column", gap:9,
          animation:"expandIn 0.18s ease",
          borderRadius:"0 0 11px 11px", overflow:"hidden",
        }}>
          {/* GW forecast + ICT */}
          <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:isMobile?"wrap":"nowrap"}}>
            <div style={{flex:1,minWidth:120}}>
              <div style={{fontSize:8,fontWeight:800,color:"rgba(255,255,255,0.45)",letterSpacing:"0.1em",marginBottom:4}}>GW FORECAST</div>
              <GwForecast player={player}/>
              <div style={{display:"flex",gap:2,marginTop:3}}>
                {[1,2,3,4,5].map(i=>(
                  <div key={i} style={{flex:1,textAlign:"center",fontSize:7.5,color:"rgba(255,255,255,0.4)",fontFamily:"DM Mono,monospace"}}>
                    {Number(player[`pts_gw_${i}`]||0).toFixed(1)}
                  </div>
                ))}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:3,minWidth:72}}>
              <div style={{fontSize:8,fontWeight:800,color:"rgba(255,255,255,0.45)",letterSpacing:"0.1em",marginBottom:1}}>ICT INDEX</div>
              <IctBar label="INF" value={inf} max={400} color="#4f9eff"/>
              <IctBar label="CRE" value={cre} max={400} color="#b388ff"/>
              <IctBar label="THR" value={thr} max={800} color="#ff6b35"/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:1}}>
                <span style={{fontSize:8,color:"rgba(255,255,255,0.45)"}}>ICT Total</span>
                <span style={{fontSize:9,fontWeight:900,color:"#ffc107",fontFamily:"DM Mono,monospace"}}>{ict.toFixed(1)}</span>
              </div>
            </div>
          </div>
          {/* Stats grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4}}>
            {[
              {label:"FORM",value:form.toFixed(1),color:form>=6?"#9ff1b4":form>=4?"#67b1ff":"#4a7a9a",sub:"season"},
              {label:"APP %",value:probPct+"%",color:probPct>=85?"#9ff1b4":probPct>=50?"#ffaa44":"#ff4d6d",sub:"next gw"},
              {label:"SEASON",value:String(player.points_so_far||0),color:"#c8d8f0",sub:"total pts"},
              {label:"VALUE",value:`${Number(player.value_rest_season||0).toFixed(1)}`,color:"#ffc107",sub:"pts/£m"},
            ].map(({label,value,color,sub})=>(
              <div key={label} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1,
                padding:"5px 4px",borderRadius:7,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)"}}>
                <span style={{fontSize:7,fontWeight:900,color:"rgba(255,255,255,0.5)",letterSpacing:"0.08em"}}>{label}</span>
                <span style={{fontSize:13,fontWeight:900,color,fontFamily:"DM Mono,monospace",lineHeight:1}}>{value}</span>
                <span style={{fontSize:7,color:"rgba(255,255,255,0.35)"}}>{sub}</span>
              </div>
            ))}
          </div>
          {/* Transfer trend bar */}
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <span style={{fontSize:8,fontWeight:800,color:"rgba(255,255,255,0.45)",minWidth:52,letterSpacing:"0.06em"}}>TRANSFERS</span>
            <div style={{flex:1,height:4,borderRadius:2,background:"rgba(255,77,109,0.15)",overflow:"hidden"}}>
              <div style={{
                height:"100%",
                width:tIn+tOut>0?`${(tIn/(tIn+tOut))*100}%`:"50%",
                background:"linear-gradient(90deg,rgba(40,217,122,0.7),rgba(40,217,122,0.4))",
                borderRadius:2,transition:"width 0.5s ease",
              }}/>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <span style={{fontSize:9,color:"#9ff1b4",fontFamily:"DM Mono,monospace",fontWeight:800}}>↑{tIn.toLocaleString()}</span>
              <span style={{fontSize:9,color:"#ff4d6d",fontFamily:"DM Mono,monospace",fontWeight:800}}>↓{tOut.toLocaleString()}</span>
            </div>
          </div>
          {/* Add button */}
          <div style={{display:"flex",gap:6}}>
            <button
              onClick={e=>{e.stopPropagation();if(!blocked)onClick();}}
              disabled={blocked}
              style={{flex:1,padding:"8px 0",borderRadius:8,fontSize:11,fontWeight:800,
                cursor:blocked?"not-allowed":"pointer",
                background:blocked?"rgba(255,255,255,0.03)":"rgba(40,217,122,0.12)",
                border:"1px solid "+(blocked?"rgba(255,255,255,0.06)":"rgba(40,217,122,0.3)"),
                color:blocked?"rgba(255,255,255,0.15)":"#9ff1b4",letterSpacing:"0.06em",
                transition:"all 0.15s",fontFamily:"inherit",minHeight:40}}
              onMouseEnter={e=>{if(!blocked)e.currentTarget.style.background="rgba(40,217,122,0.2)";}}
              onMouseLeave={e=>{if(!blocked)e.currentTarget.style.background="rgba(40,217,122,0.12)";}}
            >{blocked?blockReason||"BLOCKED":"+ ADD TO SQUAD"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Compare modal ──────────────────────────────────────── */
function playerPhotoUrl(player) {
  const code = player.photo_code || player.code || player.player_id || player.id;
  if (!code) return null;
  return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${code}.png`;
}
function PlayerHero({ player, side }) {
  const [photoErr, setPhotoErr] = useState(false);
  const photoUrl = playerPhotoUrl(player);
  const name = player.name || player.player || "?";
  const isLeft = side==="left";
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:isLeft?"flex-end":"flex-start",
      gap:6,flex:1,minWidth:0,padding:isLeft?"0 16px 0 0":"0 0 0 16px" }}>
      <div style={{ position:"relative",alignSelf:isLeft?"flex-end":"flex-start" }}>
        {photoUrl && !photoErr ? (
          <img src={photoUrl} alt={name} width={80} height={100} onError={()=>setPhotoErr(true)}
            style={{ objectFit:"cover",objectPosition:"top",borderRadius:10,
              border:"2px solid rgba(255,255,255,0.12)",boxShadow:"0 8px 24px rgba(0,0,0,0.6)",display:"block" }}/>
        ) : (
          <div style={{ width:80,height:100,borderRadius:10,background:"rgba(255,255,255,0.04)",
            border:"2px solid rgba(255,255,255,0.08)",display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",gap:8 }}>
            <Shirt team={player.team} size={52} isGK={player.position==="GK"}/>
          </div>
        )}
      </div>
      <div style={{ textAlign:isLeft?"right":"left" }}>
        <div style={{ fontSize:13,fontWeight:900,color:"#f0f8ff",lineHeight:1.2 }}>{name}</div>
        <div style={{ fontSize:10,color:"#3a5a7a",marginTop:2 }}>{player.team} · {player.position}</div>
        <div style={{ fontSize:11,fontWeight:800,color:"#9ff1b4",marginTop:4,
          background:"rgba(40,217,122,0.1)",borderRadius:6,padding:"2px 8px",display:"inline-block" }}>
          {Number(player.projected_points||0).toFixed(1)} pts
        </div>
      </div>
    </div>
  );
}
function CompareModal({ a, b, onClose }) {
  if (!a||!b) return null;
  const rows = [
    { label:"Proj Pts",va:Number(a.projected_points||0).toFixed(1),vb:Number(b.projected_points||0).toFixed(1),numA:Number(a.projected_points||0),numB:Number(b.projected_points||0),higherBetter:true },
    { label:"Price",va:`£${a.cost}m`,vb:`£${b.cost}m`,numA:Number(a.cost||0),numB:Number(b.cost||0),higherBetter:false },
    { label:"Form",va:Number(a.form||0).toFixed(1),vb:Number(b.form||0).toFixed(1),numA:Number(a.form||0),numB:Number(b.form||0),higherBetter:true },
    { label:"GW1",va:Number(a.pts_gw_1||0).toFixed(1),vb:Number(b.pts_gw_1||0).toFixed(1),numA:Number(a.pts_gw_1||0),numB:Number(b.pts_gw_1||0),higherBetter:true },
    { label:"GW2",va:Number(a.pts_gw_2||0).toFixed(1),vb:Number(b.pts_gw_2||0).toFixed(1),numA:Number(a.pts_gw_2||0),numB:Number(b.pts_gw_2||0),higherBetter:true },
    { label:"GW3",va:Number(a.pts_gw_3||0).toFixed(1),vb:Number(b.pts_gw_3||0).toFixed(1),numA:Number(a.pts_gw_3||0),numB:Number(b.pts_gw_3||0),higherBetter:true },
    { label:"Owned",va:`${Number(a.selected_by_pct||0).toFixed(1)}%`,vb:`${Number(b.selected_by_pct||0).toFixed(1)}%`,numA:Number(a.selected_by_pct||0),numB:Number(b.selected_by_pct||0),higherBetter:false },
    { label:"App%",va:`${Math.round((a.prob_appear||0)*100)}%`,vb:`${Math.round((b.prob_appear||0)*100)}%`,numA:a.prob_appear||0,numB:b.prob_appear||0,higherBetter:true },
  ];
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:9999,padding:16 }} onClick={onClose}>
      <div style={{ background:"#000",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,
        padding:"24px 20px 20px",width:"100%",maxWidth:520,
        boxShadow:"0 0 80px rgba(0,0,0,0.9),0 0 0 1px rgba(255,255,255,0.04)",
        maxHeight:"90vh",overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <div style={{ fontSize:12,fontWeight:900,color:"#c8d8f0",letterSpacing:"0.12em" }}>COMPARISON</div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:8,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",
            color:"#4a7a9a",fontSize:16,cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ display:"flex",alignItems:"flex-start",gap:0,marginBottom:20,
          borderBottom:"1px solid rgba(255,255,255,0.07)",paddingBottom:20 }}>
          <PlayerHero player={a} side="left"/>
          <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            gap:4,flexShrink:0,width:40,paddingTop:16 }}>
            <div style={{ width:1,height:30,background:"rgba(255,255,255,0.07)" }}/>
            <div style={{ fontSize:10,fontWeight:900,color:"#1a3a5a",letterSpacing:"0.08em" }}>VS</div>
            <div style={{ width:1,height:30,background:"rgba(255,255,255,0.07)" }}/>
          </div>
          <PlayerHero player={b} side="right"/>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:2,marginBottom:16 }}>
          {rows.map(r=>{
            const aWins=r.higherBetter?r.numA>r.numB:r.numA<r.numB;
            const bWins=r.higherBetter?r.numB>r.numA:r.numB<r.numA;
            return (
              <div key={r.label} style={{ display:"grid",gridTemplateColumns:"1fr 52px 1fr",borderRadius:7,overflow:"hidden" }}>
                <div style={{ textAlign:"right",padding:"5px 10px",fontSize:12,fontWeight:700,
                  color:aWins?"#9ff1b4":"#7a9ab8",background:aWins?"rgba(40,217,122,0.1)":"rgba(255,255,255,0.02)",borderRadius:"7px 0 0 7px" }}>{r.va}</div>
                <div style={{ textAlign:"center",fontSize:9,fontWeight:800,color:"#2a4a6a",
                  display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.3)",letterSpacing:"0.04em" }}>{r.label}</div>
                <div style={{ textAlign:"left",padding:"5px 10px",fontSize:12,fontWeight:700,
                  color:bWins?"#9ff1b4":"#7a9ab8",background:bWins?"rgba(40,217,122,0.1)":"rgba(255,255,255,0.02)",borderRadius:"0 7px 7px 0" }}>{r.vb}</div>
              </div>
            );
          })}
        </div>
        <button onClick={onClose} style={{ width:"100%",padding:"10px 0",borderRadius:10,
          fontSize:12,fontWeight:800,background:"rgba(255,255,255,0.05)",
          border:"1px solid rgba(255,255,255,0.09)",color:"#7a9ab8",cursor:"pointer",letterSpacing:"0.06em" }}>Close</button>
      </div>
    </div>
  );
}

/* ─── Formation helpers ──────────────────────────────────── */
function detectFormation(squad) {
  const filled  = STARTER_INDICES.filter(i=>squad[i]!=null).slice(0,11);
  const players = filled.map(i=>squad[i]);
  const def=players.filter(p=>p?.position==="DEF").length;
  const mid=players.filter(p=>p?.position==="MID").length;
  const fwd=players.filter(p=>p?.position==="FWD").length;
  const gk =players.filter(p=>p?.position==="GK").length;
  if (gk===1&&def+mid+fwd===10&&filled.length===11) return `${def}-${mid}-${fwd}`;
  return null;
}
function FormationCard({ squad }) {
  const formation = detectFormation(squad);
  return (
    <div style={{ padding:"7px 13px",borderRadius:10,background:"rgba(103,177,255,0.07)",
      border:`1px solid ${formation?"rgba(103,177,255,0.4)":"rgba(103,177,255,0.15)"}`,
      display:"flex",flexDirection:"column",alignItems:"center",gap:1,minWidth:72,
      transition:"border-color 0.3s ease" }}>
      <div style={{ fontSize:9,color:"#2a4a6a",fontWeight:800,letterSpacing:"0.1em" }}>FORMATION</div>
      <div style={{ fontSize:16,fontWeight:900,color:formation?"#67b1ff":"#4a7a9a",letterSpacing:"0.04em" }}>
        {formation || "—"}
      </div>
    </div>
  );
}

/* ─── Budget bar (editable) ──────────────────────────────── */
function BudgetBar({ spent,total,onEdit,editBudget,budgetInput,onBudgetChange,onBudgetCommit,onBudgetCancel }) {
  const left=total-spent, over=left<0;
  const pct=Math.min((spent/total)*100,100);
  const barColor=over?"linear-gradient(90deg,#cc2222,#ff3333)":left<3?"linear-gradient(90deg,#cc7700,#ffaa44)":"linear-gradient(90deg,#0d6e35,#28d97a)";
  return (
    <div style={{ padding:"10px 16px",background:"#000",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,marginBottom:10 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ fontSize:10,fontWeight:800,color:"#3a5a7a",letterSpacing:"0.1em" }}>BUDGET</span>
          {editBudget ? (
            <div style={{ display:"flex",alignItems:"center",gap:5 }}>
              <span style={{ fontSize:10,color:"#4a7a9a" }}>£</span>
              <input autoFocus value={budgetInput} onChange={e=>onBudgetChange(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter")onBudgetCommit(); if(e.key==="Escape")onBudgetCancel(); }}
                style={{ width:60,padding:"2px 6px",fontSize:11,fontWeight:800,
                  background:"rgba(255,255,255,0.08)",border:"1px solid rgba(59,158,255,0.5)",
                  borderRadius:5,color:"#e8f0ff",outline:"none",fontFamily:"inherit" }}/>
              <span style={{ fontSize:10,color:"#4a7a9a" }}>m</span>
              <button onClick={onBudgetCommit} style={{ background:"rgba(40,217,122,0.15)",border:"1px solid rgba(40,217,122,0.35)",borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:800,color:"#9ff1b4",cursor:"pointer" }}>OK</button>
              <button onClick={onBudgetCancel} style={{ background:"none",border:"none",color:"#4a7a9a",cursor:"pointer",fontSize:13 }}>✕</button>
            </div>
          ) : (
            <button onClick={onEdit} style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:5,padding:"1px 8px",fontSize:9,fontWeight:800,color:"#4a7a9a",cursor:"pointer",letterSpacing:"0.05em" }}>
              £{total.toFixed(1)}m ✎
            </button>
          )}
        </div>
        <span style={{ fontSize:13,fontWeight:900,color:over?"#ff5555":left<3?"#ffaa44":"#9ff1b4" }}>
          {over?"−":""}£{Math.abs(left).toFixed(1)}m {over?"OVER":"left"}
        </span>
      </div>
      <div style={{ height:5,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden" }}>
        <div style={{ height:"100%",borderRadius:999,width:`${pct}%`,background:barColor,transition:"width 0.4s cubic-bezier(0.4,0,0.2,1)" }}/>
      </div>
    </div>
  );
}

/* ─── Suggest banner ─────────────────────────────────────── */
function SuggestBanner({ s, onAccept, onDismiss }) {
  if (!s) return null;
  return (
    <div style={{ display:"flex",alignItems:"center",gap:10,padding:"9px 14px",
      background:"rgba(20,80,40,0.35)",border:"1px solid rgba(40,217,122,0.3)",
      borderRadius:10,marginBottom:10,animation:"slideDown 0.25s ease",flexWrap:"wrap" }}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
        <circle cx="8" cy="7" r="4.5" stroke="#d4a017" strokeWidth="1.4"/>
        <path d="M6.5 6c0-1 .5-1.5 1.5-1.5s1.5.6 1.5 1.3c0 .8-.7 1.2-1.5 1.5v.7" stroke="#d4a017" strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="8" cy="9.5" r=".75" fill="#d4a017"/>
      </svg>
      <div style={{ flex:1,minWidth:120 }}>
        <div style={{ fontSize:11,fontWeight:800,color:"#9ff1b4" }}>
          BEST TRANSFER: {shortName(s.outPlayer.name||s.outPlayer.player)} → {shortName(s.inPlayer.name||s.inPlayer.player)}
        </div>
        <div style={{ fontSize:10,color:"#4a9a7a" }}>+{s.gain.toFixed(1)} pts · saves £{s.saving.toFixed(1)}m</div>
      </div>
      <button onClick={onAccept} style={{ padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:800,background:"rgba(40,217,122,0.2)",border:"1px solid rgba(40,217,122,0.4)",color:"#9ff1b4",cursor:"pointer" }}>Apply</button>
      <button onClick={onDismiss} style={{ background:"none",border:"none",color:"#4a7a9a",cursor:"pointer",fontSize:14,lineHeight:1 }}>✕</button>
    </div>
  );
}

/* ─── Squad layout helpers ───────────────────────────────── */
function buildLineupRows(squad) {
  const result = { gk:[],def:[],mid:[],fwd:[],total:0 };
  STARTER_INDICES.forEach(i=>{
    const p=squad[i]; if(!p) return;
    const entry={player:p,slotIdx:i};
    if(p.position==="GK")       result.gk.push(entry);
    else if(p.position==="DEF") result.def.push(entry);
    else if(p.position==="MID") result.mid.push(entry);
    else if(p.position==="FWD") result.fwd.push(entry);
    result.total++;
  });
  return result;
}
function buildGhostSlots(squad) {
  const full = STARTER_INDICES.filter(i=>squad[i]!=null).length >= MAX_STARTERS;
  if (full) return {emptyGK:[],emptyDEF:[],emptyMID:[],emptyFWD:[]};
  const find=(indices)=>{ const e=indices.find(i=>squad[i]==null); return e!==undefined?[e]:[]; };
  return {
    emptyGK: find([0]), emptyDEF:find([1,2,3,4,5]),
    emptyMID:find([6,7,8,9,10]), emptyFWD:find([11,12,13]),
  };
}
function autoArrangeSquad(squad) {
  const filled=STARTER_INDICES.filter(i=>squad[i]!=null).slice(0,MAX_STARTERS);
  const players=filled.map(i=>squad[i]);
  const gks=players.filter(p=>p.position==="GK");
  const defs=players.filter(p=>p.position==="DEF");
  const mids=players.filter(p=>p.position==="MID");
  const fwds=players.filter(p=>p.position==="FWD");
  const next=[...squad];
  STARTER_INDICES.forEach(i=>{next[i]=null;});
  if(gks[0]) next[0]=gks[0];
  defs.forEach((p,i)=>{if(i<5)next[1+i]=p;});
  mids.forEach((p,i)=>{if(i<5)next[6+i]=p;});
  fwds.forEach((p,i)=>{if(i<3)next[11+i]=p;});
  return next;
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════ */
export default function SquadBuilderPage() {
  const isMobile = useIsMobile();

  const [allPlayers, setAllPlayers] = useState([]);
  const [squad, setSquad]           = useState(Array(18).fill(null));
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const [selectedSlot, setSelectedSlot]   = useState(null);
  const [history, setHistory]             = useState([]);
  const [posFilter, setPosFilter]         = useState("ALL");
  const [sortBy, setSortBy]               = useState("pts");
  const [searchQ, setSearchQ]             = useState("");
  const [suggestion, setSuggestion]       = useState(null);
  const [compareA, setCompareA]           = useState(null);
  const [compareB, setCompareB]           = useState(null);
  const [showCompare, setShowCompare]     = useState(false);
  const [compareMode, setCompareMode]     = useState(false);
  const [dragOverSlot, setDragOverSlot]   = useState(null);
  const [dragOverAvail, setDragOverAvail] = useState(null);
  const [dragOverPos, setDragOverPos]     = useState(null);
  const [budget, setBudget]               = useState(100.0);
  const [formationFlash, setFormationFlash] = useState(false);
  const [editBudget, setEditBudget]       = useState(false);
  const [budgetInput, setBudgetInput]     = useState("100.0");
  const [arranging, setArranging]         = useState(false);
  const [formationError, setFormationError] = useState(null); // brief validation toast
  // Mobile tab state
  const [mobileTab, setMobileTab]         = useState("pitch");

  const dragSrc      = useRef(null);
  const dragGhostRef = useRef(null);

  // Responsive card widths
  const cardW  = isMobile ? 68 : 104;
  const benchW = isMobile ? 64 : 86;

  /* ── Load players ── */
  useEffect(() => {
    getFplPredictorTable({ start_gw:29 })
      .then(data => {
        const rows = (data.rows||[]).map(r => {
          const pts=Number(r.pts_gw_1||0), form=Number(r.form||0);
          const ppg=Number(r.points_so_far||0)/Math.max(Number(r.played||1),1);
          const ict=Number(r.ict_index||0);
          const prob=Number(r.prob_appear||r.appearance_prob||0.92);
          const raw=(pts*0.40)+(form*0.35)+(ppg*0.15)+((ict/30)*0.10);
          const fg=form>=1.5?1.0:Math.max(form/1.5,0.25);
          const pp=Math.pow(Math.max(prob,0),1.4);
          return { ...r,
            name:r.name||r.player||r.web_name||r.display_name||"Unknown",
            projected_points:raw*fg*pp, appearance_prob:prob,
            fixture_difficulty:r.fixture_difficulty||3 };
        });
        setAllPlayers(rows);
        setLoading(false);
      })
      .catch(e=>{setError(e.message);setLoading(false);});
  }, []);

  /* ── Formation flash ── */
  useEffect(() => {
    const f=detectFormation(squad);
    if(f){
      setFormationFlash(true);
      const t=setTimeout(()=>setFormationFlash(false),3000);
      return ()=>clearTimeout(t);
    }
  }, [squad]);

  /* ── Derived ── */
  const spent    = squad.reduce((s,p)=>s+Number(p?.cost||0),0);
  const squadIds = new Set(squad.filter(Boolean).map(p=>p.player_id));
  const teamCounts = squad.reduce((acc,p)=>{ if(p)acc[p.team]=(acc[p.team]||0)+1; return acc; },{});
  const filledStarters = STARTER_INDICES.filter(i=>squad[i]!=null);
  const activeStarters = filledStarters.slice(0,MAX_STARTERS);
  const totalPts   = activeStarters.reduce((s,i)=>s+Number(squad[i]?.projected_points||0),0);
  const activeCount= activeStarters.length;

  function isSlotInactive(idx) {
    if(BENCH_INDICES.includes(idx)) return false;
    if(squad[idx]!=null) return false;
    return filledStarters.length>=MAX_STARTERS;
  }
  function canTransfer(outIdx, inPlayer) {
    const outP=squad[outIdx], outPos=SLOT_POSITION[outIdx];
    if(inPlayer.position!==outPos) return {ok:false,reason:`Need ${outPos}`};
    if(isSlotInactive(outIdx)) return {ok:false,reason:"11-player limit reached"};
    const outCost=Number(outP?.cost||0), inCost=Number(inPlayer.cost||0);
    if(spent-outCost+inCost>budget) return {ok:false,reason:"over budget"};
    const teamCnt=(teamCounts[inPlayer.team]||0)-(inPlayer.team===outP?.team?1:0);
    if(teamCnt>=MAX_SAME_TEAM) return {ok:false,reason:"team limit (3 max)"};
    return {ok:true};
  }

  /* ── FPL formation validation ──────────────────────────────────────────
     Called when 11th starter is placed. Checks official FPL constraints:
     Exactly 1 GK · 3-5 DEF · 3-5 MID · 1-3 FWD                        */
  function validateFormation(nextSquad) {
    const starters = STARTER_INDICES
      .map(i => nextSquad[i])
      .filter(Boolean)
      .slice(0, 11);
    const gk  = starters.filter(p => p.position === "GK").length;
    const def = starters.filter(p => p.position === "DEF").length;
    const mid = starters.filter(p => p.position === "MID").length;
    const fwd = starters.filter(p => p.position === "FWD").length;
    if (gk  !== 1)        return false;
    if (def < 3 || def > 5) return false;
    if (mid < 3 || mid > 5) return false;
    if (fwd < 1 || fwd > 3) return false;
    return true;
  }

  const availablePlayers = allPlayers.filter(p=>{
    if(squadIds.has(p.player_id)) return false;
    if(posFilter!=="ALL"&&p.position!==posFilter) return false;
    if(searchQ&&!(p.name||'').toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  }).sort((a,b)=>{
    if(sortBy==="pts")  return b.projected_points-a.projected_points;
    if(sortBy==="cost") return Number(b.cost)-Number(a.cost);
    if(sortBy==="form") return Number(b.form||0)-Number(a.form||0);
    if(sortBy==="ict")  return Number(b.ict_index||0)-Number(a.ict_index||0);
    return 0;
  });

  const doTransfer = useCallback((toSlotIdx, inPlayer) => {
    const{ok}=canTransfer(toSlotIdx,inPlayer);
    if(!ok) return false;

    let next=[...squad];
    next[toSlotIdx]=inPlayer;

    // Count filled starters in the simulated squad
    const filledCount = STARTER_INDICES.filter(i=>next[i]!=null).length;

    // GK protection: if placing the 10th starter and no GK yet, only allow GK
    if(filledCount === MAX_STARTERS) {
      const starterPlayers = STARTER_INDICES.map(i=>next[i]).filter(Boolean).slice(0,MAX_STARTERS);
      const hasGK = starterPlayers.some(p=>p.position==="GK");
      if(!hasGK) {
        setFormationError("You must include a Goalkeeper in your starting XI.");
        setTimeout(()=>setFormationError(null), 3500);
        return false;
      }
      // Full formation validation
      if(!validateFormation(next)) {
        setFormationError("Invalid formation — must have 1 GK · 3–5 DEF · 3–5 MID · 1–3 FWD");
        setTimeout(()=>setFormationError(null), 3500);
        return false;
      }
    }

    setHistory(h=>[...h,{squad:[...squad]}]);
    if(filledCount===MAX_STARTERS){
      setArranging(true);
      const arranged=autoArrangeSquad(next);
      setTimeout(()=>{setSquad(arranged);setArranging(false);},280);
    } else setSquad(next);
    setSelectedSlot(null);
    setSuggestion(null);
    if(isMobile) setMobileTab("pitch"); // auto-switch after adding
    return true;
  },[squad,spent,teamCounts,budget,isMobile]);

  const doSwap = useCallback((idxA,idxB)=>{
    if(idxA===idxB) return;
    if(SLOT_POSITION[idxA]!==SLOT_POSITION[idxB]) return;
    setHistory(h=>[...h,{squad:[...squad]}]);
    const next=[...squad];
    [next[idxA],next[idxB]]=[next[idxB],next[idxA]];
    setSquad(next);
    setSelectedSlot(null);
  },[squad]);

  const undo=useCallback(()=>{
    if(!history.length) return;
    setSquad(history[history.length-1].squad);
    setHistory(h=>h.slice(0,-1));
    setSelectedSlot(null);
  },[history]);

  const autoSuggest=useCallback(()=>{
    let best=null;
    squad.forEach((outP,idx)=>{
      if(!outP) return;
      const candidates=availablePlayers.filter(p=>{
        if(p.position!==SLOT_POSITION[idx]) return false;
        const{ok}=canTransfer(idx,p);
        return ok;
      });
      if(!candidates.length) return;
      const top=candidates[0];
      const gain=top.projected_points-outP.projected_points;
      const sav=Number(outP.cost||0)-Number(top.cost||0);
      if(gain>0&&(!best||gain>best.gain)) best={slotIdx:idx,outPlayer:outP,inPlayer:top,gain,saving:sav};
    });
    setSuggestion(best||{none:true});
    if(best) setSelectedSlot(best.slotIdx);
  },[squad,availablePlayers]);

  const handleSlotClick=useCallback((idx)=>{
    if(compareMode){
      const p=squad[idx]; if(!p) return;
      if(!compareA){setCompareA(p);return;}
      if(p.player_id!==compareA.player_id){setCompareB(p);setShowCompare(true);return;}
      setCompareA(null);setCompareB(null);return;
    }
    if(selectedSlot===idx){setSelectedSlot(null);return;}
    if(selectedSlot!==null&&SLOT_POSITION[selectedSlot]===SLOT_POSITION[idx]){doSwap(selectedSlot,idx);return;}
    setSelectedSlot(idx);
    if(isMobile) setMobileTab("players"); // auto-switch to pick replacement
  },[compareMode,selectedSlot,squad,compareA,doSwap,isMobile]);

  const handleAvailClick=useCallback((player)=>{
    if(compareMode){
      if(!compareA){setCompareA(player);return;}
      if(player.player_id!==compareA.player_id){setCompareB(player);setShowCompare(true);return;}
      setCompareA(null);setCompareB(null);return;
    }
    if(selectedSlot!==null){doTransfer(selectedSlot,player);return;}
    const posSlotMap={GK:[0],DEF:[1,2,3,4,5],MID:[6,7,8,9,10],FWD:[11,12,13]};
    const slots=posSlotMap[player.position]||[];
    const targetSlot=slots.find(i=>!squad[i]&&!isSlotInactive(i));
    if(targetSlot!=null) doTransfer(targetSlot,player);
  },[compareMode,selectedSlot,compareA,doTransfer,squad]);

  const onSlotDragStart=(idx)=>{dragSrc.current={type:"slot",idx};};
  const onAvailDragStart=(player,e)=>{
    dragSrc.current={type:"avail",player};
    setDragOverPos(player.position);
    if(dragGhostRef.current&&e){
      const ghost=dragGhostRef.current;
      ghost.style.display="flex";
      const nameEl=ghost.querySelector(".dg-name");
      const ptsEl=ghost.querySelector(".dg-pts");
      if(nameEl) nameEl.textContent=shortName(player.name||player.player||"");
      if(ptsEl)  ptsEl.textContent=Number(player.projected_points||0).toFixed(1);
      e.dataTransfer.setDragImage(ghost,50,30);
      setTimeout(()=>{ghost.style.display="none";},0);
    }
  };
  const onSlotDrop=useCallback((dropIdx)=>{
    setDragOverSlot(null);setDragOverPos(null);
    const src=dragSrc.current; if(!src) return;
    if(src.type==="slot") doSwap(src.idx,dropIdx);
    else if(src.type==="avail") doTransfer(dropIdx,src.player);
    dragSrc.current=null;
  },[doSwap,doTransfer]);
  const onAvailDrop=useCallback((targetPlayer)=>{
    setDragOverAvail(null);setDragOverPos(null);
    const src=dragSrc.current;
    if(!src||src.type!=="slot") return;
    doTransfer(src.idx,targetPlayer);
    dragSrc.current=null;
  },[doTransfer]);
  const onDragEnd=useCallback(()=>{
    dragSrc.current=null;
    setDragOverSlot(null);setDragOverPos(null);setDragOverAvail(null);
  },[]);

  function availBlocked(p){
    if(selectedSlot===null) return {blocked:false};
    const{ok,reason}=canTransfer(selectedSlot,p);
    if(!ok) return {blocked:true,reason};
    return {blocked:false};
  }

  /* ── Pitch renderer ── */
  function renderPitch() {
    const rows   = buildLineupRows(squad);
    const ghosts = buildGhostSlots(squad);
    const full   = rows.total >= 11;

    function PitchRow({ filled, emptySlots, padTop="14px" }) {
      const total = filled.length + emptySlots.length;
      const gap   = total >= 5 ? (isMobile ? 3 : 6) : (isMobile ? 5 : 10);
      return (
        <div style={{ display:"flex",justifyContent:"center",alignItems:"flex-start",
          gap, padding:`${padTop} 4px 0`, position:"relative", zIndex:2 }}>
          {filled.map(({player,slotIdx:idx})=>(
            <PitchSlot key={idx} idx={idx} player={player}
              isSelected={selectedSlot===idx} isDragOver={dragOverSlot===idx}
              isBench={false} isInactive={false} cardW={cardW}
              onClick={()=>handleSlotClick(idx)}
              onDragStart={()=>onSlotDragStart(idx)}
              onDragEnter={()=>setDragOverSlot(idx)}
              onDragLeave={()=>setDragOverSlot(null)}
              onDrop={()=>onSlotDrop(idx)}/>
          ))}
          {emptySlots.map(idx=>(
            <PitchSlot key={idx} idx={idx} player={null}
              isSelected={selectedSlot===idx} isDragOver={dragOverSlot===idx}
              isBench={false} isInactive={isSlotInactive(idx)} cardW={cardW}
              onClick={()=>handleSlotClick(idx)}
              onDragStart={()=>onSlotDragStart(idx)}
              onDragEnter={()=>setDragOverSlot(idx)}
              onDragLeave={()=>setDragOverSlot(null)}
              onDrop={()=>onSlotDrop(idx)}/>
          ))}
        </div>
      );
    }

    return (
      <div style={{
        position:"relative",
        background:"linear-gradient(180deg,#08351a 0%,#0b4a24 18%,#0d5c2c 50%,#0b4a24 82%,#08351a 100%)",
        borderRadius:14, border:"1px solid rgba(255,255,255,0.06)",
        boxShadow:"0 12px 50px rgba(0,0,0,0.6)", overflow:"hidden",
        paddingBottom:14, transition:"opacity 0.28s ease", opacity:arranging?0.4:1,
      }}
      onDragOver={e=>e.preventDefault()}
      onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragOverPos(null);}}>

        {/* SVG pitch markings */}
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",opacity:0.18}}
          preserveAspectRatio="none" viewBox="0 0 400 560">
          <rect x="20" y="12" width="360" height="536" rx="3" fill="none" stroke="white" strokeWidth="1.5"/>
          <line x1="20" y1="280" x2="380" y2="280" stroke="white" strokeWidth="1.5"/>
          <circle cx="200" cy="280" r="50" fill="none" stroke="white" strokeWidth="1.5"/>
          <circle cx="200" cy="280" r="3" fill="white"/>
          <rect x="100" y="12" width="200" height="70" fill="none" stroke="white" strokeWidth="1.5"/>
          <rect x="140" y="12" width="120" height="30" fill="none" stroke="white" strokeWidth="1.5"/>
          <rect x="100" y="478" width="200" height="70" fill="none" stroke="white" strokeWidth="1.5"/>
          <rect x="140" y="518" width="120" height="30" fill="none" stroke="white" strokeWidth="1.5"/>
          <circle cx="200" cy="95" r="3" fill="white"/><circle cx="200" cy="465" r="3" fill="white"/>
          <path d="M20,12 Q32,12 32,24" fill="none" stroke="white" strokeWidth="1.5"/>
          <path d="M380,12 Q368,12 368,24" fill="none" stroke="white" strokeWidth="1.5"/>
          <path d="M20,548 Q32,548 32,536" fill="none" stroke="white" strokeWidth="1.5"/>
          <path d="M380,548 Q368,548 368,536" fill="none" stroke="white" strokeWidth="1.5"/>
        </svg>

        {/* Position zone highlight */}
        {dragOverPos && (
          <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none",display:"flex",flexDirection:"column"}}>
            {["FWD","MID","DEF","GK"].map(pos=>(
              <div key={pos} style={{
                flex:1,background:dragOverPos===pos?"rgba(40,217,122,0.08)":"transparent",
                borderBottom:dragOverPos===pos?"1px solid rgba(40,217,122,0.15)":"none",
                transition:"background 0.2s ease",display:"flex",alignItems:"center",justifyContent:"center",
              }}>
                {dragOverPos===pos&&<div style={{fontSize:11,fontWeight:800,color:"rgba(40,217,122,0.4)",letterSpacing:"0.1em",pointerEvents:"none"}}>{pos} ZONE ↓</div>}
              </div>
            ))}
          </div>
        )}

        {/* Top goalpost */}
        <div style={{display:"flex",justifyContent:"center",paddingTop:6,marginBottom:2,position:"relative",zIndex:2}}>
          <svg width={isMobile?90:120} height="22" viewBox="0 0 120 22" style={{opacity:0.7}}>
            <line x1="10" y1="2" x2="110" y2="2" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            <line x1="10" y1="2" x2="10" y2="22" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            <line x1="110" y1="2" x2="110" y2="22" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>

        <PitchRow filled={rows.fwd} emptySlots={ghosts.emptyFWD} padTop="6px"/>
        <PitchRow filled={rows.mid} emptySlots={ghosts.emptyMID}/>
        <PitchRow filled={rows.def} emptySlots={ghosts.emptyDEF}/>
        <PitchRow filled={rows.gk}  emptySlots={ghosts.emptyGK}  padTop="14px"/>

        {/* Large drop zones when dragging from avail list */}
        {!full && dragSrc.current?.type==="avail" && (
          <div style={{position:"absolute",inset:0,zIndex:1,pointerEvents:"none",display:"flex",flexDirection:"column"}}>
            {["FWD","MID","DEF","GK"].map(pos=>(
              <div key={pos} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"all"}}
                onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect="move";}}
                onDrop={e=>{
                  e.preventDefault();
                  const slotMap={FWD:[11,12,13],MID:[6,7,8,9,10],DEF:[1,2,3,4,5],GK:[0]};
                  const src=dragSrc.current;
                  if(!src||src.type!=="avail") return;
                  const p=src.player;
                  if(p.position!==pos) return;
                  const emptySlot=slotMap[pos].find(i=>!squad[i]&&!isSlotInactive(i));
                  if(emptySlot==null) return;
                  doTransfer(emptySlot,p);
                  dragSrc.current=null;
                }}/>
            ))}
          </div>
        )}

        {/* Bottom goalpost */}
        <div style={{display:"flex",justifyContent:"center",padding:"14px 0 8px",position:"relative",zIndex:2}}>
          <svg width={isMobile?90:120} height="22" viewBox="0 0 120 22" style={{opacity:0.7}}>
            <line x1="10" y1="20" x2="110" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            <line x1="10" y1="0" x2="10" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            <line x1="110" y1="0" x2="110" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    );
  }

  /* ── Bench renderer ── */
  function renderBench() {
    return (
      <div className="sb-bench-tray" onDragOver={e=>e.preventDefault()}>
        <div className="sb-bench-tray-label">Bench</div>
        <div className="sb-bench-tray-cards">
          {[14,15,16,17].map(idx=>(
            <PitchSlot key={idx} idx={idx} player={squad[idx]}
              isSelected={selectedSlot===idx} isDragOver={dragOverSlot===idx}
              isBench={true} cardW={benchW}
              onClick={()=>handleSlotClick(idx)}
              onDragStart={()=>onSlotDragStart(idx)}
              onDragEnter={()=>setDragOverSlot(idx)}
              onDragLeave={()=>setDragOverSlot(null)}
              onDrop={()=>onSlotDrop(idx)}/>
          ))}
        </div>
      </div>
    );
  }

  /* ── Available players panel ── */
  function renderAvailPanel() {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:6,minHeight:0}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}>
          <div style={{fontSize:10,fontWeight:900,color:"#4a7a9a",letterSpacing:"0.12em",paddingTop:2}}>
            AVAILABLE PLAYERS
            {selectedSlot!==null&&squad[selectedSlot]&&(
              <span style={{marginLeft:6,color:"#3b9eff",fontWeight:900}}>
                — replacing {squad[selectedSlot]?.name||SLOT_POSITION[selectedSlot]}
              </span>
            )}
          </div>
          <div style={{fontSize:10,color:"#4a7a9a",fontFamily:"DM Mono,monospace"}}>{availablePlayers.length} players</div>
        </div>

        {/* Mobile: selected slot banner */}
        {isMobile && selectedSlot!==null && (
          <div style={{padding:"8px 12px",borderRadius:9,
            background:"linear-gradient(90deg,rgba(59,158,255,0.12),rgba(59,158,255,0.04))",
            border:"1px solid rgba(59,158,255,0.3)",
            fontSize:11,fontWeight:800,color:"#67b1ff",
            display:"flex",alignItems:"center",justifyContent:"space-between",animation:"pulseBlue 2s ease infinite"}}>
            <span>Replacing: <span style={{color:"#e8f0ff"}}>{squad[selectedSlot]?.name||`${SLOT_POSITION[selectedSlot]} slot`}</span></span>
            <button onClick={()=>setSelectedSlot(null)} style={{background:"none",border:"none",color:"#4a7a9a",cursor:"pointer",fontSize:14,padding:"0 0 0 8px"}}>✕</button>
          </div>
        )}

        {/* Position pills */}
        <div style={{display:"flex",gap:4,overflowX:"auto",WebkitOverflowScrolling:"touch",scrollbarWidth:"none",paddingBottom:2}}>
          {["ALL","GK","DEF","MID","FWD"].map(p=>{
            const active=posFilter===p;
            const posColor={GK:"#ffc107",DEF:"#4f9eff",MID:"#9ff1b4",FWD:"#ff6b35",ALL:"#4f9eff"}[p];
            return (
              <button key={p} onClick={()=>setPosFilter(p)} style={{
                flex:1,flexShrink:0,padding:isMobile?"8px 10px":"6px 4px",borderRadius:8,
                fontSize:10,fontWeight:900,cursor:"pointer",
                background:active?posColor+"20":"rgba(255,255,255,0.03)",
                border:`1.5px solid ${active?posColor+"60":"rgba(255,255,255,0.06)"}`,
                color:active?posColor:"#5a8aaa",transition:"all 0.14s ease",
                fontFamily:"inherit",minHeight:36,
              }}>{p}</button>
            );
          })}
        </div>

        {/* Search + sort */}
        <div style={{display:"flex",gap:6}}>
          <div style={{position:"relative",flex:1}}>
            <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:12,opacity:0.3,pointerEvents:"none"}}>🔍</span>
            <input value={searchQ} onChange={e=>setSearchQ(e.target.value)}
              placeholder="Search player…"
              style={{width:"100%",padding:"8px 10px 8px 28px",borderRadius:9,fontSize:isMobile?16:11,
                background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",
                color:"#e8f0ff",outline:"none",boxSizing:"border-box",minHeight:40}}
              onFocus={e=>{e.currentTarget.style.borderColor="rgba(59,158,255,0.4)";}}
              onBlur={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";}}/>
          </div>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{
            padding:"8px",borderRadius:9,fontSize:11,
            background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",
            color:"#c8d8f0",outline:"none",cursor:"pointer",flexShrink:0,minHeight:40,
          }}>
            <option value="pts">↑ Pts</option>
            <option value="cost">↑ £</option>
            <option value="form">↑ Form</option>
            <option value="ict">↑ ICT</option>
          </select>
        </div>

        {/* Legend — desktop only */}
        {!isMobile && (
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <div style={{flex:1,fontSize:9.5,color:"#4a6a8a",padding:"5px 10px",
              background:"rgba(255,255,255,0.02)",borderRadius:7,
              border:"1px dashed rgba(255,255,255,0.05)",minWidth:0}}>
              Click to auto-place · Drag to pitch · ▼ for stats
            </div>
            <div style={{display:"flex",gap:8,flexShrink:0}}>
              {[["#28d97a","Available"],["#ffaa44","Doubtful"],["#ff4d6d","Injured"]].map(([c,l])=>(
                <span key={l} style={{display:"flex",alignItems:"center",gap:3,fontSize:8.5,color:"#4a6a8a"}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:c,flexShrink:0}}/>{l}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Player list */}
        <div className="avail-scroll" style={{
          overflowY:"auto",
          maxHeight:isMobile?"none":"calc(100vh - 320px)",
          display:"flex",flexDirection:"column",gap:3,
          paddingBottom:isMobile?4:0,
        }}>
          {availablePlayers.slice(0,80).map(p=>{
            const{blocked,reason}=availBlocked(p);
            return (
              <AvailRow key={p.player_id} player={p}
                isHighlighted={compareMode&&(compareA?.player_id===p.player_id||compareB?.player_id===p.player_id)}
                blocked={blocked} blockReason={reason}
                isDragOver={dragOverAvail===p.player_id}
                isMobile={isMobile}
                onClick={()=>handleAvailClick(p)}
                onDragStart={e=>onAvailDragStart(p,e)}
                onDragEnd={onDragEnd}
                onDragEnter={()=>setDragOverAvail(p.player_id)}
                onDragLeave={()=>setDragOverAvail(null)}
                onDrop={()=>onAvailDrop(p)}/>
            );
          })}
          {availablePlayers.length===0&&(
            <div style={{textAlign:"center",padding:36,color:"#2a4a6a",fontSize:12}}>No players match these filters</div>
          )}
        </div>
      </div>
    );
  }

  /* ── Loading / error ── */
  if(loading) return (
    <div style={{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:36,height:36,borderRadius:"50%",border:"3px solid rgba(103,177,255,0.12)",borderTopColor:"#4f9eff",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/>
        <div style={{fontSize:13,color:"#4a7a9a",fontWeight:700,marginTop:14}}>Loading players…</div>
      </div>
    </div>
  );
  if(error) return (
    <div style={{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"#ff6666",fontSize:13,maxWidth:400,textAlign:"center"}}>
        Error: {error}<br/><span style={{fontSize:11,color:"#4a7a9a"}}>Is the backend running?</span>
      </div>
    </div>
  );

  /* ════════════════ RENDER ════════════════ */
  return (
    <div style={{
      minHeight:"100vh",
      padding: isMobile ? "12px 10px 90px" : "16px 16px 48px",
      fontFamily:"'DM Mono',monospace", background:"#000",
    }}>
      <style>{`
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes expandIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulseBlue{0%,100%{box-shadow:0 0 0 rgba(59,158,255,0)}50%{box-shadow:0 0 14px rgba(59,158,255,0.4)}}
        .avail-scroll::-webkit-scrollbar{width:4px}
        .avail-scroll::-webkit-scrollbar-track{background:rgba(255,255,255,0.02);border-radius:4px}
        .avail-scroll::-webkit-scrollbar-thumb{background:rgba(103,177,255,0.18);border-radius:4px}
        .sb-bench-tray{margin-top:12px;padding:12px 10px;background:rgba(255,255,255,0.02);border-radius:14px;border:1px solid rgba(255,255,255,0.06)}
        .sb-bench-tray-label{font-size:9px;font-weight:800;color:#3a5a7a;letter-spacing:0.1em;margin-bottom:10px;font-family:'DM Mono',monospace}
        .sb-bench-tray-cards{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
        .sb-btn{padding:8px 14px;border-radius:10px;font-size:11px;font-weight:800;border:1px solid rgba(255,255,255,0.1);cursor:pointer;font-family:inherit;letter-spacing:0.04em;transition:all 0.18s cubic-bezier(0.22,1,0.36,1);display:flex;align-items:center;gap:6px;position:relative;overflow:hidden}
        .sb-btn:hover{transform:translateY(-1px)}
        .sb-btn:active{transform:translateY(0) scale(0.97)}
        .sb-btn:disabled{opacity:0.3;cursor:not-allowed;pointer-events:none}
        .sb-btn-undo{background:rgba(255,255,255,0.04);color:#7a9ab8}
        .sb-btn-undo:hover{border-color:rgba(255,255,255,0.22);color:#c8d8f0;box-shadow:0 4px 14px rgba(0,0,0,0.3)}
        .sb-btn-suggest{background:rgba(255,184,0,0.07);border-color:rgba(255,184,0,0.2);color:#d4a017}
        .sb-btn-suggest:hover{background:rgba(255,184,0,0.14);border-color:rgba(255,184,0,0.4);color:#ffcc44;box-shadow:0 4px 14px rgba(255,184,0,0.15)}
        .sb-btn-compare{color:#67b1ff}
        .sb-btn-compare-off{background:rgba(103,177,255,0.06);border-color:rgba(103,177,255,0.18)}
        .sb-btn-compare-off:hover{background:rgba(103,177,255,0.14);border-color:rgba(103,177,255,0.4);box-shadow:0 4px 14px rgba(103,177,255,0.15)}
        .sb-btn-compare-on{background:rgba(103,177,255,0.18);border-color:rgba(103,177,255,0.5);box-shadow:0 0 14px rgba(103,177,255,0.2)}
        .sb-btn-compare-on:hover{background:rgba(103,177,255,0.26);box-shadow:0 4px 18px rgba(103,177,255,0.3)}
        .sb-btn-icon{width:16px;height:16px;opacity:0.7;flex-shrink:0}
      `}</style>

      {showCompare && <CompareModal a={compareA} b={compareB}
        onClose={()=>{setShowCompare(false);setCompareMode(false);setCompareA(null);setCompareB(null);}}/>}

      {/* Hidden drag ghost */}
      <div ref={dragGhostRef} style={{
        position:"fixed",top:-9999,left:-9999,width:100,height:130,
        background:"linear-gradient(160deg,#0c1a2a,#060e18)",
        border:"1.5px solid rgba(59,158,255,0.5)",borderRadius:12,padding:"10px 8px 8px",
        display:"none",flexDirection:"column",alignItems:"center",gap:5,
        boxShadow:"0 8px 32px rgba(0,0,0,0.8),0 0 20px rgba(59,158,255,0.3)",
        pointerEvents:"none",zIndex:9999,
      }}>
        <div style={{width:44,height:44,borderRadius:8,background:"rgba(59,158,255,0.15)",
          border:"1px solid rgba(59,158,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👕</div>
        <div className="dg-name" style={{fontSize:10,fontWeight:900,color:"#e8f0ff",textAlign:"center",width:"100%",
          background:"rgba(0,0,0,0.5)",padding:"1px 4px",borderRadius:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}></div>
        <div className="dg-pts" style={{fontSize:13,fontWeight:900,color:"#9ff1b4"}}></div>
        <div style={{fontSize:8,color:"rgba(59,158,255,0.5)"}}>drag to pitch</div>
      </div>

      {/* ── Page header ── */}
      <div style={{maxWidth:1320,margin:`0 auto ${isMobile?"10px":"14px"}`}}>
        <div style={{display:"flex",alignItems:isMobile?"center":"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontSize:10,fontWeight:800,color:"#3b9eff",letterSpacing:"0.15em",marginBottom:3}}>FPL TRANSFER MARKET</div>
            <h1 style={{margin:0,fontSize:isMobile?18:20,fontWeight:900,color:"#e8f0ff"}}>Squad Builder</h1>
          </div>
          <div style={{display:"flex",gap:isMobile?5:8,flexWrap:"wrap",alignItems:"center"}}>
            {/* Proj pts */}
            <div style={{padding:isMobile?"6px 10px":"8px 14px",borderRadius:10,
              background:"rgba(40,217,122,0.08)",border:"1px solid rgba(40,217,122,0.18)",
              display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
              <div style={{fontSize:9,color:"#2a8a5a",fontWeight:800,letterSpacing:"0.1em"}}>PROJ PTS</div>
              <div style={{fontSize:isMobile?15:17,fontWeight:900,color:"#9ff1b4",lineHeight:1}}>{totalPts.toFixed(1)}</div>
            </div>
            <FormationCard squad={squad}/>
            {/* Undo */}
            <button className="sb-btn sb-btn-undo" onClick={undo} disabled={!history.length}>
              <svg className="sb-btn-icon" viewBox="0 0 16 16" fill="none">
                <path d="M3 8a5 5 0 105-5H4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M7 3L4.5 5.5 7 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {isMobile ? `↩${history.length||""}` : `Undo${history.length?` (${history.length})`:""}`}
            </button>
            {/* Suggest */}
            <button className="sb-btn sb-btn-suggest" onClick={autoSuggest}>
              <svg className="sb-btn-icon" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M6.5 6C6.5 5 7 4.5 8 4.5s1.5.6 1.5 1.3c0 .8-.7 1.2-1.5 1.5v.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <circle cx="8" cy="9.5" r=".75" fill="currentColor"/>
                <path d="M8 12v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {isMobile ? "?" : "Suggest"}
            </button>
            {/* Compare */}
            <button className={`sb-btn sb-btn-compare ${compareMode?"sb-btn-compare-on":"sb-btn-compare-off"}`}
              onClick={()=>{setCompareMode(m=>!m);setCompareA(null);setCompareB(null);setShowCompare(false);}}>
              <svg className="sb-btn-icon" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="3" width="5" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <rect x="10" y="3" width="5" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M6.5 8h3M8 6.5L9.5 8 8 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {isMobile
                ? (compareMode?(compareA?"2nd":"1st"):"Cmp")
                : (compareMode?(compareA?"Pick 2nd":"Pick 1st"):"Compare")}
            </button>
          </div>
        </div>
      </div>

      {/* ── Shared content ── */}
      <div style={{maxWidth:1320,margin:"0 auto"}}>
        <BudgetBar spent={spent} total={budget}
          onEdit={()=>{setBudgetInput(budget.toFixed(1));setEditBudget(true);}}
          editBudget={editBudget} budgetInput={budgetInput}
          onBudgetChange={setBudgetInput}
          onBudgetCommit={()=>{const v=parseFloat(budgetInput);if(!isNaN(v)&&v>0)setBudget(v);setEditBudget(false);}}
          onBudgetCancel={()=>setEditBudget(false)}/>

        {suggestion&&!suggestion.none&&(
          <SuggestBanner s={suggestion}
            onAccept={()=>{doTransfer(suggestion.slotIdx,suggestion.inPlayer);setSuggestion(null);}}
            onDismiss={()=>setSuggestion(null)}/>
        )}
        {suggestion?.none&&(
          <div style={{fontSize:11,color:"#4a7a9a",padding:"8px 14px",background:"rgba(255,255,255,0.03)",borderRadius:8,marginBottom:10}}>
            Squad optimised — no better transfers found.
          </div>
        )}

        {/* Desktop: selected slot banner */}
        {!isMobile && selectedSlot!==null && (
          <div style={{padding:"8px 14px",borderRadius:10,marginBottom:10,
            background:"linear-gradient(90deg,rgba(59,158,255,0.1),rgba(59,158,255,0.04))",
            border:"1px solid rgba(59,158,255,0.3)",
            fontSize:11,fontWeight:800,color:"#67b1ff",animation:"pulseBlue 2s ease infinite"}}>
            Replacing: <span style={{color:"#e8f0ff"}}>{squad[selectedSlot]?.name||`Empty ${SLOT_POSITION[selectedSlot]} slot`}</span>
            <span style={{color:"#3a5a7a",fontWeight:600}}> — click a player on the right to bring in</span>
            <button onClick={()=>setSelectedSlot(null)} style={{marginLeft:10,background:"none",border:"none",color:"#4a7a9a",cursor:"pointer",fontSize:13,lineHeight:1}}>✕</button>
          </div>
        )}

        {/* Formation flash */}
        {formationFlash&&(()=>{
          const f=detectFormation(squad); if(!f) return null;
          const [def,mid,fwd]=f.split("-");
          return (
            <div style={{padding:"10px 16px",borderRadius:12,marginBottom:8,
              background:"linear-gradient(90deg,rgba(40,217,122,0.15),rgba(40,217,122,0.05))",
              border:"1px solid rgba(40,217,122,0.4)",display:"flex",alignItems:"center",gap:10,
              animation:"slideDown 0.3s ease"}}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="8" stroke="#28d97a" strokeWidth="1.5"/>
                <path d="M5.5 9L8 11.5L12.5 7" stroke="#28d97a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div>
                <div style={{fontSize:11,fontWeight:900,color:"#9ff1b4"}}>XI complete — {def}-{mid}-{fwd} auto-arranged</div>
                <div style={{fontSize:9,color:"#3a8a5a",fontWeight:700}}>Players grouped into formation rows automatically</div>
              </div>
            </div>
          );
        })()}

        {arranging&&(
          <div style={{padding:"8px 14px",marginBottom:6,borderRadius:10,background:"rgba(40,217,122,0.12)",
            border:"1px solid rgba(40,217,122,0.35)",fontSize:11,fontWeight:800,color:"#9ff1b4",
            animation:"slideDown 0.2s ease",textAlign:"center"}}>
            Auto-arranging into formation…
          </div>
        )}

        {/* Formation validation error toast */}
        {formationError && (
          <div style={{padding:"10px 16px",borderRadius:10,marginBottom:8,
            background:"rgba(255,77,109,0.12)",border:"1px solid rgba(255,77,109,0.4)",
            display:"flex",alignItems:"center",gap:10,animation:"slideDown 0.25s ease"}}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}>
              <circle cx="8" cy="8" r="7" stroke="#ff4d6d" strokeWidth="1.4"/>
              <path d="M8 4.5v4M8 10.5v1" stroke="#ff4d6d" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div>
              <div style={{fontSize:11,fontWeight:800,color:"#ff6b8a"}}>Invalid Formation</div>
              <div style={{fontSize:10,color:"#c04060",marginTop:1}}>{formationError}</div>
            </div>
          </div>
        )}

        {/* ── MOBILE: tab switcher ── */}
        {isMobile && (
          <div style={{display:"flex",gap:3,marginBottom:10,background:"rgba(255,255,255,0.03)",
            borderRadius:10,padding:3,border:"1px solid rgba(255,255,255,0.07)"}}>
            {[["pitch","Pitch"],["players","Players"]].map(([tab,label])=>(
              <button key={tab} onClick={()=>setMobileTab(tab)} style={{
                flex:1,padding:"9px 0",borderRadius:8,fontSize:12,fontWeight:800,
                border:"none",cursor:"pointer",fontFamily:"inherit",
                background:mobileTab===tab?"rgba(103,177,255,0.18)":"transparent",
                color:mobileTab===tab?"#67b1ff":"#4a7a9a",position:"relative",
              }}>
                {label}
                {tab==="players"&&selectedSlot!==null&&(
                  <span style={{position:"absolute",top:6,right:10,width:7,height:7,borderRadius:"50%",background:"#3b9eff"}}/>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Player counter */}
        <div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",marginBottom:6,gap:8}}>
          {activeCount>=11&&(()=>{const f=detectFormation(squad);if(!f)return null;
            return <div style={{fontSize:11,fontWeight:900,color:"#67b1ff",letterSpacing:"0.04em"}}>{f}</div>;
          })()}
          <div style={{fontSize:10,fontWeight:900,letterSpacing:"0.08em",padding:"3px 10px",
            color:activeCount>=11?"#9ff1b4":"#4a7a9a",
            background:activeCount>=11?"rgba(40,217,122,0.1)":"rgba(255,255,255,0.04)",
            border:`1px solid ${activeCount>=11?"rgba(40,217,122,0.3)":"rgba(255,255,255,0.07)"}`,
            borderRadius:999}}>{activeCount}/11 on pitch</div>
        </div>

        {/* ── MOBILE layout ── */}
        {isMobile ? (
          <>
            {mobileTab==="pitch" && (
              <>
                {renderPitch()}
                {renderBench()}
              </>
            )}
            {mobileTab==="players" && renderAvailPanel()}
          </>
        ) : (
          /* ── DESKTOP: side by side grid ── */
          <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:16}}>
            <div>
              {renderPitch()}
              {renderBench()}
            </div>
            <div>{renderAvailPanel()}</div>
          </div>
        )}
      </div>
    </div>
  );
}