import { h, icon, fmt, download, toCsv } from "./dom.js";

export function openDrawer(title, pairs, actions = [], extra = null) {
  const close = () => { scrim.remove(); drawer.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => e.key === "Escape" && close();
  const scrim = h("div", { class: "scrim", onclick: close });
  const drawer = h("aside", { class: "drawer", role: "dialog", "aria-label": title },
    h("header", {}, h("h2", { text: title }), h("button", { class: "btn sm", type: "button", "aria-label": "Close", onclick: close }, icon("close"))),
    h("div", { class: "body" },
      h("dl", { class: "kv" }, pairs.filter(([, v]) => v !== "" && v != null).flatMap(([k, v]) => [h("dt", { text: k }), h("dd", {}, v)])),
      extra,
      actions.length ? h("div", { class: "toolbar", style: { marginTop: "18px" } }, actions) : null));
  document.body.append(scrim, drawer);
  document.addEventListener("keydown", onKey);
  drawer.querySelector("button").focus();
}

export function extLink(href, text) {
  return h("a", { href, target: "_blank", rel: "noopener noreferrer", class: "btn" }, icon("external"), text);
}

/**
 * columns: [{key,label,render?(row),sort?(row),num?,csv?(row)}]
 * filters: [{key,label,values?}]  (values derived from rows when omitted)
 */
export function dataTable({ rows, columns, filters = [], searchText, onRow, csvName = "export", pageSize = 100, initialSort }) {
  const st = { q: "", sort: initialSort || null, dir: 1, f: {}, shown: pageSize };
  const search = h("input", { class: "input", type: "search", placeholder: "Search...", "aria-label": "Search",
    oninput: (e) => { st.q = e.target.value.toLowerCase(); st.shown = pageSize; draw(); } });
  const selects = filters.map((f) => {
    const vals = f.values || [...new Set(rows.map((r) => (f.get ? f.get(r) : r[f.key])).filter((v) => v !== "" && v != null))].sort();
    return h("select", { class: "select", "aria-label": f.label, onchange: (e) => { st.f[f.key] = e.target.value; st.shown = pageSize; draw(); } },
      h("option", { value: "", text: `${f.label}: all` }), vals.map((v) => h("option", { value: v, text: String(v) })));
  });
  const count = h("span", { class: "count" });
  const body = h("tbody");
  const head = h("tr", {}, columns.map((c) => h("th", { class: c.num ? "num" : "", scope: "col", tabindex: "0", text: c.label, title: c.title ?? null,
    onclick: () => { st.dir = st.sort === c.key ? -st.dir : 1; st.sort = c.key; draw(); },
    onkeydown: (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), e.target.click()) })));
  const more = h("button", { class: "btn", type: "button", onclick: () => { st.shown += pageSize; draw(); } });
  const table = h("table", { class: "dt" }, h("thead", {}, head), body);
  const wrapEl = h("div", { class: "tablewrap" }, table);
  let view = [];

  function draw() {
    const flt = filters.filter((f) => st.f[f.key]);
    view = rows.filter((r) =>
      (!st.q || (searchText ? searchText(r) : JSON.stringify(r)).toLowerCase().includes(st.q)) &&
      flt.every((f) => String(f.get ? f.get(r) : r[f.key]) === st.f[f.key]));
    if (st.sort) {
      const c = columns.find((x) => x.key === st.sort);
      const val = (r) => (c.sort ? c.sort(r) : r[c.key]);
      view = [...view].sort((a, b) => {
        const x = val(a), y = val(b);
        if (x == null || x === "") return 1;
        if (y == null || y === "") return -1;
        return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * st.dir;
      });
    }
    [...head.children].forEach((th, i) => {
      if (columns[i].key === st.sort) th.setAttribute("aria-sort", st.dir > 0 ? "ascending" : "descending");
      else th.removeAttribute("aria-sort");
    });
    body.replaceChildren(...view.slice(0, st.shown).map((r) =>
      h("tr", { class: onRow ? "click" : "", onclick: onRow ? () => onRow(r) : null },
        columns.map((c) => h("td", { class: c.num ? "num" : "" }, c.render ? c.render(r) : r[c.key] ?? "")))));
    if (!view.length) body.replaceChildren(h("tr", {}, h("td", { colspan: columns.length, class: "empty", text: "Nothing matches." })));
    count.textContent = `${fmt.n(view.length)} of ${fmt.n(rows.length)}`;
    more.textContent = `Show more (${fmt.n(view.length - st.shown)} left)`;
    more.style.display = view.length > st.shown ? "" : "none";
  }
  draw();
  const toolbar = h("div", { class: "toolbar" }, search, selects,
    h("button", { class: "btn", type: "button", onclick: () => download(csvName + ".csv", toCsv(view, columns)) }, icon("download"), "CSV"), count);
  return h("div", {}, toolbar, wrapEl, h("div", { style: { margin: "10px 0" } }, more));
}
