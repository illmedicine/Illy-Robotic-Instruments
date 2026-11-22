// Friendly names for audit workloads and licence part numbers. Anything not listed shows its own name.

export const APPS = {
  MicrosoftTeams: "Teams", Exchange: "Exchange Online", SharePoint: "SharePoint", OneDrive: "OneDrive", Copilot: "Microsoft 365 Copilot",
  MicrosoftForms: "Forms", Planner: "Planner", MicrosoftTodo: "To Do", Yammer: "Viva Engage", MicrosoftStream: "Stream", Sway: "Sway",
  OneNote: "OneNote", Office365: "Office apps", ProjectForTheWeb: "Project", PowerBI: "Power BI", CRM: "Dynamics 365",
  MicrosoftFlow: "Power Automate", PowerApps: "Power Apps", PowerPlatform: "Power Platform admin", PowerPlatformAdmin: "Power Platform admin",
  PowerPlatformAdminDlp: "Power Platform DLP", AIApp: "AI apps", Viva: "Viva", Microsoft365Group: "Microsoft 365 Groups",
  AzureActiveDirectory: "Entra ID", Endpoint: "Endpoint management", PublicEndpoint: "Endpoint management",
  MicrosoftDefenderForEndpoint: "Defender for Endpoint", SecurityComplianceCenter: "Security & Compliance", ThreatIntelligence: "Threat intelligence",
};
export const ADMIN = new Set(["Endpoint", "PublicEndpoint", "MicrosoftDefenderForEndpoint", "SecurityComplianceCenter", "ThreatIntelligence", "AzureActiveDirectory", "PowerPlatformAdmin", "PowerPlatformAdminDlp"]);
export const appName = (w) => APPS[w] || w;

const SKUS = {
  SPE_E5: "Microsoft 365 E5", SPE_E3: "Microsoft 365 E3", SPE_F1: "Microsoft 365 F3", ENTERPRISEPREMIUM: "Office 365 E5", ENTERPRISEPACK: "Office 365 E3",
  STANDARDPACK: "Office 365 E1", DESKLESSPACK: "Office 365 F3", EXCHANGESTANDARD: "Exchange Online (Plan 1)", EXCHANGEENTERPRISE: "Exchange Online (Plan 2)",
  O365_BUSINESS_PREMIUM: "Microsoft 365 Business Standard", SPB: "Microsoft 365 Business Premium", POWER_BI_PRO: "Power BI Pro",
  POWER_BI_STANDARD: "Power BI (free)", PBI_PREMIUM_PER_USER: "Power BI Premium Per User", FLOW_FREE: "Power Automate Free",
  POWERAPPS_VIRAL: "Power Apps (trial)", POWERAPPS_DEV: "Power Apps Developer", POWER_AUTOMATE_PREMIUM: "Power Automate Premium", FLOW_PER_USER: "Power Automate Premium",
  POWERAPPS_PER_USER: "Power Apps Premium", Microsoft_365_Copilot: "Microsoft 365 Copilot", VISIOCLIENT: "Visio Plan 2", VISIOONLINE_PLAN1: "Visio Plan 1",
  PROJECTPREMIUM: "Project Plan 5", PROJECTPROFESSIONAL: "Project Plan 3", PROJECT_P1: "Project Plan 1", EMS: "Enterprise Mobility + Security E3",
  EMSPREMIUM: "Enterprise Mobility + Security E5", AAD_PREMIUM: "Entra ID P1", AAD_PREMIUM_P2: "Entra ID P2", MCOEV: "Teams Phone Standard",
  Microsoft_Teams_Premium: "Teams Premium", TEAMS_EXPLORATORY: "Teams Exploratory", DYN365_ENTERPRISE_SALES: "Dynamics 365 Sales Enterprise",
  DYN365_ENTERPRISE_CUSTOMER_SERVICE: "Dynamics 365 Customer Service Enterprise", DYN365_ENTERPRISE_PLAN1: "Dynamics 365 Plan 1",
  WINDOWS_STORE: "Windows Store", RIGHTSMANAGEMENT_ADHOC: "Rights Management (ad hoc)",
};
export const skuName = (part) => SKUS[part] || part;
