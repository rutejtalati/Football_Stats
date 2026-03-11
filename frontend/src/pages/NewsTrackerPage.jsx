// pages/NewsTrackerPage.jsx  — Premium Editorial Redesign
import { useState, useEffect, useRef } from "react";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "https://football-stats-lw4b.onrender.com";

// ── League meta ─────────────────────────────────────────────
const LEAGUE_META = {
  epl:        { label: "Premier League", abbr: "EPL", color: "#38bdf8", bg: "rgba(56,189,248,0.08)"  },
  laliga:     { label: "La Liga",        abbr: "LAL", color: "#f59e0b", bg: "rgba(245,158,11,0.08)"  },
  seriea:     { label: "Serie A",        abbr: "SA",  color: "#34d399", bg: "rgba(52,211,153,0.08)"  },
  bundesliga: { label: "Bundesliga",     abbr: "BUN", color: "#fb923c", bg: "rgba(251,146,60,0.08)"  },
  ligue1:     { label: "Ligue 1",        abbr: "L1",  color: "#a78bfa", bg: "rgba(167,139,250,0.08)" },
  all:        { label: "All Leagues",    abbr: "ALL", color: "#94a3b8", bg: "rgba(148,163,184,0.08)" },
};

// ── Article type meta ────────────────────────────────────────
const TYPE_META = {
  match_preview:  { label: "Match Preview",   color: "#38bdf8", icon: "⚽" },
  model_insight:  { label: "Model Insight",   color: "#34d399", icon: "📊" },
  transfer:       { label: "Transfer",        color: "#f59e0b", icon: "🔄" },
  headline:       { label: "News",            color: "#94a3b8", icon: "📰" },
};

// ── Themed visuals per insight keyword ──────────────────────
const INSIGHT_THEMES = {
  "title race":          { accent: "#fbbf24", tag: "TITLE RACE",   grad: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(0,0,0,0))"    },
  "form surge":          { accent: "#34d399", tag: "FORM",         grad: "linear-gradient(135deg, rgba(52,211,153,0.15), rgba(0,0,0,0))"    },
  "defensive dominance": { accent: "#38bdf8", tag: "DEFENSIVE",    grad: "linear-gradient(135deg, rgba(56,189,248,0.12), rgba(0,0,0,0))"    },
  "upset alert":         { accent: "#f87171", tag: "UPSET ALERT",  grad: "linear-gradient(135deg, rgba(248,113,113,0.15), rgba(0,0,0,0))"   },
  "banker":              { accent: "#a78bfa", tag: "BANKER PICK",  grad: "linear-gradient(135deg, rgba(167,139,250,0.15), rgba(0,0,0,0))"   },
  "transfer":            { accent: "#fb923c", tag: "TRANSFER",     grad: "linear-gradient(135deg, rgba(251,146,60,0.12), rgba(0,0,0,0))"    },
  "conceding":           { accent: "#38bdf8", tag: "DEFENSIVE",    grad: "linear-gradient(135deg, rgba(56,189,248,0.12), rgba(0,0,0,0))"    },
  "scoring":             { accent: "#34d399", tag: "ATTACK",       grad: "linear-gradient(135deg, rgba(52,211,153,0.12), rgba(0,0,0,0))"    },
  "favoured":            { accent: "#a78bfa", tag: "PREDICTION",   grad: "linear-gradient(135deg, rgba(167,139,250,0.12), rgba(0,0,0,0))"   },
};

function getInsightTheme(title = "") {
  const lower = title.toLowerCase();
  for (const [key, theme] of Object.entries(INSIGHT_THEMES)) {
    if (lower.includes(key)) return theme;
  }
  return { accent: "#38bdf8", tag: "INSIGHT", grad: "linear-gradient(135deg, rgba(56,189,248,0.08), rgba(0,0,0,0))" };
}

function getLeagueFromArticle(article) {
  const src = (article.league_id || article.league || "").toString().toLowerCase();
  if (src.includes("epl") || src === "39")        return LEAGUE_META.epl;
  if (src.includes("laliga") || src === "140")    return LEAGUE_META.laliga;
  if (src.includes("seriea") || src === "135")    return LEAGUE_META.seriea;
  if (src.includes("bundesliga") || src === "78") return LEAGUE_META.bundesliga;
  if (src.includes("ligue") || src === "61")      return LEAGUE_META.ligue1;
  return LEAGUE_META.epl;
}

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (diff < 1)  return "just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

