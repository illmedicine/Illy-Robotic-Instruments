import { h, icon, fmt, pill, copyText, download } from "../dom.js";
import { api } from "../api.js";
import { barList } from "../charts.js";
import { dataTable } from "../ui.js";
import { pageHead, noData } from "./common.js";

export async function render(ctx) {
  const [s, p] = await Promise.all([api.remediationSummary(), api.data("platform")]);
  const root = h("div", {}, pageHead("Remediation", "Generate reviewed PowerShell to fix what the dashboard finds. This app never runs the scripts."));
  if (!s) return root.append(noData(ctx, "platform", "Remediation data")), root;

  root.append(h("div", { class: "banner info" }, icon("shield"),
    "Each script supports -WhatIf, asks before every change, and writes a CSV log. Run it yourself, as a Power Platform administrator, after reading it. Test on one environment first."));

  const state = { kind: null, owner: null };
  const panel = h("div", { class: "section" });
  const result = h("div", { class: "section" });
  const cards = Object.entries(s).map(([kind, v]) => h("div", { class: "card kpi", tabindex: "0", role: "button", onclick: () => choose(kind), onkeydown: (e) => e.key === "Enter" && choose(kind) },
    h("div", { class: "label", text: v.label }), h("div", { class: "value", text: fmt.n(v.count) }),
    h("div", { class: "note", text: v.byEnvironment.slice(0, 3).map((e) => `${e.env} (${e.count})`).join(", ") || "nothing to fix" })));
  root.append(h("div", { class: "grid g-3" }, cards), panel, result);

  function choose(kind) {
    state.kind = kind;
    state.owner = null;
    result.replaceChildren();
    const v = s[kind];
    const envSel = h("select", { class: "select", "aria-label": "Environment" }, h("option", { value: "", text: "All environments" }), v.byEnvironment.map((e) => h("option", { value: e.env, text: `${e.env} (${e.count})` })));
    const envIds = new Map(p.environments.map((e) => [e.name, e.id]));
    const picked = h("div", { class: "muted", text: v.needsOwner ? "No owner chosen yet." : "" });
    const hits = h("div", { class: "chips" });
    const q = h("input", { class: "input", type: "search", placeholder: "Search for the new owner by name or email", "aria-label": "New owner" });
    let timer;
    q.oninput = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const r = q.value.trim().length >= 2 ? await api.directory(q.value) : [];
        hits.replaceChildren(...r.map((u) => h("button", { class: "chip", type: "button", text: `${u.name} (${u.upn})`, onclick: () => {
          state.owner = u.id; picked.textContent = `New owner: ${u.name} (${u.upn})`; hits.replaceChildren(); } })));
      }, 250);
    };
    const go = h("button", { class: "btn primary", type: "button" }, icon("terminal"), "Generate script");
    go.onclick = async () => {
      go.disabled = true;
      result.replaceChildren(h("div", { class: "loading", text: "Generating..." }));
      try {
        const env = envSel.value ? [envIds.get(envSel.value)].filter(Boolean) : [];
        result.replaceChildren(show(await api.remediationScript({ kind, environmentIds: env, newOwnerId: state.owner })));
      } catch (e) { result.replaceChildren(h("div", { class: "banner error", text: e.message })); }
      go.disabled = false;
    };
    panel.replaceChildren(h("div", { class: "card" }, h("h3", { text: v.label }),
      h("div", { class: "toolbar" }, h("label", { class: "muted", text: "Where" }), envSel),
      v.needsOwner ? [h("div", { class: "toolbar" }, q), hits, picked] : null,
      h("div", { class: "toolbar", style: { marginTop: "10px" } }, go),
      h("h3", { style: { marginTop: "14px" }, text: "Most affected environments" }), barList(v.byEnvironment.map((e) => ({ label: e.env, value: e.count })))));
  }
  return root;
}

function show(r) {
  const copy = h("button", { class: "btn sm", type: "button", onclick: () => copyText(r.script, copy) }, icon("copy"), "Copy");
  return h("div", { class: "grid g-2" },
    h("div", { class: "card" }, h("h3", {}, "Items in the script", h("span", { class: "sub", text: `${fmt.n(r.count)}${r.skipped ? `, ${r.skipped} skipped (unusual IDs)` : ""}` })),
      dataTable({ rows: r.preview, csvName: "remediation-items", pageSize: 10, columns: [{ key: "name", label: "Item" }, { key: "envName", label: "Environment" }, { key: "info", label: "Why" }] }),
      r.count > r.preview.length ? h("div", { class: "muted", text: `Showing the first ${r.preview.length}; the script contains all ${r.count}.` }) : null),
    h("div", { class: "card" }, h("h3", {}, "Script", pill("review first", "warn"), h("span", { class: "sub" }, copy,
      h("button", { class: "btn sm", type: "button", onclick: () => download(r.filename, r.script, "text/plain") }, icon("download"), "Download .ps1"))),
      h("pre", { class: "defpre", text: r.script })));
}
