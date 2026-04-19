// Navbar.jsx — StatinSite v10  ·  refactored for Part 2
// ─────────────────────────────────────────────────────────────────────────
// Changes from v9:
//   • useClickOutside, useLockScroll → imported from @/hooks (removed inline)
//   • FPL routes aligned to /fpl/* structure decided in page-structure revamp
//     /fpl-intelligence  → /fpl/gw
//     /captaincy         → /fpl/captain
//     /transfer-planner  → /fpl/transfers
//     /squad-builder     → /fpl/squad
//     /differentials     → /fpl/differentials  (unchanged)
//     /fixture-difficulty→ /fpl/fixtures
//     /gameweek-insights → /fpl/stats
//     /fpl-table         → /fpl/table
//     /best-team         → /fpl/best-xi
//   • PRIMARY_NAV /best-team → /fpl  (new FPL Dashboard landing page)
//   • MOBILE_TABS same change
//   • All icon SVGs, CSS, animations, layout — 100% preserved
// ─────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useClickOutside, useLockScroll } from "@/hooks";

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  Home:     () => <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><path d="M2.5 8.8L10 2.5l7.5 6.3V17.5H13v-4.5H7v4.5H2.5V8.8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><rect x="7.5" y="13" width="5" height="4.5" rx="0.5" fill="currentColor" opacity="0.25"/></svg>,
  Live:     () => <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3.5" fill="currentColor"/><circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.4" opacity="0.4"/><circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.1" opacity="0.18"/></svg>,
  Predict:  () => <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.8"/><line x1="10" y1="4" x2="10" y2="16" stroke="currentColor" strokeWidth="1.2" opacity="0.45"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.3"/><line x1="2" y1="10" x2="17" y2="10" stroke="currentColor" strokeWidth="0.8" opacity="0.3"/></svg>,
  Centre:   () => <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><rect x="1.5" y="3.5" width="4.5" height="13" rx="1" stroke="currentColor" strokeWidth="1.6" opacity="0.5"/><rect x="7.75" y="2" width="4.5" height="16" rx="1" stroke="currentColor" strokeWidth="1.8"/><rect x="14" y="3.5" width="4.5" height="13" rx="1" stroke="currentColor" strokeWidth="1.6" opacity="0.5"/><circle cx="10" cy="6.5" r="1.8" fill="currentColor"/><line x1="7.75" y1="9.5" x2="12.25" y2="9.5" stroke="currentColor" strokeWidth="1.3" opacity="0.5" strokeLinecap="round"/><line x1="7.75" y1="12.5" x2="12.25" y2="12.5" stroke="currentColor" strokeWidth="1.3" opacity="0.3" strokeLinecap="round"/></svg>,
  Fantasy:  () => <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><path d="M10 1.5l2.2 5 5 .65-3.6 3.5.85 5.1L10 13.2l-4.45 2.55.85-5.1L2.8 7.15l5-.65L10 1.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>,
  Players:  () => <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="6.5" r="3.8" stroke="currentColor" strokeWidth="1.8"/><path d="M3 19c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  News:     () => <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8"/><path d="M6 8h8M6 11.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  Learn:    () => <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><path d="M4 16.5V4a1.5 1.5 0 011.5-1.5h10A1.5 1.5 0 0117 4v12.5l-3-1.5-3 1.5-3-1.5-3 1.5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M7.5 7.5h5M7.5 10.5h3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  Games:    () => <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><rect x="2" y="6" width="16" height="10" rx="3" stroke="currentColor" strokeWidth="1.8"/><path d="M7 11H9M8 10v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="13" cy="11" r="1.2" fill="currentColor"/><circle cx="15.5" cy="11" r="1.2" fill="currentColor" opacity="0.5"/></svg>,
  Search:   () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.8"/><path d="M13.5 13.5l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  Close:    () => <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  Chevron:  () => <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>,
  Menu:     () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 6h14M3 10h10M3 14h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  Expand:   () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M4 7h6M7 4l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Collapse: () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M10 7H4M7 4L4 7l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

