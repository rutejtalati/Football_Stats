// api.js — StatinSite
// Backend: https://footballstats-production-ecd9.up.railway.app// Local dev: http://127.0.0.1:8003
// API_BASE priority (first defined wins):
//   VITE_API_BASE    — set this in .env.local and Vercel (preferred)
//   VITE_BACKEND_URL — legacy alias used by some pages
//   VITE_API_URL     — legacy alias used by some pages
//   fallback         — Render production URL
//
// All original exports are preserved with their original signatures.
// New helpers (apiFetch, withCache, getDashboard, getUpcoming, etc.)
// are additive — nothing existing was removed or renamed.

const _env = import.meta?.env ?? {};

export const API_BASE = (
  _env.VITE_API_BASE ||
  _env.VITE_BACKEND_URL ||
  _env.VITE_API_URL ||
"https://footballstats-production-ecd9.up.railway.app"
).replace(/\/$/, "");

// ── Original fetchJson (kept exactly — all existing pages use this) ──────────
async function fetchJson(path, errMsg) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    let d = ""; try { d = await res.text(); } catch {}
    throw new Error(`${errMsg}${d ? `: ${d}` : ""}`);
  }
  return res.json();
}

// ── New: lower-level fetch with params + AbortController + retry support ──────
// retries: number of additional attempts on network failure or 5xx (default 2).
// backoff: base ms between retries, doubles each attempt (default 2000ms).
// On cold-start (Render free tier), the first request often fails with
// net::ERR_FAILED which the browser misreports as a CORS error.
// Retrying after a short backoff lets the server wake up and respond normally.
export async function apiFetch(path, { signal, params, retries = 2, backoff = 2000 } = {}) {
  let url = `${API_BASE}${path}`;
  if (params && Object.keys(params).length) {
    url += "?" + new URLSearchParams(params).toString();
  }

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    // Exponential backoff between retries (skip delay on first attempt)
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, backoff * Math.pow(2, attempt - 1)));
    }
    try {
      const res = await fetch(url, signal ? { signal } : undefined);
      if (res.ok) return res.json();
      // Don't retry on 4xx — those are permanent client/not-found errors
      if (res.status >= 400 && res.status < 500) {
        let body = ""; try { body = await res.text(); } catch {}
        throw new Error(`[${res.status}] ${path}${body ? ` — ${body.slice(0, 120)}` : ""}`);
      }
      // 5xx — record and retry
      let body = ""; try { body = await res.text(); } catch {}
      lastErr = new Error(`[${res.status}] ${path}${body ? ` — ${body.slice(0, 120)}` : ""}`);
    } catch (err) {
      if (err.name === "AbortError") throw err; // never retry an intentional abort
      lastErr = err;
    }
  }
  throw lastErr;
}

// ── New: sessionStorage cache wrapper ────────────────────────────────────────
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

// ── Slug / code normalisation (shared with App.jsx SLUG_MAP) ─────────────────
export const LEAGUE_CODES = {
  "premier-league": "epl", "la-liga": "laliga", "serie-a": "seriea",
  "ligue-1": "ligue1", "bundesliga": "bundesliga",
  "champions-league": "ucl", "europa-league": "uel",
  "conference-league": "uecl", "fa-cup": "facup",
  epl:"epl", laliga:"laliga", seriea:"seriea", ligue1:"ligue1",
  bundesliga:"bundesliga", ucl:"ucl", uel:"uel", uecl:"uecl", facup:"facup",
};
export const toCode = s => LEAGUE_CODES[s] ?? s;

// ════════════════════════════════════════════════════════════════════════════
// ORIGINAL EXPORTS — signatures unchanged, existing pages import these
// ════════════════════════════════════════════════════════════════════════════

// ── FPL ──────────────────────────────────────────────────────────────────────
export const getFplPredictorTable = (params = {}) =>
  fetchJson(`/api/fpl/predictor-table${Object.keys(params).length ? "?" + new URLSearchParams(params) : ""}`, "FPL predictor");
export const getFplSummaryCards   = (gw = 29) => fetchJson(`/api/fpl/summary-cards?start_gw=${gw}`, "FPL summary");
export const getFplBootstrap      = ()         => fetchJson("/api/fpl/bootstrap", "FPL bootstrap");

