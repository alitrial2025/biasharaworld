package com.biashara.app

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.unit.Density
import com.biashara.app.data.DemoStore
import com.biashara.app.ui.*
import org.json.JSONObject
import org.junit.Assert.assertTrue
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
    fun switchingAppearanceKeepsSurfacesAndActionsReadable() {
        val theme = mutableStateOf("dark")
        var background = Color.Unspecified
        var selectedText = Color.Unspecified
        val checkTheme: (Boolean) -> Unit = { dark ->
            compose.runOnIdle {
                assertTrue((background.luminance() < 0.5f) == dark)
                assertTrue((selectedText.luminance() < 0.5f) == dark)
            }
            compose.onNodeWithText("Reports").assertIsDisplayed()
            compose.onNodeWithText("Sales").assertIsDisplayed()
        }
        compose.setContent {
            BiasharaTheme(JSONObject().put("theme", theme.value)) {
                val colors = MaterialTheme.colorScheme
                SideEffect {
                    background = colors.surfaceContainerHigh
                    selectedText = colors.onPrimary
                }
                Page {
                    PageTitle("Reports", onBack = {})
                    FilterPills(listOf("Sales", "Expenses"), "Sales") {}
                    SurfaceCard { AppText("Report totals") }
                }
            }
        }
        checkTheme(true)
        compose.runOnIdle { theme.value = "light" }
        checkTheme(false)
        compose.runOnIdle { theme.value = "dark" }
        checkTheme(true)
    }

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
