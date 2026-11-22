import { currentRoute } from "./route.js";

const cache = new Map();

// The session ended (or never began): remember where the person was, go through the company sign-in, and come back to the same page.
let leaving = false;
function toSignIn() {
  if (!leaving) {
    leaving = true;
    try { sessionStorage.setItem("ppm-return", currentRoute()); } catch { /* storage blocked */ }
    location.assign("/auth/login");
  }
  return new Promise(() => {}); // the page is leaving: nothing downstream should run or show an error
}

// Static demo (GitHub Pages): index.html sets window.PPM_STATIC to a snapshot of the synthetic demo data. Reads are answered from it; anything that would change something is refused.
let snapshot = null;
async function staticReq(path, opts) {
  if (!snapshot) snapshot = await (await fetch(window.PPM_STATIC, { cache: "force-cache" })).json();
  const fail = (status, msg) => { const e = new Error(msg); e.status = status; e.body = { error: msg }; throw e; };
  if ((opts.method || "GET") !== "GET") fail(405, "This is a read-only online demo. Run Platform Manager yourself to use this feature.");
  if (path in snapshot.snap) return structuredClone(snapshot.snap[path]);
  // The demo has no Store and no data folder: show the free plan and a sample storage estimate, so the pages still read well.
  if (path === "/api/subscription") return { tier: "free", reason: "Demo: no Microsoft Store subscription on this device.", checkedAt: null, expires: null, features: { updates: false, support: false, "feature-requests": false }, paidFeatures: ["feature-requests", "support", "updates"], version: "1.0.0", storeUrl: "" };
  if (path === "/api/storage") return { settings: { users: 100, retentionDays: 365, sources: 6, kbPerUserSourceDay: 1.5, baseGB: 1, uploadsGB: 2, headroom: 0.3 }, estimateGB: 4.31, usedGB: 0, freeGB: 51.5, verdict: "ok", message: "The disk has enough free space for the estimate.", note: "Demo values. A planning estimate from the storage settings." };
  const known = snapshot.errors[path];
  if (known) fail(known.status, known.body?.error || "Not available in the online demo.");
  if (path.startsWith("/api/people?") || path.startsWith("/api/roster/search")) return { results: [] };
  if (path.startsWith("/api/groups/search")) return [];
  return fail(404, "Not available in the online demo.");
}

async function req(path, opts = {}) {
  if (window.PPM_STATIC) return staticReq(path, opts);
  const r = await fetch(path, { cache: "no-store", ...opts, headers: { "X-PPM": "1", "Content-Type": "application/json" } });
  let body = null;
  try { body = await r.json(); } catch { /* empty body */ }
  if (r.status === 401 && body?.login) return toSignIn();
  if (!r.ok) {
    const e = new Error((body && body.error) || `HTTP ${r.status}`);
    e.status = r.status;
    e.body = body;
    throw e;
  }
  return body;
}

async function postFile(path, file) {
  if (window.PPM_STATIC) return staticReq(path, { method: "POST" });
  const r = await fetch(path, {
    method: "POST", cache: "no-store", body: file,
    headers: { "X-PPM": "1", "X-PPM-Filename": encodeURIComponent(file.name), "Content-Type": "application/octet-stream" },
  });
  let body = null;
  try { body = await r.json(); } catch { /* empty body */ }
  if (r.status === 401 && body?.login) return toSignIn();
  if (!r.ok) {
    const e = new Error((body && body.error) || `HTTP ${r.status}`);
    e.status = r.status;
    throw e;
  }
  cache.clear();
  return body;
}

