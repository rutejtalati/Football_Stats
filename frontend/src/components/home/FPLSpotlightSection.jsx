import React from 'react';
import { safeNum, safeStr } from '../../utils/homeDataMappers';
import { MiniBar } from './HomeMiniCharts';
import HomeSectionHeader from './HomeSectionHeader';

const FPLSpotlightSection = ({ fplSpotlight = { captains: [], valuePlayers: [] } }) => {
  const captains = fplSpotlight.captains || [];
  const valuePlayers = fplSpotlight.valuePlayers || [];

  if (captains.length === 0 && valuePlayers.length === 0) {
    return (
      <section className="hp-section">
        <div className="hp-container">
          <HomeSectionHeader title="FPL Spotlight" subtitle="Fantasy Premier League intelligence" accentColor="var(--hp-teal)" />
          <div className="hp-empty">FPL data will populate when the season is active.</div>
        </div>
      </section>
    );
  }

  return (
    <section className="hp-section">
      <div className="hp-container">
        <HomeSectionHeader
          title="FPL Spotlight"
          subtitle="Differential captain picks, value players, and transfer intelligence"
          accentColor="var(--hp-teal)"
        />

        <div className="fpl-grid">
          {/* Differential Captains */}
          <div className="hp-card hp-card--flat">
            <div className="hp-card__header">
              <span className="hp-card__header-title">Differential Captains</span>
              <span style={{ fontSize: 10, color: 'var(--hp-text-muted)' }}>Low ownership, high upside</span>
            </div>
            <div className="fpl-captain-list">
              {/* Header */}
              <div className="fpl-captain-row" style={{ background: 'var(--hp-bg-elevated)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--hp-text-muted)' }}>
                <span style={{ textAlign: 'center' }}>#</span>
                <span>Player</span>
                <span style={{ textAlign: 'right' }}>Form</span>
                <span style={{ textAlign: 'right' }}>Own%</span>
                <span style={{ textAlign: 'right' }}>Cost</span>
              </div>
              {captains.slice(0, 5).map((c, i) => (
                <div className="fpl-captain-row" key={i}>
                  <span className="fpl-captain-row__rank">{i + 1}</span>
                  <div>
                    <div className="fpl-captain-row__name">{c.name}</div>
                    <div className="fpl-captain-row__team">{c.teamShort} / {c.position}</div>
                  </div>
                  <span className="fpl-captain-row__val" style={{ color: 'var(--hp-green)' }}>
                    {safeStr(c.form, '—')}
                  </span>
                  <span className="fpl-captain-row__val" style={{ color: 'var(--hp-text-dim)' }}>
                    {safeStr(c.ownership, '0')}%
                  </span>
                  <span className="fpl-captain-row__val">
                    {safeNum(c.cost, 0).toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Value Players */}
          <div className="hp-card hp-card--flat">
            <div className="hp-card__header">
              <span className="hp-card__header-title">Best Value Players</span>
              <span style={{ fontSize: 10, color: 'var(--hp-text-muted)' }}>Points per million</span>
            </div>
            <div style={{ padding: 0 }}>
              {valuePlayers.slice(0, 5).map((p, i) => (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 60px',
                  gap: 12, padding: '12px 16px', alignItems: 'center',
                  borderBottom: '1px solid var(--hp-border)',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--hp-text)' }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--hp-text-muted)', marginTop: 2 }}>
                      {p.teamShort} / {p.position} / {safeNum(p.cost, 0).toFixed(1)}m
                    </div>
                    <div style={{ marginTop: 6, width: '100%' }}>
                      <MiniBar value={safeNum(p.valueScore, 0)} max={30} color="var(--hp-teal)" height={3} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--hp-mono)', fontSize: 16, fontWeight: 700, color: 'var(--hp-teal)' }}>
                      {safeNum(p.valueScore, 0).toFixed(1)}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--hp-text-muted)', textTransform: 'uppercase' }}>
                      pts/m
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'var(--hp-mono)', fontSize: 14, fontWeight: 600,
                    color: 'var(--hp-text-bright)', textAlign: 'right',
                  }}>
                    {safeNum(p.totalPoints, 0)}
                    <div style={{ fontSize: 9, color: 'var(--hp-text-muted)', fontWeight: 400 }}>PTS</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FPLSpotlightSection;