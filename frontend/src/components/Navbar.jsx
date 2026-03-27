// Navbar.jsx — StatinSite v8 · Carbon Edge
// Redesigned sidebar: dark glass + shimmer edge + icon glow + active left rail accent
// Fantasy: collapsed = icon strip (horizontal pill), expanded = dropdown with spring
// Theme toggle · Mobile bottom tab bar + drawer · All routes preserved

import { useState, useRef, useEffect, useCallback } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

// ─── Theme ───────────────────────────────────────────────────────────────────
export function useTheme() {
  const [dark, setDark] = useState(() => {
    const isDark = localStorage.getItem("sn-theme") !== "light";
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    return isDark;
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

// ─── Icons ───────────────────────────────────────────────────────────────────
const Ic = {
  Home:        () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M2.5 8.5L10 2l7.5 6.5V18H13v-5H7v5H2.5V8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  Live:        () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3" fill="currentColor"/><circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.3" opacity="0.4"/><circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1" opacity="0.18"/></svg>,
  Predict:     () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><polyline points="2,15 6,9 9.5,12 13,6 18,10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="18" cy="7" r="2" fill="currentColor" opacity="0.7"/></svg>,
  Fantasy:     () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 1.5l2 4.5 4.5.6-3.3 3.2.8 4.7L10 12l-4 2.5.8-4.7L3.5 6.6 8 6l2-4.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  Players:     () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/><path d="M3 19c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  News:        () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M6 8h8M6 11.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  Learn:       () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 2.5v17M2.5 10h15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.45"/></svg>,
  Games:       () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="6" width="16" height="10" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M7 11H9M8 10v2M12.5 11h.01M14.5 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Search:      () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M13.5 13.5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Close:       () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  Sun:         () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.2 3.2l1.4 1.4M13.4 13.4l1.4 1.4M3.2 14.8l1.4-1.4M13.4 4.6l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  Moon:        () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M14.5 10.5A6 6 0 017.5 3.5a6 6 0 000 11 6 6 0 007-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  ChevronDown: () => <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Menu:        () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 10h10M3 14h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
};

// ─── Nav data ─────────────────────────────────────────────────────────────────
const PRIMARY_NAV = [
  { to: "/",                           label: "Home",        Icon: Ic.Home,    color: "#ffffff", end: true },
  { to: "/live",                       label: "Live",        Icon: Ic.Live,    color: "#ff453a", isLive: true },
  { to: "/predictions/premier-league", label: "Predictions", Icon: Ic.Predict, color: "#0a84ff" },
  { to: "/best-team",                  label: "Fantasy",     Icon: Ic.Fantasy, color: "#30d158", fplGroup: true },
  { to: "/player",                     label: "Players",     Icon: Ic.Players, color: "#bf5af2" },
  { to: "/news",                       label: "News",        Icon: Ic.News,    color: "#ff9f0a" },
];
const SECONDARY_NAV = [
  { to: "/learn",  label: "Ground Zero", Icon: Ic.Learn, color: "#64d2ff" },
  { to: "/games",  label: "Games",       Icon: Ic.Games, color: "#ff6961" },
];

// 8 FPL sub-pages with short labels for collapsed icon strip
const FPL_ITEMS = [
  { to: "/best-team",          label: "Best XI",      short: "XI",   desc: "Optimal FPL starting 11",   color: "#30d158" },
  { to: "/squad-builder",      label: "Squad",        short: "SQ",   desc: "Build your 15-man squad",   color: "#34d1a0" },
  { to: "/gameweek-insights",  label: "GW Insights",  short: "GW",   desc: "Gameweek stats & analysis", color: "#0a84ff" },
  { to: "/fpl-table",          label: "FPL Table",    short: "TB",   desc: "Live FPL leaderboard",      color: "#64d2ff" },
  { to: "/captaincy",          label: "Captaincy",    short: "©",    desc: "Captain picks & ownership", color: "#ff9f0a" },
  { to: "/fixture-difficulty", label: "FDR Heatmap",  short: "FDR",  desc: "Fixture difficulty ratings",color: "#ff453a" },
  { to: "/transfer-planner",   label: "Transfers",    short: "TR",   desc: "Plan transfers & free hits", color: "#bf5af2" },
  { to: "/differentials",      label: "Differentials",short: "DIF",  desc: "Low-owned picks",           color: "#ff6961" },
];

const FPL_PATHS = FPL_ITEMS.map(i => i.to);

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
function BrandMark({ size = 26 }) {
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

// ─── Theme toggle ─────────────────────────────────────────────────────────────
function ThemeToggle({ dark, toggle, collapsed }) {
  return (
    <button onClick={toggle} className="ce-theme-btn" title={dark ? "Switch to light" : "Switch to dark"}>
      <span className="ce-theme-track" data-dark={dark}>
        <span className="ce-theme-thumb">{dark ? <Ic.Moon/> : <Ic.Sun/>}</span>
      </span>
      {!collapsed && <span className="ce-theme-label">{dark ? "Dark" : "Light"}</span>}
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
      className={"ce-item" + (active ? " ce-item--active" : "") + (isLive ? " ce-item--live" : "")}
      style={{ "--ic": item.color }}
    >
      <span className={"ce-item-icon" + (isLive ? " ce-item-icon--live" : "")}>
        <item.Icon />
        {isLive && <span className="ce-live-dot"/>}
      </span>
      {!collapsed && <span className="ce-item-label">{item.label}</span>}
      {!collapsed && isLive && <span className="ce-live-badge">LIVE</span>}
    </NavLink>
  );
}

// ─── FPL Dropdown — two modes ─────────────────────────────────────────────────
// EXPANDED: full dropdown list with label + desc
// COLLAPSED: a compact horizontal icon-strip tooltip
function FplDropdown({ collapsed, fplActive: isFplActive }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();
  useClickOutside(ref, () => setOpen(false));
  useEffect(() => setOpen(false), [location.pathname]);

  // Which FPL sub-page is currently active?
  const activeSub = FPL_ITEMS.find(i => location.pathname.startsWith(i.to));

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* ── Main Fantasy trigger ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className={"ce-item ce-item-btn" + (isFplActive ? " ce-item--active" : "")}
        style={{ "--ic": "#30d158", width: "100%" }}
        title={collapsed ? "Fantasy" : undefined}
      >
        <span className="ce-item-icon">
          <Ic.Fantasy/>
        </span>
        {!collapsed && <>
          <span className="ce-item-label">Fantasy</span>
          <span className="ce-fpl-tag">FPL</span>
          <span style={{
            marginLeft: "auto",
            opacity: 0.4,
            transition: "transform .22s cubic-bezier(.34,1.56,.64,1)",
            transform: open ? "rotate(180deg)" : "none",
            display: "flex"
          }}>
            <Ic.ChevronDown/>
          </span>
        </>}
      </button>

      {/* ── EXPANDED MODE: classic dropdown list ── */}
      {open && !collapsed && (
        <div className="ce-fpl-dropdown">
          {FPL_ITEMS.map(sub => {
            const isActiveSub = location.pathname.startsWith(sub.to);
            return (
              <NavLink
                key={sub.to}
                to={sub.to}
                className={"ce-fpl-item" + (isActiveSub ? " ce-fpl-item--active" : "")}
                style={{ "--sub-c": sub.color }}
              >
                <span className="ce-fpl-dot" style={{ background: sub.color }}/>
                <span>
                  <span className="ce-fpl-item-name">{sub.label}</span>
                  <span className="ce-fpl-item-desc">{sub.desc}</span>
                </span>
              </NavLink>
            );
          })}
        </div>
      )}

      {/* ── COLLAPSED MODE: floating icon-strip panel ── */}
      {open && collapsed && (
        <div className="ce-fpl-strip">
          <div className="ce-fpl-strip-label">Fantasy</div>
          <div className="ce-fpl-strip-grid">
            {FPL_ITEMS.map(sub => {
              const isActiveSub = location.pathname.startsWith(sub.to);
              return (
                <NavLink
                  key={sub.to}
                  to={sub.to}
                  className={"ce-fpl-chip" + (isActiveSub ? " ce-fpl-chip--active" : "")}
                  style={{ "--sub-c": sub.color }}
                  title={sub.label}
                >
                  <span className="ce-fpl-chip-code">{sub.short}</span>
                  <span className="ce-fpl-chip-name">{sub.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mobile bottom tab bar ────────────────────────────────────────────────────
function MobileTabBar() {
  const location = useLocation();
  return (
    <nav className="ce-mobile-bar">
      {MOBILE_TABS.map(item => {
        const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={"ce-mob-tab" + (active ? " ce-mob-tab--active" : "")}
            style={{ "--tc": item.color }}
          >
            <span className={"ce-mob-icon" + (item.isLive ? " ce-mob-icon--live" : "")}>
              <item.Icon/>
              {item.isLive && <span className="ce-live-dot ce-live-dot--sm"/>}
            </span>
            <span className="ce-mob-label">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

// ─── Mobile top bar ───────────────────────────────────────────────────────────
function MobileTopBar({ onMenuOpen, dark, toggle, searchOpen, setSearchOpen, searchVal, setSearchVal, inputRef, handleSearch }) {
  return (
    <header className="ce-top-bar">
      <button className="ce-icon-btn" onClick={onMenuOpen} aria-label="Open menu"><Ic.Menu/></button>
      <NavLink to="/" className="ce-mob-brand">
        <BrandMark size={22}/>
        <span className="ce-mob-brand-name">StatinSite</span>
      </NavLink>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {searchOpen
          ? <input ref={inputRef} className="ce-mob-search-input" value={searchVal}
              onChange={e => setSearchVal(e.target.value)} onKeyDown={handleSearch}
              placeholder="Search…" autoFocus/>
          : <button className="ce-icon-btn" onClick={() => setSearchOpen(true)}><Ic.Search/></button>
        }
        <button className="ce-icon-btn" onClick={toggle} title={dark ? "Light mode" : "Dark mode"}>
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

  const SW = collapsed ? 64 : 220;

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-w", `${SW}px`);
  }, [SW]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        /* ── Theme tokens ── */
        :root, [data-theme="dark"] {
          --ce-bg:       #0a0a0a;
          --ce-sidebar:  #0d0d0d;
          --ce-border:   rgba(255,255,255,0.07);
          --ce-text:     rgba(255,255,255,0.88);
          --ce-muted:    rgba(255,255,255,0.35);
          --ce-hover:    rgba(255,255,255,0.055);
          --ce-active:   rgba(255,255,255,0.08);
          --ce-bar-bg:   rgba(10,10,10,0.94);
          --ce-shadow:   rgba(0,0,0,0.6);
          --ce-glow-blue: rgba(10,132,255,0.5);
          --ce-glow-green: rgba(48,209,88,0.4);
          /* sn tokens passthrough for rest of app */
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
          --ce-bg:       #f2f2f7;
          --ce-sidebar:  #f8f8fa;
          --ce-border:   rgba(0,0,0,0.08);
          --ce-text:     rgba(0,0,0,0.85);
          --ce-muted:    rgba(0,0,0,0.36);
          --ce-hover:    rgba(0,0,0,0.045);
          --ce-active:   rgba(0,0,0,0.07);
          --ce-bar-bg:   rgba(248,248,250,0.94);
          --ce-shadow:   rgba(0,0,0,0.12);
          --ce-glow-blue: rgba(10,132,255,0.2);
          --ce-glow-green: rgba(48,209,88,0.2);
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
        @keyframes ce-live-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.55)} }
        @keyframes ce-ring       { 0%{transform:scale(1);opacity:.6} 80%{transform:scale(2.8);opacity:0} 100%{opacity:0} }
        @keyframes ce-fadein     { from{opacity:0;transform:translateY(-5px) scaleY(.96)} to{opacity:1;transform:translateY(0) scaleY(1)} }
        @keyframes ce-slidein    { from{opacity:0;transform:translateX(-14px)} to{opacity:1;transform:translateX(0)} }
        @keyframes ce-strip-in  { from{opacity:0;transform:translateX(-8px) scale(.97)} to{opacity:1;transform:translateX(0) scale(1)} }
        @keyframes ce-shimmer   { 0%{background-position:200% 50%} 100%{background-position:-200% 50%} }

        /* ── Sidebar shell ── */
        .ce-sidebar {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: ${SW}px;
          z-index: 200;
          background: var(--ce-sidebar);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border-right: 0.5px solid var(--ce-border);
          display: flex; flex-direction: column;
          transition: width 0.25s cubic-bezier(0.4,0,0.2,1);
          overflow: hidden;
        }

        /* Shimmer edge light — left 1px rail */
        .ce-sidebar::before {
          content: '';
          position: absolute; top: 0; left: 0; bottom: 0; width: 1px;
          background: linear-gradient(180deg,
            transparent 0%,
            var(--ce-glow-blue) 30%,
            var(--ce-glow-green) 70%,
            transparent 100%
          );
          background-size: 100% 200%;
          animation: ce-shimmer 5s linear infinite;
          z-index: 10; pointer-events: none;
        }

        /* Subtle grid texture */
        .ce-sidebar::after {
          content: '';
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background: repeating-linear-gradient(
            0deg, transparent, transparent 39px,
            rgba(255,255,255,.012) 39px, rgba(255,255,255,.012) 40px
          );
        }
        [data-theme="light"] .ce-sidebar::after { display: none; }

        /* ── Sidebar header ── */
        .ce-sidebar-head {
          display: flex; align-items: center; gap: 8px;
          padding: 18px 14px 12px;
          border-bottom: 0.5px solid var(--ce-border);
          flex-shrink: 0; position: relative; z-index: 2;
        }
        .ce-brand-link {
          display: flex; align-items: center; gap: 9px;
          text-decoration: none; flex: 1; min-width: 0;
        }
        .ce-brand-name {
          font-size: 14.5px; font-weight: 700;
          color: var(--ce-text); letter-spacing: -0.035em;
          font-family: 'Inter', -apple-system, sans-serif;
          white-space: nowrap;
        }
        .ce-collapse-btn {
          width: 26px; height: 26px; border-radius: 7px;
          border: none; background: var(--ce-hover);
          color: var(--ce-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: background 0.13s, color 0.13s;
          margin-left: auto; z-index: 2;
        }
        .ce-collapse-btn:hover { background: var(--ce-active); color: var(--ce-text); }

        /* ── Search ── */
        .ce-search-wrap {
          padding: 8px 10px; flex-shrink: 0;
          border-bottom: 0.5px solid var(--ce-border);
          position: relative; z-index: 2;
        }
        .ce-search-inner {
          display: flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,.04);
          border: 0.5px solid var(--ce-border);
          border-radius: 9px; padding: 6px 10px;
          transition: border-color .15s, background .15s;
        }
        [data-theme="light"] .ce-search-inner { background: rgba(0,0,0,.04); }
        .ce-search-inner:focus-within {
          border-color: rgba(10,132,255,.5);
          background: rgba(10,132,255,.04);
        }
        .ce-search-inner svg { color: var(--ce-muted); flex-shrink: 0; }
        .ce-search-input {
          border: none; background: transparent; outline: none;
          font-size: 12.5px; color: var(--ce-text);
          font-family: 'Inter', -apple-system, sans-serif;
          width: 100%; min-width: 0;
        }
        .ce-search-input::placeholder { color: var(--ce-muted); }

        /* ── Nav scroll area ── */
        .ce-nav-scroll {
          flex: 1; overflow-y: auto; overflow-x: hidden;
          padding: 6px 7px 0; scrollbar-width: none;
          position: relative; z-index: 2;
        }
        .ce-nav-scroll::-webkit-scrollbar { display: none; }
        .ce-section-label {
          font-size: 9.5px; font-weight: 700;
          color: var(--ce-muted);
          letter-spacing: 0.1em; text-transform: uppercase;
          padding: 10px 7px 4px;
        }

        /* ── Nav item ── */
        .ce-item, .ce-item-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 9px; border-radius: 10px;
          font-size: 13.5px; font-weight: 500;
          color: var(--ce-muted);
          text-decoration: none; white-space: nowrap;
          background: transparent; border: none; cursor: pointer;
          font-family: 'Inter', -apple-system, sans-serif;
          transition: color 0.13s, background 0.13s;
          width: 100%; margin-bottom: 1px;
          letter-spacing: -0.012em;
          position: relative;
        }
        .ce-item:hover, .ce-item-btn:hover {
          background: var(--ce-hover);
          color: var(--ce-text);
        }
        /* Active left rail accent */
        .ce-item--active {
          background: var(--ce-active);
          color: var(--ic, var(--ce-text)) !important;
        }
        .ce-item--active::after {
          content: '';
          position: absolute; left: 0; top: 22%; bottom: 22%;
          width: 2.5px; border-radius: 0 2px 2px 0;
          background: var(--ic, #fff);
          box-shadow: 0 0 8px var(--ic, #fff);
        }

        .ce-item--live { color: rgba(255,69,58,0.5) !important; }
        .ce-item--live:hover { color: #ff453a !important; background: rgba(255,69,58,.06); }
        .ce-item--live.ce-item--active { color: #ff453a !important; background: rgba(255,69,58,.09); }

        .ce-item-label { flex: 1; }

        /* ── Item icon box ── */
        .ce-item-icon {
          width: 30px; height: 30px; border-radius: 8px;
          background: rgba(255,255,255,.05);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; position: relative;
          transition: background 0.13s, transform 0.2s cubic-bezier(.34,1.56,.64,1);
          color: var(--ce-muted);
        }
        [data-theme="light"] .ce-item-icon { background: rgba(0,0,0,.05); }
        .ce-item:hover .ce-item-icon, .ce-item-btn:hover .ce-item-icon {
          transform: scale(1.07);
        }
        .ce-item--active .ce-item-icon {
          background: color-mix(in srgb, var(--ic, white) 14%, transparent);
          color: var(--ic, var(--ce-text));
        }

        /* ── Live dot ── */
        .ce-live-dot {
          position: absolute; top: 3px; right: 3px;
          width: 6px; height: 6px;
        }
        .ce-live-dot::before {
          content: ""; position: absolute; inset: 0;
          border-radius: 50%; background: #ff453a;
          animation: ce-live-pulse 1.8s ease-in-out infinite;
        }
        .ce-item--active .ce-live-dot::after {
          content: ""; position: absolute; inset: 0;
          border-radius: 50%; background: rgba(255,69,58,.4);
          animation: ce-ring 1.8s ease-out infinite;
        }
        .ce-live-dot--sm { top: 2px; right: 2px; width: 5px; height: 5px; }

        /* ── Live badge ── */
        .ce-live-badge {
          font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
          background: rgba(255,69,58,.14); color: #ff453a;
          border-radius: 999px; padding: 2px 7px;
          margin-left: auto;
        }

        /* ── FPL tag ── */
        .ce-fpl-tag {
          font-size: 9px; font-weight: 700; letter-spacing: 0.07em;
          background: rgba(48,209,88,.13); color: #30d158;
          border-radius: 999px; padding: 2px 7px;
        }

        /* ── FPL dropdown (expanded) ── */
        .ce-fpl-dropdown {
          margin: 3px 0 4px 6px;
          padding: 4px;
          background: rgba(255,255,255,.03);
          border: 0.5px solid var(--ce-border);
          border-radius: 12px;
          animation: ce-fadein 0.18s cubic-bezier(0.22,1,0.36,1) both;
        }
        [data-theme="light"] .ce-fpl-dropdown { background: rgba(0,0,0,.03); }
        .ce-fpl-item {
          display: flex; align-items: center; gap: 9px;
          padding: 7px 9px; border-radius: 8px;
          text-decoration: none;
          transition: background .12s;
        }
        .ce-fpl-item:hover { background: var(--ce-hover); }
        .ce-fpl-item--active { background: color-mix(in srgb, var(--sub-c, #30d158) 8%, transparent); }
        .ce-fpl-dot {
          width: 6px; height: 6px; border-radius: 50%;
          flex-shrink: 0; margin-top: 1px;
        }
        .ce-fpl-item-name {
          display: block; font-size: 12.5px; font-weight: 500;
          color: var(--ce-text);
        }
        .ce-fpl-item-desc {
          display: block; font-size: 10.5px; color: var(--ce-muted); margin-top: 1px;
        }

        /* ── FPL icon-strip (collapsed mode) ──
           A floating panel that slides out to the right of the collapsed icon,
           showing a 2×4 grid of compact chips — each chip has a short code + label.
        ── */
        .ce-fpl-strip {
          position: absolute; left: calc(100% + 10px); top: 0;
          width: 210px;
          background: var(--ce-sidebar);
          border: 0.5px solid var(--ce-border);
          border-radius: 14px;
          padding: 10px;
          box-shadow: 0 8px 32px var(--ce-shadow);
          animation: ce-strip-in 0.18s cubic-bezier(0.22,1,0.36,1) both;
          z-index: 300;
        }
        .ce-fpl-strip-label {
          font-size: 9.5px; font-weight: 700; letter-spacing: .1em;
          color: var(--ce-muted); text-transform: uppercase;
          padding: 0 2px 8px;
          border-bottom: 0.5px solid var(--ce-border);
          margin-bottom: 8px;
        }
        .ce-fpl-strip-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 5px;
        }
        .ce-fpl-chip {
          display: flex; flex-direction: column; align-items: center;
          gap: 3px; padding: 8px 6px;
          border-radius: 9px; text-decoration: none;
          background: rgba(255,255,255,.04);
          border: 0.5px solid rgba(255,255,255,.06);
          transition: background .13s, border-color .13s, transform .15s cubic-bezier(.34,1.56,.64,1);
          cursor: pointer;
        }
        [data-theme="light"] .ce-fpl-chip {
          background: rgba(0,0,0,.04);
          border-color: rgba(0,0,0,.07);
        }
        .ce-fpl-chip:hover {
          background: color-mix(in srgb, var(--sub-c, #30d158) 12%, transparent);
          border-color: color-mix(in srgb, var(--sub-c, #30d158) 30%, transparent);
          transform: scale(1.04);
        }
        .ce-fpl-chip--active {
          background: color-mix(in srgb, var(--sub-c, #30d158) 14%, transparent) !important;
          border-color: color-mix(in srgb, var(--sub-c, #30d158) 40%, transparent) !important;
        }
        .ce-fpl-chip-code {
          font-size: 11px; font-weight: 800; letter-spacing: .02em;
          color: var(--sub-c, #30d158);
          font-family: 'Inter', monospace;
        }
        .ce-fpl-chip-name {
          font-size: 9px; font-weight: 500; letter-spacing: -.005em;
          color: var(--ce-muted); text-align: center;
          line-height: 1.2; max-width: 72px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* ── Divider ── */
        .ce-divider {
          height: 0.5px; background: var(--ce-border);
          margin: 6px 7px;
        }

        /* ── Theme button ── */
        .ce-theme-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 9px; border-radius: 10px;
          background: transparent; border: none; cursor: pointer;
          color: var(--ce-muted); font-family: 'Inter', -apple-system, sans-serif;
          font-size: 13px; font-weight: 500; width: 100%;
          transition: background 0.13s, color 0.13s;
        }
        .ce-theme-btn:hover { background: var(--ce-hover); color: var(--ce-text); }
        .ce-theme-track {
          width: 34px; height: 19px; border-radius: 999px;
          background: rgba(255,255,255,.08); border: 0.5px solid var(--ce-border);
          display: flex; align-items: center; padding: 2px;
          transition: background 0.2s; flex-shrink: 0;
        }
        [data-theme="light"] .ce-theme-track { background: rgba(0,0,0,.08); }
        .ce-theme-track[data-dark="true"] .ce-theme-thumb { transform: translateX(15px); }
        .ce-theme-thumb {
          width: 15px; height: 15px; border-radius: 50%;
          background: var(--ce-text);
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
          flex-shrink: 0;
        }
        .ce-theme-thumb svg { width: 9px; height: 9px; color: var(--ce-bg); }
        .ce-theme-label { font-size: 13px; color: var(--ce-muted); }

        /* ── Sidebar footer ── */
        .ce-sidebar-foot {
          padding: 6px 7px 14px;
          border-top: 0.5px solid var(--ce-border);
          flex-shrink: 0; position: relative; z-index: 2;
        }

        /* ── Page offset ── */
        .sn7-page-offset { margin-left: ${SW}px; transition: margin-left 0.25s cubic-bezier(0.4,0,0.2,1); }
        .sn-page-wrap, .sn-site-footer {
          margin-left: ${SW}px !important;
          width: calc(100vw - ${SW}px) !important;
          transition: margin-left 0.25s cubic-bezier(0.4,0,0.2,1), width 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        @media (max-width: 820px) {
          .sn-page-wrap, .sn-site-footer { margin-left: 0 !important; width: 100% !important; }
        }
        .sn-fixed-bg {
          left: ${SW}px !important;
          transition: left 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        @media (max-width: 820px) { .sn-fixed-bg { left: 0 !important; } }

        /* ── Mobile top bar ── */
        .ce-top-bar {
          display: none; position: fixed; top: 0; left: 0; right: 0;
          height: 52px; z-index: 200;
          background: var(--ce-bar-bg);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border-bottom: 0.5px solid var(--ce-border);
          align-items: center; justify-content: space-between;
          padding: 0 16px; gap: 12px;
        }
        .ce-mob-brand { display: flex; align-items: center; gap: 7px; text-decoration: none; }
        .ce-mob-brand-name { font-size: 16px; font-weight: 700; color: var(--ce-text); letter-spacing: -0.04em; }
        .ce-mob-search-input {
          height: 34px; background: rgba(255,255,255,.06);
          border: 0.5px solid rgba(10,132,255,.4);
          border-radius: 10px; padding: 0 12px;
          font-size: 13px; color: var(--ce-text);
          font-family: 'Inter', -apple-system, sans-serif;
          outline: none; width: 160px;
        }
        [data-theme="light"] .ce-mob-search-input { background: rgba(0,0,0,.06); }

        /* ── Mobile drawer ── */
        .ce-mobile-drawer {
          display: none; position: fixed; top: 0; left: 0; bottom: 0;
          width: min(280px, 82vw); z-index: 300;
          background: var(--ce-bar-bg);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border-right: 0.5px solid var(--ce-border);
          flex-direction: column; overflow-y: auto;
          animation: ce-slidein 0.2s cubic-bezier(0.22,1,0.36,1) both;
          scrollbar-width: none;
        }
        .ce-mobile-drawer::-webkit-scrollbar { display: none; }
        .ce-backdrop {
          display: none; position: fixed; inset: 0; z-index: 299;
          background: rgba(0,0,0,.5); backdrop-filter: blur(2px);
        }

        /* ── Mobile bottom bar ── */
        .ce-mobile-bar {
          display: none; position: fixed; bottom: 0; left: 0; right: 0;
          height: 64px; z-index: 200;
          background: var(--ce-bar-bg);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border-top: 0.5px solid var(--ce-border);
          justify-content: space-around; align-items: flex-start;
          padding: 6px 0 max(8px, env(safe-area-inset-bottom));
        }
        .ce-mob-tab {
          display: flex; flex-direction: column; align-items: center;
          gap: 3px; flex: 1; text-decoration: none;
          color: var(--ce-muted); transition: color 0.13s;
          padding: 2px 4px;
        }
        .ce-mob-tab--active { color: var(--tc, white); }
        .ce-mob-icon {
          width: 30px; height: 30px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          position: relative; transition: background 0.13s;
        }
        .ce-mob-tab--active .ce-mob-icon {
          background: color-mix(in srgb, var(--tc,white) 12%, transparent);
        }
        .ce-mob-icon--live .ce-live-dot--sm { position: absolute; top: 3px; right: 3px; }
        .ce-mob-label { font-size: 10px; font-weight: 500; letter-spacing: 0.01em; }

        /* ── Icon button ── */
        .ce-icon-btn {
          width: 34px; height: 34px; border-radius: 9px;
          border: none; background: transparent;
          color: var(--ce-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.13s, color 0.13s; flex-shrink: 0;
        }
        .ce-icon-btn:hover { background: var(--ce-hover); color: var(--ce-text); }

        /* ── Responsive ── */
        @media (max-width: 820px) {
          .ce-sidebar     { display: none; }
          .sn7-page-offset { margin-left: 0 !important; padding-top: 52px; padding-bottom: 72px; }
          .sn-page-wrap, .sn-site-footer { margin-left: 0 !important; width: 100% !important; padding-top: 52px; padding-bottom: 72px; }
          .ce-top-bar     { display: flex; }
          .ce-mobile-bar  { display: flex; }
          .ce-mobile-drawer { display: flex; }
          .ce-backdrop    { display: block; }
        }
      `}</style>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="ce-sidebar" style={{ width: SW }}>

        {/* Header */}
        <div className="ce-sidebar-head">
          <NavLink to="/" className="ce-brand-link">
            <BrandMark size={26}/>
            {!collapsed && <span className="ce-brand-name">StatinSite</span>}
          </NavLink>
          <button className="ce-collapse-btn" onClick={() => setCollapsed(v => !v)}
            title={collapsed ? "Expand" : "Collapse"}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              {collapsed
                ? <path d="M4 7h6M7 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                : <path d="M10 7H4M7 4L4 7l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              }
            </svg>
          </button>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="ce-search-wrap">
            <div className="ce-search-inner">
              <Ic.Search/>
              <input
                className="ce-search-input"
                ref={inputRef}
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                onKeyDown={handleSearch}
                placeholder="Search players, teams…"
              />
              {searchVal && (
                <button onClick={() => setSearchVal("")} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--ce-muted)",display:"flex",padding:0 }}>
                  <Ic.Close/>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Nav */}
        <div className="ce-nav-scroll">
          {!collapsed && <div className="ce-section-label">Navigation</div>}

          {PRIMARY_NAV.map(item => item.fplGroup
            ? <FplDropdown key={item.to} collapsed={collapsed} fplActive={fplActive}/>
            : <SideNavItem key={item.to} item={item} active={isActive(item)} collapsed={collapsed}/>
          )}

          <div className="ce-divider"/>
          {!collapsed && <div className="ce-section-label">More</div>}

          {SECONDARY_NAV.map(item =>
            <SideNavItem key={item.to} item={item} active={isActive(item)} collapsed={collapsed}/>
          )}
        </div>

        {/* Footer */}
        <div className="ce-sidebar-foot">
          <ThemeToggle dark={dark} toggle={toggle} collapsed={collapsed}/>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <MobileTopBar
        onMenuOpen={() => setMobileDrawer(true)}
        dark={dark} toggle={toggle}
        searchOpen={searchOpen} setSearchOpen={setSearchOpen}
        searchVal={searchVal} setSearchVal={setSearchVal}
        inputRef={inputRef} handleSearch={handleSearch}
      />

      {/* ── MOBILE DRAWER ── */}
      {mobileDrawer && (
        <>
          <div className="ce-backdrop" onClick={() => setMobileDrawer(false)}/>
          <nav ref={drawerRef} className="ce-mobile-drawer">
            <div className="ce-sidebar-head">
              <NavLink to="/" className="ce-brand-link" onClick={() => setMobileDrawer(false)}>
                <BrandMark size={24}/>
                <span className="ce-brand-name">StatinSite</span>
              </NavLink>
              <button className="ce-icon-btn" onClick={() => setMobileDrawer(false)}><Ic.Close/></button>
            </div>
            <div className="ce-nav-scroll" style={{ padding: "6px 8px 0" }}>
              <div className="ce-section-label">Navigation</div>
              {[...PRIMARY_NAV, ...SECONDARY_NAV].map(item =>
                <SideNavItem key={item.to} item={item} active={isActive(item)} collapsed={false}
                  onClick={() => setMobileDrawer(false)}/>
              )}
              <div className="ce-divider"/>
              <ThemeToggle dark={dark} toggle={toggle} collapsed={false}/>
            </div>
          </nav>
        </>
      )}

      {/* ── MOBILE BOTTOM TAB BAR ── */}
      <MobileTabBar/>
    </>
  );
}