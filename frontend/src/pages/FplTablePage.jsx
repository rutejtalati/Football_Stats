// pages/FplTablePage.jsx — MOBILE RESPONSIVE
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getFplPredictorTable } from "../api/api";

/* ── Responsive hook ── */
function useIsMobile(bp = 768) {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < bp : false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return m;
}

const TEAM_COLORS = {
  ARS:"#ef0107",AVL:"#95bfe5",BOU:"#da291c",BRE:"#e30613",
  BHA:"#0057b8",BUR:"#6c1d45",CHE:"#034694",CRY:"#1b458f",
  EVE:"#003399",FUL:"#ffffff",LIV:"#c8102e",MCI:"#6cabdd",
  MUN:"#da291c",NEW:"#241f20",NFO:"#dd0000",SUN:"#eb172b",
  TOT:"#132257",WHU:"#7a263a",WOL:"#fdb913",
};

const TEAM_BADGES = {
  ARS:"https://resources.premierleague.com/premierleague/badges/50/t3.png",
  AVL:"https://resources.premierleague.com/premierleague/badges/50/t7.png",
  BOU:"https://resources.premierleague.com/premierleague/badges/50/t91.png",
  BRE:"https://resources.premierleague.com/premierleague/badges/50/t94.png",
  BHA:"https://resources.premierleague.com/premierleague/badges/50/t36.png",
  BUR:"https://resources.premierleague.com/premierleague/badges/50/t90.png",
  CHE:"https://resources.premierleague.com/premierleague/badges/50/t8.png",
  CRY:"https://resources.premierleague.com/premierleague/badges/50/t31.png",
  EVE:"https://resources.premierleague.com/premierleague/badges/50/t11.png",
  FUL:"https://resources.premierleague.com/premierleague/badges/50/t54.png",
  LIV:"https://resources.premierleague.com/premierleague/badges/50/t14.png",
  MCI:"https://resources.premierleague.com/premierleague/badges/50/t43.png",
  MUN:"https://resources.premierleague.com/premierleague/badges/50/t1.png",
  NEW:"https://resources.premierleague.com/premierleague/badges/50/t4.png",
  NFO:"https://resources.premierleague.com/premierleague/badges/50/t17.png",
  SUN:"https://resources.premierleague.com/premierleague/badges/50/t56.png",
  TOT:"https://resources.premierleague.com/premierleague/badges/50/t6.png",
  WHU:"https://resources.premierleague.com/premierleague/badges/50/t21.png",
  WOL:"https://resources.premierleague.com/premierleague/badges/50/t39.png",
};

const METRIC_TOOLTIPS = {
  merit:"Overall player ranking based on form, projections, and attacking profile.",
  form:"Recent FPL output trend.",
  goal_threat:"Goal-scoring threat in the current projection model.",
  chance_creation:"Chance creation and assist potential.",
  attack_involvement:"Combined attacking involvement.",
  captain_score:"Captain suitability score.",
  fixture_difficulty:"How difficult the next fixture is.",
  fixture_run_score:"Strength of the next run of fixtures.",
  safe_pick_score:"Reliability based on minutes, availability, form.",
  ppc:"Projected points relative to player cost.",
  next5:"Expected total points across the next 5 gameweeks.",
  prob_appear:"Probability of appearing in the next round.",
  availability_status:"Combined availability information and injury news.",
  minutes_security:"How secure the player's minutes are.",
  transfer_momentum:"Net transfer movement this gameweek.",
};

function clamp(num, min, max) { return Math.max(min, Math.min(max, num)); }

