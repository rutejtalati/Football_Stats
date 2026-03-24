// Navbar.jsx — StatinSite · Neobrutalist Edition
// Design: bold yellow (#e8ff47) on black, thick borders, offset box-shadows,
// hover fill-from-bottom, animated logo, FPL dropdown preserved.

import { useState, useRef, useEffect, useCallback } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

/* ─── Icons (unchanged) ─────────────────────────────────── */
const Icons = {
  Home: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 6.5L7 1.5l6 5V13H9v-3H5v3H1V6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  ),
  Live: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2.5" fill="currentColor"/>
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2" opacity="0.45"/>
      <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="0.8" opacity="0.18"/>
    </svg>
  ),
  Predict: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1.5 11l3-5 2.5 2 2.5-4L12 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="4.5" r="1.5" fill="currentColor" opacity="0.7"/>
    </svg>
  ),
  Fantasy: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1l1.5 3.2 3.5.5-2.5 2.5.6 3.5L7 9.2 3.9 10.7l.6-3.5L2 4.7l3.5-.5L7 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
  Players: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M2 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  News: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M4 5.5h6M4 8h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  GroundZero: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
      <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  Games: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="4" width="12" height="7" rx="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 7.5H7M6 6.5v2M9.5 7h.01M10.5 8h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Search: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Close: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Menu: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  ),
};

/* ─── Nav config ─────────────────────────────────────────── */
const NAV_ITEMS = [
  { to: "/",                           label: "Home",        Icon: Icons.Home,       color: "#e8ff47", end: true },
  { to: "/live",                       label: "Live",        Icon: Icons.Live,       color: "#ff2744", isLive: true },
  { to: "/predictions/premier-league", label: "Predictions", Icon: Icons.Predict,    color: "#e8ff47" },
  { to: "/best-team",                  label: "Fantasy",     Icon: Icons.Fantasy,    color: "#e8ff47", fplGroup: true },
  { to: "/player",                     label: "Players",     Icon: Icons.Players,    color: "#e8ff47" },
  { to: "/news",                       label: "News",        Icon: Icons.News,       color: "#e8ff47" },
  { to: "/learn",                      label: "How It Works", Icon: Icons.GroundZero, color: "#e8ff47", secondary: true },
  { to: "/games",                      label: "Games",       Icon: Icons.Games,      color: "#e8ff47", secondary: true },
];

const FPL_ITEMS = [
  { to: "/best-team",          label: "Best XI",            desc: "Optimal FPL starting 11"       },
  { to: "/squad-builder",      label: "Squad Builder",      desc: "Build your 15-man squad"        },
  { to: "/gameweek-insights",  label: "GW Insights",        desc: "Gameweek stats & analysis"      },
  { to: "/fpl-table",          label: "FPL Table",          desc: "Live FPL leaderboard"           },
  { to: "/captaincy",          label: "Captaincy",          desc: "Captain picks & ownership data" },
  { to: "/fixture-difficulty", label: "Fixture Difficulty", desc: "FDR heatmap across gameweeks"   },
  { to: "/transfer-planner",   label: "Transfer Planner",   desc: "Plan transfers & free hits"     },
  { to: "/differentials",      label: "Differentials",      desc: "Low-owned high-ceiling picks"   },
];

const FPL_PATHS = [
  "/best-team", "/squad-builder", "/gameweek-insights", "/fpl-table",
  "/captaincy", "/fixture-difficulty", "/transfer-planner", "/differentials",
];

const BOTTOM_TABS = [
  { to: "/",                           label: "Home",    Icon: Icons.Home,    color: "#e8ff47", end: true },
  { to: "/live",                       label: "Live",    Icon: Icons.Live,    color: "#ff2744", isLive: true },
  { to: "/predictions/premier-league", label: "Predict", Icon: Icons.Predict, color: "#e8ff47" },
  { to: "/best-team",                  label: "Fantasy", Icon: Icons.Fantasy, color: "#e8ff47" },
  { to: "/player",                     label: "Players", Icon: Icons.Players, color: "#e8ff47" },
];

/* ─── Hooks ─────────────────────────────────────────────── */
function useScrollHide(threshold = 8) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  useEffect(() => {
    const fn = () => {
      const y = window.scrollY;
      if (y < threshold) { setHidden(false); lastY.current = y; return; }
      setHidden(y > lastY.current);
      lastY.current = y;
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, [threshold]);
  return hidden;
}

function useClickOutside(ref, cb) {
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [ref, cb]);
}

