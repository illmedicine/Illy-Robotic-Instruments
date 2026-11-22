/* =============================================================================
 * data/sources.js — provenance for every figure in the knowledge base.
 * Each entry records where a planning default came from so a reviewer can
 * confirm it before it is quoted or committed.
 * ========================================================================== */

export const SOURCES = {
  m365Plans: {
    id: "m365Plans",
    label: "Microsoft 365 plans & pricing",
    url: "https://www.microsoft.com/en-us/microsoft-365/enterprise/microsoft365-plans-and-pricing",
    note: "Published list pricing, USD, annual commitment. Your organization pays contracted prices — load them in the Workspace rate card.",
  },
  productTerms: {
    id: "productTerms",
    label: "Microsoft Product Terms",
    url: "https://www.microsoft.com/licensing/terms/",
    note: "Authoritative use rights. Overrides anything summarised here.",
  },
  licensingDocs: {
    id: "licensingDocs",
    label: "Microsoft Volume Licensing documentation",
    url: "https://www.microsoft.com/licensing/docs",
    note: "Agreement mechanics: EA, MCA-E, true-up, price protection.",
  },
  azurePricing: {
    id: "azurePricing",
    label: "Microsoft Fabric pricing (Azure)",
    url: "https://azure.microsoft.com/en-us/pricing/details/microsoft-fabric/",
    note: "F-SKU pay-as-you-go and reservation pricing, OneLake storage rates.",
  },
  fabricMigration: {
    id: "fabricMigration",
    label: "Automate your migration to Microsoft Fabric capacities",
    url: "https://www.microsoft.com/en-us/microsoft-fabric/blog/2024/12/02/automate-your-migration-to-microsoft-fabric-capacities/",
    note: "P-SKU retirement, migration options, 30-day free capacity and 90-day data access windows.",
  },
  fabricCapacityEstimator: {
    id: "fabricCapacityEstimator",
    label: "Microsoft Fabric capacity estimator",
    url: "https://www.microsoft.com/en-us/microsoft-fabric/capacity-estimator",
    note: "Microsoft's own sizing tool. Use alongside measured metrics, not instead of them.",
  },
  fabricReservations: {
    id: "fabricReservations",
    label: "Fabric capacity reservations",
    url: "https://learn.microsoft.com/en-us/azure/cost-management-billing/reservations/fabric-capacity",
    note: "Reservation scope, exchange and cancellation rules.",
  },
  semanticLinkLabs: {
    id: "semanticLinkLabs",
    label: "Semantic Link Labs — Capacity Migration notebook",
    url: "https://github.com/microsoft/semantic-link-labs/blob/main/notebooks/Capacity%20Migration.ipynb",
    note: "Microsoft-published automation for bulk P-SKU to F-SKU migration.",
  },
  capacityMetrics: {
    id: "capacityMetrics",
    label: "Fabric Capacity Metrics app",
    url: "https://learn.microsoft.com/en-us/fabric/enterprise/metrics-app",
    note: "The only defensible source for measured capacity utilisation.",
  },
  fabricThrottling: {
    id: "fabricThrottling",
    label: "Understand capacity throttling and smoothing",
    url: "https://learn.microsoft.com/en-us/fabric/enterprise/throttling",
    note: "Smoothing windows, the 10-minute / 60-minute / 24-hour throttle stages and how to stop throttling.",
  },
  directLakeOverview: {
    id: "directLakeOverview",
    label: "Direct Lake overview and guardrails",
    url: "https://learn.microsoft.com/en-us/fabric/fundamentals/direct-lake-overview",
    note: "Per-SKU row, file and memory guardrails, DirectQuery fallback and limitations.",
  },
  tableMaintenance: {
    id: "tableMaintenance",
    label: "Cross-workload table maintenance and optimization",
    url: "https://learn.microsoft.com/en-us/fabric/fundamentals/table-maintenance-optimization",
    note: "V-Order, row-group size, compaction and file-size guidance for Direct Lake tables.",
  },
  capacityNotifications: {
    id: "capacityNotifications",
    label: "Configure capacity notifications",
    url: "https://learn.microsoft.com/en-us/fabric/admin/service-admin-premium-capacity-notifications",
    note: "Threshold emails: check interval, three-hour suppression and limits.",
  },
  azureMacc: {
    id: "azureMacc",
    label: "Azure Consumption Commitment benefit",
    url: "https://learn.microsoft.com/en-us/marketplace/azure-consumption-commitment-benefit",
    note: "Which spend counts toward a MACC, including eligible Marketplace offers.",
  },
  hybridBenefit: {
    id: "hybridBenefit",
    label: "Azure Hybrid Benefit",
    url: "https://azure.microsoft.com/en-us/pricing/hybrid-benefit/",
    note: "Windows Server / SQL Server entitlement reuse in Azure.",
  },
  unifiedSupport: {
    id: "unifiedSupport",
    label: "Microsoft Unified Support",
    url: "https://www.microsoft.com/en-us/unifiedsupport",
    note: "Support tiers and proactive services. Priced separately from licences and separately negotiable.",
  },
  powerBiPricing: {
    id: "powerBiPricing",
    label: "Power BI pricing",
    url: "https://www.microsoft.com/power-platform/products/power-bi/pricing",
    note: "Pro and Premium Per User list pricing.",
  },
  skuNames: {
    id: "skuNames",
    label: "Product names and service plan identifiers",
    url: "https://learn.microsoft.com/en-us/entra/identity/users/licensing-service-plan-reference",
    note: "Maps friendly names to the skuPartNumber values in tenant exports.",
  },
  hipaa: {
    id: "hipaa",
    label: "Microsoft HIPAA / HITECH compliance offering",
    url: "https://learn.microsoft.com/en-us/compliance/regulatory/offering-hipaa-hitech",
    note: "Which Microsoft services are covered by the BAA. Confirm before bringing a service into PHI scope.",
  },
  serviceTrust: {
    id: "serviceTrust",
    label: "Microsoft Service Trust Portal",
    url: "https://servicetrust.microsoft.com/",
    note: "Audit reports and compliance evidence required for HITRUST assessment packs.",
  },
  lifecycle: {
    id: "lifecycle",
    label: "Microsoft Lifecycle Policy",
    url: "https://learn.microsoft.com/en-us/lifecycle/",
    note: "Authoritative end-of-support dates.",
  },
};

export const sourceById = (id) => SOURCES[id] ?? null;
