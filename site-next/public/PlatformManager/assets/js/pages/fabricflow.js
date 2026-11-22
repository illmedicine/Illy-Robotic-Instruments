import { h, icon } from "../dom.js";
import { pageHead } from "./common.js";

// Fabric and Power BI workflows on a sample environment. Pick a common operation and see each step on the estate.
// Everything here is synthetic: the names, owners and capacities belong to a made-up company, so the page is safe to publish.

const SVGNS = "http://www.w3.org/2000/svg";
const W = 960, H = 560, NODE_W = 170, NODE_H = 46;

// The sample environment: where each item sits on the diagram and what it is.
const NODES = [
  { id: "desk", x: 80, y: 430, label: "Power BI Desktop (.pbix)", kind: "Author", owner: "Finance analysts", detail: "Reports are built on a laptop, then published to a workspace." },
  { id: "erp", x: 80, y: 70, label: "ERP (SQL Server)", kind: "Source", owner: "Finance systems team", detail: "Sales orders and ledger postings. Reached through the on-premises gateway." },
  { id: "xl", x: 80, y: 185, label: "Excel on SharePoint", kind: "Source", owner: "Finance close team", detail: "Master lists kept by hand: cost centres, budgets and currency rates." },
  { id: "api", x: 80, y: 300, label: "Sales API", kind: "Source", owner: "E-commerce team", detail: "Web orders, pulled every hour." },
  { id: "pipe", x: 250, y: 70, label: "Pipeline: Load sales", kind: "Ingest", owner: "Data engineering", detail: "Copies ERP and API rows into the lakehouse each night, with retries." },
  { id: "dfg", x: 250, y: 185, label: "Dataflow Gen2: Finance master", kind: "Ingest", owner: "Finance analysts", detail: "Cleans the Excel lists into typed tables with a refresh schedule." },
  { id: "gw", x: 250, y: 300, label: "On-premises gateway", kind: "Ingest", owner: "Platform team", detail: "Bridges Power BI and Fabric to the SQL Server behind the firewall." },
  { id: "lh", x: 420, y: 70, label: "Lakehouse: lh_sales", kind: "Store", owner: "Data engineering", detail: "Bronze (raw), silver (clean) and gold (modelled) tables for sales." },
  { id: "wh", x: 420, y: 185, label: "Warehouse: wh_finance", kind: "Store", owner: "Finance analysts", detail: "Finance tables read by the close report and its reconciliations." },
  { id: "nb", x: 420, y: 300, label: "Notebook: clean_sales", kind: "Transform", owner: "Data engineering", detail: "Removes duplicate orders and converts currency to the reporting rate." },
  { id: "sms", x: 600, y: 70, label: "Semantic model: Sales (Direct Lake)", kind: "Model", owner: "Sales analytics", detail: "Reads the gold tables directly. Measures for revenue, margin and returns." },
  { id: "smf", x: 600, y: 185, label: "Semantic model: Finance (Import)", kind: "Model", owner: "Finance analysts", detail: "Imported on a schedule. Measures for the close, budget and variance." },
  { id: "rls", x: 600, y: 300, label: "RLS role: Region", kind: "Govern", owner: "Security team", detail: "Each person sees only the sales rows of their region." },
  { id: "reps", x: 780, y: 40, label: "Report: Sales overview", kind: "Serve", owner: "Sales analytics", detail: "Revenue and margin by region, product and month." },
  { id: "repf", x: 780, y: 130, label: "Report: Finance close", kind: "Serve", owner: "Finance analysts", detail: "Close checklist, variance and sign-off." },
  { id: "app", x: 780, y: 220, label: "App: Finance hub", kind: "Serve", owner: "Finance analysts", detail: "The packaged set of reports shared with readers." },
  { id: "grp", x: 780, y: 310, label: "Entra group: Finance readers", kind: "Govern", owner: "Identity team", detail: "Who may open the app. Added and removed in Entra, never in Power BI." },
  { id: "ws", x: 420, y: 430, label: "Workspace: Finance Prod", kind: "Govern", owner: "Finance analysts", detail: "Production workspace. Items here are what readers see." },
  { id: "dep", x: 600, y: 430, label: "Deployment pipeline: Dev, Test, Prod", kind: "Govern", owner: "Data engineering", detail: "Promotes items through three workspaces with stage rules." },
  { id: "git", x: 250, y: 430, label: "Git: fabric-finance repo", kind: "Govern", owner: "Data engineering", detail: "Source control for the workspace items, one branch per change." },
  { id: "cap", x: 780, y: 430, label: "Capacity F64: Finance", kind: "Govern", owner: "Platform team", detail: "Compute for the workspaces. Watched for throttling in the monitoring hub." },
  { id: "mon", x: 780, y: 490, label: "Monitoring hub", kind: "Govern", owner: "Platform team", detail: "Refresh history, failures and capacity use for every item." },
];

