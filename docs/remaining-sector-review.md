# Events, banking and the remaining sector workspaces

**26 November 2026 · Kenya first**

This batch follows the [professional services, insurance and property review](service-insurance-property-review.md). It adds role-based daily work across the remaining sector presets on web and Android. The general-purpose workspace still serves businesses that use the shared tools.

| Business | Daily work | Valuable next workflow |
| --- | --- | --- |
| Concerts, cinemas and events | Ticket admission, open showtimes, event preparation | A full guest journey from public seat selection and payment to cancellations, refunds and admission |
| Banks and SACCOs | Account requests, deposit reviews, lending reviews | Assign and age internal cases, qualify the reviewer recovery process and connect approved core providers |
| Restaurants and catering | Kitchen orders, tables in service, checkout | Link kitchen tickets to the till and ingredients, handle split bills and courses |
| Hotels and guesthouses | Open stays, rooms out of service, expenses | Link housekeeping to room availability, add guest folios, deposit handling and channel reconciliation |
| Manufacturing | Batches awaiting release, inventory, purchase orders | Bill of materials, material consumption, traceable lot genealogy, yield and scrap |
| Transport and logistics | Open dispatches, quotes and invoices, expenses | Driver assignments, route ordering, proof uploads and delivery reconciliation |
| Construction and trades | Open site jobs, active projects, expenses | Progress claims, change orders, labour and materials staged against project budgets |
| Agriculture and farming | Growing cycles, inventory, expenses | Input usage, yield, harvest lots, buyer collections and cold-chain handoffs |
| Education and training | Open courses, active enrolments, expenses | Class attendance, fee schedules, learner self-service and completion evidence |
| Healthcare administration | Open appointments and expenses | Check-in, administrative billing and intake handoffs with authorised access and a distinct clinical system |
| Nonprofits and community groups | Programmes, donation pledges, expenses | Restricted funds, receipting, programme budgets and reporting to funders |

## Workflows delivered

- Venue managers can add a numbered range of up to 250 seats per row. Show, section and seat name identify a seat. A conflicting seat rejects the full range. A retry with the same request ID preserves the original result. The ticket picker includes section and showtime to distinguish seats with the same name.
- Cashiers can open ticket admission directly. Owners and managers also see showtimes still open for admission. Admission still validates the event and ticket on the server and records a single check-in.
- Industry records capture newly saved statuses, times and operator roles in an activity history. Earlier records retain their current status and gain history on later changes. Banking decisions include the review reason, dispatch exceptions include an explanation, and manufacturing batch releases require a quality-check reference.
- Restaurants can create new orders for tables in service. Hotel check-in rechecks that the room is in service. Role-aware queues send counts rather than the complete set of records, and a queue opens its corresponding filtered list. BiasharaAI uses those counts through rule-based answers and links to the records.

## Banking and SACCO controls

A manager submits the case, and an independent owner reviewer records the decision with a reason. The API requires a signed Supabase session at assurance level AAL2 with an authenticator verification timestamp from the preceding five minutes. The database rechecks the owner role, case stage and original submitter during the save. Bank records only appear in the authenticated business’s workspace. Android applies its secure window flag on the sector record screen to prevent normal screenshots and recording.

Approvals record internal review decisions. Account opening, deposit handling, lending and disbursement depend on authorised institutions, provider agreements and applicable approvals. Capture the decision reference from the business process before connecting a core banking system. [SACCO Societies Regulatory Authority](https://www.sasra.go.ke/) · [Mambu](https://mambu.com/en)

Hosted rollout requires the database migration and enabled TOTP enrolment and verification in the hosted Supabase Auth project. Before a banking pilot, establish controlled reviewer enrolment and reset with independent confirmation, access reviews, inactivity and device policies, monitored audit exports, backup and restore evidence, and an independent security review. Include app-switch privacy and a physical-device screen-capture check. Set incident ownership and recovery times with the institution. [Office of the Data Protection Commissioner](https://www.odpc.go.ke/)

## What would win business

- Eventbrite sets the bar for online ticket sales and organiser check-in. Test whether a local venue can set up a room, issue seats and admit guests quickly enough using the web workspace and a phone at the entrance. Measure setup time, duplicate entry attempts and time per admission. [Eventbrite for organisers](https://www.eventbrite.com/organizer/overview/)
- Odoo POS and Manufacturing and Cloudbeds provide mature workflow depth. Validate that a small Kenyan operator can close service, track a batch to release or run front-desk handoffs with fewer repeat entries. Prove the local payment, stock and reconciliation links in day-to-day use. [Odoo Point of Sale](https://www.odoo.com/app/point-of-sale-shop) · [Odoo Manufacturing](https://www.odoo.com/app/manufacturing) · [Cloudbeds](https://www.cloudbeds.com/)
- Moodle provides established course delivery. Test BiasharaWorld’s value in the adjacent administrative workflow of enrolment, local billing and reconciliation. Treat satisfaction and conversion as pilot measurements. [Moodle LMS](https://moodle.com/products/lms/)

Venue and banking acceptance should include parallel users. Test conflicting seat ranges, duplicate requests, high-volume admission, a lost connection during approval, and access revoked while a case is open. Large ticketing and industry portfolios still use per-business snapshots, so measure payload size, conflict rate and response time before a high-volume rollout.

[Next release roadmap](next-release-roadmap.md)
