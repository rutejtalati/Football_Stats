import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Set theme synchronously before first render to prevent any flash of light theme.
// Defaults to dark; only uses light if the user explicitly saved that preference.
(function () {
  const theme = localStorage.getItem("sn-theme") === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", theme);
})();

// Wake-up ping — GET so FastAPI handles it without a separate @app.head decorator
fetch("https://football-stats-lw4b.onrender.com/api/matches/upcoming").catch(() => {});
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);