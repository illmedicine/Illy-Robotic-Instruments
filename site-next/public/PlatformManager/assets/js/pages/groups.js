import { h, icon, fmt, pill, download, toCsv, copyText } from "../dom.js";
import { api } from "../api.js";
import { pageHead } from "./common.js";
import { currentRoute, replaceRoute } from "../route.js";

const MEMBER_COLS = [{ key: "name", label: "Name" }, { key: "address", label: "Address" }, { key: "dept", label: "Department" }, { key: "title", label: "Job title" },
  { key: "type", label: "Type" }, { key: "state", label: "State", csv: (m) => [m.nested ? "Nested" : "", m.guest ? "Guest" : "", m.enabled === false ? "Disabled" : ""].filter(Boolean).join(", ") }];

const kv = (rows) => h("dl", { class: "kv" }, rows.flatMap(([k, v]) => [h("dt", { text: k }), h("dd", {}, v)]));
const card = (title, ...kids) => h("div", { class: "card" }, h("h3", { text: title }), ...kids);
const table = (cols, rows) => h("table", { class: "dt wrap" }, h("thead", {}, h("tr", {}, cols.map((c) => h("th", { text: c })))), h("tbody", {}, rows));
const SEV = { high: "risk", medium: "warn", low: "info", info: "" };
const RISK = { high: "risk", medium: "warn", low: "info", none: "ok" };
const VERDICT = { keep: "Keep", tune: "Tune", remove: "Removal candidate", review: "Needs a person" };

// Rule findings for each group, and the AI's read of them: risk, and whether to keep, tune or remove. Nothing is changed from here.
function reviewView(res) {
  const ai = res.ai, by = Object.fromEntries((ai.groups || []).map((g) => [g.id, g]));
  const nodes = [ai.available ? (ai.summary ? h("p", {}, h("b", { text: "AI summary: " }), ai.summary) : null)
    : h("div", { class: "banner info" }, icon("alert"), `The AI review is not available (${ai.reason}). The rule findings below still apply.`)];
  for (const g of res.groups) {
    const a = by[g.id], risk = a ? a.risk : g.risk, verdict = a ? a.verdict : g.ruleVerdict;
    nodes.push(card(g.name, h("div", {}, pill(`Risk: ${risk}`, RISK[risk] || ""), " ", pill(a ? VERDICT[verdict] : `Rules suggest: ${VERDICT[verdict]}`, ""), " ", h("span", { class: "muted", text: g.kind })),
      a && a.why ? h("p", { text: a.why }) : null, a && a.actions.length ? h("ul", {}, a.actions.map((x) => h("li", { text: x }))) : null,
      g.findings.length ? table(["Finding", "What it means", "What to do"], g.findings.map((f) => h("tr", {}, h("td", {}, pill(f.severity, SEV[f.severity]), " ", h("b", { text: f.title })), h("td", { text: f.detail }), h("td", { text: f.action }))))
        : h("div", { class: "empty", text: "The rules found nothing to flag." })));
  }
  nodes.push(h("p", { class: "muted", text: "Nothing here changes a group. Graph cannot show when a distribution list last received mail, so check a message trace before removing one." }));
  return h("div", {}, ...nodes);
}

function reviewButton(ids, box, label) {
  const b = h("button", { class: "btn primary", type: "button" }, h("span", { class: "spark" }), label);
  b.addEventListener("click", async () => {
    b.disabled = true;
    box.replaceChildren(h("div", { class: "loading", text: "Reading the group settings and asking the AI. This can take a minute..." }));
    try { box.replaceChildren(reviewView(await api.groupInsights(ids))); } catch (e) { box.replaceChildren(h("div", { class: "banner error", text: e.message })); }
    b.disabled = false;
  });
  return b;
}

