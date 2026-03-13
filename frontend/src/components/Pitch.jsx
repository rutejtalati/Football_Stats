// ═════════════════════════════════════════════════════
// Pitch.jsx  –  FotMob-style football pitch
// Uses ResizeObserver to get real pixel dimensions,
// then places players at exact px coords from grid field.
// ═════════════════════════════════════════════════════

import { useState, useRef, useEffect } from "react";

// ─────────────────────────────────────────────────────
// grid = "row:col"  (1-indexed, from backend)
//   row 1 = GK, row 2 = DEF, row 3 = MID, row 4 = FWD
//   formation "4-3-3" → rows have [1, 4, 3, 3] players
//
// Returns { x, y } as percentage 0–100
// ─────────────────────────────────────────────────────
function gridToPercent(gridStr, formation, isAway) {
  if (!gridStr) return { x: 50, y: isAway ? 12 : 88 };

  const parts = (gridStr + "").split(":");
  const row = parseInt(parts[0], 10) || 1;
  const col = parseInt(parts[1], 10) || 1;

  // Parse formation into row sizes: "4-3-3" → [1, 4, 3, 3]
  const rowSizes = [1, ...(formation || "4-3-3").split("-").map(Number)];
  const totalRows = rowSizes.length;
  const colsInRow = rowSizes[row - 1] ?? 1;

  // X: spread players evenly across 10%–90%
  const x = colsInRow === 1
    ? 50
    : 10 + ((col - 1) / (colsInRow - 1)) * 80;

  // Y: GK at bottom (home) or top (away), attackers at opposite end
  // rows spread across 8%–92%
  const frac = (row - 1) / Math.max(totalRows - 1, 1);
  const y = isAway
    ? 8 + frac * 84          // away: row1 (GK) near top
    : 92 - frac * 84;        // home: row1 (GK) near bottom

  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
  };
}

