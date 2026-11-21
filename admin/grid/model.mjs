// The grid editor's data: the _cool/ files as loaded (text), as loaded (parsed, "base") and as edited ("docs").
// Every edit changes docs in place so that stringify(doc) differs from the loaded text only where the value did:
// reverting an edit gives back the exact loaded bytes, and saving writes just the files whose text changed.
import { parse, stringify, markFloat } from "./pyjson.mjs";
import { check, homepageOrder, GROUP_WORDS } from "./check.mjs";

export const AXES = ["topics", "methods", "tools", "output"];
const OPTIONAL = new Set(["end", "head"]);
export const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const isDict = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const has = (d, k) => Object.prototype.hasOwnProperty.call(d, k);

/** Snaps a weight to 0-1 in steps of 0.1. */
export const snap = (v) => Math.min(1, Math.max(0, Math.round(Number(v) * 10) / 10));

/** Adds key to obj in place at the position it has in ref, or else right after `after`: the keys that belong
 *  behind it are deleted and re-added. Re-adding keeps obj's identity, which pyjson's float marks hang on. */
function placeKey(obj, key, value, ref, after) {
  const order = Object.keys(ref || {});
  let behind;
  if (order.includes(key)) behind = new Set(order.slice(order.indexOf(key) + 1));
  else if (after && has(obj, after)) {
    const own = Object.keys(obj);
    behind = new Set(own.slice(own.indexOf(after) + 1));
  }
  obj[key] = value;
  if (!behind) return;
  for (const k of Object.keys(obj))
    if (k !== key && behind.has(k)) {
      const v = obj[k];
      delete obj[k];
      obj[k] = v;
    }
}

/** A typed weight: "0.7", ".7" and "7" are all 0.7 (whole numbers 2-10 are tenths); "" is 0. null if not a number. */
export function parseWeight(s) {
  const t = String(s).trim().replace(",", ".");
  if (!t) return 0;
  if (!/^\d*\.?\d*$/.test(t) || t === ".") return null;
  const n = Number(t);
  return snap(n > 1 && n <= 10 ? n / 10 : n);
}

/** "Update homepage weights (3 items)": what changed, and in how many items. */
export function commitMessage(model, files) {
  const kinds = new Set();
  let items = 0;
  for (const { rel } of files) {
    if (!rel.startsWith("items/")) {
      kinds.add(rel === "axes.json" ? "entry names" : rel.replace(".json", ""));
      continue;
    }
    items++;
    const d = model.doc(rel),
      b = model.baseDoc(rel);
    const strip = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !AXES.includes(k)));
    if (AXES.some((ax) => stringify(d[ax] ?? null) !== stringify(b[ax] ?? null))) kinds.add("weights");
    if (stringify(strip(d)) !== stringify(strip(b))) kinds.add("text");
  }
  const order = ["weights", "text", "entry names"];
  const what = [...kinds].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const list = what.length > 1 ? `${what.slice(0, -1).join(", ")} and ${what.at(-1)}` : what[0];
  return `Update homepage ${list}${items ? ` (${plural(items, "item")})` : ""}`;
}

export class Model {
  /** texts: Map of _cool-relative path ("site.json", "items/sps.json") to the file's text at the loaded commit. */
  constructor(texts) {
    this.load(texts);
  }

  load(texts) {
    this.orig = new Map(texts);
    this.base = new Map();
    this.docs = new Map();
    this.broken = new Map(); // rel -> why this page won't edit it
    for (const [rel, text] of this.orig) {
      try {
        this.base.set(rel, parse(text));
        this.docs.set(rel, parse(text));
        if (stringify(this.docs.get(rel)) !== text)
          this.broken.set(rel, "not in the standard format (2-space JSON), so saving it here would rewrite it");
      } catch (e) {
        this.broken.set(rel, `not valid JSON (${e.message})`);
        this.docs.set(rel, e);
      }
    }
  }

  editable(rel) {
    return !this.broken.has(rel) && isDict(this.docs.get(rel));
  }
  doc(rel) {
    const d = this.docs.get(rel);
    return isDict(d) ? d : {};
  }
  baseDoc(rel) {
    const d = this.base.get(rel);
    return isDict(d) ? d : {};
  }

