// Extends app.json. The GitHub Pages build serves the web app from /PIKII as a single-page app, so the
// workflow sets these; local builds keep the defaults from app.json.
module.exports = ({ config }) => ({
  ...config,
  web: { ...config.web, output: process.env.EXPO_WEB_OUTPUT ?? config.web?.output },
  experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL ?? config.experiments?.baseUrl },
});
