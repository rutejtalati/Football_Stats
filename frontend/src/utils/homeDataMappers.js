/**
 * homeDataMappers.js — Defensive data normalization for the homepage
 * Every mapper ensures: no NaN, no null renders, no impossible percentages,
 * no undefined fields. If data is missing, return intelligent fallbacks.
 */

// ── Primitives ────────────────────────────────────────────────────
export const safe = (val, fallback = 0) => {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number' && isNaN(val)) return fallback;
  return val;
};

export const safeStr = (val, fallback = '—') =>
  val && typeof val === 'string' && val.trim() ? val.trim() : fallback;

export const safeNum = (val, fallback = 0) => {
  const n = Number(val);
  return isNaN(n) || !isFinite(n) ? fallback : n;
};

export const clamp = (val, min, max) => Math.min(max, Math.max(min, safeNum(val, min)));

export const safePct = (val, fallback = 0) => clamp(safeNum(val, fallback), 0, 100);

export const safeXg = (val) => {
  const n = safeNum(val, -1);
  return n < 0 || n > 10 ? null : Math.round(n * 100) / 100;
};

export const formatPct = (val, fallback = '—') => {
  const n = safePct(val, -1);
  return n < 0 ? fallback : `${Math.round(n)}%`;
};

export const formatXg = (val, fallback = '—') => {
  const x = safeXg(val);
  return x === null ? fallback : x.toFixed(2);
};

export const formatConf = (conf) => {
  if (typeof conf === 'string') return conf.charAt(0).toUpperCase() + conf.slice(1);
  const n = safePct(conf, 50);
  if (n >= 70) return 'High';
  if (n >= 55) return 'Medium';
  return 'Low';
};

export const confLevel = (conf) => {
  if (typeof conf === 'string') return conf.toLowerCase();
  const n = safePct(conf, 50);
  if (n >= 70) return 'high';
  if (n >= 55) return 'medium';
  return 'low';
};

// ── Form helpers ──────────────────────────────────────────────────
export const parseForm = (formStr) => {
  if (!formStr || typeof formStr !== 'string') return [];
  return formStr.split('').filter((c) => ['W', 'D', 'L'].includes(c.toUpperCase())).map((c) => c.toUpperCase());
};

export const formColor = (letter) => {
  const map = { W: '#00e09e', D: '#f2c94c', L: '#ff4d6d' };
  return map[letter] || '#555';
};

// ── Section mappers ──────────────────────────────────────────────

export const mapPrediction = (p) => {
  if (!p) return null;
  const hw = safePct(p.homeProb, 33);
  const aw = safePct(p.awayProb, 33);
  const dw = safePct(p.draw, 100 - hw - aw);
  return {
    fixtureId: safe(p.fixture_id, null),
    home: safeStr(p.home, 'Home'),
    away: safeStr(p.away, 'Away'),
    homeLogo: safeStr(p.home_logo, ''),
    awayLogo: safeStr(p.away_logo, ''),
    homeProb: hw,
    awayProb: aw,
    draw: dw,
    xgHome: safeXg(p.xg_home),
    xgAway: safeXg(p.xg_away),
    score: safeStr(p.score, '—'),
    conf: confLevel(p.conf || p.conf_pct),
    confPct: safePct(p.conf_pct, 50),
    league: safeStr(p.league, ''),
    leagueCode: safeStr(p.league_code, 'epl'),
    kickoff: safeStr(p.kickoff, ''),
    time: safeStr(p.time, ''),
    col: safeStr(p.col, '#4f9eff'),
  };
};

export const mapPredictions = (data) => {
  const preds = (data?.predictions || []).map(mapPrediction).filter(Boolean);
  return { predictions: preds, league: safeStr(data?.league, 'epl') };
};

export const mapEdge = (e) => {
  if (!e) return null;
  return {
    fixtureId: safe(e.fixture_id, null),
    home: safeStr(e.home, 'Home'),
    away: safeStr(e.away, 'Away'),
    modelProb: safePct(e.model_prob, 50),
    edge: clamp(safeNum(e.edge, 0), 0, 50),
    direction: safeStr(e.direction, 'home'),
    label: safeStr(e.label, 'Edge signal'),
    col: safeStr(e.col, '#00e09e'),
  };
};

