/* =============================================================================
 * data/terms.js — contract terms library.
 *
 * `patterns` drive the Contract Review engine: when an uploaded agreement
 * contains matching language, the term is flagged as present. `expected` marks
 * terms your organization should normally see in a Microsoft agreement; their absence is
 * reported as a gap.
 * ========================================================================== */

export const TERM_CATEGORIES = ["Agreement", "Pricing", "Rights", "Support", "Azure", "Timing", "Compliance"];

export const TERMS = [
  {
    id: "ede", term: "Enhanced Designated Engineering", abbr: "EDE", category: "Support",
    plain: "A Unified Support add-on that gives you a named Microsoft engineer working on your environment for a block of annual hours — proactive design, reviews and escalations rather than break/fix tickets.",
    whyItMatters: "EDE hours are usually sold as a fixed annual allocation. Unused hours rarely roll over, and price per hour varies widely by commitment size and bundle.",
    lever: "Right-size hours to your real project calendar and negotiate flexibility to convert unused hours into other proactive services.",
    askFor: ["Written hours-to-deliverables plan agreed up front", "Ability to convert unused EDE hours to other Unified Support proactive credits", "Rate card for incremental hours at the contracted price", "Quarterly utilisation reporting"],
    patterns: [/enhanced designated engineer/i, /\bEDE\b/, /designated engineer/i],
    expected: false, source: "unifiedSupport",
  },
  {
    id: "unified-support", term: "Unified Support", category: "Support",
    plain: "Microsoft's enterprise support offering, typically priced as a percentage of licence + cloud spend, with tiers (Core / Advanced / Performance) and proactive service credits.",
    whyItMatters: "Support is frequently 5–10%+ of total Microsoft spend and is renegotiable independently of licences. It is often attached to the same renewal calendar.",
    lever: "Decouple support from licence renewal; benchmark proactive credit usage and downgrade tiers you are not exercising.",
    askFor: ["Itemised pricing (not a blended percentage)", "Credit roll-over or conversion", "Named Customer Success contacts and SLAs"],
    patterns: [/unified support/i, /premier support/i, /proactive (services|credits)/i],
    expected: false, source: "unifiedSupport",
  },
  {
    id: "ea", term: "Enterprise Agreement", abbr: "EA", category: "Agreement",
    plain: "A three-year volume licensing agreement for larger organisations, with enrolment-level commitments, price protection and annual true-ups.",
    whyItMatters: "Pricing is locked for the term, but quantities are commitments. Over-ordering at signature locks in spend; under-ordering triggers true-up cost.",
    lever: "Negotiate the starting quantity conservatively, preserve true-down rights, and make growth additions price-protected.",
    askFor: ["Price protection for the full term on all SKUs including future adds", "Annual reduction (true-down) rights where permitted", "Co-terming of mid-term purchases"],
    patterns: [/enterprise agreement/i, /\benrol?lment\b/i, /\bEA\b/],
    expected: false, source: "licensingDocs",
  },
  {
    id: "mca-e", term: "Microsoft Customer Agreement for Enterprise", abbr: "MCA-E", category: "Agreement",
    plain: "The modern commercial agreement framework replacing the EA for many customers, with a lighter contractual structure and online-first purchasing.",
    whyItMatters: "Commercial mechanics (pricing, commitments, renewal flow) differ from the EA — assumptions carried over can cost money.",
    lever: "Confirm which discounts, price protections and rights carry across, and have them written into the order, not just verbally promised.",
    askFor: ["Written confirmation of price protection", "Clarity on term length and renewal pricing basis"],
    patterns: [/microsoft customer agreement/i, /\bMCA[- ]?E\b/i],
    expected: false, source: "licensingDocs",
  },
  {
    id: "csp", term: "Cloud Solution Provider", abbr: "CSP", category: "Agreement",
    plain: "Buying Microsoft cloud subscriptions through a partner, usually with monthly or annual billing and flexibility to adjust seat counts.",
    whyItMatters: "Flexibility trades off against pricing: monthly terms cost more than annual. The partner's margin and services are negotiable.",
    lever: "Compare annual-prepaid CSP with EA pricing at your size; negotiate partner services and billing terms.",
    askFor: ["Annual billing for committed seats, monthly for variable", "Partner support SLAs in writing"],
    patterns: [/cloud solution provider/i, /\bCSP\b/],
    expected: false, source: "licensingDocs",
  },
  {
    id: "price-levels", term: "Price levels (A–D) / volume tiers", category: "Pricing",
    plain: "Volume-based pricing tiers historically used in EA pricing. Microsoft has been changing how online-service discounts are applied.",
    whyItMatters: "Your effective price depends on the tier you qualify for and the policy in force at renewal.",
    lever: "Ask your account team to show the price-list basis for every line item and the policy applicable to your renewal date.",
    askFor: ["Price-list basis for each SKU", "Written confirmation of the discount policy applied"],
    patterns: [/price level/i, /level [A-D]\b/i, /volume (discount|tier)/i],
    expected: false, source: "licensingDocs",
  },
  {
    id: "true-up", term: "True-up", category: "Rights",
    plain: "An annual reconciliation where you pay for licences consumed above your committed quantity.",
    whyItMatters: "Uncontrolled growth shows up as a surprise bill; the same mechanism is why over-committing is costly.",
    lever: "Track consumption monthly and pre-price growth at the contracted rate.",
    askFor: ["Pre-agreed unit price for true-up quantities", "Quarterly consumption review"],
    patterns: [/true[- ]?up/i, /annual reconciliation/i],
    expected: true, source: "licensingDocs",
  },
  {
    id: "true-down", term: "True-down / reduction rights", category: "Rights",
    plain: "The right to reduce subscription quantities at an anniversary, within limits set by the agreement.",
    whyItMatters: "Without it you carry shelfware for the rest of the term.",
    lever: "Make reduction rights explicit and tie to named SKUs.",
    askFor: ["Reduction rights on the highest-risk SKUs (E5, Copilot, add-ons)", "Ability to swap SKUs at anniversary"],
    patterns: [/true[- ]?down/i, /reduc(e|tion) (of )?(the )?(quantit|subscription|seat)/i, /reduction right/i, /decrease (the )?quantit/i],
    expected: true, source: "licensingDocs",
  },
  {
    id: "price-protection", term: "Price protection", category: "Pricing",
    plain: "A guarantee that the price for a product stays fixed for a defined period — typically the agreement term.",
    whyItMatters: "Microsoft periodically announces list-price changes; protection determines whether they hit you mid-term.",
    lever: "Ask for coverage of every SKU you might add, not only the day-one list.",
    askFor: ["Protection for additions mid-term", "Protection across renewal cycles when possible"],
    patterns: [/price protect/i, /pric(e|ing) (is )?(locked|fixed|held)/i, /price (guarantee|lock)/i],
    expected: true, source: "licensingDocs",
  },
  {
    id: "sa", term: "Software Assurance", abbr: "SA", category: "Rights",
    plain: "A benefits package attached to licences: version upgrades, Hybrid Benefit, licence mobility, failover rights, training and planning services.",
    whyItMatters: "SA is often renewed by default on servers that no longer exist.",
    lever: "Reconcile SA to the live estate and drop the dead weight.",
    askFor: ["Itemised SA by product", "Drop-and-replace options for retired workloads"],
    patterns: [/software assurance/i, /\bSA\b/],
    expected: false, source: "hybridBenefit",
  },
  {
    id: "macc", term: "Microsoft Azure Consumption Commitment", abbr: "MACC", category: "Azure",
    plain: "A commitment to consume a fixed amount of Azure (and eligible Marketplace) spend over a term in exchange for discounts.",
    whyItMatters: "A shortfall is billed; an oversized MACC is a costly forecasting error. Marketplace eligibility can make it work harder.",
    lever: "Commit at a defensible forecast, and negotiate shortfall handling and Marketplace eligibility.",
    askFor: ["Marketplace spend counts toward MACC (eligible offers)", "Shortfall carry-over or extension", "Discount tiers tied to consumption bands"],
    patterns: [/azure consumption commitment/i, /\bMACC\b/, /monetary commitment/i, /shortfall/i],
    expected: false, source: "azureMacc",
  },
  {
    id: "hybrid-benefit", term: "Azure Hybrid Benefit", category: "Azure",
    plain: "Use existing Windows Server / SQL Server licences with SA (and certain subscriptions) to reduce Azure compute cost.",
    whyItMatters: "Frequently unclaimed — free money if you hold the entitlements.",
    lever: "Make claiming it a condition of any Azure review and renew SA only where used.",
    askFor: ["Entitlement review as part of the renewal"],
    patterns: [/hybrid benefit/i, /\bAHUB\b/],
    expected: false, source: "hybridBenefit",
  },
  {
    id: "fiscal-year", term: "Microsoft fiscal calendar", category: "Timing",
    plain: "Microsoft's fiscal year ends June 30 (half-year ends December 31). Sales teams are measured on quarter and year-end targets.",
    whyItMatters: "Deal timing changes how much flexibility the account team has.",
    lever: "Align decision milestones to quarter-end (Mar, Jun, Sep, Dec), with June the strongest, while keeping a credible alternative path.",
    askFor: ["Start negotiations 6–9 months before expiry so you can walk through a quarter-end"],
    patterns: [],
    expected: false, source: "licensingDocs",
  },
  {
    id: "migration-overlap", term: "Migration overlap window", category: "Rights",
    plain: "A period where you hold both the outgoing and incoming licences (for example Power BI Premium P-SKU and Fabric F-SKU) so you can migrate without downtime.",
    whyItMatters: "It is intended to be short. If your migration runs past the window you may be forced to pay twice, or lose the old entitlement before the new setup is ready.",
    lever: "Get the overlap length in writing, with an extension mechanism, and start the new capacity before the renewal date.",
    askFor: ["Exact overlap days in the order or amendment", "Written extension right if migration runs late", "Clarity on what happens to workloads and content after the window"],
    patterns: [/overlap (period|window)/i, /transition (period|window)/i, /migration (period|window)/i],
    expected: false, source: "fabricMigration",
  },
  {
    id: "capacity-reservation", term: "Capacity reservation vs pay-as-you-go", category: "Pricing",
    plain: "Reserved capacity commits you to a size for a term in exchange for a lower rate; pay-as-you-go costs more per hour but can be paused or resized.",
    whyItMatters: "Reserving the wrong size for three years is costly either way: too small throttles workloads, too big wastes money.",
    lever: "Reserve only the stable baseline; keep burst on pay-as-you-go; ask whether the reservation can be resized mid-term.",
    askFor: ["Reservation size-change terms", "Price difference between reserved and pay-as-you-go", "Start capacity before the renewal date"],
    patterns: [/reserv(ed|ation)/i, /pay[- ]as[- ]you[- ]go/i],
    expected: false, source: "fabricReservations",
  },
  {
    id: "co-term", term: "Co-terming", category: "Rights",
    plain: "Aligning mid-term additions so they end with the main agreement's term.",
    whyItMatters: "Prevents paying full-term cost for part-term use and keeps renewal events aligned.",
    lever: "Ask for pro-rated, co-termed additions at contracted unit prices.",
    askFor: ["Pro-rated co-termed adds"],
    patterns: [/co[- ]?term/i, /pro[- ]?rat(ed|a)/i],
    expected: true, source: "licensingDocs",
  },

  /* ---- organization-specific compliance terms (regulated organizations) ---- */
  {
    id: "baa", term: "HIPAA Business Associate Agreement", abbr: "BAA", category: "Compliance",
    plain: "The contract that permits a service provider to handle protected health information on your organization's behalf and sets breach-notification and safeguard duties.",
    whyItMatters: "A service holding PHI without BAA coverage is a HIPAA exposure regardless of how good the licence price is. New services such as Copilot features or Fabric workloads must be confirmed as in scope.",
    lever: "Make BAA coverage a condition of adding any new service, and get coverage confirmed in writing per product.",
    askFor: ["Written list of in-scope services under the BAA", "Notification of any scope change during the term", "Breach-notification timelines no longer than your own obligations"],
    patterns: [/business associate/i, /\bBAA\b/, /\bHIPAA\b/, /protected health information/i, /\bPHI\b/],
    expected: true, source: "hipaa",
  },
  {
    id: "audit-rights", term: "Customer audit & compliance evidence rights", category: "Compliance",
    plain: "Rights to receive audit reports, certifications and evidence of control operation from the vendor.",
    whyItMatters: "HITRUST and regulator reviews require evidence that vendor controls operate. Without contractual access, evidence collection depends on goodwill.",
    lever: "Tie evidence delivery to named reports (SOC 2, ISO 27001, HITRUST) and a delivery cadence.",
    askFor: ["Annual delivery of SOC 2 Type II and equivalent reports", "Access to the Service Trust Portal for your compliance staff", "Notice of material control changes"],
    patterns: [/audit (right|report)/i, /\bSOC ?2\b/i, /\bISO ?27001\b/i, /\bHITRUST\b/i, /compliance (report|evidence)/i],
    expected: true, source: "serviceTrust",
  },
  {
    id: "data-residency", term: "Data residency & location commitments", category: "Compliance",
    plain: "Commitments on the geography where customer data is stored and processed.",
    whyItMatters: "Your organization requires US-only residency. Capacity regions, backups and some AI processing can fall outside the region you expect.",
    lever: "Require explicit US-region commitments for core storage and for any AI or cross-region processing features.",
    askFor: ["US-only commitment for data at rest", "Notice before any processing-location change", "Per-service residency statement for Copilot and Fabric"],
    patterns: [/data (residency|location)/i, /united states/i, /geograph(y|ic)/i, /data (at rest|in transit)/i],
    expected: true, source: "productTerms",
  },
  {
    id: "termination", term: "Termination & exit rights", category: "Rights",
    plain: "Conditions under which your organization may end the agreement or specific subscriptions, and how data is returned or deleted.",
    whyItMatters: "An agreement with no workable exit is a lock-in. Data return and deletion timelines matter for PHI.",
    lever: "Secure termination-for-convenience on non-core subscriptions and defined data-return windows.",
    askFor: ["Data export window of at least 90 days post-termination", "Certified deletion on request", "Termination for regulatory change"],
    patterns: [/terminat(e|ion)/i, /data (return|deletion|retention)/i, /exit/i],
    expected: true, source: "licensingDocs",
  },
  {
    id: "liability", term: "Limitation of liability & indemnity", category: "Compliance",
    plain: "Caps on what each party can be liable for, and the situations where the vendor must indemnify your organization.",
    whyItMatters: "A standard cap can be small against a PHI breach. Carve-outs for data breach and IP indemnity are negotiable in some structures.",
    lever: "Review the cap against realistic breach cost and request data-protection carve-outs where the agreement structure allows.",
    askFor: ["Liability cap level and carve-outs identified for Legal", "IP indemnity coverage for AI-generated output"],
    patterns: [/limitation of liability/i, /indemnif/i, /liability cap/i],
    expected: true, source: "productTerms",
  },
  {
    id: "ai-terms", term: "AI / Copilot data-use commitments", category: "Compliance",
    plain: "Commitments on how prompts, grounding data and outputs are processed, stored and used for model training.",
    whyItMatters: "AI features read what the user can access. For a PHI-holding organisation the commitment that customer data is not used to train shared models is a threshold requirement.",
    lever: "Obtain written confirmation of data handling for each Copilot or AI feature before enabling it.",
    askFor: ["No use of your own data to train foundation models", "Per-feature BAA and residency confirmation", "Audit logging of AI interactions available to your organization"],
    patterns: [/copilot/i, /generative ai/i, /artificial intelligence/i, /\bAI\b/, /train(ing)? (of )?(models?|data)/i],
    expected: false, source: "hipaa",
  },
];

export const termById = (id) => TERMS.find((t) => t.id === id) ?? null;

export function searchTerms(q) {
  const n = String(q ?? "").toLowerCase().trim();
  if (!n) return TERMS;
  return TERMS.filter((t) => [t.term, t.abbr ?? "", t.plain, t.category].join(" ").toLowerCase().includes(n));
}
