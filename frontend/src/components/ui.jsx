// ═══════════════════════════════════════════════════════════════════════════
// src/components/ui.jsx  —  StatinSite shared UI primitives  v1
// ═══════════════════════════════════════════════════════════════════════════
//
// Atomic components duplicated across 15+ page files.
// Pull from here instead of redefining in each page.
//
// Previously found as inline definitions named:
//   Skel / Sk / Skeleton — in almost every page file
//   FormPip / Form / FP  — in HomePage, PredictionsPage, LeaguePage, etc.
//   Badge / Bx / Lbadge  — in HomePage, PlayerProfile, PlayerInsightPage
//   Dot                  — in HomePage, LiveTicker
//   Empty                — in HomePage, PredictionsPage
//   ErrBox               — in HomePage
//
// Usage:
//   import { Skeleton, FormPip, Badge, LiveDot, Empty, ErrBox } from "@/components/ui";
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { FORM_COLORS, COLORS } from "@/constants";

// ── Skeleton loading block ───────────────────────────────────────────────────
// Renders an animated shimmer placeholder. Use while data is loading.
//
// Usage:
//   <Skeleton width="60%" height={12} radius={6} />
export function Skeleton({ width = "100%", height = 13, radius = 6, style = {} }) {
  return (
    <div
      style={{
        display: "block",
        width,
        height,
        borderRadius: radius,
        background: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)",
        backgroundSize: "200% 100%",
        animation: "ss-shimmer 1.7s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

// Inject keyframes once
if (typeof document !== "undefined" && !document.getElementById("ss-ui-kf")) {
  const s = document.createElement("style");
  s.id = "ss-ui-kf";
  s.textContent = `
    @keyframes ss-shimmer {
      0%   { background-position: 200% 0 }
      100% { background-position: -200% 0 }
    }
    @keyframes ss-pulse {
      0%, 100% { opacity: 1; transform: scale(1) }
      50%       { opacity: .4; transform: scale(.75) }
    }
  `;
  document.head.appendChild(s);
}

// ── FormPip ──────────────────────────────────────────────────────────────────
// Single W/D/L result pill. Use in a row for a form string.
//
// Usage:
//   <div style={{ display: "flex", gap: 3 }}>
//     {"WWDLW".split("").map((r, i) => <FormPip key={i} result={r} />)}
//   </div>
export function FormPip({ result, size = 14 }) {
  const fc = FORM_COLORS[result] ?? FORM_COLORS.D;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.5,
        fontWeight: 900,
        flexShrink: 0,
        background: fc.bg,
        border: `1px solid ${fc.border}`,
        color: fc.text,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {result}
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────
// Inline colored label chip. Use for position tags, confidence levels, etc.
//
// Usage:
//   <Badge label="78%" color="#30d158" />
//   <Badge label="High" color="#30d158" size="sm" />
export function Badge({ label, color = COLORS.blue, size = "sm" }) {
  const pad  = size === "sm" ? "2px 8px"  : "4px 12px";
  const fs   = size === "sm" ? 9          : 11;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: pad,
        borderRadius: 999,
        fontSize: fs,
        fontWeight: 800,
        letterSpacing: ".04em",
        whiteSpace: "nowrap",
        background: `${color}18`,
        border: `1px solid ${color}30`,
        color,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {label}
    </span>
  );
}

// ── LiveDot ──────────────────────────────────────────────────────────────────
// Animated pulsing dot. Used for live match indicators.
//
// Usage:
//   <LiveDot color="#ff453a" size={6} />
export function LiveDot({ color = "#ff453a", size = 6 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: color,
        boxShadow: `0 0 ${size * 1.5}px ${color}`,
        animation: "ss-pulse 1.9s ease-in-out infinite",
      }}
    />
  );
}

// ── Empty ────────────────────────────────────────────────────────────────────
// Empty state placeholder with optional message.
//
// Usage:
//   <Empty msg="No predictions available" />
export function Empty({ msg = "No data available", style = {} }) {
  return (
    <div
      style={{
        padding: "28px",
        textAlign: "center",
        fontSize: 12,
        color: "rgba(255,255,255,0.22)",
        borderRadius: 16,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        fontFamily: "'Inter', system-ui, sans-serif",
        ...style,
      }}
    >
      {msg}
    </div>
  );
}

// ── ErrBox ───────────────────────────────────────────────────────────────────
// Error state display. Shows a red-tinted card with the error message.
//
// Usage:
//   <ErrBox msg="Failed to load standings" />
export function ErrBox({ msg, style = {} }) {
  return (
    <div
      style={{
        padding: "18px 20px",
        borderRadius: 14,
        background: "rgba(255,69,58,.07)",
        border: "1px solid rgba(255,69,58,.18)",
        fontSize: 11,
        color: "#ff453a",
        fontFamily: "'Inter', system-ui, sans-serif",
        ...style,
      }}
    >
      {msg ?? "Something went wrong. Please try again."}
    </div>
  );
}

// ── ScoreBar ─────────────────────────────────────────────────────────────────
// Two-team probability bar. Used in prediction cards and match cards.
//
// Usage:
//   <ScoreBar home={55} draw={25} away={20} homeColor="#0a84ff" awayColor="#30d158" />
export function ScoreBar({ home = 33, draw = 33, away = 34, homeColor = "#0a84ff", awayColor = "#30d158" }) {
  return (
    <div>
      <div style={{ display: "flex", height: 5, borderRadius: 999, overflow: "hidden", gap: 1 }}>
        <div style={{ flex: home, background: homeColor, opacity: 0.85 }} />
        <div style={{ flex: draw,  background: "rgba(255,255,255,0.15)" }} />
        <div style={{ flex: away,  background: awayColor, opacity: 0.85 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
        <span style={{ color: homeColor, fontWeight: 800 }}>{home}%</span>
        <span style={{ color: "rgba(255,255,255,0.3)" }}>D {draw}%</span>
        <span style={{ color: awayColor, fontWeight: 800 }}>{away}%</span>
      </div>
    </div>
  );
}

// ── ProgressBar ──────────────────────────────────────────────────────────────
// Single progress bar. Use for stats, form, ratings.
//
// Usage:
//   <ProgressBar value={67} max={100} color="#7c6ef5" height={6} />
export function ProgressBar({ value = 0, max = 100, color = COLORS.blue, height = 5, animated = true }) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  return (
    <div style={{ height, borderRadius: 999, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: 999,
          transition: animated ? "width 0.65s cubic-bezier(.22,1,.36,1)" : "none",
        }}
      />
    </div>
  );
}

// ── TeamLogo ─────────────────────────────────────────────────────────────────
// Team logo with fallback initials avatar.
//
// Usage:
//   <TeamLogo src={team.logo} name="Arsenal" size={28} />
export function TeamLogo({ src, name = "?", size = 28 }) {
  const [err, setErr] = useState(false);
  const initial = (name || "?")[0].toUpperCase();

  if (!src || err) {
    return (
      <div style={{
        width: size, height: size,
        borderRadius: size * 0.3,
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.45, fontWeight: 700,
        color: "rgba(255,255,255,0.5)",
        flexShrink: 0,
      }}>
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      style={{ objectFit: "contain", flexShrink: 0 }}
      onError={() => setErr(true)}
    />
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
// Standard glass card container matching the statinsite design system.
//
// Usage:
//   <Card padding={20}>content</Card>
//   <Card onClick={fn} hover>clickable content</Card>
export function Card({ children, padding = 20, onClick, hover = !!onClick, style = {}, className = "" }) {
  const [hov, setHov] = useState(false);

  return (
    <div
      className={className}
      onClick={onClick}
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={{
        background: "#09090f",
        border: `1px solid ${hov ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.07)"}`,
        borderRadius: 20,
        padding,
        cursor: onClick ? "pointer" : "default",
        transform: hov ? "translateY(-3px) scale(1.008)" : "none",
        transition: "transform .22s cubic-bezier(.34,1.56,.64,1), border-color .18s, box-shadow .18s",
        boxShadow: hov ? "0 8px 32px rgba(0,0,0,0.4)" : "none",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── SectionHeader ────────────────────────────────────────────────────────────
// Eyebrow + title + optional "see all" link. Matches the sp-sec-head pattern
// from HomePage.jsx.
//
// Usage:
//   <SectionHeader eyebrow="Standings" title="Title Race" titleAccent="Race" link="Full table →" onLink={fn} />
export function SectionHeader({ eyebrow, title, titleAccent, link, onLink, style = {} }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginBottom: 24,
      gap: 12,
      ...style,
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {eyebrow && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 700,
            color: "rgba(255,255,255,0.22)",
            letterSpacing: ".18em", textTransform: "uppercase",
          }}>
            <div style={{ width: 14, height: "0.5px", background: "rgba(255,255,255,0.2)" }} />
            {eyebrow}
          </div>
        )}
        <h2 style={{
          margin: 0,
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: "clamp(22px, 3vw, 32px)",
          fontWeight: 900,
          letterSpacing: "-0.02em",
          color: "#fff",
          textTransform: "uppercase",
          lineHeight: 1,
        }}>
          {titleAccent
            ? <>{title.replace(titleAccent, "")} <span style={{ color: "#00d68f" }}>{titleAccent}</span></>
            : title
          }
        </h2>
      </div>
      {link && (
        <button
          onClick={onLink}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 11, fontWeight: 700,
            color: "rgba(255,255,255,0.28)",
            letterSpacing: ".04em",
            fontFamily: "'Inter', system-ui, sans-serif",
            whiteSpace: "nowrap",
            marginBottom: 4,
            transition: "color .15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.28)"; }}
        >
          {link}
        </button>
      )}
    </div>
  );
}