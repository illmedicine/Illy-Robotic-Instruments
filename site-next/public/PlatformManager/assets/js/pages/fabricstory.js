import { h, svg, icon, fmt, pill } from "../dom.js";
import { api } from "../api.js";
import { dataTable } from "../ui.js";
import { tabs } from "./widgets.js";

// Before-and-after story of the Power BI Premium to Fabric move, on the Fabric planner page.
// Microsoft behaviour below is from the Premium to Fabric migration FAQ; tenant numbers come from the live sync and the plan.

const FAQ = "https://learn.microsoft.com/en-us/power-bi/support/premium-migration-faq";
const usd = (v) => (typeof v === "number" ? "$" + fmt.n(Math.round(v)) : "-");
const still = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const CHANGES = [
  { topic: "Where it lives", before: "A Power BI capacity bought as a Microsoft 365 subscription", after: "An Azure resource in an Azure subscription of the same Entra tenant, in a region we choose", change: true },
  { topic: "How it is bought", before: "Fixed annual commitment. Cannot be renewed when the agreement term ends", after: "Pay-as-you-go by the second, or a one-year reservation for the steady baseline", change: true },
  { topic: "Busy periods", before: "Autoscale adds cores, billed per 24 hours", after: "Scale up or down at any time, pause when idle, overage protection. No Autoscale", change: true },
  { topic: "Who can view free", before: "Free users with the Viewer role", after: "The same on F64 and larger. Below F64 every viewer needs Pro", change: false },
  { topic: "Who can build", before: "Pro or Premium Per User", after: "Pro or Premium Per User", change: false },
  { topic: "Reports and models", before: "Workspaces on the P capacity", after: "The same workspaces reassigned. Reports, models, refresh schedules and pipelines move unchanged", change: false },
  { topic: "Watching it", before: "Capacity Metrics app", after: "Fabric Capacity Metrics app plus Azure Cost Management and budgets", change: true },
  { topic: "Security and network", before: "Power BI controls only", after: "Adds Azure managed VNets, private endpoints and trusted workspace access", change: true },
  { topic: "Embedding", before: "Separate EM or A SKU", after: "Included in every F SKU", change: true },
  { topic: "What people can build", before: "Power BI items", after: "Power BI plus lakehouses, warehouses, notebooks and pipelines, if the tenant setting allows", change: true },
];

const PATH = [
  { t: "Measure", d: "Point the Fabric Capacity Metrics app at the P capacity and keep 30 to 45 days of CU use." },
  { t: "Buy in Azure", d: "Create the F SKU in an Azure subscription of this tenant, same region as the P capacity, with CU quota and a scoped admin role." },
  { t: "Set up", d: "Add capacity admins, workload settings and who may assign workspaces. Tenant settings carry over." },
  { t: "Pilot", d: "Reassign a few low-risk workspaces outside refresh windows; run an on-demand refresh." },
  { t: "Move in waves", d: "Reassign the rest by owner. Same region means no downtime beyond refreshes in flight." },
  { t: "Cancel the P", d: "Only after the last wave refreshes cleanly. Then right-size or reserve the F SKU." },
];

const VERDICT = {
  ok: ["Still right", "ok"], changed: ["Right idea, details changed", "warn"], wrong: ["Out of date", "risk"],
  unneeded: ["Not needed for the move", "info"], scope: ["Outside Platform Manager", ""],
};

