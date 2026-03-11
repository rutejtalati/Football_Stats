// components/LiveTicker.jsx
import { useState } from "react";
import { useLiveTicker } from "../hooks/useLiveTicker";

const CHIP_CONFIG = {
  live_score: { color: "#ff4444", bg: "rgba(255,68,68,0.10)",  border: "rgba(255,68,68,0.22)",  label: "LIVE"     },
  model_edge: { color: "#00e5a0", bg: "rgba(0,229,160,0.08)",  border: "rgba(0,229,160,0.18)",  label: "MODEL"    },
  upcoming:   { color: "#60a5fa", bg: "rgba(96,165,250,0.07)", border: "rgba(96,165,250,0.16)", label: "UPCOMING" },
  title_race: { color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.18)", label: "TABLE"    },
  default:    { color: "#475569", bg: "rgba(71,85,105,0.06)",  border: "rgba(71,85,105,0.12)",  label: "INFO"     },
};

function PulseDot({ color }) {
  return (
    <span style={{
      width: 5, height: 5, borderRadius: "50%",
      background: color, boxShadow: `0 0 5px ${color}`,
      display: "inline-block", flexShrink: 0,
      animation: "tkPulse 2s ease-in-out infinite",
    }} />
  );
}

function Logos({ home, away }) {
  if (!home && !away) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
      {home && <img src={home} alt="" width={13} height={13} style={{ objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />}
      {away && <img src={away} alt="" width={13} height={13} style={{ objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />}
    </span>
  );
}

function Chip({ chip }) {
  const cfg = CHIP_CONFIG[chip.type] || CHIP_CONFIG.default;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      height: 24, padding: "0 10px 0 8px", borderRadius: 999,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      flexShrink: 0, userSelect: "none",
    }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 8, fontWeight: 900, letterSpacing: "0.12em",
        color: cfg.color, textTransform: "uppercase",
        fontFamily: "Inter, sans-serif",
      }}>
        {chip.type === "live_score" && <PulseDot color={cfg.color} />}
        {cfg.label}
      </span>
      <Logos home={chip.home_logo} away={chip.away_logo} />
      <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", fontFamily: "Inter, sans-serif", whiteSpace: "nowrap" }}>
        {chip.label}
      </span>
      {chip.detail && (
        <span style={{ fontSize: 10, color: "#1e3a5f", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, whiteSpace: "nowrap" }}>
          {chip.detail}
        </span>
      )}
    </span>
  );
}

export default function LiveTicker() {
  const { chips, isLive, loading } = useLiveTicker(75_000);
  const [paused, setPaused] = useState(false);

  if (loading || chips.length === 0) {
    return (
      <div
        className="sn-live-ticker"
        style={{
          position: "fixed",
          top: 48,
          left: 0,
          right: 0,
          height: 38,
          zIndex: 199,
          background: "rgba(4,6,12,0.97)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      />
    );
  }

  const all      = [...chips, ...chips, ...chips];
  const duration = Math.max(chips.length * 8, 40);

  return (
    <>
      <style>{`
        @keyframes tkScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
        @keyframes tkPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%     { opacity:0.35; transform:scale(0.75); }
        }
        .tk-track {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          white-space: nowrap;
          animation: tkScroll ${duration}s linear infinite;
        }
        .tk-track.tk-paused { animation-play-state: paused; }
      `}</style>

      <div
        className="sn-live-ticker"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        style={{
          position: "fixed",
          top: 48,
          left: 0,
          right: 0,
          height: 38,
          zIndex: 199,
          background: "rgba(4,6,12,0.97)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "0 14px",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          height: "100%", flexShrink: 0,
        }}>
          {isLive
            ? <><PulseDot color="#ff4444" /><span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.14em", color: "#ff4444", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>Live</span></>
            : <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", color: "#1e3a5f", fontFamily: "Inter,sans-serif", textTransform: "uppercase" }}>Intel</span>
          }
        </div>

        <div style={{
          position: "absolute", left: 80, top: 0, bottom: 0, width: 28, zIndex: 1,
          background: "linear-gradient(to right, rgba(4,6,12,0.95), transparent)",
          pointerEvents: "none",
        }} />

        <div style={{ flex: 1, overflow: "hidden", paddingLeft: 12 }}>
          <div className={`tk-track${paused ? " tk-paused" : ""}`}>
            {all.map((chip, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                <Chip chip={chip} />
                <span style={{ width: 2, height: 2, borderRadius: "50%", background: "rgba(255,255,255,0.07)", display: "inline-block", flexShrink: 0 }} />
              </span>
            ))}
          </div>
        </div>

        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 40, zIndex: 1,
          background: "linear-gradient(to left, rgba(4,6,12,0.97), transparent)",
          pointerEvents: "none",
        }} />
      </div>
    </>
  );
}