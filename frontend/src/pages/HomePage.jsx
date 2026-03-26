// ═══════════════════════════════════════════════════════════════════════
// StatinSite — HomePage v8  "iOS Glass Intelligence"
// ═══════════════════════════════════════════════════════════════════════
// All backend routes wired correctly:
//   /api/matches/upcoming  → live strip, hero panels
//   /api/home/dashboard    → all dashboard sections (includes performance_summary
//                            & accountability_summary from home_accountability.py)
//   /api/win-probability/:id  → used in PredCard deep link
//   /api/match-momentum/:id   → used in match deep links
//   /api/shot-map/:id         → used in match deep links
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = "https://football-stats-lw4b.onrender.com";
const LIVE_SET = new Set(["1H","2H","HT","ET","BT","P"]);
const FT_SET   = new Set(["FT","AET","PEN"]);
const isToday  = d => d && new Date(d).toDateString() === new Date().toDateString();

// ─── Embedded styles ─────────────────────────────────────────────────────────
const STYLES = `
/* ── iOS Glass Card System ── */
.g-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1),
              box-shadow 0.22s ease,
              border-color 0.22s ease;
  position: relative;
  overflow: hidden;
}
.g-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
}
[data-theme="light"] .g-card::before {
  background: linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 60%);
}
.g-card:hover {
  transform: translateY(-6px) scale(1.015);
  box-shadow: var(--shadow-lift);
  border-color: var(--border-strong);
}
.g-card:active { transform: translateY(-2px) scale(1.005); }

.g-card--sm {
  border-radius: 16px;
}
.g-card--sm::before { border-radius: 16px; }

.g-card-inner { position: relative; z-index: 1; }

/* ── Section layout ── */
.hp8-page { background: var(--bg); }
.hp8-section {
  padding: 48px 0;
}
.hp8-section--tight { padding: 28px 0; }
.hp8-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 28px;
}
.hp8-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 28px;
  gap: 16px;
}
.hp8-eyebrow {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 6px;
}
.hp8-title {
  font-size: clamp(20px,2.2vw,26px);
  font-weight: 900;
  letter-spacing: -0.03em;
  color: var(--text);
  line-height: 1.15;
}
.hp8-see-all {
  font-size: 12px;
  font-weight: 700;
  color: var(--blue);
  white-space: nowrap;
  transition: opacity 0.15s;
  margin-top: 4px;
  flex-shrink: 0;
}
.hp8-see-all:hover { opacity: 0.7; }

.hp8-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--border) 20%, var(--border) 80%, transparent);
  margin: 0 28px;
}

/* ── Hero ── */
.hp8-hero {
  position: relative;
  min-height: 90vh;
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: 100px 0 60px;
  background: var(--bg);
}
[data-theme="light"] .hp8-hero {
  background: linear-gradient(160deg,#f0f4ff 0%,#f5f5f7 50%,#fff0f5 100%);
}
.hp8-hero-grid {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 20px;
  align-items: center;
  width: 100%;
  position: relative;
  z-index: 2;
}
@media (max-width: 1024px) {
  .hp8-hero-grid { grid-template-columns: 1fr 1fr; }
  .hp8-hero-left  { display: none; }
}
@media (max-width: 680px) {
  .hp8-hero-grid { grid-template-columns: 1fr; }
  .hp8-hero-right { display: none; }
  .hp8-hero { padding: 80px 0 40px; min-height: auto; }
}

/* ── Hero Center ── */
.hp8-hero-center { text-align: center; }
.hp8-hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 14px;
  border-radius: 999px;
  background: var(--bg-glass);
  border: 1px solid var(--border-strong);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 24px;
  animation: hp8-fade-up 0.6s ease both;
}
.hp8-hero-title {
  font-size: clamp(42px,6vw,80px);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.0;
  color: var(--text);
  margin-bottom: 20px;
  animation: hp8-fade-up 0.6s 0.1s ease both;
}
.hp8-gradient-text {
  background: linear-gradient(135deg, #0a84ff 0%, #30d158 50%, #bf5af2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: hp8-grad-shift 6s ease infinite;
  background-size: 200%;
}
@keyframes hp8-grad-shift {
  0%,100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
.hp8-hero-sub {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.6;
  max-width: 480px;
  margin: 0 auto 32px;
  animation: hp8-fade-up 0.6s 0.2s ease both;
}
.hp8-hero-ctas {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  animation: hp8-fade-up 0.6s 0.3s ease both;
  margin-bottom: 40px;
}
.hp8-stat-strip {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  animation: hp8-fade-up 0.6s 0.4s ease both;
}
.hp8-stat-cell {
  background: var(--bg-card);
  padding: 14px 12px;
  text-align: center;
  backdrop-filter: blur(16px);
}
.hp8-stat-val {
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: var(--cell-color, var(--text));
  font-family: var(--font-mono);
  line-height: 1;
  margin-bottom: 4px;
}
.hp8-stat-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-dim);
}

/* ── Hero panels ── */
.hp8-hero-panel {
  padding: 18px;
  cursor: default;
}
.hp8-panel-label {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 12px;
}
.hp8-live-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--bg-glass);
  border: 1px solid var(--border-soft);
  margin-bottom: 6px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 11px;
  font-weight: 700;
  color: var(--text);
}
.hp8-live-row:hover { background: var(--bg-hover); }
.hp8-qlink {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  transition: all 0.15s;
  border: 1px solid transparent;
}
.hp8-qlink:hover {
  background: var(--bg-hover);
  color: var(--ql-color, var(--blue));
  border-color: var(--border);
}

/* ── Live dot ── */
.hp8-live-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--dot-color, #ff453a);
  box-shadow: 0 0 8px var(--dot-color, #ff453a);
  animation: hp8-pulse 1.8s ease-in-out infinite;
  flex-shrink: 0;
}
.hp8-live-dot--xs { width: 5px; height: 5px; }
@keyframes hp8-pulse {
  0%,100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

/* ── Skeleton ── */
.hp8-skel {
  background: linear-gradient(90deg, var(--bg-glass) 25%, var(--bg-hover) 50%, var(--bg-glass) 75%);
  background-size: 200%;
  animation: hp8-shimmer 1.6s infinite;
  border-radius: 6px;
  display: block;
}
@keyframes hp8-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Live strip ── */
.hp8-strip {
  background: rgba(255,69,58,0.06);
  border-top: 1px solid rgba(255,69,58,0.14);
  border-bottom: 1px solid rgba(255,69,58,0.14);
  height: 40px;
  overflow: hidden;
  position: relative;
}
.hp8-strip-track {
  display: flex;
  align-items: center;
  gap: 20px;
  height: 100%;
  animation: hp8-scroll-x 28s linear infinite;
  width: max-content;
}
@keyframes hp8-scroll-x {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.hp8-strip-chip {
  display: flex; align-items: center; gap: 7px;
  padding: 4px 12px; border-radius: 999px;
  background: rgba(255,69,58,0.10);
  border: 1px solid rgba(255,69,58,0.20);
  white-space: nowrap; cursor: pointer;
  font-size: 11px; font-weight: 700;
  color: var(--text);
  transition: background 0.15s;
  flex-shrink: 0;
}
.hp8-strip-chip:hover { background: rgba(255,69,58,0.18); }
.hp8-strip-fade {
  position: absolute; top: 0; bottom: 0; width: 80px; z-index: 2; pointer-events: none;
}
.hp8-strip-fade--l { left: 0; background: linear-gradient(90deg, var(--bg), transparent); }
.hp8-strip-fade--r { right: 0; background: linear-gradient(-90deg, var(--bg), transparent); }
[data-theme="light"] .hp8-strip-fade--l { background: linear-gradient(90deg,#f5f5f7,transparent); }
[data-theme="light"] .hp8-strip-fade--r { background: linear-gradient(-90deg,#f5f5f7,transparent); }

/* ── Buttons ── */
.hp8-btn {
  position: relative; overflow: hidden;
  display: inline-flex; align-items: center; gap: 7px;
  padding: 11px 22px; border-radius: 14px;
  font-size: 13px; font-weight: 700; letter-spacing: -0.01em;
  border: none; cursor: pointer; font-family: inherit;
  transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s, filter 0.15s;
}
.hp8-btn:active { transform: scale(0.95) !important; }
.hp8-btn--primary {
  background: var(--blue); color: #fff;
  box-shadow: 0 4px 20px rgba(10,132,255,0.35);
}
.hp8-btn--primary:hover { filter: brightness(1.1); transform: translateY(-2px); }
.hp8-btn--ghost {
  background: var(--bg-glass); color: var(--text);
  border: 1px solid var(--border-strong);
  backdrop-filter: blur(16px);
}
.hp8-btn--ghost:hover { background: var(--bg-hover); transform: translateY(-2px); }
.hp8-btn--live {
  background: rgba(255,69,58,0.15); color: #ff453a;
  border: 1px solid rgba(255,69,58,0.3);
}
.hp8-btn--live:hover { background: rgba(255,69,58,0.25); transform: translateY(-2px); }
.hp8-btn--fpl {
  background: rgba(48,209,88,0.15); color: #30d158;
  border: 1px solid rgba(48,209,88,0.3);
}
.hp8-btn--fpl:hover { background: rgba(48,209,88,0.25); transform: translateY(-2px); }

/* ── Horizontal scroll ── */
.hp8-hscroll {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 8px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}
.hp8-hscroll::-webkit-scrollbar { display: none; }
.hp8-hscroll > * { scroll-snap-align: start; }

/* ── Pred card ── */
.hp8-pred-card {
  width: 280px;
  flex-shrink: 0;
  padding: 18px;
  cursor: pointer;
}
.hp8-pred-card:hover { border-color: var(--pc-color, var(--border-strong)) !important; }
.hp8-pred-probbar {
  display: flex; height: 5px; border-radius: 999px; overflow: hidden; margin: 10px 0 5px; gap: 1px;
}

/* ── Title Race grid ── */
.hp8-race-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 720px) { .hp8-race-grid { grid-template-columns: 1fr; } }

.hp8-team-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 14px;
  background: var(--bg-glass);
  border: 1px solid var(--border);
  margin-bottom: 6px;
  transition: background 0.15s, border-color 0.15s;
}
.hp8-team-row:hover { background: var(--bg-hover); border-color: var(--border-strong); }

/* ── Edge grid ── */
.hp8-edge-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 720px) { .hp8-edge-grid { grid-template-columns: 1fr; } }

.hp8-edge-card {
  padding: 16px 18px;
}
.hp8-xg-card {
  padding: 16px 18px;
  cursor: pointer;
}

/* ── Bento grid ── */
.hp8-bento {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 180px;
  gap: 14px;
}
@media (max-width: 1100px) { .hp8-bento { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 820px)  { .hp8-bento { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 500px)  { .hp8-bento { grid-template-columns: 1fr; } }

.hp8-tool-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  min-height: 0;
}
.hp8-tool-card--span2 { grid-column: span 2; }
.hp8-tool-card--tall  { grid-row: span 2; }

/* ── Competition grid ── */
.hp8-comp-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
@media (max-width: 1000px) { .hp8-comp-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px)  { .hp8-comp-grid { grid-template-columns: 1fr; } }

/* ── FPL layout ── */
.hp8-fpl-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 820px) { .hp8-fpl-grid { grid-template-columns: 1fr; } }

/* ── Player grid ── */
.hp8-player-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
@media (max-width: 900px)  { .hp8-player-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 540px)  { .hp8-player-grid { grid-template-columns: 1fr; } }

/* ── 3-col grid ── */
.hp8-3col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
@media (max-width: 900px) { .hp8-3col { grid-template-columns: 1fr 1fr; } }
@media (max-width: 560px) { .hp8-3col { grid-template-columns: 1fr; } }

/* ── 2-col grid ── */
.hp8-2col {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
@media (max-width: 720px) { .hp8-2col { grid-template-columns: 1fr; } }

/* ── FPL tool row ── */
.hp8-fpl-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-glass);
  margin-bottom: 6px;
  cursor: pointer;
  transition: all 0.18s;
}
.hp8-fpl-row:hover {
  background: var(--bg-hover);
  border-color: var(--fpl-color, var(--border-strong));
  transform: translateX(4px);
}
.hp8-fpl-indicator {
  width: 3px; height: 28px; border-radius: 999px;
  background: var(--fpl-color, var(--blue));
  flex-shrink: 0;
  opacity: 0.7;
}

/* ── Accuracy ring ── */
.hp8-acc-ring { display: flex; flex-direction: column; align-items: center; gap: 4px; }

/* ── Pred verified row ── */
.hp8-verified-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 12px;
  background: var(--bg-glass);
  border: 1px solid var(--border);
  margin-bottom: 5px;
  transition: background 0.15s;
}
.hp8-verified-row:hover { background: var(--bg-hover); }

/* ── Model card ── */
.hp8-model-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  border-radius: 14px;
  background: var(--bg-glass);
  border: 1px solid var(--border);
  transition: all 0.18s;
}
.hp8-model-card:hover {
  border-color: var(--mc-color, var(--border-strong));
  transform: translateY(-2px);
}
.hp8-mc-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--mc-color, var(--blue));
  flex-shrink: 0; margin-top: 3px;
  box-shadow: 0 0 8px var(--mc-color, var(--blue));
}

/* ── Capt row ── */
.hp8-capt-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--bg-glass);
  border: 1px solid var(--border);
  margin-bottom: 6px;
  transition: background 0.15s;
}
.hp8-capt-row:hover { background: var(--bg-hover); }

/* ── Form pip ── */
.hp8-form-pip {
  width: 14px; height: 14px; border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
  font-size: 7px; font-weight: 900;
}

/* ── Sub label ── */
.hp8-sub-label {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin-bottom: 12px;
}

/* ── Badge ── */
.hp8-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

/* ── Fact card ── */
.hp8-fact-card {
  padding: 20px;
  text-align: center;
}
.hp8-fact-val {
  font-size: 28px;
  font-weight: 900;
  color: var(--text);
  letter-spacing: -0.04em;
  font-family: var(--font-mono);
  margin-bottom: 4px;
}
.hp8-fact-label {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 600;
}

/* ── Empty state ── */
.hp8-empty {
  padding: 28px;
  text-align: center;
  font-size: 12px;
  color: var(--text-dim);
}

/* ── Animations ── */
@keyframes hp8-fade-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes hp8-reveal {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Hero blob orbs ── */
.hp8-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
  opacity: 0.45;
  animation: hp8-orb-drift 12s ease-in-out infinite alternate;
}
.hp8-orb--a {
  width: 600px; height: 400px;
  background: radial-gradient(ellipse, rgba(10,132,255,0.18), transparent);
  top: -100px; left: -150px;
}
.hp8-orb--b {
  width: 500px; height: 500px;
  background: radial-gradient(ellipse, rgba(48,209,88,0.12), transparent);
  bottom: -100px; right: -120px;
  animation-delay: -5s;
}
.hp8-orb--c {
  width: 400px; height: 400px;
  background: radial-gradient(ellipse, rgba(191,90,242,0.10), transparent);
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -9s;
}
@keyframes hp8-orb-drift {
  from { transform: translate(0,0) scale(1); }
  to   { transform: translate(20px,30px) scale(1.08); }
}
[data-theme="light"] .hp8-orb { opacity: 0.22; }

/* ── Telemetry canvas ── */
.hp8-canvas {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  pointer-events: none; z-index: 0;
  opacity: 0.4;
}
[data-theme="light"] .hp8-canvas { opacity: 0.12; }

/* ── Capt ep badge ── */
.hp8-ep {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 900;
  color: var(--green);
}
.hp8-ep-label {
  font-size: 8px;
  color: var(--text-dim);
  font-weight: 700;
}

/* ── Model perf grid ── */
.hp8-perf-acc-row {
  display: grid;
  grid-template-columns: repeat(3,1fr);
  gap: 12px;
  margin-bottom: 16px;
}
@media (max-width: 720px) { .hp8-perf-acc-row { grid-template-columns: 1fr 1fr; } }

/* ── Models 2-col ── */
.hp8-models-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
@media (max-width: 640px) { .hp8-models-grid { grid-template-columns: 1fr; } }

.hp8-facts-grid {
  display: grid;
  grid-template-columns: repeat(4,1fr);
  gap: 10px;
  margin-bottom: 16px;
}
@media (max-width: 640px) { .hp8-facts-grid { grid-template-columns: repeat(2,1fr); } }

/* ── Power rankings grid ── */
.hp8-rank-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
@media (max-width: 720px) { .hp8-rank-grid { grid-template-columns: 1fr; } }

/* ── Mono ── */
.hp8-mono { font-family: var(--font-mono); }
`;

