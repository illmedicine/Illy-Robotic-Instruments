import { h, icon, pill, fmt } from "../dom.js";
import { api } from "../api.js";
import { pageHead } from "./common.js";
import { patch, meter } from "./foundrykit.js";
import { currentRoute, replaceRoute, urlFor } from "../route.js";

// Azure AI Foundry > Agent administration: choose each agent's model, tune its parameters, give it instructions, teach it with files and live data, and see what it has learned.

const TABS = [["model", "Model and parameters"], ["instructions", "Instructions and test"], ["knowledge", "Knowledge"], ["sources", "Live data"], ["learning", "Learning and use"]];
const ACCEPT = ".docx,.pdf,.xlsx,.xlsm,.csv,.pptx,.txt,.md,.json,.png,.jpg,.jpeg,.gif,.webp";
const kb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");

export async function render() {
  const ov = await api.foundry.overview();
  const wanted = currentRoute().split("/")[1];
  let id = ov.agents.some((a) => a.id === wanted) ? wanted : ov.agents[0].id, tab = "model", d = null;
  const list = h("div", { class: "fa-list" }), main = h("div", { class: "fa-main" });
  const root = h("div", { class: "fa" }, pageHead("Agent administration", "Choose the model for each AI Builder and Ask agent, tune it, give it instructions, and teach it with files and live data. Changes take effect on the next request and are recorded in the audit trail."),
    ov.ai.demo ? h("div", { class: "banner demo" }, icon("alert"), h("b", { text: "DEMO. " }), "Changes are kept in memory only.") : null, h("div", { class: "fa-grid" }, list, main));

  function paintList() {
    list.replaceChildren(...ov.agents.map((a) => h("button", { type: "button", class: "fa-item" + (a.id === id ? " on" : "") + (a.enabled ? "" : " off"), "aria-pressed": String(a.id === id), onclick: () => load(a.id) },
      patch(a, 40), h("div", {}, h("b", { text: a.name }), h("small", { text: `${a.kind}, ${a.product}` }), meter(a.learning, { label: false })))));
  }

  async function load(next, keepTab) {
    id = next;
    if (!keepTab) tab = "model";
    paintList();
    main.replaceChildren(h("div", { class: "loading", text: "Loading..." }));
    try { d = await api.foundry.agent(id); } catch (e) { main.replaceChildren(h("div", { class: "banner error", text: e.message })); return; }
    const row = ov.agents.find((a) => a.id === id);
    if (row) Object.assign(row, { learning: d.learning, enabled: d.enabled, model: d.model, usage: d.usage, knowledge: d.knowledge });
    replaceRoute("foundryagents/" + id);
    paintList();
    paint();
  }

  const note = (el, msg, kind = "ok") => { el.replaceChildren(h("div", { class: "banner " + kind }, icon(kind === "ok" ? "check" : "alert"), msg)); };

  async function save(body, out, what = "Saved.") {
    try { d = await api.foundry.save(id, body); const row = ov.agents.find((a) => a.id === id); Object.assign(row, { learning: d.learning, enabled: d.enabled, model: d.model }); paintList(); paint(); main.querySelector(".fa-out")?.replaceChildren(h("div", { class: "banner ok" }, icon("check"), what)); }
    catch (e) { note(out, e.message, "error"); }
  }

  const slider = (label, key, min, max, step, help) => {
    const val = h("b", { text: String(d.config[key]) }), inp = h("input", { type: "range", min: String(min), max: String(max), step: String(step), value: String(d.config[key]), "aria-label": label });
    inp.addEventListener("input", () => { val.textContent = inp.value; });
    return { inp, el: h("label", { class: "fld" }, h("span", {}, label, " ", val), inp, help ? h("small", { text: help }) : null) };
  };

  function paintModel() {
    const c = d.config, out = h("div", { class: "fa-out" });
    const sel = h("select", { class: "select", "aria-label": "Model" });
    sel.append(h("option", { value: "default", text: `Use the default (${d.model.label})` }));
    for (const [label, test] of [["Ready now", (m) => m.status === "ready"], ["Needs setup or not available yet", (m) => m.status !== "ready"]]) {
      const g = h("optgroup", { label });
      d.models.filter(test).forEach((m) => g.append(h("option", { value: m.id, text: `${m.label}${m.free ? " (free)" : ""}${m.status === "ready" ? "" : " - " + m.statusText}`, ...(m.id === c.model ? { selected: "" } : {}) })));
      sel.append(g);
    }
    if (c.model === "default") sel.value = "default";
    const t = slider("Temperature", "temperature", 0, 1.5, 0.05, "Lower is more predictable, higher is more varied. Builders that write code work best at 0.1 to 0.3."), p = slider("Top P", "topP", 0.1, 1, 0.05, "Limits the choice of next word to the most likely ones. Leave at 1 unless you also tune temperature."), k = slider("Pieces of knowledge per request", "topK", 1, 8, 1, "How many passages from this agent's files are given to the model with each request.");
    const mt = h("input", { class: "input", type: "number", min: "0", max: "8192", step: "128", value: String(c.maxTokens), "aria-label": "Maximum answer length" });
    const dl = h("input", { class: "input", type: "number", min: "0", max: "1000", value: String(c.dailyLimit), "aria-label": "Daily limit" });
    const chk = (label, key, help) => { const i = h("input", { type: "checkbox", ...(c[key] ? { checked: "" } : {}) }); return { i, el: h("label", { class: "fld check" }, i, h("span", { text: label }), help ? h("small", { text: help }) : null) }; };
    const en = chk("Agent is switched on", "enabled", "Off: people see a message and the agent does nothing."), kn = chk("Use the files this agent holds", "knowledge"), ul = chk("Use answers people rated useful", "useLearned", "Lets the agent learn from the people who use it.");
    const m = d.models.find((x) => x.id === c.model);
    return h("div", {}, d.model.note ? h("div", { class: "banner info" }, icon("alert"), d.model.note) : null,
      h("div", { class: "card" }, h("h3", { text: "Language model" }), sel, m ? h("p", { class: "muted", text: m.note }) : h("p", { class: "muted", text: "The default is the model set in the configuration. Every agent starts here." }),
        m && !m.free ? h("p", { class: "muted", text: `List price assumption: $${m.inPer1M} per million tokens in, $${m.outPer1M} out.` }) : null),
      h("div", { class: "card" }, h("h3", { text: "Parameters" }), h("div", { class: "fwhat-row" }, t.el, p.el, k.el,
        h("label", { class: "fld" }, h("span", { text: "Maximum answer length (tokens)" }), mt, h("small", { text: "0 lets the model decide. Otherwise at least 256." })),
        h("label", { class: "fld" }, h("span", { text: "Requests per person per day" }), dl, h("small", { text: "0 means no limit. A limit protects a paid model from runaway use." }))),
      h("div", { class: "fwhat-row" }, en.el, kn.el, ul.el)),
      h("div", { class: "toolbar" }, h("button", { class: "btn primary", type: "button", onclick: () => save({ model: sel.value, temperature: Number(t.inp.value), topP: Number(p.inp.value), topK: Number(k.inp.value), maxTokens: Number(mt.value || 0), dailyLimit: Number(dl.value || 0),
        enabled: en.i.checked, knowledge: kn.i.checked, useLearned: ul.i.checked }, out) }, "Save"), h("button", { class: "btn", type: "button", onclick: () => save({ model: "default", temperature: d.defaults.temperature, topP: d.defaults.topP, topK: d.defaults.topK, maxTokens: 0, dailyLimit: 0, enabled: true, knowledge: true, useLearned: true }, out, "Reset to the starting settings.") }, "Reset")), out);
  }

  function paintInstructions() {
    const out = h("div", { class: "fa-out" }), res = h("div", {});
    const ta = h("textarea", { class: "input", rows: "7", maxlength: String(d.limits.maxInstructions), "aria-label": "Extra instructions", placeholder: "For example: Always answer in plain English. Cite the contract section. Never quote a price that is not in the reference material." });
    ta.value = d.config.instructions;
    const q = h("input", { class: "input", maxlength: "1000", placeholder: "Ask this agent something to try the settings above", "aria-label": "Test question" });
    const go = h("button", { class: "btn primary", type: "button" }, "Ask");
    go.onclick = async () => {
      go.disabled = true;
      res.replaceChildren(h("div", { class: "loading", text: "Asking..." }));
      try {
        const r = await api.foundry.test(id, q.value);
        res.replaceChildren(h("div", { class: "card" }, h("h3", {}, "Answer", h("span", { class: "sub", text: `${r.model.label}, ${(r.ms / 1000).toFixed(1)} s` })), r.note ? h("div", { class: "banner info", text: r.note }) : null,
          h("pre", { class: "defpre", text: r.answer }),
          r.used.sources.length ? [h("h4", { text: "Knowledge it was given" }), h("ul", { class: "flist" }, r.used.sources.map((s) => h("li", {}, h("b", { text: s.source }), h("span", { class: "muted", text: s.text }))))] : h("p", { class: "muted", text: "No file passage matched this question." }),
          r.used.facts.length ? h("p", { class: "muted", text: "Live data given: " + r.used.facts.join(", ") }) : null));
      } catch (e) { res.replaceChildren(h("div", { class: "banner error", text: e.message })); }
      go.disabled = false;
    };
    return h("div", {}, h("div", { class: "card" }, h("h3", { text: "Extra instructions" }), h("p", { class: "muted", text: "Added to the agent's built-in instructions on every request. They cannot remove the built-in safety rules." }), ta,
      h("div", { class: "toolbar" }, h("button", { class: "btn primary", type: "button", onclick: () => save({ instructions: ta.value }, out) }, "Save"), h("span", { class: "muted", text: `up to ${d.limits.maxInstructions} characters` })), out,
      h("details", {}, h("summary", { text: "Built-in instructions (read only)" }), h("pre", { class: "defpre", text: d.persona || "This agent builds its request in code: it proposes one checked step at a time and its answer is validated before anything happens." }))),
    h("div", { class: "card" }, h("h3", { text: "Try it" }), h("p", { class: "muted", text: "Sends one plain-text question through this agent's saved model, parameters, instructions, knowledge and data sources. It is not counted as a person's use." }),
      h("div", { class: "toolbar" }, q, go), res));
  }

  function paintKnowledge() {
    const out = h("div", { class: "fa-out" }), list = h("div", {}), prev = h("div", {});
    const zone = h("label", { class: "fa-drop", tabindex: "0" }, icon("download"), h("b", { text: "Drop files here or choose them" }), h("small", { text: `Word, PDF, Excel, CSV, PowerPoint, text and images. Up to ${d.limits.maxFileMb} MB each, ${d.limits.maxFiles} files per agent.` }),
      h("input", { type: "file", multiple: "", accept: ACCEPT, "aria-label": "Choose files", class: "fa-file" }));
    async function send(files) {
      for (const f of files) {
        out.replaceChildren(h("div", { class: "loading", text: `Reading ${f.name}...` }));
        try { const it = await api.foundry.upload(id, f); out.replaceChildren(h("div", { class: "banner " + (it.note ? "info" : "ok") }, icon(it.note ? "alert" : "check"), `${it.name}: ${it.note || (it.chars ? fmt.n(it.chars) + " characters read." : "added.")}`)); }
        catch (e) { out.replaceChildren(h("div", { class: "banner error", text: `${f.name}: ${e.message}` })); break; }
      }
      await load(id, true);
    }
    zone.querySelector("input").addEventListener("change", (e) => send([...e.target.files]));
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("over"));
    zone.addEventListener("drop", (e) => { e.preventDefault(); zone.classList.remove("over"); send([...e.dataTransfer.files]); });
    const rows = d.files.map((f) => h("tr", {}, h("td", {}, h("b", { text: f.name }), f.note ? h("div", { class: "muted", text: f.note }) : null), h("td", {}, pill(f.kind)), h("td", { class: "num", text: kb(f.bytes) }),
      h("td", { class: "num", text: f.chars ? fmt.n(f.chars) : "-" }), h("td", { class: "muted", text: `${(f.addedBy || "").split("@")[0]}, ${fmt.ago(f.addedAt)}` }),
      h("td", {}, h("button", { class: "btn sm", type: "button", onclick: async () => { if (!confirm(`Remove ${f.name} from this agent?`)) return; try { await api.foundry.removeFile(id, f.id); await load(id, true); } catch (e) { note(out, e.message, "error"); } } }, "Remove"))));
    list.append(d.files.length ? h("div", { class: "card" }, h("h3", {}, "Files this agent holds", h("span", { class: "sub", text: `${d.files.length} of ${d.limits.maxFiles}` })),
      h("table", { class: "ftable" }, h("thead", {}, h("tr", {}, ["File", "Type", "Size", "Characters read", "Added", ""].map((c) => h("th", { text: c })))), h("tbody", {}, rows))) : h("div", { class: "empty", text: "No files yet. Upload the material this agent should know: agreements, standards, price lists, examples." }));
    if (d.automatic.length) list.append(h("div", { class: "card" }, h("h3", {}, "Already held by Platform Manager", h("span", { class: "sub", text: "counted toward what this agent knows" })),
      h("table", { class: "ftable" }, h("thead", {}, h("tr", {}, ["Name", "Kind", "Rows", "Uploaded"].map((c) => h("th", { text: c })))),
        h("tbody", {}, d.automatic.map((a) => h("tr", {}, h("td", { text: a.name }), h("td", {}, pill(a.kind, "info")), h("td", { class: "num", text: fmt.n(a.rows) }), h("td", { class: "muted", text: fmt.date(a.when) })))))));
    const q = h("input", { class: "input", placeholder: "Check what this agent would find for a question", "aria-label": "Search the knowledge" });
    const sb = h("button", { class: "btn", type: "button", onclick: async () => {
      const r = await api.foundry.preview(id, q.value);
      prev.replaceChildren(r.hits.length ? h("ul", { class: "flist" }, r.hits.map((x) => h("li", {}, h("b", { text: `${x.source} (${x.score})` }), h("span", { class: "muted", text: x.text })))) : h("p", { class: "muted", text: "Nothing it holds matches those words." }));
    } }, "Search");
    return h("div", {}, h("div", { class: "card" }, h("h3", { text: "Teach this agent" }), zone, out), list, h("div", { class: "card" }, h("h3", { text: "What it would find" }), h("div", { class: "toolbar" }, q, sb), prev));
  }

  function paintSources() {
    const out = h("div", { class: "fa-out" }), prev = h("div", {});
    const boxes = d.sources.map((s) => { const i = h("input", { type: "checkbox", value: s.id, ...(d.config.sources.includes(s.id) ? { checked: "" } : {}) }); return { i, el: h("label", { class: "fld check fsrc" }, i, h("span", {}, s.label, " ", pill(s.available ? "Data available" : "Not collected yet", s.available ? "ok" : "warn")), h("small", { text: s.about })) }; });
    return h("div", {}, h("div", { class: "card" }, h("h3", { text: "Live data this agent may read" }), h("p", { class: "muted", text: "Read-only, from what Platform Manager has already collected from Dataverse, Microsoft Graph and Entra. The agent sees counts and types, never names, and no new Microsoft permission is needed." }),
      ...boxes.map((b) => b.el), h("div", { class: "toolbar" }, h("button", { class: "btn primary", type: "button", onclick: () => save({ sources: boxes.filter((b) => b.i.checked).map((b) => b.i.value) }, out) }, "Save"),
        h("button", { class: "btn", type: "button", onclick: async () => { const r = await api.foundry.preview(id, ""); prev.replaceChildren(Object.keys(r.facts).length ? h("pre", { class: "defpre", text: JSON.stringify(r.facts, null, 1).slice(0, 6000) }) : h("p", { class: "muted", text: "No saved source has data yet." })); } }, "Show what it would see")), out, prev));
  }

  function paintLearning() {
    const u = d.usage, l = d.learning;
    return h("div", {}, h("div", { class: "grid g-kpi" },
      h("div", { class: "card kpi" }, h("div", { class: "label", text: "What it knows" }), meter(l, { big: true }), h("div", { class: "note", text: `${l.points} points` })),
      h("div", { class: "card kpi" }, h("div", { class: "label", text: "People who have used it" }), h("div", { class: "value", text: fmt.n(u.people) }), h("div", { class: "note", text: u.last ? `last used ${fmt.ago(u.last)}` : "not used yet" })),
      h("div", { class: "card kpi" }, h("div", { class: "label", text: "Requests" }), h("div", { class: "value", text: fmt.n(u.requests) }), h("div", { class: "note", text: `${fmt.n(u.last30)} in the last 30 days` })),
      h("div", { class: "card kpi" }, h("div", { class: "label", text: "Rated useful" }), h("div", { class: "value", text: fmt.n(u.useful) }), h("div", { class: "note", text: `${fmt.n(u.notUseful)} rated not useful` }))),
    h("div", { class: "card" }, h("h3", { text: "How the meter is counted" }), l.parts.length ? h("table", { class: "ftable" }, h("tbody", {}, l.parts.map((p) => h("tr", {}, h("td", { text: p.label }), h("td", { class: "num", text: "+" + p.points }))))) : h("p", { class: "muted", text: "Nothing is held yet." }),
      h("p", { class: "muted", text: "Points rise with diminishing returns, so the first files and first users move the meter most. It measures how much the agent holds, not how good its answers are." })),
    h("div", { class: "card" }, h("h3", {}, "Answers it learned from", h("span", { class: "sub", text: "rated useful by the person who asked" })),
      d.examples.length ? h("ul", { class: "flist" }, d.examples.map((e) => h("li", {}, h("b", { text: e.ask }), h("span", { class: "muted", text: `${e.answer} (${fmt.ago(e.t)})` }),
        h("button", { class: "btn sm", type: "button", onclick: async () => { await api.foundry.forget(id, e.id); await load(id, true); } }, "Forget")))) : h("p", { class: "muted", text: "None yet. After an answer, the person can mark it useful, and the agent then uses it for similar requests from everyone." })));
  }

  function paint() {
    const a = d, panes = { model: paintModel, instructions: paintInstructions, knowledge: paintKnowledge, sources: paintSources, learning: paintLearning };
    main.replaceChildren(
      h("div", { class: "card fa-head" }, patch(a, 76), h("div", { class: "fa-head-t" }, h("h2", { text: a.name }), h("div", { class: "muted", text: `${a.product}, ${a.kind} agent` }), h("p", { text: a.blurb }),
        h("div", { class: "toolbar" }, h("a", { class: "btn sm", href: urlFor(a.page) }, icon("external"), "Open the agent"), a.enabled ? pill("On", "ok") : pill("Off", "risk"), pill(a.model.label, a.model.free ? "ok" : "warn"))), h("div", { class: "fa-head-m" }, h("small", { text: "What it knows" }), meter(a.learning, { big: true }))),
      h("div", { class: "seg fa-tabs", role: "tablist" }, TABS.map(([k, label]) => h("button", { type: "button", role: "tab", "aria-pressed": String(k === tab), onclick: () => { tab = k; paint(); } }, label))),
      panes[tab]());
  }

  paintList();
  load(id);
  return root;
}