// Find a group, then see its size, whether outsiders may send to it, who may send to it, and who is in it.
export async function render() {
  const root = h("div", {}, pageHead("Group lookup", "Find a group by name and see how many people are in it, whether people outside the company can send to it, who is allowed to send to it, and who its members are."));
  const q = h("input", { class: "input", type: "search", placeholder: "Group name or address, for example IT.Helpdesk.Team", "aria-label": "Group name or address", autocomplete: "off" });
  const go = h("button", { class: "btn primary", type: "button" }, icon("search"), "Search");
  const results = h("div", {}), view = h("div", {});
  root.append(h("div", { class: "card" }, h("div", { class: "actions" }, q, go), results), view);

  async function open(id, nested = false) {
    replaceRoute(`groups/${encodeURIComponent(id)}`);
    view.replaceChildren(h("div", { class: "loading", text: "Reading the group from Microsoft..." }));
    try { view.replaceChildren(detail(await api.groupDetail(id, nested), (n) => open(id, n))); } catch (e) { view.replaceChildren(h("div", { class: "banner error", text: e.message })); }
  }

  async function search() {
    const text = q.value.trim();
    view.replaceChildren();
    if (text.length < 2) return results.replaceChildren(h("div", { class: "empty", text: "Type at least two letters." }));
    results.replaceChildren(h("div", { class: "loading", text: "Searching..." }));
    try {
      const rows = await api.groupSearch(text);
      if (!rows.length) return results.replaceChildren(h("div", { class: "empty", text: "No group found. The search matches the start of a group's name or address." }));
      if (rows.length === 1) { results.replaceChildren(); return open(rows[0].id); }
      const reviewAll = h("div", {});
      results.replaceChildren(h("div", { class: "actions" }, reviewButton(rows.slice(0, 10).map((g) => g.id), reviewAll, `Review these ${Math.min(rows.length, 10)} groups with AI`),
        h("span", { class: "muted", text: "Risk, and which to keep, tune or remove." })), reviewAll, table(["Group", "Kind", "Address", "Source", ""], rows.map((g) => {
        const b = h("button", { class: "btn", type: "button" }, "Open");
        b.addEventListener("click", () => open(g.id));
        return h("tr", {}, h("td", {}, h("b", { text: g.name }), g.description ? h("div", { class: "muted", text: g.description }) : null), h("td", { text: g.kind }), h("td", { text: g.mail || "-" }),
          h("td", { text: g.synced ? "On-premises (synced)" : "Cloud" }), h("td", {}, b));
      })));
    } catch (e) { results.replaceChildren(h("div", { class: "banner error", text: e.message })); }
  }
  go.addEventListener("click", search);
  q.addEventListener("keydown", (ev) => { if (ev.key === "Enter") search(); });

  const id = decodeURIComponent(currentRoute().split("/")[1] || "");
  if (id) open(id);
  return root;
}

