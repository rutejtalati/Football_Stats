import { useEffect } from "react";

export default function StandingsWidget() {

  useEffect(() => {

    const script = document.createElement("script");
    script.src = "https://widgets.api-sports.io/football/1.1.8/widget.js";
    script.async = true;

    document.body.appendChild(script);

  }, []);

  return (
    <div>

      <api-sports-widget data-type="standings"></api-sports-widget>

      <api-sports-widget
        data-type="config"
        data-key="YOUR_API_KEY"
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