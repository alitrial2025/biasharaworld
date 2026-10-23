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
}
