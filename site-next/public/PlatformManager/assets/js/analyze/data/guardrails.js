/* =============================================================================
 * data/guardrails.js — standards for the FABRIC page's capacity guardrails.
 *
 * `source: "microsoft"` items restate Microsoft Learn guidance (checked Nov 2026).
 * `source: "proposed"` items are starting values for your organization to adopt or change; they are
 * judgement, not Microsoft rules. Keep the two visibly separate.
 * ========================================================================== */

export const ISOLATION_POINTS = [
  { source: "microsoft", text: "Throttling is applied per capacity. When one capacity is overloaded, other capacities keep running normally, so a separate capacity is a real boundary." },
  { source: "microsoft", text: "Interactive operations (report views, DAX queries) are smoothed over 5 to 64 minutes. Background operations (typically refreshes, Spark, pipelines, Dataflows and warehouse work) are smoothed over 24 hours. On one capacity both draw on the same pool, so a long background run can push report viewers into delays." },
  { source: "microsoft", text: "Autoscale Billing for Spark takes Spark off the capacity: usage is billed pay-as-you-go and is not smoothed against the capacity. It is the cheapest way to keep Spark from affecting reports without buying a second capacity." },
  { source: "microsoft", text: "At F64 and above report viewers need no Pro licence, so production reporting belongs on F64 or larger. Engineering capacities serve no viewers and can be any size, including pause and resume." },
  { source: "proposed", text: "Use three tiers: production reporting (reserved, F64 or larger), engineering for ETL, Spark and Dataflows (pay-as-you-go, paused outside run windows), and dev/test (small, paused outside working hours). Assign workspaces to a tier by purpose, and let only capacity admins attach a workspace to production." },
];

export const ISOLATION_CHEAPER = [
  "Start with dev/test off the production capacity. It is cheap and removes the most unpredictable load.",
  "Keep production reporting and engineering together only while background work is under about 15% of CU. Reschedule heavy jobs outside the reporting day and turn on alerts first.",
  "Move Spark to Autoscale Billing before buying a second capacity, if Spark is the main background load.",
];

export const MODEL_STANDARDS = [
  {
    group: "Direct Lake tables",
    items: [
      { source: "microsoft", rule: "Point Direct Lake models at gold (serving) tables, not raw bronze tables.", check: "Lineage view; table layer naming." },
      { source: "microsoft", rule: "For Spark-written tables that feed Direct Lake, turn on V-Order or use the readHeavyForPBI resource profile.", check: "Table properties; Spark session config." },
      { source: "microsoft", rule: "Keep row groups between about 1 million and 16 million rows. Small or uneven row groups raise transcoding cost.", check: "Delta Analyzer." },
      { source: "microsoft", rule: "Keep Spark's adaptive target file size (128 MB to 1 GB) and auto compaction on. Run one OPTIMIZE on any table with accumulated small files. Run VACUUM on its own schedule and do not shorten its retention.", check: "DESCRIBE DETAIL: average file size; DESCRIBE HISTORY." },
      { source: "microsoft", rule: "Prefer append-friendly updates so incremental framing reuses existing Parquet files. Full rewrites force wide re-loading.", check: "Delta Analyzer update pattern." },
      { source: "microsoft", rule: "Prefer Direct Lake on OneLake. Direct Lake on SQL falls back to slower DirectQuery for SQL views and SQL-based granular security, so test with fallback switched off.", check: "Semantic model 'Direct Lake behavior' property." },
      { source: "microsoft", rule: "Stay inside the per-SKU guardrails below. On Direct Lake on OneLake, exceeding them makes refresh fail and the model unqueryable until the tables are optimised.", check: "Table counts against the guardrail table." },
    ],
  },
  {
    group: "Semantic models",
    items: [
      { source: "proposed", rule: "One certified shared semantic model per subject area, with reports built on it by live connection. Do not copy models per team.", check: "Endorsement status; lineage view for duplicate models." },
      { source: "proposed", rule: "Import models: incremental refresh on large fact tables, and refresh no more often than the data changes.", check: "Refresh schedule against source update frequency." },
      { source: "proposed", rule: "Remove unused columns and tables. Keep high-cardinality columns (GUIDs, free text, timestamps with seconds) out of the model.", check: "VertiPaq Analyzer; Best Practice Analyzer." },
      { source: "microsoft", rule: "Direct Lake: convert binary, GUID and complex Delta types before use, keep string values under 32,764 characters, and make one-side relationship columns unique (queries fail on duplicates).", check: "Test workspace query run." },
      { source: "microsoft", rule: "Define row-level security on the semantic model with a fixed-identity cloud connection. With Direct Lake on OneLake, SQL-endpoint row-level security is not applied to model queries.", check: "Security review with a test user." },
    ],
  },
  {
    group: "DAX",
    items: [
      { source: "proposed", rule: "Use variables for repeated expressions. Prefer measures to calculated columns.", check: "Best Practice Analyzer." },
      { source: "proposed", rule: "Avoid iterating (SUMX, FILTER over a whole table) across large fact tables when a column aggregation or a column filter gives the same answer.", check: "DAX query view; Performance Analyzer." },
      { source: "proposed", rule: "Starting performance gate in the Test workspace: report pages load in about 5 seconds and no single DAX query takes more than about 2 seconds at expected concurrency.", check: "Performance Analyzer export attached to the change." },
    ],
  },
  {
    group: "Data modelling",
    items: [
      { source: "proposed", rule: "Star schema: narrow fact tables, descriptive dimensions, single-direction relationships. Justify any many-to-many or bidirectional relationship in writing.", check: "Model diagram; Best Practice Analyzer." },
      { source: "proposed", rule: "Integer surrogate keys, fixed decimal types for money, and aggregation tables for very large facts.", check: "Model review." },
      { source: "proposed", rule: "Mark a date table, and make related columns the same data type.", check: "Model review." },
    ],
  },
];

