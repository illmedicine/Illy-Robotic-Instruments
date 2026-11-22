import { h, icon, fmt, pill } from "../dom.js";
import { api } from "../api.js";
import { pageHead } from "./common.js";

const TONE_PILL = { ok: ["In place", "ok"], warn: ["Gap", "warn"], risk: ["Not in place", "risk"] };
const EVENT = { signin: "Signed in", signout: "Signed out" };

const card = (title, ...kids) => h("div", { class: "card" }, h("h3", { text: title }), ...kids);
const table = (cols, rows) => h("table", { class: "dt wrap" }, h("thead", {}, h("tr", {}, cols.map((c) => h("th", { text: c })))), h("tbody", {}, rows));

// The privacy and security statement. Everything on it comes from /api/privacy, which reads the running settings, so it cannot drift from what the application does.
export async function render() {
  const root = h("div", {}, pageHead("Privacy & security", "How Platform Manager signs you in, what it records, who can see it, and the controls around it. This page is written from the application's current settings."));
  let p;
  try { p = await api.privacy(); } catch (e) { return root.append(h("div", { class: "banner error", text: e.message })), root; }

  root.append(h("div", { class: "banner info" }, icon("shield"), h("span", {}, h("b", { text: `Version ${p.version}. ` }),
    `Last changed ${p.changedAt ? fmt.dt(p.changedAt) : "when this page first ran"}. A change to a setting changes this page; the history is at the bottom.`)));

  const you = p.you || {};
  if (you.upn) {
    root.append(card("Your access", h("dl", { class: "kv" }, [["You", you.name ? `${you.name} (${you.upn})` : you.upn], ["Your role", you.roleLabel], ["How you got it", you.how || "-"]].flatMap(([k, v]) => [h("dt", { text: k }), h("dd", { text: v })])),
      h("p", { class: "muted", text: "Your recent sign-ins are kept in the audit trail:" }),
      you.signIns.length ? table(["When", "Event", "From"], you.signIns.map((e) => h("tr", {}, h("td", { title: fmt.dt(e.time), text: fmt.ago(e.time) }), h("td", { text: EVENT[e.event] || e.event }), h("td", { text: e.ip || "-" }))))
        : h("div", { class: "empty", text: "None recorded." })));
  }

  for (const s of p.sections) {
    root.append(h("div", { class: "section", id: `privacy-${s.id}` }, card(s.title, ...(s.paragraphs || []).map((t) => h("p", { text: t })),
      s.rows && s.rows.length ? h("dl", { class: "kv" }, s.rows.flatMap((r) => [h("dt", { text: r.k }), h("dd", {}, r.tone === "warn" || r.tone === "risk" ? [pill(TONE_PILL[r.tone][0], r.tone), " "] : null, r.v)])) : null,
      s.table ? (s.table.rows.length ? table(s.table.cols, s.table.rows.map((r) => h("tr", {}, r.map((c) => h("td", { text: c }))))) : h("div", { class: "empty", text: "No data sources are switched on." })) : null)));
  }

  // Photographs on the platform showcase (assets/showcase). Each one is licensed for reuse; the source and licence are kept here, not on the slides.
  const PHOTOS = [
    ["The core", "Manhattan skyline, 2012", "Wikimedia Commons", "CC BY-SA 4.0"],
    ["AI agents", "Group at a conference-room meeting, WikiCamp Morocco 2026, day 3", "Wikimedia Commons", "CC BY-SA 4.0"],
    ["Fabric", "Data centre roof", "Wikimedia Commons", "CC0 (public domain)"],
    ["Contracts", "Glass office building", "rawpixel", "CC0 1.0 (public domain)"],
    ["Builders", "Data centre interior, by Gwan Kho", "Flickr", "CC BY-SA 2.0"],
    ["Start", "Office skyline, by nickgraywfu", "Flickr", "CC BY-SA 2.0"],
  ];
  root.append(card("Image credits (showcase)", h("p", { class: "muted", text: "The photographs used on the platform showcase, with their sources and licences." }),
    table(["Chapter", "Photograph", "Source", "Licence"], PHOTOS.map((r) => h("tr", {}, r.map((c) => h("td", { text: c })))))));

  root.append(h("div", { class: "section" }, h("h2", { text: "Where we are not as strong as we should be" }),
    h("p", { class: "muted", text: "Because this application signs people in with their Windows account rather than single sign-on with Entra, these are the limits that follow, and the controls that make up for them. A line disappears when the setting behind it is fixed." }),
    h("div", { class: "card" }, p.gaps.length ? table(["Gap", "What it means", "Compensating controls and the fix"], p.gaps.map((g) => h("tr", {}, h("td", {}, h("b", { text: g[0] })), h("td", { text: g[1] }), h("td", { text: g[2] }))))
      : h("div", { class: "empty", text: "No gaps are detected from the current settings." }))));

  root.append(h("div", { class: "section" }, h("h2", { text: "Controls" }),
    h("p", { class: "muted", text: "Each control is named by its NIST SP 800-53 Rev. 5 family and identifier. The status is worked out from the current settings. It describes this application only and is not a certification: Your security team decides whether it meets the standards." }),
    h("div", { class: "card" }, table(["Control", "What it covers", "How this application does it", "Status"], p.controls.map((c) => h("tr", {}, h("td", {}, h("b", { text: c[0] })), h("td", { text: c[1] }), h("td", { text: c[2] }),
      h("td", {}, pill(c[3], c[4]))))))));

  root.append(h("div", { class: "section" }, h("h2", { text: "Your security standards" }),
    h("div", { class: "card" }, p.standards.length ? table(["Standard", "Title", "How this application relates to it"], p.standards.map((r) => h("tr", {}, r.map((c) => h("td", { text: c })))))
      : h("p", { class: "muted", text: "The your organization standard numbers have not been entered yet. The administrator lists them under privacy.orgStandards in the configuration (id, title, note), and they appear here next to the controls above." }))));

  root.append(h("div", { class: "section" }, h("h2", { text: "Change history" }),
    h("div", { class: "card" }, p.history.length ? table(["When", "Version", "What changed"], p.history.map((e) => h("tr", {}, h("td", { title: fmt.dt(e.time), text: fmt.ago(e.time) }), h("td", { text: e.version }), h("td", { class: "muted", text: (e.changed || []).map((c) => c.replace("section:", "")).join(", ") || "first version" }))))
      : h("div", { class: "empty", text: "No changes recorded yet." }))));
  return root;
}
