import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

/* ───────────────── Components ───────────────── */
import Navbar from "./components/Navbar";

/* ───────────────── Pages ───────────────── */
import HomePage from "./pages/HomePage";
import LivePage from "./pages/LivePage";
import PredictionsPage from "./pages/PredictionsPage";
import SeasonSimulator from "./pages/SeasonSimulator";
import SquadBuilderPage from "./pages/SquadBuilderPage";
import PlayerBrowsePage from "./pages/PlayerBrowsePage";
import PlayerInsightPage from "./pages/PlayerInsightPage";
import TeamPage from "./pages/TeamPage";
import MiniGamesPage from "./pages/MiniGamesPage";
import NewsTrackerPage from "./pages/NewsTrackerPage";
import MatchIntelligencePage from "./pages/MatchIntelligencePage";
import LiveMatchPage from "./pages/LiveMatchPage";
import TransferPlannerPage from "./pages/TransferPlannerPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import CaptaincyPage from "./pages/CaptaincyPage";
import BestTeamPage from "./pages/BestTeamPage";
import FplTablePage from "./pages/FplTablePage";
import GameweekInsightsPage from "./pages/GameweekInsightsPage";
import DifferentialFinderPage from "./pages/DifferentialFinderPage";
import FixtureDifficultyHeatmap from "./pages/FixtureDifficultyHeatmap";
import LeaguesPage from "./pages/LeaguesPage";

