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

const FootballIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    <path d="M2 12h20" />
  </svg>
);

const AssistIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
    <line x1="6" y1="1" x2="6" y2="4" />
    <line x1="10" y1="1" x2="10" y2="4" />
    <line x1="14" y1="1" x2="14" y2="4" />
  </svg>
);

const TrendingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

// Tab configuration
const TABS = [
  { id: 'scorers', label: 'Top Scorers', icon: <FootballIcon />, stat: 'goals' },
  { id: 'assists', label: 'Top Assists', icon: <AssistIcon />, stat: 'assists' },
];

// Player card
const TrendingPlayerCard = ({ player, type, rank, maxValue }) => {
  const {
    player_id,
    name,
    photo,
    team_name,
    team_logo,
    goals,
    assists,
    played,
    position
  } = player;
  
  const statValue = type === 'scorers' ? goals : assists;
  const statLabel = type === 'scorers' ? 'Goals' : 'Assists';
  const perGame = played > 0 ? (statValue / played).toFixed(2) : 0;
  
  return (
    <div className="hp-trending-card">
      <div className="hp-trending-card__rank">
        <span className={rank <= 3 ? 'hp-trending-card__rank--top' : ''}>
          {rank}
        </span>
      </div>
      
      <div className="hp-trending-card__player">
        {photo ? (
          <img src={photo} alt="" className="hp-trending-card__photo" />
        ) : (
          <div className="hp-trending-card__photo-placeholder" />
        )}
        
        <div className="hp-trending-card__info">
          <span className="hp-trending-card__name">{name}</span>
          <div className="hp-trending-card__team">
            {team_logo && <img src={team_logo} alt="" className="hp-trending-card__team-logo" />}
            <span>{team_name}</span>
          </div>
        </div>
      </div>
      
      <div className="hp-trending-card__stats">
        <div className="hp-trending-card__main-stat">
          <span className="hp-trending-card__stat-value">
            <AnimatedNumber value={statValue} />
          </span>
          <span className="hp-trending-card__stat-label">{statLabel}</span>
        </div>
        
        <div className="hp-trending-card__secondary">
          <div className="hp-trending-card__mini-stat">
            <span className="hp-trending-card__mini-label">Apps</span>
            <span className="hp-trending-card__mini-value">{played}</span>
          </div>
          <div className="hp-trending-card__mini-stat">
            <span className="hp-trending-card__mini-label">Per Game</span>
            <span className="hp-trending-card__mini-value">{perGame}</span>
          </div>
        </div>
      </div>
      
      {/* Progress bar relative to max */}
      <div className="hp-trending-card__bar">
        <ProgressBar 
          value={maxValue > 0 ? statValue / maxValue : 0} 
          color={type === 'scorers' ? 'var(--hp-amber)' : 'var(--hp-blue)'} 
        />
      </div>
    </div>
  );
};

// League filter
const LeagueFilter = ({ leagues, activeLeague, onSelect }) => (
  <div className="hp-trending__league-filter">
    {leagues.map(league => (
      <button
        key={league.code}
        className={`hp-trending__league-btn ${activeLeague === league.code ? 'hp-trending__league-btn--active' : ''}`}
        onClick={() => onSelect(league.code)}
      >
        {league.logo && <img src={league.logo} alt="" />}
        <span>{league.shortName || league.name}</span>
      </button>
    ))}
  </div>
);

// Loading skeleton
const TrendingSkeleton = () => (
  <div className="hp-trending-card hp-trending-card--skeleton">
    <div className="hp-shimmer" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
    <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
      <div className="hp-shimmer" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
      <div style={{ flex: 1 }}>
        <div className="hp-shimmer" style={{ height: '18px', width: '60%', marginBottom: '6px' }} />
        <div className="hp-shimmer" style={{ height: '14px', width: '40%' }} />
      </div>
    </div>
    <div className="hp-shimmer" style={{ width: '60px', height: '40px' }} />
  </div>
);

const DEFAULT_LEAGUES = [
  { code: 'epl', name: 'Premier League', shortName: 'EPL', logo: 'https://media.api-sports.io/football/leagues/39.png' },
  { code: 'laliga', name: 'La Liga', shortName: 'La Liga', logo: 'https://media.api-sports.io/football/leagues/140.png' },
  { code: 'seriea', name: 'Serie A', shortName: 'Serie A', logo: 'https://media.api-sports.io/football/leagues/135.png' },
  { code: 'bundesliga', name: 'Bundesliga', shortName: 'Bundesliga', logo: 'https://media.api-sports.io/football/leagues/78.png' },
  { code: 'ligue1', name: 'Ligue 1', shortName: 'Ligue 1', logo: 'https://media.api-sports.io/football/leagues/61.png' },
];

const TrendingPlayersSection = ({ 
  scorers = {}, 
  assists = {},
  leagues = DEFAULT_LEAGUES,
  loading = false 
}) => {
  const [activeTab, setActiveTab] = useState('scorers');
  const [activeLeague, setActiveLeague] = useState('epl');
  
  // Get players for current tab and league
  const getPlayers = () => {
    const data = activeTab === 'scorers' ? scorers : assists;
    return data[activeLeague] || [];
  };
  
  const players = getPlayers();
  const displayPlayers = players.slice(0, 5);
  const maxValue = displayPlayers.length > 0 
    ? Math.max(...displayPlayers.map(p => activeTab === 'scorers' ? p.goals : p.assists))
    : 1;
  
  return (
    <section className="hp-trending hp-section hp-reveal">
      <div className="hp-container">
        <HomeSectionHeader 
          title="Trending Players"
          subtitle="League leaders in goals and assists"
          accentColor="var(--hp-amber)"
        />
        
        {/* Tabs */}
        <div className="hp-trending__tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`hp-trending__tab ${activeTab === tab.id ? 'hp-trending__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        
        {/* League filter */}
        <LeagueFilter 
          leagues={leagues}
          activeLeague={activeLeague}
          onSelect={setActiveLeague}
        />
        
        {/* Content */}
        <div className="hp-trending__content">
          {loading ? (
            <div className="hp-trending__list">
              <TrendingSkeleton />
              <TrendingSkeleton />
              <TrendingSkeleton />
              <TrendingSkeleton />
              <TrendingSkeleton />
            </div>
          ) : displayPlayers.length > 0 ? (
            <div className="hp-trending__list">
              {displayPlayers.map((player, idx) => (
                <TrendingPlayerCard 
                  key={player.player_id || idx}
                  player={player}
                  type={activeTab}
                  rank={idx + 1}
                  maxValue={maxValue}
                />
              ))}
            </div>
          ) : (
            <div className="hp-trending__empty">
              <TrendingIcon />
              <p>No player data available for this league.</p>
            </div>
          )}
        </div>
        
        {players.length > 5 && (
          <div className="hp-trending__more">
            <Link to={`/league/${activeLeague}/stats`} className="hp-trending__more-link">
              View full leaderboard
              <ArrowRightIcon />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default TrendingPlayersSection;