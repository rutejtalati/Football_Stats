import React from 'react';
import { Link } from 'react-router-dom';
import HomeSectionHeader from './HomeSectionHeader';
import { PLATFORM_CAPABILITIES } from '../../utils/homeDataMappers';

// SVG Icons for each capability (replacing emoji)
const IconLive = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="3" />
    <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14" />
  </svg>
);

const IconPredictions = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const IconPlayers = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconFPL = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconSimulation = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    <circle cx="16" cy="8" r="1.5" fill="currentColor" />
    <circle cx="8" cy="16" r="1.5" fill="currentColor" />
    <circle cx="16" cy="16" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

const IconLineups = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="7" y1="8" x2="17" y2="8" />
    <line x1="7" y1="12" x2="17" y2="12" />
    <line x1="7" y1="16" x2="12" y2="16" />
  </svg>
);

const IconShotmap = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
    <line x1="12" y1="2" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="22" />
    <line x1="2" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
  </svg>
);

const IconAccountability = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

// Map capability IDs to icons
const ICON_MAP = {
  live: IconLive,
  predictions: IconPredictions,
  players: IconPlayers,
  fpl: IconFPL,
  simulation: IconSimulation,
  lineups: IconLineups,
  shotmap: IconShotmap,
  accountability: IconAccountability,
};

// Arrow icon for links
const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

// Single capability card
const CapabilityCard = ({ capability, index }) => {
  const { id, title, description, color, link } = capability;
  const IconComponent = ICON_MAP[id] || IconPredictions;
  
  return (
    <Link 
      to={link} 
      className="hp-capability-card"
      style={{ 
        '--cap-color': color,
        '--cap-delay': `${index * 60}ms`
      }}
    >
      <div className="hp-capability-card__icon">
        <IconComponent />
      </div>
      
      <div className="hp-capability-card__content">
        <h3 className="hp-capability-card__title">{title}</h3>
        <p className="hp-capability-card__description">{description}</p>
      </div>
      
      <div className="hp-capability-card__action">
        <span>Explore</span>
        <ArrowRightIcon />
      </div>
      
      {/* Hover glow effect */}
      <div className="hp-capability-card__glow" />
    </Link>
  );
};

// Loading skeleton
const CapabilitySkeleton = () => (
  <div className="hp-capability-card hp-capability-card--skeleton">
    <div className="hp-shimmer" style={{ width: '48px', height: '48px', borderRadius: '12px' }} />
    <div style={{ flex: 1 }}>
      <div className="hp-shimmer" style={{ height: '18px', width: '120px', marginBottom: '8px' }} />
      <div className="hp-shimmer" style={{ height: '14px', width: '100%' }} />
    </div>
  </div>
);

const PlatformCapabilitiesSection = ({ loading = false }) => {
  const capabilities = PLATFORM_CAPABILITIES;
  
  return (
    <section className="hp-capabilities hp-section hp-reveal">
      <div className="hp-container">
        <HomeSectionHeader 
          title="Platform Capabilities"
          subtitle="Comprehensive football intelligence tools"
          accentColor="var(--hp-purple)"
        />
        
        <div className="hp-capabilities__grid">
          {loading ? (
            <>
              <CapabilitySkeleton />
              <CapabilitySkeleton />
              <CapabilitySkeleton />
              <CapabilitySkeleton />
              <CapabilitySkeleton />
              <CapabilitySkeleton />
              <CapabilitySkeleton />
              <CapabilitySkeleton />
            </>
          ) : (
            capabilities.map((cap, idx) => (
              <CapabilityCard key={cap.id} capability={cap} index={idx} />
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default PlatformCapabilitiesSection;