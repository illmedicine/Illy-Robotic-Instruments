import { urlFor } from "../route.js";
import { h, icon, pill, fmt } from "../dom.js";
import { api } from "../api.js";
import { pageHead } from "./common.js";
import { patch, meter } from "./foundrykit.js";

// Azure AI Foundry > Agent overview and Models.

export const kpi = (label, value, note) => h("div", { class: "card kpi", style: { cursor: "default" } }, h("div", { class: "label", text: label }), h("div", { class: "value", text: value }), h("div", { class: "note", text: note }));
export const aiBanners = (ai) => [
  !ai.enabled ? h("div", { class: "banner info" }, icon("alert"), "AI is off, so the agents cannot answer. Turn it on in config/powerplatform.json (the ai section).") : null,
  ai.demo ? h("div", { class: "banner demo" }, icon("alert"), h("b", { text: "DEMO. " }), "Usage and learning figures are sample data.") : null,
];

function agentCard(a) {
  const u = a.usage, k = a.knowledge;
  return h("div", { class: "card fagent" + (a.enabled ? "" : " off") },
    h("div", { class: "fagent-top" }, patch(a, 64),
      h("div", {}, h("h3", {}, a.name, a.enabled ? null : pill("Off", "risk")), h("div", { class: "muted", text: a.product }), h("div", { class: "fagent-pills" }, pill(a.kind, a.kind === "Ask" ? "info" : ""), pill(a.model.label, a.model.free ? "ok" : "warn")))),
    h("p", { class: "muted fagent-blurb", text: a.blurb }),
    h("div", { class: "fagent-meter" }, h("small", { text: "What it knows" }), meter(a.learning)),
    h("div", { class: "fagent-stats" },
      h("div", {}, h("b", { text: fmt.n(u.people) }), h("small", { text: u.people === 1 ? "person has used it" : "people have used it" })),
      h("div", {}, h("b", { text: fmt.n(u.requests) }), h("small", { text: `requests, ${fmt.n(u.last30)} in 30 days` })),
      h("div", {}, h("b", { text: fmt.n(k.files + k.automatic) }), h("small", { text: `files held, ${k.sources} live source${k.sources === 1 ? "" : "s"}` }))),
    a.model.note ? h("div", { class: "muted fagent-note", text: a.model.note }) : null,
    h("div", { class: "toolbar" }, h("a", { class: "btn sm", href: urlFor(a.page) }, icon("external"), "Open"), h("a", { class: "btn sm primary", href: urlFor("foundryagents/" + a.id) }, "Administer")));
}

export async function overview() {
  const ov = await api.foundry.overview();
  const t = ov.totals, name = Object.fromEntries(ov.agents.map((a) => [a.id, a.name]));
  const builders = ov.agents.filter((a) => a.kind === "Builder"), asks = ov.agents.filter((a) => a.kind === "Ask");
  return h("div", {}, pageHead("Agent overview", "Every AI agent in Platform Manager: who has used it, how much it knows about its subject, and which model runs it."), ...aiBanners(ov.ai),
    h("div", { class: "grid g-kpi" }, kpi("Agents", fmt.n(t.agents), `${builders.length} builders, ${asks.length} ask`), kpi("People who have used an agent", fmt.n(t.people), "counted from requests and Contract Renewal page opens"),
      kpi("Requests in 30 days", fmt.n(t.requests30), "across every agent"), kpi("Files and workbooks held", fmt.n(t.files), "uploaded for agents, plus workbooks already in Platform Manager"), kpi("Agents on a free model", `${fmt.n(t.free)} of ${t.agents}`, "run on this server at no per-use cost")),
    h("div", { class: "banner info" }, icon("shield"), "The knowledge meter counts what an agent holds: documents with readable text, workbooks, live data sources, requests answered, answers people rated useful and people who have used it. It rises as admins teach the agent and people use it; it is not a quality score."),
    h("div", { class: "section" }, h("h2", { text: "AI Builders" }), h("div", { class: "fagents" }, builders.map(agentCard))),
    h("div", { class: "section" }, h("h2", { text: "Ask" }), h("div", { class: "fagents" }, asks.map(agentCard))),
    ov.recent.length ? h("div", { class: "section" }, h("h2", { text: "Latest use" }), h("div", { class: "card" }, h("ul", { class: "flist" }, ov.recent.map((r) => h("li", {}, h("b", { text: name[r.agent] || r.agent }), h("span", { class: "muted", text: `${r.kind === "open" ? "opened" : "answered a request"}, ${fmt.ago(r.t)}` })))))) : null);
}

