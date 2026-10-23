package com.biashara.app

import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.unit.Density
import com.biashara.app.data.DemoStore
import com.biashara.app.ui.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w320dp-h720dp-xhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class AccessibilityUiTest {
    @get:Rule val compose = createComposeRule()

    @Test
    fun narrowPhoneAtTwoHundredPercentTextKeepsPreferencesReachable() {
        val store = DemoStore()
        compose.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 2f)) {
                BiasharaTheme { FeatureScreen(store, "preferences", {}, {}) }
            }
        }
        compose.onNodeWithText("Language & appearance").assertExists()
        compose.onNodeWithText("Reset demo data").performScrollTo().assertIsDisplayed()
    }
}