function WinProbBar({ home, draw, away, homeTeam, awayTeam }) {
  const h = Math.round((home || 0) * 100);
  const d = Math.round((draw || 0) * 100);
  const a = Math.round((away || 0) * 100);
  const winner = h > a ? "home" : a > h ? "away" : "draw";

  return (
    <div style={{ width: "100%" }}>
      {/* Team names + probs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{
          fontSize: 13, fontWeight: 800, color: winner === "home" ? "#f0f6ff" : "#4a6a8a",
          maxWidth: "35%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
        }}>{homeTeam}</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 900, color: winner === "home" ? "#38bdf8" : "#2a4a6a" }}>{h}%</span>
          <span style={{ fontSize: 10, color: "#1a3a5a", fontWeight: 700 }}>{d}% D</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 900, color: winner === "away" ? "#f87171" : "#2a4a6a" }}>{a}%</span>
        </div>
        <span style={{
          fontSize: 13, fontWeight: 800, color: winner === "away" ? "#f0f6ff" : "#4a6a8a",
          maxWidth: "35%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          textAlign: "right"
        }}>{awayTeam}</span>
      </div>
      {/* Bar */}
      <div style={{ display: "flex", height: 5, borderRadius: 999, overflow: "hidden", gap: 1 }}>
        <div style={{ width: `${h}%`, background: "linear-gradient(90deg, #1d6fa4, #38bdf8)", borderRadius: "999px 0 0 999px", transition: "width 0.6s ease" }} />
        <div style={{ width: `${d}%`, background: "rgba(255,255,255,0.12)" }} />
        <div style={{ width: `${a}%`, background: "linear-gradient(90deg, #dc4f4f, #f87171)", borderRadius: "0 999px 999px 0", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ── HERO CARD ────────────────────────────────────────────────
function HeroCard({ article }) {
  const theme = getInsightTheme(article.title);
  const league = getLeagueFromArticle(article);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: 24,
        overflow: "hidden",
        minHeight: 320,
        background: `linear-gradient(160deg, rgba(8,14,26,0.98) 0%, rgba(4,8,16,0.98) 100%)`,
        border: `1px solid ${theme.accent}30`,
        boxShadow: hovered
          ? `0 0 40px ${theme.accent}20, 0 24px 56px rgba(0,0,0,0.5)`
          : `0 20px 48px rgba(0,0,0,0.4)`,
        transition: "box-shadow 0.3s ease",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: 32,
      }}
    >
      {/* Gradient background art */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: theme.grad,
        opacity: hovered ? 1.2 : 1,
        transition: "opacity 0.3s ease",
      }} />

      {/* Top-right decorative grid */}
      <div style={{
        position: "absolute", top: 0, right: 0, width: 280, height: 280,
        backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
        maskImage: "radial-gradient(ellipse at top right, black 30%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(ellipse at top right, black 30%, transparent 75%)",
        pointerEvents: "none",
      }} />

      {/* Accent line top */}
      <div style={{
        position: "absolute", top: 0, left: 32, right: 32, height: 2,
        background: `linear-gradient(90deg, ${theme.accent}, transparent)`,
        borderRadius: "0 0 2px 2px",
      }} />

      {/* FEATURED badge */}
      <div style={{
        position: "absolute", top: 24, left: 32,
        display: "flex", gap: 8, alignItems: "center",
      }}>
        <span style={{
          fontSize: 9, fontWeight: 900, letterSpacing: "0.14em",
          color: theme.accent, textTransform: "uppercase",
          background: `${theme.accent}15`,
          border: `1px solid ${theme.accent}35`,
          borderRadius: 6, padding: "3px 8px",
        }}>Featured</span>
        <span style={{
          fontSize: 9, fontWeight: 900, letterSpacing: "0.1em",
          color: league.color, textTransform: "uppercase",
          background: league.bg,
          border: `1px solid ${league.color}30`,
          borderRadius: 6, padding: "3px 8px",
        }}>{league.abbr}</span>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
          color: "#2a4a6a", fontFamily: "'JetBrains Mono', monospace",
        }}>{timeAgo(article.published_at)}</span>
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{
          fontSize: 10, fontWeight: 900, letterSpacing: "0.16em",
          color: theme.accent, textTransform: "uppercase",
          marginBottom: 10,
        }}>{theme.tag}</div>

        <h2 style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 28, fontWeight: 900, color: "#f0f6ff",
          lineHeight: 1.2, letterSpacing: "-0.02em",
          margin: "0 0 12px", maxWidth: 680,
        }}>{article.title}</h2>

        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 14, color: "#7a9ab8", lineHeight: 1.6,
          margin: "0 0 20px", maxWidth: 580,
        }}>
          {article.summary?.slice(0, 180)}{article.summary?.length > 180 ? "…" : ""}
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button style={{
            padding: "9px 20px", borderRadius: 999,
            background: theme.accent, color: "#000",
            fontFamily: "'Inter', sans-serif",
            fontSize: 12, fontWeight: 800, letterSpacing: "0.04em",
            border: "none", cursor: "pointer",
            transition: "opacity 0.15s",
          }}>Read Analysis →</button>

          {article.key_stat && (
            <div style={{
              padding: "6px 14px", borderRadius: 999,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12, fontWeight: 700, color: "#c8d8f0",
            }}>{article.key_stat}</div>
          )}
        </div>
      </div>
    </div>
  );
}
// ── MATCH PREVIEW CARD ───────────────────────────────────────
function MatchPreviewCard({ article, size = "standard" }) {
  const [hovered, setHovered] = useState(false);
  const league = getLeagueFromArticle(article);
  const isFeatured = size === "feature";

  const homeTeam = article.home_team || "Home";
  const awayTeam = article.away_team || "Away";
  const homeProb = article.home_win_prob || 0;
  const drawProb = article.draw_prob || 0;
  const awayProb = article.away_win_prob || 0;
  const xgHome  = article.expected_home_goals?.toFixed(2) || "—";
  const xgAway  = article.expected_away_goals?.toFixed(2) || "—";
  const verdict = article.model_verdict || article.summary?.slice(0, 90) || "";
  const confidence = article.confidence_score
    ? Math.round(article.confidence_score * 100)
    : null;

  const favoured = homeProb > awayProb ? homeTeam : awayProb > homeProb ? awayTeam : null;
  const favouredProb = Math.max(homeProb, awayProb);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: 20,
        overflow: "hidden",
        background: "linear-gradient(160deg, rgba(10,16,28,0.98) 0%, rgba(6,10,18,0.98) 100%)",
        border: hovered
          ? `1px solid ${league.color}40`
          : "1px solid rgba(255,255,255,0.07)",
        boxShadow: hovered
          ? `0 0 24px ${league.color}12, 0 16px 40px rgba(0,0,0,0.4)`
          : "0 8px 24px rgba(0,0,0,0.3)",
        transition: "all 0.2s ease",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        minHeight: isFeatured ? 280 : 220,
      }}
    >
      {/* Top accent line */}
      <div style={{
        height: 2,
        background: `linear-gradient(90deg, ${league.color}, transparent)`,
      }} />

      {/* Header */}
      <div style={{
        padding: isFeatured ? "20px 24px 0" : "16px 20px 0",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{
            fontSize: 9, fontWeight: 900, letterSpacing: "0.12em",
            color: league.color, textTransform: "uppercase",
            background: league.bg, border: `1px solid ${league.color}30`,
            borderRadius: 5, padding: "2px 7px",
          }}>{league.abbr}</span>
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
            color: "#38bdf8", textTransform: "uppercase",
            background: "rgba(56,189,248,0.07)",
            border: "1px solid rgba(56,189,248,0.15)",
            borderRadius: 5, padding: "2px 7px",
          }}>PREVIEW</span>
        </div>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, color: "#1a3a5a", fontWeight: 700,
        }}>{timeAgo(article.published_at)}</span>
      </div>

      {/* Teams row */}
      <div style={{
        padding: isFeatured ? "16px 24px" : "12px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        {/* Home team */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          {article.home_logo && (
            <img src={article.home_logo} alt={homeTeam}
              style={{ width: 32, height: 32, objectFit: "contain", marginBottom: 4 }}
              onError={e => e.currentTarget.style.display = "none"} />
          )}
          <span style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: isFeatured ? 16 : 14, fontWeight: 900,
            color: homeProb >= awayProb ? "#f0f6ff" : "#4a6a8a",
            lineHeight: 1.2,
          }}>{homeTeam}</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: "#2a6a9a", fontWeight: 700,
          }}>xG {xgHome}</span>
        </div>

        {/* VS */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 18, fontWeight: 900, color: "rgba(255,255,255,0.15)",
            letterSpacing: "0.1em",
          }}>VS</span>
          {article.fixture_date && (
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, color: "#1a3a5a", fontWeight: 700,
            }}>{new Date(article.fixture_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
          )}
        </div>

        {/* Away team */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          {article.away_logo && (
            <img src={article.away_logo} alt={awayTeam}
              style={{ width: 32, height: 32, objectFit: "contain", marginBottom: 4 }}
              onError={e => e.currentTarget.style.display = "none"} />
          )}
          <span style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: isFeatured ? 16 : 14, fontWeight: 900,
            color: awayProb > homeProb ? "#f0f6ff" : "#4a6a8a",
            lineHeight: 1.2, textAlign: "right",
          }}>{awayTeam}</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: "#2a6a9a", fontWeight: 700,
          }}>xG {xgAway}</span>
        </div>
      </div>

      {/* Probability bar */}
      <div style={{ padding: "0 20px" }}>
        <WinProbBar
          home={homeProb} draw={drawProb} away={awayProb}
          homeTeam={homeTeam} awayTeam={awayTeam}
        />
      </div>

      {/* Model verdict strip */}
      <div style={{
        margin: "12px 20px 0",
        padding: "10px 14px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "flex-start", gap: 8,
      }}>
        <span style={{
          fontSize: 8, fontWeight: 900, letterSpacing: "0.1em",
          color: "#34d399", textTransform: "uppercase",
          flexShrink: 0, paddingTop: 1,
        }}>MODEL</span>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 12, color: "#7a9ab8", lineHeight: 1.45,
        }}>{verdict.slice(0, 100)}{verdict.length > 100 ? "…" : ""}</span>
      </div>

      {/* Bottom stat strip */}
      <div style={{
        marginTop: "auto",
        padding: "12px 20px 16px",
        display: "flex", gap: 12, alignItems: "center",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        marginTop: 12,
      }}>
        {favoured && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: "#1a3a5a", letterSpacing: "0.08em" }}>FAVOURED</span>
            <span style={{
              fontSize: 10, fontWeight: 900, color: "#f0f6ff",
              background: "rgba(255,255,255,0.06)", borderRadius: 5,
              padding: "1px 6px",
            }}>{favoured}</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, fontWeight: 900, color: "#38bdf8",
            }}>{Math.round(favouredProb * 100)}%</span>
          </div>
        )}
        {confidence && (
          <>
            <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.06)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: "#1a3a5a", letterSpacing: "0.08em" }}>CONF</span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, fontWeight: 900,
                color: confidence > 70 ? "#34d399" : confidence > 50 ? "#fbbf24" : "#f87171",
              }}>{confidence}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