function countUp(el, to, format = fmt.n) {
  if (still() || !(to > 0)) { el.textContent = format(to || 0); return; }
  const t0 = performance.now(), ms = 900;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = format(Math.round(to * (1 - Math.pow(1 - k, 3))));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function stat(label, value, note) {
  const v = h("div", { class: "fx-num", text: "0" });
  countUp(v, value);
  return h("div", { class: "fx-stat" }, v, h("div", { class: "fx-lbl", text: label }), note ? h("div", { class: "muted fx-note", text: note }) : null);
}

function estateOf(ov) {
  const rows = ov.estate || [];
  const premium = rows.filter((e) => /^P[1-5]$/i.test(e.sku || ""));
  const shared = rows.find((e) => !e.capacityId) || null;
  const sum = (list, k) => list.reduce((s, e) => s + (e[k] || 0), 0);
  const totals = (list) => Object.fromEntries(["workspaces", "reports", "paginated", "dashboards", "models", "largeModels", "dataflows"].map((k) => [k, sum(list, k)]));
  return { known: rows.length > 0, premium, shared, moving: totals(premium), all: totals(rows) };
}

function changesPanel(ov) {
  const p = (ov.capacities || []).find((c) => c.kind === "premium");
  const rows = CHANGES.map((c, i) => h("div", { class: "fx-row" + (c.change ? " is-change" : " is-same"), style: { animationDelay: `${i * 70}ms` } },
    h("div", { class: "fx-topic", text: c.topic }),
    h("div", { class: "fx-before", text: c.before }),
    h("div", { class: "fx-arrow", "aria-hidden": "true" }, icon("chevron")),
    h("div", { class: "fx-after" }, c.after, " ", c.change ? pill("changes", "warn") : pill("same", "ok"))));
  return h("div", { class: "fx-panel" },
    h("div", { class: "fx-head" },
      h("div", { class: "fx-side before" }, h("b", { text: "Today" }), h("span", { text: p ? `Power BI Premium ${p.sku}${p.region ? ", " + p.region : ""}` : "Power BI Premium (P SKU)" })),
      h("div", { class: "fx-side after" }, h("b", { text: "After the move" }), h("span", { text: `Microsoft Fabric ${p && p.fEquivalent ? p.fEquivalent + " or right-sized" : "F SKU"} in Azure` }))),
    h("div", { class: "fx-rows" }, rows),
    h("div", { class: "fx-callout ok" }, icon("users"), h("span", {}, h("b", { text: "For report users nothing changes: " }),
      "same address, same workspaces, same reports and apps. On F64 or larger, people who only view still need no Pro licence.")),
    h("p", { class: "muted" }, "Source: ", h("a", { href: FAQ, target: "_blank", rel: "noopener", text: "Microsoft, Power BI Premium to Fabric migration FAQ" }), "."));
}

function estatePanel(ov, target) {
  const e = estateOf(ov);
  if (!e.known) {
    return h("div", { class: "banner" }, icon("alert"), "No workspace contents yet. Run a Power BI sync (the powerbi module) so this shows what sits on each capacity. ",
      ov.workspaces ? `${fmt.n(ov.workspaces)} workspaces of all kinds are known.` : "");
  }
  const m = e.moving, s = e.shared || {};
  const pName = e.premium.map((x) => x.sku).join(" + ") || "P capacity";
  const region = e.premium[0] && e.premium[0].region;
  const W = 760, H = 250;
  const box = (x, y, w, hh, cls, title, sub) => [
    svg("rect", { x, y, width: w, height: hh, rx: 12, class: "fx-box " + cls }),
    svg("text", { x: x + w / 2, y: y + 30, "text-anchor": "middle", class: "fx-box-t" }, title),
    svg("text", { x: x + w / 2, y: y + 52, "text-anchor": "middle", class: "fx-box-s" }, sub)];
  const diagram = svg("svg", { viewBox: `0 0 ${W} ${H}`, class: "fx-flow", role: "img", "aria-label": `${m.workspaces} workspaces move from ${pName} to ${target}; ${s.workspaces || 0} shared workspaces stay` },
    ...box(20, 30, 230, 80, "before", `Power BI ${pName}`, `${fmt.n(m.workspaces)} workspaces${region ? " · " + region : ""}`),
    ...box(510, 30, 230, 80, "after", `Fabric ${target}`, `same workspaces${region ? " · " + region : ""}`),
    ...box(20, 150, 230, 80, "stay", "Shared capacity (Pro)", `${fmt.n(s.workspaces || 0)} workspaces stay`),
    svg("path", { d: "M250 70 C 360 70, 400 70, 510 70", class: "fx-wire" }),
    svg("path", { d: "M498 62 L510 70 L498 78", class: "fx-wire-head" }),
    svg("text", { x: 380, y: 58, "text-anchor": "middle", class: "fx-box-s" }, "reassign in waves"),
    svg("circle", { r: 6, class: "fx-dot" }, svg("animateMotion", { dur: "2.4s", repeatCount: "indefinite", path: "M250 70 C 360 70, 400 70, 510 70" })),
    svg("circle", { r: 6, class: "fx-dot alt" }, svg("animateMotion", { dur: "2.4s", begin: "1.2s", repeatCount: "indefinite", path: "M250 70 C 360 70, 400 70, 510 70" })),
    svg("text", { x: 380, y: 196, "text-anchor": "middle", class: "fx-box-s" }, "not affected by the move"),
    svg("path", { d: "M250 190 L 300 190", class: "fx-wire still" }));
  return h("div", { class: "fx-panel" },
    diagram,
    h("div", { class: "fx-stats" },
      stat("Workspaces moving", m.workspaces, `${fmt.n(e.all.workspaces)} shared workspaces in total`),
      stat("Reports moving", m.reports, `${fmt.n(m.paginated)} of them paginated`),
      stat("Semantic models", m.models, "move with refresh schedules"),
      stat("Large-format models", m.largeModels, "survive only a same-region move"),
      stat("Dataflows (Gen1)", m.dataflows, "keep running; Gen2 is optional"),
      stat("Dashboards", m.dashboards)),
    m.largeModels ? h("div", { class: "fx-callout warn" }, icon("alert"), h("span", {}, h("b", { text: "Keep the F SKU in the same region. " }),
      `${fmt.n(m.largeModels)} models use the large storage format. Same region: they move with no downtime. Another region: they, and any Fabric items, must be backed up and rebuilt.`)) : null);
}

function bar(label, value, max, tone, note) {
  const fill = h("div", { class: "fx-bar-fill " + tone });
  requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = `${Math.max(2, (value / max) * 100)}%`; }));
  const v = h("span", { class: "fx-bar-v", text: "$0" });
  countUp(v, value, usd);
  return h("div", { class: "fx-bar" }, h("div", { class: "fx-bar-l" }, h("b", { text: label }), note ? h("small", { class: "muted", text: note }) : null),
    h("div", { class: "fx-bar-track" }, fill), h("div", { class: "fx-bar-r" }, v, h("small", { class: "muted", text: `${usd(value / 12)} a month` })));
}

