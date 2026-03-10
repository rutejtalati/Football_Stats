import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar               from "./components/Navbar";
import HomePage             from "./pages/HomePage";
import LeaguePage           from "./pages/LeaguePage";
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

const SLUG_MAP = {
  "premier-league":"epl","la-liga":"laliga","serie-a":"seriea","ligue-1":"ligue1",
  "epl":"epl","laliga":"laliga","seriea":"seriea","ligue1":"ligue1",
};


/* ── Global mobile CSS injected via App ───── */
const GLOBAL_MOBILE_CSS = `
  /* Hide bottom tabs on desktop */
  @media (min-width: 641px) {
    .sn-bottom-tabs { display: none !important; }
  }
  /* Add bottom padding on mobile so content isn't hidden behind tab bar */
  @media (max-width: 640px) {
    .sn-page-wrap { padding-bottom: 80px !important; }
    .sn-nav { display: none !important; }
  }
  /* Safe area support for notched phones */
  .sn-bottom-tabs {
    padding-bottom: max(6px, env(safe-area-inset-bottom));
  }
  /* Prevent horizontal scroll globally */
  body { overflow-x: hidden; }
  * { box-sizing: border-box; }
  /* Better tap targets */
  @media (max-width: 640px) {
    button, a { min-height: 36px; }
  }
`;

function GlobalMobileStyles() {
  return <style>{GLOBAL_MOBILE_CSS}</style>;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <GlobalMobileStyles />
        <Navbar />
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
            <Route path="/league/epl"         element={<LeaguePage league="epl" />} />
            <Route path="/league/laliga"      element={<LeaguePage league="laliga" />} />
            <Route path="/league/seriea"      element={<LeaguePage league="seriea" />} />
            <Route path="/league/ligue1"      element={<LeaguePage league="ligue1" />} />
            <Route path="/simulation/:league" element={<SeasonSimulator />} />
            <Route path="/simulation/epl"     element={<SeasonSimulator />} />
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