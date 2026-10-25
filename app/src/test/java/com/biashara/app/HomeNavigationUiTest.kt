package com.biashara.app

import android.content.Context
import android.graphics.Bitmap
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.core.app.ApplicationProvider
import com.biashara.app.data.*
import com.biashara.app.ui.*
import kotlinx.coroutines.*
import java.io.File
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
class HomeNavigationUiTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private fun capture(name: String) {
        compose.waitForIdle()
        compose.runOnIdle {
            val view = compose.activity.window.decorView
            val image = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
            view.draw(android.graphics.Canvas(image))
            File("build/outputs/ui-previews/home").apply { mkdirs() }.resolve("$name.png").outputStream().use { image.compress(Bitmap.CompressFormat.PNG, 100, it) }
            image.recycle()
        }
    }
    @Test fun homeSearchAndPrimaryNavigationRemainFunctional() {
        compose.onNodeWithContentDescription("Business profile").assertIsDisplayed()
        capture("home-light")
        compose.onNodeWithContentDescription("Search products, suppliers…").performTextInput("unmatchedzzzz")
        compose.onNodeWithText("No matching records").assertExists()
        compose.onNodeWithText("Sales", substring = false).performClick()
        compose.onNodeWithText("Home", substring = false).performClick()
        compose.onNodeWithText("New sale", substring = false).performClick()
        compose.onNodeWithContentDescription("Go back").performClick()
        compose.onNodeWithText("More", substring = false).performClick()
        compose.onNodeWithText("Explore all business tools").performScrollTo().assertIsDisplayed()
    }
    @Test @Config(qualifiers = "w320dp-h720dp-xhdpi")
    fun realWorkspaceWithLongBusinessNameAndLargeTextKeepsNavigationReachable() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val store = DemoStore(real = true)
        store.backend = LiveBackend(context, CoroutineScope(Dispatchers.Unconfined), store, MemorySessions(), TestBusinessApi())
        runBlocking { store.backend!!.signIn("owner@example.com", "password123") }
        store.businessName = "Nairobi Wholesale Distribution and Event Equipment Services Limited"
        var destination: Screen? = null
        compose.activity.setContent {
            BiasharaTheme(json("theme" to "dark", "textSize" to 200)) {
                Column {
                    Box(Modifier.weight(1f)) { DashboardScreen(store, { destination = it }) }
                    BottomBar(Screen.HOME, { destination = it }, store)
                }
            }
        }
        capture("home-dark-large")
        compose.onNodeWithText("Work", substring = false).assertIsDisplayed().performClick()
        assertEquals(Screen.OPERATIONS, destination)
        compose.onNodeWithText("New sale", substring = false).assertIsDisplayed().performClick()
        assertEquals(Screen.NEW_SALE, destination)
        compose.onNodeWithText("Pending Debts", substring = false).performScrollTo().assertIsDisplayed()
        capture("metrics-dark-large")
        compose.onNodeWithText("More", substring = false).assertIsDisplayed()
    }
}
