/*
 * StatinSite — iOS Glass Design System v2
 * Apple-inspired: depth, motion, clarity, glassmorphism
 * Light + Dark via [data-theme] on <html>
 * Drop: frontend/src/index.css
 */

/* ══════════════════════════════════════════════════════════
   FONTS
══════════════════════════════════════════════════════════ */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

/* ══════════════════════════════════════════════════════════
   DARK THEME (default)
══════════════════════════════════════════════════════════ */
:root, [data-theme="dark"] {
  --bg:              #0a0a0a;
  --bg-secondary:    #111111;
  --bg-tertiary:     #1a1a1a;
  --bg-card:         rgba(18, 18, 18, 0.92);
  --bg-glass:        rgba(255, 255, 255, 0.048);
  --bg-glass-strong: rgba(255, 255, 255, 0.08);
  --bg-hover:        rgba(255, 255, 255, 0.055);
  --bg-active:       rgba(255, 255, 255, 0.09);
  --bg-input:        rgba(255, 255, 255, 0.06);

  --text:            rgba(255, 255, 255, 0.92);
  --text-secondary:  rgba(255, 255, 255, 0.60);
  --text-muted:      rgba(255, 255, 255, 0.36);
  --text-dim:        rgba(255, 255, 255, 0.18);
  --text-soft:       rgba(255, 255, 255, 0.78);
  --text-mid:        rgba(255, 255, 255, 0.28);

  --border:          rgba(255, 255, 255, 0.08);
  --border-soft:     rgba(255, 255, 255, 0.05);
  --border-strong:   rgba(255, 255, 255, 0.14);
  --border-focus:    rgba(10, 132, 255, 0.55);

  --glass-bg:        rgba(255, 255, 255, 0.04);
  --glass-border:    rgba(255, 255, 255, 0.10);
  --glass-blur:      blur(20px) saturate(180%);

  --blue:            #0a84ff;
  --blue-soft:       rgba(10, 132, 255, 0.15);
  --blue-glow:       rgba(10, 132, 255, 0.35);
  --blue-dark:       #1d6fa4;
  --green:           #30d158;
  --green-bright:    #30d158;
  --green-soft:      rgba(48, 209, 88, 0.15);
  --amber:           #ff9f0a;
  --amber-bright:    #ff9f0a;
  --amber-soft:      rgba(255, 159, 10, 0.15);
  --red:             #ff453a;
  --red-soft:        rgba(255, 69, 58, 0.15);
  --red-live:        #ff453a;
  --purple:          #bf5af2;
  --purple-soft:     rgba(191, 90, 242, 0.15);
  --cyan:            #64d2ff;
  --pink:            #ff375f;
  --orange:          #ff9f0a;

  --shadow-card:     0 2px 20px rgba(0,0,0,.45), 0 1px 3px rgba(0,0,0,.30);
  --shadow-hover:    0 8px 40px rgba(0,0,0,.60), 0 0 0 1px rgba(255,255,255,.08);
  --shadow-lift:     0 20px 60px rgba(0,0,0,.55), 0 4px 16px rgba(0,0,0,.40);
  --shadow-glow-blue:   0 0 20px rgba(10,132,255,.30);
  --shadow-glow-green:  0 0 20px rgba(48,209,88,.30);
  --shadow-glow-amber:  0 0 20px rgba(255,159,10,.30);
  --shadow-glow-red:    0 0 20px rgba(255,69,58,.30);

  --scrollbar-thumb: rgba(255,255,255,.10);
  --scrollbar-hover: rgba(255,255,255,.20);

  --table-bg:           rgba(255,255,255,.025);
  --table-header-bg:    rgba(255,255,255,.04);
  --table-header-color: rgba(255,255,255,.38);
  --table-border:       rgba(255,255,255,.06);
  --table-row-hover:    rgba(255,255,255,.04);
  --table-sticky-bg:    #0d0d0d;

  --pill-bg:            rgba(255,255,255,.05);
  --pill-border:        rgba(255,255,255,.10);
  --pill-color:         rgba(255,255,255,.45);
  --pill-active-bg:     rgba(10,132,255,.18);
  --pill-active-border: rgba(10,132,255,.50);
  --pill-active-color:  #0a84ff;
  --input-bg:           rgba(255,255,255,.06);
  --input-border:       rgba(255,255,255,.10);
  --input-color:        rgba(255,255,255,.88);

  --tooltip-bg:     rgba(10,12,20,.97);
  --tooltip-border: rgba(10,132,255,.30);
  --modal-bg:       #0d1424;
  --modal-border:   rgba(10,132,255,.20);
  --modal-overlay:  rgba(0,0,0,.72);

  --orb-1: radial-gradient(ellipse 600px 400px at 20% -10%, rgba(10,132,255,.12), transparent);
  --orb-2: radial-gradient(ellipse 500px 350px at 80% 110%, rgba(48,209,88,.08), transparent);
}

