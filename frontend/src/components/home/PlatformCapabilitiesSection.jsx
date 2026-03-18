// ═══════════════════════════════════════════════════════════
// PlatformCapabilitiesSection — News + Ground Zero + Games
// Static cards linking to real pages in App.jsx
// ═══════════════════════════════════════════════════════════
import { Link } from "react-router-dom";
import HomeSectionHeader from "./HomeSectionHeader";

export default function PlatformCapabilitiesSection() {
  return (
    <section className="hp-section">
      <HomeSectionHeader
        icon="🧠"
        iconBg="rgba(251,191,36,0.1)"
        title="Platform"
        subtitle="News intelligence, research methodology, and interactive experiences"
      />

      <div className="platform-grid">
        {/* ── News ── */}
        <Link to="/news" className="platform-card platform-card--news">
          <div className="platform-card-icon"
            style={{ background: "rgba(244,114,182,0.08)", border: "1px solid rgba(244,114,182,0.12)" }}>
            📰
          </div>
          <div className="platform-card-title">News Intelligence</div>
          <div className="platform-card-desc">
            Curated football news with analytical context. Transfer rumours,
            tactical shifts, and match-day intel filtered through a data lens.
          </div>
          <div className="platform-card-tags">
            <span className="platform-card-tag">Transfers</span>
            <span className="platform-card-tag">Tactical Shifts</span>
            <span className="platform-card-tag">Match Intel</span>
            <span className="platform-card-tag">Injury Updates</span>
          </div>
        </Link>

        {/* ── Ground Zero ── */}
        <Link to="/learn" className="platform-card platform-card--ground">
          <div className="platform-card-icon"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.12)" }}>
            🔬
          </div>
          <div className="platform-card-title">Ground Zero</div>
          <div className="platform-card-desc">
            How the platform thinks. Explore the research lab behind every prediction
            — methodology deep-dives, model transparency, and the science of forecasting.
          </div>
          <div className="platform-card-tags">
            <span className="platform-card-tag">Methodology</span>
            <span className="platform-card-tag">Research Lab</span>
            <span className="platform-card-tag">Transparency</span>
            <span className="platform-card-tag">Model Audit</span>
          </div>
        </Link>

        {/* ── Games ── */}
        <Link to="/games" className="platform-card platform-card--games">
          <div className="platform-card-icon"
            style={{ background: "rgba(251,146,60,0.08)", border: "1px solid rgba(251,146,60,0.12)" }}>
            🎮
          </div>
          <div className="platform-card-title">Games</div>
          <div className="platform-card-desc">
            Interactive football experiences and prediction challenges.
            Test your knowledge, compete with the models, and sharpen your instincts.
          </div>
          <div className="platform-card-tags">
            <span className="platform-card-tag">Prediction Challenge</span>
            <span className="platform-card-tag">Score Predictor</span>
            <span className="platform-card-tag">Mini-Games</span>
            <span className="platform-card-tag">Leaderboard</span>
          </div>
        </Link>
      </div>
    </section>
  );
}