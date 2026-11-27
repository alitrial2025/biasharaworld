package com.biashara.app.data

import org.junit.Assert.*
import org.junit.Test

class DemoStoreTest {
    @Test
    fun basketUsesProductPricesAndQuantities() {
        val store = DemoStore()
        store.add(1)
        store.add(1)
        store.add(2)
        assertEquals(710, store.total)
        assertEquals(3, store.itemCount)
        store.remove(1)
        assertEquals(530, store.total)
    }

    @Test
    fun basketCannotExceedStockOrIncludeSoldOutProduct() {
        val store = DemoStore()
        repeat(20) { store.add(3) }
        store.add(5)
        assertEquals(8, store.cart[3])
        assertNull(store.cart[5])
    }

    @Test
    fun checkoutCreatesReceiptReducesStockAndClearsBasket() {
        val store = DemoStore()
        store.add(1)
        store.add(2)
        val sale = store.checkout("M-Pesa")!!
        assertEquals(530, sale.amount)
        assertEquals(1049, sale.id)
        assertEquals(2, sale.items)
        assertEquals(41, store.products.first { it.id == 1 }.stock)
        assertEquals(23, store.products.first { it.id == 2 }.stock)
        assertEquals(sale, store.sales.first())
        assertEquals(0, store.itemCount)
        assertNull(store.checkout("Cash"))
    }

    @Test
    fun restockAndNewProductBecomeAvailableForSale() {
        val store = DemoStore()
        store.restock(5, 12)
        store.add(5)
        assertEquals(120, store.total)
        store.addProduct("Test coffee", 200, 3)
        val product = store.products.last()
        store.add(product.id)
        assertEquals(320, store.total)
    }

    @Test
    fun assistantUsesCurrentStockAndCustomerData() {
        val store = DemoStore()
        store.reply("What should I restock?")
        assertTrue(store.messages.last().text.contains("Sunlight soap (0 left)"))
        store.reply("Who owes me?")
        assertTrue(store.messages.last().text.contains("5,600"))
    }
    @Test
    fun liveAssistantUsesBranchQueueAndConfiguredReorderLevel() {
        val store = DemoStore(real = true)
        store.liveState.put("products", org.json.JSONArray(listOf(
            json("name" to "Bulk flour", "stock" to 15, "reorder" to 20),
            json("name" to "Table salt", "stock" to 4, "reorder" to 0),
        )))
        store.operations.state.put("deliveries", org.json.JSONArray(listOf(
            json("branch" to "main", "status" to "New"),
            json("branch" to "main", "status" to "Delivered"),
            json("branch" to "east", "status" to "Packing"),
        )))
        assertEquals(1, store.activityCount("reorder"))
        assertEquals(1, store.activityCount("delivery"))
        store.reply("What should I restock?")
        assertEquals("inventory", store.messages.last().tool)
        assertTrue(store.messages.last().text.contains("Bulk flour (15)"))
        assertFalse(store.messages.last().text.contains("Table salt"))
        store.reply("How many online orders need handling?", "delivery", "Orders in fulfilment", "deliveries")
        assertEquals("Main shop · Orders in fulfilment: 1", store.messages.last().text)
        assertEquals("deliveries", store.messages.last().tool)
        assertFalse(store.messages.any { it.text.contains("12,450") })
    }
    @Test
    fun appointmentsUseNairobiMidnightAndLiveStatuses() {
        val day = java.time.LocalDate.parse("2026-11-26")
        assertFalse(bookingNeedsAttention(json("status" to "Scheduled", "startsAt" to "2026-11-25T20:59:59Z"), day))
        assertTrue(bookingNeedsAttention(json("status" to "Scheduled", "startsAt" to "2026-11-25T21:00:00Z"), day))
        assertTrue(bookingNeedsAttention(json("status" to "In progress", "startsAt" to "2026-11-26T20:59:59Z"), day))
        assertFalse(bookingNeedsAttention(json("status" to "Scheduled", "startsAt" to "2026-11-26T21:00:00Z"), day))
        assertFalse(bookingNeedsAttention(json("status" to "Completed", "startsAt" to "2026-11-26T08:00:00Z"), day))
    }
}
