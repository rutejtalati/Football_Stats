/**
 * server.js  —  StatinSite SSR head injection
 * ─────────────────────────────────────────────
 * Run with: node server.js (production)
 * or:       node server.js dev  (wraps vite dev server)
 *
 * What this does:
 *   - Serves your existing Vite build from /dist unchanged for users
 *   - For Googlebot / crawlers: injects real <title> + <meta> into
 *     the HTML before serving, so every page has unique crawlable content
 *   - Zero changes to any React component required
 *   - Works on Vercel via vercel.json, Railway, or any Node host
 *
 * Deploy: add "start": "node server.js" to package.json scripts
 */

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev     = process.argv[2] === "dev";
const PORT      = process.env.PORT || 3000;

// ── Per-route SEO metadata ─────────────────────────────────────────────────
// Add every static route here. Dynamic routes (match/:id) don't need entries
// because Googlebot won't crawl them (blocked in robots.txt).
const ROUTE_META = {
  "/": {
    title: "StatinSite — Football Intelligence | Predictions, FPL & xG Analysis",
    description: "Dixon-Coles xG model predictions, FPL captain picks, ELO ratings and live scores across 9 competitions. Data-driven football intelligence.",
    og_type: "website",
  },
  "/live": {
    title: "Live Football Scores & Fixtures — StatinSite",
    description: "Real-time football scores, live match events and minute-by-minute tracking across the Premier League, Champions League and more.",
  },
  "/news": {
    title: "Football News, Transfers & Intelligence — StatinSite",
    description: "Latest football transfers, injury news and tactical analysis powered by StatinSite's intelligence feed.",
  },
  "/leagues": {
    title: "Football Leagues & Competitions — StatinSite",
    description: "Predictions, standings and analysis across 9 football competitions including the Premier League, La Liga, Bundesliga and Champions League.",
  },
  "/learn": {
    title: "How StatinSite Works — ELO, Dixon-Coles & xG Explained",
    description: "Learn how StatinSite's football prediction models work: Dixon-Coles Poisson, ELO ratings, expected goals (xG) and Monte Carlo simulation.",
  },
  "/games": {
    title: "Football Mini Games & Score Predictor — StatinSite",
    description: "Play the StatinSite score predictor, football quizzes and weekly prediction challenges.",
  },
  "/player": {
    title: "Football Player Stats & xG Profiles — StatinSite",
    description: "Browse 500+ player profiles with expected goals (xG), goal contributions per 90 and form ratings across Europe's top leagues.",
  },

  // ── Predictions ──
  "/predictions/premier-league": {
    title: "Premier League Predictions Today — StatinSite xG Model",
    description: "Today's Premier League match predictions using Dixon-Coles xG modelling and ELO ratings. Win probabilities, predicted scores and model confidence for every EPL fixture.",
    og_type: "article",
  },
  "/predictions/la-liga": {
    title: "La Liga Predictions Today — StatinSite xG Model",
    description: "La Liga match predictions using Dixon-Coles Poisson modelling. Win probabilities and predicted scores for every fixture this gameweek.",
  },
  "/predictions/bundesliga": {
    title: "Bundesliga Predictions Today — StatinSite xG Model",
    description: "Bundesliga match predictions powered by xG modelling and ELO ratings. Win probabilities for every fixture.",
  },
  "/predictions/serie-a": {
    title: "Serie A Predictions Today — StatinSite xG Model",
    description: "Serie A match predictions using Dixon-Coles and ELO. Predicted scores and win probabilities for every fixture.",
  },
  "/predictions/ligue-1": {
    title: "Ligue 1 Predictions Today — StatinSite xG Model",
    description: "Ligue 1 match predictions powered by xG and ELO ratings. Win probabilities and predicted scores.",
  },
  "/predictions/champions-league": {
    title: "Champions League Predictions — StatinSite xG Model",
    description: "UEFA Champions League predictions using Dixon-Coles xG modelling and ELO ratings. Win probabilities and predicted scores.",
  },
  "/predictions/europa-league": {
    title: "Europa League Predictions — StatinSite",
    description: "UEFA Europa League match predictions powered by StatinSite's xG model.",
  },
  "/predictions/conference-league": {
    title: "Conference League Predictions — StatinSite",
    description: "UEFA Conference League predictions using StatinSite's Dixon-Coles model.",
  },
  "/predictions/fa-cup": {
    title: "FA Cup Predictions — StatinSite xG Model",
    description: "FA Cup match predictions powered by xG modelling and ELO ratings.",
  },
  "/predictions/world-cup": {
    title: "World Cup Predictions — StatinSite",
    description: "World Cup match predictions using StatinSite's football intelligence models.",
  },
  "/predictions/euros": {
    title: "European Championship Predictions — StatinSite",
    description: "Euro match predictions powered by Dixon-Coles xG modelling and ELO.",
  },
  "/predictions/nations-league": {
    title: "Nations League Predictions — StatinSite",
    description: "UEFA Nations League predictions using StatinSite's xG model.",
  },
  "/predictions/copa-america": {
    title: "Copa América Predictions — StatinSite",
    description: "Copa América match predictions powered by StatinSite's football intelligence.",
  },

  // ── League standings ──
  "/league/epl": {
    title: "Premier League Standings & Table 2025/26 — StatinSite",
    description: "Live Premier League table, form guide, ELO power rankings and title race analysis for the 2025/26 season.",
  },
  "/league/laliga": {
    title: "La Liga Standings & Table 2025/26 — StatinSite",
    description: "Live La Liga table, form guide and ELO power rankings for the 2025/26 season.",
  },
  "/league/seriea": {
    title: "Serie A Standings & Table 2025/26 — StatinSite",
    description: "Live Serie A table and power rankings for the 2025/26 season.",
  },
  "/league/ligue1": {
    title: "Ligue 1 Standings & Table 2025/26 — StatinSite",
    description: "Live Ligue 1 table and form guide for the 2025/26 season.",
  },

  // ── Season simulator ──
  "/simulation/epl": {
    title: "Premier League Season Simulator 2025/26 — StatinSite Monte Carlo",
    description: "Simulate the rest of the 2025/26 Premier League season using 8,000 Monte Carlo runs. Title, top-4 and relegation probabilities for every team.",
  },
  "/simulation/laliga": {
    title: "La Liga Season Simulator 2025/26 — StatinSite Monte Carlo",
    description: "Simulate the La Liga title race with 8,000 Monte Carlo runs. Win, top-4 and relegation probabilities.",
  },
  "/simulation/bundesliga": {
    title: "Bundesliga Season Simulator 2025/26 — StatinSite",
    description: "Monte Carlo simulation of the 2025/26 Bundesliga season. Title and relegation probabilities.",
  },
  "/simulation/seriea": {
    title: "Serie A Season Simulator 2025/26 — StatinSite",
    description: "Monte Carlo simulation of the Serie A title race.",
  },
  "/simulation/ligue1": {
    title: "Ligue 1 Season Simulator 2025/26 — StatinSite",
    description: "Monte Carlo simulation of the Ligue 1 title race.",
  },

  // ── FPL tools ──
  "/fpl/best-xi": {
    title: "Best XI for Fantasy Premier League This Gameweek — StatinSite",
    description: "StatinSite's optimal Fantasy Premier League starting XI built from xG data, ELO ratings, form and fixture difficulty. Best 11 players for this gameweek.",
  },
  "/fpl/gw-guide": {
    title: "Fantasy Premier League GW Guide — Tips & Analysis — StatinSite",
    description: "Complete Fantasy Premier League gameweek guide: best XI, transfer recommendations, captain picks, chip strategy and differential analysis powered by xG and ELO.",
  },
  "/fpl/captain-picks": {
    title: "FPL Captain Picks This Gameweek — StatinSite xG Algorithm",
    description: "Data-driven Fantasy Premier League captain picks based on xG, ELO, form and fixture difficulty. Differential and safe options for this gameweek.",
  },
  "/fpl/fixture-ticker": {
    title: "FPL Fixture Ticker & Difficulty Heatmap 2025/26 — StatinSite",
    description: "Colour-coded Fantasy Premier League fixture difficulty rating heatmap for all 20 Premier League teams across the next 10 gameweeks. Plan your transfers ahead.",
  },
  "/fpl/differential-picks": {
    title: "FPL Differential Picks This Gameweek — Low Ownership — StatinSite",
    description: "Best Fantasy Premier League differential picks under 10% ownership for this gameweek. xG and ELO-backed selections to gain rank on your rivals.",
  },
  "/fpl/transfers": {
    title: "FPL Transfer Targets This Gameweek — StatinSite",
    description: "Best Fantasy Premier League transfer targets by position, value and upcoming fixture difficulty. Plan your transfers using StatinSite's xG model.",
  },
  "/fpl/stats": {
    title: "Fantasy Premier League GW Stats — StatinSite",
    description: "Deep Fantasy Premier League gameweek stats: top scorers, value players, form rankings and xG leaders for this week.",
  },
  "/fpl/standings": {
    title: "Fantasy Premier League Points Table & Standings — StatinSite",
    description: "Live Fantasy Premier League points table and gameweek standings powered by StatinSite.",
  },
  "/fpl/squad-builder": {
    title: "Fantasy Premier League Squad Builder — Build Your 15-Man Team — StatinSite",
    description: "Build and optimise your Fantasy Premier League squad under budget using StatinSite's player data, form scores and fixture ratings.",
  },

  // ── Old paths kept as fallback (redirected in React but server still sees them briefly) ──
  "/best-team":        { title: "Best XI for Fantasy Premier League — StatinSite", description: "Optimal Fantasy Premier League starting XI powered by xG and ELO." },
  "/fpl-intelligence": { title: "Fantasy Premier League GW Guide — StatinSite",   description: "Complete Fantasy Premier League gameweek guide and tips." },
  "/captaincy":        { title: "FPL Captain Picks — StatinSite",                 description: "Data-driven Fantasy Premier League captain picks." },
  "/fpl/fixtures":     { title: "FPL Fixture Ticker — StatinSite",                description: "Fantasy Premier League fixture difficulty heatmap." },
  "/differentials":    { title: "FPL Differential Picks — StatinSite",            description: "Low-ownership Fantasy Premier League picks." },
  "/transfer-planner": { title: "FPL Transfer Targets — StatinSite",              description: "Best Fantasy Premier League transfers this gameweek." },
  "/gameweek-insights":{ title: "FPL GW Stats — StatinSite",                      description: "Fantasy Premier League gameweek stats and analysis." },
  "/fpl-table":        { title: "FPL Standings — StatinSite",                     description: "Fantasy Premier League points table." },
  "/squad-builder":    { title: "FPL Squad Builder — StatinSite",                 description: "Build your Fantasy Premier League squad." },
};

