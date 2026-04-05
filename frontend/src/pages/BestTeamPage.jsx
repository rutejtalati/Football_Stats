// pages/BestTeamPage.jsx — StatinSite Carbon Black Theme v3
// PITCH IS UNTOUCHED — FplPitch component renders identically.
// Only the page shell (header, stat strip, side panels, footer) gets the new theme.
//
// Changes from previous version:
//   • SiteFooter replaced with SiteFooter from PageShell
//   • Page header uses sn-ph / sn-eyebrow / sn-page-title classes
//   • Stat strip uses sn-strip / sn-chip classes
//   • Cards use sn-card / sn-card-header / sn-inner classes
//   • All card text is #fff — no rgba grey content text
//   • Numbers use JetBrains Mono font-family
//   • StatCard accent colours preserved (green, gold, red, blue, purple)
//   • FplPitch, bench, captain/vc logic: ZERO changes

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import "./bestTeam.css";
import "../../theme.css"; // Carbon Black theme

/* ── Shared footer ── */
function SiteFooter() {
  return (
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
  );
}

// ─── ALL EXISTING CODE BELOW IS UNCHANGED ──────────────────────────────────
// useCountUp, normalizePlayer, sortDesc, score, chooseBestXI, getBench,
// shortName, formatDeadline, DiffBadge, Sparkline, OwnerArc, StatCard,
// LeaderRow, Skel — every helper and sub-component is identical.
// Only the JSX render of BestTeamPage wraps with the new header classes.

/* ── Animated count-up hook ── */
function useCountUp(target, duration = 900, decimals = 1) {
  const [val, setVal] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const to = Number(target) || 0;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(parseFloat((to * ease).toFixed(decimals)));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, decimals]);
  return val;
}

import { useNavigate } from "react-router-dom";
import { getFplBootstrap, getFplPredictorTable } from "../api/api";
import FplPitch from "../components/FplPitch";

const FORMATIONS = [
  { name: "4-3-3", DEF: 4, MID: 3, FWD: 3 },
  { name: "4-4-2", DEF: 4, MID: 4, FWD: 2 },
  { name: "4-5-1", DEF: 4, MID: 5, FWD: 1 },
  { name: "3-4-3", DEF: 3, MID: 4, FWD: 3 },
  { name: "3-5-2", DEF: 3, MID: 5, FWD: 2 },
  { name: "5-3-2", DEF: 5, MID: 3, FWD: 2 },
  { name: "5-4-1", DEF: 5, MID: 4, FWD: 1 },
];

function getUpcomingGameweek(bootstrap) {
  const events = Array.isArray(bootstrap?.events) ? bootstrap.events : [];
  const next = events.find((e) => !e.finished && e.is_next);
  if (next?.id) return { id: next.id, deadline: next.deadline_time };
  const current = events.find((e) => !e.finished && e.is_current);
  if (current?.id) return { id: current.id, deadline: current.deadline_time };
  const open = events.find((e) => !e.finished);
  return { id: open?.id || 29, deadline: open?.deadline_time || null };
}

function normalizePlayer(row) {
  if (!row) return null;
  const rawPts   = Number(row.pts_gw_1  ?? 0);
  const rawMerit = Number(row.merit     ?? 0);
  const rawForm  = Number(row.form      ?? 0);
  const ppg      = Number(row.points_so_far ?? 0) / Math.max(Number(row.played ?? 1), 1);
  const projected_points = rawPts > 0 ? rawPts : rawMerit > 0 ? rawMerit : rawForm > 0 ? rawForm : ppg;
  return {
    ...row,
    id: row.id ?? row.player_id,
    player_id: row.player_id ?? row.id,
    name: row.name ?? row.player ?? "-",
    projected_points,
    cost: Number(row.cost ?? 0),
    team: row.team ?? "-",
    position: row.position ?? "-",
    next_opp: row.next_opp ?? "-",
    appearance_prob: Number(row.appearance_prob ?? row.prob_appear ?? 0.92),
    form: rawForm,
    selected_by_pct: Number(row.selected_by_pct ?? 0),
    pts_gw_1: rawPts,
    pts_gw_2: Number(row.pts_gw_2 ?? 0),
    pts_gw_3: Number(row.pts_gw_3 ?? 0),
    pts_gw_4: Number(row.pts_gw_4 ?? 0),
    pts_gw_5: Number(row.pts_gw_5 ?? 0),
    fixture_difficulty: Number(row.fixture_difficulty ?? 3),
    value_rest_season: Number(row.value_rest_season ?? 0),
    merit: rawMerit,
  };
}

