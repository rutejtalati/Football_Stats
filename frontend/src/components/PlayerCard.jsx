// components/PlayerCard.jsx  — v5
// Fixes: shirt dual-CDN fallback, compact front face (no stats on front),
// arc meter, tier bar, form wave, difficulty tint, hex cap badge, ownership stripe

import { useState } from "react";

// ─── Data maps ─────────────────────────────────────────────
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
const DIFF_COLORS = {
  1:{bg:"#1a6e38",txt:"#b6ffd1"},2:{bg:"#1a6e38",txt:"#b6ffd1"},
  3:{bg:"#7a5c14",txt:"#ffe8a0"},4:{bg:"#7a1c1c",txt:"#ffd0d0"},
  5:{bg:"#4a0808",txt:"#ffb0b0"},
};
const DIFF_TINT = {
  1:"rgba(32,197,101,0.08)",2:"rgba(32,197,101,0.05)",
  3:"rgba(0,0,0,0)",
  4:"rgba(229,87,87,0.08)",5:"rgba(140,32,32,0.12)",
};
const TIER_STYLE = {
  elite:{ bar:"#28d97a", border:"rgba(40,217,122,0.55)", glow:"0 0 10px rgba(40,217,122,0.35)" },
  high: { bar:"#3b9eff", border:"rgba(59,158,255,0.45)", glow:"0 0 8px rgba(59,158,255,0.28)" },
  good: { bar:"#f2c94c", border:"rgba(242,201,76,0.38)", glow:"none" },
  base: { bar:"rgba(255,255,255,0.1)", border:"rgba(255,255,255,0.12)", glow:"none" },
};

// ─── Helpers ───────────────────────────────────────────────
function getTier(pts) {
  if (pts >= 9)   return "elite";
  if (pts >= 7)   return "high";
  if (pts >= 5.5) return "good";
  return "base";
}
function resolveName(p) { return p?.name || p?.player || p?.web_name || ""; }
function shortName(n) {
  if (!n) return "?";
  const p = n.trim().split(" ").filter(Boolean);
  return p.length === 1 ? p[0] : `${p[0][0]}. ${p[p.length-1]}`;
}

// ─── Shirt with dual-CDN fallback ─────────────────────────
function Shirt({ team, isGK=false, size=52 }) {
  // Three states: "primary" → try FPL CDN; "secondary" → try resources CDN; "fallback" → CSS box
  const [state, setState] = useState("primary");
  const id = SHIRT_IDS[team];
  const suffix = isGK ? `_1-66.png` : `-66.png`;
  const primaryUrl   = id ? `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${id}${suffix}` : null;
  const secondaryUrl = id ? `https://resources.premierleague.com/premierleague/shirts/standard/shirt_${id}${suffix}` : null;

  const bg  = isGK ? (GK_COLORS[team]||"#ffd600") : (TEAM_COLORS[team]||"#4f8cff");
  const tc  = ["FUL","WOL","AVL","MCI"].includes(team) ? "#111" : "#fff";

  if (state === "fallback" || !id) {
    return (
      <div style={{
        width:size, height:size*0.88, borderRadius:7,
        background:`linear-gradient(160deg,${bg},${bg}cc)`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:size*0.2, fontWeight:900, color:tc,
        boxShadow:`0 3px 12px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.15)`,
        letterSpacing:"0.03em", flexShrink:0,
      }}>{isGK?"GK":(team||"?").slice(0,3)}</div>
    );
  }
  if (state === "secondary") {
    return (
      <img src={secondaryUrl} alt={team||""} width={size} height={size}
        style={{ objectFit:"contain", display:"block", filter:"drop-shadow(0 3px 8px rgba(0,0,0,0.6))", flexShrink:0 }}
        onError={() => setState("fallback")}/>
    );
  }
  return (
    <img src={primaryUrl} alt={team||""} width={size} height={size}
      style={{ objectFit:"contain", display:"block", filter:"drop-shadow(0 3px 8px rgba(0,0,0,0.6))", flexShrink:0 }}
      onError={() => setState("secondary")}/>
  );
}

