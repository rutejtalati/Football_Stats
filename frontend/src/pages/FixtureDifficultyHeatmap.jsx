// pages/FixtureDifficultyHeatmap.jsx
import { useEffect, useState, useMemo } from "react";

import { API_BASE as API } from "@/api/api";

// FDR colour scale — matches official FPL colours
const FDR_COLORS = {
  1: { bg:"#1f7d3d", fg:"#e8fff0", short:"1" },
  2: { bg:"#1f7d3d", fg:"#e8fff0", short:"2" },
  3: { bg:"#2d2d2d", fg:"#8a9aaa", short:"3" },
  4: { bg:"#8f2424", fg:"#fff0f0", short:"4" },
  5: { bg:"#4a0808", fg:"#ffc0c0", short:"5" },
};

function FdrCell({ difficulty, opp, home, compact }) {
  const [hov, setHov] = useState(false);
  const c = FDR_COLORS[difficulty] || FDR_COLORS[3];
  const label = opp ? `${opp}\u00a0${home ? "(H)" : "(A)"}` : "—";
  return (
    <td
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={`FDR ${difficulty} · ${label}`}
      style={{
        background:hov ? `${c.bg}dd` : c.bg,
        color:c.fg,
        textAlign:"center",
        fontWeight:800,
        fontSize: compact ? 9 : 11,
        padding: compact ? "4px 5px" : "6px 10px",
        border:"1px solid rgba(0,0,0,0.25)",
        whiteSpace:"nowrap",
        cursor:"default",
        transition:"background 120ms",
        minWidth: compact ? 44 : 64,
      }}
    >
      {compact ? (opp ? `${opp.slice(0,3)}${home?"H":"A"}` : "—") : label}
    </td>
  );
}

function BlankCell({ compact }) {
  return (
    <td style={{
      background:"rgba(255,255,255,0.03)",
      border:"1px solid rgba(255,255,255,0.04)",
      textAlign:"center", fontSize:10, color:"rgba(200,220,255,0.2)",
      padding: compact ? "4px 5px" : "6px 10px",
      minWidth: compact ? 44 : 64,
    }}>—</td>
  );
}

