/* =============================================================================
 * data/peers.js — what other buyers pay and agree to, with the source of every figure.
 *
 * Retrieved 2026-11-17. Each entry carries the source document, a verbatim quote and
 * the limits of what it proves. `verified: "document"` means the quote was read from the
 * published agreement itself; `verified: "primary"` means it was read from Microsoft's own
 * published price list; `verified: "secondary"` means it comes from a consultancy's
 * article and has not been checked against a contract.
 *
 * There is no public source of per-user Microsoft 365 prices paid by named enterprises:
 * the public agreements below show terms and discount mechanisms, not E3/E5 unit prices.
 * The only per-product discount ranges by company size come from an advisory firm's own
 * benchmark (ADVISOR_DISCOUNTS) and are shown as such.
 * ========================================================================== */

export const PEER_SOURCES = {
  sc: {
    label: "State of South Carolina Enterprise Agreement, Document X20-10210 (2020)",
    url: "https://procurement.sc.gov/files/attach/Enterprise%20(2020).pdf",
    kind: "public agreement", verified: "document",
    note: "Executed Microsoft Enterprise Agreement for the State's Information Technology Management Office, with the State's amendment. Contains no prices; pricing is set with the reseller.",
  },
  ny: {
    label: "New York State OGS, Enterprise Agreement State and Local, custom program terms (OGS Contract PS67984)",
    url: "https://online.ogs.ny.gov/purchase/snt/awardnotes/7600023116CMBA_EAAgrSLG.pdf",
    kind: "public agreement", verified: "document",
    note: "Program agreement that defers key terms (term, liability, verification, notices) to a separately negotiated Custom Microsoft Business Agreement, which is not in this file.",
  },
  pa: {
    label: "Commonwealth of Pennsylvania Microsoft Enterprise License Agreement and amendments",
    url: "https://www.dgs.internet.state.pa.us/ITQ/ITQLibrary/Documents/Microsoft%20ELA.pdf",
    kind: "public agreement", verified: "document",
    note: "Some amendment forms in the text carry 2013 dates and the price-level mechanism it shows predates Microsoft's November 2025 removal of EA price levels.",
  },
  cdwg: {
    label: "NASPO ValuePoint Cloud Solutions master agreement with CDW Government LLC (solicitation CH16012)",
    url: "https://s3.us-east-1.amazonaws.com/nvp/Master%20Agreements/CDW%20Government%20LLC/CDWG%20Master%20Agreement.pdf",
    kind: "public agreement", verified: "document",
    note: "Cooperative purchasing contract for cloud solutions. The date of the solicitation is not stated in the extracted text and the baseline the discount applies to is not defined there.",
  },
  naspoMs: {
    label: "NASPO ValuePoint Microsoft master agreement MA 23015 and price schedule (Computer Equipment portfolio, 2023-2028)",
    url: "https://www.naspovaluepoint.org/suppliers/microsoft-corp/",
    kind: "public agreement", verified: "document",
    note: "Covers Windows PCs, Surface and accessories. It is not a licence agreement.",
  },
  burnsville: {
    label: "City of Burnsville, MN, Regular City Council agenda report of 17 December 2024, with Insight Public Sector preliminary quote 1209 and the Enterprise Enrollment State and Local text (X20-10636)",
    url: "",
    kind: "public agreement", verified: "document",
    note: "A 380-user city on Government Community Cloud, 1 January 2025 to 31 December 2027, bought through Insight Public Sector on a NASPO contract. The quote is marked PRELIMINARY. The signature form, product selection form and contact pages are blank templates with a Legal Review watermark, so the signed copy was not seen. Supplied by the user.",
  },
  redress: {
    label: "Redress Compliance, Microsoft EA Benchmarking Report 2026 (142 buyer-side renewals, January 2024 to April 2026)",
    url: "https://redresscompliance.com/microsoft-ea-benchmarking-report",
    kind: "advisor benchmark", verified: "secondary",
    note: "Published by a consultancy that sells negotiation services. The contracts are not public and the figures cannot be checked. Another page from the same firm gives a median of 18% below list for Microsoft 365, so treat the ranges as indicative.",
  },
  itaa: {
    label: "ITAA, The 6 Microsoft Agreements You Should Know",
    url: "https://itaa.com/insights/the-6-microsoft-agreements-you-should-know-and-why-they-matter/",
    kind: "advisor article", verified: "secondary",
    note: "Licensing consultancy article. Describes market mechanics; contains no prices.",
  },
  twoData: {
    label: "2Data, Microsoft 365 Pricing Updates: What Changed on 1 July 2026",
    url: "https://2-data.com/knowledge-hub/microsoft-365-pricing-updates-what-changed-on-1-july-2026-and-what-enterprise-organisations-need-to-do-now/",
    kind: "advisor article", verified: "secondary",
    note: "Quotes Microsoft's pricing and packaging update. Check against microsoft.com/licensing/news/2026-m365-packaging-pricing-updates.",
  },
  msPrice: {
    label: "Microsoft, Microsoft 365 Pricing and Packaging Updates (effective July 1, 2026)",
    url: "https://www.microsoft.com/en-us/licensing/news/2026-m365-packaging-pricing-updates",
    kind: "Microsoft published price list", verified: "primary",
    note: "Microsoft's own table of commercial list prices, USD per user per month on an annual commitment. It says existing customers remain on current pricing until renewal and that the pricelist is subject to change and may vary by country and currency.",
  },
  dealiq: {
    label: "Deal IQ, A Microsoft EA renewal now starts at list price (updated September 2026)",
    url: "https://dealiqinc.com/vendors/microsoft/ea-renewal/",
    kind: "advisor article", verified: "secondary",
    note: "Negotiation firm's page. States the November 2025 change and the July 2026 list prices. It gives no discount percentages.",
  },
};

