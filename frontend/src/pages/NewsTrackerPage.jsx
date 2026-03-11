// NewsTrackerPage.jsx — StatinSite Intelligence Hub  v3
// Premium redesign: FotMob/SofaScore command-center aesthetic
// Layout: Hero preview card · Scrolling ticker · Insight rails ·
//         Type-differentiated card system · Slide-in detail panel

import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const API = "https://football-stats-lw4b.onrender.com";

/* ──────────────────────────────────────────────────────────────
   HOOKS
────────────────────────────────────────────────────────────── */
function useIsMobile(bp = 768) {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < bp : false);
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return m;
}

/* ──────────────────────────────────────────────────────────────
   STATIC CONFIG
────────────────────────────────────────────────────────────── */
const LEAGUES = [
  { code: "all",        label: "All",              color: "#c8d8f0",  shortLabel: "All" },
  { code: "epl",        label: "Premier League",   color: "#C8102E",  shortLabel: "EPL",   flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { code: "laliga",     label: "La Liga",           color: "#F1BF00",  shortLabel: "LAL",   flag: "🇪🇸" },
  { code: "seriea",     label: "Serie A",           color: "#009246",  shortLabel: "SA",    flag: "🇮🇹" },
  { code: "ligue1",     label: "Ligue 1",           color: "#003399",  shortLabel: "L1",    flag: "🇫🇷" },
  { code: "bundesliga", label: "Bundesliga",        color: "#E63329",  shortLabel: "BUN",   flag: "🇩🇪" },
  { code: "ucl",        label: "UCL",               color: "#2B6EBE",  shortLabel: "UCL",   flag: "★" },
];

const TYPE_CFG = {
  headline:      { label: "News",     short: "NEWS",     color: "#a0b8d8", dot: "#4a7a9a",  bg: "rgba(160,184,216,0.06)" },
  match_preview: { label: "Preview",  short: "PREVIEW",  color: "#4f9eff", dot: "#2a6adf",  bg: "rgba(79,158,255,0.07)"  },
  transfer:      { label: "Transfer", short: "TRANSFER", color: "#e8b84b", dot: "#b88a20",  bg: "rgba(232,184,75,0.07)"  },
  model_insight: { label: "Insight",  short: "INSIGHT",  color: "#3ecf8e", dot: "#1a9a5a",  bg: "rgba(62,207,142,0.07)"  },
};

const SORT_OPTIONS = [
  { value: "default",  label: "Relevance" },
  { value: "newest",   label: "Newest" },
  { value: "type",     label: "By Type" },
];

/* ──────────────────────────────────────────────────────────────
   SVG ICONS
────────────────────────────────────────────────────────────── */
const Icon = {
  News: ({ s = 12 }) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="2" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M4.5 5.5h7M4.5 8h5M4.5 10.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Clock: ({ s = 12 }) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 4.5v4l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Chart: ({ s = 12 }) => (
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
  Refresh: ({ s = 12, spin = false }) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none" style={{ animation: spin ? "nt3-spin 0.9s linear infinite" : "none" }}>
      <path d="M13.5 2.5A6.5 6.5 0 1 0 14 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M13.5 2.5V6H10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  External: ({ s = 10 }) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none">
      <path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M8 1h3v3M11 1L6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Search: ({ s = 13 }) => (
    <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Close: ({ s = 12 }) => (
    <svg width={s} height={s} viewBox="0 0 12 12" fill="none">
      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Dot: ({ color = "#4a7a9a", pulsing = false }) => (
    <div style={{
      width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0,
      boxShadow: pulsing ? `0 0 0 3px ${color}35` : "none",
      animation: pulsing ? "nt3-pulse 1.8s ease-in-out infinite" : "none",
    }}/>
  ),
};

/* ──────────────────────────────────────────────────────────────
   HELPERS
────────────────────────────────────────────────────────────── */
function timeAgo(iso) {
  if (!iso) return "";
  try {
    const mins = Math.round((Date.now() - new Date(iso)) / 60000);
    if (mins < 2)   return "just now";
    if (mins < 60)  return `${mins}m ago`;
    const h = Math.round(mins / 60);
    if (h < 24)     return `${h}h ago`;
    const d = Math.round(h / 24);
    if (d < 7)      return `${d}d ago`;
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch { return ""; }
}

function leagueCfg(code) { return LEAGUES.find(l => l.code === code) || LEAGUES[0]; }
function typeCfg(type)   { return TYPE_CFG[type] || TYPE_CFG.headline; }

function initials(name) {
  return (name || "?").split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase();
}

/* ──────────────────────────────────────────────────────────────
   PRIMITIVE COMPONENTS
────────────────────────────────────────────────────────────── */

// Thin type label — no box, just a colored dot + text
function TypeTag({ type, compact = false }) {
  const cfg = typeCfg(type);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }}/>
      <span style={{
        fontSize: compact ? 8 : 9, fontWeight: 800, color: cfg.color,
        letterSpacing: "0.1em", lineHeight: 1,
      }}>{cfg.short}</span>
    </div>
  );
}

// League pill — colored stroke
function LeaguePill({ code, size = "sm" }) {
  const lg = leagueCfg(code);
  if (!lg || lg.code === "all") return null;
  const small = size === "sm";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: small ? "1px 6px" : "3px 9px",
      borderRadius: 999,
      border: `1px solid ${lg.color}38`,
      fontSize: small ? 8 : 9, fontWeight: 800,
      color: lg.color, letterSpacing: "0.04em",
    }}>
      {lg.flag && <span style={{ fontSize: small ? 9 : 10 }}>{lg.flag}</span>}
      {lg.shortLabel}
    </div>
  );
}

