// ═════════════════════════════════════════════════════
// Pitch.jsx  –  FotMob-style football pitch
// ═════════════════════════════════════════════════════

import { useState } from "react";
import { getFormationCoords, posColor } from "../utils/formationMap";

// ─────────────────────────────────────────────
// Player Token
// ─────────────────────────────────────────────

function PlayerToken({ player, color, isAway, onClick }) {
  const [imgErr, setImgErr] = useState(false);
  const shortName = player.name
    ? player.name.split(" ").pop()
    : "—";
  const rating = player.rating;

  return (
    <div
      className="absolute flex flex-col items-center cursor-pointer group"
      style={{
        left: `calc(${player._x}% - 22px)`,
        top:  `calc(${player._y}% - 22px)`,
        zIndex: 10,
        animation: "fadeInPlayer 0.4s ease both",
        animationDelay: `${player._delay || 0}ms`,
      }}
      onClick={() => onClick && onClick(player)}
    >
      {/* Circle */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: `2.5px solid ${color}`,
          background: "rgba(6,10,18,0.85)",
          overflow: "hidden",
          position: "relative",
          boxShadow: `0 0 10px ${color}44`,
          transition: "transform 0.15s",
        }}
        className="group-hover:scale-110"
      >
        {player.photo && !imgErr ? (
          <img
            src={player.photo}
            alt={player.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setImgErr(true)}
          />
        ) : (
          <div
            style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 900,
              color: color,
            }}
          >
            {player.number || player.name?.[0] || "?"}
          </div>
        )}

        {/* Jersey number overlay */}
        {player.number && (
          <div style={{
            position: "absolute", bottom: 0, right: 0,
            background: color,
            color: "#000",
            fontSize: 8, fontWeight: 900,
            width: 14, height: 14,
            borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {player.number}
          </div>
        )}
      </div>

      {/* Rating badge */}
      {rating && (
        <div style={{
          position: "absolute",
          top: -7,
          left: "50%",
          transform: "translateX(-50%)",
          background: rating >= 7.5 ? "#34d399" : rating >= 6.5 ? "#f59e0b" : "#6b7fa3",
          color: "#000",
          fontSize: 8, fontWeight: 900,
          padding: "1px 4px",
          borderRadius: 4,
          whiteSpace: "nowrap",
        }}>
          {Number(rating).toFixed(1)}
        </div>
      )}

      {/* Name label */}
      <div style={{
        marginTop: 3,
        fontSize: 9,
        fontWeight: 800,
        color: "#e0eeff",
        textAlign: "center",
        maxWidth: 60,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        textShadow: "0 1px 4px rgba(0,0,0,0.9)",
        letterSpacing: "0.01em",
      }}>
        {shortName}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Pitch lines SVG overlay
// ─────────────────────────────────────────────

function PitchLines() {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        opacity: 0.18,
      }}
    >
      {/* Outer border */}
      <rect x="3" y="2" width="94" height="96" fill="none" stroke="white" strokeWidth="0.5"/>
      {/* Centre line */}
      <line x1="3" y1="50" x2="97" y2="50" stroke="white" strokeWidth="0.4"/>
      {/* Centre circle */}
      <circle cx="50" cy="50" r="12" fill="none" stroke="white" strokeWidth="0.4"/>
      <circle cx="50" cy="50" r="0.7" fill="white"/>
      {/* Top penalty box */}
      <rect x="21" y="2" width="58" height="18" fill="none" stroke="white" strokeWidth="0.4"/>
      {/* Top 6-yard box */}
      <rect x="35" y="2" width="30" height="7" fill="none" stroke="white" strokeWidth="0.4"/>
      {/* Top penalty spot */}
      <circle cx="50" cy="14" r="0.6" fill="white"/>
      {/* Bottom penalty box */}
      <rect x="21" y="80" width="58" height="18" fill="none" stroke="white" strokeWidth="0.4"/>
      {/* Bottom 6-yard box */}
      <rect x="35" y="91" width="30" height="7" fill="none" stroke="white" strokeWidth="0.4"/>
      {/* Bottom penalty spot */}
      <circle cx="50" cy="86" r="0.6" fill="white"/>
    </svg>
  );
}

// ─────────────────────────────────────────────
// Main Pitch component
// ─────────────────────────────────────────────

