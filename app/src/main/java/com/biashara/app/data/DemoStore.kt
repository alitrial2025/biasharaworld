package com.biashara.app.data

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import java.util.Locale

data class Product(
    val id: Int,
    val name: String,
    val detail: String,
    val price: Int,
    val stock: Int,
    val category: String,
    val art: String,
    val priceMinor: Long = price * 100L,
    val sku: String = "BW-" + id.toString().padStart(3, '0'),
    val barcode: String = productBarcode(id),
    val variantOf: Int? = null,
    val components: Map<Int, Int> = emptyMap(),
)

data class Sale(
    val id: Int,
    val customer: String,
    val amount: Int,
    val items: Int,
    val method: String,
    val branch: String = "main",
    val amountMinor: Long = amount * 100L,
)

data class Customer(
    val name: String,
    val initial: String,
    val balance: Int,
    val color: Int,
    val balanceMinor: Long = balance * 100L,
)

data class Supplier(
    val name: String,
    val category: String,
    val distance: String,
    val rating: String,
    val initial: String,
)

data class ChatMessage(val text: String, val user: Boolean)

fun money(amount: Int): String = String.format(Locale.US, "%,d", amount)

fun cartTotal(products: List<Product>, quantities: Map<Int, Int>): Int =
    products.sumOf { it.price * (quantities[it.id] ?: 0) }

class DemoStore(val real: Boolean = false) {
    var backend: LiveBackend? = null
    var liveState = org.json.JSONObject()

    var businessName by mutableStateOf("Wanjiku General Shop")
    var ownerName by mutableStateOf("Wanjiku")
    var location by mutableStateOf("Nairobi, Kenya")
    val products =
        mutableStateListOf(
            Product(1, "Soko maize flour", "2 kg · Flour & grains", 180, 42, "Food", "flour"),
            Product(2, "Blue Band", "500 g · Original spread", 350, 24, "Food", "spread"),
            Product(3, "Coca-Cola", "500 ml · Original taste", 120, 8, "Drinks", "soda"),
            Product(4, "Keringet water", "1 L · Still mineral water", 100, 56, "Drinks", "water"),
            Product(5, "Sunlight soap", "250 g · Lemon fresh", 120, 0, "Household", "soap"),
            Product(6, "Royco mchuzi mix", "50 g · Beef flavour", 80, 36, "Food", "royco"),
            Product(7, "Brookside milk", "500 ml · Fresh whole milk", 65, 6, "Drinks", "milk"),
            Product(8, "Kabati rice", "1 kg · Long grain", 210, 18, "Food", "rice"),
        )
    val cart = mutableStateMapOf<Int, Int>()
    val supplierCart = mutableStateMapOf<Int, Int>()
    val sales =
        mutableStateListOf(
            Sale(1048, "Mary Wambui", 1250, 4, "M-Pesa"),
            Sale(1047, "Walk-in customer", 680, 3, "Cash"),
            Sale(1046, "Peter Njoroge", 2340, 7, "M-Pesa"),
        )
    val customers =
        mutableStateListOf(
            Customer("John Mwangi", "JM", 1200, 0),
            Customer("Ann Karanja", "AK", 850, 1),
            Customer("Peter Njoroge", "PN", 2300, 2),
            Customer("Susan Wambui", "SW", 450, 3),
            Customer("David Kimani", "DK", 800, 1),
            Customer("Mary Wambui", "MW", 0, 0),
        )
    val suppliers =
        mutableStateListOf(
            Supplier("KIFARU Wholesale", "Groceries & essentials", "2.4 km", "4.8", "K"),
            Supplier("Bidco Distributors", "Food & household", "3.1 km", "4.6", "B"),
            Supplier("Twiga Foods", "Fresh produce & groceries", "4.5 km", "4.9", "T"),
        )
    val messages =
        mutableStateListOf(
            ChatMessage("How did my business do today?", true),
            ChatMessage("Here’s your summary for today, Wanjiku 👋", false),
        )
    val operations = OperationsStore(this)

    init {
        if (real) clearLive()
    }

