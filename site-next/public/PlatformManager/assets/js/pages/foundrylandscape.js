import { h, icon, pill } from "../dom.js";
import { api } from "../api.js";
import { pageHead } from "./common.js";
import { usd, vendorMark } from "./foundrykit.js";
import { story } from "./foundrystory.js";
import { pathCards } from "./foundryspend.js";
import { kpi } from "./foundry.js";
import { currentRoute, replaceRoute } from "../route.js";

// Azure AI Foundry > AI topology. Two animated infographics under one switch:
//   Today:  the scattered landscape of Copilot on the web, the builder Copilots inside each app, the pilots and the E7 proposal. Platform Manager is not in it.
//   Target: Platform Manager as the one governed front door, with department and AD-group access paths, sensitivity labels, Purview and Fabric governance.
// Tenant figures come from /api/foundry/landscape (measured or stated); prices in the target are assumptions.

const lane = (x, y, w, hh, title, tone) => ({ x, y, w, h: hh, title, tone });

function spread(l, items, nh, top = 44) {
  const room = l.h - top - 12, gap = Math.max(8, (room - items.length * nh) / (items.length + 1));
  items.forEach((n, i) => Object.assign(n, { x: l.x + 12, y: l.y + top + gap + i * (nh + gap), w: l.w - 24, h: nh }));
  return items;
}

const WHO = [["p-contracts", "Contract and licence owners", "Renewals, true-ups, tier decisions"], ["p-sites", "Site and app owners", "SharePoint sites, Power Apps, flows"], ["p-analysts", "Power BI and Excel analysts", "Reports, refreshes, flows"],
  ["p-dept", "Department business users", "Everyday questions and drafts"], ["p-admins", "Platform admins", "Licences, usage, governance"]];
const people = (badge) => WHO.map(([id, title, sub]) => ({ id, title, sub, mark: "users", tone: "n", badge, detail: { lines: [sub] } }));

const S = (id, name, kind, summary, steps, compare, tone) => ({ id, name, kind, summary, steps, compare, tone });

// ------------------------------------------------------------------ today

