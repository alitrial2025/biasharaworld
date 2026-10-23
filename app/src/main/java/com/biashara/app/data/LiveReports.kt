package com.biashara.app.data

import java.time.LocalDate
import org.json.JSONObject

data class BusinessReport(
    val sales: Long, val expenses: Long, val cost: Long,
    val receipts: List<JSONObject>, val series: List<Float>,
    val refunds: Long = 0,
) { val profit get() = sales - expenses - cost }

fun DemoStore.report(days: Int = 1): BusinessReport {
    val count = days.coerceIn(1, 366)
    val end = todayLocal()
    val start = LocalDate.parse(end).minusDays(count.toLong() - 1).toString()
    val allReceipts = operations.state.records("receipts").filter { it.optString("branch") == operations.branch }
    val receipts = allReceipts.filter { it.optString("date") in start..end }
    val refunds = operations.state.records("returns").filter { r ->
        r.optString("date") in start..end && allReceipts.any { it.optInt("id") == r.optInt("saleId") }
    }
    val returned = refunds.sumOf { it.optLong("amount") }
    val revenue = receipts.sumOf { it.optLong("total") } - returned
    val expenses = liveState.records("expenses").filter { it.optString("date") in start..end }
        .sumOf { kotlin.math.round(it.optDouble("amount") * 100).toLong() }
    val cost = receipts.sumOf { it.records("lines").sumOf { line -> line.optLong("cost") * line.optInt("quantity") } } -
        refunds.filter { it.optBoolean("restock") }.sumOf { r ->
            (allReceipts.firstOrNull { it.optInt("id") == r.optInt("saleId") }?.records("lines")
                ?.firstOrNull { it.optInt("productId") == r.optInt("productId") }?.optLong("cost") ?: 0L) * r.optInt("quantity")
        }
    val totals = List(count) { index ->
        val date = LocalDate.parse(start).plusDays(index.toLong()).toString()
        (receipts.filter { it.optString("date") == date }.sumOf { it.optLong("total") } -
            refunds.filter { it.optString("date") == date }.sumOf { it.optLong("amount") }).toFloat()
    }
    return BusinessReport(revenue, expenses, cost, receipts, totals, returned)
}

fun csvCell(value: String) = "\"" + value.replace("\"", "\"\"") + "\""
fun DemoStore.reportCsv(days: Int): String {
    val end = todayLocal()
    val start = LocalDate.parse(end).minusDays(days.toLong() - 1).toString()
    val receipts = operations.state.records("receipts").filter { it.optString("branch") == operations.branch }
    val rows = mutableListOf(listOf("Record", "Date", "Reference", "Name", "Amount (KES)"))
    receipts.filter { it.optString("date") in start..end }.forEach { rows += listOf("Sale", it.optString("date"), it.optInt("id").toString(), it.optString("customer"), moneyInput(it.optLong("total"))) }
    operations.state.records("returns").filter { r -> r.optString("date") in start..end && receipts.any { it.optInt("id") == r.optInt("saleId") } }.forEach { rows += listOf("Refund", it.optString("date"), it.optInt("saleId").toString(), it.optString("reason"), moneyInput(-it.optLong("amount"))) }
    liveState.records("expenses").filter { it.optString("date") in start..end }.forEach { rows += listOf("Expense", it.optString("date"), it.optInt("id").toString(), it.optString("name"), moneyInput(-kotlin.math.round(it.optDouble("amount") * 100).toLong())) }
    return rows.joinToString("\r\n") { row -> row.joinToString(",", transform = ::csvCell) } + "\r\n"
}
