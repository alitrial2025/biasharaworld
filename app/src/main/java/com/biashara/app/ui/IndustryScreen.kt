package com.biashara.app.ui

import android.content.Context
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.biashara.app.data.*
import java.util.UUID
import kotlinx.coroutines.launch
import org.json.JSONObject

@Composable
fun IndustryShortcut(store: DemoStore, onOpen: () -> Unit) {
    val context = LocalContext.current
    val catalog = remember { industryCatalog(context) }
    val industry = resolveIndustry(catalog, store.liveState.objectAt("profile").optString("type"))
    SurfaceCard(Modifier.fillMaxWidth().clickable(onClick = onOpen), color = Mint) {
        Eyebrow("YOUR BUSINESS WORKSPACE", Green)
        AppText(industry.label, style = MaterialTheme.typography.titleLarge)
        AppText(industry.workflows.joinToString(" · ") { it.label }, color = Muted)
        TextButton(onClick = onOpen) { AppText("Open ${industry.operationsLabel.lowercase()}", color = Green) }
    }
}

/** Shared business administration, with the fields and status model of the selected sector. */
@Composable
fun IndustryScreen(store: DemoStore, onBack: () -> Unit, repositoryFactory: (Context, LiveBackend) -> IndustryRepository = { context, backend -> IndustryRepository(context, backend) }) {
    key(store.backend?.accountId, store.backend?.businessId) { ConnectedIndustryScreen(store, onBack, repositoryFactory) }
}