function todaySpec(land) {
  const sp = land.spend, P = sp.available ? sp.paths : null, pp = sp.available ? sp.perPrompt : null, bs = sp.available ? sp.basic : null;
  const line = (path, id) => P && P[path].lines.find((l) => l.id === id);
  const mo = (l) => (l && l.monthly != null ? usd(l.monthly) + " a month" : null);
  const seats = line("today", "seats"), studio = line("today", "studio"), cowork = line("today", "cowork"), e7 = line("e7", "e7");
  const pilot = sp.available ? sp.stated.pilotPerPrompt : 5;
  const V = land.vendors || {}, contractTool = V.contracts || "A bought contract-management tool", consultancy = V.consulting ? `${V.consulting} consulting` : "Outside consultancy";
  const L = [lane(16, 16, 200, 724, "Who asks"), lane(232, 16, 260, 724, "Front doors they reach for"), lane(508, 16, 240, 724, "What runs behind them"),
    lane(764, 16, 260, 724, "Where the work really lands"), lane(1040, 16, 300, 724, "Controls and blind spots", "bad")];
  const nodes = [
    ...spread(L[0], people(), 70),
    ...spread(L[1], [
      { id: "d-copilot", title: "Microsoft 365 Copilot", mark: "copilot", tone: "warn", badge: seats ? { text: `${mo(seats)}, ${sp.people.copilotLicensed} seats${pp ? `, ${pp.seatsBelowBreakEven} below break-even` : ""}`, tone: "warn" } : { text: "licence data not read yet", tone: "bad" },
        detail: { lines: ["Paid per seat. It works on what a person can already open in Microsoft 365, so it knows nothing of our contract terms or catalogue unless they sit in a file that person can open.", pp && pp.allSeats != null ? `A seat costs $${pp.allSeats.toFixed(2)} per prompt on average, and ${pp.seatsIdle} seats show no prompts in the audit period.` : "Prompt counts have not been read yet."], link: { href: "#foundryspend", text: "AI spend" } } },
      { id: "d-web", title: "Copilot Chat on the web", sub: "Free with the work sign-in", mark: "copilotchat", tone: "warn", badge: bs ? { text: `${bs.people} people use it with no seat`, tone: "warn" } : { text: "free, no add-on cost", tone: "warn" },
        detail: { lines: ["The free chat on the web and in Edge. Good for general drafting; it has no private knowledge of our contracts, sites or reports, and nothing keeps what one person works out.", bs ? `${bs.wouldJustifyASeat} of these people use Copilot enough that a seat would pay for itself.` : ""] } },
      { id: "d-builders", title: "Builder Copilots in each app", sub: "Power Automate, Power Apps, SharePoint, Power BI", mark: "microsoft", tone: "bad", badge: { text: "Minimal: suggests steps, rarely finishes an automation", tone: "bad" },
        detail: { lines: ["Each app has its own assistant with its own limits. They describe what to click but do not build, test and deploy an automation end to end, so most people stop using them and ask someone else."] } },
      { id: "d-studio", title: "Copilot Studio agents", mark: "studio", tone: "n", badge: studio && studio.monthly != null ? { text: `${mo(studio)} pay-as-you-go`, tone: "warn" } : { text: "no pay-as-you-go billed", tone: "warn" }, detail: { lines: ["Agents built by makers, billed in Copilot Credits when pay-as-you-go. Each is owned and tuned by whoever built it."] } },
      { id: "d-cowork", title: "Copilot Cowork (pilot)", mark: "cowork", tone: "warn", badge: cowork && cowork.monthly != null ? { text: `${mo(cowork)}: $${pilot} a prompt`, tone: "bad" } : { text: `$${pilot} a prompt; use not seen`, tone: "bad" },
        detail: { lines: [`A pilot, charged at $${pilot} a prompt, so ${Math.ceil((sp.seat ? sp.seat.price : 30) / pilot)} prompts a month cost as much as a Copilot seat.`], link: { href: "#foundryspend", text: "AI spend" } } },
      { id: "d-claude", title: "Claude (pilot)", mark: "claude", tone: "warn", badge: { text: `$${pilot} a prompt; use not measured`, tone: "bad" }, detail: { lines: [`A pilot, priced here like Cowork at about $${pilot} a prompt. Platform Manager has no usage source for it, so its cost is not counted anywhere.`] } },
      { id: "d-e7", title: "Microsoft 365 E7 (an option)", sub: "Copilot, Agent 365 and Entra Suite in one licence", mark: "m365", tone: "warn", badge: e7 ? { text: `+${mo(e7)} if all ${sp.people.e5} E5 users move`, tone: "bad" } : { text: "needs the directory", tone: "warn" },
        detail: { lines: ["The proposal is to move every E5 user to E7. That buys Copilot for everyone whether or not they use it."], link: { href: "#foundryspend", text: "AI spend" } } },
    ], 78),
    ...spread(L[2], [
      { id: "b-graph", title: "Microsoft Graph and semantic index", sub: "What a person can open in Microsoft 365", mark: "graph", tone: "n", detail: { lines: ["Copilot finds grounding here. Only content stored in Microsoft 365 and open to the person is visible to it."] } },
      { id: "b-msmodels", title: "Microsoft-hosted models", sub: "Run and managed by Microsoft", mark: "azureopenai", tone: "n", detail: { lines: ["The model behind Copilot. Microsoft chooses it; the organisation cannot pick a cheaper or better one for a job."] } },
      { id: "b-dataverse", title: "Dataverse and connectors", sub: "Where Studio agents and flows act", mark: "dataverse", tone: "n", detail: { lines: ["Studio agents and Power Automate act through connectors, each with its own licence and data policy."] } },
      { id: "b-fabric", title: "Fabric capacity", sub: "Runs Power BI and Fabric Copilot", mark: "powerbi", tone: "n", detail: { lines: ["Copilot for Power BI and Fabric runs on a Fabric capacity, so its use is charged to capacity rather than to a Copilot seat."] } },
      { id: "b-anthropic", title: "Claude service", sub: "Outside the tenant's AI controls", mark: "claude", tone: "bad", detail: { lines: ["Pilot traffic goes to the Claude service. Confirm the contract terms and data handling before any company data is used."] } },
    ], 70),
    ...spread(L[3], [
      { id: "o-contracts", title: contractTool, sub: "Bought to hold clauses and renewals", mark: vendorMark(V.contracts, "contracttool"), tone: "bad", badge: { text: "cost not collected here", tone: "warn" }, detail: { lines: ["Contract data lives in a bought tool because nothing in house knows the terms."] } },
      { id: "o-consulting", title: consultancy, sub: "Power BI and flow builds", mark: vendorMark(V.consulting, "consultancy"), tone: "bad", badge: { text: "cost not collected here", tone: "warn" }, detail: { lines: ["Departments without the skill pay a vendor to write refreshes and flows, because the in-app assistants do not finish the job."] } },
      { id: "o-manual", title: "Manual spreadsheet work", sub: "Tracking, copying, re-keying", mark: "excel", tone: "n", detail: { lines: ["When AI cannot help, the work lands in spreadsheets, and the knowledge stays in someone's head."] } },
      { id: "o-shadow", title: "Unlogged AI use", sub: "No owner, no limit, no audit", mark: "shadow", tone: "bad", detail: { lines: ["Tools people adopt on their own. Nothing records who used what with which data."] } },
    ], 76),
    ...spread(L[4], [
      { id: "c-purview", title: "Purview labels and DLP", sub: "Set per product; not checked by every AI door", mark: "purview", tone: "warn", detail: { lines: ["Sensitivity labels and DLP exist, but each product applies them its own way, and they do not follow data to a service outside the tenant."] } },
      { id: "c-entra", title: "Entra groups and RBAC", sub: "Departments and AD groups, decided product by product", mark: "entra", tone: "warn", detail: { lines: ["The same person can be allowed into one AI door and not another, because each product reads groups separately."] } },
      { id: "c-fabric", title: "Fabric governance", sub: "Domains and workspace roles govern data, not the AI that reads it", mark: "powerbi", tone: "warn", detail: { lines: ["Fabric domains, workspace roles and lineage apply to people and items, not to the assistants that read them."] } },
      { id: "g-learning", title: "Nothing learned is kept", sub: "Each person starts from a blank chat.", mark: "shadow", tone: "bad", detail: { lines: ["No shared memory: the next person asks the same question again."] } },
      { id: "g-cost", title: "No view of use or cost per task", sub: "Seats, per-prompt pilots and vendor invoices sit in different places.", mark: "cost", tone: "bad", detail: { lines: ["Seats, per-prompt pilots and an E7 uplift are priced in three different ways."], link: { href: "#foundryspend", text: "AI spend" } } },
      { id: "g-gov", title: "No single owner of AI settings", sub: "Model, knowledge, who may use it and how much: decided in every product.", mark: "shadow", tone: "bad", detail: { lines: ["No registry of agents, limits or approvals."] } },
    ], 96),
  ];
  const scenarios = [
    S("renew", "Renew a Microsoft agreement", "Contracts", "A contract owner needs a renewal position. Nothing in house holds the terms, so the work goes to spreadsheets and a bought tool.", [
      { t: "Asks Copilot Chat on the web", d: "It answers in general terms. It has not seen our agreement, tiers or past decisions.", path: ["p-contracts", "d-web", "b-msmodels"] },
      { t: "Falls back to spreadsheets", d: "The real analysis happens by hand in Excel.", path: ["b-msmodels", "o-manual"], bad: true },
      { t: "A contract tool is bought", d: `${contractTool} holds the clauses and dates, for a licence fee.`, path: ["o-manual", "o-contracts"], bad: true },
      { t: "Nothing is learned", d: "What the owner works out is not kept anywhere an AI can use it next time.", path: ["o-contracts", "g-learning"], bad: true }],
    [{ label: "Today", tone: "bad", text: "Terms in files and a bought tool; every renewal starts again." }], "bad"),
    S("flow", "Automate a Power BI refresh", "Builders", "An analyst asks the builder Copilot in Power Automate for a scheduled refresh with an alert. It explains the steps but does not build them.", [
      { t: "Asks the builder Copilot", d: "It suggests which connectors and steps to use, then leaves the building, testing and deploying to the person.", path: ["p-analysts", "d-builders", "b-dataverse"] },
      { t: "The person gives up on it", d: "Without the skill, a vendor request goes out.", path: ["b-dataverse", "o-consulting"], bad: true },
      { t: "Nobody sees the cost of the task", d: "The invoice sits in a department budget, apart from every other AI cost.", path: ["o-consulting", "g-cost"], bad: true }],
    [{ label: "Today", tone: "bad", text: "Outside consulting for work an agent can draft and test." }], "bad"),
    S("site", "Build a SharePoint site", "Builders", "A site owner asks the SharePoint Copilot for a site with libraries and permissions, and gets generic advice.", [
      { t: "Asks the SharePoint Copilot", d: "It handles simple page content but not provisioning or permission design.", path: ["p-sites", "d-builders", "b-graph"] },
      { t: "Tries another AI tool alone", d: "The owner pastes the question into an unmanaged tool.", path: ["b-graph", "o-shadow"], bad: true },
      { t: "No owner of the rules", d: "Nobody decided which tool or which data is allowed.", path: ["o-shadow", "g-gov"], bad: true }],
    [{ label: "Today", tone: "bad", text: "Built-in assistant too weak, so people go round it." }], "bad"),
    S("labels", "Ask about a labelled document", "Controls", "A person asks Copilot on the web about a document with a sensitivity label. The label is a Purview control that not every door checks.", [
      { t: "Asks about a document", d: "A user in one department asks Copilot Chat about a file shared by another.", path: ["p-dept", "d-web", "b-graph"] },
      { t: "Each product reads groups its own way", d: "What the person may open depends on how that product reads Entra groups.", path: ["b-graph", "c-entra"], bad: true },
      { t: "Labels are checked where the product checks them", d: "Purview labels and DLP apply in Microsoft 365, but not to a pilot service outside the tenant.", path: ["c-entra", "c-purview"], bad: true },
      { t: "Fabric data is governed separately", d: "Workspace roles and domains do not follow the data into an AI answer.", path: ["c-purview", "c-fabric"], bad: true }],
    [{ label: "Today", tone: "bad", text: "Departments, groups and labels are enforced product by product." }], "warn"),
    S("claude", "Try Claude on a task", "Pilot", `Someone tests Claude on company material at about $${pilot} a prompt. It may be a good answer; it is also outside any shared setting.`, [
      { t: "Opens Claude", d: "A person signs in to the pilot with a work address.", path: ["p-dept", "d-claude", "b-anthropic"] },
      { t: "Company data may go outside", d: "Unless the pilot's terms are confirmed, the material leaves the tenant's controls, and labels do not follow it.", path: ["b-anthropic", "c-purview"], bad: true },
      { t: "No record or limit", d: "There is no registry entry, no cost limit and no way to compare it with Copilot.", path: ["c-purview", "g-gov"], bad: true }],
    [{ label: "Today", tone: "bad", text: "Pilots run apart from governance, so results cannot be compared." }], "warn"),
    S("e7", "Decide on E7", "Spend", "Administrators weigh an E7 upgrade for every E5 user against seats and per-prompt pilots that are priced in different ways.", [
      { t: "The E7 proposal", d: `E7 would give every E5 user Copilot${e7 ? `, at about +${mo(e7)}` : ""}.`, path: ["p-admins", "d-e7", "d-copilot"] },
      { t: "Pilots are priced per prompt", d: `Cowork and Claude cost about $${pilot} a prompt, but their use is not collected in one place.`, path: ["d-copilot", "d-cowork", "g-cost"], bad: true },
      { t: "Nobody owns the settings", d: "Whether a person gets Copilot, a pilot or nothing is decided product by product.", path: ["g-cost", "g-gov"], bad: true }],
    [{ label: "Today", tone: "warn", text: "A licence upgrade chosen without a single view of use and cost." }], "warn"),
  ];
  return { id: "today", width: 1356, height: 840, hint: "Each story follows one real piece of work through the AI we have today.", label: "Today's scattered AI landscape: who asks, Copilot on the web and in the builders, what runs behind them, where the work lands, and the controls that are not joined up",
    lanes: L, nodes, scenarios, intro: "Pick a story to watch how a real piece of work moves through the AI we have today: which front door a person tries, what runs behind it, where the work lands and which controls are not joined up. Click any box for what it is and what it costs." };
}

