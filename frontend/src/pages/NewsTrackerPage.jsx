// pages/NewsTrackerPage.jsx — StatinSite Intelligence Newsroom v3
import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "https://football-stats-lw4b.onrender.com";

// ── Normalise API item ────────────────────────────────────────
function normalise(a) {
  return {
    ...a,
    home_team:           a.meta?.home_team,
    away_team:           a.meta?.away_team,
    home_win_prob:       (a.meta?.home_win  ?? 0) / 100,
    draw_prob:           (a.meta?.draw      ?? 0) / 100,
    away_win_prob:       (a.meta?.away_win  ?? 0) / 100,
    expected_home_goals: a.meta?.xg_home,
    expected_away_goals: a.meta?.xg_away,
    confidence_score:    (a.meta?.confidence ?? 0) / 100,
    home_logo:           a.meta?.home_logo,
    away_logo:           a.meta?.away_logo,
    model_verdict: Array.isArray(a.body)
      ? a.body[a.body.length - 1]?.replace(/\*\*/g, "") ?? ""
      : "",
  };
}

// ── Constants ─────────────────────────────────────────────────
const LEAGUE_META = {
  epl:        { label: "Premier League", abbr: "EPL",  color: "#38bdf8", bg: "rgba(56,189,248,0.1)"   },
  laliga:     { label: "La Liga",        abbr: "LAL",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)"   },
  seriea:     { label: "Serie A",        abbr: "SA",   color: "#34d399", bg: "rgba(52,211,153,0.1)"   },
  bundesliga: { label: "Bundesliga",     abbr: "BUN",  color: "#fb923c", bg: "rgba(251,146,60,0.1)"   },
  ligue1:     { label: "Ligue 1",        abbr: "L1",   color: "#a78bfa", bg: "rgba(167,139,250,0.1)"  },
  ucl:        { label: "Champions Lge",  abbr: "UCL",  color: "#fbbf24", bg: "rgba(251,191,36,0.1)"   },
  general:    { label: "Football",       abbr: "NEWS", color: "#94a3b8", bg: "rgba(148,163,184,0.08)" },
};

const TYPE_META = {
  match_preview: { label: "Preview",   color: "#38bdf8", icon: "⚽" },
  model_insight: { label: "Insight",   color: "#34d399", icon: "📊" },
  title_race:    { label: "Title Race",color: "#fbbf24", icon: "🏆" },
  transfer:      { label: "Transfer",  color: "#f59e0b", icon: "🔄" },
  injury:        { label: "Injury",    color: "#f87171", icon: "🩹" },
  manager:       { label: "Manager",   color: "#c084fc", icon: "🎯" },
  analysis:      { label: "Analysis",  color: "#34d399", icon: "📐" },
  news:          { label: "News",      color: "#94a3b8", icon: "📰" },
  headline:      { label: "News",      color: "#94a3b8", icon: "📰" },
};

// Team colour palette for hero banners (by partial name match)
const TEAM_COLOURS = {
  arsenal:          ["#EF0107","#063672"],
  chelsea:          ["#034694","#034694"],
  liverpool:        ["#C8102E","#00B2A9"],
  "manchester city":["#6CABDD","#1C2C5B"],
  "manchester united":["#DA291C","#FBE122"],
  tottenham:        ["#132257","#FFFFFF"],
  newcastle:        ["#241F20","#41B6E6"],
  "aston villa":    ["#95BFE5","#670E36"],
  "west ham":       ["#7A263A","#1BB1E7"],
  brighton:         ["#0057B8","#FFCD00"],
  everton:          ["#003399","#FFFFFF"],
  "real madrid":    ["#FEBE10","#00529F"],
  barcelona:        ["#A50044","#004D98"],
  atletico:         ["#CB3524","#FFFFFF"],
  bayern:           ["#DC052D","#0066B2"],
  dortmund:         ["#FDE100","#000000"],
  juventus:         ["#000000","#FFFFFF"],
  inter:            ["#003DA5","#000000"],
  milan:            ["#FB090B","#000000"],
  psg:              ["#004170","#DA291C"],
  napoli:           ["#12A0C7","#FFFFFF"],
  default:          ["#1a3a5a","#0a1a2a"],
};

function teamColours(name = "") {
  const n = name.toLowerCase();
  for (const [key, cols] of Object.entries(TEAM_COLOURS)) {
    if (n.includes(key)) return cols;
  }
  return TEAM_COLOURS.default;
}

function getLeague(article) {
  return LEAGUE_META[(article.league || "").toLowerCase()] || LEAGUE_META.general;
}

function getTypeMeta(type) {
  return TYPE_META[type] || TYPE_META.news;
}

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (diff < 1)    return "just now";
  if (diff < 60)   return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

function formatKickoff(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// ── Win Prob Bar ──────────────────────────────────────────────
function WinProbBar({ home, draw, away, homeTeam, awayTeam, large }) {
  const h = Math.round((home || 0) * 100);
  const d = Math.round((draw || 0) * 100);
  const a = Math.round((away || 0) * 100);
  const winner = h > a ? "home" : a > h ? "away" : "draw";
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: large ? 10 : 6 }}>
        <span style={{ fontSize: large ? 14 : 12, fontWeight: 800, color: winner === "home" ? "#f0f6ff" : "#4a6a8a", maxWidth: "36%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{homeTeam}</span>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: large ? 15 : 12, fontWeight: 900, color: winner === "home" ? "#38bdf8" : "#2a4a6a" }}>{h}%</span>
          <span style={{ fontSize: large ? 10 : 9, color: "#1a3a5a", fontWeight: 700 }}>{d}% D</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: large ? 15 : 12, fontWeight: 900, color: winner === "away" ? "#f87171" : "#2a4a6a" }}>{a}%</span>
        </div>
        <span style={{ fontSize: large ? 14 : 12, fontWeight: 800, color: winner === "away" ? "#f0f6ff" : "#4a6a8a", maxWidth: "36%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{awayTeam}</span>
      </div>
      <div style={{ display: "flex", height: large ? 6 : 4, borderRadius: 999, overflow: "hidden", gap: 1 }}>
        <div style={{ width: `${h}%`, background: "linear-gradient(90deg,#1d6fa4,#38bdf8)", borderRadius: "999px 0 0 999px" }} />
        <div style={{ width: `${d}%`, background: "rgba(255,255,255,0.1)" }} />
        <div style={{ width: `${a}%`, background: "linear-gradient(90deg,#dc4f4f,#f87171)", borderRadius: "0 999px 999px 0" }} />
      </div>
    </div>
  );
}

