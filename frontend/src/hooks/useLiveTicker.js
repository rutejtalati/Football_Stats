// hooks/useLiveTicker.js
// Builds ticker chips from /api/matches/upcoming (no dead endpoint).
// Automatically pauses when the browser tab is hidden.
// Returns { chips, isLive, loading, error }

import { useState, useEffect, useRef, useCallback } from "react";

const BACKEND          = "https://football-stats-lw4b.onrender.com";
const DEFAULT_INTERVAL = 75_000; // 75 seconds

const LIVE_STATUSES = new Set(["1H", "2H", "HT", "ET", "BT", "P"]);

// ── Build chips from the matches/upcoming response ────────────────────
function buildChips(matches) {
  if (!Array.isArray(matches)) return [];
  const chips = [];

  for (const m of matches) {
    const isLive    = LIVE_STATUSES.has(m.status);
    const isUpcoming = m.status === "NS" || m.status === "TBD";

    if (isLive) {
      const score = (m.home_score ?? "?") + "–" + (m.away_score ?? "?");
      const min   = m.minute ? ` ${m.minute}'` : "";
      chips.push({
        type:       "live_score",
        label:      `${m.home_team} ${score} ${m.away_team}${min}`,
        detail:     m.league_name ?? "",
        home_logo:  m.home_logo  ?? "",
        away_logo:  m.away_logo  ?? "",
        fixture_id: m.fixture_id,
      });
    } else if (isUpcoming) {
      const kickoff = m.kickoff ? m.kickoff : null;
      chips.push({
        type:       "upcoming",
        label:      `${m.home_team} vs ${m.away_team}`,
        detail:     kickoff ? `${kickoff} · ${m.league_name ?? ""}` : (m.league_name ?? ""),
        home_logo:  m.home_logo  ?? "",
        away_logo:  m.away_logo  ?? "",
        fixture_id: m.fixture_id,
      });
    }
  }

  return chips;
}

// ─────────────────────────────────────────────────────────────────────

export function useLiveTicker(intervalMs = DEFAULT_INTERVAL) {
  const [chips,   setChips]   = useState([]);
  const [isLive,  setIsLive]  = useState(false);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const timerRef = useRef(null);
  const abortRef = useRef(null);

  const fetchTicker = useCallback(async () => {
    if (document.hidden) return;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${BACKEND}/api/matches/upcoming`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const json    = await res.json();
      const matches = json?.matches ?? [];
      const built   = buildChips(matches);

      setChips(built);
      setIsLive(matches.some(m => LIVE_STATUSES.has(m.status)));
      setError(null);
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTicker();
    timerRef.current = setInterval(fetchTicker, intervalMs);

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