function costPanel(plan) {
  if (!plan) return h("div", { class: "loading", text: "Calculating..." });
  const like = plan.scenarios.find((s) => s.id === "equivalent");
  const best = plan.scenarios.find((s) => s.id === plan.cheapestScenario);
  const payg = like.annualPaygUsd + like.annualProUsd + like.annualStorageUsd;
  // Illustration only: an always-on capacity paused outside 12 hours on weekdays runs about 60 of 168 hours a week.
  const paused = Math.round(like.annualPaygUsd * (60 / 168)) + like.annualProUsd + like.annualStorageUsd;
  const items = [
    { label: `Today: ${plan.premiumSku}`, value: plan.before.totalUsd, tone: "before", note: "capacity plus Pro for authors who lack it" },
    { label: `Like-for-like ${like.fSku}, reserved`, value: like.annualTotalUsd, tone: "after", note: "one-year reservation" },
    best.id !== like.id ? { label: `Cheapest: ${best.label}`, value: best.annualTotalUsd, tone: "best", note: best.fSku } : null,
    { label: `${like.fSku} pay-as-you-go, always on`, value: payg, tone: "warn", note: "no commitment, highest rate" },
    { label: `${like.fSku} pay-as-you-go, paused nights and weekends`, value: paused, tone: "muted", note: "example only: reports are unavailable while paused" },
  ].filter(Boolean);
  const max = Math.max(...items.map((i) => i.value), 1);
  return h("div", { class: "fx-panel" },
    h("div", { class: "fx-bars" }, items.map((i) => bar(i.label, i.value, max, i.tone, i.note))),
    h("div", { class: "fx-stats" },
      h("div", { class: "fx-stat" }, h("div", { class: "fx-num", text: usd(Math.abs(best.vsCurrentUsd)) }),
        h("div", { class: "fx-lbl", text: best.vsCurrentUsd >= 0 ? "saving a year, cheapest option" : "more a year than today, cheapest option" })),
      h("div", { class: "fx-stat" }, h("div", { class: "fx-num", text: `${fmt.n(plan.requiredCuNow)} CU` }), h("div", { class: "fx-lbl", text: "needed now" })),
      h("div", { class: "fx-stat" }, h("div", { class: "fx-num", text: `${fmt.n(plan.f64BreakEvenViewers)}` }), h("div", { class: "fx-lbl", text: "viewers where F64 pays off" }))),
    h("div", { class: "fx-callout" }, icon("chart"), h("span", {}, h("b", { text: "How the bill changes: " }),
      "one Microsoft 365 line becomes an Azure meter. Reserve the steady baseline, pay by the second for peaks, and track it in Azure Cost Management.")),
    h("p", { class: "muted", text: `${plan.caveat} Figures come from the live capacity, the uploaded Capacity Metrics export and the Power BI export.` }));
}

