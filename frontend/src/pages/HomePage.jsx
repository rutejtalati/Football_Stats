// ═══════════════════════════════════════════════════════════════════════
// StatinSite — HomePage v7  "Premium Intelligence Platform"
// ═══════════════════════════════════════════════════════════════════════
// MAJOR REDESIGN — immersive hero, motion-heavy, premium density
// Sections:
//   1.  Hero          — centered immersive hero with animated background
//   2.  LiveStrip     — scrolling live scores
//   3.  MetricsStrip  — animated live analytics strip
//   4.  TodayIntel    — today's intelligence signal cards
//   5.  TopPredictions — horizontal prediction cards
//   6.  EdgeBoard     — value edge signals + xG leaders
//   7.  CommandGrid   — large animated tool cards
//   8.  CompetitionHub— league cards with coverage badges
//   9.  FPLHub        — FPL intelligence dashboard
//  10.  TrendingPlayers — player data rail
//  11.  WhyStatinSite — models + platform facts
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = "https://football-stats-lw4b.onrender.com";
const LIVE_SET = new Set(["1H","2H","HT","ET","BT","P"]);
const FT_SET   = new Set(["FT","AET","PEN"]);
const isToday  = d => d && new Date(d).toDateString() === new Date().toDateString();

/* ═══════════════════════════════════════════════════════
   INJECTED STYLES — all CSS for the redesign
   ═══════════════════════════════════════════════════════ */
const STYLE_ID = "hp7-injected-styles";
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
/* ── Fonts ──────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;0,9..40,900;1,9..40,400&family=JetBrains+Mono:wght@400;700;800&display=swap');

/* ── Root vars ──────────────────────────────────────── */
:root {
  --bg-deep: #030712;
  --bg-card: rgba(6,11,26,.92);
  --bg-card-hover: rgba(12,20,42,.95);
  --border-subtle: rgba(255,255,255,.055);
  --border-hover: rgba(255,255,255,.12);
  --text: #e8edf5;
  --text-muted: #8896a8;
  --text-dim: #5e6b7d;
  --font-body: 'DM Sans', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --glow-blue: #38bdf8;
  --glow-green: #34d399;
  --glow-purple: #a78bfa;
  --glow-amber: #f59e0b;
  --glow-red: #ff4444;
  --glow-pink: #f472b6;
}

/* ── Global resets ──────────────────────────────────── */
.hp7-root {
  font-family: var(--font-body);
  color: var(--text);
  background: var(--bg-deep);
  min-height: 100vh;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}
.hp7-root *, .hp7-root *::before, .hp7-root *::after { box-sizing: border-box; }
.hp7-mono { font-family: var(--font-mono); }
.hp7-container { max-width: 1260px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 2; }
.hp7-section { padding: 48px 0 32px; position: relative; }

