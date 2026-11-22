import { h, icon } from "../dom.js";
import { api } from "../api.js";
import { pageHead } from "./common.js";
import { finder } from "./person.js";
import { currentRoute, go as navigate } from "../route.js";
import { viewBlock, personUseHref } from "./productview.js";

export const PRODUCT_TITLE = {
  powerplatform: "Power Platform", powerbi: "Power BI & Fabric", dynamics: "Dynamics 365", sharepoint: "SharePoint", copilot: "Microsoft Copilot", m365: "Microsoft 365",
};
// What each product's lookup shows, so the box says what it will find.
const HELP = {
  powerplatform: "The flows, apps and connectors they own, what they created or edited, failed or blocked attempts and sign-ins.",
  powerbi: "The reports, datasets and workspaces they used, what they refreshed or exported, and failed activity.",
  dynamics: "Their Dynamics 365 sign-ins, the records they touched and anything flagged.",
  sharepoint: "The sites and OneDrives they worked in, what they did there, and sharing changes.",
  copilot: "Their Microsoft 365 Copilot licence and interactions, by app.",
  m365: "Their activity in Teams, Exchange and the other Microsoft 365 apps.",
};
const RESTART = "The running server does not have the per-product lookup yet: restart it to turn it on.";

export function openProduct(product, upn) {
  navigate(personUseHref(product, upn).slice(1));
}

// The lookup that sits on a product's own People pages: it opens that product's view, not the cross-product overview.
export function productSearch(product) {
  return finder(`Find a person: ${PRODUCT_TITLE[product]} activity`, HELP[product], (upn) => openProduct(product, upn));
}

// A plain-English read of one person's Copilot use against their peers, written by the AI model from aggregate numbers only.
function aiCompare(upn) {
  const out = h("div", {});
  const go = h("button", { class: "btn primary", type: "button" }, h("span", { class: "spark" }), "Compare with peers using AI");
  const list = (title, items) => (items.length ? [h("div", { class: "muted", style: { marginTop: "10px" }, text: title }), h("ul", { class: "steps" }, items.map((s) => h("li", { text: s })))] : null);
  go.onclick = async () => {
    go.disabled = true;
    out.replaceChildren(h("div", { class: "loading", text: "Comparing..." }));
    try {
      const r = await api.copilotCompare(upn);
      out.replaceChildren(...[
        r.provider === "demo" ? h("div", { class: "banner demo" }, icon("alert"), h("b", { text: "DEMO. " }), "Canned text, not produced by a model.") : null,
        h("p", { text: r.summary }), list("Ahead of peers", r.strengths), list("Where peers get more from Copilot", r.opportunities),
        r.tips.length ? [h("div", { class: "muted", style: { marginTop: "10px" }, text: "Things to try" }), h("ul", { class: "steps" }, r.tips.map((t) => h("li", {}, h("b", { text: t.title + ": " }), t.how)))] : null,
      ].flat().filter(Boolean));
    } catch (e) { out.replaceChildren(h("div", { class: "banner error", text: e.message })); }
    go.disabled = false;
  };
  api.aiStatus().then((ai) => { if (!ai.enabled) { go.disabled = true; out.replaceChildren(h("div", { class: "banner info" }, icon("alert"), "AI is off. The comparison table above does not need it. Add an ai section to config/powerplatform.json to turn this on.")); } }).catch(() => {});
  return h("div", { class: "card aibox" }, h("h3", { text: "AI comparison with peers" }),
    h("p", { class: "muted", text: "A short coaching read of how this person uses Copilot next to their peers. Only counts and peer medians are sent to the model: no name, address or other person's figures." }),
    h("div", { class: "toolbar" }, go), out);
}

// #personuse/<product>/<upn>: one person inside one product.
export async function page(ctx) {
  const [, product, enc] = currentRoute().split("/");
  const upn = decodeURIComponent(enc || "");
  const admin = !ctx?.me || ctx.me.role === "admin"; // everyone else sees only their own activity, so there is nobody to look up
  if (!PRODUCT_TITLE[product]) return h("div", { class: "banner error", text: "Unknown product." });
  const root = h("div", { class: "person-page" }, admin ? productSearch(product) : null);
  if (!upn) return root;
  let v;
  try {
    v = await api.personProduct(product, upn);
  } catch (e) {
    root.append(h("div", { class: "banner error", text: e.status === 404 && !/No one/.test(e.message) ? RESTART : e.message }));
    return root;
  }
  const w = v.who;
  root.append(pageHead(`${w.name || w.upn}: ${v.title}`, [w.dept, w.upn].filter(Boolean).join(", "),
    h("a", { class: "btn", href: admin ? "#person/" + encodeURIComponent(w.upn) : "#me" }, admin ? "Full profile" : "My overview"),
    h("button", { class: "btn", type: "button", onclick: () => history.back() }, "Back")), viewBlock(v));
  if (product === "copilot" && v.sections.some((s) => s.id === "compare")) root.append(aiCompare(w.upn));
  return root;
}
