// ═══════════════════════════════════════════════════════════════════════
// HorizontalPitchLineup.jsx — StatinSite Match Preview Pitch Card
// Landscape 16:9 side-by-side formation view. No vertical scrolling.
// ═══════════════════════════════════════════════════════════════════════

import { useState } from "react";

// ── Team colour palette ──────────────────────────────────────────────
const TEAM_COLOURS_MAP = {
  40:"#c8102e",42:"#1a5bab",33:"#1d6fa4",50:"#6cacd4",49:"#034694",
  47:"#c8c8c8",55:"#8f8f8f",66:"#7B003C",51:"#0057b8",65:"#7a263a",
  36:"#cc0000",48:"#FDB913",45:"#003399",529:"#004b87",541:"#e8e8e8",
  530:"#cb3524",157:"#d3010c",165:"#fde100",489:"#010E80",492:"#fb090b",
};
function tColour(id, fb) { return TEAM_COLOURS_MAP[id] || fb; }

// ══════════════════════════════════════════════════════════════════════
// HORIZONTAL FORMATION DATA
// Coordinate system (0-100 normalised):
//   x = pitch length  (0=left goal, 100=right goal)
//   y = pitch width   (0=top touchline, 100=bottom touchline)
//
// LEFT TEAM  — GK near x≈10, attack near x≈45
// RIGHT TEAM — GK near x≈90, attack near x≈55
//
// Slot order: [GK, DEF left→right, MID left→right, FWD left→right]
// "left→right" for left team = top touchline→bottom touchline
// ══════════════════════════════════════════════════════════════════════

