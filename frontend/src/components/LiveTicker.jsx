// components/LiveTicker.jsx
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveTicker } from "../hooks/useLiveTicker";

const CATS = {
  live_score: { tag: "LIVE",     color: "#ff4444", bg: "rgba(255,56,56,0.12)",  border: "rgba(255,56,56,0.22)"  },
  upcoming:   { tag: "UPCOMING", color: "#60a5fa", bg: "rgba(96,165,250,0.10)", border: "rgba(96,165,250,0.20)" },
  model_edge: { tag: "MODEL",    color: "#34d399", bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.20)" },
  title_race: { tag: "TABLE",    color: "#fbbf24", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.20)" },
  news:       { tag: "NEW",      color: "#f472b6", bg: "rgba(244,114,182,0.10)",border: "rgba(244,114,182,0.20)"},
  fpl:        { tag: "FPL",      color: "#a3e635", bg: "rgba(163,230,53,0.10)", border: "rgba(163,230,53,0.20)" },
  default:    { tag: "INFO",     color: "#94a3b8", bg: "rgba(148,163,184,0.07)",border: "rgba(148,163,184,0.15)"},
};

// Human readable date from ISO or "2026-03-14" strings
function humanDate(str) {
  if (!str) return "";
  try {
    const d = new Date(str);
    if (isNaN(d)) return str;
    const now = new Date();
    const diff = Math.round((d - now) / 86400000);
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    if (diff === 0) return `Today ${time}`;
    if (diff === 1) return `Tomorrow ${time}`;
    if (diff === -1) return "Yesterday";
    if (diff > 1 && diff < 7) return `${days[d.getDay()]} ${time}`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ` ${time}`;
  } catch { return str; }
}

// Parse backend chip into display-ready structure
function parseChip(chip) {
  const cfg = CATS[chip.type] || CATS.default;
  let main = chip.label || "";
  let detail = "";
  let league = "";

  if (chip.type === "upcoming" && chip.detail) {
    // detail: "2026-03-14 · 67% / 12%"
    const parts = chip.detail.split(" · ");
    const dateStr = parts[0]?.trim();
    const probs   = parts[1]?.trim();
    detail = humanDate(dateStr) + (probs ? ` · ${probs}` : "");
    // Try to extract league from label — "Arsenal vs Everton" → EPL etc (best effort)
  }

  if (chip.type === "title_race" && chip.detail) {
    // detail: "Manchester City chasing · Premier League"
    const parts = chip.detail.split(" · ");
    detail = parts[0] || "";
    league = parts[1] || "";
  }

  if (chip.type === "model_edge" && chip.detail) {
    // detail: "90% confidence · La Liga"
    const parts = chip.detail.split(" · ");
    detail = parts[0] || "";
    league = parts[1] || "";
  }

  if (chip.type === "live_score" && chip.detail) {
    detail = chip.detail;
  }

  if (chip.type === "news" && chip.detail) {
    detail = chip.detail;
  }

  return { cfg, main, detail, league, raw: chip };
}

// Route for each chip type
function getRoute(chip) {
  switch (chip.type) {
    case "live_score": return "/games";
    case "upcoming":   return "/predictions/premier-league";
    case "model_edge": return "/news";
    case "title_race": {
      const leagueMap = {
        "Premier League": "/league/epl",
        "La Liga":        "/league/laliga",
        "Serie A":        "/league/seriea",
        "Bundesliga":     "/league/bundesliga",
        "Ligue 1":        "/league/ligue1",
      };
      const l = chip.detail?.split(" · ")[1]?.trim();
      return leagueMap[l] || "/leagues";
    }
    case "news": return "/news";
    case "fpl":  return "/best-team";
    default:     return "/news";
  }
}

function PulseDot({ color }) {
  return (
    <span style={{
      width: 5, height: 5, borderRadius: "50%",
      background: color, boxShadow: `0 0 5px ${color}`,
      display: "inline-block", flexShrink: 0,
      animation: "tkDot 1.6s ease-in-out infinite",
    }} />
  );
}

function Logos({ home, away }) {
  if (!home && !away) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
      {home && <img src={home} alt="" width={13} height={13} style={{ objectFit: "contain" }}
        onError={e => e.currentTarget.style.display = "none"} />}
      {away && <img src={away} alt="" width={13} height={13} style={{ objectFit: "contain" }}
        onError={e => e.currentTarget.style.display = "none"} />}
    </span>
  );
}