// ─── FPL item icons ───────────────────────────────────────────────────────────
const FplIc = {
  BestXI:   ({ color }) => (<svg width="22" height="22" viewBox="0 0 20 20" fill="none"><rect x="2" y="2.5" width="16" height="15" rx="1.5" stroke={color} strokeWidth="1.7" opacity="0.55"/><line x1="10" y1="2.5" x2="10" y2="17.5" stroke={color} strokeWidth="1" opacity="0.3"/><line x1="2" y1="10" x2="18" y2="10" stroke={color} strokeWidth="0.9" opacity="0.28"/><circle cx="10" cy="10" r="2.2" stroke={color} strokeWidth="1.1" opacity="0.55"/><circle cx="5.5" cy="15.2" r="1.35" fill={color}/><circle cx="10" cy="15.2" r="1.35" fill={color}/><circle cx="14.5" cy="15.2" r="1.35" fill={color}/><circle cx="6.8" cy="11" r="1.2" fill={color} opacity="0.85"/><circle cx="13.2" cy="11" r="1.2" fill={color} opacity="0.85"/><circle cx="10" cy="6.8" r="1.35" fill={color} opacity="0.7"/></svg>),
  GWGuide:  ({ color }) => (<svg width="22" height="22" viewBox="0 0 20 20" fill="none"><rect x="3" y="2.5" width="14" height="15" rx="1.5" stroke={color} strokeWidth="1.7"/><line x1="3" y1="7" x2="17" y2="7" stroke={color} strokeWidth="1" opacity="0.4"/><circle cx="6.5" cy="4.8" r="1.1" fill={color}/><circle cx="10" cy="4.8" r="1.1" fill={color}/><circle cx="13.5" cy="4.8" r="1.1" fill={color}/><line x1="6.5" y1="10.5" x2="13.5" y2="10.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><line x1="6.5" y1="13.5" x2="11" y2="13.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>),
  Captain:  ({ color }) => (<svg width="22" height="22" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7.5" r="4" stroke={color} strokeWidth="1.7"/><text x="10" y="10.3" textAnchor="middle" fontSize="5.5" fontWeight="900" fill={color} fontFamily="Inter,-apple-system,sans-serif">C</text><path d="M4.5 17.5c0-3.04 2.46-4.8 5.5-4.8s5.5 1.76 5.5 4.8" stroke={color} strokeWidth="1.7" strokeLinecap="round" fill="none"/></svg>),
  Transfer: ({ color }) => (<svg width="22" height="22" viewBox="0 0 20 20" fill="none"><circle cx="5.5" cy="6.5" r="2.8" stroke={color} strokeWidth="1.6"/><circle cx="14.5" cy="13.5" r="2.8" stroke={color} strokeWidth="1.6"/><path d="M8 6.5h5.5l-2-2.2" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M12 13.5H6.5l2 2.2" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>),
  Squad:    ({ color }) => (<svg width="22" height="22" viewBox="0 0 20 20" fill="none"><rect x="2" y="3" width="16" height="14" rx="1.5" stroke={color} strokeWidth="1.6" opacity="0.5"/><line x1="10" y1="3" x2="10" y2="17" stroke={color} strokeWidth="0.9" opacity="0.28"/><line x1="2" y1="10" x2="18" y2="10" stroke={color} strokeWidth="0.9" opacity="0.28"/><circle cx="6" cy="6.5" r="1.5" fill={color} opacity="0.8"/><circle cx="14" cy="6.5" r="1.5" fill={color} opacity="0.8"/><circle cx="10" cy="13.5" r="1.6" fill={color}/><circle cx="5.5" cy="13.5" r="1.3" fill={color} opacity="0.7"/><circle cx="14.5" cy="13.5" r="1.3" fill={color} opacity="0.7"/></svg>),
  Gems:     ({ color }) => (<svg width="22" height="22" viewBox="0 0 20 20" fill="none"><path d="M10 2.5L5.5 7.5v.7L10 17.5l4.5-9.3v-.7L10 2.5z" stroke={color} strokeWidth="1.7" strokeLinejoin="round" fill={color} fillOpacity="0.12"/><line x1="5.5" y1="7.5" x2="14.5" y2="7.5" stroke={color} strokeWidth="1" opacity="0.5"/><path d="M7.5 7.5L10 2.5l2.5 5" stroke={color} strokeWidth="0.9" fill="none" opacity="0.45"/></svg>),
  FDR:      () => (<svg width="22" height="22" viewBox="0 0 20 20" fill="none"><rect x="2"    y="2.5"  width="4.8" height="4.2" rx="1" fill="#ff453a"/><rect x="7.6"  y="2.5"  width="4.8" height="4.2" rx="1" fill="#ffd60a"/><rect x="13.2" y="2.5"  width="4.8" height="4.2" rx="1" fill="#30d158"/><rect x="2"    y="8"    width="4.8" height="4.2" rx="1" fill="#ffd60a"/><rect x="7.6"  y="8"    width="4.8" height="4.2" rx="1" fill="#30d158"/><rect x="13.2" y="8"    width="4.8" height="4.2" rx="1" fill="#ff453a"/><rect x="2"    y="13.5" width="4.8" height="4.2" rx="1" fill="#30d158"/><rect x="7.6"  y="13.5" width="4.8" height="4.2" rx="1" fill="#ff453a"/><rect x="13.2" y="13.5" width="4.8" height="4.2" rx="1" fill="#ffd60a"/></svg>),
  Stats:    ({ color }) => (<svg width="22" height="22" viewBox="0 0 20 20" fill="none"><rect x="2.5"  y="12.5" width="3.5" height="5"  rx="0.8" fill={color} opacity="0.45"/><rect x="8.25" y="8.5"  width="3.5" height="9"  rx="0.8" fill={color} opacity="0.7"/><rect x="14"   y="4"    width="3.5" height="13.5" rx="0.8" fill={color}/><circle cx="4.25"  cy="11.2" r="1.4" fill={color} opacity="0.5"/><circle cx="10"    cy="7.2"  r="1.4" fill={color} opacity="0.75"/><circle cx="15.75" cy="3"    r="1.6" fill={color}/><path d="M4.25 11.2L10 7.2l5.75-4.2" stroke={color} strokeWidth="1" opacity="0.5" fill="none"/></svg>),
  Table:    ({ color }) => (<svg width="22" height="22" viewBox="0 0 20 20" fill="none"><path d="M6.5 2.5h7l1.2 3H5.3L6.5 2.5z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none"/><path d="M5.3 5.5C5.3 9.9 7.5 12.5 10 12.5s4.7-2.6 4.7-7" stroke={color} strokeWidth="1.6" fill="none"/><path d="M5.3 5.5H2.8l1.5 4.2 2.2-1.6" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none" opacity="0.55"/><path d="M14.7 5.5H17.2l-1.5 4.2-2.2-1.6" stroke={color} strokeWidth="1.5" strokeLinejoin="round" fill="none" opacity="0.55"/><line x1="10" y1="12.5" x2="10" y2="15.5" stroke={color} strokeWidth="1.6" strokeLinecap="round"/><line x1="7" y1="15.5" x2="13" y2="15.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/></svg>),
};

// ─── Nav data ─────────────────────────────────────────────────────────────────
// CHANGE: /best-team → /fpl (new FPL Dashboard landing page)
const PRIMARY_NAV = [
  { to: "/",                           label: "Home",              Icon: Ic.Home,    color: "#ffffff", end: true },
  { to: "/live",                       label: "Live Scores",       Icon: Ic.Live,    color: "#ff453a", isLive: true },
  { to: "/match-centre",               label: "Match Centre",      Icon: Ic.Centre,  color: "#00c2ff", isNew: true },
  { to: "/predictions/premier-league", label: "Match Predictions", Icon: Ic.Predict, color: "#0a84ff" },
  { to: "/fpl",                        label: "Fantasy Football",  Icon: Ic.Fantasy, color: "#30d158", fplGroup: true },
  { to: "/players",                    label: "Player Stats",      Icon: Ic.Players, color: "#bf5af2" },
  { to: "/news",                       label: "News Tracker",      Icon: Ic.News,    color: "#ff9f0a" },
];

const SECONDARY_NAV = [
  { to: "/learn", label: "How It Works", Icon: Ic.Learn, color: "#64d2ff" },
  { to: "/games", label: "Mini Games",   Icon: Ic.Games, color: "#ff6961" },
];

// CHANGE: all FPL routes aligned to /fpl/* structure
const FPL_ITEMS = [
  { to: "/fpl/best-xi",     label: "Best Starting 11",  Icon: FplIc.BestXI,   desc: "The strongest team you can put out this gameweek",        color: "#30d158" },
  { to: "/fpl/gw",          label: "Gameweek Guide",    Icon: FplIc.GWGuide,  desc: "Everything to sort before the deadline",                  color: "#ffd60a" },
  { to: "/fpl/captain",     label: "Who to Captain",    Icon: FplIc.Captain,  desc: "Best armband pick for double points this week",           color: "#ff9f0a" },
  { to: "/fpl/transfers",   label: "Transfer Planner",  Icon: FplIc.Transfer, desc: "Plan your free transfers and future moves",               color: "#bf5af2" },
  { to: "/fpl/squad",       label: "Build Your Squad",  Icon: FplIc.Squad,    desc: "Pick your 15 players across all Premier League clubs",    color: "#34d1a0" },
  { to: "/fpl/differentials",label: "Hidden Gems",      Icon: FplIc.Gems,     desc: "Low owned bargains most managers have completely missed", color: "#ff6961" },
  { to: "/fpl/fixtures",    label: "Fixture Difficulty",Icon: FplIc.FDR,      desc: "Green = easy, red = tough — see the kindest run",         color: "#ff453a" },
  { to: "/fpl/stats",       label: "Gameweek Stats",    Icon: FplIc.Stats,    desc: "Goals, assists, clean sheets and bonus points by player", color: "#0a84ff" },
  { to: "/fpl/table",       label: "Mini League Table", Icon: FplIc.Table,    desc: "See where you stand against your mates",                  color: "#64d2ff" },
];

const FPL_PATHS = ["/fpl", ...FPL_ITEMS.map(i => i.to)];

// CHANGE: /best-team → /fpl
const MOBILE_TABS = [
  { to: "/",                           label: "Home",    Icon: Ic.Home,    color: "#ffffff", end: true },
  { to: "/live",                       label: "Live",    Icon: Ic.Live,    color: "#ff453a", isLive: true },
  { to: "/match-centre",               label: "Centre",  Icon: Ic.Centre,  color: "#00c2ff" },
  { to: "/predictions/premier-league", label: "Predict", Icon: Ic.Predict, color: "#0a84ff" },
  { to: "/fpl",                        label: "Fantasy", Icon: Ic.Fantasy, color: "#30d158" },
];

// ─── useFplActive ─────────────────────────────────────────────────────────────
function useFplActive() {
  const { pathname } = useLocation();
  return FPL_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));
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
  const isNew  = item.isNew;
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
      {!iconOnly && isNew  && <span className="nb-fpl-new-badge" style={{marginLeft:"auto"}}>NEW</span>}
    </NavLink>
  );
}