  get site() {
    return this.doc("site.json");
  }
  groupOrder() {
    const o = this.site.group_order;
    return Array.isArray(o) && o.length === 3 ? o : ["experience", "research", "project"];
  }
  groupLabel(g) {
    return GROUP_WORDS[g] || g;
  }

  /** Items in homepage order: [{ rel, it }]. */
  items() {
    const list = [...this.docs.keys()]
      .filter((k) => k.startsWith("items/") && isDict(this.docs.get(k)))
      .map((rel) => ({ rel, it: this.docs.get(rel) }));
    const order = this.groupOrder();
    const byIt = new Map(list.map((x) => [x.it, x]));
    return homepageOrder(
      list.map((x) => x.it),
      order
    ).map((it) => byIt.get(it));
  }

  axisLabel(ax) {
    const A = this.doc("axes.json")[ax];
    return isDict(A) && A.label ? A.label : ax;
  }
  entries(ax) {
    const A = this.doc("axes.json")[ax];
    return isDict(A) && Array.isArray(A.entries) ? A.entries : [];
  }
  baseEntries(ax) {
    const A = this.baseDoc("axes.json")[ax];
    return isDict(A) && Array.isArray(A.entries) ? A.entries : [];
  }

  // ------------------------------------------------------------------ weights (cells are item × entry index)
  static rowsOf(it, ax) {
    return Array.isArray(it[ax]) ? it[ax] : [];
  }
  static weightIn(it, ax, label) {
    const row = Model.rowsOf(it, ax).find((r) => isDict(r) && r.entry === label);
    return row && typeof row.weight === "number" ? row.weight : 0;
  }
  weight(rel, ax, j) {
    const e = this.entries(ax)[j];
    return e ? Model.weightIn(this.doc(rel), ax, e.label) : 0;
  }
  baseWeight(rel, ax, j) {
    const e = this.baseEntries(ax)[j];
    return e ? Model.weightIn(this.baseDoc(rel), ax, e.label) : 0;
  }

  setWeight(rel, ax, j, value) {
    if (!this.editable(rel)) return false;
    const it = this.doc(rel),
      label = this.entries(ax)[j]?.label;
    if (label === undefined || (has(it, ax) && it[ax] !== null && !Array.isArray(it[ax]))) return false;
    const v = snap(value);
    const baseIt = this.baseDoc(rel),
      baseLabel = this.baseEntries(ax)[j]?.label;
    const baseRows = Model.rowsOf(baseIt, ax);
    const baseRow = baseRows.find((r) => isDict(r) && r.entry === baseLabel);
    if (!Array.isArray(it[ax]))
      placeKey(
        it,
        ax,
        [],
        baseIt,
        AXES.slice(0, AXES.indexOf(ax))
          .reverse()
          .find((a) => has(it, a))
      );
    const rows = it[ax];
    const k = rows.findIndex((r) => isDict(r) && r.entry === label);
    if (v > 0 || (k >= 0 && rows[k].source)) {
      // 0 on a row that carries private evidence keeps the row (weight 0 is not shown) so the evidence survives
      if (k >= 0) {
        rows[k].weight = v;
        markFloat(rows[k], "weight");
      } else {
        const row = baseRow ? parse(stringify(baseRow)) : { entry: label, weight: v };
        row.entry = label;
        row.weight = v;
        markFloat(row, "weight");
        // back where it was: before the first row that came after it at load time
        const basePos = (l) => baseRows.findIndex((r) => isDict(r) && this.currentLabel(ax, r.entry) === l);
        const mine = baseRow ? baseRows.indexOf(baseRow) : Infinity;
        let at = rows.findIndex((r) => {
          const p = basePos(r.entry);
          return p < 0 || p > mine;
        });
        if (at < 0) at = rows.length;
        rows.splice(at, 0, row);
      }
    } else if (k >= 0) {
      rows.splice(k, 1);
    }
    if (!rows.length && !has(baseIt, ax)) delete it[ax];
    return true;
  }

