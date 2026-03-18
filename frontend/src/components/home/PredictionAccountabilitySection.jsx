import React from 'react';
import { Link } from 'react-router-dom';
import HomeSectionHeader from './HomeSectionHeader';
import PredictionAccountability from '../PredictionAccountability';

// Icons
const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const PredictionAccountabilitySection = () => {
  return (
    <section className="hp-accountability hp-section hp-reveal">
      <div className="hp-container">
        <HomeSectionHeader 
          title="Performance Tracking"
          subtitle="Transparent prediction verification and accuracy metrics"
          accentColor="var(--hp-green)"
          action="/accountability"
          actionLabel="Full History"
        />
        
        {/* Trust indicator banner */}
        <div className="hp-accountability__trust-banner">
          <div className="hp-accountability__trust-icon">
            <CheckCircleIcon />
          </div>
          <div className="hp-accountability__trust-content">
            <span className="hp-accountability__trust-title">Verified Outcomes</span>
            <span className="hp-accountability__trust-desc">
              Every prediction is logged before kickoff and verified against official results
            </span>
          </div>
        </div>
        
        {/* Embedded accountability component */}
        <div className="hp-accountability__embed">
          <PredictionAccountability compact={true} />
        </div>
        
        {/* CTA to full page */}
        <div className="hp-accountability__cta">
          <Link to="/accountability" className="hp-accountability__cta-link">
            <span>View complete prediction history</span>
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PredictionAccountabilitySection;