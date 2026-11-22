import { h, fmt } from "../dom.js";
import { api } from "../api.js";
import { dataTable } from "../ui.js";
import { pageHead, noData } from "./common.js";
import { latestPanel } from "./latest.js";
import { openProduct, productSearch } from "./personuse.js";

// Who has signed in to Dynamics 365 (the Dataverse resource), from Entra sign-in logs. Interactive and non-interactive both count.
export async function render(ctx) {
  const pu = await api.data("productusage");
  const root = h("div", {}, pageHead("Dynamics 365 sign-in usage", "Who has signed in to Dynamics 365 and when. Background (non-interactive) sign-ins count as activity."), productSearch("dynamics"));
  root.append(await latestPanel("dynamics"));
  if (!pu) return root.append(noData(ctx, "productusage", "Dynamics 365 sign-in usage")), root;
  const d = pu.products?.dynamics;
  (pu.warnings || []).forEach((w) => root.append(h("div", { class: "banner info", text: w })));
  if (!d) return root.append(h("div", { class: "card empty", text: `No Dynamics 365 sign-ins were found in the last ${pu.days} days.` })), root;
  const rows = Object.entries(d.users).map(([upn, u]) => ({ upn, last: u.last, count: u.count, app: u.app }));
  root.append(h("div", { class: "grid g-kpi" },
    kpi("Users who signed in", fmt.n(rows.length), `in the last ${d.windowDays || pu.days} days`),
    kpi("Sign-ins", fmt.n(d.events), `from ${fmt.date(d.from)} to ${fmt.date(d.to)}`)));
  root.append(h("p", { class: "muted", text: `Source: ${d.source}. Entra keeps sign-in logs for 30 days, so this shows recent use only. Upload an Entra sign-in log export under Microsoft Renewal Analyze to cover a longer period.` }));
  root.append(h("div", { class: "section" }, dataTable({
    rows, csvName: "dynamics-signins", searchText: (r) => `${r.upn} ${r.app}`, onRow: (r) => openProduct("dynamics", r.upn),
    columns: [
      { key: "upn", label: "User" },
      { key: "last", label: "Last sign-in", render: (r) => fmt.dt(r.last), sort: (r) => r.last },
      { key: "count", label: "Sign-ins", num: true },
      { key: "app", label: "Client app" },
    ] })));
  return root;
}

function kpi(label, value, note) {
  return h("div", { class: "card kpi" }, h("div", { class: "label", text: label }), h("div", { class: "value", text: value }), h("div", { class: "note", text: note }));
}
