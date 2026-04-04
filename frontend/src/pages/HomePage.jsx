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

const BACKEND = import.meta?.env?.VITE_API_BASE || "https://footballstats-production-ecd9.up.railway.app";
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

/* ═══════════════════════════════════════════════════════
   HERO — CONCEPT 1: RADAR PULSE
═══════════════════════════════════════════════════════ */
.hero-pure {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #04080f;
}
[data-theme="light"] .hero-pure { background: #04080f; }

/* ── Radar canvas sits behind everything ── */
.hp-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; }

/* ── Scan-line texture ── */
.hp-scan { position: absolute; inset: 0; pointer-events: none; z-index: 1; background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,.018) 3px, rgba(0,0,0,.018) 4px); }

/* ── Radial vignette — darkens edges so text pops ── */
.hp-vignette { position: absolute; inset: 0; pointer-events: none; z-index: 1; background: radial-gradient(ellipse 70% 65% at 50% 50%, transparent 30%, #04080f 100%); }

/* ── Bottom beam ── */
.hp-beam { position: absolute; bottom: 0; left: 0; right: 0; height: 1px; z-index: 4; overflow: hidden; }
.hp-beam::after { content: ''; position: absolute; top: 0; left: -30%; height: 1px; width: 40%; background: linear-gradient(90deg, transparent, rgba(59,130,246,.9), transparent); animation: hpBeamSlide 3.5s ease-in-out infinite; }
@keyframes hpBeamSlide { 0% { left: -40%; } 100% { left: 130%; } }

/* ── Top beam ── */
.hp-beam-top { position: absolute; top: 0; left: 0; right: 0; height: 1px; z-index: 4; overflow: hidden; }
.hp-beam-top::after { content: ''; position: absolute; top: 0; height: 1px; width: 30%; background: linear-gradient(90deg, transparent, rgba(59,130,246,.5), transparent); animation: hpBeamSlide 4.5s 1.2s ease-in-out infinite; }

/* ── Center content ── */
.hp-center { position: relative; z-index: 2; text-align: center; padding: 0 24px; }

/* ── Brand row ── */
.hp-brand {
  display: inline-flex; align-items: center; gap: 12px;
  margin-bottom: 28px;
  animation: hpFadeUp .9s ease both;
}
.hp-brand-bars { display: flex; align-items: flex-end; gap: 2.5px; height: 18px; }
.hp-brand-bars span {
  display: block; width: 3px; border-radius: 2px; background: #3b82f6;
  animation: hpBarPulse 1.8s ease-in-out infinite;
}
.hp-brand-bars span:nth-child(1) { height: 9px;  animation-delay: 0s; }
.hp-brand-bars span:nth-child(2) { height: 16px; animation-delay: .18s; }
.hp-brand-bars span:nth-child(3) { height: 11px; animation-delay: .36s; }
.hp-brand-bars span:nth-child(4) { height: 18px; background: #60a5fa; animation-delay: .54s; }
@keyframes hpBarPulse { 0%,100% { opacity:1; transform:scaleY(1); } 50% { opacity:.35; transform:scaleY(.45); } }
.hp-brand-divider { width: 1px; height: 16px; background: rgba(59,130,246,.3); }
.hp-brand-name {
  font-size: 13px; font-weight: 900; letter-spacing: .02em;
  color: rgba(255,255,255,.55); font-family: var(--font-display);
}
.hp-brand-name::after {
  content: ''; display: inline-block; width: 5px; height: 5px; border-radius: 50%;
  background: #3b82f6; margin-left: 6px; vertical-align: middle;
  box-shadow: 0 0 8px #3b82f6; animation: hpPulse 2.2s ease-in-out infinite;
}
.hp-brand-intel {
  font-size: 9px; font-weight: 700; letter-spacing: .22em; text-transform: uppercase;
  color: rgba(59,130,246,.55);
}
@keyframes hpPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.3; transform:scale(.65); } }

/* ── Main title ── */
.hp-title { margin: 0 0 36px; line-height: .88; letter-spacing: -.052em; display: flex; flex-direction: column; align-items: center; }
.hp-line { display: block; }
.hp-line-1 {
  font-size: clamp(72px, 12vw, 162px);
  font-weight: 900; color: #ffffff;
  animation: hpFadeUp .8s .12s ease both;
  text-shadow: 0 0 120px rgba(59,130,246,.12);
}
.hp-line-2 { display: flex; align-items: baseline; gap: 0; animation: hpFadeUp .8s .22s ease both; }

/* "Game" — pure blue shimmer, matches the radar */
.hp-game {
  font-size: clamp(80px, 13.5vw, 180px);
  font-weight: 900;
  background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 35%, #93c5fd 55%, #60a5fa 75%, #3b82f6 100%);
  background-size: 220%;
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  animation: hpGradMove 4s linear infinite, hpFadeUp .8s .22s ease both;
  filter: drop-shadow(0 0 50px rgba(59,130,246,.3));
}
@keyframes hpGradMove { 0% { background-position: 0% 50%; } 100% { background-position: 220% 50%; } }

/* "." — white bounce */
.hp-period {
  font-size: clamp(80px, 13.5vw, 180px);
  font-weight: 900; color: #fff; -webkit-text-fill-color: #fff; display: inline-block;
  animation: hpDotBounce 2.8s 1s cubic-bezier(.34,1.56,.64,1) both;
}
@keyframes hpDotBounce {
  0%   { opacity:0; transform:translateY(20px) scale(.35); }
  60%  { opacity:1; transform:translateY(-7px) scale(1.12); }
  80%  { transform:translateY(3px) scale(.96); }
  100% { opacity:1; transform:translateY(0) scale(1); }
}

/* ── Tagline ── */
.hp-tagline {
  font-size: clamp(9px, 1vw, 11px); font-weight: 700; letter-spacing: .26em; text-transform: uppercase;
  color: rgba(59,130,246,.4); animation: hpFadeUp .8s .5s ease both;
}

/* ── Scroll cue ── */
.hp-scroll-cue { margin-top: 60px; display: flex; flex-direction: column; align-items: center; animation: hpFadeUp .8s .72s ease both; }
.hp-scroll-line { width: 1px; height: 52px; background: linear-gradient(180deg, rgba(59,130,246,.5) 0%, transparent 100%); animation: hpScrollPulse 2s ease-in-out infinite; }
@keyframes hpScrollPulse { 0%,100% { transform:scaleY(1); opacity:.7; } 50% { transform:scaleY(.4); opacity:.2; } }

/* ── Core animation ── */
@keyframes hpFadeUp { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }

/* ── Blip dots ── */
.hp-blip {
  position: absolute; border-radius: 50%; pointer-events: none; z-index: 2;
  animation: hpBlipPulse var(--dur, 2s) var(--del, 0s) ease-in-out infinite;
}
@keyframes hpBlipPulse {
  0%,100% { opacity:.5; transform:scale(1); }
  50%     { opacity:1; transform:scale(1.3); }
}

/* ── Mobile ── */
@media (max-width: 600px) {
  .hp-line-1 { font-size: clamp(52px, 14vw, 78px); }
  .hp-game   { font-size: clamp(58px, 16vw, 90px); }
  .hp-period { font-size: clamp(58px, 16vw, 90px); }
  .hp-scroll-cue { margin-top: 40px; }
  .hp-scroll-line { height: 36px; }
  .hp-brand { flex-wrap: wrap; justify-content: center; gap: 8px; }
}
@media (max-width: 380px) {
  .hp-line-1 { font-size: 46px; }
  .hp-game   { font-size: 52px; }
  .hp-period { font-size: 52px; }
}

/* ── Competition Hub ─────────────────────────────────────────────────── */
.comp-hub { display: flex; flex-direction: column; gap: 32px; }

.comp-group-header {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 14px;
}
.comp-group-dot {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
}
.comp-group-label {
  font-size: 11px; font-weight: 900; letter-spacing: .12em;
  text-transform: uppercase; color: var(--text-muted);
}
.comp-group-count {
  font-size: 9px; font-weight: 800; color: var(--text-dim);
  background: var(--bg-glass); border: 1px solid var(--border);
  border-radius: 999px; padding: 1px 7px; font-family: var(--font-mono);
}

/* auto-fill grid — cards never smaller than 160px, never larger than 1fr */
.comp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}

