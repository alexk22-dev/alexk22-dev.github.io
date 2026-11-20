# Hidden admin / Sveltia CMS — setup runbook

This sets up a **hidden, URL-only** admin at <https://ryankim.me/admin/> where you
can write and publish blog posts (to `_posts/`) through a web UI — form fields,
rich-text/Markdown with first-class code blocks, and drag-drop image uploads —
that commits straight to `RyanKim17920/RyanKim17920.github.io` on `main`.

It uses **Sveltia CMS** (a drop-in, config-compatible successor to Decap/Netlify
CMS, chosen for its much better code-block + image editor) with the **GitHub
backend** and a small **external OAuth provider** (the `oauth/` folder), because
the site is prebuilt by Jekyll and served as static files on Vercel (not
Netlify, so no git-gateway). The external OAuth provider is unchanged from the
Decap setup — Sveltia reuses the same `base_url` + `auth_endpoint` handshake.

There are two deployments:

1. **The site** (already deployed) — gains a static `/admin/` folder.
2. **The OAuth service** — the `oauth/` folder, deployed as its OWN Vercel project.

---

## Prerequisites / one-time config in `_config.yml`

Sveltia's `admin/` is plain HTML + a `.yml` config and **must not be processed by
Jekyll**, and the `oauth/` folder must be **excluded** from the build. Apply the
changes listed in the project owner's notes (summary):

- Add `admin` to the Jekyll `include:` list so the folder is copied into `_site`.
- Add `oauth` (and `oauth/**`) to the Jekyll `exclude:` list so it is never built or shipped with the site.
- Ensure `admin/config.yml` is shipped verbatim (see the "config.yml protection" note in those owner notes).

> These live in `_config.yml`, which this CMS setup does not edit. They are
> required before `/admin/` works in production.

---

## Step 1 — Create a GitHub OAuth App

1. Go to <https://github.com/settings/developers> → **OAuth Apps** → **New OAuth App**.
   (Or organization settings if the repo is under an org.)
2. Fill in:
   - **Application name:** e.g. `ryankim.me CMS`
   - **Homepage URL:** `https://ryankim.me`
   - **Authorization callback URL:** `https://<your-oauth-project>.vercel.app/callback`
     - You won't know the exact Vercel URL until Step 2. You can put a
       placeholder now and **edit it after deploying** the OAuth service, or do
       Step 2 first and come back. The callback URL **must exactly match** the
       deployed `/callback` URL.
3. Click **Register application**.
4. Copy the **Client ID**.
5. Click **Generate a new client secret** and copy the **Client secret**
   (shown once — store it safely).

---

## Step 2 — Deploy the `oauth/` folder as its OWN Vercel project

1. In Vercel, **Add New… → Project**, import this same GitHub repo
   (`RyanKim17920/RyanKim17920.github.io`).
