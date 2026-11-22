import { h, fmt, pill, icon, stateKind } from "../dom.js";
import { api } from "../api.js";
import { dataTable } from "../ui.js";
import { barList } from "../charts.js";
import { pageHead, noData } from "./common.js";
import { SOURCES, legend, matrix, openZoom, pullLine, sourceCard } from "./sources.js";

const SEV = { high: "risk", medium: "warn", low: "info", info: "" };

export async function governance(ctx) {
  const [p, ins] = await Promise.all([api.data("platform"), api.insights()]);
  const root = h("div", {}, pageHead("Governance", "Findings to act on and DLP coverage."));
  root.append(h("div", { class: "section" }, h("h2", { text: `Findings (${ins.length})` }),
    ins.length ? ins.map((i) => h("div", { class: "card", style: { marginBottom: "12px" } },
      h("h3", {}, pill(i.severity, SEV[i.severity]), i.title, h("span", { class: "sub", text: `${fmt.n(i.count)} item(s)` })),
      h("div", { class: "muted", text: i.detail }),
      i.items.length ? dataTable({ rows: i.items, csvName: i.id, pageSize: 10, columns: [
        { key: "name", label: "Item" }, { key: "env", label: "Environment" }, { key: "info", label: "Detail" }] }) : null))
      : h("div", { class: "card empty", text: p ? "No findings. Nothing needs attention." : "Collect platform data first." })));

  root.append(h("div", { class: "section" }, h("h2", { text: "Data loss prevention policies" }),
    p ? dataTable({ rows: p.dlp, csvName: "dlp", searchText: (r) => r.name, columns: [
      { key: "name", label: "Policy" }, { key: "scope", label: "Scope" }, { key: "environments", label: "Environments", num: true },
      { key: "connectorsByClass", label: "Connectors (by class)", render: (r) => Object.entries(r.connectorsByClass).map(([k, v]) => `${{ Confidential: "Business", General: "Non-business" }[k] || k}: ${v}`).join(", "),
        csv: (r) => Object.entries(r.connectorsByClass).map(([k, v]) => `${{ Confidential: "Business", General: "Non-business" }[k] || k}: ${v}`).join("; ") },
      { key: "createdBy", label: "Created by" }, { key: "modified", label: "Modified", render: (r) => fmt.date(r.modified) }] })
      : noData(ctx, "platform", "DLP policies")));

  return root;
}

// Purview is an admin tool, not an end-user product: its Data Map shows under Microsoft 365 > Govern.
export async function purviewMap(ctx) {
  const pur = await api.data("purview");
  const root = h("div", {}, pageHead("Data Map", "Data assets catalogued in Microsoft Purview."));
  if (!pur?.dataMap) return root.append(noData(ctx, "purview", "The Purview Data Map")), root;
  root.append(h("div", { class: "card" }, h("h3", { text: `${pur.dataMap.account}: ${fmt.n(pur.dataMap.assets)} assets` }),
    barList(pur.dataMap.byAssetType.slice(0, 12).map((t) => ({ label: t.type, value: t.count })))));
  return root;
}

const PERMS = [
  ["platform", "Register the app as a Power Platform management app (scripts/Register-ManagementApp.ps1), or sign in as a Power Platform Administrator (delegated). Graph Directory.Read.All for owner names."],
  ["licensing", "Graph: User.Read.All, Organization.Read.All, AuditLog.Read.All (last sign-in; needs Entra ID P1). GroupMember.Read.All (or Directory.Read.All) to show a person's groups; Group.Read.All for how many people hold each group and its licences; RoleManagement.Read.Directory for roles given through groups."],
  ["usage", "Graph: AuditLog.Read.All and Directory.Read.All (Entra sign-in logs)."],
  ["productusage", "Graph: AuditLog.Read.All (Entra sign-in logs, 30 days). Reads who signed in to Dataverse, interactive and non-interactive. Or upload the Entra sign-in log export instead."],
  ["powerbi", "Power BI Service: Tenant.Read.All, plus the Fabric admin setting 'Service principals can use read-only admin APIs'."],
  ["purview", "Office 365 Management APIs: ActivityFeed.Read. Data Map (optional): Data Reader on the root collection."],
  ["dataverse", "An application user in each environment with a role that can read flow runs."],
  ["flowhistory", "The same Power Platform admin access as the platform module (it reads each flow's run list through the admin API). No other permission."],
  ["capacity", "The same Power Platform admin access as the platform module (it reads environments with $expand=properties.capacity). Unverified: whether the response carries storage figures for this account."],
  ["costmgmt", "Azure: Cost Management Reader on each subscription (or billing scope) that holds the Power Platform and Copilot pay-as-you-go plans; Reader to list subscriptions. List scopes in modules.costmgmt.scopes to skip listing."],
  ["datalake", "Storage Blob Data Contributor on the storage account or container (hierarchical namespace on)."],
];

