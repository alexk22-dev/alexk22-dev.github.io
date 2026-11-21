// /admin/grid/: the page. Sign in, load _cool/ from main, edit weights (grid), short text and entry names,
// then save every changed file as one commit. Data rules live in model.mjs, checks in check.mjs, GitHub in github.mjs.
import { Model, AXES, snap, parseWeight, commitMessage, plural } from "./model.mjs";
import { stringify } from "./pyjson.mjs";
import { signIn, GitHub, StaleError, REPO, BRANCH } from "./github.mjs";

const TOKEN = "grid.token"; // sessionStorage only: gone when the tab closes
const FIELDS = [
  ["name", "Name"],
  ["context", "Context"],
  ["summary", "Summary"],
  ["start", "Start"],
  ["end", "End"],
  ["org", "Org line"],
];
const S = { gh: null, repo: null, model: null, ax: "topics", r: 0, c: 0, undo: [], edit: null, busy: false };
const ss = {
  get: () => {
    try {
      return sessionStorage.getItem(TOKEN);
    } catch {
      return null;
    }
  },
  set: (v) => {
    try {
      v ? sessionStorage.setItem(TOKEN, v) : sessionStorage.removeItem(TOKEN);
    } catch {
      /* memory only */
    }
  },
};

// ------------------------------------------------------------------ small DOM helpers
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.className = v;
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k in el && typeof v !== "string") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...kids.flat().filter((k) => k !== null && k !== undefined && k !== false));
  return el;
}
const $ = (sel) => document.querySelector(sel);
// the homepage's heat ramp (heat() in _pages/cool-home.html): mixes of --h0…--h4
const heat = (w) => {
  if (!(w > 0)) return "";
  const x = Math.min(1, w) * 4,
    i = Math.min(3, Math.floor(x)),
    f = x - i;
  return `color-mix(in srgb, var(--h${i + 1}) ${(100 * f).toFixed(1)}%, var(--h${i}))`;
};
// a weight as the cell shows it: one decimal on the 0.1 grid ("0.7", "1.0"), exact otherwise, empty for 0
const fmt = (w) => (w > 0 ? (Math.abs(w * 10 - Math.round(w * 10)) < 1e-9 ? w.toFixed(1) : String(w)) : "");
const hasFile = () => (S.repo?.paths ? (p) => S.repo.paths.has(p) : null);

// ------------------------------------------------------------------ messages
function say(text, kind = "", extra = null) {
  const box = $("#msgs");
  if (!box) return;
  box.replaceChildren(text ? h("div", { class: `msg ${kind}`, role: kind === "bad" ? "alert" : "status" }, text, extra) : "");
}

// ------------------------------------------------------------------ sign in / load
function renderSignIn(note = "") {
  document.body.replaceChildren(
    h(
      "main",
      { class: "signin" },
      h("h1", {}, "Homepage grid"),
      h("p", {}, "Edit the homepage weights and short text in one table, then save them as one commit to main."),
      h("button", { class: "primary", id: "signin", onclick: doSignIn }, "Sign in with GitHub"),
      h("div", { id: "msgs", class: "msgs" })
    )
  );
  if (note) say(note, "bad");
}

async function doSignIn() {
  say("Waiting for the GitHub window…");
  try {
    const token = await signIn();
    ss.set(token);
    S.token = token;
    await load();
  } catch (e) {
    say(e.message, "bad");
  }
}

async function load() {
  S.token = S.token || ss.get();
  if (!S.token) {
    renderSignIn();
    return;
  }
  S.gh = new GitHub(S.token);
  document.body.replaceChildren(h("main", { class: "signin" }, h("p", {}, "Loading _cool/ from main…"), h("div", { id: "msgs", class: "msgs" })));
  try {
    S.repo = await S.gh.load();
  } catch (e) {
    if (e.status === 401) {
      signOut("GitHub no longer accepts this sign-in. Sign in again.");
      return;
    }
    say(e.message, "bad", h("div", {}, h("button", { onclick: load }, "Try again")));
    return;
  }
  S.model = new Model(S.repo.texts);
  S.undo = [];
  S.r = 0;
  S.c = 0;
  renderApp();
}