/* ── Keyframes ──────────────────────────────────────── */
@keyframes hp7-fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes hp7-fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes hp7-float { 0%,100% { transform: translateY(0) translateX(0); } 33% { transform: translateY(-18px) translateX(8px); } 66% { transform: translateY(6px) translateX(-6px); } }
@keyframes hp7-pulse { 0%,100% { opacity: .5; } 50% { opacity: 1; } }
@keyframes hp7-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
@keyframes hp7-glow-breathe { 0%,100% { opacity: .4; filter: blur(40px); } 50% { opacity: .7; filter: blur(50px); } }
@keyframes hp7-scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
@keyframes hp7-sweep { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes hp7-strip-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }
@keyframes hp7-count-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes hp7-orbit { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes hp7-border-rotate { 0% { --angle: 0deg; } 100% { --angle: 360deg; } }
@keyframes hp7-dot-ping { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
@keyframes hp7-gradient-flow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
@keyframes hp7-bar-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes hp7-ripple-out { to { transform: scale(3); opacity: 0; } }

/* ── Skeleton ──────────────────────────────────────── */
.hp7-skel {
  background: linear-gradient(90deg, rgba(255,255,255,.03) 25%, rgba(255,255,255,.06) 50%, rgba(255,255,255,.03) 75%);
  background-size: 200% 100%;
  animation: hp7-shimmer 1.5s ease infinite;
  border-radius: 5px;
  display: block;
}

/* ── Live dot ──────────────────────────────────────── */
.hp7-live-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--dot-color, #ff4444);
  box-shadow: 0 0 10px var(--dot-color, #ff4444);
  animation: hp7-pulse 1.6s ease-in-out infinite;
  flex-shrink: 0; position: relative;
}
.hp7-live-dot::after {
  content: ''; position: absolute; inset: -3px; border-radius: 50%;
  border: 1px solid var(--dot-color, #ff4444); opacity: .4;
  animation: hp7-dot-ping 2s ease-out infinite;
}
.hp7-live-dot--sm { width: 6px; height: 6px; }
.hp7-live-dot--sm::after { inset: -2px; }
.hp7-live-dot--xs { width: 5px; height: 5px; }
.hp7-live-dot--xs::after { display: none; }

/* ══════════════════════════════════════════════════════
   HERO SECTION
   ══════════════════════════════════════════════════════ */
.hp7-hero {
  position: relative;
  min-height: 92vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 100px 24px 40px;
}

/* Animated gradient mesh blobs */
.hp7-hero-blob {
  position: absolute; border-radius: 50%; pointer-events: none;
  filter: blur(80px); mix-blend-mode: screen; z-index: 0;
}
.hp7-hero-blob--a { width: 500px; height: 500px; background: radial-gradient(circle, rgba(56,189,248,.15) 0%, transparent 70%); top: 10%; left: 50%; transform: translate(-50%, -50%); animation: hp7-glow-breathe 8s ease-in-out infinite; }
.hp7-hero-blob--b { width: 400px; height: 400px; background: radial-gradient(circle, rgba(52,211,153,.12) 0%, transparent 70%); bottom: 15%; left: 25%; animation: hp7-glow-breathe 10s ease-in-out 2s infinite; }
.hp7-hero-blob--c { width: 350px; height: 350px; background: radial-gradient(circle, rgba(167,139,250,.1) 0%, transparent 70%); top: 30%; right: 15%; animation: hp7-glow-breathe 12s ease-in-out 4s infinite; }

/* Scanline */
.hp7-scanline {
  position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(56,189,248,.012) 2px, rgba(56,189,248,.012) 4px);
}
.hp7-scanline::after {
  content: ''; position: absolute; left: 0; right: 0; height: 150px;
  background: linear-gradient(180deg, rgba(56,189,248,.04), transparent);
  animation: hp7-scanline 6s linear infinite; opacity: .5;
}

/* Hero center content */
.hp7-hero-content {
  position: relative; z-index: 3; text-align: center;
  max-width: 720px; width: 100%;
}

/* Platform chip */
.hp7-hero-chip {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 18px; border-radius: 999px;
  background: rgba(56,189,248,.06);
  border: 1px solid rgba(56,189,248,.15);
  font-size: 10px; font-weight: 700; letter-spacing: .15em;
  color: rgba(56,189,248,.9); text-transform: uppercase;
  font-family: var(--font-mono);
  animation: hp7-fadeUp .7s ease both;
  backdrop-filter: blur(12px);
}
.hp7-hero-chip--live {
  background: rgba(255,68,68,.06);
  border-color: rgba(255,68,68,.2);
  color: #ff6666;
}

/* Main title */
.hp7-hero-title {
  font-size: clamp(52px, 10vw, 96px);
  font-weight: 900;
  line-height: .92;
  letter-spacing: -0.035em;
  margin: 20px 0 0;
  animation: hp7-fadeUp .7s ease .1s both;
}
.hp7-hero-accent {
  background: linear-gradient(135deg, #38bdf8 0%, #34d399 40%, #a78bfa 80%, #38bdf8 100%);
  background-size: 200% 200%;
  animation: hp7-gradient-flow 6s ease infinite;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
  filter: drop-shadow(0 0 30px rgba(56,189,248,.35)) drop-shadow(0 0 60px rgba(52,211,153,.2));
}

/* Sub text */
.hp7-hero-sub {
  font-size: 15px; line-height: 1.65; color: var(--text-muted);
  max-width: 520px; margin: 16px auto 0;
  animation: hp7-fadeUp .7s ease .2s both;
}

/* CTA row */
.hp7-hero-ctas {
  display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;
  margin-top: 28px;
  animation: hp7-fadeUp .7s ease .3s both;
}

/* Buttons */
.hp7-btn {
  position: relative; overflow: hidden; cursor: pointer;
  display: inline-flex; align-items: center; gap: 7px;
  padding: 11px 24px; border-radius: 10px;
  font-family: var(--font-body); font-size: 13px; font-weight: 700;
  border: 1px solid var(--border-subtle); background: var(--bg-card);
  color: var(--text); transition: all .22s ease;
  backdrop-filter: blur(8px);
}
.hp7-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0,0,0,.4), 0 0 20px var(--btn-glow, rgba(56,189,248,.15));
  border-color: var(--btn-border, rgba(56,189,248,.3));
}
.hp7-btn:active { transform: translateY(0); }
.hp7-btn--primary { --btn-glow: rgba(56,189,248,.2); --btn-border: rgba(56,189,248,.4); background: linear-gradient(135deg, rgba(56,189,248,.12), rgba(52,211,153,.08)); border-color: rgba(56,189,248,.25); }
.hp7-btn--live { --btn-glow: rgba(255,68,68,.25); --btn-border: rgba(255,68,68,.4); background: linear-gradient(135deg, rgba(255,68,68,.12), rgba(255,100,100,.06)); border-color: rgba(255,68,68,.3); color: #ff6666; }
.hp7-btn--fpl { --btn-glow: rgba(52,211,153,.2); --btn-border: rgba(52,211,153,.3); background: linear-gradient(135deg, rgba(52,211,153,.1), rgba(52,211,153,.04)); border-color: rgba(52,211,153,.2); color: #34d399; }
.hp7-btn--ghost { --btn-glow: rgba(167,139,250,.15); --btn-border: rgba(167,139,250,.25); }
.hp7-btn-sweep {
  position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.06), transparent);
  transition: none;
}
.hp7-btn:hover .hp7-btn-sweep { animation: hp7-shimmer 1s ease forwards; }
.hp7-ripple {
  position: absolute; width: 8px; height: 8px; border-radius: 50%;
  background: rgba(255,255,255,.25); transform: scale(0);
  animation: hp7-ripple-out .6s ease forwards; pointer-events: none;
}

/* Scroll cue */
.hp7-scroll-cue {
  position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: 0;
  animation: hp7-fadeIn 1s ease 1.2s both; z-index: 3;
}
.hp7-scroll-line { width: 1px; height: 28px; background: linear-gradient(180deg, transparent, rgba(56,189,248,.3)); }
.hp7-scroll-dot { width: 4px; height: 4px; border-radius: 50%; background: rgba(56,189,248,.5); animation: hp7-pulse 2s ease-in-out infinite; }

/* ══════════════════════════════════════════════════════
   LIVE STRIP
   ══════════════════════════════════════════════════════ */
.hp7-live-strip {
  position: relative; overflow: hidden;
  background: linear-gradient(180deg, rgba(255,68,68,.03), transparent);
  border-top: 1px solid rgba(255,68,68,.08);
  border-bottom: 1px solid rgba(255,68,68,.05);
  padding: 10px 0;
}
.hp7-strip-fade { position: absolute; top: 0; bottom: 0; width: 80px; z-index: 3; pointer-events: none; }
.hp7-strip-fade--l { left: 0; background: linear-gradient(90deg, var(--bg-deep), transparent); }
.hp7-strip-fade--r { right: 0; background: linear-gradient(-90deg, var(--bg-deep), transparent); }
.hp7-strip-track { display: flex; gap: 16px; white-space: nowrap; animation: hp7-strip-scroll var(--dur, 30s) linear infinite; }
.hp7-strip-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 14px; border-radius: 999px;
  background: rgba(255,68,68,.05); border: 1px solid rgba(255,68,68,.1);
  cursor: pointer; transition: all .2s; flex-shrink: 0;
}
.hp7-strip-chip:hover { background: rgba(255,68,68,.1); border-color: rgba(255,68,68,.2); transform: translateY(-1px); }
.hp7-chip-logo { width: 14px; height: 14px; object-fit: contain; }
.hp7-chip-team { font-size: 11px; font-weight: 600; color: var(--text-muted); }
.hp7-chip-score { font-family: var(--font-mono); font-size: 12px; font-weight: 800; color: var(--text); }
.hp7-chip-min { font-family: var(--font-mono); font-size: 10px; color: #ff6666; font-weight: 700; }

/* ══════════════════════════════════════════════════════
   METRICS STRIP (new section under hero)
   ══════════════════════════════════════════════════════ */
.hp7-metrics-strip {
  padding: 20px 0 8px; position: relative;
}
.hp7-metrics-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
}
.hp7-metric-card {
  position: relative; overflow: hidden;
  padding: 18px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  transition: all .25s ease;
}
.hp7-metric-card::before {
  content: ''; position: absolute; inset: 0; opacity: 0;
  background: radial-gradient(circle at 50% 0%, var(--mc-color, rgba(56,189,248,.08)), transparent 70%);
  transition: opacity .3s;
}
.hp7-metric-card:hover::before { opacity: 1; }
.hp7-metric-card:hover { border-color: var(--mc-border, rgba(56,189,248,.15)); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.3); }
.hp7-metric-card::after {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: var(--mc-accent, #38bdf8); opacity: .4;
  border-radius: 0 0 4px 4px;
}
.hp7-mc-label { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--text-dim); margin-bottom: 8px; }
.hp7-mc-val { font-family: var(--font-mono); font-size: 26px; font-weight: 800; color: var(--mc-accent, #38bdf8); line-height: 1; }
.hp7-mc-sub { font-size: 10px; color: var(--text-dim); margin-top: 5px; }

/* ══════════════════════════════════════════════════════
   TODAY'S INTELLIGENCE (new section)
   ══════════════════════════════════════════════════════ */
.hp7-intel-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px;
}
.hp7-intel-card {
  position: relative; overflow: hidden;
  padding: 16px 18px; border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-left: 3px solid var(--ic-color, #38bdf8);
  cursor: pointer; transition: all .25s ease;
}
.hp7-intel-card:hover {
  background: var(--bg-card-hover);
  border-color: var(--ic-color, #38bdf8);
  border-left-color: var(--ic-color, #38bdf8);
  transform: translateY(-2px) translateX(2px);
  box-shadow: 0 8px 24px rgba(0,0,0,.3), inset 0 0 30px rgba(var(--ic-rgb, 56,189,248),.03);
}
.hp7-intel-card::after {
  content: ''; position: absolute; top: 0; right: 0; width: 60px; height: 60px;
  background: radial-gradient(circle, var(--ic-color, #38bdf8), transparent);
  opacity: .03; border-radius: 0 12px 0 60px;
}
.hp7-ic-signal { font-size: 9px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--ic-color, #38bdf8); margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
.hp7-ic-signal::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--ic-color, #38bdf8); opacity: .7; }
.hp7-ic-title { font-size: 13px; font-weight: 700; color: var(--text); line-height: 1.3; }
.hp7-ic-detail { font-size: 11px; color: var(--text-muted); margin-top: 4px; max-height: 0; overflow: hidden; transition: max-height .3s, opacity .3s; opacity: 0; }
.hp7-intel-card:hover .hp7-ic-detail { max-height: 40px; opacity: 1; }

/* ══════════════════════════════════════════════════════
   SECTION HEADS
   ══════════════════════════════════════════════════════ */
.hp7-section-head {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 16px;
  margin-bottom: 22px;
}
.hp7-eyebrow {
  font-size: 10px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase;
  color: var(--text-dim); margin-bottom: 5px;
}
.hp7-section-title {
  font-size: clamp(20px, 3vw, 26px); font-weight: 900; letter-spacing: -0.02em;
  color: var(--text); line-height: 1.15; margin: 0;
}
.hp7-see-all {
  font-size: 11px; color: rgba(56,189,248,.7); text-decoration: none;
  font-weight: 600; white-space: nowrap; transition: color .2s;
  padding: 4px 12px; border-radius: 999px; border: 1px solid rgba(56,189,248,.12);
  background: rgba(56,189,248,.04);
}
.hp7-see-all:hover { color: #38bdf8; background: rgba(56,189,248,.08); border-color: rgba(56,189,248,.25); }
.hp7-sub-label { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--text-dim); margin-bottom: 10px; }

/* ══════════════════════════════════════════════════════
   SECTION DIVIDERS (glowing)
   ══════════════════════════════════════════════════════ */
.hp7-divider {
  height: 1px; max-width: 1200px; margin: 0 auto; position: relative;
  background: linear-gradient(90deg, transparent 5%, rgba(56,189,248,.08) 30%, rgba(52,211,153,.06) 70%, transparent 95%);
}

/* ══════════════════════════════════════════════════════
   PREDICTION CARDS
   ══════════════════════════════════════════════════════ */
.hp7-hscroll {
  display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px;
  scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.06) transparent;
}
.hp7-hscroll::-webkit-scrollbar { height: 4px; }
.hp7-hscroll::-webkit-scrollbar-track { background: transparent; }
.hp7-hscroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 4px; }

.hp7-pred-card {
  position: relative; overflow: hidden;
  padding: 18px; border-radius: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  cursor: pointer; transition: all .28s ease;
}
.hp7-pred-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, var(--pc-color, #38bdf8), transparent);
  opacity: .5;
}
.hp7-pred-card::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(135deg, transparent, rgba(255,255,255,.01));
  opacity: 0; transition: opacity .3s;
}
.hp7-pred-card--hov {
  transform: translateY(-4px);
  border-color: rgba(255,255,255,.1);
  box-shadow: 0 12px 40px rgba(0,0,0,.4), 0 0 20px rgba(var(--pc-rgb, 56,189,248),.06);
}
.hp7-pred-card--hov::after { opacity: 1; }
.hp7-pc-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.hp7-pc-league { font-size: 10px; font-weight: 700; color: var(--text-dim); letter-spacing: .08em; text-transform: uppercase; }
.hp7-pc-teams { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.hp7-pc-team { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
.hp7-pc-tname { font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp7-pc-score-area { text-align: center; flex-shrink: 0; }
.hp7-pc-predicted { font-family: var(--font-mono); font-size: 18px; font-weight: 900; letter-spacing: -.02em; }
.hp7-pc-probbar { display: flex; height: 4px; border-radius: 999px; overflow: hidden; gap: 1px; margin-bottom: 6px; }
.hp7-pc-probs { display: flex; justify-content: space-between; font-size: 10px; }
.hp7-pc-markets { display: flex; align-items: center; gap: 10px; margin-top: 8px; font-size: 10px; color: var(--text-muted); }
.hp7-pc-badge { padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: 800; font-family: var(--font-mono); }
.hp7-pc-expand { max-height: 0; overflow: hidden; transition: max-height .3s, margin .3s; }
.hp7-pc-expand--vis { max-height: 24px; margin-top: 8px; }

/* ══════════════════════════════════════════════════════
   EDGE BOARD
   ══════════════════════════════════════════════════════ */
.hp7-edge-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.hp7-edge-card {
  padding: 16px; border-radius: 12px;
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  transition: all .25s; position: relative; overflow: hidden;
}
.hp7-edge-card:hover { border-color: var(--border-hover); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.3); }
.hp7-edge-card::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,.01));
  pointer-events: none;
}
.hp7-edge-tag { font-size: 9px; font-weight: 800; letter-spacing: .12em; }
.hp7-edge-match { font-size: 12px; font-weight: 700; margin-top: 4px; }
.hp7-edge-val { font-family: var(--font-mono); font-size: 22px; font-weight: 900; margin-top: 4px; }
.hp7-edge-dir { font-size: 10px; color: var(--text-muted); }
.hp7-xg-card {
  padding: 16px; border-radius: 12px;
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  cursor: pointer; transition: all .25s; position: relative; overflow: hidden;
}
.hp7-xg-card:hover { border-color: var(--border-hover); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.3); }
.hp7-xg-tag { font-size: 9px; font-weight: 800; letter-spacing: .12em; color: #f59e0b; }
.hp7-xg-total { font-family: var(--font-mono); font-size: 24px; font-weight: 900; color: #f59e0b; }
.hp7-xg-match { font-size: 12px; color: var(--text-muted); font-weight: 600; }

/* ══════════════════════════════════════════════════════
   COMMAND GRID (tool cards)
   ══════════════════════════════════════════════════════ */
.hp7-bento {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(160px, auto);
  gap: 12px;
}
.hp7-tool-wrap { position: relative; }
.hp7-tool-card {
  position: relative; overflow: hidden; height: 100%;
  border-radius: 16px; background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
}
.hp7-tool-card--hov {
  border-color: rgba(255,255,255,.1);
  box-shadow: 0 16px 48px rgba(0,0,0,.4), 0 0 24px rgba(var(--tc-rgb, 56,189,248),.05);
}
.hp7-tool-glow {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  transition: background .15s; opacity: .6;
}
.hp7-tool-shimmer {
  position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.02), transparent);
  z-index: 1; pointer-events: none;
}
.hp7-tool-shimmer--active { animation: hp7-shimmer 1.5s ease forwards; }
.hp7-tool-topbar { position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--tc-color, #38bdf8); opacity: .35; }
.hp7-tool-link { display: flex; flex-direction: column; height: 100%; padding: 20px; position: relative; z-index: 2; text-decoration: none; color: inherit; }
.hp7-tool-header { display: flex; justify-content: space-between; align-items: flex-start; }
.hp7-tool-tag { font-size: 9px; font-weight: 800; letter-spacing: .12em; font-family: var(--font-mono); }
.hp7-tool-title { font-size: 18px; font-weight: 900; margin-top: 8px; letter-spacing: -0.01em; }
.hp7-tool-sub { font-size: 11px; color: var(--text-muted); margin-top: 4px; line-height: 1.4; }
.hp7-td { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border-subtle); }
.hp7-td-val { font-size: 11px; font-weight: 700; }
.hp7-td-sub { font-size: 10px; color: var(--text-dim); margin-top: 2px; }
.hp7-tool-gfx-bg {
  position: absolute; bottom: 10px; right: 10px; opacity: .06;
  z-index: 0; pointer-events: none; transition: opacity .3s;
}
.hp7-tool-card--hov .hp7-tool-gfx-bg { opacity: .12; }
.hp7-tool-gfx-top { transition: opacity .2s; }
.hp7-tool-cta {
  margin-top: auto; padding-top: 12px;
  font-size: 11px; font-weight: 700; color: var(--tc-color, #38bdf8);
  opacity: .6; transition: opacity .2s;
}
.hp7-tool-card--hov .hp7-tool-cta { opacity: 1; }

/* Idle shimmer line on cards */
.hp7-idle-shimmer {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  overflow: hidden; pointer-events: none; z-index: 1;
}
.hp7-idle-shimmer::after {
  content: ''; position: absolute; top: 0; left: -120%; width: 30%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.015), transparent);
  animation: hp7-shimmer 4s ease infinite;
}

/* ══════════════════════════════════════════════════════
   COMPETITION HUB
   ══════════════════════════════════════════════════════ */
.hp7-comp-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;
}
.hp7-comp-card {
  position: relative; overflow: hidden;
  padding: 16px; border-radius: 14px;
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  transition: all .25s; cursor: pointer;
}
.hp7-comp-card:hover { transform: translateY(-3px); border-color: var(--cc-color, #38bdf8); box-shadow: 0 10px 32px rgba(0,0,0,.35), 0 0 16px rgba(var(--cc-rgb, 56,189,248),.06); }
.hp7-cc-topbar { position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--cc-color); opacity: .4; }
.hp7-cc-header { display: flex; align-items: center; gap: 10px; }
.hp7-cc-logo {
  width: 38px; height: 38px; border-radius: 10px;
  background: rgba(255,255,255,.03); border: 1px solid var(--border-subtle);
  display: flex; align-items: center; justify-content: center;
  transition: border-color .25s, box-shadow .25s;
}
.hp7-comp-card:hover .hp7-cc-logo { border-color: rgba(255,255,255,.12); box-shadow: 0 0 12px rgba(var(--cc-rgb, 56,189,248),.1); }
.hp7-cc-name { font-size: 13px; font-weight: 800; }
.hp7-cc-meta { font-size: 10px; color: var(--text-dim); margin-top: 2px; }
.hp7-cc-features { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 10px; }
.hp7-cc-feat {
  font-size: 9px; font-weight: 600; padding: 2px 8px; border-radius: 999px;
  background: rgba(255,255,255,.03); border: 1px solid var(--border-subtle);
  color: var(--text-muted);
}
.hp7-comp-card:hover .hp7-cc-feat { border-color: rgba(255,255,255,.08); }
.hp7-cc-cta { font-size: 10px; color: var(--cc-color); font-weight: 700; margin-top: 10px; opacity: 0; transition: opacity .2s; }
.hp7-comp-card:hover .hp7-cc-cta { opacity: .8; }

/* ══════════════════════════════════════════════════════
   FPL HUB
   ══════════════════════════════════════════════════════ */
.hp7-fpl-layout { display: grid; grid-template-columns: 1fr 180px 1fr; gap: 20px; align-items: start; }
.hp7-fpl-left, .hp7-fpl-right { display: flex; flex-direction: column; gap: 6px; }
.hp7-capt-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 10px;
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  transition: all .2s;
}
.hp7-capt-row:hover { background: var(--bg-card-hover); border-color: var(--border-hover); transform: translateX(3px); }
.hp7-cr-rank { font-family: var(--font-mono); font-size: 10px; color: var(--text-dim); font-weight: 800; }
.hp7-cr-name { font-size: 12px; font-weight: 700; }
.hp7-cr-meta { font-size: 10px; color: var(--text-dim); margin-top: 1px; }
.hp7-cr-ep { font-family: var(--font-mono); font-size: 16px; font-weight: 900; color: #34d399; }
.hp7-cr-ep-label { font-size: 8px; color: var(--text-dim); font-weight: 700; }

/* FPL center orbit */
.hp7-fpl-center { display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; min-height: 180px; }
.hp7-fpl-orbit { position: absolute; inset: 0; }
.hp7-fpl-orbit-ring {
  position: absolute; inset: 10%; border-radius: 50%;
  border: 1px solid rgba(52,211,153,.1);
  animation: hp7-orbit 20s linear infinite;
}
.hp7-fpl-orbit-ring::after {
  content: ''; position: absolute; top: -3px; left: 50%; width: 6px; height: 6px;
  border-radius: 50%; background: #34d399; transform: translateX(-50%);
  box-shadow: 0 0 8px #34d399;
}
.hp7-fpl-orbit-ring--2 {
  inset: 22%; border-color: rgba(56,189,248,.08);
  animation-duration: 14s; animation-direction: reverse;
}
.hp7-fpl-orbit-ring--2::after { background: #38bdf8; box-shadow: 0 0 8px #38bdf8; }
.hp7-fpl-orbit-core {
  position: absolute; inset: 38%; border-radius: 50%;
  background: radial-gradient(circle, rgba(52,211,153,.06), transparent);
  border: 1px solid rgba(52,211,153,.08);
}
.hp7-fpl-center-text { position: relative; z-index: 2; text-align: center; }
.hp7-fpl-center-num { font-family: var(--font-mono); font-size: 32px; font-weight: 900; color: #34d399; }

/* FPL tool rows */
.hp7-fpl-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 8px;
  background: rgba(255,255,255,.01);
  border: 1px solid transparent;
  transition: all .22s ease; cursor: pointer; text-decoration: none; color: inherit; position: relative;
}
.hp7-fpl-row:hover {
  background: var(--bg-card);
  border-color: var(--border-subtle);
  transform: translateX(4px);
  box-shadow: 0 4px 16px rgba(0,0,0,.2);
}
.hp7-fpl-indicator {
  position: absolute; left: 0; top: 20%; bottom: 20%;
  width: 2px; background: var(--fpl-color, #34d399);
  border-radius: 999px; opacity: 0; transition: opacity .2s;
}
.hp7-fpl-row:hover .hp7-fpl-indicator { opacity: .7; }
.hp7-fpl-idx { font-family: var(--font-mono); font-size: 9px; color: var(--text-dim); font-weight: 800; width: 16px; }
.hp7-fpl-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--fpl-color, #34d399); opacity: .4; flex-shrink: 0; transition: opacity .2s, transform .2s; }
.hp7-fpl-row:hover .hp7-fpl-dot { opacity: .8; transform: scale(1.4); }
.hp7-fpl-content { flex: 1; min-width: 0; }
.hp7-fpl-label { font-size: 12px; font-weight: 700; display: block; }
.hp7-fpl-detail { font-size: 10px; color: var(--text-dim); display: block; max-height: 0; overflow: hidden; transition: max-height .3s, opacity .3s; opacity: 0; }
.hp7-fpl-row:hover .hp7-fpl-detail { max-height: 20px; opacity: 1; }
.hp7-fpl-stat { font-size: 10px; color: var(--text-muted); font-weight: 600; white-space: nowrap; font-family: var(--font-mono); }
.hp7-fpl-arrow { font-size: 12px; opacity: 0; transition: opacity .2s, transform .2s; color: var(--fpl-color, #34d399); }
.hp7-fpl-row:hover .hp7-fpl-arrow { opacity: 1; transform: translateX(2px); }

/* ══════════════════════════════════════════════════════
   TRENDING PLAYERS
   ══════════════════════════════════════════════════════ */
.hp7-player-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
.hp7-player-card {
  padding: 14px; border-radius: 12px;
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  cursor: pointer; transition: all .25s; position: relative; overflow: hidden;
}
.hp7-player-card:hover { transform: translateY(-2px); border-color: var(--border-hover); box-shadow: 0 8px 24px rgba(0,0,0,.3); }
.hp7-pc2-top { display: flex; align-items: center; gap: 8px; }
.hp7-pc2-name { font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hp7-pc2-team { font-size: 10px; color: var(--text-dim); }
.hp7-pc2-stat { font-family: var(--font-mono); font-size: 14px; font-weight: 900; text-align: right; }

/* ══════════════════════════════════════════════════════
   WHY STATINSITE
   ══════════════════════════════════════════════════════ */
.hp7-why-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 28px; }
.hp7-models-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.hp7-model-card {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 14px; border-radius: 10px;
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  transition: all .25s; position: relative; overflow: hidden;
}
.hp7-model-card:hover { border-color: var(--border-hover); transform: translateY(-1px); }
.hp7-mc-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--mc-color, #38bdf8); margin-top: 4px; flex-shrink: 0; box-shadow: 0 0 8px var(--mc-color, #38bdf8); }
.hp7-mc-name { font-size: 12px; font-weight: 800; }
.hp7-mc-desc { font-size: 10px; color: var(--text-dim); margin-top: 2px; line-height: 1.35; }
.hp7-facts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.hp7-fact-card {
  padding: 18px; border-radius: 12px; text-align: center;
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  transition: all .25s;
}
.hp7-fact-card:hover { border-color: var(--border-hover); transform: scale(1.02); }
.hp7-fact-val { font-family: var(--font-mono); font-size: 24px; font-weight: 900; color: #38bdf8; }
.hp7-fact-label { font-size: 10px; color: var(--text-dim); margin-top: 2px; font-weight: 600; }
.hp7-platform-note { font-size: 10px; color: var(--text-dim); margin-top: 12px; line-height: 1.5; }
.hp7-empty-state { font-size: 11px; color: var(--text-dim); padding: 16px; text-align: center; }

/* ══════════════════════════════════════════════════════
   RESPONSIVE
   ══════════════════════════════════════════════════════ */
@media (max-width: 900px) {
  .hp7-bento { grid-template-columns: repeat(2, 1fr); }
  .hp7-edge-grid { grid-template-columns: 1fr; }
  .hp7-fpl-layout { grid-template-columns: 1fr; }
  .hp7-fpl-center { min-height: 120px; order: -1; }
  .hp7-why-grid { grid-template-columns: 1fr; }
  .hp7-metrics-grid { grid-template-columns: repeat(2, 1fr); }
  .hp7-hero-title { font-size: clamp(40px, 10vw, 72px); }
}
@media (max-width: 600px) {
  .hp7-bento { grid-template-columns: 1fr; }
  .hp7-metrics-grid { grid-template-columns: 1fr 1fr; }
  .hp7-comp-grid { grid-template-columns: 1fr; }
  .hp7-models-grid { grid-template-columns: 1fr; }
  .hp7-hero { min-height: 85vh; padding: 80px 16px 40px; }
}
`;
  document.head.appendChild(style);
}

// ─── Data hooks (unchanged) ───────────────────────────────────
function useUpcoming() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let dead = false;
    const k = "hp7_up";
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
          confidence: c.confidence??null,
          home_form: c.home_form||"", away_form: c.away_form||"",
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
    const k = "hp7_dash";
    try { const r = sessionStorage.getItem(k); if (r) { const {ts,p} = JSON.parse(r); if (Date.now()-ts<300000) { setData(p); setLoading(false); return; } } } catch {}
    fetch(`${API}/api/home/dashboard`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (dead||!d) return; setData(d); try { sessionStorage.setItem(k, JSON.stringify({ts:Date.now(),p:d})); } catch {} })
      .catch(()=>{}).finally(()=>{ if(!dead) setLoading(false); });
    return () => { dead = true; };
  }, []);
  return { dash: data, loading };
}

// ─── Utility hooks ────────────────────────────────────────────
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
  return <span ref={ref} className="hp7-mono">{v}{suffix}</span>;
}

function RippleBtn({ children, onClick, cls="", style={} }) {
  const [rips, setRips] = useState([]);
  const go = e => {
    const r = e.currentTarget.getBoundingClientRect(), id=Date.now();
    setRips(p=>[...p,{id,x:e.clientX-r.left,y:e.clientY-r.top}]);
    setTimeout(()=>setRips(p=>p.filter(r=>r.id!==id)),700);
    onClick?.(e);
  };
  return <button className={`hp7-btn ${cls}`} style={style} onClick={go}>{children}{rips.map(r=><span key={r.id} className="hp7-ripple" style={{left:r.x,top:r.y}}/>)}</button>;
}

function Skel({w="100%",h=14,r=5}) { return <div className="hp7-skel" style={{width:w,height:h,borderRadius:r,display:"block"}}/>; }

function FormPip({r}) {
  const c=r==="W"?"#34d399":r==="D"?"#f59e0b":"#f87171";
  return <div style={{width:14,height:14,borderRadius:3,background:`${c}22`,border:`1px solid ${c}50`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:900,color:c}}>{r}</div>;
}

// ─── Background animations ────────────────────────────────────
function TelemetryGrid() {
  const c = useRef(null);
  useEffect(() => {
    const canvas = c.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, t=0;
    const resize = () => { canvas.width=canvas.offsetWidth*1; canvas.height=canvas.offsetHeight*1; };
    resize(); window.addEventListener("resize",resize);
    const draw = () => {
      const {width:W,height:H} = canvas; ctx.clearRect(0,0,W,H);
      const SZ=56, cols=Math.ceil(W/SZ)+2, rows=Math.ceil(H/SZ)+2;
      const ox=(t*0.25)%SZ, oy=(t*0.12)%SZ;
      // Grid lines
      for(let i=-1;i<cols;i++) { const a=0.025+0.015*Math.sin(i*0.4+t*0.007); ctx.strokeStyle=`rgba(56,189,248,${a})`; ctx.lineWidth=0.5; ctx.beginPath(); ctx.moveTo(i*SZ-ox,0); ctx.lineTo(i*SZ-ox,H); ctx.stroke(); }
      for(let j=-1;j<rows;j++) { const a=0.025+0.015*Math.sin(j*0.5+t*0.005); ctx.strokeStyle=`rgba(56,189,248,${a})`; ctx.lineWidth=0.5; ctx.beginPath(); ctx.moveTo(0,j*SZ-oy); ctx.lineTo(W,j*SZ-oy); ctx.stroke(); }
      // Data nodes at intersections
      for(let i=0;i<cols;i++) for(let j=0;j<rows;j++) {
        const p=Math.sin(i*0.8+j*0.6+t*0.04);
        if(p>0.65){
          const intensity = (p-0.65)*1.2;
          ctx.fillStyle=`rgba(52,211,153,${intensity*0.5})`;
          ctx.beginPath(); ctx.arc(i*SZ-ox,j*SZ-oy,1.8,0,Math.PI*2); ctx.fill();
          // Glow
          ctx.fillStyle=`rgba(52,211,153,${intensity*0.15})`;
          ctx.beginPath(); ctx.arc(i*SZ-ox,j*SZ-oy,5,0,Math.PI*2); ctx.fill();
        }
      }
      // Horizontal scan pulse
      const scanY = (t * 0.8) % H;
      const grad = ctx.createLinearGradient(0, scanY-30, 0, scanY+30);
      grad.addColorStop(0, 'rgba(56,189,248,0)');
      grad.addColorStop(0.5, 'rgba(56,189,248,0.03)');
      grad.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY-30, W, 60);

      t++; raf=requestAnimationFrame(draw);
    };
    draw(); return () => { cancelAnimationFrame(raf); window.removeEventListener("resize",resize); };
  },[]);
  return <canvas ref={c} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0}}/>;
}

function Particles({n=25}) {
  const ps = useMemo(()=>Array.from({length:n},(_,i)=>({
    id:i, x:Math.random()*100, y:Math.random()*100,
    sz:1+Math.random()*2.5, dur:10+Math.random()*16, del:-Math.random()*20,
    c:["56,189,248","52,211,153","167,139,250","245,158,11"][i%4]
  })),[n]);
  return (
    <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
      {ps.map(p=>(
        <div key={p.id} style={{
          position:"absolute",left:`${p.x}%`,top:`${p.y}%`,
          width:p.sz,height:p.sz,borderRadius:"50%",
          background:`rgba(${p.c},0.5)`,
          boxShadow:`0 0 ${p.sz*4}px rgba(${p.c},0.35)`,
          animation:`hp7-float ${p.dur}s ${p.del}s linear infinite`
        }}/>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — HERO (centered, immersive)
// ═══════════════════════════════════════════════════════════════
function HeroSection({ fixtures, upcoming_loading, dash, dash_loading }) {
  const nav = useNavigate();
  const heroRef = useRef(null);
  const [mouse, setMouse] = useState({x:.5,y:.5});
  const liveCount = fixtures.filter(f=>LIVE_SET.has(f.status)).length;
  const onMove = useCallback(e=>{const r=heroRef.current?.getBoundingClientRect();if(!r)return;setMouse({x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height});},[]);

  return (
    <section className="hp7-hero" ref={heroRef} onMouseMove={onMove}>
      <TelemetryGrid/>
      <Particles n={25}/>

      {/* Parallax blobs that follow cursor */}
      {[
        {cls:"hp7-hero-blob hp7-hero-blob--a",dx:.5,dy:.4},
        {cls:"hp7-hero-blob hp7-hero-blob--b",dx:-.3,dy:-.3},
        {cls:"hp7-hero-blob hp7-hero-blob--c",dx:.6,dy:.5},
      ].map(({cls,dx,dy},i)=>(
        <div key={i} className={cls} style={{transform:`translate(calc(-50% + ${(mouse.x-.5)*35*dx}px),calc(-50% + ${(mouse.y-.5)*25*dy}px))`,transition:"transform 0.2s ease"}}/>
      ))}

      <div className="hp7-scanline"/>

      {/* Centered hero content */}
      <div className="hp7-hero-content">
        {/* Platform chip */}
        <div className={`hp7-hero-chip ${liveCount>0?"hp7-hero-chip--live":""}`}>
          {liveCount > 0 ? (
            <><span className="hp7-live-dot hp7-live-dot--sm" style={{"--dot-color":"#ff4444"}}/><span>{liveCount} LIVE NOW</span></>
          ) : (
            <span>ELO · DIXON-COLES · xG · POISSON</span>
          )}
        </div>

        {/* Title */}
        <h1 className="hp7-hero-title">
          Read The<br/><span className="hp7-hero-accent">Game.</span>
        </h1>

        {/* Subtext */}
        <p className="hp7-hero-sub">
          Football intelligence rebuilt from the ground up. Live scores, Poisson predictions, real-time xG tracking and the deepest FPL analytics suite.
        </p>

        {/* CTAs */}
        <div className="hp7-hero-ctas">
          <RippleBtn cls={liveCount>0?"hp7-btn--live":"hp7-btn--primary"} onClick={()=>nav("/live")}>
            {liveCount>0&&<span className="hp7-live-dot hp7-live-dot--sm"/>}
            {liveCount>0?"Watch Live":"Live Centre"}<span className="hp7-btn-sweep"/>
          </RippleBtn>
          <RippleBtn cls="hp7-btn--ghost" onClick={()=>nav("/predictions/premier-league")}>
            Predictions<span className="hp7-btn-sweep"/>
          </RippleBtn>
          <RippleBtn cls="hp7-btn--fpl" onClick={()=>nav("/best-team")}>
            FPL Tools<span className="hp7-btn-sweep"/>
          </RippleBtn>
        </div>
      </div>

      <div className="hp7-scroll-cue"><div className="hp7-scroll-line"/><div className="hp7-scroll-dot"/></div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// LIVE STRIP
// ═══════════════════════════════════════════════════════════════
function LivePulseStrip({ fixtures }) {
  const nav = useNavigate();
  const live = fixtures.filter(f=>LIVE_SET.has(f.status));
  if (!live.length) return null;
  const chips = [...live,...live,...live];
  return (
    <div className="hp7-live-strip">
      <div className="hp7-strip-fade hp7-strip-fade--l"/>
      <div className="hp7-strip-track" style={{"--dur":`${Math.max(live.length*6,18)}s`}}>
        {chips.map((f,i)=>(
          <div key={i} className="hp7-strip-chip" onClick={()=>nav(`/match/${f.fixture_id}`)}>
            <span className="hp7-live-dot hp7-live-dot--xs"/>
            {f.home_logo&&<img src={f.home_logo} className="hp7-chip-logo" onError={e=>e.currentTarget.style.display="none"}/>}
            <span className="hp7-chip-team">{f.home_team?.split(" ").slice(-1)[0]}</span>
            <span className="hp7-chip-score hp7-mono">{f.home_score??0}–{f.away_score??0}</span>
            {f.away_logo&&<img src={f.away_logo} className="hp7-chip-logo" onError={e=>e.currentTarget.style.display="none"}/>}
            <span className="hp7-chip-team">{f.away_team?.split(" ").slice(-1)[0]}</span>
            {f.minute&&<span className="hp7-chip-min hp7-mono">{f.minute}'</span>}
          </div>
        ))}
      </div>
      <div className="hp7-strip-fade hp7-strip-fade--r"/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — LIVE ANALYTICS METRICS STRIP
// ═══════════════════════════════════════════════════════════════
function MetricsStrip({ fixtures, upcoming_loading, dash, dash_loading }) {
  const [ref, vis] = useReveal(0.1);
  const liveCount = fixtures.filter(f=>LIVE_SET.has(f.status)).length;
  const todayCount = fixtures.filter(f=>isToday(f.kickoff)).length;
  const avgConf = dash?.model_confidence?.avg_confidence??null;
  const topEdge = dash?.model_edges?.edges?.[0]??null;

  const metrics = [
    { label:"Live Now", val: liveCount, suffix:"", color:"#ff4444", isLive: liveCount>0, loading: upcoming_loading },
    { label:"Matches Today", val: todayCount, suffix:"", color:"#38bdf8", loading: upcoming_loading },
    { label:"Avg Confidence", val: avgConf, suffix:"%", color:"#34d399", loading: dash_loading },
    { label:"Strongest Edge", val: topEdge?`+${topEdge.edge}%`:null, raw: true, color:"#a78bfa", loading: dash_loading, sub: topEdge ? `${topEdge.home?.split(" ").slice(-1)[0]} vs ${topEdge.away?.split(" ").slice(-1)[0]}` : null },
  ];

  return (
    <section className="hp7-metrics-strip">
      <div className="hp7-container">
        <div ref={ref} className="hp7-metrics-grid" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(16px)",transition:"all .6s ease"}}>
          {metrics.map((m,i)=>(
            <div key={m.label} className="hp7-metric-card" style={{
              "--mc-color":`rgba(${m.color==='#ff4444'?'255,68,68':m.color==='#38bdf8'?'56,189,248':m.color==='#34d399'?'52,211,153':'167,139,250'},.08)`,
              "--mc-border":`${m.color}25`,
              "--mc-accent":m.color,
              animationDelay:`${i*80}ms`,
            }}>
              <div className="hp7-mc-label">{m.label}</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {m.isLive&&<span className="hp7-live-dot hp7-live-dot--sm" style={{"--dot-color":"#ff4444"}}/>}
                {m.loading || m.val == null ? (
                  <Skel w={50} h={26} r={4}/>
                ) : m.raw ? (
                  <div className="hp7-mc-val">{m.val}</div>
                ) : (
                  <div className="hp7-mc-val"><CountUp to={Number(m.val)||0} suffix={m.suffix}/></div>
                )}
              </div>
              {m.sub && <div className="hp7-mc-sub">{m.sub}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — TODAY'S INTELLIGENCE (NEW)
// ═══════════════════════════════════════════════════════════════
function TodayIntelligence({ dash, fixtures, loading }) {
  const [ref, vis] = useReveal(0.06);
  const nav = useNavigate();

  // Build intel signals from data
  const signals = useMemo(() => {
    const s = [];
    const topEdge = dash?.model_edges?.edges?.[0];
    if (topEdge) s.push({ type:"MODEL EDGE", title:`${topEdge.home} vs ${topEdge.away}: +${topEdge.edge}% edge`, detail:`${topEdge.direction==="home"?topEdge.home:topEdge.away} favoured by model vs market`, color:"#34d399", rgb:"52,211,153", to:"/predictions/premier-league" });

    const highXg = dash?.high_scoring_matches?.matches?.[0];
    if (highXg) s.push({ type:"HIGH xG", title:`${highXg.home?.split(" ").slice(-1)[0]} vs ${highXg.away?.split(" ").slice(-1)[0]}: ${((highXg.xg_home||0)+(highXg.xg_away||0)).toFixed(1)} total xG`, detail:"Highest expected goals fixture today", color:"#f59e0b", rgb:"245,158,11", to: highXg.fixture_id?`/match/${highXg.fixture_id}`:"/predictions/premier-league" });

    const capt = dash?.differential_captains?.captains?.[0];
    if (capt) s.push({ type:"FPL CAPTAIN", title:`${capt.name||capt.web_name}: ${capt.ep_next?.toFixed(1)||"??"} expected points`, detail:`${capt.ownership?.toFixed(1)||"?"}% owned · ${capt.next_opp||""}`, color:"#38bdf8", rgb:"56,189,248", to:"/captaincy" });

    const topPred = dash?.top_predictions?.predictions?.[0];
    if (topPred) {
      const btts = (topPred.xg_home||0) > 0.9 && (topPred.xg_away||0) > 0.9;
      if (btts) s.push({ type:"BTTS SIGNAL", title:`${topPred.home?.split(" ").slice(-1)[0]} vs ${topPred.away?.split(" ").slice(-1)[0]}: both teams to score`, detail:`Home xG ${(topPred.xg_home||0).toFixed(1)} · Away xG ${(topPred.xg_away||0).toFixed(1)}`, color:"#f472b6", rgb:"244,114,182", to:"/predictions/premier-league" });

      const upset = topPred.homeProb < 40 && topPred.awayProb < 40;
      if (upset) s.push({ type:"UPSET WATCH", title:`${topPred.home?.split(" ").slice(-1)[0]} vs ${topPred.away?.split(" ").slice(-1)[0]}: tight call`, detail:`Model split — ${topPred.homeProb}% vs ${topPred.awayProb}%`, color:"#fb923c", rgb:"251,146,60", to:"/predictions/premier-league" });
    }

    // Fill remaining slots
    const live = fixtures.filter(f=>LIVE_SET.has(f.status));
    if (live.length > 0 && s.length < 5) s.push({ type:"LIVE NOW", title:`${live.length} match${live.length>1?'es':''} in progress`, detail:live[0]?`${live[0].home_team?.split(" ").slice(-1)[0]} ${live[0].home_score??0}–${live[0].away_score??0} ${live[0].away_team?.split(" ").slice(-1)[0]}`:null, color:"#ff4444", rgb:"255,68,68", to:"/live" });

    if (s.length < 3) s.push({ type:"COVERAGE", title:"9 competitions · 500+ player profiles", detail:"Real-time tracking across Europe's top leagues", color:"#a78bfa", rgb:"167,139,250", to:"/predictions/premier-league" });

    return s.slice(0, 5);
  }, [dash, fixtures]);

  if (loading && !dash) return null;

  return (
    <section className="hp7-section" style={{paddingTop:24,paddingBottom:20}}>
      <div className="hp7-container">
        <div ref={ref} className="hp7-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp7-eyebrow">— Model Signals</div><h2 className="hp7-section-title">Today's Intelligence</h2></div>
        </div>
        <div className="hp7-intel-grid">
          {signals.map((s,i)=>(
            <IntelCard key={i} signal={s} index={i} nav={nav}/>
          ))}
        </div>
      </div>
    </section>
  );
}

function IntelCard({ signal: s, index: i, nav }) {
  const [cref, cvis] = useReveal(0.05);
  return (
    <div ref={cref} style={{opacity:cvis?1:0,transform:cvis?"translateY(0)":"translateY(14px)",transition:`all .4s ease ${i*60}ms`}}>
      <div className="hp7-intel-card" style={{"--ic-color":s.color,"--ic-rgb":s.rgb}} onClick={()=>nav(s.to)}>
        <div className="hp7-ic-signal">{s.type}</div>
        <div className="hp7-ic-title">{s.title}</div>
        {s.detail && <div className="hp7-ic-detail">{s.detail}</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — TOP PREDICTIONS
// ═══════════════════════════════════════════════════════════════
function PredCard({ p, index }) {
  const nav = useNavigate();
  const [hov, setHov] = useState(false);
  const [ref, vis] = useReveal(0.05);
  const hp = p.homeProb||0, dp = p.draw||0, ap = p.awayProb||0;
  const favTeam = hp>ap ? p.home : p.away;
  const favProb = Math.max(hp,ap);
  const confColor = (p.conf_pct||50)>=70?"#34d399":(p.conf_pct||50)>=55?"#f59e0b":"#f87171";

  return (
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(16px)",transition:`all 0.45s ease ${index*55}ms`,flexShrink:0,width:280}}>
      <div className={`hp7-pred-card ${hov?"hp7-pred-card--hov":""}`} style={{"--pc-color":p.col||"#38bdf8"}}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        onClick={()=>p.fixture_id&&nav(`/match/${p.fixture_id}`)}>
        <div className="hp7-pc-head">
          <span className="hp7-pc-league">{p.league||"League"}</span>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:confColor}}/>
            <span className="hp7-mono" style={{fontSize:9,fontWeight:800,color:confColor}}>{p.conf_pct||50}%</span>
          </div>
        </div>
        <div className="hp7-pc-teams">
          <div className="hp7-pc-team">
            {p.home_logo&&<img src={p.home_logo} width={24} height={24} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
            <span className="hp7-pc-tname">{p.home}</span>
          </div>
          <div className="hp7-pc-score-area">
            <div className="hp7-pc-predicted hp7-mono">{p.score||"1-0"}</div>
            <div style={{fontSize:8,color:"var(--text-muted)"}}>predicted</div>
          </div>
          <div className="hp7-pc-team" style={{flexDirection:"row-reverse"}}>
            {p.away_logo&&<img src={p.away_logo} width={24} height={24} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
            <span className="hp7-pc-tname" style={{textAlign:"right"}}>{p.away}</span>
          </div>
        </div>
        <div className="hp7-pc-probbar">
          <div style={{flex:hp,background:"#38bdf8",opacity:.85,transition:"flex .5s"}}/>
          <div style={{flex:dp,background:"rgba(255,255,255,.18)"}}/>
          <div style={{flex:ap,background:"#34d399",opacity:.85,transition:"flex .5s"}}/>
        </div>
        <div className="hp7-pc-probs">
          <span className="hp7-mono" style={{color:"#38bdf8",fontWeight:900}}>{hp}%</span>
          <span style={{color:"var(--text-dim)"}}>Draw {dp}%</span>
          <span className="hp7-mono" style={{color:"#34d399",fontWeight:900}}>{ap}%</span>
        </div>
        <div className="hp7-pc-markets">
          <span>xG <span className="hp7-mono">{p.xg_home?.toFixed(1)}–{p.xg_away?.toFixed(1)}</span></span>
          {favProb>=60&&<span className="hp7-pc-badge" style={{background:`${p.col||"#38bdf8"}18`,color:p.col||"#38bdf8"}}>{favProb}% {favTeam?.split(" ").slice(-1)[0]}</span>}
        </div>
        <div className={`hp7-pc-expand ${hov?"hp7-pc-expand--vis":""}`}>
          <span style={{fontSize:9,color:"var(--text-muted)"}}>Open match intelligence →</span>
        </div>
      </div>
    </div>
  );
}

function TopPredictions({ dash, loading }) {
  const [ref, vis] = useReveal(0.04);
  const preds = dash?.top_predictions?.predictions ?? [];
  return (
    <section className="hp7-section" style={{paddingTop:20}}>
      <div className="hp7-container">
        <div ref={ref} className="hp7-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp7-eyebrow">— Model Output</div><h2 className="hp7-section-title">Today's Top Predictions</h2></div>
          <Link to="/predictions/premier-league" className="hp7-see-all">All predictions →</Link>
        </div>
        <div className="hp7-hscroll">
          {loading ? Array.from({length:4}).map((_,i)=>(
            <div key={i} style={{flexShrink:0,width:280,height:200,borderRadius:16,background:"var(--bg-card)",border:"1px solid var(--border-subtle)"}}>
              <div style={{padding:16}}><Skel w="60%" h={9}/><div style={{marginTop:12}}/><Skel w="90%" h={12}/><div style={{marginTop:4}}/><Skel w="75%" h={9}/></div>
            </div>
          )) : preds.map((p,i)=><PredCard key={i} p={p} index={i}/>)}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — MODEL EDGE BOARD
// ═══════════════════════════════════════════════════════════════
function EdgeCard({ edge, index }) {
  const [ref, vis] = useReveal(0.05);
  return (
    <div ref={ref} className="hp7-edge-card" style={{opacity:vis?1:0,transform:vis?"translateX(0)":"translateX(12px)",transition:`all .4s ease ${index*50}ms`}}>
      <div className="hp7-edge-tag" style={{color:edge.col||"#34d399"}}>MODEL EDGE</div>
      <div className="hp7-edge-match">{edge.home} vs {edge.away}</div>
      <div className="hp7-edge-val" style={{color:edge.col||"#34d399"}}>+{edge.edge}%</div>
      <div className="hp7-edge-dir">{edge.direction==="home"?edge.home:edge.away} favoured</div>
      <div style={{height:3,borderRadius:999,background:"rgba(255,255,255,.05)",marginTop:8,overflow:"hidden"}}>
        <div style={{width:`${Math.min(edge.model_prob||edge.edge*2,100)}%`,height:"100%",background:edge.col||"#34d399",borderRadius:999}}/>
      </div>
    </div>
  );
}

function XgCard({ match, index }) {
  const nav = useNavigate();
  const [ref, vis] = useReveal(0.05);
  const total = match.total_xg || ((match.xg_home||0)+(match.xg_away||0));
  return (
    <div ref={ref} className="hp7-xg-card" style={{opacity:vis?1:0,transform:vis?"translateX(0)":"translateX(12px)",transition:`all .4s ease ${index*50}ms`}}
      onClick={()=>match.fixture_id&&nav(`/match/${match.fixture_id}`)}>
      <div className="hp7-xg-tag">HIGH xG</div>
      <div className="hp7-xg-total hp7-mono">{total.toFixed(1)}</div>
      <div className="hp7-xg-match">{match.home?.split(" ").slice(-1)[0]} vs {match.away?.split(" ").slice(-1)[0]}</div>
      <div style={{display:"flex",gap:3,marginTop:6}}>
        <div style={{flex:match.xg_home||1,height:4,borderRadius:999,background:"#38bdf8",opacity:.8}}/>
        <div style={{flex:match.xg_away||1,height:4,borderRadius:999,background:"#34d399",opacity:.8}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginTop:3}}>
        <span className="hp7-mono" style={{color:"#38bdf8"}}>{(match.xg_home||0).toFixed(1)}</span>
        <span className="hp7-mono" style={{color:"#34d399"}}>{(match.xg_away||0).toFixed(1)}</span>
      </div>
    </div>
  );
}

function EdgeBoard({ dash, loading }) {
  const [ref, vis] = useReveal(0.04);
  const edges = dash?.model_edges?.edges ?? [];
  const highXg = dash?.high_scoring_matches?.matches ?? [];
  return (
    <section className="hp7-section">
      <div className="hp7-container">
        <div ref={ref} className="hp7-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp7-eyebrow">— Value Signals</div><h2 className="hp7-section-title">Model Edge Board</h2></div>
        </div>
        <div className="hp7-edge-grid">
          <div>
            <div className="hp7-sub-label">Best Edges Today</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {loading ? Array.from({length:3}).map((_,i)=><div key={i} className="hp7-edge-card"><Skel w="70%" h={10}/><div style={{marginTop:6}}/><Skel w="50%" h={16}/></div>)
                : edges.length>0 ? edges.map((e,i)=><EdgeCard key={i} edge={e} index={i}/>)
                : <div className="hp7-empty-state">No edges detected today</div>}
            </div>
          </div>
          <div>
            <div className="hp7-sub-label">Highest xG Fixtures</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {loading ? Array.from({length:3}).map((_,i)=><div key={i} className="hp7-xg-card"><Skel w="40%" h={24}/><div style={{marginTop:4}}/><Skel w="70%" h={10}/></div>)
                : highXg.length>0 ? highXg.slice(0,4).map((m,i)=><XgCard key={i} match={m} index={i}/>)
                : <div className="hp7-empty-state">Loading fixtures…</div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6 — TOOL COMMAND GRID
// ═══════════════════════════════════════════════════════════════

// Animated SVG graphics
function LiveRadarGfx({ active }) {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none" style={{transition:"opacity .3s",opacity:active?1:.5}}>
      {[20,32,44].map((r,i)=><circle key={i} cx="55" cy="55" r={r} stroke="#ff4444" strokeWidth={i===2?1.5:.6} opacity={.12+i*.08}/>)}
      {Array.from({length:6}).map((_,j)=>{const a=(j/6)*Math.PI*2;return<line key={j} x1="55" y1="55" x2={55+Math.cos(a)*44} y2={55+Math.sin(a)*44} stroke="#ff4444" strokeWidth=".5" opacity=".15"/>;  })}
      <line x1="55" y1="55" x2="99" y2="55" stroke="#ff4444" strokeWidth="1.5" opacity=".7" style={{transformOrigin:"55px 55px",animation:active?"hp7-sweep 2s linear infinite":"none"}}/>
      {[{x:72,y:38},{x:44,y:68},{x:80,y:64}].map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={3} fill="#ff4444" opacity=".7" style={{animation:`hp7-pulse ${1.2+i*.3}s ease-in-out infinite`}}/>)}
    </svg>
  );
}

function ProbBarsGfx({ active }) {
  const bars = [62,45,78,55,88,40,66,72];
  return (
    <svg width="110" height="70" viewBox="0 0 110 70" fill="none" style={{transition:"opacity .3s",opacity:active?1:.5}}>
      {bars.map((h,i)=>(
        <rect key={i} x={i*13+2} y={70-h*.65} width={10} height={h*.65} rx="3"
          fill="#38bdf8" opacity={i===4?.9:.3+i*.07}
          style={{transformOrigin:`${i*13+7}px 70px`,animation:active?`hp7-bar-grow .6s ease ${i*60}ms both`:undefined}}/>
      ))}
      <path d="M2 52L15 34L28 44L41 18L54 30L67 24L80 38L93 28" stroke="#38bdf8" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity=".5"/>
    </svg>
  );
}

function PitchGfx({ active }) {
  return (
    <svg width="110" height="78" viewBox="0 0 110 78" fill="none" style={{transition:"opacity .3s",opacity:active?1:.5}}>
      <rect x="1" y="1" width="108" height="76" rx="5" stroke="#a78bfa" strokeWidth="1.2" opacity=".5"/>
      <line x1="55" y1="1" x2="55" y2="77" stroke="#a78bfa" strokeWidth=".8" opacity=".35"/>
      <circle cx="55" cy="39" r="13" stroke="#a78bfa" strokeWidth=".8" opacity=".35"/>
      <rect x="1" y="24" width="22" height="30" stroke="#a78bfa" strokeWidth=".8" opacity=".35"/>
      <rect x="87" y="24" width="22" height="30" stroke="#a78bfa" strokeWidth=".8" opacity=".35"/>
      {[{x:18,y:39},{x:36,y:20},{x:36,y:39},{x:36,y:58},{x:55,y:28},{x:55,y:50},{x:74,y:20},{x:74,y:39},{x:74,y:58},{x:90,y:30},{x:90,y:48}].map((p,i)=>(
        <circle key={i} cx={p.x} cy={p.y} r={active?4:3} fill="#a78bfa" opacity={active?.85:.4}
          style={{transition:"r .2s,opacity .2s",animation:active?`hp7-pulse ${1.5+i*.15}s ease-in-out infinite`:undefined}}/>
      ))}
    </svg>
  );
}

function FPLPitchGfx({ active }) {
  const players = [{x:18,y:39,cap:false},{x:34,y:16,cap:false},{x:34,y:32,cap:false},{x:34,y:46,cap:false},{x:34,y:62,cap:false},{x:52,y:22,cap:false},{x:52,y:39,cap:true},{x:52,y:56,cap:false},{x:70,y:26,cap:false},{x:70,y:52,cap:false},{x:86,y:39,cap:false}];
  return (
    <svg width="110" height="78" viewBox="0 0 110 78" fill="none" style={{transition:"opacity .3s",opacity:active?1:.5}}>
      <rect x="1" y="1" width="108" height="76" rx="5" stroke="#34d399" strokeWidth="1" opacity=".35"/>
      <line x1="55" y1="1" x2="55" y2="77" stroke="#34d399" strokeWidth=".6" opacity=".25"/>
      <circle cx="55" cy="39" r="11" stroke="#34d399" strokeWidth=".6" opacity=".25"/>
      {players.map((p,i)=>(
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={p.cap?6:4} fill="#34d399" opacity={p.cap?.9:.5}
            style={{animation:p.cap&&active?`hp7-pulse 1.5s ease-in-out infinite`:undefined}}/>
          {p.cap&&<text x={p.x} y={p.y+3.5} textAnchor="middle" fontSize="6" fontWeight="900" fill="#000" fontFamily="monospace">C</text>}
        </g>
      ))}
    </svg>
  );
}

function PlayersGfx({ active }) {
  return (
    <svg width="80" height="90" viewBox="0 0 80 90" fill="none" style={{transition:"opacity .3s",opacity:active?1:.5}}>
      <circle cx="40" cy="22" r="14" stroke="#f59e0b" strokeWidth="1.5" opacity=".7" fill="#f59e0b" fillOpacity=".1"/>
      <path d="M8 88c0-17.7 14.3-32 32-32s32 14.3 32 32" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" opacity=".7"/>
      {[{x:8,y:58,h:18,w:8},{x:20,y:52,h:24,w:8},{x:32,y:46,h:30,w:8}].map((b,i)=>(
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx="2" fill="#f59e0b" opacity={.25+i*.1}
          style={{animation:active?`hp7-bar-grow .6s ease ${i*100}ms both`:undefined}}/>
      ))}
      <circle cx="40" cy="22" r="20" stroke="#f59e0b" strokeWidth=".5" strokeDasharray="3 3" opacity=".2"/>
    </svg>
  );
}

function NewsGfx({ active }) {
  return (
    <svg width="100" height="70" viewBox="0 0 100 70" fill="none" style={{transition:"opacity .3s",opacity:active?1:.5}}>
      <rect x="1" y="1" width="98" height="68" rx="6" stroke="#f472b6" strokeWidth="1" opacity=".35"/>
      <rect x="8" y="10" width="84" height="10" rx="3" fill="#f472b6" fillOpacity=".4"/>
      {[{y:28,w:60},{y:38,w:76},{y:48,w:50},{y:58,w:68}].map((r,i)=>(
        <rect key={i} x="8" y={r.y} width={r.w} height="5" rx="2" fill="#f472b6" fillOpacity={.18-i*.03}/>
      ))}
    </svg>
  );
}

function GameGfx({ active }) {
  return (
    <svg width="100" height="68" viewBox="0 0 100 68" fill="none" style={{transition:"opacity .3s",opacity:active?1:.5}}>
      <rect x="1" y="8" width="98" height="52" rx="12" stroke="#fb923c" strokeWidth="1.4" opacity=".6"/>
      <circle cx="28" cy="34" r="12" stroke="#fb923c" strokeWidth="1" opacity=".5"/>
      <line x1="22" y1="34" x2="34" y2="34" stroke="#fb923c" strokeWidth="1.6" strokeLinecap="round" opacity=".7"/>
      <line x1="28" y1="28" x2="28" y2="40" stroke="#fb923c" strokeWidth="1.6" strokeLinecap="round" opacity=".7"/>
      {[{x:68,y:26},{x:80,y:34},{x:68,y:42},{x:56,y:34}].map((p,i)=>(
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#fb923c" opacity={active?.7:.35}
          style={{animation:active?`hp7-pulse ${1+i*.25}s ease-in-out infinite`:undefined}}/>
      ))}
    </svg>
  );
}

const TOOLS = [
  { to:"/live", label:"Live Centre", color:"#ff4444", span:2, tall:true, Gfx: LiveRadarGfx,
    sub: "Real-time scores, live events and minute-by-minute match tracking", dataKey:"live", tag:"LIVE DATA" },
  { to:"/predictions/premier-league", label:"Predictions", color:"#38bdf8", span:1, tall:false, Gfx: ProbBarsGfx,
    sub: "Dixon-Coles Poisson model with ELO ratings", dataKey:"preds", tag:"MODEL OUTPUT" },
  { to:"/match/0", label:"Match Hub", color:"#a78bfa", span:1, tall:false, Gfx: PitchGfx,
    sub: "Expected lineups, H2H, injuries, xG and live tactics", dataKey:null, tag:"INTELLIGENCE" },
  { to:"/best-team", label:"FPL Best XI", color:"#34d399", span:1, tall:true, Gfx: FPLPitchGfx,
    sub: "Optimal FPL starting XI with captain signal", dataKey:"fpl", tag:"FPL" },
  { to:"/squad-builder", label:"Squad Builder", color:"#34d399", span:1, tall:false, Gfx: null,
    sub: "Build your 15-man FPL squad under budget", dataKey:null, tag:"FPL" },
  { to:"/player", label:"Players", color:"#f59e0b", span:1, tall:false, Gfx: PlayersGfx,
    sub: "500+ player profiles with xG, FPL stats and form", dataKey:null, tag:"DATA" },
  { to:"/news", label:"News", color:"#f472b6", span:1, tall:false, Gfx: NewsGfx,
    sub: "Transfers, injuries and intelligence updates", dataKey:null, tag:"NEWS" },
  { to:"/games", label:"Mini Games", color:"#fb923c", span:1, tall:false, Gfx: GameGfx,
    sub: "Score predictor, quizzes and football challenges", dataKey:null, tag:"GAMES" },
];

function ToolDataRow({ dataKey, fixtures, dash, loading }) {
  if (!dataKey) return null;
  if (dataKey==="live") {
    const live = fixtures.filter(f=>LIVE_SET.has(f.status));
    if (loading) return <div className="hp7-td"><Skel w="70%" h={9}/></div>;
    return (
      <div className="hp7-td">
        <div className="hp7-td-val" style={{color:"#ff4444"}}>{live.length>0?`${live.length} live now`:`${fixtures.filter(f=>isToday(f.kickoff)).length} today`}</div>
        {live[0]&&<div className="hp7-td-sub hp7-mono">{live[0].home_team?.split(" ").slice(-1)[0]} {live[0].home_score??0}–{live[0].away_score??0} {live[0].away_team?.split(" ").slice(-1)[0]}</div>}
      </div>
    );
  }
  if (dataKey==="preds") {
    const conf = dash?.model_confidence; const top = dash?.top_predictions?.predictions?.[0];
    if (loading||!dash) return <div className="hp7-td"><Skel w="60%" h={9}/></div>;
    return (
      <div className="hp7-td">
        {conf&&<div className="hp7-td-val">{conf.avg_confidence}% conf · {conf.total} fixtures</div>}
        {top&&<div className="hp7-td-sub">{Math.max(top.homeProb||0,top.awayProb||0)}% {(top.homeProb>top.awayProb?top.home:top.away)?.split(" ").slice(-1)[0]}</div>}
      </div>
    );
  }
  if (dataKey==="fpl") {
    const capt = dash?.differential_captains?.captains?.[0];
    if (loading||!dash) return <div className="hp7-td"><Skel w="55%" h={9}/></div>;
    return (
      <div className="hp7-td">
        {capt&&<><div className="hp7-td-val">Captain: {capt.name||capt.web_name}</div><div className="hp7-td-sub hp7-mono">{capt.ep_next?.toFixed(1)} EP · {capt.next_opp||""}</div></>}
      </div>
    );
  }
  return null;
}

function LargeToolCard({ tool, index, fixtures, dash, loading }) {
  const { ref:tref, tf, gl, onMove, onLeave } = useTilt(5);
  const [hov, setHov] = useState(false);
  const [rref, vis] = useReveal(0.04);
  const { Gfx } = tool;
  return (
    <div ref={rref} className="hp7-tool-wrap" style={{
      gridColumn:`span ${tool.span}`, gridRow:tool.tall?"span 2":"span 1",
      opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(20px)",
      transition:`opacity .55s ease ${index*55}ms,transform .55s ease ${index*55}ms`
    }}>
      <div ref={tref} className={`hp7-tool-card ${hov?"hp7-tool-card--hov":""}`}
        style={{"--tc-color":tool.color,transform:tf,transition:"transform .18s ease,box-shadow .22s,border-color .22s"}}
        onMouseMove={onMove} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{onLeave();setHov(false);}}>
        <div className="hp7-tool-glow" style={{background:`radial-gradient(circle at ${gl.x}% ${gl.y}%,${tool.color}22 0%,transparent 65%)`}}/>
        <div className={`hp7-tool-shimmer ${hov?"hp7-tool-shimmer--active":""}`}/>
        <div className="hp7-idle-shimmer"/>
        <div className="hp7-tool-topbar"/>
        <Link to={tool.to} className="hp7-tool-link">
          <div className="hp7-tool-header">
            <div className="hp7-tool-tag" style={{color:tool.color}}>{tool.tag}</div>
            {hov&&Gfx&&<div className="hp7-tool-gfx-top"><Gfx active={hov}/></div>}
          </div>
          <div className="hp7-tool-title">{tool.label}</div>
          <div className="hp7-tool-sub">{tool.sub}</div>
          <ToolDataRow dataKey={tool.dataKey} fixtures={fixtures} dash={dash} loading={loading}/>
          {Gfx&&<div className="hp7-tool-gfx-bg"><Gfx active={hov}/></div>}
          <div className="hp7-tool-cta">
            Open <span style={{transition:"transform .18s",transform:hov?"translateX(4px)":"translateX(0)",display:"inline-block"}}>→</span>
          </div>
        </Link>
      </div>
    </div>
  );
}

function CommandGrid({ fixtures, dash, loading }) {
  const [ref, vis] = useReveal(0.04);
  return (
    <section className="hp7-section">
      <div className="hp7-container">
        <div ref={ref} className="hp7-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp7-eyebrow">— Platform</div><h2 className="hp7-section-title">Intelligence Command Grid</h2></div>
          <span style={{fontSize:10,color:"var(--text-muted)",fontFamily:"var(--font-mono)",fontWeight:700}}>8 tools</span>
        </div>
        <div className="hp7-bento">
          {TOOLS.map((t,i)=><LargeToolCard key={t.to} tool={t} index={i} fixtures={fixtures} dash={dash} loading={loading}/>)}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 7 — COMPETITION HUB
// ═══════════════════════════════════════════════════════════════
const COMPS = [
  {label:"Premier League",slug:"premier-league",code:"epl",color:"#60a5fa",logo:"https://media.api-sports.io/football/leagues/39.png",teams:20,matches:"380/season",features:["Predictions","Standings","Season Sim","xG Leaders"]},
  {label:"La Liga",slug:"la-liga",code:"laliga",color:"#fb923c",logo:"https://media.api-sports.io/football/leagues/140.png",teams:20,matches:"380/season",features:["Predictions","Standings","Season Sim"]},
  {label:"Bundesliga",slug:"bundesliga",code:"bundesliga",color:"#f59e0b",logo:"https://media.api-sports.io/football/leagues/78.png",teams:18,matches:"306/season",features:["Predictions","Standings","Season Sim"]},
  {label:"Serie A",slug:"serie-a",code:"seriea",color:"#34d399",logo:"https://media.api-sports.io/football/leagues/135.png",teams:20,matches:"380/season",features:["Predictions","Standings"]},
  {label:"Ligue 1",slug:"ligue-1",code:"ligue1",color:"#a78bfa",logo:"https://media.api-sports.io/football/leagues/61.png",teams:18,matches:"306/season",features:["Predictions","Standings"]},
  {label:"UCL",slug:"champions-league",code:"ucl",color:"#3b82f6",logo:"https://media.api-sports.io/football/leagues/2.png",teams:36,matches:"League phase + KO",features:["Predictions","Bracket"]},
  {label:"Europa League",slug:"europa-league",code:"uel",color:"#f97316",logo:"https://media.api-sports.io/football/leagues/3.png",teams:36,matches:"League phase + KO",features:["Predictions","Bracket"]},
  {label:"Conference",slug:"conference-league",code:"uecl",color:"#22c55e",logo:"https://media.api-sports.io/football/leagues/848.png",teams:36,matches:"League phase + KO",features:["Predictions","Bracket"]},
  {label:"FA Cup",slug:"fa-cup",code:"facup",color:"#ef4444",logo:"https://media.api-sports.io/football/leagues/45.png",teams:736,matches:"Knockout",features:["Predictions","Bracket"]},
];

function CompCard({ comp, index }) {
  const [hov, setHov] = useState(false);
  const [ref, vis] = useReveal(0.05);
  return (
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:`all .4s ease ${index*35}ms`}}>
      <Link to={`/predictions/${comp.slug}`} style={{textDecoration:"none"}}>
        <div className={`hp7-comp-card ${hov?"hp7-comp-card--hov":""}`} style={{"--cc-color":comp.color}}
          onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
          <div className="hp7-cc-topbar"/>
          <div className="hp7-cc-header">
            <div className="hp7-cc-logo">
              <img src={comp.logo} width={28} height={28} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>
            </div>
            <div>
              <div className="hp7-cc-name">{comp.label}</div>
              <div className="hp7-cc-meta">{comp.teams} clubs · {comp.matches}</div>
            </div>
          </div>
          <div className="hp7-cc-features">
            {comp.features.map(f=><span key={f} className="hp7-cc-feat">{f}</span>)}
          </div>
          <div className="hp7-cc-cta">Explore predictions →</div>
        </div>
      </Link>
    </div>
  );
}

function CompetitionHub() {
  const [ref, vis] = useReveal(0.04);
  return (
    <section className="hp7-section">
      <div className="hp7-container">
        <div ref={ref} className="hp7-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div>
            <div className="hp7-eyebrow">— Coverage</div>
            <h2 className="hp7-section-title">9 Competitions. Full Intelligence.</h2>
            <p style={{fontSize:12,color:"var(--text-muted)",marginTop:6,maxWidth:480}}>Poisson model predictions, standings, season simulation and xG analysis across Europe's top competitions.</p>
          </div>
        </div>
        <div className="hp7-comp-grid">
          {COMPS.map((c,i)=><CompCard key={c.slug} comp={c} index={i}/>)}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 8 — FPL HUB
// ═══════════════════════════════════════════════════════════════
const FPL_TOOLS = [
  {to:"/best-team",label:"Best XI",stat:"Optimal 11",detail:"Model-driven optimal starting 11",color:"#34d399"},
  {to:"/squad-builder",label:"Squad Builder",stat:"15-man squad",detail:"Build within £100m budget",color:"#38bdf8"},
  {to:"/gameweek-insights",label:"GW Insights",stat:"This gameweek",detail:"Fixture analysis & GW picks",color:"#f59e0b"},
  {to:"/fpl-table",label:"FPL Table",stat:"Standings",detail:"Live leaderboard & rank",color:"#a78bfa"},
  {to:"/captaincy",label:"Captaincy",stat:"Captain picks",detail:"EP analysis & ownership",color:"#fb923c"},
  {to:"/fixture-difficulty",label:"FDR Heatmap",stat:"8 GWs",detail:"Fixture difficulty ratings",color:"#67e8f9"},
  {to:"/transfer-planner",label:"Transfer Planner",stat:"Plan moves",detail:"Model transfer recommendations",color:"#f87171"},
  {to:"/differentials",label:"Differentials",stat:"Low-owned",detail:"High-ceiling, low-ownership picks",color:"#f472b6"},
];

function FPLHub({ dash }) {
  const [ref, vis] = useReveal(0.04);
  const capts = dash?.differential_captains?.captains?.slice(0,4) ?? [];

  return (
    <section className="hp7-section">
      <div className="hp7-container">
        <div ref={ref} className="hp7-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp7-eyebrow">— Fantasy Premier League</div><h2 className="hp7-section-title">FPL Intelligence Hub</h2></div>
          <div style={{display:"flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:999,background:"rgba(52,211,153,.07)",border:"1px solid rgba(52,211,153,.2)"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#34d399",boxShadow:"0 0 8px #34d399",animation:"hp7-pulse 2s ease-in-out infinite"}}/>
            <span style={{fontSize:9,fontWeight:900,color:"#34d399",letterSpacing:"0.1em",fontFamily:"var(--font-mono)"}}>8 TOOLS ACTIVE</span>
          </div>
        </div>

        <div className="hp7-fpl-layout">
          {/* Left: captain picks */}
          <div className="hp7-fpl-left">
            <div className="hp7-sub-label">Captain Picks</div>
            {capts.length>0 ? capts.map((c,i)=>(
              <div key={i} className="hp7-capt-row">
                <div className="hp7-cr-rank hp7-mono">{String(i+1).padStart(2,"0")}</div>
                {c.photo&&<img src={c.photo} width={28} height={28} style={{borderRadius:"50%",objectFit:"cover",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>}
                <div style={{flex:1,minWidth:0}}>
                  <div className="hp7-cr-name">{c.name||c.web_name}</div>
                  <div className="hp7-cr-meta">{c.next_opp||""} · {c.ownership?.toFixed(1)||"?"}% owned</div>
                </div>
                <div className="hp7-cr-ep hp7-mono">{c.ep_next?.toFixed(1)||"??"}</div>
                <div className="hp7-cr-ep-label">EP</div>
              </div>
            )) : Array.from({length:4}).map((_,i)=><div key={i} className="hp7-capt-row"><Skel w="70%" h={11}/></div>)}
          </div>

          {/* Center: animated orbit */}
          <div className="hp7-fpl-center">
            <div className="hp7-fpl-orbit">
              <div className="hp7-fpl-orbit-ring"/>
              <div className="hp7-fpl-orbit-ring hp7-fpl-orbit-ring--2"/>
              <div className="hp7-fpl-orbit-core"/>
            </div>
            <div className="hp7-fpl-center-text">
              <div className="hp7-fpl-center-num hp7-mono">{FPL_TOOLS.length}</div>
              <div style={{fontSize:9,fontWeight:900,letterSpacing:"0.1em",color:"var(--text-muted)",textTransform:"uppercase"}}>FPL Tools</div>
            </div>
          </div>

          {/* Right: tool list */}
          <div className="hp7-fpl-right">
            <div className="hp7-sub-label">All Tools</div>
            {FPL_TOOLS.map((t,i)=>(
              <FPLToolRow key={t.to} tool={t} index={i} dash={dash}/>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FPLToolRow({ tool, index, dash }) {
  const [hov, setHov] = useState(false);
  const [ref, vis] = useReveal(0.04);
  const capt = tool.to==="/captaincy" && dash?.differential_captains?.captains?.[0];
  const realStat = capt ? `${capt.name||capt.web_name} ${capt.ep_next?.toFixed(1)||"??"} EP` : tool.stat;
  return (
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateX(0)":"translateX(14px)",transition:`all .4s ease ${index*40}ms`}}>
      <Link to={tool.to} style={{textDecoration:"none"}}>
        <div className={`hp7-fpl-row ${hov?"hp7-fpl-row--hov":""}`} style={{"--fpl-color":tool.color}}
          onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
          <div className="hp7-fpl-indicator"/>
          <div className="hp7-fpl-idx hp7-mono">{String(index+1).padStart(2,"0")}</div>
          <div className="hp7-fpl-dot"/>
          <div className="hp7-fpl-content">
            <span className="hp7-fpl-label">{tool.label}</span>
            <span className={`hp7-fpl-detail ${hov?"hp7-fpl-detail--vis":""}`}>{tool.detail}</span>
          </div>
          <span className="hp7-fpl-stat">{realStat}</span>
          <div className={`hp7-fpl-arrow ${hov?"hp7-fpl-arrow--vis":""}`}>→</div>
        </div>
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 9 — TRENDING PLAYERS
// ═══════════════════════════════════════════════════════════════
function TrendingPlayers({ dash, loading }) {
  const [ref, vis] = useReveal(0.04);
  const items = dash?.trending_players?.items ?? [];
  const xgLeaders = dash?.xg_leaders?.leaders?.slice(0,5) ?? [];
  const showable = items.length>0 ? items.slice(0,6) : xgLeaders.slice(0,6);

  return (
    <section className="hp7-section">
      <div className="hp7-container">
        <div ref={ref} className="hp7-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp7-eyebrow">— Players</div><h2 className="hp7-section-title">Trending Now</h2></div>
          <Link to="/player" className="hp7-see-all">Browse all →</Link>
        </div>
        <div className="hp7-player-grid">
          {loading ? Array.from({length:6}).map((_,i)=>(
            <div key={i} className="hp7-player-card"><div style={{padding:14}}><Skel w="60%" h={11}/><div style={{marginTop:8}}/><Skel w="80%" h={9}/></div></div>
          )) : showable.length>0 ? showable.map((p,i)=><PlayerCard key={i} player={p} index={i}/>)
            : <div className="hp7-empty-state" style={{gridColumn:"1/-1"}}>Loading player data…</div>}
        </div>
      </div>
    </section>
  );
}

function PlayerCard({ player, index }) {
  const nav = useNavigate();
  const [hov, setHov] = useState(false);
  const [ref, vis] = useReveal(0.05);
  const form = player.form||player.recent_form||"";
  const formArr = typeof form==="string"?form.split("").filter(c=>"WDL".includes(c)):(Array.isArray(form)?form:[]);
  return (
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:`all .4s ease ${index*45}ms`}}>
      <div className={`hp7-player-card ${hov?"hp7-player-card--hov":""}`}
        onClick={()=>nav(`/player?search=${encodeURIComponent(player.name||player.team_name||"")}`)}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
        <div className="hp7-pc2-top">
          {player.photo&&<img src={player.photo} width={36} height={36} style={{borderRadius:"50%",objectFit:"cover",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>}
          <div style={{flex:1,minWidth:0}}>
            <div className="hp7-pc2-name">{player.name||player.player_name||"Player"}</div>
            <div className="hp7-pc2-team">{player.team_name||player.team||""}</div>
          </div>
          {player.xg_per90!=null&&<div className="hp7-pc2-stat hp7-mono" style={{color:"#38bdf8"}}>{player.xg_per90?.toFixed(2)}<div style={{fontSize:7,color:"var(--text-dim)"}}>xG/90</div></div>}
        </div>
        {formArr.length>0&&(
          <div style={{display:"flex",gap:3,marginTop:8}}>
            {formArr.slice(-5).map((r,i)=><FormPip key={i} r={r}/>)}
          </div>
        )}
        {player.goals!=null&&(
          <div style={{display:"flex",gap:12,marginTop:8,fontSize:10,color:"var(--text-muted)"}}>
            {player.goals!=null&&<span><span className="hp7-mono" style={{color:"var(--text)",fontWeight:900}}>{player.goals}</span> G</span>}
            {player.assists!=null&&<span><span className="hp7-mono" style={{color:"var(--text)",fontWeight:900}}>{player.assists}</span> A</span>}
            {player.rating!=null&&<span>Rating <span className="hp7-mono" style={{color:"#f59e0b",fontWeight:900}}>{Number(player.rating).toFixed(1)}</span></span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 10 — WHY STATINSITE
// ═══════════════════════════════════════════════════════════════
const MODELS = [
  {name:"Dixon-Coles",desc:"Low-score corrected Poisson model with τ-adjustment",color:"#38bdf8"},
  {name:"ELO Ratings",desc:"Dynamic team strength ratings updated after every match",color:"#a78bfa"},
  {name:"xG Modelling",desc:"Expected goals derived from shot location and context",color:"#34d399"},
  {name:"Monte Carlo",desc:"8,000-run season simulation for final table probabilities",color:"#f59e0b"},
  {name:"Form Weighting",desc:"Exponentially decayed recent form with injury signal",color:"#f472b6"},
  {name:"Market Edge",desc:"Model probability vs implied odds to identify value signals",color:"#fb923c"},
];

const FACTS = [
  {val:"9",label:"Competitions"},
  {val:"500+",label:"Player Profiles"},
  {val:"8",label:"FPL Tools"},
  {val:"8K",label:"Simulations/Run"},
];

function ModelCard({ model: m, index: i }) {
  const [mref, mvis] = useReveal(0.05);
  return (
    <div ref={mref} className="hp7-model-card" style={{opacity:mvis?1:0,transform:mvis?"translateY(0)":"translateY(12px)",transition:`all .4s ease ${i*50}ms`,"--mc-color":m.color}}>
      <div className="hp7-mc-dot"/>
      <div>
        <div className="hp7-mc-name">{m.name}</div>
        <div className="hp7-mc-desc">{m.desc}</div>
      </div>
    </div>
  );
}

function FactCard({ fact: f, index: i }) {
  const [fref, fvis] = useReveal(0.05);
  return (
    <div ref={fref} className="hp7-fact-card" style={{opacity:fvis?1:0,transform:fvis?"scale(1)":"scale(.9)",transition:`all .4s ease ${i*60}ms`}}>
      <div className="hp7-fact-val hp7-mono">{f.val}</div>
      <div className="hp7-fact-label">{f.label}</div>
    </div>
  );
}

function WhyStatinSite() {
  const [ref, vis] = useReveal(0.04);
  return (
    <section className="hp7-section" style={{paddingBottom:80}}>
      <div className="hp7-container">
        <div ref={ref} className="hp7-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp7-eyebrow">— Platform</div><h2 className="hp7-section-title">The Intelligence Stack</h2></div>
        </div>
        <div className="hp7-why-grid">
          <div>
            <div className="hp7-sub-label">Data Models</div>
            <div className="hp7-models-grid">
              {MODELS.map((m,i)=>(
                <ModelCard key={m.name} model={m} index={i}/>
              ))}
            </div>
          </div>
          <div>
            <div className="hp7-sub-label">Platform Scale</div>
            <div className="hp7-facts-grid">
              {FACTS.map((f,i)=>(
                <FactCard key={f.label} fact={f} index={i}/>
              ))}
            </div>
            <div className="hp7-platform-note">
              All predictions use real season statistics from API-Football Pro. Model probabilities are not guaranteed outcomes.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// DIVIDER
// ═══════════════════════════════════════════════════════════════
function Div() {
  return <div className="hp7-divider"/>;
}

// ═══════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════
export default function HomePage() {
  useEffect(() => { injectStyles(); }, []);
  const { fixtures, loading: ul } = useUpcoming();
  const { dash,     loading: dl } = useDashboard();
  return (
    <div className="hp7-root">
      <HeroSection fixtures={fixtures} upcoming_loading={ul} dash={dash} dash_loading={dl}/>
      <LivePulseStrip fixtures={fixtures}/>
      <MetricsStrip fixtures={fixtures} upcoming_loading={ul} dash={dash} dash_loading={dl}/>
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