/* ══════════════════════════════════════════════════════════
   LIGHT THEME — iOS white/frosted
══════════════════════════════════════════════════════════ */
[data-theme="light"] {
  --bg:              #f5f5f7;
  --bg-secondary:    #ffffff;
  --bg-tertiary:     #f0f0f2;
  --bg-card:         rgba(255,255,255,.92);
  --bg-glass:        rgba(255,255,255,.72);
  --bg-glass-strong: rgba(255,255,255,.92);
  --bg-hover:        rgba(0,0,0,.04);
  --bg-active:       rgba(0,0,0,.07);
  --bg-input:        rgba(0,0,0,.04);

  --text:            rgba(0,0,0,.88);
  --text-secondary:  rgba(0,0,0,.55);
  --text-muted:      rgba(0,0,0,.38);
  --text-dim:        rgba(0,0,0,.20);
  --text-soft:       rgba(0,0,0,.72);
  --text-mid:        rgba(0,0,0,.30);

  --border:          rgba(0,0,0,.10);
  --border-soft:     rgba(0,0,0,.06);
  --border-strong:   rgba(0,0,0,.18);
  --border-focus:    rgba(0,122,255,.55);

  --glass-bg:        rgba(255,255,255,.72);
  --glass-border:    rgba(0,0,0,.10);
  --glass-blur:      blur(20px) saturate(200%);

  --blue:            #007aff;
  --blue-soft:       rgba(0,122,255,.12);
  --blue-glow:       rgba(0,122,255,.25);
  --blue-dark:       #005ec4;
  --green:           #34c759;
  --green-bright:    #34c759;
  --green-soft:      rgba(52,199,89,.12);
  --amber:           #ff9500;
  --amber-bright:    #ff9500;
  --amber-soft:      rgba(255,149,0,.12);
  --red:             #ff3b30;
  --red-soft:        rgba(255,59,48,.12);
  --red-live:        #ff3b30;
  --purple:          #af52de;
  --purple-soft:     rgba(175,82,222,.12);
  --cyan:            #32ade6;
  --pink:            #ff2d55;
  --orange:          #ff9500;

  --shadow-card:     0 2px 12px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.06);
  --shadow-hover:    0 8px 32px rgba(0,0,0,.13), 0 2px 8px rgba(0,0,0,.08);
  --shadow-lift:     0 20px 48px rgba(0,0,0,.16), 0 4px 12px rgba(0,0,0,.10);
  --shadow-glow-blue:   0 0 16px rgba(0,122,255,.20);
  --shadow-glow-green:  0 0 16px rgba(52,199,89,.20);
  --shadow-glow-amber:  0 0 16px rgba(255,149,0,.20);
  --shadow-glow-red:    0 0 16px rgba(255,59,48,.20);

  --scrollbar-thumb: rgba(0,0,0,.14);
  --scrollbar-hover: rgba(0,0,0,.26);

  --table-bg:           rgba(255,255,255,.95);
  --table-header-bg:    rgba(0,0,0,.04);
  --table-header-color: rgba(0,0,0,.50);
  --table-border:       rgba(0,0,0,.09);
  --table-row-hover:    rgba(0,122,255,.04);
  --table-sticky-bg:    #ffffff;

  --pill-bg:            rgba(0,0,0,.04);
  --pill-border:        rgba(0,0,0,.12);
  --pill-color:         rgba(0,0,0,.45);
  --pill-active-bg:     rgba(0,122,255,.10);
  --pill-active-border: rgba(0,122,255,.40);
  --pill-active-color:  #007aff;
  --input-bg:           rgba(0,0,0,.04);
  --input-border:       rgba(0,0,0,.12);
  --input-color:        rgba(0,0,0,.88);

  --tooltip-bg:     rgba(255,255,255,.97);
  --tooltip-border: rgba(0,122,255,.25);
  --modal-bg:       #ffffff;
  --modal-border:   rgba(0,0,0,.12);
  --modal-overlay:  rgba(0,0,0,.40);

  --orb-1: radial-gradient(ellipse 600px 400px at 20% -10%, rgba(0,122,255,.07), transparent);
  --orb-2: radial-gradient(ellipse 500px 350px at 80% 110%, rgba(52,199,89,.05), transparent);
}

