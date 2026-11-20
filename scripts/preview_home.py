#!/usr/bin/env python3
"""A Ruby-free preview of the homepage: _pages/cool-home.html with its Liquid taken out, as .preview/index.html.

    python3 scripts/build_cool.py                 # first: _cool/ → assets/cool/data/work.json and _data/cool.json
    python3 scripts/preview_home.py               # write .preview/index.html (and link .preview/assets → assets)
    python3 scripts/preview_home.py --serve 8123  # the same, then serve .preview/ at http://localhost:8123/
    python3 scripts/preview_home.py --standalone ../previews/home.html   # also one self-contained file that opens from disk

It renders the page as Jekyll does for a site with no blog posts: the front matter, the includes and the
`site.posts` blocks go, and the two Liquid values (site.lang, site.data.cool.work_json) are filled in.
Only the homepage is previewed; /standard/ and the other al-folio pages need a real Jekyll build."""
import base64, functools, http.server, json, os, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / ".preview"
TAG = re.compile(r"\{%-?\s*(.*?)\s*-?%\}", re.S)
OPEN, CLOSE = ("if", "unless", "for", "comment", "capture", "case"), ("endif", "endunless", "endfor", "endcomment", "endcapture", "endcase")


def deliquid(part, work_json):
    """One stretch of template outside {% raw %}: drop every block tag with its contents, and includes; fill the values."""
    out, pos, depth = [], 0, 0
    for m in TAG.finditer(part):
        word = m.group(1).split()[0]
        if depth == 0: out.append(part[pos:m.start()])
        if word in OPEN: depth += 1
        elif word in CLOSE: depth -= 1
        elif word != "include" and depth == 0: sys.exit(f"preview_home.py: Liquid tag it does not know: {m.group(0)!r}")
        pos = m.end()
    if depth: sys.exit("preview_home.py: unbalanced Liquid block")
    out.append(part[pos:])
    s = "".join(out)
    s = s.replace("{{ site.lang }}", "en").replace("{{ site.data.cool.work_json }}", work_json)
    s = re.sub(r'<link rel="canonical" href="\{\{[^}]*\}\}">\n?', "", s)
    if "{{" in s or "{%" in s: sys.exit(f"preview_home.py: Liquid left over: {s[max(0, s.find('{{')):][:120]!r}")
    return s


def build():
    src = (ROOT / "_pages" / "cool-home.html").read_text(encoding="utf-8")
    src = re.sub(r"\A---\n.*?\n---\n", "", src, count=1, flags=re.S)
    try:
        work_json = json.loads((ROOT / "_data" / "cool.json").read_text())["work_json"]
    except FileNotFoundError:
        sys.exit("preview_home.py: _data/cool.json is missing; run python3 scripts/build_cool.py first")
    parts = re.split(r"\{%-?\s*(?:raw|endraw)\s*-?%\}", src)   # even: template, odd: raw
    html = "".join(p if n % 2 else deliquid(p, work_json) for n, p in enumerate(parts))
    html = html.replace("<head>", '<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<title>Alexander Kim (preview)</title>', 1)
    OUT.mkdir(exist_ok=True)
    (OUT / "index.html").write_text(html, encoding="utf-8")
    link = OUT / "assets"
    if not link.is_symlink() and not link.exists(): os.symlink(os.path.join("..", "assets"), link)
    print(f"wrote {(OUT / 'index.html').relative_to(ROOT)} ({len(html)} bytes), data {work_json}")
    return html, work_json


IMG = {".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}


def inline_images(x):
    if isinstance(x, dict): return {k: inline_images(v) for k, v in x.items()}
    if isinstance(x, list): return [inline_images(v) for v in x]
    if isinstance(x, str) and x.startswith("/assets/"):
        f = ROOT / x.split("?")[0].lstrip("/")
        if f.suffix.lower() in IMG and f.is_file(): return f"data:{IMG[f.suffix.lower()]};base64," + base64.b64encode(f.read_bytes()).decode()
    return x


def standalone(html, work_json, path):
    """One file that opens from disk: work.json goes inline in place of the fetch, and the images it names (logos, thumbs)
    go inline as data: URLs, so nothing has to be served."""
    data = inline_images(json.loads((ROOT / work_json.split("?")[0].lstrip("/")).read_text(encoding="utf-8")))
    call = f'fetch("{work_json}").then(r => {{ if (!r.ok) throw new Error(r.status); return r.json(); }})'
    if html.count(call) != 1: sys.exit("preview_home.py: the homepage's fetch of work.json is not where --standalone expects it")
    out = html.replace(call, "Promise.resolve(" + json.dumps(data, ensure_ascii=False).replace("</", "<\\/") + ")")
    Path(path).write_text(out, encoding="utf-8")
    print(f"wrote {path} ({len(out)} bytes, self-contained)")


def main(argv):
    html, work_json = build()
    if "--standalone" in argv: standalone(html, work_json, argv[argv.index("--standalone") + 1])
    if "--serve" in argv:
        k = argv.index("--serve")
        port = int(argv[k + 1]) if len(argv) > k + 1 else 8123
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(OUT))
        handler.extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map}
        print(f"serving {OUT} at http://localhost:{port}/  (ctrl-c to stop)")
        with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as srv:
            try: srv.serve_forever()
            except KeyboardInterrupt: pass


if __name__ == "__main__":
    main(sys.argv[1:])
