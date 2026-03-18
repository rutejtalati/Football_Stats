import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import HomeSectionHeader from './HomeSectionHeader';
import { ProbabilityBar, FormPips, AnimatedNumber, StatChip } from './HomeMiniCharts';

// Icons
const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// League filter tabs
const LeagueFilters = ({ leagues, activeLeague, onSelect }) => (
  <div className="hp-predictions__filters">
    <button 
      className={`hp-predictions__filter ${activeLeague === 'all' ? 'hp-predictions__filter--active' : ''}`}
      onClick={() => onSelect('all')}
    >
      All Leagues
    </button>
    {leagues.map(league => (
      <button 
        key={league.code}
        className={`hp-predictions__filter ${activeLeague === league.code ? 'hp-predictions__filter--active' : ''}`}
        onClick={() => onSelect(league.code)}
      >
        {league.logo && <img src={league.logo} alt="" className="hp-predictions__filter-logo" />}
        {league.shortName || league.name}
      </button>
    ))}
  </div>
);

// Compact prediction card for homepage
const PredictionCardCompact = ({ prediction }) => {
  const {
    home_team, away_team, home_logo, away_logo,
    p_home_win, p_draw, p_away_win,
    xg_home, xg_away, confidence,
    fixture_date, fixture_time, fixture_id,
    home_form, away_form
  } = prediction;
  
  // Determine favorite
  const favorite = p_home_win > p_away_win ? 'home' : p_away_win > p_home_win ? 'away' : 'draw';
  const maxProb = Math.max(p_home_win, p_draw, p_away_win);
  
  // Confidence level
  const getConfidenceLevel = (conf) => {
    if (conf >= 0.75) return { label: 'High', color: 'var(--hp-green)' };
    if (conf >= 0.55) return { label: 'Medium', color: 'var(--hp-amber)' };
    return { label: 'Low', color: 'var(--hp-text-muted)' };
  };
  
  const confLevel = getConfidenceLevel(confidence);
  
  return (
    <Link to={`/match/${fixture_id}`} className="hp-pred-card">
      <div className="hp-pred-card__header">
        <span className="hp-pred-card__datetime">{fixture_date} · {fixture_time}</span>
        <StatChip 
          label={`${Math.round(confidence * 100)}%`} 
          color={confLevel.color}
          size="small"
        />
      </div>
      
      <div className="hp-pred-card__matchup">
        <div className="hp-pred-card__team">
          {home_logo && <img src={home_logo} alt="" className="hp-pred-card__logo" />}
          <div className="hp-pred-card__team-info">
            <span className={`hp-pred-card__name ${favorite === 'home' ? 'hp-pred-card__name--favored' : ''}`}>
              {home_team}
            </span>
            <FormPips form={home_form} size="small" />
          </div>
        </div>
        
        <div className="hp-pred-card__vs">
          <span className="hp-pred-card__xg">{xg_home?.toFixed(1)}</span>
          <span className="hp-pred-card__xg-divider">-</span>
          <span className="hp-pred-card__xg">{xg_away?.toFixed(1)}</span>
          <span className="hp-pred-card__xg-label">xG</span>
        </div>
        
        <div className="hp-pred-card__team hp-pred-card__team--away">
          {away_logo && <img src={away_logo} alt="" className="hp-pred-card__logo" />}
          <div className="hp-pred-card__team-info">
            <span className={`hp-pred-card__name ${favorite === 'away' ? 'hp-pred-card__name--favored' : ''}`}>
              {away_team}
            </span>
            <FormPips form={away_form} size="small" />
          </div>
        </div>
      </div>
      
      <div className="hp-pred-card__probs">
        <ProbabilityBar home={p_home_win} draw={p_draw} away={p_away_win} />
        <div className="hp-pred-card__prob-values">
          <span>{Math.round(p_home_win * 100)}%</span>
          <span>{Math.round(p_draw * 100)}%</span>
          <span>{Math.round(p_away_win * 100)}%</span>
        </div>
      </div>
      
      <div className="hp-pred-card__footer">
        <span className="hp-pred-card__cta">
          View Analysis <ArrowRightIcon />
        </span>
      </div>
    </Link>
  );
};

// Loading skeleton
const PredictionSkeleton = () => (
  <div className="hp-pred-card hp-pred-card--skeleton">
    <div className="hp-shimmer" style={{ height: '20px', width: '60%', marginBottom: '12px' }} />
    <div className="hp-shimmer" style={{ height: '48px', marginBottom: '12px' }} />
    <div className="hp-shimmer" style={{ height: '32px', marginBottom: '12px' }} />
    <div className="hp-shimmer" style={{ height: '16px', width: '40%' }} />
  </div>
);

const TopPredictionsSection = ({ predictions = [], leagues = [], loading = false }) => {
  const [activeLeague, setActiveLeague] = useState('all');
  const [showAll, setShowAll] = useState(false);
  
  // Filter predictions by league
  const filteredPredictions = activeLeague === 'all' 
    ? predictions 
    : predictions.filter(p => p.league?.toLowerCase() === activeLeague.toLowerCase());
  
  // Sort by confidence descending
  const sortedPredictions = [...filteredPredictions].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  
  // Limit display
  const displayCount = showAll ? sortedPredictions.length : 6;
  const displayPredictions = sortedPredictions.slice(0, displayCount);
  
  return (
    <section className="hp-predictions hp-section hp-reveal">
      <div className="hp-container">
        <HomeSectionHeader 
          title="Today's Predictions"
          subtitle="High-confidence match analysis"
          accentColor="var(--hp-green)"
          action="/predictions"
          actionLabel="All Predictions"
        />
        
        {leagues.length > 1 && (
          <LeagueFilters 
            leagues={leagues}
            activeLeague={activeLeague}
            onSelect={setActiveLeague}
          />
        )}
        
        <div className="hp-predictions__grid">
          {loading ? (
            <>
              <PredictionSkeleton />
              <PredictionSkeleton />
              <PredictionSkeleton />
              <PredictionSkeleton />
              <PredictionSkeleton />
              <PredictionSkeleton />
            </>
          ) : displayPredictions.length > 0 ? (
            displayPredictions.map((prediction, idx) => (
              <PredictionCardCompact 
                key={prediction.fixture_id || idx} 
                prediction={prediction}
              />
            ))
          ) : (
            <div className="hp-predictions__empty">
              <p>No predictions available for this selection.</p>
              <Link to="/predictions" className="hp-predictions__empty-link">
                View all predictions
              </Link>
            </div>
          )}
        </div>
        
        {sortedPredictions.length > 6 && !showAll && (
          <div className="hp-predictions__show-more">
            <button 
              className="hp-predictions__show-more-btn"
              onClick={() => setShowAll(true)}
            >
              Show {sortedPredictions.length - 6} More
              <ChevronDownIcon />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default TopPredictionsSection;