const day = (iso) => new Date(iso + "T00:00:00");
const shortDay = (iso) => day(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const STATUS = {
  ok: ["ok", "On track: there is time to migrate before Premium ends without buying Fabric early."],
  tight: ["warn", "Tight: less than a month of slack before the last safe day to buy the F SKU."],
  late: ["risk", "Late: even starting today the move would finish less than two weeks before Premium ends. Start now and keep the waves small."],
  passed: ["risk", "Premium has ended: content is in its grace or throttled period until it is on an F SKU."],
};

const STATUS_INCLUDED = {
  ok: ["ok", "On track. Running Fabric alongside the P1 costs nothing until the end date, so start as soon as the F SKU is ready: every early week is margin."],
  tight: ["warn", "Tight: less than a month of slack. Start now; overlap is free until the end date, so there is no reason to wait."],
  late: ["risk", "Late: even starting today the move would finish less than two weeks before the end date. Start now, or both will be billed from the day after."],
  passed: ["risk", "The free overlap has ended: both are billed every month until the last workspace is on the F SKU."],
};

function includedCard(d, source) {
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const todayIso = t0.toISOString().slice(0, 10);
  const after = new Date(day(d.endDate)); after.setDate(after.getDate() + 90);
  const afterIso = after.toISOString().slice(0, 10);
  const marks = [
    { iso: todayIso, label: "Today", cls: "today" },
    { iso: d.latestBuyDate, label: "Start by", cls: "buy" },
    { iso: d.endDate, label: "Free overlap ends", cls: "grace" },
    { iso: d.doubleFrom, label: "Both billed from", cls: "end" },
  ];
  const lo = Math.min(...marks.map((m) => day(m.iso).getTime())), hi = day(afterIso).getTime();
  const pos = (iso) => `${((day(iso).getTime() - lo) / Math.max(1, hi - lo)) * 100}%`;
  const band = (from, to, cls) => h("div", { class: "fx-band " + cls, style: { left: pos(from), width: `calc(${pos(to)} - ${pos(from)})` } });
  const [tone, text] = STATUS_INCLUDED[d.status] || STATUS_INCLUDED.ok;
  const left = h("div", { class: "fx-num", text: "0" });
  countUp(left, Math.max(0, d.daysLeft));
  const max = Math.max(d.late3Usd, 1);
  return h("div", { class: "fx-deadline" },
    h("div", { class: "fx-count" }, left, h("div", {}, h("b", { text: d.daysLeft >= 0 ? `days to be fully on Fabric (by ${shortDay(d.endDate)})` : `days since the free overlap ended on ${shortDay(d.endDate)}` }),
      h("div", { class: "muted", text: `Date and terms: ${source}` }))),
    h("div", { class: "fx-axis" },
      band(todayIso < d.endDate ? todayIso : d.endDate, d.endDate, "move"),
      band(d.endDate, afterIso, "late"),
      marks.map((m, i) => h("div", { class: "fx-mark " + m.cls + (i % 2 ? " up" : ""), style: { left: pos(m.iso), animationDelay: `${i * 180}ms` } },
        h("span", { class: "fx-pin" }), h("b", { text: m.label }), h("small", { text: shortDay(m.iso) })))),
    h("div", { class: "fx-callout " + tone }, icon(tone === "ok" ? "check" : "alert"), h("span", { text: text })),
    h("div", { class: "grid g-2 fx-pay" },
      h("div", { class: "fx-stat" }, h("div", { class: "fx-lbl", text: "Running both now" }),
        h("p", {}, `Under your organization's agreement the F SKU runs alongside the P1 and only the P1 is paid until ${shortDay(d.endDate)}. Buying early costs nothing extra.`),
        h("p", {}, `The move needs about ${fmt.n(d.migrationCalendarDays)} calendar days plus two weeks of margin, so the last day to start is ${shortDay(d.latestBuyDate)}.`)),
      h("div", { class: "fx-stat" }, h("div", { class: "fx-lbl", text: "If the move is not finished" }),
        h("p", {}, `From ${shortDay(d.doubleFrom)} both are billed until the last workspace is moved: about ${usd(d.lateMonthlyUsd)} a month extra.`),
        h("div", { class: "fx-bars" },
          barRow(`Done by ${shortDay(d.endDate)}`, 0, max, "best"),
          barRow("One month late", d.late1Usd, max, "warn"),
          barRow("Three months late", d.late3Usd, max, "warn")),
        h("p", { class: "muted", text: "Extra cost at the F SKU's pay-as-you-go list price; confirm the billed rate in the agreement." }))));
}

function deadlineCard(d, source) {
  if (d.overlapIncluded) return includedCard(d, source);
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const marks = [
    { iso: t0.toISOString().slice(0, 10), label: "Today", cls: "today" },
    { iso: d.latestBuyDate, label: "Buy F SKU by", cls: "buy" },
    { iso: d.endDate, label: "Premium ends", cls: "end" },
    { iso: d.graceEnds, label: "Grace ends", cls: "grace" },
    { iso: d.rejectedFrom, label: "All rejected", cls: "reject" },
  ];
  const lo = Math.min(...marks.map((m) => day(m.iso).getTime())), hi = Math.max(...marks.map((m) => day(m.iso).getTime()));
  const pos = (iso) => `${((day(iso).getTime() - lo) / Math.max(1, hi - lo)) * 100}%`;
  const band = (from, to, cls) => h("div", { class: "fx-band " + cls, style: { left: pos(from), width: `calc(${pos(to)} - ${pos(from)})` } });
  const [tone, text] = STATUS[d.status] || STATUS.ok;
  const left = h("div", { class: "fx-num", text: "0" });
  countUp(left, Math.max(0, d.daysLeft));
  return h("div", { class: "fx-deadline" },
    h("div", { class: "fx-count" }, left, h("div", {}, h("b", { text: d.daysLeft >= 0 ? `days until Power BI Premium ends on ${shortDay(d.endDate)}` : `days since Premium ended on ${shortDay(d.endDate)}` }),
      h("div", { class: "muted", text: `Date: ${source}` }))),
    h("div", { class: "fx-axis" },
      band(marks[0].iso < d.latestBuyDate ? marks[0].iso : d.latestBuyDate, d.latestBuyDate, "wait"),
      band(d.latestBuyDate, d.endDate, "move"),
      band(d.endDate, d.graceEnds, "grace"),
      band(d.graceEnds, d.rejectedFrom, "throttle"),
      marks.map((m, i) => h("div", { class: "fx-mark " + m.cls + (i % 2 ? " up" : ""), style: { left: pos(m.iso), animationDelay: `${i * 180}ms` } },
        h("span", { class: "fx-pin" }), h("b", { text: m.label }), h("small", { text: shortDay(m.iso) })))),
    h("div", { class: "fx-callout " + tone }, icon(tone === "ok" ? "check" : "alert"), h("span", { text: text })),
    h("div", { class: "grid g-2 fx-pay" },
      h("div", { class: "fx-stat" }, h("div", { class: "fx-lbl", text: "Paying twice" }),
        h("p", {}, `From the day the F SKU is bought until ${shortDay(d.endDate)}, Premium is still being paid, so both bills run: about ${usd(d.overlapPerMonthUsd)} a month extra at pay-as-you-go.`),
        h("div", { class: "fx-bars" },
          barRow(`Buy today (${fmt.n(d.buyNowOverlapDays)} days of overlap)`, d.buyNowExtraUsd, Math.max(d.buyNowExtraUsd, 1), "warn"),
          d.slackDays > 0 ? barRow(`Buy on ${shortDay(d.latestBuyDate)} (${fmt.n(d.buyLatestOverlapDays)} days)`, d.buyLatestExtraUsd, Math.max(d.buyNowExtraUsd, 1), "best") : null),
        d.slackDays > 0 ? h("p", { class: "muted", text: `Waiting until the last safe day saves about ${usd(d.buyNowExtraUsd - d.buyLatestExtraUsd)} against buying today.` }) : null),
      h("div", { class: "fx-stat" }, h("div", { class: "fx-lbl", text: "Missing the date" }),
        h("p", {}, "Premium cannot be renewed at the end of its term, so being late does not add a second bill: it costs access. ",
          `Reports keep working until ${shortDay(d.graceEnds)}, are throttled after that, and stop on ${shortDay(d.rejectedFrom)}.`),
        h("p", { class: "muted", text: `The move needs about ${fmt.n(d.migrationCalendarDays)} calendar days plus two weeks of margin. Assumes Premium is not refunded if cancelled early; confirm both with the Microsoft account team.` }))));
}

function barRow(label, value, max, tone) {
  const fill = h("div", { class: "fx-bar-fill " + tone });
  requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = `${Math.max(2, (value / max) * 100)}%`; }));
  return h("div", { class: "fx-bar" }, h("div", { class: "fx-bar-l" }, h("b", { text: label })), h("div", { class: "fx-bar-track" }, fill),
    h("div", { class: "fx-bar-r" }, h("span", { class: "fx-bar-v", text: usd(value) })));
}

