#!/usr/bin/env python3
"""Builds the homepage data (assets/cool/data/work.json) from _cool/, the only source.

    python3 scripts/build_cool.py               # check _cool/, then write the outputs
    python3 scripts/build_cool.py --check       # check only, write nothing
    python3 scripts/build_cool.py --root DIR    # another checkout (the tests use this)

_cool/ is edited in the admin (/admin/ → Homepage) or by hand:
    site.json       name, tagline, the link row, group order, never_mention
    axes.json       the column sets (topics, methods, tools, output): label and entries { label, head }
    items/<id>.json one piece of work each; its weights per axis are lists of { entry, weight 0-1, source }
    skills.json     the Skills view: stages (bottom to top, one marked base), skills, used (skill → items), edges
    logos.json      per logo file: dark variant, small variant, light plate, scale

Outputs, both generated and not committed (CI runs this before Jekyll):
    assets/cool/data/work.json   what the page fetches
    _data/cool.json              the versioned URL of work.json, read by _pages/cool-home.html

Every run checks the content and stops with a list of problems instead of writing a bad file, so a bad edit
fails CI before deploy and the live site keeps the last good build. Blog posts (_posts/) that set
related_items are checked too: each id must be a homepage item."""
import hashlib, json, re, sys
from pathlib import Path

GROUP_WORDS = {"research": "Research", "publication": "Abstracts & posters", "venture": "Venture", "project": "Projects"}
ICONS = ["github", "linkedin", "cv", "email", "orcid", "scholar"]   # the icons the page draws (ICON in _pages/cool-home.html)
ITEM_REQ = ["id", "group", "name", "context", "summary", "start", "title", "org", "topics"]
ITEM_OPT = ["description", "end", "bullets", "links", "thumb", "image", "table", "logo", "logo_note", "roles", "order", "notes"]
MON = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()
YM = re.compile(r"\d{4}-(0[1-9]|1[0-2])$")
ID = re.compile(r"[a-z0-9][a-z0-9-]*$")
URL = re.compile(r"(https?://[^\s/$.?#][^\s]*|mailto:[^\s@]+@[^\s@]+\.[^\s@]+|/[^\s]*)$")
PHONE = re.compile(r"(?<![\d.])(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?![\d.])")


class Problems(list):
    def __call__(self, msg): self.append(msg)


def fmt_range(a, b):
    m = lambda d: MON[int(d[5:]) - 1]
    if b is None: return a[:4]
    if b == "present": return f"{m(a)} {a[:4]}–Present"
    if a == b: return f"{m(a)} {a[:4]}"   # a one-month event (a poster, a talk)
    if a[:4] == b[:4]: return f"{m(a)}–{m(b)} {a[:4]}"
    return f"{m(a)} {a[:4]}–{m(b)} {b[:4]}"


def strings(x, path=""):
    if isinstance(x, str): yield path, x
    elif isinstance(x, dict):
        for k, v in x.items():
            yield from strings(k, path + "/" + k)
            yield from strings(v, f"{path}/{k}")
    elif isinstance(x, list):
        for n, v in enumerate(x): yield from strings(v, f"{path}[{n}]")


def opt(d, k):
    """An optional field: missing, null and "" (what the admin saves for a cleared box) all mean not set."""
    v = d.get(k)
    return None if v is None or (isinstance(v, str) and not v.strip()) else v


def is_text(v): return isinstance(v, str) and bool(v.strip())


