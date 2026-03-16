// ExpectedPointsChart.jsx — reusable component, embed on /player/:id pages
// Backend: GET /api/fpl/player-ep/:element_id
//   returns: {
//     history:    [{gw, points, ep_implied, minutes, goals, assists, clean_sheets, bonus}],
//     projection: [{gw, ep_projected, fdr, home, opp}],
//     season_ep, season_avg_ep, form_ep, ep_next,
//     total_points, form, name, position, team, cost, current_gw
//   }
// Usage:  <ExpectedPointsChart playerId={123} color="#4f9eff"/>

import { useEffect, useState } from "react";

const API = (import.meta?.env?.VITE_API_URL ?? "");
const FDR_COL = { 1:"#1f7d3d", 2:"#1f7d3d", 3:"#888888", 4:"#8f2424", 5:"#4a0808" };

// ── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ points, color, height=60, filled=false }) {
  if (!points?.length) return null;
  const vals  = points.map(p => p.y);
  const max   = Math.max(...vals, 0.1);
  const min   = Math.min(...vals, 0);
  const range = Math.max(max - min, 0.5);
  const W=280, pad=8, H=height;

  const toX = i => pad + (i / Math.max(points.length - 1, 1)) * (W - pad * 2);
  const toY = v => H - pad - ((v - min) / range) * (H - pad * 2);

  const lineD = points.map((p,i) => `${i===0?"M":"L"}${toX(i).toFixed(1)},${toY(p.y).toFixed(1)}`).join(" ");
  const areaD = `${lineD} L${toX(points.length-1).toFixed(1)},${H} L${toX(0).toFixed(1)},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height, display:"block", overflow:"visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
        </linearGradient>
      </defs>
      {filled && <path d={areaD} fill={`url(#sg-${color.replace("#","")})`}/>}
      <path d={lineD} fill="none" stroke={color} strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round"/>
      {points.map((p,i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(p.y)} r={3.5} fill={color} opacity={0.9}/>
          {p.label && (
            <text x={toX(i)} y={toY(p.y)-8} textAnchor="middle"
              fontSize="8" fill={color} fontWeight="800" opacity="0.85">
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

// ── FDR colour bar under projection ─────────────────────────────────────────
function FdrBar({ items }) {
  if (!items?.length) return null;
  return (
    <div style={{ display:"flex", gap:2, marginTop:4 }}>
      {items.map((item,i) => (
        <div key={i}
          title={`GW${item.gw} vs ${item.opp} ${item.home?"(H)":"(A)"} FDR:${item.fdr}`}
          style={{ flex:1, height:6, borderRadius:2, cursor:"default",
                   background:FDR_COL[item.fdr]||"#888" }}/>
      ))}
    </div>
  );
}

// ── Stat pill ────────────────────────────────────────────────────────────────
function StatPill({ label, value, color="#4f9eff" }) {
  return (
    <div style={{
      padding:"8px 14px", borderRadius:10,
      background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
      textAlign:"center", flex:1, minWidth:80,
    }}>
      <div style={{ fontSize:8, fontWeight:800, color:"rgba(200,220,255,0.35)", letterSpacing:"0.1em", marginBottom:3 }}>
        {label}
      </div>
      <div style={{ fontSize:18, fontWeight:900, fontFamily:"'JetBrains Mono',monospace", color, lineHeight:1 }}>
        {value ?? "—"}
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export function ExpectedPointsChart({ playerId, color="#4f9eff" }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    setLoading(true); setError(null);
    fetch(`${API}/api/fpl/player-ep/${playerId}`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [playerId]);

  if (loading) {
    return (
      <div style={{
        padding:20, borderRadius:14, background:"rgba(255,255,255,0.02)",
        border:"1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{
          height:80,
          background:"linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.03) 75%)",
          backgroundSize:"200% 100%", animation:"shimmer 1.6s infinite", borderRadius:8,
        }}/>
        <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding:"10px 14px", borderRadius:10, background:"rgba(255,80,80,0.05)",
        border:"1px solid rgba(255,80,80,0.15)", fontSize:11, color:"#ff8080",
      }}>
        EP data unavailable.
      </div>
    );
  }

  if (!data) return null;

  // ── Map backend shape to chart points ────────────────────────────────────
  // projection[]: { gw, ep_projected, fdr, home, opp }
  const projPoints = (data.projection || []).map(g => ({
    y:     g.ep_projected,
    label: g.ep_projected?.toFixed(1),
    gw:    g.gw,
    fdr:   g.fdr,
    opp:   g.opp,
    home:  g.home,
  }));

  // history[]: { gw, points, ep_implied, minutes }
  const histPoints = (data.history || []).slice(-10).map(g => ({
    y:     g.points,
    label: String(g.points),
    gw:    g.gw,
  }));

  const epNextGw    = projPoints[0]?.y;
  const valuePer1m  = data.season_avg_ep != null && data.cost
    ? (data.season_avg_ep / data.cost).toFixed(2) : null;

  return (
    <div style={{
      padding:20, borderRadius:16, background:"rgba(255,255,255,0.02)",
      border:"1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{ fontSize:11, fontWeight:800, color:"rgba(200,220,255,0.5)",
        letterSpacing:"0.1em", marginBottom:14 }}>
        EXPECTED POINTS ANALYSIS
      </div>

      {/* Stat pills — use backend field names directly */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
        <StatPill label="EP NEXT GW"   value={epNextGw?.toFixed(2)}            color={color}/>
        <StatPill label="SEASON EP"    value={data.season_ep?.toFixed(1)}       color={color}/>
        <StatPill label="AVG EP/GW"    value={data.season_avg_ep?.toFixed(2)}   color={color}/>
        <StatPill label="FORM EP (5)"  value={data.form_ep?.toFixed(2)}         color={color}/>
        {valuePer1m && <StatPill label="EP/£m" value={valuePer1m} color={color}/>}
      </div>

      {/* EP projection sparkline */}
      {projPoints.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:9, fontWeight:800, color:"rgba(200,220,255,0.35)",
            letterSpacing:"0.08em", marginBottom:8 }}>
            PROJECTED EP — NEXT {projPoints.length} GAMEWEEKS
          </div>
          <Sparkline points={projPoints} color={color} height={70} filled={true}/>
          <FdrBar items={projPoints}/>
          {/* GW labels */}
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
            {projPoints.map(g => (
              <span key={g.gw} style={{ fontSize:8, color:"rgba(200,220,255,0.3)",
                fontFamily:"'JetBrains Mono',monospace" }}>
                {g.gw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actual points history */}
      {histPoints.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:9, fontWeight:800, color:"rgba(200,220,255,0.35)",
            letterSpacing:"0.08em", marginBottom:8 }}>
            ACTUAL POINTS — LAST {histPoints.length} GAMEWEEKS
          </div>
          <Sparkline points={histPoints} color="rgba(200,220,255,0.45)" height={50}/>
        </div>
      )}

      {/* Upcoming fixtures breakdown */}
      {projPoints.length > 0 && (
        <div style={{
          padding:"10px 12px", borderRadius:8,
          background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ fontSize:9, fontWeight:800, color:"rgba(200,220,255,0.35)",
            letterSpacing:"0.08em", marginBottom:8 }}>
            UPCOMING FIXTURES
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {projPoints.map(g => (
              <div key={g.gw} style={{
                display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                padding:"5px 9px", borderRadius:7,
                background:`${FDR_COL[g.fdr]||"#888"}22`,
                border:`1px solid ${FDR_COL[g.fdr]||"#888"}44`,
              }}>
                <span style={{ fontSize:8, fontWeight:800, color:"rgba(200,220,255,0.4)" }}>GW{g.gw}</span>
                <span style={{ fontSize:10, fontWeight:800, color:"#e8f0ff" }}>
                  {g.opp}{g.home ? " H" : " A"}
                </span>
                <span style={{ fontSize:11, fontWeight:900,
                  fontFamily:"'JetBrains Mono',monospace", color }}>
                  {g.y?.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Default export for convenience
export default ExpectedPointsChart;