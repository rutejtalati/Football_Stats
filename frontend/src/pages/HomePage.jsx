// ═══════════════════════════════════════════════════════════════════════
// StatinSite — HomePage v10  "Unified API + Suave Intelligence"
// ═══════════════════════════════════════════════════════════════════════
//
// ARCHITECTURE:
//  • ALL fetches go through api.js — no hardcoded URLs in this file
//  • getDashboard()  → /api/home/dashboard  (single aggregated call)
//  • getUpcoming()   → /api/matches/upcoming
//  • withCache wraps both; sessionStorage TTL in api.js
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
import { getDashboard, getUpcoming, LEAGUE_CODES } from "@/api/api";

const LIVE_SET = new Set(["1H","2H","HT","ET","BT","P"]);
const isToday  = d => d && new Date(d).toDateString() === new Date().toDateString();

// ════════════════════════════════════════════════════════════════════════
// STYLES (inline — no extra CSS file needed)
// ════════════════════════════════════════════════════════════════════════
const CSS = `
/* ── iOS glass card ── */
.g{background:var(--bg-card);border:1px solid var(--border);border-radius:20px;box-shadow:var(--shadow-card);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);position:relative;overflow:hidden;transition:transform .22s cubic-bezier(.34,1.56,.64,1),box-shadow .22s,border-color .22s;}
.g::before{content:'';position:absolute;inset:0;border-radius:20px;pointer-events:none;z-index:0;background:linear-gradient(135deg,rgba(255,255,255,.055) 0%,transparent 55%);}
[data-theme="light"] .g::before{background:linear-gradient(135deg,rgba(255,255,255,.85) 0%,rgba(255,255,255,.3) 55%);}
.g:hover{transform:translateY(-5px) scale(1.012);box-shadow:var(--shadow-lift);border-color:var(--border-strong);}
.g:active{transform:translateY(-2px) scale(1.004);}
.gi{position:relative;z-index:1;}
.gsm::before,.gsm{border-radius:14px;}

/* ── Layout ── */
.hp{background:var(--bg);}
.s{padding:52px 0;}.s--last{padding-bottom:80px;}
.w{max-width:1280px;margin:0 auto;padding:0 24px;}
.hd{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;gap:12px;}
.ey{font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:var(--text-dim);margin-bottom:6px;}
.h2{font-size:clamp(20px,2.2vw,26px);font-weight:900;letter-spacing:-.03em;color:var(--text);line-height:1.15;}
.sa{font-size:12px;font-weight:700;color:var(--blue);white-space:nowrap;transition:opacity .15s;flex-shrink:0;margin-top:4px;}.sa:hover{opacity:.65;}
.dv{height:1px;background:linear-gradient(90deg,transparent,var(--border) 20%,var(--border) 80%,transparent);margin:0 24px;}
.sl{font-size:9px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:var(--text-dim);margin-bottom:12px;}

/* ── Grids ── */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
.gp{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
.gr{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.gb{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:176px;gap:14px;}
.gc{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
.gfacts{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px;}
.gmodels{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
@media(max-width:1100px){.gb{grid-template-columns:repeat(3,1fr);}}
@media(max-width:900px){.g3,.gp{grid-template-columns:1fr 1fr;}.gb{grid-template-columns:1fr 1fr;}.gc{grid-template-columns:1fr 1fr;}}
@media(max-width:720px){.g2,.gr{grid-template-columns:1fr;}}
@media(max-width:600px){.g3,.gp,.gb,.gc{grid-template-columns:1fr;}.gfacts{grid-template-columns:1fr 1fr;}.gmodels{grid-template-columns:1fr;}.w{padding:0 14px;}.s{padding:36px 0;}}

/* ── Hero ── */
.hero{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--bg);padding:100px 0 60px;}
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
.hbadge{display:inline-flex;align-items:center;gap:7px;padding:5px 16px;border-radius:999px;background:var(--bg-glass);border:1px solid var(--border-strong);font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:28px;animation:fadeup .7s ease both;}
.htitle{font-size:clamp(48px,7vw,96px);font-weight:900;letter-spacing:-.045em;line-height:1;color:var(--text);margin-bottom:24px;animation:fadeup .7s .12s ease both;}
.tgrad{background:linear-gradient(110deg,#0a84ff 0%,#30d158 42%,#bf5af2 78%,#0a84ff 100%);background-size:240%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:gmove 5s linear infinite;}
@keyframes gmove{0%{background-position:0% 50%;}100%{background-position:240% 50%;}}
.hsub{font-size:15px;color:var(--text-secondary);line-height:1.65;max-width:500px;margin:0 auto 36px;animation:fadeup .7s .22s ease both;}
.ctas{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:40px;animation:fadeup .7s .32s ease both;}
.btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:7px;padding:12px 24px;border-radius:14px;font-size:13px;font-weight:700;letter-spacing:-.01em;border:none;cursor:pointer;font-family:inherit;transition:transform .16s cubic-bezier(.34,1.56,.64,1),filter .16s,box-shadow .16s;}
.btn:active{transform:scale(.94) !important;}
.btn-p{background:var(--blue);color:#fff;box-shadow:0 4px 22px rgba(10,132,255,.36);}.btn-p:hover{filter:brightness(1.1);transform:translateY(-2px);}
.btn-g{background:var(--bg-glass);color:var(--text);border:1px solid var(--border-strong);backdrop-filter:blur(16px);}.btn-g:hover{background:var(--bg-hover);transform:translateY(-2px);}
.btn-l{background:rgba(255,69,58,.14);color:#ff453a;border:1px solid rgba(255,69,58,.3);}.btn-l:hover{background:rgba(255,69,58,.24);transform:translateY(-2px);}
.btn-f{background:rgba(48,209,88,.13);color:#30d158;border:1px solid rgba(48,209,88,.3);}.btn-f:hover{background:rgba(48,209,88,.22);transform:translateY(-2px);}
.strip{display:grid;grid-template-columns:repeat(4,1fr);background:var(--border);border:1px solid var(--border);border-radius:18px;overflow:hidden;gap:1px;animation:fadeup .7s .42s ease both;}
.stripc{background:var(--bg-card);padding:16px 10px;text-align:center;}
.stripv{font-size:22px;font-weight:900;letter-spacing:-.04em;color:var(--cc,var(--text));font-family:var(--font-mono);line-height:1;margin-bottom:5px;}
.stripl{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim);}
@media(max-width:480px){.strip{grid-template-columns:1fr 1fr;}}

/* ── Hero panels ── */
.pn{padding:18px;}
.pl{font-size:9px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:var(--text-dim);margin-bottom:12px;}
.lr{display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:12px;background:var(--bg-glass);border:1px solid var(--border-soft);margin-bottom:6px;cursor:pointer;transition:background .15s;font-size:11px;font-weight:700;color:var(--text);}.lr:hover{background:var(--bg-hover);}
.ql{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:10px;font-size:11px;font-weight:700;color:var(--text-secondary);transition:all .15s;border:1px solid transparent;}.ql:hover{background:var(--bg-hover);color:var(--qc,var(--blue));border-color:var(--border);}

/* ── Live dot ── */
.dot{width:var(--ds,6px);height:var(--ds,6px);border-radius:50%;flex-shrink:0;background:var(--dc,#ff453a);box-shadow:0 0 8px var(--dc,#ff453a);animation:pulse 1.9s ease-in-out infinite;}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.82)}}

/* ── Skeleton ── */
.sk{display:block;background:linear-gradient(90deg,var(--bg-glass) 25%,var(--bg-hover) 50%,var(--bg-glass) 75%);background-size:200%;animation:shim 1.7s infinite;border-radius:6px;}
@keyframes shim{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* ── Live ticker ── */
.ticker{background:rgba(255,69,58,.06);border-top:1px solid rgba(255,69,58,.13);border-bottom:1px solid rgba(255,69,58,.13);height:40px;overflow:hidden;position:relative;}
.tickertrack{display:flex;align-items:center;gap:18px;height:100%;animation:scrollx 28s linear infinite;width:max-content;}
@keyframes scrollx{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.tickerchip{display:flex;align-items:center;gap:7px;padding:4px 14px;border-radius:999px;background:rgba(255,69,58,.10);border:1px solid rgba(255,69,58,.20);white-space:nowrap;cursor:pointer;font-size:11px;font-weight:700;color:var(--text);transition:background .15s;flex-shrink:0;}.tickerchip:hover{background:rgba(255,69,58,.18);}
.tickerfade{position:absolute;top:0;bottom:0;width:80px;z-index:2;pointer-events:none;}
.tfl{left:0;background:linear-gradient(90deg,var(--bg),transparent);}.tfr{right:0;background:linear-gradient(-90deg,var(--bg),transparent);}
[data-theme="light"] .tfl{background:linear-gradient(90deg,#f5f5f7,transparent);}[data-theme="light"] .tfr{background:linear-gradient(-90deg,#f5f5f7,transparent);}

/* ── Horizontal scroll ── */
.hs{display:flex;gap:14px;overflow-x:auto;padding-bottom:8px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;}.hs::-webkit-scrollbar{display:none;}.hs>*{scroll-snap-align:start;}

/* ── Prob bar ── */
.pb{display:flex;height:5px;border-radius:999px;overflow:hidden;margin:10px 0 5px;gap:1px;}

/* ── Team row ── */
.tr{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:var(--bg-glass);border:1px solid var(--border);margin-bottom:6px;transition:background .15s,border-color .15s;}.tr:hover{background:var(--bg-hover);border-color:var(--border-strong);}

/* ── Form pip ── */
.fp{width:14px;height:14px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:900;flex-shrink:0;}

/* ── Badge ── */
.bx{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:9px;font-weight:800;letter-spacing:.05em;white-space:nowrap;}

/* ── Icon chip (replaces emoji) ── */
.iconf{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}

/* ── Tool card ── */
.tcard{padding:20px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;height:100%;}

/* ── FPL row ── */
.frow{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;border:1px solid var(--border);background:var(--bg-glass);margin-bottom:6px;cursor:pointer;transition:all .18s;}.frow:hover{background:var(--bg-hover);border-color:var(--frc,var(--border-strong));transform:translateX(4px);}
.find{width:3px;height:28px;border-radius:999px;background:var(--frc,var(--blue));flex-shrink:0;opacity:.75;}

/* ── Captain row ── */
.crow{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;background:var(--bg-glass);border:1px solid var(--border);margin-bottom:6px;transition:background .15s;}.crow:hover{background:var(--bg-hover);}

/* ── Model card ── */
.mc{display:flex;align-items:flex-start;gap:10px;padding:14px;border-radius:14px;background:var(--bg-glass);border:1px solid var(--border);transition:all .18s;}.mc:hover{border-color:var(--mcc,var(--border-strong));transform:translateY(-2px);}
.mcd{width:8px;height:8px;border-radius:50%;background:var(--mcc,var(--blue));box-shadow:0 0 8px var(--mcc,var(--blue));flex-shrink:0;margin-top:3px;}

/* ── Verified row ── */
.vrow{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;background:var(--bg-glass);border:1px solid var(--border);margin-bottom:5px;transition:background .15s;}.vrow:hover{background:var(--bg-hover);}

/* ── Acc ring wrapper ── */
.aw{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;}
@media(max-width:500px){.aw{grid-template-columns:1fr 1fr;}}

/* ── Empty state ── */
.empty{padding:28px;text-align:center;font-size:12px;color:var(--text-dim);border-radius:16px;background:var(--bg-glass);border:1px solid var(--border);}

/* ── Error state ── */
.errbx{padding:18px 20px;border-radius:14px;background:rgba(255,69,58,.07);border:1px solid rgba(255,69,58,.18);font-size:11px;color:#ff453a;}

/* ── Mono ── */
.mn{font-family:var(--font-mono);}

/* ── Animations ── */
@keyframes fadeup{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes hpfloat{0%{transform:translateY(0) translateX(0);opacity:.8;}33%{transform:translateY(-28px) translateX(14px);opacity:.4;}66%{transform:translateY(-12px) translateX(-10px);opacity:.7;}100%{transform:translateY(0) translateX(0);opacity:.8;}}

/* ═══════════════════════════════════════════════════════
   HERO — ANIMATED, CSS-HEAVY, DATA-FREE
═══════════════════════════════════════════════════════ */
.hero{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--bg);padding:100px 0 60px;}
[data-theme="light"] .hero{background:linear-gradient(155deg,#f0f4ff 0%,#f5f5f7 40%,#fdf0f7 100%);}

/* Animated gradient orbs */
.orb{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none;z-index:0;}
.orb-a{width:680px;height:480px;background:radial-gradient(ellipse,rgba(10,132,255,.18),transparent 72%);top:-160px;left:-220px;animation:orbA 16s ease-in-out infinite alternate;}
.orb-b{width:560px;height:560px;background:radial-gradient(ellipse,rgba(48,209,88,.13),transparent 72%);bottom:-130px;right:-200px;animation:orbB 19s ease-in-out infinite alternate;}
.orb-c{width:420px;height:420px;background:radial-gradient(ellipse,rgba(191,90,242,.11),transparent 72%);top:35%;left:45%;animation:orbC 22s ease-in-out infinite alternate;}
.orb-d{width:300px;height:300px;background:radial-gradient(ellipse,rgba(255,159,10,.09),transparent 72%);top:10%;right:15%;animation:orbD 14s ease-in-out infinite alternate;}
[data-theme="light"] .orb{opacity:.18;}

@keyframes orbA{0%{transform:translate(0,0) scale(1) rotate(0deg);}100%{transform:translate(40px,50px) scale(1.12) rotate(8deg);}}
@keyframes orbB{0%{transform:translate(0,0) scale(1);}100%{transform:translate(-35px,40px) scale(1.09);}}
@keyframes orbC{0%{transform:translate(-50%,-50%) scale(1);}50%{transform:translate(calc(-50% + 28px),calc(-50% - 20px)) scale(1.06);}100%{transform:translate(calc(-50% - 18px),calc(-50% + 30px)) scale(0.94);}}
@keyframes orbD{0%{transform:translate(0,0);}100%{transform:translate(20px,-30px) scale(1.08);}}

/* Scan-line texture */
.scanline{position:absolute;inset:0;pointer-events:none;z-index:1;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.015) 3px,rgba(0,0,0,.015) 4px);}
[data-theme="light"] .scanline{opacity:.25;}

/* Canvas grid */
.cv{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;}

/* Animated border-beam on hero */
.hero-beam{position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent 0%,rgba(10,132,255,.6) 30%,rgba(48,209,88,.6) 50%,rgba(191,90,242,.6) 70%,transparent 100%);background-size:200% 100%;animation:beamSlide 4s linear infinite;z-index:2;}
@keyframes beamSlide{0%{background-position:200% 0;}100%{background-position:-200% 0;}}

/* Floating particles */
.ptcl{position:absolute;border-radius:50%;pointer-events:none;z-index:0;animation:hpfloat var(--dur,12s) var(--del,0s) ease-in-out infinite;}
@keyframes hpfloat{0%,100%{transform:translate(0,0) scale(1);opacity:.8;}33%{transform:translate(var(--tx,14px),var(--ty,-28px)) scale(.8);opacity:.3;}66%{transform:translate(var(--tx2,-10px),var(--ty2,-12px)) scale(1.1);opacity:.6;}}

/* Hero inner layout */
.hi{position:relative;z-index:2;width:100%;max-width:1280px;margin:0 auto;padding:0 24px;display:grid;grid-template-columns:1fr 2.2fr 1fr;gap:20px;align-items:center;}
@media(max-width:1024px){.hi{grid-template-columns:1fr 1.6fr;}.hero-r{display:none;}}
@media(max-width:680px){.hi{grid-template-columns:1fr;}.hero-l{display:none;}.hero{padding:80px 0 40px;min-height:auto;}}

/* Center hero text */
.hc{text-align:center;}
.hbadge{display:inline-flex;align-items:center;gap:7px;padding:5px 16px;border-radius:999px;background:var(--bg-glass);border:1px solid var(--border-strong);font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;color:var(--text-muted);margin-bottom:28px;animation:fadeup .7s ease both;}

/* MAIN TITLE — layered glow effect */
.htitle{font-size:clamp(52px,8vw,108px);font-weight:900;letter-spacing:-.05em;line-height:.95;color:var(--text);margin-bottom:24px;animation:fadeup .7s .1s ease both;position:relative;}
.htitle-line1{display:block;color:var(--text);}
.htitle-game{display:block;position:relative;}
.tgrad{background:linear-gradient(115deg,#0a84ff 0%,#30d158 38%,#bf5af2 72%,#ff9f0a 100%);background-size:300%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:gmove 6s linear infinite;}
.tgrad-glow{position:absolute;inset:0;background:inherit;filter:blur(28px);opacity:.35;z-index:-1;animation:gmove 6s linear infinite;}
@keyframes gmove{0%{background-position:0% 50%;}100%{background-position:300% 50%;}}

/* Subtitle */
.hsub{font-size:16px;color:var(--text-secondary);line-height:1.65;max-width:520px;margin:0 auto 36px;animation:fadeup .7s .22s ease both;letter-spacing:-.01em;}

/* CTA buttons */
.ctas{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:40px;animation:fadeup .7s .32s ease both;}
.btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:7px;padding:13px 26px;border-radius:14px;font-size:13px;font-weight:700;letter-spacing:-.01em;border:none;cursor:pointer;font-family:inherit;transition:transform .18s cubic-bezier(.34,1.56,.64,1),filter .16s,box-shadow .18s;}
.btn:active{transform:scale(.93) !important;}
/* Button shimmer sweep */
.btn::after{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);transform:skewX(-20deg);transition:none;}
.btn:hover::after{left:150%;transition:left .5s ease;}
.btn-p{background:var(--blue);color:#fff;box-shadow:0 4px 24px rgba(10,132,255,.38);}.btn-p:hover{filter:brightness(1.1);transform:translateY(-3px);}
.btn-g{background:var(--bg-glass);color:var(--text);border:1px solid var(--border-strong);backdrop-filter:blur(16px);}.btn-g:hover{background:var(--bg-hover);transform:translateY(-3px);}
.btn-l{background:rgba(255,69,58,.14);color:#ff453a;border:1px solid rgba(255,69,58,.3);}.btn-l:hover{background:rgba(255,69,58,.24);transform:translateY(-3px);}
.btn-f{background:rgba(48,209,88,.13);color:#30d158;border:1px solid rgba(48,209,88,.3);}.btn-f:hover{background:rgba(48,209,88,.22);transform:translateY(-3px);}

/* Stat strip */
.strip{display:grid;grid-template-columns:repeat(4,1fr);background:var(--border);border:1px solid var(--border);border-radius:18px;overflow:hidden;gap:1px;animation:fadeup .7s .42s ease both;}
.stripc{background:var(--bg-card);padding:16px 10px;text-align:center;backdrop-filter:blur(12px);transition:background .2s;}
.stripc:hover{background:var(--bg-hover);}
.stripv{font-size:clamp(18px,2.5vw,26px);font-weight:900;letter-spacing:-.04em;color:var(--cc,var(--text));font-family:var(--font-mono);line-height:1;margin-bottom:5px;}
.stripl{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim);}
@media(max-width:480px){.strip{grid-template-columns:1fr 1fr;}}

/* ═══════════════════════════════════════════════════════
   MOBILE RESPONSIVE OVERRIDES
═══════════════════════════════════════════════════════ */
@media(max-width:820px){
  .s{padding:36px 0;}
  .s--last{padding-bottom:60px;}
  .w{padding:0 16px;}
  .hd{flex-direction:column;gap:8px;margin-bottom:20px;}
  .hd .sa{align-self:flex-start;}
  .h2{font-size:clamp(18px,5vw,24px);}
}
@media(max-width:720px){
  .g2{grid-template-columns:1fr;}
  .gr{grid-template-columns:1fr;}
  .g3{grid-template-columns:1fr;}
}
@media(max-width:600px){
  .gb{grid-template-columns:1fr 1fr;grid-auto-rows:140px;}
  .gp{grid-template-columns:1fr 1fr;}
  .gc{grid-template-columns:1fr 1fr;}
  .gfacts{grid-template-columns:1fr 1fr;}
  .gmodels{grid-template-columns:1fr;}
  .aw{grid-template-columns:1fr 1fr;}
  .hero{padding:72px 0 32px;min-height:auto;}
  .htitle{font-size:clamp(42px,12vw,68px);}
  .hsub{font-size:14px;}
  .ctas{gap:8px;}
  .btn{padding:11px 18px;font-size:12px;}
}
@media(max-width:400px){
  .gb{grid-template-columns:1fr;}
  .gp{grid-template-columns:1fr;}
  .gc{grid-template-columns:1fr;}
}

/* Ticker mobile */
@media(max-width:600px){
  .ticker{height:36px;}
  .tickerchip{padding:3px 10px;font-size:10px;}
}

/* Card touch targets */
@media(max-width:820px){
  .g{border-radius:16px;}
  .g:hover{transform:none;}
  .frow:hover{transform:none;}
  .mc:hover{transform:none;}
}

/* Horizontal scroll on mobile */
@media(max-width:820px){
  .hs{padding-bottom:12px;}
}

`;

