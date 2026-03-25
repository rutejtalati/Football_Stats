// Navbar.jsx — StatinSite
// Leagues removed. Redesigned: bold brand mark, glowing active states,
// neon accent underlines, compact premium aesthetic.

import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

// ─── Icons ──────────────────────────────────────────────────
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

// ─── Nav config (Leagues removed) ───────────────────────────
const NAV_ITEMS = [
  { to: "/",                           label: "Home",        Icon: Icons.Home,       color: "#94a3b8", end: true },
  { to: "/live",                       label: "Live",        Icon: Icons.Live,       color: "#ff4444", isLive: true },
  { to: "/predictions/premier-league", label: "Predictions", Icon: Icons.Predict,    color: "#60a5fa" },
  { to: "/best-team",                  label: "Fantasy",     Icon: Icons.Fantasy,    color: "#28d97a", fplGroup: true },
  { to: "/player",                     label: "Players",     Icon: Icons.Players,    color: "#a78bfa" },
  { to: "/news",                       label: "News",        Icon: Icons.News,       color: "#f472b6" },
  { to: "/learn",                      label: "Ground Zero", Icon: Icons.GroundZero, color: "#fbbf24", secondary: true },
  { to: "/games",                      label: "Games",       Icon: Icons.Games,      color: "#fb923c", secondary: true },
];

const FPL_ITEMS = [
  { to: "/best-team",          label: "Best XI",            desc: "Optimal FPL starting 11"        },
  { to: "/squad-builder",      label: "Squad Builder",      desc: "Build your 15-man squad"         },
  { to: "/gameweek-insights",  label: "GW Insights",        desc: "Gameweek stats & analysis"       },
  { to: "/fpl-table",          label: "FPL Table",          desc: "Live FPL leaderboard"            },
  { to: "/captaincy",          label: "Captaincy",          desc: "Captain picks & ownership data"  },
  { to: "/fixture-difficulty", label: "Fixture Difficulty", desc: "FDR heatmap across gameweeks"    },
  { to: "/transfer-planner",   label: "Transfer Planner",   desc: "Plan transfers & free hits"      },
  { to: "/differentials",      label: "Differentials",      desc: "Low-owned high-ceiling picks"    },
];

const FPL_PATHS = [
  "/best-team", "/squad-builder", "/gameweek-insights", "/fpl-table",
  "/captaincy", "/fixture-difficulty", "/transfer-planner", "/differentials",
];

const BOTTOM_TABS = [
  { to: "/",                           label: "Home",    Icon: Icons.Home,    color: "#94a3b8", end: true },
  { to: "/live",                       label: "Live",    Icon: Icons.Live,    color: "#ff4444", isLive: true },
  { to: "/predictions/premier-league", label: "Predict", Icon: Icons.Predict, color: "#60a5fa" },
  { to: "/best-team",                  label: "Fantasy", Icon: Icons.Fantasy, color: "#28d97a" },
  { to: "/player",                     label: "Players", Icon: Icons.Players, color: "#a78bfa" },
];

// ─── Hooks ──────────────────────────────────────────────────
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

// ─── Brand mark ─────────────────────────────────────────────
function BrandMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      {/* S shape built from data bars */}
      <rect x="3" y="2"  width="13" height="3"   rx="1.5" fill="#60a5fa"/>
      <rect x="3" y="7"  width="9"  height="3"   rx="1.5" fill="#60a5fa" opacity="0.7"/>
      <rect x="3" y="12" width="13" height="3"   rx="1.5" fill="#60a5fa" opacity="0.5"/>
      <rect x="3" y="17" width="7"  height="3"   rx="1.5" fill="#60a5fa" opacity="0.3"/>
      {/* Green accent bar — trending up */}
      <rect x="17" y="12" width="2.5" height="8"   rx="1.25" fill="#34d399" opacity="0.9"/>
      <rect x="17" y="8"  width="2.5" height="2.5" rx="1.25" fill="#34d399" opacity="0.4"/>
    </svg>
  );
}

// ─── Bottom tab bar ─────────────────────────────────────────
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
            key={item.to} to={item.to} end={item.end}
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