const EDGES = [
  ["erp", "pipe"], ["api", "pipe"], ["xl", "dfg"], ["gw", "wh"], ["gw", "smf"], ["pipe", "lh"], ["dfg", "wh"],
  ["lh", "nb"], ["nb", "lh"], ["lh", "sms"], ["wh", "smf"], ["sms", "reps"], ["smf", "repf"], ["reps", "app"], ["repf", "app"],
  ["rls", "sms"], ["grp", "app"], ["desk", "ws"], ["ws", "sms"], ["dep", "ws"], ["git", "ws"], ["cap", "ws"], ["mon", "cap"],
];

// Common operations. Each step names the item it happens on and says what the person does there.
const WORKFLOWS = [
  { id: "publish", title: "Publish a report and share it as an app", who: "Finance analyst",
    summary: "From a .pbix on a laptop to a shared app for readers.",
    steps: [
      { node: "desk", action: "Build the report", detail: "Connect to the semantic model in the workspace (live connection) or to the Sales tables, then build the visuals." },
      { node: "ws", action: "Publish to Finance Prod", detail: "Publish from Desktop into the production workspace. The model and the report arrive together." },
      { node: "sms", action: "Check the semantic model", detail: "Open the model's settings. Confirm the data source credentials and that Direct Lake reads the gold tables." },
      { node: "rls", action: "Confirm row-level security", detail: "Test the Region role with a sample person before readers see the report." },
      { node: "reps", action: "Review the report", detail: "Check the figures against the sample totals, then save it as ready." },
      { node: "app", action: "Create the app", detail: "Package the reports into the Finance hub app. Keep the names readers will recognise." },
      { node: "grp", action: "Give readers access", detail: "Add the Entra group Finance readers to the app audience. Access is granted by the group, not by name." },
    ] },
  { id: "ingest", title: "Load sales into the lakehouse and model it", who: "Data engineer",
    summary: "Nightly load from the ERP and the sales API through bronze, silver and gold.",
    steps: [
      { node: "erp", action: "Source system", detail: "The ERP's order and ledger tables. Read through the gateway with a read-only account." },
      { node: "api", action: "Second source", detail: "The e-commerce API, pulled every hour into the same pipeline." },
      { node: "pipe", action: "Run the pipeline", detail: "Copy activities write the raw rows to the bronze folder, with retries on timeout." },
      { node: "lh", action: "Bronze and silver", detail: "Raw rows land in bronze. The silver tables keep one row per order." },
      { node: "nb", action: "Clean with a notebook", detail: "Remove duplicates and convert currency to the reporting rate, then write the gold tables." },
      { node: "lh", action: "Gold tables ready", detail: "Gold holds the modelled sales. Nothing else reads the raw tables." },
      { node: "sms", action: "Refresh the model", detail: "Direct Lake reads the gold tables. No import refresh is needed unless the model falls back." },
    ] },
  { id: "dataflow", title: "Turn an Excel master list into a warehouse table", who: "Finance analyst",
    summary: "A hand-kept list becomes a typed table that the close report reads.",
    steps: [
      { node: "xl", action: "The list", detail: "Cost centres, budgets and currency rates kept in one workbook on SharePoint." },
      { node: "dfg", action: "Clean in Dataflow Gen2", detail: "Set the column types, remove blank rows and check the rates are numbers." },
      { node: "wh", action: "Load into the warehouse", detail: "The dataflow writes to wh_finance on its schedule. The previous table is replaced, not appended." },
      { node: "smf", action: "Use it in the model", detail: "The Finance model imports the warehouse tables. Its refresh runs after the dataflow." },
      { node: "repf", action: "Read it in the close report", detail: "Variance by cost centre now uses the cleaned budgets." },
    ] },
  { id: "refresh", title: "Fix a scheduled refresh that failed", who: "Power BI administrator",
    summary: "Find the failure, check the gateway and capacity, then run the refresh again.",
    steps: [
      { node: "smf", action: "See the failure", detail: "The refresh history shows the Finance model failed at 02:10. Read the error message first." },
      { node: "gw", action: "Check the gateway", detail: "Is the gateway online and can it reach the SQL Server? Restart the service if it is not." },
      { node: "mon", action: "Check the monitoring hub", detail: "Look for other failures at the same time. A busy capacity can time out a refresh." },
      { node: "cap", action: "Check capacity use", detail: "If the capacity is throttling, move the refresh later or move the workspace to a larger F-SKU." },
      { node: "smf", action: "Run the refresh again", detail: "Start the refresh manually and confirm it completes. Then leave the schedule as it was." },
    ] },
  { id: "promote", title: "Promote a change from Dev to Prod", who: "Data engineer",
    summary: "Deployment pipeline stages with rules, then a check in production.",
    steps: [
      { node: "git", action: "Commit the change", detail: "Commit the item to a branch in the repo and open a pull request for review." },
      { node: "ws", action: "Sync the Dev workspace", detail: "The workspace takes the change from the branch, so Dev matches the repo." },
      { node: "dep", action: "Deploy to Test", detail: "The deployment pipeline copies the items to the Test stage and applies the stage rules." },
      { node: "dep", action: "Apply the rules", detail: "Parameter rules switch the Test sources to the test ERP. Production keeps its own sources." },
      { node: "ws", action: "Deploy to Prod", detail: "Promote the Test stage to the Finance Prod workspace after the test sign-off." },
      { node: "reps", action: "Check the report in Prod", detail: "Open the report and compare the sample totals with the Test figures." },
    ] },
  { id: "onboard", title: "Onboard a team to a workspace", who: "Workspace administrator",
    summary: "Give a group the right role, check the capacity, then share the app.",
    steps: [
      { node: "grp", action: "Choose the group", detail: "Use an Entra security group that already matches the team. Do not add individuals." },
      { node: "ws", action: "Add the group as a role", detail: "Viewer for readers, Contributor for people who build. Only admins can add members." },
      { node: "cap", action: "Check the capacity", detail: "A new team adds load. Look at peak use before the team starts." },
      { node: "app", action: "Share the app", detail: "The app audience is the group. New members see the app without a separate share." },
    ] },
  { id: "rls", title: "Limit a report to each person's region", who: "Semantic model author",
    summary: "Row-level security on the sales model, tested before it reaches readers.",
    steps: [
      { node: "sms", action: "Open the model", detail: "Open the Sales semantic model in the workspace (Security settings)." },
      { node: "rls", action: "Create the role", detail: "Create a role called Region. Its filter keeps only rows whose region matches the signed-in person." },
      { node: "grp", action: "Assign the group", detail: "Put the regional Entra groups into the Region role. People are placed by their group." },
      { node: "sms", action: "Test as a person", detail: "Use Test as role with a sample region. Confirm the figures change." },
      { node: "reps", action: "Check the report", detail: "The sales overview now shows only the region the reader belongs to." },
    ] },
  { id: "capacity", title: "Move a workspace onto a Fabric capacity", who: "Platform administrator",
    summary: "Check licences, assign the workspace and watch the first days of use.",
    steps: [
      { node: "cap", action: "Check the capacity", detail: "F64 has room for the Finance workspace. Note its current peak use." },
      { node: "ws", action: "Assign the workspace", detail: "Set the workspace's license mode to the Fabric capacity. Users keep their own Pro licences." },
      { node: "mon", action: "Watch the first days", detail: "Compare refresh times and throttling in the monitoring hub for a week." },
      { node: "cap", action: "Resize if needed", detail: "Move to a larger F-SKU only if the capacity is throttling at peak." },
    ] },
  { id: "git", title: "Keep the workspace under source control", who: "Data engineer",
    summary: "Connect the workspace to a repo so every item change is recorded.",
    steps: [
      { node: "ws", action: "Connect the workspace", detail: "Connect Finance Prod to the fabric-finance repo, on the main branch." },
      { node: "git", action: "Commit the items", detail: "The workspace commits its items to the repo. Each commit names who made the change." },
      { node: "git", action: "Work on a branch", detail: "New changes go to a feature branch first. The workspace syncs from that branch in Dev." },
      { node: "dep", action: "Release through the pipeline", detail: "The deployment pipeline takes the merged branch to Test and Prod." },
    ] },
];

