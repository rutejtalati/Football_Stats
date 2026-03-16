// pages/PlayerInsightPage.jsx
// Deep player profile — FPL data + projections — MOBILE RESPONSIVE

import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFplBootstrap, getFplPredictorTable } from "../api/api";
import { ExpectedPointsChart } from "../components/ExpectedPointsChart";

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

/* ── FPL kit/color maps ── */
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
const DIFF_LABEL = ["","Easy","Easy","Med","Hard","Very Hard"];
const DIFF_COLOR = {
  1:"#1a6e38",2:"#1a6e38",3:"#7a5c14",4:"#7a1c1c",5:"#4a0808"
};

function getUpcomingGameweek(bootstrap) {
  const events = Array.isArray(bootstrap?.events) ? bootstrap.events : [];
  const next = events.find(e => !e.finished && e.is_next);
  if (next?.id) return next.id;
  const curr = events.find(e => !e.finished && e.is_current);
  if (curr?.id) return curr.id;
  return events.find(e => !e.finished)?.id || 29;
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

/* ─── Sub-components ─── */

function Skel({ h=20, w="100%", r=8 }) {
  return <div style={{ height:h, width:w, borderRadius:r, background:"rgba(255,255,255,0.06)", animation:"piSkeletonPulse 1.4s ease-in-out infinite" }}/>;
}

function StatRow({ label, value, color, bar, barValue, max }) {
  const numeric = barValue !== undefined ? Number(barValue) : parseFloat(value) || 0;
  const barPct  = bar && max ? Math.min((numeric/max)*100, 100) : 0;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:3, padding:"8px 14px", borderRadius:10,
      background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:9, fontWeight:800, color:"#2a4a6a", letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</span>
        <span style={{ fontSize:14, fontWeight:900, color:color||"#c8d8f0", fontFamily:"DM Mono, monospace" }}>{value}</span>
      </div>
      {bar && (
        <div style={{ height:3, background:"rgba(255,255,255,0.08)", borderRadius:999, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${barPct}%`, background:color||"#67b1ff",
            borderRadius:999, transition:"width 0.8s cubic-bezier(0.22,1,0.36,1)", transitionDelay:"0.2s" }}/>
        </div>
      )}
    </div>
  );
}

function Sparkline5({ vals, w=120, h=34 }) {
  const nums = vals.map(Number);
  const max  = Math.max(...nums, 1);
  const pad  = 4;
  const pts  = nums.map((v,i) => {
    const x = pad + (i/(nums.length-1))*(w-pad*2);
    const y = h - pad - ((v/max)*(h-pad*2));
    return `${x},${y}`;
  }).join(" ");
  const fillPts = `${pts} ${w-pad},${h} ${pad},${h}`;
  return (
    <svg width={w} height={h} style={{ overflow:"visible", display:"block", maxWidth:"100%" }}>
      <defs>
        <linearGradient id="piSparkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b9eff"/><stop offset="100%" stopColor="#9ff1b4"/>
        </linearGradient>
        <linearGradient id="piSparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(59,158,255,0.3)"/><stop offset="100%" stopColor="rgba(59,158,255,0)"/>
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill="url(#piSparkFill)" stroke="none"/>
      <polyline points={pts} fill="none" stroke="url(#piSparkGrad)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>
      {nums.map((v,i) => {
        const x = pad+(i/(nums.length-1))*(w-pad*2);
        const y = h-pad-((v/max)*(h-pad*2));
        return <circle key={i} cx={x} cy={y} r="3"
          fill={i===nums.length-1?"#9ff1b4":"#67b1ff"} stroke="rgba(0,0,0,0.6)" strokeWidth="1.2"/>;
      })}
    </svg>
  );
}

function ScoreGauge({ label, value, max=10, color="#67b1ff", size=100 }) {
  const angle = (value/max) * 180;
  const r = 42;
  const cx = 50, cy = 50;
  const toXY = (deg) => {
    const rad = (deg - 180) * Math.PI / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const [x1,y1] = toXY(0);
  const [x2,y2] = toXY(angle);
  const largeArc = angle > 180 ? 1 : 0;
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <svg viewBox="0 0 100 60" width={size} height={size*0.6} style={{ minWidth:60 }}>
        <path d={`M ${cx-r},${cy} A ${r},${r} 0 0,1 ${cx+r},${cy}`}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" strokeLinecap="round"/>
        {angle > 0 && (
          <path d={`M ${x1},${y1} A ${r},${r} 0 ${largeArc},1 ${x2},${y2}`}
            fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"/>
        )}
        <text x={cx} y={cy-2} textAnchor="middle" fill={color} fontSize="16" fontWeight="900"
          fontFamily="DM Mono, monospace">{value.toFixed(1)}</text>
      </svg>
      <span style={{ fontSize:8, fontWeight:800, color:"#2a4a6a", letterSpacing:"0.06em", textTransform:"uppercase", textAlign:"center" }}>{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */
export default function PlayerInsightPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const isMobile   = useIsMobile();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gw, setGw] = useState(29);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const bootstrap = await getFplBootstrap();
        const nextGw    = getUpcomingGameweek(bootstrap);
        if (cancelled) return;
        setGw(nextGw);
        const tableData = await getFplPredictorTable({
          start_gw: nextGw, max_cost: 15.5, min_prob: 0, team: "ALL", position: "ALL",
        });
        if (cancelled) return;
        setPlayers((tableData.rows||[]).map(normalizePlayer).filter(Boolean));
        setLoading(false);
      } catch(err) {
        console.error(err);
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled=true; };
  }, []);

  const player = useMemo(() => {
    if (!players.length) return null;
    return players.find(p => String(p.player_id||p.id) === String(id)) || null;
  }, [players, id]);

  const similars = useMemo(() => {
    if (!player || !players.length) return [];
    return players
      .filter(p => p.position===player.position && (p.player_id||p.id) !== (player.player_id||player.id))
      .sort((a,b) => Number(b.projected_points||0)-Number(a.projected_points||0))
      .slice(0,5);
  }, [player, players]);

  const pts         = Number(player?.projected_points||0);
  const form        = Number(player?.form||0);
  const prob        = Math.round((player?.appearance_prob||0)*100);
  const own         = Number(player?.selected_by_pct||0);
  const cost        = Number(player?.cost||0);
  const valueIndex  = cost > 0 ? pts/cost : 0;
  const diff        = Number(player?.fixture_difficulty||3);
  const fwdPts      = [1,2,3,4,5].map(i => Number(player?.[`pts_gw_${i}`]||0));
  const isGK        = player?.position === "GK";
  const shirtId     = SHIRT_IDS[player?.team];
  const shirtUrl    = shirtId ? `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${shirtId}${isGK?"_1":""}-66.png` : null;
  const photoUrl    = player?.code ? `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png` : null;
  const teamColor   = isGK ? (GK_COLORS[player?.team]||"#ffd600") : (TEAM_COLORS[player?.team]||"#4f8cff");
  const captainScore= pts * (prob/100) * (diff <= 2 ? 1.2 : diff >= 4 ? 0.8 : 1.0);
  const probColor   = prob>=90?"#9ff1b4":prob>=70?"#f2c94c":"#ff6b6b";
  const ptsColor    = pts>=9?"#9ff1b4":pts>=6?"#67b1ff":"#c8d8f0";

  if (loading) return (
    <div className="pi-shell">
      <style>{`@keyframes piSkeletonPulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      <div className="pi-content" style={{ padding: isMobile ? "12px" : "24px" }}>
        <div style={{ display:"flex", gap:10, marginBottom:16, flexDirection: isMobile ? "column" : "row" }}>
          <Skel h={isMobile?120:180} w={isMobile?"100%":180} r={20}/>
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:8 }}>
            <Skel h={36} w={isMobile?"100%":280} r={10}/>
            <Skel h={20} w={180} r={8}/>
            <Skel h={80} w="100%" r={14}/>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap:10 }}>
          {[1,2,3,4,5,6].map(i=><Skel key={i} h={80} r={12}/>)}
        </div>
      </div>
    </div>
  );

  if (!player) return (
    <div className="pi-shell">
      <div className="pi-content" style={{ padding: isMobile ? "12px" : "24px" }}>
        <button className="pi-back-btn" onClick={() => navigate(-1)}>← Back</button>
        <div style={{ color:"#ff5d5d", fontSize:18, fontWeight:800, marginTop:24 }}>
          Player not found (id: {id})
        </div>
      </div>
    </div>
  );

  const gaugeSize = isMobile ? 76 : 100;

  return (
    <div className="pi-shell">
      <style>{`
        @keyframes piSkeletonPulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .pi-shell { background:#000; min-height:100vh; }
        .pi-content { max-width:900px; margin:0 auto; padding:${isMobile?"12px":"24px 24px 40px"}; }
        .pi-back-btn {
          background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
          borderRadius:8px; color:#4a7a9a; cursor:pointer; padding:7px 14px;
          fontSize:12px; fontWeight:800; marginBottom:16px; fontFamily:inherit;
          transition:all 0.15s;
        }
        .pi-back-btn:hover { background:rgba(255,255,255,0.09); color:#c8d8f0; }
        .pi-section-label {
          fontSize:9px; fontWeight:900; color:#1a3a5a; letterSpacing:0.14em;
          textTransform:uppercase; marginBottom:8px; marginTop:20px;
          paddingLeft:2px; borderLeft:2px solid rgba(103,177,255,0.3); paddingLeft:8px;
        }
        .pi-stats-grid {
          display:grid;
          grid-template-columns:${isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr"};
          gap:8px;
        }
        .pi-similar-row {
          display:flex; align-items:center; gap:10; padding:10px 14px;
          borderRadius:10px; border:1px solid rgba(255,255,255,0.05);
          background:rgba(255,255,255,0.02); transition:all 0.13s ease;
        }
        .pi-similar-row:hover { background:rgba(103,177,255,0.07); border-color:rgba(103,177,255,0.2); transform:translateX(3px); }
        .pi-similar-rank { fontSize:10px; fontWeight:800; minWidth:18px; }
        .pi-spark-card {
          background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
          borderRadius:14px; padding:${isMobile?"12px":"16px 18px"};
          overflow:hidden;
        }
        .pi-captaincy-card {
          display:flex; flex-direction:${isMobile?"column":"row"};
          gap:0; background:rgba(255,255,255,0.03);
          border:1px solid rgba(255,255,255,0.07); borderRadius:14px; overflow:hidden;
        }
        .pi-captaincy-score-col {
          padding:${isMobile?"14px":"20px"};
          border-right:${isMobile?"none":"1px solid rgba(255,255,255,0.06)"};
          border-bottom:${isMobile?"1px solid rgba(255,255,255,0.06)":"none"};
          min-width:${isMobile?"auto":"140px"}; flex-shrink:0;
        }
        .pi-captaincy-factors {
          flex:1; padding:${isMobile?"12px":"16px"}; display:flex; flex-direction:column; gap:6px; justify-content:center;
        }
        .pi-risk-card {
          background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
          borderRadius:14px; padding:${isMobile?"12px":"16px 18px"};
        }
        .pi-similar-list { display:flex; flex-direction:column; gap:6px; }
        .pi-meta-chip {
          fontSize:10px; fontWeight:800; padding:2px 8px; borderRadius:6px;
          background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#8ab8e0;
        }
        .pi-meta-chip-gold { background:rgba(242,201,76,0.1); border-color:rgba(242,201,76,0.3); color:#f2c94c; }
        .pi-diff-pill {
          fontSize:9px; fontWeight:800; padding:2px 7px; borderRadius:999;
          marginLeft:8px; letterSpacing:0.05em;
        }
      `}</style>

      <div className="pi-content">
        {/* BACK */}
        <button className="pi-back-btn" onClick={() => navigate(-1)}>← Back</button>

        {/* ══ HERO ══ */}
        <div style={{
          display:"flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 14 : 20,
          padding: isMobile ? "14px" : "20px 24px",
          borderRadius:16,
          background:"rgba(255,255,255,0.03)",
          border:`1px solid ${teamColor}33`,
          marginBottom:4,
          position:"relative", overflow:"hidden",
        }}>
          {/* Background team color glow */}
          <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse at 0% 50%, ${teamColor}12, transparent 60%)`, pointerEvents:"none" }}/>

          {/* Kit + Photo row on mobile */}
          <div style={{
            display:"flex",
            flexDirection: isMobile ? "row" : "column",
            alignItems: isMobile ? "flex-end" : "center",
            gap: isMobile ? 10 : 6,
            flexShrink:0, position:"relative", zIndex:1,
          }}>
            {shirtUrl && (
              <img src={shirtUrl} alt={player.team}
                style={{ width: isMobile ? 64 : 90, height: isMobile ? 64 : 90, objectFit:"contain",
                  filter:"drop-shadow(0 6px 20px rgba(0,0,0,0.7))" }}
                onError={e=>{ e.currentTarget.style.display="none"; }}
              />
            )}
            {photoUrl && (
              <div style={{
                width: isMobile ? 52 : 72, height: isMobile ? 64 : 90,
                borderRadius:10, overflow:"hidden",
                border:"2px solid rgba(255,255,255,0.12)",
                background:"rgba(0,0,0,0.3)", flexShrink:0,
              }}>
                <img src={photoUrl} alt={player.name}
                  style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"top center" }}
                  onError={e=>{ e.currentTarget.parentElement.style.display="none"; }}
                />
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div style={{ flex:1, minWidth:0, position:"relative", zIndex:1 }}>
            <div style={{ fontSize: isMobile ? 20 : 26, fontWeight:900, color:"#f0f6ff",
              letterSpacing:"-0.02em", lineHeight:1.1, marginBottom:8 }}>
              {player.name}
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
              <span className="pi-meta-chip" style={{ background:teamColor+"33", borderColor:teamColor+"66", color:"#e8f0ff" }}>
                {player.team}
              </span>
              <span className="pi-meta-chip">{player.position}</span>
              <span className="pi-meta-chip pi-meta-chip-gold">£{cost.toFixed(1)}m</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:6, marginBottom:8 }}>
              <span style={{ color:"#4a6a8a", fontSize:11, fontWeight:700 }}>Next:</span>
              <span style={{ color:"#c8d8f0", fontSize:13, fontWeight:800 }}>{player.next_opp}</span>
              <span className="pi-diff-pill" style={{ background:DIFF_COLOR[diff]||"#7a5c14", color:"#fff" }}>
                {DIFF_LABEL[diff]||"Med"}
              </span>
              <span style={{ color:"#2a4a6a", fontSize:10, marginLeft:2 }}>GW{gw}</span>
            </div>
            <div style={{ fontSize: isMobile ? 28 : 36, fontWeight:900, color:ptsColor,
              fontFamily:"DM Mono, monospace", lineHeight:1 }}>
              {pts.toFixed(1)} <span style={{ fontSize:14, color:"#3a5a7a", fontWeight:700 }}>pts</span>
            </div>
          </div>

          {/* Gauges */}
          <div style={{
            display:"flex",
            flexDirection: isMobile ? "row" : "column",
            gap: isMobile ? 10 : 12,
            alignItems:"center",
            justifyContent: isMobile ? "space-around" : "center",
            flexShrink:0,
            position:"relative", zIndex:1,
            paddingTop: isMobile ? 0 : 4,
          }}>
            <ScoreGauge label="Proj Pts"       value={pts}          max={14} color={ptsColor}  size={gaugeSize}/>
            <ScoreGauge label="Captain"        value={captainScore} max={14} color="#f2c94c"   size={gaugeSize}/>
            <ScoreGauge label="Form"           value={form}         max={10} color="#67b1ff"   size={gaugeSize}/>
          </div>
        </div>

        {/* ══ STATS GRID ══ */}
        <div className="pi-section-label">Key Stats</div>
        <div className="pi-stats-grid">
          <StatRow label="Projected GW Pts"  value={pts.toFixed(1)+" pts"}    color={ptsColor}   bar={true} barValue={pts} max={14} />
          <StatRow label="Form (last 5 GWs)" value={form.toFixed(1)}          color="#67b1ff"    bar={true} barValue={form} max={10} />
          <StatRow label="Appearance Prob"   value={prob+"%"}                  color={probColor}  bar={true} barValue={prob} max={100} />
          <StatRow label="Ownership"         value={own.toFixed(1)+"%"}        color={own>30?"#f2c94c":own>10?"#67b1ff":"#9ff1b4"} />
          <StatRow label="Value Index"       value={(valueIndex).toFixed(2)}   color="#9ff1b4" />
          <StatRow label="Cost"              value={"£"+cost.toFixed(1)+"m"}   color="#c8d8f0" />
          <StatRow label="Merit Score"       value={Number(player.merit||0).toFixed(2)} color="#c8d8f0" />
          <StatRow label="Fixture Diff"      value={DIFF_LABEL[diff]||"Med"}   color={diff<=2?"#9ff1b4":diff>=4?"#ff6b6b":"#f2c94c"} />
        </div>

        {/* ══ 5-GW SPARKLINE ══ */}
        <div className="pi-section-label">5-Gameweek Projection</div>
        <div className="pi-spark-card">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
            flexWrap:"wrap", gap:10, marginBottom:12 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:800, color:"#2a4a6a", letterSpacing:"0.08em", textTransform:"uppercase" }}>
                GW Pts Forecast
              </div>
              <div style={{ fontSize:9, color:"#1a3a5a", marginTop:2 }}>
                Based on fixture difficulty + form + projected model
              </div>
            </div>
            <div style={{ display:"flex", gap:isMobile?4:6, flexWrap:"wrap" }}>
              {fwdPts.map((v,i) => (
                <div key={i} style={{ textAlign:"center", minWidth:isMobile?22:28 }}>
                  <div style={{ fontSize:isMobile?10:11, fontWeight:900,
                    color:v>=9?"#9ff1b4":v>=6?"#67b1ff":"#c8d8f0",
                    fontFamily:"DM Mono, monospace" }}>{v.toFixed(1)}</div>
                  <div style={{ fontSize:8, color:"#2a4a6a", fontWeight:700 }}>GW+{i+1}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ overflowX:"auto" }}>
            <Sparkline5 vals={fwdPts} w={isMobile?280:380} h={isMobile?44:60} />
          </div>
        </div>

        {/* ══ CAPTAINCY ══ */}
        <div className="pi-section-label">Captaincy Analysis</div>
        <div className="pi-captaincy-card">
          <div className="pi-captaincy-score-col">
            <div style={{ fontSize:9, fontWeight:800, color:"#2a4a6a", letterSpacing:"0.1em", textTransform:"uppercase" }}>Captain Score</div>
            <div style={{ fontSize: isMobile ? 28 : 36, fontWeight:900, color:"#f2c94c", fontFamily:"DM Mono, monospace", lineHeight:1 }}>
              {captainScore.toFixed(1)}
            </div>
            <div style={{ fontSize:9, color:"#1a3a5a", marginTop:4 }}>Pts × Availability × Fixture</div>
          </div>
          <div className="pi-captaincy-factors">
            {[
              { lbl:"Projected Pts",    val:pts.toFixed(1),     color:ptsColor   },
              { lbl:"Appearance Prob",  val:prob+"%",           color:probColor  },
              { lbl:"Fixture",          val:DIFF_LABEL[diff]||"Med", color:diff<=2?"#9ff1b4":diff>=4?"#ff6b6b":"#f2c94c" },
              { lbl:"Ownership",        val:own.toFixed(1)+"%", color:own>30?"#f2c94c":"#9ff1b4" },
            ].map(({lbl,val,color}) => (
              <div key={lbl} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"6px 10px", borderRadius:8, background:"rgba(255,255,255,0.03)" }}>
                <span style={{ fontSize:10, fontWeight:700, color:"#3a5a7a" }}>{lbl}</span>
                <span style={{ fontSize:13, fontWeight:900, color, fontFamily:"DM Mono, monospace" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ══ RISK ══ */}
        <div className="pi-section-label">Risk & Availability</div>
        <div className="pi-risk-card">
          <div style={{ display:"flex", alignItems:"center", gap:isMobile?10:16, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:140 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:10, fontWeight:800, color:"#2a4a6a", letterSpacing:"0.08em" }}>APPEARANCE PROBABILITY</span>
                <span style={{ fontSize:16, fontWeight:900, color:probColor, fontFamily:"DM Mono, monospace" }}>{prob}%</span>
              </div>
              <div style={{ height:8, background:"rgba(255,255,255,0.06)", borderRadius:999, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${prob}%`, background:probColor, borderRadius:999,
                  transition:"width 0.8s cubic-bezier(0.22,1,0.36,1)", transitionDelay:"0.3s" }}/>
              </div>
            </div>
            <div style={{ padding:"10px 18px", borderRadius:12,
              background: prob>=85 ? "rgba(40,217,122,0.1)" : prob>=70 ? "rgba(242,201,76,0.1)" : "rgba(255,80,80,0.1)",
              border:`1px solid ${probColor}44`, textAlign:"center", flexShrink:0 }}>
              <div style={{ fontSize:9, fontWeight:800, color:"#2a4a6a", letterSpacing:"0.08em" }}>RISK LEVEL</div>
              <div style={{ fontSize:14, fontWeight:900, color:probColor, marginTop:2 }}>
                {prob>=85?"LOW":prob>=70?"MEDIUM":"HIGH"}
              </div>
            </div>
          </div>
        </div>

        {/* ══ SIMILAR PLAYERS ══ */}
        {similars.length > 0 && (
          <>
            <div className="pi-section-label">Similar {player.position}s to Consider</div>
            <div className="pi-similar-list">
              {similars.map((p,i) => {
                const pPts = Number(p.projected_points||0);
                const pColor = pPts>=9?"#9ff1b4":pPts>=6?"#67b1ff":"#c8d8f0";
                const betterThanCurrent = pPts > pts;
                return (
                  <div key={p.player_id||p.id}
                    className="pi-similar-row"
                    onClick={() => navigate(`/player/${p.player_id||p.id}`)}>
                    <span className="pi-similar-rank" style={{ color:"#2a4a6a" }}>#{i+1}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0 }}>
                      {SHIRT_IDS[p.team] && (
                        <img
                          src={`https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${SHIRT_IDS[p.team]}-66.png`}
                          alt={p.team} width={24} height={24}
                          style={{ objectFit:"contain", filter:"drop-shadow(0 2px 4px rgba(0,0,0,0.5))", flexShrink:0 }}
                          onError={e=>{e.currentTarget.style.display="none";}}
                        />
                      )}
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:800, color:"#c8d8f0",
                          whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</div>
                        <div style={{ fontSize:10, color:"#2a4a6a", fontWeight:700 }}>{p.team} · £{Number(p.cost||0).toFixed(1)}m</div>
                      </div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:16, fontWeight:900, color:pColor, fontFamily:"DM Mono, monospace" }}>
                        {pPts.toFixed(1)}
                      </div>
                      <div style={{ fontSize:8, fontWeight:800, color:betterThanCurrent?"#9ff1b4":"#2a4a6a", letterSpacing:"0.06em" }}>
                        {betterThanCurrent ? `+${(pPts-pts).toFixed(1)}` : "pts"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ══ EXPECTED POINTS CHART ══ */}
        {(player.player_id || player.id) && (
          <>
            <div className="pi-section-label">Expected Points Breakdown</div>
            <ExpectedPointsChart
              playerId={player.player_id || player.id}
              color="#4f9eff"
            />
          </>
        )}

        <div style={{ textAlign:"center", color:"#1a3a5a", fontSize:10, fontWeight:700,
          padding:"20px 0 10px", letterSpacing:"0.06em",
          borderTop:"1px solid rgba(255,255,255,0.05)", marginTop:24 }}>
          Data sourced from FPL API · Projections are model estimates · GW{gw}
        </div>
      </div>
    </div>
  );
}