function timelinePanel(plan, ov) {
  const d = plan && plan.deadline;
  const source = ov.premiumEnd ? ov.premiumEnd.source : "renewal date in Renewal Analyze > Organisation";
  const lane = h("div", { class: "fx-lane" },
    h("div", { class: "fx-seg ok", style: { flexGrow: 30 } }, h("b", { text: "Days 1 to 30" }), h("span", { text: "grace: full access" })),
    h("div", { class: "fx-seg warn", style: { flexGrow: 60 } }, h("b", { text: "Days 31 to 90" }), h("span", { text: "interactive use throttled" })),
    h("div", { class: "fx-seg risk", style: { flexGrow: 30 } }, h("b", { text: "Day 91 on" }), h("span", { text: "every operation rejected" })));
  const steps = h("ol", { class: "fx-steps" }, PATH.map((s, i) => h("li", { style: { animationDelay: `${i * 260}ms` } },
    h("span", { class: "fx-step-n", text: String(i + 1) }), h("div", {}, h("b", { text: s.t }), h("div", { class: "muted", text: s.d })))));
  return h("div", { class: "fx-panel" },
    d ? deadlineCard(d, source) : h("div", { class: "banner" }, icon("alert"), "No Premium end date yet. Set fabric.premiumEndDate in the config (or the renewal date in Renewal Analyze > Organisation) to see the countdown and the cost of buying Fabric early."),
    h("h4", { text: "The safe order" }), steps,
    d && d.overlapIncluded ? null : h("h4", { text: "If the P capacity ends before Fabric is ready" }),
    d && d.overlapIncluded ? null : lane,
    d && d.overlapIncluded ? null : h("p", { class: "muted" }, "This is not a 90-day backup: content stays stored but is unusable from day 91 until it is on an F SKU. ",
      h("a", { href: FAQ, target: "_blank", rel: "noopener", text: "Microsoft FAQ" })));
}

