package com.biashara.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.biashara.app.data.*

@Composable
fun ReportsScreen(store: DemoStore, onBack: () -> Unit) {
    var period by rememberSaveable { mutableStateOf("This week") }
    var metric by rememberSaveable { mutableStateOf("Sales") }
    val multiplier = if (period == "This week") 1 else 4
    val total =
        when (metric) {
            "Profit" -> 18920
            "Expenses" -> 6400
            "Stock" -> store.products.sumOf { it.price * it.stock }
            else -> 89050
        } * multiplier
    Page {
        PageTitle("Business Reports", onBack = onBack)
        Row(
            Modifier.fillMaxWidth()
                .background(Surface, RoundedCornerShape(16.dp))
                .padding(15.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AppIcon(Icons.Outlined.CalendarMonth, null, Modifier.size(19.dp), tint = Ink)
            AppText(
                "1 – 31 Oct 2026",
                fontSize = 11.sp,
                color = Muted,
                modifier = Modifier.weight(1f).padding(start = 10.dp),
            )
            TextButton(
                onClick = { period = if (period == "This week") "This month" else "This week" },
                contentPadding = PaddingValues(0.dp),
                modifier = Modifier.height(28.dp),
            ) {
                AppText(period, fontSize = 11.sp)
                AppIcon(Icons.Outlined.KeyboardArrowDown, null, Modifier.size(16.dp))
            }
        }
        FilterPills(listOf("Sales", "Profit", "Expenses", "Stock"), metric, { metric = it })
        SurfaceCard {
            Eyebrow("Total ${metric.lowercase()}")
            AppText(
                "KES ${money(total)}",
                fontFamily = AppFont,
                style = MaterialTheme.typography.headlineLarge,
                modifier = Modifier.padding(top = 10.dp),
            )
            AppText(
                if (metric == "Expenses") "↘ 4.2% less than the previous period"
                else "↗ 18.6% more than the previous period",
                fontSize = 10.sp,
                color = Green,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(top = 7.dp, bottom = 26.dp),
            )
            if (metric == "Expenses") {
                listOf(
                        "Stock transport" to .65f,
                        "Shop rent" to .88f,
                        "Utilities" to .43f,
                        "Other" to .2f,
                    )
                    .forEach { (name, v) ->
                        Row(Modifier.fillMaxWidth().padding(top = 14.dp, bottom = 5.dp)) {
                            AppText(
                                name,
                                fontSize = 11.sp,
                                color = Muted,
                                modifier = Modifier.weight(1f),
                            )
                            AppText(
                                "KES ${money((v*total/2.2f).toInt())}",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                        LinearProgressIndicator(
                            progress = { v },
                            modifier = Modifier.fillMaxWidth().height(6.dp),
                            color = Green,
                            trackColor = Mint,
                            strokeCap = androidx.compose.ui.graphics.StrokeCap.Round,
                        )
                    }
            } else SalesChart(bars = false)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            SurfaceCard(Modifier.weight(1f)) {
                IconTile(Icons.Outlined.ShoppingBag, size = 36)
                AppText(
                    "${147*multiplier}",
                    style = MaterialTheme.typography.headlineSmall,
                    modifier = Modifier.padding(top = 14.dp),
                )
                AppText(
                    "Total transactions",
                    fontSize = 10.sp,
                    color = Muted,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
            SurfaceCard(Modifier.weight(1f)) {
                IconTile(
                    Icons.AutoMirrored.Outlined.TrendingUp,
                    background = Sand,
                    color = Amber,
                    size = 36,
                )
                AppText(
                    "KES 588",
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(top = 17.dp),
                )
                AppText(
                    "Average sale",
                    fontSize = 10.sp,
                    color = Muted,
                    modifier = Modifier.padding(top = 7.dp),
                )
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            SectionTitle("Top Products")
            store.products.take(3).forEachIndexed { i, p ->
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    AppText(
                        "0${i+1}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Muted,
                        modifier = Modifier.width(30.dp),
                    )
                    ProductArt(p.art, Modifier.size(47.dp, 55.dp))
                    Column(Modifier.weight(1f).padding(start = 12.dp)) {
                        AppText(p.name, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        AppText(
                            "${listOf(124,86,72)[i]*multiplier} units sold",
                            fontSize = 10.sp,
                            color = Muted,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                    AppText(
                        "${money(listOf(22320,30100,8640)[i]*multiplier)}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
        AppText(
            "Illustrative reports based on sample data. Live reporting comes with the backend.",
            fontSize = 10.sp,
            color = Muted,
        )
    }
}

@Composable
fun AssistantScreen(store: DemoStore, onBack: () -> Unit) {
    var input by rememberSaveable { mutableStateOf("") }
    var about by remember { mutableStateOf(false) }
    val scroll = rememberLazyListState()
    LaunchedEffect(store.messages.size) {
        scroll.animateScrollToItem(store.messages.lastIndex.coerceAtLeast(0))
    }
    Column(
        Modifier.fillMaxSize()
            .background(
                androidx.compose.ui.graphics.Brush.verticalGradient(
                    listOf(Canvas, BlueMist)
                )
            )
            .padding(horizontal = 18.dp)
            .padding(top = 12.dp)
            .imePadding()
    ) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack, modifier = Modifier.size(34.dp)) {
                AppIcon(Icons.Outlined.ChevronLeft, "Go back")
            }
            Box(
                Modifier.size(37.dp)
                    .background(
                        androidx.compose.ui.graphics.Brush.sweepGradient(
                            listOf(
                                Color(0xFF35D8EE),
                                Color(0xFF4567F8),
                                Color(0xFF9146FF),
                                Color(0xFF35D8EE),
                            )
                        ),
                        CircleShape,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                AppIcon(
                    Icons.Outlined.AutoAwesome,
                    null,
                    Modifier.size(18.dp),
                    tint = Color.White.copy(alpha = .7f),
                )
            }
            Column(Modifier.weight(1f).padding(start = 11.dp)) {
                AppText(if (store.real) "Business summaries" else "BiasharaAI", fontSize = 17.sp, fontWeight = FontWeight.Bold)
                AppText(
                    "Your business assistant",
                    fontSize = 10.sp,
                    color = Muted,
                    modifier = Modifier.padding(top = 3.dp),
                )
            }
            IconButton(onClick = { about = true }, modifier = Modifier.size(30.dp)) {
                AppIcon(Icons.Outlined.MoreVert, "About this assistant", Modifier.size(19.dp))
            }
        }
        LazyColumn(
            Modifier.weight(1f),
            state = scroll,
            verticalArrangement = Arrangement.spacedBy(14.dp),
            contentPadding = PaddingValues(top = 25.dp, bottom = 14.dp),
        ) {
            items(store.messages.size) { index ->
                val m = store.messages[index]
                Column(
                    Modifier.fillMaxWidth(),
                    horizontalAlignment = if (m.user) Alignment.End else Alignment.Start,
                ) {
                    Column(
                        Modifier.widthIn(max = if (m.user) 265.dp else 355.dp)
                            .background(
                                if (m.user) Color(0xFF266CDE) else Surface,
                                RoundedCornerShape(
                                    topStart = 16.dp,
                                    topEnd = 16.dp,
                                    bottomStart = 16.dp,
                                    bottomEnd = if (m.user) 5.dp else 16.dp,
                                ),
                            )
                            .padding(15.dp)
                    ) {
                        AppText(
                            m.text,
                            fontSize = 12.sp,
                            lineHeight = 20.sp,
                            color = if (m.user) Color.White else Ink,
                        )
                        if (!store.real && index == 1 && !m.user) {
                            Spacer(Modifier.height(15.dp))
                            listOf(
                                    Triple("Total sales", "KES 12,450", Mint),
                                    Triple("Profit", "KES 3,890", BlueMist),
                                    Triple("Expenses", "KES 2,300", Sand),
                                )
                                .forEachIndexed { i, (label, value, bg) ->
                                    Row(
                                        Modifier.fillMaxWidth().padding(vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        IconTile(
                                            if (i == 0) Icons.Outlined.ShoppingBag
                                            else if (i == 1) Icons.Outlined.BarChart
                                            else Icons.Outlined.AccountBalanceWallet,
                                            if (i == 2) Amber else Green,
                                            bg,
                                            34,
                                        )
                                        Column(Modifier.weight(1f).padding(start = 10.dp)) {
                                            AppText(
                                                value,
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Bold,
                                            )
                                            AppText(
                                                label,
                                                fontSize = 10.sp,
                                                color = Muted,
                                                modifier = Modifier.padding(top = 3.dp),
                                            )
                                        }
                                        AppText(
                                            if (i == 0) "↑ 12%" else if (i == 1) "↑ 8%" else "↑ 5%",
                                            fontSize = 10.sp,
                                            color = if (i == 2) Coral else Green,
                                        )
                                    }
                                }
                            HorizontalDivider(Modifier.padding(vertical = 12.dp), color = Line)
                            AppText("Your best selling item was", fontSize = 11.sp, color = Muted)
                            AppText(
                                "Soko Maize Flour 2kg",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(top = 7.dp),
                            )
                            AppText(
                                "(28 units)",
                                fontSize = 11.sp,
                                color = Muted,
                                modifier = Modifier.padding(top = 3.dp),
                            )
                            AppText(
                                "Demo insights",
                                fontSize = 9.sp,
                                color = Muted,
                                modifier = Modifier.padding(top = 12.dp),
                            )
                        }
                    }
                }
            }
        }
        Column(
            verticalArrangement = Arrangement.spacedBy(7.dp),
            modifier = Modifier.padding(bottom = 13.dp),
        ) {
            listOf("What should I restock?", "Who owes me money?", "Show profit this week")
                .forEach { q ->
                    Row(
                        Modifier.fillMaxWidth()
                            .background(Lavender, RoundedCornerShape(20.dp))
                            .clickable { store.reply(q) }
                            .padding(horizontal = 13.dp, vertical = 9.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        AppIcon(
                            Icons.Outlined.ChatBubbleOutline,
                            null,
                            Modifier.size(13.dp),
                            tint = Muted,
                        )
                        AppText(
                            q,
                            fontSize = 11.sp,
                            color = Ink,
                            modifier = Modifier.padding(start = 8.dp),
                        )
                    }
                }
        }
        Row(
            Modifier.fillMaxWidth()
                .padding(bottom = 14.dp)
                .navigationBarsPadding()
                .background(Surface, RoundedCornerShape(22.dp))
                .border(1.dp, Line, RoundedCornerShape(22.dp))
                .padding(6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BasicTextField(
                input,
                { input = it.take(500) },
                textStyle = TextStyle(fontFamily = AppFont, fontSize = 13.sp, color = Ink),
                modifier = Modifier.weight(1f).padding(horizontal = 12.dp),
                decorationBox = { inner ->
                    Box {
                        if (input.isEmpty())
                            AppText("Ask anything…", fontSize = 12.sp, color = Muted)
                        inner()
                    }
                },
            )
            AppIcon(
                Icons.Outlined.MicNone,
                null,
                Modifier.padding(end = 10.dp).size(17.dp),
                tint = Muted,
            )
            Box(
                Modifier.size(34.dp).background(Forest, CircleShape).clickable(
                    enabled = input.isNotBlank()
                ) {
                    store.reply(input.trim())
                    input = ""
                },
                contentAlignment = Alignment.Center,
            ) {
                AppIcon(
                    Icons.Outlined.ArrowUpward,
                    "Send message",
                    Modifier.size(18.dp),
                    tint = Color.White,
                )
            }
        }
    }
    if (about)
        ActionSheet(
            onDismissRequest = { about = false },
            title = { AppText(if (store.real) "About business summaries" else "BiasharaAI preview") },
            text = {
                AppText(
                    if (store.real) "These summaries are calculated from your recorded sales, stock and customer balances. A generative AI service is not connected." else "This UI preview uses local sample responses based on your demo stock and customer balances. Live AI will be connected in the next phase."
                )
            },
            confirmButton = { TextButton(onClick = { about = false }) { AppText("Done") } },
        )
}

@Composable
fun FinanceScreen(onBack: () -> Unit, store: DemoStore? = null, onReports: () -> Unit = {}, onVerification: () -> Unit = {}) {
    if (store?.real == true) ConnectedFundingScreen(store,onBack,onReports,onVerification)
    else Page {
        PageTitle("Business funding", onBack = onBack)
        SurfaceCard(color = Mint) { AppText("Prepare for your next chapter", style = MaterialTheme.typography.headlineSmall); AppText("Sign in to your business account to prepare funding requests, save drafts and compare provider-quoted terms. Kenya is the launch market; other African markets are coming soon.", color = Muted) }
        AppText("Lending-provider setup is pending. No loan offers, approvals or disbursements are available.", color = Muted)
        PrimaryButton("Review business reports", onReports, tone = Green)
    }
}
