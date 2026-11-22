import { h } from "../dom.js";

export function pageHead(title, sub, ...actions) {
  return h("div", { class: "page-head" }, h("div", {}, h("h1", { text: title }), sub ? h("p", { text: sub }) : null),
    h("div", { class: "spacer" }), ...actions);
}

export function moduleOf(ctx, id) {
  return ctx.status.modules.find((m) => m.id === id);
}

// Shown in place of a page's content when its data source has not produced data.
export function noData(ctx, id, what) {
  const m = moduleOf(ctx, id);
  let msg = `${what} has not been collected yet.`;
  if (m && m.state === "running") msg = `${what} is being collected now${m.progress ? ` (${m.progress.done.toLocaleString()}${m.progress.total ? "/" + m.progress.total.toLocaleString() : ""} ${m.progress.label})` : ""}. This page fills in when it finishes.`;
  else if (m && !m.enabled) msg = `${what} is switched off. Enable the "${id}" module in config/powerplatform.json.`;
  else if (m && m.state === "error") msg = `${what} failed: ${m.detail}`;
  else if (ctx.status.tenant?.configError) msg = `Not connected: ${ctx.status.tenant.configError}.`;
  const admin = !ctx.me || ctx.me.role === "admin";
  return h("div", { class: "banner " + (m && m.state === "error" ? "error" : "info") }, h("span", {}, msg + " "),
    admin ? h("a", { href: "#sources", text: "Open Data sources" }) : null);
}

export const makerFlow = (f) => `https://make.powerautomate.com/environments/${encodeURIComponent(f.env)}/flows/${encodeURIComponent(f.id)}/details`;
export const makerApps = (a) => `https://make.powerapps.com/environments/${encodeURIComponent(a.env)}/apps`;
export const adminEnv = (e) => `https://admin.powerplatform.microsoft.com/environments/environment/${encodeURIComponent(e.id)}/hub`;
