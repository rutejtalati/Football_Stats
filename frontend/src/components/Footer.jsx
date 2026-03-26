// Footer.jsx — StatinSite global iOS-style footer
// Place at: src/components/Footer.jsx
import React from "react";

export default function Footer() {
  return (
    <footer style={{
      position: "relative",
      zIndex: 2,
      marginLeft: 220,          /* match sidebar width */
      fontFamily: "'Inter', system-ui, sans-serif",
      flexShrink: 0,
    }}
    className="sn-footer"
    >
      <style>{`
        /* Mobile: no sidebar offset */
        @media (max-width: 820px) {
          .sn-footer { margin-left: 0 !important; padding-bottom: 80px; }
        }
      `}</style>

      {/* Gradient separator */}
      <div style={{
        height: "0.5px",
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,.12) 20%, rgba(255,255,255,.12) 80%, transparent)",
        marginBottom: 32,
      }}/>

      <div style={{
        maxWidth: 1360,
        margin: "0 auto",
        padding: "0 28px 48px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
      }}>

        {/* Left — brand */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <rect x="4" y="3"  width="14" height="3.5" rx="1.75" fill="#0a84ff"/>
              <rect x="4" y="9"  width="10" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.65"/>
              <rect x="4" y="15" width="14" height="3.5" rx="1.75" fill="#0a84ff" opacity="0.4"/>
              <rect x="4" y="21" width="7"  height="3.5" rx="1.75" fill="#0a84ff" opacity="0.22"/>
              <rect x="20" y="15" width="3" height="10"  rx="1.5"  fill="#30d158"/>
              <rect x="20" y="10" width="3" height="3"   rx="1.5"  fill="#30d158" opacity="0.45"/>
            </svg>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", letterSpacing: "-.04em" }}>
              StatinSite
            </span>
          </div>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)", paddingLeft: 34, letterSpacing: ".01em" }}>
            Football Intelligence · ELO · Dixon-Coles · xG
          </span>
        </div>

        {/* Centre — built by frosted card */}
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 5,
          padding: "14px 32px",
          background: "rgba(255,255,255,.04)",
          border: "0.5px solid rgba(255,255,255,.1)",
          borderRadius: 14,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}>
          <span style={{ fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,.28)", letterSpacing: ".14em", textTransform: "uppercase" }}>
            Built by
          </span>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#ffffff", letterSpacing: "-.025em" }}>
            Rutej Talati
          </span>
        </div>

        {/* Right — links */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.45)", letterSpacing: ".02em" }}>
            statinsite.com
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,.18)" }}>
            © {new Date().getFullYear()} StatinSite. All rights reserved.
          </span>
        </div>

      </div>
    </footer>
  );
}