// ═════════════════════════════════════════════════════
// Pitch.jsx  –  FotMob-style football pitch
// Guaranteed positioning via ResizeObserver + px math
// grid field "row:col" → exact screen position
// ═════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────
// Convert "row:col" grid string → {x%, y%} on pitch
//
// formation "4-3-3" → row sizes [1, 4, 3, 3]
// row 1 = GK, row 2 = DEF, etc.
// Home: GK at bottom (high y). Away: GK at top (low y).
// ─────────────────────────────────────────────────────
function gridToPercent(gridStr, formation, isAway) {
  const fallback = { x: 50, y: isAway ? 15 : 85 };
  if (!gridStr) return fallback;

  const [r, c] = (gridStr + "").split(":").map(Number);
  if (!r || !c) return fallback;

  // Parse formation e.g. "4-3-3" → rowSizes [1, 4, 3, 3]
  const rowSizes = [1, ...(formation || "4-3-3").split("-").map(n => parseInt(n, 10) || 1)];
  const totalRows = rowSizes.length;
  const colsInRow = rowSizes[r - 1] ?? 1;

  // X: spread players left-right within 8%–92%
  const x = colsInRow === 1
    ? 50
    : 8 + ((c - 1) / (colsInRow - 1)) * 84;

  // Y: row 1 (GK) at 88% for home, 12% for away
  //    last row (FWD) at 12% for home, 88% for away
  const frac = (r - 1) / Math.max(totalRows - 1, 1); // 0 = GK row, 1 = FWD row
  const y = isAway
    ? 12 + frac * 76   // away: GK near top, FWD near bottom
    : 88 - frac * 76;  // home: GK near bottom, FWD near top

  return { x: +x.toFixed(1), y: +y.toFixed(1) };
}

// ─────────────────────────────────────────────
// PlayerToken — positioned in px from %
// ─────────────────────────────────────────────
const TOKEN_DIAM = 36; // avatar diameter in px
const HALF       = TOKEN_DIAM / 2;

