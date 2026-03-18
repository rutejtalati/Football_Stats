// src/pages/HomePage.jsx
// ═══════════════════════════════════════════════════════════════════════════
// StatinSite Homepage - Command Center for Football Intelligence
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Styles
import '../styles/homepage.css';

// Section components
import HeroCommandCenter from '../components/home/HeroCommandCenter';
import LiveRibbon from '../components/home/LiveRibbon';
import FeaturedMatchPanel from '../components/home/FeaturedMatchPanel';
import TopPredictionsSection from '../components/home/TopPredictionsSection';
import EdgeBoardSection from '../components/home/EdgeBoardSection';
import TacticalInsightsSection from '../components/home/TacticalInsightsSection';
import CompetitionCoverageSection from '../components/home/CompetitionCoverageSection';
import FPLSpotlightSection from '../components/home/FPLSpotlightSection';
import TrendingPlayersSection from '../components/home/TrendingPlayersSection';
import PlatformCapabilitiesSection from '../components/home/PlatformCapabilitiesSection';
import PredictionAccountabilitySection from '../components/home/PredictionAccountabilitySection';

// Utilities
import { 
  mapPrediction, 
  mapLiveMatch, 
  getEdgeMatches, 
  getHighThreatMatches, 
  getWatchlistMatches,
  generateTacticalInsights,
  COMPETITIONS 
} from '../utils/homeDataMappers';

// API configuration
const API_BASE = import.meta.env.VITE_BACKEND_URL || 'https://football-stats-lw4b.onrender.com';

// League codes for fetching predictions
const LEAGUE_CODES = ['epl', 'laliga', 'seriea', 'bundesliga', 'ligue1'];

// ═══════════════════════════════════════════════════════════════════════════
// Custom Hooks
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Scroll reveal observer hook
 */
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('hp-reveal--visible');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    // Observe all reveal elements
    const elements = document.querySelectorAll('.hp-reveal');
    elements.forEach(el => observer.observe(el));

    return () => {
      elements.forEach(el => observer.unobserve(el));
    };
  }, []);
}

/**
 * API fetch helper with error handling
 */
