package com.biashara.app

import android.content.Context
import androidx.activity.compose.setContent
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.core.app.ApplicationProvider
import com.biashara.app.data.*
import com.biashara.app.ui.*
import kotlinx.coroutines.*
import org.json.JSONArray
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w393dp-h852dp-xhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class IndustryUiTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private val context get() = ApplicationProvider.getApplicationContext<Context>()
    private fun owner(id: String): DemoStore {
        val api = TestBusinessApi().apply { userId = id }
        val store = DemoStore(real = true)
        store.backend = LiveBackend(context, CoroutineScope(Dispatchers.Unconfined), store, MemorySessions(), api)
        runBlocking { store.backend!!.signIn("owner@example.com", "password123") }
        return store
    }
    @Test fun switchingAccountsClearsPrivateOperationalRecordsBeforeTheNextLoad() {
        val selected = mutableStateOf(owner("first-owner"))
        val nextLoad = CompletableDeferred<org.json.JSONObject>()
        compose.activity.setContent {
            BiasharaTheme(json("theme" to "dark")) {
                IndustryScreen(selected.value, {}, repositoryFactory = { context, backend -> IndustryRepository(context, backend, MemoryFundingPendingStore(), IndustryTransport { _, _, _ ->
                    if (backend.accountId == "first-owner") json("records" to JSONArray().put(json("id" to "11111111-1111-4111-8111-111111111111", "industry_id" to "retail", "workflow_id" to "special-orders", "title" to "Private first-owner order", "status" to "Planned", "amount_minor" to 1025, "paid_minor" to 0)))
                    else nextLoad.await()
                }) })
            }
        }
        compose.waitForIdle()
        compose.onNodeWithText("Private first-owner order").performScrollTo().assertExists()
        compose.runOnIdle { selected.value = owner("second-owner") }
        compose.waitForIdle()
        compose.onNodeWithText("Private first-owner order").assertDoesNotExist()
        nextLoad.complete(json("records" to JSONArray()))
        compose.waitForIdle()
        compose.onNodeWithText("No special orders to show.").performScrollTo().assertExists()
    }
    @Test fun lockedWorkspaceShowsTheOwnerRecoveryActionAndNoBusinessMetrics() {
        val store = owner("locked-owner")
        var opened = false
        compose.activity.setContent { BiasharaTheme(json("theme" to "dark")) { LockedWorkspaceScreen(store, { opened = true }, {}, {}) } }
        compose.onNodeWithText("Complete business details").performScrollTo().performClick()
        org.junit.Assert.assertTrue(opened)
        compose.onNodeWithText("Total sales").assertDoesNotExist()
        compose.onNodeWithText("Business profile").assertExists()
    }
}
