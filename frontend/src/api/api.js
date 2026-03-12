// api.js — StatinSite
// Backend: https://football-stats-lw4b.onrender.com
// Local dev: http://127.0.0.1:8003
// Vercel reads VITE_API_BASE from environment variables

const API_BASE = (import.meta.env.VITE_API_BASE || "https://football-stats-lw4b.onrender.com").replace(/\/$/, "");

async function fetchJson(path, errMsg) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    let d = ""; try { d = await res.text(); } catch {}
    throw new Error(`${errMsg}${d ? `: ${d}` : ""}`);
  }
  return res.json();
}

// ── FPL ──────────────────────────────────────────────────────
export const getFplPredictorTable = (params={}) =>
  fetchJson(`/api/fpl/predictor-table${Object.keys(params).length ? "?"+new URLSearchParams(params) : ""}`, "FPL predictor");
export const getFplSummaryCards  = (gw=29) => fetchJson(`/api/fpl/summary-cards?start_gw=${gw}`, "FPL summary");
export const getFplBootstrap     = ()      => fetchJson("/api/fpl/bootstrap", "FPL bootstrap");

// ── League ───────────────────────────────────────────────────
export const getStandings         = (lg)    => fetchJson(`/api/standings/${lg}`, "Standings");
export const getLeaguePredictions = (lg)    => fetchJson(`/api/league/${lg}/predictions`, "Predictions");
export const getFixtures          = (lg)    => fetchJson(`/api/fixtures/${lg}`, "Fixtures");
export const getSeasonSimulation  = (lg)    => fetchJson(`/api/simulate/${lg}`, "Simulation");
export const getTopScorers        = (lg)    => fetchJson(`/api/topscorers/${lg}`, "Top scorers");
export const getTopAssists        = (lg)    => fetchJson(`/api/topassists/${lg}`, "Top assists");
export const getLeagueInjuries    = (lg)    => fetchJson(`/api/injuries/${lg}`, "Injuries");

// ── Per-fixture / per-team ────────────────────────────────────
export const getH2H               = (id1,id2,last=10) => fetchJson(`/api/h2h/${id1}/${id2}?last=${last}`, "H2H");
export const getFixtureOdds       = (fid)   => fetchJson(`/api/odds/${fid}`, "Odds");
export const getApiPrediction     = (fid)   => fetchJson(`/api/apipred/${fid}`, "API prediction");
export const getTeamStats         = (tid,lg) => fetchJson(`/api/team/${tid}/stats?league=${lg}`, "Team stats");
export const getTeamInjuries      = (tid)   => fetchJson(`/api/injuries/team/${tid}`, "Team injuries");
export const getMatchIntelligence = (fid) =>
  fetchJson(`/api/match-intelligence/${fid}`, "Match intelligence");
// ── News ──────────────────────────────────────────────────────
export const getLeagueNews        = (lg)    => fetchJson(`/api/news/${lg}`, "News");