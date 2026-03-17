// components/FplPitch.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Self-contained pitch renderer for FPL pages.
// No external component dependencies — drop into any page.
//
// Accepts two data shapes:
//
//   A) "lineup" shape (BestTeamPage):
//      lineup = { gk: player, defenders: [], midfielders: [], forwards: [] }
//      Players have: name, position, projected_points, cost, next_opp,
//                    fixture_difficulty, code (for FPL photo URL),
//                    appearance_prob, player_id/id
//
//   B) "xi" shape (BestXIPage):
//      xi = flat Player[] grouped internally by position
//      Players have: name, position, ep_next, cost, next_opp,
//                    fixture_difficulty, photo (direct URL),
//                    player_id/id, captain_score
//
// Props:
//   lineup        — shape A object  (pass one of lineup or xi)
//   xi            — shape B array
//   captain       — player object that is captain
//   vc            — player object that is vice captain
//   highlightedId — player_id to highlight (for cross-component hover)
//   onPlayerClick — (player) => void
//   showPoints    — "projected" | "ep" | "cost" | false  (default "projected")
//   showFixture   — bool (default true)
//   loading       — bool
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";

const POS_COL = { GK:"#f2c94c", DEF:"#4f9eff", MID:"#00e09e", FWD:"#ff6b6b" };
const FDR_BG  = { 1:"#1a7a3e", 2:"#1a7a3e", 3:"#2d2d2d", 4:"#7a2020", 5:"#4a0a0a" };
const POS_ORDER = ["GK","DEF","MID","FWD"];

