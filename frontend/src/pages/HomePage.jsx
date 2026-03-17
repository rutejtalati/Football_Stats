// ═══════════════════════════════════════════════════════════════════════
// StatinSite — HomePage v8  "Dense Intelligence Platform"
// ═══════════════════════════════════════════════════════════════════════
// STRUCTURAL REDESIGN — density, composition, reduced emptiness
// Key changes from v7:
//   - Hero: 3-panel layout (left intel | center title | right intel)
//   - Metrics strip: merged into hero bottom area
//   - Today's Intel: kept, tighter padding
//   - Predictions: kept
//   - EdgeBoard: kept
//   - CommandGrid: all cards now show data, tighter
//   - CompetitionHub: horizontal compact strip, not sparse grid
//   - FPLHub: 2-column data-rich, no decorative orbit
//   - TrendingPlayers: kept
//   - WhyStatinSite: compact inline layout
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = "https://football-stats-lw4b.onrender.com";
const LIVE_SET = new Set(["1H","2H","HT","ET","BT","P"]);
const FT_SET   = new Set(["FT","AET","PEN"]);
const isToday  = d => d && new Date(d).toDateString() === new Date().toDateString();

/* ═══════════════════════════════════════════════════════
   INJECTED STYLES
   ═══════════════════════════════════════════════════════ */
const STYLE_ID = "hp8-injected-styles";
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;0,9..40,900;1,9..40,400&family=JetBrains+Mono:wght@400;700;800&display=swap');
:root {
  --bg-deep: #030712; --bg-card: rgba(6,11,26,.92); --bg-card-hover: rgba(12,20,42,.95);
  --border-subtle: rgba(255,255,255,.055); --border-hover: rgba(255,255,255,.12);
  --text: #e8edf5; --text-muted: #8896a8; --text-dim: #5e6b7d;
  --font-body: 'DM Sans', -apple-system, sans-serif; --font-mono: 'JetBrains Mono', monospace;
}
.hp8-root { font-family: var(--font-body); color: var(--text); background: var(--bg-deep); min-height: 100vh; overflow-x: hidden; -webkit-font-smoothing: antialiased; }
.hp8-root *, .hp8-root *::before, .hp8-root *::after { box-sizing: border-box; }
.hp8-mono { font-family: var(--font-mono); }
.hp8-container { max-width: 1280px; margin: 0 auto; padding: 0 20px; position: relative; z-index: 2; }
.hp8-section { padding: 28px 0 20px; position: relative; }

/* ── Keyframes ─────────────────────────── */
@keyframes hp8-fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
@keyframes hp8-fadeIn { from { opacity:0; } to { opacity:1; } }
@keyframes hp8-float { 0%,100% { transform:translateY(0) translateX(0); } 33% { transform:translateY(-16px) translateX(7px); } 66% { transform:translateY(5px) translateX(-5px); } }
@keyframes hp8-pulse { 0%,100% { opacity:.5; } 50% { opacity:1; } }
@keyframes hp8-shimmer { 0% { transform:translateX(-100%); } 100% { transform:translateX(200%); } }
@keyframes hp8-glow-breathe { 0%,100% { opacity:.35; filter:blur(40px); } 50% { opacity:.6; filter:blur(50px); } }
@keyframes hp8-scanline { 0% { transform:translateY(-100%); } 100% { transform:translateY(100vh); } }
@keyframes hp8-sweep { 0% { transform:rotate(0deg); } 100% { transform:rotate(360deg); } }
@keyframes hp8-strip-scroll { 0% { transform:translateX(0); } 100% { transform:translateX(-33.333%); } }
@keyframes hp8-gradient-flow { 0% { background-position:0% 50%; } 50% { background-position:100% 50%; } 100% { background-position:0% 50%; } }
@keyframes hp8-bar-grow { from { transform:scaleY(0); } to { transform:scaleY(1); } }
@keyframes hp8-ripple-out { to { transform:scale(3); opacity:0; } }
@keyframes hp8-dot-ping { 0% { transform:scale(1); opacity:1; } 100% { transform:scale(2.5); opacity:0; } }
@keyframes hp8-orbit { 0% { transform:rotate(0deg); } 100% { transform:rotate(360deg); } }

