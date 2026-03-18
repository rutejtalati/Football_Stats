import React from 'react';
import { safeNum, safePct, safeStr } from '../../utils/homeDataMappers';
import HomeSectionHeader from './HomeSectionHeader';

const AccuracyRing = ({ value = 0, label = '', color = 'var(--hp-blue)', size = 56 }) => {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const pct = safePct(value);
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="acc-market">
      <div className="acc-market__ring" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hp-bg)" strokeWidth="5" />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s var(--hp-ease)' }}
          />
        </svg>
        <span className="acc-market__ring-val">{Math.round(pct)}%</span>
      </div>
      <span className="acc-market__label">{label}</span>
    </div>
  );
};

const PredictionAccountabilitySection = ({
  modelMetrics = {},
  recentResults = { results: [], correct: 0, total: 0 },
}) => {
  const accuracy = safeNum(modelMetrics.overallAccuracy, 64);
  const byMarket = modelMetrics.byMarket || [];
  const trend = modelMetrics.trend || [];
  const results = recentResults.results || [];
  const brierScore = modelMetrics.brierScore;
  const last30 = modelMetrics.last30Accuracy;

  return (
    <section className="hp-section">
      <div className="hp-container">
        <HomeSectionHeader
          title="Prediction Accountability"
          subtitle="Transparent model performance — every prediction tracked and verified"
          accentColor="var(--hp-green)"
        />

        <div className="accountability-layout">
          {/* Left — hero accuracy */}
          <div className="hp-card acc-hero">
            <div className="acc-hero__content">
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--hp-text-muted)' }}>
                Overall Accuracy
              </div>
              <div className="acc-hero__pct">{Math.round(accuracy)}%</div>
              <div className="acc-hero__label">Match Result Accuracy</div>
              <div className="acc-hero__sub">
                Verified across {safeStr(modelMetrics.fixturesCount, '15,000+')} fixtures.
                {last30 != null && ` Last 30 matches: ${Math.round(safePct(last30))}%.`}
                {brierScore != null && ` Brier score: ${safeNum(brierScore).toFixed(2)}.`}
              </div>

              {/* Audit-style details */}
              <div style={{
                marginTop: 16, paddingTop: 16,
                borderTop: '1px solid var(--hp-border)',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {[
                  { label: 'Model', value: 'Dixon-Coles Poisson v2' },
                  { label: 'Leagues', value: safeStr(modelMetrics.leaguesNote, 'EPL, La Liga, Serie A, Ligue 1') },
                  { label: 'Verification', value: 'Automated post-match' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: 'var(--hp-text-muted)' }}>{item.label}</span>
                    <span style={{ color: 'var(--hp-text)', fontWeight: 500, fontFamily: 'var(--hp-mono)', fontSize: 10 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — market breakdown + trend + results */}
          <div className="acc-right">
            {/* Market accuracy rings */}
            {byMarket.length > 0 && (
              <div className="acc-markets">
                {byMarket.map((m, i) => (
                  <AccuracyRing key={i} value={m.value} label={m.label} color={m.col} />
                ))}
              </div>
            )}

            {/* Accuracy trend chart */}
            {trend.length > 0 && (
              <div className="hp-card acc-trend hp-card--flat">
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--hp-text-muted)', marginBottom: 12 }}>
                  Accuracy Trend
                </div>
                <div className="acc-trend__chart">
                  {trend.map((t, i) => {
                    const h = Math.max(4, (safePct(t.acc) / 100) * 80);
                    const isGood = safePct(t.acc) >= 65;
                    return (
                      <div
                        key={i}
                        className="acc-trend__bar"
                        style={{
                          height: h,
                          background: isGood ? 'var(--hp-green)' : 'var(--hp-yellow)',
                          opacity: 0.7 + (i / trend.length) * 0.3,
                        }}
                        title={`${t.gw}: ${Math.round(safePct(t.acc))}%`}
                      >
                        <span className="acc-trend__bar-label">{t.gw}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent results */}
            {results.length > 0 && (
              <div className="hp-card hp-card--flat" style={{ overflow: 'hidden' }}>
                <div className="hp-card__header">
                  <span className="hp-card__header-title">Recent Predictions</span>
                  <span style={{ fontSize: 10, color: 'var(--hp-text-muted)' }}>
                    {recentResults.correct}/{recentResults.total} correct
                  </span>
                </div>
                <div className="acc-results">
                  {results.slice(0, 6).map((r, i) => (
                    <div className="acc-result-row" key={i}>
                      <span className="acc-result-row__team">{r.home}</span>
                      <span className="acc-result-row__team" style={{ textAlign: 'right' }}>{r.away}</span>
                      <span className="acc-result-row__score">{r.score}</span>
                      <span className="acc-result-row__pred">{r.pred}</span>
                      <span className={`acc-result-row__check ${
                        r.correct === true ? 'acc-result-row__check--correct' :
                        r.correct === false ? 'acc-result-row__check--wrong' :
                        'acc-result-row__check--pending'
                      }`}>
                        {r.correct === true ? '\u2713' : r.correct === false ? '\u2717' : '?'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PredictionAccountabilitySection;