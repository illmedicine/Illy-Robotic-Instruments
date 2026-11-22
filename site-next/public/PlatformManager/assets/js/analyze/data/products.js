/* =============================================================================
 * data/products.js — Microsoft product catalogue.
 *
 * `listPriceUsd` is USD / user / month on an annual commitment and is a
 * PLANNING DEFAULT only. Your organization's contracted prices, loaded in the Workspace rate
 * card, always take precedence (see org.unitPrice).
 *
 * `skuPartNumbers` are the Microsoft Graph skuPartNumber values that appear in
 * tenant licence exports, so uploaded data can be mapped to a product.
 * `tier` ranks suites so the analyzer can detect when a lower entitlement is
 * already covered by a higher one assigned to the same user.
 * ========================================================================== */

export const FAMILIES = [
  "Microsoft 365",
  "Office 365",
  "Security & Identity",
  "Voice & Collaboration",
  "Power Platform & BI",
  "Copilot & AI",
  "Windows & Endpoints",
  "Dynamics 365",
  "Azure & Server",
];

/** persona: which your organization's workforce segment the product is normally right for. */
export const PRODUCTS = [
  {
    id: "m365-e3", name: "Microsoft 365 E3", family: "Microsoft 365", persona: "knowledge",
    aliases: ["e3", "m365 e3", "spe_e3", "microsoft 365 enterprise e3", "m365 g3"],
    skuPartNumbers: ["SPE_E3", "SPE_E3_USGOV_GCCHIGH"],
    summary: "Core enterprise bundle: Office apps, Exchange, SharePoint, Teams, Windows Enterprise E3, Entra ID P1, Intune and baseline compliance and information protection.",
    includes: ["Microsoft 365 Apps for enterprise", "Exchange Online Plan 2", "SharePoint & OneDrive", "Teams", "Windows 10/11 Enterprise E3", "Entra ID P1", "Intune", "Azure Information Protection P1"],
    listPriceUsd: 39,
    overlaps: ["o365-e3", "ems-e3", "entra-p1", "intune", "win-e3"],
    includesProducts: ["o365-e3", "ems-e3", "entra-p1", "intune", "win-e3"],
    commonWaste: ["Frontline and shift workers assigned E3 instead of F3", "Leavers and shared mailboxes holding paid licences", "Standalone Entra P1 / Intune bought on top of E3"],
    negotiation: ["Mix E3 with F3 for frontline to cut per-seat cost", "Ask for price protection across the term", "Use true-down rights at anniversary where the agreement permits"],
    healthcare: "Claims, mailroom and fulfilment roles rarely need desktop apps and Windows Enterprise. Segment them before renewal.",
    source: "m365Plans",
  },
  {
    id: "m365-e5", name: "Microsoft 365 E5", family: "Microsoft 365", persona: "power",
    aliases: ["e5", "m365 e5", "spe_e5", "m365 g5"],
    skuPartNumbers: ["SPE_E5", "SPE_E5_CALLINGMINUTES", "SPE_E5_NOPSTNCONF"],
    summary: "E3 plus advanced security (Defender suite), Entra ID P2, Purview compliance, Power BI Pro and Teams Phone capabilities.",
    includes: ["Everything in E3", "Defender for Endpoint P2 / Office 365 P2 / Identity / Cloud Apps", "Entra ID P2", "Purview advanced compliance & eDiscovery", "Power BI Pro", "Teams Phone"],
    listPriceUsd: 60,
    overlaps: ["m365-e3", "defender-endpoint-p2", "entra-p2", "power-bi-pro", "teams-phone", "ems-e5"],
    includesProducts: ["m365-e3", "o365-e3", "ems-e3", "ems-e5", "entra-p1", "entra-p2", "intune", "win-e3", "defender-endpoint-p2", "power-bi-pro", "teams-phone"],
    commonWaste: ["Whole-company E5 when only ~10–25% of users need the advanced features", "Paying for E5 security while a third-party EDR is still the active control", "Unused Power BI Pro / Teams Phone entitlements"],
    negotiation: ["Right-size: E3 baseline + E5 Security / E5 Compliance add-ons for users who need them", "Quantify displaced third-party tools and trade that spend for a better E5 price", "Step-up pricing over the term instead of day-one full deployment"],
    healthcare: "Purview eDiscovery and Insider Risk have real value for a HIPAA/HITRUST-regulated organisation, but only for compliance, legal and privileged-access populations — not the entire workforce.",
    source: "m365Plans",
  },
  {
    id: "m365-e7", name: "Microsoft 365 E7", family: "Microsoft 365", persona: "power",
    aliases: ["m365 e7", "e7"], skuPartNumbers: [],
    summary: "Suite quoted above Microsoft 365 E5. No published list price is loaded for it, so quotes for it are compared with each other but not with a reference price. Add its contracted price in Workspace, Rate card once it is known.",
    includes: [], overlaps: ["m365-e5"], includesProducts: [],
    commonWaste: [], negotiation: ["Price E7 against E5 plus the add-ons it replaces, line by line"], healthcare: "",
    source: "m365Plans",
  },
  {
    id: "m365-f3", name: "Microsoft 365 F3", family: "Microsoft 365", persona: "frontline",
    aliases: ["f3", "f1", "frontline", "spe_f1"],
    skuPartNumbers: ["SPE_F1", "M365_F1_COMM", "M365_F1"],
    summary: "Frontline worker bundle: web/mobile Office, Teams, Exchange (small mailbox), Entra ID P1, Intune.",
    includes: ["Office web & mobile apps", "Teams", "Exchange Online Kiosk", "SharePoint", "Entra ID P1", "Intune"],
    listPriceUsd: 10,
    overlaps: ["m365-e3"],
    includesProducts: ["entra-p1", "intune"],
    commonWaste: ["Knowledge workers parked on F3 then topped up with add-ons that cost more than E3"],
    negotiation: ["Count every frontline role and move them off E3 — often the single biggest per-seat saving"],
    healthcare: "Best fit for claims intake, mailroom, print/fulfilment, facilities and shared-device clinical roles.",
    source: "m365Plans",
  },
  {
    id: "m365-bp", name: "Microsoft 365 Business Premium", family: "Microsoft 365", persona: "knowledge",
    aliases: ["business premium", "bp", "spb"], skuPartNumbers: ["SPB"],
    summary: "SMB bundle with desktop Office apps, Teams, Defender for Business, Intune and Entra ID P1. Capped at 300 users per tenant.",
    includes: ["Microsoft 365 Apps", "Exchange", "SharePoint", "Teams", "Defender for Business", "Intune", "Entra ID P1"],
    listPriceUsd: 22, maxUsers: 300,
    overlaps: ["m365-e3"], includesProducts: ["entra-p1", "intune"],
    commonWaste: ["Stand-alone endpoint security or MDM bought on top of Business Premium"],
    negotiation: ["Through CSP: ask the partner for annual-billing discounts and monthly-billing flexibility"],
    healthcare: "Only relevant to small guest or affiliate tenants. The 300-user cap rules it out for your organization's home tenant.",
    source: "m365Plans",
  },
  {
    id: "o365-e3", name: "Office 365 E3", family: "Office 365", persona: "knowledge",
    aliases: ["o365 e3", "enterprisepack"], skuPartNumbers: ["ENTERPRISEPACK"],
    summary: "Office apps and online services without Windows Enterprise, EMS or advanced security. Often a legacy SKU.",
    includes: ["Microsoft 365 Apps", "Exchange Online Plan 2", "SharePoint", "Teams"],
    listPriceUsd: 26, overlaps: ["m365-e3"], includesProducts: [],
    commonWaste: ["O365 E3 + EMS E3 + Windows E3 bought separately when M365 E3 bundles them for less"],
    negotiation: ["Price a consolidated M365 E3 against the stacked components"],
    healthcare: "Legacy stacks often survive from before a suite consolidation. Reconcile them against current assignment.",
    source: "m365Plans",
  },
  {
    id: "o365-e5", name: "Office 365 E5", family: "Office 365", persona: "power",
    aliases: ["o365 e5", "enterprisepremium"], skuPartNumbers: ["ENTERPRISEPREMIUM", "ENTERPRISEPREMIUM_NOPSTNCONF"],
    summary: "O365 E3 plus Defender for Office 365 P2, Power BI Pro, Teams Phone, advanced compliance and analytics.",
    includes: ["Everything in O365 E3", "Defender for Office 365 P2", "Power BI Pro", "Teams Phone", "Advanced eDiscovery"],
    listPriceUsd: 41, overlaps: ["m365-e5", "o365-e3"],
    includesProducts: ["o365-e3", "power-bi-pro", "teams-phone"],
    commonWaste: ["O365 E5 layered with EMS E5 instead of M365 E5"],
    negotiation: ["Compare to M365 E5 with the same capabilities"],
    healthcare: "",
    source: "m365Plans",
  },
  {
    id: "ems-e3", name: "Enterprise Mobility + Security E3", family: "Security & Identity", persona: "knowledge",
    aliases: ["ems e3", "ems"], skuPartNumbers: ["EMS"],
    summary: "Entra ID P1, Intune, Azure Information Protection P1 and Advanced Threat Analytics rights.",
    includes: ["Entra ID P1", "Intune", "AIP P1"], listPriceUsd: 12,
    overlaps: ["m365-e3", "entra-p1", "intune"], includesProducts: ["entra-p1", "intune"],
    commonWaste: ["Already included in Microsoft 365 E3/E5 — a classic duplicate"],
    negotiation: ["Remove at renewal if users are on M365 E3/E5"],
    healthcare: "",
    source: "m365Plans",
  },
  {
    id: "ems-e5", name: "Enterprise Mobility + Security E5", family: "Security & Identity", persona: "power",
    aliases: ["ems e5", "emspremium"], skuPartNumbers: ["EMSPREMIUM"],
    summary: "EMS E3 plus Entra ID P2, Defender for Identity and Cloud Apps, AIP P2.",
    includes: ["Everything in EMS E3", "Entra ID P2", "Defender for Identity", "Defender for Cloud Apps"],
    listPriceUsd: 18, overlaps: ["m365-e5", "entra-p2"],
    includesProducts: ["ems-e3", "entra-p1", "entra-p2", "intune"],
    commonWaste: ["Included in M365 E5"], negotiation: ["Remove duplicates before renewal"],
    healthcare: "",
    source: "m365Plans",
  },
  {
    id: "entra-p1", name: "Microsoft Entra ID P1", family: "Security & Identity", persona: "knowledge",
    aliases: ["entra p1", "aad p1", "azure ad premium p1", "aad_premium"], skuPartNumbers: ["AAD_PREMIUM"],
    summary: "Conditional Access, group-based licensing, self-service password reset with writeback, hybrid identity.",
    includes: ["Conditional Access", "Dynamic groups", "SSPR writeback", "App proxy"], listPriceUsd: 7,
    overlaps: ["m365-e3", "m365-e5", "ems-e3", "m365-bp", "m365-f3"], includesProducts: [],
    commonWaste: ["Standalone P1 on users already covered by M365 E3/E5/Business Premium/F3"],
    negotiation: ["Audit assignment overlap with a group-based licensing report"],
    healthcare: "",
    source: "m365Plans",
  },
  {
    id: "entra-p2", name: "Microsoft Entra ID P2", family: "Security & Identity", persona: "power",
    aliases: ["entra p2", "aad p2", "aad_premium_p2"], skuPartNumbers: ["AAD_PREMIUM_P2"],
    summary: "P1 plus Identity Protection and Privileged Identity Management.",
    includes: ["Identity Protection", "PIM", "Access reviews"], listPriceUsd: 10,
    overlaps: ["m365-e5", "ems-e5"], includesProducts: ["entra-p1"],
    commonWaste: ["Bought for all users when only admins and risk-based policies need it"],
    negotiation: ["Scope P2 to privileged and risk-policy users"],
    healthcare: "PIM and access reviews support HIPAA minimum-necessary evidence — scope to administrators and ePHI custodians.",
    source: "m365Plans",
  },
  {
    id: "intune", name: "Microsoft Intune (Plan 1)", family: "Security & Identity", persona: "knowledge",
    aliases: ["intune", "intune_a"], skuPartNumbers: ["INTUNE_A"],
    summary: "Cloud MDM/MAM for Windows, macOS, iOS and Android.",
    includes: ["Device management", "App protection"], listPriceUsd: 8,
    overlaps: ["m365-e3", "m365-bp", "ems-e3", "m365-f3"], includesProducts: [],
    commonWaste: ["Standalone Intune on top of M365 E3/E5 or Business Premium"],
    negotiation: ["Remove when covered by bundle"], healthcare: "",
    source: "m365Plans",
  },
  {
    id: "defender-endpoint-p2", name: "Defender for Endpoint P2", family: "Security & Identity", persona: "power",
    aliases: ["mde", "defender endpoint", "wdatp"], skuPartNumbers: ["WIN_DEF_ATP"],
    summary: "EDR with advanced hunting, automated investigation and threat & vulnerability management.",
    includes: ["EDR", "Advanced hunting", "TVM"], listPriceUsd: 5.2,
    overlaps: ["m365-e5"], includesProducts: [],
    commonWaste: ["Bought alongside M365 E5 (already included)"],
    negotiation: ["Use as leverage against third-party EDR renewals"], healthcare: "",
    source: "m365Plans",
  },
  {
    id: "teams-phone", name: "Teams Phone (Standard)", family: "Voice & Collaboration", persona: "knowledge",
    aliases: ["teams phone", "mcoev", "phone system"], skuPartNumbers: ["MCOEV"],
    summary: "Cloud PBX capabilities in Teams; PSTN calling is licensed separately.",
    includes: ["Auto attendants", "Call queues", "Call routing"], listPriceUsd: 8,
    overlaps: ["m365-e5", "o365-e5"], includesProducts: [],
    commonWaste: ["Purchased for users who already hold it through E5", "Assigned to users who never place PSTN calls"],
    negotiation: ["Check calling-plan vs Direct Routing economics"],
    healthcare: "Member-services and care-management contact centres have genuine voice demand; verify the rest.",
    source: "m365Plans",
  },
  {
    id: "teams-premium", name: "Teams Premium", family: "Voice & Collaboration", persona: "power",
    aliases: ["teams premium"], skuPartNumbers: ["Microsoft_Teams_Premium"],
    summary: "Add-on for advanced meeting protection, branding, webinars and intelligent recap.",
    includes: ["Watermarking", "Advanced webinars", "Intelligent recap"], listPriceUsd: 10,
    overlaps: [], includesProducts: [],
    commonWaste: ["Broad rollout without usage proof"],
    negotiation: ["Pilot with the specific teams who run webinars or sensitive meetings"], healthcare: "",
    source: "m365Plans",
  },
  {
    id: "copilot-m365", name: "Microsoft 365 Copilot", family: "Copilot & AI", persona: "power",
    aliases: ["copilot", "m365 copilot", "microsoft_365_copilot"], skuPartNumbers: ["Microsoft_365_Copilot"],
    summary: "AI assistant across Word, Excel, PowerPoint, Outlook and Teams grounded in tenant data. Requires a qualifying M365/O365 base licence.",
    includes: ["Copilot in M365 apps", "Copilot Chat with enterprise data protection", "Graph-grounded answers"],
    listPriceUsd: 30, overlaps: [], includesProducts: [],
    commonWaste: ["Licences assigned to users with no usage after 30–60 days", "Rolled out before data-governance clean-up, reducing value"],
    negotiation: ["Phase purchases against adoption milestones; ask for pilot pricing and reassignment rights", "Avoid committing a large Copilot quantity up-front in the first term"],
    healthcare: "Copilot surfaces whatever a user can already reach. Clean up over-shared PHI locations and apply sensitivity labels before broad rollout.",
    source: "m365Plans",
  },
  {
    id: "power-bi-pro", name: "Power BI Pro", family: "Power Platform & BI", persona: "knowledge",
    aliases: ["power bi pro", "pbi pro", "power_bi_pro"], skuPartNumbers: ["POWER_BI_PRO"],
    summary: "Author, share and consume Power BI content in shared capacity.",
    includes: ["Report authoring", "Sharing & collaboration"], listPriceUsd: 14,
    overlaps: ["m365-e5", "o365-e5"], includesProducts: [],
    commonWaste: ["Pro bought for users covered by E5", "Viewers licensed as Pro when Premium capacity would cover consumers"],
    negotiation: ["Model Pro vs Premium/Fabric capacity break-even"], healthcare: "",
    source: "powerBiPricing",
  },
  {
    id: "power-bi-ppu", name: "Power BI Premium Per User", family: "Power Platform & BI", persona: "power",
    aliases: ["ppu", "premium per user", "power_bi_premium_per_user"], skuPartNumbers: ["PBI_PREMIUM_PER_USER"],
    summary: "Premium features licensed per user.",
    includes: ["Larger models", "Paginated reports", "AI features"], listPriceUsd: 24,
    overlaps: ["power-bi-pro"], includesProducts: ["power-bi-pro"],
    commonWaste: ["PPU for casual users"],
    negotiation: ["Evaluate capacity-based licensing past ~hundreds of users"], healthcare: "",
    source: "powerBiPricing",
  },
  {
    id: "fabric-capacity", name: "Microsoft Fabric capacity (F-SKUs)", family: "Power Platform & BI", persona: "platform",
    aliases: ["fabric", "f64", "f sku", "fabric capacity", "p1", "power bi premium", "premium capacity"],
    skuPartNumbers: ["PBI_PREMIUM_P1", "PBI_PREMIUM_P2", "PBI_PREMIUM_P3"],
    summary: "Capacity-based analytics platform that replaces Power BI Premium per-capacity (P-SKU). F64 and above lets free users view Power BI content; below F64 every viewer needs a Pro licence.",
    includes: ["Power BI Premium features", "Data engineering, warehouses, pipelines, real-time analytics", "Pause/resume and resize (pay-as-you-go)", "Reservation discounts"],
    overlaps: ["power-bi-pro", "power-bi-ppu", "m365-e5"], includesProducts: [],
    commonWaste: ["Capacity sized from P-SKU name instead of measured utilisation", "Running at F64+ for a small viewer base that Pro licences would cover more cheaply", "Reserving a 3-year size before workloads stabilise"],
    negotiation: ["Reserve the stable baseline and use pay-as-you-go for bursts", "Ask for an overlap window long enough for migration, in writing", "Ask whether size can change mid-term", "Count Pro licences already included in M365 E5"],
    healthcare: "Capacity region must satisfy US-only residency. Workspaces holding Fabric items cannot move across regions, so choose the region once.",
    source: "azurePricing",
  },
  {
    id: "win-e3", name: "Windows Enterprise E3", family: "Windows & Endpoints", persona: "knowledge",
    aliases: ["windows e3", "win e3"], skuPartNumbers: ["WIN10_VDA_E3", "WIN_ENT_E3"],
    summary: "Windows subscription activation, enterprise management and security features.",
    includes: ["Subscription activation", "Credential Guard"], listPriceUsd: 7.63,
    overlaps: ["m365-e3"], includesProducts: [],
    commonWaste: ["Duplicate with M365 E3/E5"], negotiation: ["Remove if covered by M365"], healthcare: "",
    source: "m365Plans",
  },
  {
    id: "d365-sales-ent", name: "Dynamics 365 Sales Enterprise", family: "Dynamics 365", persona: "power",
    aliases: ["d365 sales", "dynamics sales"], skuPartNumbers: ["DYN365_ENTERPRISE_SALES"],
    summary: "CRM sales application with AI-assisted selling.",
    includes: ["Sales automation", "Forecasting"], listPriceUsd: 95,
    overlaps: [], includesProducts: [],
    commonWaste: ["Full licences for light users who qualify for Team Member"],
    negotiation: ["Use Team Member/attach licences for occasional users"], healthcare: "",
    source: "licensingDocs",
  },
  /* Products below are typically held in renewal exports. Their listPriceUsd is a planning price per
     user per month (annual cost / 12); replace it with your contracted price in the Workspace rate card. */
  {
    id: "d365-cs-ent", name: "Dynamics 365 Customer Service Enterprise", family: "Dynamics 365", persona: "power",
    aliases: ["d365 customer service", "dynamics customer service", "dynamics 365 customer service"], skuPartNumbers: ["DYN365_ENTERPRISE_CUSTOMER_SERVICE"],
    summary: "Case management and omnichannel customer service application.",
    includes: ["Case management", "Knowledge management", "Omnichannel routing"], listPriceUsd: 105,
    overlaps: [], includesProducts: [],
    commonWaste: ["Full licences for users who only view or occasionally update cases", "Leavers and inactive agents holding a seat"],
    negotiation: ["Use Team Member or attach licences for occasional users", "Ask for reassignment rights as agents move between queues"], healthcare: "",
    source: "licensingDocs",
  },
  {
    id: "d365-sales-attach", name: "Dynamics 365 Sales Enterprise Attach to Qualifying Dynamics 365 Base Offer", family: "Dynamics 365", persona: "power",
    aliases: ["dynamics 365 sales enterprise attach to qualifying", "d365 sales attach", "sales enterprise attach"], skuPartNumbers: [],
    summary: "Discounted additional Dynamics 365 application for a user who already holds a qualifying Dynamics 365 base licence.",
    includes: ["Sales automation on top of a base Dynamics 365 licence"], listPriceUsd: 20,
    overlaps: ["d365-sales-ent"], includesProducts: [],
    commonWaste: ["Attach licence kept after the base licence was removed, which makes it ineligible"],
    negotiation: ["Confirm each attach seat still has a qualifying base licence before renewing"], healthcare: "",
    source: "licensingDocs",
  },
  {
    id: "visio-plan-2", name: "Visio Plan 2", family: "Microsoft 365", persona: "knowledge",
    aliases: ["visio", "visio p2", "visio plan 2"], skuPartNumbers: ["VISIOCLIENT"],
    summary: "Desktop and web diagramming with the full Visio app.",
    includes: ["Visio desktop app", "Visio for the web", "Data-linked diagrams"], listPriceUsd: 15,
    overlaps: [], includesProducts: [],
    commonWaste: ["Seats with no Visio use in the last 12 months", "Plan 2 where the web-only Plan 1 would do"],
    negotiation: ["Remove seats unused for 12 months at renewal", "Move light users to Plan 1"], healthcare: "",
    source: "licensingDocs",
  },
  {
    id: "project-plan-3", name: "Planner and Project Plan 3", family: "Microsoft 365", persona: "power",
    aliases: ["project plan 3", "project p3", "planner and project", "project online professional"], skuPartNumbers: ["PROJECTPROFESSIONAL"],
    summary: "Work and project management with the Project desktop client and Planner premium features.",
    includes: ["Project desktop client", "Planner premium plans", "Resource management"], listPriceUsd: 30,
    overlaps: [], includesProducts: [],
    commonWaste: ["Seats held by people who only view schedules", "Leavers and inactive project managers"],
    negotiation: ["Use Plan 1 for contributors who do not need the desktop client"], healthcare: "",
    source: "licensingDocs",
  },
  {
    id: "power-apps-premium", name: "Power Apps Premium", family: "Power Platform & BI", persona: "power",
    aliases: ["power apps per user", "powerapps per user", "power apps premium"], skuPartNumbers: ["POWERAPPS_PER_USER"],
    summary: "Per-user licence to run any number of premium Power Apps, with Dataverse access and managed environments.",
    includes: ["Unlimited premium apps per user", "Dataverse access", "Managed Environments"], listPriceUsd: 20,
    overlaps: [], includesProducts: [],
    commonWaste: ["Per-user seats for people who use one app that a per-app or pay-as-you-go plan would cover", "Seats for users with no premium app activity"],
    negotiation: ["Compare per-user with pay-as-you-go once the number of active apps per user is known"], healthcare: "",
    source: "licensingDocs",
  },
  {
    id: "power-automate-premium", name: "Power Automate Premium", family: "Power Platform & BI", persona: "power",
    aliases: ["power automate per user", "flow per user", "power automate premium"], skuPartNumbers: ["POWER_AUTOMATE_PREMIUM", "FLOW_PER_USER"],
    summary: "Per-user licence for premium connectors, attended RPA and process mining.",
    includes: ["Premium connectors", "Attended RPA", "Process mining"], listPriceUsd: 15,
    overlaps: [], includesProducts: [],
    commonWaste: ["Seats for makers whose flows use only standard connectors", "Seats for users with no run history"],
    negotiation: ["Move flows owned by a service account to a per-flow plan"], healthcare: "",
    source: "licensingDocs",
  },
  {
    id: "teams-rooms-pro", name: "Microsoft Teams Rooms Pro", family: "Voice & Collaboration", persona: "platform",
    aliases: ["teams rooms pro", "teams room pro"], skuPartNumbers: ["Microsoft_Teams_Rooms_Pro"],
    summary: "Per-room licence for Teams Rooms devices, with management and meeting features.",
    includes: ["Teams Rooms app", "Advanced room management", "Intelligent meeting features"], listPriceUsd: 40,
    overlaps: [], includesProducts: [],
    commonWaste: ["Licences for retired or unplugged rooms"],
    negotiation: ["Reconcile room count to devices that checked in during the last 90 days"], healthcare: "",
    source: "licensingDocs",
  },
  {
    id: "entra-id-governance", name: "Microsoft Entra ID Governance Add-on for Microsoft Entra ID P2", family: "Security & Identity", persona: "power",
    aliases: ["entra id governance", "entra governance", "identity governance"], skuPartNumbers: ["Microsoft_Entra_ID_Governance"],
    summary: "Lifecycle workflows, entitlement management and access reviews, added on top of Entra ID P2.",
    includes: ["Lifecycle workflows", "Entitlement management", "Access reviews"], listPriceUsd: 14.95,
    overlaps: ["entra-p2"], includesProducts: [],
    commonWaste: ["Seats for users who are not in any access package or review"],
    negotiation: ["Size to the population that is actually governed"], healthcare: "",
    source: "licensingDocs",
  },
  {
    id: "azure-consumption", name: "Azure (consumption / MACC)", family: "Azure & Server", persona: "platform",
    aliases: ["azure", "macc", "azure consumption"], skuPartNumbers: [],
    summary: "Pay-as-you-go cloud services. A MACC trades a committed spend for discounts and Marketplace eligibility.",
    includes: ["IaaS/PaaS services", "Marketplace purchases may count toward MACC"],
    overlaps: [], includesProducts: [],
    commonWaste: ["Idle VMs and unattached disks", "Unused reservations", "Over-committing a MACC and paying a shortfall"],
    negotiation: ["Size MACC at a defensible P50 of forecast, not the optimistic case", "Confirm Marketplace-eligible spend counts toward the commitment", "Layer Savings Plans / Reservations and Hybrid Benefit"],
    healthcare: "",
    source: "azureMacc",
  },
  {
    id: "windows-server-sa", name: "Windows Server (with Software Assurance)", family: "Azure & Server", persona: "platform",
    aliases: ["windows server", "winsvr"], skuPartNumbers: [],
    summary: "Server licences by core; Software Assurance enables Azure Hybrid Benefit and licence mobility.",
    includes: ["Core licences", "Azure Hybrid Benefit with SA"], overlaps: [], includesProducts: [],
    commonWaste: ["Hybrid Benefit not enabled on eligible Azure VMs", "SA renewed on decommissioned servers"],
    negotiation: ["Reconcile SA coverage to the current server estate before renewing"], healthcare: "",
    source: "hybridBenefit",
  },
  {
    id: "sql-server-sa", name: "SQL Server (Enterprise/Standard + SA)", family: "Azure & Server", persona: "platform",
    aliases: ["sql server", "sql"], skuPartNumbers: [],
    summary: "Core-based database licensing; SA gives Hybrid Benefit and passive failover rights.",
    includes: ["Core licences", "Hybrid Benefit with SA"], overlaps: [], includesProducts: [],
    commonWaste: ["Enterprise edition where Standard would do", "Hybrid Benefit unclaimed on Azure SQL"],
    negotiation: ["Audit edition use and consolidate; claim Hybrid Benefit"], healthcare: "",
    source: "hybridBenefit",
  },
];

