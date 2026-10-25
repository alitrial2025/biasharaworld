package com.biashara.app

import android.graphics.Bitmap
import androidx.activity.compose.setContent
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.Density
import com.biashara.app.data.DemoStore
import com.biashara.app.data.json
import com.biashara.app.ui.*
import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w393dp-h852dp-xhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class BrandDoodleUiTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private fun capture(name: String) {
        compose.waitForIdle()
        compose.runOnIdle {
            val view = compose.activity.window.decorView
            val bitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
            view.draw(android.graphics.Canvas(bitmap))
            File("build/outputs/ui-previews/brand").apply { mkdirs() }.resolve("$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
            bitmap.recycle()
        }
    }
    @Test fun brandedWelcomeRemainsReachableInBothThemesAndLargeText() {
        val dark = mutableStateOf(false)
        compose.activity.setContent {
            BiasharaTheme(json("theme" to if (dark.value) "dark" else "light")) { WelcomeOnboardingScreen({}, {}) }
        }
        compose.onNodeWithText("A WORLD OF BUSINESS").assertExists()
        capture("welcome-light")
        compose.runOnIdle { dark.value = true }
        capture("welcome-dark")
        compose.onNodeWithText("Continue", substring = false).performScrollTo().performClick()
        compose.onNodeWithText("Know your business, every day.").assertExists()
        compose.activity.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, 2f)) {
                BiasharaTheme(json("theme" to "dark")) { WelcomeOnboardingScreen({}, {}) }
            }
        }
        compose.onNodeWithText("I already have an account · Sign in", substring = false).performScrollTo().assertIsDisplayed()
    }
    @Test fun patternedAssistantKeepsSolidChatControlsUsableInBothThemes() {
        val dark = mutableStateOf(false)
        val store = DemoStore()
        compose.activity.setContent { BiasharaTheme(json("theme" to if (dark.value) "dark" else "light")) { AssistantScreen(store, {}) } }
        compose.onNodeWithText("Your business assistant").assertIsDisplayed()
        compose.onNodeWithContentDescription("Send message").assertExists()
        capture("assistant-light")
        compose.runOnIdle { dark.value = true }
        capture("assistant-dark")
        val before = store.messages.size
        compose.onNodeWithText("Who owes me money?", substring = false).performClick()
        compose.waitForIdle()
        assertTrue(store.messages.size > before)
        compose.onNodeWithContentDescription("About this assistant").performClick()
        compose.onNodeWithText("BiasharaAI preview").assertExists()
        compose.onNodeWithText("Done", substring = false).performClick()
    }
}