/* ══════════════════════════════════════════════════════════
   SMOOTH THEME TRANSITIONS
══════════════════════════════════════════════════════════ */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0; padding: 0;
  transition:
    background-color 0.22s cubic-bezier(0.4,0,0.2,1),
    border-color     0.22s cubic-bezier(0.4,0,0.2,1),
    color            0.18s cubic-bezier(0.4,0,0.2,1),
    box-shadow       0.22s cubic-bezier(0.4,0,0.2,1);
}
/* Never transition SVG internals — kills animations */
svg *, canvas { transition: none !important; }

/* ══════════════════════════════════════════════════════════
   NON-COLOUR TOKENS
══════════════════════════════════════════════════════════ */
:root {
  --r-xs:   6px; --r-sm:  10px; --r-md: 14px;
  --r-lg:  18px; --r-xl:  22px; --r-2xl: 28px; --r-pill: 999px;
  --page-px: 20px; --page-max: 1280px;
  --ease: cubic-bezier(0.22,1,0.36,1);
  --ease-spring: cubic-bezier(0.34,1.56,0.64,1);
  --t-fast: 0.13s; --t-med: 0.22s; --t-slow: 0.36s;
  --font-body:    -apple-system, 'Inter', system-ui, sans-serif;
  --font-display: -apple-system, 'Inter', system-ui, sans-serif;
  --font-mono:    'SF Mono','JetBrains Mono','Fira Code',monospace;
}

/* ══════════════════════════════════════════════════════════
   BASE
══════════════════════════════════════════════════════════ */
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
body {
  background: var(--bg); color: var(--text);
  font-family: var(--font-body); font-size: 14px; line-height: 1.6;
  min-height: 100vh; overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
#root { min-height: 100vh; position: relative; z-index: 1; }
.app-shell { display: flex; flex-direction: column; min-height: 100vh; }

h1,h2,h3,h4,h5,h6 {
  font-family: var(--font-display); font-weight: 700;
  letter-spacing: -0.025em; color: var(--text); line-height: 1.2;
}
h1 { font-size: clamp(22px,4vw,30px); }
h2 { font-size: clamp(18px,3vw,22px); }
h3 { font-size: clamp(14px,2.5vw,17px); }
p  { color: var(--text-secondary); line-height: 1.65; }
a  { color: inherit; text-decoration: none; }
button, input, select, textarea { font-family: var(--font-body); color: var(--text); }

/* Scrollbar */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: var(--r-pill); }
::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-hover); }
* { scrollbar-width: thin; scrollbar-color: var(--scrollbar-thumb) transparent; }

