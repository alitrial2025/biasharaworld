package com.biashara.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.biashara.app.data.DemoStore
import com.biashara.app.data.json
import com.biashara.app.data.minorMoney
import com.biashara.app.data.parseMinor
import com.biashara.app.data.records
import java.math.BigDecimal
import java.util.UUID
import org.json.JSONArray
import org.json.JSONObject

private val networkStatuses = mapOf(
    "requested" to "Quote requested", "quoted" to "Quote ready", "ordered" to "Purchase order confirmed",
    "dispatched" to "Dispatched", "disputed" to "Delivery discrepancy", "received" to "Received", "invoiced" to "Invoice due",
    "paid" to "Buyer recorded payment", "cancelled" to "Cancelled", "declined" to "Declined",
)
private val networkActions = mapOf(
    "profile" to "Publish supplier listing", "request" to "Send quote request", "quote" to "Share quote",
    "decline" to "Decline request", "accept" to "Confirm purchase order", "cancel" to "Cancel request",
    "dispatch" to "Share dispatch details", "receive" to "Confirm receipt", "dispute" to "Report discrepancy",
    "invoice" to "Share invoice", "record_payment" to "Record payment",
)
private data class ExchangeForm(val action: String, val value: JSONObject? = null)
private data class ExchangeRetry(val signature: String, val id: String, val requestId: String)
private fun JSONObject.present(key: String): String? = takeUnless { isNull(key) }?.optString(key)?.takeIf(String::isNotBlank)
private fun minorText(amount: Long): String = BigDecimal.valueOf(amount, 2).toPlainString()
private fun newId() = UUID.randomUUID().toString()

