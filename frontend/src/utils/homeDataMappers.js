// src/utils/homeDataMappers.js
// ═══════════════════════════════════════════════════════════════════════════
// Data transformation utilities for the homepage
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse form string into array of results
 * @param {string} form - Form string like "WWDLW"
 * @returns {string[]} - Array of results ['W', 'W', 'D', 'L', 'W']
 */
export function parseForm(form) {
  if (Array.isArray(form)) return form.filter(c => 'WDL'.includes(c));
  return String(form || '').split('').filter(c => 'WDL'.includes(c));
}

/**
 * Format date for display
 * @param {string} dateStr - ISO date string
 * @returns {string} - Formatted date like "Sat 15 Mar · 15:00"
 */
export function formatMatchDate(dateStr) {
  if (!dateStr) return 'TBD';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    }) + ' · ' + d.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format relative time from now
 * @param {string} dateStr - ISO date string
 * @returns {string} - Relative time like "Today 15:00", "Tomorrow 20:00", "Sat 15:00"
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diff = Math.floor((d - now) / (1000 * 60 * 60 * 24));
    const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    if (diff === 0) return `Today ${time}`;
    if (diff === 1) return `Tomorrow ${time}`;
    if (diff > 1 && diff < 7) return `${days[d.getDay()]} ${time}`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ` ${time}`;
  } catch {
    return dateStr;
  }
}

/**
 * Get prediction strength classification
 * @param {number} confidence - Confidence value 0-100
 * @returns {Object} - { label, color, bg, border }
 */
export function getStrengthMeta(confidence) {
  if (confidence >= 72) {
    return {
      label: 'Strong',
      color: '#28d97a',
      bg: 'rgba(40, 217, 122, 0.1)',
      border: 'rgba(40, 217, 122, 0.28)',
    };
  }
  if (confidence >= 52) {
    return {
      label: 'Moderate',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.08)',
      border: 'rgba(245, 158, 11, 0.25)',
    };
  }
  if (confidence >= 36) {
    return {
      label: 'Uncertain',
      color: '#ff6b35',
      bg: 'rgba(255, 107, 53, 0.08)',
      border: 'rgba(255, 107, 53, 0.22)',
    };
  }
  return {
    label: 'Low',
    color: '#6a7a9a',
    bg: 'rgba(255, 255, 255, 0.04)',
    border: 'rgba(255, 255, 255, 0.1)',
  };
}

/**
 * Get goal expectation classification
 * @param {number} over25Prob - Probability of over 2.5 goals (0-1)
 * @returns {Object} - { label, color }
 */
export function getGoalExpectation(over25Prob) {
  const pct = Math.round((over25Prob || 0) * 100);
  if (pct >= 68) return { label: 'High', color: '#28d97a' };
  if (pct >= 48) return { label: 'Medium', color: '#f59e0b' };
  return { label: 'Low', color: '#6a7a9a' };
}

/**
 * Get favorite team from probabilities
 * @param {number} homeProb - Home win probability
 * @param {number} drawProb - Draw probability
 * @param {number} awayProb - Away win probability
 * @returns {'home' | 'away' | 'draw'}
 */
export function getFavorite(homeProb, drawProb, awayProb) {
  const max = Math.max(homeProb, drawProb, awayProb);
  if (max === homeProb) return 'home';
  if (max === awayProb) return 'away';
  return 'draw';
}

/**
 * Format probability as percentage
 * @param {number} prob - Probability 0-1 or 0-100
 * @returns {number} - Percentage 0-100
 */
export function toPercent(prob) {
  if (!prob) return 0;
  return prob > 1 ? Math.round(prob) : Math.round(prob * 100);
}

/**
 * Get winner color based on favorite
 * @param {'home' | 'away' | 'draw'} favorite
 * @returns {string} - Hex color
 */
export function getWinnerColor(favorite) {
  switch (favorite) {
    case 'home': return '#3b9eff';
    case 'away': return '#f87171';
    default: return '#6b7280';
  }
}

/**
 * Map API prediction to display format
 * @param {Object} pred - Raw prediction from API
 * @returns {Object} - Formatted prediction
 */
export function mapPrediction(pred) {
  if (!pred) return null;
  
  const homeProb = (pred.p_home_win || pred.home_win || 0) / 100;
  const drawProb = (pred.p_draw || pred.draw || 0) / 100;
  const awayProb = (pred.p_away_win || pred.away_win || 0) / 100;
  const confidence = pred.confidence || 50;
  const favorite = getFavorite(homeProb * 100, drawProb * 100, awayProb * 100);
  
  return {
    fixture_id: pred.fixture_id,
    home_team: pred.home_team,
    away_team: pred.away_team,
    home_logo: pred.home_logo,
    away_logo: pred.away_logo,
    date: pred.fixture_date || pred.date,
    time: pred.fixture_time || pred.time,
    most_likely_score: pred.most_likely_score || '? - ?',
    home_prob: homeProb,
    draw_prob: drawProb,
    away_prob: awayProb,
    confidence,
    favorite,
    strength: getStrengthMeta(confidence),
    xg_home: pred.xg_home || 0,
    xg_away: pred.xg_away || 0,
    over25: pred.over25 || pred.over_25 || 0,
    btts: pred.btts || 0,
    home_form: parseForm(pred.home_form),
    away_form: parseForm(pred.away_form),
    venue: pred.venue,
  };
}

