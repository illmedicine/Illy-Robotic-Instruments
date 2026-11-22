import { h, icon } from "../dom.js";
import { api } from "../api.js";
import { pageHead } from "./common.js";

const banner = (kind, ...kids) => h("div", { class: `banner ${kind}` }, ...kids);
const card = (title, ...kids) => h("div", { class: "card" }, h("h3", { text: title }), ...kids);
const fail = (e) => banner("error", e.message);

// Edit or build a flow in a private browser the server runs for this person. They sign in as themselves; the AI can work the window one approved step at a time.
export async function render() {
  const root = h("div", {}, pageHead("Edit in Power Automate", "Open your flow in a browser window that Platform Manager runs for you, sign in as yourself, and edit it by hand or let the AI work the screen while you watch."));
  const st = await api.browser.status();
  if (!st.available) {
    root.append(banner("info", icon("shield"), st.why || "This is not available."));
    root.append(card("How it works", h("p", { class: "muted", text: "Platform Manager opens a private browser window for you, you sign in to Microsoft in it, and every change is made by you, with your own rights. The AI only works the window after you ask it to and approve what it does." })));
    return root;
  }
  const stage = h("div", {});
  root.append(banner("info", icon("shield"), `You sign in to Microsoft inside the window below, as yourself. Your keystrokes pass through the server to the window but are not logged or stored; the window is private to you, and it closes after ${st.idleMinutes} minutes without activity or when you stop it.`), stage);

  const flows = await api.flowRepair.flows().catch((e) => ({ flows: [], error: e.message, note: "" }));
  const sel = h("select", { class: "input", "aria-label": "Your flows" });
  const fill = (list) => sel.replaceChildren(h("option", { value: "", text: list.length ? "Choose a flow to edit" : "No flows found for you" }),
    ...list.map((f) => h("option", { value: `${f.env}|${f.id}`, text: `${f.name} (${f.envName}${f.via === "co-owner" ? ", you co-own" : ""})` })));
  fill(flows.flows);
  const note = h("div", { class: "muted", text: "Only flows you own or co-own can be opened for editing." });
  const find = h("button", { class: "btn", type: "button" }, "Find flows I co-own");
  find.addEventListener("click", async () => {
    find.disabled = true;
    note.textContent = "Looking through the failing flows for ones you co-own. This can take a minute...";
    try { const r = await api.flowRepair.flows(true); fill(r.flows); note.textContent = `${r.flows.length} flow(s) found. A healthy flow you co-own is not searched: paste its link.`; } catch (e) { note.textContent = e.message; }
    find.disabled = false;
  });
  const link = h("input", { class: "input", type: "text", placeholder: "or paste the flow's link from Power Automate", "aria-label": "Flow link" });
  const edit = h("button", { class: "btn primary", type: "button" }, "Open this flow");
  const create = h("button", { class: "btn", type: "button" }, "Build a new flow");
  const begin = async (body) => {
    edit.disabled = create.disabled = true;
    stage.replaceChildren(h("div", { class: "empty", text: "Opening the browser window..." }));
    try { await session(await api.browser.post("start", body)); } catch (e) { stage.replaceChildren(fail(e)); edit.disabled = create.disabled = false; }
  };
  edit.addEventListener("click", () => {
    if (link.value.trim()) return begin({ mode: "flow", link: link.value.trim() });
    if (!sel.value) return stage.replaceChildren(banner("info", "Choose a flow or paste its link first."));
    const [env, flow] = sel.value.split("|");
    return begin({ mode: "flow", env, flow });
  });
  create.addEventListener("click", () => begin({ mode: "new" }));
  stage.replaceChildren(card("1. What do you want to do?", flows.error ? banner("error", flows.error) : null, sel, note, h("div", { class: "actions" }, find), link, h("div", { class: "actions" }, edit, create)));
  if (st.session) stage.append(banner("info", "You already have a window open. Starting a new one closes it."));

  async function session(s) {
    const [W, H] = s.viewport, id = s.id;
    let alive = true, inFlight = Promise.resolve(), typed = "", typeTimer = null, wheel = 0, wheelTimer = null;
    const screen = h("canvas", { class: "remote-screen", width: String(W), height: String(H), tabindex: "0", "aria-label": "Browser window. Click it, then type." });
    const ctx = screen.getContext("2d");
    const where = h("span", { class: "muted", text: "" });
    const left = h("span", { class: "muted", text: "" });
    const send = (body) => (inFlight = inFlight.then(() => api.browser.post("input", { id, ...body })).catch(() => null));
    const flushText = () => { clearTimeout(typeTimer); if (typed) { const t = typed; typed = ""; send({ kind: "text", text: t }); } };
    const pos = (ev) => { const r = screen.getBoundingClientRect(); return { x: Math.round((ev.clientX - r.left) * W / r.width), y: Math.round((ev.clientY - r.top) * H / r.height) }; };
    screen.addEventListener("mousedown", (ev) => { screen.focus(); flushText(); send({ kind: "click", ...pos(ev) }); });
    screen.addEventListener("keydown", (ev) => {
      if (ev.key === "v" && (ev.ctrlKey || ev.metaKey)) return; // the paste event carries the text
      if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey) { ev.preventDefault(); typed += ev.key; clearTimeout(typeTimer); typeTimer = setTimeout(flushText, 120); return; }
      const key = ev.ctrlKey && ["a", "c", "z", "y"].includes(ev.key.toLowerCase()) ? `Control+${ev.key.toLowerCase()}` : ev.key;
      if (!["Enter", "Tab", "Escape", "Backspace", "Delete", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End", "PageDown", "PageUp"].includes(key) && !key.startsWith("Control+")) return;
      ev.preventDefault(); flushText(); send({ kind: "key", key });
    });
    screen.addEventListener("paste", (ev) => { ev.preventDefault(); typed += ev.clipboardData.getData("text").slice(0, 2000); flushText(); });
    screen.addEventListener("wheel", (ev) => { ev.preventDefault(); wheel += ev.deltaY; clearTimeout(wheelTimer); wheelTimer = setTimeout(() => { const dy = wheel; wheel = 0; send({ kind: "scroll", dy }); }, 100); }, { passive: false });
    const back = h("button", { class: "btn", type: "button" }, "Back");
    back.addEventListener("click", () => send({ kind: "back" }));
    const stop = h("button", { class: "btn", type: "button" }, "Close the window");
    const ended = (text) => { alive = false; stage.replaceChildren(card("Window closed", h("p", { class: "muted", text: text || "The browser window is closed." }), h("div", { class: "actions" }, h("button", { class: "btn primary", type: "button", onclick: () => render().then((r) => root.replaceWith(r)) }, "Start again")))); };
    stop.addEventListener("click", async () => { alive = false; try { await api.browser.post("stop", { id }); } catch { /* already closed */ } ended("You closed the window. Nothing from it is kept."); });

    const frames = async () => {
      while (alive && root.isConnected) {
        try {
          const r = await fetch(`/api/browser/frame?id=${id}`, { credentials: "same-origin" });
          if (r.ok) ctx.drawImage(await createImageBitmap(await r.blob()), 0, 0);
          else if (r.status === 404 || r.status === 410) return ended("The window closed (idle or time limit).");
        } catch { /* try again */ }
        await new Promise((ok) => setTimeout(ok, 600));
      }
      if (alive) { alive = false; api.browser.post("stop", { id }).catch(() => null); }
    };

    // The AI panel
    const goal = h("textarea", { class: "input", maxlength: "1000", placeholder: "What should the AI do in this window? For example: add a step that posts a Teams message when the flow fails.", "aria-label": "What the AI should do" });
    const auto = h("select", { class: "select", "aria-label": "Steps the AI may take without asking" },
      [["0", "Ask me before every step"], ["3", "Up to 3 safe steps without asking"], ["5", "Up to 5 safe steps without asking"], ["10", "Up to 10 safe steps without asking"]].map(([v, t]) => h("option", { value: v, text: t })));
    const go = h("button", { class: "btn primary", type: "button", disabled: !st.aiEnabled }, h("span", { class: "spark" }), "Let the AI work");
    const next = h("button", { class: "btn", type: "button", disabled: true }, "Next step");
    const log = h("ol", {}), proposal = h("div", {}), msg = h("div", {});
    const line = (s, result) => log.append(h("li", {}, s.text, result ? h("span", { class: "muted", text: ` - ${result}` }) : null));
    const lock = (on) => { go.disabled = on || !st.aiEnabled; next.disabled = on; };
    async function ask(first) {
      lock(true); proposal.replaceChildren(); msg.replaceChildren(h("div", { class: "empty", text: "The AI is looking at the page..." }));
      try {
        let r = await api.browser.post("ai/next", first ? { id, goal: goal.value, auto: Number(auto.value) } : { id });
        if (first) log.replaceChildren();
        while (r.executed) {
          line(r.step, r.result);
          if (!(r.autoLeft > 0)) { msg.replaceChildren(banner("info", "The AI used the steps you allowed. Review the window, then ask for the next step.")); lock(false); return; }
          msg.replaceChildren(h("div", { class: "empty", text: "The AI is looking at the page..." }));
          r = await api.browser.post("ai/next", { id });
        }
        msg.replaceChildren();
        if (r.finished) { msg.replaceChildren(banner(r.kind === "ask" ? "demo" : "info", h("b", { text: r.kind === "ask" ? "The AI needs you: " : "The AI says it is done: " }), r.message || "")); lock(false); next.disabled = true; return; }
        const ok = h("button", { class: "btn primary", type: "button" }, "Approve");
        const skip = h("button", { class: "btn", type: "button" }, "Skip");
        const decide = async (decision) => {
          ok.disabled = skip.disabled = true;
          try { const d = await api.browser.post("ai/decide", { id, step: r.step.id, decision }); line(r.step, decision === "skip" ? "skipped" : d.result); await ask(false); } catch (e) { msg.replaceChildren(fail(e)); lock(false); }
        };
        ok.addEventListener("click", () => decide("approve")); skip.addEventListener("click", () => decide("skip"));
        proposal.replaceChildren(banner(r.step.risky ? "demo" : "info", h("div", {}, h("b", { text: r.step.text }), r.step.reason ? h("div", { class: "muted", text: r.step.reason }) : null,
          r.step.risky ? h("div", { class: "muted", text: "This kind of step always needs your approval." }) : null), h("div", { class: "actions" }, ok, skip)));
        lock(false); go.disabled = !st.aiEnabled; next.disabled = true;
      } catch (e) { msg.replaceChildren(fail(e)); proposal.replaceChildren(); lock(false); }
    }
    go.addEventListener("click", () => ask(true));
    next.addEventListener("click", () => ask(false));

    stage.replaceChildren(
      card("2. Your browser window", h("div", { class: "actions" }, back, stop, where, left), screen,
        h("p", { class: "muted", text: "The first load takes up to 30 seconds. Click inside the window and type to use it yourself. Sign in to Microsoft here if it asks." })),
      card("3. Let the AI help (optional)", st.aiEnabled ? null : banner("info", "The AI model is off, so you can only work the window by hand."), goal, h("div", { class: "actions" }, auto, go, next),
        h("p", { class: "muted", text: "The AI sees the page's visible text and controls (not password fields) and never types into a password field. Anything that deletes, shares, sends, runs, tests or publishes always waits for your approval." }), msg, proposal, log));
    frames();
    (async function poll() {
      while (alive && root.isConnected) {
        try { const s2 = await api.browser.state(id); where.textContent = (s2.url || "").replace(/^https:\/\//, "").slice(0, 80); left.textContent = `closes after ${Math.max(1, Math.ceil(s2.secondsLeft / 60))} min without activity`; } catch { /* the frame loop reports a closed window */ }
        await new Promise((ok) => setTimeout(ok, 3000));
      }
    })();
  }
  return root;
}
