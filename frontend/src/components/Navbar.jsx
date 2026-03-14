// ═══════════════════════════════════════════════════════════
// Navbar — Premium Liquid Glass · StatinSite
// ═══════════════════════════════════════════════════════════
import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

// ─── Icons ──────────────────────────────────────────────────
const Icons = {
  Search: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Close: () => (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Menu: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Home: () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M2 7L8 2l6 5v7a1 1 0 01-1 1H3a1 1 0 01-1-1V7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M6 16v-5h4v5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  ),
  Live: () => (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="3" fill="currentColor"/>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
    </svg>
  ),
  Leagues: () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 2c0 0 2.5 2.5 2.5 6S8 14 8 14M8 2c0 0-2.5 2.5-2.5 6S8 14 8 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M2.8 5h10.4M2.8 11h10.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity=".6"/>
    </svg>
  ),
  Predict: () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M2 13l3.5-5.5 3 2 3-4.5 3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="13.5" cy="4" r="1.5" fill="currentColor" opacity=".7"/>
    </svg>
  ),
  Fantasy: () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5l1.5 3.1 3.5.5-2.5 2.4.6 3.4L8 9.3l-3.1 1.6.6-3.4L3 5.1l3.5-.5L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  ),
  Players: () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5.5" r="2.8" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M2.5 14c0-3 2.5-4.8 5.5-4.8s5.5 1.8 5.5 4.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  News: () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="2" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M4.5 5.5h7M4.5 8h7M4.5 10.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  GroundZero: () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M2 5l6-3 6 3-6 3-6-3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M14 5v5M4 7.5V11c0 1.5 2 2.5 4 2.5s4-1 4-2.5V7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Games: () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="4" width="14" height="8" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 8h3M6.5 6.5v3M11.5 7.5v1M10.5 8h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Logo: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="3" width="20" height="3" rx="1.5" fill="#60a5fa"/>
      <rect x="2" y="8.5" width="13" height="3" rx="1.5" fill="#60a5fa" opacity=".65"/>
      <rect x="2" y="14" width="16" height="3" rx="1.5" fill="#60a5fa" opacity=".4"/>
      <rect x="2" y="19.5" width="9" height="2" rx="1" fill="#60a5fa" opacity=".25"/>
      <rect x="19" y="14" width="3" height="7.5" rx="1.5" fill="#28d97a" opacity=".9"/>
    </svg>
  ),
};

// ─── Nav config ─────────────────────────────────────────────
const NAV_ITEMS = [
  { to: "/",                           label: "Home",        Icon: Icons.Home,       color: "#94a3b8", end: true },
  { to: "/live",                       label: "Live",        Icon: Icons.Live,       color: "#ff4444", isLive: true },
  { to: "/leagues",                    label: "Leagues",     Icon: Icons.Leagues,    color: "#34d399" },
  { to: "/predictions/premier-league", label: "Predictions", Icon: Icons.Predict,    color: "#60a5fa" },
  { to: "/best-team",                  label: "Fantasy",     Icon: Icons.Fantasy,    color: "#28d97a", fplGroup: true },
  { to: "/players",                    label: "Players",     Icon: Icons.Players,    color: "#a78bfa" },
  { to: "/news",                       label: "News",        Icon: Icons.News,       color: "#f472b6" },
  { to: "/learn",                      label: "Ground Zero", Icon: Icons.GroundZero, color: "#fbbf24", secondary: true },
  { to: "/games",                      label: "Games",       Icon: Icons.Games,      color: "#fb923c", secondary: true },
];

const FPL_ITEMS = [
  { to: "/best-team",         label: "Best XI",       desc: "Optimal FPL starting 11"  },
  { to: "/squad-builder",     label: "Squad Builder", desc: "Build your 15-man squad"   },
  { to: "/gameweek-insights", label: "GW Insights",   desc: "Gameweek stats & analysis" },
  { to: "/fpl-table",         label: "FPL Table",     desc: "Live FPL leaderboard"      },
];

