// components/LiveTicker.jsx — Neobrutalist Edition
// Fixed below navbar at top:60px (neo navbar height), height:40px.
// Combined offset = 100px → update --bar-total in index.css to 100px.
// Data from useLiveTicker hook (real match data from backend).

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveTicker } from "../hooks/useLiveTicker";

/* ── Category config ──────────────────────────────────────── */
const CATS = {
  live_score: { tag: "LIVE",  color: "#ff2744", bg: "rgba(255,39,68,0.14)"   },
  upcoming:   { tag: "SOON",  color: "#e8ff47", bg: "rgba(232,255,71,0.08)"  },
  model_edge: { tag: "MODEL", color: "#e8ff47", bg: "rgba(232,255,71,0.08)"  },
  title_race: { tag: "TABLE", color: "#e8ff47", bg: "rgba(232,255,71,0.08)"  },
  news:       { tag: "NEWS",  color: "#e8ff47", bg: "rgba(232,255,71,0.08)"  },
  fpl:        { tag: "FPL",   color: "#e8ff47", bg: "rgba(232,255,71,0.08)"  },
  default:    { tag: "INFO",  color: "rgba(232,255,71,0.45)", bg: "rgba(232,255,71,0.04)" },
};

/* ── Helpers (unchanged) ──────────────────────────────────── */
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

/* ── Pulsing live dot ────────────────────────────────────── */
function PulseDot({ color }) {
  return (
    <span style={{
      width: 5, height: 5, borderRadius: "50%",
      background: color,
      display: "inline-block", flexShrink: 0,
      animation: "neoTkDot 1.4s ease-in-out infinite",
    }}/>
  );
}

/* ── Single chip — neobrutalist ─────────────────────────── */
function Chip({ chip }) {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);
  const cfg    = CATS[chip.type] || CATS.default;
  const isLive = chip.type === "live_score";

  let main   = chip.label || "";
  let detail = "";
  let score  = null;
  if (chip.type === "live_score") {
    const m = main.match(/(.+?)\s+(\d+)\s*[-–]\s*(\d+)\s+(.+)/);
    if (m) { score = `${m[2]}–${m[3]}`; main = `${m[1]} vs ${m[4]}`; }
    detail = chip.detail || "";
  } else if (chip.type === "upcoming" && chip.detail) {
    detail = humanDate(chip.detail.split(" · ")[0]?.trim());
  } else if (chip.detail) {
    detail = chip.detail;
  }

  let prob = null;
  if (chip.type === "model_edge") {
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
        height: 28, flexShrink: 0, overflow: "hidden",
        border: `2px solid ${isLive ? cfg.color : hov ? "#e8ff47" : "rgba(232,255,71,0.18)"}`,
        background: hov ? (isLive ? cfg.color : "#e8ff47") : "#0a0a0a",
        cursor: "pointer",
        transition: "background 0.13s, border-color 0.13s",
        boxShadow: hov ? `3px 3px 0 ${isLive ? "rgba(255,39,68,0.5)" : "rgba(232,255,71,0.4)"}` : "none",
        userSelect: "none",
      }}
    >
      {/* Left accent bar */}
      <span style={{
        width: 3, height: "100%", flexShrink: 0,
        background: cfg.color,
      }}/>

      {/* Type tag */}
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "0 7px", height: "100%",
        background: hov ? "rgba(0,0,0,0.12)" : cfg.bg,
        borderRight: `2px solid ${isLive ? "rgba(255,39,68,0.3)" : "rgba(232,255,71,0.12)"}`,
        fontSize: 7, fontWeight: 900, letterSpacing: "0.14em",
        color: hov && !isLive ? "#0a0a0a" : cfg.color,
        textTransform: "uppercase",
        fontFamily: "'DM Mono', monospace", flexShrink: 0,
        transition: "color 0.13s",
      }}>
        {isLive && <PulseDot color={hov ? "#fff" : cfg.color}/>}
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
        padding: "0 8px", fontSize: 11, fontWeight: 800,
        color: hov && !isLive ? "#0a0a0a" : "rgba(232,255,71,0.9)",
        whiteSpace: "nowrap", letterSpacing: "0.01em",
        fontFamily: "'Space Grotesk', sans-serif",
        transition: "color 0.13s",
      }}>{main}</span>

      {/* Live score pill */}
      {score && (
        <span style={{
          margin: "0 5px 0 0", padding: "2px 7px",
          background: hov ? "rgba(0,0,0,0.2)" : "#0a0a0a",
          border: `2px solid ${hov ? "rgba(0,0,0,0.3)" : "rgba(232,255,71,0.3)"}`,
          fontSize: 13, fontWeight: 900,
          color: hov ? "#0a0a0a" : "#e8ff47",
          fontFamily: "'DM Mono', monospace",
          letterSpacing: "0.04em", flexShrink: 0,
          transition: "all 0.13s",
        }}>{score}</span>
      )}

      {/* Model probability */}
      {prob && (
        <span style={{
          margin: "0 7px 0 0", fontSize: 13, fontWeight: 900,
          color: hov ? "#0a0a0a" : "#e8ff47",
          fontFamily: "'DM Mono', monospace", flexShrink: 0,
          transition: "color 0.13s",
        }}>{prob}%</span>
      )}

      {/* Detail / time */}
      {detail && (
        <span style={{
          padding: "0 9px 0 0", fontSize: 9.5, fontWeight: 600,
          color: hov && !isLive ? "rgba(10,10,10,0.5)" : "rgba(232,255,71,0.3)",
          whiteSpace: "nowrap", fontFamily: "'DM Mono', monospace",
          transition: "color 0.13s", flexShrink: 0,
        }}>· {detail}</span>
      )}
    </span>
  );
}

