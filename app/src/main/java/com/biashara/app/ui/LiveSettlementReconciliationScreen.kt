package com.biashara.app.ui

import android.content.ContentResolver
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalContext
import com.biashara.app.data.DemoStore
import com.biashara.app.data.json
import com.biashara.app.data.minorMoney
import com.biashara.app.data.records
import java.io.IOException
import java.math.BigDecimal
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

private val statementSources = mapOf("provider" to "Provider settlement", "bank" to "Bank deposit", "mobile_money" to "Mobile money deposit")
private val matchLabels = mapOf(
    "matched" to "Matched", "missing_provider" to "Missing provider settlement", "missing_deposit" to "Missing deposit",
    "amount_mismatch" to "Amount mismatch", "multiple_deposits" to "Multiple deposits",
)

internal fun readCsvText(resolver: ContentResolver, uri: Uri, limit: Int): String {
    val stream = resolver.openInputStream(uri) ?: throw IOException("File unavailable")
    return stream.bufferedReader(Charsets.UTF_8).use { reader ->
        val buffer = CharArray(limit + 1)
        var length = 0
        while (length < buffer.size) {
            val count = reader.read(buffer, length, buffer.size - length)
            if (count < 1) break
            length += count
        }
        require(length <= limit) { "This CSV is too large. Import it in smaller batches." }
        String(buffer, 0, length)
    }
}

@Composable
fun LiveSettlementReconciliationScreen(store: DemoStore, onBack: () -> Unit) {
    val backend = store.backend
    val allowed = backend?.role in listOf("Owner", "Manager")
    var report by remember { mutableStateOf<JSONObject?>(null) }
    var pages by remember { mutableStateOf(emptyList<String>()) }
    var exceptions by remember { mutableStateOf(false) }
    var statementSource by remember { mutableStateOf("provider") }
    var csv by remember { mutableStateOf("") }
    var notice by remember { mutableStateOf("") }
    var correction by remember { mutableStateOf<Pair<Long, String>?>(null) }
    var reason by remember { mutableStateOf("") }

    fun load(onlyExceptions: Boolean, cursors: List<String>) {
        backend?.action {
            report = backend.settlementStatements(onlyExceptions, cursors.lastOrNull())
            pages = cursors
            exceptions = onlyExceptions
        }
    }

    val resolver = LocalContext.current.contentResolver
    val scope = rememberCoroutineScope()
    val entries = report?.records("entries").orEmpty()
    val next = report?.takeUnless { it.isNull("next") }?.optString("next")?.takeIf(String::isNotBlank)
    val import = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null && allowed) scope.launch {
            notice = try {
                csv = withContext(Dispatchers.IO) { readCsvText(resolver, uri, 130_000) }
                "Statement loaded. Review it before importing."
            } catch (failure: IllegalArgumentException) {
                failure.message ?: "This statement is too large."
            } catch (_: IOException) {
                "Could not read this CSV file."
            } catch (_: SecurityException) {
                "Could not access the selected file."
            }
        }
    }
    val export = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri ->
        if (uri != null && allowed) scope.launch {
            notice = try {
                withContext(Dispatchers.IO) {
                    val rows = entries.flatMap { entry ->
                        entry.records("lines").map { row ->
                            listOf(entry.getString("reference"), matchLabels[entry.getString("status")].orEmpty(),
                                statementSources[row.getString("source")].orEmpty(), row.getString("date"),
                                BigDecimal.valueOf(row.getLong("amountMinor"), 2).toPlainString())
                        }
                    }
                    val stream = resolver.openOutputStream(uri) ?: throw IOException("File unavailable")
                    stream.writeCsv(listOf("Reference", "Status", "Source", "Date", "KES"), rows)
                }
                "Settlement matches exported."
            } catch (_: IOException) {
                "Could not save the statement file."
            } catch (_: SecurityException) {
                "Could not access the selected location."
            }
        }
    }

    LaunchedEffect(backend, backend?.slug, allowed) {
        if (allowed) load(false, emptyList())
    }

    Page {
        PageTitle("Settlement reconciliation", onBack = onBack)
        if (backend == null || !allowed) {
            AppText("An owner or manager can reconcile settlements.")
            return@Page
        }
        AppText("Match provider payouts to bank or mobile-money credits with the same reference and net amount.")
        AppText("Use the CSV headings date,reference,amount_kes and YYYY-MM-DD dates.")
        ToolSelect("Statement source", statementSource, statementSources.toList()) { statementSource = it }
        PrimaryButton("Choose CSV file", { import.launch(arrayOf("text/csv", "text/plain", "application/vnd.ms-excel")) }, enabled = !backend.busy, tone = Green)
        OutlinedTextField(csv, { csv = it.take(130_000) }, label = { AppText("CSV text") }, maxLines = 6)
        PrimaryButton("Import statement", {
            backend.action {
                val result = backend.settlementStatements(command = json("action" to "import", "source" to statementSource, "csv" to csv))
                csv = ""
                notice = "Imported ${result.getInt("added")} lines. Skipped ${result.getInt("duplicates")} duplicates."
                report = backend.settlementStatements(exceptions)
                pages = emptyList()
            }
        }, enabled = csv.isNotBlank() && !backend.busy, tone = Green)
        if (notice.isNotBlank()) AppText(notice)
        if (backend.error.isNotBlank()) AppText(backend.error, color = Coral)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(exceptions, { load(it, emptyList()) }, enabled = !backend.busy)
            AppText("Show exceptions only")
        }
        PrimaryButton("Export this page", { export.launch("settlement-matches.csv") }, enabled = entries.isNotEmpty() && !backend.busy, tone = Green)
        if (report == null && backend.error.isBlank()) AppText("Loading statement matches…")
        if (report != null && entries.isEmpty()) AppText("No statement matches in this view.")
        for (entry in entries) {
            val ref = entry.getString("reference")
            SurfaceCard {
                AppText(ref)
                AppText(matchLabels[entry.getString("status")].orEmpty())
                for (row in entry.records("lines")) {
                    val source = statementSources[row.getString("source")].orEmpty()
                    AppText("$source · ${row.getString("date")} · ${minorMoney(row.getLong("amountMinor"))}")
                    if (backend.role == "Owner") TextButton(onClick = {
                        reason = ""
                        correction = row.getLong("id") to "$source · $ref"
                    }) { AppText("Correct line") }
                }
            }
        }
        if (pages.isNotEmpty()) PrimaryButton("Previous page", { load(exceptions, pages.dropLast(1)) }, enabled = !backend.busy, tone = Green)
        if (next != null) PrimaryButton("Next page", { load(exceptions, pages + next) }, enabled = !backend.busy, tone = Green)
    }

    val discard = correction
    if (backend != null && backend.role == "Owner" && discard != null) AlertDialog(
        onDismissRequest = { correction = null },
        title = { AppText("Discard an incorrect line") },
        text = {
            androidx.compose.foundation.layout.Column {
                AppText(discard.second)
                OutlinedTextField(reason, { reason = it.take(200) }, label = { AppText("Reason for correction") })
                if (backend.error.isNotBlank()) AppText(backend.error, color = Coral)
            }
        },
        confirmButton = { TextButton(enabled = reason.isNotBlank() && !backend.busy, onClick = {
            backend.action {
                backend.settlementStatements(command = json("action" to "discard", "id" to discard.first, "reason" to reason))
                correction = null
                notice = "Line discarded. The correction was recorded."
                report = backend.settlementStatements(exceptions)
                pages = emptyList()
            }
        }) { AppText("Discard imported line") } },
        dismissButton = { TextButton(onClick = { correction = null }) { AppText("Cancel") } },
    )
}
