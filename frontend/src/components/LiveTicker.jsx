// components/LiveTicker.jsx
// Fixed below navbar at top:48, height:36.
// Combined offset = 84px → matches .sn-page-wrap padding-top in Navbar.jsx.
// Data from useLiveTicker hook (real match data from backend).

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveTicker } from "../hooks/useLiveTicker";

/* ── Category config ──────────────────────────────────────────────────────── */
const CATS = {
  live_score: { tag: "LIVE",     color: "#ff4444", bg: "rgba(255,56,56,0.14)"  },
  upcoming:   { tag: "SOON",     color: "#60a5fa", bg: "rgba(96,165,250,0.10)" },
  model_edge: { tag: "MODEL",    color: "#34d399", bg: "rgba(52,211,153,0.10)" },
  title_race: { tag: "TABLE",    color: "#fbbf24", bg: "rgba(251,191,36,0.10)" },
  news:       { tag: "NEWS",     color: "#f472b6", bg: "rgba(244,114,182,0.10)"},
  fpl:        { tag: "FPL",      color: "#a3e635", bg: "rgba(163,230,53,0.10)" },
  default:    { tag: "INFO",     color: "#94a3b8", bg: "rgba(148,163,184,0.07)"},
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function humanDate(str) {
  if (!str) return "";
  try {
    const d = new Date(str);
    if (isNaN(d)) return str;
    const diff = Math.round((d - Date.now()) / 86400000);
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    if (diff === 0)  return `Today ${time}`;
    if (diff === 1)  return `Tomorrow ${time}`;
    if (diff > 1 && diff < 7) return `${days[d.getDay()]} ${time}`;
    return d.toLocaleDateString("en-GB", { day:"numeric", month:"short" }) + ` ${time}`;
  } catch { return str; }
}

function getRoute(chip) {
  const leagueMap = {
    "Premier League":"/league/epl","La Liga":"/league/laliga",
    "Serie A":"/league/seriea","Ligue 1":"/league/ligue1",
  };
  switch (chip.type) {
    case "live_score": return "/live";
    case "upcoming":   return "/predictions/premier-league";
    case "title_race": {
      const l = chip.detail?.split(" · ")[1]?.trim();
      return leagueMap[l] || "/leagues";
    }
    case "news":       return "/news";
    case "fpl":        return "/best-team";
    default:           return "/";
  }
}

/* ── Pulsing live dot ─────────────────────────────────────────────────────── */
function PulseDot({ color }) {
  return (
    <span style={{
      width: 5, height: 5, borderRadius: "50%",
      background: color, boxShadow: `0 0 5px ${color}88`,
      display: "inline-block", flexShrink: 0,
      animation: "tkDot 1.6s ease-in-out infinite",
    }}/>
  );
}

/* ── Single chip ─────────────────────────────────────────────────────────── */
function Chip({ chip }) {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);
  const cfg    = CATS[chip.type] || CATS.default;
  const isLive = chip.type === "live_score";
  const isModel = chip.type === "model_edge";

  // Build display strings
  let main   = chip.label || "";
  let detail = "";
  let score  = null; // for live scores
  if (chip.type === "live_score") {
    // Try to extract score from label e.g. "Arsenal 2 - 1 Chelsea"
    const m = main.match(/(.+?)\s+(\d+)\s*[-–]\s*(\d+)\s+(.+)/);
    if (m) { score = `${m[2]}–${m[3]}`; main = `${m[1]} vs ${m[4]}`; }
    detail = chip.detail || "";
  } else if (chip.type === "upcoming" && chip.detail) {
    detail = humanDate(chip.detail.split(" · ")[0]?.trim());
  } else if (chip.detail) {
    detail = chip.detail;
  }

  // Extract probability for model chips
  let prob = null;
  if (isModel) {
    const m = main.match(/(\d+)%/);
    if (m) prob = m[1];
  }

  return (
    <span
      onClick={() => navigate(getRoute(chip))}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 0,
        height: 28, borderRadius: 7, flexShrink: 0, overflow: "hidden",
        border: `1px solid ${hov ? cfg.color + "55" : cfg.color + "28"}`,
        background: hov ? cfg.bg.replace(/[\d.]+\)$/, "0.18)") : "rgba(0,0,0,0.3)",
        cursor: "pointer",
        transition: "background 0.14s, border-color 0.14s, box-shadow 0.14s",
        boxShadow: hov ? `0 0 12px ${cfg.color}22` : "none",
        userSelect: "none",
      }}
    >
      {/* Left colour bar */}
      <span style={{
        width: 3, height: "100%", flexShrink: 0,
        background: cfg.color,
      }}/>

      {/* Type tag */}
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "0 7px", height: "100%",
        background: cfg.bg,
        borderRight: `1px solid ${cfg.color}18`,
        fontSize: 7, fontWeight: 900, letterSpacing: "0.1em",
        color: cfg.color, textTransform: "uppercase",
        fontFamily: "'Inter', sans-serif", flexShrink: 0,
      }}>
        {isLive && <PulseDot color={cfg.color}/>}
        {cfg.tag}
      </span>

      {/* Team logos */}
      {(chip.home_logo || chip.away_logo) && (
        <span style={{ display:"inline-flex", alignItems:"center", gap:2, padding:"0 5px" }}>
          {chip.home_logo && <img src={chip.home_logo} alt="" width={13} height={13}
            style={{ objectFit:"contain" }} onError={e=>e.currentTarget.style.display="none"}/>}
          {chip.away_logo && <img src={chip.away_logo} alt="" width={13} height={13}
            style={{ objectFit:"contain" }} onError={e=>e.currentTarget.style.display="none"}/>}
        </span>
      )}

      {/* Main text */}
      <span style={{
        padding: "0 7px", fontSize: 11, fontWeight: 700,
        color: hov ? "#fff" : "rgba(220,232,248,0.9)",
        whiteSpace: "nowrap", letterSpacing: "-0.01em",
        fontFamily: "'Inter', sans-serif",
        transition: "color 0.14s",
      }}>{main}</span>

      {/* Live score pill */}
      {score && (
        <span style={{
          margin: "0 4px 0 0", padding: "2px 7px",
          background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 4, fontSize: 13, fontWeight: 900,
          color: "#fff", fontFamily: "'JetBrains Mono',monospace",
          letterSpacing: "0.04em", flexShrink: 0,
        }}>{score}</span>
      )}

      {/* Model probability */}
      {prob && (
        <span style={{
          margin: "0 6px 0 0", fontSize: 13, fontWeight: 900,
          color: cfg.color, fontFamily: "'JetBrains Mono',monospace", flexShrink: 0,
        }}>{prob}%</span>
      )}

      {/* Detail / time */}
      {detail && (
        <span style={{
          padding: "0 8px 0 0", fontSize: 9.5, fontWeight: 600,
          color: hov ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.22)",
          whiteSpace: "nowrap", fontFamily: "'JetBrains Mono', monospace",
          transition: "color 0.14s", flexShrink: 0,
        }}>· {detail}</span>
      )}
    </span>
  );
}