export const mapEdges = (data) => ({
  edges: (data?.edges || []).map(mapEdge).filter(Boolean),
});

export const mapTacticalInsight = (data) => {
  const primary = data?.primary || {};
  const all = (data?.all || []).map((i) => ({
    stat: safeStr(i.stat, '—'),
    label: safeStr(i.label, 'Stat'),
    player: safeStr(i.player, 'Team'),
    context: safeStr(i.context, ''),
    col: safeStr(i.col, '#4f9eff'),
    teamId: safe(i.team_id, null),
  }));
  return {
    primary: {
      stat: safeStr(primary.stat, '—'),
      label: safeStr(primary.label, 'Stat'),
      player: safeStr(primary.player, 'Team'),
      context: safeStr(primary.context, ''),
      col: safeStr(primary.col, '#f2c94c'),
    },
    all,
  };
};

export const mapTrendingPlayer = (item) => {
  if (!item) return null;
  return {
    label: safeStr(item.label, 'Player'),
    value: safeStr(String(item.value), '—'),
    col: safeStr(item.col, '#4f9eff'),
    playerId: safe(item.player_id, null),
    type: safeStr(item.type, 'form'),
    sub: safeStr(item.sub, ''),
  };
};

export const mapTrendingPlayers = (data) => ({
  items: (data?.items || []).map(mapTrendingPlayer).filter(Boolean),
});

export const mapXgLeader = (l) => {
  if (!l) return null;
  return {
    playerId: safe(l.player_id, null),
    name: safeStr(l.name, 'Player'),
    photo: safeStr(l.photo, ''),
    team: safeStr(l.team, ''),
    teamLogo: safeStr(l.team_logo, ''),
    goals: safeNum(l.goals, 0),
    assists: safeNum(l.assists, 0),
    gPlusA: safeNum(l.g_plus_a, 0),
    per90: safeNum(l.per90, 0),
    played: safeNum(l.played, 0),
  };
};

export const mapXgLeaders = (data) => ({
  leaders: (data?.leaders || []).map(mapXgLeader).filter(Boolean),
  league: safeStr(data?.league, ''),
});

export const mapPowerRanking = (r) => {
  if (!r) return null;
  return {
    rank: safeNum(r.rank, 0),
    powerRank: safeNum(r.power_rank, 0),
    teamName: safeStr(r.team_name, 'Team'),
    logo: safeStr(r.logo, ''),
    played: safeNum(r.played, 0),
    won: safeNum(r.won, 0),
    drawn: safeNum(r.drawn, 0),
    lost: safeNum(r.lost, 0),
    goalsFor: safeNum(r.goals_for, 0),
    goalsAgainst: safeNum(r.goals_against, 0),
    goalDiff: safeNum(r.goal_diff, 0),
    points: safeNum(r.points, 0),
    form: parseForm(r.form),
    formPts: safeNum(r.form_pts, 0),
    ppg: safeNum(r.ppg, 0),
    powerPct: safePct(r.power_pct, 0),
    rankDelta: safeNum(r.rank_delta, 0),
  };
};

export const mapPowerRankings = (data) => ({
  rankings: (data?.rankings || []).map(mapPowerRanking).filter(Boolean),
  league: safeStr(data?.league, ''),
});

export const mapModelMetrics = (data) => ({
  overallAccuracy: data?.overall_accuracy ?? null,
  logLoss: data?.log_loss ?? null,
  brierScore: data?.brier_score ?? null,
  last30Accuracy: data?.last_30_accuracy ?? null,
  assessed: safeNum(data?.assessed, 0),
  trend: (data?.trend || []).map((t) => ({
    gw: safeStr(t.gw, ''),
    acc: safePct(t.acc, 0),
  })),
  confidenceBreakdown: (data?.confidence_breakdown || []).map((b) => ({
    bracket: safeStr(b.bracket, ''),
    count: safeNum(b.count, 0),
    correct: safeNum(b.correct, 0),
    accuracy: b.accuracy ?? null,
  })),
  outcomeAccuracy: data?.outcome_accuracy || {},
  fixturesCount: data?.fixtures_count ?? null,
});

