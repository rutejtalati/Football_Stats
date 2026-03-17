// components/FplPitch.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Stadium pitch renderer — matches screenshot exactly.
// Uses lineup = { gk, defenders[], midfielders[], forwards[] }
//
// Player fields needed: player_id|id, name|player|web_name, team, position,
//   projected_points|pts_gw_1, cost, next_opp, fixture_difficulty,
//   code (for shirt CDN URL), appearance_prob|prob_appear,
//   selected_by_pct, form
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, useMemo, memo } from "react";
import "./pitch.css";

/* ── Position colours ────────────────────────────────────────────────────── */
const POS_META = {
  GK:  { color: "#f59e0b", glow: "rgba(245,158,11,0.40)" },
  DEF: { color: "#3b82f6", glow: "rgba(59,130,246,0.40)" },
  MID: { color: "#22c55e", glow: "rgba(34,197,94,0.40)"  },
  FWD: { color: "#ef4444", glow: "rgba(239,68,68,0.40)"  },
};

const DIFF_CFG = {
  1: { bg:"#14532d", fg:"#86efac" },
  2: { bg:"#14532d", fg:"#86efac" },
  3: { bg:"#3d3a2e", fg:"#d4c97a" },
  4: { bg:"#7f1d1d", fg:"#fca5a5" },
  5: { bg:"#450a0a", fg:"#fca5a5" },
};

const SHIRT_IDS = {
  ARS:3,AVL:7,BOU:91,BRE:94,BHA:36,CHE:8,CRY:31,EVE:11,FUL:54,IPS:40,
  LEI:13,LIV:14,MCI:43,MUN:1,NEW:4,NFO:17,SOU:20,TOT:6,WHU:21,WOL:39,
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function pid(p) { return p?.player_id ?? p?.id; }

function resolveName(p) {
  return p?.name || p?.player || p?.web_name || p?.player_name || "—";
}

function shortSurname(full) {
  if (!full || full === "—") return "—";
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return parts.length === 1 ? parts[0] : parts[parts.length - 1];
}

function resolvePoints(p) {
  const v = p?.projected_points ?? p?.ep_next ?? p?.pts_gw_1;
  return v != null ? Number(v) : null;
}

function shirtUrl(p) {
  // Prefer code-based face photo, fall back to shirt
  if (p?.code) {
    return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${p.code}.png`;
  }
  const id = SHIRT_IDS[p?.team];
  const isGK = p?.position === "GK";
  if (id) {
    return `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${id}${isGK ? "_1" : ""}-66.png`;
  }
  return null;
}

/* ── Arc meter (projected points dial) ──────────────────────────────────── */
const ArcMeter = memo(function ArcMeter({ pts, color }) {
  const MAX = 12, R = 18, SW = 3, cx = 21, cy = 21, W = 42;
  const spanDeg = 220, startDeg = 160;
  const fill = Math.min((pts || 0) / MAX, 1) * spanDeg;
  const toRad = d => (d * Math.PI) / 180;
  const arc = (sd, sw) => {
    const s = { x: cx + R * Math.cos(toRad(sd)), y: cy + R * Math.sin(toRad(sd)) };
    const e = { x: cx + R * Math.cos(toRad(sd + sw)), y: cy + R * Math.sin(toRad(sd + sw)) };
    return `M${s.x.toFixed(2)} ${s.y.toFixed(2)}A${R} ${R} 0 ${sw > 180 ? 1 : 0} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  };
  return (
    <svg width={W} height={W * 0.65} viewBox={`0 0 ${W} ${W * 0.65}`} style={{ display:"block", overflow:"visible" }}>
      <path d={arc(startDeg, spanDeg)} fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth={SW} strokeLinecap="round"/>
      {fill > 2 && (
        <path d={arc(startDeg, fill)} fill="none"
          stroke={color} strokeWidth={SW} strokeLinecap="round"
          style={{ filter:`drop-shadow(0 0 4px ${color})` }}/>
      )}
      <text x={cx} y={cy * 0.72} textAnchor="middle" dominantBaseline="middle"
        fontSize="9" fontWeight="800" fill={color} fontFamily="DM Mono, monospace">
        {pts != null ? pts.toFixed(1) : "—"}
      </text>
    </svg>
  );
});

