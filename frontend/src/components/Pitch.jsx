// ═══════════════════════════════════════════════════════════════════════
// Pitch.jsx  —  FotMob-style pitch with correct grid-based positioning
//
// HOW IT WORKS:
//   Each player has a `grid` field like "3:2" (row 3, col 2).
//   gridToPercent() converts this to {x%, y%} using the formation string
//   to know how many columns exist in each row.
//
//   Pitch uses paddingBottom trick for aspect ratio. ResizeObserver reads
//   the actual rendered pixel size so left/top px math is always correct.
//
// FORMATION ROWS (same convention as backend _FORMATION_GRIDS):
//   row 1 = GK, row 2 = DEF, ..., last row = FWD
//   Home:  GK near bottom (y≈88%), FWD near top (y≈12%)
//   Away:  GK near top    (y≈12%), FWD near bottom (y≈88%)
// ═══════════════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from "react";

// ────────────────────────────────────────────────────────
// gridToPercent  — core coordinate transform
//
// formation "4-2-3-1" → backend _FORMATION_GRIDS has 5 rows:
//   row1=GK(1 col), row2=4DEF, row3=2CDM, row4=3MID, row5=1ST
// We reconstruct rowSizes as [1, ...formation.split("-").map(Number)]
// ────────────────────────────────────────────────────────
function gridToPercent(gridStr, formation, isAway) {
  // Safe defaults
  const fallback = { x: 50, y: isAway ? 12 : 88 };
  if (!gridStr) return fallback;

  const parts = String(gridStr).split(":");
  const row   = parseInt(parts[0], 10);
  const col   = parseInt(parts[1], 10);
  if (!row || !col || isNaN(row) || isNaN(col)) return fallback;

  // Build row sizes: prepend 1 for GK row
  // "4-3-3"   → [1,4,3,3]   = 4 rows
  // "4-2-3-1" → [1,4,2,3,1] = 5 rows
  const fmt       = formation || "4-3-3";
  const rowSizes  = [1, ...fmt.split("-").map(n => parseInt(n, 10) || 1)];
  const totalRows = rowSizes.length;
  const colsInRow = rowSizes[row - 1] ?? 1;

  // X: spread evenly across 8%–92% of pitch width
  const x = colsInRow === 1
    ? 50
    : 8 + ((col - 1) / (colsInRow - 1)) * 84;

  // Y: row 1 (GK) → y=88% for home / y=12% for away
  //    last row (FWD) → y=12% for home / y=88% for away
  const frac = (row - 1) / Math.max(totalRows - 1, 1);
  const y    = isAway
    ? 12 + frac * 76
    : 88 - frac * 76;

  return { x: +x.toFixed(1), y: +y.toFixed(1) };
}

// ────────────────────────────────────────────────────────
// PlayerToken — rendered at absolute px position
// ────────────────────────────────────────────────────────
const D = 40; // avatar diameter px

