// PredictionsPage.jsx — StatinSite monochrome v5
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, NavLink } from "react-router-dom";
import {
  getStandings, getLeaguePredictions, getTopScorers, getTopAssists,
  getLeagueInjuries, getH2H, getFixtureOdds, getApiPrediction,
} from "../api/api";

// ─── Monochrome palette ───────────────────────────────────────────────────────
const C = {
  bg:"#000000", panel:"#111111", border:"#222222", borderMid:"#333333",
  text:"#ffffff", secondary:"#bfbfbf", muted:"#7a7a7a", faint:"#444444",
};

const LEAGUE_META = {
  epl:    { label:"Premier League", color:"#ffffff" },
  laliga: { label:"La Liga",        color:"#bfbfbf" },
  seriea: { label:"Serie A",        color:"#ffffff" },
  ligue1: { label:"Ligue 1",        color:"#bfbfbf" },
};

const LEAGUE_TABS = [
  { code:"epl",    slug:"premier-league", label:"Premier League" },
  { code:"laliga", slug:"la-liga",        label:"La Liga"        },
  { code:"seriea", slug:"serie-a",        label:"Serie A"        },
  { code:"ligue1", slug:"ligue-1",        label:"Ligue 1"        },
];

const ZONE_COLOR = { cl:"#ffffff", el:"#bfbfbf", ecl:"#888888", rel:"#555555" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(raw) {
  if (!raw || raw === "TBD") return { day:"TBD", date:"", time:"" };
  const clean = raw.replace("T"," ");
  const [datePart, timePart] = clean.split(" ");
  if (!datePart) return { day:raw, date:"", time:"" };
  const d = new Date(datePart + "T12:00:00");
  const day  = d.toLocaleDateString("en-GB", { weekday:"short" });
  const date = d.toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });
  const time = timePart ? timePart.slice(0,5) : "";
  return { day, date, time };
}

function parseForm(raw) {
  if (Array.isArray(raw)) return raw.filter(c => "WDL".includes(c));
  return String(raw||"").split("").filter(c => "WDL".includes(c));
}

// ─── FormPip ──────────────────────────────────────────────────────────────────
const FormPip = ({ r }) => {
  const s = {
    W: { bg:"rgba(255,255,255,0.12)", c:"#ffffff", b:"rgba(255,255,255,0.3)" },
    D: { bg:"rgba(255,255,255,0.04)", c:"#7a7a7a", b:"rgba(255,255,255,0.1)" },
    L: { bg:"rgba(255,255,255,0.02)", c:"#444444", b:"rgba(255,255,255,0.06)" },
  }[r] || { bg:"rgba(255,255,255,0.04)", c:"#7a7a7a", b:"rgba(255,255,255,0.1)" };
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      width:20, height:20, borderRadius:5, fontSize:9, fontWeight:900,
      fontFamily:"JetBrains Mono,monospace",
      background:s.bg, color:s.c, border:"1px solid "+s.b,
    }}>{r}</span>
  );
};

// ─── Static Pitch ─────────────────────────────────────────────────────────────
const StaticPitch = ({ outcome, homeTeam, awayTeam }) => {
  const W = 300, H = 56, MY = H / 2;
  const ballX = outcome === "home" ? W*0.65 : outcome === "away" ? W*0.35 : W*0.5;
  return (
    <div style={{ width:"100%", marginTop:10, lineHeight:0 }}>
      <svg width="100%" viewBox={"0 0 " + W + " " + H}
        style={{ display:"block", borderRadius:6 }} aria-hidden="true">
        <rect width={W} height={H} rx="6" fill="#091f0d" />
        <line x1={W/2} y1="4" x2={W/2} y2={H-4} stroke="rgba(255,255,255,0.08)" strokeWidth="0.7" />
        <circle cx={W/2} cy={MY} r="8" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.7" />
        <rect x="2" y={MY-8} width="12" height="16" rx="1" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.7" />
        <rect x={W-14} y={MY-8} width="12" height="16" rx="1" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.7" />
        <line x1="2" y1={MY-7} x2="6" y2={MY-7} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="2" y1={MY+7} x2="6" y2={MY+7} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="2.5" y1={MY-7} x2="2.5" y2={MY+7} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <line x1={W-6} y1={MY-7} x2={W-2} y2={MY-7} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1={W-6} y1={MY+7} x2={W-2} y2={MY+7} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1={W-2.5} y1={MY-7} x2={W-2.5} y2={MY+7} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        <circle cx={ballX} cy={MY} r="4" fill="rgba(255,255,255,0.85)" stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />
        <text x="20" y={H-4} fontSize="6" fontWeight="900" fill="rgba(255,255,255,0.25)" textAnchor="middle" fontFamily="Sora,sans-serif">
          {(homeTeam||"HOME").slice(0,3).toUpperCase()}
        </text>
        <text x={W-20} y={H-4} fontSize="6" fontWeight="900" fill="rgba(255,255,255,0.25)" textAnchor="middle" fontFamily="Sora,sans-serif">
          {(awayTeam||"AWAY").slice(0,3).toUpperCase()}
        </text>
      </svg>
    </div>
  );
};

// ─── League Flag ──────────────────────────────────────────────────────────────
const LeagueFlag = ({ code, size=18 }) => {
  const h = Math.round(size * 0.72);
  if (code === "epl") return (
    <svg width={size} height={h} viewBox="0 0 18 13" fill="none">
      <rect width="18" height="13" fill="#012169"/>
      <path d="M0 0L18 13M18 0L0 13" stroke="#fff" strokeWidth="2.6"/>
      <path d="M0 0L18 13M18 0L0 13" stroke="#C8102E" strokeWidth="1.6"/>
      <path d="M9 0V13M0 6.5H18" stroke="#fff" strokeWidth="4.3"/>
      <path d="M9 0V13M0 6.5H18" stroke="#C8102E" strokeWidth="2.6"/>
    </svg>
  );
  if (code === "laliga") return (
    <svg width={size} height={h} viewBox="0 0 18 13" fill="none">
      <rect width="18" height="3" fill="#c60b1e"/>
      <rect y="3" width="18" height="7" fill="#ffc400"/>
      <rect y="10" width="18" height="3" fill="#c60b1e"/>
    </svg>
  );
  if (code === "seriea") return (
    <svg width={size} height={h} viewBox="0 0 18 13" fill="none">
      <rect width="6" height="13" fill="#009246"/>
      <rect x="6" width="6" height="13" fill="#fff"/>
      <rect x="12" width="6" height="13" fill="#ce2b37"/>
    </svg>
  );
  if (code === "ligue1") return (
    <svg width={size} height={h} viewBox="0 0 18 13" fill="none">
      <rect width="6" height="13" fill="#002395"/>
      <rect x="6" width="6" height="13" fill="#fff"/>
      <rect x="12" width="6" height="13" fill="#ED2939"/>
    </svg>
  );
  return null;
};

