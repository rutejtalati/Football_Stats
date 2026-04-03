/**
 * SEO.jsx  –  src/components/SEO.jsx
 *
 * Drop-in per-page meta tag manager powered by react-helmet-async.
 *
 * Usage:
 *   <SEO
 *     title="Premier League Predictions"
 *     description="AI-powered match predictions for every Premier League fixture."
 *     path="/predictions/premier-league"
 *   />
 *
 * All props are optional — falls back to site-level defaults.
 */

import { Helmet } from "react-helmet-async";

const SITE_NAME   = "StatinSite";
const SITE_URL    = "https://www.statinsite.com";
const DEFAULT_OG  = `${SITE_URL}/og-image.png`;
const TWITTER_HANDLE = "@statinsite";

const DEFAULT_TITLE = "StatinSite · Live Football Analytics";
const DEFAULT_DESC  =
  "Premium football analytics — live scores, AI predictions, FPL tools, standings, fixtures and match intelligence.";

export default function SEO({
  title,
  description = DEFAULT_DESC,
  path = "",
  image = DEFAULT_OG,
  type = "website",
  noIndex = false,
}) {
  const fullTitle    = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE;
  const canonicalUrl = `${SITE_URL}${path}`;

  return (
    <Helmet>
      {/* ── Primary ── */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical"    href={canonicalUrl} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      {/* ── Open Graph ── */}
      <meta property="og:type"        content={type} />
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:url"         content={canonicalUrl} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image"       content={image} />

      {/* ── Twitter / X ── */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:site"        content={TWITTER_HANDLE} />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={image} />
    </Helmet>
  );
}