2. In the import settings, set **Root Directory** to `oauth`.
   - Framework Preset: **Other**.
   - Build & Output: leave defaults (no build command needed; it's just serverless functions).
3. Add **Environment Variables** (Production and Preview):
   - `OAUTH_GITHUB_CLIENT_ID` = the Client ID from Step 1
   - `OAUTH_GITHUB_CLIENT_SECRET` = the Client secret from Step 1
4. **Deploy.**
5. Note the project's production URL, e.g. `https://ryankim-cms-oauth.vercel.app`.
6. Verify the service is live: open `https://<your-oauth-project>.vercel.app/`.
   You should see JSON with `"ok": true` and both env vars reported as `"set"`.
7. **Go back to the GitHub OAuth App (Step 1)** and make sure the
   **Authorization callback URL** is exactly:
   `https://<your-oauth-project>.vercel.app/callback`

> Tip: keep this OAuth project on a stable production domain. If the
> auto-generated Vercel URL changes, update the GitHub callback URL and
> `admin/config.yml` `base_url` to match.

---

## Step 3 — Point `admin/config.yml` at the OAuth service

Edit `admin/config.yml` in this repo and set `base_url` to the OAuth service
**origin** (scheme + host, no trailing slash, no path):

```yaml
backend:
  name: github
  repo: RyanKim17920/RyanKim17920.github.io
  branch: main
  base_url: https://ryankim-cms-oauth.vercel.app # <-- your deployed oauth/ origin
  auth_endpoint: auth
```

Sveltia will start login by opening `<base_url>/auth` (i.e.
`https://ryankim-cms-oauth.vercel.app/auth`), which redirects to GitHub. This is
the same flow Decap used, so no change to the OAuth service or GitHub OAuth App
is needed.

Commit and let the **site** redeploy so the updated `/admin/config.yml` ships.

---

## Step 4 — Log in and publish

1. Visit <https://ryankim.me/admin/>.
2. Click **Login with GitHub**. A popup opens, you authorize the OAuth App, and
   the popup closes you back into the CMS.
3. Open the **Blog Posts** collection → **New Blog Posts**.
4. Fill in Title, Date, Description, optional Tags/Categories, write the body in
   the rich-text editor (use the toolbar's code-block button for fenced code, or
   switch to **raw** mode to paste ``` blocks), drag-drop/paste any images.
5. Decide draft vs live with the **Published (live)** toggle (see next section),
   then click the CMS's blue **Save** button in the top bar.
6. Sveltia commits a new file to `_posts/` (named
   `YYYY-MM-DD-your-slug.md`) and uploads images to `assets/img/blog/` on
   `main`. Every such commit redeploys the site; whether the post appears live
   depends solely on the **Published (live)** toggle.

---

## Draft vs. publish (save without going live)

**Why it works this way.** Every commit to `main` auto-deploys, and Sveltia CMS
does **not** yet support an editorial/PR workflow that would keep drafts off
`main`: the official docs say *"This feature from Netlify/Decap CMS is not yet
supported in Sveltia CMS. It will be added before the 1.0 release."*
(<https://sveltiacms.app/en/docs/workflows/editorial>). So we use the
**Jekyll-native** draft mechanism instead — the **Published (live)** toggle,
which writes the `published:` front-matter field. Jekyll **excludes any document
with `published: false` from the build**
(<https://jekyllrb.com/docs/front-matter/>), and our CI build does not pass the
`--unpublished` flag, so such a post never renders on the live site.

**The workflow:**

- **Save as a draft (NOT live):** leave **Published (live)** **OFF** (this is the
  default for a new post) and click **Save**. The post is committed to `_posts/`
  on `main` and is fully editable/recoverable in the CMS, but because
  `published: false`, the build drops it — **it does not appear on the live
  site.** You can save a draft as many times as you like; each save is just a
  commit of a non-rendered file.
- **Publish (make it live):** turn **Published (live)** **ON** and click
  **Save**. Now `published: true`, Jekyll includes the post, and the auto-deploy
  makes it live within a couple of minutes.
- **Unpublish:** turn the toggle **OFF** again and **Save** — the next deploy
  removes it from the live site (the file stays in the repo as a draft).

> Note: a draft is still a public commit in the GitHub repo (anyone reading the
> repo source can see the file). It is "not live" in the sense that it is not on
> the rendered website — it is not private. This is the unavoidable trade-off of
> a single-branch, auto-deploying setup until Sveltia ships editorial workflow.

---

## Writing math in the CMS

**Equations now render live in the preview pane as you type.** This section
previously said that was impossible; that is no longer true. Sveltia shipped
`registerPreviewTemplate` in **v0.169.0** (2026-06-29,
<https://github.com/sveltia/sveltia-cms/releases/tag/v0.169.0>,
<https://sveltiacms.app/en/docs/api/preview-templates>), and
`admin/preview.js` uses it to load MathJax into the preview iframe. (That file
was called `preview-math.js` until it grew to cover styling and images too.)

Three things make math authoring safe, and it's worth knowing why each exists:

**1. The body editor is RAW-ONLY on Blog Posts.** `modes: ["raw"]` in
`config.yml`. The rich-text mode is Lexical-backed: it re-serialises the
Markdown on save and mangles the backslashes and braces in LaTeX. Merely
listing `raw` first didn't help — one click on the mode selector still
corrupted every equation — so the selector is gone entirely on that collection.
The cost is that raw mode disables the toolbar buttons, so **fenced code blocks
are typed by hand** and **images go through the Thumbnail field or the Assets
tab** — drag/paste upload does not work in raw mode either. See "Adding images
to a post" below for the exact steps. News items keep both modes, since they
don't carry equations.

**2. The preview emulates kramdown's delimiter rules.** On the live site,
kramdown converts `$$...$$` into `\(...\)` / `\[...\]` at build time, which is
why `assets/js/mathjax-setup.js` only configures `\(...\)`. The CMS preview is
rendered by Sveltia's own Markdown renderer, not kramdown, so `preview.js`
does that conversion itself before typesetting: an equation alone in its
paragraph becomes **display** math, one inside a sentence becomes **inline**.
Fenced code blocks are skipped, so a snippet showing a literal `$$` stays put.

**3. Prettier can never touch posts.** `_posts/**` and `_news/**` are in
`.prettierignore`. See "Never run Prettier over posts" below.

**Still turn on the Enable math (MathJax) toggle** for posts with equations.
`_includes/scripts.liquid` also auto-detects math in the rendered HTML, so
forgetting it no longer silently breaks the page, but the flag is the explicit
signal and costs nothing.

**If preview math ever stops working:** the CDN URL in `index.html` is pinned
(to 0.266.0). `preview.js` needs 0.169.0 or newer; check the pinned version
before assuming `preview.js` is at fault.

---

## Never run Prettier over posts

Prettier's Markdown printer **escapes underscores in text**, turning
`W_\text{chosen}` into `W\_\text{chosen}`, which MathJax then renders
literally. Prettier has no option to switch that off, so `_posts/**` and
`_news/**` are ignored wholesale in `.prettierignore`.

Do **not** replace that with a list of individual files. Posts written in the
CMS are committed straight through the GitHub API and never pass through
Prettier, so a new math post never gets added to such a list; `prettier --check`
in CI then fails on it, and the reflex fix — `npx prettier . --write` — is
exactly the thing that corrupts the equations.

---

## Blog list: Drafts/Published filters and sorting

The Blog Posts collection now has quick **view filters** and **sorting** in the
entry list:

- **Filters** (`view_filters`): "Drafts" shows only posts with `published:
  false`; "Published" shows only `published: true`. (Decap key, supported by
  Sveltia — <https://decapcms.org/docs/configuration-options/> /
  <https://sveltiacms.app/en/docs/collections/entries>.)
- **Sorting** (`sortable_fields`): you can sort by **date** or **title**, and the
  default sort is **newest date first** (`default: { field: date, direction:
  descending }` — Sveltia's extended object form of the Decap key).

## News / announcements collection

A **News / Announcements** collection writes to `_news/`. Each item matches
exactly what al-folio's `_includes/news.liquid` reads:

- **Inline (short blurb)** ON → the Markdown body is shown inline on the
  about/news page (Title is ignored). Use for short one-liners.
- **Inline** OFF → the **Title** becomes a link to the item's own generated page
  (Title is required in that case).
- `date` (with time + timezone offset, matching the theme's shipped samples),
  `related_posts` (optional, off), and the Markdown body round out the fields.
  `layout: post` is set as a hidden field (al-folio also defaults it via
  `_config.yml`).

> **To actually display news on the About page**, `_pages/about.md` front matter
> must set `announcements: enabled: true` (it is currently `false`). That file is
> outside this CMS setup's scope and must be toggled separately.

The standalone `/news` page shows all items regardless of that toggle.

## Homepage (cool view)

Two collections edit `_cool/`, the source of the homepage:

- **Homepage items**: one entry per piece of work (`_cool/items/<id>.json`),
  grouped by section. Weights are rows of *entry* (a dropdown of that axis's
  entries) and *weight* (0 to 1). Pick the **ID** once when creating an item:
  it is the file name and the page's `#id` link.
- **Homepage**: Site settings, Axes (add an entry here first, then it shows in
  the item dropdowns), Skills, Logo variants.

Each save commits to `main`; CI runs `scripts/build_cool.py`, which refuses to
deploy content with problems and lists them in the failed run's log. Blog posts
can point at items with **Related homepage items**.

### The grid (faster weight edits)

<https://ryankim.me/admin/grid/> (unlinked, noindex) shows every item × entry
weight of one axis as a spreadsheet, plus the items' short text (name, context,
summary, dates, org line) and the entry names. Sign in with GitHub (same OAuth
service, works on ryankim.me only), then: click a cell and type `0.7` or `7`,
arrows move, `+`/`-` or Shift+↑/↓ step by 0.1, Delete or `0` clears, ⌘Z undoes,
⌘S saves. **Save all** checks the content with the same rules as
`build_cool.py` and writes every changed file in one commit; it refuses if
`main` moved since the page loaded (reload and redo). Bullets, links, logos and
new items stay in the CMS (each row has a CMS link). Code: `admin/grid/`;
tests: `node --test _cool/tests/` and `python3 -m unittest discover -s _cool/tests`.

## Editor & preview defaults (Sveltia, no config needed)

Sveltia's nice editor behaviors are **on by default** — we intentionally did not
add config for them (adding undocumented keys would only risk breaking the CMS):

- **Preview pane is enabled by default** and toggled per-user from the editor's
  top-right menu — *"Previews are enabled by default."*
  (<https://sveltiacms.app/en/docs/ui/content-editor>). The Decap collection key
  `editor: { preview: false }` is supported if you ever want to hide it, but the
  default (`true`) is what we want.
- **Rich-text editing by default:** the body's `modes` default to rich text plus
  a raw-Markdown toggle (<https://sveltiacms.app/en/docs/fields/richtext>).
  **Blog Posts deliberately override this to `["raw"]`** because rich text
  corrupts LaTeX — see "Writing math in the CMS" above. News keeps the default.
- **Automatic draft backups** to browser local storage are on by default
  (<https://sveltiacms.app/en/docs/ui/content-editor>).
- **Word/character count is NOT a documented Sveltia feature** — do not expect
  it; it is not configurable.

- **Preview templates are custom, not default.** `admin/preview.js` registers
  one for `blog` so the pane matches the site. News uses Sveltia's stock
  preview.

Media handling is left on the global `assets/img/blog` folder on purpose: it
feeds al-folio's responsive-image pipeline. Sveltia documents optional upload
transformations/slugification (`media_libraries`), but none offers a clear win
here and they are not needed, so they were intentionally omitted to avoid
fragility.

## Adding images to a post

> This section previously described dragging or pasting a file into the body
> editor. **That does not work on Blog Posts** and the rest of this section is
> the correction. It still works on News items, which keep rich-text mode.

### Why the obvious way doesn't work here

The Blog Posts body is `modes: ["raw"]` so that rich text cannot corrupt LaTeX
(see "Writing math in the CMS"). Two consequences, both verified rather than
assumed:

- **The toolbar is gone.** Sveltia's docs: the toolbar buttons *"are disabled
  when `raw` mode is active"* (<https://sveltiacms.app/en/docs/fields/richtext>).
  So there is no image-insert button.
- **Drag-and-drop and paste are also dead**, even though they are not toolbar
  features. Sveltia's `rich-text-editor.svelte` does attach `onpastecapture` and
  `ondrop` in both modes, but the handler behind them (`insertImages`) returns
  immediately unless the drop target `.matches('.lexical-root')`. In raw mode
  the editor is a plain `<textarea>`, so that check never passes and nothing
  happens. **Don't wait for an upload that isn't coming.**

The fix is *not* to turn rich text back on. Use one of the two routes below.

### Route A — the Thumbnail field (fastest, stays inside the post)

1. Open the post in the CMS. Below **Description** there is a **Thumbnail**
   field with a **Select/Upload** button.
2. Click it, choose **Upload**, pick your file. It uploads into
   `assets/img/blog/`.
3. The field now shows the stored path, e.g. `/assets/img/blog/diagram.png`.
4. If you also want the image **inside the post body**, type the Markdown by
   hand in the body, using that exact path:

   ```markdown
   ![A short description of the image](/assets/img/blog/diagram.png)
   ```

5. **Save.** The image file and the post are committed together.

The Thumbnail value is not wasted: `_pages/blog.md` renders it as the card image
next to the post in the `/blog` list. Leave it set, or clear it after copying
the path if you don't want a card image.

### Route B — the Assets tab (for many images, or reusing an existing one)

1. Click **Assets** in the CMS's top navigation.
2. **Upload** (or drag files onto the grid). They land in `assets/img/blog/`.
3. Select the uploaded file, open the **⋯ / Copy** menu, and choose **Copy file
   path** (or **Copy public URL**).
4. Go back to the post and paste it into a Markdown image:
   `![alt text](/assets/img/blog/<file>)`.

Assets uploaded this way are committed as their own `media: upload …` commit.

### Where the files go, and why

Uploads are committed to `assets/img/blog/` (the `media_folder`), and paths are
written as `/assets/img/blog/<file>` (the absolute `public_folder`). Absolute is
the right choice: post URLs are nested (`/blog/2026/slug/`), so a relative path
would break. That folder sits under `assets/img/`, which `_config.yml`'s
`imagemagick.input_directories` watches, so responsive WebP variants are
generated at build time. The folder is created automatically on first upload.

### Using the al-folio figure include instead

For a captioned, zoomable, fully responsive image (the srcset/WebP pipeline),
use the theme's include rather than plain Markdown — type it by hand in the raw
body:

```liquid
{% include figure.liquid path="assets/img/blog/diagram.png" class="img-fluid rounded z-depth-1" zoomable=true caption="What the figure shows." alt="Description for screen readers." %}
```

Note `path` here has **no leading slash** — that is the convention the include
expects. The preview pane renders an approximation of this (see below).

---

## What the preview pane does and does not reproduce

`admin/preview.js` loads the site's own compiled `main.css` into the preview
iframe and renders the body inside the same DOM shape `_layouts/post.liquid`
emits, so headings, body type, links, code, blockquotes, `.marginnote` styling
and dark mode look like the published page.

**It reproduces:**

- Site typography, colours, spacing and dark mode (from `main.css`).
- LaTeX, typeset by the same MathJax 3.2.2 build the site loads.
- `{% include figure.liquid … %}` — shown as the image plus its caption.
- `{% marginnote %}…{% endmarginnote %}` — shown as the bordered aside.
- Plain Markdown images, including ones **uploaded but not yet saved** (they
  preview from an in-browser blob via Sveltia's `getAsset`).

**It does NOT reproduce — this is expected, not a bug:**

- **The responsive image pipeline.** `figure.liquid`'s `srcset`/WebP variants
  are generated by ImageMagick at build time. The preview shows the original
  file at full width. Zoom (`zoomable=true`) is also absent.
- **Any other Liquid tag.** Anything the preview does not implement is shown
  boxed in a dashed outline as literal `{% … %}` so you can see it is an
  unrendered tag rather than page text. It will render normally once published.
- **Footnotes** (`[^ref]`), the **table of contents**, **syntax highlighting**,
  **citations/bibliography**, and **related posts** — all Jekyll/kramdown
  plugins with no equivalent in the browser.
- **Bootstrap and MDB.** Only the handful of utility classes that appear in post
  bodies (`img-fluid`, `rounded`, `z-depth-1`) are approximated.
- **The floated margin note.** `margin_math: true` in a post's front matter
  floats `.marginnote` into the right margin at ≥992px wide. The preview pane is
  narrower than that in practice, so notes show in their normal stacked form —
  which is also what the live site does at that width.
- Post **header metadata** is a simplified title + date; the live page also
  renders tags, categories and read time.

A CMS preview built on a browser Markdown renderer can never be byte-identical
to a Jekyll build. The bar here is "close enough to write confidently" — check
the real page after publishing if a layout detail matters.

---

## Keeping it hidden (and optionally hardening it)

- **Hidden:** nothing on the site links to `/admin/`. It's discoverable only by
  typing the URL. The `admin/index.html` also sends `noindex, nofollow` to keep
  it out of search engines. This is "security by obscurity" — fine as a default,
  but note that **only people you authorize via the GitHub OAuth App + repo
  write access can actually commit** anything. An unauthorized visitor who finds
  `/admin/` still can't log in or change the repo.
- **Optional extra hardening:** add Vercel **password protection** (Project →
  Settings → Deployment Protection) on the site, or put HTTP Basic Auth in front
  of the `/admin/` path, so the login screen itself isn't reachable by strangers.
  Sveltia will still work behind it once you authenticate to Vercel.

---

## Troubleshooting

- **Popup says "error" / nothing happens after authorizing:** the most common
  cause is a **callback URL mismatch**. The GitHub OAuth App's *Authorization
  callback URL* must be exactly `<base_url>/callback`, and `base_url` in
  `admin/config.yml` must be the OAuth service origin with **no trailing slash**.
- **"Missing OAUTH_GITHUB_CLIENT_ID / SECRET":** the env vars aren't set on the
  OAuth Vercel project (check `/` health JSON — both should say `"set"`).
- **"state mismatch":** cookies were blocked or the login was reused/stale —
  just click Login again. (Third-party-cookie blocking shouldn't matter here
  because the state cookie is first-party to the OAuth origin.)
- **`/admin/` 404s or shows raw YAML:** the `_config.yml` include/exclude
  changes (see Prerequisites) haven't been applied, or the site hasn't
  redeployed.
- **Login works but commits fail with permission errors:** the authenticated
  GitHub user needs **write access** to `RyanKim17920/RyanKim17920.github.io`.