// ── MODEL INSIGHT CARD ───────────────────────────────────────
function ModelInsightCard({ article, size = "standard" }) {
  const [hovered, setHovered] = useState(false);
  const theme = getInsightTheme(article.title);
  const league = getLeagueFromArticle(article);
  const isFeatured = size === "feature";

  const stats = article.stats || [];
  const keyStats = stats.slice(0, 3);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: 20,
        overflow: "hidden",
        background: "linear-gradient(160deg, rgba(8,14,26,0.98) 0%, rgba(4,8,16,0.98) 100%)",
        border: hovered
          ? `1px solid ${theme.accent}40`
          : "1px solid rgba(255,255,255,0.06)",
        boxShadow: hovered
          ? `0 0 28px ${theme.accent}15, 0 16px 40px rgba(0,0,0,0.4)`
          : "0 8px 24px rgba(0,0,0,0.3)",
        transition: "all 0.22s ease",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Themed gradient wash */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: theme.grad, opacity: hovered ? 1 : 0.7,
        transition: "opacity 0.3s ease",
      }} />

      {/* Decorative dot grid top-right */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        width: 160, height: 160,
        backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "14px 14px",
        maskImage: "radial-gradient(ellipse at top right, black 20%, transparent 70%)",
        WebkitMaskImage: "radial-gradient(ellipse at top right, black 20%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Top accent */}
      <div style={{
        height: 2,
        background: `linear-gradient(90deg, ${theme.accent}, transparent)`,
      }} />

      {/* Content */}
      <div style={{ padding: isFeatured ? "20px 24px" : "16px 20px", position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>

        {/* Badges row */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 12 }}>
          <span style={{
            fontSize: 9, fontWeight: 900, letterSpacing: "0.14em",
            color: theme.accent, textTransform: "uppercase",
            background: `${theme.accent}12`,
            border: `1px solid ${theme.accent}30`,
            borderRadius: 5, padding: "2px 7px",
          }}>{theme.tag}</span>
          <span style={{
            fontSize: 9, fontWeight: 900, letterSpacing: "0.1em",
            color: league.color, textTransform: "uppercase",
            background: league.bg, border: `1px solid ${league.color}30`,
            borderRadius: 5, padding: "2px 7px",
          }}>{league.abbr}</span>
          <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#1a3a5a", fontWeight: 700 }}>
            {timeAgo(article.published_at)}
          </span>
        </div>

        {/* Title */}
        <h3 style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: isFeatured ? 20 : 16,
          fontWeight: 900,
          color: "#f0f6ff",
          lineHeight: 1.25,
          letterSpacing: "-0.01em",
          margin: "0 0 10px",
        }}>{article.title}</h3>

        {/* Summary */}
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13, color: "#4a6a8a", lineHeight: 1.55,
          margin: "0 0 16px", flex: 1,
        }}>
          {article.summary?.slice(0, isFeatured ? 200 : 120)}
          {article.summary?.length > (isFeatured ? 200 : 120) ? "…" : ""}
        </p>

        {/* Key stat strip */}
        {keyStats.length > 0 && (
          <div style={{
            display: "flex", gap: 8, flexWrap: "wrap",
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.05)",
            marginBottom: 12,
          }}>
            {keyStats.map((stat, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 60 }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 14, fontWeight: 900, color: theme.accent,
                }}>{stat.value}</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#1a3a5a", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Bottom meta */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: "#1a3a5a",
            fontFamily: "'Inter', sans-serif",
          }}>Model Insight · StatinSite</span>
          <span style={{
            fontSize: 11, fontWeight: 800, color: theme.accent,
            letterSpacing: "0.04em",
          }}>Read →</span>
        </div>
      </div>
    </div>
  );
}