export async function sources(ctx) {
  const s = ctx.status, t = s.tenant;
  const root = h("div", {}, pageHead("Data sources", "Connection health for every API feeding this app.",
    h("button", { class: "btn primary", type: "button", disabled: !!ctx.manualOff(), title: ctx.manualOff(), onclick: () => ctx.sync() }, icon("refresh"), "Sync all")));
  if (ctx.manualOff()) root.append(h("div", { class: "banner info" }, icon("alert"), ctx.manualOff()));

  root.append(h("div", { class: "grid g-2" },
    h("div", { class: "card" }, h("h3", { text: "Tenant" }), h("dl", { class: "kv" },
      h("dt", { text: "Mode" }), h("dd", {}, pill(s.mode, s.mode === "demo" ? "warn" : "ok")),
      h("dt", { text: "Tenant ID" }), h("dd", { class: "mono", text: t.tenantId || "-" }),
      h("dt", { text: "App (client) ID" }), h("dd", { class: "mono", text: t.clientId || "-" }),
      h("dt", { text: "Auth" }), h("dd", { text: t.auth === "delegated" ? "Delegated (admin sign-in)" : "App-only (client secret)" }),
      h("dt", { text: "Signed in" }), h("dd", { text: t.signedIn ? t.user || "yes" : "no" }),
      t.configError ? [h("dt", { text: "Config" }), h("dd", {}, pill(t.configError, "risk"))] : null)),
    signInCard(ctx)));

  root.append(h("div", { class: "section" }, h("h2", { text: "What each source tells you, and for which product" }), legend(),
    h("div", { class: "grid g-src" }, SOURCES.map((x) => sourceCard(ctx, x, () => openZoom(ctx, "source", x.id)))), matrix(ctx)));
  root.append(deepReads(ctx));

  root.append(h("div", { class: "section" }, h("h2", { text: "Modules" }), dataTable({
    rows: s.modules, csvName: "sources", pageSize: 50,
    columns: [
      { key: "id", label: "Module" }, { key: "label", label: "Source" },
      { key: "state", label: "Status", render: (r) => (!r.enabled ? pill("off") : r.progress ? h("div", {}, pill(`running ${r.progress.done}/${r.progress.total}`, "info"),
        h("div", { class: "progress" }, h("div", { style: { width: (r.progress.total ? (r.progress.done / r.progress.total) * 100 : 0) + "%" } })), h("div", { class: "muted", text: r.progress.label })) : pill(r.state, stateKind(r.state))), sort: (r) => (r.enabled ? r.state : "zz") },
      { key: "lastSync", label: "Last sync", render: (r) => (r.fromSnapshot ? `${fmt.ago(r.lastSync)} (saved snapshot)` : fmt.ago(r.lastSync)) },
      { key: "durationMs", label: "Time", num: true, render: (r) => (r.durationMs == null ? "-" : (r.durationMs / 1000).toFixed(1) + " s") },
      { key: "counts", label: "Counts", render: (r) => Object.entries(r.counts || {}).map(([k, v]) => `${k}: ${fmt.n(v)}`).join(", ") },
      { key: "detail", label: "Detail", render: (r) => h("span", { title: r.detail, text: r.detail }) },
      { key: "id", label: "", render: (r) => (r.enabled && s.mode === "live" ? h("button", { class: "btn sm", type: "button", disabled: !!ctx.manualOff(), title: ctx.manualOff(), onclick: (e) => { e.stopPropagation(); ctx.sync(r.id); }, text: "Sync" }) : "") },
    ] })));

  root.append(h("div", { class: "section" }, h("h2", { text: "Permissions each module needs" }),
    h("div", { class: "card" }, h("dl", { class: "kv" }, PERMS.flatMap(([m, d]) => [h("dt", { class: "mono", text: m }), h("dd", { text: d })]))),
    h("p", { class: "muted", text: "scripts/Initialize-EntraApp.ps1 creates the app registration and grants the Graph, Power BI and Office 365 Management permissions." })));
  return root;
}

