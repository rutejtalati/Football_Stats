// BestXIPage.jsx — /best-xi
// Backend: GET /api/fpl/best-xi
//   params: budget (float), formation (433|442|352|343|451|541)
//   returns: { xi:[...], formation, slots, budget, total_cost,
//              budget_remaining, total_ep, current_gw }
//   each player in xi has: ep_next, cost, name, position, team,
//                          next_opp, fixture_difficulty, photo

import { useEffect, useState, useMemo } from "react";

const API = (import.meta?.env?.VITE_API_URL ?? "");
const POS_COL = { GK:"#f2c94c", DEF:"#4f9eff", MID:"#00e09e", FWD:"#ff6b6b" };
const FDR_BG  = { 1:"#1a7a3e", 2:"#1a7a3e", 3:"#2d2d2d", 4:"#7a2020", 5:"#4a0a0a" };
// Backend-supported formations only
const FORMATIONS = ["442","433","352","343","451","541"];
const POS_ORDER  = ["GK","DEF","MID","FWD"];

const CSS = `
  @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
`;

function PlayerChip({ player, isCaptain, isVC, showEP }) {
  const [hov, setHov] = useState(false);
  const col = POS_COL[player.position] || "#4f9eff";

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, cursor:"default", position:"relative" }}
    >
      {/* C / VC badge */}
      {(isCaptain || isVC) && (
        <div style={{
          position:"absolute", top:-6, right:-6, zIndex:2,
          width:18, height:18, borderRadius:"50%",
          background: isCaptain ? "#f2c94c" : "rgba(200,220,255,0.25)",
          color: isCaptain ? "#000" : "#e8f0ff",
          fontSize:9, fontWeight:900,
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow: isCaptain ? "0 0 8px #f2c94c99" : "none",
        }}>{isCaptain ? "C" : "V"}</div>
      )}

      {/* Photo / position avatar */}
      <div style={{
        width:44, height:44, borderRadius:"50%", overflow:"hidden",
        border:`2px solid ${hov ? col : col+"55"}`,
        background:"rgba(255,255,255,0.06)",
        display:"flex", alignItems:"center", justifyContent:"center",
        transition:"border-color 200ms, box-shadow 200ms",
        boxShadow: hov ? `0 0 12px ${col}55` : "none",
      }}>
        {player.photo
          ? <img src={player.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}
              onError={e => { e.target.style.display="none"; }}/>
          : <span style={{ fontSize:10, fontWeight:900, color:col }}>{player.position}</span>
        }
      </div>

      {/* Surname */}
      <div style={{
        fontSize:10, fontWeight:800, color:"#e8f0ff",
        textAlign:"center", maxWidth:64,
        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
      }}>
        {/* Show last name only for space */}
        {(player.name || "").split(" ").at(-1)}
      </div>

      {/* EP or cost */}
      {showEP ? (
        <div style={{
          fontSize:9, fontWeight:900, fontFamily:"'JetBrains Mono',monospace",
          color:col, background:`${col}18`, padding:"1px 6px", borderRadius:999,
        }}>
          {player.ep_next?.toFixed(2)} EP
        </div>
      ) : (
        <div style={{ fontSize:9, color:"rgba(200,220,255,0.5)" }}>£{player.cost}m</div>
      )}

      {/* Next fixture chip */}
      {player.next_opp && (
        <div style={{
          fontSize:8, color:"rgba(200,220,255,0.6)",
          background: FDR_BG[player.fixture_difficulty] || "#2d2d2d",
          padding:"1px 5px", borderRadius:4,
        }}>
          {player.next_opp}
        </div>
      )}
    </div>
  );
}

function PitchRow({ players, captain, vc, showEP }) {
  return (
    <div style={{
      display:"flex", justifyContent:"center", gap:20,
      flexWrap:"wrap", padding:"10px 0",
    }}>
      {players.map(p => (
        <PlayerChip
          key={p.player_id || p.id}
          player={p}
          isCaptain={captain?.player_id === p.player_id || captain?.id === p.id}
          isVC={vc?.player_id === p.player_id || vc?.id === p.id}
          showEP={showEP}
        />
      ))}
    </div>
  );
}

function StatBadge({ label, value, color="#4f9eff" }) {
  return (
    <div style={{
      padding:"10px 16px", borderRadius:12,
      background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
      textAlign:"center",
    }}>
      <div style={{ fontSize:8, fontWeight:800, color:"rgba(200,220,255,0.4)", letterSpacing:"0.1em", marginBottom:4 }}>
        {label}
      </div>
      <div style={{ fontSize:20, fontWeight:900, fontFamily:"'JetBrains Mono',monospace", color, lineHeight:1 }}>
        {value}
      </div>
    </div>
  );
}

function Skel({ h=80 }) {
  return <div style={{
    height:h, borderRadius:14,
    background:"linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.03) 75%)",
    backgroundSize:"200% 100%", animation:"shimmer 1.6s infinite",
  }}/>;
}

