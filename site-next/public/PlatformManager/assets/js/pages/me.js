import { h, icon, fmt, pill } from "../dom.js";
import { api } from "../api.js";
import { pageHead } from "./common.js";
import { appName, skuName } from "./names.js";
import { personBody } from "./person.js";
import { personUseHref } from "./productview.js";

const TONE = { warn: ["Worth a look", "warn"], info: ["Good to know", "info"], ok: ["Going well", "ok"] };
const STATUS = { active: ["Active", "ok"], "licensed-idle": ["Licensed, not used", "warn"], none: ["No activity seen", ""], unmeasured: ["Not measured", "info"] };
const RESTART = "The running server does not have the personal overview yet: restart it to turn it on.";

// "Lovelace, Ada" and "Ada Lovelace" both greet as Ada.
function firstName(name) {
  const n = String(name || "").trim();
  if (n.includes(",")) return n.split(",")[1].trim().split(/\s+/)[0] || n;
  return n.split(/\s+/)[0] || n;
}

function statsRow(items) {
  return h("div", { class: "stats-row" }, items.map((s) => h("div", { class: "statbox", title: s.note || "" },
    h("div", { class: "l", text: s.label }), h("div", { class: "v", text: typeof s.value === "number" ? fmt.n(s.value) : String(s.value) }),
    s.note ? h("div", { class: "n", text: s.note }) : null)));
}

const bar = (pct) => h("span", { class: "bar", role: "img", "aria-label": `${pct}%` }, h("i", { style: { width: Math.max(0, Math.min(100, pct)) + "%" } }));

function insightCard(i, upn) {
  const [label, tone] = TONE[i.tone] || TONE.info;
  return h("div", { class: "insight " + tone },
    h("div", {}, pill(label, tone)),
    h("div", { class: "body" }, h("h4", { text: i.title }), h("p", { text: i.text })),
    i.product ? h("a", { class: "go", href: personUseHref(i.product, upn), text: "Details" }) : null);
}

function peersCell(p) {
  const st = p.peers;
  if (!p.measured) return h("span", { class: "muted", text: "-" });
  if (!st || st.tooSmall) return h("span", { class: "muted", title: "Fewer than 5 comparable people, so no comparison is made.", text: "too few to compare" });
  return h("span", { class: "barcell", title: `${st.active} of ${st.size}${st.basis === "licensed" ? " people who hold the licence" : " people"}` },
    bar(st.activePct), h("span", { text: `${st.activePct}%` }), st.basis === "licensed" ? h("span", { class: "muted", text: "of licence holders" }) : null);
}

function standingCell(p) {
  const st = p.peers;
  if (!st || st.percentile == null) return h("span", { class: "muted", text: "-" });
  return h("span", { title: `The median among active people is ${st.median} events.`, text: `ahead of ${st.percentile}%` });
}

function footprint(d) {
  const rows = d.products.map((p) => {
    const [label, tone] = STATUS[p.status];
    return h("tr", {},
      h("td", {}, h("a", { href: personUseHref(p.key, d.me.upn), text: p.title })),
      h("td", {}, pill(label, tone)),
      h("td", { text: p.licensed == null ? "Included" : p.licensed ? p.licences.map(skuName).join(", ") : "Not licensed" }),
      h("td", {}, p.last ? h("span", { title: fmt.dt(p.last), text: fmt.ago(p.last) }) : h("span", { class: "muted", text: p.measured ? "no trace" : "-" })),
      h("td", { class: "num", text: p.measured ? fmt.n(p.events) : "-" }),
      h("td", {}, peersCell(p)),
      h("td", {}, standingCell(p)),
      h("td", { class: "muted", text: p.measured ? `${p.days} d` : "" }));
  });
  return h("div", { class: "card" }, h("h3", { text: "Your footprint across Microsoft products" }),
    h("p", { class: "muted", text: `How much you use each product, next to the people in ${d.peers.label}. Other people's figures are never shown: only the share who are active and where you stand.` }),
    h("div", { class: "tablewrap" }, h("table", { class: "dt wrap" },
      h("thead", {}, h("tr", {}, ["Product", "Status", "Licence", "Last seen", "Events", "Peers active", "Your standing", "Covers"].map((c) => h("th", { class: c === "Events" ? "num" : "", text: c })))),
      h("tbody", {}, rows))));
}