function svgEl(tag, attrs = {}, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (parent) parent.appendChild(e);
  return e;
}

const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));
const centre = (n) => [n.x + NODE_W / 2, n.y + NODE_H / 2];

function diagram(current) {
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Sample Fabric and Power BI environment" });
  svg.style.width = "100%";
  svg.style.height = "auto";
  const path = current ? current.steps.map((s) => s.node) : [];
  const step = current ? current.steps[current.at] : null;
  const onPath = new Set(path);
  for (const [a, b] of EDGES) {
    const [x1, y1] = centre(byId[a]), [x2, y2] = centre(byId[b]);
    svgEl("line", { x1, y1, x2, y2, stroke: "var(--line, #d5deea)", "stroke-width": 1.2, "stroke-dasharray": "4 4" }, svg);
  }
  // the workflow's path: each step to the next
  if (path.length > 1) {
    for (let i = 0; i < current.at; i++) {
      const [x1, y1] = centre(byId[path[i]]), [x2, y2] = centre(byId[path[i + 1]]);
      svgEl("line", { x1, y1, x2, y2, stroke: "#84c341", "stroke-width": 4, "stroke-linecap": "round" }, svg);
    }
  }
  for (const n of NODES) {
    const g = svgEl("g", { class: "fw-node", "data-id": n.id, style: "cursor:pointer" }, svg);
    const active = step && step.node === n.id;
    const lit = onPath.has(n.id);
    svgEl("rect", { x: n.x, y: n.y, width: NODE_W, height: NODE_H, rx: 8, fill: active ? "#eaf3fc" : "#ffffff",
      stroke: active ? "#0f6cbd" : lit ? "#84c341" : "#d5deea", "stroke-width": active ? 2.5 : 1.2 }, g);
    const t = svgEl("text", { x: n.x + 10, y: n.y + 19, "font-size": 13, "font-weight": 600, fill: "#0b2a4a" }, g);
    t.textContent = n.label.length > 27 ? n.label.slice(0, 26) + "…" : n.label;
    const k = svgEl("text", { x: n.x + 10, y: n.y + 35, "font-size": 11, fill: "#42576e" }, g);
    k.textContent = n.kind;
    const title = svgEl("title", {}, g);
    title.textContent = `${n.label}: ${n.detail}`;
  }
  return svg;
}