// ─── Main ───────────────────────────────────────────────────
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
        @keyframes snLivePulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%     { opacity:0.35; transform:scale(0.6); }
        }
        @keyframes snLiveRing {
          0%   { transform:scale(1);   opacity:0.5; }
          80%  { transform:scale(2.6); opacity:0; }
          100% { opacity:0; }
        }
        @keyframes snFadeDown {
          from { opacity:0; transform:translateY(-6px) scale(0.98); }
          to   { opacity:1; transform:translateY(0)   scale(1); }
        }
        @keyframes snDrawerIn {
          from { opacity:0; transform:translateX(-8px); }
          to   { opacity:1; transform:translateX(0); }
        }

        /* ─ Bar ─ */
        .sn-bar {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 48px;
          z-index: 200;
          background: rgba(3, 7, 18, 0.88);
          backdrop-filter: blur(48px) saturate(200%) brightness(0.85);
          -webkit-backdrop-filter: blur(48px) saturate(200%) brightness(0.85);
          border-bottom: 1px solid rgba(56,189,248,0.08);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.04),
            0 12px 48px rgba(0,0,0,0.55);
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
          overflow: visible;
        }
        /* Subtle top shimmer line */
        .sn-bar::before {
          content: "";
          position: absolute;
          top: 0; left: 10%; right: 10%;
          height: 1px;
          background: linear-gradient(90deg,
            transparent, rgba(96,165,250,0.25) 30%,
            rgba(52,211,153,0.2) 70%, transparent
          );
          pointer-events: none;
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

        /* ─ Brand ─ */
        .sn-brand {
          display: flex; align-items: center; gap: 8px;
          text-decoration: none; flex-shrink: 0;
          padding: 4px 6px; border-radius: 10px;
          margin-right: 8px;
          transition: background 0.15s;
        }
        .sn-brand:hover { background: rgba(96,165,250,0.06); }
        .sn-brand-text {
          display: flex; flex-direction: column; gap: 0;
        }
        .sn-brand-name {
          font-size: 13px; font-weight: 900; color: #ddeeff;
          letter-spacing: -0.03em; font-family: 'Sora', sans-serif;
          line-height: 1; white-space: nowrap;
        }
        .sn-brand-tag {
          font-size: 7.5px; font-weight: 700; letter-spacing: 0.14em;
          color: rgba(96,165,250,0.45); text-transform: uppercase;
          font-family: 'Inter', sans-serif; line-height: 1; margin-top: 1px;
        }

        /* ─ Divider ─ */
        .sn-divider {
          width: 1px; height: 18px;
          background: rgba(255,255,255,0.07);
          flex-shrink: 0; margin: 0 6px;
        }

        /* ─ Nav ─ */
        .sn-nav {
          display: flex; align-items: center; gap: 1px;
          flex: 1; justify-content: center;
          min-width: 0; overflow: visible;
        }

        /* ─ Pills ─ */
        .sn-pill {
          position: relative;
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 11px; height: 32px;
          border-radius: 9px; border: 1px solid transparent;
          font-size: 12px; font-weight: 700; letter-spacing: -0.005em;
          color: rgba(255,255,255,0.35);
          text-decoration: none; white-space: nowrap;
          background: transparent; cursor: pointer;
          font-family: 'Inter', sans-serif; line-height: 1;
          transition: color 0.13s, background 0.13s, border-color 0.13s;
          flex-shrink: 0; overflow: visible;
        }
        /* Hover underline accent */
        .sn-pill::after {
          content: "";
          position: absolute;
          bottom: 2px; left: 50%; right: 50%;
          height: 1.5px;
          background: var(--pill-color, rgba(255,255,255,0.4));
          border-radius: 999px;
          opacity: 0;
          transition: left 0.18s ease, right 0.18s ease, opacity 0.18s ease;
        }
        .sn-pill:hover::after {
          left: 20%; right: 20%; opacity: 0.5;
        }
        .sn-pill--active::after {
          left: 16%; right: 16%; opacity: 1 !important;
        }

        .sn-pill--secondary { color: rgba(255,255,255,0.22); font-size: 11.5px; }

        .sn-pill:hover {
          color: rgba(255,255,255,0.7);
          background: rgba(255,255,255,0.04);
        }
        .sn-pill--active {
          color: var(--pill-color, rgba(255,255,255,0.9));
          background: color-mix(in srgb, var(--pill-color,white) 8%, transparent);
          border-color: color-mix(in srgb, var(--pill-color,white) 14%, transparent);
        }

        /* ─ Live pill ─ */
        .sn-pill--live { color: rgba(255,70,70,0.55); gap: 7px; }
        .sn-pill--live:hover {
          color: #ff6060;
          background: rgba(255,44,44,0.06);
        }
        .sn-pill--live.sn-pill--active {
          color: #ff4444;
          background: rgba(255,44,44,0.1);
          border-color: rgba(255,44,44,0.22);
          box-shadow: 0 0 20px rgba(255,44,44,0.08);
        }
        .sn-pill--live::after { background: #ff4444; }

        /* Live dot */
        .sn-live-dot {
          position: relative;
          width: 6px; height: 6px; flex-shrink: 0;
          display: inline-block;
        }
        .sn-live-dot::before {
          content: ""; position: absolute; inset: 0; border-radius: 50%;
          background: #ff3333;
          animation: snLivePulse 1.8s ease-in-out infinite;
        }
        .sn-pill--active .sn-live-dot::after {
          content: ""; position: absolute; inset: 0; border-radius: 50%;
          background: rgba(255,44,44,0.45);
          animation: snLiveRing 1.8s ease-out infinite;
        }

        /* FPL tag */
        .sn-pill-tag {
          font-size: 7.5px; font-weight: 900; letter-spacing: 0.09em;
          padding: 1px 5px; border-radius: 4px;
          background: rgba(40,217,122,0.1);
          border: 1px solid rgba(40,217,122,0.2);
          color: #28d97a; flex-shrink: 0; line-height: 1.5;
        }

        /* Chevron */
        .sn-chevron {
          display: inline-flex; opacity: 0.35; margin-left: 1px;
          transition: transform 0.15s;
        }
        .sn-chevron--open { transform: rotate(180deg); opacity: 0.6; }

        /* ─ FPL Dropdown ─ */
        .sn-fpl-dropdown {
          position: absolute; top: calc(100% + 8px);
          left: 50%; transform: translateX(-50%);
          min-width: 260px; z-index: 300;
          background: rgba(3,7,18,0.98);
          backdrop-filter: blur(32px) saturate(200%);
          -webkit-backdrop-filter: blur(32px) saturate(200%);
          border: 1px solid rgba(40,217,122,0.15);
          border-radius: 16px; padding: 6px;
          box-shadow:
            0 24px 64px rgba(0,0,0,0.7),
            0 0 0 1px rgba(255,255,255,0.03),
            inset 0 1px 0 rgba(255,255,255,0.04);
          animation: snFadeDown 0.18s cubic-bezier(0.22,1,0.36,1) both;
        }
        .sn-fpl-dropdown-label {
          font-size: 8px; font-weight: 900; letter-spacing: 0.14em;
          color: rgba(255,255,255,0.16); text-transform: uppercase;
          padding: 5px 10px 7px;
          border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 3px;
        }
        .sn-fpl-item {
          display: block; padding: 8px 10px; border-radius: 10px;
          text-decoration: none; transition: background 0.12s;
        }
        .sn-fpl-item:hover { background: rgba(40,217,122,0.06); }
        .sn-fpl-item--active .sn-fpl-item-name { color: #28d97a; }
        .sn-fpl-item-name {
          font-size: 12px; font-weight: 700;
          color: rgba(255,255,255,0.7); margin-bottom: 2px;
        }
        .sn-fpl-item-desc { font-size: 9.5px; color: rgba(255,255,255,0.22); }

        /* ─ Controls ─ */
        .sn-controls { display: flex; align-items: center; gap: 3px; flex-shrink: 0; }
        .sn-search   { display: flex; align-items: center; gap: 3px; }
        .sn-search-input {
          height: 30px; padding: 0 12px; border-radius: 9px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: #ddeeff; font-size: 12px; font-family: inherit;
          width: 180px; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, width 0.2s;
        }
        .sn-search-input::placeholder { color: rgba(255,255,255,0.2); }
        .sn-search-input:focus {
          border-color: rgba(96,165,250,0.35);
          box-shadow: 0 0 0 3px rgba(96,165,250,0.07);
          width: 220px;
        }

        /* ─ Icon button ─ */
        .sn-icon-btn {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 8px;
          border: 1px solid transparent; background: transparent;
          color: rgba(255,255,255,0.32); cursor: pointer; flex-shrink: 0;
          transition: color 0.13s, background 0.13s;
        }
        .sn-icon-btn:hover {
          color: rgba(255,255,255,0.7);
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.07);
        }
        .sn-hamburger { display: none; }

        /* ─ Mobile drawer ─ */
        .sn-mobile-drawer {
          position: fixed; top: 86px; left: 0; bottom: 0;
          width: min(268px, 80vw); z-index: 203;
          background: rgba(3,7,18,0.98);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          border-right: 1px solid rgba(255,255,255,0.07);
          overflow-y: auto; padding: 10px 8px 32px;
          animation: snDrawerIn 0.2s cubic-bezier(0.22,1,0.36,1) both;
        }
        .sn-drawer-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border-radius: 11px;
          font-size: 13px; font-weight: 700;
          color: rgba(255,255,255,0.38); text-decoration: none;
          border: 1px solid transparent; margin-bottom: 2px;
          transition: color 0.13s, background 0.13s;
        }
        .sn-drawer-item:hover { color: rgba(255,255,255,0.72); background: rgba(255,255,255,0.04); }
        .sn-drawer-item--active {
          color: var(--pill-color, rgba(255,255,255,0.9));
          background: color-mix(in srgb, var(--pill-color,white) 8%, transparent);
          border-color: color-mix(in srgb, var(--pill-color,white) 14%, transparent);
        }
        .sn-drawer-item--live { color: rgba(255,70,70,0.55); }
        .sn-drawer-item--live.sn-drawer-item--active { color: #ff4444; }
        .sn-drawer-section {
          font-size: 8px; font-weight: 900; letter-spacing: 0.14em;
          color: rgba(255,255,255,0.14); text-transform: uppercase;
          padding: 12px 14px 5px;
        }

        /* ─ Backdrop ─ */
        .sn-backdrop {
          position: fixed; inset: 0; z-index: 201;
          background: rgba(0,0,0,0.6); backdrop-filter: blur(2px);
        }

        /* ─ Bottom tabs ─ */
        .sn-bottom-tabs { display: none; }

        /* ─ Responsive ─ */
        @media (max-width: 1240px) {
          .sn-pill { padding: 5px 8px; font-size: 11.5px; gap: 4px; }
          .sn-nav  { gap: 0; }
        }
        @media (max-width: 1040px) {
          .sn-pill--secondary { display: none; }
        }
        @media (max-width: 768px) {
          .sn-nav       { display: none; }
          .sn-hamburger { display: flex; }
          .sn-brand-tag { display: none; }

          .sn-bottom-tabs {
            display: flex;
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 999;
            background: rgba(3,7,18,0.97);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border-top: 1px solid rgba(56,189,248,0.08);
            padding: 4px 0 max(6px, env(safe-area-inset-bottom));
            justify-content: space-around;
          }
          .sn-page-wrap {
            padding-top: var(--bar-total) !important;
            padding-bottom: 72px !important;
          }
        }
        @media (max-width: 480px) {
          .sn-brand-name { font-size: 12px; }
          .sn-search-input { width: 130px; }
          .sn-search-input:focus { width: 155px; }
        }

        /* Bottom tab internals */
        .sn-bottom-tab-link {
          display: flex; flex-direction: column; align-items: center;
          gap: 2px; padding: 4px 6px; border-radius: 8px;
          color: rgba(255,255,255,0.26); text-decoration: none;
          transition: color 0.13s; flex: 1; min-width: 44px;
        }
        .sn-bottom-tab-link.active { color: var(--tab-color, rgba(255,255,255,0.9)); }
        .sn-bottom-tab-icon {
          width: 28px; height: 28px; position: relative;
          display: flex; align-items: center; justify-content: center;
          border-radius: 8px; transition: background 0.13s;
        }
        .sn-bottom-tab-link.active .sn-bottom-tab-icon {
          background: color-mix(in srgb, var(--tab-color,white) 11%, transparent);
        }
        .sn-bti--live .sn-live-dot-bt {
          position: absolute; top: 3px; right: 3px;
          width: 5px; height: 5px; border-radius: 50%;
          background: #ff3333;
          animation: snLivePulse 1.8s ease-in-out infinite;
        }
        .sn-bottom-tab-label {
          font-size: 9px; font-weight: 700; letter-spacing: 0.02em;
          font-family: 'Inter', sans-serif;
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

          <div className="sn-divider" />

          {/* Desktop nav */}
          <nav className="sn-nav" aria-label="Main navigation">
            {NAV_ITEMS.map(item => {
              const active = isActive(item);

              if (item.fplGroup) return (
                <div key={item.to} style={{ position: "relative" }} ref={fplRef}>
                  <button
                    className={`sn-pill${active ? " sn-pill--active" : ""}${item.secondary ? " sn-pill--secondary" : ""}`}
                    style={active ? { "--pill-color": item.color } : {}}
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
                      <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "4px 0" }} />
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
                  style={active ? { "--pill-color": item.color } : {}}
                >
                  <span className="sn-live-dot" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );

              return (
                <NavLink
                  key={item.to} to={item.to} end={item.end}
                  className={`sn-pill${active ? " sn-pill--active" : ""}${item.secondary ? " sn-pill--secondary" : ""}`}
                  style={{ "--pill-color": item.color, ...(active ? {} : {}) }}
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
                style={active ? { "--pill-color": item.color } : {}}
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