// ── League ────────────────────────────────────────────────────────────────────
export const getStandings         = (lg)        => fetchJson(`/api/standings/${lg}`, "Standings");
export const getLeaguePredictions = (lg)        => fetchJson(`/api/league/${lg}/predictions`, "Predictions");
export const getFixtures          = (lg)        => fetchJson(`/api/fixtures/${lg}`, "Fixtures");
export const getSeasonSimulation  = (lg)        => fetchJson(`/api/simulate/${lg}`, "Simulation");
export const getTopScorers        = (lg)        => fetchJson(`/api/topscorers/${lg}`, "Top scorers");
export const getTopAssists        = (lg)        => fetchJson(`/api/topassists/${lg}`, "Top assists");
export const getLeagueInjuries    = (lg)        => fetchJson(`/api/injuries/${lg}`, "Injuries");

// ── Per-fixture / per-team ────────────────────────────────────────────────────
export const getH2H               = (id1, id2, last = 10) => fetchJson(`/api/h2h/${id1}/${id2}?last=${last}`, "H2H");
export const getFixtureOdds       = (fid)       => fetchJson(`/api/odds/${fid}`, "Odds");
export const getApiPrediction     = (fid)       => fetchJson(`/api/apipred/${fid}`, "API prediction");
export const getTeamStats         = (tid, lg)   => fetchJson(`/api/team/${tid}/stats?league=${lg}`, "Team stats");
export const getTeamInjuries      = (tid)       => fetchJson(`/api/injuries/team/${tid}`, "Team injuries");
export const getMatchIntelligence = (fid)       => fetchJson(`/api/match-intelligence/${fid}`, "Match intelligence");

// ── News ──────────────────────────────────────────────────────────────────────
export const getLeagueNews        = (lg)        => fetchJson(`/api/news/${lg}`, "News");

// ════════════════════════════════════════════════════════════════════════════
// NEW EXPORTS — additive only, used by HomePage + refactored pages
// ════════════════════════════════════════════════════════════════════════════

// ── Homepage ──────────────────────────────────────────────────────────────────
/** Single dashboard payload — powers the entire homepage. Cached 5 min. */
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

// ── Match detail ──────────────────────────────────────────────────────────────
export const getWinProbability = fid => apiFetch(`/api/win-probability/${fid}`);
export const getMatchMomentum  = fid => apiFetch(`/api/match-momentum/${fid}`);
export const getShotMap        = fid => apiFetch(`/api/shot-map/${fid}`);
export const getMatchLineup    = fid => apiFetch(`/api/match-lineup/${fid}`);
export const getCommentary     = (fid, signal) => apiFetch(`/api/commentary/${fid}`, { signal });

// ── Live page ─────────────────────────────────────────────────────────────────
export const getMatchesUpcoming = ()           => apiFetch("/api/matches/upcoming");
export const getMatchesResults  = (daysAgo  = 3)  => apiFetch("/api/matches/results",  { params: { days_ago:   daysAgo  } });
export const getMatchesFuture   = (daysAhead = 7)  => apiFetch("/api/matches/future",   { params: { days_ahead: daysAhead } });
export const getInternational   = (params = {})    => apiFetch("/api/international/fixtures", { params });

// ── FPL pages (new endpoints not in original file) ────────────────────────────
export const getFplCaptaincy         = (params = {}) => apiFetch("/api/fpl/captaincy",           { params });
export const getFplDifferentials     = (params = {}) => apiFetch("/api/fpl/differentials",        { params });
export const getFplFixtureDifficulty = (params = {}) => apiFetch("/api/fpl/fixture-difficulty",   { params });
export const getFplTransferPlanner   = (params = {}) => apiFetch("/api/fpl/transfer-planner",     { params });
export const getFplBestTeam          = (params = {}) => apiFetch("/api/fpl/best-team",            { params });
export const getFplTable             = ()            => apiFetch("/api/fpl/table");
export const getFplGameweekInsights  = (params = {}) => apiFetch("/api/fpl/gameweek-insights",    { params });

// ── Squad builder ─────────────────────────────────────────────────────────────
export const getSquadPlayers = (params = {})        => apiFetch("/api/squad-builder/players", { params });
export const getSquadTeam    = (teamId, league="epl") => apiFetch(`/api/squad-builder/team/${teamId}`, { params: { league } });
export const comparePlayers  = (ids, league="epl")  => apiFetch("/api/squad-builder/compare", { params: { player_ids: ids.join(","), league } });
export const searchPlayers   = (name, league="epl") => apiFetch("/api/squad-builder/search",  { params: { name, league } });

// ── Lineups / accountability ───────────────────────────────────────────────────
export const getPredictedLineup   = fid       => apiFetch(`/api/lineups/predicted/${fid}`);
export const getPredictionsHealth = ()         => apiFetch("/api/predictions/health");
export const getModelPerformance  = (params={}) => apiFetch("/api/predictions/performance", { params });