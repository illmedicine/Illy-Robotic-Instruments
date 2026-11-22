import { h, icon, pill } from "../dom.js";
import { api } from "../api.js";
import { pageHead } from "./common.js";

const TONE = { risk: "risk", warn: "warn", info: "" };
const banner = (kind, ...kids) => h("div", { class: `banner ${kind}` }, ...kids);
const card = (title, ...kids) => h("div", { class: "card" }, h("h3", { text: title }), ...kids);
const fail = (e) => banner("error", e.message);
const mins = (s) => `${Math.max(1, Math.round(s / 60))} min`;

// Fix a failing flow: owner or co-owner only. The server enforces every rule; this page only walks the person through them.
export async function render(ctx) {
  const root = h("div", {}, pageHead("Fix a flow", "Assess a failing cloud flow you own or co-own, review a proposed fix, and have Platform Manager apply it while it is a temporary co-owner."));
  const st = await api.flowRepair.status();
  if (!st.available) {
    root.append(banner("info", icon("shield"), st.why || "Fixing flows is not available."));
    root.append(card("How it works", h("p", { class: "muted", text: "Only the owner or a co-owner of a flow can use this, and Platform Manager can only change a flow that person has temporarily made it a co-owner of. Sign-in has to be on so Platform Manager knows who is asking." })));
    return root;
  }
  root.append(banner("info", icon("shield"), `You can only work on flows you own or co-own. To let Platform Manager change one, add "${st.appName}" as a co-owner in Power Automate (Share) for the time it takes, then remove it afterwards. ${st.aiEnabled ? "" : "The AI model is off, so only the built-in fixes are offered."}`));

  let target = null;
  const stage = h("div", {});
  const pick = h("div", {});
  root.append(card("1. Choose the flow", pick), stage);

  const flows = await api.flowRepair.flows().catch((e) => ({ flows: [], error: e.message, note: "" }));
  const sel = h("select", { class: "input", "aria-label": "Your flows" });
  const fillList = (list) => sel.replaceChildren(h("option", { value: "", text: list.length ? "Choose one of your flows" : "No flows found for you" }),
    ...list.map((f) => h("option", { value: `${f.env}|${f.id}`, text: `${f.name} (${f.envName}, ${f.state}${f.failed28 ? `, ${f.failed28} failed` : ""}${f.via === "co-owner" ? ", you co-own" : ""})` })));
  fillList(flows.flows);
  const note = h("div", { class: "muted", text: flows.note });
  const find = h("button", { class: "btn", type: "button" }, "Find flows I co-own");
  find.addEventListener("click", async () => {
    find.disabled = true;
    note.textContent = "Looking through the failing flows for ones you co-own. This can take a minute...";
    try {
      const r = await api.flowRepair.flows(true);
      fillList(r.flows);
      note.textContent = `${r.flows.length} flow(s) found. Read the owner list of ${r.scanned} failing or suspended flow(s)${r.skipped ? `; ${r.skipped} more were not read, so paste the link of a flow that is missing` : ""}.`;
    } catch (e) { note.textContent = e.message; }
    find.disabled = false;
  });
  const link = h("input", { class: "input", type: "text", placeholder: "or paste the flow's link from Power Automate", "aria-label": "Flow link" });
  const go = h("button", { class: "btn primary", type: "button" }, "Check access");
  pick.append(...[flows.error ? banner("error", flows.error) : null, sel, note, h("div", { class: "actions" }, find), link, h("div", {}, go)].filter(Boolean));
  go.addEventListener("click", async () => {
    stage.replaceChildren(h("div", { class: "empty", text: "Checking..." }));
    try {
      if (link.value.trim()) target = { link: link.value.trim() };
      else if (sel.value) { const [env, flow] = sel.value.split("|"); target = { env, flow }; } else return stage.replaceChildren(banner("info", "Choose a flow or paste its link first."));
      await check();
    } catch (e) { stage.replaceChildren(fail(e)); }
  });

  async function check(extra = []) {
    const c = await api.flowRepair.post("check", target);
    target = { env: c.env, flow: c.flow };
    const row = (ok, label, text) => h("div", { class: "kv-row" }, pill(ok ? "yes" : "no", ok ? "ok" : "risk"), " ", h("b", { text: label }), " ", text);
    const aiBtn = h("button", { class: "btn primary", type: "button", disabled: !c.canAssess }, h("span", { class: "spark" }), "Assess the flow");
    const again = h("button", { class: "btn", type: "button" }, "Check again");
    const sess = h("button", { class: "btn", type: "button", disabled: !c.canApply }, c.session.active ? `Repair session open (${mins(c.session.secondsLeft)} left)` : `Open a ${st.sessionMinutes}-minute repair session`);
    aiBtn.addEventListener("click", () => assess());
    again.addEventListener("click", () => check().catch((e) => stage.replaceChildren(fail(e))));
    sess.addEventListener("click", async () => { try { await api.flowRepair.post("session", target); await check(); } catch (e) { stage.replaceChildren(card("2. Access", fail(e), again)); } });
    const open = /^https:\/\/make\.powerautomate\.com\//.test(c.link || "") ? h("a", { class: "btn", href: c.link, target: "_blank", rel: "noopener noreferrer" }, "Open this flow in Power Automate") : null;
    stage.replaceChildren(card("2. Access", row(c.you.ok, "You", c.you.ok ? `are ${{ Owner: "the owner", "Co-owner": "a co-owner" }[c.you.role] || "an owner or co-owner"} of this flow.` : (c.idKnown ? "are not an owner or co-owner of this flow, so you cannot use this on it." : "could not be found in the directory data Platform Manager holds, so it cannot match you to the flow's owners. The next sync fixes this.")),
      row(c.app.ok, st.appName, c.app.ok ? "is a co-owner of this flow, so it can change it." : "is not a co-owner yet, so it can assess but not change this flow."),
      open ? h("div", { class: "actions" }, open) : null,
      c.steps.length ? h("ol", {}, c.steps.map((s) => h("li", { text: s }))) : null, ...extra, h("div", { class: "actions" }, aiBtn, sess, again)));
  }

  async function assess() {
    const out = h("div", {});
    stage.append(out);
    out.replaceChildren(h("div", { class: "empty", text: "Reading the flow and its failures..." }));
    try {
      const a = await api.flowRepair.post("assess", target);
      out.replaceChildren(...result(a));
    } catch (e) { out.replaceChildren(fail(e)); }
  }

  function result(a) {
    const nodes = [card(`3. What is wrong with "${a.flow.name}"`, h("div", { class: "muted", text: `State: ${a.flow.state}` }),
      a.issues.length ? a.issues.map((i) => h("div", { class: "banner " + (i.severity === "risk" ? "error" : "info") }, pill(i.severity, TONE[i.severity]), " ", h("b", { text: i.title }), " ", i.detail, i.needsPerson ? " A person has to fix this." : ""))
        : banner("info", "No problems found in the definition or the recent runs."),
      a.failedRuns.length ? h("details", {}, h("summary", { text: `${a.failedRuns.length} failed run(s)` }), a.failedRuns.map((r) => h("div", { class: "muted", text: `${r.time}  ${r.error}` }))) : null)];
    if (!a.proposal) { nodes.push(card("4. Proposed fix", banner("info", a.proposalNote || "There is no change to propose."))); return nodes; }
    const p = a.proposal, d = p.diff;
    const confirm = h("input", { class: "input", type: "text", placeholder: `Type "${a.flow.name}" to confirm`, "aria-label": "Confirm the flow name" });
    const apply = h("button", { class: "btn primary", type: "button", disabled: true }, "Apply this fix");
    confirm.addEventListener("input", () => { apply.disabled = confirm.value.trim() !== a.flow.name.trim(); });
    const done = h("div", {});
    apply.addEventListener("click", async () => {
      apply.disabled = true;
      try {
        const r = await api.flowRepair.post("apply", { proposal: p.id, confirm: confirm.value });
        const undo = h("button", { class: "btn", type: "button" }, "Put the previous version back");
        undo.addEventListener("click", async () => {
          try { await api.flowRepair.post("session", target).catch(() => null); await api.flowRepair.post("restore", { backup: r.backup }); done.replaceChildren(banner("info", "The previous version is back.")); } catch (e) { done.replaceChildren(fail(e)); }
        });
        done.replaceChildren(banner("info", icon("shield"), h("b", { text: "Applied and checked. " }), `The flow was read back and matches the proposal. The original is saved as ${r.backup}.`), h("ol", {}, r.next.map((s) => h("li", { text: s }))), undo);
      } catch (e) { done.replaceChildren(fail(e)); apply.disabled = false; }
    });
    nodes.push(card(`4. Proposed fix (${p.source})`, p.summary ? h("p", { text: p.summary }) : null, p.rootCause ? h("p", { class: "muted", text: `Cause: ${p.rootCause}` }) : null,
      h("ul", {}, p.changes.map((c) => h("li", {}, h("b", { text: c.title }), c.why ? ` - ${c.why}` : ""))),
      h("div", { class: "muted", text: `Changes: ${d.changed.length} action(s) changed, ${d.added.length} added, ${d.removed.length} removed${d.trigger ? ", trigger changed" : ""}. Proposal ${p.hash}, valid for ${p.minutes} minutes.` }),
      p.needsPerson.length ? banner("info", "A person still has to: " + p.needsPerson.join("; ")) : null, p.risks.map((r) => banner("demo", r)), p.warnings.map((w) => banner("demo", w)),
      h("details", {}, h("summary", { text: "See the definition before and after" }), h("div", { class: "grid g-2" }, h("pre", { class: "code", text: p.before }), h("pre", { class: "code", text: p.after }))),
      h("p", { class: "muted", text: "Applying needs the repair session to be open and the app to be a co-owner. Only the definition is changed; connections, owners and sharing are not touched." }),
      confirm, h("div", { class: "actions" }, apply), done));
    return nodes;
  }
  return root;
}
