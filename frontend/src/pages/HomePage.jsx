// ═══════════════════════════════════════════════════════════════════════
// StatinSite — HomePage v10  "Unified API + Suave Intelligence"
// ═══════════════════════════════════════════════════════════════════════
//
// ARCHITECTURE:
//  • ALL fetches go through api.js — no hardcoded URLs in this file
//  • useDashboardData() → 17 parallel direct fetches (each cached + retried)
//  • useUpcomingData()  → /api/matches/upcoming + /api/international/fixtures
//  • No dependency on /api/home/dashboard aggregated endpoint (cold-start risk)
//
// DATA KEY MAP (backend home.py → frontend prop):
//  dashboard.top_predictions.predictions[]  → PredCard list
//  dashboard.title_race.top4                → TitleRace left column
//  dashboard.form_table.table               → TitleRace right column
//  dashboard.model_edges.edges              → EdgeBoard left
//  dashboard.high_scoring_matches.matches   → EdgeBoard right
//  dashboard.model_confidence               → hero ModelSignals panel
//  dashboard.differential_captains.captains → FPLHub captain rows
//  dashboard.value_players.players          → FPLHub value rows
//  dashboard.xg_leaders.leaders             → TrendingPlayers
//  dashboard.trending_players.items         → TrendingPlayers fallback
//  dashboard.transfer_brief                 → TransferBrief col 1
//  dashboard.analytics_term                 → TransferBrief col 2
//  dashboard.defense_table.table            → TransferBrief col 3
//  dashboard.power_rankings.rankings        → PowerRankings
//  dashboard.performance_summary            → ModelPerf rings/bands
//  dashboard.accountability_summary         → ModelPerf recent list
//  dashboard.hero_stats                     → Hero stat strip
//
// EMPTY STATES: every section renders a message when data is absent —
//   never silently blank.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, getMatchesUpcoming, getInternational, LEAGUE_CODES } from "@/api/api";

const BACKEND = import.meta?.env?.VITE_API_BASE || "https://football-stats-lw4b.onrender.com";

const LIVE_SET = new Set(["1H","2H","HT","ET","BT","P"]);
const isToday  = d => d && new Date(d).toDateString() === new Date().toDateString();