// ─── Confidence Bar ───────────────────────────────────────────────────────────
const ConfBar = ({ value }) => {
  const pct = Math.min(Math.round(value || 0), 100);
  const color = pct >= 72 ? "#ffffff" : pct >= 52 ? "#bfbfbf" : pct >= 36 ? "#888888" : "#555555";
  const label = pct >= 72 ? "Strong" : pct >= 52 ? "Moderate" : pct >= 36 ? "Uncertain" : "Low";
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:9, color:C.muted, fontFamily:"Inter,sans-serif" }}>Confidence</span>
        <span style={{ fontSize:10, fontWeight:700, color, fontFamily:"JetBrains Mono,monospace" }}>
          {pct}% · {label}
        </span>
      </div>
      <div style={{ height:3, background:C.border, borderRadius:2, overflow:"hidden" }}>
        <div style={{ width:pct+"%", height:"100%", background:color, borderRadius:2 }} />
      </div>
    </div>
  );
};

// ─── Stat Bar ─────────────────────────────────────────────────────────────────
const StatBar = ({ label, homeVal, awayVal, fmt }) => {
  const h = parseFloat(homeVal)||0, a = parseFloat(awayVal)||0, tot = h+a||1;
  const hp = h/tot*100, ap = a/tot*100;
  const f = fmt || (v => v);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:12, fontWeight:800, color:C.text, fontFamily:"JetBrains Mono,monospace" }}>{f(h)}</span>
        <span style={{ fontSize:9, fontWeight:700, color:C.muted, letterSpacing:".08em" }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:800, color:C.secondary, fontFamily:"JetBrains Mono,monospace" }}>{f(a)}</span>
      </div>
      <div style={{ display:"flex", height:4, borderRadius:2, overflow:"hidden" }}>
        <div style={{ flex:hp, background:C.text, borderRadius:"2px 0 0 2px" }} />
        <div style={{ flex:ap, background:C.faint, borderRadius:"0 2px 2px 0" }} />
      </div>
    </div>
  );
};