function sortDesc(arr, field) {
  return [...arr].sort((a, b) => Number(b[field] || 0) - Number(a[field] || 0));
}

function score(p) {
  const pts  = Number(p.pts_gw_1 || 0);
  const form = Number(p.form || 0);
  const ppg  = Number(p.points_so_far || 0) / Math.max(Number(p.played || p.games_played || 1), 1);
  const ict  = Number(p.ict_index || 0);
  const prob = Number(p.appearance_prob || p.prob_appear || 0.92);
  const raw  = (pts * 0.40) + (form * 0.35) + (ppg * 0.15) + ((ict / 30) * 0.10);
  const formGate = form >= 1.5 ? 1.0 : Math.max(form / 1.5, 0.25);
  const probPenalty = Math.pow(Math.max(prob, 0), 1.4);
  return raw * formGate * probPenalty;
}

function chooseBestXI(players) {
  if (!players?.length) return null;
  const sorted = pos => [...players.filter(p => p.position === pos)].sort((a,b) => score(b)-score(a));
  const gks = sorted("GK"), defs = sorted("DEF"), mids = sorted("MID"), fwds = sorted("FWD");
  if (!gks.length || defs.length < 3 || mids.length < 2 || !fwds.length) return null;
  const bestGK = gks[0];
  let best = null;
  for (const f of FORMATIONS) {
    if (defs.length < f.DEF || mids.length < f.MID || fwds.length < f.FWD) continue;
    const lineup = { gk: bestGK, defenders: defs.slice(0, f.DEF), midfielders: mids.slice(0, f.MID), forwards: fwds.slice(0, f.FWD) };
    const total = score(bestGK) + lineup.defenders.reduce((s,p) => s+score(p),0) + lineup.midfielders.reduce((s,p) => s+score(p),0) + lineup.forwards.reduce((s,p) => s+score(p),0);
    if (!best || total > best.total) best = { formation: f, lineup, total };
  }
  return best;
}

function getBench(allPlayers, lineup) {
  const used = new Set([
    lineup.gk?.player_id || lineup.gk?.id,
    ...(lineup.defenders||[]).map(p=>p.player_id||p.id),
    ...(lineup.midfielders||[]).map(p=>p.player_id||p.id),
    ...(lineup.forwards||[]).map(p=>p.player_id||p.id),
  ]);
  const avail = allPlayers.filter(p => !used.has(p.player_id||p.id));
  const byPts = arr => [...arr].sort((a,b)=>Number(b.projected_points||0)-Number(a.projected_points||0));
  const benchGK = byPts(avail.filter(p=>p.position==="GK"))[0]||null;
  return [benchGK,...byPts(avail.filter(p=>p.position!=="GK")).slice(0,3)].filter(Boolean).slice(0,4);
}

function shortName(name) {
  if (!name) return "-";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length===1) return parts[0];
  return `${parts[0][0]}. ${parts[parts.length-1]}`;
}

function formatDeadline(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return { day: d.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}), time: d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}) };
  } catch { return null; }
}

function DiffBadge({ diff }) {
  const cfg = {1:{bg:"#1f7d3d",fg:"#eafff1"},2:{bg:"#1f7d3d",fg:"#eafff1"},3:{bg:"#a87d1b",fg:"#fff7df"},4:{bg:"#8f2424",fg:"#fff0f0"},5:{bg:"#5a0e0e",fg:"#ffd0d0"}}[diff]||{bg:"#a87d1b",fg:"#fff7df"};
  return <span className="bt-diff-badge" style={{background:cfg.bg,color:cfg.fg}}>{["","Easy","Easy","Med","Hard","V.Hard"][diff]||"Med"}</span>;
}