// ════════════════════════════════════════════════════════════════════════
// STYLES (inline — no extra CSS file needed)
// ════════════════════════════════════════════════════════════════════════
const CSS = `

/* ═══════════════════════════════════════════════════════
   MATERIAL 3 — PITCH BLACK  token layer
   All card / surface colours use these vars.
   Hero section is untouched (uses .hero-pure / .hp-* classes).
═══════════════════════════════════════════════════════ */
:root,[data-theme="dark"]{
  --m3-bg:          #050508;
  --m3-surface:     #0c0c10;
  --m3-surface2:    #131318;
  --m3-surface3:    #1a1a22;
  --m3-surface-ton: #16161e;
  --m3-outline:     rgba(255,255,255,0.09);
  --m3-outline-var: rgba(255,255,255,0.06);
  --m3-on-s:        rgba(255,255,255,0.87);
  --m3-on-s-var:    rgba(255,255,255,0.55);
  --m3-on-s-dim:    rgba(255,255,255,0.32);
  --m3-primary:     #a8c7fa;
  --m3-primary-c:   #0d3a6e;
  --m3-on-primary:  #d3e4ff;
  --m3-secondary:   #c4c7e9;
  --m3-secondary-c: #252843;
  --m3-on-sec:      #dee0ff;
  --m3-tertiary:    #e8b4c8;
  --m3-tertiary-c:  #3d1a2a;
  --m3-green:       #43db8b;
  --m3-green-c:     #083d22;
  --m3-on-green:    #b7f0d0;
  --m3-amber:       #ffb74d;
  --m3-amber-c:     #3d2200;
  --m3-on-amber:    #ffddb3;
  --m3-red:         #ff6b6b;
  --m3-red-c:       #5c1010;
  --m3-on-red:      #ffcdd2;
  /* legacy aliases — keep existing components working */
  --bg:             var(--m3-bg);
  --bg-card:        var(--m3-surface);
  --bg-glass:       rgba(255,255,255,0.04);
  --bg-hover:       rgba(255,255,255,0.07);
  --border:         var(--m3-outline-var);
  --border-strong:  var(--m3-outline);
  --border-soft:    var(--m3-outline-var);
  --text:           var(--m3-on-s);
  --text-secondary: var(--m3-on-s-var);
  --text-muted:     var(--m3-on-s-var);
  --text-dim:       var(--m3-on-s-dim);
  --blue:           var(--m3-primary);
  --green:          var(--m3-green);
  --shadow-card:    0 2px 8px rgba(0,0,0,0.5),0 0 0 0.5px rgba(255,255,255,0.05);
  --shadow-lift:    0 6px 24px rgba(0,0,0,0.65),0 0 0 0.5px rgba(255,255,255,0.08);
  --font-mono:      'DM Mono','JetBrains Mono','Fira Code',monospace;
}
[data-theme="light"]{
  --m3-bg:          #f3f3fb;
  --m3-surface:     #ffffff;
  --m3-surface2:    #f7f7fc;
  --m3-surface3:    #ededf5;
  --m3-surface-ton: #f0f0f8;
  --m3-outline:     rgba(0,0,0,0.14);
  --m3-outline-var: rgba(0,0,0,0.07);
  --m3-on-s:        rgba(0,0,0,0.87);
  --m3-on-s-var:    rgba(0,0,0,0.55);
  --m3-on-s-dim:    rgba(0,0,0,0.35);
  --bg:             var(--m3-bg);
  --bg-card:        var(--m3-surface);
  --bg-glass:       rgba(0,0,0,0.03);
  --bg-hover:       rgba(0,0,0,0.05);
  --border:         var(--m3-outline-var);
  --border-strong:  var(--m3-outline);
  --border-soft:    var(--m3-outline-var);
  --text:           var(--m3-on-s);
  --text-secondary: var(--m3-on-s-var);
  --text-muted:     var(--m3-on-s-var);
  --text-dim:       var(--m3-on-s-dim);
  --shadow-card:    0 1px 3px rgba(0,0,0,0.09),0 2px 8px rgba(0,0,0,0.06);
  --shadow-lift:    0 4px 16px rgba(0,0,0,0.13);
}

/* ── Layout ── */
.hp{background:var(--m3-bg);}
.s{padding:52px 0;}.s--last{padding-bottom:80px;}
.w{max-width:1280px;margin:0 auto;padding:0 24px;}
.hd{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;gap:12px;}
.ey{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--m3-on-s-dim);margin-bottom:6px;}
.h2{font-size:clamp(20px,2.2vw,26px);font-weight:500;letter-spacing:-.02em;color:var(--m3-on-s);line-height:1.15;}
.sa{font-size:12px;font-weight:500;color:var(--m3-primary);white-space:nowrap;transition:opacity .15s;flex-shrink:0;margin-top:4px;}.sa:hover{opacity:.65;}
.dv{height:1px;background:var(--m3-outline-var);margin:0 24px;}
.sl{font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--m3-on-s-dim);margin-bottom:12px;}

/* ── M3 Section label ── */
.m3-sec{font-size:11px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:var(--m3-on-s-dim);display:flex;align-items:center;gap:10px;margin-bottom:14px;}
.m3-sec::after{content:'';flex:1;height:1px;background:var(--m3-outline-var);}

/* ── Grids ── */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
.gp{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.gr{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.gb{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:180px;gap:12px;}
.gc{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
.gfacts{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px;}
.gmodels{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
@media(max-width:1100px){.gb{grid-template-columns:repeat(3,1fr);}}
@media(max-width:900px){.g3,.gp{grid-template-columns:1fr 1fr;}.gb{grid-template-columns:1fr 1fr;}.gc{grid-template-columns:1fr 1fr;}}
@media(max-width:720px){.g2,.gr{grid-template-columns:1fr;}}
@media(max-width:600px){.g3,.gp,.gb,.gc{grid-template-columns:1fr;}.gfacts{grid-template-columns:1fr 1fr;}.gmodels{grid-template-columns:1fr;}.w{padding:0 14px;}.s{padding:36px 0;}}

/* ═══════════════════════════════════════════════════════
   M3 CARD SYSTEM — three elevation tiers
═══════════════════════════════════════════════════════ */

/* Tier 1 — Outlined (pitch black, subtle border) */
.g{
  background:var(--m3-surface);
  border:1px solid var(--m3-outline-var);
  border-radius:28px;
  position:relative;overflow:hidden;
  box-shadow:0 1px 4px rgba(0,0,0,0.45);
  transition:transform .25s cubic-bezier(.2,0,0,1),box-shadow .25s,border-color .2s,background .2s;
  cursor:pointer;
}
.g::before{content:'';position:absolute;inset:0;border-radius:28px;pointer-events:none;z-index:0;background:rgba(168,199,250,0);transition:background .2s;}
.g:hover{transform:translateY(-3px);box-shadow:0 4px 16px rgba(0,0,0,.6),0 1px 4px rgba(0,0,0,.4);border-color:var(--m3-outline);background:var(--m3-surface2);}
.g:hover::before{background:rgba(168,199,250,.04);}
.g:active{transform:scale(.97);}
/* M3 ripple state layer */
.g::after{content:'';position:absolute;inset:0;border-radius:inherit;background:transparent;transition:background .18s;pointer-events:none;z-index:1;}
.g:active::after{background:rgba(168,199,250,.08);}
.gi{position:relative;z-index:2;}
.gsm{border-radius:18px;}
.gsm::before,.gsm::after{border-radius:18px;}

[data-theme="light"] .g{background:#ffffff;box-shadow:0 1px 2px rgba(0,0,0,.07),0 2px 6px rgba(0,0,0,.05);}
[data-theme="light"] .g:hover{background:#f8f8fc;box-shadow:0 4px 12px rgba(0,0,0,.1);}

/* Tier 2 — Elevated (slightly lighter pitch black, depth shadow) */
.g-elevated{
  background:var(--m3-surface2);
  border-radius:28px;
  position:relative;overflow:hidden;
  box-shadow:0 1px 3px rgba(0,0,0,.5),0 4px 14px rgba(0,0,0,.35);
  transition:transform .25s cubic-bezier(.2,0,0,1),box-shadow .25s,background .2s;
  cursor:pointer;
}
.g-elevated:hover{transform:translateY(-4px);box-shadow:0 3px 10px rgba(0,0,0,.6),0 8px 28px rgba(0,0,0,.45);background:var(--m3-surface3);}
.g-elevated:active{transform:scale(.97);}
.g-elevated::before{content:'';position:absolute;inset:0;border-radius:28px;pointer-events:none;background:rgba(168,199,250,0);transition:background .2s;z-index:0;}
.g-elevated:hover::before{background:rgba(168,199,250,.04);}

[data-theme="light"] .g-elevated{background:#f0f0f8;box-shadow:0 2px 8px rgba(0,0,0,.08);}

/* Tier 3 — Filled (coloured container — for hero sections per card type) */
.g-filled{
  border-radius:28px;
  position:relative;overflow:hidden;
  transition:transform .25s cubic-bezier(.2,0,0,1),filter .2s;
  cursor:pointer;
}
.g-filled:hover{filter:brightness(1.08);transform:translateY(-3px);}
.g-filled:active{transform:scale(.97);}

/* ── M3 ripple (JS-powered on click) ── */
.m3-ripple-wrap{position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none;z-index:3;}
.m3-ripple{position:absolute;width:64px;height:64px;margin:-32px;border-radius:50%;background:rgba(255,255,255,.12);animation:m3rip .5s ease-out both;}
@keyframes m3rip{0%{transform:scale(0);opacity:.35}100%{transform:scale(4);opacity:0}}

/* ── M3 Active accent bar (top of key cards) ── */
.m3-bar{position:absolute;top:0;left:0;right:0;height:2px;border-radius:28px 28px 0 0;pointer-events:none;z-index:4;overflow:hidden;}
.m3-bar::after{content:'';position:absolute;top:0;height:100%;width:35%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);animation:m3beam 3.5s ease-in-out infinite;}
@keyframes m3beam{0%{left:-40%}100%{left:130%}}

/* ── Hero ── */
.hero{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--m3-bg);padding:100px 0 60px;}
[data-theme="light"] .hero{background:linear-gradient(155deg,#f0f4ff 0%,#f5f5f7 40%,#fdf0f7 100%);}
.orb{position:absolute;border-radius:50%;filter:blur(72px);pointer-events:none;z-index:0;animation:orbd 14s ease-in-out infinite alternate;}
.orb-a{width:700px;height:500px;background:radial-gradient(ellipse,rgba(10,132,255,.14),transparent 70%);top:-140px;left:-200px;}
.orb-b{width:600px;height:600px;background:radial-gradient(ellipse,rgba(48,209,88,.10),transparent 70%);bottom:-120px;right:-180px;animation-delay:-6s;}
.orb-c{width:500px;height:400px;background:radial-gradient(ellipse,rgba(191,90,242,.09),transparent 70%);top:40%;left:50%;animation:orbdc 18s ease-in-out infinite alternate;}
[data-theme="light"] .orb{opacity:.22;}
@keyframes orbd{from{transform:translate(0,0) scale(1);}to{transform:translate(24px,36px) scale(1.1);}}
@keyframes orbdc{from{transform:translate(-50%,-50%) scale(1);}to{transform:translate(calc(-50% + 30px),calc(-50% + 20px)) scale(1.08);}}
.scanline{position:absolute;inset:0;pointer-events:none;z-index:1;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.018) 3px,rgba(0,0,0,.018) 4px);}
[data-theme="light"] .scanline{opacity:.3;}
.cv{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;}
.hi{position:relative;z-index:2;width:100%;max-width:1280px;margin:0 auto;padding:0 24px;display:grid;grid-template-columns:1fr 2.2fr 1fr;gap:20px;align-items:center;}
@media(max-width:1024px){.hi{grid-template-columns:1fr 1.6fr;}.hero-r{display:none;}}
@media(max-width:680px){.hi{grid-template-columns:1fr;gap:16px;}.hero-l{display:none;}.hero{padding:80px 0 40px;min-height:auto;}}
.hc{text-align:center;}
.hbadge{display:inline-flex;align-items:center;gap:7px;padding:5px 16px;border-radius:999px;background:var(--bg-glass);border:1px solid var(--m3-outline);font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--m3-on-s-var);margin-bottom:28px;animation:fadeup .7s ease both;}
.htitle{font-size:clamp(48px,7vw,96px);font-weight:900;letter-spacing:-.045em;line-height:1;color:var(--m3-on-s);margin-bottom:24px;animation:fadeup .7s .12s ease both;position:relative;}
.htitle-line1{display:block;color:var(--m3-on-s);}
.htitle-game{display:block;position:relative;}
.tgrad{background:linear-gradient(110deg,#0a84ff 0%,#30d158 42%,#bf5af2 78%,#0a84ff 100%);background-size:240%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:gmove 5s linear infinite;}
.tgrad-glow{position:absolute;inset:0;background:inherit;filter:blur(28px);opacity:.35;z-index:-1;animation:gmove 5s linear infinite;}
@keyframes gmove{0%{background-position:0% 50%;}100%{background-position:240% 50%;}}
.hsub{font-size:15px;color:var(--m3-on-s-var);line-height:1.65;max-width:500px;margin:0 auto 36px;animation:fadeup .7s .22s ease both;}
.ctas{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:40px;animation:fadeup .7s .32s ease both;}
.btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:7px;padding:12px 24px;border-radius:20px;font-size:13px;font-weight:500;letter-spacing:.01em;border:none;cursor:pointer;font-family:inherit;transition:transform .2s cubic-bezier(.2,0,0,1),filter .16s,box-shadow .2s;}
.btn:active{transform:scale(.95) !important;}
.btn::after{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent);transform:skewX(-20deg);transition:none;}
.btn:hover::after{left:150%;transition:left .5s ease;}
.btn-p{background:var(--m3-primary);color:#001d36;box-shadow:0 2px 12px rgba(168,199,250,.28);}.btn-p:hover{filter:brightness(1.08);transform:translateY(-2px);}
.btn-g{background:var(--m3-surface2);color:var(--m3-on-s);border:1px solid var(--m3-outline);}.btn-g:hover{background:var(--m3-surface3);transform:translateY(-2px);}
.btn-l{background:rgba(255,107,107,.12);color:var(--m3-red);border:1px solid rgba(255,107,107,.25);}.btn-l:hover{background:rgba(255,107,107,.2);transform:translateY(-2px);}
.btn-f{background:rgba(67,219,139,.1);color:var(--m3-green);border:1px solid rgba(67,219,139,.25);}.btn-f:hover{background:rgba(67,219,139,.18);transform:translateY(-2px);}
.strip{display:grid;grid-template-columns:repeat(4,1fr);background:var(--m3-outline-var);border:1px solid var(--m3-outline-var);border-radius:20px;overflow:hidden;gap:1px;animation:fadeup .7s .42s ease both;}
.stripc{background:var(--m3-surface);padding:16px 10px;text-align:center;transition:background .2s;}.stripc:hover{background:var(--m3-surface2);}
.stripv{font-size:clamp(18px,2.5vw,26px);font-weight:500;letter-spacing:-.03em;color:var(--cc,var(--m3-on-s));font-family:var(--font-mono);line-height:1;margin-bottom:5px;}
.stripl{font-size:9px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:var(--m3-on-s-dim);}
@media(max-width:480px){.strip{grid-template-columns:1fr 1fr;}}

/* ── Hero panels ── */
.pn{padding:16px;}
.pl{font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--m3-on-s-dim);margin-bottom:10px;}
.lr{display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:14px;background:var(--m3-surface3);border:1px solid var(--m3-outline-var);margin-bottom:5px;cursor:pointer;transition:background .15s;font-size:11px;font-weight:500;color:var(--m3-on-s);}.lr:hover{background:rgba(168,199,250,.08);}
.ql{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:12px;font-size:11px;font-weight:500;color:var(--m3-on-s-var);transition:all .15s;border:1px solid transparent;}.ql:hover{background:rgba(168,199,250,.06);color:var(--qc,var(--m3-primary));border-color:var(--m3-outline-var);}

/* ── Live dot ── */
.dot{width:var(--ds,6px);height:var(--ds,6px);border-radius:50%;flex-shrink:0;background:var(--dc,var(--m3-red));animation:m3pulse 1.9s ease-in-out infinite;}
@keyframes m3pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.6)}}

/* ── Skeleton ── */
.sk{display:block;background:linear-gradient(90deg,var(--m3-surface2) 25%,var(--m3-surface3) 50%,var(--m3-surface2) 75%);background-size:200%;animation:shim 1.7s infinite;border-radius:8px;}
@keyframes shim{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* ── Live ticker ── */
.ticker{background:rgba(255,107,107,.05);border-top:1px solid rgba(255,107,107,.12);border-bottom:1px solid rgba(255,107,107,.12);height:40px;overflow:hidden;position:relative;}
.tickertrack{display:flex;align-items:center;gap:18px;height:100%;animation:scrollx 28s linear infinite;width:max-content;}
@keyframes scrollx{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.tickerchip{display:flex;align-items:center;gap:7px;padding:4px 14px;border-radius:999px;background:rgba(255,107,107,.09);border:1px solid rgba(255,107,107,.18);white-space:nowrap;cursor:pointer;font-size:11px;font-weight:500;color:var(--m3-on-s);transition:background .15s;flex-shrink:0;}.tickerchip:hover{background:rgba(255,107,107,.16);}
.tickerfade{position:absolute;top:0;bottom:0;width:80px;z-index:2;pointer-events:none;}
.tfl{left:0;background:linear-gradient(90deg,var(--m3-bg),transparent);}.tfr{right:0;background:linear-gradient(-90deg,var(--m3-bg),transparent);}
[data-theme="light"] .tfl{background:linear-gradient(90deg,var(--m3-bg),transparent);}[data-theme="light"] .tfr{background:linear-gradient(-90deg,var(--m3-bg),transparent);}

/* ── Horizontal scroll ── */
.hs{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;}.hs::-webkit-scrollbar{display:none;}.hs>*{scroll-snap-align:start;}

/* ── M3 prob bar ── */
.pb{display:flex;height:6px;border-radius:3px;overflow:hidden;margin:10px 0 5px;gap:1px;background:rgba(255,255,255,.07);}

/* ── Team row ── */
.tr{display:flex;align-items:center;gap:10px;padding:10px 13px;border-radius:16px;background:var(--m3-surface3);margin-bottom:5px;transition:background .15s;cursor:pointer;}.tr:hover{background:rgba(168,199,250,.07);}

/* ── Form pip ── */
.fp{width:15px;height:15px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;}

/* ── Badge ── */
.bx{display:inline-flex;align-items:center;padding:3px 9px;border-radius:999px;font-size:9px;font-weight:500;letter-spacing:.04em;white-space:nowrap;}

/* ── Icon chip ── */
.iconf{width:28px;height:28px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}

/* ── Tool card (M3 elevated) ── */
.tcard{padding:20px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;height:100%;}

/* ── FPL row ── */
.frow{display:flex;align-items:center;gap:10px;padding:10px 13px;border-radius:16px;border:1px solid var(--m3-outline-var);background:var(--m3-surface3);margin-bottom:5px;cursor:pointer;transition:all .2s cubic-bezier(.2,0,0,1);}.frow:hover{background:rgba(168,199,250,.07);border-color:var(--frc,var(--m3-outline));transform:translateX(3px);}
.find{width:3px;height:26px;border-radius:999px;background:var(--frc,var(--m3-primary));flex-shrink:0;opacity:.7;}

/* ── Captain row ── */
.crow{display:flex;align-items:center;gap:10px;padding:9px 13px;border-radius:16px;background:var(--m3-surface3);margin-bottom:5px;transition:background .15s;cursor:pointer;}.crow:hover{background:rgba(168,199,250,.07);}

/* ── Model card ── */
.mc{display:flex;align-items:flex-start;gap:10px;padding:14px;border-radius:18px;background:var(--m3-surface3);border:1px solid var(--m3-outline-var);transition:all .2s cubic-bezier(.2,0,0,1);cursor:pointer;}.mc:hover{border-color:var(--mcc,var(--m3-outline));transform:translateY(-2px);background:rgba(168,199,250,.05);}
.mcd{width:8px;height:8px;border-radius:50%;background:var(--mcc,var(--m3-primary));box-shadow:0 0 10px var(--mcc,var(--m3-primary));flex-shrink:0;margin-top:3px;}

/* ── Verified row ── */
.vrow{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:14px;background:var(--m3-surface3);margin-bottom:5px;transition:background .15s;cursor:pointer;}.vrow:hover{background:rgba(168,199,250,.07);}

/* ── Acc ring wrapper ── */
.aw{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;}
@media(max-width:500px){.aw{grid-template-columns:1fr 1fr;}}

/* ── Empty state ── */
.empty{padding:28px;text-align:center;font-size:12px;color:var(--m3-on-s-dim);border-radius:20px;background:var(--m3-surface2);border:1px solid var(--m3-outline-var);}

/* ── Error state ── */
.errbx{padding:18px 20px;border-radius:18px;background:rgba(255,107,107,.07);border:1px solid rgba(255,107,107,.18);font-size:11px;color:var(--m3-red);}

/* ── Mono ── */
.mn{font-family:var(--font-mono);}

/* ── Animations ── */
@keyframes fadeup{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes hpfloat{0%{transform:translateY(0) translateX(0);opacity:.8;}33%{transform:translateY(-28px) translateX(14px);opacity:.4;}66%{transform:translateY(-12px) translateX(-10px);opacity:.7;}100%{transform:translateY(0) translateX(0);opacity:.8;}}

/* ═══════════════════════════════════════════════════════
   HERO — RADAR / PURE — kept exactly as-is
═══════════════════════════════════════════════════════ */
.hero-pure{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#04080f;}
[data-theme="light"] .hero-pure{background:#04080f;}
.hp-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;}
.hp-scan{position:absolute;inset:0;pointer-events:none;z-index:1;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.018) 3px,rgba(0,0,0,.018) 4px);}
.hp-vignette{position:absolute;inset:0;pointer-events:none;z-index:1;background:radial-gradient(ellipse 70% 65% at 50% 50%,transparent 30%,#04080f 100%);}
.hp-beam{position:absolute;bottom:0;left:0;right:0;height:1px;z-index:4;overflow:hidden;}
.hp-beam::after{content:'';position:absolute;top:0;left:-30%;height:1px;width:40%;background:linear-gradient(90deg,transparent,rgba(59,130,246,.9),transparent);animation:hpBeamSlide 3.5s ease-in-out infinite;}
@keyframes hpBeamSlide{0%{left:-40%;}100%{left:130%;}}
.hp-beam-top{position:absolute;top:0;left:0;right:0;height:1px;z-index:4;overflow:hidden;}
.hp-beam-top::after{content:'';position:absolute;top:0;height:1px;width:30%;background:linear-gradient(90deg,transparent,rgba(59,130,246,.5),transparent);animation:hpBeamSlide 4.5s 1.2s ease-in-out infinite;}
.hp-center{position:relative;z-index:2;text-align:center;padding:0 24px;}
.hp-brand{display:inline-flex;align-items:center;gap:12px;margin-bottom:28px;animation:hpFadeUp .9s ease both;}
.hp-brand-bars{display:flex;align-items:flex-end;gap:2.5px;height:18px;}
.hp-brand-bars span{display:block;width:3px;border-radius:2px;background:#3b82f6;animation:hpBarPulse 1.8s ease-in-out infinite;}
.hp-brand-bars span:nth-child(1){height:9px;animation-delay:0s;}.hp-brand-bars span:nth-child(2){height:16px;animation-delay:.18s;}.hp-brand-bars span:nth-child(3){height:11px;animation-delay:.36s;}.hp-brand-bars span:nth-child(4){height:18px;background:#60a5fa;animation-delay:.54s;}
@keyframes hpBarPulse{0%,100%{opacity:1;transform:scaleY(1);}50%{opacity:.35;transform:scaleY(.45);}}
.hp-brand-divider{width:1px;height:16px;background:rgba(59,130,246,.3);}
.hp-brand-name{font-size:13px;font-weight:700;letter-spacing:.02em;color:rgba(255,255,255,.55);}
.hp-brand-name::after{content:'';display:inline-block;width:5px;height:5px;border-radius:50%;background:#3b82f6;margin-left:6px;vertical-align:middle;box-shadow:0 0 8px #3b82f6;animation:hpPulse 2.2s ease-in-out infinite;}
.hp-brand-intel{font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:rgba(59,130,246,.55);}
@keyframes hpPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.3;transform:scale(.65);}}
.hp-title{margin:0 0 36px;line-height:.88;letter-spacing:-.052em;display:flex;flex-direction:column;align-items:center;}
.hp-line{display:block;}
.hp-line-1{font-size:clamp(72px,12vw,162px);font-weight:900;color:#ffffff;animation:hpFadeUp .8s .12s ease both;text-shadow:0 0 120px rgba(59,130,246,.12);}
.hp-line-2{display:flex;align-items:baseline;gap:0;animation:hpFadeUp .8s .22s ease both;}
.hp-game{font-size:clamp(80px,13.5vw,180px);font-weight:900;background:linear-gradient(90deg,#3b82f6 0%,#60a5fa 35%,#93c5fd 55%,#60a5fa 75%,#3b82f6 100%);background-size:220%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:hpGradMove 4s linear infinite,hpFadeUp .8s .22s ease both;filter:drop-shadow(0 0 50px rgba(59,130,246,.3));}
@keyframes hpGradMove{0%{background-position:0% 50%;}100%{background-position:220% 50%;}}
.hp-period{font-size:clamp(80px,13.5vw,180px);font-weight:900;color:#fff;-webkit-text-fill-color:#fff;display:inline-block;animation:hpDotBounce 2.8s 1s cubic-bezier(.34,1.56,.64,1) both;}
@keyframes hpDotBounce{0%{opacity:0;transform:translateY(20px) scale(.35);}60%{opacity:1;transform:translateY(-7px) scale(1.12);}80%{transform:translateY(3px) scale(.96);}100%{opacity:1;transform:translateY(0) scale(1);}}
.hp-tagline{font-size:clamp(9px,1vw,11px);font-weight:700;letter-spacing:.26em;text-transform:uppercase;color:rgba(59,130,246,.4);animation:hpFadeUp .8s .5s ease both;}
.hp-scroll-cue{margin-top:60px;display:flex;flex-direction:column;align-items:center;animation:hpFadeUp .8s .72s ease both;}
.hp-scroll-line{width:1px;height:52px;background:linear-gradient(180deg,rgba(59,130,246,.5) 0%,transparent 100%);animation:hpScrollPulse 2s ease-in-out infinite;}
@keyframes hpScrollPulse{0%,100%{transform:scaleY(1);opacity:.7;}50%{transform:scaleY(.4);opacity:.2;}}
@keyframes hpFadeUp{from{opacity:0;transform:translateY(22px);}to{opacity:1;transform:translateY(0);}}
.hp-blip{position:absolute;border-radius:50%;pointer-events:none;z-index:2;animation:hpBlipPulse var(--dur,2s) var(--del,0s) ease-in-out infinite;}
@keyframes hpBlipPulse{0%,100%{opacity:.5;transform:scale(1);}50%{opacity:1;transform:scale(1.3);}}

/* ── Competition Hub ── */
.comp-hub{display:flex;flex-direction:column;gap:28px;}
.comp-group-header{display:flex;align-items:center;gap:8px;margin-bottom:12px;}
.comp-group-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.comp-group-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--m3-on-s-dim);}
.comp-group-count{font-size:9px;font-weight:700;color:var(--m3-on-s-dim);background:var(--m3-surface3);border:1px solid var(--m3-outline-var);border-radius:999px;padding:1px 7px;font-family:var(--font-mono);}
.comp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;}
.comp-card{padding:14px;cursor:pointer;height:100%;min-height:120px;display:flex;flex-direction:column;transition:transform .22s cubic-bezier(.2,0,0,1),border-color .2s;border-radius:28px;}
.comp-card:hover{border-color:var(--cc,var(--m3-outline));transform:translateY(-4px);}
.comp-card-inner{display:flex;flex-direction:column;height:100%;position:relative;}
.comp-card-bar{position:absolute;top:-14px;left:-14px;right:-14px;height:3px;background:var(--cc,var(--m3-primary));border-radius:20px 20px 0 0;transition:opacity .2s;}
.comp-card-head{display:flex;align-items:flex-start;gap:9px;margin-bottom:10px;}
.comp-logo-wrap{width:38px;height:38px;border-radius:12px;flex-shrink:0;background:color-mix(in srgb,var(--cc,#a8c7fa) 10%,transparent);border:1px solid color-mix(in srgb,var(--cc,#a8c7fa) 20%,transparent);display:flex;align-items:center;justify-content:center;transition:box-shadow .2s;}
.comp-title-wrap{flex:1;min-width:0;}
.comp-label{font-size:12px;font-weight:500;color:var(--m3-on-s);letter-spacing:-.01em;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.comp-teams{font-size:9px;color:var(--m3-on-s-dim);margin-top:2px;font-weight:500;}
.comp-live-badge{display:flex;align-items:center;gap:3px;padding:2px 6px;border-radius:999px;flex-shrink:0;background:rgba(255,107,107,.09);border:1px solid rgba(255,107,107,.2);font-size:9px;font-weight:700;color:var(--m3-red);font-family:var(--font-mono);}
.comp-features{display:flex;flex-wrap:wrap;gap:4px;flex:1;margin-bottom:10px;align-content:flex-start;}
.comp-footer{display:flex;align-items:center;justify-content:space-between;font-size:10px;font-weight:500;padding-top:8px;border-top:1px solid var(--m3-outline-var);transition:color .15s;}
@media(max-width:600px){.comp-grid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;}.comp-card{padding:12px;min-height:110px;}.comp-logo-wrap{width:32px;height:32px;}.comp-label{font-size:11px;}.comp-hub{gap:22px;}}
@media(max-width:380px){.comp-grid{grid-template-columns:1fr 1fr;}}

/* ── Mobile responsive overrides ── */
@media(max-width:820px){
  .s{padding:36px 0;}.s--last{padding-bottom:60px;}
  .w{padding:0 16px;}
  .hd{flex-direction:column;gap:8px;margin-bottom:20px;}
  .hd .sa{align-self:flex-start;}
  .h2{font-size:clamp(18px,5vw,24px);}
  .g{border-radius:20px;}.g:hover{transform:none;}
  .frow:hover{transform:none;}
  .mc:hover{transform:none;}
  .tfl{background:linear-gradient(90deg,var(--m3-bg),transparent);}
  .tfr{background:linear-gradient(-90deg,var(--m3-bg),transparent);}
}
@media(max-width:720px){.g2{grid-template-columns:1fr;}.gr{grid-template-columns:1fr;}.g3{grid-template-columns:1fr;}}
@media(max-width:600px){
  .gb{grid-template-columns:1fr 1fr;grid-auto-rows:140px;}
  .gp{grid-template-columns:1fr 1fr;}.gc{grid-template-columns:1fr 1fr;}
  .gfacts{grid-template-columns:1fr 1fr;}.gmodels{grid-template-columns:1fr;}
  .aw{grid-template-columns:1fr 1fr;}
  .hero{padding:72px 0 32px;min-height:auto;}
  .htitle{font-size:clamp(42px,12vw,68px);}
  .hsub{font-size:14px;}
  .btn{padding:10px 18px;font-size:12px;}
}
@media(max-width:600px){.ticker{height:36px;}.tickerchip{padding:3px 10px;font-size:10px;}}
@media(max-width:820px){.hs{padding-bottom:12px;}}
@media(max-width:480px){.strip{grid-template-columns:1fr 1fr;}}
@media(max-width:400px){.gb{grid-template-columns:1fr;}.gp{grid-template-columns:1fr;}.gc{grid-template-columns:1fr;}}
@media(max-width:600px){.hp-line-1{font-size:clamp(52px,14vw,78px);}.hp-game{font-size:clamp(58px,16vw,90px);}.hp-period{font-size:clamp(58px,16vw,90px);}.hp-scroll-cue{margin-top:40px;}.hp-scroll-line{height:36px;}.hp-brand{flex-wrap:wrap;justify-content:center;gap:8px;}}
@media(max-width:380px){.hp-line-1{font-size:46px;}.hp-game{font-size:52px;}.hp-period{font-size:52px;}}

`;


