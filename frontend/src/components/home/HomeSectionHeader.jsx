// src/components/home/HomeSectionHeader.jsx
// ═══════════════════════════════════════════════════════════════════════════
// Reusable section header with accent bar and optional action button
// ═══════════════════════════════════════════════════════════════════════════

import { Link } from 'react-router-dom';

export default function HomeSectionHeader({ 
  title, 
  subtitle, 
  accentColor = '#3b9eff',
  action,
  actionLabel = 'View All',
  actionIcon,
}) {
  return (
    <div className="hp-section-header">
      <div 
        className="hp-section-header__accent" 
        style={{ '--accent-color': accentColor }}
      />
      <div className="hp-section-header__content">
        <h2 className="hp-section-header__title">{title}</h2>
        {subtitle && (
          <p className="hp-section-header__subtitle">{subtitle}</p>
        )}
      </div>
      {action && (
        <Link to={action} className="hp-section-header__action">
          {actionLabel}
          {actionIcon || (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path 
                d="M4.5 2.5L8 6L4.5 9.5" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          )}
        </Link>
      )}
    </div>
  );
}