const HF = {
  // ── 4-3-3 ──────────────────────────────────────────────────────────
  "4-3-3_left": [
    [10,50],                           // GK
    [23,82],[23,61],[23,39],[23,18],   // DEF
    [34,66],[32,50],[34,34],           // MID
    [43,82],[45,50],[43,18],           // FWD
  ],
  "4-3-3_right": [
    [90,50],
    [77,18],[77,39],[77,61],[77,82],
    [66,34],[68,50],[66,66],
    [57,18],[55,50],[57,82],
  ],

  // ── 4-2-3-1 ────────────────────────────────────────────────────────
  "4-2-3-1_left": [
    [10,50],
    [23,82],[23,61],[23,39],[23,18],
    [31,61],[31,39],
    [39,82],[39,50],[39,18],
    [46,50],
  ],
  "4-2-3-1_right": [
    [90,50],
    [77,18],[77,39],[77,61],[77,82],
    [69,39],[69,61],
    [61,18],[61,50],[61,82],
    [54,50],
  ],

  // ── 4-4-2 ──────────────────────────────────────────────────────────
  "4-4-2_left": [
    [10,50],
    [23,82],[23,61],[23,39],[23,18],
    [34,82],[34,61],[34,39],[34,18],
    [43,61],[43,39],
  ],
  "4-4-2_right": [
    [90,50],
    [77,18],[77,39],[77,61],[77,82],
    [66,18],[66,39],[66,61],[66,82],
    [57,39],[57,61],
  ],

  // ── 4-5-1 ──────────────────────────────────────────────────────────
  "4-5-1_left": [
    [10,50],
    [23,82],[23,61],[23,39],[23,18],
    [34,82],[34,65],[33,50],[34,35],[34,18],
    [45,50],
  ],
  "4-5-1_right": [
    [90,50],
    [77,18],[77,39],[77,61],[77,82],
    [66,18],[66,35],[67,50],[66,65],[66,82],
    [55,50],
  ],

  // ── 4-1-4-1 ────────────────────────────────────────────────────────
  "4-1-4-1_left": [
    [10,50],
    [23,82],[23,61],[23,39],[23,18],
    [30,50],
    [38,82],[38,61],[38,39],[38,18],
    [46,50],
  ],
  "4-1-4-1_right": [
    [90,50],
    [77,18],[77,39],[77,61],[77,82],
    [70,50],
    [62,18],[62,39],[62,61],[62,82],
    [54,50],
  ],

  // ── 3-5-2 ──────────────────────────────────────────────────────────
  "3-5-2_left": [
    [10,50],
    [22,68],[21,50],[22,32],
    [31,82],[33,65],[32,50],[33,35],[31,18],
    [44,62],[44,38],
  ],
  "3-5-2_right": [
    [90,50],
    [78,32],[79,50],[78,68],
    [69,18],[67,35],[68,50],[67,65],[69,82],
    [56,38],[56,62],
  ],

  // ── 3-4-3 ──────────────────────────────────────────────────────────
  "3-4-3_left": [
    [10,50],
    [22,68],[21,50],[22,32],
    [31,82],[31,61],[31,39],[31,18],
    [43,82],[45,50],[43,18],
  ],
  "3-4-3_right": [
    [90,50],
    [78,32],[79,50],[78,68],
    [69,18],[69,39],[69,61],[69,82],
    [57,18],[55,50],[57,82],
  ],

  // ── 5-3-2 ──────────────────────────────────────────────────────────
  "5-3-2_left": [
    [10,50],
    [22,82],[22,66],[21,50],[22,34],[22,18],
    [33,66],[32,50],[33,34],
    [44,62],[44,38],
  ],
  "5-3-2_right": [
    [90,50],
    [78,18],[78,34],[79,50],[78,66],[78,82],
    [67,34],[68,50],[67,66],
    [56,38],[56,62],
  ],

  // ── 5-4-1 ──────────────────────────────────────────────────────────
  "5-4-1_left": [
    [10,50],
    [22,82],[22,66],[21,50],[22,34],[22,18],
    [33,82],[33,61],[33,39],[33,18],
    [45,50],
  ],
  "5-4-1_right": [
    [90,50],
    [78,18],[78,34],[79,50],[78,66],[78,82],
    [67,18],[67,39],[67,61],[67,82],
    [55,50],
  ],

  // ── 4-3-2-1 ────────────────────────────────────────────────────────
  "4-3-2-1_left": [
    [10,50],
    [23,82],[23,61],[23,39],[23,18],
    [31,66],[31,50],[31,34],
    [39,62],[39,38],
    [46,50],
  ],
  "4-3-2-1_right": [
    [90,50],
    [77,18],[77,39],[77,61],[77,82],
    [69,34],[69,50],[69,66],
    [61,38],[61,62],
    [54,50],
  ],

  // ── 4-2-2-2 ────────────────────────────────────────────────────────
  "4-2-2-2_left": [
    [10,50],
    [23,82],[23,61],[23,39],[23,18],
    [30,62],[30,38],
    [38,62],[38,38],
    [45,62],[45,38],
  ],
  "4-2-2-2_right": [
    [90,50],
    [77,18],[77,39],[77,61],[77,82],
    [70,38],[70,62],
    [62,38],[62,62],
    [55,38],[55,62],
  ],

  // ── 3-4-2-1 ────────────────────────────────────────────────────────
  "3-4-2-1_left": [
    [10,50],
    [22,68],[21,50],[22,32],
    [31,82],[31,61],[31,39],[31,18],
    [39,62],[39,38],
    [46,50],
  ],
  "3-4-2-1_right": [
    [90,50],
    [78,32],[79,50],[78,68],
    [69,18],[69,39],[69,61],[69,82],
    [61,38],[61,62],
    [54,50],
  ],
};

function getHSlots(formation, side) {
  const key = `${formation}_${side}`;
  return HF[key] || HF[`4-3-3_${side}`];
}

// ── Normalise a raw lineup object ────────────────────────────────────
function normalise(raw) {
  if (!raw) return null;
  const xi    = raw.startXI || raw.starting_xi || raw.start_xi || [];
  const bench = raw.substitutes || raw.bench || raw.subs || [];
  return {
    formation:  raw.formation || "4-3-3",
    predicted:  raw.predicted || false,
    confidence: raw.confidence,
    coach:      raw.coach || null,
    injuries:   raw.injuries || [],
    xi: xi.map(p => {
      const pl = p?.player || p || {};
      return {
        id:         pl.id,
        name:       pl.name || "",
        pos:        pl.pos || pl.position || "",
        photo:      pl.photo || (pl.id ? `https://media.api-sports.io/football/players/${pl.id}.png` : null),
        confidence: p?.confidence ?? pl.confidence,
      };
    }),
    bench: bench.slice(0, 9).map(p => {
      const pl = p?.player || p || {};
      return {
        id:    pl.id,
        name:  pl.name || "",
        pos:   pl.pos || pl.position || "",
        photo: pl.photo || (pl.id ? `https://media.api-sports.io/football/players/${pl.id}.png` : null),
      };
    }),
  };
}

// ── Horizontal pitch SVG ─────────────────────────────────────────────
function HorizontalPitchSvg() {
  // viewBox 0 0 200 100 — wide landscape
  return (
    <svg
      viewBox="0 0 200 100"
      style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Turf gradient */}
      <defs>
        <linearGradient id="turfGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#0c2410"/>
          <stop offset="50%"  stopColor="#0f2d14"/>
          <stop offset="100%" stopColor="#0c2410"/>
        </linearGradient>
        {/* Vertical stripe pattern */}
        <pattern id="stripes" x="0" y="0" width="20" height="100" patternUnits="userSpaceOnUse">
          <rect x="0"  y="0" width="10" height="100" fill="rgba(255,255,255,0.018)"/>
          <rect x="10" y="0" width="10" height="100" fill="rgba(0,0,0,0)"/>
        </pattern>
      </defs>

      {/* Base */}
      <rect width="200" height="100" fill="url(#turfGrad)"/>
      <rect width="200" height="100" fill="url(#stripes)"/>

      {/* Pitch outline */}
      <rect x="4" y="4" width="192" height="92" rx="1"
        fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.5"/>

      {/* Halfway line */}
      <line x1="100" y1="4" x2="100" y2="96"
        stroke="rgba(255,255,255,0.55)" strokeWidth="0.5"/>

      {/* Centre circle */}
      <circle cx="100" cy="50" r="15"
        fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.45"/>
      <circle cx="100" cy="50" r="0.9" fill="rgba(255,255,255,0.9)"/>

      {/* Left penalty box */}
      <rect x="4" y="26" width="24" height="48"
        fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.45"/>
      {/* Left 6-yard box */}
      <rect x="4" y="37" width="9" height="26"
        fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.35"/>
      {/* Left penalty spot */}
      <circle cx="19" cy="50" r="0.75" fill="rgba(255,255,255,0.8)"/>
      {/* Left penalty arc */}
      <path d="M28,38 A14,14 0 0,1 28,62"
        fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.35"/>
      {/* Left goal */}
      <rect x="0" y="41" width="4" height="18"
        fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.45"/>

      {/* Right penalty box */}
      <rect x="172" y="26" width="24" height="48"
        fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.45"/>
      {/* Right 6-yard box */}
      <rect x="187" y="37" width="9" height="26"
        fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.35"/>
      {/* Right penalty spot */}
      <circle cx="181" cy="50" r="0.75" fill="rgba(255,255,255,0.8)"/>
      {/* Right penalty arc */}
      <path d="M172,38 A14,14 0 0,0 172,62"
        fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.35"/>
      {/* Right goal */}
      <rect x="196" y="41" width="4" height="18"
        fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.6)" strokeWidth="0.45"/>

      {/* Corner arcs */}
      <path d="M4,4 Q6,4 6,6"   fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4"/>
      <path d="M196,4 Q194,4 194,6" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4"/>
      <path d="M4,96 Q6,96 6,94"  fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4"/>
      <path d="M196,96 Q194,96 194,94" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.4"/>
    </svg>
  );
}

