package com.biashara.app.data

import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

internal val workspaceZone: ZoneId = ZoneId.of("Africa/Nairobi")

internal fun bookingNeedsAttention(booking: org.json.JSONObject, day: LocalDate) =
    booking.optString("status") in listOf("Scheduled", "In progress") &&
        Instant.parse(booking.getString("startsAt")).atZone(workspaceZone).toLocalDate() == day

internal fun deliveryInFulfilment(status: String) =
    status == "New" || status == "Confirmed" || status == "Packing" || status == "Dispatched"

internal fun DemoStore.productsAtReorderLevel() = liveState.records("products").filter {
    it.records("components").isEmpty() && it.optInt("stock") <= it.optInt("reorder")
}

internal fun DemoStore.activityCount(metric: String): Int {
    val op = operations.state
    val branch = operations.branch
    return when (metric) {
        "bookingsToday" -> {
            val today = LocalDate.now(workspaceZone)
            op.records("bookings").count { bookingNeedsAttention(it, today) }
        }
        "reorder" -> productsAtReorderLevel().size
        "expiry" -> {
            val limit = LocalDate.now(workspaceZone).plusDays(14).toString()
            op.records("batches").count {
                it.optString("branch") == branch && it.optInt("quantity") > 0 && it.optString("expires") <= limit
            }
        }
        "stocktake" -> op.records("counts").count {
            it.optString("branch") == branch && it.optString("status") == "Draft"
        }
        "transfer" -> op.records("transfers").count {
            it.optString("to") == branch && it.optString("status") == "Dispatched"
        }
        "purchase" -> op.records("purchaseOrders").count {
            it.optString("branch", "main") == branch && it.optString("status") == "Draft"
        }
        "receivable" -> op.records("documents").count {
            it.optString("branch") == branch && it.optString("kind") == "Invoice" &&
                it.optString("status") == "Issued locally" &&
                it.optLong("total") > it.records("installments").sumOf { payment -> payment.optLong("amount") }
        }
        "delivery" -> op.records("deliveries").count {
            it.optString("branch") == branch && deliveryInFulfilment(it.optString("status"))
        }
        else -> error("Unknown commerce metric: $metric")
    }
}
