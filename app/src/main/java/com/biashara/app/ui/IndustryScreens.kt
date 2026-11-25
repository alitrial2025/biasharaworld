package com.biashara.app.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
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
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.biashara.app.data.DemoStore
import com.biashara.app.data.LiveBackend
import com.biashara.app.data.json
import com.biashara.app.data.minorMoney
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import org.json.JSONObject

@Composable
internal fun LiveIndustryHome(
    store: DemoStore,
    catalog: IndustryCatalog,
    industry: Industry,
    role: String,
    open: (String, String) -> Unit,
) {
    Page {
        Eyebrow(industry.label)
        PageTitle("Hi ${store.ownerName.substringBefore(' ')}", store.businessName)
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
internal fun LiveIndustryRecordsScreen(backend: LiveBackend, industry: Industry, role: String, initialModule: String, back: () -> Unit) {
    var data by remember { mutableStateOf<JSONObject?>(null) }
    var selected by rememberSaveable { mutableStateOf(initialModule) }
    var filter by rememberSaveable { mutableStateOf("") }
    var ticket by rememberSaveable { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var notice by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var adding by remember { mutableStateOf(false) }
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

    LaunchedEffect(backend, industry.id, role) { load() }

    Page {
        PageTitle(industry.label, onBack = back) { TextButton(onClick = { scope.launch { load() } }, enabled = !busy) { AppText("Refresh") } }
        if (industry.id == "finance") AppText("Managers submit cases and the owner reviews them. Case decisions are internal records.", color = Muted)
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
            ToolSelect("Record type", module.id, industry.modules.map { it.id to it.label }) { selected = it; filter = "" }
            if (industry.id != "finance" || role == "Manager") {
                PrimaryButton("Add record", { adding = true }, enabled = !busy, tone = Green)
            }
            OutlinedTextField(filter, { filter = it }, label = { AppText("Search ${module.label.lowercase()}") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            val matches = records.filter {
                it.optString("module") == module.id && "${it.optString("name")} ${it.optString("status")} ${it.optJSONObject("values")}".contains(filter.trim(), true)
            }
            if (matches.isEmpty()) AppText("No matching records.", color = Muted)
            matches.forEach { record ->
                val status = record.getString("status")
                val fields = record.getJSONObject("values")
                SurfaceCard {
                    AppText(record.getString("name"), style = MaterialTheme.typography.titleMedium)
                    val expired = status == "Reserved" && record.optString("expiresAt").let { it.isNotEmpty() && Instant.parse(it).isBefore(Instant.now()) }
                    AppText(if (expired) "Reservation expired" else status, color = Green)
                    module.fields.filter { fields.has(it.key) }.forEach { field ->
                        val value = when (field.type) {
                            "money" -> minorMoney(fields.getLong(field.key))
                            "reference" -> records.firstOrNull { it.optString("id") == fields.optString(field.key) }?.optString("name").orEmpty()
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
                    module.flow.optJSONArray(status)?.strings().orEmpty().filter { next ->
                        !(industry.id == "finance" && next in listOf("Approved", "Declined") && (role != "Owner" || record.optBoolean("own")))
                    }.forEach { next ->
                        TextButton(enabled = !busy, onClick = {
                            if (actionReference(module.id, next, fields).isBlank()) transition(record, next) else action = record to next
                        }) { AppText("Mark as ${next.lowercase()}") }
                    }
                }
            }
        }
    }

    if (adding) IndustryRecordDialog(module, records, error, busy, { adding = false }) { name, values ->
        save(json("action" to "create", "name" to name, "module" to module.id, "values" to values)) { adding = false }
    }
    action?.let { (record, status) ->
        var reference by remember(record, status) { mutableStateOf("") }
        val label = actionReference(module.id, status, record.getJSONObject("values"))
        AlertDialog(
            onDismissRequest = { if (!busy) action = null },
            title = { AppText("Mark as ${status.lowercase()}") },
            text = { Column {
                OutlinedTextField(reference, { reference = it }, label = { AppText(label) }, singleLine = true)
                if (error.isNotBlank()) AppText(error, color = Coral)
            } },
            confirmButton = { TextButton(onClick = { transition(record, status, reference) }, enabled = !busy && reference.isNotBlank()) { AppText("Confirm") } },
            dismissButton = { TextButton(onClick = { action = null }, enabled = !busy) { AppText("Cancel") } },
        )
    }
}

private fun actionReference(module: String, status: String, values: JSONObject) = when {
    status == "Received" && module in listOf("rent", "premiums") && !values.has("payment") -> "Payment reference"
    status == "Issued" && module == "tickets" && values.optLong("amount") > 0 -> "Payment reference"
    status == "Delivered" && module == "dispatch" && !values.has("proof") -> "Proof of delivery"
    else -> ""
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
                            it.getString("id") to "${it.getString("name")} · ${it.getString("status")}"
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
private fun showtimeLabel(value: String) = showtimeFormat.format(Instant.parse(value))

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
