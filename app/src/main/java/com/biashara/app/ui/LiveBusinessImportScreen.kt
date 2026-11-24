package com.biashara.app.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.OutlinedTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import com.biashara.app.data.DemoStore
import com.biashara.app.data.json
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val importKinds = listOf("products" to "Products and opening stock", "customers" to "Customers and opening balances")
private val importHeadings = mapOf(
    "products" to listOf("name", "sku", "category", "unit", "price_kes", "cost_kes", "opening_stock", "reorder_level"),
    "customers" to listOf("name", "email", "phone", "opening_balance_kes"),
)

@Composable
fun LiveBusinessImportScreen(store: DemoStore, onBack: () -> Unit) {
    val backend = store.backend
    val allowed = backend?.role in listOf("Owner", "Manager")
    var kind by remember { mutableStateOf("products") }
    var csv by remember { mutableStateOf("") }
    var notice by remember { mutableStateOf("") }
    val resolver = LocalContext.current.contentResolver
    val scope = rememberCoroutineScope()
    val template = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri ->
        if (uri != null && allowed) scope.launch {
            notice = try {
                withContext(Dispatchers.IO) {
                    val file = resolver.openOutputStream(uri) ?: throw IOException("File unavailable")
                    file.writeCsv(importHeadings.getValue(kind), emptyList())
                }
                "CSV template saved."
            } catch (_: IOException) {
                "Could not save the CSV template."
            } catch (_: SecurityException) {
                "Could not access the selected location."
            }
        }
    }
    val open = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null && allowed) scope.launch {
            notice = try {
                csv = withContext(Dispatchers.IO) { readCsvText(resolver, uri, 90_000) }
                "CSV loaded. Review it before importing."
            } catch (failure: IllegalArgumentException) {
                failure.message ?: "The CSV file is too large."
            } catch (_: IOException) {
                "Could not read the CSV file."
            } catch (_: SecurityException) {
                "Could not access the selected file."
            }
        }
    }
    Page {
        PageTitle("Import business records", onBack = onBack)
        if (backend == null || !allowed) {
            AppText("Ask an owner or manager to import records.")
            return@Page
        }
        ToolSelect("Records to import", kind, importKinds) {
            kind = it
            csv = ""
            notice = ""
        }
        if (kind == "products") AppText("Opening stock will be recorded in the active branch.")
        AppText("Import up to 100 records per file. The whole import is checked before it is saved.")
        AppText(importHeadings.getValue(kind).joinToString(", "))
        PrimaryButton("Save CSV template", { template.launch("import-$kind.csv") }, enabled = !backend.busy, tone = Green)
        PrimaryButton("Choose CSV file", { open.launch(arrayOf("text/csv", "text/plain", "application/vnd.ms-excel")) }, enabled = !backend.busy, tone = Green)
        OutlinedTextField(csv, { csv = it.take(90_000) }, label = { AppText("CSV text") }, maxLines = 8)
        PrimaryButton("Import records", {
            backend.action {
                val result = backend.command(json("type" to "importBusiness", "kind" to kind, "csv" to csv))
                notice = result.optString("message")
                csv = ""
            }
        }, enabled = csv.isNotBlank() && !backend.busy, tone = Green)
        if (notice.isNotBlank()) AppText(notice)
        if (backend.error.isNotBlank()) AppText(backend.error, color = Coral)
    }
}
