import React from 'react';
import HomeSectionHeader from './HomeSectionHeader';

const LEAGUE_DATA = [
  { code: 'epl', name: 'Premier League', country: 'England', color: '#4f9eff', teams: 20, matches: '380+' },
  { code: 'laliga', name: 'La Liga', country: 'Spain', color: '#f2c94c', teams: 20, matches: '380+' },
  { code: 'seriea', name: 'Serie A', country: 'Italy', color: '#00e09e', teams: 20, matches: '380+' },
  { code: 'bundesliga', name: 'Bundesliga', country: 'Germany', color: '#ff8c42', teams: 18, matches: '306+' },
  { code: 'ligue1', name: 'Ligue 1', country: 'France', color: '#b388ff', teams: 18, matches: '306+' },
];

const CompetitionCoverageSection = ({ leagueCoverage = { leagues: [] }, powerRankings = { rankings: [] } }) => {
  const coverageLeagues = leagueCoverage.leagues || [];

  // Merge static data with any dynamic coverage info
  const leagues = LEAGUE_DATA.map((ld) => {
    const dynamic = coverageLeagues.find((l) => l.code === ld.code) || {};
    return { ...ld, ...dynamic };
  });

  return (
    <section className="hp-section">
      <div className="hp-container">
        <HomeSectionHeader
          title="Competition Coverage"
          subtitle="Full prediction and analytics coverage across Europe's elite divisions"
          accentColor="var(--hp-purple)"
        />

        <div className="comp-grid">
          {leagues.map((league, i) => (
            <div className="hp-card comp-card" key={i} style={{ cursor: 'pointer' }}>
              {/* Top accent bar */}
              <div style={{ height: 3, background: league.color }} />

              <div className="comp-card__body">
                <div>
                  <div className="comp-card__country">{league.country}</div>
                  <div className="comp-card__title">{league.name}</div>
                </div>

                {/* Leader */}
                {league.topTeam && league.topTeam !== '—' && (
                  <div className="comp-card__leader">
                    {league.topTeamLogo && (
                      <img src={league.topTeamLogo} alt="" />
                    )}
                    <span className="comp-card__leader-name">{league.topTeam}</span>
                    {league.leaderPoints > 0 && (
                      <span className="comp-card__leader-pts">{league.leaderPoints} pts</span>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="comp-card__stats">
                  <div className="comp-card__stat">
                    <span className="comp-card__stat-val" style={{ color: league.color }}>{league.teams}</span>
                    <span className="comp-card__stat-label">Teams</span>
                  </div>
                  <div className="comp-card__stat">
                    <span className="comp-card__stat-val" style={{ color: league.color }}>{league.matches}</span>
                    <span className="comp-card__stat-label">Matches</span>
                  </div>
                </div>

                {/* Tracked badge */}
                <div className="comp-card__badge" style={{
                  background: `${league.color}15`,
                  color: league.color,
                }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%', background: league.color,
                    display: 'inline-block',
                  }} />
                  Full Coverage
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Power Rankings mini table (EPL) */}
        {(powerRankings.rankings || []).length > 0 && (
          <div style={{ marginTop: 'var(--hp-gap)' }}>
            <div className="hp-card hp-card--flat">
              <div className="hp-card__header">
                <span className="hp-card__header-title">
                  Power Rankings — {powerRankings.league || 'Premier League'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--hp-text-muted)' }}>
                  Composite score: Pts + Form + GD + PPG
                </span>
              </div>
              <div style={{ padding: 0 }}>
                {/* Header row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 28px 1fr 60px 100px 60px 60px',
                  gap: 8, padding: '8px 16px',
                  fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: 'var(--hp-text-muted)', borderBottom: '1px solid var(--hp-border)',
                }}>
                  <span>#</span>
                  <span></span>
                  <span>Team</span>
                  <span style={{ textAlign: 'right' }}>Pts</span>
                  <span>Form</span>
                  <span style={{ textAlign: 'right' }}>GD</span>
                  <span style={{ textAlign: 'right' }}>Power</span>
                </div>
                {powerRankings.rankings.slice(0, 6).map((r, i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 28px 1fr 60px 100px 60px 60px',
                    gap: 8, padding: '10px 16px', alignItems: 'center',
                    borderBottom: '1px solid var(--hp-border)',
                    background: i === 0 ? 'rgba(79, 158, 255, 0.03)' : 'transparent',
                  }}>
                    <span style={{
                      fontFamily: 'var(--hp-mono)', fontSize: 12, fontWeight: 700,
                      color: i < 4 ? 'var(--hp-blue)' : 'var(--hp-text-muted)',
                    }}>
                      {r.powerRank}
                    </span>
                    <span>
                      {r.logo && <img src={r.logo} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--hp-text)' }}>
                      {r.teamName}
                      {r.rankDelta !== 0 && (
                        <span style={{
                          fontSize: 10, marginLeft: 6,
                          color: r.rankDelta > 0 ? 'var(--hp-green)' : 'var(--hp-red)',
                        }}>
                          {r.rankDelta > 0 ? `+${r.rankDelta}` : r.rankDelta}
                        </span>
                      )}
                    </span>
                    <span style={{
                      fontFamily: 'var(--hp-mono)', fontSize: 13, fontWeight: 700,
                      color: 'var(--hp-text-bright)', textAlign: 'right',
                    }}>
                      {r.points}
                    </span>
                    <span>
                      <div className="form-strip">
                        {r.form.map((f, fi) => (
                          <div key={fi} className={`form-dot form-dot--${f}`}>{f}</div>
                        ))}
                      </div>
                    </span>
                    <span style={{
                      fontFamily: 'var(--hp-mono)', fontSize: 12, fontWeight: 600,
                      color: r.goalDiff > 0 ? 'var(--hp-green)' : r.goalDiff < 0 ? 'var(--hp-red)' : 'var(--hp-text-dim)',
                      textAlign: 'right',
                    }}>
                      {r.goalDiff > 0 ? '+' : ''}{r.goalDiff}
                    </span>
                    <span style={{
                      fontFamily: 'var(--hp-mono)', fontSize: 12, fontWeight: 700,
                      color: 'var(--hp-text-dim)', textAlign: 'right',
                    }}>
                      {r.powerPct}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CompetitionCoverageSection;