// ── Single player token ──────────────────────────────────────────────
function PlayerDot({ player, x, y, colour, isGK }) {
  const short = (player?.name || "?").split(" ").pop().slice(0, 11);
  const conf  = player?.confidence;

  return (
    <div style={{
      position:   "absolute",
      left:       `${x}%`,
      top:        `${y}%`,
      transform:  "translate(-50%,-50%)",
      display:    "flex",
      flexDirection: "column",
      alignItems: "center",
      gap:        1.5,
      zIndex:     3,
      pointerEvents: "none",
    }}>
      {/* Avatar ring */}
      <div style={{
        width:  isGK ? 26 : 22,
        height: isGK ? 26 : 22,
        borderRadius: "50%",
        border:      `${isGK ? 2.5 : 2}px solid ${colour}`,
        boxShadow:   isGK
          ? `0 0 0 2px #0c2410, 0 0 0 4px ${colour}66, 0 2px 8px rgba(0,0,0,0.7)`
          : `0 1px 6px rgba(0,0,0,0.6)`,
        background:  "#0a1c0b",
        overflow:    "hidden",
        flexShrink:  0,
      }}>
        {player?.photo && (
          <img
            src={player.photo}
            alt=""
            width={isGK ? 26 : 22}
            height={isGK ? 26 : 22}
            style={{ objectFit: "cover", objectPosition: "top center", display: "block" }}
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
        )}
      </div>

      {/* Name tag */}
      <div style={{
        fontSize:        "6.5px",
        fontWeight:      700,
        color:           "rgba(255,255,255,0.93)",
        textShadow:      "0 1px 5px #000",
        background:      "rgba(0,0,0,0.72)",
        padding:         "1px 3.5px",
        borderRadius:    3,
        whiteSpace:      "nowrap",
        maxWidth:        54,
        overflow:        "hidden",
        textOverflow:    "ellipsis",
        lineHeight:      1.35,
        letterSpacing:   "0.02em",
        fontFamily:      "'Inter','Sora',sans-serif",
      }}>
        {short}
      </div>

      {/* Confidence bar */}
      {conf !== undefined && (
        <div style={{
          width:        22,
          height:       1.5,
          borderRadius: 999,
          background:   "rgba(255,255,255,0.08)",
          overflow:     "hidden",
        }}>
          <div style={{
            width:      `${conf}%`,
            height:     "100%",
            background: colour,
            opacity:    0.6,
          }}/>
        </div>
      )}
    </div>
  );
}

// ── Render all 11 tokens for one side ───────────────────────────────
function TeamTokens({ lineup, side, colour }) {
  if (!lineup?.xi?.length) return null;
  const slots = getHSlots(lineup.formation, side);

  return (
    <>
      {lineup.xi.slice(0, 11).map((p, i) => {
        const [x, y] = slots[i] || [50, 50];
        return (
          <PlayerDot
            key={i}
            player={p}
            x={x}
            y={y}
            colour={colour}
            isGK={i === 0}
          />
        );
      })}
    </>
  );
}