// ─── H2H Widget ───────────────────────────────────────────────────────────────
const H2HWidget = ({ homeId, awayId, homeTeam, awayTeam }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!homeId || !awayId) { setLoading(false); return; }
    getH2H(homeId, awayId, 8).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [homeId, awayId]);
  if (loading) return <div style={{ height:80, borderRadius:8, background:C.border }} />;
  if (!data || !data.results || !data.results.length)
    return <div style={{ padding:12, textAlign:"center", color:C.muted, fontSize:12 }}>No H2H data</div>;
  const res = data.results;
  let hw=0, dw=0, aw=0;
  res.forEach(r => {
    const isHome = r.home_team === homeTeam;
    if (r.home_goals > r.away_goals) { if (isHome) hw++; else aw++; }
    else if (r.home_goals === r.away_goals) dw++;
    else { if (isHome) aw++; else hw++; }
  });
  const tot = hw+dw+aw||1;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ display:"flex", gap:6 }}>
        {[
          { label:(homeTeam||"").split(" ").pop(), val:hw, color:C.text },
          { label:"Draw", val:dw, color:C.muted },
          { label:(awayTeam||"").split(" ").pop(), val:aw, color:C.secondary },
        ].map(({ label, val, color }) => (
          <div key={label} style={{
            flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2,
            padding:"8px 4px", borderRadius:8,
            background:"rgba(255,255,255,0.03)", border:"1px solid "+C.border,
          }}>
            <span style={{ fontSize:22, fontWeight:900, color, fontFamily:"JetBrains Mono,monospace" }}>{val}</span>
            <span style={{ fontSize:9, color:C.muted }}>{label.slice(0,7)}</span>
            <span style={{ fontSize:9, color:C.faint }}>{Math.round(val/tot*100)}%</span>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", height:5, borderRadius:3, overflow:"hidden" }}>
        <div style={{ flex:hw, background:C.text }} />
        <div style={{ flex:dw, background:C.border }} />
        <div style={{ flex:aw, background:C.faint }} />
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:3, maxHeight:180, overflowY:"auto" }}>
        {res.slice(0,6).map((r, i) => (
          <div key={i} style={{
            display:"flex", alignItems:"center", gap:8, padding:"5px 8px",
            borderRadius:6, background:"rgba(255,255,255,0.02)",
          }}>
            <span style={{ fontSize:10, color:C.faint, minWidth:72, fontFamily:"JetBrains Mono,monospace" }}>{r.date}</span>
            <span style={{ flex:1, fontSize:11, fontWeight:700, color:C.muted,
              textAlign:"right", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.home_team}</span>
            <span style={{ padding:"2px 8px", borderRadius:4, background:"rgba(255,255,255,0.05)",
              fontSize:12, fontWeight:900, color:C.text, fontFamily:"JetBrains Mono,monospace",
              minWidth:40, textAlign:"center" }}>
              {r.home_goals} – {r.away_goals}
            </span>
            <span style={{ flex:1, fontSize:11, fontWeight:700, color:C.muted,
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.away_team}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Injuries Widget ──────────────────────────────────────────────────────────
const InjuryWidget = ({ homeTeam, awayTeam, allInjuries }) => {
  const filter = team => (allInjuries||[]).filter(inj => inj.team_name === team).slice(0,5);
  const homeInj = filter(homeTeam), awayInj = filter(awayTeam);
  if (!homeInj.length && !awayInj.length) return (
    <div style={{ padding:12, textAlign:"center", color:C.muted, fontSize:12 }}>
      No current injuries reported
    </div>
  );
  const Side = ({ team, injuries, isHome }) => (
    <div style={{ flex:1 }}>
      <div style={{ fontSize:10, fontWeight:900, letterSpacing:".08em", marginBottom:6,
        color: isHome ? C.text : C.secondary,
        borderBottom:"1px solid "+C.border, paddingBottom:4 }}>
        {team.split(" ").pop()}
      </div>
      {injuries.length === 0
        ? <div style={{ fontSize:11, color:C.faint, padding:"6px 0" }}>Full squad available</div>
        : injuries.map((inj, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
            <div style={{ width:24, height:24, borderRadius:"50%", background:C.border, flexShrink:0 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.text,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{inj.player_name}</div>
              <div style={{ fontSize:9, color:C.muted }}>{inj.reason||inj.type}</div>
            </div>
          </div>
        ))
      }
    </div>
  );
  return (
    <div style={{ display:"flex", gap:16 }}>
      <Side team={homeTeam} injuries={homeInj} isHome={true} />
      <div style={{ width:1, background:C.border }} />
      <Side team={awayTeam} injuries={awayInj} isHome={false} />
    </div>
  );
};

// ─── Odds Widget ──────────────────────────────────────────────────────────────
const OddsWidget = ({ fixtureId, pHome, pDraw, pAway, homeTeam, awayTeam }) => {
  const [odds, setOdds] = useState(null);
  useEffect(() => {
    if (!fixtureId) return;
    getFixtureOdds(fixtureId).then(setOdds).catch(() => {});
  }, [fixtureId]);
  if (!odds || !odds.bookmakers || !odds.bookmakers.length)
    return <div style={{ padding:12, textAlign:"center", color:C.muted, fontSize:12 }}>Loading odds...</div>;
  const bk = odds.bookmakers[0];
  const mw = bk.bets["Match Winner"] || {};
  const imp = odd => odd ? Math.round(1/parseFloat(odd)*100) : 0;
  const outcomes = [
    { label:(homeTeam||"").split(" ").pop().slice(0,8), odd:mw["Home"], model:Math.round((pHome||0)*100) },
    { label:"Draw", odd:mw["Draw"], model:Math.round((pDraw||0)*100) },
    { label:(awayTeam||"").split(" ").pop().slice(0,8), odd:mw["Away"], model:Math.round((pAway||0)*100) },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ display:"flex", gap:4 }}>
        {outcomes.map(({ label, odd, model }) => {
          const implied = imp(odd);
          const diff = implied ? model - implied : 0;
          return (
            <div key={label} style={{
              flex:1, display:"flex", flexDirection:"column", gap:3, alignItems:"center",
              padding:"8px 4px", borderRadius:8,
              background:"rgba(255,255,255,0.02)", border:"1px solid "+C.border,
            }}>
              <span style={{ fontSize:9, fontWeight:800, color:C.muted }}>{label}</span>
              <span style={{ fontSize:20, fontWeight:900, color:C.text,
                fontFamily:"JetBrains Mono,monospace" }}>{odd||"—"}</span>
              <span style={{ fontSize:10, color:C.faint }}>Implied: {implied}%</span>
              <span style={{ fontSize:10, color:C.secondary }}>Model: {model}%</span>
              {Math.abs(diff) >= 3 && (
                <span style={{ fontSize:10, fontWeight:800,
                  color: diff>0 ? C.text : C.muted,
                  background:"rgba(255,255,255,0.06)", padding:"1px 6px", borderRadius:4 }}>
                  Edge {diff>0?"+":""}{diff}%
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize:9, color:C.faint, textAlign:"center" }}>{bk.name}</div>
    </div>
  );
};

// ─── Team Stats Widget ────────────────────────────────────────────────────────
const TeamStatsWidget = ({ hStats, aStats, homeTeam, awayTeam }) => {
  if (!hStats && !aStats) return (
    <div style={{ padding:12, textAlign:"center", color:C.muted, fontSize:12 }}>Stats loading...</div>
  );
  const h = hStats||{}, a = aStats||{};
  const hPlayed = (h.played_home||0)+(h.played_away||0)||1;
  const aPlayed = (a.played_home||0)+(a.played_away||0)||1;
  const bars = [
    { label:"Goals/Game",  hv:((h.scored_home||0)+(h.scored_away||0))/hPlayed, av:((a.scored_home||0)+(a.scored_away||0))/aPlayed, fmt:v=>v.toFixed(2) },
    { label:"Shots/Game",  hv:h.shots_pg||0,           av:a.shots_pg||0,           fmt:v=>v.toFixed(1) },
    { label:"On Target",   hv:h.shots_on_target_pct||0, av:a.shots_on_target_pct||0, fmt:v=>v.toFixed(0)+"%" },
    { label:"Possession",  hv:h.possession_avg||50,     av:a.possession_avg||50,     fmt:v=>v+"%" },
    { label:"Pass Acc.",   hv:h.pass_accuracy||0,       av:a.pass_accuracy||0,       fmt:v=>v.toFixed(0)+"%" },
    { label:"Yellow/Game", hv:h.yellow_pg||0,           av:a.yellow_pg||0,           fmt:v=>v.toFixed(2) },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
        <span style={{ fontSize:11, fontWeight:800, color:C.text }}>{(homeTeam||"").split(" ").pop()}</span>
        <span style={{ fontSize:11, fontWeight:800, color:C.secondary }}>{(awayTeam||"").split(" ").pop()}</span>
      </div>
      {bars.map(({ label, hv, av, fmt }) => (
        <StatBar key={label} label={label} homeVal={hv} awayVal={av} fmt={fmt} />
      ))}
    </div>
  );
};

// ─── Score Heatmap ────────────────────────────────────────────────────────────
const ScoreHeatmap = ({ topScores, homeTeam, awayTeam }) => {
  if (!topScores || !topScores.length) return null;
  const G = 5, pm = {};
  let mx = 0;
  topScores.forEach(({ score, prob }) => {
    const parts = score.split("-").map(Number);
    const hg = parts[0], ag = parts[1];
    if (hg < G && ag < G) { pm[hg+"-"+ag] = prob; if (prob > mx) mx = prob; }
  });
  const rows = [0,1,2,3,4];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ fontSize:10, fontWeight:900, color:C.muted, letterSpacing:".1em" }}>CORRECT SCORE GRID</div>
      <div style={{ display:"grid", gridTemplateColumns:"22px repeat(5,1fr)", gap:3 }}>
        <div />
        {rows.map(ag => (
          <div key={ag} style={{ textAlign:"center", fontSize:10, fontWeight:700,
            color:C.faint, fontFamily:"JetBrains Mono,monospace" }}>{ag}</div>
        ))}
        {rows.map(hg => [
          <div key={"r"+hg} style={{ display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:10, fontWeight:700, color:C.faint, fontFamily:"JetBrains Mono,monospace" }}>{hg}</div>,
          ...rows.map(ag => {
            const p = pm[hg+"-"+ag]||0;
            const pct = Math.round(p*100);
            const isTop = p === mx && mx > 0;
            const alpha = mx > 0 ? Math.min(p/mx, 1) : 0;
            const bgAlpha = (alpha * 0.25 + 0.04).toFixed(2);
            const bg = alpha > 0 ? "rgba(255,255,255,"+bgAlpha+")" : "rgba(255,255,255,0.02)";
            return (
              <div key={hg+"-"+ag} style={{
                aspectRatio:"1", minHeight:26,
                display:"flex", alignItems:"center", justifyContent:"center",
                borderRadius:5, background:bg,
                fontSize:9, fontWeight:800, color:"rgba(255,255,255,0.75)",
                fontFamily:"JetBrains Mono,monospace",
                outline: isTop ? "1.5px solid rgba(255,255,255,0.4)" : "none",
                cursor:"default",
              }} title={hg+"-"+ag+": "+(p*100).toFixed(1)+"%"}>
                {pct > 0 ? pct+"%" : ""}
              </div>
            );
          }),
        ])}
      </div>
    </div>
  );
};

// ─── Scenario Explorer ────────────────────────────────────────────────────────
const ScenarioExplorer = ({ match }) => {
  const [mods, setMods] = React.useState({ homeAtk:0, awayAtk:0, homeDef:0, awayDef:0, tempo:0 });
  const reset = () => setMods({ homeAtk:0, awayAtk:0, homeDef:0, awayDef:0, tempo:0 });

  const scenario = React.useMemo(() => {
    if (!match) return null;
    const baseH = parseFloat(match.xg_home)||1.3;
    const baseA = parseFloat(match.xg_away)||1.1;
    const tMult = 1 + mods.tempo/100;
    const xgH = Math.max(0.1, baseH * (1+mods.homeAtk/100) * (1-mods.awayDef/200) * tMult);
    const xgA = Math.max(0.1, baseA * (1+mods.awayAtk/100) * (1-mods.homeDef/200) * tMult);
    const poi = (lam, k) => { let r=Math.exp(-lam); for(let i=0;i<k;i++) r*=lam/(i+1); return r; };
    let pH=0, pD=0, pA=0, topScore="1-0", topP=0;
    for (let hg=0; hg<=6; hg++) {
      for (let ag=0; ag<=6; ag++) {
        const p = poi(xgH,hg)*poi(xgA,ag);
        if (hg>ag) pH+=p; else if (hg===ag) pD+=p; else pA+=p;
        if (p>topP) { topP=p; topScore=hg+"-"+ag; }
      }
    }
    const tot = pH+pD+pA||1;
    return {
      pH:Math.round(pH/tot*100), pD:Math.round(pD/tot*100), pA:Math.round(pA/tot*100),
      xgH:xgH.toFixed(2), xgA:xgA.toFixed(2), topScore,
    };
  }, [match, mods]);

  if (!match) return (
    <div style={{ background:C.panel, border:"1px solid "+C.border, borderRadius:10,
      padding:20, display:"flex", alignItems:"center", justifyContent:"center", minHeight:200 }}>
      <span style={{ fontSize:11, color:C.muted, textAlign:"center" }}>
        Click a match card to load the Scenario Explorer
      </span>
    </div>
  );

  const makeSlider = (label, k, min, max) => {
    const val = mods[k];
    return (
      <div key={k} style={{ display:"flex", flexDirection:"column", gap:3 }}>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:10, color:C.secondary, fontFamily:"Inter,sans-serif" }}>{label}</span>
          <span style={{ fontSize:11, fontWeight:700, fontFamily:"JetBrains Mono,monospace",
            color: val===0 ? C.muted : val>0 ? C.text : C.secondary }}>
            {val>0?"+":""}{val}%
          </span>
        </div>
        <input type="range" min={min} max={max} value={val}
          onChange={e => {
            const next = parseInt(e.target.value);
            setMods(prev => ({ ...prev, [k]: next }));
          }}
          style={{ width:"100%", accentColor:"#ffffff", cursor:"pointer" }} />
      </div>
    );
  };

  const maxP = Math.max(scenario.pH, scenario.pD, scenario.pA);
  const makeProbRow = (label, pct) => (
    <div key={label} style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <div style={{ display:"flex", justifyContent:"space-between" }}>
        <span style={{ fontSize:10, color:C.secondary, fontFamily:"Inter,sans-serif" }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:900, fontFamily:"JetBrains Mono,monospace",
          color: pct===maxP ? C.text : C.muted }}>{pct}%</span>
      </div>
      <div style={{ height:4, background:C.border, borderRadius:2, overflow:"hidden" }}>
        <div style={{ width:pct+"%", height:"100%",
          background: pct===maxP ? C.text : C.faint, borderRadius:2,
          transition:"width 0.3s ease" }} />
      </div>
    </div>
  );

  return (
    <div style={{ background:C.panel, border:"1px solid "+C.border, borderRadius:10, overflow:"hidden" }}>
      <div style={{ padding:"12px 14px", borderBottom:"1px solid "+C.border }}>
        <div style={{ fontSize:11, fontWeight:900, color:C.text, letterSpacing:".06em",
          fontFamily:"Sora,sans-serif", marginBottom:4 }}>SCENARIO SIMULATOR</div>
        <div style={{ fontSize:9, color:C.muted, lineHeight:1.5, fontFamily:"Inter,sans-serif" }}>
          Adjust assumptions to explore hypothetical outcomes. Official predictions remain unchanged.
        </div>
      </div>
      <div style={{ padding:"10px 14px", borderBottom:"1px solid "+C.border,
        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:11, fontWeight:700, color:C.text, fontFamily:"Sora,sans-serif",
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"45%" }}>
          {match.home_team}
        </span>
        <span style={{ fontSize:9, color:C.muted, fontFamily:"JetBrains Mono,monospace" }}>vs</span>
        <span style={{ fontSize:11, fontWeight:700, color:C.secondary, fontFamily:"Sora,sans-serif",
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"45%", textAlign:"right" }}>
          {match.away_team}
        </span>
      </div>
      <div style={{ padding:"12px 14px", borderBottom:"1px solid "+C.border,
        display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ fontSize:9, fontWeight:900, color:C.muted, letterSpacing:".1em",
          fontFamily:"Inter,sans-serif", marginBottom:2 }}>ASSUMPTIONS</div>
        {makeSlider("Home Attack Modifier",  "homeAtk", -20, 20)}
        {makeSlider("Away Attack Modifier",  "awayAtk", -20, 20)}
        {makeSlider("Home Defense Modifier", "homeDef", -20, 20)}
        {makeSlider("Away Defense Modifier", "awayDef", -20, 20)}
        {makeSlider("Match Tempo",           "tempo",   -10, 10)}
      </div>
      <div style={{ padding:"12px 14px", borderBottom:"1px solid "+C.border,
        display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ fontSize:9, fontWeight:900, color:C.muted, letterSpacing:".1em",
          fontFamily:"Inter,sans-serif", marginBottom:2 }}>SIMULATION RESULT</div>
        {makeProbRow("Home Win", scenario.pH)}
        {makeProbRow("Draw",     scenario.pD)}
        {makeProbRow("Away Win", scenario.pA)}
      </div>
      <div style={{ padding:"12px 14px", borderBottom:"1px solid "+C.border }}>
        <div style={{ fontSize:9, fontWeight:900, color:C.muted, letterSpacing:".1em",
          fontFamily:"Inter,sans-serif", marginBottom:8 }}>EXPECTED GOALS</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:900, color:C.text,
              fontFamily:"JetBrains Mono,monospace" }}>{scenario.xgH}</div>
            <div style={{ fontSize:9, color:C.muted }}>Home xG</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:".08em" }}>LIKELY</div>
            <div style={{ fontSize:22, fontWeight:900, color:C.text,
              fontFamily:"JetBrains Mono,monospace" }}>{scenario.topScore}</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:900, color:C.secondary,
              fontFamily:"JetBrains Mono,monospace" }}>{scenario.xgA}</div>
            <div style={{ fontSize:9, color:C.muted }}>Away xG</div>
          </div>
        </div>
      </div>
      <div style={{ padding:"10px 14px" }}>
        <button onClick={reset} style={{
          width:"100%", padding:"8px", borderRadius:6,
          border:"1px solid "+C.borderMid, background:"transparent",
          color:C.secondary, fontSize:11, fontWeight:700,
          fontFamily:"Inter,sans-serif", cursor:"pointer",
        }}
          onMouseEnter={e => { e.currentTarget.style.background=C.border; e.currentTarget.style.color=C.text; }}
          onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=C.secondary; }}>
          Reset to Official Prediction
        </button>
      </div>
    </div>
  );
};

