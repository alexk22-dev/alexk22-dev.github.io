// Screenshots of the homepage preview, in each state worth looking at.
//
//   python3 scripts/build_cool.py && python3 scripts/preview_home.py
//   node scripts/shoot_home.mjs .preview ../previews/shots [prefix]                  # straight from the folder, no server
//   node scripts/shoot_home.mjs http://localhost:8123 ../previews/shots [prefix]    # or from a running server
//
// Given a folder, the browser's requests to a made-up origin are answered from its files, so nothing has to be listening.
//
// Writes <outDir>/<prefix>-{desktop,mobile}-{light,dark}.png, -{desktop,mobile}-open.png (an item's panel),
// -{desktop,mobile}-{seq,skl}.png (the other views) and, with --intro, a few frames of the intro.
// The intro is skipped otherwise. The page's default gel is agarose (UV); --gel=sds|western shoots another (?gel=…), and
// --coomassie is the older name for --gel=sds.
// Exits 1 if the page logged an error, failed a request or scrolls sideways.
// playwright-core is not a dependency of the site: point PW_MODULES at a node_modules folder that has it.
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { resolve, extname, sep } from "node:path";

const PW = process.env.PW_MODULES || "/private/tmp/claude-501/-Users-ak98-Desktop-Projects-alexkim-medsci/2c88eaf7-ab58-4ae9-9789-b7ec1b7d6777/scratchpad/pw/node_modules";
const { chromium } = createRequire(resolve(PW, "_.js"))("playwright-core");
const args = process.argv.slice(2).filter(a => !a.startsWith("--")), flags = new Set(process.argv.slice(2).filter(a => a.startsWith("--")));
const DIR = /^https?:/.test(args[0] || "") ? null : resolve(args[0] || ".preview");
const BASE = DIR ? "http://preview.local" : args[0].replace(/\/$/, ""), OUT = resolve(args[1] || "shots"), PRE = args[2] || "home";
const ITEM = process.env.SHOOT_ITEM || "";   // the item to open; the first one when unset
const GEL = ([...flags].find(f => f.startsWith("--gel=")) || "").slice(6) || (flags.has("--coomassie") ? "sds" : "");
if (GEL && !["agarose", "sds", "western"].includes(GEL)) { console.error(`unknown --gel=${GEL} (agarose, sds or western)`); process.exit(2); }
const HOME = "/" + (GEL ? "?gel=" + GEL : "");
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const SIZES = [["desktop", 1440, 900, false], ["mobile", 390, 844, true]];

const MIME = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".pdf": "application/pdf", ".ico": "image/x-icon", ".woff2": "font/woff2" };
const fromDisk = route => {
  let rel = decodeURIComponent(new URL(route.request().url()).pathname); if (rel.endsWith("/")) rel += "index.html";
  const f = resolve(DIR, "." + rel);
  try {
    if (f !== DIR && !f.startsWith(DIR + sep)) throw 0;
    if (!statSync(f).isFile()) throw 0;
    return route.fulfill({ status: 200, contentType: MIME[extname(f)] || "application/octet-stream", body: readFileSync(f) });
  } catch (e) { return route.fulfill({ status: 404, contentType: "text/plain", body: "not found" }); }
};
const br = await chromium.launch({ channel: "chrome", headless: true });
async function page(tag, w, h, scheme, mobile, intro) {
  const c = await br.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, userAgent: mobile ? UA : undefined });
  if (!intro) await c.addInitScript(() => { try { localStorage.setItem("ak-intro-seen", "1"); localStorage.setItem("ak-last", String(Date.now())); } catch (e) {} });
  if (DIR) await c.route(BASE + "/**", fromDisk);
  const p = await c.newPage();
  p.on("console", m => { if (m.type() === "error" || m.type() === "warning") problems.push(`${tag}: console ${m.type()}: ${m.text()}`); });
  p.on("pageerror", e => problems.push(`${tag}: page error: ${e.message}`));
  p.on("requestfailed", r => problems.push(`${tag}: request failed: ${r.url()}`));
  p.on("response", r => { if (r.status() >= 400 && !r.url().endsWith("/favicon.ico")) problems.push(`${tag}: ${r.status()} ${r.url()}`); });
  return p;
}
const ready = async p => { await p.waitForSelector('body[data-ready="1"]', { timeout: 15000 }); await p.evaluate(() => document.fonts.ready); };
const settle = async (p, ms = 900) => { await p.waitForFunction(() => !window.__site.busy, null, { timeout: 15000 }); await sleep(ms); };
async function shot(p, tag) {
  const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  if (o.sw > o.iw + 1) problems.push(`${tag}: page scrolls sideways (${o.sw} > ${o.iw})`);
  await p.screenshot({ path: `${OUT}/${PRE}-${tag}.png` });
  console.log(`${PRE}-${tag}.png`);
}

for (const [vn, w, h, mob] of SIZES) {
  for (const scheme of ["light", "dark"]) {
    const p = await page(`${vn}-${scheme}`, w, h, scheme, mob);
    await p.goto(BASE + HOME, { waitUntil: "load" }); await ready(p); await settle(p);
    await shot(p, `${vn}-${scheme}`);
    if (scheme === "light") {
      for (const mode of ["seq", "skl"]) {
        const has = await p.evaluate(m => !!document.querySelector(`[data-mode=${m}]`), mode);
        if (!has) continue;
        await p.evaluate(m => window.__site.setMode(m), mode); await settle(p, 1400);
        await shot(p, `${vn}-${mode}`);
      }
      await p.evaluate(() => window.__site.setMode("map")); await settle(p, 1200);
      const id = ITEM || await p.evaluate(() => window.__site.ITEMS[0].id);
      await p.evaluate(i => { location.hash = "#" + i; }, id); await sleep(1800);
      await shot(p, `${vn}-open`);
    }
    await p.context().close();
  }
}
if (flags.has("--intro")) {
  const p = await page("intro", 1440, 900, "light", false, true);
  await p.goto(BASE + HOME + "#intro", { waitUntil: "domcontentloaded" }); const t0 = Date.now();
  for (const t of [400, 900, 1500, 2200, 3000, 3800, 5000]) { await sleep(Math.max(0, t - (Date.now() - t0))); await p.screenshot({ path: `${OUT}/${PRE}-intro-${t}ms.png` }); console.log(`${PRE}-intro-${t}ms.png`); }
  await p.context().close();
}
await br.close();
if (problems.length) { console.error(`\n${problems.length} problem(s):\n` + problems.map(s => "  - " + s).join("\n")); process.exit(1); }
console.log("no console errors, failed requests or sideways scroll");
