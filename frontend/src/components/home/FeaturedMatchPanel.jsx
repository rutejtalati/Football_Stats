import React from 'react';
import { Link } from 'react-router-dom';
import { ProbabilityBar, ProgressBar, FormPips, AnimatedNumber, LiveDot, MiniPitchVisual } from './HomeMiniCharts';
import HomeSectionHeader from './HomeSectionHeader';

// Icons
const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

const GoalIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ChartBarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="10" width="4" height="11" rx="1" />
    <rect x="10" y="3" width="4" height="18" rx="1" />
    <rect x="17" y="8" width="4" height="13" rx="1" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

// Metric card component
const MetricCard = ({ icon, label, homeValue, awayValue, unit = '', highlight = null }) => {
  const homeNum = parseFloat(homeValue) || 0;
  const awayNum = parseFloat(awayValue) || 0;
  const total = homeNum + awayNum || 1;
  
  return (
    <div className="hp-featured__metric">
      <div className="hp-featured__metric-header">
        {icon}
        <span className="hp-featured__metric-label">{label}</span>
      </div>
      <div className="hp-featured__metric-values">
        <span className={`hp-featured__metric-value ${highlight === 'home' ? 'hp-featured__metric-value--highlight' : ''}`}>
          {homeValue}{unit}
        </span>
        <div className="hp-featured__metric-bar">
          <div 
            className="hp-featured__metric-bar-fill hp-featured__metric-bar-fill--home"
            style={{ width: `${(homeNum / total) * 100}%` }}
          />
          <div 
            className="hp-featured__metric-bar-fill hp-featured__metric-bar-fill--away"
            style={{ width: `${(awayNum / total) * 100}%` }}
          />
        </div>
        <span className={`hp-featured__metric-value ${highlight === 'away' ? 'hp-featured__metric-value--highlight' : ''}`}>
          {awayValue}{unit}
        </span>
      </div>
    </div>
  );
};

// Key insight chip
const InsightChip = ({ text, type = 'neutral' }) => (
  <span className={`hp-featured__insight hp-featured__insight--${type}`}>
    {text}
  </span>
);

