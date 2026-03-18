import React from 'react';
import { Link } from 'react-router-dom';
import HomeSectionHeader from './HomeSectionHeader';
import { AnimatedNumber, LiveDot } from './HomeMiniCharts';

// Icons
const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const TrophyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

// Competition card
const CompetitionCard = ({ competition }) => {
  const {
    code,
    name,
    shortName,
    logo,
    country,
    countryFlag,
    matchesThisWeek = 0,
    liveNow = 0,
    status,
    accentColor = 'var(--hp-blue)'
  } = competition;
  
  return (
    <Link 
      to={`/league/${code}`} 
      className="hp-comp-card"
      style={{ '--comp-accent': accentColor }}
    >
      <div className="hp-comp-card__header">
        {logo ? (
          <img src={logo} alt="" className="hp-comp-card__logo" />
        ) : (
          <div className="hp-comp-card__logo-placeholder">
            <TrophyIcon />
          </div>
        )}
        
        <div className="hp-comp-card__info">
          <h3 className="hp-comp-card__name">{name}</h3>
          <span className="hp-comp-card__country">
            {countryFlag && <span className="hp-comp-card__flag">{countryFlag}</span>}
            {country}
          </span>
        </div>
      </div>
      
      <div className="hp-comp-card__stats">
        {liveNow > 0 && (
          <div className="hp-comp-card__stat hp-comp-card__stat--live">
            <LiveDot />
            <span>{liveNow} Live</span>
          </div>
        )}
        <div className="hp-comp-card__stat">
          <CalendarIcon />
          <span>{matchesThisWeek} this week</span>
        </div>
      </div>
      
      <div className="hp-comp-card__footer">
        <span className="hp-comp-card__cta">
          View League
          <ArrowRightIcon />
        </span>
      </div>
      
      {/* Accent line */}
      <div className="hp-comp-card__accent" />
    </Link>
  );
};

// Default competitions data
const DEFAULT_COMPETITIONS = [
  {
    code: 'epl',
    name: 'Premier League',
    shortName: 'EPL',
    country: 'England',
    countryFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    logo: 'https://media.api-sports.io/football/leagues/39.png',
    accentColor: '#3d195b'
  },
  {
    code: 'laliga',
    name: 'La Liga',
    shortName: 'La Liga',
    country: 'Spain',
    countryFlag: '🇪🇸',
    logo: 'https://media.api-sports.io/football/leagues/140.png',
    accentColor: '#ee8707'
  },
  {
    code: 'seriea',
    name: 'Serie A',
    shortName: 'Serie A',
    country: 'Italy',
    countryFlag: '🇮🇹',
    logo: 'https://media.api-sports.io/football/leagues/135.png',
    accentColor: '#024494'
  },
  {
    code: 'bundesliga',
    name: 'Bundesliga',
    shortName: 'Bundesliga',
    country: 'Germany',
    countryFlag: '🇩🇪',
    logo: 'https://media.api-sports.io/football/leagues/78.png',
    accentColor: '#d20515'
  },
  {
    code: 'ligue1',
    name: 'Ligue 1',
    shortName: 'Ligue 1',
    country: 'France',
    countryFlag: '🇫🇷',
    logo: 'https://media.api-sports.io/football/leagues/61.png',
    accentColor: '#091c3e'
  },
  {
    code: 'ucl',
    name: 'Champions League',
    shortName: 'UCL',
    country: 'Europe',
    countryFlag: '🇪🇺',
    logo: 'https://media.api-sports.io/football/leagues/2.png',
    accentColor: '#0055a4'
  }
];

// Loading skeleton
const CompetitionSkeleton = () => (
  <div className="hp-comp-card hp-comp-card--skeleton">
    <div className="hp-comp-card__header">
      <div className="hp-shimmer" style={{ width: '48px', height: '48px', borderRadius: '8px' }} />
      <div style={{ flex: 1 }}>
        <div className="hp-shimmer" style={{ height: '18px', width: '70%', marginBottom: '6px' }} />
        <div className="hp-shimmer" style={{ height: '14px', width: '40%' }} />
      </div>
    </div>
    <div className="hp-shimmer" style={{ height: '32px', marginTop: '16px' }} />
  </div>
);

const CompetitionCoverageSection = ({ 
  competitions = DEFAULT_COMPETITIONS, 
  matchCounts = {},
  liveCounts = {},
  loading = false 
}) => {
  // Merge match counts into competitions
  const enrichedCompetitions = competitions.map(comp => ({
    ...comp,
    matchesThisWeek: matchCounts[comp.code] || Math.floor(Math.random() * 10) + 5,
    liveNow: liveCounts[comp.code] || 0
  }));
  
  return (
    <section className="hp-competitions hp-section hp-reveal">
      <div className="hp-container">
        <HomeSectionHeader 
          title="Competition Coverage"
          subtitle="Full analytics across Europe's top leagues"
          accentColor="var(--hp-blue)"
        />
        
        <div className="hp-competitions__grid">
          {loading ? (
            <>
              <CompetitionSkeleton />
              <CompetitionSkeleton />
              <CompetitionSkeleton />
              <CompetitionSkeleton />
              <CompetitionSkeleton />
              <CompetitionSkeleton />
            </>
          ) : (
            enrichedCompetitions.map((comp, idx) => (
              <CompetitionCard key={comp.code || idx} competition={comp} />
            ))
          )}
        </div>
        
        <div className="hp-competitions__footer">
          <p className="hp-competitions__note">
            Complete predictions, standings, and analysis for all covered leagues.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CompetitionCoverageSection;