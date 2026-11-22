import { h, icon, fmt, pill, download, toCsv } from "../dom.js";
import { api } from "../api.js";
import { dataTable } from "../ui.js";
import { barList } from "../charts.js";
import { pageHead } from "./common.js";

const LEVEL = { good: "ok", info: "info", warn: "warn" };
const TYPE = { number: "info", date: "info", email: "warn", id: "", category: "ok", boolean: "ok", text: "", empty: "risk" };
const ROLE = { activity: "last activity", created: "created", status: "status", license: "licence", department: "department", cost: "cost", count: "count", user: "person" };
const ENTITY = { person: "people", flow: "flows", app: "apps", environment: "environments" };
const pct = (v) => `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
const kpi = (label, value, note) => h("div", { class: "card kpi" }, h("div", { class: "label", text: label }), h("div", { class: "value", text: value }), h("div", { class: "note", text: note || "" }));
const cell = (v, numeric) => (typeof v === "number" ? (numeric ? fmt.n(v) : String(v)) : v ?? "");

function resultTable(r, name, numeric) {
  if (!r.columns?.length) return null;
  const cols = r.columns.map((label, i) => ({ key: i, label, num: numeric && typeof r.rows[0]?.[i] === "number", render: (row) => (label.includes("%") && typeof row[i] === "number" ? pct(row[i]) : cell(row[i], numeric)) }));
  return dataTable({ rows: r.rows, columns: cols, csvName: name, pageSize: 50, searchText: (row) => row.join(" ") });
}

// Upload any Excel or CSV export, see what stands out, ask about it in plain English, and have the AI plan queries, run them over the whole file and write up what they show.
export async function render() {
  const root = h("div", {}, pageHead("Insights Analyzer", "Upload any Excel or CSV export, from this tenant or an adjacent one (users, licences, sign-ins, mailboxes, flows, cost, anything). It is matched to what Platform Manager knows about your tenant, so patterns show up: who is still active, who is disabled, which licences and owners do not line up. Ask in plain English, or have the AI work out what to look at and explain it."));
  const status = h("div", {});
  const view = h("div", {});
  const pick = h("select", { class: "select", "aria-label": "Uploaded file" });
  const sheetPick = h("select", { class: "select", "aria-label": "Sheet" });
  const del = h("button", { class: "btn", type: "button" }, icon("close"), "Remove file");
  const file = h("input", { type: "file", class: "input", accept: ".xlsx,.xlsm,.csv,.tsv,.txt", "aria-label": "Excel or CSV export" });
  let files = [], current = "", sheet = "", join = "", ai = false;

  async function loadFiles(select) {
    files = (await api.analyzer.list()).files;
    pick.replaceChildren(...files.map((f) => h("option", { value: f.id, text: `${f.name}, uploaded ${fmt.ago(f.uploaded)}` })));
    current = select && files.some((f) => f.id === select) ? select : files.some((f) => f.id === current) ? current : files[0]?.id || "";
    pick.value = current;
    pick.disabled = del.disabled = !current;
  }
  async function open(keepSheet, keepJoin) {
    if (!current) { sheetPick.hidden = true; return view.replaceChildren(h("div", { class: "empty", text: "Upload a file to begin." })); }
    if (!keepSheet) sheet = "";
    if (!keepJoin) join = "";
    view.replaceChildren(h("div", { class: "loading", text: "Reading the file and matching it to your tenant..." }));
    try {
      const v = await api.analyzer.get(current, sheet, join);
      sheet = v.sheet;
      sheetPick.replaceChildren(...v.sheets.map((s) => h("option", { value: s.name, text: `${s.name} (${fmt.n(s.rows)} rows)` })));
      sheetPick.value = sheet;
      sheetPick.hidden = v.sheets.length < 2;
      view.replaceChildren(analysis(v, ai, (j) => { join = j; open(true, true); }));
    } catch (e) { view.replaceChildren(h("div", { class: "banner error", text: e.message })); }
  }
  async function take(f) {
    status.replaceChildren(h("div", { class: "banner" }, icon("refresh"), `Reading ${f.name}...`));
    try {
      const r = await api.analyzer.upload(f);
      status.replaceChildren(h("div", { class: "banner ok" }, icon("check"), `Read ${r.name}: ${r.sheets.map((s) => `${s.name} (${fmt.n(s.rows)} rows, ${s.columns} columns)`).join("; ")}.`));
      await loadFiles(r.id);
      await open();
    } catch (e) { status.replaceChildren(h("div", { class: "banner error" }, icon("alert"), e.message)); }
  }
  file.addEventListener("change", async () => { const f = file.files && file.files[0]; file.value = ""; if (f) await take(f); });
  pick.addEventListener("change", () => { current = pick.value; open(); });
  sheetPick.addEventListener("change", () => { sheet = sheetPick.value; open(true); });
  del.addEventListener("click", async () => {
    const f = files.find((x) => x.id === current);
    if (!f || !confirm(`Remove ${f.name} from the server? The analysis goes with it.`)) return;
    try { await api.analyzer.remove(current); await loadFiles(); await open(); } catch (e) { status.replaceChildren(h("div", { class: "banner error", text: e.message })); }
  });

  const card = h("div", { class: "card" }, h("div", { class: "actions" }, file, pick, sheetPick, del), status,
    h("p", { class: "muted", text: "Drop a file here or choose one. It is kept on this server only, in the data folder, until you remove it. Only an administrator can use this page. When you ask the AI, it plans the questions and Platform Manager runs them over the whole file here; the AI only sees totals and counts, with people's names and addresses replaced by labels." }));
  for (const [ev, on] of [["dragover", true], ["dragleave", false], ["drop", false]]) {
    card.addEventListener(ev, (e) => {
      e.preventDefault();
      card.style.outline = on ? "2px dashed var(--accent)" : "";
      if (ev === "drop" && e.dataTransfer?.files?.[0]) take(e.dataTransfer.files[0]);
    });
  }
  sheetPick.hidden = true;
  root.append(card, view);
  try { ai = !!(await api.aiStatus()).enabled; } catch { /* the AI buttons simply stay off */ }
  try { await loadFiles(); await open(); } catch (e) { view.replaceChildren(h("div", { class: "banner error", text: e.message })); }
  return root;
}

function analysis(v, ai, setJoin) {
  const wrap = h("div", {});
  const own = v.columns.filter((c) => !c.tenant);
  const filledPct = own.length ? own.reduce((a, c) => a + c.fillPct, 0) / own.length : 0;
  const dated = own.find((c) => c.type === "date" && c.stats?.min);
  const warns = v.insights.filter((i) => i.level === "warn").length + v.tenant.insights.filter((i) => i.level === "warn").length;
  wrap.append(h("div", { class: "grid g-kpi" }, kpi("Rows", fmt.n(v.rows), v.sheet), kpi("Columns", fmt.n(own.length), `${own.filter((c) => c.personal).length} hold people's details`),
    kpi("Filled in", pct(filledPct), "average across columns"), kpi("Dates", dated ? dated.stats.max : "none", dated ? `${dated.name}, from ${dated.stats.min}` : "no date column found"),
    kpi("Matched to tenant", v.tenant.applied ? pct((100 * v.tenant.applied.matched) / Math.max(1, v.tenant.applied.rows - v.tenant.applied.blank)) : "not matched", v.tenant.applied ? `${v.tenant.applied.column} as ${ENTITY[v.tenant.applied.entity]}` : "no column used"),
    kpi("Worth a look", String(warns), "findings marked as warnings")));

  const ask = askCard(v, ai);
  const insightCard = (i) => {
    const look = i.question ? h("button", { class: "btn sm", type: "button", onclick: () => ask.run(i.question) }, "Look closer") : null;
    return h("div", { class: "insight " + (LEVEL[i.level] || "info") }, h("div", { class: "body" }, h("h4", { text: i.title }), h("p", { text: i.detail }), look ? h("div", { class: "actions" }, look) : null));
  };
  wrap.append(tenantCard(v, setJoin));
  if (v.tenant.insights.length) wrap.append(h("h3", { text: "Against your tenant" }), h("div", { class: "grid g-2" }, v.tenant.insights.map(insightCard)));
  wrap.append(h("h3", { text: "What stands out in the file" }), h("div", { class: "grid g-2" }, v.insights.map(insightCard)), ask.node);

  const panel = h("div", {});
  const tabs = [["Columns", () => columnsTab(v)], ["Explore a column", () => exploreTab(v)], ["Data", () => dataTab(v)]];
  const seg = h("div", { class: "seg", role: "group", "aria-label": "Views" });
  const show = (n) => { [...seg.children].forEach((b, i) => b.setAttribute("aria-pressed", String(i === n))); panel.replaceChildren(tabs[n][1]()); };
  tabs.forEach(([label], n) => seg.append(h("button", { type: "button", onclick: () => show(n) }, label)));
  wrap.append(h("div", { style: { margin: "18px 0 10px" } }, seg), panel);
  show(0);
  return wrap;
}

