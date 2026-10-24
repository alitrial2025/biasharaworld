package com.biashara.app.data

import com.biashara.app.BuildConfig
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

fun emptyVerificationProfile(name: String = "", email: String = "") = json(
    "legalName" to "", "tradingName" to "", "contactName" to name, "phone" to "", "email" to email,
    "country" to "KE", "businessType" to "Retail shop", "businessAddress" to "", "registrationStatus" to "unregistered",
    "registrationNumber" to "", "yearsTrading" to 0, "employees" to 1, "revenueBand" to "prefer_not_to_say",
    "tools" to JSONArray(listOf("Sales", "Stock")), "declaration" to false,
)

fun verificationMissing(profile: JSONObject): List<String> = buildList {
    if (profile.optString("country") != "KE") add("Kenya launch country")
    listOf("legalName" to "Legal business or owner name", "tradingName" to "Business name", "contactName" to "Owner contact name", "phone" to "Contact phone", "email" to "Contact email", "businessAddress" to "Business address", "businessType" to "Business sector").forEach { (key, label) -> if (profile.optString(key).isBlank()) add(label) }
    if (!validEmail(profile.optString("email"))) add("Valid contact email")
    val phone = profile.optString("phone")
    if (phone.isNotBlank() && (!Regex("\\+?[\\d\\s().-]{7,30}").matches(phone) || phone.count { it.isDigit() } !in 7..15)) add("Valid contact phone")
    if (profile.optString("registrationStatus") == "registered" && profile.optString("registrationNumber").isBlank()) add("Business registration number")
    if (!profile.optBoolean("declaration")) add("Owner declaration")
}

private suspend fun LiveBackend.verificationRequest(method: String, profile: JSONObject? = null, submit: Boolean = false): JSONObject {
    check(role == "Owner") { "Only the business owner can access verification details." }
    check(businessId.isNotBlank()) { "Create your business first." }
    val access = imageAccessToken()
    val business = businessId
    return withContext(Dispatchers.IO) {
        val connection = URL(BuildConfig.API_URL + "/api/verification?businessId=$business").openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = 15000; connection.readTimeout = 30000
            connection.setRequestProperty("Authorization", "Bearer $access")
            connection.setRequestProperty("Accept", "application/json")
            if (profile != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json")
                connection.outputStream.use { it.write(json("businessId" to business, "profile" to profile, "submit" to submit).toString().toByteArray(Charsets.UTF_8)) }
            }
            val status = connection.responseCode
            val raw = (if (status in 200..299) connection.inputStream else connection.errorStream)?.bufferedReader()?.use { it.readText() }.orEmpty()
            val result = runCatching { JSONObject(raw) }.getOrElse { JSONObject() }
            if (status !in 200..299) throw BackendException(result.optString("error").ifBlank { "Could not save verification readiness. Please retry." }, status)
            result
        } finally { connection.disconnect() }
    }
}
suspend fun LiveBackend.getVerification() = verificationRequest("GET")
suspend fun LiveBackend.saveVerification(profile: JSONObject, submit: Boolean = false): JSONObject {
    if (submit) require(verificationMissing(profile).isEmpty()) { "Complete: ${verificationMissing(profile).joinToString(", ")}." }
    return verificationRequest("PUT", profile, submit)
}
suspend fun LiveBackend.clearVerification() = verificationRequest("DELETE")
