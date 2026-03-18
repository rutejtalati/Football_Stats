// ═══════════════════════════════════════════════════════════
// HomePage.jsx — Backend-Driven Intelligence Console (v2)
// No fake fallbacks. If data is unavailable, show empty states.
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
  const preds = (d.predictions?.predictions) || [];
  const topPred = preds[0] || null;
  const mm = d.modelMetrics || {};
  const mc = d.modelConfidence || {};
  const hs = d.heroStats || {};
  const acc = d.accountabilitySummary || {};
  const rr = d.recentResults || { results: [], correct: 0, total: 0 };

  // ── Intelligence summary strip — only real computed values ──
  const summaryCards = [];

  if (hs.competitionsCount > 0) {
    summaryCards.push({
      title: "Competitions", value: `${hs.competitionsCount}`,
      sub: "Leagues and cups covered", accent: "#4f9eff",
    });
  }
  if (hs.fixturesPredicted != null && hs.fixturesPredicted > 0) {
    summaryCards.push({
      title: "Predictions Logged", value: `${hs.fixturesPredicted}`,
      sub: "Tracked and verifiable", accent: "#00e09e",
    });
  }
  if (hs.matchAccuracy != null) {
    summaryCards.push({
      title: "Match Accuracy", value: `${hs.matchAccuracy}%`,
      sub: acc.assessed > 0 ? `${acc.assessed} verified` : "Verified predictions",
      accent: "#f2c94c",
    });
  }
  if (hs.playersTracked != null && hs.playersTracked > 0) {
    summaryCards.push({
      title: "Players Tracked", value: `${hs.playersTracked}`,
      sub: "FPL data coverage", accent: "#b388ff",
    });
  }
  if ((mc.avg || 0) > 0) {
    summaryCards.push({
      title: "Avg Confidence", value: `${Math.round(mc.avg)}%`,
      sub: `${mc.high || 0}H · ${mc.medium || 0}M · ${mc.low || 0}L`,
      accent: "#ff8c42",
    });
  }

  return (
    <div className="hp">
      <div className="hp-gridlines" />
      <div className="hp-inner">

        {/* 1 ── Hero (updated text) */}
        <HeroCommandCenter heroStats={hs} />

        {/* 2 ── Intelligence Summary Strip */}
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
          <TopPredictionsSection predictions={d.predictions || { predictions: [] }} />
        )}

        {/* 6 ── Edge Board + Tactical */}
        <EdgeBoardSection
          edges={d.edges || { edges: [] }}
          tacticalInsight={d.tacticalInsight || { primary: {}, all: [] }}
        />

        {/* 7 ── Competition Coverage (from backend) */}
        <CompetitionCoverageSection
          competitionsSupported={d.competitionsSupported || []}
          leagueCoverage={d.leagueCoverage || { leagues: [] }}
        />

        {/* 8 ── FPL Spotlight */}
        <FPLSpotlightSection fplSpotlight={d.fplSpotlight || { captains: [], valuePlayers: [] }} />

        {/* 9 ── Players */}
        <TrendingPlayersSection
          trendingPlayers={d.trendingPlayers || { items: [] }}
          xgLeaders={d.xgLeaders || { leaders: [] }}
        />

        {/* 10 ── Platform */}
        <PlatformCapabilitiesSection analyticsTerm={d.analyticsTerm || {}} />

        {/* 11 ── Accountability (backend-driven) */}
        <PredictionAccountabilitySection
          modelMetrics={mm}
          recentResults={rr}
          accountabilitySummary={acc}
        />
      </div>
    </div>
  );
}