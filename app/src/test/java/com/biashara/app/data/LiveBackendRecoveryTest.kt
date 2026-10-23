package com.biashara.app.data

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import java.io.IOException
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

internal class MemorySessions : BackendSessionStore {
    private var session: JSONObject? = null
    private var pending: JSONObject? = null
    private var draft: JSONObject? = null
    var failPendingWrite = false
    private fun copy(value: JSONObject?) = value?.let { JSONObject(it.toString()) }
    override fun write(value: JSONObject?) { session = copy(value) }
    override fun read() = copy(session)
    override fun writePending(value: JSONObject?) { if (failPendingWrite) throw IOException("Storage unavailable"); pending = copy(value) }
    override fun readPending() = copy(pending)
    override fun writeDraft(value: JSONObject?) { draft = copy(value) }
    override fun readDraft() = copy(draft)
}

internal fun emptyLiveState(): JSONObject = JSONObject(OPERATIONS_SEED).apply {
    put("profile", json("name" to "Amina", "business" to "Amina shop", "location" to "Nairobi", "email" to "amina@example.com"))
    listOf("products", "customers", "sales", "suppliers", "orders", "expenses", "members").forEach { put(it, JSONArray()) }
    put("operations", DemoStore(real = true).operations.state)
    put("notifications", json()); put("target", 20000)
}

internal class TestBusinessApi : BackendTransport {
    val businessId = "11111111-1111-4111-8111-111111111111"
    var userId = "owner"
    var role = "Owner"
    var state = emptyLiveState()
    var revision = 0L
    var loseNextResponse = false
    var nextError: BackendException? = null
    var onCommand: ((JSONObject) -> Unit)? = null
    val requests = mutableListOf<JSONObject>()
    private val confirmed = mutableSetOf<String>()
    fun workspace() = json("businessId" to businessId, "slug" to "amina", "role" to role, "revision" to revision, "state" to JSONObject(state.toString()))
    override suspend fun request(base: String, path: String, method: String, body: JSONObject?, token: String?, auth: Boolean): JSONObject {
        if (path.startsWith("/auth/v1/token")) return json("access_token" to "test-token", "refresh_token" to "test-refresh", "expires_at" to Long.MAX_VALUE, "user" to json("id" to userId))
        if (method == "GET") return json("workspace" to workspace())
        if (path == "/auth/v1/logout") return json()
        nextError?.let { nextError = null; throw it }
        val request = JSONObject(body.toString()); requests += request
        val duplicate = !confirmed.add(request.getString("requestId"))
        if (!duplicate) { onCommand?.invoke(request.getJSONObject("command")); revision++ }
        if (loseNextResponse) { loseNextResponse = false; throw IOException("Response lost after commit") }
        return json("workspace" to workspace(), "result" to json("id" to 1, "message" to "Saved", "duplicate" to duplicate))
    }
}

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class LiveBackendRecoveryTest {
    private val context get() = ApplicationProvider.getApplicationContext<Context>()

    @Test fun lostResponseSurvivesRestartAndRetriesTheIdenticalRequest() = runBlocking {
        val api = TestBusinessApi(); val vault = MemorySessions(); val store = DemoStore(real = true)
        val backend = LiveBackend(context, this, store, vault, api); store.backend = backend
        backend.signIn("amina@example.com", "password123")
        api.loseNextResponse = true
        try { backend.command(json("type" to "setTarget", "target" to 1000)); fail("The simulated response must be lost") } catch (_: IOException) { }
        assertTrue(backend.hasPending); assertNotNull(vault.readPending())
        val firstRequest = api.requests.single().toString()
        try { backend.command(json("type" to "setTarget", "target" to 2000)); fail("A new command must be blocked") } catch (_: IllegalStateException) { }
        val restoredStore = DemoStore(real = true)
        val restored = LiveBackend(context, this, restoredStore, vault, api)
        restored.start(); yield()
        while (!restored.ready) yield()
        assertTrue(restored.hasPending)
        val result = restored.retryPending()
        assertTrue(result.getBoolean("duplicate")); assertFalse(restored.hasPending)
        assertEquals(firstRequest, api.requests.last().toString())
        assertEquals(1L, api.revision)
        assertEquals("setTarget", restored.confirmedCommand)
        assertNotEquals("", restored.confirmedRequestId)
    }

    @Test fun failedDurableSaveNeverSubmitsARequest() = runBlocking {
        val api = TestBusinessApi(); val vault = MemorySessions(); val store = DemoStore(real = true)
        val backend = LiveBackend(context, this, store, vault, api)
        backend.signIn("amina@example.com", "password123"); vault.failPendingWrite = true
        try { backend.command(json("type" to "setTarget", "target" to 1000)); fail("Storage failure must stop submission") } catch (_: IOException) { }
        assertTrue(api.requests.isEmpty()); assertFalse(backend.hasPending)
    }

    @Test fun refreshPreservesBasketButAnotherAccountDoesNotReceiveIt() = runBlocking {
        val api = TestBusinessApi(); api.state.put("products", JSONArray().put(json("id" to 1, "name" to "Coffee", "size" to "250 g", "sku" to "COF", "category" to "Food", "price" to 10.25, "cost" to 5.5, "stock" to 5, "reorder" to 2, "art" to 0)))
        val vault = MemorySessions(); val store = DemoStore(real = true)
        val backend = LiveBackend(context, this, store, vault, api); store.backend = backend
        backend.signIn("amina@example.com", "password123"); store.add(1)
        store.operations.command("basket", mapOf("discount" to "10"))
        backend.load()
        assertEquals(1, store.cart[1]); assertEquals(10, store.operations.state.optInt("discount"))
        api.userId = "different-account"
        backend.signIn("other@example.com", "password123")
        assertTrue(store.cart.isEmpty()); assertEquals(0, store.operations.state.optInt("discount"))
    }

    @Test fun clientRejectsRoleViolationsBeforeSendingThem() = runBlocking {
        val api = TestBusinessApi(); api.role = "Viewer"
        val backend = LiveBackend(context, this, DemoStore(real = true), MemorySessions(), api)
        backend.signIn("viewer@example.com", "password123")
        try { backend.command(json("type" to "addProduct", "product" to json())); fail("Viewer cannot mutate inventory") } catch (_: IllegalArgumentException) { }
        assertTrue(api.requests.isEmpty())
        backend.command(json("type" to "preferences", "theme" to "dark"))
        assertEquals(1, api.requests.size)
    }

    @Test fun imagePathsAreScopedToOneBusinessAndNeverAcceptUrlsOrTraversal() {
        val business = "11111111-1111-4111-8111-111111111111"
        val path = "$business/22222222-2222-4222-8222-222222222222.jpg"
        assertTrue(productImageBelongsTo(path, business))
        assertFalse(productImageBelongsTo(path, "33333333-3333-4333-8333-333333333333"))
        assertFalse(productImageBelongsTo("$business/../other.jpg", business))
        assertFalse(productImageBelongsTo("https://example.com/photo.jpg", business))
        assertFalse(roleAllows("Cashier", "batch")); assertFalse(roleAllows("Manager", "removeMember")); assertTrue(roleAllows("Cashier", "payBalance"))
    }
}
