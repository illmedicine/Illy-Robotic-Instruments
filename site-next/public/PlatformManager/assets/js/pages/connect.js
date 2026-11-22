import { h, icon, pill, copyText, download, fmt } from "../dom.js";
import { api } from "../api.js";
import { pageHead } from "./common.js";

// Reference & setup > Connect your tenant. A guided setup for a new administrator: what each data source needs, who can grant it, a ready-to-send
// request for the people who can, the sign-in options, and a starting configuration to save. Nothing on this page changes the tenant or writes a file.

const KEY = "ppm.setup.v1";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const keep = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage blocked */ } };
const STATE = { ok: ["Working", "ok"], error: ["Needs attention", "risk"], warn: ["Partly working", "warn"], running: ["Reading now", "info"], never: ["Not read yet", ""], demo: ["Demo data", "warn"] };

function copyBtn(text, label = "Copy") {
  const b = h("button", { class: "btn sm", type: "button", onclick: () => copyText(typeof text === "function" ? text() : text, b) }, icon("copy"), label);
  return b;
}

const field = (label, input, help) => h("label", { class: "fld" }, h("span", { text: label }), input, help ? h("small", { text: help }) : null);

export async function render(ctx) {
  const g = await api.setup.guide();
  const mem = { appName: "Platform Manager", tenantId: "", clientId: "", publicUrl: "", contact: "", who: "global", ...load() };
  const inp = (k, ph, type = "text") => { const i = h("input", { class: "input", type, value: mem[k] || "", placeholder: ph, "aria-label": ph }); i.addEventListener("input", () => { mem[k] = i.value.trim(); keep(mem); }); return i; };
  const params = (sources) => ({ sources: (sources || []).join(","), appName: mem.appName, clientId: mem.clientId, tenantId: mem.tenantId, contact: mem.contact, publicUrl: mem.publicUrl });
  const fetchRequests = (sources) => api.setup.requests(params(sources));
  const status = h("div", { class: "cs-msg" });
  const say = (kind, text) => status.replaceChildren(h("div", { class: "banner " + kind }, icon(kind === "error" ? "alert" : "check"), text));
  const withText = (sources, pick) => async (btn) => {
    try { const r = await fetchRequests(sources); copyText(pick(r), btn); } catch (e) { say("error", e.message); }
  };

  const root = h("div", { class: "connect" }, pageHead("Connect your tenant", "Connect your Microsoft 365 tenant and data sources to Platform Manager, step by step, whether you are a Global Administrator or an administrator of just a few areas."));
  if (g.demo) root.append(h("div", { class: "banner demo" }, icon("alert"), h("span", {}, h("b", { text: "You are looking at demo data. " }), "Follow the steps below, save the configuration it builds as config/powerplatform.json, and restart: Platform Manager then reads your own tenant.")));

  // ---- where you are
  const steps = [["1", "App registration", g.connected, "The identity Platform Manager reads with"], ["2", "Data source permissions", g.ready > 0, `${g.ready} of ${g.enabled} switched-on sources are working`],
    ["3", "Sign-in for your people", g.ssoOn, g.ssoOn ? `Microsoft ${g.ssoMode === "windows" ? "(Windows)" : "Entra"} sign-in is on` : "Anyone who can reach the server sees everything"], ["4", "First sync", g.ready > 0, "Read-only data appears on the pages"]];
  root.append(h("div", { class: "cs-steps" }, steps.map(([n, t, done, sub]) => h("div", { class: "cs-step" + (done ? " done" : "") }, h("i", { text: done ? "\u2713" : n }), h("b", { text: t }), h("small", { text: sub })))));

  // ---- who you are, and your details
  const whoBtns = [["global", "I am a Global Administrator", "or hold Privileged Role Administrator, Power Platform Administrator and Azure Owner: I can grant everything myself"],
    ["limited", "I am a limited administrator", "I administer some areas only: tell me what I can do and exactly what to ask other administrators for"]].map(([k, t, s]) =>
    h("button", { type: "button", class: "cs-who", "aria-pressed": String(mem.who === k), onclick: () => { mem.who = k; keep(mem); paintSources(); [...whoRow.children].forEach((b, i) => b.setAttribute("aria-pressed", String(["global", "limited"][i] === k))); } }, h("b", { text: t }), h("small", { text: s })));
  const whoRow = h("div", { class: "cs-whorow" }, whoBtns);
  root.append(h("div", { class: "section" }, h("h2", { text: "Who are you?" }), whoRow,
    h("div", { class: "card" }, h("h3", {}, "Your details", h("span", { class: "sub", text: "kept in this browser only, used to fill in the requests and the configuration" })),
      h("div", { class: "fwhat-row" }, field("Application name", inp("appName", "Platform Manager")), field("Tenant ID (Directory ID)", inp("tenantId", "00000000-0000-0000-0000-000000000000"), "Entra admin center, Overview"),
        field("Client ID of the app registration", inp("clientId", "filled in after step 1"), "Leave blank until the app exists"), field("Address people will open", inp("publicUrl", "https://platform.yourcompany.com"), "Needed for sign-in"),
        field("Your name and team (for requests)", inp("contact", "Alex Smith, IT Operations"))))));

  // ---- the requests
  const packBtns = h("div", { class: "toolbar" },
    h("button", { class: "btn primary", type: "button", onclick: async (e) => { try { const r = await fetchRequests([]); copyText(r.text, e.currentTarget); } catch (er) { say("error", er.message); } } }, icon("copy"), "Copy the request for every data source"),
    h("button", { class: "btn", type: "button", onclick: async () => { try { const r = await fetchRequests([]); download("platform-manager-access-request.txt", r.text + "\n\n" + Object.entries(r.ticket).map(([k, v]) => `${k}: ${v}`).join("\n"), "text/plain"); } catch (er) { say("error", er.message); } } }, icon("download"), "Download the request pack"),
    h("button", { class: "btn", type: "button", onclick: async (e) => { try { const r = await fetchRequests([]); copyText(Object.entries(r.ticket).map(([k, v]) => `${k}: ${v}`).join("\n"), e.currentTarget); } catch (er) { say("error", er.message); } } }, icon("copy"), "Copy service-ticket fields"));
  root.append(h("div", { class: "section" }, h("h2", { text: "1 and 2. Connect the data sources" }),
    h("p", { class: "muted", text: "Every data source is read-only. Open one to see its permissions and who can grant them. As a limited administrator, copy the request and send it to the administrator who can." }), packBtns, status));

  // ---- the data sources
  const list = h("div", { class: "cs-list" });
  const lines = (arr, tone) => arr.length ? h("ul", { class: "cs-ul " + (tone || "") }, arr.map((t) => h("li", { text: t }))) : null;
  function srcCard(s) {
    const st = s.status ? (STATE[s.status.state] || [s.status.state, ""]) : null;
    const perms = s.perms.length ? h("table", { class: "ftable" }, h("thead", {}, h("tr", {}, ["Where", "Type", "Permission or role"].map((c) => h("th", { text: c })))),
      h("tbody", {}, s.perms.map((p) => h("tr", {}, h("td", { text: p.resource }), h("td", { text: p.type === "Application" ? "Application permission" : "Role assignment" }),
        h("td", {}, h("code", { text: p.name }), p.optional ? pill("optional", "info") : null, p.note ? h("div", { class: "muted", text: p.note }) : null))))) : null;
    const globalBox = h("div", { class: "cs-path" }, h("h4", { text: "As a Global Administrator" }), ...s.global.map((t) => h("div", { class: "cs-cmd" }, h("span", { text: t }), copyBtn(t))));
    const limitedBox = h("div", { class: "cs-path" }, h("h4", { text: "As a limited administrator" }),
      s.limited.can.length ? [h("small", { class: "cs-lbl ok", text: "You can do yourself" }), lines(s.limited.can, "ok")] : null,
      s.limited.ask.length ? [h("small", { class: "cs-lbl warn", text: "Ask an administrator for" }), lines(s.limited.ask, "warn")] : null,
      h("div", { class: "toolbar" }, h("button", { class: "btn sm primary", type: "button", onclick: (e) => withText([s.id], (r) => r.text)(e.currentTarget) }, icon("copy"), "Copy the request for this source")));
    const d = h("details", { class: "card cs-src", "data-who": mem.who, ...(s.required ? { open: "" } : {}) },
      h("summary", {}, h("b", { text: s.name }), s.required ? pill("start here", "info") : pill("optional", ""), st ? pill(st[0], st[1]) : null, h("span", { class: "muted", text: s.api })),
      h("p", { text: s.reads }), perms, s.extra.length ? h("div", { class: "cs-extra" }, h("small", { class: "cs-lbl", text: "Also needed" }), lines(s.extra)) : null,
      mem.who === "global" ? globalBox : limitedBox, h("p", { class: "muted cs-verify" }, icon("check"), "How you know it worked: " + s.verify),
      s.status && s.status.detail && s.status.state !== "ok" ? h("div", { class: "banner demo" }, icon("alert"), `Last result: ${s.status.detail}`) : null);
    return d;
  }
  function paintSources() { list.replaceChildren(...g.sources.map(srcCard)); }
  paintSources();
  root.append(list);

  // ---- sign-in
  const ssoReq = async (e) => { try { const r = await fetchRequests([]); copyText(r.sso, e.currentTarget); } catch (er) { say("error", er.message); } };
  const ssoCard = (k) => {
    const s = g.sso[k];
    return h("div", { class: "card cs-sso" }, h("h3", { text: s.title }), s.needs.length ? [h("small", { class: "cs-lbl", text: "You need" }), lines(s.needs)] : null,
      h("h4", { text: "As a Global Administrator" }), ...s.global.map((t) => h("div", { class: "cs-cmd" }, h("span", { text: t }), copyBtn(t))),
      h("h4", { text: "As a limited administrator" }), s.limited.can.length ? [h("small", { class: "cs-lbl ok", text: "You can do yourself" }), lines(s.limited.can, "ok")] : null,
      s.limited.ask.length ? [h("small", { class: "cs-lbl warn", text: "Ask an administrator for" }), lines(s.limited.ask, "warn")] : null,
      k === "entra" ? h("div", { class: "toolbar" }, h("button", { class: "btn sm primary", type: "button", onclick: ssoReq }, icon("copy"), "Copy the sign-in request")) : null);
  };
  root.append(h("div", { class: "section" }, h("h2", { text: "3. Sign-in for your people" }),
    h("p", { class: "muted", text: "Choose one. Until sign-in is on, keep the server on localhost: anyone who can reach it sees everything." }), h("div", { class: "grid g-2" }, ssoCard("entra"), ssoCard("windows"))));

  // ---- the configuration
  const sel = (opts) => { const s = h("select", { class: "select" }, opts.map(([v, t]) => h("option", { value: v, text: t }))); return s; };
  const ssoSel = sel([["entra", "Microsoft Entra sign-in"], ["windows", "Windows sign-in"], ["none", "No sign-in yet (localhost only)"]]);
  const admins = h("input", { class: "input", placeholder: "admin1@yourcompany.com, admin2@yourcompany.com", "aria-label": "Administrators" });
  const contracts = h("input", { class: "input", placeholder: "optional: people who may use the renewal and contracts area", "aria-label": "Contract Admin role" });
  const domains = h("input", { class: "input", placeholder: "optional: yourcompany.com (who may be given a role)", "aria-label": "Mail domains" });
  const everyone = h("input", { type: "checkbox" }), hosted = h("input", { type: "checkbox" }), delegated = h("input", { type: "checkbox" });
  const mods = g.sources.filter((s) => s.module).map((s) => { const c = h("input", { type: "checkbox", value: s.module, ...(s.required || s.status?.enabled ? { checked: "" } : {}) }); return { c, el: h("label", { class: "fld check" }, c, h("span", { text: s.name }), h("small", { text: s.api })) }; });
  const out = h("div", {});
  async function build() {
    try {
      const r = await api.setup.config({ tenantId: mem.tenantId, clientId: mem.clientId, publicUrl: mem.publicUrl, sso: ssoSel.value, admins: admins.value, contractsUsers: contracts.value, rosterDomains: domains.value,
        everyoneUser: everyone.checked, hosted: hosted.checked, auth: delegated.checked ? "delegated" : "secret", modules: mods.filter((m) => m.c.checked).map((m) => m.c.value) });
      out.replaceChildren(...r.warnings.map((w) => h("div", { class: "banner demo" }, icon("alert"), w)),
        h("div", { class: "toolbar" }, copyBtn(r.json, "Copy the configuration"), h("button", { class: "btn sm", type: "button", onclick: () => download("powerplatform.json", r.json, "application/json") }, icon("download"), "Download powerplatform.json")),
        h("pre", { class: "defpre", text: r.json }), where(r.secretEnv, r.json));
    } catch (e) { out.replaceChildren(h("div", { class: "banner error", text: e.message })); }
  }
  const where = (env, json) => h("div", { class: "grid g-3 cs-where" },
    h("div", { class: "card" }, h("h4", { text: "Windows or Linux server" }), h("p", { class: "muted", text: "Save it as config/powerplatform.json (it is never committed to git). Put the secret in an environment variable, never in the file:" }),
      h("pre", { class: "defpre", text: `Windows:  setx ${env} "<client secret>"\nLinux:    export ${env}='<client secret>'\nThen:     python tools/server.py` })),
    h("div", { class: "card" }, h("h4", { text: "Azure (App Service or Container Apps)" }), h("p", { class: "muted", text: "Add the whole file as one application setting, and the secret as a secret setting (a Key Vault reference is best):" }),
      h("pre", { class: "defpre", text: `PPM_CONFIG_JSON = <the JSON above, on one line>\n${env} = @Microsoft.KeyVault(SecretUri=...)\nPPM_DATA_DIR = /home/ppm-data   (a persistent path)` })),
    h("div", { class: "card" }, h("h4", { text: "Google Cloud Run or Firebase Hosting" }), h("p", { class: "muted", text: "Pass the file as an environment variable and the secret from Secret Manager. Keep one instance running:" }),
      h("pre", { class: "defpre", text: `gcloud run deploy platform-manager --source . \\\n  --set-env-vars PPM_CONFIG_JSON='<JSON>' \\\n  --set-secrets ${env}=ppm-client-secret:latest \\\n  --min-instances 1 --no-cpu-throttling` })));
  const toggles = h("div", { class: "cs-toggles" }, ...mods.map((m) => m.el));
  root.append(h("div", { class: "section" }, h("h2", { text: "4. Build your configuration" }),
    h("p", { class: "muted", text: "Answer a few questions and get a configuration file to save. It contains no secret and is not written anywhere by this page." }),
    h("div", { class: "card" }, h("div", { class: "fwhat-row" }, field("Sign-in", ssoSel), field("Administrators", admins, "Addresses, separated by commas"), field("Contract Admin role (optional)", contracts), field("Mail domains (optional)", domains)),
      h("div", { class: "fwhat-row" }, h("label", { class: "fld check" }, everyone, h("span", { text: "Let everyone in my tenant sign in as a basic User" }), h("small", { text: "Off: only the people listed above can sign in" })),
        h("label", { class: "fld check" }, hosted, h("span", { text: "The site is hosted behind a cloud proxy" }), h("small", { text: "Needs Microsoft Entra sign-in" })),
        h("label", { class: "fld check" }, delegated, h("span", { text: "Connect as me (delegated) instead of with a client secret" }), h("small", { text: "For limited administrators who cannot get app permissions: you sign in on the Data sources page" }))),
      h("h4", { text: "Data sources to switch on" }), toggles, h("div", { class: "toolbar" }, h("button", { class: "btn primary", type: "button", onclick: build }, "Build the configuration"))), out));

  // ---- verify
  root.append(requirementsSection(g));
  const rows = g.sources.filter((s) => s.module);
  root.append(h("div", { class: "section" }, h("h2", { text: "5. Check it works" }),
    h("div", { class: "card" }, h("ol", { class: "cs-ul" }, h("li", { text: "Start the server and open it. Sign in." }), h("li", { text: "Open Reference and setup, Data sources, and press Sync all (or wait for the daily 01:00 sync)." }),
      h("li", { text: "Each source below turns to Working. A red source shows the exact reason: usually a permission that still needs consent." })),
    h("div", { class: "cs-grid" }, rows.map((s) => { const st = s.status ? (STATE[s.status.state] || [s.status.state, ""]) : ["Off", ""]; return h("div", { class: "cs-chip" }, h("b", { text: s.name }), pill(s.status && !s.status.enabled ? "Switched off" : st[0], s.status && !s.status.enabled ? "" : st[1])); })),
    permCheck(g.demo),
    h("div", { class: "toolbar" }, h("a", { class: "btn", href: "#sources" }, icon("database"), "Open Data sources")))));
  return root;
}

