// NewsTrackerPage.jsx — StatinSite Football Intelligence v4
// Redesign: media-first hierarchy — news dominates, analytics support
// Layout: Ticker → Hero story → News grid+sidebar → Preview rail → Insight strip → Transfer centre

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const API = "https://football-stats-lw4b.onrender.com";

/* ─────────────────────────────────────────────
   HOOKS
───────────────────────────────────────────── */
function useIsMobile(bp = 768) {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < bp : false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return m;
}

/* ─────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────── */
const LEAGUES = [
  { code: "all",        label: "All",            shortLabel: "All",  color: "#8aa4c0", flag: null },
  { code: "epl",        label: "Premier League", shortLabel: "EPL",  color: "#C8102E", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { code: "laliga",     label: "La Liga",         shortLabel: "LAL",  color: "#F1BF00", flag: "🇪🇸" },
  { code: "seriea",     label: "Serie A",         shortLabel: "SA",   color: "#009246", flag: "🇮🇹" },
  { code: "ligue1",     label: "Ligue 1",         shortLabel: "L1",   color: "#003399", flag: "🇫🇷" },
  { code: "bundesliga", label: "Bundesliga",      shortLabel: "BUN",  color: "#E63329", flag: "🇩🇪" },
  { code: "ucl",        label: "UCL",             shortLabel: "UCL",  color: "#2B6EBE", flag: "★" },
];

const TYPE_CFG = {
  headline:      { label: "News",     short: "NEWS",     color: "#8fb8d8", dot: "#3a6a8a", bg: "rgba(143,184,216,0.07)" },
  match_preview: { label: "Preview",  short: "PREVIEW",  color: "#4f9eff", dot: "#1a5abf", bg: "rgba(79,158,255,0.07)"  },
  transfer:      { label: "Transfer", short: "TRANSFER", color: "#d4a843", dot: "#8a6a10", bg: "rgba(212,168,67,0.07)"  },
  model_insight: { label: "Insight",  short: "INSIGHT",  color: "#3ecf8e", dot: "#0a8a4a", bg: "rgba(62,207,142,0.07)"  },
};

/* ─────────────────────────────────────────────
   ICONS
───────────────────────────────────────────── */
const Icon = {
  News: ({ s = 12 }) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="2" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M4.5 5.5h7M4.5 8h5M4.5 10.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Preview: ({ s = 12 }) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 4.5v4l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Insight: ({ s = 12 }) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M2 12L5.5 7 8.5 9.5 11 5.5 14 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="14" cy="5" r="1.5" fill="currentColor" opacity=".75"/>
    </svg>
  ),
  Transfer: ({ s = 12 }) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <path d="M2.5 5h11M10 2.5l3.5 2.5L10 7.5M13.5 11H2.5M6 8.5L2.5 11 6 13.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Refresh: ({ s = 13, spin = false }) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" style={{ animation: spin ? "ni-spin 0.9s linear infinite" : "none" }}>
      <path d="M13.5 2.5A6.5 6.5 0 1 0 14 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M13.5 2.5V6H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Search: ({ s = 13 }) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  External: ({ s = 10 }) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none">
      <path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M8 1h3v3M11 1L6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Close: ({ s = 14 }) => (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none">
      <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
  Arrow: ({ s = 10 }) => (
    <svg width={s} height={s} viewBox="0 0 10 10" fill="none">
      <path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function timeAgo(iso) {
  if (!iso) return "";
  try {
    const mins = Math.round((Date.now() - new Date(iso)) / 60000);
    if (mins < 2)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    const h = Math.round(mins / 60);
    if (h < 24)    return `${h}h ago`;
    const d = Math.round(h / 24);
    if (d < 7)     return `${d}d ago`;
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch { return ""; }
}

function leagueCfg(code) { return LEAGUES.find(l => l.code === code) || LEAGUES[0]; }
function typeCfg(type)   { return TYPE_CFG[type] || TYPE_CFG.headline; }
function initials(name)  { return (name || "?").split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase(); }

/* ─────────────────────────────────────────────
   PRIMITIVES
───────────────────────────────────────────── */
function SourceBadge({ source }) {
  if (!source) return null;
  return (
    <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: "0.06em", color: "rgba(255,255,255,0.28)", textTransform: "uppercase" }}>
      {source}
    </span>
  );
}

function LeagueTag({ code }) {
  const lg = leagueCfg(code);
  if (!lg || lg.code === "all") return null;
  return (
    <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.08em", color: lg.color, padding: "1px 5px", borderRadius: 3, background: `${lg.color}14`, border: `1px solid ${lg.color}25` }}>
      {lg.flag && `${lg.flag} `}{lg.shortLabel}
    </span>
  );
}

function TypePill({ type }) {
  const cfg = typeCfg(type);
  return (
    <span style={{ fontSize: 7.5, fontWeight: 900, letterSpacing: "0.1em", color: cfg.color, padding: "2px 6px", borderRadius: 3, background: cfg.bg, border: `1px solid ${cfg.color}22` }}>
      {cfg.short}
    </span>
  );
}

function ClubBadge({ name, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.25),
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.27), fontWeight: 900,
      color: "rgba(255,255,255,0.45)", flexShrink: 0, fontFamily: "'DM Mono',monospace",
    }}>{initials(name)}</div>
  );
}

