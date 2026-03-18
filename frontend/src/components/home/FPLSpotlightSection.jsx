import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import HomeSectionHeader from './HomeSectionHeader';
import { ProgressBar, StatChip, AnimatedNumber } from './HomeMiniCharts';

// Icons
const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const CrownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 4l3 12h14l3-12-6 7-4-9-4 9-6-7z" />
    <path d="M3 20h18" />
  </svg>
);

const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const ZapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

// Tab configuration
const TABS = [
  { id: 'captain', label: 'Captain Picks', icon: <CrownIcon /> },
  { id: 'differentials', label: 'Differentials', icon: <ZapIcon /> },
  { id: 'form', label: 'In Form', icon: <StarIcon /> },
];

// Player card for FPL
const FPLPlayerCard = ({ player, type }) => {
  const {
    name,
    photo,
    team_name,
    team_logo,
    position,
    price,
    points,
    form,
    ownership,
    xgi, // expected goal involvement
    fixtures_difficulty,
    captain_score,
    differential_score
  } = player;
  
  // Position badge color
  const getPositionColor = (pos) => {
    switch (pos?.toUpperCase()) {
      case 'GK': return 'var(--hp-amber)';
      case 'DEF': return 'var(--hp-blue)';
      case 'MID': return 'var(--hp-green)';
      case 'FWD': return 'var(--hp-red)';
      default: return 'var(--hp-text-muted)';
    }
  };
  
  return (
    <div className="hp-fpl-card">
      <div className="hp-fpl-card__header">
        <div className="hp-fpl-card__player">
          {photo ? (
            <img src={photo} alt="" className="hp-fpl-card__photo" />
          ) : (
            <div className="hp-fpl-card__photo-placeholder" />
          )}
          <div className="hp-fpl-card__info">
            <span className="hp-fpl-card__name">{name}</span>
            <div className="hp-fpl-card__meta">
              {team_logo && <img src={team_logo} alt="" className="hp-fpl-card__team-logo" />}
              <span className="hp-fpl-card__team">{team_name}</span>
            </div>
          </div>
        </div>
        <StatChip 
          label={position || 'MID'} 
          color={getPositionColor(position)}
          size="small"
        />
      </div>
      
      <div className="hp-fpl-card__stats">
        <div className="hp-fpl-card__stat">
          <span className="hp-fpl-card__stat-label">Price</span>
          <span className="hp-fpl-card__stat-value">£{(price || 0).toFixed(1)}m</span>
        </div>
        <div className="hp-fpl-card__stat">
          <span className="hp-fpl-card__stat-label">Form</span>
          <span className="hp-fpl-card__stat-value hp-fpl-card__stat-value--highlight">
            {form?.toFixed(1) || '-'}
          </span>
        </div>
        <div className="hp-fpl-card__stat">
          <span className="hp-fpl-card__stat-label">Points</span>
          <span className="hp-fpl-card__stat-value">{points || 0}</span>
        </div>
        {type === 'differentials' && (
          <div className="hp-fpl-card__stat">
            <span className="hp-fpl-card__stat-label">Ownership</span>
            <span className="hp-fpl-card__stat-value">{ownership?.toFixed(1) || 0}%</span>
          </div>
        )}
      </div>
      
      {/* xGI bar */}
      {xgi !== undefined && (
        <div className="hp-fpl-card__xgi">
          <div className="hp-fpl-card__xgi-header">
            <span>Expected G+A</span>
            <span className="hp-fpl-card__xgi-value">{xgi?.toFixed(2)}</span>
          </div>
          <ProgressBar value={Math.min(xgi / 1.5, 1)} color="var(--hp-green)" />
        </div>
      )}
      
      {/* Captain/Differential score */}
      {type === 'captain' && captain_score && (
        <div className="hp-fpl-card__score">
          <CrownIcon />
          <span>Captain Score: {captain_score.toFixed(0)}</span>
        </div>
      )}
      
      {type === 'differentials' && differential_score && (
        <div className="hp-fpl-card__score hp-fpl-card__score--differential">
          <ZapIcon />
          <span>Differential Value: {differential_score.toFixed(0)}</span>
        </div>
      )}
    </div>
  );
};

// Loading skeleton
const FPLSkeleton = () => (
  <div className="hp-fpl-card hp-fpl-card--skeleton">
    <div className="hp-fpl-card__header">
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div className="hp-shimmer" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
        <div>
          <div className="hp-shimmer" style={{ height: '18px', width: '100px', marginBottom: '6px' }} />
          <div className="hp-shimmer" style={{ height: '14px', width: '70px' }} />
        </div>
      </div>
    </div>
    <div className="hp-shimmer" style={{ height: '48px', marginTop: '12px' }} />
    <div className="hp-shimmer" style={{ height: '24px', marginTop: '12px' }} />
  </div>
);

const FPLSpotlightSection = ({ 
  captainPicks = [], 
  differentials = [], 
  inFormPlayers = [],
  loading = false,
  gameweek = null
}) => {
  const [activeTab, setActiveTab] = useState('captain');
  
  const getActivePlayers = () => {
    switch (activeTab) {
      case 'captain': return captainPicks;
      case 'differentials': return differentials;
      case 'form': return inFormPlayers;
      default: return [];
    }
  };
  
  const activePlayers = getActivePlayers();
  const displayPlayers = activePlayers.slice(0, 4);
  
  // Check if we have any FPL data
  const hasData = captainPicks.length > 0 || differentials.length > 0 || inFormPlayers.length > 0;
  
  if (!loading && !hasData) {
    return null;
  }
  
  return (
    <section className="hp-fpl hp-section hp-reveal">
      <div className="hp-container">
        <HomeSectionHeader 
          title="FPL Spotlight"
          subtitle={gameweek ? `Gameweek ${gameweek} insights` : 'Fantasy Premier League insights'}
          accentColor="var(--hp-green)"
          action="/fpl"
          actionLabel="Full FPL Hub"
        />
        
        {/* Tabs */}
        <div className="hp-fpl__tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`hp-fpl__tab ${activeTab === tab.id ? 'hp-fpl__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="hp-fpl__content">
          {loading ? (
            <div className="hp-fpl__grid">
              <FPLSkeleton />
              <FPLSkeleton />
              <FPLSkeleton />
              <FPLSkeleton />
            </div>
          ) : displayPlayers.length > 0 ? (
            <div className="hp-fpl__grid">
              {displayPlayers.map((player, idx) => (
                <FPLPlayerCard 
                  key={player.player_id || idx} 
                  player={player}
                  type={activeTab}
                />
              ))}
            </div>
          ) : (
            <div className="hp-fpl__empty">
              <UsersIcon />
              <p>No {TABS.find(t => t.id === activeTab)?.label.toLowerCase()} data available.</p>
              <span>Check back closer to the gameweek deadline.</span>
            </div>
          )}
        </div>
        
        {activePlayers.length > 4 && (
          <div className="hp-fpl__more">
            <Link to="/fpl" className="hp-fpl__more-link">
              View all {activePlayers.length} players
              <ArrowRightIcon />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default FPLSpotlightSection;