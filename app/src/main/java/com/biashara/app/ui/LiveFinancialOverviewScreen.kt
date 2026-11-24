package com.biashara.app.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import com.biashara.app.data.DemoStore
import com.biashara.app.data.minorMoney
import java.io.IOException
import java.math.BigDecimal
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

private val ages = mapOf("current" to "Current", "overdue30" to "1–30 days overdue", "overdue60" to "31–60 days overdue",
    "overdue90" to "61–90 days overdue", "overdue91" to "91+ days overdue")
private val reportPeriods = mapOf("Last 7 days" to 7, "Last 30 days" to 30, "Last 90 days" to 90)
private fun JSONObject.amounts(key: String): Map<String, Long> {
    val amounts = optJSONObject(key) ?: return emptyMap()
    return amounts.keys().asSequence().associateWith { amounts.getLong(it) }
}

@Composable
fun LiveFinancialOverviewScreen(store: DemoStore, onBack: () -> Unit, onReconcile: () -> Unit) {
    val backend = store.backend
    val allowed = backend?.role in listOf("Owner", "Manager")
    var period by remember { mutableIntStateOf(30) }
    var report by remember { mutableStateOf<JSONObject?>(null) }
    var notice by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    val resolver = LocalContext.current.contentResolver
    val save = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri ->
        val dashboard = report
        if (uri != null && dashboard != null && allowed) scope.launch {
            notice = try {
                withContext(Dispatchers.IO) {
                    val data = financeRows(dashboard).map { (group, label, amount) ->
                        listOf(group, label, BigDecimal.valueOf(amount, 2).toPlainString(), dashboard.getString("from"), dashboard.getString("through"))
                    }
                    val output = resolver.openOutputStream(uri) ?: throw IOException("File unavailable")
                    output.writeCsv(listOf("Section", "Description", "KES", "From", "Through"), data)
                }
                "Financial summary exported."
            } catch (_: IOException) {
                "Could not save the financial summary."
            } catch (_: SecurityException) {
                "Could not access the selected location."
            }
        }
    }
    fun load(days: Int) {
        backend?.action {
            report = backend.financialOverview(days)
            period = days
        }
    }
    LaunchedEffect(backend, backend?.slug, allowed) { if (allowed) load(30) }

    Page {
        PageTitle("Financial overview", onBack = onBack)
        if (backend == null || !allowed) {
            AppText("An owner or manager can review these figures.")
            return@Page
        }
        val selected = reportPeriods.entries.first { it.value == period }.key
        FilterPills(reportPeriods.keys.toList(), selected, { label -> load(reportPeriods.getValue(label)) })
        if (backend.error.isNotBlank()) AppText(backend.error, color = Coral)
        if (notice.isNotBlank()) AppText(notice)
        val dashboard = report
        if (dashboard == null && backend.error.isBlank()) AppText("Loading financial overview…")
        if (dashboard != null) {
            AppText("${dashboard.getString("from")} to ${dashboard.getString("through")} · Kenya time")
            for ((group, rows) in financeRows(dashboard).groupBy { it.first }) SurfaceCard {
                AppText(group)
                rows.forEach { (_, label, amount) -> AppText("$label · ${minorMoney(amount)}") }
            }
            AppText("Provider-confirmed collections use the provider payment date. Check settlement reconciliation for bank deposits.")
            PrimaryButton("Reconcile settlements", onReconcile, tone = Green)
            PrimaryButton("Export finance summary", { save.launch("financial-overview.csv") }, tone = Green)
        }
    }
}

private fun financeRows(report: JSONObject): List<Triple<String, String, Long>> {
    val inflows = report.amounts("inflows")
    val expenses = report.getLong("expenses")
    val returns = report.getLong("returns")
    val returnedDeposits = report.getLong("returnedDeposits")
    val invoices = report.amounts("receivables")
    val bills = report.amounts("payables")
    return buildList {
        add(Triple("Recorded movement", "Receipts and invoice deposits", inflows.values.sum()))
        add(Triple("Recorded movement", "Expenses", expenses))
        add(Triple("Recorded movement", "Sales returns", returns))
        add(Triple("Recorded movement", "Returned invoice deposits", returnedDeposits))
        add(Triple("Recorded movement", "Net movement", inflows.values.sum() - expenses - returns - returnedDeposits))
        for ((method, amount) in inflows) add(Triple("Receipts by method", method, amount))
        for ((method, amount) in report.amounts("online")) add(Triple("Paystack collections", method, amount))
        for ((bucket, label) in ages) {
            add(Triple("Customer invoices", label, invoices[bucket] ?: 0))
            add(Triple("Supplier bills", label, bills[bucket] ?: 0))
        }
        add(Triple("Customer accounts", "Undated balances", report.getLong("customerBalances")))
    }
}
