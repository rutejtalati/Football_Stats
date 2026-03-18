import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ProbabilityBar, Sparkline, LiveDot, AnimatedNumber, FormPips } from './HomeMiniCharts';

// SVG Icons
const ChartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" />
  </svg>
);

const TargetIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
);

const TrendingIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

// Floating stat widget component
const FloatingWidget = ({ children, position, delay = 0 }) => (
  <div 
    className="hp-hero__widget"
    style={{ 
      ...position,
      animationDelay: `${delay}s`
    }}
  >
    {children}
  </div>
);

// Featured intelligence card
const IntelligenceCard = ({ match, onNavigate }) => {
  if (!match) return null;
  
  const { home_team, away_team, home_logo, away_logo, p_home_win, p_draw, p_away_win, confidence, fixture_date, fixture_time, xg_home, xg_away } = match;
  
  const probs = { home: p_home_win, draw: p_draw, away: p_away_win };
  const favorite = p_home_win > p_away_win ? 'home' : p_away_win > p_home_win ? 'away' : 'draw';
  
  return (
    <div className="hp-hero__intel-card">
      <div className="hp-hero__intel-header">
        <span className="hp-hero__intel-badge">
          <LiveDot /> Featured Match
        </span>
        <span className="hp-hero__intel-time">{fixture_date} · {fixture_time}</span>
      </div>
      
      <div className="hp-hero__intel-matchup">
        <div className="hp-hero__intel-team">
          {home_logo && <img src={home_logo} alt="" className="hp-hero__intel-logo" />}
          <span className={favorite === 'home' ? 'hp-hero__intel-team--favored' : ''}>{home_team}</span>
        </div>
        <span className="hp-hero__intel-vs">vs</span>
        <div className="hp-hero__intel-team">
          {away_logo && <img src={away_logo} alt="" className="hp-hero__intel-logo" />}
          <span className={favorite === 'away' ? 'hp-hero__intel-team--favored' : ''}>{away_team}</span>
        </div>
      </div>
      
      <div className="hp-hero__intel-probs">
        <ProbabilityBar home={probs.home} draw={probs.draw} away={probs.away} />
        <div className="hp-hero__intel-prob-labels">
          <span>{Math.round(probs.home * 100)}%</span>
          <span>{Math.round(probs.draw * 100)}%</span>
          <span>{Math.round(probs.away * 100)}%</span>
        </div>
      </div>
      
      <div className="hp-hero__intel-metrics">
        <div className="hp-hero__intel-metric">
          <span className="hp-hero__intel-metric-label">Expected Goals</span>
          <span className="hp-hero__intel-metric-value">{xg_home?.toFixed(1)} - {xg_away?.toFixed(1)}</span>
        </div>
        <div className="hp-hero__intel-metric">
          <span className="hp-hero__intel-metric-label">Confidence</span>
          <span className="hp-hero__intel-metric-value hp-hero__intel-metric-value--accent">
            {Math.round(confidence * 100)}%
          </span>
        </div>
      </div>
      
      <Link to={`/match/${match.fixture_id}`} className="hp-hero__intel-cta">
        Full Analysis <ArrowRightIcon />
      </Link>
    </div>
  );
};

// Background grid animation
const AnimatedGrid = () => (
  <div className="hp-hero__grid">
    <svg className="hp-hero__grid-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      {/* Vertical lines */}
      {[...Array(11)].map((_, i) => (
        <line key={`v${i}`} x1={i * 10} y1="0" x2={i * 10} y2="100" className="hp-hero__grid-line" />
      ))}
      {/* Horizontal lines */}
      {[...Array(11)].map((_, i) => (
        <line key={`h${i}`} x1="0" y1={i * 10} x2="100" y2={i * 10} className="hp-hero__grid-line" />
      ))}
    </svg>
  </div>
);

// Glow orbs
const GlowOrbs = () => (
  <div className="hp-hero__orbs">
    <div className="hp-hero__orb hp-hero__orb--blue" />
    <div className="hp-hero__orb hp-hero__orb--green" />
    <div className="hp-hero__orb hp-hero__orb--purple" />
  </div>
);

