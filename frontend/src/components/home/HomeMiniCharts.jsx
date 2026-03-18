// ═══════════════════════════════════════════════════════════
// HomeMiniCharts — Small inline visual components for homepage
// ═══════════════════════════════════════════════════════════
import { formColor } from "../../utils/homeDataMappers";

export function ProbBar({ home = 33, draw = 33, away = 33, height = 5 }) {
  return (
    <div style={{ display: "flex", height, borderRadius: 999, overflow: "hidden", gap: 2 }}>
      <div style={{ flex: Math.max(home, 1), background: "#38bdf8", borderRadius: 999 }} />
      <div style={{ flex: Math.max(draw, 1), background: "#5a7a9a", borderRadius: 999 }} />
      <div style={{ flex: Math.max(away, 1), background: "#f87171", borderRadius: 999 }} />
    </div>
  );
}

export function ConfidenceRing({ value = 0, size = 40, strokeWidth = 3, color = "#38bdf8" }) {
  const v = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (v / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1)" }} />
    </svg>
  );
}

export function FormStrip({ form = [], size = 14 }) {
  if (!form || form.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {form.map((f, i) => (
        <div key={i} style={{
          width: size, height: size, borderRadius: 3,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: formColor(f),
          fontFamily: "var(--font-display)", fontSize: size * 0.57,
          fontWeight: 800, color: "#fff",
        }}>
          {f}
        </div>
      ))}
    </div>
  );
}

export function SparkBar({ values = [], color = "#38bdf8", width = 60, height = 24 }) {
  if (!values || values.length === 0) return null;
  const max = Math.max(...values, 1);
  const barW = Math.max(2, (width / values.length) - 1);
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {values.map((v, i) => {
        const h = (v / max) * height;
        return (
          <rect key={i} x={i * (barW + 1)} y={height - h} width={barW} height={h}
            rx={1} fill={color} opacity={0.4 + (v / max) * 0.6} />
        );
      })}
    </svg>
  );
}