/** Public-record and market evidence, keyed to the contract terms and price questions it bears on. */
export const PEER_EVIDENCE = [
  {
    id: "sc-liability", source: "sc", termIds: ["liability"], topic: "Liability cap for online services",
    quote: "For Online Services, Microsoft's maximum liability to Enrolled Affiliate for any incident giving rise to a claim will not exceed the greater of either (i) twenty-four (24) times the monthly per-unit price (as set by the Reseller) for the individual named Online Services that gave rise to the claim or (ii) the amount Enrolled Affiliate paid or was required to pay for the Online Service during the 24 months before the incident.",
    compare: "Microsoft's standard text in the same document caps online-services liability at the amount paid in the 12 months before the incident.",
    takeaway: "South Carolina negotiated the look-back from 12 to 24 months, added a floor of 24 monthly per-unit prices, and added exceptions for gross negligence, willful misconduct, personal injury and fraud.",
    limit: "A state agency's agreement from 2020. It shows what Microsoft has accepted for a public body, not what it will accept for a health plan.",
  },
  {
    id: "sc-audit", source: "sc", termIds: ["audit-rights"], topic: "Verification and audit limits",
    quote: "any audit of an Enrolled Affiliate's records or information systems, or verification of its compliance with this Agreement generally, shall be subject to the Enrolled Affiliates requirements pertaining to security matters, including without limitation clearances to be held and non-disclosure agreements to be executed by auditors, badging or escorting requirements for access to premises, and other applicable requirements.",
    compare: "Microsoft's standard text gives 30 days' notice and requires only a confidentiality obligation on the auditor.",
    takeaway: "South Carolina made the auditor meet the customer's own security rules. A health plan can ask for the same on grounds of PHI.",
    limit: "The same amendment also commits the agency to complete Microsoft's self-audit process if Microsoft asks for it instead of a third-party audit.",
  },
  {
    id: "pa-term", source: "pa", termIds: ["ea", "price-protection"], topic: "Term and extension",
    quote: "The term of this Agreement will be thirty-six (36) full calendar months, with the option of two twelve (12) full calendar month extensions",
    takeaway: "A 36-month term with two 12-month extension options is precedent for asking to extend at agreed prices instead of renegotiating.",
    limit: "Pennsylvania's extension option does not by itself say the price stays fixed during an extension. Ask for that in writing.",
  },
  {
    id: "pa-price-levels", source: "pa", termIds: ["price-levels"], topic: "How a very large public buyer was priced",
    quote: "Applications (Office Pro/Office Standard) Level D less 4%  System (Windows Operating System & MDOP) Level D less 4%  Servers (Core &, Enterprise Client Access License Suites) Level D less 2%",
    compare: "Further discounts of 2.00% at 40,000 users, 4.00% at 60,000, 6.00% at 80,000, 7.5% at 120,000 and 9.00% at 300,000.",
    takeaway: "Even at 40,000 to 500,000 desktops and users, Pennsylvania's negotiated step above Level D was between 2% and 9%.",
    limit: "These are discounts on older on-premises product pools (Office, Windows, servers), not Microsoft 365 online services, and the Level A to D mechanism no longer applies to online services after 1 November 2025. Use it as scale context only. It does not translate to an E3 or E5 price.",
  },
  {
    id: "pa-reseller", source: "pa", termIds: ["csp"], topic: "Reseller sets the customer's price",
    quote: "Actual pricing to the Enrolled Affiliate and payment terms are determined per the terms of the agreement with your Reseller",
    takeaway: "In a reseller-fulfilled agreement the customer's price is set between the customer and the reseller. The reseller's margin is therefore negotiable and is not visible in the Microsoft agreement.",
    limit: "None for this point; it is a plain statement of structure.",
  },
  {
    id: "cdwg-discount", source: "cdwg", termIds: ["csp"], topic: "A reseller's published discount and fee on a cooperative contract",
    quote: "Software as a Service Discount % 18   Infrastructure as a Service Discount % 18   Platform as a Services Discount % 18",
    compare: "The same solicitation states that a 0.25% NASPO ValuePoint Administrative Fee applies to total sales.",
    takeaway: "CDW-G bid an 18% discount on Microsoft SaaS, IaaS and PaaS to state purchasers, with a 0.25% cooperative fee. That is a real, public CDW commitment to a large public buyer.",
    limit: "The baseline the 18% applies to is not defined in the extracted text, it is for cloud solutions rather than an enterprise agreement, and the solicitation number suggests it is dated. No markup cap of 0.5% to 2.5% appears anywhere in this agreement; the text contains no mention of markup.",
  },
  {
    id: "naspo-devices", source: "naspoMs", termIds: [], topic: "NASPO Microsoft agreement is for devices",
    quote: "Band 1 - Minimum Discount 8.00%",
    takeaway: "NASPO ValuePoint's Microsoft master agreement MA 23015 prices PCs, Surface and accessories. It has no Microsoft 365 licence pricing.",
    limit: "Do not use it to benchmark licence prices.",
  },
  {
    id: "bv-level-d", source: "burnsville", termIds: ["price-levels"], topic: "A small buyer written in at the top price level",
    quote: "For both the initial and any renewal term Enrolled Affiliate's Price Level for all Products ordered under this Enrollment will be Level \"D\" throughout the term of the Enrollment.",
    compare: "The product selection form in the same package maps Level D to 15,000 or more licenses and Level A to 2,399 or fewer. The quote shows 270 G3 and 110 G5 users, 380 in total.",
    takeaway: "The contract text, not the seat count, set the price level. A 380-user city was written in at the level normally reserved for 15,000 or more, so a level can be negotiated in the enrollment text.",
    limit: "Government enrollment from December 2024, before Microsoft retired price levels for online services on 1 November 2025. The document does not say whether Level D is standard for State and Local enrollments. Do not expect the same wording at a 2027 commercial renewal.",
  },
  {
    id: "bv-fixed-price", source: "burnsville", termIds: ["price-protection"], topic: "Fixed price for the term, reset at renewal",
    quote: "As long as Enrolled Affiliate continues to qualify for the same price level, Microsoft's prices for Resellers for each Product or Service ordered will be fixed throughout the applicable initial or renewal Enrollment term. Microsoft's prices to Resellers are reestablished at the beginning of the renewal term.",
    compare: "The three annual installments in the quote are identical ($210,170.69 each) and the enrollment invoices three equal annual installments.",
    takeaway: "Price protection runs for the 36 months only. The renewal price is open again, which is why the first quote at renewal is the one to push back on.",
    limit: "This is Microsoft's price to the reseller. The customer's price is set by the reseller, and the text exempts Online Services designated as exempt from fixed pricing in the Product Terms.",
  },
  {
    id: "bv-extended-term", source: "burnsville", termIds: ["termination", "price-protection"], topic: "Month-to-month extension costs 3% more",
    quote: "During the Extended Term, Online Services will be invoiced monthly at the then-current published price as of the Expiration Date plus a 3% administrative fee for up to one year. If Enrolled Affiliate wants an Extended Term, Enrolled Affiliate must submit a request to Microsoft at least 30 days prior to the Expiration Date.",
    takeaway: "If a renewal runs past the end date, the fallback is the published price plus 3% for up to a year, with the request due 30 days before expiry. That is the cost of missing the deadline.",
    limit: "Standard Microsoft text for this enrollment type; it is not a negotiated term. Confirm the current wording in your own enrollment.",
  },
  {
    id: "bv-reductions", source: "burnsville", termIds: ["true-down", "true-up"], topic: "When licenses can be reduced and when true-ups are due",
    quote: "Enrolled Affiliate may reduce the quantity of Subscription Licenses at the Enrollment anniversary date on a prospective basis if permitted in the Product Terms",
    compare: "True-up orders or update statements are due 60 to 30 days before each anniversary, the third-year one within 30 days before expiry, and a late one defers reductions to the next anniversary.",
    takeaway: "Reductions happen only at an anniversary, and only if the paperwork is in the 30-day window, so shelfware found now cannot be cut mid-year.",
    limit: "Subject to the Product Terms, which this document does not reproduce. Reductions of an enterprise-wide purchase are limited to the Qualified User count.",
  },
  {
    id: "bv-quote", source: "burnsville", termIds: ["price-levels"], topic: "What one small government buyer paid per user (not comparable to commercial)",
    quote: "M365 G5 GCC Sub Per User 110 $611.85 $ 67,303.50. M365 G3 Unified FSA Renewal GCC Sub Per User 270 $328.49 $ 88,692.30. M365 F3 Unified GCC Sub Per User 30 $83.31 $ 2,499.30.",
    compare: "The column is labelled Term Price and the unit 1 Month(s), but the extended prices add up to the stated one-year total of $210,170.69, so these are annual per-user prices: about $50.99, $27.37 and $6.94 a month.",
    takeaway: "This is a real reseller quote with per-user prices, which is rare in public records. It shows the shape of a quote (step-up lines, an F3 tier, a renewal SKU) but it is for the Government cloud, which is priced differently from commercial.",
    limit: "Preliminary quote from December 2024, Government Community Cloud SKUs, 380 users. Do not compare these figures to your organization's commercial E3 or E5 prices. They are shown for structure, not as a price target.",
  },
  {
    id: "ea-levels-removed", source: "itaa", termIds: ["price-levels", "csp"], topic: "EA volume discounts removed",
    quote: "from November 1, 2025, Microsoft will remove these automatic volume-based discounts for online services under the EA, meaning all customers will default to Level A pricing regardless of scale.",
    compare: "ITAA also states that LSPs no longer receive rebates on EA deals and that large clients are pushed onto the MCA-E.",
    takeaway: "Size no longer earns an automatic discount on online services. Every point below list has to be negotiated, and the gap between EA and CSP pricing is narrowing.",
    limit: "Consultancy article. Confirm the rule applies at your organization's renewal date with Microsoft.",
  },
  {
    id: "ea-levels-dealiq", source: "dealiq", termIds: ["price-levels", "csp"], topic: "A renewal opens at the Microsoft.com price",
    quote: "On November 1, 2025, Microsoft retired those levels for online services under the EA and MPSA. Microsoft 365, Dynamics 365, Windows 365, Copilot and Microsoft's security products now start at a single price that matches Microsoft.com, whatever the size of the customer.",
    compare: "The same page says the change applies at the next renewal on or after that date, and that on-premises licenses keep their price levels.",
    takeaway: "Two independent firms (Deal IQ and ITAA) describe the same change. The first proposal at a renewal is an opening position at list, and every point below it is negotiated.",
    limit: "A negotiation firm's description, not Microsoft's contract text. Confirm with Microsoft which rule applies at your organization's renewal date and agreement type.",
  },
  {
    id: "list-2026", source: "msPrice", termIds: ["price-levels"], topic: "List prices from 1 July 2026",
    quote: "Microsoft 365 E3 $36.00 $39.00. Microsoft 365 E5 $57.00 $60.00. Office 365 E5 $38.00 $41.00. Microsoft 365 F3 $8.00 $10.00.",
    compare: "Microsoft's page also says: existing customers remain on current pricing until renewal.",
    takeaway: "Any quote for a renewal after 1 July 2026 starts from the new list, so a price that looks like a discount against the old list can be list price or higher.",
    limit: "Pricelist pricing is subject to change and may vary by country and currency. Government cloud prices are different.",
  },
];