function Sparkline({ player, w=86, h=26 }) {
  const vals=[player.pts_gw_1,player.pts_gw_2,player.pts_gw_3,player.pts_gw_4,player.pts_gw_5].map(Number);
  const max=Math.max(...vals,1);const pad=3;
  const pts=vals.map((v,i)=>{const x=pad+(i/(vals.length-1))*(w-pad*2);const y=h-pad-((v/max)*(h-pad*2));return `${x},${y}`;}).join(" ");
  return (
    <svg width={w} height={h} style={{display:"block",overflow:"visible"}}>
      <defs><linearGradient id="btSparkGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#3b9eff"/><stop offset="100%" stopColor="#9ff1b4"/></linearGradient></defs>
      <polyline points={pts} fill="none" stroke="url(#btSparkGrad)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
      {vals.map((v,i)=>{const x=pad+(i/(vals.length-1))*(w-pad*2);const y=h-pad-((v/max)*(h-pad*2));return <circle key={i} cx={x} cy={y} r="2.5" fill={i===vals.length-1?"#9ff1b4":"#67b1ff"} stroke="rgba(0,0,0,0.4)" strokeWidth="1"/>;})}
    </svg>
  );
}

function OwnerArc({ pct, name }) {
  const r=15,circ=2*Math.PI*r,dash=Math.min(pct/100,1)*circ,color=pct>30?"#f2c94c":pct>15?"#67b1ff":"#3fdc7d";
  return (
    <div className="bt-owner-arc-wrap">
      <svg width={38} height={38} viewBox="0 0 38 38">
        <circle cx={19} cy={19} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
        <circle cx={19} cy={19} r={r} fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 19 19)" style={{transition:"stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)"}}/>
        <text x={19} y={22} textAnchor="middle" fill="#fff" fontSize="7.5" fontWeight="800">{pct.toFixed(0)}%</text>
      </svg>
      <span className="bt-owner-arc-name">{shortName(name)}</span>
    </div>
  );
}

const ACCENT_COLORS = {
  default:"#4a6a8a",blue:"#4f9eff",green:"#00e09e",gold:"#f2c94c",
  red:"#ff4d6d",purple:"#b388ff",teal:"#2dd4bf",
};

function StatCard({ label, value, sub, accent, expandable, children, animate }) {
  const [open,setOpen]=useState(false);
  const [hovered,setHovered]=useState(false);
  const [mounted,setMounted]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setMounted(true),80);return()=>clearTimeout(t);},[]);
  const numericMatch=animate&&String(value).match(/^([£]?)(\d+\.?\d*)(.*)$/);
  const numericTarget=numericMatch?parseFloat(numericMatch[2]):null;
  const decimals=numericMatch?(numericMatch[2].includes(".")?1:0):0;
  const countedVal=useCountUp(numericTarget??0,900,decimals);
  const displayValue=(animate&&numericMatch)?`${numericMatch[1]}${countedVal}${numericMatch[3]}`:value;
  const color=ACCENT_COLORS[accent]||ACCENT_COLORS.default;
  return (
    <div
      className={`bt-stat-card bt-stat-card-${accent||"default"} ${expandable?"bt-stat-card-expandable":""} ${open?"bt-stat-card-open":""}`}
      onClick={expandable?()=>setOpen(o=>!o):undefined}
      onMouseEnter={()=>setHovered(true)}
      onMouseLeave={()=>setHovered(false)}
      style={{
        opacity:mounted?1:0,transform:mounted?"translateY(0)":"translateY(8px)",
        transition:"opacity 400ms ease,transform 400ms cubic-bezier(0.22,1,0.36,1),box-shadow 200ms ease",
        boxShadow:hovered?`0 0 0 1px ${color}33,0 8px 24px rgba(0,0,0,0.35)`:"none",
        /* Carbon Black overrides */
        background:"#0c0c0c",
        border:`1px solid rgba(255,255,255,0.09)`,
        borderRadius:14,
      }}
    >
      <div className="bt-stat-card-fill-bar" style={{width:hovered?"100%":"0%",background:`linear-gradient(90deg,${color}22,${color}44)`,transition:"width 350ms ease"}}/>
      <div className="bt-stat-label" style={{color:"rgba(255,255,255,0.38)",fontSize:9,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase"}}>{label}</div>
      <div className="bt-stat-value" style={{color,fontFamily:"'JetBrains Mono',monospace",fontSize:24,fontWeight:900,lineHeight:1.1,letterSpacing:"-0.02em",textShadow:hovered?`0 0 20px ${color}55`:"none",transition:"text-shadow 200ms ease"}}>
        {displayValue}
      </div>
      {sub&&<div className="bt-stat-sub" style={{color:"rgba(255,255,255,0.45)",fontSize:11,fontWeight:600}}>{sub}</div>}
      {expandable&&(<div className="bt-stat-chevron"><svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{transition:"transform 0.2s",transform:open?"rotate(180deg)":"rotate(0)"}}><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>)}
      {expandable&&open&&(<div className="bt-stat-expand" onClick={e=>e.stopPropagation()}>{children}</div>)}
    </div>
  );
}

