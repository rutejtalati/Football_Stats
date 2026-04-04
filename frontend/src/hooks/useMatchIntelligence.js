// frontend/src/hooks/useMatchIntelligence.js
// Session-cached hook for /api/match-intelligence/:fixtureId
// Live matches are NOT cached (status check on response).

import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "https://footballstats-production-ecd9.up.railway.app";const CACHE_TTL = 5 * 60 * 1000; // 5 min
const LIVE_STATUSES = ["1H", "2H", "HT", "ET", "BT", "P", "INT", "LIVE"];

const _cache = {};

function _cacheKey(id) { return `mi_v2_${id}`; }

export function useMatchIntelligence(fixtureId) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const abortRef              = useRef(null);

  const fetch_ = useCallback(async (force = false) => {
    if (!fixtureId) return;

    const key    = _cacheKey(fixtureId);
    const cached = _cache[key];

    // Return cache unless it's expired, a live match, or forced
    if (!force && cached) {
      const isLive = LIVE_STATUSES.includes(cached.data?.header?.status_short);
      if (!isLive && Date.now() - cached.ts < CACHE_TTL) {
        setData(cached.data);
        return;
      }
    }

    setLoading(true);
    setError(null);

    // Abort previous request if any
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(
        `${API_BASE}/api/match-intelligence/${fixtureId}`,
        { signal: ctrl.signal }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      _cache[key] = { data: json, ts: Date.now() };
      setData(json);
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [fixtureId]);

  // Auto-refresh every 60s for live matches
  useEffect(() => {
    fetch_();
    const interval = setInterval(() => {
      const key = _cacheKey(fixtureId);
      const isLive = LIVE_STATUSES.includes(_cache[key]?.data?.header?.status_short);
      if (isLive) fetch_(true);
    }, 60000);
    return () => {
      clearInterval(interval);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetch_, fixtureId]);

  return { data, loading, error, refetch: () => fetch_(true) };
}