// ─── Data hooks ───────────────────────────────────────────────────────────────
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
          confidence: c.confidence??null,
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
      .then(d => {
        if (dead || !d) return;
        setData(d);
        try { sessionStorage.setItem(k, JSON.stringify({ts:Date.now(),p:d})); } catch {}
      }).catch(()=>{}).finally(()=>{ if(!dead) setLoading(false); });
    return () => { dead = true; };
  }, []);
  return { dash: data, loading };
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function useReveal(thr=0.06) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); io.disconnect(); } }, { threshold: thr });
    io.observe(el); return () => io.disconnect();
  }, []);
  return [ref, v];
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

function Skel({w="100%",h=14,r=6}) {
  return <div className="hp8-skel" style={{width:w,height:h,borderRadius:r}}/>;
}

function FormPip({r}) {
  const c=r==="W"?"#30d158":r==="D"?"#ff9f0a":"#ff453a";
  return (
    <div className="hp8-form-pip" style={{background:`${c}20`,border:`1px solid ${c}45`,color:c}}>{r}</div>
  );
}

function Badge({label,color,size="sm"}) {
  const isDark = document.documentElement.getAttribute("data-theme") !== "light";
  return (
    <span className="hp8-badge" style={{
      background: isDark?`${color}18`:`${color}12`,
      border:`1px solid ${isDark?color+"30":color+"22"}`,
      color,
      fontSize: size==="sm"?9:11,
      padding: size==="sm"?"2px 8px":"4px 12px",
    }}>{label}</span>
  );
}

function LiveDot({color="#ff453a",size=6}) {
  return (
    <div className="hp8-live-dot" style={{
      "--dot-color":color,width:size,height:size,
    }}/>
  );
}

// ─── Background canvas ────────────────────────────────────────────────────────
function TelemetryGrid() {
  const c = useRef(null);
  useEffect(() => {
    const canvas = c.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, t=0;
    const resize = () => { canvas.width=canvas.offsetWidth; canvas.height=canvas.offsetHeight; };
    resize(); window.addEventListener("resize",resize);
    const isDark = () => document.documentElement.getAttribute("data-theme") !== "light";
    const draw = () => {
      const {width:W,height:H} = canvas; ctx.clearRect(0,0,W,H);
      const SZ=56, cols=Math.ceil(W/SZ)+2, rows=Math.ceil(H/SZ)+2;
      const ox=(t*0.25)%SZ, oy=(t*0.12)%SZ;
      const dark=isDark();
      for(let i=-1;i<cols;i++){
        const a=(0.018+0.008*Math.sin(i*0.4+t*0.006))*(dark?1:0.3);
        ctx.strokeStyle=`rgba(56,189,248,${a})`;ctx.lineWidth=0.5;
        ctx.beginPath();ctx.moveTo(i*SZ-ox,0);ctx.lineTo(i*SZ-ox,H);ctx.stroke();
      }
      for(let j=-1;j<rows;j++){
        const a=(0.018+0.008*Math.sin(j*0.5+t*0.004))*(dark?1:0.3);
        ctx.strokeStyle=`rgba(56,189,248,${a})`;ctx.lineWidth=0.5;
        ctx.beginPath();ctx.moveTo(0,j*SZ-oy);ctx.lineTo(W,j*SZ-oy);ctx.stroke();
      }
      for(let i=0;i<cols;i++) for(let j=0;j<rows;j++){
        const p=Math.sin(i*0.8+j*0.6+t*0.035);
        if(p>0.72){ctx.fillStyle=`rgba(52,211,153,${(p-0.72)*0.4*(dark?1:0.25)})`;ctx.beginPath();ctx.arc(i*SZ-ox,j*SZ-oy,1.4,0,Math.PI*2);ctx.fill();}
      }
      t++; raf=requestAnimationFrame(draw);
    };
    draw(); return () => { cancelAnimationFrame(raf); window.removeEventListener("resize",resize); };
  },[]);
  return <canvas ref={c} className="hp8-canvas"/>;
}

