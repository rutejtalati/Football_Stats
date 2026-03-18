import React from 'react';
import { formatPct, formatXg } from '../../utils/homeDataMappers';
import { ProbBar, ConfBadge } from './HomeMiniCharts';

const FeaturedMatchPanel = ({ predictions = { predictions: [] } }) => {
  // Show predictions 1-3 (hero already shows #0)
  const matches = (predictions.predictions || []).slice(1, 4);
  if (matches.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(matches.length, 3)}, 1fr)`, gap: 'var(--hp-gap-sm)' }}>
      {matches.map((m, i) => (
        <div className="hp-card" key={i} style={{ cursor: 'pointer' }}>
          <div className="hp-card__header">
            <span className="hp-card__header-title">{m.league || 'Match'}</span>
            <ConfBadge level={m.conf} />
          </div>
          <div style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {m.homeLogo && <img src={m.homeLogo} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />}
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--hp-text)' }}>{m.home}</span>
              </div>
              <span style={{ fontFamily: 'var(--hp-mono)', fontSize: 14, fontWeight: 700, color: 'var(--hp-blue)' }}>
                {formatPct(m.homeProb)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {m.awayLogo && <img src={m.awayLogo} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />}
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--hp-text)' }}>{m.away}</span>
              </div>
              <span style={{ fontFamily: 'var(--hp-mono)', fontSize: 14, fontWeight: 700, color: 'var(--hp-red)' }}>
                {formatPct(m.awayProb)}
              </span>
            </div>
            <ProbBar home={m.homeProb} draw={m.draw} away={m.awayProb} height={5} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: 'var(--hp-text-muted)' }}>
              <span>xG: {formatXg(m.xgHome)} - {formatXg(m.xgAway)}</span>
              <span>Pred: {m.score}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FeaturedMatchPanel;