// ── Match Info Bar (article page) ─────────────────────────────
function MatchInfoBar({ article }) {
  const league   = getLeague(article);
  const homeProb = article.home_win_prob  || (article.meta?.home_win  ?? 0) / 100;
  const drawProb = article.draw_prob      || (article.meta?.draw      ?? 0) / 100;
  const awayProb = article.away_win_prob  || (article.meta?.away_win  ?? 0) / 100;
  const homeTeam = article.home_team      || article.meta?.home_team;
  const awayTeam = article.away_team      || article.meta?.away_team;
  const kickoff  = article.meta?.kickoff  || article.published_at;
  const venue    = article.meta?.venue    || null;
  const mls      = article.meta?.most_likely_score;

  if (!homeTeam || !awayTeam) return null;

  const cells = [
    { label: "Fixture",     value: `${homeTeam} vs ${awayTeam}` },
    { label: "Competition", value: league.label },
    venue && { label: "Venue",  value: venue },
    kickoff && { label: "Kickoff", value: formatKickoff(kickoff) },
    mls && { label: "Projected Score", value: mls },
  ].filter(Boolean);

  return (
    <div style={{ borderRadius: 14, border: `1px solid ${league.color}25`, background: "rgba(255,255,255,0.02)", padding: "16px 20px", marginBottom: 28 }}>
      <div style={{ display: "flex", gap: 0, flexWrap: "wrap", marginBottom: 16 }}>
        {cells.map((c, i) => (
          <div key={i} style={{ flex: "1 1 140px", padding: "0 16px 10px 0", minWidth: 120 }}>
            <div style={{ fontSize: 9, fontWeight: 900, color: "#1a3a5a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: "#c8d8f0" }}>{c.value}</div>
          </div>
        ))}
      </div>
      <WinProbBar home={homeProb} draw={drawProb} away={awayProb} homeTeam={homeTeam} awayTeam={awayTeam} large />
    </div>
  );
}

// ── Hero VS Banner ────────────────────────────────────────────
function HeroVSBanner({ homeTeam, awayTeam, homeLogo, awayLogo, height = 160 }) {
  const [hc1, hc2] = teamColours(homeTeam);
  const [ac1, ac2] = teamColours(awayTeam);

  const halftone = `radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)`;

  return (
    <div style={{ position: "relative", height, overflow: "hidden", flexShrink: 0 }}>
      {/* Home side */}
      <div style={{
        position: "absolute", left: 0, top: 0, width: "52%", height: "100%",
        background: `linear-gradient(135deg, ${hc1}cc, ${hc2}99)`,
        clipPath: "polygon(0 0, 58% 0, 42% 100%, 0 100%)",
      }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: halftone, backgroundSize: "12px 12px", opacity: 0.5 }} />
      </div>

      {/* Away side */}
      <div style={{
        position: "absolute", right: 0, top: 0, width: "52%", height: "100%",
        background: `linear-gradient(225deg, ${ac1}cc, ${ac2}99)`,
        clipPath: "polygon(58% 0, 100% 0, 100% 100%, 42% 100%)",
      }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: halftone, backgroundSize: "12px 12px", opacity: 0.5 }} />
      </div>

      {/* Dark base so logos pop */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(4,8,18,0.45)" }} />

      {/* Home badge */}
      <div style={{ position: "absolute", left: "18%", top: "50%", transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        {homeLogo
          ? <img src={homeLogo} alt={homeTeam} style={{ width: 60, height: 60, objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.7))" }} onError={e => e.currentTarget.style.display = "none"} />
          : <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg,${hc1},${hc2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>⚽</div>
        }
        <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 11, fontWeight: 900, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.8)", textAlign: "center", maxWidth: 80, lineHeight: 1.2 }}>{homeTeam}</span>
      </div>

      {/* VS badge */}
      <div style={{
        position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
        width: 44, height: 44, borderRadius: "50%",
        background: "rgba(4,8,18,0.92)", border: "2px solid rgba(255,255,255,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 20px rgba(0,0,0,0.7), 0 0 0 4px rgba(255,255,255,0.04)",
        zIndex: 10,
      }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.7)", letterSpacing: "0.05em" }}>VS</span>
      </div>

      {/* Away badge */}
      <div style={{ position: "absolute", left: "82%", top: "50%", transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        {awayLogo
          ? <img src={awayLogo} alt={awayTeam} style={{ width: 60, height: 60, objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.7))" }} onError={e => e.currentTarget.style.display = "none"} />
          : <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg,${ac1},${ac2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>⚽</div>
        }
        <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 11, fontWeight: 900, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.8)", textAlign: "center", maxWidth: 80, lineHeight: 1.2 }}>{awayTeam}</span>
      </div>

      {/* Bottom gradient fade into card */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 40, background: "linear-gradient(to top, rgba(8,14,26,1), transparent)" }} />
    </div>
  );
}

// ── Match Preview Card ────────────────────────────────────────
function MatchPreviewCard({ article, featured = false, onClick }) {
  const [hov, setHov] = useState(false);
  const league   = getLeague(article);
  const homeTeam = article.home_team  || article.meta?.home_team || "Home";
  const awayTeam = article.away_team  || article.meta?.away_team || "Away";
  const homeLogo = article.home_logo  || article.meta?.home_logo;
  const awayLogo = article.away_logo  || article.meta?.away_logo;
  const kickoff  = article.meta?.kickoff || article.published_at;

  return (
    <div
      onClick={() => onClick(article)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 20, overflow: "hidden", cursor: "pointer",
        background: "linear-gradient(160deg, rgba(8,14,26,0.98), rgba(4,8,16,0.98))",
        border: hov ? `1px solid ${league.color}50` : "1px solid rgba(255,255,255,0.07)",
        boxShadow: hov ? `0 0 28px ${league.color}18, 0 16px 40px rgba(0,0,0,0.45)` : "0 6px 24px rgba(0,0,0,0.3)",
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        transition: "all 0.22s cubic-bezier(.22,1,.36,1)",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Hero VS Banner */}
      <HeroVSBanner homeTeam={homeTeam} awayTeam={awayTeam} homeLogo={homeLogo} awayLogo={awayLogo} height={featured ? 180 : 155} />

      {/* Card body */}
      <div style={{ padding: featured ? "16px 20px 18px" : "13px 16px 16px" }}>
        {/* Badges row */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.12em", color: "#38bdf8", textTransform: "uppercase", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.25)", borderRadius: 5, padding: "2px 7px" }}>PREVIEW</span>
          <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.1em", color: league.color, textTransform: "uppercase", background: league.bg, border: `1px solid ${league.color}30`, borderRadius: 5, padding: "2px 7px" }}>{league.abbr}</span>
          {kickoff && (
            <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#1a3a5a", fontWeight: 700 }}>
              {formatKickoff(kickoff) || timeAgo(kickoff)}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: featured ? 17 : 15, fontWeight: 900, color: "#f0f6ff", lineHeight: 1.25, letterSpacing: "-0.01em", margin: "0 0 6px" }}>
          {homeTeam} vs {awayTeam}
        </h3>

        {/* Teaser */}
        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: "#4a6a8a", lineHeight: 1.5, margin: "0 0 10px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {article.standfirst || article.summary}
        </p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#1a3a5a" }}>StatinSite Model</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#38bdf8", letterSpacing: "0.03em" }}>Full preview →</span>
        </div>
      </div>
    </div>
  );
}

// ── Model / Title Race Card ───────────────────────────────────
function InsightCard({ article, featured = false, onClick }) {
  const [hov, setHov] = useState(false);
  const league   = getLeague(article);
  const typeMeta = getTypeMeta(article.type);
  const accent   = article.type === "title_race" ? "#fbbf24" : "#34d399";

  return (
    <div
      onClick={() => onClick(article)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 20, overflow: "hidden", cursor: "pointer",
        background: "linear-gradient(160deg, rgba(8,14,26,0.98), rgba(4,8,16,0.98))",
        border: hov ? `1px solid ${accent}45` : "1px solid rgba(255,255,255,0.07)",
        boxShadow: hov ? `0 0 28px ${accent}18, 0 16px 40px rgba(0,0,0,0.4)` : "0 6px 24px rgba(0,0,0,0.3)",
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        transition: "all 0.22s cubic-bezier(.22,1,.36,1)",
        display: "flex", flexDirection: "column", position: "relative",
      }}
    >
      {/* Gradient texture */}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${accent}0d, transparent)`, pointerEvents: "none" }} />
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}, transparent)`, flexShrink: 0 }} />

      {/* Image */}
      {article.image && (
        <div style={{ height: featured ? 110 : 80, overflow: "hidden", position: "relative", flexShrink: 0 }}>
          <img src={article.image} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", padding: "10px", boxSizing: "border-box", filter: "brightness(0.75)", opacity: 0.6 }} onError={e => e.currentTarget.parentElement.style.display = "none"} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,14,26,1), transparent)" }} />
        </div>
      )}

      <div style={{ padding: featured ? "18px 20px" : "14px 16px", position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.12em", color: accent, textTransform: "uppercase", background: `${accent}12`, border: `1px solid ${accent}35`, borderRadius: 5, padding: "2px 7px" }}>{typeMeta.label.toUpperCase()}</span>
          <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.1em", color: league.color, textTransform: "uppercase", background: league.bg, border: `1px solid ${league.color}30`, borderRadius: 5, padding: "2px 7px" }}>{league.abbr}</span>
          <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#1a3a5a", fontWeight: 700 }}>{timeAgo(article.published_at)}</span>
        </div>
        <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: featured ? 18 : 15, fontWeight: 900, color: "#f0f6ff", lineHeight: 1.25, margin: "0 0 8px" }}>{article.title}</h3>
        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: "#4a6a8a", lineHeight: 1.55, margin: "0 0 auto", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: featured ? 3 : 2, WebkitBoxOrient: "vertical" }}>
          {article.standfirst || article.summary}
        </p>

        {/* Key stat pills */}
        {article.meta?.gap != null && (
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 900, color: accent }}>{article.meta.gap}pts</span>
              <span style={{ fontSize: 8, fontWeight: 800, color: "#1a3a5a", letterSpacing: "0.08em", textTransform: "uppercase" }}>Gap</span>
            </div>
            {article.meta.leader && (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 12, fontWeight: 900, color: "#f0f6ff" }}>{article.meta.leader}</span>
                <span style={{ fontSize: 8, fontWeight: 800, color: "#1a3a5a", letterSpacing: "0.08em", textTransform: "uppercase" }}>Leader</span>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#1a3a5a" }}>StatinSite Model</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: accent }}>Read →</span>
        </div>
      </div>
    </div>
  );
}