// Club initials badge
function ClubBadge({ name, size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.28),
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.09)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.28), fontWeight: 900,
      color: "rgba(255,255,255,0.5)", flexShrink: 0,
      fontFamily: "'DM Mono',monospace", letterSpacing: "-0.01em",
    }}>{initials(name)}</div>
  );
}

// Probability bar — 3-section segmented
function ProbBar({ home, draw, away, homeLabel, awayLabel, compact = false }) {
  const H = compact ? 3 : 4;
  return (
    <div>
      <div style={{ display: "flex", height: H, borderRadius: 2, overflow: "hidden", gap: 1 }}>
        <div style={{ flex: home, background: "#3b9eff", minWidth: 1 }}/>
        <div style={{ flex: draw, background: "rgba(255,255,255,0.14)", minWidth: 1 }}/>
        <div style={{ flex: away, background: "#e05a5a", minWidth: 1 }}/>
      </div>
      {!compact && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, fontWeight: 800, fontFamily: "'DM Mono',monospace" }}>
          <span style={{ color: "#3b9eff" }}>{homeLabel} {home}%</span>
          <span style={{ color: "rgba(255,255,255,0.22)" }}>D {draw}%</span>
          <span style={{ color: "#e05a5a" }}>{away}% {awayLabel}</span>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   LIVE TICKER
────────────────────────────────────────────────────────────── */
function LiveTicker({ items }) {
  if (!items.length) return null;
  const doubled = [...items, ...items];
  const dur = Math.max(items.length * 4, 30);
  return (
    <div style={{
      overflow: "hidden", height: 32,
      background: "rgba(255,255,255,0.025)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      display: "flex", alignItems: "center",
    }}>
      <div style={{
        display: "flex", alignItems: "center",
        animation: `nt3-ticker ${dur}s linear infinite`,
        whiteSpace: "nowrap",
      }}>
        {doubled.map((item, i) => {
          const cfg = typeCfg(item.type);
          const lg  = leagueCfg(item.league);
          return (
            <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0 28px", flexShrink: 0 }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }}/>
              <span style={{ fontSize: 9, fontWeight: 800, color: lg.color, letterSpacing: "0.06em" }}>{lg.shortLabel}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{item.title}</span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{timeAgo(item.published_at)}</span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.1)", margin: "0 4px" }}>·</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   CARD VARIANTS — each type has its own structure
────────────────────────────────────────────────────────────── */

// HERO — large featured card (match_preview or model_insight)
function HeroCard({ article, onClick }) {
  const [hov, setHov] = useState(false);
  const cfg = typeCfg(article.type);
  const lg  = leagueCfg(article.league);

  return (
    <div
      onClick={() => onClick(article)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative", borderRadius: 14, overflow: "hidden",
        background: hov
          ? `linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)`
          : `linear-gradient(160deg, rgba(255,255,255,0.035) 0%, rgba(0,0,0,0.2) 100%)`,
        border: `1px solid ${hov ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.08)"}`,
        cursor: "pointer",
        transition: "all 0.2s ease",
        transform: hov ? "translateY(-3px)" : "none",
        boxShadow: hov ? `0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px ${cfg.color}18` : "0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      {/* Accent bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}44)` }}/>

      <div style={{ padding: "22px 22px 20px" }}>
        {/* Top meta row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <TypeTag type={article.type}/>
            <LeaguePill code={article.league}/>
          </div>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono',monospace" }}>
            {timeAgo(article.published_at)}
          </span>
        </div>

        {/* Match preview hero layout */}
        {article.type === "match_preview" && article.meta && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 20 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <ClubBadge name={article.meta.home_team} size={44}/>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#e8f0ff", textAlign: "center", lineHeight: 1.2 }}>
                  {article.meta.home_team}
                </div>
                <div style={{ fontSize: 9, color: "#3a5a7a" }}>Home</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "0 16px" }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: "#2a4a6a", letterSpacing: "0.08em" }}>VS</div>
                <div style={{
                  fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 5,
                  background: `${cfg.color}14`, color: cfg.color, letterSpacing: "0.04em",
                }}>{article.meta.fixture_date || "Upcoming"}</div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <ClubBadge name={article.meta.away_team} size={44}/>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#e8f0ff", textAlign: "center", lineHeight: 1.2 }}>
                  {article.meta.away_team}
                </div>
                <div style={{ fontSize: 9, color: "#3a5a7a" }}>Away</div>
              </div>
            </div>

            <ProbBar
              home={article.meta.home_win} draw={article.meta.draw} away={article.meta.away_win}
              homeLabel={(article.meta.home_team || "").split(" ").pop()}
              awayLabel={(article.meta.away_team || "").split(" ").pop()}
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginTop: 14 }}>
              {[
                { lbl: "xG H",      val: article.meta.xg_home,    col: "#3b9eff" },
                { lbl: "CONF",      val: `${article.meta.confidence}%`, col: cfg.color },
                { lbl: "xG A",      val: article.meta.xg_away,    col: "#e05a5a" },
              ].map(({ lbl, val, col }) => (
                <div key={lbl} style={{
                  textAlign: "center", padding: "8px 4px", borderRadius: 8,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ fontSize: 7.5, fontWeight: 900, color: "#2a4a6a", letterSpacing: "0.1em", marginBottom: 3 }}>{lbl}</div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: col, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{val}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
              {article.summary}
            </div>
          </>
        )}

        {/* Model insight hero layout */}
        {article.type === "model_insight" && article.meta && (
          <>
            <h3 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 900, color: "#e8f0ff", lineHeight: 1.3, letterSpacing: "-0.01em" }}>
              {article.title}
            </h3>
            {article.meta.insight_type === "title_race" && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px", borderRadius: 10,
                background: `${cfg.color}0d`, border: `1px solid ${cfg.color}1a`,
                marginBottom: 12,
              }}>
                <div>
                  <div style={{ fontSize: 9, color: cfg.dot, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 4 }}>LEAGUE LEADER</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#e8f0ff" }}>{article.meta.leader}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>+{article.meta.gap} pts ahead of {article.meta.second}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 9, color: cfg.dot, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 4 }}>POINTS</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: cfg.color, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{article.meta.leader_pts}</div>
                </div>
              </div>
            )}
            {article.meta.insight_type === "relegation" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
                {(article.meta.teams || []).map((team, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8,
                    background: "rgba(255,77,77,0.06)", border: "1px solid rgba(255,77,77,0.1)",
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 900, color: "rgba(255,120,100,0.5)", fontFamily: "'DM Mono',monospace", minWidth: 14 }}>#{i + (18 - 2)}</div>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: ["#ff6b6b","#ff9966","#ffbb44"][i], flexShrink: 0 }}/>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#e0c8c0" }}>{team}</span>
                  </div>
                ))}
              </div>
            )}
            <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.6 }}>{article.summary}</p>
          </>
        )}

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize: 9, color: "#2a4060", fontWeight: 700, letterSpacing: "0.04em" }}>{article.source}</span>
          <span style={{ fontSize: 9, fontWeight: 800, color: cfg.color, letterSpacing: "0.04em" }}>
            {article.url?.startsWith("/") ? "View predictions →" : "Open →"}
          </span>
        </div>
      </div>
    </div>
  );
}

