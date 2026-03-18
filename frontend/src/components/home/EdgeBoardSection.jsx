import React from 'react';
import { safeNum, safePct } from '../../utils/homeDataMappers';
import HomeSectionHeader from './HomeSectionHeader';

const EdgeBoardSection = ({ edges = { edges: [] }, highScoringMatches = [] }) => {
  const edgeList = edges.edges || [];

  return (
    <section className="hp-section">
      <div className="hp-container">
        <HomeSectionHeader
          title="Edge Board"
          subtitle="Where the model diverges from consensus — value signals and high-threat matches"
          accentColor="var(--hp-green)"
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--hp-gap)' }}>
          {/* Model Edges */}
          <div className="hp-card hp-card--flat">
            <div className="hp-card__header">
              <span className="hp-card__header-title">Model Value Edges</span>
              <span style={{ fontSize: 10, color: 'var(--hp-text-muted)' }}>{edgeList.length} signals</span>
            </div>
            <div className="hp-card__body" style={{ padding: 0 }}>
              {edgeList.length === 0 ? (
                <div className="hp-empty">No significant edges detected this week</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--hp-border)' }}>
                  {edgeList.map((e, i) => (
                    <div key={i} className="edge-card__body" style={{ background: 'var(--hp-bg-card)' }}>
                      <div className="edge-card__matchup">
                        {e.home} <span>vs</span> {e.away}
                      </div>
                      <div className="edge-card__signal">
                        <div className="edge-card__bar-track">
                          <div
                            className="edge-card__bar-fill"
                            style={{ width: `${safePct(e.modelProb)}%`, background: e.col }}
                          />
                        </div>
                        <span className="edge-card__edge-val" style={{ color: e.col }}>
                          +{safeNum(e.edge, 0)}%
                        </span>
                      </div>
                      <div className="edge-card__meta">
                        <span>{e.label}</span>
                        <span>Model: {safePct(e.modelProb)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* High Threat Matches */}
          <div className="hp-card hp-card--flat">
            <div className="hp-card__header">
              <span className="hp-card__header-title">High Threat Matches</span>
              <span style={{ fontSize: 10, color: 'var(--hp-text-muted)' }}>By total xG</span>
            </div>
            <div className="hp-card__body" style={{ padding: 0 }}>
              {highScoringMatches.length === 0 ? (
                <div className="hp-empty">No high-scoring predictions available</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--hp-border)' }}>
                  {highScoringMatches.slice(0, 5).map((m, i) => {
                    const totalXg = safeNum(m.totalXg, 0);
                    return (
                      <div key={i} style={{
                        display: 'grid', gridTemplateColumns: '1fr 80px 60px',
                        alignItems: 'center', gap: 8, padding: '12px 16px',
                        background: 'var(--hp-bg-card)',
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--hp-text)' }}>
                            {m.home} v {m.away}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--hp-text-muted)', marginTop: 2 }}>
                            {m.league || 'League'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--hp-mono)', fontSize: 14, fontWeight: 700, color: 'var(--hp-orange)' }}>
                            {totalXg.toFixed(2)}
                          </div>
                          <div style={{ fontSize: 9, color: 'var(--hp-text-muted)', textTransform: 'uppercase' }}>
                            Total xG
                          </div>
                        </div>
                        <div style={{
                          fontFamily: 'var(--hp-mono)', fontSize: 13, fontWeight: 600,
                          color: 'var(--hp-text-bright)', textAlign: 'center',
                        }}>
                          {m.score || '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EdgeBoardSection;