import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Apply saved theme synchronously before first paint — no flash.
// Defaults to dark on first visit; remembers whatever the user last toggled to after that.
(function () {
  const saved = localStorage.getItem("sn-theme");
  document.documentElement.setAttribute("data-theme", saved === "light" ? "light" : "dark");
})();

// Wake-up ping — GET so FastAPI handles it without a separate @app.head decorator
fetch("https://footballstats-production-ecd9.up.railway.app/api/matches/upcoming").catch(() => {});ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);