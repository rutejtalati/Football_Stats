// components/LiveTicker.jsx
import { useState } from "react";
import { useLiveTicker } from "../hooks/useLiveTicker";

const CATEGORIES = {
  live_score: { tag: "LIVE",     color: "#ff4444", bg: "rgba(255,68,68,0.10)",  border: "rgba(255,68,68,0.20)"  },
  upcoming:   { tag: "UPCOMING", color: "#60a5fa", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.18)" },
  model_edge: { tag: "MODEL",    color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.18)" },
  title_race: { tag: "TABLE",    color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.18)" },
  news:       { tag: "NEW",      color: "#f472b6", bg: "rgba(244,114,182,0.08)",border: "rgba(244,114,182,0.18)"},
  fpl:        { tag: "FPL",      color: "#a3e635", bg: "rgba(163,230,53,0.08)", border: "rgba(163,230,53,0.18)" },
  default:    { tag: "INFO",     color: "#94a3b8", bg: "rgba(148,163,184,0.06)",border: "rgba(148,163,184,0.14)"},
};

function PulseDot({ color }) {
  return (
    <span style={{
      width: 5, height: 5, borderRadius: "50%",
      background: color,
      boxShadow: `0 0 6px ${color}`,
      display: "inline-block",
      flexShrink: 0,
      animation: "tkDot 1.8s ease-in-out infinite",
    }} />
  );
}

function Chip({ chip }) {
  const cfg = CATEGORIES[chip.type] || CATEGORIES.default;
  const [hovered, setHovered] = useState(false);

  // Parse label and detail into structured parts
  const isLive = chip.type === "live_score";

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0,
        height: 24,
        borderRadius: 6,
        background: hovered ? cfg.bg.replace(/[\d.]+\)$/, m => `${Math.min(parseFloat(m) * 2.5, 1)})`) : cfg.bg,
        border: `1px solid ${hovered ? cfg.color.replace(")", ", 0.45)").replace("rgb", "rgba") : cfg.border}`,
        flexShrink: 0,
        overflow: "hidden",
        transition: "background 0.18s, border-color 0.18s, box-shadow 0.18s",
        boxShadow: hovered ? `0 0 12px ${cfg.bg}` : "none",
        cursor: "default",
      }}
    >
      {/* Category tag */}
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "0 7px",
        height: "100%",
        background: `${cfg.color}18`,
        borderRight: `1px solid ${cfg.border}`,
        fontSize: 7.5,
        fontWeight: 900,
        letterSpacing: "0.1em",
        color: cfg.color,
        textTransform: "uppercase",
        fontFamily: "'Inter', sans-serif",
        flexShrink: 0,
      }}>
        {isLive && <PulseDot color={cfg.color} />}
        {cfg.tag}
      </span>

      {/* Logos */}
      {(chip.home_logo || chip.away_logo) && (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 2,
          padding: "0 5px 0 6px",
          flexShrink: 0,
        }}>
          {chip.home_logo && (
            <img src={chip.home_logo} alt="" width={12} height={12}
              style={{ objectFit: "contain" }}
              onError={e => e.currentTarget.style.display = "none"}
            />
          )}
          {chip.away_logo && (
            <img src={chip.away_logo} alt="" width={12} height={12}
              style={{ objectFit: "contain" }}
              onError={e => e.currentTarget.style.display = "none"}
            />
          )}
        </span>
      )}

      {/* Main label — emphasized */}
      <span style={{
        padding: chip.home_logo || chip.away_logo ? "0 4px 0 0" : "0 6px",
        fontSize: 11,
        fontWeight: 700,
        color: hovered ? "#fff" : "#cbd5e1",
        whiteSpace: "nowrap",
        letterSpacing: "-0.01em",
        fontFamily: "'Inter', sans-serif",
        transition: "color 0.18s",
      }}>
        {chip.label}
      </span>

      {/* Trailing meta — muted */}
      {chip.detail && (
        <span style={{
          padding: "0 8px 0 0",
          fontSize: 9.5,
          fontWeight: 600,
          color: hovered ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)",
          whiteSpace: "nowrap",
          fontFamily: "'JetBrains Mono', monospace",
          transition: "color 0.18s",
          letterSpacing: "0.02em",
        }}>
          {chip.detail}
        </span>
      )}
    </span>
  );
}

function Divider() {
  return (
    <span style={{
      width: 1,
      height: 14,
      background: "rgba(255,255,255,0.08)",
      flexShrink: 0,
      display: "inline-block",
    }} />
  );
}

export default function LiveTicker() {
  const { chips, isLive, loading } = useLiveTicker(75_000);
  const [paused, setPaused] = useState(false);

  const shell = {
    position: "fixed",
    top: 48,
    left: 0,
    right: 0,
    height: 36,
    zIndex: 199,
    background: "rgba(5,7,12,0.97)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
  };

  if (loading || chips.length === 0) {
    return <div className="sn-live-ticker" style={shell} />;
  }

  const all = [...chips, ...chips, ...chips];
  const duration = Math.max(chips.length * 9, 45);

  return (
    <>
      <style>{`
        @keyframes tkScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
        @keyframes tkDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.3; transform: scale(0.7); }
        }
        .tk-track {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          white-space: nowrap;
          animation: tkScroll ${duration}s linear infinite;
          will-change: transform;
        }
        .tk-track.tk-paused {
          animation-play-state: paused;
        }
      `}</style>

      <div
        className="sn-live-ticker"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        style={shell}
      >
        {/* Left label */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 12px",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          height: "100%",
          flexShrink: 0,
        }}>
          {isLive ? (
            <>
              <PulseDot color="#ff4444" />
              <span style={{
                fontSize: 8, fontWeight: 900, letterSpacing: "0.14em",
                color: "#ff4444", fontFamily: "'Inter', sans-serif",
                textTransform: "uppercase",
              }}>Live</span>
            </>
          ) : (
            <span style={{
              fontSize: 8, fontWeight: 900, letterSpacing: "0.14em",
              color: "rgba(255,255,255,0.18)", fontFamily: "'Inter', sans-serif",
              textTransform: "uppercase",
            }}>Intel</span>
          )}
        </div>

        {/* Left fade */}
        <div style={{
          position: "absolute", left: 76, top: 0, bottom: 0, width: 24,
          background: "linear-gradient(to right, rgba(5,7,12,0.97), transparent)",
          zIndex: 2, pointerEvents: "none",
        }} />

        {/* Scrolling track */}
        <div style={{ flex: 1, overflow: "hidden", paddingLeft: 8 }}>
          <div className={`tk-track${paused ? " tk-paused" : ""}`}>
            {all.map((chip, i) => (
              <span
                key={i}
                style={{ display: "inline-flex", alignItems: "center", gap: 10, flexShrink: 0 }}
              >
                <Chip chip={chip} />
                {i < all.length - 1 && <Divider />}
              </span>
            ))}
          </div>
        </div>

        {/* Right fade */}
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 48,
          background: "linear-gradient(to left, rgba(5,7,12,0.97), transparent)",
          zIndex: 2, pointerEvents: "none",
        }} />
      </div>
    </>
  );
}