export function render() {
  const state = { wf: WORKFLOWS[0], at: 0, node: null };
  const root = h("div", {}, pageHead("Fabric and Power BI workflows",
    "Common operations on a sample environment: pick one, then step through it. The company, names and capacities are made up."));
  root.append(h("div", { class: "banner info" }, icon("shield"), h("span", { text: "Sample environment only. Nothing here connects to a tenant or changes anything." })));

  const list = h("div", { class: "card", style: { display: "grid", gap: "6px", alignContent: "start" } }, h("h3", { text: "Operations" }));
  const diagramBox = h("div", { class: "card", style: { padding: "12px" } });
  const stepBox = h("div", { class: "card" });
  const info = h("div", { class: "card", style: { minHeight: "120px" } });

  const paint = () => {
    list.querySelectorAll("button[data-id]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.id === state.wf.id)));
    diagramBox.replaceChildren(h("div", { class: "muted", text: `${state.wf.title}. ${state.wf.summary}` }), diagram(state.wf));
    const steps = state.wf.steps;
    const cur = steps[state.at];
    stepBox.replaceChildren(
      h("h3", { text: `Step ${state.at + 1} of ${steps.length}: ${cur.action}` }),
      h("p", { text: cur.detail }),
      h("p", { class: "muted", text: `On: ${byId[cur.node].label}. Usually done by: ${state.wf.who}.` }),
      h("div", { class: "toolbar" },
        h("button", { class: "btn", type: "button", disabled: state.at === 0 ? "" : null, onclick: () => { state.at--; paint(); } }, "Previous"),
        h("button", { class: "btn primary", type: "button", disabled: state.at === steps.length - 1 ? "" : null, onclick: () => { state.at++; paint(); } }, "Next step"),
        h("button", { class: "btn", type: "button", onclick: () => { state.at = 0; paint(); } }, "Start again")),
      h("ol", { class: "cs-ul", style: { marginTop: "12px" } }, steps.map((s, i) => h("li", { style: { fontWeight: i === state.at ? 600 : 400, cursor: "pointer" }, onclick: () => { state.at = i; paint(); } }, `${s.action}`))));
    if (state.node) {
      const n = byId[state.node];
      info.replaceChildren(h("h3", { text: n.label }), h("p", { text: n.detail }), h("p", { class: "muted", text: `Kind: ${n.kind}. Owner in the sample: ${n.owner}.` }));
    } else {
      info.replaceChildren(h("p", { class: "muted", text: "Select an item on the diagram to see who owns it and what it does." }));
    }
  };

  for (const w of WORKFLOWS) {
    list.append(h("button", { class: "btn", type: "button", "data-id": w.id, "aria-pressed": String(w.id === state.wf.id), style: { justifyContent: "flex-start", textAlign: "left", height: "auto", minHeight: "40px", padding: "8px 12px", lineHeight: "1.3", whiteSpace: "normal" },
      onclick: () => { state.wf = w; state.at = 0; state.node = null; paint(); } }, w.title));
  }

  root.append(h("div", { class: "grid", style: { gridTemplateColumns: "minmax(220px, 260px) minmax(0, 1fr)", gap: "16px", alignItems: "start" } },
    list, h("div", { style: { display: "grid", gap: "14px" } }, diagramBox, stepBox, info)));

  // a click on a node in the diagram selects it for the detail panel
  diagramBox.addEventListener("click", (e) => {
    const g = e.target.closest?.(".fw-node");
    if (!g) return;
    state.node = g.getAttribute("data-id");
    paint();
  });
  paint();
  return root;
}
