package com.biashara.app.ui

import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import com.biashara.app.BuildConfig
import com.biashara.app.data.DemoStore
import com.biashara.app.data.json
import com.biashara.app.data.minorMoney
import com.biashara.app.data.parseMinor
import com.biashara.app.data.records
import com.biashara.app.data.workspaceZone
import java.math.BigDecimal
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.format.ResolverStyle
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import org.json.JSONObject

private val appointmentFormat = DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm").withResolverStyle(ResolverStyle.STRICT)

@Composable
internal fun LiveCustomerAccessScreen(store: DemoStore, sector: String, back: () -> Unit) {
    val backend = store.backend ?: return
    val context = LocalContext.current
    val uri = LocalUriHandler.current
    val scope = rememberCoroutineScope()
    val host = BuildConfig.API_URL.trimEnd('/').ifBlank { "https://biasharaworld.vercel.app" }
    var data by remember(backend, sector) { mutableStateOf<JSONObject?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var notice by remember { mutableStateOf("") }
    var draft by remember { mutableStateOf<JSONObject?>(null) }
    var receipt by remember { mutableStateOf<Pair<String, String>?>(null) }

    fun share(label: String, text: String) {
        val intent = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text)
        context.startActivity(Intent.createChooser(intent, label))
    }
    suspend fun load() {
        data = backend.customerAccess()
    }
    fun run(input: JSONObject? = null, message: String = "") {
        if (busy) return
        busy = true
        error = ""
        scope.launch {
            try {
                if (input != null) {
                    val saved = backend.customerAccess(input)
                    val rent = input.optString("rentId")
                    if (saved.has("path")) receipt = rent to saved.getString("path")
                    if (input.optString("action") == "revokeReceiptLink" && receipt?.first == rent) receipt = null
                    draft = null
                    notice = message
                }
                load()
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (failure: Exception) {
                error = failure.message ?: "Could not load customer access."
            } finally {
                busy = false
            }
        }
    }

    LaunchedEffect(backend, sector) { run() }
    val flow = data?.optString("flow").orEmpty()
    val title = when (sector) {
        "services" -> "Public appointments"
        "entertainment" -> "Public ticketing"
        else -> "Rent receipts and reminders"
    }
    val slots = data?.records("slots").orEmpty()
    val services = data?.records("services").orEmpty()
    val team = data?.records("staff").orEmpty()
    val offers = data?.records("offers").orEmpty().associateBy { it.optString("show_id") }
    val rentLinks = data?.records("links").orEmpty().associateBy { it.optString("rent_id") }

    Page {
        PageTitle(title, onBack = back)
        if (notice.isNotEmpty()) AppText(notice, color = Green)
        if (error.isNotEmpty()) AppText(error, color = Coral)
        if (flow.isEmpty()) {
            TextButton(onClick = { run() }, enabled = !busy) { AppText(if (busy) "Loading…" else "Refresh") }
            return@Page
        }
        if (flow == "services" || flow == "events") {
            val path = "/portal/${data?.optString("slug")}/$flow"
            SurfaceCard {
                TextButton(onClick = { uri.openUri(host + path) }) { AppText("Open customer page") }
                TextButton(onClick = { share("Share customer page", host + path) }) { AppText("Share customer page") }
            }
        }
        when (flow) {
            "services" -> {
                PrimaryButton("Publish an appointment time", { draft = JSONObject() }, enabled = !busy && services.isNotEmpty() && team.isNotEmpty())
                if (services.isEmpty()) AppText("Add an active service in Staff bookings.")
                if (slots.isEmpty()) AppText("No upcoming times.")
                slots.forEach { slot ->
                    SurfaceCard {
                        val service = services.firstOrNull { it.optInt("id") == slot.optInt("service_id") }
                        AppText(service?.optString("name") ?: "Service", style = MaterialTheme.typography.titleMedium)
                        AppText(showtimeLabel(slot.optString("starts_at")) + " EAT")
                        if (!slot.isNull("booking_id")) AppText("Booked · #${slot.optInt("booking_id")}")
                        else TextButton(onClick = { run(json("action" to "closeSlot", "id" to slot.getString("id")), "Time removed from public booking.") },
                            enabled = !busy) { AppText("Close time") }
                    }
                }
            }
            "events" -> {
                AppText("Guests with paid holds complete payment at the venue. Record the payment reference in Tickets to issue the barcode.", color = Muted)
                val shows = data?.records("shows").orEmpty()
                if (shows.isEmpty()) AppText("Set up a showtime and add seats.")
                shows.forEach { show ->
                    val id = show.getString("id")
                    val offer = offers[id]
                    SurfaceCard {
                        AppText(show.getString("name"), style = MaterialTheme.typography.titleMedium)
                        AppText(showtimeLabel(show.optString("startsAt")) + " EAT")
                        if (offer?.optBoolean("enabled") == true) AppText("Published · ${minorMoney(offer.optLong("price_minor"))}")
                        TextButton(onClick = { draft = show }, enabled = !busy) { AppText(if (offer?.optBoolean("enabled") == true) "Update offer" else "Publish showtime") }
                        if (offer?.optBoolean("enabled") == true) TextButton(onClick = {
                            run(json("action" to "hideShow", "showId" to id), "Public seat reservations closed.")
                        }, enabled = !busy) { AppText("Close public offer") }
                    }
                }
            }
            "rent" -> {
                val items = data?.records("records").orEmpty()
                if (items.isEmpty()) AppText("Add a rent record first.")
                items.forEach { rent ->
                    val id = rent.getString("id")
                    val amount = minorMoney(rent.optLong("amount"))
                    SurfaceCard {
                        AppText(rent.getString("reference"), style = MaterialTheme.typography.titleMedium)
                        AppText("$amount · ${rent.optString("status")}")
                        AppText("Due ${rent.optString("due")}")
                        if (rent.optString("status") == "Due") TextButton(onClick = {
                            val text = "Hello, this is a reminder from ${store.businessName}. Rent ref ${rent.optString("reference")} " +
                                "for $amount is due on ${rent.optString("due")}. Please contact us if you have already paid or need help."
                            share("Share rent reminder", text)
                        }) { AppText("Prepare rent reminder") }
                        else {
                            TextButton(onClick = { draft = rent }, enabled = !busy) {
                                AppText(if (rentLinks.containsKey(id)) "Replace receipt link" else "Create receipt link")
                            }
                            if (rentLinks.containsKey(id)) TextButton(onClick = {
                                run(json("action" to "revokeReceiptLink", "rentId" to id), "Receipt link revoked.")
                            }, enabled = !busy) { AppText("Revoke link") }
                            receipt?.takeIf { it.first == id }?.let { (_, path) ->
                                TextButton(onClick = { share("Share private rent receipt", host + path) }) { AppText("Share receipt link") }
                            }
                        }
                    }
                }
            }
        }
    }
    draft?.let { item -> key(flow, item.optString("id")) {
        AccessForm(flow, item, services, team, offers[item.optString("id")], busy, error, { draft = null }, ::run)
    } }
}

@Composable
private fun AccessForm(
    flow: String, item: JSONObject, services: List<JSONObject>, team: List<JSONObject>,
    offer: JSONObject?, busy: Boolean, error: String, close: () -> Unit, save: (JSONObject, String) -> Unit,
) {
    val serviceRows = services.map { it.getString("id") to it.getString("name") }
    val memberRows = team.map { it.getString("id") to it.getString("name") }
    var service by remember { mutableStateOf(serviceRows.firstOrNull()?.first.orEmpty()) }
    var member by remember { mutableStateOf(memberRows.firstOrNull()?.first.orEmpty()) }
    var value by remember { mutableStateOf(if (flow == "events") BigDecimal.valueOf(offer?.optLong("price_minor") ?: 0L, 2).toPlainString() else "") }
    var invalid by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = { if (!busy) close() },
        title = { AppText(when (flow) {
            "services" -> "Publish an appointment time"
            "events" -> "Publish showtime"
            else -> "Private rent receipt"
        }) },
        text = {
            Column(Modifier.heightIn(max = 400.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (flow == "services") {
                    ToolSelect("Service", service, serviceRows) { service = it }
                    ToolSelect("Team member", member, memberRows) { member = it }
                }
                val label = when (flow) {
                    "services" -> "Start in Kenya time (YYYY-MM-DD HH:MM)"
                    "events" -> "Price per seat (KES)"
                    else -> "Tenant email"
                }
                OutlinedTextField(value, { value = it.take(254) }, label = { AppText(label) }, singleLine = true)
                if (flow == "rent") AppText("Links expire after 30 days. Creating a new link replaces the current one.")
                if (invalid.isNotEmpty()) AppText(invalid, color = Coral)
                if (error.isNotEmpty()) AppText(error, color = Coral)
            }
        },
        confirmButton = {
            TextButton(enabled = !busy && value.isNotBlank(), onClick = {
                try {
                    when (flow) {
                        "services" -> {
                            val time = LocalDateTime.parse(value, appointmentFormat).atZone(workspaceZone).toInstant().toString()
                            save(json("action" to "addSlot", "serviceId" to service.toInt(), "memberId" to member.toInt(),
                                "startsAt" to time), "Appointment time published.")
                        }
                        "events" -> save(json("action" to "publishShow", "showId" to item.getString("id"),
                            "price" to parseMinor(value)), "Showtime published.")
                        else -> save(json("action" to "issueReceiptLink", "rentId" to item.getString("id"),
                            "email" to value.trim()), "Private receipt link created.")
                    }
                } catch (_: IllegalArgumentException) {
                    invalid = "Check the details and try again."
                } catch (_: java.time.DateTimeException) {
                    invalid = "Enter a valid date and time."
                }
            }) { AppText("Save") }
        },
        dismissButton = { TextButton(onClick = close, enabled = !busy) { AppText("Cancel") } },
    )
}