// ── Compact RSS Card (70px) ───────────────────────────────────
function CompactNewsCard({ article, onClick }) {
  const [hov, setHov] = useState(false);
  const typeMeta = getTypeMeta(article.type);
  const league   = getLeague(article);

  return (
    <div
      onClick={() => onClick(article)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", gap: 12, alignItems: "center",
        padding: "10px 14px", height: 70, borderRadius: 14, cursor: "pointer",
        background: hov ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
        border: hov ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.05)",
        transform: hov ? "translateY(-1px)" : "translateY(0)",
        transition: "all 0.15s ease",
        boxSizing: "border-box",
      }}
    >
      {/* Thumbnail */}
      {article.image ? (
        <img src={article.image} alt="" style={{ width: 72, height: 48, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} onError={e => { e.currentTarget.style.display = "none"; }} />
      ) : (
        <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: `${typeMeta.color}12`, border: `1px solid ${typeMeta.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          {typeMeta.icon}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.1em", color: typeMeta.color, textTransform: "uppercase", background: `${typeMeta.color}10`, border: `1px solid ${typeMeta.color}22`, borderRadius: 4, padding: "1px 5px" }}>{typeMeta.label}</span>
          <span style={{ fontSize: 8, color: "#1a3a5a", fontWeight: 700, fontFamily: "'Inter',sans-serif" }}>{article.source}</span>
          <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#1a3a5a", fontWeight: 700 }}>{timeAgo(article.published_at)}</span>
        </div>
        <p style={{ fontFamily: "'Sora',sans-serif", fontSize: 12, fontWeight: 700, color: hov ? "#e8f0ff" : "#8aabb8", lineHeight: 1.3, margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {article.title}
        </p>
      </div>
    </div>
  );
}

// ── Featured Article (hero sized) ────────────────────────────
function FeaturedCard({ article, onClick }) {
  const [hov, setHov] = useState(false);
  const isPreview = article.type === "match_preview";

  if (isPreview) return <MatchPreviewCard article={article} featured onClick={onClick} />;

  const league   = getLeague(article);
  const typeMeta = getTypeMeta(article.type);
  const accent   = league.color;

  return (
    <div
      onClick={() => onClick(article)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: "relative", borderRadius: 24, overflow: "hidden", minHeight: 300, cursor: "pointer",
        background: "linear-gradient(160deg, rgba(8,14,26,0.98), rgba(4,8,16,0.98))",
        border: hov ? `1px solid ${accent}45` : `1px solid ${accent}20`,
        boxShadow: hov ? `0 0 40px ${accent}20, 0 24px 56px rgba(0,0,0,0.5)` : "0 20px 48px rgba(0,0,0,0.4)",
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        transition: "all 0.3s cubic-bezier(.22,1,.36,1)",
        display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 32,
      }}
    >
      {article.image && (
        <>
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <img src={article.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.3)" }} onError={e => e.currentTarget.style.display = "none"} />
          </div>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(8,14,26,0.95) 40%, rgba(8,14,26,0.5) 80%, transparent)" }} />
        </>
      )}
      {!article.image && <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${accent}0d, transparent)` }} />}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)` }} />

      <div style={{ position: "absolute", top: 24, left: 28, display: "flex", gap: 7 }}>
        <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.12em", color: accent, textTransform: "uppercase", background: `${accent}15`, border: `1px solid ${accent}40`, borderRadius: 6, padding: "3px 9px" }}>FEATURED</span>
        <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", color: league.color, textTransform: "uppercase", background: league.bg, border: `1px solid ${league.color}30`, borderRadius: 6, padding: "3px 9px" }}>{league.abbr}</span>
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 900, color: "#f0f6ff", lineHeight: 1.2, letterSpacing: "-0.025em", margin: "0 0 10px" }}>{article.title}</h2>
        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, color: "#6a8aa8", lineHeight: 1.55, margin: "0 0 18px", maxWidth: 600 }}>{article.standfirst || article.summary}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: accent }}>Read full analysis →</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#1a3a5a", fontWeight: 700 }}>{timeAgo(article.published_at)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Related Article Card ──────────────────────────────────────
function RelatedCard({ article, onClick }) {
  const [hov, setHov] = useState(false);
  const typeMeta = getTypeMeta(article.type);
  const league   = getLeague(article);
  const isPreview = article.type === "match_preview";

  return (
    <div
      onClick={() => onClick(article)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 12px", borderRadius: 12, cursor: "pointer",
        background: hov ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
        border: hov ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.05)",
        transition: "all 0.15s ease",
      }}
    >
      {isPreview ? (
        <div style={{ width: 44, height: 36, flexShrink: 0, display: "flex", gap: 2, overflow: "hidden", borderRadius: 6 }}>
          {article.home_logo && <img src={article.home_logo} style={{ width: 20, height: 36, objectFit: "contain", background: "rgba(255,255,255,0.05)" }} onError={e => e.currentTarget.style.display="none"} alt="" />}
          {article.away_logo && <img src={article.away_logo} style={{ width: 20, height: 36, objectFit: "contain", background: "rgba(255,255,255,0.05)" }} onError={e => e.currentTarget.style.display="none"} alt="" />}
        </div>
      ) : article.image ? (
        <img src={article.image} alt="" style={{ width: 44, height: 36, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} onError={e => e.currentTarget.style.display = "none"} />
      ) : (
        <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: `${typeMeta.color}12`, border: `1px solid ${typeMeta.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{typeMeta.icon}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 5, marginBottom: 4 }}>
          <span style={{ fontSize: 7, fontWeight: 900, letterSpacing: "0.1em", color: typeMeta.color, textTransform: "uppercase", background: `${typeMeta.color}10`, borderRadius: 4, padding: "1px 5px" }}>{typeMeta.label}</span>
          <span style={{ fontSize: 7, fontWeight: 900, letterSpacing: "0.08em", color: league.color, textTransform: "uppercase", background: league.bg, borderRadius: 4, padding: "1px 5px" }}>{league.abbr}</span>
        </div>
        <p style={{ fontFamily: "'Sora',sans-serif", fontSize: 11, fontWeight: 700, color: hov ? "#e8f0ff" : "#8aabb8", lineHeight: 1.35, margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {article.title}
        </p>
      </div>
    </div>
  );
}

