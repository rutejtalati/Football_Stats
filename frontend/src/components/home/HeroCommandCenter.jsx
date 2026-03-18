// ═══════════════════════════════════════════════════════════
// HeroCommandCenter — Signature branded intelligence hero
// Props from mapDashboard:
//   predictions: { predictions: [{confPct, ...}], league }
//   modelMetrics: { overallAccuracy, fixturesCount, ... }
//   modelConfidence: { high, medium, low, avg }
// ═══════════════════════════════════════════════════════════
import { Link } from "react-router-dom";

export default function HeroCommandCenter({
  predictions = { predictions: [], league: "" },
  modelMetrics = {},
  modelConfidence = {},
}) {
  const preds = predictions.predictions || [];
  const totalPredictions = preds.length;
  const avgConf =
    totalPredictions > 0
      ? Math.round(preds.reduce((s, p) => s + (p.confPct || 0), 0) / totalPredictions)
      : modelConfidence.avg || 0;

  return (
    <div className="hero-cmd">
      {/* ── Background: field geometry ── */}
      <div className="hero-field">
        <svg className="hero-field-svg" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice">
          <circle cx="600" cy="300" r="120" fill="none" stroke="#38bdf8" strokeWidth="1" />
          <circle cx="600" cy="300" r="4" fill="#38bdf8" />
          <line x1="600" y1="0" x2="600" y2="600" stroke="#38bdf8" strokeWidth="1" />
          <rect x="50" y="30" width="1100" height="540" fill="none" stroke="#38bdf8" strokeWidth="1" rx="2" />
          <rect x="50" y="150" width="180" height="300" fill="none" stroke="#38bdf8" strokeWidth="0.8" />
          <rect x="970" y="150" width="180" height="300" fill="none" stroke="#38bdf8" strokeWidth="0.8" />
          <rect x="50" y="220" width="70" height="160" fill="none" stroke="#38bdf8" strokeWidth="0.6" />
          <rect x="1080" y="220" width="70" height="160" fill="none" stroke="#38bdf8" strokeWidth="0.6" />
          <path d="M 230 240 A 60 60 0 0 1 230 360" fill="none" stroke="#38bdf8" strokeWidth="0.6" />
          <path d="M 970 240 A 60 60 0 0 0 970 360" fill="none" stroke="#38bdf8" strokeWidth="0.6" />
          <line x1="350" y1="30" x2="350" y2="570" stroke="#38bdf8" strokeWidth="0.3" strokeDasharray="8 12" />
          <line x1="850" y1="30" x2="850" y2="570" stroke="#38bdf8" strokeWidth="0.3" strokeDasharray="8 12" />
        </svg>
        <div className="hero-field-glow hero-field-glow--blue" />
        <div className="hero-field-glow hero-field-glow--green" />
      </div>

      {/* ── Radar sweep ── */}
      <div className="hero-radar">
        <div className="hero-radar-ring hero-radar-ring--1" />
        <div className="hero-radar-ring hero-radar-ring--2" />
        <div className="hero-radar-ring hero-radar-ring--3" />
        <div className="hero-radar-ring hero-radar-ring--4" />
        <div className="hero-radar-sweep" />
      </div>

      {/* ── Signal nodes ── */}
      <div className="hero-node hero-node--1" />
      <div className="hero-node hero-node--2" />
      <div className="hero-node hero-node--3" />
      <div className="hero-node hero-node--4" />
      <div className="hero-node hero-node--5" />

      {/* ── Content ── */}
      <div className="hero-content">
        <div className="hero-tag">
          <span className="hero-tag-dot" />
          Football Intelligence Platform
        </div>

        <h1 className="hero-h1">
          See the game<br />
          before it <span>happens</span>.
        </h1>

        <p className="hero-sub">
          Predictions, live intelligence, tactical analysis, and fantasy insights
          — all powered by data you can verify and trust.
        </p>

        <div className="hero-actions">
          <Link to="/predictions/premier-league" className="hero-btn hero-btn--primary">
            View Predictions
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <Link to="/live" className="hero-btn hero-btn--ghost">
            Live Matches
          </Link>
        </div>

        <div className="hero-stats">
          {totalPredictions > 0 && (
            <div className="hero-stat">
              <span className="hero-stat-val">{totalPredictions}</span>
              <span className="hero-stat-lbl">Active Predictions</span>
            </div>
          )}
          {avgConf > 0 && (
            <div className="hero-stat">
              <span className="hero-stat-val">{avgConf}%</span>
              <span className="hero-stat-lbl">Avg Confidence</span>
            </div>
          )}
          {modelMetrics.overallAccuracy > 0 && (
            <div className="hero-stat">
              <span className="hero-stat-val">{modelMetrics.overallAccuracy}%</span>
              <span className="hero-stat-lbl">Model Accuracy</span>
            </div>
          )}
          {modelMetrics.fixturesCount && (
            <div className="hero-stat">
              <span className="hero-stat-val">{modelMetrics.fixturesCount}</span>
              <span className="hero-stat-lbl">Fixtures Analyzed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}