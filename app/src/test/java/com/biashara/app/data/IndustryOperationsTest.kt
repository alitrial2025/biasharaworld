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

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class IndustryOperationsTest {
    private val context get() = ApplicationProvider.getApplicationContext<Context>()
    @Test fun everySectorHasIndependentValidatableWorkflowsAndLegacyLabelsResolve() {
        val catalog = industryCatalog(context)
        assertEquals(20, catalog.size)
        assertEquals(60, catalog.sumOf { it.workflows.size })
        assertEquals(20, catalog.map { it.id }.toSet().size)
        assertEquals("wholesale", resolveIndustry(catalog, "Wholesale").id)
        assertEquals("retail", resolveIndustry(catalog, "Retail shop").id)
        catalog.forEach { industry ->
            assertTrue(industry.recommendedTools.isNotEmpty())
            assertEquals(3, industry.workflows.map { it.id }.toSet().size)
            industry.workflows.forEach { workflow ->
                val fields = JSONObject()
                workflow.fields.forEach { field ->
                    if (field.required) assertNotNull(industryFieldError(field, ""))
                    val value = when (field.type) { "number" -> (field.min ?: 1.0).toString(); "date" -> "2099-12-31"; "datetime" -> "2099-12-31T12:00"; "select" -> field.options.first(); else -> "Sample operational reference" }
                    assertNull("${industry.id}/${workflow.id}/${field.key}", industryFieldError(field, value))
                    fields.put(field.key, value)
                }
                val record = industryRecordInput(industry, workflow, "Customer job", "Customer", fields, "10.25")
                assertEquals(1025, record.getInt("amountMinor"))
                assertEquals(industry.id, record.getString("industryId"))
                assertTrue(record.getString("status") in workflow.statuses)
            }
        }
    }
    @Test fun invalidDatesNumbersOptionsAndMoneyDoNotPassClientValidation() {
        val date = IndustryField("date", "Booking date", "date", true, emptyList(), null, null)
        assertNotNull(industryFieldError(date, "2026-02-30"))
        assertNotNull(industryFieldError(date.copy(type = "datetime"), "2026-10-24 12:00"))
        assertNotNull(industryFieldError(date.copy(type = "number", min = 0.0, max = 10.0), "11"))
        assertNotNull(industryFieldError(date.copy(type = "select", options = listOf("Available")), "Other"))
        assertEquals(1_000_000_000_000L, parseIndustryMinor("10000000000"))
        try { parseIndustryMinor("1.999"); fail("Fractional cents must be rejected") } catch (_: IllegalArgumentException) { }
    }
    @Test fun missingOrDraftAccessLocksWorkingFeaturesButRetainsRecoverySettings() = runBlocking {
        val api = TestBusinessApi().apply { access = null }
        val store = DemoStore(real = true); val backend = LiveBackend(context, this, store, MemorySessions(), api); store.backend = backend
        backend.signIn("owner@example.com", "password123")
        assertFalse(backend.featuresUnlocked); assertFalse(store.canPerform("checkout")); assertTrue(store.canPerform("preferences")); assertTrue(store.canPerform("updateProfile"))
        api.access = json("featuresUnlocked" to false, "verificationStatus" to "draft")
        backend.load(); assertFalse(backend.featuresUnlocked)
        api.access = json("featuresUnlocked" to true, "verificationStatus" to "submitted", "identityStatus" to "provider_pending")
        backend.load(); assertTrue(backend.featuresUnlocked); assertTrue(store.canPerform("checkout"))
        backend.signOut(); assertFalse(backend.featuresUnlocked)
    }
    @Test fun aLostResponseIsRecoveredWithAnIdenticalRequestAndCannotDuplicateTheRecord() = runBlocking {
        val backend = LiveBackend(context, this, DemoStore(real = true), MemorySessions(), TestBusinessApi())
        backend.signIn("owner@example.com", "password123")
        val pending = MemoryFundingPendingStore(); val seen = mutableListOf<String>(); val committed = mutableSetOf<String>(); var lose = true
        val transport = IndustryTransport { _, body, _ ->
            seen += body.toString(); committed += body!!.getString("requestId")
            if (lose) { lose = false; throw IOException("Response lost") }
            json("record" to json("id" to body.getString("id"), "revision" to 1))
        }
        val repository = IndustryRepository(context, backend, pending, transport)
        try { repository.save("create", UUID.randomUUID().toString(), 0, json("title" to "Job")); fail("Response must be lost") } catch (_: IOException) { }
        assertNotNull(repository.pending())
        try { repository.save("create", UUID.randomUUID().toString(), 0); fail("Another save must be blocked") } catch (_: IllegalStateException) { }
        val restored = IndustryRepository(context, backend, pending, transport)
        restored.retry()
        assertNull(restored.pending()); assertEquals(seen.first(), seen.last()); assertEquals(1, committed.size)
    }
    @Test fun loadingFollowsOpaqueCursorsAndKeepsAllOlderRecords() = runBlocking {
        val backend = LiveBackend(context, this, DemoStore(real = true), MemorySessions(), TestBusinessApi())
        backend.signIn("owner@example.com", "password123")
        val seen = mutableListOf<String?>()
        val repository = IndustryRepository(context, backend, MemoryFundingPendingStore(), IndustryTransport { _, body, cursor ->
            assertNull(body); seen += cursor
            json("records" to org.json.JSONArray().put(json("id" to if (cursor == null) "newer" else "older")), "nextCursor" to if (cursor == null) "opaque+/=" else JSONObject.NULL)
        })
        assertEquals(2, repository.load().getJSONArray("records").length())
        assertEquals(listOf(null, "opaque+/="), seen)
    }
    @Test fun journalStorageAndAccountOwnershipAreRequiredBeforeSending() = runBlocking {
        val api = TestBusinessApi(); val backend = LiveBackend(context, this, DemoStore(real = true), MemorySessions(), api)
        backend.signIn("owner@example.com", "password123")
        var sent = 0; val pending = MemoryFundingPendingStore(); val repository = IndustryRepository(context, backend, pending, IndustryTransport { _, _, _ -> sent++; json() })
        pending.failWrites = true
        try { repository.save("create", UUID.randomUUID().toString(), 0); fail("Durable write must succeed first") } catch (_: IOException) { }
        assertEquals(0, sent)
        pending.failWrites = false; backend.signOut(); api.userId = "another-owner"; backend.signIn("owner@example.com", "password123")
        try { repository.load(); fail("Cross-account repository must be rejected") } catch (_: IllegalStateException) { }
        assertEquals(0, sent)
    }
}