// ════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════
// DATA HOOKS — direct parallel fetches, same endpoints as LivePage /
//              PredictionsPage.  NO dependency on /api/home/dashboard.
//
// WHY: /api/home/dashboard is an aggregated cold-start endpoint.
//   If any upstream call inside it fails (cold Render instance, API-Football
//   rate limit, FPL bootstrap timeout) the whole payload returns empty arrays.
//   The sub-endpoints are individually cached and independently retried.
//
// STRATEGY per section:
//   fixtures  → same /api/matches/upcoming + /api/international/fixtures
//                used by LivePage (tested, reliable)
//   predictions → /api/home/top_predictions?league=epl  (same algo as
//                PredictionsPage's build_xg_from_team_stats call)
//   title race  → /api/home/title_race?league=epl
//   form table  → /api/home/form_table?league=epl
//   power ranks → /api/home/power_rankings?league=epl
//   xg leaders  → /api/home/xg_leaders?league=epl
//   fpl captains → /api/home/differential_captains
//   fpl values   → /api/home/value_players
//   transfer brief → /api/home/transfer_brief
//   analytics term → /api/home/analytics_term
//   defense table  → /api/home/defense_table?league=epl
//   model perf     → /api/home/model_metrics
//   performance    → /api/predictions/performance
//   accountability → /api/home/recent_results
//   model conf     → /api/home/model_confidence
//   model edges    → /api/home/model_edges
//   high scoring   → /api/home/high_scoring_matches
//
// Each section has its own loading + error state — one failure never
// blanks the rest of the page.
// ════════════════════════════════════════════════════════════════════════

// ── Retry wrapper — 3 attempts, exponential backoff (handles Render cold-start)
async function fetchWithRetry(path, opts = {}, retries = 3, backoffMs = 2500) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, backoffMs * Math.pow(1.8, i - 1)));
    try {
      const res = await fetch(`${BACKEND}${path}`, opts);
      if (res.ok) return res.json();
      if (res.status >= 400 && res.status < 500) throw new Error(`HTTP ${res.status}`);
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (e.name === "AbortError") throw e;
      lastErr = e;
    }
  }
  throw lastErr;
}

// ── Session-level cache (keyed by path, TTL in ms)
const _hpCache = {};
async function cachedFetch(path, ttlMs = 300_000) {
  const hit = _hpCache[path];
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data;
  const data = await fetchWithRetry(path);
  _hpCache[path] = { data, ts: Date.now() };
  return data;
}

// ── Fixtures hook (same logic as LivePage) ────────────────────────────
function useUpcomingData() {
  const [fixtures, setFixtures] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    let dead = false;
    const today = new Date().toISOString().split("T")[0];

    Promise.all([
      cachedFetch("/api/matches/upcoming", 120_000),
      cachedFetch(
        `/api/international/fixtures?date=${today}&days_back=0&days_ahead=2`,
        120_000
      ).catch(() => ({ fixtures: [] })),
    ])
      .then(([club, intl]) => {
        if (dead) return;
        const clubRaw = club?.matches || club?.data || [];
        const intlRaw = intl?.fixtures || [];
        // Normalise both shapes into a common fixture object
        const norm = (c) => ({
          fixture_id: c.fixture_id ?? c.id,
          home_team:  c.home_team  ?? c.homeTeam  ?? c.home_name ?? "?",
          away_team:  c.away_team  ?? c.awayTeam  ?? c.away_name ?? "?",
          home_logo:  c.home_logo  ?? c.teams?.home?.logo ?? "",
          away_logo:  c.away_logo  ?? c.teams?.away?.logo ?? "",
          home_score: c.home_score ?? c.goals?.home ?? null,
          away_score: c.away_score ?? c.goals?.away ?? null,
          status:     c.status     ?? c.status_short ?? "",
          minute:     c.minute     ?? c.elapsed ?? null,
          kickoff:    c.kickoff    ?? c.date ?? "",
          league_id:  c.league_id  ?? c.league?.id ?? null,
          league_name: c.league_name ?? c.league?.name ?? "",
        });
        // Merge, deduplicate by fixture_id
        const seen = new Set();
        const merged = [...clubRaw, ...intlRaw]
          .map(norm)
          .filter(f => {
            if (seen.has(f.fixture_id)) return false;
            seen.add(f.fixture_id);
            return true;
          });
        setFixtures(merged);
      })
      .catch(e => { if (!dead) setError(e.message); })
      .finally(() => { if (!dead) setLoading(false); });

    return () => { dead = true; };
  }, []);

  return { fixtures, loading, error };
}

// ── Per-section hooks — each fires independently ──────────────────────