export const mapDifferentialCaptain = (c) => {
  if (!c) return null;
  return {
    playerId: safe(c.player_id, null),
    name: safeStr(c.name, 'Player'),
    team: safeStr(c.team, ''),
    teamShort: safeStr(c.team_short, ''),
    position: safeStr(c.position, 'MID'),
    ownership: safeStr(c.ownership, '0'),
    form: safeStr(c.form, '0'),
    cost: safeNum(c.cost, 0),
    totalPoints: safeNum(c.total_points, 0),
    diffScore: safeNum(c.diff_score, 0),
  };
};

export const mapFPLSpotlight = (data) => ({
  captains: (data?.differential_captains?.captains || []).map(mapDifferentialCaptain).filter(Boolean),
  valuePlayers: (data?.value_players?.players || []).map((p) => ({
    playerId: safe(p.player_id, null),
    name: safeStr(p.name, 'Player'),
    team: safeStr(p.team, ''),
    teamShort: safeStr(p.team_short, ''),
    position: safeStr(p.position, 'MID'),
    cost: safeNum(p.cost, 0),
    totalPoints: safeNum(p.total_points, 0),
    form: safeStr(p.form, '0'),
    valueScore: safeNum(p.value_score, 0),
    ownership: safeStr(p.ownership, '0'),
  })),
});

export const mapRecentResult = (r) => {
  if (!r) return null;
  return {
    home: safeStr(r.home, 'Home'),
    away: safeStr(r.away, 'Away'),
    pred: safeStr(r.pred, '—'),
    actual: safeStr(r.actual, 'Pending'),
    score: safeStr(r.score, '—'),
    conf: safeStr(r.conf, 'Low'),
    correct: r.correct,
    fixtureId: safe(r.fixture_id, null),
  };
};

export const mapRecentResults = (data) => ({
  results: (data?.results || []).map(mapRecentResult).filter(Boolean),
  correct: safeNum(data?.correct, 0),
  total: safeNum(data?.total, 0),
});

export const mapHighScoringMatch = (m) => {
  if (!m) return null;
  return {
    ...mapPrediction(m),
    totalXg: safeNum(m.total_xg, 0),
  };
};

export const mapTitleRace = (data) => ({
  top4: (data?.top4 || []).map((t) => ({
    teamName: safeStr(t.team_name, 'Team'),
    logo: safeStr(t.logo, ''),
    points: safeNum(t.points, 0),
    gapToLeader: safeNum(t.gap_to_leader, 0),
    form: parseForm(t.form),
    formLetters: (t.form_letters || []).map((l) => l.toUpperCase()),
    formPts: safeNum(t.form_pts, 0),
    trend: safeStr(t.trend, 'neutral'),
    played: safeNum(t.played, 0),
    goalDiff: safeNum(t.goal_diff, 0),
  })),
  leader: safeStr(data?.leader, ''),
  gap12: safeNum(data?.gap_1_2, 0),
  league: safeStr(data?.league, ''),
});

// ── League Coverage ──────────────────────────────────────────────
const LEAGUE_META = {
  epl: { name: 'Premier League', color: '#4f9eff', country: 'England' },
  laliga: { name: 'La Liga', color: '#f2c94c', country: 'Spain' },
  seriea: { name: 'Serie A', color: '#00e09e', country: 'Italy' },
  bundesliga: { name: 'Bundesliga', color: '#ff8c42', country: 'Germany' },
  ligue1: { name: 'Ligue 1', color: '#b388ff', country: 'France' },
};

export const mapLeagueCoverage = (powerRankings, titleRace) => {
  const leagues = Object.entries(LEAGUE_META).map(([code, meta]) => {
    // Pull rankings if available (dashboard currently only returns EPL)
    const rankings = powerRankings?.rankings || [];
    const race = titleRace?.top4 || [];
    return {
      code,
      ...meta,
      topTeam: race[0]?.team_name || rankings[0]?.team_name || '—',
      topTeamLogo: race[0]?.logo || rankings[0]?.logo || '',
      leaderPoints: race[0]?.points || rankings[0]?.points || 0,
      tracked: true,
    };
  });
  return { leagues };
};

