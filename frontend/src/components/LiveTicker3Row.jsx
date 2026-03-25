// components/LiveTicker.jsx — Neobrutalist 3-Row Edition
// ─────────────────────────────────────────────────────────
// This version renders as a STATIC block (not fixed/position:fixed).
// It is placed directly inside HomePage between the navbar and hero.
// Remove the old <LiveTicker/> from App.jsx — see instructions below.
//
// Row 1 — LIVE   (red label, live match chips, scrolls left)
// Row 2 — TODAY  (black label, scheduled/result chips, scrolls right)
// Row 3 — NEXT   (yellow label, upcoming chips, scrolls left)
//
// Data still comes from useLiveTicker hook — no backend changes needed.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveTicker } from "../hooks/useLiveTicker";

const Y = "#e8ff47";
const K = "#0a0a0a";
const R = "#ff2744";

/* ── Helpers ─────────────────────────────────────────────── */
function humanTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function humanDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const diff = Math.round((d - Date.now()) / 86400000);
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    if (diff === 0) return `Today ${time}`;
    if (diff === 1) return `Tomorrow ${time}`;
    if (diff > 1 && diff < 7) return `${days[d.getDay()]} ${time}`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ` ${time}`;
  } catch { return ""; }
}

/* ── Chip: LIVE match ────────────────────────────────────── */
function LiveChip({ chip }) {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);

  // Parse "Arsenal 2 – 1 Chelsea 67'" from label
  let home = "", away = "", score = "", min = "";
  const m = (chip.label || "").match(/^(.+?)\s+(\d+[–-]\d+)\s+(.+?)(?:\s+(\d+\+?\d*'))?$/);
  if (m) { home = m[1]; score = m[2].replace("-","–"); away = m[3]; min = m[4] || ""; }
  else { home = chip.label || ""; score = ""; }

  return (
    <span
      onClick={() => navigate("/live")}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 0,
        margin: "0 6px", height: 26, flexShrink: 0,
        border: `2px solid ${K}`,
        background: hov ? K : "#fff",
        cursor: "pointer", transition: "background 0.12s",
        overflow: "hidden",
      }}
    >
      <span style={{ padding: "0 8px", fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, fontWeight: 700, color: hov ? Y : K, transition: "color 0.12s", whiteSpace: "nowrap" }}>{home}</span>
      <span style={{
        padding: "0 8px", background: hov ? Y : K, color: hov ? K : Y,
        fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, letterSpacing: 1,
        borderLeft: `2px solid ${K}`, borderRight: `2px solid ${K}`,
        display: "flex", alignItems: "center",
        transition: "background 0.12s, color 0.12s",
      }}>{score || "v"}</span>
      <span style={{ padding: "0 8px", fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, fontWeight: 700, color: hov ? Y : K, transition: "color 0.12s", whiteSpace: "nowrap" }}>{away}</span>
      {min && (
        <span style={{
          padding: "0 6px", fontFamily: "'DM Mono',monospace", fontSize: 8,
          color: R, letterSpacing: "0.08em",
          borderLeft: `1px solid rgba(0,0,0,0.15)`,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: R, animation: "nbTkBlink 1.1s step-start infinite", flexShrink: 0 }}/>
          {min}
        </span>
      )}
    </span>
  );
}

/* ── Chip: TODAY / result ─────────────────────────────────── */
function TodayChip({ chip }) {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);
  const label = chip.label || "";
  const detail = chip.detail || "";

  return (
    <span
      onClick={() => navigate("/predictions/premier-league")}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 0,
        margin: "0 6px", height: 26, flexShrink: 0,
        border: `2px solid ${hov ? K : "rgba(0,0,0,0.18)"}`,
        background: hov ? K : "transparent",
        cursor: "pointer", transition: "all 0.12s", overflow: "hidden",
      }}
    >
      <span style={{ padding: "0 10px", fontFamily: "'Space Grotesk',sans-serif", fontSize: 10, fontWeight: 700, color: hov ? Y : "rgba(0,0,0,0.6)", whiteSpace: "nowrap", transition: "color 0.12s" }}>{label}</span>
      {detail && (
        <span style={{
          padding: "0 8px", fontFamily: "'DM Mono',monospace", fontSize: 8,
          color: hov ? "rgba(232,255,71,0.5)" : "rgba(0,0,0,0.35)",
          borderLeft: `1px solid ${hov ? "rgba(232,255,71,0.15)" : "rgba(0,0,0,0.12)"}`,
          letterSpacing: "0.06em", whiteSpace: "nowrap", transition: "color 0.12s",
        }}>{detail}</span>
      )}
    </span>
  );
}

