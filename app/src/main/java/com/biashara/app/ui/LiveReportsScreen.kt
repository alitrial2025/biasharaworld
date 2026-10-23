package com.biashara.app.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.biashara.app.data.*
import java.time.LocalDate
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun LiveReportsScreen(store: DemoStore, onBack: () -> Unit, expensesOnly: Boolean = false) {
    var period by rememberSaveable { mutableStateOf("Today") }
    var adding by rememberSaveable { mutableStateOf(false) }
    var removing by remember { mutableStateOf<org.json.JSONObject?>(null) }
    var exportError by remember { mutableStateOf("") }
    var exporting by remember { mutableStateOf(false) }
    var exportData by remember { mutableStateOf("") }
    val days = when (period) { "Week" -> 7; "Month" -> 30; else -> 1 }
    val report = store.report(days)
    val start = LocalDate.parse(todayLocal()).minusDays(days.toLong() - 1).toString()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val exporter = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri ->
        if (uri != null) scope.launch {
            exporting = true
            try { withContext(Dispatchers.IO) { context.contentResolver.openOutputStream(uri)?.use { it.write(exportData.toByteArray(Charsets.UTF_8)) } ?: error("Could not open the chosen file.") }; exportError = "" }
            catch (e: Exception) { exportError = e.message ?: "Could not export this report." }
            finally { exporting = false }
        }
    }
    Page {
        PageTitle(if (expensesOnly) "Expenses" else "Business Reports", onBack = onBack)
        FilterPills(listOf("Today", "Week", "Month"), period, { period = it })
        AppText("${store.operations.branchName} · $start to ${todayLocal()}", color = Muted)
        if (!expensesOnly) {
            SurfaceCard { Eyebrow("Recorded net sales"); AppText(minorMoney(report.sales), style = MaterialTheme.typography.headlineLarge); SalesChart(bars = days == 1, series = report.series) }
            SurfaceCard { Eyebrow("Operating profit"); AppText(minorMoney(report.profit), style = MaterialTheme.typography.headlineMedium); AppText("Sales less recorded item costs, refunds and business expenses.", color = Muted) }
            SurfaceCard { Eyebrow("Transactions"); AppText(report.receipts.size.toString()); AppText("Average sale: " + minorMoney(if (report.receipts.isEmpty()) 0 else report.sales / report.receipts.size)); AppText("Refunds: ${minorMoney(report.refunds)}") }
        }
        SurfaceCard { Eyebrow("Expenses"); AppText(minorMoney(report.expenses), style = MaterialTheme.typography.headlineMedium); AppText("Expenses are recorded for the whole business.", color = Muted) }
        if (store.canPerform("addExpense")) PrimaryButton("Record expense", { adding = true }, enabled = store.canSave, tone = Green)
        val expenses = store.liveState.records("expenses").filter { it.optString("date") in start..todayLocal() }.sortedByDescending { it.optString("date") }
        if (expenses.isEmpty()) EmptyState("No expenses in this period", "Recorded expenses will appear here.")
        expenses.forEach { e -> SurfaceCard(Modifier.clickable(enabled = store.canPerform("removeExpense")) { removing = e }) {
            AppText(e.optString("name"), style = MaterialTheme.typography.titleMedium)
            AppText("${e.optString("category")} · ${e.optString("method")} · ${e.optString("date")}", color = Muted)
            AppText(minorMoney(kotlin.math.round(e.optDouble("amount") * 100).toLong()))
            if (store.canPerform("removeExpense")) AppText("Tap to review or remove", color = Muted)
        } }
        if (exportError.isNotBlank()) AppText(exportError, color = Coral)
        PrimaryButton(if (exporting) "Exporting…" else "Export CSV", { exportData = store.reportCsv(days); exporter.launch("BiasharaOS-${todayLocal()}-$period.csv") }, enabled = !exporting, tone = Green)
    }
    if (adding) ExpenseEditorSheet(store) { adding = false }
    removing?.let { expense -> CloseSheetAfterSave(store) { removing = null }; ActionSheet(onDismissRequest = { removing = null }, title = { AppText("Remove expense?", style = MaterialTheme.typography.headlineSmall) }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) { AppText(expense.optString("name")); AppText("${expense.optString("date")} · ${minorMoney(kotlin.math.round(expense.optDouble("amount") * 100).toLong())}"); AppText("Removing this record updates your expense and profit totals.", color = Muted); BusinessFormStatus(store) }
    }, confirmButton = { PrimaryButton("Remove expense", { store.backend?.perform("removeExpense", mapOf("id" to expense.optInt("id").toString())) { removing = null } }, enabled = store.canSave, tone = Coral) }, dismissButton = { TextButton(onClick = { removing = null }) { AppText("Keep expense") } }) }
}

@Composable
private fun ExpenseEditorSheet(store: DemoStore, onClose: () -> Unit) {
    CloseSheetAfterSave(store, onClose)
    var name by rememberSaveable { mutableStateOf("") }
    var amount by rememberSaveable { mutableStateOf("") }
    var category by rememberSaveable { mutableStateOf("Other") }
    var method by rememberSaveable { mutableStateOf("Cash") }
    var date by rememberSaveable { mutableStateOf(todayLocal()) }
    ActionSheet(onDismissRequest = onClose, title = { AppText("Record expense", style = MaterialTheme.typography.headlineSmall) }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(name, { name = it }, label = { AppText("Expense name") }, modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            OutlinedTextField(amount, { amount = it }, label = { AppText("Amount (KES)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            SheetChoice("Category", category, listOf("Rent", "Transport", "Utilities", "Wages", "Supplies", "Other").map { it to it }) { category = it }
            SheetChoice("Payment method", method, listOf("Cash", "M-Pesa", "Card", "Bank transfer").map { it to it }) { method = it }
            OutlinedTextField(date, { date = it }, label = { AppText("Date (YYYY-MM-DD)") }, modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            BusinessFormStatus(store)
        }
    }, confirmButton = { PrimaryButton("Save expense", {
        store.backend?.action {
            val minor = parseMinor(amount); require(minor > 0) { "Enter a positive amount." }
            require(runCatching { LocalDate.parse(date); true }.getOrDefault(false)) { "Enter a valid date in YYYY-MM-DD format." }
            store.backend?.command(json("type" to "addExpense", "expense" to json("name" to requiredInput(name, "an expense name"), "category" to category, "amount" to minor / 100.0, "date" to date, "method" to method)))
            onClose()
        }
    }, enabled = store.canSave && name.isNotBlank() && amount.isNotBlank(), tone = Green) }, dismissButton = { TextButton(onClick = onClose) { AppText("Cancel") } })
}
