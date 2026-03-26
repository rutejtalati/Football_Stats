// Navbar.jsx — StatinSite v7
// iOS-inspired sidebar nav (desktop) + bottom tab bar (mobile)
// Theme toggle built-in. Clean, minimal, SF Pro aesthetic.

import { useState, useRef, useEffect, useCallback } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

// ─── Theme context exposed via localStorage + data-attribute ────────────────
export function useTheme() {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("sn-theme") !== "light"; } catch { return true; }
  });
  const toggle = useCallback(() => {
    setDark(d => {
      const next = !d;
      try { localStorage.setItem("sn-theme", next ? "dark" : "light"); } catch {}
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
      return next;
    });
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);
  return { dark, toggle };
}

// ─── Icons (20×20, stroked) ─────────────────────────────────────────────────
const Ic = {
  Home: () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2.5 8.5L10 2l7.5 6.5V18H13v-5H7v5H2.5V8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  Live: () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3" fill="currentColor"/><circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.3" opacity="0.4"/><circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1" opacity="0.18"/></svg>,
  Predict: () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><polyline points="2,15 6,9 9.5,12 13,6 18,10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="18" cy="7" r="2" fill="currentColor" opacity="0.7"/></svg>,
  Fantasy: () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 1.5l2 4.5 4.5.6-3.3 3.2.8 4.7L10 12l-4 2.5.8-4.7L3.5 6.6 8 6l2-4.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  Players: () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/><path d="M3 19c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  News: () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M6 8h8M6 11.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  Learn: () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 2.5v17M2.5 10h15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.45"/></svg>,
  Games: () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="6" width="16" height="10" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M7 11H9M8 10v2M12.5 11h.01M14.5 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Search: () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M13.5 13.5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Close: () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  Sun: () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.2 3.2l1.4 1.4M13.4 13.4l1.4 1.4M3.2 14.8l1.4-1.4M13.4 4.6l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  Moon: () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M14.5 10.5A6 6 0 017.5 3.5a6 6 0 000 11 6 6 0 007-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  ChevronDown: () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
};

// ─── Nav items ───────────────────────────────────────────────────────────────
const PRIMARY_NAV = [
  { to: "/",                           label: "Home",        Icon: Ic.Home,    color: "#ffffff", end: true },
  { to: "/live",                       label: "Live",        Icon: Ic.Live,    color: "#ff453a", isLive: true },
  { to: "/predictions/premier-league", label: "Predictions", Icon: Ic.Predict, color: "#0a84ff" },
  { to: "/best-team",                  label: "Fantasy",     Icon: Ic.Fantasy, color: "#30d158", fplGroup: true },
  { to: "/player",                     label: "Players",     Icon: Ic.Players, color: "#bf5af2" },
  { to: "/news",                       label: "News",        Icon: Ic.News,    color: "#ff9f0a" },
];
const SECONDARY_NAV = [
  { to: "/learn",  label: "Ground Zero", Icon: Ic.Learn,  color: "#64d2ff" },
  { to: "/games",  label: "Games",       Icon: Ic.Games,  color: "#ff6961" },
];

const FPL_ITEMS = [
  { to: "/best-team",          label: "Best XI",            desc: "Optimal FPL starting 11" },
  { to: "/squad-builder",      label: "Squad Builder",      desc: "Build your 15-man squad" },
  { to: "/gameweek-insights",  label: "GW Insights",        desc: "Gameweek stats & analysis" },
  { to: "/fpl-table",          label: "FPL Table",          desc: "Live FPL leaderboard" },
  { to: "/captaincy",          label: "Captaincy",          desc: "Captain picks & ownership" },
  { to: "/fixture-difficulty", label: "FDR Heatmap",        desc: "Fixture difficulty ratings" },
  { to: "/transfer-planner",   label: "Transfers",          desc: "Plan transfers & free hits" },
  { to: "/differentials",      label: "Differentials",      desc: "Low-owned picks" },
];

const FPL_PATHS = ["/best-team","/squad-builder","/gameweek-insights","/fpl-table","/captaincy","/fixture-difficulty","/transfer-planner","/differentials"];