/* ── Chip: UPCOMING ─────────────────────────────────────── */
function NextChip({ chip }) {
  const navigate = useNavigate();
  const [hov, setHov] = useState(false);

  const parts = (chip.label || "").split(" vs ");
  const home = parts[0] || "";
  const away = parts[1] || "";
  const time = chip.detail ? humanDate(chip.detail.split(" · ")[0]?.trim()) : "";

  return (
    <span
      onClick={() => navigate("/predictions/premier-league")}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 0,
        margin: "0 6px", height: 26, flexShrink: 0,
        border: `2px solid ${K}`,
        background: hov ? Y : K,
        cursor: "pointer", transition: "background 0.12s", overflow: "hidden",
      }}
    >
      <span style={{ padding: "0 8px", fontFamily: "'Space Grotesk',sans-serif", fontSize: 10, fontWeight: 700, color: hov ? K : "rgba(232,255,71,0.6)", whiteSpace: "nowrap", transition: "color 0.12s" }}>{home}</span>
      <span style={{
        padding: "0 6px",
        fontFamily: "'Bebas Neue',sans-serif", fontSize: 13,
        color: hov ? K : Y,
        borderLeft: `1px solid ${hov ? "rgba(0,0,0,0.2)" : "rgba(232,255,71,0.15)"}`,
        borderRight: `1px solid ${hov ? "rgba(0,0,0,0.2)" : "rgba(232,255,71,0.15)"}`,
        transition: "color 0.12s",
      }}>VS</span>
      <span style={{ padding: "0 8px", fontFamily: "'Space Grotesk',sans-serif", fontSize: 10, fontWeight: 700, color: hov ? K : "rgba(232,255,71,0.6)", whiteSpace: "nowrap", transition: "color 0.12s" }}>{away}</span>
      {time && (
        <span style={{ padding: "0 8px", fontFamily: "'DM Mono',monospace", fontSize: 8, color: hov ? "rgba(0,0,0,0.4)" : "rgba(232,255,71,0.4)", letterSpacing: "0.1em", whiteSpace: "nowrap", transition: "color 0.12s" }}>{time}</span>
      )}
    </span>
  );
}

/* ── Separator ───────────────────────────────────────────── */
function Sep({ dark }) {
  return <span style={{ width: 2, height: 14, background: dark ? "rgba(0,0,0,0.12)" : "rgba(232,255,71,0.15)", flexShrink: 0, display: "inline-block", margin: "0 2px" }}/>;
}

/* ── Single ticker row ───────────────────────────────────── */
function TickerRow({ label, labelBg, labelColor, chips, ChipComponent, direction = "left", speed = 26, borderColor = K, isLast = false }) {
  const [paused, setPaused] = useState(false);
  const all = [...chips, ...chips]; // duplicate for seamless loop
  const animName = direction === "right" ? "nbTkScrollR" : "nbTkScrollL";

  return (
    <div
      style={{
        height: 38, display: "flex", alignItems: "stretch", overflow: "hidden",
        borderBottom: isLast ? "none" : `2px solid ${K}`,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Label */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center",
        padding: "0 14px", minWidth: 80, justifyContent: "center",
        background: labelBg, color: labelColor,
        fontFamily: "'DM Mono',monospace", fontSize: 8,
        letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700,
        borderRight: `3px solid ${K}`, gap: 6,
      }}>
        {label === "LIVE" && (
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff", animation: "nbTkBlink 1.1s step-start infinite", flexShrink: 0 }}/>
        )}
        {label}
      </div>

      {/* Scrolling track */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", alignItems: "center" }}>
        {chips.length > 0 ? (
          <div style={{
            display: "inline-flex", alignItems: "center",
            whiteSpace: "nowrap", willChange: "transform",
            animation: `${animName} ${speed}s linear infinite`,
            animationPlayState: paused ? "paused" : "running",
          }}>
            {all.map((chip, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <ChipComponent chip={chip} />
                {i < all.length - 1 && <Sep dark={labelBg !== K} />}
              </span>
            ))}
          </div>
        ) : (
          <span style={{ padding: "0 16px", fontFamily: "'DM Mono',monospace", fontSize: 9, color: labelBg === K ? "rgba(232,255,71,0.2)" : "rgba(0,0,0,0.2)", letterSpacing: "0.1em" }}>
            No matches right now
          </span>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main export — static 3-row ticker block
   Place this directly in HomePage AFTER the navbar,
   NOT in App.jsx (remove the old fixed LiveTicker from App.jsx)
══════════════════════════════════════════════════════════ */
export default function LiveTicker3Row() {
  const { chips, loading } = useLiveTicker(75_000);

  // Split chips into 3 buckets
  const liveChips     = chips.filter(c => c.type === "live_score");
  const scheduledChips = chips.filter(c => c.type !== "live_score" && c.type !== "upcoming");
  const upcomingChips = chips.filter(c => c.type === "upcoming");

  // Fallback: if a bucket is empty, use upcoming chips to fill it
  const row1 = liveChips.length > 0 ? liveChips : upcomingChips.slice(0, 5);
  const row2 = upcomingChips.length > 0 ? upcomingChips : chips.slice(0, 5);
  const row3 = upcomingChips.length > 3 ? upcomingChips.slice(3) : chips.slice(0, 5);

  if (loading && chips.length === 0) {
    return (
      <div style={{ borderTop: `3px solid ${K}`, borderBottom: `4px solid ${K}` }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            height: 38, display: "flex", alignItems: "center",
            borderBottom: i < 2 ? `2px solid ${K}` : "none",
            background: i === 0 ? R : i === 1 ? K : Y,
            opacity: 0.15,
          }}/>
        ))}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes nbTkScrollL {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes nbTkScrollR {
          0%   { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        @keyframes nbTkBlink {
          50% { opacity: 0; }
        }
      `}</style>

      <div style={{ borderTop: `3px solid ${K}`, borderBottom: `4px solid ${K}` }}>
        <TickerRow
          label="LIVE"
          labelBg={R} labelColor="#fff"
          chips={row1} ChipComponent={LiveChip}
          direction="left" speed={24}
        />
        <TickerRow
          label="TODAY"
          labelBg={K} labelColor={Y}
          chips={row2} ChipComponent={TodayChip}
          direction="right" speed={30}
        />
        <TickerRow
          label="NEXT"
          labelBg={Y} labelColor={K}
          chips={row3} ChipComponent={NextChip}
          direction="left" speed={20}
          isLast
        />
      </div>
    </>
  );
}