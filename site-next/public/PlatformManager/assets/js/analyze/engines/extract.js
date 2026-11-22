/* =============================================================================
 * engines/extract.js — text extraction from uploaded contract documents.
 *
 * Runs entirely in the browser with no libraries: documents never leave the
 * workstation. Supported: .docx, .txt/.md, .html/.htm, .rtf, .csv/.json and
 * best-effort .pdf (with a quality check so poor extraction is reported rather
 * than silently analysed).
 * ========================================================================== */

import { parseDelimited } from "../core.js";

const dec = new TextDecoder("utf-8", { fatal: false });

/** Excel's "Unicode Text" and older "CSV" saves are UTF-16 or Windows-1252, which a plain UTF-8 read turns to noise. */
function decodeText(buf) {
  if (buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder("utf-16le").decode(buf);
  if (buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder("utf-16be").decode(buf);
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buf); } catch { return new TextDecoder("windows-1252").decode(buf); }
}

async function inflate(bytes, format) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot decompress documents (DecompressionStream unavailable). Use a current Edge or Chrome.");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/* ---------------- ZIP (docx) ---------------- */
function readZipEntries(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Not a valid .docx file (zip directory not found).");

  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const entries = new Map();

  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const usize = dv.getUint32(p + 24, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOff = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));
    entries.set(name, { method, csize, usize, localOff });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return { entries, dv };
}

async function zipRead(buf, zip, name) {
  const e = zip.entries.get(name);
  if (!e) return null;
  const lo = e.localOff;
  const nameLen = zip.dv.getUint16(lo + 26, true);
  const extraLen = zip.dv.getUint16(lo + 28, true);
  const start = lo + 30 + nameLen + extraLen;
  const data = buf.subarray(start, start + e.csize);
  if (e.method === 0) return data;
  if (e.method === 8) return inflate(data, "deflate-raw");
  throw new Error(`Unsupported zip compression method ${e.method}.`);
}

async function extractDocx(buf) {
  const zip = readZipEntries(buf);
  const body = await zipRead(buf, zip, "word/document.xml");
  if (!body) throw new Error("This .docx has no document body.");
  const xml = dec.decode(body);

  const paraText = (x) => decodeEntities(x
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g, "$1\u0001")
    .replace(/<[^>]+>/g, "")
    .replace(/\u0001/g, "")).trim();

  // A table row becomes one line with its cells joined by " | ", so a quote's columns stay together.
  const paras = [];
  for (const m of xml.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>|<w:p[ >][\s\S]*?<\/w:p>/g)) {
    if (m[0].startsWith("<w:tr")) {
      const cells = [...m[0].matchAll(/<w:tc[ >][\s\S]*?<\/w:tc>/g)]
        .map((c) => [...c[0].matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((p) => paraText(p[0])).filter(Boolean).join(" "));
      paras.push(cells.some(Boolean) ? cells.join(" | ") : "");
    } else {
      paras.push(paraText(m[0]));
    }
  }
  return paras.filter(Boolean).join("\n");
}

const decodeEntities = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");

/* ---------------- HTML / RTF ---------------- */
function extractHtml(text) {
  const doc = new DOMParser().parseFromString(text, "text/html");
  doc.querySelectorAll("script,style,noscript").forEach((n) => n.remove());
  doc.querySelectorAll("tr").forEach((tr) => {
    const cells = [...tr.children].map((c) => c.textContent.replace(/\s+/g, " ").trim());
    tr.replaceWith(doc.createTextNode(`${cells.join(" | ")}\n`));
  });
  doc.querySelectorAll("p,li,div,h1,h2,h3,h4,h5,h6,br").forEach((n) => n.append(doc.createTextNode("\n")));
  return (doc.body?.innerText ?? doc.body?.textContent ?? "").replace(/\n{3,}/g, "\n\n");
}