/* ── Pitch player card (matches screenshot style) ────────────────────────── */
const PitchCard = memo(function PitchCard({
  player, isCaptain, isVC, isHighlighted,
  onPlayerClick, onHover, onLeave, delay,
}) {
  const [imgErr, setImgErr] = useState(false);
  const [hov,    setHov]    = useState(false);

  const meta  = POS_META[player.position] || POS_META.MID;
  const pts   = resolvePoints(player);
  const diff  = player.fixture_difficulty;
  const dc    = DIFF_CFG[diff] || DIFF_CFG[3];
  const url   = shirtUrl(player);
  const name  = resolveName(player);
  const prob  = Math.round((player.appearance_prob || player.prob_appear || 0.92) * 100);
  const active = hov || isHighlighted;

  return (
    <div
      className={`fpl-pcard${active ? " fpl-pcard-hov" : ""}${isCaptain ? " fpl-pcard-captain" : ""}`}
      style={{
        "--pos-color": meta.color,
        "--pos-glow":  meta.glow,
        animationDelay: `${delay ?? 0}ms`,
        borderColor: active ? meta.color + "66" : undefined,
        boxShadow: active
          ? `0 0 0 1px ${meta.color}44, 0 12px 32px rgba(0,0,0,0.7), 0 0 18px ${meta.glow}`
          : undefined,
      }}
      onClick={() => onPlayerClick?.(player)}
      onMouseEnter={(e) => { setHov(true); onHover?.(pid(player), player, e); }}
      onMouseLeave={() => { setHov(false); onLeave?.(); }}
    >
      {/* Captain / VC badge */}
      {(isCaptain || isVC) && (
        <div className={`fpl-pcard-cvc ${isCaptain ? "fpl-pcard-cvc-c" : "fpl-pcard-cvc-vc"}`}>
          {isCaptain ? "C" : "V"}
        </div>
      )}

      {/* Shirt / face image */}
      <div className="fpl-pcard-img-wrap">
        {url && !imgErr ? (
          <img
            src={url} alt=""
            className="fpl-pcard-img"
            onError={() => setImgErr(true)}
            loading="lazy"
          />
        ) : (
          <div className="fpl-pcard-img-fallback" style={{ color: meta.color }}>
            {(player.position || "?").slice(0, 2)}
          </div>
        )}
      </div>

      {/* Name + team/fixture chip */}
      <div className="fpl-pcard-name">{shortSurname(name)}</div>
      <div className="fpl-pcard-chip" style={{ background: dc.bg, color: dc.fg }}>
        <span className="fpl-pcard-team">{player.team ?? "?"}</span>
        {player.next_opp && (
          <span className="fpl-pcard-fix">{player.next_opp}</span>
        )}
      </div>

      {/* Arc meter */}
      <ArcMeter pts={pts} color={meta.color}/>
    </div>
  );
});

/* ── Pitch SVG lines ─────────────────────────────────────────────────────── */
const PitchLines = memo(function PitchLines() {
  return (
    <svg className="fpl-pitch-svg" viewBox="0 0 900 560" preserveAspectRatio="xMidYMid slice">
      <g stroke="rgba(255,255,255,0.18)" fill="none" strokeWidth="1.5">
        <rect x="20" y="14" width="860" height="532" rx="3"/>
        <line x1="20" y1="280" x2="880" y2="280"/>
        <circle cx="450" cy="280" r="78"/>
        <circle cx="450" cy="280" r="4" fill="rgba(255,255,255,0.25)" stroke="none"/>
        {/* Left penalty area */}
        <rect x="20" y="183" width="116" height="194"/>
        {/* Right penalty area */}
        <rect x="764" y="183" width="116" height="194"/>
        {/* Left 6-yard */}
        <rect x="20" y="220" width="44" height="120"/>
        {/* Right 6-yard */}
        <rect x="836" y="220" width="44" height="120"/>
        {/* Spots */}
        <circle cx="100" cy="280" r="3" fill="rgba(255,255,255,0.2)" stroke="none"/>
        <circle cx="800" cy="280" r="3" fill="rgba(255,255,255,0.2)" stroke="none"/>
        {/* Penalty arcs */}
        <path d="M136 228 A78 78 0 0 1 136 332"/>
        <path d="M764 228 A78 78 0 0 0 764 332"/>
        {/* Corner arcs */}
        <path d="M20 28 A14 14 0 0 1 34 14"/>
        <path d="M866 14 A14 14 0 0 1 880 28"/>
        <path d="M20 532 A14 14 0 0 0 34 546"/>
        <path d="M866 546 A14 14 0 0 0 880 532"/>
      </g>
    </svg>
  );
});

/* ── Skeleton row ────────────────────────────────────────────────────────── */
function SkeletonRow({ count }) {
  return (
    <div className="fpl-pitch-row">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="fpl-pitch-skel-chip" style={{ animationDelay: `${i * 90}ms` }}/>
      ))}
    </div>
  );
}