/** One public government-cloud quote (City of Burnsville, Insight Public Sector, December 2024). USD per user per month: annual quote price / 12. */
export const GOV_PEER_PRICES = {
  "m365-e5": { label: "Microsoft 365 G5 GCC", perMonth: 611.85 / 12, seats: 110 },
  "m365-e3": { label: "Microsoft 365 G3 Unified FSA Renewal GCC", perMonth: 328.49 / 12, seats: 270 },
  "m365-f3": { label: "Microsoft 365 F3 Unified GCC", perMonth: 83.31 / 12, seats: 30 },
};

/** Discount off list by company size, from the Redress benchmark. Percent, [low, high]. */
export const ADVISOR_TIERS = [
  { id: "A", label: "250 to 2,399 users", min: 0 },
  { id: "B", label: "2,400 to 5,999 users", min: 2400 },
  { id: "C", label: "6,000 to 14,999 users", min: 6000 },
  { id: "D", label: "15,000 users and over", min: 15000 },
];

export const ADVISOR_DISCOUNTS = {
  "m365-e5": { A: [10, 18], B: [16, 24], C: [22, 30], D: [28, 38] },
  "m365-e3": { A: [8, 14], B: [12, 18], C: [16, 24], D: [22, 30] },
  "m365-f3": { A: [10, 16], B: [14, 20], C: [18, 26], D: [24, 32] },
  "copilot-m365": { A: [4, 10], B: [8, 14], C: [12, 18], D: [14, 22] },
};

