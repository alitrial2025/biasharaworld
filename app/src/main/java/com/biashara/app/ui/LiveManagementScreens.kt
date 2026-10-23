package com.biashara.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.biashara.app.data.*
import org.json.JSONObject

@Composable
fun LiveSuppliersScreen(store: DemoStore, onBack: () -> Unit, onTools: (String) -> Unit = {}, initialQuery: String = "") {
    var adding by rememberSaveable { mutableStateOf(false) }
    var quoteSupplier by remember { mutableStateOf<JSONObject?>(null) }
    var query by remember { mutableStateOf(initialQuery) }
    Page {
        PageTitle("Suppliers", onBack = onBack)
        AppText("Keep supplier details and quotes together. Purchase orders record your agreement; arrange delivery directly with the supplier.", color = Muted)
        SearchBox(query, { query = it }, "Search suppliers…")
        if (store.canPerform("addSupplier")) PrimaryButton("Add supplier", { adding = true }, enabled = store.canSave, tone = Green)
        PrimaryButton("Compare quotes & purchase orders", { onTools("compare") }, tone = Green)
        val suppliers = store.liveState.records("suppliers").filter { it.optString("name").contains(query, true) || it.optString("category").contains(query, true) }
        if (suppliers.isEmpty()) EmptyState("Your first supplier", "Add the suppliers you buy from, then record their product quotes.")
        suppliers.forEach { s -> SurfaceCard {
            AppText(s.optString("name"), style = MaterialTheme.typography.titleLarge)
            AppText(s.optString("category"), color = Muted)
            if (s.optString("description").isNotBlank()) AppText(s.optString("description"))
            AppText("Delivery: ${s.optString("delivery")}\nFee: ${minorMoney(kotlin.math.round(s.optDouble("deliveryFee") * 100).toLong())}\nMinimum goods: ${minorMoney(kotlin.math.round(s.optDouble("minimum") * 100).toLong())}")
            val quotes = s.optJSONObject("quotes") ?: JSONObject()
            store.products.filter { quotes.has(it.id.toString()) }.forEach { p -> AppText("${p.name}: ${minorMoney(kotlin.math.round(quotes.optDouble(p.id.toString()) * 100).toLong())}") }
            if (store.canPerform("supplierQuote")) PrimaryButton("Record a quote", { quoteSupplier = s }, enabled = store.products.any { it.components.isEmpty() } && store.canSave, tone = Green)
        } }
    }
    if (adding) SupplierEditorSheet(store) { adding = false }
    quoteSupplier?.let { supplier -> SupplierQuoteSheet(store, supplier) { quoteSupplier = null } }
}

