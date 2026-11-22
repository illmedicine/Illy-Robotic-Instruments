import { urlFor } from "../route.js";
import { h, pill } from "../dom.js";
import { pageHead } from "./common.js";
import { dataTable, openDrawer } from "../ui.js";
import { bulletList, empty } from "./widgets.js";
import { orgContext, unitPrice } from "../analyze/org.js";
import { PRODUCTS, productById } from "../analyze/data/products.js";
import { TRANSITIONS } from "../analyze/data/transitions.js";
import { SOURCES } from "../analyze/data/sources.js";
import { TERMS, TERM_CATEGORIES } from "../analyze/data/terms.js";

const src = (id) => {
  const s = SOURCES[id];
  return s ? h("a", { href: s.url, target: "_blank", rel: "noopener noreferrer", text: s.label }) : "";
};
const list = (items) => (items && items.length ? h("ul", { style: { margin: 0, paddingLeft: "18px" } }, items.map((x) => h("li", { text: x }))) : "None catalogued.");

function orgNotes(p, ctx) {
  const out = [];
  const emp = ctx.profile.employeeCount;
  if (p.maxUsers && emp > p.maxUsers) out.push(`Capped at ${p.maxUsers} users per tenant; your organization reports about ${emp.toLocaleString()} employees, so this fits only small guest or affiliate tenants.`);
  if (p.healthcare) out.push(p.healthcare);
  if (p.id === "m365-f3" && ctx.frontlineHeavy) out.push("Frontline users are in the profile: the F3 mix is a primary lever.");
  if (p.family === "Azure & Server" && ctx.onPremHeavy) out.push("Material on-premises Windows/SQL estate: Software Assurance reconciliation and Hybrid Benefit are live levers.");
  if (p.id === "defender-endpoint-p2" && ctx.hasThirdPartyEdr) out.push("A third-party EDR is the active control, so this entitlement may duplicate it.");
  return out;
}

export async function products() {
  const ctx = orgContext();
  const rows = PRODUCTS.map((p) => {
    const price = unitPrice(p.id, p.listPriceUsd);
    return { ...p, price: Number.isFinite(p.listPriceUsd) ? price.price : null, priceSource: price.source };
  });
  return h("div", {},
    pageHead("Product catalogue", "Microsoft products your organization buys, what overlaps what, common waste and the levers to negotiate. List prices are planning defaults; contracted prices from the rate card replace them."),
    dataTable({
      rows, csvName: "microsoft-products", pageSize: 50, searchText: (p) => `${p.name} ${p.family} ${p.aliases.join(" ")} ${p.skuPartNumbers.join(" ")}`,
      filters: [{ key: "family", label: "Family" }],
      columns: [
        { key: "name", label: "Product" }, { key: "family", label: "Family" },
        { key: "price", label: "Per user / month", num: true, render: (p) => (p.price == null ? "varies" : h("span", {}, `$${p.price.toFixed(2)} `, pill(p.priceSource === "contracted" ? "contracted" : "default", p.priceSource === "contracted" ? "ok" : "warn"))) },
        { key: "skuPartNumbers", label: "SKU part numbers", sort: (p) => p.skuPartNumbers[0] || "", render: (p) => p.skuPartNumbers.slice(0, 2).join(", ") },
      ],
      onRow: (p) => {
        const overlaps = p.overlaps.map((id) => productById(id)?.name).filter(Boolean);
        const notes = orgNotes(p, ctx);
        openDrawer(p.name, [
          ["Family", p.family],
          ["Summary", p.summary],
          ["Includes", list(p.includes)],
          ["Overlaps with", overlaps.length ? `${overlaps.join(", ")}. Check for duplicate assignment before buying or renewing.` : "No catalogued overlaps."],
          ["SKU part numbers", p.skuPartNumbers.join(", ") || "-"],
          ["For your organization", notes.length ? list(notes) : "-"],
          ["Common waste", list(p.commonWaste)],
          ["Negotiation levers", list(p.negotiation)],
          ["Source", src(p.source)],
        ]);
      },
    }));
}

const STATUS = { upcoming: ["Upcoming", "warn"], "in-progress": ["In progress", "info"], ended: ["Ended", ""] };

export async function transitions() {
  return h("div", {},
    pageHead("Licensing changes", "Mergers, sunsets, renames and pricing-policy changes that affect a renewal. Dates are planning references; confirm against Microsoft's notices and the agreement."),
    ...TRANSITIONS.map((t) => {
      const [label, tone] = STATUS[t.status] || [t.status, ""];
      return h("div", { class: "card", style: { marginBottom: "12px" } },
        h("h3", {}, t.title, pill(label, tone), h("span", { class: "sub", text: t.kind })),
        h("p", { text: t.summary }), h("p", {}, h("b", { text: "Timing: " }), t.timing),
        t.whyItMatters ? h("p", {}, h("b", { text: "Why it matters: " }), t.whyItMatters) : null,
        t.planner === "fabric" ? h("p", {}, h("a", { href: urlFor("fabric"), text: "Open the Fabric planner" })) : null,
        h("details", {}, h("summary", { text: "Actions, asks, pitfalls and facts" }),
          bulletList("What to do", t.actions), bulletList("Ask Microsoft", t.askMicrosoft), bulletList("Pitfalls", t.pitfalls),
          bulletList("Facts", t.facts), bulletList("For your organization", t.org), t.source ? h("p", { class: "muted" }, "Source: ", src(t.source)) : null));
    }));
}

export async function terms() {
  const rows = TERMS.map((t) => ({ ...t, name: t.abbr ? `${t.term} (${t.abbr})` : t.term }));
  return h("div", {},
    pageHead("Contract terms", "What each term means, why it matters to your organization, and the exact asks to table. Contract review looks for these in an agreement."),
    rows.length ? dataTable({
      rows, csvName: "contract-terms", pageSize: 50, searchText: (t) => `${t.name} ${t.category} ${t.plain}`,
      filters: [{ key: "category", label: "Category" }],
      columns: [
        { key: "name", label: "Term" }, { key: "category", label: "Category" },
        { key: "expected", label: "Expected in a Microsoft agreement", render: (t) => (t.expected ? pill("expected", "warn") : "optional") },
        { key: "plain", label: "In plain English" },
      ],
      onRow: (t) => openDrawer(t.name, [
        ["Category", t.category], ["In plain English", t.plain], ["Why it matters", t.whyItMatters], ["The lever", t.lever],
        ["Ask for", list(t.askFor)], ["Source", src(t.source)],
      ]),
    }) : empty("No terms catalogued.", ""),
    h("p", { class: "muted", text: `${TERM_CATEGORIES.length} categories: ${TERM_CATEGORIES.join(", ")}.` }));
}
