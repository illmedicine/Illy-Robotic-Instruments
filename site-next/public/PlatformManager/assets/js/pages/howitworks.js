import { still } from "./foundrykit.js";

// "See how it works": an interactive, animated walk-through of how an AI Builder agent takes a request to production.
//   1. The person enters a prompt   2. The agent opens a browser and the person signs in   3. The agent asks for control of the screen
//   4. The agent builds and tests while the person watches   5. The person approves and the agent deploys.
// It is an illustration of the target experience, built from mock screens, a moving cursor and screen zoom. Nothing here touches a tenant.

const SW = 960, SH = 540; // the logical size of the mock screen; it is scaled to fit and zoomed on top

const SCENES = {
  flowbuilder: {
    name: "Flow Builder", app: "Power Automate", host: "make.powerautomate.com/environments/production/flows", accent: "#0b6fd6", kind: "canvas", nav: ["Home", "My flows", "Create", "Templates", "Connections"],
    prompt: "When an email with an attachment arrives in the claims mailbox, save the file to SharePoint and tell the claims team in Teams",
    draft: ["Trigger: a new email with an attachment arrives (Outlook, shared mailbox)", "Save the attachment to the Claims Intake library (SharePoint)", "Post a message to the Claims team channel (Teams)"],
    title: "Claims attachment intake", noun: "flow",
    steps: [{ label: "When a new email arrives (V3)", sub: "Office 365 Outlook", search: "new email", fields: [["Folder", "Claims mailbox / Inbox"], ["Only with attachments", "Yes"]] },
      { label: "Create file", sub: "SharePoint", search: "create file", fields: [["Site address", "Claims"], ["Folder path", "/Claims Intake"], ["File name", "Attachment name"]] },
      { label: "Post message in a chat or channel", sub: "Microsoft Teams", search: "post message", fields: [["Team", "Claims Operations"], ["Channel", "Intake"], ["Message", "New claim file saved"]] }],
    tests: ["The flow starts on a test email", "The file is saved to Claims Intake", "The Teams message is posted", "No credentials or addresses are hard-coded"],
    deploy: [["Where", "Production environment"], ["Runs as", "You, with your own permissions"], ["Changes", "3 steps, 2 of your connections"], ["Tests", "4 of 4 passed"]], done: "Flow turned on in Production",
  },
  sharepoint: {
    name: "SharePoint Agent", app: "SharePoint", host: "yourcompany.sharepoint.com/_layouts/15/sitecreate", accent: "#038387", kind: "form", nav: ["Home", "Create site", "Active sites", "Policies", "Settings"],
    prompt: "Create a team site for the Claims policy library with a Policies library, versioning on, two owners and the Internal sensitivity label",
    draft: ["Team site Claims Policy Hub with an owners group", "Library Policies with versioning and a retention label", "Sensitivity label Internal applied to the site"],
    title: "Create the Claims Policy Hub", noun: "site",
    fields: [["Site name", "Claims Policy Hub"], ["Description", "Policies, procedures and forms for Claims"], ["Owners", "Claims owners (AD group)"], ["Sensitivity label", "Internal"]],
    toggles: ["Add a Policies document library", "Turn on version history", "Apply the retention label"],
    tests: ["The site opens for the owners group", "The Policies library keeps versions", "The label Internal is applied", "No one outside the group has access"],
    deploy: [["Where", "yourcompany.sharepoint.com/sites/ClaimsPolicyHub"], ["Created by", "You, with your own permissions"], ["Changes", "1 site, 1 library, 1 label"], ["Tests", "4 of 4 passed"]], done: "Site created in Production",
  },
  powerbi: {
    name: "Power BI & Fabric Agent", app: "Power BI", host: "app.powerbi.com/groups/claims/reports/new", accent: "#c79a00", kind: "report", nav: ["Home", "Browse", "Data hub", "Workspaces", "Apps"],
    prompt: "Show year-to-date claims paid with a monthly trend and a slicer for line of business, using the Claims semantic model",
    draft: ["Measure Paid YTD with TOTALYTD over the Date table", "Card for Paid YTD and a monthly column chart", "Slicer for line of business"],
    title: "Claims paid, year to date", noun: "report", dax: "Paid YTD = TOTALYTD ( SUM ( Claims[Paid] ), 'Date'[Date] )",
    fields: ["Paid", "Month", "Line of business"], visuals: ["Paid YTD", "Paid by month", "Line of business"],
    tests: ["The measure returns a value for every month", "The totals match the source for last month", "The slicer filters both visuals", "Row-level security still applies"],
    deploy: [["Where", "Claims workspace, Production app"], ["Published by", "You, with your own permissions"], ["Changes", "1 measure, 1 report page"], ["Tests", "4 of 4 passed"]], done: "Report published to the Claims app",
  },
  dynamics: {
    name: "Dynamics 365 Agent", app: "Dynamics 365", host: "yourorg.crm.dynamics.com/main.aspx?pagetype=entitylist", accent: "#1f3a6e", kind: "form", nav: ["Home", "Accounts", "Cases", "Views", "Solutions"],
    prompt: "Make a view of open cases for an account, newest first, with title, account, priority and created date",
    draft: ["View Open cases on the Case table", "Columns Title, Account, Priority, Created on", "Filter Status is Active, sorted by Created on newest first"],
    title: "New view: Open cases by account", noun: "view",
    fields: [["View name", "Open cases by account"], ["Table", "Case"], ["Columns", "Title, Account, Priority, Created on"], ["Filter", "Status equals Active"], ["Sort", "Created on, newest first"]],
    toggles: ["Show it to the Service team only"], rows: [["Billing question", "Contoso", "High", "Today"], ["Claim status", "Fabrikam", "Normal", "Yesterday"], ["Address change", "Northwind", "Low", "Mon"]],
    tests: ["The view returns only active cases", "Columns appear in the chosen order", "Only the Service team can see it"],
    deploy: [["Where", "Production environment, Service solution"], ["Changed by", "You, with your own security role"], ["Changes", "1 view"], ["Tests", "3 of 3 passed"]], done: "View saved to the Service solution",
  },
  m365: {
    name: "Microsoft 365 Agent", app: "Microsoft Entra admin center", host: "entra.microsoft.com/#view/Microsoft_AAD_UsersAndTenants", accent: "#0f6cbd", kind: "form", nav: ["Overview", "Users", "Groups", "Licences", "Audit logs"],
    prompt: "List enabled users who have not signed in for 90 days and show which licences they hold",
    draft: ["Filter: account enabled and last sign-in older than 90 days", "Columns: name, licences, last sign-in", "Read-only: nothing is changed"],
    title: "Inactive users, 90 days", noun: "report",
    fields: [["Account enabled", "Yes"], ["Last sign-in", "Older than 90 days"], ["Show columns", "Name, Licences, Last sign-in"]],
    toggles: ["Read-only: do not change any account"], rows: [["User one", "Microsoft 365 E5", "Aug 12"], ["User two", "Microsoft 365 E5, Copilot", "Jul 30"], ["User three", "Microsoft 365 E3", "Jul 02"]],
    tests: ["Only enabled accounts are listed", "Nobody active in the last 90 days is listed", "No account was changed"],
    deploy: [["Where", "Saved as a report for the admin team"], ["Run as", "You, with your own admin role"], ["Changes", "None: read-only"], ["Tests", "3 of 3 passed"]], done: "Report saved for the admin team",
  },
  copilot: {
    name: "Microsoft Copilot Agent", app: "Copilot Studio", host: "copilotstudio.microsoft.com/environments/production/bots", accent: "#6a3fd0", kind: "canvas", nav: ["Home", "Agents", "Topics", "Knowledge", "Publish"],
    prompt: "An agent that answers claims status questions from the claims knowledge site and hands over to a person when it cannot",
    draft: ["Topic: claim status questions", "Knowledge: the Claims SharePoint site", "Fallback: hand over to a person"],
    title: "Claims status agent", noun: "agent",
    steps: [{ label: "Trigger: claim status", sub: "Topic", search: "trigger phrases", fields: [["Phrases", "where is my claim"], ["", "claim status"]] },
      { label: "Search the claims site", sub: "Knowledge", search: "knowledge", fields: [["Source", "Claims SharePoint site"], ["Only show", "Internal content"]] },
      { label: "Hand over to a person", sub: "Fallback", search: "transfer", fields: [["When", "No answer found"], ["Queue", "Claims support"]] }],
    tests: ["It answers a status question from the site", "It hands over when nothing is found", "It never quotes a file the user cannot open"],
    deploy: [["Where", "Production, Claims support channel"], ["Published by", "You, with your own permissions"], ["Changes", "1 agent, 3 topics"], ["Tests", "3 of 3 passed"]], done: "Agent published to Claims support",
  },
  contracts: {
    name: "Contract Renewal Agent", app: "Word on SharePoint", host: "yourcompany.sharepoint.com/sites/Contracts/Renewals", accent: "#2b579a", kind: "doc", nav: ["Home", "Documents", "Renewals", "Templates", "Recent"],
    prompt: "A one-page renewal brief for our Microsoft Enterprise Agreement with the points to negotiate",
    draft: ["Summary of what renews and when", "Decisions so far by licence tier", "Points to negotiate, each with its source"],
    title: "Enterprise Agreement renewal brief", noun: "brief",
    lines: [["h", "Enterprise Agreement renewal brief"], ["p", "Renews 30 June. Three licence tiers are in scope."], ["h", "Points to negotiate"], ["b", "Price protection for 36 months"], ["b", "Right to reduce seats at each anniversary"], ["b", "Co-terming of the Dynamics subscription"]],
    cite: "Source: Enterprise Agreement, section 4.2",
    tests: ["Every point cites a source document", "Figures match the uploaded workbook", "Nothing is stated that the documents do not support"],
    deploy: [["Where", "Contracts site, Renewals library"], ["Saved by", "You, with your own permissions"], ["Changes", "1 document, marked Draft for review"], ["Tests", "3 of 3 passed"]], done: "Brief saved as a draft for review",
  },
};

