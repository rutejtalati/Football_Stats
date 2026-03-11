// hooks/useLiveTicker.js
// Polls /api/live/summary on a configurable interval.
// Automatically pauses when the browser tab is hidden.
// Returns { data, mode, isLive, loading, error }

import { useState, useEffect, useRef, useCallback } from "react";

const BACKEND = "https://football-stats-lw4b.onrender.com";
const DEFAULT_INTERVAL = 75_000; // 75 seconds

export function useLiveTicker(intervalMs = DEFAULT_INTERVAL) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const timerRef            = useRef(null);
  const abortRef            = useRef(null);

  const fetchTicker = useCallback(async () => {
    // Don't fetch if tab is hidden — saves requests
    if (document.hidden) return;

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${BACKEND}/api/live/summary`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchTicker();

    // Set up polling
    timerRef.current = setInterval(fetchTicker, intervalMs);

    // Pause/resume on tab visibility change
    const onVisibility = () => {
      if (!document.hidden) fetchTicker(); // immediate refresh when tab comes back
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchTicker, intervalMs]);

  return {
    data,
    mode:   data?.mode ?? "quiet",
    isLive: data?.mode === "live",
    chips:  data?.chips ?? [],
    loading,
    error,
  };
}