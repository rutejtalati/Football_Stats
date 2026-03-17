// components/FplPitch.jsx  —  Stadium broadcast aesthetic
// ─────────────────────────────────────────────────────────────────────────────
// Self-contained pitch renderer.  Zero external component dependencies.
//
// Accepts lineup shape from BestTeamPage:
//   lineup = { gk: player, defenders:[], midfielders:[], forwards:[] }
//
// Also accepts flat xi[] for BestXIPage (backward compat):
//   xi = Player[]  (grouped by position internally)
//
// Player objects need: player_id|id, name|player|web_name, position,
//   projected_points|ep_next|pts_gw_1, cost, team, next_opp,
//   fixture_difficulty, code (for photo CDN URL)
//
// Props:
//   lineup        { gk, defenders[], midfielders[], forwards[] }
//   xi            Player[]  (alternative to lineup)
//   bench         Player[]
//   captain       player object
//   vc            player object
//   highlightedId player_id to highlight (cross-panel hover sync)
//   onPlayerClick (player) => void
//   loading       bool
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useMemo, useRef, useEffect, memo } from "react";
import "./pitch.css";

/* ── Constants ───────────────────────────────────────────────────────────── */
const POS_ORDER = ["GK", "DEF", "MID", "FWD"];

const POS_META = {
  GK:  { color: "#f59e0b", glow: "rgba(245,158,11,0.35)",  css: "var(--pos-gk-color)",  glowCss: "var(--pos-gk-glow)"  },
  DEF: { color: "#3b82f6", glow: "rgba(59,130,246,0.35)",  css: "var(--pos-def-color)", glowCss: "var(--pos-def-glow)" },
  MID: { color: "#22c55e", glow: "rgba(34,197,94,0.35)",   css: "var(--pos-mid-color)", glowCss: "var(--pos-mid-glow)" },
  FWD: { color: "#ef4444", glow: "rgba(239,68,68,0.35)",   css: "var(--pos-fwd-color)", glowCss: "var(--pos-fwd-glow)" },
};

const FDR_BG  = { 1:"#14532d", 2:"#14532d", 3:"#44403c", 4:"#7f1d1d", 5:"#450a0a" };
const FDR_FG  = { 1:"#86efac", 2:"#86efac", 3:"#d6d3d1", 4:"#fca5a5", 5:"#fca5a5" };

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function resolveName(p) {
  return p?.name || p?.player || p?.web_name || p?.player_name || "?";
}

function shortName(full) {
  if (!full || full === "?") return "?";
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];
  return parts[parts.length - 1]; // surname only on pitch
}

function resolvePoints(p) {
  const v = p?.projected_points ?? p?.ep_next ?? p?.pts_gw_1;
  return v != null ? Number(v) : null;
}

