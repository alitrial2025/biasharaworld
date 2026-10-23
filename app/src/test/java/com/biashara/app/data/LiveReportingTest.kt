package com.biashara.app.data

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class LiveReportingTest {
    @Test fun dailyReportSeriesMatchesNetSalesIncludingRefundsAndCents() {
        val store = DemoStore(real = true)
        val state = JSONObject(store.operations.state.toString())
        state.put("receipts", JSONArray().put(json("id" to 1, "date" to todayLocal(), "branch" to "main", "customer" to "Customer, \"A\"", "total" to 3000, "lines" to JSONArray().put(json("productId" to 1, "quantity" to 2, "cost" to 500)))))
        state.put("returns", JSONArray().put(json("saleId" to 1, "productId" to 1, "date" to todayLocal(), "quantity" to 1, "amount" to 1500, "restock" to true, "reason" to "Returned unused")))
        store.operations.restore(state)
        store.liveState.put("expenses", JSONArray().put(json("id" to 1, "date" to todayLocal(), "name" to "Transport", "amount" to 2.5)))
        val report = store.report()
        assertEquals(1500L, report.sales); assertEquals(500L, report.cost); assertEquals(250L, report.expenses); assertEquals(750L, report.profit)
        assertEquals(listOf(1500f), report.series)
        val csv = store.reportCsv(1)
        assertTrue(csv.contains("\"Customer, \"\"A\"\"\"")); assertTrue(csv.contains("\"-15.00\"")); assertTrue(csv.contains("\"-2.50\""))
    }

    @Test fun malformedNativeQuantitiesDoNotSilentlyBecomeZero() {
        assertThrows(IllegalStateException::class.java) { nativeCommand("cart", mapOf("product" to "1", "quantity" to "not-a-number"), DemoStore()) }
        assertThrows(IllegalArgumentException::class.java) { wholeInput("-1", "Opening quantity") }
        assertThrows(IllegalArgumentException::class.java) { parseMinor("10.255") }
        assertEquals(-5, nativeCommand("payDocument", mapOf("id" to "-5"), DemoStore()).getInt("id"))
    }
}
