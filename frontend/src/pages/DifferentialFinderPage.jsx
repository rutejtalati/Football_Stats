// DifferentialFinderPage.jsx — /differentials
// Backend: GET /api/fpl/differentials
//   params: max_owned (0.0-0.50), min_ep (float), position, max_cost, top_n
//   returns: { differentials: [...], count, current_gw, filters }
//   each player has: ep_next, captain_score, fixture_run_score (0-10),
//                    selected_by_pct, next_opp, form, cost, position, team

import { useEffect, useState } from "react";

import { API_BASE as API } from "@/api/api";
const POS_COL = { GK:"#f2c94c", DEF:"#4f9eff", MID:"#00e09e", FWD:"#ff6b6b" };

const CSS = `
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
`;

function OwnershipMeter({ pct }) {
  const color = pct < 3 ? "#00e09e" : pct < 7 ? "#4f9eff" : "#f2c94c";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, minWidth:90 }}>
      <div style={{ flex:1, height:5, borderRadius:3, background:"rgba(255,255,255,0.07)", overflow:"hidden" }}>
        <div style={{
          height:"100%", width:`${Math.min(pct / 15 * 100, 100)}%`,
          background:color, borderRadius:3,
          transition:"width 0.7s cubic-bezier(0.22,1,0.36,1)",
        }}/>
      </div>
      <span style={{ fontSize:10, fontWeight:800, color, fontFamily:"'JetBrains Mono',monospace", minWidth:30 }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function DiffScore({ score }) {
  // captain_score is EP*2 with differential bonus — typical range 4-20
  const norm  = Math.min(score / 15 * 100, 100);
  const color = norm >= 60 ? "#00e09e" : norm >= 35 ? "#4f9eff" : "#f2c94c";
  const label = norm >= 60 ? "🔥 Hot" : norm >= 35 ? "👍 Good" : "⚡ Niche";
  return (
    <div style={{ textAlign:"center" }}>
      <div style={{
        fontSize:20, fontWeight:900, fontFamily:"'JetBrains Mono',monospace",
        color, lineHeight:1, textShadow:`0 0 14px ${color}55`,
      }}>{score.toFixed(1)}</div>
      <div style={{ fontSize:9, color:"rgba(200,220,255,0.5)", marginTop:2 }}>{label}</div>
    </div>
  );
}

function DiffCard({ player, rank }) {
  const [hov, setHov] = useState(false);
  const col      = POS_COL[player.position] || "#4f9eff";
  // fixture_run_score is 0-10 from backend
  const frsColor = player.fixture_run_score >= 6.5 ? "#00e09e"
                 : player.fixture_run_score >= 4.0 ? "#f2c94c" : "#ff6b6b";

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        border:`1px solid ${hov ? col+"55" : "rgba(255,255,255,0.07)"}`,
        borderRadius:14, padding:"16px 18px",
        background: hov ? `linear-gradient(135deg,rgba(10,16,28,0.98),${col}0a)` : "rgba(255,255,255,0.02)",
        transition:"all 200ms cubic-bezier(0.22,1,0.36,1)",
        transform: hov ? "translateY(-2px)" : "none",
        cursor:"default", position:"relative", overflow:"hidden",
      }}
    >
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:2,
        background:`linear-gradient(90deg,transparent,${col}${hov?"77":"33"},transparent)`,
      }}/>

      {/* Rank + position */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <span style={{
            width:22, height:22, borderRadius:6,
            background:rank<=3 ? "rgba(242,201,76,0.15)" : "rgba(255,255,255,0.06)",
            border:`1px solid ${rank<=3 ? "#f2c94c44" : "rgba(255,255,255,0.1)"}`,
            color:rank<=3 ? "#f2c94c" : "rgba(200,220,255,0.6)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:10, fontWeight:900, flexShrink:0,
          }}>{rank}</span>
          <span style={{
            fontSize:9, fontWeight:800, color:col,
            background:`${col}14`, border:`1px solid ${col}30`,
            padding:"2px 7px", borderRadius:999,
          }}>{player.position}</span>
          <span style={{ fontSize:10, color:"rgba(200,220,255,0.5)", fontWeight:700 }}>
            {player.team}
          </span>
        </div>
        {/* captain_score is the differential ranking metric */}
        <DiffScore score={player.captain_score}/>
      </div>

      {/* Name + cost */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:15, fontWeight:800, color:"#f0f6ff", fontFamily:"'Sora',sans-serif", marginBottom:2 }}>
          {player.name}
        </div>
        <div style={{ fontSize:11, color:"rgba(200,220,255,0.5)" }}>£{player.cost}m</div>
      </div>

      {/* EP + form + fixture run */}
      <div style={{ display:"flex", gap:16, marginBottom:10 }}>
        {[
          { label:"EP Next GW", val: player.ep_next?.toFixed(2),          color: col   },
          { label:"Form",       val: player.form?.toFixed(1),             color: "#e8f0ff" },
          { label:"Fix Run",    val: player.fixture_run_score?.toFixed(1)+"/10", color: frsColor },
        ].map(m => (
          <div key={m.label}>
            <div style={{ fontSize:8, fontWeight:800, color:"rgba(200,220,255,0.35)", letterSpacing:"0.08em", marginBottom:2 }}>
              {m.label}
            </div>
            <div style={{ fontSize:15, fontWeight:900, fontFamily:"'JetBrains Mono',monospace", color:m.color }}>
              {m.val}
            </div>
          </div>
        ))}
      </div>

      {/* Next fixture */}
      <div style={{
        display:"flex", alignItems:"center", gap:6, marginBottom:8,
        padding:"5px 8px", borderRadius:7, background:"rgba(255,255,255,0.04)",
      }}>
        <span style={{ fontSize:9, fontWeight:700, color:"rgba(200,220,255,0.4)" }}>Next:</span>
        <span style={{ fontSize:11, fontWeight:800, color:"#e8f0ff" }}>{player.next_opp || "TBC"}</span>
      </div>

      {/* Ownership meter */}
      <div>
        <div style={{ fontSize:8, fontWeight:800, color:"rgba(200,220,255,0.35)", letterSpacing:"0.08em", marginBottom:4 }}>
          OWNERSHIP (differential upside)
        </div>
        <OwnershipMeter pct={player.selected_by_pct}/>
      </div>

      {/* Transfer momentum */}
      {Math.abs(player.transfer_momentum || 0) > 1000 && (
        <div style={{ marginTop:8, fontSize:10, fontWeight:800,
          color: player.transfer_momentum > 0 ? "#00e09e" : "#ff6b6b" }}>
          {player.transfer_momentum > 0 ? "↑" : "↓"}{" "}
          {Math.abs(player.transfer_momentum / 1000).toFixed(0)}k net transfers this GW
        </div>
      )}
    </div>
  );
}