function useLockScroll(on) {
  useEffect(() => {
    document.body.style.overflow = on ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [on]);
}

function useFplActive() {
  const { pathname } = useLocation();
  return FPL_PATHS.some(p => pathname.startsWith(p));
}

/* ─── Brand mark — bold neo version ─────────────────────── */
function BrandMark() {
  return (
    <div style={{
      width: 30, height: 30,
      background: "#e8ff47",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 16, fontWeight: 900, color: "#0a0a0a",
      fontFamily: "'Space Grotesk', sans-serif",
      flexShrink: 0,
      animation: "neoLogoWiggle 3.5s ease-in-out infinite",
    }}>S</div>
  );
}

/* ─── Bottom tab bar ─────────────────────────────────────── */
function BottomTabBar() {
  const location = useLocation();
  return (
    <nav className="sn-bottom-tabs" aria-label="Mobile navigation">
      {BOTTOM_TABS.map(item => {
        const active = item.end
          ? location.pathname === item.to
          : location.pathname.startsWith(item.to);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={"sn-bottom-tab-link" + (active ? " active" : "")}
            style={{ "--tab-color": item.color }}
          >
            <div className={"sn-bottom-tab-icon" + (item.isLive ? " sn-bti--live" : "")}>
              <item.Icon />
              {item.isLive && <span className="sn-live-dot-bt" />}
            </div>
            <span className="sn-bottom-tab-label">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

/* ─── Main export ────────────────────────────────────────── */
export default function Navbar() {
  const location   = useLocation();
  const navigate   = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal,  setSearchVal]  = useState("");
  const [fplOpen,    setFplOpen]    = useState(false);

  const searchRef = useRef(null);
  const inputRef  = useRef(null);
  const fplRef    = useRef(null);

  const hidden    = useScrollHide();
  const fplActive = useFplActive();

  useClickOutside(searchRef, () => { setSearchOpen(false); setSearchVal(""); });
  useClickOutside(fplRef,    () => setFplOpen(false));
  useLockScroll(mobileOpen);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 60);
  }, [searchOpen]);

  useEffect(() => { setMobileOpen(false); setFplOpen(false); }, [location.pathname]);

  const handleSearch = (e) => {
    if (e.key === "Enter" && searchVal.trim()) {
      navigate(`/player?search=${encodeURIComponent(searchVal.trim())}`);
      setSearchOpen(false); setSearchVal("");
    }
    if (e.key === "Escape") { setSearchOpen(false); setSearchVal(""); }
  };

  const isActive = (item) => {
    if (item.fplGroup) return fplActive;
    if (item.end)      return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  return (
    <>
      <style>{`
        /* ─── Keyframes ─── */
        @keyframes neoLogoWiggle {
          0%,100% { transform: rotate(0deg); }
          20%      { transform: rotate(-4deg); }
          40%      { transform: rotate(4deg); }
          60%      { transform: rotate(-2deg); }
          80%      { transform: rotate(2deg); }
        }
        @keyframes neoLivePulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%     { opacity: 0.3; transform: scale(0.55); }
        }
        @keyframes neoLiveRing {
          0%   { transform: scale(1);   opacity: 0.6; }
          80%  { transform: scale(2.8); opacity: 0; }
          100% { opacity: 0; }
        }
        @keyframes neoFadeDown {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes neoDrawerIn {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        /* ─── Bar ─── */
        .sn-bar {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 56px;
          z-index: 200;
          background: #0a0a0a;
          border-bottom: 4px solid #e8ff47;
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
          overflow: visible;
        }
        .sn-bar--hidden { transform: translateY(-100%); }
        .sn-bar--open   { z-index: 202; }

        .sn-wrap {
          display: flex;
          align-items: center;
          height: 100%;
          max-width: 1520px;
          margin: 0 auto;
          padding: 0 20px;
          gap: 6px;
          overflow: visible;
        }

        /* ─── Brand ─── */
        .sn-brand {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none; flex-shrink: 0;
          padding: 4px 8px;
          border-right: 3px solid #e8ff47;
          margin-right: 8px;
          height: 100%;
        }
        .sn-brand-text { display: flex; flex-direction: column; gap: 0; }
        .sn-brand-name {
          font-size: 15px; font-weight: 900; color: #e8ff47;
          letter-spacing: 0.04em; font-family: 'Bebas Neue', 'Space Grotesk', sans-serif;
          line-height: 1; white-space: nowrap; letter-spacing: 3px;
        }
        .sn-brand-tag {
          font-size: 7px; font-weight: 700; letter-spacing: 0.18em;
          color: rgba(232,255,71,0.4); text-transform: uppercase;
          font-family: 'DM Mono', monospace; line-height: 1; margin-top: 2px;
        }

        /* ─── Divider ─── */
        .sn-divider {
          width: 1px; height: 20px;
          background: rgba(232,255,71,0.15);
          flex-shrink: 0; margin: 0 4px;
        }

        /* ─── Nav ─── */
        .sn-nav {
          display: flex; align-items: stretch; gap: 0;
          flex: 1; justify-content: center; min-width: 0; overflow: visible;
        }

        /* ─── Pills — fill from bottom on hover ─── */
        .sn-pill {
          position: relative;
          display: inline-flex; align-items: center; gap: 5px;
          padding: 0 16px; height: 100%;
          border: none; border-right: 1px solid rgba(232,255,71,0.08);
          font-size: 11.5px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(232,255,71,0.32);
          text-decoration: none; white-space: nowrap;
          background: transparent; cursor: pointer;
          font-family: 'Space Grotesk', 'Inter', sans-serif;
          overflow: hidden;
          transition: color 0.15s;
          flex-shrink: 0;
        }
        /* fill-from-bottom pseudo */
        .sn-pill::before {
          content: "";
          position: absolute;
          inset: 0;
          background: #e8ff47;
          transform: scaleY(0);
          transform-origin: bottom;
          transition: transform 0.18s cubic-bezier(0.22,1,0.36,1);
          z-index: 0;
        }
        .sn-pill > * { position: relative; z-index: 1; }
        .sn-pill > svg { position: relative; z-index: 1; }

        .sn-pill:hover::before { transform: scaleY(1); }
        .sn-pill:hover { color: #0a0a0a; }

        .sn-pill--active {
          color: #e8ff47;
          border-bottom: 3px solid #e8ff47;
        }
        .sn-pill--active:hover { color: #0a0a0a; }

        .sn-pill--secondary {
          color: rgba(232,255,71,0.18);
          font-size: 11px;
        }

        /* ─── Live pill ─── */
        .sn-pill--live { color: rgba(255,39,68,0.55); gap: 7px; }
        .sn-pill--live:hover { color: #0a0a0a; }
        .sn-pill--live::before { background: #ff2744; }
        .sn-pill--live.sn-pill--active {
          color: #ff2744;
          border-bottom-color: #ff2744;
        }
        .sn-pill--live.sn-pill--active:hover { color: #fff; }

        /* Live dot */
        .sn-live-dot {
          position: relative; width: 7px; height: 7px; flex-shrink: 0;
          display: inline-block;
        }
        .sn-live-dot::before {
          content: ""; position: absolute; inset: 0; border-radius: 50%;
          background: #ff2744;
          animation: neoLivePulse 1.6s ease-in-out infinite;
        }
        .sn-pill--active .sn-live-dot::after {
          content: ""; position: absolute; inset: 0; border-radius: 50%;
          background: rgba(255,39,68,0.5);
          animation: neoLiveRing 1.8s ease-out infinite;
        }

        /* FPL tag */
        .sn-pill-tag {
          font-size: 7px; font-weight: 900; letter-spacing: 0.1em;
          padding: 1px 5px;
          background: rgba(232,255,71,0.12);
          border: 1px solid rgba(232,255,71,0.3);
          color: #e8ff47; flex-shrink: 0; line-height: 1.5;
          position: relative; z-index: 1;
        }
        .sn-pill:hover .sn-pill-tag {
          background: rgba(10,10,10,0.15);
          border-color: rgba(10,10,10,0.3);
          color: #0a0a0a;
        }

        /* Chevron */
        .sn-chevron {
          display: inline-flex; opacity: 0.4; margin-left: 1px;
          transition: transform 0.15s; position: relative; z-index: 1;
        }
        .sn-chevron--open { transform: rotate(180deg); opacity: 0.7; }

        /* ─── FPL Dropdown — neobrutalist ─── */
        .sn-fpl-dropdown {
          position: absolute; top: calc(100% + 4px);
          left: 50%; transform: translateX(-50%);
          min-width: 270px; z-index: 300;
          background: #0a0a0a;
          border: 3px solid #e8ff47;
          box-shadow: 6px 6px 0 #e8ff47;
          padding: 6px;
          animation: neoFadeDown 0.18s cubic-bezier(0.22,1,0.36,1) both;
        }
        .sn-fpl-dropdown-label {
          font-size: 8px; font-weight: 900; letter-spacing: 0.18em;
          color: rgba(232,255,71,0.35); text-transform: uppercase;
          padding: 6px 10px 8px;
          border-bottom: 1px solid rgba(232,255,71,0.1); margin-bottom: 3px;
          font-family: 'DM Mono', monospace;
        }
        .sn-fpl-item {
          display: block; padding: 8px 10px;
          text-decoration: none;
          border: 1px solid transparent;
          transition: all 0.12s;
          position: relative; overflow: hidden;
        }
        .sn-fpl-item::before {
          content: ""; position: absolute; inset: 0;
          background: #e8ff47; transform: scaleY(0);
          transform-origin: bottom; transition: transform 0.15s;
          z-index: 0;
        }
        .sn-fpl-item > * { position: relative; z-index: 1; }
        .sn-fpl-item:hover::before { transform: scaleY(1); }
        .sn-fpl-item:hover .sn-fpl-item-name { color: #0a0a0a; }
        .sn-fpl-item:hover .sn-fpl-item-desc { color: rgba(10,10,10,0.55); }
        .sn-fpl-item--active .sn-fpl-item-name { color: #e8ff47; }
        .sn-fpl-item-name {
          font-size: 12px; font-weight: 700;
          color: rgba(232,255,71,0.7); margin-bottom: 2px;
          font-family: 'Space Grotesk', sans-serif;
          transition: color 0.12s;
        }
        .sn-fpl-item-desc {
          font-size: 9.5px; color: rgba(232,255,71,0.3);
          font-family: 'DM Mono', monospace;
          transition: color 0.12s;
        }

        /* ─── Controls ─── */
        .sn-controls { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .sn-search   { display: flex; align-items: center; gap: 4px; }
        .sn-search-input {
          height: 32px; padding: 0 12px;
          border: 2px solid #e8ff47;
          background: #0a0a0a;
          color: #e8ff47; font-size: 12px; font-family: 'DM Mono', monospace;
          width: 180px; outline: none;
          transition: width 0.2s, box-shadow 0.15s;
        }
        .sn-search-input::placeholder { color: rgba(232,255,71,0.3); }
        .sn-search-input:focus {
          box-shadow: 3px 3px 0 #e8ff47;
          width: 220px;
        }

        /* ─── Icon button ─── */
        .sn-icon-btn {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px;
          border: 2px solid rgba(232,255,71,0.25); background: transparent;
          color: rgba(232,255,71,0.4); cursor: pointer; flex-shrink: 0;
          transition: all 0.13s;
        }
        .sn-icon-btn:hover {
          color: #0a0a0a;
          background: #e8ff47;
          border-color: #e8ff47;
        }
        .sn-hamburger { display: none; }

        /* ─── CTA button ─── */
        .sn-cta-btn {
          background: #e8ff47; color: #0a0a0a;
          border: 2px solid #0a0a0a;
          padding: 8px 18px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px; font-weight: 900;
          letter-spacing: 0.1em; text-transform: uppercase;
          cursor: pointer; flex-shrink: 0;
          box-shadow: 3px 3px 0 #e8ff47;
          transition: all 0.12s;
        }
        .sn-cta-btn:hover {
          transform: translate(-2px, -2px);
          box-shadow: 5px 5px 0 rgba(232,255,71,0.5);
        }

        /* ─── Mobile drawer ─── */
        .sn-mobile-drawer {
          position: fixed; top: 60px; left: 0; bottom: 0;
          width: min(280px, 82vw); z-index: 203;
          background: #0a0a0a;
          border-right: 4px solid #e8ff47;
          overflow-y: auto; padding: 10px 8px 32px;
          animation: neoDrawerIn 0.2s cubic-bezier(0.22,1,0.36,1) both;
        }
        .sn-drawer-item {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 14px;
          font-size: 13px; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(232,255,71,0.35); text-decoration: none;
          border-bottom: 1px solid rgba(232,255,71,0.06); margin-bottom: 0;
          font-family: 'Space Grotesk', sans-serif;
          position: relative; overflow: hidden;
          transition: color 0.13s;
        }
        .sn-drawer-item::before {
          content: ""; position: absolute; inset: 0;
          background: #e8ff47; transform: scaleY(0);
          transform-origin: bottom; transition: transform 0.15s;
          z-index: 0;
        }
        .sn-drawer-item > * { position: relative; z-index: 1; }
        .sn-drawer-item > svg { position: relative; z-index: 1; }
        .sn-drawer-item:hover::before { transform: scaleY(1); }
        .sn-drawer-item:hover { color: #0a0a0a; }
        .sn-drawer-item--active {
          color: #e8ff47;
          border-left: 3px solid #e8ff47;
          padding-left: 11px;
        }
        .sn-drawer-item--active:hover { color: #0a0a0a; }
        .sn-drawer-item--live { color: rgba(255,39,68,0.5); }
        .sn-drawer-item--live.sn-drawer-item--active { color: #ff2744; border-left-color: #ff2744; }
        .sn-drawer-section {
          font-size: 8px; font-weight: 900; letter-spacing: 0.2em;
          color: rgba(232,255,71,0.25); text-transform: uppercase;
          padding: 14px 14px 6px;
          font-family: 'DM Mono', monospace;
        }

        /* ─── Backdrop ─── */
        .sn-backdrop {
          position: fixed; inset: 0; z-index: 201;
          background: rgba(0,0,0,0.75);
        }

        /* ─── Bottom tabs ─── */
        .sn-bottom-tabs { display: none; }

        /* ─── Responsive ─── */
        @media (max-width: 1240px) {
          .sn-pill { padding: 0 11px; font-size: 11px; }
        }
        @media (max-width: 1040px) {
          .sn-pill--secondary { display: none; }
        }
        @media (max-width: 768px) {
          .sn-nav       { display: none; }
          .sn-hamburger { display: flex; }
          .sn-brand-tag { display: none; }
          .sn-divider   { display: none; }

          .sn-bottom-tabs {
            display: flex;
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 999;
            background: #0a0a0a;
            border-top: 3px solid #e8ff47;
            padding: 4px 0 max(6px, env(safe-area-inset-bottom));
            justify-content: space-around;
          }
          .sn-page-wrap {
            padding-top: var(--bar-total) !important;
            padding-bottom: 72px !important;
          }
        }
        @media (max-width: 480px) {
          .sn-brand-name { font-size: 13px; }
          .sn-search-input { width: 130px; }
          .sn-search-input:focus { width: 155px; }
        }

        /* ─── Bottom tab internals ─── */
        .sn-bottom-tab-link {
          display: flex; flex-direction: column; align-items: center;
          gap: 2px; padding: 4px 6px;
          color: rgba(232,255,71,0.28); text-decoration: none;
          transition: color 0.13s; flex: 1; min-width: 44px;
          font-family: 'Space Grotesk', sans-serif;
        }
        .sn-bottom-tab-link.active { color: var(--tab-color, #e8ff47); }
        .sn-bottom-tab-icon {
          width: 30px; height: 30px; position: relative;
          display: flex; align-items: center; justify-content: center;
        }
        .sn-bottom-tab-link.active .sn-bottom-tab-icon {
          background: color-mix(in srgb, var(--tab-color,#e8ff47) 12%, transparent);
        }
        .sn-bti--live .sn-live-dot-bt {
          position: absolute; top: 3px; right: 3px;
          width: 5px; height: 5px; border-radius: 50%;
          background: #ff2744;
          animation: neoLivePulse 1.6s ease-in-out infinite;
        }
        .sn-bottom-tab-label {
          font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em;
          text-transform: uppercase; font-family: 'DM Mono', monospace;
        }
      `}</style>

      {/* ── Bar ─────────────────────────────────────────────── */}
      <header
        className={`sn-bar${hidden ? " sn-bar--hidden" : ""}${mobileOpen ? " sn-bar--open" : ""}`}
        role="banner"
      >
        <div className="sn-wrap">

          {/* Brand */}
          <NavLink to="/" className="sn-brand" aria-label="StatinSite home">
            <BrandMark />
            <div className="sn-brand-text">
              <span className="sn-brand-name">StatinSite</span>
              <span className="sn-brand-tag">Football Intelligence</span>
            </div>
          </NavLink>

          {/* Desktop nav */}
          <nav className="sn-nav" aria-label="Main navigation">
            {NAV_ITEMS.map(item => {
              const active = isActive(item);

              if (item.fplGroup) return (
                <div key={item.to} style={{ position: "relative", display: "flex", alignItems: "stretch" }} ref={fplRef}>
                  <button
                    className={`sn-pill${active ? " sn-pill--active" : ""}${item.secondary ? " sn-pill--secondary" : ""}`}
                    onClick={() => setFplOpen(v => !v)}
                    aria-expanded={fplOpen}
                  >
                    <item.Icon />
                    <span>{item.label}</span>
                    <span className="sn-pill-tag">FPL</span>
                    <span className={`sn-chevron${fplOpen ? " sn-chevron--open" : ""}`}>
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                        <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                      </svg>
                    </span>
                  </button>
                  {fplOpen && (
                    <div className="sn-fpl-dropdown" role="menu">
                      <div className="sn-fpl-dropdown-label">Squad & Selection</div>
                      {FPL_ITEMS.slice(0, 4).map(sub => (
                        <NavLink
                          key={sub.to} to={sub.to} role="menuitem"
                          className={`sn-fpl-item${location.pathname.startsWith(sub.to) ? " sn-fpl-item--active" : ""}`}
                        >
                          <div className="sn-fpl-item-name">{sub.label}</div>
                          <div className="sn-fpl-item-desc">{sub.desc}</div>
                        </NavLink>
                      ))}
                      <div style={{ height: 1, background: "rgba(232,255,71,0.08)", margin: "4px 0" }} />
                      <div className="sn-fpl-dropdown-label" style={{ paddingTop: 8 }}>Analysis & Planning</div>
                      {FPL_ITEMS.slice(4).map(sub => (
                        <NavLink
                          key={sub.to} to={sub.to} role="menuitem"
                          className={`sn-fpl-item${location.pathname.startsWith(sub.to) ? " sn-fpl-item--active" : ""}`}
                        >
                          <div className="sn-fpl-item-name">{sub.label}</div>
                          <div className="sn-fpl-item-desc">{sub.desc}</div>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );

              if (item.isLive) return (
                <NavLink
                  key={item.to} to={item.to}
                  className={`sn-pill sn-pill--live${active ? " sn-pill--active" : ""}`}
                >
                  <span className="sn-live-dot" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );

              return (
                <NavLink
                  key={item.to} to={item.to} end={item.end}
                  className={`sn-pill${active ? " sn-pill--active" : ""}${item.secondary ? " sn-pill--secondary" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <item.Icon />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Controls */}
          <div className="sn-controls">
            <div className="sn-search" ref={searchRef}>
              {searchOpen ? (
                <>
                  <input
                    ref={inputRef} className="sn-search-input"
                    value={searchVal} onChange={e => setSearchVal(e.target.value)}
                    placeholder="Search players, teams…"
                    onKeyDown={handleSearch}
                    aria-label="Search"
                  />
                  <button className="sn-icon-btn" onClick={() => { setSearchOpen(false); setSearchVal(""); }}>
                    <Icons.Close />
                  </button>
                </>
              ) : (
                <button className="sn-icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search">
                  <Icons.Search />
                </button>
              )}
            </div>
            <button
              className="sn-icon-btn sn-hamburger"
              onClick={() => setMobileOpen(v => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <Icons.Close /> : <Icons.Menu />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ─────────────────────────────────── */}
      {mobileOpen && (
        <nav className="sn-mobile-drawer" role="dialog" aria-label="Mobile navigation">
          <div className="sn-drawer-section">Navigation</div>
          {NAV_ITEMS.map(item => {
            const active = isActive(item);
            return (
              <NavLink
                key={item.to} to={item.to} end={item.end}
                className={`sn-drawer-item${active ? " sn-drawer-item--active" : ""}${item.isLive ? " sn-drawer-item--live" : ""}`}
              >
                {item.isLive
                  ? <span className="sn-live-dot" style={{ flexShrink: 0 }} aria-hidden="true" />
                  : <item.Icon />
                }
                <span>{item.label}</span>
                {item.fplGroup && <span className="sn-pill-tag" style={{ marginLeft: "auto" }}>FPL</span>}
              </NavLink>
            );
          })}
        </nav>
      )}

      {mobileOpen && <div className="sn-backdrop" onClick={() => setMobileOpen(false)} />}
      <BottomTabBar />
    </>
  );
}