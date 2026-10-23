package com.biashara.app

import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import android.graphics.Bitmap
import java.io.File
import org.junit.Rule
import org.junit.Test

/** Captures the actual Compose UI for visual review on the connected device. */
class DesignCaptureTest {
    @get:Rule val compose=createAndroidComposeRule<MainActivity>()

    private fun capture(name: String) {
        compose.waitForIdle()
        val directory=File(InstrumentationRegistry.getInstrumentation().targetContext.getExternalFilesDir(null),"screenshots").apply{mkdirs()}
        File(directory,"$name.png").outputStream().use{compose.onRoot().captureToImage().asAndroidBitmap().compress(Bitmap.CompressFormat.PNG,100,it)}
    }

    @Test fun captureDesignScreens() {
        capture("01-home")
        compose.onNodeWithContentDescription("New sale").performClick()
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
        compose.onNodeWithContentDescription("Go back").performClick()
        compose.onNodeWithText("More").performClick()
        compose.onNodeWithText("BiasharaAI").performScrollTo().performClick()
        capture("07-assistant")
    }
}
