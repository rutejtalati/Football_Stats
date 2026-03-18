import React from 'react';

/**
 * MiniDonut — small ring chart for single percentage values
 */
export const MiniDonut = ({ value = 0, size = 48, strokeWidth = 4, color = 'var(--hp-blue)', showLabel = true, fontSize = 11 }) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="mini-donut" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hp-bg)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s var(--hp-ease)' }}
        />
      </svg>
      {showLabel && (
        <span className="mini-donut__val" style={{ fontSize, color }}>
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
};

/**
 * MiniBar — compact horizontal bar
 */
export const MiniBar = ({ value = 0, max = 100, color = 'var(--hp-blue)', height = 4 }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height, background: 'var(--hp-bg)', borderRadius: height / 2, overflow: 'hidden', width: '100%' }}>
      <div style={{
        width: `${pct}%`, height: '100%', background: color,
        borderRadius: height / 2, transition: 'width 0.6s var(--hp-ease)',
      }} />
    </div>
  );
};

/**
 * FormStrip — W/D/L form badges
 */
export const FormStrip = ({ form = [], size = 16 }) => (
  <div className="form-strip">
    {form.map((f, i) => (
      <div key={i} className={`form-dot form-dot--${f}`} style={{ width: size, height: size }}>
        {f}
      </div>
    ))}
  </div>
);

/**
 * ConfBadge — confidence indicator
 */
export const ConfBadge = ({ level = 'medium' }) => (
  <span className={`conf-badge conf-badge--${level}`}>
    {level}
  </span>
);

/**
 * ProbBar — three-segment probability bar (home / draw / away)
 */
export const ProbBar = ({ home = 33, draw = 34, away = 33, height = 4, homeColor = 'var(--hp-blue)', drawColor = 'var(--hp-text-muted)', awayColor = 'var(--hp-red)' }) => (
  <div style={{ display: 'flex', height, borderRadius: height / 2, overflow: 'hidden', background: 'var(--hp-bg)' }}>
    <div style={{ width: `${home}%`, background: homeColor, transition: 'width 0.6s var(--hp-ease)' }} />
    <div style={{ width: `${draw}%`, background: drawColor, opacity: 0.4, transition: 'width 0.6s var(--hp-ease)' }} />
    <div style={{ width: `${away}%`, background: awayColor, transition: 'width 0.6s var(--hp-ease)' }} />
  </div>
);

/**
 * PitchSVG — mini football pitch for tactical decoration
 */
export const PitchSVG = ({ width = 180, height = 240, color = 'currentColor' }) => (
  <svg width={width} height={height} viewBox="0 0 180 240" className="tactical-primary__pitch">
    <g className="pitch-lines" style={{ color }}>
      {/* Outline */}
      <rect x="10" y="10" width="160" height="220" rx="2" />
      {/* Center line */}
      <line x1="10" y1="120" x2="170" y2="120" />
      {/* Center circle */}
      <circle cx="90" cy="120" r="30" />
      <circle cx="90" cy="120" r="2" fill={color} />
      {/* Penalty areas */}
      <rect x="40" y="10" width="100" height="50" />
      <rect x="40" y="180" width="100" height="50" />
      {/* Goal areas */}
      <rect x="60" y="10" width="60" height="20" />
      <rect x="60" y="210" width="60" height="20" />
      {/* Penalty spots */}
      <circle cx="90" cy="42" r="2" fill={color} />
      <circle cx="90" cy="198" r="2" fill={color} />
    </g>
  </svg>
);

export default { MiniDonut, MiniBar, FormStrip, ConfBadge, ProbBar, PitchSVG };