const FPL_PATHS = ["/best-team", "/squad-builder", "/gameweek-insights", "/fpl-table"];

const BOTTOM_TABS = [
  { to: "/",                           label: "Home",    Icon: Icons.Home,    color: "#94a3b8", end: true },
  { to: "/live",                       label: "Live",    Icon: Icons.Live,    color: "#ff4444", isLive: true },
  { to: "/leagues",                    label: "Leagues", Icon: Icons.Leagues, color: "#34d399" },
  { to: "/best-team",                  label: "Fantasy", Icon: Icons.Fantasy, color: "#28d97a" },
  { to: "/news",                       label: "News",    Icon: Icons.News,    color: "#f472b6" },
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

// ─── Bottom tab bar ─────────────────────────────────────────
function BottomTabBar() {
  const location  = useLocation();

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

// ─── Main ───────────────────────────────────────────────────
export default function Navbar() {
  const location    = useLocation();
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

  const isActive = (item) => {
    if (item.fplGroup) return fplActive;
    if (item.end)      return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  return (
    <>
      {/* ── Scoped styles ──────────────────────────────────── */}
      <style>{`
        @keyframes snLivePulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%     { opacity:0.45; transform:scale(0.65); }
        }
        @keyframes snLiveRing {
          0%   { transform:scale(1);   opacity:0.55; }
          80%  { transform:scale(2.4); opacity:0; }
          100% { opacity:0; }
        }
        @keyframes snFadeDown {
          from { opacity:0; transform:translateY(-5px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes snDrawerIn {
          from { opacity:0; transform:translateX(-6px); }
          to   { opacity:1; transform:translateX(0); }
        }

        /* ─ Bar shell ─ */
        .sn-bar {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 48px;
          z-index: 200;
          background: rgba(4, 7, 14, 0.82);
          backdrop-filter: blur(40px) saturate(220%) brightness(0.85);
          -webkit-backdrop-filter: blur(40px) saturate(220%) brightness(0.85);
          border-bottom: 1px solid rgba(255,255,255,0.072);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 12px 48px rgba(0,0,0,0.6),
            0 2px 10px rgba(0,0,0,0.3),
            0 0 0 0.5px rgba(255,255,255,0.03);
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
          overflow: visible;
        }
        .sn-bar::after {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg,
            transparent 0%,
            rgba(255,255,255,0.07) 20%,
            rgba(255,255,255,0.12) 50%,
            rgba(255,255,255,0.07) 80%,
            transparent 100%
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
          gap: 8px;
          overflow: visible;
        }

        /* ─ Brand ─ */
        .sn-brand {
          display: flex; align-items: center; gap: 7px;
          text-decoration: none; flex-shrink: 0;
          padding: 4px 8px; border-radius: 9px;
          transition: background 0.15s; margin-right: 6px;
        }
        .sn-brand:hover { background: rgba(255,255,255,0.05); }
        .sn-brand span {
          font-size: 14px; font-weight: 900; color: #ddeeff;
          letter-spacing: -0.025em; font-family: 'Sora', sans-serif; white-space: nowrap;
        }

        /* ─ Nav ─ */
        .sn-nav {
          display: flex; align-items: center; gap: 2px;
          flex: 1; justify-content: center;
          min-width: 0; overflow: visible;
        }

        /* ─ Pills ─ */
        .sn-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 10px; height: 30px;
          border-radius: 8px; border: 1px solid transparent;
          font-size: 12.5px; font-weight: 700; letter-spacing: -0.01em;
          color: rgba(255,255,255,0.38);
          text-decoration: none; white-space: nowrap;
          background: transparent; cursor: pointer;
          font-family: 'Inter', sans-serif; line-height: 1;
          transition: color 0.16s ease, background 0.16s ease, border-color 0.16s ease, box-shadow 0.18s ease;
          flex-shrink: 0; overflow: visible; position: relative;
        }
        .sn-pill svg { flex-shrink: 0; }

        .sn-pill--secondary { color: rgba(255,255,255,0.24); font-size: 12px; }

        .sn-pill:hover {
          color: rgba(255,255,255,0.78);
          background: rgba(255,255,255,0.065);
          border-color: rgba(255,255,255,0.09);
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .sn-pill--active {
          color: var(--pill-color, rgba(255,255,255,0.9));
          background: color-mix(in srgb, var(--pill-color,white) 13%, transparent);
          border-color: color-mix(in srgb, var(--pill-color,white) 28%, transparent);
          box-shadow:
            0 0 16px color-mix(in srgb, var(--pill-color,white) 12%, transparent),
            inset 0 1px 0 color-mix(in srgb, var(--pill-color,white) 8%, transparent);
        }

        /* ─ Live pill ─ */
        .sn-pill--live { color: rgba(255,80,80,0.62); gap: 7px; }
        .sn-pill--live:hover {
          color: #ff6666;
          background: rgba(255,50,50,0.07);
          border-color: rgba(255,50,50,0.14);
        }
        .sn-pill--live.sn-pill--active {
          color: #ff5252;
          background: rgba(255,50,50,0.12);
          border-color: rgba(255,50,50,0.28);
          box-shadow: 0 0 18px rgba(255,60,60,0.14), 0 0 40px rgba(255,50,50,0.06);
        }

        /* Pulse dot */
        .sn-live-dot {
          position: relative;
          width: 6px; height: 6px; flex-shrink: 0;
          display: inline-block;
        }
        .sn-live-dot::before {
          content: ""; position: absolute; inset: 0; border-radius: 50%;
          background: #ff3333;
          animation: snLivePulse 1.7s ease-in-out infinite;
        }
        .sn-pill--active .sn-live-dot::after {
          content: ""; position: absolute; inset: 0; border-radius: 50%;
          background: rgba(255,50,50,0.45);
          animation: snLiveRing 1.7s ease-out infinite;
        }
        .sn-pill:not(.sn-pill--active) .sn-live-dot::before {
          animation-duration: 3s;
          background: rgba(255,60,60,0.5);
        }

        /* FPL tag */
        .sn-pill-tag {
          font-size: 8px; font-weight: 900; letter-spacing: 0.07em;
          padding: 1px 5px; border-radius: 4px;
          background: rgba(40,217,122,0.13);
          border: 1px solid rgba(40,217,122,0.22);
          color: #28d97a; flex-shrink: 0; line-height: 1.5;
        }

        /* Chevron */
        .sn-chevron {
          display: inline-flex; opacity: 0.4; margin-left: 1px;
          transition: transform 0.15s;
        }
        .sn-chevron--open { transform: rotate(180deg); }

        /* ─ FPL Dropdown ─ */
        .sn-fpl-dropdown {
          position: absolute; top: calc(100% + 10px);
          left: 50%; transform: translateX(-50%);
          min-width: 224px; z-index: 300;
          background: rgba(5,8,16,0.97);
          backdrop-filter: blur(28px) saturate(180%);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          border: 1px solid rgba(40,217,122,0.17);
          border-radius: 14px; padding: 6px;
          box-shadow: 0 28px 72px rgba(0,0,0,0.8), 0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
          animation: snFadeDown 0.17s cubic-bezier(0.22,1,0.36,1) both;
        }
        .sn-fpl-dropdown-label {
          font-size: 8.5px; font-weight: 900; letter-spacing: 0.12em;
          color: rgba(255,255,255,0.18); text-transform: uppercase;
          padding: 4px 10px 8px;
          border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 4px;
        }
        .sn-fpl-item {
          display: block; padding: 9px 10px; border-radius: 9px;
          text-decoration: none; transition: background 0.13s;
        }
        .sn-fpl-item:hover { background: rgba(40,217,122,0.07); }
        .sn-fpl-item--active .sn-fpl-item-name { color: #28d97a; }
        .sn-fpl-item-name { font-size: 12.5px; font-weight: 700; color: rgba(255,255,255,0.72); margin-bottom: 2px; }
        .sn-fpl-item-desc { font-size: 10px; color: rgba(255,255,255,0.24); font-weight: 500; }

        /* ─ Controls ─ */
        .sn-controls { display: flex; align-items: center; gap: 3px; flex-shrink: 0; }
        .sn-search   { display: flex; align-items: center; gap: 4px; }
        .sn-search-input {
          height: 30px; padding: 0 12px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.055);
          color: #ddeeff; font-size: 12px; font-family: inherit;
          width: 180px; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, width 0.2s;
        }
        .sn-search-input::placeholder { color: rgba(255,255,255,0.22); }
        .sn-search-input:focus {
          border-color: rgba(96,165,250,0.45);
          box-shadow: 0 0 0 3px rgba(96,165,250,0.1), 0 2px 8px rgba(0,0,0,0.2);
          width: 230px;
          background: rgba(255,255,255,0.07);
        }

        /* ─ Icon button ─ */
        .sn-icon-btn {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 8px;
          border: 1px solid transparent; background: transparent;
          color: rgba(255,255,255,0.36); cursor: pointer; flex-shrink: 0;
          transition: color 0.14s, background 0.14s, border-color 0.14s;
        }
        .sn-icon-btn:hover {
          color: rgba(255,255,255,0.72);
          background: rgba(255,255,255,0.055);
          border-color: rgba(255,255,255,0.07);
        }

        .sn-hamburger { display: none; }

        /* ─ Mobile drawer ─ */
        .sn-mobile-drawer {
          position: fixed; top: 86px; left: 0; bottom: 0;
          width: min(268px, 80vw); z-index: 203;
          background: rgba(4,7,14,0.98);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border-right: 1px solid rgba(255,255,255,0.09);
          box-shadow: 12px 0 40px rgba(0,0,0,0.5);
          overflow-y: auto; padding: 10px 8px 32px;
          animation: snDrawerIn 0.2s cubic-bezier(0.22,1,0.36,1) both;
        }
        .sn-drawer-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border-radius: 10px;
          font-size: 13px; font-weight: 700;
          color: rgba(255,255,255,0.4); text-decoration: none;
          border: 1px solid transparent; margin-bottom: 2px;
          transition: color 0.13s, background 0.13s;
        }
        .sn-drawer-item:hover { color: rgba(255,255,255,0.75); background: rgba(255,255,255,0.04); }
        .sn-drawer-item--active {
          color: var(--pill-color, rgba(255,255,255,0.88));
          background: color-mix(in srgb, var(--pill-color,white) 9%, transparent);
          border-color: color-mix(in srgb, var(--pill-color,white) 16%, transparent);
        }
        .sn-drawer-item--live { color: rgba(255,80,80,0.6); }
        .sn-drawer-item--live.sn-drawer-item--active { color: #ff5252; }

        /* ─ Backdrop ─ */
        .sn-backdrop {
          position: fixed; inset: 0; z-index: 201;
          background: rgba(0,0,0,0.58); backdrop-filter: blur(2px);
        }

        /* ─ Bottom tabs ─ */
        .sn-bottom-tabs { display: none; }

        /* ─ Responsive ─ */
        @media (max-width: 1240px) {
          .sn-pill { padding: 5px 8px; font-size: 12px; gap: 4px; }
          .sn-nav  { gap: 1px; }
        }
        @media (max-width: 1040px) {
          .sn-pill--secondary { display: none; }
        }
        @media (max-width: 768px) {
          .sn-nav       { display: none; }
          .sn-hamburger { display: flex; }
          .sn-brand span { font-size: 13px; }

          .sn-bottom-tabs {
            display: flex;
            position: fixed; bottom: 0; left: 0; right: 0; z-index: 999;
            background: rgba(4,7,14,0.97);
            backdrop-filter: blur(20px) saturate(160%);
            -webkit-backdrop-filter: blur(20px) saturate(160%);
            border-top: 1px solid rgba(255,255,255,0.08);
            padding: 4px 0 max(6px, env(safe-area-inset-bottom));
            justify-content: space-around;
          }
          .sn-page-wrap {
            padding-top: 86px !important;
            padding-bottom: 72px !important;
          }
          .sn-drawer { top: 86px; }
        }
        @media (max-width: 480px) {
          .sn-brand span  { display: none; }
          .sn-search-input { width: 140px; }
          .sn-search-input:focus { width: 160px; }
        }

        /* Bottom tab internals */
        .sn-bottom-tab-link {
          display: flex; flex-direction: column; align-items: center;
          gap: 2px; padding: 4px 6px; border-radius: 8px;
          color: rgba(255,255,255,0.28); text-decoration: none;
          transition: color 0.14s; flex: 1; min-width: 44px;
        }
        .sn-bottom-tab-link.active { color: var(--tab-color, rgba(255,255,255,0.9)); }
        .sn-bottom-tab-icon {
          width: 28px; height: 28px; position: relative;
          display: flex; align-items: center; justify-content: center;
          border-radius: 8px; background: transparent; transition: background 0.14s;
        }
        .sn-bottom-tab-link.active .sn-bottom-tab-icon {
          background: color-mix(in srgb, var(--tab-color,white) 12%, transparent);
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

          {/* Logo */}
          <NavLink to="/" className="sn-brand" aria-label="StatinSite home">
            <Icons.Logo />
            <span>StatinSite</span>
          </NavLink>

          {/* Desktop nav */}
          <nav className="sn-nav" aria-label="Main navigation">
            {NAV_ITEMS.map(item => {
              const active = isActive(item);

              /* FPL dropdown */
              if (item.fplGroup) return (
                <div key={item.to} style={{ position: "relative" }} ref={fplRef}>
                  <button
                    className={`sn-pill${active ? " sn-pill--active" : ""}${item.secondary ? " sn-pill--secondary" : ""}`}
                    style={active ? { "--pill-color": item.color } : {}}
                    onClick={() => setFplOpen(v => !v)}
                    aria-expanded={fplOpen}
                    aria-haspopup="true"
                  >
                    <item.Icon />
                    <span>{item.label}</span>
                    <span className="sn-pill-tag">FPL</span>
                    <span className={`sn-chevron${fplOpen ? " sn-chevron--open" : ""}`}>
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                        <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </span>
                  </button>
                  {fplOpen && (
                    <div className="sn-fpl-dropdown" role="menu">
                      <div className="sn-fpl-dropdown-label">Fantasy Premier League</div>
                      {FPL_ITEMS.map(sub => (
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

              /* Live */
              if (item.isLive) return (
                <NavLink
                  key={item.to} to={item.to}
                  className={`sn-pill sn-pill--live${active ? " sn-pill--active" : ""}`}
                  style={active ? { "--pill-color": item.color } : {}}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="sn-live-dot" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );

              /* Standard */
              return (
                <NavLink
                  key={item.to} to={item.to} end={item.end}
                  className={`sn-pill${active ? " sn-pill--active" : ""}${item.secondary ? " sn-pill--secondary" : ""}`}
                  style={active ? { "--pill-color": item.color } : {}}
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
                    onKeyDown={e => e.key === "Escape" && setSearchOpen(false)}
                    aria-label="Search"
                  />
                  <button className="sn-icon-btn" onClick={() => { setSearchOpen(false); setSearchVal(""); }} aria-label="Close search">
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
              className={`sn-icon-btn sn-hamburger`}
              onClick={() => setMobileOpen(v => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <Icons.Close /> : <Icons.Menu />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ───────────────────────────────────── */}
      {mobileOpen && (
        <nav className="sn-mobile-drawer" role="dialog" aria-label="Mobile navigation">
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

      {/* ── Backdrop ─────────────────────────────────────────── */}
      {mobileOpen && <div className="sn-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />}

      {/* ── Bottom tabs ──────────────────────────────────────── */}
      <BottomTabBar />
    </>
  );
}