function useSectionFetch(path, ttlMs = 300_000) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  useEffect(() => {
    let dead = false;
    cachedFetch(path, ttlMs)
      .then(d  => { if (!dead) setData(d); })
      .catch(e => { if (!dead) setError(e.message); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, [path]);
  return { data, loading, error };
}

// ── Master hook that assembles the same shape as the old `dash` object
//    so every existing section component keeps working without changes.
function useDashboardData() {
  // Each section fetches independently — Render cold-start can't kill them all
  const preds      = useSectionFetch("/api/home/top_predictions?league=epl",    180_000);
  const titleRace  = useSectionFetch("/api/home/title_race?league=epl",          600_000);
  const formTbl    = useSectionFetch("/api/home/form_table?league=epl&n=6",      600_000);
  const edges      = useSectionFetch("/api/home/model_edges",                    300_000);
  const highScore  = useSectionFetch("/api/home/high_scoring_matches?n=5",       300_000);
  const modelConf  = useSectionFetch("/api/home/model_confidence",               300_000);
  const powerRanks = useSectionFetch("/api/home/power_rankings?league=epl&n=8", 600_000);
  const xgLeaders  = useSectionFetch("/api/home/xg_leaders?league=epl&n=8",    3600_000);
  const diffCaps   = useSectionFetch("/api/home/differential_captains?n=6",    3600_000);
  const valuePlrs  = useSectionFetch("/api/home/value_players?n=6",            3600_000);
  const txBrief    = useSectionFetch("/api/home/transfer_brief",                 300_000);
  const analyTerm  = useSectionFetch("/api/home/analytics_term",               86400_000);
  const defTbl     = useSectionFetch("/api/home/defense_table?league=epl&n=6",  600_000);
  const modelMetr  = useSectionFetch("/api/home/model_metrics",                3600_000);
  const recentRes  = useSectionFetch("/api/home/recent_results?n=6",            300_000);
  const perfSum    = useSectionFetch("/api/predictions/performance?window=200", 3600_000);
  const acctSum    = useSectionFetch("/api/home/recent_results?n=10",           300_000);
  const heroStats  = useSectionFetch("/api/predictions/health",                 600_000);

  // Any critical section still loading = loading
  const loading = preds.loading || titleRace.loading;
  // Only surface an error if the two most critical sections both failed
  const error   = (preds.error && titleRace.error) ? preds.error : null;

  // Assemble the `dash` shape expected by all existing section components
  const dash = {
    top_predictions:       preds.data     ?? { predictions: [] },
    title_race:            titleRace.data ?? { top4: [] },
    form_table:            formTbl.data   ?? { table: [] },
    model_edges:           edges.data     ?? { edges: [] },
    high_scoring_matches:  highScore.data ?? { matches: [] },
    model_confidence:      modelConf.data ?? { high: 0, medium: 0, low: 0 },
    power_rankings:        powerRanks.data?? { rankings: [] },
    xg_leaders:            xgLeaders.data ?? { leaders: [] },
    differential_captains: diffCaps.data  ?? { captains: [] },
    value_players:         valuePlrs.data ?? { players: [] },
    transfer_brief:        txBrief.data   ?? {},
    analytics_term:        analyTerm.data ?? {},
    defense_table:         defTbl.data    ?? { table: [] },
    model_metrics:         modelMetr.data ?? { trend: [], by_market: [] },
    recent_results:        recentRes.data ?? { results: [] },
    // performance_summary shape — /api/predictions/performance returns it directly
    performance_summary:   perfSum.data   ?? { insufficient: true, verified_count: 0 },
    accountability_summary: acctSum.data  ?? { insufficient: true },
    hero_stats: {
      competitions_count: 9,
      fixtures_predicted: heroStats.data?.logged ?? heroStats.data?.total ?? 0,
      verified_accuracy:  perfSum.data?.overall_accuracy ?? 0,
    },
  };

  return { dash, loading, error };
}

// ════════════════════════════════════════════════════════════════════════
// UTILITY HOOKS & PRIMITIVES
// ════════════════════════════════════════════════════════════════════════

function useReveal(thr = 0.06) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setV(true); io.disconnect(); }
    }, { threshold: thr });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, v];
}

function CountUp({ to, suffix = "", dur = 900 }) {
  const [v, setV]  = useState(0);
  const [ref, vis] = useReveal(0.1);
  const ran        = useRef(false);
  useEffect(() => {
    if (!vis || ran.current || !to) return;
    ran.current = true;
    const t0 = performance.now();
    const go = ts => {
      const p = Math.min((ts - t0) / dur, 1);
      setV(Math.round((1 - Math.pow(1 - p, 4)) * to));
      if (p < 1) requestAnimationFrame(go);
    };
    requestAnimationFrame(go);
  }, [vis, to, dur]);
  return <span ref={ref} className="mn">{v}{suffix}</span>;
}

function Skel({ w = "100%", h = 13, r = 6 }) {
  return <div className="sk" style={{ width: w, height: h, borderRadius: r }} />;
}

function FormPip({ r }) {
  const c = r === "W" ? "#30d158" : r === "D" ? "#ff9f0a" : "#ff453a";
  return (
    <div className="fp" style={{ background: `${c}20`, border: `1px solid ${c}45`, color: c }}>
      {r}
    </div>
  );
}

function Badge({ label, color, sm = true }) {
  const dk = document.documentElement.getAttribute("data-theme") !== "light";
  return (
    <span className="bx" style={{
      background: dk ? `${color}18` : `${color}12`,
      border: `1px solid ${dk ? color + "30" : color + "20"}`,
      color,
      fontSize: sm ? 9 : 11,
      padding: sm ? "2px 8px" : "4px 12px",
    }}>
      {label}
    </span>
  );
}

/** Square icon chip — replaces all emoji usage */
function Icon({ color, size = 26, shape = "square" }) {
  const br = shape === "circle" ? "50%" : 8;
  return (
    <div className="iconf" style={{
      width: size, height: size, borderRadius: br,
      background: `${color}18`, border: `1px solid ${color}28`,
    }}>
      <div style={{ width: size * 0.36, height: size * 0.36, borderRadius: 2, background: color, opacity: .8 }} />
    </div>
  );
}

function Dot({ color = "#ff453a", size = 6 }) {
  return <div className="dot" style={{ "--dc": color, "--ds": `${size}px` }} />;
}

function Empty({ msg = "No data available" }) {
  return <div className="empty">{msg}</div>;
}

function ErrBox({ msg }) {
  return <div className="errbx">Failed to load — {msg}</div>;
}

