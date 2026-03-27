// pages/TransferPlannerPage.jsx
import { useEffect, useState } from "react";

import { API_BASE as API } from "@/api/api";
const POS_COL = { GK:"#f2c94c", DEF:"#4f9eff", MID:"#00e09e", FWD:"#ff6b6b" };
const FDR_CFG = {
  1:{bg:"#1a7a3e",fg:"#e6fff0"},2:{bg:"#2a6e3f",fg:"#e0ffe8"},
  3:{bg:"#2d2d2d",fg:"#8a9aaa"},4:{bg:"#7a2020",fg:"#ffe0e0"},
  5:{bg:"#4a0a0a",fg:"#ffd0d0"},
};

function MetricPill({ label, value, color }) {
  return (
    <span style={{
      fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:999,
      background:`${color}14`, color, border:`1px solid ${color}30`,
    }}>{label}: {value}</span>
  );
}
function FixRun({ score }) {
  // fixture_run_score is 0-10 (10 = easiest)
  const color = score >= 6.5 ? "#1f7d3d" : score >= 4.0 ? "#c26519" : "#8f2424";
  const label = score >= 6.5 ? "Easy" : score >= 4.0 ? "Med" : "Hard";
  return <MetricPill label="Fix Run" value={label} color={color}/>;
}
function TrendArrow({ momentum }) {
  if (Math.abs(momentum) < 1000) return null;
  const up = momentum > 0;
  return (
    <span style={{ fontSize:10, fontWeight:900, color:up?"#00e09e":"#ff6b6b", marginLeft:4 }}>
      {up ? `↑ ${(momentum/1000).toFixed(0)}k` : `↓ ${(Math.abs(momentum)/1000).toFixed(0)}k`}
    </span>
  );
}

