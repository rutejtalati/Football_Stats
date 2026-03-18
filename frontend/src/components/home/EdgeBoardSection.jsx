import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import HomeSectionHeader from './HomeSectionHeader';
import { ProbabilityBar, FormPips, StatChip, LiveDot } from './HomeMiniCharts';

// Icons
const TrendingUpIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

// Tab configuration
const TABS = [
  { id: 'edge', label: 'Value Edge', icon: <TrendingUpIcon />, color: 'var(--hp-green)' },
  { id: 'threat', label: 'High Threat', icon: <AlertTriangleIcon />, color: 'var(--hp-amber)' },
  { id: 'watchlist', label: 'Watchlist', icon: <EyeIcon />, color: 'var(--hp-blue)' },
];

// Edge card component
const EdgeCard = ({ match, type }) => {
  const {
    home_team, away_team, home_logo, away_logo,
    p_home_win, p_draw, p_away_win,
    confidence, xg_home, xg_away,
    fixture_date, fixture_time, fixture_id,
    edge_reason, threat_level, watchlist_reason
  } = match;
  
  // Determine favorite
  const favorite = p_home_win > p_away_win ? 'home' : p_away_win > p_home_win ? 'away' : 'draw';
  
  // Get type-specific styling
  const getTypeConfig = () => {
    switch (type) {
      case 'edge':
        return {
          badge: 'Value Opportunity',
          badgeColor: 'var(--hp-green)',
          reason: edge_reason || 'Market inefficiency detected'
        };
      case 'threat':
        return {
          badge: threat_level || 'High Threat',
          badgeColor: 'var(--hp-amber)',
          reason: 'Potential upset or volatile outcome'
        };
      case 'watchlist':
        return {
          badge: 'Key Match',
          badgeColor: 'var(--hp-blue)',
          reason: watchlist_reason || 'Strategic importance'
        };
      default:
        return { badge: '', badgeColor: '', reason: '' };
    }
  };
  
  const config = getTypeConfig();
  
  return (
    <Link to={`/match/${fixture_id}`} className={`hp-edge-card hp-edge-card--${type}`}>
      <div className="hp-edge-card__header">
        <span className="hp-edge-card__datetime">{fixture_date} · {fixture_time}</span>
        <StatChip label={config.badge} color={config.badgeColor} size="small" />
      </div>
      
      <div className="hp-edge-card__matchup">
        <div className="hp-edge-card__team">
          {home_logo && <img src={home_logo} alt="" className="hp-edge-card__logo" />}
          <span className={`hp-edge-card__name ${favorite === 'home' ? 'hp-edge-card__name--favored' : ''}`}>
            {home_team}
          </span>
        </div>
        
        <span className="hp-edge-card__vs">vs</span>
        
        <div className="hp-edge-card__team">
          {away_logo && <img src={away_logo} alt="" className="hp-edge-card__logo" />}
          <span className={`hp-edge-card__name ${favorite === 'away' ? 'hp-edge-card__name--favored' : ''}`}>
            {away_team}
          </span>
        </div>
      </div>
      
      <div className="hp-edge-card__probs">
        <ProbabilityBar home={p_home_win} draw={p_draw} away={p_away_win} />
        <div className="hp-edge-card__prob-labels">
          <span>{Math.round(p_home_win * 100)}%</span>
          <span>{Math.round(p_draw * 100)}%</span>
          <span>{Math.round(p_away_win * 100)}%</span>
        </div>
      </div>
      
      <div className="hp-edge-card__metrics">
        <div className="hp-edge-card__metric">
          <span className="hp-edge-card__metric-label">xG</span>
          <span className="hp-edge-card__metric-value">{xg_home?.toFixed(1)} - {xg_away?.toFixed(1)}</span>
        </div>
        <div className="hp-edge-card__metric">
          <span className="hp-edge-card__metric-label">Confidence</span>
          <span className="hp-edge-card__metric-value">{Math.round(confidence * 100)}%</span>
        </div>
      </div>
      
      <div className="hp-edge-card__reason">
        <span>{config.reason}</span>
      </div>
      
      <div className="hp-edge-card__footer">
        <span className="hp-edge-card__cta">
          Analyze <ArrowRightIcon />
        </span>
      </div>
    </Link>
  );
};

// Loading skeleton
const EdgeSkeleton = () => (
  <div className="hp-edge-card hp-edge-card--skeleton">
    <div className="hp-shimmer" style={{ height: '20px', width: '70%', marginBottom: '16px' }} />
    <div className="hp-shimmer" style={{ height: '40px', marginBottom: '16px' }} />
    <div className="hp-shimmer" style={{ height: '24px', marginBottom: '12px' }} />
    <div className="hp-shimmer" style={{ height: '32px', marginBottom: '12px' }} />
    <div className="hp-shimmer" style={{ height: '16px', width: '50%' }} />
  </div>
);

const EdgeBoardSection = ({ 
  edgeMatches = [], 
  threatMatches = [], 
  watchlistMatches = [],
  loading = false 
}) => {
  const [activeTab, setActiveTab] = useState('edge');
  
  const getActiveMatches = () => {
    switch (activeTab) {
      case 'edge': return edgeMatches;
      case 'threat': return threatMatches;
      case 'watchlist': return watchlistMatches;
      default: return [];
    }
  };
  
  const activeMatches = getActiveMatches();
  const displayMatches = activeMatches.slice(0, 4);
  
  return (
    <section className="hp-edge hp-section hp-reveal">
      <div className="hp-container">
        <HomeSectionHeader 
          title="Intelligence Board"
          subtitle="Strategic match signals and opportunities"
          accentColor="var(--hp-purple)"
        />
        
        {/* Tabs */}
        <div className="hp-edge__tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`hp-edge__tab ${activeTab === tab.id ? 'hp-edge__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ '--tab-color': tab.color }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.id === activeTab && (
                <span className="hp-edge__tab-count">
                  {getActiveMatches().length}
                </span>
              )}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="hp-edge__content">
          {loading ? (
            <div className="hp-edge__grid">
              <EdgeSkeleton />
              <EdgeSkeleton />
              <EdgeSkeleton />
              <EdgeSkeleton />
            </div>
          ) : displayMatches.length > 0 ? (
            <div className="hp-edge__grid">
              {displayMatches.map((match, idx) => (
                <EdgeCard 
                  key={match.fixture_id || idx} 
                  match={match} 
                  type={activeTab}
                />
              ))}
            </div>
          ) : (
            <div className="hp-edge__empty">
              <p>No {TABS.find(t => t.id === activeTab)?.label.toLowerCase()} matches identified today.</p>
              <span className="hp-edge__empty-hint">Check back closer to match day for updated signals.</span>
            </div>
          )}
        </div>
        
        {activeMatches.length > 4 && (
          <div className="hp-edge__more">
            <Link to="/predictions" className="hp-edge__more-link">
              View all {activeMatches.length} matches
              <ArrowRightIcon />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default EdgeBoardSection;