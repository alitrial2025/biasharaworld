package com.biashara.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.biashara.app.data.DemoStore
import com.biashara.app.data.minorMoney
import com.biashara.app.data.money
import com.biashara.app.data.report

@Composable
fun DashboardScreen(store: DemoStore, navigate: (Screen) -> Unit, onBranch: () -> Unit = {}, onProduct: (Int) -> Unit = { navigate(Screen.STOCK) }, onSupplier: (String) -> Unit = { navigate(Screen.SUPPLIERS) }) {
    var search by remember { mutableStateOf("") }
    var period by remember { mutableStateOf("Day") }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        Box(
            Modifier.fillMaxWidth()
                .height(196.dp)
                .clip(RoundedCornerShape(bottomStart = 22.dp, bottomEnd = 22.dp))
        ) {
            ShopPhoto(Modifier.fillMaxSize(), Alignment.Center)
            Box(
                Modifier.fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Black.copy(alpha = .66f), Color.Black.copy(alpha = .22f))
                        )
                    )
            )
            Column(
                Modifier.fillMaxSize().padding(horizontal = 18.dp, vertical = 18.dp),
                verticalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
                    Column(Modifier.weight(1f)) {
                        AppText(
                            "Good morning",
                            fontSize = 13.sp,
                            color = Color.White.copy(alpha = .9f),
                        )
                        AppText(
                            "${store.ownerName} 👋",
                            fontSize = 25.sp,
                            fontFamily = HeadingFont,
                            fontWeight = FontWeight.Bold,
                            color = Color.White,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                        Row(
                            Modifier.padding(top = 5.dp).clickable { onBranch() },
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            AppText(
                                "${store.businessName} · ${store.operations.branchName}",
                                fontSize = 11.sp,
                                color = Color.White,
                            )
                            AppIcon(
                                Icons.Outlined.KeyboardArrowDown,
                                null,
                                Modifier.size(15.dp),
                                tint = Color.White,
                            )
                        }
                    }
                    Box(
                        Modifier.size(39.dp).clip(CircleShape).background(Surface).clickable {
                            navigate(Screen.PROFILE)
                        }
                    ) {
                        if (store.real) Box(Modifier.fillMaxSize().background(Mint), contentAlignment = Alignment.Center) { AppText(store.ownerName.take(1).uppercase(), color = Green, fontWeight = FontWeight.Bold) }
                        else ProfilePhoto(Modifier.fillMaxSize())
                        Box(
                            Modifier.align(Alignment.TopEnd)
                                .size(8.dp)
                                .background(Coral, CircleShape)
                        )
                    }
                }
                SearchBox(search, { search = it }, "Search products, suppliers…")
            }
        }
        Column(
            Modifier.padding(horizontal = 18.dp).padding(top = 18.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            if (search.isNotBlank()) {
                val results = store.products.filter { it.name.contains(search, true) || it.sku.contains(search, true) || it.barcode.contains(search) }
                val suppliers = store.suppliers.filter { it.name.contains(search, true) || it.category.contains(search, true) }
                if (results.isEmpty() && suppliers.isEmpty()) AppText("No matching records", fontSize = 12.sp, color = Muted)
                results.take(3).forEach { p ->
                    Row(
                        Modifier.fillMaxWidth().clickable { onProduct(p.id) }.padding(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        ProductPhoto(p, store, Modifier.size(32.dp, 39.dp))
                        AppText(
                            p.name,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(start = 10.dp).weight(1f),
                        )
                        AppText(
                            minorMoney(p.priceMinor),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
            if (search.isNotBlank()) store.suppliers.filter { it.name.contains(search, true) || it.category.contains(search, true) }.take(3).forEach { supplier ->
                SurfaceCard(Modifier.clickable { onSupplier(supplier.name) }) { AppText(supplier.name, fontWeight = FontWeight.Bold); AppText(supplier.category, color = Muted) }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                val actions =
                    listOf(
                        Triple("New Sale", Icons.Outlined.PointOfSale, Screen.NEW_SALE),
                        Triple("Add Stock", Icons.Outlined.Inventory2, Screen.STOCK),
                        Triple("Expenses", Icons.Outlined.Receipt, if(store.real) Screen.EXPENSES else Screen.REPORTS),
                        Triple("Customers", Icons.Outlined.PeopleOutline, Screen.CUSTOMERS),
                    )
                val colors = listOf(Green, Coral, Indigo, Indigo)
                val backgrounds = listOf(Mint, RoseMist, Lavender, BlueMist)
                actions.forEachIndexed { i, (label, icon, route) ->
                    Column(
                        Modifier.weight(1f)
                            .clip(RoundedCornerShape(15.dp))
                            .background(Surface)
                            .clickable { navigate(route) }
                            .padding(vertical = 12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(9.dp),
                    ) {
                        IconTile(icon, colors[i], backgrounds[i], 36)
                        AppText(label, fontSize = 10.sp, color = Ink)
                    }
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    SummaryCard(
                        "Total Sales",
                        com.biashara.app.data.minorMoney(store.branchSalesMinor),
                        if (store.real) "Recorded today" else "↑ 12%",
                        Mint,
                        Green,
                        Modifier.weight(1f),
                    )
                    SummaryCard(
                        "Profit",
                        if (store.real) minorMoney(store.report().profit) else "KES 3,890",
                        if (store.real) "Recorded today" else "↑ 8%",
                        BlueMist,
                        Indigo,
                        Modifier.weight(1f),
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    SummaryCard(
                        "Expenses",
                        if (store.real) minorMoney(store.report().expenses) else "KES 2,300",
                        if (store.real) "Recorded today" else "↑ 5%",
                        RoseMist,
                        Coral,
                        Modifier.weight(1f),
                    )
                    SummaryCard(
                        "Pending Debts",
                        minorMoney(store.customers.sumOf { it.balanceMinor }),
                        "${store.customers.count{it.balanceMinor>0}} customers",
                        Sand,
                        Amber,
                        Modifier.weight(1f),
                    )
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(13.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    AppText(
                        "Sales Trend",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.weight(1f),
                    )
                    Row(
                        Modifier.background(Surface, RoundedCornerShape(10.dp))
                            .clickable { period = if (period == "Day") "Week" else "Day" }
                            .padding(horizontal = 12.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        AppText(period, fontSize = 11.sp)
                        AppIcon(Icons.Outlined.KeyboardArrowDown, null, Modifier.size(14.dp))
                    }
                }
                SalesChart(
                    bars = period == "Day",
                    modifier = Modifier.fillMaxWidth(),
                    series =
                        if (store.real) store.report(if (period == "Day") 1 else 7).series else null,
                )
            }
            Row(
                Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(Sand)
                    .clickable { navigate(Screen.STOCK) }
                    .padding(13.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AppIcon(Icons.Outlined.Inventory2, null, Modifier.size(20.dp), tint = Amber)
                Column(Modifier.weight(1f).padding(start = 10.dp)) {
                    AppText(
                        "${store.lowStock.size} products need restocking",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    AppText(
                        "Check your inventory",
                        fontSize = 10.sp,
                        color = Amber,
                        modifier = Modifier.padding(top = 3.dp),
                    )
                }
                AppIcon(Icons.Outlined.ChevronRight, null, Modifier.size(17.dp), tint = Amber)
            }
            Column(verticalArrangement = Arrangement.spacedBy(13.dp)) {
                SectionTitle("Recent Sales", "View all", { navigate(Screen.SALES) })
                store.sales.filter { it.branch == store.operations.branch }.take(3).forEach { s ->
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        IconTile(Icons.Outlined.ShoppingBag, Green, Mint, 35)
                        Column(Modifier.weight(1f).padding(start = 10.dp)) {
                            AppText(s.customer, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                            AppText(
                                "#${s.id} · ${s.method}",
                                fontSize = 10.sp,
                                color = Muted,
                                modifier = Modifier.padding(top = 3.dp),
                            )
                        }
                        AppText(
                            minorMoney(s.amountMinor),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
            Row(
                Modifier.fillMaxWidth()
                    .clip(RoundedCornerShape(15.dp))
                    .background(Lavender)
                    .clickable { navigate(Screen.ASSISTANT) }
                    .padding(15.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AppIcon(
                    Icons.Outlined.AutoAwesome,
                    null,
                    Modifier.size(24.dp),
                    tint = Indigo,
                )
                Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                    AppText("BiasharaAI", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    AppText(
                        "Your business assistant",
                        fontSize = 10.sp,
                        color = Muted,
                        modifier = Modifier.padding(top = 3.dp),
                    )
                }
                AppIcon(Icons.Outlined.ChevronRight, null, Modifier.size(18.dp), tint = Muted)
            }
        }
    }
}

@Composable
private fun SummaryCard(
    title: String,
    value: String,
    detail: String,
    bg: Color,
    accent: Color,
    modifier: Modifier,
) {
    Column(
        modifier
            .clip(RoundedCornerShape(16.dp))
            .background(
                Brush.verticalGradient(
                    listOf(bg, androidx.compose.ui.graphics.lerp(bg, Surface, .20f))
                )
            )
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(7.dp),
    ) {
        AppText(
            title,
            fontSize = 11.sp,
            color = if (title == "Total Sales" || title == "Profit") Muted else accent,
        )
        AppText(value, fontSize = 19.sp, fontWeight = FontWeight.Bold, letterSpacing = (-.5).sp)
        AppText(detail, fontSize = 11.sp, color = if (title == "Pending Debts") Muted else accent)
    }
}