/* -----------------------------------------------------------------------------
 * Lookup helpers
 * -------------------------------------------------------------------------- */
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

export const productById = (id) => PRODUCTS.find((p) => p.id === id) ?? null;

export const productBySku = (part) => {
  const q = String(part ?? "").trim().toLowerCase();
  if (!q) return null;
  return PRODUCTS.find((p) => p.skuPartNumbers.some((s) => s.toLowerCase() === q)) ?? null;
};

/**
 * Match a free-text product name (from an export or contract) to a catalogue entry.
 * Deliberately strict: a name, alias or SKU must appear as whole tokens in the text.
 * An unmatched licence is reported as unpriced, which is safer than a wrong price.
 */
export function matchProduct(text) {
  const n = norm(text);
  if (!n) return null;
  const padded = ` ${n} `;
  let best = null;
  let bestLen = 0;
  for (const p of PRODUCTS) {
    for (const h of [p.name, ...p.aliases, ...p.skuPartNumbers].map(norm)) {
      if (h.length >= 2 && padded.includes(` ${h} `) && h.length > bestLen) {
        best = p;
        bestLen = h.length;
      }
    }
  }
  return best;
}

export function searchProducts(q, limit = 12) {
  const n = norm(q);
  if (!n) return PRODUCTS.slice(0, limit);
  const toks = n.split(" ");
  return PRODUCTS.map((p) => {
    const hay = [p.name, ...p.aliases, ...p.skuPartNumbers, p.family].map(norm);
    let score = 0;
    for (const h of hay) {
      if (h === n) score += 100;
      else if (h.includes(n)) score += 40;
    }
    for (const t of toks) {
      for (const h of hay) {
        if (h.split(" ").includes(t)) score += 8;
        else if (h.includes(t)) score += 2;
      }
    }
    if (norm(p.summary).includes(n)) score += 3;
    return { p, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

/** True when `holder` already entitles the user to everything in `covered`. */
export function entitles(holderId, coveredId) {
  const h = productById(holderId);
  return Boolean(h && h.includesProducts?.includes(coveredId));
}