function AvgDiffBar({ avg, max = 5 }) {
  const ratio = avg / max;
  const color = ratio <= 0.5 ? "#1f7d3d" : ratio <= 0.7 ? "#c26519" : "#8f2424";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <div style={{ flex:1, height:5, borderRadius:3, background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
        <div style={{
          height:"100%", width:`${ratio*100}%`, background:color,
          borderRadius:3, transition:"width 0.6s ease",
        }}/>
      </div>
      <span style={{ fontSize:10, fontWeight:800, color, fontFamily:"'JetBrains Mono',monospace", minWidth:26 }}>
        {avg.toFixed(1)}
      </span>
    </div>
  );
}

function Skel({ h=16, w="100%", r=4 }) {
  return (
    <div style={{
      height:h, width:w, borderRadius:r,
      background:"linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.03) 75%)",
      backgroundSize:"200% 100%", animation:"shimmer 1.6s infinite",
    }}/>
  );
}

export default function FixtureDifficultyHeatmap() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [numGws, setNumGws]     = useState(10);
  const [compact, setCompact]   = useState(false);
  const [sortBy, setSortBy]     = useState("avg_fdr");  // "avg_fdr" | "name"

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    fetch(`${API}/api/fpl/fixture-difficulty?num_gws=${numGws}`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [numGws]);

  const sortedTeams = useMemo(() => {
    if (!data?.teams) return [];
    return [...data.teams].sort((a, b) =>
      sortBy === "avg_fdr"
        ? a.avg_fdr - b.avg_fdr
        : a.name.localeCompare(b.name)
    );
  }, [data, sortBy]);

  const gws  = data?.gws  || [];
  // backend embeds fixtures in each team object as {gw: cell} dict
  // we pass the team object directly to the row renderer

  return (
    <div className="page-shell">
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      <div className="page-content-wide">

        {/* Header */}
        <div style={{ marginBottom:20 }}>
          <h1 className="page-title-left" style={{ marginBottom:4 }}>Fixture Difficulty Heatmap</h1>
          <p style={{ fontSize:12, color:"#4a7a9a", margin:0, fontFamily:"'Inter',sans-serif" }}>
            FDR colour grid: green = easy, red = hard. Teams sorted by average difficulty
            over the window. Hover cells for full fixture detail.
          </p>
        </div>

        {/* Legend + controls */}
        <div style={{
          display:"flex", gap:14, flexWrap:"wrap", alignItems:"center",
          marginBottom:16, padding:"10px 14px",
          background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12,
        }}>
          {/* FDR legend */}
          <div style={{ display:"flex", gap:5, alignItems:"center" }}>
            <span style={{ fontSize:9,fontWeight:800,color:"#4a7a9a",marginRight:4,letterSpacing:"0.08em" }}>FDR:</span>
            {[1,2,3,4,5].map(d => (
              <div key={d} style={{
                width:28, height:20, borderRadius:4,
                background:FDR_COLORS[d].bg, color:FDR_COLORS[d].fg,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:10, fontWeight:900,
              }}>{d}</div>
            ))}
          </div>
          <div style={{ width:1, height:20, background:"rgba(255,255,255,0.08)" }}/>
          {/* GW count */}
          <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
            <label style={{ fontSize:9,fontWeight:800,color:"#2a4a6a",letterSpacing:"0.08em" }}>GAMEWEEKS</label>
            <input type="range" min={5} max={20} step={1} value={numGws}
              onChange={e => setNumGws(Number(e.target.value))}
              style={{ width:100, cursor:"pointer" }}/>
            <span style={{ fontSize:10, color:"#4a7a9a", textAlign:"center" }}>{numGws} GWs</span>
          </div>
          {/* Sort */}
          <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
            <label style={{ fontSize:9,fontWeight:800,color:"#2a4a6a",letterSpacing:"0.08em" }}>SORT BY</label>
            <div style={{ display:"flex", gap:4 }}>
              {[["avg_fdr","Difficulty"],["name","Team Name"]].map(([k,l])=>(
                <button key={k} onClick={() => setSortBy(k)} style={{
                  padding:"4px 10px",borderRadius:999,fontSize:10,fontWeight:800,
                  cursor:"pointer",fontFamily:"inherit",border:"none",
                  background:sortBy===k?"rgba(79,158,255,0.18)":"rgba(255,255,255,0.05)",
                  color:sortBy===k?"#67b1ff":"#4a7a9a",
                  outline:sortBy===k?"1px solid rgba(79,158,255,0.35)":"none",
                }}>{l}</button>
              ))}
            </div>
          </div>
          {/* Compact toggle */}
          <label style={{ display:"flex",gap:6,alignItems:"center",cursor:"pointer",fontSize:11,color:"#4a7a9a",userSelect:"none" }}>
            <input type="checkbox" checked={compact} onChange={e=>setCompact(e.target.checked)}
              style={{ cursor:"pointer" }}/>
            Compact
          </label>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding:"12px 16px",borderRadius:10,background:"rgba(255,80,80,0.08)",
            border:"1px solid rgba(255,80,80,0.2)",color:"#ff8080",fontSize:12,marginBottom:16 }}>
            {error}
          </div>
        )}

        {/* Table */}
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)",
          borderRadius:14, overflow:"hidden",
        }}>
          <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
            <table style={{ borderCollapse:"collapse", width:"100%", minWidth:600 }}>
              <thead>
                <tr>
                  <th style={{
                    background:"#060d18", color:"#4a7a9a", fontSize:10, fontWeight:800,
                    padding:"8px 14px", borderBottom:"1px solid rgba(255,255,255,0.07)",
                    position:"sticky", left:0, zIndex:2, textAlign:"left",
                    whiteSpace:"nowrap", minWidth:160,
                  }}>
                    Team
                  </th>
                  <th style={{
                    background:"#060d18", color:"#4a7a9a", fontSize:10, fontWeight:800,
                    padding:"8px 14px", borderBottom:"1px solid rgba(255,255,255,0.07)",
                    whiteSpace:"nowrap", minWidth: compact ? 80 : 100,
                  }}>
                    Avg FDR
                  </th>
                  {gws.map(gw => (
                    <th key={gw} style={{
                      background:"#060d18", color:"#4a7a9a", fontSize:10, fontWeight:800,
                      padding:"8px 8px", borderBottom:"1px solid rgba(255,255,255,0.07)",
                      textAlign:"center", whiteSpace:"nowrap",
                      minWidth: compact ? 44 : 64,
                    }}>
                      GW{gw}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({length:10}).map((_,i) => (
                      <tr key={i}>
                        <td style={{ padding:"8px 14px", background:"#060a14", position:"sticky", left:0, minWidth:160 }}>
                          <Skel h={14} w={120}/>
                        </td>
                        <td style={{ padding:"8px 14px" }}><Skel h={14} w={80}/></td>
                        {Array.from({length:Math.min(numGws,5)}).map((_,j)=>(
                          <td key={j} style={{ padding:"6px 10px" }}><Skel h={24}/></td>
                        ))}
                      </tr>
                    ))
                  : sortedTeams.map(team => {
                      // backend: team.fixtures is {gw: {difficulty, home, opp}} dict
                      const fxsByGw = team.fixtures || {};
                      return (
                        <tr key={team.team_id}
                          style={{ "&:hover td": { background:"rgba(255,255,255,0.02)" } }}>
                          {/* Sticky team name */}
                          <td style={{
                            position:"sticky", left:0, zIndex:1,
                            background:"#060a14", padding:"6px 14px",
                            borderBottom:"1px solid rgba(255,255,255,0.04)",
                            borderRight:"1px solid rgba(255,255,255,0.06)",
                            minWidth:160,
                          }}>
                            <div style={{ fontWeight:800, fontSize:compact?11:13, color:"#e8f0ff", whiteSpace:"nowrap" }}>
                              {team.short}
                            </div>
                            {!compact && (
                              <div style={{ fontSize:9, color:"#4a7a9a", fontWeight:600 }}>{team.name}</div>
                            )}
                          </td>
                          {/* Avg FDR */}
                          <td style={{
                            padding:"6px 14px",
                            borderBottom:"1px solid rgba(255,255,255,0.04)",
                          }}>
                            <AvgDiffBar avg={team.avg_fdr}/>
                          </td>
                          {/* FDR cells */}
                          {gws.map(gw => {
                            const fx = fxsByGw[gw];
                            return fx
                              ? <FdrCell key={gw} difficulty={fx.difficulty} opp={fx.opp} home={fx.home} compact={compact}/>
                              : <BlankCell key={gw} compact={compact}/>;
                          })}
                        </tr>
                      );
                    })
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer note */}
        <div style={{ marginTop:10, fontSize:10, color:"#2a4a6a", fontFamily:"'Inter',sans-serif" }}>
          FDR data from FPL. Sorted by average difficulty over the selected window.
          Green = 1-2 (easy), grey = 3 (medium), red = 4-5 (hard).
        </div>
      </div>
    </div>
  );
}