// Asks Microsoft which application permissions the app registration holds (read-only: permission names only, never a token or a secret).
function permCheck(demo) {
  const out = h("div", {});
  const btn = h("button", { class: "btn primary", type: "button", disabled: demo, title: demo ? "Demo mode makes no network calls" : "Asks Microsoft for a token and lists the permissions it carries", onclick: async () => {
    btn.disabled = true;
    out.replaceChildren(h("p", { class: "muted", text: "Asking Microsoft which permissions the app registration holds..." }));
    try {
      const r = await api.setup.check();
      out.replaceChildren(h("table", { class: "ftable" }, h("thead", {}, h("tr", {}, ["Resource", "Needed by the switched-on sources", "Result"].map((c) => h("th", { text: c })))),
        h("tbody", {}, r.resources.map((x) => h("tr", {}, h("td", { text: x.resource }), h("td", {}, h("code", { text: (x.wanted || []).join(", ") || "-" })),
          h("td", {}, pill(x.state === "ok" ? "All granted" : x.state === "missing" ? "Missing" : x.state === "skipped" ? "Not needed" : "Error", x.state === "ok" ? "ok" : x.state === "skipped" ? "" : "risk"), h("div", { class: "muted", text: x.detail || "" })))))));
    } catch (e) { out.replaceChildren(h("div", { class: "banner error" }, icon("alert"), e.message)); }
    btn.disabled = demo;
  } }, icon("check"), "Check permissions");
  return h("div", { class: "card", style: { marginTop: "12px" } }, h("h3", { text: "Check the permissions now" }),
    h("p", { class: "muted", text: "Needs the server running with your configuration and secret. It only asks Microsoft which permissions the app registration holds, then compares them with what the switched-on sources need." }), h("div", { class: "toolbar" }, btn), out);
}