// ─── Match Card ───────────────────────────────────────────────────────────────
const MatchCard = ({ match, league, injuries, onSelect, isSelected }) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("stats");
  const hp = match.p_home_win||0, dp = match.p_draw||0, ap = match.p_away_win||0;
  const fav = hp>ap&&hp>dp ? "home" : ap>hp&&ap>dp ? "away" : "draw";
  const { day, date, time } = fmtDate(match.date);
  const hForm = parseForm(match.home_form);
  const aForm = parseForm(match.away_form);
  const winnerName = fav==="home" ? (match.home_team||"Home") : fav==="away" ? (match.away_team||"Away") : "Draw";
  const bttsPct    = Math.round((match.btts||0)*100);
  const bttsLabel  = bttsPct>=55 ? "Likely" : bttsPct>=38 ? "Possible" : "Unlikely";
  const o25        = Math.round((match.over_2_5||0)*100);
  const goalLabel  = o25>=68 ? "High" : o25>=48 ? "Medium" : "Low";
  const TABS = ["stats","h2h","injuries","odds","grid"];
  const TAB_LABELS = { stats:"Stats", h2h:"H2H", injuries:"Injuries", odds:"Odds", grid:"Score Grid" };
  return (
    <div style={{
      background:C.panel, borderRadius:12, overflow:"hidden",
      border:"1px solid "+(isSelected?"#555":open?"#444":C.border),
      boxShadow: open ? "0 4px 20px rgba(0,0,0,0.8)" : "none",
      transition:"border-color 0.15s, box-shadow 0.15s",
    }}
      onMouseEnter={e => { if(!open&&!isSelected) e.currentTarget.style.borderColor="#333"; }}
      onMouseLeave={e => { if(!open&&!isSelected) e.currentTarget.style.borderColor=isSelected?"#555":C.border; }}>

      <div style={{ padding:"16px 18px 14px", cursor:"pointer" }}
        onClick={() => { setOpen(o=>!o); onSelect&&onSelect(); }}>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
            <span style={{ fontSize:12, fontWeight:700, color:C.muted, fontFamily:"Sora,sans-serif" }}>{day}</span>
            <span style={{ fontSize:14, fontWeight:800, color:C.text, fontFamily:"Sora,sans-serif" }}>{date}</span>
            {time && (
              <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.4)",
                fontFamily:"JetBrains Mono,monospace" }}>{time}</span>
            )}
          </div>
          <span style={{ fontSize:9, color:C.muted }}>{open?"▲":"▼"}</span>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:10, justifyContent:"flex-end" }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:16, fontWeight:900, fontFamily:"Sora,sans-serif",
                color: fav==="home" ? C.text : C.faint }}>{match.home_team}</div>
              <div style={{ display:"flex", gap:3, justifyContent:"flex-end", marginTop:3 }}>
                {hForm.slice(-5).map((r,i) => <FormPip key={i} r={r} />)}
              </div>
            </div>
            {match.home_logo && (
              <img src={match.home_logo} alt="" style={{ width:38, height:38, objectFit:"contain" }}
                onError={e => { e.currentTarget.style.display="none"; }} />
            )}
          </div>

          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5,
            minWidth:140, flexShrink:0 }}>
            <div style={{ fontSize:28, fontWeight:900, color:C.text,
              fontFamily:"JetBrains Mono,monospace", letterSpacing:".06em", lineHeight:1 }}>
              {match.most_likely_score||"?–?"}
            </div>
            <div style={{ display:"flex", width:130, height:4, borderRadius:2, overflow:"hidden" }}>
              <div style={{ flex:hp, background:C.text, borderRadius:"2px 0 0 2px" }} />
              <div style={{ flex:dp, background:"rgba(255,255,255,0.15)" }} />
              <div style={{ flex:ap, background:C.faint, borderRadius:"0 2px 2px 0" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", width:130 }}>
              <span style={{ fontSize:11, fontWeight:800, color:C.text,
                fontFamily:"JetBrains Mono,monospace" }}>{Math.round(hp*100)}%</span>
              <span style={{ fontSize:10, color:C.faint,
                fontFamily:"JetBrains Mono,monospace" }}>{Math.round(dp*100)}%</span>
              <span style={{ fontSize:11, fontWeight:800, color:C.secondary,
                fontFamily:"JetBrains Mono,monospace" }}>{Math.round(ap*100)}%</span>
            </div>
          </div>

          <div style={{ flex:1, display:"flex", alignItems:"center", gap:10 }}>
            {match.away_logo && (
              <img src={match.away_logo} alt="" style={{ width:38, height:38, objectFit:"contain" }}
                onError={e => { e.currentTarget.style.display="none"; }} />
            )}
            <div>
              <div style={{ fontSize:16, fontWeight:900, fontFamily:"Sora,sans-serif",
                color: fav==="away" ? C.text : C.faint }}>{match.away_team}</div>
              <div style={{ display:"flex", gap:3, marginTop:3 }}>
                {aForm.slice(-5).map((r,i) => <FormPip key={i} r={r} />)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display:"flex", gap:5, marginBottom:8 }}>
          {[
            { topLabel:"Likely Winner",    val:winnerName },
            { topLabel:"Goal Outlook",     val:goalLabel  },
            { topLabel:"Both Teams Score", val:bttsLabel  },
            { topLabel:"Confidence",       val:Math.round(match.confidence||0)+"%" },
          ].map(({ topLabel, val }) => (
            <div key={topLabel} style={{ display:"flex", flexDirection:"column", gap:2,
              padding:"7px 10px", borderRadius:8, flex:1, minWidth:0,
              background:"rgba(255,255,255,0.04)", border:"1px solid "+C.border }}>
              <span style={{ fontSize:8, fontWeight:700, letterSpacing:".08em", color:C.muted,
                whiteSpace:"nowrap", textTransform:"uppercase" }}>{topLabel}</span>
              <span style={{ fontSize:12, fontWeight:800, color:C.text, whiteSpace:"nowrap",
                overflow:"hidden", textOverflow:"ellipsis" }}>{val}</span>
            </div>
          ))}
        </div>

        {(match.xg_home||match.xg_away) && (
          <div style={{ padding:"8px 10px", borderRadius:8, marginBottom:4,
            background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize:8, fontWeight:700, color:C.muted, letterSpacing:".1em", marginBottom:6 }}>
              EXPECTED GOALS
            </div>
            {[
              { name:(match.home_team||"Home").split(" ").pop(), val:parseFloat(match.xg_home)||0, isHome:true },
              { name:(match.away_team||"Away").split(" ").pop(), val:parseFloat(match.xg_away)||0, isHome:false },
            ].map(({ name, val, isHome }) => {
              const maxXg = Math.max(parseFloat(match.xg_home)||0, parseFloat(match.xg_away)||0, 1.5);
              const pct2 = (val/maxXg)*100;
              return (
                <div key={name} style={{ display:"flex", alignItems:"center", gap:8,
                  marginBottom: isHome ? 4 : 0 }}>
                  <span style={{ fontSize:9, fontWeight:700, minWidth:50, textAlign:"right",
                    color: isHome ? C.text : C.secondary }}>{name}</span>
                  <div style={{ flex:1, height:5, background:C.border, borderRadius:2, overflow:"hidden" }}>
                    <div style={{ width:pct2+"%", height:"100%", borderRadius:2,
                      background: isHome ? C.text : C.secondary }} />
                  </div>
                  <span style={{ fontSize:13, fontWeight:900, fontFamily:"JetBrains Mono,monospace",
                    minWidth:32, color: isHome ? C.text : C.secondary }}>{val.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        )}

        <StaticPitch outcome={fav} homeTeam={match.home_team} awayTeam={match.away_team} />
        <div style={{ marginTop:10 }}><ConfBar value={match.confidence} /></div>
      </div>

      {open && (
        <div style={{ borderTop:"1px solid "+C.border, background:"rgba(0,0,0,0.2)" }}>
          <div style={{ display:"flex", borderBottom:"1px solid "+C.border, overflowX:"auto" }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                padding:"10px 14px", fontSize:11, fontWeight:800, cursor:"pointer",
                fontFamily:"Inter,sans-serif", background:"none", border:"none",
                whiteSpace:"nowrap",
                color: activeTab===t ? C.text : C.muted,
                borderBottom: "2px solid "+(activeTab===t ? C.text : "transparent"),
                transition:"all 0.15s",
              }}>{TAB_LABELS[t]}</button>
            ))}
          </div>
          <div style={{ padding:"16px 18px" }}>
            {activeTab==="stats" && (
              <TeamStatsWidget hStats={match.home_stats} aStats={match.away_stats}
                homeTeam={match.home_team} awayTeam={match.away_team} />
            )}
            {activeTab==="h2h" && (
              <H2HWidget homeId={match.home_id} awayId={match.away_id}
                homeTeam={match.home_team} awayTeam={match.away_team} />
            )}
            {activeTab==="injuries" && (
              <InjuryWidget homeTeam={match.home_team} awayTeam={match.away_team}
                allInjuries={injuries} />
            )}
            {activeTab==="odds" && (
              <OddsWidget fixtureId={match.fixture_id}
                pHome={hp} pDraw={dp} pAway={ap}
                homeTeam={match.home_team} awayTeam={match.away_team} />
            )}
            {activeTab==="grid" && (
              <ScoreHeatmap topScores={match.top_scores}
                homeTeam={match.home_team} awayTeam={match.away_team} />
            )}
          </div>
          <div style={{ display:"flex", gap:5, padding:"8px 18px 14px", flexWrap:"wrap" }}>
            {["Dixon-Coles","Elo Rating","Real xG"].map(l => (
              <span key={l} style={{ fontSize:9, fontWeight:800, letterSpacing:".05em",
                padding:"2px 8px", borderRadius:4,
                background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
                color:C.secondary }}>{l}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Top Scorers ──────────────────────────────────────────────────────────────
const ScorersWidget = ({ league }) => {
  const [tab, setTab] = useState("goals");
  const [scorers, setScorers] = useState([]);
  const [assists, setAssists] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    Promise.allSettled([getTopScorers(league), getTopAssists(league)]).then(([sr, ar]) => {
      if (sr.status==="fulfilled") setScorers(sr.value.scorers||[]);
      if (ar.status==="fulfilled") setAssists(ar.value.assists||[]);
      setLoading(false);
    });
  }, [league]);
  const data = tab==="goals" ? scorers : assists;
  const statKey = tab==="goals" ? "goals" : "assists";
  return (
    <div style={{ background:C.panel, border:"1px solid "+C.border, borderRadius:12, overflow:"hidden" }}>
      <div style={{ display:"flex", borderBottom:"1px solid "+C.border }}>
        {[["goals","Top Scorers"],["assists","Top Assists"]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            flex:1, padding:12, fontSize:11, fontWeight:800, cursor:"pointer",
            background:"none", border:"none", fontFamily:"Inter,sans-serif",
            color: tab===k ? C.text : C.muted,
            borderBottom: "2px solid "+(tab===k ? C.text : "transparent"),
            transition:"all 0.15s",
          }}>{l}</button>
        ))}
      </div>
      <div style={{ padding:"8px 0", maxHeight:360, overflowY:"auto" }}>
        {loading
          ? Array.from({length:8}).map((_,i) => (
            <div key={i} style={{ display:"flex", gap:10, padding:"8px 14px", alignItems:"center" }}>
              <div style={{ width:16, height:16, borderRadius:"50%", background:C.border }} />
              <div style={{ width:32, height:32, borderRadius:"50%", background:C.border }} />
              <div style={{ flex:1, height:12, borderRadius:4, background:C.border }} />
            </div>
          ))
          : data.slice(0,10).map((p, i) => (
            <div key={p.player_id||i}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px",
                transition:"background 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.025)"; }}
              onMouseLeave={e => { e.currentTarget.style.background=""; }}>
              <span style={{ fontSize:11, fontWeight:900, fontFamily:"JetBrains Mono,monospace",
                color: i<3 ? C.text : C.muted, width:16, textAlign:"center" }}>{i+1}</span>
              {p.photo
                ? <img src={p.photo} style={{ width:32, height:32, borderRadius:"50%",
                    objectFit:"cover", flexShrink:0 }}
                    onError={e => { e.currentTarget.style.display="none"; }} />
                : <div style={{ width:32, height:32, borderRadius:"50%", background:C.border, flexShrink:0 }} />
              }
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:800, color:C.text,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</div>
                <div style={{ fontSize:10, color:C.muted }}>{p.team_name}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:20, fontWeight:900, color:C.text,
                  fontFamily:"JetBrains Mono,monospace" }}>{p[statKey]||0}</div>
                <div style={{ fontSize:9, color:C.faint }}>{p.played||0} apps</div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
};

// ─── Standings Table ──────────────────────────────────────────────────────────
const getZone = (pos, total) => {
  if (pos<=4) return "cl"; if (pos===5) return "el"; if (pos===6) return "ecl";
  if (pos>=total-2) return "rel"; return null;
};

const StandingsTable = ({ rows, loading }) => {
  const [sortCol, setSortCol] = useState("rank");
  const [dir, setDir] = useState(1);
  const total = rows.length || 20;
  const sorted = useMemo(() => {
    if (loading) return [];
    return [...rows].sort((a,b) => {
      let va=a[sortCol], vb=b[sortCol];
      if (va==null) va=sortCol==="rank"?999:0;
      if (vb==null) vb=sortCol==="rank"?999:0;
      if (typeof va==="string") { va=va.toLowerCase(); vb=vb.toLowerCase(); }
      return va<vb ? -dir : va>vb ? dir : 0;
    });
  }, [rows, sortCol, dir, loading]);
  const toggle = col => {
    if (sortCol===col) setDir(d=>-d);
    else { setSortCol(col); setDir(col==="rank"?1:-1); }
  };
  const Th = ({ col, children, align, width }) => (
    <th onClick={() => toggle(col)} style={{
      padding:10, fontSize:9, fontWeight:900, letterSpacing:".1em",
      color: sortCol===col ? C.text : C.muted,
      borderBottom:"1px solid "+C.border, background:"rgba(0,0,0,0.5)",
      textAlign:align||"center", width, cursor:"pointer", userSelect:"none",
    }}>
      {children}{sortCol===col?(dir===1?" ↑":" ↓"):""}
    </th>
  );
  return (
    <div style={{ overflowX:"auto", borderRadius:12 }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, fontFamily:"Sora,sans-serif" }}>
        <thead>
          <tr>
            <Th col="rank" width={36}>#</Th>
            <Th col="team_name" align="left">Club</Th>
            <Th col="played" width={34}>P</Th>
            <Th col="won" width={34}>W</Th>
            <Th col="drawn" width={34}>D</Th>
            <Th col="lost" width={34}>L</Th>
            <Th col="goals_for" width={34}>GF</Th>
            <Th col="goals_against" width={34}>GA</Th>
            <Th col="goal_diff" width={40}>GD</Th>
            <Th col="points" width={40}>Pts</Th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({length:10}).map((_,i) => (
              <tr key={i}>
                {Array.from({length:10}).map((_2,j) => (
                  <td key={j} style={{ padding:10, textAlign:"center" }}>
                    <div style={{ height:12, borderRadius:3, background:C.border }} />
                  </td>
                ))}
              </tr>
            ))
            : sorted.map((row, i) => {
              const zone = getZone(row.rank||i+1, total);
              return (
                <tr key={row.team_id||i}
                  style={{ borderBottom:"1px solid "+C.border, transition:"background 0.12s" }}
                  onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.025)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background=""; }}>
                  <td style={{ padding:10, textAlign:"center" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                      {zone && <div style={{ width:3, height:16, borderRadius:2,
                        background:ZONE_COLOR[zone], flexShrink:0 }} />}
                      <span style={{ fontSize:12, fontWeight:800, color:C.muted,
                        fontFamily:"JetBrains Mono,monospace" }}>{row.rank||i+1}</span>
                    </div>
                  </td>
                  <td style={{ padding:10 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      {row.logo && (
                        <img src={row.logo} style={{ width:20, height:20, objectFit:"contain" }}
                          onError={e => { e.currentTarget.style.display="none"; }} />
                      )}
                      <span style={{ fontWeight:700, color:C.text }}>{row.team_name}</span>
                    </div>
                  </td>
                  {[row.played, row.won, row.drawn, row.lost, row.goals_for, row.goals_against].map((v,j) => (
                    <td key={j} style={{ padding:10, textAlign:"center", color:C.secondary,
                      fontFamily:"JetBrains Mono,monospace" }}>{v??"-"}</td>
                  ))}
                  <td style={{ padding:10, textAlign:"center", fontFamily:"JetBrains Mono,monospace",
                    color: (row.goal_diff||0)>0 ? C.text : (row.goal_diff||0)<0 ? C.faint : C.muted }}>
                    {(row.goal_diff||0)>0?"+":""}{row.goal_diff??"-"}
                  </td>
                  <td style={{ padding:10, textAlign:"center", fontWeight:900, color:C.text,
                    fontFamily:"JetBrains Mono,monospace" }}>{row.points??"-"}</td>
                </tr>
              );
            })
          }
        </tbody>
      </table>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PredictionsPage({ league: propLeague, slugMap }) {
  const { league: paramLeague } = useParams();
  const raw = paramLeague || propLeague || "premier-league";
  const DEFAULTS = {
    "premier-league":"epl","la-liga":"laliga","serie-a":"seriea","ligue-1":"ligue1",
    "epl":"epl","laliga":"laliga","seriea":"seriea","ligue1":"ligue1",
  };
  const resolveMap = slugMap || DEFAULTS;
  const league = resolveMap[raw] || raw;
  const meta = LEAGUE_META[league] || { label:league.toUpperCase(), color:C.text };

  const [tab, setTab]                     = useState("predictions");
  const [standings, setStandings]         = useState([]);
  const [matches, setMatches]             = useState([]);
  const [injuries, setInjuries]           = useState([]);
  const [standLoad, setStandLoad]         = useState(true);
  const [predLoad, setPredLoad]           = useState(true);
  const [standErr, setStandErr]           = useState(null);
  const [predErr, setPredErr]             = useState(null);
  const [sort, setSort]                   = useState("confidence");
  const [selectedMatch, setSelectedMatch] = useState(null);

  const cache = useCallback((key, fn, setter, setLoading, setErr) => {
    setLoading(true); setErr&&setErr(null);
    try {
      const r = sessionStorage.getItem(key);
      if (r) {
        const parsed = JSON.parse(r);
        if (Date.now()-parsed.ts < 3600000) { setter(parsed.data); setLoading(false); return; }
      }
    } catch {}
    fn().then(json => {
      const d = json.standings||json.predictions||json.data||json||[];
      const arr = Array.isArray(d) ? d : [];
      setter(arr);
      try { sessionStorage.setItem(key, JSON.stringify({ data:arr, ts:Date.now() })); } catch {}
    }).catch(e => { setErr&&setErr(e.message); }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cache("stn_v5_"+league, () => getStandings(league), setStandings, setStandLoad, setStandErr);
    cache("pred_v5_"+league, () => getLeaguePredictions(league), setMatches, setPredLoad, setPredErr);
    getLeagueInjuries(league).then(d => setInjuries(d.injuries||[])).catch(() => {});
    setSelectedMatch(null);
  }, [league, cache]);

  const sorted = useMemo(() => {
    if (!matches.length) return matches;
    return [...matches].sort((a,b) => {
      if (sort==="confidence") return (b.confidence||0)-(a.confidence||0);
      if (sort==="date")       return (a.date||"").localeCompare(b.date||"");
      if (sort==="home")       return (b.p_home_win||0)-(a.p_home_win||0);
      return 0;
    });
  }, [matches, sort]);

  const homeWins  = matches.filter(m => m.p_home_win>m.p_away_win&&m.p_home_win>m.p_draw).length;
  const draws     = matches.filter(m => m.p_draw>=m.p_home_win&&m.p_draw>=m.p_away_win).length;
  const avgConf   = matches.length ? Math.round(matches.reduce((s,m) => s+(m.confidence||0),0)/matches.length) : 0;
  const avgXgH    = matches.length ? matches.reduce((s,m) => s+(parseFloat(m.xg_home)||0),0)/matches.length : 0;
  const avgXgA    = matches.length ? matches.reduce((s,m) => s+(parseFloat(m.xg_away)||0),0)/matches.length : 0;
  const bttsCount = matches.filter(m => (m.btts||0)>=0.55).length;

  return (
    <div className="page-shell" style={{ maxWidth:1400, margin:"0 auto", padding:"0 20px 48px" }}>

      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
        flexWrap:"wrap", gap:14, padding:"24px 0 20px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:4, height:52, borderRadius:4, background:C.text, flexShrink:0 }} />
          <div>
            <h1 style={{ fontSize:28, fontWeight:900, color:C.text, margin:"0 0 3px",
              letterSpacing:"-0.02em", fontFamily:"Sora,sans-serif",
              display:"flex", alignItems:"center", gap:10 }}>
              <LeagueFlag code={league} size={22} />
              {meta.label}
            </h1>
            <p style={{ fontSize:12, color:C.muted, margin:0, fontWeight:600 }}>
              Live predictions · Elo · Dixon-Coles Poisson · Real xG · Pro data
            </p>
          </div>
        </div>
        <nav style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          {LEAGUE_TABS.map(({ code, slug, label }) => {
            const active = league===code;
            return (
              <NavLink key={code} to={"/predictions/"+slug} style={{
                display:"flex", alignItems:"center", gap:7,
                padding:"7px 13px", borderRadius:999, fontSize:11, fontWeight:800,
                textDecoration:"none", whiteSpace:"nowrap",
                border:"1.5px solid "+(active?C.text:C.border),
                color: active ? C.text : C.muted,
                background: active ? "rgba(255,255,255,0.06)" : "transparent",
                transition:"all 0.15s",
              }}>
                <LeagueFlag code={code} size={16} />
                {label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div style={{ display:"flex", borderBottom:"1px solid "+C.border, marginBottom:20 }}>
        {[
          ["predictions","Predictions",!predLoad?matches.length:null],
          ["standings","Table",!standLoad?standings.length:null],
          ["scorers","Scorers",null],
        ].map(([key,label,badge]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            display:"flex", alignItems:"center", gap:7, padding:"12px 18px",
            fontSize:12, fontWeight:800, cursor:"pointer", background:"none", border:"none",
            fontFamily:"Inter,sans-serif", letterSpacing:".04em",
            color: tab===key ? C.text : C.muted,
            borderBottom: "2px solid "+(tab===key ? C.text : "transparent"),
            transition:"all 0.15s",
          }}>
            {label}
            {badge!=null && (
              <span style={{
                background: tab===key ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                color: tab===key ? C.text : C.muted,
                borderRadius:999, padding:"1px 7px", fontSize:10,
              }}>{badge}</span>
            )}
          </button>
        ))}
      </div>

      {tab==="predictions" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20, alignItems:"start" }}>
          <div>
            {!predLoad && !predErr && matches.length>0 && (
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:9, fontWeight:900, color:C.muted, letterSpacing:".12em",
                  fontFamily:"Inter,sans-serif", marginBottom:10 }}>GAMEWEEK OVERVIEW</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                  {[
                    { val:matches.length,       label:"Fixtures"        },
                    { val:homeWins,             label:"Home Favored"    },
                    { val:draws,                label:"Draw Favored"    },
                    { val:matches.length-homeWins-draws, label:"Away Favored" },
                    { val:avgXgH.toFixed(2),    label:"Avg xG Home"     },
                    { val:avgXgA.toFixed(2),    label:"Avg xG Away"     },
                    { val:bttsCount,            label:"BTTS Likely"     },
                    { val:avgConf+"%",          label:"Avg Confidence"  },
                  ].map(({ val, label }) => (
                    <div key={label} style={{ background:C.panel, border:"1px solid "+C.border,
                      borderRadius:8, padding:"12px 10px",
                      display:"flex", flexDirection:"column", gap:3,
                      transition:"background 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background="#1a1a1a"; }}
                      onMouseLeave={e => { e.currentTarget.style.background=C.panel; }}>
                      <span style={{ fontSize:22, fontWeight:900, color:C.text,
                        fontFamily:"JetBrains Mono,monospace", lineHeight:1 }}>{val}</span>
                      <span style={{ fontSize:9, color:C.muted, fontFamily:"Inter,sans-serif",
                        letterSpacing:".05em" }}>{label}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:10 }}>
                  <span style={{ fontSize:10, color:C.muted, fontFamily:"Inter,sans-serif" }}>Sort:</span>
                  {["confidence","date","home"].map(s => (
                    <button key={s} onClick={() => setSort(s)} style={{
                      padding:"4px 10px", borderRadius:4, fontSize:10, fontWeight:700,
                      cursor:"pointer", fontFamily:"Inter,sans-serif",
                      border:"1px solid "+(sort===s?C.text:C.border),
                      background: sort===s ? "rgba(255,255,255,0.08)" : "transparent",
                      color: sort===s ? C.text : C.muted,
                      transition:"all 0.13s",
                    }}>
                      {s==="confidence"?"Confidence":s==="date"?"Date":"Home %"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {predErr && (
              <div style={{ padding:20, background:"rgba(255,255,255,0.03)",
                border:"1px solid "+C.border, borderRadius:10, color:C.muted, fontSize:13 }}>
                Error loading predictions: {predErr}
              </div>
            )}

            {predLoad && (
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {Array.from({length:4}).map((_,i) => (
                  <div key={i} style={{ height:120, borderRadius:12,
                    background:C.panel, border:"1px solid "+C.border }} />
                ))}
              </div>
            )}

            {!predLoad && !predErr && matches.length===0 && (
              <div style={{ padding:40, textAlign:"center", color:C.muted, fontSize:14 }}>
                No upcoming fixtures found.
              </div>
            )}

            {!predLoad && !predErr && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {sorted.map((m, i) => (
                  <MatchCard key={(m.home_team||"")+(m.away_team||"")+i}
                    match={m} league={league} injuries={injuries}
                    onSelect={() => setSelectedMatch(m)}
                    isSelected={selectedMatch===m} />
                ))}
              </div>
            )}
          </div>

          <div style={{ position:"sticky", top:72 }}>
            <ScenarioExplorer match={selectedMatch||sorted[0]} />
          </div>
        </div>
      )}

      {tab==="standings" && (
        <div style={{ background:C.panel, border:"1px solid "+C.border, borderRadius:12, overflow:"hidden" }}>
          {standErr
            ? <div style={{ padding:20, color:C.muted }}>Error: {standErr}</div>
            : <StandingsTable rows={standings} loading={standLoad} league={league} />
          }
        </div>
      )}

      {tab==="scorers" && <ScorersWidget league={league} />}

    </div>
  );
}
