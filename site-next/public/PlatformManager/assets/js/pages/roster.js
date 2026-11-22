import { h, icon, fmt, pill } from "../dom.js";
import { api } from "../api.js";

const TONE = { admin: "risk", contracts: "warn", user: "info" };
const LABEL = { user: "General User", contracts: "Contract Admin", admin: "Platform Global Admin" };
const CHANGE = { "role-added": ["Added", "ok"], "role-removed": ["Removed", "warn"], "role-change-refused": ["Refused", "risk"], blocked: ["Address blocked", "risk"], unblocked: ["Unblocked", "ok"] };
const SOURCE = { config: "Named in the configuration file", added: "Added on this page", domain: "Account-domain rule" };

// Who holds each role, a search of the company directory to add people, and the audit trail of every change.
// An administrator can be added here but never removed: the server refuses it, and the page does not offer it.
export async function rosterSection(recent, reload) {
  const sec = h("div", { class: "section" }, h("h2", { text: "Who holds each role" }));
  let view;
  try { view = await api.roster(); } catch (e) { return sec.append(h("div", { class: "banner error", text: e.message })), sec; }
  const note = h("div", {});
  const fail = (e) => note.replaceChildren(h("div", { class: "banner error" }, icon("alert"), e.message));

  sec.append(h("p", { class: "muted", text: `Everyone who signs in and is on no list gets ${view.defaultRole ? `the ${LABEL[view.defaultRole]} role` : "no access"}. You can add people to any role below. You can remove people you added to General User or Contract Admin, but never a Platform Global Admin: removing one means changing the configuration file on the server. Every change is recorded in the audit trail.` }), note);

  const cards = h("div", { class: "grid g-3" }, view.roles.map((r) => {
    const rows = r.members.map((m) => {
      const rm = h("button", { class: "btn", type: "button", "aria-label": `Remove ${m.name || m.upn} from ${r.label}` }, "Remove");
      rm.addEventListener("click", async () => {
        if (!confirm(`Remove ${m.name || m.upn} from the ${r.label} role? They keep any other role they hold, and an open session is updated at once.`)) return;
        rm.disabled = true;
        try { await api.rosterPost("remove", { role: r.role, upn: m.upn }); reload(); } catch (e) { fail(e); rm.disabled = false; }
      });
      return h("tr", {}, h("td", {}, h("b", { text: m.name || m.upn }), m.name ? h("div", { class: "muted", text: m.upn }) : null),
        h("td", { class: "muted", text: m.source === "added" ? `${SOURCE.added}${m.addedBy ? ` by ${m.addedBy}` : ""}${m.addedAt ? `, ${fmt.ago(m.addedAt)}` : ""}` : SOURCE[m.source] }),
        h("td", {}, m.removable ? rm : null));
    });
    return h("div", { class: "card" }, h("h3", {}, pill(r.label, TONE[r.role]), ` ${r.members.length} listed`),
      h("p", { class: "muted", text: r.summary }),
      r.domains.length ? h("p", { class: "muted", text: `Also: every account in ${r.domains.join(", ")}${r.excluded ? ` except ${r.excluded} named service accounts` : ""}.` }) : null,
      r.groups ? h("p", { class: "muted", text: `Also: members of ${r.groups} listed group(s).` }) : null,
      r.members.length ? h("div", { class: "scroll-y" }, h("table", { class: "dt wrap" }, h("tbody", {}, rows))) : h("div", { class: "empty", text: "Nobody is listed by name." }),
      r.role === "admin" ? h("p", { class: "muted", text: "Administrators cannot be removed from this page." }) : null);
  }));
  sec.append(cards);

  // Addresses blocked after too many refused sign-ins: any administrator can let one try again at once.
  const blockedBox = h("div", { class: "card" });
  const showBlocked = async () => {
    let b;
    try { b = await api.rosterBlocked(); } catch (e) { return blockedBox.replaceChildren(h("h3", { text: "Blocked sign-ins" }), h("div", { class: "banner error", text: e.message })); }
    blockedBox.replaceChildren(h("h3", { text: "Blocked sign-ins" }),
      h("p", { class: "muted", text: `After ${b.limit} refused sign-ins from one address in ${b.minutes} minutes, that address is blocked for up to ${b.minutes} minutes. Unblocking lets the person try again at once; if their account is still refused, they are blocked again after another ${b.limit} tries.` }),
      b.blocked.length ? h("table", { class: "dt wrap" }, h("thead", {}, h("tr", {}, ["Address", "Typed", "PC", "Refused", "Blocked until", ""].map((c) => h("th", { text: c })))),
        h("tbody", {}, b.blocked.map((x) => {
          const go = h("button", { class: "btn primary", type: "button", "aria-label": `Unblock ${x.ip}` }, "Unblock");
          go.addEventListener("click", async () => {
            go.disabled = true;
            try { await api.rosterPost("unblock", { ip: x.ip }); reload(); } catch (e) { fail(e); go.disabled = false; }
          });
          return h("tr", {}, h("td", { text: x.ip }), h("td", { text: x.accounts.join(", ") || "-" }), h("td", { text: x.pc || "-" }), h("td", { text: String(x.attempts) }),
            h("td", { title: fmt.dt(x.until), text: fmt.dt(x.until) }), h("td", {}, go));
        }))) : h("div", { class: "empty", text: "No address is blocked right now." }));
  };
  await showBlocked();
  sec.append(blockedBox);

  // Add a person: type two or more letters of a name or address; only enabled, non-guest company users in the directory are offered.
  const q = h("input", { class: "input", type: "search", placeholder: "Search by name or company address", "aria-label": "Search people to add", autocomplete: "off" });
  const results = h("div", { class: "scroll-y" });
  let timer = null, seq = 0;
  q.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const text = q.value.trim(), mine = ++seq;
      if (text.length < 2) return results.replaceChildren(h("div", { class: "empty", text: "Type at least two letters." }));
      results.replaceChildren(h("div", { class: "loading", text: "Searching..." }));
      try {
        const people = await api.rosterSearch(text);
        if (mine !== seq) return;
        results.replaceChildren(people.length ? h("table", { class: "dt wrap" }, h("tbody", {}, people.map(personRow))) : h("div", { class: "empty", text: "Nobody found. Only enabled company users in the directory can be added; the directory is refreshed by the daily sync." }));
      } catch (e) { results.replaceChildren(h("div", { class: "banner error", text: e.message })); }
    }, 250);
  });

  function personRow(p) {
    const pick = h("select", { class: "select", "aria-label": `Role for ${p.name}` }, Object.entries(LABEL).map(([v, t]) => h("option", { value: v, text: t })));
    const go = h("button", { class: "btn primary", type: "button" }, "Add");
    const has = h("span", {}, Object.keys(p.has).map((r) => pill(LABEL[r], TONE[r])));
    const sync = () => { const owned = pick.value in p.has; go.disabled = owned; go.textContent = owned ? "Already has it" : pick.value === "admin" ? "Add as admin..." : "Add"; };
    pick.addEventListener("change", sync);
    sync();
    const cell = h("td", {}, h("div", { class: "actions" }, pick, go));
    go.addEventListener("click", async () => {
      if (pick.value === "admin" && !cell.querySelector(".sure")) {
        // Giving full access needs a second click, and cannot be undone from this page.
        const yes = h("button", { class: "btn primary sure", type: "button" }, `Yes, make ${p.name} an admin`);
        yes.addEventListener("click", () => submit(yes));
        cell.append(h("div", { class: "banner demo" }, icon("alert"), "Administrators have full access and cannot be removed from this page."), yes);
        return;
      }
      submit(go);
    });
    async function submit(btn) {
      btn.disabled = true;
      try { await api.rosterPost("add", { role: pick.value, upn: p.upn }); reload(); } catch (e) { fail(e); btn.disabled = false; }
    }
    return h("tr", {}, h("td", {}, h("b", { text: p.name }), h("div", { class: "muted", text: p.upn }), p.title || p.dept ? h("div", { class: "muted", text: [p.title, p.dept].filter(Boolean).join(", ") }) : null), h("td", {}, has), cell);
  }
  sec.append(h("div", { class: "card" }, h("h3", { text: "Add a person to a role" }), q, results));

  const changes = (recent || []).filter((e) => e.event in CHANGE);
  sec.append(h("h3", { text: "Role changes" }), h("p", { class: "muted", text: "Who changed who has access, from where, and when. Refused attempts are listed too. Kept in data/auth_audit.jsonl on the server." }),
    h("div", { class: "card" }, changes.length ? h("table", { class: "dt wrap" }, h("thead", {}, h("tr", {}, ["When", "Event", "By", "Role", "From", "Detail"].map((c) => h("th", { text: c })))),
      h("tbody", {}, changes.map((e) => { const [label, tone] = CHANGE[e.event]; return h("tr", {}, h("td", { title: fmt.dt(e.time), text: fmt.ago(e.time) }), h("td", {}, pill(label, tone)), h("td", { text: e.upn || "-" }),
        h("td", { text: e.role ? LABEL[e.role] || e.role : "-" }), h("td", { text: e.ip || "-" }), h("td", { class: "muted", text: e.detail || "" })); }))) : h("div", { class: "empty", text: "No role changes recorded yet." })));
  return sec;
}
