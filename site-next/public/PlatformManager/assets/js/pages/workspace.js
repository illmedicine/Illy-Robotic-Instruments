import { h, icon } from "../dom.js";
import { pageHead } from "./common.js";
import { field, num, text, date, select, tabs, note, kpi } from "./widgets.js";
import { dataTable } from "../ui.js";
import { downloadBlob, stamp } from "../analyze/core.js";
import {
  AGREEMENT_TYPES, CLOUD_POSTURE, CONSTRAINTS, PRIORITIES, ROLES, getProfile, saveProfile, getRates, saveRates, profileCompleteness,
} from "../analyze/org.js";
import { PRODUCTS } from "../analyze/data/products.js";
import { DEFAULT_BANDS } from "../analyze/engines/pricing.js";
import { syncWorkspace } from "../tenantprofile.js";

function checks(options, selected, onChange) {
  const set = new Set(selected);
  return h("div", { style: { display: "grid", gap: "6px" } }, options.map(([id, label, detail]) => h("label", { style: { display: "flex", gap: "8px", alignItems: "flex-start" } },
    h("input", { type: "checkbox", checked: set.has(id) ? "" : null, onchange: (e) => { e.target.checked ? set.add(id) : set.delete(id); onChange([...set]); } }),
    h("span", {}, label, detail ? h("small", { class: "muted", style: { display: "block" }, text: detail }) : null))));
}

function profilePanel() {
  const p = getProfile();
  const draft = { ...p };
  const bind = (key, input, kind = "text") => {
    input.addEventListener("input", () => { draft[key] = kind === "num" ? (input.value === "" ? 0 : Number(input.value)) : input.value; });
    return input;
  };
  const inputs = {};
  const n = (k, label, hint) => field(label, (inputs[k] = bind(k, num(p[k]), "num")), hint);
  const status = h("div", {});
  const done = profileCompleteness(p);
  const FROM_SYSTEM = ["licensedUsers", "employeeCount", "annualLicenceSpend"];
  const save = () => {
    const current = getProfile();
    const sources = { ...(current.sources ?? {}) };
    for (const k of FROM_SYSTEM) if (draft[k] !== current[k]) sources[k] = "manual";
    saveProfile({ ...draft, sources, licensedUsersSource: sources.licensedUsers, confirmed: true });
    const c = profileCompleteness(draft);
    status.replaceChildren(note(`Saved in this browser. Profile is ${c.score}% complete${c.missing.length ? `; still missing ${c.missing.join(", ")}` : ""}.`));
  };
  const origin = h("div", {});
  syncWorkspace().then((s) => {
    if (!s) return;
    const f = getProfile();
    for (const k of FROM_SYSTEM) if (inputs[k]) { inputs[k].value = f[k] || ""; draft[k] = f[k]; }
    draft.sources = f.sources;
    const k = (v) => Number(v).toLocaleString("en-US");
    const src = (key) => (f.sources?.[key] === "manual" ? "your own figure" : f.sources?.[key] === "tenant" ? "read from Entra" : f.sources?.[key] === "workbook" ? "read from the spend workbook" : "");
    const lines = [];
    if (s.tenant) {
      const c = s.tenant;
      lines.push(`Entra${c.asOf ? ` on ${c.asOf.slice(0, 10)}` : ""}: ${k(c.accounts)} accounts (${k(c.guests)} guests, ${k(c.accounts - c.enabled)} disabled), of which ${k(c.licensed)} hold at least one licence (${k(c.licensedEnabledMembers)} enabled members, ${k(c.licensedDisabled)} disabled, ${k(c.licensedGuests)} guests). ` +
        `Licensed users: ${src("licensedUsers")}${f.sources?.licensedUsers === "manual" ? `; the licence count is ${k(c.licensed)}` : ""}. The directory total is not used for the size band because many of those accounts hold no licence. ` +
        `Employees: ${src("employeeCount") || "not set"}${c.employeesEstimate ? `; ${k(c.employeesEstimate)} enabled member accounts have both a department and a job title, which is an estimate` : ""}.`);
    }
    if (s.spend) lines.push(`Annual licence spend: ${src("annualLicenceSpend")}, the total of ${k(s.spend.licences.length)} licences in ${s.spend.dataset.name} (${s.spend.sheet}, uploaded ${String(s.spend.dataset.uploaded).slice(0, 10)}). It covers licences only, not Azure or support.`);
    origin.replaceChildren(...lines.map((t) => h("p", { class: "muted", text: t })));
  });
  return h("div", {},
    h("div", { class: "grid g-kpi" }, kpi("Profile complete", `${done.score}%`, done.ready ? "required fields filled" : `missing ${done.missing.join(", ")}`)),
    h("p", { class: "muted", text: "These figures frame every recommendation on the Renewal advisor and the contract review. Until you confirm them they are treated as estimates. They are stored in this browser only." }),
    h("div", { class: "card" }, h("h3", { text: "Agreement" }), h("div", { class: "grid g-3" },
      field("Agreement type", bind("agreementType", select(AGREEMENT_TYPES.map((a) => [a, a]), p.agreementType))),
      field("Agreement number", bind("agreementNumber", text(p.agreementNumber))),
      field("Reseller (LSP)", bind("resellerLSP", text(p.resellerLSP))),
      field("Renewal date", bind("renewalDate", date(p.renewalDate))),
      field("Response deadline", bind("responseDeadline", date(p.responseDeadline)), "date decisions must be back to Microsoft"),
      n("termYears", "Term (years)"))),
    h("div", { class: "card" }, h("h3", { text: "People" }), origin, h("div", { class: "grid g-3" },
      n("employeeCount", "Employees", "estimate from Entra"), n("licensedUsers", "Licensed users", "holding at least one licence, from Entra"), n("knowledgeUsers", "Knowledge workers"),
      n("frontlineUsers", "Frontline users"), n("clinicalUsers", "Clinical / care staff"), n("contractorUsers", "Contractors"))),
    h("div", { class: "card" }, h("h3", { text: "Annual spend (USD)" }), h("div", { class: "grid g-3" },
      n("annualLicenceSpend", "Licences", "from the spend workbook"), n("annualAzureSpend", "Azure"), n("annualSupportSpend", "Support"),
      n("maccAnnualCommit", "MACC annual commitment"), n("maccAnnualConsumed", "MACC consumed this year"),
      n("edeHours", "EDE hours purchased"), n("edeUtilizationPct", "EDE utilisation %", "leave 0 if unknown"))),
    h("div", { class: "card" }, h("h3", { text: "Posture" }), h("div", { class: "grid g-3" },
      field("Primary cloud", bind("primaryCloud", select(CLOUD_POSTURE.map((c) => [c.id, c.label]), p.primaryCloud))),
      field("Default audience lens", bind("role", select(ROLES.map((r) => [r.id, r.label]), p.role))),
      field("Analyst", bind("analyst", text(p.analyst)))),
      h("label", { class: "muted", text: "Has a documented credible alternative" }),
      h("div", {}, h("input", { type: "checkbox", checked: p.hasAlternative ? "" : null, onchange: (e) => { draft.hasAlternative = e.target.checked; } }))),
    h("div", { class: "grid g-2" },
      h("div", { class: "card" }, h("h3", { text: "Environment" }), checks(CONSTRAINTS.map((c) => [c.id, c.label, c.detail]), p.constraints, (v) => { draft.constraints = v; })),
      h("div", { class: "card" }, h("h3", { text: "Priorities" }), checks(PRIORITIES.map((x) => [x, x]), p.priorities, (v) => { draft.priorities = v; }))),
    h("div", { class: "toolbar" },
      h("button", { class: "btn primary", type: "button", onclick: save }, icon("check"), "Save profile"),
      h("button", { class: "btn", type: "button", onclick: () => downloadBlob(`workspace-profile-${stamp()}.json`, JSON.stringify({ profile: getProfile(), rates: getRates() }, null, 2), "application/json") }, icon("download"), "Export settings")),
    status);
}

