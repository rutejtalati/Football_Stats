// ═══════════════════════════════════════════════
// NAVBAR v8 — PART 1: Icons + Constants
// ═══════════════════════════════════════════════
import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

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
  Leagues: () => (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 2c0 0 2.5 2.5 2.5 6S8 14 8 14M8 2c0 0-2.5 2.5-2.5 6S8 14 8 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M2.8 5h10.4M2.8 11h10.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity=".6"/>
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

const NAV_ITEMS = [
  { to: "/",                           label: "Home",        Icon: Icons.Home,       color: "rgba(255,255,255,0.55)", end: true },
  { to: "/predictions/premier-league", label: "Predictions", Icon: Icons.Predict,    color: "#60a5fa"                           },
  { to: "/leagues",                    label: "Leagues",     Icon: Icons.Leagues,    color: "#34d399"                           },
  { to: "/best-team",                  label: "Fantasy",     Icon: Icons.Fantasy,    color: "#28d97a", fplGroup: true            },
  { to: "/player",                     label: "Players",     Icon: Icons.Players,    color: "#a78bfa"                           },
  { to: "/news",                       label: "News",        Icon: Icons.News,       color: "#f472b6"                           },
  { to: "/learn",                      label: "Ground Zero", Icon: Icons.GroundZero, color: "#fbbf24"                           },
  { to: "/games",                      label: "Games",       Icon: Icons.Games,      color: "#fb923c"                           },
];

const FPL_ITEMS = [
  { to: "/best-team",         label: "Best XI",       desc: "Optimal FPL starting 11"  },
  { to: "/squad-builder",     label: "Squad Builder", desc: "Build your 15-man squad"  },
  { to: "/gameweek-insights", label: "GW Insights",   desc: "Gameweek stats & analysis" },
  { to: "/fpl-table",         label: "FPL Table",     desc: "Live FPL leaderboard"     },
];

const FPL_PATHS = ["/best-team", "/squad-builder", "/gameweek-insights", "/fpl-table"];

// ═══════════════════════════════════════════════
// NAVBAR v8 — PART 2: Hooks + Logic
// ═══════════════════════════════════════════════

function useScrollHide(threshold = 8) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < threshold) { setHidden(false); lastY.current = y; return; }
      setHidden(y > lastY.current);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return hidden;
}

function useClickOutside(ref, callback) {
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) callback();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, callback]);
}

