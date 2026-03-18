// ═══════════════════════════════════════════════════════════
// HomeSectionHeader — Reusable section header with icon & link
// ═══════════════════════════════════════════════════════════
import { Link } from "react-router-dom";

export default function HomeSectionHeader({
  icon,
  iconBg = "rgba(56,189,248,0.1)",
  title,
  subtitle,
  linkTo,
  linkLabel,
}) {
  return (
    <div className="hp-sh">
      <div className="hp-sh-left">
        <div className="hp-sh-icon" style={{ background: iconBg }}>
          {icon}
        </div>
        <div className="hp-sh-text">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {linkTo && linkLabel && (
        <Link to={linkTo} className="hp-sh-link">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}