// ── Full Article Page Overlay ─────────────────────────────────
function ArticlePage({ article, allArticles, onClose, onNavigate }) {
  const pageRef = useRef(null);

  useEffect(() => {
    if (!article) return;
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    if (pageRef.current) pageRef.current.scrollTop = 0;
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [article, onClose]);

  if (!article) return null;

  const league     = getLeague(article);
  const typeMeta   = getTypeMeta(article.type);
  const isPreview  = article.type === "match_preview";
  const isExternal = article.source_type === "external";
  const accent     = isPreview ? league.color : (article.type === "title_race" ? "#fbbf24" : "#34d399");

  const homeProb = article.home_win_prob  || (article.meta?.home_win  ?? 0) / 100;
  const drawProb = article.draw_prob      || (article.meta?.draw      ?? 0) / 100;
  const awayProb = article.away_win_prob  || (article.meta?.away_win  ?? 0) / 100;
  const homeTeam = article.home_team      || article.meta?.home_team;
  const awayTeam = article.away_team      || article.meta?.away_team;
  const conf     = article.confidence_score ? Math.round(article.confidence_score * 100) : article.meta?.confidence ?? null;

  const bodyParagraphs = Array.isArray(article.body)
    ? article.body.filter(p => typeof p === "string" && p.trim()).map(p => p.replace(/\*\*/g, ""))
    : [];

  const related = allArticles
    .filter(a => a.id !== article.id && (a.league === article.league || a.type === article.type
      || (homeTeam && (a.home_team === homeTeam || a.away_team === homeTeam))
      || (awayTeam && (a.home_team === awayTeam || a.away_team === awayTeam))))
    .slice(0, 5);

  const ms = article.meta?.match_stats;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1100, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", animation: "apBack .2s ease both" }} />
      <div ref={pageRef} style={{ position: "fixed", inset: 0, zIndex: 1101, overflowY: "auto", overflowX: "hidden", background: "linear-gradient(170deg, rgba(5,10,20,0.99), rgba(2,5,12,0.99))", scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.06) transparent", animation: "apUp .3s cubic-bezier(.22,1,.36,1) both" }}>
        <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}, transparent)`, position: "sticky", top: 0, zIndex: 10 }} />
        <button onClick={onClose} style={{ position: "fixed", top: 16, right: 20, zIndex: 1200, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#7a9ab8", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "#f0f6ff"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#7a9ab8"; }}>✕</button>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>

          {/* Hero image */}
          {isPreview && homeTeam && awayTeam ? (
            <HeroVSBanner homeTeam={homeTeam} awayTeam={awayTeam} homeLogo={article.home_logo || article.meta?.home_logo} awayLogo={article.away_logo || article.meta?.away_logo} height={220} />
          ) : article.image && (
            <div style={{ width: "100%", maxHeight: 320, overflow: "hidden", borderRadius: "0 0 20px 20px", position: "relative", marginBottom: 0 }}>
              <img src={article.image} alt="" style={{ width: "100%", height: 320, objectFit: "cover", filter: "brightness(0.55)" }} onError={e => e.currentTarget.parentElement.style.display = "none"} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(5,10,20,1), rgba(5,10,20,0.4) 60%, transparent)" }} />
              <div style={{ position: "absolute", bottom: 16, left: 24, display: "flex", gap: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 900, color: accent, background: `${accent}18`, border: `1px solid ${accent}40`, borderRadius: 6, padding: "3px 9px", letterSpacing: "0.12em", textTransform: "uppercase" }}>{typeMeta.label.toUpperCase()}</span>
                <span style={{ fontSize: 9, fontWeight: 900, color: league.color, background: league.bg, border: `1px solid ${league.color}30`, borderRadius: 6, padding: "3px 9px", letterSpacing: "0.1em", textTransform: "uppercase" }}>{league.abbr}</span>
              </div>
            </div>
          )}

          {/* Article + Sidebar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 36, marginTop: 32, alignItems: "start" }}>
            <div>
              {/* Badges */}
              {!article.image && !isPreview && (
                <div style={{ display: "flex", gap: 7, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 9, fontWeight: 900, color: accent, background: `${accent}12`, border: `1px solid ${accent}30`, borderRadius: 5, padding: "3px 8px", letterSpacing: "0.12em", textTransform: "uppercase" }}>{typeMeta.label.toUpperCase()}</span>
                  <span style={{ fontSize: 9, fontWeight: 900, color: league.color, background: league.bg, border: `1px solid ${league.color}30`, borderRadius: 5, padding: "3px 8px", letterSpacing: "0.1em", textTransform: "uppercase" }}>{league.abbr}</span>
                  {article.source && <span style={{ fontSize: 9, fontWeight: 700, color: "#2a4a6a", fontFamily: "'JetBrains Mono',monospace", marginLeft: "auto" }}>{article.source}</span>}
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#1a3a5a", fontFamily: "'JetBrains Mono',monospace" }}>{timeAgo(article.published_at)}</span>
                </div>
              )}
              {(article.image || isPreview) && (
                <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
                  {article.source && <span style={{ fontSize: 10, fontWeight: 700, color: "#2a4a6a", fontFamily: "'JetBrains Mono',monospace" }}>{article.source}</span>}
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#1a3a5a", fontFamily: "'JetBrains Mono',monospace" }}>{timeAgo(article.published_at)}</span>
                </div>
              )}

              <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 900, color: "#f0f6ff", lineHeight: 1.2, letterSpacing: "-0.025em", margin: "0 0 14px" }}>{article.title}</h1>

              {article.standfirst && (
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 17, lineHeight: 1.65, color: "#8aabb8", margin: "0 0 24px", borderLeft: `3px solid ${accent}40`, paddingLeft: 16 }}>{article.standfirst}</p>
              )}

              {/* Match info bar */}
              {isPreview && <MatchInfoBar article={article} />}

              {/* Body */}
              {!isExternal && bodyParagraphs.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 32 }}>
                  {bodyParagraphs.map((para, i) => (
                    <p key={i} style={{ fontFamily: "'Inter',sans-serif", fontSize: 15.5, lineHeight: 1.8, color: i === bodyParagraphs.length - 1 ? "#c8d8f0" : "#6a8aa8", margin: 0, fontWeight: i === bodyParagraphs.length - 1 ? 600 : 400, ...(i === bodyParagraphs.length - 1 && { borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 18, marginTop: 4 }) }}>{para}</p>
                  ))}
                </div>
              )}

              {/* External */}
              {isExternal && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 15, lineHeight: 1.75, color: "#6a8aa8", margin: 0 }}>{article.standfirst || article.summary}</p>
                  {article.url && <a href={article.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 999, background: accent, color: "#000", fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 800, textDecoration: "none", width: "fit-content" }}>Read full article →</a>}
                </div>
              )}

              {/* Key stats */}
              {ms && (
                <div style={{ marginTop: 32, padding: "18px 20px", borderRadius: 14, background: "rgba(255,255,255,0.02)", border: `1px solid ${accent}15` }}>
                  <div style={{ fontSize: 9, fontWeight: 900, color: accent, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Key Stats</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
                    {[
                      { l: "xG Home",    v: ms.expected_goals_home },
                      { l: "xG Away",    v: ms.expected_goals_away },
                      { l: "Over 2.5",   v: ms.over25_probability != null ? `${ms.over25_probability}%` : null },
                      { l: "BTTS",       v: ms.btts_probability   != null ? `${ms.btts_probability}%`   : null },
                      { l: "Confidence", v: ms.confidence         != null ? `${ms.confidence}%`         : null },
                      { l: "Projection", v: ms.most_likely_score },
                    ].filter(s => s.v != null).map((s, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 17, fontWeight: 900, color: accent }}>{s.v}</span>
                        <span style={{ fontSize: 9, fontWeight: 800, color: "#1a3a5a", letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ position: "sticky", top: 60 }}>
              {/* Verdict */}
              {!isExternal && article.model_verdict && (
                <div style={{ borderRadius: 16, padding: "16px 18px", marginBottom: 18, background: `${accent}08`, border: `1px solid ${accent}20` }}>
                  <div style={{ fontSize: 9, fontWeight: 900, color: accent, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>Model Verdict</div>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, lineHeight: 1.65, color: "#8aabb8", margin: 0 }}>{article.model_verdict}</p>
                </div>
              )}
              {/* Related */}
              {related.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 2, height: 18, borderRadius: 2, background: `linear-gradient(180deg,${accent},transparent)` }} />
                    <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 900, color: "#f0f6ff" }}>Related</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {related.map(a => <RelatedCard key={a.id} article={a} onClick={a2 => { onNavigate(a2); if (pageRef.current) pageRef.current.scrollTop = 0; }} />)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Trending Clubs ────────────────────────────────────────────
function TrendingBar({ clubs, activeClub, onSelect }) {
  if (!clubs || clubs.length === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
      <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.12em", color: "#1a3a5a", textTransform: "uppercase", flexShrink: 0 }}>Trending</span>
      {clubs.map(club => (
        <button key={club} onClick={() => onSelect(club === activeClub ? null : club)}
          style={{ fontSize: 10, fontWeight: 800, color: club === activeClub ? "#f0f6ff" : "#8aabb8", background: club === activeClub ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.04)", border: club === activeClub ? "1px solid rgba(56,189,248,0.4)" : "1px solid rgba(255,255,255,0.07)", borderRadius: 999, padding: "4px 12px", flexShrink: 0, cursor: "pointer", transition: "all .15s", boxShadow: club === activeClub ? "0 0 10px rgba(56,189,248,0.15)" : "none" }}>
          {club}
        </button>
      ))}
    </div>
  );
}

// ── Filter Chip ───────────────────────────────────────────────
function Chip({ label, active, color = "#38bdf8", onClick, count }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 20,
        border: active ? `1.5px solid ${color}65` : hov ? "1.5px solid rgba(255,255,255,0.15)" : "1.5px solid rgba(255,255,255,0.08)",
        background: active ? `${color}15` : hov ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
        color: active ? color : hov ? "#c8d8f0" : "#3a5a7a",
        fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: "0.04em",
        cursor: "pointer", transition: "all .15s ease", whiteSpace: "nowrap", flexShrink: 0,
        boxShadow: active ? `0 0 14px ${color}20` : "none",
      }}
    >
      {active && <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />}
      {label}
      {count != null && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 900, color: active ? color : "#1a3a5a", background: active ? `${color}18` : "rgba(255,255,255,0.04)", borderRadius: 999, padding: "1px 5px" }}>{count}</span>}
    </button>
  );
}

function SkeletonCard({ height = 220 }) {
  return <div style={{ borderRadius: 20, height, background: "linear-gradient(90deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.06) 50%,rgba(255,255,255,0.03) 100%)", backgroundSize: "400% 100%", animation: "shimmer 1.5s ease-in-out infinite", border: "1px solid rgba(255,255,255,0.04)" }} />;
}

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
export default function NewsTrackerPage() {
  const [articles,        setArticles]       = useState([]);
  const [trending,        setTrending]       = useState([]);
  const [loading,         setLoading]        = useState(true);
  const [error,           setError]          = useState(null);
  const [lastUpdated,     setLastUpdated]    = useState(null);
  const [selectedArticle, setSelectedArticle]= useState(null);

  // Filters
  const [activeType,    setActiveType]    = useState("all");
  const [activeLeague,  setActiveLeague]  = useState("all");
  const [activeClub,    setActiveClub]    = useState(null);
  const [sortMode,      setSortMode]      = useState("matchday"); // latest | trending | matchday

  const openArticle    = useCallback(a => setSelectedArticle(a), []);
  const closeArticle   = useCallback(() => setSelectedArticle(null), []);
  const navigateArticle = useCallback(a => setSelectedArticle(a), []);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true); setError(null);
        const res  = await fetch(`${BACKEND}/api/intelligence/feed?limit=60`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const raw  = Array.isArray(data.items) ? data.items : [];
        setArticles(raw.map(normalise));
        setTrending(data.trending_clubs || []);
        setLastUpdated(new Date());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  // ── Filtering ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    return articles.filter(a => {
      const typeOk   = activeType === "all" || a.type === activeType ||
        (activeType === "insight" && (a.type === "model_insight" || a.type === "title_race")) ||
        (activeType === "news"    && ["news","headline","transfer","injury","manager","analysis"].includes(a.type));
      const leagueOk = activeLeague === "all" || a.league === activeLeague;
      const clubOk   = !activeClub || [a.home_team, a.away_team, a.meta?.team]
        .some(t => t?.toLowerCase().includes(activeClub.toLowerCase())) ||
        (a.title + " " + (a.standfirst || "")).toLowerCase().includes(activeClub.toLowerCase());
      return typeOk && leagueOk && clubOk;
    });
  }, [articles, activeType, activeLeague, activeClub]);

  // ── Sorting ───────────────────────────────────────────────
  const sorted = useMemo(() => {
    const now = Date.now();
    return [...filtered].sort((a, b) => {
      if (sortMode === "latest") {
        return new Date(b.published_at) - new Date(a.published_at);
      }
      if (sortMode === "matchday") {
        const aIsPreview = a.type === "match_preview";
        const bIsPreview = b.type === "match_preview";
        const aKO  = a.meta?.kickoff ? new Date(a.meta.kickoff).getTime() : null;
        const bKO  = b.meta?.kickoff ? new Date(b.meta.kickoff).getTime() : null;
        const a48h = aKO && aKO - now < 48 * 3600 * 1000 && aKO > now;
        const b48h = bKO && bKO - now < 48 * 3600 * 1000 && bKO > now;
        if (a48h && !b48h) return -1;
        if (!a48h && b48h) return 1;
        if (aIsPreview && !bIsPreview) return -1;
        if (!aIsPreview && bIsPreview) return 1;
        return new Date(b.published_at) - new Date(a.published_at);
      }
      // trending: internal first, then by recency
      const aInt = a.source_type === "internal";
      const bInt = b.source_type === "internal";
      if (aInt && !bInt) return -1;
      if (!aInt && bInt) return 1;
      return new Date(b.published_at) - new Date(a.published_at);
    });
  }, [filtered, sortMode]);

  const previews  = sorted.filter(a => a.type === "match_preview");
  const insights  = sorted.filter(a => a.type === "model_insight" || a.type === "title_race");
  const newsFeed  = sorted.filter(a => !["match_preview","model_insight","title_race"].includes(a.type));
  const featured  = insights[0] || previews[0] || sorted[0] || null;

  const counts = {
    all:     articles.length,
    preview: articles.filter(a => a.type === "match_preview").length,
    insight: articles.filter(a => a.type === "model_insight" || a.type === "title_race").length,
    news:    articles.filter(a => ["news","headline","transfer","injury","manager","analysis"].includes(a.type)).length,
  };

  const TYPE_FILTERS = [
    { key: "all",     label: "All",      color: "#94a3b8" },
    { key: "preview", label: "Previews", color: "#38bdf8" },
    { key: "insight", label: "Insights", color: "#34d399" },
    { key: "news",    label: "News",     color: "#f59e0b" },
  ];
  const LEAGUE_FILTERS = [
    { key: "all",        label: "All Leagues",   color: "#94a3b8" },
    { key: "epl",        label: "Premier League",color: "#38bdf8" },
    { key: "laliga",     label: "La Liga",       color: "#f59e0b" },
    { key: "seriea",     label: "Serie A",       color: "#34d399" },
    { key: "bundesliga", label: "Bundesliga",    color: "#fb923c" },
    { key: "ligue1",     label: "Ligue 1",       color: "#a78bfa" },
  ];
  const SORT_OPTIONS = [
    { key: "matchday", label: "Matchday" },
    { key: "latest",   label: "Latest"   },
    { key: "trending", label: "Trending" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#000", fontFamily: "'Sora',sans-serif" }}>
      <style>{`
        @keyframes shimmer   { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse     { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.45;transform:scale(.8)} }
        @keyframes apBack    { from{opacity:0} to{opacity:1} }
        @keyframes apUp      { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        .card-enter          { animation: fadeUp .35s cubic-bezier(.22,1,.36,1) both; }
      `}</style>

      <ArticlePage article={selectedArticle} allArticles={articles} onClose={closeArticle} onNavigate={navigateArticle} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 80px" }}>

        {/* ── Header ── */}
        <div style={{ padding: "30px 0 22px", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 4, height: 46, borderRadius: 2, background: "linear-gradient(180deg,#38bdf8,#34d399)", flexShrink: 0 }} />
              <div>
                <h1 style={{ fontFamily: "'Sora',sans-serif", fontSize: 30, fontWeight: 900, color: "#f0f6ff", margin: 0, letterSpacing: "-0.03em", lineHeight: 1.1 }}>Football Intelligence</h1>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: "#2a4a6a", margin: "3px 0 0", fontWeight: 600, letterSpacing: "0.02em" }}>
                  Model previews · Tactical insights · Transfer news
                  {lastUpdated && <span style={{ marginLeft: 10, fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "#1a3a5a" }}>· Updated {timeAgo(lastUpdated)}</span>}
                </p>
              </div>
            </div>

            {/* Live badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 999, background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px rgba(52,211,153,0.8)", animation: "pulse 2s ease-in-out infinite", display: "inline-block" }} />
              <span style={{ fontSize: 9, fontWeight: 900, color: "#34d399", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>Live feed</span>
            </div>
          </div>
        </div>

        {/* ── Trending ── */}
        <TrendingBar clubs={trending} activeClub={activeClub} onSelect={setActiveClub} />

        {/* ── Filters row ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none", alignItems: "center" }}>
            {TYPE_FILTERS.map(f => (
              <Chip key={f.key} label={f.label} active={activeType === f.key} color={f.color} count={counts[f.key.replace("preview","preview").replace("insight","insight").replace("all","all")] || counts[f.key]} onClick={() => setActiveType(f.key)} />
            ))}
            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.07)", flexShrink: 0, margin: "0 4px" }} />
            {LEAGUE_FILTERS.map(f => (
              <Chip key={f.key} label={f.label} active={activeLeague === f.key} color={f.color} onClick={() => setActiveLeague(f.key)} />
            ))}
            <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.07)", flexShrink: 0, margin: "0 4px" }} />
            {SORT_OPTIONS.map(s => (
              <Chip key={s.key} label={s.label} active={sortMode === s.key} color="#94a3b8" onClick={() => setSortMode(s.key)} />
            ))}
          </div>
        </div>

        {/* Error */}
        {error && <div style={{ padding: "14px 18px", borderRadius: 12, marginBottom: 20, background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", fontFamily: "'Inter',sans-serif", fontSize: 13, color: "#f87171" }}>Failed to load: {error}</div>}

        {/* Skeletons */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SkeletonCard height={300} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <SkeletonCard height={240} /><SkeletonCard height={240} /><SkeletonCard height={240} />
            </div>
            {[1,2,3,4].map(i => <SkeletonCard key={i} height={70} />)}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Featured ── */}
            {featured && (
              <div className="card-enter" style={{ marginBottom: 36 }}>
                <FeaturedCard article={featured} onClick={openArticle} />
              </div>
            )}

            {/* ── Match Previews ── */}
            {previews.length > 0 && (
              <div className="card-enter" style={{ marginBottom: 44 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                  <div style={{ width: 3, height: 32, borderRadius: 2, background: "linear-gradient(180deg,#38bdf8,transparent)", flexShrink: 0 }} />
                  <div>
                    <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 900, color: "#f0f6ff", margin: 0, letterSpacing: "-0.02em" }}>Match Previews</h2>
                    <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: "#2a4a6a", margin: 0, fontWeight: 600 }}>Model analysis for upcoming fixtures</p>
                  </div>
                  <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "#1a3a5a", fontWeight: 700 }}>{previews.length}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: previews.length === 1 ? "1fr" : previews.length === 2 ? "1fr 1fr" : "repeat(3,1fr)", gap: 14 }}>
                  {previews.slice(0, 6).map((a, i) => (
                    <div key={a.id || i} className="card-enter" style={{ animationDelay: `${i * 0.07}s` }}>
                      <MatchPreviewCard article={a} onClick={openArticle} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Unified Feed: insights + news interleaved ── */}
            {(insights.length > 0 || newsFeed.length > 0) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Insights col */}
                {insights.length > 0 && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <div style={{ width: 3, height: 28, borderRadius: 2, background: "linear-gradient(180deg,#34d399,transparent)", flexShrink: 0 }} />
                      <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 900, color: "#f0f6ff", margin: 0 }}>Model Insights</h2>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {insights.slice(0, 6).map((a, i) => (
                        <div key={a.id || i} className="card-enter" style={{ animationDelay: `${i * 0.06}s` }}>
                          <InsightCard article={a} onClick={openArticle} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* News col */}
                {newsFeed.length > 0 && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <div style={{ width: 3, height: 28, borderRadius: 2, background: "linear-gradient(180deg,#f59e0b,transparent)", flexShrink: 0 }} />
                      <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 900, color: "#f0f6ff", margin: 0 }}>Latest News</h2>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {newsFeed.slice(0, 14).map((a, i) => (
                        <div key={a.id || i} className="card-enter" style={{ animationDelay: `${i * 0.04}s` }}>
                          <CompactNewsCard article={a} onClick={openArticle} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {sorted.length === 0 && (
              <div style={{ padding: "60px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 32, opacity: 0.3 }}>📭</div>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, color: "#1a3a5a", fontWeight: 600 }}>No articles match the current filters</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}