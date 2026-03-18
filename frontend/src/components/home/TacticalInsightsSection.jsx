import React from 'react';
import HomeSectionHeader from './HomeSectionHeader';
import { PitchSVG } from './HomeMiniCharts';

const TacticalInsightsSection = ({ tacticalInsight = { primary: {}, all: [] } }) => {
  const primary = tacticalInsight.primary || {};
  const others = (tacticalInsight.all || []).filter(
    (t) => t.player !== primary.player
  ).slice(0, 3);

  if (!primary.stat && others.length === 0) {
    return (
      <section className="hp-section">
        <div className="hp-container">
          <HomeSectionHeader title="Tactical Insights" subtitle="Team performance signals" accentColor="var(--hp-yellow)" />
          <div className="hp-empty">Tactical data loading — insights update with each match round.</div>
        </div>
      </section>
    );
  }

  return (
    <section className="hp-section">
      <div className="hp-container">
        <HomeSectionHeader
          title="Tactical Insights"
          subtitle="Performance signals, pressing profiles, and goal output analysis"
          accentColor="var(--hp-yellow)"
        />

        <div className="tactical-grid">
          {/* Primary insight — large card with pitch overlay */}
          <div className="hp-card tactical-primary">
            <PitchSVG />
            <div className="hp-card__body">
              <div>
                <span style={{
                  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: primary.col || 'var(--hp-yellow)',
                }}>
                  Featured Insight
                </span>
              </div>
              <div className="tactical-primary__stat">{primary.stat || '—'}</div>
              <div className="tactical-primary__label">{primary.label || 'Stat'}</div>
              <div className="tactical-primary__team">{primary.player || 'Team'}</div>
              <p className="tactical-primary__context">{primary.context || ''}</p>

              {/* Mini stat decorations */}
              <div style={{
                display: 'flex', gap: 20, marginTop: 8, paddingTop: 16,
                borderTop: '1px solid var(--hp-border)',
              }}>
                {[
                  { label: 'Attack Rating', val: primary.stat || '—', col: 'var(--hp-green)' },
                  { label: 'League Rank', val: '#1', col: 'var(--hp-yellow)' },
                  { label: 'Trend', val: 'Rising', col: 'var(--hp-blue)' },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontFamily: 'var(--hp-mono)', fontSize: 14, fontWeight: 700, color: s.col }}>
                      {s.val}
                    </span>
                    <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--hp-text-muted)' }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar — other insights */}
          <div className="tactical-sidebar">
            {others.map((t, i) => (
              <div className="hp-card tactical-mini" key={i}>
                <div className="tactical-mini__stat-block">
                  <span className="tactical-mini__val" style={{ color: t.col || 'var(--hp-blue)' }}>
                    {t.stat || '—'}
                  </span>
                  <span className="tactical-mini__unit">{t.label || 'Stat'}</span>
                </div>
                <div className="tactical-mini__info">
                  <span className="tactical-mini__team">{t.player || 'Team'}</span>
                  <span className="tactical-mini__desc">
                    {t.context ? t.context.substring(0, 100) + (t.context.length > 100 ? '...' : '') : ''}
                  </span>
                </div>
              </div>
            ))}

            {/* Defensive insight teaser */}
            <div className="hp-card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
                {/* Mini pitch graphic */}
                <svg width="48" height="48" viewBox="0 0 48 48" style={{ flexShrink: 0, opacity: 0.6 }}>
                  <rect x="2" y="2" width="44" height="44" rx="3" fill="none" stroke="var(--hp-text-muted)" strokeWidth="1" />
                  <line x1="2" y1="24" x2="46" y2="24" stroke="var(--hp-text-muted)" strokeWidth="0.5" />
                  <circle cx="24" cy="24" r="8" fill="none" stroke="var(--hp-text-muted)" strokeWidth="0.5" />
                  <rect x="12" y="2" width="24" height="12" fill="none" stroke="var(--hp-green)" strokeWidth="0.5" opacity="0.5" />
                  <rect x="12" y="34" width="24" height="12" fill="none" stroke="var(--hp-red)" strokeWidth="0.5" opacity="0.5" />
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--hp-text)' }}>
                    Deeper tactical analysis
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--hp-text-muted)' }}>
                    Pressing intensity, chance creation, and defensive shape reports available per league.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TacticalInsightsSection;