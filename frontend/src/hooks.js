// ═══════════════════════════════════════════════════════════════════════════
// src/hooks.js  —  StatinSite shared React hooks  v1
// ═══════════════════════════════════════════════════════════════════════════
//
// Previously duplicated inline (sometimes minified, sometimes formatted) in:
//   LivePage · LiveMatchPage · PlayerInsightPage · PlayerBrowsePage
//   PlayerProfile · SquadBuilderPage · FplTablePage · GameweekInsightsPage
//   HowItWorksPage · TeamPage · PredictionsPage · Navbar
//
// Usage:
//   import { useIsMobile, useReveal, useClickOutside, useLockScroll } from "@/hooks";
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";

// ── useIsMobile ──────────────────────────────────────────────────────────────
// Returns true when viewport width is below `bp` pixels.
// Safe for SSR (defaults to false on server).
// Re-evaluates on resize — debounced to 100ms to avoid thrashing.
export function useIsMobile(bp = 768) {
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" ? window.innerWidth < bp : false
  );

  useEffect(() => {
    let timer;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setMobile(window.innerWidth < bp), 100);
    };
    window.addEventListener("resize", handler, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handler);
    };
  }, [bp]);

  return mobile;
}

// ── useReveal ────────────────────────────────────────────────────────────────
// Intersection Observer hook. Returns [ref, isVisible].
// Once visible, stays visible (one-shot). Use for scroll-triggered animations.
//
// Usage:
//   const [ref, visible] = useReveal(0.05);
//   <div ref={ref} style={{ opacity: visible ? 1 : 0 }}>...</div>
export function useReveal(threshold = 0.05) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, visible];
}

// ── useClickOutside ──────────────────────────────────────────────────────────
// Fires `callback` when a click occurs outside the referenced element.
// Used in Navbar for closing drawers and dropdowns.
//
// Usage:
//   const ref = useRef(null);
//   useClickOutside(ref, () => setOpen(false));
export function useClickOutside(ref, callback) {
  const cb = useRef(callback);
  cb.current = callback; // keep fresh without re-registering listener

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        cb.current(e);
      }
    };
    document.addEventListener("mousedown", handler, { capture: true });
    document.addEventListener("touchstart", handler, { capture: true, passive: true });
    return () => {
      document.removeEventListener("mousedown", handler, { capture: true });
      document.removeEventListener("touchstart", handler, { capture: true });
    };
  }, [ref]);
}

// ── useLockScroll ────────────────────────────────────────────────────────────
// Locks body scroll when `locked` is true. Restores on unmount or when
// locked becomes false. Used in Navbar when mobile drawer is open.
export function useLockScroll(locked) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [locked]);
}

// ── useWindowWidth ───────────────────────────────────────────────────────────
// Returns the current window width. Updates on resize (debounced).
// Replaces the inline `useWindowWidth` in PredictionsPage.
export function useWindowWidth() {
  const [width, setWidth] = useState(
    () => typeof window !== "undefined" ? window.innerWidth : 1200
  );

  useEffect(() => {
    let timer;
    const handler = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setWidth(window.innerWidth), 100);
    };
    window.addEventListener("resize", handler, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handler);
    };
  }, []);

  return width;
}

// ── useCountUp ───────────────────────────────────────────────────────────────
// Animates a number from 0 to `to` over `duration` ms once visible.
// Extracted from HomePage.jsx CountUp component.
//
// Usage:
//   const [ref, value] = useCountUp(1234, 900);
//   <span ref={ref}>{value}</span>
export function useCountUp(to, duration = 900) {
  const [ref, visible] = useReveal(0.1);
  const [value, setValue] = useState(0);
  const ran = useRef(false);

  useEffect(() => {
    if (!visible || ran.current || !to) return;
    ran.current = true;
    const t0 = performance.now();
    const tick = (ts) => {
      const p = Math.min((ts - t0) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - p, 4)) * to));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible, to, duration]);

  return [ref, value];
}

// ── useSessionCache ──────────────────────────────────────────────────────────
// sessionStorage-backed cache hook. Returns [data, loading, error].
// Falls back to fetching when cache is stale or missing.
//
// Usage:
//   const [data, loading, error] = useSessionCache("key", fetchFn, 300_000);
export function useSessionCache(key, fetchFn, ttlMs = 300_000) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let dead = false;

    // Try cache first
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const { ts, d } = JSON.parse(raw);
        if (Date.now() - ts < ttlMs) {
          setData(d);
          setLoading(false);
          return;
        }
      }
    } catch (_) {}

    // Fetch fresh
    fetchFn()
      .then((d) => {
        if (dead) return;
        setData(d);
        try {
          sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), d }));
        } catch (_) {}
      })
      .catch((e) => { if (!dead) setError(e.message ?? String(e)); })
      .finally(() => { if (!dead) setLoading(false); });

    return () => { dead = true; };
  }, [key, ttlMs]); // fetchFn intentionally excluded — callers should memoize

  return [data, loading, error];
}

// ── useInterval ──────────────────────────────────────────────────────────────
// Runs `callback` every `delayMs` ms. Pass null to pause.
// Cleans up correctly on unmount or delay change.
export function useInterval(callback, delayMs) {
  const cb = useRef(callback);
  cb.current = callback;

  useEffect(() => {
    if (delayMs === null) return;
    const id = setInterval(() => cb.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}

// ── useDebounce ──────────────────────────────────────────────────────────────
// Returns a debounced version of `value` that updates after `delayMs`.
// Use for search inputs to avoid hammering the API on every keystroke.
export function useDebounce(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// ── usePrevious ──────────────────────────────────────────────────────────────
// Returns the value from the previous render.
export function usePrevious(value) {
  const ref = useRef(undefined);
  useEffect(() => { ref.current = value; });
  return ref.current;
}