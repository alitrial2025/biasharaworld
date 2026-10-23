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
fun InventoryScreen(store: DemoStore, initialProductId: Int? = null) {
    var query by rememberSaveable { mutableStateOf("") }
    var filter by rememberSaveable { mutableStateOf("All stock") }
    var adding by rememberSaveable { mutableStateOf(false) }
    var editing by remember { mutableStateOf<Int?>(null) }
    var selected by rememberSaveable(initialProductId) { mutableStateOf(initialProductId) }
    Column(Modifier.fillMaxSize().padding(horizontal = 18.dp).padding(top = 12.dp)) {
        PageTitle("Inventory") {
            IconButton(onClick = { filter = if (filter == "All stock") "Low stock" else "All stock" }) { AppIcon(Icons.Outlined.Tune, "Filter stock") }
        }
        Spacer(Modifier.height(16.dp))
        SearchBox(query, { query = it }, "Search products, SKU or barcode…")
        Spacer(Modifier.height(12.dp))
        FilterPills(listOf("All stock", "Low stock", "Out of stock"), filter, { filter = it })
        val products = store.products.filter { p ->
            (p.name.contains(query, true) || p.sku.contains(query, true) || p.barcode.contains(query)) &&
                when (filter) { "Low stock" -> p in store.lowStock; "Out of stock" -> store.operations.available(p.id) == 0; else -> true }
        }
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(vertical = 12.dp)) {
            if (products.isEmpty()) item { EmptyState(if (store.products.isEmpty()) "Your shelves start here" else "No products found", if (store.products.isEmpty()) "Add your first product to start tracking stock and sales." else "Try another filter or search.") }
            items(products, key = { it.id }) { p ->
                Row(Modifier.fillMaxWidth().clickable { selected = p.id }.padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    ProductPhoto(p, store)
                    Column(Modifier.weight(1f).padding(horizontal = 12.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        AppText(p.name, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                        AppText("${p.stock} in stock · ${store.operations.available(p.id)} sellable", fontSize = 11.sp, color = if (p in store.lowStock) Coral else Muted)
                        AppText(minorMoney(p.priceMinor), fontSize = 12.sp)
                    }
                    AppIcon(Icons.Outlined.ChevronRight, null)
                }
                HorizontalDivider(color = Line)
            }
        }
        if (store.canPerform("addProduct")) PrimaryButton("Add Product", { adding = true }, enabled = store.canSave, icon = Icons.Outlined.Add, tone = Green, modifier = Modifier.padding(vertical = 14.dp))
    }
    selected?.let { id -> store.products.firstOrNull { it.id == id }?.let { p ->
        ProductDetailsSheet(store, p, { selected = null }, { selected = null; editing = id })
    } }
    if (adding || editing != null) ProductEditorSheet(store, editing, { adding = false; editing = null })
}

@Composable
private fun ProductDetailsSheet(store: DemoStore, product: Product, onClose: () -> Unit, onEdit: () -> Unit) {
    CloseSheetAfterSave(store, onClose)
    var receiving by rememberSaveable { mutableStateOf(false) }
    var quantity by rememberSaveable { mutableStateOf("") }
    var code by rememberSaveable { mutableStateOf("RESTOCK-${todayLocal()}") }
    var expires by rememberSaveable { mutableStateOf("2099-12-31") }
    var error by remember { mutableStateOf("") }
    val record = store.liveState.records("products").firstOrNull { it.optInt("id") == product.id }
    ActionSheet(onDismissRequest = onClose, title = { AppText(product.name, style = MaterialTheme.typography.headlineSmall) }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
            ProductPhoto(product, store, Modifier.size(90.dp))
            AppText("${product.detail}\n${minorMoney(product.priceMinor)} per unit\n${product.stock} in stock · ${store.operations.available(product.id)} sellable")
            AppText("SKU: ${product.sku}\nBarcode: ${product.barcode}\nCategory: ${product.category}\nReorder level: ${record?.optInt("reorder") ?: 10}", color = Muted)
            if (product.components.isNotEmpty()) AppText("Bundle stock is calculated from its components. Receive stock against the individual products.", color = Muted)
            if (receiving) {
                OutlinedTextField(quantity, { quantity = it }, label = { AppText("Quantity to add") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
                OutlinedTextField(code, { code = it }, label = { AppText("Batch code") }, modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
                OutlinedTextField(expires, { expires = it }, label = { AppText("Expiry date (YYYY-MM-DD)") }, modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            }
            BusinessFormStatus(store, error)
        }
    }, confirmButton = {
        if (store.canPerform("batch") && product.components.isEmpty()) PrimaryButton(if (receiving) "Add to stock" else "Receive stock", {
            if (!receiving) receiving = true else {
                error = ""
                if (store.real) store.backend?.perform("batch", mapOf("product" to product.id.toString(), "quantity" to quantity, "code" to code.trim(), "expires" to expires)) { onClose() }
                else try { store.restock(product.id, wholeInput(quantity, "Quantity", 1)); onClose() } catch (e: Exception) { error = e.message.orEmpty() }
            }
        }, enabled = store.canSave, tone = Green)
    }, dismissButton = {
        if (store.canPerform("updateProduct")) TextButton(onClick = onEdit, enabled = store.canSave) { AppText("Edit product", color = Green) }
        TextButton(onClick = onClose) { AppText("Close") }
    })
}

@Composable
private fun ProductEditorSheet(store: DemoStore, id: Int?, onClose: () -> Unit) {
    CloseSheetAfterSave(store, onClose)
    val p = store.products.firstOrNull { it.id == id }
    val record = store.liveState.records("products").firstOrNull { it.optInt("id") == id }
    var name by rememberSaveable { mutableStateOf(p?.name.orEmpty()) }
    var size by rememberSaveable { mutableStateOf(p?.detail.orEmpty()) }
    var sku by rememberSaveable { mutableStateOf(p?.sku ?: "P-${System.currentTimeMillis().toString().takeLast(8)}") }
    var category by rememberSaveable { mutableStateOf(p?.category ?: "Food") }
    var price by rememberSaveable { mutableStateOf(p?.priceMinor?.let(::moneyInput).orEmpty()) }
    var cost by rememberSaveable { mutableStateOf(record?.optDouble("cost")?.let { moneyInput(kotlin.math.round(it * 100).toLong()) } ?: "0") }
    var opening by rememberSaveable { mutableStateOf("0") }
    var reorder by rememberSaveable { mutableStateOf(record?.optInt("reorder")?.toString() ?: "10") }
    var error by remember { mutableStateOf("") }
    var photoPath by rememberSaveable { mutableStateOf(p?.imagePath) }
    val context = androidx.compose.ui.platform.LocalContext.current
    val picker = androidx.activity.compose.rememberLauncherForActivityResult(androidx.activity.result.contract.ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) store.backend?.action {
            val bytes = prepareProductPhoto(context, uri)
            photoPath = store.backend!!.uploadProductImage(bytes)
        }
    }
    ActionSheet(onDismissRequest = onClose, title = { AppText(if (id == null) "Add product" else "Edit product", style = MaterialTheme.typography.headlineSmall) }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (store.real) {
                ProductPhotoPath(photoPath, name.ifBlank { "Product" }, p?.art ?: "rice", store, Modifier.size(140.dp))
                TextButton(onClick = { picker.launch(androidx.activity.result.PickVisualMediaRequest(androidx.activity.result.contract.ActivityResultContracts.PickVisualMedia.ImageOnly)) }, enabled = store.canSave) { AppText(if (photoPath == null) "Add product photo" else "Change photo", color = Green) }
                if (photoPath != null) TextButton(onClick = { photoPath = null }, enabled = store.canSave) { AppText("Remove photo", color = Coral) }
                AppText("Photos are stored privately for this business. Save the product to apply the photo.", color = Muted)
            }
            OutlinedTextField(name, { name = it }, label = { AppText("Product name") }, singleLine = true, modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            OutlinedTextField(size, { size = it }, label = { AppText("Pack size") }, singleLine = true, modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            OutlinedTextField(sku, { sku = it }, label = { AppText("SKU") }, singleLine = true, modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            OutlinedTextField(category, { category = it }, label = { AppText("Category") }, singleLine = true, modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            OutlinedTextField(price, { price = it }, label = { AppText("Selling price (KES)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            OutlinedTextField(cost, { cost = it }, label = { AppText("Cost price (KES)") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            if (id == null) OutlinedTextField(opening, { opening = it }, label = { AppText("Opening quantity") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            OutlinedTextField(reorder, { reorder = it }, label = { AppText("Reorder level") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth(), enabled = store.canSave)
            BusinessFormStatus(store, error)
        }
    }, confirmButton = {
        PrimaryButton(if (id == null) "Add product" else "Save product", {
            fun values() = json("name" to requiredInput(name, "a product name"), "size" to size.trim(), "sku" to requiredInput(sku, "a unique SKU"), "category" to requiredInput(category, "a category"), "price" to parseMinor(price).also { require(it > 0) { "Selling price must be positive." } } / 100.0, "cost" to parseMinor(cost) / 100.0, "reorder" to wholeInput(reorder, "Reorder level"), "art" to (record?.optInt("art") ?: 7), "imagePath" to (photoPath ?: org.json.JSONObject.NULL)).apply { if (id == null) put("stock", wholeInput(opening, "Opening quantity")) }
            error = ""
            if (store.real) store.backend?.action {
                val input = values()
                store.backend?.command(if (id == null) json("type" to "addProduct", "product" to input) else json("type" to "updateProduct", "id" to id, "changes" to input))
                onClose()
            } else try {
                val input = values()
                if (id == null) store.addProduct(name, input.getDouble("price").toInt(), input.getInt("stock"))
                else p?.let { old -> val index = store.products.indexOf(old); store.products[index] = old.copy(name = name.trim(), detail = size.trim(), sku = sku.trim(), category = category.trim(), price = input.getDouble("price").toInt(), priceMinor = parseMinor(price)) }
                onClose()
            } catch (e: Exception) { error = e.message.orEmpty() }
        }, enabled = store.canSave && name.isNotBlank() && price.isNotBlank(), tone = Green)
    }, dismissButton = { TextButton(onClick = onClose, enabled = store.backend?.busy != true) { AppText("Cancel") } })
}