/* ══════════════════════════════════════════════════════════
   PAGE LAYOUT
══════════════════════════════════════════════════════════ */
.sn-page-wrap {
  margin-left: 220px; min-height: 100vh;
  display: flex; flex-direction: column;
  background: var(--bg);
  transition: margin-left 0.25s cubic-bezier(0.4,0,0.2,1), background 0.25s;
}
@media (max-width: 820px) {
  .sn-page-wrap { margin-left: 0 !important; padding-top: 52px; padding-bottom: 72px; }
}
.sn-content { max-width: var(--page-max); margin: 0 auto; padding: 0 var(--page-px); }
.sn-section { margin-bottom: 48px; }
.sn-section-head { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 20px; }
.sn-section-bar {
  width: 3px; height: 36px; border-radius: 2px; flex-shrink: 0; margin-top: 2px;
  background: linear-gradient(180deg, var(--blue), transparent);
}
.sn-section-bar--green  { background: linear-gradient(180deg, var(--green), transparent); }
.sn-section-bar--amber  { background: linear-gradient(180deg, var(--amber), transparent); }
.sn-section-bar--red    { background: linear-gradient(180deg, var(--red), transparent); }
.sn-section-bar--purple { background: linear-gradient(180deg, var(--purple), transparent); }
.sn-section-title { font-size: 18px; font-weight: 700; color: var(--text); letter-spacing: -0.02em; margin: 0; }
.sn-section-sub { font-size: 11px; color: var(--text-muted); font-weight: 600; margin: 2px 0 0; }
.sn-section-count { font-size: 10px; color: var(--text-dim); font-weight: 700; margin-left: auto; margin-top: 6px; }

/* ══════════════════════════════════════════════════════════
   iOS GLASS CARD SYSTEM
══════════════════════════════════════════════════════════ */
.sn-card {
  border-radius: var(--r-xl);
  background: var(--bg-card);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}
.sn-card--glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
}
.sn-card--interactive { cursor: pointer; }
.sn-card--interactive:hover {
  transform: translateY(-4px) scale(1.005);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-lift);
}
.sn-card--interactive:active { transform: translateY(-1px) scale(0.995); }

.sn-glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border); border-radius: var(--r-xl);
}
.sn-panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r-xl); box-shadow: var(--shadow-card); }
.sn-divider { height: 1px; background: var(--border); border: none; }
.sn-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 18px; border-radius: var(--r-md);
  font-size: 13px; font-weight: 600; letter-spacing: -0.01em;
  border: none; cursor: pointer; font-family: inherit;
}
.sn-btn:active { transform: scale(0.96); }
.sn-btn--primary { background: var(--blue); color: #fff; box-shadow: 0 2px 12px var(--blue-glow); }
.sn-btn--primary:hover { filter: brightness(1.1); }
.sn-btn--ghost { background: var(--bg-glass); color: var(--text); border: 1px solid var(--border); }
.sn-btn--ghost:hover { background: var(--bg-hover); border-color: var(--border-strong); }

/* ══════════════════════════════════════════════════════════
   PAGE SHELL (used by FplTablePage, SeasonSimulator, etc)
══════════════════════════════════════════════════════════ */
.page-shell {
  min-height: 100vh; padding: 28px 24px;
  background: var(--bg); color: var(--text);
}
.page-content-wide { max-width: 100%; }
.page-title-left { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.03em; margin-bottom: 4px; }
.page-title { font-size: 24px; font-weight: 800; color: var(--text); letter-spacing: -0.03em; margin-bottom: 8px; }
.panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--r-xl); padding: 20px; box-shadow: var(--shadow-card); }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { background: var(--table-header-bg); color: var(--table-header-color); padding: 10px 14px; font-size: 11px; font-weight: 700; border-bottom: 1.5px solid var(--table-border); text-align: left; letter-spacing: 0.06em; text-transform: uppercase; }
.data-table td { padding: 10px 14px; color: var(--text); border-bottom: 1px solid var(--table-border); font-size: 13px; }
.data-table tbody tr:hover td { background: var(--bg-hover); }

