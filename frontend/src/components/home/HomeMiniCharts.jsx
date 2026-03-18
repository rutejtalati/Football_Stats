import { formColor } from "../../utils/homeDataMappers";

export function ProbBar({ home = 33, draw = 33, away = 33, height = 4 }) {
  return (
    <div style={{ display: "flex", height, borderRadius: 999, overflow: "hidden", gap: 2 }}>
      <div style={{ flex: Math.max(home, 1), background: "#4f9eff", borderRadius: 999 }} />
      <div style={{ flex: Math.max(draw, 1), background: "#4a6a8a", borderRadius: 999 }} />
      <div style={{ flex: Math.max(away, 1), background: "#ff4d6d", borderRadius: 999 }} />
    </div>
  );
}

export function FormStrip({ form = [], size = 12 }) {
  if (!form || form.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {form.map((f, i) => (
        <div key={i} style={{
          width: size, height: size, borderRadius: 2,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: formColor(f), fontFamily: "var(--font-display)",
          fontSize: size * 0.55, fontWeight: 800, color: "#fff",
        }}>{f}</div>
      ))}
    </div>
  );
}

export function ConfidenceRing({ value = 0, size = 36, strokeWidth = 3, color = "#38bdf8" }) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.5s" }} />
    </svg>
  );
}