export const api = {
  browser: {
    status: () => req("/api/browser/status").catch((e) => (e.status === 404 ? { available: false, why: "The running server does not have this feature yet: restart it to turn it on." } : Promise.reject(e))),
    state: (id) => req(`/api/browser/state?id=${encodeURIComponent(id)}`),
    post: (route, body) => req(`/api/browser/${route}`, { method: "POST", body: JSON.stringify(body) }),
  },
  me: () => req("/api/me"),
  latest: (product) => req("/api/latest?product=" + encodeURIComponent(product)),
  meInsights: () => req("/api/me/insights"),
  builderEnvironments: () => req("/api/builder/environments"),
  authAudit: () => req("/api/auth/audit"),
  roster: () => req("/api/roster"),
  rosterBlocked: () => req("/api/roster/blocked"),
  rosterSearch: (q) => req("/api/roster/search?q=" + encodeURIComponent(q)),
  rosterPost: (route, body) => req(`/api/roster/${route}`, { method: "POST", body: JSON.stringify(body) }),
  privacy: () => req("/api/privacy"),
  subscription: () => req("/api/subscription"),
  updates: () => req("/api/updates"),
  support: (body) => req("/api/support", { method: "POST", body: JSON.stringify(body) }),
  featureRequest: (body) => req("/api/feature-requests", { method: "POST", body: JSON.stringify(body) }),
  storage: () => req("/api/storage"),
  groupSearch: (q) => req("/api/groups/search?q=" + encodeURIComponent(q)),
  groupDetail: (id, nested) => req("/api/groups/detail?id=" + encodeURIComponent(id) + (nested ? "&nested=1" : "")),
  groupInsights: (ids) => req("/api/groups/insights", { method: "POST", body: JSON.stringify({ ids }) }),
  signOut: () => window.PPM_STATIC ? Promise.resolve() : fetch("/auth/logout", { method: "POST", headers: { "X-PPM": "1" } }),
  status: () => req("/api/status"),
  insights: () => req("/api/insights"),
  access: () => req("/api/access"),
  history: () => req("/api/history"),
  analytics: () => req("/api/analytics").catch((e) => (e.status === 404 ? null : Promise.reject(e))),
  aiStatus: () => req("/api/ai/status"),
  dlp: () => req("/api/dlp").catch((e) => (e.status === 404 ? null : Promise.reject(e))),
  directory: (q) => req("/api/directory?q=" + encodeURIComponent(q)),
  tenantProfile: () => req("/api/tenant/profile").catch((e) => (e.status === 404 ? null : Promise.reject(e))),
  workspaceSuggest: () => req("/api/workspace/suggest").catch((e) => (e.status === 404 ? null : Promise.reject(e))),
  remediationSummary: () => req("/api/remediation/summary").catch((e) => (e.status === 404 ? null : Promise.reject(e))),
  remediationScript: (body) => req("/api/remediation/script", { method: "POST", body: JSON.stringify(body) }),
  aiInsights: () => req("/api/ai/insights", { method: "POST", body: "{}" }),
  generateFlow: (description, environmentId) => req("/api/builder/generate", { method: "POST", body: JSON.stringify({ description, environmentId }) }),
  assist: (product, description) => req("/api/builder/assist", { method: "POST", body: JSON.stringify({ product, description }) }),
  copilotCompare: (upn) => req("/api/people/copilot-compare", { method: "POST", body: JSON.stringify({ upn }) }),
  flowRepair: {
    status: () => req("/api/flowrepair/status").catch((e) => (e.status === 404 ? { available: false, why: "The running server does not have this feature yet: restart it to turn it on." } : Promise.reject(e))),
    flows: (scan) => req("/api/flowrepair/flows" + (scan ? "?scan=1" : "")),
    post: (route, body) => req(`/api/flowrepair/${route}`, { method: "POST", body: JSON.stringify(body) }),
  },
  setup: {
    guide: () => req("/api/setup/guide"),
    requests: (p) => req("/api/setup/requests?" + new URLSearchParams(p).toString()),
    config: (body) => req("/api/setup/config", { method: "POST", body: JSON.stringify(body) }),
  check: () => req("/api/setup/check", { method: "POST", body: "{}" }),
  },
  foundry: {
    overview: () => req("/api/foundry/overview"),
    models: () => req("/api/foundry/models"),
    landscape: () => req("/api/foundry/landscape"),
    agent: (id) => req(`/api/foundry/agents/${encodeURIComponent(id)}`),
    preview: (id, q) => req(`/api/foundry/agents/${encodeURIComponent(id)}/preview?q=${encodeURIComponent(q || "")}`),
    save: (id, body) => req(`/api/foundry/agents/${encodeURIComponent(id)}`, { method: "POST", body: JSON.stringify(body) }),
    test: (id, prompt) => req(`/api/foundry/agents/${encodeURIComponent(id)}/test`, { method: "POST", body: JSON.stringify({ prompt }) }),
    forget: (id, rid) => req(`/api/foundry/agents/${encodeURIComponent(id)}/forget`, { method: "POST", body: JSON.stringify({ id: rid }) }),
    upload: (id, file) => postFile(`/api/foundry/agents/${encodeURIComponent(id)}/knowledge`, file),
    removeFile: (id, kid) => req(`/api/foundry/agents/${encodeURIComponent(id)}/knowledge/${encodeURIComponent(kid)}/delete`, { method: "POST", body: "{}" }),
    use: (agent) => req("/api/foundry/use", { method: "POST", body: JSON.stringify({ agent }) }).catch(() => null),
    feedback: (id, useful) => req("/api/foundry/feedback", { method: "POST", body: JSON.stringify({ id, useful }) }),
  },
  authState: () => req("/api/auth/state"),
  authStart: () => req("/api/auth/start", { method: "POST", body: "{}" }),
  sync: (module) => req("/api/sync", { method: "POST", body: JSON.stringify(module ? { module } : {}) }),
  pull: (source) => req("/api/pull", { method: "POST", body: JSON.stringify({ source }) }),
  uploads: () => req("/api/uploads"),
  uploadRows: (id, sheet, offset = 0, limit = 100) =>
    req(`/api/uploads/${encodeURIComponent(id)}?sheet=${encodeURIComponent(sheet)}&offset=${offset}&limit=${limit}`),
  deleteUpload: (id) => req(`/api/uploads/${encodeURIComponent(id)}/delete`, { method: "POST", body: "{}" }),
  search: (q, limit = 200) => req(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  person: (q) => req(`/api/person?q=${encodeURIComponent(q)}`),
  peopleSearch: (q) => req(`/api/people?q=${encodeURIComponent(q)}`),
  personProfile: (upn) => req(`/api/people/profile?upn=${encodeURIComponent(upn)}`),
  personProduct: (product, upn) => req(`/api/people/product?product=${encodeURIComponent(product)}&upn=${encodeURIComponent(upn)}`),
  personProducts: (upn) => req(`/api/people/products?upn=${encodeURIComponent(upn)}`),
  e7Evidence: () => req("/api/e7/evidence").catch((e) => (e.status === 404 || e.status === 409 ? null : Promise.reject(e))),
  peopleUsage: (product) => req(`/api/people/usage?product=${encodeURIComponent(product)}`).catch((e) => (e.status === 404 || e.status === 409 ? { available: false, reason: e.status === 404 ? "The running server does not have this feature yet: restart it to turn it on." : e.message, apps: [], rows: [] } : Promise.reject(e))),
  fabric: () => req("/api/fabric"),
  fabricPlan: (body) => req("/api/fabric/plan", { method: "POST", body: JSON.stringify(body) }),
  fabricTopology: () => req("/api/fabric/topology"),
  docs: () => req("/api/docs"),
  doc: (id) => req(`/api/docs/${encodeURIComponent(id)}`),
  decisions: (dataset, sheet, insight, days) =>
    req(`/api/decisions?dataset=${encodeURIComponent(dataset)}${sheet ? `&sheet=${encodeURIComponent(sheet)}` : ""}${insight ? `&insight=${encodeURIComponent(insight)}&days=${days || 365}` : ""}`),
  decisionInsights: (dataset, sheet, days = 365) =>
    req(`/api/decision-insights?dataset=${encodeURIComponent(dataset)}&sheet=${encodeURIComponent(sheet)}&days=${days}`),
  // Sent as a raw body so the server never has to parse multipart.
  upload: (file) => postFile("/api/uploads", file),
  // `join` says how the file is matched to live tenant data: "" picks the best match, "none" turns it off, or "Column::entity" (person, flow, app, environment).
  analyzer: {
    list: () => req("/api/analyzer"),
    get: (id, sheet, join) => req(`/api/analyzer/${encodeURIComponent(id)}?sheet=${encodeURIComponent(sheet || "")}&join=${encodeURIComponent(join || "")}`),
    rows: (id, sheet, offset, limit, q, join) => req(`/api/analyzer/${encodeURIComponent(id)}/rows?sheet=${encodeURIComponent(sheet)}&offset=${offset}&limit=${limit}&q=${encodeURIComponent(q || "")}&join=${encodeURIComponent(join || "")}`),
    column: (id, sheet, col, join) => req(`/api/analyzer/${encodeURIComponent(id)}/column?sheet=${encodeURIComponent(sheet)}&col=${encodeURIComponent(col)}&join=${encodeURIComponent(join || "")}`),
    ask: (id, sheet, question, join) => req(`/api/analyzer/${encodeURIComponent(id)}/ask`, { method: "POST", body: JSON.stringify({ sheet, question, join: join || "" }) }),
    ai: (id, sheet, question, review, join) => req(`/api/analyzer/${encodeURIComponent(id)}/ai`, { method: "POST", body: JSON.stringify({ sheet, question, review: !!review, join: join || "" }) }),
    remove: (id) => req(`/api/analyzer/${encodeURIComponent(id)}/delete`, { method: "POST", body: "{}" }),
    upload: (file) => postFile("/api/analyzer", file),
  },
  // Returns null (not an error) when the module has no data yet.
  async data(module) {
    const hit = cache.get(module);
    if (hit && Date.now() - hit.t < 15000) return hit.v;
    try {
      const v = await req(`/api/data/${module}`);
      cache.set(module, { t: Date.now(), v });
      return v;
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  },
  clear: () => cache.clear(),
};