const money = (v) => (Number.isFinite(v) ? `$${v.toFixed(2)}` : "-");

function ratesPanel() {
  const r = getRates();
  const manual = { ...(r.manualPrices || {}) };
  const auto = r.autoPrices || {};
  const draft = { ...r };
  draft.benchmarkBands = (r.benchmarkBands ?? DEFAULT_BANDS).map((b) => ({ ...b }));
  const status = h("div", {});
  const listed = PRODUCTS.filter((p) => Number.isFinite(p.listPriceUsd) || auto[p.id] != null || manual[p.id] != null || p.id === "m365-e7");
  const inUse = (p) => manual[p.id] ?? auto[p.id] ?? (Number.isFinite(p.listPriceUsd) ? p.listPriceUsd : null);
  const rows = listed.map((p) => ({ id: p.id, name: p.name, family: p.family, list: p.listPriceUsd, workbook: auto[p.id] ?? null, product: p }));
  const cells = new Map();
  const table = dataTable({
    rows, csvName: "rate-card", pageSize: 100, searchText: (x) => `${x.name} ${x.family}`,
    columns: [
      { key: "name", label: "Product" }, { key: "family", label: "Family" },
      { key: "list", label: "Planning default / user / mo", num: true, render: (x) => money(x.list) },
      { key: "workbook", label: "From spend workbook / user / mo", num: true, render: (x) => money(x.workbook) },
      { key: "override", label: "Your override / user / mo", render: (x) => {
        const i = num(manual[x.id] ?? "", { placeholder: "blank = use workbook", "aria-label": `Your price for ${x.name}` });
        i.addEventListener("input", () => {
          const v = Number(i.value);
          if (i.value === "" || !(v > 0) || v === auto[x.id]) delete manual[x.id]; else manual[x.id] = v;
          const c = cells.get(x.id);
          if (c) c.textContent = money(inUse(x.product));
        });
        return i;
      } },
      { key: "inuse", label: "In use / user / mo", num: true, sort: (x) => inUse(x.product) ?? 0, render: (x) => { const c = h("span", { text: money(inUse(x.product)) }); cells.set(x.id, c); return c; } },
    ],
  });
  const licences = r.autoLicences || [];
  const sourceCard = licences.length
    ? h("div", { class: "card" }, h("h3", { text: "Read from the spend workbook" }),
      h("p", { class: "muted", text: `${r.autoSource?.name ?? "The newest spend workbook"}${r.autoSource?.uploaded ? ` (uploaded ${String(r.autoSource.uploaded).slice(0, 10)})` : ""}. Price per user per month is annual cost divided by records divided by 12. Government cloud licences are priced separately and are never matched to a commercial product.` }),
      dataTable({
        rows: licences, csvName: "spend-workbook-licences", pageSize: 25, searchText: (x) => x.license,
        columns: [
          { key: "license", label: "Licence" },
          { key: "gov", label: "Cloud", render: (x) => (x.gov ? "Government" : "Commercial") },
          { key: "records", label: "Records", num: true, render: (x) => x.records.toLocaleString("en-US") },
          { key: "annual", label: "Annual cost", num: true, render: (x) => `$${Math.round(x.annual).toLocaleString("en-US")}` },
          { key: "perUserMonth", label: "Per user / mo", num: true, render: (x) => money(x.perUserMonth) },
          { key: "matched", label: "Product", render: (x) => (x.gov ? "Government cloud" : r.autoMatched?.[x.license] ? PRODUCTS.find((p) => p.id === r.autoMatched[x.license])?.name ?? "" : "Not in the catalogue") },
        ],
      }))
    : note("No spend workbook has been read yet. No contracted prices are loaded, so planning defaults are shown. Upload the renewal spend workbook on Upload workbook and they will be read from it.", "demo");
  const bandRows = draft.benchmarkBands.map((b) => h("tr", {},
    h("td", {}, text(b.label, { "aria-label": "Band name", oninput: (e) => { b.label = e.target.value; } })),
    h("td", {}, num(b.min, { "aria-label": "From seats", style: { width: "110px" }, oninput: (e) => { b.min = Number(e.target.value) || 0; } })),
    h("td", {}, num(b.target, { "aria-label": "Target discount percent", max: "90", style: { width: "90px" }, oninput: (e) => { b.target = Number(e.target.value) || 0; } })),
    h("td", {}, num(b.stretch, { "aria-label": "Opening discount percent", max: "90", style: { width: "90px" }, oninput: (e) => { b.stretch = Number(e.target.value) || 0; } }))));
  const bandCard = h("div", { class: "card" },
    h("h3", { text: "Volume bands used to price proposals" }),
    h("p", { class: "muted", text: "These are starting assumptions, not Microsoft or reseller price sheets. Replace the discounts with what your organization has seen for organisations of its size. The band is chosen from licensed users in the profile; the target and opening prices on the contract review are list less these percentages, or what your organization pays now if that is lower." }),
    h("div", { class: "tablewrap" }, h("table", { class: "dt" },
      h("thead", {}, h("tr", {}, ["Band", "From seats", "Target % off list", "Open at % off list"].map((x) => h("th", { scope: "col", text: x })))),
      h("tbody", {}, bandRows))));
  return h("div", {},
    h("p", { class: "muted", text: "Unit prices come from the newest renewal spend workbook and replace the planning defaults everywhere (licence waste, advisor, contract review, Fabric Pro cost). Type a price in Your override only where your organization's contracted price differs; clear it to go back to the workbook price. The Fabric discount set in config/powerplatform.json (pricing.fabricDiscountPct) takes precedence over the one here." }),
    h("div", { class: "toolbar" },
      field("Fabric negotiated discount %", num(draft.fabricDiscountPct, { max: "90", oninput: (e) => { draft.fabricDiscountPct = Number(e.target.value || 0); } })),
      field("Rate effective date", date(draft.effectiveDate, { oninput: (e) => { draft.effectiveDate = e.target.value; } })),
      h("button", { class: "btn primary", type: "button", onclick: () => {
        saveRates({ fabricDiscountPct: draft.fabricDiscountPct, effectiveDate: draft.effectiveDate, benchmarkBands: draft.benchmarkBands, manualPrices: manual, source: Object.keys(manual).length ? "contracted" : "spend-workbook" });
        status.replaceChildren(note(`Saved ${Object.keys(manual).length} override(s) in this browser. Every other price follows the spend workbook.`));
      } }, icon("check"), "Save rate card")),
    status, sourceCard, bandCard, table);
}

export async function render() {
  return h("div", {},
    pageHead("Workspace & rate card", "Your organisation profile and contracted prices. Every Analyze page reads these."),
    tabs({ "Organisation profile": profilePanel, "Rate card": ratesPanel }));
}