// ---- Requirements, data sources and storage: one place to size the install before anything is connected.
// The storage formula is the same as tools/ppm_storage.py (estimate_gb); keep the two in step.
const STORAGE_FIELDS = [
  ["users", "People in the tenant", 10, 20000, 10, ""],
  ["retentionDays", "Days of daily sweeps kept", 30, 1825, 5, "days"],
  ["sources", "Data sources switched on", 0, 12, 1, ""],
  ["kbPerUserSourceDay", "Usage rows kept per person, per source, per day", 0.5, 5, 0.1, "KB"],
  ["uploadsGB", "Uploaded workbooks and documents", 0, 100, 1, "GB"],
  ["baseGB", "Application, logs and audit trail", 0.5, 10, 0.5, "GB"],
  ["headroom", "Spare space for growth and sync runs", 0, 0.6, 0.05, "of the estimate"],
];
const GIB = 1024 ** 3;
export function estimateGB(s) {
  const rowsGB = s.users * s.sources * s.retentionDays * s.kbPerUserSourceDay * 1024 / GIB;
  return Math.round((rowsGB + s.uploadsGB + s.baseGB) * (1 + s.headroom) * 100) / 100;
}

const REQUIREMENTS = [
  ["Windows", "Windows 10 version 1809 or later, or Windows 11, 64-bit. Windows Server with the same sideload rules for a server install. [VERIFY] server SKUs."],
  ["Memory", "4 GB minimum; 8 GB recommended for large tenants. [VERIFY] against a real tenant."],
  ["Disk", "About 300 MB for the application, plus the storage estimate below for the data folder."],
  ["Account", "Standard user installs are per user and need no administrator rights. Machine-wide installs need an administrator. The Microsoft Store edition needs a Microsoft account signed in to the Store for the subscription."],
  ["Network", "Outbound HTTPS only, to Microsoft sign-in and the Microsoft 365, Power Platform, Power BI, Dynamics 365 and Azure endpoints the switched-on sources call. Nothing listens on the network: the server binds to 127.0.0.1 by default. [VERIFY] the endpoint list."],
  ["Microsoft permissions", "Read-only application permissions for each switched-on source (see the table of data sources). Platform Manager never writes to Microsoft 365, except the approved actions in the Action Center."],
];

