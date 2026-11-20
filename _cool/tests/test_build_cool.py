"""Checks scripts/build_cool.py: the real content builds, and bad edits fail with a readable message.

    python3 -m unittest discover -s _cool/tests        # from the repo root (the blog post cases need PyYAML)

Each case copies _cool/ and assets/cool/ into a temp checkout, edits it, and runs the build there."""
import contextlib, importlib.util, io, json, shutil, tempfile, unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("build_cool", REPO / "scripts" / "build_cool.py")
bc = importlib.util.module_from_spec(spec); spec.loader.exec_module(bc)
try:
    import yaml  # noqa: F401
    HAVE_YAML = True
except ImportError:
    HAVE_YAML = False


class Checkout:
    def __init__(self):
        self.dir = Path(tempfile.mkdtemp())
        shutil.copytree(REPO / "_cool", self.dir / "_cool", ignore=shutil.ignore_patterns("tests"))
        shutil.copytree(REPO / "assets" / "cool", self.dir / "assets" / "cool", ignore=shutil.ignore_patterns("data"))

    def path(self, rel): return self.dir / rel
    def read(self, rel): return json.loads(self.path(rel).read_text(encoding="utf-8"))
    def write(self, rel, obj): self.path(rel).write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")

    def edit(self, rel, fn):
        obj = self.read(rel); fn(obj); self.write(rel, obj)

    def post(self, name, front):
        p = self.path("_posts"); p.mkdir(exist_ok=True)
        (p / name).write_text(f"---\n{front}\n---\nbody\n", encoding="utf-8")

    def run(self, *args):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = bc.main([*args, "--root", str(self.dir)])
        return code, out.getvalue(), err.getvalue()

    def close(self): shutil.rmtree(self.dir)


