package com.biashara.app

import android.content.Context
import android.graphics.Bitmap
import androidx.activity.compose.setContent
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.core.app.ApplicationProvider
import com.biashara.app.data.*
import com.biashara.app.ui.*
import kotlinx.coroutines.*
import java.io.File
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w393dp-h852dp-xhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class FundingVisualUiTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private fun owner(): DemoStore {
        val store = DemoStore(real = true)
        val context = ApplicationProvider.getApplicationContext<Context>()
        store.backend = LiveBackend(context, CoroutineScope(Dispatchers.Unconfined), store, MemorySessions(), TestBusinessApi())
        runBlocking { store.backend!!.signIn("owner@example.com", "password123") }
        return store
    }
    private fun snapshot() = json(
        "verificationStatus" to "submitted",
        "readiness" to json("sales30" to 12500.25, "profit30" to -750.5, "receipts30" to 18),
        "applications" to JSONArray().put(json(
            "id" to "11111111-1111-4111-8111-111111111111", "revision" to 1, "status" to "draft",
            "updated_at" to "2026-10-25T00:00:00Z", "payload" to emptyFundingDraft("owner@example.com", "+254700123456").put("amount", "10000.25"),
        )),
    )
    private fun press(text: String) {
        val node = compose.onNode(hasText(text, substring = false) and hasClickAction())
        if (!node.isDisplayed()) node.performScrollTo()
        node.performClick()
        compose.waitForIdle()
    }
    private fun capture(name: String) {
        compose.waitForIdle()
        compose.runOnIdle {
            val view = compose.activity.window.decorView
            val bitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
            view.draw(android.graphics.Canvas(bitmap))
            File("build/outputs/ui-previews/funding").apply { mkdirs() }.resolve("$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
            bitmap.recycle()
        }
    }
    @Test fun fundingHierarchyAndRequestEditorRemainReachableWithDarkLargeText() {
        val store = owner()
        val dark = mutableStateOf(false)
        compose.activity.setContent {
            BiasharaTheme(json("theme" to if (dark.value) "dark" else "light", "textSize" to if (dark.value) 200 else 100)) {
                ConnectedFundingScreen(store, {}, {}, {}, repositoryFactory = { context, backend -> FundingRepository(context, backend, MemoryFundingPendingStore(), FundingTransport { _, _ -> snapshot() }) })
            }
        }
        compose.waitForIdle()
        capture("overview-light")
        compose.onNodeWithText("Recorded receipts", substring = false).performScrollTo().assertIsDisplayed()
        compose.onNodeWithText("KES -750.50", substring = false).assertExists()
        capture("readiness-light")
        press("New funding request")
        compose.onNodeWithText("Requested amount (KES)", substring = false).assertExists()
        capture("request-light")
        press("Close")
        compose.runOnIdle { dark.value = true }
        press("New funding request")
        compose.onNodeWithText("Save draft", substring = false).assertIsDisplayed()
        capture("request-dark-large")
        press("Close")
        press("Continue draft")
        compose.onNodeWithText("10000.25", substring = false).assertExists()
        press("Close")
        press("Open repayment calculator")
        compose.onNodeWithText("Amount (KES)", substring = false).performScrollTo().assertExists()
        capture("calculator-dark-large")
        press("Close")
    }
}