function requirementsSection(g) {
  const cfg = { users: 100, retentionDays: 365, sources: 6, kbPerUserSourceDay: 1.5, uploadsGB: 2, baseGB: 1, headroom: 0.3 };
  const out = h("div", { class: "card" });
  const estimate = h("div", { style: { font: "600 28px var(--font-display)" } });
  const snippet = h("pre", { class: "defpre" });
  const paint = () => {
    estimate.textContent = `${fmt.n(estimateGB(cfg))} GB`;
    snippet.textContent = JSON.stringify({ storage: { ...cfg } }, null, 2);
  };
  const rowsOf = STORAGE_FIELDS.map(([k, label, min, max, step, unit]) => {
    const value = h("span", { class: "muted", text: "" });
    const input = h("input", { type: "range", min: String(min), max: String(max), step: String(step), value: String(cfg[k]), "aria-label": label, style: { width: "100%" } });
    const show = () => { value.textContent = `${k === "headroom" ? Math.round(cfg[k] * 100) + "%" : fmt.n(cfg[k])}${unit && k !== "headroom" ? " " + unit : ""}`; };
    input.addEventListener("input", () => { cfg[k] = Number(input.value); show(); paint(); });
    show();
    return h("label", { class: "fld", style: { display: "grid", gap: "4px" } }, h("span", {}, label, " ", value), input);
  });
  const sliders = h("div", { class: "grid", style: { gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" } }, rowsOf);
  paint();
  // What the server has now, for the same folder (administrators only; the page is for them).
  const now = h("p", { class: "muted", text: "" });
  api.storage().then((st) => { now.textContent = `On this server now: ${fmt.n(st.usedGB)} GB used, ${fmt.n(st.freeGB)} GB free on the data disk.`; }).catch(() => { now.textContent = ""; });
  out.append(h("div", { class: "grid", style: { gridTemplateColumns: "1fr 1fr", gap: "18px" } },
    h("div", {}, h("h4", { text: "Storage estimate" }), estimate, h("p", { class: "muted", text: "Move the sliders to match the environment. The estimate is a planning model; compare it with the measured use after a month." }), now),
    h("div", {}, h("h4", { text: "Configuration block" }), h("p", { class: "muted", text: "Paste this into config/powerplatform.json to keep the figures." }), copyBtn(() => snippet.textContent, "Copy"), snippet)),
    h("h4", { text: "Adjust for this environment" }), sliders);
  const reqs = h("table", { class: "ftable" }, h("thead", {}, h("tr", {}, [h("th", { text: "Requirement" }), h("th", { text: "What you need" })])),
    h("tbody", {}, REQUIREMENTS.map(([k, v]) => h("tr", {}, h("td", { text: k }), h("td", { text: v })))));
  const sources = h("table", { class: "ftable" }, h("thead", {}, h("tr", {}, ["Data source", "Switched on", "What it reads"].map((c) => h("th", { text: c })))),
    h("tbody", {}, (g.sources || []).filter((x) => x.module).map((x) => h("tr", {}, h("td", { text: x.label || x.name || x.module }), h("td", { text: x.status?.enabled || x.required ? "Yes" : "No" }), h("td", { text: x.purpose || x.about || "" })))));
  return h("div", { class: "section" }, h("h2", { text: "Requirements, data sources and storage" }),
    h("p", { class: "muted", text: "Everything this installation needs for full functionality, and how much storage the environment will use." }),
    h("div", { class: "card" }, h("h4", { text: "System requirements" }), reqs),
    h("div", { class: "card" }, h("h4", { text: "Data sources" }), sources),
    out);
}
