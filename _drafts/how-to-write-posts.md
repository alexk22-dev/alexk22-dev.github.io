---
layout: post
title: "How to write posts (internal reference — not published)"
description: Personal cheat sheet for adding blog posts. Lives in _drafts/ so Jekyll's production build never publishes it.
---

This file is in `_drafts/`. A normal `jekyll build` (no `--drafts` flag) does **not** publish anything in `_drafts/`, so this stays off the live site. To preview drafts locally, run the dev server with `--drafts`.

## Where posts live and how they're named

- Published posts go in `_posts/`.
- Filename convention: `YYYY-MM-DD-title.md` (e.g. `2026-06-17-hello.md`).
- The date in the filename sets the publish date and the URL. That's the whole convention.

## Minimal front matter (copy-paste)

Every post starts with a front-matter block — the `---` fenced section — and it must be on line 1. Minimal template:

```markdown
---
layout: post
title: Your title here
date: 2026-06-17 09:00:00
description: One-line summary shown under the title on the blog index.
related_posts: false
---

Your first paragraph goes here.
```

Optional fields:

- `tags: code images` — builds tag archive pages. Stick to the site's known-good set: `formatting`, `images`, `links`, `math`, `code`, `blockquotes`. Unknown tags/categories can break the build, so when in doubt, omit them.
- `thumbnail: /assets/img/x.jpg` — small preview image in the post list.
- Leave `related_posts: false` to hide the "related posts" block at the bottom.

After the front matter, just write [Markdown](https://www.markdownguide.org/basic-syntax/): `**bold**`, `*italic*`, inline `` `code` ``, links, headings, lists, and `>` blockquotes all work.

## Code blocks

Fenced code blocks with a language hint get syntax highlighting:

````markdown
```python
def greet(name: str) -> str:
    return f"Hello, {name}!"
```
````

Common hints: `python`, `bash`, `js`, `ts`, `json`, `yaml`, `markdown`. Plain ` ` ``` with no hint also works for unstyled blocks.

## Images

Images live in `assets/img/`. The recommended embed is the `figure.liquid` include — responsive and click-to-zoom on the live site:

```liquid
{% include figure.liquid path="/assets/img/x.jpg" zoomable=true caption="Caption text." alt="Describe the image for accessibility." %}
```

You can also add `class="img-fluid rounded z-depth-1"` for the standard rounded/shadowed styling.

For something quick, plain Markdown works too:

```markdown
![alt text](/assets/img/x.jpg)
```

Always include real `alt` text.

## Posting workflow

1. Copy this structure into a new file in `_posts/` named `YYYY-MM-DD-title.md`.
2. Fill in the front matter and body.
3. Commit — the live site rebuilds automatically.

## Easier UI (in progress)

A hidden `/admin` CMS login is being set up so posts can be written and published from a simple web editor instead of editing Markdown files by hand. Until that's live, the file-based workflow above is the way to publish.