// ── Canvas grid ───────────────────────────────────────────────────────────────
function CanvasGrid() {
  const c = useRef(null);
  useEffect(() => {
    const canvas = c.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, t = 0;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize(); window.addEventListener("resize", resize);
    const dk = () => document.documentElement.getAttribute("data-theme") !== "light";
    const draw = () => {
      const { width: W, height: H } = canvas; ctx.clearRect(0, 0, W, H);
      const SZ = 56, cols = Math.ceil(W / SZ) + 2, rows = Math.ceil(H / SZ) + 2;
      const ox = (t * .22) % SZ, oy = (t * .10) % SZ, d = dk(), ga = d ? 1 : .28;
      for (let i = -1; i < cols; i++) {
        const a = (0.016 + 0.007 * Math.sin(i * .4 + t * .006)) * ga;
        ctx.strokeStyle = `rgba(56,189,248,${a})`; ctx.lineWidth = .5;
        ctx.beginPath(); ctx.moveTo(i * SZ - ox, 0); ctx.lineTo(i * SZ - ox, H); ctx.stroke();
      }
      for (let j = -1; j < rows; j++) {
        const a = (0.016 + 0.007 * Math.sin(j * .5 + t * .004)) * ga;
        ctx.strokeStyle = `rgba(56,189,248,${a})`; ctx.lineWidth = .5;
        ctx.beginPath(); ctx.moveTo(0, j * SZ - oy); ctx.lineTo(W, j * SZ - oy); ctx.stroke();
      }
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const p = Math.sin(i * .8 + j * .6 + t * .032);
        if (p > .72) {
          ctx.fillStyle = `rgba(52,211,153,${(p - .72) * .38 * (d ? 1 : .22)})`;
          ctx.beginPath(); ctx.arc(i * SZ - ox, j * SZ - oy, 1.4, 0, Math.PI * 2); ctx.fill();
        }
      }
      t++; raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={c} className="cv" />;
}

function Particles() {
  const pts = useMemo(() => Array.from({ length: 24 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    sz: .7 + Math.random() * 2.2, dur: 10 + Math.random() * 18,
    del: -Math.random() * 22, c: ["10,132,255","48,209,88","191,90,242","255,159,10","56,189,248"][i % 5],
    tx: (Math.random() - .5) * 36, ty: -(8 + Math.random() * 32),
    tx2: (Math.random() - .5) * 24, ty2: -(4 + Math.random() * 18),
  })), []);
  const dk = document.documentElement.getAttribute("data-theme") !== "light";
  const a = dk ? .55 : .14, ga = dk ? .35 : .07;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {pts.map(p => (
        <div key={p.id} className="ptcl" style={{
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.sz, height: p.sz,
          background: `rgba(${p.c},${a})`, boxShadow: `0 0 ${p.sz * 3}px rgba(${p.c},${ga})`,
          "--dur": `${p.dur}s`, "--del": `${p.del}s`,
          "--tx": `${p.tx}px`, "--ty": `${p.ty}px`,
          "--tx2": `${p.tx2}px`, "--ty2": `${p.ty2}px`,
        }} />
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 1 — HERO
// ════════════════════════════════════════════════════════════════════════
// ── Hero-only canvas ─────────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════
// HERO — CONCEPT 1: RADAR PULSE
// Canvas draws: concentric radar rings + cross-hairs + sweep arm
// Blip dots placed via CSS absolute positioning
// ════════════════════════════════════════════════════════════════════════

function RadarCanvas() {
  const c = useRef(null);
  useEffect(() => {
    const canvas = c.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf, angle = 0;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2, cy = H / 2;
      const maxR = Math.min(W, H) * 0.54;
      const rings = 5;
      const ringCol = 'rgba(59,130,246,0.13)';
      const crossCol = 'rgba(59,130,246,0.07)';

      // Concentric rings
      for (let i = 1; i <= rings; i++) {
        const r = (maxR / rings) * i;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = ringCol;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      // Cross-hairs
      ctx.strokeStyle = crossCol;
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy); ctx.stroke();
      // Diagonals
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(cx - maxR * 0.72, cy - maxR * 0.72); ctx.lineTo(cx + maxR * 0.72, cy + maxR * 0.72); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + maxR * 0.72, cy - maxR * 0.72); ctx.lineTo(cx - maxR * 0.72, cy + maxR * 0.72); ctx.stroke();
      ctx.globalAlpha = 1;

      // Sweep arm
      const sweepX = cx + Math.cos(angle) * maxR;
      const sweepY = cy + Math.sin(angle) * maxR;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(sweepX, sweepY);
      ctx.strokeStyle = 'rgba(59,130,246,0.45)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Sweep fill — fan arc behind the arm
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxR, angle - Math.PI * 0.18, angle);
      ctx.closePath();
      ctx.fillStyle = 'rgba(59,130,246,0.045)';
      ctx.fill();

      // Fading trail arcs
      for (let t = 1; t <= 3; t++) {
        const a0 = angle - (Math.PI * 0.18 * t / 3);
        const a1 = angle - (Math.PI * 0.18 * (t - 1) / 3);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxR, a0, a1);
        ctx.closePath();
        ctx.fillStyle = `rgba(59,130,246,${0.025 / t})`;
        ctx.fill();
      }

      // Centre dot
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(59,130,246,0.7)';
      ctx.fill();

      angle += 0.008;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={c} className="hp-canvas" />;
}

// Fixed blip positions (% from center, as offsets)
const BLIPS = [
  { top: '32%', left: '63%', size: 8,  color: '#60a5fa', glow: 'rgba(96,165,250,0.8)',  dur: '2.1s', del: '0s'    },
  { top: '54%', left: '34%', size: 6,  color: '#34d399', glow: 'rgba(52,211,153,0.8)',  dur: '1.8s', del: '0.5s'  },
  { top: '26%', left: '44%', size: 7,  color: '#a78bfa', glow: 'rgba(167,139,250,0.8)', dur: '2.4s', del: '0.9s'  },
  { top: '66%', left: '58%', size: 5,  color: '#f59e0b', glow: 'rgba(245,158,11,0.8)',  dur: '2.0s', del: '1.3s'  },
  { top: '42%', left: '72%', size: 6,  color: '#60a5fa', glow: 'rgba(96,165,250,0.8)',  dur: '2.6s', del: '0.3s'  },
  { top: '72%', left: '38%', size: 5,  color: '#34d399', glow: 'rgba(52,211,153,0.8)',  dur: '1.9s', del: '1.7s'  },
  { top: '20%', left: '58%', size: 4,  color: '#f59e0b', glow: 'rgba(245,158,11,0.8)',  dur: '2.3s', del: '0.7s'  },
  { top: '60%', left: '22%', size: 5,  color: '#a78bfa', glow: 'rgba(167,139,250,0.8)', dur: '2.2s', del: '2.0s'  },
];

function HeroSection() {
  return (
    <section className="hero-pure">
      {/* Radar canvas — rings + sweep */}
      <RadarCanvas />

      {/* Scan-line texture */}
      <div className="hp-scan" />

      {/* Radial vignette — keeps edges dark */}
      <div className="hp-vignette" />

      {/* Blip dots scattered over the radar */}
      {BLIPS.map((b, i) => (
        <div key={i} className="hp-blip" style={{
          top: b.top, left: b.left,
          width: b.size, height: b.size,
          background: b.color,
          boxShadow: `0 0 ${b.size * 2}px ${b.glow}`,
          '--dur': b.dur, '--del': b.del,
        }} />
      ))}

      {/* Bottom beam */}
      <div className="hp-beam" />
      <div className="hp-beam-top" />

      {/* ── TEXT CONTENT ── */}
      <div className="hp-center">

        {/* Brand row: bars + StatinSite + divider + Football Intelligence */}
        <div className="hp-brand">
          <div className="hp-brand-bars">
            <span /><span /><span /><span />
          </div>
          <span className="hp-brand-name">StatinSite</span>
          <span className="hp-brand-divider" />
          <span className="hp-brand-intel">Football Intelligence</span>
        </div>

        {/* Main title */}
        <h1 className="hp-title">
          <span className="hp-line hp-line-1">Read The</span>
          <span className="hp-line hp-line-2">
            <span className="hp-game">Game</span>
            <span className="hp-period">.</span>
          </span>
        </h1>

        {/* Tagline */}
        <div className="hp-tagline">
          ELO &middot; DIXON-COLES &middot; REAL xG &middot; POISSON
        </div>

        {/* Scroll cue */}
        <div className="hp-scroll-cue">
          <div className="hp-scroll-line" />
        </div>

      </div>
    </section>
  );
}

function LiveStrip({ fixtures }) {
  const nav  = useNavigate();
  const live = fixtures.filter(f => LIVE_SET.has(f.status));
  if (!live.length) return null;
  const chips = [...live, ...live, ...live];
  return (
    <div className="ticker">
      <div className="tickerfade tfl" /><div className="tickerfade tfr" />
      <div className="tickertrack" style={{ animationDuration: `${Math.max(live.length * 7, 24)}s` }}>
        {chips.map((f, i) => (
          <div key={i} className="tickerchip" onClick={() => nav(`/match/${f.fixture_id}`)}>
            <Dot size={5} />
            {f.home_logo && <img src={f.home_logo} width={14} height={14} style={{ objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />}
            <span>{f.home_team?.split(" ").slice(-1)[0]}</span>
            <span className="mn" style={{ fontWeight: 900 }}>{f.home_score ?? 0}–{f.away_score ?? 0}</span>
            <span>{f.away_team?.split(" ").slice(-1)[0]}</span>
            {f.away_logo && <img src={f.away_logo} width={14} height={14} style={{ objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />}
            {f.minute && <span className="mn" style={{ fontSize: 9, color: "#ff453a" }}>{f.minute}'</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 3 — TOP PREDICTIONS
// dashboard.top_predictions.predictions[]
// ════════════════════════════════════════════════════════════════════════
function PredCard({ p, idx }) {
  const nav = useNavigate();
  const [ref, vis] = useReveal(.05);
  const hp = p.homeProb || 0, dp = p.draw || 0, ap = p.awayProb || 0;
  const fp = Math.max(hp, ap);
  const cc = (p.conf_pct || 50) >= 70 ? "#30d158" : (p.conf_pct || 50) >= 55 ? "#ff9f0a" : "#ff453a";
  return (
    <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(16px)", transition: `all .45s ease ${idx * 55}ms`, flexShrink: 0, width: 280 }}>
      <div className="g" style={{ padding: 18, cursor: "pointer" }} onClick={() => p.fixture_id && nav(`/match/${p.fixture_id}`)}>
        <div className="gi">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: "var(--text-dim)", letterSpacing: ".12em" }}>{p.league || "League"}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: cc }} />
              <span className="mn" style={{ fontSize: 9, fontWeight: 800, color: cc }}>{p.conf_pct || 50}%</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
              {p.home_logo && <img src={p.home_logo} width={22} height={22} style={{ objectFit: "contain", flexShrink: 0 }} onError={e => e.currentTarget.style.display = "none"} />}
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.home}</span>
            </div>
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div className="mn" style={{ fontSize: 14, fontWeight: 900, color: "var(--text)" }}>{p.score || "1-0"}</div>
              <div style={{ fontSize: 7, color: "var(--text-dim)" }}>predicted</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0, justifyContent: "flex-end" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{p.away}</span>
              {p.away_logo && <img src={p.away_logo} width={22} height={22} style={{ objectFit: "contain", flexShrink: 0 }} onError={e => e.currentTarget.style.display = "none"} />}
            </div>
          </div>
          <div className="pb">
            <div style={{ flex: hp, background: "#0a84ff", opacity: .85 }} />
            <div style={{ flex: dp, background: "var(--border-strong)" }} />
            <div style={{ flex: ap, background: "#30d158", opacity: .85 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
            <span className="mn" style={{ color: "#0a84ff", fontWeight: 900 }}>{hp}%</span>
            <span style={{ color: "var(--text-dim)" }}>D {dp}%</span>
            <span className="mn" style={{ color: "#30d158", fontWeight: 900 }}>{ap}%</span>
          </div>
          {(p.xg_home != null || fp >= 58) && (
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", fontSize: 9, color: "var(--text-muted)" }}>
              {p.xg_home != null && <span>xG <span className="mn" style={{ color: "var(--text)" }}>{Number(p.xg_home).toFixed(1)}–{Number(p.xg_away).toFixed(1)}</span></span>}
              {fp >= 58 && <Badge label={`${fp}%`} color={p.col || "#0a84ff"} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TopPredictions({ dash, loading, error }) {
  const [ref, vis] = useReveal(.04);
  const preds = dash?.top_predictions?.predictions ?? [];
  return (
    <section className="s"><div className="w">
      <div ref={ref} className="hd" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div><div className="ey">— Model Output</div><h2 className="h2">Today's Top Predictions</h2></div>
        <Link to="/predictions/premier-league" className="sa">All predictions →</Link>
      </div>
      {error
        ? <ErrBox msg={error} />
        : <div className="hs">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ flexShrink: 0, width: 280, height: 200 }} className="g"><div style={{ padding: 18 }}><Skel w="60%" h={9} /><div style={{ marginTop: 12 }} /><Skel w="90%" h={12} /></div></div>
            ))
            : preds.length > 0
              ? preds.map((p, i) => <PredCard key={p.fixture_id || i} p={p} idx={i} />)
              : <Empty msg="Predictions loading — server may be waking up. Refresh in 30 seconds." />}
        </div>}
    </div></section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 4 — TITLE RACE
// dashboard.title_race.top4  +  dashboard.form_table.table
// ════════════════════════════════════════════════════════════════════════
function TitleRace({ dash, loading, error }) {
  const [ref, vis] = useReveal(.04);
  const race      = dash?.title_race?.top4 ?? [];
  const maxPts    = race.length > 0 ? Math.max(...race.map(t => t.points || 0)) : 1;
  const league    = dash?.title_race?.league ?? "Premier League";
  const formTable = dash?.form_table?.table ?? [];
  return (
    <section className="s"><div className="w">
      <div ref={ref} className="hd" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div><div className="ey">— Standings</div><h2 className="h2">Title Race · {league}</h2></div>
        <Link to="/league/epl" className="sa">Full table →</Link>
      </div>
      {error ? <ErrBox msg={error} /> : (
        <div className="g2">
          <div className="g" style={{ padding: 20 }}><div className="gi">
            <div className="sl">Top 4</div>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ height: 50, borderRadius: 12, marginBottom: 6 }} className="sk" />)
              : race.length > 0
                ? race.map((t, i) => {
                  const pct = maxPts > 0 ? (t.points / maxPts) * 100 : 0;
                  const tc  = t.trend === "up" ? "#30d158" : t.trend === "down" ? "#ff453a" : "#ff9f0a";
                  return (
                    <div key={t.team_id || i} className="tr">
                      <div className="mn" style={{ fontSize: 10, fontWeight: 900, color: "var(--text-dim)", minWidth: 20 }}>#{i + 1}</div>
                      {t.logo && <img src={t.logo} width={22} height={22} style={{ objectFit: "contain", flexShrink: 0 }} onError={e => e.currentTarget.style.display = "none"} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.team_name}</div>
                        <div style={{ display: "flex", gap: 3, marginTop: 4 }}>{(t.form_letters || []).slice(-5).map((r, j) => <FormPip key={j} r={r} />)}</div>
                      </div>
                      <div style={{ width: 70 }}>
                        <div style={{ height: 5, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#0a84ff,#30d158)", borderRadius: 999, transition: "width 1s" }} />
                        </div>
                      </div>
                      <div className="mn" style={{ fontSize: 14, fontWeight: 900, color: "var(--text)", minWidth: 24, textAlign: "right" }}>{t.points}</div>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: tc, boxShadow: `0 0 6px ${tc}`, flexShrink: 0 }} />
                    </div>
                  );
                })
                : <Empty msg="Standings loading…" />}
          </div></div>
          <div className="g" style={{ padding: 20 }}><div className="gi">
            <div className="sl">Form Table (last 5)</div>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ height: 38, borderRadius: 10, marginBottom: 5 }} className="sk" />)
              : formTable.length > 0
                ? formTable.slice(0, 5).map((t, i) => (
                  <div key={i} className="tr" style={{ padding: "9px 12px" }}>
                    <div className="mn" style={{ fontSize: 9, color: "var(--text-dim)", minWidth: 16 }}>{i + 1}</div>
                    {t.logo && <img src={t.logo} width={18} height={18} style={{ objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />}
                    <div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.team_name}</div>
                    <div style={{ display: "flex", gap: 2 }}>{(t.form5 || "").split("").map((r, j) => <FormPip key={j} r={r} />)}</div>
                    <Badge label={`${t.form_pts || 0}pts`} color="#30d158" />
                  </div>
                ))
                : <Empty msg="Form data loading…" />}
          </div></div>
        </div>
      )}
    </div></section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 5 — EDGE BOARD
// dashboard.model_edges.edges  +  dashboard.high_scoring_matches.matches
// ════════════════════════════════════════════════════════════════════════
function EdgeBoard({ dash, loading, error }) {
  const [ref, vis] = useReveal(.04);
  const nav    = useNavigate();
  const edges  = dash?.model_edges?.edges ?? [];
  const highXg = dash?.high_scoring_matches?.matches ?? [];
  return (
    <section className="s"><div className="w">
      <div ref={ref} className="hd" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div><div className="ey">— Value Signals</div><h2 className="h2">Model Edge Board</h2></div>
      </div>
      {error ? <ErrBox msg={error} /> : (
        <div className="g2">
          <div className="g" style={{ padding: 20 }}><div className="gi">
            <div className="sl">Best Edges Today</div>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ height: 80, borderRadius: 14, marginBottom: 8 }} className="sk" />)
              : edges.length > 0
                ? edges.map((e, i) => (
                  <div key={i} className="g gsm" style={{ padding: 16, marginBottom: 8 }}><div className="gi">
                    <div style={{ fontSize: 9, fontWeight: 900, color: e.col || "#30d158", letterSpacing: ".1em", marginBottom: 4 }}>MODEL EDGE{e.indicative_only ? " · INDICATIVE" : ""}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>{e.home} vs {e.away}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span className="mn" style={{ fontSize: 22, fontWeight: 900, color: e.col || "#30d158" }}>+{e.edge}%</span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{e.direction === "home" ? e.home : e.away} favoured</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 999, background: "var(--border)", marginTop: 8, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(e.model_prob || e.edge * 2, 100)}%`, height: "100%", background: e.col || "#30d158", borderRadius: 999 }} />
                    </div>
                  </div></div>
                ))
                : <Empty msg="No significant edges detected today" />}
          </div></div>
          <div className="g" style={{ padding: 20 }}><div className="gi">
            <div className="sl">Highest xG Fixtures</div>
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ height: 80, borderRadius: 14, marginBottom: 8 }} className="sk" />)
              : highXg.length > 0
                ? highXg.slice(0, 4).map((m, i) => {
                  const xgH = Number(m.xg_home) || 0, xgA = Number(m.xg_away) || 0;
                  const total = Number(m.total_xg) || (xgH + xgA);
                  return (
                    <div key={i} className="g gsm" style={{ padding: 16, marginBottom: 8, cursor: "pointer" }} onClick={() => m.fixture_id && nav(`/match/${m.fixture_id}`)}><div className="gi">
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                        <span className="mn" style={{ fontSize: 22, fontWeight: 900, color: "#0a84ff" }}>{total.toFixed(1)}</span>
                        <span style={{ fontSize: 9, fontWeight: 900, color: "var(--text-dim)", letterSpacing: ".1em" }}>TOTAL xG</span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>
                        {m.home?.split(" ").slice(-1)[0]} vs {m.away?.split(" ").slice(-1)[0]}
                      </div>
                      <div style={{ display: "flex", gap: 3, height: 4, borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ flex: xgH || 1, background: "#0a84ff", opacity: .8 }} />
                        <div style={{ flex: xgA || 1, background: "#30d158", opacity: .8 }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginTop: 3 }}>
                        <span className="mn" style={{ color: "#0a84ff" }}>{xgH.toFixed(1)}</span>
                        <span className="mn" style={{ color: "#30d158" }}>{xgA.toFixed(1)}</span>
                      </div>
                    </div></div>
                  );
                })
                : <Empty msg="Loading xG fixtures…" />}
          </div></div>
        </div>
      )}
    </div></section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 6 — COMMAND GRID (bento)
// ════════════════════════════════════════════════════════════════════════
const TOOLS = [
  { to: "/live",                       label: "Live Centre",    color: "#ff453a", span: 2, tall: true,  sub: "Real-time scores, events and minute-by-minute tracking",    tag: "LIVE DATA",    dk: "live"  },
  { to: "/predictions/premier-league", label: "Predictions",   color: "#0a84ff", span: 1, tall: false, sub: "Dixon-Coles Poisson model with ELO ratings",                 tag: "MODEL",        dk: "preds" },
  { to: "/match/0",                    label: "Match Hub",      color: "#bf5af2", span: 1, tall: false, sub: "Lineups, H2H, injuries, xG and live tactics",               tag: "INTELLIGENCE", dk: null    },
  { to: "/best-team",                  label: "FPL Best XI",    color: "#30d158", span: 1, tall: true,  sub: "Optimal FPL starting XI with captain signal",               tag: "FPL",          dk: "fpl"   },
  { to: "/squad-builder",              label: "Squad Builder",  color: "#30d158", span: 1, tall: false, sub: "Build your 15-man FPL squad under budget",                   tag: "FPL",          dk: null    },
  { to: "/player",                     label: "Players",        color: "#ff9f0a", span: 1, tall: false, sub: "500+ player profiles with xG and form",                     tag: "DATA",         dk: null    },
  { to: "/news",                       label: "News",           color: "#ff375f", span: 1, tall: false, sub: "Transfers, injuries and intelligence updates",               tag: "NEWS",         dk: null    },
  { to: "/games",                      label: "Mini Games",     color: "#ff9f0a", span: 1, tall: false, sub: "Score predictor, quizzes and challenges",                   tag: "GAMES",        dk: null    },
];

function ToolDataBit({ dk, fixtures, dash, loading }) {
  if (!dk) return null;
  if (dk === "live") {
    const live = fixtures.filter(f => LIVE_SET.has(f.status));
    if (loading) return <Skel w="60%" h={9} />;
    return <div className="mn" style={{ fontSize: 13, fontWeight: 900, color: "#ff453a" }}>{live.length > 0 ? `${live.length} live` : `${fixtures.filter(f => isToday(f.kickoff)).length} today`}</div>;
  }
  if (dk === "preds") {
    const conf = dash?.model_confidence, top = dash?.top_predictions?.predictions?.[0];
    if (loading || !dash) return <Skel w="60%" h={9} />;
    return <div>
      {conf && <div className="mn" style={{ fontSize: 12, fontWeight: 900, color: "#0a84ff" }}>{conf.avg_confidence}% · {conf.total} fixtures</div>}
      {top && <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{Math.max(top.homeProb || 0, top.awayProb || 0)}% {(top.homeProb > top.awayProb ? top.home : top.away)?.split(" ").slice(-1)[0]}</div>}
    </div>;
  }
  if (dk === "fpl") {
    // dashboard.differential_captains.captains
    const capt = dash?.differential_captains?.captains?.[0];
    if (loading || !dash) return <Skel w="60%" h={9} />;
    return capt ? <div>
      <div className="mn" style={{ fontSize: 12, fontWeight: 900, color: "#30d158" }}>{capt.name || capt.web_name}</div>
      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{capt.ep_next != null ? Number(capt.ep_next).toFixed(1) : "??"} EP</div>
    </div> : null;
  }
  return null;
}

function ToolCard({ tool, idx, fixtures, dash, loading }) {
  const [ref, vis] = useReveal(.04);
  const [hov, setHov] = useState(false);
  return (
    <div ref={ref} style={{ gridColumn: `span ${tool.span}`, gridRow: tool.tall ? "span 2" : "span 1", opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(20px)", transition: `opacity .55s ease ${idx * 50}ms,transform .55s ease ${idx * 50}ms` }}>
      <Link to={tool.to} style={{ textDecoration: "none", display: "block", height: "100%" }}>
        <div className="g tcard" style={{ height: "100%" }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
          <div className="gi" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 900, color: tool.color, letterSpacing: ".12em" }}>{tool.tag}</span>
                <Icon color={tool.color} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text)", letterSpacing: "-.02em", marginBottom: 6 }}>{tool.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{tool.sub}</div>
            </div>
            <div style={{ marginTop: 12 }}>
              <ToolDataBit dk={tool.dk} fixtures={fixtures} dash={dash} loading={loading} />
              <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: hov ? tool.color : "var(--text-dim)", transition: "color .15s" }}>Open {hov ? "→" : ""}</div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function CommandGrid({ fixtures, dash, loading }) {
  const [ref, vis] = useReveal(.04);
  return (
    <section className="s"><div className="w">
      <div ref={ref} className="hd" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div><div className="ey">— Platform</div><h2 className="h2">Intelligence Command Grid</h2></div>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>8 tools</span>
      </div>
      <div className="gb">{TOOLS.map((t, i) => <ToolCard key={t.to} tool={t} idx={i} fixtures={fixtures} dash={dash} loading={loading} />)}</div>
    </div></section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 7 — COMPETITION HUB
// Links use LEAGUE_CODES for slug normalisation — matches App.jsx routes
// ════════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════════
// SECTION 7 — COMPETITION HUB
// All competitions from LivePage, PredictionsPage, LiveMatchPage
// Grouped: Domestic · European · Cup · International
// ════════════════════════════════════════════════════════════════════════

const COMP_GROUPS = [
  {
    key: "domestic",
    label: "Domestic Leagues",
    color: "#60a5fa",
    comps: [
      { label: "Premier League",   slug: "premier-league",  leagueId: 39,  color: "#60a5fa", logo: "https://media.api-sports.io/football/leagues/39.png",  teams: 20, features: ["Predictions","Standings","Season Sim","xG"] },
      { label: "La Liga",          slug: "la-liga",         leagueId: 140, color: "#fb923c", logo: "https://media.api-sports.io/football/leagues/140.png", teams: 20, features: ["Predictions","Standings","Season Sim"] },
      { label: "Bundesliga",       slug: "bundesliga",      leagueId: 78,  color: "#f59e0b", logo: "https://media.api-sports.io/football/leagues/78.png",  teams: 18, features: ["Predictions","Standings","Season Sim"] },
      { label: "Serie A",          slug: "serie-a",         leagueId: 135, color: "#34d399", logo: "https://media.api-sports.io/football/leagues/135.png", teams: 20, features: ["Predictions","Standings"] },
      { label: "Ligue 1",          slug: "ligue-1",         leagueId: 61,  color: "#a78bfa", logo: "https://media.api-sports.io/football/leagues/61.png",  teams: 18, features: ["Predictions","Standings"] },
    ],
  },
  {
    key: "european",
    label: "European Club",
    color: "#3b82f6",
    comps: [
      { label: "Champions League",  slug: "champions-league",  leagueId: 2,   color: "#3b82f6", logo: "https://media.api-sports.io/football/leagues/2.png",   teams: 36, features: ["Predictions","Bracket"] },
      { label: "Europa League",     slug: "europa-league",     leagueId: 3,   color: "#f97316", logo: "https://media.api-sports.io/football/leagues/3.png",   teams: 36, features: ["Predictions","Bracket"] },
      { label: "Conference League", slug: "conference-league", leagueId: 848, color: "#22c55e", logo: "https://media.api-sports.io/football/leagues/848.png", teams: 36, features: ["Predictions","Bracket"] },
    ],
  },
  {
    key: "cup",
    label: "Domestic Cup",
    color: "#ef4444",
    comps: [
      { label: "FA Cup", slug: "fa-cup", leagueId: 45, color: "#ef4444", logo: "https://media.api-sports.io/football/leagues/45.png", teams: 736, features: ["Predictions","Bracket"] },
    ],
  },
  {
    key: "international",
    label: "International",
    color: "#fbbf24",
    comps: [
      { label: "World Cup",       slug: "world-cup",      leagueId: 1,   color: "#fbbf24", logo: "https://media.api-sports.io/football/leagues/1.png",   teams: 32,  features: ["Predictions","Bracket"] },
      { label: "Euros",           slug: "euros",          leagueId: 4,   color: "#3b82f6", logo: "https://media.api-sports.io/football/leagues/4.png",   teams: 24,  features: ["Predictions","Bracket"] },
      { label: "Euro Qual",       slug: "euro-qual",      leagueId: 960, color: "#60a5fa", logo: "https://media.api-sports.io/football/leagues/960.png", teams: 55,  features: ["Predictions"] },
      { label: "Nations League",  slug: "nations-league", leagueId: 5,   color: "#e879f9", logo: "https://media.api-sports.io/football/leagues/5.png",   teams: 54,  features: ["Predictions"] },
      { label: "Copa América",    slug: "copa-america",   leagueId: 9,   color: "#fbbf24", logo: "https://media.api-sports.io/football/leagues/9.png",   teams: 16,  features: ["Predictions","Bracket"] },
      { label: "AFCON",           slug: "afcon",          leagueId: 6,   color: "#22c55e", logo: "https://media.api-sports.io/football/leagues/6.png",   teams: 24,  features: ["Predictions","Bracket"] },
      { label: "Gold Cup",        slug: "gold-cup",       leagueId: 16,  color: "#f59e0b", logo: "https://media.api-sports.io/football/leagues/16.png",  teams: 16,  features: ["Predictions","Bracket"] },
      { label: "WCQ UEFA",        slug: "wcq-uefa",       leagueId: 32,  color: "#fbbf24", logo: "https://media.api-sports.io/football/leagues/32.png",  teams: 55,  features: ["Predictions"] },
      { label: "WCQ CONMEBOL",    slug: "wcq-conmebol",   leagueId: 29,  color: "#fbbf24", logo: "https://media.api-sports.io/football/leagues/29.png",  teams: 10,  features: ["Predictions"] },
      { label: "WCQ CONCACAF",    slug: "wcq-concacaf",   leagueId: 30,  color: "#fbbf24", logo: "https://media.api-sports.io/football/leagues/30.png",  teams: 30,  features: ["Predictions"] },
      { label: "WCQ CAF",         slug: "wcq-caf",        leagueId: 31,  color: "#fbbf24", logo: "https://media.api-sports.io/football/leagues/31.png",  teams: 54,  features: ["Predictions"] },
      { label: "WCQ AFC",         slug: "wcq-afc",        leagueId: 36,  color: "#fbbf24", logo: "https://media.api-sports.io/football/leagues/36.png",  teams: 47,  features: ["Predictions"] },
      { label: "Intl Friendly",   slug: "intl-friendly",  leagueId: 10,  color: "#94a3b8", logo: "https://media.api-sports.io/football/leagues/10.png",  teams: 0,   features: ["Predictions"] },
    ],
  },
];

// Flat list still needed for live count lookup
const COMPS = COMP_GROUPS.flatMap(g => g.comps);

function CompCard({ comp, idx, fixtures }) {
  const [hov, setHov] = useState(false);
  const [ref, vis]    = useReveal(.05);
  const liveCount     = fixtures.filter(f => LIVE_SET.has(f.status) && f.league_id === comp.leagueId).length;
  return (
    <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(14px)", transition: `all .4s ease ${idx * 25}ms` }}>
      <Link to={`/predictions/${comp.slug}`} style={{ textDecoration: "none" }}>
        <div
          className="g comp-card"
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{ "--cc": comp.color }}
        >
          <div className="gi comp-card-inner">
            {/* accent top bar */}
            <div className="comp-card-bar" style={{ opacity: hov ? 1 : 0 }} />
            {/* header row */}
            <div className="comp-card-head">
              <div className="comp-logo-wrap" style={{ boxShadow: hov ? `0 0 18px ${comp.color}40` : "none" }}>
                <img src={comp.logo} width={26} height={26} style={{ objectFit: "contain" }}
                  onError={e => e.currentTarget.style.display = "none"} />
              </div>
              <div className="comp-title-wrap">
                <div className="comp-label">{comp.label}</div>
                {comp.teams > 0 && <div className="comp-teams">{comp.teams} clubs</div>}
              </div>
              {liveCount > 0 && (
                <div className="comp-live-badge">
                  <Dot size={4} /><span>{liveCount}</span>
                </div>
              )}
            </div>
            {/* features */}
            <div className="comp-features">
              {comp.features.map(f => <Badge key={f} label={f} color={comp.color} />)}
            </div>
            {/* footer */}
            <div className="comp-footer" style={{ color: hov ? comp.color : "var(--text-dim)" }}>
              <span>Predictions</span>
              <span style={{ transform: hov ? "translateX(4px)" : "translateX(0)", transition: "transform .15s" }}>→</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function CompGroup({ group, fixtures, startIdx }) {
  const [ref, vis] = useReveal(.04);
  return (
    <div className="comp-group">
      <div ref={ref} className="comp-group-header" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(8px)", transition: "all .4s" }}>
        <div className="comp-group-dot" style={{ background: group.color, boxShadow: `0 0 8px ${group.color}` }} />
        <span className="comp-group-label">{group.label}</span>
        <span className="comp-group-count">{group.comps.length}</span>
      </div>
      <div className="comp-grid">
        {group.comps.map((c, i) => (
          <CompCard key={c.slug} comp={c} idx={startIdx + i} fixtures={fixtures} />
        ))}
      </div>
    </div>
  );
}

function CompetitionHub({ fixtures }) {
  const [ref, vis] = useReveal(.04);
  const totalComps = COMP_GROUPS.reduce((n, g) => n + g.comps.length, 0);
  let runningIdx = 0;
  return (
    <section className="s"><div className="w">
      <div ref={ref} className="hd" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div>
          <div className="ey">— Coverage</div>
          <h2 className="h2">{totalComps} Competitions. Full Intelligence.</h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, maxWidth: 520 }}>
            Poisson predictions, live scores and xG across domestic, European, cup and international football.
          </p>
        </div>
      </div>
      <div className="comp-hub">
        {COMP_GROUPS.map(group => {
          const si = runningIdx;
          runningIdx += group.comps.length;
          return <CompGroup key={group.key} group={group} fixtures={fixtures} startIdx={si} />;
        })}
      </div>
    </div></section>
  );
}


// ════════════════════════════════════════════════════════════════════════
// FPL TOOL SVG ICONS — geometric, stroke-based, no emoji
// ════════════════════════════════════════════════════════════════════════
function IconCaptain({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="9,1.5 11.2,6.8 17,7.3 12.8,11.3 14.2,17 9,14 3.8,17 5.2,11.3 1,7.3 6.8,6.8"
        stroke={color} strokeWidth="1.35" strokeLinejoin="round" fill={`${color}1a`} />
      <circle cx="9" cy="9.2" r="2" fill={color} opacity="0.85" />
    </svg>
  );
}

function IconValue({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 1L15.5 5V13L9 17L2.5 13V5L9 1Z" stroke={color} strokeWidth="1.35" strokeLinejoin="round" fill={`${color}12`} />
      <path d="M9 5.5V12.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M6.8 7.8C6.8 6.7 7.7 6 9 6C10.3 6 11.2 6.7 11.2 7.7C11.2 9.9 6.8 9.5 6.8 11.8C6.8 12.9 7.8 13.5 9 13.5C10.2 13.5 11.2 12.9 11.2 12"
        stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function IconTransfer({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="1.5" width="15" height="15" rx="3.5" stroke={color} strokeWidth="1" opacity="0.22" />
      <path d="M3.5 6.5H14.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11.5 3.5L14.5 6.5L11.5 9.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 11.5H3.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6.5 8.5L3.5 11.5L6.5 14.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconForm({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="1" y1="15.5" x2="17" y2="15.5" stroke={color} strokeWidth="1" opacity="0.28" strokeLinecap="round" />
      <polyline points="1.5,13 5,7.5 8,10 12,4.5 16.5,7.5"
        stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="5" cy="7.5" r="1.6" fill={color} />
      <circle cx="8" cy="10" r="1.6" fill={color} />
      <circle cx="12" cy="4.5" r="1.6" fill={color} />
      <circle cx="16.5" cy="7.5" r="1.6" fill={color} opacity="0.5" />
    </svg>
  );
}

function IconFixture({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="3.5" width="15" height="13" rx="3" stroke={color} strokeWidth="1.35" fill={`${color}10`} />
      <line x1="1.5" y1="7.5" x2="16.5" y2="7.5" stroke={color} strokeWidth="1" opacity="0.4" />
      <line x1="6" y1="1.5" x2="6" y2="5.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="12" y1="1.5" x2="12" y2="5.5" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="3.5" y="9.5" width="3" height="3" rx="1" fill={color} opacity="0.75" />
      <rect x="7.5" y="9.5" width="3" height="3" rx="1" fill={color} opacity="0.4" />
      <rect x="11.5" y="9.5" width="3" height="3" rx="1" fill={color} opacity="0.2" />
    </svg>
  );
}

function IconDiff({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="7.5" stroke={color} strokeWidth="1.35" fill={`${color}0d`} />
      <line x1="9" y1="2" x2="9" y2="3.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      <line x1="9" y1="14.5" x2="9" y2="16" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      <line x1="2" y1="9" x2="3.5" y2="9" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      <line x1="14.5" y1="9" x2="16" y2="9" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
      <path d="M9 5.5V9.5L12 11.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="9" r="1.4" fill={color} />
    </svg>
  );
}

function IconPrice({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 15L9 2.5L16 15Z" stroke={color} strokeWidth="1.35" strokeLinejoin="round" fill={`${color}10`} />
      <line x1="4.5" y1="10.5" x2="13.5" y2="10.5" stroke={color} strokeWidth="1.1" strokeLinecap="round" opacity="0.45" />
      <circle cx="9" cy="2.5" r="1.5" fill={color} />
      <line x1="9" y1="12" x2="9" y2="15.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

function IconLeague({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 1.5L11.2 6.5H16.5L12.5 9.5L14 14.5L9 11.5L4 14.5L5.5 9.5L1.5 6.5H6.8L9 1.5Z"
        stroke={color} strokeWidth="1.35" strokeLinejoin="round" fill={`${color}14`} />
      <line x1="9" y1="12" x2="9" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5.5" y1="16" x2="12.5" y2="16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════
// FPL_TOOLS — the 8 FPL tool links shown in the hub
// ════════════════════════════════════════════════════════════════════════
const FPL_TOOLS = [
  { SvgIcon: IconCaptain,  label: "Captain Picks",    sub: "Differential captain algorithm",  to: "/fpl/captains",      color: "#ff9f0a" },
  { SvgIcon: IconValue,    label: "Value Players",    sub: "Points-per-million leaders",       to: "/fpl/value",         color: "#30d158" },
  { SvgIcon: IconTransfer, label: "Transfer Targets", sub: "Best transfers for your budget",   to: "/fpl/transfers",     color: "#0a84ff" },
  { SvgIcon: IconForm,     label: "Form Rankings",    sub: "In-form players by xG + points",   to: "/fpl/form",          color: "#bf5af2" },
  { SvgIcon: IconFixture,  label: "Fixture Ticker",   sub: "Upcoming fixture difficulty",      to: "/fpl/fixtures",      color: "#ff453a" },
  { SvgIcon: IconDiff,     label: "Differentials",    sub: "Low-ownership high-upside picks",  to: "/fpl/differentials", color: "#ffd60a" },
  { SvgIcon: IconPrice,    label: "Price Rises",      sub: "Players likely to increase soon",  to: "/fpl/prices",        color: "#64d2ff" },
  { SvgIcon: IconLeague,   label: "Mini-League Edge", sub: "Beat your rivals this week",       to: "/fpl/minileague",    color: "#ff6b00" },
];

function FplRow({ t }) {
  const nav = useNavigate();
  const { SvgIcon, label, sub, to, color } = t;
  return (
    <div
      className="frow"
      style={{ "--frc": color }}
      onClick={() => nav(to)}
    >
      <div className="find" />
      <div style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: `linear-gradient(135deg, ${color}20 0%, ${color}08 100%)`,
        border: `1px solid ${color}2e`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <SvgIcon color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)", letterSpacing: "-.01em" }}>{label}</div>
        <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 1 }}>{sub}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.32 }}>
        <path d="M4 7h6M7.5 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function FPLHub({ dash }) {
  const [ref, vis] = useReveal(.04);
  const capts   = dash?.differential_captains?.captains?.slice(0, 4) ?? [];
  const valuePls = dash?.value_players?.players?.slice(0, 3) ?? [];
  return (
    <section className="s"><div className="w">
      <div ref={ref} className="hd" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div><div className="ey">— Fantasy Premier League</div><h2 className="h2">FPL Intelligence Hub</h2></div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 999, background: "var(--green-soft)", border: "1px solid rgba(48,209,88,.2)" }}>
          <Dot color="#30d158" size={6} />
          <span style={{ fontSize: 9, fontWeight: 900, color: "#30d158", letterSpacing: ".1em", fontFamily: "var(--font-mono)" }}>8 TOOLS ACTIVE</span>
        </div>
      </div>
      <div className="g2">
        <div className="g" style={{ padding: 20 }}><div className="gi">
          <div className="sl">Captain Picks · Differentials</div>
          {capts.length > 0
            ? capts.map((c, i) => (
              <div key={i} className="crow">
                <div className="mn" style={{ fontSize: 9, color: "var(--text-dim)", minWidth: 22 }}>{String(i + 1).padStart(2, "0")}</div>
                {c.photo && <img src={c.photo} width={28} height={28} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} onError={e => e.currentTarget.style.display = "none"} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)" }}>{c.name || c.web_name}</div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{c.team_short || c.team || ""} · {c.ownership != null ? Number(c.ownership).toFixed(1) : "?"}% owned</div>
                </div>
                <Badge label={`${Number(c.form || 0).toFixed(1)} form`} color="#ff9f0a" />
                <div className="mn" style={{ fontSize: 14, fontWeight: 900, color: "#30d158" }}>{c.ep_next != null ? Number(c.ep_next).toFixed(1) : "??"}</div>
                <div style={{ fontSize: 8, color: "var(--text-dim)" }}>EP</div>
              </div>
            ))
            : Array.from({ length: 3 }).map((_, i) => <div key={i} className="crow"><Skel w="70%" h={11} /></div>)}
          {valuePls.length > 0 && <>
            <div className="sl" style={{ marginTop: 16 }}>Value Picks (pts/£m)</div>
            {valuePls.map((p, i) => (
              <div key={i} className="crow">
                <div className="mn" style={{ fontSize: 9, color: "var(--text-dim)", minWidth: 16 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text)" }}>{p.name}</div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{p.team_short} · £{p.cost}m · {p.position}</div>
                </div>
                <Badge label={`${p.value_score}v`} color="#0a84ff" />
                <div className="mn" style={{ fontSize: 12, fontWeight: 900, color: "#30d158" }}>{p.total_points}</div>
                <div style={{ fontSize: 8, color: "var(--text-dim)" }}>pts</div>
              </div>
            ))}
          </>}
        </div></div>
        <div className="g" style={{ padding: 20 }}><div className="gi">
          <div className="sl">All FPL Tools</div>
          {FPL_TOOLS.map((t, i) => <FplRow key={t.to} t={t} i={i} dash={dash} />)}
        </div></div>
      </div>
    </div></section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 9 — TRENDING PLAYERS
// dashboard.xg_leaders.leaders  (fallback: dashboard.trending_players.items)
// Player links: /player?search=Name  (matches PlayerInsightPage route)
// ════════════════════════════════════════════════════════════════════════
function PlayerCard({ p, nav }) {
  return (
    <div className="g" style={{ padding: 16, cursor: "pointer" }} onClick={() => nav(`/player?search=${encodeURIComponent(p.name || "")}`)}>
      <div className="gi">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
          {p.photo && <img src={p.photo} width={36} height={36} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} onError={e => e.currentTarget.style.display = "none"} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name || p.web_name || p.lastname || "—"}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{p.team || p.team_name || ""}</div>
          </div>
          {p.per90 != null && (
            <div style={{ textAlign: "right" }}>
              <div className="mn" style={{ fontSize: 14, fontWeight: 900, color: "#0a84ff" }}>{Number(p.per90).toFixed(2)}</div>
              <div style={{ fontSize: 7, color: "var(--text-dim)" }}>G+A/90</div>
            </div>
          )}
        </div>
        {(p.goals != null || p.g_plus_a != null) && (
          <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--text-muted)" }}>
            {p.goals != null   && <span><span className="mn" style={{ color: "var(--text)", fontWeight: 900 }}>{p.goals}</span> G</span>}
            {p.assists != null && <span><span className="mn" style={{ color: "var(--text)", fontWeight: 900 }}>{p.assists}</span> A</span>}
            {p.g_plus_a != null && <span><span className="mn" style={{ color: "#ff9f0a", fontWeight: 900 }}>{p.g_plus_a}</span> G+A</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function TrendingPlayers({ dash, loading, error }) {
  const [ref, vis] = useReveal(.04);
  const nav        = useNavigate();
  const xgLeaders  = dash?.xg_leaders?.leaders?.slice(0, 6) ?? [];
  const items      = dash?.trending_players?.items?.slice(0, 6) ?? [];
  const showable   = xgLeaders.length > 0 ? xgLeaders : items;
  return (
    <section className="s"><div className="w">
      <div ref={ref} className="hd" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div><div className="ey">— Players</div><h2 className="h2">xG Leaders &amp; Form</h2></div>
        <Link to="/player" className="sa">Browse all →</Link>
      </div>
      {error ? <ErrBox msg={error} /> : (
        <div className="gp">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="g" style={{ padding: 16 }}><Skel w="70%" h={11} /><div style={{ marginTop: 8 }} /><Skel w="85%" h={9} /></div>)
            : showable.length > 0
              ? showable.map((p, i) => <PlayerCard key={i} p={p} nav={nav} />)
              : <Empty msg="Loading player data — server may be initialising." />}
        </div>
      )}
    </div></section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 10 — TRANSFER BRIEF + ANALYTICS TERM + DEFENCE TABLE
// dashboard.transfer_brief  |  dashboard.analytics_term  |  dashboard.defense_table.table
// ════════════════════════════════════════════════════════════════════════
function TransferBrief({ dash, loading, error }) {
  const [ref, vis] = useReveal(.04);
  const brief    = dash?.transfer_brief;
  const term     = dash?.analytics_term;
  const defTable = dash?.defense_table?.table ?? [];
  return (
    <section className="s"><div className="w">
      <div ref={ref} className="hd" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div><div className="ey">— Intelligence</div><h2 className="h2">Transfer Brief &amp; Analytics</h2></div>
        <Link to="/news" className="sa">All news →</Link>
      </div>
      {error ? <ErrBox msg={error} /> : (
        <div className="g3">
          {/* Transfer brief */}
          <div className="g" style={{ padding: 20 }}><div className="gi">
            <div className="sl">Transfer Brief</div>
            {loading || !brief
              ? <><Skel w="85%" h={10} /><div style={{ marginTop: 8 }} /><Skel w="65%" h={9} /><div style={{ marginTop: 6 }} /><Skel w="90%" h={9} /></>
              : <>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", lineHeight: 1.55, marginBottom: 12 }}>{brief.summary || "No major transfer news today."}</div>
                {(brief.key_transfers || []).slice(0, 3).map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 10, color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#0a84ff", flexShrink: 0, marginTop: 4 }} />
                    <span style={{ flex: 1 }}>{typeof t === "string" ? t : t.text || t.headline || ""}</span>
                  </div>
                ))}
              </>}
          </div></div>
          {/* Analytics term */}
          <div className="g" style={{ padding: 20 }}><div className="gi">
            <div className="sl">Today's Term</div>
            {loading || !term
              ? <><Skel w="50%" h={22} /><div style={{ marginTop: 8 }} /><Skel w="90%" h={9} /></>
              : <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${term.col || "#0a84ff"}18`, border: `1px solid ${term.col || "#0a84ff"}28`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: term.col || "#0a84ff", opacity: .8 }} />
                  </div>
                  <div>
                    <div className="mn" style={{ fontSize: 18, fontWeight: 900, color: term.col || "#0a84ff" }}>{term.short || term.term}</div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{term.value_label}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 10 }}>{term.definition}</div>
                {term.example && (
                  <div style={{ padding: "6px 10px", borderRadius: 10, background: "var(--bg-glass)", border: "1px solid var(--border)", fontSize: 10, fontFamily: "var(--font-mono)", color: term.col || "#0a84ff" }}>{term.example}</div>
                )}
              </>}
          </div></div>
          {/* Defence table */}
          <div className="g" style={{ padding: 20 }}><div className="gi">
            <div className="sl">Best Defences · EPL</div>
            {loading || defTable.length === 0
              ? Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ height: 28, borderRadius: 6, marginBottom: 5 }} className="sk" />)
              : defTable.slice(0, 5).map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--border-soft)" }}>
                  <span className="mn" style={{ fontSize: 9, color: "var(--text-dim)", minWidth: 16 }}>{i + 1}</span>
                  {t.logo && <img src={t.logo} width={16} height={16} style={{ objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />}
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.team_name}</span>
                  <span className="mn" style={{ fontSize: 11, fontWeight: 900, color: "#30d158" }}>{t.ga_pg}</span>
                  <span style={{ fontSize: 8, color: "var(--text-muted)" }}>GA/g</span>
                </div>
              ))}
          </div></div>
        </div>
      )}
    </div></section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 11 — POWER RANKINGS