/* ── Stub for pages not yet built ── */
const ComingSoon = ({ name }) => (
  <div style={{minHeight:"60vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,background:"#080808"}}>
    <div style={{fontSize:28,fontFamily:"'Inter',sans-serif",fontWeight:700,letterSpacing:"-.02em",color:"rgba(255,255,255,.2)"}}>{name}</div>
    <div style={{fontSize:11,color:"rgba(255,255,255,.12)",fontFamily:"'Inter',sans-serif",letterSpacing:".14em",textTransform:"uppercase"}}>Coming soon</div>
  </div>
);

/* ── Full-width bottom bar footer ── */
function SiteFooter() {
  return (
    <footer className="sn-site-footer">
      <style>{`
        .sn-site-footer {
          position: relative;
          z-index: 10;
          flex-shrink: 0;
          background: rgba(255,255,255,0.025);
          border-top: 0.5px solid rgba(255,255,255,0.08);
          font-family: 'Inter', system-ui, sans-serif;
        }
        @media (max-width: 820px) {
          .sn-site-footer { margin-bottom: 64px; }
        }
        .sn-footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 0 28px;
          height: 52px;
          max-width: 100%;
        }
        .sn-footer-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .sn-footer-brand-name {
          font-size: 13px;
          font-weight: 700;
          color: rgba(255,255,255,0.7);
          letter-spacing: -0.03em;
        }
        .sn-footer-tagline {
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          letter-spacing: 0.01em;
        }
        .sn-footer-built {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: rgba(255,255,255,0.04);
          border: 0.5px solid rgba(255,255,255,0.09);
          border-radius: 999px;
          flex-shrink: 0;
        }
        .sn-footer-built-label {
          font-size: 10px;
          color: rgba(255,255,255,0.28);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .sn-footer-built-name {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.75);
        }
        .sn-footer-copy {
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          flex-shrink: 0;
          white-space: nowrap;
        }
        @media (max-width: 600px) {
          .sn-footer-tagline { display: none; }
          .sn-footer-copy    { display: none; }
          .sn-footer-inner   { justify-content: space-between; }
        }
      `}</style>
      <div className="sn-footer-inner">

        {/* Brand */}
        <div className="sn-footer-brand">
          <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
            <rect x="4" y="3"  width="14" height="3.5" rx="1.75" fill="#0a84ff"/>
            <rect x="4" y="9"  width="10" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.65"/>
            <rect x="4" y="15" width="14" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.4"/>
            <rect x="4" y="21" width="7"  height="3.5" rx="1.75" fill="#0a84ff" opacity="0.22"/>
            <rect x="20" y="15" width="3" height="10"  rx="1.5"  fill="#30d158"/>
          </svg>
          <span className="sn-footer-brand-name">StatinSite</span>
          <span className="sn-footer-tagline">Football Intelligence · ELO · Dixon-Coles · xG</span>
        </div>

        {/* Built by pill */}
        <div className="sn-footer-built">
          <span className="sn-footer-built-label">Built by</span>
          <span className="sn-footer-built-name">Rutej Talati</span>
        </div>

        {/* Copyright */}
        <span className="sn-footer-copy">© {new Date().getFullYear()} StatinSite</span>

      </div>
    </footer>
  );
}

/* ───────────────── League slug mapping ───────────────── */
const SLUG_MAP = {
  "premier-league":"epl","la-liga":"laliga","serie-a":"seriea","ligue-1":"ligue1",
  "bundesliga":"bundesliga","champions-league":"ucl","europa-league":"uel",
  "conference-league":"uecl","fa-cup":"facup",
  "epl":"epl","laliga":"laliga","seriea":"seriea","ligue1":"ligue1",
  "ucl":"ucl","uel":"uel","uecl":"uecl","facup":"facup",
  // International
  "wcq-uefa":"wcq_uefa","wcq-conmebol":"wcq_conmebol","wcq-concacaf":"wcq_concacaf",
  "wcq-caf":"wcq_caf","wcq-afc":"wcq_afc",
  "nations-league":"nations_league","euros":"euro","euro-qual":"euro_q",
  "afcon":"afcon","copa-america":"copa_america","gold-cup":"gold_cup",
  "world-cup":"world_cup","intl-friendly":"international_friendly",
  // Pass-through codes
  "wcq_uefa":"wcq_uefa","wcq_conmebol":"wcq_conmebol","wcq_concacaf":"wcq_concacaf",
  "wcq_caf":"wcq_caf","wcq_afc":"wcq_afc",
  "nations_league":"nations_league","euro":"euro","euro_q":"euro_q",
  "copa_america":"copa_america","gold_cup":"gold_cup","world_cup":"world_cup",
  "international_friendly":"international_friendly",
};

/* ───────────────── App Root ───────────────── */
export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">

        <Navbar />

        <main className="sn-page-wrap" style={{minHeight:"100vh"}}>
          <Routes>
            <Route path="/"                          element={<HomePage />} />
            <Route path="/live"                      element={<LivePage />} />
            <Route path="/predictions"               element={<Navigate to="/predictions/premier-league" replace />} />
            <Route path="/ucl"                       element={<Navigate to="/predictions/champions-league" replace />} />
            <Route path="/uel"                       element={<Navigate to="/predictions/europa-league" replace />} />
            <Route path="/uecl"                      element={<Navigate to="/predictions/conference-league" replace />} />
            <Route path="/facup"                     element={<Navigate to="/predictions/fa-cup" replace />} />
            <Route path="/predictions/:league"       element={<PredictionsPage slugMap={SLUG_MAP} />} />
            <Route path="/leagues"                   element={<LeaguesPage />} />
            <Route path="/league/epl"                element={<ComingSoon name="Premier League" />} />
            <Route path="/league/laliga"             element={<ComingSoon name="La Liga" />} />
            <Route path="/league/seriea"             element={<ComingSoon name="Serie A" />} />
            <Route path="/league/ligue1"             element={<ComingSoon name="Ligue 1" />} />
            <Route path="/simulation/:league"        element={<SeasonSimulator />} />
            <Route path="/squad-builder"             element={<SquadBuilderPage />} />
            <Route path="/best-team"                 element={<BestTeamPage />} />
            <Route path="/gameweek-insights"         element={<GameweekInsightsPage />} />
            <Route path="/fpl-table"                 element={<FplTablePage />} />
            <Route path="/captaincy"                 element={<CaptaincyPage />} />
            <Route path="/fixture-difficulty"        element={<FixtureDifficultyHeatmap />} />
            <Route path="/transfer-planner"          element={<TransferPlannerPage />} />
            <Route path="/differentials"             element={<DifferentialFinderPage />} />
            <Route path="/player"                    element={<PlayerInsightPage />} />
            <Route path="/player/:id"                element={<PlayerInsightPage />} />
            <Route path="/players"                   element={<ComingSoon name="Player Profiles" />} />
            <Route path="/team/:teamId/:league"      element={<TeamPage />} />
            <Route path="/match/:fixtureId"          element={<LiveMatchPage />} />
            <Route path="/match-preview/:fixtureId"  element={<LiveMatchPage />} />
            <Route path="/games"                     element={<MiniGamesPage />} />
            <Route path="/learn"                     element={<HowItWorksPage />} />
            <Route path="/news"                      element={<NewsTrackerPage />} />
          </Routes>
        </main>

        <SiteFooter />

      </div>
    </BrowserRouter>
  );
}