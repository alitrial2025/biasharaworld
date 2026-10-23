package com.biashara.app

import android.app.Application
import android.content.ComponentName
import androidx.activity.ComponentActivity
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
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@Config(
    sdk = [35],
    qualifiers = "w320dp-h720dp-xhdpi",
    application = AccessibilityTestApplication::class,
)
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

// Register the Compose host only in the JVM test process. Release APKs must not
// include the debug ui-test-manifest activity merely to satisfy this fixture.
class AccessibilityTestApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        shadowOf(packageManager)
            .addActivityIfNotPresent(ComponentName(this, ComponentActivity::class.java))
    }
}
