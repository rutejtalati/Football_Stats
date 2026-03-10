import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

/* ─── SVG Icon System ──────────────────────────────────────── */
const Icons = {
  Home: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M1 6.5L8 1l7 5.5V15a.5.5 0 01-.5.5H10v-4.5H6V15.5H1.5A.5.5 0 011 15V6.5z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  ),
  SquadBuilder: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  LoadSquad: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 1v9M4.5 6.5L8 10l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 11.5v1.5a1 1 0 001 1h10a1 1 0 001-1v-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  BestTeam: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5l1.545 3.13 3.455.502-2.5 2.437.59 3.44L8 9.25l-3.09 1.759.59-3.44L3 5.132l3.455-.502L8 1.5z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M4 14.5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Insights: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M1.5 12.5l4-5 3 3 4-6 2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="13.5" cy="6.5" r="1" fill="currentColor"/>
    </svg>
  ),
  Predictions: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 4.5v4l2.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Table: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M1 5h14M6 5v10" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  ),
  League: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5C4.5 3 2 5.5 2 8.5c0 3 2.5 5.5 6 6 3.5-.5 6-3 6-6 0-3-2.5-5.5-6-7z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M2.5 6h11M2.5 10h11M8 1.5C6.5 4 6 6 6 8.5c0 2.5.5 4.5 2 6M8 1.5c1.5 2.5 2 4.5 2 7s-.5 4-2 5.5"
        stroke="currentColor" strokeWidth="1.1" opacity="0.6"/>
    </svg>
  ),
  Sun: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.22 3.22l1.06 1.06M11.72 11.72l1.06 1.06M11.72 4.28l-1.06 1.06M4.28 11.72l-1.06 1.06"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Moon: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 10A6 6 0 016 2.5a6 6 0 100 11 6 6 0 007.5-3.5z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  ),
  Logo: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 1.5C12 1.5 8 7 8 12s4 10.5 4 10.5M12 1.5C12 1.5 16 7 16 12s-4 10.5-4 10.5M1.5 12h21M3.5 6.5h17M3.5 17.5h17"
        stroke="currentColor" strokeWidth="1.2" opacity="0.7"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

/* ─── Nav Data ─────────────────────────────────────────────── */
const navGroups = [
  {
    label: "FPL Tools",
    items: [
      { to: "/squad-builder",     text: "Squad Builder",      Icon: Icons.SquadBuilder },
      { to: "/load-squad",        text: "Load Squad",         Icon: Icons.LoadSquad    },
      { to: "/best-team",         text: "Best XI",            Icon: Icons.BestTeam     },
      { to: "/gameweek-insights", text: "GW Insights",        Icon: Icons.Insights     },
    ],
  },
  {
    label: "Analytics",
    items: [
      { to: "/predictions", text: "Predictions", Icon: Icons.Predictions },
      { to: "/fpl-table",   text: "EPL Table",   Icon: Icons.Table       },
    ],
  },
  {
    label: "Leagues",
    items: [
      { to: "/league/epl",    text: "EPL",     Icon: Icons.League, tag: "ENG" },
      { to: "/league/laliga", text: "La Liga", Icon: Icons.League, tag: "ESP" },
      { to: "/league/seriea", text: "Serie A", Icon: Icons.League, tag: "ITA" },
      { to: "/league/ligue1", text: "Ligue 1", Icon: Icons.League, tag: "FRA" },
    ],
  },
];

/* ─── Scrolled shadow hook ─────────────────────────────────── */
function useScrolled(threshold = 4) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

/* ─── Theme hook ───────────────────────────────────────────── */
function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "dark"
  );
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => {
    setSwitching(true);
    setTimeout(() => setSwitching(false), 360);
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };

  return { theme, toggle, switching };
}

/* ─── Main Component ───────────────────────────────────────── */
export default function Navbar() {
  const scrolled   = useScrolled();
  const { theme, toggle, switching } = useTheme();
  const location   = useLocation();

  return (
    <header className={`topbar nb-bar ${scrolled ? "nb-scrolled" : ""}`}>
      <div className="nb-inner">

        {/* ── Brand ── */}
        <NavLink to="/" className="nb-brand" aria-label="Home">
          <div className="nb-logo-wrap">
            <Icons.Logo />
          </div>
          <div className="nb-brand-text">
            <span className="nb-brand-name">STAT<span className="nb-brand-accent">PITCH</span></span>
            <span className="nb-brand-sub">Football Analytics</span>
          </div>
        </NavLink>

        <div className="nb-divider" aria-hidden="true" />

        {/* ── Nav Groups ── */}
        <nav className="nb-nav" aria-label="Main navigation">
          {navGroups.map((group, gi) => (
            <div key={group.label} className="nb-group">
              <span className="nb-group-label">{group.label}</span>
              <div className="nb-group-items">
                {group.items.map((item, ii) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      `nb-pill ${isActive ? "nb-pill-active" : ""}`
                    }
                    style={{ animationDelay: `${gi * 60 + ii * 30}ms` }}
                  >
                    <span className="nb-pill-icon" aria-hidden="true">
                      <item.Icon />
                    </span>
                    <span className="nb-pill-text">{item.text}</span>
                    {item.tag && (
                      <span className="nb-pill-tag">{item.tag}</span>
                    )}
                    <span className="nb-pill-shimmer" aria-hidden="true" />
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Right cluster ── */}
        <div className="nb-right">
          <div className="nb-live-badge" title="Live data feed active">
            <span className="nb-live-dot" />
            <span className="nb-live-text">Live</span>
          </div>

          <button
            className={`nb-theme-btn ${switching ? "nb-theme-switching" : ""}`}
            onClick={toggle}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className="nb-theme-icon">
              {theme === "dark" ? <Icons.Sun /> : <Icons.Moon />}
            </span>
          </button>
        </div>

      </div>
    </header>
  );
}