export default function Pitch({ home, away, mode }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const homeCoords = getFormationCoords(home?.formation, false);
  const awayCoords = getFormationCoords(away?.formation, true);

  const homePlayers = (home?.starting_xi || []).map((p, i) => ({
    ...p,
    _x: homeCoords[i]?.x ?? 50,
    _y: homeCoords[i]?.y ?? 88,
    _delay: i * 40,
  }));

  const awayPlayers = (away?.starting_xi || []).map((p, i) => ({
    ...p,
    _x: awayCoords[i]?.x ?? 50,
    _y: awayCoords[i]?.y ?? 12,
    _delay: i * 40 + 200,
  }));

  const noLineups = homePlayers.length === 0 && awayPlayers.length === 0;

  return (
    <>
      <style>{`
        @keyframes fadeInPlayer {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Formation labels */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 8, padding: "0 4px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {home?.logo && (
            <img src={home.logo} style={{ width: 18, height: 18, objectFit: "contain" }}
              onError={e => e.currentTarget.style.display = "none"} />
          )}
          <span style={{ fontSize: 11, fontWeight: 800, color: "#60a5fa" }}>
            {home?.team_name}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: "rgba(96,165,250,0.6)",
            background: "rgba(96,165,250,0.08)",
            padding: "1px 7px", borderRadius: 999,
          }}>
            {home?.formation || "—"}
          </span>
          {mode === "predicted" && (
            <span style={{
              fontSize: 8, fontWeight: 800, letterSpacing: "0.08em",
              color: "#f59e0b", background: "rgba(245,158,11,0.12)",
              padding: "1px 6px", borderRadius: 999,
            }}>PREDICTED</span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {mode === "predicted" && (
            <span style={{
              fontSize: 8, fontWeight: 800, letterSpacing: "0.08em",
              color: "#f59e0b", background: "rgba(245,158,11,0.12)",
              padding: "1px 6px", borderRadius: 999,
            }}>PREDICTED</span>
          )}
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: "rgba(249,115,22,0.6)",
            background: "rgba(249,115,22,0.08)",
            padding: "1px 7px", borderRadius: 999,
          }}>
            {away?.formation || "—"}
          </span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#f97316" }}>
            {away?.team_name}
          </span>
          {away?.logo && (
            <img src={away.logo} style={{ width: 18, height: 18, objectFit: "contain" }}
              onError={e => e.currentTarget.style.display = "none"} />
          )}
        </div>
      </div>

      {/* Pitch */}
      <div style={{
        position: "relative",
        width: "100%",
        paddingBottom: "140%", // tall aspect ratio like FotMob
        borderRadius: 14,
        overflow: "hidden",
        background: "linear-gradient(180deg, #0a2010 0%, #0e3318 20%, #0d2e14 50%, #0e3318 80%, #0a2010 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <PitchLines />

          {noLineups ? (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 8,
            }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", fontWeight: 600 }}>
                Lineups not yet announced.
              </div>
            </div>
          ) : (
            <>
              {homePlayers.map((p, i) => (
                <PlayerToken
                  key={`home-${i}`}
                  player={p}
                  color="#60a5fa"
                  isAway={false}
                  onClick={setSelectedPlayer}
                />
              ))}
              {awayPlayers.map((p, i) => (
                <PlayerToken
                  key={`away-${i}`}
                  player={p}
                  color="#f97316"
                  isAway={true}
                  onClick={setSelectedPlayer}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Player tooltip */}
      {selectedPlayer && (
        <div
          style={{
            marginTop: 10,
            background: "linear-gradient(135deg,#0d1525,#080e1a)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12,
            padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 12,
          }}
          onClick={() => setSelectedPlayer(null)}
        >
          {selectedPlayer.photo && (
            <img src={selectedPlayer.photo} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }}
              onError={e => e.currentTarget.style.display = "none"} />
          )}
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#f0f6ff" }}>
              {selectedPlayer.name}
            </div>
            <div style={{ fontSize: 10, color: "#4a6080", marginTop: 2 }}>
              {selectedPlayer.pos} {selectedPlayer.number ? `· #${selectedPlayer.number}` : ""}
              {selectedPlayer.nationality ? ` · ${selectedPlayer.nationality}` : ""}
            </div>
          </div>
          {selectedPlayer.rating && (
            <div style={{
              marginLeft: "auto",
              fontSize: 20, fontWeight: 900,
              color: selectedPlayer.rating >= 7.5 ? "#34d399" : selectedPlayer.rating >= 6.5 ? "#f59e0b" : "#6b7fa3",
            }}>
              {Number(selectedPlayer.rating).toFixed(1)}
            </div>
          )}
        </div>
      )}
    </>
  );
}