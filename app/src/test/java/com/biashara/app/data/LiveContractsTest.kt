package com.biashara.app.data

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class LiveContractsTest {
    @Test
    fun realBusinessNeverImportsSamplesOrSyntheticTotals() {
        val store = DemoStore(real = true)
        assertTrue(store.products.isEmpty())
        assertTrue(store.customers.isEmpty())
        assertTrue(store.sales.isEmpty())
        assertTrue(store.suppliers.isEmpty())
        assertEquals(0L, store.branchSalesMinor)
        assertEquals(0L, store.report().profit)
        assertTrue(store.operations.state.records("receipts").isEmpty())
        assertEquals(0, store.operations.state.objectAt("loyalty").length())
        assertThrows(IllegalArgumentException::class.java) {
            DemoPersistence.restore(store, DemoPersistence.snapshot(DemoStore()))
        }
        assertThrows(IllegalArgumentException::class.java) { store.operations.reset() }
    }

    @Test
    fun nativeFormsUseSharedServerCommandsAndMinorCurrencyUnits() {
        val store = DemoStore()
        store.add(1)
        val branch = nativeCommand("branch", mapOf("branch" to "westlands"), store)
        assertEquals("westlands", branch.getString("id"))
        assertFalse(branch.has("branch"))
        val batch =
            nativeCommand(
                "batch",
                mapOf(
                    "product" to "1",
                    "quantity" to "3",
                    "code" to "A",
                    "expires" to "2027-01-01",
                ),
                store,
            )
        assertEquals(1, batch.getInt("productId"))
        assertEquals(3, batch.getInt("quantity"))
        val variant =
            nativeCommand(
                "variant",
                mapOf(
                    "parent" to "1",
                    "name" to "Small",
                    "size" to "250g",
                    "sku" to "NEW",
                    "price" to "10.25",
                    "stock" to "2",
                ),
                store,
            )
        assertEquals(1025L, variant.getLong("price"))
        assertEquals(1, variant.getInt("parentId"))
        val sale =
            nativeCommand(
                "checkout",
                mapOf("split" to "true", "cash" to "100", "mpesa" to "80", "card" to "0"),
                store,
            )
        assertEquals(
            18000L,
            sale.getJSONArray("payments").let { a ->
                (0 until a.length()).sumOf { a.getJSONObject(it).getLong("amount") }
            },
        )
        val bundle =
            nativeCommand(
                "bundle",
                mapOf("name" to "Bundle", "price" to "12.50", "components" to "{\"1\":2,\"2\":1}"),
                store,
            )
        assertEquals(2, bundle.getJSONArray("components").length())
        assertEquals(1250L, bundle.getLong("price"))
        val cashOut =
            nativeCommand(
                "cashEntry",
                mapOf("amount" to "10.25", "direction" to "out", "reason" to "Float removed"),
                store,
            )
        assertEquals(-1025L, cashOut.getLong("amount"))
        assertEquals("Float removed", cashOut.getString("label"))
        val settings =
            nativeCommand(
                "preferences",
                mapOf("language" to "sw", "theme" to "dark", "textSize" to "130"),
                store,
            )
        assertEquals(130, settings.getInt("textSize"))
    }

    @Test
    fun sharedServerStateRestoresEmptyAccountsAndExactMoney() {
        val store = DemoStore(real = true)
        val seed = JSONObject(OPERATIONS_SEED)
        seed.put(
            "profile",
            json("name" to "Amina", "business" to "Real business", "location" to "Nairobi"),
        )
        seed.put("products", org.json.JSONArray())
        seed.put("sales", org.json.JSONArray())
        seed.put("customers", org.json.JSONArray())
        seed.put("suppliers", org.json.JSONArray())
        seed.put("orders", org.json.JSONArray())
        seed.put("expenses", org.json.JSONArray())
        val operations = store.operations.state
        seed.put("operations", operations)
        store.restoreLive(seed)
        assertEquals("Real business", store.businessName)
        assertTrue(store.products.isEmpty())
        assertEquals(0L, store.report().sales)
    }
}
