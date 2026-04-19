// ═══════════════════════════════════════════════════════════════════════════
// src/components/CompetitionNav.jsx  —  StatinSite shared competition nav  v1
// ═══════════════════════════════════════════════════════════════════════════
//
// Two-row competition selector:
//   Row 1: group tabs (Domestic | European | Cup | International)
//   Row 2: competition pills for the active group
//
// Previously duplicated verbatim in:
//   LivePage.jsx · LiveMatchPage.jsx · PredictionsPage.jsx · MatchCentrePage.jsx
//
// Props:
//   activeCode    {string}    currently selected competition code (e.g. "epl")
//   activeGroup   {string}    currently selected group key (e.g. "domestic")
//   setActiveGroup {fn}       called with new group key on group tab click
//   onSelect      {fn}        called with competition tab object on pill click
//   style         {object?}   optional container style overrides
//
// Usage:
//   <CompetitionNav
//     activeCode="epl"
//     activeGroup="domestic"
//     setActiveGroup={setActiveGroup}
//     onSelect={(tab) => navigate(`/predictions/${tab.slug}`)}
//   />
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { COMP_NAV_GROUPS, COMP_NAV_TABS, COMPS_BY_GROUP } from "@/constants";

// ── Group tab ─────────────────────────────────────────────────────────────────
function GroupTab({ group, isActive, onClick }) {
  const [hov, setHov] = useState(false);
  const count = COMPS_BY_GROUP[group.key]?.length ?? 0;

  return (
    <button
      onClick={() => onClick(group.key)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 12px",
        borderRadius: 999,
        cursor: "pointer",
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "-.01em",
        border: "none",
        background: isActive
          ? "rgba(255,255,255,0.12)"
          : hov
            ? "rgba(255,255,255,0.06)"
            : "rgba(255,255,255,0.04)",
        color: isActive ? "#fff" : "rgba(255,255,255,0.45)",
        transition: "background 120ms, color 120ms",
      }}
    >
      {group.label}
      <span style={{
        fontSize: 9,
        fontWeight: 800,
        padding: "1px 5px",
        borderRadius: 999,
        background: isActive ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.07)",
        color: isActive ? "#fff" : "rgba(255,255,255,0.3)",
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "0",
      }}>
        {count}
      </span>
    </button>
  );
}

// ── Competition pill ──────────────────────────────────────────────────────────
function CompPill({ tab, isActive, onClick }) {
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={() => onClick(tab)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px 5px 6px",
        borderRadius: 999,
        cursor: "pointer",
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 11,
        fontWeight: 700,
        border: `1px solid ${isActive ? tab.color + "50" : "rgba(255,255,255,0.08)"}`,
        background: isActive
          ? tab.color + "18"
          : hov
            ? "rgba(255,255,255,0.05)"
            : "transparent",
        color: isActive ? tab.color : hov ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)",
        transition: "all 120ms",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <img
        src={tab.logo}
        alt=""
        width={14}
        height={14}
        style={{ objectFit: "contain", opacity: isActive ? 1 : 0.6, flexShrink: 0 }}
        onError={(e) => { e.currentTarget.style.display = "none"; }}
      />
      {tab.short ?? tab.label}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CompetitionNav({
  activeCode,
  activeGroup = "domestic",
  setActiveGroup,
  onSelect,
  style = {},
}) {
  const groupComps = COMPS_BY_GROUP[activeGroup] ?? [];

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 8,
      padding: "10px 20px 12px",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      background: "rgba(8,8,8,0.9)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      ...style,
    }}>
      {/* Row 1: Group tabs */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {COMP_NAV_GROUPS.map((g) => (
          <GroupTab
            key={g.key}
            group={g}
            isActive={g.key === activeGroup}
            onClick={setActiveGroup}
          />
        ))}
      </div>

      {/* Row 2: Competition pills for active group */}
      <div style={{
        display: "flex",
        gap: 5,
        flexWrap: "wrap",
        // Horizontal scroll on very narrow viewports
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}>
        {groupComps.map((tab) => (
          <CompPill
            key={tab.code}
            tab={tab}
            isActive={tab.code === activeCode}
            onClick={onSelect}
          />
        ))}
      </div>
    </div>
  );
}