@Composable
private fun ConnectedIndustryScreen(store: DemoStore, onBack: () -> Unit, repositoryFactory: (Context, LiveBackend) -> IndustryRepository) {
    val context = LocalContext.current
    val catalog = remember { industryCatalog(context) }
    val activeIndustry = resolveIndustry(catalog, store.liveState.objectAt("profile").optString("type"))
    val backend = store.backend
    if (backend == null) { Page { PageTitle("Business operations", onBack = onBack); AppText("Sign in with a business account to save operational records. The shared tools remain available in this demo.", color = Muted) }; return }
    val repository = remember(backend.accountId, backend.businessId) { repositoryFactory(context, backend) }
    val scope = rememberCoroutineScope()
    var recordsJson by remember { mutableStateOf("[]") }
    val records = remember(recordsJson) { org.json.JSONArray(recordsJson).let { a -> (0 until a.length()).map { a.getJSONObject(it) } } }
    var industryId by rememberSaveable { mutableStateOf(activeIndustry.id) }
    val industry = catalog.firstOrNull { it.id == industryId } ?: activeIndustry
    var workflowId by rememberSaveable(industryId) { mutableStateOf(industry.workflows.first().id) }
    val workflow = industry.workflows.firstOrNull { it.id == workflowId } ?: industry.workflows.first()
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var notice by remember { mutableStateOf("") }
    var pending by remember { mutableStateOf(false) }
    var query by rememberSaveable { mutableStateOf("") }
    var archived by rememberSaveable { mutableStateOf(false) }
    var selected by remember { mutableStateOf<JSONObject?>(null) }
    var edit by remember { mutableStateOf<JSONObject?>(null) }
    var creating by remember { mutableStateOf(false) }
    var mode by remember { mutableStateOf("") }
    val canWrite = backend.role in listOf("Owner", "Manager", "Cashier") && backend.featuresUnlocked
    val canArchive = backend.role in listOf("Owner", "Manager")
    suspend fun refresh() { recordsJson = repository.load().optJSONArray("records")?.toString() ?: "[]"; pending = repository.pending() != null }
    fun act(action: suspend () -> Unit) {
        if (busy) return
        busy = true; error = ""
        scope.launch { try { action() } catch (e: Exception) { error = e.message ?: "Could not complete this request." } finally { pending = runCatching { repository.pending() != null }.getOrDefault(true); busy = false } }
    }
    val retrySaved: () -> Unit = { act { repository.retry(); selected = null; edit = null; creating = false; mode = ""; notice = "Saved request confirmed."; refresh() } }
    LaunchedEffect(repository) { busy = true; try { refresh() } catch (e: Exception) { error = e.message.orEmpty(); pending = runCatching { repository.pending() != null }.getOrDefault(true) } finally { busy = false } }
    Page {
        PageTitle(industry.operationsLabel, industry.label, onBack)
        AppText(industry.description, color = Muted)
        AppText("Operational records · KES · Nairobi time. Record payments only after receiving them. These records do not move money or adjust stock.", color = Muted)
        if (industry.id != activeIndustry.id) SurfaceCard(color = Sand) { AppText("Viewing records from a previous business sector. New records use your current sector: ${activeIndustry.label}.") }
        val retained = catalog.filter { candidate -> candidate.id == activeIndustry.id || records.any { it.optString("industry_id") == candidate.id } }
        SheetChoice("Business sector", industry.id, retained.map { it.id to it.label }, { industryId = it })
        SheetChoice("Workflow", workflow.id, industry.workflows.map { it.id to it.label }, { workflowId = it })
        AppText(workflow.description, color = Muted)
        OutlinedTextField(query, { query = it }, label = { AppText("Search title, customer or reference") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
        Row { Checkbox(archived, { archived = it }); AppText("Include archived records", modifier = Modifier.padding(top = 12.dp)) }
        if (busy) LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Green)
        if (error.isNotBlank()) SurfaceCard(color = RoseMist) { AppText(error, color = Coral) }
        if (notice.isNotBlank()) AppText(notice, color = Green)
        if (pending) SurfaceCard(color = Sand) {
            AppText("A save has not been confirmed. Retry it before making another change.")
            PrimaryButton("Retry saved request", retrySaved, enabled = !busy)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (canWrite && industry.id == activeIndustry.id) Button(onClick = { edit = null; creating = true }, enabled = !busy && !pending) { AppText("Add ${workflow.singular}") }
            OutlinedButton(onClick = { act { refresh() } }, enabled = !busy) { AppText("Refresh") }
        }
        val visible = records.filter { it.optString("industry_id") == industry.id && it.optString("workflow_id") == workflow.id && (archived || !it.optBoolean("archived")) && (query.isBlank() || it.toString().contains(query, ignoreCase = true)) }
        if (visible.isEmpty() && !busy) SurfaceCard { AppText("No ${workflow.label.lowercase()} to show."); AppText("Saved records for this workflow will appear here.", color = Muted) }
        visible.forEach { record ->
            SurfaceCard(Modifier.fillMaxWidth().clickable { selected = record; mode = "" }) {
                AppText(record.optString("title"), fontWeight = FontWeight.Bold)
                AppText(listOf(record.optString("customer"), record.optString("status"), if (record.optBoolean("archived")) "Archived" else "").filter { it.isNotBlank() }.joinToString(" · "), color = Muted)
                AppText("${minorMoney(record.optLong("paid_minor"))} recorded / ${minorMoney(record.optLong("amount_minor"))}")
            }
        }
    }
    if (creating || edit != null) {
        val previous = edit
        IndustryEditor(industry, workflow, previous, busy, pending, retrySaved, onDismiss = { if (!busy) { creating = false; edit = null } }, error = error) { record ->
            act {
                repository.save(if (previous == null) "create" else "update", previous?.getString("id") ?: UUID.randomUUID().toString(), previous?.getLong("revision") ?: 0, record = record)
                creating = false; edit = null; selected = null; notice = "Record saved."; refresh()
            }
        }
    }
    selected?.let { record ->
        if (mode.isBlank()) ActionSheet(onDismissRequest = { if (!busy) selected = null }, title = { AppText(record.optString("title"), style = MaterialTheme.typography.headlineSmall) }, text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                AppText("${record.optString("status")} · ${record.optString("customer")}", color = Muted)
                workflow.fields.forEach { field -> val value = record.objectAt("fields").optString(field.key); if (value.isNotBlank()) AppText("${field.label}: $value") }
                AppText("Total ${minorMoney(record.optLong("amount_minor"))}\nRecorded ${minorMoney(record.optLong("paid_minor"))}\nRemaining ${minorMoney(record.optLong("amount_minor") - record.optLong("paid_minor"))}")
                record.optJSONArray("payments")?.let { payments -> if (payments.length() > 0) { AppText("Payment history", fontWeight = FontWeight.Bold); (0 until payments.length()).forEach { i -> val payment = payments.getJSONObject(i); AppText("${payment.optString("action", "Payment")} · ${minorMoney(payment.optLong("amount_minor", payment.optLong("amountMinor")))} · ${payment.optString("method")} · ${payment.optString("reference")}", color = Muted) } } }
                record.optJSONArray("history")?.let { history -> if (history.length() > 0) { AppText("Activity", fontWeight = FontWeight.Bold); (0 until history.length()).reversed().take(12).forEach { i -> val event = history.getJSONObject(i); AppText("${event.optString("action")} · ${event.optString("at", event.optString("created_at"))}", color = Muted) } } }
                if (error.isNotBlank()) AppText(error, color = Coral)
            }
        }, confirmButton = {
            if (pending) PrimaryButton("Retry saved request", retrySaved, enabled = !busy)
            if (canWrite && !record.optBoolean("archived")) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { edit = record; selected = null }, enabled = !busy && !pending) { AppText("Edit") }
                    OutlinedButton(onClick = { mode = "status" }, enabled = !busy && !pending) { AppText("Change status") }
                    OutlinedButton(onClick = { mode = "payment" }, enabled = !busy && !pending) { AppText("Record payment") }
                    if (record.optLong("paid_minor") > 0) OutlinedButton(onClick = { mode = "refund" }, enabled = !busy && !pending) { AppText("Record refund") }
                    if (canArchive) OutlinedButton(onClick = { mode = "archive" }, enabled = !busy && !pending) { AppText("Archive") }
                }
            }
        }, dismissButton = { TextButton(onClick = { selected = null }, enabled = !busy) { AppText("Close") } })
        else IndustryRecordAction(record, workflow, mode, busy, pending, retrySaved, error, onDismiss = { if (!busy) mode = "" }) { status, payment ->
            act { repository.save(mode, record.getString("id"), record.getLong("revision"), status = status, payment = payment); selected = null; mode = ""; notice = "Record updated."; refresh() }
        }
    }
}