async function fetchAPI(endpoint) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function HomePage() {
  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────
  
  // Loading states
  const [loading, setLoading] = useState({
    matches: true,
    predictions: true,
    performance: true,
    scorers: true,
    assists: true,
  });

  // Live/upcoming matches
  const [liveMatches, setLiveMatches] = useState([]);
  const [featuredMatch, setFeaturedMatch] = useState(null);

  // Predictions by league
  const [predictions, setPredictions] = useState([]);
  const [leagues, setLeagues] = useState([]);

  // Edge board data
  const [edgeMatches, setEdgeMatches] = useState([]);
  const [threatMatches, setThreatMatches] = useState([]);
  const [watchlistMatches, setWatchlistMatches] = useState([]);

  // Tactical insights
  const [tacticalInsights, setTacticalInsights] = useState([]);

  // Competition stats
  const [matchCounts, setMatchCounts] = useState({});
  const [liveCounts, setLiveCounts] = useState({});

  // Trending players
  const [scorers, setScorers] = useState({});
  const [assists, setAssists] = useState({});

  // Performance stats for hero
  const [heroStats, setHeroStats] = useState({
    accuracy: null,
    totalPredictions: null,
    leaguesCovered: 5,
  });

  // Initialize scroll reveal
  useScrollReveal();

  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Fetch live and upcoming matches
   */
  const fetchMatches = useCallback(async () => {
    setLoading(prev => ({ ...prev, matches: true }));
    
    const data = await fetchAPI('/api/matches/upcoming');
    
    if (data?.matches) {
      const mapped = data.matches.map(mapLiveMatch);
      setLiveMatches(mapped);
      
      // Count live and upcoming per competition
      const liveCnt = {};
      const matchCnt = {};
      
      mapped.forEach(m => {
        const code = m.league?.toLowerCase().replace(/\s+/g, '') || 'other';
        matchCnt[code] = (matchCnt[code] || 0) + 1;
        if (m.isLive) {
          liveCnt[code] = (liveCnt[code] || 0) + 1;
        }
      });
      
      setLiveCounts(liveCnt);
      setMatchCounts(matchCnt);
    }
    
    setLoading(prev => ({ ...prev, matches: false }));
  }, []);

  /**
   * Fetch predictions from all leagues
   */
  const fetchPredictions = useCallback(async () => {
    setLoading(prev => ({ ...prev, predictions: true }));
    
    const allPredictions = [];
    const leagueSet = new Set();
    
    // Fetch from all leagues in parallel
    const results = await Promise.all(
      LEAGUE_CODES.map(code => fetchAPI(`/api/league/${code}/predictions`))
    );
    
    results.forEach((data, idx) => {
      if (data?.predictions) {
        const leagueName = getLeagueName(LEAGUE_CODES[idx]);
        leagueSet.add(leagueName);
        
        data.predictions.forEach(p => {
          const mapped = mapPrediction({ ...p, league: leagueName });
          if (mapped) {
            allPredictions.push(mapped);
          }
        });
      }
    });
    
    // Sort by confidence
    allPredictions.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    
    setPredictions(allPredictions);
    setLeagues(Array.from(leagueSet));
    
    // Set featured match (highest confidence live or upcoming)
    const featured = allPredictions.find(p => p.status !== 'finished') || allPredictions[0];
    setFeaturedMatch(featured);
    
    // Derive edge board data
    setEdgeMatches(getEdgeMatches(allPredictions));
    setThreatMatches(getHighThreatMatches(allPredictions));
    setWatchlistMatches(getWatchlistMatches(allPredictions));
    
    // Generate tactical insights
    setTacticalInsights(generateTacticalInsights());
    
    setLoading(prev => ({ ...prev, predictions: false }));
  }, []);

  /**
   * Fetch performance stats for hero
   */
  const fetchPerformance = useCallback(async () => {
    setLoading(prev => ({ ...prev, performance: true }));
    
    const data = await fetchAPI('/api/predictions/performance');
    
    if (data) {
      setHeroStats({
        accuracy: data.accuracy_pct || data.accuracy || null,
        totalPredictions: data.total || data.total_predictions || null,
        leaguesCovered: 5,
      });
    }
    
    setLoading(prev => ({ ...prev, performance: false }));
  }, []);

  /**
   * Fetch top scorers for all leagues
   */
  const fetchScorers = useCallback(async () => {
    setLoading(prev => ({ ...prev, scorers: true }));
    
    const scorerData = {};
    
    const results = await Promise.all(
      LEAGUE_CODES.map(code => fetchAPI(`/api/topscorers/${code}`))
    );
    
    results.forEach((data, idx) => {
      const leagueName = getLeagueName(LEAGUE_CODES[idx]);
      if (data?.scorers) {
        scorerData[leagueName] = data.scorers.slice(0, 10);
      }
    });
    
    setScorers(scorerData);
    setLoading(prev => ({ ...prev, scorers: false }));
  }, []);

  /**
   * Fetch top assists for all leagues
   */
  const fetchAssists = useCallback(async () => {
    setLoading(prev => ({ ...prev, assists: true }));
    
    const assistData = {};
    
    const results = await Promise.all(
      LEAGUE_CODES.map(code => fetchAPI(`/api/topassists/${code}`))
    );
    
    results.forEach((data, idx) => {
      const leagueName = getLeagueName(LEAGUE_CODES[idx]);
      if (data?.assists) {
        assistData[leagueName] = data.assists.slice(0, 10);
      }
    });
    
    setAssists(assistData);
    setLoading(prev => ({ ...prev, assists: false }));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────────────

  // Initial data load
  useEffect(() => {
    fetchMatches();
    fetchPredictions();
    fetchPerformance();
    fetchScorers();
    fetchAssists();
  }, [fetchMatches, fetchPredictions, fetchPerformance, fetchScorers, fetchAssists]);

  // Refresh live matches every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchMatches, 60000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="hp-page">
      {/* Hero Section */}
      <HeroCommandCenter 
        featuredMatch={featuredMatch}
        stats={heroStats}
      />
      
      {/* Live Match Ribbon */}
      <LiveRibbon matches={liveMatches} />
      
      {/* Featured Match Deep Dive */}
      {featuredMatch && (
        <section className="hp-featured hp-section hp-reveal">
          <div className="hp-container">
            <FeaturedMatchPanel match={featuredMatch} />
          </div>
        </section>
      )}
      
      {/* Top Predictions Grid */}
      <TopPredictionsSection 
        predictions={predictions}
        leagues={leagues}
        loading={loading.predictions}
      />
      
      {/* Edge Board */}
      <EdgeBoardSection 
        edgeMatches={edgeMatches}
        threatMatches={threatMatches}
        watchlistMatches={watchlistMatches}
        loading={loading.predictions}
      />
      
      {/* Tactical Insights */}
      <TacticalInsightsSection 
        insights={tacticalInsights}
        loading={loading.predictions}
      />
      
      {/* Competition Coverage */}
      <CompetitionCoverageSection 
        competitions={COMPETITIONS}
        matchCounts={matchCounts}
        liveCounts={liveCounts}
        loading={loading.matches}
      />
      
      {/* FPL Spotlight (placeholder data - would need FPL API) */}
      <FPLSpotlightSection 
        captainPicks={[]}
        differentials={[]}
        inFormPlayers={[]}
        loading={false}
        gameweek={null}
      />
      
      {/* Trending Players */}
      <TrendingPlayersSection 
        scorers={scorers}
        assists={assists}
        leagues={leagues}
        loading={loading.scorers || loading.assists}
      />
      
      {/* Platform Capabilities */}
      <PlatformCapabilitiesSection loading={false} />
      
      {/* Prediction Accountability */}
      <PredictionAccountabilitySection />
      
      {/* Footer spacer */}
      <div className="hp-footer-spacer" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert league code to display name
 */
function getLeagueName(code) {
  const map = {
    epl: 'Premier League',
    laliga: 'La Liga',
    seriea: 'Serie A',
    bundesliga: 'Bundesliga',
    ligue1: 'Ligue 1',
  };
  return map[code] || code;
}