class Build:
    def __init__(self, root):
        self.root = Path(root)
        self.src = self.root / "_cool"
        self.err = Problems()

    # ---------------------------------------------------------------- reading
    def load(self, rel):
        p = self.src / rel
        try:
            v = json.loads(p.read_text(encoding="utf-8"))
        except FileNotFoundError:
            self.err(f"_cool/{rel}: file is missing"); return {}
        except json.JSONDecodeError as e:
            self.err(f"_cool/{rel}: not valid JSON (line {e.lineno}, column {e.colno}: {e.msg})"); return {}
        if not isinstance(v, dict): self.err(f"_cool/{rel}: must hold a {{ ... }} object"); return {}
        return v

    def asset(self, where, path, what="file"):
        """A site path like /assets/cool/x.jpg that must exist in the repo; returns it or None."""
        if not isinstance(path, str) or not path.startswith("/assets/"):
            self.err(f"{where}: {what} {path!r} must be a path under /assets/ (upload it in the admin)"); return None
        if ".." in path.split("/") or not (self.root / path.lstrip("/")).is_file():
            self.err(f"{where}: {what} {path!r} not found in the repo"); return None
        return path

    def versioned(self, path):
        # vercel.json serves /assets/* as immutable for a year, so a changed file needs a new URL
        return f"{path}?v={hashlib.sha256((self.root / path.lstrip('/')).read_bytes()).hexdigest()[:10]}"

    def link(self, where, url):
        if not isinstance(url, str) or not URL.match(url.strip()) or url != url.strip():
            self.err(f"{where}: link {url!r} must start with https://, mailto: or /")
        elif url.startswith("tel:"):
            self.err(f"{where}: phone links are not allowed")

    # ---------------------------------------------------------------- checks
    def check_site(self, site):
        for k in ("name", "tagline", "standard_view"):
            if not is_text(site.get(k)): self.err(f"Site settings: `{k}` is missing")
        links = site.get("links")
        if not isinstance(links, list) or not links: self.err("Site settings: `links` must list at least one link"); links = []
        for n, l in enumerate(links):
            where = f"Site settings: link {n + 1} ({l.get('label', '?') if isinstance(l, dict) else '?'})"
            if not isinstance(l, dict): self.err(f"{where}: must be {{ label, url, icon }}"); continue
            if not is_text(l.get("label")): self.err(f"{where}: needs a label")
            self.link(where, l.get("url"))
            if l.get("icon") not in ICONS: self.err(f"{where}: icon {l.get('icon')!r} must be one of {', '.join(ICONS)}")
        order = site.get("group_order", list(GROUP_WORDS))
        if not isinstance(order, list) or sorted(order) != sorted(GROUP_WORDS):
            self.err(f"Site settings: group order {order!r} must list each of {', '.join(GROUP_WORDS)} once")
            order = list(GROUP_WORDS)
        nm = site.get("never_mention", [])
        if not isinstance(nm, list) or not all(is_text(w) for w in nm): self.err("Site settings: `never_mention` must be a list of words"); nm = []
        return order, nm

    def check_axes(self, axes):
        if "topics" not in axes: self.err("Axes: the `topics` axis is missing")
        out = {}
        for ax, A in axes.items():
            tag = f"Axes: {ax}"
            if not ID.match(ax): self.err(f"{tag}: axis id must be lowercase letters, digits or -")
            if not isinstance(A, dict): self.err(f"{tag}: must be {{ label, entries }}"); continue
            if not is_text(A.get("label")): self.err(f"{tag}: needs a label")
            ent = A.get("entries")
            if not isinstance(ent, list) or not ent: self.err(f"{tag}: needs at least one entry"); continue
            labels = []
            for n, e in enumerate(ent):
                if not isinstance(e, dict) or not is_text(e.get("label")): self.err(f"{tag}: entry {n + 1} needs a label"); continue
                if e["label"] in labels: self.err(f"{tag}: entry {e['label']!r} is listed twice")
                if "head" in e and e["head"] is not None and not isinstance(e["head"], str): self.err(f"{tag}: entry {e['label']!r}: short name must be text")
                labels.append(e["label"])
            out[ax] = (A, [e for e in ent if isinstance(e, dict) and is_text(e.get("label"))])
        return out

    def check_item(self, f, it, axes):
        stem = f.stem
        tag = f"Homepage item {it.get('name') or stem!r} (_cool/items/{f.name})"
        known = ITEM_REQ + ITEM_OPT + [a for a in axes if a != "topics"]
        for k in ITEM_REQ:
            if k not in it or it[k] in (None, "") : self.err(f"{tag}: `{k}` is missing")
        for k in it:
            if k not in known: self.err(f"{tag}: unknown field `{k}` (known: {', '.join(known)})")
        i = it.get("id")
        if not isinstance(i, str) or not ID.match(i): self.err(f"{tag}: id {i!r} must be lowercase letters, digits or - (it is the page's #link)")
        elif i != stem: self.err(f"{tag}: id {i!r} must match the file name {stem!r}")
        if i in GROUP_WORDS: self.err(f"{tag}: id {i!r} is also a group name, which the page uses as a #{i} filter link")
        for k in ("name", "context", "summary", "title", "org"):
            if k in it and not is_text(it[k]): self.err(f"{tag}: `{k}` must be text")
        if not opt(it, "description") and not it.get("bullets"): self.err(f"{tag}: needs a description or at least one bullet")
        if it.get("group") not in GROUP_WORDS: self.err(f"{tag}: group {it.get('group')!r} must be one of {', '.join(GROUP_WORDS)}")
        s, e = it.get("start", ""), opt(it, "end")
        if not YM.match(str(s)): self.err(f"{tag}: start {s!r} must look like 2026-08")
        if e is not None and e != "present" and not YM.match(str(e)): self.err(f"{tag}: end {e!r} must look like 2026-09 or be \"present\" (or leave it empty)")
        if e not in (None, "present") and YM.match(str(s)) and YM.match(str(e)) and e < s: self.err(f"{tag}: ends ({e}) before it starts ({s})")
        if opt(it, "order") is not None and (isinstance(it["order"], bool) or not isinstance(it["order"], (int, float))): self.err(f"{tag}: order must be a number")
        for k in ("thumb", "image"):
            if opt(it, k): self.asset(tag, it[k], k)
        if opt(it, "logo_note") and not opt(it, "logo"): self.err(f"{tag}: logo note without a logo")
        if opt(it, "logo"): self.asset(tag, it["logo"], "logo")
        bullets = it.get("bullets") or []
        if not isinstance(bullets, list) or not all(is_text(b) for b in bullets): self.err(f"{tag}: bullets must each be text (remove empty ones)")
        roles = it.get("roles") or []
        if not isinstance(roles, list): self.err(f"{tag}: roles must be a list"); roles = []
        for m, r in enumerate(roles):
            if not isinstance(r, dict) or not is_text(r.get("title")) or not YM.match(str(r.get("start", ""))) or not (opt(r, "end") in (None, "present") or YM.match(str(r["end"]))):
                self.err(f"{tag}: role {m + 1} needs a title, a start like 2026-10 and an end like 2026-09, \"present\" or empty")
        links = it.get("links") or []
        if not isinstance(links, list): self.err(f"{tag}: links must be a list"); links = []
        for m, l in enumerate(links):
            if not isinstance(l, dict) or not is_text(l.get("label")): self.err(f"{tag}: link {m + 1} needs a label"); continue
            self.link(f"{tag}: link {l['label']!r}", l.get("url"))
        if opt(it, "table"):
            rows = self.table(it["table"])
            if rows is None: self.err(f"{tag}: table must be text, one row per line, cells split by |")
            elif len({len(r) for r in rows}) > 1: self.err(f"{tag}: table rows have different numbers of cells ({', '.join(str(len(r)) for r in rows)})")
        # weights, one list per axis
        W = {}
        for ax, (A, ent) in axes.items():
            labels = [x["label"] for x in ent]
            rows = it.get(ax, [])
            if rows is None: rows = []
            if not isinstance(rows, list): self.err(f"{tag}: {A.get('label', ax)} must be a list of {{ entry, weight }}"); rows = []
            got = {}
            for r in rows:
                if not isinstance(r, dict): self.err(f"{tag}: {A.get('label', ax)}: each row needs an entry and a weight"); continue
                l, v = r.get("entry"), r.get("weight")
                where = f"{tag}: {A.get('label', ax)} {l!r}"
                if l not in labels: self.err(f"{where}: not an entry of the {A.get('label', ax)} axis (entries: {', '.join(labels)})"); continue
                if l in got: self.err(f"{where}: listed twice"); continue
                if isinstance(v, bool) or not isinstance(v, (int, float)): self.err(f"{where}: weight {v!r} is not a number"); continue
                if not 0 <= v <= 1: self.err(f"{where}: weight {v} is outside 0-1"); continue
                got[l] = float(v)
            W[ax] = [got.get(l, 0.0) for l in labels]
        return W

    @staticmethod
    def table(text):
        if not isinstance(text, str): return None
        rows = [[c.strip() for c in line.split("|")] for line in text.strip().splitlines() if line.strip()]
        return rows or None

    def check_skills(self, S, ids):
        if not S: return None
        stages, skills, used, edges = S.get("stages"), S.get("skills"), S.get("used") or [], S.get("edges") or []
        for k in S:
            if k not in ("stages", "skills", "used", "edges"): self.err(f"Skills: unknown key `{k}` (known: stages, skills, used, edges)")
        if not isinstance(stages, list) or not stages: self.err("Skills: needs at least one stage"); stages = []
        labels, base = [], []
        for n, b in enumerate(stages):
            if not isinstance(b, dict) or not is_text(b.get("label")): self.err(f"Skills: stage {n + 1} needs a label"); continue
            if b["label"] in labels: self.err(f"Skills: stage {b['label']!r} is listed twice")
            labels.append(b["label"])
            if b.get("base"): base.append(b["label"])
        if len(base) != 1: self.err(f"Skills: exactly one stage must be the base (the row under all the others); now {len(base)}: {', '.join(base) or 'none'}")
        if not isinstance(skills, list): self.err("Skills: `skills` must be a list of { name, stage }"); skills = []
        names, by_stage = [], {l: [] for l in labels}
        for n, x in enumerate(skills):
            if not isinstance(x, dict) or not is_text(x.get("name")): self.err(f"Skills: skill {n + 1} needs a name"); continue
            if x["name"] in names: self.err(f"Skills: skill {x['name']!r} is listed twice")
            names.append(x["name"])
            if x.get("stage") not in by_stage: self.err(f"Skills: skill {x['name']!r}: stage {x.get('stage')!r} is not one of the stages ({', '.join(labels)})"); continue
            by_stage[x["stage"]].append(x["name"])
        for l, xs in by_stage.items():
            if not xs: self.err(f"Skills: stage {l!r} has no skills (give it one or remove it)")
        if not isinstance(used, list): self.err("Skills: `used` must be a list of { skill, items }"); used = []
        out_used, seen_used = {}, set()
        for n, u in enumerate(used):
            x = u.get("skill") if isinstance(u, dict) else None
            where = f"Skills: \"used in\" row {n + 1} ({x})"
            if x not in names: self.err(f"{where}: {x!r} is not one of the skills"); continue
            if x in seen_used: self.err(f"{where}: {x!r} has two rows (merge them)"); continue
            seen_used.add(x)
            its = u.get("items")
            if not isinstance(its, list) or not its: self.err(f"{where}: pick at least one item (or remove the row)"); continue
            for i in its:
                if i not in ids: self.err(f"{where}: unknown item id {i!r}")
            for i in sorted({i for i in its if its.count(i) > 1}): self.err(f"{where}: item {i!r} listed twice")
            out_used[x] = its
        if not isinstance(edges, list): self.err("Skills: `edges` must be a list of { from, to }"); edges = []
        out_edges, pairs, seen_from = [], set(), set()
        for n, ed in enumerate(edges):
            x = ed.get("from") if isinstance(ed, dict) else None
            where = f"Skills: edge row {n + 1} ({x})"
            if x not in names: self.err(f"{where}: {x!r} is not one of the skills"); continue
            if x in seen_from: self.err(f"{where}: {x!r} has two rows (merge them)"); continue
            seen_from.add(x)
            tos = ed.get("to")
            if not isinstance(tos, list) or not tos: self.err(f"{where}: pick at least one skill it feeds (or remove the row)"); continue
            for y in tos:
                if y not in names: self.err(f"{where}: {y!r} is not one of the skills")
                elif y == x: self.err(f"{where}: a skill can't feed itself")
                elif (x, y) in pairs: self.err(f"{where}: {y!r} listed twice")
                elif (y, x) in pairs: self.err(f"{where}: {x!r} → {y!r}: the reverse edge is already listed (draw one edge, not a cycle)")
                else: pairs.add((x, y)); out_edges.append([x, y])
        if not names or len(base) != 1: return None
        return {"stages": [{"label": l, "skills": by_stage[l]} for l in labels if l != base[0]],
                "base": {"label": base[0], "skills": by_stage[base[0]]}, "used": out_used, "edges": out_edges}

    def check_logos(self, L):
        rows = L.get("logos", [])
        if not isinstance(rows, list): self.err("Logos: `logos` must be a list"); return {}
        out = {}
        for n, r in enumerate(rows):
            if not isinstance(r, dict) or not opt(r, "file"): self.err(f"Logos: row {n + 1} needs a logo file"); continue
            where = f"Logos: {r['file']}"
            if r["file"] in out: self.err(f"{where}: listed twice")
            self.asset(where, r["file"], "logo")
            for k in ("dark", "small", "small_dark"):
                if opt(r, k): self.asset(where, r[k], f"{k.replace('_', ' ')} variant")
            if opt(r, "small_dark") and not opt(r, "small"): self.err(f"{where}: a small dark variant needs a small variant")
            sc = opt(r, "scale")
            if sc is not None and (isinstance(sc, bool) or not isinstance(sc, (int, float)) or not 0.25 <= sc <= 4): self.err(f"{where}: scale {sc!r} must be a number from 0.25 to 4")
            out[r["file"]] = r
        return out

    def check_posts(self, ids):
        """Published blog posts that list related_items must name homepage items."""
        posts = sorted((self.root / "_posts").glob("*.md")) if (self.root / "_posts").is_dir() else []
        for p in posts:
            fm = self.front_matter(p)
            if fm is None or fm.get("published") is False: continue
            rel = fm.get("related_items")
            if rel is None: continue
            if not isinstance(rel, list): self.err(f"Blog post {p.name}: related items must be a list of item ids"); continue
            for i in rel:
                if str(i) not in ids: self.err(f"Blog post {p.name}: related item {i!r} is not a homepage item")

    def front_matter(self, p):
        text = p.read_text(encoding="utf-8")
        m = re.match(r"---\s*\n(.*?)\n---\s*(\n|$)", text, re.S)
        if not m: return {}
        if "related_items" not in m.group(1): return {}   # nothing to check, so no YAML parser needed
        try:
            import yaml
        except ImportError:
            sys.exit("build_cool.py: PyYAML is needed to read blog post front matter (pip install pyyaml)")
        try:
            fm = yaml.safe_load(m.group(1))
        except yaml.YAMLError as e:
            self.err(f"Blog post {p.name}: front matter is not valid YAML: {e}"); return None
        return fm if isinstance(fm, dict) else {}

    # ---------------------------------------------------------------- build
    def run(self):
        err = self.err
        site, axes_in, skills_in, logos_in = self.load("site.json"), self.load("axes.json"), self.load("skills.json"), self.load("logos.json")
        files = sorted((self.src / "items").glob("*.json"))
        if not files: err("_cool/items/: no items")
        raw = [(f, self.load(f"items/{f.name}")) for f in files]
        order_in, banned = self.check_site(site)
        GROUPS = [(g, GROUP_WORDS[g]) for g in order_in]
        axes = self.check_axes(axes_in)
        ids, items, W = set(), [], {}
        for f, it in raw:
            if not it: continue
            w = self.check_item(f, it, axes)
            if it.get("id") in ids: err(f"Homepage item {it.get('name')!r}: id {it.get('id')!r} is used twice")
            ids.add(it.get("id")); items.append(it); W[it.get("id")] = w
        logos = self.check_logos(logos_in)
        skills = self.check_skills(skills_in, ids)
        self.check_posts(ids)
        everything = {"site": {k: v for k, v in site.items() if k != "never_mention"}, "axes": axes_in, "items": [it for _, it in raw], "skills": skills_in, "logos": logos_in}
        for path, s in strings(everything):
            for w in banned:
                if w.lower() in s.lower(): err(f"{path}: mentions {w!r}, which is on never_mention in Site settings")
            if PHONE.search(s): err(f"{path}: looks like a phone number, which the site never shows")
        if err: return None

        notes = []
        axes_out = []
        for ax, (A, ent) in axes.items():
            used = [sum(W[i][ax][j] > 0 for i in W) for j in range(len(ent))]
            keep = [j for j in range(len(ent)) if 0 < used[j] < len(items)]
            for j in range(len(ent)):
                if used[j] == 0: notes.append(f"note: Axes: {ax} entry {ent[j]['label']!r} is not used by any item yet, so it is not shown")
                elif used[j] == len(items): notes.append(f"note: Axes: {ax} column {ent[j]['label']!r} is shared by every item, so it is dropped")
            axes_out.append((ax, A, ent, keep))

        order = {g: n for n, (g, _) in enumerate(GROUPS)}
        # group order, then newest first inside each group: by end (ongoing is newest; no end means it ended when it started),
        # then by start; items with the same dates go by `order` (lower first), then id
        recent = lambda it: ("9999-99" if opt(it, "end") == "present" else opt(it, "end") or it["start"], it["start"])
        items.sort(key=lambda it: (opt(it, "order") or 0, it["id"]))
        items.sort(key=recent, reverse=True)
        items.sort(key=lambda it: order[it["group"]])
        out_items = []
        for it in items:
            o = {k: it[k] for k in ("id", "group", "name", "context", "summary", "title", "org")}
            o["description"] = opt(it, "description") or ""
            o.update(start=it["start"], end=opt(it, "end"), date_label=fmt_range(it["start"], opt(it, "end")), bullets=it.get("bullets") or [],
                     links=[[l["label"], l["url"]] for l in it.get("links") or []],
                     thumb=self.versioned(it["thumb"]) if opt(it, "thumb") else None, image=self.versioned(it["image"]) if opt(it, "image") else None)
            if opt(it, "table"): o["table"] = self.table(it["table"])
            if it.get("roles"): o["roles"] = [[r["title"], fmt_range(r["start"], opt(r, "end"))] for r in it["roles"]]
            if opt(it, "logo"):
                # every logo on the page is inline-sized: the small variant (made to read at 12-16px) wins where there is one
                v = logos.get(it["logo"], {})
                small = opt(v, "small")
                dark = opt(v, "small_dark") if small else opt(v, "dark")
                o["logo"] = {"src": self.versioned(small or it["logo"]), "dark": self.versioned(dark) if dark else None,
                             "plate": bool(v.get("plate")), "word": bool(small), "scale": opt(v, "scale"), "note": opt(it, "logo_note")}   # word: a small variant is lettering, sized to cap height
            out_items.append(o)
        out_axes = []
        for ax, A, ent, keep in axes_out:
            X = [[W[it["id"]][ax][j] for j in keep] for it in items]
            out_axes.append({"id": ax, "label": A["label"],
                             "entries": [{"label": ent[j]["label"], "head": opt(ent[j], "head") or ent[j]["label"]} for j in keep],
                             "W": {it["id"]: [round(v, 3) for v in x] for it, x in zip(items, X)}})
            notes.append(f"axis {ax}: {len(keep)} columns")
        data = {"site": {k: site[k] for k in ("name", "tagline", "standard_view")} | {"links": [[l["label"], l["url"], l["icon"]] for l in site["links"]]},
                "groups": GROUPS, "items": out_items, "axes": out_axes}
        if skills: data["skills"] = skills
        return data, notes