function PlayerToken({ player, color, W, H, onClick }) {
  const [err, setErr] = useState(false);
  const lastName = (player.name || "?").split(" ").pop();
  const left = (player._x / 100) * W - HALF;
  const top  = (player._y / 100) * H - HALF;

  return (
    <div
      onClick={() => onClick?.(player)}
      style={{
        position: "absolute",
        left, top,
        width: TOKEN_DIAM,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        zIndex: 10,
        animation: "fpIn 0.3s ease both",
        animationDelay: `${player._delay || 0}ms`,
      }}
    >
      {/* Rating pill */}
      {player.rating > 0 && (
        <div style={{
          fontSize: 7, fontWeight: 900, lineHeight: 1,
          padding: "1px 3px", borderRadius: 3, marginBottom: 1,
          background: player.rating >= 7.5 ? "#34d399" : player.rating >= 6.5 ? "#f59e0b" : "#64748b",
          color: "#000", whiteSpace: "nowrap",
        }}>
          {Number(player.rating).toFixed(1)}
        </div>
      )}

      {/* Avatar circle */}
      <div style={{
        width: TOKEN_DIAM, height: TOKEN_DIAM, borderRadius: "50%",
        border: `2.5px solid ${color}`,
        background: "rgba(5,10,20,0.9)",
        overflow: "hidden", position: "relative",
        boxShadow: `0 0 10px ${color}66, 0 2px 6px rgba(0,0,0,0.8)`,
        flexShrink: 0,
      }}>
        {player.photo && !err ? (
          <img src={player.photo} alt={player.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setErr(true)} />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 900, color,
          }}>
            {player.number ?? player.name?.[0] ?? "?"}
          </div>
        )}
        {/* Jersey number badge */}
        {player.number != null && (
          <div style={{
            position: "absolute", bottom: 0, right: 0,
            width: 12, height: 12, borderRadius: "50%",
            background: color, color: "#000",
            fontSize: 6, fontWeight: 900,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{player.number}</div>
        )}
      </div>

      {/* Name label */}
      <div style={{
        marginTop: 2, fontSize: 8, fontWeight: 800,
        color: "#e8f2ff", textAlign: "center",
        width: 58, overflow: "hidden", whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        textShadow: "0 1px 4px #000, 0 1px 4px #000",
        letterSpacing: "0.01em",
      }}>
        {lastName}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Pitch SVG markings
// ─────────────────────────────────────────────
function PitchMarkings() {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.22 }}>
      {/* Outer border */}
      <rect x="2.5" y="2" width="95" height="96" fill="none" stroke="white" strokeWidth="0.5" rx="0.3"/>
      {/* Halfway line */}
      <line x1="2.5" y1="50" x2="97.5" y2="50" stroke="white" strokeWidth="0.4"/>
      {/* Centre circle */}
      <circle cx="50" cy="50" r="11.5" fill="none" stroke="white" strokeWidth="0.4"/>
      <circle cx="50" cy="50" r="0.8" fill="white"/>
      {/* Top penalty box */}
      <rect x="21" y="2" width="58" height="16.5" fill="none" stroke="white" strokeWidth="0.4"/>
      {/* Top 6-yard box */}
      <rect x="36" y="2" width="28" height="6.5" fill="none" stroke="white" strokeWidth="0.4"/>
      <circle cx="50" cy="12.5" r="0.6" fill="white"/>
      {/* Bottom penalty box */}
      <rect x="21" y="81.5" width="58" height="16.5" fill="none" stroke="white" strokeWidth="0.4"/>
      {/* Bottom 6-yard box */}
      <rect x="36" y="91.5" width="28" height="6.5" fill="none" stroke="white" strokeWidth="0.4"/>
      <circle cx="50" cy="87.5" r="0.6" fill="white"/>
      {/* Grass stripes */}
      {[0,1,2,3,4,5,6,7,8,9].map(i => (
        <rect key={i} x="2.5" y={2 + i * 9.6} width="95" height="4.8"
          fill="rgba(255,255,255,0.018)" stroke="none"/>
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────
// Main Pitch component
// ─────────────────────────────────────────────
export default function Pitch({ home, away, mode }) {
  const [selected, setSelected] = useState(null);
  const containerRef = useRef(null);
  const [size, setSize]         = useState({ w: 0, h: 0 });

  // Measure real rendered px dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      setSize({ w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const mapPlayers = useCallback((xi, formation, isAway, colorDelay) =>
    (xi || []).map((p, i) => {
      const { x, y } = gridToPercent(p.grid, formation, isAway);
      return { ...p, _x: x, _y: y, _delay: colorDelay + i * 30 };
    }), []);

  const homePlayers = mapPlayers(home?.starting_xi, home?.formation, false, 0);
  const awayPlayers = mapPlayers(away?.starting_xi, away?.formation, true,  200);
  const noLineups   = homePlayers.length === 0 && awayPlayers.length === 0;

  return (
    <>
      <style>{`
        @keyframes fpIn {
          from { opacity:0; transform:scale(0.5); }
          to   { opacity:1; transform:scale(1); }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom: 8, padding: "0 2px",
      }}>
        {/* Home */}
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {home?.logo && <img src={home.logo} style={{ width:18, height:18, objectFit:"contain" }}
            onError={e=>e.currentTarget.style.display="none"} />}
          <span style={{ fontSize:11, fontWeight:800, color:"#60a5fa" }}>{home?.team_name}</span>
          <span style={{ fontSize:10, fontWeight:700, color:"rgba(96,165,250,0.7)",
            background:"rgba(96,165,250,0.1)", padding:"1px 7px", borderRadius:999 }}>
            {home?.formation || "—"}
          </span>
          {mode === "predicted" && (
            <span style={{ fontSize:7.5, fontWeight:900, letterSpacing:"0.08em",
              color:"#f59e0b", background:"rgba(245,158,11,0.13)",
              padding:"1px 6px", borderRadius:999 }}>PREDICTED</span>
          )}
        </div>
        {/* Away */}
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {mode === "predicted" && (
            <span style={{ fontSize:7.5, fontWeight:900, letterSpacing:"0.08em",
              color:"#f59e0b", background:"rgba(245,158,11,0.13)",
              padding:"1px 6px", borderRadius:999 }}>PREDICTED</span>
          )}
          <span style={{ fontSize:10, fontWeight:700, color:"rgba(249,115,22,0.7)",
            background:"rgba(249,115,22,0.1)", padding:"1px 7px", borderRadius:999 }}>
            {away?.formation || "—"}
          </span>
          <span style={{ fontSize:11, fontWeight:800, color:"#f97316" }}>{away?.team_name}</span>
          {away?.logo && <img src={away.logo} style={{ width:18, height:18, objectFit:"contain" }}
            onError={e=>e.currentTarget.style.display="none"} />}
        </div>
      </div>

      {/* ── Pitch canvas ──
          Use paddingBottom trick BUT with an explicit inner div at position:absolute,inset:0
          AND we measure the inner div (not outer), so px coords are always correct.
      ── */}
      <div style={{ position:"relative", width:"100%", paddingBottom:"148%" }}>
        <div
          ref={containerRef}
          style={{
            position:"absolute", inset:0,
            borderRadius:12, overflow:"hidden",
            background:"linear-gradient(180deg,#082010 0%,#0f3a1a 18%,#0c3016 50%,#0f3a1a 82%,#082010 100%)",
            border:"1px solid rgba(255,255,255,0.07)",
          }}
        >
          <PitchMarkings />

          {noLineups && (
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:13, color:"rgba(255,255,255,0.25)", fontWeight:600 }}>
                Lineups not yet announced.
              </span>
            </div>
          )}

          {size.w > 0 && !noLineups && (
            <>
              {homePlayers.map((p, i) => (
                <PlayerToken key={`h${i}`} player={p} color="#60a5fa"
                  W={size.w} H={size.h} onClick={setSelected} />
              ))}
              {awayPlayers.map((p, i) => (
                <PlayerToken key={`a${i}`} player={p} color="#fb923c"
                  W={size.w} H={size.h} onClick={setSelected} />
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Selected player card ── */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{
          marginTop:8, borderRadius:10, padding:"10px 14px",
          background:"linear-gradient(135deg,#0d1525,#080e1a)",
          border:"1px solid rgba(255,255,255,0.09)",
          display:"flex", alignItems:"center", gap:10, cursor:"pointer",
        }}>
          {selected.photo && (
            <img src={selected.photo}
              style={{ width:34, height:34, borderRadius:"50%", objectFit:"cover" }}
              onError={e=>e.currentTarget.style.display="none"} />
          )}
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:"#f0f6ff" }}>{selected.name}</div>
            <div style={{ fontSize:10, color:"#4a6080", marginTop:2 }}>
              {selected.pos}
              {selected.number != null ? ` · #${selected.number}` : ""}
              {selected.nationality ? ` · ${selected.nationality}` : ""}
            </div>
          </div>
          {selected.rating > 0 && (
            <div style={{
              marginLeft:"auto", fontSize:20, fontWeight:900,
              color: selected.rating >= 7.5 ? "#34d399" : selected.rating >= 6.5 ? "#f59e0b" : "#64748b",
            }}>
              {Number(selected.rating).toFixed(1)}
            </div>
          )}
        </div>
      )}
    </>
  );
}