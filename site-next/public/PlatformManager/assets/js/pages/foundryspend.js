import { h, icon, pill, fmt } from "../dom.js";
import { api } from "../api.js";
import { pageHead } from "./common.js";
import { usd, still, BASIS } from "./foundrykit.js";
import { kpi, aiBanners } from "./foundry.js";

// Azure AI Foundry > AI spend: what a prompt costs, when a seat pays for itself, who uses free Copilot Chat, and what each path costs a month.
// Everything is read from the tenant's own licence and audit data. Nothing here is typed in; the few stated prices are shown with their source.

const usd2 = (v) => (typeof v === "number" ? "$" + v.toFixed(2) : "-");
const basis = (b) => pill(...(BASIS[b] || [b, ""]));

function countUp(el, to, f = usd) {
  if (still() || !(Math.abs(to) > 0)) { el.textContent = f(to || 0); return; }
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 1000);
    el.textContent = f(Math.round(to * (1 - Math.pow(1 - k, 3))));
    if (k < 1 && el.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Horizontal bars that grow in. `tone` colours one row (ok, warn, risk).
export function hbars(rows, unit = "") {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return h("div", { class: "hbars" }, rows.map((r) => {
    const fill = h("i", { class: "hb-fill " + (r.tone || "") });
    fill.style.width = "0%";
    requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = Math.max(r.value ? 2 : 0, (r.value / max) * 100) + "%"; }));
    return h("div", { class: "hrow" }, h("span", { class: "hb-label", text: r.label }), h("span", { class: "hb-track" }, fill), h("b", { class: "hb-val", text: fmt.n(r.value) + unit }));
  }));
}

function pathCard(title, sub, p, tone, unmeasured) {
  const pos = p.lines.filter((l) => l.monthly > 0);
  const big = h("div", { class: "fx-num fpath-big", text: "0" });
  countUp(big, p.monthly);
  const bar = h("div", { class: "fbar" }, pos.map((l, i) => { const s = h("div", { class: `fseg c${i % 8}`, title: `${l.label}: ${usd(l.monthly)}` }); s.style.flexGrow = String(l.monthly / (pos.reduce((a, b) => a + b.monthly, 0) || 1)); return s; }));
  return h("div", { class: "card fpath " + tone },
    h("h3", {}, title, h("span", { class: "sub", text: sub })),
    h("div", { class: "fpath-top" }, big, h("small", { text: `a month, ${usd(p.monthly * 12)} a year` })), bar,
    h("div", { class: "flegend" }, pos.map((l, i) => h("span", {}, h("i", { class: `c${i % 8}` }), `${l.label} ${usd(l.monthly)}`))),
    h("table", { class: "ftable" }, h("tbody", {}, p.lines.map((l) => h("tr", {}, h("td", {}, l.label, l.note ? h("div", { class: "muted", text: l.note }) : null),
      h("td", { class: "num", text: l.monthly == null ? "not counted" : (l.monthly < 0 ? "-" : "") + usd(Math.abs(l.monthly)) }), h("td", {}, basis(l.basis)))))),
    unmeasured && p.lines.some((l) => l.basis === "unmeasured") ? h("p", { class: "muted", text: "Lines marked Not measured are left out of the total, so this path costs at least this much." }) : null);
}

// The three monthly landscapes side by side with the verdict on the future path. Used here and on the AI topology page.
export function pathCards(s) {
  const p = s.paths, hasTarget = Boolean(p.target), short = Math.max(0, (p.target || 0) - p.savingVsE7), pct = hasTarget ? Math.max(0, Math.min(100, (p.savingVsE7 / p.target) * 100)) : 0;
  const fill = h("i", { class: "hb-fill " + (p.meetsTarget ? "ok" : "warn") });
  fill.style.width = "0%";
  requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = pct + "%"; }));
  const big = h("div", { class: "fx-num fpath-big", text: "0" });
  countUp(big, Math.abs(p.savingVsE7));
  return h("div", {},
    h("div", { class: "fpaths" },
      pathCard("Today", "as bought now", p.today, "n", true),
      pathCard("Current direction", "upgrade everyone to E7", p.e7, "bad", true),
      pathCard("Future", "E5 for everyone, Foundry for the rest", p.future, "good", true)),
    h("div", { class: "card fverdict " + (p.savingVsE7 >= 0 ? "good" : "warn") },
      h("h3", { text: "Future compared with the current direction" }),
      h("div", { class: "fpath-top" }, big, h("small", { text: p.savingVsE7 >= 0 ? "a month less than the E7 direction" : "a month more than the E7 direction" })),
      hasTarget ? h("div", { class: "hrow" }, h("span", { class: "hb-label", text: `Your target: ${usd(p.target)} a month` }), h("span", { class: "hb-track tall" }, fill), h("b", { class: "hb-val", text: Math.round(pct) + "%" })) : null,
      hasTarget ? h("p", { text: p.meetsTarget ? "On these figures the future path meets the target." : p.savingVsE7 >= 0 ? `On these figures it is ${usd(short)} a month short of the target.` : "On these figures the future path costs more than the E7 direction, so the target is not met." })
        : h("p", { text: p.savingVsE7 >= 0 ? "On these figures the future path costs less than the E7 direction." : "On these figures the future path costs more than the E7 direction." }),
      h("p", { class: "muted", text: `Compared with what is paid today the future path is ${p.savingVsToday >= 0 ? usd(p.savingVsToday) + " a month cheaper" : usd(-p.savingVsToday) + " a month dearer"}.` +
        (p.seatsKept != null ? ` It keeps ${fmt.n(p.seatsKept)} Copilot seats: ${fmt.n(p.seatsAdded)} go to people on free Copilot Chat whose use pays for one, and ${fmt.n(p.seatsReclaimed)} current seats are reclaimed.` : "") }),
      p.unmeasured.length ? h("div", { class: "banner info" }, icon("alert"), `Not measured, so left out of both totals: ${[...new Set(p.unmeasured)].join(", ")}.`) : null));
}

