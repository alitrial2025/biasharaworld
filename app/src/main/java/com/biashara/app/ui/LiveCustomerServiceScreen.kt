package com.biashara.app.ui

import androidx.compose.foundation.layout.Column
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.biashara.app.data.DemoStore
import com.biashara.app.data.json
import com.biashara.app.data.records
import java.util.UUID
import org.json.JSONObject

@Composable
fun LiveCustomerServiceScreen(store: DemoStore, onBack: () -> Unit) {
    val backend = store.backend
    val customers = store.liveState.records("customers")
    var selected by remember { mutableIntStateOf(0) }
    var page by remember { mutableIntStateOf(0) }
    var data by remember { mutableStateOf<JSONObject?>(null) }
    var body by remember { mutableStateOf("") }
    var redraw by remember { mutableStateOf<String?>(null) }
    var reason by remember { mutableStateOf("") }
    var notice by remember { mutableStateOf("") }
    var request by remember { mutableStateOf<Pair<String, String>?>(null) }

    fun load(customer: Int, nextPage: Int) {
        backend?.action {
            data = backend.customerService(customer, nextPage)
            if (selected != customer) {
                body = ""
                notice = ""
            }
            selected = customer
            page = nextPage
        }
    }

    Page {
        PageTitle("Customer service notes", onBack = onBack)
        if (backend == null || backend.role !in listOf("Owner", "Manager")) {
            AppText("An owner or manager can view notes for this business.")
            return@Page
        }
        if (customers.isEmpty()) AppText("Add a customer before saving a note.")
        else ToolSelect("Customer", if (selected == 0) "Choose a customer" else selected.toString(), customers.map {
            it.getString("id") to it.getString("name")
        }) { load(it.toInt(), 0) }
        if (backend.error.isNotBlank()) AppText(backend.error, color = Coral)
        if (notice.isNotBlank()) AppText(notice)
        if (selected != 0) {
            OutlinedTextField(body, { body = it.take(2000) }, label = { AppText("Service note") }, maxLines = 5)
            PrimaryButton("Save note", {
                backend.action {
                    val signature = "$selected:${body.trim()}"
                    val key = request?.takeIf { it.first == signature }?.second
                        ?: UUID.randomUUID().toString().also { request = signature to it }
                    backend.customerService(selected, command = json("action" to "add", "customer" to selected, "id" to key, "body" to body))
                    body = ""
                    notice = "Note saved."
                    request = null
                    data = backend.customerService(selected)
                    page = 0
                }
            }, enabled = body.isNotBlank() && !backend.busy, tone = Green)

            val notes = data?.records("notes").orEmpty()
            if (data != null && notes.isEmpty()) AppText("No notes for this customer.")
            for (note in notes) SurfaceCard {
                val visible = !note.isNull("body")
                AppText(if (visible) note.getString("body") else "Note content removed")
                AppText(note.getString("recorded_at").take(10))
                if (!note.isNull("redact_reason")) AppText(note.getString("redact_reason"))
                if (visible && backend.role == "Owner") TextButton(onClick = {
                    reason = ""
                    redraw = note.getString("id")
                }, enabled = !backend.busy) { AppText("Redact note") }
            }
            if (page > 0) PrimaryButton("Previous page", { load(selected, page - 1) }, enabled = !backend.busy, tone = Green)
            data?.takeUnless { it.isNull("nextPage") }?.optInt("nextPage")?.let { next ->
                PrimaryButton("Next page", { load(selected, next) }, enabled = !backend.busy, tone = Green)
            }
        }
    }
    val note = redraw
    if (note != null && backend?.role == "Owner") AlertDialog(
        title = { AppText("Remove note content") },
        onDismissRequest = { redraw = null },
        text = { Column {
            OutlinedTextField(reason, { reason = it.take(200) }, label = { AppText("Reason for redaction") })
            if (backend.error.isNotBlank()) AppText(backend.error, color = Coral)
        } },
        confirmButton = { TextButton(enabled = reason.isNotBlank() && !backend.busy, onClick = {
            backend.action {
                backend.customerService(selected, command = json("action" to "redact", "id" to note, "reason" to reason))
                redraw = null
                notice = "Note content removed."
                data = backend.customerService(selected)
                page = 0
            }
        }) { AppText("Remove note content") } },
        dismissButton = { TextButton(onClick = { redraw = null }) { AppText("Cancel") } },
    )
}