// ═══════════════════════════════════════════════════════════════
// HERO
// ═══════════════════════════════════════════════════════════════
function HeroLivePanel({ fixtures }) {
  const nav = useNavigate();
  const live = fixtures.filter(f => LIVE_SET.has(f.status)).slice(0,3);
  if (!live.length) return (
    <div className="g-card hp8-hero-panel">
      <div className="g-card-inner">
        <div className="hp8-panel-label">LIVE CENTRE</div>
        <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:4}}>No matches live</div>
        <div style={{fontSize:11,color:"var(--text-dim)"}}>
          {fixtures.filter(f=>isToday(f.kickoff)).length} fixtures today
        </div>
      </div>
    </div>
  );
  return (
    <div className="g-card hp8-hero-panel">
      <div className="g-card-inner">
        <div className="hp8-panel-label" style={{color:"#ff453a",display:"flex",alignItems:"center",gap:6}}>
          <LiveDot/> {live.length} LIVE NOW
        </div>
        {live.map(f=>(
          <div key={f.fixture_id} className="hp8-live-row" onClick={()=>nav(`/match/${f.fixture_id}`)}>
            {f.home_logo&&<img src={f.home_logo} width={13} height={13} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
            <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {f.home_team?.split(" ").slice(-1)[0]}
            </span>
            <span className="hp8-mono" style={{fontWeight:900,fontSize:12,flexShrink:0}}>
              {f.home_score??0}–{f.away_score??0}
            </span>
            <span style={{flex:1,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {f.away_team?.split(" ").slice(-1)[0]}
            </span>
            {f.away_logo&&<img src={f.away_logo} width={13} height={13} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
            {f.minute&&<span className="hp8-mono" style={{fontSize:9,color:"#ff453a",flexShrink:0}}>{f.minute}'</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroTopPredPanel({ dash }) {
  const nav = useNavigate();
  const pred = dash?.top_predictions?.predictions?.[0];
  if (!pred) return (
    <div className="g-card hp8-hero-panel">
      <div className="g-card-inner">
        <div className="hp8-panel-label">TOP PREDICTION</div>
        <Skel w="80%" h={11}/><div style={{marginTop:8}}/><Skel w="60%" h={9}/>
      </div>
    </div>
  );
  const hp=pred.homeProb||0,ap=pred.awayProb||0,dp=pred.draw||0;
  const favProb=Math.max(hp,ap);
  return (
    <div className="g-card hp8-hero-panel" onClick={()=>nav(`/predictions/premier-league`)} style={{cursor:"pointer"}}>
      <div className="g-card-inner">
        <div className="hp8-panel-label" style={{color:"#0a84ff"}}>TOP PREDICTION</div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
          {pred.home_logo&&<img src={pred.home_logo} width={18} height={18} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
          <span style={{fontSize:12,fontWeight:800,color:"var(--text)"}}>{pred.home?.split(" ").slice(-1)[0]}</span>
          <span style={{color:"var(--text-dim)",fontSize:9}}>vs</span>
          <span style={{fontSize:12,fontWeight:800,color:"var(--text)"}}>{pred.away?.split(" ").slice(-1)[0]}</span>
          {pred.away_logo&&<img src={pred.away_logo} width={18} height={18} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
        </div>
        <div className="hp8-pred-probbar">
          <div style={{flex:hp,background:"#0a84ff",opacity:.9}}/><div style={{flex:dp,background:"var(--border-strong)"}}/><div style={{flex:ap,background:"#30d158",opacity:.9}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:8}}>
          <span className="hp8-mono" style={{color:"#0a84ff",fontWeight:900}}>{hp}%</span>
          <span style={{color:"var(--text-dim)"}}>D {dp}%</span>
          <span className="hp8-mono" style={{color:"#30d158",fontWeight:900}}>{ap}%</span>
        </div>
        {pred.xg_home!=null&&<div style={{fontSize:9,color:"var(--text-muted)"}}>
          xG <span className="hp8-mono" style={{color:"var(--text)"}}>{Number(pred.xg_home).toFixed(1)}–{Number(pred.xg_away).toFixed(1)}</span>
          <span style={{marginLeft:8,background:"rgba(10,132,255,0.12)",color:"#0a84ff",padding:"1px 7px",borderRadius:999,fontWeight:800}}>{favProb}%</span>
        </div>}
      </div>
    </div>
  );
}

function HeroModelPanel({ dash }) {
  const conf = dash?.model_confidence;
  const edge = dash?.model_edges?.edges?.[0];
  return (
    <div className="g-card hp8-hero-panel">
      <div className="g-card-inner">
        <div className="hp8-panel-label">MODEL SIGNALS</div>
        {!conf ? (
          <><Skel w="60%" h={24}/><div style={{marginTop:8}}/><Skel w="75%" h={9}/></>
        ) : (
          <>
            <div className="hp8-mono" style={{fontSize:26,fontWeight:900,color:"#30d158",lineHeight:1,marginBottom:4}}>{conf.avg_confidence}%</div>
            <div style={{fontSize:9,color:"var(--text-muted)",marginBottom:10}}>avg confidence · {conf.total} fixtures</div>
            <div style={{display:"flex",gap:3,height:5,borderRadius:999,overflow:"hidden",marginBottom:8}}>
              {conf.high>0&&<div style={{flex:conf.high,background:"#30d158",opacity:.8}}/>}
              {conf.medium>0&&<div style={{flex:conf.medium,background:"#ff9f0a",opacity:.7}}/>}
              {conf.low>0&&<div style={{flex:conf.low,background:"#ff453a",opacity:.6}}/>}
            </div>
            {edge&&<div style={{fontSize:9,color:"var(--text-muted)"}}>
              Top edge: <span style={{color:"#30d158",fontWeight:800}}>+{edge.edge}% {edge.label?.split(" ").slice(0,2).join(" ")}</span>
            </div>}
          </>
        )}
      </div>
    </div>
  );
}

function HeroSection({ fixtures, dash, dash_loading }) {
  const nav = useNavigate();
  const liveCount = fixtures.filter(f => LIVE_SET.has(f.status)).length;
  const todayCount = fixtures.filter(f => isToday(f.kickoff)).length;
  const heroStats = dash?.hero_stats;
  const avgConf = dash?.model_confidence?.avg_confidence ?? null;
  const topEdge = dash?.model_edges?.edges?.[0] ?? null;

  return (
    <section className="hp8-hero">
      <TelemetryGrid/>
      <div className="hp8-orb hp8-orb--a"/>
      <div className="hp8-orb hp8-orb--b"/>
      <div className="hp8-orb hp8-orb--c"/>
      <div className="hp8-container" style={{position:"relative",zIndex:2}}>
        <div className="hp8-hero-grid">
          {/* Left panel */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <HeroLivePanel fixtures={fixtures}/>
            <HeroModelPanel dash={dash}/>
          </div>

          {/* Center */}
          <div className="hp8-hero-center">
            <div className="hp8-hero-badge">
              {liveCount>0
                ? <><LiveDot/><span>LIVE NOW · {liveCount} MATCHES</span></>
                : <span>ELO · DIXON-COLES · REAL xG · POISSON</span>
              }
            </div>
            <h1 className="hp8-hero-title">
              Read The<br/>
              <span className="hp8-gradient-text">Game.</span>
            </h1>
            <p className="hp8-hero-sub">
              Football intelligence rebuilt. Live scores, Poisson predictions, xG tracking and the deepest FPL suite available.
            </p>
            <div className="hp8-hero-ctas">
              <button className={`hp8-btn hp8-btn--${liveCount>0?"live":"primary"}`} onClick={()=>nav("/live")}>
                {liveCount>0&&<LiveDot color="#ff453a"/>}
                {liveCount>0?"Watch Live":"Live Centre"}
              </button>
              <button className="hp8-btn hp8-btn--ghost" onClick={()=>nav("/predictions/premier-league")}>Predictions</button>
              <button className="hp8-btn hp8-btn--fpl" onClick={()=>nav("/best-team")}>FPL Suite</button>
            </div>
            <div className="hp8-stat-strip">
              {[
                {l:"Accuracy",v:heroStats?.verified_accuracy||avgConf,c:"#30d158",sx:"%"},
                {l:"Verified",v:heroStats?.fixtures_predicted,c:"#0a84ff"},
                {l:"Leagues",v:heroStats?.competitions_count??9,c:"#bf5af2"},
                {l:"Top Edge",v:topEdge?`+${topEdge.edge}%`:null,c:"#ff9f0a",raw:true},
              ].map(({l,v,c,sx="",raw},i)=>(
                <div key={l} className="hp8-stat-cell" style={{"--cell-color":c}}>
                  <div className="hp8-stat-val">
                    {dash_loading||v==null
                      ? <Skel w={32} h={22}/>
                      : raw ? <span className="hp8-mono">{v}</span>
                      : <CountUp to={Number(v)||0} suffix={sx}/>
                    }
                  </div>
                  <div className="hp8-stat-label">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel */}
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <HeroTopPredPanel dash={dash}/>
            <div className="g-card hp8-hero-panel">
              <div className="g-card-inner">
                <div className="hp8-panel-label">QUICK ACCESS</div>
                {[
                  {to:"/predictions/champions-league",l:"UCL Predictions",c:"#3b82f6"},
                  {to:"/predictions/premier-league",l:"EPL Predictions",c:"#60a5fa"},
                  {to:"/captaincy",l:"Captain Picks",c:"#30d158"},
                  {to:"/player",l:"Player Browser",c:"#ff9f0a"},
                ].map(({to,l,c})=>(
                  <Link key={to} to={to} className="hp8-qlink" style={{"--ql-color":c}}>
                    {l}<span>→</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// LIVE STRIP
// ═══════════════════════════════════════════════════════════════
function LivePulseStrip({ fixtures }) {
  const nav = useNavigate();
  const live = fixtures.filter(f => LIVE_SET.has(f.status));
  if (!live.length) return null;
  const chips = [...live,...live,...live];
  return (
    <div className="hp8-strip">
      <div className="hp8-strip-fade hp8-strip-fade--l"/>
      <div className="hp8-strip-track" style={{animationDuration:`${Math.max(live.length*7,22)}s`}}>
        {chips.map((f,i)=>(
          <div key={i} className="hp8-strip-chip" onClick={()=>nav(`/match/${f.fixture_id}`)}>
            <LiveDot size={5}/>
            {f.home_logo&&<img src={f.home_logo} width={14} height={14} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
            <span>{f.home_team?.split(" ").slice(-1)[0]}</span>
            <span className="hp8-mono" style={{fontWeight:900}}>{f.home_score??0}–{f.away_score??0}</span>
            <span>{f.away_team?.split(" ").slice(-1)[0]}</span>
            {f.away_logo&&<img src={f.away_logo} width={14} height={14} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
            {f.minute&&<span className="hp8-mono" style={{fontSize:9,color:"#ff453a"}}>{f.minute}'</span>}
          </div>
        ))}
      </div>
      <div className="hp8-strip-fade hp8-strip-fade--r"/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TOP PREDICTIONS
// ═══════════════════════════════════════════════════════════════
function PredCard({ p, index }) {
  const nav = useNavigate();
  const [ref,vis] = useReveal(0.05);
  const hp=p.homeProb||0,dp=p.draw||0,ap=p.awayProb||0;
  const favProb=Math.max(hp,ap);
  const cc=(p.conf_pct||50)>=70?"#30d158":(p.conf_pct||50)>=55?"#ff9f0a":"#ff453a";
  return (
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(16px)",transition:`all 0.45s ease ${index*55}ms`}}>
      <div className="g-card hp8-pred-card" style={{"--pc-color":p.col||"#0a84ff"}}
        onClick={()=>p.fixture_id&&nav(`/match/${p.fixture_id}`)}>
        <div className="g-card-inner">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:9,fontWeight:800,color:"var(--text-dim)",letterSpacing:"0.12em"}}>{p.league||"League"}</span>
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:cc}}/>
              <span className="hp8-mono" style={{fontSize:9,fontWeight:800,color:cc}}>{p.conf_pct||50}%</span>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:0}}>
              {p.home_logo&&<img src={p.home_logo} width={22} height={22} style={{objectFit:"contain",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>}
              <span style={{fontSize:12,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.home}</span>
            </div>
            <div style={{textAlign:"center",flexShrink:0}}>
              <div className="hp8-mono" style={{fontSize:14,fontWeight:900,color:"var(--text)"}}>{p.score||"1-0"}</div>
              <div style={{fontSize:7,color:"var(--text-dim)"}}>predicted</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:0,justifyContent:"flex-end"}}>
              <span style={{fontSize:12,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"right"}}>{p.away}</span>
              {p.away_logo&&<img src={p.away_logo} width={22} height={22} style={{objectFit:"contain",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>}
            </div>
          </div>
          <div className="hp8-pred-probbar">
            <div style={{flex:hp,background:"#0a84ff",opacity:.85}}/><div style={{flex:dp,background:"var(--border-strong)"}}/><div style={{flex:ap,background:"#30d158",opacity:.85}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10}}>
            <span className="hp8-mono" style={{color:"#0a84ff",fontWeight:900}}>{hp}%</span>
            <span style={{color:"var(--text-dim)"}}>D {dp}%</span>
            <span className="hp8-mono" style={{color:"#30d158",fontWeight:900}}>{ap}%</span>
          </div>
          {(p.xg_home!=null||favProb>=60)&&(
            <div style={{marginTop:8,display:"flex",gap:8,alignItems:"center",fontSize:9,color:"var(--text-muted)"}}>
              {p.xg_home!=null&&<span>xG <span className="hp8-mono" style={{color:"var(--text)"}}>{Number(p.xg_home).toFixed(1)}–{Number(p.xg_away).toFixed(1)}</span></span>}
              {favProb>=60&&<Badge label={`${favProb}%`} color={p.col||"#0a84ff"} size="sm"/>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TopPredictions({ dash, loading }) {
  const [ref,vis] = useReveal(0.04);
  const preds = dash?.top_predictions?.predictions ?? [];
  return (
    <section className="hp8-section">
      <div className="hp8-container">
        <div ref={ref} className="hp8-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp8-eyebrow">— Model Output</div><h2 className="hp8-title">Today's Top Predictions</h2></div>
          <Link to="/predictions/premier-league" className="hp8-see-all">All predictions →</Link>
        </div>
        <div className="hp8-hscroll">
          {loading ? Array.from({length:4}).map((_,i)=>(
            <div key={i} style={{flexShrink:0,width:280,height:200}} className="g-card"><div style={{padding:18}}><Skel w="60%" h={9}/><div style={{marginTop:12}}/><Skel w="90%" h={12}/><div style={{marginTop:6}}/><Skel w="75%" h={8}/></div></div>
          )) : preds.map((p,i)=><PredCard key={i} p={p} index={i}/>)}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// TITLE RACE + FORM TABLE
// ═══════════════════════════════════════════════════════════════
function TitleRace({ dash, loading }) {
  const [ref,vis] = useReveal(0.04);
  const race = dash?.title_race?.top4 ?? [];
  const maxPts = race.length>0 ? Math.max(...race.map(t=>t.points||0)) : 1;
  const league = dash?.title_race?.league ?? "Premier League";
  const formTable = dash?.form_table?.table ?? [];
  return (
    <section className="hp8-section">
      <div className="hp8-container">
        <div ref={ref} className="hp8-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp8-eyebrow">— Standings</div><h2 className="hp8-title">Title Race · {league}</h2></div>
          <Link to="/league/epl" className="hp8-see-all">Full table →</Link>
        </div>
        <div className="hp8-race-grid">
          {/* Top 4 */}
          <div className="g-card" style={{padding:"20px"}}>
            <div className="g-card-inner">
              <div className="hp8-sub-label">Top 4</div>
              {loading ? Array.from({length:4}).map((_,i)=><div key={i} style={{height:50,borderRadius:12,marginBottom:6}} className="hp8-skel"/>) :
                race.map((t,i)=>{
                  const pct=maxPts>0?(t.points/maxPts)*100:0;
                  const tc=t.trend==="up"?"#30d158":t.trend==="down"?"#ff453a":"#ff9f0a";
                  return (
                    <div key={t.team_id||i} className="hp8-team-row">
                      <div className="hp8-mono" style={{fontSize:10,fontWeight:900,color:"var(--text-dim)",minWidth:20}}>#{i+1}</div>
                      {t.logo&&<img src={t.logo} width={22} height={22} style={{objectFit:"contain",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.team_name}</div>
                        <div style={{display:"flex",gap:3,marginTop:4}}>{(t.form_letters||[]).slice(-5).map((r,j)=><FormPip key={j} r={r}/>)}</div>
                      </div>
                      <div style={{width:72}}>
                        <div style={{height:5,borderRadius:999,background:"var(--border)",overflow:"hidden"}}>
                          <div style={{width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,#0a84ff,#30d158)",borderRadius:999,transition:"width 1s ease"}}/>
                        </div>
                      </div>
                      <div className="hp8-mono" style={{fontSize:14,fontWeight:900,color:"var(--text)",minWidth:26,textAlign:"right"}}>{t.points}</div>
                      <div style={{width:8,height:8,borderRadius:"50%",background:tc,boxShadow:`0 0 6px ${tc}`,flexShrink:0}}/>
                    </div>
                  );
                })
              }
            </div>
          </div>
          {/* Form table */}
          <div className="g-card" style={{padding:"20px"}}>
            <div className="g-card-inner">
              <div className="hp8-sub-label">Form Table (last 5)</div>
              {loading ? Array.from({length:5}).map((_,i)=><div key={i} style={{height:38,borderRadius:10,marginBottom:5}} className="hp8-skel"/>) :
                formTable.slice(0,5).map((t,i)=>(
                  <div key={i} className="hp8-team-row" style={{padding:"9px 12px"}}>
                    <div className="hp8-mono" style={{fontSize:9,color:"var(--text-dim)",minWidth:16}}>{i+1}</div>
                    {t.logo&&<img src={t.logo} width={18} height={18} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
                    <div style={{flex:1,fontSize:11,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.team_name}</div>
                    <div style={{display:"flex",gap:2}}>{(t.form5||"").split("").map((r,j)=><FormPip key={j} r={r}/>)}</div>
                    <Badge label={`${t.form_pts||0}pts`} color="#30d158" size="sm"/>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// EDGE BOARD
// ═══════════════════════════════════════════════════════════════
function EdgeBoard({ dash, loading }) {
  const [ref,vis] = useReveal(0.04);
  const nav = useNavigate();
  const edges = dash?.model_edges?.edges ?? [];
  const highXg = dash?.high_scoring_matches?.matches ?? [];
  return (
    <section className="hp8-section">
      <div className="hp8-container">
        <div ref={ref} className="hp8-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp8-eyebrow">— Value Signals</div><h2 className="hp8-title">Model Edge Board</h2></div>
        </div>
        <div className="hp8-edge-grid">
          {/* Best edges */}
          <div className="g-card" style={{padding:"20px"}}>
            <div className="g-card-inner">
              <div className="hp8-sub-label">Best Edges Today</div>
              {loading ? Array.from({length:3}).map((_,i)=><div key={i} style={{height:80,borderRadius:14,marginBottom:8}} className="hp8-skel"/>) :
                edges.length>0 ? edges.map((e,i)=>(
                  <div key={i} className="g-card g-card--sm hp8-edge-card" style={{marginBottom:8}}>
                    <div className="g-card-inner">
                      <div style={{fontSize:9,fontWeight:900,color:e.col||"#30d158",letterSpacing:"0.1em",marginBottom:4}}>MODEL EDGE</div>
                      <div style={{fontSize:12,fontWeight:800,color:"var(--text)",marginBottom:2}}>{e.home} vs {e.away}</div>
                      <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                        <span className="hp8-mono" style={{fontSize:22,fontWeight:900,color:e.col||"#30d158"}}>+{e.edge}%</span>
                        <span style={{fontSize:10,color:"var(--text-muted)"}}>{e.direction==="home"?e.home:e.away} favoured</span>
                      </div>
                      <div style={{height:4,borderRadius:999,background:"var(--border)",marginTop:8,overflow:"hidden"}}>
                        <div style={{width:`${Math.min(e.model_prob||e.edge*2,100)}%`,height:"100%",background:e.col||"#30d158",borderRadius:999}}/>
                      </div>
                    </div>
                  </div>
                )) : <div className="hp8-empty">No edges detected today</div>
              }
            </div>
          </div>
          {/* Highest xG */}
          <div className="g-card" style={{padding:"20px"}}>
            <div className="g-card-inner">
              <div className="hp8-sub-label">Highest xG Fixtures</div>
              {loading ? Array.from({length:3}).map((_,i)=><div key={i} style={{height:80,borderRadius:14,marginBottom:8}} className="hp8-skel"/>) :
                highXg.length>0 ? highXg.slice(0,4).map((m,i)=>{
                  const xgH=Number(m.xg_home)||0,xgA=Number(m.xg_away)||0,total=Number(m.total_xg)||(xgH+xgA);
                  return (
                    <div key={i} className="g-card g-card--sm hp8-xg-card" style={{marginBottom:8}} onClick={()=>m.fixture_id&&nav(`/match/${m.fixture_id}`)}>
                      <div className="g-card-inner">
                        <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:4}}>
                          <span className="hp8-mono" style={{fontSize:22,fontWeight:900,color:"#0a84ff"}}>{total.toFixed(1)}</span>
                          <span style={{fontSize:9,fontWeight:900,color:"var(--text-dim)",letterSpacing:"0.1em"}}>TOTAL xG</span>
                        </div>
                        <div style={{fontSize:11,fontWeight:700,color:"var(--text-secondary)",marginBottom:6}}>
                          {m.home?.split(" ").slice(-1)[0]} vs {m.away?.split(" ").slice(-1)[0]}
                        </div>
                        <div style={{display:"flex",gap:3,height:4,borderRadius:999,overflow:"hidden"}}>
                          <div style={{flex:xgH||1,background:"#0a84ff",opacity:.8}}/>
                          <div style={{flex:xgA||1,background:"#30d158",opacity:.8}}/>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginTop:3}}>
                          <span className="hp8-mono" style={{color:"#0a84ff"}}>{xgH.toFixed(1)}</span>
                          <span className="hp8-mono" style={{color:"#30d158"}}>{xgA.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }) : <div className="hp8-empty">Loading fixtures…</div>
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMMAND GRID (BENTO)
// ═══════════════════════════════════════════════════════════════
const TOOLS = [
  {to:"/live",label:"Live Centre",color:"#ff453a",span:2,tall:true,sub:"Real-time scores, events and minute-by-minute tracking",tag:"LIVE DATA",dataKey:"live"},
  {to:"/predictions/premier-league",label:"Predictions",color:"#0a84ff",span:1,tall:false,sub:"Dixon-Coles Poisson model with ELO ratings",tag:"MODEL",dataKey:"preds"},
  {to:"/match/0",label:"Match Hub",color:"#bf5af2",span:1,tall:false,sub:"Lineups, H2H, injuries, xG and tactics",tag:"INTELLIGENCE",dataKey:null},
  {to:"/best-team",label:"FPL Best XI",color:"#30d158",span:1,tall:true,sub:"Optimal FPL starting XI with captain signal",tag:"FPL",dataKey:"fpl"},
  {to:"/squad-builder",label:"Squad Builder",color:"#30d158",span:1,tall:false,sub:"Build your 15-man FPL squad under budget",tag:"FPL",dataKey:null},
  {to:"/player",label:"Players",color:"#ff9f0a",span:1,tall:false,sub:"500+ player profiles with xG and form",tag:"DATA",dataKey:null},
  {to:"/news",label:"News",color:"#ff375f",span:1,tall:false,sub:"Transfers, injuries and intelligence updates",tag:"NEWS",dataKey:null},
  {to:"/games",label:"Mini Games",color:"#ff9f0a",span:1,tall:false,sub:"Score predictor, quizzes and challenges",tag:"GAMES",dataKey:null},
];

function ToolDataRow({dataKey,fixtures,dash,loading}) {
  if(!dataKey) return null;
  if(dataKey==="live") {
    const live=fixtures.filter(f=>LIVE_SET.has(f.status));
    if(loading) return <div style={{height:9}} className="hp8-skel"/>;
    return <div>
      <div className="hp8-mono" style={{fontSize:13,fontWeight:900,color:"#ff453a"}}>{live.length>0?`${live.length} live`:`${fixtures.filter(f=>isToday(f.kickoff)).length} today`}</div>
    </div>;
  }
  if(dataKey==="preds") {
    const conf=dash?.model_confidence,top=dash?.top_predictions?.predictions?.[0];
    if(loading||!dash) return <div style={{height:9}} className="hp8-skel"/>;
    return <div>
      {conf&&<div className="hp8-mono" style={{fontSize:12,fontWeight:900,color:"#0a84ff"}}>{conf.avg_confidence}% · {conf.total} fixtures</div>}
      {top&&<div style={{fontSize:10,color:"var(--text-muted)"}}>{Math.max(top.homeProb||0,top.awayProb||0)}% {(top.homeProb>top.awayProb?top.home:top.away)?.split(" ").slice(-1)[0]}</div>}
    </div>;
  }
  if(dataKey==="fpl") {
    const capt=dash?.differential_captains?.captains?.[0];
    if(loading||!dash) return <div style={{height:9}} className="hp8-skel"/>;
    return capt ? <div>
      <div className="hp8-mono" style={{fontSize:12,fontWeight:900,color:"#30d158"}}>{capt.name||capt.web_name}</div>
      <div style={{fontSize:10,color:"var(--text-muted)"}}>{capt.ep_next!=null?Number(capt.ep_next).toFixed(1):"??"} EP</div>
    </div> : null;
  }
  return null;
}

function ToolCard({tool,index,fixtures,dash,loading}) {
  const [ref,vis] = useReveal(0.04);
  const [hov,setHov] = useState(false);
  return (
    <div ref={ref} style={{
      gridColumn:`span ${tool.span}`,
      gridRow:tool.tall?"span 2":"span 1",
      opacity:vis?1:0,
      transform:vis?"translateY(0)":"translateY(20px)",
      transition:`opacity .55s ease ${index*50}ms,transform .55s ease ${index*50}ms`,
    }}>
      <Link to={tool.to} style={{textDecoration:"none",display:"block",height:"100%"}}>
        <div className="g-card hp8-tool-card" style={{height:"100%","--tc-color":tool.color}}
          onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
          <div className="g-card-inner" style={{height:"100%",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <span style={{fontSize:9,fontWeight:900,color:tool.color,letterSpacing:"0.12em"}}>{tool.tag}</span>
                <div style={{width:28,height:28,borderRadius:8,background:`${tool.color}18`,border:`1px solid ${tool.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>
                  {tool.label==="Live Centre"?"⚡":tool.label==="Predictions"?"📊":tool.label==="Match Hub"?"⚽":tool.label==="FPL Best XI"?"🏆":tool.label==="Squad Builder"?"🔧":tool.label==="Players"?"👤":tool.label==="News"?"📰":"🎮"}
                </div>
              </div>
              <div style={{fontSize:16,fontWeight:900,color:"var(--text)",letterSpacing:"-0.02em",marginBottom:6}}>{tool.label}</div>
              <div style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.5}}>{tool.sub}</div>
            </div>
            <div style={{marginTop:12}}>
              <ToolDataRow dataKey={tool.dataKey} fixtures={fixtures} dash={dash} loading={loading}/>
              <div style={{marginTop:8,fontSize:11,fontWeight:700,color:hov?tool.color:"var(--text-dim)",transition:"color .15s"}}>
                Open {hov?"→":""}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function CommandGrid({ fixtures, dash, loading }) {
  const [ref,vis] = useReveal(0.04);
  return (
    <section className="hp8-section">
      <div className="hp8-container">
        <div ref={ref} className="hp8-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp8-eyebrow">— Platform</div><h2 className="hp8-title">Intelligence Command Grid</h2></div>
          <span style={{fontSize:10,color:"var(--text-muted)"}}>8 tools</span>
        </div>
        <div className="hp8-bento">
          {TOOLS.map((t,i)=><ToolCard key={t.to} tool={t} index={i} fixtures={fixtures} dash={dash} loading={loading}/>)}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPETITION HUB
// ═══════════════════════════════════════════════════════════════
const COMPS = [
  {label:"Premier League",slug:"premier-league",leagueId:39,color:"#60a5fa",logo:"https://media.api-sports.io/football/leagues/39.png",teams:20,desc:"England's top flight with full Dixon-Coles coverage.",features:["Predictions","Standings","Season Sim","xG"]},
  {label:"La Liga",slug:"la-liga",leagueId:140,color:"#fb923c",logo:"https://media.api-sports.io/football/leagues/140.png",teams:20,desc:"Spain's premier division with Elo power rankings.",features:["Predictions","Standings","Season Sim"]},
  {label:"Bundesliga",slug:"bundesliga",leagueId:78,color:"#ff9f0a",logo:"https://media.api-sports.io/football/leagues/78.png",teams:18,desc:"Germany's top tier — high-pressing data and form.",features:["Predictions","Standings","Season Sim"]},
  {label:"Serie A",slug:"serie-a",leagueId:135,color:"#30d158",logo:"https://media.api-sports.io/football/leagues/135.png",teams:20,desc:"Italian football with defensive analytics.",features:["Predictions","Standings"]},
  {label:"Ligue 1",slug:"ligue-1",leagueId:61,color:"#bf5af2",logo:"https://media.api-sports.io/football/leagues/61.png",teams:18,desc:"France's top league — full Poisson model.",features:["Predictions","Standings"]},
  {label:"Champions League",slug:"champions-league",leagueId:2,color:"#3b82f6",logo:"https://media.api-sports.io/football/leagues/2.png",teams:36,desc:"Europe's elite competition with bracket predictions.",features:["Predictions","Bracket"]},
  {label:"Europa League",slug:"europa-league",leagueId:3,color:"#f97316",logo:"https://media.api-sports.io/football/leagues/3.png",teams:36,desc:"UEFA's second-tier European competition.",features:["Predictions","Bracket"]},
  {label:"Conference League",slug:"conference-league",leagueId:848,color:"#22c55e",logo:"https://media.api-sports.io/football/leagues/848.png",teams:36,desc:"UEFA's third-tier tournament predictions.",features:["Predictions","Bracket"]},
  {label:"FA Cup",slug:"fa-cup",leagueId:45,color:"#ef4444",logo:"https://media.api-sports.io/football/leagues/45.png",teams:736,desc:"The world's oldest domestic cup competition.",features:["Predictions","Bracket"]},
];

function CompCard({ comp, index, fixtures }) {
  const [hov,setHov] = useState(false);
  const [ref,vis] = useReveal(0.05);
  const liveCount = fixtures.filter(f=>LIVE_SET.has(f.status)&&f.league_id===comp.leagueId).length;
  return (
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(16px)",transition:`all .45s ease ${index*35}ms`}}>
      <Link to={`/predictions/${comp.slug}`} style={{textDecoration:"none"}}>
        <div className="g-card" style={{padding:"20px",height:"100%",display:"flex",flexDirection:"column"}}
          onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
          <div className="g-card-inner" style={{display:"flex",flexDirection:"column",height:"100%"}}>
            {/* Top accent */}
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:comp.color,borderRadius:"20px 20px 0 0",opacity:hov?1:0,transition:"opacity .2s"}}/>
            {/* Header */}
            <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:12}}>
              <div style={{width:48,height:48,borderRadius:14,flexShrink:0,background:`${comp.color}14`,border:`1px solid ${comp.color}28`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:hov?`0 0 16px ${comp.color}35`:"none",transition:"box-shadow .2s"}}>
                <img src={comp.logo} width={30} height={30} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:900,color:"var(--text)",letterSpacing:"-0.02em",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{comp.label}</div>
                <div style={{fontSize:10,color:"var(--text-muted)"}}>{comp.teams} clubs</div>
              </div>
              {liveCount>0&&(
                <div style={{display:"flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:999,background:"rgba(255,69,58,0.10)",border:"1px solid rgba(255,69,58,0.20)",flexShrink:0}}>
                  <LiveDot size={5}/><span style={{fontSize:8,fontWeight:900,color:"#ff453a",fontFamily:"var(--font-mono)"}}>{liveCount}</span>
                </div>
              )}
            </div>
            <div style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.55,marginBottom:12,flex:1}}>{comp.desc}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:12}}>
              {comp.features.map(f=><Badge key={f} label={f} color={comp.color} size="sm"/>)}
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:10,borderTop:"1px solid var(--border)",fontSize:11,fontWeight:700,color:hov?comp.color:"var(--text-dim)",transition:"color .15s"}}>
              <span>Explore predictions</span>
              <span style={{transition:"transform .15s",transform:hov?"translateX(4px)":"translateX(0)"}}>→</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function CompetitionHub({ fixtures }) {
  const [ref,vis] = useReveal(0.04);
  return (
    <section className="hp8-section">
      <div className="hp8-container">
        <div ref={ref} className="hp8-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div>
            <div className="hp8-eyebrow">— Coverage</div>
            <h2 className="hp8-title">9 Competitions. Full Intelligence.</h2>
            <p style={{fontSize:12,color:"var(--text-muted)",marginTop:6,maxWidth:480}}>Poisson predictions, standings, season simulation and xG across Europe's top competitions.</p>
          </div>
        </div>
        <div className="hp8-comp-grid">
          {COMPS.map((c,i)=><CompCard key={c.slug} comp={c} index={i} fixtures={fixtures}/>)}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// FPL HUB
// ═══════════════════════════════════════════════════════════════
const FPL_TOOLS = [
  {to:"/best-team",label:"Best XI",stat:"Optimal 11",detail:"Model-driven optimal starting 11",color:"#30d158"},
  {to:"/squad-builder",label:"Squad Builder",stat:"15-man squad",detail:"Build within £100m budget",color:"#0a84ff"},
  {to:"/gameweek-insights",label:"GW Insights",stat:"This gameweek",detail:"Fixture analysis & GW picks",color:"#ff9f0a"},
  {to:"/fpl-table",label:"FPL Table",stat:"Standings",detail:"Live leaderboard & rank",color:"#bf5af2"},
  {to:"/captaincy",label:"Captaincy",stat:"Captain picks",detail:"EP analysis & ownership data",color:"#ff9f0a"},
  {to:"/fixture-difficulty",label:"FDR Heatmap",stat:"8 GWs",detail:"Fixture difficulty ratings",color:"#64d2ff"},
  {to:"/transfer-planner",label:"Transfer Planner",stat:"Plan moves",detail:"Model transfer recommendations",color:"#ff453a"},
  {to:"/differentials",label:"Differentials",stat:"Low-owned",detail:"High-ceiling, low-ownership picks",color:"#ff375f"},
];

function FplToolRow({ t, i, dash }) {
  const [hov,setHov] = useState(false);
  const [ref,vis] = useReveal(0.04);
  const capt = t.to==="/captaincy" && dash?.differential_captains?.captains?.[0];
  const realStat = capt ? `${capt.name||capt.web_name} ${capt.ep_next!=null?Number(capt.ep_next).toFixed(1):"??"}EP` : t.stat;
  return (
    <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateX(0)":"translateX(14px)",transition:`all .4s ease ${i*40}ms`}}>
      <Link to={t.to} style={{textDecoration:"none"}}>
        <div className="hp8-fpl-row" style={{"--fpl-color":t.color}}
          onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
          <div className="hp8-fpl-indicator"/>
          <div className="hp8-mono" style={{fontSize:9,color:"var(--text-dim)",minWidth:22}}>{String(i+1).padStart(2,"0")}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:700,color:"var(--text)"}}>{t.label}</div>
            {hov&&<div style={{fontSize:10,color:"var(--text-muted)",marginTop:1}}>{t.detail}</div>}
          </div>
          <span style={{fontSize:10,fontWeight:700,color:t.color,whiteSpace:"nowrap"}}>{realStat}</span>
          <span style={{fontSize:12,transition:"transform .15s",transform:hov?"translateX(3px)":"translateX(0)",color:t.color}}>→</span>
        </div>
      </Link>
    </div>
  );
}

function FPLHub({ dash }) {
  const [ref,vis] = useReveal(0.04);
  const capts = dash?.differential_captains?.captains?.slice(0,4) ?? [];
  const valuePls = dash?.value_players?.players?.slice(0,3) ?? [];
  return (
    <section className="hp8-section">
      <div className="hp8-container">
        <div ref={ref} className="hp8-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp8-eyebrow">— Fantasy Premier League</div><h2 className="hp8-title">FPL Intelligence Hub</h2></div>
          <div style={{display:"flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:999,background:"var(--green-soft)",border:"1px solid rgba(48,209,88,.2)"}}>
            <LiveDot color="#30d158" size={6}/>
            <span style={{fontSize:9,fontWeight:900,color:"#30d158",letterSpacing:"0.1em",fontFamily:"var(--font-mono)"}}>8 TOOLS ACTIVE</span>
          </div>
        </div>
        <div className="hp8-fpl-grid">
          {/* Left: captain picks + value */}
          <div className="g-card" style={{padding:"20px"}}>
            <div className="g-card-inner">
              <div className="hp8-sub-label">Captain Picks · Differentials</div>
              {capts.length>0 ? capts.map((c,i)=>(
                <div key={i} className="hp8-capt-row">
                  <div className="hp8-mono" style={{fontSize:9,color:"var(--text-dim)",minWidth:22}}>{String(i+1).padStart(2,"0")}</div>
                  {c.photo&&<img src={c.photo} width={28} height={28} style={{borderRadius:"50%",objectFit:"cover",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:800,color:"var(--text)"}}>{c.name||c.web_name}</div>
                    <div style={{fontSize:9,color:"var(--text-muted)"}}>{c.team_short||c.team||""} · {c.ownership!=null?Number(c.ownership).toFixed(1):"?"}% owned</div>
                  </div>
                  <Badge label={`${Number(c.form||0).toFixed(1)} form`} color="#ff9f0a" size="sm"/>
                  <div className="hp8-ep">{c.ep_next!=null?Number(c.ep_next).toFixed(1):"??"}</div>
                  <div className="hp8-ep-label">EP</div>
                </div>
              )) : Array.from({length:4}).map((_,i)=><div key={i} className="hp8-capt-row"><Skel w="70%" h={11}/></div>)}

              {valuePls.length>0&&(
                <div style={{marginTop:16}}>
                  <div className="hp8-sub-label">Value Picks (pts/£m)</div>
                  {valuePls.map((p,i)=>(
                    <div key={i} className="hp8-capt-row">
                      <div className="hp8-mono" style={{fontSize:9,color:"var(--text-dim)",minWidth:16}}>{i+1}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:800,color:"var(--text)"}}>{p.name}</div>
                        <div style={{fontSize:9,color:"var(--text-muted)"}}>{p.team_short} · £{p.cost}m · {p.position}</div>
                      </div>
                      <Badge label={`${p.value_score}v`} color="#0a84ff" size="sm"/>
                      <div className="hp8-mono" style={{fontSize:12,fontWeight:900,color:"#30d158"}}>{p.total_points}</div>
                      <div style={{fontSize:8,color:"var(--text-dim)"}}>pts</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Right: tool list */}
          <div className="g-card" style={{padding:"20px"}}>
            <div className="g-card-inner">
              <div className="hp8-sub-label">All FPL Tools</div>
              {FPL_TOOLS.map((t,i)=><FplToolRow key={t.to} t={t} i={i} dash={dash}/>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// TRENDING PLAYERS
// ═══════════════════════════════════════════════════════════════
function PlayerCard({ p, i, nav }) {
  const [hov,setHov] = useState(false);
  return (
    <div className="g-card" style={{padding:"16px",cursor:"pointer"}}
      onClick={()=>nav(`/player?search=${encodeURIComponent(p.name||"")}`)}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <div className="g-card-inner">
        <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10}}>
          {p.photo&&<img src={p.photo} width={36} height={36} style={{borderRadius:"50%",objectFit:"cover",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name||"Player"}</div>
            <div style={{fontSize:10,color:"var(--text-muted)"}}>{p.team||p.team_name||""}</div>
          </div>
          {p.per90!=null&&(
            <div style={{textAlign:"right"}}>
              <div className="hp8-mono" style={{fontSize:14,fontWeight:900,color:"#0a84ff"}}>{Number(p.per90).toFixed(2)}</div>
              <div style={{fontSize:7,color:"var(--text-dim)"}}>G+A/90</div>
            </div>
          )}
        </div>
        {(p.goals!=null||p.g_plus_a!=null)&&(
          <div style={{display:"flex",gap:14,fontSize:11,color:"var(--text-muted)"}}>
            {p.goals!=null&&<span><span className="hp8-mono" style={{color:"var(--text)",fontWeight:900}}>{p.goals}</span> G</span>}
            {p.assists!=null&&<span><span className="hp8-mono" style={{color:"var(--text)",fontWeight:900}}>{p.assists}</span> A</span>}
            {p.g_plus_a!=null&&<span><span className="hp8-mono" style={{color:"#ff9f0a",fontWeight:900}}>{p.g_plus_a}</span> G+A</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function TrendingPlayers({ dash, loading }) {
  const [ref,vis] = useReveal(0.04);
  const nav = useNavigate();
  const xgLeaders = dash?.xg_leaders?.leaders?.slice(0,6) ?? [];
  const items = dash?.trending_players?.items ?? [];
  const showable = xgLeaders.length>0 ? xgLeaders : items.slice(0,6);
  return (
    <section className="hp8-section">
      <div className="hp8-container">
        <div ref={ref} className="hp8-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp8-eyebrow">— Players</div><h2 className="hp8-title">xG Leaders & Form</h2></div>
          <Link to="/player" className="hp8-see-all">Browse all →</Link>
        </div>
        <div className="hp8-player-grid">
          {loading ? Array.from({length:6}).map((_,i)=>(
            <div key={i} className="g-card" style={{padding:"16px"}}><Skel w="70%" h={11}/><div style={{marginTop:8}}/><Skel w="85%" h={9}/></div>
          )) : showable.length>0 ? showable.map((p,i)=><PlayerCard key={i} p={p} i={i} nav={nav}/>) : <div className="hp8-empty" style={{gridColumn:"1/-1"}}>Loading player data…</div>}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// TRANSFER BRIEF + ANALYTICS TERM + DEFENCE TABLE
// ═══════════════════════════════════════════════════════════════
function TransferBrief({ dash, loading }) {
  const [ref,vis] = useReveal(0.04);
  const brief = dash?.transfer_brief;
  const term = dash?.analytics_term;
  const defTable = dash?.defense_table?.table ?? [];
  return (
    <section className="hp8-section">
      <div className="hp8-container">
        <div ref={ref} className="hp8-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp8-eyebrow">— Intelligence</div><h2 className="hp8-title">Transfer Brief & Analytics</h2></div>
          <Link to="/news" className="hp8-see-all">All news →</Link>
        </div>
        <div className="hp8-3col">
          {/* Transfer brief */}
          <div className="g-card" style={{padding:"20px"}}>
            <div className="g-card-inner">
              <div className="hp8-sub-label">Transfer Brief</div>
              {loading||!brief ? <><Skel w="85%" h={10}/><div style={{marginTop:8}}/><Skel w="65%" h={9}/><div style={{marginTop:6}}/><Skel w="90%" h={9}/></> : (
                <>
                  <div style={{fontSize:12,fontWeight:700,color:"var(--text)",lineHeight:1.55,marginBottom:12}}>{brief.summary||"No major transfer news today."}</div>
                  {(brief.key_transfers||[]).slice(0,3).map((t,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,fontSize:10,color:"var(--text-muted)",borderTop:"1px solid var(--border)",paddingTop:8,marginTop:4}}>
                      <span style={{width:5,height:5,borderRadius:"50%",background:"#0a84ff",flexShrink:0,marginTop:4}}/>
                      <span style={{flex:1}}>{typeof t==="string"?t:t.text||t.headline||""}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
          {/* Analytics term */}
          <div className="g-card" style={{padding:"20px"}}>
            <div className="g-card-inner">
              <div className="hp8-sub-label">Today's Term</div>
              {loading||!term ? <><Skel w="50%" h={24}/><div style={{marginTop:8}}/><Skel w="90%" h={9}/></> : (
                <>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <span style={{fontSize:24}}>{term.icon||"📊"}</span>
                    <div>
                      <div className="hp8-mono" style={{fontSize:18,fontWeight:900,color:term.col||"#0a84ff"}}>{term.short||term.term}</div>
                      <div style={{fontSize:9,color:"var(--text-muted)"}}>{term.value_label}</div>
                    </div>
                  </div>
                  <div style={{fontSize:11,color:"var(--text-muted)",lineHeight:1.6,marginBottom:10}}>{term.definition}</div>
                  {term.example&&<div style={{padding:"6px 10px",borderRadius:10,background:"var(--bg-glass)",border:"1px solid var(--border)",fontSize:10,fontFamily:"var(--font-mono)",color:term.col||"#0a84ff"}}>{term.example}</div>}
                </>
              )}
            </div>
          </div>
          {/* Defence table */}
          <div className="g-card" style={{padding:"20px"}}>
            <div className="g-card-inner">
              <div className="hp8-sub-label">Best Defences · EPL</div>
              {loading||defTable.length===0 ? Array.from({length:5}).map((_,i)=><div key={i} style={{height:28,borderRadius:6,marginBottom:5}} className="hp8-skel"/>) :
                defTable.slice(0,5).map((t,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:"1px solid var(--border-soft)"}}>
                    <span className="hp8-mono" style={{fontSize:9,color:"var(--text-dim)",minWidth:16}}>{i+1}</span>
                    {t.logo&&<img src={t.logo} width={16} height={16} style={{objectFit:"contain"}} onError={e=>e.currentTarget.style.display="none"}/>}
                    <span style={{flex:1,fontSize:11,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.team_name}</span>
                    <span className="hp8-mono" style={{fontSize:11,fontWeight:900,color:"#30d158"}}>{t.ga_pg}</span>
                    <span style={{fontSize:8,color:"var(--text-muted)"}}>GA/g</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// POWER RANKINGS
// ═══════════════════════════════════════════════════════════════
function PowerRankings({ dash, loading }) {
  const [ref,vis] = useReveal(0.04);
  const rankings = dash?.power_rankings?.rankings ?? [];
  const league = dash?.power_rankings?.league ?? "Premier League";
  return (
    <section className="hp8-section">
      <div className="hp8-container">
        <div ref={ref} className="hp8-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp8-eyebrow">— Composite Model</div><h2 className="hp8-title">Power Rankings · {league}</h2></div>
          <span style={{fontSize:10,color:"var(--text-muted)"}}>Elo · Form · Goal Diff · PPG</span>
        </div>
        <div className="hp8-rank-grid">
          {loading ? Array.from({length:8}).map((_,i)=>(
            <div key={i} style={{height:46,borderRadius:14}} className="hp8-skel"/>
          )) : rankings.map((t,i)=>{
            const barW = Math.round(t.power_pct||0);
            const delta = t.rank_delta||0;
            const dc = delta>0?"#30d158":delta<0?"#ff453a":"var(--text-dim)";
            const ds = delta>0?`+${delta}`:delta<0?`${delta}`:"=";
            return (
              <div key={t.team_id||i} className="hp8-team-row" style={{borderRadius:14}}>
                <div className="hp8-mono" style={{fontSize:10,fontWeight:900,color:"#0a84ff",minWidth:20}}>#{i+1}</div>
                {t.logo&&<img src={t.logo} width={20} height={20} style={{objectFit:"contain",flexShrink:0}} onError={e=>e.currentTarget.style.display="none"}/>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,fontWeight:800,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.team_name}</div>
                  <div style={{marginTop:3,height:4,borderRadius:999,background:"var(--border)",overflow:"hidden",maxWidth:140}}>
                    <div style={{width:`${barW}%`,height:"100%",background:"linear-gradient(90deg,#0a84ff,#bf5af2)",borderRadius:999,transition:"width 1s ease"}}/>
                  </div>
                </div>
                <div style={{display:"flex",gap:2}}>{(t.form_letters||[]).slice(-5).map((r,j)=><FormPip key={j} r={r}/>)}</div>
                <div className="hp8-mono" style={{fontSize:11,fontWeight:900,color:"var(--text)",minWidth:30,textAlign:"right"}}>{t.power_pct}%</div>
                <div style={{fontSize:10,fontWeight:800,color:dc,minWidth:18,textAlign:"right"}}>{ds}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// MODEL PERFORMANCE & ACCOUNTABILITY
// — wired to dashboard.performance_summary (home_accountability.py)
//   and dashboard.accountability_summary (home_accountability.py)
// ═══════════════════════════════════════════════════════════════
function AccuracyRing({ pct, color, size=80 }) {
  const r=(size/2)-6, circ=2*Math.PI*r, offset=circ-(pct/100)*circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} stroke="var(--border)" strokeWidth="5" fill="none"/>
      <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth="5" fill="none"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{transform:"rotate(-90deg)",transformOrigin:"50% 50%",transition:"stroke-dashoffset 1s ease"}}/>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{fontFamily:"var(--font-mono)",fontSize:size/5,fontWeight:900,fill:color}}>{pct}%</text>
    </svg>
  );
}

function ModelPerformanceSection({ dash, loading }) {
  const [ref,vis] = useReveal(0.04);
  // Wired to dashboard.performance_summary from home_accountability.py
  const perf = dash?.performance_summary;
  // Wired to dashboard.accountability_summary from home_accountability.py
  const acct = dash?.accountability_summary;

  const overallAcc = perf?.overall_accuracy ?? acct?.hit_rate ?? null;
  const last30Acc  = perf?.last_30_accuracy ?? null;
  const highConfAcc = perf?.confidence_bands?.find(b=>b.bracket?.startsWith("High"))?.accuracy ?? acct?.high_confidence_hit_rate ?? null;
  const verifiedCount = perf?.verified_count ?? acct?.verified_count ?? 0;
  const pendingCount  = perf?.pending_count  ?? acct?.pending_count  ?? 0;
  const recentPreds  = acct?.recent_verified ?? [];
  const rollingAcc   = perf?.rolling_accuracy ?? [];
  const confBands    = perf?.confidence_bands ?? [];
  const avgConf      = perf?.average_confidence ?? null;
  const isInsufficient = perf?.insufficient && acct?.insufficient;

  return (
    <section className="hp8-section">
      <div className="hp8-container">
        <div ref={ref} className="hp8-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div>
            <div className="hp8-eyebrow">— Verified Results Only</div>
            <h2 className="hp8-title">Model Performance & Accountability</h2>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:7,padding:"5px 14px",borderRadius:999,background:"var(--green-soft)",border:"1px solid rgba(48,209,88,.2)"}}>
            <LiveDot color="#30d158" size={6}/>
            <span className="hp8-mono" style={{fontSize:9,fontWeight:900,color:"#30d158",letterSpacing:"0.1em"}}>{verifiedCount} VERIFIED · {pendingCount} PENDING</span>
          </div>
        </div>

        {loading ? (
          <div className="hp8-2col">
            {[0,1].map(i=><div key={i} style={{height:200,borderRadius:20}} className="hp8-skel"/>)}
          </div>
        ) : isInsufficient ? (
          <div className="g-card" style={{padding:"36px 24px",textAlign:"center"}}>
            <div className="g-card-inner">
              <div style={{fontSize:13,color:"var(--text-muted)",marginBottom:6}}>No verified predictions yet.</div>
              <div style={{fontSize:10,color:"var(--text-dim)"}}>Results are automatically checked after matches finish.</div>
            </div>
          </div>
        ) : (
          <div className="hp8-2col">
            {/* Left: accuracy rings + rolling windows + confidence bands */}
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div className="g-card" style={{padding:"20px"}}>
                <div className="g-card-inner">
                  <div className="hp8-perf-acc-row">
                    {[
                      {label:"Overall",val:overallAcc,color:"#30d158",sub:`${verifiedCount} verified`},
                      {label:"Last 30",val:last30Acc,color:"#0a84ff",sub:"Trending"},
                      {label:"High Conf",val:highConfAcc,color:"#ff9f0a",sub:"≥70% picks"},
                    ].map(({label,val,color,sub})=>(
                      <div key={label} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,textAlign:"center"}}>
                        {val!=null
                          ? <AccuracyRing pct={Math.round(val)} color={color}/>
                          : <div style={{width:80,height:80,borderRadius:"50%",border:"5px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"var(--text-dim)"}}>—</div>
                        }
                        <div style={{fontSize:10,fontWeight:800,color:"var(--text)"}}>{label}</div>
                        <div style={{fontSize:8,color:"var(--text-muted)"}}>{sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {rollingAcc.length>0&&(
                <div className="g-card" style={{padding:"18px"}}>
                  <div className="g-card-inner">
                    <div className="hp8-sub-label">Rolling Accuracy</div>
                    {rollingAcc.map((r,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
                        <div style={{fontSize:10,fontWeight:700,color:"var(--text-secondary)",minWidth:55}}>{r.window}</div>
                        <div style={{flex:1,height:6,borderRadius:999,background:"var(--border)",overflow:"hidden"}}>
                          <div style={{width:`${r.accuracy}%`,height:"100%",background:"linear-gradient(90deg,#0a84ff,#30d158)",borderRadius:999,transition:"width 1s ease"}}/>
                        </div>
                        <div className="hp8-mono" style={{fontSize:11,fontWeight:900,color:"#30d158",minWidth:35,textAlign:"right"}}>{r.accuracy}%</div>
                        <div style={{fontSize:8,color:"var(--text-muted)",minWidth:22}}>n={r.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {confBands.length>0&&(
                <div className="g-card" style={{padding:"18px"}}>
                  <div className="g-card-inner">
                    <div className="hp8-sub-label">Accuracy by Confidence Band</div>
                    {confBands.map((b,i)=>{
                      const bc=b.bracket?.startsWith("High")?"#30d158":b.bracket?.startsWith("Med")?"#ff9f0a":"#ff453a";
                      return (
                        <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
                          <div style={{fontSize:9,fontWeight:700,color:bc,minWidth:80,whiteSpace:"nowrap"}}>{b.bracket}</div>
                          <div style={{flex:1,height:6,borderRadius:999,background:"var(--border)",overflow:"hidden"}}>
                            <div style={{width:`${b.accuracy||0}%`,height:"100%",background:bc,borderRadius:999,opacity:.8,transition:"width 1s ease"}}/>
                          </div>
                          <div className="hp8-mono" style={{fontSize:11,fontWeight:900,color:bc,minWidth:35,textAlign:"right"}}>{b.accuracy!=null?`${b.accuracy}%`:"—"}</div>
                          <div style={{fontSize:8,color:"var(--text-muted)",minWidth:28}}>({b.count})</div>
                        </div>
                      );
                    })}
                    {avgConf!=null&&<div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--border)",fontSize:10,color:"var(--text-muted)"}}>
                      Avg confidence: <span className="hp8-mono" style={{fontWeight:900,color:"var(--text)"}}>{avgConf}%</span>
                    </div>}
                  </div>
                </div>
              )}
            </div>
            {/* Right: recent verified predictions */}
            <div className="g-card" style={{padding:"20px"}}>
              <div className="g-card-inner">
                <div className="hp8-sub-label">Recent Verified Predictions</div>
                {recentPreds.length>0 ? recentPreds.slice(0,8).map((p,i)=>{
                  const ic=p.correct;
                  const cc=p.confidence>=70?"#30d158":p.confidence>=55?"#ff9f0a":"#ff453a";
                  return (
                    <div key={i} className="hp8-verified-row">
                      <div style={{width:22,height:22,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:ic?"rgba(48,209,88,0.12)":"rgba(255,69,58,0.12)",border:`1px solid ${ic?"rgba(48,209,88,0.3)":"rgba(255,69,58,0.25)"}`}}>
                        <span style={{fontSize:11,fontWeight:900,color:ic?"#30d158":"#ff453a"}}>{ic?"✓":"✗"}</span>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:700,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.home} {p.score!=="—"?p.score:""} {p.away}</div>
                        <div style={{fontSize:9,color:"var(--text-muted)",marginTop:1}}>
                          Predicted: <span style={{color:ic?"#30d158":"#ff453a",fontWeight:700}}>{p.predicted_outcome}</span>
                          {p.actual_outcome&&<> · Actual: <span style={{fontWeight:700,color:"var(--text-secondary)"}}>{p.actual_outcome}</span></>}
                        </div>
                      </div>
                      <Badge label={`${p.confidence}%`} color={cc} size="sm"/>
                    </div>
                  );
                }) : <div className="hp8-empty">No verified results yet.</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════
// WHY STATINSITE
// ═══════════════════════════════════════════════════════════════
const MODELS = [
  {name:"Dixon-Coles",desc:"Low-score corrected Poisson model with τ-adjustment",color:"#0a84ff"},
  {name:"ELO Ratings",desc:"Dynamic team strength updated after every match",color:"#bf5af2"},
  {name:"xG Modelling",desc:"Expected goals from shot location and context",color:"#30d158"},
  {name:"Monte Carlo",desc:"8,000-run season simulation for final table probabilities",color:"#ff9f0a"},
  {name:"Form Weighting",desc:"Exponentially decayed recent form with injury signal",color:"#ff375f"},
  {name:"Market Edge",desc:"Model probability vs implied odds — value detection",color:"#ff9f0a"},
];
const FACTS = [{val:"9",label:"Competitions"},{val:"500+",label:"Player Profiles"},{val:"8",label:"FPL Tools"},{val:"8K",label:"Simulations/Run"}];

function WhyStatinSite() {
  const [ref,vis] = useReveal(0.04);
  return (
    <section className="hp8-section" style={{paddingBottom:80}}>
      <div className="hp8-container">
        <div ref={ref} className="hp8-section-head" style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(12px)",transition:"all .5s"}}>
          <div><div className="hp8-eyebrow">— Platform</div><h2 className="hp8-title">The Intelligence Stack</h2></div>
        </div>
        <div className="hp8-2col">
          <div>
            <div className="hp8-sub-label">Data Models</div>
            <div className="hp8-models-grid">
              {MODELS.map(m=>(
                <div key={m.name} className="hp8-model-card" style={{"--mc-color":m.color}}>
                  <div className="hp8-mc-dot"/>
                  <div>
                    <div style={{fontSize:12,fontWeight:800,color:"var(--text)",marginBottom:3}}>{m.name}</div>
                    <div style={{fontSize:10,color:"var(--text-muted)",lineHeight:1.45}}>{m.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="hp8-sub-label">Platform Scale</div>
            <div className="hp8-facts-grid">
              {FACTS.map(f=>(
                <div key={f.label} className="g-card g-card--sm hp8-fact-card">
                  <div className="g-card-inner">
                    <div className="hp8-fact-val">{f.val}</div>
                    <div className="hp8-fact-label">{f.label}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="g-card" style={{padding:"16px",marginTop:4}}>
              <div className="g-card-inner" style={{fontSize:10,color:"var(--text-muted)",lineHeight:1.6}}>
                All predictions use real season statistics from API-Football Pro. Model probabilities are not guaranteed outcomes. Win probability, match momentum and shot map data are available per fixture via the match intelligence tools.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Section divider ──────────────────────────────────────────────────────────
function Div() {
  return <div className="hp8-divider"/>;
}

// ═══════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════
export default function HomePage() {
  const { fixtures, loading: ul } = useUpcoming();
  const { dash,     loading: dl } = useDashboard();
  return (
    <div className="hp8-page">
      <style>{STYLES}</style>
      <HeroSection fixtures={fixtures} dash={dash} dash_loading={dl}/>
      <LivePulseStrip fixtures={fixtures}/>
      <TopPredictions dash={dash} loading={dl}/>
      <Div/>
      <TitleRace dash={dash} loading={dl}/>
      <Div/>
      <EdgeBoard dash={dash} loading={dl}/>
      <Div/>
      <CommandGrid fixtures={fixtures} dash={dash} loading={dl||ul}/>
      <Div/>
      <CompetitionHub fixtures={fixtures}/>
      <Div/>
      <FPLHub dash={dash}/>
      <Div/>
      <TrendingPlayers dash={dash} loading={dl}/>
      <Div/>
      <TransferBrief dash={dash} loading={dl}/>
      <Div/>
      <PowerRankings dash={dash} loading={dl}/>
      <Div/>
      <ModelPerformanceSection dash={dash} loading={dl}/>
      <Div/>
      <WhyStatinSite/>
    </div>
  );
}