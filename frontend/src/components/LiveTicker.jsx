// components/LiveTicker.jsx
// Fixed below the navbar (top: 48px). Height ≈ 38px → combined offset = 86px.
// Both values match the .sn-page-wrap padding-top in Navbar.jsx.

import { useState } from "react";

const TICKER_ITEMS = [
  { label: "Salah xG/90",           value: "0.74",  col: "#f2c94c" },
  { label: "Haaland form",          value: "8.2",   col: "#00e09e" },
  { label: "Arsenal win prob",      value: "68%",   col: "#4f9eff" },
  { label: "PPDA elite threshold",  value: "≤7.0",  col: "#2dd4bf" },
  { label: "PSxG top keeper",       value: "+0.18", col: "#b388ff" },
  { label: "Over 2.5 avg",          value: "54%",   col: "#f97316" },
  { label: "Model accuracy",        value: "64%",   col: "#00e09e" },
  { label: "Palmer xA/90",          value: "0.31",  col: "#f472b6" },
  { label: "Mbeumo shots/90",       value: "3.2",   col: "#4f9eff" },
  { label: "Liverpool xG diff",     value: "+0.62", col: "#ef4444" },
  { label: "Watkins ICT",           value: "52.4",  col: "#f2c94c" },
  { label: "BTTS Premier League",   value: "58%",   col: "#2dd4bf" },
];

export default function LiveTicker() {
  const [paused, setPaused] = useState(false);
  // Double items for seamless loop
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <>
      <style>{`
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          width: max-content;
          animation: tickerScroll 44s linear infinite;
        }
        .ticker-track--paused {
          animation-play-state: paused;
        }
      `}</style>

      <div
        style={{
          position:   "fixed",
          top:        48,           /* sits flush below .sn-bar (height: 48px) */
          left:       0,
          right:      0,
          height:     38,
          zIndex:     199,          /* just below navbar z-index: 200 */
          overflow:   "hidden",
          background: "rgba(5, 8, 16, 0.82)",
          backdropFilter: "blur(12px) saturate(180%)",
          WebkitBackdropFilter: "blur(12px) saturate(180%)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display:    "flex",
          alignItems: "center",
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Left fade */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 64,
          background: "linear-gradient(to right, rgba(5,8,16,0.95), transparent)",
          zIndex: 2, pointerEvents: "none",
        }}/>

        {/* Scrolling track */}
        <div className={`ticker-track${paused ? " ticker-track--paused" : ""}`}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "0 24px",
                borderRight: "1px solid rgba(255,255,255,0.06)",
                flexShrink: 0,
                height: 38,
              }}
            >
              {/* Dot */}
              <div style={{
                width: 5, height: 5, borderRadius: "50%",
                background: item.col,
                boxShadow: `0 0 6px ${item.col}88`,
                flexShrink: 0,
              }}/>
              {/* Label */}
              <span style={{
                fontSize: 10, color: "rgba(148,163,184,0.75)",
                fontFamily: "'IBM Plex Sans', 'Inter', sans-serif",
                fontWeight: 600, whiteSpace: "nowrap",
              }}>{item.label}</span>
              {/* Value */}
              <span style={{
                fontSize: 11, fontWeight: 800,
                color: item.col,
                fontFamily: "'DM Mono', 'JetBrains Mono', monospace",
                whiteSpace: "nowrap",
              }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Right fade */}
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 64,
          background: "linear-gradient(to left, rgba(5,8,16,0.95), transparent)",
          zIndex: 2, pointerEvents: "none",
        }}/>
      </div>
    </>
  );
}