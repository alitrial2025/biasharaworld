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
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import com.biashara.app.data.objectAt
import java.time.LocalTime
import com.biashara.app.data.DemoStore
import com.biashara.app.data.minorMoney
import com.biashara.app.data.money
import com.biashara.app.data.report
import com.biashara.app.data.canPerform

@Composable
fun DashboardScreen(store: DemoStore, navigate: (Screen) -> Unit, onBranch: () -> Unit = {}, onProduct: (Int) -> Unit = { navigate(Screen.STOCK) }, onSupplier: (String) -> Unit = { navigate(Screen.SUPPLIERS) }) {
    var search by remember { mutableStateOf("") }
    var period by remember { mutableStateOf("Day") }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
        HomeHero(store, search, { search = it }, onBranch) { navigate(Screen.PROFILE) }
        Column(
            Modifier.padding(horizontal = 20.dp).padding(top = 20.dp, bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
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
            HomeQuickActions(store, navigate)
            SectionTitle("Today at a glance", "Reports", { navigate(Screen.REPORTS) })
            HomeMetrics(store)
            if (store.real) IndustryShortcut(store, { navigate(Screen.OPERATIONS) })
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
            if (!store.real || store.lowStock.isNotEmpty()) Row(
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
                if (store.sales.none { it.branch == store.operations.branch }) SurfaceCard {
                    AppText("Your next sale starts here", style = MaterialTheme.typography.titleMedium)
                    AppText("Recorded receipts will appear here after your first sale.", color = Muted)
                }
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
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        AppText(
            title,
            fontSize = 12.sp,
            color = if (title == "Total Sales" || title == "Profit") Muted else accent,
        )
        AppText(value, fontSize = 22.sp, fontWeight = FontWeight.Bold, letterSpacing = (-.5).sp)
        AppText(detail, fontSize = 12.sp, color = if (title == "Pending Debts") Muted else accent)
    }
}

@Composable
private fun HomeHero(store: DemoStore, query: String, onQuery: (String) -> Unit, onBranch: () -> Unit, onProfile: () -> Unit) {
    val hour = LocalTime.now().hour
    val greeting = when (hour) { in 0..11 -> "Good morning"; in 12..17 -> "Good afternoon"; else -> "Good evening" }
    Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(bottomStart = 28.dp, bottomEnd = 28.dp)).background(Brush.verticalGradient(listOf(Color(0xFF194B3A), Color(0xFF103629))))) {
        BrandDoodleBackdrop(Modifier.matchParentSize(), tint = Color.White, opacity = .055f)
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    AppText(greeting, fontSize = 13.sp, color = Color.White.copy(alpha = .8f))
                    AppText(store.ownerName.trim().substringBefore(' ').ifBlank { "Welcome" }, fontSize = 28.sp, fontFamily = HeadingFont, fontWeight = FontWeight.Bold, color = Color.White)
                }
                if (store.backend != null) IconButton(onClick = { store.backend?.action { store.backend?.load() } }, enabled = store.backend?.busy != true, modifier = Modifier.size(48.dp)) {
                    AppIcon(Icons.Outlined.Refresh, "Refresh workspace", tint = Color.White)
                }
                IconButton(onClick = onProfile, modifier = Modifier.size(48.dp).background(Color.White.copy(alpha = .12f), CircleShape)) {
                    AppIcon(Icons.Outlined.PersonOutline, "Business profile", tint = Color.White)
                }
            }
            Row(Modifier.fillMaxWidth().heightIn(min = 52.dp).clip(RoundedCornerShape(14.dp)).background(Color.White.copy(alpha = .08f)).clickable(onClick = onBranch).padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                AppIcon(Icons.Outlined.Storefront, null, Modifier.size(22.dp), Color.White)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    AppText(store.businessName, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color.White, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    AppText(store.operations.branchName, fontSize = 12.sp, color = Color.White.copy(alpha = .8f))
                }
                AppIcon(Icons.Outlined.ExpandMore, "Choose branch", Modifier.size(20.dp), Color.White)
            }
            SearchBox(query, onQuery, "Search products, suppliers…")
        }
    }
}

@Composable
private fun HomeQuickActions(store: DemoStore, navigate: (Screen) -> Unit) {
    val catalog = com.biashara.app.data.industryCatalog(androidx.compose.ui.platform.LocalContext.current)
    val industry = com.biashara.app.data.resolveIndustry(catalog, store.liveState.objectAt("profile").optString("type"))
    val trade = !store.real || "inventory" in industry.recommendedTools
    val actions = listOf(
        Triple("New Sale", Icons.Outlined.PointOfSale, Screen.NEW_SALE),
        if (trade) Triple("Add Stock", Icons.Outlined.Inventory2, Screen.STOCK) else Triple(industry.operationsLabel, Icons.Outlined.Workspaces, Screen.OPERATIONS),
        Triple("Expenses", Icons.Outlined.Receipt, if (store.real) Screen.EXPENSES else Screen.REPORTS),
        Triple("Customers", Icons.Outlined.PeopleOutline, Screen.CUSTOMERS),
    )
    BoxWithConstraints {
        val columns = if (maxWidth < 340.dp || LocalDensity.current.fontScale >= 1.4f) 2 else 4
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            actions.chunked(columns).forEach { row ->
                Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    row.forEach { (label, icon, route) ->
                        val enabled = route != Screen.NEW_SALE || store.canPerform("checkout")
                        Column(Modifier.weight(1f).fillMaxHeight().clip(RoundedCornerShape(16.dp)).background(Surface).clickable(enabled = enabled) { navigate(route) }.padding(horizontal = 6.dp, vertical = 14.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            IconTile(icon, if (enabled) Green else Muted, if (enabled) Mint else Canvas, 40)
                            AppText(label, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = if (enabled) Ink else Muted, textAlign = TextAlign.Center)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HomeMetrics(store: DemoStore) {
    val today = if (store.real) store.report() else null
    val metrics = listOf(
        Triple("Total Sales", minorMoney(store.branchSalesMinor), if (store.real) "Recorded today" else "↑ 12%"),
        Triple("Profit", if (store.real) minorMoney(today!!.profit) else "KES 3,890", if (store.real) "Recorded today" else "↑ 8%"),
        Triple("Expenses", if (store.real) minorMoney(today!!.expenses) else "KES 2,300", if (store.real) "Recorded today" else "↑ 5%"),
        Triple("Pending Debts", minorMoney(store.customers.sumOf { it.balanceMinor }), "${store.customers.count { it.balanceMinor > 0 }} customers"),
    )
    val backgrounds = listOf(Mint, BlueMist, RoseMist, Sand)
    val accents = listOf(Green, Indigo, Coral, Amber)
    BoxWithConstraints {
        val columns = if (maxWidth < 320.dp || LocalDensity.current.fontScale >= 1.4f) 1 else 2
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            metrics.withIndex().toList().chunked(columns).forEach { row ->
                Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    row.forEach { (index, metric) -> SummaryCard(metric.first, metric.second, metric.third, backgrounds[index], accents[index], Modifier.weight(1f).fillMaxHeight()) }
                }
            }
        }
    }
}