// dashboard.power_rankings.rankings
// ════════════════════════════════════════════════════════════════════════
function PowerRankings({ dash, loading, error }) {
  const [ref, vis] = useReveal(.04);
  const rankings = dash?.power_rankings?.rankings ?? [];
  const league   = dash?.power_rankings?.league ?? "Premier League";
  return (
    <section className="s"><div className="w">
      <div ref={ref} className="hd" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div><div className="ey">— Composite Model</div><h2 className="h2">Power Rankings · {league}</h2></div>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Elo · Form · Goal Diff · PPG</span>
      </div>
      {error ? <ErrBox msg={error} /> : (
        <div className="gr">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <div key={i} style={{ height: 46, borderRadius: 14 }} className="sk" />)
            : rankings.length > 0
              ? rankings.map((t, i) => {
                const barW  = Math.round(t.power_pct || 0);
                const delta = t.rank_delta || 0;
                const dc    = delta > 0 ? "#30d158" : delta < 0 ? "#ff453a" : "var(--text-dim)";
                const ds    = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "=";
                return (
                  <div key={t.team_id || i} className="tr" style={{ borderRadius: 14 }}>
                    <div className="mn" style={{ fontSize: 10, fontWeight: 900, color: "#0a84ff", minWidth: 20 }}>#{i + 1}</div>
                    {t.logo && <img src={t.logo} width={20} height={20} style={{ objectFit: "contain", flexShrink: 0 }} onError={e => e.currentTarget.style.display = "none"} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.team_name}</div>
                      <div style={{ marginTop: 3, height: 4, borderRadius: 999, background: "var(--border)", overflow: "hidden", maxWidth: 140 }}>
                        <div style={{ width: `${barW}%`, height: "100%", background: "linear-gradient(90deg,#0a84ff,#bf5af2)", borderRadius: 999, transition: "width 1s" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 2 }}>{(t.form_letters || []).slice(-5).map((r, j) => <FormPip key={j} r={r} />)}</div>
                    <div className="mn" style={{ fontSize: 11, fontWeight: 900, color: "var(--text)", minWidth: 30, textAlign: "right" }}>{t.power_pct}%</div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: dc, minWidth: 18, textAlign: "right" }}>{ds}</div>
                  </div>
                );
              })
              : <Empty msg="Loading rankings…" />}
        </div>
      )}
    </div></section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 12 — MODEL PERFORMANCE & ACCOUNTABILITY
