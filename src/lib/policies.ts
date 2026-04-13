export const POLICY_KEYS = {
  RENTAL_AGREEMENT: 'RENTAL_AGREEMENT',
  PAYMENT_POLICY: 'PAYMENT_POLICY',
} as const;

export type PolicyKey = (typeof POLICY_KEYS)[keyof typeof POLICY_KEYS];

export type PolicyDocumentInput = {
  id: string;
  policyKey: PolicyKey;
  title: string;
  content: string;
  version: number;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type PolicyTemplate = {
  policyKey: PolicyKey;
  title: string;
  content: string;
};

export const DEFAULT_POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    policyKey: POLICY_KEYS.RENTAL_AGREEMENT,
    title: 'Vacation Rental Agreement',
    content: `VACATION RENTAL AGREEMENT
Exclusive Modern Mansions

Thank you for choosing Exclusive Modern Mansions. We look forward to welcoming you! Please read this Agreement carefully before completing your reservation.

PARTIES. This Agreement is between Exclusive Modern Mansions and its agents ("EMM") and the guest named at checkout ("Guest").

GENERAL TERMS. Terms include those in this agreement ("Agreement"); the pet addendum (if applicable), departure instructions, any online agreement or terms, confirmation; any directions, instructions (check-in, checkout), house rules, and similar documents; any condominium or homeowners' association rules and applications; and any options, optional agreements, and waivers. Should any conflicts arise, the terms of this Agreement control.

PROPERTY. Address, bedroom/bathroom count, check-in time, and checkout time are listed on the property page and confirmation. General kitchen wares and utensils, one towel per guest, and one set of bed linens per bed are included. See the property listing for full details.

Check-in: as listed on confirmation (typically 5:00 PM)
Checkout: as listed on confirmation (typically 10:00 AM)

NOTICE — SMART HOME TECHNOLOGY. Smart home technology is used to ensure policy compliance and may include the following remotely monitored devices: thermostats, door locks, pool/spa heater controls, noise monitors, and video surveillance of exterior areas including the front door and pool area. By accepting this Agreement, Guest consents to such monitoring.

OCCUPANCY. Maximum occupancy is listed on the property page. Occupancy limits apply 24 hours a day, 7 days a week. Guest must be at least 25 years of age (or active military) and must be an occupant of the Property for the duration of the stay.

VEHICLES. The number of allowed vehicles is listed on the property page. Vehicles must be parked only in designated areas.

POOL SAFETY AND POOL HEAT.

Pool Safety: Running and diving are prohibited. Children, elderly persons, and other at-risk individuals are not allowed in the pool or spa area without adequate supervision. Safety netting, pool alarms, and gate latches must be used at all times. Doors must be kept closed and locked. Any safety concerns, including non-functioning equipment, pool alarms, safety netting, or locks, must be reported immediately to EMM.

Pool Heat: When available, pool heating or chilling is an additional charge. Pools may not reach the desired temperature during colder weather and may take up to 48 hours to reach maximum temperature. There are no refunds for dissatisfaction with pool temperature.

ANIMALS. Pets are not allowed without prior written permission from EMM and payment of the applicable pet fee. Pets are not allowed in the pool. Emotional Support Animals require a written request at the time of reservation and official documentation from a licensed professional. Service Animals as defined by applicable law require a written request at time of reservation. EMM reserves the right to remove any animal for inappropriate behavior. A fee of $500 per unauthorized animal will be charged to the credit card on file.

NOISE. The Property is located in a residential area. Quiet hours are enforced between 10:00 PM and 7:00 AM. Guest is responsible for any fines resulting from noise violations.

HEALTH AND SAFETY.

Lead and Radon: No known lead or radon hazards exist at the Property.
Wildlife: Local wildlife can be dangerous. Guests should exercise caution at all times.
Bed Bugs: The Property was inspected prior to Guest's arrival and no bed bugs were present. Any bed bugs discovered are presumed to have been introduced by Guest unless clear and convincing evidence establishes otherwise. If found, Guest must vacate the property immediately without refund and pay for the full cost of bed bug treatment.
Allergens: Properties are cleaned to professional standards. Guest assumes responsibility for any symptoms resulting from allergies or sensitivities, including mild mold.
Smoking and Vaping: Smoking and vaping are strictly prohibited on the Property, including all outdoor areas.

PROPERTY ACCESS AND USE.

Supplies: Only basic supplies are provided.
Air Conditioning: Setting air conditioning below 72°F or heat above 74°F, changing the fan setting from Auto, or leaving doors, windows, or blinds open while AC or heat is running is prohibited.
Access by EMM: EMM may enter the Property as reasonably necessary to inspect, service, or for real estate purposes. Reasonable notice will be provided except in emergencies.
Social Functions: Parties, gatherings, events, and similar functions are prohibited. Violation will result in immediate removal of all persons and cancellation without refund.
Maintenance: EMM will respond to maintenance issues as reasonably appropriate. Faulty equipment, appliances, temporarily interrupted utilities, minor pests, noise, or similar issues do not constitute a material breach unless the Property is rendered uninhabitable. Service charges resulting from false reports or Guest-caused problems are charged to Guest.
Departure: Upon checkout, Guest must follow the departure instructions provided in the property binder or welcome guide.
Garbage: Guest must keep trash and recyclables separated in designated bins and take trash to the designated pickup area on assigned collection days.
Cleanliness: There is no daily maid service. Guests are expected to keep the property in a reasonable state of cleanliness throughout the stay.
Default Transient Status: Guest agrees not to take any action to establish non-transient status and waives all defenses to all persons on the Property having transient status under applicable law.

DOCKS AND WATERCRAFT. Where applicable, Guest must verify water depth and dock specifications on the listing. Trailers are prohibited without prior written permission from EMM.

ADDITIONAL CHARGES AND FORFEITURES. Guest will not receive a partial or full refund if removed from the Property for a violation of this Agreement. The following charges apply:

$500 for each unauthorized animal or each 4 hours (or portion thereof) of late checkout.
$150 per person per day (or portion thereof) for unauthorized guests or occupancy in excess of the stated limit.
The invoiced amount plus $100 (or $100/hour for staff time) for odor removal, fines, replacement of missing or damaged items, stains, bed bug treatment, tampering with equipment (including pool systems, pool alarm, smoke/fire detectors and extinguishers), failure to return keys, failure to keep pool gates closed, extra cleaning, and similar acts or omissions.

GRIEVANCE POLICY. Please contact EMM immediately with any concerns. All claims are waived unless reported within 24 hours of discovery, with a reasonable opportunity to cure provided to EMM.

LIMITED DAMAGE WAIVER. A Limited Damage Waiver fee applies to all reservations (amount shown at checkout). This waiver covers inadvertent accidental damage up to $1,000.00 less a $50 deductible. Coverage excludes: intentional acts, gross negligence, damage caused by animals, motor vehicles, watercraft, grills, candles, smoking devices, missing or damaged linens and towels, stains and spills, and any damage not promptly reported. All claims must be reported immediately to EMM. This is not a form of insurance and provides no third-party beneficiary rights. Guest remains liable for all uncovered damages.

BICYCLES, KAYAKS, PADDLEBOARDS, DOCKS, BOAT LIFTS, AND FLOATING DOCKS. Where such equipment is available, Guest confirms having adequate experience and accepts full personal responsibility for any damage, injury, or other liability arising from the use of such equipment by Guest or any member of Guest's party. Failure to follow safety norms will result in immediate revocation of access without refund. Guest will hold EMM, the property owner, and their agents harmless for any damages or injury arising from use of such equipment except in cases of gross negligence by EMM, in which case liability is limited to actual medical expenses incurred. Guest agrees to remove any boat and personal belongings and cease use of the dock if a severe storm warning or tropical storm watch is in effect for the Property.

DOG ADDENDUM (WHEN APPLICABLE). Dogs are permitted only in designated dog-friendly properties and only as arranged in advance. Guest agrees to:

Keep dog(s) under control at all times.
Crate dog(s) when left alone in the Property.
Report any damage caused by the pet(s) promptly.
Pay for all costs resulting from pet damage.
Ensure dog(s) are housebroken and up to date on all vaccinations, including rabies.
Treat dog(s) with an approved flea and tick preventative at least 3 days prior to arrival.
Prevent dog(s) from getting on furniture or bedding.
Rinse and dry dog(s) before entering the unit.
Wash dog(s) only in outdoor shower or with hose — not inside bathtubs or showers.
Clean up after dog(s) and remove all waste.
Keep dog(s) from being noisy or aggressive.
Remove all excess dog hair before departure.

Dogs with a history of biting or trained for dog fighting are strictly prohibited. An unauthorized dog will result in a charge of $550 per pet to the credit card on file, plus all applicable damage and cleaning fees. No dogs are permitted in the pool. Guest agrees to indemnify, defend, and hold EMM harmless for any claims, damages, or expenses arising from the dog's presence on the Property.

LEGAL TERMS.

Entirety: This is the entire agreement, superseding all prior negotiations and understandings.
Modification: Only an authorized representative of EMM may modify this Agreement, and only in writing.
Assignment: Guest may not assign, delegate, or sublease any rights under this Agreement.
Severability: If any provision is found invalid or unenforceable, the remaining provisions remain in full force.
Warranties: No warranties exist unless expressly stated herein.
Indemnification: Guest shall defend, hold harmless, and indemnify EMM and its affiliates, officers, directors, agents, and employees from any third-party claims arising out of or related to this Agreement, including claims by Guest's invitees and licensees.
Limitation of Liability: The maximum remedy for breach or failure to provide reserved accommodations is a prorated refund. EMM is not liable for consequential or incidental damages.
Arbitration: Disputes over $15,000 shall be resolved by binding arbitration. For smaller disputes, the parties agree to resolve matters through good-faith negotiation before pursuing legal action.
Jury and Class Action Waiver: Both parties waive rights to jury trials and class action suits.
Attorney's Fees: EMM is entitled to reasonable attorney's fees and costs for defending chargeback demands, negative reviews, administrative complaints, arbitration, or litigation arising from this Agreement.
Data Usage: Guest consents to EMM's use of Guest data as permitted by law.
Governing Law: This Agreement is governed by the laws of the applicable jurisdiction, to the exclusion of conflicting laws and principles.
Counterparts: This Agreement may be signed in counterparts.

By accepting this Agreement at checkout, Guest confirms they have read, understood, and agree to all terms above.`,
  },
  {
    policyKey: POLICY_KEYS.PAYMENT_POLICY,
    title: 'Payment Policy',
    content: `PAYMENT POLICY
Exclusive Modern Mansions

This Payment Policy explains how deposits, balances, taxes, fees, refunds, and chargebacks are handled for all direct bookings with Exclusive Modern Mansions ("EMM").

1. PAYMENT METHOD
Major credit and debit cards are accepted through the secure payment processor shown at checkout.

2. DEPOSIT AND BALANCE

50% of the total reservation amount is due at the time of booking.
Reservations made within 60 days of the arrival date require payment in full at the time of booking.
The remaining balance is due 60 days prior to the arrival date and will be automatically charged to the credit card on file.

3. NON-PAYMENT
Failure to submit payment when due will result in automatic cancellation of the reservation and forfeiture of the deposit paid.

4. CANCELLATIONS AND CHANGES

There are no refunds for cancellations, regardless of the reason, including but not limited to bad weather, natural disasters, personal circumstances, or unmet expectations.
Changes to a reservation require prior approval from EMM and are subject to a $350 change fee, plus any applicable rate or fee increases.
Reservations canceled due to non-payment or Guest's failure to occupy the Property are non-refundable.
Rescheduling (not refunds) may be permitted when required by applicable law due to mandatory evacuation, provided the reservation is rescheduled prior to the original arrival date, any rate or fee increase is paid in full, and the new arrival date is within one year of the original reservation.
EMM reserves the right to cancel any reservation and refuse service, to the extent permitted by law.

5. TAXES AND FEES
All applicable taxes, cleaning fees, pet fees, damage waivers, and other charges are displayed before payment is submitted at checkout. These amounts are collected in addition to the base rental rate.

6. OPTIONAL CHARGES

Pool Heating or Chilling: Available at select properties for an additional fee as shown on the listing. Fee increases if added after booking.
Pet Fee: Required for approved pet stays. See the Rental Agreement and Dog Addendum for full terms.
Travel Insurance: Available for an additional fee at the time of booking. Travel insurance is not available after the booking is confirmed. Guest must opt in at the time of reservation.

7. CREDIT CARD AUTHORIZATION
Guest authorizes EMM to charge the credit card on file for all reservation amounts due under this Agreement, including the deposit, balance, and any additional charges or penalties as described in the Rental Agreement.

8. CHARGEBACKS AND REFUND DISPUTES
Guest agrees to resolve any billing disputes directly with EMM before initiating a chargeback or refund request with a credit card issuer or payment platform. Guest waives any right to dispute a valid charge with their card issuer and agrees to use the grievance and arbitration procedures set forth in the Rental Agreement. Booking records, agreement acceptance timestamps, and reservation history may be used to contest any invalid dispute.

9. FLORIDA INNKEEPERS ACT (WHERE APPLICABLE)
If the property is uninhabitable or EMM materially misrepresents the condition of the property, Guest is entitled to vacate and receive a prorated refund. However, if Guest remains at the Property and subsequently disputes a credit card charge, Guest may be subject to applicable penalties under Florida law (§509.151, Fla. Stat., where applicable).

10. FAILED OR REVERSED PAYMENTS
If a payment fails or is reversed, the reservation may be placed on hold or canceled. Guest is responsible for ensuring that payment details are accurate and that sufficient funds are available when payment is due.

11. DAMAGE WAIVER FEE
A Limited Damage Waiver fee is included with every reservation. This fee is non-refundable. See the Rental Agreement for full details on what is and is not covered.

By accepting this Payment Policy at checkout, Guest confirms they have read, understood, and agree to all payment terms above.`,
  },
];

export const DEFAULT_POLICY_BY_KEY = Object.fromEntries(
  DEFAULT_POLICY_TEMPLATES.map((policy) => [policy.policyKey, policy]),
) as Record<PolicyKey, PolicyTemplate>;

export const formatPolicyContent = (value: string) =>
  value.replace(/\r\n/g, '\n').trim();