  /** An entry label as it reads now, given its label at load time. */
  currentLabel(ax, baseLabel) {
    const j = this.baseEntries(ax).findIndex((e) => isDict(e) && e.label === baseLabel);
    return j >= 0 && this.entries(ax)[j] ? this.entries(ax)[j].label : baseLabel;
  }

  // ------------------------------------------------------------------ short text
  field(rel, key) {
    const v = this.doc(rel)[key];
    return v === undefined || v === null ? "" : String(v);
  }
  baseField(rel, key) {
    const v = this.baseDoc(rel)[key];
    return v === undefined || v === null ? "" : String(v);
  }

  /** Sets a text field of a homepage item. A cleared optional field goes back to how it was loaded: absent if it
   *  was absent, else "" (what the CMS writes; build_cool.py reads both as not set). */
  setField(rel, key, value) {
    if (!this.editable(rel)) return false;
    setText(this.doc(rel), key, value, this.baseDoc(rel));
    return true;
  }

  /** Renames entry j of an axis and every item row that points at it. Returns a problem, or "" when done. */
  renameEntry(ax, j, label) {
    const ent = this.entries(ax),
      e = ent[j];
    if (!e || !this.editable("axes.json")) return "the axes file can't be edited here";
    if (!label.trim()) return "an entry needs a label";
    if (label !== label.trim()) return "no spaces at the ends";
    if (ent.some((x, n) => n !== j && x.label === label)) return `${this.axisLabel(ax)} already has ${JSON.stringify(label)}`;
    const old = e.label;
    if (old === label) return "";
    const blocked = this.items().filter(({ rel, it }) => !this.editable(rel) && Model.rowsOf(it, ax).some((r) => r?.entry === old));
    if (blocked.length) return `${blocked.map((b) => b.rel).join(", ")} can't be edited here`;
    e.label = label;
    for (const { it } of this.items()) for (const r of Model.rowsOf(it, ax)) if (isDict(r) && r.entry === old) r.entry = label;
    return "";
  }

  setHead(ax, j, head) {
    const e = this.entries(ax)[j];
    if (!e || !this.editable("axes.json")) return false;
    setText(e, "head", head, this.baseEntries(ax)[j]);
    return true;
  }

  // ------------------------------------------------------------------ saving
  /** The files whose text differs from the loaded text: [{ rel, text }]. */
  changed() {
    const out = [];
    for (const [rel, d] of this.docs) {
      if (!this.editable(rel)) continue;
      const text = stringify(d);
      if (text !== this.orig.get(rel)) out.push({ rel, text });
    }
    return out;
  }

  /** What CI's check would say about the edited content. hasFile: (repoPath) => bool, or null. */
  problems(hasFile) {
    const docs = new Map();
    for (const [rel, d] of this.docs) docs.set(rel, d);
    for (const k of ["site.json", "axes.json", "skills.json", "logos.json"]) if (!docs.has(k)) docs.set(k, undefined);
    return check(docs, hasFile);
  }

  snapshot() {
    return new Map([...this.docs].map(([rel, d]) => [rel, isDict(d) ? stringify(d) : null]));
  }
  restore(snap) {
    for (const [rel, text] of snap) if (text !== null) this.docs.set(rel, parse(text));
  }
  discard() {
    this.load(this.orig);
  }
  /** After a save: the saved texts are the new baseline. */
  saved(files) {
    const t = new Map(this.orig);
    for (const { rel, text } of files) t.set(rel, text);
    this.load(t);
  }
}

const AFTER = { end: "start", head: "label" }; // where a field the file never had goes

function setText(obj, key, value, ref) {
  const v = String(value);
  if (v === "" && OPTIONAL.has(key)) {
    if (!ref || !has(ref, key)) {
      delete obj[key];
      return;
    }
    const empty = ref[key] === null || ref[key] === "" ? ref[key] : "";
    if (has(obj, key)) obj[key] = empty;
    else placeKey(obj, key, empty, ref);
    return;
  }
  if (has(obj, key)) obj[key] = v;
  else placeKey(obj, key, v, ref, AFTER[key]);
}