function Chip({ chip }) {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);
  const { cfg, main, detail, league } = parseChip(chip);
  const isLive = chip.type === "live_score";
  const route = getRoute(chip);

  return (
    <span
      onClick={() => navigate(route)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0,
        height: 26,
        borderRadius: 7,
        background: hov ? cfg.bg.replace(/[\d.]+\)$/, "0.18)") : cfg.bg,
        border: `1px solid ${hov ? cfg.color + "55" : cfg.border}`,
        flexShrink: 0,
        overflow: "hidden",
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s",
        boxShadow: hov ? `0 2px 14px ${cfg.bg}` : "none",
        userSelect: "none",
      }}
    >
      {/* Tag */}
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "0 7px",
        height: "100%",
        background: hov ? `${cfg.color}28` : `${cfg.color}16`,
        borderRight: `1px solid ${cfg.border}`,
        fontSize: 7.5, fontWeight: 900, letterSpacing: "0.1em",
        color: cfg.color, textTransform: "uppercase",
        fontFamily: "'Inter', sans-serif", flexShrink: 0,
        transition: "background 0.15s",
      }}>
        {isLive && <PulseDot color={cfg.color} />}
        {cfg.tag}
      </span>

      {/* League badge */}
      {league ? (
        <span style={{
          padding: "0 6px",
          fontSize: 9, fontWeight: 700,
          color: hov ? cfg.color : "rgba(255,255,255,0.35)",
          fontFamily: "'Inter', sans-serif",
          flexShrink: 0,
          transition: "color 0.15s",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}>{league}</span>
      ) : null}

      {/* Logos */}
      {(chip.home_logo || chip.away_logo) && (
        <span style={{ padding: "0 5px", display: "inline-flex", alignItems: "center" }}>
          <Logos home={chip.home_logo} away={chip.away_logo} />
        </span>
      )}

      {/* Main content */}
      <span style={{
        padding: "0 7px 0 " + (chip.home_logo || chip.away_logo || league ? "4px" : "7px"),
        fontSize: 11.5, fontWeight: 700,
        color: hov ? "#fff" : "#c8d8e8",
        whiteSpace: "nowrap", letterSpacing: "-0.01em",
        fontFamily: "'Inter', sans-serif",
        transition: "color 0.15s",
      }}>
        {main}
      </span>

      {/* Detail / meta */}
      {detail && (
        <span style={{
          padding: "0 8px 0 0",
          fontSize: 10, fontWeight: 600,
          color: hov ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.22)",
          whiteSpace: "nowrap",
          fontFamily: "'JetBrains Mono', monospace",
          transition: "color 0.15s",
          letterSpacing: "0.01em",
        }}>
          · {detail}
        </span>
      )}
    </span>
  );
}

function Sep() {
  return (
    <span style={{
      width: 1, height: 12,
      background: "rgba(255,255,255,0.07)",
      flexShrink: 0, display: "inline-block",
    }} />
  );
}

export default function LiveTicker() {
  const { chips, isLive, loading } = useLiveTicker(75_000);
  const [paused, setPaused] = useState(false);

  const shell = {
    position: "fixed", top: 48, left: 0, right: 0,
    height: 36, zIndex: 199,
    background: "rgba(4,6,11,0.97)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    display: "flex", alignItems: "center", overflow: "hidden",
  };

  if (loading || chips.length === 0) return <div className="sn-live-ticker" style={shell} />;

  const all      = [...chips, ...chips, ...chips];
  const duration = Math.max(chips.length * 10, 50);

  return (
    <>
      <style>{`
        @keyframes tkScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
        @keyframes tkDot {
          0%,100% { opacity:1; transform:scale(1); }
          50%     { opacity:0.25; transform:scale(0.65); }
        }
        .tk-track {
          display: inline-flex; align-items: center; gap: 8px;
          white-space: nowrap;
          animation: tkScroll ${duration}s linear infinite;
          will-change: transform;
        }
        .tk-track.tk-paused { animation-play-state: paused; }
      `}</style>

      <div
        className="sn-live-ticker"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        style={shell}
      >
        {/* Left label */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "0 12px",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          height: "100%", flexShrink: 0,
        }}>
          {isLive
            ? <><PulseDot color="#ff4444" /><span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.14em", color: "#ff4444", fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>Live</span></>
            : <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.14em", color: "rgba(255,255,255,0.15)", fontFamily: "'Inter',sans-serif", textTransform: "uppercase" }}>Intel</span>
          }
        </div>

        {/* Fade left */}
        <div style={{
          position: "absolute", left: 74, top: 0, bottom: 0, width: 20,
          background: "linear-gradient(to right, rgba(4,6,11,0.97), transparent)",
          zIndex: 2, pointerEvents: "none",
        }} />

        {/* Track */}
        <div style={{ flex: 1, overflow: "hidden", paddingLeft: 6 }}>
          <div className={`tk-track${paused ? " tk-paused" : ""}`}>
            {all.map((chip, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <Chip chip={chip} />
                {i < all.length - 1 && <Sep />}
              </span>
            ))}
          </div>
        </div>

        {/* Fade right */}
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 48,
          background: "linear-gradient(to left, rgba(4,6,11,0.97), transparent)",
          zIndex: 2, pointerEvents: "none",
        }} />
      </div>
    </>
  );
}