// ─── FPL section ──────────────────────────────────────────────────────────────
function FplSection({ iconOnly }) {
  const location = useLocation();
  return (
    <div style={{ position: "relative" }}>
      {!iconOnly && (
        <div className="nb-fpl-section-head">
          <svg width="11" height="11" viewBox="0 0 20 20" fill="none">
            <path d="M10 1.5l2 4.5 4.5.6-3.3 3.2.8 4.7L10 12l-4 2.5.8-4.7L3.5 6.6 8 6l2-4.5z"
              stroke="rgba(48,209,88,.65)" strokeWidth="1.4" strokeLinejoin="round"/>
          </svg>
          <span>Fantasy Football (FPL)</span>
        </div>
      )}
      <div className={iconOnly ? "" : "nb-fpl-always-block"}>
        {FPL_ITEMS.map((sub, i) => {
          const isActive = location.pathname === sub.to || location.pathname.startsWith(sub.to + "/");
          return (
            <NavLink
              key={sub.to}
              to={sub.to}
              className={"nb-fpl-row" + (isActive ? " nb-fpl-row--active" : "")}
              style={{ "--sub": sub.color, animationDelay: `${i * 28}ms` }}
              title={iconOnly ? sub.label : undefined}
            >
              {iconOnly ? (
                <div className="nb-icon" style={{ margin: "0 auto" }}>
                  <sub.Icon color={sub.color} />
                </div>
              ) : (
                <>
                  <div className="nb-icon nb-fpl-icon">
                    <sub.Icon color={sub.color} />
                  </div>
                  <span className="nb-fpl-row-text">
                    <span className="nb-fpl-row-label">{sub.label}</span>
                    <span className="nb-fpl-row-desc">{sub.desc}</span>
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

// ─── Mobile bottom tab bar ────────────────────────────────────────────────────
function MobileTabBar() {
  const location = useLocation();
  return (
    <nav className="nb-mob-bar">
      {MOBILE_TABS.map(item => {
        const isFplTab = item.to === "/fpl";
        const active = isFplTab
          ? FPL_PATHS.some(p => location.pathname === p || location.pathname.startsWith(p + "/"))
          : item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
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

  // ← was inline functions, now imported from @/hooks
  useClickOutside(drawerRef, () => setMobileDrawer(false));
  useLockScroll(mobileDrawer);

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 60);
  }, [searchOpen]);

  useEffect(() => { setMobileDrawer(false); }, [location.pathname]);

  const handleSearch = e => {
    if (e.key === "Enter" && searchVal.trim()) {
      navigate(`/players?search=${encodeURIComponent(searchVal.trim())}`);
      setSearchOpen(false); setSearchVal("");
    }
    if (e.key === "Escape") { setSearchOpen(false); setSearchVal(""); }
  };

  const isActive = item => {
    if (item.fplGroup) return fplActive;
    if (item.end)      return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  const SW = iconOnly ? 64 : 220;

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-w", `${SW}px`);
  }, [SW]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; }

        :root {
          --nb-bg:      #0d0d0d;
          --nb-border:  rgba(255,255,255,0.07);
          --nb-text:    rgba(255,255,255,0.88);
          --nb-muted:   rgba(255,255,255,0.34);
          --nb-hover:   rgba(255,255,255,0.055);
          --nb-active:  rgba(255,255,255,0.08);
          --nb-bar:     rgba(10,10,10,0.96);
          --nb-shadow:  rgba(0,0,0,0.70);
          --nb-glow-b:  rgba(10,132,255,0.55);
          --nb-glow-g:  rgba(48,209,88,0.45);
        }

        @keyframes nb-pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.55)} }
        @keyframes nb-ring    { 0%{transform:scale(1);opacity:.6} 80%{transform:scale(2.8);opacity:0} 100%{opacity:0} }
        @keyframes nb-slidein { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:none} }
        @keyframes nb-shimmer { 0%{background-position:200% 50%} 100%{background-position:-200% 50%} }
        @keyframes nb-fpl-in  { from{opacity:0;transform:translateY(6px) scaleY(.97)} to{opacity:1;transform:none} }
        @keyframes nb-item-in { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:none} }
        @keyframes nb-drawer-in { from{opacity:0;transform:translateX(-100%)} to{opacity:1;transform:translateX(0)} }
        @keyframes nb-backdrop-in { from{opacity:0} to{opacity:1} }
        @keyframes nb-mob-tab-bounce { 0%{transform:translateY(0)} 40%{transform:translateY(-5px) scale(1.15)} 70%{transform:translateY(1px) scale(0.97)} 100%{transform:translateY(0) scale(1)} }
        @keyframes nb-icon-pop { 0%{transform:scale(1)} 40%{transform:scale(1.22)} 70%{transform:scale(0.94)} 100%{transform:scale(1)} }
        @keyframes nb-active-rail { from{opacity:0;transform:scaleY(0)} to{opacity:1;transform:scaleY(1)} }
        @keyframes nb-glow-pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes nb-new-badge { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        @keyframes nb-collapse { from{width:220px} to{width:64px} }
        @keyframes nb-expand   { from{width:64px}  to{width:220px} }

        .nb-sidebar {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: ${SW}px; z-index: 200;
          background: var(--nb-bg);
          backdrop-filter: blur(48px) saturate(200%);
          -webkit-backdrop-filter: blur(48px) saturate(200%);
          border-right: 0.5px solid var(--nb-border);
          display: flex; flex-direction: column;
          transition: width 0.32s cubic-bezier(0.4,0,0.2,1);
          overflow: hidden;
          will-change: width;
        }
        .nb-sidebar::before {
          content: ''; position: absolute; top: 0; left: 0; bottom: 0; width: 1.5px;
          background: linear-gradient(180deg,
            transparent 0%, var(--nb-glow-b) 25%, var(--nb-glow-g) 55%,
            rgba(255,214,10,0.35) 75%, transparent 100%);
          background-size: 100% 300%;
          animation: nb-shimmer 6s linear infinite;
          z-index: 10; pointer-events: none;
        }
        .nb-sidebar::after {
          content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background: repeating-linear-gradient(0deg,transparent,transparent 39px,
            rgba(255,255,255,.009) 39px,rgba(255,255,255,.009) 40px);
        }
        .nb-sidebar.nb-collapsing { animation: nb-collapse 0.32s cubic-bezier(0.4,0,0.2,1) both; }
        .nb-sidebar.nb-expanding  { animation: nb-expand   0.32s cubic-bezier(0.4,0,0.2,1) both; }

        .nb-head {
          display: flex; align-items: center; gap: 8px;
          padding: 18px 14px 12px; min-height: 64px;
          border-bottom: 0.5px solid var(--nb-border);
          flex-shrink: 0; position: relative; z-index: 2;
        }
        .nb-brand {
          display: flex; align-items: center; gap: 9px;
          text-decoration: none; flex: 1; min-width: 0; overflow: hidden;
          transition: opacity 0.2s ease;
        }
        .nb-brand:hover { opacity: 0.85; }
        .nb-brand-name {
          font-size: 14.5px; font-weight: 700;
          color: var(--nb-text); letter-spacing: -0.035em;
          font-family: 'Inter',-apple-system,sans-serif;
          white-space: nowrap;
          transition: opacity 0.2s ease;
          animation: nb-item-in 0.3s cubic-bezier(0.22,1,0.36,1) both;
        }
        .nb-toggle {
          width: 26px; height: 26px; border-radius: 7px;
          border: none; background: var(--nb-hover);
          color: var(--nb-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-left: auto;
          transition: background 0.15s, color 0.15s, transform 0.18s cubic-bezier(.34,1.56,.64,1);
          position: relative; z-index: 2;
        }
        .nb-toggle:hover { background: var(--nb-active); color: var(--nb-text); transform: scale(1.08); }
        .nb-toggle:active { transform: scale(0.92); }

        .nb-search-wrap {
          padding: 8px 10px; flex-shrink: 0;
          border-bottom: 0.5px solid var(--nb-border);
          position: relative; z-index: 2;
          animation: nb-item-in 0.25s 0.05s cubic-bezier(0.22,1,0.36,1) both;
        }
        .nb-search-inner {
          display: flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,.04);
          border: 0.5px solid var(--nb-border);
          border-radius: 9px; padding: 6px 10px;
          transition: border-color .18s, background .18s, box-shadow .18s;
        }
        .nb-search-inner:focus-within {
          border-color: rgba(10,132,255,.55);
          background: rgba(10,132,255,.05);
          box-shadow: 0 0 0 3px rgba(10,132,255,.12);
        }
        .nb-search-inner svg { color: var(--nb-muted); flex-shrink: 0; transition: color .15s; }
        .nb-search-inner:focus-within svg { color: rgba(10,132,255,.8); }
        .nb-search-input {
          border: none; background: transparent; outline: none;
          font-size: 12.5px; color: var(--nb-text);
          font-family: 'Inter',-apple-system,sans-serif;
          width: 100%; min-width: 0;
        }
        .nb-search-input::placeholder { color: var(--nb-muted); }

        .nb-scroll {
          flex: 1; overflow-y: auto; overflow-x: hidden;
          padding: 6px 7px 0; scrollbar-width: none;
          position: relative; z-index: 2;
        }
        .nb-scroll::-webkit-scrollbar { display: none; }
        .nb-section {
          font-size: 9.5px; font-weight: 700; color: var(--nb-muted);
          letter-spacing: 0.12em; text-transform: uppercase;
          padding: 10px 7px 4px;
          animation: nb-item-in 0.25s 0.06s cubic-bezier(0.22,1,0.36,1) both;
        }
        .nb-divider { height: 0.5px; background: var(--nb-border); margin: 6px 7px; }

        .nb-item, .nb-item-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 9px; border-radius: 10px;
          font-size: 13px; font-weight: 500;
          color: var(--nb-muted);
          text-decoration: none; white-space: nowrap;
          background: transparent; border: none; cursor: pointer;
          font-family: 'Inter',-apple-system,sans-serif;
          transition: color 0.15s, background 0.15s, transform 0.15s;
          width: 100%; margin-bottom: 1px;
          letter-spacing: -0.012em; position: relative;
          animation: nb-item-in 0.28s cubic-bezier(0.22,1,0.36,1) both;
        }
        .nb-item:hover, .nb-item-btn:hover {
          background: var(--nb-hover); color: var(--nb-text);
          transform: translateX(2px);
        }
        .nb-item:active { transform: translateX(1px) scale(0.99); }
        .nb-item--active {
          background: var(--nb-active);
          color: var(--ic, var(--nb-text)) !important;
        }
        .nb-item--active::after {
          content: ''; position: absolute; left: 0; top: 18%; bottom: 18%;
          width: 3px; border-radius: 0 3px 3px 0;
          background: var(--ic, #fff);
          box-shadow: 0 0 10px 1px var(--ic, #fff);
          animation: nb-active-rail 0.22s cubic-bezier(0.22,1,0.36,1) both;
        }
        .nb-item--live { color: rgba(255,69,58,0.55) !important; }
        .nb-item--live:hover { color: #ff453a !important; background: rgba(255,69,58,.06); }
        .nb-item--live.nb-item--active { color: #ff453a !important; background: rgba(255,69,58,.09); }
        .nb-label { flex: 1; }

        .nb-icon {
          width: 34px; height: 34px; border-radius: 9px;
          background: rgba(255,255,255,.05);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; position: relative;
          transition: background 0.15s, transform 0.22s cubic-bezier(.34,1.56,.64,1), box-shadow 0.22s;
          color: var(--nb-muted);
        }
        .nb-fpl-icon { background: color-mix(in srgb, var(--sub, #30d158) 10%, transparent); }
        .nb-item:hover .nb-icon { transform: scale(1.1) rotate(-2deg); }
        .nb-item--active .nb-icon {
          background: color-mix(in srgb, var(--ic, white) 16%, transparent);
          color: var(--ic, var(--nb-text));
          box-shadow: 0 0 12px 2px color-mix(in srgb, var(--ic, white) 25%, transparent);
          animation: nb-icon-pop 0.35s cubic-bezier(0.22,1,0.36,1) both;
        }
        .nb-fpl-row:hover .nb-fpl-icon { transform: scale(1.1) rotate(-2deg); }
        .nb-fpl-row--active .nb-fpl-icon {
          background: color-mix(in srgb, var(--sub, #30d158) 20%, transparent);
          box-shadow: 0 0 10px 2px color-mix(in srgb, var(--sub, #30d158) 22%, transparent);
        }

        .nb-live-dot {
          position: absolute; top: 3px; right: 3px; width: 6px; height: 6px;
        }
        .nb-live-dot::before {
          content: ""; position: absolute; inset: 0; border-radius: 50%;
          background: #ff453a; animation: nb-pulse 1.8s ease-in-out infinite;
        }
        .nb-item--active .nb-live-dot::after {
          content: ""; position: absolute; inset: 0; border-radius: 50%;
          background: rgba(255,69,58,.45); animation: nb-ring 1.8s ease-out infinite;
        }
        .nb-live-dot--sm { top: 2px; right: 2px; width: 5px; height: 5px; }
        .nb-live-badge {
          font-size: 9px; font-weight: 700; letter-spacing: 0.08em;
          background: rgba(255,69,58,.14); color: #ff453a;
          border-radius: 999px; padding: 2px 7px; margin-left: auto;
          animation: nb-glow-pulse 2s ease-in-out infinite;
        }

        .nb-fpl-section-head {
          display: flex; align-items: center; gap: 6px;
          padding: 10px 8px 5px;
          font-size: 9px; font-weight: 700; color: rgba(48,209,88,0.55);
          text-transform: uppercase; letter-spacing: 0.13em;
          font-family: 'Inter',-apple-system,sans-serif;
          animation: nb-item-in 0.25s 0.08s cubic-bezier(0.22,1,0.36,1) both;
        }
        .nb-fpl-always-block {
          margin: 2px 0 4px 3px; padding: 5px;
          background: rgba(48,209,88,0.04);
          border: 0.5px solid rgba(48,209,88,0.13);
          border-radius: 13px;
          animation: nb-fpl-in 0.3s cubic-bezier(0.22,1,0.36,1) both;
        }
        .nb-fpl-row {
          display: flex; align-items: center; gap: 10px;
          padding: 7px 9px; border-radius: 9px;
          text-decoration: none;
          transition: background .15s, transform .15s;
          animation: nb-item-in 0.3s cubic-bezier(0.22,1,0.36,1) both;
        }
        .nb-fpl-row:hover { background: rgba(255,255,255,0.06); transform: translateX(2px); }
        .nb-fpl-row:active { transform: translateX(1px) scale(0.99); }
        .nb-fpl-row--active { background: color-mix(in srgb, var(--sub, #30d158) 11%, transparent); }
        .nb-fpl-dot {
          width: 6px; height: 6px; border-radius: 50%;
          flex-shrink: 0; margin-top: 1px;
          transition: transform 0.2s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s;
        }
        .nb-fpl-row--active .nb-fpl-dot { transform: scale(1.4); box-shadow: 0 0 6px 1px var(--sub, #30d158); }
        .nb-fpl-row-text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
        .nb-fpl-row-label {
          font-size: 12px; font-weight: 500; color: var(--nb-text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .nb-fpl-row-desc {
          font-size: 10px; color: var(--nb-muted); margin-top: 1px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .nb-fpl-new-badge {
          font-size: 7.5px; font-weight: 800; letter-spacing: 0.08em;
          background: rgba(255,214,10,0.16); color: #ffd60a;
          border-radius: 4px; padding: 2px 5px; flex-shrink: 0;
          animation: nb-new-badge 2.5s ease-in-out infinite;
        }

        .sn7-page-offset { margin-left: ${SW}px; transition: margin-left 0.32s cubic-bezier(0.4,0,0.2,1); }
        .sn-page-wrap, .sn-site-footer {
          margin-left: ${SW}px !important;
          width: calc(100vw - ${SW}px) !important;
          transition: margin-left 0.32s cubic-bezier(0.4,0,0.2,1), width 0.32s cubic-bezier(0.4,0,0.2,1);
        }
        @media (max-width: 820px) {
          .sn-page-wrap, .sn-site-footer { margin-left: 0 !important; width: 100% !important; }
        }
        .sn-fixed-bg { left: ${SW}px !important; transition: left 0.32s cubic-bezier(0.4,0,0.2,1); }
        @media (max-width: 820px) { .sn-fixed-bg { left: 0 !important; } }

        .nb-top-bar {
          display: none; position: fixed; top: 0; left: 0; right: 0;
          height: 56px; z-index: 200;
          background: rgba(10,10,10,0.92);
          backdrop-filter: blur(48px) saturate(200%);
          -webkit-backdrop-filter: blur(48px) saturate(200%);
          border-bottom: 0.5px solid var(--nb-border);
          align-items: center; justify-content: space-between;
          padding: 0 16px; gap: 12px;
        }
        .nb-mob-brand { display: flex; align-items: center; gap: 7px; text-decoration: none; }
        .nb-mob-brand-name {
          font-size: 17px; font-weight: 700; color: var(--nb-text); letter-spacing: -0.04em;
          font-family: 'Inter',-apple-system,sans-serif;
        }
        .nb-mob-search-input {
          height: 34px; background: rgba(255,255,255,.07);
          border: 0.5px solid rgba(10,132,255,.45);
          border-radius: 10px; padding: 0 12px;
          font-size: 14px; color: var(--nb-text);
          font-family: 'Inter',-apple-system,sans-serif;
          outline: none; width: 180px;
          transition: width 0.22s ease, box-shadow 0.18s;
        }
        .nb-mob-search-input:focus { width: 210px; box-shadow: 0 0 0 3px rgba(10,132,255,.18); }

        .nb-mob-drawer {
          display: none; position: fixed; top: 0; left: 0; bottom: 0;
          width: min(300px, 86vw); z-index: 300;
          background: rgba(10,10,10,0.97);
          backdrop-filter: blur(48px) saturate(200%);
          -webkit-backdrop-filter: blur(48px) saturate(200%);
          border-right: 0.5px solid var(--nb-border);
          flex-direction: column; overflow-y: auto;
          animation: nb-drawer-in 0.28s cubic-bezier(0.22,1,0.36,1) both;
          scrollbar-width: none;
          will-change: transform;
        }
        .nb-mob-drawer::-webkit-scrollbar { display: none; }
        .nb-backdrop {
          display: none; position: fixed; inset: 0; z-index: 299;
          background: rgba(0,0,0,.6);
          backdrop-filter: blur(3px);
          animation: nb-backdrop-in 0.22s ease both;
        }

        .nb-mob-bar {
          display: none; position: fixed; bottom: 0; left: 0; right: 0;
          height: 68px; z-index: 200;
          background: rgba(10,10,10,0.94);
          backdrop-filter: blur(48px) saturate(200%);
          -webkit-backdrop-filter: blur(48px) saturate(200%);
          border-top: 0.5px solid var(--nb-border);
          justify-content: space-around; align-items: flex-start;
          padding: 8px 0 max(10px, env(safe-area-inset-bottom));
          gap: 0;
        }
        .nb-mob-tab {
          display: flex; flex-direction: column; align-items: center;
          gap: 4px; flex: 1; text-decoration: none;
          color: var(--nb-muted);
          transition: color 0.15s;
          padding: 2px 6px;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .nb-mob-tab--active { color: var(--tc, white); }
        .nb-mob-tab--active .nb-mob-icon {
          background: color-mix(in srgb, var(--tc, white) 13%, transparent);
          animation: nb-mob-tab-bounce 0.38s cubic-bezier(0.22,1,0.36,1) both;
        }
        .nb-mob-tab--active .nb-mob-icon svg { animation: nb-icon-pop 0.35s cubic-bezier(0.22,1,0.36,1) both; }
        .nb-mob-icon {
          width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          position: relative;
          transition: background 0.15s, transform 0.2s cubic-bezier(0.34,1.56,0.64,1);
        }
        .nb-mob-tab:active .nb-mob-icon { transform: scale(0.88); }
        .nb-mob-icon--live .nb-live-dot--sm { position: absolute; top: 4px; right: 4px; }
        .nb-mob-label {
          font-size: 10.5px; font-weight: 600; letter-spacing: 0.01em;
          font-family: 'Inter',-apple-system,sans-serif;
          transition: opacity 0.15s;
        }
        .nb-mob-tab:not(.nb-mob-tab--active) .nb-mob-label { opacity: 0.55; }

        .nb-icon-btn {
          width: 38px; height: 38px; border-radius: 10px;
          border: none; background: transparent;
          color: var(--nb-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, color 0.15s, transform 0.18s cubic-bezier(.34,1.56,.64,1);
          flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .nb-icon-btn:hover { background: var(--nb-hover); color: var(--nb-text); }
        .nb-icon-btn:active { transform: scale(0.88); background: var(--nb-active); }

        @media (max-width: 820px) {
          .nb-sidebar      { display: none; }
          .sn7-page-offset { margin-left: 0 !important; padding-top: 56px; padding-bottom: 76px; }
          .sn-page-wrap, .sn-site-footer { margin-left: 0 !important; width: 100% !important; padding-top: 56px; padding-bottom: 76px; }
          .nb-top-bar  { display: flex; }
          .nb-mob-bar  { display: flex; }
          .nb-mob-drawer { display: flex; }
          .nb-backdrop   { display: block; }
        }

        @media (prefers-reduced-motion: reduce) {
          .nb-sidebar, .nb-item, .nb-fpl-row, .nb-icon,
          .nb-mob-tab, .nb-mob-icon, .nb-icon-btn,
          .nb-brand, .nb-toggle { transition: none !important; animation: none !important; }
        }
      `}</style>

      {/* ══ DESKTOP SIDEBAR ══════════════════════════════════════════ */}
      <aside className="nb-sidebar" style={{ width: SW }} aria-label="Main navigation">
        <div className="nb-head">
          <NavLink to="/" className="nb-brand" aria-label="StatinSite home">
            <BrandMark size={26}/>
            {!iconOnly && <span className="nb-brand-name">StatinSite</span>}
          </NavLink>
          <button
            className="nb-toggle"
            onClick={() => setIconOnly(v => !v)}
            aria-label={iconOnly ? "Expand sidebar" : "Collapse to icons"}
            title={iconOnly ? "Expand sidebar" : "Collapse to icons"}
          >
            {iconOnly ? <Ic.Expand/> : <Ic.Collapse/>}
          </button>
        </div>

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
                aria-label="Search players and teams"
              />
              {searchVal && (
                <button onClick={() => setSearchVal("")}
                  style={{ background:"none",border:"none",cursor:"pointer",color:"var(--nb-muted)",display:"flex",padding:0 }}
                  aria-label="Clear search">
                  <Ic.Close/>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="nb-scroll" role="navigation">
          {!iconOnly && <div className="nb-section" aria-hidden="true">Navigation</div>}
          {PRIMARY_NAV.map((item, i) => item.fplGroup
            ? <FplSection key={item.to} iconOnly={iconOnly}/>
            : <SideNavItem key={item.to} item={item} active={isActive(item)} iconOnly={iconOnly}
                style={{ animationDelay: `${i * 30}ms` }}/>
          )}
          <div className="nb-divider"/>
          {!iconOnly && <div className="nb-section" aria-hidden="true">More</div>}
          {SECONDARY_NAV.map((item, i) =>
            <SideNavItem key={item.to} item={item} active={isActive(item)} iconOnly={iconOnly}
              style={{ animationDelay: `${(PRIMARY_NAV.length + i) * 30}ms` }}/>
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
          <div className="nb-backdrop" onClick={() => setMobileDrawer(false)} aria-hidden="true"/>
          <nav ref={drawerRef} className="nb-mob-drawer" aria-label="Mobile navigation">
            <div className="nb-head">
              <NavLink to="/" className="nb-brand" onClick={() => setMobileDrawer(false)} aria-label="StatinSite home">
                <BrandMark size={24}/>
                <span className="nb-brand-name">StatinSite</span>
              </NavLink>
              <button className="nb-icon-btn" onClick={() => setMobileDrawer(false)} aria-label="Close menu">
                <Ic.Close/>
              </button>
            </div>
            <div className="nb-scroll" style={{ padding: "6px 8px 20px" }}>
              <div className="nb-section" aria-hidden="true">Navigation</div>
              {PRIMARY_NAV.map(item => item.fplGroup
                ? <FplSection key={item.to} iconOnly={false}/>
                : <SideNavItem key={item.to} item={item} active={isActive(item)} iconOnly={false}
                    onClick={() => setMobileDrawer(false)}/>
              )}
              <div className="nb-divider"/>
              <div className="nb-section" aria-hidden="true">More</div>
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