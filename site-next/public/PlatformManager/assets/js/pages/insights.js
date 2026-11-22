import { h, icon, fmt } from "../dom.js";
import { api } from "../api.js";

const usd = (v) => `$${fmt.n(Math.round(v || 0))}`;
const ARROW = { up: "\u25B2", down: "\u25BC", flat: "\u25AC" };
const ARROW_LABEL = { good: "Positive", bad: "Negative", warn: "Needs attention", info: "No evidence either way" };

export const IDLE_CHOICES = [
  [90, "90 days"], [180, "6 months"], [365, "1 year"], [730, "2 years"], [1095, "3 years"],
];

function stat(label, value, note) {
  return h("div", { class: "card kpi" },
    h("div", { class: "label", text: label }), h("div", { class: "value", text: value }), h("div", { class: "note" }, note || ""));
}

// A tile is a button, so it can be reached and opened from the keyboard as well as the mouse.
function tile(ins, open) {
  const empty = !ins.count;
  return h("button", {
    type: "button", class: `tile ${ins.tone}${empty ? " empty" : ""}`, disabled: empty,
    "aria-label": `${ins.title}: ${fmt.n(ins.count)} licences, ${usd(ins.annualCost)} a year. Open the rows.`,
    onclick: () => open(ins),
  },
    h("div", { class: "tile-head" },
      h("span", { class: "tile-title", text: ins.title }),
      h("span", { class: "trend", title: ARROW_LABEL[ins.tone], "aria-hidden": "true", text: ARROW[ins.trend] })),
    h("div", { class: "tile-value", text: fmt.n(ins.count) }),
    h("div", { class: "tile-money", text: `${usd(ins.annualCost)} a year` }),
    h("div", { class: "tile-note", text: ins.note }),
    h("div", { class: "tile-go" }, empty ? "Nothing to review" : "Review these rows", empty ? null : icon("check")));
}

function recommendation(rec, open) {
  return h("div", { class: `card rec ${rec.severity}` },
    h("div", { class: "toolbar" },
      h("span", { class: `pill ${rec.severity === "high" ? "risk" : "warn"}`, text: rec.severity === "high" ? "High risk" : "Review" }),
      h("b", { text: rec.title }),
      h("span", { class: "money risk-money", text: `${usd(rec.annualCost)} a year` })),
    h("p", { class: "muted", text: rec.detail }),
    h("p", {}, h("b", { text: "Recommended: " }), rec.action),
    h("button", { class: "btn sm", type: "button", onclick: () => open(rec) }, icon("shield"), `Review ${fmt.n(rec.count)} rows`));
}

/**
 * Decision insights for the imported renewal sheets: headline statistics, selectable insight tiles
 * and ranked high-risk recommendations. Opening a tile lands on the Validate screen filtered to its rows.
 */
export async function insightsPanel(datasets) {
  const sheets = datasets.flatMap((d) => d.sheets.filter((s) => s.profile === "renewal-decisions")
    .map((s) => ({ id: d.id, name: d.name, sheet: s.name, rows: s.rowCount })));
  if (!sheets.length) return null;

  let pick = sheets[0];
  let days = 365;
  const body = h("div", {});

  const open = (ins) => { location.hash = `triage/${pick.id}/${encodeURIComponent(pick.sheet)}/${ins.id}/${days}`; };

  async function load() {
    body.replaceChildren(h("div", { class: "loading", text: "Reading decisions..." }));
    let r;
    try {
      r = await api.decisionInsights(pick.id, pick.sheet, days);
    } catch (e) {
      body.replaceChildren(h("div", { class: "banner error" }, icon("alert"), e.message));
      return;
    }
    const s = r.stats;
    const pct = (part, whole) => (whole ? `${Math.round((100 * part) / whole)}% of spend` : "");
    const stats = h("div", { class: "grid g-kpi" },
      stat("Licence records", fmt.n(s.records), `${usd(s.annualCost)} a year`),
      stat("Keep", usd(s.keep.annualCost), `${fmt.n(s.keep.count)} records, ${pct(s.keep.annualCost, s.annualCost)}`),
      stat("Remove", usd(s.remove.annualCost), `${fmt.n(s.remove.count)} records, ${pct(s.remove.annualCost, s.annualCost)}`),
      stat("Undecided", usd(s.undecided.annualCost), `${fmt.n(s.undecided.count)} records`),
      stat("Usage evidence", `${s.evidencePct}%`, `${fmt.n(s.withUsageEvidence)} of ${fmt.n(s.records)} rows carry a usage figure`),
      stat("Saving secured", usd(s.securedSaving), "removed with verified no use"),
      stat("Spend still at risk", usd(s.spendAtRisk), "kept or open despite no use"));

    const recs = r.recommendations.length
      ? h("div", { class: "grid" }, r.recommendations.map((x) => recommendation(x, open)))
      : h("div", { class: "banner ok" }, icon("check"), "No high-risk decisions found at this threshold.");

    body.replaceChildren(
      stats,
      h("h3", { class: "section", text: "High-risk recommendations" }),
      recs,
      h("h3", { class: "section", text: "Insights" }),
      h("div", { class: "grid g-tiles" }, r.insights.map((x) => tile(x, open))),
      h("p", { class: "muted", text:
        "Based only on the workbook's own decision and usage columns. Background (non-interactive) activity counts as use. "
        + "A row with no usage figure is never treated as unused. "
        + (s.nonPersonIdleExcluded ? `${fmt.n(s.nonPersonIdleExcluded)} service, room or shared accounts with no sign-in are left out of the negative insights. ` : "")
        + "Select a tile to review its rows." }));
  }

  const sheetSel = sheets.length > 1 ? h("select", {
    class: "select", "aria-label": "Decision sheet",
    onchange: (e) => { pick = sheets[Number(e.target.value)]; load(); },
  }, sheets.map((c, i) => h("option", { value: String(i), text: `${c.name} - ${c.sheet}` }))) : null;
  const daysSel = h("select", {
    class: "select", "aria-label": "No-use threshold",
    onchange: (e) => { days = Number(e.target.value); load(); },
  }, IDLE_CHOICES.map(([v, label]) => h("option", { value: String(v), selected: v === days ? "" : null, text: `No use for ${label}` })));

  const view = h("div", { class: "insights" },
    h("h2", { text: "Decision insights" }),
    h("div", { class: "toolbar" }, sheetSel, daysSel), body);
  await load();
  return view;
}