// ------------------------------------------------------------------ target

function targetSpec(land) {
  const sp = land.spend, P = sp.available ? sp.paths : null;
  const ready = (id) => (land.models.find((m) => m.id === id) || {}).status === "ready";
  const live = { text: "Live today", tone: "good" }, needs = { text: "Needs the Foundry connection", tone: "warn" };
  const L = [lane(16, 16, 190, 700, "Who asks"), lane(222, 16, 230, 700, "One governed front door"), lane(468, 16, 410, 700, "Foundry agents: tuned, taught and counted"), lane(894, 16, 200, 700, "Models for the job"),
    lane(1110, 16, 190, 700, "Knowledge and data"), lane(1316, 16, 190, 700, "What it changes"), lane(222, 732, 1284, 138, "Governance on every call")];
  const agentNode = (g, x, i) => ({ id: "a-" + g.id, x, y: 130 + i * 74, w: 190, h: 66, title: g.name, agent: g, learning: g.learning, tone: "good", badge: { text: `${g.usage.people} people, ${g.usage.requests} asks`, tone: "" },
    detail: { lines: [`${g.kind} agent for ${g.product}. Knowledge held: ${g.learning.percent}% (${g.learning.level}).`], link: { href: "#foundryagents/" + g.id, text: "Administer this agent" } } });
  const a = land.agents, left = a.slice(0, 7), right = a.slice(7);
  const door = (id, y, hh, title, sub, mk, badge, lines, link) => ({ id, x: 234, y, w: 206, h: hh, title, sub, mark: mk, tone: "good", badge, detail: { lines, link } });
  const nodes = [
    ...spread(L[0], people({ text: "Entra department and AD group", tone: "" }), 70),
    door("t-door", 62, 130, "Platform Manager", "One sign-in, and an agent for every product in one place", "ppm", live, ["Everyone reaches the agents through one door. Every request is counted and every setting change is in the audit trail."], { href: "#foundryoverview", text: "Agent overview" }),
    door("t-g-entra", 206, 96, "Departments and AD security groups", "RBAC path: who may call which agent", "entra", { text: "Roles live; group mapping planned", tone: "warn" },
      ["A person's Entra department and AD security groups decide which agents they may call, which knowledge pools those agents may read and which model tier they run on. Admin, Contracts and User roles gate the agents today; mapping departments and groups needs the Foundry connection."]),
    door("t-g-purview", 316, 96, "Sensitivity labels and DLP", "Purview: the label travels with the data", "purview", needs,
      ["Retrieval returns only passages whose label the person's group may read, DLP checks the draft before it is shown, and Purview records the interaction. An agent never quotes a document the person could not open."]),
    door("t-copilot", 426, 96, "Microsoft 365 Copilot", "Premium seats only where use pays for one", "copilot", P && P.seatsKept != null ? { text: `${P.seatsKept} seats kept`, tone: "good" } : undefined,
      ["Copilot stays where it is strongest: inside Word, Outlook and Teams. Seats are limited to the people whose use pays for one, and everyone stays on E5."], { href: "#foundryspend", text: "AI spend" }),
    door("t-chat", 536, 80, "Copilot Chat (free)", "General questions", "copilotchat", undefined, ["Still available for general questions. Work that needs our own knowledge goes to an agent."]),
    { id: "t-router", x: 480, y: 56, w: 386, h: 58, title: "Agent router and registry", sub: "Foundry Agent Service: who may call which agent, on which model", mark: "foundry", tone: "good", badge: { text: "Registry live; routing in Platform Manager today", tone: "good" },
      detail: { lines: ["Every agent has an owner, a model, knowledge, live data sources and a daily limit, set on the Agent administration page. Foundry Agent Service takes over hosting once the connection is made."], link: { href: "#foundryagents", text: "Agent administration" } } },
    ...left.map((g, i) => agentNode(g, 480, i)), ...right.map((g, i) => agentNode(g, 680, i)),
    ...spread(L[3], [
      { id: "t-qwen", title: "Qwen 2.5 7B (local)", sub: "Free, runs on this server", mark: "local", tone: "good", badge: ready("qwen2.5:7b-instruct") ? { text: "Ready", tone: "good" } : { text: "Ollama not answering", tone: "warn" }, detail: { lines: ["Routine drafting and anything that must not leave the server."] } },
      { id: "t-mini", title: "GPT-4o mini (Azure)", sub: "Low-cost cloud model", mark: "azureopenai", tone: "n", badge: ready("gpt-4o-mini") ? { text: "Ready", tone: "good" } : { text: "Needs an Azure deployment", tone: "warn" }, detail: { lines: ["For routine drafting that needs more than a 7B model."] } },
      { id: "t-large", title: "GPT-4o / GPT-4.1 (Azure)", sub: "Stronger cloud model", mark: "azureopenai", tone: "n", badge: ready("gpt-4o") ? { text: "Ready", tone: "good" } : { text: "Needs an Azure deployment", tone: "warn" }, detail: { lines: ["Long documents and careful analysis, used only where an agent is set to it."] } },
      { id: "t-claude", title: "Claude in Foundry", sub: "Planned model choice", mark: "claude", tone: "n", badge: { text: "Planned", tone: "warn" }, detail: { lines: ["Claude is offered in the Foundry model catalogue, so the pilot can move behind the same groups, labels, limits and logging as every other model, paid by the token instead of per prompt."] } },
    ], 72),
    ...spread(L[4], [
      { id: "t-kb", title: "Per-agent knowledge pools", sub: "Word, PDF, Excel, CSV, PowerPoint, images", mark: "search", tone: "good", badge: live, detail: { lines: ["Each agent has its own pool. What people rate useful is added to it, so the agent improves with use."], link: { href: "#foundryagents", text: "Build knowledge" } } },
      { id: "t-dv", title: "Dataverse", sub: "Power Platform inventory", mark: "dataverse", tone: "n", badge: live, detail: { lines: ["Agents read counts and types from the inventory Platform Manager already collects."] } },
      { id: "t-graph", title: "Microsoft Graph and Entra", sub: "Licences, directory, sign-ins", mark: "graph", tone: "n", badge: live, detail: { lines: ["Counts only, never names, unless an administrator allows personal data."] } },
      { id: "t-fabric", title: "Fabric and OneLake", sub: "Domains, workspace roles, lineage", mark: "powerbi", tone: "n", badge: needs, detail: { lines: ["Agents that read Fabric and Power BI data use the same domains and workspace roles as people, and the sensitivity labels on items come with the data."] } },
    ], 72),
    ...spread(L[5], [
      { id: "o-saved1", title: "Contract work in house", sub: "Briefs and checklists from the Contract Renewal Agent", mark: "saving", tone: "good", badge: { text: "outside spend not collected here", tone: "warn" }, detail: { lines: ["The agent works from the agreements and decisions uploaded to it, so renewals stop starting from a blank page."] } },
      { id: "o-saved2", title: "Flows, reports and sites in house", sub: "Drafts for an owner to review", mark: "saving", tone: "good", badge: { text: "outside spend not collected here", tone: "warn" }, detail: { lines: ["Departments without the skill get a tested draft instead of an outside statement of work."] } },
      { id: "o-saved3", title: "Copilot seats follow use", sub: "Premium only where it pays for itself", mark: "saving", tone: "good", badge: P && P.seatsKept != null ? { text: `${P.seatsReclaimed} reclaimed, ${P.seatsAdded} added`, tone: "good" } : { text: "needs audit data", tone: "warn" },
        detail: { lines: ["Seats are reclaimed from people whose use does not pay for one and given to people on free Copilot Chat whose use does."], link: { href: "#foundryspend", text: "AI spend" } } },
      { id: "o-saved4", title: "Everyone stays on E5", sub: "No E7 uplift", mark: "saving", tone: "good", badge: P ? { text: `${usd(P.savingVsE7)} a month against E7 (estimate)`, tone: P.savingVsE7 >= 0 ? "good" : "warn" } : { text: "needs the directory", tone: "warn" },
        detail: { lines: ["Pilots and every other agent run through Foundry, paid by the token."], link: { href: "#foundryspend", text: "AI spend" } } },
    ], 96),
    ...["t-g-safety|Content safety and prompt shields|Checked on every call|safety", "t-g-gw|AI gateway: token quotas|Budget per agent; cheapest model that fits|gateway", "t-g-trace|Tracing and evaluations|Score answers against test cases|trace",
      "t-g-dspm|Purview DSPM for AI and audit|Every AI interaction discoverable|purview", "t-g-audit|Audit and cost view|Requests counted by agent and person|cost"].map((s, i) => {
      const [id, title, sub, mk] = s.split("|"), isLive = id === "t-g-audit";
      return { id, x: 240 + i * 252, y: 770, w: 240, h: 86, title, sub, mark: mk, tone: "good", badge: isLive ? live : needs, detail: { lines: [isLive ? "Already running in Platform Manager." : "Part of Microsoft Foundry and Purview. It switches on when the Foundry connection is added to the configuration; nothing here claims it is running yet."] } };
    }),
  ];
  const front = ["p-contracts", "t-door"], gate = ["t-door", "t-g-entra", "t-router"];
  const scenarios = [
    S("renew", "Renew a Microsoft agreement", "Contracts", "The same renewal, now through the Contract Renewal Agent that holds our agreements, price lists and past decisions, behind the department and label gates.", [
      { t: "One sign-in", d: "The owner signs in with Entra.", path: front },
      { t: "Department and AD group decide", d: "Her department and security groups say she may use the Contract Renewal Agent, and the router hands the request to it.", path: [...gate, "a-contracts"] },
      { t: "It reads what it has been taught", d: "It searches the agreements, tier decisions and negotiation notes admins uploaded, and the uploaded workbooks.", path: ["a-contracts", "t-kb"] },
      { t: "Labels filter what comes back", d: "Only passages whose sensitivity label her groups may read are used, and DLP checks the draft.", path: ["t-kb", "t-g-purview"] },
      { t: "The right-size model drafts", d: "Routine drafting runs on the free local model; a long negotiation brief can run on a stronger one.", path: ["a-contracts", "t-qwen"] },
      { t: "Checked, counted and logged", d: "Content checks, then the request is counted by agent and person.", path: ["t-qwen", "t-g-safety", "t-g-audit"] },
      { t: "A brief the owner reviews", d: "Work that was bought from outside is drafted in house, and the owner rates the answer so the agent learns.", path: ["t-g-audit", "o-saved1"] }],
    [{ label: "Today", tone: "bad", text: "Spreadsheets and a bought tool." }, { label: "With Foundry", tone: "good", text: "A reviewed brief in minutes, from our own contract knowledge." }], "good"),
    S("flow", "Automate a Power BI refresh", "Builders", "The analyst asks the Flow Builder, which reads the live environment inventory, tests the flow and asks before anything goes to production.", [
      { t: "One sign-in", d: "The analyst signs in; the builder agents are open to their role.", path: ["p-analysts", "t-door"] },
      { t: "Group check, then the Flow Builder", d: "Their AD group allows the Flow Builder, and the router sends the request to it.", path: [...gate, "a-flowbuilder"] },
      { t: "It reads the environment", d: "It sees which environments, connectors and policies exist, as counts, so the draft fits the estate.", path: ["a-flowbuilder", "t-dv"] },
      { t: "Drafted on the local model", d: "A definition comes back, checked for structure and risky patterns.", path: ["a-flowbuilder", "t-qwen"] },
      { t: "Counted and logged", d: "The request is counted; the owner reviews, tests and deploys it as themselves.", path: ["t-qwen", "t-g-audit", "o-saved2"] }],
    [{ label: "Today", tone: "bad", text: "An in-app assistant that explains, then a vendor request." }, { label: "With Foundry", tone: "good", text: "A tested draft in minutes; the owner approves and deploys." }], "good"),
    S("site", "Build a SharePoint site", "Builders", "The SharePoint Agent knows our standards, because an admin uploaded them, and honours the labels on what it reads.", [
      { t: "One sign-in", d: "The site owner signs in once.", path: ["p-sites", "t-door"] },
      { t: "Group check, then the SharePoint Agent", d: "Their department group allows the agent.", path: [...gate, "a-sharepoint"] },
      { t: "It checks our standards", d: "Site naming, owner and retention rules uploaded to the agent are found and used.", path: ["a-sharepoint", "t-kb"] },
      { t: "Labels applied to the new site", d: "The draft applies the default sensitivity label the department's standard requires.", path: ["t-kb", "t-g-purview"] },
      { t: "Drafted and traced", d: "The PnP script comes back with its permissions and risks; the run is traced.", path: ["a-sharepoint", "t-qwen", "t-g-trace", "o-saved2"] }],
    [{ label: "Today", tone: "bad", text: "A generic answer, then an unmanaged tool." }, { label: "With Foundry", tone: "good", text: "A script that follows our standards and labels." }], "good"),
    S("fabric", "Build a Power BI report on Fabric data", "Fabric", "The Power BI and Fabric agent reads workspace metadata under the person's own workspace role and the Fabric domain.", [
      { t: "One sign-in", d: "An analyst signs in.", path: ["p-analysts", "t-door"] },
      { t: "Group check, then the Power BI agent", d: "Their AD group allows the agent.", path: [...gate, "a-powerbi"] },
      { t: "It reads Fabric under their role", d: "Fabric domains and workspace roles limit what the agent can see, exactly as they limit the person.", path: ["a-powerbi", "t-fabric"] },
      { t: "Labels come with the data", d: "The sensitivity label on the semantic model is carried into the draft and checked by Purview.", path: ["t-fabric", "t-g-purview"] },
      { t: "Drafted within budget", d: "The DAX and model changes are drafted on a low-cost model within the agent's token budget.", path: ["a-powerbi", "t-mini", "t-g-gw", "o-saved2"] }],
    [{ label: "Today", tone: "bad", text: "Fabric governance covers the data, not the AI that reads it." }, { label: "With Foundry", tone: "good", text: "The agent obeys the same domains and roles as the person." }], "good"),
    S("access", "A request the person may not make", "Access paths", "Two requests from one person: one blocked by their department group, one limited by a sensitivity label.", [
      { t: "One sign-in", d: "A business user in a department signs in.", path: ["p-dept", "t-door"] },
      { t: "Not in the group", d: "The Contract Renewal Agent is not offered to this department's AD group, so the request stops at the gate. This is the control working.", path: ["t-door", "t-g-entra"], bad: true },
      { t: "An agent they may use", d: "The SharePoint Agent is open to their group.", path: ["t-g-entra", "t-router", "a-sharepoint"] },
      { t: "A Confidential file is withheld", d: "Retrieval finds a Confidential file, but its label is above what the department's group may read, so it is left out.", path: ["a-sharepoint", "t-kb", "t-g-purview"], bad: true },
      { t: "The attempt is recorded", d: "Purview records both attempts for the security team.", path: ["t-g-purview", "t-g-dspm"] }],
    [{ label: "Today", tone: "bad", text: "Each product decides separately." }, { label: "With Foundry", tone: "good", text: "One group and label policy applied at the front door and on retrieval." }], "good"),
    S("seats", "Right-size Copilot seats", "Spend", "The Governance Insights agent reads licence counts and prompt counts and says where a seat does and does not pay for itself.", [
      { t: "An admin asks", d: "An administrator opens the insights.", path: ["p-admins", "t-door"] },
      { t: "Routed to Governance Insights", d: "The agent for savings takes the request.", path: [...gate, "a-insights"] },
      { t: "It reads licence counts", d: "Counts of licences and prompts from Entra and the audit log: no names.", path: ["a-insights", "t-graph"] },
      { t: "Drafted, then limited", d: "The agent drafts the actions; the gateway keeps its tokens within budget.", path: ["a-insights", "t-mini", "t-g-gw"] },
      { t: "Seats follow use, E5 stays", d: "Seats move to the people whose use pays for one, and no E7 uplift is bought.", path: ["t-g-gw", "o-saved3", "o-saved4"] }],
    [{ label: "Today", tone: "bad", text: "Seats are bought and forgotten; E7 would buy more." }, { label: "With Foundry", tone: "good", text: "A ranked list of seats to move, with the saving." }], "good"),
    S("claude", "Evaluate a new model such as Claude", "Governed pilot", "A pilot model is tried behind the same groups, labels, budget and tests as everything else.", [
      { t: "An admin chooses the model", d: "On the Agent administration page the model is picked per agent.", path: ["p-admins", "t-door", "t-router"] },
      { t: "Quotas first", d: "The gateway sets a token budget before any traffic, so a pilot is paid by the token, not by the prompt.", path: ["t-router", "t-g-gw", "t-claude"] },
      { t: "Scored against test cases", d: "Foundry evaluations compare it with the model in use.", path: ["t-claude", "t-g-trace"] },
      { t: "Every interaction is discoverable", d: "Purview records the pilot's interactions like any other.", path: ["t-g-trace", "t-g-dspm"] }],
    [{ label: "Today", tone: "bad", text: "Pilots run alone, billed per prompt, and cannot be compared." }, { label: "With Foundry", tone: "good", text: "Every model is tried under the same budget, labels and tests." }], "good"),
  ];
  return { id: "target", width: 1522, height: 958, hint: "Each story follows the same work through one governed front door and a specialist agent.", label: "Target: one governed front door with department and AD-group access paths, sensitivity labels, tuned and taught Foundry agents, a choice of models, private knowledge, and Purview and Fabric governance",
    lanes: L, nodes, scenarios, intro: "Pick a story to watch the same work move through one governed front door, the department and AD-group gate, the label check and a specialist agent. Boxes marked Live today already run in Platform Manager; the others need the Foundry connection." };
}