function PlayerToken({ player, color, pitchW, pitchH, onClick }) {
  const [imgErr, setImgErr] = useState(false);

  const lastName = (player.name || "?").split(" ").pop();
  const rating   = player.rating ? Number(player.rating) : null;

  // Convert % → px, centre the token
  const leftPx = (player._x / 100) * pitchW - D / 2;
  const topPx  = (player._y / 100) * pitchH - D / 2;

  const ratingColor = rating
    ? rating >= 7.5 ? "#34d399" : rating >= 6.5 ? "#f59e0b" : "#64748b"
    : null;

  return (
    <div
      onClick={() => onClick?.(player)}
      style={{
        position:        "absolute",
        left:            leftPx,
        top:             topPx,
        width:           D,
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        cursor:          "pointer",
        zIndex:          10,
        animation:       "fpIn 0.35s ease both",
        animationDelay:  `${player._delay || 0}ms`,
      }}
    >
      {/* Rating pill — floats above avatar */}
      {rating && (
        <div style={{
          fontSize: 7, fontWeight: 900, lineHeight: 1,
          padding: "1px 3px", borderRadius: 3, marginBottom: 1,
          background: ratingColor, color: "#000",
          whiteSpace: "nowrap", pointerEvents: "none",
        }}>
          {rating.toFixed(1)}
        </div>
      )}

      {/* Avatar */}
      <div style={{
        width:        D,
        height:       D,
        borderRadius: "50%",
        border:       `2.5px solid ${color}`,
        background:   "rgba(4, 8, 16, 0.9)",
        overflow:     "hidden",
        position:     "relative",
        flexShrink:   0,
        boxShadow:    `0 0 12px ${color}55, 0 2px 8px rgba(0,0,0,0.9)`,
        transition:   "transform 0.15s, box-shadow 0.15s",
      }}
        className="pitch-token-avatar"
      >
        {player.photo && !imgErr ? (
          <img
            src={player.photo}
            alt={player.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setImgErr(true)}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 900, color,
          }}>
            {player.number ?? (player.name?.[0] || "?")}
          </div>
        )}

        {/* Jersey number badge */}
        {player.number != null && (
          <div style={{
            position:   "absolute",
            bottom:     0, right: 0,
            width:      13, height: 13,
            borderRadius: "50%",
            background: color, color: "#000",
            fontSize:   6, fontWeight: 900,
            display:    "flex", alignItems: "center", justifyContent: "center",
          }}>
            {player.number}
          </div>
        )}
      </div>

      {/* Name label */}
      <div style={{
        marginTop:    2,
        fontSize:     8,
        fontWeight:   800,
        color:        "#deeeff",
        textAlign:    "center",
        width:        56,
        overflow:     "hidden",
        whiteSpace:   "nowrap",
        textOverflow: "ellipsis",
        textShadow:   "0 1px 4px #000, 0 1px 4px #000",
        letterSpacing: "0.01em",
        pointerEvents: "none",
      }}>
        {lastName}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Pitch SVG markings
// ────────────────────────────────────────────────────────
function PitchMarkings() {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        pointerEvents: "none",
        opacity: 0.20,
      }}
    >
      {/* Outer border */}
      <rect x="2.5" y="2" width="95" height="96"
        fill="none" stroke="white" strokeWidth="0.5" rx="0.2"/>
      {/* Halfway line */}
      <line x1="2.5" y1="50" x2="97.5" y2="50"
        stroke="white" strokeWidth="0.4"/>
      {/* Centre circle + spot */}
      <circle cx="50" cy="50" r="11.5"
        fill="none" stroke="white" strokeWidth="0.4"/>
      <circle cx="50" cy="50" r="0.8" fill="white"/>
      {/* Top penalty box */}
      <rect x="21" y="2" width="58" height="17"
        fill="none" stroke="white" strokeWidth="0.4"/>
      {/* Top 6-yard box */}
      <rect x="36" y="2" width="28" height="7"
        fill="none" stroke="white" strokeWidth="0.4"/>
      <circle cx="50" cy="13" r="0.6" fill="white"/>
      {/* Bottom penalty box */}
      <rect x="21" y="81" width="58" height="17"
        fill="none" stroke="white" strokeWidth="0.4"/>
      {/* Bottom 6-yard box */}
      <rect x="36" y="91" width="28" height="7"
        fill="none" stroke="white" strokeWidth="0.4"/>
      <circle cx="50" cy="87" r="0.6" fill="white"/>
      {/* Grass stripe alternation */}
      {[0,1,2,3,4,5,6,7,8,9].map(i => (
        <rect key={i}
          x="2.5" y={2 + i * 9.6} width="95" height="4.8"
          fill="rgba(255,255,255,0.015)" stroke="none"/>
      ))}
    </svg>
  );
}

// ────────────────────────────────────────────────────────
// BenchRow — players below the pitch
// ────────────────────────────────────────────────────────
function BenchRow({ players, color, label }) {
  if (!players || players.length === 0) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{
        fontSize: 9, fontWeight: 800, letterSpacing: "0.1em",
        color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
        marginBottom: 6, paddingLeft: 2,
      }}>
        {label} Bench
      </div>
      <div style={{
        display: "flex", gap: 6, flexWrap: "wrap",
      }}>
        {players.map((p, i) => (
          <BenchCard key={p.id ?? i} player={p} color={color} />
        ))}
      </div>
    </div>
  );
}