// ─────────────────────────────────────────────
// Player Token  — positioned by px derived from %
// ─────────────────────────────────────────────
function PlayerToken({ player, color, pitchW, pitchH, onClick }) {
  const [imgErr, setImgErr] = useState(false);
  const shortName = player.name ? player.name.split(" ").pop() : "—";
  const rating = player.rating;

  const TOKEN_R = 18; // avatar radius px
  const leftPx = (player._x / 100) * pitchW - TOKEN_R;
  const topPx  = (player._y / 100) * pitchH - TOKEN_R;

  return (
    <div
      style={{
        position: "absolute",
        left: leftPx,
        top:  topPx,
        width: TOKEN_R * 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: "pointer",
        zIndex: 10,
        animation: "fadeInPlayer 0.35s ease both",
        animationDelay: `${player._delay || 0}ms`,
      }}
      onClick={() => onClick?.(player)}
    >
      {/* Rating badge */}
      {rating && (
        <div style={{
          marginBottom: 1,
          background: rating >= 7.5 ? "#34d399" : rating >= 6.5 ? "#f59e0b" : "#6b7fa3",
          color: "#000", fontSize: 7, fontWeight: 900,
          padding: "1px 3px", borderRadius: 3, whiteSpace: "nowrap",
        }}>
          {Number(rating).toFixed(1)}
        </div>
      )}

      {/* Avatar */}
      <div style={{
        width: TOKEN_R * 2, height: TOKEN_R * 2,
        borderRadius: "50%",
        border: `2px solid ${color}`,
        background: "rgba(6,10,18,0.88)",
        overflow: "hidden",
        position: "relative",
        boxShadow: `0 0 8px ${color}55`,
        flexShrink: 0,
      }}>
        {player.photo && !imgErr ? (
          <img src={player.photo} alt={player.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setImgErr(true)} />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 900, color,
          }}>
            {player.number || player.name?.[0] || "?"}
          </div>
        )}
        {player.number && (
          <div style={{
            position: "absolute", bottom: 0, right: 0,
            background: color, color: "#000",
            fontSize: 6, fontWeight: 900,
            width: 11, height: 11, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {player.number}
          </div>
        )}
      </div>

      {/* Name */}
      <div style={{
        marginTop: 2, fontSize: 8, fontWeight: 800,
        color: "#e8f0ff", textAlign: "center",
        width: 56, whiteSpace: "nowrap",
        overflow: "hidden", textOverflow: "ellipsis",
        textShadow: "0 1px 3px rgba(0,0,0,1)",
        letterSpacing: "0.01em",
      }}>
        {shortName}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Pitch markings SVG
// ─────────────────────────────────────────────
function PitchLines() {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.2, pointerEvents: "none" }}>
      <rect x="3" y="2" width="94" height="96" fill="none" stroke="white" strokeWidth="0.5"/>
      <line x1="3" y1="50" x2="97" y2="50" stroke="white" strokeWidth="0.4"/>
      <circle cx="50" cy="50" r="11" fill="none" stroke="white" strokeWidth="0.4"/>
      <circle cx="50" cy="50" r="0.7" fill="white"/>
      <rect x="22" y="2"  width="56" height="17" fill="none" stroke="white" strokeWidth="0.4"/>
      <rect x="36" y="2"  width="28" height="7"  fill="none" stroke="white" strokeWidth="0.4"/>
      <circle cx="50" cy="13" r="0.6" fill="white"/>
      <rect x="22" y="81" width="56" height="17" fill="none" stroke="white" strokeWidth="0.4"/>
      <rect x="36" y="91" width="28" height="7"  fill="none" stroke="white" strokeWidth="0.4"/>
      <circle cx="50" cy="87" r="0.6" fill="white"/>
      {/* Stripe pattern for grass feel */}
      {[10,20,30,40,50,60,70,80,90].map(y => (
        <rect key={y} x="3" y={y} width="94" height="5"
          fill="rgba(255,255,255,0.015)" stroke="none"/>
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────
// Main Pitch
// ─────────────────────────────────────────────
export default function Pitch({ home, away, mode }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const pitchRef  = useRef(null);
  const [pitchSize, setPitchSize] = useState({ w: 0, h: 0 });

  // Observe real rendered size of the pitch div
  useEffect(() => {
    if (!pitchRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setPitchSize({ w: width, h: height });
        }
      }
    });
    ro.observe(pitchRef.current);
    return () => ro.disconnect();
  }, []);

  // Map grid → % coords
  const homePlayers = (home?.starting_xi || []).map((p, i) => {
    const { x, y } = gridToPercent(p.grid, home?.formation, false);
    return { ...p, _x: x, _y: y, _delay: i * 35 };
  });

  const awayPlayers = (away?.starting_xi || []).map((p, i) => {
    const { x, y } = gridToPercent(p.grid, away?.formation, true);
    return { ...p, _x: x, _y: y, _delay: i * 35 + 180 };
  });

  const noLineups = homePlayers.length === 0 && awayPlayers.length === 0;
  const canRender = pitchSize.w > 0 && pitchSize.h > 0;

  return (
    <>
      <style>{`
        @keyframes fadeInPlayer {
          from { opacity: 0; transform: scale(0.6); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Header bar */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 8, padding: "0 4px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {home?.logo && (
            <img src={home.logo} style={{ width: 18, height: 18, objectFit: "contain" }}
              onError={e => e.currentTarget.style.display = "none"} />
          )}
          <span style={{ fontSize: 11, fontWeight: 800, color: "#60a5fa" }}>{home?.team_name}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: "rgba(96,165,250,0.65)",
            background: "rgba(96,165,250,0.08)", padding: "1px 7px", borderRadius: 999,
          }}>{home?.formation || "—"}</span>
          {mode === "predicted" && (
            <span style={{
              fontSize: 7.5, fontWeight: 900, letterSpacing: "0.08em",
              color: "#f59e0b", background: "rgba(245,158,11,0.12)",
              padding: "1px 6px", borderRadius: 999,
            }}>PREDICTED</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {mode === "predicted" && (
            <span style={{
              fontSize: 7.5, fontWeight: 900, letterSpacing: "0.08em",
              color: "#f59e0b", background: "rgba(245,158,11,0.12)",
              padding: "1px 6px", borderRadius: 999,
            }}>PREDICTED</span>
          )}
          <span style={{
            fontSize: 10, fontWeight: 700, color: "rgba(249,115,22,0.65)",
            background: "rgba(249,115,22,0.08)", padding: "1px 7px", borderRadius: 999,
          }}>{away?.formation || "—"}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#f97316" }}>{away?.team_name}</span>
          {away?.logo && (
            <img src={away.logo} style={{ width: 18, height: 18, objectFit: "contain" }}
              onError={e => e.currentTarget.style.display = "none"} />
          )}
        </div>
      </div>

      {/* Pitch — aspect-ratio driven, ResizeObserver reads actual px */}
      <div style={{
        width: "100%",
        aspectRatio: "7 / 10",   // portrait pitch ratio
        position: "relative",
        borderRadius: 12,
        overflow: "hidden",
        background: "linear-gradient(180deg,#082010 0%,#0e3318 15%,#0c2c14 50%,#0e3318 85%,#082010 100%)",
        border: "1px solid rgba(255,255,255,0.07)",
        minHeight: 420,
      }}
        ref={pitchRef}
      >
        <PitchLines />

        {noLineups && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>
              Lineups not yet announced.
            </span>
          </div>
        )}

        {canRender && !noLineups && (
          <>
            {homePlayers.map((p, i) => (
              <PlayerToken key={`h-${i}`} player={p} color="#60a5fa"
                pitchW={pitchSize.w} pitchH={pitchSize.h}
                onClick={setSelectedPlayer} />
            ))}
            {awayPlayers.map((p, i) => (
              <PlayerToken key={`a-${i}`} player={p} color="#f97316"
                pitchW={pitchSize.w} pitchH={pitchSize.h}
                onClick={setSelectedPlayer} />
            ))}
          </>
        )}
      </div>

      {/* Click-to-inspect */}
      {selectedPlayer && (
        <div style={{
          marginTop: 8,
          background: "linear-gradient(135deg,#0d1525,#080e1a)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10, padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 10,
          cursor: "pointer",
        }} onClick={() => setSelectedPlayer(null)}>
          {selectedPlayer.photo && (
            <img src={selectedPlayer.photo}
              style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }}
              onError={e => e.currentTarget.style.display = "none"} />
          )}
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#f0f6ff" }}>{selectedPlayer.name}</div>
            <div style={{ fontSize: 10, color: "#4a6080", marginTop: 2 }}>
              {selectedPlayer.pos}
              {selectedPlayer.number ? ` · #${selectedPlayer.number}` : ""}
              {selectedPlayer.nationality ? ` · ${selectedPlayer.nationality}` : ""}
            </div>
          </div>
          {selectedPlayer.rating && (
            <div style={{
              marginLeft: "auto", fontSize: 20, fontWeight: 900,
              color: selectedPlayer.rating >= 7.5 ? "#34d399"
                   : selectedPlayer.rating >= 6.5 ? "#f59e0b" : "#6b7fa3",
            }}>
              {Number(selectedPlayer.rating).toFixed(1)}
            </div>
          )}
        </div>
      )}
    </>
  );
}