import React from 'react';

const LiveRibbon = ({ trendingPlayers = { items: [] }, predictions = { predictions: [] } }) => {
  const items = [];

  // Add trending player items
  (trendingPlayers.items || []).forEach((p) => {
    items.push({
      label: p.label,
      value: p.value,
      sub: p.sub,
      col: p.col,
    });
  });

  // Add prediction signals
  (predictions.predictions || []).slice(0, 3).forEach((p) => {
    const fav = p.homeProb > p.awayProb ? p.home : p.away;
    const pct = Math.max(p.homeProb, p.awayProb);
    items.push({
      label: `${p.home} v ${p.away}`,
      value: `${fav} ${Math.round(pct)}%`,
      sub: `Pred: ${p.score}`,
      col: p.col || 'var(--hp-blue)',
    });
  });

  if (items.length === 0) return null;

  // Duplicate for seamless scroll
  const doubled = [...items, ...items];

  return (
    <div className="live-ribbon">
      <div className="live-ribbon__track">
        {doubled.map((item, i) => (
          <div className="live-ribbon__item" key={i}>
            <span className="live-ribbon__pulse" style={{ background: item.col }} />
            <span className="live-ribbon__label">{item.label}</span>
            <span className="live-ribbon__value" style={{ color: item.col }}>{item.value}</span>
            {item.sub && <span className="live-ribbon__sub">{item.sub}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveRibbon;