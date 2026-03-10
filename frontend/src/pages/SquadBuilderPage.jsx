// pages/SquadBuilderPage.jsx  — FPL Transfer Market v2
// Fixes: player names visible, GK bottom → ATT top, goalposts, drag anywhere

import { useState, useEffect, useRef, useCallback } from "react";
import { getFplPredictorTable } from "../api/api";

/* ─── Constants ──────────────────────────────────────────── */
const BUDGET        = 100.0;
const MAX_SAME_TEAM = 3;

const SHIRT_IDS = {
  ARS:3,AVL:7,BOU:91,BRE:94,BHA:36,CHE:8,CRY:31,EVE:11,FUL:54,IPS:40,
  LEI:13,LIV:14,MCI:43,MUN:1,NEW:4,NFO:17,SOU:20,TOT:6,WHU:21,WOL:39,
};
// GK kits: FPL uses shirt_{id}_1-66.png for alternative/GK strip
// Using type=1 (first alternative) which is the GK/away strip for each club
const GK_SHIRT_IDS = {
  ARS:3,AVL:7,BOU:91,BRE:94,BHA:36,CHE:8,CRY:31,EVE:11,FUL:54,IPS:40,
  LEI:13,LIV:14,MCI:43,MUN:1,NEW:4,NFO:17,SOU:20,TOT:6,WHU:21,WOL:39,
};
const TEAM_COLORS = {
  ARS:"#EF0107",AVL:"#95BFE5",BOU:"#DA291C",BRE:"#E30613",BHA:"#0057B8",
  CHE:"#034694",CRY:"#1B458F",EVE:"#003399",FUL:"#CCCCCC",IPS:"#3A64A3",
  LEI:"#0053A0",LIV:"#C8102E",MCI:"#6CABDD",MUN:"#DA291C",NEW:"#241F20",
  NFO:"#DD0000",SOU:"#D71920",TOT:"#132257",WHU:"#7A263A",WOL:"#FDB913",
};
const TEAM_TEXT = { FUL:"#111",WOL:"#111",AVL:"#111",MCI:"#111" };
const DIFF = {
  1:{bg:"#0d5c2e",txt:"#80ffb0"},2:{bg:"#0d5c2e",txt:"#80ffb0"},
  3:{bg:"#5c4400",txt:"#ffd966"},4:{bg:"#5c1515",txt:"#ff9999"},
  5:{bg:"#3a0a0a",txt:"#ff6666"},
};

// Squad layout:
// Starters (0-13): 0=GK | 1-5=DEF(5) | 6-10=MID(5) | 11-13=FWD(3) = 14 slots
// Bench   (14-17): 4 slots — GK/DEF/MID/FWD
// Max 11 players active on pitch — algorithm enforces this
const SLOT_POSITION = {
  0:"GK",
  1:"DEF",2:"DEF",3:"DEF",4:"DEF",5:"DEF",
  6:"MID",7:"MID",8:"MID",9:"MID",10:"MID",
  11:"FWD",12:"FWD",13:"FWD",
  14:"GK",15:"DEF",16:"MID",17:"FWD",
};
const STARTER_INDICES = [0,1,2,3,4,5,6,7,8,9,10,11,12,13]; // all 14 starter slots
const BENCH_INDICES   = [14,15,16,17];
const MAX_STARTERS    = 11; // never more than 11 active on pitch

// Pitch rows displayed bottom→top
const PITCH_ROWS = [
  { label:"GK",  indices:[0],              yHint:"gk" },
  { label:"DEF", indices:[1,2,3,4,5],      yHint:"def" },
  { label:"MID", indices:[6,7,8,9,10],     yHint:"mid" },
  { label:"FWD", indices:[11,12,13],       yHint:"fwd" },
];

/* ─── Helpers ────────────────────────────────────────────── */
function shirtUrl(team, isGK=false) {
  const id = SHIRT_IDS[team];
  if (!id) return null;
  // FPL type=1 is the alternative (GK/away) kit — visually distinct from outfield
  return isGK
    ? `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${id}_1-66.png`
    : `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${id}-66.png`;
}
function fullName(n)  { return n || "—"; }
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

/* ─── Shirt image ────────────────────────────────────────── */
// GK colours (alternative/GK strip fallback colours — visually different from outfield)
const GK_COLORS = {
  ARS:"#f5c518",AVL:"#00bfa5",BOU:"#1a237e",BRE:"#ffd600",BHA:"#fff176",
  CHE:"#66bb6a",CRY:"#ce93d8",EVE:"#fff9c4",FUL:"#1565c0",IPS:"#ff8a65",
  LEI:"#80deea",LIV:"#a5d6a7",MCI:"#f48fb1",MUN:"#ffe0b2",NEW:"#ffcc02",
  NFO:"#b0bec5",SOU:"#90caf9",TOT:"#ef9a9a",WHU:"#e6ee9c",WOL:"#b39ddb",
};
function Shirt({ team, size=44, isGK=false }) {
  const [state, setState] = useState("primary");
  const id  = SHIRT_IDS[team];
  const sfx = isGK ? "_1-66.png" : "-66.png";
  const pri = id ? `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${id}${sfx}` : null;
  const sec = id ? `https://resources.premierleague.com/premierleague/shirts/standard/shirt_${id}${sfx}` : null;
  const bg  = isGK ? (GK_COLORS[team]||"#ffd600") : (TEAM_COLORS[team]||"#4f8cff");
  const tc  = ["FUL","WOL","AVL","MCI"].includes(team) ? "#111" : "#fff";
  const imgStyle = { objectFit:"contain", filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.6))", display:"block", flexShrink:0 };
  if (state==="primary" && pri)
    return <img src={pri} alt={team||""} width={size} height={size} style={imgStyle} onError={()=>setState("secondary")}/>;
  if (state==="secondary" && sec)
    return <img src={sec} alt={team||""} width={size} height={size} style={imgStyle} onError={()=>setState("fallback")}/>;
  return (
    <div style={{ width:size, height:size*0.9, borderRadius:6,
      background:`linear-gradient(160deg,${bg},${bg}cc)`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.2, fontWeight:900, color:tc,
      boxShadow:"0 2px 8px rgba(0,0,0,0.5)", flexShrink:0,
    }}>{isGK?"GK":(team||"?").slice(0,3)}</div>
  );
}

/* ─── Mini sparkline ──────────────────────────────────────── */
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
          <stop offset="0%" stopColor="#3b9eff"/>
          <stop offset="100%" stopColor="#9ff1b4"/>
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={`url(#msp${uid})`}
        strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"/>
      {vals.map((v,i) => {
        const x = pad+(i/(vals.length-1))*(W-pad*2);
        const y = H-pad-((v/max)*(H-pad*2));
        return <circle key={i} cx={x} cy={y} r={2}
          fill={i===vals.length-1?"#9ff1b4":"#67b1ff"}
          stroke="rgba(0,0,0,0.5)" strokeWidth="1"/>;
      })}
    </svg>
  );
}

