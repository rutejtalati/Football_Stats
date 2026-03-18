// ═══════════════════════════════════════════════════════════
// HomePage.jsx — StatinSite Intelligence Command Center
// Uses mapDashboard from homeDataMappers.js for all data
// ═══════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import "../styles/homepage.css";
import { mapDashboard } from "../utils/homeDataMappers";

import HeroCommandCenter from "../components/home/HeroCommandCenter";
import LiveRibbon from "../components/home/LiveRibbon";
import FeaturedMatchPanel from "../components/home/FeaturedMatchPanel";
import TopPredictionsSection from "../components/home/TopPredictionsSection";
import EdgeBoardSection from "../components/home/EdgeBoardSection";
import CompetitionCoverageSection from "../components/home/CompetitionCoverageSection";
import FPLSpotlightSection from "../components/home/FPLSpotlightSection";
import TrendingPlayersSection from "../components/home/TrendingPlayersSection";
import PlatformCapabilitiesSection from "../components/home/PlatformCapabilitiesSection";
import PredictionAccountabilitySection from "../components/home/PredictionAccountabilitySection";

const API = import.meta.env.VITE_API_URL || "";

export default function HomePage() {
  const [data, setData] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchDashboard() {
      try {
        const res = await fetch(`${API}/api/home/dashboard`);
        if (!res.ok) throw new Error("Dashboard fetch failed");
        const raw = await res.json();
        if (mounted) setData(mapDashboard(raw));
      } catch {
        if (mounted) setData(mapDashboard(null));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    async function fetchLive() {
      try {
        const res = await fetch(`${API}/api/matches/upcoming`);
        if (!res.ok) return;
        const raw = await res.json();
        const matches = Array.isArray(raw) ? raw : raw.matches || raw.response || [];
        if (mounted) setLiveMatches(matches);
      } catch {
        // Live ribbon is optional
      }
    }

    fetchDashboard();
    fetchLive();
    const liveInterval = setInterval(fetchLive, 60000);
    return () => { mounted = false; clearInterval(liveInterval); };
  }, []);

  if (loading) {
    return (
      <div className="hp">
        <div className="hp-gridlines" />
        <div className="hp-inner" style={{ paddingTop: 120, textAlign: "center" }}>
          <div className="hp-skeleton" style={{ width: 200, height: 32, margin: "0 auto 16px" }} />
          <div className="hp-skeleton" style={{ width: 320, height: 16, margin: "0 auto 12px" }} />
          <div className="hp-skeleton" style={{ width: 260, height: 16, margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  const d = data || mapDashboard(null);

  return (
    <div className="hp">
      <div className="hp-gridlines" />
      <div className="hp-inner">

        {/* 1 ── Hero Command Center */}
        <HeroCommandCenter
          predictions={d.predictions}
          modelMetrics={d.modelMetrics}
          modelConfidence={d.modelConfidence}
        />

        {/* 2 ── Live Ribbon */}
        <LiveRibbon matches={liveMatches} />

        {/* 3 ── Featured Match (top prediction) */}
        {d.predictions.predictions.length > 0 && (
          <section className="hp-section">
            <FeaturedMatchPanel match={d.predictions.predictions[0]} />
          </section>
        )}

        {/* 4 ── Top Predictions */}
        <TopPredictionsSection predictions={d.predictions} />

        {/* 5 ── Edge Board + Tactical Insights */}
        <EdgeBoardSection
          edges={d.edges}
          tacticalInsight={d.tacticalInsight}
        />

        {/* 6 ── Competition Coverage */}
        <CompetitionCoverageSection leagueCoverage={d.leagueCoverage} />

        {/* 7 ── FPL Spotlight */}
        <FPLSpotlightSection fplSpotlight={d.fplSpotlight} />

        {/* 8 ── Trending Players + xG Leaders */}
        <TrendingPlayersSection
          trendingPlayers={d.trendingPlayers}
          xgLeaders={d.xgLeaders}
        />

        {/* 9 ── News + Ground Zero + Games */}
        <PlatformCapabilitiesSection />

        {/* 10 ── Prediction Accountability */}
        <PredictionAccountabilitySection
          modelMetrics={d.modelMetrics}
          recentResults={d.recentResults}
          modelConfidence={d.modelConfidence}
        />
      </div>
    </div>
  );
}