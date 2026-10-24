package com.biashara.app.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.biashara.app.BuildConfig
import java.net.HttpURLConnection
import java.net.URL
import java.security.KeyStore
import java.security.MessageDigest
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import kotlin.math.pow
import kotlin.math.roundToLong

data class FundingTerms(val monthly: Long, val total: Long, val cost: Long)
fun compareFundingTerms(principal: Long, months: Int, annualRate: Double, fees: Long): FundingTerms {
    require(principal in 1..1_000_000_000 && months in 1..120 && annualRate.isFinite() && annualRate in 0.0..100.0 && fees in 0..1_000_000_000) { "Enter a positive amount, 1–120 months, an annual rate from 0–100%, and non-negative fees." }
    val rate = annualRate / 1200
    val payment = if (rate == 0.0) principal.toDouble() / months else principal * rate / (1 - (1 + rate).pow(-months))
    val total = (if (rate == 0.0) principal else (payment * months).roundToLong()) + fees
    return FundingTerms(payment.roundToLong(), total, total - principal)
}

fun emptyFundingDraft(email: String = "", phone: String = ""): JSONObject = json("country" to "KE", "amount" to "", "purpose" to "Stock", "months" to "6", "monthlyRevenue" to "", "monthlyCosts" to "", "monthlyDebtPayments" to "0", "tradingYears" to "", "registrationNumber" to "", "contactEmail" to email, "contactPhone" to phone, "plan" to "", "consent" to false)
fun fundingStatus(status: String) = when (status) { "submitted" -> "Recorded · provider pending"; "withdrawn" -> "Withdrawn"; else -> "Draft" }

interface FundingPendingStore {
    fun read(): JSONObject?
    fun write(value: JSONObject?)
}

fun interface FundingTransport {
    suspend fun request(businessId: String, body: JSONObject?): JSONObject
}

/** Production recovery records use a non-exportable Android Keystore key. */
private class SecureFundingPendingStore(context: Context, accountId: String, businessId: String) : FundingPendingStore {
    private val prefs = context.getSharedPreferences("biashara_funding", Context.MODE_PRIVATE)
    private val scopeKey = MessageDigest.getInstance("SHA-256").digest("$accountId:$businessId".toByteArray()).joinToString("") { "%02x".format(it) }
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        return store.getKey("biashara-funding", null) as? SecretKey ?: KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder("biashara-funding", KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }
    override fun write(value: JSONObject?) {
        if (value == null) { check(prefs.edit().remove(scopeKey).commit()) { "Saved, but the recovery record could not be cleared. Retry safely." }; return }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()) }
        val bytes = cipher.doFinal(value.toString().toByteArray())
        check(prefs.edit().putString(scopeKey, Base64.encodeToString(cipher.iv + bytes, Base64.NO_WRAP)).commit()) { "Could not securely retain this funding request. No request was sent." }
    }
    override fun read(): JSONObject? {
        val encoded = prefs.getString(scopeKey, null) ?: return null
        try {
            val bytes = Base64.decode(encoded, Base64.NO_WRAP)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(0,12))) }
            return JSONObject(String(cipher.doFinal(bytes.copyOfRange(12,bytes.size))))
        } catch (_: Exception) { error("The unconfirmed funding request could not be recovered. Review your requests or contact support before recording it again.") }
    }
}

/** One durable request per account/business; its ID is reused after a lost response. */
class FundingRepository(
    context: Context,
    private val backend: LiveBackend,
    private val pendingStore: FundingPendingStore = SecureFundingPendingStore(context, backend.accountId, backend.businessId),
    private val transport: FundingTransport? = null,
) {
    private val businessId = backend.businessId
    private val accountId = backend.accountId
    private fun checkAccount() {
        check(accountId.isNotBlank() && backend.authenticated && backend.hasBusiness && backend.role == "Owner" && backend.businessId == businessId && backend.accountId == accountId) { "Only the signed-in business owner can access these funding requests." }
    }
    fun pending(): JSONObject? {
        checkAccount()
        return pendingStore.read()?.also { check(it.optString("businessId") == businessId) { "This funding recovery record belongs to a different business. Contact support before recording it again." } }
    }
    private suspend fun request(body: JSONObject? = null): JSONObject {
        checkAccount()
        transport?.let { return it.request(businessId, body) }
        val token = backend.imageAccessToken()
        checkAccount()
        return withContext(Dispatchers.IO) {
            val connection = URL(BuildConfig.API_URL + "/api/funding?businessId=" + businessId).openConnection() as HttpURLConnection
            try {
                connection.connectTimeout = 15000; connection.readTimeout = 30000
                connection.setRequestProperty("Authorization", "Bearer $token")
                connection.setRequestProperty("Accept", "application/json")
                if (body != null) {
                    connection.requestMethod = "POST"; connection.doOutput = true
                    connection.setRequestProperty("Content-Type", "application/json")
                    connection.outputStream.use { it.write(body.toString().toByteArray()) }
                }
                val status = connection.responseCode
                val text = (if (status in 200..299) connection.inputStream else connection.errorStream)?.bufferedReader()?.use { it.readText() }.orEmpty()
                val response = runCatching { JSONObject(text) }.getOrElse { JSONObject() }
                if (status !in 200..299) throw BackendException(response.optString("error").ifBlank { "Funding service unavailable. Please retry." },status)
                response
            } finally { connection.disconnect() }
        }
    }
    suspend fun load() = request().also { checkAccount() }
    suspend fun save(id: String, revision: Long, action: String, payload: JSONObject): JSONObject {
        check(pending() == null) { "Retry the unconfirmed funding request before making another change." }
        val body = json("businessId" to businessId, "id" to id, "revision" to revision, "requestId" to UUID.randomUUID().toString(), "action" to action, "payload" to payload)
        pendingStore.write(body)
        return send(body)
    }
    suspend fun retry() = send(pending() ?: error("There is no funding request to retry."))
    private suspend fun send(body: JSONObject): JSONObject {
        try { val result = request(body); checkAccount(); pendingStore.write(null); return result }
        catch (e: BackendException) { if (e.status in 400..499) pendingStore.write(null); throw e }
    }
}
