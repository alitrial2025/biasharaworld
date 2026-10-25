package com.biashara.app

import android.graphics.Bitmap
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import java.io.File
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Native Android graphics rendering on the JVM, also usable without an emulator. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w393dp-h852dp-xhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class UiRenderTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()

    private fun capture(name: String) {
        compose.waitForIdle()
        val output = File("build/outputs/ui-previews").apply { mkdirs() }
        compose.runOnIdle {
            val view = compose.activity.window.decorView
            val bitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
            view.draw(android.graphics.Canvas(bitmap))
            File(output, "$name.png").outputStream().use { stream ->
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
            }
            bitmap.recycle()
        }
    }

    @Test
    fun renderMainScreens() {
        capture("01-home")
        compose.onNodeWithText("New sale", substring = false).performClick()
        compose.onNodeWithContentDescription("Add Soko maize flour").performClick()
        compose.onNodeWithContentDescription("Add Blue Band").performClick()
        capture("02-new-sale")
        compose.onNodeWithContentDescription("Go back").performClick()
        compose.onNodeWithText("Stock").performClick()
        capture("03-stock")
        compose.onNodeWithText("More").performClick()
        capture("04-more")
        compose.onNodeWithText("Reports").performScrollTo().performClick()
        capture("05-reports")
        compose.onNodeWithContentDescription("Go back").performClick()
        compose.onNodeWithText("Suppliers").performScrollTo().performClick()
        capture("06-suppliers")
        compose.onNodeWithText("KIFARU Wholesale").performScrollTo().performClick()
        capture("14-supplier-products")
        compose
            .onNodeWithContentDescription("Order Soko maize flour")
            .performScrollTo()
            .performClick()
        compose.onNodeWithText("Review order · 1 item").performScrollTo().performClick()
        capture("15-order")
        compose.onNodeWithContentDescription("Go back").performClick()
        compose.onNodeWithContentDescription("Go back").performClick()
        compose.onNodeWithContentDescription("Go back").performClick()
        compose.onNodeWithText("BiasharaAI").performScrollTo().performClick()
        capture("07-assistant")
        compose.onNodeWithContentDescription("Go back").performClick()
        compose.onNodeWithText("Business Financing").performScrollTo().performClick()
        capture("09-financing")
        compose.onNodeWithContentDescription("Go back").performClick()
        compose.onNodeWithText("Meet Biashara").performScrollTo().performClick()
        capture("10-welcome")
        compose.onNodeWithContentDescription("Continue welcome").performClick()
        capture("11-features")
        compose.onNodeWithText("Get Started  →").performClick()
        capture("12-business-setup")
        compose.onNodeWithText("Skip").performClick()
        compose.onNodeWithText("Customers").performScrollTo().performClick()
        capture("13-customers")
    }

    @Test
    fun checkoutUpdatesTheRenderedHistory() {
        compose.onNodeWithText("New sale", substring = false).performClick()
        compose.onNodeWithContentDescription("Add Soko maize flour").performClick()
        compose.onNodeWithText("Review sale").performClick()
        compose.onNodeWithText("Record received payment").performClick()
        compose.onNodeWithText("Receipt #1049").assertExists()
        compose.onNodeWithText("View sales").performClick()
        compose.onNodeWithText("#1049 · 1 item · M-Pesa").assertExists()
        capture("08-sales")
    }
}
