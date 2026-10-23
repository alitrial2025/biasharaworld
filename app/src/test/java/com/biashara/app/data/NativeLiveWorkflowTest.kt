package com.biashara.app.data

import android.content.Context
import android.graphics.Bitmap
import androidx.test.core.app.ApplicationProvider
import java.io.ByteArrayOutputStream
import java.util.UUID
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Opt-in integration against the hosted API, with an account created/removed by the runner. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class NativeLiveWorkflowTest {
    @Test fun nativeClientCompletesTheConnectedBusinessLifecycle() = runBlocking {
        val email = System.getenv("BIASHARA_LIVE_TEST_EMAIL")
        val password = System.getenv("BIASHARA_LIVE_TEST_PASSWORD")
        assumeTrue("Run through tools/test-android-live.mjs", !email.isNullOrBlank() && !password.isNullOrBlank())
        val context = ApplicationProvider.getApplicationContext<Context>()
        val vault = MemorySessions(); val store = DemoStore(real = true)
        val backend = LiveBackend(context, this, store, vault); store.backend = backend
        backend.signIn(email!!, password!!)
        assertTrue(backend.workspaceLoaded); assertFalse(backend.hasBusiness)
        backend.createBusiness("Native verification", "Temporary Android verification", "Nairobi", "Retail shop")
        assertTrue(backend.hasBusiness); assertTrue(store.products.isEmpty()); assertEquals(0L, store.branchSalesMinor)
        val image = Bitmap.createBitmap(16, 16, Bitmap.Config.ARGB_8888).apply { eraseColor(android.graphics.Color.GREEN) }
        val bytes = ByteArrayOutputStream().also { image.compress(Bitmap.CompressFormat.JPEG, 80, it) }.toByteArray(); image.recycle()
        val imagePath = backend.uploadProductImage(bytes)
        assertTrue(productImageBelongsTo(imagePath, backend.businessId))
        assertTrue(backend.downloadProductImage(imagePath).isNotEmpty())
        suspend fun send(type: String, values: Map<String, String> = emptyMap()) = backend.command(nativeCommand(type, values, store))
        backend.command(json("type" to "addProduct", "product" to json("name" to "Native coffee", "size" to "250 g", "sku" to "NATIVE-${UUID.randomUUID()}", "category" to "Food", "price" to 10.25, "cost" to 6.75, "stock" to 10, "reorder" to 2, "art" to 0, "imagePath" to imagePath)))
        val product = store.products.single()
        assertEquals(1025L, product.priceMinor); assertEquals(imagePath, product.imagePath)
        backend.command(json("type" to "updateProduct", "id" to product.id, "changes" to json("size" to "Updated 250 g")))
        assertEquals("Updated 250 g", store.products.single().detail)
        backend.command(json("type" to "addCustomer", "customer" to json("name" to "Native customer", "phone" to "", "email" to "", "balance" to 10.25, "purchases" to 0, "color" to "mint")))
        val customer = store.customers.single()
        backend.command(json("type" to "payBalance", "id" to customer.id, "amount" to .25))
        assertEquals(1000L, store.customers.single().balanceMinor)
        store.add(product.id); store.add(product.id)
        store.operations.command("basket", mapOf("customer" to customer.name))
        backend.load(); assertEquals(2, store.cart[product.id])
        send("hold", mapOf("name" to "Native held sale")); assertTrue(store.cart.isEmpty())
        val held = store.operations.state.records("held").first().optInt("id")
        send("resume", mapOf("id" to held.toString())); assertEquals(2, store.cart[product.id])
        val checkout = send("checkout", mapOf("method" to "Cash")); assertTrue(store.cart.isEmpty()); assertEquals(8, store.products.single().stock)
        val receiptId = checkout.getInt("id")
        send("return", mapOf("id" to receiptId.toString(), "product" to product.id.toString(), "quantity" to "1", "restock" to "true", "reason" to "Native return test")); assertEquals(9, store.products.single().stock)
        backend.command(json("type" to "addExpense", "expense" to json("name" to "Transport", "category" to "Transport", "amount" to .5, "date" to todayLocal(), "method" to "Cash")))
        assertEquals(50L, store.report().expenses)
        send("removeExpense", mapOf("id" to store.liveState.records("expenses").first().optInt("id").toString())); assertEquals(0L, store.report().expenses)
        send("batch", mapOf("product" to product.id.toString(), "quantity" to "2", "code" to "NATIVE", "expires" to "2099-12-31")); assertEquals(11, store.products.single().stock)
        val count = send("startCount", mapOf("name" to "Native count")).getInt("id")
        send("count", mapOf("id" to count.toString(), "product" to product.id.toString(), "quantity" to "10"))
        send("finaliseCount", mapOf("id" to count.toString(), "reason" to "Physical native verification")); assertEquals(10, store.products.single().stock)
        send("addBranch", mapOf("name" to "Second branch", "location" to "Nairobi"))
        val branch = store.operations.state.records("branches").last().optString("id")
        val transfer = send("transfer", mapOf("product" to product.id.toString(), "quantity" to "1", "to" to branch)).getInt("id")
        send("dispatchTransfer", mapOf("id" to transfer.toString())); send("receiveTransfer", mapOf("id" to transfer.toString()))
        assertEquals(1, store.operations.state.objectAt("stock").objectAt(branch).optInt(product.id.toString()))
        send("branch", mapOf("branch" to branch)); assertEquals(1, store.products.single().stock)
        send("branch", mapOf("branch" to "main")); assertEquals(9, store.products.single().stock)
        send("openRegister", mapOf("amount" to "100")); send("cashEntry", mapOf("amount" to "10.25", "direction" to "out", "reason" to "Float used")); send("closeRegister", mapOf("amount" to "89.75"))
        assertEquals(8975L, store.operations.state.records("registers").first().optLong("expected"))
        send("barcode", mapOf("product" to product.id.toString(), "code" to productBarcode(99)))
        assertEquals(productBarcode(99), store.products.first { it.id == product.id }.barcode)
        send("promotion", mapOf("name" to "Native offer", "percent" to "5", "ends" to "2099-12-31", "product" to product.id.toString()))
        assertTrue(store.operations.state.records("promotions").isNotEmpty())
        store.add(product.id)
        store.operations.command("basket", mapOf("customer" to customer.name, "discount" to "0", "redeem" to "0", "promotion" to ""))
        val document = send("document", mapOf("kind" to "Quotation", "due" to "2099-12-31")).getInt("id")
        send("convertDocument", mapOf("id" to document.toString()))
        send("issueDocument", mapOf("id" to (-document).toString()))
        send("payDocument", mapOf("id" to (-document).toString()))
        assertEquals("Paid locally", store.operations.state.records("documents").first { it.optInt("id") == -document }.getString("status"))
        backend.command(json("type" to "addSupplier", "name" to "Native supplier", "category" to "Food", "description" to "Test supplier", "delivery" to "Collection", "minimum" to 0, "deliveryFee" to 1.25))
        val supplier = store.liveState.records("suppliers").single()
        backend.command(json("type" to "supplierQuote", "id" to supplier.getString("id"), "productId" to product.id, "cost" to 5.5))
        store.operations.command("compareBasket", mapOf(product.id.toString() to "2"))
        val purchase = send("purchaseOrder", mapOf("supplier" to "Native supplier", "fee" to "1.25")).getInt("id")
        assertTrue(store.operations.state.ints("compareCart").isEmpty())
        send("receivePurchaseOrder", mapOf("id" to purchase.toString()))
        assertEquals("Received", store.liveState.records("orders").first { it.optInt("id") == purchase }.getString("status"))
        send("variant", mapOf("parent" to product.id.toString(), "name" to "Small native coffee", "size" to "100 g", "sku" to "VAR-${UUID.randomUUID()}", "price" to "5.25", "stock" to "2"))
        val variant = store.products.first { it.variantOf == product.id }
        send("bundle", mapOf("name" to "Native bundle", "price" to "12.50", "components" to JSONObject(mapOf(product.id.toString() to 1, variant.id.toString() to 1)).toString()))
        assertTrue(store.products.any { it.components.size == 2 })
        val available = store.operations.available(product.id)
        send("batch", mapOf("product" to product.id.toString(), "quantity" to "1", "code" to "EXPIRED-TEST", "expires" to "2020-01-01"))
        assertEquals(available, store.operations.available(product.id))
        val expired = store.operations.state.records("batches").first { it.optString("code") == "EXPIRED-TEST" }
        send("writeOff", mapOf("id" to expired.getInt("id").toString(), "reason" to "Expired native batch"))
        send("shop", mapOf("published" to "true", "name" to "Temporary native shop", "branch" to "main", "fee" to "0"))
        store.operations.command("shopCart", mapOf("product" to product.id.toString(), "quantity" to "1"))
        val order = send("placeOrder", mapOf("customer" to customer.name, "address" to "Collect at shop")).getInt("id")
        assertTrue(store.operations.state.ints("shopCart").isEmpty())
        send("orderStatus", mapOf("id" to order.toString(), "status" to "Confirmed"))
        send("orderStatus", mapOf("id" to order.toString(), "status" to "Packing"))
        send("pack", mapOf("id" to order.toString(), "product" to product.id.toString()))
        send("orderStatus", mapOf("id" to order.toString(), "status" to "Dispatched"))
        send("orderStatus", mapOf("id" to order.toString(), "status" to "Delivered"))
        send("orderPaid", mapOf("id" to order.toString()))
        assertTrue(store.operations.state.records("deliveries").first { it.optInt("id") == order }.getBoolean("paid"))
        assertTrue(store.operations.state.records("movements").isNotEmpty())
        send("rewardRate", mapOf("amount" to "10"))
        assertEquals(1000L, store.operations.state.getLong("rewardRate"))
        send("preferences", mapOf("theme" to "dark", "language" to "en", "textSize" to "115"))
        backend.load(); assertEquals("dark", store.operations.state.objectAt("preferences").getString("theme"))
        val businessId = backend.businessId
        backend.signOut(); assertFalse(backend.authenticated); assertTrue(store.products.isEmpty())
        backend.signIn(email, password); assertEquals(businessId, backend.businessId); assertEquals(imagePath, store.products.first { it.id == product.id }.imagePath)
        assertEquals("dark", store.operations.state.objectAt("preferences").getString("theme"))
    }
}