// ------------------------------------------------------------------ Models

export async function models() {
  const [m, ov] = await Promise.all([api.foundry.models(), api.foundry.overview()]);
  const using = {};
  for (const a of ov.agents) (using[a.model.id] ||= []).push(a.name);
  const tone = { ready: "ok", notinstalled: "warn", offline: "risk", needsetup: "warn", noapi: "", planned: "" };
  const ai = m.ai;
  return h("div", {}, pageHead("Models", "The language models agents can run on, which are ready now, and what each costs. Pick the model for each agent on the Agent administration page."), ...aiBanners(ai),
    h("div", { class: "grid g-kpi" }, kpi("Default model", ai.deployment || (ai.demo ? "demo" : "not set"), ai.enabled ? `provider: ${ai.provider}` : "AI is off"), kpi("Ready now", String(m.models.filter((x) => x.status === "ready").length), "usable by an agent today"),
      kpi("Azure connection", m.azure ? "configured" : "not set", m.azure ? "cloud models listed under foundry.azure can be used" : "add foundry.azure to the config to use Azure OpenAI or Foundry models")),
    h("div", { class: "card" }, h("table", { class: "ftable" }, h("thead", {}, h("tr", {}, ["Model", "Where it runs", "Cost per million tokens", "Status", "Used by"].map((c) => h("th", { text: c })))),
      h("tbody", {}, m.models.map((x) => h("tr", {},
        h("td", {}, h("b", { text: x.label }), x.current ? pill("default", "info") : null, h("div", { class: "muted", text: x.note })),
        h("td", { text: x.kind === "ollama" ? "On this server (Ollama)" : x.kind === "azure" ? "Azure, in your tenant" : x.kind === "copilot" ? "Microsoft Copilot app" : "Not connected" }),
        h("td", { class: "num", text: x.free ? "Free" : `$${x.inPer1M} in, $${x.outPer1M} out` }),
        h("td", {}, pill(x.statusText, tone[x.status] || "")),
        h("td", { class: "muted", text: (using[x.id] || []).join(", ") || "-" })))))),
    h("div", { class: "section" }, h("h2", { text: "Turning more models on" }),
      h("div", { class: "grid g-2" },
        h("div", { class: "card" }, h("h3", { text: "Free models on this server" }), h("p", { class: "muted", text: "Install one with Ollama on the server, for example:" }), h("pre", { class: "defpre", text: "ollama pull llama3.1:8b" }), h("p", { class: "muted", text: "It appears here as Ready within a minute and can be chosen for any agent. Bigger models need more memory." })),
        h("div", { class: "card" }, h("h3", { text: "Azure OpenAI or Foundry models" }), h("p", { class: "muted", text: "Create the deployment in your own Azure tenant, then add it to config/powerplatform.json and restart:" }),
          h("pre", { class: "defpre", text: '"foundry": {\n  "azure": {\n    "endpoint": "https://<resource>.openai.azure.com",\n    "auth": "entra",\n    "deployments": { "gpt-4o-mini": "<deployment-name>" }\n  }\n}' }),
          h("p", { class: "muted", text: "Prices above are list-price assumptions. Microsoft Copilot Chat has no interface a server can call, so an agent cannot run on it." })))));
}
