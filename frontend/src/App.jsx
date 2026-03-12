import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar               from "./components/Navbar";
import LiveTicker           from "./components/LiveTicker";
import HomePage             from "./pages/HomePage";
import LeaguePage           from "./pages/LeaguePage";
import LeaguesPage          from "./pages/LeaguesPage";
import LivePage             from "./pages/LivePage";
import SeasonSimulator      from "./pages/SeasonSimulator";
import FplTablePage         from "./pages/FplTablePage";
import GameweekInsightsPage from "./pages/GameweekInsightsPage";
import BestTeamPage         from "./pages/BestTeamPage";
import SquadBuilderPage     from "./pages/SquadBuilderPage";
import PredictionsPage      from "./pages/PredictionsPage";
import PlayerInsightPage    from "./pages/PlayerInsightPage";
import PlayerBrowsePage     from "./pages/PlayerBrowsePage";
import MiniGamesPage        from "./pages/MiniGamesPage";
import GroundZeroPage       from "./pages/GroundZeroPage";
import NewsTrackerPage      from "./pages/NewsTrackerPage";
import TeamPage             from "./pages/TeamPage";
import MatchIntelligencePage from "./pages/MatchIntelligencePage";
import LiveMatchPage        from "./pages/LiveMatchPage";
const SLUG_MAP = {
  "premier-league":"epl","la-liga":"laliga","serie-a":"seriea","ligue-1":"ligue1",
  "epl":"epl","laliga":"laliga","seriea":"seriea","ligue1":"ligue1",
};

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <LiveTicker />
        <div className="sn-page-wrap">
          <Routes>
            <Route path="/"                   element={<HomePage />} />
            <Route path="/squad-builder"      element={<SquadBuilderPage />} />
            <Route path="/best-team"          element={<BestTeamPage />} />
            <Route path="/gameweek-insights"  element={<GameweekInsightsPage />} />
            <Route path="/player"             element={<PlayerBrowsePage />} />
            <Route path="/player/:id"         element={<PlayerInsightPage />} />
            <Route path="/fpl-table"          element={<FplTablePage />} />
            <Route path="/games"              element={<MiniGamesPage />} />
            <Route path="/learn"              element={<GroundZeroPage />} />
            <Route path="/news"               element={<NewsTrackerPage />} />
            <Route path="/predictions"
              element={<Navigate to="/predictions/premier-league" replace />} />
            <Route path="/predictions/:league"
              element={<PredictionsPage slugMap={SLUG_MAP} />} />
            <Route path="/leagues" element={<LeaguesPage />} />
            <Route path="/live"               element={<LivePage />} />
<Route path="/leagues"            element={<LeaguesPage />} />
            <Route path="/league/epl"         element={<LeaguePage league="epl" />} />
            <Route path="/league/laliga"      element={<LeaguePage league="laliga" />} />
            <Route path="/league/seriea"      element={<LeaguePage league="seriea" />} />
            <Route path="/league/ligue1"      element={<LeaguePage league="ligue1" />} />
            <Route path="/simulation/:league" element={<SeasonSimulator />} />
            <Route path="/simulation/epl"     element={<SeasonSimulator />} />
<Route path="/match/:fixtureId" element={<MatchIntelligencePage />} />
            {/* Team pages — /team/:teamId/:league e.g. /team/33/epl */}
            <Route path="/match/:fixtureId" element={<LiveMatchPage />} />
            <Route path="/team/:teamId/:league" element={<TeamPage />} />
          </Routes>
        </div>

        <footer className="site-footer">
          <span className="site-footer-text">
            <span className="footer-name">Rutej Talati</span>
            <span className="footer-sep">©</span>
            2026
            <span className="footer-sep">|</span>
            StatinSite · Sports Analytics &amp; Predictions
          </span>
        </footer>
      </div>
    </BrowserRouter>
  );
}