function getGradientColor(value, minValue, maxValue) {
  const num = Number(value);
  if (Number.isNaN(num) || maxValue <= minValue) return "transparent";
  const ratio = clamp((num - minValue) / (maxValue - minValue), 0, 1);
  if (ratio <= 0.2)  return "#4b0f13";
  if (ratio <= 0.4)  return "#8e1b1b";
  if (ratio <= 0.6)  return "#c26519";
  if (ratio <= 0.75) return "#d8b53e";
  if (ratio <= 0.9)  return "#8ccf6d";
  return "#19b45a";
}
function getTextColor(bg) {
  return ["#d8b53e","#8ccf6d","#19b45a"].includes(bg) ? "#06110a" : "#ffffff";
}
function formatPlayerName(name) {
  if (!name) return "-";
  const clean = String(name).replace(/\s+/g," ").trim();
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length <= 2) return clean;
  const lp = parts.map(p=>p.toLowerCase());
  const conn = ["van","von","de","da","del","di","la","le"];
  const sl = lp[parts.length-2];
  if (conn.includes(sl)) return `${parts[parts.length-2]} ${parts[parts.length-1]}`;
  return `${parts[0]} ${parts[parts.length-1]}`;
}
function getTeamTextColor(team) {
  return ["FUL","WOL","AVL","MCI"].includes(team) ? "#050505" : "#ffffff";
}
function extractInjuryNote(row) {
  const candidates=[row?.news,row?.status_text,row?.injury_note,row?.injury,row?.availability_note];
  const note=candidates.find(item=>typeof item==="string"&&item.trim()&&!["none","available","fit"].includes(item.trim().toLowerCase()));
  return note?note.trim():"";
}
function formatAvailabilityStatus(row) {
  const ap=Number(row?.availability_pct),oc=Number(row?.official_chance);
  const oa=String(row?.official_availability||"").trim(),note=extractInjuryNote(row);
  if(!Number.isNaN(oc)){if(oc>=100&&!note)return"100%";return note?`${oc}% • ${note}`:`${oc}%`;}
  if(!Number.isNaN(ap)){if(ap>=100&&!note)return"100%";return note?`${ap}% • ${note}`:`${ap}%`;}
  if(oa){const l=oa.toLowerCase();if(l==="available"&&!note)return"100%";return note?`${oa} • ${note}`:oa;}
  return note||"-";
}
function formatSignedNumber(value) {
  const n=Number(value);if(Number.isNaN(n))return"-";
  if(n>0)return`+${n.toLocaleString()}`;return n.toLocaleString();
}
function getScoreLabel(score){if(score>=80)return"High";if(score>=60)return"Good";if(score>=40)return"Med";return"Low";}
function getDifficultyLabel(score){if(score>=0.72)return"Easy";if(score>=0.45)return"Medium";return"Hard";}
function getFixtureDifficultyNumber(score){const l=getDifficultyLabel(score);if(l==="Easy")return 2;if(l==="Medium")return 3;return 5;}

function HeatCell({value,minValue,maxValue,title,displayValue,onMouseEnter,onMouseLeave}){
  const bg=getGradientColor(Number(value),minValue,maxValue);
  return<td title={title} style={{background:bg,color:getTextColor(bg),fontWeight:700,fontSize:13}}
    onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
  >{displayValue??value}</td>;
}
function DifficultyPill({label}){
  const colors={Easy:{bg:"#1f7d3d",fg:"#eafff1"},Medium:{bg:"#a87d1b",fg:"#fff7df"},Hard:{bg:"#8f2424",fg:"#fff0f0"}};
  const c=colors[label]||{bg:"#2d2d2d",fg:"#fff"};
  return<span style={{display:"inline-block",marginLeft:6,padding:"2px 7px",borderRadius:999,background:c.bg,color:c.fg,fontSize:10,fontWeight:700}}>{label}</span>;
}
function SortArrow({active,dir}){
  if(!active)return<span style={{opacity:0.2,marginLeft:4,fontSize:10}}>↕</span>;
  return<span style={{marginLeft:4,fontSize:10,color:"#67b1ff"}}>{dir==="asc"?"↑":"↓"}</span>;
}
function RankBadge({rank}){
  const gold=rank===1,silver=rank===2,bronze=rank===3;
  const bg=gold?"#c8972a":silver?"#8a9aaa":bronze?"#9b6840":"rgba(255,255,255,0.06)";
  const fg=gold||silver||bronze?"#fff":"#5a7a9a";
  return<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:22,height:22,borderRadius:5,background:bg,color:fg,fontSize:10,fontWeight:800,flexShrink:0,boxShadow:gold?"0 0 8px rgba(200,151,42,0.5)":"none"}}>{rank}</span>;
}

