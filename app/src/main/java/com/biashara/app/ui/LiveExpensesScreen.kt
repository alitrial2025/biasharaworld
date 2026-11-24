package com.biashara.app.ui

import android.app.DatePickerDialog
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.biashara.app.data.DemoStore
import com.biashara.app.data.json
import com.biashara.app.data.minorMoney
import com.biashara.app.data.parseMinor
import com.biashara.app.data.records
import com.biashara.app.data.todayLocal
import java.io.IOException
import java.math.BigDecimal
import java.time.LocalDate
import kotlin.math.roundToLong
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val expenseCategories = listOf("Transport", "Utilities", "Supplies", "Rent", "Wages", "Other")
private val expenseMethods = listOf("M-Pesa", "Cash", "Bank transfer")

@Composable
fun LiveExpensesScreen(store: DemoStore, onBack: () -> Unit) {
    val backend = store.backend
    val canManage = backend?.role in listOf("Owner", "Manager")
    val expenses = store.liveState.records("expenses")
    var search by rememberSaveable { mutableStateOf("") }
    var adding by rememberSaveable { mutableStateOf(false) }
    var removalId by rememberSaveable { mutableStateOf<Int?>(null) }
    var exportMessage by rememberSaveable { mutableStateOf("") }
    val visibleExpenses = expenses.filter { expense ->
        expense.optString("name").contains(search.trim(), ignoreCase = true) ||
            expense.optString("category").contains(search.trim(), ignoreCase = true)
    }
    val resolver = LocalContext.current.contentResolver
    val scope = rememberCoroutineScope()
    val saveCsv = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri ->
        if (uri != null) scope.launch {
            exportMessage = try {
                withContext(Dispatchers.IO) {
                    val rows = visibleExpenses.map { expense ->
                        val minor = (expense.optDouble("amount", 0.0) * 100).roundToLong()
                        listOf(expense.optString("name"), expense.optString("category"), expense.optString("date"),
                            expense.optString("method"), BigDecimal.valueOf(minor, 2).toPlainString())
                    }
                    val header = listOf("Expense", "Category", "Date", "Method", "KES")
                    val output = resolver.openOutputStream(uri) ?: throw IOException("File could not be opened")
                    output.writeCsv(header, rows)
                }
                "Expenses exported."
            } catch (_: IOException) {
                "Could not save the expense file."
            } catch (_: SecurityException) {
                "Could not write to the selected location."
            }
        }
    }

    Page {
        PageTitle("Expenses", onBack = onBack)
        if (canManage) PrimaryButton("Record expense", { adding = true }, tone = Green)
        OutlinedTextField(
            value = search,
            onValueChange = { search = it },
            modifier = Modifier.fillMaxWidth(),
            label = { AppText("Search expenses") },
            singleLine = true,
        )
        OutlinedButton(enabled = visibleExpenses.isNotEmpty(), onClick = { saveCsv.launch("expenses.csv") }) {
            AppText("Export expenses")
        }
        if (exportMessage.isNotBlank()) AppText(exportMessage)
        if (visibleExpenses.isEmpty()) {
            val detail = if (expenses.isEmpty()) "Recorded business expenses will appear here." else "Try another name or category."
            EmptyState("No expenses found", detail)
        }
        visibleExpenses.forEach { expense ->
            SurfaceCard {
                AppText(expense.optString("name"), style = MaterialTheme.typography.titleMedium)
                AppText(minorMoney((expense.optDouble("amount", 0.0) * 100).roundToLong()))
                val details = listOf(expense.optString("category"), expense.optString("date"), expense.optString("method"))
                AppText(details.filter { it.isNotBlank() }.joinToString(" · "))
                if (canManage) {
                    TextButton(onClick = { removalId = expense.getInt("id") }) {
                        AppText("Remove expense", color = Coral)
                    }
                }
            }
        }
    }

    if (adding && canManage && backend != null) {
        ExpenseDialog(onClose = { adding = false }, onSave = { name, amount, date, category, method ->
            backend.action {
                val minor = parseMinor(amount)
                require(minor in 1..1_000_000_000) { "Enter an amount between KES 0.01 and KES 10,000,000." }
                val expense = json(
                    "name" to name.trim(), "amount" to minor / 100.0,
                    "date" to date, "category" to category, "method" to method,
                )
                backend.command(json("type" to "addExpense", "expense" to expense))
                adding = false
            }
        }, error = backend.error)
    }

    val expenseToRemove = expenses.firstOrNull { it.optInt("id") == removalId }
    if (expenseToRemove != null && canManage && backend != null) {
        AlertDialog(
            onDismissRequest = { removalId = null },
            title = { AppText("Remove expense?") },
            text = { AppText(expenseToRemove.optString("name")) },
            confirmButton = {
                TextButton(onClick = {
                    backend.action {
                        backend.command(json("type" to "removeExpense", "id" to expenseToRemove.getInt("id")))
                        removalId = null
                    }
                }) { AppText("Remove expense", color = Coral) }
            },
            dismissButton = { TextButton(onClick = { removalId = null }) { AppText("Cancel") } },
        )
    }
}

internal fun java.io.OutputStream.writeCsv(header: List<String>, rows: List<List<String>>) {
    bufferedWriter(Charsets.UTF_8).use { writer ->
        writer.write("\uFEFF")
        (listOf(header) + rows).forEach { row -> writer.write(row.joinToString(",", transform = ::csvCell) + "\r\n") }
    }
}

private fun csvCell(value: String): String {
    val escaped = if (value.trimStart().firstOrNull() in listOf('=', '+', '-', '@')) "'$value" else value
    return "\"${escaped.replace("\"", "\"\"")}\""
}

@Composable
private fun ExpenseDialog(
    onClose: () -> Unit,
    onSave: (String, String, String, String, String) -> Unit,
    error: String,
) {
    var name by rememberSaveable { mutableStateOf("") }
    var amount by rememberSaveable { mutableStateOf("") }
    var date by rememberSaveable { mutableStateOf(todayLocal()) }
    var category by rememberSaveable { mutableStateOf(expenseCategories.first()) }
    var method by rememberSaveable { mutableStateOf(expenseMethods.first()) }
    val context = LocalContext.current

    AlertDialog(
        onDismissRequest = onClose,
        title = { AppText("Record expense") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(name, { name = it.take(100) }, label = { AppText("Expense name") }, singleLine = true)
                OutlinedTextField(
                    amount, { amount = it }, label = { AppText("Amount (KES)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true,
                )
                OutlinedButton(onClick = {
                    val current = LocalDate.parse(date)
                    DatePickerDialog(context, { _, year, month, day ->
                        date = LocalDate.of(year, month + 1, day).toString()
                    }, current.year, current.monthValue - 1, current.dayOfMonth).show()
                }) { AppText("Date: $date") }
                ToolSelect("Category", category, expenseCategories.map { it to it }) { category = it }
                ToolSelect("Payment method", method, expenseMethods.map { it to it }) { method = it }
                if (error.isNotBlank()) AppText(error, color = Coral)
            }
        },
        confirmButton = {
            TextButton(enabled = name.isNotBlank() && amount.isNotBlank(), onClick = { onSave(name, amount, date, category, method) }) {
                AppText("Save expense")
            }
        },
        dismissButton = { TextButton(onClick = onClose) { AppText("Cancel") } },
    )
}