function Skel({ h=120 }) {
  return <div style={{
    height:h, borderRadius:14,
    background:"linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.03) 75%)",
    backgroundSize:"200% 100%", animation:"shimmer 1.6s infinite",
  }}/>;
}

export default function DifferentialFinderPage() {
  const [players,   setPlayers]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [maxOwn,    setMaxOwn]    = useState(0.10);   // fractional 0-0.50
  const [position,  setPosition]  = useState("ALL");
  const [minEp,     setMinEp]     = useState(3.0);    // raw EP threshold
  const [maxCost,   setMaxCost]   = useState(15.5);
  const [topN,      setTopN]      = useState(12);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    const p = new URLSearchParams({
      max_owned: maxOwn,    // 0.0–0.50 fractional
      min_ep:    minEp,     // raw EP value (e.g. 3.0)
      position,
      max_cost:  maxCost,
      top_n:     topN,
    });
    fetch(`${API}/api/fpl/differentials?${p}`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { if (!cancelled) { setPlayers(d.differentials || []); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [maxOwn, position, minEp, maxCost, topN]);

  return (
    <div style={{ minHeight:"100vh", background:"#060a14", color:"#e8f0ff", fontFamily:"'Inter',sans-serif" }}>
      <style>{CSS}</style>

      <div style={{ padding:"32px 24px 20px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ fontSize:9, fontWeight:800, color:"#00e09e", letterSpacing:"0.15em", marginBottom:6 }}>
          FPL DIFFERENTIALS
        </div>
        <h1 style={{
          fontSize:"clamp(22px,4vw,34px)", fontWeight:900, margin:"0 0 8px",
          fontFamily:"'Sora',sans-serif", letterSpacing:"-0.02em",
          background:"linear-gradient(135deg,#00e09e,#4f9eff)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}>Differential Finder</h1>
        <p style={{ fontSize:13, color:"#4a6a8a", margin:0, lineHeight:1.6 }}>
          High-EP players under {(maxOwn * 100).toFixed(0)}% ownership — the picks that win mini-leagues.
          Ranked by captain score (EP × 2 × differential bonus).
        </p>
      </div>

      {/* Filters */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px 20px" }}>
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)",
          borderRadius:14, padding:"14px 18px",
          display:"flex", gap:14, flexWrap:"wrap", alignItems:"flex-end",
        }}>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:9, fontWeight:800, color:"#2a4a6a", letterSpacing:"0.08em" }}>POSITION</label>
            <div style={{ display:"flex", gap:5 }}>
              {["ALL","GK","DEF","MID","FWD"].map(p => (
                <button key={p} onClick={() => setPosition(p)} style={{
                  padding:"5px 12px", borderRadius:999, fontSize:11, fontWeight:800,
                  cursor:"pointer", fontFamily:"inherit", border:"none",
                  background:position===p ? "rgba(0,224,158,0.15)" : "rgba(255,255,255,0.05)",
                  color:position===p ? "#00e09e" : "#4a6a8a",
                  outline:position===p ? "1px solid rgba(0,224,158,0.4)" : "none",
                }}>{p}</button>
              ))}
            </div>
          </div>

          {[
            { label:"MAX OWN %", val:+(maxOwn*100).toFixed(0), set:v=>setMaxOwn(v/100), step:1,    min:1,  max:30, suffix:"%" },
            { label:"MIN EP",    val:minEp,                     set:setMinEp,             step:0.5,  min:0,  max:15, suffix:"" },
            { label:"MAX COST",  val:maxCost,                   set:setMaxCost,           step:0.5,  min:4,  max:15.5, suffix:"m" },
            { label:"TOP N",     val:topN,                      set:setTopN,              step:1,    min:5,  max:30, suffix:"" },
          ].map(f => (
            <div key={f.label} style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <label style={{ fontSize:9, fontWeight:800, color:"#2a4a6a", letterSpacing:"0.08em" }}>{f.label}</label>
              <input type="number" step={f.step} min={f.min} max={f.max} value={f.val}
                onChange={e => f.set(Number(e.target.value))}
                style={{
                  padding:"6px 10px", borderRadius:8, fontSize:13, width:80,
                  background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
                  color:"#e8f0ff", outline:"none",
                }}/>
            </div>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px 80px" }}>
        {error && (
          <div style={{
            padding:"12px 16px", borderRadius:10, background:"rgba(255,80,80,0.08)",
            border:"1px solid rgba(255,80,80,0.2)", color:"#ff8080", fontSize:12, marginBottom:16,
          }}>{error}</div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
          {loading
            ? Array.from({length:8}).map((_,i) => <Skel key={i}/>)
            : players.map((p, i) => (
                <div key={p.player_id} style={{ animation:`fadeUp 350ms ${i*40}ms ease both` }}>
                  <DiffCard player={p} rank={i+1}/>
                </div>
              ))
          }
        </div>

        {!loading && players.length === 0 && !error && (
          <div style={{ textAlign:"center", padding:"60px", color:"#4a6a8a", fontSize:13 }}>
            No differentials found. Try increasing Max Ownership % or lowering Min EP.
          </div>
        )}
      </div>
    </div>
  );
}