class BuildTest(unittest.TestCase):
    def setUp(self):
        self.c = Checkout()
        self.addCleanup(self.c.close)

    def fails_with(self, *needles):
        code, _, err = self.c.run("--check")
        self.assertEqual(code, 1, f"expected a failure, got:\n{err}")
        for n in needles: self.assertIn(n, err)
        self.assertIn("nothing was built and the live site is unchanged", err)
        return err

    def weights(self, item, ax, fn): self.c.edit(f"_cool/items/{item}.json", lambda it: fn(it[ax]))

    # ---------------------------------------------------------------- good content
    def test_real_content_builds(self):
        code, out, err = self.c.run()
        self.assertEqual(code, 0, err)
        data = json.loads(self.c.path("assets/cool/data/work.json").read_text())
        self.assertEqual(len(data["items"]), len(list((REPO / "_cool" / "items").glob("*.json"))))
        url = json.loads(self.c.path("_data/cool.json").read_text())["work_json"]
        self.assertRegex(url, r"^/assets/cool/data/work\.json\?v=[0-9a-f]{10}$")
        self.assertTrue(all(it["logo"]["src"].split("?v=")[1] for it in data["items"] if it.get("logo")))

    def test_build_is_deterministic(self):
        self.c.run(); a = self.c.path("assets/cool/data/work.json").read_bytes()
        self.c.run(); self.assertEqual(a, self.c.path("assets/cool/data/work.json").read_bytes())

    def test_check_writes_nothing(self):
        code, out, _ = self.c.run("--check")
        self.assertEqual(code, 0)
        self.assertFalse(self.c.path("assets/cool/data/work.json").exists())
        self.assertFalse(self.c.path("_data/cool.json").exists())

    def test_weight_edit_changes_output(self):
        self.c.run(); before = json.loads(self.c.path("assets/cool/data/work.json").read_text())
        self.weights("wilson", "topics", lambda rows: rows.__setitem__(0, {**rows[0], "weight": 0.2}))
        code, _, err = self.c.run(); self.assertEqual(code, 0, err)
        after = json.loads(self.c.path("assets/cool/data/work.json").read_text())
        topics = lambda d: next(a for a in d["axes"] if a["id"] == "topics")
        self.assertNotEqual(topics(before)["W"]["wilson"], topics(after)["W"]["wilson"])
        self.assertIn(0.2, topics(after)["W"]["wilson"])

    def test_cleared_optional_boxes_mean_unset(self):
        # the admin saves "" for a cleared optional field
        self.c.edit("_cool/items/wilson.json", lambda it: it.update(end="", logo="", logo_note="", thumb="", image="", description=it.get("description", "") or "x"))
        code, _, err = self.c.run(); self.assertEqual(code, 0, err)
        it0 = next(i for i in json.loads(self.c.path("assets/cool/data/work.json").read_text())["items"] if i["id"] == "wilson")
        self.assertEqual(it0["date_label"], it0["start"][:4]); self.assertNotIn("logo", it0); self.assertIsNone(it0["thumb"])

    def test_admin_save_shape_builds_identically(self):
        # What the admin (Sveltia, admin/config.yml) writes when it saves an untouched file, seen in a live run:
        # every configured field is present, empty text is "", an empty number is null, an empty list is [],
        # an off toggle is false. That must build exactly like the hand-written files that leave them out.
        self.c.run(); before = self.c.path("assets/cool/data/work.json").read_bytes()
        def item(it):
            for k in ("end", "logo", "logo_note", "description", "thumb", "image", "table", "notes"): it.setdefault(k, "")
            it.setdefault("order", None)
            for k in ("roles", "bullets", "links", "methods", "tools", "output"): it.setdefault(k, [])
            for ax in ("topics", "methods", "tools", "output"):
                for r in it[ax]: r.setdefault("source", "")
        for f in sorted(self.c.path("_cool/items").glob("*.json")): self.c.edit(f"_cool/items/{f.name}", item)
        self.c.edit("_cool/axes.json", lambda a: [e.setdefault("head", "") for A in a.values() for e in A["entries"]])
        self.c.edit("_cool/skills.json", lambda s: [b.setdefault("base", False) for b in s["stages"]] + [r.setdefault("note", "") for k in ("used", "edges") for r in s[k]])
        def logos(L):
            for r in L["logos"]:
                for k in ("dark", "small", "small_dark", "note"): r.setdefault(k, "")
                r.setdefault("plate", False); r.setdefault("scale", None)
        self.c.edit("_cool/logos.json", logos)
        self.c.edit("_cool/site.json", lambda s: s.setdefault("notes", ""))
        code, _, err = self.c.run(); self.assertEqual(code, 0, err)
        self.assertEqual(self.c.path("assets/cool/data/work.json").read_bytes(), before)

    def test_unused_entry_is_a_note_not_a_failure(self):
        # adding an entry before any item uses it (the admin needs it saved first) must not break the build
        self.c.edit("_cool/axes.json", lambda a: a["topics"]["entries"].append({"label": "Brand new"}))
        code, out, err = self.c.run(); self.assertEqual(code, 0, err)
        self.assertIn("'Brand new' is not used by any item yet", out)

    # ---------------------------------------------------------------- bad content
    def test_weight_out_of_range(self):
        self.weights("wilson", "topics", lambda rows: rows.__setitem__(0, {**rows[0], "weight": 1.5}))
        self.fails_with("weight 1.5 is outside 0-1", "_cool/items/wilson.json")

    def test_weight_not_a_number(self):
        self.weights("wilson", "methods", lambda rows: rows.__setitem__(0, {**rows[0], "weight": "high"}))
        self.fails_with("weight 'high' is not a number")

    def test_unknown_entry(self):
        self.weights("wilson", "tools", lambda rows: rows.append({"entry": "Rust", "weight": 1}))
        self.fails_with("'Rust': not an entry of the Tools axis")

    def test_entry_listed_twice_on_an_item(self):
        self.weights("wilson", "topics", lambda rows: rows.append(dict(rows[0])))
        self.fails_with("listed twice")

    def test_duplicate_id(self):
        it = self.c.read("_cool/items/wilson.json"); self.c.write("_cool/items/wilson2.json", it)
        self.fails_with("id 'wilson' must match the file name 'wilson2'", "is used twice")

    def test_bad_id(self):
        self.c.edit("_cool/items/wilson.json", lambda it: it.update(id="SPS paper"))
        self.fails_with("must be lowercase letters, digits or -")

    def test_missing_required_field(self):
        self.c.edit("_cool/items/wilson.json", lambda it: it.pop("summary"))
        self.fails_with("`summary` is missing")

    def test_bad_dates(self):
        self.c.edit("_cool/items/wilson.json", lambda it: it.update(start="2026-13"))
        self.fails_with("start '2026-13' must look like 2026-08")
        self.c.edit("_cool/items/wilson.json", lambda it: it.update(start="2026-09", end="2026-01"))
        self.fails_with("ends (2026-01) before it starts (2026-09)")

    def test_missing_logo_file(self):
        self.c.edit("_cool/items/msk.json", lambda it: it.update(logo="/assets/cool/logos/orgs/nope.svg"))
        self.fails_with("logo '/assets/cool/logos/orgs/nope.svg' not found in the repo")

    def test_logo_outside_assets(self):
        self.c.edit("_cool/items/msk.json", lambda it: it.update(logo="../../etc/passwd"))
        self.fails_with("must be a path under /assets/")

    def test_bad_link(self):
        self.c.edit("_cool/items/wilson.json", lambda it: it["links"].append({"label": "Paper", "url": "arxiv.org/abs/1"}))
        self.fails_with("link 'arxiv.org/abs/1' must start with https://, mailto: or /")

    def test_unknown_skill_and_item(self):
        self.c.edit("_cool/skills.json", lambda s: s["used"].append({"skill": "COBOL", "items": ["wilson"]}))
        self.fails_with("'COBOL' is not one of the skills")
        self.c.edit("_cool/skills.json", lambda s: (s["used"].pop(), s["used"][-1].__setitem__("items", ["nope"])))   # drop COBOL, then point a real skill at a missing item
        self.fails_with("unknown item id 'nope'")

    def test_skill_cycle(self):
        self.c.edit("_cool/skills.json", lambda s: s["edges"].append({"from": "Tellurium", "to": ["Python"]}))
        self.fails_with("the reverse edge is already listed")

    def test_never_mention(self):
        self.c.edit("_cool/items/wilson.json", lambda it: it.update(org="Lab (GPA 4.0)"))
        self.fails_with("mentions 'GPA'")

    def test_phone_number(self):
        self.c.edit("_cool/items/wilson.json", lambda it: it.update(summary="Call 555-123-4567"))
        self.fails_with("looks like a phone number")

    def test_arxiv_ids_are_not_phone_numbers(self):
        self.c.edit("_cool/items/wilson.json", lambda it: it.update(summary="arXiv 2611.00064, 0.726→0.891, 8×H100"))
        self.assertEqual(self.c.run("--check")[0], 0)

    def test_bad_json(self):
        self.c.path("_cool/items/wilson.json").write_text("{ not json", encoding="utf-8")
        self.fails_with("_cool/items/wilson.json: not valid JSON")

    def test_problems_are_all_listed(self):
        self.weights("wilson", "topics", lambda rows: rows.__setitem__(0, {**rows[0], "weight": 2}))
        self.c.edit("_cool/items/msk.json", lambda it: it.pop("title"))
        err = self.fails_with("2 problem(s)")

    # ---------------------------------------------------------------- blog posts
    @unittest.skipUnless(HAVE_YAML, "PyYAML not installed")
    def test_post_related_items(self):
        self.c.post("2026-11-01-a.md", "title: A\npublished: true\nrelated_items:\n  - wilson\n  - yu")
        self.assertEqual(self.c.run("--check")[0], 0)
        self.c.post("2026-11-02-b.md", "title: B\npublished: true\nrelated_items: [wilson, nope]")
        self.fails_with("Blog post 2026-11-02-b.md: related item 'nope' is not a homepage item")

    @unittest.skipUnless(HAVE_YAML, "PyYAML not installed")
    def test_drafts_are_not_checked(self):
        self.c.post("2026-11-02-b.md", "title: B\npublished: false\nrelated_items: [nope]")
        self.assertEqual(self.c.run("--check")[0], 0)

    def test_posts_without_related_items_need_no_yaml(self):
        self.c.post("2026-11-03-c.md", "title: C\npublished: true")
        self.assertEqual(self.c.run("--check")[0], 0)


if __name__ == "__main__":
    unittest.main()