.hp8-skel { background:linear-gradient(90deg,rgba(255,255,255,.03) 25%,rgba(255,255,255,.06) 50%,rgba(255,255,255,.03) 75%); background-size:200% 100%; animation:hp8-shimmer 1.5s ease infinite; border-radius:5px; display:block; }
.hp8-live-dot { width:8px; height:8px; border-radius:50%; background:var(--dot-color,#ff4444); box-shadow:0 0 10px var(--dot-color,#ff4444); animation:hp8-pulse 1.6s ease-in-out infinite; flex-shrink:0; position:relative; }
.hp8-live-dot::after { content:''; position:absolute; inset:-3px; border-radius:50%; border:1px solid var(--dot-color,#ff4444); opacity:.4; animation:hp8-dot-ping 2s ease-out infinite; }
.hp8-live-dot--sm { width:6px; height:6px; }
.hp8-live-dot--sm::after { inset:-2px; }
.hp8-live-dot--xs { width:5px; height:5px; }
.hp8-live-dot--xs::after { display:none; }

/* ══════════════════════════════════════════════════
   HERO — 3-panel: left intel | center title | right intel
   ══════════════════════════════════════════════════ */
.hp8-hero { position:relative; min-height:72vh; display:flex; flex-direction:column; overflow:hidden; padding:80px 0 0; }
.hp8-hero-blob { position:absolute; border-radius:50%; pointer-events:none; filter:blur(80px); mix-blend-mode:screen; z-index:0; }
.hp8-hero-blob--a { width:420px; height:420px; background:radial-gradient(circle,rgba(56,189,248,.14) 0%,transparent 70%); top:8%; left:50%; transform:translate(-50%,-50%); animation:hp8-glow-breathe 8s ease-in-out infinite; }
.hp8-hero-blob--b { width:320px; height:320px; background:radial-gradient(circle,rgba(52,211,153,.1) 0%,transparent 70%); bottom:20%; left:20%; animation:hp8-glow-breathe 10s ease-in-out 2s infinite; }
.hp8-hero-blob--c { width:280px; height:280px; background:radial-gradient(circle,rgba(167,139,250,.08) 0%,transparent 70%); top:35%; right:12%; animation:hp8-glow-breathe 12s ease-in-out 4s infinite; }
.hp8-scanline { position:absolute; inset:0; z-index:1; pointer-events:none; background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(56,189,248,.01) 2px,rgba(56,189,248,.01) 4px); }
.hp8-scanline::after { content:''; position:absolute; left:0; right:0; height:120px; background:linear-gradient(180deg,rgba(56,189,248,.035),transparent); animation:hp8-scanline 6s linear infinite; opacity:.5; }

/* Hero 3-column layout */
.hp8-hero-grid { display:grid; grid-template-columns:260px 1fr 260px; gap:20px; align-items:center; max-width:1280px; margin:0 auto; padding:0 20px; position:relative; z-index:3; flex:1; }
.hp8-hero-panel { background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:14px; padding:14px 16px; backdrop-filter:blur(12px); }
.hp8-hero-panel + .hp8-hero-panel { margin-top:10px; }
.hp8-panel-label { font-size:9px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:var(--text-dim); margin-bottom:8px; display:flex; align-items:center; gap:6px; }
.hp8-panel-empty { font-size:10px; color:var(--text-dim); }
.hp8-panel-sub { font-size:10px; color:var(--text-dim); margin-top:4px; }
.hp8-live-row { display:flex; align-items:center; gap:6px; padding:5px 0; cursor:pointer; transition:opacity .2s; }
.hp8-live-row:hover { opacity:.8; }
.hp8-lr-name { font-size:10px; font-weight:600; color:var(--text-muted); }
.hp8-lr-score { font-family:var(--font-mono); font-size:11px; font-weight:900; color:var(--text); margin:0 3px; }
.hp8-lr-min { font-family:var(--font-mono); font-size:9px; color:#ff6666; font-weight:700; margin-left:auto; }
.hp8-pred-mini { display:flex; align-items:center; gap:6px; padding:5px 0; cursor:pointer; }
.hp8-pred-mini:hover { opacity:.8; }
.hp8-pm-teams { font-size:10px; font-weight:600; flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hp8-pm-prob { font-family:var(--font-mono); font-size:10px; font-weight:800; }
.hp8-conf-val { font-family:var(--font-mono); font-size:28px; font-weight:900; line-height:1; }
.hp8-qlink { display:flex; align-items:center; justify-content:space-between; padding:6px 10px; margin:0 -10px; border-radius:6px; font-size:11px; font-weight:600; color:var(--text-muted); text-decoration:none; transition:all .2s; }
.hp8-qlink:hover { background:rgba(255,255,255,.03); color:var(--text); }
.hp8-qlink-arrow { font-size:10px; opacity:.4; transition:opacity .2s,transform .2s; }
.hp8-qlink:hover .hp8-qlink-arrow { opacity:1; transform:translateX(2px); }

/* Hero center */
.hp8-hero-center { text-align:center; }
.hp8-hero-chip { display:inline-flex; align-items:center; gap:8px; padding:5px 16px; border-radius:999px; background:rgba(56,189,248,.06); border:1px solid rgba(56,189,248,.15); font-size:9px; font-weight:700; letter-spacing:.14em; color:rgba(56,189,248,.9); text-transform:uppercase; font-family:var(--font-mono); animation:hp8-fadeUp .6s ease both; backdrop-filter:blur(12px); }
.hp8-hero-chip--live { background:rgba(255,68,68,.06); border-color:rgba(255,68,68,.2); color:#ff6666; }
.hp8-hero-title { font-size:clamp(48px,8vw,82px); font-weight:900; line-height:.92; letter-spacing:-0.035em; margin:14px 0 0; animation:hp8-fadeUp .6s ease .08s both; }
.hp8-hero-accent { background:linear-gradient(135deg,#38bdf8 0%,#34d399 40%,#a78bfa 80%,#38bdf8 100%); background-size:200% 200%; animation:hp8-gradient-flow 6s ease infinite; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; filter:drop-shadow(0 0 28px rgba(56,189,248,.3)) drop-shadow(0 0 50px rgba(52,211,153,.18)); }
.hp8-hero-sub { font-size:14px; line-height:1.6; color:var(--text-muted); max-width:440px; margin:12px auto 0; animation:hp8-fadeUp .6s ease .16s both; }
.hp8-hero-ctas { display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-top:20px; animation:hp8-fadeUp .6s ease .24s both; }

/* Hero metrics bar (bottom of hero) */
.hp8-hero-metrics { position:relative; z-index:3; max-width:1280px; margin:0 auto; padding:16px 20px 20px; display:grid; grid-template-columns:repeat(4,1fr); gap:10px; }
.hp8-hm-card { background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:10px; padding:12px 14px; position:relative; overflow:hidden; transition:all .22s; }
.hp8-hm-card::after { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:var(--hm-accent,#38bdf8); opacity:.35; }
.hp8-hm-card:hover { border-color:var(--border-hover); transform:translateY(-1px); }
.hp8-hm-label { font-size:9px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--text-dim); margin-bottom:4px; }
.hp8-hm-val { font-family:var(--font-mono); font-size:22px; font-weight:800; color:var(--hm-accent,#38bdf8); line-height:1; }
.hp8-hm-sub { font-size:9px; color:var(--text-dim); margin-top:3px; }

/* Buttons */
.hp8-btn { position:relative; overflow:hidden; cursor:pointer; display:inline-flex; align-items:center; gap:6px; padding:10px 20px; border-radius:9px; font-family:var(--font-body); font-size:12px; font-weight:700; border:1px solid var(--border-subtle); background:var(--bg-card); color:var(--text); transition:all .22s; backdrop-filter:blur(8px); }
.hp8-btn:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(0,0,0,.4),0 0 16px var(--btn-glow,rgba(56,189,248,.12)); border-color:var(--btn-border,rgba(56,189,248,.3)); }
.hp8-btn:active { transform:translateY(0); }
.hp8-btn--primary { --btn-glow:rgba(56,189,248,.18); --btn-border:rgba(56,189,248,.35); background:linear-gradient(135deg,rgba(56,189,248,.1),rgba(52,211,153,.06)); border-color:rgba(56,189,248,.2); }
.hp8-btn--live { --btn-glow:rgba(255,68,68,.2); --btn-border:rgba(255,68,68,.35); background:linear-gradient(135deg,rgba(255,68,68,.1),rgba(255,100,100,.05)); border-color:rgba(255,68,68,.25); color:#ff6666; }
.hp8-btn--fpl { --btn-glow:rgba(52,211,153,.18); --btn-border:rgba(52,211,153,.25); background:linear-gradient(135deg,rgba(52,211,153,.08),rgba(52,211,153,.03)); border-color:rgba(52,211,153,.18); color:#34d399; }
.hp8-btn--ghost { --btn-glow:rgba(167,139,250,.12); --btn-border:rgba(167,139,250,.2); }
.hp8-btn-sweep { position:absolute; top:0; left:-100%; width:50%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.05),transparent); }
.hp8-btn:hover .hp8-btn-sweep { animation:hp8-shimmer 1s ease forwards; }
.hp8-ripple { position:absolute; width:8px; height:8px; border-radius:50%; background:rgba(255,255,255,.22); transform:scale(0); animation:hp8-ripple-out .6s ease forwards; pointer-events:none; }

/* ══════════════════════════════════════════════
   LIVE STRIP
   ══════════════════════════════════════════════ */
.hp8-live-strip { position:relative; overflow:hidden; background:linear-gradient(180deg,rgba(255,68,68,.025),transparent); border-top:1px solid rgba(255,68,68,.06); border-bottom:1px solid rgba(255,68,68,.04); padding:8px 0; }
.hp8-strip-fade { position:absolute; top:0; bottom:0; width:60px; z-index:3; pointer-events:none; }
.hp8-strip-fade--l { left:0; background:linear-gradient(90deg,var(--bg-deep),transparent); }
.hp8-strip-fade--r { right:0; background:linear-gradient(-90deg,var(--bg-deep),transparent); }
.hp8-strip-track { display:flex; gap:14px; white-space:nowrap; animation:hp8-strip-scroll var(--dur,30s) linear infinite; }
.hp8-strip-chip { display:inline-flex; align-items:center; gap:5px; padding:4px 12px; border-radius:999px; background:rgba(255,68,68,.04); border:1px solid rgba(255,68,68,.08); cursor:pointer; transition:all .2s; flex-shrink:0; }
.hp8-strip-chip:hover { background:rgba(255,68,68,.08); border-color:rgba(255,68,68,.18); transform:translateY(-1px); }
.hp8-chip-logo { width:13px; height:13px; object-fit:contain; }
.hp8-chip-team { font-size:10px; font-weight:600; color:var(--text-muted); }
.hp8-chip-score { font-family:var(--font-mono); font-size:11px; font-weight:800; }
.hp8-chip-min { font-family:var(--font-mono); font-size:9px; color:#ff6666; font-weight:700; }

/* ══════════════════════════════════════════════
   SECTION HEADS + DIVIDERS
   ══════════════════════════════════════════════ */
.hp8-section-head { display:flex; align-items:flex-end; justify-content:space-between; gap:14px; margin-bottom:14px; }
.hp8-eyebrow { font-size:9px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--text-dim); margin-bottom:4px; }
.hp8-section-title { font-size:clamp(18px,2.5vw,23px); font-weight:900; letter-spacing:-0.02em; color:var(--text); line-height:1.15; margin:0; }
.hp8-see-all { font-size:10px; color:rgba(56,189,248,.7); text-decoration:none; font-weight:600; white-space:nowrap; transition:color .2s; padding:3px 10px; border-radius:999px; border:1px solid rgba(56,189,248,.1); background:rgba(56,189,248,.03); }
.hp8-see-all:hover { color:#38bdf8; background:rgba(56,189,248,.07); border-color:rgba(56,189,248,.2); }
.hp8-sub-label { font-size:9px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--text-dim); margin-bottom:8px; }
.hp8-divider { height:1px; max-width:1200px; margin:0 auto; background:linear-gradient(90deg,transparent 5%,rgba(56,189,248,.06) 30%,rgba(52,211,153,.04) 70%,transparent 95%); }
.hp8-empty-state { font-size:10px; color:var(--text-dim); padding:12px; text-align:center; }

/* ══════════════════════════════════════════════
   INTEL CARDS
   ══════════════════════════════════════════════ */
.hp8-intel-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:8px; }
.hp8-intel-card { position:relative; overflow:hidden; padding:12px 14px; border-radius:10px; background:var(--bg-card); border:1px solid var(--border-subtle); border-left:3px solid var(--ic-color,#38bdf8); cursor:pointer; transition:all .22s; }
.hp8-intel-card:hover { background:var(--bg-card-hover); border-color:var(--ic-color,#38bdf8); transform:translateY(-1px) translateX(2px); box-shadow:0 6px 20px rgba(0,0,0,.25); }
.hp8-ic-signal { font-size:8px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:var(--ic-color,#38bdf8); margin-bottom:4px; display:flex; align-items:center; gap:5px; }
.hp8-ic-signal::before { content:''; width:5px; height:5px; border-radius:50%; background:var(--ic-color,#38bdf8); opacity:.7; }
.hp8-ic-title { font-size:12px; font-weight:700; color:var(--text); line-height:1.3; }
.hp8-ic-detail { font-size:10px; color:var(--text-muted); margin-top:3px; max-height:0; overflow:hidden; transition:max-height .3s,opacity .3s; opacity:0; }
.hp8-intel-card:hover .hp8-ic-detail { max-height:36px; opacity:1; }

/* ══════════════════════════════════════════════
   PREDICTION CARDS (horizontal scroll)
   ══════════════════════════════════════════════ */
.hp8-hscroll { display:flex; gap:10px; overflow-x:auto; padding-bottom:6px; scrollbar-width:thin; scrollbar-color:rgba(255,255,255,.05) transparent; }
.hp8-hscroll::-webkit-scrollbar { height:3px; }
.hp8-hscroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,.07); border-radius:4px; }
.hp8-pred-card { position:relative; overflow:hidden; padding:14px 16px; border-radius:14px; background:var(--bg-card); border:1px solid var(--border-subtle); cursor:pointer; transition:all .25s; }
.hp8-pred-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,var(--pc-color,#38bdf8),transparent); opacity:.4; }
.hp8-pred-card--hov { transform:translateY(-3px); border-color:rgba(255,255,255,.1); box-shadow:0 10px 32px rgba(0,0,0,.35); }
.hp8-pc-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
.hp8-pc-league { font-size:9px; font-weight:700; color:var(--text-dim); letter-spacing:.06em; text-transform:uppercase; }
.hp8-pc-teams { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; }
.hp8-pc-team { display:flex; align-items:center; gap:5px; flex:1; min-width:0; }
.hp8-pc-tname { font-size:11px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hp8-pc-score-area { text-align:center; flex-shrink:0; }
.hp8-pc-predicted { font-family:var(--font-mono); font-size:16px; font-weight:900; }
.hp8-pc-probbar { display:flex; height:3px; border-radius:999px; overflow:hidden; gap:1px; margin-bottom:5px; }
.hp8-pc-probs { display:flex; justify-content:space-between; font-size:9px; }
.hp8-pc-markets { display:flex; align-items:center; gap:8px; margin-top:6px; font-size:9px; color:var(--text-muted); }
.hp8-pc-badge { padding:1px 7px; border-radius:999px; font-size:8px; font-weight:800; font-family:var(--font-mono); }
.hp8-pc-expand { max-height:0; overflow:hidden; transition:max-height .3s,margin .3s; }
.hp8-pc-expand--vis { max-height:20px; margin-top:6px; }

/* ══════════════════════════════════════════════
   EDGE BOARD
   ══════════════════════════════════════════════ */
.hp8-edge-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.hp8-edge-card { padding:12px 14px; border-radius:10px; background:var(--bg-card); border:1px solid var(--border-subtle); transition:all .22s; position:relative; overflow:hidden; }
.hp8-edge-card:hover { border-color:var(--border-hover); transform:translateY(-1px); box-shadow:0 6px 20px rgba(0,0,0,.25); }
.hp8-edge-tag { font-size:8px; font-weight:800; letter-spacing:.1em; }
.hp8-edge-match { font-size:11px; font-weight:700; margin-top:3px; }
.hp8-edge-val { font-family:var(--font-mono); font-size:20px; font-weight:900; margin-top:2px; }
.hp8-edge-dir { font-size:9px; color:var(--text-muted); }
.hp8-xg-card { padding:12px 14px; border-radius:10px; background:var(--bg-card); border:1px solid var(--border-subtle); cursor:pointer; transition:all .22s; }
.hp8-xg-card:hover { border-color:var(--border-hover); transform:translateY(-1px); box-shadow:0 6px 20px rgba(0,0,0,.25); }
.hp8-xg-tag { font-size:8px; font-weight:800; letter-spacing:.1em; color:#f59e0b; }
.hp8-xg-total { font-family:var(--font-mono); font-size:20px; font-weight:900; color:#f59e0b; }
.hp8-xg-match { font-size:11px; color:var(--text-muted); font-weight:600; }

/* ══════════════════════════════════════════════
   COMMAND GRID (bento)
   ══════════════════════════════════════════════ */
.hp8-bento { display:grid; grid-template-columns:repeat(4,1fr); grid-auto-rows:minmax(140px,auto); gap:10px; }
.hp8-tool-wrap { position:relative; }
.hp8-tool-card { position:relative; overflow:hidden; height:100%; border-radius:14px; background:var(--bg-card); border:1px solid var(--border-subtle); transition:transform .2s,box-shadow .2s,border-color .2s; }
.hp8-tool-card--hov { border-color:rgba(255,255,255,.1); box-shadow:0 12px 40px rgba(0,0,0,.35); }
.hp8-tool-glow { position:absolute; inset:0; pointer-events:none; z-index:0; transition:background .15s; opacity:.5; }
.hp8-tool-shimmer { position:absolute; top:0; left:-100%; width:50%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.015),transparent); z-index:1; pointer-events:none; }
.hp8-tool-shimmer--active { animation:hp8-shimmer 1.5s ease forwards; }
.hp8-idle-shimmer { position:absolute; inset:0; overflow:hidden; pointer-events:none; z-index:1; }
.hp8-idle-shimmer::after { content:''; position:absolute; top:0; left:-120%; width:30%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.012),transparent); animation:hp8-shimmer 4s ease infinite; }
.hp8-tool-topbar { position:absolute; top:0; left:0; right:0; height:2px; background:var(--tc-color,#38bdf8); opacity:.3; }
.hp8-tool-link { display:flex; flex-direction:column; height:100%; padding:16px; position:relative; z-index:2; text-decoration:none; color:inherit; }
.hp8-tool-header { display:flex; justify-content:space-between; align-items:flex-start; }
.hp8-tool-tag { font-size:8px; font-weight:800; letter-spacing:.1em; font-family:var(--font-mono); }
.hp8-tool-title { font-size:16px; font-weight:900; margin-top:6px; letter-spacing:-0.01em; }
.hp8-tool-sub { font-size:10px; color:var(--text-muted); margin-top:3px; line-height:1.35; }
.hp8-td { margin-top:8px; padding-top:8px; border-top:1px solid var(--border-subtle); }
.hp8-td-val { font-size:10px; font-weight:700; }
.hp8-td-sub { font-size:9px; color:var(--text-dim); margin-top:1px; }
.hp8-tool-gfx-bg { position:absolute; bottom:8px; right:8px; opacity:.05; z-index:0; pointer-events:none; transition:opacity .3s; }
.hp8-tool-card--hov .hp8-tool-gfx-bg { opacity:.1; }
.hp8-tool-gfx-top { transition:opacity .2s; }
.hp8-tool-cta { margin-top:auto; padding-top:8px; font-size:10px; font-weight:700; color:var(--tc-color,#38bdf8); opacity:.5; transition:opacity .2s; }
.hp8-tool-card--hov .hp8-tool-cta { opacity:1; }

/* ══════════════════════════════════════════════
   COMPETITIONS — compact horizontal strip
   ══════════════════════════════════════════════ */
.hp8-comp-strip { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:8px; }
.hp8-comp-chip { display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:10px; background:var(--bg-card); border:1px solid var(--border-subtle); text-decoration:none; color:inherit; transition:all .22s; position:relative; overflow:hidden; }
.hp8-comp-chip::after { content:''; position:absolute; top:0; left:0; right:0; height:2px; background:var(--cc-color,#38bdf8); opacity:.3; }
.hp8-comp-chip:hover { border-color:var(--cc-color,#38bdf8); transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,.25); }
.hp8-comp-chip img { width:22px; height:22px; object-fit:contain; flex-shrink:0; }
.hp8-cc-info { flex:1; min-width:0; }
.hp8-cc-name { font-size:11px; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hp8-cc-stats { font-size:8px; color:var(--text-dim); margin-top:1px; font-family:var(--font-mono); font-weight:600; }
.hp8-cc-badges { display:flex; gap:3px; margin-top:4px; }
.hp8-cc-badge { font-size:7px; padding:1px 5px; border-radius:999px; background:rgba(255,255,255,.03); border:1px solid var(--border-subtle); color:var(--text-dim); font-weight:600; }

/* ══════════════════════════════════════════════
   FPL HUB — 2-column data-rich
   ══════════════════════════════════════════════ */
.hp8-fpl-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.hp8-fpl-panel { background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px; padding:16px; }
.hp8-fpl-panel-title { font-size:10px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--text-dim); margin-bottom:10px; display:flex; align-items:center; gap:6px; }
.hp8-fpl-panel-title::before { content:''; width:5px; height:5px; border-radius:50%; background:var(--fp-color,#34d399); }
.hp8-capt-row { display:flex; align-items:center; gap:8px; padding:7px 0; border-bottom:1px solid var(--border-subtle); }
.hp8-capt-row:last-child { border-bottom:none; }
.hp8-cr-rank { font-family:var(--font-mono); font-size:9px; color:var(--text-dim); font-weight:800; }
.hp8-cr-name { font-size:11px; font-weight:700; }
.hp8-cr-meta { font-size:9px; color:var(--text-dim); }
.hp8-cr-ep { font-family:var(--font-mono); font-size:14px; font-weight:900; color:#34d399; margin-left:auto; }
.hp8-fpl-row { display:flex; align-items:center; gap:6px; padding:6px 8px; border-radius:6px; transition:all .2s; cursor:pointer; text-decoration:none; color:inherit; }
.hp8-fpl-row:hover { background:rgba(255,255,255,.025); transform:translateX(3px); }
.hp8-fpl-dot { width:4px; height:4px; border-radius:50%; background:var(--fpl-color,#34d399); opacity:.5; flex-shrink:0; }
.hp8-fpl-row:hover .hp8-fpl-dot { opacity:1; }
.hp8-fpl-label { font-size:11px; font-weight:700; flex:1; }
.hp8-fpl-stat { font-size:9px; color:var(--text-muted); font-family:var(--font-mono); font-weight:600; }
.hp8-fpl-arrow { font-size:10px; opacity:0; color:var(--fpl-color,#34d399); transition:opacity .2s; }
.hp8-fpl-row:hover .hp8-fpl-arrow { opacity:.7; }
.hp8-fpl-signal { padding:8px 10px; border-radius:8px; background:rgba(255,255,255,.015); border:1px solid var(--border-subtle); margin-top:6px; }
.hp8-fpl-signal-label { font-size:8px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--text-dim); }
.hp8-fpl-signal-val { font-size:12px; font-weight:700; margin-top:2px; }

/* ══════════════════════════════════════════════
   TRENDING PLAYERS
   ══════════════════════════════════════════════ */
.hp8-player-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:8px; }
.hp8-player-card { padding:12px; border-radius:10px; background:var(--bg-card); border:1px solid var(--border-subtle); cursor:pointer; transition:all .22s; }
.hp8-player-card:hover { transform:translateY(-2px); border-color:var(--border-hover); box-shadow:0 6px 20px rgba(0,0,0,.25); }
.hp8-pc2-top { display:flex; align-items:center; gap:7px; }
.hp8-pc2-name { font-size:11px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hp8-pc2-team { font-size:9px; color:var(--text-dim); }
.hp8-pc2-stat { font-family:var(--font-mono); font-size:13px; font-weight:900; text-align:right; }

/* ══════════════════════════════════════════════
   WHY STATINSITE — compact inline
   ══════════════════════════════════════════════ */
.hp8-why-layout { display:grid; grid-template-columns:repeat(6,1fr); gap:8px; }
.hp8-model-chip { display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:8px; background:var(--bg-card); border:1px solid var(--border-subtle); transition:all .2s; }
.hp8-model-chip:hover { border-color:var(--border-hover); }
.hp8-mc-dot { width:6px; height:6px; border-radius:50%; background:var(--mc-color,#38bdf8); flex-shrink:0; box-shadow:0 0 6px var(--mc-color,#38bdf8); }
.hp8-mc-name { font-size:10px; font-weight:800; }
.hp8-mc-desc { font-size:8px; color:var(--text-dim); margin-top:1px; }
.hp8-facts-row { display:flex; gap:16px; margin-top:12px; justify-content:center; }
.hp8-fact-item { text-align:center; }
.hp8-fact-val { font-family:var(--font-mono); font-size:18px; font-weight:900; color:#38bdf8; }
.hp8-fact-label { font-size:8px; color:var(--text-dim); font-weight:600; margin-top:1px; }

/* ══════════════════════════════════════════════
   RESPONSIVE
   ══════════════════════════════════════════════ */
@media (max-width:1024px) {
  .hp8-hero-grid { grid-template-columns:1fr; }
  .hp8-hero-grid > div:first-child, .hp8-hero-grid > div:last-child { display:none; }
  .hp8-bento { grid-template-columns:repeat(2,1fr); }
  .hp8-edge-grid { grid-template-columns:1fr; }
  .hp8-fpl-grid { grid-template-columns:1fr; }
  .hp8-why-layout { grid-template-columns:repeat(3,1fr); }
  .hp8-hero-metrics { grid-template-columns:repeat(2,1fr); }
}
@media (max-width:600px) {
  .hp8-bento { grid-template-columns:1fr; }
  .hp8-hero-metrics { grid-template-columns:1fr 1fr; }
  .hp8-comp-strip { grid-template-columns:1fr 1fr; }
  .hp8-why-layout { grid-template-columns:repeat(2,1fr); }
  .hp8-hero { min-height:65vh; padding:70px 0 0; }
  .hp8-hero-title { font-size:clamp(36px,10vw,56px); }
}
`;
  document.head.appendChild(style);
}

// ─── Data hooks ───────────────────────────────────
function useUpcoming() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let dead = false;
    const k = "hp8_up";
    try { const r = sessionStorage.getItem(k); if (r) { const {ts,p} = JSON.parse(r); if (Date.now()-ts<180000) { setData(p); setLoading(false); return; } } } catch {}
    fetch(`${API}/api/matches/upcoming`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (dead || !d) return;
        const raw = d.matches || d.chips || [];
        const m = raw.map(c => ({
          fixture_id: c.fixture_id, home_team: c.home_team, away_team: c.away_team,
          home_logo: c.home_logo, away_logo: c.away_logo,
          home_score: c.home_score??null, away_score: c.away_score??null,
          status: c.status, minute: c.minute, kickoff: c.kickoff||c.date,
          league_name: c.league_name||c.league, league_id: c.league_id,
          p_home_win: c.p_home_win??null, p_draw: c.p_draw??null, p_away_win: c.p_away_win??null,
          confidence: c.confidence??null, home_form: c.home_form||"", away_form: c.away_form||"",
        }));
        setData(m);
        try { sessionStorage.setItem(k, JSON.stringify({ts:Date.now(),p:m})); } catch {}
      }).catch(()=>{}).finally(()=>{ if(!dead) setLoading(false); });
    return () => { dead = true; };
  }, []);
  return { fixtures: data, loading };
}

function useDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let dead = false;
    const k = "hp8_dash";
    try { const r = sessionStorage.getItem(k); if (r) { const {ts,p} = JSON.parse(r); if (Date.now()-ts<300000) { setData(p); setLoading(false); return; } } } catch {}
    fetch(`${API}/api/home/dashboard`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (dead||!d) return; setData(d); try { sessionStorage.setItem(k, JSON.stringify({ts:Date.now(),p:d})); } catch {} })
      .catch(()=>{}).finally(()=>{ if(!dead) setLoading(false); });
    return () => { dead = true; };
  }, []);
  return { dash: data, loading };
}

// ─── Utility hooks ────────────────────────────────
function useReveal(thr = 0.06) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); io.disconnect(); } }, { threshold: thr });
    io.observe(el); return () => io.disconnect();
  }, []);
  return [ref, v];
}

function useTilt(str = 5) {
  const ref = useRef(null);
  const [tf, setTf] = useState("perspective(900px) rotateX(0) rotateY(0) scale3d(1,1,1)");
  const [gl, setGl] = useState({x:50,y:50});
  const onMove = useCallback(e => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX-r.left)/r.width, y = (e.clientY-r.top)/r.height;
    setTf(`perspective(900px) rotateX(${(y-.5)*-str}deg) rotateY(${(x-.5)*str}deg) scale3d(1.012,1.012,1.012)`);
    setGl({x:Math.round(x*100),y:Math.round(y*100)});
  }, [str]);
  const onLeave = useCallback(() => { setTf("perspective(900px) rotateX(0) rotateY(0) scale3d(1,1,1)"); setGl({x:50,y:50}); }, []);
  return {ref, tf, gl, onMove, onLeave};
}

function CountUp({ to, suffix="", dur=900 }) {
  const [v, setV] = useState(0);
  const [ref, vis] = useReveal(0.1);
  const ran = useRef(false);
  useEffect(() => {
    if (!vis||ran.current||!to) return; ran.current=true;
    const t0 = performance.now();
    const go = ts => { const p=Math.min((ts-t0)/dur,1); setV(Math.round((1-Math.pow(1-p,4))*to)); if(p<1) requestAnimationFrame(go); };
    requestAnimationFrame(go);
  }, [vis, to, dur]);
  return <span ref={ref} className="hp8-mono">{v}{suffix}</span>;
}

function RippleBtn({ children, onClick, cls="", style={} }) {
  const [rips, setRips] = useState([]);
  const go = e => {
    const r = e.currentTarget.getBoundingClientRect(), id=Date.now();
    setRips(p=>[...p,{id,x:e.clientX-r.left,y:e.clientY-r.top}]);
    setTimeout(()=>setRips(p=>p.filter(r=>r.id!==id)),700);
    onClick?.(e);
  };
  return <button className={`hp8-btn ${cls}`} style={style} onClick={go}>{children}{rips.map(r=><span key={r.id} className="hp8-ripple" style={{left:r.x,top:r.y}}/>)}</button>;
}

function Skel({w="100%",h=14,r=5}) { return <div className="hp8-skel" style={{width:w,height:h,borderRadius:r,display:"block"}}/>; }

function FormPip({r}) {
  const c=r==="W"?"#34d399":r==="D"?"#f59e0b":"#f87171";
  return <div style={{width:13,height:13,borderRadius:3,background:`${c}22`,border:`1px solid ${c}50`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:900,color:c}}>{r}</div>;
}

// ─── Background animations ────────────────────────
function TelemetryGrid() {
  const c = useRef(null);
  useEffect(() => {
    const canvas = c.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); let raf, t=0;
    const resize = () => { canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight; };
    resize(); window.addEventListener("resize",resize);
    const draw = () => {
      const {width:W,height:H} = canvas; ctx.clearRect(0,0,W,H);
      const SZ=56, cols=Math.ceil(W/SZ)+2, rows=Math.ceil(H/SZ)+2;
      const ox=(t*0.25)%SZ, oy=(t*0.12)%SZ;
      for(let i=-1;i<cols;i++){const a=0.025+0.015*Math.sin(i*0.4+t*0.007);ctx.strokeStyle=`rgba(56,189,248,${a})`;ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(i*SZ-ox,0);ctx.lineTo(i*SZ-ox,H);ctx.stroke();}
      for(let j=-1;j<rows;j++){const a=0.025+0.015*Math.sin(j*0.5+t*0.005);ctx.strokeStyle=`rgba(56,189,248,${a})`;ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(0,j*SZ-oy);ctx.lineTo(W,j*SZ-oy);ctx.stroke();}
      for(let i=0;i<cols;i++) for(let j=0;j<rows;j++){const p=Math.sin(i*0.8+j*0.6+t*0.04);if(p>0.65){const intensity=(p-0.65)*1.2;ctx.fillStyle=`rgba(52,211,153,${intensity*0.5})`;ctx.beginPath();ctx.arc(i*SZ-ox,j*SZ-oy,1.8,0,Math.PI*2);ctx.fill();ctx.fillStyle=`rgba(52,211,153,${intensity*0.15})`;ctx.beginPath();ctx.arc(i*SZ-ox,j*SZ-oy,5,0,Math.PI*2);ctx.fill();}}
      const scanY=(t*0.8)%H;const grad=ctx.createLinearGradient(0,scanY-30,0,scanY+30);grad.addColorStop(0,'rgba(56,189,248,0)');grad.addColorStop(0.5,'rgba(56,189,248,0.03)');grad.addColorStop(1,'rgba(56,189,248,0)');ctx.fillStyle=grad;ctx.fillRect(0,scanY-30,W,60);
      t++;raf=requestAnimationFrame(draw);
    };
    draw(); return () => { cancelAnimationFrame(raf); window.removeEventListener("resize",resize); };
  },[]);
  return <canvas ref={c} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0}}/>;
}

function Particles({n=20}) {
  const ps = useMemo(()=>Array.from({length:n},(_,i)=>({id:i,x:Math.random()*100,y:Math.random()*100,sz:1+Math.random()*2.2,dur:10+Math.random()*14,del:-Math.random()*18,c:["56,189,248","52,211,153","167,139,250","245,158,11"][i%4]})),[n]);
  return <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>{ps.map(p=><div key={p.id} style={{position:"absolute",left:`${p.x}%`,top:`${p.y}%`,width:p.sz,height:p.sz,borderRadius:"50%",background:`rgba(${p.c},0.5)`,boxShadow:`0 0 ${p.sz*4}px rgba(${p.c},0.3)`,animation:`hp8-float ${p.dur}s ${p.del}s linear infinite`}}/>)}</div>;
}

// ═══════════════════════════════════════════════════
// HERO — 3-panel layout with flanking intelligence
// ═══════════════════════════════════════════════════
function HeroSection({ fixtures, upcoming_loading, dash, dash_loading }) {
  const nav = useNavigate();
  const heroRef = useRef(null);
  const [mouse, setMouse] = useState({x:.5,y:.5});
  const liveCount = fixtures.filter(f=>LIVE_SET.has(f.status)).length;
  const todayCount = fixtures.filter(f=>isToday(f.kickoff)).length;
  const avgConf = dash?.model_confidence?.avg_confidence??null;
  const topEdge = dash?.model_edges?.edges?.[0]??null;
  const live = fixtures.filter(f=>LIVE_SET.has(f.status)).slice(0,3);
  const topPred = dash?.top_predictions?.predictions?.[0];
  const conf = dash?.model_confidence;
  const edge = dash?.model_edges?.edges?.[0];
  const onMove = useCallback(e=>{const r=heroRef.current?.getBoundingClientRect();if(!r)return;setMouse({x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height});},[]);

  return (
    <section className="hp8-hero" ref={heroRef} onMouseMove={onMove}>
      <TelemetryGrid/>
      <Particles n={20}/>
      {[{cls:"hp8-hero-blob hp8-hero-blob--a",dx:.5,dy:.4},{cls:"hp8-hero-blob hp8-hero-blob--b",dx:-.3,dy:-.3},{cls:"hp8-hero-blob hp8-hero-blob--c",dx:.6,dy:.5}].map(({cls,dx,dy},i)=>(
        <div key={i} className={cls} style={{transform:`translate(calc(-50% + ${(mouse.x-.5)*30*dx}px),calc(-50% + ${(mouse.y-.5)*20*dy}px))`,transition:"transform 0.2s ease"}}/>
      ))}
      <div className="hp8-scanline"/>

      {/* 3-column hero grid */}
      <div className="hp8-hero-grid">
        {/* LEFT: Live matches + model confidence */}
        <div style={{animation:"hp8-fadeUp .6s ease .1s both"}}>
          <div className="hp8-hero-panel">
            <div className="hp8-panel-label">
              {live.length>0&&<span className="hp8-live-dot hp8-live-dot--sm" style={{"--dot-color":"#ff4444"}}/>}
              {live.length>0?"LIVE CENTRE":"UPCOMING"}
            </div>
            {live.length>0 ? live.map(f=>(
              <div key={f.fixture_id} className="hp8-live-row" onClick={()=>nav(`/match/${f.fixture_id}`)}>
                {f.home_logo&&<img src={f.home_logo} width={13} height={13} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
                <span className="hp8-lr-name">{f.home_team?.split(" ").slice(-1)[0]}</span>
                <span className="hp8-lr-score">{f.home_score??0}–{f.away_score??0}</span>
                <span className="hp8-lr-name">{f.away_team?.split(" ").slice(-1)[0]}</span>
                {f.minute&&<span className="hp8-lr-min">{f.minute}'</span>}
              </div>
            )) : (
              <div className="hp8-panel-empty">{todayCount} fixtures today</div>
            )}
          </div>
          <div className="hp8-hero-panel" style={{marginTop:10}}>
            <div className="hp8-panel-label">MODEL SIGNALS</div>
            {dash_loading||!conf ? <Skel w="60%" h={20}/> : (
              <>
                <div className="hp8-conf-val" style={{color:"#34d399"}}>{conf.avg_confidence}%</div>
                <div style={{fontSize:9,color:"var(--text-dim)",marginTop:2}}>avg confidence · {conf.total} fixtures</div>
                <div style={{display:"flex",gap:2,marginTop:6}}>
                  {conf.high>0&&<div style={{flex:conf.high,background:"#34d399",height:3,borderRadius:999,opacity:.7}}/>}
                  {conf.medium>0&&<div style={{flex:conf.medium,background:"#f59e0b",height:3,borderRadius:999,opacity:.6}}/>}
                  {conf.low>0&&<div style={{flex:conf.low,background:"#f87171",height:3,borderRadius:999,opacity:.5}}/>}
                </div>
                {edge&&<div style={{fontSize:9,color:"var(--text-dim)",marginTop:6}}>Top edge: <span style={{color:"#34d399",fontWeight:800}}>+{edge.edge}% {edge.label?.split(" ").slice(0,2).join(" ")}</span></div>}
              </>
            )}
          </div>
        </div>

        {/* CENTER: Hero title + CTAs */}
        <div className="hp8-hero-center">
          <div className={`hp8-hero-chip ${liveCount>0?"hp8-hero-chip--live":""}`}>
            {liveCount>0?<><span className="hp8-live-dot hp8-live-dot--sm" style={{"--dot-color":"#ff4444"}}/><span>{liveCount} LIVE NOW</span></>:<span>ELO · DIXON-COLES · xG · POISSON</span>}
          </div>
          <h1 className="hp8-hero-title">Read The<br/><span className="hp8-hero-accent">Game.</span></h1>
          <p className="hp8-hero-sub">Football intelligence rebuilt. Live scores, Poisson predictions, real-time xG tracking and the deepest FPL suite.</p>
          <div className="hp8-hero-ctas">
            <RippleBtn cls={liveCount>0?"hp8-btn--live":"hp8-btn--primary"} onClick={()=>nav("/live")}>
              {liveCount>0&&<span className="hp8-live-dot hp8-live-dot--sm"/>}{liveCount>0?"Watch Live":"Live Centre"}<span className="hp8-btn-sweep"/>
            </RippleBtn>
            <RippleBtn cls="hp8-btn--ghost" onClick={()=>nav("/predictions/premier-league")}>Predictions<span className="hp8-btn-sweep"/></RippleBtn>
            <RippleBtn cls="hp8-btn--fpl" onClick={()=>nav("/best-team")}>FPL Tools<span className="hp8-btn-sweep"/></RippleBtn>
          </div>
        </div>

        {/* RIGHT: Top prediction + quick links */}
        <div style={{animation:"hp8-fadeUp .6s ease .2s both"}}>
          <div className="hp8-hero-panel" onClick={()=>nav("/predictions/premier-league")} style={{cursor:"pointer"}}>
            <div className="hp8-panel-label" style={{color:"#38bdf8"}}>TOP PREDICTION</div>
            {!topPred ? <Skel w="80%" h={11}/> : (
              <>
                <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:4}}>
                  {topPred.home_logo&&<img src={topPred.home_logo} width={16} height={16} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
                  <span style={{fontSize:10,fontWeight:700}}>{topPred.home?.split(" ").slice(-1)[0]}</span>
                  <span style={{color:"var(--text-dim)",fontSize:8,margin:"0 2px"}}>vs</span>
                  <span style={{fontSize:10,fontWeight:700}}>{topPred.away?.split(" ").slice(-1)[0]}</span>
                  {topPred.away_logo&&<img src={topPred.away_logo} width={16} height={16} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
                </div>
                <div style={{display:"flex",height:4,borderRadius:999,overflow:"hidden",gap:1,margin:"6px 0 4px"}}>
                  <div style={{flex:topPred.homeProb||1,background:"#38bdf8",opacity:.8}}/>
                  <div style={{flex:topPred.draw||1,background:"rgba(255,255,255,.15)"}}/>
                  <div style={{flex:topPred.awayProb||1,background:"#34d399",opacity:.8}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:9}}>
                  <span className="hp8-mono" style={{color:"#38bdf8",fontWeight:900}}>{topPred.homeProb||0}%</span>
                  <span style={{color:"var(--text-dim)"}}>D {topPred.draw||0}%</span>
                  <span className="hp8-mono" style={{color:"#34d399",fontWeight:900}}>{topPred.awayProb||0}%</span>
                </div>
                <div style={{marginTop:5,fontSize:9,color:"var(--text-dim)"}}>
                  xG <span className="hp8-mono">{topPred.xg_home?.toFixed(1)}–{topPred.xg_away?.toFixed(1)}</span>
                </div>
              </>
            )}
          </div>
          <div className="hp8-hero-panel" style={{marginTop:10}}>
            <div className="hp8-panel-label">QUICK ACCESS</div>
            {[{to:"/predictions/champions-league",l:"UCL Predictions"},{to:"/predictions/premier-league",l:"EPL Predictions"},{to:"/captaincy",l:"Captain Picks"},{to:"/player",l:"Player Browser"}].map(({to,l})=>(
              <Link key={to} to={to} className="hp8-qlink">{l}<span className="hp8-qlink-arrow">→</span></Link>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics bar at bottom of hero */}
      <div className="hp8-hero-metrics" style={{animation:"hp8-fadeUp .6s ease .3s both"}}>
        {[
          {l:"Live",v:liveCount,c:"#ff4444",isLive:liveCount>0,ld:upcoming_loading},
          {l:"Today",v:todayCount,c:"#38bdf8",ld:upcoming_loading},
          {l:"Confidence",v:avgConf,c:"#34d399",sx:"%",ld:dash_loading},
          {l:"Top Edge",v:topEdge?`+${topEdge.edge}%`:null,c:"#a78bfa",raw:true,ld:dash_loading,sub:topEdge?`${topEdge.home?.split(" ").slice(-1)[0]} vs ${topEdge.away?.split(" ").slice(-1)[0]}`:null},
        ].map(({l,v,c,isLive,sx="",ld,raw,sub})=>(
          <div key={l} className="hp8-hm-card" style={{"--hm-accent":c}}>
            <div className="hp8-hm-label">{l}</div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              {isLive&&<span className="hp8-live-dot hp8-live-dot--sm" style={{"--dot-color":"#ff4444"}}/>}
              {ld||v==null?<Skel w={40} h={22} r={4}/>:raw?<div className="hp8-hm-val">{v}</div>:<div className="hp8-hm-val"><CountUp to={Number(v)||0} suffix={sx}/></div>}
            </div>
            {sub&&<div className="hp8-hm-sub">{sub}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════
// LIVE STRIP
// ═══════════════════════════════════════════════════
function LivePulseStrip({ fixtures }) {
  const nav = useNavigate();
  const live = fixtures.filter(f=>LIVE_SET.has(f.status));
  if (!live.length) return null;
  const chips = [...live,...live,...live];
  return (
    <div className="hp8-live-strip">
      <div className="hp8-strip-fade hp8-strip-fade--l"/>
      <div className="hp8-strip-track" style={{"--dur":`${Math.max(live.length*6,18)}s`}}>
        {chips.map((f,i)=>(
          <div key={i} className="hp8-strip-chip" onClick={()=>nav(`/match/${f.fixture_id}`)}>
            <span className="hp8-live-dot hp8-live-dot--xs"/>
            {f.home_logo&&<img src={f.home_logo} className="hp8-chip-logo" onError={e=>e.currentTarget.style.display="none"}/>}
            <span className="hp8-chip-team">{f.home_team?.split(" ").slice(-1)[0]}</span>
            <span className="hp8-chip-score hp8-mono">{f.home_score??0}–{f.away_score??0}</span>
            {f.away_logo&&<img src={f.away_logo} className="hp8-chip-logo" onError={e=>e.currentTarget.style.display="none"}/>}
            <span className="hp8-chip-team">{f.away_team?.split(" ").slice(-1)[0]}</span>
            {f.minute&&<span className="hp8-chip-min hp8-mono">{f.minute}'</span>}
          </div>
        ))}
      </div>
      <div className="hp8-strip-fade hp8-strip-fade--r"/>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// TODAY'S INTELLIGENCE
// ═══════════════════════════════════════════════════
function IntelCard({ signal: s, index: i, nav }) {
  const [cref, cvis] = useReveal(0.05);
  return (
    <div ref={cref} style={{opacity:cvis?1:0,transform:cvis?"translateY(0)":"translateY(12px)",transition:`all .35s ease ${i*50}ms`}}>
      <div className="hp8-intel-card" style={{"--ic-color":s.color,"--ic-rgb":s.rgb}} onClick={()=>nav(s.to)}>
        <div className="hp8-ic-signal">{s.type}</div>
        <div className="hp8-ic-title">{s.title}</div>
        {s.detail&&<div className="hp8-ic-detail">{s.detail}</div>}
      </div>
    </div>
  );
}

function TodayIntelligence({ dash, fixtures, loading }) {
  const [ref, vis] = useReveal(0.06);
  const nav = useNavigate();
  const signals = useMemo(() => {
    const s = [];
    const topEdge = dash?.model_edges?.edges?.[0];
    if (topEdge) s.push({type:"MODEL EDGE",title:`${topEdge.home} vs ${topEdge.away}: +${topEdge.edge}% edge`,detail:`${topEdge.direction==="home"?topEdge.home:topEdge.away} favoured by model`,color:"#34d399",rgb:"52,211,153",to:"/predictions/premier-league"});
    const highXg = dash?.high_scoring_matches?.matches?.[0];
    if (highXg) s.push({type:"HIGH xG",title:`${highXg.home?.split(" ").slice(-1)[0]} vs ${highXg.away?.split(" ").slice(-1)[0]}: ${((highXg.xg_home||0)+(highXg.xg_away||0)).toFixed(1)} total xG`,detail:"Highest expected goals fixture today",color:"#f59e0b",rgb:"245,158,11",to:highXg.fixture_id?`/match/${highXg.fixture_id}`:"/predictions/premier-league"});
    const capt = dash?.differential_captains?.captains?.[0];
    if (capt) s.push({type:"FPL CAPTAIN",title:`${capt.name||capt.web_name}: ${capt.ep_next?.toFixed(1)||"??"} EP`,detail:`${capt.ownership?.toFixed(1)||"?"}% owned · ${capt.next_opp||""}`,color:"#38bdf8",rgb:"56,189,248",to:"/captaincy"});
    const topPred = dash?.top_predictions?.predictions?.[0];
    if (topPred) {
      const btts = (topPred.xg_home||0)>0.9&&(topPred.xg_away||0)>0.9;
      if (btts) s.push({type:"BTTS SIGNAL",title:`${topPred.home?.split(" ").slice(-1)[0]} vs ${topPred.away?.split(" ").slice(-1)[0]}: both teams to score`,detail:`Home xG ${(topPred.xg_home||0).toFixed(1)} · Away xG ${(topPred.xg_away||0).toFixed(1)}`,color:"#f472b6",rgb:"244,114,182",to:"/predictions/premier-league"});
    }
    const live = fixtures.filter(f=>LIVE_SET.has(f.status));
    if (live.length>0&&s.length<5) s.push({type:"LIVE NOW",title:`${live.length} match${live.length>1?'es':''} in progress`,detail:live[0]?`${live[0].home_team?.split(" ").slice(-1)[0]} ${live[0].home_score??0}–${live[0].away_score??0} ${live[0].away_team?.split(" ").slice(-1)[0]}`:null,color:"#ff4444",rgb:"255,68,68",to:"/live"});
    if (s.length<3) s.push({type:"COVERAGE",title:"9 competitions · 500+ player profiles",detail:"Real-time tracking across Europe's top leagues",color:"#a78bfa",rgb:"167,139,250",to:"/predictions/premier-league"});
    return s.slice(0,5);
  }, [dash, fixtures]);
  if (loading&&!dash) return null;
  return (
    <section className="hp8-section" style={{paddingTop:16,paddingBottom:12}}>
      <div className="hp8-container">
        <div ref={ref} className="hp8-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(10px)",transition:"all .4s"}}>
          <div><div className="hp8-eyebrow">— Model Signals</div><h2 className="hp8-section-title">Today's Intelligence</h2></div>
        </div>
        <div className="hp8-intel-grid">
          {signals.map((s,i)=><IntelCard key={i} signal={s} index={i} nav={nav}/>)}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════
// TOP PREDICTIONS (horizontal scroll)
// ═══════════════════════════════════════════════════
function PredCard({ p, index }) {
  const nav = useNavigate();
  const [hov, setHov] = useState(false);
  const [ref, vis] = useReveal(0.05);
  const hp=p.homeProb||0,dp=p.draw||0,ap=p.awayProb||0;
  const favTeam=hp>ap?p.home:p.away, favProb=Math.max(hp,ap);
  const confColor=(p.conf_pct||50)>=70?"#34d399":(p.conf_pct||50)>=55?"#f59e0b":"#f87171";
  return (
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(14px)",transition:`all .4s ease ${index*50}ms`,flexShrink:0,width:260}}>
      <div className={`hp8-pred-card ${hov?"hp8-pred-card--hov":""}`} style={{"--pc-color":p.col||"#38bdf8"}}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} onClick={()=>p.fixture_id&&nav(`/match/${p.fixture_id}`)}>
        <div className="hp8-pc-head">
          <span className="hp8-pc-league">{p.league||"League"}</span>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:4,height:4,borderRadius:"50%",background:confColor}}/>
            <span className="hp8-mono" style={{fontSize:8,fontWeight:800,color:confColor}}>{p.conf_pct||50}%</span>
          </div>
        </div>
        <div className="hp8-pc-teams">
          <div className="hp8-pc-team">{p.home_logo&&<img src={p.home_logo} width={20} height={20} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}<span className="hp8-pc-tname">{p.home}</span></div>
          <div className="hp8-pc-score-area"><div className="hp8-pc-predicted hp8-mono">{p.score||"1-0"}</div><div style={{fontSize:7,color:"var(--text-muted)"}}>predicted</div></div>
          <div className="hp8-pc-team" style={{flexDirection:"row-reverse"}}>{p.away_logo&&<img src={p.away_logo} width={20} height={20} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}<span className="hp8-pc-tname" style={{textAlign:"right"}}>{p.away}</span></div>
        </div>
        <div className="hp8-pc-probbar"><div style={{flex:hp,background:"#38bdf8",opacity:.85}}/><div style={{flex:dp,background:"rgba(255,255,255,.15)"}}/><div style={{flex:ap,background:"#34d399",opacity:.85}}/></div>
        <div className="hp8-pc-probs"><span className="hp8-mono" style={{color:"#38bdf8",fontWeight:900}}>{hp}%</span><span style={{color:"var(--text-dim)"}}>D {dp}%</span><span className="hp8-mono" style={{color:"#34d399",fontWeight:900}}>{ap}%</span></div>
        <div className="hp8-pc-markets"><span>xG <span className="hp8-mono">{p.xg_home?.toFixed(1)}–{p.xg_away?.toFixed(1)}</span></span>{favProb>=60&&<span className="hp8-pc-badge" style={{background:`${p.col||"#38bdf8"}18`,color:p.col||"#38bdf8"}}>{favProb}% {favTeam?.split(" ").slice(-1)[0]}</span>}</div>
        <div className={`hp8-pc-expand ${hov?"hp8-pc-expand--vis":""}`}><span style={{fontSize:8,color:"var(--text-muted)"}}>Open match intelligence →</span></div>
      </div>
    </div>
  );
}

function TopPredictions({ dash, loading }) {
  const [ref, vis] = useReveal(0.04);
  const preds = dash?.top_predictions?.predictions ?? [];
  return (
    <section className="hp8-section" style={{paddingTop:14}}>
      <div className="hp8-container">
        <div ref={ref} className="hp8-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(10px)",transition:"all .4s"}}>
          <div><div className="hp8-eyebrow">— Model Output</div><h2 className="hp8-section-title">Today's Top Predictions</h2></div>
          <Link to="/predictions/premier-league" className="hp8-see-all">All predictions →</Link>
        </div>
        <div className="hp8-hscroll">
          {loading ? Array.from({length:5}).map((_,i)=><div key={i} style={{flexShrink:0,width:260,height:180,borderRadius:14,background:"var(--bg-card)",border:"1px solid var(--border-subtle)"}}><div style={{padding:14}}><Skel w="60%" h={8}/><div style={{marginTop:10}}/><Skel w="90%" h={10}/></div></div>)
            : preds.map((p,i)=><PredCard key={i} p={p} index={i}/>)}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════
// EDGE BOARD
// ═══════════════════════════════════════════════════
function EdgeCard({ edge, index }) {
  const [ref, vis] = useReveal(0.05);
  return (
    <div ref={ref} className="hp8-edge-card" style={{opacity:vis?1:0,transform:vis?"translateX(0)":"translateX(10px)",transition:`all .35s ease ${index*45}ms`}}>
      <div className="hp8-edge-tag" style={{color:edge.col||"#34d399"}}>MODEL EDGE</div>
      <div className="hp8-edge-match">{edge.home} vs {edge.away}</div>
      <div className="hp8-edge-val" style={{color:edge.col||"#34d399"}}>+{edge.edge}%</div>
      <div className="hp8-edge-dir">{edge.direction==="home"?edge.home:edge.away} favoured</div>
      <div style={{height:3,borderRadius:999,background:"rgba(255,255,255,.04)",marginTop:6,overflow:"hidden"}}><div style={{width:`${Math.min(edge.model_prob||edge.edge*2,100)}%`,height:"100%",background:edge.col||"#34d399",borderRadius:999}}/></div>
    </div>
  );
}

function XgCard({ match, index }) {
  const nav = useNavigate();
  const [ref, vis] = useReveal(0.05);
  const total = match.total_xg||((match.xg_home||0)+(match.xg_away||0));
  return (
    <div ref={ref} className="hp8-xg-card" style={{opacity:vis?1:0,transform:vis?"translateX(0)":"translateX(10px)",transition:`all .35s ease ${index*45}ms`}} onClick={()=>match.fixture_id&&nav(`/match/${match.fixture_id}`)}>
      <div className="hp8-xg-tag">HIGH xG</div>
      <div className="hp8-xg-total hp8-mono">{total.toFixed(1)}</div>
      <div className="hp8-xg-match">{match.home?.split(" ").slice(-1)[0]} vs {match.away?.split(" ").slice(-1)[0]}</div>
      <div style={{display:"flex",gap:2,marginTop:5}}><div style={{flex:match.xg_home||1,height:3,borderRadius:999,background:"#38bdf8",opacity:.7}}/><div style={{flex:match.xg_away||1,height:3,borderRadius:999,background:"#34d399",opacity:.7}}/></div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:8,marginTop:2}}><span className="hp8-mono" style={{color:"#38bdf8"}}>{(match.xg_home||0).toFixed(1)}</span><span className="hp8-mono" style={{color:"#34d399"}}>{(match.xg_away||0).toFixed(1)}</span></div>
    </div>
  );
}

function EdgeBoard({ dash, loading }) {
  const [ref, vis] = useReveal(0.04);
  const edges = dash?.model_edges?.edges??[];
  const highXg = dash?.high_scoring_matches?.matches??[];
  return (
    <section className="hp8-section">
      <div className="hp8-container">
        <div ref={ref} className="hp8-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(10px)",transition:"all .4s"}}>
          <div><div className="hp8-eyebrow">— Value Signals</div><h2 className="hp8-section-title">Model Edge Board</h2></div>
        </div>
        <div className="hp8-edge-grid">
          <div><div className="hp8-sub-label">Best Edges</div><div style={{display:"flex",flexDirection:"column",gap:6}}>
            {loading?Array.from({length:3}).map((_,i)=><div key={i} className="hp8-edge-card"><Skel w="70%" h={9}/><div style={{marginTop:4}}/><Skel w="50%" h={14}/></div>):edges.length>0?edges.map((e,i)=><EdgeCard key={i} edge={e} index={i}/>):<div className="hp8-empty-state">No edges detected today</div>}
          </div></div>
          <div><div className="hp8-sub-label">Highest xG</div><div style={{display:"flex",flexDirection:"column",gap:6}}>
            {loading?Array.from({length:3}).map((_,i)=><div key={i} className="hp8-xg-card"><Skel w="40%" h={20}/><div style={{marginTop:3}}/><Skel w="70%" h={9}/></div>):highXg.length>0?highXg.slice(0,4).map((m,i)=><XgCard key={i} match={m} index={i}/>):<div className="hp8-empty-state">Loading…</div>}
          </div></div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════
// COMMAND GRID — SVG graphics + data-rich cards
// ═══════════════════════════════════════════════════
function LiveRadarGfx({active}){return <svg width="90" height="90" viewBox="0 0 110 110" fill="none" style={{opacity:active?1:.4}}>{[20,32,44].map((r,i)=><circle key={i} cx="55" cy="55" r={r} stroke="#ff4444" strokeWidth={i===2?1.5:.6} opacity={.12+i*.08}/>)}{Array.from({length:6}).map((_,j)=>{const a=(j/6)*Math.PI*2;return<line key={j} x1="55" y1="55" x2={55+Math.cos(a)*44} y2={55+Math.sin(a)*44} stroke="#ff4444" strokeWidth=".5" opacity=".15"/>})}<line x1="55" y1="55" x2="99" y2="55" stroke="#ff4444" strokeWidth="1.5" opacity=".7" style={{transformOrigin:"55px 55px",animation:active?"hp8-sweep 2s linear infinite":"none"}}/>{[{x:72,y:38},{x:44,y:68},{x:80,y:64}].map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={3} fill="#ff4444" opacity=".7" style={{animation:`hp8-pulse ${1.2+i*.3}s ease-in-out infinite`}}/>)}</svg>;}
function ProbBarsGfx({active}){const bars=[62,45,78,55,88,40,66,72];return <svg width="90" height="60" viewBox="0 0 110 70" fill="none" style={{opacity:active?1:.4}}>{bars.map((h,i)=><rect key={i} x={i*13+2} y={70-h*.65} width={10} height={h*.65} rx="3" fill="#38bdf8" opacity={i===4?.9:.3+i*.07} style={{transformOrigin:`${i*13+7}px 70px`,animation:active?`hp8-bar-grow .6s ease ${i*60}ms both`:undefined}}/>)}<path d="M2 52L15 34L28 44L41 18L54 30L67 24L80 38L93 28" stroke="#38bdf8" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity=".5"/></svg>;}
function PitchGfx({active}){return <svg width="90" height="64" viewBox="0 0 110 78" fill="none" style={{opacity:active?1:.4}}><rect x="1" y="1" width="108" height="76" rx="5" stroke="#a78bfa" strokeWidth="1.2" opacity=".5"/><line x1="55" y1="1" x2="55" y2="77" stroke="#a78bfa" strokeWidth=".8" opacity=".35"/><circle cx="55" cy="39" r="13" stroke="#a78bfa" strokeWidth=".8" opacity=".35"/>{[{x:18,y:39},{x:36,y:20},{x:36,y:58},{x:55,y:28},{x:55,y:50},{x:74,y:20},{x:74,y:58},{x:90,y:30},{x:90,y:48}].map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={active?4:3} fill="#a78bfa" opacity={active?.8:.4} style={{animation:active?`hp8-pulse ${1.5+i*.15}s ease-in-out infinite`:undefined}}/>)}</svg>;}
function FPLPitchGfx({active}){return <svg width="90" height="64" viewBox="0 0 110 78" fill="none" style={{opacity:active?1:.4}}><rect x="1" y="1" width="108" height="76" rx="5" stroke="#34d399" strokeWidth="1" opacity=".35"/>{[{x:18,y:39,c:false},{x:34,y:16,c:false},{x:34,y:46,c:false},{x:34,y:62,c:false},{x:52,y:22,c:false},{x:52,y:39,c:true},{x:52,y:56,c:false},{x:70,y:26,c:false},{x:70,y:52,c:false},{x:86,y:39,c:false}].map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={p.c?5:3} fill="#34d399" opacity={p.c?.9:.5} style={{animation:p.c&&active?`hp8-pulse 1.5s ease-in-out infinite`:undefined}}/>)}</svg>;}

const TOOLS = [
  {to:"/live",label:"Live Centre",color:"#ff4444",span:2,tall:true,Gfx:LiveRadarGfx,sub:"Real-time scores, events and minute-by-minute tracking",dataKey:"live",tag:"LIVE DATA"},
  {to:"/predictions/premier-league",label:"Predictions",color:"#38bdf8",span:1,tall:false,Gfx:ProbBarsGfx,sub:"Dixon-Coles Poisson model with ELO",dataKey:"preds",tag:"MODEL"},
  {to:"/match/0",label:"Match Hub",color:"#a78bfa",span:1,tall:false,Gfx:PitchGfx,sub:"Lineups, H2H, injuries, xG, live tactics",dataKey:"match",tag:"INTEL"},
  {to:"/best-team",label:"FPL Best XI",color:"#34d399",span:1,tall:true,Gfx:FPLPitchGfx,sub:"Optimal FPL starting XI + captain signal",dataKey:"fpl",tag:"FPL"},
  {to:"/squad-builder",label:"Squad Builder",color:"#34d399",span:1,tall:false,Gfx:null,sub:"Build 15-man FPL squad under budget",dataKey:"squad",tag:"FPL"},
  {to:"/player",label:"Players",color:"#f59e0b",span:1,tall:false,Gfx:null,sub:"500+ profiles with xG, FPL stats and form",dataKey:"players",tag:"DATA"},
  {to:"/news",label:"News",color:"#f472b6",span:1,tall:false,Gfx:null,sub:"Transfers, injuries and intelligence updates",dataKey:"news",tag:"NEWS"},
  {to:"/games",label:"Mini Games",color:"#fb923c",span:1,tall:false,Gfx:null,sub:"Score predictor, quizzes and challenges",dataKey:"games",tag:"FUN"},
];

function ToolDataRow({ dataKey, fixtures, dash, loading }) {
  if (dataKey==="live") {
    const live=fixtures.filter(f=>LIVE_SET.has(f.status));
    if(loading) return <div className="hp8-td"><Skel w="70%" h={8}/></div>;
    return <div className="hp8-td"><div className="hp8-td-val" style={{color:"#ff4444"}}>{live.length>0?`${live.length} live now`:`${fixtures.filter(f=>isToday(f.kickoff)).length} today`}</div>{live[0]&&<div className="hp8-td-sub hp8-mono">{live[0].home_team?.split(" ").slice(-1)[0]} {live[0].home_score??0}–{live[0].away_score??0} {live[0].away_team?.split(" ").slice(-1)[0]}</div>}</div>;
  }
  if (dataKey==="preds") {
    const conf=dash?.model_confidence;const top=dash?.top_predictions?.predictions?.[0];
    if(loading||!dash) return <div className="hp8-td"><Skel w="60%" h={8}/></div>;
    return <div className="hp8-td">{conf&&<div className="hp8-td-val">{conf.avg_confidence}% conf · {conf.total} matches</div>}{top&&<div className="hp8-td-sub">{Math.max(top.homeProb||0,top.awayProb||0)}% {(top.homeProb>top.awayProb?top.home:top.away)?.split(" ").slice(-1)[0]}</div>}</div>;
  }
  if (dataKey==="fpl") {
    const capt=dash?.differential_captains?.captains?.[0];
    if(loading||!dash) return <div className="hp8-td"><Skel w="55%" h={8}/></div>;
    return <div className="hp8-td">{capt&&<><div className="hp8-td-val">Captain: {capt.name||capt.web_name}</div><div className="hp8-td-sub hp8-mono">{capt.ep_next?.toFixed(1)} EP · {capt.next_opp||""}</div></>}</div>;
  }
  if (dataKey==="match") return <div className="hp8-td"><div className="hp8-td-val" style={{color:"#a78bfa"}}>Lineups · H2H · xG</div><div className="hp8-td-sub">Pre-match & live intelligence</div></div>;
  if (dataKey==="squad") return <div className="hp8-td"><div className="hp8-td-val" style={{color:"#34d399"}}>£100m budget</div><div className="hp8-td-sub">15-man squad optimizer</div></div>;
  if (dataKey==="players") return <div className="hp8-td"><div className="hp8-td-val" style={{color:"#f59e0b"}}>500+ profiles</div><div className="hp8-td-sub">xG, form, FPL data</div></div>;
  if (dataKey==="news") return <div className="hp8-td"><div className="hp8-td-val" style={{color:"#f472b6"}}>Live feed</div><div className="hp8-td-sub">Transfers & injuries</div></div>;
  if (dataKey==="games") return <div className="hp8-td"><div className="hp8-td-val" style={{color:"#fb923c"}}>5 game modes</div><div className="hp8-td-sub">Score predictor & quizzes</div></div>;
  return null;
}

function LargeToolCard({ tool, index, fixtures, dash, loading }) {
  const {ref:tref,tf,gl,onMove,onLeave}=useTilt(4);
  const [hov,setHov]=useState(false);
  const [rref,vis]=useReveal(0.04);
  const {Gfx}=tool;
  return (
    <div ref={rref} className="hp8-tool-wrap" style={{gridColumn:`span ${tool.span}`,gridRow:tool.tall?"span 2":"span 1",opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(18px)",transition:`opacity .5s ease ${index*50}ms,transform .5s ease ${index*50}ms`}}>
      <div ref={tref} className={`hp8-tool-card ${hov?"hp8-tool-card--hov":""}`} style={{"--tc-color":tool.color,transform:tf,transition:"transform .18s,box-shadow .2s,border-color .2s"}} onMouseMove={onMove} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{onLeave();setHov(false);}}>
        <div className="hp8-tool-glow" style={{background:`radial-gradient(circle at ${gl.x}% ${gl.y}%,${tool.color}20 0%,transparent 60%)`}}/>
        <div className={`hp8-tool-shimmer ${hov?"hp8-tool-shimmer--active":""}`}/>
        <div className="hp8-idle-shimmer"/>
        <div className="hp8-tool-topbar"/>
        <Link to={tool.to} className="hp8-tool-link">
          <div className="hp8-tool-header"><div className="hp8-tool-tag" style={{color:tool.color}}>{tool.tag}</div>{hov&&Gfx&&<div className="hp8-tool-gfx-top"><Gfx active={hov}/></div>}</div>
          <div className="hp8-tool-title">{tool.label}</div>
          <div className="hp8-tool-sub">{tool.sub}</div>
          <ToolDataRow dataKey={tool.dataKey} fixtures={fixtures} dash={dash} loading={loading}/>
          {Gfx&&<div className="hp8-tool-gfx-bg"><Gfx active={hov}/></div>}
          <div className="hp8-tool-cta">Open <span style={{transition:"transform .18s",transform:hov?"translateX(3px)":"translateX(0)",display:"inline-block"}}>→</span></div>
        </Link>
      </div>
    </div>
  );
}

function CommandGrid({ fixtures, dash, loading }) {
  const [ref, vis] = useReveal(0.04);
  return (
    <section className="hp8-section">
      <div className="hp8-container">
        <div ref={ref} className="hp8-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(10px)",transition:"all .4s"}}>
          <div><div className="hp8-eyebrow">— Platform</div><h2 className="hp8-section-title">Intelligence Command Grid</h2></div>
          <span style={{fontSize:9,color:"var(--text-muted)",fontFamily:"var(--font-mono)",fontWeight:700}}>8 tools</span>
        </div>
        <div className="hp8-bento">{TOOLS.map((t,i)=><LargeToolCard key={t.to} tool={t} index={i} fixtures={fixtures} dash={dash} loading={loading}/>)}</div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════
// COMPETITIONS — compact chip strip
// ═══════════════════════════════════════════════════
const COMPS = [
  {label:"Premier League",slug:"premier-league",color:"#60a5fa",logo:"https://media.api-sports.io/football/leagues/39.png",teams:20,matches:380,features:["Predictions","Standings","Sim","xG"]},
  {label:"La Liga",slug:"la-liga",color:"#fb923c",logo:"https://media.api-sports.io/football/leagues/140.png",teams:20,matches:380,features:["Predictions","Standings","Sim"]},
  {label:"Bundesliga",slug:"bundesliga",color:"#f59e0b",logo:"https://media.api-sports.io/football/leagues/78.png",teams:18,matches:306,features:["Predictions","Standings","Sim"]},
  {label:"Serie A",slug:"serie-a",color:"#34d399",logo:"https://media.api-sports.io/football/leagues/135.png",teams:20,matches:380,features:["Predictions","Standings"]},
  {label:"Ligue 1",slug:"ligue-1",color:"#a78bfa",logo:"https://media.api-sports.io/football/leagues/61.png",teams:18,matches:306,features:["Predictions","Standings"]},
  {label:"UCL",slug:"champions-league",color:"#3b82f6",logo:"https://media.api-sports.io/football/leagues/2.png",teams:36,matches:189,features:["Predictions","Bracket"]},
  {label:"Europa",slug:"europa-league",color:"#f97316",logo:"https://media.api-sports.io/football/leagues/3.png",teams:36,matches:189,features:["Predictions","Bracket"]},
  {label:"Conference",slug:"conference-league",color:"#22c55e",logo:"https://media.api-sports.io/football/leagues/848.png",teams:36,matches:141,features:["Predictions"]},
  {label:"FA Cup",slug:"fa-cup",color:"#ef4444",logo:"https://media.api-sports.io/football/leagues/45.png",teams:736,matches:0,features:["Predictions"]},
];

function CompChip({ comp, index }) {
  const [ref, vis] = useReveal(0.05);
  return (
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(10px)",transition:`all .35s ease ${index*30}ms`}}>
      <Link to={`/predictions/${comp.slug}`} className="hp8-comp-chip" style={{"--cc-color":comp.color}}>
        <img src={comp.logo} width={22} height={22} onError={e=>e.currentTarget.style.display="none"}/>
        <div className="hp8-cc-info">
          <div className="hp8-cc-name">{comp.label}</div>
          <div className="hp8-cc-stats">{comp.teams} clubs{comp.matches>0?` · ${comp.matches} matches`:""}</div>
          <div className="hp8-cc-badges">{comp.features.map(f=><span key={f} className="hp8-cc-badge">{f}</span>)}</div>
        </div>
      </Link>
    </div>
  );
}

function CompetitionHub() {
  const [ref, vis] = useReveal(0.04);
  return (
    <section className="hp8-section">
      <div className="hp8-container">
        <div ref={ref} className="hp8-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(10px)",transition:"all .4s"}}>
          <div><div className="hp8-eyebrow">— Coverage</div><h2 className="hp8-section-title">9 Competitions. Full Intelligence.</h2></div>
        </div>
        <div className="hp8-comp-strip">{COMPS.map((c,i)=><CompChip key={c.slug} comp={c} index={i}/>)}</div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════
// FPL HUB — 2-column data-rich layout
// ═══════════════════════════════════════════════════
const FPL_TOOLS = [
  {to:"/best-team",label:"Best XI",stat:"Optimal 11",color:"#34d399"},
  {to:"/squad-builder",label:"Squad Builder",stat:"£100m budget",color:"#38bdf8"},
  {to:"/gameweek-insights",label:"GW Insights",stat:"This GW",color:"#f59e0b"},
  {to:"/fpl-table",label:"FPL Table",stat:"Standings",color:"#a78bfa"},
  {to:"/captaincy",label:"Captaincy",stat:"Captain picks",color:"#fb923c"},
  {to:"/fixture-difficulty",label:"FDR Heatmap",stat:"8 GWs",color:"#67e8f9"},
  {to:"/transfer-planner",label:"Transfer Planner",stat:"Plan moves",color:"#f87171"},
  {to:"/differentials",label:"Differentials",stat:"Low-owned",color:"#f472b6"},
];

function FPLHub({ dash }) {
  const [ref, vis] = useReveal(0.04);
  const capts = dash?.differential_captains?.captains?.slice(0,5)??[];
  const topCapt = capts[0];
  const trends = dash?.trending_players?.items?.slice(0,3)??[];

  return (
    <section className="hp8-section">
      <div className="hp8-container">
        <div ref={ref} className="hp8-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(10px)",transition:"all .4s"}}>
          <div><div className="hp8-eyebrow">— Fantasy Premier League</div><h2 className="hp8-section-title">FPL Intelligence Hub</h2></div>
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 12px",borderRadius:999,background:"rgba(52,211,153,.06)",border:"1px solid rgba(52,211,153,.15)"}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:"#34d399",boxShadow:"0 0 6px #34d399",animation:"hp8-pulse 2s ease-in-out infinite"}}/>
            <span style={{fontSize:8,fontWeight:900,color:"#34d399",letterSpacing:"0.1em",fontFamily:"var(--font-mono)"}}>8 TOOLS ACTIVE</span>
          </div>
        </div>
        <div className="hp8-fpl-grid">
          {/* Left panel: Captain picks + top signal */}
          <div className="hp8-fpl-panel">
            <div className="hp8-fpl-panel-title" style={{"--fp-color":"#fb923c"}}>Captain Picks</div>
            {capts.length>0 ? capts.map((c,i)=>(
              <div key={i} className="hp8-capt-row">
                <div className="hp8-cr-rank hp8-mono">{String(i+1).padStart(2,"0")}</div>
                {c.photo&&<img src={c.photo} width={24} height={24} style={{borderRadius:"50%",objectFit:"cover",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>}
                <div style={{flex:1,minWidth:0}}>
                  <div className="hp8-cr-name">{c.name||c.web_name}</div>
                  <div className="hp8-cr-meta">{c.next_opp||""} · {c.ownership?.toFixed(1)||"?"}%</div>
                </div>
                <div className="hp8-cr-ep hp8-mono">{c.ep_next?.toFixed(1)||"??"}</div>
              </div>
            )) : Array.from({length:4}).map((_,i)=><div key={i} className="hp8-capt-row"><Skel w="70%" h={10}/></div>)}
            {topCapt && (
              <div className="hp8-fpl-signal" style={{marginTop:10}}>
                <div className="hp8-fpl-signal-label">TOP PICK SIGNAL</div>
                <div className="hp8-fpl-signal-val">{topCapt.name||topCapt.web_name} — <span className="hp8-mono" style={{color:"#34d399"}}>{topCapt.ep_next?.toFixed(1)} EP</span> vs {topCapt.next_opp||"?"}</div>
              </div>
            )}
          </div>

          {/* Right panel: All 8 tools + differential signal */}
          <div className="hp8-fpl-panel">
            <div className="hp8-fpl-panel-title" style={{"--fp-color":"#34d399"}}>All FPL Tools</div>
            {FPL_TOOLS.map((t,i)=>(
              <Link key={t.to} to={t.to} style={{textDecoration:"none",color:"inherit"}}>
                <div className="hp8-fpl-row" style={{"--fpl-color":t.color}}>
                  <div className="hp8-fpl-dot"/>
                  <span className="hp8-fpl-label">{t.label}</span>
                  <span className="hp8-fpl-stat">{t.stat}</span>
                  <span className="hp8-fpl-arrow">→</span>
                </div>
              </Link>
            ))}
            {trends.length>0 && (
              <div className="hp8-fpl-signal" style={{marginTop:8}}>
                <div className="hp8-fpl-signal-label">TRENDING DIFFERENTIAL</div>
                <div className="hp8-fpl-signal-val">{trends[0].name||trends[0].player_name||"Player"} — <span className="hp8-mono" style={{color:"#f59e0b"}}>{trends[0].xg_per90?.toFixed(2)||"?"} xG/90</span></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════
// TRENDING PLAYERS
// ═══════════════════════════════════════════════════
function PlayerCard({ player, index }) {
  const nav = useNavigate();
  const [hov, setHov] = useState(false);
  const [ref, vis] = useReveal(0.05);
  const form = player.form||player.recent_form||"";
  const formArr = typeof form==="string"?form.split("").filter(c=>"WDL".includes(c)):(Array.isArray(form)?form:[]);
  return (
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(10px)",transition:`all .35s ease ${index*40}ms`}}>
      <div className={`hp8-player-card ${hov?"hp8-player-card--hov":""}`} onClick={()=>nav(`/player?search=${encodeURIComponent(player.name||player.team_name||"")}`)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
        <div className="hp8-pc2-top">
          {player.photo&&<img src={player.photo} width={32} height={32} style={{borderRadius:"50%",objectFit:"cover",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>}
          <div style={{flex:1,minWidth:0}}>
            <div className="hp8-pc2-name">{player.name||player.player_name||"Player"}</div>
            <div className="hp8-pc2-team">{player.team_name||player.team||""}</div>
          </div>
          {player.xg_per90!=null&&<div className="hp8-pc2-stat hp8-mono" style={{color:"#38bdf8"}}>{player.xg_per90?.toFixed(2)}<div style={{fontSize:7,color:"var(--text-dim)"}}>xG/90</div></div>}
        </div>
        {formArr.length>0&&<div style={{display:"flex",gap:2,marginTop:6}}>{formArr.slice(-5).map((r,i)=><FormPip key={i} r={r}/>)}</div>}
        {player.goals!=null&&<div style={{display:"flex",gap:10,marginTop:6,fontSize:9,color:"var(--text-muted)"}}>{player.goals!=null&&<span><span className="hp8-mono" style={{color:"var(--text)",fontWeight:900}}>{player.goals}</span> G</span>}{player.assists!=null&&<span><span className="hp8-mono" style={{color:"var(--text)",fontWeight:900}}>{player.assists}</span> A</span>}{player.rating!=null&&<span>Rtg <span className="hp8-mono" style={{color:"#f59e0b",fontWeight:900}}>{Number(player.rating).toFixed(1)}</span></span>}</div>}
      </div>
    </div>
  );
}

function TrendingPlayers({ dash, loading }) {
  const [ref, vis] = useReveal(0.04);
  const items = dash?.trending_players?.items??[];
  const xgLeaders = dash?.xg_leaders?.leaders?.slice(0,5)??[];
  const showable = items.length>0?items.slice(0,6):xgLeaders.slice(0,6);
  return (
    <section className="hp8-section">
      <div className="hp8-container">
        <div ref={ref} className="hp8-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(10px)",transition:"all .4s"}}>
          <div><div className="hp8-eyebrow">— Players</div><h2 className="hp8-section-title">Trending Now</h2></div>
          <Link to="/player" className="hp8-see-all">Browse all →</Link>
        </div>
        <div className="hp8-player-grid">
          {loading?Array.from({length:6}).map((_,i)=><div key={i} className="hp8-player-card"><Skel w="60%" h={10}/><div style={{marginTop:6}}/><Skel w="80%" h={8}/></div>):showable.length>0?showable.map((p,i)=><PlayerCard key={i} player={p} index={i}/>):<div className="hp8-empty-state" style={{gridColumn:"1/-1"}}>Loading player data…</div>}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════
// WHY STATINSITE — compact model chips + facts
// ═══════════════════════════════════════════════════
const MODELS = [
  {name:"Dixon-Coles",desc:"Low-score Poisson",color:"#38bdf8"},
  {name:"ELO Ratings",desc:"Dynamic strength",color:"#a78bfa"},
  {name:"xG Model",desc:"Shot-based xG",color:"#34d399"},
  {name:"Monte Carlo",desc:"8K simulations",color:"#f59e0b"},
  {name:"Form Decay",desc:"Weighted recent form",color:"#f472b6"},
  {name:"Market Edge",desc:"Model vs odds",color:"#fb923c"},
];
const FACTS = [{val:"9",label:"Competitions"},{val:"500+",label:"Player Profiles"},{val:"8",label:"FPL Tools"},{val:"8K",label:"Sims/Run"}];

function ModelChip({ model: m, index: i }) {
  const [ref, vis] = useReveal(0.05);
  return <div ref={ref} className="hp8-model-chip" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(8px)",transition:`all .3s ease ${i*40}ms`,"--mc-color":m.color}}><div className="hp8-mc-dot"/><div><div className="hp8-mc-name">{m.name}</div><div className="hp8-mc-desc">{m.desc}</div></div></div>;
}

function WhyStatinSite() {
  const [ref, vis] = useReveal(0.04);
  return (
    <section className="hp8-section" style={{paddingBottom:60}}>
      <div className="hp8-container">
        <div ref={ref} className="hp8-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(10px)",transition:"all .4s"}}>
          <div><div className="hp8-eyebrow">— Platform</div><h2 className="hp8-section-title">The Intelligence Stack</h2></div>
        </div>
        <div className="hp8-why-layout">{MODELS.map((m,i)=><ModelChip key={m.name} model={m} index={i}/>)}</div>
        <div className="hp8-facts-row">{FACTS.map(f=><div key={f.label} className="hp8-fact-item"><div className="hp8-fact-val">{f.val}</div><div className="hp8-fact-label">{f.label}</div></div>)}</div>
        <div style={{textAlign:"center",fontSize:9,color:"var(--text-dim)",marginTop:10}}>All predictions use real season statistics from API-Football Pro. Model probabilities are not guaranteed outcomes.</div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════
// DIVIDER + ROOT
// ═══════════════════════════════════════════════════
function Div() { return <div className="hp8-divider"/>; }

export default function HomePage() {
  useEffect(() => { injectStyles(); }, []);
  const { fixtures, loading: ul } = useUpcoming();
  const { dash, loading: dl } = useDashboard();
  return (
    <div className="hp8-root">
      <HeroSection fixtures={fixtures} upcoming_loading={ul} dash={dash} dash_loading={dl}/>
      <LivePulseStrip fixtures={fixtures}/>
      <TodayIntelligence dash={dash} fixtures={fixtures} loading={dl||ul}/>
      <Div/>
      <TopPredictions dash={dash} loading={dl}/>
      <Div/>
      <EdgeBoard dash={dash} loading={dl}/>
      <Div/>
      <CommandGrid fixtures={fixtures} dash={dash} loading={dl||ul}/>
      <Div/>
      <CompetitionHub/>
      <Div/>
      <FPLHub dash={dash}/>
      <Div/>
      <TrendingPlayers dash={dash} loading={dl}/>
      <Div/>
      <WhyStatinSite/>
    </div>
  );
}