function signOut(note = "") {
  ss.set(null);
  S.token = null;
  S.gh = null;
  S.repo = null;
  S.model = null;
  renderSignIn(note);
}

// ------------------------------------------------------------------ the page
function renderApp() {
  const sha = S.repo.commit.slice(0, 7);
  document.body.replaceChildren(
    ...[
      h(
        "header",
        { class: "bar" },
        h("h1", {}, "Homepage grid"),
        h(
          "span",
          { class: "meta" },
          `${BRANCH} @ `,
          h("a", { href: `https://github.com/${REPO}/commit/${S.repo.commit}`, target: "_blank", rel: "noopener", id: "sha" }, sha)
        ),
        h("span", { class: "count", id: "count" }),
        h("span", { class: "sp" }),
        h("button", { id: "undo", onclick: undo, title: "Undo (⌘Z / Ctrl+Z)" }, "Undo"),
        h("button", { id: "discard", onclick: discard }, "Discard"),
        h("button", { id: "reload", onclick: reload, title: "Load main again" }, "Reload"),
        h("button", { id: "save", class: "primary", onclick: save, title: "⌘S / Ctrl+S" }, "Save all"),
        h(
          "button",
          {
            onclick: () => {
              if (!S.model.changed().length || confirm("Sign out and lose the unsaved changes?")) signOut();
            },
          },
          "Sign out"
        )
      ),
      h("div", { id: "msgs", class: "msgs" }),
      h("div", { id: "problems", class: "msgs" }),
      S.model.broken.size
        ? h(
            "div",
            { class: "msg bad" },
            "Read-only here (edit these in the CMS): ",
            h(
              "ul",
              {},
              [...S.model.broken].map(([rel, why]) => h("li", {}, `_cool/${rel}: ${why}`))
            )
          )
        : null,
      h(
        "h2",
        {},
        "Weights",
        h(
          "span",
          { class: "seg", role: "group", "aria-label": "Axis" },
          AXES.map((ax) =>
            h(
              "button",
              {
                "aria-pressed": String(ax === S.ax),
                dataset: { ax },
                onclick: () => {
                  S.ax = ax;
                  S.c = 0;
                  renderAxis();
                },
              },
              `${S.model.axisLabel(ax)} ${S.model.entries(ax).length}`
            )
          )
        ),
        h("span", { class: "mute" }, "0 to 1 in steps of 0.1; empty is 0")
      ),
      h("div", { class: "gwrap", id: "gwrap" }),
      h(
        "p",
        { class: "keys" },
        "Click a cell, then type ",
        h("kbd", {}, "0.7"),
        " or ",
        h("kbd", {}, "7"),
        " and ",
        h("kbd", {}, "Enter"),
        " · arrows move · ",
        h("kbd", {}, "+"),
        " ",
        h("kbd", {}, "−"),
        " or ",
        h("kbd", {}, "⇧↑"),
        " ",
        h("kbd", {}, "⇧↓"),
        " change by 0.1 · ",
        h("kbd", {}, "Delete"),
        " or ",
        h("kbd", {}, "0"),
        " clears · ",
        h("kbd", {}, "⌘Z"),
        " undoes"
      ),
      h("h2", {}, h("span", { id: "enth" }), h("span", { class: "mute" }, "label (renames it on every item) · short name (column head, optional)")),
      h("div", { class: "ents", id: "ents" }),
      h("h2", {}, "Items", h("span", { class: "mute" }, "short text; bullets, links, logos and the rest are in the CMS")),
      h("div", { class: "twrap", id: "twrap" }),
    ].filter(Boolean)
  );
  renderAxis();
  renderText();
  refresh();
}

function renderAxis() {
  for (const b of document.querySelectorAll(".seg button")) b.setAttribute("aria-pressed", String(b.dataset.ax === S.ax));
  renderGrid();
  renderEntries();
}

