import { Link } from "react-router-dom";
import HomeSectionHeader from "./HomeSectionHeader";

export default function PlatformCapabilitiesSection({ analyticsTerm = {} }) {
  return (
    <section className="hp-section">
      <HomeSectionHeader icon="🧠" iconBg="rgba(251,191,36,0.1)" title="Platform"
        subtitle="News, methodology, and interactive experiences" />

      <div className="platform-grid">
        <Link to="/news" className="platform-card platform-card--news">
          <div className="platform-card-icon" style={{ background: "rgba(244,114,182,0.06)", border: "1px solid rgba(244,114,182,0.1)" }}>📰</div>
          <div className="platform-card-title">News Intelligence</div>
          <div className="platform-card-desc">Curated football news with analytical context — transfers, tactical shifts, match-day intel.</div>
          <div className="platform-card-tags">
            <span className="platform-card-tag">Transfers</span>
            <span className="platform-card-tag">Tactical</span>
            <span className="platform-card-tag">Injuries</span>
          </div>
        </Link>

        <Link to="/learn" className="platform-card platform-card--ground">
          <div className="platform-card-icon" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.1)" }}>🔬</div>
          <div className="platform-card-title">Ground Zero</div>
          <div className="platform-card-desc">How the platform thinks — methodology deep-dives, model transparency, research lab.</div>
          <div className="platform-card-tags">
            <span className="platform-card-tag">Methodology</span>
            <span className="platform-card-tag">Research</span>
            <span className="platform-card-tag">Audit</span>
          </div>
        </Link>

        <Link to="/games" className="platform-card platform-card--games">
          <div className="platform-card-icon" style={{ background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.1)" }}>🎮</div>
          <div className="platform-card-title">Games</div>
          <div className="platform-card-desc">Interactive prediction challenges — test your knowledge, compete with the models.</div>
          <div className="platform-card-tags">
            <span className="platform-card-tag">Predict</span>
            <span className="platform-card-tag">Challenge</span>
            <span className="platform-card-tag">Compete</span>
          </div>
        </Link>
      </div>

      {/* Analytics term of the day */}
      {analyticsTerm.term && (
        <Link to="/learn" style={{ textDecoration: "none", color: "inherit", display: "block", marginTop: 12 }}>
          <div className="hp-card" style={{
            display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
            borderLeft: `3px solid ${analyticsTerm.col || "#4f9eff"}`, cursor: "pointer",
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 900, color: analyticsTerm.col || "#4f9eff", whiteSpace: "nowrap" }}>
              {analyticsTerm.short || analyticsTerm.term}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, color: "#e8f0ff" }}>
                {analyticsTerm.term}
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "#4a6a8a", lineHeight: 1.4,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {analyticsTerm.definition}
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#4a6a8a", whiteSpace: "nowrap" }}>
              Learn →
            </div>
          </div>
        </Link>
      )}
    </section>
  );
}