    fun clearLive() {
        products.clear()
        sales.clear()
        customers.clear()
        suppliers.clear()
        messages.clear()
        cart.clear()
        supplierCart.clear()
        businessName = ""
        ownerName = ""
        location = ""
        liveState = org.json.JSONObject()
        val state = org.json.JSONObject(OPERATIONS_SEED).getJSONObject("operations")
        listOf(
                "held",
                "receipts",
                "returns",
                "promotions",
                "documents",
                "registers",
                "counts",
                "batches",
                "transfers",
                "movements",
                "deliveries",
                "rewards",
                "purchaseOrders",
            )
            .forEach { state.put(it, org.json.JSONArray()) }
        state.put(
            "branches",
            org.json.JSONArray(
                listOf(json("id" to "main", "name" to "Main shop", "location" to ""))
            ),
        )
        state
            .put("stock", json("main" to json()))
            .put("activeBranch", "main")
            .put("cart", json())
            .put("customer", "Walk-in customer")
            .put("loyalty", json())
        state.put(
            "shop",
            json(
                "published" to false,
                "name" to "My business",
                "description" to "",
                "branch" to "main",
                "hidden" to org.json.JSONArray(),
                "fee" to 0,
            ),
        )
        state.put("sync", json("mode" to "Local only", "entries" to org.json.JSONArray()))
        operations.restore(state)
    }

    fun restoreLive(value: org.json.JSONObject) {
        liveState = value
        val profile = value.getJSONObject("profile")
        businessName = profile.optString("business")
        ownerName = profile.optString("name")
        location = profile.optString("location")
        val art = listOf("flour", "spread", "soda", "water", "soap", "royco", "milk", "rice")
        products.clear()
        products.addAll(
            value.records("products").map { p ->
                Product(
                    p.getInt("id"),
                    p.getString("name"),
                    p.optString("size"),
                    p.getDouble("price").toInt(),
                    p.getInt("stock"),
                    p.getString("category"),
                    art.getOrElse(p.optInt("art")) { "rice" },
                    kotlin.math.round(p.getDouble("price") * 100).toLong(),
                    p.getString("sku"),
                    p.optString("barcode", productBarcode(p.getInt("id"))),
                    if (p.isNull("variantOf")) null else p.optInt("variantOf"),
                    p.records("components").associate {
                        it.getInt("productId") to it.getInt("quantity")
                    },
                )
            }
        )
        sales.clear()
        sales.addAll(
            value.records("sales").map { s ->
                Sale(
                    s.getInt("id"),
                    s.getString("customer"),
                    s.getDouble("amount").toInt(),
                    s.getInt("items"),
                    s.getString("method"),
                    s.optString("branch", "main"),
                    kotlin.math.round(s.getDouble("amount") * 100).toLong(),
                )
            }
        )
        customers.clear()
        customers.addAll(
            value.records("customers").mapIndexed { i, c ->
                Customer(
                    c.getString("name"),
                    c.getString("name")
                        .split(" ")
                        .take(2)
                        .mapNotNull { it.firstOrNull() }
                        .joinToString(""),
                    c.getDouble("balance").toInt(),
                    i % 5,
                    kotlin.math.round(c.getDouble("balance") * 100).toLong(),
                )
            }
        )
        suppliers.clear()
        suppliers.addAll(
            value.records("suppliers").map { s ->
                Supplier(
                    s.getString("name"),
                    s.getString("category"),
                    s.optString("distance"),
                    s.optString("rating"),
                    s.optString("initial"),
                )
            }
        )
        val op = value.getJSONObject("operations")
        val old = operations.state
        listOf("compareCart", "shopCart").forEach { op.put(it, old.optJSONObject(it) ?: json()) }
        op.put(
            "purchaseOrders",
            org.json.JSONArray(
                value.records("orders").map { o ->
                    json(
                        "id" to o.optInt("id"),
                        "supplier" to o.optString("supplier"),
                        "branch" to o.optString("branch", "main"),
                        "fee" to kotlin.math.round(o.optDouble("deliveryFee") * 100).toLong(),
                        "total" to kotlin.math.round(o.optDouble("amount") * 100).toLong(),
                        "status" to o.optString("status"),
                        "lines" to
                            org.json.JSONArray(
                                o.records("items").map { i ->
                                    json(
                                        "productId" to i.optInt("productId"),
                                        "quantity" to i.optInt("quantity"),
                                        "name" to
                                            (products
                                                .firstOrNull { it.id == i.optInt("productId") }
                                                ?.name ?: "Product"),
                                        "unit" to
                                            kotlin.math.round(i.optDouble("cost") * 100).toLong(),
                                    )
                                }
                            ),
                    )
                }
            ),
        )
        operations.restore(op)
        cart.clear()
        cart.putAll(op.ints("cart"))
    }