/* Card */
.comp-card {
  padding: 14px;
  cursor: pointer;
  height: 100%;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  transition: transform .22s cubic-bezier(.34,1.56,.64,1), box-shadow .22s, border-color .22s;
}
.comp-card:hover {
  border-color: var(--cc, var(--border-strong));
  transform: translateY(-4px) scale(1.02);
}
.comp-card-inner {
  display: flex; flex-direction: column; height: 100%; position: relative;
}
.comp-card-bar {
  position: absolute; top: -14px; left: -14px; right: -14px; height: 3px;
  background: var(--cc, var(--blue));
  border-radius: 20px 20px 0 0;
  transition: opacity .2s;
}
.comp-card-head {
  display: flex; align-items: flex-start; gap: 9px; margin-bottom: 10px;
}
.comp-logo-wrap {
  width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  background: color-mix(in srgb, var(--cc, #60a5fa) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--cc, #60a5fa) 22%, transparent);
  display: flex; align-items: center; justify-content: center;
  transition: box-shadow .2s;
}
.comp-title-wrap { flex: 1; min-width: 0; }
.comp-label {
  font-size: 12px; font-weight: 800; color: var(--text);
  letter-spacing: -.01em; line-height: 1.2;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.comp-teams {
  font-size: 9px; color: var(--text-dim); margin-top: 2px; font-weight: 600;
}
.comp-live-badge {
  display: flex; align-items: center; gap: 3px;
  padding: 2px 6px; border-radius: 999px; flex-shrink: 0;
  background: rgba(255,69,58,.10); border: 1px solid rgba(255,69,58,.22);
  font-size: 9px; font-weight: 900; color: #ff453a;
  font-family: var(--font-mono);
}
.comp-features {
  display: flex; flex-wrap: wrap; gap: 4px; flex: 1;
  margin-bottom: 10px; align-content: flex-start;
}
.comp-footer {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 10px; font-weight: 700;
  padding-top: 8px; border-top: 1px solid var(--border);
  transition: color .15s;
}

/* Mobile: min card width shrinks on small screens */
@media (max-width: 600px) {
  .comp-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
  .comp-card { padding: 12px; min-height: 110px; }
  .comp-logo-wrap { width: 32px; height: 32px; }
  .comp-label { font-size: 11px; }
  .comp-hub { gap: 24px; }
}
@media (max-width: 380px) {
  .comp-grid { grid-template-columns: 1fr 1fr; }
}

/* mobile */
@media (max-width: 600px) {
  .hp-line-1 { font-size: clamp(52px, 14vw, 78px); }
  .hp-game   { font-size: clamp(58px, 16vw, 88px); }
  .hp-period { font-size: clamp(58px, 16vw, 88px); }
  .hp-scroll-cue { margin-top: 40px; }
  .hp-scroll-line { height: 36px; }
}
@media (max-width: 380px) {
  .hp-line-1 { font-size: 46px; }
  .hp-game   { font-size: 52px; }
  .hp-period { font-size: 52px; }
}


/* ════════════════════════════════════════════════════════════════════
   SPORTS PREMIUM THEME — Section header redesign
   All existing .g .gi .s .w .hd .h2 etc. kept intact below.
   These additions sit on top; specificity wins where needed.
════════════════════════════════════════════════════════════════════ */

/* ── Barlow Condensed display font ── */
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');

/* ── Page background — slightly bluer black for sports feel ── */
.hp { background: #05060c; }

/* ── Card backgrounds — as black as possible ── */
.g {
  background: #09090f !important;
  border-color: rgba(255,255,255,0.07) !important;
}

/* ── BRANDED SECTION HEADER ── */
.sp-sec-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 24px;
}
.sp-sec-left { display: flex; flex-direction: column; gap: 4px; }
.sp-eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  color: rgba(255,255,255,0.25);
  letter-spacing: .18em;
  text-transform: uppercase;
}
.sp-eyebrow::before {
  content: '';
  display: block;
  width: 16px;
  height: 1px;
  background: rgba(255,255,255,0.2);
  flex-shrink: 0;
}
.sp-h2 {
  font-family: 'Barlow Condensed', sans-serif !important;
  font-size: clamp(22px, 3vw, 32px) !important;
  font-weight: 900 !important;
  letter-spacing: -0.02em !important;
  color: #fff !important;
  text-transform: uppercase;
  line-height: 1 !important;
  margin: 0 !important;
}
.sp-h2 span { color: var(--sp-accent, #00d68f); }
.sp-sec-link {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255,255,255,0.28);
  letter-spacing: .04em;
  text-decoration: none;
  white-space: nowrap;
  transition: color .15s;
  flex-shrink: 0;
  margin-top: 4px;
}
.sp-sec-link:hover { color: rgba(255,255,255,0.7); }

/* ── Sub-label inside cards ── */
.sp-sub {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  color: rgba(255,255,255,0.25);
  letter-spacing: .14em;
  text-transform: uppercase;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.sp-sub::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.05);
}

/* ── Card top accent bar ── */
.sp-bar {
  height: 3px;
  width: 100%;
  background: var(--sp-bar, rgba(59,130,246,0.4));
  border-radius: 14px 14px 0 0;
}

/* ── Player rows with left position strip ── */
.sp-player-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  margin-bottom: 5px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color .15s;
}
.sp-player-row::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--pos-col, rgba(255,255,255,0.1));
}
.sp-player-row:hover { border-color: rgba(255,255,255,0.12); }
.sp-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 13px;
  font-weight: 900;
  color: rgba(255,255,255,0.18);
  min-width: 22px;
  text-align: right;
}
.sp-ep {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 19px;
  font-weight: 900;
  line-height: 1;
  text-align: right;
  flex-shrink: 0;
  color: #00d68f;
}
.sp-ep-lbl {
  font-size: 7px;
  color: rgba(255,255,255,0.22);
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: .1em;
  text-align: right;
}