/**
 * Map live match from API
 * @param {Object} match - Raw match from API
 * @returns {Object} - Formatted live match
 */
export function mapLiveMatch(match) {
  if (!match) return null;
  
  const status = match.status || match.fixture?.status?.short;
  const isLive = ['1H', '2H', 'HT', 'ET', 'BT', 'P'].includes(status);
  const minute = match.minute || match.fixture?.status?.elapsed;
  
  return {
    fixture_id: match.fixture_id || match.fixture?.id,
    home_team: match.home_team || match.teams?.home?.name,
    away_team: match.away_team || match.teams?.away?.name,
    home_logo: match.home_logo || match.teams?.home?.logo,
    away_logo: match.away_logo || match.teams?.away?.logo,
    home_score: match.home_score ?? match.goals?.home ?? 0,
    away_score: match.away_score ?? match.goals?.away ?? 0,
    status,
    minute,
    isLive,
    kickoff: match.kickoff || match.fixture?.date,
    league: match.league || match.league_name,
  };
}

/**
 * Map player for trending display
 * @param {Object} player - Raw player data
 * @param {number} rank - Rank position
 * @returns {Object} - Formatted player
 */
export function mapTrendingPlayer(player, rank) {
  return {
    id: player.player_id || player.id,
    name: player.name || player.player?.name,
    photo: player.photo || player.player?.photo,
    team: player.team_name || player.team?.name,
    team_logo: player.team_logo || player.team?.logo,
    goals: player.goals || 0,
    assists: player.assists || 0,
    played: player.played || player.appearances || 0,
    rank,
  };
}

/**
 * Map FPL player for display
 * @param {Object} player - Raw FPL player data
 * @returns {Object} - Formatted FPL player
 */
export function mapFPLPlayer(player) {
  return {
    id: player.id,
    name: player.web_name || player.name,
    full_name: `${player.first_name || ''} ${player.second_name || ''}`.trim(),
    photo: player.photo,
    team: player.team_name || player.team,
    position: player.element_type_name || player.position,
    price: (player.now_cost || player.price || 0) / 10,
    total_points: player.total_points || 0,
    form: player.form || '0.0',
    selected_by: player.selected_by_percent || '0.0',
    expected_points: player.ep_next || player.expected_points || 0,
    ownership: parseFloat(player.selected_by_percent || 0),
  };
}

/**
 * Map accountability data for display
 * @param {Object} perf - Raw performance data
 * @returns {Object} - Formatted accountability stats
 */
export function mapAccountability(perf) {
  if (!perf) return null;
  
  return {
    accuracy: perf.accuracy || 0,
    correct: perf.correct || 0,
    assessed: perf.assessed || 0,
    pending: perf.pending || 0,
    avg_xg_error: perf.avg_xg_error,
    outcome_accuracy: {
      home: perf.outcome_accuracy?.home || 0,
      draw: perf.outcome_accuracy?.draw || 0,
      away: perf.outcome_accuracy?.away || 0,
    },
    outcome_counts: {
      home: perf.outcome_counts?.home || 0,
      draw: perf.outcome_counts?.draw || 0,
      away: perf.outcome_counts?.away || 0,
    },
    confidence_breakdown: perf.confidence_breakdown || [],
  };
}

/**
 * Get edge matches (strongest prediction edges)
 * @param {Object[]} predictions - Array of predictions
 * @param {number} limit - Max number to return
 * @returns {Object[]} - Top edge matches
 */
export function getEdgeMatches(predictions, limit = 3) {
  return [...predictions]
    .filter(p => p.confidence >= 60)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit)
    .map(p => ({
      ...mapPrediction(p),
      edge_type: 'strong_edge',
    }));
}

/**
 * Get high threat matches (high expected goals)
 * @param {Object[]} predictions - Array of predictions
 * @param {number} limit - Max number to return
 * @returns {Object[]} - High goal expectation matches
 */
export function getHighThreatMatches(predictions, limit = 3) {
  return [...predictions]
    .filter(p => (p.over25 || p.over_25 || 0) >= 65)
    .sort((a, b) => (b.over25 || b.over_25 || 0) - (a.over25 || a.over_25 || 0))
    .slice(0, limit)
    .map(p => ({
      ...mapPrediction(p),
      edge_type: 'high_threat',
    }));
}

/**
 * Get watchlist matches (close/uncertain predictions)
 * @param {Object[]} predictions - Array of predictions
 * @param {number} limit - Max number to return
 * @returns {Object[]} - Watchlist matches
 */
