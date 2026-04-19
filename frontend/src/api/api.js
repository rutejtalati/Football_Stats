// ═══════════════════════════════════════════════════════════════════════════
// src/api/api.js  —  StatinSite API layer  v2
// ═══════════════════════════════════════════════════════════════════════════
//
// ALL backend calls go through this file.
// No page should hardcode the backend URL or call fetch() directly.
//
// API_BASE priority (first defined wins):
//   VITE_API_BASE    — set this in .env.local and Vercel (preferred)
//   VITE_BACKEND_URL — legacy alias (some old pages used this)
//   VITE_API_URL     — legacy alias
//   fallback         — Railway production URL
//
// Pages that previously hardcoded the URL:
//   HomePage · LeaguesPage · MatchCentrePage · MatchIntelligencePage
//   NewsTrackerPage · PlayerInsightPage · PlayerProfile · PredictionsPage
//   TeamPage  →  all now import API_BASE from here instead.
// ═══════════════════════════════════════════════════════════════════════════

const _env = import.meta?.env ?? {};

export const API_BASE = (
  _env.VITE_API_BASE    ||
  _env.VITE_BACKEND_URL ||
  _env.VITE_API_URL     ||
  "https://footballstats-production-ecd9.up.railway.app"
).replace(/\/$/, "");

// ── Slug / code normalisation ─────────────────────────────────────────────────
// Keep in sync with constants.js COMP_NAV_TABS slugs.
export const LEAGUE_CODES = {
  "premier-league":   "epl",
  "la-liga":          "laliga",
  "serie-a":          "seriea",
  "ligue-1":          "ligue1",
  "bundesliga":       "bundesliga",
  "champions-league": "ucl",
  "europa-league":    "uel",
  "conference-league":"uecl",
  "fa-cup":           "facup",
  // pass-through for code → code
  epl: "epl", laliga: "laliga", seriea: "seriea",
  ligue1: "ligue1", bundesliga: "bundesliga",
  ucl: "ucl", uel: "uel", uecl: "uecl", facup: "facup",
};
export const toCode = (s) => LEAGUE_CODES[s] ?? s;


// ════════════════════════════════════════════════════════════════════════════
// LOW-LEVEL HELPERS
// ════════════════════════════════════════════════════════════════════════════

// ── fetchJson (original — all existing pages use this) ──────────────────────
async function fetchJson(path, errMsg) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    let d = "";
    try { d = await res.text(); } catch (_) {}
    throw new Error(`${errMsg}${d ? `: ${d}` : ""}`);
  }
  return res.json();
}

// ── apiFetch (new — with retry, params, AbortController) ────────────────────
// retries: additional attempts on network failure or 5xx (default 2).
// backoff: base ms between retries, doubles each attempt (default 2000ms).
// On Render/Railway cold-start the first request can fail — retrying after
// backoff lets the server wake up.
export async function apiFetch(path, { signal, params, retries = 2, backoff = 2000 } = {}) {
  let url = `${API_BASE}${path}`;
  if (params && Object.keys(params).length) {
    url += "?" + new URLSearchParams(params).toString();
  }

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, backoff * Math.pow(2, attempt - 1)));
    }
    try {
      const res = await fetch(url, signal ? { signal } : undefined);
      if (res.ok) return res.json();
      // 4xx → permanent, don't retry
      if (res.status >= 400 && res.status < 500) {
        let body = "";
        try { body = await res.text(); } catch (_) {}
        throw new Error(`[${res.status}] ${path}${body ? ` — ${body.slice(0, 120)}` : ""}`);
      }
      // 5xx → record and retry
      let body = "";
      try { body = await res.text(); } catch (_) {}
      lastErr = new Error(`[${res.status}] ${path}${body ? ` — ${body.slice(0, 120)}` : ""}`);
    } catch (err) {
      if (err.name === "AbortError") throw err;
      lastErr = err;
    }
  }
  throw lastErr;
}

// ── withCache — sessionStorage TTL wrapper ──────────────────────────────────
export function withCache(key, fn, ttl = 300_000) {
  return async (...args) => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const { ts, d } = JSON.parse(raw);
        if (Date.now() - ts < ttl) return d;
      }
    } catch (_) {}
    const data = await fn(...args);
    try { sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), d: data })); } catch (_) {}
    return data;
  };
}


// ════════════════════════════════════════════════════════════════════════════
// FPL  (/api/fpl/*)
// ════════════════════════════════════════════════════════════════════════════

export const getFplPredictorTable   = (params = {}) =>
  fetchJson(`/api/fpl/predictor-table${Object.keys(params).length ? "?" + new URLSearchParams(params) : ""}`, "FPL predictor");

export const getFplSummaryCards     = (gw = 29) =>
  fetchJson(`/api/fpl/summary-cards?start_gw=${gw}`, "FPL summary");

export const getFplBootstrap        = () =>
  fetchJson("/api/fpl/bootstrap", "FPL bootstrap");

export const getFplCaptaincy        = (params = {}) =>
  apiFetch("/api/fpl/captaincy",         { params });

export const getFplDifferentials    = (params = {}) =>
  apiFetch("/api/fpl/differentials",     { params });

export const getFplFixtureDifficulty = (params = {}) =>
  apiFetch("/api/fpl/fixture-difficulty",{ params });

export const getFplTransferPlanner  = (params = {}) =>
  apiFetch("/api/fpl/transfer-planner",  { params });

export const getFplBestTeam         = (params = {}) =>
  apiFetch("/api/fpl/best-xi",           { params });

export const getFplTable            = () =>
  apiFetch("/api/fpl/table");

export const getFplGameweekInsights = (params = {}) =>
  apiFetch("/api/fpl/gameweek-insights", { params });

export const getFplPlayerEp         = (playerId) =>
  apiFetch(`/api/fpl/player-ep/${playerId}`);

/** New: single-call FPL dashboard — deadline, captain, value, injuries */
export const getFplDashboard        = () =>
  apiFetch("/api/fpl/dashboard");


// ════════════════════════════════════════════════════════════════════════════
// LEAGUE  (/api/standings · /api/fixtures · /api/league · /api/simulate)
// ════════════════════════════════════════════════════════════════════════════

export const getStandings           = (league) =>
  fetchJson(`/api/standings/${league}`, "Standings");

export const getLeaguePredictions   = (league) =>
  fetchJson(`/api/league/${league}/predictions`, "Predictions");

export const getFixtures            = (league) =>
  fetchJson(`/api/fixtures/${league}`, "Fixtures");

export const getSeasonSimulation    = (league) =>
  fetchJson(`/api/simulate/${league}`, "Simulation");

export const getTopScorers          = (league) =>
  fetchJson(`/api/topscorers/${league}`, "Top scorers");

export const getTopAssists          = (league) =>
  fetchJson(`/api/topassists/${league}`, "Top assists");

export const getLeagueInjuries      = (league) =>
  fetchJson(`/api/injuries/${league}`, "Injuries");


// ════════════════════════════════════════════════════════════════════════════
// MATCH  (/api/match · /api/live · /api/matches)
// ════════════════════════════════════════════════════════════════════════════

export const getMatchesUpcoming     = () =>
  apiFetch("/api/matches/upcoming");

export const getMatchesResults      = (daysAgo = 3) =>
  apiFetch("/api/matches/results",  { params: { days_ago: daysAgo } });

export const getMatchesFuture       = (daysAhead = 7) =>
  apiFetch("/api/matches/future",   { params: { days_ahead: daysAhead } });

export const getMatchIntelligence   = (fixtureId) =>
  fetchJson(`/api/match-intelligence/${fixtureId}`, "Match intelligence");

export const getWinProbability      = (fixtureId) =>
  apiFetch(`/api/win-probability/${fixtureId}`);

export const getMatchMomentum       = (fixtureId) =>
  apiFetch(`/api/match-momentum/${fixtureId}`);

export const getShotMap             = (fixtureId) =>
  apiFetch(`/api/shot-map/${fixtureId}`);

export const getMatchLineup         = (fixtureId) =>
  apiFetch(`/api/match-lineup/${fixtureId}`);

export const getCommentary          = (fixtureId, signal) =>
  apiFetch(`/api/commentary/${fixtureId}`, { signal });

export const getH2H                 = (id1, id2, last = 10) =>
  fetchJson(`/api/h2h/${id1}/${id2}?last=${last}`, "H2H");

export const getFixtureOdds         = (fixtureId) =>
  fetchJson(`/api/odds/${fixtureId}`, "Odds");

export const getApiPrediction       = (fixtureId) =>
  fetchJson(`/api/apipred/${fixtureId}`, "API prediction");

export const getMatchSimulation     = (fixtureId, n = 50000) =>
  apiFetch(`/api/simulation/${fixtureId}`, { params: { n } });

/**
 * New: single-call match summary — replaces 6 parallel calls from the
 * match page components. Returns: fixture + events + stats + lineups +
 * momentum + win probability in one response.
 * Backend route: GET /api/match/{fixture_id}/summary
 */
export const getMatchSummary        = (fixtureId) =>
  apiFetch(`/api/match/${fixtureId}/summary`);


// ════════════════════════════════════════════════════════════════════════════
// PLAYERS  (/api/players · /api/squad-builder)
// ════════════════════════════════════════════════════════════════════════════

export const getSquadPlayers        = (params = {}) =>
  apiFetch("/api/squad-builder/players",          { params });

export const getSquadTeam           = (teamId, league = "epl") =>
  apiFetch(`/api/squad-builder/team/${teamId}`,   { params: { league } });

export const comparePlayers         = (ids, league = "epl") =>
  apiFetch("/api/squad-builder/compare",          { params: { player_ids: ids.join(","), league } });

export const searchPlayers          = (name, league = "epl") =>
  apiFetch("/api/squad-builder/search",           { params: { name, league } });

/**
 * New: full single-player profile.
 * Backend route: GET /api/player/{player_id}?season=2025
 * Returns: player info + season stats + recent form + career highlights.
 */
