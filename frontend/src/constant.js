// ═══════════════════════════════════════════════════════════════════════════
// src/constants.js  —  StatinSite shared constants  v1
// ═══════════════════════════════════════════════════════════════════════════
//
// SINGLE SOURCE OF TRUTH for:
//   • Competition registry (COMP_NAV_TABS, COMP_NAV_GROUPS)
//   • League IDs, slugs, names, colors, logos
//   • Live status sets
//   • Design tokens (theme colors)
//
// Previously duplicated verbatim in:
//   LivePage.jsx · LiveMatchPage.jsx · PredictionsPage.jsx
//   MatchCentrePage.jsx · Navbar.jsx · LeaguePage.jsx · LeaguesPage.jsx
//
// Usage:
//   import { COMP_NAV_TABS, COMP_NAV_GROUPS, LEAGUE_IDS, LIVE_SET } from "@/constants";
// ═══════════════════════════════════════════════════════════════════════════

// ── API-Sports logo base ─────────────────────────────────────────────────────
export const AF = "https://media.api-sports.io/football/leagues/";

// ── Live match status codes ──────────────────────────────────────────────────
export const LIVE_SET = new Set(["1H", "2H", "HT", "ET", "BT", "P"]);
export const FINISHED_SET = new Set(["FT", "AET", "PEN", "AWD", "WO"]);

// ── Competition group definitions ────────────────────────────────────────────
export const COMP_NAV_GROUPS = [
  { key: "domestic",      label: "Domestic"      },
  { key: "european",      label: "European"      },
  { key: "cup",           label: "Cup"           },
  { key: "international", label: "International" },
];

