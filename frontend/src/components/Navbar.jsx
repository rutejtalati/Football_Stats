// Navbar.jsx — StatinSite v9 · Carbon Edge
// Two states: EXPANDED (220px, full labels) and ICON (64px, icons only — never fully hidden)
// Fantasy: dropdown in BOTH states — expanded = inline accordion, icon = floating panel
// Mobile: top bar + bottom tabs + slide-in drawer

import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  Home:     () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M2.5 8.5L10 2l7.5 6.5V18H13v-5H7v5H2.5V8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  Live:     () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3" fill="currentColor"/><circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.3" opacity="0.4"/><circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1" opacity="0.18"/></svg>,
  Predict:  () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><polyline points="2,15 6,9 9.5,12 13,6 18,10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="18" cy="7" r="2" fill="currentColor" opacity="0.7"/></svg>,
  Fantasy:  () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 1.5l2 4.5 4.5.6-3.3 3.2.8 4.7L10 12l-4 2.5.8-4.7L3.5 6.6 8 6l2-4.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  Players:  () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5"/><path d="M3 19c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  News:     () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M6 8h8M6 11.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  Learn:    () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 2.5v17M2.5 10h15" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.45"/></svg>,
  Games:    () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="6" width="16" height="10" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M7 11H9M8 10v2M12.5 11h.01M14.5 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Search:   () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M13.5 13.5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Close:    () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  Chevron:  () => <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Menu:     () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 10h10M3 14h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Expand:   () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M4 7h6M7 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Collapse: () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M10 7H4M7 4L4 7l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
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
  { to: "/learn", label: "Ground Zero", Icon: Ic.Learn, color: "#64d2ff" },
  { to: "/games", label: "Games",       Icon: Ic.Games, color: "#ff6961" },
];

const FPL_ITEMS = [
  { to: "/best-team",          label: "Best XI",       short: "XI",  desc: "Optimal FPL starting 11",    color: "#30d158" },
  { to: "/fpl-intelligence",   label: "GW Intel",      short: "GWI", desc: "Gameweek FPL analysis",      color: "#ffd60a" },
  { to: "/squad-builder",      label: "Squad Builder", short: "SQ",  desc: "Build your 15-man squad",    color: "#34d1a0" },
  { to: "/gameweek-insights",  label: "GW Insights",   short: "GW",  desc: "Gameweek stats & analysis",  color: "#0a84ff" },
  { to: "/fpl-table",          label: "FPL Table",     short: "TB",  desc: "Live FPL leaderboard",       color: "#64d2ff" },
  { to: "/captaincy",          label: "Captaincy",     short: "©",   desc: "Captain picks & ownership",  color: "#ff9f0a" },
  { to: "/fixture-difficulty", label: "FDR Heatmap",   short: "FDR", desc: "Fixture difficulty ratings", color: "#ff453a" },
  { to: "/transfer-planner",   label: "Transfers",     short: "TR",  desc: "Plan transfers & free hits", color: "#bf5af2" },
  { to: "/differentials",      label: "Differentials", short: "DIF", desc: "Low-owned picks",            color: "#ff6961" },
];

const FPL_PATHS = FPL_ITEMS.map(i => i.to);

const MOBILE_TABS = [
  { to: "/",                           label: "Home",    Icon: Ic.Home,    color: "#ffffff", end: true },
  { to: "/live",                       label: "Live",    Icon: Ic.Live,    color: "#ff453a", isLive: true },
  { to: "/predictions/premier-league", label: "Predict", Icon: Ic.Predict, color: "#0a84ff" },
  { to: "/best-team",                  label: "Fantasy", Icon: Ic.Fantasy, color: "#30d158" },
  { to: "/player",                     label: "Players", Icon: Ic.Players, color: "#bf5af2" },
];

// ─── Hooks ────────────────────────────────────────────────────────────────────
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

// ─── Brand ────────────────────────────────────────────────────────────────────
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

// ─── Regular nav item ─────────────────────────────────────────────────────────
function SideNavItem({ item, active, iconOnly, onClick }) {
  const isLive = item.isLive;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={"nb-item" + (active ? " nb-item--active" : "") + (isLive ? " nb-item--live" : "")}
      style={{ "--ic": item.color }}
      title={iconOnly ? item.label : undefined}
    >
      <span className={"nb-icon" + (isLive ? " nb-icon--live" : "")}>
        <item.Icon />
        {isLive && <span className="nb-live-dot"/>}
      </span>
      {!iconOnly && <span className="nb-label">{item.label}</span>}
      {!iconOnly && isLive && <span className="nb-live-badge">LIVE</span>}
    </NavLink>
  );
}