function extractRtf(text) {
  return text
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\'([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\[a-z]+-?\d* ?/gi, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

/* ---------------- PDF (best effort) ---------------- */
/** The end-of-line before "endstream" is not part of the data, and a strict inflater rejects it. */
async function inflateStream(chunk) {
  try {
    return await inflate(chunk, "deflate");
  } catch (err) {
    let e = chunk.length;
    while (e > 0 && chunk.length - e < 2 && (chunk[e - 1] === 10 || chunk[e - 1] === 13)) e--;
    if (e === chunk.length) throw err;
    return inflate(chunk.subarray(0, e), "deflate");
  }
}

async function extractPdf(buf) {
  const latin = new TextDecoder("latin1").decode(buf);
  const out = [];
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(latin))) {
    if (latin.slice(Math.max(0, m.index - 3), m.index) === "end") continue;
    const start = m.index + m[0].length;
    const end = latin.indexOf("endstream", start);
    if (end < 0) break;
    const head = latin.slice(Math.max(0, m.index - 300), m.index);
    let chunk = buf.subarray(start, end);
    try {
      if (/FlateDecode/.test(head)) chunk = await inflateStream(chunk);
      else if (/\/Filter/.test(head)) continue;
    } catch {
      continue;
    }
    const s = new TextDecoder("latin1").decode(chunk);
    if (!/BT[\s\S]*ET/.test(s)) continue;
    const text = contentStreamText(s);
    if (text.trim()) out.push(text);
  }
  return out.join("\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

const cp1252 = new TextDecoder("windows-1252");
const toUnicode = (s) => cp1252.decode(Uint8Array.from(s, (c) => c.charCodeAt(0) & 255));

/** Splits a PDF content stream into strings, hex strings, numbers and operators. */
function* pdfTokens(s) {
  const n = s.length;
  const isDelim = (c) => /[\s()<>[\]{}/%]/.test(c);
  let i = 0;
  while (i < n) {
    const c = s[i];
    if (c <= " ") { i++; continue; }
    if (c === "%") { while (i < n && s[i] !== "\n" && s[i] !== "\r") i++; continue; }
    if (c === "(") {
      let depth = 1, j = i + 1, v = "";
      while (j < n && depth) {
        const d = s[j];
        if (d === "\\") { v += d + (s[j + 1] ?? ""); j += 2; continue; }
        if (d === "(") depth++;
        else if (d === ")") { depth--; if (!depth) break; }
        v += d; j++;
      }
      yield { t: "str", v: unescapePdf(v) };
      i = j + 1; continue;
    }
    if (c === "<") {
      if (s[i + 1] === "<") { yield { t: "op", v: "<<" }; i += 2; continue; }
      const j = s.indexOf(">", i);
      if (j < 0) break;
      const hex = s.slice(i + 1, j).replace(/\s+/g, "");
      let v = "";
      for (let k = 0; k + 1 < hex.length; k += 2) v += String.fromCharCode(parseInt(hex.slice(k, k + 2), 16));
      yield { t: "hex", v };
      i = j + 1; continue;
    }
    if (c === ">") { if (s[i + 1] === ">") { yield { t: "op", v: ">>" }; i += 2; } else i++; continue; }
    if (c === "[" || c === "]") { yield { t: "op", v: c }; i++; continue; }
    if (c === "/") { let j = i + 1; while (j < n && !isDelim(s[j])) j++; yield { t: "name", v: s.slice(i + 1, j) }; i = j; continue; }
    let j = i;
    while (j < n && !isDelim(s[j])) j++;
    if (j === i) { i++; continue; }
    const w = s.slice(i, j);
    yield /^[+-]?(\d+\.?\d*|\.\d+)$/.test(w) ? { t: "num", v: Number(w) } : { t: "op", v: w };
    i = j;
  }
}

/**
 * Reads the text of one content stream in reading order. Text is often split into one tiny
 * block per word or per run, so line breaks come from vertical position and spaces from the
 * horizontal gap rather than from every positioning operator.
 */
function contentStreamText(s) {
  let out = "";
  let size = 10, leading = 0, lineX = 0, lineY = 0, x = 0;
  let prevY = null, prevEnd = null;
  let stack = [], arr = null;

  const show = (str) => {
    if (!str) return;
    const txt = toUnicode(str);
    const adv = size * 0.5;
    if (prevY !== null) {
      if (Math.abs(lineY - prevY) > Math.max(2, size * 0.4)) out += Math.abs(lineY - prevY) > size * 1.9 ? "\n\n" : "\n";
      else if (x - prevEnd > size * 0.3 && !/\s$/.test(out) && !/^\s/.test(txt)) out += " ";
    }
    out += txt;
    prevY = lineY;
    x += txt.length * adv;
    prevEnd = x;
  };

  for (const tok of pdfTokens(s)) {
    if (tok.t === "op" && tok.v === "[") { arr = []; continue; }
    if (arr) {
      if (tok.t === "op" && tok.v === "]") { stack.push({ t: "arr", v: arr }); arr = null; }
      else if (tok.t === "str" || tok.t === "hex" || tok.t === "num") arr.push(tok);
      continue;
    }
    if (tok.t !== "op") { stack.push(tok); continue; }

    const nums = stack.filter((a) => a.t === "num").map((a) => a.v);
    const last = stack[stack.length - 1];
    switch (tok.v) {
      case "BT": lineX = 0; lineY = 0; x = 0; break;
      case "Tf": if (nums.length) size = Math.abs(nums[nums.length - 1]) || size; break;
      case "TL": if (nums.length) leading = nums[0]; break;
      case "Td": if (nums.length >= 2) { lineX += nums[0]; lineY += nums[1]; x = lineX; } break;
      case "TD": if (nums.length >= 2) { lineX += nums[0]; lineY += nums[1]; leading = -nums[1]; x = lineX; } break;
      case "Tm": if (nums.length >= 6) { lineX = nums[4]; lineY = nums[5]; x = lineX; } break;
      case "T*": lineY -= leading; x = lineX; break;
      case "Tj": if (last?.t === "str") show(last.v); else if (last?.t === "hex" && /^[\x20-\x7e\xa0-\xff]*$/.test(last.v)) show(last.v); break;
      case "'": case '"': lineY -= leading; x = lineX; if (last?.t === "str") show(last.v); break;
      case "TJ":
        if (last?.t === "arr") {
          for (const el of last.v) {
            if (el.t === "num") { x -= (el.v / 1000) * size; if (el.v < -180 && !/\s$/.test(out)) out += " "; }
            else if (el.t === "str" || (el.t === "hex" && /^[\x20-\x7e\xa0-\xff]*$/.test(el.v))) show(el.v);
          }
        }
        break;
      default: break;
    }
    stack = [];
  }
  return out;
}

const unescapePdf = (s) =>
  s.replace(/\\([nrtbf()\\])/g, (_, c) => ({ n: "\n", r: "", t: "\t", b: "", f: "", "(": "(", ")": ")", "\\": "\\" })[c])
    .replace(/\\(\d{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)));

/** Share of tokens that look like real words — catches font-encoded PDFs that extract as noise. */
export function textQuality(text) {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length < 30) return { ok: false, score: 0, words: tokens.length };
  const wordlike = tokens.filter((t) => /^[A-Za-z][a-z]{1,}[.,;:)]?$|^[A-Z][A-Za-z]+$|^\d[\d,.$%]*$/.test(t)).length;
  const score = wordlike / tokens.length;
  return { ok: score >= 0.45, score, words: tokens.length };
}