export function getWatchlistMatches(predictions, limit = 3) {
  return [...predictions]
    .filter(p => {
      const homeP = p.p_home_win || p.home_win || 0;
      const awayP = p.p_away_win || p.away_win || 0;
      return Math.abs(homeP - awayP) <= 15;
    })
    .slice(0, limit)
    .map(p => ({
      ...mapPrediction(p),
      edge_type: 'watchlist',
    }));
}

/**
 * Competition data with static info
 */
export const COMPETITIONS = [
  { 
    code: 'epl', 
    name: 'Premier League', 
    country: 'England',
    logo: 'https://media.api-sports.io/football/leagues/39.png',
    teams: 20,
  },
  { 
    code: 'laliga', 
    name: 'La Liga', 
    country: 'Spain',
    logo: 'https://media.api-sports.io/football/leagues/140.png',
    teams: 20,
  },
  { 
    code: 'seriea', 
    name: 'Serie A', 
    country: 'Italy',
    logo: 'https://media.api-sports.io/football/leagues/135.png',
    teams: 20,
  },
  { 
    code: 'bundesliga', 
    name: 'Bundesliga', 
    country: 'Germany',
    logo: 'https://media.api-sports.io/football/leagues/78.png',
    teams: 18,
  },
  { 
    code: 'ligue1', 
    name: 'Ligue 1', 
    country: 'France',
    logo: 'https://media.api-sports.io/football/leagues/61.png',
    teams: 18,
  },
  { 
    code: 'ucl', 
    name: 'Champions League', 
    country: 'Europe',
    logo: 'https://media.api-sports.io/football/leagues/2.png',
    teams: 36,
  },
];

/**
 * Platform capability data
 */
export const PLATFORM_CAPABILITIES = [
  {
    id: 'live',
    title: 'Live Intelligence',
    description: 'Real-time match data, live scores, and in-play analytics across all major competitions.',
    icon: '📡',
    color: 'rgba(248, 113, 113, 0.15)',
    link: '/live',
  },
  {
    id: 'predictions',
    title: 'Match Predictions',
    description: 'Data-driven forecasts with probability distributions, expected scores, and confidence metrics.',
    icon: '📊',
    color: 'rgba(59, 158, 255, 0.15)',
    link: '/predictions/premier-league',
  },
  {
    id: 'players',
    title: 'Player Analytics',
    description: 'Comprehensive player profiles, performance metrics, radar charts, and trend analysis.',
    icon: '👤',
    color: 'rgba(167, 139, 250, 0.15)',
    link: '/player',
  },
  {
    id: 'fpl',
    title: 'FPL Tools',
    description: 'Optimal captain picks, squad builder, transfer planner, and differential recommendations.',
    icon: '⭐',
    color: 'rgba(40, 217, 122, 0.15)',
    link: '/best-team',
  },
  {
    id: 'simulation',
    title: 'Simulations',
    description: 'Monte Carlo match simulations, season projections, and scenario modeling.',
    icon: '🎲',
    color: 'rgba(245, 158, 11, 0.15)',
    link: '/predictions/premier-league',
  },
  {
    id: 'lineups',
    title: 'Lineup Intelligence',
    description: 'Predicted formations, player availability, and tactical lineup analysis.',
    icon: '📋',
    color: 'rgba(56, 189, 248, 0.15)',
    link: '/live',
  },
  {
    id: 'shotmap',
    title: 'Shot Maps',
    description: 'Visual shot location data, xG analysis, and match shooting patterns.',
    icon: '🎯',
    color: 'rgba(244, 114, 182, 0.15)',
    link: '/live',
  },
  {
    id: 'accountability',
    title: 'Performance Tracking',
    description: 'Transparent prediction tracking, accuracy metrics, and verified outcomes.',
    icon: '✓',
    color: 'rgba(52, 211, 153, 0.15)',
    link: '/accountability',
  },
];

/**
 * Generate tactical insight data (placeholder)
 * @returns {Object[]} - Tactical insights
 */
export function generateTacticalInsights() {
  return [
    {
      id: 1,
      title: 'High Press Dominance',
      summary: 'Teams pressing in the final third are winning possession duels at a 68% rate this gameweek.',
      type: 'formation',
      league: 'Premier League',
      teams: ['Liverpool', 'Arsenal'],
    },
    {
      id: 2,
      title: 'Set Piece Efficiency',
      summary: 'Corner conversion rates have increased 23% across top 5 leagues compared to last season.',
      type: 'setpiece',
      league: 'All Leagues',
      teams: ['Chelsea', 'Newcastle'],
    },
    {
      id: 3,
      title: 'Counter-Attack Trends',
      summary: 'Fast transitions are producing 0.31 xG per attack, highest rate in 3 seasons.',
      type: 'transition',
      league: 'La Liga',
      teams: ['Real Madrid', 'Barcelona'],
    },
    {
      id: 4,
      title: 'Wing Play Analysis',
      summary: 'Crosses from deep positions showing 40% higher completion rate than byline deliveries.',
      type: 'attack',
      league: 'Serie A',
      teams: ['Inter', 'Napoli'],
    },
  ];
}