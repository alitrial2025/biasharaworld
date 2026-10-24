package com.biashara.app.data

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import java.io.IOException
import java.util.UUID
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

internal class MemoryFundingPendingStore : FundingPendingStore {
    private var value: JSONObject? = null
    var failWrites = false
    override fun read() = value?.let { JSONObject(it.toString()) }
    override fun write(value: JSONObject?) {
        if (failWrites) throw IOException("Storage unavailable")
        this.value = value?.let { JSONObject(it.toString()) }
    }
}

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class FundingRecoveryTest {
    private val context get() = ApplicationProvider.getApplicationContext<Context>()

    @Test fun lostFundingResponseSurvivesRestartAndKeepsItsOriginalId() = runBlocking {
        val backend = LiveBackend(context, this, DemoStore(real = true), MemorySessions(), TestBusinessApi())
        backend.signIn("amina@example.com", "password123")
        val pending = MemoryFundingPendingStore()
        val requests = mutableListOf<String>()
        val ledger = mutableMapOf<String, JSONObject>()
        var loseResponse = true
        val service = FundingTransport { _, body ->
            val request = body!!
            requests += request.toString()
            val result = ledger.getOrPut(request.getString("requestId")) {
                json("application" to json("id" to request.getString("id"), "revision" to 1, "status" to "draft"))
            }
            if (loseResponse) { loseResponse = false; throw IOException("Response lost after commit") }
            result
        }
        val first = FundingRepository(context, backend, pending, service)
        try { first.save(UUID.randomUUID().toString(), 0, "save", emptyFundingDraft()); fail("Response must be lost") } catch (_: IOException) { }
        assertNotNull(first.pending())
        try { first.save(UUID.randomUUID().toString(), 0, "save", emptyFundingDraft()); fail("Another request must stay blocked") } catch (_: IllegalStateException) { }
        val restored = FundingRepository(context, backend, pending, service)
        assertEquals("draft", restored.retry().getJSONObject("application").getString("status"))
        assertEquals(2, requests.size)
        assertEquals(requests.first(), requests.last())
        assertEquals(1, ledger.size)
        assertNull(restored.pending())
    }

    @Test fun fundingNeedsDurableStorageAndDoesNotImportAnotherBusinessRecoveryRecord() = runBlocking {
        val backend = LiveBackend(context, this, DemoStore(real = true), MemorySessions(), TestBusinessApi())
        backend.signIn("amina@example.com", "password123")
        val pending = MemoryFundingPendingStore()
        var requests = 0
        val repository = FundingRepository(context, backend, pending, FundingTransport { _, _ -> requests++; json() })
        pending.failWrites = true
        try { repository.save(UUID.randomUUID().toString(), 0, "save", emptyFundingDraft()); fail("No request may be sent without durable recovery") } catch (_: IOException) { }
        assertEquals(0, requests)
        pending.failWrites = false
        pending.write(json("businessId" to "another-business", "requestId" to UUID.randomUUID().toString()))
        try { repository.retry(); fail("A foreign pending request must be rejected") } catch (_: IllegalStateException) { }
        assertEquals(0, requests)
    }

    @Test fun aDifferentAccountCannotReuseTheRepositoryEvenWithTheSameEmailLabel() = runBlocking {
        val api = TestBusinessApi()
        val backend = LiveBackend(context, this, DemoStore(real = true), MemorySessions(), api)
        backend.signIn("same-label@example.com", "password123")
        val originalId = backend.accountId
        val originalEmail = backend.accountEmail
        var requests = 0
        val repository = FundingRepository(context, backend, MemoryFundingPendingStore(), FundingTransport { _, _ -> requests++; json() })
        backend.signOut()
        api.userId = "different-owner"
        backend.signIn("same-label@example.com", "password123")
        assertEquals(originalEmail, backend.accountEmail)
        assertNotEquals(originalId, backend.accountId)
        try { repository.load(); fail("A previous account's repository must not be usable") } catch (_: IllegalStateException) { }
        assertEquals(0, requests)
    }
}
