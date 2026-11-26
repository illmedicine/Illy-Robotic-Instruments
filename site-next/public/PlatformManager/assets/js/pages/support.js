import { h, icon, fmt } from "../dom.js";
import { api } from "../api.js";
import { pageHead } from "./common.js";

// Updates, support and feature requests. Everything else in Platform Manager is free; these three are for paid subscribers.
// The server decides (402 when the Microsoft Store does not show an active subscription); this page only shows the state.

const card = (title, ...kids) => h("div", { class: "card" }, h("h3", { text: title }), ...kids);

const LABEL = { updates: "Product updates", support: "Support requests", "feature-requests": "Feature requests" };

function lockedNote(feature, storeUrl, reason) {
  return h("div", { class: "banner info" }, icon("shield"), h("span", {},
    h("b", { text: `${LABEL[feature]} need a subscription. ` }), reason + " ",
    storeUrl ? h("a", { href: storeUrl, text: "Subscribe in the Microsoft Store" }) : h("span", { text: "Subscribe in the Microsoft Store." })));
}

function textForm(feature, onSent, placeholder) {
  const subject = h("input", { class: "input", placeholder: "Short title", "aria-label": "Title" });
  const detail = h("textarea", { class: "input", rows: "5", placeholder, "aria-label": "Details" });
  const out = h("div", {});
  const send = h("button", { class: "btn primary", type: "button", onclick: async () => {
    out.replaceChildren();
    send.disabled = true;
    try {
      const body = { subject: subject.value, detail: detail.value };
      const rec = feature === "support" ? await api.support(body) : await api.featureRequest(body);
      subject.value = ""; detail.value = "";
      out.replaceChildren(h("div", { class: "banner info", text: `Sent. Reference ${rec.id}. It is kept with your platform team's records.` }));
      onSent?.(rec);
    } catch (e) {
      out.replaceChildren(h("div", { class: "banner error", text: e.message }));
    } finally { send.disabled = false; }
  } }, "Send");
  return h("div", { class: "form" }, subject, detail, send, out);
}

export async function render() {
  const root = h("div", {}, pageHead("Updates & support", "Platform Manager SE Pro is now featured on the Microsoft App Store. Platform Manager is free to use in full, and a Microsoft Store subscription adds official updates, support and feature requests."));
  let sub, up;
  try { sub = await api.subscription(); } catch (e) { return root.append(h("div", { class: "banner error", text: e.message })), root; }
  const paid = sub.tier === "subscriber";
  root.append(h("div", { class: "banner " + (paid ? "info" : "warn") }, icon("shield"), h("span", {},
    h("b", { text: paid ? "Subscribed. " : "Free plan. " }), sub.reason, sub.expires ? ` Renews or ends ${fmt.dt(sub.expires)}.` : "")));

  // Updates: the Store delivers the download; this page says whether there is a newer version.
  const updates = card("Official updates", h("p", { class: "muted", text: `You have version ${sub.version}.` }));
  if (paid) {
    try {
      up = await api.updates();
      updates.append(h("p", { text: up.upToDate ? "You have the latest version." : `Version ${up.latest} is available.` }),
        h("p", { class: "muted", text: up.note }),
        up.storeUrl ? h("a", { class: "btn", href: up.storeUrl, text: "Open in the Microsoft Store" }) : null);
    } catch (e) { updates.append(h("div", { class: "banner error", text: e.message })); }
  } else {
    updates.append(lockedNote("updates", sub.storeUrl, "Searching for and downloading updates is part of the subscription."));
  }

  const support = card("Support", h("p", { class: "muted", text: "Ask for help with the application or a report. Requests are kept with your platform team's records." }));
  if (paid) support.append(textForm("support", null, "What happened, which page, and what you expected."));
  else support.append(lockedNote("support", sub.storeUrl, "Support requests are included in the subscription."));

  const features = card("Feature requests", h("p", { class: "muted", text: "Suggest a change or a new capability. Every request is read by the maintainers." }));
  if (paid) features.append(textForm("feature-requests", null, "The problem you want solved and who would use it."));
  else features.append(lockedNote("feature-requests", sub.storeUrl, "Feature requests are included in the subscription."));

  root.append(h("div", { class: "grid", style: { gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" } }, updates, support), h("div", { class: "section" }, features));
  return root;
}