// ── Master dashboard mapper ──────────────────────────────────────
export const mapDashboard = (raw) => {
  if (!raw || typeof raw !== 'object') {
    return {
      predictions: { predictions: [], league: 'epl' },
      edges: { edges: [] },
      tacticalInsight: { primary: {}, all: [] },
      trendingPlayers: { items: [] },
      xgLeaders: { leaders: [], league: '' },
      powerRankings: { rankings: [], league: '' },
      modelMetrics: {},
      fplSpotlight: { captains: [], valuePlayers: [] },
      recentResults: { results: [], correct: 0, total: 0 },
      titleRace: { top4: [], leader: '', gap12: 0, league: '' },
      highScoringMatches: [],
      defenseTable: [],
      analyticsTerm: {},
      heroStats: {},
      accountabilitySummary: {},
      competitionsSupported: [],
      featureStatus: [],
      modelConfidence: { high: 0, medium: 0, low: 0, avg: 0 },
      leagueCoverage: { leagues: [] },
    };
  }

  return {
    predictions: mapPredictions(raw.top_predictions),
    edges: mapEdges(raw.model_edges),
    tacticalInsight: mapTacticalInsight(raw.tactical_insight),
    trendingPlayers: mapTrendingPlayers(raw.trending_players),
    xgLeaders: mapXgLeaders(raw.xg_leaders),
    powerRankings: mapPowerRankings(raw.power_rankings),
    modelMetrics: mapModelMetrics(raw.model_metrics),
    fplSpotlight: mapFPLSpotlight(raw),
    recentResults: mapRecentResults(raw.recent_results),
    titleRace: mapTitleRace(raw.title_race),
    highScoringMatches: (raw.high_scoring_matches?.matches || []).map(mapHighScoringMatch).filter(Boolean),
    defenseTable: (raw.defense_table?.table || []).map((t) => ({
      teamName: safeStr(t.team_name, 'Team'),
      logo: safeStr(t.logo, ''),
      goalsAgainst: safeNum(t.goals_against, 0),
      gaPg: safeNum(t.ga_pg, 0),
      played: safeNum(t.played, 0),
      form: parseForm(t.form),
    })),
    analyticsTerm: {
      term: safeStr(raw.analytics_term?.term, ''),
      short: safeStr(raw.analytics_term?.short, ''),
      definition: safeStr(raw.analytics_term?.definition, ''),
      col: safeStr(raw.analytics_term?.col, '#4f9eff'),
    },
    modelConfidence: {
      high: safeNum(raw.model_confidence?.high, 0),
      medium: safeNum(raw.model_confidence?.medium, 0),
      low: safeNum(raw.model_confidence?.low, 0),
      avg: safeNum(raw.model_confidence?.avg_confidence, 0),
    },
    leagueCoverage: mapLeagueCoverage(raw.power_rankings, raw.title_race),
    // ── New backend-driven blocks ──
    heroStats: {
      competitionsCount: safeNum(raw.hero_stats?.competitions_count, 0),
      fixturesPredicted: raw.hero_stats?.fixtures_predicted ?? null,
      playersTracked: raw.hero_stats?.players_tracked ?? null,
      matchAccuracy: raw.hero_stats?.match_accuracy ?? null,
    },
    accountabilitySummary: {
      logged: safeNum(raw.accountability_summary?.logged, 0),
      verified: safeNum(raw.accountability_summary?.verified, 0),
      pending: safeNum(raw.accountability_summary?.pending, 0),
      hitRate: raw.accountability_summary?.hit_rate ?? null,
      assessed: safeNum(raw.accountability_summary?.assessed, 0),
      highConfidenceAccuracy: raw.accountability_summary?.high_confidence_accuracy ?? null,
      mediumConfidenceAccuracy: raw.accountability_summary?.medium_confidence_accuracy ?? null,
      lowConfidenceAccuracy: raw.accountability_summary?.low_confidence_accuracy ?? null,
    },
    competitionsSupported: (raw.competitions_supported || []).map((c) => ({
      code: safeStr(c.code, ''),
      name: safeStr(c.name, ''),
      slug: safeStr(c.slug, ''),
      country: safeStr(c.country, ''),
      color: safeStr(c.color, '#4f9eff'),
    })),
    featureStatus: (raw.feature_status || []).map((f) => ({
      key: safeStr(f.key, ''),
      title: safeStr(f.title, ''),
      route: safeStr(f.route, ''),
      status: safeStr(f.status, 'coming_soon'),
      backendReady: !!f.backend_ready,
    })),
  };
};