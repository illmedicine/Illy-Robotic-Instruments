/* Shared helpers for the Analyze engines: browser-profile storage, number and date parsing, delimited text.
 * Engines here are pure; they import only from this file and ./org.js. */

const NS = "ppm.analyze.v1";

export const store = {
  get(k, fallback = null) {
    try {
      const raw = localStorage.getItem(`${NS}.${k}`);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(k, value) {
    try {
      localStorage.setItem(`${NS}.${k}`, JSON.stringify(value));
      return true;
    } catch {
      console.warn("Browser storage is full or blocked; changes were not saved.");
      return false;
    }
  },
  remove(k) {
    try { localStorage.removeItem(`${NS}.${k}`); } catch { /* ignore */ }
  },
};

/** A date-only string is local midnight; new Date("2026-11-06") would be UTC and show the previous day. */
export function parseLocalDate(v) {
  if (v instanceof Date) return v;
  const s = String(v ?? "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(s);
}

export const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const t = parseLocalDate(dateStr).getTime();
  if (Number.isNaN(t)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((t - today.getTime()) / 86400000);
};

export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const toNum = (v, fallback = 0) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (v == null) return fallback;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
};

/** RFC 4180 aware: handles quotes and CRLF. */
export function parseDelimited(text, delimiter) {
  const src = text.replace(/^\uFEFF/, "");
  const d = delimiter || sniffDelimiter(src);
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === d) { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => String(v).trim() !== ""));
}

function sniffDelimiter(text) {
  const line = text.split(/\r?\n/).find((l) => l.trim()) ?? "";
  const counts = [
    [",", (line.match(/,/g) || []).length],
    ["\t", (line.match(/\t/g) || []).length],
    [";", (line.match(/;/g) || []).length],
    ["|", (line.match(/\|/g) || []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

export function normaliseHeader(h) {
  return String(h)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "_");
}

/** Parse delimited text into objects keyed by normalised header name. */
export function parseTable(text) {
  const rows = parseDelimited(text);
  if (!rows.length) return { headers: [], rows: [], raw: [] };
  const headers = rows[0].map((h) => String(h).trim());
  const keys = headers.map(normaliseHeader);
  const out = rows.slice(1).map((r) => {
    const o = {};
    keys.forEach((k, i) => { o[k] = (r[i] ?? "").trim(); });
    o.__raw = r;
    return o;
  });
  return { headers, keys, rows: out, raw: rows };
}

/** First row key matching any candidate: exact matches first, then substring. */
export function pickKey(keys, candidates) {
  for (const cand of candidates) {
    const exact = keys.find((k) => k === cand);
    if (exact) return exact;
  }
  for (const cand of candidates) {
    const partial = keys.find((k) => k.includes(cand));
    if (partial) return partial;
  }
  return null;
}

export function readFileText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(new Error(`Could not read ${file.name}`));
    r.readAsText(file);
  });
}

/** Spreadsheet formula injection from user-controlled text is neutralised. */
export function toCSV(rows, headers) {
  const cols = headers ?? Object.keys(rows[0] ?? {});
  const cell = (v) => {
    let s = v == null ? "" : String(v);
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
}

export const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

export function downloadBlob(filename, content, type = "text/plain;charset=utf-8") {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