export default function BestXIPage() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [budget,    setBudget]    = useState(83.0);
  const [formation, setFormation] = useState("442");
  const [showEP,    setShowEP]    = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    // Backend accepts: budget (float), formation (442 etc.)
    const p = new URLSearchParams({ budget, formation });
    fetch(`${API}/api/fpl/best-xi?${p}`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, [budget, formation]);

  // Group xi[] by position for pitch rendering
  const lineupByPos = useMemo(() => {
    if (!data?.xi) return {};
    const g = { GK:[], DEF:[], MID:[], FWD:[] };
    for (const p of data.xi) {
      (g[p.position] = g[p.position] || []).push(p);
    }
    return g;
  }, [data]);

  // Captain = highest captain_score in xi
  const captain = useMemo(() => {
    if (!data?.xi?.length) return null;
    return [...data.xi].sort((a, b) => b.captain_score - a.captain_score)[0];
  }, [data]);

  // VC = second highest captain_score
  const vc = useMemo(() => {
    if (!data?.xi?.length) return null;
    const sorted = [...data.xi].sort((a, b) => b.captain_score - a.captain_score);
    return sorted[1] || null;
  }, [data]);

  return (
    <div style={{ minHeight:"100vh", background:"#060a14", color:"#e8f0ff", fontFamily:"'Inter',sans-serif" }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ padding:"32px 24px 20px", maxWidth:900, margin:"0 auto" }}>
        <div style={{ fontSize:9, fontWeight:800, color:"#b388ff", letterSpacing:"0.15em", marginBottom:6 }}>
          FPL OPTIMIZER
        </div>
        <h1 style={{
          fontSize:"clamp(22px,4vw,34px)", fontWeight:900, margin:"0 0 8px",
          fontFamily:"'Sora',sans-serif", letterSpacing:"-0.02em",
          background:"linear-gradient(135deg,#b388ff,#4f9eff)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}>Best XI Builder</h1>
        <p style={{ fontSize:13, color:"#4a6a8a", margin:0, lineHeight:1.6 }}>
          Budget-constrained optimal starting XI by Expected Points. Max 3 players per team.
          {data?.current_gw && ` GW${data.current_gw}.`}
        </p>
      </div>

      {/* Controls */}
      <div style={{ maxWidth:900, margin:"0 auto", padding:"0 24px 20px" }}>
        <div style={{
          background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)",
          borderRadius:14, padding:"14px 18px",
          display:"flex", gap:14, flexWrap:"wrap", alignItems:"flex-end",
        }}>
          {/* Formation */}
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:9, fontWeight:800, color:"#2a4a6a", letterSpacing:"0.08em" }}>FORMATION</label>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {FORMATIONS.map(f => (
                <button key={f} onClick={() => setFormation(f)} style={{
                  padding:"5px 11px", borderRadius:999, fontSize:11, fontWeight:800,
                  cursor:"pointer", fontFamily:"inherit", border:"none",
                  background:formation===f ? "rgba(179,136,255,0.15)" : "rgba(255,255,255,0.05)",
                  color:formation===f ? "#b388ff" : "#4a6a8a",
                  outline:formation===f ? "1px solid rgba(179,136,255,0.4)" : "none",
                }}>
                  {f.replace(/(\d)(\d)(\d)/, "$1-$2-$3")}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:9, fontWeight:800, color:"#2a4a6a", letterSpacing:"0.08em" }}>BUDGET £m</label>
            <input type="number" step={0.5} min={50} max={120} value={budget}
              onChange={e => setBudget(Number(e.target.value))}
              style={{
                padding:"6px 10px", borderRadius:8, fontSize:13, width:90,
                background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
                color:"#e8f0ff", outline:"none",
              }}/>
          </div>

          {/* Show EP toggle */}
          <label style={{
            display:"flex", gap:6, alignItems:"center", cursor:"pointer",
            fontSize:11, color:"#4a6a8a", userSelect:"none", paddingBottom:4,
          }}>
            <input type="checkbox" checked={showEP} onChange={e => setShowEP(e.target.checked)} style={{ cursor:"pointer" }}/>
            Show EP
          </label>
        </div>
      </div>

      {error && (
        <div style={{
          maxWidth:900, margin:"0 auto", padding:"0 24px 16px",
        }}>
          <div style={{
            padding:"12px 16px", borderRadius:10, background:"rgba(255,80,80,0.08)",
            border:"1px solid rgba(255,80,80,0.2)", color:"#ff8080", fontSize:12,
          }}>{error}</div>
        </div>
      )}

      <div style={{ maxWidth:900, margin:"0 auto", padding:"0 24px 80px" }}>
        {/* Stats row */}
        {!loading && data && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:10, marginBottom:20 }}>
            <StatBadge label="FORMATION"   value={formation.replace(/(\d)(\d)(\d)/, "$1-$2-$3")} color="#b388ff"/>
            <StatBadge label="TOTAL COST"  value={`£${data.total_cost}m`}           color="#f2c94c"/>
            <StatBadge label="REMAINING"   value={`£${data.budget_remaining?.toFixed(1)}m`}  color="#00e09e"/>
            <StatBadge label="TOTAL EP"    value={data.total_ep?.toFixed(1)}         color="#4f9eff"/>
            <StatBadge label="CAPTAIN"     value={(captain?.name || "—").split(" ").at(-1)} color="#f2c94c"/>
          </div>
        )}

        {/* Pitch */}
        <div style={{
          background:"linear-gradient(180deg,#0a2e10 0%,#082808 100%)",
          border:"1px solid rgba(255,255,255,0.08)", borderRadius:20,
          padding:"24px 20px", marginBottom:20,
          position:"relative", overflow:"hidden",
        }}>
          {/* Pitch SVG lines */}
          <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.07 }}
            viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice">
            <rect x="10" y="10" width="580" height="380" rx="4" fill="none" stroke="white" strokeWidth="1.5"/>
            <line x1="10" y1="200" x2="590" y2="200" stroke="white" strokeWidth="1"/>
            <circle cx="300" cy="200" r="55" fill="none" stroke="white" strokeWidth="1"/>
            <circle cx="300" cy="200" r="4" fill="white"/>
            <rect x="10" y="130" width="70" height="140" fill="none" stroke="white" strokeWidth="1"/>
            <rect x="520" y="130" width="70" height="140" fill="none" stroke="white" strokeWidth="1"/>
          </svg>

          <div style={{ position:"relative", zIndex:1 }}>
            {loading ? (
              <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                {Array.from({length:4}).map((_,i) => <Skel key={i} h={70}/>)}
              </div>
            ) : data?.xi?.length > 0 ? (
              POS_ORDER.map(pos => {
                const rowPlayers = lineupByPos[pos] || [];
                return rowPlayers.length > 0 ? (
                  <PitchRow key={pos} players={rowPlayers} captain={captain} vc={vc} showEP={showEP}/>
                ) : null;
              })
            ) : (
              <div style={{ textAlign:"center", padding:40, color:"#4a6a8a", fontSize:13 }}>
                No lineup generated. Try adjusting budget or formation.
              </div>
            )}
          </div>
        </div>

        {/* Player list below pitch */}
        {!loading && data?.xi?.length > 0 && (
          <div>
            <div style={{ fontSize:10, fontWeight:800, color:"#4a6a8a", letterSpacing:"0.1em", marginBottom:10 }}>
              SELECTED PLAYERS — sorted by EP
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {[...data.xi].sort((a, b) => b.ep_next - a.ep_next).map((p, i) => {
                const col = POS_COL[p.position] || "#4f9eff";
                const isCap = captain?.player_id === p.player_id || captain?.id === p.id;
                const isVc  = vc?.player_id      === p.player_id || vc?.id      === p.id;
                return (
                  <div key={p.player_id || i} style={{
                    display:"flex", alignItems:"center", gap:12,
                    padding:"10px 14px", borderRadius:10,
                    background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)",
                  }}>
                    {/* Rank */}
                    <span style={{ fontSize:11, fontWeight:700, color:"rgba(200,220,255,0.4)", width:20, textAlign:"right" }}>
                      {i+1}
                    </span>
                    {/* Position */}
                    <span style={{
                      fontSize:9, fontWeight:800, color:col,
                      background:`${col}18`, border:`1px solid ${col}33`,
                      padding:"2px 6px", borderRadius:999, flexShrink:0,
                    }}>{p.position}</span>
                    {/* C/VC */}
                    {(isCap || isVc) && (
                      <span style={{
                        fontSize:9, fontWeight:900,
                        color: isCap ? "#f2c94c" : "rgba(200,220,255,0.5)",
                        background: isCap ? "rgba(242,201,76,0.15)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${isCap ? "#f2c94c44" : "rgba(255,255,255,0.1)"}`,
                        padding:"1px 6px", borderRadius:999, flexShrink:0,
                      }}>{isCap ? "C" : "V"}</span>
                    )}
                    {/* Name */}
                    <span style={{ flex:1, fontSize:13, fontWeight:700, color:"#e8f0ff" }}>
                      {p.name}
                    </span>
                    {/* Team */}
                    <span style={{ fontSize:10, color:"#4a6a8a" }}>{p.team}</span>
                    {/* Next opp */}
                    {p.next_opp && (
                      <span style={{
                        fontSize:9, padding:"2px 7px", borderRadius:6,
                        background: FDR_BG[p.fixture_difficulty] || "#2d2d2d",
                        color:"rgba(200,220,255,0.7)", fontFamily:"'JetBrains Mono',monospace",
                      }}>{p.next_opp}</span>
                    )}
                    {/* EP */}
                    <span style={{ fontSize:14, fontWeight:900, color:col, fontFamily:"'JetBrains Mono',monospace", minWidth:50, textAlign:"right" }}>
                      {p.ep_next?.toFixed(2)}
                    </span>
                    {/* Cost */}
                    <span style={{ fontSize:11, color:"rgba(200,220,255,0.5)", minWidth:38, textAlign:"right" }}>
                      £{p.cost}m
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}