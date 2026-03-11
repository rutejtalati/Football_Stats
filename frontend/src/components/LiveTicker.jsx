// components/LiveTicker.jsx
import { useRef, useState } from "react";
import { useLiveTicker } from "../hooks/useLiveTicker";

const CHIP_CONFIG = {
  live_score: { color: "#ff4444", bg: "rgba(255,68,68,0.10)",  border: "rgba(255,68,68,0.20)",  label: "LIVE"     },
  model_edge: { color: "#00e5a0", bg: "rgba(0,229,160,0.08)",  border: "rgba(0,229,160,0.18)",  label: "MODEL"    },
  upcoming:   { color: "#60a5fa", bg: "rgba(96,165,250,0.07)", border: "rgba(96,165,250,0.15)", label: "UPCOMING" },
  title_race: { color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.18)", label: "TABLE"    },
  default:    { color: "#6b7280", bg: "rgba(107,114,128,0.06)",border: "rgba(107,114,128,0.12)",label: "INFO"     },
};

function PulseDot({ color }) {
  return (
    <span style={{
      width: 5, height: 5, borderRadius: "50%",
      background: color,
      boxShadow: `0 0 6px ${color}`,
      display: "inline-block", flexShrink: 0,
      animation: "tkPulse 2s ease-in-out infinite",
    }} />
  );
}

function Logos({ home, away }) {
  if (!home && !away) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
      {home && <img src={home} alt="" style={{ width: 13, height: 13, objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />}
      {away && <img src={away} alt="" style={{ width: 13, height: 13, objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />}
    </span>
  );
}

function Chip({ chip }) {
  const cfg    = CHIP_CONFIG[chip.type] || CHIP_CONFIG.default;
  const isLive = chip.type === "live_score";

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      padding: "0 11px 0 9px",
      height: 26,
      borderRadius: 999,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      flexShrink: 0,
      whiteSpace: "nowrap",
    }}>
      {/* Badge */}
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 8, fontWeight: 900, letterSpacing: "0.12em",
        color: cfg.color, textTransform: "uppercase",
        fontFamily: "'Inter', sans-serif",
      }}>
        {isLive && <PulseDot color={cfg.color} />}
        {cfg.label}
      </span>

      {/* Logos */}
      <Logos home={chip.home_logo} away={chip.away_logo} />

      {/* Label */}
      <span style={{
        fontSize: 12, fontWeight: 600,
        color: "#cbd5e1",
        fontFamily: "'Inter', sans-serif",
        letterSpacing: "-0.01em",
      }}>{chip.label}</span>

      {/* Detail */}
      {chip.detail && (
        <span style={{
          fontSize: 10, color: "#334155",
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600,
        }}>{chip.detail}</span>
      )}
    </span>
  );
}

function Dot() {
  return (
    <span style={{
      width: 2, height: 2, borderRadius: "50%",
      background: "rgba(255,255,255,0.08)",
      flexShrink: 0, display: "inline-block",
    }} />
  );
}

export default function LiveTicker() {
  const { chips, isLive, loading } = useLiveTicker(75_000);
  const [paused, setPaused] = useState(false);

  const TICKER_TOP = 48;
  const TICKER_H   = 36;

  const shell = {
    position: "fixed",
    top: TICKER_TOP,
    left: 0,
    right: 0,
    height: TICKER_H,
    zIndex: 150,
    background: "rgba(5,8,14,0.96)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
  };

  if (loading && chips.length === 0) return <div style={shell} />;
  if (chips.length === 0)            return <div style={shell} />;

  const all      = [...chips, ...chips, ...chips];
  const duration = Math.max(chips.length * 7, 35);

  return (
    <>
      <style>{`
        @keyframes tkScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes tkPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.8); }
        }
        .tk-track {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          animation: tkScroll ${duration}s linear infinite;
          will-change: transform;
        }
        .tk-track.paused { animation-play-state: paused; }
      `}</style>

      <div
        style={shell}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Left label */}
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "0 14px 0 14px",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          height: "100%", flexShrink: 0,
        }}>
          {isLive
            ? <><PulseDot color="#ff4444" /><span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.14em", color: "#ff4444", fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>Live</span></>
            : <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.14em", color: "#334155", fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>Intelligence</span>
          }
        </div>

        {/* Fade left */}
        <div style={{
          position: "absolute", left: 90, top: 0, bottom: 0, width: 32, zIndex: 2,
          background: "linear-gradient(to right, rgba(5,8,14,0.95), transparent)",
          pointerEvents: "none",
        }} />

        {/* Scrolling track */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center", paddingLeft: 8 }}>
          <div className={`tk-track${paused ? " paused" : ""}`}>
            {all.map((chip, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                <Chip chip={chip} />
                {i < all.length - 1 && <Dot />}
              </span>
            ))}
          </div>
        </div>

        {/* Fade right */}
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 48, zIndex: 2,
          background: "linear-gradient(to left, rgba(5,8,14,0.95), transparent)",
          pointerEvents: "none",
        }} />
      </div>
    </>
  );
}