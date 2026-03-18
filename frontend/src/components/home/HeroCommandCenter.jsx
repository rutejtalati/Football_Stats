// ═══════════════════════════════════════════════════════════
// HeroCommandCenter — Compact hero, gets to content fast
// ═══════════════════════════════════════════════════════════
import { Link } from "react-router-dom";

export default function HeroCommandCenter({ predictions = { predictions: [] } }) {
  return (
    <div className="hero-cmd">
      {/* Background field geometry */}
      <div className="hero-field">
        <svg className="hero-field-svg" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
          <circle cx="600" cy="300" r="120" fill="none" stroke="#38bdf8" strokeWidth="1" />
          <circle cx="600" cy="300" r="4" fill="#38bdf8" />
          <line x1="600" y1="0" x2="600" y2="600" stroke="#38bdf8" strokeWidth="1" />
          <rect x="50" y="30" width="1100" height="540" fill="none" stroke="#38bdf8" strokeWidth="1" rx="2" />
          <rect x="50" y="150" width="180" height="300" fill="none" stroke="#38bdf8" strokeWidth="0.8" />
          <rect x="970" y="150" width="180" height="300" fill="none" stroke="#38bdf8" strokeWidth="0.8" />
          <line x1="350" y1="30" x2="350" y2="570" stroke="#38bdf8" strokeWidth="0.3" strokeDasharray="8 12" />
          <line x1="850" y1="30" x2="850" y2="570" stroke="#38bdf8" strokeWidth="0.3" strokeDasharray="8 12" />
        </svg>
        <div className="hero-field-glow hero-field-glow--blue" />
        <div className="hero-field-glow hero-field-glow--green" />
      </div>

      {/* Radar */}
      <div className="hero-radar">
        <div className="hero-radar-ring hero-radar-ring--1" />
        <div className="hero-radar-ring hero-radar-ring--2" />
        <div className="hero-radar-ring hero-radar-ring--3" />
        <div className="hero-radar-sweep" />
      </div>

      <div className="hero-node hero-node--1" />
      <div className="hero-node hero-node--2" />
      <div className="hero-node hero-node--3" />
      <div className="hero-node hero-node--4" />

      {/* Content */}
      <div className="hero-content">
        <div className="hero-tag">
          <span className="hero-tag-dot" />
          Football Intelligence Platform
        </div>

        <h1 className="hero-h1">
          See the game<br />before it <span>happens</span>.
        </h1>

        <p className="hero-sub">
          Predictions, live intelligence, tactical analysis, and FPL tools
          — powered by data you can verify.
        </p>

        <div className="hero-actions">
          <Link to="/predictions/premier-league" className="hero-btn hero-btn--primary">
            Predictions
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link to="/live" className="hero-btn hero-btn--ghost">Live</Link>
          <Link to="/best-team" className="hero-btn hero-btn--ghost">FPL Tools</Link>
          <Link to="/player" className="hero-btn hero-btn--ghost">Players</Link>
        </div>
      </div>
    </div>
  );
}