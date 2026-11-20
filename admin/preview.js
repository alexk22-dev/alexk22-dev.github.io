/*
 * Makes the Sveltia CMS preview pane resemble a published al-folio post.
 *
 * WHAT THIS DOES
 *   1. Loads the site's own compiled stylesheet into the preview iframe, so
 *      typography, colours and `.marginnote` styling match the live page.
 *   2. Renders the Markdown body inside the same DOM shape post.liquid emits
 *      (.post > header.post-header + article.post-content > #markdown-content),
 *      which is what those CSS rules are written against.
 *   3. Emulates the two Liquid tags this site actually uses in post bodies —
 *      `{% include figure.liquid %}` and `{% marginnote %}` — because Sveltia
 *      renders Markdown only and would otherwise show them as literal text.
 *   4. Resolves image paths through `getAsset`, so an image uploaded in this
 *      editing session (not yet committed) previews from its blob URL instead
 *      of 404ing against the live site.
 *   5. Typesets LaTeX with the same MathJax build the live site uses.
 *
 * WHAT IT DELIBERATELY DOES NOT DO — see admin/SETUP.md "preview fidelity".
 * There is no Jekyll here, so anything Jekyll-specific (the responsive
 * WebP/srcset pipeline, footnote collection, the TOC, syntax highlighting,
 * citations, related posts, any other Liquid tag) is absent or approximated.
 * The goal is "close enough to write confidently", not a byte-identical build.
 *
 * NO BUILD STEP. The preview template must be a React CLASS component, and
 * Sveltia exposes React's helpers as globals (window.createClass, window.h =
 * React.createElement), exactly as Decap did. So this is a plain classic
 * script — no JSX, no bundler. It is minified by jekyll-terser on deploy;
 * `createClass`'s object-literal methods survive that (verified against the
 * deployed artifact), but note terser's `drop_console: true` strips the
 * console calls below from production.
 *
 * THE DELIMITER PROBLEM (the subtle part)
 * On the LIVE site kramdown converts "$$...$$" to \(...\) / \[...\] at BUILD
 * time, which is why assets/js/mathjax-setup.js configures MathJax with
 * \(...\) only. The CMS preview is rendered by Sveltia's own Markdown
 * renderer, NOT kramdown, so raw "$$" survives into the DOM. Loading
 * mathjax-setup.js here unchanged would therefore typeset exactly zero
 * equations. Instead we emulate kramdown in `emulateKramdownDelimiters()`
 * below and then run MathJax with the SAME \(...\) / \[...\] config as
 * production, so the preview and the published page agree.
 *
 * WHY WE COPY THE BODY OUT OF REACT'S TREE
 * Every transform below rewrites DOM that `widgetFor("body")` produced. React
 * owns that subtree and re-renders it on each keystroke, so mutating it in
 * place fights the reconciler (and can throw NotFoundError when React tries to
 * remove a node we replaced). Instead the widget is rendered into a hidden
 * container and its markup is copied into a sibling div that React renders
 * EMPTY and therefore never diffs children of. All rewriting happens on our
 * copy, and the copy is rebuilt from scratch on every update — which also
 * makes every transform below trivially idempotent.
 */