function useLockScroll(active) {
  useEffect(() => {
    if (active) { document.body.style.overflow = "hidden"; }
    else        { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [active]);
}

function useFplActive() {
  const { pathname } = useLocation();
  return FPL_PATHS.some((p) => pathname.startsWith(p));
}

// ═══════════════════════════════════════════════
// NAVBAR v8 — PART 3: JSX / Render
// ═══════════════════════════════════════════════

const BOTTOM_TABS = [
  { to: "/",                           label: "Home",    Icon: Icons.Home,    color: "rgba(255,255,255,0.7)", end: true },
  { to: "/predictions/premier-league", label: "Predict", Icon: Icons.Predict, color: "#60a5fa" },
  { to: "/leagues",                    label: "Leagues", Icon: Icons.Leagues, color: "#34d399" },
  { to: "/best-team",                  label: "Fantasy", Icon: Icons.Fantasy, color: "#28d97a" },
  { to: "/news",                       label: "News",    Icon: Icons.News,    color: "#f472b6" },
];

function BottomTabBar() {
  const location  = useLocation();
  const fplActive = useFplActive();

  return (
    <nav className="sn-bottom-tabs">
      {BOTTOM_TABS.map(item => {
        const active = item.fplGroup ? fplActive
          : item.end ? location.pathname === item.to
          : location.pathname.startsWith(item.to);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={"sn-bottom-tab-link" + (active ? " active" : "")}
            style={{ "--tab-color": item.color }}
          >
            <div className="sn-bottom-tab-icon"><item.Icon /></div>
            <span className="sn-bottom-tab-label">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal,  setSearchVal]  = useState("");
  const [fplOpen,    setFplOpen]    = useState(false);
  const navRef    = useRef(null);
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

  const isPillActive = (item) => {
    if (item.fplGroup) return fplActive;
    if (item.end)      return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  return (
    <>
      {/* ── Navbar bar ────────────────────────── */}
      <header
        className={`sn-bar ${hidden ? "sn-bar--hidden" : ""} ${mobileOpen ? "sn-bar--open" : ""}`}
        ref={navRef}
      >
        <div className="sn-wrap">

          {/* Logo */}
          <NavLink to="/" className="sn-brand" aria-label="StatinSite home">
            <Icons.Logo />
            <span>StatinSite</span>
          </NavLink>

          {/* Desktop nav */}
          <nav className="sn-nav" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => {
              const active = isPillActive(item);

              if (item.fplGroup) {
                return (
                  <div key={item.to} style={{ position: "relative" }} ref={fplRef}>
                    <button
                      className={`sn-pill ${active ? "sn-pill--active" : ""}`}
                      style={active ? { "--pill-color": item.color } : {}}
                      onClick={() => setFplOpen(v => !v)}
                      aria-expanded={fplOpen}
                    >
                      <item.Icon />
                      <span>{item.label}</span>
                      <span className="sn-pill-tag">FPL</span>
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none"
                        style={{ opacity:.5, marginLeft:1, transition:"transform .15s", transform: fplOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                        <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                    {fplOpen && (
                      <div className="sn-fpl-dropdown">
                        <div className="sn-fpl-dropdown-label">Fantasy Premier League</div>
                        {FPL_ITEMS.map(sub => (
                          <NavLink
                            key={sub.to}
                            to={sub.to}
                            className={`sn-fpl-item ${location.pathname.startsWith(sub.to) ? "sn-fpl-item--active" : ""}`}
                          >
                            <div className="sn-fpl-item-name">{sub.label}</div>
                            <div className="sn-fpl-item-desc">{sub.desc}</div>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={`sn-pill ${active ? "sn-pill--active" : ""}`}
                  style={active ? { "--pill-color": item.color } : {}}
                  aria-current={active ? "page" : undefined}
                >
                  <item.Icon />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right controls */}
          <div className="sn-controls">
            <div className={`sn-search ${searchOpen ? "sn-search--open" : ""}`} ref={searchRef}>
              {searchOpen ? (
                <>
                  <input
                    ref={inputRef}
                    className="sn-search-input"
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    placeholder="Search players, teams…"
                    onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
                    aria-label="Search"
                  />
                  <button className="sn-icon-btn" onClick={() => { setSearchOpen(false); setSearchVal(""); }} aria-label="Close search">
                    <Icons.Close />
                  </button>
                </>
              ) : (
                <button className="sn-icon-btn" onClick={() => setSearchOpen(true)} aria-label="Open search">
                  <Icons.Search />
                </button>
              )}
            </div>

            <button
              className={`sn-icon-btn sn-hamburger ${mobileOpen ? "sn-hamburger--open" : ""}`}
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <Icons.Close /> : <Icons.Menu />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Live ticker — fixed below navbar ──── */}

      {/* ── Mobile drawer ─────────────────────── */}
      {mobileOpen && (
        <div className="sn-drawer" role="dialog" aria-label="Mobile navigation">
          <nav>
            {NAV_ITEMS.map((item) => {
              const active = isPillActive(item);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={`sn-drawer-item ${active ? "sn-drawer-item--active" : ""}`}
                  style={active ? { "--pill-color": item.color } : {}}
                >
                  <item.Icon />
                  <span>{item.label}</span>
                  {item.fplGroup && <span className="sn-pill-tag">FPL</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>
      )}

      {/* ── Mobile backdrop ───────────────────── */}
      {mobileOpen && (
        <div className="sn-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      {/* ── Bottom tab bar — mobile only ──────── */}
      <BottomTabBar />
    </>
  );
}