// ------------------------------------------------------------------ panels

function capabilities(land) {
  return h("div", {}, h("h2", { text: "What this adds" }),
    h("div", { class: "fcaps" }, land.capabilities.map((c) => h("div", { class: "card fcap" },
      h("h4", {}, c.title, pill(c.live ? "Live now" : "Needs the Foundry connection", c.live ? "ok" : "warn")),
      h("div", { class: "fcap-row bad" }, h("small", { text: "Today" }), h("p", { text: c.today })),
      h("div", { class: "fcap-row good" }, h("small", { text: "With Foundry" }), h("p", { text: c.target }))))));
}

function todaySummary(land) {
  const sp = land.spend;
  if (!sp.available) return h("div", { class: "banner info" }, icon("alert"), sp.why);
  const l = (id) => sp.paths.today.lines.find((x) => x.id === id), seats = l("seats"), pp = sp.perPrompt, bs = sp.basic;
  return h("div", {}, h("div", { class: "grid g-kpi" },
    kpi("Copilot seats, a month", usd(seats.monthly), `${sp.people.copilotLicensed} seats${pp ? `; ${pp.seatsBelowBreakEven} are below break-even` : ""}`),
    kpi("People on free Copilot Chat", bs ? String(bs.people) : "-", bs ? `${bs.wouldJustifyASeat} use it enough to justify a seat` : "needs audit data"),
    kpi("E7 for every E5 user, a month", usd(sp.paths.e7.lines[0].monthly), "on top of what E5 costs now"),
    kpi("Pilots, per prompt", `$${sp.stated.pilotPerPrompt}`, "Cowork and Claude pilots")),
  h("div", { class: "toolbar" }, h("a", { class: "btn primary", href: "#foundryspend" }, "See the spend landscapes")));
}

