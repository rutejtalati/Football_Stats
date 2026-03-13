// DEBUG Pitch.jsx — logs everything to console
import { useState, useEffect } from "react";

function gridToXY(gridStr, formation, isAway) {
  if (!gridStr) return { x: 50, y: isAway ? 12 : 88 };
  const [rowStr, colStr] = gridStr.split(":");
  const row = parseInt(rowStr, 10);
  const col = parseInt(colStr, 10);
  const parts = formation ? formation.split("-").map(Number) : [4,3,3];
  const rows = [1, ...parts];
  const totalRows = rows.length;
  const colsInRow = rows[row - 1] ?? 1;
  const x = colsInRow === 1 ? 50 : 8 + ((col - 1) / (colsInRow - 1)) * 84;
  const ySpread = 78;
  const yStart = 10;
  const rowFraction = isAway
    ? (row - 1) / (totalRows - 1)
    : 1 - (row - 1) / (totalRows - 1);
  const y = yStart + rowFraction * ySpread;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

function PlayerToken({ player, color, onClick }) {
  const [imgErr, setImgErr] = useState(false);
  const shortName = player.name ? player.name.split(" ").pop() : "—";
  return (
    <div
      className="absolute flex flex-col items-center cursor-pointer group"
      style={{
        left: `calc(${player._x}% - 22px)`,
        top: `calc(${player._y}% - 22px)`,
        zIndex: 10,
        animation: "fadeInPlayer 0.4s ease both",
        animationDelay: `${player._delay || 0}ms`,
      }}
      onClick={() => onClick && onClick(player)}
    >
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        border: `2.5px solid ${color}`, background: "rgba(6,10,18,0.85)",
        overflow: "hidden", position: "relative",
        boxShadow: `0 0 10px ${color}44`,
      }}>
        {player.photo && !imgErr ? (
          <img src={player.photo} alt={player.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setImgErr(true)} />
        ) : (
          <div style={{
            width: "100%", height: "100%", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 900, color,
          }}>
            {player.number || player.name?.[0] || "?"}
          </div>
        )}
        {player.number && (
          <div style={{
            position: "absolute", bottom: 0, right: 0,
            background: color, color: "#000",
            fontSize: 8, fontWeight: 900, width: 14, height: 14,
            borderRadius: "50%", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>{player.number}</div>
        )}
      </div>
      <div style={{
        marginTop: 3, fontSize: 9, fontWeight: 800, color: "#e0eeff",
        textAlign: "center", maxWidth: 60, whiteSpace: "nowrap",
        overflow: "hidden", textOverflow: "ellipsis",
        textShadow: "0 1px 4px rgba(0,0,0,0.9)",
      }}>{shortName}</div>
      {/* DEBUG: show grid value on pitch */}
      <div style={{
        fontSize: 7, color: "yellow", fontWeight: 900,
        background: "rgba(0,0,0,0.7)", padding: "0 2px", borderRadius: 2,
      }}>{player.grid || "NO GRID"}</div>
    </div>
  );
}

function PitchLines() {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.18 }}>
      <rect x="3" y="2" width="94" height="96" fill="none" stroke="white" strokeWidth="0.5"/>
      <line x1="3" y1="50" x2="97" y2="50" stroke="white" strokeWidth="0.4"/>
      <circle cx="50" cy="50" r="12" fill="none" stroke="white" strokeWidth="0.4"/>
      <rect x="21" y="2" width="58" height="18" fill="none" stroke="white" strokeWidth="0.4"/>
      <rect x="21" y="80" width="58" height="18" fill="none" stroke="white" strokeWidth="0.4"/>
    </svg>
  );
}

export default function Pitch({ home, away, mode }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    console.group("[Pitch DEBUG]");
    console.log("home formation:", home?.formation);
    console.log("away formation:", away?.formation);
    console.log("home starting_xi count:", home?.starting_xi?.length);
    console.log("away starting_xi count:", away?.starting_xi?.length);
    console.log("=== HOME PLAYERS ===");
    (home?.starting_xi || []).forEach((p, i) => {
      console.log(`  [${i}] ${p.name} | grid="${p.grid}" | pos=${p.pos}`);
    });
    console.log("=== AWAY PLAYERS ===");
    (away?.starting_xi || []).forEach((p, i) => {
      console.log(`  [${i}] ${p.name} | grid="${p.grid}" | pos=${p.pos}`);
    });
    console.groupEnd();
  }, [home, away]);

  const homePlayers = (home?.starting_xi || []).map((p, i) => {
    const { x, y } = gridToXY(p.grid, home?.formation, false);
    return { ...p, _x: x, _y: y, _delay: i * 40 };
  });

  const awayPlayers = (away?.starting_xi || []).map((p, i) => {
    const { x, y } = gridToXY(p.grid, away?.formation, true);
    return { ...p, _x: x, _y: y, _delay: i * 40 + 200 };
  });

  const noLineups = homePlayers.length === 0 && awayPlayers.length === 0;

  return (
    <>
      <style>{`
        @keyframes fadeInPlayer {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* DEBUG banner */}
      <div style={{
        background: "#1a0a00", border: "1px solid #f59e0b",
        borderRadius: 6, padding: "4px 10px", marginBottom: 8,
        fontSize: 10, color: "#f59e0b", fontFamily: "monospace",
      }}>
        🔍 DEBUG | Home: {home?.team_name} ({home?.formation}) {home?.starting_xi?.length ?? 0}p |
        Away: {away?.team_name} ({away?.formation}) {away?.starting_xi?.length ?? 0}p |
        Mode: {mode}
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 8, padding: "0 4px",
      }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#60a5fa" }}>
          {home?.team_name} · {home?.formation}
        </span>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#f97316" }}>
          {away?.formation} · {away?.team_name}
        </span>
      </div>

      <div style={{
        position: "relative", width: "100%", paddingBottom: "140%",
        borderRadius: 14, overflow: "hidden",
        background: "linear-gradient(180deg,#0a2010 0%,#0e3318 20%,#0d2e14 50%,#0e3318 80%,#0a2010 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <PitchLines />
          {noLineups ? (
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>No lineup data</div>
            </div>
          ) : (
            <>
              {homePlayers.map((p, i) => (
                <PlayerToken key={`home-${i}`} player={p} color="#60a5fa" onClick={setSelectedPlayer} />
              ))}
              {awayPlayers.map((p, i) => (
                <PlayerToken key={`away-${i}`} player={p} color="#f97316" onClick={setSelectedPlayer} />
              ))}
            </>
          )}
        </div>
      </div>

      {selectedPlayer && (
        <div style={{
          marginTop: 10, background: "#0d1525",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
          fontFamily: "monospace", fontSize: 11, color: "#94a3b8",
        }} onClick={() => setSelectedPlayer(null)}>
          <strong style={{ color: "#f0f6ff" }}>{selectedPlayer.name}</strong>
          &nbsp;| pos: {selectedPlayer.pos}
          &nbsp;| grid: <span style={{ color: "yellow" }}>{selectedPlayer.grid || "MISSING"}</span>
          &nbsp;| _x: {selectedPlayer._x} | _y: {selectedPlayer._y}
          &nbsp;| #: {selectedPlayer.number}
        </div>
      )}
    </>
  );
}