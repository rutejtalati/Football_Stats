import React from 'react';
import { formatPct, formatXg } from '../../utils/homeDataMappers';
import { ConfBadge } from './HomeMiniCharts';
import HomeSectionHeader from './HomeSectionHeader';

const TopPredictionsSection = ({ predictions = { predictions: [] } }) => {
  const preds = predictions.predictions || [];
  if (preds.length === 0) {
    return (
      <section className="hp-section">
        <div className="hp-container">
          <HomeSectionHeader title="Top Predictions" subtitle="Model-driven match forecasts" accentColor="var(--hp-blue)" />
          <div className="hp-empty">No predictions available — check back closer to match day.</div>
        </div>
      </section>
    );
  }

  return (
    <section className="hp-section">
      <div className="hp-container">
        <HomeSectionHeader
          title="Top Predictions"
          subtitle="Poisson-modelled match probabilities across top leagues"
          accentColor="var(--hp-blue)"
        />
        <div className="predictions-grid">
          {preds.map((p, i) => (
            <div className="hp-card pred-card" key={i}>
              <div className="pred-card__top">
                <div className="pred-card__team">
                  {p.homeLogo && <img src={p.homeLogo} alt="" />}
                  <div className="pred-card__team-info">
                    <span className="pred-card__team-name">{p.home}</span>
                    <span className="pred-card__team-prob" style={{ color: 'var(--hp-blue)' }}>
                      {formatPct(p.homeProb)}
                    </span>
                  </div>
                </div>
                <div className="pred-card__center">
                  <span className="pred-card__score">{p.score}</span>
                  <span className="pred-card__draw">Draw {formatPct(p.draw)}</span>
                </div>
                <div className="pred-card__team pred-card__team--away">
                  {p.awayLogo && <img src={p.awayLogo} alt="" />}
                  <div className="pred-card__team-info">
                    <span className="pred-card__team-name">{p.away}</span>
                    <span className="pred-card__team-prob" style={{ color: 'var(--hp-red)' }}>
                      {formatPct(p.awayProb)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Probability bar */}
              <div style={{ padding: '0 18px 12px' }}>
                <div className="pred-card__bar">
                  <div className="hero-match__prob-seg" style={{ width: `${p.homeProb}%`, background: 'var(--hp-blue)' }} />
                  <div className="hero-match__prob-seg" style={{ width: `${p.draw}%`, background: 'var(--hp-text-muted)', opacity: 0.3 }} />
                  <div className="hero-match__prob-seg" style={{ width: `${p.awayProb}%`, background: 'var(--hp-red)' }} />
                </div>
              </div>

              <div className="pred-card__stats">
                <div className="pred-card__stat">
                  <span className="pred-card__stat-val">{formatXg(p.xgHome)}</span>
                  <span className="pred-card__stat-label">xG Home</span>
                </div>
                <div className="pred-card__stat">
                  <ConfBadge level={p.conf} />
                  <span className="pred-card__stat-label">Confidence</span>
                </div>
                <div className="pred-card__stat">
                  <span className="pred-card__stat-val">{formatXg(p.xgAway)}</span>
                  <span className="pred-card__stat-label">xG Away</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TopPredictionsSection;