// ── COMPACT CARD (transfers, headlines) ──────────────────────
function CompactCard({ article }) {
  const [hovered, setHovered] = useState(false);
  const type = article.source_type === "external" ? "headline" : article.article_type;
  const typeMeta = TYPE_META[type] || TYPE_META.headline;
  const league = getLeagueFromArticle(article);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", gap: 14, alignItems: "flex-start",
        padding: "14px 16px",
        borderRadius: 14,
        background: hovered ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
        border: hovered ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.05)",
        transition: "all 0.15s ease",
        cursor: "pointer",
      }}
    >
      {/* Icon column */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: `${typeMeta.color}12`,
        border: `1px solid ${typeMeta.color}25`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16,
      }}>{typeMeta.icon}</div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
          <span style={{
            fontSize: 8, fontWeight: 900, letterSpacing: "0.1em",
            color: typeMeta.color, textTransform: "uppercase",
            background: `${typeMeta.color}10`,
            border: `1px solid ${typeMeta.color}25`,
            borderRadius: 4, padding: "1px 5px",
          }}>{typeMeta.label}</span>
          <span style={{
            fontSize: 8, fontWeight: 900, letterSpacing: "0.08em",
            color: league.color, textTransform: "uppercase",
            background: league.bg, border: `1px solid ${league.color}25`,
            borderRadius: 4, padding: "1px 5px",
          }}>{league.abbr}</span>
          <span style={{
            marginLeft: "auto",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, color: "#1a3a5a", fontWeight: 700,
          }}>{timeAgo(article.published_at)}</span>
        </div>
        <p style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 13, fontWeight: 700, color: hovered ? "#e8f0ff" : "#b8c8d8",
          lineHeight: 1.35, margin: 0,
          overflow: "hidden", textOverflow: "ellipsis",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>{article.title}</p>
      </div>
    </div>
  );
}


