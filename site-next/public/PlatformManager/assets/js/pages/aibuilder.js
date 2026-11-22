import { h, icon, fmt, pill, copyText, download } from "../dom.js";
import { api } from "../api.js";
import { pageHead, noData } from "./common.js";
import { rate } from "./foundrykit.js";
import { openHowItWorks } from "./howitworks.js";

const EXAMPLES = [
  "When a new item is added to a SharePoint list, post a message to our Teams channel",
  "Every Monday at 8am, email me a summary of open items from an Excel table in OneDrive",
  "When an email with an attachment arrives in a shared mailbox, save the attachment to SharePoint and notify the team",
];

// A server older than the sign-in update has no /api/builder/environments: read the platform data there instead.
const environments = () => api.builderEnvironments().catch((e) => (e.status === 404 ? api.data("platform").then((p) => p?.environments ?? null).catch(() => null) : Promise.reject(e)));

export async function render(ctx) {
  const [envs, ai] = await Promise.all([environments(), api.aiStatus()]);
  const root = h("div", {}, pageHead("AI Builder: Power Platform", "The Power Automate agent: describe a flow in plain language. It drafts the flow for you to review before anything is created.",
    h("button", { class: "btn how", type: "button", onclick: (e) => openHowItWorks("flowbuilder", e.currentTarget) }, icon("flow"), "See how it works")));
  if (!envs) return root.append(noData(ctx, "platform", "Environment list")), root;

  if (!ai.enabled) root.append(h("div", { class: "banner info" }, icon("alert"), "AI is off. Add an ai section (Azure OpenAI endpoint and deployment) to config/powerplatform.json to turn this on."));
  if (ai.demo) root.append(h("div", { class: "banner demo" }, icon("alert"), h("b", { text: "DEMO. " }), "Responses are canned examples, not produced by a model."));
  root.append(h("div", { class: "banner info" }, icon("shield"), "Drafts only. Nothing is deployed from this page yet. When deployment is added it will run as the signed-in maker, so their own Power Platform rights decide which environments and connectors they can use."));

  const env = h("select", { class: "select", "aria-label": "Environment" }, envs.map((e) => h("option", { value: e.id, text: `${e.name} (${e.type})` })));
  const text = h("textarea", { class: "input", maxlength: "2000", placeholder: "What should the flow do? Mention the trigger, the systems involved and who should be notified.", "aria-label": "Describe the flow" });
  const out = h("div", { class: "section" });
  const go = h("button", { class: "btn primary", type: "button", disabled: !ai.enabled }, h("span", { class: "spark" }), "Draft flow");

  go.onclick = async () => {
    go.disabled = true;
    out.replaceChildren(h("div", { class: "loading", text: "Drafting..." }));
    try { const r = await api.generateFlow(text.value, env.value); out.replaceChildren(...[result(r), rate(r.interactionId)].filter(Boolean)); }
    catch (e) { out.replaceChildren(h("div", { class: "banner error", text: e.message })); }
    go.disabled = !ai.enabled;
  };

  root.append(h("div", { class: "card" },
    h("h3", { text: "Describe your flow" }),
    h("div", { class: "toolbar" }, h("label", { class: "muted", text: "Environment" }), env),
    text,
    h("div", { class: "promptchips" }, EXAMPLES.map((x) => h("button", { class: "chip", type: "button", onclick: () => { text.value = x; text.focus(); }, text: x }))),
    h("div", { class: "toolbar" }, go)), out);
  return root;
}

function result(r) {
  const v = r.validation;
  const json = JSON.stringify(r.definition, null, 2);
  const copy = h("button", { class: "btn sm", type: "button", onclick: () => copyText(json, copy) }, icon("copy"), "Copy");
  return h("div", { class: "grid g-2" },
    h("div", { class: "card" }, h("h3", {}, r.name, h("span", { class: "sub", text: `by ${r.provider}` })), h("p", { text: r.summary }),
      h("div", { class: "muted", text: "Trigger" }), h("div", { text: r.trigger }),
      h("div", { class: "muted", style: { marginTop: "10px" }, text: "Steps" }), h("ol", { class: "steps" }, r.steps.map((s) => h("li", { text: s }))),
      h("div", { class: "muted", style: { marginTop: "10px" }, text: "Connectors" }),
      h("div", { class: "chips" }, r.connectors.map((c) => pill(fmt.connector(c) + (r.premiumConnectors.includes(c) ? " (premium)" : ""), r.premiumConnectors.includes(c) ? "warn" : ""))),
      r.assumptions.length ? [h("div", { class: "muted", style: { marginTop: "10px" }, text: "Assumptions" }), h("ul", { class: "steps" }, r.assumptions.map((s) => h("li", { text: s })))] : null,
      r.risks.length ? [h("div", { class: "muted", style: { marginTop: "10px" }, text: "Risks to check" }), h("ul", { class: "steps" }, r.risks.map((s) => h("li", { text: s })))] : null),
    h("div", { class: "card" }, h("h3", {}, "Checks", pill(v.ok ? "structure valid" : "needs fixing", v.ok ? "ok" : "risk")),
      v.errors.map((e) => h("div", { class: "banner error", text: e })), v.warnings.map((w) => h("div", { class: "banner demo", text: w })),
      !v.errors.length && !v.warnings.length ? h("div", { class: "muted", text: "No structural problems found." }) : null,
      h("h3", { style: { marginTop: "14px" } }, "Flow definition", h("span", { class: "sub" }, copy,
        h("button", { class: "btn sm", type: "button", onclick: () => download(r.name.replace(/[^\w-]+/g, "_") + ".json", json, "application/json") }, icon("download"), "Download"))),
      h("pre", { class: "defpre", text: json })));
}
