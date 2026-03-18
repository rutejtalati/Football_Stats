// ═══════════════════════════════════════════════════════════
// TopPredictionsSection — Grid of top prediction cards
// Prop: predictions = { predictions: [mapPrediction output], league }
// ═══════════════════════════════════════════════════════════
import { Link } from "react-router-dom";
import { formatXg } from "../../utils/homeDataMappers";
import HomeSectionHeader from "./HomeSectionHeader";

export default function TopPredictionsSection({ predictions = { predictions: [] } }) {
  const preds = predictions.predictions || [];
  if (preds.length === 0) return null;

  // Skip first one if it's used in FeaturedMatchPanel
  const display = preds.slice(1, 7);
  if (display.length === 0) return null;

  return (
    <section className="hp-section">
      <HomeSectionHeader
        icon="📊"
        iconBg="rgba(96,165,250,0.1)"
        title="Top Predictions"
        subtitle="Highest-confidence upcoming match forecasts"
        linkTo="/predictions/premier-league"
        linkLabel="All Predictions"
      />

      <div className="predictions-grid">
        {display.map((p, i) => (
          <Link
            key={p.fixtureId || i}
            to={p.fixtureId ? `/match/${p.fixtureId}` : `/predictions/${p.leagueCode || "premier-league"}`}
            className="hp-card pred-card"
          >
            <div className="pred-card-top">
              <span className="pred-card-league">{p.league || p.kickoff}</span>
              <span className={`pred-card-conf pred-card-conf--${p.conf}`}>
                {p.confPct}%
              </span>
            </div>

            <div className="pred-card-matchup">
              <div className="pred-card-side">
                {p.homeLogo && <img src={p.homeLogo} alt="" loading="lazy" />}
                <span className="pred-card-side-name">{p.home}</span>
              </div>
              <span className="pred-card-vs">VS</span>
              <div className="pred-card-side">
                {p.awayLogo && <img src={p.awayLogo} alt="" loading="lazy" />}
                <span className="pred-card-side-name">{p.away}</span>
              </div>
            </div>

            {/* Probability bar */}
            <div className="pred-card-bar">
              <div className="pred-card-bar-seg pred-card-bar-seg--h" style={{ flex: p.homeProb }} />
              <div className="pred-card-bar-seg pred-card-bar-seg--d" style={{ flex: p.draw }} />
              <div className="pred-card-bar-seg pred-card-bar-seg--a" style={{ flex: p.awayProb }} />
            </div>

            <div className="pred-card-probs">
              <span><b>{p.homeProb}%</b> H</span>
              <span><b>{p.draw}%</b> D</span>
              <span><b>{p.awayProb}%</b> A</span>
            </div>

            {/* Hover reveal: xG, predicted score, date */}
            <div className="hp-card-reveal">
              <div className="pred-reveal">
                {p.xgHome !== null && (
                  <div className="pred-reveal-item">
                    <div className="label">xG Home</div>
                    <div className="value">{formatXg(p.xgHome)}</div>
                  </div>
                )}
                {p.xgAway !== null && (
                  <div className="pred-reveal-item">
                    <div className="label">xG Away</div>
                    <div className="value">{formatXg(p.xgAway)}</div>
                  </div>
                )}
                {p.score && p.score !== "—" && (
                  <div className="pred-reveal-item">
                    <div className="label">Predicted</div>
                    <div className="value">{p.score}</div>
                  </div>
                )}
                {p.kickoff && (
                  <div className="pred-reveal-item">
                    <div className="label">Date</div>
                    <div className="value" style={{ fontSize: 12 }}>{p.kickoff}</div>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}