/* ─── Pitch slot card (bigger + flip on hover) ───────────── */
function PitchSlot({ idx, player, isSelected, isDragOver, isBench, isInactive=false,
    onClick, onDragStart, onDragEnter, onDragLeave, onDrop }) {
  const [flipped, setFlipped] = useState(false);

  const pts     = Number(player?.projected_points||0);
  const tier    = player ? projTier(pts) : "";
  const diff    = DIFF[player?.fixture_difficulty] || DIFF[3];
  const slotPos = SLOT_POSITION[idx];

  // Card width: bigger than before
  const W = isBench ? 86 : 104;

  const borderColor = isSelected ? "#3b9eff"
    : isDragOver      ? "#28d97a"
    : tier==="elite"  ? "rgba(40,217,122,0.55)"
    : tier==="high"   ? "rgba(40,217,122,0.28)"
    : "rgba(255,255,255,0.1)";

  const shadow = isSelected   ? "0 0 24px rgba(59,158,255,0.5)"
    : isDragOver              ? "0 0 20px rgba(40,217,122,0.4)"
    : tier==="elite"          ? "0 0 16px rgba(40,217,122,0.4)"
    : tier==="high"           ? "0 0 10px rgba(40,217,122,0.2)"
    : "0 4px 12px rgba(0,0,0,0.4)";

  const ptColor = tier==="elite" ? "#9ff1b4"
    : tier==="high" ? "#c5ffdc" : tier==="good" ? "#67b1ff" : "#8aafcc";

  // Shared outer container props (drag + click shared by both faces)
  const containerProps = {
    draggable: !!player,
    onClick,
    onDragStart: e => { e.dataTransfer.effectAllowed="move"; onDragStart(); },
    onDragEnter: e => { e.preventDefault(); onDragEnter(); },
    onDragOver:  e => { e.preventDefault(); e.dataTransfer.dropEffect="move"; },
    onDragLeave: onDragLeave,
    onDrop:      e => { e.preventDefault(); onDrop(); },
    onMouseEnter: () => player && setFlipped(true),
    onMouseLeave: () => setFlipped(false),
  };

  if (!player) {
    // Empty slot — shows position label and + icon
    // isInactive = greyed lock icon when 11 starters already filled
    return (
      <div {...containerProps} style={{
        width:W, flexShrink:0,
        background: isInactive ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.02)",
        border: isInactive ? "1.5px dashed rgba(255,255,255,0.05)" : "1.5px dashed rgba(255,255,255,0.1)",
        borderRadius:12, padding:"10px 6px 8px",
        display:"flex", flexDirection:"column", alignItems:"center", gap:5,
        cursor: isInactive ? "not-allowed" : "pointer", userSelect:"none",
        transition:"all 0.18s ease",
        opacity: isInactive ? 0.35 : 1,
      }}>
        <div style={{
          width:isBench?36:44, height:isBench?36:44,
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
        <div style={{
          fontSize:8.5, fontWeight:800,
          color: isInactive ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.18)",
          letterSpacing:"0.08em",
        }}>{isInactive ? "LOCKED" : slotPos}</div>
      </div>
    );
  }

  // Filled slot — flip card
  return (
    <div {...containerProps} style={{
      width:W, flexShrink:0,
      perspective:"600px",
      position:"relative",
      cursor:"pointer",
      userSelect:"none",
      transform: isSelected ? "scale(1.07)" : isDragOver ? "scale(1.04)" : "scale(1)",
      transition:"transform 0.15s ease",
      zIndex: flipped ? 20 : 1,
    }}>
      {isSelected && (
        <div style={{
          position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)",
          background:"#3b9eff", color:"#fff", fontSize:8, fontWeight:900,
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
        borderRadius:12,
        border:`1.5px solid ${borderColor}`,
        boxShadow: shadow,
      }}>

        {/* ── FRONT ── */}
        <div style={{
          backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden",
          background:"linear-gradient(160deg,#0c1a2a,#060e18)",
          borderRadius:11,
          padding: isBench ? "8px 5px 6px" : "9px 6px 7px",
          display:"flex", flexDirection:"column", alignItems:"center", gap:3,
          minHeight: isBench ? 118 : 138,
        }}>
          <Shirt team={player.team} size={isBench ? 40 : 52} isGK={player.position==="GK"}/>

          {/* Name — always visible on green pitch */}
          <div style={{
            fontSize: isBench ? 10 : 11,
            fontWeight:900, color:"#fff",
            textAlign:"center", lineHeight:1.2,
            maxWidth:"100%", overflow:"hidden",
            textOverflow:"ellipsis", whiteSpace:"nowrap", width:"100%",
            background:"rgba(0,0,0,0.6)",
            padding:"1px 5px", borderRadius:4,
            textShadow:"0 1px 4px rgba(0,0,0,0.9)",
          }}>
            {shortName(player.name)}
          </div>

          {player.next_opp && (
            <div style={{
              fontSize:8, fontWeight:800,
              padding:"1px 6px", borderRadius:999,
              background:diff.bg, color:diff.txt, whiteSpace:"nowrap",
            }}>{player.next_opp}</div>
          )}

          <div style={{ fontSize: isBench ? 11 : 13, fontWeight:900, color:ptColor, lineHeight:1 }}>
            {pts.toFixed(1)}
          </div>

          {/* Flip hint */}
          <div style={{ fontSize:8, color:"rgba(255,255,255,0.18)", lineHeight:1 }}>↺</div>
        </div>

        {/* ── BACK — clean stat rows, fits card without sparkline ── */}
        <div style={{
          position:"absolute", inset:0,
          backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden",
          transform:"rotateY(180deg)",
          background:"linear-gradient(170deg,#06101c 0%,#030a14 100%)",
          border:"1.5px solid rgba(103,177,255,0.28)",
          borderRadius:12,
          padding:"9px 8px 8px",
          display:"flex", flexDirection:"column", gap:4,
          justifyContent:"center",
        }}>
          {/* Name */}
          <div style={{
            fontSize:9.5, fontWeight:900, color:"#c8dff8",
            textAlign:"center", lineHeight:1.15,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
            width:"100%", paddingBottom:5,
            borderBottom:"1px solid rgba(103,177,255,0.1)",
          }}>{shortName(player.name)}</div>
          {/* Stat rows */}
          {[
            { lbl:"PROJ", val:`${pts.toFixed(1)} pts`, col: pts>=9?"#9ff1b4":pts>=6?"#7dcfff":"#c8d8f0", hi:true },
            { lbl:"FORM", val:Number(player.form||0).toFixed(1),                                        col:"#c8d8f0" },
            { lbl:"COST", val:`£${player.cost}m`,                                                       col:"#c8d8f0" },
            { lbl:"APP",  val:`${Math.round((player.appearance_prob||player.prob_appear||0)*100)}%`,    col:Math.round((player.appearance_prob||player.prob_appear||0)*100)>80?"#9ff1b4":"#ffaa44" },
            { lbl:"OWN",  val:`${Number(player.selected_by_pct||0).toFixed(0)}%`,                      col:Number(player.selected_by_pct||0)>30?"#f2c94c":Number(player.selected_by_pct||0)>10?"#7dcfff":"#9ff1b4" },
          ].map(({lbl,val,col,hi}) => (
            <div key={lbl} style={{
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"2.5px 5px",
              background: hi ? "rgba(40,217,122,0.07)" : "rgba(255,255,255,0.03)",
              borderRadius:5,
              borderLeft: hi ? "2px solid rgba(40,217,122,0.35)" : "2px solid rgba(255,255,255,0.06)",
            }}>
              <span style={{ fontSize:7.5, fontWeight:800, color:"#2a4060", letterSpacing:"0.05em" }}>{lbl}</span>
              <span style={{ fontSize:10, fontWeight:900, color:col, lineHeight:1 }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── ICT mini-bar ────────────────────────────────────────── */
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

/* ─── Ownership ring ──────────────────────────────────────── */
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

/* ─── Availability badge ──────────────────────────────────── */
function AvailBadge({ player }) {
  const avail = player.official_availability||"Available";
  const chance = player.official_chance;
  if (avail==="Available") return (
    <div style={{ width:7,height:7,borderRadius:"50%",background:"#28d97a",boxShadow:"0 0 5px rgba(40,217,122,0.7)",flexShrink:0 }}/>
  );
  if (avail.startsWith("Doubtful")) return (
    <div title={avail} style={{ padding:"1px 5px",borderRadius:4,background:"rgba(255,170,68,0.15)",border:"1px solid rgba(255,170,68,0.3)",fontSize:8,fontWeight:800,color:"#ffaa44",whiteSpace:"nowrap",flexShrink:0 }}>
      {chance!=null?`${chance}%`:"D"}
    </div>
  );
  if (avail.startsWith("Injured")) return (
    <div title={avail} style={{ padding:"1px 5px",borderRadius:4,background:"rgba(255,77,109,0.15)",border:"1px solid rgba(255,77,109,0.3)",fontSize:8,fontWeight:800,color:"#ff4d6d",whiteSpace:"nowrap",flexShrink:0 }}>
      🏥
    </div>
  );
  if (avail.startsWith("Suspended")) return (
    <div title="Suspended" style={{ padding:"1px 5px",borderRadius:4,background:"rgba(255,77,109,0.12)",fontSize:8,fontWeight:800,color:"#ff4d6d",flexShrink:0 }}>🔴</div>
  );
  return null;
}

/* ─── GW forecast mini-bar row ────────────────────────────── */
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

/* ─── Available player row — UPGRADED ────────────────────── */
function AvailRow({ player, isHighlighted, blocked, blockReason,
    onClick, onDragStart, onDragEnd, onDragEnter, onDragLeave, onDrop, isDragOver }) {
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
  const trendUp= tIn > tOut;
  const trendDn= tOut > tIn;

  const bg = isDragOver       ? "rgba(40,217,122,0.1)"
           : isHighlighted    ? "rgba(59,158,255,0.1)"
           : expanded         ? "rgba(59,158,255,0.05)"
           : "rgba(255,255,255,0.025)";
  const border = isHighlighted  ? "1px solid rgba(59,158,255,0.35)"
               : isDragOver     ? "1px solid rgba(40,217,122,0.45)"
               : expanded       ? "1px solid rgba(59,158,255,0.18)"
               : "1px solid rgba(255,255,255,0.055)";

  return (
    <div
      draggable={!blocked}
      onDragStart={e=>{ if(blocked){e.preventDefault();return;} e.dataTransfer.effectAllowed="move"; onDragStart(e); }}
      onDragEnd={()=>onDragEnd?.()}
      onDragEnter={e=>{e.preventDefault();onDragEnter?.();}}
      onDragOver={e=>{e.preventDefault();}}
      onDragLeave={onDragLeave}
      onDrop={e=>{e.preventDefault();onDrop?.();}}
      style={{
        borderRadius:11,
        background:bg,border,
        opacity:blocked?0.3:1,
        transform:isDragOver?"scale(1.02) translateY(-1px)":"scale(1)",
        boxShadow:isDragOver?"0 6px 22px rgba(40,217,122,0.18)":expanded?"0 4px 16px rgba(0,0,0,0.35)":"none",
        transition:"all 0.14s ease",
        overflow:"visible",
        position:"relative",
      }}
    >
      {/* ── Main row ── */}
      <div
        onClick={blocked?undefined:onClick}
        style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px 8px 8px", cursor:blocked?"not-allowed":"grab", minHeight:46, borderRadius:11 }}
      >
        {/* Drag handle */}
        {!blocked&&<div style={{color:"rgba(255,255,255,0.1)",fontSize:11,flexShrink:0,cursor:"grab",userSelect:"none",lineHeight:1}}>⠿</div>}

        {/* Shirt */}
        <div style={{flexShrink:0,position:"relative"}}>
          <Shirt team={player.team} size={30} isGK={player.position==="GK"}/>
          <div style={{position:"absolute",top:-2,right:-2}}>
            <AvailBadge player={player}/>
          </div>
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

        {/* Transfer trend */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:1,flexShrink:0,minWidth:22}}>
          {trendUp&&<span style={{fontSize:9,color:"#9ff1b4",fontWeight:800,lineHeight:1}}>▲</span>}
          {trendDn&&<span style={{fontSize:9,color:"#ff4d6d",fontWeight:800,lineHeight:1}}>▼</span>}
          {!trendUp&&!trendDn&&<span style={{fontSize:9,color:"rgba(255,255,255,0.1)",lineHeight:1}}>—</span>}
        </div>

        {/* Fixture badge */}
        {player.next_opp&&(
          <div style={{fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:999,background:diff.bg,color:diff.txt,whiteSpace:"nowrap",flexShrink:0}}>
            {player.next_opp}
          </div>
        )}

        {/* Pts + cost */}
        <div style={{textAlign:"right",flexShrink:0,minWidth:44}}>
          <div style={{fontSize:13,fontWeight:900,color:ptColor,fontFamily:"DM Mono,monospace",lineHeight:1.1}}>{pts.toFixed(1)}</div>
          <div style={{fontSize:9.5,color:"#4a7a9a",lineHeight:1.1}}>£{player.cost}m</div>
        </div>

        {/* Ownership ring */}
        <OwnershipRing pct={own}/>

        {/* Expand toggle */}
        <button
          onClick={e=>{e.stopPropagation();setExpanded(v=>!v);}}
          style={{background:"none",border:"none",cursor:"pointer",padding:"2px 4px",color:"rgba(255,255,255,0.18)",fontSize:11,lineHeight:1,flexShrink:0,borderRadius:4,transition:"color 0.15s"}}
          onMouseEnter={e=>{e.currentTarget.style.color="rgba(255,255,255,0.5)";}}
          onMouseLeave={e=>{e.currentTarget.style.color="rgba(255,255,255,0.18)";}}
          title="Show detailed stats"
        >{expanded?"▲":"▼"}</button>

        {/* Block icon */}
        {blocked&&blockReason&&(
          <span title={blockReason} style={{fontSize:11,flexShrink:0}}>
            {blockReason.includes("budget")?"💸":blockReason.includes("team")?"⚠️":"🚫"}
          </span>
        )}
      </div>

      {/* ── Expanded detail panel ── */}
      {expanded&&(
        <div style={{
          borderTop:"1px solid rgba(255,255,255,0.06)",
          padding:"10px 12px 12px",
          background:"rgba(5,15,28,0.85)",
          display:"flex",flexDirection:"column",gap:9,
          animation:"expandIn 0.18s ease",
          borderRadius:"0 0 11px 11px",
          overflow:"hidden",
        }}>

          {/* GW forecast bars + sparkline row */}
          <div style={{display:"flex",gap:12,alignItems:"flex-end"}}>
            <div style={{flex:1}}>
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

          {/* Stats row: Form · App% · Pts/Season · Transfers */}
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

          {/* Action row */}
          <div style={{display:"flex",gap:6}}>
            <button
              onClick={e=>{e.stopPropagation();if(!blocked)onClick();}}
              disabled={blocked}
              style={{flex:1,padding:"7px 0",borderRadius:8,fontSize:10,fontWeight:800,cursor:blocked?"not-allowed":"pointer",
                background:blocked?"rgba(255,255,255,0.03)":"rgba(40,217,122,0.12)",
                border:"1px solid "+(blocked?"rgba(255,255,255,0.06)":"rgba(40,217,122,0.3)"),
                color:blocked?"rgba(255,255,255,0.15)":"#9ff1b4",letterSpacing:"0.06em",
                transition:"all 0.15s",fontFamily:"Outfit,sans-serif"}}
              onMouseEnter={e=>{if(!blocked){e.currentTarget.style.background="rgba(40,217,122,0.2)";}}}
              onMouseLeave={e=>{if(!blocked){e.currentTarget.style.background="rgba(40,217,122,0.12)";}}}
            >{blocked?blockReason||"BLOCKED":"+ ADD TO SQUAD"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Compare modal ──────────────────────────────────────── */
// FPL player photo URL
function playerPhotoUrl(player) {
  // FPL uses code field for photo, fallback to player_id
  const code = player.photo_code || player.code || player.player_id || player.id;
  if (!code) return null;
  return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${code}.png`;
}

function PlayerHero({ player, side }) {
  const [photoErr, setPhotoErr] = useState(false);
  const photoUrl = playerPhotoUrl(player);
  const name = player.name || player.player || "?";
  const isLeft = side === "left";
  const isGK = player.position === "GK";
  return (
    <div style={{
      display:"flex", flexDirection:"column",
      alignItems: isLeft ? "flex-end" : "flex-start",
      gap:6, flex:1, minWidth:0,
      padding: isLeft ? "0 16px 0 0" : "0 0 0 16px",
    }}>
      {/* Photo or shirt */}
      <div style={{ position:"relative", alignSelf: isLeft?"flex-end":"flex-start" }}>
        {photoUrl && !photoErr ? (
          <img
            src={photoUrl}
            alt={name}
            width={80} height={100}
            onError={()=>setPhotoErr(true)}
            style={{
              objectFit:"cover", objectPosition:"top",
              borderRadius:10,
              border:"2px solid rgba(255,255,255,0.12)",
              boxShadow:"0 8px 24px rgba(0,0,0,0.6)",
              display:"block",
            }}
          />
        ) : (
          <div style={{
            width:80, height:100, borderRadius:10,
            background:"rgba(255,255,255,0.04)",
            border:"2px solid rgba(255,255,255,0.08)",
            display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:8,
          }}>
            <Shirt team={player.team} size={52} isGK={isGK}/>
          </div>
        )}
      </div>
      {/* Name + meta */}
      <div style={{ textAlign: isLeft?"right":"left" }}>
        <div style={{ fontSize:13, fontWeight:900, color:"#f0f8ff", lineHeight:1.2 }}>{name}</div>
        <div style={{ fontSize:10, color:"#3a5a7a", marginTop:2 }}>
          {player.team} · {player.position}
        </div>
        <div style={{
          fontSize:11, fontWeight:800, color:"#9ff1b4", marginTop:4,
          background:"rgba(40,217,122,0.1)", borderRadius:6,
          padding:"2px 8px", display:"inline-block",
        }}>
          {Number(player.projected_points||0).toFixed(1)} pts
        </div>
      </div>
    </div>
  );
}

function CompareModal({ a, b, onClose }) {
  if (!a || !b) return null;
  const rows = [
    { label:"Proj Pts", va:Number(a.projected_points||0).toFixed(1),  vb:Number(b.projected_points||0).toFixed(1),  numA:Number(a.projected_points||0),  numB:Number(b.projected_points||0), higherBetter:true  },
    { label:"Price",    va:`£${a.cost}m`,  vb:`£${b.cost}m`,  numA:Number(a.cost||0),  numB:Number(b.cost||0), higherBetter:false  },
    { label:"Form",     va:Number(a.form||0).toFixed(1),  vb:Number(b.form||0).toFixed(1),  numA:Number(a.form||0),  numB:Number(b.form||0), higherBetter:true  },
    { label:"GW1",      va:Number(a.pts_gw_1||0).toFixed(1), vb:Number(b.pts_gw_1||0).toFixed(1), numA:Number(a.pts_gw_1||0), numB:Number(b.pts_gw_1||0), higherBetter:true },
    { label:"GW2",      va:Number(a.pts_gw_2||0).toFixed(1), vb:Number(b.pts_gw_2||0).toFixed(1), numA:Number(a.pts_gw_2||0), numB:Number(b.pts_gw_2||0), higherBetter:true },
    { label:"GW3",      va:Number(a.pts_gw_3||0).toFixed(1), vb:Number(b.pts_gw_3||0).toFixed(1), numA:Number(a.pts_gw_3||0), numB:Number(b.pts_gw_3||0), higherBetter:true },
    { label:"Owned",    va:`${Number(a.selected_by_pct||0).toFixed(1)}%`, vb:`${Number(b.selected_by_pct||0).toFixed(1)}%`, numA:Number(a.selected_by_pct||0), numB:Number(b.selected_by_pct||0), higherBetter:false },
    { label:"App%",     va:`${Math.round((a.prob_appear||0)*100)}%`, vb:`${Math.round((b.prob_appear||0)*100)}%`, numA:a.prob_appear||0, numB:b.prob_appear||0, higherBetter:true },
  ];
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.88)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:9999, padding:20,
    }} onClick={onClose}>
      <div style={{
        background:"#000",
        border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:20, padding:"24px 24px 20px",
        width:"100%", maxWidth:520,
        boxShadow:"0 0 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.04)",
      }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:900, color:"#c8d8f0", letterSpacing:"0.12em" }}>COMPARISON</div>
          <button onClick={onClose} style={{
            background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:8, width:28, height:28, display:"flex", alignItems:"center",
            justifyContent:"center", color:"#4a7a9a", fontSize:16, cursor:"pointer",
          }}>✕</button>
        </div>

        {/* Player heroes — properly divided left | VS | right */}
        <div style={{
          display:"flex", alignItems:"flex-start", gap:0,
          marginBottom:20,
          borderBottom:"1px solid rgba(255,255,255,0.07)",
          paddingBottom:20,
        }}>
          <PlayerHero player={a} side="left"/>
          {/* VS divider */}
          <div style={{
            display:"flex", flexDirection:"column", alignItems:"center",
            justifyContent:"center", gap:4, flexShrink:0,
            width:40, paddingTop:16,
          }}>
            <div style={{ width:1, height:30, background:"rgba(255,255,255,0.07)" }}/>
            <div style={{ fontSize:10, fontWeight:900, color:"#1a3a5a", letterSpacing:"0.08em" }}>VS</div>
            <div style={{ width:1, height:30, background:"rgba(255,255,255,0.07)" }}/>
          </div>
          <PlayerHero player={b} side="right"/>
        </div>

        {/* Stats rows */}
        <div style={{ display:"flex", flexDirection:"column", gap:2, marginBottom:16 }}>
          {rows.map(r => {
            const aWins = r.higherBetter ? r.numA > r.numB : r.numA < r.numB;
            const bWins = r.higherBetter ? r.numB > r.numA : r.numB < r.numA;
            return (
              <div key={r.label} style={{
                display:"grid", gridTemplateColumns:"1fr 52px 1fr",
                borderRadius:7, overflow:"hidden",
              }}>
                <div style={{
                  textAlign:"right", padding:"5px 10px",
                  fontSize:12, fontWeight:700,
                  color: aWins ? "#9ff1b4" : "#7a9ab8",
                  background: aWins ? "rgba(40,217,122,0.1)" : "rgba(255,255,255,0.02)",
                  borderRadius:"7px 0 0 7px",
                }}>{r.va}</div>
                <div style={{
                  textAlign:"center", fontSize:9, fontWeight:800, color:"#2a4a6a",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background:"rgba(0,0,0,0.3)",
                  letterSpacing:"0.04em",
                }}>{r.label}</div>
                <div style={{
                  textAlign:"left", padding:"5px 10px",
                  fontSize:12, fontWeight:700,
                  color: bWins ? "#9ff1b4" : "#7a9ab8",
                  background: bWins ? "rgba(40,217,122,0.1)" : "rgba(255,255,255,0.02)",
                  borderRadius:"0 7px 7px 0",
                }}>{r.vb}</div>
              </div>
            );
          })}
        </div>

        <button onClick={onClose} style={{
          width:"100%", padding:"10px 0", borderRadius:10,
          fontSize:12, fontWeight:800,
          background:"rgba(255,255,255,0.05)",
          border:"1px solid rgba(255,255,255,0.09)",
          color:"#7a9ab8", cursor:"pointer",
          letterSpacing:"0.06em",
        }}>Close</button>
      </div>
    </div>
  );
}

/* ─── Formation card ─────────────────────────────────────── */
/* ── Formation detection helper ── */
function detectFormation(squad) {
  // Use the first 11 filled STARTER_INDICES
  const filled = STARTER_INDICES.filter(i=>squad[i]!=null).slice(0,11);
  const players = filled.map(i=>squad[i]);
  const def = players.filter(p=>p?.position==="DEF").length;
  const mid = players.filter(p=>p?.position==="MID").length;
  const fwd = players.filter(p=>p?.position==="FWD").length;
  const gk  = players.filter(p=>p?.position==="GK").length;
  if (gk===1 && def+mid+fwd===10 && filled.length===11) return `${def}-${mid}-${fwd}`;
  return null;
}

function FormationCard({ squad }) {
  const formation = detectFormation(squad);
  return (
    <div style={{
      padding:"7px 13px", borderRadius:10,
      background:"rgba(103,177,255,0.07)",
      border:`1px solid ${formation ? "rgba(103,177,255,0.4)" : "rgba(103,177,255,0.15)"}`,
      display:"flex", flexDirection:"column", alignItems:"center", gap:1,
      minWidth:72,
      transition:"border-color 0.3s ease",
    }}>
      <div style={{ fontSize:9,color:"#2a4a6a",fontWeight:800,letterSpacing:"0.1em" }}>FORMATION</div>
      <div style={{ fontSize:16,fontWeight:900,color:formation?"#67b1ff":"#4a7a9a",letterSpacing:"0.04em" }}>
        {formation || "—"}
      </div>
    </div>
  );
}

/* ─── Budget bar (editable) ──────────────────────────────── */
function BudgetBar({ spent, total, onEdit, editBudget, budgetInput, onBudgetChange, onBudgetCommit, onBudgetCancel }) {
  const left = total - spent;
  const over = left < 0;
  const pct  = Math.min((spent/total)*100,100);
  const barColor = over
    ? "linear-gradient(90deg,#cc2222,#ff3333)"
    : left<3
    ? "linear-gradient(90deg,#cc7700,#ffaa44)"
    : "linear-gradient(90deg,#0d6e35,#28d97a)";
  return (
    <div style={{
      padding:"10px 16px",
      background:"#000",
      border:"1px solid rgba(255,255,255,0.08)",
      borderRadius:12, marginBottom:10,
    }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ fontSize:10,fontWeight:800,color:"#3a5a7a",letterSpacing:"0.1em" }}>BUDGET</span>
          {editBudget ? (
            <div style={{ display:"flex",alignItems:"center",gap:5 }}>
              <span style={{ fontSize:10,color:"#4a7a9a" }}>£</span>
              <input
                autoFocus
                value={budgetInput}
                onChange={e=>onBudgetChange(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter") onBudgetCommit(); if(e.key==="Escape") onBudgetCancel(); }}
                style={{
                  width:60,padding:"2px 6px",fontSize:11,fontWeight:800,
                  background:"rgba(255,255,255,0.08)",border:"1px solid rgba(59,158,255,0.5)",
                  borderRadius:5,color:"#e8f0ff",outline:"none",fontFamily:"inherit",
                }}
              />
              <span style={{ fontSize:10,color:"#4a7a9a" }}>m</span>
              <button onClick={onBudgetCommit} style={{ background:"rgba(40,217,122,0.15)",border:"1px solid rgba(40,217,122,0.35)",borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:800,color:"#9ff1b4",cursor:"pointer" }}>✓</button>
              <button onClick={onBudgetCancel} style={{ background:"none",border:"none",color:"#4a7a9a",cursor:"pointer",fontSize:13 }}>✕</button>
            </div>
          ) : (
            <button onClick={onEdit} style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:5,padding:"1px 8px",fontSize:9,fontWeight:800,color:"#4a7a9a",cursor:"pointer",letterSpacing:"0.05em" }}>
              £{total.toFixed(1)}m ✎
            </button>
          )}
        </div>
        <span style={{ fontSize:13,fontWeight:900,
          color: over?"#ff5555":left<3?"#ffaa44":"#9ff1b4" }}>
          {over?"−":""}£{Math.abs(left).toFixed(1)}m {over?"OVER":"left"}
        </span>
      </div>
      <div style={{ height:5,borderRadius:999,background:"rgba(255,255,255,0.06)",overflow:"hidden" }}>
        <div style={{
          height:"100%",borderRadius:999,width:`${pct}%`,
          background:barColor,
          transition:"width 0.4s cubic-bezier(0.4,0,0.2,1)",
        }}/>
      </div>
    </div>
  );
}

/* ─── Suggest banner ─────────────────────────────────────── */
function SuggestBanner({ s, onAccept, onDismiss }) {
  if (!s) return null;
  return (
    <div style={{
      display:"flex",alignItems:"center",gap:10,
      padding:"9px 14px",
      background:"rgba(20,80,40,0.35)",
      border:"1px solid rgba(40,217,122,0.3)",
      borderRadius:10, marginBottom:10,
      animation:"slideDown 0.25s ease",
    }}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{flexShrink:0}}><circle cx="8" cy="7" r="4.5" stroke="#d4a017" strokeWidth="1.4"/><path d="M6.5 6c0-1 .5-1.5 1.5-1.5s1.5.6 1.5 1.3c0 .8-.7 1.2-1.5 1.5v.7" stroke="#d4a017" strokeWidth="1.3" strokeLinecap="round"/><circle cx="8" cy="9.5" r=".75" fill="#d4a017"/></svg>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:11,fontWeight:800,color:"#9ff1b4" }}>
          BEST TRANSFER: {shortName(s.outPlayer.name||s.outPlayer.player)} → {shortName(s.inPlayer.name||s.inPlayer.player)}
        </div>
        <div style={{ fontSize:10,color:"#4a9a7a" }}>
          +{s.gain.toFixed(1)} pts · saves £{s.saving.toFixed(1)}m
        </div>
      </div>
      <button onClick={onAccept} style={{
        padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:800,
        background:"rgba(40,217,122,0.2)",border:"1px solid rgba(40,217,122,0.4)",
        color:"#9ff1b4",cursor:"pointer",
      }}>Apply</button>
      <button onClick={onDismiss} style={{
        background:"none",border:"none",color:"#4a7a9a",cursor:"pointer",fontSize:14,lineHeight:1,
      }}>✕</button>
    </div>
  );
}

/* ── buildLineupRows: group squad players by position for rendering ── */
function buildLineupRows(squad) {
  // Returns { gk, def, mid, fwd, total } where each is [{player, slotIdx}]
  const result = { gk:[], def:[], mid:[], fwd:[], total:0 };
  STARTER_INDICES.forEach(i => {
    const p = squad[i];
    if (!p) return;
    const entry = { player:p, slotIdx:i };
    if (p.position === "GK")  result.gk.push(entry);
    else if (p.position === "DEF") result.def.push(entry);
    else if (p.position === "MID") result.mid.push(entry);
    else if (p.position === "FWD") result.fwd.push(entry);
    result.total++;
  });
  return result;
}

/* ── buildGhostSlots: next empty slot per position for drop targets ── */
function buildGhostSlots(squad) {
  // Returns empty slot indices per position (up to 1 visible ghost each)
  const full = STARTER_INDICES.filter(i=>squad[i]!=null).length >= MAX_STARTERS;
  if (full) return { emptyGK:[], emptyDEF:[], emptyMID:[], emptyFWD:[] };

  const find = (indices) => {
    const e = indices.find(i=>squad[i]==null);
    return e !== undefined ? [e] : [];
  };
  return {
    emptyGK:  find([0]),
    emptyDEF: find([1,2,3,4,5]),
    emptyMID: find([6,7,8,9,10]),
    emptyFWD: find([11,12,13]),
  };
}

/* ── Auto-arrange: pack players into clean formation slots ── */
function autoArrangeSquad(squad) {
  // Extract active starters grouped by position
  const filled = STARTER_INDICES.filter(i=>squad[i]!=null).slice(0,MAX_STARTERS);
  const players = filled.map(i=>squad[i]);
  const gks  = players.filter(p=>p.position==="GK");
  const defs = players.filter(p=>p.position==="DEF");
  const mids = players.filter(p=>p.position==="MID");
  const fwds = players.filter(p=>p.position==="FWD");

  const next = [...squad];
  // Clear all starter slots first
  STARTER_INDICES.forEach(i=>{ next[i] = null; });

  // Repack into contiguous slots
  // GK → slot 0
  if (gks[0])  next[0] = gks[0];
  // DEF → slots 1..5 (first defs.length of them)
  defs.forEach((p,i)=>{ if(i<5) next[1+i]=p; });
  // MID → slots 6..10
  mids.forEach((p,i)=>{ if(i<5) next[6+i]=p; });
  // FWD → slots 11..13
  fwds.forEach((p,i)=>{ if(i<3) next[11+i]=p; });

  return next;
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════ */
export default function SquadBuilderPage() {
  const [allPlayers, setAllPlayers] = useState([]);
  const [squad, setSquad]           = useState(Array(18).fill(null));
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  // UI state
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
  const [dragOverPos, setDragOverPos]     = useState(null); // position band highlighted when dragging
  const [budget, setBudget]               = useState(100.0);
  const [formationFlash, setFormationFlash] = useState(false);
  const [editBudget, setEditBudget]       = useState(false);
  const [budgetInput, setBudgetInput]     = useState("100.0");

  // Drag source ref
  const dragSrc      = useRef(null); // { type:"slot", idx:N } | { type:"avail", player:{...} }
  const dragGhostRef = useRef(null); // hidden div used as custom drag image

  /* ── Load players (squad starts empty — user fills manually) ── */
  useEffect(() => {
    getFplPredictorTable({ start_gw:29 })
      .then(data => {
        const rows = (data.rows||[]).map(r => {
          // ── Composite projected_points (same algorithm as BestTeamPage) ──
          const pts  = Number(r.pts_gw_1 || 0);
          const form = Number(r.form || 0);
          const ppg  = Number(r.points_so_far || 0) / Math.max(Number(r.played || 1), 1);
          const ict  = Number(r.ict_index || 0);
          const prob = Number(r.prob_appear || r.appearance_prob || 0.92);
          const raw  = (pts*0.40) + (form*0.35) + (ppg*0.15) + ((ict/30)*0.10);
          const formGate   = form >= 1.5 ? 1.0 : Math.max(form/1.5, 0.25);
          const probPenalty = Math.pow(Math.max(prob, 0), 1.4);
          return {
            ...r,
            name: r.name || r.player || r.web_name || r.display_name || "Unknown",
            projected_points: raw * formGate * probPenalty,
            appearance_prob: prob,
            fixture_difficulty: r.fixture_difficulty || 3,
          };
        });
        setAllPlayers(rows);
        // Squad stays empty — user drags/clicks to fill from available list
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  /* ── Flash formation banner when XI is completed ── */
  useEffect(() => {
    const f = detectFormation(squad); // returns "4-3-3" string or null
    if (f) {
      setFormationFlash(true);
      const t = setTimeout(() => setFormationFlash(false), 3000);
      return () => clearTimeout(t);
    }
  }, [squad]);

  /* ── Derived ── */
  const spent    = squad.reduce((s,p)=>s+Number(p?.cost||0),0);
  const squadIds = new Set(squad.filter(Boolean).map(p=>p.player_id));
  const teamCounts = squad.reduce((acc,p)=>{
    if(p) acc[p.team]=(acc[p.team]||0)+1;
    return acc;
  },{});

  const availablePlayers = allPlayers.filter(p => {
    if (squadIds.has(p.player_id)) return false;
    if (posFilter !== "ALL" && p.position !== posFilter) return false;
    if (searchQ && !(p.name||'').toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  }).sort((a,b) => {
    if (sortBy==="pts")  return b.projected_points - a.projected_points;
    if (sortBy==="cost") return Number(b.cost) - Number(a.cost);
    if (sortBy==="form") return Number(b.form||0) - Number(a.form||0);
    if (sortBy==="ict")  return Number(b.ict_index||0) - Number(a.ict_index||0);
    return 0;
  });

  /* ── Derived: active starters (must be before canTransfer) ── */
  const filledStarters = STARTER_INDICES.filter(i => squad[i] != null);
  const activeStarters = filledStarters.slice(0, MAX_STARTERS);
  const totalPts    = activeStarters.reduce((s,i) => s + Number(squad[i]?.projected_points||0), 0);
  const starterCount = filledStarters.length;
  const activeCount  = activeStarters.length;

  // Plain function — no useCallback to avoid temporal dead zone
  function isSlotInactive(idx) {
    if (BENCH_INDICES.includes(idx)) return false;
    if (squad[idx] != null) return false;
    return filledStarters.length >= MAX_STARTERS;
  }

  /* ── Transfer validation ── */
  function canTransfer(outIdx, inPlayer) {
    const outP    = squad[outIdx];
    const outPos  = SLOT_POSITION[outIdx];
    if (inPlayer.position !== outPos) return { ok:false, reason:`Need ${outPos}` };
    // Block inactive slots (overflow beyond 11 starters)
    if (isSlotInactive(outIdx)) return { ok:false, reason:"11-player limit reached" };
    const outCost = Number(outP?.cost||0);
    const inCost  = Number(inPlayer.cost||0);
    if (spent - outCost + inCost > budget) return { ok:false, reason:"over budget" };
    const teamCnt = (teamCounts[inPlayer.team]||0) - (inPlayer.team===outP?.team?1:0);
    if (teamCnt >= MAX_SAME_TEAM) return { ok:false, reason:"team limit (3 max)" };
    return { ok:true };
  }

  /* ── Do transfer ── */
  const [arranging, setArranging] = useState(false);

  const doTransfer = useCallback((toSlotIdx, inPlayer) => {
    const { ok } = canTransfer(toSlotIdx, inPlayer);
    if (!ok) return false;
    setHistory(h=>[...h,{squad:[...squad]}]);
    let next = [...squad];
    next[toSlotIdx] = inPlayer;

    // Check if this brings us to exactly 11 active starters → auto-arrange
    const newFilled = STARTER_INDICES.filter(i=>next[i]!=null);
    if (newFilled.length === MAX_STARTERS) {
      setArranging(true);
      const arranged = autoArrangeSquad(next);
      setTimeout(()=>{ setSquad(arranged); setArranging(false); }, 280);
    } else {
      setSquad(next);
    }

    setSelectedSlot(null);
    setSuggestion(null);
    return true;
  }, [squad, spent, teamCounts]);

  /* ── Swap two squad slots ── */
  const doSwap = useCallback((idxA, idxB) => {
    if (idxA === idxB) return;
    const posA = SLOT_POSITION[idxA], posB = SLOT_POSITION[idxB];
    if (posA !== posB) return; // positions must match
    setHistory(h=>[...h,{squad:[...squad]}]);
    const next = [...squad];
    [next[idxA], next[idxB]] = [next[idxB], next[idxA]];
    setSquad(next);
    setSelectedSlot(null);
  }, [squad]);

  /* ── Undo ── */
  const undo = useCallback(() => {
    if (!history.length) return;
    setSquad(history[history.length-1].squad);
    setHistory(h=>h.slice(0,-1));
    setSelectedSlot(null);
  }, [history]);

  /* ── Auto-suggest ── */
  const autoSuggest = useCallback(() => {
    let best = null;
    squad.forEach((outP, idx) => {
      if (!outP) return;
      const candidates = availablePlayers.filter(p => {
        if (p.position !== SLOT_POSITION[idx]) return false;
        const { ok } = canTransfer(idx, p);
        return ok;
      });
      if (!candidates.length) return;
      const top  = candidates[0];
      const gain = top.projected_points - outP.projected_points;
      const sav  = Number(outP.cost||0) - Number(top.cost||0);
      if (gain > 0 && (!best || gain > best.gain)) {
        best = { slotIdx:idx, outPlayer:outP, inPlayer:top, gain, saving:sav };
      }
    });
    setSuggestion(best || { none:true });
    if (best) setSelectedSlot(best.slotIdx);
  }, [squad, availablePlayers]);

  /* ── Slot click ── */
  const handleSlotClick = useCallback((idx) => {
    if (compareMode) {
      const p = squad[idx]; if (!p) return;
      if (!compareA)                           { setCompareA(p); return; }
      if (p.player_id !== compareA.player_id)  { setCompareB(p); setShowCompare(true); return; }
      setCompareA(null); setCompareB(null);
      return;
    }
    if (selectedSlot === idx) { setSelectedSlot(null); return; }
    if (selectedSlot !== null) {
      // Swap two squad players if same position
      if (SLOT_POSITION[selectedSlot] === SLOT_POSITION[idx]) {
        doSwap(selectedSlot, idx);
        return;
      }
    }
    setSelectedSlot(idx);
    // NOTE: We do NOT auto-lock posFilter here — user can browse all positions
    // Invalid transfers are blocked visually via canTransfer, not by hiding them
  }, [compareMode, selectedSlot, squad, compareA, doSwap]);

  /* ── Available row click ── */
  const handleAvailClick = useCallback((player) => {
    if (compareMode) {
      if (!compareA)                               { setCompareA(player); return; }
      if (player.player_id !== compareA.player_id) { setCompareB(player); setShowCompare(true); return; }
      setCompareA(null); setCompareB(null);
      return;
    }
    if (selectedSlot !== null) {
      doTransfer(selectedSlot, player);
      return;
    }
    // Smart click: no slot selected — auto-fill first matching empty slot
    const posSlotMap = {
      GK:  [0],
      DEF: [1,2,3,4,5],
      MID: [6,7,8,9,10],
      FWD: [11,12,13],
    };
    const slots = posSlotMap[player.position] || [];
    const targetSlot = slots.find(i => !squad[i] && !isSlotInactive(i));
    if (targetSlot != null) {
      doTransfer(targetSlot, player);
    }
  }, [compareMode, selectedSlot, compareA, doTransfer, squad]);

  /* ── Drag handlers ── */
  const onSlotDragStart = (idx) => {
    dragSrc.current = { type:"slot", idx };
  };
  const onAvailDragStart = (player, e) => {
    dragSrc.current = { type:"avail", player };
    setDragOverPos(player.position); // highlight matching zone on pitch
    // Custom drag image: make it look like a pitch card
    if (dragGhostRef.current && e) {
      // Populate ghost
      const ghost = dragGhostRef.current;
      ghost.style.display = "flex";
      // Show team + name + pts
      const nameEl = ghost.querySelector(".dg-name");
      const ptsEl  = ghost.querySelector(".dg-pts");
      if (nameEl) nameEl.textContent = shortName(player.name||player.player||"");
      if (ptsEl)  ptsEl.textContent  = Number(player.projected_points||0).toFixed(1);
      e.dataTransfer.setDragImage(ghost, 50, 30);
      // Hide after small delay (browser needs it visible momentarily)
      setTimeout(()=>{ ghost.style.display = "none"; }, 0);
    }
  };
  const onSlotDrop = useCallback((dropIdx) => {
    setDragOverSlot(null);
    setDragOverPos(null);
    const src = dragSrc.current;
    if (!src) return;
    if (src.type === "slot") {
      doSwap(src.idx, dropIdx);
    } else if (src.type === "avail") {
      doTransfer(dropIdx, src.player);
    }
    dragSrc.current = null;
  }, [doSwap, doTransfer]);

  const onAvailDrop = useCallback((targetPlayer) => {
    setDragOverAvail(null);
    setDragOverPos(null);
    const src = dragSrc.current;
    if (!src || src.type !== "slot") return;
    // Dragging squad player onto available row = swap them
    const slotIdx = src.idx;
    const inPlayer = targetPlayer;
    doTransfer(slotIdx, inPlayer);
    dragSrc.current = null;
  }, [doTransfer]);

  /* ── Drag end cleanup ── */
  const onDragEnd = useCallback(() => {
    dragSrc.current = null;
    setDragOverSlot(null);
    setDragOverPos(null);
    setDragOverAvail(null);
  }, []);

  /* ── Teams for filter ── */
  const teams = [...new Set(allPlayers.map(p=>p.team))].sort();



  /* ── Blocked check for avail row ── */
  function availBlocked(p) {
    if (selectedSlot === null) return { blocked:false };
    const { ok, reason } = canTransfer(selectedSlot, p);
    if (!ok) return { blocked:true, reason };
    return { blocked:false };
  }

  /* ────────────────────────────────────────────────────────
     RENDER
     ──────────────────────────────────────────────────────── */
  if (loading) return (
    <div style={{ minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:36,animation:"spin 1s linear infinite" }}>⚽</div>
        <div style={{ fontSize:13,color:"#4a7a9a",fontWeight:700,marginTop:10 }}>Loading players…</div>
      </div>
    </div>
  );
  if (error) return (
    <div style={{ minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ color:"#ff6666",fontSize:13,maxWidth:400,textAlign:"center" }}>
        Error: {error}<br/>
        <span style={{ fontSize:11,color:"#4a7a9a" }}>Is the backend running on port 8003?</span>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight:"100vh", padding:"16px 16px 48px",
      fontFamily:"'DM Mono',monospace",
      background:"#000",
    }}>
      <style>{`
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes expandIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulseBlue { 0%,100%{box-shadow:0 0 0 rgba(59,158,255,0)} 50%{box-shadow:0 0 14px rgba(59,158,255,0.4)} }
        .avail-scroll::-webkit-scrollbar{width:4px}
        .avail-scroll::-webkit-scrollbar-track{background:rgba(255,255,255,0.02);border-radius:4px}
        .avail-scroll::-webkit-scrollbar-thumb{background:rgba(103,177,255,0.18);border-radius:4px}
      `}</style>

      {showCompare && <CompareModal a={compareA} b={compareB}
        onClose={()=>{setShowCompare(false);setCompareMode(false);setCompareA(null);setCompareB(null);}} />}

      {/* ── Hidden drag ghost — custom drag image for available player cards ── */}
      <div ref={dragGhostRef} style={{
        position:"fixed", top:-9999, left:-9999,
        width:100, height:130,
        background:"linear-gradient(160deg,#0c1a2a,#060e18)",
        border:"1.5px solid rgba(59,158,255,0.5)",
        borderRadius:12, padding:"10px 8px 8px",
        display:"none", flexDirection:"column", alignItems:"center", gap:5,
        boxShadow:"0 8px 32px rgba(0,0,0,0.8), 0 0 20px rgba(59,158,255,0.3)",
        pointerEvents:"none", zIndex:9999,
      }}>
        {/* Shirt placeholder circle */}
        <div style={{
          width:44, height:44, borderRadius:8,
          background:"rgba(59,158,255,0.15)",
          border:"1px solid rgba(59,158,255,0.25)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:18,
        }}>👕</div>
        <div className="dg-name" style={{
          fontSize:10, fontWeight:900, color:"#e8f0ff",
          textAlign:"center", width:"100%",
          background:"rgba(0,0,0,0.5)", padding:"1px 4px", borderRadius:4,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
        }}></div>
        <div className="dg-pts" style={{
          fontSize:13, fontWeight:900, color:"#9ff1b4",
        }}></div>
        <div style={{ fontSize:8, color:"rgba(59,158,255,0.5)" }}>drag to pitch</div>
      </div>

      {/* ── Page header ── */}
      <div style={{ maxWidth:1320,margin:"0 auto 14px" }}>
        <div style={{ display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:10 }}>
          <div>
            <div style={{ fontSize:10,fontWeight:800,color:"#3b9eff",letterSpacing:"0.15em",marginBottom:3 }}>
              FPL TRANSFER MARKET
            </div>
            <h1 style={{ margin:0,fontSize:20,fontWeight:900,color:"#e8f0ff" }}>Squad Builder</h1>
          </div>

          <div style={{ display:"flex",gap:8,flexWrap:"wrap",alignItems:"center" }}>
            {/* Proj pts badge */}
            <div style={{
              padding:"8px 14px",borderRadius:10,
              background:"rgba(40,217,122,0.08)",
              border:"1px solid rgba(40,217,122,0.18)",
              display:"flex",flexDirection:"column",alignItems:"center",gap:1,
            }}>
              <div style={{ fontSize:9,color:"#2a8a5a",fontWeight:800,letterSpacing:"0.1em" }}>PROJ PTS</div>
              <div style={{ fontSize:17,fontWeight:900,color:"#9ff1b4",lineHeight:1 }}>{totalPts.toFixed(1)}</div>
            </div>

            <FormationCard squad={squad}/>

            <style>{`
              .sb-btn {
                padding:8px 16px;border-radius:10px;font-size:11px;font-weight:800;
                border:1px solid rgba(255,255,255,0.1);cursor:pointer;
                font-family:inherit;letter-spacing:0.04em;
                transition:all 0.18s cubic-bezier(0.22,1,0.36,1);
                display:flex;align-items:center;gap:6px;
                position:relative;overflow:hidden;
              }
              .sb-btn::before {
                content:"";position:absolute;inset:0;
                background:rgba(255,255,255,0);
                transition:background 0.18s ease;
              }
              .sb-btn:hover::before { background:rgba(255,255,255,0.06); }
              .sb-btn:hover { transform:translateY(-1px); }
              .sb-btn:active { transform:translateY(0) scale(0.97); }
              .sb-btn:disabled { opacity:0.3;cursor:not-allowed;pointer-events:none; }

              .sb-btn-undo {
                background:rgba(255,255,255,0.04);color:#7a9ab8;
              }
              .sb-btn-undo:hover { border-color:rgba(255,255,255,0.22);color:#c8d8f0;box-shadow:0 4px 14px rgba(0,0,0,0.3); }

              .sb-btn-suggest {
                background:rgba(255,184,0,0.07);border-color:rgba(255,184,0,0.2);color:#d4a017;
              }
              .sb-btn-suggest:hover { background:rgba(255,184,0,0.14);border-color:rgba(255,184,0,0.4);color:#ffcc44;box-shadow:0 4px 14px rgba(255,184,0,0.15); }

              .sb-btn-compare {
                color:#67b1ff;
              }
              .sb-btn-compare-off { background:rgba(103,177,255,0.06);border-color:rgba(103,177,255,0.18); }
              .sb-btn-compare-off:hover { background:rgba(103,177,255,0.14);border-color:rgba(103,177,255,0.4);box-shadow:0 4px 14px rgba(103,177,255,0.15); }
              .sb-btn-compare-on  { background:rgba(103,177,255,0.18);border-color:rgba(103,177,255,0.5);box-shadow:0 0 14px rgba(103,177,255,0.2); }
              .sb-btn-compare-on:hover { background:rgba(103,177,255,0.26);box-shadow:0 4px 18px rgba(103,177,255,0.3); }

              .sb-btn-icon {
                width:16px;height:16px;opacity:0.7;flex-shrink:0;
              }
            `}</style>

            {/* Undo */}
            <button
              className="sb-btn sb-btn-undo"
              onClick={undo}
              disabled={!history.length}
            >
              <svg className="sb-btn-icon" viewBox="0 0 16 16" fill="none">
                <path d="M3 8a5 5 0 105-5H4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M7 3L4.5 5.5 7 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Undo{history.length ? ` (${history.length})` : ""}
            </button>

            {/* Auto-suggest */}
            <button
              className="sb-btn sb-btn-suggest"
              onClick={autoSuggest}
            >
              <svg className="sb-btn-icon" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M6.5 6C6.5 5 7 4.5 8 4.5s1.5.6 1.5 1.3c0 .8-.7 1.2-1.5 1.5v.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <circle cx="8" cy="9.5" r=".75" fill="currentColor"/>
                <path d="M8 12v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Suggest
            </button>

            {/* Compare */}
            <button
              className={`sb-btn sb-btn-compare ${compareMode?"sb-btn-compare-on":"sb-btn-compare-off"}`}
              onClick={()=>{ setCompareMode(m=>!m); setCompareA(null); setCompareB(null); setShowCompare(false); }}
            >
              <svg className="sb-btn-icon" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="3" width="5" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <rect x="10" y="3" width="5" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M6.5 8h3M8 6.5L9.5 8 8 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {compareMode
                ? (compareA ? "Pick 2nd" : "Pick 1st")
                : "Compare"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div style={{
        maxWidth:1320, margin:"0 auto",
        display:"grid", gridTemplateColumns:"1fr 340px", gap:16,
      }}>

        {/* ════ LEFT: Pitch ════ */}
        <div>
          <BudgetBar spent={spent} total={budget} onEdit={()=>{setBudgetInput(budget.toFixed(1));setEditBudget(true);}} editBudget={editBudget} budgetInput={budgetInput} onBudgetChange={setBudgetInput} onBudgetCommit={()=>{const v=parseFloat(budgetInput);if(!isNaN(v)&&v>0)setBudget(v);setEditBudget(false);}} onBudgetCancel={()=>setEditBudget(false)}/>
          {suggestion && !suggestion.none && (
            <SuggestBanner s={suggestion}
              onAccept={()=>{ doTransfer(suggestion.slotIdx, suggestion.inPlayer); setSuggestion(null); }}
              onDismiss={()=>setSuggestion(null)}/>
          )}
          {suggestion?.none && (
            <div style={{ fontSize:11,color:"#4a7a9a",padding:"8px 14px",
              background:"rgba(255,255,255,0.03)",borderRadius:8,marginBottom:10,
            }}>✓ Your squad looks optimised — no better transfers found.</div>
          )}

          {selectedSlot !== null && (
            <div style={{
              padding:"8px 14px",borderRadius:10,marginBottom:10,
              background:"linear-gradient(90deg,rgba(59,158,255,0.1),rgba(59,158,255,0.04))",
              border:"1px solid rgba(59,158,255,0.3)",
              fontSize:11,fontWeight:800,color:"#67b1ff",
              animation:"pulseBlue 2s ease infinite",
            }}>
              🔄 Replacing: <span style={{ color:"#e8f0ff" }}>
                {squad[selectedSlot]?.name || `Empty ${SLOT_POSITION[selectedSlot]} slot`}
              </span>
              <span style={{ color:"#3a5a7a",fontWeight:600 }}> — click a player on the right to bring in</span>
              <button onClick={()=>setSelectedSlot(null)} style={{
                marginLeft:10,background:"none",border:"none",color:"#4a7a9a",
                cursor:"pointer",fontSize:13,lineHeight:1,
              }}>✕</button>
            </div>
          )}

          {/* ── Formation flash when XI completed ── */}
          {formationFlash && (() => {
            const f = detectFormation(squad);
            if (!f) return null;
            const [def,mid,fwd] = f.split("-");
            return (
              <div style={{
                padding:"10px 16px", borderRadius:12, marginBottom:8,
                background:"linear-gradient(90deg,rgba(40,217,122,0.15),rgba(40,217,122,0.05))",
                border:"1px solid rgba(40,217,122,0.4)",
                display:"flex", alignItems:"center", gap:10,
                animation:"slideDown 0.3s ease",
              }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="8" stroke="#28d97a" strokeWidth="1.5"/>
                  <path d="M5.5 9L8 11.5L12.5 7" stroke="#28d97a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div>
                  <div style={{ fontSize:11, fontWeight:900, color:"#9ff1b4" }}>
                    XI complete — {def}-{mid}-{fwd} auto-arranged
                  </div>
                  <div style={{ fontSize:9, color:"#3a8a5a", fontWeight:700 }}>
                    Players grouped into formation rows automatically
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Arranging flash */}
          {arranging && (
            <div style={{
              padding:"8px 14px", marginBottom:6, borderRadius:10,
              background:"rgba(40,217,122,0.12)",
              border:"1px solid rgba(40,217,122,0.35)",
              fontSize:11, fontWeight:800, color:"#9ff1b4",
              animation:"slideDown 0.2s ease",
              textAlign:"center",
            }}>
              ⚡ Auto-arranging into formation…
            </div>
          )}

          {/* PITCH — player counter */}
          <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center", marginBottom:6, gap:8 }}>
            {activeCount >= 11 && (() => {
              const f = detectFormation(squad);
              if (!f) return null;
              return (
                <div style={{ fontSize:11, fontWeight:900, color:"#67b1ff", letterSpacing:"0.04em" }}>
                  {f}
                </div>
              );
            })()}
            <div style={{
              fontSize:10, fontWeight:900, color: activeCount>=11 ? "#9ff1b4" : "#4a7a9a",
              letterSpacing:"0.08em", padding:"3px 10px",
              background: activeCount>=11 ? "rgba(40,217,122,0.1)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${activeCount>=11 ? "rgba(40,217,122,0.3)" : "rgba(255,255,255,0.07)"}`,
              borderRadius:999,
            }}>
              {activeCount}/11 on pitch
            </div>
          </div>
          <div
            style={{
              position:"relative",
              background:"linear-gradient(180deg,#08351a 0%,#0b4a24 18%,#0d5c2c 50%,#0b4a24 82%,#08351a 100%)",
              borderRadius:16,
              border:"1px solid rgba(255,255,255,0.06)",
              boxShadow:"0 12px 50px rgba(0,0,0,0.6)",
              overflow:"hidden",
              paddingBottom:16,
              transition:"opacity 0.28s ease",
              opacity: arranging ? 0.4 : 1,
            }}
            onDragOver={e=>e.preventDefault()}
            onDragLeave={e=>{ if(!e.currentTarget.contains(e.relatedTarget)) setDragOverPos(null); }}
          >
            {/* ── Pitch SVG markings ── */}
            <svg style={{
              position:"absolute",inset:0,width:"100%",height:"100%",
              pointerEvents:"none",opacity:0.18,
            }} preserveAspectRatio="none" viewBox="0 0 400 560">
              {/* Outer boundary */}
              <rect x="20" y="12" width="360" height="536" rx="3" fill="none" stroke="white" strokeWidth="1.5"/>
              {/* Centre line */}
              <line x1="20" y1="280" x2="380" y2="280" stroke="white" strokeWidth="1.5"/>
              {/* Centre circle */}
              <circle cx="200" cy="280" r="50" fill="none" stroke="white" strokeWidth="1.5"/>
              <circle cx="200" cy="280" r="3" fill="white"/>
              {/* Top penalty area */}
              <rect x="100" y="12" width="200" height="70" fill="none" stroke="white" strokeWidth="1.5"/>
              {/* Top 6-yard box */}
              <rect x="140" y="12" width="120" height="30" fill="none" stroke="white" strokeWidth="1.5"/>
              {/* Bottom penalty area */}
              <rect x="100" y="478" width="200" height="70" fill="none" stroke="white" strokeWidth="1.5"/>
              {/* Bottom 6-yard box */}
              <rect x="140" y="518" width="120" height="30" fill="none" stroke="white" strokeWidth="1.5"/>
              {/* Penalty spots */}
              <circle cx="200" cy="95" r="3" fill="white"/>
              <circle cx="200" cy="465" r="3" fill="white"/>
              {/* Corner arcs */}
              <path d="M20,12 Q32,12 32,24" fill="none" stroke="white" strokeWidth="1.5"/>
              <path d="M380,12 Q368,12 368,24" fill="none" stroke="white" strokeWidth="1.5"/>
              <path d="M20,548 Q32,548 32,536" fill="none" stroke="white" strokeWidth="1.5"/>
              <path d="M380,548 Q368,548 368,536" fill="none" stroke="white" strokeWidth="1.5"/>
            </svg>

            {/* ── Position zone highlight when dragging from avail list ── */}
            {dragOverPos && (
              <div style={{
                position:"absolute", inset:0, zIndex:0, pointerEvents:"none",
                display:"flex", flexDirection:"column",
              }}>
                {["FWD","MID","DEF","GK"].map(pos => (
                  <div key={pos} style={{
                    flex:1,
                    background: dragOverPos === pos
                      ? "rgba(40,217,122,0.08)"
                      : "transparent",
                    borderBottom: dragOverPos === pos
                      ? "1px solid rgba(40,217,122,0.15)"
                      : "none",
                    transition:"background 0.2s ease",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    {dragOverPos === pos && (
                      <div style={{
                        fontSize:11, fontWeight:800, color:"rgba(40,217,122,0.4)",
                        letterSpacing:"0.1em", pointerEvents:"none",
                      }}>{pos} ZONE ↓</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── TOP GOAL POST (opponent goal) ── */}
            <div style={{ display:"flex",justifyContent:"center",paddingTop:6,marginBottom:2,position:"relative",zIndex:2 }}>
              <svg width="120" height="22" viewBox="0 0 120 22" style={{ opacity:0.7 }}>
                <line x1="10" y1="2" x2="110" y2="2" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <line x1="10" y1="2" x2="10" y2="22" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <line x1="110" y1="2" x2="110" y2="22" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>

            {/* ════ DYNAMIC PITCH ROWS — auto-arranged ════
                Rows are rendered top→bottom: FWD, MID, DEF, GK
                Filled players are shown; empty slots shown as drop zones
                based on remaining capacity per position.         */}
            {(() => {
              const rows = buildLineupRows(squad);
              const ghosts = buildGhostSlots(squad);
              const full = rows.total >= 11;

              // Row renderer: takes filled entries + empty slot indices
              function PitchRow({ filled, emptySlots, posLabel, padTop="14px" }) {
                const totalShown = filled.length + emptySlots.length;
                // Clamp gap so wider rows still look ok
                const gap = totalShown >= 5 ? 6 : 10;
                return (
                  <div style={{
                    display:"flex", justifyContent:"center", alignItems:"flex-start",
                    gap, padding:`${padTop} 8px 0`, position:"relative", zIndex:2,
                  }}>
                    {/* Filled player cards */}
                    {filled.map(({ player, slotIdx:idx }) => (
                      <PitchSlot key={idx} idx={idx}
                        player={player}
                        isSelected={selectedSlot===idx}
                        isDragOver={dragOverSlot===idx}
                        isBench={false}
                        isInactive={false}
                        onClick={()=>handleSlotClick(idx)}
                        onDragStart={()=>onSlotDragStart(idx)}
                        onDragEnter={()=>setDragOverSlot(idx)}
                        onDragLeave={()=>setDragOverSlot(null)}
                        onDrop={()=>onSlotDrop(idx)}
                      />
                    ))}
                    {/* Ghost / empty drop slots */}
                    {emptySlots.map(idx => (
                      <PitchSlot key={idx} idx={idx}
                        player={null}
                        isSelected={selectedSlot===idx}
                        isDragOver={dragOverSlot===idx}
                        isBench={false}
                        isInactive={isSlotInactive(idx)}
                        onClick={()=>handleSlotClick(idx)}
                        onDragStart={()=>onSlotDragStart(idx)}
                        onDragEnter={()=>setDragOverSlot(idx)}
                        onDragLeave={()=>setDragOverSlot(null)}
                        onDrop={()=>onSlotDrop(idx)}
                      />
                    ))}
                  </div>
                );
              }

              return (
                <>
                  {/* FWD row */}
                  <PitchRow filled={rows.fwd} emptySlots={ghosts.emptyFWD} posLabel="FWD" padTop="6px"/>
                  {/* MID row */}
                  <PitchRow filled={rows.mid} emptySlots={ghosts.emptyMID} posLabel="MID"/>
                  {/* DEF row */}
                  <PitchRow filled={rows.def} emptySlots={ghosts.emptyDEF} posLabel="DEF"/>
                  {/* GK row */}
                  <PitchRow filled={rows.gk}  emptySlots={ghosts.emptyGK}  posLabel="GK" padTop="14px"/>

                  {/* Large position drop zones — visible when dragging from avail list */}
                  {!full && dragSrc.current?.type === "avail" && (
                    <div style={{
                      position:"absolute", inset:0, zIndex:1,
                      pointerEvents:"none",
                      display:"flex", flexDirection:"column",
                    }}>
                      {/* Translucent hover-zone overlays per position band */}
                      {["FWD","MID","DEF","GK"].map((pos,pi) => {
                        const firstSlotOfPos = { FWD:11, MID:6, DEF:1, GK:0 }[pos];
                        return (
                          <div key={pos} style={{
                            flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                            pointerEvents:"all",
                          }}
                          onDragOver={e=>{ e.preventDefault(); e.dataTransfer.dropEffect="move"; }}
                          onDrop={e=>{
                            e.preventDefault();
                            // Find first empty slot of this position
                            const slotMap = { FWD:[11,12,13], MID:[6,7,8,9,10], DEF:[1,2,3,4,5], GK:[0] };
                            const src = dragSrc.current;
                            if (!src || src.type !== "avail") return;
                            const p = src.player;
                            if (p.position !== pos) return; // wrong position
                            const emptySlot = slotMap[pos].find(i => !squad[i] && !isSlotInactive(i));
                            if (emptySlot == null) return;
                            doTransfer(emptySlot, p);
                            dragSrc.current = null;
                          }}
                          />
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}

            {/* ── BOTTOM GOAL POST (our goal) ── */}
            <div style={{ display:"flex",justifyContent:"center",padding:"14px 0 8px",position:"relative",zIndex:2 }}>
              <svg width="120" height="22" viewBox="0 0 120 22" style={{ opacity:0.7 }}>
                <line x1="10" y1="20" x2="110" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <line x1="10" y1="0" x2="10" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <line x1="110" y1="0" x2="110" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          {/* ── BENCH — with grass ── */}
          <div className="sb-bench-tray" onDragOver={e=>e.preventDefault()}>
            <div className="sb-bench-tray-label">Bench</div>
            <div className="sb-bench-tray-cards">
              {[14,15,16,17].map(idx => (
                <PitchSlot key={idx} idx={idx}
                  player={squad[idx]}
                  isSelected={selectedSlot===idx}
                  isDragOver={dragOverSlot===idx}
                  isBench={true}
                  onClick={()=>handleSlotClick(idx)}
                  onDragStart={()=>onSlotDragStart(idx)}
                  onDragEnter={()=>setDragOverSlot(idx)}
                  onDragLeave={()=>setDragOverSlot(null)}
                  onDrop={()=>onSlotDrop(idx)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ════ RIGHT: Available players ════ */}
        <div style={{ display:"flex",flexDirection:"column",gap:6,minHeight:0 }}>

          {/* Header */}
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:6 }}>
            <div style={{ fontSize:10,fontWeight:900,color:"#4a7a9a",letterSpacing:"0.12em",paddingTop:2 }}>
              AVAILABLE PLAYERS
              {selectedSlot !== null && squad[selectedSlot] && (
                <span style={{ marginLeft:6,color:"#3b9eff",fontWeight:900 }}>
                  — replacing {squad[selectedSlot]?.name||SLOT_POSITION[selectedSlot]}
                </span>
              )}
            </div>
            <div style={{ fontSize:10,color:"#4a7a9a",fontFamily:"DM Mono,monospace" }}>
              {availablePlayers.length} players
            </div>
          </div>

          {/* Position pills */}
          <div style={{ display:"flex",gap:4 }}>
            {["ALL","GK","DEF","MID","FWD"].map(p => {
              const active=posFilter===p;
              const posColor={GK:"#ffc107",DEF:"#4f9eff",MID:"#9ff1b4",FWD:"#ff6b35",ALL:"#4f9eff"}[p];
              return (
                <button key={p} onClick={()=>setPosFilter(p)} style={{
                  flex:1,padding:"6px 4px",borderRadius:8,fontSize:10,fontWeight:900,cursor:"pointer",
                  background:active?posColor+"20":"rgba(255,255,255,0.03)",
                  border:`1.5px solid ${active?posColor+"60":"rgba(255,255,255,0.06)"}`,
                  color:active?posColor:"#5a8aaa",
                  transition:"all 0.14s ease",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:1,
                }}>
                  <span>{p}</span>
                </button>
              );
            })}
          </div>

          {/* Search + sort */}
          <div style={{ display:"flex",gap:6 }}>
            <div style={{ position:"relative",flex:1 }}>
              <span style={{ position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:12,opacity:0.3,pointerEvents:"none" }}>🔍</span>
              <input value={searchQ} onChange={e=>setSearchQ(e.target.value)}
                placeholder="Search player…"
                style={{
                  width:"100%",padding:"7px 10px 7px 28px",borderRadius:9,fontSize:11,
                  background:"rgba(255,255,255,0.05)",
                  border:"1px solid rgba(255,255,255,0.1)",
                  color:"#e8f0ff",outline:"none",
                  boxSizing:"border-box",
                  transition:"border-color 0.15s",
                }}
                onFocus={e=>{e.currentTarget.style.borderColor="rgba(59,158,255,0.4)";}}
                onBlur={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";}}
              />
            </div>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{
              padding:"7px 8px",borderRadius:9,fontSize:11,
              background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",
              color:"#c8d8f0",outline:"none",cursor:"pointer",flexShrink:0,
            }}>
              <option value="pts">↑ Pts</option>
              <option value="cost">↑ £</option>
              <option value="form">↑ Form</option>
              <option value="ict">↑ ICT</option>
            </select>
          </div>

          {/* Legend row */}
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <div style={{
              flex:1, fontSize:9.5, color:"#4a6a8a", padding:"5px 10px",
              background:"rgba(255,255,255,0.02)", borderRadius:7,
              border:"1px dashed rgba(255,255,255,0.05)", minWidth:0,
            }}>
              Click to auto-place · Drag to pitch · ▼ for stats
            </div>
            <div style={{display:"flex",gap:8,flexShrink:0}}>
              {[["#28d97a","Available"],["#ffaa44","Doubtful"],["#ff4d6d","Injured"]].map(([c,l])=>(
                <span key={l} style={{display:"flex",alignItems:"center",gap:3,fontSize:8.5,color:"#4a6a8a"}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:c,flexShrink:0}}/>
                  {l}
                </span>
              ))}
            </div>
          </div>

          {/* Player list */}
          <div className="avail-scroll" style={{
            overflowY:"auto",
            maxHeight:"calc(100vh - 320px)",
            display:"flex",flexDirection:"column",gap:3,
          }}>
            {availablePlayers.slice(0,80).map(p => {
              const { blocked, reason } = availBlocked(p);
              return (
                <AvailRow
                  key={p.player_id}
                  player={p}
                  isHighlighted={compareMode &&
                    (compareA?.player_id===p.player_id || compareB?.player_id===p.player_id)}
                  blocked={blocked}
                  blockReason={reason}
                  isDragOver={dragOverAvail===p.player_id}
                  onClick={()=>handleAvailClick(p)}
                  onDragStart={(e)=>onAvailDragStart(p,e)}
                  onDragEnd={onDragEnd}
                  onDragEnter={()=>setDragOverAvail(p.player_id)}
                  onDragLeave={()=>setDragOverAvail(null)}
                  onDrop={()=>onAvailDrop(p)}
                />
              );
            })}
            {availablePlayers.length===0 && (
              <div style={{ textAlign:"center",padding:36,color:"#2a4a6a",fontSize:12 }}>
                No players match these filters
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}