// ════════════════════════════════════════════════════════════════════════
// DATA HOOKS — all fetches through api.js
// ════════════════════════════════════════════════════════════════════════

function useUpcomingData() {
  const [fixtures, setFixtures] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  useEffect(() => {
    let dead = false;
    getUpcoming()
      .then(d => {
        if (dead) return;
        const raw = d?.matches || d?.chips || [];
        setFixtures(raw.map(c => ({
          fixture_id: c.fixture_id,
          home_team: c.home_team, away_team: c.away_team,
          home_logo: c.home_logo, away_logo: c.away_logo,
          home_score: c.home_score ?? null, away_score: c.away_score ?? null,
          status: c.status, minute: c.minute,
          kickoff: c.kickoff || c.date,
          league_id: c.league_id,
        })));
      })
      .catch(e => { if (!dead) setError(e.message); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, []);
  return { fixtures, loading, error };
}

function useDashboardData() {
  const [dash,    setDash]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  useEffect(() => {
    let dead = false;
    getDashboard()
      .then(d => { if (!dead) setDash(d); })
      .catch(e => { if (!dead) setError(e.message); })
      .finally(() => { if (!dead) setLoading(false); });
    return () => { dead = true; };
  }, []);
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
function HeroSection({ fixtures, dash, dl }) {
  const nav = useNavigate();
  const liveCount = fixtures.filter(f => LIVE_SET.has(f.status)).length;
  const live      = fixtures.filter(f => LIVE_SET.has(f.status)).slice(0, 3);

  // dashboard keys
  const hs       = dash?.hero_stats;
  const avgConf  = dash?.model_confidence?.avg_confidence ?? null;
  const topEdge  = dash?.model_edges?.edges?.[0] ?? null;
  const pred     = dash?.top_predictions?.predictions?.[0];
  const conf     = dash?.model_confidence;

  return (
    <section className="hero">
      <CanvasGrid /><Particles />
      <div className="orb orb-a" /><div className="orb orb-b" />
      <div className="orb orb-c" /><div className="orb orb-d" />
      <div className="scanline" />
      <div className="hero-beam" />
      <div className="hi">
        {/* ── Left panels ── */}
        <div className="hero-l" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Live */}
          <div className="g pn">
            <div className="gi">
              <div className="pl" style={liveCount > 0 ? { color: "#ff453a", display: "flex", alignItems: "center", gap: 5 } : {}}>
                {liveCount > 0 && <Dot />}{liveCount > 0 ? `${liveCount} LIVE NOW` : "LIVE CENTRE"}
              </div>
              {live.length > 0 ? live.map(f => (
                <div key={f.fixture_id} className="lr" onClick={() => nav(`/match/${f.fixture_id}`)}>
                  {f.home_logo && <img src={f.home_logo} width={13} height={13} style={{ objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />}
                  <span style={{ flex: 1, fontSize: 11, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.home_team?.split(" ").slice(-1)[0]}</span>
                  <span className="mn" style={{ fontWeight: 900, fontSize: 12, flexShrink: 0 }}>{f.home_score ?? 0}–{f.away_score ?? 0}</span>
                  <span style={{ flex: 1, textAlign: "right", fontSize: 11, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.away_team?.split(" ").slice(-1)[0]}</span>
                  {f.away_logo && <img src={f.away_logo} width={13} height={13} style={{ objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />}
                  {f.minute && <span className="mn" style={{ fontSize: 9, color: "#ff453a", flexShrink: 0 }}>{f.minute}'</span>}
                </div>
              )) : (
                <>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>No matches live</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{fixtures.filter(f => isToday(f.kickoff)).length} fixtures today</div>
                </>
              )}
            </div>
          </div>
          {/* Model signals */}
          <div className="g pn">
            <div className="gi">
              <div className="pl">MODEL SIGNALS</div>
              {!conf
                ? <><Skel w="60%" h={24} /><div style={{ marginTop: 8 }} /><Skel w="75%" h={9} /></>
                : <>
                  <div className="mn" style={{ fontSize: 26, fontWeight: 900, color: "#30d158", lineHeight: 1, marginBottom: 4 }}>{conf.avg_confidence}%</div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 10 }}>avg confidence · {conf.total} fixtures</div>
                  <div style={{ display: "flex", gap: 3, height: 5, borderRadius: 999, overflow: "hidden", marginBottom: 8 }}>
                    {conf.high > 0 && <div style={{ flex: conf.high, background: "#30d158", opacity: .8 }} />}
                    {conf.medium > 0 && <div style={{ flex: conf.medium, background: "#ff9f0a", opacity: .7 }} />}
                    {conf.low > 0 && <div style={{ flex: conf.low, background: "#ff453a", opacity: .6 }} />}
                  </div>
                  {topEdge && <div style={{ fontSize: 9, color: "var(--text-muted)" }}>Top edge: <span style={{ color: "#30d158", fontWeight: 800 }}>+{topEdge.edge}% {topEdge.label?.split(" ").slice(0, 2).join(" ")}</span></div>}
                </>}
            </div>
          </div>
        </div>

        {/* ── Center ── */}
        <div className="hc">
          <div className="hbadge">
            {liveCount > 0
              ? <><Dot size={5} /><span>{liveCount} LIVE NOW</span></>
              : <span>ELO · DIXON-COLES · REAL xG · POISSON</span>}
          </div>
          <h1 className="htitle">
            <span className="htitle-line1">Read The</span>
            <span className="htitle-game">
              <span className="tgrad">Game.</span>
              <span className="tgrad tgrad-glow" aria-hidden="true">Game.</span>
            </span>
          </h1>
          <p className="hsub">Football intelligence rebuilt from the ground up. Live scores, Poisson predictions, xG tracking and the deepest FPL analysis suite.</p>
          <div className="ctas">
            <button className={`btn ${liveCount > 0 ? "btn-l" : "btn-p"}`} onClick={() => nav("/live")}>
              {liveCount > 0 && <Dot color="#ff453a" size={6} />}{liveCount > 0 ? "Watch Live" : "Live Centre"}
            </button>
            <button className="btn btn-g" onClick={() => nav("/predictions/premier-league")}>Predictions</button>
            <button className="btn btn-f" onClick={() => nav("/best-team")}>FPL Suite</button>
          </div>
          <div className="strip">
            {[
              { l: "Accuracy",  v: hs?.verified_accuracy || avgConf, c: "#30d158", sx: "%" },
              { l: "Predicted", v: hs?.fixtures_predicted,            c: "#0a84ff" },
              { l: "Leagues",   v: hs?.competitions_count ?? 9,       c: "#bf5af2" },
              { l: "Top Edge",  v: topEdge ? `+${topEdge.edge}%` : null, c: "#ff9f0a", raw: true },
            ].map(({ l, v, c, sx = "", raw }) => (
              <div key={l} className="stripc" style={{ "--cc": c }}>
                <div className="stripv">
                  {dl || v == null
                    ? <Skel w={32} h={22} />
                    : raw ? <span className="mn">{v}</span>
                    : <CountUp to={Number(v) || 0} suffix={sx} />}
                </div>
                <div className="stripl">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panels ── */}
        <div className="hero-r" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Top prediction */}
          <div className="g pn" onClick={() => nav("/predictions/premier-league")} style={{ cursor: "pointer" }}>
            <div className="gi">
              <div className="pl" style={{ color: "#0a84ff" }}>TOP PREDICTION</div>
              {!pred
                ? <><Skel w="80%" h={11} /><div style={{ marginTop: 8 }} /><Skel w="60%" h={9} /></>
                : (() => {
                  const hp = pred.homeProb || 0, ap = pred.awayProb || 0, dp = pred.draw || 0;
                  return <>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                      {pred.home_logo && <img src={pred.home_logo} width={18} height={18} style={{ objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />}
                      <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text)" }}>{pred.home?.split(" ").slice(-1)[0]}</span>
                      <span style={{ color: "var(--text-dim)", fontSize: 9 }}>vs</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text)" }}>{pred.away?.split(" ").slice(-1)[0]}</span>
                      {pred.away_logo && <img src={pred.away_logo} width={18} height={18} style={{ objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />}
                    </div>
                    <div className="pb">
                      <div style={{ flex: hp, background: "#0a84ff", opacity: .9 }} />
                      <div style={{ flex: dp, background: "var(--border-strong)" }} />
                      <div style={{ flex: ap, background: "#30d158", opacity: .9 }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 8 }}>
                      <span className="mn" style={{ color: "#0a84ff", fontWeight: 900 }}>{hp}%</span>
                      <span style={{ color: "var(--text-dim)" }}>D {dp}%</span>
                      <span className="mn" style={{ color: "#30d158", fontWeight: 900 }}>{ap}%</span>
                    </div>
                    {pred.xg_home != null && (
                      <div style={{ fontSize: 9, color: "var(--text-muted)" }}>
                        xG <span className="mn" style={{ color: "var(--text)" }}>{Number(pred.xg_home).toFixed(1)}–{Number(pred.xg_away).toFixed(1)}</span>
                      </div>
                    )}
                  </>;
                })()}
            </div>
          </div>
          {/* Quick links */}
          <div className="g pn">
            <div className="gi">
              <div className="pl">QUICK ACCESS</div>
              {[
                { to: "/predictions/champions-league", l: "UCL Predictions",  c: "#3b82f6" },
                { to: "/predictions/premier-league",   l: "EPL Predictions",  c: "#60a5fa" },
                { to: "/captaincy",                    l: "Captain Picks",    c: "#30d158" },
                { to: "/player",                       l: "Player Browser",   c: "#ff9f0a" },
              ].map(({ to, l, c }) => (
                <Link key={to} to={to} className="ql" style={{ "--qc": c }}>{l}<span>→</span></Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 2 — LIVE STRIP
// ════════════════════════════════════════════════════════════════════════
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
const COMPS = [
  { label: "Premier League",    slug: "premier-league",    leagueId: 39,  color: "#60a5fa", logo: "https://media.api-sports.io/football/leagues/39.png",  teams: 20, desc: "England's top flight with full Dixon-Coles coverage.",       features: ["Predictions","Standings","Season Sim","xG"] },
  { label: "La Liga",           slug: "la-liga",           leagueId: 140, color: "#fb923c", logo: "https://media.api-sports.io/football/leagues/140.png", teams: 20, desc: "Spain's premier division with Elo power rankings.",           features: ["Predictions","Standings","Season Sim"] },
  { label: "Bundesliga",        slug: "bundesliga",        leagueId: 78,  color: "#ff9f0a", logo: "https://media.api-sports.io/football/leagues/78.png",  teams: 18, desc: "Germany's top tier — form-weighted predictions.",            features: ["Predictions","Standings","Season Sim"] },
  { label: "Serie A",           slug: "serie-a",           leagueId: 135, color: "#30d158", logo: "https://media.api-sports.io/football/leagues/135.png", teams: 20, desc: "Italian football with defensive analytics.",                  features: ["Predictions","Standings"] },
  { label: "Ligue 1",           slug: "ligue-1",           leagueId: 61,  color: "#bf5af2", logo: "https://media.api-sports.io/football/leagues/61.png",  teams: 18, desc: "France's top league — full Poisson model.",                  features: ["Predictions","Standings"] },
  { label: "Champions League",  slug: "champions-league",  leagueId: 2,   color: "#3b82f6", logo: "https://media.api-sports.io/football/leagues/2.png",   teams: 36, desc: "Europe's elite competition — bracket predictions.",           features: ["Predictions","Bracket"] },
  { label: "Europa League",     slug: "europa-league",     leagueId: 3,   color: "#f97316", logo: "https://media.api-sports.io/football/leagues/3.png",   teams: 36, desc: "UEFA's second-tier European competition.",                   features: ["Predictions","Bracket"] },
  { label: "Conference League", slug: "conference-league", leagueId: 848, color: "#22c55e", logo: "https://media.api-sports.io/football/leagues/848.png", teams: 36, desc: "UEFA's third-tier tournament predictions.",                  features: ["Predictions","Bracket"] },
  { label: "FA Cup",            slug: "fa-cup",            leagueId: 45,  color: "#ef4444", logo: "https://media.api-sports.io/football/leagues/45.png",  teams: 736, desc: "The world's oldest domestic cup competition.",              features: ["Predictions","Bracket"] },
];

function CompCard({ comp, idx, fixtures }) {
  const [hov, setHov] = useState(false);
  const [ref, vis]   = useReveal(.05);
  const liveCount    = fixtures.filter(f => LIVE_SET.has(f.status) && f.league_id === comp.leagueId).length;
  // Route is /predictions/:slug — slug matches App.jsx SLUG_MAP
  return (
    <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(16px)", transition: `all .45s ease ${idx * 35}ms` }}>
      <Link to={`/predictions/${comp.slug}`} style={{ textDecoration: "none" }}>
        <div className="g" style={{ padding: 20, height: "100%", display: "flex", flexDirection: "column" }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
          <div className="gi" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: comp.color, borderRadius: "20px 20px 0 0", opacity: hov ? 1 : 0, transition: "opacity .2s" }} />
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, background: `${comp.color}14`, border: `1px solid ${comp.color}28`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: hov ? `0 0 16px ${comp.color}35` : "none", transition: "box-shadow .2s" }}>
                <img src={comp.logo} width={28} height={28} style={{ objectFit: "contain" }} onError={e => e.currentTarget.style.display = "none"} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: "var(--text)", letterSpacing: "-.02em", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{comp.label}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{comp.teams} clubs</div>
              </div>
              {liveCount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, background: "rgba(255,69,58,.10)", border: "1px solid rgba(255,69,58,.20)", flexShrink: 0 }}>
                  <Dot size={5} /><span style={{ fontSize: 8, fontWeight: 900, color: "#ff453a", fontFamily: "var(--font-mono)" }}>{liveCount}</span>
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.55, marginBottom: 12, flex: 1 }}>{comp.desc}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>{comp.features.map(f => <Badge key={f} label={f} color={comp.color} />)}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid var(--border)", fontSize: 11, fontWeight: 700, color: hov ? comp.color : "var(--text-dim)", transition: "color .15s" }}>
              <span>Explore predictions</span>
              <span style={{ transition: "transform .15s", transform: hov ? "translateX(4px)" : "translateX(0)" }}>→</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function CompetitionHub({ fixtures }) {
  const [ref, vis] = useReveal(.04);
  return (
    <section className="s"><div className="w">
      <div ref={ref} className="hd" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div>
          <div className="ey">— Coverage</div>
          <h2 className="h2">9 Competitions. Full Intelligence.</h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, maxWidth: 480 }}>Poisson predictions, standings, season simulation and xG across Europe's top competitions.</p>
        </div>
      </div>
      <div className="gc">{COMPS.map((c, i) => <CompCard key={c.slug} comp={c} idx={i} fixtures={fixtures} />)}</div>
    </div></section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SECTION 8 — FPL HUB
// dashboard.differential_captains.captains  +  dashboard.value_players.players
// ════════════════════════════════════════════════════════════════════════
const FPL_TOOLS = [
  { to: "/best-team",          label: "Best XI",           stat: "Optimal 11",   detail: "Model-driven optimal starting 11",      color: "#30d158" },
  { to: "/squad-builder",      label: "Squad Builder",     stat: "15-man squad", detail: "Build within £100m budget",             color: "#0a84ff" },
  { to: "/gameweek-insights",  label: "GW Insights",       stat: "This GW",      detail: "Fixture analysis & GW picks",           color: "#ff9f0a" },
  { to: "/fpl-table",          label: "FPL Table",         stat: "Standings",    detail: "Live leaderboard & rank",               color: "#bf5af2" },
  { to: "/captaincy",          label: "Captaincy",         stat: "Picks",        detail: "EP analysis & ownership data",          color: "#ff9f0a" },
  { to: "/fixture-difficulty", label: "FDR Heatmap",       stat: "8 GWs",        detail: "Fixture difficulty ratings",            color: "#64d2ff" },
  { to: "/transfer-planner",   label: "Transfer Planner",  stat: "Plan moves",   detail: "Model transfer recommendations",        color: "#ff453a" },
  { to: "/differentials",      label: "Differentials",     stat: "Low-owned",    detail: "High-ceiling, low-ownership picks",     color: "#ff375f" },
];

function FplRow({ t, i, dash }) {
  const [hov, setHov] = useState(false);
  const [ref, vis]   = useReveal(.04);
  const capt = t.to === "/captaincy" && dash?.differential_captains?.captains?.[0];
  const realStat = capt ? `${capt.name || capt.web_name} ${capt.ep_next != null ? Number(capt.ep_next).toFixed(1) : "??"}EP` : t.stat;
  return (
    <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? "translateX(0)" : "translateX(14px)", transition: `all .4s ease ${i * 40}ms` }}>
      <Link to={t.to} style={{ textDecoration: "none" }}>
        <div className="frow" style={{ "--frc": t.color }} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
          <div className="find" />
          <div className="mn" style={{ fontSize: 9, color: "var(--text-dim)", minWidth: 22 }}>{String(i + 1).padStart(2, "0")}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>{t.label}</div>
            {hov && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{t.detail}</div>}
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: t.color, whiteSpace: "nowrap" }}>{realStat}</span>
          <span style={{ fontSize: 12, transition: "transform .15s", transform: hov ? "translateX(3px)" : "translateX(0)", color: t.color }}>→</span>
        </div>
      </Link>
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
      <HeroSection  fixtures={fixtures} dash={dash} dl={dl} />
      <LiveStrip    fixtures={fixtures} />
      <TopPredictions  dash={dash} loading={dl} error={de} />
      <Div /><TitleRace    dash={dash} loading={dl} error={de} />
      <Div /><EdgeBoard    dash={dash} loading={dl} error={de} />
      <Div /><CommandGrid  fixtures={fixtures} dash={dash} loading={dl || ul} />
      <Div /><CompetitionHub fixtures={fixtures} />
      <Div /><FPLHub       dash={dash} />
      <Div /><TrendingPlayers dash={dash} loading={dl} error={de} />
      <Div /><TransferBrief   dash={dash} loading={dl} error={de} />
      <Div /><PowerRankings   dash={dash} loading={dl} error={de} />
      <Div /><ModelPerformance dash={dash} loading={dl} error={de} />
      <Div /><IntelligenceStack />
    </div>
  );
}