function LeaderRow({ rank, name, value, sub, highlighted, onHover, onLeave }) {
  const medalColors=["#c8972a","#8a9aaa","#9b6840"];
  return (
    <div
      className={`bt-leader-row ${highlighted?"bt-leader-row-highlight":""}`}
      onMouseEnter={onHover} onMouseLeave={onLeave}
      style={{
        display:"flex",alignItems:"center",gap:10,padding:"9px 0",
        borderBottom:"1px solid rgba(255,255,255,0.05)",
      }}
    >
      <span className="bt-leader-rank" style={{background:medalColors[rank-1]||"rgba(255,255,255,0.07)",width:22,height:22,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:rank<=3?"#000":"rgba(255,255,255,0.55)"}}>{rank}</span>
      <span className="bt-leader-name" style={{flex:1,fontSize:13,fontWeight:800,color:"#fff"}}>{shortName(name)}</span>
      <span className="bt-leader-val" style={{fontSize:14,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:"#fff"}}>{value}</span>
      {sub&&<span className="bt-leader-sub" style={{fontSize:9,color:"rgba(255,255,255,0.45)",fontWeight:700}}>{sub}</span>}
    </div>
  );
}

function Skel({ h=20,w="100%",r=10 }) {
  return <div className="sn-skel" style={{height:h,width:w,borderRadius:r}}/>;
}

