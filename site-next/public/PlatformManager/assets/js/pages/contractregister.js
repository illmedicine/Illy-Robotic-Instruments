import { h, fmt, pill } from "../dom.js";
import { dataTable } from "../ui.js";
import { store, daysUntil, parseLocalDate } from "../analyze/core.js";
import { go } from "../route.js";
import { empty, select } from "./widgets.js";

// The contract register: one row per review run on this device, with the dates the review found, the notice deadline,
// auto-renewal, an owner and a status. Alerts put anything due within the window at the top of the Contract review page.
// Only summaries are kept in this browser (no document text). Dates come from the text, so they are shown as found, to be checked.

export const REGISTER_KEY = "contracts.history";
const WINDOW_DAYS = 120;
const DAY = 86400000;
const CLOSED = new Set(["renewed", "ended"]);
const STATUS = [["active", "Active"], ["renewing", "Renewing (in talks)"], ["renewed", "Renewed"], ["ended", "Ended"]];
const POSTURE_TONE = { "needs-attention": "risk", caution: "warn", reasonable: "ok", "price-sheet": "info" };
const POSTURE_LABEL = { "needs-attention": "needs attention", caution: "caution", reasonable: "reasonable", "price-sheet": "price sheet" };

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** One register row from a finished review. Dates are stored as local YYYY-MM-DD strings. */
export function registerEntry(a) {
  const f = a.facts || {};
  const day = (x) => (x && x.value ? iso(parseLocalDate(x.value)) : null);
  const notices = f.notices || [];
  const notice = notices.find((n) => n.renewalRelated) || notices[0] || null;
  return {
    name: a.name, hash: a.hash ?? null, at: a.analyzedAt, counts: a.counts, coverage: a.coverage, posture: a.posture,
    dates: { effective: day(f.effectiveDate), expiration: day(f.expirationDate), renewal: day(f.renewalDate) },
    noticeDays: notice ? notice.days : null,
    autoRenew: Boolean(f.autoRenew),
    termMonths: f.termMonths ? f.termMonths.value : null,
    commitment: f.commitment ? f.commitment.value : null,
    owner: "", status: "active",
  };
}

// The date a decision falls on: the renewal date, or the expiry when no renewal date was read.
const renewPoint = (e) => (e.dates && (e.dates.renewal || e.dates.expiration) ? parseLocalDate(e.dates.renewal || e.dates.expiration) : null);

// The last day notice can be given: the renewal point less the notice period, when a notice period was read.
function noticeDeadline(e) {
  const p = renewPoint(e);
  if (!p || !e.noticeDays) return null;
  const d = new Date(p);
  d.setDate(d.getDate() - e.noticeDays);
  return d;
}

function daysLeft(e) {
  const target = noticeDeadline(e) || renewPoint(e);
  return target ? daysUntil(iso(target)) : null;
}

// Rows saved before the register existed have no dates, owner or status: they are read with blanks, so nothing breaks.
const load = () => store.get(REGISTER_KEY, []).map((e) => ({
  owner: "", status: "active", noticeDays: null, autoRenew: false, ...e,
  dates: { effective: null, expiration: null, renewal: null, ...(e.dates || {}) },
}));

function update(e, patch) {
  const list = load();
  const i = list.findIndex((x) => x.at === e.at && x.name === e.name);
  if (i >= 0) {
    Object.assign(list[i], patch);
    store.set(REGISTER_KEY, list);
  }
}

/** Agreements that are open and reach their notice deadline or renewal within the window, soonest first. Null when there are none. */
export function alertsCard(onChange) {
  const due = load()
    .filter((e) => !CLOSED.has(e.status))
    .map((e) => ({ e, left: daysLeft(e), point: renewPoint(e), by: noticeDeadline(e) }))
    .filter((x) => x.left !== null && x.left <= WINDOW_DAYS)
    .sort((a, b) => a.left - b.left);
  if (!due.length) return null;
  return h("div", { class: "card", "aria-label": "Renewal alerts" },
    h("div", { class: "toolbar" }, h("h3", { style: { margin: 0 }, text: "Renewal alerts" }),
      h("button", { class: "btn sm", type: "button", onclick: () => go("licencewaste") }, "Check licence use")),
    h("p", { class: "muted", text: `${due.length} agreement${due.length === 1 ? "" : "s"} reach a notice deadline or renewal within ${WINDOW_DAYS} days. Check the dates against the document before you act.` }),
    ...due.map(({ e, left, point, by }) => {
      const label = left < 0 ? "deadline passed" : left === 0 ? "due today" : `${left} day${left === 1 ? "" : "s"}`;
      const tone = left <= 30 ? "risk" : "warn";
      const when = e.autoRenew
        ? `Renews automatically on ${fmt.date(point)} unless notice is given by ${fmt.date(by ?? point)}.`
        : `Renews or ends on ${fmt.date(point)}; a decision is needed before then.`;
      return h("div", { class: "alert-row", style: { display: "flex", gap: "10px", alignItems: "baseline", flexWrap: "wrap", padding: "8px 0", borderTop: "1px solid var(--line)" } },
        h("b", { text: e.name }), pill(label, tone),
        h("span", { class: "muted", text: when + (by || !e.noticeDays ? "" : " No notice period was read, so the renewal date is shown.") }),
        e.status === "renewing" ? null : h("button", { class: "btn sm", type: "button", onclick: () => { update(e, { status: "renewing" }); onChange?.(); } }, "Mark renewing"));
    }));
}

