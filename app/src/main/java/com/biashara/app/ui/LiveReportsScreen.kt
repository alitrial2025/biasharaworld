package com.biashara.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.saveable.rememberSaveable
import com.biashara.app.data.DemoStore
import com.biashara.app.data.minorMoney
import com.biashara.app.data.report

@Composable
fun LiveReportsScreen(store: DemoStore, onBack: () -> Unit, onExpenses: () -> Unit, onPayments: () -> Unit) {
    var period by rememberSaveable { mutableStateOf("Today") }
    val days = when (period) {
        "Week" -> 7
        "Month" -> 30
        else -> 1
    }
    val report = store.report(days)
    Page {
        PageTitle("Business Reports", onBack = onBack)
        FilterPills(listOf("Today", "Week", "Month"), period, { period = it })
        SurfaceCard {
            Eyebrow("Recorded net sales")
            AppText(minorMoney(report.sales), style = MaterialTheme.typography.headlineLarge)
            SalesChart(bars = false, series = report.series)
        }
        SurfaceCard {
            Eyebrow("Operating profit")
            AppText(minorMoney(report.profit), style = MaterialTheme.typography.headlineMedium)
            AppText("Recorded sales less item costs, refunds and expenses.")
        }
        SurfaceCard {
            Eyebrow("Expenses")
            AppText(minorMoney(report.expenses), style = MaterialTheme.typography.headlineMedium)
            PrimaryButton("View expenses", onExpenses, tone = Green)
        }
        if (store.backend?.role in listOf("Owner", "Manager")) {
            PrimaryButton("Payment activity", onPayments, tone = Green)
        }
        SurfaceCard {
            Eyebrow("Transactions")
            AppText(report.receipts.size.toString())
            val average = if (report.receipts.isEmpty()) 0L else report.sales / report.receipts.size
            AppText("Average sale: " + minorMoney(average))
        }
    }
}