export const MONITORING = [
  { source: "microsoft", name: "Fabric Capacity Metrics app", use: "Utilization, Throttling, Overages and System events for each capacity, and the top items by CU. Utilization over 100% is not itself throttling, so judge by the Throttling chart and minutes to burndown." },
  { source: "microsoft", name: "Throttling notifications (capacity settings)", use: "Email when usage reaches a percentage you set, and when the capacity is exceeded. Checked every 15 minutes, no more than one email per three hours, and no timestamp in the email, so treat it as a prompt to look, not a measurement." },
  { source: "microsoft", name: "Capacity Overview Events (Real-Time hub)", use: "Email alerts on capacity thresholds, set up through the Real-Time hub. Use it alongside the capacity settings for the critical alerts." },
  { source: "proposed", name: "Azure cost budget on each capacity resource", use: "Budget alert at 80% and 100% of the month's expected spend. It catches an unplanned scale-up or an unpaused capacity." },
  { source: "proposed", name: "Weekly capacity review", use: "Fifteen minutes: top ten items by CU, any threshold crossed, jobs that grew, and decisions on scaling. Record the decisions." },
];

export const SCALING_NOTES = [
  { source: "microsoft", text: "F-SKU capacities can be scaled up and down. Scaling between sizes on opposite sides of the F256 and F512 boundary can give a slower experience." },
  { source: "microsoft", text: "To stop throttling faster: temporarily raise the SKU (more idle capacity burns down the overage sooner), or pause then resume (billed for the accumulated future usage, and content is unavailable while paused). Capacity overage billing also works but costs three times the normal rate." },
  { source: "proposed", text: "Reserve only the stable baseline and keep the rest pay-as-you-go, so a temporary scale-up does not leave you paying for a reservation you do not need." },
];

export const GOVERNANCE_GATES = [
  { source: "proposed", gate: "Separate workspaces and pipeline", requirement: "Dev, Test and Production workspaces, promoted by a deployment pipeline. No direct publishing to Production. For Direct Lake on OneLake, use M parameters and parameter rules, because data-source rules are not supported.", evidence: "Pipeline run history." },
  { source: "proposed", gate: "Source control and review", requirement: "Changes reach Test through Git with a second reviewer.", evidence: "Pull request." },
  { source: "proposed", gate: "Model standards", requirement: "Best Practice Analyzer passes on the agreed rule set with no errors. Direct Lake tables pass the Delta Analyzer checks above.", evidence: "Analyzer output attached to the change." },
  { source: "proposed", gate: "Performance test", requirement: "Performance Analyzer results in the Test workspace meet the DAX and page-load gate.", evidence: "Performance Analyzer export." },
  { source: "proposed", gate: "CU test", requirement: "Run every new refresh, notebook, pipeline or Dataflow in Test and record its CU seconds in the Capacity Metrics app. A single job over the budget below needs written approval, and heavy jobs are scheduled outside the reporting day.", evidence: "Metrics app screenshot with the item and CU seconds." },
  { source: "proposed", gate: "Size headroom", requirement: "Tables and models are under 80% of every Direct Lake guardrail for the production SKU, so growth does not stop a refresh.", evidence: "Guardrail table comparison." },
  { source: "proposed", gate: "Security", requirement: "Row-level security lives on the semantic model with a fixed identity, not only on the SQL endpoint. PHI items carry a sensitivity label and an approved owner.", evidence: "Security review sign-off." },
  { source: "proposed", gate: "Ownership and cost", requirement: "Every workspace and item has a named owner, a cost centre and a purpose. Unowned or inactive items are reviewed each quarter and removed.", evidence: "Workspace register." },
  { source: "proposed", gate: "Who can use production capacity", requirement: "Only capacity admins, or the deployment pipeline identity, can assign a workspace to the production capacity. Developers work on dev/test capacity.", evidence: "Capacity contributor permissions." },
  { source: "proposed", gate: "Rollback and alerts", requirement: "A rollback step to the previous version and a refresh-failure alert are in place before promotion.", evidence: "Runbook link." },
];