const MOBILE_TABS = [
  { to: "/",                           label: "Home",    Icon: Ic.Home,    color: "#ffffff", end: true },
  { to: "/live",                       label: "Live",    Icon: Ic.Live,    color: "#ff453a", isLive: true },
  { to: "/predictions/premier-league", label: "Predict", Icon: Ic.Predict, color: "#0a84ff" },
  { to: "/best-team",                  label: "Fantasy", Icon: Ic.Fantasy, color: "#30d158" },
  { to: "/player",                     label: "Players", Icon: Ic.Players, color: "#bf5af2" },
];

// ─── Hooks ───────────────────────────────────────────────────────────────────
function useClickOutside(ref, cb) {
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) cb(); };
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

// ─── Brand ───────────────────────────────────────────────────────────────────
function BrandMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="4" y="3"  width="14" height="3.5" rx="1.75" fill="#0a84ff"/>
      <rect x="4" y="9"  width="10" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.7"/>
      <rect x="4" y="15" width="14" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.45"/>
      <rect x="4" y="21" width="7"  height="3.5" rx="1.75" fill="#0a84ff" opacity="0.25"/>
      <rect x="20" y="15" width="3" height="10"  rx="1.5"  fill="#30d158"/>
      <rect x="20" y="10" width="3" height="3"   rx="1.5"  fill="#30d158" opacity="0.45"/>
    </svg>
  );
}

// ─── Theme toggle ────────────────────────────────────────────────────────────
function ThemeToggle({ dark, toggle, collapsed }) {
  return (
    <button onClick={toggle} className="sn7-theme-btn" title={dark ? "Switch to light" : "Switch to dark"}>
      <span className="sn7-theme-track" data-dark={dark}>
        <span className="sn7-theme-thumb">{dark ? <Ic.Moon/> : <Ic.Sun/>}</span>
      </span>
      {!collapsed && <span className="sn7-theme-label">{dark ? "Dark" : "Light"}</span>}
    </button>
  );
}

// ─── Sidebar nav item ─────────────────────────────────────────────────────────
function SideNavItem({ item, active, collapsed, onClick }) {
  const isLive = item.isLive;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={"sn7-item" + (active ? " sn7-item--active" : "") + (isLive ? " sn7-item--live" : "")}
      style={{ "--ic": item.color }}
    >
      <span className={"sn7-item-icon" + (isLive ? " sn7-item-icon--live" : "")}>
        <item.Icon />
        {isLive && <span className="sn7-live-dot"/>}
      </span>
      {!collapsed && <span className="sn7-item-label">{item.label}</span>}
      {!collapsed && isLive && <span className="sn7-live-badge">LIVE</span>}
    </NavLink>
  );
}

