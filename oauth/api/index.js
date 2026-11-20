// Health/landing endpoint for the OAuth service root ("/").
// Visiting the deployed service root should show this so you can confirm the
// project is live. It deliberately exposes NO secrets.
module.exports = (req, res) => {
  const hasId = Boolean(process.env.OAUTH_GITHUB_CLIENT_ID);
  const hasSecret = Boolean(process.env.OAUTH_GITHUB_CLIENT_SECRET);
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(
    JSON.stringify(
      {
        service: "decap-cms-github-oauth",
        ok: true,
        endpoints: ["/auth", "/callback"],
        env: {
          OAUTH_GITHUB_CLIENT_ID: hasId ? "set" : "MISSING",
          OAUTH_GITHUB_CLIENT_SECRET: hasSecret ? "set" : "MISSING",
        },
      },
      null,
      2
    )
  );
};