const FeaturedMatchPanel = ({ match }) => {
  if (!match) {
    return (
      <section className="hp-featured hp-featured--loading hp-section hp-reveal">
        <div className="hp-container">
          <HomeSectionHeader 
            title="Featured Analysis"
            subtitle="Loading match data..."
          />
          <div className="hp-featured__skeleton">
            <div className="hp-shimmer" style={{ height: '400px', borderRadius: '16px' }} />
          </div>
        </div>
      </section>
    );
  }
  
  const {
    home_team, away_team, home_logo, away_logo,
    p_home_win, p_draw, p_away_win,
    xg_home, xg_away, confidence,
    over25, btts, most_likely_score,
    home_form, away_form,
    fixture_date, fixture_time, venue,
    fixture_id
  } = match;
  
  // Determine favorite
  const favorite = p_home_win > p_away_win ? 'home' : p_away_win > p_home_win ? 'away' : 'draw';
  const favoriteTeam = favorite === 'home' ? home_team : favorite === 'away' ? away_team : null;
  const favoriteProb = Math.max(p_home_win, p_draw, p_away_win);
  
  // Generate insights
  const insights = [];
  if (confidence >= 0.75) insights.push({ text: 'High confidence', type: 'positive' });
  if (over25 >= 0.65) insights.push({ text: 'Goals expected', type: 'positive' });
  if (btts >= 0.60) insights.push({ text: 'Both teams to score likely', type: 'neutral' });
  if (favorite === 'draw') insights.push({ text: 'Tight contest', type: 'neutral' });
  if (xg_home > 2 || xg_away > 2) insights.push({ text: 'High attacking output', type: 'positive' });
  
  return (
    <section className="hp-featured hp-section hp-reveal">
      <div className="hp-container">
        <HomeSectionHeader 
          title="Featured Analysis"
          subtitle="Deep dive into today's key matchup"
          accentColor="var(--hp-blue)"
          action={`/match/${fixture_id}`}
          actionLabel="Full Analysis"
        />
        
        <div className="hp-featured__panel">
          {/* Match header */}
          <div className="hp-featured__header">
            <div className="hp-featured__team hp-featured__team--home">
              {home_logo && <img src={home_logo} alt="" className="hp-featured__logo" />}
              <span className={`hp-featured__name ${favorite === 'home' ? 'hp-featured__name--favored' : ''}`}>
                {home_team}
              </span>
              <FormPips form={home_form} />
            </div>
            
            <div className="hp-featured__center">
              <div className="hp-featured__datetime">
                <span className="hp-featured__date">{fixture_date}</span>
                <span className="hp-featured__time">{fixture_time}</span>
              </div>
              <div className="hp-featured__expected-score">
                <span className="hp-featured__xg-value">{xg_home?.toFixed(1)}</span>
                <span className="hp-featured__xg-separator">-</span>
                <span className="hp-featured__xg-value">{xg_away?.toFixed(1)}</span>
              </div>
              <span className="hp-featured__xg-label">Expected Goals</span>
              {venue && <span className="hp-featured__venue">{venue}</span>}
            </div>
            
            <div className="hp-featured__team hp-featured__team--away">
              {away_logo && <img src={away_logo} alt="" className="hp-featured__logo" />}
              <span className={`hp-featured__name ${favorite === 'away' ? 'hp-featured__name--favored' : ''}`}>
                {away_team}
              </span>
              <FormPips form={away_form} />
            </div>
          </div>
          
          {/* Probability visualization */}
          <div className="hp-featured__probs">
            <div className="hp-featured__prob-header">
              <span>Win Probability</span>
              <span className="hp-featured__confidence">
                Confidence: <strong>{Math.round(confidence * 100)}%</strong>
              </span>
            </div>
            <ProbabilityBar home={p_home_win} draw={p_draw} away={p_away_win} />
            <div className="hp-featured__prob-labels">
              <div className="hp-featured__prob-label">
                <span className="hp-featured__prob-team">{home_team}</span>
                <span className="hp-featured__prob-value">{Math.round(p_home_win * 100)}%</span>
              </div>
              <div className="hp-featured__prob-label hp-featured__prob-label--draw">
                <span className="hp-featured__prob-team">Draw</span>
                <span className="hp-featured__prob-value">{Math.round(p_draw * 100)}%</span>
              </div>
              <div className="hp-featured__prob-label">
                <span className="hp-featured__prob-team">{away_team}</span>
                <span className="hp-featured__prob-value">{Math.round(p_away_win * 100)}%</span>
              </div>
            </div>
          </div>
          
          {/* Key metrics */}
          <div className="hp-featured__metrics">
            <MetricCard 
              icon={<GoalIcon />}
              label="Expected Goals"
              homeValue={xg_home?.toFixed(1)}
              awayValue={xg_away?.toFixed(1)}
              highlight={xg_home > xg_away ? 'home' : xg_away > xg_home ? 'away' : null}
            />
            <MetricCard 
              icon={<ChartBarIcon />}
              label="Over 2.5 Goals"
              homeValue={Math.round((over25 || 0.5) * 100)}
              awayValue={Math.round((1 - (over25 || 0.5)) * 100)}
              unit="%"
            />
            <MetricCard 
              icon={<ShieldIcon />}
              label="BTTS"
              homeValue={Math.round((btts || 0.5) * 100)}
              awayValue={Math.round((1 - (btts || 0.5)) * 100)}
              unit="%"
            />
          </div>
          
          {/* Insights row */}
          <div className="hp-featured__insights">
            <span className="hp-featured__insights-label">Key Signals</span>
            <div className="hp-featured__insights-list">
              {insights.length > 0 ? (
                insights.map((insight, idx) => (
                  <InsightChip key={idx} text={insight.text} type={insight.type} />
                ))
              ) : (
                <InsightChip text="Standard match profile" type="neutral" />
              )}
            </div>
          </div>
          
          {/* Most likely score */}
          {most_likely_score && (
            <div className="hp-featured__prediction">
              <span className="hp-featured__prediction-label">Most Likely Score</span>
              <span className="hp-featured__prediction-score">{most_likely_score}</span>
            </div>
          )}
          
          {/* CTA */}
          <Link to={`/match/${fixture_id}`} className="hp-featured__cta">
            <span>View Complete Analysis</span>
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedMatchPanel;