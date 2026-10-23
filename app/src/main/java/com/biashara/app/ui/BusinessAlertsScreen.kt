package com.biashara.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.biashara.app.data.*
import java.time.LocalDate

@Composable
fun BusinessAlertsScreen(store: DemoStore, onBack: () -> Unit, onOpen: (String) -> Unit) {
    val o = store.operations.state
    val expiring = o.records("batches").filter { it.optString("branch") == store.operations.branch && it.optInt("quantity") > 0 && it.optString("expires") <= LocalDate.parse(todayLocal()).plusDays(14).toString() }
    val overdue = o.records("documents").filter { it.optString("kind") == "Invoice" && !it.optString("status").startsWith("Paid") && it.optString("due") < todayLocal() && it.optString("branch") == store.operations.branch }
    Page {
        PageTitle("Notifications", "Business alerts", onBack)
        if (store.lowStock.isEmpty() && expiring.isEmpty() && overdue.isEmpty()) EmptyState("You’re up to date", "Stock, expiry and overdue invoice alerts will appear here when they need attention.")
        if (store.lowStock.isNotEmpty()) SurfaceCard(color = Sand) {
            AppText("${store.lowStock.size} products need restocking", style = MaterialTheme.typography.titleMedium)
            AppText(store.lowStock.take(5).joinToString { "${it.name} (${it.stock})" })
            PrimaryButton("Review stock & batches", { onOpen("expiry") }, tone = Green)
        }
        if (expiring.isNotEmpty()) SurfaceCard(color = RoseMist) {
            AppText("${expiring.size} batches expiring or expired", style = MaterialTheme.typography.titleMedium)
            PrimaryButton("Review expiry", { onOpen("expiry") }, tone = Green)
        }
        if (overdue.isNotEmpty()) SurfaceCard(color = Sand) {
            AppText("${overdue.size} overdue invoices", style = MaterialTheme.typography.titleMedium)
            PrimaryButton("Review invoices", { onOpen("documents") }, tone = Green)
        }
        Eyebrow("Account notification preferences")
        AppText("These settings are saved to your business. Automated push, email and SMS delivery are not connected.", color = Muted)
        val preferences = store.liveState.optJSONObject("notifications")
        listOf("lowStock" to "Low-stock alerts", "salesSummary" to "Sales summaries", "payments" to "Payment records", "weeklyReport" to "Weekly reports").forEach { (key, label) ->
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                AppText(label, modifier = Modifier.weight(1f))
                Switch(checked = preferences?.optBoolean(key, false) ?: false, enabled = store.canSave && store.canPerform("toggleNotification"), onCheckedChange = { store.backend?.perform("toggleNotification", mapOf("name" to key)) })
            }
        }
        BusinessFormStatus(store)
    }
}
