import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
fetch("https://football-stats-lw4b.onrender.com/api/matches/upcoming", { method: "HEAD" }).catch(() => {});
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);