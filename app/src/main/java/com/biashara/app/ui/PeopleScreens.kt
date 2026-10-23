@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.biashara.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.biashara.app.data.*

@Composable
fun CustomersScreen(store: DemoStore, onBack: () -> Unit) {
    var query by rememberSaveable { mutableStateOf("") }
    var filter by rememberSaveable { mutableStateOf("Everyone") }
    var adding by rememberSaveable { mutableStateOf(false) }
    var selectedId by rememberSaveable { mutableStateOf<Int?>(null) }
    var selectedName by rememberSaveable { mutableStateOf("") }
    Page {
        PageTitle("Customers", onBack = onBack)
        SurfaceCard(color = Mint) {
            Eyebrow("Outstanding balances")
            AppText(minorMoney(store.customers.sumOf { it.balanceMinor }), style = MaterialTheme.typography.headlineLarge)
            AppText("${store.customers.count { it.balanceMinor > 0 }} customers with a balance", color = Muted)
        }
        SearchBox(query, { query = it }, "Search name, phone or email…")
        FilterPills(listOf("Everyone", "With balances", "Settled"), filter, { filter = it })
        val customers = store.customers.filter { c ->
            (c.name.contains(query, true) || c.phone.contains(query) || c.email.contains(query, true)) &&
                when (filter) { "With balances" -> c.balanceMinor > 0; "Settled" -> c.balanceMinor == 0L; else -> true }
        }
        if (customers.isEmpty()) EmptyState("No customers here", "Try another search or add your first customer.")
        customers.forEach { c ->
            SurfaceCard(Modifier.clickable { selectedId = c.id; selectedName = c.name }) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        AppText(c.name, fontWeight = FontWeight.Bold)
                        AppText(c.phone.ifBlank { c.email.ifBlank { "No contact details" } }, color = Muted, fontSize = 12.sp)
                    }
                    AppText(if (c.balanceMinor == 0L) "Settled ✓" else minorMoney(c.balanceMinor), color = if (c.balanceMinor == 0L) Green else Amber)
                }
            }
        }
        if (store.canPerform("addCustomer")) PrimaryButton("Add Customer", { adding = true }, enabled = store.canSave, icon = Icons.Outlined.PersonAddAlt, tone = Green)
    }
    if (adding) CustomerEditorSheet(store) { adding = false }
    selectedId?.let { id ->
        val customer = store.customers.firstOrNull { if (store.real) it.id == id else it.name == selectedName }
        customer?.let { CustomerDetailsSheet(store, it) { selectedId = null } }
    }
}