function deckPanel(ov) {
  const out = h("div", { class: "fx-panel" }, h("div", { class: "loading", text: "Loading the deck..." }));
  (async () => {
    let doc;
    try {
      const list = (await api.docs()).docs || [];
      const pick = list.find((d) => d.topic === "fabric") || null;
      doc = pick && (await api.doc(pick.id));
    } catch (e) {
      out.replaceChildren(h("div", { class: "banner error" }, icon("alert"), e.message));
      return;
    }
    if (!doc || !doc.slides.length) {
      out.replaceChildren(h("div", { class: "banner" }, icon("alert"), "No Fabric deck has been added. Run scripts\\Import-ReferenceDeck.ps1 -Path <deck.pptx> -Id fabric-deck-2026 -Topic fabric."));
      return;
    }
    out.replaceChildren(deckView(doc, ov));
  })();
  return out;
}

function deckView(doc, ov) {
  const src = (name) => `/api/docs/${encodeURIComponent(doc.id)}/${encodeURIComponent(name)}`;
  const review = doc.review || [];
  let at = 0;
  const img = h("img", { class: "fx-slide", alt: "" });
  const caption = h("div", { class: "fx-caption" });
  const notes = h("div", { class: "fx-notes" });
  const thumbs = h("div", { class: "fx-thumbs" }, doc.slides.map((s, i) =>
    h("button", { type: "button", class: "fx-thumb", title: `${s.n}. ${s.title}`, onclick: () => go(i) }, h("img", { src: src(s.image), alt: `Slide ${s.n}`, loading: "lazy" }))));
  function go(i) {
    at = (i + doc.slides.length) % doc.slides.length;
    const s = doc.slides[at];
    img.src = src(s.image);
    img.alt = `Slide ${s.n}: ${s.title}`;
    img.classList.remove("fx-in"); void img.offsetWidth; img.classList.add("fx-in");
    caption.replaceChildren(h("b", { text: `${s.n} / ${doc.slides.length}` }), " ", s.title);
    [...thumbs.children].forEach((b, j) => b.setAttribute("aria-current", String(j === at)));
    const mine = review.filter((r) => r.slide === s.n);
    notes.replaceChildren(h("h4", { text: "Checked against today" }),
      ...(mine.length ? mine.map(note) : [h("p", { class: "muted", text: "Nothing on this slide needed checking." })]));
  }
  function note(r) {
    const [label, tone] = VERDICT[r.verdict] || VERDICT.scope;
    return h("div", { class: "fx-review " + tone }, h("div", {}, pill(label, tone)), h("div", { class: "fx-claim", text: r.claim }), h("div", { text: r.today }));
  }
  const e = estateOf(ov), inv = doc.inventory;
  const compare = inv && e.known ? h("div", { class: "fx-compare" }, ["workspaces", "reports", "dashboards"].map((k) => {
    const max = Math.max(inv[k] || 0, e.all[k] || 0, 1);
    const grow = (v, cls) => { const f = h("div", { class: "fx-bar-fill " + cls }); requestAnimationFrame(() => requestAnimationFrame(() => { f.style.width = `${(v / max) * 100}%`; })); return f; };
    return h("div", { class: "fx-cmp" }, h("b", { text: k[0].toUpperCase() + k.slice(1) }),
      h("div", { class: "fx-cmp-row" }, h("span", { class: "muted", text: "deck" }), h("div", { class: "fx-bar-track" }, grow(inv[k] || 0, "muted")), h("span", { text: fmt.n(inv[k]) })),
      h("div", { class: "fx-cmp-row" }, h("span", { class: "muted", text: "today" }), h("div", { class: "fx-bar-track" }, grow(e.all[k] || 0, "after")), h("span", { text: fmt.n(e.all[k]) })));
  })) : null;
  const counts = Object.fromEntries(Object.keys(VERDICT).map((k) => [k, review.filter((r) => r.verdict === k).length]));
  go(0);
  return h("div", {},
    h("div", { class: "toolbar" },
      h("div", {}, h("b", { text: doc.title }), h("div", { class: "muted", text: [doc.author, doc.prepared, doc.reviewedAt ? `checked ${doc.reviewedAt}` : null].filter(Boolean).join(" · ") })),
      h("a", { class: "btn", href: src(doc.file || ""), download: doc.file || null, hidden: doc.file ? null : true }, icon("download"), "Original .pptx")),
    review.length ? h("div", { class: "fx-verdicts" }, Object.entries(VERDICT).filter(([k]) => counts[k]).map(([k, [label, tone]]) =>
      h("span", { class: "fx-vcount" }, pill(String(counts[k]), tone), " ", label))) : null,
    h("div", { class: "fx-deck" },
      h("div", { class: "fx-stage" },
        h("button", { type: "button", class: "btn fx-nav prev", "aria-label": "Previous slide", onclick: () => go(at - 1) }, "‹"),
        img,
        h("button", { type: "button", class: "btn fx-nav next", "aria-label": "Next slide", onclick: () => go(at + 1) }, "›"),
        caption),
      notes),
    thumbs,
    compare ? h("div", { class: "card fx-sub" }, h("h3", {}, "Deck inventory against today", h("span", { class: "sub", text: "shared workspaces, all capacities" })), compare) : null,
    review.length ? h("div", { class: "card fx-sub" }, h("h3", {}, "Every claim checked", h("span", { class: "sub", text: doc.reviewBasis || "" })),
      dataTable({
        rows: review, csvName: "fabric-deck-review", pageSize: 20,
        columns: [
          { key: "slide", label: "Slide", num: true, render: (r) => (r.slide ? h("a", { href: "#", onclick: (ev) => { ev.preventDefault(); go(doc.slides.findIndex((s) => s.n === r.slide)); img.scrollIntoView({ behavior: still() ? "auto" : "smooth", block: "center" }); }, text: String(r.slide) }) : "-") },
          { key: "verdict", label: "Verdict", render: (r) => { const [l, t] = VERDICT[r.verdict] || VERDICT.scope; return pill(l, t); } },
          { key: "claim", label: "The deck said" },
          { key: "today", label: "What we know today" },
        ],
      })) : null);
}

