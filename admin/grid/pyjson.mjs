// JSON in exactly the text Python writes for _cool/: json.dumps(obj, indent=2, ensure_ascii=False) + "\n".
// JavaScript loses one thing Python keeps: 1.0 and 1 are both the number 1. parse() remembers which numbers
// were written as floats (FLOATS: container -> set of keys), stringify() writes those back as 1.0, and
// pyRepr()/pyStr() print values the way build_cool.py's messages do.

const FLOATS = new WeakMap();

export const isFloat = (box, key) => FLOATS.get(box)?.has(key) ?? false;
export function markFloat(box, key, on = true) {
  if (!FLOATS.has(box)) FLOATS.set(box, new Set());
  FLOATS.get(box)[on ? "add" : "delete"](key);
}

export class JSONError extends Error {
  constructor(msg, text, at) {
    const before = text.slice(0, at).split("\n");
    super(`line ${before.length}, column ${before[before.length - 1].length + 1}: ${msg}`);
  }
}

export function parse(text) {
  let i = 0;
  const ws = () => {
    while (" \t\n\r".includes(text[i]) && i < text.length) i++;
  };
  const fail = (msg) => {
    throw new JSONError(msg, text, i);
  };
  const NUM = /-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/y;
  const STR = /"((?:[^"\\\u0000-\u001f]|\\["\\/bfnrt]|\\u[0-9a-fA-F]{4})*)"/y;
  function value(box, key) {
    ws();
    const c = text[i];
    if (c === "{") {
      i++;
      const o = {};
      ws();
      if (text[i] === "}") {
        i++;
        return o;
      }
      for (;;) {
        ws();
        if (text[i] !== '"') fail("Expecting property name enclosed in double quotes");
        const k = string();
        ws();
        if (text[i] !== ":") fail("Expecting ':' delimiter");
        i++;
        o[k] = value(o, k);
        ws();
        if (text[i] === ",") {
          i++;
          continue;
        }
        if (text[i] === "}") {
          i++;
          return o;
        }
        fail("Expecting ',' delimiter");
      }
    }
    if (c === "[") {
      i++;
      const a = [];
      ws();
      if (text[i] === "]") {
        i++;
        return a;
      }
      for (;;) {
        a.push(value(a, a.length));
        ws();
        if (text[i] === ",") {
          i++;
          continue;
        }
        if (text[i] === "]") {
          i++;
          return a;
        }
        fail("Expecting ',' delimiter");
      }
    }
    if (c === '"') return string();
    for (const [w, v] of [
      ["true", true],
      ["false", false],
      ["null", null],
    ])
      if (text.startsWith(w, i)) {
        i += w.length;
        return v;
      }
    NUM.lastIndex = i;
    const m = NUM.exec(text);
    if (!m) fail("Expecting value");
    i = NUM.lastIndex;
    if (m[2] || m[3]) markFloat(box, key);
    return Number(m[0]);
  }
  function string() {
    STR.lastIndex = i;
    const m = STR.exec(text);
    if (!m) fail("Invalid string");
    i = STR.lastIndex;
    return JSON.parse(m[0]);
  }
  const root = { v: undefined };
  const v = value(root, "v");
  ws();
  if (i < text.length) fail("Extra data");
  return v;
}

// Python's float repr: shortest round-trip digits, exponent form below 1e-4 and from 1e16 up, "e-05" style.
export function pyFloat(x) {
  if (Object.is(x, -0)) return "-0.0";
  const a = Math.abs(x);
  if (x !== 0 && (a < 1e-4 || a >= 1e16)) {
    const [m, e] = x.toExponential().split("e");
    const n = Number(e);
    return `${m}e${n < 0 ? "-" : "+"}${String(Math.abs(n)).padStart(2, "0")}`;
  }
  const s = String(x);
  return Number.isInteger(x) ? s + ".0" : s;
}

const num = (x, float) => (float || !Number.isInteger(x) ? pyFloat(x) : String(x));

export function stringify(v) {
  const out = (v, box, key, pad) => {
    if (v === null) return "null";
    if (typeof v === "boolean") return String(v);
    if (typeof v === "number") return num(v, isFloat(box, key));
    if (typeof v === "string") return JSON.stringify(v);
    const inner = pad + "  ";
    if (Array.isArray(v)) {
      if (!v.length) return "[]";
      return "[\n" + v.map((x, n) => inner + out(x, v, n, inner)).join(",\n") + "\n" + pad + "]";
    }
    const ks = Object.keys(v);
    if (!ks.length) return "{}";
    return "{\n" + ks.map((k) => inner + JSON.stringify(k) + ": " + out(v[k], v, k, inner)).join(",\n") + "\n" + pad + "}";
  };
  return out(v, null, null, "") + "\n";
}

// Python's repr() of a JSON value, as in build_cool.py's f"{x!r}".
export function pyRepr(v, float = false) {
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (typeof v === "number") return num(v, float);
  if (typeof v === "string") {
    const q = v.includes("'") && !v.includes('"') ? '"' : "'";
    let s = "";
    for (const ch of v) {
      const c = ch.codePointAt(0);
      if (ch === "\\") s += "\\\\";
      else if (ch === q) s += "\\" + q;
      else if (ch === "\n") s += "\\n";
      else if (ch === "\r") s += "\\r";
      else if (ch === "\t") s += "\\t";
      else if (c < 0x20 || c === 0x7f) s += "\\x" + c.toString(16).padStart(2, "0");
      else s += ch;
    }
    return q + s + q;
  }
  if (Array.isArray(v)) return "[" + v.map((x, n) => pyRepr(x, isFloat(v, n))).join(", ") + "]";
  return (
    "{" +
    Object.keys(v)
      .map((k) => pyRepr(k) + ": " + pyRepr(v[k], isFloat(v, k)))
      .join(", ") +
    "}"
  );
}

// Python's str(): like repr() except that text is printed bare.
export const pyStr = (v, float = false) => (typeof v === "string" ? v : pyRepr(v, float));
