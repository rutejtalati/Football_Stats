import React from 'react';
import { Link } from 'react-router-dom';
import HomeSectionHeader from './HomeSectionHeader';
import { MiniPitchVisual, StatChip } from './HomeMiniCharts';

// Icons
const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const BookOpenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

// Tactical insight card
const TacticalCard = ({ insight }) => {
  const {
    title,
    summary,
    teams,
    formation,
    category,
    link,
    keyPlayers = [],
    metric
  } = insight;
  
  // Category colors
  const getCategoryStyle = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'formation': return { color: 'var(--hp-blue)', bg: 'rgba(59, 158, 255, 0.1)' };
      case 'pressing': return { color: 'var(--hp-amber)', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'transition': return { color: 'var(--hp-green)', bg: 'rgba(40, 217, 122, 0.1)' };
      case 'setpiece': return { color: 'var(--hp-purple)', bg: 'rgba(167, 139, 250, 0.1)' };
      case 'defensive': return { color: 'var(--hp-red)', bg: 'rgba(248, 113, 113, 0.1)' };
      default: return { color: 'var(--hp-text-muted)', bg: 'rgba(255, 255, 255, 0.05)' };
    }
  };
  
  const categoryStyle = getCategoryStyle(category);
  
  return (
    <Link to={link || '/analysis'} className="hp-tactical-card">
      <div className="hp-tactical-card__header">
        <StatChip 
          label={category || 'Analysis'} 
          color={categoryStyle.color}
          size="small"
        />
        {metric && (
          <span className="hp-tactical-card__metric">
            {metric.label}: <strong>{metric.value}</strong>
          </span>
        )}
      </div>
      
      <h3 className="hp-tactical-card__title">{title}</h3>
      <p className="hp-tactical-card__summary">{summary}</p>
      
      {/* Visual element */}
      <div className="hp-tactical-card__visual">
        {formation ? (
          <MiniPitchVisual formation={formation} size="medium" />
        ) : teams?.length === 2 ? (
          <div className="hp-tactical-card__matchup">
            <div className="hp-tactical-card__team">
              {teams[0].logo && <img src={teams[0].logo} alt="" />}
              <span>{teams[0].name}</span>
            </div>
            <span className="hp-tactical-card__vs">vs</span>
            <div className="hp-tactical-card__team">
              {teams[1].logo && <img src={teams[1].logo} alt="" />}
              <span>{teams[1].name}</span>
            </div>
          </div>
        ) : null}
      </div>
      
      {/* Key players */}
      {keyPlayers.length > 0 && (
        <div className="hp-tactical-card__players">
          <span className="hp-tactical-card__players-label">Key Players:</span>
          <div className="hp-tactical-card__players-list">
            {keyPlayers.slice(0, 3).map((player, idx) => (
              <span key={idx} className="hp-tactical-card__player">
                {player}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div className="hp-tactical-card__footer">
        <span className="hp-tactical-card__cta">
          <BookOpenIcon />
          Read Analysis
          <ArrowRightIcon />
        </span>
      </div>
    </Link>
  );
};

// Featured insight (larger card)
const FeaturedInsightCard = ({ insight }) => {
  if (!insight) return null;
  
  const {
    title,
    summary,
    teams,
    formation,
    category,
    link,
    keyPlayers = [],
    metric,
    imageUrl
  } = insight;
  
  return (
    <Link to={link || '/analysis'} className="hp-tactical-featured">
      <div className="hp-tactical-featured__content">
        <StatChip 
          label={category || 'Featured'} 
          color="var(--hp-amber)"
          size="small"
        />
        <h3 className="hp-tactical-featured__title">{title}</h3>
        <p className="hp-tactical-featured__summary">{summary}</p>
        
        {keyPlayers.length > 0 && (
          <div className="hp-tactical-featured__players">
            {keyPlayers.slice(0, 3).map((player, idx) => (
              <span key={idx} className="hp-tactical-featured__player">
                {player}
              </span>
            ))}
          </div>
        )}
        
        <div className="hp-tactical-featured__cta">
          <BookOpenIcon />
          Deep Dive
          <ArrowRightIcon />
        </div>
      </div>
      
      <div className="hp-tactical-featured__visual">
        {formation ? (
          <MiniPitchVisual formation={formation} size="large" />
        ) : teams?.length >= 2 ? (
          <div className="hp-tactical-featured__matchup">
            {teams[0].logo && <img src={teams[0].logo} alt="" className="hp-tactical-featured__logo" />}
            <span className="hp-tactical-featured__vs">vs</span>
            {teams[1].logo && <img src={teams[1].logo} alt="" className="hp-tactical-featured__logo" />}
          </div>
        ) : imageUrl ? (
          <img src={imageUrl} alt="" className="hp-tactical-featured__image" />
        ) : (
          <div className="hp-tactical-featured__placeholder" />
        )}
      </div>
    </Link>
  );
};

// Loading skeleton
const TacticalSkeleton = () => (
  <div className="hp-tactical-card hp-tactical-card--skeleton">
    <div className="hp-shimmer" style={{ height: '20px', width: '30%', marginBottom: '12px' }} />
    <div className="hp-shimmer" style={{ height: '24px', width: '80%', marginBottom: '8px' }} />
    <div className="hp-shimmer" style={{ height: '48px', marginBottom: '16px' }} />
    <div className="hp-shimmer" style={{ height: '80px', marginBottom: '12px' }} />
    <div className="hp-shimmer" style={{ height: '16px', width: '40%' }} />
  </div>
);

const TacticalInsightsSection = ({ insights = [], loading = false }) => {
  if (loading) {
    return (
      <section className="hp-tactical hp-section hp-reveal">
        <div className="hp-container">
          <HomeSectionHeader 
            title="Tactical Insights"
            subtitle="Deep analysis and strategic breakdowns"
            accentColor="var(--hp-amber)"
          />
          <div className="hp-tactical__grid">
            <TacticalSkeleton />
            <TacticalSkeleton />
            <TacticalSkeleton />
          </div>
        </div>
      </section>
    );
  }
  
  if (!insights.length) {
    return null;
  }
  
  // First insight as featured, rest as regular cards
  const [featured, ...rest] = insights;
  const regularCards = rest.slice(0, 4);
  
  return (
    <section className="hp-tactical hp-section hp-reveal">
      <div className="hp-container">
        <HomeSectionHeader 
          title="Tactical Insights"
          subtitle="Deep analysis and strategic breakdowns"
          accentColor="var(--hp-amber)"
          action="/analysis"
          actionLabel="All Insights"
        />
        
        <div className="hp-tactical__layout">
          {featured && (
            <div className="hp-tactical__featured-wrapper">
              <FeaturedInsightCard insight={featured} />
            </div>
          )}
          
          {regularCards.length > 0 && (
            <div className="hp-tactical__grid">
              {regularCards.map((insight, idx) => (
                <TacticalCard key={idx} insight={insight} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TacticalInsightsSection;