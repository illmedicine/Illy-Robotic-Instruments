import { h, icon, fmt } from "../dom.js";
import { api } from "../api.js";
import { dataTable, openDrawer } from "../ui.js";
import { pageHead } from "./common.js";
import { currentRoute, go as navigate } from "../route.js";
import { insightsPanel } from "./insights.js";

const VERDICT = {
  agree: { label: "Agrees", cls: "ok", note: "Live data supports the recorded decision." },
  disagree: { label: "Disagrees", cls: "risk", note: "Live data points the other way." },
  unverified: { label: "Can't verify", cls: "warn", note: "No live evidence for this account." },
};

const money = (v) => (typeof v === "number" ? fmt.n(Math.round(v)) : "");
const ENTRA = { Disabled: "risk", "Not in Entra": "risk", Active: "ok", "Not visible": "" };

function card(label, value, note) {
  return h("div", { class: "card kpi" },
    h("div", { class: "label", text: label }), h("div", { class: "value", text: value }), h("div", { class: "note" }, note || ""));
}

function empty(message, hint) {
  return h("div", { class: "banner" }, icon("alert"), h("span", {}, h("b", { text: message + " " }), hint || ""));
}

// ---------------------------------------------------------------- imports

export async function imports(ctx) {
  const wrap = h("div", {});
  const status = h("div", {});

  async function paint() {
    const { datasets } = await api.uploads();
    insightBox.replaceChildren();
    insightsPanel(datasets).then((p) => { if (p) insightBox.replaceChildren(p); })
      .catch((e) => insightBox.replaceChildren(h("div", { class: "banner error" }, icon("alert"), e.message)));
    if (!datasets.length) {
      list.replaceChildren(empty("No exports imported yet.",
        "Import an .xlsx or .csv export from Microsoft 365 or the renewal team to search it and check its decisions."));
      return;
    }
    const rows = datasets.flatMap((d) => d.sheets.map((s) => ({ ...s, dsId: d.id, dsName: d.name, uploaded: d.uploaded })));
    list.replaceChildren(dataTable({
      rows,
      csvName: "imported-exports",
      initialSort: "uploaded",
      columns: [
        { key: "dsName", label: "File" },
        { key: "name", label: "Sheet" },
        { key: "rowCount", label: "Rows", num: true, render: (r) => fmt.n(r.rowCount) },
        { key: "columns", label: "Columns", num: true, sort: (r) => r.columns.length, render: (r) => fmt.n(r.columns.length) },
        { key: "profile", label: "Type", render: (r) => h("span", { class: "pill" + (r.profile === "renewal-decisions" ? " ok" : ""), text: r.profile }) },
        { key: "uploaded", label: "Imported", render: (r) => fmt.ago(r.uploaded) },
      ],
      onRow: (r) => openDrawer(`${r.dsName} - ${r.name}`, [
        ["Rows", fmt.n(r.rowCount)],
        ["Type", r.profile],
        ["Columns", r.columns.join(", ")],
      ], [
        r.profile === "renewal-decisions"
          ? h("button", { class: "btn primary", type: "button", onclick: () => navigate(`triage/${r.dsId}/${encodeURIComponent(r.name)}`) }, icon("shield"), "Check decisions")
          : null,
        r.profile === "signin-log"
          ? h("p", { class: "muted", text: "Entra sign-in log. Successful sign-ins to the Dataverse resource, interactive or not, are used as Dynamics usage evidence when checking decisions." })
          : null,
        h("button", {
          class: "btn", type: "button",
          onclick: async () => {
            if (!confirm(`Remove "${r.dsName}" and everything imported with it?`)) return;
            await api.deleteUpload(r.dsId).catch((e) => alert(e.message));
            document.querySelector(".scrim")?.click();
            paint();
          },
        }, icon("close"), "Remove file"),
      ].filter(Boolean)),
    }));
  }

  const file = h("input", {
    type: "file", class: "input", accept: ".xlsx,.xlsm,.csv,.tsv,.txt",
    onchange: async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      status.replaceChildren(h("div", { class: "banner" }, icon("refresh"), `Reading ${f.name}...`));
      try {
        const ds = await api.upload(f);
        status.replaceChildren(h("div", { class: "banner ok" }, icon("check"),
          `Imported ${ds.name}: ${fmt.n(ds.rowCount)} rows across ${ds.sheetNames.length} sheet(s).`));
        await paint();
      } catch (err) {
        status.replaceChildren(h("div", { class: "banner error" }, icon("alert"), err.message));
      } finally {
        e.target.value = "";
      }
    },
  });

  const list = h("div", {});
  const insightBox = h("div", {});
  wrap.replaceChildren(
    pageHead("Upload workbook",
      "Bring a Microsoft 365 or renewal export in once. Then validate its decisions against live tenant data, search it, or use it as Fabric utilisation evidence, instead of downloading it again."),
    h("div", { class: "toolbar" }, file),
    status, insightBox, list);
  await paint();
  return wrap;
}

