// ─────────────────────────────────────────────────────────────────────────────
// api.js — StatinSite unified API layer
// Single source of truth for ALL backend calls.
//
// Priority resolution (first defined wins):
//   1. VITE_API_BASE — set in .env.local / Vercel env
//   2. Fallback to Render URL in production-like contexts
//
// Usage:
//   import { getDashboard, getUpcoming, getLeaguePredictions } from "@/api";
//   const dash = await getDashboard();
//
// Error strategy: every function throws on HTTP error so callers can show
// proper error states rather than silent empty arrays.
// ─────────────────────────────────────────────────────────────────────────────

const _RAW_BASE = import.meta.env?.VITE_API_BASE ?? "";
export const API_BASE = _RAW_BASE.replace(/\/$/, "") || "https://football-stats-lw4b.onrender.com";

// ── Core fetch helper ────────────────────────────────────────────────────────
/**
 * Fetches JSON from API_BASE + path.
 * Throws a descriptive Error on HTTP failure.
 * Pass signal for AbortController support.
 */
export async function apiFetch(path, { signal, params } = {}) {
  let url = `${API_BASE}${path}`;
  if (params && Object.keys(params).length) {
    url += "?" + new URLSearchParams(params).toString();
  }
  const res = await fetch(url, { signal });
  if (!res.ok) {
    let body = "";
    try { body = await res.text(); } catch {}
    throw new Error(`[${res.status}] ${path}${body ? ` — ${body.slice(0, 120)}` : ""}`);
  }
  return res.json();
}

// ── Session-storage cache helper ────────────────────────────────────────────
/**
 * Wraps a fetch function with sessionStorage caching.
 * ttl is in milliseconds.
 */
export function withCache(key, fn, ttl = 300_000) {
  return async (...args) => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const { ts, d } = JSON.parse(raw);
        if (Date.now() - ts < ttl) return d;
      }
    } catch {}
    const data = await fn(...args);
    try { sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), d: data })); } catch {}
    return data;
  };
}

// ════════════════════════════════════════════════════════════════════════════
// HOMEPAGE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Single aggregated dashboard payload — powers the entire homepage.
 * Cached 5 min. Returns the full home.py /dashboard response.
 * Shape: { top_predictions, model_edges, model_confidence, power_rankings,
 *          title_race, xg_leaders, value_players, trending_players,
 *          differential_captains, transfer_brief, analytics_term,
 *          high_scoring_matches, defense_table, form_table,
 *          performance_summary, accountability_summary,
 *          hero_stats, generated_at, … }
 */
export const getDashboard = withCache(
  "ss_dashboard",
  () => apiFetch("/api/home/dashboard"),
  300_000,
);

/**
 * Upcoming + live fixtures from /api/matches/upcoming.
 * Cached 3 min (live matches refresh frequently).
 * Shape: { matches: [{ fixture_id, home_team, away_team, status, … }] }
 */
export const getUpcoming = withCache(
  "ss_upcoming",
  () => apiFetch("/api/matches/upcoming"),
  180_000,
);

// ════════════════════════════════════════════════════════════════════════════
// PREDICTIONS
// ════════════════════════════════════════════════════════════════════════════

// League slug → API code map (keep in sync with SLUG_MAP in App.jsx)
export const LEAGUE_CODES = {
  "premier-league": "epl",
  "la-liga":        "laliga",
  "serie-a":        "seriea",
  "ligue-1":        "ligue1",
  "bundesliga":     "bundesliga",
  "champions-league": "ucl",
  "europa-league":  "uel",
  "conference-league": "uecl",
  "fa-cup":         "facup",
  // pass-through codes
  epl: "epl", laliga: "laliga", seriea: "seriea",
  ligue1: "ligue1", bundesliga: "bundesliga",
  ucl: "ucl", uel: "uel", uecl: "uecl", facup: "facup",
};

/**
 * Full prediction list for a league slug or code.
 * /api/league/{code}/predictions
 */
export function getLeaguePredictions(slugOrCode) {
  const code = LEAGUE_CODES[slugOrCode] ?? slugOrCode;
  return withCache(
    `ss_preds_${code}`,
    () => apiFetch(`/api/league/${code}/predictions`),
    300_000,
  )();
}

/**
 * Win-probability model for a single fixture.
 * /api/win-probability/{fixtureId}
 */
export const getWinProbability = (fixtureId) =>
  apiFetch(`/api/win-probability/${fixtureId}`);

// ════════════════════════════════════════════════════════════════════════════
// MATCH INTELLIGENCE (per-fixture)
// ════════════════════════════════════════════════════════════════════════════

export const getMatchIntelligence = (fixtureId) =>
  apiFetch(`/api/match-intelligence/${fixtureId}`);

export const getMatchMomentum = (fixtureId) =>
  apiFetch(`/api/match-momentum/${fixtureId}`);

export const getShotMap = (fixtureId) =>
  apiFetch(`/api/shot-map/${fixtureId}`);

export const getFixtureLineups = (fixtureId) =>
  apiFetch(`/api/fixtures/lineups`, { params: { fixture: fixtureId } });

// ════════════════════════════════════════════════════════════════════════════
// LEAGUE DATA
// ════════════════════════════════════════════════════════════════════════════

