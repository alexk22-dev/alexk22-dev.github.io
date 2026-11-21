// The content checks of scripts/build_cool.py (Build.run up to `if err: return None`), ported line for line so
// the grid editor refuses to save what CI would refuse to deploy, with the same messages.
// Not ported: blog post related_items (this page never edits posts or item ids). _cool/tests/test_grid_editor.py
// runs every case of test_build_cool.py through both and requires the same problems, so keep them in step.
import { JSONError, isFloat, pyRepr, pyStr } from "./pyjson.mjs";

export const GROUP_WORDS = { research: "Research", project: "Projects", experience: "Experience" };
const ICONS = ["github", "linkedin", "cv", "email", "orcid"];
const ITEM_REQ = ["id", "group", "name", "context", "summary", "start", "title", "org", "topics"];
const ITEM_OPT = ["description", "end", "bullets", "links", "thumb", "image", "table", "logo", "logo_note", "roles", "order", "notes"];
// \n? because Python's re `$` also matches just before a final newline
const YM = /^\d{4}-(0[1-9]|1[0-2])\n?$/;
const ID = /^[a-z0-9][a-z0-9-]*\n?$/;
const URL = /^(https?:\/\/[^\s/$.?#][^\s]*|mailto:[^\s@]+@[^\s@]+\.[^\s@]+|\/[^\s]*)$/;
const PHONE = /(?<![\d.])(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?![\d.])/;
const LINES = /\r\n|[\n\r\v\f\x1c\x1d\x1e\x85\u2028\u2029]/; // what Python's str.splitlines() splits on

const isDict = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const isNum = (x) => typeof x === "number";
export const isText = (v) => typeof v === "string" && v.trim() !== "";
// an optional field: missing, null and "" all mean not set
export const opt = (d, k) => {
  const v = d[k];
  return v === undefined || v === null || (typeof v === "string" && !v.trim()) ? null : v;
};
const has = (d, k) => Object.prototype.hasOwnProperty.call(d, k);
const get = (d, k, dflt) => (has(d, k) ? d[k] : dflt);
const r = (d, k) => pyRepr(d[k], isFloat(d, k));
const truthy = (v) =>
  !(v === undefined || v === null || v === false || v === 0 || v === "" || (Array.isArray(v) && !v.length) || (isDict(v) && !Object.keys(v).length));
const pyIn = (x, list) => list.some((y) => y === x);
const sortedEq = (a, b) => JSON.stringify([...a].map(String).sort()) === JSON.stringify([...b].sort());

function* strings(x, path = "") {
  if (typeof x === "string") yield [path, x];
  else if (Array.isArray(x)) for (let n = 0; n < x.length; n++) yield* strings(x[n], `${path}[${n}]`);
  else if (isDict(x))
    for (const [k, v] of Object.entries(x)) {
      yield* strings(k, path + "/" + k);
      yield* strings(v, `${path}/${k}`);
    }
}

export function table(text) {
  if (typeof text !== "string") return null;
  const rows = text
    .trim()
    .split(LINES)
    .filter((l) => l.trim())
    .map((l) => l.split("|").map((c) => c.trim()));
  return rows.length ? rows : null;
}

/** docs: Map of _cool-relative path ("site.json", "items/sps.json") to its parsed value, a JSONError, or undefined
 *  (missing). hasFile(repoPath) says whether a repo file exists, or is null to skip those checks. Returns the problems. */
export function check(docs, hasFile) {
  const errs = [];
  const err = (m) => errs.push(m);

  const load = (rel) => {
    const v = docs.get(rel);
    if (v === undefined) {
      err(`_cool/${rel}: file is missing`);
      return {};
    }
    if (v instanceof JSONError) {
      err(`_cool/${rel}: not valid JSON (${v.message})`);
      return {};
    }
    if (!isDict(v)) {
      err(`_cool/${rel}: must hold a { ... } object`);
      return {};
    }
    return v;
  };
  const asset = (where, path, what = "file") => {
    if (typeof path !== "string" || !path.startsWith("/assets/")) {
      err(`${where}: ${what} ${pyRepr(path)} must be a path under /assets/ (upload it in the admin)`);
      return null;
    }
    if (path.split("/").includes("..") || (hasFile && !hasFile(path.replace(/^\/+/, "")))) {
      err(`${where}: ${what} ${pyRepr(path)} not found in the repo`);
      return null;
    }
    return path;
  };
  const link = (where, url) => {
    if (typeof url !== "string" || !URL.test(url.trim()) || url !== url.trim())
      err(`${where}: link ${pyRepr(url)} must start with https://, mailto: or /`);
    else if (url.startsWith("tel:")) err(`${where}: phone links are not allowed`);
  };

  function checkSite(site) {
    for (const k of ["name", "tagline", "standard_view"]) if (!isText(site[k])) err(`Site settings: \`${k}\` is missing`);
    let links = site.links;
    if (!Array.isArray(links) || !links.length) {
      err("Site settings: `links` must list at least one link");
      links = [];
    }
    links.forEach((l, n) => {
      const where = `Site settings: link ${n + 1} (${isDict(l) ? pyStr(get(l, "label", "?")) : "?"})`;
      if (!isDict(l)) {
        err(`${where}: must be { label, url, icon }`);
        return;
      }
      if (!isText(l.label)) err(`${where}: needs a label`);
      link(where, l.url);
      if (!pyIn(l.icon, ICONS)) err(`${where}: icon ${pyRepr(l.icon)} must be one of ${ICONS.join(", ")}`);
    });
    let order = get(site, "group_order", ["experience", "research", "project"]);
    if (!Array.isArray(order) || !sortedEq(order, Object.keys(GROUP_WORDS)) || !order.every((g) => typeof g === "string")) {
      err(`Site settings: group order ${pyRepr(order)} must list each of ${Object.keys(GROUP_WORDS).join(", ")} once`);
      order = Object.keys(GROUP_WORDS);
    }
    let nm = get(site, "never_mention", []);
    if (!Array.isArray(nm) || !nm.every(isText)) {
      err("Site settings: `never_mention` must be a list of words");
      nm = [];
    }
    return [order, nm];
  }

  function checkAxes(axes) {
    if (!has(axes, "topics")) err("Axes: the `topics` axis is missing");
    const out = new Map();
    for (const [ax, A] of Object.entries(axes)) {
      const tag = `Axes: ${ax}`;
      if (!ID.test(ax)) err(`${tag}: axis id must be lowercase letters, digits or -`);
      if (!isDict(A)) {
        err(`${tag}: must be { label, entries }`);
        continue;
      }
      if (!isText(A.label)) err(`${tag}: needs a label`);
      const ent = A.entries;
      if (!Array.isArray(ent) || !ent.length) {
        err(`${tag}: needs at least one entry`);
        continue;
      }
      const labels = [];
      ent.forEach((e, n) => {
        if (!isDict(e) || !isText(e.label)) {
          err(`${tag}: entry ${n + 1} needs a label`);
          return;
        }
        if (labels.includes(e.label)) err(`${tag}: entry ${pyRepr(e.label)} is listed twice`);
        if (has(e, "head") && e.head !== null && typeof e.head !== "string") err(`${tag}: entry ${pyRepr(e.label)}: short name must be text`);
        labels.push(e.label);
      });
      out.set(ax, [A, ent.filter((e) => isDict(e) && isText(e.label))]);
    }
    return out;
  }

  function checkItem(file, it, axes) {
    const stem = file.replace(/^items\//, "").replace(/\.json$/, "");
    const tag = `Homepage item ${pyRepr(truthy(it.name) ? it.name : stem, isFloat(it, "name"))} (_cool/items/${stem}.json)`;
    const known = [...ITEM_REQ, ...ITEM_OPT, ...[...axes.keys()].filter((a) => a !== "topics")];
    for (const k of ITEM_REQ) if (!has(it, k) || it[k] === null || it[k] === "") err(`${tag}: \`${k}\` is missing`);
    for (const k of Object.keys(it)) if (!known.includes(k)) err(`${tag}: unknown field \`${k}\` (known: ${known.join(", ")})`);
    const i = it.id;
    if (typeof i !== "string" || !ID.test(i)) err(`${tag}: id ${r(it, "id")} must be lowercase letters, digits or - (it is the page's #link)`);
    else if (i !== stem) err(`${tag}: id ${pyRepr(i)} must match the file name ${pyRepr(stem)}`);
    if (typeof i === "string" && has(GROUP_WORDS, i)) err(`${tag}: id ${pyRepr(i)} is also a group name, which the page uses as a #${i} filter link`);
    for (const k of ["name", "context", "summary", "title", "org"]) if (has(it, k) && !isText(it[k])) err(`${tag}: \`${k}\` must be text`);
    if (!opt(it, "description") && !truthy(it.bullets)) err(`${tag}: needs a description or at least one bullet`);
    if (!(typeof it.group === "string" && has(GROUP_WORDS, it.group)))
      err(`${tag}: group ${r(it, "group")} must be one of ${Object.keys(GROUP_WORDS).join(", ")}`);
    const s = get(it, "start", ""),
      e = opt(it, "end");
    const sOk = YM.test(pyStr(s)),
      eOk = e !== null && YM.test(pyStr(e));
    if (!sOk) err(`${tag}: start ${pyRepr(s, isFloat(it, "start"))} must look like 2026-08`);
    if (e !== null && e !== "present" && !eOk)
      err(`${tag}: end ${pyRepr(e, isFloat(it, "end"))} must look like 2026-09 or be "present" (or leave it empty)`);
    if (e !== null && e !== "present" && sOk && eOk && e < s) err(`${tag}: ends (${e}) before it starts (${s})`);
    if (opt(it, "order") !== null && !isNum(it.order)) err(`${tag}: order must be a number`);
    for (const k of ["thumb", "image"]) if (opt(it, k)) asset(tag, it[k], k);
    if (opt(it, "logo_note") && !opt(it, "logo")) err(`${tag}: logo note without a logo`);
    if (opt(it, "logo")) asset(tag, it.logo, "logo");
    const bullets = truthy(it.bullets) ? it.bullets : [];
    if (!Array.isArray(bullets) || !bullets.every(isText)) err(`${tag}: bullets must each be text (remove empty ones)`);
    let roles = truthy(it.roles) ? it.roles : [];
    if (!Array.isArray(roles)) {
      err(`${tag}: roles must be a list`);
      roles = [];
    }
    roles.forEach((ro, m) => {
      if (
        !isDict(ro) ||
        !isText(ro.title) ||
        !YM.test(pyStr(get(ro, "start", ""))) ||
        !(opt(ro, "end") === null || opt(ro, "end") === "present" || YM.test(pyStr(ro.end)))
      )
        err(`${tag}: role ${m + 1} needs a title, a start like 2026-10 and an end like 2026-09, "present" or empty`);
    });
    let links = truthy(it.links) ? it.links : [];
    if (!Array.isArray(links)) {
      err(`${tag}: links must be a list`);
      links = [];
    }
    links.forEach((l, m) => {
      if (!isDict(l) || !isText(l.label)) {
        err(`${tag}: link ${m + 1} needs a label`);
        return;
      }
      link(`${tag}: link ${pyRepr(l.label)}`, l.url);
    });
    if (opt(it, "table")) {
      const rows = table(it.table);
      if (rows === null) err(`${tag}: table must be text, one row per line, cells split by |`);
      else if (new Set(rows.map((x) => x.length)).size > 1)
        err(`${tag}: table rows have different numbers of cells (${rows.map((x) => x.length).join(", ")})`);
    }
    for (const [ax, [A, ent]] of axes) {
      const labels = ent.map((x) => x.label);
      const name = isDict(A) ? pyStr(get(A, "label", ax)) : ax;
      let rows = get(it, ax, []);
      if (rows === null) rows = [];
      if (!Array.isArray(rows)) {
        err(`${tag}: ${name} must be a list of { entry, weight }`);
        rows = [];
      }
      const got = new Set();
      for (const row of rows) {
        if (!isDict(row)) {
          err(`${tag}: ${name}: each row needs an entry and a weight`);
          continue;
        }
        const l = row.entry,
          v = row.weight;
        const where = `${tag}: ${name} ${r(row, "entry")}`;
        if (!pyIn(l, labels)) {
          err(`${where}: not an entry of the ${name} axis (entries: ${labels.join(", ")})`);
          continue;
        }
        if (got.has(l)) {
          err(`${where}: listed twice`);
          continue;
        }
        if (!isNum(v)) {
          err(`${where}: weight ${r(row, "weight")} is not a number`);
          continue;
        }
        if (!(v >= 0 && v <= 1)) {
          err(`${where}: weight ${pyStr(v, isFloat(row, "weight"))} is outside 0-1`);
          continue;
        }
        got.add(l);
      }
    }
  }

  function checkSkills(S, ids) {
    if (!truthy(S)) return;
    const stages0 = S.stages,
      skills0 = S.skills;
    let used = truthy(S.used) ? S.used : [],
      edges = truthy(S.edges) ? S.edges : [];
    for (const k of Object.keys(S))
      if (!["stages", "skills", "used", "edges"].includes(k)) err(`Skills: unknown key \`${k}\` (known: stages, skills, used, edges)`);
    let stages = stages0;
    if (!Array.isArray(stages) || !stages.length) {
      err("Skills: needs at least one stage");
      stages = [];
    }
    const labels = [],
      base = [];
    stages.forEach((b, n) => {
      if (!isDict(b) || !isText(b.label)) {
        err(`Skills: stage ${n + 1} needs a label`);
        return;
      }
      if (labels.includes(b.label)) err(`Skills: stage ${pyRepr(b.label)} is listed twice`);
      labels.push(b.label);
      if (truthy(b.base)) base.push(b.label);
    });
    if (base.length !== 1)
      err(`Skills: exactly one stage must be the base (the row under all the others); now ${base.length}: ${base.join(", ") || "none"}`);
    let skills = skills0;
    if (!Array.isArray(skills)) {
      err("Skills: `skills` must be a list of { name, stage }");
      skills = [];
    }
    const names = [],
      byStage = new Map(labels.map((l) => [l, []]));
    skills.forEach((x, n) => {
      if (!isDict(x) || !isText(x.name)) {
        err(`Skills: skill ${n + 1} needs a name`);
        return;
      }
      if (names.includes(x.name)) err(`Skills: skill ${pyRepr(x.name)} is listed twice`);
      names.push(x.name);
      if (!(typeof x.stage === "string" && byStage.has(x.stage))) {
        err(`Skills: skill ${pyRepr(x.name)}: stage ${r(x, "stage")} is not one of the stages (${labels.join(", ")})`);
        return;
      }
      byStage.get(x.stage).push(x.name);
    });
    for (const [l, xs] of byStage) if (!xs.length) err(`Skills: stage ${pyRepr(l)} has no skills (give it one or remove it)`);
    if (!Array.isArray(used)) {
      err("Skills: `used` must be a list of { skill, items }");
      used = [];
    }
    const seenUsed = new Set();
    used.forEach((u, n) => {
      const x = isDict(u) ? u.skill : null;
      const where = `Skills: "used in" row ${n + 1} (${pyStr(x)})`;
      if (!pyIn(x, names)) {
        err(`${where}: ${pyRepr(x)} is not one of the skills`);
        return;
      }
      if (seenUsed.has(x)) {
        err(`${where}: ${pyRepr(x)} has two rows (merge them)`);
        return;
      }
      seenUsed.add(x);
      const its = u.items;
      if (!Array.isArray(its) || !its.length) {
        err(`${where}: pick at least one item (or remove the row)`);
        return;
      }
      for (const i of its) if (!ids.has(i)) err(`${where}: unknown item id ${pyRepr(i)}`);
      for (const i of [...new Set(its.filter((i) => its.filter((j) => j === i).length > 1))].sort()) err(`${where}: item ${pyRepr(i)} listed twice`);
    });
    if (!Array.isArray(edges)) {
      err("Skills: `edges` must be a list of { from, to }");
      edges = [];
    }
    const pairs = new Set(),
      seenFrom = new Set(),
      key = (a, b) => JSON.stringify([a, b]);
    edges.forEach((ed, n) => {
      const x = isDict(ed) ? ed.from : null;
      const where = `Skills: edge row ${n + 1} (${pyStr(x)})`;
      if (!pyIn(x, names)) {
        err(`${where}: ${pyRepr(x)} is not one of the skills`);
        return;
      }
      if (seenFrom.has(x)) {
        err(`${where}: ${pyRepr(x)} has two rows (merge them)`);
        return;
      }
      seenFrom.add(x);
      const tos = ed.to;
      if (!Array.isArray(tos) || !tos.length) {
        err(`${where}: pick at least one skill it feeds (or remove the row)`);
        return;
      }
      for (const y of tos) {
        if (!pyIn(y, names)) err(`${where}: ${pyRepr(y)} is not one of the skills`);
        else if (y === x) err(`${where}: a skill can't feed itself`);
        else if (pairs.has(key(x, y))) err(`${where}: ${pyRepr(y)} listed twice`);
        else if (pairs.has(key(y, x))) err(`${where}: ${pyRepr(x)} → ${pyRepr(y)}: the reverse edge is already listed (draw one edge, not a cycle)`);
        else pairs.add(key(x, y));
      }
    });
  }

  function checkLogos(L) {
    const rows = get(L, "logos", []);
    if (!Array.isArray(rows)) {
      err("Logos: `logos` must be a list");
      return;
    }
    const seen = new Set();
    rows.forEach((ro, n) => {
      if (!isDict(ro) || !opt(ro, "file")) {
        err(`Logos: row ${n + 1} needs a logo file`);
        return;
      }
      const where = `Logos: ${pyStr(ro.file)}`;
      if (seen.has(ro.file)) err(`${where}: listed twice`);
      asset(where, ro.file, "logo");
      for (const k of ["dark", "small", "small_dark"]) if (opt(ro, k)) asset(where, ro[k], `${k.replace("_", " ")} variant`);
      if (opt(ro, "small_dark") && !opt(ro, "small")) err(`${where}: a small dark variant needs a small variant`);
      const sc = opt(ro, "scale");
      if (sc !== null && (!isNum(sc) || !(sc >= 0.25 && sc <= 4))) err(`${where}: scale ${r(ro, "scale")} must be a number from 0.25 to 4`);
      seen.add(ro.file);
    });
  }

  const site = load("site.json"),
    axesIn = load("axes.json"),
    skillsIn = load("skills.json"),
    logosIn = load("logos.json");
  const files = [...docs.keys()].filter((k) => /^items\/[^/]+\.json$/.test(k)).sort();
  if (!files.length) err("_cool/items/: no items");
  const raw = files.map((f) => [f, load(f)]);
  const [, banned] = checkSite(site);
  const axes = checkAxes(axesIn);
  const ids = new Set();
  for (const [f, it] of raw) {
    if (!Object.keys(it).length) continue;
    checkItem(f, it, axes);
    if (ids.has(it.id)) err(`Homepage item ${r(it, "name")}: id ${r(it, "id")} is used twice`);
    ids.add(it.id);
  }
  checkLogos(logosIn);
  checkSkills(skillsIn, ids);
  const siteOut = Object.fromEntries(Object.entries(site).filter(([k]) => k !== "never_mention"));
  const everything = { site: siteOut, axes: axesIn, items: raw.map(([, it]) => it), skills: skillsIn, logos: logosIn };
  for (const [path, s] of strings(everything)) {
    for (const w of banned)
      if (s.toLowerCase().includes(w.toLowerCase())) err(`${path}: mentions ${pyRepr(w)}, which is on never_mention in Site settings`);
    if (PHONE.test(s)) err(`${path}: looks like a phone number, which the site never shows`);
  }
  return errs;
}

// The homepage's item order (build_cool.py, Build.run): group order, then newest first inside each group
// by end (ongoing is newest; no end means it ended when it started), then start; ties by `order`, then id.
export function homepageOrder(items, groupOrder) {
  const recent = (it) => [opt(it, "end") === "present" ? "9999-99" : opt(it, "end") || it.start, it.start];
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const cmpList = (a, b) => cmp(a[0], b[0]) || cmp(a[1], b[1]);
  return [...items]
    .sort((a, b) => cmp(opt(a, "order") || 0, opt(b, "order") || 0) || cmp(a.id, b.id))
    .sort((a, b) => cmpList(recent(b), recent(a)))
    .sort((a, b) => groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group));
}