// ── Bench strip (compact horizontal) ─────────────────────────────────
function BenchStrip({ lineup, colour, align = "left" }) {
  if (!lineup?.bench?.length) return null;
  const isRight = align === "right";

  return (
    <div style={{
      display:        "flex",
      flexDirection:  isRight ? "row-reverse" : "row",
      gap:            4,
      flexWrap:       "nowrap",
      overflow:       "hidden",
      alignItems:     "center",
    }}>
      {lineup.bench.slice(0, 7).map((p, i) => (
        <div key={i} style={{
          flexShrink:  0,
          display:     "flex",
          alignItems:  "center",
          gap:         3,
          padding:     "2.5px 6px 2.5px 3px",
          borderRadius: 6,
          background:  "rgba(255,255,255,0.025)",
          border:      `1px solid rgba(255,255,255,0.06)`,
          borderLeft:  isRight ? `1px solid rgba(255,255,255,0.06)` : `2px solid ${colour}`,
          borderRight: isRight ? `2px solid ${colour}` : `1px solid rgba(255,255,255,0.06)`,
        }}>
          <div style={{
            width:        18,
            height:       18,
            borderRadius: "50%",
            overflow:     "hidden",
            background:   "#111",
            border:       `1px solid ${colour}33`,
            flexShrink:   0,
          }}>
            {p.photo && (
              <img src={p.photo} alt="" width="18" height="18"
                style={{ objectFit:"cover", objectPosition:"top" }}
                onError={e => e.currentTarget.style.display = "none"}
              />
            )}
          </div>
          <span style={{
            fontSize:    "7px",
            fontWeight:  700,
            color:       "rgba(255,255,255,0.42)",
            whiteSpace:  "nowrap",
            fontFamily:  "'Inter','Sora',sans-serif",
          }}>
            {(p.name || "").split(" ").pop().slice(0, 10)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Team header ───────────────────────────────────────────────────────
function TeamHeader({ team, lineup, colour, align = "left" }) {
  const isRight = align === "right";
  return (
    <div style={{
      display:        "flex",
      flexDirection:  isRight ? "row-reverse" : "row",
      alignItems:     "center",
      gap:            7,
    }}>
      {/* Logo */}
      <div style={{
        width:        28,
        height:       28,
        borderRadius: "50%",
        border:       `2px solid ${colour}`,
        overflow:     "hidden",
        flexShrink:   0,
        background:   "#111",
        display:      "flex",
        alignItems:   "center",
        justifyContent: "center",
      }}>
        {team?.logo && (
          <img src={team.logo} alt="" width="22" height="22"
            style={{ objectFit:"contain" }}
            onError={e => e.currentTarget.style.display = "none"}
          />
        )}
      </div>

      <div style={{
        display:       "flex",
        flexDirection: "column",
        gap:           2,
        alignItems:    isRight ? "flex-end" : "flex-start",
      }}>
        <span style={{
          fontSize:    13,
          fontWeight:  900,
          color:       "#fff",
          fontFamily:  "'Sora','Inter',sans-serif",
          letterSpacing: "-0.01em",
          lineHeight:  1.1,
        }}>
          {team?.name || "—"}
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          {lineup?.formation && (
            <span style={{
              fontSize:   8,
              fontWeight: 800,
              color:      colour,
              background: `${colour}14`,
              border:     `1px solid ${colour}30`,
              borderRadius: 4,
              padding:    "1px 5px",
              letterSpacing: "0.04em",
            }}>
              {lineup.formation}
            </span>
          )}
          {lineup?.confidence !== undefined && (
            <span style={{
              fontSize:    7.5,
              fontWeight:  700,
              color:       "rgba(52,211,153,0.8)",
              fontFamily:  "'JetBrains Mono',monospace",
            }}>
              {lineup.confidence}% conf
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════

export default function HorizontalPitchLineup({
  homeLineup,
  awayLineup,
  homeTeam,
  awayTeam,
}) {
  if (!homeLineup && !awayLineup) return null;

  const hc = tColour(homeTeam?.id, "#38bdf8");
  const ac = tColour(awayTeam?.id, "#f97316");

  const home = normalise(homeLineup);
  const away = normalise(awayLineup);
  const isPredicted = home?.predicted || away?.predicted;

  return (
    <div style={{
      background:   "#060f07",
      borderRadius: 14,
      border:       "1px solid rgba(255,255,255,0.07)",
      overflow:     "hidden",
      fontFamily:   "'Inter','Sora',sans-serif",
    }}>
      <style>{`
        @keyframes pitchFadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .hpl-wrap { animation: pitchFadeIn 0.35s ease both; }
      `}</style>

      <div className="hpl-wrap">

        {/* ── Top header bar ──────────────────────────────────────────── */}
        <div style={{
          display:      "flex",
          alignItems:   "center",
          padding:      "10px 16px 8px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          gap:          12,
        }}>
          {/* Home team */}
          <div style={{ flex: 1 }}>
            <TeamHeader team={homeTeam} lineup={home} colour={hc} align="left" />
          </div>

          {/* Centre badge */}
          <div style={{
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            gap:            3,
            flexShrink:     0,
          }}>
            {isPredicted && (
              <span style={{
                fontSize:      7,
                fontWeight:    900,
                color:         "#f59e0b",
                background:    "rgba(245,158,11,0.1)",
                border:        "1px solid rgba(245,158,11,0.22)",
                borderRadius:  4,
                padding:       "2px 7px",
                letterSpacing: "0.08em",
              }}>
                PREDICTED
              </span>
            )}
            <span style={{
              fontSize:    9,
              fontWeight:  700,
              color:       "rgba(255,255,255,0.2)",
              letterSpacing: "0.06em",
            }}>
              LINEUP
            </span>
          </div>

          {/* Away team */}
          <div style={{ flex: 1, display:"flex", justifyContent:"flex-end" }}>
            <TeamHeader team={awayTeam} lineup={away} colour={ac} align="right" />
          </div>
        </div>

        {/* ── Pitch ───────────────────────────────────────────────────── */}
        {/*
          Aspect ratio 200:100 = 2:1  →  paddingBottom 50%.
          Players are positioned with absolute % coords that match the
          HF slot map (x=0..100 → left:0..100%, y=0..100 → top:0..100%).
        */}
        <div style={{
          position:     "relative",
          width:        "100%",
          paddingBottom: "50%",   // 2:1 = landscape pitch
          overflow:     "hidden",
        }}>
          {/* SVG pitch markings */}
          <HorizontalPitchSvg />

          {/* Attack direction label — left team */}
          <div style={{
            position:    "absolute",
            left:        "25%",
            top:         "4%",
            transform:   "translateX(-50%)",
            fontSize:    "7px",
            fontWeight:  800,
            color:       `${hc}66`,
            letterSpacing: "0.12em",
            zIndex:      1,
            pointerEvents: "none",
            display:     "flex",
            alignItems:  "center",
            gap:         3,
          }}>
            {homeTeam?.name?.split(" ").pop()} →
          </div>

          {/* Attack direction label — right team */}
          <div style={{
            position:    "absolute",
            left:        "75%",
            top:         "4%",
            transform:   "translateX(-50%)",
            fontSize:    "7px",
            fontWeight:  800,
            color:       `${ac}66`,
            letterSpacing: "0.12em",
            zIndex:      1,
            pointerEvents: "none",
            display:     "flex",
            alignItems:  "center",
            gap:         3,
          }}>
            ← {awayTeam?.name?.split(" ").pop()}
          </div>

          {/* Player tokens — home (left side) */}
          <TeamTokens lineup={home} side="left"  colour={hc} />

          {/* Player tokens — away (right side) */}
          <TeamTokens lineup={away} side="right" colour={ac} />
        </div>

        {/* ── Bench strip ─────────────────────────────────────────────── */}
        <div style={{
          display:      "flex",
          gap:          10,
          padding:      "8px 12px 9px",
          borderTop:    "1px solid rgba(255,255,255,0.04)",
          background:   "rgba(0,0,0,0.18)",
          alignItems:   "flex-start",
        }}>
          {/* Home bench */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{
              fontSize:    "6.5px",
              fontWeight:  900,
              color:       `${hc}80`,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 4,
              display:     "flex",
              alignItems:  "center",
              gap:         4,
            }}>
              <span style={{ width:5,height:5,borderRadius:"50%",background:hc,display:"inline-block" }}/>
              Bench
            </div>
            <BenchStrip lineup={home} colour={hc} align="left" />
          </div>

          {/* Divider */}
          <div style={{ width:1, alignSelf:"stretch", background:"rgba(255,255,255,0.06)", flexShrink:0 }}/>

          {/* Away bench */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{
              fontSize:    "6.5px",
              fontWeight:  900,
              color:       `${ac}80`,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 4,
              display:     "flex",
              alignItems:  "center",
              justifyContent: "flex-end",
              gap:         4,
            }}>
              Bench
              <span style={{ width:5,height:5,borderRadius:"50%",background:ac,display:"inline-block" }}/>
            </div>
            <BenchStrip lineup={away} colour={ac} align="right" />
          </div>
        </div>

      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════
// USAGE — replace PitchLineup in LiveMatchPage.jsx:
//
//   import HorizontalPitchLineup from "./HorizontalPitchLineup";
//
//   // In the Lineups tab (prematch):
//   {lineups.length > 0
//     ? <LineupsPanel lineups={lineups} homeTeam={homeTeam} awayTeam={awayTeam} />
//     : <HorizontalPitchLineup
//         homeLineup={predictedHome}
//         awayLineup={predictedAway}
//         homeTeam={homeTeam}
//         awayTeam={awayTeam}
//       />
//   }
//
//   // The component accepts both predicted lineup objects (from lineup_predictor.py)
//   // and official lineup objects from the /fixtures/lineups API endpoint.
//   // startXI / start_xi / starting_xi are all recognised automatically.
// ══════════════════════════════════════════════════════════════════════