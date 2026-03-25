// Navbar.jsx — StatinSite · Neobrutalist Edition v2
// Matches concept1_neobrutalist.html:
//   Black bar · 4px yellow bottom border · Bebas Neue brand
//   Fill-from-bottom nav hovers · Red LIVE pill · Yellow CTA w/ offset shadow

import { useState, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

const Y = "#e8ff47";
const K = "#0a0a0a";
const R = "#ff2744";

const Icons = {
  Home:    () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M1 6.5L7 1.5l6 5V13H9v-3H5v3H1V6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>,
  Live:    () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.5" fill="currentColor"/><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.2" opacity="0.45"/></svg>,
  Predict: () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M1.5 11l3-5 2.5 2 2.5-4L12 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Fantasy: () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.5 3.2 3.5.5-2.5 2.5.6 3.5L7 9.2 3.9 10.7l.6-3.5L2 4.7l3.5-.5L7 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>,
  Players: () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M2 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  News:    () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M4 5.5h6M4 8h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  Learn:   () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/><circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.4"/></svg>,
  Games:   () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="12" height="7" rx="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 7.5H7M6 6.5v2M9.5 7h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
  Search:  () => <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Close:   () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Menu:    () => <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
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

function useScrollHide(threshold=8) {
  const [hidden,setHidden]=useState(false); const lastY=useRef(0);
  useEffect(()=>{
    const fn=()=>{const y=window.scrollY;if(y<threshold){setHidden(false);lastY.current=y;return;}setHidden(y>lastY.current);lastY.current=y;};
    window.addEventListener("scroll",fn,{passive:true}); return()=>window.removeEventListener("scroll",fn);
  },[threshold]); return hidden;
}
function useClickOutside(ref,cb){useEffect(()=>{const fn=e=>{if(ref.current&&!ref.current.contains(e.target))cb();};document.addEventListener("mousedown",fn);return()=>document.removeEventListener("mousedown",fn);},[ref,cb]);}
function useLockScroll(on){useEffect(()=>{document.body.style.overflow=on?"hidden":"";return()=>{document.body.style.overflow="";};},[on]);}

function BottomTabBar() {
  const location=useLocation();
  return (
    <nav className="sn-bottom-tabs" aria-label="Mobile navigation">
      {BOTTOM_TABS.map(item=>{
        const active=item.end?location.pathname===item.to:location.pathname.startsWith(item.to);
        return (
          <NavLink key={item.to} to={item.to} end={item.end}
            className={"nb-btab"+(active?" nb-btab--active":"")}
            style={{"--tc":active?Y:"rgba(232,255,71,0.28)"}}>
            <div className={"nb-btab-icon"+(item.isLive?" nb-btab-icon--live":"")}>
              <item.Icon/>
              {item.isLive&&<span className="nb-live-dot-bt"/>}
            </div>
            <span className="nb-btab-lbl">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function Navbar() {
  const location=useLocation(); const navigate=useNavigate();
  const [mobileOpen,setMobileOpen]=useState(false);
  const [searchOpen,setSearchOpen]=useState(false);
  const [searchVal,setSearchVal]=useState("");
  const [fplOpen,setFplOpen]=useState(false);
  const searchRef=useRef(null); const inputRef=useRef(null); const fplRef=useRef(null);
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
        @keyframes nbLivePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.55)}}
        @keyframes nbLiveRing{0%{transform:scale(1);opacity:.6}80%{transform:scale(2.8);opacity:0}100%{opacity:0}}
        @keyframes nbFadeDown{from{opacity:0;transform:translateY(-6px) scale(.97)}to{opacity:1;transform:none}}
        @keyframes nbDrawerIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
        @keyframes nbLogoWiggle{0%,100%{transform:rotate(0)}20%{transform:rotate(-4deg)}70%{transform:rotate(4deg)}}

        .nb-bar{position:fixed;top:0;left:0;right:0;height:56px;z-index:200;background:${K};border-bottom:4px solid ${Y};transition:transform .26s cubic-bezier(.4,0,.2,1);overflow:visible;}
        .nb-bar--hidden{transform:translateY(-100%);}
        .nb-wrap{display:flex;align-items:stretch;height:100%;max-width:1520px;margin:0 auto;overflow:visible;}
        .nb-brand{display:flex;align-items:center;gap:10px;padding:0 22px;text-decoration:none;flex-shrink:0;border-right:3px solid ${Y};height:100%;}
        .nb-brand-sq{width:30px;height:30px;background:${Y};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:${K};font-family:'Space Grotesk',sans-serif;flex-shrink:0;animation:nbLogoWiggle 3.5s ease-in-out infinite;}
        .nb-brand-name{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:3px;color:${Y};line-height:1;white-space:nowrap;}
        .nb-brand-tag{font-family:'DM Mono',monospace;font-size:7px;letter-spacing:.18em;color:rgba(232,255,71,.35);text-transform:uppercase;margin-top:2px;}
        .nb-nav{display:flex;align-items:stretch;flex:1;overflow:visible;}
        .nb-pill{position:relative;display:inline-flex;align-items:center;gap:5px;padding:0 15px;height:100%;border:none;border-right:1px solid rgba(232,255,71,.08);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:rgba(232,255,71,.3);text-decoration:none;background:transparent;cursor:pointer;font-family:'Space Grotesk',sans-serif;overflow:hidden;transition:color .15s;flex-shrink:0;}
        .nb-pill::before{content:'';position:absolute;inset:0;background:${Y};transform:scaleY(0);transform-origin:bottom;transition:transform .18s cubic-bezier(.22,1,.36,1);z-index:0;}
        .nb-pill>*{position:relative;z-index:1;}
        .nb-pill:hover::before{transform:scaleY(1);}
        .nb-pill:hover{color:${K};}
        .nb-pill--active{color:${Y};border-bottom:3px solid ${Y};}
        .nb-pill--active:hover{color:${K};}
        .nb-pill--secondary{color:rgba(232,255,71,.18);font-size:10.5px;}
        .nb-pill--live{color:rgba(255,39,68,.55);gap:7px;}
        .nb-pill--live::before{background:${R};}
        .nb-pill--live:hover{color:#fff;}
        .nb-pill--live.nb-pill--active{color:${R};border-bottom-color:${R};}
        .nb-live-dot{position:relative;width:7px;height:7px;flex-shrink:0;display:inline-block;}
        .nb-live-dot::before{content:'';position:absolute;inset:0;border-radius:50%;background:${R};animation:nbLivePulse 1.6s ease-in-out infinite;}
        .nb-pill--active .nb-live-dot::after{content:'';position:absolute;inset:0;border-radius:50%;background:rgba(255,39,68,.45);animation:nbLiveRing 1.8s ease-out infinite;}
        .nb-fpl-tag{font-size:7px;font-weight:900;letter-spacing:.1em;padding:1px 5px;background:rgba(232,255,71,.1);border:1px solid rgba(232,255,71,.25);color:${Y};flex-shrink:0;position:relative;z-index:1;transition:background .15s,color .15s;}
        .nb-pill:hover .nb-fpl-tag{background:rgba(10,10,10,.15);border-color:rgba(10,10,10,.25);color:${K};}
        .nb-chevron{display:inline-flex;opacity:.4;margin-left:1px;transition:transform .15s;}
        .nb-chevron--open{transform:rotate(180deg);opacity:.7;}
        .nb-fpl-dd{position:absolute;top:calc(100% + 4px);left:50%;transform:translateX(-50%);min-width:260px;z-index:300;background:${K};border:3px solid ${Y};box-shadow:6px 6px 0 ${Y};padding:6px;animation:nbFadeDown .16s cubic-bezier(.22,1,.36,1) both;}
        .nb-fpl-sec{font-size:7.5px;font-weight:900;letter-spacing:.18em;color:rgba(232,255,71,.3);text-transform:uppercase;padding:6px 10px 7px;border-bottom:1px solid rgba(232,255,71,.08);margin-bottom:3px;font-family:'DM Mono',monospace;}
        .nb-fpl-item{display:block;padding:8px 10px;text-decoration:none;position:relative;overflow:hidden;}
        .nb-fpl-item::before{content:'';position:absolute;inset:0;background:${Y};transform:scaleY(0);transform-origin:bottom;transition:transform .15s;z-index:0;}
        .nb-fpl-item>*{position:relative;z-index:1;}
        .nb-fpl-item:hover::before{transform:scaleY(1);}
        .nb-fpl-item-name{font-size:12px;font-weight:700;color:rgba(232,255,71,.7);margin-bottom:2px;font-family:'Space Grotesk',sans-serif;transition:color .12s;}
        .nb-fpl-item:hover .nb-fpl-item-name{color:${K};}
        .nb-fpl-item-desc{font-size:9px;color:rgba(232,255,71,.3);font-family:'DM Mono',monospace;transition:color .12s;}
        .nb-fpl-item:hover .nb-fpl-item-desc{color:rgba(10,10,10,.55);}
        .nb-fpl-item--active .nb-fpl-item-name{color:${Y};}
        .nb-fpl-div{height:1px;background:rgba(232,255,71,.06);margin:4px 0;}
        .nb-controls{display:flex;align-items:center;gap:4px;padding:0 14px;flex-shrink:0;}
        .nb-search-wrap{display:flex;align-items:center;gap:4px;}
        .nb-icon-btn{display:flex;align-items:center;justify-content:center;width:34px;height:34px;border:2px solid rgba(232,255,71,.2);background:transparent;color:rgba(232,255,71,.4);cursor:pointer;transition:all .13s;}
        .nb-icon-btn:hover{color:${K};background:${Y};border-color:${Y};}
        .nb-search-input{height:32px;padding:0 12px;border:2px solid ${Y};background:${K};color:${Y};font-size:12px;font-family:'DM Mono',monospace;width:180px;outline:none;transition:width .2s,box-shadow .15s;}
        .nb-search-input::placeholder{color:rgba(232,255,71,.3);}
        .nb-search-input:focus{width:220px;box-shadow:3px 3px 0 ${Y};}
        .nb-ham{display:none;}
        .nb-pill-live{display:flex;align-items:center;gap:6px;background:${R};padding:5px 12px;font-family:'DM Mono',monospace;font-size:8px;letter-spacing:.16em;color:#fff;flex-shrink:0;}
        .nb-pill-live .d{width:5px;height:5px;border-radius:50%;background:#fff;animation:nbLivePulse 1s step-start infinite;}
        .nb-cta{background:${Y};color:${K};border:3px solid ${K};padding:8px 18px;font-family:'Space Grotesk',sans-serif;font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;box-shadow:3px 3px 0 ${K};transition:all .12s;flex-shrink:0;}
        .nb-cta:hover{transform:translate(-2px,-2px);box-shadow:5px 5px 0 ${K};}
        .nb-drawer{position:fixed;top:60px;left:0;bottom:0;width:min(280px,82vw);z-index:203;background:${K};border-right:4px solid ${Y};overflow-y:auto;padding:10px 0 32px;animation:nbDrawerIn .2s cubic-bezier(.22,1,.36,1) both;}
        .nb-drawer-sec{font-size:7.5px;font-weight:900;letter-spacing:.2em;color:rgba(232,255,71,.25);text-transform:uppercase;padding:14px 14px 6px;font-family:'DM Mono',monospace;}
        .nb-drawer-item{display:flex;align-items:center;gap:10px;padding:11px 14px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(232,255,71,.35);text-decoration:none;border-bottom:1px solid rgba(232,255,71,.06);font-family:'Space Grotesk',sans-serif;position:relative;overflow:hidden;transition:color .13s;}
        .nb-drawer-item::before{content:'';position:absolute;inset:0;background:${Y};transform:scaleY(0);transform-origin:bottom;transition:transform .15s;z-index:0;}
        .nb-drawer-item>*,.nb-drawer-item>svg{position:relative;z-index:1;}
        .nb-drawer-item:hover::before{transform:scaleY(1);}
        .nb-drawer-item:hover{color:${K};}
        .nb-drawer-item--active{color:${Y};border-left:3px solid ${Y};padding-left:11px;}
        .nb-drawer-item--active:hover{color:${K};}
        .nb-drawer-item--live{color:rgba(255,39,68,.5);}
        .nb-drawer-item--live.nb-drawer-item--active{color:${R};border-left-color:${R};}
        .nb-backdrop{position:fixed;inset:0;z-index:201;background:rgba(0,0,0,.7);}
        .sn-bottom-tabs{display:none;position:fixed;bottom:0;left:0;right:0;z-index:999;background:${K};border-top:3px solid ${Y};padding:4px 0 max(6px,env(safe-area-inset-bottom));justify-content:space-around;}
        .nb-btab{display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 6px;flex:1;min-width:44px;color:var(--tc,rgba(232,255,71,.28));text-decoration:none;transition:color .13s;}
        .nb-btab-icon{width:28px;height:28px;display:flex;align-items:center;justify-content:center;position:relative;}
        .nb-btab--active .nb-btab-icon{background:rgba(232,255,71,.1);}
        .nb-live-dot-bt{position:absolute;top:3px;right:3px;width:5px;height:5px;border-radius:50%;background:${R};animation:nbLivePulse 1.6s ease-in-out infinite;}
        .nb-btab-lbl{font-size:8px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-family:'DM Mono',monospace;}
        @media(max-width:768px){.nb-nav,.nb-search-wrap{display:none!important;}.nb-ham{display:flex!important;}.nb-brand-tag{display:none;}.sn-bottom-tabs{display:flex!important;}.sn-page-wrap{padding-bottom:72px!important;}}
        @media(max-width:1040px){.nb-pill--secondary{display:none;}}
        @media(max-width:1240px){.nb-pill{padding:0 11px;font-size:10.5px;}}
      `}</style>

      <header className={`nb-bar${hidden?" nb-bar--hidden":""}`} role="banner">
        <div className="nb-wrap">
          <NavLink to="/" className="nb-brand" aria-label="StatinSite home">
            <div className="nb-brand-sq">S</div>
            <div><div className="nb-brand-name">StatinSite</div><div className="nb-brand-tag">Football Intelligence</div></div>
          </NavLink>

          <nav className="nb-nav" aria-label="Main navigation">
            {NAV_ITEMS.map(item=>{
              const active=isActive(item);
              if(item.fplGroup) return (
                <div key={item.to} style={{position:"relative",display:"flex",alignItems:"stretch"}} ref={fplRef}>
                  <button className={`nb-pill${active?" nb-pill--active":""}${item.secondary?" nb-pill--secondary":""}`} onClick={()=>setFplOpen(v=>!v)} aria-expanded={fplOpen}>
                    <item.Icon/><span>{item.label}</span>
                    <span className="nb-fpl-tag">FPL</span>
                    <span className={`nb-chevron${fplOpen?" nb-chevron--open":""}`}><svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></span>
                  </button>
                  {fplOpen&&(
                    <div className="nb-fpl-dd" role="menu">
                      <div className="nb-fpl-sec">Squad & Selection</div>
                      {FPL_ITEMS.slice(0,4).map(sub=>(
                        <NavLink key={sub.to} to={sub.to} role="menuitem" className={`nb-fpl-item${location.pathname.startsWith(sub.to)?" nb-fpl-item--active":""}`}>
                          <div className="nb-fpl-item-name">{sub.label}</div>
                          <div className="nb-fpl-item-desc">{sub.desc}</div>
                        </NavLink>
                      ))}
                      <div className="nb-fpl-div"/>
                      <div className="nb-fpl-sec" style={{paddingTop:8}}>Analysis & Planning</div>
                      {FPL_ITEMS.slice(4).map(sub=>(
                        <NavLink key={sub.to} to={sub.to} role="menuitem" className={`nb-fpl-item${location.pathname.startsWith(sub.to)?" nb-fpl-item--active":""}`}>
                          <div className="nb-fpl-item-name">{sub.label}</div>
                          <div className="nb-fpl-item-desc">{sub.desc}</div>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
              if(item.isLive) return (
                <NavLink key={item.to} to={item.to} className={`nb-pill nb-pill--live${active?" nb-pill--active":""}`}>
                  <span className="nb-live-dot" aria-hidden="true"/><span>{item.label}</span>
                </NavLink>
              );
              return (
                <NavLink key={item.to} to={item.to} end={item.end} aria-current={active?"page":undefined}
                  className={`nb-pill${active?" nb-pill--active":""}${item.secondary?" nb-pill--secondary":""}`}>
                  <item.Icon/><span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="nb-controls">
            <div className="nb-search-wrap" ref={searchRef}>
              {searchOpen?(
                <><input ref={inputRef} className="nb-search-input" value={searchVal} onChange={e=>setSearchVal(e.target.value)} placeholder="Search players, teams…" onKeyDown={handleSearch} aria-label="Search"/>
                <button className="nb-icon-btn" onClick={()=>{setSearchOpen(false);setSearchVal("");}}><Icons.Close/></button></>
              ):(
                <button className="nb-icon-btn" onClick={()=>setSearchOpen(true)} aria-label="Search"><Icons.Search/></button>
              )}
            </div>
            <div className="nb-pill-live"><span className="d"/><span>LIVE</span></div>
            <button className="nb-cta" onClick={()=>navigate("/live")}>Live Scores →</button>
            <button className="nb-icon-btn nb-ham" onClick={()=>setMobileOpen(v=>!v)} aria-label={mobileOpen?"Close menu":"Open menu"}>
              {mobileOpen?<Icons.Close/>:<Icons.Menu/>}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen&&(
        <nav className="nb-drawer" role="dialog" aria-label="Mobile navigation">
          <div className="nb-drawer-sec">Navigation</div>
          {NAV_ITEMS.map(item=>{
            const active=isActive(item);
            return (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={`nb-drawer-item${active?" nb-drawer-item--active":""}${item.isLive?" nb-drawer-item--live":""}`}>
                {item.isLive?<span className="nb-live-dot" aria-hidden="true"/>:<item.Icon/>}
                <span>{item.label}</span>
                {item.fplGroup&&<span className="nb-fpl-tag" style={{marginLeft:"auto"}}>FPL</span>}
              </NavLink>
            );
          })}
        </nav>
      )}
      {mobileOpen&&<div className="nb-backdrop" onClick={()=>setMobileOpen(false)}/>}
      <BottomTabBar/>
    </>
  );
}