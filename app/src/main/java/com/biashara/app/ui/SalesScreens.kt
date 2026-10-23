@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.biashara.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.biashara.app.data.*

@Composable
fun NewSaleScreen(
    store: DemoStore,
    onBack: () -> Unit,
    onComplete: () -> Unit,
    onTool: (String) -> Unit = {},
) {
    var query by rememberSaveable { mutableStateOf("") }
    var filter by rememberSaveable { mutableStateOf("All") }
    var scanner by remember { mutableStateOf(false) }
    var payment by remember { mutableStateOf(false) }
    var paymentError by remember { mutableStateOf("") }
    var method by rememberSaveable { mutableStateOf("M-Pesa") }
    var receipt by remember { mutableStateOf<Sale?>(null) }
    Column(Modifier.fillMaxSize().imePadding().padding(horizontal = 18.dp).padding(top = 12.dp)) {
        PageTitle("New Sale", onBack = onBack) {
            if (store.itemCount > 0)
                TextButton(onClick = { store.cart.clear() }) {
                    AppText(
                        "Clear cart",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = Green,
                    )
                }
        }
        Spacer(Modifier.height(18.dp))
        SearchBox(query, { query = it }, "Search product or scan barcode") {
            AppIcon(
                Icons.Outlined.QrCodeScanner,
                "Scan barcode",
                Modifier.size(19.dp).clickable { onTool("scanner") },
                tint = Muted,
            )
        }
        Spacer(Modifier.height(16.dp))
        FilterPills(listOf("All", "Favorites", "Recent"), filter, { filter = it })
        Row(
            Modifier.fillMaxWidth().padding(top = 10.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            listOf("Hold" to "baskets", "Offers" to "promotions", "Split pay" to "split-payments")
                .forEach { (label, tool) ->
                    TextButton(onClick = { onTool(tool) }) {
                        AppText(label, fontSize = 11.sp, color = Green)
                    }
                }
        }
        Spacer(Modifier.height(8.dp))
        val products =
            store.products.filter {
                it.name.contains(query, true) &&
                    (filter == "All" ||
                        (filter == "Favorites" && it.id in listOf(1, 2)) ||
                        (filter == "Recent" && it.id in listOf(1, 2, 3)))
            }
        LazyColumn(
            Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp),
            contentPadding = PaddingValues(bottom = 12.dp),
        ) {
            if (products.isEmpty())
                item {
                    EmptyState(
                        if (filter == "In cart") "Your basket is waiting" else "No products found",
                        if (filter == "In cart") "Add something from All products."
                        else "Try a different product name.",
                    )
                }
            items(products, key = { it.id }) { p ->
                Row(
                    Modifier.fillMaxWidth().padding(vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    ProductArt(p.art)
                    Column(Modifier.weight(1f).padding(horizontal = 11.dp)) {
                        AppText(
                            p.name,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        AppText(
                            p.detail.substringBefore(" ·"),
                            fontSize = 11.sp,
                            color = Muted,
                            modifier = Modifier.padding(top = 3.dp),
                        )
                        AppText(
                            minorMoney(p.priceMinor),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Ink,
                            modifier = Modifier.padding(top = 6.dp),
                        )
                    }
                    val qty = store.cart[p.id] ?: 0
                    if (qty > 0) {
                        Row(
                            Modifier.background(Mint, RoundedCornerShape(12.dp)),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            IconButton(
                                onClick = { store.remove(p.id) },
                                modifier = Modifier.size(34.dp),
                            ) {
                                AppIcon(
                                    Icons.Outlined.Remove,
                                    "Remove ${p.name}",
                                    Modifier.size(15.dp),
                                    tint = Ink,
                                )
                            }
                            AppText(
                                qty.toString(),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.widthIn(min = 12.dp),
                            )
                            IconButton(
                                onClick = { store.add(p.id) },
                                enabled = qty < store.operations.available(p.id),
                                modifier = Modifier.size(34.dp),
                            ) {
                                AppIcon(
                                    Icons.Outlined.Add,
                                    "Add ${p.name}",
                                    Modifier.size(15.dp),
                                    tint =
                                        if (qty < store.operations.available(p.id)) Forest
                                        else Muted,
                                )
                            }
                        }
                    } else if (store.operations.available(p.id) > 0) {
                        IconButton(
                            onClick = { store.add(p.id) },
                            modifier =
                                Modifier.size(38.dp).background(Mint, RoundedCornerShape(12.dp)),
                        ) {
                            AppIcon(
                                Icons.Outlined.Add,
                                "Add ${p.name}",
                                Modifier.size(19.dp),
                                tint = Ink,
                            )
                        }
                    } else
                        AppText(
                            "Sold out",
                            fontSize = 10.sp,
                            color = Coral,
                            fontWeight = FontWeight.SemiBold,
                        )
                }
                HorizontalDivider(color = Line, modifier = Modifier.padding(top = 7.dp))
            }
        }
        Column(Modifier.fillMaxWidth().padding(vertical = 16.dp).navigationBarsPadding()) {
            Row(
                Modifier.fillMaxWidth().padding(bottom = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AppIcon(Icons.Outlined.ShoppingBag, null, Modifier.size(21.dp), tint = Ink)
                AppText(
                    "${store.itemCount} ${if(store.itemCount==1)"item" else "items"} in basket",
                    fontSize = 12.sp,
                    color = Muted,
                    modifier = Modifier.weight(1f).padding(start = 9.dp),
                )
                AppText(
                    minorMoney(
                        runCatching { store.operations.price().optLong("total") }.getOrDefault(0L)
                    ),
                    style = MaterialTheme.typography.titleLarge,
                )
            }
            PrimaryButton(
                "Pay with M-Pesa →",
                {
                    method = "M-Pesa"
                    payment = true
                },
                enabled = store.itemCount > 0,
                tone = Green,
            )
            Row(
                Modifier.fillMaxWidth().padding(top = 10.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                listOf("Cash", "Card", "More").forEach { m ->
                    Row(
                        Modifier.background(Color(0xFFF2F6F5), RoundedCornerShape(9.dp))
                            .clickable {
                                if (store.itemCount > 0) {
                                    method = if (m == "More") "M-Pesa" else m
                                    payment = true
                                }
                            }
                            .padding(horizontal = 18.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        AppIcon(
                            if (m == "Cash") Icons.Outlined.Payments
                            else if (m == "Card") Icons.Outlined.CreditCard
                            else Icons.Outlined.MoreHoriz,
                            null,
                            Modifier.size(15.dp),
                        )
                        AppText(m, fontSize = 11.sp, modifier = Modifier.padding(start = 5.dp))
                    }
                }
            }
        }
    }

    if (scanner)
        AlertDialog(
            onDismissRequest = { scanner = false },
            title = { AppText("Scan barcode") },
            text = {
                AppText(
                    "The barcode scanner interface is a preview. Camera scanning will be connected in the next phase. For now, search for a product by name."
                )
            },
            confirmButton = {
                TextButton(onClick = { scanner = false }) { AppText("Search products") }
            },
        )
    if (payment)
        ModalBottomSheet(onDismissRequest = { payment = false }, containerColor = Canvas) {
            Column(
                Modifier.padding(horizontal = 24.dp).padding(bottom = 32.dp),
                verticalArrangement = Arrangement.spacedBy(18.dp),
            ) {
                if (paymentError.isNotBlank())
                    AppText(paymentError, color = Coral, fontSize = 12.sp)
                Eyebrow("Payment")
                AppText("Complete your sale", style = MaterialTheme.typography.headlineMedium)
                SurfaceCard {
                    store.products
                        .filter { (store.cart[it.id] ?: 0) > 0 }
                        .forEach { p ->
                            Row(Modifier.fillMaxWidth().padding(vertical = 5.dp)) {
                                AppText(
                                    "${store.cart[p.id]} × ${p.name}",
                                    fontSize = 12.sp,
                                    modifier = Modifier.weight(1f),
                                )
                                AppText(
                                    minorMoney(p.priceMinor * (store.cart[p.id] ?: 0)),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                    HorizontalDivider(Modifier.padding(vertical = 13.dp), color = Line)
                    Row(Modifier.fillMaxWidth()) {
                        AppText(
                            "Total to collect",
                            fontSize = 13.sp,
                            modifier = Modifier.weight(1f),
                        )
                        AppText(
                            minorMoney(
                                runCatching { store.operations.price().optLong("total") }
                                    .getOrDefault(0L)
                            ),
                            fontSize = 17.sp,
                            fontWeight = FontWeight.ExtraBold,
                        )
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    listOf("M-Pesa", "Cash", "Card").forEach { m ->
                        Column(
                            Modifier.weight(1f)
                                .border(
                                    1.dp,
                                    if (m == method) Green else Line,
                                    RoundedCornerShape(16.dp),
                                )
                                .background(
                                    if (m == method) Mint else Surface,
                                    RoundedCornerShape(16.dp),
                                )
                                .clickable { method = m }
                                .padding(vertical = 16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(7.dp),
                        ) {
                            AppIcon(
                                when (m) {
                                    "M-Pesa" -> Icons.Outlined.PhoneAndroid
                                    "Cash" -> Icons.Outlined.Payments
                                    else -> Icons.Outlined.CreditCard
                                },
                                null,
                                Modifier.size(23.dp),
                                tint = Ink,
                            )
                            AppText(m, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                AppText(
                    "Record a payment you have received. No payment request is sent; the confirmed sale updates shared stock.",
                    fontSize = 11.sp,
                    color = Muted,
                )
                PrimaryButton(
                    "Record received payment",
                    {
                        try {
                            if(store.real) {
                                store.backend?.perform("checkout",mapOf("method" to method)) {
                                    receipt=store.sales.firstOrNull{it.id==store.operations.lastId}
                                    payment=false;paymentError=""
                                }
                            } else {
                                receipt = store.checkout(method)
                                payment = false
                                paymentError = ""
                            }
                        } catch (e: Exception) {
                            paymentError = e.message ?: "Review your basket before paying."
                        }
                    },
                    icon = Icons.Outlined.Check,
                )
            }
        }
    receipt?.let { sale ->
        AlertDialog(
            onDismissRequest = {
                receipt = null
                onComplete()
            },
            containerColor = Canvas,
            icon = {
                AppIcon(Icons.Outlined.CheckCircle, null, Modifier.size(56.dp), tint = Green)
            },
            title = { AppText("Sale complete", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    AppText(
                        minorMoney(sale.amountMinor),
                        fontFamily = AppFont,
                        style = MaterialTheme.typography.headlineMedium,
                    )
                    AppText(
                        "Demo receipt #${sale.id}\n${sale.items} items · ${sale.method}\nYour stock has been updated.",
                        fontSize = 13.sp,
                        color = Muted,
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        receipt = null
                        onComplete()
                    }
                ) {
                    AppText("View sales")
                }
            },
            dismissButton = { TextButton(onClick = { receipt = null }) { AppText("Another sale") } },
        )
    }
}

@Composable
fun SalesScreen(store: DemoStore, navigate: (Screen) -> Unit) {
    var filter by rememberSaveable { mutableStateOf("All sales") }
    var selected by remember { mutableStateOf<Sale?>(null) }
    Page {
        PageTitle("Sales", "Today’s transactions")
        SurfaceCard(color = Mint) {
            Eyebrow("Total Sales", Green)
            AppText(
                com.biashara.app.data.minorMoney(store.branchSalesMinor),
                fontFamily = AppFont,
                style = MaterialTheme.typography.headlineLarge,
                color = Ink,
                modifier = Modifier.padding(top = 12.dp),
            )
            AppText(
                "${42+store.sales.count{it.id>1048}} sales  ·  18.6% better than yesterday",
                fontSize = 11.sp,
                color = Muted,
                modifier = Modifier.padding(top = 8.dp),
            )
        }
        PrimaryButton("Make a new sale", { navigate(Screen.NEW_SALE) }, icon = Icons.Outlined.Add)
        FilterPills(listOf("All sales", "M-Pesa", "Cash", "Card"), filter, { filter = it })
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Eyebrow("Today's transactions")
            val sales =
                store.sales.filter {
                    it.branch == store.operations.branch &&
                        (filter == "All sales" || it.method.contains(filter))
                }
            if (sales.isEmpty())
                EmptyState(
                    "Nothing here just yet",
                    "Completed sales will appear here.",
                    Icons.AutoMirrored.Outlined.ReceiptLong,
                )
            sales.forEach { sale ->
                SurfaceCard(Modifier.clickable { selected = sale }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconTile(Icons.AutoMirrored.Outlined.ReceiptLong)
                        Column(Modifier.weight(1f).padding(start = 13.dp)) {
                            AppText(sale.customer, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            AppText(
                                "#${sale.id} · ${sale.items} ${if(sale.items==1)"item" else "items"} · ${sale.method}",
                                fontSize = 10.sp,
                                color = Muted,
                                modifier = Modifier.padding(top = 4.dp),
                            )
                        }
                        AppText(
                            "${money(sale.amount)}",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
        }
    }
    selected?.let { sale ->
        AlertDialog(
            onDismissRequest = { selected = null },
            title = { AppText("Receipt #${sale.id}") },
            text = {
                AppText(
                    "${sale.customer}\n${sale.items} items · ${sale.method}\nKES ${money(sale.amount)}\n\nSample transaction in your demo store."
                )
            },
            confirmButton = { TextButton(onClick = { selected = null }) { AppText("Done") } },
        )
    }
}