export async function render() {
  const land = await api.foundry.landscape();
  const tabs = [{ id: "today", label: "Today: the scattered landscape", sub: "Copilot on the web, the in-app builders, the pilots and the E7 proposal" }, { id: "target", label: "Target: governed Foundry strategy", sub: "one front door, department and label gates, tuned agents, spend and capabilities" }];
  const panes = {}, stories = {};
  const sw = h("div", { class: "seg topo-switch", role: "tablist", "aria-label": "Landscape" });
  stories.today = story(todaySpec(land));
  stories.target = story(targetSpec(land));
  panes.today = h("div", {}, stories.today.el, h("div", { class: "section" }, todaySummary(land)));
  panes.target = h("div", {}, stories.target.el,
    h("div", { class: "section" }, h("h2", { text: "What it costs, a month" }), land.spend.available ? pathCards(land.spend) : h("div", { class: "banner info" }, icon("alert"), land.spend.why)),
    h("div", { class: "section" }, capabilities(land)));

  function show(id, init) {
    tabs.forEach((t, i) => { sw.children[i].setAttribute("aria-pressed", String(t.id === id)); sw.children[i].setAttribute("aria-selected", String(t.id === id)); panes[t.id].hidden = t.id !== id; });
    Object.entries(stories).forEach(([k, s]) => { if (k !== id) s.stop(); });
    setTimeout(() => stories[id].start(), 80); // a story only plays while it is on screen, and the page may not be attached yet
    if (!init) replaceRoute("foundrytopology/" + id);
  }
  tabs.forEach((t) => sw.append(h("button", { type: "button", role: "tab", "aria-pressed": "false", onclick: () => show(t.id) }, h("b", { text: t.label }), h("small", { text: t.sub }))));
  const view = h("div", { class: "topo ftopo" },
    pageHead("AI topology", "How AI is used here today, and the governed Foundry strategy that replaces it, including department and AD-group access paths, sensitivity labels, Purview and Fabric governance."),
    land.ai.demo ? h("div", { class: "banner demo" }, icon("alert"), h("b", { text: "DEMO. " }), "Usage figures are sample data.") : null,
    sw, panes.today, panes.target);
  show((currentRoute().split("/")[1] || "today") === "target" ? "target" : "today", true);
  return view;
}
