package com.biashara.app.ui

import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import com.biashara.app.data.DemoStore
import com.biashara.app.data.json
import com.biashara.app.data.records
import org.json.JSONObject

@Composable
fun LivePaymentSettingsScreen(store: DemoStore, onBack: () -> Unit, onVerify: (company: Boolean) -> Unit) {
    val backend = store.backend
    var settlement by remember { mutableStateOf<JSONObject?>(null) }
    var bankCode by remember { mutableStateOf("") }
    var accountNumber by remember { mutableStateOf("") }
    LaunchedEffect(backend, backend?.role) {
        if (backend?.role == "Owner") backend.action { settlement = backend.paymentSettlement() }
    }

    Page {
        PageTitle("Online payments", onBack = onBack)
        AppText("Connect a Kenyan bank account for settlement from card and M-Pesa payments.")
        if (backend == null || backend.role != "Owner") {
            AppText("Ask the business owner to manage settlement.")
        } else {
            val status = settlement?.optString("status")
            when (status) {
                null -> if (backend.error.isBlank()) AppText("Checking settlement setup…")
                "unavailable" -> AppText("Online payment setup is unavailable.")
                "verification_required" -> {
                    AppText("Complete merchant verification to connect a settlement account.")
                    val company = settlement?.optString("verification") == "company_verification_required"
                    PrimaryButton("Complete verification", { onVerify(company) }, tone = Green)
                }
                "unconnected" -> {
                    val banks = settlement?.records("banks").orEmpty().map { it.getString("code") to it.getString("name") }
                    ToolSelect("Settlement bank", bankCode.ifBlank { "Choose your bank" }, banks) { bankCode = it }
                    OutlinedTextField(
                        accountNumber, { value -> accountNumber = value.filter(Char::isDigit).take(24) },
                        label = { AppText("Bank account number") }, singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                        visualTransformation = PasswordVisualTransformation(),
                    )
                    AppText("Paystack verifies the account. BiasharaOS saves the bank name and last four digits.")
                    PrimaryButton("Connect bank account", {
                        val details = json("bankCode" to bankCode, "accountNumber" to accountNumber)
                        accountNumber = ""
                        backend.action { settlement = backend.paymentSettlement(details) }
                    }, enabled = bankCode.isNotBlank() && accountNumber.length in 6..24 && !backend.busy, tone = Green)
                }
                "pending", "connected" -> {
                    val current = settlement
                    AppText("${current?.optString("bankName")} · ending ${current?.optString("lastFour")}")
                    AppText(if (status == "connected") "Customers can pay delivered orders by card or M-Pesa in My orders."
                        else "Paystack must verify the account before customers can pay online.")
                }
            }
            if (backend.error.isNotBlank()) AppText(backend.error, color = Coral)
            PrimaryButton("Check settlement status", {
                backend.action { settlement = backend.paymentSettlement() }
            }, enabled = !backend.busy, tone = Green)
        }
    }
}
