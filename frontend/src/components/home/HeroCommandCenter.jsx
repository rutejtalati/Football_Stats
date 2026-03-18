import React from 'react';
import { formatPct, formatXg, safeStr, safePct, safeNum } from '../../utils/homeDataMappers';

const HeroCommandCenter = ({ predictions = { predictions: [] }, modelMetrics = {}, modelConfidence = {} }) => {
  const featured = predictions.predictions?.[0] || null;
  const totalPreds = predictions.predictions?.length || 0;

  const metrics = [
    { val: `${safeNum(modelMetrics.overallAccuracy, 64)}%`, label: 'Model Accuracy' },
    { val: safeStr(modelMetrics.fixturesCount, '15,000+'), label: 'Fixtures Analyzed' },
    { val: `${safeNum(modelConfidence.avg, 62)}%`, label: 'Avg Confidence' },
    { val: '5', label: 'Leagues Tracked' },
  ];

  return (
    <section className="hero-cc">
      {/* Background layers */}
      <div className="hero-cc__bg">
        <div className="hero-cc__grid-canvas" />
        <div className="hero-cc__glow hero-cc__glow--blue" />
        <div className="hero-cc__glow hero-cc__glow--green" />
        <div className="hero-cc__sweep" />
        <div className="hero-cc__sweep" style={{ top: '60%', animationDelay: '2s' }} />
      </div>

      <div className="hero-cc__content">
        {/* Left — headline + metrics */}
        <div className="hero-cc__left">
          <div className="hero-cc__badge">
            <span className="hero-cc__badge-dot" />
            Intelligence Engine Active
          </div>

          <h1 className="hero-cc__headline">
            Football Intelligence,<br />
            <span>Quantified.</span>
          </h1>

          <p className="hero-cc__sub">
            Poisson-modelled predictions, Elo power rankings, xG analytics, and FPL
            intelligence across Europe's top five leagues. Every match, every edge, every signal.
          </p>

          <div className="hero-cc__metrics">
            {metrics.map((m, i) => (
              <div className="hero-cc__metric-card" key={i}>
                <span className="hero-cc__metric-val">{m.val}</span>
                <span className="hero-cc__metric-label">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — featured match cockpit */}
        {featured ? (
          <div className="hero-cc__right">
            <div className="hero-match__header">
              <span className="hero-match__league">{featured.league || 'Premier League'}</span>
              <span className="hero-match__kickoff">
                {featured.kickoff} {featured.time}
              </span>
            </div>

            <div className="hero-match__teams">
              <div className="hero-match__team">
                {featured.homeLogo && <img src={featured.homeLogo} alt="" />}
                <span className="hero-match__team-name">{featured.home}</span>
              </div>
              <div className="hero-match__vs">
                <span className="hero-match__score-pred">{featured.score}</span>
                <span className="hero-match__vs-label">Predicted</span>
              </div>
              <div className="hero-match__team">
                {featured.awayLogo && <img src={featured.awayLogo} alt="" />}
                <span className="hero-match__team-name">{featured.away}</span>
              </div>
            </div>

            <div className="hero-match__probs">
              <div className="hero-match__prob-bar">
                <div className="hero-match__prob-seg" style={{ width: `${featured.homeProb}%`, background: 'var(--hp-blue)' }} />
                <div className="hero-match__prob-seg" style={{ width: `${featured.draw}%`, background: 'var(--hp-text-muted)', opacity: 0.3 }} />
                <div className="hero-match__prob-seg" style={{ width: `${featured.awayProb}%`, background: 'var(--hp-red)' }} />
              </div>
              <div className="hero-match__prob-labels">
                <span><strong style={{ color: 'var(--hp-blue)' }}>{formatPct(featured.homeProb)}</strong> Home</span>
                <span><strong>{formatPct(featured.draw)}</strong> Draw</span>
                <span><strong style={{ color: 'var(--hp-red)' }}>{formatPct(featured.awayProb)}</strong> Away</span>
              </div>
            </div>

            <div className="hero-match__stats">
              <div className="hero-match__stat">
                <span className="hero-match__stat-val">{formatXg(featured.xgHome)}</span>
                <span className="hero-match__stat-label">xG Home</span>
              </div>
              <div className="hero-match__stat">
                <span className="hero-match__stat-val" style={{ color: `var(--hp-${featured.conf === 'high' ? 'green' : featured.conf === 'medium' ? 'yellow' : 'red'})` }}>
                  {featured.conf?.toUpperCase()}
                </span>
                <span className="hero-match__stat-label">Confidence</span>
              </div>
              <div className="hero-match__stat">
                <span className="hero-match__stat-val">{formatXg(featured.xgAway)}</span>
                <span className="hero-match__stat-label">xG Away</span>
              </div>
            </div>

            <div className="hero-match__insight">
              <strong>Model Signal:</strong> {featured.homeProb > featured.awayProb
                ? `${featured.home} favoured at ${formatPct(featured.homeProb)} with a predicted ${featured.score} scoreline.`
                : `${featured.away} favoured at ${formatPct(featured.awayProb)} with a predicted ${featured.score} scoreline.`}
            </div>
          </div>
        ) : (
          <div className="hero-cc__right" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <span style={{ color: 'var(--hp-text-muted)', fontSize: 13 }}>Match data loading...</span>
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroCommandCenter;