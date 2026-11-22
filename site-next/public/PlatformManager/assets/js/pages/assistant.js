import { h, icon, pill, copyText, download } from "../dom.js";
import { api } from "../api.js";
import { pageHead } from "./common.js";
import { rate } from "./foundrykit.js";
import { openHowItWorks } from "./howitworks.js";

// One AI Builder agent per product. Each is a specialist: the server gives it that product's tools, languages and good practice.
const AGENTS = {
  contracts: {
    title: "Contract Renewal Agent", name: "Contract Renewal Agent",
    does: "Drafts renewal briefs, negotiation points, checklists and comparison tables from the agreements, price lists, decisions and workbooks it has been taught. It says so when what it holds does not cover your question.",
    ask: "What do you need for the renewal? Name the agreement, the products and tiers, and what you have to decide.",
    examples: ["A one-page renewal brief for our Microsoft Enterprise Agreement with the points to negotiate", "Which licence tiers could we reduce at renewal and what should we check first?", "A checklist of the clauses to confirm before we sign the renewal"],
  },
  m365: {
    title: "AI Builder: Microsoft 365", name: "Microsoft 365 agent",
    does: "Drafts PowerShell for Entra users and licences, Exchange Online, Teams and the audit log, using the Microsoft Graph PowerShell SDK with explicit permission scopes.",
    ask: "What do you need to find out or change? Name the people, licences, teams or mailboxes involved.",
    examples: ["List enabled users who have not signed in for 90 days, with their licences", "Find mailboxes over 40 GB and show their owners", "Report every Teams team with no owner"],
  },
  powerbi: {
    title: "AI Builder: Power BI & Fabric", name: "Power BI and Fabric agent",
    does: "Drafts DAX measures, Power Query (M) steps, and PowerShell or REST calls for the Power BI and Fabric admin APIs, saying which workspace role or admin right each needs.",
    ask: "What should the measure, query or script do? Name the tables, columns, workspace or dataset you have.",
    examples: ["A year-to-date and prior-year revenue measure for a Sales table with a Date table", "Power Query steps that keep only the last 90 days and fold back to SQL", "List datasets whose last refresh failed in a workspace"],
  },
  dynamics: {
    title: "AI Builder: Dynamics 365", name: "Dynamics 365 agent",
    does: "Drafts Dataverse Web API queries, FetchXML and pac CLI steps for Dynamics 365, with narrow column lists and the security role each call needs.",
    ask: "What data or setup do you need? Name the tables (accounts, cases, opportunities...) and the filters.",
    examples: ["Open cases for one account, newest first", "FetchXML for opportunities closing this quarter with their owner", "List the security roles of one user"],
  },
  sharepoint: {
    title: "AI Builder: SharePoint", name: "SharePoint agent",
    does: "Drafts PnP.PowerShell and SharePoint Online Management Shell scripts, Graph site queries, KQL search and column or view formatting JSON, preferring group permissions over item-level ones.",
    ask: "What should happen in SharePoint? Name the site, library or list and who should have access.",
    examples: ["List sites with no change in a year and their owners", "Column formatting JSON that shows a red pill when a due date has passed", "Create a team site with a documents library and a read-only visitors group"],
  },
  copilot: {
    title: "AI Builder: Microsoft Copilot", name: "Microsoft Copilot agent",
    does: "Drafts licence and adoption scripts for Microsoft 365 Copilot, declarative agent manifests and Copilot Studio agent designs, with data-readiness and responsible-AI risks called out.",
    ask: "What do you want to measure, assign or build? For an agent, say who it is for and what it should know.",
    examples: ["Find Copilot licence holders with no interaction in 30 days", "A declarative agent that answers HR policy questions from one SharePoint site", "Design a Copilot Studio agent for claims status questions"],
  },
};
const EXT = { powershell: "ps1", dax: "dax", m: "pq", odata: "txt", fetchxml: "xml", kql: "kql", json: "json", text: "txt" };

export function page(product) {
  const a = AGENTS[product];
  return async () => {
    const ai = await api.aiStatus();
    const root = h("div", {}, pageHead(a.title, `The ${a.name} drafts for you to review. Nothing is run or deployed from this page.`,
      h("button", { class: "btn how", type: "button", onclick: (e) => openHowItWorks(product, e.currentTarget) }, icon("flow"), "See how it works")));
    if (!ai.enabled) root.append(h("div", { class: "banner info" }, icon("alert"), "AI is off. Add an ai section (Azure OpenAI endpoint and deployment) to config/powerplatform.json to turn this on."));
    if (ai.demo) root.append(h("div", { class: "banner demo" }, icon("alert"), h("b", { text: "DEMO. " }), "Responses are canned examples, not produced by a model."));
    root.append(h("div", { class: "banner info" }, icon("shield"), "Drafts only. You copy the result and run it yourself, with your own rights. Scripts that change things are flagged, and nothing here connects to your tenant."));

    const text = h("textarea", { class: "input", maxlength: "2000", placeholder: a.ask, "aria-label": "Describe what you need" });
    const out = h("div", { class: "section" });
    const go = h("button", { class: "btn primary", type: "button", disabled: !ai.enabled }, h("span", { class: "spark" }), "Draft");
    go.onclick = async () => {
      go.disabled = true;
      out.replaceChildren(h("div", { class: "loading", text: "Drafting..." }));
      try { out.replaceChildren(result(await api.assist(product, text.value))); }
      catch (e) { out.replaceChildren(h("div", { class: "banner error", text: e.message })); }
      go.disabled = !ai.enabled;
    };
    root.append(h("div", { class: "card" }, h("h3", { text: `About the ${a.name}` }), h("p", { class: "muted", text: a.does }), text,
      h("div", { class: "promptchips" }, a.examples.map((x) => h("button", { class: "chip", type: "button", onclick: () => { text.value = x; text.focus(); }, text: x }))),
      h("div", { class: "toolbar" }, go)), out);
    return root;
  };
}

function list(title, items) {
  return items.length ? [h("div", { class: "muted", style: { marginTop: "10px" }, text: title }), h("ul", { class: "steps" }, items.map((s) => h("li", { text: s })))] : null;
}

function artifact(a, name) {
  const copy = h("button", { class: "btn sm", type: "button", onclick: () => copyText(a.code, copy) }, icon("copy"), "Copy");
  const file = `${(name || "draft").replace(/[^\w-]+/g, "_")}-${a.title.replace(/[^\w-]+/g, "_")}.${EXT[a.language] || "txt"}`;
  return h("div", { class: "card" }, h("h3", {}, a.title, h("span", { class: "sub" }, pill(a.language), copy,
    h("button", { class: "btn sm", type: "button", onclick: () => download(file, a.code, "text/plain") }, icon("download"), "Download"))),
  h("pre", { class: "defpre", text: a.code }));
}

function result(r) {
  const v = r.validation;
  return h("div", {},
    h("div", { class: "grid g-2" },
      h("div", { class: "card" }, h("h3", {}, r.name, h("span", { class: "sub", text: `by ${r.provider}` })), h("p", { text: r.summary }),
        list("Permissions it needs", r.permissions), list("Steps", r.steps), list("Assumptions", r.assumptions), list("Risks to check", r.risks)),
      h("div", { class: "card" }, h("h3", {}, "Checks", pill(v.warnings.length ? `${v.warnings.length} to review` : "nothing flagged", v.warnings.length ? "warn" : "ok")),
        v.warnings.map((w) => h("div", { class: "banner demo", text: w })),
        !v.warnings.length ? h("div", { class: "muted", text: "No risky patterns found. Still read it before you run it." }) : null)),
    r.artifacts.map((a) => artifact(a, r.name)),
    rate(r.interactionId));
}