/* ── Derive photo URL from player regardless of shape ──────────────── */
function photoUrl(player) {
  if (player?.photo) return player.photo;
  if (player?.code)  return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png`;
  return null;
}

/* ── Derive display points value ─────────────────────────────────── */
function pointsDisplay(player, mode) {
  if (!mode || mode === false) return null;
  if (mode === "ep") {
    const v = player.ep_next ?? player.pts_gw_1 ?? player.projected_points;
    return v != null ? `${Number(v).toFixed(2)} EP` : null;
  }
  if (mode === "cost") return player.cost != null ? `£${player.cost}m` : null;
  // "projected" (default)
  const v = player.projected_points ?? player.ep_next ?? player.pts_gw_1;
  return v != null ? `${Number(v).toFixed(1)} pts` : null;
}

/* ── Single player chip on the pitch ─────────────────────────────── */
function PlayerChip({ player, isCaptain, isVC, highlighted, onPlayerClick, showPoints, showFixture }) {
  const [hov, setHov] = useState(false);
  const col  = POS_COL[player.position] || "#4f9eff";
  const url  = photoUrl(player);
  const pts  = pointsDisplay(player, showPoints);
  const diff = player.fixture_difficulty;
  const isHighlighted = highlighted || hov;
  const pid  = player.player_id || player.id;

  return (
    <div
      onClick={() => onPlayerClick?.(player)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", flexDirection:"column", alignItems:"center", gap:3,
        cursor: onPlayerClick ? "pointer" : "default",
        position:"relative",
        transition:"transform 180ms cubic-bezier(0.22,1,0.36,1)",
        transform: isHighlighted ? "scale(1.08) translateY(-2px)" : "scale(1)",
      }}
    >
      {/* C / VC badge */}
      {(isCaptain || isVC) && (
        <div style={{
          position:"absolute", top:-6, right:-6, zIndex:2,
          width:18, height:18, borderRadius:"50%",
          background: isCaptain ? "#f2c94c" : "rgba(200,220,255,0.28)",
          color: isCaptain ? "#000" : "#e8f0ff",
          fontSize:9, fontWeight:900,
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow: isCaptain ? "0 0 8px #f2c94c99" : "none",
          border: isVC ? "1px solid rgba(200,220,255,0.3)" : "none",
        }}>{isCaptain ? "C" : "V"}</div>
      )}

      {/* Photo / avatar circle */}
      <div style={{
        width:44, height:44, borderRadius:"50%", overflow:"hidden",
        border:`2px solid ${isHighlighted ? col : col+"55"}`,
        background:"rgba(255,255,255,0.06)",
        display:"flex", alignItems:"center", justifyContent:"center",
        transition:"border-color 180ms, box-shadow 180ms",
        boxShadow: isHighlighted ? `0 0 14px ${col}66` : "none",
        flexShrink:0,
      }}>
        {url ? (
          <img
            src={url} alt=""
            style={{ width:"100%", height:"100%", objectFit:"cover" }}
            onError={e => { e.target.style.display="none"; }}
          />
        ) : (
          <span style={{ fontSize:10, fontWeight:900, color:col, letterSpacing:"0.04em" }}>
            {player.position}
          </span>
        )}
      </div>

      {/* Surname */}
      <div style={{
        fontSize:10, fontWeight:800, color: isHighlighted ? "#fff" : "#e8f0ff",
        textAlign:"center", maxWidth:68,
        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
        textShadow: isHighlighted ? `0 0 10px ${col}88` : "none",
        transition:"color 180ms, text-shadow 180ms",
      }}>
        {(player.name || "").split(" ").at(-1)}
      </div>

      {/* Points / EP / cost */}
      {pts && (
        <div style={{
          fontSize:9, fontWeight:900, fontFamily:"'JetBrains Mono',monospace",
          color:col, background:`${col}18`,
          padding:"1px 6px", borderRadius:999,
          border:`1px solid ${col}33`,
        }}>
          {pts}
        </div>
      )}

      {/* Next fixture FDR chip */}
      {showFixture && player.next_opp && (
        <div style={{
          fontSize:8, color:"rgba(200,220,255,0.65)",
          background: FDR_BG[diff] || "#2d2d2d",
          padding:"1px 5px", borderRadius:4,
        }}>
          {player.next_opp}
        </div>
      )}
    </div>
  );
}

/* ── Row of players across the pitch ─────────────────────────────── */
function PitchRow({ players, captain, vc, highlightedId, onPlayerClick, showPoints, showFixture }) {
  if (!players?.length) return null;
  const capId = captain?.player_id ?? captain?.id;
  const vcId  = vc?.player_id ?? vc?.id;
  return (
    <div style={{
      display:"flex", justifyContent:"center",
      gap:"clamp(8px, 3vw, 24px)",
      flexWrap:"nowrap", padding:"8px 4px",
      minHeight:100,
    }}>
      {players.map(p => {
        const pid = p.player_id ?? p.id;
        return (
          <PlayerChip
            key={pid ?? p.name}
            player={p}
            isCaptain={capId != null && capId === pid}
            isVC={vcId != null && vcId === pid}
            highlighted={highlightedId != null && highlightedId === pid}
            onPlayerClick={onPlayerClick}
            showPoints={showPoints}
            showFixture={showFixture}
          />
        );
      })}
    </div>
  );
}

/* ── Skeleton row ─────────────────────────────────────────────────── */
function SkeletonRow({ count = 4 }) {
  return (
    <div style={{ display:"flex", justifyContent:"center", gap:20, padding:"8px 0" }}>
      {Array.from({ length:count }).map((_,i) => (
        <div key={i} style={{
          width:44, height:80, borderRadius:8,
          background:"linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.03) 75%)",
          backgroundSize:"200% 100%", animation:"fplPitchShimmer 1.4s infinite",
          animationDelay:`${i*0.1}s`,
        }}/>
      ))}
    </div>
  );
}

/* ── Pitch SVG background ─────────────────────────────────────────── */
function PitchSVG() {
  return (
    <svg
      style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.07, pointerEvents:"none" }}
      viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice"
    >
      {/* Outer boundary */}
      <rect x="12" y="10" width="576" height="400" rx="4" fill="none" stroke="white" strokeWidth="1.5"/>
      {/* Centre line */}
      <line x1="12" y1="210" x2="588" y2="210" stroke="white" strokeWidth="1"/>
      {/* Centre circle */}
      <circle cx="300" cy="210" r="55" fill="none" stroke="white" strokeWidth="1"/>
      <circle cx="300" cy="210" r="4" fill="white" opacity="0.7"/>
      {/* Left penalty area */}
      <rect x="12" y="140" width="78" height="140" fill="none" stroke="white" strokeWidth="1"/>
      {/* Right penalty area */}
      <rect x="510" y="140" width="78" height="140" fill="none" stroke="white" strokeWidth="1"/>
      {/* Left 6-yard box */}
      <rect x="12" y="170" width="30" height="80" fill="none" stroke="white" strokeWidth="0.8" opacity="0.6"/>
      {/* Right 6-yard box */}
      <rect x="558" y="170" width="30" height="80" fill="none" stroke="white" strokeWidth="0.8" opacity="0.6"/>
      {/* Left penalty spot */}
      <circle cx="68" cy="210" r="3" fill="white" opacity="0.5"/>
      {/* Right penalty spot */}
      <circle cx="532" cy="210" r="3" fill="white" opacity="0.5"/>
    </svg>
  );
}

/* ── Normalise lineup into rows per position ──────────────────────── */
function buildRows(lineup, xi) {
  if (xi?.length) {
    // xi is a flat array — group by position
    const groups = { GK:[], DEF:[], MID:[], FWD:[] };
    for (const p of xi) {
      (groups[p.position] = groups[p.position] || []).push(p);
    }
    return groups;
  }
  if (lineup) {
    return {
      GK:  lineup.gk  ? [lineup.gk] : [],
      DEF: lineup.defenders   || [],
      MID: lineup.midfielders || [],
      FWD: lineup.forwards    || [],
    };
  }
  return { GK:[], DEF:[], MID:[], FWD:[] };
}

/* ══════════════════════════════════════════════════════════════════════
   FplPitch — main export
   ══════════════════════════════════════════════════════════════════════ */
export default function FplPitch({
  lineup        = null,
  xi            = null,
  captain       = null,
  vc            = null,
  highlightedId = null,
  onPlayerClick = null,
  showPoints    = "projected",
  showFixture   = true,
  loading       = false,
}) {
  const rows = buildRows(lineup, xi);
  const totalPlayers = Object.values(rows).flat().length;

  return (
    <>
      <style>{`
        @keyframes fplPitchShimmer {
          0%   { background-position: -200% 0 }
          100% { background-position:  200% 0 }
        }
      `}</style>
      <div style={{
        background:"linear-gradient(180deg, #0b2e12 0%, #071f0a 100%)",
        border:"1px solid rgba(255,255,255,0.08)",
        borderRadius:18,
        padding:"16px 12px",
        position:"relative",
        overflow:"hidden",
        minHeight:320,
      }}>
        <PitchSVG />

        <div style={{ position:"relative", zIndex:1 }}>
          {loading ? (
            // Skeleton: 4 rows of 4 chips
            <>
              <SkeletonRow count={1}/>
              <SkeletonRow count={4}/>
              <SkeletonRow count={4}/>
              <SkeletonRow count={3}/>
            </>
          ) : totalPlayers === 0 ? (
            <div style={{
              textAlign:"center", padding:"40px 20px",
              color:"#4a6a8a", fontSize:13, fontFamily:"'Inter',sans-serif",
            }}>
              No lineup data. Try adjusting filters.
            </div>
          ) : (
            POS_ORDER.map(pos => (
              <PitchRow
                key={pos}
                players={rows[pos]}
                captain={captain}
                vc={vc}
                highlightedId={highlightedId}
                onPlayerClick={onPlayerClick}
                showPoints={showPoints}
                showFixture={showFixture}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}