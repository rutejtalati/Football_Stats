import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

/* ───────────────── Components ───────────────── */
import Navbar from "./components/Navbar";
import LiveTicker from "./components/LiveTicker";

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
import TransferPlannerPage from "./pages/TransferPlannerPage";
import GroundZeroPage from "./pages/GroundZeroPage";
import CaptaincyPage from "./pages/CaptaincyPage";
import BestTeamPage from "./pages/BestTeamPage";
import FplTablePage from "./pages/FplTablePage";
import GameweekInsightsPage from "./pages/GameweekInsightsPage";
import DifferentialFinderPage from "./pages/DifferentialFinderPage";
import FixtureDifficultyHeatmap from "./pages/FixtureDifficultyHeatmap";

/* ── Stub for pages not yet built ── */
const ComingSoon = ({ name }) => (
  <div style={{minHeight:"60vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,background:"#000810"}}>
    <div style={{fontSize:32,fontWeight:900,color:"rgba(255,255,255,0.15)",fontFamily:"'Sora',sans-serif"}}>{name}</div>
    <div style={{fontSize:13,color:"rgba(255,255,255,0.25)"}}>Coming soon</div>
  </div>
);

/* ───────────────── League slug mapping ───────────────── */
const SLUG_MAP = {
  "premier-league":    "epl",
  "la-liga":           "laliga",
  "serie-a":           "seriea",
  "ligue-1":           "ligue1",
  "bundesliga":        "bundesliga",
  "champions-league":  "ucl",
  "europa-league":     "uel",
  "conference-league": "uecl",
  "fa-cup":            "facup",
  "epl":        "epl",
  "laliga":     "laliga",
  "seriea":     "seriea",
  "ligue1":     "ligue1",
  "ucl":        "ucl",
  "uel":        "uel",
  "uecl":       "uecl",
  "facup":      "facup",
};

/* ───────────────── App Root ───────────────── */
export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">

        <Navbar />
        <LiveTicker />

        <div className="sn-page-wrap">
          <Routes>

            {/* Home */}
            <Route path="/" element={<HomePage />} />

            {/* Live */}
            <Route path="/live" element={<LivePage />} />

            {/* Predictions */}
            <Route path="/predictions" element={<Navigate to="/predictions/premier-league" replace />} />
            <Route path="/ucl"   element={<Navigate to="/predictions/champions-league" replace />} />
            <Route path="/uel"   element={<Navigate to="/predictions/europa-league" replace />} />
            <Route path="/uecl"  element={<Navigate to="/predictions/conference-league" replace />} />
            <Route path="/facup" element={<Navigate to="/predictions/fa-cup" replace />} />
            <Route path="/predictions/:league" element={<PredictionsPage slugMap={SLUG_MAP} />} />

            {/* Leagues */}
            <Route path="/leagues"           element={<ComingSoon name="Leagues" />} />
            <Route path="/league/epl"        element={<ComingSoon name="Premier League" />} />
            <Route path="/league/laliga"     element={<ComingSoon name="La Liga" />} />
            <Route path="/league/seriea"     element={<ComingSoon name="Serie A" />} />
            <Route path="/league/ligue1"     element={<ComingSoon name="Ligue 1" />} />

            {/* Season Sim */}
            <Route path="/simulation/:league" element={<SeasonSimulator />} />

            {/* FPL Tools */}
            <Route path="/squad-builder"      element={<SquadBuilderPage />} />
            <Route path="/best-team"          element={<BestTeamPage />} />
            <Route path="/gameweek-insights"  element={<GameweekInsightsPage />} />
            <Route path="/fpl-table"          element={<FplTablePage />} />
            <Route path="/captaincy"          element={<CaptaincyPage />} />
            <Route path="/fixture-difficulty" element={<FixtureDifficultyHeatmap />} />
            <Route path="/transfer-planner"   element={<TransferPlannerPage />} />
            <Route path="/differentials"      element={<DifferentialFinderPage />} />

            {/* Players */}
            <Route path="/player"     element={<PlayerInsightPage />} />
            <Route path="/player/:id" element={<PlayerInsightPage />} />
            <Route path="/players"    element={<ComingSoon name="Player Profiles" />} />

            {/* Teams */}
            <Route path="/team/:teamId/:league" element={<TeamPage />} />

            {/* Match */}
            <Route path="/match/:fixtureId"         element={<MatchIntelligencePage />} />
            <Route path="/match-preview/:fixtureId" element={<MatchIntelligencePage />} />

            {/* Misc */}
            <Route path="/games" element={<MiniGamesPage />} />
            <Route path="/learn" element={<GroundZeroPage />} />
            <Route path="/news"  element={<NewsTrackerPage />} />

          </Routes>
        </div>

        <footer className="site-footer">
          <span className="site-footer-text">
            <span className="footer-name">Rutej Talati</span>
            <span className="footer-sep">©</span>
            2026
            <span className="footer-sep"> | </span>
            StatinSite · Sports Analytics & Predictions
          </span>
        </footer>

      </div>
    </BrowserRouter>
  );
}