@Composable
private fun SupplierEditorSheet(store: DemoStore, onClose: () -> Unit) {
    CloseSheetAfterSave(store, onClose)
    var name by rememberSaveable { mutableStateOf("") }
    var category by rememberSaveable { mutableStateOf("Groceries") }
    var description by rememberSaveable { mutableStateOf("") }
    var delivery by rememberSaveable { mutableStateOf("Arrange with supplier") }
    var fee by rememberSaveable { mutableStateOf("0") }
    var minimum by rememberSaveable { mutableStateOf("0") }
    ActionSheet(onDismissRequest = onClose, title = { AppText("Add supplier", style = MaterialTheme.typography.headlineSmall) }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(name, { name = it }, label = { AppText("Supplier name") }, modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            OutlinedTextField(category, { category = it }, label = { AppText("Category") }, modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            OutlinedTextField(description, { description = it }, label = { AppText("Contact details / notes") }, modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            OutlinedTextField(delivery, { delivery = it }, label = { AppText("Delivery arrangements") }, modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            OutlinedTextField(fee, { fee = it }, label = { AppText("Delivery fee (KES)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            OutlinedTextField(minimum, { minimum = it }, label = { AppText("Minimum goods value (KES)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            BusinessFormStatus(store)
        }
    }, confirmButton = { PrimaryButton("Save supplier", { store.backend?.action {
        val clean = requiredInput(name, "a supplier name")
        require(store.suppliers.none { it.name.equals(clean, true) }) { "A supplier with this name already exists." }
        store.backend?.command(json("type" to "addSupplier", "name" to clean, "category" to requiredInput(category, "a category"), "description" to description.trim(), "delivery" to delivery.trim(), "minimum" to parseMinor(minimum) / 100.0, "deliveryFee" to parseMinor(fee) / 100.0))
        onClose()
    } }, enabled = store.canSave && name.isNotBlank(), tone = Green) }, dismissButton = { TextButton(onClick = onClose) { AppText("Cancel") } })
}

@Composable
private fun SupplierQuoteSheet(store: DemoStore, supplier: JSONObject, onClose: () -> Unit) {
    CloseSheetAfterSave(store, onClose)
    val products = store.products.filter { it.components.isEmpty() }
    var productId by rememberSaveable { mutableStateOf(products.firstOrNull()?.id?.toString().orEmpty()) }
    var quote by rememberSaveable { mutableStateOf("") }
    ActionSheet(onDismissRequest = onClose, title = { AppText("Record supplier quote", style = MaterialTheme.typography.headlineSmall) }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            AppText(supplier.optString("name"))
            SheetChoice("Product", productId, products.map { it.id.toString() to "${it.name} · ${it.detail}" }) { productId = it; quote = "" }
            OutlinedTextField(quote, { quote = it }, label = { AppText("Quoted unit cost (KES)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            BusinessFormStatus(store)
        }
    }, confirmButton = { PrimaryButton("Save quote", { store.backend?.action {
        store.backend?.command(json("type" to "supplierQuote", "id" to supplier.optString("id"), "productId" to wholeInput(productId, "Product", 1), "cost" to parseMinor(quote) / 100.0)); onClose()
    } }, enabled = store.canSave && productId.isNotBlank() && quote.isNotBlank(), tone = Green) }, dismissButton = { TextButton(onClick = onClose) { AppText("Cancel") } })
}

@Composable
fun LiveTeamScreen(store: DemoStore, onBack: () -> Unit) {
    var adding by rememberSaveable { mutableStateOf(false) }
    var selected by remember { mutableStateOf<Int?>(null) }
    Page {
        PageTitle("Your team", onBack = onBack)
        AppText("Save an invitation for a teammate’s email. They join after creating and confirming that account. Share the sign-up link with them directly.", color = Muted)
        if (store.canPerform("inviteMember")) PrimaryButton("Invite teammate", { adding = true }, enabled = store.canSave, tone = Green)
        store.liveState.records("members").forEach { m -> SurfaceCard(Modifier.clickable(enabled = store.canPerform("updateMember") && m.optString("role") != "Owner") { selected = m.optInt("id") }) {
            AppText(m.optString("name"), style = MaterialTheme.typography.titleMedium)
            AppText(m.optString("email"), color = Muted)
            AppText("${m.optString("role")} · ${m.optString("status")}")
            if (store.canPerform("updateMember") && m.optString("role") != "Owner") AppText("Tap to manage access", color = Green)
        } }
    }
    if (adding) TeamEditorSheet(store, null) { adding = false }
    selected?.let { id -> store.liveState.records("members").firstOrNull { it.optInt("id") == id }?.let { TeamEditorSheet(store, it) { selected = null } } }
}

@Composable
private fun TeamEditorSheet(store: DemoStore, member: JSONObject?, onClose: () -> Unit) {
    CloseSheetAfterSave(store, onClose)
    var name by rememberSaveable { mutableStateOf(member?.optString("name").orEmpty()) }
    var email by rememberSaveable { mutableStateOf(member?.optString("email").orEmpty()) }
    var role by rememberSaveable { mutableStateOf(member?.optString("role") ?: "Cashier") }
    var removing by rememberSaveable { mutableStateOf(false) }
    val title = if (removing) "Remove access?" else if (member == null) "Invite teammate" else "Manage teammate"
    ActionSheet(onDismissRequest = onClose, title = { AppText(title, style = MaterialTheme.typography.headlineSmall) }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (member == null) {
                OutlinedTextField(name, { name = it }, label = { AppText("Name") }, modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
                OutlinedTextField(email, { email = it }, label = { AppText("Email address") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            } else { AppText(name); AppText(email, color = Muted) }
            if (!removing) SheetChoice("Role", role, listOf("Manager", "Cashier", "Viewer").map { it to it }) { role = it }
            AppText(if (removing) "This person will no longer be able to open your business." else when (role) { "Manager" -> "Manages products, sales and business records. Cannot change team access."; "Cashier" -> "Records sales, customer payments and delivery activity."; else -> "Views records and manages their own workspace preferences." }, color = Muted)
            BusinessFormStatus(store)
        }
    }, confirmButton = { PrimaryButton(if (removing) "Remove access" else if (member == null) "Save invitation" else "Save role", { store.backend?.action {
        val command = when { removing -> json("type" to "removeMember", "id" to member!!.optInt("id")); member != null -> json("type" to "updateMember", "id" to member.optInt("id"), "role" to role); else -> { require(validEmail(email)) { "Enter a valid email address." }; json("type" to "inviteMember", "member" to json("name" to requiredInput(name, "a teammate name"), "email" to email.trim(), "role" to role)) } }
        store.backend?.command(command); onClose()
    } }, enabled = store.canSave, tone = if (removing) Coral else Green) }, dismissButton = {
        if (member != null && !removing) TextButton(onClick = { removing = true }, enabled = store.canSave) { AppText("Remove access", color = Coral) }
        TextButton(onClick = { if (removing) removing = false else onClose() }) { AppText("Cancel") }
    })
}
