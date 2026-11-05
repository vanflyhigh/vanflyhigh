// Values that come from the build environment rather than from the CMS.
// GitHub Actions sets SITE_ORIGIN and PATH_PREFIX (see .github/workflows/deploy.yml).
export default {
  origin: (process.env.SITE_ORIGIN || "http://localhost:8080").replace(/\/$/, ""),
  pathPrefix: process.env.PATH_PREFIX || "/",
  isProduction: process.env.ELEVENTY_RUN_MODE === "build",
  year: new Date().getFullYear(),
  // Changes on every build so browsers fetch the new CSS/JS instead of a cached copy.
  version: Date.now().toString(36),
};
