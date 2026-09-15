// Netlify sets URL for the production deploy and DEPLOY_PRIME_URL for branch/preview
// deploys. NEXT_PUBLIC_SITE_URL lets you override manually if you ever need to.
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.DEPLOY_PRIME_URL ||
  process.env.URL ||
  "http://localhost:3000";

export const isCanonicalHost = siteUrl === "https://vanja.ir";