function BenchCard({ player, color }) {
  const [imgErr, setImgErr] = useState(false);
  const lastName = (player.name || "?").split(" ").pop();

  return (
    <div style={{
      display:       "flex",
      flexDirection: "column",
      alignItems:    "center",
      gap:           2,
      opacity:       0.8,
    }}>
      <div style={{
        width:        28, height: 28,
        borderRadius: "50%",
        border:       `1.5px solid ${color}55`,
        background:   "rgba(4,8,16,0.85)",
        overflow:     "hidden",
        display:      "flex",
        alignItems:   "center",
        justifyContent: "center",
        fontSize:     9, fontWeight: 900, color,
      }}>
        {player.photo && !imgErr ? (
          <img
            src={player.photo} alt={player.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setImgErr(true)}
          />
        ) : (
          player.number ?? player.name?.[0] ?? "?"
        )}
      </div>
      <div style={{
        fontSize: 7, fontWeight: 700,
        color: "rgba(200,220,255,0.6)",
        textAlign: "center",
        width: 36,
        overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
      }}>
        {lastName}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// Main Pitch component
// ────────────────────────────────────────────────────────
export default function Pitch({ home, away, mode }) {
  const [selected, setSelected] = useState(null);
  const pitchRef                = useRef(null);
  const [size, setSize]         = useState({ w: 0, h: 0 });

  // Measure the inner pitch div so px math is always accurate
  useEffect(() => {
    if (!pitchRef.current) return;
    const measure = () => {
      const el = pitchRef.current;
      if (el) setSize({ w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(pitchRef.current);
    return () => ro.disconnect();
  }, []);

  // Attach _x, _y, _delay to each player
  const mapPlayers = useCallback((xi, formation, isAway, baseDelay) =>
    (xi || []).map((p, i) => {
      const { x, y } = gridToPercent(p.grid, formation, isAway);
      return { ...p, _x: x, _y: y, _delay: baseDelay + i * 35 };
    }), []);

  const homePlayers = mapPlayers(home?.starting_xi, home?.formation, false, 0);
  const awayPlayers = mapPlayers(away?.starting_xi, away?.formation, true,  250);
  const noLineups   = homePlayers.length === 0 && awayPlayers.length === 0;

  return (
    <>
      <style>{`
        @keyframes fpIn {
          from { opacity:0; transform:scale(0.45); }
          to   { opacity:1; transform:scale(1); }
        }
        .pitch-token-avatar:hover {
          transform: scale(1.12);
          box-shadow: 0 0 18px currentColor;
        }
      `}</style>

      {/* ── Team / formation header ── */}
      <div style={{
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
        marginBottom:   8,
        padding:        "0 2px",
      }}>
        {/* Home */}
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {home?.logo && (
            <img src={home.logo}
              style={{ width:18, height:18, objectFit:"contain" }}
              onError={e => (e.currentTarget.style.display = "none")} />
          )}
          <span style={{ fontSize:11, fontWeight:800, color:"#60a5fa" }}>
            {home?.team_name}
          </span>
          <span style={{
            fontSize:9, fontWeight:700,
            color:"rgba(96,165,250,0.65)",
            background:"rgba(96,165,250,0.09)",
            padding:"1px 7px", borderRadius:999,
          }}>
            {home?.formation || "—"}
          </span>
          {mode === "predicted" && (
            <span style={{
              fontSize:7.5, fontWeight:900, letterSpacing:"0.08em",
              color:"#f59e0b", background:"rgba(245,158,11,0.13)",
              padding:"1px 6px", borderRadius:999,
            }}>PREDICTED</span>
          )}
        </div>

        {/* Away */}
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {mode === "predicted" && (
            <span style={{
              fontSize:7.5, fontWeight:900, letterSpacing:"0.08em",
              color:"#f59e0b", background:"rgba(245,158,11,0.13)",
              padding:"1px 6px", borderRadius:999,
            }}>PREDICTED</span>
          )}
          <span style={{
            fontSize:9, fontWeight:700,
            color:"rgba(249,115,22,0.65)",
            background:"rgba(249,115,22,0.09)",
            padding:"1px 7px", borderRadius:999,
          }}>
            {away?.formation || "—"}
          </span>
          <span style={{ fontSize:11, fontWeight:800, color:"#f97316" }}>
            {away?.team_name}
          </span>
          {away?.logo && (
            <img src={away.logo}
              style={{ width:18, height:18, objectFit:"contain" }}
              onError={e => (e.currentTarget.style.display = "none")} />
          )}
        </div>
      </div>

      {/* ── Pitch canvas ──
          Outer div: relative, paddingBottom % sets aspect ratio
          Inner div (ref): absolute inset:0, actual renderable area
          Players positioned as absolute within inner div using px
      ── */}
      <div style={{ position:"relative", width:"100%", paddingBottom:"148%" }}>
        <div
          ref={pitchRef}
          style={{
            position:   "absolute",
            inset:      0,
            borderRadius: 12,
            overflow:   "hidden",
            background: "linear-gradient(180deg,#071a0c 0%,#0d3318 18%,#0a2a14 50%,#0d3318 82%,#071a0c 100%)",
            border:     "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <PitchMarkings />

          {noLineups && (
            <div style={{
              position:       "absolute",
              inset:          0,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
            }}>
              <span style={{
                fontSize:   13,
                color:      "rgba(255,255,255,0.22)",
                fontWeight: 600,
              }}>
                Lineups not yet announced.
              </span>
            </div>
          )}

          {/* Only render tokens once we have real pixel dimensions */}
          {size.w > 0 && !noLineups && (
            <>
              {homePlayers.map((p, i) => (
                <PlayerToken key={`h${i}`}
                  player={p} color="#60a5fa"
                  pitchW={size.w} pitchH={size.h}
                  onClick={setSelected} />
              ))}
              {awayPlayers.map((p, i) => (
                <PlayerToken key={`a${i}`}
                  player={p} color="#fb923c"
                  pitchW={size.w} pitchH={size.h}
                  onClick={setSelected} />
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Bench rows (outside the pitch) ── */}
      {!noLineups && (
        <div style={{ marginTop: 2 }}>
          <BenchRow players={home?.bench} color="#60a5fa" label={home?.team_name || "Home"} />
          <BenchRow players={away?.bench} color="#fb923c" label={away?.team_name || "Away"} />
        </div>
      )}

      {/* ── Selected player card ── */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            marginTop:  8,
            borderRadius: 10,
            padding:    "10px 14px",
            background: "linear-gradient(135deg,#0d1525,#080e1a)",
            border:     "1px solid rgba(255,255,255,0.08)",
            display:    "flex",
            alignItems: "center",
            gap:        10,
            cursor:     "pointer",
          }}
        >
          {selected.photo && (
            <img src={selected.photo}
              style={{ width:34, height:34, borderRadius:"50%", objectFit:"cover" }}
              onError={e => (e.currentTarget.style.display = "none")} />
          )}
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:"#f0f6ff" }}>
              {selected.name}
            </div>
            <div style={{ fontSize:10, color:"#4a6080", marginTop:2 }}>
              {selected.pos}
              {selected.number != null ? ` · #${selected.number}` : ""}
              {selected.nationality    ? ` · ${selected.nationality}` : ""}
            </div>
          </div>
          {selected.rating > 0 && (
            <div style={{
              marginLeft: "auto",
              fontSize:   20,
              fontWeight: 900,
              color: Number(selected.rating) >= 7.5
                ? "#34d399"
                : Number(selected.rating) >= 6.5
                  ? "#f59e0b"
                  : "#64748b",
            }}>
              {Number(selected.rating).toFixed(1)}
            </div>
          )}
        </div>
      )}
    </>
  );
}