// ═══════════════════════════════════════════════════════════
// CompetitionCoverageSection — 9 competitions from backend
// competitionsSupported: [{ code, name, slug, country, color }]
// ═══════════════════════════════════════════════════════════
import { Link } from "react-router-dom";
import HomeSectionHeader from "./HomeSectionHeader";

const EMOJI_MAP = {
  epl: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", laliga: "🇪🇸", seriea: "🇮🇹", bundesliga: "🇩🇪", ligue1: "🇫🇷",
  ucl: "🏆", uel: "🏆", uecl: "🏆", facup: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
};

export default function CompetitionCoverageSection({
  competitionsSupported = [],
  leagueCoverage = { leagues: [] },
}) {
  // Prefer backend competitions; fall back to leagueCoverage for backward compat
  const comps = competitionsSupported.length > 0
    ? competitionsSupported
    : (leagueCoverage.leagues || []).map((lg) => ({
        code: lg.code, name: lg.name, slug: lg.code,
        country: lg.country || "", color: lg.color || "#4f9eff",
      }));

  if (comps.length === 0) return null;

  return (
    <section className="hp-section">
      <HomeSectionHeader icon="🌍" iconBg="rgba(0,224,158,0.1)"
        title={`${comps.length} Competitions`}
        subtitle="Predictions and analysis across leagues and cups" />

      <div className="comp-grid">
        {comps.map((c) => (
          <Link key={c.code} to={`/predictions/${c.slug}`}
            className="hp-card comp-card" style={{ "--comp-color": c.color }}>
            <div className="comp-card-emoji">{EMOJI_MAP[c.code] || "⚽"}</div>
            <div className="comp-card-name">{c.name}</div>
            <div className="comp-card-sub">{c.country}</div>
            <div className="comp-card-bar" />
            <div className="hp-card-reveal">
              <div style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 9,
                color: c.color, opacity: 0.8 }}>
                View predictions →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}