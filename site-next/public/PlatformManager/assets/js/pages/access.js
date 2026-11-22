import { h, icon, fmt, pill } from "../dom.js";
import { api } from "../api.js";
import { pageHead } from "./common.js";
import { rosterSection } from "./roster.js";

const ROLE_TONE = { admin: "risk", contracts: "warn", user: "info" };
const EVENT = { signin: ["Signed in", "ok"], signout: ["Signed out", ""], denied: ["Refused", "risk"], blocked: ["Address blocked", "risk"],
  "role-added": ["Role added", "ok"], "role-removed": ["Role removed", "warn"], "role-change-refused": ["Role change refused", "risk"], "group-viewed": ["Group opened", ""], "group-reviewed": ["Group reviewed", ""], "setup-check": ["Permissions checked", ""] };
const SNIPPET = `"sso": {
  "enabled": true,
  "publicUrl": "https://<this-server>:8780",
  "defaultRole": "user",
  "roles": {
    "admin":     { "appRole": "Admin",     "users": ["you@example.com"], "groups": [] },
    "contracts": { "appRole": "Contracts", "users": [], "groups": ["<group object id>"] },
    "user":      { "appRole": "User",      "users": [], "groups": [] }
  }
},
"tls": { "certFile": "config/tls/server.pem", "keyFile": "config/tls/server.key" }`;

function table(cols, rows, empty) {
  if (!rows.length) return h("div", { class: "empty", text: empty });
  return h("table", { class: "dt wrap" }, h("thead", {}, h("tr", {}, cols.map((c) => h("th", { text: c })))), h("tbody", {}, rows));
}

function setup() {
  return h("div", { class: "card" }, h("h3", { text: "Sign-in is not switched on" }),
    h("p", { text: "Everyone who can reach this address is treated as an administrator. Turn sign-in on to use company accounts and the three roles." }),
    h("ol", { class: "steps" },
      h("li", { text: "Serve the site over HTTPS: add a tls section with a certificate, or put an HTTPS reverse proxy in front. Microsoft Entra only accepts https redirect addresses (http is allowed for localhost only)." }),
      h("li", { text: "Register the redirect address and the three app roles on the Entra application: python tools\\configure_sso.py --public-url https://<this-server>:8780" }),
      h("li", { text: "Give people a role: assign users or groups to the roles under Enterprise applications, Users and groups, or list addresses and group ids in the config." }),
      h("li", { text: "Add the sso section below to config/powerplatform.json and restart the service. Keep your own address under admin so you cannot lock yourself out." })),
    h("pre", { class: "defpre", text: SNIPPET }));
}

export async function render() {
  const root = h("div", {}, pageHead("Users & roles", "Who can open Platform Manager, what each role allows, and who has signed in."));
  let a;
  try {
    a = await api.authAudit();
  } catch (e) {
    return root.append(h("div", { class: "banner error" }, e.status === 404 ? "The running server does not have sign-in yet: restart it to turn it on." : e.message)), root;
  }
  if (!a.enabled) return root.append(setup()), root;

  root.append(h("div", { class: "grid g-2" },
    h("div", { class: "card" }, h("h3", {}, icon("shield"), "Sign-in", pill("On", "ok")),
      h("dl", { class: "kv" }, [["Address", a.publicUrl], ["People with no role", a.defaultRole ? `Get the ${a.defaultRole} role` : "Are refused"],
        ["Session length", `${a.sessionHours} hours, or ${a.idleMinutes} minutes idle`]].flatMap(([k, v]) => [h("dt", { text: k }), h("dd", { text: v })]))),
    h("div", { class: "card" }, h("h3", { text: "How people get a role" }),
      h("p", { class: "muted", text: "In order of strength: named in the config, an app role assigned in Entra, or membership of a listed group. The highest role found wins. A change reaches a person at their next sign-in." }))));

  root.append(h("div", { class: "section" }, h("h2", { text: "Roles" }), h("div", { class: "card" }, table(["Role", "What it allows", "Entra app role", "Listed groups", "Listed people", "Listed domains"],
    a.roles.map((r) => h("tr", {}, h("td", {}, pill(r.label, ROLE_TONE[r.role])), h("td", { text: r.summary }), h("td", { text: r.appRole }),
      h("td", { class: "num", text: fmt.n(r.groups) }), h("td", { class: "num", text: fmt.n(r.users) }), h("td", { text: (r.domains || []).join(", ") || "-" }))), "No roles."))));

  root.append(await rosterSection(a.recent, () => render().then((n) => root.replaceWith(n))));

  root.append(h("div", { class: "section" }, h("h2", { text: `Signed in now (${a.sessions.length})` }), h("div", { class: "card" }, table(["Person", "Role", "Signed in", "Last active"],
    a.sessions.map((s) => h("tr", {}, h("td", {}, h("b", { text: s.name || s.upn }), h("div", { class: "muted", text: s.upn })), h("td", {}, pill(s.role, ROLE_TONE[s.role])),
      h("td", { title: fmt.dt(s.since), text: fmt.ago(s.since) }), h("td", { title: fmt.dt(s.last), text: fmt.ago(s.last) }))), "Nobody is signed in."))));

  root.append(h("div", { class: "section" }, h("h2", { text: "Recent sign-ins" }),
    h("p", { class: "muted", text: "Kept in data/auth_audit.jsonl on the server. A refusal means the person signed in to Microsoft but has no role here, or the sign-in could not be verified." }),
    h("div", { class: "card" }, table(["When", "Event", "Person", "Role", "From", "Detail"],
      a.recent.map((e) => { const [label, tone] = EVENT[e.event] || [e.event, ""]; return h("tr", {}, h("td", { title: fmt.dt(e.time), text: fmt.ago(e.time) }), h("td", {}, pill(label, tone)),
        h("td", { text: e.upn || "-" }), h("td", { text: e.role || "-" }), h("td", { text: e.ip || "-" }), h("td", { class: "muted", text: e.detail || "" })); }), "No sign-ins recorded yet."))));
  return root;
}