/* ══════════════════════════════════════════════════════════
   FPL TABLE — full theme tokens
══════════════════════════════════════════════════════════ */
.fpl-tbl-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: var(--r-md); }
.fpl-tbl-wrap::-webkit-scrollbar { height: 4px; }
.fpl-tbl-wrap::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }

.fpl-tbl { border-collapse: collapse; width: 100%; }
.fpl-tbl th {
  background: var(--table-header-bg) !important;
  color: var(--table-header-color) !important;
  font-size: 11px; font-weight: 700; padding: 8px 10px;
  border-bottom: 1.5px solid var(--table-border) !important;
  position: sticky; top: 0; z-index: 2; white-space: nowrap; letter-spacing: 0.04em;
}
.fpl-tbl td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--table-border) !important;
  font-size: 12px; color: var(--text) !important;
}
.fpl-tbl tr:hover td { background: var(--table-row-hover) !important; }
.fpl-tbl tbody tr { cursor: pointer; }
.fpl-tbl tbody tr:hover { transform: translateY(-2px); box-shadow: var(--shadow-hover); position: relative; z-index: 1; }

.sticky-player { position: sticky !important; left: 0; z-index: 1 !important; background: var(--table-sticky-bg) !important; }
.sticky-player-head { background: var(--table-header-bg) !important; z-index: 3 !important; }

/* Light: thicker table borders */
[data-theme="light"] .fpl-tbl th { border-bottom: 2px solid rgba(0,0,0,.16) !important; }
[data-theme="light"] .fpl-tbl td { border-bottom: 1px solid rgba(0,0,0,.08) !important; }

/* FPL filter pills */
.fpl-pill {
  padding: 6px 12px; border-radius: var(--r-pill);
  font-size: 11px; font-weight: 700; cursor: pointer;
  border: 1px solid var(--pill-border);
  background: var(--pill-bg); color: var(--pill-color);
  font-family: inherit; white-space: nowrap; min-height: 36px;
}
.fpl-pill.active { background: var(--pill-active-bg); border-color: var(--pill-active-border); color: var(--pill-active-color); }
.fpl-pill:hover { background: var(--bg-hover); }

/* FPL tooltip */
.fpl-tip {
  position: fixed; z-index: 9999; pointer-events: none;
  background: var(--tooltip-bg) !important;
  border: 1px solid var(--tooltip-border) !important;
  border-radius: var(--r-md); padding: 12px 16px;
  min-width: 220px; box-shadow: var(--shadow-lift);
  animation: fplTipIn 140ms var(--ease);
}
@keyframes fplTipIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }

/* FPL modal */
.fpl-modal-bg {
  position: fixed; inset: 0; z-index: 10000;
  background: var(--modal-overlay) !important;
  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
}
.fpl-modal {
  background: var(--modal-bg) !important;
  border: 1px solid var(--modal-border) !important;
  border-radius: var(--r-2xl); padding: 28px 28px 24px;
  width: min(560px,94vw); max-height: 88vh; overflow-y: auto;
  position: relative; box-shadow: var(--shadow-lift);
}
.fpl-modal::-webkit-scrollbar { width: 4px; }
.fpl-modal::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }

