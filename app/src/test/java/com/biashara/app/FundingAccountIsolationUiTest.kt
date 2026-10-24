package com.biashara.app

import android.content.Context
import androidx.activity.compose.setContent
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.core.app.ApplicationProvider
import com.biashara.app.data.*
import com.biashara.app.ui.BiasharaTheme
import com.biashara.app.ui.ConnectedFundingScreen
import kotlinx.coroutines.*
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
class FundingAccountIsolationUiTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private val context get() = ApplicationProvider.getApplicationContext<Context>()

    private fun owner(id: String): DemoStore {
        val store = DemoStore(real = true)
        val api = TestBusinessApi().apply { userId = id }
        store.backend = LiveBackend(context, CoroutineScope(Dispatchers.Unconfined), store, MemorySessions(), api)
        runBlocking { store.backend!!.signIn("same-label@example.com", "password123") }
        return store
    }
    private fun response(amount: String): JSONObject = json(
        "verificationStatus" to "submitted",
        "readiness" to json("sales30" to 0, "profit30" to 0, "receipts30" to 0),
        "applications" to JSONArray().put(json(
            "id" to "11111111-1111-4111-8111-111111111111", "revision" to 1, "status" to "draft",
            "updated_at" to "2026-10-24T00:00:00Z", "payload" to emptyFundingDraft().put("amount", amount),
        )),
    )

    @Test fun switchingOwnersClearsPrivateFundingBeforeTheNextLoadCompletes() {
        val first = owner("first-owner")
        val second = owner("second-owner")
        val selected = mutableStateOf(first)
        val nextLoad = CompletableDeferred<JSONObject>()
        compose.activity.setContent {
            BiasharaTheme {
                ConnectedFundingScreen(selected.value, {}, {}, {}, repositoryFactory = { context, backend ->
                    FundingRepository(context, backend, MemoryFundingPendingStore(), FundingTransport { _, _ ->
                        if (backend.accountId == "first-owner") response("90001") else nextLoad.await()
                    })
                })
            }
        }
        compose.waitForIdle()
        compose.onNodeWithText("90001 KES · Stock").assertExists()
        compose.runOnIdle { selected.value = second }
        compose.waitForIdle()
        compose.onNodeWithText("90001 KES · Stock").assertDoesNotExist()
        compose.onNodeWithText("Loading funding requests…").assertExists()
        nextLoad.complete(response("80002"))
        compose.waitForIdle()
        compose.onNodeWithText("80002 KES · Stock").assertExists()
    }
}