/* ── Separator ────────────────────────────────────────────────────────────── */
function Sep() {
  return (
    <span style={{
      width: 1, height: 10,
      background: "rgba(255,255,255,0.07)",
      flexShrink: 0, display: "inline-block",
    }}/>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LiveTicker — main export
   position: fixed, top: 48px (flush below .sn-bar), height: 36px
   ══════════════════════════════════════════════════════════════════════════ */
export default function LiveTicker() {
  const { chips, isLive, loading } = useLiveTicker(75_000);
  const [paused, setPaused] = useState(false);

  /* Always render the bar (even empty) so it reserves the 36px space */
  const shell = {
    position: "fixed",
    top: 56,          /* flush below navbar (.sn-bar height: 56px) */
    left: 0,
    right: 0,
    height: 36,       /* 56 + 36 = 92px → matches --bar-total in index.css */
    zIndex: 199,
    background: "#000",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
  };

  return (
    <>
      <style>{`
        @keyframes tkScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
        @keyframes tkBorderFlow {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes tkDot {
          0%, 100% { opacity: 1;    transform: scale(1);    }
          50%       { opacity: 0.25; transform: scale(0.65); }
        }
        .tk-track {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          will-change: transform;
          animation: tkScroll var(--tk-dur, 50s) linear infinite;
        }
        .tk-track.tk-paused { animation-play-state: paused; }
      `}</style>

      <div
        className="sn-live-ticker"
        style={shell}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Animated top accent border */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1.5,
          background: "linear-gradient(90deg,transparent,#ff4444,#fbbf24,#34d399,#60a5fa,#a78bfa,transparent)",
          backgroundSize: "300% 100%",
          animation: "tkBorderFlow 6s ease infinite",
          pointerEvents: "none",
          zIndex: 3,
        }}/>

      {/* "LIVE" / "INTEL" label */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "0 12px",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          height: "100%", flexShrink: 0,
        }}>
          {isLive
            ? <><PulseDot color="#ff4444"/><span style={{
                fontSize: 7.5, fontWeight: 900, letterSpacing: "0.14em",
                color: "#ff4444", fontFamily: "'Inter',sans-serif",
                textTransform: "uppercase",
              }}>Live</span></>
            : <span style={{
                fontSize: 7.5, fontWeight: 900, letterSpacing: "0.14em",
                color: "rgba(255,255,255,0.14)", fontFamily: "'Inter',sans-serif",
                textTransform: "uppercase",
              }}>Intel</span>
          }
        </div>

        {/* Left fade */}
        <div style={{
          position: "absolute", left: 74, top: 0, bottom: 0, width: 18,
          background: "linear-gradient(to right, rgba(4,6,11,0.97), transparent)",
          zIndex: 2, pointerEvents: "none",
        }}/>

        {/* Scrolling track */}
        {!loading && chips.length > 0 && (() => {
          const all = [...chips, ...chips, ...chips];
          const dur = Math.max(chips.length * 9, 45);
          return (
            <div style={{ flex: 1, overflow: "hidden", paddingLeft: 6 }}>
              <div
                className={`tk-track${paused ? " tk-paused" : ""}`}
                style={{ "--tk-dur": `${dur}s` }}
              >
                {all.map((chip, i) => (
                  <span key={i} style={{
                    display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0,
                  }}>
                    <Chip chip={chip}/>
                    {i < all.length - 1 && <Sep/>}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Right fade */}
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 48,
          background: "linear-gradient(to left, rgba(4,6,11,0.97), transparent)",
          zIndex: 2, pointerEvents: "none",
        }}/>
      </div>
    </>
  );
}