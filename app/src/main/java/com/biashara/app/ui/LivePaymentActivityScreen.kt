package com.biashara.app.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import com.biashara.app.data.DemoStore
import com.biashara.app.data.minorMoney
import com.biashara.app.data.records
import java.io.IOException
import java.math.BigDecimal
import org.json.JSONObject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val statuses = listOf("all" to "All payments", "pending" to "Pending confirmation", "confirmed" to "Confirmed")
private fun paymentMethod(entry: JSONObject) = when (entry.optString("channel")) {
    "card" -> "Card"
    "mobile_money" -> "M-Pesa"
    "bank_transfer" -> "Bank transfer"
    else -> ""
}
private fun paymentStatus(entry: JSONObject) =
    if (entry.isNull("paid_at")) "Pending confirmation" else "Payment confirmed"

@Composable
fun LivePaymentActivityScreen(store: DemoStore, onBack: () -> Unit, onReconcile: () -> Unit) {
    val backend = store.backend
    val allowed = backend?.role in listOf("Owner", "Manager")
    var draftStatus by remember { mutableStateOf("all") }
    var draftOrder by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("all") }
    var order by remember { mutableStateOf("") }
    var pages by remember { mutableStateOf(emptyList<Int>()) }
    var activity by remember { mutableStateOf<JSONObject?>(null) }
    var exportMessage by remember { mutableStateOf("") }
    val entries = activity?.records("entries").orEmpty()
    val next = activity?.optInt("next")?.takeIf { it > 0 }
    val resolver = LocalContext.current.contentResolver
    val scope = rememberCoroutineScope()
    val export = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri ->
        if (uri != null && allowed) scope.launch {
            exportMessage = try {
                withContext(Dispatchers.IO) {
                    val header = listOf("Order", "Reference", "Gross KES", "Channel", "Status", "Receipt", "Created (UTC)", "Confirmed (UTC)")
                    val rows = entries.map { entry ->
                        listOf(entry.getString("order_id"), entry.getString("reference"),
                            BigDecimal.valueOf(entry.getLong("amount_minor"), 2).toPlainString(),
                            paymentMethod(entry), paymentStatus(entry),
                            if (entry.isNull("receipt_id")) "" else entry.getString("receipt_id"),
                            entry.getString("created_at"), if (entry.isNull("paid_at")) "" else entry.getString("paid_at"))
                    }
                    val file = resolver.openOutputStream(uri) ?: throw IOException("File could not be opened")
                    file.writeCsv(header, rows)
                }
                "Payment activity exported."
            } catch (_: IOException) {
                "Could not save the payment activity file."
            } catch (_: SecurityException) {
                "Could not write to the selected location."
            }
        }
    }

    fun load(selectedStatus: String, selectedOrder: String, selectedPages: List<Int>) {
        backend?.action {
            activity = backend.paymentActivity(selectedStatus, selectedOrder, selectedPages.lastOrNull())
            status = selectedStatus
            order = selectedOrder
            pages = selectedPages
        }
    }

    LaunchedEffect(backend, backend?.slug, allowed) {
        if (allowed) load("all", "", emptyList())
    }

    Page {
        PageTitle("Payment activity", onBack = onBack)
        if (backend == null || !allowed) {
            AppText("Ask an owner or manager to review payment activity.")
            return@Page
        }
        AppText("Compare confirmed gross payments with the provider settlement report and bank statement.")
        PrimaryButton("Reconcile settlements", onReconcile, tone = Green)
        ToolSelect("Payment status", draftStatus, statuses) { draftStatus = it }
        OutlinedTextField(
            value = draftOrder,
            onValueChange = { draftOrder = it.filter { digit -> digit in '0'..'9' }.take(10) },
            label = { AppText("Order number") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            singleLine = true,
        )
        val validOrder = draftOrder.isBlank() || (draftOrder.toLongOrNull() ?: 0L) in 1L..1_000_000_000L
        PrimaryButton("Filter payments", { load(draftStatus, draftOrder, emptyList()) }, enabled = validOrder && !backend.busy, tone = Green)
        PrimaryButton("Export this page", { export.launch("online-payments.csv") }, enabled = entries.isNotEmpty() && !backend.busy, tone = Green)
        if (exportMessage.isNotBlank()) AppText(exportMessage)
        if (backend.error.isNotBlank()) AppText(backend.error, color = Coral)
        if (activity == null && backend.error.isBlank()) AppText("Loading payment activity…")
        if (activity != null && entries.isEmpty()) EmptyState("No matching payments", "Try a different status or order number.")
        for (entry in entries) {
            val id = entry.getInt("order_id")
            SurfaceCard {
                AppText("Order #$id · ${minorMoney(entry.getLong("amount_minor"))}")
                AppText(entry.getString("reference"))
                AppText(listOf(paymentStatus(entry), paymentMethod(entry)).filter(String::isNotEmpty).joinToString(" · "))
                if (!entry.isNull("receipt_id")) AppText("Receipt #${entry.getInt("receipt_id")}")
                if (entry.isNull("paid_at")) {
                    PrimaryButton("Check provider", {
                        backend.action {
                            backend.checkOnlinePayment(id)
                            activity = backend.paymentActivity(status, order, pages.lastOrNull())
                        }
                    }, enabled = !backend.busy, tone = Green)
                }
            }
        }
        if (pages.isNotEmpty()) PrimaryButton("Previous page", { load(status, order, pages.dropLast(1)) }, enabled = !backend.busy, tone = Green)
        if (next != null) PrimaryButton("Next page", { load(status, order, pages + next) }, enabled = !backend.busy, tone = Green)
    }
}