// TRANSFER CARD — horizontal layout, club emphasis
function TransferCard({ article, onClick }) {
  const [hov, setHov] = useState(false);
  const cfg = typeCfg("transfer");
  const lg  = leagueCfg(article.league);

  return (
    <div
      onClick={() => onClick(article)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 16px", borderRadius: 11, cursor: "pointer",
        background: hov ? "rgba(232,184,75,0.07)" : "rgba(232,184,75,0.035)",
        border: `1px solid ${hov ? "rgba(232,184,75,0.2)" : "rgba(232,184,75,0.09)"}`,
        transition: "all 0.16s ease",
        transform: hov ? "translateX(2px)" : "none",
      }}
    >
      {/* Player photo or initials */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        {article.image ? (
          <img src={article.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={e => { e.target.style.display = "none"; }}/>
        ) : (
          <span style={{ fontSize: 11, fontWeight: 900, color: "rgba(255,255,255,0.4)" }}>
            {(article.meta?.player || "?")[0]}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <TypeTag type="transfer" compact/>
          <LeaguePill code={article.league} size="xs"/>
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#e8f0ff", lineHeight: 1.2, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {article.meta?.player || article.title}
        </div>
        {article.meta && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#7a6030" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 90 }}>{article.meta.from_club}</span>
            <Icon.Transfer s={8}/>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 90 }}>{article.meta.to_club}</span>
          </div>
        )}
      </div>

      {/* Right side */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        {article.meta?.fee && article.meta.fee.toLowerCase() !== "n/a" && (
          <div style={{
            fontSize: 9, fontWeight: 800, color: cfg.color,
            padding: "2px 7px", borderRadius: 5,
            background: "rgba(232,184,75,0.1)",
            border: "1px solid rgba(232,184,75,0.18)",
            marginBottom: 4, whiteSpace: "nowrap",
          }}>{article.meta.fee}</div>
        )}
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono',monospace" }}>
          {timeAgo(article.published_at)}
        </div>
      </div>
    </div>
  );
}

// HEADLINE CARD — standard news, two sizes: standard and compact
function HeadlineCard({ article, onClick, compact = false }) {
  const [hov, setHov] = useState(false);
  const cfg = typeCfg("headline");
  const lg  = leagueCfg(article.league);

  if (compact) {
    return (
      <div
        onClick={() => onClick(article)}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 0",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          cursor: "pointer", transition: "opacity 0.15s",
          opacity: hov ? 1 : 0.75,
        }}
      >
        <div style={{ width: 3, height: 36, borderRadius: 2, background: lg.color, flexShrink: 0, marginTop: 2 }}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#d0dcf0", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {article.title}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
            <span style={{ fontSize: 8.5, color: "#2a4a6a", fontWeight: 700 }}>{article.source}</span>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.15)" }}>·</span>
            <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.18)", fontFamily: "'DM Mono',monospace" }}>{timeAgo(article.published_at)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onClick(article)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 11, overflow: "hidden", cursor: "pointer",
        background: hov ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${hov ? "rgba(255,255,255,0.11)" : "rgba(255,255,255,0.07)"}`,
        transition: "all 0.16s ease",
        transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? "0 8px 24px rgba(0,0,0,0.35)" : "none",
      }}
    >
      {/* Top color accent */}
      <div style={{ height: 2, background: `linear-gradient(90deg,${lg.color}60,transparent)` }}/>
      {/* Image */}
      {article.image && (
        <div style={{ height: 130, overflow: "hidden", background: "rgba(255,255,255,0.03)" }}>
          <img src={article.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.78, transition: "opacity 0.2s", ...(hov ? { opacity: 0.9 } : {}) }}
            onError={e => { e.target.parentElement.style.display = "none"; }}/>
        </div>
      )}
      <div style={{ padding: "12px 14px 13px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <TypeTag type="headline" compact/>
          <LeaguePill code={article.league}/>
          <span style={{ marginLeft: "auto", fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono',monospace" }}>{timeAgo(article.published_at)}</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#d8e8ff", lineHeight: 1.4, marginBottom: 7, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {article.title}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ fontSize: 9, color: "#2a4060", fontWeight: 700 }}>{article.source}</span>
          <span style={{ fontSize: 9, color: cfg.color, fontWeight: 700 }}>Read →</span>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   SKELETON LOADERS
────────────────────────────────────────────────────────────── */
function SkeletonHero() {
  return (
    <div style={{ borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", padding: "22px 22px 20px" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div className="nt3-shimmer" style={{ width: 60, height: 9, borderRadius: 3 }}/>
        <div className="nt3-shimmer" style={{ width: 40, height: 9, borderRadius: 3 }}/>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 20 }}>
        {[0,1,2].map(i => <div key={i} className="nt3-shimmer" style={{ width: 48, height: 48, borderRadius: 10 }}/>)}
      </div>
      <div className="nt3-shimmer" style={{ height: 4, borderRadius: 2, marginBottom: 14 }}/>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
        {[0,1,2].map(i => <div key={i} className="nt3-shimmer" style={{ height: 44, borderRadius: 8 }}/>)}
      </div>
    </div>
  );
}
function SkeletonCard() {
  return (
    <div style={{ borderRadius: 11, overflow: "hidden", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="nt3-shimmer" style={{ height: 2 }}/>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div className="nt3-shimmer" style={{ width: 48, height: 8, borderRadius: 2 }}/>
          <div className="nt3-shimmer" style={{ width: 32, height: 8, borderRadius: 2 }}/>
        </div>
        <div className="nt3-shimmer" style={{ height: 14, borderRadius: 3, marginBottom: 6 }}/>
        <div className="nt3-shimmer" style={{ height: 14, width: "75%", borderRadius: 3, marginBottom: 6 }}/>
        <div className="nt3-shimmer" style={{ height: 10, width: "40%", borderRadius: 3 }}/>
      </div>
    </div>
  );
}
function SkeletonTransfer() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 11, background: "rgba(232,184,75,0.025)", border: "1px solid rgba(232,184,75,0.06)" }}>
      <div className="nt3-shimmer" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }}/>
      <div style={{ flex: 1 }}>
        <div className="nt3-shimmer" style={{ height: 9, width: "30%", borderRadius: 2, marginBottom: 6 }}/>
        <div className="nt3-shimmer" style={{ height: 13, borderRadius: 2, marginBottom: 5 }}/>
        <div className="nt3-shimmer" style={{ height: 10, width: "60%", borderRadius: 2 }}/>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   ARTICLE DRAWER — slide-in detail panel
────────────────────────────────────────────────────────────── */
function ArticleDrawer({ article, onClose }) {
  const cfg = typeCfg(article?.type);
  const lg  = leagueCfg(article?.league);

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  if (!article) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(10px)" }}/>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative", zIndex: 1,
          width: "min(580px,100vw)", height: "100%",
          background: "#040810",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          overflowY: "auto", display: "flex", flexDirection: "column",
          animation: "nt3-slideIn 0.28s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* Accent bar */}
        <div style={{ height: 2, background: `linear-gradient(90deg,${cfg.color},${cfg.color}33)`, flexShrink: 0 }}/>

        <div style={{ padding: "22px 26px 44px", flex: 1 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <TypeTag type={article.type}/>
              <LeaguePill code={article.league} size="md"/>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono',monospace" }}>
                {timeAgo(article.published_at)}
              </span>
            </div>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              color: "#4a6a8a", cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#c8d8f0"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#4a6a8a"; }}
            ><Icon.Close s={11}/></button>
          </div>

          {/* Image */}
          {article.image && (
            <div style={{ borderRadius: 11, overflow: "hidden", marginBottom: 22, height: 200, background: "rgba(255,255,255,0.03)" }}>
              <img src={article.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }}
                onError={e => { e.target.parentElement.style.display = "none"; }}/>
            </div>
          )}

          {/* Title */}
          <h2 style={{ margin: "0 0 14px", fontSize: 20, fontWeight: 900, color: "#f0f6ff", lineHeight: 1.3, letterSpacing: "-0.015em" }}>
            {article.title}
          </h2>

          {/* Source row */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 22, paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: cfg.color, padding: "2px 8px", borderRadius: 4, background: cfg.bg, border: `1px solid ${cfg.color}22` }}>
              {cfg.short}
            </div>
            <span style={{ fontSize: 10, color: "#3a5870", fontWeight: 700 }}>{article.source}</span>
          </div>

          {/* Summary */}
          <p style={{ margin: "0 0 24px", fontSize: 13, color: "rgba(255,255,255,0.58)", lineHeight: 1.75 }}>
            {article.summary}
          </p>

          {/* Type-specific analytics panels */}
          {article.type === "match_preview" && article.meta && (
            <div style={{ borderRadius: 12, padding: 18, background: "rgba(79,158,255,0.05)", border: "1px solid rgba(79,158,255,0.12)", marginBottom: 22 }}>
              <div style={{ fontSize: 8.5, fontWeight: 900, color: "#2a4a6a", letterSpacing: "0.14em", marginBottom: 16 }}>MODEL OUTPUT</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <ClubBadge name={article.meta.home_team} size={36}/>
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#e8f0ff", textAlign: "center" }}>{article.meta.home_team}</div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 900, color: "#2a4a6a", padding: "3px 9px", borderRadius: 5, background: "rgba(255,255,255,0.03)" }}>VS</div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <ClubBadge name={article.meta.away_team} size={36}/>
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#e8f0ff", textAlign: "center" }}>{article.meta.away_team}</div>
                </div>
              </div>
              <ProbBar
                home={article.meta.home_win} draw={article.meta.draw} away={article.meta.away_win}
                homeLabel={(article.meta.home_team || "").split(" ").pop()}
                awayLabel={(article.meta.away_team || "").split(" ").pop()}
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginTop: 14 }}>
                {[
                  { l: "xG HOME",    v: article.meta.xg_home,    c: "#3b9eff" },
                  { l: "xG AWAY",    v: article.meta.xg_away,    c: "#e05a5a" },
                  { l: "CONFIDENCE", v: `${article.meta.confidence}%`, c: cfg.color },
                  { l: "PREDICTION", v: (article.meta.prediction || "").split("(")[0].trim(), c: "#c8d8f0" },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ padding: "9px 11px", borderRadius: 9, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 8, fontWeight: 900, color: "#2a4060", letterSpacing: "0.1em", marginBottom: 3 }}>{l}</div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: c, fontFamily: "'DM Mono',monospace" }}>{v}</div>
                  </div>
                ))}
              </div>
              {article.url?.startsWith("/") && (
                <a href={article.url} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, padding: "10px 0", borderRadius: 9, background: "rgba(79,158,255,0.09)", border: "1px solid rgba(79,158,255,0.2)", color: "#4f9eff", fontSize: 11, fontWeight: 800, textDecoration: "none", letterSpacing: "0.05em" }}>
                  View Full Predictions
                </a>
              )}
            </div>
          )}

          {article.type === "transfer" && article.meta && (
            <div style={{ borderRadius: 12, padding: 18, background: "rgba(232,184,75,0.05)", border: "1px solid rgba(232,184,75,0.12)", marginBottom: 22 }}>
              <div style={{ fontSize: 8.5, fontWeight: 900, color: "#7a6020", letterSpacing: "0.14em", marginBottom: 14 }}>TRANSFER DETAILS</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {article.meta.player_photo ? (
                    <img src={article.meta.player_photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }}/>
                  ) : (
                    <span style={{ fontSize: 18, fontWeight: 900, color: "rgba(255,255,255,0.35)" }}>{(article.meta.player || "?")[0]}</span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#f0f6ff", marginBottom: 4 }}>{article.meta.player}</div>
                  <div style={{ fontSize: 11, color: "#7a6030", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{article.meta.from_club}</span>
                    <Icon.Transfer s={10}/>
                    <span>{article.meta.to_club}</span>
                  </div>
                </div>
              </div>
              {article.meta.fee && article.meta.fee.toLowerCase() !== "n/a" && (
                <div style={{ display: "inline-flex", padding: "4px 12px", borderRadius: 6, background: "rgba(232,184,75,0.1)", border: "1px solid rgba(232,184,75,0.2)", fontSize: 12, fontWeight: 800, color: "#e8b84b" }}>{article.meta.fee}</div>
              )}
            </div>
          )}

          {article.type === "model_insight" && article.meta && (
            <div style={{ borderRadius: 12, padding: 18, background: "rgba(62,207,142,0.04)", border: "1px solid rgba(62,207,142,0.1)", marginBottom: 22 }}>
              <div style={{ fontSize: 8.5, fontWeight: 900, color: "#1a6a3a", letterSpacing: "0.14em", marginBottom: 14 }}>
                {article.meta.insight_type === "title_race" ? "TITLE RACE ANALYSIS" : "RELEGATION BATTLE"}
              </div>
              {article.meta.insight_type === "title_race" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 9, color: "#3ecf8e", fontWeight: 800, marginBottom: 2 }}>LEADER</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#e8f0ff" }}>{article.meta.leader}</div>
                    </div>
                    <div style={{ fontSize: 36, fontWeight: 900, color: "#3ecf8e", fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{article.meta.leader_pts}</div>
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>+{article.meta.gap} points clear of {article.meta.second}</div>
                </div>
              )}
              {article.meta.insight_type === "relegation" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(article.meta.teams || []).map((team, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(255,77,77,0.06)", border: "1px solid rgba(255,77,77,0.09)" }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: ["#ff6b6b","#ff9966","#ffbb44"][i] }}/>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#e0c8c0" }}>{team}</span>
                    </div>
                  ))}
                </div>
              )}
              {article.url?.startsWith("/") && (
                <a href={article.url} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, padding: "10px 0", borderRadius: 9, background: "rgba(62,207,142,0.07)", border: "1px solid rgba(62,207,142,0.16)", color: "#3ecf8e", fontSize: 11, fontWeight: 800, textDecoration: "none", letterSpacing: "0.05em" }}>
                  View Predictions
                </a>
              )}
            </div>
          )}

          {/* External CTA */}
          {article.url && !article.url.startsWith("/") && (
            <a href={article.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "12px 0", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "#4a7a9a", fontSize: 12, fontWeight: 800, textDecoration: "none", letterSpacing: "0.04em", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#8aaac8"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#4a7a9a"; }}>
              Read Full Article <Icon.External s={11}/>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   SECTION HEADER
────────────────────────────────────────────────────────────── */
function SectionLabel({ text, count, color = "rgba(255,255,255,0.3)" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 24 }}>
      <div style={{ width: 2, height: 12, borderRadius: 1, background: color, flexShrink: 0 }}/>
      <span style={{ fontSize: 9, fontWeight: 900, color, letterSpacing: "0.14em" }}>{text}</span>
      {count != null && (
        <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.15)", fontFamily: "'DM Mono',monospace" }}>({count})</span>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function NewsTrackerPage() {
  const isMobile = useIsMobile();

  const [items,      setItems]      = useState([]);
  const [counts,     setCounts]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [league,     setLeague]     = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState(null);
  const [genAt,      setGenAt]      = useState(null);
  const searchRef = useRef(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${API}/api/intelligence/feed`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setItems(data.items || []);
      setCounts(data.counts || null);
      setGenAt(data.generated_at || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  // "/" to focus search
  useEffect(() => {
    const h = e => {
      if (e.key === "/" && !selected && document.activeElement !== searchRef.current) {
        e.preventDefault(); searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selected]);

  // Filter
  const filtered = useMemo(() => items.filter(item => {
    if (league !== "all" && item.league !== league) return false;
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!item.title?.toLowerCase().includes(q) && !item.summary?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [items, league, typeFilter, search]);

  // Partition into buckets
  const previews  = filtered.filter(i => i.type === "match_preview");
  const insights  = filtered.filter(i => i.type === "model_insight");
  const transfers = filtered.filter(i => i.type === "transfer");
  const headlines = filtered.filter(i => i.type === "headline");

  // Hero items = top preview + top insight
  const heroItems = [previews[0], insights[0]].filter(Boolean);

  // Ticker from all items
  const tickerItems = items.slice(0, 14);

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#e8f0ff", fontFamily: "'DM Mono','JetBrains Mono',monospace" }}>
      <style>{`
        @keyframes nt3-spin    { to { transform: rotate(360deg) } }
        @keyframes nt3-slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes nt3-fadeUp  { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        @keyframes nt3-pulse   { 0%,100% { box-shadow: 0 0 0 3px transparent } 50% { box-shadow: 0 0 0 5px currentColor } }
        @keyframes nt3-ticker  { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        @keyframes nt3-shimmer {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
        .nt3-shimmer {
          background: linear-gradient(90deg,
            rgba(255,255,255,.03) 25%,
            rgba(255,255,255,.065) 50%,
            rgba(255,255,255,.03) 75%);
          background-size: 200% 100%;
          animation: nt3-shimmer 1.5s linear infinite;
          border-radius: 4px;
        }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.07); border-radius: 2px }
      `}</style>

      {/* Drawer */}
      {selected && <ArticleDrawer article={selected} onClose={() => setSelected(null)}/>}

      {/* ── Live ticker ── */}
      {!loading && tickerItems.length > 0 && <LiveTicker items={tickerItems}/>}

      <div style={{ maxWidth: 1320, margin: "0 auto", padding: isMobile ? "18px 14px 90px" : "28px 28px 60px" }}>

        {/* ── Page header ── */}
        <div style={{
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          flexWrap: "wrap", gap: 14, marginBottom: 22,
        }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.22em", color: "rgba(255,255,255,0.14)", marginBottom: 6 }}>
              STATINSITE · INTELLIGENCE HUB
            </div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 25, fontWeight: 900, color: "#e8f4ff", letterSpacing: "-0.025em", lineHeight: 1 }}>
              Football Intelligence
            </h1>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Count summary */}
            {!loading && counts && !isMobile && (
              <div style={{ display: "flex", gap: 5 }}>
                {Object.entries(TYPE_CFG).map(([type, cfg]) => {
                  const n = counts[type] || 0;
                  if (!n) return null;
                  return (
                    <div key={type} style={{ fontSize: 9, fontWeight: 800, color: cfg.color, padding: "2px 8px", borderRadius: 999, background: cfg.bg, border: `1px solid ${cfg.color}20` }}>
                      {n} {cfg.short}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Search */}
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.2)", pointerEvents: "none" }}>
                <Icon.Search s={12}/>
              </div>
              <input
                ref={searchRef}
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder={isMobile ? "Search…" : "Search  /"}
                style={{
                  width: isMobile ? 120 : 180, padding: "7px 10px 7px 28px",
                  borderRadius: 8, fontSize: isMobile ? 16 : 11,
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  color: "#e8f0ff", outline: "none", fontFamily: "inherit",
                  transition: "border-color 0.14s", minHeight: 34,
                }}
                onFocus={e  => { e.target.style.borderColor = "rgba(79,158,255,0.4)"; }}
                onBlur={e   => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>

            {/* Refresh */}
            <button onClick={fetchFeed} disabled={loading} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 13px",
              borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: "pointer",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              color: loading ? "#2a4060" : "#4a7a9a", fontFamily: "inherit", minHeight: 34,
              transition: "all 0.14s",
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = "rgba(79,158,255,0.3)"; e.currentTarget.style.color = "#4f9eff"; } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = loading ? "#2a4060" : "#4a7a9a"; }}
            >
              <Icon.Refresh s={12} spin={loading}/>
              {!isMobile && (loading ? "Loading" : "Refresh")}
            </button>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div style={{
          display: "flex", gap: 6, marginBottom: 24,
          paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.06)",
          overflowX: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
        }}>
          {/* Type filter */}
          <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, padding: 2, flexShrink: 0 }}>
            {[
              { code: "all",           label: isMobile ? "All" : "All",       Icon: null },
              { code: "headline",      label: isMobile ? "News" : "News",      Icon: Icon.News },
              { code: "match_preview", label: isMobile ? "Prev" : "Previews",  Icon: Icon.Clock },
              { code: "transfer",      label: isMobile ? "Txfr" : "Transfers", Icon: Icon.Transfer },
              { code: "model_insight", label: isMobile ? "Data" : "Insights",  Icon: Icon.Chart },
            ].map(({ code, label, Icon: I }) => {
              const active = typeFilter === code;
              return (
                <button key={code} onClick={() => setTypeFilter(code)} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "5px 9px",
                  borderRadius: 7, fontSize: 10, fontWeight: 800, cursor: "pointer",
                  background: active ? "rgba(255,255,255,0.09)" : "transparent",
                  border: "none", color: active ? "#c8d8f0" : "#3a5a7a",
                  fontFamily: "inherit", minHeight: 30, transition: "all 0.12s ease",
                  letterSpacing: "0.02em", whiteSpace: "nowrap",
                }}>
                  {I && <I s={10}/>}
                  {label}
                </button>
              );
            })}
          </div>

          {/* League pills */}
          <div style={{ display: "flex", gap: 4, flex: 1, overflowX: "auto", scrollbarWidth: "none" }}>
            {LEAGUES.map(lg => {
              const active = league === lg.code;
              return (
                <button key={lg.code} onClick={() => setLeague(lg.code)} style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "5px 11px", borderRadius: 999, flexShrink: 0,
                  fontSize: 10, fontWeight: 800, cursor: "pointer",
                  background: active ? `${lg.color}14` : "transparent",
                  border: `1px solid ${active ? lg.color + "44" : "rgba(255,255,255,0.07)"}`,
                  color: active ? lg.color : "#3a5870",
                  fontFamily: "inherit", minHeight: 30, transition: "all 0.12s ease",
                  whiteSpace: "nowrap",
                }}>
                  {lg.flag && lg.code !== "all" && <span style={{ fontSize: 10 }}>{lg.flag}</span>}
                  {isMobile && lg.code !== "all" ? lg.shortLabel : lg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ padding: "13px 17px", borderRadius: 10, marginBottom: 20, background: "rgba(255,60,80,0.07)", border: "1px solid rgba(255,60,80,0.14)", fontSize: 11, color: "#ff5560" }}>
            Feed unavailable ({error}). Backend may be starting up — try refreshing in 30s.
          </div>
        )}

        {/* ── LOADING STATE ── */}
        {loading && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <SkeletonHero/><SkeletonHero/>
            </div>
            <SectionLabel text="TRANSFERS" color="rgba(232,184,75,0.5)"/>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {[0,1,2].map(i => <SkeletonTransfer key={i}/>)}
            </div>
            <SectionLabel text="NEWS" color="rgba(160,184,216,0.4)"/>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 10 }}>
              {[0,1,2,3,4,5].map(i => <SkeletonCard key={i}/>)}
            </div>
          </div>
        )}

        {/* ── EMPTY ── */}
        {!loading && filtered.length === 0 && !error && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ fontSize: 24, color: "rgba(255,255,255,0.06)", marginBottom: 12, letterSpacing: "-0.02em" }}>◌</div>
            <div style={{ fontSize: 12, color: "#1a3a5a" }}>No items match these filters.</div>
          </div>
        )}

        {/* ══ CONTENT ══ */}
        {!loading && filtered.length > 0 && (
          <>
            {/* Hero row — match previews + insights */}
            {heroItems.length > 0 && (
              <>
                <SectionLabel
                  text={typeFilter === "model_insight" ? "INSIGHTS" : typeFilter === "match_preview" ? "MATCH PREVIEWS" : "FEATURED"}
                  count={heroItems.length}
                  color="rgba(255,255,255,0.35)"
                />
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : `repeat(${Math.min(heroItems.length, 2)},1fr)`,
                  gap: 12, marginBottom: 4,
                }}>
                  {heroItems.map(item => <HeroCard key={item.id} article={item} onClick={setSelected}/>)}
                </div>

                {/* Remaining previews / insights as compact cards */}
                {(previews.length > 1 || insights.length > 1) && (
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(260px,1fr))", gap: 9, marginTop: 9 }}>
                    {[...previews.slice(1), ...insights.slice(1)].map(item => (
                      <HeroCard key={item.id} article={item} onClick={setSelected}/>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Transfers rail */}
            {transfers.length > 0 && (typeFilter === "all" || typeFilter === "transfer") && (
              <>
                <SectionLabel text="TRANSFER CENTRE" count={transfers.length} color={TYPE_CFG.transfer.color}/>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {transfers.map(item => <TransferCard key={item.id} article={item} onClick={setSelected}/>)}
                </div>
              </>
            )}

            {/* News grid */}
            {headlines.length > 0 && (typeFilter === "all" || typeFilter === "headline") && (
              <>
                <SectionLabel text="LATEST NEWS" count={headlines.length} color={TYPE_CFG.headline.color}/>
                {isMobile ? (
                  // Mobile: compact list + overflow
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginBottom: 8 }}>
                      {headlines.filter(a => a.image).slice(0, 2).map(item => (
                        <HeadlineCard key={item.id} article={item} onClick={setSelected}/>
                      ))}
                    </div>
                    <div>
                      {headlines.filter(a => !a.image || headlines.indexOf(a) > 1).slice(0, 12).map(item => (
                        <HeadlineCard key={item.id} article={item} onClick={setSelected} compact/>
                      ))}
                    </div>
                  </div>
                ) : (
                  // Desktop: 3-col featured grid + right compact list
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 280px", gap: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, gridColumn: "1 / 4" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                        {headlines.slice(0, 3).map(item => <HeadlineCard key={item.id} article={item} onClick={setSelected}/>)}
                      </div>
                      {headlines.length > 3 && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                          {headlines.slice(3, 6).map(item => <HeadlineCard key={item.id} article={item} onClick={setSelected}/>)}
                        </div>
                      )}
                    </div>
                    {/* Right sidebar: compact headlines */}
                    <div style={{ display: "flex", flexDirection: "column", gridColumn: "4", borderLeft: "1px solid rgba(255,255,255,0.06)", paddingLeft: 16 }}>
                      <div style={{ fontSize: 9, fontWeight: 900, color: "rgba(255,255,255,0.2)", letterSpacing: "0.14em", marginBottom: 4 }}>MORE STORIES</div>
                      {headlines.slice(6, 20).map(item => (
                        <HeadlineCard key={item.id} article={item} onClick={setSelected} compact/>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Footer */}
        {!loading && items.length > 0 && (
          <div style={{ marginTop: 48, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", fontSize: 9, color: "#1a3050", fontWeight: 700, letterSpacing: "0.08em" }}>
            <span>{filtered.length} item{filtered.length !== 1 ? "s" : ""}{filtered.length !== items.length ? ` of ${items.length}` : ""}</span>
            {genAt && <span>Updated {timeAgo(genAt)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}