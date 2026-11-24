package com.biashara.app.ui

import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Checkbox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalUriHandler
import com.biashara.app.data.DemoStore
import org.json.JSONObject

@Composable
fun LiveVerificationScreen(store: DemoStore, onBack: () -> Unit, company: Boolean = false, onCompany: () -> Unit = {}) {
    val backend = store.backend
    val uriHandler = LocalUriHandler.current
    var result by remember(company) { mutableStateOf<JSONObject?>(null) }
    var consent by remember(company) { mutableStateOf(false) }
    var legalStructure by remember { mutableStateOf("") }
    val structures = listOf("individual" to "Individual or sole proprietor", "registered_entity" to "Company or other registered entity")
    LaunchedEffect(backend, backend?.role, company) {
        if (backend?.role == "Owner") backend.action { result = backend.identityVerification(company = company) }
    }

    val title = if (company) "Kenyan company verification" else "Owner identity verification"
    Page {
        PageTitle(title, onBack = onBack)
        AppText(if (company) "Check a registered company and your authority to act for it."
            else "Declare your legal structure and verify your identity before publishing a shop or connecting payments.")
        if (backend == null || backend.role != "Owner") {
            AppText("Ask the business owner to complete verification.")
        } else {
            val current = result
            when {
                current == null && backend.error.isBlank() -> AppText("Checking verification…")
                current == null -> Unit
                current.optBoolean("needsStructure") -> AppText("Declare your legal structure in Owner identity verification from More first.")
                current.optBoolean("individual") -> AppText("Individual and sole-proprietor businesses complete owner identity verification.")
                current.optString("merchantStatus") == "business_type_required" -> {
                    ToolSelect("Legal structure", structures.firstOrNull { it.first == legalStructure }?.second ?: "Choose your legal structure", structures) { legalStructure = it }
                    AppText("Choose the legal structure you trade under. Contact support if you need to change it later.")
                    PrimaryButton("Confirm legal structure", {
                        backend.action { result = backend.identityVerification("declare", legalStructure = legalStructure) }
                    }, enabled = legalStructure.isNotEmpty() && !backend.busy, tone = Green)
                }
                !current.optBoolean("enabled") -> AppText("$title is unavailable right now.")
                current.optBoolean("requiresOwner") -> AppText("Complete owner identity verification from More first.")
                current.optBoolean("needsSupport") -> AppText("Contact support to update your company verification.")
                current.optBoolean("starting") -> {
                    AppText("Your company session is being prepared. Contact support if this status persists.")
                    PrimaryButton("Reload status", {
                        backend.action { result = backend.identityVerification(company = company) }
                    }, enabled = !backend.busy, tone = Green)
                }
                else -> {
                    val status = if (current.isNull("status")) "" else current.getString("status")
                    val label = if (company) "Didit session" else "Status"
                    AppText("$label · ${status.ifBlank { "Not started" }}")
                    if (status.isBlank() || status in listOf("Expired", "Abandoned", "Kyc Expired")) {
                        AppText(if (company) "For a company, have your Certificate of Incorporation and a current BRS official search (CR12) ready. Other registered entities need their registration evidence. Provide authorization if your role is unclear. Follow the secure submission instructions."
                            else "Didit collects and processes your ID and selfie. BiasharaOS saves your verification reference and status.")
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(checked = consent, onCheckedChange = { consent = it })
                            AppText("I agree to continue to Didit for ${if (company) "company" else "identity"} verification.")
                        }
                        PrimaryButton("Start verification", {
                            backend.action { result = backend.identityVerification("start", company) }
                        }, enabled = consent && !backend.busy, tone = Green)
                    }
                    if (!current.isNull("next")) {
                        PrimaryButton("Continue on Didit", { uriHandler.openUri(current.getString("next")) }, tone = Green)
                    }
                    if (status.isNotBlank()) PrimaryButton("Refresh status", {
                        backend.action { result = backend.identityVerification("refresh", company) }
                    }, enabled = !backend.busy, tone = Green)
                    if (current.optString("merchantStatus") == "company_verification_required") {
                        AppText("Your identity check passed. Complete the company and representative review to activate your shop and payments.")
                        PrimaryButton("Kenyan company verification", onCompany, tone = Green)
                    }
                    if (current.optString("merchantStatus") == "verified") {
                        AppText("Merchant verification passed. You can publish your shop and connect a settlement account.")
                    }
                    if (company && status == "Approved" && !current.optBoolean("kenyaRegistryPassed")) {
                        AppText("The Kenyan registry check needs support review.")
                    }
                    when (current.optString("representativeReview")) {
                        "Pending" -> AppText("The Kenyan registry check passed. A reviewer will check your authority to represent the company.")
                        "Approved" -> AppText("Company and representative verification passed.")
                        "Declined" -> AppText("The representative review was declined. Contact support to request a review.")
                    }
                    if (status == "Declined") AppText("Contact support to ask about the result or request another review.")
                }
            }
            if (backend.error.isNotBlank()) AppText(backend.error)
        }
    }
}
