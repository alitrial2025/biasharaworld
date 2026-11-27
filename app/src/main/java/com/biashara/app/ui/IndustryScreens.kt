package com.biashara.app.ui

import android.app.Activity
import android.view.WindowManager

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.ui.Alignment
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.biashara.app.BuildConfig
import com.biashara.app.data.activityCount
import com.biashara.app.data.workspaceZone
import com.biashara.app.data.DemoStore
import com.biashara.app.data.LiveBackend
import com.biashara.app.data.json
import com.biashara.app.data.minorMoney
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import org.json.JSONObject

internal data class IndustrySummary(val counts: JSONObject? = null, val failed: Boolean = false) {
    fun count(module: String): Int? = counts?.takeIf { it.has(module) }?.optInt(module)
}

@Composable
internal fun rememberIndustrySummary(
    backend: LiveBackend?,
    sector: String,
    role: String,
    enabled: Boolean,
    retry: Int = 0,
): IndustrySummary {
    var result by remember(backend, sector, role, enabled, retry) { mutableStateOf(IndustrySummary()) }
    LaunchedEffect(backend, sector, role, enabled, retry) {
        if (backend == null || !enabled) return@LaunchedEffect
        try {
            val response = backend.industrySummary()
            check(response.optString("sector") == sector)
            result = IndustrySummary(response.getJSONObject("counts"))
        } catch (cancelled: CancellationException) {
            throw cancelled
        } catch (_: Exception) {
            result = IndustrySummary(failed = true)
        }
    }
    return result
}

@Composable
internal fun LiveIndustryHome(
    store: DemoStore,
    catalog: IndustryCatalog,
    industry: Industry,
    role: String,
    open: (String, String) -> Unit,
) {
    val actions = catalog.dailyActions(industry, role)
    var retry by remember { mutableIntStateOf(0) }
    val summary = rememberIndustrySummary(store.backend, industry.id, role, actions?.any { it.queue != null } == true, retry)
    val uri = LocalUriHandler.current
    Page {
        Eyebrow(industry.label)
        PageTitle("Hi ${store.ownerName.substringBefore(' ')}", store.businessName)
        if (actions != null) {
            AppText("Daily work", style = MaterialTheme.typography.titleLarge)
            AppText(if (industry.modules.isNotEmpty() || industry.id == "services") "All branches"
                else store.operations.branchName, color = Muted)
            actions.forEach { action ->
                OutlinedButton(
                    onClick = { open(action.destination, action.module) },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp),
                    shape = MaterialTheme.shapes.medium,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        AppText(action.label, modifier = Modifier.weight(1f))
                        val count = action.queue?.let { summary.count(it.module) }
                            ?: action.metric?.let { store.activityCount(it) }
                        count?.let { AppText(it.toString()) }
                        AppIcon(Icons.AutoMirrored.Outlined.ArrowForward, null, Modifier.size(17.dp))
                    }
                }
            }
            if (summary.failed) {
                AppText("Could not load current work counts.", color = Muted)
                TextButton(onClick = { retry++ }) { AppText("Retry") }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(onClick = { open("assistant", "") }) { AppText("BiasharaAI") }
                TextButton(onClick = {
                    val host = BuildConfig.API_URL.trimEnd('/').ifBlank { "https://biasharaworld.vercel.app" }
                    uri.openUri("$host/contact")
                }) { AppText("Contact support") }
            }
            return@Page
        }
        if (industry.allows("industry", role) && role != "Cashier") {
            AppText(industry.label, style = MaterialTheme.typography.titleMedium)
            SurfaceCard {
                industry.modules.forEach { module ->
                    TextButton(onClick = { open("industry", module.id) }) { AppText(module.label) }
                }
            }
        }
        AppText("Workspace tools", style = MaterialTheme.typography.titleMedium)
        SurfaceCard {
            industry.shortcuts(role).filter { it != "industry" || role == "Cashier" }.forEach { slug ->
                TextButton(onClick = { open(slug, "") }) { AppText(if (slug == "industry") "Ticket admission" else catalog.label(slug)) }
            }
        }
    }
}