// ---------------------------------------------------------------- search

const EXAMPLES = [
  "finalized keeps for Visio costing more than 100",
  "remove decisions not used in 200 days",
  "copilot awaiting approval",
  "disagreements over 500",
];

export async function search(ctx) {
  const results = h("div", {});
  const summary = h("div", {});
  const box = h("input", {
    class: "input", type: "search", placeholder: "Ask in plain English, or type a name...",
    "aria-label": "Search imported exports",
    onkeydown: (e) => { if (e.key === "Enter") run(e.target.value); },
  });

  async function run(q) {
    if (!q || !q.trim()) return;
    results.replaceChildren(h("div", { class: "loading", text: "Searching..." }));
    let r;
    try {
      r = await api.search(q);
    } catch (e) {
      summary.replaceChildren();
      results.replaceChildren(h("div", { class: "banner error" }, icon("alert"), e.message));
      return;
    }
    const f = r.parsed.filters;
    const chips = Object.entries(f).map(([k, v]) => h("span", { class: "chip", text: `${k}: ${v}` }))
      .concat(r.parsed.terms.map((t) => h("span", { class: "chip", text: `text: ${t}` })));
    summary.replaceChildren(h("div", { class: "toolbar" },
      h("span", { class: "count", text: `${fmt.n(r.total)} match${r.total === 1 ? "" : "es"}` }),
      ...(chips.length ? chips : [h("span", { class: "chip", text: "no filters recognised" })])));
    if (!r.total) {
      results.replaceChildren(empty("Nothing matched.", r.note || "Try a name, a licence, or a phrase such as 'unused for 90 days'."));
      return;
    }
    const cols = Object.keys(r.results[0].values).slice(0, 8);
    results.replaceChildren(dataTable({
      rows: r.results,
      csvName: "search-results",
      searchText: (row) => Object.values(row.values).join(" "),
      columns: [{ key: "sheet", label: "Sheet" }].concat(cols.map((c) => ({
        key: c, label: c, render: (row) => String(row.values[c] ?? ""),
        sort: (row) => row.values[c],
      }))),
      onRow: (row) => openDrawer(row.values.Employee || row.values.UPN || "Row",
        Object.entries(row.values).map(([k, v]) => [k, String(v ?? "")])),
    }));
  }

  const view = h("div", {},
    pageHead("Search exports",
      "Find the handful of rows you need without downloading the whole export again. Plain English is understood, so is a name or a UPN."),
    h("div", { class: "toolbar" }, box,
      h("button", { class: "btn primary", type: "button", onclick: () => run(box.value) }, icon("search"), "Search")),
    h("div", { class: "toolbar" }, h("span", { class: "count", text: "Try:" }),
      ...EXAMPLES.map((x) => h("button", { class: "btn sm", type: "button", onclick: () => { box.value = x; run(x); } }, x))),
    summary, results);
  return view;
}

// ---------------------------------------------------------------- triage