function ProbBar({ home, draw, away, homeLabel, awayLabel }) {
  return (
    <div>
      <div style={{ display: "flex", height: 3, borderRadius: 2, overflow: "hidden", gap: 1 }}>
        <div style={{ flex: home, background: "#3b9eff", minWidth: 2 }}/>
        <div style={{ flex: draw, background: "rgba(255,255,255,0.12)", minWidth: 2 }}/>
        <div style={{ flex: away, background: "#e05a5a", minWidth: 2 }}/>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 9, fontWeight: 800, fontFamily: "'DM Mono',monospace" }}>
        <span style={{ color: "#3b9eff" }}>{homeLabel} {home}%</span>
        <span style={{ color: "rgba(255,255,255,0.18)" }}>D {draw}%</span>
        <span style={{ color: "#e05a5a" }}>{away}% {awayLabel}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LIVE TICKER
───────────────────────────────────────────── */
function LiveTicker({ items }) {
  if (!items.length) return null;
  const doubled = [...items, ...items];
  const dur = Math.max(items.length * 5, 40);
  return (
    <div style={{ overflow: "hidden", height: 30, background: "rgba(255,255,255,0.018)", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", animation: `ni-ticker ${dur}s linear infinite`, whiteSpace: "nowrap" }}>
        {doubled.map((item, i) => {
          const lg = leagueCfg(item.league);
          const cfg = typeCfg(item.type);
          return (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "0 24px", flexShrink: 0 }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: cfg.dot, display: "inline-block", flexShrink: 0 }}/>
              {lg.code !== "all" && <span style={{ fontSize: 8, fontWeight: 900, color: lg.color, letterSpacing: "0.07em" }}>{lg.shortLabel}</span>}
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>{item.title}</span>
              <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.18)", fontFamily: "'DM Mono',monospace" }}>{timeAgo(item.published_at)}</span>
              <span style={{ color: "rgba(255,255,255,0.07)", fontSize: 10 }}>·</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HERO NEWS CARD — image-led, dominant
───────────────────────────────────────────── */
function HeroNewsCard({ article, onClick }) {
  const [hov, setHov] = useState(false);
  const lg = leagueCfg(article.league);
  return (
    <div
      onClick={() => onClick(article)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative", borderRadius: 12, overflow: "hidden", cursor: "pointer", minHeight: 300,
        background: article.image
          ? `linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.92) 100%), url(${article.image}) center/cover`
          : `linear-gradient(140deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.3) 100%)`,
        border: `1px solid ${hov ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)"}`,
        transition: "all 0.22s ease",
        transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? "0 20px 60px rgba(0,0,0,0.6)" : "0 6px 24px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${lg.color}, transparent)` }}/>
      {!article.image && (
        <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.01) 20px, rgba(255,255,255,0.01) 21px)" }}/>
      )}
      <div style={{ position: "relative", padding: "20px 22px 22px", display: "flex", flexDirection: "column", justifyContent: "flex-end", minHeight: 300 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          <TypePill type={article.type}/>
          <LeagueTag code={article.league}/>
          {article.source && <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{article.source}</span>}
        </div>
        <h2 style={{ margin: "0 0 10px", lineHeight: 1.25, fontSize: 20, fontWeight: 900, color: "#f0f6ff", letterSpacing: "-0.02em", textShadow: article.image ? "0 2px 12px rgba(0,0,0,0.8)" : "none" }}>
          {article.title}
        </h2>
        {article.summary && (
          <p style={{ margin: "0 0 14px", fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textShadow: article.image ? "0 1px 6px rgba(0,0,0,0.8)" : "none" }}>
            {article.summary}
          </p>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono',monospace" }}>{timeAgo(article.published_at)}</span>
          <span style={{ fontSize: 9, fontWeight: 800, color: lg.color, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 4 }}>
            READ MORE <Icon.Arrow s={9}/>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NEWS CARD — grid card with thumbnail
───────────────────────────────────────────── */
function NewsCard({ article, onClick }) {
  const [hov, setHov] = useState(false);
  const lg = leagueCfg(article.league);
  return (
    <div
      onClick={() => onClick(article)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 10, overflow: "hidden", cursor: "pointer",
        background: hov ? "rgba(255,255,255,0.038)" : "rgba(255,255,255,0.022)",
        border: `1px solid ${hov ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.06)"}`,
        transition: "all 0.16s ease", transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? "0 10px 30px rgba(0,0,0,0.4)" : "none",
      }}
    >
      <div style={{ height: 2, background: `linear-gradient(90deg,${lg.color}55,transparent)` }}/>
      {article.image && (
        <div style={{ height: 116, overflow: "hidden", background: "rgba(255,255,255,0.02)" }}>
          <img src={article.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: hov ? 0.88 : 0.72, transition: "opacity 0.2s" }} onError={e => { e.target.parentElement.style.display = "none"; }}/>
        </div>
      )}
      <div style={{ padding: "11px 13px 13px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
          <LeagueTag code={article.league}/>
          <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.18)", fontFamily: "'DM Mono',monospace", marginLeft: "auto" }}>{timeAgo(article.published_at)}</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#d8e8ff", lineHeight: 1.38, marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {article.title}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <SourceBadge source={article.source}/>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NEWS ROW — compact sidebar item
───────────────────────────────────────────── */
function NewsRow({ article, onClick, rank }) {
  const [hov, setHov] = useState(false);
  const lg = leagueCfg(article.league);
  return (
    <div
      onClick={() => onClick(article)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display: "flex", gap: 10, padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", transition: "opacity 0.14s", opacity: hov ? 1 : 0.72 }}
    >
      {rank && <div style={{ fontSize: 11, fontWeight: 900, color: "rgba(255,255,255,0.1)", fontFamily: "'DM Mono',monospace", minWidth: 18, paddingTop: 1 }}>{rank}</div>}
      <div style={{ width: 3, borderRadius: 2, background: lg.color, flexShrink: 0, minHeight: 38, alignSelf: "stretch" }}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#c8d8f0", lineHeight: 1.35, marginBottom: 5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {article.title}
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          <SourceBadge source={article.source}/>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.12)" }}>·</span>
          <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.16)", fontFamily: "'DM Mono',monospace" }}>{timeAgo(article.published_at)}</span>
        </div>
      </div>
      {article.image && (
        <div style={{ width: 56, height: 42, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.02)" }}>
          <img src={article.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.65 }} onError={e => { e.target.parentElement.style.display = "none"; }}/>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PREVIEW CARD — compact fixture
───────────────────────────────────────────── */
function PreviewCard({ article, onClick }) {
  const [hov, setHov] = useState(false);
  const cfg = typeCfg("match_preview");
  const m   = article.meta || {};
  return (
    <div
      onClick={() => onClick(article)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 10, padding: "14px 16px", cursor: "pointer",
        background: hov ? "rgba(79,158,255,0.07)" : "rgba(79,158,255,0.035)",
        border: `1px solid ${hov ? "rgba(79,158,255,0.22)" : "rgba(79,158,255,0.1)"}`,
        transition: "all 0.15s ease", transform: hov ? "translateY(-1px)" : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <LeagueTag code={article.league}/>
        <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono',monospace" }}>{m.fixture_date || "Upcoming"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <ClubBadge name={m.home_team} size={30}/>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#d0e0f8", textAlign: "center", lineHeight: 1.2 }}>{m.home_team}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: "#1a3a5a", letterSpacing: "0.1em" }}>VS</span>
          {m.confidence && <span style={{ fontSize: 9, fontWeight: 800, color: cfg.color, padding: "2px 6px", borderRadius: 4, background: "rgba(79,158,255,0.1)" }}>{m.confidence}%</span>}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <ClubBadge name={m.away_team} size={30}/>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#d0e0f8", textAlign: "center", lineHeight: 1.2 }}>{m.away_team}</span>
        </div>
      </div>
      {m.home_win != null && (
        <ProbBar home={m.home_win} draw={m.draw} away={m.away_win}
          homeLabel={(m.home_team || "").split(" ").pop()} awayLabel={(m.away_team || "").split(" ").pop()}/>
      )}
      {(m.xg_home != null || m.xg_away != null) && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 9, fontFamily: "'DM Mono',monospace" }}>
          <span style={{ color: "#2a5a8a" }}>xG {m.xg_home}</span>
          <span style={{ fontSize: 8, color: "#1a3050", letterSpacing: "0.08em" }}>EXPECTED GOALS</span>
          <span style={{ color: "#2a5a8a" }}>{m.xg_away} xG</span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   INSIGHT CARD
───────────────────────────────────────────── */
function InsightCard({ article, onClick }) {
  const [hov, setHov] = useState(false);
  const cfg = typeCfg("model_insight");
  const m   = article.meta || {};
  return (
    <div
      onClick={() => onClick(article)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 10, padding: "14px 16px", cursor: "pointer",
        background: hov ? "rgba(62,207,142,0.06)" : "rgba(62,207,142,0.03)",
        border: `1px solid ${hov ? "rgba(62,207,142,0.2)" : "rgba(62,207,142,0.09)"}`,
        transition: "all 0.15s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 7.5, fontWeight: 900, color: "#0a6a3a", letterSpacing: "0.12em", marginBottom: 4 }}>STATINSITE MODEL</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#d0f0e0", lineHeight: 1.2 }}>{article.title}</div>
        </div>
        <LeagueTag code={article.league}/>
      </div>
      {m.insight_type === "title_race" && m.leader && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, background: "rgba(62,207,142,0.06)", border: "1px solid rgba(62,207,142,0.1)" }}>
          <div>
            <div style={{ fontSize: 8, color: cfg.dot, fontWeight: 900, letterSpacing: "0.1em", marginBottom: 3 }}>LEADER</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#e8f8f0" }}>{m.leader}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>+{m.gap} pts ahead of {m.second}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 8, color: cfg.dot, fontWeight: 900, letterSpacing: "0.1em", marginBottom: 2 }}>PTS</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: cfg.color, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{m.leader_pts}</div>
          </div>
        </div>
      )}
      {article.summary && (
        <p style={{ margin: "10px 0 0", fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.55 }}>{article.summary}</p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TRANSFER CARD
───────────────────────────────────────────── */
function TransferCard({ article, onClick }) {
  const [hov, setHov] = useState(false);
  const cfg = typeCfg("transfer");
  const m   = article.meta || {};
  return (
    <div
      onClick={() => onClick(article)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "13px 15px",
        borderRadius: 10, cursor: "pointer",
        background: hov ? "rgba(212,168,67,0.07)" : "rgba(212,168,67,0.03)",
        border: `1px solid ${hov ? "rgba(212,168,67,0.2)" : "rgba(212,168,67,0.09)"}`,
        transition: "all 0.15s ease", transform: hov ? "translateX(2px)" : "none",
      }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {article.image ? (
          <img src={article.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }}/>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 900, color: "rgba(255,255,255,0.35)" }}>{(m.player || article.title || "?")[0]}</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: "#f0e8d0", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {m.player || article.title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#7a6030" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>{m.from_club}</span>
          <span style={{ color: "#4a3a10" }}>→</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100, color: "#c8a840", fontWeight: 800 }}>{m.to_club}</span>
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        {m.fee && m.fee.toLowerCase() !== "n/a" ? (
          <div style={{ fontSize: 9, fontWeight: 900, color: cfg.color, padding: "3px 8px", borderRadius: 5, background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", marginBottom: 4 }}>{m.fee}</div>
        ) : (
          <div style={{ fontSize: 8, color: "#4a3a10", fontWeight: 700, marginBottom: 4 }}>CONFIRMED</div>
        )}
        <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.18)", fontFamily: "'DM Mono',monospace" }}>{timeAgo(article.published_at)}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SECTION HEADER
───────────────────────────────────────────── */
function SectionHeader({ label, count, color, icon: Ic }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, marginTop: 32 }}>
      <div style={{ width: 3, height: 14, borderRadius: 2, background: color || "rgba(255,255,255,0.25)", flexShrink: 0 }}/>
      {Ic && <span style={{ color: color || "rgba(255,255,255,0.4)" }}><Ic s={11}/></span>}
      <span style={{ fontSize: 9, fontWeight: 900, color: color || "rgba(255,255,255,0.4)", letterSpacing: "0.16em" }}>{label}</span>
      {count != null && <span style={{ fontSize: 8.5, fontWeight: 700, color: "rgba(255,255,255,0.12)", fontFamily: "'DM Mono',monospace" }}>({count})</span>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SKELETONS
───────────────────────────────────────────── */
function Sk({ w = "100%", h = 14, r = 4, mb = 0 }) {
  return <div className="ni-shimmer" style={{ width: w, height: h, borderRadius: r, marginBottom: mb }}/>;
}
function SkeletonHero()    { return <div style={{ borderRadius: 12, overflow: "hidden", height: 300 }}><div className="ni-shimmer" style={{ height: "100%" }}/></div>; }
function SkeletonNewsCard() {
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <Sk h={116} r={0}/><div style={{ padding: "11px 13px 13px" }}><Sk h={8} w="40%" mb={8}/><Sk h={13} mb={5}/><Sk h={13} w="80%" mb={8}/><Sk h={8} w="30%"/></div>
    </div>
  );
}
function SkeletonPreview() {
  return <div style={{ borderRadius: 10, padding: "14px 16px", background: "rgba(79,158,255,0.03)", border: "1px solid rgba(79,158,255,0.08)" }}><Sk h={8} w="35%" mb={12}/><Sk h={30} mb={12}/><Sk h={3} mb={8}/><Sk h={8} w="80%"/></div>;
}

/* ─────────────────────────────────────────────
   ARTICLE DRAWER
───────────────────────────────────────────── */
function ArticleDrawer({ article, onClose }) {
  const cfg = typeCfg(article.type);
  const m   = article.meta || {};

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40, backdropFilter: "blur(4px)" }}/>
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: Math.min(440, window.innerWidth), background: "#080e18", borderLeft: "1px solid rgba(255,255,255,0.08)", zIndex: 50, overflowY: "auto", animation: "ni-slideIn 0.22s ease", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 3, background: `linear-gradient(90deg,${cfg.color},${cfg.color}30)`, flexShrink: 0 }}/>
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <TypePill type={article.type}/>
              <LeagueTag code={article.league}/>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: 4 }}>
              <Icon.Close s={14}/>
            </button>
          </div>
        </div>
        <div style={{ padding: "20px 20px 40px", flex: 1 }}>
          {article.image && (
            <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 18, height: 180 }}>
              <img src={article.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.parentElement.style.display = "none"; }}/>
            </div>
          )}
          <h2 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 900, color: "#f0f6ff", lineHeight: 1.25, letterSpacing: "-0.015em" }}>{article.title}</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
            <SourceBadge source={article.source}/>
            <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.15)", fontFamily: "'DM Mono',monospace" }}>{timeAgo(article.published_at)}</span>
          </div>
          {article.summary && <p style={{ margin: "0 0 20px", fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.65 }}>{article.summary}</p>}

          {article.type === "match_preview" && m.home_team && (
            <div style={{ borderRadius: 10, padding: 16, background: "rgba(79,158,255,0.05)", border: "1px solid rgba(79,158,255,0.12)", marginBottom: 18 }}>
              <div style={{ fontSize: 8, fontWeight: 900, color: "#1a4a7a", letterSpacing: "0.12em", marginBottom: 14 }}>MATCH ANALYSIS</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}><ClubBadge name={m.home_team} size={38}/><span style={{ fontSize: 11, fontWeight: 900, color: "#e8f0ff", textAlign: "center" }}>{m.home_team}</span></div>
                <div style={{ fontSize: 10, fontWeight: 900, color: "#1a3a5a" }}>VS</div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}><ClubBadge name={m.away_team} size={38}/><span style={{ fontSize: 11, fontWeight: 900, color: "#e8f0ff", textAlign: "center" }}>{m.away_team}</span></div>
              </div>
              <ProbBar home={m.home_win} draw={m.draw} away={m.away_win}
                homeLabel={(m.home_team || "").split(" ").pop()} awayLabel={(m.away_team || "").split(" ").pop()}/>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginTop: 14 }}>
                {[
                  { l: "xG HOME", v: m.xg_home, c: "#3b9eff" },
                  { l: "xG AWAY", v: m.xg_away, c: "#e05a5a" },
                  { l: "CONFIDENCE", v: `${m.confidence}%`, c: "#4f9eff" },
                  { l: "PREDICTION", v: (m.prediction || "—").split("(")[0].trim(), c: "#c8d8f0" },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ padding: "9px 11px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 7.5, fontWeight: 900, color: "#1a3a5a", letterSpacing: "0.1em", marginBottom: 3 }}>{l}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: c, fontFamily: "'DM Mono',monospace" }}>{v}</div>
                  </div>
                ))}
              </div>
              {article.url?.startsWith("/") && (
                <a href={article.url} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, padding: "10px 0", borderRadius: 8, background: "rgba(79,158,255,0.08)", border: "1px solid rgba(79,158,255,0.2)", color: "#4f9eff", fontSize: 11, fontWeight: 800, textDecoration: "none", letterSpacing: "0.05em" }}>Full Predictions →</a>
              )}
            </div>
          )}

          {article.type === "model_insight" && m.insight_type === "title_race" && m.leader && (
            <div style={{ borderRadius: 10, padding: 16, background: "rgba(62,207,142,0.04)", border: "1px solid rgba(62,207,142,0.1)", marginBottom: 18 }}>
              <div style={{ fontSize: 8, fontWeight: 900, color: "#0a5a2a", letterSpacing: "0.12em", marginBottom: 14 }}>TITLE RACE ANALYSIS</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
                <div><div style={{ fontSize: 9, color: "#3ecf8e", fontWeight: 800, marginBottom: 2 }}>LEADER</div><div style={{ fontSize: 18, fontWeight: 900, color: "#e8f8f0" }}>{m.leader}</div></div>
                <div style={{ fontSize: 36, fontWeight: 900, color: "#3ecf8e", fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{m.leader_pts}</div>
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>+{m.gap} points clear of {m.second}</div>
              {article.url?.startsWith("/") && (
                <a href={article.url} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, padding: "10px 0", borderRadius: 8, background: "rgba(62,207,142,0.07)", border: "1px solid rgba(62,207,142,0.16)", color: "#3ecf8e", fontSize: 11, fontWeight: 800, textDecoration: "none", letterSpacing: "0.05em" }}>View Predictions →</a>
              )}
            </div>
          )}

          {article.type === "transfer" && m.player && (
            <div style={{ borderRadius: 10, padding: 16, background: "rgba(212,168,67,0.05)", border: "1px solid rgba(212,168,67,0.12)", marginBottom: 18 }}>
              <div style={{ fontSize: 8, fontWeight: 900, color: "#6a4a10", letterSpacing: "0.12em", marginBottom: 14 }}>TRANSFER DETAILS</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#f0e8d0", marginBottom: 8 }}>{m.player}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#7a6030", marginBottom: 12 }}>
                <span>{m.from_club}</span><Icon.Transfer s={10}/><span style={{ color: "#c8a840", fontWeight: 800 }}>{m.to_club}</span>
              </div>
              {m.fee && m.fee.toLowerCase() !== "n/a" && (
                <div style={{ display: "inline-flex", padding: "4px 12px", borderRadius: 6, background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.2)", fontSize: 12, fontWeight: 800, color: "#d4a843" }}>{m.fee}</div>
              )}
            </div>
          )}

          {article.url && !article.url.startsWith("/") && (
            <a href={article.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px 0", borderRadius: 9, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#4a7a9a", fontSize: 12, fontWeight: 800, textDecoration: "none", letterSpacing: "0.04em" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#7aaac8"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = "#4a7a9a"; }}>
              Read Full Story <Icon.External s={11}/>
            </a>
          )}
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function NewsTrackerPage() {
  const isMobile = useIsMobile();

  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [league,   setLeague]   = useState("all");
  const [typeFilter, setType]   = useState("all");
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState(null);
  const [genAt,    setGenAt]    = useState(null);
  const searchRef = useRef(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/api/intelligence/feed`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setItems(data.items || []);
      setGenAt(data.generated_at || null);
    } catch (e) { setError(e.message); }
    finally     { setLoading(false); }
  }, []);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  useEffect(() => {
    const h = e => {
      if (e.key === "/" && !selected && document.activeElement !== searchRef.current) {
        e.preventDefault(); searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selected]);

  const filtered = useMemo(() => items.filter(item => {
    if (league !== "all" && item.league !== league) return false;
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!item.title?.toLowerCase().includes(q) && !item.summary?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [items, league, typeFilter, search]);

  const headlines = filtered.filter(i => i.type === "headline");
  const previews  = filtered.filter(i => i.type === "match_preview");
  const insights  = filtered.filter(i => i.type === "model_insight");
  const transfers = filtered.filter(i => i.type === "transfer");

  const heroStory = headlines.find(h => h.image) || headlines[0] || null;
  const newsGrid  = headlines.filter(h => h !== heroStory);

  const showContent = !loading && filtered.length > 0;

  const TYPE_FILTERS = [
    { code: "all",           label: "All",       Icon: null },
    { code: "headline",      label: "News",       Icon: Icon.News },
    { code: "match_preview", label: "Previews",   Icon: Icon.Preview },
    { code: "model_insight", label: "Insights",   Icon: Icon.Insight },
    { code: "transfer",      label: "Transfers",  Icon: Icon.Transfer },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#050a12", color: "#e8f0ff", fontFamily: "'DM Mono','JetBrains Mono',monospace" }}>
      <style>{`
        @keyframes ni-spin    { to { transform: rotate(360deg) } }
        @keyframes ni-slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes ni-ticker  { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        @keyframes ni-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        .ni-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,.025) 25%, rgba(255,255,255,.055) 50%, rgba(255,255,255,.025) 75%);
          background-size: 200% 100%; animation: ni-shimmer 1.6s linear infinite;
          border-radius: 4px; display: block;
        }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.06); border-radius: 2px }
      `}</style>

      {selected && <ArticleDrawer article={selected} onClose={() => setSelected(null)}/>}
      {!loading && items.length > 0 && <LiveTicker items={items.slice(0, 16)}/>}

      <div style={{ maxWidth: 1300, margin: "0 auto", padding: isMobile ? "16px 14px 88px" : "26px 28px 56px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: "0.24em", color: "rgba(255,255,255,0.1)", marginBottom: 5 }}>STATINSITE · INTELLIGENCE HUB</div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 23, fontWeight: 900, color: "#e8f4ff", letterSpacing: "-0.03em", lineHeight: 1 }}>Football Intelligence</h1>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.18)", pointerEvents: "none" }}><Icon.Search s={11}/></div>
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder={isMobile ? "Search…" : "Search  /"}
                style={{ width: isMobile ? 110 : 170, padding: "7px 10px 7px 26px", borderRadius: 7, fontSize: isMobile ? 16 : 11, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "#e8f0ff", outline: "none", fontFamily: "inherit", minHeight: 32 }}
                onFocus={e => { e.target.style.borderColor = "rgba(79,158,255,0.35)"; }}
                onBlur={e  => { e.target.style.borderColor = "rgba(255,255,255,0.07)"; }}
              />
            </div>
            <button onClick={fetchFeed} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 7, fontSize: 11, fontWeight: 800, cursor: loading ? "default" : "pointer", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: loading ? "#1a3050" : "#3a6a8a", fontFamily: "inherit", minHeight: 32 }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.color = "#4f9eff"; }}
              onMouseLeave={e => { e.currentTarget.style.color = loading ? "#1a3050" : "#3a6a8a"; }}>
              <Icon.Refresh s={12} spin={loading}/>
              {!isMobile && (loading ? "Loading" : "Refresh")}
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 6 : 10, marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 3, flexShrink: 0 }}>
            {TYPE_FILTERS.map(({ code, label, Icon: Ic }) => {
              const active = typeFilter === code;
              return (
                <button key={code} onClick={() => setType(code)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 6, fontSize: 9.5, fontWeight: 800, cursor: "pointer", background: active ? "rgba(255,255,255,0.08)" : "transparent", border: "none", color: active ? "#c8d8f0" : "#2a4a6a", fontFamily: "inherit", minHeight: 28, transition: "all 0.12s ease", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
                  {Ic && <Ic s={9}/>}{label}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 4, flex: 1, overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {LEAGUES.map(lg => {
              const active = league === lg.code;
              return (
                <button key={lg.code} onClick={() => setLeague(lg.code)} style={{ display: "flex", alignItems: "center", gap: 3, padding: "4px 10px", borderRadius: 999, flexShrink: 0, fontSize: 9.5, fontWeight: 800, cursor: "pointer", background: active ? `${lg.color}12` : "transparent", border: `1px solid ${active ? lg.color + "40" : "rgba(255,255,255,0.06)"}`, color: active ? lg.color : "#2a4a6a", fontFamily: "inherit", minHeight: 28, transition: "all 0.12s ease", whiteSpace: "nowrap" }}>
                  {lg.flag && lg.code !== "all" && <span style={{ fontSize: 9 }}>{lg.flag}</span>}
                  {isMobile && lg.code !== "all" ? lg.shortLabel : lg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 9, marginBottom: 20, background: "rgba(255,60,80,0.06)", border: "1px solid rgba(255,60,80,0.12)", fontSize: 11, color: "#ff5560" }}>
            Feed unavailable ({error}). Backend may be starting up — try refreshing in 30s.
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: 12, marginBottom: 28 }}>
              <SkeletonHero/>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>{[0,1,2].map(i => <SkeletonNewsCard key={i}/>)}</div>
            </div>
            <SectionHeader label="MATCH PREVIEWS" color={TYPE_CFG.match_preview.color}/>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 10, marginBottom: 24 }}>
              {[0,1,2].map(i => <SkeletonPreview key={i}/>)}
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && filtered.length === 0 && !error && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: 32, color: "rgba(255,255,255,0.05)", marginBottom: 12 }}>◌</div>
            <div style={{ fontSize: 12, color: "#1a3a5a" }}>No items match these filters.</div>
          </div>
        )}

        {/* ══ CONTENT — MEDIA-FIRST HIERARCHY ══ */}
        {showContent && (
          <>
            {/* 1. LATEST NEWS — hero + grid + sidebar */}
            {(heroStory || newsGrid.length > 0) && (typeFilter === "all" || typeFilter === "headline") && (
              <>
                <SectionHeader label="LATEST NEWS" count={headlines.length} color={TYPE_CFG.headline.color} icon={Icon.News}/>
                {isMobile ? (
                  <div>
                    {heroStory && <div style={{ marginBottom: 10 }}><HeroNewsCard article={heroStory} onClick={setSelected}/></div>}
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      {newsGrid.slice(0, 8).map((item, i) => <NewsRow key={item.id} article={item} onClick={setSelected} rank={i + 2}/>)}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
                    <div>
                      {heroStory && <div style={{ marginBottom: 14 }}><HeroNewsCard article={heroStory} onClick={setSelected}/></div>}
                      {newsGrid.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                          {newsGrid.slice(0, 6).map(item => <NewsCard key={item.id} article={item} onClick={setSelected}/>)}
                        </div>
                      )}
                    </div>
                    <div style={{ borderLeft: "1px solid rgba(255,255,255,0.05)", paddingLeft: 18 }}>
                      <div style={{ fontSize: 8.5, fontWeight: 900, color: "rgba(255,255,255,0.15)", letterSpacing: "0.16em", marginBottom: 2 }}>MORE STORIES</div>
                      {newsGrid.slice(6, 24).map((item, i) => <NewsRow key={item.id} article={item} onClick={setSelected} rank={i + 8}/>)}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* 2. MATCH PREVIEWS — compact 4-col rail */}
            {previews.length > 0 && (typeFilter === "all" || typeFilter === "match_preview") && (
              <>
                <SectionHeader label="MATCH PREVIEWS" count={previews.length} color={TYPE_CFG.match_preview.color} icon={Icon.Preview}/>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 9 }}>
                  {previews.map(item => <PreviewCard key={item.id} article={item} onClick={setSelected}/>)}
                </div>
              </>
            )}

            {/* 3. MODEL INSIGHTS — 3-col strip */}
            {insights.length > 0 && (typeFilter === "all" || typeFilter === "model_insight") && (
              <>
                <SectionHeader label="MODEL INSIGHTS" count={insights.length} color={TYPE_CFG.model_insight.color} icon={Icon.Insight}/>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 9 }}>
                  {insights.map(item => <InsightCard key={item.id} article={item} onClick={setSelected}/>)}
                </div>
              </>
            )}

            {/* 4. TRANSFER CENTRE — 2-col */}
            {transfers.length > 0 && (typeFilter === "all" || typeFilter === "transfer") && (
              <>
                <SectionHeader label="TRANSFER CENTRE" count={transfers.length} color={TYPE_CFG.transfer.color} icon={Icon.Transfer}/>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,1fr)", gap: 7 }}>
                  {transfers.map(item => <TransferCard key={item.id} article={item} onClick={setSelected}/>)}
                </div>
              </>
            )}
          </>
        )}

        {/* Footer */}
        {!loading && items.length > 0 && (
          <div style={{ marginTop: 44, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", fontSize: 8.5, color: "#0e2035", fontWeight: 700, letterSpacing: "0.08em" }}>
            <span>{filtered.length} item{filtered.length !== 1 ? "s" : ""}{filtered.length !== items.length ? ` of ${items.length}` : ""}</span>
            {genAt && <span>Updated {timeAgo(genAt)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}