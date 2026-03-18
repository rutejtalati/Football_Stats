import React from 'react';

const HomeSectionHeader = ({ title, subtitle, accentColor = 'var(--hp-blue)', children }) => (
  <div className="hp-section-header">
    <div className="hp-section-header__accent" style={{ background: accentColor }} />
    <div className="hp-section-header__text">
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {children && <div className="hp-section-header__right">{children}</div>}
  </div>
);

export default HomeSectionHeader;