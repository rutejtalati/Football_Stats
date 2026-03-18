// src/components/home/HomeMiniCharts.jsx
// ═══════════════════════════════════════════════════════════════════════════
// Collection of mini chart and visualization components for the homepage
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';

const MONO = "'IBM Plex Mono', monospace";

/**
 * Animated probability bar (3-segment: home/draw/away)
 */
export function ProbabilityBar({ home = 0, draw = 0, away = 0, height = 6 }) {
  const [animated, setAnimated] = useState(false);
  
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);
  
  const total = home + draw + away || 1;
  
  return (
    <div 
      style={{
        display: 'flex',
        gap: 2,
        height,
        borderRadius: height / 2,
        overflow: 'hidden',
        background: 'rgba(255, 255, 255, 0.03)',
        width: '100%',
      }}
    >
      <div
        style={{
          flex: animated ? home / total : 0,
          background: 'linear-gradient(90deg, #1d4ed8, #3b9eff)',
          borderRadius: `${height / 2}px 0 0 ${height / 2}px`,
          transition: 'flex 0.8s cubic-bezier(0.34, 1.2, 0.64, 1)',
          minWidth: animated && home > 0 ? 4 : 0,
        }}
      />
      <div
        style={{
          flex: animated ? draw / total : 0,
          background: '#4b5563',
          transition: 'flex 0.8s cubic-bezier(0.34, 1.2, 0.64, 1)',
          minWidth: animated && draw > 0 ? 4 : 0,
        }}
      />
      <div
        style={{
          flex: animated ? away / total : 0,
          background: 'linear-gradient(90deg, #dc2626, #f87171)',
          borderRadius: `0 ${height / 2}px ${height / 2}px 0`,
          transition: 'flex 0.8s cubic-bezier(0.34, 1.2, 0.64, 1)',
          minWidth: animated && away > 0 ? 4 : 0,
        }}
      />
    </div>
  );
}

/**
 * Single progress bar
 */
export function ProgressBar({ value = 0, max = 100, color = '#3b9eff', height = 4 }) {
  const [animated, setAnimated] = useState(false);
  
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);
  
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div
      style={{
        height,
        borderRadius: height / 2,
        background: 'rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <div
        style={{
          width: animated ? `${pct}%` : 0,
          height: '100%',
          background: color,
          borderRadius: height / 2,
          transition: 'width 0.8s cubic-bezier(0.34, 1.2, 0.64, 1)',
        }}
      />
    </div>
  );
}

/**
 * Mini bar chart
 */
export function MiniBarChart({ data = [], height = 24, color = '#3b9eff' }) {
  const [animated, setAnimated] = useState(false);
  
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);
  
  const max = Math.max(...data, 1);
  
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 2,
        height,
      }}
    >
      {data.map((value, i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: animated ? `${(value / max) * 100}%` : 0,
            background: color,
            borderRadius: 2,
            transition: `height 0.5s cubic-bezier(0.34, 1.2, 0.64, 1) ${i * 50}ms`,
            opacity: 0.6 + (i / data.length) * 0.4,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Sparkline SVG
 */
export function Sparkline({ data = [], width = 60, height = 24, color = '#3b9eff' }) {
  if (data.length < 2) return null;
  
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  
  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#spark-grad-${color.replace('#', '')})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Circular progress ring
 */
export function ProgressRing({ value = 0, size = 60, strokeWidth = 4, color = '#3b9eff' }) {
  const [animated, setAnimated] = useState(false);
  
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animated ? (value / 100) * circumference : 0);
  
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255, 255, 255, 0.06)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{
          transition: 'stroke-dashoffset 1s cubic-bezier(0.34, 1.2, 0.64, 1)',
          filter: `drop-shadow(0 0 6px ${color}80)`,
        }}
      />
    </svg>
  );
}

/**
 * Animated counter
 */
export function AnimatedNumber({ value = 0, duration = 800, suffix = '', prefix = '' }) {
  const [displayed, setDisplayed] = useState(0);
  
  useEffect(() => {
    const start = performance.now();
    const startVal = displayed;
    
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(startVal + (value - startVal) * eased));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);
  
  return (
    <span style={{ fontFamily: MONO, fontVariantNumeric: 'tabular-nums' }}>
      {prefix}{displayed}{suffix}
    </span>
  );
}

/**
 * Form indicator pips (W/D/L)
 */