/* ══════════════════════════════════════════════════════════
   HOW IT WORKS — bg only, cards stay intact
══════════════════════════════════════════════════════════ */
.hiw-page { background: var(--bg) !important; color: var(--text) !important; min-height: 100vh; }
[data-theme="light"] .hiw-page { background: #f5f5f7 !important; }

/* ══════════════════════════════════════════════════════════
   SEASON SIMULATOR
══════════════════════════════════════════════════════════ */
.season-sim-page { min-height: 100vh; padding: 32px 24px; background: var(--bg); color: var(--text); }
.season-sim-wrap { background: var(--table-bg); border: 1px solid var(--border); border-radius: var(--r-lg); overflow: hidden; box-shadow: var(--shadow-card); }
.season-sim-table { width: 100%; border-collapse: collapse; }
.season-sim-table th { background: var(--table-header-bg); color: var(--table-header-color); font-size: 11px; font-weight: 700; padding: 10px 14px; text-align: left; border-bottom: 1.5px solid var(--table-border); letter-spacing: 0.06em; text-transform: uppercase; }
.season-sim-table td { padding: 10px 14px; color: var(--text); border-bottom: 1px solid var(--table-border); font-size: 13px; }
.season-sim-table tbody tr:hover td { background: var(--bg-hover); }

/* ══════════════════════════════════════════════════════════
   HOMEPAGE hp6-* light-mode overrides (bg/border only)
══════════════════════════════════════════════════════════ */
[data-theme="light"] .hp6-comp-card { background: rgba(255,255,255,.92) !important; border-color: rgba(0,0,0,.08) !important; }
[data-theme="light"] .hp6-player-card { background: rgba(255,255,255,.92) !important; border-color: rgba(0,0,0,.08) !important; }
[data-theme="light"] .hp6-model-card { background: rgba(0,0,0,.025) !important; border-color: rgba(0,0,0,.06) !important; }
[data-theme="light"] .hp6-fact-card { background: rgba(255,255,255,.92) !important; border-color: rgba(0,0,0,.08) !important; }
[data-theme="light"] .hp6-capt-row { background: rgba(0,0,0,.025) !important; border-color: rgba(0,0,0,.06) !important; }
[data-theme="light"] .hp6-platform-note { background: rgba(0,0,0,.025) !important; border-color: rgba(0,0,0,.06) !important; }
[data-theme="light"] .hp6-cc-feat { background: rgba(0,0,0,.04) !important; border-color: rgba(0,0,0,.08) !important; color: rgba(0,0,0,.45) !important; }

/* ══════════════════════════════════════════════════════════
   SITE FOOTER
══════════════════════════════════════════════════════════ */
.sn-site-footer {
  position: relative; z-index: 10; flex-shrink: 0;
  margin-left: 220px;
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
  border-top: 1px solid var(--border);
  font-family: var(--font-body);
  transition: margin-left 0.25s var(--ease), background 0.22s, border-color 0.22s;
}
@media (max-width: 820px) { .sn-site-footer { margin-left: 0 !important; margin-bottom: 64px; } }
.sn-footer-inner { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 0 28px; height: 52px; }
.sn-footer-brand { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.sn-footer-brand-name { font-size: 13px; font-weight: 700; color: var(--text-secondary); letter-spacing: -0.03em; }
.sn-footer-tagline { font-size: 11px; color: var(--text-muted); }
.sn-footer-built { display: flex; align-items: center; gap: 8px; padding: 6px 16px; background: var(--bg-glass); border: 1px solid var(--border); border-radius: var(--r-pill); flex-shrink: 0; }
.sn-footer-built-label { font-size: 10px; color: var(--text-muted); letter-spacing: 0.1em; text-transform: uppercase; }
.sn-footer-built-name { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.sn-footer-copy { font-size: 11px; color: var(--text-dim); flex-shrink: 0; white-space: nowrap; }
@media (max-width: 600px) { .sn-footer-tagline, .sn-footer-copy { display: none; } }
.site-footer { display: none; }

/* ══════════════════════════════════════════════════════════
   KEYFRAMES
══════════════════════════════════════════════════════════ */
@keyframes sn-fade-up { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes sn-fade-in { from{opacity:0} to{opacity:1} }
@keyframes sn-scale-in { from{opacity:0;transform:scale(0.94)} to{opacity:1;transform:scale(1)} }
@keyframes sn-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
@keyframes sn-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
.sn-anim-fade-up  { animation: sn-fade-up  0.36s var(--ease) both; }
.sn-anim-fade-in  { animation: sn-fade-in  0.28s var(--ease) both; }
.sn-anim-scale-in { animation: sn-scale-in 0.28s var(--ease) both; }