@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.biashara.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.biashara.app.data.*

@Composable
fun InventoryScreen(store: DemoStore) {
    var query by rememberSaveable { mutableStateOf("") }
    var filter by rememberSaveable { mutableStateOf("All stock") }
    var adding by remember { mutableStateOf(false) }
    var selected by remember { mutableStateOf<Int?>(null) }
    var quantity by remember { mutableStateOf("12") }
    var name by remember { mutableStateOf("") }
    var price by remember { mutableStateOf("") }
    var cost by remember { mutableStateOf("0") }
    var opening by remember { mutableStateOf("") }
    Column(Modifier.fillMaxSize().padding(horizontal = 18.dp).padding(top = 12.dp)) {
        PageTitle("Inventory") {
            IconButton(
                onClick = { filter = if (filter == "All stock") "Low stock" else "All stock" },
                modifier = Modifier.size(36.dp),
            ) {
                AppIcon(Icons.Outlined.Tune, "Filter stock", Modifier.size(19.dp))
            }
        }
        Spacer(Modifier.height(18.dp))
        SearchBox(query, { query = it }, "Search products…") {
            AppIcon(Icons.Outlined.FilterList, null, Modifier.size(17.dp), tint = Muted)
        }
        Spacer(Modifier.height(14.dp))
        FilterPills(listOf("All stock", "Low stock", "Out of stock"), filter, { filter = it })
        Spacer(Modifier.height(12.dp))
        val products =
            store.products.filter {
                it.name.contains(query, true) &&
                    when (filter) {
                        "Low stock" -> it.stock in 1..9
                        "Out of stock" -> it.stock == 0
                        else -> true
                    }
            }
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(bottom = 12.dp)) {
            if (products.isEmpty())
                item { EmptyState("No products found", "Try another filter or search.") }
            items(products, key = { it.id }) { p ->
                Row(
                    Modifier.fillMaxWidth()
                        .clickable {
                            selected = p.id
                            quantity = "12"
                        }
                        .padding(vertical = 9.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    ProductArt(p.art)
                    Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                        AppText(p.name, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                        AppText(
                            if (p.stock == 0) "0 in stock" else "${p.stock} in stock",
                            fontSize = 11.sp,
                            color = if (p.stock == 0) Coral else Green,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                        AppText(
                            minorMoney(p.priceMinor),
                            fontSize = 11.sp,
                            color = if (p.stock < 10) Coral else Ink,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                    AppIcon(Icons.Outlined.ChevronRight, null, Modifier.size(18.dp), tint = Muted)
                }
                HorizontalDivider(color = Line)
            }
        }
        PrimaryButton(
            "Add Product",
            { adding = true },
            icon = Icons.Outlined.Add,
            tone = Green,
            modifier = Modifier.padding(vertical = 14.dp),
        )
    }
    selected?.let { id ->
        store.products
            .firstOrNull { it.id == id }
            ?.let { p ->
                ModalBottomSheet(onDismissRequest = { selected = null }, containerColor = Canvas) {
                    Column(
                        Modifier.padding(horizontal = 24.dp).padding(bottom = 32.dp).imePadding(),
                        verticalArrangement = Arrangement.spacedBy(18.dp),
                    ) {
                        ProductArt(
                            p.art,
                            Modifier.align(Alignment.CenterHorizontally).size(100.dp, 115.dp),
                        )
                        AppText(p.name, style = MaterialTheme.typography.headlineMedium)
                        AppText(
                            "${p.detail}\n${minorMoney(p.priceMinor)} per unit · ${p.stock} currently in stock",
                            fontSize = 13.sp,
                            color = Muted,
                        )
                        OutlinedTextField(
                            quantity,
                            { quantity = it.filter(Char::isDigit).take(5) },
                            label = { AppText("Quantity to add") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            singleLine = true,
                        )
                        PrimaryButton(
                            "Add to stock",
                            {
                                if (store.real)
                                    store.backend?.perform(
                                        "batch",
                                        mapOf(
                                            "product" to id.toString(),
                                            "quantity" to quantity,
                                            "code" to "RESTOCK-$id",
                                            "expires" to "2099-12-31",
                                        ),
                                    ) {
                                        selected = null
                                    }
                                else {
                                    store.restock(id, quantity.toIntOrNull() ?: 0)
                                    selected = null
                                }
                            },
                            enabled = (quantity.toIntOrNull() ?: 0) > 0,
                            icon = Icons.Outlined.Add,
                        )
                        AppText(
                            "Saved stock changes are available on all your devices.",
                            fontSize = 10.sp,
                            color = Muted,
                        )
                    }
                }
            }
    }
    if (adding)
        ModalBottomSheet(onDismissRequest = { adding = false }, containerColor = Canvas) {
            Column(
                Modifier.padding(horizontal = 24.dp).padding(bottom = 32.dp).imePadding(),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Eyebrow("Make room on your shelf")
                AppText("A new product", style = MaterialTheme.typography.headlineMedium)
                OutlinedTextField(
                    name,
                    { name = it.take(60) },
                    label = { AppText("Product name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                )
                OutlinedTextField(
                    price,
                    { if (it.matches(Regex("[0-9]{0,6}(\\.[0-9]{0,2})?"))) price = it },
                    label = { AppText("Selling price (KES)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                )
                OutlinedTextField(
                    cost,
                    { cost = it },
                    label = { AppText("Cost price (KES)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                )
                OutlinedTextField(
                    opening,
                    { opening = it.filter(Char::isDigit).take(5) },
                    label = { AppText("Opening quantity") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                )
                PrimaryButton(
                    "Add product",
                    {
                        if (store.real)
                            store.backend?.action {
                                store.backend?.command(
                                    json(
                                        "type" to "addProduct",
                                        "product" to
                                            json(
                                                "name" to name.trim(),
                                                "size" to "",
                                                "sku" to "SKU-${System.currentTimeMillis()}",
                                                "category" to "Food",
                                                "price" to (price.toDoubleOrNull() ?: 0.0),
                                                "cost" to (cost.toDoubleOrNull() ?: 0.0),
                                                "stock" to (opening.toIntOrNull() ?: 0),
                                                "reorder" to 10,
                                                "art" to 7,
                                            ),
                                    )
                                )
                                name = ""
                                price = ""
                                cost = "0"
                                opening = ""
                                adding = false
                            }
                        else {
                            store.addProduct(
                                name,
                                price.toIntOrNull() ?: 0,
                                opening.toIntOrNull() ?: 0,
                            )
                            name = ""
                            price = ""
                            cost = "0"
                            opening = ""
                            adding = false
                        }
                    },
                    enabled =
                        name.isNotBlank() &&
                            (price.toBigDecimalOrNull()?.signum() ?: 0) > 0 &&
                            (cost.toBigDecimalOrNull()?.let {
                                it.signum() >= 0 && it.scale() <= 2
                            } == true) &&
                            opening.toIntOrNull() != null,
                    icon = Icons.Outlined.Check,
                )
            }
        }
}