/* ---------------- Excel workbooks (.xlsx), read tab by tab ---------------- */
const xmlAttr = (tag, name) => { const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag); return m ? decodeEntities(m[1]) : null; };
const xmlText = (x) => decodeEntities([...x.replace(/<rPh[\s\S]*?<\/rPh>/g, "").matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""));
const colIndex = (ref) => { let n = 0; for (const ch of ref) { if (ch < "A" || ch > "Z") break; n = n * 26 + ch.charCodeAt(0) - 64; } return n - 1; };
const MAX_SHEET_ROWS = 20000, MAX_SHEET_COLS = 80;

function sheetRows(xml, strings) {
  const rows = [];
  for (const rm of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const rn = Number(xmlAttr(rm[1], "r")) || rows.length + 1;
    if (rn > MAX_SHEET_ROWS) break;
    const cells = [];
    for (const cm of (rm[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = xmlAttr(cm[1], "r");
      if (!ref) continue;
      const ci = colIndex(ref);
      if (ci < 0 || ci >= MAX_SHEET_COLS) continue;
      const t = xmlAttr(cm[1], "t");
      const body = cm[2] ?? "";
      let v;
      if (t === "inlineStr") v = xmlText(body);
      else {
        const vm = body.match(/<v>([\s\S]*?)<\/v>/);
        v = vm ? decodeEntities(vm[1]) : "";
        if (t === "s") v = strings[Number(v)] ?? "";
        else if ((!t || t === "n") && /^-?\d+\.\d{6,}$/.test(v)) v = String(Number(Number(v).toFixed(4)));
      }
      cells[ci] = String(v).replace(/\s+/g, " ").trim();
    }
    if (cells.some(Boolean)) rows[rn - 1] = Array.from(cells, (c) => c ?? "");
  }
  return Array.from(rows, (r) => r ?? []);
}

/** Every tab of a workbook as rows of text. Hidden tabs are included and marked. */
export async function readWorkbook(buf) {
  const zip = readZipEntries(buf);
  const read = async (n) => { const b = await zipRead(buf, zip, n); return b ? dec.decode(b) : null; };
  const wb = await read("xl/workbook.xml");
  if (!wb) throw new Error("This .xlsx has no workbook part; it may be damaged.");
  const rels = (await read("xl/_rels/workbook.xml.rels")) ?? "";
  const target = new Map([...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => [xmlAttr(m[0], "Id"), xmlAttr(m[0], "Target")]));
  const sst = await read("xl/sharedStrings.xml");
  const strings = sst ? [...sst.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => xmlText(m[1])) : [];
  const sheets = [];
  for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const rid = xmlAttr(m[0], "r:id") ?? xmlAttr(m[0], "id");
    let path = target.get(rid);
    if (!path) continue;
    path = path.replace(/^\//, "");
    if (!path.startsWith("xl/")) path = `xl/${path}`;
    const xml = await read(path);
    if (xml == null) continue;
    sheets.push({ name: xmlAttr(m[0], "name") ?? "Sheet", hidden: /state="(?:hidden|veryHidden)"/.test(m[0]), rows: sheetRows(xml, strings) });
  }
  return sheets;
}

const cellNum = (s) => { const n = Number(String(s ?? "").replace(/[$,\s]/g, "")); return String(s ?? "").trim() === "" ? NaN : n; };
const safeCell = (s) => String(s ?? "").replace(/[|"\r\n]+/g, " ").trim();

/**
 * Turns one price tab into the pipe-delimited quote table the price reader understands. The header row is
 * found by its columns (a product, a quantity and a price), year groups ("Year 1", "Year 2") above the
 * price columns are kept, and section rows such as "Enterprise Tenant ID: X" label the lines under them.
 * Returns null when the tab holds no price table.
 */
export function sheetToQuoteText(rows) {
  let h = -1, c = null;
  for (let i = 0; i < Math.min(rows.length, 30) && h < 0; i++) {
    const r = rows[i] ?? [];
    const find = (re) => r.findIndex((x) => re.test(String(x)));
    const desc = find(/product|description|item|offer|service|name/i), qty = find(/^(?:qty|quantity|seats?|users|licen[sc]es)\b/i);
    const prices = r.map((x, j) => (/price|rate|cost/i.test(String(x)) && !/total|extended|amount|list/i.test(String(x)) ? j : -1)).filter((j) => j >= 0);
    if (desc >= 0 && prices.length) {
      h = i;
      const label = [];
      const above = rows[i - 1] ?? [];
      let cur = "";
      for (let j = 0; j < Math.max(r.length, above.length); j++) { if (/year\s*\d+/i.test(String(above[j] ?? ""))) cur = String(above[j]); label[j] = cur; }
      const totals = r.map((x, j) => (/total|extended|amount/i.test(String(x)) ? j : -1)).filter((j) => j >= 0);
      c = { desc, qty, prices, totals, label, part: find(/part|sku/i), months: find(/months?\s*\/?\s*(?:year|yr)|^term|months/i) };
    }
  }
  if (!c) return null;
  const yearOf = (j, order) => Number(/year\s*(\d+)/i.exec(c.label[j] ?? "")?.[1]) || order + 1;
  const cols = c.prices.map((j, order) => ({ j, y: yearOf(j, order) }));
  const yearCount = new Set(cols.map((x) => x.y)).size;
  const first = cols[0];
  const total1 = c.totals.find((j) => j > first.j && yearOf(j, 0) === first.y) ?? c.totals.find((j) => j > first.j) ?? -1;
  const later = cols.filter((x) => x.y > first.y && x.y <= 9);

  const out = [["Product", "Part Number", "Term (months)", "Quantity", "Unit Price", "UOM", "Total", ...later.map((x) => `Yr${x.y} Amt`)].join(" | ")];
  let tenant = "", lines = 0;
  const tenants = new Set();
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const filled = r.filter((x) => String(x).trim() !== "");
    if (!filled.length) continue;
    const q = c.qty >= 0 ? cellNum(r[c.qty]) : 0, p = cellNum(r[first.j]);
    if (!(p > 0) || (c.qty >= 0 && !(q > 0))) {
      if (filled.length === 1 && Number.isNaN(cellNum(filled[0]))) tenant = /tenant id\s*:\s*(.+)$/i.exec(filled[0])?.[1].trim() ?? "";
      continue;
    }
    const months = c.months >= 0 ? cellNum(r[c.months]) : NaN;
    if (tenant) tenants.add(tenant);
    const m = months > 0 ? months : 12;
    const t1 = total1 >= 0 ? cellNum(r[total1]) : NaN;
    const ratio = t1 > 0 && q > 0 ? t1 / (q * p) : NaN;
    const uom = !(ratio > 0) || Math.abs(ratio - m) <= m * 0.02 ? "per month" : Math.abs(ratio - 1) <= 0.02 ? (m === 12 ? "per year" : "per term") : "per month";
    out.push([
      safeCell(`${r[c.desc] ?? ""}${tenant ? ` (Tenant: ${tenant})` : ""}`), safeCell(c.part >= 0 ? r[c.part] : ""),
      yearCount >= 2 ? 12 * yearCount : m, q > 0 ? q : "", p, uom, Number.isFinite(t1) ? t1 : "",
      ...later.map((x) => { const v = cellNum(r[x.j]); return v > 0 ? v : ""; }),
    ].join(" | "));
    lines++;
  }
  return lines ? { text: out.join("\n"), lines, years: yearCount, tenants: tenants.size, yearLabels: c.prices.some((j) => /year\s*\d+/i.test(c.label[j] ?? "")) } : null;
}

/** What a table holds, in words, for when no prices could be read from it. */
export function describeRows(rows) {
  const filled = rows.filter((r) => (r ?? []).some((x) => String(x).trim() !== ""));
  const head = filled.find((r) => r.filter((x) => String(x).trim() !== "").length >= 2) ?? filled[0] ?? [];
  const money = filled.reduce((n, r) => n + r.filter((x) => /\$\s?\d|^\s*\d[\d,]*\.\d{2}\s*$/.test(String(x))).length, 0);
  return { rows: filled.length, header: head.map((x) => String(x).trim()).filter(Boolean).slice(0, 10), amounts: money };
}

/** Reads delimited text (a CSV tab or a paste from Excel) the way a workbook tab is read; null when it holds no price table. */
export function tableToQuoteText(text) {
  const rows = parseDelimited(String(text), undefined).map((r) => r.map((x) => String(x).trim()));
  return sheetToQuoteText(rows);
}

/** A workbook as separate documents, one per tab that holds a price table. */
export async function extractWorkbook(file) {
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than ${MAX_BYTES / 1048576} MB.`);
  const sheets = await readWorkbook(new Uint8Array(await file.arrayBuffer()));
  if (!sheets.length) throw new Error(`${file.name} has no tabs that could be read.`);
  return sheets.map((s) => ({ name: s.name, hidden: s.hidden, rowCount: s.rows.length, seen: describeRows(s.rows), ...(sheetToQuoteText(s.rows) ?? { text: null, lines: 0, years: 0 }) }));
}

/* ---------------- Public API ---------------- */
export const ACCEPTED = ".docx,.pdf,.txt,.md,.html,.htm,.rtf,.csv,.tsv,.json,.xlsx,.xlsm";
export const MAX_BYTES = 25 * 1024 * 1024;

export async function extractText(file) {
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than ${MAX_BYTES / 1048576} MB.`);
  const name = file.name.toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
  const buf = new Uint8Array(await file.arrayBuffer());

  let text;
  let method = ext;
  switch (ext) {
    case "docx":
      text = await extractDocx(buf);
      break;
    case "pdf":
      text = await extractPdf(buf);
      method = "pdf (best effort)";
      break;
    case "html":
    case "htm":
      text = extractHtml(dec.decode(buf));
      break;
    case "rtf":
      text = extractRtf(dec.decode(buf));
      break;
    case "doc":
      throw new Error("Legacy .doc is not supported. Save the document as .docx and upload again.");
    case "xls": case "xlsb":
      throw new Error(`.${ext} is an older Excel format. In Excel use Save As and choose Excel Workbook (.xlsx) or CSV, then upload that.`);
    case "xlsx": case "xlsm":
      throw new Error("Workbooks are read tab by tab; use extractWorkbook.");
    case "txt": case "md": case "csv": case "tsv": case "json": case "":
      text = decodeText(buf);
      break;
    default:
      throw new Error(`.${ext} files are not supported. Use .docx, .pdf, .txt, .md, .html or .rtf, or paste the text.`);
  }

  text = text.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ").trim();
  const quality = textQuality(text);
  const warning = !quality.ok
    ? ext === "pdf"
      ? "Text could not be reliably read from this PDF (it is probably scanned or uses embedded font encoding). Export it to .docx or paste the text for an accurate review."
      : "Very little readable text was found in this file."
    : null;

  return { name: file.name, size: file.size, method, text, quality, warning };
}

/** SHA-256 hex digest of bytes, or null where Web Crypto is unavailable (non-HTTPS origin). */
export async function sha256Bytes(bytes) {
  if (!globalThis.crypto?.subtle) return null;
  const d = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Identifies a document version without storing its contents. */
export async function sha256(file) {
  return sha256Bytes(await file.arrayBuffer());
}

/* ---------------- Export bundles (.zip of CSV/JSON files) ---------------- */
export const ZIP_LIMITS = { files: 40, bytesPerFile: 150 * 1024 * 1024, totalBytes: 300 * 1024 * 1024, zipBytes: 100 * 1024 * 1024 };

/** Inflate with a hard output cap, so a hostile or corrupt archive cannot exhaust memory. */
async function inflateCapped(bytes, max) {
  if (typeof DecompressionStream === "undefined") throw new Error("This browser cannot unpack .zip files. Use a current Edge or Chrome.");
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) { await reader.cancel(); throw new Error("A file inside the archive is larger than the allowed size."); }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  return out;
}

/**
 * Reads the text files (.csv, .json, .txt) from a .zip. Returns { "name.csv": "text", ... } keyed by
 * the base file name, ignoring folders, hidden files and anything else in the archive.
 */
export async function unzipTextFiles(file, limits = ZIP_LIMITS) {
  if (file.size > limits.zipBytes) throw new Error(`${file.name} is larger than ${limits.zipBytes / 1048576} MB.`);
  const buf = new Uint8Array(await file.arrayBuffer());
  const zip = readZipEntries(buf);
  const out = {};
  let total = 0;
  let count = 0;
  for (const [path, e] of zip.entries) {
    const base = path.split(/[\\/]/).pop();
    if (!base || path.endsWith("/") || path.startsWith("__MACOSX") || base.startsWith(".") || !/\.(csv|json|txt)$/i.test(base)) continue;
    if (++count > limits.files) throw new Error(`The archive contains more than ${limits.files} data files.`);
    if (e.usize > limits.bytesPerFile) throw new Error(`${base} is larger than ${limits.bytesPerFile / 1048576} MB.`);
    const lo = e.localOff;
    if (zip.dv.getUint32(lo, true) !== 0x04034b50) throw new Error(`${base}: the archive is damaged.`);
    const start = lo + 30 + zip.dv.getUint16(lo + 26, true) + zip.dv.getUint16(lo + 28, true);
    const raw = buf.subarray(start, start + e.csize);
    let bytes;
    if (e.method === 0) bytes = raw;
    else if (e.method === 8) bytes = await inflateCapped(raw, limits.bytesPerFile);
    else throw new Error(`${base}: unsupported compression method ${e.method}.`);
    total += bytes.length;
    if (total > limits.totalBytes) throw new Error("The archive's files are larger than the allowed total size.");
    out[base] = dec.decode(bytes).replace(/^\uFEFF/, "");
  }
  if (!count) throw new Error("The archive contains no .csv, .json or .txt files.");
  return out;
}