export async function spend() {
  const land = await api.foundry.landscape();
  const s = land.spend;
  const root = h("div", {}, pageHead("AI spend", "What a prompt costs, when a seat pays for itself, who is on free Copilot Chat, and what each path costs a month. Read from the tenant's own licence and audit data: nothing is typed in."), ...aiBanners(land.ai));
  if (!s.available) return root.append(h("div", { class: "banner info" }, icon("alert"), s.why)), root;
  const be = s.breakeven, pp = s.perPrompt, bs = s.basic, cur = s.currency === "USD" ? "$" : s.currency + " ";
  root.append(s.measured
    ? h("div", { class: "banner info" }, icon("alert"), `Prompt counts come from the Copilot audit log for ${s.window.days} day${s.window.days === 1 ? "" : "s"} (${s.window.from} to ${s.window.to}), scaled to a month, so treat them as estimates. A longer read makes them steadier.`)
    : h("div", { class: "banner info" }, icon("alert"), "No Copilot prompt counts have been read yet, so the per-prompt figures below are blank. Seat and E7 figures still come from licences."));

  root.append(h("div", { class: "grid g-kpi" },
    kpi("Average cost of a prompt on a seat", pp ? usd2(pp.allSeats) : "-", pp ? `all ${s.people.copilotLicensed} seats, idle ones included. A typical active seat: ${usd2(pp.medianActiveSeat)} at ${pp.medianPromptsActiveSeat} prompts a month` : "needs audit data"),
    kpi("Prompts a month for a seat to pay back", fmt.n(be.worthIt), `at 5 minutes saved a prompt and ${cur}${be.loadedHourly} an hour. At ${cur}${be.pilotPrice} a pilot prompt it is ${be.vsPilotPrice}`),
    kpi("Seats below break-even", pp ? `${fmt.n(pp.seatsBelowBreakEven)} of ${fmt.n(s.people.copilotLicensed)}` : "-", pp ? `${fmt.n(pp.seatsIdle)} show no prompts at all` : "needs audit data"),
    kpi("People on free Copilot Chat", bs ? fmt.n(bs.people) : "-", bs ? `using Copilot with no seat; median ${bs.medianPrompts} prompts a month` : "needs audit data"),
    kpi("Of them, enough use to justify a seat", bs ? fmt.n(bs.wouldJustifyASeat) : "-", bs ? `${be.worthIt} or more prompts a month` : "needs audit data")));

  // ---- is a seat worth it
  const hours = be.loadedHourly;
  root.append(h("div", { class: "section" }, h("h2", { text: "Is a " + cur + s.seat.price + " seat worth it?" }),
    h("div", { class: "grid g-2" },
      h("div", { class: "card" }, h("h3", { text: "Prompts a month a seat needs" }),
        h("table", { class: "ftable" }, h("thead", {}, h("tr", {}, ["If each prompt saves", "Prompts a month to pay back", "Basis"].map((c) => h("th", { text: c })))),
          h("tbody", {}, be.byTime.map((t) => h("tr", { class: t.prompts === be.worthIt ? "hl" : "" }, h("td", { text: `${t.minutes} minutes of a ${cur}${hours} an hour person` }), h("td", { class: "num", text: fmt.n(t.prompts) }), h("td", {}, basis("assumed")))),
            h("tr", {}, h("td", { text: `Or when the alternative is a ${cur}${be.pilotPrice} pilot prompt (Cowork, Claude)` }), h("td", { class: "num", text: fmt.n(be.vsPilotPrice) }), h("td", {}, basis(s.statedKeys.includes("pilotPerPrompt") ? "stated" : "assumed"))))),
        pp ? h("p", { class: "muted", text: `${fmt.n(pp.seatsCostlierThanPilotPrompt)} current seats are used fewer than ${be.vsPilotPrice} times a month, so each of their prompts costs more than a ${cur}${be.pilotPrice} pilot prompt.` }) : null),
      h("div", { class: "card" }, h("h3", {}, "Current seats by prompts a month", h("span", { class: "sub", text: `break-even ${be.worthIt}` })),
        pp ? hbars(pp.bands.map((b, i) => ({ label: b.label, value: b.people, tone: i < 2 ? (i === 0 ? "risk" : "warn") : "ok" })), " people") : h("p", { class: "muted", text: "Needs audit data." })))));

  // ---- free Copilot Chat
  root.append(h("div", { class: "section" }, h("h2", { text: "Free Copilot Chat" }),
    bs ? h("div", { class: "grid g-2" },
      h("div", { class: "card" }, h("h3", {}, "People without a seat, by prompts a month", h("span", { class: "sub", text: `${fmt.n(bs.people)} people, ${fmt.n(bs.onE5)} on E5` })),
        hbars(bs.steps.map((t) => ({ label: `${t.atLeast} or more`, value: t.people, tone: t.atLeast <= be.worthIt ? "ok" : "" })), " people"),
        h("p", { class: "muted", text: `${fmt.n(bs.wouldJustifyASeat)} of them already use Copilot at least ${be.worthIt} times a month, which is where a seat starts to pay back. They are the first people the future path gives a seat.` })),
      h("div", { class: "card" }, h("h3", { text: "Where they use it" }), bs.apps.length ? hbars(bs.apps.map((a) => ({ label: a.app, value: a.events })), " events") : h("p", { class: "muted", text: "No app detail in the audit data." }),
        h("p", { class: "muted", text: "Counted from Copilot audit events of people who hold no Copilot licence." }))) : h("div", { class: "banner info", text: "Needs audit data." })));

  // ---- landscapes
  root.append(h("div", { class: "section" }, h("h2", { text: "Spend landscapes, a month" }),
    h("p", { class: "muted", text: "Everyone stays on E5 in the future path, premium Copilot seats go only to people whose use pays for one, and every other agent, pilot and builder runs through Foundry." }), pathCards(s)));

  // ---- what is behind the numbers
  const st = s.stated;
  root.append(h("div", { class: "section" }, h("h2", { text: "Where the numbers come from" }),
    h("div", { class: "card" }, h("table", { class: "ftable" }, h("thead", {}, h("tr", {}, ["Figure", "Value", "Basis"].map((c) => h("th", { text: c })))),
      h("tbody", {},
        [["Copilot seat price", `${cur}${s.seat.price} a month. ${s.seat.source}`, "list"], ["Seats and people", `${fmt.n(s.people.copilotLicensed)} Copilot seats, ${fmt.n(s.people.e5)} people on E5 of ${fmt.n(s.people.members)} in the directory`, "measured"],
          ["Prompts by person", s.measured ? `Copilot audit events over ${s.window.days} days, scaled to a month` : "not read yet", s.measured ? "measured" : "unmeasured"],
          ["Cowork and Claude, per prompt", `${cur}${st.pilotPerPrompt}`, s.statedKeys.includes("pilotPerPrompt") ? "stated" : "assumed"], ["E5 and E7 per person a month", `${cur}${st.e5Price} and ${cur}${st.e7Price}; E7 includes Copilot, Agent 365 and the Entra Suite`, "list"],
          ...(st.savingsTargetMonthly ? [["Target saving", `${usd(st.savingsTargetMonthly)} a month`, "stated"]] : []), ["Value of a person's time", `${cur}${st.loadedHourly} an hour, and 2, 5 or 10 minutes saved a prompt`, "assumed"],
          ["Foundry platform and models", `${usd(s.platform.monthly)} a month for ${fmt.n(s.platform.users)} people at ${s.platform.assumptions.requestsPerUser} requests each: list prices for tokens, search, gateway, monitoring and safety`, "assumed"]]
          .map((r) => h("tr", {}, h("td", { text: r[0] }), h("td", { text: r[1] }), h("td", {}, basis(r[2])))))),
      h("p", { class: "muted", text: "To change a price or set a target, add foundry.spend to config/powerplatform.json (pilotPerPrompt, e5Price, e7Price, loadedHourly, savingsTargetMonthly)." }))));
  return root;
}