@Composable
fun LiveSupplierNetworkScreen(store: DemoStore, onBack: () -> Unit) {
    val backend = store.backend
    val permitted = backend?.role in listOf("Owner", "Manager")
    var directory by remember { mutableStateOf<JSONObject?>(null) }
    var details by remember { mutableStateOf<JSONObject?>(null) }
    var search by remember { mutableStateOf("") }
    var draft by remember { mutableStateOf("") }
    var supplierCursors by remember { mutableStateOf(emptyList<String>()) }
    var inbox by remember { mutableIntStateOf(0) }
    var form by remember { mutableStateOf<ExchangeForm?>(null) }
    var stockOrder by remember { mutableStateOf<JSONObject?>(null) }
    var retry by remember { mutableStateOf<ExchangeRetry?>(null) }

    fun load(query: String, cursors: List<String>, page: Int) {
        backend?.action {
            directory = backend.supplierExchange(query, cursors.lastOrNull(), page)
            search = query
            supplierCursors = cursors
            inbox = page
        }
    }
    fun save(command: JSONObject) {
        backend?.action {
            val action = command.getString("action")
            if (action != "profile") {
                val signature = command.toString()
                val pending = retry?.takeIf { it.signature == signature }
                    ?: ExchangeRetry(signature, command.present("id") ?: newId(), newId()).also { retry = it }
                command.put("id", pending.id).put("requestId", pending.requestId)
            }
            val response = backend.supplierExchange(command = command)
            retry = null
            form = null
            stockOrder = null
            directory = backend.supplierExchange(search, supplierCursors.lastOrNull(), inbox)
            response.present("id")?.let { details = backend.supplierExchange(exchange = it) }
            if (response.optBoolean("stocked")) backend.load()
        }
    }

    LaunchedEffect(backend, backend?.slug, permitted) {
        if (permitted) load("", emptyList(), 0)
    }

    Page {
        PageTitle("Supplier network", onBack = onBack)
        if (backend == null || !permitted) {
            AppText("An owner or manager can manage supplier exchanges.")
            return@Page
        }
        val current = directory
        val verified = current?.optBoolean("verified") == true
        if (backend.error.isNotBlank()) AppText(backend.error, color = Coral)
        if (!verified && current != null) AppText("Complete merchant verification to list your business or confirm new purchases.")
        if (current != null && backend.role == "Owner") {
            val profile = current.optJSONObject("profile")
            SurfaceCard {
                AppText("Your supplier listing")
                AppText(if (profile?.optBoolean("visible") == true && verified) "Visible to businesses in the network." else "Your listing is hidden.")
                PrimaryButton("Edit supplier listing", { form = ExchangeForm("profile", profile) }, enabled = verified && !backend.busy, tone = Green)
                if (profile?.optBoolean("visible") == true) {
                    TextButton(enabled = !backend.busy, onClick = {
                        save(json("action" to "profile", "visible" to false))
                    }) { AppText("Hide listing") }
                }
            }
        }

        AppText("Find suppliers")
        OutlinedTextField(draft, { draft = it.take(120) }, label = { AppText("Name, area or item") }, singleLine = true)
        PrimaryButton("Search suppliers", { load(draft, emptyList(), inbox) }, enabled = !backend.busy, tone = Green)
        val suppliers = current?.records("suppliers").orEmpty()
        if (current != null && suppliers.isEmpty()) AppText("No verified supplier listings match this search.")
        for (supplier in suppliers) SurfaceCard {
            AppText(supplier.getString("display_name"))
            AppText("${supplier.getString("coverage")} · ${supplier.getInt("lead_days")} day lead time")
            AppText("Minimum ${minorMoney(supplier.getLong("minimum_minor"))}")
            supplier.present("terms")?.let { AppText(it) }
            for (row in supplier.records("catalogue")) {
                AppText("${row.getString("item")} · ${minorMoney(row.getLong("unitMinor"))} per ${row.getString("unit")}")
            }
            PrimaryButton("Request a quote", { form = ExchangeForm("request", supplier) }, enabled = verified && !backend.busy, tone = Green)
        }
        if (supplierCursors.isNotEmpty()) PrimaryButton("Previous suppliers", { load(search, supplierCursors.dropLast(1), inbox) }, enabled = !backend.busy, tone = Green)
        current?.present("nextSupplier")?.let { next ->
            PrimaryButton("Next suppliers", { load(search, supplierCursors + next, inbox) }, enabled = !backend.busy, tone = Green)
        }

        AppText("Quotes and orders")
        val exchanges = current?.records("exchanges").orEmpty()
        if (current != null && exchanges.isEmpty()) AppText("No exchanges on this page.")
        for (exchange in exchanges) {
            val partner = if (exchange.getString("side") == "buyer") "supplier_name" else "buyer_name"
            PrimaryButton("${exchange.getString(partner)} · ${networkStatuses[exchange.getString("status")]}", {
                backend.action { details = backend.supplierExchange(exchange = exchange.getString("id")) }
            }, enabled = !backend.busy, tone = Green)
        }
        if (inbox > 0) PrimaryButton("Previous orders", { load(search, supplierCursors, inbox - 1) }, enabled = !backend.busy, tone = Green)
        current?.takeUnless { it.isNull("nextPage") }?.optInt("nextPage")?.let { next ->
            PrimaryButton("Next orders", { load(search, supplierCursors, next) }, enabled = !backend.busy, tone = Green)
        }

        val selected = details?.optJSONObject("exchange")
        if (selected != null) SurfaceCard {
            AppText("${selected.getString("buyer_name")} and ${selected.getString("supplier_name")}")
            AppText(networkStatuses[selected.getString("status")].orEmpty())
            for (line in selected.records("requested_lines")) {
                AppText("Requested · ${line.getInt("quantity")} ${line.getString("unit")} · ${line.getString("item")}")
            }
            for (line in selected.records("offered_lines")) {
                AppText("Quoted · ${line.getInt("quantity")} ${line.getString("unit")} · ${line.getString("item")} · ${minorMoney(line.getLong("unitMinor"))} per unit")
            }
            if (!selected.isNull("quote_minor")) AppText("Delivery ${minorMoney(selected.getLong("delivery_fee_minor"))} · Total ${minorMoney(selected.getLong("quote_minor"))}")
            selected.present("invoice_reference")?.let { AppText("Invoice $it · Due ${selected.getString("due_on")}") }
            val stockReceipt = details?.optJSONObject("stockReceipt")
            if (stockReceipt != null) AppText("Stock recorded · ${stockReceipt.getString("recorded_at").take(10)}")
            if (stockReceipt == null && selected.getString("side") == "buyer" && selected.getString("status") in listOf("received", "invoiced", "paid")) {
                PrimaryButton("Record inventory receipt", { stockOrder = selected }, enabled = !backend.busy, tone = Green)
            }
            for (event in details?.records("events").orEmpty()) {
                val step = event.getString("action")
                AppText("${event.getString("recorded_at").take(10)} · ${event.getString("side")} · ${networkActions[step]}")
                for (key in listOf("note", "dispatchReference", "proofReference", "paymentReference")) {
                    event.present(key)?.let { AppText(it) }
                }
            }
            val actions = selected.getJSONArray("actions")
            for (i in 0 until actions.length()) {
                val step = actions.getString(i)
                PrimaryButton(networkActions[step].orEmpty(), { form = ExchangeForm(step, selected) }, enabled = !backend.busy, tone = Green)
            }
        }
    }

    val active = form
    if (active != null && backend != null && permitted) {
        SupplierNetworkForm(active, backend.error, backend.busy, { form = null }, ::save)
    }
    val stock = stockOrder
    if (stock != null && backend != null && permitted) {
        SupplierStockForm(store, stock, backend.busy, backend.error, { stockOrder = null }, ::save)
    }
}