    val total: Int
        get() =
            runCatching { (operations.price().optLong("total") / 100).toInt() }
                .getOrDefault(cartTotal(products, cart))

    val branchSalesMinor: Long
        get() =
            if (real) report().sales
            else
                (if (!real && operations.branch == "main") 1245000L else 0L) +
                    sales
                        .filter { (real || it.id > 1048) && it.branch == operations.branch }
                        .sumOf { it.amountMinor } -
                    operations.state
                        .records("returns")
                        .filter { refund ->
                            operations.state.records("receipts").any {
                                it.optInt("id") == refund.optInt("saleId") &&
                                    it.optString("branch") == operations.branch
                            }
                        }
                        .sumOf { it.optLong("amount") }

    val branchSales: Int
        get() = (branchSalesMinor / 100).toInt()

    val itemCount: Int
        get() = cart.values.sum()

    val lowStock: List<Product>
        get() =
            products.filter { p ->
                if (real)
                    p.stock <=
                        (liveState
                            .records("products")
                            .firstOrNull { it.optInt("id") == p.id }
                            ?.optInt("reorder") ?: 10)
                else p.stock < 10
            }

    fun add(id: Int) {
        val p = products.firstOrNull { it.id == id } ?: return
        val count = cart[id] ?: 0
        if (count < operations.available(p.id)) cart[id] = count + 1
    }

    fun remove(id: Int) {
        val count = cart[id] ?: return
        if (count <= 1) cart.remove(id) else cart[id] = count - 1
    }

    fun checkout(method: String): Sale? {
        if (itemCount == 0) return null
        return runCatching {
                operations.command("checkout", mapOf("method" to method))
                sales.firstOrNull { it.id == operations.lastId }
            }
            .getOrNull()
    }

    fun restock(id: Int, amount: Int) {
        if (amount > 0)
            operations.command(
                "batch",
                mapOf(
                    "product" to id.toString(),
                    "quantity" to amount.toString(),
                    "code" to "RESTOCK-$id",
                    "expires" to "2099-12-31",
                ),
            )
    }

    fun addProduct(name: String, price: Int, quantity: Int) {
        if (name.isNotBlank() && price > 0 && quantity >= 0)
            products.add(
                Product(
                    (products.maxOfOrNull { it.id } ?: 0) + 1,
                    name.trim(),
                    "New product",
                    price,
                    quantity,
                    "Food",
                    "rice",
                )
            )
    }

    fun reply(question: String) {
        messages.add(ChatMessage(question, true))
        if (real) {
            val r = report()
            val answer =
                when {
                    question.contains("stock", true) ->
                        if (lowStock.isEmpty()) "No products are below their reorder level."
                        else lowStock.joinToString { "${it.name}: ${it.stock} remaining" }
                    question.contains("owe", true) || question.contains("debt", true) ->
                        "Recorded balances: " +
                            minorMoney(
                                liveState.records("customers").sumOf {
                                    kotlin.math.round(it.optDouble("balance") * 100).toLong()
                                }
                            )
                    else ->
                        "Recorded today: sales ${minorMoney(r.sales)}, expenses ${minorMoney(r.expenses)}, operating profit ${minorMoney(r.profit)}. This summary uses your recorded business activity."
                }
            messages.add(ChatMessage(answer, false))
            return
        }
        val answer =
            when {
                question.contains("stock", true) ->
                    "Your shelves need a little love. ${lowStock.joinToString { "${it.name} (${it.stock} left)" }}. Prioritise Sunlight soap, then milk. You can browse suppliers from More."
                question.contains("owe", true) || question.contains("debt", true) ->
                    "${customers.count { it.balance > 0 }} customers have an outstanding balance of KES ${money(customers.sumOf { it.balance })}. Peter Njoroge has the largest balance at KES 2,300. Open Customers to see the breakdown."
                question.contains("profit", true) ->
                    "This week's demo profit is KES 18,920, up 12.4% from last week. Flour and spreads are your strongest contributors. Open Reports to explore the sample trend."
                else ->
                    "Your demo store is having a good day: KES ${money(12450 + sales.filter { it.id > 1048 }.sumOf { it.amount })} in sales, with Soko maize flour leading the way. You also have ${lowStock.size} products to restock. These insights use sample data for this UI preview."
            }
        messages.add(ChatMessage(answer, false))
    }
}
