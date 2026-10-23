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
    var adding by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var balance by remember { mutableStateOf("") }
    var selected by remember { mutableStateOf<Customer?>(null) }
    val avatarColors = listOf(Mint, Color(0xFFF7E6D4), Lavender, Color(0xFFE5EFCB))
    Page {
        PageTitle("Customers", onBack = onBack)
        SearchBox(query, { query = it }, "Search customers…")
        FilterPills(listOf("Everyone", "Owes you", "All settled"), filter, { filter = it })
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            val customers =
                store.customers.filter {
                    it.name.contains(query, true) &&
                        when (filter) {
                            "Owes you" -> it.balance > 0
                            "All settled" -> it.balance == 0
                            else -> true
                        }
                }
            if (customers.isEmpty())
                EmptyState(
                    "No customers here",
                    "Try another name or add someone new.",
                    Icons.Outlined.PeopleOutline,
                )
            customers.forEach { c ->
                Row(
                    Modifier.fillMaxWidth().clickable { selected = c }.padding(vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        Modifier.size(46.dp)
                            .background(avatarColors[c.color % avatarColors.size], CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        AppText(
                            c.initial,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Ink,
                        )
                    }
                    Column(Modifier.weight(1f).padding(horizontal = 13.dp)) {
                        AppText(c.name, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        AppText(
                            if (c.balance > 0) "Outstanding balance" else "All paid up",
                            fontSize = 10.sp,
                            color = Muted,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                    AppText(
                        if (c.balance == 0) "Settled ✓" else "${money(c.balance)}",
                        fontSize = 12.sp,
                        color = if (c.balance == 0) Green else Amber,
                        fontWeight = FontWeight.Bold,
                    )
                    AppIcon(
                        Icons.Outlined.ChevronRight,
                        null,
                        Modifier.padding(start = 8.dp).size(15.dp),
                        tint = Muted,
                    )
                }
                HorizontalDivider(color = Line)
            }
        }
        PrimaryButton("Add Customer", { adding = true }, icon = Icons.Outlined.PersonAddAlt)
    }
    selected?.let { c ->
        AlertDialog(
            onDismissRequest = { selected = null },
            title = { AppText(c.name) },
            text = {
                AppText(
                    if (c.balance > 0)
                        "KES ${money(c.balance)} outstanding.\n\nRecord payment only after you have received the money. The shared customer balance will update."
                    else "No outstanding balance."
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        if(store.real && c.balance>0) {
                            val record=store.liveState.records("customers").firstOrNull{it.optString("name")==c.name}
                            store.backend?.action {store.backend?.command(json("type" to "payBalance","id" to record?.optInt("id"),"amount" to record?.optDouble("balance")));selected=null}
                            return@TextButton
                        }
                        if (c.balance > 0) {
                            val i = store.customers.indexOf(c)
                            if (i >= 0) store.customers[i] = c.copy(balance = 0)
                        }
                        selected = null
                    }
                ) {
                    AppText(if (c.balance > 0) "Record full repayment" else "Done")
                }
            },
            dismissButton = {
                if (c.balance > 0) TextButton(onClick = { selected = null }) { AppText("Close") }
            },
        )
    }
    if (adding)
        ModalBottomSheet(onDismissRequest = { adding = false }, containerColor = Canvas) {
            Column(
                Modifier.padding(horizontal = 24.dp).padding(bottom = 32.dp).imePadding(),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Eyebrow("Customer details")
                AppText("Add Customer", style = MaterialTheme.typography.headlineMedium)
                OutlinedTextField(
                    name,
                    { name = it.take(60) },
                    label = { AppText("Customer name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                )
                OutlinedTextField(email,{email=it},label={AppText("Customer email (optional)")},singleLine=true,modifier=Modifier.fillMaxWidth(),shape=RoundedCornerShape(16.dp))
                OutlinedTextField(
                    balance,
                    { balance = it.filter(Char::isDigit).take(7) },
                    label = { AppText("Opening balance (KES, optional)") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                )
                PrimaryButton(
                    "Add customer",
                    {
                        if(store.real) {
                            store.backend?.action {store.backend?.command(json("type" to "addCustomer","customer" to json("name" to name.trim(),"phone" to "","email" to email.trim(),"balance" to (balance.toDoubleOrNull()?:0.0),"purchases" to 0,"color" to "mint")));name="";balance="";adding=false}
                            return@PrimaryButton
                        }
                        store.customers.add(
                            Customer(
                                name.trim(),
                                name
                                    .trim()
                                    .split(" ")
                                    .filter { it.isNotBlank() }
                                    .take(2)
                                    .map { it.first().uppercaseChar() }
                                    .joinToString(""),
                                balance.toIntOrNull() ?: 0,
                                store.customers.size % 4,
                            )
                        )
                        name = ""
                        balance = ""
                        adding = false
                    },
                    enabled = name.isNotBlank(),
                    icon = Icons.Outlined.Check,
                )
            }
        }
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
        AlertDialog(
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
