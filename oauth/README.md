# Decap CMS GitHub OAuth provider

A minimal, **self-contained** GitHub OAuth provider for [Decap CMS](https://decapcms.org)
using the **GitHub backend** (not git-gateway). It implements the GitHub OAuth
web flow and returns the `postMessage` handshake Decap expects, so the CMS at
`https://ryankim.me/admin/` can authenticate and commit to the repo.

**This folder is deployed as its OWN, separate Vercel project.** It is NOT part
of the Jekyll site build. (The main site's `_config.yml` excludes `oauth/` from
the Jekyll build.)

## Why this exists

GitHub's OAuth web flow requires a server-side secret (`client_secret`) to
exchange the authorization `code` for an access token. A static site can't hold
that secret, so Decap delegates to this tiny service.

## Endpoints

- `GET /` — health check JSON (confirms the service is live and whether env vars are set). No secrets exposed.
- `GET /auth` — redirects the user to GitHub's authorize page (Decap opens this in a popup). Sets a short-lived `state` cookie for CSRF protection.
- `GET /callback` — GitHub redirects here with `?code`. The handler verifies `state`, exchanges the code for a token, and returns an HTML page that posts the token back to the Decap opener window.

Routes map to `api/*.js` via `vercel.json` rewrites (`/auth` → `/api/auth`, `/callback` → `/api/callback`, `/` → `/api/index`).

## The Decap handshake (what `/callback` returns)

1. Popup → opener: `postMessage("authorizing:github", "*")`
2. Popup waits for the opener (Decap) to reply.
3. Popup → opener: `postMessage("authorization:github:success:" + JSON.stringify({ token, provider: "github" }), <opener-origin>)`

On error it sends `authorization:github:error:{...}` instead.

## Deploy (Vercel)

1. Create a **new, separate** Vercel project pointing at this `oauth/` folder
   (set the Root Directory to `oauth` if importing the whole repo, or deploy
   this folder standalone). Framework preset: **Other**. No build command needed.
2. Set environment variables (Production + Preview):
   - `OAUTH_GITHUB_CLIENT_ID`
   - `OAUTH_GITHUB_CLIENT_SECRET`
3. Deploy. Visit `https://<your-oauth-project>.vercel.app/` — you should see
   `"ok": true` and both env vars reported as `"set"`.

See `../admin/SETUP.md` for the full end-to-end runbook (GitHub OAuth App
creation, wiring `base_url`, etc.).

## Configuration notes

- **Scope:** `auth.js` requests the `repo` scope so Decap can read and commit
  (works for private repos). If your repo is public, you may narrow this to
  `public_repo` in `api/auth.js`.
- **Runtime:** Node 18+ (uses global `fetch`). No `npm install` is required —
  there are zero runtime dependencies.
- **Secrets:** read only from environment variables; never hardcoded.

## Local quick test

You can't fully test the GitHub redirect locally without a public callback URL,
but you can sanity-check the health endpoint with `vercel dev` (optional):

```bash
cd oauth
npx vercel dev
# open http://localhost:3000/  -> health JSON
```
