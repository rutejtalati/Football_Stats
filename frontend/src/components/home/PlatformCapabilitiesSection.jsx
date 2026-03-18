import React from 'react';
import HomeSectionHeader from './HomeSectionHeader';

const CAPABILITIES = [
  {
    title: 'Match Predictions',
    desc: 'Dixon-Coles Poisson model with Elo adjustments. Probabilities, scorelines, and confidence ratings for every fixture across five leagues.',
    stat: '15,000+',
    statLabel: 'fixtures modelled',
    color: 'var(--hp-blue)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 1L14 7.5L21 8.5L16 13.5L17 20.5L11 17L5 20.5L6 13.5L1 8.5L8 7.5L11 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Live Intelligence',
    desc: 'Real-time match momentum, win probability shifts, and tactical pattern detection. Updated every 60 seconds during live play.',
    stat: '60s',
    statLabel: 'refresh cycle',
    color: 'var(--hp-green)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.5" />
        <polyline points="11,5 11,11 15,14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'FPL Engine',
    desc: 'Captain picks, differential signals, best XI optimization, fixture difficulty ratings, and points-per-million value analysis.',
    stat: '600+',
    statLabel: 'players tracked',
    color: 'var(--hp-teal)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="3" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <line x1="3" y1="9" x2="19" y2="9" stroke="currentColor" strokeWidth="1" />
        <line x1="9" y1="3" x2="9" y2="19" stroke="currentColor" strokeWidth="1" />
      </svg>
    ),
  },
  {
    title: 'Lineup Predictor',
    desc: 'Predicted starting XIs using exponential decay weighting, injury data, and formation detection from recent official lineups.',
    stat: '94%',
    statLabel: 'max confidence',
    color: 'var(--hp-yellow)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 19C4 15.134 7.134 12 11 12C14.866 12 18 15.134 18 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Shot Maps & xG',
    desc: 'Zonal shot placement, expected goals per shot, and conversion efficiency analysis. Visual pitch-mapped data for every tracked fixture.',
    stat: '9',
    statLabel: 'shot zones',
    color: 'var(--hp-orange)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="11" cy="11" r="5" stroke="currentColor" strokeWidth="1" />
        <circle cx="11" cy="11" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Season Simulation',
    desc: 'Monte Carlo engine running 50,000 season simulations. Title probability, top-four odds, and relegation risk per team.',
    stat: '50K',
    statLabel: 'simulations',
    color: 'var(--hp-red)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <polyline points="2,18 7,10 12,14 20,4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="15,4 20,4 20,9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const PlatformCapabilitiesSection = () => {
  return (
    <section className="hp-section">
      <div className="hp-container">
        <HomeSectionHeader
          title="Platform Capabilities"
          subtitle="A complete football intelligence operating system"
          accentColor="var(--hp-orange)"
        />

        <div className="platform-grid">
          {CAPABILITIES.map((cap, i) => (
            <div className="hp-card platform-card" key={i} style={{ cursor: 'pointer' }}>
              <div className="platform-card__body">
                <div className="platform-card__top">
                  <div className="platform-card__icon" style={{
                    background: `${cap.color}12`,
                    color: cap.color,
                  }}>
                    {cap.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="platform-card__title">{cap.title}</div>
                  </div>
                </div>
                <div className="platform-card__desc">{cap.desc}</div>
                <div className="platform-card__stat">
                  <span className="platform-card__stat-val" style={{ color: cap.color }}>
                    {cap.stat}
                  </span>
                  <span className="platform-card__stat-label">{cap.statLabel}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlatformCapabilitiesSection;