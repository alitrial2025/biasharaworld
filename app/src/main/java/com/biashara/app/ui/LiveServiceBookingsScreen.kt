package com.biashara.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.biashara.app.data.DemoStore
import com.biashara.app.data.bookingNeedsAttention
import com.biashara.app.data.workspaceZone
import com.biashara.app.data.json
import com.biashara.app.data.minorMoney
import com.biashara.app.data.parseMinor
import com.biashara.app.data.records
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDateTime
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.ResolverStyle
import org.json.JSONObject

private val bookingFormat = DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm").withResolverStyle(ResolverStyle.STRICT)
private fun kenyaBookingTime(instant: String) = Instant.parse(instant).atZone(workspaceZone).format(bookingFormat)

@Composable
fun LiveServiceBookingsScreen(store: DemoStore, onBack: () -> Unit, initialToday: Boolean = false, customerAccess: (() -> Unit)? = null) {
    val backend = store.backend
    val allowed = backend?.role in listOf("Owner", "Manager")
    val services = store.operations.state.records("services")
    var todayOnly by rememberSaveable { mutableStateOf(initialToday) }
    var limit by rememberSaveable { mutableIntStateOf(30) }
    val today = LocalDate.now(workspaceZone)
    val bookings = store.operations.state.records("bookings").filter { !todayOnly || bookingNeedsAttention(it, today) }
    val ordered = if (todayOnly) bookings.sortedBy { it.optString("startsAt") } else bookings.sortedByDescending { it.optString("startsAt") }
    val customers = store.liveState.records("customers")
    val members = store.liveState.records("members").filter { it.optString("status") == "Active" }
    var service by remember { mutableStateOf<JSONObject?>(null) }
    var booking by remember { mutableStateOf<JSONObject?>(null) }
    var notice by remember { mutableStateOf("") }

    fun save(input: JSONObject) {
        backend?.action {
            val result = backend.command(input)
            notice = result.optString("message")
            service = null
            booking = null
        }
    }

    Page {
        PageTitle("Services and bookings", onBack = onBack)
        if (backend == null || !allowed) {
            AppText("An owner or manager can manage the service schedule.")
            return@Page
        }
        customerAccess?.let { open -> TextButton(onClick = open) { AppText("Public appointments") } }
        if (backend.error.isNotBlank()) AppText(backend.error, color = Coral)
        if (notice.isNotBlank()) AppText(notice)
        AppText("Service catalogue")
        PrimaryButton("Add service", { service = JSONObject() }, enabled = !backend.busy, tone = Green)
        for (item in services) SurfaceCard {
            AppText("${item.getString("name")} · ${item.getInt("duration")} min · ${minorMoney(item.getLong("priceMinor"))}")
            if (!item.optBoolean("active")) AppText("Hidden")
            TextButton(enabled = !backend.busy, onClick = { service = item }) { AppText("Edit service") }
        }
        AppText("Bookings")
        FilterPills(listOf("Bookings today", "All bookings"), if (todayOnly) "Bookings today" else "All bookings", {
            todayOnly = it == "Bookings today"; limit = 30
        })
        val canSchedule = services.any { it.optBoolean("active") } && customers.isNotEmpty() && members.isNotEmpty()
        PrimaryButton("Schedule booking", { booking = JSONObject() }, enabled = canSchedule && !backend.busy, tone = Green)
        if (!canSchedule) AppText("Add a customer and an active service to schedule a booking.")
        if (ordered.isEmpty()) AppText(if (todayOnly) "No open bookings today." else "No bookings yet.")
        for (item in ordered.take(limit)) SurfaceCard {
            val status = item.getString("status")
            val id = item.getInt("id")
            AppText(item.getString("serviceName"))
            AppText("${kenyaBookingTime(item.getString("startsAt"))} · ${item.getInt("duration")} min · ${minorMoney(item.getLong("priceMinor"))}")
            AppText(listOf(
                customers.firstOrNull { it.optInt("id") == item.getInt("customerId") }?.optString("name") ?: "Customer",
                members.firstOrNull { it.optInt("id") == item.getInt("memberId") }?.optString("name") ?: "Former team member",
            ).joinToString(" · "))
            AppText(status)
            if (status == "Scheduled") {
                PrimaryButton("Reschedule", { booking = item }, enabled = !backend.busy, tone = Green)
                PrimaryButton("Start service", { save(json("type" to "bookingStatus", "id" to id, "status" to "In progress")) }, enabled = !backend.busy, tone = Green)
            }
            if (status == "In progress") PrimaryButton("Complete service", {
                save(json("type" to "bookingStatus", "id" to id, "status" to "Completed"))
            }, enabled = !backend.busy, tone = Green)
            if (status in listOf("Scheduled", "In progress")) TextButton(enabled = !backend.busy, onClick = {
                save(json("type" to "bookingStatus", "id" to id, "status" to "Cancelled"))
            }) { AppText("Cancel booking") }
        }
        if (ordered.size > limit) TextButton(onClick = { limit += 30 }) { AppText("Show more bookings") }
    }
    if (backend != null && allowed) {
        service?.let { ServiceForm(it, backend.busy, backend.error, { service = null }, ::save) }
        booking?.let {
            BookingForm(it, services.filter { item -> item.optBoolean("active") }, customers, members,
                backend.busy, backend.error, { booking = null }, ::save)
        }
    }
}

@Composable
private fun ServiceForm(service: JSONObject, busy: Boolean, error: String, close: () -> Unit, save: (JSONObject) -> Unit) {
    var name by remember(service) { mutableStateOf(service.optString("name")) }
    var duration by remember(service) { mutableStateOf(service.optInt("duration", 30).toString()) }
    var price by remember(service) { mutableStateOf(BigDecimal.valueOf(service.optLong("priceMinor"), 2).toPlainString()) }
    var active by remember(service) { mutableStateOf(service.optBoolean("active", true)) }
    var invalid by remember(service) { mutableStateOf("") }
    AlertDialog(onDismissRequest = close, title = { AppText("Service details") }, text = {
        Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(name, { name = it.take(120) }, label = { AppText("Service name") })
            OutlinedTextField(duration, { duration = it.filter(Char::isDigit).take(4) }, label = { AppText("Duration (minutes)") })
            OutlinedTextField(price, { price = it.take(14) }, label = { AppText("Price (KES)") })
            Row { Checkbox(active, { active = it }); AppText("Accept bookings for this service") }
            if (invalid.isNotBlank()) AppText(invalid, color = Coral)
            if (error.isNotBlank()) AppText(error, color = Coral)
        }
    }, confirmButton = {
        TextButton(enabled = name.isNotBlank() && !busy, onClick = {
            try {
                val input = json("type" to "saveService", "name" to name, "duration" to (duration.toIntOrNull() ?: 0),
                    "priceMinor" to parseMinor(price), "active" to active)
                if (service.has("id")) input.put("id", service.getInt("id"))
                save(input)
            } catch (failure: IllegalArgumentException) {
                invalid = failure.message ?: "Check the service price."
            }
        }) { AppText("Save service") }
    }, dismissButton = { TextButton(onClick = close) { AppText("Close") } })
}

@Composable
private fun BookingForm(booking: JSONObject, services: List<JSONObject>, customers: List<JSONObject>, members: List<JSONObject>,
    busy: Boolean, error: String, close: () -> Unit, save: (JSONObject) -> Unit,
) {
    val reschedule = booking.has("id")
    fun options(records: List<JSONObject>) = records.map { it.getString("id") to it.getString("name") }
    var service by remember(booking) { mutableStateOf(services.firstOrNull()?.optString("id").orEmpty()) }
    var customer by remember(booking) { mutableStateOf(booking.optString("customerId", customers.firstOrNull()?.optString("id").orEmpty())) }
    var member by remember(booking) { mutableStateOf(booking.optString("memberId", members.firstOrNull()?.optString("id").orEmpty())) }
    var date by remember(booking) { mutableStateOf(if (reschedule) kenyaBookingTime(booking.getString("startsAt")) else "") }
    var invalid by remember(booking) { mutableStateOf("") }
    AlertDialog(onDismissRequest = close, title = { AppText(if (reschedule) "Reschedule booking" else "Schedule booking") }, text = {
        Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            if (!reschedule) ToolSelect("Service", service, options(services)) { service = it }
            ToolSelect("Customer", customer, options(customers)) { customer = it }
            ToolSelect("Team member", member, options(members)) { member = it }
            OutlinedTextField(date, { date = it.take(16) }, label = { AppText("Start in Kenya time (YYYY-MM-DD HH:MM)") })
            if (invalid.isNotBlank()) AppText(invalid, color = Coral)
            if (error.isNotBlank()) AppText(error, color = Coral)
        }
    }, confirmButton = {
        TextButton(enabled = customer.isNotBlank() && member.isNotBlank() && date.isNotBlank() && !busy, onClick = {
            val startsAt = runCatching { LocalDateTime.parse(date, bookingFormat).atZone(workspaceZone).toInstant().toString() }.getOrNull()
            if (startsAt == null) { invalid = "Enter a valid date and time."; return@TextButton }
            val input = json("type" to (if (reschedule) "rescheduleBooking" else "scheduleBooking"),
                "customerId" to customer.toInt(), "memberId" to member.toInt(), "startsAt" to startsAt)
            if (reschedule) input.put("id", booking.getInt("id")) else input.put("serviceId", service.toInt())
            save(input)
        }) { AppText("Save booking") }
    }, dismissButton = { TextButton(onClick = close) { AppText("Close") } })
}