// ─── Fantasy dropdown — two modes ─────────────────────────────────────────────
// EXPANDED: inline accordion below the trigger
// ICON-ONLY: floating panel that flies out to the right
function FplDropdown({ iconOnly, fplActive: isFplActive }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();
  useClickOutside(ref, () => setOpen(false));
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div ref={ref} style={{ position: "relative" }}>

      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className={"nb-item nb-item-btn" + (isFplActive ? " nb-item--active" : "")}
        style={{ "--ic": "#30d158", width: "100%" }}
        title={iconOnly ? "Fantasy" : undefined}
      >
        <span className="nb-icon"><Ic.Fantasy/></span>
        {!iconOnly && (
          <>
            <span className="nb-label">Fantasy</span>
            <span className="nb-fpl-tag">FPL</span>
            <span className="nb-chevron" style={{ transform: open ? "rotate(180deg)" : "none" }}>
              <Ic.Chevron/>
            </span>
          </>
        )}
      </button>

      {/* EXPANDED — inline accordion */}
      {open && !iconOnly && (
        <div className="nb-fpl-accordion">
          {FPL_ITEMS.map(sub => {
            const isActive = location.pathname.startsWith(sub.to);
            return (
              <NavLink
                key={sub.to}
                to={sub.to}
                className={"nb-fpl-row" + (isActive ? " nb-fpl-row--active" : "")}
                style={{ "--sub": sub.color }}
              >
                <span className="nb-fpl-dot" style={{ background: sub.color }}/>
                <span className="nb-fpl-row-text">
                  <span className="nb-fpl-row-label">{sub.label}</span>
                  <span className="nb-fpl-row-desc">{sub.desc}</span>
                </span>
              </NavLink>
            );
          })}
        </div>
      )}

      {/* ICON-ONLY — floating panel */}
      {open && iconOnly && (
        <div className="nb-fpl-panel">
          <div className="nb-fpl-panel-head">
            <span style={{ color: "#30d158", display: "flex" }}><Ic.Fantasy/></span>
            <span>Fantasy</span>
            <span className="nb-fpl-tag" style={{ marginLeft: "auto" }}>FPL</span>
          </div>
          {FPL_ITEMS.map(sub => {
            const isActive = location.pathname.startsWith(sub.to);
            return (
              <NavLink
                key={sub.to}
                to={sub.to}
                className={"nb-fpl-row" + (isActive ? " nb-fpl-row--active" : "")}
                style={{ "--sub": sub.color }}
              >
                <span className="nb-fpl-dot" style={{ background: sub.color }}/>
                <span className="nb-fpl-row-text">
                  <span className="nb-fpl-row-label">{sub.label}</span>
                  <span className="nb-fpl-row-desc">{sub.desc}</span>
                </span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Mobile bottom tab bar ────────────────────────────────────────────────────
function MobileTabBar() {
  const location = useLocation();
  return (
    <nav className="nb-mob-bar">
      {MOBILE_TABS.map(item => {
        const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
        return (
          <NavLink key={item.to} to={item.to} end={item.end}
            className={"nb-mob-tab" + (active ? " nb-mob-tab--active" : "")}
            style={{ "--tc": item.color }}
          >
            <span className={"nb-mob-icon" + (item.isLive ? " nb-mob-icon--live" : "")}>
              <item.Icon/>
              {item.isLive && <span className="nb-live-dot nb-live-dot--sm"/>}
            </span>
            <span className="nb-mob-label">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

// ─── Mobile top bar ───────────────────────────────────────────────────────────
function MobileTopBar({ onMenuOpen, searchOpen, setSearchOpen, searchVal, setSearchVal, inputRef, handleSearch }) {
  return (
    <header className="nb-top-bar">
      <button className="nb-icon-btn" onClick={onMenuOpen} aria-label="Open menu"><Ic.Menu/></button>
      <NavLink to="/" className="nb-mob-brand">
        <BrandMark size={22}/>
        <span className="nb-mob-brand-name">StatinSite</span>
      </NavLink>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {searchOpen
          ? <input ref={inputRef} className="nb-mob-search-input" value={searchVal}
              onChange={e => setSearchVal(e.target.value)} onKeyDown={handleSearch}
              placeholder="Search…" autoFocus/>
          : <button className="nb-icon-btn" onClick={() => setSearchOpen(true)}><Ic.Search/></button>
        }
      </div>
    </header>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function Navbar() {
  const location   = useLocation();
  const navigate   = useNavigate();
  const [iconOnly,     setIconOnly]     = useState(false);
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

  // 220px expanded · 64px icon-only — sidebar NEVER disappears on desktop
  const SW = iconOnly ? 64 : 220;

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-w", `${SW}px`);
  }, [SW]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        /* ── Tokens ── */
        :root, [data-theme="dark"] {
          --nb-bg:      #0d0d0d;
          --nb-border:  rgba(255,255,255,0.07);
          --nb-text:    rgba(255,255,255,0.88);
          --nb-muted:   rgba(255,255,255,0.34);
          --nb-hover:   rgba(255,255,255,0.055);
          --nb-active:  rgba(255,255,255,0.08);
          --nb-bar:     rgba(10,10,10,0.94);
          --nb-shadow:  rgba(0,0,0,0.65);
          --nb-glow-b:  rgba(10,132,255,0.55);
          --nb-glow-g:  rgba(48,209,88,0.4);
          --sn-bg:      #111111;
          --sn-surface: rgba(255,255,255,0.04);
          --sn-border:  rgba(255,255,255,0.08);
          --sn-text:    rgba(255,255,255,0.88);
          --sn-muted:   rgba(255,255,255,0.38);
          --sn-hover:   rgba(255,255,255,0.06);
          --sn-active:  rgba(255,255,255,0.09);
          --sn-bar-bg:  rgba(17,17,17,0.92);
          --sn-shadow:  rgba(0,0,0,0.45);
        }
        [data-theme="light"] {
          --nb-bg:      #f8f8fa;
          --nb-border:  rgba(0,0,0,0.08);
          --nb-text:    rgba(0,0,0,0.85);
          --nb-muted:   rgba(0,0,0,0.36);
          --nb-hover:   rgba(0,0,0,0.045);
          --nb-active:  rgba(0,0,0,0.07);
          --nb-bar:     rgba(248,248,250,0.94);
          --nb-shadow:  rgba(0,0,0,0.12);
          --nb-glow-b:  rgba(10,132,255,0.2);
          --nb-glow-g:  rgba(48,209,88,0.2);
          --sn-bg:      #f5f5f7;
          --sn-surface: rgba(0,0,0,0.03);
          --sn-border:  rgba(0,0,0,0.09);
          --sn-text:    rgba(0,0,0,0.85);
          --sn-muted:   rgba(0,0,0,0.38);
          --sn-hover:   rgba(0,0,0,0.05);
          --sn-active:  rgba(0,0,0,0.07);
          --sn-bar-bg:  rgba(245,245,247,0.92);
          --sn-shadow:  rgba(0,0,0,0.12);
        }

        /* ── Keyframes ── */
        @keyframes nb-pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.55)} }
        @keyframes nb-ring    { 0%{transform:scale(1);opacity:.6} 80%{transform:scale(2.8);opacity:0} 100%{opacity:0} }
        @keyframes nb-down    { from{opacity:0;transform:translateY(-6px) scaleY(.95)} to{opacity:1;transform:none} }
        @keyframes nb-right   { from{opacity:0;transform:translateX(-10px) scale(.97)} to{opacity:1;transform:none} }
        @keyframes nb-slidein { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:none} }
        @keyframes nb-shimmer { 0%{background-position:200% 50%} 100%{background-position:-200% 50%} }

        /* ── Sidebar shell ── */
        .nb-sidebar {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: ${SW}px; z-index: 200;
          background: var(--nb-bg);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border-right: 0.5px solid var(--nb-border);
          display: flex; flex-direction: column;
          transition: width 0.26s cubic-bezier(0.4,0,0.2,1);
          overflow: hidden;
        }
        /* Animated shimmer edge rail */
        .nb-sidebar::before {
          content: ''; position: absolute; top: 0; left: 0; bottom: 0; width: 1px;
          background: linear-gradient(180deg,transparent 0%,var(--nb-glow-b) 30%,var(--nb-glow-g) 70%,transparent 100%);
          background-size: 100% 200%;
          animation: nb-shimmer 5s linear infinite;
          z-index: 10; pointer-events: none;
        }
        /* Scanline texture */
        .nb-sidebar::after {
          content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background: repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,.011) 39px,rgba(255,255,255,.011) 40px);
        }
        [data-theme="light"] .nb-sidebar::after { display: none; }

        /* ── Header ── */
        .nb-head {
          display: flex; align-items: center; gap: 8px;
          padding: 18px 14px 12px; min-height: 64px;
          border-bottom: 0.5px solid var(--nb-border);
          flex-shrink: 0; position: relative; z-index: 2;
        }
        .nb-brand {
          display: flex; align-items: center; gap: 9px;
          text-decoration: none; flex: 1; min-width: 0; overflow: hidden;
        }
        .nb-brand-name {
          font-size: 14.5px; font-weight: 700;
          color: var(--nb-text); letter-spacing: -0.035em;
          font-family: 'Inter', -apple-system, sans-serif;
          white-space: nowrap;
        }
        .nb-toggle {
          width: 26px; height: 26px; border-radius: 7px;
          border: none; background: var(--nb-hover);
          color: var(--nb-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-left: auto;
          transition: background 0.13s, color 0.13s; position: relative; z-index: 2;
        }
        .nb-toggle:hover { background: var(--nb-active); color: var(--nb-text); }

        /* ── Search ── */
        .nb-search-wrap {
          padding: 8px 10px; flex-shrink: 0;
          border-bottom: 0.5px solid var(--nb-border);
          position: relative; z-index: 2;
        }
        .nb-search-inner {
          display: flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,.04);
          border: 0.5px solid var(--nb-border);
          border-radius: 9px; padding: 6px 10px;
          transition: border-color .15s, background .15s;
        }
        [data-theme="light"] .nb-search-inner { background: rgba(0,0,0,.04); }
        .nb-search-inner:focus-within { border-color: rgba(10,132,255,.5); background: rgba(10,132,255,.04); }
        .nb-search-inner svg { color: var(--nb-muted); flex-shrink: 0; }
        .nb-search-input {
          border: none; background: transparent; outline: none;
          font-size: 12.5px; color: var(--nb-text);
          font-family: 'Inter', -apple-system, sans-serif;
          width: 100%; min-width: 0;
        }
        .nb-search-input::placeholder { color: var(--nb-muted); }

        /* ── Nav scroll area ── */
        .nb-scroll {
          flex: 1; overflow-y: auto; overflow-x: hidden;
          padding: 6px 7px 0; scrollbar-width: none;
          position: relative; z-index: 2;
        }
        .nb-scroll::-webkit-scrollbar { display: none; }
        .nb-section {
          font-size: 9.5px; font-weight: 700; color: var(--nb-muted);
          letter-spacing: 0.1em; text-transform: uppercase;
          padding: 10px 7px 4px;
        }
        .nb-divider { height: 0.5px; background: var(--nb-border); margin: 6px 7px; }

        /* ── Nav item ── */
        .nb-item, .nb-item-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 9px; border-radius: 10px;
          font-size: 13.5px; font-weight: 500;
          color: var(--nb-muted);
          text-decoration: none; white-space: nowrap;
          background: transparent; border: none; cursor: pointer;
          font-family: 'Inter', -apple-system, sans-serif;
          transition: color 0.13s, background 0.13s;
          width: 100%; margin-bottom: 1px;
          letter-spacing: -0.012em; position: relative;
        }
        .nb-item:hover, .nb-item-btn:hover { background: var(--nb-hover); color: var(--nb-text); }
        .nb-item--active {
          background: var(--nb-active);
          color: var(--ic, var(--nb-text)) !important;
        }
        /* Glowing left rail accent on active items */
        .nb-item--active::after {
          content: ''; position: absolute; left: 0; top: 22%; bottom: 22%;
          width: 2.5px; border-radius: 0 2px 2px 0;
          background: var(--ic, #fff);
          box-shadow: 0 0 8px var(--ic, #fff);
        }
        .nb-item--live { color: rgba(255,69,58,0.5) !important; }
        .nb-item--live:hover { color: #ff453a !important; background: rgba(255,69,58,.06); }
        .nb-item--live.nb-item--active { color: #ff453a !important; background: rgba(255,69,58,.09); }
        .nb-label { flex: 1; }

        /* ── Icon box ── */
        .nb-icon {
          width: 30px; height: 30px; border-radius: 8px;
          background: rgba(255,255,255,.05);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; position: relative;
          transition: background 0.13s, transform 0.2s cubic-bezier(.34,1.56,.64,1);
          color: var(--nb-muted);
        }
        [data-theme="light"] .nb-icon { background: rgba(0,0,0,.05); }
        .nb-item:hover .nb-icon, .nb-item-btn:hover .nb-icon { transform: scale(1.07); }
        .nb-item--active .nb-icon {
          background: color-mix(in srgb, var(--ic, white) 14%, transparent);
          color: var(--ic, var(--nb-text));
        }

        /* ── Live dot ── */
        .nb-live-dot {
          position: absolute; top: 3px; right: 3px; width: 6px; height: 6px;
        }
        .nb-live-dot::before {
          content: ""; position: absolute; inset: 0; border-radius: 50%;
          background: #ff453a; animation: nb-pulse 1.8s ease-in-out infinite;
        }
        .nb-item--active .nb-live-dot::after {
          content: ""; position: absolute; inset: 0; border-radius: 50%;
          background: rgba(255,69,58,.4); animation: nb-ring 1.8s ease-out infinite;
        }
        .nb-live-dot--sm { top: 2px; right: 2px; width: 5px; height: 5px; }
        .nb-live-badge {
          font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
          background: rgba(255,69,58,.14); color: #ff453a;
          border-radius: 999px; padding: 2px 7px; margin-left: auto;
        }

        /* ── FPL tag ── */
        .nb-fpl-tag {
          font-size: 9px; font-weight: 700; letter-spacing: 0.07em;
          background: rgba(48,209,88,.13); color: #30d158;
          border-radius: 999px; padding: 2px 7px; flex-shrink: 0;
        }
        .nb-chevron {
          margin-left: auto; opacity: 0.4; display: flex;
          transition: transform .22s cubic-bezier(.34,1.56,.64,1);
        }

        /* ═══════════════════════════════════════════
           FPL ROWS — shared by both dropdown modes
        ═══════════════════════════════════════════ */
        .nb-fpl-row {
          display: flex; align-items: center; gap: 10px;
          padding: 7px 10px; border-radius: 8px;
          text-decoration: none;
          transition: background .12s;
        }
        .nb-fpl-row:hover { background: var(--nb-hover); }
        .nb-fpl-row--active {
          background: color-mix(in srgb, var(--sub, #30d158) 9%, transparent);
        }
        .nb-fpl-dot {
          width: 6px; height: 6px; border-radius: 50%;
          flex-shrink: 0; margin-top: 1px;
        }
        .nb-fpl-row-text { display: flex; flex-direction: column; }
        .nb-fpl-row-label { font-size: 12.5px; font-weight: 500; color: var(--nb-text); }
        .nb-fpl-row-desc  { font-size: 10.5px; color: var(--nb-muted); margin-top: 1px; }

        /* ── Expanded: inline accordion ── */
        .nb-fpl-accordion {
          margin: 3px 0 4px 6px; padding: 4px;
          background: rgba(255,255,255,.03);
          border: 0.5px solid var(--nb-border);
          border-radius: 12px;
          animation: nb-down 0.18s cubic-bezier(0.22,1,0.36,1) both;
        }
        [data-theme="light"] .nb-fpl-accordion { background: rgba(0,0,0,.03); }

        /* ── Icon-only: floating panel to the right ── */
        .nb-fpl-panel {
          position: absolute; left: calc(100% + 10px); top: 0;
          width: 232px; z-index: 300;
          background: var(--nb-bg);
          border: 0.5px solid var(--nb-border);
          border-radius: 14px;
          padding: 4px 4px 6px;
          box-shadow: 0 8px 36px var(--nb-shadow);
          animation: nb-right 0.18s cubic-bezier(0.22,1,0.36,1) both;
        }
        .nb-fpl-panel-head {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px;
          border-bottom: 0.5px solid var(--nb-border);
          margin-bottom: 4px;
          font-size: 12px; font-weight: 700; color: var(--nb-muted);
          font-family: 'Inter', -apple-system, sans-serif;
        }

        /* ── Page layout offsets ── */
        .sn7-page-offset { margin-left: ${SW}px; transition: margin-left 0.26s cubic-bezier(0.4,0,0.2,1); }
        .sn-page-wrap, .sn-site-footer {
          margin-left: ${SW}px !important;
          width: calc(100vw - ${SW}px) !important;
          transition: margin-left 0.26s cubic-bezier(0.4,0,0.2,1), width 0.26s cubic-bezier(0.4,0,0.2,1);
        }
        @media (max-width: 820px) {
          .sn-page-wrap, .sn-site-footer { margin-left: 0 !important; width: 100% !important; }
        }
        .sn-fixed-bg { left: ${SW}px !important; transition: left 0.26s cubic-bezier(0.4,0,0.2,1); }
        @media (max-width: 820px) { .sn-fixed-bg { left: 0 !important; } }

        /* ── Mobile top bar ── */
        .nb-top-bar {
          display: none; position: fixed; top: 0; left: 0; right: 0;
          height: 52px; z-index: 200;
          background: var(--nb-bar);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border-bottom: 0.5px solid var(--nb-border);
          align-items: center; justify-content: space-between;
          padding: 0 16px; gap: 12px;
        }
        .nb-mob-brand { display: flex; align-items: center; gap: 7px; text-decoration: none; }
        .nb-mob-brand-name { font-size: 16px; font-weight: 700; color: var(--nb-text); letter-spacing: -0.04em; }
        .nb-mob-search-input {
          height: 34px; background: rgba(255,255,255,.06);
          border: 0.5px solid rgba(10,132,255,.4);
          border-radius: 10px; padding: 0 12px;
          font-size: 13px; color: var(--nb-text);
          font-family: 'Inter', -apple-system, sans-serif;
          outline: none; width: 160px;
        }
        [data-theme="light"] .nb-mob-search-input { background: rgba(0,0,0,.06); }

        /* ── Mobile drawer ── */
        .nb-mob-drawer {
          display: none; position: fixed; top: 0; left: 0; bottom: 0;
          width: min(280px, 82vw); z-index: 300;
          background: var(--nb-bar);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border-right: 0.5px solid var(--nb-border);
          flex-direction: column; overflow-y: auto;
          animation: nb-slidein 0.2s cubic-bezier(0.22,1,0.36,1) both;
          scrollbar-width: none;
        }
        .nb-mob-drawer::-webkit-scrollbar { display: none; }
        .nb-backdrop {
          display: none; position: fixed; inset: 0; z-index: 299;
          background: rgba(0,0,0,.5); backdrop-filter: blur(2px);
        }

        /* ── Mobile bottom bar ── */
        .nb-mob-bar {
          display: none; position: fixed; bottom: 0; left: 0; right: 0;
          height: 64px; z-index: 200;
          background: var(--nb-bar);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border-top: 0.5px solid var(--nb-border);
          justify-content: space-around; align-items: flex-start;
          padding: 6px 0 max(8px, env(safe-area-inset-bottom));
        }
        .nb-mob-tab {
          display: flex; flex-direction: column; align-items: center;
          gap: 3px; flex: 1; text-decoration: none;
          color: var(--nb-muted); transition: color 0.13s; padding: 2px 4px;
        }
        .nb-mob-tab--active { color: var(--tc, white); }
        .nb-mob-icon {
          width: 30px; height: 30px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          position: relative; transition: background 0.13s;
        }
        .nb-mob-tab--active .nb-mob-icon {
          background: color-mix(in srgb, var(--tc, white) 12%, transparent);
        }
        .nb-mob-icon--live .nb-live-dot--sm { position: absolute; top: 3px; right: 3px; }
        .nb-mob-label { font-size: 10px; font-weight: 500; letter-spacing: 0.01em; }

        /* ── Icon button ── */
        .nb-icon-btn {
          width: 34px; height: 34px; border-radius: 9px;
          border: none; background: transparent;
          color: var(--nb-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.13s, color 0.13s; flex-shrink: 0;
        }
        .nb-icon-btn:hover { background: var(--nb-hover); color: var(--nb-text); }

        /* ── Breakpoint: below 820px the sidebar disappears, mobile UI takes over ── */
        @media (max-width: 820px) {
          .nb-sidebar      { display: none; }
          .sn7-page-offset { margin-left: 0 !important; padding-top: 52px; padding-bottom: 72px; }
          .sn-page-wrap, .sn-site-footer { margin-left: 0 !important; width: 100% !important; padding-top: 52px; padding-bottom: 72px; }
          .nb-top-bar      { display: flex; }
          .nb-mob-bar      { display: flex; }
          .nb-mob-drawer   { display: flex; }
          .nb-backdrop     { display: block; }
        }
      `}</style>

      {/* ══ DESKTOP SIDEBAR ══════════════════════════════════════════ */}
      <aside className="nb-sidebar" style={{ width: SW }}>

        {/* Header */}
        <div className="nb-head">
          <NavLink to="/" className="nb-brand">
            <BrandMark size={26}/>
            {!iconOnly && <span className="nb-brand-name">StatinSite</span>}
          </NavLink>
          <button
            className="nb-toggle"
            onClick={() => setIconOnly(v => !v)}
            title={iconOnly ? "Expand sidebar" : "Collapse to icons"}
          >
            {iconOnly ? <Ic.Expand/> : <Ic.Collapse/>}
          </button>
        </div>

        {/* Search — expanded only */}
        {!iconOnly && (
          <div className="nb-search-wrap">
            <div className="nb-search-inner">
              <Ic.Search/>
              <input
                className="nb-search-input"
                ref={inputRef}
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                onKeyDown={handleSearch}
                placeholder="Search players, teams…"
              />
              {searchVal && (
                <button onClick={() => setSearchVal("")}
                  style={{ background:"none",border:"none",cursor:"pointer",color:"var(--nb-muted)",display:"flex",padding:0 }}>
                  <Ic.Close/>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Nav */}
        <div className="nb-scroll">
          {!iconOnly && <div className="nb-section">Navigation</div>}

          {PRIMARY_NAV.map(item => item.fplGroup
            ? <FplDropdown key={item.to} iconOnly={iconOnly} fplActive={fplActive}/>
            : <SideNavItem key={item.to} item={item} active={isActive(item)} iconOnly={iconOnly}/>
          )}

          <div className="nb-divider"/>
          {!iconOnly && <div className="nb-section">More</div>}

          {SECONDARY_NAV.map(item =>
            <SideNavItem key={item.to} item={item} active={isActive(item)} iconOnly={iconOnly}/>
          )}
        </div>
      </aside>

      {/* ══ MOBILE TOP BAR ══════════════════════════════════════════ */}
      <MobileTopBar
        onMenuOpen={() => setMobileDrawer(true)}
        searchOpen={searchOpen} setSearchOpen={setSearchOpen}
        searchVal={searchVal}   setSearchVal={setSearchVal}
        inputRef={inputRef}     handleSearch={handleSearch}
      />

      {/* ══ MOBILE DRAWER ═══════════════════════════════════════════ */}
      {mobileDrawer && (
        <>
          <div className="nb-backdrop" onClick={() => setMobileDrawer(false)}/>
          <nav ref={drawerRef} className="nb-mob-drawer">
            <div className="nb-head">
              <NavLink to="/" className="nb-brand" onClick={() => setMobileDrawer(false)}>
                <BrandMark size={24}/>
                <span className="nb-brand-name">StatinSite</span>
              </NavLink>
              <button className="nb-icon-btn" onClick={() => setMobileDrawer(false)}><Ic.Close/></button>
            </div>
            <div className="nb-scroll" style={{ padding: "6px 8px 0" }}>
              <div className="nb-section">Navigation</div>
              {PRIMARY_NAV.map(item => item.fplGroup
                ? <FplDropdown key={item.to} iconOnly={false} fplActive={fplActive}/>
                : <SideNavItem key={item.to} item={item} active={isActive(item)} iconOnly={false}
                    onClick={() => setMobileDrawer(false)}/>
              )}
              <div className="nb-divider"/>
              <div className="nb-section">More</div>
              {SECONDARY_NAV.map(item =>
                <SideNavItem key={item.to} item={item} active={isActive(item)} iconOnly={false}
                  onClick={() => setMobileDrawer(false)}/>
              )}
            </div>
          </nav>
        </>
      )}

      {/* ══ MOBILE BOTTOM TAB BAR ═══════════════════════════════════ */}
      <MobileTabBar/>
    </>
  );
}