@Composable
private fun SupplierStockForm(store: DemoStore, order: JSONObject, busy: Boolean, error: String, close: () -> Unit, save: (JSONObject) -> Unit) {
    val selections = remember(order) { mutableStateMapOf<Int, String>() }
    val expiry = remember(order) { mutableStateMapOf<Int, String>() }
    val products = store.products.filter { it.components.isEmpty() }.map { it.id.toString() to it.name }
    val branch = store.operations.branch
    AlertDialog(onDismissRequest = close, title = { AppText("Record inventory receipt") }, text = {
        Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            AppText("Map stock goods to your products at the active branch. Leave service lines unmapped.")
            if (products.isEmpty()) AppText("Add a product in Inventory before receiving stock.")
            if (products.isNotEmpty()) order.records("offered_lines").forEachIndexed { index, line ->
                AppText("${line.getInt("quantity")} ${line.getString("unit")} · ${line.getString("item")}")
                ToolSelect("Inventory product", selections[index].orEmpty(), listOf("" to "Skip this line") + products) { selections[index] = it }
                if (!selections[index].isNullOrBlank()) OutlinedTextField(expiry[index] ?: "2099-12-31", { expiry[index] = it.take(10) }, label = { AppText("Expiry (YYYY-MM-DD)") })
            }
            if (error.isNotBlank()) AppText(error, color = Coral)
        }
    }, confirmButton = {
        TextButton(enabled = !busy && selections.values.any(String::isNotBlank), onClick = {
            val lines = selections.entries.filter { it.value.isNotBlank() }.sortedBy { it.key }.map { (index, id) ->
                json("index" to index, "productId" to id.toInt(), "expires" to (expiry[index] ?: "2099-12-31"))
            }
            save(json("action" to "receive_stock", "id" to order.getString("id"), "version" to order.getInt("version"),
                "branch" to branch, "lines" to JSONArray(lines)))
        }) { AppText("Add stock from this order") }
    }, dismissButton = { TextButton(onClick = close) { AppText("Close") } })
}