// ── SECTION HEADER ───────────────────────────────────────────
function SectionHeader({ title, subtitle, accent = "#38bdf8", count }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 3, height: 36, borderRadius: 2,
          background: `linear-gradient(180deg, ${accent}, transparent)`,
          flexShrink: 0,
        }} />
        <div>
          <h2 style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 20, fontWeight: 900, color: "#f0f6ff",
            margin: 0, letterSpacing: "-0.02em",
          }}>{title}</h2>
          {subtitle && (
            <p style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12, color: "#2a4a6a", margin: "2px 0 0", fontWeight: 600,
            }}>{subtitle}</p>
          )}
        </div>
      </div>
      {count != null && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, color: "#1a3a5a", fontWeight: 700,
        }}>{count} articles</span>
      )}
    </div>
  );
}
// ── FILTER CHIP ──────────────────────────────────────────────
function FilterChip({ label, active, color = "#38bdf8", onClick, count }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 14px",
        borderRadius: 999,
        border: active
          ? `1.5px solid ${color}60`
          : hovered
            ? "1.5px solid rgba(255,255,255,0.15)"
            : "1.5px solid rgba(255,255,255,0.07)",
        background: active
          ? `${color}14`
          : hovered
            ? "rgba(255,255,255,0.05)"
            : "rgba(255,255,255,0.03)",
        color: active ? color : hovered ? "#c8d8f0" : "#3a5a7a",
        fontFamily: "'Inter', sans-serif",
        fontSize: 11, fontWeight: 800, letterSpacing: "0.04em",
        cursor: "pointer",
        transition: "all 0.15s ease",
        boxShadow: active ? `0 0 12px ${color}18` : "none",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {active && (
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: color,
          boxShadow: `0 0 6px ${color}`,
          flexShrink: 0,
        }} />
      )}
      {label}
      {count != null && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9, fontWeight: 900,
          color: active ? color : "#1a3a5a",
          background: active ? `${color}18` : "rgba(255,255,255,0.04)",
          borderRadius: 999, padding: "1px 5px",
        }}>{count}</span>
      )}
    </button>
  );
}