// ── Master competition registry ──────────────────────────────────────────────
// Each entry is the canonical definition used by nav, filters, league pages,
// predictions, live scores — everywhere.
//
// Fields:
//   code    — internal key used throughout the app and as API param
//   slug    — URL segment: /predictions/:slug
//   label   — full display name
//   short   — abbreviated label for tight spaces
//   group   — one of the COMP_NAV_GROUPS keys
//   logo    — API-Sports league logo URL
//   leagueId — API-Football league ID (for direct API calls)
//   color   — primary accent color for this competition
//   glow    — rgba glow for hover effects
//   bc      — dark background chip color (used in tabs)
//   bt      — text color for dark background chips
export const COMP_NAV_TABS = [
  // ── Domestic ──────────────────────────────────────────────────────────────
  {
    code: "epl",        slug: "premier-league",   label: "Premier League",   short: "PL",
    group: "domestic",  leagueId: 39,
    logo: `${AF}39.png`,
    color: "#60a5fa",   glow: "rgba(96,165,250,0.16)",
    bc: "#1a3a6e",      bt: "#93c5fd",
  },
  {
    code: "laliga",     slug: "la-liga",           label: "La Liga",          short: "LL",
    group: "domestic",  leagueId: 140,
    logo: `${AF}140.png`,
    color: "#f97316",   glow: "rgba(249,115,22,0.16)",
    bc: "#6e1a1a",      bt: "#fca5a5",
  },
  {
    code: "bundesliga", slug: "bundesliga",         label: "Bundesliga",       short: "BL",
    group: "domestic",  leagueId: 78,
    logo: `${AF}78.png`,
    color: "#f59e0b",   glow: "rgba(245,158,11,0.16)",
    bc: "#4a3a00",      bt: "#fde68a",
  },
  {
    code: "seriea",     slug: "serie-a",            label: "Serie A",          short: "SA",
    group: "domestic",  leagueId: 135,
    logo: `${AF}135.png`,
    color: "#34d399",   glow: "rgba(52,211,153,0.16)",
    bc: "#1a4a1a",      bt: "#86efac",
  },
  {
    code: "ligue1",     slug: "ligue-1",            label: "Ligue 1",          short: "L1",
    group: "domestic",  leagueId: 61,
    logo: `${AF}61.png`,
    color: "#a78bfa",   glow: "rgba(167,139,250,0.16)",
    bc: "#2e1a6e",      bt: "#c4b5fd",
  },
  // ── European ──────────────────────────────────────────────────────────────
  {
    code: "ucl",        slug: "champions-league",   label: "Champions League", short: "UCL",
    group: "european",  leagueId: 2,
    logo: `${AF}2.png`,
    color: "#3b82f6",   glow: "rgba(59,130,246,0.16)",
    bc: "#0f2d6e",      bt: "#93c5fd",
  },
  {
    code: "uel",        slug: "europa-league",      label: "Europa League",    short: "UEL",
    group: "european",  leagueId: 3,
    logo: `${AF}3.png`,
    color: "#f97316",   glow: "rgba(249,115,22,0.16)",
    bc: "#5c2800",      bt: "#fdba74",
  },
  {
    code: "uecl",       slug: "conference-league",  label: "Conference Lge",   short: "UECL",
    group: "european",  leagueId: 848,
    logo: `${AF}848.png`,
    color: "#22c55e",   glow: "rgba(34,197,94,0.16)",
    bc: "#0f3d2a",      bt: "#6ee7b7",
  },
  // ── Cup ───────────────────────────────────────────────────────────────────
  {
    code: "facup",      slug: "fa-cup",             label: "FA Cup",           short: "FAC",
    group: "cup",       leagueId: 45,
    logo: `${AF}45.png`,
    color: "#ef4444",   glow: "rgba(239,68,68,0.16)",
    bc: "#4a0f0f",      bt: "#fca5a5",
  },
  // ── International ─────────────────────────────────────────────────────────
  {
    code: "wcq_uefa",         slug: "wcq-uefa",        label: "WCQ Europe",     short: "WCQ·E",
    group: "international",   leagueId: 32,
    logo: `${AF}32.png`,
    color: "#fbbf24",   glow: "rgba(251,191,36,0.16)",
    bc: "#3d3000",      bt: "#fde68a",
  },
  {
    code: "wcq_conmebol",     slug: "wcq-conmebol",    label: "WCQ S. America", short: "WCQ·S",
    group: "international",   leagueId: 29,
    logo: `${AF}29.png`,
    color: "#fbbf24",   glow: "rgba(251,191,36,0.16)",
    bc: "#3d3000",      bt: "#fde68a",
  },
  {
    code: "wcq_concacaf",     slug: "wcq-concacaf",    label: "WCQ C. America", short: "WCQ·C",
    group: "international",   leagueId: 30,
    logo: `${AF}30.png`,
    color: "#fbbf24",   glow: "rgba(251,191,36,0.16)",
    bc: "#3d3000",      bt: "#fde68a",
  },
  {
    code: "wcq_caf",          slug: "wcq-caf",         label: "WCQ Africa",     short: "WCQ·A",
    group: "international",   leagueId: 31,
    logo: `${AF}31.png`,
    color: "#fbbf24",   glow: "rgba(251,191,36,0.16)",
    bc: "#3d3000",      bt: "#fde68a",
  },
  {
    code: "wcq_afc",          slug: "wcq-afc",         label: "WCQ Asia",       short: "WCQ·As",
    group: "international",   leagueId: 36,
    logo: `${AF}36.png`,
    color: "#fbbf24",   glow: "rgba(251,191,36,0.16)",
    bc: "#3d3000",      bt: "#fde68a",
  },
  {
    code: "nations_league",   slug: "nations-league",  label: "Nations League", short: "UNL",
    group: "international",   leagueId: 5,
    logo: `${AF}5.png`,
    color: "#e879f9",   glow: "rgba(232,121,249,0.16)",
    bc: "#3a006e",      bt: "#d8b4fe",
  },
  {
    code: "euro",             slug: "euros",           label: "UEFA Euros",     short: "EURO",
    group: "international",   leagueId: 4,
    logo: `${AF}4.png`,
    color: "#3b82f6",   glow: "rgba(59,130,246,0.16)",
    bc: "#0f2d6e",      bt: "#93c5fd",
  },
  {
    code: "euro_q",           slug: "euro-qual",       label: "Euro Qualifiers",short: "EQ",
    group: "international",   leagueId: 960,
    logo: `${AF}960.png`,
    color: "#3b82f6",   glow: "rgba(59,130,246,0.16)",
    bc: "#0f2d6e",      bt: "#93c5fd",
  },
  {
    code: "afcon",            slug: "afcon",           label: "Africa Cup",     short: "AFCON",
    group: "international",   leagueId: 6,
    logo: `${AF}6.png`,
    color: "#22c55e",   glow: "rgba(34,197,94,0.16)",
    bc: "#0f3d1a",      bt: "#86efac",
  },
  {
    code: "copa_america",     slug: "copa-america",    label: "Copa América",   short: "COPA",
    group: "international",   leagueId: 9,
    logo: `${AF}9.png`,
    color: "#fbbf24",   glow: "rgba(251,191,36,0.16)",
    bc: "#3d2c00",      bt: "#fde68a",
  },
  {
    code: "gold_cup",         slug: "gold-cup",        label: "Gold Cup",       short: "GC",
    group: "international",   leagueId: 16,
    logo: `${AF}16.png`,
    color: "#fbbf24",   glow: "rgba(251,191,36,0.16)",
    bc: "#3d2c00",      bt: "#fde68a",
  },
  {
    code: "world_cup",        slug: "world-cup",       label: "World Cup",      short: "WC",
    group: "international",   leagueId: 1,
    logo: `${AF}1.png`,
    color: "#fbbf24",   glow: "rgba(251,191,36,0.16)",
    bc: "#3d2c00",      bt: "#fde68a",
  },
  {
    code: "international_friendly", slug: "intl-friendly", label: "Intl Friendly", short: "FRND",
    group: "international",   leagueId: 10,
    logo: `${AF}10.png`,
    color: "#94a3b8",   glow: "rgba(148,163,184,0.16)",
    bc: "#2a2a2a",      bt: "#d1d5db",
  },
];