const DEFAULT_META = {
  title: "StatinSite — Football Intelligence",
  description: "Dixon-Coles xG model predictions, FPL tools and ELO ratings across 9 football competitions.",
  og_type: "website",
  og_image: "https://www.statinsite.com/og-image.png",
  twitter_card: "summary_large_image",
};

// ── Build the <head> injection string ─────────────────────────────────────
function buildHead(route) {
  const meta = { ...DEFAULT_META, ...(ROUTE_META[route] || {}) };
  const url  = `https://www.statinsite.com${route}`;
  return `
    <title>${meta.title}</title>
    <meta name="description" content="${meta.description}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type"        content="${meta.og_type || "website"}" />
    <meta property="og:title"       content="${meta.title}" />
    <meta property="og:description" content="${meta.description}" />
    <meta property="og:url"         content="${url}" />
    <meta property="og:image"       content="${meta.og_image || DEFAULT_META.og_image}" />
    <meta property="og:site_name"   content="StatinSite" />
    <meta name="twitter:card"        content="${meta.twitter_card || "summary_large_image"}" />
    <meta name="twitter:title"       content="${meta.title}" />
    <meta name="twitter:description" content="${meta.description}" />
    <meta name="twitter:image"       content="${meta.og_image || DEFAULT_META.og_image}" />`.trim();
}