@Composable
internal fun WorkspaceSearchScreen(
    store: DemoStore,
    catalog: IndustryCatalog,
    industry: Industry,
    role: String,
    open: (String, String) -> Unit,
) {
    var query by rememberSaveable { mutableStateOf("") }
    val results = catalog.search(industry, role, query)
    val term = query.trim()
    val products = if (term.isBlank()) emptyList() else store.products.filter { it.name.contains(term, true) }.take(4)
    val customers = if (term.isBlank()) emptyList() else store.customers.filter { it.name.contains(term, true) }.take(4)
    Page {
        PageTitle("Search workspace")
        OutlinedTextField(query, { query = it }, label = { AppText("Search tools, products or customers") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        if (results.isEmpty() && products.isEmpty() && customers.isEmpty()) AppText("No matches found.", color = Muted)
        results.forEach { tool ->
            TextButton(onClick = { open(tool.slug, tool.module) }) {
                AppText(if (tool.slug == "industry" && role == "Cashier") "Ticket admission" else tool.label)
            }
        }
        products.forEach { product -> TextButton(onClick = { open("inventory", "") }) { AppText(product.name) } }
        customers.forEach { customer -> TextButton(onClick = { open("customers", "") }) { AppText(customer.name) } }
    }
}

@Composable
internal fun LiveWorkspaceMore(store: DemoStore, role: String, open: (String, String) -> Unit) {
    Page {
        PageTitle("Settings", store.businessName)
        SurfaceCard {
            TextButton(onClick = { open("settings", "") }) { AppText("Business profile") }
            TextButton(onClick = { open("preferences", "") }) { AppText("Preferences") }
            if (role == "Owner") {
                TextButton(onClick = { open("online-shop", "") }) { AppText("Shop builder") }
            }
            if (role in listOf("Owner", "Manager")) {
                TextButton(onClick = { open("team", "") }) { AppText("Your team") }
            }
            TextButton(onClick = { store.backend?.let { it.action { it.signOut() } } }) { AppText("Sign out", color = Coral) }
        }
    }
}

@Composable
internal fun LiveIndustryRecordsScreen(
    backend: LiveBackend, industry: Industry, role: String, initialModule: String,
    initialAttention: Boolean, queues: List<DailyAction>, back: () -> Unit, customerAccess: () -> Unit,
) {
    var data by remember { mutableStateOf<JSONObject?>(null) }
    var selected by rememberSaveable { mutableStateOf(initialModule) }
    var attention by rememberSaveable { mutableStateOf(initialAttention) }
    var limit by rememberSaveable { mutableIntStateOf(30) }
    var filter by rememberSaveable { mutableStateOf("") }
    var ticket by rememberSaveable { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var notice by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var adding by remember { mutableStateOf(false) }
    var addingSeats by remember { mutableStateOf(false) }
    var history by remember { mutableStateOf<JSONObject?>(null) }
    var action by remember { mutableStateOf<Pair<JSONObject, String>?>(null) }
    var pending by remember { mutableStateOf<Pair<String, String>?>(null) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val module = industry.modules.firstOrNull { it.id == selected } ?: industry.modules.firstOrNull()
    val records = data?.optJSONArray("records")?.objects().orEmpty()
    val canManage = data?.optBoolean("manage") == true
    val canScan = data?.optBoolean("scan") == true

    fun shareTicket(ticket: JSONObject) {
        val seatId = ticket.getJSONObject("values").getString("seat")
        val seat = records.first { it.getString("id") == seatId }
        val show = records.first { it.getString("id") == seat.getJSONObject("values").getString("show") }.getJSONObject("values")
        val event = records.first { it.getString("id") == show.getString("event") }
        shareTicketImage(context, ticket.getString("code"), event.getString("name"), listOf(
            "${event.getJSONObject("values").getString("venue")} · ${show.getString("room")}",
            "${showtimeLabel(show.getString("start"))} EAT",
            "Seat ${seat.getString("name")} · ${seat.getJSONObject("values").getString("section")}",
            "Booking ${ticket.getString("name")}",
        ))
    }

    suspend fun refresh() {
        val response = backend.industryRecords()
        check(response.optString("sector") == industry.id) { "Your business type changed. Refresh the workspace." }
        data = response
    }

    suspend fun load() {
        error = ""
        try {
            refresh()
        } catch (issue: CancellationException) {
            throw issue
        } catch (issue: Exception) {
            error = issue.message ?: "Could not load industry records."
        }
    }

    fun save(command: JSONObject, onSaved: () -> Unit = {}) {
        if (busy) return
        busy = true
        error = ""
        notice = ""
        val signature = command.toString()
        if (pending?.first != signature) pending = signature to UUID.randomUUID().toString()
        command.put("requestId", pending?.second)
        command.put("sector", industry.id)
        scope.launch {
            try {
                val result = backend.industryRecords(command)
                pending = null
                notice = when {
                    result.optBoolean("duplicate") -> "Change already saved."
                    command.optString("action") == "admit" -> "Ticket accepted. Guest checked in."
                    command.optString("action") == "createSeats" -> "Seats added: ${result.optInt("created")}"
                    else -> "Saved · ${result.optString("status")}"
                }
                onSaved()
                load()
            } catch (issue: CancellationException) {
                throw issue
            } catch (issue: Exception) {
                error = issue.message ?: "Could not save this record."
            } finally {
                busy = false
            }
        }
    }

    fun transition(record: JSONObject, status: String, reference: String = "") {
        val command = json("action" to "transition", "id" to record.getString("id"), "from" to record.getString("status"), "status" to status)
        if (reference.isNotBlank()) command.put("reference", reference.trim())
        save(command) { action = null }
    }

    fun admit(code: String) {
        save(json("action" to "admit", "code" to code)) { ticket = "" }
    }

    val camera = rememberLauncherForActivityResult(ScanContract()) { result ->
        result.contents?.trim()?.let { code ->
            if (code.matches(ticketPattern)) {
                ticket = code
                admit(code)
            } else error = "Scan a BiasharaOS ticket code."
        }
    }

    if (!industry.allows("industry", role) || module == null) {
        Page { PageTitle("Industry operations", "Specialized records are unavailable for your business type or role.", back) }
        return
    }

    DisposableEffect(context, industry.id) {
        val window = (context as? Activity)?.window
        val secureFlag = WindowManager.LayoutParams.FLAG_SECURE
        val addSecure = industry.id == "finance" && window != null && window.attributes.flags and secureFlag == 0
        if (addSecure) window?.addFlags(secureFlag)
        onDispose { if (addSecure) window?.clearFlags(secureFlag) }
    }
    LaunchedEffect(backend, industry.id, role) { load() }

    Page {
        PageTitle(industry.label, onBack = back) { TextButton(onClick = { scope.launch { load() } }, enabled = !busy) { AppText("Refresh") } }
        if (industry.id == "finance") AppText("Managers submit cases. A different owner reviewer records the decision with an authenticator code and a reason.", color = Muted)
        if (error.isNotBlank()) AppText(error, color = Coral)
        if (notice.isNotBlank()) AppText(notice, color = Green)
        if (data == null && error.isBlank()) CircularProgressIndicator()
        if (canScan && (!canManage || selected.isBlank() || module.id == "tickets")) {
            SurfaceCard {
                AppText("Ticket admission", style = MaterialTheme.typography.titleMedium)
                val valid = ticket.matches(ticketPattern)
                OutlinedTextField(ticket, { ticket = it.trim() }, label = { AppText("Scan or enter ticket code") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Go),
                    keyboardActions = KeyboardActions(onGo = { if (valid) admit(ticket) }),
                    modifier = Modifier.fillMaxWidth().onPreviewKeyEvent {
                        if (it.key != Key.Enter && it.key != Key.NumPadEnter) return@onPreviewKeyEvent false
                        if (it.type == KeyEventType.KeyUp && valid) admit(ticket)
                        true
                    })
                TextButton(onClick = { admit(ticket) }, enabled = valid && !busy) { AppText("Check in guest") }
                TextButton(onClick = {
                    camera.launch(ScanOptions().setDesiredBarcodeFormats("CODE_39")
                        .setPrompt("Scan a ticket barcode").setBeepEnabled(false))
                }, enabled = !busy) { AppText("Scan with camera") }
            }
        }
        if (canManage) {
            if (industry.id in listOf("entertainment", "real-estate")) {
                TextButton(onClick = customerAccess) { AppText(if (industry.id == "entertainment") "Public ticketing" else "Rent receipts and reminders") }
            }
            ToolSelect("Record type", module.id, industry.modules.map { it.id to it.label }) {
                selected = it; filter = ""; attention = false; limit = 30
            }
            val priority = queues.firstOrNull { it.module == module.id }
            val matchQueue = if (attention) priority?.queue?.matcher(LocalDate.now(workspaceZone)) else null
            if (priority != null) {
                val view = if (attention) priority.label else "All records"
                FilterPills(listOf(priority.label, "All records"), view, {
                    attention = it == priority.label
                    limit = 30
                })
            }
            if (module.id == "seats") {
                PrimaryButton("Add numbered seats", { addingSeats = true }, enabled = !busy, tone = Green)
            }
            if (matchQueue == null && (industry.id != "finance" || role == "Manager")) {
                PrimaryButton("Add record", { adding = true }, enabled = !busy, tone = Green)
            }
            OutlinedTextField(filter, { filter = it; limit = 30 }, label = { AppText("Search ${module.label.lowercase()}") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            val byId = records.associateBy { it.optString("id") }
            val matches = records.filter {
                it.optString("module") == module.id && (matchQueue == null || matchQueue(it)) && "${it.optString("name")} ${it.optString("status")} ${it.optJSONObject("values")}".contains(filter.trim(), true)
            }
            if (matches.isEmpty()) AppText("No matching records.", color = Muted)
            matches.take(limit).forEach { record ->
                val status = record.getString("status")
                val fields = record.getJSONObject("values")
                SurfaceCard {
                    AppText(record.getString("name"), style = MaterialTheme.typography.titleMedium)
                    val expired = status == "Reserved" && record.optString("expiresAt").let { it.isNotEmpty() && Instant.parse(it).isBefore(Instant.now()) }
                    AppText(if (expired) "Reservation expired" else status, color = Green)
                    module.fields.filter { fields.has(it.key) }.forEach { field ->
                        val value = when (field.type) {
                            "money" -> minorMoney(fields.getLong(field.key))
                            "reference" -> byId[fields.optString(field.key)]?.optString("name").orEmpty()
                            "datetime" -> showtimeLabel(fields.getString(field.key))
                            else -> fields.optString(field.key)
                        }
                        AppText("${field.label}: $value", fontSize = 13.sp, color = Muted)
                    }
                    if (module.id == "tickets" && fields.has("payment")) AppText("Payment reference: ${fields.optString("payment")}")
                    if (record.has("code") && status in listOf("Issued", "Checked in")) TicketBarcode(record.getString("code"))
                    if (status == "Issued" && record.has("code")) TextButton(onClick = {
                        runCatching { shareTicket(record) }.onFailure { error = "Could not share this ticket. Refresh the record and try again." }
                    }) { AppText("Share ticket") }
                    if ((record.optJSONArray("history")?.length() ?: 0) > 0) TextButton(onClick = { history = record }) {
                        AppText("Activity history")
                    }
                    module.flow.optJSONArray(status)?.strings().orEmpty().filter { next ->
                        !(industry.id == "finance" && next in listOf("Approved", "Declined") && (role != "Owner" || record.optBoolean("own")))
                    }.forEach { next ->
                        TextButton(enabled = !busy, onClick = {
                            if (actionReference(module.id, next, fields).isBlank()) transition(record, next) else action = record to next
                        }) { AppText("Mark as ${next.lowercase()}") }
                    }
                }
            }
            if (matches.size > limit) TextButton(onClick = { limit += 30 }) { AppText("Show more records") }
        }
    }

    if (addingSeats) {
        val shows = records.filter {
            it.optString("module") == "showtimes" && it.optString("status") == "Scheduled" &&
                runCatching { Instant.parse(it.getJSONObject("values").getString("end")).isAfter(Instant.now()) }.getOrDefault(false)
        }
        SeatRangeDialog(shows, error, busy, { addingSeats = false }) { input ->
            save(input) { addingSeats = false }
        }
    }
    history?.let { record ->
        AlertDialog(
            onDismissRequest = { history = null },
            title = { AppText("Activity history") },
            text = {
                Column(Modifier.heightIn(max = 420.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    AppText(record.optString("name"), style = MaterialTheme.typography.titleMedium)
                    record.optJSONArray("history")?.objects()?.asReversed()?.forEach { entry ->
                        AppText(entry.optString("status"))
                        AppText("${entry.optString("role")} · ${showtimeLabel(entry.getString("at"))} EAT", color = Muted)
                        if (entry.has("note")) AppText(entry.getString("note"))
                    }
                }
            },
            confirmButton = { TextButton(onClick = { history = null }) { AppText("Close") } },
        )
    }
    if (adding) IndustryRecordDialog(module, records, error, busy, { adding = false }) { name, values ->
        save(json("action" to "create", "name" to name, "module" to module.id, "values" to values)) { adding = false }
    }
    action?.let { (record, status) ->
        if (industry.id == "finance" && status in listOf("Approved", "Declined")) {
            BankDecisionDialog(backend, busy, error, { action = null }) { reason -> transition(record, status, reason) }
        } else {
            var reference by remember(record, status) { mutableStateOf("") }
            val label = actionReference(module.id, status, record.getJSONObject("values"))
            AlertDialog(
                onDismissRequest = { if (!busy) action = null },
                title = { AppText("Mark as ${status.lowercase()}") },
                text = { Column {
                    OutlinedTextField(reference, { reference = it.take(240) }, label = { AppText(label) },
                        maxLines = if (label.endsWith("reason")) 4 else 1)
                    if (error.isNotBlank()) AppText(error, color = Coral)
                } },
                confirmButton = { TextButton(onClick = { transition(record, status, reference) }, enabled = !busy && reference.isNotBlank()) { AppText("Confirm") } },
                dismissButton = { TextButton(onClick = { action = null }, enabled = !busy) { AppText("Cancel") } },
            )
        }
    }
}

private fun actionReference(module: String, status: String, values: JSONObject) = when {
    status == "Received" && module in listOf("rent", "premiums") && !values.has("payment") -> "Payment reference"
    status == "Issued" && module == "tickets" && values.optLong("amount") > 0 -> "Payment reference"
    module in listOf("account-requests", "deposit-requests", "loan-reviews") && status in listOf("Approved", "Declined") -> "Decision reason"
    module == "dispatch" && status == "Exception" -> "Exception reason"
    module == "batches" && status == "Released" -> "Quality check reference"
    status == "Delivered" && module == "dispatch" && !values.has("proof") -> "Proof of delivery"
    else -> ""
}

@Composable
private fun BankDecisionDialog(
    backend: LiveBackend,
    busy: Boolean,
    serverError: String,
    close: () -> Unit,
    submit: (String) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var reference by remember { mutableStateOf("") }
    var factor by remember { mutableStateOf<Pair<String, String?>?>(null) }
    var working by remember { mutableStateOf(false) }
    var code by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = { if (!busy && !working) close() },
        title = { AppText("Verify banking decision") },
        text = {
            Column(Modifier.heightIn(max = 420.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(reference, { reference = it.take(240) }, label = { AppText("Decision reason") }, maxLines = 4)
                if (factor == null) {
                    TextButton(enabled = !working && !busy, onClick = {
                        working = true
                        error = ""
                        scope.launch {
                            try {
                                factor = backend.bankReviewFactor()
                            } catch (cancelled: CancellationException) {
                                throw cancelled
                            } catch (_: Exception) {
                                error = "Could not start authenticator verification. Try again or contact your administrator."
                            } finally {
                                working = false
                            }
                        }
                    }) { AppText("Set up or check authenticator") }
                } else {
                    factor?.second?.let { setupKey ->
                        AppText("Add BiasharaOS to your authenticator app with this setup key. Keep it private.")
                        SelectionContainer { AppText(setupKey) }
                    }
                    OutlinedTextField(code, { code = it.filter { digit -> digit in '0'..'9' }.take(6) },
                        label = { AppText("Authenticator code") }, singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword))
                }
                if (error.isNotBlank()) AppText(error, color = Coral)
                if (serverError.isNotBlank()) AppText(serverError, color = Coral)
            }
        },
        confirmButton = {
            TextButton(enabled = !working && !busy && factor != null && code.length == 6 && reference.isNotBlank(), onClick = {
                val id = factor?.first ?: return@TextButton
                working = true
                error = ""
                scope.launch {
                    try {
                        backend.verifyBankReview(id, code)
                        factor = id to null
                        submit(reference.trim())
                    } catch (cancelled: CancellationException) {
                        throw cancelled
                    } catch (_: Exception) {
                        error = "Verification failed. Enter the current code from your authenticator app."
                    } finally {
                        working = false
                        code = ""
                    }
                }
            }) { AppText("Verify and confirm decision") }
        },
        dismissButton = { TextButton(onClick = close, enabled = !busy && !working) { AppText("Cancel") } },
    )
}

@Composable
private fun SeatRangeDialog(
    shows: List<JSONObject>,
    error: String,
    busy: Boolean,
    close: () -> Unit,
    submit: (JSONObject) -> Unit,
) {
    var show by rememberSaveable { mutableStateOf("") }
    var section by rememberSaveable { mutableStateOf("") }
    var row by rememberSaveable { mutableStateOf("") }
    var first by rememberSaveable { mutableStateOf("1") }
    var count by rememberSaveable { mutableStateOf("") }
    val start = first.toIntOrNull()
    val quantity = count.toIntOrNull()
    val validRange = start != null && quantity != null && start in 1..9999 &&
        quantity in 1..250 && start + quantity - 1 <= 9999
    AlertDialog(
        onDismissRequest = { if (!busy) close() },
        title = { AppText("Add numbered seats") },
        text = {
            Column(Modifier.heightIn(max = 420.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (shows.isEmpty()) AppText("Schedule a showtime before adding seats.")
                else ToolSelect("Showtime for seat range", show,
                    listOf("" to "Choose a showtime") + shows.map { it.getString("id") to it.getString("name") }) { show = it }
                OutlinedTextField(section, { section = it.take(240) }, label = { AppText("Section for seat range") }, singleLine = true)
                OutlinedTextField(row, { row = it.take(16) }, label = { AppText("Row name") }, placeholder = { AppText("A") }, singleLine = true)
                OutlinedTextField(first, { first = it.filter(Char::isDigit).take(4) }, label = { AppText("First seat number") },
                    singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                OutlinedTextField(count, { count = it.filter(Char::isDigit).take(3) }, label = { AppText("Number of seats") },
                    singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                AppText("Create up to 250 seats in one row, such as A-1 to A-50.", color = Muted)
                if (error.isNotBlank()) AppText(error, color = Coral)
            }
        },
        confirmButton = {
            TextButton(
                enabled = !busy && validRange && shows.any { it.optString("id") == show } && section.isNotBlank() &&
                    row.trim().matches(Regex("[A-Za-z0-9-]{1,16}")),
                onClick = { submit(json("action" to "createSeats", "show" to show, "section" to section.trim(),
                    "row" to row.trim(), "first" to start, "count" to quantity)) },
            ) { AppText("Create seat range") }
        },
        dismissButton = { TextButton(onClick = close, enabled = !busy) { AppText("Cancel") } },
    )
}

@Composable
private fun IndustryRecordDialog(
    module: IndustryModule,
    records: List<JSONObject>,
    serverError: String,
    busy: Boolean,
    close: () -> Unit,
    submit: (String, JSONObject) -> Unit,
) {
    var name by rememberSaveable { mutableStateOf("") }
    val names = remember(records) { records.associate { it.getString("id") to it.getString("name") } }
    val fields = remember { mutableStateMapOf<String, String>() }
    var error by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = { if (!busy) close() },
        title = { AppText("Add ${module.label.lowercase()} record") },
        text = {
            Column(Modifier.heightIn(max = 450.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(name, { name = it }, label = { AppText(module.name) }, singleLine = true, modifier = Modifier.fillMaxWidth())
                module.fields.forEach { field ->
                    val value = fields[field.key].orEmpty()
                    if (field.type == "reference") {
                        val options = records.filter { it.optString("module") == field.module }.map {
                            val nameWithContext = if (field.module == "seats") {
                                val seat = it.getJSONObject("values")
                                "${it.getString("name")} · ${seat.getString("section")} · ${names[seat.optString("show")].orEmpty()}"
                            } else it.getString("name")
                            it.getString("id") to "$nameWithContext · ${it.getString("status")}"
                        }
                        ToolSelect(field.label, value, listOf("" to "Choose ${field.label.lowercase()}") + options) { fields[field.key] = it }
                    } else {
                        val label = when (field.type) {
                            "date" -> "${field.label} (YYYY-MM-DD)"
                            "datetime" -> "${field.label} (YYYY-MM-DD HH:MM)"
                            else -> field.label
                        }
                        OutlinedTextField(value, { fields[field.key] = it }, label = { AppText(label) }, singleLine = true, modifier = Modifier.fillMaxWidth(),
                            keyboardOptions = KeyboardOptions(keyboardType = when (field.type) {
                                "money" -> KeyboardType.Decimal
                                "count" -> KeyboardType.Number
                                else -> KeyboardType.Text
                            }))
                    }
                }
                if (error.isNotBlank() || serverError.isNotBlank()) AppText(error.ifBlank { serverError }, color = Coral)
            }
        },
        confirmButton = {
            TextButton(enabled = !busy && name.isNotBlank() && module.fields.all { it.optional || !fields[it.key].isNullOrBlank() }, onClick = {
                val values = JSONObject()
                try {
                    module.fields.forEach { field ->
                        val raw = fields[field.key].orEmpty().trim()
                        if (field.optional && raw.isBlank()) return@forEach
                        val value = runCatching {
                            when (field.type) {
                                "money" -> {
                                    require(raw.matches(Regex("\\d{1,11}(\\.\\d{1,2})?")))
                                    raw.toBigDecimal().movePointRight(2).longValueExact()
                                }
                                "count" -> raw.toInt()
                                "datetime" -> LocalDateTime.parse(raw.replace(' ', 'T')).atOffset(ZoneOffset.ofHours(3)).toInstant().toString()
                                else -> raw
                            }
                        }.getOrElse { error = "Check ${field.label}."; return@TextButton }
                        values.put(field.key, value)
                    }
                    error = ""
                    submit(name.trim(), values)
                } catch (issue: IllegalArgumentException) {
                    error = issue.message ?: "Check the record fields."
                }
            }) { AppText("Save record") }
        },
        dismissButton = { TextButton(onClick = close, enabled = !busy) { AppText("Cancel") } },
    )
}

private val ticketPattern = Regex("[A-Fa-f0-9]{16}")

private val showtimeFormat = DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm", Locale.UK).withZone(ZoneId.of("Africa/Nairobi"))
internal fun showtimeLabel(value: String) = showtimeFormat.format(Instant.parse(value))

@Composable
private fun TicketBarcode(code: String) {
    Column(Modifier.fillMaxWidth().background(Color.White).padding(horizontal = 12.dp, vertical = 8.dp)) {
        Canvas(Modifier.fillMaxWidth().height(54.dp)) {
            val widths = ticketWidths(code)
            val unit = size.width / widths.sum()
            var x = 0f
            widths.forEachIndexed { index, width ->
                if (index % 2 == 0) drawRect(Color.Black, Offset(x, 0f), Size(width * unit, size.height))
                x += width * unit
            }
        }
        AppText(code, color = Color.Black)
    }
}