/** The register table. Owner and status are kept on the row; Remove deletes only this browser's copy of the summary. */
export function registerTab(onChange) {
  const rows = load();
  if (!rows.length) return empty("No contracts in the register yet. Each review you run is added here, with its dates, notice deadline and owner.", "");
  const change = (e, patch) => { update(e, patch); onChange?.(); };
  const fmtOrDash = (s) => (s ? fmt.date(parseLocalDate(s)) : "-");
  return h("div", {},
    h("p", { class: "muted", text: "Summaries of each review on this device: no document text is kept. Dates are read from the text; verify each one against the document before you act on it." }),
    dataTable({
      rows, csvName: "contract-register", pageSize: 50,
      searchText: (e) => `${e.name} ${e.owner} ${e.status}`,
      columns: [
        { key: "name", label: "Document", render: (e) => h("span", {}, e.name, h("small", { class: "muted", style: { display: "block" }, text: STATUS.find((s) => s[0] === e.status)?.[1] ?? e.status })) },
        { key: "renewal", label: "Renewal or expiry", sort: (e) => renewPoint(e)?.getTime() ?? 0,
          render: (e) => fmtOrDash(e.dates.renewal || e.dates.expiration), csv: (e) => e.dates.renewal || e.dates.expiration || "" },
        { key: "notice", label: "Notice deadline", sort: (e) => noticeDeadline(e)?.getTime() ?? 0,
          render: (e) => (noticeDeadline(e) ? fmt.date(noticeDeadline(e)) : e.noticeDays ? "-" : "no notice found"),
          csv: (e) => (noticeDeadline(e) ? iso(noticeDeadline(e)) : "") },
        { key: "left", label: "Days left", num: true, sort: (e) => daysLeft(e) ?? 1e9,
          render: (e) => {
            const d = CLOSED.has(e.status) ? null : daysLeft(e);
            return d === null ? "-" : pill(d < 0 ? "passed" : `${d}`, d < 0 || d <= 30 ? "risk" : d <= WINDOW_DAYS ? "warn" : "");
          }, csv: (e) => daysLeft(e) ?? "" },
        { key: "autoRenew", label: "Auto-renews", sort: (e) => (e.autoRenew ? 1 : 0), render: (e) => (e.autoRenew ? "Yes" : "No"), csv: (e) => (e.autoRenew ? "Yes" : "No") },
        { key: "owner", label: "Owner", render: (e) => h("input", { class: "input", value: e.owner || "", placeholder: "Owner", "aria-label": `Owner of ${e.name}`,
          onchange: (ev) => change(e, { owner: ev.target.value.trim() }) }), csv: (e) => e.owner || "" },
        { key: "status", label: "Status", sort: (e) => e.status, render: (e) => select(STATUS, e.status, { "aria-label": `Status of ${e.name}`,
          onchange: (ev) => change(e, { status: ev.target.value }) }), csv: (e) => STATUS.find((s) => s[0] === e.status)?.[1] ?? e.status },
        { key: "posture", label: "Posture", render: (e) => pill(POSTURE_LABEL[e.posture] ?? e.posture, POSTURE_TONE[e.posture]), csv: (e) => POSTURE_LABEL[e.posture] ?? e.posture },
        { key: "remove", label: "", render: (e) => h("button", { class: "btn sm", type: "button", "aria-label": `Remove ${e.name} from the register`, onclick: () => {
          if (!window.confirm(`Remove ${e.name} from the register on this device? Its review is not affected.`)) return;
          store.set(REGISTER_KEY, load().filter((x) => !(x.at === e.at && x.name === e.name)));
          onChange?.();
        } }, "Remove"), csv: () => "" },
      ],
    }));
}
