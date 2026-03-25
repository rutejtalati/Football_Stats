import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
// Wake-up ping — GET so FastAPI handles it without a separate @app.head decorator
fetch("https://football-stats-lw4b.onrender.com/api/matches/upcoming").catch(() => {});
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);