/** The story card. `update(plan)` repaints the cost view after each Calculate. */
export function fabricStory(ov) {
  let plan = null, current = null;
  const costHost = h("div", {}), timeHost = h("div", {});
  const target = () => (plan ? (plan.scenarios.find((s) => s.id === plan.cheapestScenario) || {}).fSku : null)
    || ((ov.capacities || []).find((c) => c.kind === "premium") || {}).fEquivalent || "F64";
  const panels = {
    "What changes": () => changesPanel(ov),
    "Our estate": () => estatePanel(ov, target()),
    "Cost": () => { costHost.replaceChildren(costPanel(plan)); return costHost; },
    "Timeline": () => { timeHost.replaceChildren(timelinePanel(plan, ov)); return timeHost; },
    "Original deck": () => deckPanel(ov),
  };
  const view = h("div", { class: "card fx" },
    h("h3", {}, "Power BI Premium to Fabric: before and after", h("span", { class: "sub", text: "live tenant numbers, Microsoft guidance and the 2026 management deck" })),
    tabs(panels, "What changes", (n) => { current = n; }));
  return {
    view,
    update(p) {
      plan = p;
      if (current === "Cost") costHost.replaceChildren(costPanel(plan));
      if (current === "Timeline") timeHost.replaceChildren(timelinePanel(plan, ov));
    },
  };
}