function PlayerRow({ player, type }) {
  const [hov, setHov] = useState(false);
  const col     = POS_COL[player.position] || "#4f9eff";
  const isIn    = type === "in";
  const border  = isIn ? "#00e09e" : "#ff6b6b";
  const fdrCfg  = FDR_CFG[player.fixture_difficulty] || FDR_CFG[3];

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", alignItems:"center", gap:12,
        padding:"10px 14px", borderRadius:10,
        background: hov ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
        border:`1px solid ${hov ? border+"33" : "rgba(255,255,255,0.06)"}`,
        transition:"all 180ms", cursor:"default",
      }}
    >
      {/* Transfer direction badge */}
      <div style={{
        width:26, height:26, borderRadius:8, flexShrink:0,
        background: isIn ? "rgba(0,224,158,0.12)" : "rgba(255,107,107,0.12)",
        border:`1px solid ${border}44`,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:14,
      }}>
        {isIn ? "↑" : "↓"}
      </div>

      {/* Photo + name */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <span style={{ fontSize:13, fontWeight:800, color:"#e8f0ff", whiteSpace:"nowrap" }}>
            {player.name}
          </span>
          <span style={{
            fontSize:9,fontWeight:800,color:col,
            background:`${col}14`,border:`1px solid ${col}30`,
            padding:"1px 6px",borderRadius:999,
          }}>{player.position}</span>
          <span style={{ fontSize:10, color:"rgba(200,220,255,0.5)" }}>{player.team}</span>
          <span style={{ fontSize:10, color:"rgba(200,220,255,0.5)" }}>£{player.cost}m</span>
        </div>
        {/* Reason tag for sell candidates */}
        {player.reason && (
          <div style={{
            marginTop:3, fontSize:10, color:"#ff8080",
            fontStyle:"italic", fontFamily:"'Inter',sans-serif",
          }}>
            Sell reason: {player.reason}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", flexShrink:0 }}>
        <span style={{
          fontSize:14, fontWeight:900, fontFamily:"'JetBrains Mono',monospace",
          color: isIn ? "#00e09e" : "#ff8080",
        }}>
          {player.ep_next?.toFixed(2)} EP
        </span>
        <div style={{
          fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:999,
          background:fdrCfg.bg, color:fdrCfg.fg,
        }}>
          {player.next_opp || "—"}
        </div>
        <FixRun score={player.fixture_run_score}/>
        <MetricPill label="Form" value={player.form?.toFixed(1)} color={col}/>
        <MetricPill label="Own" value={`${player.selected_by_pct?.toFixed(1)}%`} color="rgba(200,220,255,0.6)"/>
        {player.transfer_momentum !== undefined && (
          <TrendArrow momentum={player.transfer_momentum}/>
        )}
      </div>
    </div>
  );
}

function Skel({ h=40, r=10 }) {
  return <div style={{
    height:h, borderRadius:r,
    background:"linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.03) 75%)",
    backgroundSize:"200% 100%", animation:"shimmer 1.6s infinite",
  }}/>;
}

export default function TransferPlannerPage() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [position, setPosition] = useState("ALL");
  const [maxCost, setMaxCost]   = useState(15.5);
  const [minProb, setMinProb]   = useState(0.7);
  const [topN, setTopN]         = useState(10);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    const p = new URLSearchParams({ position, max_cost:maxCost, num_gws:5, top_in:topN, top_out:topN });
    fetch(`${API}/api/fpl/transfer-planner?${p}`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [position, maxCost, minProb, topN]);

  return (
    <div className="page-shell">
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      <div className="page-content-wide">

        <div style={{ marginBottom:20 }}>
          <h1 className="page-title-left" style={{ marginBottom:4 }}>Transfer Planner</h1>
          <p style={{ fontSize:12, color:"#4a7a9a", margin:0, fontFamily:"'Inter',sans-serif" }}>
            Transfer recommendations based on expected points, fixture run, form, and
            transfer momentum. Sell candidates identified by poor upcoming fixtures or
            minutes concerns.
          </p>
        </div>

        {/* Filters */}
        <div style={{
          background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
          borderRadius:14, padding:"14px 18px", marginBottom:20,
          display:"flex", gap:14, flexWrap:"wrap", alignItems:"flex-end",
        }}>
          {/* Position */}
          <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
            <label style={{ fontSize:9,fontWeight:800,color:"#2a4a6a",letterSpacing:"0.08em" }}>POSITION</label>
            <div style={{ display:"flex",gap:5 }}>
              {["ALL","GK","DEF","MID","FWD"].map(p => (
                <button key={p} onClick={() => setPosition(p)} style={{
                  padding:"5px 12px",borderRadius:999,fontSize:11,fontWeight:800,
                  cursor:"pointer",fontFamily:"inherit",border:"none",
                  background:position===p?"rgba(79,158,255,0.18)":"rgba(255,255,255,0.05)",
                  color:position===p?"#67b1ff":"#4a7a9a",
                  outline:position===p?"1px solid rgba(79,158,255,0.4)":"none",
                }}>{p}</button>
              ))}
            </div>
          </div>
          {[
            {label:"MAX COST",val:maxCost,set:setMaxCost,step:0.5,min:4,max:15.5},
            {label:"MIN PROB",val:minProb,set:setMinProb,step:0.05,min:0,max:1},
            {label:"TOP N",  val:topN,   set:setTopN,   step:1,   min:5, max:25},
          ].map(f => (
            <div key={f.label} style={{ display:"flex",flexDirection:"column",gap:4 }}>
              <label style={{ fontSize:9,fontWeight:800,color:"#2a4a6a",letterSpacing:"0.08em" }}>{f.label}</label>
              <input type="number" step={f.step} min={f.min} max={f.max} value={f.val}
                onChange={e=>f.set(Number(e.target.value))}
                style={{
                  padding:"6px 10px",borderRadius:8,fontSize:13,width:80,
                  background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",
                  color:"#e8f0ff",outline:"none",
                }}/>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ padding:"12px 16px",borderRadius:10,background:"rgba(255,80,80,0.08)",
            border:"1px solid rgba(255,80,80,0.2)",color:"#ff8080",fontSize:12,marginBottom:16 }}>
            {error}
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          {/* Transfer In */}
          <div>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
              <div style={{ width:8,height:8,borderRadius:"50%",background:"#00e09e",boxShadow:"0 0 8px #00e09e" }}/>
              <h2 style={{ margin:0,fontSize:16,fontWeight:900,color:"#e8f0ff",fontFamily:"'Sora',sans-serif" }}>
                Transfer In
              </h2>
              <span style={{ fontSize:11,color:"#4a7a9a",marginTop:2 }}>— best players to buy</span>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
              {loading
                ? Array.from({length:5}).map((_,i) => <Skel key={i}/>)
                : (data?.targets_in || []).map((p,i) => (
                    <PlayerRow key={p.player_id||i} player={p} type="in"/>
                  ))
              }
            </div>
          </div>

          {/* Transfer Out */}
          <div>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
              <div style={{ width:8,height:8,borderRadius:"50%",background:"#ff6b6b",boxShadow:"0 0 8px #ff6b6b" }}/>
              <h2 style={{ margin:0,fontSize:16,fontWeight:900,color:"#e8f0ff",fontFamily:"'Sora',sans-serif" }}>
                Sell Watchlist
              </h2>
              <span style={{ fontSize:11,color:"#4a7a9a",marginTop:2 }}>— consider selling</span>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
              {loading
                ? Array.from({length:5}).map((_,i) => <Skel key={i}/>)
                : (data?.targets_out || []).map((p,i) => (
                    <PlayerRow key={p.player_id||i} player={p} type="out"/>
                  ))
              }
              {!loading && !data?.targets_out?.length && (
                <div style={{ padding:"16px 0",color:"#4a7a9a",fontSize:12,textAlign:"center" }}>
                  No sell candidates identified with current filters.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}