@Composable
private fun CustomerDetailsSheet(store: DemoStore, customer: Customer, onClose: () -> Unit) {
    CloseSheetAfterSave(store, onClose)
    var amount by remember(customer.id, customer.name) { mutableStateOf(moneyInput(customer.balanceMinor)) }
    var error by rememberSaveable { mutableStateOf("") }
    val context = androidx.compose.ui.platform.LocalContext.current
    ActionSheet(onDismissRequest = onClose, title = { AppText(customer.name, style = MaterialTheme.typography.headlineSmall) }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            AppText("Outstanding: ${minorMoney(customer.balanceMinor)}", style = MaterialTheme.typography.titleLarge)
            if (customer.phone.isNotBlank()) TextButton(onClick = { context.startActivity(android.content.Intent(android.content.Intent.ACTION_DIAL, android.net.Uri.parse("tel:" + android.net.Uri.encode(customer.phone)))) }) { AppText(customer.phone, color = Green) }
            if (customer.email.isNotBlank()) AppText(customer.email, color = Muted)
            if (customer.balanceMinor > 0 && store.canPerform("payBalance")) {
                OutlinedTextField(amount, { amount = it }, label = { AppText("Payment received (KES)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
                AppText("Record a partial or full payment only after receiving the money.", color = Muted)
            }
            BusinessFormStatus(store, error)
        }
    }, confirmButton = {
        if (customer.balanceMinor > 0 && store.canPerform("payBalance")) PrimaryButton("Record repayment", {
            error = ""
            fun validated(): Long = parseMinor(amount).also { require(it in 1..customer.balanceMinor) { "Enter an amount up to the outstanding balance." } }
            if (store.real) store.backend?.action {
                store.backend?.command(json("type" to "payBalance", "id" to customer.id, "amount" to validated() / 100.0))
                onClose()
            } else try {
                val paid = validated(); val index = store.customers.indexOf(customer)
                store.customers[index] = customer.copy(balance = ((customer.balanceMinor - paid) / 100).toInt(), balanceMinor = customer.balanceMinor - paid)
                onClose()
            } catch (e: Exception) { error = e.message.orEmpty() }
        }, enabled = store.canSave, tone = Green)
    }, dismissButton = { TextButton(onClick = onClose) { AppText("Close") } })
}

@Composable
private fun CustomerEditorSheet(store: DemoStore, onClose: () -> Unit) {
    CloseSheetAfterSave(store, onClose)
    var name by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var balance by rememberSaveable { mutableStateOf("0") }
    var error by rememberSaveable { mutableStateOf("") }
    ActionSheet(onDismissRequest = onClose, title = { AppText("Add customer", style = MaterialTheme.typography.headlineSmall) }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(name, { name = it }, label = { AppText("Customer name") }, modifier = Modifier.fillMaxWidth(), singleLine = true, enabled = store.canSave)
            OutlinedTextField(phone, { phone = it }, label = { AppText("Phone number (optional)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), modifier = Modifier.fillMaxWidth(), singleLine = true, enabled = store.canSave)
            OutlinedTextField(email, { email = it }, label = { AppText("Customer email (optional)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), modifier = Modifier.fillMaxWidth(), singleLine = true, enabled = store.canSave)
            OutlinedTextField(balance, { balance = it }, label = { AppText("Opening balance (KES)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            BusinessFormStatus(store, error)
        }
    }, confirmButton = {
        PrimaryButton("Add customer", {
            error = ""
            fun validated() = json("name" to requiredInput(name, "a customer name"), "phone" to phone.trim(), "email" to email.trim().also { require(it.isBlank() || validEmail(it)) { "Enter a valid email address." } }, "balance" to parseMinor(balance.ifBlank { "0" }) / 100.0, "purchases" to 0, "color" to "mint")
            if (store.real) store.backend?.action { store.backend?.command(json("type" to "addCustomer", "customer" to validated())); onClose() }
            else try {
                validated(); store.customers.add(Customer(name.trim(), name.trim().take(2).uppercase(), (parseMinor(balance) / 100).toInt(), store.customers.size % 4, parseMinor(balance), phone = phone.trim(), email = email.trim())); onClose()
            } catch (e: Exception) { error = e.message.orEmpty() }
        }, enabled = store.canSave && name.isNotBlank(), icon = Icons.Outlined.Check, tone = Green)
    }, dismissButton = { TextButton(onClick = onClose) { AppText("Cancel") } })
}

@Composable
fun SuppliersScreen(store: DemoStore, onBack: () -> Unit, openSupplier: (Int) -> Unit) {
    var query by rememberSaveable { mutableStateOf("") }
    var filter by rememberSaveable { mutableStateOf("All suppliers") }
    Page {
        PageTitle("Suppliers", onBack = onBack)
        SearchBox(query, { query = it }, "Search suppliers…")
        FilterPills(
            listOf("All suppliers", "Groceries", "Household", "Fresh"),
            filter,
            { filter = it },
        )
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            AppText("Recommended suppliers", fontSize = 12.sp, color = Muted)
            val suppliers =
                store.suppliers.withIndex().filter { (_, s) ->
                    s.name.contains(query, true) &&
                        (filter == "All suppliers" || s.category.contains(filter, true))
                }
            if (suppliers.isEmpty())
                EmptyState("No suppliers found", "Try a different name or category.")
            suppliers.forEach { (i, s) ->
                SurfaceCard(Modifier.clickable { openSupplier(i) }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier.size(49.dp)
                                .background(
                                    listOf(Color(0xFFF0E0BE), Mint, Lavender)[i],
                                    RoundedCornerShape(15.dp),
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            AppText(
                                s.initial,
                                fontSize = 25.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Ink,
                            )
                        }
                        Column(Modifier.weight(1f).padding(start = 13.dp)) {
                            AppText(s.name, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                            AppText(
                                "Nairobi · ${s.distance}",
                                fontSize = 11.sp,
                                color = Muted,
                                modifier = Modifier.padding(top = 4.dp),
                            )
                        }
                        AppIcon(Icons.Outlined.Verified, null, Modifier.size(19.dp), tint = Green)
                    }
                    Row(
                        Modifier.fillMaxWidth().padding(top = 18.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        AppIcon(Icons.Outlined.Star, null, Modifier.size(13.dp), tint = Amber)
                        AppText(
                            " ${s.rating}  ·  ${s.distance} away",
                            fontSize = 10.sp,
                            color = Muted,
                        )
                        Spacer(Modifier.weight(1f))
                        AppText(
                            "View Products",
                            fontSize = 10.sp,
                            color = Green,
                            modifier =
                                Modifier.background(Mint, RoundedCornerShape(10.dp))
                                    .padding(horizontal = 10.dp, vertical = 7.dp),
                        )
                    }
                    Row(
                        Modifier.padding(top = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        store.products.take(3).forEach { p ->
                            ProductArt(p.art, Modifier.size(35.dp, 43.dp))
                        }
                    }
                }
            }
        }
        AppText("Supplier listings and prices are sample content.", fontSize = 10.sp, color = Muted)
    }
}

@Composable
fun SupplierDetailScreen(
    supplier: Supplier,
    store: DemoStore,
    quantities: Map<Int, Int>,
    change: (Int, Int) -> Unit,
    onBack: () -> Unit,
    review: () -> Unit,
) {
    var filter by rememberSaveable { mutableStateOf("All products") }
    Page {
        PageTitle(supplier.name, onBack = onBack)
        SurfaceCard {
            ShopPhoto(Modifier.fillMaxWidth().height(145.dp))
            AppText(
                supplier.name,
                style = MaterialTheme.typography.headlineSmall,
                color = Ink,
                modifier = Modifier.padding(top = 12.dp),
            )
            Row(Modifier.padding(top = 7.dp), verticalAlignment = Alignment.CenterVertically) {
                AppIcon(Icons.Outlined.Verified, null, Modifier.size(14.dp), tint = Green)
                AppText(
                    " Verified Supplier  ·  ${supplier.distance}",
                    fontSize = 11.sp,
                    color = Green,
                )
            }
            AppText(
                "★ ${supplier.rating}  ·  Nairobi, Kenya",
                fontSize = 11.sp,
                color = Muted,
                modifier = Modifier.padding(top = 8.dp),
            )
        }
        SectionTitle("Products")
        FilterPills(listOf("All products", "Food", "Drinks", "Household"), filter, { filter = it })
        store.products
            .filter { filter == "All products" || it.category == filter }
            .take(8)
            .forEach { p ->
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    ProductArt(p.art)
                    Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                        AppText(p.name, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        AppText(
                            "KES ${money(p.price*8/10)} / unit",
                            fontSize = 12.sp,
                            color = Green,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(top = 5.dp),
                        )
                        AppText(
                            "${p.detail.substringBefore(" ·")}",
                            fontSize = 10.sp,
                            color = Muted,
                            modifier = Modifier.padding(top = 3.dp),
                        )
                    }
                    val q = quantities[p.id] ?: 0
                    if (q > 0) {
                        IconButton(
                            onClick = { change(p.id, -1) },
                            modifier = Modifier.size(32.dp),
                        ) {
                            AppIcon(
                                Icons.Outlined.Remove,
                                "Remove ${p.name} from order",
                                Modifier.size(15.dp),
                            )
                        }
                        AppText("$q", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    IconButton(
                        onClick = { change(p.id, 1) },
                        modifier = Modifier.size(35.dp).background(Mint, CircleShape),
                    ) {
                        AppIcon(
                            Icons.Outlined.Add,
                            "Order ${p.name}",
                            Modifier.size(17.dp),
                            tint = Ink,
                        )
                    }
                }
            }
        PrimaryButton(
            "Review order · ${quantities.values.sum()} ${if(quantities.values.sum()==1)"item" else "items"}",
            review,
            enabled = quantities.values.sum() > 0,
            icon = Icons.Outlined.ShoppingBag,
        )
    }
}

@Composable
fun OrderScreen(
    supplier: Supplier,
    store: DemoStore,
    quantities: Map<Int, Int>,
    onBack: () -> Unit,
    done: () -> Unit,
) {
    var placed by remember { mutableStateOf(false) }
    val subtotal = store.products.sumOf { it.price * 8 / 10 * (quantities[it.id] ?: 0) }
    Page {
        PageTitle("Your Order", supplier.name, onBack)
        Eyebrow("Order items")
        SurfaceCard {
            store.products
                .filter { (quantities[it.id] ?: 0) > 0 }
                .forEach { p ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 9.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        ProductArt(p.art, Modifier.size(48.dp, 57.dp))
                        Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                            AppText(p.name, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            AppText(
                                "${quantities[p.id]} × KES ${p.price*8/10}",
                                fontSize = 10.sp,
                                color = Muted,
                                modifier = Modifier.padding(top = 5.dp),
                            )
                        }
                        AppText(
                            money(p.price * 8 / 10 * (quantities[p.id] ?: 0)),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
        }
        SurfaceCard {
            listOf("Subtotal" to subtotal, "Delivery" to 300).forEach { (t, v) ->
                Row(Modifier.fillMaxWidth().padding(vertical = 7.dp)) {
                    AppText(t, fontSize = 12.sp, color = Muted, modifier = Modifier.weight(1f))
                    AppText("KES ${money(v)}", fontSize = 12.sp)
                }
            }
            HorizontalDivider(Modifier.padding(vertical = 15.dp), color = Line)
            Row(Modifier.fillMaxWidth()) {
                AppText(
                    "Total",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f),
                )
                AppText("KES ${money(subtotal+300)}", style = MaterialTheme.typography.titleLarge)
            }
        }
        Row(
            Modifier.background(Mint, RoundedCornerShape(17.dp)).padding(16.dp),
            verticalAlignment = Alignment.Top,
        ) {
            AppIcon(Icons.Outlined.Info, null, Modifier.size(18.dp), tint = Green)
            AppText(
                "This is a demo order. Nothing will be sent to the supplier and no payment will be taken.",
                fontSize = 11.sp,
                color = Green,
                modifier = Modifier.padding(start = 10.dp),
            )
        }
        PrimaryButton(
            "Create demo order",
            { placed = true },
            enabled = quantities.values.sum() > 0,
            icon = Icons.Outlined.Check,
        )
    }
    if (placed)
        ActionSheet(
            onDismissRequest = done,
            icon = {
                AppIcon(Icons.Outlined.CheckCircle, null, Modifier.size(45.dp), tint = Green)
            },
            title = { AppText("All lined up!") },
            text = {
                AppText(
                    "Your demo order totals KES ${money(subtotal+300)}.\n\nSupplier ordering will connect in a later phase. Nothing has been sent."
                )
            },
            confirmButton = { TextButton(onClick = done) { AppText("Back to suppliers") } },
        )
}
