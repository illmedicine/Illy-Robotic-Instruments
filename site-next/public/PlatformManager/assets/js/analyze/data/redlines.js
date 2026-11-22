/* =============================================================================
 * data/redlines.js — draft contract language the Contract Review attaches to findings.
 *
 * These are starting positions for your Legal and Procurement teams, not legal advice.
 * Square brackets mark numbers and names to be negotiated or filled in.
 * `kind`: "replace" strikes the sentence found in the agreement and substitutes the clause;
 *         "insert" adds a clause the agreement lacks; "exception" records a one-off agreed carve-out.
 * ========================================================================== */

export const CLAUSES = {
  "price-lock": {
    kind: "replace", topic: "Pricing and price protection",
    clause: "Pricing. The prices and product terms stated in this Agreement are fixed for the Term. No change to prices, product terms or this Agreement binds Customer unless it is set out in a written amendment signed by both parties. Prices for products added during the Term are the unit prices in [price sheet], not the then-current list price.",
    fallback: "Changes to online product terms take effect for Customer only at the next renewal, on at least [180] days' written notice, and may not reduce Customer's rights or increase prices for quantities already committed.",
  },
  "audit-limits": {
    kind: "replace", topic: "Vendor licence verification",
    clause: "Verification. Microsoft may verify Customer's compliance with this Agreement no more than once in any [12]-month period, on at least [30] days' written notice, during normal business hours, and only for the products licensed under this Agreement. Verification is performed by an independent third party bound by written confidentiality obligations and does not include access to systems, protected health information or member data. Microsoft will give Customer a written report and [30] days to respond before making any claim.",
    fallback: "Self-certification as the first step, with on-site verification only after a documented, good-faith reason.",
  },
  "exit-rights": {
    kind: "insert", topic: "Termination and reduction rights",
    clause: "Reduction and termination. At each anniversary date Customer may reduce the quantity of, or terminate, any subscription that is not a core service on [30] days' written notice. Fees for the reduced or terminated quantity are not payable for the period after the effective date.",
    fallback: "A right to reduce up to [20]% of seats per product at each anniversary.",
  },
  "shortfall-carry": {
    kind: "replace", topic: "Commitment shortfall",
    clause: "Commitment shortfall. Any part of the annual commitment not consumed in a contract year carries forward to the next contract year or, at Customer's election, extends the Term by [12] months. It is not invoiced as a shortfall. Eligible spend includes Azure Marketplace purchases and Microsoft Fabric capacity.",
    fallback: "Carry-forward of up to [15]% of the annual commitment.",
  },
  "trueup-price": {
    kind: "insert", topic: "True-up pricing",
    clause: "True-up. Quantities ordered above the committed quantity are priced at the unit prices in [price sheet] for the remainder of the Term and are co-termed to the end date of this Agreement.",
    fallback: "Annual true-up only, with a [30]-day payment window and no retroactive price changes.",
  },
  "co-term": {
    kind: "insert", topic: "Co-terming of additions",
    clause: "Co-terming. Products added during the Term are co-termed to the end date of this Agreement, with fees pro-rated from the date of order at the contracted unit prices.",
    fallback: "Pro-rated additions at no more than the contracted price for the same product.",
  },
  "true-down": {
    kind: "insert", topic: "Reduction (true-down) rights",
    clause: "Reductions. At each anniversary date Customer may reduce the quantity of any subscription by up to [20]% of its committed quantity on [30] days' written notice, and fees are reduced for the remainder of the Term. Customer may move seats between [E3, E5 and F3] without penalty.",
    fallback: "Reduction rights limited to named suite SKUs, with a floor of [80]% of the starting quantity.",
  },
  "baa": {
    kind: "insert", topic: "HIPAA Business Associate Agreement",
    clause: "HIPAA. Microsoft will enter into and maintain a Business Associate Agreement with Customer covering every online service Customer uses with protected health information. Microsoft will notify Customer in writing at least [90] days before any service is added to or removed from the scope of that Business Associate Agreement and will not process protected health information in any service outside its scope.",
    fallback: "Written confirmation, referenced in this Agreement, that the standard Microsoft HIPAA BAA applies to every in-scope service, with notice of scope changes.",
  },
  "residency": {
    kind: "insert", topic: "US data residency",
    clause: "Data location. Microsoft will store Customer Data at rest in the United States and will not transfer or process Customer Data outside the United States, including through artificial intelligence, Copilot or support features, without Customer's prior written consent. Microsoft will give at least [90] days' written notice of any change to data location.",
    fallback: "A commitment for data at rest, plus a written list of features that process data outside the United States and a right to switch them off.",
  },
  "audit-evidence": {
    kind: "insert", topic: "Compliance evidence for HITRUST",
    clause: "Compliance evidence. At least annually and on request, Microsoft will give Customer its current SOC 2 Type II report and ISO/IEC 27001 certificate and Statement of Applicability, and will give Customer's compliance staff access to the Microsoft Service Trust Portal. Microsoft will tell Customer promptly of any material change to its security controls.",
    fallback: "Access through the Service Trust Portal only, with a named contact for follow-up questions.",
  },
  "liability": {
    kind: "insert", topic: "Liability and indemnity",
    clause: "Liability. Neither party's liability is limited for breach of confidentiality, data-protection or security obligations, or for Microsoft's indemnification obligations. For all other claims, each party's liability is limited to [the greater of the fees paid or payable in the twelve months before the claim and $[amount]].",
    fallback: "A separate, higher cap of [amount] for data-protection and security breaches.",
  },
  "gov-contracts": {
    kind: "insert", topic: "Government or regulated-programme workloads",
    clause: "Regulated-programme data. Customer Data that relates to a government or regulated programme is hosted only in [the agreed Microsoft 365 environment], and Microsoft will meet the flow-down obligations Customer identifies in writing for that data.",
    fallback: "Written confirmation of which services meet the programme's hosting requirements, with a commitment to notify Customer if that changes.",
  },
  "notice-exception": {
    kind: "exception", topic: "Renewal notice already late or at risk",
    clause: "Notice. The parties agree that Customer's notice dated [date] is timely and effective, and that this Agreement will [not renew / terminate] on [date]. Alternatively, the Term is extended by [months] months at the existing contracted prices so that renewal can be completed.",
    fallback: "A written bridge term of [90] days at current prices, with no auto-renewal during the bridge.",
  },
  "no-autorenew": {
    kind: "insert", topic: "Automatic renewal",
    clause: "Renewal. This Agreement does not renew automatically. Microsoft will give Customer written notice of expiry at least [120] days before the end of the Term, and renewal occurs only on Customer's written election. If no election is made, Customer may keep using the products for up to [6] months at the contracted prices.",
    fallback: "Auto-renewal only after a written reminder at least [120] days before the notice deadline, with a [30]-day grace period after it.",
  },
  "ede-convert": {
    kind: "insert", topic: "Unused support hours",
    clause: "Enhanced Designated Engineering hours. Unused hours at the end of each contract year [carry forward for up to 12 months / convert 1:1 into other proactive support credits]. Microsoft will report hours used each quarter and agree a delivery plan with Customer within [60] days of the start of each year.",
    fallback: "Conversion of up to [25]% of unused hours into other proactive credits.",
  },
  "overlap": {
    kind: "insert", topic: "Premium-to-Fabric migration overlap",
    clause: "Migration overlap. Customer may use its existing Power BI Premium capacity and its replacement Microsoft Fabric capacity at the same time for [180] days, or until Customer confirms migration is complete if sooner. Microsoft will not charge additional fees for the Premium capacity during that overlap beyond fees already committed.",
    fallback: "A written extension of the overlap that matches Customer's measured migration estimate plus [30] days.",
  },
};