@Composable
private fun IndustryEditor(industry: BusinessIndustry, workflow: IndustryWorkflow, previous: JSONObject?, busy: Boolean, pending: Boolean, onRetry: () -> Unit, onDismiss: () -> Unit, error: String, onSave: (JSONObject) -> Unit) {
    var title by rememberSaveable(previous?.optString("id")) { mutableStateOf(previous?.optString("title") ?: "") }
    var customer by rememberSaveable(previous?.optString("id")) { mutableStateOf(previous?.optString("customer") ?: "") }
    var amount by rememberSaveable(previous?.optString("id")) { mutableStateOf(moneyInput(previous?.optLong("amount_minor") ?: 0)) }
    var rawFields by rememberSaveable(previous?.optString("id")) { mutableStateOf(previous?.optJSONObject("fields")?.toString() ?: "{}") }
    val fields = remember(rawFields) { JSONObject(rawFields) }
    var localError by remember { mutableStateOf("") }
    ActionSheet(onDismissRequest = onDismiss, title = { AppText(if (previous == null) "New ${workflow.singular}" else "Edit ${workflow.singular}", style = MaterialTheme.typography.headlineSmall) }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            AppText(workflow.description, color = Muted)
            OutlinedTextField(title, { title = it }, label = { AppText("Title / reference") }, modifier = Modifier.fillMaxWidth(), singleLine = true, enabled = !busy && !pending)
            OutlinedTextField(customer, { customer = it }, label = { AppText("Customer / organisation (optional)") }, modifier = Modifier.fillMaxWidth(), singleLine = true, enabled = !busy && !pending)
            workflow.fields.forEach { field ->
                val label = field.label + if (field.required) " *" else " (optional)"
                val value = fields.optString(field.key)
                fun change(next: String) { rawFields = JSONObject(rawFields).put(field.key, next).toString() }
                if (field.type == "select") SheetChoice(label, value, field.options.map { it to it }, { change(it) })
                else OutlinedTextField(value, { change(it) }, label = { AppText(label) }, supportingText = { if (field.type in listOf("date", "datetime")) AppText(if (field.type == "date") "YYYY-MM-DD" else "YYYY-MM-DDTHH:mm · Nairobi time") }, singleLine = field.type != "textarea", minLines = if (field.type == "textarea") 3 else 1, keyboardOptions = KeyboardOptions(keyboardType = if (field.type == "number") KeyboardType.Decimal else KeyboardType.Text), modifier = Modifier.fillMaxWidth(), enabled = !busy && !pending)
            }
            OutlinedTextField(amount, { amount = it }, label = { AppText(workflow.amountLabel) }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth(), singleLine = true, enabled = !busy && !pending)
            AppText("Payments are recorded separately after receipt. No money is collected here.", color = Muted)
            if (localError.ifBlank { error }.isNotBlank()) AppText(localError.ifBlank { error }, color = Coral)
        }
    }, confirmButton = { PrimaryButton(if (busy) "Saving…" else if (pending) "Retry saved request" else "Save record", { if (pending) onRetry() else try { onSave(industryRecordInput(industry, workflow, title, customer, fields, amount, previous?.optString("status") ?: workflow.statuses.first())); localError = "" } catch (e: Exception) { localError = e.message.orEmpty() } }, enabled = !busy) }, dismissButton = { TextButton(onClick = onDismiss, enabled = !busy) { AppText("Cancel") } })
}

