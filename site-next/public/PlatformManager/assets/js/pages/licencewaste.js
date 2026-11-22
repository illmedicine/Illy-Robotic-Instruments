import { h, icon, fmt, pill } from "../dom.js";
import { pageHead } from "./common.js";
import { dataTable } from "../ui.js";
import { empty, field, fill, filePicker, kpi, money, note, num, pct, tabs, text } from "./widgets.js";
import { readFileText } from "../analyze/core.js";
import {
  analyzeSkuLines, analyzeUsers, parseSkuSummary, parseUserAssignments, DEFAULT_FRONTLINE_KEYWORDS,
} from "../analyze/engines/waste.js";
import { productById } from "../analyze/data/products.js";
import { results } from "../analyze/engines/advisor.js";

const sum = (a, f) => a.reduce((x, y) => x + f(y), 0);

function saveForAdvisor(sku, users) {
  results.set("waste", {
    totalAnnualCost: sku ? sku.totalAnnualCost : 0,
    totalAnnualWaste: sku ? sku.totalAnnualWaste : (users ? users.combined.low : 0),
    tenants: ["Home tenant"],
    users: users ? { duplicates: { count: users.duplicates.count, annual: users.duplicates.annual } } : null,
  });
}

function skuPanel(state) {
  const out = h("div", {});
  async function load(files) {
    out.replaceChildren(h("div", { class: "loading", text: "Reading..." }));
    try {
      const parsed = parseSkuSummary(await readFileText(files[0]));
      state.sku = analyzeSkuLines(parsed.lines);
      saveForAdvisor(state.sku, state.users);
      paint(parsed);
    } catch (e) {
      out.replaceChildren(h("div", { class: "banner error" }, icon("alert"), e.message));
    }
  }
  function paint(parsed) {
    const r = state.sku;
    fill(out,
      h("div", { class: "grid g-kpi" },
        kpi("Annual licence cost", money(r.totalAnnualCost), `${r.rows.length} SKUs`),
        kpi("Estimated waste", money(r.totalAnnualWaste), `${pct(r.wastePct, 1)} of cost`, r.wastePct > 0.2 ? "warn" : ""),
        kpi("Priced from contract", pct(r.contractedShare), "rest use planning defaults")),
      parsed.skipped.length ? note(`Skipped ${parsed.skipped.length} row(s): ${parsed.skipped.slice(0, 5).join(", ")}`, "demo") : null,
      r.unmatched.length ? note(`Not in the product catalogue (priced at $0): ${r.unmatched.slice(0, 6).join(", ")}`, "demo") : null,
      dataTable({
        rows: r.rows, csvName: "licence-waste-skus", pageSize: 50, initialSort: "annualWaste",
        searchText: (x) => `${x.name} ${x.sku}`,
        columns: [
          { key: "name", label: "Product", render: (x) => h("span", {}, x.name, x.matched ? null : pill("unmatched", "warn")) },
          { key: "purchased", label: "Purchased", num: true, render: (x) => fmt.n(x.purchased) },
          { key: "assigned", label: "Assigned", num: true, render: (x) => fmt.n(x.assigned) },
          { key: "unassigned", label: "Unassigned", num: true, render: (x) => fmt.n(x.unassigned) },
          { key: "inactive", label: "Inactive", num: true, render: (x) => (x.active == null ? "-" : fmt.n(x.inactive)) },
          { key: "unitPrice", label: "Unit / mo", num: true, render: (x) => `$${x.unitPrice.toFixed(2)} ${x.priceSource === "planning-default" ? "(default)" : ""}` },
          { key: "annualWaste", label: "Annual waste", num: true, render: (x) => money(x.annualWaste) },
          { key: "wastePct", label: "Waste %", num: true, render: (x) => pct(x.wastePct) },
        ],
      }),
      r.duplicates.length ? h("div", { class: "card" }, h("h3", { text: "Overlapping SKUs" }), dataTable({
        rows: r.duplicates, csvName: "licence-overlaps", pageSize: 20,
        columns: [
          { key: "product", label: "Held" }, { key: "coveredBy", label: "Already included in" },
          { key: "seatsAtRisk", label: "Seats", num: true, render: (x) => fmt.n(x.seatsAtRisk) },
          { key: "annualUsd", label: "Annual", num: true, render: (x) => money(x.annualUsd) }, { key: "note", label: "Note" },
        ],
      })) : null);
  }
  out.replaceChildren(empty("No SKU summary loaded.", "Export Microsoft 365 admin center > Billing > Licenses as CSV, or Graph subscribedSkus, with purchased and assigned columns."));
  return h("div", {}, filePicker("SKU summary (.csv)", ".csv,.tsv,.txt", load), out);
}

