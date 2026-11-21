// GitHub OAuth — step 1: redirect the user to GitHub's authorize page.
//
// Decap CMS opens this endpoint in a popup (it computes the URL as
// <base_url>/<auth_endpoint>, e.g. https://your-oauth.vercel.app/auth).
// vercel.json rewrites /auth -> /api/auth.
//
// This is a zero-dependency Vercel serverless function (Node runtime).
// It reads OAUTH_GITHUB_CLIENT_ID / OAUTH_GITHUB_CLIENT_SECRET from env and
// NEVER hardcodes secrets.

const crypto = require("crypto");

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";

// "repo" scope is required so Decap can read AND commit content to a repo
// (works for private repos too). If the target repo is public and you only
// ever commit to it, "public_repo" is sufficient — but "repo" is the safe,
// standard choice Decap documents.
const SCOPE = "repo";

module.exports = (req, res) => {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  if (!clientId) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Missing OAUTH_GITHUB_CLIENT_ID environment variable.");
    return;
  }

  // CSRF protection: a random state echoed back and verified in the callback.
  const state = crypto.randomBytes(16).toString("hex");

  // Build the absolute redirect_uri back to THIS service's /callback.
  // Honors the forwarded host/proto so it works behind Vercel's proxy.
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const redirectUri = `${proto}://${host}/callback`;

  const authorizeUrl =
    `${GITHUB_AUTHORIZE_URL}?` +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: SCOPE,
      state,
      // allow_signup is optional; leave GitHub default.
    }).toString();

  // Store state in a short-lived, HttpOnly cookie to verify on callback.
  res.setHeader("Set-Cookie", [`decap_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`]);
  res.statusCode = 302;
  res.setHeader("Location", authorizeUrl);
  res.end();
};
