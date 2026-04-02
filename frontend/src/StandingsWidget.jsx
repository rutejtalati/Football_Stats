import { useEffect } from "react";

export default function StandingsWidget() {

  useEffect(() => {
    // Avoid injecting the script more than once
    const existing = document.querySelector(
      'script[src="https://widgets.api-sports.io/football/1.1.8/widget.js"]'
    );
    if (existing) return;

    const script = document.createElement("script");
    script.src = "https://widgets.api-sports.io/football/1.1.8/widget.js";
    script.async = true;

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div>

      <api-sports-widget data-type="standings"></api-sports-widget>

      <api-sports-widget
        data-type="config"
        data-key={import.meta.env.VITE_API_SPORTS_KEY || ""}
        data-sport="football"
        data-lang="en"
        data-theme="dark"
        data-timezone="India"
        data-show-errors="true"
        data-show-logos="true"
      ></api-sports-widget>

    </div>
  );
}