/* ── Tool rows with left accent bar ── */
.sp-tool-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.015);
  margin-bottom: 5px;
  cursor: pointer;
  transition: all .15s;
  position: relative;
  overflow: hidden;
}
.sp-tool-row::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 2px;
  background: var(--tc, rgba(255,255,255,0.1));
}
.sp-tool-row:hover {
  background: rgba(255,255,255,0.035);
  border-color: var(--tc, rgba(255,255,255,0.12));
}
.sp-tool-icon {
  width: 34px; height: 34px;
  border-radius: 9px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sp-tool-label {
  font-size: 13px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -.01em;
}
.sp-tool-sub {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 1px;
}

/* ── GW stat strip ── */
.sp-gw-strip {
  display: flex;
  gap: 10px;
  margin-bottom: 18px;
  overflow-x: auto;
  padding-bottom: 2px;
}
.sp-gw-strip::-webkit-scrollbar { display: none; }
.sp-stat-chip {
  flex-shrink: 0;
  background: #09090f;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px;
  padding: 10px 14px;
  min-width: 88px;
}
.sp-stat-lbl {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: rgba(255,255,255,0.26);
  letter-spacing: .1em;
  text-transform: uppercase;
  margin-bottom: 4px;
}
.sp-stat-val {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 22px;
  font-weight: 900;
  color: #fff;
  line-height: 1;
}

/* ── Live dot pulse ── */
.sp-live-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #ff4757;
  animation: spPulse 2s ease-in-out infinite;
  flex-shrink: 0;
}
@keyframes spPulse {
  0%,100% { opacity:1; transform:scale(1); }
  50%      { opacity:.4; transform:scale(.75); }
}

/* ════════════════════════════════════════════════════════════════════
   ACCOUNTABILITY SECTION
════════════════════════════════════════════════════════════════════ */
.sp-acc-ring-row {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 12px;
  margin-bottom: 18px;
}
@media(max-width:600px) { .sp-acc-ring-row { grid-template-columns: 1fr 1fr; } }
.sp-acc-ring-card {
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 16px 14px;
  text-align: center;
}
.sp-acc-val {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 30px;
  font-weight: 900;
  line-height: 1;
  margin-bottom: 3px;
}
.sp-acc-val-unit {
  font-size: 15px;
  font-weight: 700;
  color: rgba(255,255,255,0.35);
}
.sp-acc-lbl {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: rgba(255,255,255,0.28);
  letter-spacing: .1em;
  text-transform: uppercase;
}
.sp-acc-sub {
  font-size: 10px;
  color: rgba(255,255,255,0.38);
  margin-top: 3px;
  font-weight: 600;
}
.sp-conf-band {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  margin-bottom: 5px;
}
.sp-band-lbl {
  font-size: 11px;
  font-weight: 700;
  color: var(--text);
  min-width: 90px;
}
.sp-band-bar-wrap {
  flex: 1;
  height: 5px;
  background: rgba(255,255,255,0.07);
  border-radius: 999px;
  overflow: hidden;
}
.sp-band-bar {
  height: 100%;
  border-radius: 999px;
  background: var(--bc, #00d68f);
}
.sp-band-pct {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 16px;
  font-weight: 900;
  min-width: 40px;
  text-align: right;
  color: var(--bc, #00d68f);
}
.sp-band-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: rgba(255,255,255,0.22);
  min-width: 50px;
  text-align: right;
}
.sp-roll-chips {
  display: flex;
  gap: 10px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(255,255,255,0.05);
}
.sp-roll-chip {
  flex: 1;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 10px;
  padding: 10px;
  text-align: center;
}
.sp-roll-val {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 21px;
  font-weight: 900;
  line-height: 1;
  margin-bottom: 3px;
}
.sp-roll-lbl {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: rgba(255,255,255,0.28);
  letter-spacing: .08em;
}
.sp-verified-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  margin-bottom: 5px;
}
.sp-v-icon {
  width: 22px; height: 22px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 900;
}
.sp-v-match {
  font-size: 11px;
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sp-v-meta {
  font-size: 9px;
  color: var(--text-muted);
  margin-top: 1px;
}
.sp-conf-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 5px;
  flex-shrink: 0;
}