function detail(d, reload) {
  const m = d.members, out = d.external, s = d.senders;
  const outside = out.allowed === true ? pill("Yes: people outside can send", "warn") : out.allowed === false ? pill("No: internal senders only", "ok") : out.blocked ? pill("Not readable here", "warn") : pill("Not reported", "");
  const nodes = [h("div", { class: "section" }, h("h2", { text: d.name }), h("p", { class: "muted", text: [d.kind, d.mail, d.synced ? "synced from on-premises Active Directory" : "cloud group"].filter(Boolean).join(" · ") }),
    d.description ? h("p", { text: d.description }) : null)];
  nodes.push(h("div", { class: "grid g-3" },
    card("Size", kv([["Members", h("b", { text: fmt.n(m.total) })], ["People (direct)", fmt.n(m.people)], m.groups ? ["Nested groups", fmt.n(m.groups)] : null, m.contacts ? ["Contacts", fmt.n(m.contacts)] : null,
      m.peopleIncludingNested != null ? ["People including nested groups", fmt.n(m.peopleIncludingNested)] : null, m.guests ? ["Guests", fmt.n(m.guests)] : null, m.disabled ? ["Disabled accounts", fmt.n(m.disabled)] : null].filter(Boolean))),
    card("Who can send to it", kv([["Outside the company", outside], ["Authorized senders", s.known === false ? pill("Not readable here", "warn") : s.restricted ? pill(`Restricted to ${fmt.n(s.accepted.length)}`, "info") : pill("Anyone allowed", "")],
      s.rejected.length ? ["Blocked senders", fmt.n(s.rejected.length)] : null, d.hiddenFromAddressLists != null ? ["Hidden from address lists", d.hiddenFromAddressLists ? "Yes" : "No"] : null].filter(Boolean)),
      out.note ? h("p", { class: "muted", text: out.note }) : null, h("p", { class: "muted", text: s.note })),
    card("About", kv([["Created", d.created ? fmt.dt(d.created) : "-"], ["Visibility", d.visibility || "-"], ["Group id", h("span", { class: "muted", text: d.id })]]))));
  const reviewBox = h("div", {});
  if (d.exchangeCheck && (out.blocked || s.known === false)) {
    const copyCmd = h("button", { class: "btn", type: "button" }, "Copy command");
    copyCmd.addEventListener("click", () => copyText(d.exchangeCheck, copyCmd));
    nodes.push(h("div", { class: "section" }, card("Check the sender settings in Exchange", h("p", { class: "muted", text: "The outside-sender setting and the allowed-senders list live in Exchange, and Microsoft will not show them to an application. Run this as an Exchange administrator (it only reads):" }),
      h("pre", { class: "code", text: d.exchangeCheck }), h("div", { class: "actions" }, copyCmd),
      h("p", { class: "muted", text: "RequireSenderAuthenticationEnabled False means people outside the company can send. AcceptMessagesOnlyFrom lists who is authorized to send; empty means anyone permitted by that setting." }))));
  }
  if (d.errors.length) nodes.push(h("div", { class: "banner demo" }, icon("alert"), h("span", {}, h("b", { text: "Some parts could not be read: " }), d.errors.join("; "),
    " The Microsoft Graph permission Group.Read.All (or Directory.Read.All) is needed for all of it.")));
  nodes.push(h("div", { class: "section" }, h("h2", { text: "Risk review" }), h("p", { class: "muted", text: "Rule checks and an AI read of this group's size, sender settings, owners and members: is it a risk, and should it be kept, tuned or removed." }),
    h("div", { class: "actions" }, reviewButton([d.id], reviewBox, "Review this group")), reviewBox));

  if (s.accepted.length || s.rejected.length) {
    const rows = [...s.accepted.map((x) => [x, "Allowed to send"]), ...s.rejected.map((x) => [x, "Blocked from sending"])];
    nodes.push(h("div", { class: "section" }, h("h2", { text: "Authorized senders" }), h("div", { class: "card" }, table(["Name", "Address", "Type", "Status"], rows.map(([x, why]) =>
      h("tr", {}, h("td", { text: x.name || "-" }), h("td", { text: x.address || "-" }), h("td", { text: x.type }), h("td", {}, pill(why, why.startsWith("Allowed") ? "ok" : "risk"))))))));
  }

  const filter = h("input", { class: "input", type: "search", placeholder: "Filter members", "aria-label": "Filter members" });
  const body = h("tbody", {});
  const shown = () => { const t = filter.value.trim().toLowerCase(); return m.list.filter((x) => !t || `${x.name} ${x.address} ${x.dept} ${x.title}`.toLowerCase().includes(t)); };
  const paint = () => {
    const rows = shown();
    body.replaceChildren(...rows.slice(0, 500).map((x) => h("tr", {}, h("td", { text: x.name || "-" }), h("td", { text: x.address || "-" }), h("td", { text: x.dept || "-" }), h("td", { text: x.title || "-" }),
      h("td", {}, x.type, x.nested ? [" ", pill("Nested", "info")] : null, x.guest ? [" ", pill("Guest", "warn")] : null, x.enabled === false ? [" ", pill("Disabled", "risk")] : null))));
    count.textContent = `${fmt.n(rows.length)} of ${fmt.n(m.list.length)} listed${rows.length > 500 ? " (first 500 shown; the download has all)" : ""}${m.truncated ? `. The group is larger than the ${fmt.n(m.list.length)} read here.` : ""}`;
  };
  const count = h("span", { class: "muted" });
  const csv = h("button", { class: "btn", type: "button" }, "Download members (CSV)");
  csv.addEventListener("click", () => download(`${d.name.replace(/[^\w.-]+/g, "_")}-members.csv`, toCsv(shown(), MEMBER_COLS)));
  const copy = h("button", { class: "btn", type: "button" }, "Copy addresses");
  copy.addEventListener("click", () => copyText(shown().map((x) => x.mail || x.address).filter(Boolean).join("; "), copy));
  filter.addEventListener("input", paint);
  paint();
  const deepBtn = m.groups > 0 || m.includesNested ? h("button", { class: "btn", type: "button" }, m.includesNested ? "Direct members only" : `Include people in nested groups${m.peopleIncludingNested != null ? ` (${fmt.n(m.peopleIncludingNested)})` : ""}`) : null;
  if (deepBtn) deepBtn.addEventListener("click", () => reload(!m.includesNested));
  nodes.push(h("div", { class: "section" }, h("h2", { text: "Members" }), h("div", { class: "card" }, h("div", { class: "actions" }, filter, deepBtn, csv, copy, count),
    m.list.length ? h("div", { class: "scroll-y tall" }, h("table", { class: "dt wrap" }, h("thead", {}, h("tr", {}, ["Name", "Address", "Department", "Job title", "Type"].map((c) => h("th", { text: c })))), body)) : h("div", { class: "empty", text: "No members were listed." }))));
  return h("div", {}, ...nodes);
}