// Football field linework
const FieldLinework = () => (
  <div className="hp-hero__field">
    <svg viewBox="0 0 400 260" className="hp-hero__field-svg">
      {/* Outer boundary */}
      <rect x="10" y="10" width="380" height="240" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
      {/* Center line */}
      <line x1="200" y1="10" x2="200" y2="250" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
      {/* Center circle */}
      <circle cx="200" cy="130" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
      {/* Left penalty area */}
      <rect x="10" y="65" width="60" height="130" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
      {/* Right penalty area */}
      <rect x="330" y="65" width="60" height="130" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
      {/* Left goal area */}
      <rect x="10" y="95" width="20" height="70" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
      {/* Right goal area */}
      <rect x="370" y="95" width="20" height="70" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
    </svg>
  </div>
);

const HeroCommandCenter = ({ featuredMatch, stats }) => {
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef(null);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Sample sparkline data
  const accuracyTrend = [0.72, 0.68, 0.75, 0.71, 0.78, 0.82, 0.79, 0.85];
  
  return (
    <section className={`hp-hero ${isVisible ? 'hp-hero--visible' : ''}`} ref={heroRef}>
      {/* Background layers */}
      <div className="hp-hero__bg">
        <AnimatedGrid />
        <GlowOrbs />
        <FieldLinework />
        <div className="hp-hero__sweep" />
      </div>
      
      {/* Main content */}
      <div className="hp-hero__content">
        <div className="hp-hero__main">
          {/* Headline */}
          <div className="hp-hero__headline-wrapper">
            <span className="hp-hero__tag">Live Intelligence Platform</span>
            <h1 className="hp-hero__headline">
              Football predictions<br />
              <span className="hp-hero__headline-accent">backed by data</span>
            </h1>
            <p className="hp-hero__subheadline">
              Real-time analytics, verified predictions, and tactical insights across 
              Europe's top leagues. See the game differently.
            </p>
          </div>
          
          {/* CTAs */}
          <div className="hp-hero__ctas">
            <Link to="/predictions" className="hp-hero__cta hp-hero__cta--primary">
              <ChartIcon />
              View Predictions
            </Link>
            <Link to="/accountability" className="hp-hero__cta hp-hero__cta--secondary">
              <TargetIcon />
              Track Record
            </Link>
          </div>
          
          {/* Stats row */}
          <div className="hp-hero__stats">
            <div className="hp-hero__stat">
              <span className="hp-hero__stat-value">
                <AnimatedNumber value={stats?.accuracy || 78} suffix="%" />
              </span>
              <span className="hp-hero__stat-label">Prediction Accuracy</span>
            </div>
            <div className="hp-hero__stat-divider" />
            <div className="hp-hero__stat">
              <span className="hp-hero__stat-value">
                <AnimatedNumber value={stats?.predictions || 1247} />
              </span>
              <span className="hp-hero__stat-label">Verified Predictions</span>
            </div>
            <div className="hp-hero__stat-divider" />
            <div className="hp-hero__stat">
              <span className="hp-hero__stat-value">5</span>
              <span className="hp-hero__stat-label">Top Leagues</span>
            </div>
          </div>
        </div>
        
        {/* Featured match card */}
        <div className="hp-hero__featured">
          <IntelligenceCard match={featuredMatch} />
        </div>
      </div>
      
      {/* Floating widgets (desktop only) */}
      <div className="hp-hero__widgets">
        <FloatingWidget position={{ top: '15%', left: '5%' }} delay={0.5}>
          <div className="hp-hero__widget-content hp-hero__widget-content--accuracy">
            <TrendingIcon />
            <div className="hp-hero__widget-data">
              <span className="hp-hero__widget-label">Accuracy Trend</span>
              <Sparkline data={accuracyTrend} width={80} height={24} color="var(--hp-green)" />
            </div>
          </div>
        </FloatingWidget>
        
        <FloatingWidget position={{ bottom: '20%', left: '8%' }} delay={0.8}>
          <div className="hp-hero__widget-content hp-hero__widget-content--live">
            <LiveDot />
            <span className="hp-hero__widget-text">12 matches live</span>
          </div>
        </FloatingWidget>
        
        <FloatingWidget position={{ top: '25%', right: '3%' }} delay={1.1}>
          <div className="hp-hero__widget-content hp-hero__widget-content--confidence">
            <span className="hp-hero__widget-number">92%</span>
            <span className="hp-hero__widget-label">High confidence</span>
          </div>
        </FloatingWidget>
      </div>
      
      {/* Scroll indicator */}
      <div className="hp-hero__scroll">
        <div className="hp-hero__scroll-line" />
        <span className="hp-hero__scroll-text">Scroll to explore</span>
      </div>
    </section>
  );
};

export default HeroCommandCenter;