/* ════════════════════════════════════════════════════════════════════
   NEWS TRACKER SECTION
════════════════════════════════════════════════════════════════════ */
.sp-news-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media(max-width:720px) { .sp-news-grid { grid-template-columns: 1fr; } }
.sp-news-card {
  background: #09090f;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 13px;
  padding: 14px;
  cursor: pointer;
  transition: border-color .15s;
  position: relative;
  overflow: hidden;
}
.sp-news-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: var(--nb, rgba(59,130,246,0.5));
}
.sp-news-card:hover { border-color: rgba(255,255,255,0.14); }
.sp-news-source {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 600;
  color: rgba(255,255,255,0.26);
  letter-spacing: .1em;
  text-transform: uppercase;
}
.sp-news-type {
  font-size: 8px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  letter-spacing: .06em;
  text-transform: uppercase;
  background: var(--tp-bg, rgba(59,130,246,0.1));
  color: var(--tp-c, #4fa8ff);
  margin-left: 5px;
}
.sp-news-headline {
  font-size: 12px;
  font-weight: 800;
  color: var(--text);
  line-height: 1.4;
  margin-bottom: 5px;
}
.sp-news-excerpt {
  font-size: 10px;
  color: var(--text-muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.sp-news-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: rgba(255,255,255,0.18);
  margin-top: 7px;
}

/* ════════════════════════════════════════════════════════════════════
   FPL NEWS / INJURY SECTION
════════════════════════════════════════════════════════════════════ */
.sp-fpl-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 11px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  margin-bottom: 6px;
  position: relative;
  overflow: hidden;
}
.sp-fpl-row::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--fpr, rgba(255,255,255,0.1));
}
.sp-fpl-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: rgba(255,255,255,0.06);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 10px;
  color: rgba(255,255,255,0.38);
}
.sp-fpl-name {
  font-size: 12px;
  font-weight: 800;
  color: var(--text);
}
.sp-fpl-team {
  font-size: 9px;
  color: var(--text-muted);
  margin-top: 1px;
}
.sp-fpl-news-txt {
  font-size: 10px;
  color: rgba(255,255,255,0.42);
  line-height: 1.5;
  margin-top: 4px;
}
.sp-chance-pill {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 6px;
  flex-shrink: 0;
  margin-left: auto;
  white-space: nowrap;
}
.sp-chance-lbl {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8px;
  color: rgba(255,255,255,0.22);
  text-align: right;
  margin-top: 3px;
}

/* ── Brief bullet ── */
.sp-brief-bullet {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 10px;
  color: var(--text-muted);
  border-top: 1px solid rgba(255,255,255,0.05);
  padding-top: 8px;
  margin-top: 4px;
  line-height: 1.5;
}
.sp-brief-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: #4fa8ff;
  flex-shrink: 0;
  margin-top: 4px;
}
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
  const perfSum    = useSectionFetch("/api/home/performance",                  1800_000);  // real perf data
  const acctSum    = useSectionFetch("/api/home/accountability",               1800_000);  // real accountability
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
    // performance_summary from dedicated /api/home/performance endpoint
    // (returns verified_count, rolling_accuracy, confidence_bands, overall_accuracy)
    performance_summary:   perfSum.data   ?? { insufficient: true, verified_count: 0 },
    // accountability_summary from dedicated /api/home/accountability endpoint
    // (returns hit_rate, recent_verified[], high_confidence_hit_rate, pending_count)
    accountability_summary: acctSum.data  ?? { insufficient: true },
    hero_stats: {
      competitions_count: 9,
      fixtures_predicted: heroStats.data?.logged ?? heroStats.data?.total ?? 0,
      verified_accuracy:  perfSum.data?.overall_accuracy ?? modelMetr.data?.overall_accuracy ?? 0,
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
      <div ref={ref} className="sp-sec-head" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div className="sp-sec-left">
          <div className="sp-eyebrow">Model Output</div>
          <h2 className="sp-h2" style={{ "--sp-accent": "#4fa8ff" }}>Today's Top <span>Predictions</span></h2>
        </div>
        <Link to="/predictions/premier-league" className="sp-sec-link">All predictions →</Link>
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
      <div ref={ref} className="sp-sec-head" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div className="sp-sec-left">
          <div className="sp-eyebrow">Standings</div>
          <h2 className="sp-h2" style={{ "--sp-accent": "#3b82f6" }}>Title <span>Race</span> · {league}</h2>
        </div>
        <Link to="/league/epl" className="sp-sec-link">Full table →</Link>
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
      <div ref={ref} className="sp-sec-head" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div className="sp-sec-left">
          <div className="sp-eyebrow">Value Signals</div>
          <h2 className="sp-h2" style={{ "--sp-accent": "#00d68f" }}>Model <span>Edge Board</span></h2>
        </div>
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
  { to: "/fpl/best-xi",                 label: "FPL Best XI",    color: "#30d158", span: 1, tall: true,  sub: "Optimal FPL starting XI with captain signal",               tag: "FPL",          dk: "fpl"   },
  { to: "/fpl/squad-builder",          label: "Squad Builder",  color: "#30d158", span: 1, tall: false, sub: "Build your 15-man FPL squad under budget",                   tag: "FPL",          dk: null    },
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
      <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{capt.ep_next != null ? Number(capt.ep_next).toFixed(1) : capt.form != null ? (Number(capt.form) / 2).toFixed(1) : "—"} EP</div>
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
      <div ref={ref} className="sp-sec-head" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div className="sp-sec-left">
          <div className="sp-eyebrow">Platform</div>
          <h2 className="sp-h2" style={{ "--sp-accent": "#4fa8ff" }}>Intelligence <span>Command Grid</span></h2>
        </div>
        <span style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>8 tools</span>
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
      <div ref={ref} className="sp-sec-head" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div className="sp-sec-left">
          <div className="sp-eyebrow">Coverage</div>
          <h2 className="sp-h2" style={{ "--sp-accent": "#bf5af2" }}>{totalComps} Competitions. <span>Full Intelligence.</span></h2>
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
  { SvgIcon: IconCaptain,  label: "Captain Picks",       sub: "xG + ELO captain algorithm",         to: "/fpl/captain-picks",       color: "#ff9f0a" },
  { SvgIcon: IconValue,    label: "Best XI",             sub: "Optimal starting 11 this gameweek",  to: "/fpl/best-xi",             color: "#30d158" },
  { SvgIcon: IconTransfer, label: "Transfer Targets",    sub: "Best transfers for your budget",     to: "/fpl/transfers",           color: "#0a84ff" },
  { SvgIcon: IconForm,     label: "Fixture Ticker",      sub: "Fixture difficulty heatmap",         to: "/fpl/fixture-ticker",      color: "#ff453a" },
  { SvgIcon: IconFixture,  label: "Differential Picks",  sub: "Low-ownership high-upside picks",    to: "/fpl/differential-picks",  color: "#ffd60a" },
  { SvgIcon: IconDiff,     label: "GW Guide",            sub: "Full gameweek tips & analysis",      to: "/fpl/gw-guide",            color: "#bf5af2" },
  { SvgIcon: IconPrice,    label: "Price Changes",       sub: "Players likely to rise or fall",     to: "/fpl/standings",           color: "#64d2ff" },
  { SvgIcon: IconLeague,   label: "Mini-League Edge",    sub: "Beat your rivals this week",         to: "/fpl/squad-builder",       color: "#ff6b00" },
];

