// components/LiveTicker.jsx
// Site-wide horizontal intelligence bar.
// Live mode: scrolling match scores with glow.
// Quiet mode: upcoming fixtures, model edge, title race.

import { useRef, useState } from "react";
import { useLiveTicker } from "../hooks/useLiveTicker";

// ── Chip type configs ──────────────────────────
const CHIP_CONFIG = {
  live_score: { dot: "#ff3b3b", dotGlow: "rgba(255,59,59,0.6)",  label: "LIVE"     },
  model_edge: { dot: "#00c896", dotGlow: "rgba(0,200,150,0.5)",  label: "MODEL"    },
  upcoming:   { dot: "#3d8ce8", dotGlow: "rgba(61,140,232,0.4)", label: "UPCOMING" },
  title_race: { dot: "#fbbf24", dotGlow: "rgba(251,191,36,0.4)", label: "TABLE"    },
  default:    { dot: "#666",    dotGlow: "transparent",           label: "INFO"     },
};

function LiveDot({ color, glow }) {
  return (
    <span style={{
      display: "inline-block",
      width: 6, height: 6,
      borderRadius: "50%",
      background: color,
      boxShadow: `0 0 6px 2px ${glow}`,
      flexShrink: 0,
      animation: "tickerPulse 1.8s ease-in-out infinite",
    }} />
  );
}

function TeamLogos({ homeLogo, awayLogo }) {
  if (!homeLogo && !awayLogo) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, marginRight: 4 }}>
      {homeLogo && (
        <img src={homeLogo} alt="" style={{ width: 14, height: 14, objectFit: "contain" }}
          onError={e => { e.currentTarget.style.display = "none"; }} />
      )}
      {awayLogo && (
        <img src={awayLogo} alt="" style={{ width: 14, height: 14, objectFit: "contain" }}
          onError={e => { e.currentTarget.style.display = "none"; }} />
      )}
    </span>
  );
}

function Chip({ chip }) {
  const cfg = CHIP_CONFIG[chip.type] || CHIP_CONFIG.default;
  const isLive = chip.type === "live_score";

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px 3px 8px",
      borderRadius: 20,
      background: isLive
        ? "rgba(255,59,59,0.08)"
        : chip.glow
          ? "rgba(0,200,150,0.06)"
          : "rgba(255,255,255,0.04)",
      border: isLive
        ? "1px solid rgba(255,59,59,0.2)"
        : chip.glow
          ? "1px solid rgba(0,200,150,0.15)"
          : "1px solid rgba(255,255,255,0.07)",
      whiteSpace: "nowrap",
      cursor: "default",
      transition: "background 0.2s",
      flexShrink: 0,
    }}>
      {/* Type badge */}
      <span style={{
        fontSize: 8, fontWeight: 800, letterSpacing: "0.1em",
        color: cfg.dot, textTransform: "uppercase",
        display: "flex", alignItems: "center", gap: 4,
      }}>
        {isLive && <LiveDot color={cfg.dot} glow={cfg.dotGlow} />}
        {cfg.label}
      </span>

      {/* Logos */}
      <TeamLogos homeLogo={chip.home_logo} awayLogo={chip.away_logo} />

      {/* Main label */}
      <span style={{ fontSize: 12, fontWeight: 600, color: "#d8e0e8" }}>
        {chip.label}
      </span>

      {/* Detail */}
      {chip.detail && (
        <span style={{ fontSize: 11, color: "#555", marginLeft: 2 }}>
          {chip.detail}
        </span>
      )}

      {/* Live score extra: red cards */}
      {isLive && chip.reds_home > 0 && (
        <span style={{ fontSize: 10, color: "#ff3b3b", fontWeight: 700 }}>
          {"R".repeat(chip.reds_home)}
        </span>
      )}
      {isLive && chip.reds_away > 0 && (
        <span style={{ fontSize: 10, color: "#ff3b3b", fontWeight: 700 }}>
          {"R".repeat(chip.reds_away)}
        </span>
      )}
    </span>
  );
}

function Separator() {
  return (
    <span style={{
      width: 3, height: 3, borderRadius: "50%",
      background: "rgba(255,255,255,0.12)",
      display: "inline-block", flexShrink: 0,
    }} />
  );
}

export default function LiveTicker() {
  const { chips, isLive, loading } = useLiveTicker(75_000);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef(null);

  // Loading placeholder — fixed, flush under navbar
  if (loading && chips.length === 0) return (
    <div style={{
      position: "fixed",
      top: 49,
      left: 0,
      right: 0,
      height: 34,
      background: "rgba(10,10,15,0.85)",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      zIndex: 150,
    }} />
  );

  if (chips.length === 0) return null;

  // Duplicate chips for seamless loop
  const allChips = [...chips, ...chips, ...chips];
  const animDuration = Math.max(chips.length * 6, 30);

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes tickerPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.85); }
        }
        .ticker-track {
          display: flex;
          gap: 16px;
          align-items: center;
          animation: tickerScroll ${animDuration}s linear infinite;
          width: max-content;
        }
        .ticker-track.paused {
          animation-play-state: paused;
        }
      `}</style>

      {/* ── Fixed ticker bar — sits flush below navbar ── */}
      <div
        style={{
          position: "fixed",
          top: 48,
          left: 0,
          right: 0,
          height: 34,
          background: "rgba(8,8,12,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          overflow: "hidden",
          zIndex: 150,
          display: "flex",
          alignItems: "center",
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Left fade */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 48, zIndex: 2,
          background: "linear-gradient(to right, rgba(8,8,12,0.95), transparent)",
          pointerEvents: "none",
        }} />

        {/* Live mode indicator */}
        {isLive && (
          <div style={{
            position: "absolute", left: 12, zIndex: 3,
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 9, fontWeight: 800, color: "#ff3b3b",
            letterSpacing: "0.12em", textTransform: "uppercase",
          }}>
            <LiveDot color="#ff3b3b" glow="rgba(255,59,59,0.6)" />
            LIVE
          </div>
        )}

        {/* Scrolling track */}
        <div style={{ overflow: "hidden", width: "100%", paddingLeft: isLive ? 52 : 16 }}>
          <div
            ref={trackRef}
            className={`ticker-track${paused ? " paused" : ""}`}
          >
            {allChips.map((chip, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                <Chip chip={chip} />
                {i < allChips.length - 1 && <Separator />}
              </span>
            ))}
          </div>
        </div>

        {/* Right fade */}
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 48, zIndex: 2,
          background: "linear-gradient(to left, rgba(8,8,12,0.95), transparent)",
          pointerEvents: "none",
        }} />
      </div>
    </>
  );
}