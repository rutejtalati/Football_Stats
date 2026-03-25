// Navbar.jsx — Surgical Precision Theme
// #000 black · #00fff0 cyan · 1px borders · DM Mono labels
// Nav underlines instead of fill-from-bottom
// Corner brackets on brand, search input glows cyan on focus

import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

const C  = "#00fff0";
const CR = "#ff2744";
const K  = "#000";

const Icons = {
  Home:    ()=><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M1 6.5L7 1.5l6 5V13H9v-3H5v3H1V6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>,
  Live:    ()=><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.5" fill="currentColor"/><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1" opacity=".4"/></svg>,
  Predict: ()=><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M1.5 11l3-5 2.5 2 2.5-4L12 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Fantasy: ()=><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.5 3.2 3.5.5-2.5 2.5.6 3.5L7 9.2 3.9 10.7l.6-3.5L2 4.7l3.5-.5L7 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>,
  Players: ()=><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M2 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  News:    ()=><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4 5.5h6M4 8h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  Learn:   ()=><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.3"/><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".4"/></svg>,
  Games:   ()=><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="12" height="7" rx="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 7.5H7M6 6.5v2M9.5 7h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  Search:  ()=><svg width="14" height="14" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/><path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  Close:   ()=><svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  Menu:    ()=><svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
};

const NAV_ITEMS = [
  { to:"/",                           label:"Home",         Icon:Icons.Home,    end:true },
  { to:"/live",                       label:"Live",         Icon:Icons.Live,    isLive:true },
  { to:"/predictions/premier-league", label:"Predictions",  Icon:Icons.Predict  },
  { to:"/best-team",                  label:"Fantasy",      Icon:Icons.Fantasy, fplGroup:true },
  { to:"/player",                     label:"Players",      Icon:Icons.Players  },
  { to:"/news",                       label:"News",         Icon:Icons.News     },
  { to:"/learn",                      label:"How It Works", Icon:Icons.Learn,   secondary:true },
  { to:"/games",                      label:"Games",        Icon:Icons.Games,   secondary:true },
];
const FPL_ITEMS = [
  { to:"/best-team",          label:"Best XI",            desc:"Optimal FPL starting 11" },
  { to:"/squad-builder",      label:"Squad Builder",      desc:"Build your 15-man squad" },
  { to:"/gameweek-insights",  label:"GW Insights",        desc:"Gameweek stats & analysis" },
  { to:"/fpl-table",          label:"FPL Table",          desc:"Live FPL leaderboard" },
  { to:"/captaincy",          label:"Captaincy",          desc:"Captain picks & ownership" },
  { to:"/fixture-difficulty", label:"Fixture Difficulty", desc:"FDR heatmap" },
  { to:"/transfer-planner",   label:"Transfer Planner",   desc:"Plan transfers & free hits" },
  { to:"/differentials",      label:"Differentials",      desc:"Low-owned high-ceiling picks" },
];
const FPL_PATHS = ["/best-team","/squad-builder","/gameweek-insights","/fpl-table","/captaincy","/fixture-difficulty","/transfer-planner","/differentials"];
const BOTTOM_TABS = [
  { to:"/",                           label:"Home",    Icon:Icons.Home,    end:true },
  { to:"/live",                       label:"Live",    Icon:Icons.Live,    isLive:true },
  { to:"/predictions/premier-league", label:"Predict", Icon:Icons.Predict  },
  { to:"/best-team",                  label:"Fantasy", Icon:Icons.Fantasy  },
  { to:"/player",                     label:"Players", Icon:Icons.Players  },
];

function useScrollHide(t=8){const[h,s]=useState(false);const ly=useRef(0);useEffect(()=>{const f=()=>{const y=window.scrollY;if(y<t){s(false);ly.current=y;return;}s(y>ly.current);ly.current=y;};window.addEventListener("scroll",f,{passive:true});return()=>window.removeEventListener("scroll",f);},[t]);return h;}
function useClickOutside(ref,cb){useEffect(()=>{const f=e=>{if(ref.current&&!ref.current.contains(e.target))cb();};document.addEventListener("mousedown",f);return()=>document.removeEventListener("mousedown",f);},[ref,cb]);}
function useLockScroll(on){useEffect(()=>{document.body.style.overflow=on?"hidden":"";return()=>{document.body.style.overflow="";};},[on]);}