@Composable
private fun SupplierNetworkForm(form: ExchangeForm, error: String, busy: Boolean, close: () -> Unit, save: (JSONObject) -> Unit) {
    val step = form.action
    val record = form.value
    var items by remember(form) {
        val existing = when (step) {
            "profile" -> record?.records("catalogue").orEmpty()
            "quote" -> record?.records("offered_lines").orEmpty().ifEmpty { record?.records("requested_lines").orEmpty() }
            else -> emptyList()
        }
        mutableStateOf(existing.joinToString("\n") { line ->
            val columns = mutableListOf(line.getString("item"), line.getString("unit"))
            if (step == "quote") columns.add(line.getInt("quantity").toString())
            columns.add(if (line.isNull("unitMinor")) "" else minorText(line.getLong("unitMinor")))
            columns.joinToString(" | ")
        })
    }
    var reference by remember(form) { mutableStateOf(record?.present("coverage").orEmpty()) }
    var note by remember(form) { mutableStateOf(record?.present("terms").orEmpty()) }
    var date by remember(form) { mutableStateOf("") }
    var days by remember(form) { mutableStateOf((record?.optInt("lead_days") ?: 0).toString()) }
    var amount by remember(form) { mutableStateOf(minorText(record?.optLong(if (step == "quote") "delivery_fee_minor" else "minimum_minor") ?: 0)) }
    var inputError by remember(form) { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = close,
        title = { AppText(networkActions[step].orEmpty()) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (step == "request") record?.present("display_name")?.let { AppText(it) }
                if (step in listOf("profile", "request", "quote")) {
                    val format = when (step) {
                        "profile" -> "Item | unit | price KES"
                        "quote" -> "Item | unit | quantity | price KES"
                        else -> "Item | unit | quantity"
                    }
                    AppText("Put each item on its own line using: $format")
                    OutlinedTextField(items, { items = it.take(7200) }, label = { AppText("Items") })
                }
                val label = when (step) {
                    "profile" -> "Coverage area"
                    "invoice" -> "Invoice reference"
                    "dispatch" -> "Dispatch or tracking reference"
                    "receive" -> "Delivery proof reference"
                    "record_payment" -> "Reference for a payment already made"
                    else -> null
                }
                if (label != null) OutlinedTextField(reference, { reference = it.take(120) }, label = { AppText(label) })
                if (step == "invoice") OutlinedTextField(date, { date = it.take(10) }, label = { AppText("Due date (YYYY-MM-DD)") })
                if (step == "profile") OutlinedTextField(days, { days = it.filter(Char::isDigit).take(3) }, label = { AppText("Lead time (days)") })
                if (step == "profile" || step == "quote") {
                    OutlinedTextField(amount, { amount = it.take(14) }, label = { AppText(if (step == "profile") "Minimum order (KES)" else "Delivery fee (KES)") })
                }
                OutlinedTextField(note, { note = it.take(1000) }, label = {
                    AppText(when (step) { "profile" -> "Terms"; "dispute" -> "Describe the discrepancy"; else -> "Note for the other business" })
                })
                if (inputError.isNotBlank()) AppText(inputError, color = Coral)
                if (error.isNotBlank()) AppText(error, color = Coral)
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = {
                try {
                    inputError = ""
                    val payload = json("action" to step)
                    if (step !in listOf("profile", "request")) {
                        val current = requireNotNull(record)
                        payload.put("id", current.getString("id")).put("version", current.getInt("version"))
                    }
                    when (step) {
                        "profile" -> {
                            payload.put("visible", true).put("coverage", reference).put("terms", note)
                            payload.put("leadDays", days.toIntOrNull() ?: throw IllegalArgumentException("Enter a lead time."))
                            payload.put("minimumMinor", parseMinor(amount)).put("catalogue", networkLines(items, step))
                        }
                        "request" -> payload.put("supplierId", requireNotNull(record).getString("business_id")).put("lines", networkLines(items, step))
                        "quote" -> payload.put("deliveryFeeMinor", parseMinor(amount)).put("lines", networkLines(items, step))
                        "dispatch" -> payload.put("dispatchReference", reference)
                        "receive" -> payload.put("proofReference", reference)
                        "invoice" -> payload.put("invoiceReference", reference).put("dueOn", date)
                        "record_payment" -> payload.put("paymentReference", reference)
                    }
                    if (step != "profile") payload.put("note", note)
                    save(payload)
                } catch (failure: IllegalArgumentException) {
                    inputError = failure.message ?: "Check the supplier exchange details."
                }
            }) { AppText(networkActions[step].orEmpty()) }
        },
        dismissButton = { TextButton(onClick = close) { AppText("Close") } },
    )
}

private fun networkLines(text: String, step: String): JSONArray {
    val rows = text.lineSequence().filter { it.isNotBlank() }.toList()
    require(rows.size in (if (step == "profile") 0 else 1)..20) { "Enter up to 20 items." }
    return JSONArray().apply {
        for (row in rows) {
            val columns = row.split('|').map(String::trim)
            val expected = if (step == "quote") 4 else 3
            require(columns.size == expected && columns[0].isNotBlank() && columns[1].isNotBlank()) { "Use the displayed format for each item." }
            val line = json("item" to columns[0], "unit" to columns[1])
            if (step != "profile") {
                val quantity = columns[2].toIntOrNull() ?: 0
                require(quantity in 1..100_000) { "Enter a whole quantity between 1 and 100,000." }
                line.put("quantity", quantity)
            }
            if (step != "request") line.put("unitMinor", parseMinor(columns.last()))
            put(line)
        }
    }
}
