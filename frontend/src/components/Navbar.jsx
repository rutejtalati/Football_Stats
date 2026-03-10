// Navbar.jsx — StatinSite v7
// Complete redesign: two-row nav with mega-dropdown, grouped sections, no flags
import { NavLink, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

// ── Icons ──────────────────────────────────────────────────────────────────
const Icon = {
  Search:      ()=><svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.6"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  Close:       ()=><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  Menu:        ()=><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  ChevDown:    ()=><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Live:        ()=><svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>,
  Predictions: ()=><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 13l3.5-5.5 3 2 3-4.5 3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="13.5" cy="4" r="1.5" fill="currentColor" opacity=".7"/></svg>,
  Squad:       ()=><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>,
  Star:        ()=><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.5l1.5 3.1 3.5.5-2.5 2.4.6 3.4L8 9.3l-3.1 1.6.6-3.4L3 5.1l3.5-.5L8 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  Chart:       ()=><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1.5 12.5l3.5-4.5 3 2.5 3-4.5 3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Person:      ()=><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  Table:       ()=><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M1 5.5h14M6 5.5v9.5" stroke="currentColor" strokeWidth="1.4"/></svg>,
  Games:       ()=><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="8" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M5 8h3M6.5 6.5v3M11.5 7.5v1M10.5 8h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  Learn:       ()=><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 5l6-3 6 3-6 3-6-3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M14 5v5M4 7.5V11c0 1.5 2 2.5 4 2.5s4-1 4-2.5V7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  Ball:        ()=><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/><path d="M8 1.5v4M8 10.5v4M1.5 8h4M10.5 8h4M3 3l2.5 2.5M10.5 10.5L13 13M13 3l-2.5 2.5M5.5 10.5L3 13" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity=".6"/></svg>,
};

// ── League tabs (text only, no icons) ─────────────────────────────────────
const LEAGUES = [
  { slug:"premier-league", label:"Premier League", short:"EPL",     color:"#60a5fa" },
  { slug:"la-liga",        label:"La Liga",         short:"La Liga", color:"#fb923c" },
  { slug:"serie-a",        label:"Serie A",          short:"Serie A", color:"#34d399" },
  { slug:"ligue-1",        label:"Ligue 1",          short:"Ligue 1", color:"#c084fc" },
];

// ── Navigation structure ───────────────────────────────────────────────────
const NAV = [
  {
    label: "Predict", icon: Icon.Predictions, color: "#60a5fa",
    items: [
      { to:"/predictions/premier-league", label:"Match Predictions", desc:"AI-powered match odds", icon:Icon.Predictions },
    ]
  },
  {
    label: "FPL", icon: Icon.Star, color: "#34d399", badge:"FPL",
    items: [
      { to:"/squad-builder",     label:"Squad Builder",  desc:"Build your dream squad",  icon:Icon.Squad  },
      { to:"/best-team",         label:"Best XI",        desc:"Top performers this GW",  icon:Icon.Star   },
      { to:"/gameweek-insights", label:"GW Insights",    desc:"Gameweek deep-dive",      icon:Icon.Chart  },
      { to:"/player",            label:"Player Search",  desc:"Stats for every player",  icon:Icon.Person },
      { to:"/fpl-table",         label:"Stats Table",    desc:"Full FPL data table",     icon:Icon.Table  },
    ]
  },
  {
    label: "Games", icon: Icon.Games, color: "#c084fc",
    items: [
      { to:"/games", label:"Sports Games", desc:"12 interactive mini-games", icon:Icon.Games },
    ]
  },
  {
    label: "Learn", icon: Icon.Learn, color: "#fbbf24",
    items: [
      { to:"/learn", label:"Stats Academy", desc:"xG, Elo, Poisson & more", icon:Icon.Learn },
    ]
  },
];

function useScrolled(t=4){
  const [s,set]=useState(false);
  useEffect(()=>{
    const fn=()=>set(window.scrollY>t);
    window.addEventListener("scroll",fn,{passive:true});
    return ()=>window.removeEventListener("scroll",fn);
  },[t]);
  return s;
}

// ── Dropdown menu ──────────────────────────────────────────────────────────
function Dropdown({ group, onClose }) {
  return (
    <div className="sn-dropdown" style={{"--dc": group.color}}>
      <div className="sn-dropdown-inner">
        {group.items.map(item => (
          <NavLink key={item.to} to={item.to} className="sn-dropdown-item" onClick={onClose}>
            <span className="sn-di-icon" style={{color: group.color}}><item.icon/></span>
            <div className="sn-di-text">
              <span className="sn-di-label">{item.label}</span>
              <span className="sn-di-desc">{item.desc}</span>
            </div>
            <span className="sn-di-arrow">→</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export default function Navbar() {
  const scrolled      = useScrolled();
  const [open, setOpen]       = useState(null); // which dropdown
  const [search, setSearch]   = useState("");
  const [searchOpen, setSO]   = useState(false);
  const [mobileOpen, setMO]   = useState(false);
  const inputRef  = useRef(null);
  const location  = useLocation();

  const activePredSlug = location.pathname.startsWith("/predictions/")
    ? location.pathname.split("/predictions/")[1]?.split("/")[0] : null;
  const isPredictions = location.pathname.startsWith("/predictions");

  useEffect(()=>{ if(searchOpen) inputRef.current?.focus(); },[searchOpen]);
  useEffect(()=>{
    const fn=e=>{ if(e.key==="Escape"){setSO(false);setSearch("");setOpen(null);} };
    window.addEventListener("keydown",fn);
    return ()=>window.removeEventListener("keydown",fn);
  },[]);

  // Close dropdown on outside click
  const barRef = useRef(null);
  useEffect(()=>{
    const fn=e=>{ if(barRef.current && !barRef.current.contains(e.target)) setOpen(null); };
    document.addEventListener("mousedown",fn);
    return ()=>document.removeEventListener("mousedown",fn);
  },[]);

  return (
    <>
      <header ref={barRef} className={`sn-bar${scrolled?" sn-scrolled":""}`}>
        {/* ── Top accent line ── */}
        <div className="sn-topline"/>

        <div className="sn-wrap">
          {/* ── Brand ── */}
          <NavLink to="/" className="sn-brand" onClick={()=>setOpen(null)}>
            <div className="sn-logo">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="3" width="20" height="3" rx="1.5" fill="#60a5fa"/>
                <rect x="2" y="8.5" width="13" height="3" rx="1.5" fill="#60a5fa" opacity=".7"/>
                <rect x="2" y="14" width="16" height="3" rx="1.5" fill="#60a5fa" opacity=".5"/>
                <rect x="2" y="19.5" width="9" height="2" rx="1" fill="#60a5fa" opacity=".35"/>
                <rect x="19" y="14" width="3" height="7.5" rx="1.5" fill="#34d399" opacity=".9"/>
              </svg>
            </div>
            <div className="sn-brand-text">
              <span className="sn-brand-name">Statin<span className="sn-brand-accent">Site</span></span>
              <span className="sn-brand-sub">Sports Analytics</span>
            </div>
          </NavLink>

          {/* ── League strip (text pills) ── */}
          <nav className="sn-leagues" aria-label="Leagues">
            {LEAGUES.map(({ slug, short, color }) => {
              const active = activePredSlug === slug || (isPredictions && slug==="premier-league" && !activePredSlug);
              return (
                <NavLink key={slug} to={`/predictions/${slug}`}
                  className={`sn-league${active?" sn-league--active":""}`}
                  style={{"--lc":color}}
                  onClick={()=>setOpen(null)}>
                  {short}
                </NavLink>
              );
            })}
          </nav>

          <div className="sn-flex-grow"/>

          {/* ── Main nav ── */}
          <nav className="sn-nav" aria-label="Main">
            {/* Home — plain link */}
            <NavLink to="/" end
              className={({isActive})=>`sn-nav-item${isActive?" sn-nav-item--active":""}`}
              onClick={()=>setOpen(null)}>
              Home
            </NavLink>

            {NAV.map(group => {
              const isOpen  = open === group.label;
              const isActive = group.items.some(i=>
                i.to === location.pathname ||
                (i.to.startsWith("/predictions") && isPredictions)
              );
              // Single-item groups: navigate directly
              if(group.items.length === 1) {
                return (
                  <NavLink key={group.label} to={group.items[0].to}
                    className={({isActive:ia})=>`sn-nav-item${(ia||isActive)?" sn-nav-item--active":""}`}
                    style={{"--nc":group.color}}
                    onClick={()=>setOpen(null)}>
                    <span className="sn-ni-icon"><group.icon/></span>
                    {group.label}
                    {group.badge && <span className="sn-badge" style={{background:group.color+"22",color:group.color,border:`1px solid ${group.color}44`}}>{group.badge}</span>}
                  </NavLink>
                );
              }
              return (
                <div key={group.label} className="sn-nav-group">
                  <button
                    className={`sn-nav-item sn-nav-btn${(isOpen||isActive)?" sn-nav-item--active":""}`}
                    style={{"--nc":group.color}}
                    onClick={()=>setOpen(isOpen?null:group.label)}>
                    <span className="sn-ni-icon"><group.icon/></span>
                    {group.label}
                    {group.badge && <span className="sn-badge" style={{background:group.color+"22",color:group.color,border:`1px solid ${group.color}44`}}>{group.badge}</span>}
                    <span className={`sn-chev${isOpen?" sn-chev--open":""}`}><Icon.ChevDown/></span>
                  </button>
                  {isOpen && <Dropdown group={group} onClose={()=>setOpen(null)}/>}
                </div>
              );
            })}
          </nav>

          {/* ── Right cluster ── */}
          <div className="sn-right">
            {/* Live indicator */}
            <div className="sn-live">
              <span className="sn-live-dot"/>
              <span className="sn-live-label">LIVE</span>
            </div>

            {/* Search */}
            <div className="sn-search-wrap">
              {searchOpen ? (
                <div className="sn-search-field">
                  <Icon.Search/>
                  <input ref={inputRef} className="sn-search-input"
                    placeholder="Player, team, fixture…"
                    value={search} onChange={e=>setSearch(e.target.value)}/>
                  <button className="sn-search-close" onClick={()=>{setSO(false);setSearch("");}}>
                    <Icon.Close/>
                  </button>
                </div>
              ) : (
                <button className="sn-icon-btn" onClick={()=>{setSO(true);setOpen(null);}} title="Search">
                  <Icon.Search/>
                </button>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button className="sn-mobile-btn" onClick={()=>setMO(v=>!v)}>
              <Icon.Menu/>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="sn-mobile-drawer">
          <NavLink to="/" className="sn-mobile-item" onClick={()=>setMO(false)}>Home</NavLink>
          {LEAGUES.map(l=>(
            <NavLink key={l.slug} to={`/predictions/${l.slug}`} className="sn-mobile-item" onClick={()=>setMO(false)} style={{color:l.color}}>{l.label}</NavLink>
          ))}
          {NAV.flatMap(g=>g.items).map(item=>(
            <NavLink key={item.to} to={item.to} className="sn-mobile-item" onClick={()=>setMO(false)}>{item.label}</NavLink>
          ))}
        </div>
      )}
    </>
  );
}