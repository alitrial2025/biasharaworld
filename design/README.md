# BiasharaOS UI preview

Open [reference-ui.png](reference-ui.png) for the 14-screen overview, or view the full-size PNGs in `screenshots/`.

These previews render the Kotlin / Jetpack Compose screen code using Android API 35 native graphics under Robolectric. They are not separately drawn mockups. Android system status bars are not part of these captures.

Regenerate the source previews with:

```sh
./gradlew :app:testDebugUnitTest --tests com.biashara.app.UiRenderTest
```

The output is written to `app/build/outputs/ui-previews/`. The welcome, features, setup, dashboard, sales, inventory, assistant, customers, suppliers, order, reports, financing and profile screens follow the supplied BiasharaOS design reference.

Photography and product packshots are generated prototype assets. All payment, ordering, financing and AI interactions remain demos. Real-device instrumentation is provided separately and has not been validated in this cloud machine.

## Visual system

The layout stays close to the supplied reference. The shared theme uses Inter for interface text and amounts, Manrope for headings, tabular numerals, and line heights matched to text size.

| Role | Color |
| --- | --- |
| Primary emerald | `#00815D` |
| Main text | `#17242F` |
| Secondary text | `#5F6C7B` |
| Canvas | `#F8FAFC` |
| Sales tint | `#EAF7F0` |
| Profit tint | `#EEF1FA` |
| Expenses tint | `#FCF0EF` |
| Debts tint | `#FBF4E7` |

Primary button text and the main emerald satisfy 4.5:1 contrast on white. Pastel backgrounds group metrics without competing with amounts. The typography and shared controls are defined in `ui/Theme.kt`, `ui/AppText.kt`, and `ui/Components.kt`.