// ── EMPTY STATE ──────────────────────────────────────────────
function EmptyState({ message = "No articles found" }) {
  return (
    <div style={{
      padding: "60px 20px", textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
    }}>
      <div style={{ fontSize: 32, opacity: 0.3 }}>📭</div>
      <p style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 14, color: "#1a3a5a", fontWeight: 600,
      }}>{message}</p>
    </div>
  );
}


// ── SKELETON LOADER ──────────────────────────────────────────
function SkeletonCard({ height = 220 }) {
  return (
    <div style={{
      borderRadius: 20, height,
      background: "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 100%)",
      backgroundSize: "400% 100%",
      animation: "niShimmer 1.5s ease-in-out infinite",
      border: "1px solid rgba(255,255,255,0.04)",
    }} />
  );
}


// ════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ════════════════════════════════════════════════════════════
export default function NewsTrackerPage() {
  const [articles, setArticles]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [activeType, setActiveType]     = useState("all");
  const [activeLeague, setActiveLeague] = useState("all");
  const [lastUpdated, setLastUpdated]   = useState(null);

  // ── Fetch ──────────────────────────────────────────────────
  useEffect(() => {
    async function fetchArticles() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${BACKEND}/api/intelligence/feed?limit=40`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setArticles(data.articles || data || []);
        setLastUpdated(new Date());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchArticles();
    const interval = setInterval(fetchArticles, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Filter logic ───────────────────────────────────────────
  const filtered = articles.filter(a => {
    const type = a.source_type === "external"
      ? (a.article_type === "transfer" ? "transfer" : "headline")
      : a.article_type;

    const typeMatch = activeType === "all" || type === activeType;

    const leagueRaw = (a.league_id || a.league || "").toString().toLowerCase();
    const leagueMatch = activeLeague === "all"
      || (activeLeague === "epl"        && (leagueRaw.includes("epl") || leagueRaw === "39"))
      || (activeLeague === "laliga"     && (leagueRaw.includes("laliga") || leagueRaw === "140"))
      || (activeLeague === "seriea"     && (leagueRaw.includes("seriea") || leagueRaw === "135"))
      || (activeLeague === "bundesliga" && (leagueRaw.includes("bundesliga") || leagueRaw === "78"))
      || (activeLeague === "ligue1"     && (leagueRaw.includes("ligue") || leagueRaw === "61"));

    return typeMatch && leagueMatch;
  });

  // ── Segment by type ────────────────────────────────────────
  const previews  = filtered.filter(a => a.article_type === "match_preview");
  const insights  = filtered.filter(a => a.article_type === "model_insight");
  const transfers = filtered.filter(a =>
    a.source_type === "external" || a.article_type === "transfer"
  );

  // Hero = first insight or first preview
  const hero = insights[0] || previews[0] || null;

  // Counts for filter chips
  const counts = {
    all:           articles.length,
    match_preview: articles.filter(a => a.article_type === "match_preview").length,
    model_insight: articles.filter(a => a.article_type === "model_insight").length,
    transfer:      articles.filter(a => a.source_type === "external").length,
  };

  // ── Type filter options ────────────────────────────────────
  const TYPE_FILTERS = [
    { key: "all",           label: "All",        color: "#94a3b8" },
    { key: "match_preview", label: "Previews",   color: "#38bdf8" },
    { key: "model_insight", label: "Insights",   color: "#34d399" },
    { key: "transfer",      label: "News",       color: "#f59e0b" },
  ];

  const LEAGUE_FILTERS = [
    { key: "all",        label: "All Leagues",    color: "#94a3b8" },
    { key: "epl",        label: "Premier League", color: "#38bdf8" },
    { key: "laliga",     label: "La Liga",        color: "#f59e0b" },
    { key: "seriea",     label: "Serie A",        color: "#34d399" },
    { key: "bundesliga", label: "Bundesliga",     color: "#fb923c" },
    { key: "ligue1",     label: "Ligue 1",        color: "#a78bfa" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#000",
      fontFamily: "'Sora', sans-serif",
    }}>
      <style>{`
        @keyframes niShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes niFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ni-card-enter { animation: niFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px 80px" }}>

        {/* ── PAGE HEADER ─────────────────────────────────── */}
        <div style={{
          padding: "32px 0 24px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          marginBottom: 28,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 4, height: 48, borderRadius: 2,
                background: "linear-gradient(180deg, #38bdf8, #34d399)",
                flexShrink: 0,
              }} />
              <div>
                <h1 style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: 32, fontWeight: 900, color: "#f0f6ff",
                  margin: 0, letterSpacing: "-0.03em", lineHeight: 1.1,
                }}>Football Intelligence</h1>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 13, color: "#2a4a6a", margin: "4px 0 0",
                  fontWeight: 600, letterSpacing: "0.02em",
                }}>
                  Model-driven previews · Tactical insights · Transfer news
                  {lastUpdated && (
                    <span style={{
                      marginLeft: 12,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10, color: "#1a3a5a",
                    }}>Updated {timeAgo(lastUpdated)}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Live indicator */}
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "6px 14px", borderRadius: 999,
              background: "rgba(52,211,153,0.06)",
              border: "1px solid rgba(52,211,153,0.2)",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#34d399",
                boxShadow: "0 0 8px rgba(52,211,153,0.8)",
                animation: "tickerPulse 2s ease-in-out infinite",
              }} />
              <span style={{
                fontSize: 10, fontWeight: 900, color: "#34d399",
                letterSpacing: "0.1em", textTransform: "uppercase",
                fontFamily: "'Inter', sans-serif",
              }}>Auto-refreshing</span>
            </div>
          </div>
        </div>

        {/* ── FILTER CHIPS ────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>

          {/* Type filters */}
          <div style={{
            display: "flex", gap: 6, flexWrap: "nowrap",
            overflowX: "auto", paddingBottom: 10,
            scrollbarWidth: "none",
          }}>
            {TYPE_FILTERS.map(f => (
              <FilterChip
                key={f.key}
                label={f.label}
                active={activeType === f.key}
                color={f.color}
                count={counts[f.key]}
                onClick={() => setActiveType(f.key)}
              />
            ))}

            {/* Divider */}
            <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.07)", alignSelf: "center", flexShrink: 0, margin: "0 4px" }} />

            {/* League filters */}
            {LEAGUE_FILTERS.map(f => (
              <FilterChip
                key={f.key}
                label={f.label}
                active={activeLeague === f.key}
                color={f.color}
                onClick={() => setActiveLeague(f.key)}
              />
            ))}
          </div>
        </div>

        {/* ── ERROR ───────────────────────────────────────── */}
        {error && (
          <div style={{
            padding: "16px 20px", borderRadius: 14, marginBottom: 24,
            background: "rgba(248,113,113,0.06)",
            border: "1px solid rgba(248,113,113,0.2)",
            fontFamily: "'Inter', sans-serif",
            fontSize: 13, color: "#f87171",
          }}>
            Failed to load intelligence feed: {error}
          </div>
        )}

        {/* ── LOADING SKELETONS ────────────────────────────── */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SkeletonCard height={320} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <SkeletonCard height={240} />
              <SkeletonCard height={240} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <SkeletonCard height={180} />
              <SkeletonCard height={180} />
              <SkeletonCard height={180} />
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── HERO CARD ──────────────────────────────── */}
            {hero && (
              <div className="ni-card-enter" style={{ marginBottom: 40 }}>
                <HeroCard article={hero} />
              </div>
            )}

            {/* ── MATCH PREVIEWS SECTION ─────────────────── */}
            {previews.length > 0 && (
              <div className="ni-card-enter" style={{ marginBottom: 48 }}>
                <SectionHeader
                  title="Match Previews"
                  subtitle="Model-generated fixture analysis with xG and win probability"
                  accent="#38bdf8"
                  count={previews.length}
                />
                <div style={{
                  display: "grid",
                  gridTemplateColumns: previews.length === 1
                    ? "1fr"
                    : previews.length === 2
                      ? "1fr 1fr"
                      : "1.4fr 1fr 1fr",
                  gap: 16,
                }}>
                  {previews.slice(0, 3).map((a, i) => (
                    <div key={a.id || i} className="ni-card-enter" style={{ animationDelay: `${i * 0.08}s` }}>
                      <MatchPreviewCard article={a} size={i === 0 ? "feature" : "standard"} />
                    </div>
                  ))}
                </div>

                {/* Second row if more */}
                {previews.length > 3 && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 16, marginTop: 16,
                  }}>
                    {previews.slice(3, 6).map((a, i) => (
                      <div key={a.id || i} className="ni-card-enter" style={{ animationDelay: `${(i + 3) * 0.08}s` }}>
                        <MatchPreviewCard article={a} size="standard" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── SECTION DIVIDER ────────────────────────── */}
            {previews.length > 0 && insights.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 16,
                marginBottom: 40,
              }}>
                <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(255,255,255,0.06), transparent)" }} />
                <span style={{
                  fontSize: 9, fontWeight: 900, letterSpacing: "0.16em",
                  color: "#1a3a5a", textTransform: "uppercase",
                  fontFamily: "'Inter', sans-serif",
                }}>Model Insights</span>
                <div style={{ flex: 1, height: 1, background: "linear-gradient(270deg, rgba(255,255,255,0.06), transparent)" }} />
              </div>
            )}

            {/* ── MODEL INSIGHTS SECTION ─────────────────── */}
            {insights.length > 0 && (
              <div className="ni-card-enter" style={{ marginBottom: 48 }}>
                <SectionHeader
                  title="Model Insights"
                  subtitle="Statistical patterns and analytical stories from the data"
                  accent="#34d399"
                  count={insights.length}
                />
                <div style={{
                  display: "grid",
                  gridTemplateColumns: insights.length === 1
                    ? "1fr"
                    : "1fr 1fr",
                  gap: 16,
                }}>
                  {insights.slice(0, 4).map((a, i) => (
                    <div key={a.id || i} className="ni-card-enter" style={{ animationDelay: `${i * 0.08}s` }}>
                      <ModelInsightCard
                        article={a}
                        size={i === 0 && insights.length > 2 ? "feature" : "standard"}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TRANSFERS / HEADLINES SECTION ─────────── */}
            {transfers.length > 0 && (
              <div className="ni-card-enter" style={{ marginBottom: 48 }}>
                <SectionHeader
                  title="Latest News"
                  subtitle="Transfers, headlines and breaking stories"
                  accent="#f59e0b"
                  count={transfers.length}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {transfers.slice(0, 8).map((a, i) => (
                    <div key={a.id || i} className="ni-card-enter" style={{ animationDelay: `${i * 0.05}s` }}>
                      <CompactCard article={a} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── EMPTY STATE ────────────────────────────── */}
            {filtered.length === 0 && (
              <EmptyState message="No articles match your current filters" />
            )}
          </>
        )}

      </div>
    </div>
  );
}