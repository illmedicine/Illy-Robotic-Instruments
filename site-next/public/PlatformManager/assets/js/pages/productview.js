import { h, icon, fmt, pill } from "../dom.js";
import { dataTable } from "../ui.js";

export const personUseHref = (product, upn) => `#personuse/${product}/${encodeURIComponent(upn)}`;

function when(t) {
  return t ? h("span", { title: fmt.dt(t), text: fmt.ago(t) }) : h("span", { class: "muted", text: "-" });
}

function column(c) {
  const col = { key: c.key, label: c.label };
  if (c.kind === "num") {
    col.num = true;
    col.render = (r) => (r[c.key] == null ? "-" : fmt.n(r[c.key]));
  } else if (c.kind === "time") {
    col.sort = (r) => r[c.key] || "";
    col.render = (r) => when(r[c.key]);
    col.csv = (r) => r[c.key] || "";
  } else if (c.kind === "pill") {
    col.render = (r) => (r[c.key] ? pill(r[c.key], r[c.key + "_tone"] || "") : "");
  }
  return col;
}

// A caret section: the summary line is always visible, the body opens and closes.
export function caret(title, count, help, body, open, onToggle) {
  const d = h("details", { class: "cat", open: open ? true : null },
    h("summary", {}, icon("chevron"), h("span", { class: "cat-title", text: title }), count == null ? null : h("span", { class: "pill", text: fmt.n(count) }), help ? h("span", { class: "muted cat-help", text: help }) : null),
    h("div", { class: "cat-body" }, body));
  if (onToggle) d.addEventListener("toggle", () => onToggle(d.open));
  return d;
}

function plainTable(cols, rows) {
  return h("table", { class: "dt wrap" }, h("thead", {}, h("tr", {}, cols.map((c) => h("th", { class: c.num ? "num" : "", text: c.label })))),
    h("tbody", {}, rows.map((r) => h("tr", {}, cols.map((c) => h("td", { class: c.num ? "num" : "" }, c.render ? c.render(r) : r[c.key] ?? ""))))));
}

function sectionBody(s) {
  const cols = s.columns.map(column);
  const body = s.rows.length > 10
    ? dataTable({ rows: s.rows, columns: cols, csvName: s.id, pageSize: 15, searchText: (r) => Object.values(r).join(" ") })
    : plainTable(cols, s.rows);
  return h("div", {}, s.help ? h("p", { class: "muted", text: s.help }) : null, body,
    s.total > s.rows.length ? h("p", { class: "muted", text: `Showing the first ${fmt.n(s.rows.length)} of ${fmt.n(s.total)}.` }) : null);
}

function statsRow(stats) {
  return h("div", { class: "stats-row" }, stats.map((s) => h("div", { class: "statbox", title: s.note || "" },
    h("div", { class: "l", text: s.label }), h("div", { class: "v", text: typeof s.value === "number" ? fmt.n(s.value) : String(s.value) }),
    s.note ? h("div", { class: "n", text: s.note }) : null)));
}

function problemList(problems, limit) {
  const shown = limit ? problems.slice(0, limit) : problems;
  return h("ul", { class: "problems" }, shown.map((p) => h("li", {}, pill(p.kind, p.tone), h("span", { text: p.text }), p.time ? h("span", { class: "muted when", title: fmt.dt(p.time), text: fmt.ago(p.time) }) : null)));
}

const NONE = "No errors or restrictions seen in the data collected.";

// Licence and use notes: useful, but not something that went wrong for the person.
function observationsCard(list) {
  return list.length ? h("div", { class: "card" }, h("h3", {}, "Worth knowing", h("span", { class: "sub", text: "not errors" })), problemList(list)) : null;
}

function missing(v) {
  const gaps = v.sources.filter((s) => !s.ok).map((s) => s.name);
  return gaps.length ? h("div", { class: "banner info", text: `Not collected yet: ${gaps.join("; ")}. A gap there is not proof of no activity.` }) : null;
}

// The whole view of one product: numbers, what went wrong, then every table.
export function viewBlock(v) {
  const parts = [missing(v), statsRow(v.stats)];
  parts.push(h("div", { class: "card" }, h("h3", {}, "What went wrong", h("span", { class: "sub", text: `${fmt.n(v.problems.length)}` })),
    v.problemsHelp ? h("p", { class: "muted", text: v.problemsHelp }) : null,
    v.problems.length ? problemList(v.problems) : h("div", { class: "empty", text: v.available ? NONE : "Nothing to check yet." })));
  parts.push(observationsCard(v.observations || []));
  v.sections.forEach((s, i) => parts.push(caret(s.title, s.total, null, sectionBody(s), i < 3)));
  v.notes.forEach((n) => parts.push(h("p", { class: "muted", text: n })));
  return h("div", { class: "pview" }, parts);
}

// The short form for the overview: headline numbers, the first problems and a link to everything.
export function summaryBlock(sum, upn) {
  return h("div", { class: "pview" }, missing(sum), statsRow(sum.stats.slice(0, 6)),
    h("h4", { class: "subhead", text: "What went wrong" }),
    sum.problems.length ? [problemList(sum.problems), sum.problemCount > sum.problems.length ? h("p", { class: "muted", text: `and ${fmt.n(sum.problemCount - sum.problems.length)} more.` }) : null]
      : h("p", { class: "muted", text: sum.available ? NONE : "Nothing to check yet." }),
    (sum.observations || []).length ? [h("h4", { class: "subhead", text: "Worth knowing" }), problemList(sum.observations)] : null,
    sum.notes.map((n) => h("p", { class: "muted", text: n })),
    h("a", { class: "btn", href: personUseHref(sum.product, upn) }, `Open all ${sum.title} activity`));
}
