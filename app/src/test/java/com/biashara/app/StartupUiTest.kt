package com.biashara.app

import android.content.Context
import android.graphics.Bitmap
import java.io.File
import android.provider.Settings
import androidx.activity.compose.setContent
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.core.app.ApplicationProvider
import com.biashara.app.data.json
import com.biashara.app.ui.BiasharaTheme
import com.biashara.app.ui.StartupScreen
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w393dp-h852dp-xhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class StartupUiTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private fun capture(name: String) {
        compose.waitForIdle()
        compose.runOnIdle {
            val view = compose.activity.window.decorView
            val image = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
            view.draw(android.graphics.Canvas(image))
            File("build/outputs/ui-previews/startup").apply { mkdirs() }.resolve("$name.png").outputStream().use { image.compress(Bitmap.CompressFormat.PNG, 100, it) }
            image.recycle()
        }
    }

    @Test fun disabledSystemAnimationsKeepTheLogoStaticAndStatusReadable() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val resolver = context.contentResolver
        val previous = Settings.Global.getFloat(resolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f)
        try {
            Settings.Global.putFloat(resolver, Settings.Global.ANIMATOR_DURATION_SCALE, 0f)
            compose.activity.setContent { BiasharaTheme(json("theme" to "dark")) { StartupScreen() } }
            compose.onNodeWithTag("startup-logo-static").assertExists()
            capture("startup-dark")
            compose.onNodeWithTag("startup-logo-animated").assertDoesNotExist()
            compose.onNodeWithText("Opening your workspace").assertExists()
            compose.onNodeWithText("Try again").assertDoesNotExist()
        } finally { Settings.Global.putFloat(resolver, Settings.Global.ANIMATOR_DURATION_SCALE, previous) }
    }

    @Test fun failedInitializationShowsRetryAndSignOutWithoutAContinuingAnimation() {
        var retried = 0
        var signedOut = 0
        compose.activity.setContent {
            BiasharaTheme(json("theme" to "dark", "textSize" to 130)) {
                StartupScreen(error = "Check your connection and try again.", onRetry = { retried++ }, onSignOut = { signedOut++ })
            }
        }
        compose.onNodeWithTag("startup-logo-static").assertExists()
        compose.onNodeWithText("Check your connection and try again.").assertExists()
        capture("startup-reconnect-dark-large")
        compose.onNodeWithText("Try again").performScrollTo().performClick()
        compose.onNodeWithText("Sign out").performScrollTo().performClick()
        assertEquals(1, retried)
        assertEquals(1, signedOut)
    }

    @Test fun readinessChangesImmediatelyWithoutAMinimumStartupTimer() {
        val loading = mutableStateOf(true)
        compose.activity.setContent { BiasharaTheme { StartupScreen(loading = loading.value) } }
        compose.onNodeWithText("Opening your workspace").assertExists()
        capture("startup-light")
        compose.runOnIdle { loading.value = false }
        compose.onNodeWithText("Your workspace is ready").assertExists()
        compose.onNodeWithText("Opening your workspace").assertDoesNotExist()
        compose.onNodeWithTag("startup-logo-static").assertExists()
    }
}
