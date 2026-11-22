/* =============================================================================
 * orgdefaults.js — what is particular to the organisation using this copy.
 *
 * Everything else in the analyzer is generic. Edit this one file to give a new
 * profile your starting values; each can also be changed later in the Workspace.
 * ========================================================================== */

export const ORG = {
  name: "Your organization", // the starting value of the organisation name in the Workspace
  shortName: "your organization", // how the home tenant is labelled
  homeTenantName: "Home tenant",
  homeDomain: "",
  /** Domains accepted for the home tenant, for example ["contoso.com", "contoso.onmicrosoft.com"]. Empty: any domain may be the home tenant. */
  homeDomainSuffixes: [],
  /** Date by which renewal decisions are due back to Microsoft (YYYY-MM-DD); empty until set in the Workspace. */
  responseDeadline: "",
  /** Constraint ids that start switched on in a new profile, for example ["phi", "us-residency"]. */
  constraintsOn: [],
};

/** Constraints that apply to your organisation only, added to the general list. Each: { id, label, detail, defaultOn }. */
export const ORG_CONSTRAINTS = [];
