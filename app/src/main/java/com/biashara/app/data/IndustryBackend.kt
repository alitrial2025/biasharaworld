package com.biashara.app.data

import android.content.Context
import com.biashara.app.BuildConfig
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import org.json.JSONArray
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

fun interface IndustryTransport { suspend fun request(businessId: String, body: JSONObject?, cursor: String?): JSONObject }

/** Account/business scoped encrypted retry journal. The same request id survives a lost response. */
class IndustryRepository(context: Context, private val backend: LiveBackend,
    private val pendingStore: FundingPendingStore = SecureFundingPendingStore(context, backend.accountId, backend.businessId, "industry"),
    private val transport: IndustryTransport? = null) {
    private val businessId = backend.businessId
    private val accountId = backend.accountId
    private fun checkAccount() { check(backend.authenticated && backend.businessId == businessId && backend.accountId == accountId && accountId.isNotBlank()) { "Sign in to the same business to recover this request." } }
    fun pending(): JSONObject? { checkAccount(); return pendingStore.read()?.also { check(it.optString("businessId") == businessId) { "This request belongs to another business." } } }
    private suspend fun request(body: JSONObject? = null, cursor: String? = null): JSONObject {
        checkAccount()
        transport?.let { return it.request(businessId, body, cursor) }
        val token = backend.imageAccessToken()
        checkAccount()
        return withContext(Dispatchers.IO) {
            val connection = URL(BuildConfig.API_URL + "/api/industry?businessId=$businessId" + (cursor?.let { "&cursor=" + URLEncoder.encode(it, "UTF-8") } ?: "")).openConnection() as HttpURLConnection
            try {
                connection.connectTimeout = 15000; connection.readTimeout = 30000
                connection.setRequestProperty("Authorization", "Bearer $token"); connection.setRequestProperty("Accept", "application/json")
                if (body != null) { connection.requestMethod = "POST"; connection.doOutput = true; connection.setRequestProperty("Content-Type", "application/json"); connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) } }
                val status = connection.responseCode
                val raw = (if (status in 200..299) connection.inputStream else connection.errorStream)?.bufferedReader()?.use { it.readText() }.orEmpty()
                val result = runCatching { JSONObject(raw) }.getOrElse { JSONObject() }
                if (status !in 200..299) throw BackendException(result.optString("error").ifBlank { "Could not save this record. Retry the saved request." }, status)
                result
            } finally { connection.disconnect() }
        }
    }
    suspend fun load(): JSONObject {
        var page = request()
        val metadata = JSONObject(page.toString())
        val records = linkedMapOf<String, JSONObject>()
        val visited = mutableSetOf<String>()
        while (true) {
            if (page.optJSONObject("access")?.optBoolean("featuresUnlocked", true) == false) return page.put("records", JSONArray()).put("nextCursor", JSONObject.NULL)
            page.optJSONArray("records")?.let { values -> (0 until values.length()).forEach { index -> val record = values.getJSONObject(index); records[record.getString("id")] = record } }
            val cursor = page.optString("nextCursor").takeUnless { it.isBlank() || it == "null" } ?: break
            check(visited.add(cursor)) { "The record list changed while loading. Refresh and try again." }
            page = request(cursor = cursor)
        }
        return metadata.put("records", JSONArray(records.values.toList())).put("nextCursor", JSONObject.NULL)
    }
    suspend fun save(action: String, id: String, revision: Long, record: JSONObject? = null, status: String? = null, payment: JSONObject? = null): JSONObject {
        checkAccount(); check(pending() == null) { "Retry the unconfirmed request before making another change." }
        val body = json("businessId" to businessId, "id" to id, "revision" to revision, "requestId" to UUID.randomUUID().toString(), "action" to action)
        record?.let { body.put("record", it) }; status?.let { body.put("status", it) }; payment?.let { body.put("payment", it) }
        pendingStore.write(body)
        return retry()
    }
    suspend fun retry(): JSONObject {
        val body = pending() ?: error("There is no saved request.")
        try { val result = request(body); pendingStore.write(null); return result }
        catch (error: BackendException) { if (error.status in listOf(400, 403, 404, 409, 422)) pendingStore.write(null); throw error }
    }
}
