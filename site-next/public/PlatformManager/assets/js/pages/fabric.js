import { h, icon, fmt, pill } from "../dom.js";
import { api } from "../api.js";
import { dataTable } from "../ui.js";
import { pageHead } from "./common.js";
import { guardrails } from "./fabricguardrails.js";
import { fabricStory } from "./fabricstory.js";
import { fill } from "./widgets.js";
import { getProfile, getRates, setRatesOverride } from "../analyze/org.js";
import { results } from "../analyze/engines/advisor.js";

const usd = (v) => (typeof v === "number" ? "$" + fmt.n(Math.round(v)) : "-");

function kpi(label, value, note) {
  return h("div", { class: "card kpi" },
    h("div", { class: "label", text: label }), h("div", { class: "value", text: value }), h("div", { class: "note" }, note || ""));
}

function num(value, attrs = {}) {
  return h("input", { class: "input", type: "number", min: "0", step: "any", value: value ?? "", ...attrs });
}

export async function render(ctx) {
  const ov = await api.fabric();
  const premium = ov.capacities.filter((c) => c.kind === "premium");
  const measured = ov.utilisation;

  // Pre-fill from the live capacity and from the uploaded Capacity Metrics export when one covers it.
  const first = premium[0];
  const m0 = (first && first.measured) || (ov.singleSeries ? measured[0] : null);
  const sku = h("select", { class: "select", "aria-label": "Premium SKU" },
    Object.keys(ov.premiumSkus).map((k) => h("option", { value: k, selected: k === (first && first.sku) ? "" : null, text: `${k} (equals ${"F" + ov.premiumSkus[k].f})` })));
  const peak = num(m0 ? Math.round(m0.peak) : 70, { max: "150" });
  // Who views and who builds, from the live Power BI activity feed, and who already holds a Pro-capable licence.
  const ppl = ov.people;
  const viewers = num(ppl ? ppl.viewers : 0);
  const creators = num(ppl ? ppl.creators : 0);
  const proHeld = num(ppl ? ppl.proHeld : 0);
  const exact = ppl && ppl.licencesKnown ? { creatorsWithPro: ppl.creatorsWithPro, viewersWithPro: ppl.viewersWithPro } : null;
  const growth = num(20, { max: "200" });
  const term = num(3, { min: "1", max: "5", step: "1" });
  const cost = num("", { placeholder: "blank = list price" });
  const burst = num(25, { max: "100" });
  const gb = num(0);
  // No input form: values come from the live capacity, the uploaded metrics and the Power BI export.
  const onP = (ov.estate || []).filter((e) => /^P[1-5]$/i.test(e.sku || ""));
  const wsN = num(onP.length ? onP.reduce((s, e) => s + e.workspaces, 0) : 0);
  const large = num(onP.reduce((s, e) => s + (e.largeModels || 0), 0));
  const gw = num(0);
  const xr = num(0);
  const fi = num(0);
  const overlap = num("", { placeholder: "days until renewal" });
  const out = h("div", {});
  const story = fabricStory(ov);
  // A discount set in server config wins over the browser rate card, for the guardrail calculations too.
  setRatesOverride(ov.discountPct ? { fabricDiscountPct: ov.discountPct } : null);

  const val = (i) => (i.value === "" ? undefined : Number(i.value));

  async function run() {
    out.replaceChildren(h("div", { class: "loading", text: "Calculating..." }));
    let r;
    try {
      r = await api.fabricPlan({
        fabricDiscountPct: getRates().fabricDiscountPct, proPriceUsd: getRates().unitPrices?.["power-bi-pro"],
        premiumEndDate: getProfile().renewalDate || undefined,
        premiumSku: sku.value, peakUtilisationPct: val(peak), viewers: val(viewers), creators: val(creators), proHeld: val(proHeld), ...(exact || {}),
        growthPctPerYear: val(growth), termYears: val(term), currentAnnualCostUsd: val(cost), burstSharePct: val(burst), onelakeGb: val(gb),
        migration: { workspaces: val(wsN), largeModels: val(large), gateways: val(gw), crossRegion: val(xr), fabricItems: val(fi), overlapDays: val(overlap) },
      });
    } catch (e) {
      out.replaceChildren(h("div", { class: "banner error" }, icon("alert"), e.message));
      return;
    }
    const best = r.scenarios.find((s) => s.id === r.cheapestScenario);
    const like = r.scenarios.find((s) => s.id === "equivalent");
    story.update(r);
    results.set("fabric", {
      premiumSku: sku.value, bestLabel: best.label, bestSku: best.fSku, bestSavingUsd: Math.max(0, best.vsCurrentUsd),
      bestAnnualUsd: best.annualTotalUsd, migrationRisk: r.migration.risk,
    });
    fill(out,
      h("div", { class: "grid g-kpi" },
        kpi("Needed now", `${fmt.n(r.requiredCuNow)} CU`, `at ${Math.round(r.targetUtilisation * 100)}% target use`),
        kpi("Needed at end of term", `${fmt.n(r.requiredCuEndOfTerm)} CU`, "with growth"),
        kpi("Today (Premium)", usd(r.before.totalUsd), `${usd(r.before.capacityUsd)} capacity + ${usd(r.before.proUsd)} Pro`),
        kpi("Cheapest option", usd(best.annualTotalUsd), best.label),
        kpi("Saving vs today", usd(best.vsCurrentUsd), `${usd(best.vsCurrentUsd - like.vsCurrentUsd)} better than like-for-like`),
        kpi("F64 pays off above", `${fmt.n(r.f64BreakEvenViewers)} viewers`, `Pro is ${usd(r.proUnitUsd)} a user a month`)),
      ...r.findings.map((f) => h("div", { class: "banner info" }, icon("check"), f.text)),
      ...r.warnings.map((w) => h("div", { class: "banner demo" }, icon("alert"), w)),
      h("div", { class: "card" }, h("h3", {}, "Options compared", h("span", { class: "sub", text: "annual cost, reserved capacity unless noted" })),
        dataTable({
          rows: r.scenarios, csvName: "fabric-options", pageSize: 20, initialSort: "annualTotalUsd",
          columns: [
            { key: "label", label: "Option", render: (s) => h("span", {}, s.label, s.id === r.cheapestScenario ? pill("cheapest", "ok") : null) },
            { key: "fSku", label: "Size" },
            { key: "annualReservedUsd", label: "Capacity (reserved)", num: true, render: (s) => usd(s.id === "hybrid" ? s.annualTotalUsd - s.annualProUsd - s.annualStorageUsd : s.annualReservedUsd) },
            { key: "annualPaygUsd", label: "Pay-as-you-go", num: true, render: (s) => usd(s.annualPaygUsd) },
            { key: "annualProUsd", label: "Pro licences", num: true, render: (s) => `${usd(s.annualProUsd)} (${fmt.n(s.proLicencesNeeded)})` },
            { key: "annualTotalUsd", label: "Total a year", num: true, render: (s) => usd(s.annualTotalUsd) },
            { key: "vsCurrentUsd", label: "Saving vs today", num: true, render: (s) => usd(s.vsCurrentUsd) },
            { key: "note", label: "Note" },
          ],
        })),
      h("div", { class: "card" }, h("h3", {}, "Migration effort"),
        h("p", {}, `About ${fmt.n(r.migration.estimatedDays)} working days`,
          r.migration.overlapDays != null ? ` against ${fmt.n(r.migration.overlapDays)} days available: ` : ". ",
          r.migration.risk === "unknown" ? "Risk is not shown: set fabric.premiumEndDate in the config (or the renewal date in Renewal Analyze > Organisation)." : pill(r.migration.risk + " risk", r.migration.risk === "low" ? "ok" : r.migration.risk === "medium" ? "warn" : "risk")),
        r.deadline ? h("p", {}, `${r.deadline.overlapIncluded ? "Fully on Fabric by" : "Power BI Premium ends"} ${fmt.date(r.deadline.endDate)} (${fmt.n(r.deadline.daysLeft)} days). ${r.deadline.overlapIncluded ? `Overlap is free until then, so start now; the last day to start is ${fmt.date(r.deadline.latestBuyDate)}.` : `Buy the F SKU by ${fmt.date(r.deadline.latestBuyDate)} to finish two weeks early.`} See the Timeline tab above.`) : null,
        h("p", { class: "muted", text: "Planning heuristic from the counts above, not a Microsoft rule." })),
      guardrails(r, { viewers: val(viewers) || 0, renewalDate: r.deadline ? r.deadline.endDate : "" }),
      ppl ? h("p", { class: "muted", text: `People: ${fmt.n(ppl.viewers)} viewers and ${fmt.n(ppl.creators)} creators in the last ${fmt.n(ov.activityDays || 0)} days of Power BI activity (all capacities)`
        + (ppl.licencesKnown ? `; ${fmt.n(ppl.proHeld)} already hold a Pro-capable licence.` : "; licences unknown until the licensing module has synced.") })
        : h("div", { class: "banner" }, icon("alert"), "No Power BI activity yet, so viewer and creator counts are 0. Sync the powerbi module (raise modules.powerbi.activityDays for a fuller picture)."),
      h("p", { class: "muted", text: r.caveat }));
  }

  const live = premium.length
    ? dataTable({
      rows: ov.capacities, csvName: "power-bi-capacities", pageSize: 25,
      columns: [
        { key: "name", label: "Capacity" }, { key: "sku", label: "SKU" },
        { key: "fEquivalent", label: "Fabric equivalent", render: (c) => c.fEquivalent || "-" },
        { key: "region", label: "Region" },
        { key: "state", label: "State", render: (c) => pill(c.state || "?", c.state === "Active" ? "ok" : "") },
        { key: "measured", label: "Measured peak", num: true, sort: (c) => c.measured?.peak ?? -1,
          render: (c) => (c.measured ? `${c.measured.peak}% (p95 ${c.measured.p95}%)` : "no export") },
      ],
    })
    : h("div", { class: "banner" }, icon("alert"), ov.haveLive
      ? "No Premium (P1 to P5) capacity found in the Power BI admin data. You can still model one below."
      : "No live Power BI data yet. Enable the Power BI admin module on the Data sources page, or model a capacity below.");

  const util = measured.length
    ? dataTable({
      rows: measured, csvName: "capacity-utilisation", pageSize: 25,
      columns: [
        { key: "capacity", label: "Capacity" }, { key: "samples", label: "Samples", num: true, render: (u) => fmt.n(u.samples) },
        { key: "avg", label: "Average %", num: true }, { key: "p95", label: "P95 %", num: true }, { key: "peak", label: "Peak %", num: true },
        { key: "overThreshold", label: "Over 100%", num: true, render: (u) => `${(u.overThreshold * 100).toFixed(1)}%` },
        { key: "source", label: "From" },
      ],
    })
    : h("div", { class: "banner" }, icon("alert"), h("span", {}, h("b", { text: "No utilisation export yet. " }),
      "Upload a Fabric Capacity Metrics export (a column such as 'Utilization %' or 'CU %', optionally a Capacity column) on the Upload workbook page. Sizing from the capacity name alone is only a starting point."));

  const view = h("div", {},
    pageHead("Fabric planner",
      "Size Microsoft Fabric to replace Power BI Premium from measured utilisation, and see what it costs against what you pay today.",
      h("button", { class: "btn primary", type: "button", onclick: run }, icon("refresh"), "Calculate")),
    story.view,
    h("div", { class: "grid g-2" },
      h("div", { class: "card" }, h("h3", {}, "Power BI capacities", h("span", { class: "sub", text: "live from Power BI admin" })), live),
      h("div", { class: "card" }, h("h3", {}, "Measured utilisation", h("span", { class: "sub", text: "from uploaded exports" })), util)),
    ov.discountPct ? h("p", { class: "muted", text: `A ${ov.discountPct}% negotiated discount from config is applied to Fabric prices.` }) : null,
    out);
  await run();
  return view;
}