function usersPanel(state) {
  const out = h("div", {}, empty("No user export loaded.", "Needs a user principal name column and a licences column; last sign-in and account enabled make it far more useful."));
  const days = num(90, { min: "1", max: "730", step: "1" });
  const words = text(DEFAULT_FRONTLINE_KEYWORDS.join(", "), { style: { width: "100%" } });
  let users = null;
  const run = () => {
    if (!users) return;
    state.users = analyzeUsers(users.users, {
      inactiveDays: Number(days.value) || 90, checkActivity: users.hasActivity,
      frontlineKeywords: words.value.split(",").map((s) => s.trim()).filter(Boolean),
    });
    saveForAdvisor(state.sku, state.users);
    paint(state.users);
  };
  async function load(files) {
    out.replaceChildren(h("div", { class: "loading", text: "Reading..." }));
    try {
      users = parseUserAssignments(await readFileText(files[0]));
      run();
    } catch (e) {
      out.replaceChildren(h("div", { class: "banner error" }, icon("alert"), e.message));
    }
  }
  function paint(u) {
    fill(out,
      h("div", { class: "grid g-kpi" },
        kpi("Licensed users", fmt.n(u.licensedUsers), `${fmt.n(u.totalUsers)} rows read`),
        kpi("Spend on listed licences", money(u.annualSpend), "a year"),
        kpi("Disabled with licences", fmt.n(u.disabled.count), money(u.disabled.annual) + " a year", u.disabled.count ? "warn" : ""),
        kpi(`No sign-in ${u.inactiveDays}+ days`, fmt.n(u.inactive.count), money(u.inactive.annual) + " a year", u.inactive.count ? "warn" : ""),
        kpi("Duplicate entitlements", fmt.n(u.duplicates.count), money(u.duplicates.annual) + " a year"),
        kpi("Guests with paid licences", fmt.n(u.guests.count), money(u.guests.annual) + " a year"),
        kpi("Suite on frontline roles", fmt.n(u.mismatch.count), `${money(u.mismatch.annual)} saved moving to F3`),
        kpi("Combined range", `${money(u.combined.low)} to ${money(u.combined.high)}`, "findings overlap")),
      h("p", { class: "muted", text: u.overlapNote }),
      u.duplicates.pairs.length ? h("div", { class: "card" }, h("h3", { text: "Duplicate stacks" }), dataTable({
        rows: u.duplicates.pairs.map((p) => ({ ...p, coveredName: productById(p.covered)?.name || p.covered, holderName: productById(p.holder)?.name || p.holder })),
        csvName: "duplicate-stacks", pageSize: 20,
        columns: [{ key: "coveredName", label: "Held on top of" }, { key: "holderName", label: "Already includes it" },
          { key: "users", label: "Users", num: true, render: (x) => fmt.n(x.users) }, { key: "annual", label: "Annual", num: true, render: (x) => money(x.annual) }],
      })) : null,
      h("div", { class: "card" }, h("h3", { text: "Flagged accounts" }, h("span", { class: "sub", text: "per-user rows stay in this browser and are not saved" })), dataTable({
        rows: u.flagged, csvName: "licence-waste-accounts", pageSize: 50, initialSort: "annualUsd",
        searchText: (x) => `${x.upn} ${x.name} ${x.department} ${x.title} ${x.issue}`,
        filters: [{ key: "issue", label: "Issue" }],
        columns: [
          { key: "upn", label: "User" }, { key: "issue", label: "Issue" }, { key: "department", label: "Department" }, { key: "title", label: "Title" },
          { key: "annualUsd", label: "Annual", num: true, render: (x) => money(x.annualUsd) }, { key: "detail", label: "Detail" },
        ],
      })));
  }
  return h("div", {},
    h("div", { class: "toolbar" }, filePicker("User assignments (.csv)", ".csv,.tsv,.txt", load),
      field("Inactive after (days)", days), h("button", { class: "btn", type: "button", onclick: run }, icon("refresh"), "Re-run")),
    field("Frontline role keywords (comma separated)", words),
    out);
}

export async function render() {
  const state = { sku: null, users: null };
  return h("div", {},
    pageHead("Licence waste", "Find unassigned, inactive, disabled, duplicate and guest licences from tenant exports. Files are read in this browser; per-user rows are never saved."),
    tabs({ "SKU summary": () => skuPanel(state), "User assignments": () => usersPanel(state) }));
}