/* ── Separator ───────────────────────────────────────────── */
function Sep() {
  return (
    <span style={{
      width: 3, height: 14,
      background: "rgba(232,255,71,0.15)",
      flexShrink: 0, display: "inline-block",
    }}/>
  );
}

/* ══════════════════════════════════════════════════════════
   LiveTicker — Neobrutalist main export
   position: fixed, top: 60px (neo navbar), height: 40px
   ══════════════════════════════════════════════════════════ */
export default function LiveTicker() {
  const { chips, isLive, loading } = useLiveTicker(75_000);
  const [paused, setPaused] = useState(false);

  const shell = {
    position: "fixed",
    top: 60,          /* neo navbar height: 56px + 4px border = 60px effective */
    left: 0,
    right: 0,
    height: 40,
    zIndex: 199,
    background: "#0a0a0a",
    borderBottom: "3px solid #e8ff47",
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
  };

  return (
    <>
      <style>{`
        @keyframes neoTkScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
        @keyframes neoTkDot {
          0%, 100% { opacity: 1;    transform: scale(1);    }
          50%       { opacity: 0.2;  transform: scale(0.6);  }
        }
        @keyframes neoTkAccent {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .neo-tk-track {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          will-change: transform;
          animation: neoTkScroll var(--tk-dur, 50s) linear infinite;
        }
        .neo-tk-track.tk-paused { animation-play-state: paused; }
      `}</style>

      <div
        className="sn-live-ticker"
        style={shell}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Label column */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "0 14px",
          borderRight: "3px solid #e8ff47",
          height: "100%", flexShrink: 0,
          background: isLive ? "#ff2744" : "#e8ff47",
        }}>
          {isLive && <PulseDot color="#fff"/>}
          <span style={{
            fontSize: 8, fontWeight: 900, letterSpacing: "0.2em",
            color: isLive ? "#fff" : "#0a0a0a",
            fontFamily: "'DM Mono', monospace",
            textTransform: "uppercase",
          }}>
            {isLive ? "Live" : "Intel"}
          </span>
        </div>

        {/* Left fade */}
        <div style={{
          position: "absolute", left: 80, top: 0, bottom: 0, width: 20,
          background: "linear-gradient(to right, #0a0a0a, transparent)",
          zIndex: 2, pointerEvents: "none",
        }}/>

        {/* Scrolling track */}
        {!loading && chips.length > 0 && (() => {
          const all = [...chips, ...chips, ...chips];
          const dur = Math.max(chips.length * 10, 50);
          return (
            <div style={{ flex: 1, overflow: "hidden", paddingLeft: 8 }}>
              <div
                className={`neo-tk-track${paused ? " tk-paused" : ""}`}
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
          position: "absolute", right: 0, top: 0, bottom: 0, width: 40,
          background: "linear-gradient(to left, #0a0a0a, transparent)",
          zIndex: 2, pointerEvents: "none",
        }}/>
      </div>
    </>
  );
}