// ------------------------------------------------------------------ weights grid
function renderGrid() {
  const m = S.model,
    ax = S.ax,
    ents = m.entries(ax),
    rows = m.items();
  S.rows = rows;
  S.r = Math.min(S.r, rows.length - 1);
  S.c = Math.min(S.c, ents.length - 1);
  const head = h(
    "tr",
    {},
    h("th", { class: "n" }, m.axisLabel(ax)),
    ents.map((e, j) => h("th", { class: "h", title: e.label, dataset: { c: j } }, h("span", {}, e.head || e.label)))
  );
  const body = h("tbody", {});
  S.cells = [];
  for (const g of m.groupOrder()) {
    const inG = rows.map((x, r) => [x, r]).filter(([x]) => x.it.group === g);
    if (!inG.length) continue;
    body.append(h("tr", { class: "grp" }, h("th", { colspan: ents.length + 1 }, m.groupLabel(g))));
    for (const [x, r] of inG) {
      const tds = ents.map((_, j) => h("td", { class: "c", tabindex: "-1", dataset: { r, c: j } }));
      S.cells[r] = tds;
      body.append(h("tr", { dataset: { r } }, h("th", { class: "n", title: `${x.it.name} (${x.it.id})` }, x.it.name || x.it.id), tds));
    }
  }
  const table = h("table", { class: "g", id: "grid", role: "grid", "aria-label": `${m.axisLabel(ax)} weights` }, h("thead", {}, head), body);
  table.addEventListener("keydown", onGridKey);
  table.addEventListener("pointerdown", onGridPointer);
  $("#gwrap").replaceChildren(table);
  rows.forEach((_, r) => ents.forEach((_, j) => paint(r, j)));
  setActive(S.r, S.c, false);
}

const relAt = (r) => S.rows[r]?.rel;
const weightAt = (r, c) => S.model.weight(relAt(r), S.ax, c);

function paint(r, c) {
  const td = S.cells[r]?.[c];
  if (!td) return;
  const rel = relAt(r),
    w = S.model.weight(rel, S.ax, c),
    was = S.model.baseWeight(rel, S.ax, c);
  td.textContent = fmt(w);
  td.style.setProperty("--c", heat(w) || "transparent");
  td.classList.toggle("hi", w >= 0.6);
  td.classList.toggle("chg", w !== was);
  td.classList.toggle("off", !S.model.editable(rel));
  td.title = `${S.rows[r]?.it.name}: ${S.model.entries(S.ax)[c]?.label}${w !== was ? ` (was ${fmt(was) || "0"})` : ""}`;
}

