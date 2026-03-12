// frontend/src/hooks/useMatchIntelligence.js
import { useState, useEffect, useCallback, useRef } from "react";
import { getMatchIntelligence } from "../api/api";

const SESSION_PREFIX = "mi_v1_";
const SESSION_TTL    = 10 * 60 * 1000; // 10 minutes (matches backend events TTL)

export function useMatchIntelligence(fixtureId) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const prevId = useRef(null);

  const fetch_ = useCallback(async (fid, bustCache = false) => {
    if (!fid) return;
    setLoading(true);
    setError(null);

    // Check sessionStorage cache first
    if (!bustCache) {
      try {
        const raw = sessionStorage.getItem(SESSION_PREFIX + fid);
        if (raw) {
          const { data: cached, ts } = JSON.parse(raw);
          if (Date.now() - ts < SESSION_TTL) {
            setData(cached);
            setLoading(false);
            return;
          }
        }
      } catch {}
    }

    try {
      const result = await getMatchIntelligence(fid);
      setData(result);
      try {
        sessionStorage.setItem(
          SESSION_PREFIX + fid,
          JSON.stringify({ data: result, ts: Date.now() })
        );
      } catch {}
    } catch (e) {
      setError(e.message || "Failed to load match data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fixtureId && fixtureId !== prevId.current) {
      prevId.current = fixtureId;
      fetch_(fixtureId);
    }
  }, [fixtureId, fetch_]);

  const refetch = useCallback(() => fetch_(fixtureId, true), [fixtureId, fetch_]);

  return { data, loading, error, refetch };
}