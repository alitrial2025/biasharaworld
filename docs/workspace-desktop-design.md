# Desktop workspace design

The desktop workspace takes its visual direction from the supplied BiasharaOS dashboard reference: forest navigation, an emerald welcome, cool blue financial accents, warm stock/balance signals and restrained red expense/status accents. Light mode uses white panels on a soft neutral canvas; dark mode uses distinct deep-green surfaces. Shared tokens and controls cover the main sections and all twenty business tools. The desktop stylesheet is scoped to the workspace above 960px. Android is unchanged.

Home has a compact welcome, four recorded figures, a performance/goal section, and a three-panel row for recent sales, stock attention and everyday actions. Retail businesses use the existing shop photograph. Other sectors use the original company doodle; service businesses see their sector workflows instead of irrelevant stock alerts. Empty accounts show clear starting states and an unset target never triggers a success message.

Page names and tool labels state their function directly. Internal feature numbering is removed from tool cards. The sidebar keeps account and support controls reachable while its navigation can scroll. Forms, tables, tabs, status badges, reports, funding, product cards, settings and bottom sheets share consistent spacing and surfaces. The settings avatar uses the account's initials rather than a stock photograph.

Home and Reports use an SVG chart built from the existing business report, including recorded profit and expenses where daily series are available. Pointer and keyboard inspection expose exact values. A collapsible data table provides the same data without relying on colour or hover. Daily expense/profit time-series are omitted when timestamps are unavailable. There are no illustrative growth percentages or fabricated financial series. Target progress uses the saved target.

The design checks cover both themes at desktop and laptop sizes, all main tabs and twenty additional tool pages, selected-control and form contrast, product sheets, global search, target persistence, empty accounts, service-sector layouts, large Kiswahili text and chart keyboard/table behavior. Existing industry and funding UI checks continue to cover readiness gates, viewer access, retries, conflicts and request flows. Browser fixtures use test accounts and in-memory intercepted endpoints; visual fixture data is never inserted into a live business.

The hero uses a plain editorial label instead of the former pill. Its TypeScript headline types once across two reserved lines, preserving layout and the complete accessible heading. Server-rendered/no-JavaScript content is complete, and reduced-motion preferences immediately finish the animation.

## Landing composition

The landing hero follows the supplied composition with an emerald background, the original company doodle fading across the copy, a shopkeeper photograph on the right, and overlapping laptop/phone frames. The headline, navigation, supporting copy and actions use a more generous desktop scale. The phone sits inward from the right edge to leave the shopkeeper's face visible. A small receipt is explicitly labelled as an example. The proof strip describes available product capabilities; it does not repeat unverified customer counts, uptime or testimonials from the reference.

`workspace-preview.webp` is a browser capture of this desktop design with an intercepted example account. `android-home-preview.webp` is a capture of the existing Android Home screen from its UI test harness, also with example data. Both are optimized WebP conversions. They are product previews, not new Android builds. No signing material, app source or release artifacts changed.

The hero checks cover six viewport widths in both themes, image loading, real navigation destinations, keyboard menu dismissal, typing layout stability, reduced-motion switching, section reveals, unsupported observers and content without JavaScript.

Validation: production build and ESLint passed. The final landing/download run passed 23 checks. Five appearance/directory checks passed in the preceding run. The final desktop workspace run passed all nine checks, following 38 combined workspace, industry, funding and dark-surface checks. Screenshots were reviewed at desktop and laptop widths in both themes. Verification artifacts are kept outside the repository.

Light-mode follow-up: the landing header, hero, typing headline, actions, annotations, feature links and proof strip now follow the selected theme. The light palette uses pale green surfaces and deep green text. The device previews remain labelled product captures. Theme changes and reload persistence are covered at phone and desktop widths; the full 23-check landing/appearance run, production build and lint passed.