export const hasHowItWorks = (key) => Boolean(SCENES[key]);

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const put = (parent, ...kids) => { kids.filter(Boolean).forEach((k) => parent.append(k)); return parent; };
const input = (value = "") => { const e = el("div", "mk-input"); e.append(el("span", "t", value), el("span", "caret")); return e; };

class Cancel extends Error {}

export function openHowItWorks(key, opener) {
  const sc = SCENES[key];
  if (!sc) return;
  document.querySelector(".hw-overlay")?.remove();
  let gen = 0, paused = false, playing = true, speed = 1, cur = -1, zoomLevel = 1;
  const fast = still();

  // ---- chrome
  const stepsDef = [
    ["Enter your request", "You describe what you need in the AI Builder."], ["The agent opens a browser", "A private window opens and you sign in yourself."], ["You hand over the screen", "The agent asks before it takes control."],
    ["It builds and tests while you watch", "Every click and setting happens on screen."], ["You approve, it deploys", "Nothing reaches production without your approval."]];
  const list = el("ol", "hw-steps");
  const items = stepsDef.map(([t, d], i) => { const li = el("li", "", ""); li.append(el("b", "", t), el("span", "", d)); li.addEventListener("click", () => goTo(i, true)); list.append(li); return li; });
  const cursor = el("div", "hw-cursor you");
  cursor.append(el("i", "arrow"), el("span", "tag", "You"));
  const banner = el("div", "hw-banner"); put(banner, el("span", "dot"), el("b", "", "AI agent is controlling this window"), el("em", "", "You can stop it at any time"), el("button", "stop", "Stop"));
  const screen = el("div", "hw-screen"), viewport = el("div", "hw-viewport"), lock = el("div", "hw-lock");
  const addr = el("span", "addr"), tab = el("span", "tab");
  const chrome = el("div", "hw-chrome"); put(chrome, el("span", "dots"), tab, addr);
  put(viewport, screen, banner, cursor, lock);
  const capT = el("b", ""), capD = el("span", ""), cap = put(el("div", "hw-caption"), capT, capD);
  const prog = el("i", ""), bar = put(el("div", "hw-progress"), prog);
  const playBtn = el("button", "btn primary", "Pause"), backBtn = el("button", "btn", "Back"), nextBtn = el("button", "btn", "Next"), replay = el("button", "btn", "Replay");
  const sp = el("select", "select"); [["Slow", 0.6], ["Normal", 1], ["Fast", 1.8]].forEach(([t, v]) => { const o = el("option", "", t); o.value = String(v); if (v === 1) o.selected = true; sp.append(o); });
  const close = el("button", "hw-close", "Close"); close.setAttribute("aria-label", "Close");
  const foot = el("p", "hw-note", "An illustration of the target experience. Today, Edit in Power Automate works this way once it is switched on; the other builders draft code and designs for you to review and run yourself.");
  const dlg = put(el("div", "hw-dialog"),
    put(el("div", "hw-head"), put(el("div", ""), el("small", "", `See how it works`), el("h2", "", `${sc.name}: from request to production`)), close),
    put(el("div", "hw-body"), put(el("div", "hw-side"), list, foot), put(el("div", "hw-stage"), put(el("div", "hw-browser"), chrome, viewport), cap, bar,
      put(el("div", "toolbar hw-ctrl"), backBtn, playBtn, nextBtn, replay, sp))));
  dlg.setAttribute("role", "dialog"); dlg.setAttribute("aria-modal", "true"); dlg.setAttribute("aria-label", `How the ${sc.name} works`);
  const overlay = put(el("div", "hw-overlay"), dlg);
  document.body.append(overlay);
  overlay.style.setProperty("--mk", sc.accent);
  close.focus();

  // ---- timing, cursor and zoom
  const check = (g) => { if (g !== gen) throw new Cancel(); };
  async function sleep(ms, g) {
    let left = (fast ? ms * 0.15 : ms) / speed, last = performance.now();
    while (left > 0) {
      await new Promise((r) => setTimeout(r, 30));
      const now = performance.now();
      if (!paused) left -= now - last;
      last = now;
      check(g);
    }
  }
  const rel = (node) => { const a = viewport.getBoundingClientRect(), b = node.getBoundingClientRect(); return { x: b.left - a.left + b.width / 2, y: b.top - a.top + b.height / 2, w: b.width, h: b.height }; };
  const fit = () => viewport.clientWidth / SW;
  function setView(z, tx, ty, animate) {
    screen.classList.toggle("anim", animate && !fast);
    screen.style.transform = `translate(${tx}px, ${ty}px) scale(${fit() * z})`;
    zoomLevel = z;
  }
  let view = { z: 1, tx: 0, ty: 0 };

  const api = (g) => ({
    sleep: (ms) => sleep(ms, g),
    async go(node, ms = 900, dx = 0, dy = 0) {
      const p = rel(node);
      cursor.classList.toggle("anim", !fast);
      cursor.style.transform = `translate(${p.x + dx}px, ${p.y + dy}px)`;
      await sleep(ms, g);
    },
    async click(node, ms = 900) {
      await this.go(node, ms);
      const p = rel(node), r = el("i", "hw-ripple");
      r.style.left = cursor.style.transform.match(/translate\(([-\d.]+)px/)[1] + "px";
      r.style.top = cursor.style.transform.match(/,\s*([-\d.]+)px/)[1] + "px";
      viewport.append(r);
      node.classList.add("pressed");
      setTimeout(() => { r.remove(); node.classList.remove("pressed"); }, 500);
      await sleep(350, g);
      return p;
    },
    async type(node, text, cps = 28) {
      const t = node.querySelector(".t"), caretEl = node.querySelector(".caret");
      node.classList.add("focus");
      for (let i = 1; i <= text.length; i++) { t.textContent = node.dataset.mask ? "•".repeat(i) : text.slice(0, i); await sleep(1000 / cps, g); }
      node.classList.remove("focus");
      if (caretEl) caretEl.style.visibility = "hidden";
    },
    // Zoom so the node fills the view; with no node, back to the whole screen.
    async zoom(node, z = 1.9, ms = 900) {
      if (!node) { view = { z: 1, tx: 0, ty: 0 }; setView(1, 0, 0, true); await sleep(ms, g); return; }
      const a = screen.getBoundingClientRect(), b = node.getBoundingClientRect(), s = fit() * zoomLevel;
      const lx = (b.left + b.width / 2 - a.left) / s, ly = (b.top + b.height / 2 - a.top) / s, ns = fit() * z, vw = viewport.clientWidth, vh = viewport.clientHeight;
      const tx = Math.min(0, Math.max(vw - SW * ns, vw / 2 - lx * ns)), ty = Math.min(0, Math.max(vh - SH * ns, vh / 2 - ly * ns));
      view = { z, tx, ty };
      setView(z, tx, ty, true);
      await sleep(ms, g);
    },
    say(title, text) { capT.textContent = title; capD.textContent = text; },
    agent(on) { banner.classList.toggle("on", on); cursor.classList.toggle("ai", on); cursor.classList.toggle("you", !on); cursor.querySelector(".tag").textContent = on ? "AI agent" : "You"; },
    note(text) { lock.textContent = text; lock.classList.toggle("on", Boolean(text)); },
    page(url, title) { addr.textContent = url; tab.textContent = title; },
  });

  // ---- mock apps
  function shell() {
    const root = el("div", "mk-app"), top = el("div", "mk-top"), side = el("div", "mk-nav"), main = el("div", "mk-main");
    put(top, el("b", "", sc.app), el("span", "mk-search", "Search"), el("span", "mk-me", "You"));
    sc.nav.forEach((n, i) => side.append(el("div", "mk-navitem" + (i === 1 ? " on" : ""), n)));
    put(root, top, put(el("div", "mk-row"), side, main));
    return { root, main };
  }
  const field = (label, value = "") => { const w = el("label", "mk-field"), i = input(value); put(w, el("span", "", label), i); return { w, i }; };
  const button = (t, cls = "") => el("div", "mk-btn " + cls, t);
  const checks = (list) => put(el("ul", "mk-checks"), ...list.map((t) => { const li = el("li", "", t); li.prepend(el("i", "", "")); return li; }));

  // 1. the AI Builder page in Platform Manager
  function sceneRequest() {
    const root = el("div", "mk-pm"), draft = el("div", "mk-card hid");
    const ta = el("div", "mk-textarea"); ta.append(el("span", "t", ""), el("span", "caret"));
    const go = button("Draft", "primary"), build = button("Build it for me in a browser", "primary hid");
    put(draft, el("b", "", sc.title), el("ul", "", ""));
    sc.draft.forEach((d) => draft.querySelector("ul").append(el("li", "", d)));
    put(root, put(el("div", "mk-top pm"), el("b", "", "Platform Manager"), el("span", "mk-me", "You")), put(el("div", "mk-pad"), el("h3", "", `AI Builder: ${sc.name}`),
      el("p", "muted", "Describe what you need. The agent drafts it for you to review."), ta, put(el("div", "mk-actions"), go, build), draft));
    return { root, ta, go, draft, build };
  }

  // 2. the Microsoft sign-in the person completes themselves
  function sceneSignIn() {
    const root = el("div", "mk-signin"), card = el("div", "mk-card"), user = field("Email", ""), pw = field("Password", "");
    pw.i.dataset.mask = "1";
    const next = button("Sign in", "primary"), ok = el("div", "mk-ok hid", "Signed in as you");
    put(card, el("div", "mk-ms", "Microsoft"), el("h3", "", "Sign in"), user.w, pw.w, next, ok);
    put(root, el("div", "mk-private", "Private window"), card);
    return { root, user: user.i, pw: pw.i, next, ok };
  }

  // 3. the app, with the permission request on top
  function sceneConsent() {
    const { root, main } = shell(), dim = el("div", "mk-dim"), dlg2 = el("div", "mk-dialog"), allow = button("Allow for this task", "primary"), deny = button("Don't allow");
    put(main, el("h3", "", sc.app), el("div", "mk-skel"), el("div", "mk-skel s2"), el("div", "mk-skel s3"));
    put(dlg2, el("b", "", "Platform Manager's AI agent wants to control this window"), el("p", "muted", "It will:"),
      put(el("ul", "mk-perms", ""), ...["See this window and click in it", "Type into fields, but never into a password field", "Stop and ask before anything risky", "Work only in the pages you are signed in to"].map((t) => el("li", "", t))),
      put(el("div", "mk-actions"), allow, deny));
    put(root, put(dim, dlg2));
    return { root, allow, dim };
  }

  // 4. the build, by kind
  function sceneBuild() {
    const { root, main } = shell(), t = {};
    const test = el("div", "mk-test hid"), tests = checks(sc.tests), spin = el("div", "mk-run", "Running tests");
    put(test, el("b", "", "Test run"), spin, tests);
    t.test = test; t.checks = [...tests.children];
    if (sc.kind === "canvas") {
      const nodes = sc.steps.map((s) => { const n = el("div", "mk-node hid"); put(n, el("b", "", s.label), el("small", "", s.sub)); return n; });
      const add = button("+ New step"), pop = el("div", "mk-pop hid"), q = input(""), res = el("div", "mk-res"), conf = el("div", "mk-conf hid");
      put(pop, q, res);
      const flow = el("div", "mk-flow"), nameInput = input("");
      put(flow, nameInput);
      nodes.forEach((n, i) => { flow.append(n); if (i < nodes.length - 1) flow.append(el("div", "mk-link hid")); });
      put(main, el("h3", "", "Create a " + sc.noun), put(el("div", "mk-split"), put(el("div", "mk-canvas"), flow, add, pop), conf));
      Object.assign(t, { nodes, add, pop, q, res, conf, name: nameInput, links: [...flow.querySelectorAll(".mk-link")] });
    } else if (sc.kind === "form") {
      const fs = sc.fields.map(([l, v]) => ({ ...field(l, ""), v })), tg = (sc.toggles || []).map((x) => { const r = el("div", "mk-toggle"); put(r, el("i", ""), el("span", "", x)); return r; });
      const table = sc.rows ? el("div", "mk-table hid") : null;
      if (table) sc.rows.forEach((r) => table.append(put(el("div", "mk-tr"), ...r.map((c) => el("span", "", c)))));
      put(main, el("h3", "", sc.title), put(el("div", "mk-form"), ...fs.map((f) => f.w), ...tg), table);
      Object.assign(t, { fs, tg, table });
    } else if (sc.kind === "report") {
      const bar2 = el("div", "mk-formula"), fx = input("");
      put(bar2, el("span", "", "fx"), fx);
      const card = el("div", "mk-visual card hid"), chart = el("div", "mk-visual chart hid"), slicer = el("div", "mk-visual slicer hid");
      put(card, el("small", "", sc.visuals[0]), el("b", "", "$12.4M"));
      [30, 44, 38, 56, 62, 70].forEach((v, i) => { const b = el("i", ""); b.style.height = v + "%"; b.style.animationDelay = i * 80 + "ms"; chart.append(b); });
      chart.prepend(el("small", "", sc.visuals[1]));
      put(slicer, el("small", "", sc.visuals[2]), ...["Medical", "Dental", "Vision"].map((x) => el("span", "", x)));
      const fl = el("div", "mk-fields"); const chips = sc.fields.map((f) => { const c = el("div", "mk-chip", f); fl.append(c); return c; });
      put(main, el("h3", "", sc.title), bar2, put(el("div", "mk-split rep"), put(el("div", "mk-page"), card, chart, slicer), put(el("div", "mk-fieldlist"), el("small", "", "Fields"), fl)));
      Object.assign(t, { fx, card, chart, slicer, chips });
    } else {
      const doc = el("div", "mk-doc"), rows = sc.lines.map(([k, txt]) => { const r = el("div", "mk-line " + k + " hid"); r.append(el("span", "t", ""), el("span", "caret")); r.dataset.text = txt; return r; });
      const cite = el("div", "mk-comment hid", sc.cite);
      put(doc, ...rows, cite);
      put(main, el("h3", "", sc.title), doc);
      Object.assign(t, { rows, cite });
    }
    put(root, test);
    return { root, ...t };
  }

  // 5. approval and deployment
  function sceneDeploy() {
    const { root, main } = shell(), dim = el("div", "mk-dim"), box = el("div", "mk-dialog"), approve = button("Approve and deploy", "primary"), hold = button("Not yet"), done = el("div", "mk-done hid");
    put(main, el("h3", "", sc.title), el("div", "mk-skel"), el("div", "mk-skel s2"));
    put(box, el("b", "", `Deploy this ${sc.noun} to production?`), put(el("dl", "mk-sum", ""), ...sc.deploy.flatMap(([k, v]) => [el("dt", "", k), el("dd", "", v)])),
      el("p", "muted", "The tests passed. The agent will not deploy until you approve."), put(el("div", "mk-actions"), approve, hold));
    put(done, el("i", ""), el("b", "", sc.done), el("small", "", "Recorded in the audit trail: who asked, what changed, who approved."));
    put(root, put(dim, box, done));
    return { root, approve, box, done, dim };
  }

  // ---- the five steps
  const S = [
    async (c) => {
      c.page("platform manager / ai builder", "Platform Manager");
      const s = sceneRequest(); screen.replaceChildren(s.root);
      cursor.querySelector(".tag").textContent = "You"; c.agent(false);
      c.say("1. You enter your request", "Describe what you need in your own words. The agent turns it into a plan you can read before anything is built.");
      await c.go(s.ta, 700); await c.click(s.ta); await c.zoom(s.ta, 1.6); await c.type(s.ta, sc.prompt, 60);
      await c.zoom(null); await c.click(s.go); s.draft.classList.remove("hid"); s.draft.classList.add("in");
      c.say("1. You review the plan", "The agent reads it back as a plan. You can change the wording and draft again.");
      await c.zoom(s.draft, 1.5); await c.sleep(1400); await c.zoom(null);
      s.build.classList.remove("hid"); s.build.classList.add("in"); await c.click(s.build, 1000); await c.sleep(300);
    },
    async (c) => {
      c.page("login.microsoftonline.com", "Sign in to your account");
      const s = sceneSignIn(); screen.replaceChildren(s.root);
      c.say("2. The agent opens a browser window", "A private window opens on the app you chose. You sign in yourself, so your own permissions decide what the agent can touch.");
      c.note("You type your own credentials. The agent never sees them.");
      await c.sleep(900); await c.click(s.user); await c.zoom(s.user, 2); await c.type(s.user, "you@yourcompany.com", 24);
      await c.click(s.pw); await c.type(s.pw, "••••••••••••", 18); await c.zoom(null);
      await c.click(s.next); s.ok.classList.remove("hid"); s.ok.classList.add("in"); await c.sleep(1100); c.note("");
    },
    async (c) => {
      c.page(sc.host, sc.app); const s = sceneConsent(); screen.replaceChildren(s.root);
      c.say("3. The agent asks for control of the screen", "It cannot act until you allow it, and you can take the screen back at any time.");
      await c.sleep(1200); await c.zoom(s.dim.firstChild, 1.35); await c.click(s.allow, 1100); await c.zoom(null);
      c.agent(true); s.dim.classList.add("out"); await c.sleep(800);
    },
    async (c) => {
      c.page(sc.host, sc.app); const t = sceneBuild(); screen.replaceChildren(t.root); c.agent(true);
      c.say("4. It builds while you watch", "Every selection and setting happens on screen. You can pause or stop it.");
      await c.sleep(700);
      if (sc.kind === "canvas") {
        await c.click(t.name, 800); await c.type(t.name, sc.title, 32);
        for (let i = 0; i < sc.steps.length; i++) {
          const st = sc.steps[i];
          c.say(`4. Step ${i + 1} of ${sc.steps.length}: ${st.label}`, "It opens the step picker, searches, and chooses the action.");
          await c.click(t.add, 800); t.pop.classList.remove("hid"); t.pop.classList.add("in"); await c.zoom(t.pop, 1.7); await c.click(t.q, 600); await c.type(t.q, st.search, 18);
          t.res.replaceChildren(put(el("div", "mk-hit", st.label), el("div", "mk-hit dim", "Other results")));
          await c.click(t.res.firstChild, 700); t.pop.classList.add("hid"); t.pop.classList.remove("in"); t.q.querySelector(".t").textContent = "";
          t.nodes[i].classList.remove("hid"); t.nodes[i].classList.add("in"); if (t.links[i - 1]) { t.links[i - 1].classList.remove("hid"); t.links[i - 1].classList.add("in"); }
          t.conf.classList.remove("hid"); t.conf.replaceChildren(el("b", "", st.label), ...st.fields.map(([l]) => { const f = field(l, ""); f.i.dataset.k = l; return f.w; }));
          await c.zoom(t.conf, 1.4);
          const inputs = [...t.conf.querySelectorAll(".mk-input")];
          for (let k = 0; k < inputs.length; k++) { await c.click(inputs[k], 600); await c.type(inputs[k], st.fields[k][1], 30); }
          await c.zoom(null);
        }
      } else if (sc.kind === "form") {
        for (let i = 0; i < t.fs.length; i++) { await c.click(t.fs[i].i, 700); if (i === 0) await c.zoom(t.fs[i].i, 1.7); await c.type(t.fs[i].i, t.fs[i].v, 30); }
        await c.zoom(null);
        for (const g of t.tg) { await c.click(g, 700); g.classList.add("on"); }
        if (t.table) { t.table.classList.remove("hid"); t.table.classList.add("in"); await c.zoom(t.table, 1.6); await c.sleep(900); await c.zoom(null); }
      } else if (sc.kind === "report") {
        c.say("4. It writes the measure", "The agent types the DAX into the formula bar and checks it evaluates.");
        await c.click(t.fx, 700); await c.zoom(t.fx, 1.8); await c.type(t.fx, sc.dax, 55); await c.zoom(null);
        await c.click(t.chips[0], 800); t.card.classList.remove("hid"); t.card.classList.add("in"); await c.sleep(400);
        await c.click(t.chips[1], 900); t.chart.classList.remove("hid"); t.chart.classList.add("in"); await c.zoom(t.chart, 1.6); await c.sleep(900); await c.zoom(null);
        await c.click(t.chips[2], 900); t.slicer.classList.remove("hid"); t.slicer.classList.add("in"); await c.sleep(500);
      } else {
        for (let i = 0; i < t.rows.length; i++) {
          const r = t.rows[i]; r.classList.remove("hid"); r.classList.add("in"); await c.click(r, 600); if (i === 0) await c.zoom(r, 1.6); await c.type(r, r.dataset.text, 40);
          r.querySelector(".caret").style.visibility = "hidden";
        }
        t.cite.classList.remove("hid"); t.cite.classList.add("in"); await c.zoom(t.cite, 1.7); await c.sleep(1100); await c.zoom(null);
      }
      c.say("4. It tests what it built", "Before it asks to deploy, the agent runs its checks and shows you the result.");
      t.test.classList.remove("hid"); t.test.classList.add("in"); await c.zoom(t.test, 1.5);
      for (const li of t.checks) { await c.sleep(650); li.classList.add("ok"); }
      t.test.classList.add("done"); await c.sleep(900); await c.zoom(null);
    },
    async (c) => {
      c.page(sc.host, sc.app); const s = sceneDeploy(); screen.replaceChildren(s.root); c.agent(true);
      c.say("5. It asks before it deploys", "The tests passed. The agent shows exactly what will change and waits for you.");
      await c.sleep(1100); await c.zoom(s.box, 1.45); c.agent(false); await c.click(s.approve, 1200);
      s.box.classList.add("hid"); s.done.classList.remove("hid"); s.done.classList.add("in"); c.say("5. Deployed, with you as the owner", "It ran as you, so your permissions applied, and the change is in the audit trail. Replay it or close this window.");
      await c.zoom(null); await c.sleep(600);
    },
  ];

  function mark(i) { items.forEach((li, k) => { li.classList.toggle("now", k === i); li.classList.toggle("done", k < i); }); }
  async function goTo(i, manual) {
    const g = ++gen;
    cur = i; mark(i); prog.style.width = ((i + 1) / S.length) * 100 + "%"; paused = false; playBtn.textContent = "Pause";
    if (manual) playing = false;
    view = { z: 1, tx: 0, ty: 0 }; zoomLevel = 1; setView(1, 0, 0, false);
    cursor.classList.remove("anim"); cursor.style.transform = `translate(${viewport.clientWidth * 0.78}px, ${viewport.clientHeight * 0.82}px)`;
    try {
      await S[i](api(g));
      if (g !== gen) return;
      items[i].classList.add("done");
      if (playing && i < S.length - 1) { await sleep(1000, g); goTo(i + 1, false); } else if (i === S.length - 1) { playBtn.textContent = "Play again"; playing = false; }
    } catch (e) { if (!(e instanceof Cancel)) throw e; }
  }

  const stop = () => { gen++; overlay.remove(); document.removeEventListener("keydown", onKey); (opener || document.body).focus?.(); };
  function onKey(e) { if (e.key === "Escape") stop(); }
  document.addEventListener("keydown", onKey);
  close.addEventListener("click", stop);
  overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) stop(); });
  banner.querySelector(".stop").addEventListener("click", () => { paused = true; playBtn.textContent = "Resume"; });
  playBtn.addEventListener("click", () => {
    if (playBtn.textContent === "Play again") { playing = true; goTo(0, false); return; }
    paused = !paused; playBtn.textContent = paused ? "Resume" : "Pause"; if (!paused) playing = true;
  });
  backBtn.addEventListener("click", () => goTo(Math.max(0, cur - 1), true));
  nextBtn.addEventListener("click", () => goTo(Math.min(S.length - 1, cur + 1), true));
  replay.addEventListener("click", () => { playing = true; goTo(0, false); });
  sp.addEventListener("change", () => { speed = Number(sp.value); });
  window.addEventListener("resize", () => setView(view.z, view.tx, view.ty, false));
  setView(1, 0, 0, false);
  goTo(0, false);
}