(() => {
  "use strict";

  // Same MathJax build the live site loads (_config.yml third_party_libraries
  // .mathjax, version 3.2.2), with the same SRI hash. Keeping these identical
  // to production is deliberate: the preview should typeset with the exact
  // engine that will render the published page.
  const MATHJAX_URL = "https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-mml-chtml.js";
  const MATHJAX_SRI = "sha256-MASABpB4tYktI2Oitl4t+78w/lyA+D7b/s9GEP0JOGI=";

  // The preview re-renders on every keystroke. Typesetting each one would be
  // both slow and visibly flickery, so coalesce bursts of edits. The cheap DOM
  // transforms are NOT debounced — only this is.
  const TYPESET_DEBOUNCE_MS = 300;

  const MATH_PATTERN = /\$\$([\s\S]+?)\$\$/g;
  // `{% include figure.liquid ... %}` — the al-folio image include used across
  // _posts/ and _projects/.
  const FIGURE_PATTERN = /\{%\s*include\s+figure\.liquid\s+([\s\S]*?)%\}/g;
  // key="value" / key='value' / key=bareword, as Liquid include args are written.
  const INCLUDE_ARG_PATTERN = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s%]+))/g;
  const MARGINNOTE_OPEN = "{% marginnote %}";
  const MARGINNOTE_CLOSE = "{% endmarginnote %}";
  // Any Liquid TAG still present after the transforms above ran. Deliberately
  // does NOT match `{{ ... }}` output syntax: nested braces are everywhere in
  // LaTeX (`\frac{a}{{b + c}}`), and flagging those would wreck real equations.
  // Post bodies on this site use tags, not output expressions.
  const LEFTOVER_LIQUID_PATTERN = /\{%[\s\S]*?%\}/g;
  const ABSOLUTE_URL_PATTERN = /^(?:[a-z]+:|\/\/)/i;

  /* ---------------------------------------------------------------- assets */

  /**
   * Turn a path as written in the Markdown into something the preview iframe
   * can actually load.
   *
   * `getAsset` is checked FIRST so an image uploaded in this editing session —
   * which exists only in the browser until the entry is saved — previews from
   * its blob URL rather than 404ing against the live site. Sveltia stores
   * assets under the config's `public_folder` (a leading-slash path) while
   * al-folio's figure include is conventionally given a path WITHOUT the
   * leading slash, so both spellings are tried.
   *
   * Anything not in the asset store falls through to a site-absolute path.
   * That resolves against the iframe's <base href="{origin}">, i.e. the
   * already-published copy of the image, which is the right answer for every
   * image that is already committed.
   */
  const resolveAssetURL = (rawPath, getAsset) => {
    const path = (rawPath || "").trim();

    if (!path || ABSOLUTE_URL_PATTERN.test(path)) {
      return path;
    }

    const candidates = path.startsWith("/") ? [path, path.slice(1)] : [`/${path}`, path];

    for (const candidate of candidates) {
      let asset;

      try {
        asset = getAsset?.(candidate);
      } catch {
        asset = undefined;
      }

      // Documented to return `{ url }`; tolerate a bare string too.
      const url = typeof asset === "string" ? asset : asset?.url;

      if (url) {
        return url;
      }
    }

    return path.startsWith("/") ? path : `/${path}`;
  };

  /** Re-point every <img> in the preview at a blob URL when we have one. */
  const resolveImages = (root, getAsset) => {
    root.querySelectorAll("img[src]").forEach((img) => {
      // getAttribute, not .src: the latter is already absolutised by <base>.
      const raw = img.getAttribute("src");
      const resolved = resolveAssetURL(raw, getAsset);

      if (resolved && resolved !== raw) {
        img.setAttribute("src", resolved);
      }
    });
  };

  /* --------------------------------------------------------------- liquid */

  /** Parse `key="value"` pairs out of an `{% include %}` argument string. */
  const parseIncludeArgs = (argString) => {
    const args = {};

    for (const match of argString.matchAll(INCLUDE_ARG_PATTERN)) {
      args[match[1]] = match[2] ?? match[3] ?? match[4] ?? "";
    }

    return args;
  };

  /**
   * Collect every text node under `root`, optionally filtered. Snapshotting up
   * front matters: the transforms below insert and remove nodes, which would
   * invalidate a live TreeWalker mid-iteration.
   */
  const collectTextNodes = (root, doc, predicate) => {
    const walker = doc.createTreeWalker(root, doc.defaultView.NodeFilter.SHOW_TEXT);
    const nodes = [];

    while (walker.nextNode()) {
      if (!predicate || predicate(walker.currentNode)) {
        nodes.push(walker.currentNode);
      }
    }

    return nodes;
  };

  /** True when the node sits inside literal-text markup we must not touch. */
  const isLiteralContext = (node) => !!node.parentElement?.closest("code, pre, script, style");

  /**
   * Replace `{% include figure.liquid ... %}` with an approximation of what
   * _includes/figure.liquid emits: a <figure> wrapping the image and, when a
   * caption is given, a <figcaption class="caption">.
   *
   * The srcset/WebP variants the real include generates cannot exist here —
   * they are produced by jekyll-imagemagick at BUILD time — so the preview
   * shows the original file. Layout and caption are what an author needs to
   * check; the variant pipeline is not something the preview can lie about
   * usefully.
   *
   * The <figure> is spliced into the text node's position rather than built by
   * setting innerHTML, so surrounding prose and entities are left untouched.
   * A <figure> is not legal inside a <p>, but inserting via the DOM (rather
   * than parsing HTML) means the browser will not re-nest it.
   */
  const renderFigureIncludes = (root, doc, getAsset) => {
    collectTextNodes(root, doc, (node) => node.nodeValue.includes("figure.liquid")).forEach((node) => {
      if (isLiteralContext(node)) {
        return;
      }

      const text = node.nodeValue;
      const fragment = doc.createDocumentFragment();
      let cursor = 0;
      let matched = false;

      FIGURE_PATTERN.lastIndex = 0;

      for (const match of text.matchAll(FIGURE_PATTERN)) {
        matched = true;

        if (match.index > cursor) {
          fragment.append(doc.createTextNode(text.slice(cursor, match.index)));
        }

        const args = parseIncludeArgs(match[1]);
        const figure = doc.createElement("figure");
        const img = doc.createElement("img");

        img.setAttribute("src", resolveAssetURL(args.path, getAsset));
        img.setAttribute("alt", args.alt ?? "");

        if (args.class) {
          img.setAttribute("class", args.class);
        }

        figure.append(img);

        if (args.caption) {
          const caption = doc.createElement("figcaption");

          caption.className = "caption";
          caption.textContent = args.caption;
          figure.append(caption);
        }

        fragment.append(figure);
        cursor = match.index + match[0].length;
      }

      if (!matched) {
        return;
      }

      if (cursor < text.length) {
        fragment.append(doc.createTextNode(text.slice(cursor)));
      }

      node.replaceWith(fragment);
    });
  };

  /** The direct child of `root` that contains `node`, or undefined. */
  const topLevelBlockFor = (root, node) => {
    let current = node;

    while (current && current.parentNode && current.parentNode !== root) {
      current = current.parentNode;
    }

    return current?.parentNode === root ? current : undefined;
  };

  /**
   * Emulate _plugins/marginnote.rb: wrap everything between `{% marginnote %}`
   * and `{% endmarginnote %}` in <aside class="marginnote">.
   *
   * The markers are not necessarily paragraphs of their own — in practice they
   * sit at the start of the first line and the end of the last line of the
   * block, so Markdown folds them INTO the neighbouring paragraphs. So rather
   * than matching whole elements, this finds the marker text nodes, strips the
   * marker text, and wraps the span of top-level blocks between them.
   *
   * Only the non-floated form is reproduced. The float is applied on the live
   * site by `.container.margin-math .marginnote` on wide viewports, which
   * depends on page-level front matter the CMS does not set — so the preview
   * shows the same fallback a normal post gets.
   */
  const renderMarginNotes = (root, doc) => {
    for (;;) {
      const textNodes = collectTextNodes(root, doc, (node) => !isLiteralContext(node));
      const openNode = textNodes.find((node) => node.nodeValue.includes(MARGINNOTE_OPEN));

      if (!openNode) {
        return;
      }

      const closeNode = textNodes.find((node) => node.nodeValue.includes(MARGINNOTE_CLOSE));

      openNode.nodeValue = openNode.nodeValue.replace(MARGINNOTE_OPEN, "");

      if (!closeNode) {
        // Unclosed tag: the author is mid-typing. Dropping the opener is
        // enough to keep this loop from spinning.
        continue;
      }

      closeNode.nodeValue = closeNode.nodeValue.replace(MARGINNOTE_CLOSE, "");

      const firstBlock = topLevelBlockFor(root, openNode);
      const lastBlock = topLevelBlockFor(root, closeNode);

      if (!firstBlock || !lastBlock) {
        continue;
      }

      const aside = doc.createElement("aside");
      const blocks = [];

      aside.className = "marginnote";

      for (let block = firstBlock; block; block = block.nextSibling) {
        blocks.push(block);

        if (block === lastBlock) {
          break;
        }
      }

      firstBlock.before(aside);
      aside.append(...blocks);
    }
  };

  /**
   * Mark any Liquid this preview does not implement, so an author can tell at
   * a glance that the braces are an unrendered tag rather than page text. The
   * alternative — hiding it — would make the preview quietly disagree with the
   * published page about what is on it.
   */
  const flagUnrenderedLiquid = (root, doc) => {
    collectTextNodes(root, doc, (node) => node.nodeValue.includes("{%") && !isLiteralContext(node)).forEach(
      (node) => {
        const text = node.nodeValue;
        const fragment = doc.createDocumentFragment();
        let cursor = 0;
        let matched = false;

        for (const match of text.matchAll(LEFTOVER_LIQUID_PATTERN)) {
          matched = true;

          if (match.index > cursor) {
            fragment.append(doc.createTextNode(text.slice(cursor, match.index)));
          }

          const marker = doc.createElement("code");

          marker.className = "cms-unrendered-liquid";
          marker.title = "Liquid tag — rendered by Jekyll on the live site, not in this preview.";
          marker.textContent = match[0];
          fragment.append(marker);
          cursor = match.index + match[0].length;
        }

        if (!matched) {
          return;
        }

        if (cursor < text.length) {
          fragment.append(doc.createTextNode(text.slice(cursor)));
        }

        node.replaceWith(fragment);
      },
    );
  };

  /* ----------------------------------------------------------------- math */

  /**
   * Rewrite "$$...$$" into MathJax's \(...\) / \[...\] delimiters, choosing
   * inline vs display the way kramdown does on the live site: an equation that
   * is the ENTIRE content of its block is display math; one sitting inside a
   * sentence is inline.
   *
   * This walks text nodes only and just rewrites their values, so it never
   * touches element structure and never re-parses HTML (no entity-mangling).
   */
  const emulateKramdownDelimiters = (root, doc) => {
    collectTextNodes(root, doc, (node) => node.nodeValue.includes("$$")).forEach((node) => {
      // A <script>/<style>/<code> block is literal text, not prose — leave it
      // alone so a fenced example showing "$$" doesn't get typeset.
      if (isLiteralContext(node)) {
        return;
      }

      const blockText = node.parentElement ? node.parentElement.textContent.trim() : "";

      node.nodeValue = node.nodeValue.replace(MATH_PATTERN, (match, body) => {
        // Display when the equation is all its block contains, matching
        // kramdown's block-level rule.
        const isDisplay = match.trim() === blockText;

        return isDisplay ? `\\[${body}\\]` : `\\(${body}\\)`;
      });
    });
  };

  /**
   * Load MathJax into the preview iframe, once. `win.MathJax` must be assigned
   * BEFORE the script runs — that object is how MathJax 3 takes its config.
   * Returns a promise that resolves when MathJax is ready to typeset.
   */
  const loadMathJax = (doc, win) => {
    if (win.__mathJaxReady) {
      return win.__mathJaxReady;
    }

    win.MathJax = {
      tex: {
        tags: "ams",
        // Delimiters produced by emulateKramdownDelimiters() above, identical
        // to what kramdown emits on the live site. "$" is deliberately NOT a
        // delimiter here (same reasoning as assets/js/mathjax-setup.js: bare
        // dollar signs in prose are prices and shell snippets, not math).
        inlineMath: [["\\(", "\\)"]],
        displayMath: [["\\[", "\\]"]],
      },
      options: {
        // Never typeset the CMS's own chrome, only rendered post content.
        skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"],
      },
      startup: {
        // We drive typesetting ourselves after each preview render.
        typeset: false,
      },
    };

    win.__mathJaxReady = new Promise((resolve, reject) => {
      const script = doc.createElement("script");

      script.src = MATHJAX_URL;
      script.async = true;
      script.integrity = MATHJAX_SRI;
      script.crossOrigin = "anonymous";
      script.addEventListener("load", () => resolve(win.MathJax.startup.promise));
      script.addEventListener("error", () => {
        // Most likely cause is a Content-Security-Policy on /admin blocking the
        // CDN. Surface it instead of leaving a silently math-less preview.
        console.error("[preview] MathJax failed to load from the CDN; preview equations will stay as raw $$ text.");
        reject(new Error("MathJax failed to load"));
      });

      (doc.head || doc.documentElement).appendChild(script);
    });

    return win.__mathJaxReady;
  };

  /* ------------------------------------------------------------ component */

  /** Read a field off the entry without ever letting a throw blank the pane. */
  const readField = (entry, name) => {
    try {
      return entry?.getIn?.(["data", name]) ?? "";
    } catch {
      return "";
    }
  };

  const PostPreview = window.createClass({
    componentDidMount() {
      this.applyTheme();
      this.observeSource();
      this.refresh();
    },

    componentDidUpdate() {
      this.observeSource();
      this.refresh();
    },

    componentWillUnmount() {
      window.clearTimeout(this.typesetTimer);
      this.sourceObserver?.disconnect();
    },

    refresh() {
      this.syncPreview();
      this.scheduleTypeset();
    },

    /**
     * Watch the hidden widget container for changes.
     *
     * `widgetFor()` returns a plain <div> whose React ref MOUNTS A SVELTE
     * COMPONENT into it (see Sveltia's createWidgetFor). Refs fire before
     * componentDidMount/DidUpdate, so the markup is normally there by the time
     * we copy it — but Svelte's own updates land in a microtask, and relying on
     * that ordering would mean a silently blank preview if it ever changed.
     * Observing the container instead makes the copy event-driven: whatever
     * Sveltia renders, whenever it renders it, we pick it up.
     *
     * No feedback loop is possible: every transform writes to `previewRoot`,
     * never to `sourceRoot`.
     */
    observeSource() {
      const win = this.props.window;
      const source = this.sourceRoot;

      if (!win?.MutationObserver || !source || this.observedSource === source) {
        return;
      }

      this.sourceObserver?.disconnect();
      this.observedSource = source;
      this.sourceObserver = new win.MutationObserver(() => this.refresh());
      this.sourceObserver.observe(source, { childList: true, subtree: true, characterData: true });
    },

    /**
     * main.css keys its dark palette off `html[data-theme="dark"]`, which only
     * the site's own theme toggle sets. Mirror the viewer's OS preference so
     * the preview isn't a white slab inside a dark CMS.
     */
    applyTheme() {
      const doc = this.props.document;
      const win = this.props.window;

      if (!doc || !win?.matchMedia) {
        return;
      }

      const media = win.matchMedia("(prefers-color-scheme: dark)");
      const sync = () => {
        doc.documentElement.dataset.theme = media.matches ? "dark" : "light";
      };

      sync();
      media.addEventListener("change", sync);
    },

    /**
     * Copy the Markdown widget's output out of React's tree and run every
     * Liquid/image transform on the copy. See the header comment for why the
     * transforms cannot run on the widget's own DOM.
     */
    syncPreview() {
      const doc = this.props.document;
      const source = this.sourceRoot;
      const root = this.previewRoot;

      if (!doc || !source || !root) {
        return;
      }

      root.innerHTML = source.innerHTML;

      try {
        // Order matters: marginnote wrapping moves whole blocks around, so it
        // runs before anything splices nodes into those blocks. Leftover-Liquid
        // flagging runs last, once the tags we DO implement are gone.
        renderMarginNotes(root, doc);
        renderFigureIncludes(root, doc, this.props.getAsset);
        resolveImages(root, this.props.getAsset);
        flagUnrenderedLiquid(root, doc);
      } catch (error) {
        console.error("[preview] transform failed:", error);
      }
    },

    scheduleTypeset() {
      window.clearTimeout(this.typesetTimer);
      this.typesetTimer = window.setTimeout(() => this.typeset(), TYPESET_DEBOUNCE_MS);
    },

    typeset() {
      // The iframe's own document/window, per the documented props. Using the
      // globals here would target the CMS shell instead of the preview.
      const doc = this.props.document;
      const win = this.props.window;
      const root = this.previewRoot;

      if (!doc || !win || !root) {
        return;
      }

      loadMathJax(doc, win)
        .then(() => {
          emulateKramdownDelimiters(root, doc);
          // Drop the previous render's math items so re-typesetting an edited
          // preview doesn't stack duplicate output.
          win.MathJax.typesetClear([root]);

          return win.MathJax.typesetPromise([root]);
        })
        .catch((error) => {
          console.error("[preview] typeset failed:", error);
        });
    },

    render() {
      const { entry } = this.props;
      const title = readField(entry, "title");
      // The datetime widget hands back either the "YYYY-MM-DD HH:mm:ss" string
      // from the front matter or a Date, depending on how it was last touched.
      const rawDate = readField(entry, "date");
      const date =
        rawDate instanceof Date
          ? rawDate.toISOString().slice(0, 10)
          : String(rawDate || "").slice(0, 10);

      // This mirrors _layouts/post.liquid's structure, which is what the
      // `.post`, `.post-title` and `.post .post-content` rules in main.css are
      // written against. Matching it is the whole reason the site stylesheet
      // has anything to style.
      return window.h(
        "div",
        { className: "post" },
        window.h(
          "header",
          { className: "post-header" },
          window.h("h1", { className: "post-title" }, title),
          date ? window.h("p", { className: "post-meta" }, `Created on ${date}`) : null,
        ),
        // Rendered by React, read by us, never shown.
        window.h("div", {
          hidden: true,
          ref: (node) => {
            this.sourceRoot = node;
          },
          children: this.props.widgetFor("body"),
        }),
        window.h(
          "article",
          { className: "post-content" },
          // React renders this EMPTY and so never diffs its children; we own
          // everything inside it.
          window.h("div", {
            id: "markdown-content",
            ref: (node) => {
              this.previewRoot = node;
            },
          }),
        ),
      );
    },
  });

  window.CMS.registerPreviewTemplate("blog", PostPreview);

  // The site's own compiled stylesheet, loaded into the preview iframe as a
  // <link>. This is what makes the preview look like the site rather than like
  // Sveltia.
  //
  // The `?cms=` timestamp is NOT decoration. The deploy serves /assets/* with
  // `Cache-Control: public, max-age=31536000, immutable` (see the headers
  // block in .github/workflows/deploy.yml), and the site's own pages dodge that
  // with a per-build `?v=` hash this static file cannot know. Without a
  // cache-buster the CMS would keep whatever main.css it first saw for a year,
  // and the preview would silently drift away from the deployed site. One
  // timestamp per page load: fresh on reload, cached within the session.
  //
  // Note also that purgecss.config.js scans _site/**/*.js, so the class names
  // referenced in THIS file are what keeps the deploy's purge step from
  // stripping the rules the preview depends on (`.marginnote` in particular,
  // which no page uses while its only post is a draft).
  window.CMS.registerPreviewStyle(`/assets/css/main.css?cms=${Date.now()}`);

  // Gap fillers, registered AFTER main.css so they win where they overlap.
  window.CMS.registerPreviewStyle(
    `/* The site loads Bootstrap + MDB too; only the handful of utility classes
        that actually appear in post bodies are worth reproducing here. */
     .post { padding: 1.5rem 1.25rem 3rem; max-width: 860px; margin: 0 auto; }
     .img-fluid { max-width: 100%; height: auto; }
     .rounded { border-radius: .25rem; }
     .z-depth-1 { box-shadow: 0 2px 5px rgba(0,0,0,.16), 0 2px 10px rgba(0,0,0,.12); }
     figure { margin: 1.5rem 0; }
     figure img { display: block; width: 100%; }
     figcaption.caption { font-size: .875rem; color: var(--global-text-color-light); margin-top: .5rem; }

     /* Liquid this preview does not implement — flagged, not hidden. */
     .cms-unrendered-liquid {
       background: var(--global-code-bg-color);
       border: 1px dashed var(--global-divider-color);
       border-radius: 3px;
       padding: 0 .25em;
       font-size: .85em;
       opacity: .75;
     }

     /* Keep equations legible on the CMS's dark theme, and let wide display
        math scroll rather than overflow the pane. */
     .mjx-container { color: inherit; }
     mjx-container[display="true"] { overflow-x: auto; overflow-y: hidden; }`,
    { raw: true },
  );
})();