// ─── 1. Arc meter ──────────────────────────────────────────
function ArcMeter({ pts, tier, isBench }) {
  const MAX=12, R=isBench?14:17, SW=isBench?2.8:3.2;
  const cx=R+SW, cy=R+SW, W=(R+SW)*2;
  const spanDeg=220, startDeg=160;
  const fill=Math.min(pts/MAX,1)*spanDeg;
  const toRad=d=>(d*Math.PI)/180;
  const arc=(sd,sw)=>{
    const s={x:cx+R*Math.cos(toRad(sd)),y:cy+R*Math.sin(toRad(sd))};
    const e={x:cx+R*Math.cos(toRad(sd+sw)),y:cy+R*Math.sin(toRad(sd+sw))};
    return `M${s.x} ${s.y}A${R} ${R} 0 ${sw>180?1:0} 1 ${e.x} ${e.y}`;
  };
  const col=tier==="elite"?"#28d97a":tier==="high"?"#3b9eff":tier==="good"?"#f2c94c":"#4a6a8a";
  const fs=isBench?8.5:10;
  return (
    <svg width={W} height={W*0.72} viewBox={`0 0 ${W} ${W*0.72}`}
      style={{display:"block",overflow:"visible",flexShrink:0}}>
      <path d={arc(startDeg,spanDeg)} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={SW} strokeLinecap="round"/>
      {fill>2&&<path d={arc(startDeg,fill)} fill="none" stroke={col} strokeWidth={SW} strokeLinecap="round"
        style={{filter:`drop-shadow(0 0 3px ${col}99)`}}/>}
      <text x={cx} y={cy-1} textAnchor="middle" dominantBaseline="middle"
        fontSize={fs} fontWeight="900" fill={col} fontFamily="DM Mono,monospace">
        {pts.toFixed(1)}
      </text>
    </svg>
  );
}

// ─── 3. Form wave ──────────────────────────────────────────
function FormWave({ player, isBench }) {
  const W=isBench?50:62, H=12, pad=2;
  const vals=[1,2,3,4,5].map(i=>Number(player[`pts_gw_${i}`]||0));
  const max=Math.max(...vals,1);
  const pts=vals.map((v,i)=>({
    x:pad+(i/(vals.length-1))*(W-pad*2),
    y:H-pad-((v/max)*(H-pad*2)),
  }));
  const d=pts.map((p,i)=>`${i===0?"M":"L"}${p.x} ${p.y}`).join(" ");
  const uid=`fw${player.player_id||player.id||"x"}`;
  const next=vals[0], last=vals[vals.length-1];
  const col=next>last?"#28d97a":next<last?"#ff6b6b":"#67b1ff";
  return (
    <svg width={W} height={H} style={{display:"block",overflow:"visible",opacity:0.85}}>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(103,177,255,0.4)"/>
          <stop offset="100%" stopColor={col}/>
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke={`url(#${uid})`}
        strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={pts[0].x} cy={pts[0].y} r="2.2"
        fill={col} stroke="rgba(0,0,0,0.7)" strokeWidth="0.8"
        style={{filter:`drop-shadow(0 0 2px ${col})`}}/>
    </svg>
  );
}

// ─── 5. Captain hex badge ──────────────────────────────────
function CapBadge({ isCaptain, isViceCaptain }) {
  if (!isCaptain && !isViceCaptain) return null;
  const isC=isCaptain;
  const uid=`cap_${isC?"c":"vc"}`;
  return (
    <div style={{position:"absolute",top:-10,right:-10,zIndex:25,
      animation:isC?"capGoldSpin 2.8s ease-in-out infinite":"none"}}>
      <svg width={22} height={22} viewBox="0 0 22 22"
        style={{filter:`drop-shadow(0 0 ${isC?"5px rgba(242,201,76,0.9)":"4px rgba(103,177,255,0.7)"})`}}>
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isC?"#ffe066":"#c8e6ff"}/>
            <stop offset="100%" stopColor={isC?"#c97d00":"#2a7ad4"}/>
          </linearGradient>
        </defs>
        <path d="M11 1L20 6L20 16L11 21L2 16L2 6Z"
          fill={`url(#${uid})`} stroke={isC?"rgba(255,220,80,0.4)":"rgba(180,220,255,0.3)"} strokeWidth="0.7"/>
        <text x="11" y="14.5" textAnchor="middle"
          fontSize="9" fontWeight="900" fill={isC?"#1a0e00":"#061428"}
          fontFamily="DM Mono,monospace">{isC?"C":"V"}</text>
      </svg>
    </div>
  );
}

// ─── 6. Ownership stripe ───────────────────────────────────
function OwnerStripe({ pct }) {
  const w=Math.min(pct/60*100,100);
  const col=pct<5?"#28d97a":pct<25?"#67b1ff":"#f2c94c";
  return (
    <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,
      background:"rgba(255,255,255,0.04)",borderRadius:"0 0 10px 10px",overflow:"hidden"}}>
      <div style={{height:"100%",width:w+"%",background:col,borderRadius:"0 0 2px 2px",
        transition:"width 0.6s ease",boxShadow:`0 0 4px ${col}88`}}/>
    </div>
  );
}