export const getPlayerProfile       = (playerId, season = 2025) =>
  apiFetch(`/api/player/${playerId}`,             { params: { season } });


// ════════════════════════════════════════════════════════════════════════════
// TEAMS  (/api/team)
// ════════════════════════════════════════════════════════════════════════════

export const getTeamStats           = (teamId, league) =>
  fetchJson(`/api/team/${teamId}/stats?league=${league}`, "Team stats");

export const getTeamInjuries        = (teamId) =>
  fetchJson(`/api/injuries/team/${teamId}`, "Team injuries");

/**
 * New: full team profile — squad, fixtures, standings, coach, form.
 * Backend route: GET /api/team/{team_id}/profile?league=epl
 * Replaces 4 inline fetch() calls in TeamPage.jsx.
 */
export const getTeamProfile         = (teamId, league = "epl") =>
  apiFetch(`/api/team/${teamId}/profile`,         { params: { league } });


// ════════════════════════════════════════════════════════════════════════════
// LINEUPS & PREDICTIONS  (/api/lineups · /api/predictions)
// ════════════════════════════════════════════════════════════════════════════

export const getPredictedLineup     = (fixtureId) =>
  apiFetch(`/api/lineups/predicted/${fixtureId}`);

export const getPredictionsHealth   = () =>
  apiFetch("/api/predictions/health");

export const getModelPerformance    = (params = {}) =>
  apiFetch("/api/predictions/performance",        { params });


// ════════════════════════════════════════════════════════════════════════════
// INTERNATIONAL  (/api/international)
// ════════════════════════════════════════════════════════════════════════════

export const getInternational       = (params = {}) =>
  apiFetch("/api/international/fixtures",         { params });

export const getInternationalStandings  = (comp) =>
  apiFetch(`/api/international/standings/${comp}`);

export const getInternationalPredictions = (comp) =>
  apiFetch(`/api/international/predictions/${comp}`);


// ════════════════════════════════════════════════════════════════════════════
// HOME  (/api/home)
// ════════════════════════════════════════════════════════════════════════════

/**
 * getDashboard — mega aggregated homepage payload.
 * Cached 5 min. Use individual section endpoints when possible to avoid
 * cold-start failures taking down the whole page (see HomePage.jsx pattern).
 */
export const getDashboard = withCache(
  `ss_dashboard_${new Date().toDateString()}`,
  () => apiFetch("/api/home/dashboard"),
  300_000,
);

/** Upcoming + live fixtures. Cached 3 min. */
export const getUpcoming = withCache(
  `ss_upcoming_${new Date().toDateString()}`,
  () => apiFetch("/api/matches/upcoming"),
  180_000,
);

// Individual home section endpoints — use these for parallel independent fetches
export const getHomeTitleRace          = (league = "epl") =>
  apiFetch("/api/home/title_race",        { params: { league } });

export const getHomeFormTable          = (league = "epl", n = 6) =>
  apiFetch("/api/home/form_table",        { params: { league, n } });

export const getHomeTopPredictions     = (league = "epl") =>
  apiFetch("/api/home/top_predictions",   { params: { league } });

export const getHomePowerRankings      = (league = "epl", n = 8) =>
  apiFetch("/api/home/power_rankings",    { params: { league, n } });

export const getHomeXgLeaders          = (league = "epl", n = 8) =>
  apiFetch("/api/home/xg_leaders",        { params: { league, n } });

export const getHomeModelEdges         = () =>
  apiFetch("/api/home/model_edges");

export const getHomeHighScoringMatches = (n = 5) =>
  apiFetch("/api/home/high_scoring_matches", { params: { n } });

export const getHomeModelConfidence    = () =>
  apiFetch("/api/home/model_confidence");

export const getHomeDifferentialCaptains = (n = 6) =>
  apiFetch("/api/home/differential_captains", { params: { n } });

export const getHomeValuePlayers       = (n = 6) =>
  apiFetch("/api/home/value_players",    { params: { n } });

export const getHomeTransferBrief      = () =>
  apiFetch("/api/home/transfer_brief");

export const getHomeDefenseTable       = (league = "epl", n = 6) =>
  apiFetch("/api/home/defense_table",    { params: { league, n } });

export const getHomePerformance        = () =>
  apiFetch("/api/home/performance");

export const getHomeAccountability     = () =>
  apiFetch("/api/home/accountability");

export const getHomeFplPlayerNews      = () =>
  apiFetch("/api/home/fpl_player_news");

export const getHomeAnalyticsTerm      = () =>
  apiFetch("/api/home/analytics_term");

export const getHomeRecentResults      = (n = 6) =>
  apiFetch("/api/home/recent_results",   { params: { n } });


// ════════════════════════════════════════════════════════════════════════════
// INTELLIGENCE  (/api/intelligence)
// ════════════════════════════════════════════════════════════════════════════

export const getIntelligenceFeed       = (limit = 12) =>
  apiFetch("/api/intelligence/feed",     { params: { limit } });