/* ── Tooltip ─────────────────────────────────────────────────────────────── */
const Tooltip = memo(function Tooltip({ player, pos }) {
  if (!player || !pos) return null;
  const meta = POS_META[player.position] || POS_META.MID;
  const pts  = resolvePoints(player);
  const prob = Math.round((player.appearance_prob || player.prob_appear || 0.92) * 100);
  const diff = player.fixture_difficulty;
  const dc   = DIFF_CFG[diff] || DIFF_CFG[3];
  const x    = Math.min(pos.x + 16, window.innerWidth - 260);
  const y    = Math.max(pos.y - 130, 8);

  return (
    <div className="fpl-pitch-tooltip" style={{ left: x, top: y, borderColor: `${meta.color}44` }}>
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
          <div className="fpl-tooltip-stat-val">£{player.cost ?? "?"}m</div>
        </div>
        <div className="fpl-tooltip-stat">
          <div className="fpl-tooltip-stat-label">Avail</div>
          <div className="fpl-tooltip-stat-val" style={{
            color: prob >= 90 ? "#22c55e" : prob >= 70 ? "#f59e0b" : "#ef4444"
          }}>{prob}%</div>
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
              marginLeft:"auto", background: dc.bg, color: dc.fg,
              padding:"1px 7px", borderRadius:4,
              fontSize:9, fontWeight:700, fontFamily:"'DM Mono',monospace",
            }}>FDR {diff}</span>
          )}
        </div>
      )}
    </div>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   FplPitch — main export
   Accepts: lineup = { gk, defenders[], midfielders[], forwards[] }
   ══════════════════════════════════════════════════════════════════════════ */
export default function FplPitch({
  lineup        = null,
  bench         = [],
  captain       = null,
  vc            = null,
  highlightedId = null,
  onPlayerClick = null,
  loading       = false,
}) {
  const [tooltip, setTooltip] = useState(null);

  /* Guard: nothing to render */
  if (!loading && (!lineup || !lineup.gk)) {
    return (
      <div style={{
        height:400, display:"flex", alignItems:"center", justifyContent:"center",
        color:"#334155", fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif",
        background:"rgba(10,20,36,0.6)", borderRadius:20,
      }}>
        Loading pitch…
      </div>
    );
  }

  const capId = pid(captain);
  const vcId  = pid(vc);

  const handleHover = useCallback((id, player, e) => {
    if (e) setTooltip({ player, x: e.clientX, y: e.clientY });
  }, []);
  const handleLeave = useCallback(() => setTooltip(null), []);

  useEffect(() => {
    const fn = () => setTooltip(null);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  /* Row definitions — GK at bottom (visually), FWD at top */
  const rows = loading ? [] : [
    { pos:"FWD", players: lineup?.forwards    || [], baseDelay:  0 },
    { pos:"MID", players: lineup?.midfielders || [], baseDelay: 80 },
    { pos:"DEF", players: lineup?.defenders   || [], baseDelay:160 },
    { pos:"GK",  players: lineup?.gk ? [lineup.gk] : [], baseDelay:240 },
  ];

  return (
    <div>
      {/* ── Pitch ───────────────────────────────────────────────────────── */}
      <div className="fpl-pitch-outer">
        {/* Grass stripes */}
        <div className="fpl-pitch-grass"/>
        {/* Stadium lighting */}
        <div className="fpl-pitch-light fpl-pitch-light-tl"/>
        <div className="fpl-pitch-light fpl-pitch-light-tr"/>
        <div className="fpl-pitch-light fpl-pitch-light-c"/>
        {/* Pitch SVG lines */}
        <PitchLines/>

        {/* Players */}
        <div className="fpl-pitch-players">
          {loading ? (
            <>
              <SkeletonRow count={3}/>
              <SkeletonRow count={4}/>
              <SkeletonRow count={4}/>
              <SkeletonRow count={1}/>
            </>
          ) : (
            rows.map(({ pos, players, baseDelay }) => {
              if (!players.length) return null;
              return (
                <div key={pos} className="fpl-pitch-row">
                  {players.map((p, i) => {
                    const id = pid(p);
                    return (
                      <PitchCard
                        key={id ?? `${pos}-${i}`}
                        player={p}
                        isCaptain={capId != null && capId === id}
                        isVC={vcId != null && vcId === id}
                        isHighlighted={highlightedId != null && highlightedId === id}
                        onPlayerClick={onPlayerClick}
                        onHover={handleHover}
                        onLeave={handleLeave}
                        delay={baseDelay + i * 45}
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
      {!loading && bench.length > 0 && (
        <div className="fpl-bench-tray">
          <div className="fpl-bench-divider"/>
          <div className="fpl-bench-label">Bench</div>
          <div className="fpl-bench-grid">
            {bench.map((p, i) => {
              if (!p) return null;
              const id = pid(p);
              const slotLabels = ["GK", "B1", "B2", "B3"];
              return (
                <div key={id ?? i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <div className="fpl-bench-slot-label">{slotLabels[i] ?? `B${i}`}</div>
                  <div className="fpl-bench-chip">
                    <PitchCard
                      player={p}
                      isCaptain={capId != null && capId === id}
                      isVC={vcId != null && vcId === id}
                      isHighlighted={highlightedId != null && highlightedId === id}
                      onPlayerClick={onPlayerClick}
                      onHover={handleHover}
                      onLeave={handleLeave}
                      delay={i * 60}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tooltip ─────────────────────────────────────────────────────── */}
      {tooltip && <Tooltip player={tooltip.player} pos={{ x: tooltip.x, y: tooltip.y }}/>}
    </div>
  );
}
// verify: lineup prop used, no xi or players prop