/** Finding id -> clause key. */
export const REDLINES = {
  "unilateral-change": "price-lock",
  "then-current": "price-lock",
  "missing-price-protection": "price-lock",
  "audit-by-vendor": "audit-limits",
  "no-convenience-exit": "exit-rights",
  "missing-termination": "exit-rights",
  "shortfall-billed": "shortfall-carry",
  "env-macc-shortfall": "shortfall-carry",
  "true-up-uncapped": "trueup-price",
  "missing-true-up": "trueup-price",
  "missing-co-term": "co-term",
  "missing-true-down": "true-down",
  "env-frontline-reduction": "true-down",
  "missing-baa": "baa",
  "env-baa": "baa",
  "missing-data-residency": "residency",
  "env-residency": "residency",
  "missing-audit-rights": "audit-evidence",
  "env-audit": "audit-evidence",
  "missing-liability": "liability",
  "env-gov-contracts": "gov-contracts",
  "env-notice-passed": "notice-exception",
  "env-autorenew-nonotice": "no-autorenew",
  "env-ede-under": "ede-convert",
  "env-overlap": "overlap",
};

export const REDLINE_NOTE = "Draft language for your Legal and Procurement teams to adapt. It is a starting position, not legal advice. Items in [brackets] are for you to negotiate or fill in.";