export const getStandings = (slugOrCode) => {
  const code = LEAGUE_CODES[slugOrCode] ?? slugOrCode;
  return withCache(
    `ss_standings_${code}`,
    () => apiFetch(`/api/standings/${code}`),
    900_000,
  )();
};

export const getFixtures = (slugOrCode) => {
  const code = LEAGUE_CODES[slugOrCode] ?? slugOrCode;
  return withCache(
    `ss_fixtures_${code}`,
    () => apiFetch(`/api/fixtures/${code}`),
    300_000,
  )();
};

export const getSeasonSimulation = (slugOrCode) => {
  const code = LEAGUE_CODES[slugOrCode] ?? slugOrCode;
  return apiFetch(`/api/simulate/${code}`);
};

export const getTopScorers = (slugOrCode) => {
  const code = LEAGUE_CODES[slugOrCode] ?? slugOrCode;
  return withCache(
    `ss_scorers_${code}`,
    () => apiFetch(`/api/topscorers/${code}`),
    3_600_000,
  )();
};

export const getTopAssists = (slugOrCode) => {
  const code = LEAGUE_CODES[slugOrCode] ?? slugOrCode;
  return withCache(
    `ss_assists_${code}`,
    () => apiFetch(`/api/topassists/${code}`),
    3_600_000,
  )();
};

export const getLeagueInjuries = (slugOrCode) => {
  const code = LEAGUE_CODES[slugOrCode] ?? slugOrCode;
  return apiFetch(`/api/injuries/${code}`);
};

// ════════════════════════════════════════════════════════════════════════════
// TEAM
// ════════════════════════════════════════════════════════════════════════════

export const getTeamStats = (teamId, slugOrCode) => {
  const code = LEAGUE_CODES[slugOrCode] ?? slugOrCode;
  return apiFetch(`/api/team/${teamId}/stats`, { params: { league: code } });
};

export const getTeamInjuries = (teamId) =>
  apiFetch(`/api/injuries/team/${teamId}`);

export const getH2H = (teamId1, teamId2, last = 10) =>
  apiFetch(`/api/h2h/${teamId1}/${teamId2}`, { params: { last } });

// ════════════════════════════════════════════════════════════════════════════
// PLAYERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Squad builder — player search within a league.
 * /api/squad-builder/players
 */
export const getSquadPlayers = (params = {}) =>
  apiFetch("/api/squad-builder/players", { params });

/**
 * Squad builder — full team squad.
 * /api/squad-builder/team/{teamId}
 */
export const getSquadTeam = (teamId, league = "epl") =>
  apiFetch(`/api/squad-builder/team/${teamId}`, { params: { league } });

/**
 * Squad builder — side-by-side player comparison.
 * /api/squad-builder/compare
 */
export const comparePlayers = (playerIds, league = "epl") =>
  apiFetch("/api/squad-builder/compare", {
    params: { player_ids: playerIds.join(","), league },
  });

/**
 * Player name search.
 * /api/squad-builder/search
 */
export const searchPlayers = (name, league = "epl") =>
  apiFetch("/api/squad-builder/search", { params: { name, league } });

// ════════════════════════════════════════════════════════════════════════════
// FPL
// ════════════════════════════════════════════════════════════════════════════

export const getFplBootstrap = withCache(
  "ss_fpl_bootstrap",
  () => apiFetch("/api/fpl/bootstrap"),
  3_600_000,
);

export const getFplPredictorTable = (params = {}) =>
  apiFetch("/api/fpl/predictor-table", { params });

export const getFplSummaryCards = (gw) =>
  apiFetch("/api/fpl/summary-cards", { params: { start_gw: gw } });

// ════════════════════════════════════════════════════════════════════════════
// ODDS / MARKET
// ════════════════════════════════════════════════════════════════════════════

export const getFixtureOdds = (fixtureId) =>
  apiFetch(`/api/odds/${fixtureId}`);

export const getApiPrediction = (fixtureId) =>
  apiFetch(`/api/apipred/${fixtureId}`);

// ════════════════════════════════════════════════════════════════════════════
// NEWS & INTELLIGENCE
// ════════════════════════════════════════════════════════════════════════════

export const getLeagueNews = (slugOrCode) => {
  const code = LEAGUE_CODES[slugOrCode] ?? slugOrCode;
  return apiFetch(`/api/news/${code}`);
};

// ════════════════════════════════════════════════════════════════════════════
// INTERNATIONAL
// ════════════════════════════════════════════════════════════════════════════

export const getInternationalFixtures = (params = {}) =>
  apiFetch("/api/international/fixtures", { params });

// ════════════════════════════════════════════════════════════════════════════
// LINEUPS (predicted)
// ════════════════════════════════════════════════════════════════════════════

export const getPredictedLineup = (fixtureId) =>
  apiFetch(`/api/lineups/predicted/${fixtureId}`);

// ════════════════════════════════════════════════════════════════════════════
// PREDICTIONS ACCOUNTABILITY
// ════════════════════════════════════════════════════════════════════════════

export const getPredictionsHealth = () =>
  apiFetch("/api/predictions/health");

export const getModelPerformance = (params = {}) =>
  apiFetch("/api/predictions/performance", { params });