package com.biashara.app

import android.graphics.Bitmap
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.activity.compose.setContent
import androidx.test.core.app.ApplicationProvider
import com.biashara.app.data.DemoStore
import com.biashara.app.data.LiveBackend
import com.biashara.app.ui.AccountScreen
import com.biashara.app.ui.BiasharaTheme
import java.io.File
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w393dp-h852dp-xhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class AccountUiTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()

    private fun capture(name: String) {
        compose.waitForIdle()
        compose.runOnIdle {
            val view = compose.activity.window.decorView
            val bitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
            view.draw(android.graphics.Canvas(bitmap))
            val output = File("build/outputs/ui-previews").apply { mkdirs() }
            File(output, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
            bitmap.recycle()
        }
    }

    @Test fun accountModesRemainAccessibleOnPhone() {
        compose.activity.setContent {
            val scope = rememberCoroutineScope()
            val backend = remember { LiveBackend(ApplicationProvider.getApplicationContext(), scope, DemoStore(real = true)) }
            BiasharaTheme { AccountScreen(backend) }
        }
        compose.onNodeWithText("Welcome back.").assertIsDisplayed()
        capture("account-login")
        compose.onNodeWithText("New here? Create an account").performScrollTo().performClick()
        compose.onNodeWithText("Your name").performScrollTo().assertIsDisplayed()
        capture("account-signup")
        compose.onNodeWithContentDescription("Show password").performScrollTo().performClick()
        compose.onNodeWithContentDescription("Hide password").assertIsDisplayed()
        compose.onNodeWithText("Forgot password?").performScrollTo().performClick()
        compose.onNodeWithText("Send reset email").performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("Password").assertDoesNotExist()
    }
}