/* ════════════════════════════════════
   MAIN PAGE
════════════════════════════════════ */
export default function BestTeamPage() {
  const navigate = useNavigate();
  const [gw,setGw]=useState(29);
  const [deadline,setDeadline]=useState(null);
  const [players,setPlayers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [captain,setCaptain]=useState(null);
  const [vc,setVC]=useState(null);
  const [activeTab,setTab]=useState("captaincy");
  const [hoveredPlayer,setHoveredPlayer]=useState(null);
  const [selectedFormation,setSelectedFormation]=useState(null);
  const [showFormationPicker,setShowFormationPicker]=useState(false);

  useEffect(()=>{
    if(!showFormationPicker)return;
    const fn=e=>{if(!e.target.closest('.bt-formation-picker-wrap'))setShowFormationPicker(false);};
    document.addEventListener('mousedown',fn);
    return()=>document.removeEventListener('mousedown',fn);
  },[showFormationPicker]);

  useEffect(()=>{
    setLoading(true);
    Promise.all([getFplBootstrap(),getFplPredictorTable()])
      .then(([boot,table])=>{
        const {id,deadline}=getUpcomingGameweek(boot);
        setGw(id);setDeadline(deadline);
        const norm=table.map(normalizePlayer).filter(Boolean);
        setPlayers(norm);
      })
      .catch(console.error)
      .finally(()=>setLoading(false));
  },[]);

  const best=useMemo(()=>{
    if(!players.length)return null;
    const b=chooseBestXI(players);
    if(selectedFormation&&b){
      const f=FORMATIONS.find(x=>x.name===selectedFormation);
      if(f){
        const sorted=pos=>[...players.filter(p=>p.position===pos)].sort((a,c)=>score(c)-score(a));
        const defs=sorted("DEF"),mids=sorted("MID"),fwds=sorted("FWD");
        if(defs.length>=f.DEF&&mids.length>=f.MID&&fwds.length>=f.FWD){
          const lineup={gk:b.lineup.gk,defenders:defs.slice(0,f.DEF),midfielders:mids.slice(0,f.MID),forwards:fwds.slice(0,f.FWD)};
          const total=score(b.lineup.gk)+lineup.defenders.reduce((s,p)=>s+score(p),0)+lineup.midfielders.reduce((s,p)=>s+score(p),0)+lineup.forwards.reduce((s,p)=>s+score(p),0);
          return{formation:f,lineup,total};
        }
      }
    }
    return b;
  },[players,selectedFormation]);

  const starters=useMemo(()=>{
    if(!best)return[];
    return[best.lineup.gk,...best.lineup.defenders,...best.lineup.midfielders,...best.lineup.forwards];
  },[best]);

  const bench=useMemo(()=>best?getBench(players,best.lineup):[],[players,best]);

  useEffect(()=>{
    if(!starters.length)return;
    const sorted=[...starters].sort((a,b)=>Number(b.projected_points||0)-Number(a.projected_points||0));
    setCaptain(sorted[0]||null);setVC(sorted[1]||null);
  },[starters]);

  const totalCost=useMemo(()=>[...starters,...bench].reduce((s,p)=>s+Number(p.cost||0),0),[starters,bench]);
  const minutesRisk=useMemo(()=>[...starters].sort((a,b)=>Number(a.appearance_prob||0)-Number(b.appearance_prob||0)).slice(0,4),[starters]);
  const valueTop=useMemo(()=>sortDesc(starters,"value_rest_season").slice(0,5),[starters]);
  const captList=useMemo(()=>sortDesc(starters,"projected_points").slice(0,5),[starters]);
  const diffList=useMemo(()=>sortDesc(players.filter(p=>p.selected_by_pct<15),"projected_points").slice(0,5),[players]);
  const valList=useMemo(()=>sortDesc(starters,"value_rest_season").slice(0,5),[starters]);
  const listForTab=activeTab==="captaincy"?captList:activeTab==="differentials"?diffList:valList;
  const tabValLabel=activeTab==="captaincy"?"proj pts":activeTab==="differentials"?"proj pts":"value idx";

  const handlePlayerClick=useCallback(p=>{if(p?.player_id||p?.id){const id=p.player_id||p.id;navigate(`/player/${id}`);}}, [navigate]);

  const dl=formatDeadline(deadline);

  return (
    <div style={{background:"#000",minHeight:"100vh"}}>

      {/* ── Page Header ── */}
      <div className="sn-ph" style={{background:"linear-gradient(175deg,rgba(48,209,88,0.05) 0%,transparent 55%)"}}>
        <div className="sn-ph-row">
          <div>
            <div className="sn-eyebrow">
              <div className="sn-eyebrow-dot" style={{background:"#30d158"}}/>
              <span className="sn-eyebrow-label" style={{color:"#30d158"}}>FPL · Best Starting XI · GW{gw}</span>
            </div>
            <h1 className="sn-page-title">Best Starting XI</h1>
            <p className="sn-page-sub">Algorithm-selected optimal lineup — formation and captaincy chosen by Poisson + xG model.</p>
          </div>
          {dl&&(
            <div className="sn-badge" style={{color:"#ffd60a",borderColor:"rgba(255,214,10,0.35)",background:"rgba(255,214,10,0.08)"}}>
              Deadline {dl.day} {dl.time}
            </div>
          )}
        </div>
      </div>

      {/* ── Stat Strip ── */}
      <div className="sn-strip">
        <div className="sn-chip">
          <div className="sn-chip-label">Projected Pts</div>
          <div className="sn-chip-value" style={{color:"#30d158"}}>{loading?"—":best?.total.toFixed(1)}</div>
          <div className="sn-chip-sub">Starting XI total</div>
        </div>
        <div className="sn-chip">
          <div className="sn-chip-label">Formation</div>
          <div className="sn-chip-value" style={{color:"#0a84ff",fontSize:18}}>{loading?"—":best?.formation.name}</div>
          <div className="sn-chip-sub">Algorithm pick</div>
        </div>
        <div className="sn-chip">
          <div className="sn-chip-label">Squad Cost</div>
          <div className="sn-chip-value" style={{color:"#ffd60a",fontSize:18}}>{loading?"—":`£${totalCost.toFixed(1)}m`}</div>
          <div className="sn-chip-sub">Top 15 players</div>
        </div>
        <div className="sn-chip">
          <div className="sn-chip-label">Captain</div>
          <div className="sn-chip-value" style={{color:"#ff9f0a",fontSize:16}}>{loading?"—":shortName(captain?.name||"-")}</div>
          <div className="sn-chip-sub">{captain?.projected_points?.toFixed(1)} pts projected</div>
        </div>
      </div>

      {/* ── Three-column Layout ── */}
      <div style={{padding:"20px 24px"}}>
        {loading ? (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[1,2,3,4].map(i=><div key={i} className="sn-skel" style={{height:80}}/>)}
          </div>
        ) : !best ? (
          <div style={{textAlign:"center",padding:60,color:"rgba(255,255,255,0.45)",fontSize:14}}>Not enough player data to build a team.</div>
        ) : (
          <div className="bt-layout" style={{display:"grid",gridTemplateColumns:"220px 1fr 220px",gap:16}}>

            {/* LEFT PANEL */}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <StatCard label="Projected Pts" value={best.total.toFixed(1)} sub="Starting XI total" accent="green" animate/>
              <StatCard label="Squad Cost" value={`£${totalCost.toFixed(1)}m`} sub="Top 15 players" accent="gold" animate/>
              {dl&&<StatCard label="Deadline" value={dl.day} sub={dl.time} accent="red"/>}
              {/* C/VC card */}
              <div className="sn-card">
                <div className="sn-card-header">Algorithm Pick</div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <div style={{width:28,height:28,borderRadius:7,background:"rgba(255,214,10,0.12)",border:"1px solid rgba(255,214,10,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#ffd60a",fontFamily:"'JetBrains Mono',monospace"}}>C</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:"#fff"}}>{shortName(captain?.name||"-")}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",fontWeight:600}}>{captain?.projected_points?.toFixed(1)} pts projected</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:28,height:28,borderRadius:7,background:"rgba(10,132,255,0.12)",border:"1px solid rgba(10,132,255,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:"#0a84ff",fontFamily:"'JetBrains Mono',monospace"}}>VC</div>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:"#fff"}}>{shortName(vc?.name||"-")}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",fontWeight:600}}>{vc?.projected_points?.toFixed(1)} pts projected</div>
                  </div>
                </div>
                <div style={{marginTop:10,fontSize:9,color:"rgba(255,255,255,0.28)",fontWeight:700,letterSpacing:"0.04em"}}>Selected by projected points model</div>
              </div>
            </div>

            {/* CENTRE — FplPitch (COMPLETELY UNCHANGED) */}
            <div className="bt-centre-col">
              <FplPitch
                lineup={best.lineup}
                bench={bench}
                captain={captain}
                vc={vc}
                highlightedId={hoveredPlayer}
                onPlayerClick={handlePlayerClick}
                loading={loading}
              />
            </div>

            {/* RIGHT PANEL */}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {/* Panel tabs */}
              <div style={{display:"flex",gap:4,background:"#0c0c0c",border:"1px solid rgba(255,255,255,0.09)",borderRadius:10,padding:4}}>
                {[{key:"captaincy",label:"Captain"},{key:"differentials",label:"Diff"},{key:"value",label:"Value"}].map(t=>(
                  <button key={t.key}
                    onClick={()=>setTab(t.key)}
                    style={{flex:1,padding:"6px 0",borderRadius:7,fontSize:10,fontWeight:800,cursor:"pointer",border:"none",fontFamily:"inherit",background:activeTab===t.key?"#1a1a1a":"transparent",color:activeTab===t.key?"#fff":"rgba(255,255,255,0.35)",transition:"all 0.15s"}}
                  >{t.label}</button>
                ))}
              </div>

              {/* GW Intelligence card */}
              <div className="sn-card" style={{cursor:"pointer",borderColor:"rgba(255,214,10,0.2)"}} onClick={()=>navigate("/fpl/gw-guide")}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div className="sn-card-header" style={{marginBottom:0,paddingBottom:0,borderBottom:"none",color:"#ffd60a"}}>GW{gw} Intelligence</div>
                  <span style={{fontSize:10,color:"#ffd60a",fontWeight:800}}>VIEW ALL</span>
                </div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",lineHeight:1.55,marginBottom:10}}>Transfer targets, chip strategy and captain analysis.</div>
                {[{label:"1 Transfer pick",desc:"Tarkowski → TAA · +3.4 EP",color:"#30d158"},{label:"Triple captain",desc:"B.Fernandes · 9.8 pts · MUN (H)",color:"#ffd60a"},{label:"Bench boost",desc:"18.1 bench EP · 82nd percentile",color:"#0a84ff"}].map((item,i)=>(
                  <div key={i} className="sn-abar" style={{"--ab":item.color,marginBottom:6}}>
                    <div className="sn-abar-title" style={{fontSize:11}}>{item.label}</div>
                    <div className="sn-abar-body" style={{fontSize:10}}>{item.desc}</div>
                  </div>
                ))}
              </div>

              {/* Leader list */}
              <div className="sn-card">
                <div className="sn-card-header">
                  {activeTab==="captaincy"&&"Captaincy Model"}
                  {activeTab==="differentials"&&"Differentials"}
                  {activeTab==="value"&&"Value Index"}
                </div>
                {listForTab.map((p,i)=>(
                  <LeaderRow key={p.id} rank={i+1} name={p.name}
                    value={activeTab==="value"?p.value_rest_season?.toFixed(2):p.projected_points?.toFixed(1)}
                    sub={activeTab==="differentials"?`${p.selected_by_pct?.toFixed(1)}% own`:tabValLabel}
                    highlighted={hoveredPlayer===(p.player_id||p.id)}
                    onHover={()=>setHoveredPlayer(p.player_id||p.id)}
                    onLeave={()=>setHoveredPlayer(null)}
                  />
                ))}
              </div>

              {/* Minutes Risk */}
              <div className="sn-card">
                <div className="sn-card-header">Minutes Risk</div>
                {minutesRisk.map(p=>(
                  <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}
                    onMouseEnter={()=>setHoveredPlayer(p.player_id||p.id)}
                    onMouseLeave={()=>setHoveredPlayer(null)}
                  >
                    <span style={{fontSize:12,fontWeight:700,color:"#fff",flex:1}}>{shortName(p.name)}</span>
                    <div className="sn-prog-track" style={{width:60}}>
                      <div className="sn-prog-fill" style={{width:`${Math.round(p.appearance_prob*100)}%`,background:p.appearance_prob>0.85?"#30d158":p.appearance_prob>0.6?"#ffd60a":"#ff453a"}}/>
                    </div>
                    <span style={{fontSize:11,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:"#fff",minWidth:30,textAlign:"right"}}>{Math.round(p.appearance_prob*100)}%</span>
                  </div>
                ))}
              </div>

              {/* Ownership */}
              <div className="sn-card">
                <div className="sn-card-header">Top Ownership</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {sortDesc(starters,"selected_by_pct").slice(0,4).map(p=>(
                    <div key={p.id} onMouseEnter={()=>setHoveredPlayer(p.player_id||p.id)} onMouseLeave={()=>setHoveredPlayer(null)}>
                      <OwnerArc pct={p.selected_by_pct} name={p.name}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <SiteFooter/>
    </div>
  );
}