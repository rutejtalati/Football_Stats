// ═════════════════════════════════════════════════════
// formationMap.js
// Maps formation strings → [x%, y%] pitch coordinates
// Origin: top-left. y=0 = top of pitch (attacking end).
// Home team renders top→bottom, away renders bottom→top (mirrored).
// ═════════════════════════════════════════════════════

export const FORMATIONS = {
  "4-3-3": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "LB",  x: 12, y: 70 },
    { pos: "CB",  x: 35, y: 70 },
    { pos: "CB",  x: 65, y: 70 },
    { pos: "RB",  x: 88, y: 70 },
    { pos: "CM",  x: 25, y: 50 },
    { pos: "CM",  x: 50, y: 47 },
    { pos: "CM",  x: 75, y: 50 },
    { pos: "LW",  x: 15, y: 26 },
    { pos: "ST",  x: 50, y: 18 },
    { pos: "RW",  x: 85, y: 26 },
  ],
  "4-4-2": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "LB",  x: 12, y: 70 },
    { pos: "CB",  x: 35, y: 70 },
    { pos: "CB",  x: 65, y: 70 },
    { pos: "RB",  x: 88, y: 70 },
    { pos: "LM",  x: 12, y: 50 },
    { pos: "CM",  x: 35, y: 50 },
    { pos: "CM",  x: 65, y: 50 },
    { pos: "RM",  x: 88, y: 50 },
    { pos: "ST",  x: 35, y: 20 },
    { pos: "ST",  x: 65, y: 20 },
  ],
  "4-2-3-1": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "LB",  x: 12, y: 72 },
    { pos: "CB",  x: 35, y: 72 },
    { pos: "CB",  x: 65, y: 72 },
    { pos: "RB",  x: 88, y: 72 },
    { pos: "CDM", x: 35, y: 56 },
    { pos: "CDM", x: 65, y: 56 },
    { pos: "LW",  x: 15, y: 38 },
    { pos: "CAM", x: 50, y: 36 },
    { pos: "RW",  x: 85, y: 38 },
    { pos: "ST",  x: 50, y: 18 },
  ],
  "3-4-3": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "CB",  x: 25, y: 72 },
    { pos: "CB",  x: 50, y: 72 },
    { pos: "CB",  x: 75, y: 72 },
    { pos: "LM",  x: 12, y: 52 },
    { pos: "CM",  x: 35, y: 52 },
    { pos: "CM",  x: 65, y: 52 },
    { pos: "RM",  x: 88, y: 52 },
    { pos: "LW",  x: 18, y: 24 },
    { pos: "ST",  x: 50, y: 18 },
    { pos: "RW",  x: 82, y: 24 },
  ],
  "3-5-2": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "CB",  x: 25, y: 72 },
    { pos: "CB",  x: 50, y: 72 },
    { pos: "CB",  x: 75, y: 72 },
    { pos: "LWB", x: 10, y: 54 },
    { pos: "CM",  x: 30, y: 50 },
    { pos: "CM",  x: 50, y: 48 },
    { pos: "CM",  x: 70, y: 50 },
    { pos: "RWB", x: 90, y: 54 },
    { pos: "ST",  x: 35, y: 20 },
    { pos: "ST",  x: 65, y: 20 },
  ],
  "4-5-1": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "LB",  x: 12, y: 72 },
    { pos: "CB",  x: 35, y: 72 },
    { pos: "CB",  x: 65, y: 72 },
    { pos: "RB",  x: 88, y: 72 },
    { pos: "LM",  x: 10, y: 52 },
    { pos: "CM",  x: 28, y: 50 },
    { pos: "CM",  x: 50, y: 48 },
    { pos: "CM",  x: 72, y: 50 },
    { pos: "RM",  x: 90, y: 52 },
    { pos: "ST",  x: 50, y: 18 },
  ],
  "4-1-4-1": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "LB",  x: 12, y: 72 },
    { pos: "CB",  x: 35, y: 72 },
    { pos: "CB",  x: 65, y: 72 },
    { pos: "RB",  x: 88, y: 72 },
    { pos: "CDM", x: 50, y: 60 },
    { pos: "LM",  x: 12, y: 44 },
    { pos: "CM",  x: 35, y: 42 },
    { pos: "CM",  x: 65, y: 42 },
    { pos: "RM",  x: 88, y: 44 },
    { pos: "ST",  x: 50, y: 18 },
  ],
  "5-3-2": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "LWB", x: 8,  y: 70 },
    { pos: "CB",  x: 28, y: 72 },
    { pos: "CB",  x: 50, y: 74 },
    { pos: "CB",  x: 72, y: 72 },
    { pos: "RWB", x: 92, y: 70 },
    { pos: "CM",  x: 25, y: 50 },
    { pos: "CM",  x: 50, y: 48 },
    { pos: "CM",  x: 75, y: 50 },
    { pos: "ST",  x: 35, y: 20 },
    { pos: "ST",  x: 65, y: 20 },
  ],
  "4-3-2-1": [
    { pos: "GK",  x: 50, y: 88 },
    { pos: "LB",  x: 12, y: 72 },
    { pos: "CB",  x: 35, y: 72 },
    { pos: "CB",  x: 65, y: 72 },
    { pos: "RB",  x: 88, y: 72 },
    { pos: "CM",  x: 25, y: 54 },
    { pos: "CM",  x: 50, y: 52 },
    { pos: "CM",  x: 75, y: 54 },
    { pos: "SS",  x: 33, y: 34 },
    { pos: "SS",  x: 67, y: 34 },
    { pos: "ST",  x: 50, y: 18 },
  ],
};

/**
 * Get formation coordinates, with fallback to 4-3-3.
 * For away team, mirrors y axis (100 - y) so they face downward.
 */
export function getFormationCoords(formation, isAway = false) {
  const key = Object.keys(FORMATIONS).find(
    (k) => k === formation || k.replace(/-/g, "") === formation?.replace(/-/g, "")
  );
  const coords = FORMATIONS[key] || FORMATIONS["4-3-3"];
  if (!isAway) return coords;
  return coords.map((c) => ({ ...c, y: 100 - c.y }));
}

export const POSITION_COLORS = {
  GK:  "#f59e0b",
  DEF: "#3b82f6",
  LB:  "#3b82f6", RB: "#3b82f6", CB: "#3b82f6",
  LWB: "#3b82f6", RWB: "#3b82f6",
  MID: "#34d399",
  CM:  "#34d399", CDM: "#34d399", CAM: "#34d399",
  LM:  "#34d399", RM: "#34d399",
  FWD: "#f97316",
  LW:  "#f97316", RW: "#f97316", ST: "#f97316", SS: "#f97316",
};

export function posColor(pos) {
  return POSITION_COLORS[pos] || "#9fb4d6";
}