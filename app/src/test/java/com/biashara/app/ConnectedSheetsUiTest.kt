package com.biashara.app

import android.content.Context
import androidx.activity.compose.setContent
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.core.app.ApplicationProvider
import com.biashara.app.data.*
import com.biashara.app.ui.*
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w393dp-h852dp-xhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ConnectedSheetsUiTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    private fun fixture(api: TestBusinessApi): Pair<DemoStore, LiveBackend> {
        val store = DemoStore(real = true)
        val backend = LiveBackend(ApplicationProvider.getApplicationContext<Context>(), CoroutineScope(Dispatchers.Unconfined), store, MemorySessions(), api)
        store.backend = backend
        runBlocking { backend.signIn("owner@example.com", "password123") }
        return store to backend
    }
    private fun enter(label: String, text: String) {
        compose.onNodeWithText(label, substring = false).performScrollTo().performTextClearance()
        compose.onNodeWithText(label, substring = false).performTextInput(text)
    }
    private fun press(label: String) {
        val node = compose.onNode(hasText(label, substring = false) and hasClickAction())
        if (!node.isDisplayed()) node.performScrollTo()
        node.performClick()
    }
    private fun finish(backend: LiveBackend) { compose.waitUntil(10000) { !backend.busy }; compose.waitForIdle() }

    @Test fun productFormKeepsValuesOnValidationFailureAndSavesExactAmounts() {
        val api = TestBusinessApi(); val (store, backend) = fixture(api)
        api.onCommand = { command -> if (command.optString("type") == "addProduct") api.state.getJSONArray("products").put(JSONObject(command.getJSONObject("product").toString()).put("id", 1)) }
        compose.activity.setContent { BiasharaTheme { InventoryScreen(store) } }
        press("Add Product")
        enter("Product name", "Coffee")
        enter("Selling price (KES)", "10.25")
        enter("Cost price (KES)", "6.75")
        enter("Opening quantity", "3")
        api.nextError = BackendException("SKU already exists.", 400)
        press("Add product"); finish(backend)
        compose.onNodeWithText("SKU already exists.").assertExists()
        compose.onNodeWithText("Coffee").assertExists()
        assertFalse(backend.hasPending)
        enter("SKU", "COFFEE-NEW")
        press("Add product"); finish(backend)
        compose.onNodeWithText("Pack size").assertDoesNotExist()
        assertEquals(1, store.products.size)
        assertEquals(1025L, store.products.single().priceMinor)
        assertEquals(6.75, api.requests.last().getJSONObject("command").getJSONObject("product").getDouble("cost"), 0.0)
    }

    @Test fun retryingAnInterruptedProductSaveClosesTheSheetWithoutADuplicate() {
        val api = TestBusinessApi(); val (store, backend) = fixture(api)
        api.onCommand = { command -> if (command.optString("type") == "addProduct") api.state.getJSONArray("products").put(JSONObject(command.getJSONObject("product").toString()).put("id", 1)) }
        compose.activity.setContent { BiasharaTheme { InventoryScreen(store) } }
        press("Add Product"); enter("Product name", "Tea"); enter("Selling price (KES)", "50")
        api.loseNextResponse = true
        press("Add product"); finish(backend)
        assertTrue(backend.hasPending)
        press("Retry saved request"); finish(backend)
        compose.onNodeWithText("Pack size").assertDoesNotExist()
        assertEquals(1, store.products.size)
        assertEquals(2, api.requests.size)
        assertEquals(api.requests.first().getString("requestId"), api.requests.last().getString("requestId"))
    }

    @Test fun partialRepaymentUsesTheSelectedCustomersIdEvenWhenNamesMatch() {
        val api = TestBusinessApi()
        api.state.put("customers", JSONArray().put(json("id" to 1, "name" to "Amina", "phone" to "07001", "email" to "", "balance" to 10.25, "purchases" to 0, "color" to "mint")).put(json("id" to 2, "name" to "Amina", "phone" to "07002", "email" to "", "balance" to 20.5, "purchases" to 0, "color" to "mint")))
        api.onCommand = { command -> if (command.optString("type") == "payBalance") api.state.getJSONArray("customers").getJSONObject(0).put("balance", 10.0) }
        val (store, backend) = fixture(api)
        compose.activity.setContent { BiasharaTheme { CustomersScreen(store, {}) } }
        press("07001")
        enter("Payment received (KES)", "0.25")
        press("Record repayment"); finish(backend)
        val command = api.requests.single().getJSONObject("command")
        assertEquals(1, command.getInt("id")); assertEquals(.25, command.getDouble("amount"), 0.0)
        assertEquals(1000L, store.customers[0].balanceMinor); assertEquals(2050L, store.customers[1].balanceMinor)
    }

    @Test fun viewerHasNoInventoryWriteActionsAndSalesContainNoFabricatedCount() {
        val api = TestBusinessApi(); api.role = "Viewer"
        val (store, _) = fixture(api)
        compose.activity.setContent { BiasharaTheme { InventoryScreen(store) } }
        compose.onNodeWithText("Add Product").assertDoesNotExist()
        compose.activity.setContent { BiasharaTheme { SalesScreen(store, {}) } }
        compose.onNodeWithText("0 recorded sales today").assertExists()
        compose.onNodeWithText("Make a new sale").assertDoesNotExist()
        assertTrue(api.requests.isEmpty())
    }

    @Test fun productSearchDestinationOpensTheSelectedProductsDetails() {
        val api = TestBusinessApi()
        api.state.put("products", JSONArray().put(json("id" to 17, "name" to "Coffee", "size" to "250g", "sku" to "COFFEE", "category" to "Food", "price" to 10.25, "cost" to 6.75, "stock" to 3, "reorder" to 1, "art" to 7)))
        val (store, _) = fixture(api)
        compose.activity.setContent { BiasharaTheme { InventoryScreen(store, initialProductId = 17) } }
        compose.onNodeWithText("Edit product").assertExists()
        compose.onNodeWithText("SKU: COFFEE", substring = true).assertExists()
    }
}