function BottomTabBar() {
  const loc = useLocation();
  return (
    <nav style={{display:"none",position:"fixed",bottom:0,left:0,right:0,zIndex:999,background:K,borderTop:`1px solid ${C}`,padding:"4px 0",justifyContent:"space-around"}} className="sn-bottom-tabs">
      {BOTTOM_TABS.map(item=>{
        const active=item.end?loc.pathname===item.to:loc.pathname.startsWith(item.to);
        return (
          <NavLink key={item.to} to={item.to} end={item.end} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"4px 6px",flex:1,color:active?C:"rgba(0,255,240,.2)",textDecoration:"none",transition:"color .13s"}}>
            <div style={{width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",borderBottom:active?`1px solid ${item.isLive?CR:C}`:"1px solid transparent"}}>
              <item.Icon/>
              {item.isLive&&<span style={{position:"absolute",top:3,right:3,width:4,height:4,borderRadius:"50%",background:CR,animation:"spPulse 1.6s ease infinite"}}/>}
            </div>
            <span style={{fontSize:7.5,letterSpacing:".1em",textTransform:"uppercase",fontFamily:"'DM Mono',monospace"}}>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function Navbar() {
  const location=useLocation(), navigate=useNavigate();
  const [mobileOpen,setMobileOpen]=useState(false);
  const [searchOpen,setSearchOpen]=useState(false);
  const [searchVal,setSearchVal]=useState("");
  const [fplOpen,setFplOpen]=useState(false);
  const searchRef=useRef(null), inputRef=useRef(null), fplRef=useRef(null);
  const hidden=useScrollHide();
  const fplActive=FPL_PATHS.some(p=>location.pathname.startsWith(p));
  useClickOutside(searchRef,()=>{setSearchOpen(false);setSearchVal("");});
  useClickOutside(fplRef,()=>setFplOpen(false));
  useLockScroll(mobileOpen);
  useEffect(()=>{if(searchOpen)setTimeout(()=>inputRef.current?.focus(),60);},[searchOpen]);
  useEffect(()=>{setMobileOpen(false);setFplOpen(false);},[location.pathname]);
  const handleSearch=e=>{if(e.key==="Enter"&&searchVal.trim()){navigate(`/player?search=${encodeURIComponent(searchVal.trim())}`);setSearchOpen(false);setSearchVal("");}if(e.key==="Escape"){setSearchOpen(false);setSearchVal("");}};
  const isActive=item=>{if(item.fplGroup)return fplActive;if(item.end)return location.pathname===item.to;return location.pathname.startsWith(item.to);};

  return (
    <>
      <style>{`
        @keyframes spPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.6)}}
        @keyframes spFadeDown{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:none}}
        @keyframes spDrawerIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
        @keyframes spBlink{50%{opacity:0}}

        /* Bar */
        .sp-bar{position:fixed;top:0;left:0;right:0;height:56px;z-index:200;background:#000;border-bottom:1px solid #00fff0;transition:transform .24s ease;overflow:visible;}
        .sp-bar--hidden{transform:translateY(-100%)}
        .sp-wrap{display:flex;align-items:stretch;height:100%;max-width:1520px;margin:0 auto;padding:0 16px;overflow:visible}

        /* Brand */
        .sp-brand{display:flex;align-items:center;gap:10px;padding:0 18px;text-decoration:none;flex-shrink:0;border-right:1px solid rgba(0,255,240,.12);height:100%;position:relative}
        .sp-brand::before{content:'';position:absolute;top:8px;left:8px;width:8px;height:8px;border-top:1px solid #00fff0;border-left:1px solid #00fff0;pointer-events:none}
        .sp-brand-sq{width:26px;height:26px;border:1px solid #00fff0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;color:#00fff0;font-family:'DM Mono',monospace;flex-shrink:0}
        .sp-brand-name{font-family:'Bebas Neue',sans-serif;font-size:19px;letter-spacing:4px;color:#00fff0;line-height:1;white-space:nowrap}
        .sp-brand-tag{font-family:'DM Mono',monospace;font-size:6.5px;letter-spacing:.2em;color:rgba(0,255,240,.3);text-transform:uppercase;margin-top:2px}

        /* Nav */
        .sp-nav{display:flex;align-items:stretch;flex:1;overflow:visible}
        .sp-pill{position:relative;display:inline-flex;align-items:center;gap:5px;padding:0 14px;height:100%;border:none;border-right:1px solid rgba(0,255,240,.06);font-size:10px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:rgba(0,255,240,.22);text-decoration:none;background:transparent;cursor:pointer;font-family:'DM Mono',monospace;transition:color .13s;flex-shrink:0}
        .sp-pill:hover{color:#00fff0}
        .sp-pill--active{color:#00fff0;border-bottom:1px solid #00fff0}
        .sp-pill--secondary{color:rgba(0,255,240,.12);font-size:9.5px}
        .sp-pill--live{color:rgba(255,39,68,.4);gap:7px}
        .sp-pill--live:hover{color:#ff2744}
        .sp-pill--live.sp-pill--active{color:#ff2744;border-bottom-color:#ff2744}

        /* Live dot */
        .sp-live-dot{position:relative;width:6px;height:6px;flex-shrink:0;display:inline-block}
        .sp-live-dot::before{content:'';position:absolute;inset:0;border-radius:50%;background:#ff2744;animation:spPulse 1.6s ease-in-out infinite}

        /* FPL tag */
        .sp-fpl-tag{font-size:6.5px;font-weight:500;letter-spacing:.1em;padding:1px 5px;border:1px solid rgba(0,255,240,.2);color:rgba(0,255,240,.5);flex-shrink:0}
        .sp-chevron{display:inline-flex;opacity:.3;transition:transform .13s}
        .sp-chevron--open{transform:rotate(180deg);opacity:.6}

        /* FPL Dropdown */
        .sp-fpl-dd{position:absolute;top:calc(100% + 2px);left:50%;transform:translateX(-50%);min-width:250px;z-index:300;background:#000;border:1px solid #00fff0;padding:6px;animation:spFadeDown .16s ease both;box-shadow:0 8px 32px rgba(0,255,240,.06)}
        .sp-fpl-sec{font-size:7px;font-weight:500;letter-spacing:.2em;color:rgba(0,255,240,.28);text-transform:uppercase;padding:6px 10px 7px;border-bottom:1px solid rgba(0,255,240,.08);margin-bottom:3px;font-family:'DM Mono',monospace}
        .sp-fpl-item{display:block;padding:7px 10px;text-decoration:none;transition:background .1s,color .1s}
        .sp-fpl-item:hover{background:rgba(0,255,240,.06)}
        .sp-fpl-item-name{font-size:11px;font-weight:500;color:rgba(0,255,240,.6);margin-bottom:2px;font-family:'Space Grotesk',sans-serif;transition:color .1s}
        .sp-fpl-item:hover .sp-fpl-item-name{color:#00fff0}
        .sp-fpl-item-desc{font-size:8.5px;color:rgba(0,255,240,.2);font-family:'DM Mono',monospace}
        .sp-fpl-item--active .sp-fpl-item-name{color:#00fff0}
        .sp-fpl-div{height:1px;background:rgba(0,255,240,.06);margin:4px 0}

        /* Controls */
        .sp-controls{display:flex;align-items:center;gap:6px;padding:0 12px;flex-shrink:0}
        .sp-icon-btn{display:flex;align-items:center;justify-content:center;width:30px;height:30px;border:1px solid rgba(0,255,240,.15);background:transparent;color:rgba(0,255,240,.3);cursor:pointer;transition:all .12s}
        .sp-icon-btn:hover{color:#00fff0;border-color:#00fff0;background:rgba(0,255,240,.04)}
        .sp-search-input{height:28px;padding:0 10px;border:1px solid #00fff0;background:#000;color:#00fff0;font-size:11px;font-family:'DM Mono',monospace;width:160px;outline:none;transition:width .18s;letter-spacing:.04em}
        .sp-search-input::placeholder{color:rgba(0,255,240,.2)}
        .sp-search-input:focus{width:200px}
        .sp-ham{display:none}

        /* Live badge */
        .sp-live-badge{display:flex;align-items:center;gap:5px;border:1px solid rgba(255,39,68,.25);padding:4px 10px;font-family:'DM Mono',monospace;font-size:7.5px;letter-spacing:.16em;color:rgba(255,39,68,.6)}
        .sp-live-badge .d{width:4px;height:4px;border-radius:50%;background:#ff2744;animation:spBlink 1s step-start infinite}

        /* Enter CTA */
        .sp-cta{background:#00fff0;color:#000;border:none;padding:7px 16px;font-family:'DM Mono',monospace;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;font-weight:500;transition:background .1s;flex-shrink:0}
        .sp-cta:hover{background:#fff}

        /* Drawer */
        .sp-drawer{position:fixed;top:57px;left:0;bottom:0;width:min(260px,80vw);z-index:203;background:#000;border-right:1px solid #00fff0;overflow-y:auto;padding:10px 0 32px;animation:spDrawerIn .18s ease both}
        .sp-drawer-sec{font-size:7px;font-weight:500;letter-spacing:.22em;color:rgba(0,255,240,.22);text-transform:uppercase;padding:12px 14px 5px;font-family:'DM Mono',monospace}
        .sp-drawer-item{display:flex;align-items:center;gap:9px;padding:10px 14px;font-size:11px;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:rgba(0,255,240,.25);text-decoration:none;border-bottom:1px solid rgba(0,255,240,.04);font-family:'DM Mono',monospace;transition:color .12s,background .12s}
        .sp-drawer-item:hover{color:#00fff0;background:rgba(0,255,240,.03)}
        .sp-drawer-item--active{color:#00fff0;border-left:1px solid #00fff0;padding-left:13px}
        .sp-drawer-item--live{color:rgba(255,39,68,.35)}
        .sp-drawer-item--live.sp-drawer-item--active{color:#ff2744;border-left-color:#ff2744}
        .sp-backdrop{position:fixed;inset:0;z-index:201;background:rgba(0,0,0,.8)}

        .sn-bottom-tabs{display:none;position:fixed;bottom:0;left:0;right:0;z-index:999;background:#000;border-top:1px solid #00fff0;padding:4px 0 max(6px,env(safe-area-inset-bottom));justify-content:space-around}
        @media(max-width:768px){.sp-nav,.sp-search-wrap{display:none!important}.sp-ham{display:flex!important}.sp-brand-tag{display:none}.sn-bottom-tabs{display:flex!important}.sn-page-wrap{padding-bottom:72px!important}}
        @media(max-width:1040px){.sp-pill--secondary{display:none}}
        @media(max-width:1240px){.sp-pill{padding:0 10px;font-size:9.5px}}
      `}</style>

      <header className={`sp-bar${hidden?" sp-bar--hidden":""}`} role="banner">
        <div className="sp-wrap">
          <NavLink to="/" className="sp-brand" aria-label="StatinSite home">
            <div className="sp-brand-sq">S</div>
            <div><div className="sp-brand-name">StatinSite</div><div className="sp-brand-tag">Football Intelligence</div></div>
          </NavLink>

          <nav className="sp-nav sp-search-wrap" aria-label="Main navigation" style={{display:"contents"}}>
            <nav className="sp-nav">
              {NAV_ITEMS.map(item=>{
                const active=isActive(item);
                if(item.fplGroup) return (
                  <div key={item.to} style={{position:"relative",display:"flex",alignItems:"stretch"}} ref={fplRef}>
                    <button className={`sp-pill${active?" sp-pill--active":""}${item.secondary?" sp-pill--secondary":""}`} onClick={()=>setFplOpen(v=>!v)} aria-expanded={fplOpen}>
                      <item.Icon/><span>{item.label}</span>
                      <span className="sp-fpl-tag">FPL</span>
                      <span className={`sp-chevron${fplOpen?" sp-chevron--open":""}`}><svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></span>
                    </button>
                    {fplOpen&&(
                      <div className="sp-fpl-dd" role="menu">
                        <div className="sp-fpl-sec">Squad & Selection</div>
                        {FPL_ITEMS.slice(0,4).map(sub=>(
                          <NavLink key={sub.to} to={sub.to} role="menuitem" className={`sp-fpl-item${location.pathname.startsWith(sub.to)?" sp-fpl-item--active":""}`}>
                            <div className="sp-fpl-item-name">{sub.label}</div>
                            <div className="sp-fpl-item-desc">{sub.desc}</div>
                          </NavLink>
                        ))}
                        <div className="sp-fpl-div"/>
                        <div className="sp-fpl-sec" style={{paddingTop:8}}>Analysis & Planning</div>
                        {FPL_ITEMS.slice(4).map(sub=>(
                          <NavLink key={sub.to} to={sub.to} role="menuitem" className={`sp-fpl-item${location.pathname.startsWith(sub.to)?" sp-fpl-item--active":""}`}>
                            <div className="sp-fpl-item-name">{sub.label}</div>
                            <div className="sp-fpl-item-desc">{sub.desc}</div>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
                if(item.isLive) return (
                  <NavLink key={item.to} to={item.to} className={`sp-pill sp-pill--live${active?" sp-pill--active":""}`}>
                    <span className="sp-live-dot"/><span>{item.label}</span>
                  </NavLink>
                );
                return (
                  <NavLink key={item.to} to={item.to} end={item.end} aria-current={active?"page":undefined}
                    className={`sp-pill${active?" sp-pill--active":""}${item.secondary?" sp-pill--secondary":""}`}>
                    <item.Icon/><span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </nav>

          <div className="sp-controls">
            <div ref={searchRef} style={{display:"flex",alignItems:"center",gap:4}} className="sp-search-wrap">
              {searchOpen?(
                <><input ref={inputRef} className="sp-search-input" value={searchVal} onChange={e=>setSearchVal(e.target.value)} placeholder="Search players, teams…" onKeyDown={handleSearch} aria-label="Search"/>
                <button className="sp-icon-btn" onClick={()=>{setSearchOpen(false);setSearchVal("");}}><Icons.Close/></button></>
              ):(
                <button className="sp-icon-btn" onClick={()=>setSearchOpen(true)} aria-label="Search"><Icons.Search/></button>
              )}
            </div>
            <div className="sp-live-badge"><span className="d"/><span>LIVE</span></div>
            <button className="sp-cta" onClick={()=>navigate("/live")}>ENTER →</button>
            <button className="sp-icon-btn sp-ham" onClick={()=>setMobileOpen(v=>!v)} aria-label={mobileOpen?"Close":"Menu"}>
              {mobileOpen?<Icons.Close/>:<Icons.Menu/>}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen&&(
        <nav className="sp-drawer" role="dialog" aria-label="Mobile navigation">
          <div className="sp-drawer-sec">Navigation</div>
          {NAV_ITEMS.map(item=>{
            const active=isActive(item);
            return (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={`sp-drawer-item${active?" sp-drawer-item--active":""}${item.isLive?" sp-drawer-item--live":""}`}>
                {item.isLive?<span className="sp-live-dot"/>:<item.Icon/>}
                <span>{item.label}</span>
                {item.fplGroup&&<span className="sp-fpl-tag" style={{marginLeft:"auto"}}>FPL</span>}
              </NavLink>
            );
          })}
        </nav>
      )}
      {mobileOpen&&<div className="sp-backdrop" onClick={()=>setMobileOpen(false)}/>}
      <BottomTabBar/>
    </>
  );
}