// dashboard.performance_summary  (home_accountability.py → performance_summary())
// dashboard.accountability_summary  (home_accountability.py → accountability_summary())
// ════════════════════════════════════════════════════════════════════════
function AccRing({ pct, color, size = 80 }) {
  const r    = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const off  = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth="5" fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="5" fill="none"
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 1s ease" }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{ fontFamily: "var(--font-mono)", fontSize: size / 5, fontWeight: 900, fill: color }}>{pct}%</text>
    </svg>
  );
}

function ModelPerformance({ dash, loading, error }) {
  const [ref, vis] = useReveal(.04);
  const perf  = dash?.performance_summary;
  const acct  = dash?.accountability_summary;
  const overallAcc  = perf?.overall_accuracy  ?? acct?.hit_rate               ?? null;
  const last30Acc   = perf?.last_30_accuracy                                   ?? null;
  const highConfAcc = perf?.confidence_bands?.find(b => b.bracket?.startsWith("High"))?.accuracy ?? acct?.high_confidence_hit_rate ?? null;
  const verifiedCount = perf?.verified_count ?? acct?.verified_count ?? 0;
  const pendingCount  = perf?.pending_count  ?? acct?.pending_count  ?? 0;
  const recentPreds   = acct?.recent_verified ?? [];
  const rollingAcc    = perf?.rolling_accuracy ?? [];
  const confBands     = perf?.confidence_bands ?? [];
  const avgConf       = perf?.average_confidence ?? null;
  const isInsufficient = perf?.insufficient && acct?.insufficient;
  return (
    <section className="s"><div className="w">
      <div ref={ref} className="hd" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div><div className="ey">— Verified Results Only</div><h2 className="h2">Model Performance &amp; Accountability</h2></div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 999, background: "var(--green-soft)", border: "1px solid rgba(48,209,88,.2)" }}>
          <Dot color="#30d158" size={6} />
          <span className="mn" style={{ fontSize: 9, fontWeight: 900, color: "#30d158", letterSpacing: ".1em" }}>{verifiedCount} VERIFIED · {pendingCount} PENDING</span>
        </div>
      </div>
      {error ? <ErrBox msg={error} /> : loading
        ? <div className="g2">{[0, 1].map(i => <div key={i} style={{ height: 200, borderRadius: 20 }} className="sk" />)}</div>
        : isInsufficient
          ? <div className="g" style={{ padding: "36px 24px", textAlign: "center" }}><div className="gi">
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>No verified predictions yet.</div>
            <div style={{ fontSize: 10, color: "var(--text-dim)" }}>Results are automatically checked after matches finish.</div>
          </div></div>
          : <div className="g2">
            {/* Left: rings + rolling + bands */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="g" style={{ padding: 20 }}><div className="gi">
                <div className="aw">
                  {[
                    { label: "Overall",   val: overallAcc,  color: "#30d158", sub: `${verifiedCount} verified` },
                    { label: "Last 30",   val: last30Acc,   color: "#0a84ff", sub: "Trending" },
                    { label: "High Conf", val: highConfAcc, color: "#ff9f0a", sub: "≥70% picks" },
                  ].map(({ label, val, color, sub }) => (
                    <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" }}>
                      {val != null
                        ? <AccRing pct={Math.round(val)} color={color} />
                        : <div style={{ width: 80, height: 80, borderRadius: "50%", border: "5px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--text-dim)" }}>—</div>}
                      <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text)" }}>{label}</div>
                      <div style={{ fontSize: 8, color: "var(--text-muted)" }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </div></div>
              {rollingAcc.length > 0 && <div className="g" style={{ padding: 18 }}><div className="gi">
                <div className="sl">Rolling Accuracy</div>
                {rollingAcc.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", minWidth: 55 }}>{r.window}</div>
                    <div style={{ flex: 1, height: 6, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
                      <div style={{ width: `${r.accuracy}%`, height: "100%", background: "linear-gradient(90deg,#0a84ff,#30d158)", borderRadius: 999, transition: "width 1s" }} />
                    </div>
                    <div className="mn" style={{ fontSize: 11, fontWeight: 900, color: "#30d158", minWidth: 35, textAlign: "right" }}>{r.accuracy}%</div>
                    <div style={{ fontSize: 8, color: "var(--text-muted)", minWidth: 22 }}>n={r.count}</div>
                  </div>
                ))}
              </div></div>}
              {confBands.length > 0 && <div className="g" style={{ padding: 18 }}><div className="gi">
                <div className="sl">Accuracy by Confidence Band</div>
                {confBands.map((b, i) => {
                  const bc = b.bracket?.startsWith("High") ? "#30d158" : b.bracket?.startsWith("Med") ? "#ff9f0a" : "#ff453a";
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: bc, minWidth: 80, whiteSpace: "nowrap" }}>{b.bracket}</div>
                      <div style={{ flex: 1, height: 6, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
                        <div style={{ width: `${b.accuracy || 0}%`, height: "100%", background: bc, borderRadius: 999, opacity: .8, transition: "width 1s" }} />
                      </div>
                      <div className="mn" style={{ fontSize: 11, fontWeight: 900, color: bc, minWidth: 35, textAlign: "right" }}>{b.accuracy != null ? `${b.accuracy}%` : "—"}</div>
                      <div style={{ fontSize: 8, color: "var(--text-muted)", minWidth: 28 }}>({b.count})</div>
                    </div>
                  );
                })}
                {avgConf != null && <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", fontSize: 10, color: "var(--text-muted)" }}>Avg confidence: <span className="mn" style={{ fontWeight: 900, color: "var(--text)" }}>{avgConf}%</span></div>}
              </div></div>}
            </div>
            {/* Right: recent verified */}
            <div className="g" style={{ padding: 20 }}><div className="gi">
              <div className="sl">Recent Verified Predictions</div>
              {recentPreds.length > 0
                ? recentPreds.slice(0, 8).map((p, i) => {
                  const ic = p.correct;
                  const cc = p.confidence >= 70 ? "#30d158" : p.confidence >= 55 ? "#ff9f0a" : "#ff453a";
                  return (
                    <div key={i} className="vrow">
                      <div style={{ width: 22, height: 22, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: ic ? "rgba(48,209,88,.12)" : "rgba(255,69,58,.12)", border: `1px solid ${ic ? "rgba(48,209,88,.3)" : "rgba(255,69,58,.25)"}` }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: ic ? "#30d158" : "#ff453a" }}>{ic ? "" : ""}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.home} {p.score !== "—" ? p.score : ""} {p.away}</div>
                        <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 1 }}>
                          Predicted: <span style={{ color: ic ? "#30d158" : "#ff453a", fontWeight: 700 }}>{p.predicted_outcome}</span>
                          {p.actual_outcome && <> · Actual: <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>{p.actual_outcome}</span></>}
                        </div>
                      </div>
                      <Badge label={`${p.confidence}%`} color={cc} />
                    </div>
                  );
                })
                : <Empty msg="No verified results yet." />}
            </div></div>
          </div>}
    </div></section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 13 — INTELLIGENCE STACK