export default function FplTablePage() {
  const isMobile = useIsMobile();
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [team, setTeam]         = useState("ALL");
  const [position, setPosition] = useState("ALL");
  const [maxCost, setMaxCost]   = useState(15.5);
  const [minProb, setMinProb]   = useState(0);
  const [startGw, setStartGw]   = useState(30);
  const [search, setSearch]     = useState("");
  const [sortKey, setSortKey]   = useState("next5_points");
  const [sortOrder, setSortOrder]= useState("desc");
  const [showFilters, setShowFilters] = useState(!isMobile);
  const [tooltip, setTooltip]     = useState(null); // {key, x, y}
  const [modalPlayer, setModalPlayer] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const tableData = await getFplPredictorTable({start_gw:startGw,max_cost:maxCost,min_prob:minProb,team,position});
        if (cancelled) return;
        setRows(tableData.rows||[]);
        setLoading(false);
      } catch(err) { console.error(err); if(!cancelled)setLoading(false); }
    }
    load();
    return () => { cancelled=true; };
  }, [team, position, maxCost, minProb, startGw]);

  const enrichedRows = useMemo(()=>rows.map(r=>{
    const creativity=Number(r.creativity||0),threat=Number(r.threat||0);
    const influence=Number(r.influence||0),ict=Number(r.ict_index||0);
    const form=Number(r.form||0),ppc=Number(r.value_rest_season||0);
    const p1=Number(r.pts_gw_1||0),p2=Number(r.pts_gw_2||0),p3=Number(r.pts_gw_3||0);
    const p4=Number(r.pts_gw_4||0),p5=Number(r.pts_gw_5||0);
    const next5=p1+p2+p3+p4+p5;
    const gt=Number((threat/55+ict/24).toFixed(2));
    const cc=Number((creativity/70+influence/180).toFixed(2));
    const ai=Number((gt+cc).toFixed(2));
    const appearance=Number(r.prob_appear||0);
    const oc=Number(r.official_chance),ap=Number(r.availability_pct);
    const cs=Number((p1*0.58+ai*1.2+appearance*2.4+ppc*0.42).toFixed(2));
    const fes=clamp(p1/8.5,0,1);
    const fl=getDifficultyLabel(fes),fd=getFixtureDifficultyNumber(fes);
    const injp=extractInjuryNote(r)?12:0;
    const avr=!Number.isNaN(oc)?oc:!Number.isNaN(ap)?ap:appearance*100;
    const ms=Number(clamp(appearance*65+(avr/100)*30+clamp(form/8,0,1)*5-injp,0,100).toFixed(1));
    const frs=Number(clamp((next5/35)*100,0,100).toFixed(1));
    const sps=Number(clamp(ms*0.45+clamp(avr,0,100)*0.2+clamp((next5/30)*100,0,100)*0.2+clamp((form/8)*100,0,100)*0.15,0,100).toFixed(1));
    const tm=Number((Number(r.transfers_in_gw||0)-Number(r.transfers_out_gw||0)).toFixed(0));
    const POS_COLORS = {"GK":"#f2c94c","DEF":"#4f9eff","MID":"#00e09e","FWD":"#ff6b6b"};
    return{...r,player_display:formatPlayerName(r.player),_posColor:POS_COLORS[r.position]||"#4f9eff",goal_threat:gt,chance_creation:cc,attack_involvement:ai,
      fixture_ease_score:Number(fes.toFixed(2)),fixture_difficulty:fd,fixture_label:fl,
      points_per_cost:Number(ppc.toFixed(2)),next5_points:Number(next5.toFixed(1)),
      captain_score:cs,availability_status:formatAvailabilityStatus(r),
      minutes_security:ms,fixture_run_score:frs,safe_pick_score:sps,transfer_momentum:tm};
  }),[rows]);

  const teams=useMemo(()=>["ALL",...Array.from(new Set(enrichedRows.map(r=>r.team))).sort()],[enrichedRows]);

  function handleSort(key){
    if(sortKey===key)setSortOrder(p=>p==="asc"?"desc":"asc");
    else{setSortKey(key);setSortOrder("desc");}
  }

  const filteredRows=useMemo(()=>{
    const q=search.trim().toLowerCase();
    if(!q)return enrichedRows;
    return enrichedRows.filter(r=>
      String(r.player||"").toLowerCase().includes(q)||
      String(r.player_display||"").toLowerCase().includes(q)||
      String(r.team||"").toLowerCase().includes(q)||
      String(r.position||"").toLowerCase().includes(q)
    );
  },[enrichedRows,search]);

  const sortedRows=useMemo(()=>{
    const copy=[...filteredRows];
    if(!sortKey)return copy;
    copy.sort((a,b)=>{
      const n1=Number(a?.[sortKey]),n2=Number(b?.[sortKey]);
      if(!Number.isNaN(n1)&&!Number.isNaN(n2))return sortOrder==="asc"?n1-n2:n2-n1;
      const s1=String(a?.[sortKey]??"").toLowerCase(),s2=String(b?.[sortKey]??"").toLowerCase();
      if(s1<s2)return sortOrder==="asc"?-1:1;if(s1>s2)return sortOrder==="asc"?1:-1;return 0;
    });
    return copy;
  },[filteredRows,sortKey,sortOrder]);

  const metricRanges=useMemo(()=>{
    const range=key=>({min:Math.min(...sortedRows.map(r=>Number(r[key]||0)),0),max:Math.max(...sortedRows.map(r=>Number(r[key]||0)),0)});
    return{merit:range("merit"),form:range("form"),prob_appear:range("prob_appear"),
      pts_gw_1:range("pts_gw_1"),pts_gw_2:range("pts_gw_2"),pts_gw_4:range("pts_gw_4"),
      pts_rest_season:range("pts_rest_season"),value_rest_season:range("value_rest_season"),
      points_so_far:range("points_so_far"),selected_by_pct:range("selected_by_pct"),
      goal_threat:range("goal_threat"),chance_creation:range("chance_creation"),
      attack_involvement:range("attack_involvement"),fixture_difficulty:range("fixture_difficulty"),
      points_per_cost:range("points_per_cost"),next5_points:range("next5_points"),
      captain_score:range("captain_score"),minutes_security:range("minutes_security"),
      fixture_run_score:range("fixture_run_score"),safe_pick_score:range("safe_pick_score"),
      transfer_momentum:range("transfer_momentum")};
  },[sortedRows]);

  const resetFilters=()=>{setTeam("ALL");setPosition("ALL");setMaxCost(15.5);setMinProb(0);setStartGw(30);setSearch("");};

  function Th({sortable,col,children,title,style}){
    const active=sortKey===col;
    return<th onClick={sortable?()=>handleSort(col):undefined} title={title}
      style={{cursor:sortable?"pointer":"default",whiteSpace:"nowrap",...style}}>
      {children}{sortable&&<SortArrow active={active} dir={sortOrder}/>}
    </th>;
  }

  if(loading) return(
    <div className="page-shell" style={{color:"#4a7a9a",padding:24}}>
      Loading FPL table…
    </div>
  );

  return(
    <div className="page-shell" style={{paddingBottom: isMobile ? 80 : 40}}>
      <style>{`
        .fpl-tbl-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; border-radius:12px; }
        .fpl-tbl-wrap::-webkit-scrollbar { height:4px; }
        .fpl-tbl-wrap::-webkit-scrollbar-thumb { background:rgba(103,177,255,0.25); border-radius:4px; }
        /* Row hover lift */
        .fpl-tbl tbody tr {
          transition: transform 160ms cubic-bezier(0.22,1,0.36,1),
                      box-shadow 160ms ease;
          cursor: pointer;
        }
        .fpl-tbl tbody tr:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.4);
          position: relative;
          z-index: 1;
        }
        .fpl-tbl tbody tr:hover td { background:rgba(103,177,255,0.08) !important; }
        .fpl-tbl tbody tr:hover .sticky-player { background:#0d1929 !important; }
        /* Tooltip panel */
        .fpl-tooltip-panel {
          position: fixed;
          z-index: 9999;
          pointer-events: none;
          background: rgba(6,13,24,0.97);
          border: 1px solid rgba(103,177,255,0.3);
          border-radius: 12px;
          padding: 12px 16px;
          min-width: 220px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.7);
          animation: fplTooltipIn 140ms cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes fplTooltipIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        /* Player modal */
        .fpl-modal-backdrop {
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          animation: fplFadeIn 180ms ease;
        }
        @keyframes fplFadeIn { from{opacity:0} to{opacity:1} }
        .fpl-modal {
          background: #08101e;
          border: 1px solid rgba(103,177,255,0.2);
          border-radius: 20px;
          padding: 28px 28px 24px;
          width: min(560px, 94vw);
          max-height: 88vh;
          overflow-y: auto;
          position: relative;
          animation: fplModalIn 220ms cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes fplModalIn { from{opacity:0;transform:translateY(24px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        .fpl-modal::-webkit-scrollbar { width: 4px; }
        .fpl-modal::-webkit-scrollbar-thumb { background: rgba(103,177,255,0.2); border-radius:4px; }
        .fpl-tbl { border-collapse:collapse; width:100%; min-width:${isMobile?"800px":"1100px"}; }
        .fpl-tbl th { background:#060d18; color:#4a7a9a; font-size:11px; font-weight:800;
          padding:8px 10px; border-bottom:1px solid rgba(255,255,255,0.07); position:sticky; top:0; z-index:2; white-space:nowrap; letter-spacing:0.04em; }
        .fpl-tbl td { padding:6px 10px; border-bottom:1px solid rgba(255,255,255,0.04); font-size:12px; color:#c8d8f0; }
        .fpl-tbl tr:hover td { background:rgba(103,177,255,0.05); }
        .sticky-player { position:sticky; left:0; z-index:1; background:#060a14; min-width:${isMobile?"140px":"180px"}; }
        .sticky-player-head { background:#060d18 !important; z-index:3 !important; }
        .team-badge-cell { font-size:11px; font-weight:800; text-align:center; padding:4px 6px !important; }

        /* Mobile filter pills */
        .fpl-filter-pill {
          padding:6px 12px; border-radius:999px; font-size:11px; font-weight:800;
          cursor:pointer; border:1px solid rgba(255,255,255,0.1);
          background:rgba(255,255,255,0.05); color:#4a7a9a;
          font-family:inherit; white-space:nowrap; min-height:36px;
          transition:all 0.15s;
        }
        .fpl-filter-pill.active { background:rgba(103,177,255,0.18); border-color:rgba(103,177,255,0.45); color:#67b1ff; }
        .fpl-filter-pill:hover { background:rgba(255,255,255,0.09); }
      `}</style>

      <div className="page-content-wide">

        {/* ── Header + search row ── */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          flexWrap:"wrap",gap:10,marginBottom:12}}>
          <div>
            <h1 className="page-title-left" style={{marginBottom:2,fontSize:isMobile?20:26}}>FPL Analytics Table</h1>
            <div style={{fontSize:10,color:"#2a4a6a",fontWeight:700}}>
              {sortedRows.length} players · tap headers to sort · scroll right for more columns
            </div>
          </div>
          {/* Filter toggle on mobile */}
          {isMobile && (
            <button onClick={()=>setShowFilters(v=>!v)} style={{
              padding:"7px 14px",borderRadius:10,fontSize:11,fontWeight:800,
              background:showFilters?"rgba(103,177,255,0.15)":"rgba(255,255,255,0.05)",
              border:"1px solid rgba(103,177,255,0.3)",color:"#67b1ff",
              cursor:"pointer",fontFamily:"inherit",
            }}>
              {showFilters?"▲ Filters":"▼ Filters"}
            </button>
          )}
        </div>

        {/* ── Filters panel ── */}
        {(showFilters || !isMobile) && (
          <div style={{
            background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:14,padding: isMobile?"12px":"16px 20px",marginBottom:12,
          }}>
            {/* Position pills */}
            <div style={{display:"flex",gap:5,flexWrap:"nowrap",overflowX:"auto",
              WebkitOverflowScrolling:"touch",scrollbarWidth:"none",marginBottom:10,paddingBottom:2}}>
              {["ALL","GK","DEF","MID","FWD"].map(p=>(
                <button key={p} className={`fpl-filter-pill${position===p?" active":""}`}
                  onClick={()=>setPosition(p)}>{p}</button>
              ))}
              <div style={{width:1,height:28,background:"rgba(255,255,255,0.08)",flexShrink:0,alignSelf:"center"}}/>
              {teams.slice(0,isMobile?8:teams.length).map(t=>(
                <button key={t} className={`fpl-filter-pill${team===t?" active":""}`}
                  onClick={()=>setTeam(t)}>{t}</button>
              ))}
            </div>

            {/* Input row */}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr auto",gap:8}}>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                <label style={{fontSize:9,fontWeight:800,color:"#2a4a6a",letterSpacing:"0.08em"}}>MAX COST</label>
                <input type="number" step="0.1" value={maxCost} onChange={e=>setMaxCost(Number(e.target.value))}
                  style={{padding:"7px 10px",borderRadius:8,fontSize:13,background:"rgba(255,255,255,0.05)",
                    border:"1px solid rgba(255,255,255,0.1)",color:"#e8f0ff",outline:"none",minHeight:36}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                <label style={{fontSize:9,fontWeight:800,color:"#2a4a6a",letterSpacing:"0.08em"}}>START GW</label>
                <input type="number" value={startGw} onChange={e=>setStartGw(Number(e.target.value))}
                  style={{padding:"7px 10px",borderRadius:8,fontSize:13,background:"rgba(255,255,255,0.05)",
                    border:"1px solid rgba(255,255,255,0.1)",color:"#e8f0ff",outline:"none",minHeight:36}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                <label style={{fontSize:9,fontWeight:800,color:"#2a4a6a",letterSpacing:"0.08em"}}>MIN PROB</label>
                <input type="number" step="0.01" min="0" max="1" value={minProb} onChange={e=>setMinProb(Number(e.target.value))}
                  style={{padding:"7px 10px",borderRadius:8,fontSize:13,background:"rgba(255,255,255,0.05)",
                    border:"1px solid rgba(255,255,255,0.1)",color:"#e8f0ff",outline:"none",minHeight:36}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:3,gridColumn:isMobile?"1/-1":"auto"}}>
                <label style={{fontSize:9,fontWeight:800,color:"#2a4a6a",letterSpacing:"0.08em"}}>SEARCH</label>
                <input type="text" placeholder="Player, team, position…" value={search}
                  onChange={e=>setSearch(e.target.value)}
                  style={{padding:"7px 10px",borderRadius:8,fontSize:14,background:"rgba(255,255,255,0.05)",
                    border:"1px solid rgba(255,255,255,0.1)",color:"#e8f0ff",outline:"none",minHeight:36}}/>
              </div>
              <button onClick={resetFilters} style={{
                padding:"7px 14px",borderRadius:8,fontSize:11,fontWeight:800,
                background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",
                color:"#4a7a9a",cursor:"pointer",fontFamily:"inherit",
                alignSelf:"flex-end",minHeight:36,gridColumn:isMobile?"1/-1":"auto",
              }}>Clear</button>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",
          borderRadius:14,overflow:"hidden"}}>
          <div className="fpl-tbl-wrap">
            <table className="fpl-tbl">
              <thead>
                <tr>
                  <th className="sticky-player sticky-player-head">#&nbsp;&nbsp;Player</th>
                  <Th sortable col="team">Team</Th>
                  <Th sortable col="position">Pos</Th>
                  <Th sortable col="cost">Cost</Th>
                  <Th sortable col="merit" title={METRIC_TOOLTIPS.merit}>Merit</Th>
                  <Th sortable col="form" title={METRIC_TOOLTIPS.form}>Form</Th>
                  <Th sortable col="goal_threat" title={METRIC_TOOLTIPS.goal_threat}>Goal Threat</Th>
                  <Th sortable col="chance_creation" title={METRIC_TOOLTIPS.chance_creation}>Chance Cre.</Th>
                  <Th sortable col="attack_involvement" title={METRIC_TOOLTIPS.attack_involvement}>Atk Inv.</Th>
                  <Th sortable col="captain_score" title={METRIC_TOOLTIPS.captain_score}>Captain</Th>
                  <th>Next Opp</th>
                  <Th sortable col="fixture_difficulty" title={METRIC_TOOLTIPS.fixture_difficulty}>Fix Diff</Th>
                  <Th sortable col="minutes_security" title={METRIC_TOOLTIPS.minutes_security}>Mins Sec</Th>
                  <Th sortable col="fixture_run_score" title={METRIC_TOOLTIPS.fixture_run_score}>Fix Run</Th>
                  <Th sortable col="safe_pick_score" title={METRIC_TOOLTIPS.safe_pick_score}>Safe Pick</Th>
                  <Th sortable col="prob_appear" title={METRIC_TOOLTIPS.prob_appear}>Prob App</Th>
                  <th title={METRIC_TOOLTIPS.availability_status}>Avail</th>
                  <Th sortable col="pts_gw_1">GW{startGw}</Th>
                  <Th sortable col="pts_gw_2">GW{startGw+1}</Th>
                  <Th sortable col="pts_gw_4">GW{startGw+3}</Th>
                  <Th sortable col="next5_points" title={METRIC_TOOLTIPS.next5}>Next 5</Th>
                  <Th sortable col="pts_rest_season">Szn Pts</Th>
                  <Th sortable col="points_per_cost" title={METRIC_TOOLTIPS.ppc}>Pts/£</Th>
                  <Th sortable col="value_rest_season">Value</Th>
                  <Th sortable col="points_so_far">So Far</Th>
                  <Th sortable col="selected_by_pct">Own%</Th>
                  <Th sortable col="transfer_momentum" title={METRIC_TOOLTIPS.transfer_momentum}>Transfers</Th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r,idx)=>(
                  <tr key={r.player_id} className="player-row"
                    onClick={() => setModalPlayer(r)}
                    title="Click for player analytics">
                    <td className="sticky-player">
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <RankBadge rank={idx+1}/>
                        <img src={TEAM_BADGES[r.team]} alt={r.team}
                          style={{width:16,height:16,objectFit:"contain",flexShrink:0}}
                          onError={e=>{e.currentTarget.style.display="none";}}/>
                        <span style={{fontWeight:700,fontSize:isMobile?12:13,color:"#f0f6ff",
                          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:isMobile?90:140}}>
                          {r.player_display}
                        </span>
                      </div>
                    </td>
                    <td className="team-badge-cell"
                      style={{background:TEAM_COLORS[r.team]||"#222",color:getTeamTextColor(r.team)}}>
                      {r.team}
                    </td>
                    <td style={{fontWeight:700,color:"#8ab8e0",fontSize:11,letterSpacing:"0.06em"}}>{r.position}</td>
                    <td style={{fontWeight:700}}>£{r.cost}</td>
                    <HeatCell value={r.merit} minValue={metricRanges.merit.min} maxValue={metricRanges.merit.max} title={METRIC_TOOLTIPS.merit}/>
                    <HeatCell value={r.form} minValue={metricRanges.form.min} maxValue={metricRanges.form.max} title={METRIC_TOOLTIPS.form}/>
                    <HeatCell value={r.goal_threat} minValue={metricRanges.goal_threat.min} maxValue={metricRanges.goal_threat.max} title={METRIC_TOOLTIPS.goal_threat}
                      onMouseEnter={e => setTooltip({key:"goal_threat", x:e.clientX+12, y:e.clientY-8})}
                      onMouseLeave={() => setTooltip(null)}/>
                    <HeatCell value={r.chance_creation} minValue={metricRanges.chance_creation.min} maxValue={metricRanges.chance_creation.max} title={METRIC_TOOLTIPS.chance_creation}
                      onMouseEnter={e => setTooltip({key:"chance_creation", x:e.clientX+12, y:e.clientY-8})}
                      onMouseLeave={() => setTooltip(null)}/>
                    <HeatCell value={r.attack_involvement} minValue={metricRanges.attack_involvement.min} maxValue={metricRanges.attack_involvement.max} title={METRIC_TOOLTIPS.attack_involvement}
                      onMouseEnter={e => setTooltip({key:"attack_involvement", x:e.clientX+12, y:e.clientY-8})}
                      onMouseLeave={() => setTooltip(null)}/>
                    <HeatCell value={r.captain_score} minValue={metricRanges.captain_score.min} maxValue={metricRanges.captain_score.max} title={METRIC_TOOLTIPS.captain_score}/>
                    <td style={{whiteSpace:"nowrap",fontSize:11}}>
                      {r.next_opp}<DifficultyPill label={r.fixture_label}/>
                    </td>
                    <HeatCell value={r.fixture_difficulty} minValue={metricRanges.fixture_difficulty.min} maxValue={metricRanges.fixture_difficulty.max} title={METRIC_TOOLTIPS.fixture_difficulty}/>
                    <HeatCell value={r.minutes_security} minValue={metricRanges.minutes_security.min} maxValue={metricRanges.minutes_security.max} title={METRIC_TOOLTIPS.minutes_security}
                      displayValue={`${r.minutes_security} · ${getScoreLabel(r.minutes_security)}`}/>
                    <HeatCell value={r.fixture_run_score} minValue={metricRanges.fixture_run_score.min} maxValue={metricRanges.fixture_run_score.max} title={METRIC_TOOLTIPS.fixture_run_score}/>
                    <HeatCell value={r.safe_pick_score} minValue={metricRanges.safe_pick_score.min} maxValue={metricRanges.safe_pick_score.max} title={METRIC_TOOLTIPS.safe_pick_score}/>
                    <HeatCell value={r.prob_appear} minValue={metricRanges.prob_appear.min} maxValue={metricRanges.prob_appear.max} title={METRIC_TOOLTIPS.prob_appear}/>
                    <td title={extractInjuryNote(r)||undefined}
                      style={{fontSize:11,color:extractInjuryNote(r)?"#ffb347":"#8ab8e0",whiteSpace:"nowrap"}}>
                      {r.availability_status}
                    </td>
                    <HeatCell value={r.pts_gw_1} minValue={metricRanges.pts_gw_1.min} maxValue={metricRanges.pts_gw_1.max}/>
                    <HeatCell value={r.pts_gw_2} minValue={metricRanges.pts_gw_2.min} maxValue={metricRanges.pts_gw_2.max}/>
                    <HeatCell value={r.pts_gw_4} minValue={metricRanges.pts_gw_4.min} maxValue={metricRanges.pts_gw_4.max}/>
                    <HeatCell value={r.next5_points} minValue={metricRanges.next5_points.min} maxValue={metricRanges.next5_points.max} title={METRIC_TOOLTIPS.next5}/>
                    <HeatCell value={r.pts_rest_season} minValue={metricRanges.pts_rest_season.min} maxValue={metricRanges.pts_rest_season.max}/>
                    <HeatCell value={r.points_per_cost} minValue={metricRanges.points_per_cost.min} maxValue={metricRanges.points_per_cost.max} title={METRIC_TOOLTIPS.ppc}/>
                    <HeatCell value={r.value_rest_season} minValue={metricRanges.value_rest_season.min} maxValue={metricRanges.value_rest_season.max}/>
                    <HeatCell value={r.points_so_far} minValue={metricRanges.points_so_far.min} maxValue={metricRanges.points_so_far.max}/>
                    <HeatCell value={r.selected_by_pct} minValue={metricRanges.selected_by_pct.min} maxValue={metricRanges.selected_by_pct.max}/>
                    <HeatCell value={r.transfer_momentum} minValue={metricRanges.transfer_momentum.min} maxValue={metricRanges.transfer_momentum.max}
                      displayValue={formatSignedNumber(r.transfer_momentum)}/>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    {/* ── TOOLTIP PANEL ── */}
    {tooltip && (
      <div className="fpl-tooltip-panel" style={{ left: tooltip.x, top: tooltip.y }}>
        <div style={{ fontSize:9, fontWeight:800, color:"#4a7a9a", letterSpacing:"0.1em", marginBottom:6, textTransform:"uppercase" }}>
          {tooltip.key.replace(/_/g," ")}
        </div>
        <div style={{ fontSize:12, color:"#c8d8f0", lineHeight:1.65 }}>
          {METRIC_TOOLTIPS[tooltip.key] || ""}
        </div>
      </div>
    )}

    {/* ── PLAYER MODAL ── */}
    {modalPlayer && (
      <div className="fpl-modal-backdrop" onClick={() => setModalPlayer(null)}>
        <div className="fpl-modal" onClick={e => e.stopPropagation()}>
          {/* Close button */}
          <button
            onClick={() => setModalPlayer(null)}
            style={{ position:"absolute", top:16, right:16, width:32, height:32, borderRadius:8,
              background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
              color:"#8ab8e0", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>
            ×
          </button>

          {/* Player header */}
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
            <div style={{ width:52, height:52, borderRadius:"50%", overflow:"hidden",
              border:`2px solid ${modalPlayer._posColor || "#4f9eff"}33`,
              background:"rgba(255,255,255,0.05)", flexShrink:0 }}>
              <img
                src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${modalPlayer.code || 0}.png`}
                alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}
                onError={e => { e.target.style.display="none"; }}
              />
            </div>
            <div>
              <div style={{ fontSize:18, fontWeight:900, color:"#f0f6ff", fontFamily:"'Sora',sans-serif", marginBottom:2 }}>
                {modalPlayer.player}
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:10, fontWeight:800, color:"#4a7a9a" }}>{modalPlayer.team}</span>
                <span style={{ fontSize:10, fontWeight:700, padding:"1px 7px", borderRadius:999,
                  background:`${modalPlayer._posColor || "#4f9eff"}18`,
                  border:`1px solid ${modalPlayer._posColor || "#4f9eff"}33`,
                  color: modalPlayer._posColor || "#4f9eff" }}>
                  {modalPlayer.position}
                </span>
                <span style={{ fontSize:10, color:"#3a5a7a", fontFamily:"DM Mono,monospace" }}>£{modalPlayer.cost}m</span>
              </div>
            </div>
          </div>

          {/* Key metrics grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
            {[
              { label:"Next GW Pts", val: (modalPlayer.pts_gw_1||0).toFixed(1), color:"#67b1ff" },
              { label:"Next 5 Pts",  val: (modalPlayer.next5_points||0).toFixed(1), color:"#9ff1b4" },
              { label:"Form",        val: (modalPlayer.form||0).toFixed(1), color:"#f2c94c" },
              { label:"Season Pts",  val: modalPlayer.points_so_far||0, color:"#b388ff" },
              { label:"Ownership",   val: `${(modalPlayer.selected_by_pct||0).toFixed(1)}%`, color:"#67b1ff" },
              { label:"Cost",        val: `£${modalPlayer.cost}m`, color:"#ffa94d" },
            ].map(m => (
              <div key={m.label} style={{ padding:"10px 12px", borderRadius:10,
                background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize:8, fontWeight:800, color:"#2a4a6a", letterSpacing:"0.1em", marginBottom:4, textTransform:"uppercase" }}>
                  {m.label}
                </div>
                <div style={{ fontSize:20, fontWeight:800, color:m.color, fontFamily:"DM Mono,monospace", lineHeight:1 }}>
                  {m.val}
                </div>
              </div>
            ))}
          </div>

          {/* Attacking metrics */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:9, fontWeight:800, color:"#2a4a6a", letterSpacing:"0.1em", marginBottom:10, textTransform:"uppercase" }}>
              Attacking Profile
            </div>
            {[
              { label:"Goal Threat",        val:modalPlayer.goal_threat,         max:3,   color:"#ff6b6b", tip: METRIC_TOOLTIPS.goal_threat },
              { label:"Chance Creation",    val:modalPlayer.chance_creation,     max:2.5, color:"#67b1ff", tip: METRIC_TOOLTIPS.chance_creation },
              { label:"Attack Involvement", val:modalPlayer.attack_involvement,  max:4,   color:"#9ff1b4", tip: METRIC_TOOLTIPS.attack_involvement },
              { label:"Captain Score",      val:modalPlayer.captain_score,       max:20,  color:"#f2c94c", tip: METRIC_TOOLTIPS.captain_score },
            ].map(m => {
              const pct = Math.min((Number(m.val)||0) / m.max * 100, 100);
              return (
                <div key={m.label} style={{ marginBottom:10 }} title={m.tip}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:11, color:"#8ab8e0" }}>{m.label}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:m.color, fontFamily:"DM Mono,monospace" }}>
                      {(Number(m.val)||0).toFixed(2)}
                    </span>
                  </div>
                  <div style={{ height:5, background:"rgba(255,255,255,0.06)", borderRadius:3, overflow:"hidden" }}>
                    <div style={{
                      height:"100%", width:`${pct}%`, background:m.color,
                      borderRadius:3, transition:"width 0.7s cubic-bezier(0.22,1,0.36,1)",
                    }}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Availability */}
          {modalPlayer.availability_status && modalPlayer.availability_status !== "-" && (
            <div style={{ padding:"10px 14px", borderRadius:10,
              background:"rgba(255,180,70,0.07)", border:"1px solid rgba(255,180,70,0.2)",
              fontSize:12, color:"#ffb347", marginBottom:16 }}>
              ⚠ {modalPlayer.availability_status}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display:"flex", gap:10 }}>
            <button
              onClick={() => { setModalPlayer(null); navigate(`/player/${modalPlayer.player_id}`); }}
              style={{ flex:1, padding:"10px 16px", borderRadius:10,
                background:"rgba(103,177,255,0.15)", border:"1px solid rgba(103,177,255,0.35)",
                color:"#67b1ff", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              Full Player Analysis →
            </button>
            <button onClick={() => setModalPlayer(null)}
              style={{ padding:"10px 16px", borderRadius:10,
                background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
                color:"#4a6a8a", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              Close
            </button>
          </div>
        </div>
      </div>
    )}
  );
}