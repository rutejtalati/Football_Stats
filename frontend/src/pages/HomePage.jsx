// ═══════════════════════════════════════════════════════════
// HomePage.jsx — Dense Intelligence Console
// Structure mirrors old FPL page: hero → summary strip → sections → accountability
// All data via mapDashboard from homeDataMappers.js
// ═══════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import "../styles/homepage.css";
import { mapDashboard, formatPct, formatXg, confLevel } from "../utils/homeDataMappers";

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
        if (mounted) setLiveMatches(raw.matches || []);
      } catch { /* optional */ }
    }

    fetchDashboard();
    fetchLive();
    const iv = setInterval(fetchLive, 60000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  if (loading) {
    return (
      <div className="hp">
        <div className="hp-gridlines" />
        <div className="hp-inner" style={{ paddingTop: 100, textAlign: "center" }}>
          <div className="hp-skeleton" style={{ width: 180, height: 28, margin: "0 auto 12px" }} />
          <div className="hp-skeleton" style={{ width: 300, height: 14, margin: "0 auto 10px" }} />
          <div className="hp-skeleton" style={{ width: 240, height: 14, margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  const d = data || mapDashboard(null);
  const preds = d.predictions.predictions || [];
  const topPred = preds[0] || null;
  const mm = d.modelMetrics;
  const mc = d.modelConfidence;

  // Build intelligence summary cards (like old SummaryCard row)
  const summaryCards = [];
  if (mm.overallAccuracy > 0) summaryCards.push({
    title: "Model Accuracy", value: `${mm.overallAccuracy}%`,
    sub: mm.last30Accuracy > 0 ? `Last 30: ${mm.last30Accuracy}%` : mm.leaguesNote,
    accent: "#00e09e",
  });
  if (mc.avg > 0) summaryCards.push({
    title: "Avg Confidence", value: `${Math.round(mc.avg)}%`,
    sub: `${mc.high} high · ${mc.medium} med · ${mc.low} low`,
    accent: "#4f9eff",
  });
  if (preds.length > 0) summaryCards.push({
    title: "Active Predictions", value: `${preds.length}`,
    sub: d.predictions.league ? `${d.predictions.league} focused` : "Across top leagues",
    accent: "#f2c94c",
  });
  if (d.recentResults.total > 0) {
    const hitPct = Math.round((d.recentResults.correct / d.recentResults.total) * 100);
    summaryCards.push({
      title: "Recent Record", value: `${d.recentResults.correct}/${d.recentResults.total}`,
      sub: `${hitPct}% hit rate`,
      accent: hitPct >= 55 ? "#00e09e" : hitPct >= 45 ? "#f2c94c" : "#ff4d6d",
    });
  }
  if (mm.fixturesCount) summaryCards.push({
    title: "Fixtures Analyzed", value: mm.fixturesCount,
    sub: mm.leaguesNote || "Multi-league coverage",
    accent: "#b388ff",
  });

  return (
    <div className="hp">
      <div className="hp-gridlines" />
      <div className="hp-inner">

        {/* 1 ── Compact Hero */}
        <HeroCommandCenter predictions={d.predictions} />

        {/* 2 ── Intelligence Summary Strip (like old SummaryCard row) */}
        {summaryCards.length > 0 && (
          <div className="intel-strip">
            {summaryCards.map((c, i) => (
              <div key={i} className="intel-card" style={{ "--ic-accent": c.accent }}>
                <div className="intel-card-title">{c.title}</div>
                <div className="intel-card-value">{c.value}</div>
                {c.sub && <div className="intel-card-sub">{c.sub}</div>}
              </div>
            ))}
          </div>
        )}

        {/* 3 ── Live Ribbon */}
        <LiveRibbon matches={liveMatches} />

        {/* 4 ── Featured Match */}
        {topPred && (
          <section className="hp-section" style={{ paddingTop: 20 }}>
            <FeaturedMatchPanel match={topPred} />
          </section>
        )}

        {/* 5 ── Top Predictions */}
        {preds.length > 1 && (
          <TopPredictionsSection predictions={d.predictions} />
        )}

        {/* 6 ── Edge Board + Tactical */}
        <EdgeBoardSection edges={d.edges} tacticalInsight={d.tacticalInsight} />

        {/* 7 ── Competition Coverage */}
        <CompetitionCoverageSection leagueCoverage={d.leagueCoverage} />

        {/* 8 ── FPL Spotlight */}
        <FPLSpotlightSection fplSpotlight={d.fplSpotlight} />

        {/* 9 ── Players */}
        <TrendingPlayersSection trendingPlayers={d.trendingPlayers} xgLeaders={d.xgLeaders} />

        {/* 10 ── Platform (News, Ground Zero, Games) */}
        <PlatformCapabilitiesSection analyticsTerm={d.analyticsTerm} />

        {/* 11 ── Accountability */}
        <PredictionAccountabilitySection
          modelMetrics={d.modelMetrics}
          recentResults={d.recentResults}
        />
      </div>
    </div>
  );
}