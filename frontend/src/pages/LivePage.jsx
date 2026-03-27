// ═══════════════════════════════════════════════════════════════════════════
// StatinSite — Live Centre  ·  Command Centre redesign
// ═══════════════════════════════════════════════════════════════════════════
//
// Component tree:
//   LivePage
//     ├─ HeroHeader       title · counters · league tabs
//     ├─ FeaturedRail     3 large hero cards (live-first priority)
//     └─ main grid
//          ├─ left column
//          │    ├─ Section "Live Now"   → LiveCard × n
//          │    ├─ Section "Today"      → mixed cards
//          │    └─ Section per day      → ScheduledCard / FullTimeCard (collapsible)
//          └─ Sidebar (sticky)
//               ├─ NextKickoffWidget   countdown clock
//               ├─ LiveTrackerWidget   compact live scores
//               └─ LeagueSummaryWidget per-league counts
//
// Backend: unchanged — GET /api/matches/upcoming
// Optional Pro fields (all gracefully absent):
//   p_home_win · p_draw · p_away_win · p_btts · p_over25 · insight · latest_event
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
function useIsMobile(bp=768){const[m,setM]=useState(()=>typeof window!=="undefined"?window.innerWidth<bp:false);useEffect(()=>{const h=()=>setM(window.innerWidth<bp);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[bp]);return m;}

import { API_BASE as BACKEND } from "@/api/api";

// ─── Shared competition registry (mirrors PredictionsPage) ──────────────────

const COMP_NAV_GROUPS = [
  { key:"domestic",      label:"Domestic" },
  { key:"european",      label:"European" },
  { key:"cup",           label:"Cup"      },
  { key:"international", label:"International" },
];

const AF = "https://media.api-sports.io/football/leagues/";

const COMP_NAV_TABS = [
  { code:"epl",        label:"Premier League",   short:"PL",    group:"domestic",      logo:`${AF}39.png`,  bc:"#1a3a6e", bt:"#93c5fd", color:"#60a5fa", glow:"rgba(96,165,250,0.16)"  },
  { code:"laliga",     label:"La Liga",          short:"LL",    group:"domestic",      logo:`${AF}140.png`, bc:"#6e1a1a", bt:"#fca5a5", color:"#f97316", glow:"rgba(249,115,22,0.16)"  },
  { code:"seriea",     label:"Serie A",          short:"SA",    group:"domestic",      logo:`${AF}135.png`, bc:"#1a4a1a", bt:"#86efac", color:"#34d399", glow:"rgba(52,211,153,0.16)"  },
  { code:"bundesliga", label:"Bundesliga",       short:"BL",    group:"domestic",      logo:`${AF}78.png`,  bc:"#4a3a00", bt:"#fde68a", color:"#f59e0b", glow:"rgba(245,158,11,0.16)"  },
  { code:"ligue1",     label:"Ligue 1",          short:"L1",    group:"domestic",      logo:`${AF}61.png`,  bc:"#2e1a6e", bt:"#c4b5fd", color:"#a78bfa", glow:"rgba(167,139,250,0.16)" },
  { code:"ucl",        label:"Champions League", short:"UCL",   group:"european",      logo:`${AF}2.png`,   bc:"#0f2d6e", bt:"#93c5fd", color:"#3b82f6", glow:"rgba(59,130,246,0.16)"  },
  { code:"uel",        label:"Europa League",    short:"UEL",   group:"european",      logo:`${AF}3.png`,   bc:"#5c2800", bt:"#fdba74", color:"#f97316", glow:"rgba(249,115,22,0.16)"  },
  { code:"uecl",       label:"Conference Lge",   short:"UECL",  group:"european",      logo:`${AF}848.png`, bc:"#0f3d2a", bt:"#6ee7b7", color:"#22c55e", glow:"rgba(34,197,94,0.16)"   },
  { code:"facup",      label:"FA Cup",           short:"FAC",   group:"cup",           logo:`${AF}45.png`,  bc:"#4a0f0f", bt:"#fca5a5", color:"#ef4444", glow:"rgba(239,68,68,0.16)"   },
  { code:"wcq_uefa",           label:"WCQ Europe",     short:"WCQ·E",  group:"international", logo:`${AF}32.png`,  bc:"#3d3000", bt:"#fde68a", color:"#fbbf24", glow:"rgba(251,191,36,0.16)"  },
  { code:"wcq_conmebol",       label:"WCQ S. America", short:"WCQ·S",  group:"international", logo:`${AF}29.png`,  bc:"#3d3000", bt:"#fde68a", color:"#fbbf24", glow:"rgba(251,191,36,0.16)"  },
  { code:"wcq_concacaf",       label:"WCQ C. America", short:"WCQ·C",  group:"international", logo:`${AF}30.png`,  bc:"#3d3000", bt:"#fde68a", color:"#fbbf24", glow:"rgba(251,191,36,0.16)"  },
  { code:"wcq_caf",            label:"WCQ Africa",     short:"WCQ·A",  group:"international", logo:`${AF}31.png`,  bc:"#3d3000", bt:"#fde68a", color:"#fbbf24", glow:"rgba(251,191,36,0.16)"  },
  { code:"wcq_afc",            label:"WCQ Asia",       short:"WCQ·As", group:"international", logo:`${AF}36.png`,  bc:"#3d3000", bt:"#fde68a", color:"#fbbf24", glow:"rgba(251,191,36,0.16)"  },
  { code:"nations_league",     label:"Nations League", short:"UNL",    group:"international", logo:`${AF}5.png`,   bc:"#3a006e", bt:"#d8b4fe", color:"#e879f9", glow:"rgba(232,121,249,0.16)" },
  { code:"euro",               label:"UEFA Euros",     short:"EURO",   group:"international", logo:`${AF}4.png`,   bc:"#0f2d6e", bt:"#93c5fd", color:"#3b82f6", glow:"rgba(59,130,246,0.16)"  },
  { code:"euro_q",             label:"Euro Qualifiers",short:"EQ",     group:"international", logo:`${AF}960.png`, bc:"#0f2d6e", bt:"#93c5fd", color:"#3b82f6", glow:"rgba(59,130,246,0.16)"  },
  { code:"afcon",              label:"Africa Cup",     short:"AFCON",  group:"international", logo:`${AF}6.png`,   bc:"#0f3d1a", bt:"#86efac", color:"#22c55e", glow:"rgba(34,197,94,0.16)"   },
  { code:"copa_america",       label:"Copa América",   short:"COPA",   group:"international", logo:`${AF}9.png`,   bc:"#3d2c00", bt:"#fde68a", color:"#fbbf24", glow:"rgba(251,191,36,0.16)"  },
  { code:"gold_cup",           label:"Gold Cup",       short:"GC",     group:"international", logo:`${AF}16.png`,  bc:"#3d2c00", bt:"#fde68a", color:"#fbbf24", glow:"rgba(251,191,36,0.16)"  },
  { code:"world_cup",          label:"World Cup",      short:"WC",     group:"international", logo:`${AF}1.png`,   bc:"#3d2c00", bt:"#fde68a", color:"#fbbf24", glow:"rgba(251,191,36,0.16)"  },
  { code:"international_friendly",label:"Intl Friendly",short:"FRND",  group:"international", logo:`${AF}10.png`,  bc:"#2a2a2a", bt:"#d1d5db", color:"#94a3b8", glow:"rgba(148,163,184,0.16)"},
];

// Back-compat alias used by normaliseLeague and filter logic
const LEAGUES = Object.fromEntries(COMP_NAV_TABS.map(t => [t.code, { label:t.label, short:t.short, color:t.color, glow:t.glow, group:t.group }]));
const FILTER_GROUPS = COMP_NAV_GROUPS.map(g => ({ ...g, filters: COMP_NAV_TABS.filter(t=>t.group===g.key).map(t=>t.code) }));
const LEAGUE_FILTER = ["all", ...COMP_NAV_TABS.map(t=>t.code)];

// ── Two-level Competition Nav component ────────────────────────────────────────
function CompetitionNav({ activeCode, activeGroup, setActiveGroup, onSelect }) {
  const groupComps = COMP_NAV_TABS.filter(t => t.group === activeGroup);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {/* Row 1: group selector */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
        {COMP_NAV_GROUPS.map(g => {
          const isAct = g.key === activeGroup;
          const count = COMP_NAV_TABS.filter(t=>t.group===g.key).length;
          return (
            <button key={g.key} onClick={()=>setActiveGroup(g.key)} style={{
              display:"flex", alignItems:"center", gap:5,
              padding:"5px 12px", borderRadius:999, cursor:"pointer",
              fontSize:11, fontWeight:700, letterSpacing:"0.05em",
              border:`1px solid ${isAct?"rgba(255,255,255,0.45)":"var(--border)"}`,
              background: isAct ? "rgba(255,255,255,0.1)" : "var(--bg-glass)",
              color: isAct ? "#fff" : "var(--text-muted)",
              transition:"all 0.13s",
            }}>
              {g.label}
              <span style={{ fontSize:9, color: isAct?"rgba(255,255,255,0.5)":"var(--text-muted)", background:"rgba(255,255,255,0.08)", borderRadius:999, padding:"1px 5px" }}>{count}</span>
            </button>
          );
        })}
      </div>
      {/* Row 2: competition pills */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", minHeight:30 }}>
        <button onClick={()=>onSelect("all")} style={{
          display:"flex", alignItems:"center", gap:5,
          padding:"4px 11px", borderRadius:999, cursor:"pointer",
          fontSize:11, fontWeight:600, letterSpacing:"0.02em",
          border:`1px solid ${activeCode==="all"?"rgba(255,255,255,0.45)":"var(--border)"}`,
          background: activeCode==="all" ? "rgba(255,255,255,0.1)" : "var(--bg-glass)",
          color: activeCode==="all" ? "#fff" : "var(--text-muted)",
          transition:"all 0.13s",
        }}>All</button>
        {groupComps.map(comp => {
          const isAct = activeCode === comp.code;
          return (
            <button key={comp.code} onClick={()=>onSelect(isAct?"all":comp.code)} style={{
              display:"flex", alignItems:"center", gap:7,
              padding:"4px 11px", borderRadius:999, cursor:"pointer",
              fontSize:11, fontWeight:600, letterSpacing:"0.02em",
              background: "rgba(255,255,255,0.93)",
              color: "#111111",
              border: isAct ? "2px solid #60a5fa" : "2px solid transparent",
              boxShadow: isAct ? "0 0 0 1px #60a5fa44" : "none",
              transition:"all 0.13s",
              whiteSpace:"nowrap",
            }}>
              <img
                src={comp.logo}
                alt=""
                width={14} height={14}
                style={{ objectFit:"contain", flexShrink:0 }}
                onError={e => { e.currentTarget.style.display="none"; }}
              />
              {comp.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
const LIVE_SET      = new Set(["1H","2H","HT","ET","BT","P"]);
const FT_SET        = new Set(["FT","AET","PEN","AWD","WO"]);

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function normalizeLeague(l) {
  if (!l) return "";
  const v = String(l).toLowerCase();
  // Domestic
  if (v==="39"  || v.includes("premier"))                               return "epl";
  if (v==="140" || (v.includes("liga") && !v.includes("bundes")))       return "laliga";
  if (v==="135" || v.includes("serie"))                                  return "seriea";
  if (v==="78"  || v.includes("bundes"))                                 return "bundesliga";
  if (v==="61"  || v.includes("ligue"))                                  return "ligue1";
  // European
  if (v==="2"   || v.includes("champions"))                              return "ucl";
  if (v==="3"   || v.includes("europa"))                                 return "uel";
  if (v==="848" || v.includes("conference"))                             return "uecl";
  // Cup
  if (v==="45"  || v.includes("fa cup") || v.includes("facup"))         return "facup";
  // International — WCQ
  if (v==="32"  || v.includes("wcq_uefa")   || (v.includes("world cup qual") && v.includes("uefa")))     return "wcq_uefa";
  if (v==="29"  || v.includes("wcq_conmebol")|| (v.includes("world cup qual") && v.includes("conmebol"))) return "wcq_conmebol";
  if (v==="30"  || v.includes("wcq_concacaf")|| (v.includes("world cup qual") && v.includes("concacaf"))) return "wcq_concacaf";
  if (v==="31"  || v.includes("wcq_caf")    || (v.includes("world cup qual") && v.includes("caf")))      return "wcq_caf";
  if (v==="36"  || v.includes("wcq_afc")    || (v.includes("world cup qual") && v.includes("afc")))      return "wcq_afc";
  if (v==="33"  || v.includes("wcq_ofc")    || (v.includes("world cup qual") && v.includes("ofc")))      return "wcq_ofc";
  // International — Tournaments
  if (v==="5"   || v.includes("nations_league") || v.includes("nations league"))                          return "nations_league";
  if (v==="4"   || v==="euro"  || v.includes("european championship"))                                    return "euro";
  if (v==="960" || v.includes("euro_q") || v.includes("euro qual"))                                       return "euro_q";
  if (v==="6"   || v.includes("afcon") || v.includes("africa cup"))                                       return "afcon";
  if (v==="9"   || v.includes("copa_america") || v.includes("copa am"))                                   return "copa_america";
  if (v==="16"  || v.includes("gold_cup") || v.includes("gold cup"))                                      return "gold_cup";
  if (v==="1"   || v.includes("world_cup") || v==="world cup")                                            return "world_cup";
  if (v==="10"  || v.includes("friendly"))                                                                 return "international_friendly";
  // Pass-through for already-normalised slugs
  if (v in LEAGUES) return v;
  return v;
}

function cardMode(status) {
  if (!status || status==="NS" || status==="TBD") return "scheduled";
  if (LIVE_SET.has(status)) return "live";
  if (FT_SET.has(status))   return "fulltime";
  return "scheduled";
}

function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
}

function fmtKickoffLabel(iso) {
  if (!iso) return "";
  const d   = new Date(iso);
  const now = new Date();
  const tom = new Date(); tom.setDate(now.getDate()+1);
  const t   = d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  if (d.toDateString()===now.toDateString()) return t;
  if (d.toDateString()===tom.toDateString()) return `Tomorrow ${t}`;
  return d.toLocaleDateString([], { weekday:"short", day:"numeric", month:"short" }) + ` ${t}`;
}

function dayBucket(iso) {
  if (!iso) return "upcoming";
  const d   = new Date(iso);
  const now = new Date();
  const tom = new Date(); tom.setDate(now.getDate()+1);
  if (d.toDateString()===now.toDateString()) return "today";
  if (d.toDateString()===tom.toDateString()) return "tomorrow";
  return d.toLocaleDateString([], { weekday:"long", month:"short", day:"numeric" });
}

function insightLine(f) {
  if (f.insight) return f.insight;
  const { p_home_win:hw, p_draw:d, p_away_win:aw } = f;
  if (hw!=null && aw!=null) {
    if (hw>=60) return `${f.home_team?.split(" ").pop()} favoured — ${hw}% win`;
    if (aw>=60) return `${f.away_team?.split(" ").pop()} favoured — ${aw}% win`;
    if (d >=35) return "Tight matchup · draw likely";
    return "Even contest · close market";
  }
  if (f.xg_home!=null && f.xg_away!=null) {
    const diff = Math.abs(f.xg_home - f.xg_away);
    if (diff < 0.12) return "xG model: even matchup";
    const fav = f.xg_home > f.xg_away ? f.home_team?.split(" ").pop() : f.away_team?.split(" ").pop();
    return `xG edge: ${fav}`;
  }
  return null;
}

function marketBadge(f) {
  if (f.p_btts!=null   && f.p_btts   >= 55) return `BTTS ${f.p_btts}%`;
  if (f.p_over25!=null && f.p_over25 >= 60) return `O2.5 ${f.p_over25}%`;
  return null;
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function LiveDot({ size=5 }) {
  return (
    <span style={{
      width:size, height:size, borderRadius:"50%",
      background:"#ff3333", display:"inline-block", flexShrink:0,
      animation:"lc-pulse 1.4s ease-in-out infinite",
    }} />
  );
}

function Logo({ src, size=18 }) {
  return src ? (
    <img src={src} alt="" width={size} height={size}
      style={{ objectFit:"contain", flexShrink:0 }}
      onError={e => e.currentTarget.style.display="none"} />
  ) : <div style={{ width:size, height:size, flexShrink:0 }} />;
}

function LeagueLabel({ k, small }) {
  const c = LEAGUES[k];
  if (!c) return null;
  return (
    <span style={{ fontSize:small?8:9, fontWeight:900, letterSpacing:"0.09em", color:c.color, textTransform:"uppercase" }}>
      {small ? c.short : c.label}
    </span>
  );
}

// ─── FEATURED RAIL ────────────────────────────────────────────────────────────

function FeaturedCard({ f, onClick }) {
  const [hov, setHov] = useState(false);
  const lg    = LEAGUES[f.league];
  const mode  = cardMode(f.status);
  const isL   = mode==="live";
  const isFT  = mode==="fulltime";
  const hS    = f.home_score ?? null;
  const aS    = f.away_score ?? null;
  const hasSc = hS!==null && aS!==null;
  const hw    = hasSc && hS>aS;
  const aw    = hasSc && aS>hS;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:"relative", overflow:"hidden",
        borderRadius:16, cursor:"pointer", flexShrink:0,
        width:272, padding:"18px 18px 14px",
        background: isL
          ? "color-mix(in srgb, var(--red) 5%, var(--bg-card))"
          : "var(--bg-card)",
        border:`1px solid ${isL
          ? `rgba(255,69,58,${hov?.4:.18})`
          : hov ? "var(--border-strong)" : "var(--border)"}`,
        boxShadow: hov
          ? `var(--shadow-lift), inset 0 0 0 1px ${lg?.color||"#fff"}14`
          : "var(--shadow-card)",
        transform: hov ? "translateY(-4px) scale(1.01)" : "translateY(0) scale(1)",
        transition:"all 0.22s cubic-bezier(.22,.61,.36,1)",
        backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
      }}
    >
      {/* Top color bar */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:lg?.color||"#333", opacity:hov?1:.5, transition:"opacity .2s" }} />

      {/* Ambient glow */}
      {lg && <div style={{ position:"absolute", top:-50, right:-30, width:130, height:130, borderRadius:"50%", background:lg.glow, pointerEvents:"none", opacity:hov?1:.45, transition:"opacity .2s" }} />}

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <LeagueLabel k={f.league} />
        {isL && <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, fontWeight:900, color:"#ff4444" }}><LiveDot />{f.minute?`${f.minute}'`:"LIVE"}</span>}
        {isFT && <span style={{ fontSize:9, fontWeight:800, color:"var(--text-muted)", letterSpacing:".08em" }}>FT</span>}
        {!isL && !isFT && <span style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)" }}>{fmtKickoffLabel(f.kickoff)}</span>}
      </div>

      {/* Teams */}
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
        {[[f.home_logo,f.home_team,hS,hw],[f.away_logo,f.away_team,aS,aw]].map(([logo,name,score,bold],i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:9 }}>
            <Logo src={logo} size={22} />
            <span style={{ fontSize:13, fontWeight:bold?900:600, color:bold?"var(--text)":"var(--text-secondary)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</span>
            {hasSc && <span style={{ fontSize:20, fontWeight:900, color:bold?"var(--text)":"var(--border-strong)", fontFamily:"'JetBrains Mono',monospace", minWidth:22, textAlign:"center" }}>{score}</span>}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop:"1px solid var(--border-soft)", paddingTop:10, minHeight:22 }}>
        {f.xg_home!=null && <span style={{ fontSize:10, color:"var(--text-muted)", marginRight:10 }}><span style={{ color:"var(--green)", fontWeight:700 }}>xG</span> {f.xg_home}–{f.xg_away}</span>}
        {!hasSc && insightLine(f) && <span style={{ fontSize:10, color:"var(--text-muted)", fontStyle:"italic" }}>{insightLine(f)}</span>}
      </div>
    </div>
  );
}

function FeaturedRail({ fixtures, onNavigate }) {
  const cards = useMemo(() => {
    const live  = fixtures.filter(f => LIVE_SET.has(f.status));
    const today = fixtures.filter(f => !LIVE_SET.has(f.status) && !FT_SET.has(f.status) && dayBucket(f.kickoff)==="today");
    const pool  = [...live, ...today, ...fixtures];
    const seen  = new Set();
    return pool.filter(f => { if(seen.has(f.fixture_id)) return false; seen.add(f.fixture_id); return true; }).slice(0,3);
  }, [fixtures]);

  if (!cards.length) return null;
  return (
    <div style={{ marginBottom:32 }}>
      <div style={{ fontSize:9, fontWeight:900, letterSpacing:".14em", color:"var(--text-secondary)", textTransform:"uppercase", marginBottom:12 }}>Featured</div>
      <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:4 }}>
        {cards.map(f => <FeaturedCard key={f.fixture_id} f={f} onClick={() => onNavigate(f.fixture_id)} />)}
      </div>
    </div>
  );
}

// ─── SCHEDULED CARD ───────────────────────────────────────────────────────────

export function ScheduledCard({ fixture, onClick }) {
  const [hov, setHov] = useState(false);
  const lg     = LEAGUES[fixture.league];
  const line   = insightLine(fixture);
  const market = marketBadge(fixture);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:"relative", overflow:"hidden",
        padding:"12px 14px 11px",
        borderRadius:12, cursor:"pointer",
        background: hov ? "var(--bg-hover)" : "var(--bg-glass)",
        border:`1px solid ${hov ? "var(--border-strong)" : "var(--border)"}`,
        boxShadow: hov ? "var(--shadow-card)" : "none",
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        transition:"all .18s ease",
      }}
    >
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:2, background:lg?.color||"#333", borderRadius:"2px 0 0 2px", opacity:hov?.8:.4, transition:"opacity .18s" }} />

      <div style={{ paddingLeft:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <LeagueLabel k={fixture.league} />
          <span style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)" }}>{fmtKickoffLabel(fixture.kickoff)}</span>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom: (line||market)?9:0 }}>
          {[[fixture.home_logo,fixture.home_team],[fixture.away_logo,fixture.away_team]].map(([logo,name],i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:7 }}>
              <Logo src={logo} size={16} />
              <span style={{ fontSize:12, fontWeight:700, color:"var(--text-secondary)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</span>
            </div>
          ))}
        </div>

        {(line||market) && (
          <div style={{ borderTop:"1px solid var(--border-soft)", paddingTop:7, display:"flex", gap:7, alignItems:"center", flexWrap:"wrap" }}>
            {line   && <span style={{ fontSize:9.5, color:"var(--text-muted)", fontStyle:"italic", flex:1 }}>{line}</span>}
            {market && <span style={{ fontSize:9, fontWeight:800, letterSpacing:".06em", color:"var(--green)", background:"var(--green-soft)", padding:"2px 7px", borderRadius:999 }}>{market}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LIVE CARD ────────────────────────────────────────────────────────────────

export function LiveCard({ fixture, onClick }) {
  const [hov, setHov] = useState(false);
  const lg   = LEAGUES[fixture.league];
  const hS   = fixture.home_score ?? 0;
  const aS   = fixture.away_score ?? 0;
  const hw   = hS > aS;
  const aw   = aS > hS;
  const isHT = fixture.status === "HT";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:"relative", overflow:"hidden",
        padding:"12px 14px 11px",
        borderRadius:12, cursor:"pointer",
        background: hov ? "color-mix(in srgb, var(--red) 8%, var(--bg-secondary))" : "color-mix(in srgb, var(--red) 4%, var(--bg-secondary))",
        border:`1px solid rgba(255,44,44,${hov?.28:.14})`,
        boxShadow: hov ? "0 10px 34px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,44,44,.08)" : "0 2px 10px rgba(0,0,0,.28)",
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        transition:"all .18s ease",
      }}
    >
      {/* Red ambient */}
      <div style={{ position:"absolute", top:-24, right:-24, width:80, height:80, borderRadius:"50%", background:"rgba(255,30,30,.07)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:2, background:lg?.color||"#ff4444", borderRadius:"2px 0 0 2px" }} />

      <div style={{ paddingLeft:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:9 }}>
          <LeagueLabel k={fixture.league} />
          {isHT
            ? <span style={{ fontSize:9, fontWeight:900, color:"#f59e0b", background:"rgba(245,158,11,.09)", padding:"2px 7px", borderRadius:999, letterSpacing:".08em" }}>HALF TIME</span>
            : <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:9, fontWeight:900, color:"#ff4444", background:"rgba(255,40,40,.09)", padding:"2px 8px", borderRadius:999 }}><LiveDot />{fixture.minute?`${fixture.minute}'`:"LIVE"}</span>
          }
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:9 }}>
          {[[fixture.home_logo,fixture.home_team,hS,hw],[fixture.away_logo,fixture.away_team,aS,aw]].map(([logo,name,score,bold],i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:7 }}>
              <Logo src={logo} size={16} />
              <span style={{ fontSize:12, fontWeight:bold?800:600, color:bold?"var(--text)":"var(--text-secondary)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</span>
              <span style={{ fontSize:18, fontWeight:900, color:bold?"var(--text)":"var(--border-strong)", fontFamily:"'JetBrains Mono',monospace", minWidth:20, textAlign:"center" }}>{score}</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop:"1px solid var(--border-soft)", paddingTop:7, display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          {fixture.xg_home!=null && (
            <span style={{ fontSize:9.5, color:"var(--text-muted)" }}>
              <span style={{ color:"var(--green)", fontWeight:700 }}>xG</span> {fixture.xg_home}–{fixture.xg_away}
            </span>
          )}
          {fixture.latest_event && (
            <span style={{ fontSize:9.5, color:"var(--text-muted)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{fixture.latest_event}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FULLTIME CARD ────────────────────────────────────────────────────────────

export function FullTimeCard({ fixture, onClick }) {
  const [hov, setHov] = useState(false);
  const lg   = LEAGUES[fixture.league];
  const hS   = fixture.home_score ?? 0;
  const aS   = fixture.away_score ?? 0;
  const hw   = hS > aS;
  const aw   = aS > hS;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position:"relative", overflow:"hidden",
        padding:"12px 14px 11px",
        borderRadius:12, cursor:"pointer",
        background: hov ? "var(--bg-hover)" : "var(--bg-glass)",
        border:`1px solid ${hov ? "var(--border-strong)" : "var(--border)"}`,
        boxShadow: hov ? "var(--shadow-card)" : "none",
        transform: hov ? "translateY(-1px)" : "translateY(0)",
        transition:"all .18s ease",
        opacity: hov ? 1 : .78,
      }}
    >
      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:2, background:lg?.color||"#333", borderRadius:"2px 0 0 2px", opacity:.25 }} />

      <div style={{ paddingLeft:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <LeagueLabel k={fixture.league} />
          <span style={{ fontSize:9, fontWeight:800, color:"var(--text-muted)", background:"var(--bg-glass)", padding:"2px 7px", borderRadius:999, letterSpacing:".08em" }}>FT</span>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:fixture.xg_home!=null?8:0 }}>
          {[[fixture.home_logo,fixture.home_team,hS,hw],[fixture.away_logo,fixture.away_team,aS,aw]].map(([logo,name,score,bold],i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:7 }}>
              <Logo src={logo} size={16} />
              <span style={{ fontSize:12, fontWeight:bold?800:500, color:bold?"var(--text)":"var(--text-muted)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{name}</span>
              <span style={{ fontSize:16, fontWeight:bold?900:600, color:bold?"var(--text)":"var(--text-dim)", fontFamily:"'JetBrains Mono',monospace", minWidth:18, textAlign:"center" }}>{score}</span>
            </div>
          ))}
        </div>

        {fixture.xg_home!=null && (
          <div style={{ borderTop:"1px solid var(--border-soft)", paddingTop:6 }}>
            <span style={{ fontSize:9.5, color:"var(--text-muted)" }}>
              <span style={{ color:"var(--green)", fontWeight:700, opacity:0.55 }}>xG</span> {fixture.xg_home}–{fixture.xg_away}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, count, accent, collapsible, defaultOpen=true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom:24 }}>
      <div
        onClick={collapsible ? () => setOpen(o=>!o) : undefined}
        style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, cursor:collapsible?"pointer":"default", userSelect:"none" }}
      >
        {accent && <div style={{ width:3, height:14, borderRadius:2, background:accent, flexShrink:0 }} />}
        <span style={{ fontSize:10, fontWeight:900, letterSpacing:".14em", color:"var(--text-secondary)", textTransform:"uppercase" }}>{title}</span>
        {count!=null && (
          <span style={{ fontSize:9, fontWeight:800, color:accent||"var(--text-muted)", background:accent?`${accent}14`:"var(--bg-glass)", padding:"1px 7px", borderRadius:999 }}>{count}</span>
        )}
        {collapsible && (
          <span style={{ marginLeft:"auto", fontSize:11, color:"var(--text-dim)", display:"inline-block", transition:"transform .2s", transform:open?"rotate(0)":"rotate(-90deg)" }}>▾</span>
        )}
      </div>
      {(!collapsible || open) && (
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function CardRouter({ f, onNavigate }) {
  const mode = cardMode(f.status);
  const go   = () => onNavigate(f.fixture_id);
  if (mode==="live")     return <LiveCard     fixture={f} onClick={go} />;
  if (mode==="fulltime") return <FullTimeCard fixture={f} onClick={go} />;
  return                        <ScheduledCard fixture={f} onClick={go} />;
}

// ─── Sidebar widgets ──────────────────────────────────────────────────────────

function WidgetShell({ title, children }) {
  return (
    <div style={{ background:"var(--bg-glass)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", border:"1px solid var(--border)", borderRadius:14, padding:"14px 15px", marginBottom:10 }}>
      <div style={{ fontSize:9, fontWeight:900, letterSpacing:".13em", color:"var(--text-secondary)", textTransform:"uppercase", marginBottom:12 }}>{title}</div>
      {children}
    </div>
  );
}

function NextKickoffWidget({ fixtures }) {
  const next = useMemo(() => {
    const now = Date.now();
    return fixtures
      .filter(f => cardMode(f.status)==="scheduled" && f.kickoff)
      .sort((a,b) => new Date(a.kickoff)-new Date(b.kickoff))
      .find(f => new Date(f.kickoff).getTime() > now);
  }, [fixtures]);

  const [cd, setCd] = useState("");
  useEffect(() => {
    if (!next) return;
    const tick = () => {
      const diff = new Date(next.kickoff).getTime() - Date.now();
      if (diff<=0) { setCd("Kick off!"); return; }
      const h=Math.floor(diff/3_600_000), m=Math.floor((diff%3_600_000)/60_000), s=Math.floor((diff%60_000)/1_000);
      setCd(h>0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [next]);

  if (!next) return null;
  return (
    <WidgetShell title="Next Kick Off" accent="#60a5fa">
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
        <Logo src={next.home_logo} size={18} />
        <span style={{ fontSize:11, fontWeight:700, color:"var(--text-secondary)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{next.home_team?.split(" ").pop()}</span>
        <span style={{ fontSize:9, color:"var(--text-dim)", fontWeight:600 }}>vs</span>
        <span style={{ fontSize:11, fontWeight:700, color:"var(--text-secondary)", flex:1, textAlign:"right", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{next.away_team?.split(" ").pop()}</span>
        <Logo src={next.away_logo} size={18} />
      </div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:24, fontWeight:900, color:"var(--blue)", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"-0.02em" }}>{cd}</div>
        <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:3 }}>{fmtTime(next.kickoff)} · <LeagueLabel k={next.league} small /></div>
      </div>
    </WidgetShell>
  );
}

function LiveTrackerWidget({ fixtures }) {
  const live = fixtures.filter(f => LIVE_SET.has(f.status));
  return (
    <WidgetShell title="Live Tracker" accent="#ff4444">
      {live.length===0
        ? <div style={{ fontSize:11, color:"var(--text-muted)", textAlign:"center", padding:"6px 0" }}>No matches in progress</div>
        : (
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {live.map(f => (
              <div key={f.fixture_id} style={{ display:"flex", alignItems:"center", gap:7 }}>
                <span style={{ fontSize:9, fontWeight:900, color:"var(--red)", minWidth:26, fontFamily:"'JetBrains Mono',monospace" }}>
                  {f.minute?`${f.minute}'`:"–"}
                </span>
                <span style={{ fontSize:10, fontWeight:700, color:"var(--text-muted)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {f.home_team?.split(" ").pop()} {f.home_score??0}–{f.away_score??0} {f.away_team?.split(" ").pop()}
                </span>
                <div style={{ width:5, height:5, borderRadius:"50%", background:LEAGUES[f.league]?.color||"var(--border-strong)", flexShrink:0 }} />
              </div>
            ))}
          </div>
        )
      }
    </WidgetShell>
  );
}

function LeagueSummaryWidget({ fixtures }) {
  const rows = LEAGUE_FILTER.filter(l=>l!=="all").map(key => {
    const lx   = fixtures.filter(f=>f.league===key);
    const live = lx.filter(f=>LIVE_SET.has(f.status)).length;
    return { key, live, total:lx.length };
  }).filter(r=>r.total>0);

  if (!rows.length) return null;
  return (
    <WidgetShell title="Leagues" accent="#a78bfa">
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {rows.map(({ key, live, total }) => {
          const c = LEAGUES[key];
          return (
            <div key={key} style={{ display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ width:2, height:14, borderRadius:2, background:c.color, flexShrink:0 }} />
              <span style={{ fontSize:10, fontWeight:700, color:"var(--text-secondary)", flex:1 }}>{c.label}</span>
              {live>0 && <span style={{ fontSize:9, fontWeight:800, color:"var(--red)", background:"var(--red-soft)", padding:"1px 6px", borderRadius:999 }}>{live} live</span>}
              <span style={{ fontSize:9, fontWeight:700, color:"var(--text)" }}>{total}</span>
            </div>
          );
        })}
      </div>
    </WidgetShell>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────


// ── Intricate background ──────────────────────────────────────────────────────
function LiveBg() {
  return (
    <div aria-hidden="true" className="sn-fixed-bg" style={{
      position:"fixed",top:0,right:0,bottom:0,pointerEvents:"none",zIndex:0,overflow:"hidden",
    }}>
      {/* Theme-aware base */}
      <div style={{position:"absolute",inset:0,background:"var(--bg)",transition:"background 0.25s"}}/>

      {/* Very subtle radial glows — pure white, very low opacity */}
      <div style={{position:"absolute",top:"-15%",left:"25%",width:"60vw",height:"60vw",
        background:"radial-gradient(ellipse,rgba(255,255,255,.012) 0%,transparent 65%)"}}/>
      <div style={{position:"absolute",bottom:"-5%",right:"10%",width:"45vw",height:"45vw",
        background:"radial-gradient(ellipse,rgba(255,255,255,.009) 0%,transparent 55%)"}}/>

      {/* Fine grid — very subtle, no colour tint */}
      <div style={{position:"absolute",inset:0,
        backgroundImage:"linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px)",
        backgroundSize:"44px 44px"}}/>

      {/* Accent grid at 4× spacing */}
      <div style={{position:"absolute",inset:0,
        backgroundImage:"linear-gradient(rgba(255,255,255,.042) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.042) 1px,transparent 1px)",
        backgroundSize:"176px 176px"}}/>

      {/* SVG decorative layer */}
      <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}}
        preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="lb-slash" width="110" height="110" patternUnits="userSpaceOnUse">
            <line x1="0" y1="110" x2="110" y2="0" stroke="rgba(255,255,255,.009)" strokeWidth="0.6"/>
          </pattern>
          <pattern id="lb-dot" width="44" height="44" patternUnits="userSpaceOnUse">
            <circle cx="22" cy="22" r="0.65" fill="rgba(255,255,255,.055)"/>
          </pattern>
          <pattern id="lb-hex" width="56" height="48" patternUnits="userSpaceOnUse">
            <polygon points="28,2 54,14 54,34 28,46 2,34 2,14"
              fill="none" stroke="rgba(255,255,255,.016)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lb-slash)"/>
        <rect width="100%" height="100%" fill="url(#lb-dot)"/>
        {/* Hex zone top-right */}
        <rect x="62%" y="0" width="38%" height="45%" fill="url(#lb-hex)" opacity="0.7"/>
        {/* Diamond zone bottom-left */}
        <rect x="0" y="58%" width="32%" height="42%" fill="url(#lb-hex)" opacity="0.5"/>
      </svg>

      {/* HUD corner brackets */}
      <svg style={{position:"absolute",top:0,left:0,width:160,height:160,opacity:.08}} viewBox="0 0 160 160">
        <polyline points="10,60 10,10 60,10" fill="none" stroke="white" strokeWidth="1.1"/>
        <polyline points="10,78 10,10 78,10" fill="none" stroke="white" strokeWidth=".35"/>
        <circle cx="10" cy="10" r="2" fill="none" stroke="white" strokeWidth=".7"/>
      </svg>
      <svg style={{position:"absolute",top:0,right:0,width:160,height:160,opacity:.06}} viewBox="0 0 160 160">
        <polyline points="150,60 150,10 100,10" fill="none" stroke="white" strokeWidth="1.1"/>
      </svg>
      <svg style={{position:"absolute",bottom:0,right:0,width:160,height:160,opacity:.06}} viewBox="0 0 160 160">
        <polyline points="150,100 150,150 100,150" fill="none" stroke="white" strokeWidth="1.1"/>
      </svg>
    </div>
  );
}


export default function LivePage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [chips,      setChips]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [filter,        setFilter]        = useState("all");
  const [lastUp,        setLastUp]        = useState(null);
  const [dayOffset,     setDayOffset]     = useState(0);   // -10..0..+10: negative=past, 0=today/live, positive=future
  const [activeNavGroup,setActiveNavGroup] = useState("domestic");

  const fetchData = (offset = dayOffset) => {
    setLoading(true);
    setError(null);
    let clubUrl;
    if (offset < 0) clubUrl = `${BACKEND}/api/matches/results?days_ago=${Math.abs(offset)}`;
    else if (offset > 0) clubUrl = `${BACKEND}/api/matches/future?days_ahead=${offset}`;
    else clubUrl = `${BACKEND}/api/matches/upcoming`;

    // Compute the exact target date so the international endpoint fetches
    // the same single day as the club endpoint — never bleed into adjacent days.
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + offset);
    const yyyy = targetDate.getFullYear();
    const mm   = String(targetDate.getMonth() + 1).padStart(2, "0");
    const dd   = String(targetDate.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    // For today (offset=0) we want live matches too, so use a tiny window around now.
    // For past/future we fetch exactly that one day.
    const daysBack   = offset === 0 ? 0 : offset < 0 ? Math.abs(offset) : 0;
    const daysAhead  = offset === 0 ? 0 : offset > 0 ? offset : 0;
    const intlUrl    = `${BACKEND}/api/international/fixtures?date=${dateStr}&days_back=${daysBack}&days_ahead=${daysAhead}`;

    Promise.allSettled([
      fetch(clubUrl).then(r => { if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
      fetch(intlUrl).then(r => r.ok ? r.json() : { fixtures: [] }),
    ]).then(([clubRes, intlRes]) => {
      const clubMatches = clubRes.status === "fulfilled" ? (clubRes.value.matches || clubRes.value.chips || []) : [];
      const intlMatches = intlRes.status === "fulfilled" ? (intlRes.value.fixtures || []) : [];
      setChips([...clubMatches, ...intlMatches]);
      setLoading(false);
      setLastUp(new Date());
      setError(null);
    }).catch(e => { setError(e.message); setLoading(false); });
  };

  // Re-fetch when offset changes; auto-refresh only on today view
  useEffect(() => {
    fetchData(dayOffset);
    if (dayOffset === 0) {
      const id = setInterval(() => fetchData(0), 30_000);
      return () => clearInterval(id);
    }
  }, [dayOffset]);

  // Week navigation: which Monday starts the visible 7-day window
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay(); // 0=Sun
    const monday = new Date(d);
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0,0,0,0);
    return monday;
  });

  // Build 7 day cells for the current week window
  const weekDays = Array.from({length:7}, (_,i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  function dayLabel(offset) {
    if (offset === 0) return "Today & Live";
    if (offset === -1) return "Yesterday";
    if (offset === 1) return "Tomorrow";
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString([], { weekday:"short", day:"numeric", month:"short" });
  }

  function dateToOffset(d) {
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(d); target.setHours(0,0,0,0);
    return Math.round((target - today) / 86400000);
  }

  function prevWeek() {
    setWeekStart(ws => { const d=new Date(ws); d.setDate(d.getDate()-7); return d; });
  }
  function nextWeek() {
    setWeekStart(ws => { const d=new Date(ws); d.setDate(d.getDate()+7); return d; });
  }

  const fixtures = useMemo(() => chips.map(c => ({
    fixture_id:  c.fixture_id,
    league:      normalizeLeague(c.competition || c.league || c.league_id || c.competition_id),
    league_name: c.competition_name || c.league_name || c.league,
    home_team:   c.home_team,  away_team:  c.away_team,
    home_logo:   c.home_logo,  away_logo:  c.away_logo,
    home_score:  c.home_score??null, away_score: c.away_score??null,
    status:      c.status,     minute:     c.minute,
    kickoff:     c.kickoff||c.date,
    xg_home:     c.xg_home??null,  xg_away:    c.xg_away??null,
    p_home_win:  c.p_home_win??null, p_draw:     c.p_draw??null, p_away_win: c.p_away_win??null,
    p_btts:      c.p_btts??null,    p_over25:   c.p_over25??null,
    insight:     c.insight??null,   latest_event: c.latest_event??null,
    is_international: c.is_international ?? false,
    competition_flag: c.competition_flag ?? null,
    confederation:    c.confederation ?? null,
  })), [chips]);

  const filtered = useMemo(() => filter==="all" ? fixtures : fixtures.filter(f=>f.league===filter), [fixtures,filter]);

  const isPastView   = dayOffset < 0;
  const isFutureView = dayOffset > 0;
  const isTodayView  = dayOffset === 0;

  const pastResults   = isPastView   ? filtered : [];
  const futureResults = isFutureView ? filtered : [];

  const liveAll  = isTodayView ? filtered.filter(f => LIVE_SET.has(f.status)) : [];
  const todayFix = isTodayView ? filtered.filter(f => !LIVE_SET.has(f.status) && dayBucket(f.kickoff)==="today") : [];
  const ftToday  = isTodayView ? filtered.filter(f => FT_SET.has(f.status) && dayBucket(f.kickoff)==="today") : [];

  const upcoming = useMemo(() => {
    if (!isTodayView) return { groups:{}, order:[] };
    const groups={}, order=[];
    filtered
      .filter(f => !LIVE_SET.has(f.status) && !FT_SET.has(f.status) && dayBucket(f.kickoff)!=="today")
      .forEach(f => {
        const k=dayBucket(f.kickoff);
        if(!groups[k]){groups[k]=[];order.push(k);}
        groups[k].push(f);
      });
    return { groups, order };
  }, [filtered, isTodayView]);

  const liveCount  = fixtures.filter(f=>LIVE_SET.has(f.status)).length;
  const todayCount = fixtures.filter(f=>dayBucket(f.kickoff)==="today").length;

  return (
    <div style={{minHeight:"100vh"}}>
      <style>{`
        @keyframes lc-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.68)} }
        @keyframes lc-spin  { to{transform:rotate(360deg)} }
        @keyframes lc-in    { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
        *{box-sizing:border-box}
      `}</style>

      <div style={{ minHeight:"100vh", fontFamily:"'Inter',system-ui,sans-serif", position:"relative" }}>
        <LiveBg/>
        <div style={{ maxWidth:1280, margin:"0 auto", padding: isMobile ? "0 12px" : "0 20px", position:"relative", zIndex:1 }}>

          {/* ══ HERO HEADER ══ */}
          <div style={{ padding:"26px 0 18px", borderBottom:"1px solid var(--border)", marginBottom:22 }}>
            {/* Top row: title + counters */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14, flexWrap:"wrap", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                {/* Competition logo — shown when a specific filter is active */}
                {(() => {
                  const comp = filter !== "all" ? COMP_NAV_TABS.find(t => t.code === filter) : null;
                  return comp ? (
                    <img
                      src={comp.logo}
                      alt={comp.label}
                      width={44} height={44}
                      style={{ objectFit:"contain", flexShrink:0 }}
                      onError={e => { e.currentTarget.style.display="none"; }}
                    />
                  ) : null;
                })()}
                <div>
                  {/* Kicker pill — "Live Centre" always, or competition name when filtered */}
                  <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.14)", borderRadius:6, padding:"2px 10px", marginBottom:5 }}>
                    <LiveDot/>
                    <span style={{ fontSize:10, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase", color:"rgba(255,255,255,0.7)" }}>Live Centre</span>
                  </div>
                  <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight:900, color:"var(--text)", margin:0, letterSpacing:"-0.025em", lineHeight:1 }}>
                    {filter !== "all"
                      ? (COMP_NAV_TABS.find(t=>t.code===filter)?.label || "Live Centre")
                      : "Live Centre"}
                  </h1>
                  <p style={{ color:"var(--text-secondary)", fontSize:12, margin:"5px 0 0", fontWeight:600 }}>
                    {isPastView ? `Results · ${dayLabel(dayOffset)}` : isFutureView ? `Fixtures · ${dayLabel(dayOffset)}` : "Today & live · Domestic · European · International"}
                  </p>
                </div>
              </div>
              <div style={{ display:"flex", gap:7, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end" }}>
                {liveCount>0 && (
                  <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(255,40,40,.07)", border:"1px solid rgba(255,40,40,.18)", borderRadius:999, padding:"5px 12px" }}>
                    <LiveDot /><span style={{ fontSize:11, fontWeight:800, color:"#ff5252" }}>{liveCount} Live</span>
                  </div>
                )}
                <div style={{ background:"var(--bg-glass)", border:"1px solid var(--border)", borderRadius:999, padding:"5px 12px" }}>
                  <span style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)" }}>{todayCount} Today</span>
                </div>
                {lastUp && (
                  <div style={{ background:"var(--bg-glass)", border:"1px solid var(--border-soft)", borderRadius:999, padding:"5px 10px" }}>
                    <span style={{ fontSize:10, color:"var(--text-secondary)", fontWeight:600 }}>
                      {lastUp.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Calendar week strip ── */}
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {/* Prev week */}
                <button onClick={prevWeek} style={{
                  width:32, height:32, borderRadius:8, flexShrink:0,
                  border:"1px solid var(--border)", background:"var(--bg-glass)",
                  color:"var(--text-muted)", fontSize:15, cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>‹</button>

                {/* 7 day cells */}
                <div style={{ flex:1, display:"grid", gridTemplateColumns:"repeat(7,minmax(0,1fr))", gap: isMobile ? 3 : 4, overflowX: isMobile ? "auto" : "visible", minWidth: isMobile ? 0 : undefined }}>
                  {weekDays.map((d,i) => {
                    const offset  = dateToOffset(d);
                    const isToday = offset === 0;
                    const isPast  = offset < 0;
                    const isFuture= offset > 0;
                    const active  = dayOffset === offset;
                    const inRange = offset >= -10 && offset <= 10;
                    const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                    const dayName = DAY_NAMES[d.getDay()];
                    const dateNum = d.getDate();

                    // colour scheme
                    const col = isToday ? "#3b82f6" : isPast ? "#a78bfa" : "#34d399";
                    const colFaint = isToday ? "rgba(59,130,246,.18)" : isPast ? "rgba(167,139,250,.1)" : "rgba(52,211,153,.07)";
                    const colBorder = active
                      ? (isToday ? "#3b82f6" : isPast ? "#a78bfa" : "#34d399")
                      : (isToday ? "rgba(59,130,246,.35)" : isPast ? "rgba(167,139,250,.18)" : "rgba(52,211,153,.15)");
                    const textCol = active ? "#fff" : isToday ? "#93c5fd" : isPast ? "rgba(167,139,250,.65)" : "rgba(52,211,153,.6)";
                    const labelCol = active ? col : isToday ? "rgba(59,130,246,.6)" : isPast ? "rgba(167,139,250,.4)" : "rgba(52,211,153,.38)";

                    return (
                      <button key={i}
                        onClick={() => inRange && setDayOffset(offset)}
                        disabled={!inRange}
                        style={{
                          display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                          padding:"6px 4px", borderRadius:9, cursor: inRange ? "pointer" : "not-allowed",
                          border: active ? `2px solid ${colBorder}` : `1px solid ${colBorder}`,
                          background: active ? (isToday?"rgba(59,130,246,.15)":isPast?"rgba(167,139,250,.1)":"rgba(52,211,153,.08)") : colFaint,
                          transition:"all .15s",
                          opacity: inRange ? 1 : 0.35,
                        }}>
                        <span style={{ fontSize:8.5, fontWeight:700, color:labelCol, letterSpacing:".03em" }}>{dayName}</span>
                        <span style={{ fontSize:14, fontWeight:900, color:textCol, lineHeight:1, fontFamily:"'Inter',sans-serif" }}>{dateNum}</span>
                        {/* indicator dot */}
                        <div style={{ width:5, height:5, borderRadius:"50%", background: active ? col : (isToday?"rgba(239,68,68,.9)":colBorder), flexShrink:0 }}/>
                      </button>
                    );
                  })}
                </div>

                {/* Next week */}
                <button onClick={nextWeek} style={{
                  width:32, height:32, borderRadius:8, flexShrink:0,
                  border:"1px solid var(--border)", background:"var(--bg-glass)",
                  color:"var(--text-muted)", fontSize:15, cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>›</button>
              </div>

              {/* Zone legend */}
              <div style={{ display:"flex", gap: isMobile ? 10 : 16, marginTop:7, paddingLeft: isMobile ? 0 : 40, flexWrap:"wrap" }}>
                <span style={{ fontSize:9, fontWeight:700, color:"rgba(167,139,250,.45)", letterSpacing:".06em", display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ width:6, height:2, background:"rgba(167,139,250,.4)", borderRadius:1, display:"inline-block" }}/>PAST RESULTS
                </span>
                <span style={{ fontSize:9, fontWeight:700, color:"rgba(59,130,246,.55)", letterSpacing:".06em", display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ width:6, height:2, background:"rgba(59,130,246,.55)", borderRadius:1, display:"inline-block" }}/>TODAY & LIVE
                </span>
                <span style={{ fontSize:9, fontWeight:700, color:"rgba(52,211,153,.45)", letterSpacing:".06em", display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ width:6, height:2, background:"rgba(52,211,153,.4)", borderRadius:1, display:"inline-block" }}/>UPCOMING
                </span>
              </div>
            </div>

            {/* League / competition filter — two-level Solution 4 nav */}
            <CompetitionNav
              activeCode={filter}
              activeGroup={activeNavGroup}
              setActiveGroup={setActiveNavGroup}
              onSelect={(code) => setFilter(code)}
            />
          </div>

          {/* ══ STATES ══ */}
          {loading && (
            <div style={{ textAlign:"center", padding:"56px 0", color:"var(--text-secondary)", fontSize:13 }}>
              <div style={{ width:26, height:26, borderRadius:"50%", border:"2px solid var(--border)", borderTopColor:"var(--blue)", margin:"0 auto 12px", animation:"lc-spin .8s linear infinite" }} />
              Loading fixtures…
            </div>
          )}

          {error && (
            <div style={{ background:"rgba(255,82,82,.04)", border:"1px solid rgba(255,82,82,.1)", borderRadius:12, padding:"13px 16px", color:"#ff5252", fontSize:13, display:"flex", alignItems:"center", gap:10 }}>
              <span>Failed to load: {error}</span>
              <button onClick={fetchData} style={{ background:"none", border:"1px solid rgba(255,82,82,.22)", color:"#ff5252", borderRadius:6, padding:"3px 10px", cursor:"pointer", fontSize:11 }}>Retry</button>
            </div>
          )}

          {!loading && !error && (
            <div style={{ animation:"lc-in .3s ease both" }}>

              {/* ══ FEATURED RAIL ══ */}
              <FeaturedRail fixtures={filtered} onNavigate={id => navigate(`/match/${id}`)} />

              {/* ══ MAIN GRID ══ */}
              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) 236px", gap:22, alignItems:"start" }}>

                {/* Left: sections */}
                <div>
                  {filtered.length===0 && (
                    <div style={{ textAlign:"center", padding:"44px 0", color:"var(--text-muted)", fontSize:13 }}>No fixtures for this filter.</div>
                  )}

                  {/* ── PAST RESULTS VIEW ── */}
                  {isPastView && pastResults.length > 0 && (
                    <Section title={`Results · ${dayLabel(dayOffset)}`} count={pastResults.length} accent="#a78bfa">
                      {pastResults.map(f => <CardRouter key={f.fixture_id} f={f} onNavigate={id=>navigate(`/match/${id}`)} />)}
                    </Section>
                  )}

                  {/* ── FUTURE FIXTURES VIEW ── */}
                  {isFutureView && futureResults.length > 0 && (
                    <Section title={`Fixtures · ${dayLabel(dayOffset)}`} count={futureResults.length} accent="#34d399">
                      {futureResults.map(f => <CardRouter key={f.fixture_id} f={f} onNavigate={id=>navigate(`/match/${id}`)} />)}
                    </Section>
                  )}

                  {/* ── TODAY / LIVE VIEW ── */}
                  {isTodayView && (
                    <>
                      {liveAll.length>0 && (
                        <Section title="Live Now" count={liveAll.length} accent="#ff4444">
                          {liveAll.map(f => <CardRouter key={f.fixture_id} f={f} onNavigate={id=>navigate(`/match/${id}`)} />)}
                        </Section>
                      )}

                      {(todayFix.length>0||ftToday.length>0) && (
                        <Section title="Today" count={todayFix.length+ftToday.length} accent="#60a5fa">
                          {[...todayFix,...ftToday].map(f => <CardRouter key={f.fixture_id} f={f} onNavigate={id=>navigate(`/match/${id}`)} />)}
                        </Section>
                      )}

                      {upcoming.order.map((day,i) => (
                        <Section key={day} title={day} count={upcoming.groups[day].length} collapsible defaultOpen={i<2}>
                          {upcoming.groups[day].map(f => <CardRouter key={f.fixture_id} f={f} onNavigate={id=>navigate(`/match/${id}`)} />)}
                        </Section>
                      ))}
                    </>
                  )}
                </div>

                {/* Sidebar */}
                <div style={{ position: isMobile ? "static" : "sticky", top:16 }}>
                  <NextKickoffWidget  fixtures={filtered} />
                  <LiveTrackerWidget  fixtures={filtered} />
                  <LeagueSummaryWidget fixtures={filtered} />
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}