// ── Express app ───────────────────────────────────────────────────────────
const app = express();

if (isDev) {
  // In dev: proxy to Vite dev server, inject head into HTML responses
  const { createProxyMiddleware } = await import("http-proxy-middleware");
  app.use(
    "/",
    createProxyMiddleware({
      target: "http://localhost:5173",
      changeOrigin: true,
      selfHandleResponse: true,
      on: {
        proxyRes: (proxyRes, req, res) => {
          const ct = proxyRes.headers["content-type"] || "";
          if (!ct.includes("text/html")) {
            proxyRes.pipe(res);
            return;
          }
          let body = "";
          proxyRes.on("data", chunk => body += chunk);
          proxyRes.on("end", () => {
            const route  = req.path;
            const head   = buildHead(route);
            const output = body.replace("</head>", `${head}\n</head>`);
            res.setHeader("Content-Type", "text/html");
            res.end(output);
          });
        },
      },
    })
  );
} else {
  // In production: serve Vite's /dist/client build with head injection
  const distPath = path.join(__dirname, "dist");
  const indexRaw = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");

  // Serve static assets (JS, CSS, images) — no transformation needed
  app.use(express.static(distPath, { index: false }));

  // All routes — inject head and return index.html
  app.get("*", (req, res) => {
    const route  = req.path;
    const head   = buildHead(route);
    const output = indexRaw.replace("</head>", `${head}\n</head>`);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300"); // 5 min cache
    res.end(output);
  });
}

app.listen(PORT, () => {
  console.log(`StatinSite server running on http://localhost:${PORT}`);
});