export function advisorTier(seats) {
  let pick = ADVISOR_TIERS[0];
  for (const t of ADVISOR_TIERS) if (seats >= t.min) pick = t;
  return pick;
}

/** The advisor discount range for a product at a company size, or null when the benchmark does not cover it. */
export function advisorBand(productId, seats) {
  const t = advisorTier(seats);
  const r = ADVISOR_DISCOUNTS[productId]?.[t.id];
  return r ? { tier: t, low: r[0], high: r[1], source: "redress" } : null;
}

export const evidenceFor = (termId) => PEER_EVIDENCE.filter((e) => e.termIds.includes(termId));
export const evidenceById = (id) => PEER_EVIDENCE.find((e) => e.id === id) ?? null;

/** Statements made about these sources that the documents themselves do not support. */
export const PEER_CLAIMS_CHECKED = [
  {
    claim: "For 10,000 to 16,000+ seats the negotiated benchmark for Microsoft 365 E5 is $45 to $51 per user per month, 15% to 25% off the $60 list price (attributed to ISV Co-Sell and Deal IQ).",
    result: "The $60 list price is confirmed by Microsoft's own price list. The discount range could not be verified: the ISV Co-Sell benchmark page returned HTTP 402 (payment required) and could not be read, and the Deal IQ page it was attributed to states the November 2025 change but gives no discount percentages. It also differs from the Redress benchmark, which reports 22% to 30% off for 6,000 to 14,999 users and 28% to 38% for 15,000 and over. Treat $45 to $51 as one unverified opinion among several, not as a peer price.",
  },
  {
    claim: "The E3 to E5 step-up is negotiated at 20% to 30% off the $21 list difference.",
    result: "The $21 difference is arithmetic from Microsoft's list (60 - 39). No source read gives step-up discounts, so the 20% to 30% is unverified.",
  },
  {
    claim: "Moving 3,000 frontline staff from E5 to F3 saves over $1.4 million a year.",
    result: "Arithmetic, not evidence: 3,000 x ($48 - $10) x 12 = $1.37 million, which assumes those staff can work on F3 and that E5 would otherwise cost $48. Check that the roles do not need desktop apps or E5 security features.",
  },
  {
    claim: "Microsoft's December 31 quarter end is a negotiating deadline.",
    result: "Microsoft's fiscal year ends June 30, which makes December 31 the end of its second quarter. The sources read do not say how much room the account team has at that date, and Deal IQ names the June 30 year end.",
  },
  {
    claim: "NASPO ValuePoint master agreements cap reseller markup at 0.5% to 2.5% over Microsoft net cost.",
    result: "Not supported. The CDW-G master agreement text contains no mention of markup, mark-up or cost-plus. It shows an 18% discount on cloud solutions and a 0.25% cooperative administrative fee. Microsoft's own NASPO agreement (MA 23015) is a devices contract. Do not cite 0.5% to 2.5% to CDW.",
  },
  {
    claim: "The Pennsylvania document shows a full execution copy with pricing.",
    result: "It is a real agreement with amendments, and it shows a discount mechanism for very large buyers, but it contains no per-user prices. It states that actual pricing is set with the reseller.",
  },
  {
    claim: "The South Carolina and New York agreements show what peers pay.",
    result: "Both show terms only. South Carolina's file has no prices. New York's program agreement defers term, liability, verification and notices to a separate custom agreement (OGS PS67984) that is not in the file.",
  },
  {
    claim: "Public agreements let us compare E3 and E5 prices with companies of our size.",
    result: "No public source found gives E3 or E5 unit prices paid by named organisations. The only size-banded discount ranges are the advisory firm's benchmark, which cannot be verified.",
  },
];