function resolvePhoto(p) {
  if (p?.photo) return p.photo;
  if (p?.code)  return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${p.code}.png`;
  return null;
}

function buildRows(lineup, xi) {
  if (xi?.length) {
    const g = { GK:[], DEF:[], MID:[], FWD:[] };
    for (const p of xi) (g[p.position] = g[p.position] || []).push(p);
    return g;
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

function playerId(p) { return p?.player_id ?? p?.id; }

/* ── Pitch SVG lines ─────────────────────────────────────────────────────── */
const PitchLines = memo(function PitchLines() {
  return (
    <svg className="fpl-pitch-svg" viewBox="0 0 800 520" preserveAspectRatio="xMidYMid slice">
      <defs>
        <filter id="pitch-line-blur">
          <feGaussianBlur stdDeviation="0.4"/>
        </filter>
      </defs>
      <g stroke="rgba(255,255,255,0.13)" fill="none" strokeWidth="1.2" filter="url(#pitch-line-blur)">
        {/* Outer boundary */}
        <rect x="24" y="16" width="752" height="488" rx="4"/>
        {/* Halfway line */}
        <line x1="24" y1="260" x2="776" y2="260"/>
        {/* Centre circle */}
        <circle cx="400" cy="260" r="72"/>
        <circle cx="400" cy="260" r="3" fill="rgba(255,255,255,0.18)" stroke="none"/>
        {/* Left penalty area */}
        <rect x="24" y="170" width="110" height="180"/>
        {/* Right penalty area */}
        <rect x="666" y="170" width="110" height="180"/>
        {/* Left 6-yard box */}
        <rect x="24" y="208" width="42" height="104"/>
        {/* Right 6-yard box */}
        <rect x="734" y="208" width="42" height="104"/>
        {/* Left penalty spot */}
        <circle cx="95" cy="260" r="3" fill="rgba(255,255,255,0.16)" stroke="none"/>
        {/* Right penalty spot */}
        <circle cx="705" cy="260" r="3" fill="rgba(255,255,255,0.16)" stroke="none"/>
        {/* Left penalty arc */}
        <path d="M 110 216 A 72 72 0 0 1 110 304" strokeDasharray="none"/>
        {/* Right penalty arc */}
        <path d="M 690 216 A 72 72 0 0 0 690 304"/>
        {/* Corner arcs */}
        <path d="M 24 32 A 12 12 0 0 1 36 20"/>
        <path d="M 764 20 A 12 12 0 0 1 776 32"/>
        <path d="M 24 488 A 12 12 0 0 0 36 500"/>
        <path d="M 764 500 A 12 12 0 0 0 776 488"/>
      </g>
    </svg>
  );
});

/* ── Player photo with graceful fallback ────────────────────────────────── */
const PlayerPhoto = memo(function PlayerPhoto({ player, size = 48 }) {
  const [err, setErr] = useState(false);
  const url           = resolvePhoto(player);
  const meta          = POS_META[player.position] || POS_META.MID;

  if (!url || err) {
    return (
      <div className="fpl-chip-photo-fallback" style={{ color: meta.color }}>
        {(player.position || "?").slice(0, 2)}
      </div>
    );
  }
  return (
    <img
      className="fpl-chip-photo"
      src={url}
      alt=""
      onError={() => setErr(true)}
      loading="lazy"
      decoding="async"
    />
  );
});

/* ── Individual player chip ──────────────────────────────────────────────── */
const PlayerChip = memo(function PlayerChip({
  player, isCaptain, isVC, isHighlighted,
  onPlayerClick, onHover, onLeave, delay = 0, isBench = false,
}) {
  const meta   = POS_META[player.position] || POS_META.MID;
  const pts    = resolvePoints(player);
  const pid    = playerId(player);
  const name   = resolveName(player);

  const chipClass = isBench
    ? "fpl-bench-chip"
    : `fpl-chip${isHighlighted ? " highlighted" : ""}`;

  return (
    <div
      className={chipClass}
      style={{
        "--pos-color": meta.color,
        "--pos-glow":  meta.glow,
        animationDelay: `${delay}ms`,
      }}
      onClick={() => onPlayerClick?.(player)}
      onMouseEnter={(e) => onHover?.(pid, player, e)}
      onMouseLeave={() => onLeave?.()}
    >
      {/* C / VC badge */}
      {(isCaptain || isVC) && (
        <div className={`fpl-chip-cvc ${isCaptain ? "fpl-chip-cvc-c" : "fpl-chip-cvc-vc"}`}>
          {isCaptain ? "C" : "V"}
        </div>
      )}

      {/* Photo ring */}
      <div className="fpl-chip-photo-ring">
        <PlayerPhoto player={player}/>
      </div>

      {/* Name */}
      <div className="fpl-chip-name">{shortName(name)}</div>

      {/* Points */}
      {pts != null && (
        <div className="fpl-chip-pts">{pts.toFixed(1)}</div>
      )}
    </div>
  );
});

/* ── Skeleton row ────────────────────────────────────────────────────────── */
function SkeletonRow({ count }) {
  return (
    <div className="fpl-pitch-row">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="fpl-pitch-skel-chip" style={{ animationDelay: `${i * 80}ms` }}/>
      ))}
    </div>
  );
}

/* ── Tooltip ─────────────────────────────────────────────────────────────── */
const Tooltip = memo(function Tooltip({ player, pos }) {
  if (!player || !pos) return null;
  const meta  = POS_META[player.position] || POS_META.MID;
  const pts   = resolvePoints(player);
  const prob  = Math.round((player.appearance_prob || player.prob_appear || 0.92) * 100);
  const diff  = player.fixture_difficulty;

  return (
    <div
      className="fpl-pitch-tooltip"
      style={{
        left:  Math.min(pos.x + 14, window.innerWidth - 256),
        top:   Math.max(pos.y - 120, 8),
        borderColor: `${meta.color}33`,
      }}
    >
      <div className="fpl-tooltip-name">{resolveName(player)}</div>
      <div className="fpl-tooltip-team">{player.team} · {player.position}</div>

      <div className="fpl-tooltip-grid">
        <div className="fpl-tooltip-stat">
          <div className="fpl-tooltip-stat-label">Proj Pts</div>
          <div className="fpl-tooltip-stat-val" style={{ color: meta.color }}>
            {pts != null ? pts.toFixed(1) : "—"}
          </div>
        </div>
        <div className="fpl-tooltip-stat">
          <div className="fpl-tooltip-stat-label">Cost</div>
          <div className="fpl-tooltip-stat-val">£{player.cost}m</div>
        </div>
        <div className="fpl-tooltip-stat">
          <div className="fpl-tooltip-stat-label">Avail</div>
          <div className="fpl-tooltip-stat-val" style={{
            color: prob >= 90 ? "#22c55e" : prob >= 70 ? "#f59e0b" : "#ef4444"
          }}>
            {prob}%
          </div>
        </div>
        <div className="fpl-tooltip-stat">
          <div className="fpl-tooltip-stat-label">Own%</div>
          <div className="fpl-tooltip-stat-val">
            {player.selected_by_pct != null ? `${Number(player.selected_by_pct).toFixed(1)}%` : "—"}
          </div>
        </div>
      </div>

      {player.next_opp && (
        <div className="fpl-tooltip-fixture">
          <span>Next:</span>
          <span className="fpl-tooltip-fixture-opp">{player.next_opp}</span>
          {diff && (
            <span style={{
              marginLeft: "auto",
              background: FDR_BG[diff] || FDR_BG[3],
              color:      FDR_FG[diff] || FDR_FG[3],
              padding:    "1px 6px", borderRadius: 4,
              fontSize:   9, fontWeight: 700,
              fontFamily: "'DM Mono', monospace",
            }}>
              FDR {diff}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   FplPitch — main export
   ══════════════════════════════════════════════════════════════════════════ */
export default function FplPitch({
  lineup        = null,
  xi            = null,
  bench         = [],
  captain       = null,
  vc            = null,
  highlightedId = null,
  onPlayerClick = null,
  loading       = false,
}) {
  const [tooltip, setTooltip] = useState(null); // { player, x, y }

  const capId = playerId(captain);
  const vcId  = playerId(vc);

  /* Build row groups from whatever shape we receive */
  const rows = useMemo(() => buildRows(lineup, xi), [lineup, xi]);

  /* Stagger delays per position row */
  const rowDelays = { GK: 0, DEF: 80, MID: 160, FWD: 240 };

  const handleHover = useCallback((pid, player, e) => {
    if (!e) return;
    setTooltip({ player, x: e.clientX, y: e.clientY });
  }, []);

  const handleLeave = useCallback(() => setTooltip(null), []);

  /* Close tooltip on scroll */
  useEffect(() => {
    const fn = () => setTooltip(null);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const totalPlayers = Object.values(rows).flat().length;

  return (
    <div>
      {/* ── Pitch ───────────────────────────────────────────────────────── */}
      <div className="fpl-pitch-outer">
        {/* Grass texture */}
        <div className="fpl-pitch-grass"/>
        {/* Stadium lighting orbs */}
        <div className="fpl-pitch-light fpl-pitch-light-tl"/>
        <div className="fpl-pitch-light fpl-pitch-light-tr"/>
        <div className="fpl-pitch-light fpl-pitch-light-c"/>
        {/* SVG lines */}
        <PitchLines/>
        {/* Players layer */}
        <div className="fpl-pitch-players">
          {loading ? (
            <>
              <SkeletonRow count={1}/>
              <SkeletonRow count={4}/>
              <SkeletonRow count={4}/>
              <SkeletonRow count={3}/>
            </>
          ) : totalPlayers === 0 ? (
            <div style={{
              textAlign: "center", padding: "60px 20px",
              color: "#334155", fontSize: 13,
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}>
              No lineup data available.
            </div>
          ) : (
            POS_ORDER.map(pos => {
              const rowPlayers = rows[pos];
              if (!rowPlayers?.length) return null;
              const baseDelay = rowDelays[pos] ?? 0;
              return (
                <div key={pos} className="fpl-pitch-row">
                  {rowPlayers.map((p, i) => {
                    const pid = playerId(p);
                    return (
                      <PlayerChip
                        key={pid ?? `${pos}-${i}`}
                        player={p}
                        isCaptain={capId != null && capId === pid}
                        isVC={vcId != null && vcId === pid}
                        isHighlighted={highlightedId != null && highlightedId === pid}
                        onPlayerClick={onPlayerClick}
                        onHover={handleHover}
                        onLeave={handleLeave}
                        delay={baseDelay + i * 40}
                      />
                    );
                  })}
                </div>
              );
            })
          )}
        </div>


      </div>

      {/* ── Bench tray ──────────────────────────────────────────────────── */}
      {bench.length > 0 && (
        <div className="fpl-bench-tray">
          <div className="fpl-bench-divider"/>
          <div className="fpl-bench-label">Bench</div>
          <div className="fpl-bench-grid">
            {bench.map((p, i) => {
              if (!p) return null;
              const pid      = playerId(p);
              const slotLabels = ["GK", "B1", "B2", "B3"];
              return (
                <div key={pid ?? i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <div className="fpl-bench-slot-label">{slotLabels[i] ?? `B${i}`}</div>
                  <PlayerChip
                    player={p}
                    isCaptain={capId != null && capId === pid}
                    isVC={vcId != null && vcId === pid}
                    isHighlighted={highlightedId != null && highlightedId === pid}
                    onPlayerClick={onPlayerClick}
                    onHover={handleHover}
                    onLeave={handleLeave}
                    delay={i * 60}
                    isBench
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tooltip (portal-like fixed position) ────────────────────────── */}
      {tooltip && <Tooltip player={tooltip.player} pos={{ x: tooltip.x, y: tooltip.y }}/>}
    </div>
  );
}