function setActive(r, c, focus = true) {
  const old = S.cells[S.r]?.[S.c];
  if (old) {
    old.classList.remove("at");
    old.tabIndex = -1;
  }
  S.r = Math.max(0, Math.min(r, S.rows.length - 1));
  S.c = Math.max(0, Math.min(c, S.model.entries(S.ax).length - 1));
  const td = S.cells[S.r]?.[S.c];
  if (!td) return;
  td.classList.add("at");
  td.tabIndex = 0;
  for (const el of document.querySelectorAll(".g .on")) el.classList.remove("on");
  td.parentElement.classList.add("on");
  document.querySelector(`.g thead th.h[data-c="${S.c}"]`)?.classList.add("on");
  if (focus) {
    td.focus({ preventScroll: true });
    td.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

function setW(r, c, v) {
  const rel = relAt(r);
  if (!S.model.editable(rel)) {
    say(`_cool/${rel} is read-only here.`, "bad");
    return;
  }
  const before = S.model.snapshot();
  if (!S.model.setWeight(rel, S.ax, c, v)) return;
  pushUndo(before);
  paint(r, c);
  refresh();
}

function onGridPointer(e) {
  const td = e.target.closest("td.c");
  if (!td || S.edit?.td === td) return;
  const r = +td.dataset.r,
    c = +td.dataset.c,
    again = r === S.r && c === S.c;
  if (S.edit && !commitEdit()) cancelEdit();
  setActive(r, c);
  e.preventDefault();
  if (e.pointerType === "touch" || e.pointerType === "pen" || again) startEdit(fmt(weightAt(r, c)));
}

function onGridKey(e) {
  if (S.edit) return; // the cell's input handles its own keys
  const mod = e.metaKey || e.ctrlKey;
  if (mod || e.altKey) return; // ⌘Z, ⌘S: the page-level handler
  const k = e.key,
    w = weightAt(S.r, S.c);
  const step = (d) => setW(S.r, S.c, snap(w + d));
  const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  if (e.shiftKey && (k === "ArrowUp" || k === "ArrowDown")) step(k === "ArrowUp" ? 0.1 : -0.1);
  else if (moves[k]) setActive(S.r + moves[k][0], S.c + moves[k][1]);
  else if (k === "Tab") {
    if (e.shiftKey ? S.c === 0 : S.c === S.model.entries(S.ax).length - 1) return;
    setActive(S.r, S.c + (e.shiftKey ? -1 : 1));
  } else if (k === "Home") setActive(S.r, 0);
  else if (k === "End") setActive(S.r, Infinity);
  else if (k === "+" || k === "=") step(0.1);
  else if (k === "-" || k === "_") step(-0.1);
  else if (k === "Delete" || k === "Backspace") setW(S.r, S.c, 0);
  else if (k === "Enter" || k === "F2") startEdit(fmt(w));
  else if (/^[0-9.,]$/.test(k)) startEdit(k, false);
  else return;
  e.preventDefault();
}

function startEdit(initial, selectAll = true) {
  const td = S.cells[S.r]?.[S.c];
  if (!td || S.edit || !S.model.editable(relAt(S.r))) return;
  const input = h("input", { inputmode: "decimal", autocomplete: "off", "aria-label": td.title, value: initial });
  S.edit = { td, input, r: S.r, c: S.c };
  td.replaceChildren(input);
  input.focus();
  if (selectAll) input.select();
  else input.setSelectionRange(input.value.length, input.value.length);
  input.addEventListener("keydown", (e) => {
    const k = e.key;
    e.stopPropagation();
    if (k === "Enter") {
      e.preventDefault();
      if (commitEdit()) setActive(S.r + 1, S.c);
    } else if (k === "Tab") {
      e.preventDefault();
      if (commitEdit()) setActive(S.r, S.c + (e.shiftKey ? -1 : 1));
    } else if (k === "Escape") {
      e.preventDefault();
      cancelEdit();
    } else if (k === "ArrowUp" || k === "ArrowDown") {
      e.preventDefault();
      const v = parseWeight(input.value) ?? 0;
      input.value = fmt(snap(v + (k === "ArrowUp" ? 0.1 : -0.1))) || "0";
      input.select();
    }
  });
  input.addEventListener("blur", () => {
    if (S.edit?.input === input) {
      if (!commitEdit()) cancelEdit();
    }
  });
}

function commitEdit() {
  const ed = S.edit;
  if (!ed) return true;
  const v = parseWeight(ed.input.value);
  if (v === null) {
    ed.input.setAttribute("aria-invalid", "true");
    say(`"${ed.input.value}" is not a weight: type a number from 0 to 1.`, "bad");
    return false;
  }
  S.edit = null;
  ed.td.textContent = "";
  if (v !== weightAt(ed.r, ed.c)) setW(ed.r, ed.c, v);
  else paint(ed.r, ed.c);
  ed.td.focus({ preventScroll: true });
  return true;
}

function cancelEdit() {
  const ed = S.edit;
  if (!ed) return;
  S.edit = null;
  paint(ed.r, ed.c);
  ed.td.focus({ preventScroll: true });
}

// ------------------------------------------------------------------ entry names
function renderEntries() {
  const m = S.model,
    ax = S.ax,
    base = m.baseEntries(ax);
  $("#enth").textContent = `${m.axisLabel(ax)} entries`;
  $("#ents").replaceChildren(
    ...m.entries(ax).map((e, j) => {
      const label = h("input", {
        class: "cell",
        value: e.label,
        "aria-label": `${m.axisLabel(ax)} entry ${j + 1} label`,
        dataset: { key: `ent:${ax}:${j}:label` },
      });
      const head = h("input", {
        class: "cell",
        value: e.head || "",
        placeholder: "short name",
        "aria-label": `${e.label} short name`,
        dataset: { key: `ent:${ax}:${j}:head` },
      });
      const mark = () => {
        label.classList.toggle("chg", e.label !== base[j]?.label);
        head.classList.toggle("chg", (e.head || "") !== (base[j]?.head || ""));
      };
      mark();
      label.addEventListener("change", () => {
        const before = m.snapshot();
        const problem = m.renameEntry(ax, j, label.value);
        if (problem) {
          say(`Not renamed: ${problem}.`, "bad");
          label.value = e.label;
          label.classList.add("bad");
          return;
        }
        label.classList.remove("bad");
        if (stringify([...before]) !== stringify([...m.snapshot()])) pushUndo(before);
        mark();
        keepFocus(renderGrid);
        refresh();
      });
      onText(
        head,
        () => m.setHead(ax, j, head.value),
        () => {
          mark();
        },
        () => keepFocus(renderGrid)
      );
      return h("div", { class: "ent" }, label, head);
    })
  );
}

// ------------------------------------------------------------------ short text
function renderText() {
  const m = S.model,
    rows = m.items();
  const body = h("tbody", {});
  for (const g of m.groupOrder()) {
    const inG = rows.filter((x) => x.it.group === g);
    if (!inG.length) continue;
    body.append(h("tr", { class: "grp" }, h("th", { colspan: FIELDS.length + 1 }, m.groupLabel(g))));
    for (const { rel, it } of inG) {
      const ro = !m.editable(rel);
      body.append(
        h(
          "tr",
          {},
          h(
            "th",
            { class: "id" },
            it.id,
            h(
              "a",
              {
                href: `/admin/#/collections/homepage_items/entries/${encodeURIComponent(it.id)}`,
                target: "_blank",
                rel: "noopener",
                title: `Open ${it.id} in the CMS`,
              },
              "CMS"
            )
          ),
          FIELDS.map(([k, label]) => {
            const input = h("input", {
              class: "cell",
              value: m.field(rel, k),
              readonly: ro,
              "aria-label": `${it.id} ${label}`,
              dataset: { key: `txt:${rel}:${k}` },
              placeholder: k === "start" ? "YYYY-MM" : "",
            });
            const mark = () => input.classList.toggle("chg", m.field(rel, k) !== m.baseField(rel, k));
            mark();
            onText(
              input,
              () => m.setField(rel, k, input.value),
              mark,
              () => {
                keepFocus(renderGrid);
                if (k === "start" || k === "end") keepFocus(renderText);
              }
            );
            return h("td", { class: k }, input);
          })
        )
      );
    }
  }
  $("#twrap").replaceChildren(
    h(
      "table",
      { class: "t" },
      h(
        "thead",
        {},
        h(
          "tr",
          {},
          h("th", { class: "id" }, "Item"),
          FIELDS.map(([, l]) => h("th", {}, l))
        )
      ),
      body
    )
  );
}

/** Wires a text input: apply() on every keystroke, one undo step per focus, after() once it is left. */
function onText(input, apply, mark, after) {
  let before = null;
  input.addEventListener("focus", () => {
    before = S.model.snapshot();
  });
  input.addEventListener("input", () => {
    apply();
    mark();
    refresh();
  });
  input.addEventListener("change", () => {
    if (before && stringify([...before]) !== stringify([...S.model.snapshot()])) pushUndo(before);
    before = S.model.snapshot();
    after();
  });
}

/** Re-renders while keeping the focused input focused (renders replace the DOM). */
function keepFocus(render) {
  const key = document.activeElement?.dataset?.key,
    sel = document.activeElement?.selectionStart;
  render();
  if (!key) return;
  const el = document.querySelector(`[data-key="${CSS.escape(key)}"]`);
  if (el) {
    el.focus({ preventScroll: true });
    if (sel !== undefined && sel !== null)
      try {
        el.setSelectionRange(sel, sel);
      } catch {
        /* not text */
      }
  }
}

// ------------------------------------------------------------------ state, undo, save
function refresh() {
  const m = S.model;
  if (!m) return;
  const n = m.changed().length;
  $("#count").textContent = n ? `${plural(n, "file")} changed` : "";
  $("#save").disabled = S.busy || !n;
  $("#discard").disabled = S.busy || !n;
  $("#undo").disabled = S.busy || !S.undo.length;
  const probs = m.problems(hasFile());
  $("#problems").replaceChildren(
    probs.length
      ? h(
          "div",
          { class: "msg bad", id: "problem-list" },
          `${plural(probs.length, "problem")} (CI would refuse to deploy; saving is blocked until they're fixed):`,
          h(
            "ul",
            {},
            probs.map((p) => h("li", {}, p))
          )
        )
      : ""
  );
}

function pushUndo(snapshot) {
  S.undo.push(snapshot);
  if (S.undo.length > 300) S.undo.shift();
}

function undo() {
  const s = S.undo.pop();
  if (!s) return;
  S.model.restore(s);
  renderAxis();
  renderText();
  refresh();
  setActive(S.r, S.c);
}

function discard() {
  const n = S.model.changed().length;
  if (!n || !confirm(`Discard the changes to ${plural(n, "file")}?`)) return;
  S.model.discard();
  S.undo = [];
  renderAxis();
  renderText();
  refresh();
  say("Changes discarded.");
}

function reload() {
  if (S.model.changed().length && !confirm("Reload from main and lose the unsaved changes?")) return;
  load();
}

async function save() {
  const m = S.model;
  if (S.busy || (S.edit && !commitEdit())) return;
  const files = m.changed();
  if (!files.length) {
    say("Nothing to save.");
    return;
  }
  const probs = m.problems(hasFile());
  if (probs.length) {
    say(`Not saved: fix the ${plural(probs.length, "problem")} listed below first.`, "bad");
    $("#problem-list")?.scrollIntoView({ block: "nearest" });
    return;
  }
  const message = commitMessage(m, files);
  S.busy = true;
  refresh();
  say(`Saving ${plural(files.length, "file")}…`);
  try {
    const res = await S.gh.save(S.repo, files, message);
    S.repo.commit = res.sha;
    S.repo.tree = res.tree;
    m.saved(files);
    S.undo = [];
    renderAxis();
    renderText();
    $("#sha").textContent = res.sha.slice(0, 7);
    $("#sha").href = res.url;
    say(
      "Saved ",
      "ok",
      h(
        "span",
        {},
        h("a", { href: res.url, target: "_blank", rel: "noopener" }, `${res.sha.slice(0, 7)} “${message}”`),
        ". The site updates in about 2 minutes, once ",
        h("a", { href: `https://github.com/${REPO}/actions`, target: "_blank", rel: "noopener" }, "CI"),
        " passes its own check."
      )
    );
  } catch (e) {
    if (e instanceof StaleError)
      say(
        `Not saved: ${e.message} Someone (or the CMS) committed since this page loaded, and saving would overwrite it. Reload to get the latest; your edits here are not kept, so note them first.`,
        "bad",
        h("div", {}, h("button", { onclick: () => load() }, "Reload"))
      );
    else if (e.status === 401) say("Not saved: GitHub no longer accepts this sign-in. Sign out, sign in again and redo the edits.", "bad");
    else say(`Not saved: ${e.message}`, "bad");
  } finally {
    S.busy = false;
    refresh();
  }
}

addEventListener("keydown", (e) => {
  if (!S.model || !(e.metaKey || e.ctrlKey)) return;
  const k = e.key.toLowerCase();
  if (k === "s") {
    e.preventDefault();
    save();
  } else if (k === "z" && !e.shiftKey && !(e.target instanceof HTMLInputElement)) {
    e.preventDefault();
    undo();
  }
});
addEventListener("beforeunload", (e) => {
  if (S.model?.changed().length) {
    e.preventDefault();
    e.returnValue = "";
  }
});

load();