// ---- questions: a deterministic answer, or the AI planning queries that are run here

function askCard(v, ai) {
  const q = h("input", { class: "input", type: "search", placeholder: "Ask about this file, for example: how many rows are older than 90 days", "aria-label": "Question about this file", style: { flex: "1", minWidth: "320px" } });
  const go = h("button", { class: "btn primary", type: "button" }, icon("search"), "Answer from the data");
  const aiBtn = h("button", { class: "btn", type: "button", title: "The AI decides which questions to ask of the data, they are run on the whole file, and it explains the results" }, h("span", { class: "spark" }), "Ask the AI");
  const review = h("button", { class: "btn", type: "button", title: "The AI reads the findings above and says what to do about them" }, h("span", { class: "spark" }), "AI review of this file");
  const out = h("div", {});
  const buttons = [go, aiBtn, review];
  const busy = (on) => buttons.forEach((b) => (b.disabled = on));
  async function show(fn, label) {
    busy(true);
    out.replaceChildren(h("div", { class: "loading", text: label }));
    try { out.replaceChildren(await fn()); } catch (e) { out.replaceChildren(h("div", { class: "banner error", text: e.message })); }
    busy(false);
    out.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  async function run(text) {
    q.value = text;
    if (text.trim().length < 2) return out.replaceChildren(h("div", { class: "empty", text: "Type a question first." }));
    await show(async () => {
      const r = await api.analyzer.ask(v.id, v.sheet, text, v.tenant.join);
      return h("div", {}, h("h3", { text: "Answer from the data" }), r.interpreted ? h("p", { class: "muted" }, h("b", { text: "Understood as: " }), r.interpreted) : null, h("p", { text: r.text }), resultTable(r, "analyzer-answer", r.mode !== "rows"));
    }, "Working it out...");
  }
  async function runAi(text, isReview) {
    if (!isReview && text.trim().length < 3) return out.replaceChildren(h("div", { class: "empty", text: "Type what you want to know first, or use the AI review." }));
    await show(async () => {
      const r = await api.analyzer.ai(v.id, v.sheet, text, isReview, v.tenant.join);
      const list = (items) => (items.length ? h("ul", {}, items.map((x) => h("li", { text: x }))) : null);
      return h("div", {}, h("h3", { text: "AI analysis" }),
        h("p", { class: "muted", text: `From the AI (${r.provider}). The numbers come from queries Platform Manager ran over the whole file; check them in the tables below.${r.aliased ? " People's names and addresses were replaced by labels before the AI saw them, and are put back here." : ""}` }),
        h("p", { text: r.answer }), r.findings.length ? h("h4", { text: "What it found" }) : null, list(r.findings),
        r.recommendations.length ? h("h4", { text: "What it suggests" }) : null,
        r.recommendations.length ? h("ul", {}, r.recommendations.map((x) => h("li", {}, h("b", { text: x.title }), x.why ? `: ${x.why}` : ""))) : null,
        r.followUps.length ? h("h4", { text: "Ask next" }) : null, r.followUps.length ? h("div", { class: "actions" }, r.followUps.map((f) => h("button", { class: "btn sm", type: "button", onclick: () => { q.value = f; runAi(f, false); } }, f))) : null,
        r.queries.length ? h("h4", { text: "The questions it asked of your data" }) : null,
        ...r.queries.map((x) => h("div", { class: "card", style: { margin: "10px 0" } }, h("h4", { text: x.title }), h("p", { class: "muted", text: `${x.description}. ${fmt.n(x.matched)} of ${fmt.n(x.total)} rows matched.` }), resultTable(x, "analyzer-query", x.mode !== "rows"))),
        r.skipped.length ? h("div", { class: "banner info" }, icon("alert"), `${r.skipped.length} of the AI's questions were not run because they did not fit this file: ${r.skipped.join(" ")}`) : null);
    }, "The AI is working out what to look at, then the queries run and it writes up the results. This can take a minute or two...");
  }
  go.addEventListener("click", () => run(q.value));
  aiBtn.addEventListener("click", () => runAi(q.value, false));
  review.addEventListener("click", () => runAi("", true));
  q.addEventListener("keydown", (e) => { if (e.key === "Enter") go.click(); });
  const named = v.columns.filter((c) => c.type !== "empty" && !c.tenant);
  const dim = named.find((c) => ["category", "boolean"].includes(c.type) && !c.personal)?.name, num = named.find((c) => c.type === "number")?.name;
  const chips = [dim ? `number of rows by ${dim}` : null, dim && num ? `total ${num} by ${dim}` : null, num ? `top 10 rows by ${num}` : null, "how many rows are blank"].filter(Boolean).map((x) => h("button", { class: "btn sm", type: "button", onclick: () => run(x) }, x));
  const node = h("div", { class: "card", style: { margin: "16px 0" } }, h("h3", { text: "Ask about this file" }),
    h("p", { class: "muted", text: "Say what you want to know in plain English: counts, totals, the biggest groups, rows older than a number of days, a name or value. 'Answer from the data' always works and shows how it read you." + (ai ? " 'Ask the AI' works out the questions for you when you are not sure what to ask; 'AI review' explains the findings above." : " The AI is off on this server, so only the first button works.") }),
    h("div", { class: "actions" }, q, go, ai ? aiBtn : null, ai ? review : null), h("div", { class: "actions" }, chips), out);
  return { node, run };
}

// ---- matching the file to live tenant data

function tenantCard(v, setJoin) {
  const t = v.tenant;
  if (!t.available) return h("div", { class: "banner info" }, icon("alert"), t.reason);
  const label = (j) => `${j.column} as ${ENTITY[j.entity]} (${pct(j.matchPct)} match)`;
  const sel = h("select", { class: "select", "aria-label": "Match the file to the tenant" },
    h("option", { value: "", text: "Best match (automatic)" }), h("option", { value: "none", text: "Do not match" }), t.joins.map((j) => h("option", { value: `${j.column}::${j.entity}`, text: label(j) })));
  const manual = h("div", { class: "actions" });
  const col = h("select", { class: "select", "aria-label": "Column to match" }, v.columns.filter((c) => !c.tenant && c.type !== "empty").map((c) => h("option", { value: c.name, text: c.name })));
  const ent = h("select", { class: "select", "aria-label": "Kind of thing to match" }, Object.entries(ENTITY).map(([k, n]) => h("option", { value: k, text: n })));
  manual.append(h("span", { class: "muted", text: "Or match column" }), col, h("span", { class: "muted", text: "to" }), ent, h("button", { class: "btn sm", type: "button", onclick: () => setJoin(`${col.value}::${ent.value}`) }, "Match"));
  sel.value = t.join === "none" ? "none" : t.joins.some((j) => `${j.column}::${j.entity}` === t.join) ? t.join : "";
  sel.addEventListener("change", () => setJoin(sel.value));
  const a = t.applied;
  const body = a ? h("p", {}, h("b", { text: `${fmt.n(a.matched)} of ${fmt.n(a.rows - a.blank)} rows matched ` }), `${ENTITY[a.entity]} in your tenant using '${a.column}'. The tenant's details are added to the table as columns starting with Tenant, so you can ask about them like any other column.`)
    : h("p", { class: "muted", text: t.joins.length ? "Matching is off. Choose a column below to compare the file with your tenant." : "No column in this file looks like a list of people, flows, apps or environments in your tenant, so it is analysed on its own. You can still choose a column to try." });
  return h("div", { class: "card", style: { margin: "16px 0" } }, h("h3", { text: "Match to your tenant" }), body,
    h("p", { class: "muted", text: `Compared with what Platform Manager has read from your tenant${t.asOf ? ` (last read ${fmt.ago(t.asOf)})` : ""}: the directory, licences, sign-ins and activity, and the Power Platform inventory. Nothing leaves this server.` }),
    h("div", { class: "actions" }, sel), manual);
}

// ---- the views

function columnsTab(v) {
  const rows = v.columns.map((c) => ({ ...c, summary: summary(c) }));
  return dataTable({
    rows, csvName: "analyzer-columns", pageSize: 100, initialSort: "index", searchText: (r) => `${r.name} ${r.type} ${r.role} ${r.summary}`,
    filters: [{ key: "type", label: "Type" }, { key: "tenant", label: "From", get: (r) => (r.tenant ? "Your tenant" : "The file") }],
    columns: [
      { key: "index", label: "#", num: true, render: (r) => r.index + 1 },
      { key: "name", label: "Column", render: (r) => h("span", {}, r.name, r.tenant ? pill("tenant", "info") : null, r.personal ? pill("people", "warn") : null) },
      { key: "type", label: "Type", render: (r) => pill(r.type, TYPE[r.type]) },
      { key: "role", label: "Looks like", render: (r) => ROLE[r.role] || "" },
      { key: "fillPct", label: "Filled", num: true, render: (r) => pct(r.fillPct) },
      { key: "distinct", label: "Different values", num: true, render: (r) => fmt.n(r.distinct) },
      { key: "summary", label: "Common values or range" },
      { key: "notes", label: "Notes", render: (r) => r.notes.join("; "), csv: (r) => r.notes.join("; ") },
    ],
  });
}

function summary(c) {
  const s = c.stats || {};
  if (c.type === "number") return `${fmt.n(s.min)} to ${fmt.n(s.max)}, median ${fmt.n(s.median)}, total ${fmt.n(s.sum)}`;
  if (c.type === "date") return `${s.min} to ${s.max}`;
  if (c.type === "email") return (s.domains || []).slice(0, 3).map(([d, n]) => `${d} (${fmt.n(n)})`).join(", ");
  if (c.personal || c.type === "id") return c.type === "id" ? "unique values" : "";
  return c.top.slice(0, 4).map(([val, n]) => `${val} (${fmt.n(n)})`).join(", ");
}

function exploreTab(v) {
  const sel = h("select", { class: "select", "aria-label": "Column" }, v.columns.filter((c) => c.type !== "empty").map((c) => h("option", { value: c.name, text: `${c.name} (${c.type})` })));
  const box = h("div", {});
  async function draw() {
    box.replaceChildren(h("div", { class: "loading", text: "Reading the column..." }));
    try {
      const c = await api.analyzer.column(v.id, v.sheet, sel.value, v.tenant.join);
      const title = { histogram: "How the values are spread (ten equal ranges)", months: "Rows per month", values: c.type === "email" ? "Most common address domains" : "Most common values" }[c.kind];
      box.replaceChildren(h("div", { class: "card" }, h("h3", { text: title }), barList(c.bars.map((b) => ({ label: b.label, value: b.value }))),
        c.more ? h("p", { class: "muted", text: `${fmt.n(c.more)} more values not shown.` }) : null,
        h("p", { class: "muted", text: `${fmt.n(c.filled)} filled, ${fmt.n(c.empty)} blank, ${fmt.n(c.distinct)} different values.` }),
        h("button", { class: "btn", type: "button", onclick: () => download(`${c.name}-distribution.csv`, toCsv(c.bars, [{ key: "label", label: c.name }, { key: "value", label: "Rows" }])) }, icon("download"), "CSV")));
    } catch (e) { box.replaceChildren(h("div", { class: "banner error", text: e.message })); }
  }
  sel.addEventListener("change", draw);
  draw();
  return h("div", {}, h("div", { class: "toolbar" }, sel), box);
}

function dataTab(v) {
  const PAGE = 100;
  let offset = 0, text = "";
  const q = h("input", { class: "input", type: "search", placeholder: "Search every column", "aria-label": "Search the rows" });
  const count = h("span", { class: "count" });
  const body = h("div", { class: "tablewrap" });
  const prev = h("button", { class: "btn", type: "button" }, "Previous");
  const next = h("button", { class: "btn", type: "button" }, "Next");
  async function load() {
    try {
      const r = await api.analyzer.rows(v.id, v.sheet, offset, PAGE, text, v.tenant.join);
      body.replaceChildren(h("table", { class: "dt" }, h("thead", {}, h("tr", {}, r.columns.map((c) => h("th", { text: c })))), h("tbody", {}, r.rows.map((row) => h("tr", {}, r.columns.map((_, i) => h("td", { text: row[i] ?? "" })))))));
      count.textContent = `${fmt.n(Math.min(r.matched, offset + 1))}-${fmt.n(Math.min(r.matched, offset + PAGE))} of ${fmt.n(r.matched)}${text ? ` (of ${fmt.n(r.total)})` : ""}`;
      prev.disabled = offset === 0;
      next.disabled = offset + PAGE >= r.matched;
    } catch (e) { body.replaceChildren(h("div", { class: "banner error", text: e.message })); }
  }
  let timer = null;
  q.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => { text = q.value.trim(); offset = 0; load(); }, 300); });
  prev.addEventListener("click", () => { offset = Math.max(0, offset - PAGE); load(); });
  next.addEventListener("click", () => { offset += PAGE; load(); });
  load();
  return h("div", {}, h("div", { class: "toolbar" }, q, prev, next, count), body);
}
