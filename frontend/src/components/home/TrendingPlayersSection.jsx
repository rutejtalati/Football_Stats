import React from 'react';
import { safeNum } from '../../utils/homeDataMappers';
import { MiniBar } from './HomeMiniCharts';
import HomeSectionHeader from './HomeSectionHeader';

const TrendingPlayersSection = ({ trendingPlayers = { items: [] }, xgLeaders = { leaders: [] } }) => {
  const trending = trendingPlayers.items || [];
  const leaders = xgLeaders.leaders || [];

  if (trending.length === 0 && leaders.length === 0) {
    return (
      <section className="hp-section">
        <div className="hp-container">
          <HomeSectionHeader title="Trending Players" subtitle="Form and performance leaders" accentColor="var(--hp-pink)" />
          <div className="hp-empty">Player data loading — updates with each gameweek.</div>
        </div>
      </section>
    );
  }

  return (
    <section className="hp-section">
      <div className="hp-container">
        <HomeSectionHeader
          title="Trending Players"
          subtitle="Form leaders, top scorers, and rising performers across tracked leagues"
          accentColor="var(--hp-pink)"
        />

        {/* Trending form cards */}
        {trending.length > 0 && (
          <div className="trending-grid" style={{ marginBottom: leaders.length > 0 ? 'var(--hp-gap)' : 0 }}>
            {trending.slice(0, 8).map((p, i) => {
              const numValue = parseFloat(p.value) || 0;
              const maxVal = p.type === 'form' ? 10 : 250;
              return (
                <div className="hp-card" key={i}>
                  <div className="trending-card__body">
                    <div className="trending-card__header">
                      <span className="trending-card__name">{p.label}</span>
                      <span className="trending-card__type" style={{
                        background: `${p.col}18`,
                        color: p.col,
                      }}>
                        {p.type}
                      </span>
                    </div>
                    <div className="trending-card__sub">{p.sub}</div>
                    <div className="trending-card__value-row">
                      <span className="trending-card__value" style={{ color: p.col }}>{p.value}</span>
                      <span className="trending-card__value-label">
                        {p.type === 'form' ? 'rating' : 'pts'}
                      </span>
                    </div>
                    <div className="trending-card__bar-track">
                      <div
                        className="trending-card__bar-fill"
                        style={{ width: `${Math.min(100, (numValue / maxVal) * 100)}%`, background: p.col }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* xG Leaders table */}
        {leaders.length > 0 && (
          <div className="hp-card hp-card--flat">
            <div className="hp-card__header">
              <span className="hp-card__header-title">Goals + Assists Leaders — {xgLeaders.league || 'Premier League'}</span>
            </div>
            <div style={{ padding: 0 }}>
              {/* Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '36px 28px 1fr 50px 50px 50px 60px',
                gap: 8, padding: '8px 16px',
                fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em',
                color: 'var(--hp-text-muted)', borderBottom: '1px solid var(--hp-border)',
              }}>
                <span>#</span>
                <span></span>
                <span>Player</span>
                <span style={{ textAlign: 'right' }}>G</span>
                <span style={{ textAlign: 'right' }}>A</span>
                <span style={{ textAlign: 'right' }}>G+A</span>
                <span style={{ textAlign: 'right' }}>/90</span>
              </div>
              {leaders.slice(0, 8).map((l, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 28px 1fr 50px 50px 50px 60px',
                  gap: 8, padding: '10px 16px', alignItems: 'center',
                  borderBottom: '1px solid var(--hp-border)',
                  background: i === 0 ? 'rgba(244, 114, 182, 0.03)' : 'transparent',
                }}>
                  <span style={{
                    fontFamily: 'var(--hp-mono)', fontSize: 12, fontWeight: 700,
                    color: i < 3 ? 'var(--hp-pink)' : 'var(--hp-text-muted)',
                  }}>
                    {i + 1}
                  </span>
                  <span>
                    {l.photo ? (
                      <img src={l.photo} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--hp-bg-card-alt)' }} />
                    )}
                  </span>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--hp-text)' }}>{l.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      {l.teamLogo && <img src={l.teamLogo} alt="" style={{ width: 12, height: 12, objectFit: 'contain' }} />}
                      <span style={{ fontSize: 10, color: 'var(--hp-text-muted)' }}>{l.team}</span>
                    </div>
                  </div>
                  <span style={{ fontFamily: 'var(--hp-mono)', fontSize: 13, fontWeight: 700, color: 'var(--hp-text-bright)', textAlign: 'right' }}>
                    {safeNum(l.goals, 0)}
                  </span>
                  <span style={{ fontFamily: 'var(--hp-mono)', fontSize: 13, fontWeight: 600, color: 'var(--hp-text-dim)', textAlign: 'right' }}>
                    {safeNum(l.assists, 0)}
                  </span>
                  <span style={{ fontFamily: 'var(--hp-mono)', fontSize: 13, fontWeight: 700, color: 'var(--hp-pink)', textAlign: 'right' }}>
                    {safeNum(l.gPlusA, 0)}
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: 'var(--hp-mono)', fontSize: 12, color: 'var(--hp-text-dim)' }}>
                      {safeNum(l.per90, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default TrendingPlayersSection;