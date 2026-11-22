import { h, icon, fmt, pill } from "../dom.js";

// replaceChildren turns a null argument into the text "null", so optional nodes are dropped first.
export const fill = (el, ...kids) => el.replaceChildren(...kids.flat().filter((k) => k != null && k !== false));

export const money = (n) => {
  if (!Number.isFinite(n)) return "-";
  const a = Math.abs(n), s = n < 0 ? "-" : "";
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e4) return `${s}$${fmt.n(Math.round(a / 1e3))}K`;
  return `${s}$${fmt.n(Math.round(a))}`;
};
export const pct = (n, dp = 0) => (Number.isFinite(n) ? `${(n * 100).toFixed(dp)}%` : "-");

export function kpi(label, value, note, tone) {
  return h("div", { class: "card kpi" + (tone ? " " + tone : "") },
    h("div", { class: "label", text: label }), h("div", { class: "value", text: value }), h("div", { class: "note" }, note || ""));
}

export function empty(message, hint) {
  return h("div", { class: "banner" }, icon("alert"), h("span", {}, h("b", { text: message + " " }), hint || ""));
}

export const note = (text, kind = "info") => h("div", { class: "banner " + kind }, icon(kind === "error" ? "alert" : "check"), h("span", { text }));

export function field(label, input, hint) {
  return h("label", { class: "field" }, h("span", { class: "muted", text: label }), input, hint ? h("small", { class: "muted", text: hint }) : null);
}

export const num = (value, attrs = {}) =>
  h("input", { class: "input", type: "number", min: "0", step: "any", value: value ?? "", ...attrs });
export const text = (value, attrs = {}) => h("input", { class: "input", type: "text", value: value ?? "", ...attrs });
export const date = (value, attrs = {}) => h("input", { class: "input", type: "date", value: value ?? "", ...attrs });
export const select = (options, value, attrs = {}) =>
  h("select", { class: "select", ...attrs }, options.map(([v, l]) => h("option", { value: v, selected: v === value ? "" : null, text: l })));

/** A labelled file chooser; `onFiles` receives the chosen File objects. */
export function filePicker(label, accept, onFiles, multiple = false) {
  const input = h("input", {
    class: "input", type: "file", accept, multiple: multiple ? "" : null, "aria-label": label,
    onchange: (e) => { const f = Array.from(e.target.files || []); e.target.value = ""; if (f.length) onFiles(f); },
  });
  return field(label, input);
}

export function bulletList(title, items) {
  if (!items || !items.length) return null;
  return h("div", {}, h("h4", { text: title }), h("ul", { class: "muted", style: { margin: "0 0 12px", paddingLeft: "18px" } }, items.map((x) => h("li", { text: x }))));
}

const LEVEL = { high: ["High", "risk"], med: ["Medium", "warn"], low: ["Low", "info"], ok: ["In place", "ok"], info: ["Info", "info"], save: ["Saving", "ok"] };
export const levelPill = (level) => pill(...(LEVEL[level] || [level, ""]));

const BASIS = { document: ["In the document", "info"], calculation: ["Calculation", ""], benchmark: ["Benchmark", "warn"], precedent: ["Precedent", "ok"] };

/** The written reasons behind a finding: what it rests on, with the quote and the source where there is one. */
export function whyList(items) {
  if (!items || !items.length) return null;
  return h("details", { class: "why" },
    h("summary", { text: `Why we say this (${items.length})` }),
    h("ul", { style: { margin: "6px 0 0", paddingLeft: "18px" } }, items.map((w) => {
      const b = BASIS[w.basis] || [w.basis, ""];
      const url = /^https:\/\//.test(w.url || "") ? w.url : null;
      return h("li", { style: { marginBottom: "8px" } },
        pill(b[0], b[1]), " ", w.text,
        w.quote ? h("blockquote", { class: "muted", style: { margin: "4px 0 0", paddingLeft: "10px", borderLeft: "3px solid var(--border, #ccc)", fontSize: "0.9em" }, text: `"${w.quote}"` }) : null,
        w.source ? h("small", { class: "muted", style: { display: "block", marginTop: "2px" } },
          "Source: ", url ? h("a", { href: url, target: "_blank", rel: "noopener noreferrer", text: w.source }) : w.source,
          w.verified === "secondary" ? " (consultancy source, not verified against a contract)" : w.verified === "document" ? " (read from the published agreement)" : w.verified === "primary" ? " (Microsoft's own published price list)" : "") : null);
    })));
}

/** One finding: title and level, explanation, and the ask to table. */
export function finding(f) {
  return h("div", { class: "card", style: { marginBottom: "10px" } },
    h("h3", {}, f.title, levelPill(f.level), f.scope === "environment" ? pill("Organization-specific", "info") : null),
    f.text ? h("p", { text: f.text }) : null,
    f.ask ? h("p", {}, h("b", { text: "Ask: " }), f.ask) : null,
    whyList(f.why));
}

/** Segmented tabs; `panels` maps a label to a function returning a node, built on first view. */
export function tabs(panels, initial, onShow) {
  const names = Object.keys(panels);
  const body = h("div", {});
  const bar = h("div", { class: "seg", role: "tablist", style: { marginBottom: "12px" } });
  const built = {};
  function show(name) {
    [...bar.children].forEach((b) => b.setAttribute("aria-pressed", String(b.textContent === name)));
    built[name] = built[name] || panels[name]();
    body.replaceChildren(built[name]);
    if (onShow) onShow(name);
  }
  names.forEach((n) => bar.append(h("button", { type: "button", role: "tab", text: n, onclick: () => show(n) })));
  show(initial && names.includes(initial) ? initial : names[0]);
  return h("div", {}, bar, body);
}