function apps(d) {
  if (!d.apps.length) return null;
  const compared = d.apps.some((a) => a.peerPct != null);
  return h("div", { class: "card" }, h("h3", { text: "Your Microsoft 365 apps" }),
    h("p", { class: "muted", text: compared ? `The apps you use and the apps most of ${d.peers.label} use.` : "The apps you use." }),
    h("table", { class: "dt wrap" },
      h("thead", {}, h("tr", {}, ["App", "You", "Last used", ...(compared ? ["Peers using it"] : [])].map((c) => h("th", { text: c })))),
      h("tbody", {}, d.apps.map((a) => h("tr", {},
        h("td", { text: appName(a.app) }),
        h("td", {}, a.used ? pill("Used", "ok") : h("span", { class: "muted", text: "Not used" })),
        h("td", {}, a.last ? h("span", { title: fmt.dt(a.last), text: fmt.ago(a.last) }) : h("span", { class: "muted", text: "-" })),
        compared ? h("td", {}, a.peerPct == null ? "-" : h("span", { class: "barcell" }, bar(a.peerPct), h("span", { text: `${a.peerPct}%` }))) : null)))));
}

function attention(d) {
  if (!d.attention.length) return null;
  return h("div", { class: "card" }, h("h3", { text: "Needs your attention" }),
    h("p", { class: "muted", text: "Things that stopped or went wrong for you recently, across the products above." }),
    h("ul", { class: "problems" }, d.attention.map((p) => h("li", {}, pill(p.kind, p.tone), h("span", { text: `${p.title}: ${p.text}` }),
      p.time ? h("span", { class: "muted when", title: fmt.dt(p.time), text: fmt.ago(p.time) }) : null))));
}

// The signed-in person's own page: insights tuned to their footprint, department and job title, then the full account and activity detail for just them.
export async function render(ctx) {
  const me = ctx.me;
  const [ins, profile] = await Promise.all([
    api.meInsights().catch((e) => ({ error: e })),
    api.personProfile(me.upn).catch((e) => ({ error: e })),
  ]);
  const root = h("div", { class: "person-page mine" });
  if (ins.error) {
    root.append(pageHead(`Hello, ${firstName(me.name)}`, "Your personal overview"),
      h("div", { class: "banner info" }, icon("alert"), ins.error.status === 404 && /^not found$/i.test(ins.error.message) ? RESTART : ins.error.message));
  } else {
    const who = [ins.me.title, ins.me.dept].filter(Boolean).join(", ");
    const sub = [who, `Compared with ${ins.peers.label}${ins.peers.titleSize ? ` and ${fmt.n(ins.peers.titleSize)} ${ins.peers.titleLabel}` : ""}`].filter(Boolean).join(". ") + ".";
    root.append(pageHead(`Hello, ${firstName(ins.me.name || me.name)}`, sub,
      ins.asOf ? h("span", { class: "muted", title: fmt.dt(ins.asOf), text: `Data as of ${fmt.ago(ins.asOf)}` }) : null),
      statsRow(ins.headline));
    root.append(h("div", { class: "section" }, h("h2", { text: "What stands out for you" }),
      ins.insights.length ? h("div", { class: "mine-insights" }, ins.insights.map((i) => insightCard(i, ins.me.upn)))
        : h("div", { class: "card" }, h("div", { class: "empty", text: "Nothing stands out right now. Your use looks in line with the people around you." }))));
    root.append(footprint(ins), ...[apps(ins), attention(ins)].filter(Boolean));
    root.append(...ins.notes.map((n) => h("p", { class: "muted", text: n })));
  }
  root.append(h("div", { class: "section" }, h("h2", { text: "Your account and activity" }),
    h("p", { class: "muted", text: "Your licences, groups and the trace of your use in each Microsoft application." })));
  if (profile.error) root.append(h("div", { class: "banner info" }, icon("alert"), profile.error.message));
  else root.append(...personBody(profile, { renewal: me.caps.includes("contracts") }));
  return root;
}
