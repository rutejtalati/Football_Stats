import React, { useState, useEffect } from 'react';
import { mapDashboard } from '../utils/homeDataMappers';
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
import HomeSectionHeader from '../components/home/HomeSectionHeader';

const API_BASE = import.meta.env.VITE_API_BASE || '';

const HomePage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/home/dashboard`);
        if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.status}`);
        const raw = await res.json();
        if (!cancelled) {
          setData(mapDashboard(raw));
          setError(null);
        }
      } catch (err) {
        console.error('Homepage data fetch error:', err);
        if (!cancelled) {
          // Use fallback mapped data so the page still renders
          setData(mapDashboard(null));
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDashboard();

    // Refresh every 5 minutes
    const interval = setInterval(fetchDashboard, 300000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading && !data) {
    return (
      <div className="homepage">
        <div className="hp-loading">
          <div className="hp-spinner" />
          <span style={{ color: 'var(--hp-text-dim)', fontSize: 13 }}>Loading intelligence...</span>
        </div>
      </div>
    );
  }

  // Even with errors, render with fallback data
  const d = data || mapDashboard(null);

  return (
    <div className="homepage">
      {/* 1. Hero Command Center */}
      <HeroCommandCenter
        predictions={d.predictions}
        modelMetrics={d.modelMetrics}
        modelConfidence={d.modelConfidence}
      />

      {/* 2. Live Intelligence Ribbon */}
      <LiveRibbon
        trendingPlayers={d.trendingPlayers}
        predictions={d.predictions}
      />

      {/* 3. Featured Match Intelligence */}
      <section className="hp-section" style={{ paddingTop: 40 }}>
        <div className="hp-container">
          <HomeSectionHeader
            title="Featured Matches"
            subtitle="Next fixtures with full model intelligence"
            accentColor="var(--hp-blue)"
          />
          <FeaturedMatchPanel predictions={d.predictions} />
        </div>
      </section>

      {/* 4. Top Predictions */}
      <TopPredictionsSection predictions={d.predictions} />

      {/* 5. Edge Board / High Threat Board */}
      <EdgeBoardSection
        edges={d.edges}
        highScoringMatches={d.highScoringMatches}
      />

      {/* 6. Tactical Insights */}
      <TacticalInsightsSection tacticalInsight={d.tacticalInsight} />

      {/* 7. Competition Coverage */}
      <CompetitionCoverageSection
        leagueCoverage={d.leagueCoverage}
        powerRankings={d.powerRankings}
      />

      {/* 8. FPL Spotlight */}
      <FPLSpotlightSection fplSpotlight={d.fplSpotlight} />

      {/* 9. Trending Players */}
      <TrendingPlayersSection
        trendingPlayers={d.trendingPlayers}
        xgLeaders={d.xgLeaders}
      />

      {/* 10. Platform Capabilities */}
      <PlatformCapabilitiesSection />

      {/* 11. Prediction Accountability */}
      <PredictionAccountabilitySection
        modelMetrics={d.modelMetrics}
        recentResults={d.recentResults}
      />

      {/* Footer spacer */}
      <div style={{ height: 80 }} />

      {/* Error toast — subtle, non-blocking */}
      {error && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20,
          background: 'var(--hp-bg-card)', border: '1px solid var(--hp-border)',
          borderRadius: 'var(--hp-radius-sm)', padding: '10px 16px',
          fontSize: 11, color: 'var(--hp-text-muted)', zIndex: 100,
          maxWidth: 300,
        }}>
          Using cached data — live refresh will retry automatically.
        </div>
      )}
    </div>
  );
};

export default HomePage;