// ════════════════════════════════════════════════════════════════════════
const MODELS = [
  { name: "Dixon-Coles",   desc: "Low-score corrected Poisson model with τ-adjustment",            color: "#0a84ff" },
  { name: "ELO Ratings",   desc: "Dynamic team strength updated after every match",                color: "#bf5af2" },
  { name: "xG Modelling",  desc: "Expected goals from shot location and context",                  color: "#30d158" },
  { name: "Monte Carlo",   desc: "8,000-run season simulation for final table probabilities",      color: "#ff9f0a" },
  { name: "Form Weighting",desc: "Exponentially decayed recent form with injury signal",           color: "#ff375f" },
  { name: "Market Edge",   desc: "Model probability vs implied odds — value detection",            color: "#ff9f0a" },
];
const FACTS = [
  { val: "9",    label: "Competitions" },
  { val: "500+", label: "Players"      },
  { val: "8",    label: "FPL Tools"    },
  { val: "8K",   label: "Sims / Run"   },
];

function IntelligenceStack() {
  const [ref, vis] = useReveal(.04);
  return (
    <section className="s s--last"><div className="w">
      <div ref={ref} className="hd" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div><div className="ey">— Platform</div><h2 className="h2">The Intelligence Stack</h2></div>
      </div>
      <div className="g2">
        <div>
          <div className="sl">Data Models</div>
          <div className="gmodels">
            {MODELS.map(m => (
              <div key={m.name} className="mc" style={{ "--mcc": m.color }}>
                <div className="mcd" />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)", marginBottom: 3 }}>{m.name}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.45 }}>{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="sl">Platform Scale</div>
          <div className="gfacts">
            {FACTS.map(f => (
              <div key={f.label} className="g gsm" style={{ padding: "18px 14px", textAlign: "center" }}><div className="gi">
                <div className="mn" style={{ fontSize: 26, fontWeight: 900, color: "var(--text)", letterSpacing: "-.04em", marginBottom: 4 }}>{f.val}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>{f.label}</div>
              </div></div>
            ))}
          </div>
          <div className="g" style={{ padding: 16 }}><div className="gi" style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.6 }}>
            All predictions use real season statistics from API-Football Pro. Model probabilities are indicative — not guaranteed outcomes. Win probability, momentum and shot map data are available per fixture via the match intelligence tools.
          </div></div>
        </div>
      </div>
    </div></section>
  );
}

function Div() { return <div className="dv" />; }

// ════════════════════════════════════════════════════════════════════════
// ROOT — wires everything together
// ════════════════════════════════════════════════════════════════════════
export default function HomePage() {
  const { fixtures, loading: ul, error: ue } = useUpcomingData();
  const { dash,     loading: dl, error: de } = useDashboardData();
  return (
    <div className="hp">
      <style>{CSS}</style>
      <HeroSection />
      <LiveStrip    fixtures={fixtures} />
      <TitleRace    dash={dash} loading={dl} error={de} />
      <Div /><CommandGrid  fixtures={fixtures} dash={dash} loading={dl || ul} />
      <Div /><CompetitionHub fixtures={fixtures} />
      <Div /><FPLHub       dash={dash} />
      <Div /><TransferBrief   dash={dash} loading={dl} error={de} />
      <Div /><PowerRankings   dash={dash} loading={dl} error={de} />
      <Div /><IntelligenceStack />
    </div>
  );
}