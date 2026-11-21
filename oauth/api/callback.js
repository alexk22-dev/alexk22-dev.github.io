// GitHub OAuth — step 2: exchange the ?code for an access token, then hand it
// back to the Decap CMS opener window via the postMessage handshake Decap
// expects.
//
// Decap's handshake (verified against community providers and decap-proxy):
//   1. popup -> opener:  postMessage("authorizing:github", "*")
//   2. opener echoes "authorizing:github" back (only that echo, from the
//      opener and an ALLOWED_ORIGINS site, is accepted)
//   3. popup -> opener:  postMessage(
//        "authorization:github:success:" + JSON.stringify({ token, provider }),
//        origin
//      )
//   On error, the success token is replaced by:
//        "authorization:github:error:" + JSON.stringify({ ...errorPayload })
//
// vercel.json rewrites /callback -> /api/callback.
// Zero external dependencies: uses global fetch (Node 18+ on Vercel).

const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const PROVIDER = "github";

// Site origins the token may be posted back to (the CMS at /admin/).
const ALLOWED_ORIGINS = ["https://ryankim.me", "https://www.ryankim.me"];

// U+2028 (line separator) and U+2029 (paragraph separator) are legal inside
// JSON strings but illegal as raw characters in a JS string literal, so they
// must be escaped before inlining JSON into a <script>. Built via fromCharCode
// to avoid placing the invisible characters in this source file.
const LINE_SEP = new RegExp(String.fromCharCode(0x2028), "g");
const PARA_SEP = new RegExp(String.fromCharCode(0x2029), "g");

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

// Renders the HTML page that runs the postMessage handshake in the popup.
// `status` is "success" or "error"; `content` is the object Decap parses.
function renderHandshake(status, content) {
  const payload = JSON.stringify(content)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(LINE_SEP, "\\u2028")
    .replace(PARA_SEP, "\\u2029");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Authorizing…</title>
  </head>
  <body>
    <p>Authorizing Decap CMS… You can close this window if it does not close automatically.</p>
    <script>
      (function () {
        var provider = ${JSON.stringify(PROVIDER)};
        var status = ${JSON.stringify(status)};
        var content = ${payload};
        var allowedOrigins = ${JSON.stringify(ALLOWED_ORIGINS)};

        function postResult(origin) {
          // The actual token is sent back to the precise opener origin Decap
          // hands us in the reply message (e.g. https://ryankim.me).
          window.opener.postMessage(
            "authorization:" + provider + ":" + status + ":" + JSON.stringify(content),
            origin
          );
        }

        function receiveMessage(e) {
          // Only the CMS's echo of our "authorizing:github" ping counts: it
          // comes from the opener window, from an allowed site origin, with
          // exactly that string. Anything else (browser extensions and
          // password managers post messages into pages too) is ignored.
          // Answering the first stray message used to send the result to the
          // wrong origin and drop the listener, leaving the popup stuck.
          if (e.source !== window.opener) return;
          if (e.data !== "authorizing:" + provider) return;
          if (allowedOrigins.indexOf(e.origin) === -1) return;
          window.removeEventListener("message", receiveMessage, false);
          postResult(e.origin);
        }

        if (!window.opener) {
          document.body.textContent =
            "No opener window found (sign-in result: " + status +
            (content.message ? ", " + content.message : "") +
            "). Open the CMS at /admin/ and click Sign In again.";
          return;
        }

        window.addEventListener("message", receiveMessage, false);
        // Kick off the handshake: tell the opener we are authorizing.
        window.opener.postMessage("authorizing:" + provider, "*");
      })();
    </script>
  </body>
</html>`;
}

// Sveltia CMS shows `error` from the payload; Decap shows `message`. Send both
// so the CMS displays the real reason instead of a bare "Authentication
// failed". The reason is also logged (never the token) so `vercel logs`
// shows which branch a failed sign-in hit.
function sendError(res, message) {
  console.log("callback error: " + message);
  sendHtml(res, renderHandshake("error", { provider: PROVIDER, error: message, message }));
}

function sendHtml(res, html) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(html);
}

module.exports = async (req, res) => {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    sendError(res, "Server is missing OAUTH_GITHUB_CLIENT_ID / OAUTH_GITHUB_CLIENT_SECRET.");
    return;
  }

  const url = new URL(req.url, "http://localhost");
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  if (!code) {
    sendError(res, "Missing ?code in OAuth callback.");
    return;
  }

  // CSRF check: state from the cookie set in /auth must match the query state.
  const cookies = parseCookies(req.headers.cookie);
  const expectedState = cookies.decap_oauth_state;
  if (!expectedState || expectedState !== returnedState) {
    sendError(res, "OAuth state mismatch (possible CSRF). Please try logging in again.");
    return;
  }

  try {
    const tokenRes = await fetch(GITHUB_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const data = await tokenRes.json();

    if (data.error || !data.access_token) {
      sendError(res, data.error_description || data.error || "Failed to obtain access token.");
      return;
    }

    // Clear the state cookie now that it has been used.
    res.setHeader("Set-Cookie", ["decap_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"]);

    console.log("callback success: token issued");
    // The exact success payload Decap expects: { token, provider }.
    sendHtml(
      res,
      renderHandshake("success", {
        token: data.access_token,
        provider: PROVIDER,
      })
    );
  } catch (err) {
    sendError(res, "Token exchange request failed: " + (err && err.message));
  }
};