// ─── FPL Dropdown (sidebar) ───────────────────────────────────────────────────
function FplDropdown({ active, collapsed, fplActive: isFplActive }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();
  useClickOutside(ref, () => setOpen(false));
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(v => !v)}
        className={"sn7-item sn7-item-btn" + (isFplActive ? " sn7-item--active" : "")}
        style={{ "--ic": "#30d158", width: "100%" }}
      >
        <span className="sn7-item-icon"><Ic.Fantasy/></span>
        {!collapsed && <>
          <span className="sn7-item-label">Fantasy</span>
          <span className="sn7-fpl-tag">FPL</span>
          <span style={{ marginLeft: "auto", opacity: 0.45, transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }}><Ic.ChevronDown/></span>
        </>}
      </button>
      {open && !collapsed && (
        <div className="sn7-fpl-dropdown">
          {FPL_ITEMS.map(sub => (
            <NavLink key={sub.to} to={sub.to} className="sn7-fpl-item">
              <span className="sn7-fpl-item-name">{sub.label}</span>
              <span className="sn7-fpl-item-desc">{sub.desc}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mobile bottom tab bar ────────────────────────────────────────────────────
function MobileTabBar() {
  const location = useLocation();
  return (
    <nav className="sn7-mobile-bar" aria-label="Mobile navigation">
      {MOBILE_TABS.map(item => {
        const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
        return (
          <NavLink key={item.to} to={item.to} end={item.end}
            className={"sn7-mob-tab" + (active ? " sn7-mob-tab--active" : "")}
            style={{ "--tc": item.color }}
          >
            <span className={"sn7-mob-icon" + (item.isLive ? " sn7-mob-icon--live" : "")}>
              <item.Icon/>
              {item.isLive && <span className="sn7-live-dot sn7-live-dot--sm"/>}
            </span>
            <span className="sn7-mob-label">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

// ─── Mobile top bar (hamburger + search) ─────────────────────────────────────
function MobileTopBar({ onMenuOpen, dark, toggle, searchOpen, setSearchOpen, searchVal, setSearchVal, inputRef, handleSearch }) {
  return (
    <header className="sn7-top-bar">
      <button className="sn7-icon-btn" onClick={onMenuOpen} aria-label="Open menu"><Ic.Games/></button>
      <NavLink to="/" className="sn7-mob-brand">
        <BrandMark size={22}/>
        <span className="sn7-mob-brand-name">StatinSite</span>
      </NavLink>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {searchOpen
          ? <input ref={inputRef} className="sn7-mob-search-input" value={searchVal}
              onChange={e => setSearchVal(e.target.value)} onKeyDown={handleSearch}
              placeholder="Search…" autoFocus/>
          : <button className="sn7-icon-btn" onClick={() => setSearchOpen(true)}><Ic.Search/></button>
        }
        <button className="sn7-icon-btn" onClick={toggle} title={dark ? "Light mode" : "Dark mode"}>
          {dark ? <Ic.Sun/> : <Ic.Moon/>}
        </button>
      </div>
    </header>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function Navbar() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { dark, toggle } = useTheme();

  const [collapsed,    setCollapsed]    = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [searchVal,    setSearchVal]    = useState("");

  const inputRef  = useRef(null);
  const drawerRef = useRef(null);
  const fplActive = useFplActive();

  useClickOutside(drawerRef, () => setMobileDrawer(false));
  useLockScroll(mobileDrawer);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 60);
  }, [searchOpen]);

  useEffect(() => { setMobileDrawer(false); }, [location.pathname]);

  const handleSearch = e => {
    if (e.key === "Enter" && searchVal.trim()) {
      navigate(`/player?search=${encodeURIComponent(searchVal.trim())}`);
      setSearchOpen(false); setSearchVal("");
    }
    if (e.key === "Escape") { setSearchOpen(false); setSearchVal(""); }
  };

  const isActive = item => {
    if (item.fplGroup) return fplActive;
    if (item.end)      return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  const SW = collapsed ? 68 : 220;

  return (
    <>
      <style>{`
        /* ── Reset & font ── */
        *, *::before, *::after { box-sizing: border-box; }

        /* ── Theme tokens ── */
        :root, [data-theme="dark"] {
          --sn-bg:       #111111;
          --sn-surface:  rgba(255,255,255,0.04);
          --sn-border:   rgba(255,255,255,0.08);
          --sn-text:     rgba(255,255,255,0.88);
          --sn-muted:    rgba(255,255,255,0.38);
          --sn-hover:    rgba(255,255,255,0.06);
          --sn-active:   rgba(255,255,255,0.09);
          --sn-bar-bg:   rgba(17,17,17,0.92);
          --sn-shadow:   rgba(0,0,0,0.45);
        }
        [data-theme="light"] {
          --sn-bg:       #f5f5f7;
          --sn-surface:  rgba(0,0,0,0.03);
          --sn-border:   rgba(0,0,0,0.09);
          --sn-text:     rgba(0,0,0,0.85);
          --sn-muted:    rgba(0,0,0,0.38);
          --sn-hover:    rgba(0,0,0,0.05);
          --sn-active:   rgba(0,0,0,0.07);
          --sn-bar-bg:   rgba(245,245,247,0.92);
          --sn-shadow:   rgba(0,0,0,0.12);
        }

        /* ── Keyframes ── */
        @keyframes sn7-live-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%     { opacity:0.3; transform:scale(0.55); }
        }
        @keyframes sn7-ring {
          0%   { transform:scale(1); opacity:0.6; }
          80%  { transform:scale(2.8); opacity:0; }
          100% { opacity:0; }
        }
        @keyframes sn7-fadein {
          from { opacity:0; transform:translateY(-4px) scale(0.98); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes sn7-slidein {
          from { opacity:0; transform:translateX(-12px); }
          to   { opacity:1; transform:translateX(0); }
        }

        /* ── Sidebar ── */
        .sn7-sidebar {
          position: fixed;
          top: 0; left: 0; bottom: 0;
          width: ${SW}px;
          z-index: 200;
          background: var(--sn-bar-bg);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border-right: 0.5px solid var(--sn-border);
          display: flex;
          flex-direction: column;
          transition: width 0.25s cubic-bezier(0.4,0,0.2,1);
          overflow: hidden;
        }

        /* ── Sidebar header ── */
        .sn7-sidebar-head {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 16px 12px;
          border-bottom: 0.5px solid var(--sn-border);
          flex-shrink: 0;
        }
        .sn7-brand-link {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none; flex: 1; min-width: 0;
        }
        .sn7-brand-name {
          font-size: 15px; font-weight: 700;
          color: var(--sn-text);
          letter-spacing: -0.03em;
          font-family: -apple-system, 'Inter', sans-serif;
          white-space: nowrap; opacity: 1;
          transition: opacity 0.15s;
        }
        .sn7-collapse-btn {
          width: 28px; height: 28px; border-radius: 8px;
          border: none; background: var(--sn-hover);
          color: var(--sn-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: background 0.13s, color 0.13s;
          margin-left: auto;
        }
        .sn7-collapse-btn:hover { background: var(--sn-active); color: var(--sn-text); }

        /* ── Search in sidebar ── */
        .sn7-search-wrap {
          padding: 10px 12px;
          flex-shrink: 0;
          border-bottom: 0.5px solid var(--sn-border);
        }
        .sn7-search-inner {
          display: flex; align-items: center; gap: 8px;
          background: var(--sn-surface);
          border: 0.5px solid var(--sn-border);
          border-radius: 10px;
          padding: 7px 10px;
          transition: border-color 0.15s;
        }
        .sn7-search-inner:focus-within {
          border-color: rgba(10,132,255,0.45);
          background: rgba(10,132,255,0.04);
        }
        .sn7-search-inner svg { color: var(--sn-muted); flex-shrink: 0; }
        .sn7-search-input {
          border: none; background: transparent; outline: none;
          font-size: 13px; color: var(--sn-text);
          font-family: -apple-system, 'Inter', sans-serif;
          width: 100%; min-width: 0;
        }
        .sn7-search-input::placeholder { color: var(--sn-muted); }

        /* ── Nav list ── */
        .sn7-nav-scroll {
          flex: 1; overflow-y: auto; overflow-x: hidden;
          padding: 8px 8px 0;
          scrollbar-width: none;
        }
        .sn7-nav-scroll::-webkit-scrollbar { display: none; }
        .sn7-nav-section-label {
          font-size: 10px; font-weight: 600;
          color: var(--sn-muted);
          letter-spacing: 0.08em; text-transform: uppercase;
          padding: 12px 8px 4px;
        }

        /* ── Nav item ── */
        .sn7-item, .sn7-item-btn {
          display: flex; align-items: center; gap: 11px;
          padding: 9px 10px; border-radius: 11px;
          font-size: 14px; font-weight: 500;
          color: var(--sn-muted);
          text-decoration: none; white-space: nowrap;
          background: transparent;
          border: none; cursor: pointer;
          font-family: -apple-system, 'Inter', sans-serif;
          transition: color 0.13s, background 0.13s;
          width: 100%; margin-bottom: 1px;
          letter-spacing: -0.01em;
        }
        .sn7-item:hover, .sn7-item-btn:hover {
          background: var(--sn-hover);
          color: var(--sn-text);
        }
        .sn7-item--active {
          background: var(--sn-active);
          color: var(--ic, var(--sn-text)) !important;
        }
        .sn7-item--live { color: rgba(255,69,58,0.55) !important; }
        .sn7-item--live:hover { color: #ff453a !important; background: rgba(255,69,58,0.07); }
        .sn7-item--live.sn7-item--active { color: #ff453a !important; background: rgba(255,69,58,0.1); }

        .sn7-item-label { flex: 1; }

        /* ── Item icon ── */
        .sn7-item-icon {
          width: 32px; height: 32px; border-radius: 8px;
          background: var(--sn-surface);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; position: relative;
          transition: background 0.13s;
        }
        .sn7-item--active .sn7-item-icon {
          background: color-mix(in srgb, var(--ic, white) 14%, transparent);
        }

        /* ── Live dot ── */
        .sn7-live-dot {
          position: absolute; top: 3px; right: 3px;
          width: 6px; height: 6px;
        }
        .sn7-live-dot::before {
          content: ""; position: absolute; inset: 0;
          border-radius: 50%; background: #ff453a;
          animation: sn7-live-pulse 1.8s ease-in-out infinite;
        }
        .sn7-item--active .sn7-live-dot::after {
          content: ""; position: absolute; inset: 0;
          border-radius: 50%; background: rgba(255,69,58,0.4);
          animation: sn7-ring 1.8s ease-out infinite;
        }
        .sn7-live-dot--sm { top: 2px; right: 2px; width: 5px; height: 5px; }

        /* ── Live badge ── */
        .sn7-live-badge {
          font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
          background: rgba(255,69,58,0.15); color: #ff453a;
          border-radius: 999px; padding: 2px 7px;
          margin-left: auto;
        }

        /* ── FPL tag ── */
        .sn7-fpl-tag {
          font-size: 9px; font-weight: 700; letter-spacing: 0.07em;
          background: rgba(48,209,88,0.12); color: #30d158;
          border-radius: 999px; padding: 2px 7px;
        }

        /* ── FPL dropdown ── */
        .sn7-fpl-dropdown {
          margin: 4px 0 4px 8px;
          padding: 4px;
          background: var(--sn-surface);
          border: 0.5px solid var(--sn-border);
          border-radius: 12px;
          animation: sn7-fadein 0.16s cubic-bezier(0.22,1,0.36,1) both;
        }
        .sn7-fpl-item {
          display: block; padding: 8px 10px; border-radius: 8px;
          text-decoration: none; transition: background 0.12s;
        }
        .sn7-fpl-item:hover { background: var(--sn-hover); }
        .sn7-fpl-item-name {
          display: block; font-size: 13px; font-weight: 500;
          color: var(--sn-text); margin-bottom: 1px;
        }
        .sn7-fpl-item-desc {
          display: block; font-size: 11px; color: var(--sn-muted);
        }

        /* ── Divider ── */
        .sn7-divider {
          height: 0.5px; background: var(--sn-border);
          margin: 8px 8px;
        }

        /* ── Theme button ── */
        .sn7-theme-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: 11px;
          background: transparent; border: none; cursor: pointer;
          color: var(--sn-muted); font-family: -apple-system, 'Inter', sans-serif;
          font-size: 13px; font-weight: 500; width: 100%;
          transition: background 0.13s, color 0.13s;
          margin-bottom: 1px;
        }
        .sn7-theme-btn:hover { background: var(--sn-hover); color: var(--sn-text); }
        .sn7-theme-track {
          width: 36px; height: 20px; border-radius: 999px;
          background: rgba(255,255,255,0.1);
          border: 0.5px solid var(--sn-border);
          display: flex; align-items: center;
          padding: 2px; transition: background 0.2s;
          flex-shrink: 0; position: relative;
        }
        [data-theme="light"] .sn7-theme-track { background: rgba(0,0,0,0.08); }
        .sn7-theme-track[data-dark="true"] .sn7-theme-thumb { transform: translateX(16px); }
        .sn7-theme-thumb {
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--sn-text); display: flex;
          align-items: center; justify-content: center;
          transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
          flex-shrink: 0;
        }
        .sn7-theme-thumb svg { width: 10px; height: 10px; color: var(--sn-bg); }
        .sn7-theme-label { font-size: 13px; color: var(--sn-muted); }

        /* ── Sidebar footer ── */
        .sn7-sidebar-foot {
          padding: 8px 8px 16px;
          border-top: 0.5px solid var(--sn-border);
          flex-shrink: 0;
        }

        /* ── Page offset for sidebar ── */
        .sn7-page-offset {
          margin-left: ${SW}px;
          transition: margin-left 0.25s cubic-bezier(0.4,0,0.2,1);
        }

        /* ── Mobile top bar ── */
        .sn7-top-bar {
          display: none;
          position: fixed; top: 0; left: 0; right: 0;
          height: 52px; z-index: 200;
          background: var(--sn-bar-bg);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border-bottom: 0.5px solid var(--sn-border);
          align-items: center; justify-content: space-between;
          padding: 0 16px; gap: 12px;
        }

        /* ── Mobile brand ── */
        .sn7-mob-brand {
          display: flex; align-items: center; gap: 7px;
          text-decoration: none;
        }
        .sn7-mob-brand-name {
          font-size: 16px; font-weight: 700;
          color: var(--sn-text); letter-spacing: -0.04em;
        }
        .sn7-mob-search-input {
          height: 34px; background: var(--sn-surface);
          border: 0.5px solid rgba(10,132,255,0.4);
          border-radius: 10px; padding: 0 12px;
          font-size: 13px; color: var(--sn-text);
          font-family: -apple-system, 'Inter', sans-serif;
          outline: none; width: 160px;
        }

        /* ── Mobile drawer ── */
        .sn7-mobile-drawer {
          display: none;
          position: fixed; top: 0; left: 0; bottom: 0;
          width: min(280px, 82vw); z-index: 300;
          background: var(--sn-bar-bg);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border-right: 0.5px solid var(--sn-border);
          flex-direction: column;
          overflow-y: auto;
          animation: sn7-slidein 0.2s cubic-bezier(0.22,1,0.36,1) both;
          scrollbar-width: none;
        }
        .sn7-mobile-drawer::-webkit-scrollbar { display: none; }
        .sn7-backdrop {
          display: none;
          position: fixed; inset: 0; z-index: 299;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(2px);
        }

        /* ── Mobile bottom tab ── */
        .sn7-mobile-bar {
          display: none;
          position: fixed; bottom: 0; left: 0; right: 0;
          height: 64px; z-index: 200;
          background: var(--sn-bar-bg);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border-top: 0.5px solid var(--sn-border);
          justify-content: space-around; align-items: flex-start;
          padding: 6px 0 max(8px, env(safe-area-inset-bottom));
        }
        .sn7-mob-tab {
          display: flex; flex-direction: column; align-items: center;
          gap: 3px; flex: 1; text-decoration: none;
          color: var(--sn-muted); transition: color 0.13s;
          padding: 2px 4px;
        }
        .sn7-mob-tab--active { color: var(--tc, white); }
        .sn7-mob-icon {
          width: 30px; height: 30px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          position: relative; transition: background 0.13s;
        }
        .sn7-mob-tab--active .sn7-mob-icon {
          background: color-mix(in srgb, var(--tc,white) 12%, transparent);
        }
        .sn7-mob-icon--live .sn7-live-dot--sm { position: absolute; top: 3px; right: 3px; }
        .sn7-mob-label { font-size: 10px; font-weight: 500; letter-spacing: 0.01em; }

        /* ── Icon button ── */
        .sn7-icon-btn {
          width: 36px; height: 36px; border-radius: 10px;
          border: none; background: transparent;
          color: var(--sn-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.13s, color 0.13s; flex-shrink: 0;
        }
        .sn7-icon-btn:hover { background: var(--sn-hover); color: var(--sn-text); }

        /* ── Responsive ── */
        @media (max-width: 820px) {
          .sn7-sidebar   { display: none; }
          .sn7-page-offset { margin-left: 0 !important; padding-top: 52px; padding-bottom: 72px; }
          .sn7-top-bar   { display: flex; }
          .sn7-mobile-bar { display: flex; }
          .sn7-mobile-drawer { display: flex; }
          .sn7-backdrop  { display: block; }
        }
        px;
          transition: margin-left 0.25s cubic-bezier(0.4,0,0.2,1);
          min-height: 100vh;
        }
      `}</style>

      {/* ── DESKTOP SIDEBAR ──────────────────────────────────── */}
      <aside className="sn7-sidebar" style={{ width: SW }}>

        {/* Header / brand */}
        <div className="sn7-sidebar-head">
          <NavLink to="/" className="sn7-brand-link">
            <BrandMark size={28}/>
            {!collapsed && <span className="sn7-brand-name">StatinSite</span>}
          </NavLink>
          <button className="sn7-collapse-btn" onClick={() => setCollapsed(v => !v)}
            title={collapsed ? "Expand" : "Collapse"}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              {collapsed
                ? <path d="M4 7h6M7 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                : <path d="M10 7H4M7 4L4 7l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              }
            </svg>
          </button>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="sn7-search-wrap">
            <div className="sn7-search-inner">
              <Ic.Search/>
              <input
                className="sn7-search-input"
                ref={inputRef}
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                onKeyDown={handleSearch}
                placeholder="Search players, teams…"
              />
              {searchVal && (
                <button onClick={() => setSearchVal("")} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--sn-muted)",display:"flex",padding:0 }}>
                  <Ic.Close/>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Nav items */}
        <div className="sn7-nav-scroll">
          {!collapsed && <div className="sn7-nav-section-label">Navigation</div>}

          {PRIMARY_NAV.map(item => item.fplGroup
            ? <FplDropdown key={item.to} active={isActive(item)} collapsed={collapsed} fplActive={fplActive}/>
            : <SideNavItem key={item.to} item={item} active={isActive(item)} collapsed={collapsed}/>
          )}

          <div className="sn7-divider"/>
          {!collapsed && <div className="sn7-nav-section-label">More</div>}

          {SECONDARY_NAV.map(item =>
            <SideNavItem key={item.to} item={item} active={isActive(item)} collapsed={collapsed}/>
          )}
        </div>

        {/* Footer: theme toggle */}
        <div className="sn7-sidebar-foot">
          <ThemeToggle dark={dark} toggle={toggle} collapsed={collapsed}/>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ───────────────────────────────────── */}
      <MobileTopBar
        onMenuOpen={() => setMobileDrawer(true)}
        dark={dark} toggle={toggle}
        searchOpen={searchOpen} setSearchOpen={setSearchOpen}
        searchVal={searchVal} setSearchVal={setSearchVal}
        inputRef={inputRef} handleSearch={handleSearch}
      />

      {/* ── MOBILE DRAWER ────────────────────────────────────── */}
      {mobileDrawer && (
        <>
          <div className="sn7-backdrop" onClick={() => setMobileDrawer(false)}/>
          <nav ref={drawerRef} className="sn7-mobile-drawer">
            <div className="sn7-sidebar-head">
              <NavLink to="/" className="sn7-brand-link" onClick={() => setMobileDrawer(false)}>
                <BrandMark size={26}/>
                <span className="sn7-brand-name">StatinSite</span>
              </NavLink>
              <button className="sn7-icon-btn" onClick={() => setMobileDrawer(false)}><Ic.Close/></button>
            </div>
            <div className="sn7-nav-scroll" style={{ padding: "8px" }}>
              <div className="sn7-nav-section-label">Navigation</div>
              {[...PRIMARY_NAV, ...SECONDARY_NAV].map(item =>
                <SideNavItem key={item.to} item={item} active={isActive(item)} collapsed={false}
                  onClick={() => setMobileDrawer(false)}/>
              )}
              <div className="sn7-divider"/>
              <ThemeToggle dark={dark} toggle={toggle} collapsed={false}/>
            </div>
          </nav>
        </>
      )}

      {/* ── MOBILE BOTTOM TAB BAR ────────────────────────────── */}
      <MobileTabBar/>
    </>
  );
}