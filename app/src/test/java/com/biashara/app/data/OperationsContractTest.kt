package com.biashara.app.data

import java.io.File
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class OperationsContractTest {
    private val fixture = JSONObject(File("../shared/operation-contracts.json").readText())

    private fun DemoStore.act(action: String, vararg args: Pair<String, String>) =
        operations.command(action, mapOf(*args))

    private fun fail(store: DemoStore, action: String, vararg args: Pair<String, String>) {
        val before = DemoPersistence.snapshot(store)
        assertThrows(Exception::class.java) { store.act(action, *args) }
        assertEquals(before, DemoPersistence.snapshot(store))
    }

    @Test
    fun currencyAndBarcode() {
        assertEquals(29L, parseMinor("0.29"))
        assertEquals(12001L, parseMinor("120.01"))
        listOf("-1", "1.001", "NaN", "1e3", "").forEach {
            assertThrows(Exception::class.java) { parseMinor(it) }
        }
        listOf(1, 2, 12, 999).forEach {
            assertTrue(validBarcode(productBarcode(it)))
            assertEquals(95, barcodeBars(productBarcode(it)).length)
        }
        assertFalse(validBarcode("6160000000010"))
    }

    @Test
    fun manualBankMethodsUseTheSameCheckoutAmountsAsCash() {
        listOf("Bank transfer", "Bank").forEach { method ->
            val store = DemoStore()
            val before = store.products.first { it.id == 1 }
            store.act("cart", "product" to "1", "quantity" to "1")
            val due = store.operations.price().getLong("total")
            val native = nativeCommand("checkout", mapOf("method" to method), store)
            assertEquals(due, native.getJSONArray("payments").getJSONObject(0).getLong("amount"))
            store.act("checkout", "method" to method)
            val receipt = store.operations.state.records("receipts").first()
            assertEquals(due, receipt.getLong("total"))
            assertEquals(method, receipt.records("payments").single().getString("method"))
            assertEquals(before.stock - 1, store.products.first { it.id == 1 }.stock)
        }
    }

    @Test
    fun splitCheckoutAndPartialRefundsConserveMoneyAndPoints() {
        val s = DemoStore()
        val f = fixture.getJSONObject("checkout")
        s.act("cart", "product" to "1", "quantity" to "3")
        s.act("cart", "product" to "2", "quantity" to "1")
        s.act("basket", "customer" to "Mary Wambui", "discount" to "7", "redeem" to "2")
        assertEquals(f.getLong("totalMinor"), s.operations.price().getLong("total"))
        assertEquals(
            listOf(f.getLong("flourNetMinor"), f.getLong("butterNetMinor")),
            s.operations.price().records("lines").map { it.getLong("net") },
        )
        fail(s, "checkout", "split" to "true", "cash" to "1", "mpesa" to "0", "card" to "0")
        s.act("checkout", "split" to "true", "cash" to "300", "mpesa" to "525.70", "card" to "0")
        val id = s.operations.lastId.toString()
        s.products[0] = s.products[0].copy(price = 999, priceMinor = 99900)
        s.act(
            "return",
            "id" to id,
            "product" to "1",
            "quantity" to "1",
            "restock" to "true",
            "reason" to "Unopened",
        )
        assertEquals(
            f.getLong("firstRefundMinor"),
            s.operations.state.records("returns").first().getLong("amount"),
        )
        s.act(
            "return",
            "id" to id,
            "product" to "1",
            "quantity" to "2",
            "restock" to "true",
            "reason" to "Unopened",
        )
        s.act(
            "return",
            "id" to id,
            "product" to "2",
            "quantity" to "1",
            "restock" to "true",
            "reason" to "Unopened",
        )
        val returns = s.operations.state.records("returns")
        assertEquals(f.getLong("totalMinor"), returns.sumOf { it.getLong("amount") })
        listOf("Cash" to "cashMinor", "M-Pesa" to "mpesaMinor").forEach { (method, key) ->
            assertEquals(
                f.getLong(key),
                returns
                    .flatMap { it.records("payments") }
                    .filter { it.getString("method") == method }
                    .sumOf { it.getLong("amount") },
            )
        }
        assertEquals(
            f.getInt("finalPoints"),
            s.operations.state.objectAt("loyalty").getInt("Mary Wambui"),
        )
        fail(
            s,
            "return",
            "id" to id,
            "product" to "1",
            "quantity" to "1",
            "restock" to "true",
            "reason" to "Again",
        )
        assertEquals(42, s.products[0].stock)
        assertEquals(1245000L, s.branchSalesMinor)
    }

    @Test
    fun promotionEligibilityAndBranchBaskets() {
        val s = DemoStore()
        s.act(
            "promotion",
            "name" to "Flour",
            "percent" to "10",
            "ends" to "2099-12-31",
            "product" to "1",
        )
        val offer = s.operations.state.records("promotions").first().getInt("id").toString()
        s.act("cart", "product" to "1", "quantity" to "1")
        s.act("cart", "product" to "2", "quantity" to "1")
        s.act("basket", "promotion" to offer)
        assertEquals(51200L, s.operations.price().getLong("total"))
        s.act("hold", "name" to "Mary")
        assertEquals(42, s.operations.available(1))
        s.act("branch", "branch" to "westlands")
        fail(s, "resume", "id" to "1")
        s.act("branch", "branch" to "main")
        s.act("resume", "id" to "1")
        assertEquals(1, s.cart[1])
        s.act("branch", "branch" to "westlands")
        assertEquals(21, s.products[0].stock)
    }

    @Test
    fun documentsSnapshotPricesAndPayOnce() {
        val s = DemoStore()
        s.act("cart", "product" to "1", "quantity" to "2")
        s.act("basket", "customer" to "Mary Wambui")
        s.act("document", "kind" to "Quotation", "due" to "2099-12-31")
        s.act("convertDocument", "id" to "1")
        fail(s, "convertDocument", "id" to "1")
        s.act("issueDocument", "id" to "-1")
        s.products[0] = s.products[0].copy(price = 999, priceMinor = 99900)
        s.act("payDocument", "id" to "-1")
        assertEquals(36000L, s.sales.first().amountMinor)
        assertEquals(40, s.products[0].stock)
        fail(s, "payDocument", "id" to "-1")
    }

    @Test
    fun cashSessionVariance() {
        val s = DemoStore()
        val f = fixture.getJSONObject("register")
        s.act("openRegister", "amount" to "1000")
        fail(s, "openRegister", "amount" to "0")
        s.act("cart", "product" to "1", "quantity" to "1")
        s.act("checkout", "method" to "Cash")
        s.act("cashEntry", "amount" to "50", "direction" to "out", "reason" to "Delivery")
        s.act("closeRegister", "amount" to "1125")
        val r = s.operations.state.records("registers").first()
        assertEquals(f.getLong("expectedMinor"), r.getLong("expected"))
        assertEquals(f.getLong("varianceMinor"), r.getLong("counted") - r.getLong("expected"))
        fail(s, "closeRegister", "amount" to "0")
    }

    @Test
    fun staleCountsAndExpiredStock() {
        val s = DemoStore()
        s.act("startCount", "name" to "Shelf")
        s.act("count", "id" to "1", "product" to "1", "quantity" to "40")
        s.act(
            "batch",
            "product" to "1",
            "quantity" to "2",
            "code" to "EXPIRED",
            "expires" to "2000-01-01",
        )
        assertEquals(42, s.operations.available(1))
        fail(s, "finaliseCount", "id" to "1", "reason" to "Counted")
        val b =
            s.operations.state
                .records("batches")
                .first { it.optString("code") == "EXPIRED" }
                .getInt("id")
                .toString()
        s.act("writeOff", "id" to b, "reason" to "Expired")
        fail(s, "writeOff", "id" to b, "reason" to "Again")
        s.act("refreshCount", "id" to "1")
        s.act("finaliseCount", "id" to "1", "reason" to "Counted")
        assertEquals(40, s.products[0].stock)
        fail(s, "finaliseCount", "id" to "1", "reason" to "Again")
    }

    @Test
    fun variantsAndBundleStock() {
        val s = DemoStore()
        s.act(
            "variant",
            "parent" to "1",
            "name" to "Soko small",
            "sku" to "SOKO-1KG",
            "size" to "1 kg",
            "price" to "100",
            "stock" to "5",
        )
        fail(
            s,
            "variant",
            "parent" to "1",
            "name" to "Duplicate",
            "sku" to "soko-1kg",
            "price" to "100",
            "stock" to "0",
        )
        s.act(
            "bundle",
            "name" to "Breakfast",
            "price" to "650",
            "components" to "{\"1\":2,\"2\":1}",
        )
        val product = s.products.last().id.toString()
        assertEquals(21, s.operations.available(product.toInt()))
        s.act("cart", "product" to product, "quantity" to "2")
        s.act("checkout", "method" to "Cash")
        val sale = s.operations.lastId.toString()
        assertEquals(38, s.products[0].stock)
        assertEquals(22, s.products[1].stock)
        s.act(
            "return",
            "id" to sale,
            "product" to product,
            "quantity" to "1",
            "restock" to "true",
            "reason" to "Unopened",
        )
        assertEquals(40, s.products[0].stock)
        assertEquals(23, s.products[1].stock)
    }

    @Test
    fun transfersReceiveOnceAndCancelBackToSource() {
        val s = DemoStore()
        s.act("transfer", "product" to "1", "quantity" to "4", "to" to "westlands")
        s.act("dispatchTransfer", "id" to "1")
        assertEquals(38, s.operations.available(1))
        s.act("receiveTransfer", "id" to "1")
        assertEquals(25, s.operations.available(1, "westlands"))
        fail(s, "receiveTransfer", "id" to "1")
        s.act("transfer", "product" to "1", "quantity" to "2", "to" to "westlands")
        s.act("dispatchTransfer", "id" to "2")
        s.act("cancelTransfer", "id" to "2")
        assertEquals(38, s.operations.available(1))
    }

    @Test
    fun customerOrdersReserveDispatchAndPayOnce() {
        val s = DemoStore()
        s.act("shopCart", "product" to "1", "quantity" to "2")
        s.act("placeOrder", "customer" to "Mary Wambui", "address" to "Pickup")
        assertEquals(42, s.operations.available(1))
        s.act("orderStatus", "id" to "1", "status" to "Confirmed")
        assertEquals(40, s.operations.available(1))
        fail(s, "orderPaid", "id" to "1")
        s.act("orderStatus", "id" to "1", "status" to "Packing")
        fail(s, "orderStatus", "id" to "1", "status" to "Dispatched")
        s.act("pack", "id" to "1", "product" to "1")
        s.act("orderStatus", "id" to "1", "status" to "Dispatched")
        assertEquals(40, s.operations.available(1))
        s.act("orderStatus", "id" to "1", "status" to "Delivered")
        s.act("orderPaid", "id" to "1")
        assertEquals(
            fixture.getJSONObject("delivery").getLong("totalMinor"),
            s.sales.first().amountMinor,
        )
        assertEquals(40, s.products[0].stock)
        fail(s, "orderPaid", "id" to "1")
        s.act("shopCart", "product" to "1", "quantity" to "1")
        s.act("placeOrder", "customer" to "John Mwangi", "address" to "Pickup")
        s.act("orderStatus", "id" to "2", "status" to "Confirmed")
        s.act("orderStatus", "id" to "2", "status" to "Cancelled")
        assertEquals(40, s.operations.available(1))
    }

    @Test
    fun persistenceRetainsPreferencesOfflineActivityAndCart() {
        val s = DemoStore()
        s.act("preferences", "language" to "sw", "theme" to "dark", "textSize" to "130")
        s.act("syncMode", "mode" to "Offline preview")
        s.act("cart", "product" to "1", "quantity" to "1")
        s.act("hold", "name" to "Offline basket")
        val restored = DemoStore()
        DemoPersistence.restore(restored, DemoPersistence.snapshot(s))
        assertEquals("sw", restored.operations.state.objectAt("preferences").getString("language"))
        assertEquals(1, restored.operations.state.records("held").size)
        assertEquals(
            "Retry preview",
            restored.operations.state
                .objectAt("sync")
                .records("entries")
                .first()
                .getString("status"),
        )
    }

    @Test
    fun malformedSnapshotDoesNotPartiallyRestore() {
        val s = DemoStore()
        val before = DemoPersistence.snapshot(s)
        val broken = JSONObject(before)
        broken.put("business", "Should not appear")
        broken.remove("operations")
        assertThrows(Exception::class.java) { DemoPersistence.restore(s, broken.toString()) }
        assertEquals(before, DemoPersistence.snapshot(s))
    }
}
