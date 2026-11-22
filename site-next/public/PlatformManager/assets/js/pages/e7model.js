import { h, pill } from "../dom.js";
import { api } from "../api.js";
import { dataTable } from "../ui.js";
import { store } from "../analyze/core.js";
import { E7, IT_EFFECTS, coverageOf } from "../analyze/data/e7.js";
import { advisorBand } from "../analyze/data/peers.js";
import { e7Compare, e7Market, sensitivity } from "../analyze/engines/e7model.js";
import { usd } from "../analyze/engines/pricing.js";
import { empty, field, kpi, note, num, select } from "./widgets.js";

const KEY = "e7model";
const money0 = (n) => (Number.isFinite(n) ? usd(n, 0) : "-");
const n0 = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "-");
const pct = (x) => `${Math.round(x * 100)}%`;
const TONE = { easier: "ok", harder: "warn", same: "info" };
const EFFECT = { replaced: ["Replaced by E7", "ok"], included: ["Already inside E5", "info"], kept: ["Keep", "warn"], check: ["Check", ""] };

/** Keep Microsoft 365 E5 and today's add-ons, or move to E7: priced from the uploaded quotes and judged against usage, market and peers. */
export function e7Tab(c) {
  const root = h("div", {});
  let evidence; // undefined while loading, null when the server has none
  let person = null;
  api.e7Evidence().then((e) => { evidence = e; draw(); }).catch(() => { evidence = null; draw(); });

  async function lookUp(upn) {
    person = { upn, loading: true };
    draw();
    try {
      const profile = await api.personProfile(upn);
      let copilot = null;
      try { copilot = await api.personProduct("copilot", profile.upn); } catch { /* usage is optional */ }
      person = { upn, profile, copilot };
    } catch (e) {
      person = { upn, error: e.message };
    }
    draw();
  }

  function draw() {
    const over = store.get(KEY, {}) ?? {};
    const m = e7Compare(c.refRows, c.offers, over);
    if (!m) { root.replaceChildren(empty("No Microsoft 365 E7 line was read.", "Upload a quote that prices Microsoft 365 E7 next to E5 and this tab sets the two against each other.")); return; }
    const set = (patch) => { store.set(KEY, { ...over, ...patch }); draw(); };
    const reset = () => { store.set(KEY, {}); draw(); };
    const mk = e7Market(m, (id) => advisorBand(id, c.peerSeats));
    const ev = evidence?.copilot;
    const people = evidence?.people;
    const be = m.breakEven;
    const more = m.extraForE7 > 0;
    const active = ev?.measured ? ev.licensedActive : null;
    const mixedSave = m.keep - m.mixed.annual;

    const reading = [];
    reading.push(more
      ? `E7 for ${n0(m.seats)} users costs ${money0(m.extraForE7)} a year more than keeping E5 with the add-ons held today.`
      : `E7 for ${n0(m.seats)} users costs ${money0(-m.extraForE7)} a year less than keeping E5 with the add-ons held today.`);
    reading.push(`Per user, E7 costs ${usd(m.perUser.increment)} a month more than E5. Copilot alone costs ${usd(m.perUser.copilot)}, so for anyone who would hold Copilot anyway E7 is ${m.perUser.edge >= 0 ? `${usd(m.perUser.edge)} a month cheaper` : `${usd(-m.perUser.edge)} a month dearer`} than E5 plus Copilot, and for anyone who would not it is ${usd(m.perUser.increment)} a month of extra cost.`);
    if (more && be && !be.never) reading.push(`E7 for everyone breaks even only if about ${n0(be.seats)} users (${pct(be.share)} of the seats) would otherwise be given Copilot.`);
    if (active != null && more && be && !be.never) {
      reading.push(`${n0(active)} of the ${n0(people.copilotLicensed)} people holding Copilot were seen using it in the days the audit feed covers. ${active < be.seats ? `That is well short of the ${n0(be.seats)} needed, so on the usage seen E7 for everyone buys more Copilot than the organisation uses.` : `That reaches the ${n0(be.seats)} needed.`}`);
    }
    if (more && mixedSave > 0) reading.push(`The cheaper route on these prices is a mixed estate: E7 for the ${n0(m.mixed.seats)} users who would hold Copilot, E5 for the rest. It saves ${money0(mixedSave)} a year against keeping E5 and add-ons. It depends on Microsoft pricing E7 at this level for far fewer seats than the quote assumed.`);

    const modelRows = [
      { model: "Keep E5 and today's add-ons", perUser: m.perUserKeep, year: m.keep, what: `E5 at ${usd(m.e5)} for every seat, plus ${["copilot", "agent", "entra"].filter((k) => m.parts[k].seats).map((k) => `${m.parts[k].name} for ${n0(m.parts[k].seats)}`).join(", ") || "no add-ons"}.` },
      { model: "Mixed: E7 for Copilot users, E5 for the rest", perUser: m.mixed.annual / 12 / (m.seats || 1), year: m.mixed.annual, what: `E7 for ${n0(m.mixed.seats)} users at ${usd(m.e7)}, E5 for the other ${n0(m.seats - m.mixed.seats)}. The E7 price assumes Microsoft holds it at this seat count.` },
      { model: "E7, all in", perUser: m.e7, year: m.allIn, what: `E7 at ${usd(m.e7)} for every seat (${m.e7Exhibit}). Replaces E5, Copilot, Agent 365 and the Entra Suite.` },
      { model: "E5 plus every part for every user, bought separately", perUser: m.alaCarte / 12 / (m.seats || 1), year: m.alaCarte, what: "The price E7 is measured against: the same four parts bought one by one." },
    ];

    const partRow = (label, price, seats, k, source, fixedSeats) => h("tr", {},
      h("td", { text: label }),
      h("td", { class: "num" }, num(price, { "aria-label": `${label} price`, style: { width: "90px" }, onchange: (e) => set({ [k === "e5" ? "e5" : `${k}Price`]: e.target.value === "" ? null : Number(e.target.value) }) })),
      h("td", { class: "num" }, fixedSeats ? n0(m.seats) : num(seats, { "aria-label": `${label} seats`, style: { width: "90px" }, onchange: (e) => set({ [`${k}Seats`]: e.target.value === "" ? null : Number(e.target.value) }) })),
      h("td", { class: "muted", text: source }));

    /* ---------- what usage says ---------- */
    const usageCard = () => {
      if (evidence === undefined) return h("p", { class: "muted", text: "Reading licence and Copilot usage data..." });
      if (!evidence || !people) return note("No licence or usage data has been read from the tenant yet, so this tab cannot say who uses Copilot. Run a sync, then reopen it.", "demo");
      const rows = [
        { measure: "People on E5 (as one suite or as the Office 365 E5 + EMS E5 stack)", value: n0(people.e5Class), basis: "Entra licence assignments" },
        { measure: "People holding a Microsoft 365 Copilot licence", value: n0(people.copilotLicensed), basis: "Entra licence assignments" },
        ev.measured ? { measure: "Of those, seen using Copilot (at least one prompt)", value: `${n0(ev.licensedActive)} (${pct(ev.activeShareOfLicensed ?? 0)})`, basis: `Purview audit log, ${ev.window ? `${ev.window.from} to ${ev.window.to}` : "the days read"}` } : null,
        ev.measured ? { measure: "Of those, not seen using it", value: n0(ev.licensedIdle), basis: "Absence from the audit window, not proof of no use" } : null,
        ev.measured ? { measure: "Active licence holders with 10 or more prompts / 30 or more", value: `${n0(ev.promptSteps[1]?.users)} / ${n0(ev.promptSteps[2]?.users)}`, basis: "Heavy use, same window" } : null,
        ev.measured ? { measure: "People using Copilot without a Copilot licence", value: `${n0(ev.unlicensedActive)} (${n0(ev.unlicensedActiveOnE5)} on E5)`, basis: "Likely the free Copilot Chat; the first candidates if more licences are bought" } : null,
        ev.measured ? { measure: "People who used agents through Copilot", value: n0(ev.agentUsers), basis: "Agent interactions in the same events" } : null,
        { measure: "Power Platform premium licence holders / seen signing in to the maker portals", value: `${n0(people.powerPlatformPremium)} / ${n0(people.powerPlatformPremiumSignedIn)}`, basis: "Stay under E7: not among the four parts named for it" },
        { measure: "Entra Suite and Agent 365 use", value: "not measured", basis: "The app has no usage source for them. Check Entra Private Access / Internet Access sign-ins, ID Governance access reviews and the agent registry." },
      ].filter(Boolean);
      return h("div", {},
        dataTable({ rows, csvName: "e7-usage-evidence", pageSize: 20, columns: [{ key: "measure", label: "Measure" }, { key: "value", label: "Value", num: true }, { key: "basis", label: "Where it comes from", render: (r) => h("span", { class: "muted", style: { whiteSpace: "normal" }, text: r.basis }) }] }),
        evidence.pull ? h("p", { class: "muted", text: `The Copilot read covered ${evidence.pull.days ?? "?"} days and ${n0(evidence.pull.events)} events for ${n0(evidence.pull.people)} people${evidence.pull.truncated ? ", and stopped at its size limit, so some activity is missing" : ""}. Current holders chose to use Copilot, so their rate is likely higher than a rollout to everyone would reach.` }) : null,
        active != null ? h("div", { class: "toolbar" },
          people.copilotLicensed !== m.parts.copilot.seats ? h("button", { class: "btn", type: "button", onclick: () => set({ copilotSeats: people.copilotLicensed }) }, `Use the ${n0(people.copilotLicensed)} Copilot licences held in Entra (the quote prices ${n0(m.parts.copilot.seats)})`) : null,
          h("button", { class: "btn", type: "button", onclick: () => set({ mixedSeats: active }) }, `Size the mixed estate at the ${n0(active)} active Copilot users`)) : null);
    };

    /* ---------- market and peers ---------- */
    const peerRows = [
      { measure: "Published list price (annual commitment)", value: usd(mk.list), note: "Analyst and reseller pages; Microsoft's own page names the contents but its price could not be read." },
      { measure: "Reported introductory discount, orders before " + mk.promo.until, value: mk.promo.tiers.map((t) => `${usd(t.price)} for ${t.minSeats}+ seats`).join("; "), note: m.promo ? `${usd(m.e7)} quoted is ${m.e7 < m.promo.price ? "below" : "above"} the ${usd(m.promo.price)} that applies at ${n0(m.seats)} seats.` : "" },
      { measure: "The four parts at list, bought separately", value: usd(mk.partsList), note: `E5 ${usd(E7.parts.e5.listUsd)} + Copilot ${usd(E7.parts.copilot.listUsd)} + Agent 365 ${usd(E7.parts.agent.listUsd)} + Entra Suite ${usd(E7.parts.entra.listUsd)}.` },
      { measure: "Your organization's E7 price in the quote", value: `${usd(m.e7)} (${mk.offList.toFixed(1)}% off list)`, note: m.e7Exhibit },
      { measure: "Your organization's E5 price in the quote", value: `${usd(m.e5)} (${mk.e5Discount.toFixed(1)}% off the ${usd(E7.parts.e5.listUsd)} list)`, note: m.e5Source },
      mk.e5Band ? { measure: `Peer discount range for E5, ${c.peerTier.label}`, value: `${mk.e5Band.low}% to ${mk.e5Band.high}%`, note: "Advisory-firm benchmark of 142 renewals; cannot be verified. Your organization's E5 discount sits " + (mk.e5Discount < mk.e5Band.low ? "below" : mk.e5Discount > mk.e5Band.high ? "above" : "within") + " it." } : null,
      mk.peerRange ? { measure: "E7 if peers got the same discount off $99", value: `${usd(mk.peerRange.low)} to ${usd(mk.peerRange.high)}`, note: `No benchmark exists for E7 yet; this carries the E5 range over. The quote is ${mk.position} it.` } : null,
      mk.sumAtPeer != null ? { measure: "The four parts at peer discounts (E5 and Copilot bands; the other two at list)", value: usd(mk.sumAtPeer), note: `E7 at ${usd(m.e7)} is ${m.e7 < mk.sumAtPeer ? usd(mk.sumAtPeer - m.e7) + " below" : usd(m.e7 - mk.sumAtPeer) + " above"} this.` } : null,
    ].filter(Boolean);

    /* ---------- IT effects ---------- */
    const gain = people ? Math.max(0, m.seats - people.copilotLicensed) : Math.max(0, m.seats - m.parts.copilot.seats);
    const effects = h("div", {}, IT_EFFECTS.map((x) => h("div", { class: "card", style: { marginBottom: "8px" } },
      h("h4", { style: { margin: "0 0 4px" } }, x.area, " ", pill(x.direction === "easier" ? "easier" : x.direction === "harder" ? "more work" : "no change", TONE[x.direction]), " ", pill(x.basis, x.basis === "Verify" ? "warn" : "info")),
      h("p", { class: "muted", style: { margin: 0 }, text: x.text }))));

    /* ---------- one person ---------- */
    const personBox = () => {
      const input = h("input", { class: "input", type: "text", placeholder: "first.last@example.com", "aria-label": "Person to check", value: person?.upn ?? "", style: { minWidth: "280px" } });
      const go = () => { const v = input.value.trim(); if (v) lookUp(v); };
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
      let result = null;
      if (person?.loading) result = h("p", { class: "muted", text: "Looking up..." });
      else if (person?.error) result = note(person.error, "error");
      else if (person?.profile) {
        const p = person.profile;
        const rows = (p.licences ?? []).map((s) => ({ sku: s, ...coverageOf(s) }));
        const replaced = rows.filter((r) => r.effect === "replaced" || r.effect === "included");
        const kept = rows.filter((r) => r.effect === "kept" || r.effect === "check");
        const cs = person.copilot?.stats ?? [];
        const stat = (l) => cs.find((s) => s.label === l)?.value;
        result = h("div", {},
          h("p", {}, h("b", { text: p.name || p.upn }), ` holds ${rows.length} licence${rows.length === 1 ? "" : "s"}. ${replaced.length ? `${replaced.length} would be covered by E7 (or are already inside E5).` : "None would be replaced."} ${kept.length ? `${kept.length} would stay.` : ""}`),
          person.copilot ? h("p", { class: "muted", text: `Copilot use seen: ${stat("Prompts entered") ?? "-"} prompts, ${stat("Chats") ?? "-"} chats, ${stat("Days with use") ?? "-"} days with use, ${stat("Apps used") ?? "-"} apps.` }) : null,
          dataTable({ rows, csvName: "e7-person", pageSize: 30, columns: [{ key: "sku", label: "Licence held today" }, { key: "effect", label: "Under E7", render: (r) => pill(EFFECT[r.effect][0], EFFECT[r.effect][1]) }, { key: "why", label: "Why", render: (r) => h("span", { class: "muted", style: { whiteSpace: "normal" }, text: r.why }) }] }),
          h("p", { class: "muted", text: "What the desk would do for this person: assign E7 (through the licence group), remove the stand-alone Copilot licence and any E5 or EMS stack that E7 replaces so nothing is paid twice, and leave the licences marked Keep. Their Copilot access itself would not change." }));
      }
      return h("div", {}, h("div", { class: "toolbar" }, input, h("button", { class: "btn", type: "button", onclick: go }, "Check")), result);
    };

    root.replaceChildren(
      h("div", { class: "grid g-kpi" },
        kpi("Keep E5 and add-ons", money0(m.keep), "per year"),
        kpi("E7, all in", money0(m.allIn), "per year"),
        kpi(more ? "E7 costs more by" : "E7 costs less by", money0(Math.abs(m.extraForE7)), "per year", more ? "warn" : ""),
        kpi("Mixed estate saves", money0(Math.max(0, mixedSave)), `E7 for ${n0(m.mixed.seats)} users only`),
        kpi("Copilot seats to break even", be ? (be.never ? "never" : be.always ? "0" : n0(be.seats)) : "-", be && !be.never && !be.always ? `${pct(be.share)} of seats` : "")),
      h("div", { class: "card" }, h("h3", { text: "Reading" }), ...reading.map((t) => h("p", { text: t }))),
      h("h3", { text: "The models" }),
      dataTable({ rows: modelRows, csvName: "e5-vs-e7", pageSize: 10,
        columns: [{ key: "model", label: "Model" }, { key: "perUser", label: "Per user / month", num: true, render: (r) => usd(r.perUser) }, { key: "year", label: "Per year", num: true, render: (r) => money0(r.year) },
          { key: "what", label: "What it covers", render: (r) => h("span", { style: { whiteSpace: "normal" }, text: r.what }) }] }),
      h("h3", { text: "What usage says" }),
      usageCard(),
      h("h3", { text: "How much Copilot use would justify E7" }),
      h("p", { class: "muted", text: "If this share of the E7 users really used Copilot, what E7 costs over E5 with Copilot bought only for those users. Where E7 still costs more, the last column is the share of users who would also have to use the Entra Suite and Agent 365 for E7 to break even." }),
      dataTable({ rows: sensitivity(m), csvName: "e7-sensitivity", pageSize: 10,
        columns: [{ key: "share", label: "Share who use Copilot", render: (r) => pct(r.share) }, { key: "users", label: "Users", num: true, render: (r) => n0(r.users) },
          { key: "perUserGap", label: "E7 over E5 + Copilot, per user / month", num: true, render: (r) => (r.perUserGap <= 0 ? `${usd(-r.perUserGap)} cheaper` : usd(r.perUserGap)) },
          { key: "extraYear", label: "Per year", num: true, render: (r) => (r.extraYear <= 0 ? `-${money0(-r.extraYear)}` : money0(r.extraYear)) },
          { key: "neededUse", label: "Entra Suite and Agent 365 use needed to break even", num: true, render: (r) => (r.extraYear <= 0 ? "none" : r.impossible ? "not enough even at full use" : pct(r.neededUse)) }] }),
      h("h3", { text: "E7 against the market and peers" }),
      dataTable({ rows: peerRows, csvName: "e7-market-peers", pageSize: 20,
        columns: [{ key: "measure", label: "Measure" }, { key: "value", label: "Value", num: true }, { key: "note", label: "Note", render: (r) => h("span", { class: "muted", style: { whiteSpace: "normal" }, text: r.note }) }] }),
      h("h3", { text: "Where E7 sits against the other quotes" }),
      dataTable({ rows: m.compared, csvName: "e7-price-comparison", pageSize: 25,
        columns: [{ key: "exhibit", label: "Exhibit", render: (r) => h("span", {}, pill(r.exhibit, "info"), r.id === m.e7Id ? pill("used above", "ok") : null) },
          { key: "price", label: "E7 per user / month", num: true, render: (r) => usd(r.price) },
          { key: "e5", label: "E5 in the same exhibit", num: true, render: (r) => (r.e5 == null ? "-" : usd(r.e5)) },
          { key: "overE5", label: "E7 costs over E5", num: true, render: (r) => (r.overE5 == null ? "-" : usd(r.overE5)) },
          { key: "alaCarte", label: "E5 plus every part, separately", num: true, render: (r) => usd(r.alaCarte) },
          { key: "offList", label: `Off the ${usd(m.list, 0)} list`, num: true, render: (r) => `${r.offList.toFixed(1)}%` }] }),
      h("h3", { text: "What E7 means for the IT desk" }),
      h("p", { class: "muted", text: `${n0(gain)} more people would be able to use Copilot than today. Each item says how firm it is: Documented is a general licensing fact, Inference follows from how the products work, Verify depends on how Microsoft packages E7 and needs checking before it is relied on.` }),
      effects,
      h("h3", { text: "Check one person" }),
      h("p", { class: "muted", text: "Enter an address to see what E7 would do to each licence that person holds, with their Copilot use alongside." }),
      personBox(),
      h("div", { class: "toolbar", style: { marginTop: "14px" } },
        field("E7 price to use", select(m.e7Options.map((x) => [x.id, `${x.exhibit}: ${usd(x.price)}`]), m.e7Id, { onchange: (e) => set({ e7: e.target.value }) })),
        field("Users moved to E7", num(m.seats, { min: "0", onchange: (e) => set({ seats: e.target.value === "" ? null : Number(e.target.value) }) })),
        field("Users on E7 in a mixed estate", num(m.mixed.seats, { min: "0", onchange: (e) => set({ mixedSeats: e.target.value === "" ? null : Number(e.target.value) }) })),
        h("button", { class: "btn", type: "button", onclick: reset }, "Reset to the quotes")),
      h("h3", { text: "Prices and seats in the model" }),
      h("p", { class: "muted", text: "Per user per month. Type over any price or seat count; seats cannot exceed the users moved. Add-ons not quoted use the published list price." }),
      h("div", { class: "tablewrap" }, h("table", { class: "dt" },
        h("thead", {}, h("tr", {}, ["Part", "Price", "Seats that need it", "Where the price comes from"].map((x, i) => h("th", { class: i === 1 || i === 2 ? "num" : "", scope: "col", text: x })))),
        h("tbody", {},
          partRow("Microsoft 365 E5", m.e5, null, "e5", m.e5Source, true),
          partRow(m.parts.copilot.name, m.parts.copilot.price, m.parts.copilot.seats, "copilot", m.parts.copilot.source),
          partRow(m.parts.entra.name, m.parts.entra.price, m.parts.entra.seats, "entra", m.parts.entra.source),
          partRow(m.parts.agent.name, m.parts.agent.price, m.parts.agent.seats, "agent", m.parts.agent.source)))),
      note(E7.caveat, "demo"),
      m.gov ? note("The E7 line was read from a government-cloud quote. This model uses the commercial E7 contents and list price; whether E7 is offered in that cloud, and what it contains there, is not verified.", "demo") : null,
      h("details", { class: "card" }, h("summary", { text: "Where the E7 figures come from" }),
        h("ul", { class: "muted", style: { paddingLeft: "18px" } }, E7.sources.map((s) => h("li", {}, h("a", { href: s.url, target: "_blank", rel: "noopener noreferrer", text: s.label }), ` (${s.level})`)))));
  }
  draw();
  return root;
}
