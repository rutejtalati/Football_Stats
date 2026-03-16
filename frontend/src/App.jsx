import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

/* ───────────────── Components ───────────────── */

import Navbar from "./components/Navbar";
import LiveTicker from "./components/LiveTicker";

/* ───────────────── Pages ───────────────── */

import HomePage from "./pages/HomePage";
import LivePage from "./pages/LivePage";

import LeaguesPage from "./pages/LeaguesPage";
import LeaguePage from "./pages/LeaguePage";

import PredictionsPage from "./pages/PredictionsPage";

import SeasonSimulator from "./pages/SeasonSimulator";

import SquadBuilderPage from "./pages/SquadBuilderPage";
import BestTeamPage from "./pages/BestTeamPage";
import GameweekInsightsPage from "./pages/GameweekInsightsPage";

import PlayerBrowsePage from "./pages/PlayerBrowsePage";
import PlayerInsightPage from "./pages/PlayerInsightPage";
import PlayerProfilePage from "./pages/PlayerProfile";

import TeamPage from "./pages/TeamPage";

import FplTablePage from "./pages/FplTablePage";

import MiniGamesPage from "./pages/MiniGamesPage";

import GroundZeroPage from "./pages/GroundZeroPage";

import NewsTrackerPage from "./pages/NewsTrackerPage";

import MatchIntelligencePage from "./pages/MatchIntelligencePage";

import CaptaincyPage            from "./pages/CaptaincyPage";
import FixtureDifficultyHeatmap from "./pages/FixtureDifficultyHeatmap";
import TransferPlannerPage      from "./pages/TransferPlannerPage";
import DifferentialFinderPage   from "./pages/DifferentialFinderPage";
import BestXIPage               from "./pages/BestXIPage";


/* ───────────────── League slug mapping ───────────────── */

const SLUG_MAP = {
  "premier-league": "epl",
  "la-liga": "laliga",
  "serie-a": "seriea",
  "ligue-1": "ligue1",

  "epl": "epl",
  "laliga": "laliga",
  "seriea": "seriea",
  "ligue1": "ligue1",
};


/* ───────────────── App Root ───────────────── */

export default function App() {
  return (
    <BrowserRouter>

      <div className="app-shell">

        {/* Global Navigation */}
        <Navbar />

        {/* Live ticker bar */}
        <LiveTicker />

        {/* Main page container */}
        <div className="sn-page-wrap">

          <Routes>

            {/* ───── Home ───── */}
            <Route path="/" element={<HomePage />} />

            {/* ───── Live Centre ───── */}
            <Route path="/live" element={<LivePage />} />

            {/* ───── Predictions ───── */}
            <Route
              path="/predictions"
              element={<Navigate to="/predictions/premier-league" replace />}
            />

            <Route
              path="/predictions/:league"
              element={<PredictionsPage slugMap={SLUG_MAP} />}
            />

            {/* ───── Leagues ───── */}
            <Route path="/leagues" element={<LeaguesPage />} />

            <Route path="/league/epl" element={<LeaguePage league="epl" />} />
            <Route path="/league/laliga" element={<LeaguePage league="laliga" />} />
            <Route path="/league/seriea" element={<LeaguePage league="seriea" />} />
            <Route path="/league/ligue1" element={<LeaguePage league="ligue1" />} />

            {/* ───── Season Simulation ───── */}
            <Route path="/simulation/:league" element={<SeasonSimulator />} />

            {/* ───── Fantasy / FPL Tools ───── */}
            <Route path="/squad-builder"       element={<SquadBuilderPage />} />
            <Route path="/best-team"           element={<BestTeamPage />} />
            <Route path="/gameweek-insights"   element={<GameweekInsightsPage />} />
            <Route path="/fpl-table"           element={<FplTablePage />} />
            <Route path="/captaincy"           element={<CaptaincyPage />} />
            <Route path="/fixture-difficulty"  element={<FixtureDifficultyHeatmap />} />
            <Route path="/transfer-planner"    element={<TransferPlannerPage />} />
            <Route path="/differentials"       element={<DifferentialFinderPage />} />
            <Route path="/best-xi"             element={<BestXIPage />} />

            {/* ───── Player Pages ───── */}
            <Route path="/player" element={<PlayerBrowsePage />} />
            <Route path="/player/:id" element={<PlayerInsightPage />} />
            <Route path="/players" element={<PlayerProfilePage />} />
            {/* ───── Team Pages ───── */}
            <Route path="/team/:teamId/:league" element={<TeamPage />} />

            {/* ───── Match Intelligence ───── */}
            <Route path="/match/:fixtureId"         element={<MatchIntelligencePage />} />
            <Route path="/match-preview/:fixtureId" element={<MatchIntelligencePage />} />

            {/* ───── Extra Pages ───── */}
            <Route path="/games" element={<MiniGamesPage />} />
            <Route path="/learn" element={<GroundZeroPage />} />
            <Route path="/news" element={<NewsTrackerPage />} />

          </Routes>

        </div>

        {/* ───── Footer ───── */}
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