function FplRow({ t }) {
  const nav = useNavigate();
  const { SvgIcon, label, sub, to, color } = t;
  return (
    <div
      className="sp-tool-row"
      style={{ "--tc": color }}
      onClick={() => nav(to)}
    >
      <div className="sp-tool-icon" style={{ background: `${color}14`, border: `1px solid ${color}28` }}>
        <SvgIcon color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="sp-tool-label">{label}</div>
        <div className="sp-tool-sub">{sub}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.22, marginLeft: "auto" }}>
        <path d="M4 7h6M7.5 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function FPLHub({ dash }) {
  const [ref, vis] = useReveal(.04);
  const capts    = dash?.differential_captains?.captains?.slice(0, 4) ?? [];
  const valuePls = dash?.value_players?.players?.slice(0, 3) ?? [];

  // GW stat strip — pull live GW/deadline from bootstrap
  const { data: bsRaw } = useSectionFetch("/api/fpl/bootstrap", 3600_000);
  const gwStrip = useMemo(() => {
    const events  = bsRaw?.events ?? [];
    const nextEv  = events.find(e => !e.finished && e.is_next) || events.find(e => !e.finished && e.is_current) || events.find(e => !e.finished);
    const captTop = capts[0];
    const valTop  = valuePls[0];
    if (!nextEv) return null;
    const dl = nextEv.deadline_time ? new Date(nextEv.deadline_time) : null;
    const dlStr = dl ? dl.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) + " " + dl.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : null;
    const hrsLeft = dl ? Math.max(0, Math.round((dl - Date.now()) / 3600000)) : null;
    return {
      gw:       nextEv.id,
      deadline: dlStr,
      hrsLeft,
      captEp:   captTop?.ep_next != null ? Number(captTop.ep_next).toFixed(1) : captTop?.form != null ? (Number(captTop.form) / 2).toFixed(1) : null,
      bestVal:  valTop?.value_score != null ? Number(valTop.value_score).toFixed(1) : null,
    };
  }, [bsRaw, capts, valuePls]);
  return (
    <section className="s"><div className="w">
      <div ref={ref} className="sp-sec-head" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div className="sp-sec-left">
          <div className="sp-eyebrow">Fantasy Premier League</div>
          <h2 className="sp-h2" style={{ "--sp-accent": "#00d68f" }}>FPL <span>Intelligence Hub</span></h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 999, background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,.2)", flexShrink: 0 }}>
          <Dot color="#30d158" size={6} />
          <span style={{ fontSize: 9, fontWeight: 900, color: "#30d158", letterSpacing: ".1em", fontFamily: "var(--font-mono)" }}>8 TOOLS ACTIVE</span>
        </div>
      </div>

      {/* ── GW Stat Strip — live data from FPL bootstrap ── */}
      {gwStrip && (
        <div className="sp-gw-strip">
          <div className="sp-stat-chip">
            <div className="sp-stat-lbl">Gameweek</div>
            <div className="sp-stat-val">GW{gwStrip.gw}</div>
          </div>
          {gwStrip.captEp != null && (
            <div className="sp-stat-chip">
              <div className="sp-stat-lbl">Top Captain EP</div>
              <div className="sp-stat-val" style={{ color: "#ffd60a" }}>{gwStrip.captEp}</div>
            </div>
          )}
          {gwStrip.bestVal != null && (
            <div className="sp-stat-chip">
              <div className="sp-stat-lbl">Best Value</div>
              <div className="sp-stat-val" style={{ color: "#4fa8ff" }}>{gwStrip.bestVal}v</div>
            </div>
          )}
          {gwStrip.deadline && (
            <div className="sp-stat-chip">
              <div className="sp-stat-lbl">Deadline</div>
              <div className="sp-stat-val" style={{ color: "#ff4757", fontSize: 14, lineHeight: 1.2 }}>{gwStrip.deadline}</div>
              {gwStrip.hrsLeft != null && (
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{gwStrip.hrsLeft}h left</div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="g2">
        <div className="g" style={{ padding: 20 }}><div className="gi">
          <div className="sp-sub">Captain Picks · Differentials</div>
          {capts.length > 0
            ? capts.map((c, i) => {
                const posC = { GK: "#ff9f0a", DEF: "#4fa8ff", MID: "#00d68f", FWD: "#ff4757" }[c.position] || "#00d68f";
                const ep   = c.ep_next != null ? Number(c.ep_next).toFixed(1) : c.form != null ? (Number(c.form) / 2).toFixed(1) : "—";
                return (
                  <div key={i} className="sp-player-row" style={{ "--pos-col": posC }}>
                    <div className="sp-rank">{String(i + 1).padStart(2, "0")}</div>
                    {c.photo && <img src={c.photo} width={28} height={28} style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} onError={e => e.currentTarget.style.display = "none"} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)" }}>{c.name || c.web_name}</div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{c.team_short || c.team || ""} · {c.ownership != null ? Number(c.ownership).toFixed(1) : "?"}% owned</div>
                    </div>
                    <Badge label={`${Number(c.form || 0).toFixed(1)} form`} color="#ff9f0a" />
                    <div style={{ textAlign: "right" }}>
                      <div className="sp-ep">{ep}</div>
                      <div className="sp-ep-lbl">EP</div>
                    </div>
                  </div>
                );
              })
            : Array.from({ length: 3 }).map((_, i) => <div key={i} className="sp-player-row"><Skel w="70%" h={11} /></div>)}
          {valuePls.length > 0 && <>
            <div className="sp-sub" style={{ marginTop: 16 }}>Value Picks (pts/£m)</div>
            {valuePls.map((p, i) => (
              <div key={i} className="sp-player-row" style={{ "--pos-col": "#4fa8ff" }}>
                <div className="sp-rank">{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text)" }}>{p.name}</div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{p.team_short} · £{p.cost}m · {p.position}</div>
                </div>
                <Badge label={`${p.value_score}v`} color="#0a84ff" />
                <div style={{ textAlign: "right" }}>
                  <div className="sp-ep" style={{ fontSize: 16, color: "#00d68f" }}>{p.total_points}</div>
                  <div className="sp-ep-lbl">pts</div>
                </div>
              </div>
            ))}
          </>}
        </div></div>
        <div className="g" style={{ padding: 20 }}><div className="gi">
          <div className="sp-sub">All FPL Tools</div>
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
      <div ref={ref} className="sp-sec-head" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div className="sp-sec-left">
          <div className="sp-eyebrow">Players</div>
          <h2 className="sp-h2" style={{ "--sp-accent": "#ff9f0a" }}>xG Leaders <span>&amp; Form</span></h2>
        </div>
        <Link to="/player" className="sp-sec-link">Browse all →</Link>
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
      <div ref={ref} className="sp-sec-head" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div className="sp-sec-left">
          <div className="sp-eyebrow">Intelligence</div>
          <h2 className="sp-h2" style={{ "--sp-accent": "#4fa8ff" }}>Transfer Brief <span>&amp; Analytics</span></h2>
        </div>
        <Link to="/news" className="sp-sec-link">All news →</Link>
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
      <div ref={ref} className="sp-sec-head" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div className="sp-sec-left">
          <div className="sp-eyebrow">Composite Model</div>
          <h2 className="sp-h2" style={{ "--sp-accent": "#3b82f6" }}>Power <span>Rankings</span> · {league}</h2>
        </div>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: ".06em", marginBottom: 4 }}>Elo · Form · Goal Diff · PPG</span>
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
      <div ref={ref} className="sp-sec-head" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div className="sp-sec-left">
          <div className="sp-eyebrow">Verified Results Only</div>
          <h2 className="sp-h2" style={{ "--sp-accent": "#4fa8ff" }}>Model <span>Performance</span></h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 999, background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,.2)", flexShrink: 0 }}>
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


// ════════════════════════════════════════════════════════════════════════
// NEW SECTION — ACCOUNTABILITY
// dash.performance_summary + dash.accountability_summary
// ════════════════════════════════════════════════════════════════════════
function AccountabilitySection({ dash, loading, error }) {
  const [ref, vis] = useReveal(.04);
  const perf  = dash?.performance_summary;
  const acct  = dash?.accountability_summary;
  const overallAcc  = perf?.overall_accuracy  ?? acct?.hit_rate         ?? null;
  const last30Acc   = perf?.last_30_accuracy                             ?? null;
  const highConfAcc = perf?.confidence_bands?.find(b => b.bracket?.startsWith("High"))?.accuracy
                      ?? acct?.high_confidence_hit_rate                  ?? null;
  const verifiedCount = perf?.verified_count ?? acct?.verified_count ?? 0;
  const pendingCount  = perf?.pending_count  ?? acct?.pending_count  ?? 0;
  const recentPreds   = acct?.recent_verified ?? [];
  const rollingAcc    = perf?.rolling_accuracy ?? [];
  const confBands     = perf?.confidence_bands ?? [];
  const avgConf       = perf?.average_confidence ?? null;
  const isInsufficient = perf?.insufficient && acct?.insufficient;

  return (
    <section className="s"><div className="w">
      <div ref={ref} className="sp-sec-head" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div className="sp-sec-left">
          <div className="sp-eyebrow">Verified Results Only</div>
          <h2 className="sp-h2" style={{ "--sp-accent": "#00d68f" }}>Prediction <span>Track Record</span></h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 14px", borderRadius: 999, background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.2)", flexShrink: 0 }}>
          <div className="sp-live-dot" style={{ background: "#30d158" }} />
          <span className="mn" style={{ fontSize: 9, fontWeight: 900, color: "#30d158", letterSpacing: ".1em" }}>{verifiedCount} VERIFIED · {pendingCount} PENDING</span>
        </div>
      </div>

      {error ? <ErrBox msg={error} /> : loading
        ? <div className="g2">{[0,1].map(i => <div key={i} style={{ height: 200, borderRadius: 20 }} className="sk" />)}</div>
        : isInsufficient
          ? <div className="g" style={{ padding: "36px 24px", textAlign: "center" }}><div className="gi">
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>No verified predictions yet.</div>
              <div style={{ fontSize: 10, color: "var(--text-dim)" }}>Results are automatically checked after matches finish.</div>
            </div></div>
          : <>
              {/* Stat chips row */}
              <div className="sp-acc-ring-row">
                {[
                  { label: "Overall Accuracy", val: overallAcc, color: "#00d68f", sub: `${verifiedCount} verified` },
                  { label: "Last 30 Accuracy", val: last30Acc,  color: "#4fa8ff", sub: "Improving trend" },
                  { label: "High Conf ≥70%",   val: highConfAcc, color: "#ffd60a", sub: `${acct?.high_confidence_count ?? "—"} predictions` },
                ].map(({ label, val, color, sub }) => (
                  <div key={label} className="sp-acc-ring-card">
                    <div className="sp-acc-val" style={{ color }}>
                      {val != null ? Math.round(val) : "—"}
                      {val != null && <span className="sp-acc-val-unit">%</span>}
                    </div>
                    <div className="sp-acc-lbl">{label}</div>
                    <div className="sp-acc-sub">{sub}</div>
                  </div>
                ))}
              </div>

              <div className="g2">
                {/* Left: confidence bands + rolling */}
                <div className="g" style={{ padding: 20 }}><div className="gi">
                  <div className="sp-sub">Accuracy by Confidence Band</div>
                  {confBands.length > 0
                    ? confBands.map((b, i) => {
                        const bc = b.bracket?.startsWith("High") ? "#00d68f" : b.bracket?.startsWith("Med") ? "#ff9f0a" : "#ff4757";
                        return (
                          <div key={i} className="sp-conf-band">
                            <span className="sp-band-lbl">{b.bracket}</span>
                            <div className="sp-band-bar-wrap"><div className="sp-band-bar" style={{ width: `${b.accuracy || 0}%`, "--bc": bc }} /></div>
                            <span className="sp-band-pct" style={{ "--bc": bc }}>{b.accuracy != null ? `${b.accuracy}%` : "—"}</span>
                            <span className="sp-band-count">{b.correct}/{b.count}</span>
                          </div>
                        );
                      })
                    : <Empty msg="Confidence breakdown loading…" />}

                  {rollingAcc.length > 0 && (
                    <>
                      <div className="sp-sub" style={{ marginTop: 16 }}>Rolling Windows</div>
                      <div className="sp-roll-chips">
                        {rollingAcc.map((r, i) => {
                          const rc = i === 0 ? "#00d68f" : i === 1 ? "#4fa8ff" : "rgba(255,255,255,0.45)";
                          return (
                            <div key={i} className="sp-roll-chip">
                              <div className="sp-roll-val" style={{ color: rc }}>{r.accuracy}%</div>
                              <div className="sp-roll-lbl">{r.window}</div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {avgConf != null && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 10, color: "var(--text-muted)" }}>
                      Avg confidence: <span className="mn" style={{ fontWeight: 900, color: "var(--text)" }}>{avgConf}%</span>
                    </div>
                  )}
                </div></div>

                {/* Right: recent verified predictions */}
                <div className="g" style={{ padding: 20 }}><div className="gi">
                  <div className="sp-sub">Recent Verified Predictions</div>
                  {recentPreds.length > 0
                    ? recentPreds.slice(0, 8).map((p, i) => {
                        const ic = p.correct;
                        const cc = p.confidence >= 70 ? "#00d68f" : p.confidence >= 55 ? "#ff9f0a" : "#ff4757";
                        return (
                          <div key={i} className="sp-verified-row">
                            <div className="sp-v-icon" style={{ background: ic ? "rgba(0,214,143,0.1)" : "rgba(255,71,87,0.1)", border: `1px solid ${ic ? "rgba(0,214,143,0.25)" : "rgba(255,71,87,0.25)"}`, color: ic ? "#00d68f" : "#ff4757" }}>
                              {ic ? "✓" : "✗"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="sp-v-match">{p.home} {p.score !== "—" ? p.score : ""} {p.away}</div>
                              <div className="sp-v-meta">
                                Predicted: <span style={{ color: ic ? "#00d68f" : "#ff4757", fontWeight: 700 }}>{p.predicted_outcome}</span>
                                {p.actual_outcome && <> · Actual: <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>{p.actual_outcome}</span></>}
                              </div>
                            </div>
                            <div className="sp-conf-badge" style={{ background: `${cc}18`, color: cc, border: `1px solid ${cc}28` }}>{p.confidence}%</div>
                          </div>
                        );
                      })
                    : <Empty msg="No verified results yet." />}
                </div></div>
              </div>
            </>
      }
    </div></section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// NEW SECTION — NEWS TRACKER
// Fetches from /api/intelligence/feed (RSS + StatinSite articles)
// ════════════════════════════════════════════════════════════════════════
const TYPE_COLOR = {
  transfer:     { nb: "#ff9f0a80", bg: "rgba(255,159,10,0.1)", c: "#ff9f0a" },
  news:         { nb: "#4fa8ff80", bg: "rgba(79,168,255,0.1)", c: "#4fa8ff" },
  analysis:     { nb: "#bf5af280", bg: "rgba(191,90,242,0.1)", c: "#bf5af2" },
  match_preview:{ nb: "#00d68f80", bg: "rgba(0,214,143,0.1)",  c: "#00d68f" },
  title_race:   { nb: "#ffd60a80", bg: "rgba(255,214,10,0.1)", c: "#ffd60a" },
  model_insight:{ nb: "#4fa8ff80", bg: "rgba(79,168,255,0.1)", c: "#4fa8ff" },
  headline:     { nb: "#4fa8ff80", bg: "rgba(79,168,255,0.1)", c: "#4fa8ff" },
};
function newsTypeStyle(type) { return TYPE_COLOR[type] || TYPE_COLOR.news; }

function timeAgo(dateStr) {
  if (!dateStr) return "";
  try {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 60000;
    if (diff < 60)  return `${Math.round(diff)}m ago`;
    if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
    return `${Math.round(diff / 1440)}d ago`;
  } catch { return ""; }
}

function NewsTrackerSection() {
  const [ref, vis] = useReveal(.04);
  const { data, loading, error } = useSectionFetch("/api/intelligence/feed?limit=12", 300_000);
  const items = useMemo(() => {
    const raw = data?.items ?? (Array.isArray(data) ? data : []);
    return raw.filter(a => a.title || a.headline).slice(0, 6);
  }, [data]);

  return (
    <section className="s"><div className="w">
      <div ref={ref} className="sp-sec-head" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div className="sp-sec-left">
          <div className="sp-eyebrow">Football Intelligence</div>
          <h2 className="sp-h2" style={{ "--sp-accent": "#4fa8ff" }}>News <span>Tracker</span></h2>
        </div>
        <Link to="/news" className="sp-sec-link">Full newsroom →</Link>
      </div>

      {error ? <ErrBox msg={error} /> : (
        <div className="sp-news-grid">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="sp-news-card" style={{ minHeight: 120 }}><Skel w="40%" h={9} /><div style={{ marginTop: 8 }} /><Skel w="90%" h={11} /><div style={{ marginTop: 6 }} /><Skel w="80%" h={9} /></div>
              ))
            : items.length > 0
              ? items.map((a, i) => {
                  const ts = newsTypeStyle(a.type);
                  const title  = a.title || a.headline || "";
                  const excerpt = a.excerpt || a.summary || a.body?.slice(0, 120) || "";
                  const source  = a.source || a.league || "";
                  const typeLabel = (a.type || "news").replace(/_/g, " ");
                  return (
                    <div key={i} className="sp-news-card" style={{ "--nb": ts.nb }}
                      onClick={() => a.url && window.open(a.url, "_blank", "noopener")}>
                      <div className="sp-news-source">
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span>{source}</span>
                          <span className="sp-news-type" style={{ "--tp-bg": ts.bg, "--tp-c": ts.c }}>{typeLabel}</span>
                        </div>
                        <span>{timeAgo(a.published_at)}</span>
                      </div>
                      <div className="sp-news-headline">{title}</div>
                      {excerpt && <div className="sp-news-excerpt">{excerpt}</div>}
                      <div className="sp-news-time">{source} · {a.published_at ? new Date(a.published_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""}</div>
                    </div>
                  );
                })
              : <div className="sp-news-card" style={{ gridColumn: "span 2", textAlign: "center", padding: 32 }}>
                  <Empty msg="News loading — server may be starting up." />
                </div>
          }
        </div>
      )}
    </div></section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// NEW SECTION — FPL NEWS & INJURY FEED
// Left: doubts/injuries from FPL bootstrap elements (status !== 'a')
// Right: price rise alerts + transfer brief
// ════════════════════════════════════════════════════════════════════════
const POS_COLOR = { GK: "#ff9f0a", DEF: "#4fa8ff", MID: "#00d68f", FWD: "#ff4757" };

function FplNewsSection({ dash }) {
  const [ref, vis] = useReveal(.04);
  // Fetch from the dedicated /api/home/fpl_player_news endpoint
  // which reads FPL bootstrap server-side and returns pre-shaped doubts + price_risers
  const { data: fplNews, loading: fplLoading } = useSectionFetch("/api/home/fpl_player_news", 1800_000);

  const injuryPlayers = fplNews?.doubts       ?? [];
  const priceRisers   = fplNews?.price_risers ?? [];

  const brief    = dash?.transfer_brief;
  const bullets  = brief?.key_transfers ?? [];
  const summary  = brief?.summary ?? "";

  function chanceColor(chance) {
    if (chance == null)  return { bg: "rgba(255,71,87,0.12)",  c: "#ff4757" };
    if (chance >= 75)    return { bg: "rgba(255,159,10,0.12)", c: "#ff9f0a" };
    if (chance >= 50)    return { bg: "rgba(255,159,10,0.12)", c: "#ff9f0a" };
    return                      { bg: "rgba(255,71,87,0.12)",  c: "#ff4757" };
  }

  return (
    <section className="s"><div className="w">
      <div ref={ref} className="sp-sec-head" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div className="sp-sec-left">
          <div className="sp-eyebrow">Fantasy Premier League</div>
          <h2 className="sp-h2" style={{ "--sp-accent": "#ff9f0a" }}>FPL <span>Injury &amp; News</span> Feed</h2>
        </div>
        <Link to="/fpl/gw-guide" className="sp-sec-link">GW Guide →</Link>
      </div>

      <div className="g2">
        {/* Injury / doubt list */}
        <div className="g" style={{ overflow: "hidden" }}>
          <div className="sp-bar" style={{ "--sp-bar": "rgba(255,71,87,0.5)" }} />
          <div style={{ padding: 18 }}><div className="gi">
            <div className="sp-sub">Doubts &amp; Injuries</div>
            {fplLoading
              ? Array.from({ length: 4 }).map((_, i) => <div key={i} style={{ height: 62, borderRadius: 11, marginBottom: 6 }} className="sk" />)
              : injuryPlayers.length > 0
                ? injuryPlayers.map((p, i) => {
                    const posC = POS_COLOR[p.pos] || "#4fa8ff";
                    const ch   = chanceColor(p.chance);
                    return (
                      <div key={i} className="sp-fpl-row" style={{ "--fpr": p.status === "i" || p.status === "s" ? "#ff4757" : "#ff9f0a" }}>
                        <div className="sp-fpl-avatar">{p.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="sp-fpl-name">{p.name}</div>
                          <div className="sp-fpl-team" style={{ color: posC }}>{p.team} · £{p.cost}m · {p.pos}</div>
                          {p.news && <div className="sp-fpl-news-txt">{p.news.slice(0, 100)}{p.news.length > 100 ? "…" : ""}</div>}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          {p.status === "u" || p.chance === 0
                            ? <div className="sp-chance-pill" style={{ background: "rgba(255,71,87,0.12)", color: "#ff4757" }}>OUT</div>
                            : p.chance != null
                              ? <div className="sp-chance-pill" style={{ background: ch.bg, color: ch.c }}>{p.chance}%</div>
                              : <div className="sp-chance-pill" style={{ background: "rgba(255,71,87,0.12)", color: "#ff4757" }}>Doubt</div>}
                          <div className="sp-chance-lbl">{p.status === "s" ? "susp." : p.status === "i" ? "injury" : "chance"}</div>
                        </div>
                      </div>
                    );
                  })
                : <Empty msg="No injury news — all players available." />}
          </div></div>
        </div>

        {/* Price rises + transfer brief */}
        <div className="g" style={{ overflow: "hidden" }}>
          <div className="sp-bar" style={{ "--sp-bar": "rgba(255,159,10,0.5)" }} />
          <div style={{ padding: 18 }}><div className="gi">
            <div className="sp-sub">Price Rise Alerts</div>
            {fplLoading
              ? Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ height: 58, borderRadius: 11, marginBottom: 6 }} className="sk" />)
              : priceRisers.length > 0
                ? priceRisers.map((p, i) => {
                    const posC = POS_COLOR[p.pos] || "#4fa8ff";
                    return (
                      <div key={i} className="sp-fpl-row" style={{ "--fpr": "#00d68f" }}>
                        <div className="sp-fpl-avatar">{p.name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="sp-fpl-name">{p.name}</div>
                          <div className="sp-fpl-team" style={{ color: posC }}>{p.team} · £{p.cost}m · {p.pos}</div>
                          <div className="sp-fpl-news-txt">Transfer net +{p.net?.toLocaleString() ?? "?"} this week · {p.ownership}% owned</div>
                        </div>
                        <div className="sp-chance-pill" style={{ background: "rgba(0,214,143,0.12)", color: "#00d68f" }}>▲ Rise</div>
                      </div>
                    );
                  })
                : <Empty msg="Transfer data loading…" />}

            {summary && (
              <>
                <div className="sp-sub" style={{ marginTop: 18 }}>Transfer Brief</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 12 }}>{summary}</div>
                {bullets.slice(0, 3).map((t, i) => (
                  <div key={i} className="sp-brief-bullet">
                    <div className="sp-brief-dot" />
                    <span>{typeof t === "string" ? t : t.text || t.headline || ""}</span>
                  </div>
                ))}
              </>
            )}
          </div></div>
        </div>
      </div>
    </div></section>
  );
}

function IntelligenceStack() {
  const [ref, vis] = useReveal(.04);
  return (
    <section className="s s--last"><div className="w">
      <div ref={ref} className="sp-sec-head" style={{ opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(12px)", transition: "all .5s" }}>
        <div className="sp-sec-left">
          <div className="sp-eyebrow">Platform</div>
          <h2 className="sp-h2" style={{ "--sp-accent": "#ffd60a" }}>The Intelligence <span>Stack</span></h2>
        </div>
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
      <LiveStrip      fixtures={fixtures} />
      <TitleRace      dash={dash} loading={dl} error={de} />
      <Div /><CommandGrid     fixtures={fixtures} dash={dash} loading={dl || ul} />
      <Div /><CompetitionHub  fixtures={fixtures} />
      <Div /><FPLHub          dash={dash} />
      <Div /><AccountabilitySection dash={dash} loading={dl} error={de} />
      <Div /><NewsTrackerSection />
      <Div /><FplNewsSection  dash={dash} />
      <Div /><TransferBrief   dash={dash} loading={dl} error={de} />
      <Div /><PowerRankings   dash={dash} loading={dl} error={de} />
      <Div /><IntelligenceStack />
    </div>
  );
}