export function FormPips({ form = [], size = 'default' }) {
  const styles = {
    W: { bg: 'rgba(40, 217, 122, 0.15)', color: '#28d97a', border: 'rgba(40, 217, 122, 0.32)' },
    D: { bg: 'rgba(150, 150, 170, 0.1)', color: '#8a9aaa', border: 'rgba(150, 150, 170, 0.2)' },
    L: { bg: 'rgba(220, 70, 70, 0.15)', color: '#e05050', border: 'rgba(220, 70, 70, 0.28)' },
  };
  
  const pipSize = size === 'small' ? 16 : 20;
  const fontSize = size === 'small' ? 8 : 9;
  
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {form.slice(-5).map((result, i) => {
        const s = styles[result] || styles.D;
        return (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: pipSize,
              height: pipSize,
              borderRadius: 4,
              fontSize,
              fontWeight: 900,
              fontFamily: MONO,
              background: s.bg,
              color: s.color,
              border: `1px solid ${s.border}`,
            }}
          >
            {result}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Stat chip with label and value
 */
export function StatChip({ label, value, color = '#6a7a9a', bg, border }) {
  const [hovered, setHovered] = useState(false);
  
  const activeBg = bg || `${color}12`;
  const activeBorder = border || `${color}30`;
  
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        padding: '8px 12px',
        borderRadius: 10,
        background: hovered ? `${color}1e` : activeBg,
        border: `1px solid ${hovered ? color + '55' : activeBorder}`,
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
      }}
    >
      <span
        style={{
          fontSize: 8,
          fontWeight: 800,
          letterSpacing: '0.1em',
          color: '#2a4a6a',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 800,
          color,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Pulsing live dot
 */
export function LiveDot({ color = '#f87171', size = 8 }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 ${size * 1.5}px ${color}`,
        animation: 'hp-pulse 1.5s ease-in-out infinite',
        flexShrink: 0,
      }}
    />
  );
}

/**
 * Mini pitch visual (for tactical cards)
 */
export function MiniPitchVisual({ formation = '4-3-3', teamColor = '#3b9eff' }) {
  const positions = {
    '4-3-3': [
      { x: 50, y: 90 }, // GK
      { x: 20, y: 70 }, { x: 40, y: 70 }, { x: 60, y: 70 }, { x: 80, y: 70 }, // DEF
      { x: 30, y: 45 }, { x: 50, y: 45 }, { x: 70, y: 45 }, // MID
      { x: 25, y: 20 }, { x: 50, y: 20 }, { x: 75, y: 20 }, // FWD
    ],
    '4-4-2': [
      { x: 50, y: 90 },
      { x: 20, y: 70 }, { x: 40, y: 70 }, { x: 60, y: 70 }, { x: 80, y: 70 },
      { x: 20, y: 45 }, { x: 40, y: 45 }, { x: 60, y: 45 }, { x: 80, y: 45 },
      { x: 35, y: 20 }, { x: 65, y: 20 },
    ],
    '3-5-2': [
      { x: 50, y: 90 },
      { x: 25, y: 70 }, { x: 50, y: 70 }, { x: 75, y: 70 },
      { x: 15, y: 45 }, { x: 35, y: 45 }, { x: 50, y: 45 }, { x: 65, y: 45 }, { x: 85, y: 45 },
      { x: 35, y: 20 }, { x: 65, y: 20 },
    ],
  };
  
  const dots = positions[formation] || positions['4-3-3'];
  
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%">
      {/* Pitch outline */}
      <rect x="5" y="5" width="90" height="90" fill="none" stroke="rgba(59, 158, 255, 0.2)" strokeWidth="0.5" rx="2" />
      {/* Center line */}
      <line x1="5" y1="50" x2="95" y2="50" stroke="rgba(59, 158, 255, 0.15)" strokeWidth="0.5" />
      {/* Center circle */}
      <circle cx="50" cy="50" r="15" fill="none" stroke="rgba(59, 158, 255, 0.15)" strokeWidth="0.5" />
      {/* Penalty areas */}
      <rect x="25" y="5" width="50" height="15" fill="none" stroke="rgba(59, 158, 255, 0.15)" strokeWidth="0.5" />
      <rect x="25" y="80" width="50" height="15" fill="none" stroke="rgba(59, 158, 255, 0.15)" strokeWidth="0.5" />
      {/* Player dots */}
      {dots.map((pos, i) => (
        <circle
          key={i}
          cx={pos.x}
          cy={pos.y}
          r={3}
          fill={teamColor}
          opacity={0.8 + (i / dots.length) * 0.2}
        />
      ))}
    </svg>
  );
}