// One-time deep reads: a product that lives in the audit feed is read on its own, without a full sweep of everything else.
function deepReads(ctx) {
  const live = ctx.status.mode === "live";
  const item = (src, title, pid, what) => {
    const pl = ctx.status.pulls?.[src], busy = !!pl?.progress || ctx.status.syncing;
    return h("div", { class: "card" }, h("h3", {}, title, pl?.state === "error" ? pill("failed", "risk") : pl?.at && !pl?.progress ? pill("done", pl.state === "warn" ? "warn" : "ok") : null),
      h("p", { class: "muted", text: what }), h("p", { text: pullLine(ctx, pid) }),
      pl?.detail ? h("p", { class: "muted", text: pl.detail }) : null,
      pl?.at && pl.throttled ? h("p", { class: "muted", text: `Microsoft slowed the read ${fmt.n(pl.throttled)} times; each was waited out.` }) : null,
      h("button", { class: "btn", type: "button", disabled: !live || busy || !!ctx.manualOff(), title: ctx.manualOff(), onclick: () => ctx.pull(src) }, icon("download"), pl?.at ? "Read again" : "Read now"));
  };
  return h("div", { class: "section" }, h("h2", { text: "One-time deep reads" }),
    h("p", { class: "muted", text: ctx.manualOff() ? "The daily sync reads a limited sample of the audit log for every product, then runs these deep reads for Copilot and SharePoint, which go through every blob in the last 7 days. The buttons stay off while manual sync is off." : "The daily sync reads a limited sample of the audit log for every product. A deep read goes through every blob in the window for one product only, so its numbers are complete, and nothing else is re-read. Run again after the next sync if you want the fuller numbers back." }),
    h("div", { class: "grid g-2" }, item("copilot", "Microsoft Copilot", "copilot", "Every Copilot interaction in the last 7 days, including blocked prompts and resources Copilot could not use."),
      item("sharepoint", "SharePoint and OneDrive", "sharepoint", "Every SharePoint and OneDrive event in the last 7 days: sites worked in, sharing changes and failures.")));
}

function signInCard(ctx) {
  const t = ctx.status.tenant;
  const card = h("div", { class: "card" }, h("h3", { text: "Sign-in" }));
  if (ctx.status.mode === "demo") return card.append(h("p", { class: "muted", text: "Demo mode makes no network calls. Copy config/powerplatform.example.json to config/powerplatform.json, fill in tenantId and clientId, then restart." })), card;
  if (t.auth !== "delegated") return card.append(h("p", { class: "muted", text: "App-only mode: the client secret is read from the PPM_CLIENT_SECRET environment variable when the server starts. It is never stored or shown." })), card;
  const out = h("div");
  const btn = h("button", { class: "btn primary", type: "button", text: t.signedIn ? "Sign in again" : "Sign in with Microsoft" });
  btn.onclick = async () => {
    btn.disabled = true;
    try {
      let st = await api.authStart();
      out.replaceChildren(h("p", {}, "Open ", h("a", { href: st.verificationUri, target: "_blank", rel: "noopener noreferrer", text: st.verificationUri }), " and enter:"), h("div", { class: "code-big", text: st.userCode }));
      while (st.state === "pending") {
        await new Promise((r) => setTimeout(r, 3000));
        st = await api.authState();
      }
      out.replaceChildren(h("p", { text: st.state === "done" ? "Signed in. Syncing..." : "Sign-in failed: " + st.error }));
      if (st.state === "done") { await ctx.sync(); ctx.refreshStatus(); }
    } catch (e) { out.replaceChildren(h("p", { class: "muted", text: e.message })); }
    btn.disabled = false;
  };
  card.append(h("p", { class: "muted", text: "Delegated sign-in uses a device code. Tokens stay in server memory only and are lost on restart." }), btn, out);
  return card;
}