export async function triage(ctx) {
  const { datasets } = await api.uploads();
  const checkable = datasets.flatMap((d) => d.sheets.filter((s) => s.profile === "renewal-decisions")
    .map((s) => ({ id: d.id, name: d.name, sheet: s.name, rowCount: s.rowCount })));
  if (!checkable.length) {
    return h("div", {}, pageHead("Validate renewal decisions", "Re-check recorded licence decisions against live tenant data."),
      empty("No decision data imported yet.",
        "Import an export that has a UPN column and a decision column, then come back to check it against live data."));
  }
  const parts = currentRoute().split("/");
  const wanted = parts[1] ? { id: parts[1], sheet: decodeURIComponent(parts[2] || "") } : null;
  let pick = (wanted && checkable.find((c) => c.id === wanted.id && (!wanted.sheet || c.sheet === wanted.sheet))) || checkable[0];
  // A link from an insight tile carries the insight id and the no-use threshold.
  let insight = wanted && pick.id === wanted.id && parts[3] ? parts[3] : null;
  const idleDays = Number(parts[4]) || 365;

  const body = h("div", {});
  const select = h("select", {
    class: "select", "aria-label": "Imported decision sheet",
    onchange: (e) => { pick = checkable[Number(e.target.value)]; insight = null; load(); },
  }, checkable.map((c, i) => h("option", { value: String(i), selected: c === pick ? "" : null, text: `${c.name} - ${c.sheet} (${fmt.n(c.rowCount)} rows)` })));

  async function load() {
    body.replaceChildren(h("div", { class: "loading", text: "Checking decisions against live data..." }));
    let r;
    try {
      r = await api.decisions(pick.id, pick.sheet, insight, idleDays);
    } catch (e) {
      body.replaceChildren(h("div", { class: "banner error" }, icon("alert"), e.message));
      return;
    }
    const s = r.summary;
    const hasLive = r.liveData !== false;
    const filterBar = r.insight ? h("div", { class: `banner insight-${r.insight.tone}` },
      h("span", { class: "trend", "aria-hidden": "true", text: r.insight.trend === "up" ? "\u25B2" : r.insight.trend === "down" ? "\u25BC" : "\u25AC" }),
      h("span", {}, h("b", { text: `${r.insight.title}: ` }),
        `${fmt.n(r.checked)} rows, no-use threshold ${r.insight.idleDays} days. `,
        hasLive ? "" : "No live data has been synced, so the live verdict is unavailable; the workbook's own usage figure is shown. "),
      h("button", { class: "btn sm", type: "button", onclick: () => navigate(`triage/${pick.id}/${encodeURIComponent(pick.sheet)}`) }, "Show all decisions"),
      h("button", { class: "btn sm", type: "button", onclick: () => navigate("imports") }, "Back to insights")) : null;
    const sources = r.usageSources || [];
    const sourceBar = h("div", { class: "banner info" }, icon("shield"), h("span", {}, sources.length
      ? sources.map((u) => `${u.label} usage evidence: ${fmt.n(u.users)} people, ${u.from} to ${u.to} (${u.windowDays} days). Source: ${u.source}.`).join(" ")
      : "No Dynamics / Dataverse usage source is loaded, so Dynamics rows cannot be checked and show Can't verify. A sign-in to any Microsoft 365 service does not show Dynamics use. Upload the Entra sign-in log export for the Dataverse resource on the Upload workbook page, or turn on the productusage module."));
    const gone = s.noEntra || { count: 0, keepCount: 0, keepCost: 0 };
    const goneBar = gone.keepCount ? h("div", { class: "banner error" }, icon("alert"),
      h("span", {}, h("b", { text: `${fmt.n(gone.keepCount)} licences ($${money(gone.keepCost)} a year) are marked Keep on accounts that are disabled or gone from Entra. ` }),
        "Entra marks these people as no longer with the company, so the recommendation is Remove whatever the usage shows. Use the Entra account filter to review them.")) : null;
    const total = s.agreedCost + s.unverifiedCost + s.potentialSaving + s.riskExposure;
    const sourceTable = (r.sources || []).length ? h("details", { class: "card" },
      h("summary", { text: "Where each licence's Usage comes from" }),
      h("p", { class: "muted", text: "Every Usage figure on this screen comes from one of these. Interactive and non-interactive sign-ins both count as activity. A licence with no rows of data here is not being checked against usage." }),
      dataTable({
        rows: r.sources, csvName: "usage-sources", pageSize: 50,
        columns: [
          { key: "license", label: "Licence" },
          { key: "source", label: "Source of the Usage figure" },
          { key: "rows", label: "Rows", num: true, render: (x) => fmt.n(x.rows) },
          { key: "withData", label: "Rows with usage data", num: true, render: (x) => fmt.n(x.withData) },
        ],
      })) : null;
    // Inside an insight the workbook's own evidence is the point; live verdicts only add to it.
    const cards = r.insight
      ? h("div", { class: "grid g-kpi" },
        card("Rows", fmt.n(s.total), `$${money(total)} a year`),
        card("Not finalized", fmt.n(r.rows.filter((x) => !String(x.stage || "").toLowerCase().startsWith("finalized")).length), "can still be changed"),
        card("Live data agrees", fmt.n(s.agree), "the decision holds"),
        card("Live data disagrees", fmt.n(s.disagree), h("b", { text: `${fmt.n(s.highConfidenceDisagreements)} at 60%+ confidence` })),
        card("Not visible live", fmt.n(s.unverified), "no live sign-in data for the account"))
      : h("div", { class: "grid g-kpi" },
        card("Checked", fmt.n(s.total), `${fmt.n(r.liveAccounts)} live licensed accounts`),
        card("Disabled or gone from Entra", fmt.n(gone.count), h("b", { text: `${fmt.n(gone.keepCount)} still marked Keep` })),
        card("Live data agrees", fmt.n(s.agree), money(s.agreedCost) + " a year"),
        card("Live data disagrees", fmt.n(s.disagree), h("b", { text: `${fmt.n(s.highConfidenceDisagreements)} at 60%+ confidence` })),
        card("Could not verify", fmt.n(s.unverified), money(s.unverifiedCost) + " a year"),
        card("Possible saving", money(s.potentialSaving), `${fmt.n(s.keepButUnused.count)} kept but unused`),
        card("Risk if removed", money(s.riskExposure), h("b", { text: `${fmt.n(s.removeButActive.count)} removed but in use` })));

    const table = dataTable({
      rows: r.rows,
      csvName: "decision-triage",
      initialSort: r.insight ? "annualCost" : "confidence",
      pageSize: 50,
      searchText: (x) => `${x.employee} ${x.upn} ${x.license} ${x.decidedBy}`,
      filters: [{ key: "verdict", label: "Verdict" }, { key: "decision", label: "Decision" }, { key: "license", label: "Licence" }, { key: "entraState", label: "Entra account" }, { key: "stage", label: "Stage" }],
      columns: [
        { key: "verdict", label: "Verdict", render: (x) => h("span", { class: "pill " + VERDICT[x.verdict].cls, text: VERDICT[x.verdict].label }) },
        { key: "confidence", label: "Confidence", num: true, render: (x) => (x.verdict === "unverified" ? "" : `${x.confidence}%`) },
        { key: "employee", label: "Person", render: (x) => (x.employee && x.employee !== "#N/A" ? x.employee : x.upn) },
        { key: "license", label: "Licence" },
        { key: "entraState", label: "Entra account", render: (x) => h("span", { class: "pill " + (ENTRA[x.entraState] || ""), text: x.entraState }) },
        { key: "decision", label: "Recorded" },
        { key: "usage", label: "Usage", sort: (x) => x.usage?.days ?? -1, render: (x) => h("span", { title: x.usage?.source ? `Source: ${x.usage.source}` : null, text: x.usage?.label || "" }), csv: (x) => x.usage?.label || "" },
        { key: "expected", label: "Live says" },
        { key: "annualCost", label: "Annual cost", num: true, render: (x) => money(x.annualCost) },
        { key: "stage", label: "Stage" },
        { key: "decidedBy", label: "Decided by" },
      ],
      onRow: (x) => openDrawer(x.employee || x.upn, [
        ["UPN", x.upn],
        ["Licence", x.license],
        ["Annual cost", money(x.annualCost)],
        ["Recorded decision", x.decision],
        ["Stage", x.stage],
        ["Answer came from", x.source],
        ["Decided by", x.decidedBy],
        ["Stated reason", x.statedReason],
        ["Usage", x.usage ? `${x.usage.label}${x.usage.source ? ` (${x.usage.source}${x.usage.text ? `: ${x.usage.text}` : ""})` : ""}` : ""],
        ["Account type", x.accountType],
        ["Live data says", x.expected],
        ["Verdict", `${VERDICT[x.verdict].label} - ${VERDICT[x.verdict].note}`],
        ["Confidence", x.verdict === "unverified" ? "no live evidence" : `${x.confidence}%`],
        ["Evidence", h("div", {}, x.evidence.map((e) => h("div", { class: "note" }, h("b", { text: e.signal + ": " }), e.detail)))],
        ["Suggested", x.suggested],
      ]),
    });
    body.replaceChildren(...(filterBar ? [filterBar] : []), sourceBar, ...(goneBar ? [goneBar] : []), ...(sourceTable ? [sourceTable] : []), cards,
      h("p", { class: "muted", text: r.truncated
        ? `Showing the ${fmt.n(r.returned)} rows most worth reviewing out of ${fmt.n(r.checked)} checked, disagreements first. Confidence reflects how strong the live evidence is, not how certain the original decision was. Nothing here changes a licence; it is a review aid.`
        : "Confidence reflects how strong the live evidence is, not how certain the original decision was. Nothing here changes a licence; it is a review aid." }),
      table);
  }

  const view = h("div", {},
    pageHead("Validate renewal decisions",
      "Every recorded keep or remove, re-checked against what the tenant shows now, with a confidence-rated vote and the evidence behind it."),
    h("div", { class: "toolbar" }, select,
      h("button", { class: "btn", type: "button", onclick: load }, icon("refresh"), "Re-check")),
    body);
  await load();
  return view;
}