@Composable
private fun IndustryRecordAction(record: JSONObject, workflow: IndustryWorkflow, action: String, busy: Boolean, pending: Boolean, onRetry: () -> Unit, error: String, onDismiss: () -> Unit, onSave: (String?, JSONObject?) -> Unit) {
    var status by rememberSaveable { mutableStateOf(record.optString("status")) }
    var amount by rememberSaveable { mutableStateOf("") }
    var method by rememberSaveable { mutableStateOf("Cash") }
    var reference by rememberSaveable { mutableStateOf("") }
    var localError by remember { mutableStateOf("") }
    ActionSheet(onDismissRequest = onDismiss, title = { AppText(when(action) { "status" -> "Change status"; "archive" -> "Archive record?"; "refund" -> "Record refund"; else -> "Record payment" }, style = MaterialTheme.typography.headlineSmall) }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (action == "status") SheetChoice("Status", status, workflow.statuses.map { it to it }, { status = it })
            else if (action == "archive") AppText("The record remains in your business history. Archived records cannot be edited or receive additional payment records. Review the status and balance before archiving.")
            else {
                AppText(if (action == "refund") "Record money already refunded to the customer. This does not initiate a refund." else "Record money already received. This does not charge the customer.", color = Muted)
                OutlinedTextField(amount, { amount = it }, label = { AppText("Amount (KES)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth(), enabled = !busy && !pending)
                SheetChoice("Method", method, listOf("Cash", "M-Pesa", "Bank transfer", "Card", "Other").map { it to it }, { method = it })
                OutlinedTextField(reference, { reference = it }, label = { AppText("Receipt / transaction reference") }, modifier = Modifier.fillMaxWidth(), enabled = !busy && !pending)
            }
            if (localError.ifBlank { error }.isNotBlank()) AppText(localError.ifBlank { error }, color = Coral)
        }
    }, confirmButton = { PrimaryButton(if (busy) "Saving…" else if (pending) "Retry saved request" else "Confirm", {
        if (pending) onRetry() else try {
            if (action in listOf("payment", "refund")) { val minor = parseIndustryMinor(amount); require(minor > 0) { "Enter a positive amount." }; require(minor <= if (action == "refund") record.optLong("paid_minor") else record.optLong("amount_minor") - record.optLong("paid_minor")) { "The amount exceeds the available balance." }; onSave(null, json("amountMinor" to minor, "method" to method, "reference" to reference.trim())) }
            else onSave(if (action == "status") status else null, null)
            localError = ""
        } catch (e: Exception) { localError = e.message.orEmpty() }
    }, enabled = !busy) }, dismissButton = { TextButton(onClick = onDismiss, enabled = !busy) { AppText("Cancel") } })
}

@Composable
fun LockedWorkspaceScreen(store: DemoStore, onVerification: () -> Unit, onProfile: () -> Unit, onPreferences: () -> Unit) {
    val context = LocalContext.current
    Page {
        PageTitle("Finish business verification", "Your workspace is ready for setup.")
        SurfaceCard(color = Mint) {
            AppText("Verify when you are ready", style = MaterialTheme.typography.headlineSmall)
            AppText("Complete the mandatory business readiness details to unlock sales, stock, operations and funding. Your saved records remain in your account.", color = Muted)
            AppText("Identity verification provider · coming soon. Saving readiness details does not verify your identity.", color = Muted)
            if (store.backend?.role == "Owner") PrimaryButton("Complete business details", onVerification)
            else AppText("Ask your business owner to complete verification details.", color = Green)
        }
        OutlinedButton(onClick = onProfile) { AppText("Business profile") }
        OutlinedButton(onClick = onPreferences) { AppText("Appearance & preferences") }
        OutlinedButton(onClick = { openServiceWebsite(context, "/help") }) { AppText("Help & support") }
        BusinessFormStatus(store)
        TextButton(onClick = { store.backend?.action { store.backend?.signOut() } }, enabled = store.canSave) { AppText("Sign out", color = Coral) }
    }
}