def main(argv):
    args = list(argv)
    check = "--check" in args
    if check: args.remove("--check")
    root = Path(__file__).resolve().parent.parent
    if "--root" in args:
        k = args.index("--root"); root = Path(args[k + 1]); del args[k:k + 2]
    if args: sys.exit(__doc__.split("\n\n")[1])
    b = Build(root)
    res = b.run()
    if res is None:
        print(f"\nThe homepage content has {len(b.err)} problem(s), so nothing was built and the live site is unchanged:\n", file=sys.stderr)
        for m in b.err: print("  - " + m, file=sys.stderr)
        print("\nFix these in the admin (/admin/ → Homepage) or in _cool/, then save again.", file=sys.stderr)
        return 1
    data, notes = res
    for n in notes: print(n)
    if check:
        print(f"ok: {len(data['items'])} items, nothing written (--check)"); return 0
    text = json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n"
    out = root / "assets" / "cool" / "data" / "work.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    url = f"/assets/cool/data/work.json?v={hashlib.sha256(text.encode()).hexdigest()[:10]}"
    (root / "_data").mkdir(exist_ok=True)
    (root / "_data" / "cool.json").write_text(json.dumps({"work_json": url}) + "\n", encoding="utf-8")
    print(f"wrote {out.relative_to(root)} ({len(data['items'])} items) and _data/cool.json ({url})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