// ─── Card Back ─────────────────────────────────────────────
function CardBack({ player }) {
  const pts =Number(player.projected_points||0);
  const form=Number(player.form||0);
  const prob=Math.round((player.appearance_prob||player.prob_appear||0)*100);
  const own =Number(player.selected_by_pct||0);
  const ict =Number(player.ict_index||0);
  const ptsCol =pts>=9?"#28d97a":pts>=6?"#67b1ff":"#c8d8f0";
  const probCol=prob>=90?"#28d97a":prob>=70?"#f2c94c":"#ff6b6b";
  const ownCol =own>30?"#f2c94c":own>10?"#67b1ff":"#28d97a";
  const rows=[
    {lbl:"PROJ", val:`${pts.toFixed(1)}`, col:ptsCol},
    {lbl:"FORM", val:form.toFixed(1),     col:form>=5?"#28d97a":"#c8d8f0"},
    {lbl:"£",    val:`${player.cost}m`,   col:"#c8d8f0"},
    {lbl:"APP",  val:`${prob}%`,          col:probCol},
    {lbl:"OWN",  val:`${own.toFixed(0)}%`,col:ownCol},
    {lbl:"ICT",  val:ict.toFixed(1),      col:"#b388ff"},
  ];
  return (
    <div className="ptile-face ptile-back">
      <div className="ptile-back-name">{resolveName(player)||"?"}</div>
      <div style={{width:"100%",padding:"1px 3px 0"}}>
        <FormWave player={player} isBench={false}/>
      </div>
      <div className="ptile-back-rows">
        {rows.map(r=>(
          <div key={r.lbl} className="ptile-back-row">
            <span className="ptile-back-row-lbl">{r.lbl}</span>
            <span className="ptile-back-row-val" style={{color:r.col}}>{r.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Card Front — CLEAN, no stats ─────────────────────────
function CardFront({ player, isBench, diff, tier, tierSt, isGK }) {
  const pts     = Number(player.projected_points||0);
  const own     = Number(player.selected_by_pct||0);
  const tint    = DIFF_TINT[player.fixture_difficulty]||"rgba(0,0,0,0)";
  const shirtSz = isBench ? 38 : 48;

  return (
    <div className="ptile-face ptile-front" style={{
      // 4. Difficulty tint via inner glow
      boxShadow:`inset 0 0 28px ${tint}, ${tierSt.glow}, 0 4px 14px rgba(0,0,0,0.5)`,
      // 2. Tier left bar
      borderLeft:`3px solid ${tierSt.bar}`,
      borderTop:`1.5px solid ${tierSt.border}`,
      borderRight:`1.5px solid ${tierSt.border}`,
      borderBottom:"none",
      paddingBottom:6,
    }}>
      {/* Shirt — uses 3-state fallback component */}
      <div className="ptile-shirt-wrap">
        <Shirt team={player.team} isGK={isGK} size={shirtSz}/>
      </div>

      {/* 3. Form wave — slim line under shirt */}
      <div style={{width:"100%",display:"flex",justifyContent:"center",marginTop:1}}>
        <FormWave player={player} isBench={isBench}/>
      </div>

      {/* Name pill */}
      <div className="ptile-name">{shortName(resolveName(player))}</div>

      {/* Fixture chip */}
      {player.next_opp&&(
        <div className="ptile-fixture" style={{background:diff.bg,color:diff.txt}}>
          {player.next_opp}
        </div>
      )}

      {/* 1. Arc meter — replaces flat number */}
      <ArcMeter pts={pts} tier={tier} isBench={isBench}/>

      {/* Flip hint */}
      <div className="ptile-flip-hint">↺</div>

      {/* 6. Ownership stripe */}
      <OwnerStripe pct={own}/>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────
export default function PlayerCard({
  player, isCaptain, isViceCaptain, isTopProjected,
  dropActive, size="starter", draggable,
  onDragStart, onDragOver, onDrop,
  onAction, label, maxProjected,
}) {
  const [flipped,setFlipped]=useState(false);
  if (!player) return null;

  const isGK   = player.position==="GK";
  const pts    = Number(player.projected_points||0);
  const tier   = getTier(pts);
  const tierSt = TIER_STYLE[tier];
  const diff   = DIFF_COLORS[player.fixture_difficulty]||DIFF_COLORS[3];
  const isBench= size==="bench";

  return (
    <div
      className={["ptile",isBench?"ptile-bench":"ptile-starter",
        dropActive?"ptile-drop-active":"",isTopProjected?"ptile-top":"",
        flipped?"ptile-flipped":""].filter(Boolean).join(" ")}
      style={{perspective:"600px",position:"relative"}}
      draggable={draggable}
      onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop}
      onMouseEnter={()=>setFlipped(true)}
      onMouseLeave={()=>setFlipped(false)}
    >
      {/* 5. Hex captain badge */}
      <CapBadge isCaptain={isCaptain} isViceCaptain={isViceCaptain}/>

      <div className="ptile-flipper">
        <CardFront player={player} isBench={isBench} diff={diff}
          tier={tier} tierSt={tierSt} isGK={isGK}/>
        <CardBack player={player}/>
      </div>
    </div>
  );
}