// ── Derived lookups (built once from COMP_NAV_TABS) ──────────────────────────

/** Map: code → full tab object. Use for color, logo, label lookups. */
export const COMP_BY_CODE = Object.fromEntries(COMP_NAV_TABS.map(t => [t.code, t]));

/** Map: slug → code. Use when parsing URL params. */
export const CODE_BY_SLUG = Object.fromEntries(COMP_NAV_TABS.map(t => [t.slug, t.code]));

/** Map: code → slug. Use when building hrefs. */
export const SLUG_BY_CODE = Object.fromEntries(COMP_NAV_TABS.map(t => [t.code, t.slug]));

/** Map: leagueId → tab object. Use when API returns a numeric league ID. */
export const COMP_BY_LEAGUE_ID = Object.fromEntries(
  COMP_NAV_TABS.filter(t => t.leagueId).map(t => [t.leagueId, t])
);

/** All competition codes as a flat array (for filter dropdowns etc.) */
export const ALL_CODES = COMP_NAV_TABS.map(t => t.code);

/** Per-group arrays — use for nav rendering without re-filtering */
export const COMPS_BY_GROUP = Object.fromEntries(
  COMP_NAV_GROUPS.map(g => [g.key, COMP_NAV_TABS.filter(t => t.group === g.key)])
);

// ── Convenience accessors ────────────────────────────────────────────────────

/** Get color for a competition code. Falls back to dim white. */
export const compColor = (code) => COMP_BY_CODE[code]?.color ?? "rgba(255,255,255,0.4)";

/** Get glow for a competition code. */
export const compGlow  = (code) => COMP_BY_CODE[code]?.glow  ?? "rgba(255,255,255,0.08)";

/** Get short label for a competition code. */
export const compShort = (code) => COMP_BY_CODE[code]?.short ?? code?.toUpperCase() ?? "?";

/** Get full label for a competition code. */
export const compLabel = (code) => COMP_BY_CODE[code]?.label ?? code ?? "Unknown";

/** Get logo URL for a competition code. */
export const compLogo  = (code) => COMP_BY_CODE[code]?.logo  ?? "";

// ── League IDs map (for API calls that need the numeric ID) ─────────────────
export const LEAGUE_IDS = Object.fromEntries(
  COMP_NAV_TABS.filter(t => t.leagueId).map(t => [t.code, t.leagueId])
);

// ── Top-5 league codes (domestic only, for simplified dropdowns) ─────────────
export const TOP5_LEAGUES = ["epl", "laliga", "bundesliga", "seriea", "ligue1"];

// ── FPL position colors (used across FPL pages and squad builder) ────────────
export const POS_COLORS = {
  GK:  "#f59e0b",   // amber
  DEF: "#3b82f6",   // blue
  MID: "#22c55e",   // green
  FWD: "#ef4444",   // red
};

export const POS_GLOW = {
  GK:  "rgba(245,158,11,0.35)",
  DEF: "rgba(59,130,246,0.35)",
  MID: "rgba(34,197,94,0.35)",
  FWD: "rgba(239,68,68,0.35)",
};

/** Position display label */
export const POS_LABEL = { GK: "GK", DEF: "DEF", MID: "MID", FWD: "FWD" };

// ── Global design tokens (mirror what HomePage and Navbar use) ───────────────
export const COLORS = {
  blue:   "#0a84ff",
  green:  "#30d158",
  red:    "#ff453a",
  amber:  "#ff9f0a",
  purple: "#bf5af2",
  teal:   "#5ac8fa",
  // text
  text:   "#e8eaf0",
  muted:  "rgba(255,255,255,0.38)",
  dim:    "rgba(255,255,255,0.22)",
  // backgrounds
  bg:     "#0d0f14",
  card:   "#09090f",
  border: "rgba(255,255,255,0.07)",
};

// ── Form pill colors ─────────────────────────────────────────────────────────
export const FORM_COLORS = {
  W: { bg: "rgba(48,209,88,0.15)",  border: "rgba(48,209,88,0.3)",  text: "#30d158" },
  D: { bg: "rgba(255,159,10,0.15)", border: "rgba(255,159,10,0.3)", text: "#ff9f0a" },
  L: { bg: "rgba(255,69,58,0.15)",  border: "rgba(255,69,58,0.3)",  text: "#ff453a" },
};

// ── Current season (keeps all pages in sync) ─────────────────────────────────
export const CURRENT_SEASON = 2025;