// Sign-in (the same popup handshake Sveltia uses with the oauth/ service) and the GitHub Git Data API calls:
// load _cool/ at the head of main, and save every changed file as one commit that only fast-forwards main.
// These three must match backend.repo, backend.branch and backend.base_url in admin/config.yml (a test checks).
export const REPO = "RyanKim17920/RyanKim17920.github.io";
export const BRANCH = "main";
export const OAUTH = "https://ryankimmeoauth.vercel.app";
const API = "https://api.github.com";
const COOL = /^_cool\/((site|axes|skills|logos)\.json|items\/[^/]+\.json)$/;

/** Opens the OAuth popup and resolves with the token. The popup says "authorizing:github"; we echo it back so it
 *  knows our origin, then it posts "authorization:github:success:{"token":...}" (or ":error:{...}"). */
export function signIn({ open = url => window.open(url, "grid-sign-in", "width=600,height=720"), base = OAUTH, win = window } = {}) {
  return new Promise((resolve, reject) => {
    const popup = open(`${base}/auth?provider=github&site_id=ryankim.me&scope=repo`);
    if (!popup) { reject(new Error("The sign-in window was blocked. Allow pop-ups for this page and try again.")); return; }
    const origin = new URL(base).origin;
    const done = () => { win.removeEventListener("message", onMessage); clearInterval(watch); };
    const onMessage = e => {
      if (e.origin !== origin || typeof e.data !== "string") return;
      if (e.data === "authorizing:github") { e.source?.postMessage("authorizing:github", e.origin); return; }
      const m = /^authorization:github:(success|error):([\s\S]*)$/.exec(e.data);
      if (!m) return;
      done();
      let p = {};
      try { p = JSON.parse(m[2]) || {}; } catch { /* reported below */ }
      if (m[1] === "success" && typeof p.token === "string" && p.token) resolve(p.token);
      else reject(new Error(p.error || p.message || "GitHub sign-in failed."));
    };
    const watch = setInterval(() => { if (popup.closed) { done(); reject(new Error("The sign-in window was closed before it finished.")); } }, 400);
    win.addEventListener("message", onMessage);
  });
}

export class GitHubError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
/** main moved on since the page loaded: saving now would overwrite someone else's commit. */
export class StaleError extends Error {}

const b64 = s => { const bin = atob(s.replace(/\s/g, "")); return Uint8Array.from(bin, c => c.charCodeAt(0)); };

export class GitHub {
  constructor(token, fetchFn = (...a) => fetch(...a)) { this.token = token; this.fetch = fetchFn; }

  async req(method, path, body) {
    const res = await this.fetch(API + path, {
      method,
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${this.token}`, "X-GitHub-Api-Version": "2022-11-28", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new GitHubError(res.status, `GitHub ${method} ${path.split("?")[0]}: ${res.status} ${data.message || res.statusText || ""}`.trim());
    return data;
  }

  async head() { return (await this.req("GET", `/repos/${REPO}/git/ref/heads/${BRANCH}`)).object.sha; }

  /** The _cool/ files at the head of main: { commit, tree, texts: Map(rel -> text), modes, paths: Set | null }. */
  async load() {
    const commit = await this.head();
    const tree = (await this.req("GET", `/repos/${REPO}/git/commits/${commit}`)).tree.sha;
    const listing = await this.req("GET", `/repos/${REPO}/git/trees/${tree}?recursive=1`);
    const blobs = listing.tree.filter(e => e.type === "blob" && COOL.test(e.path));
    const dec = new TextDecoder("utf-8", { fatal: true });
    const texts = new Map(), modes = new Map();
    await Promise.all(blobs.map(async e => {
      const blob = await this.req("GET", `/repos/${REPO}/git/blobs/${e.sha}`);
      texts.set(e.path.slice("_cool/".length), dec.decode(b64(blob.content)));
      modes.set(e.path.slice("_cool/".length), e.mode);
    }));
    // a truncated listing can't say a file is missing, so the asset checks are skipped (CI still runs them)
    const paths = listing.truncated ? null : new Set(listing.tree.filter(e => e.type === "blob").map(e => e.path));
    return { commit, tree, texts: new Map([...texts].sort(([a], [b]) => (a < b ? -1 : 1))), modes, paths };
  }

  /** Commits files ([{ rel, text }]) on top of `base` and moves main to it, never by force. */
  async save({ commit: base, tree: baseTree, modes }, files, message) {
    if (await this.head() !== base) throw new StaleError("main has a newer commit than the one this page loaded.");
    const entries = await Promise.all(files.map(async f => ({
      path: "_cool/" + f.rel, mode: modes?.get(f.rel) || "100644", type: "blob",
      sha: (await this.req("POST", `/repos/${REPO}/git/blobs`, { content: f.text, encoding: "utf-8" })).sha,
    })));
    const tree = (await this.req("POST", `/repos/${REPO}/git/trees`, { base_tree: baseTree, tree: entries })).sha;
    const commit = await this.req("POST", `/repos/${REPO}/git/commits`, { message, tree, parents: [base] });
    try {
      await this.req("PATCH", `/repos/${REPO}/git/refs/heads/${BRANCH}`, { sha: commit.sha, force: false });
    } catch (e) {
      if (e.status === 422) throw new StaleError("main moved while saving, so nothing was changed.");
      throw e;
    }
    return { sha: commit.sha, url: commit.html_url || `https://github.com/${REPO}/commit/${commit.sha}`, tree };
  }
}
