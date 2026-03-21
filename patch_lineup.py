"""
Patches LiveMatchPage.jsx - replaces the split Formation layout
with a unified full-pitch SVG showing both teams.
Run from Football_Stats project root.
"""
path = "frontend/src/pages/LiveMatchPage.jsx"

with open(path, encoding="utf-8") as f:
    lines = f.readlines()

crlf = b"\r\n" in open(path, "rb").read(500)
NL = "\r\n" if crlf else "\n"

# Find Formation function and ShotMapPanel dynamically
start_line = end_line = None
for i, line in enumerate(lines):
    if "function Formation({ lineup, color, flip })" in line and start_line is None:
        start_line = i
    if start_line and i > start_line and "function ShotMapPanel" in line:
        end_line = i
        break

if start_line is None:
    print("ERROR: Formation function not found. Checking file:")
    for i, line in enumerate(lines):
        if "Formation" in line and "lineup" in line:
            print(f"  Line {i+1}: {line.strip()[:80]}")
    raise SystemExit(1)

print(f"Formation at line {start_line+1}, ShotMapPanel at line {end_line+1}")

NEW = """  function buildRows(lineup, flip) {
    const parts = (lineup?.formation || "4-3-3").split("-").map(n => parseInt(n));
    const players = lineup?.startXI || [];
    let idx = 1;
    const rows = [[players[0]], ...parts.map(n => {
      const r = players.slice(idx, idx + n); idx += n; return r;
    })];
    if (flip) rows.reverse();
    return rows;
  }

  function PitchPlayers({ lineup, flip, color, side }) {
    const rows = buildRows(lineup, flip);
    const total = rows.length;
    const xStart = side === "home" ? 4 : 52;
    const xRange = 44;
    return (
      <>
        {rows.map((row, ri) => {
          const yPct = ((ri + 0.5) / total) * 88 + 6;
          return row.map((p, pi) => {
            const xPct = row.length === 1
              ? xStart + xRange / 2
              : xStart + (pi / (row.length - 1)) * xRange;
            const player = p?.player || p || {};
            const name = (player.name || "").split(" ").pop().slice(0, 9);
            const num = player.number || "";
            return (
              <g key={ri + "-" + pi}>
                <circle cx={xPct + "%"} cy={yPct + "%"} r="4.2%"
                  fill={color} stroke="rgba(255,255,255,.9)" strokeWidth=".8%" />
                <text x={xPct + "%"} y={(yPct + 1.3) + "%"}
                  textAnchor="middle" fontSize="2.8%" fill="#fff"
                  fontWeight="800" fontFamily="Inter,sans-serif">{num}</text>
                <text x={xPct + "%"} y={(yPct + 7.8) + "%"}
                  textAnchor="middle" fontSize="2.3%"
                  fill="rgba(255,255,255,.75)" fontFamily="Inter,sans-serif">{name}</text>
              </g>
            );
          });
        })}
      </>
    );
  }

  return (
    <div style={{ padding:"20px 24px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ width:10, height:10, borderRadius:"50%", background:"#3b82f6", display:"inline-block" }}/>
          <span style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{homeTeam?.name}</span>
          {home?.formation && (
            <span style={{ fontSize:10, fontWeight:700, color:"#60a5fa", background:"rgba(96,165,250,.1)", border:"1px solid rgba(96,165,250,.25)", borderRadius:4, padding:"1px 7px" }}>
              {home.formation}
            </span>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {away?.formation && (
            <span style={{ fontSize:10, fontWeight:700, color:"#f87171", background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:4, padding:"1px 7px" }}>
              {away.formation}
            </span>
          )}
          <span style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{awayTeam?.name}</span>
          <span style={{ width:10, height:10, borderRadius:"50%", background:"#ef4444", display:"inline-block" }}/>
        </div>
      </div>
      <div style={{ position:"relative", width:"100%", paddingBottom:"62%", borderRadius:12, overflow:"hidden", background:"#0a1f0d" }}>
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}
          viewBox="0 0 100 62" preserveAspectRatio="xMidYMid meet">
          {[0,7.75,15.5,23.25,31,38.75,46.5].map((y,i) => (
            <rect key={i} x="0" y={y} width="100" height="7.75"
              fill={i%2===0 ? "rgba(255,255,255,.012)" : "rgba(0,0,0,0)"} />
          ))}
          <rect x="2" y="1.5" width="96" height="59" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth=".5"/>
          <line x1="50" y1="1.5" x2="50" y2="60.5" stroke="rgba(255,255,255,.22)" strokeWidth=".4"/>
          <circle cx="50" cy="31" r="9" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth=".4"/>
          <circle cx="50" cy="31" r=".8" fill="rgba(255,255,255,.4)"/>
          <rect x="2" y="18" width="16" height="26" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth=".4"/>
          <rect x="82" y="18" width="16" height="26" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth=".4"/>
          <rect x="2" y="23" width="6.5" height="16" fill="none" stroke="rgba(255,255,255,.13)" strokeWidth=".4"/>
          <rect x="91.5" y="23" width="6.5" height="16" fill="none" stroke="rgba(255,255,255,.13)" strokeWidth=".4"/>
          <rect x="0" y="27" width="2" height="8" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth=".5"/>
          <rect x="98" y="27" width="2" height="8" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth=".5"/>
          <circle cx="12" cy="31" r=".7" fill="rgba(255,255,255,.4)"/>
          <circle cx="88" cy="31" r=".7" fill="rgba(255,255,255,.4)"/>
          {home && <PitchPlayers lineup={home} flip={false} color="#3b82f6" side="home"/>}
          {away && <PitchPlayers lineup={away} flip={true}  color="#ef4444" side="away"/>}
        </svg>
      </div>
      {(home?.substitutes?.length > 0 || away?.substitutes?.length > 0) && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:16 }}>
          {[home, away].map((lu, side) => lu && (
            <div key={side}>
              <div style={{ fontSize:8, fontWeight:800, color:"rgba(255,255,255,0.2)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>Substitutes</div>
              {lu.substitutes?.slice(0,7).map((p,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.025)" }}>
                  <span style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.22)", width:18, fontFamily:"'JetBrains Mono',monospace" }}>{p?.player?.number}</span>
                  <span style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.5)" }}>{p?.player?.name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );

"""

NEW = NEW.replace("\n", NL)
new_lines = lines[:start_line] + [NEW] + lines[end_line:]

with open(path, "w", encoding="utf-8", newline="") as f:
    f.writelines(new_lines)

print(f"PATCHED OK — {len(lines)} -> {len(new_lines)} lines")