// hooks/useLiveTicker.js
// Builds ticker chips from /api/matches/upcoming.
// Fixes:
//   1. Render.com cold-start: retries up to 3× with backoff, 12s timeout per attempt
//   2. Response shape guard: handles both { matches:[…] } and […] root arrays
//   3. Field-name guard: tolerates home_name/away_name aliases from some backends
//   4. Automatically pauses when the browser tab is hidden.
// Returns { chips, isLive, loading, error }

import { useState, useEffect, useRef, useCallback } from "react";

const BACKEND          = "https://football-stats-lw4b.onrender.com";
const DEFAULT_INTERVAL = 75_000;   // 75 s polling
const FETCH_TIMEOUT    = 12_000;   // 12 s per attempt (covers cold-start lag)
const MAX_RETRIES      = 3;        // retry up to 3× on first load
const RETRY_DELAY_MS   = 4_000;    // 4 s between retries

const LIVE_STATUSES = new Set(["1H", "2H", "HT", "ET", "BT", "P"]);

// ── Normalise a single match object across backend shape variants ─────
function normaliseMatch(m) {
  return {
    status:      m.status ?? m.status_short ?? "",
    home_team:   m.home_team  ?? m.home_name  ?? m.homeTeam  ?? "?",
    away_team:   m.away_team  ?? m.away_name  ?? m.awayTeam  ?? "?",
    home_score:  m.home_score ?? m.goals?.home ?? null,
    away_score:  m.away_score ?? m.goals?.away ?? null,
    minute:      m.minute     ?? m.elapsed    ?? null,
    league_name: m.league_name ?? m.league?.name ?? "",
    home_logo:   m.home_logo  ?? m.teams?.home?.logo ?? "",
    away_logo:   m.away_logo  ?? m.teams?.away?.logo ?? "",
    kickoff:     m.kickoff    ?? m.date        ?? null,
    fixture_id:  m.fixture_id ?? m.id          ?? null,
  };
}

// ── Extract the matches array regardless of response envelope ─────────
function extractMatches(json) {
  if (!json) return [];
  // { matches: […] }  ← expected shape
  if (Array.isArray(json.matches)) return json.matches;
  // { data: { matches: […] } }
  if (Array.isArray(json.data?.matches)) return json.data.matches;
  // { data: […] }
  if (Array.isArray(json.data)) return json.data;
  // bare array at root
  if (Array.isArray(json)) return json;
  return [];
}

// ── Build chips ───────────────────────────────────────────────────────
function buildChips(rawMatches) {
  if (!Array.isArray(rawMatches) || rawMatches.length === 0) return [];
  const chips = [];

  for (const raw of rawMatches) {
    const m = normaliseMatch(raw);

    if (LIVE_STATUSES.has(m.status)) {
      const score = `${m.home_score ?? "?"}–${m.away_score ?? "?"}`;
      const min   = m.minute ? ` ${m.minute}'` : "";
      chips.push({
        type:       "live_score",
        label:      `${m.home_team} ${score} ${m.away_team}${min}`,
        detail:     m.league_name,
        home_logo:  m.home_logo,
        away_logo:  m.away_logo,
        fixture_id: m.fixture_id,
      });
    } else if (m.status === "NS" || m.status === "TBD" || m.status === "") {
      chips.push({
        type:       "upcoming",
        label:      `${m.home_team} vs ${m.away_team}`,
        detail:     m.kickoff
          ? `${m.kickoff} · ${m.league_name}`
          : m.league_name,
        home_logo:  m.home_logo,
        away_logo:  m.away_logo,
        fixture_id: m.fixture_id,
      });
    }
  }

  return chips;
}

// ── fetch with timeout helper ─────────────────────────────────────────
async function fetchWithTimeout(url, signal, timeoutMs) {
  const timeoutId = setTimeout(() => {
    try { signal.controller?.abort(); } catch (_) {}
  }, timeoutMs);

  try {
    const res = await fetch(url, { signal });
    clearTimeout(timeoutId);
    return res;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────

export function useLiveTicker(intervalMs = DEFAULT_INTERVAL) {
  const [chips,   setChips]   = useState([]);
  const [isLive,  setIsLive]  = useState(false);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const timerRef    = useRef(null);
  const abortRef    = useRef(null);
  const retriesRef  = useRef(0);   // tracks retries for initial load only
  const hasDataRef  = useRef(false); // true once we've received ≥1 chip

  const fetchTicker = useCallback(async (isRetry = false) => {
    if (document.hidden) return;

    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetchWithTimeout(
        `${BACKEND}/api/matches/upcoming`,
        ctrl.signal,
        FETCH_TIMEOUT,
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json    = await res.json();
      const raw     = extractMatches(json);
      const built   = buildChips(raw);

      setChips(built);
      setIsLive(raw.some(m => LIVE_STATUSES.has(m.status ?? "")));
      setError(null);
      hasDataRef.current  = true;
      retriesRef.current  = 0; // reset for next polling cycle

    } catch (e) {
      if (e.name === "AbortError") return;

      // On first load, retry up to MAX_RETRIES with backoff
      // (handles Render.com cold-start taking 20–50 s)
      if (!hasDataRef.current && retriesRef.current < MAX_RETRIES) {
        retriesRef.current += 1;
        const delay = RETRY_DELAY_MS * retriesRef.current;
        setTimeout(() => fetchTicker(true), delay);
        // Don't set error yet — keep showing loading state
        return;
      }

      setError(e.message);
    } finally {
      // Only clear loading spinner once (not on every retry)
      if (!isRetry || hasDataRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchTicker();
    timerRef.current = setInterval(() => fetchTicker(), intervalMs);

    const onVisibility = () => {
      if (!document.hidden) fetchTicker();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchTicker, intervalMs]);

  return { chips, isLive, loading, error };
}