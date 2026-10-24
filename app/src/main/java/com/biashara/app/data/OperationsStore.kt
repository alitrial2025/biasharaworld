package com.biashara.app.data

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.Snapshot
import java.text.NumberFormat
import java.time.LocalDate
import java.time.ZoneId
import java.util.Locale
import kotlin.math.roundToLong
import org.json.JSONArray
import org.json.JSONObject

fun json(vararg pairs: Pair<String, Any?>) =
    JSONObject().apply { pairs.forEach { (key, value) -> put(key, value) } }

fun JSONObject.records(key: String): List<JSONObject> =
    optJSONArray(key)?.let { array -> (0 until array.length()).map { array.getJSONObject(it) } }
        ?: emptyList()

fun JSONObject.objectAt(key: String): JSONObject =
    optJSONObject(key) ?: JSONObject().also { put(key, it) }

fun JSONObject.ints(key: String): Map<Int, Int> =
    objectAt(key).let { obj -> obj.keys().asSequence().associate { it.toInt() to obj.optInt(it) } }

fun JSONObject.strings(key: String): List<String> =
    optJSONArray(key)?.let { a -> (0 until a.length()).map { a.getString(it) } } ?: emptyList()

fun todayLocal(): String = LocalDate.now(ZoneId.of("Africa/Nairobi")).toString()

fun minorMoney(value: Long, language: String = "en"): String =
    "KES " +
        NumberFormat.getNumberInstance(Locale(if (language == "sw") "sw" else "en", "KE"))
            .apply {
                maximumFractionDigits = 2
                minimumFractionDigits = if (value % 100L != 0L) 2 else 0
            }
            .format(value / 100.0)

fun parseMinor(value: String): Long {
    require(Regex("\\d{1,9}(\\.\\d{1,2})?").matches(value.trim())) {
        "Enter a valid amount with up to two decimal places."
    }
    val parts = value.trim().split('.')
    return parts[0].toLong() * 100 + (parts.getOrNull(1) ?: "").padEnd(2, '0').toLong()
}

fun productBarcode(id: Int): String {
    val first = "616000" + id.toString().padStart(6, '0')
    return first +
        ((10 -
            first.mapIndexed { i, c -> c.digitToInt() * (if (i % 2 == 0) 1 else 3) }.sum() % 10) %
            10)
}

fun validBarcode(code: String): Boolean =
    Regex("\\d{13}").matches(code) &&
        code.mapIndexed { i, c -> c.digitToInt() * (if (i % 2 == 0) 1 else 3) }.sum() % 10 == 0

fun barcodeBars(code: String): String {
    if (!validBarcode(code)) return ""
    val left =
        listOf(
            "0001101",
            "0011001",
            "0010011",
            "0111101",
            "0100011",
            "0110001",
            "0101111",
            "0111011",
            "0110111",
            "0001011",
        )
    val even =
        listOf(
            "0100111",
            "0110011",
            "0011011",
            "0100001",
            "0011101",
            "0111001",
            "0000101",
            "0010001",
            "0001001",
            "0010111",
        )
    val parity =
        listOf(
            "LLLLLL",
            "LLGLGG",
            "LLGGLG",
            "LLGGGL",
            "LGLLGG",
            "LGGLLG",
            "LGGGLL",
            "LGLGLG",
            "LGLGGL",
            "LGGLGL",
        )[code[0].digitToInt()]
    return "101" +
        code
            .substring(1, 7)
            .mapIndexed { i, c -> (if (parity[i] == 'L') left else even)[c.digitToInt()] }
            .joinToString("") +
        "01010" +
        code
            .substring(7)
            .map { c -> left[c.digitToInt()].map { if (it == '0') '1' else '0' }.joinToString("") }
            .joinToString("") +
        "101"
}

class OperationsStore(private val store: DemoStore) {
    var state by mutableStateOf(initial())
        private set

    var lastId by mutableStateOf(0)
        private set

    var storageWarning by mutableStateOf("")

    private fun initial(): JSONObject =
        JSONObject(OPERATIONS_SEED).getJSONObject("operations").apply {
            records("batches").forEach {
                it.put(
                    "expires",
                    LocalDate.now().plusDays(if (it.optInt("productId") == 7) 5 else 120).toString(),
                )
            }
            records("promotions").forEach {
                it.put("ends", LocalDate.now().plusDays(30).toString())
            }
            records("receipts").forEach { it.put("date", todayLocal()) }
            put("purchaseOrders", JSONArray())
            put("compareCart", JSONObject())
            put("shopCart", JSONObject())
        }

    fun confirmedId(id: Int) { lastId = id }

    fun restore(value: JSONObject) {
        if (value.optInt("version") == 2) state = value
    }

    fun reset() {
        require(!store.real) { "Real business records cannot be reset to sample data." }
        state = initial()
    }

    val branch: String
        get() = state.optString("activeBranch", "main")

    val branchName: String
        get() =
            state
                .records("branches")
                .firstOrNull { it.optString("id") == branch }
                ?.optString("name") ?: "Main shop"

    private fun next(items: List<JSONObject>) = (items.maxOfOrNull { it.optInt("id") } ?: 0) + 1

    private fun append(o: JSONObject, key: String, value: JSONObject, first: Boolean = true) {
        val list = o.records(key).toMutableList()
        if (first) list.add(0, value) else list.add(value)
        o.put(key, JSONArray(list))
    }

    private fun amount(v: Map<String, String>, key: String) = parseMinor(v[key] ?: "0")

    private fun number(v: Map<String, String>, key: String, min: Int = 0): Int {
        val result = v[key]?.toIntOrNull()
        require(result != null && result >= min && result <= 1000000) {
            "Enter a whole quantity of at least $min."
        }
        return result
    }

    fun available(
        id: Int,
        branchId: String = branch,
        root: JSONObject = state,
        products: List<Product> = store.products,
        includeReserved: Boolean = true,
    ): Int {
        val p = products.firstOrNull { it.id == id } ?: return 0
        if (p.components.isNotEmpty())
            return p.components.minOf { (part, qty) ->
                available(part, branchId, root, products, includeReserved) / qty
            }
        val raw =
            if (branchId == branch)
                store.products.firstOrNull { it.id == id }?.stock
                    ?: root.objectAt("stock").objectAt(branchId).optInt(id.toString())
            else root.objectAt("stock").objectAt(branchId).optInt(id.toString())
        val expired =
            root
                .records("batches")
                .filter {
                    it.optString("branch") == branchId &&
                        it.optInt("productId") == id &&
                        it.optString("expires") < todayLocal()
                }
                .sumOf { it.optInt("quantity") }
        val reserved =
            if (includeReserved)
                root
                    .records("deliveries")
                    .filter {
                        it.optString("branch") == branchId &&
                            it.optString("status") in listOf("Confirmed", "Packing")
                    }
                    .sumOf { o ->
                        o.records("lines").sumOf { l ->
                            val parts =
                                l.records("components").ifEmpty {
                                    listOf(
                                        json("productId" to l.optInt("productId"), "quantity" to 1)
                                    )
                                }
                            parts
                                .filter { it.optInt("productId") == id }
                                .sumOf { it.optInt("quantity") * l.optInt("quantity") }
                        }
                    }
            else 0
        return (raw - expired - reserved).coerceAtLeast(0)
    }

    fun price(
        root: JSONObject = state,
        cart: Map<Int, Int> = store.cart.toMap(),
        products: List<Product> = store.products,
    ): JSONObject {
        val lines =
            products
                .filter { (cart[it.id] ?: 0) > 0 }
                .map { p ->
                    val q = cart[p.id] ?: 0
                    json(
                            "productId" to p.id,
                            "name" to "${p.name} · ${p.detail.substringBefore(" ·")}",
                            "quantity" to q,
                            "unit" to p.priceMinor,
                            "net" to p.priceMinor * q,
                        )
                        .apply {
                            if (p.components.isNotEmpty())
                                put(
                                    "components",
                                    JSONArray(
                                        p.components.map { (id, n) ->
                                            json("productId" to id, "quantity" to n)
                                        }
                                    ),
                                )
                        }
                }
        val subtotal = lines.sumOf { it.optLong("net") }
        val discount = root.optLong("discount")
        val kind = root.optString("discountKind", "percent")
        require(discount >= 0 && discount <= if (kind == "percent") 100 else subtotal) {
            "Discount must fit the basket total."
        }
        require(subtotal in 0..1_000_000_000L) { "Keep a demo basket below KES 10,000,000." }
        var deducted =
            if (kind == "percent") (subtotal * discount / 100.0).roundToLong() else discount
        var eligible = lines
        val promotion = root.optString("promotion")
        if (promotion.isNotBlank()) {
            val offer =
                root.records("promotions").firstOrNull { it.optInt("id").toString() == promotion }
            require(offer != null && offer.optString("ends") >= todayLocal()) {
                "This promotion has expired or is unavailable."
            }
            eligible =
                lines.filter {
                    offer.isNull("productId") || offer.optInt("productId") == it.optInt("productId")
                }
            deducted =
                (eligible.sumOf { it.optLong("net") } * offer.optInt("percent") / 100.0)
                    .roundToLong()
        }
        val redeem = root.optLong("redeem")
        require(redeem >= 0 && redeem * 100 <= subtotal - deducted) {
            "Reward points exceed this basket’s amount due."
        }
        fun allocate(value: Long, rows: List<JSONObject>) {
            var assigned = 0L
            val basis = rows.sumOf { it.optLong("net") }
            rows.forEachIndexed { i, line ->
                val portion =
                    if (i == rows.lastIndex) value - assigned
                    else if (basis == 0L) 0 else value * line.optLong("net") / basis
                assigned += portion
                line.put("net", line.optLong("net") - portion)
            }
        }
        allocate(deducted, eligible)
        allocate(redeem * 100, lines)
        deducted += redeem * 100
        return json(
            "lines" to JSONArray(lines),
            "total" to subtotal - deducted,
            "discount" to deducted,
        )
    }

    fun command(action: String, v: Map<String, String> = emptyMap()): String {
        if(store.real && action !in listOf("cart","basket","clearCart","compareBasket","shopCart")) error("Use the connected save action to confirm this change with the server.")
        val o = JSONObject(state.toString())
        val products = store.products.toMutableList()
        var active = o.optString("activeBranch")
        val cart = store.cart.toMutableMap()
        o.put("cart", JSONObject(cart.mapKeys { it.key.toString() }))
        var message = "Saved in this demo on your device."
        lastId = 0
        val stock = o.objectAt("stock")
        stock.put(
            active,
            JSONObject(
                products
                    .filter { it.components.isEmpty() }
                    .associate { it.id.toString() to it.stock }
            ),
        )
        // Bring older stock-edit screens into the same batch ledger before processing new commands.
        products
            .filter { it.components.isEmpty() }
            .forEach { p ->
                val batches =
                    o.records("batches").filter {
                        it.optString("branch") == active && it.optInt("productId") == p.id
                    }
                var diff = p.stock - batches.sumOf { it.optInt("quantity") }
                if (diff != 0)
                    append(
                        o,
                        "movements",
                        json(
                            "id" to next(o.records("movements")),
                            "productId" to p.id,
                            "branch" to active,
                            "delta" to diff,
                            "reason" to "Stock update",
                            "reference" to p.sku,
                            "date" to todayLocal(),
                        ),
                    )
                if (diff > 0)
                    append(
                        o,
                        "batches",
                        json(
                            "id" to next(o.records("batches")),
                            "productId" to p.id,
                            "branch" to active,
                            "code" to "RESTOCK-${p.id}",
                            "quantity" to diff,
                            "expires" to "2099-12-31",
                        ),
                        false,
                    )
                else if (diff < 0)
                    for (b in batches) {
                        val take = minOf(b.optInt("quantity"), -diff)
                        b.put("quantity", b.optInt("quantity") - take)
                        diff += take
                    }
            }
        fun changeStock(
            id: Int,
            delta: Int,
            reason: String,
            ref: String,
            where: String = active,
            includeExpired: Boolean = false,
        ) {
            require(products.any { it.id == id && it.components.isEmpty() }) {
                "Choose an individual stock item."
            }
            val branchStock = stock.objectAt(where)
            val before = branchStock.optInt(id.toString())
            require(before + delta >= 0) { "Stock quantity is unavailable." }
            branchStock.put(id.toString(), before + delta)
            if (delta > 0)
                append(
                    o,
                    "batches",
                    json(
                        "id" to next(o.records("batches")),
                        "productId" to id,
                        "branch" to where,
                        "code" to "LOCAL-${next(o.records("batches"))}",
                        "quantity" to delta,
                        "expires" to LocalDate.now().plusDays(120).toString(),
                    ),
                    false,
                )
            else {
                var left = -delta
                for (b in
                    o.records("batches")
                        .filter {
                            it.optString("branch") == where &&
                                it.optInt("productId") == id &&
                                (includeExpired || it.optString("expires") >= todayLocal())
                        }
                        .sortedBy { it.optString("expires") }) {
                    val take = minOf(left, b.optInt("quantity"))
                    b.put("quantity", b.optInt("quantity") - take)
                    left -= take
                }
                require(left == 0) { "Batch stock changed. Review your inventory." }
            }
            append(
                o,
                "movements",
                json(
                    "id" to next(o.records("movements")),
                    "productId" to id,
                    "branch" to where,
                    "delta" to delta,
                    "reason" to reason,
                    "reference" to ref,
                    "date" to todayLocal(),
                ),
            )
        }
        fun changeLines(
            lines: List<JSONObject>,
            factor: Int,
            reason: String,
            ref: String,
            where: String = active,
        ) {
            for (line in lines) {
                val parts =
                    line.records("components").ifEmpty {
                        listOf(json("productId" to line.optInt("productId"), "quantity" to 1))
                    }
                parts.forEach {
                    changeStock(
                        it.optInt("productId"),
                        it.optInt("quantity") * line.optInt("quantity") * factor,
                        reason,
                        ref,
                        where,
                    )
                }
            }
        }
        fun cashEntry(value: Long, label: String, where: String = active) {
            o.records("registers")
                .firstOrNull { it.optString("branch") == where && it.optString("status") == "Open" }
                ?.let { r ->
                    r.put(
                        "entries",
                        JSONArray(r.records("entries") + json("label" to label, "amount" to value)),
                    )
                }
        }
        fun points(customer: String, delta: Int, reason: String) {
            if (customer == "Walk-in customer" || delta == 0) return
            val loyalty = o.objectAt("loyalty")
            loyalty.put(customer, loyalty.optInt(customer) + delta)
            append(
                o,
                "rewards",
                json(
                    "id" to next(o.records("rewards")),
                    "customer" to customer,
                    "points" to delta,
                    "reason" to reason,
                    "date" to todayLocal(),
                ),
            )
        }
        fun pay(payments: List<JSONObject>, document: JSONObject? = null) {
            require(
                document == null ||
                    (document.optString("kind") == "Invoice" &&
                        document.optString("status") != "Paid locally" &&
                        document.optString("branch") == active)
            ) {
                "Choose an unpaid invoice at this branch."
            }
            val priced = document ?: price(o, cart, products)
            val lines = priced.records("lines")
            val total = priced.optLong("total")
            require(lines.isNotEmpty()) { "Add a product before completing this sale." }
            require(
                lines.all {
                    it.optInt("quantity") <= available(it.optInt("productId"), active, o, products)
                }
            ) {
                "A product is no longer available at this branch."
            }
            require(
                payments.isNotEmpty() &&
                    payments.all {
                        it.optString("method") in listOf("Cash", "M-Pesa", "Card", "Bank transfer", "Bank") &&
                            it.optLong("amount") >= 0
                    } &&
                    payments.sumOf { it.optLong("amount") } == total
            ) {
                "Payment portions must equal the exact amount due."
            }
            val customer =
                document?.optString("customer") ?: o.optString("customer", "Walk-in customer")
            val redeemed = if (document == null) o.optInt("redeem") else 0
            require(redeemed <= o.objectAt("loyalty").optInt(customer) && redeemed >= 0) {
                "You do not have enough reward points."
            }
            val earned =
                if (customer == "Walk-in customer") 0
                else (total / o.optLong("rewardRate", 10000)).toInt()
            val id =
                maxOf(
                    1048,
                    store.sales.maxOfOrNull { it.id } ?: 0,
                    o.records("receipts").maxOfOrNull { it.optInt("id") } ?: 0,
                ) + 1
            val receipt =
                json(
                    "id" to id,
                    "branch" to active,
                    "customer" to customer,
                    "lines" to JSONArray(lines),
                    "total" to total,
                    "discount" to priced.optLong("discount"),
                    "payments" to JSONArray(payments.filter { it.optLong("amount") > 0 }),
                    "date" to todayLocal(),
                    "earned" to earned,
                    "redeemed" to redeemed,
                    "returned" to JSONObject(),
                )
            changeLines(lines, -1, "Sale", "Receipt #$id")
            append(o, "receipts", receipt)
            payments
                .filter { it.optString("method") == "Cash" }
                .forEach { cashEntry(it.optLong("amount"), "Sale #$id") }
            points(customer, earned - redeemed, "Receipt #$id")
            if (document != null) {
                document.put("status", "Paid locally")
                document.put("saleId", id)
            }
            store.sales.add(
                0,
                Sale(
                    id,
                    customer,
                    (total / 100).toInt(),
                    lines.sumOf { it.optInt("quantity") },
                    payments
                        .filter { it.optLong("amount") > 0 }
                        .joinToString(" + ") { it.optString("method") },
                    active,
                    total,
                ),
            )
            cart.clear()
            o.put("discount", 0)
            o.put("promotion", "")
            o.put("redeem", 0)
            lastId = id
            message = "Demo sale recorded. No payment request was sent."
        }
        val id = v["id"]?.toIntOrNull() ?: 0
        when (action) {
            "branch" -> {
                val target = v["branch"] ?: "main"
                require(o.records("branches").any { it.optString("id") == target }) {
                    "Branch not found."
                }
                if (cart.values.any { it > 0 })
                    append(
                        o,
                        "held",
                        json(
                            "id" to next(o.records("held")),
                            "branch" to active,
                            "name" to "$branchName · saved on branch switch",
                            "cart" to JSONObject(cart.mapKeys { it.key.toString() }),
                            "customer" to o.optString("customer"),
                            "discount" to o.optLong("discount"),
                            "discountKind" to o.optString("discountKind"),
                            "promotion" to o.optString("promotion"),
                            "redeem" to o.optInt("redeem"),
                        ),
                    )
                active = target
                o.put("activeBranch", active)
                cart.clear()
                o.put("discount", 0)
                o.put("promotion", "")
                o.put("redeem", 0)
                message = "Branch switched. Your records are now in view."
            }
            "addBranch" -> {
                require(!v["name"].isNullOrBlank()) { "Enter a branch name." }
                val key = "branch-${o.records("branches").size+1}"
                append(
                    o,
                    "branches",
                    json("id" to key, "name" to v["name"], "location" to v["location"]),
                    false,
                )
                stock.put(key, JSONObject())
            }
            "cart" -> {
                val product = number(v, "product", 1)
                val qty = number(v, "quantity")
                require(qty <= available(product, active, o, products)) {
                    "This quantity is unavailable at this branch."
                }
                cart[product] = qty
            }
            "clearCart" -> {
                cart.clear()
                o.put("discount", 0)
                o.put("promotion", "")
                o.put("redeem", 0)
            }
            "basket" -> {
                v["customer"]?.let { o.put("customer", it) }
                v["discountKind"]?.let { o.put("discountKind", it) }
                v["discount"]?.let {
                    o.put(
                        "discount",
                        if (o.optString("discountKind") == "fixed") parseMinor(it)
                        else number(v, "discount").toLong(),
                    )
                }
                v["promotion"]?.let { o.put("promotion", it) }
                v["redeem"]?.let { o.put("redeem", number(v, "redeem")) }
                price(o, cart, products)
            }
            "hold" -> {
                require(cart.values.any { it > 0 }) { "Add a product before holding this sale." }
                append(
                    o,
                    "held",
                    json(
                        "id" to next(o.records("held")),
                        "branch" to active,
                        "name" to (v["name"]?.ifBlank { null } ?: "A sale for later"),
                        "cart" to JSONObject(cart.mapKeys { it.key.toString() }),
                        "customer" to o.optString("customer"),
                        "discount" to o.optLong("discount"),
                        "discountKind" to o.optString("discountKind"),
                        "promotion" to o.optString("promotion"),
                        "redeem" to o.optInt("redeem"),
                    ),
                )
                cart.clear()
                o.put("discount", 0)
                o.put("promotion", "")
                o.put("redeem", 0)
                message = "Basket parked. Stock has not changed."
            }
            "resume" -> {
                require(cart.values.none { it > 0 }) {
                    "Hold or clear the current basket before resuming another."
                }
                val held =
                    o.records("held").firstOrNull { it.optInt("id") == id }
                        ?: error("Basket not found.")
                require(held.optString("branch", active) == active) {
                    "Switch to this basket’s branch first."
                }
                val saved = held.ints("cart")
                require(saved.all { (p, q) -> q <= available(p, active, o, products) }) {
                    "Stock changed. Restock unavailable items before resuming."
                }
                cart.putAll(saved)
                listOf("customer", "discount", "discountKind", "promotion", "redeem").forEach {
                    o.put(it, held.opt(it))
                }
                o.put("held", JSONArray(o.records("held").filter { it.optInt("id") != id }))
                message = "Your basket is ready at checkout."
            }
            "discard" ->
                o.put("held", JSONArray(o.records("held").filter { it.optInt("id") != id }))
            "checkout" -> {
                val total = price(o, cart, products).optLong("total")
                val payments =
                    if (v["split"] == "true")
                        listOf("Cash" to "cash", "M-Pesa" to "mpesa", "Card" to "card").map {
                            (method, key) ->
                            json("method" to method, "amount" to amount(v, key))
                        }
                    else listOf(json("method" to (v["method"] ?: "M-Pesa"), "amount" to total))
                pay(payments)
            }
            "promotion" -> {
                val percent = number(v, "percent", 1)
                require(
                    percent <= 100 &&
                        !v["name"].isNullOrBlank() &&
                        runCatching { LocalDate.parse(v["ends"]) }.isSuccess &&
                        (v["ends"] ?: "") >= todayLocal()
                ) {
                    "Enter an offer name, 1–100% discount and a current end date."
                }
                append(
                    o,
                    "promotions",
                    json(
                        "id" to next(o.records("promotions")),
                        "name" to v["name"],
                        "percent" to percent,
                        "ends" to v["ends"],
                        "productId" to
                            if (v["product"].isNullOrBlank() || v["product"] == "all")
                                JSONObject.NULL
                            else number(v, "product", 1),
                    ),
                )
            }
            "return" -> {
                val receipt =
                    o.records("receipts").firstOrNull { it.optInt("id") == id }
                        ?: error("This legacy receipt has no item details.")
                require(receipt.optString("branch") == active) {
                    "Switch to the receipt’s branch first."
                }
                val p = number(v, "product", 1)
                val line =
                    receipt.records("lines").firstOrNull { it.optInt("productId") == p }
                        ?: error("Choose an eligible line.")
                val qty = number(v, "quantity", 1)
                val before = receipt.objectAt("returned").optInt(p.toString())
                require(before + qty <= line.optInt("quantity") && !v["reason"].isNullOrBlank()) {
                    "Choose an eligible quantity and enter a reason."
                }
                val value =
                    line.optLong("net") * (before + qty) / line.optInt("quantity") -
                        line.optLong("net") * before / line.optInt("quantity")
                val refunded =
                    o.records("returns")
                        .filter { it.optInt("saleId") == id }
                        .sumOf { it.optLong("amount") }
                val total = receipt.optLong("total").coerceAtLeast(1)
                var allocated = 0L
                val source = receipt.records("payments")
                val payments =
                    source.mapIndexed { i, pay ->
                        val portion =
                            if (i == source.lastIndex) value - allocated
                            else
                                pay.optLong("amount") * (refunded + value) / total -
                                    pay.optLong("amount") * refunded / total
                        allocated += portion
                        json("method" to pay.optString("method"), "amount" to portion)
                    }
                receipt.objectAt("returned").put(p.toString(), before + qty)
                append(
                    o,
                    "returns",
                    json(
                        "id" to next(o.records("returns")),
                        "saleId" to id,
                        "productId" to p,
                        "quantity" to qty,
                        "amount" to value,
                        "restock" to (v["restock"] != "false"),
                        "reason" to v["reason"],
                        "date" to todayLocal(),
                        "payments" to JSONArray(payments),
                    ),
                )
                if (v["restock"] != "false")
                    changeLines(
                        listOf(JSONObject(line.toString()).put("quantity", qty)),
                        1,
                        "Return",
                        "Receipt #$id",
                    )
                payments
                    .filter { it.optString("method") == "Cash" }
                    .forEach { cashEntry(-it.optLong("amount"), "Refund #$id") }
                val earned = receipt.optInt("earned")
                val redeemed = receipt.optInt("redeemed")
                points(
                    receipt.optString("customer"),
                    ((redeemed * (refunded + value) / total - redeemed * refunded / total) -
                            (earned * (refunded + value) / total - earned * refunded / total))
                        .toInt(),
                    "Return on #$id",
                )
                message = "Demo refund recorded: ${minorMoney(value)}. No money was sent."
            }
            "document" -> {
                require(runCatching { LocalDate.parse(v["due"]) }.isSuccess) {
                    "Enter a valid due date."
                }
                val priced = price(o, cart, products)
                require(
                    priced.records("lines").isNotEmpty() &&
                        o.optString("customer") != "Walk-in customer"
                ) {
                    "Add items and select a named customer before creating a document."
                }
                require(o.optInt("redeem") == 0) {
                    "Use reward redemption at checkout, not on a draft document."
                }
                val key = next(o.records("documents"))
                append(
                    o,
                    "documents",
                    json(
                        "id" to key,
                        "kind" to (v["kind"] ?: "Quotation"),
                        "customer" to o.optString("customer"),
                        "branch" to active,
                        "lines" to priced.getJSONArray("lines"),
                        "total" to priced.optLong("total"),
                        "due" to (v["due"] ?: todayLocal()),
                        "status" to "Draft",
                    ),
                )
                lastId = key
                message = "Document saved without changing stock."
            }
            "convertDocument" -> {
                val d =
                    o.records("documents").firstOrNull {
                        it.optInt("id") == id && it.optString("kind") == "Quotation"
                    } ?: error("Choose a quotation.")
                require(o.records("documents").none { it.optInt("id") == -id }) {
                    "This quotation already has a linked invoice."
                }
                append(
                    o,
                    "documents",
                    JSONObject(d.toString())
                        .put("id", -id)
                        .put("kind", "Invoice")
                        .put("status", "Draft"),
                )
                message = "Quotation copied to an invoice."
            }
            "issueDocument" -> {
                val d =
                    o.records("documents").firstOrNull { it.optInt("id") == id }
                        ?: error("Document not found.")
                require(d.optString("status") == "Draft") { "Only a draft can be issued locally." }
                d.put("status", "Issued locally")
                message = "Marked issued locally. Nothing was emailed."
            }
            "payDocument" -> {
                val d =
                    o.records("documents").firstOrNull { it.optInt("id") == id }
                        ?: error("Document not found.")
                pay(listOf(json("method" to "Cash", "amount" to d.optLong("total"))), d)
            }
            "openRegister" -> {
                require(
                    o.records("registers").none {
                        it.optString("branch") == active && it.optString("status") == "Open"
                    }
                ) {
                    "This branch already has an open register."
                }
                append(
                    o,
                    "registers",
                    json(
                        "id" to next(o.records("registers")),
                        "branch" to active,
                        "opening" to amount(v, "amount"),
                        "status" to "Open",
                        "entries" to JSONArray(),
                    ),
                )
                message = "Demo register opened."
            }
            "cashEntry" -> {
                val register =
                    o.records("registers").firstOrNull {
                        it.optString("branch") == active && it.optString("status") == "Open"
                    } ?: error("Open a register first.")
                val value = amount(v, "amount") * (if (v["direction"] == "out") -1 else 1)
                require(value != 0L && !v["reason"].isNullOrBlank()) {
                    "Enter an amount and reason."
                }
                require(
                    register.optLong("opening") +
                        register.records("entries").sumOf { it.optLong("amount") } +
                        value >= 0
                ) {
                    "Cash out cannot exceed expected cash."
                }
                cashEntry(value, v["reason"]!!)
            }
            "closeRegister" -> {
                val r =
                    o.records("registers").firstOrNull {
                        it.optString("branch") == active && it.optString("status") == "Open"
                    } ?: error("Open a register first.")
                val counted = amount(v, "amount")
                val expected =
                    r.optLong("opening") + r.records("entries").sumOf { it.optLong("amount") }
                r.put("counted", counted)
                r.put("expected", expected)
                r.put("status", "Closed")
                message = "Register closed. Variance: ${minorMoney(counted-expected)}."
            }
            "startCount" -> {
                val key = next(o.records("counts"))
                append(
                    o,
                    "counts",
                    json(
                        "id" to key,
                        "branch" to active,
                        "name" to (v["name"] ?: "Shelf count"),
                        "starting" to JSONObject(stock.objectAt(active).toString()),
                        "counted" to JSONObject(),
                        "status" to "Draft",
                        "reason" to "",
                    ),
                )
                lastId = key
            }
            "count" -> {
                val c =
                    o.records("counts").firstOrNull {
                        it.optInt("id") == id && it.optString("status") == "Draft"
                    } ?: error("Choose a draft count.")
                c.objectAt("counted").put(number(v, "product", 1).toString(), number(v, "quantity"))
            }
            "refreshCount" -> {
                val c =
                    o.records("counts").firstOrNull {
                        it.optInt("id") == id && it.optString("status") == "Draft"
                    } ?: error("Choose a draft count.")
                c.put("starting", JSONObject(stock.objectAt(c.optString("branch")).toString()))
                message = "Starting stock refreshed. Review your counted quantities."
            }
            "finaliseCount" -> {
                val c =
                    o.records("counts").firstOrNull {
                        it.optInt("id") == id &&
                            it.optString("status") == "Draft" &&
                            it.optString("branch") == active
                    } ?: error("Choose a draft at this branch.")
                val counted = c.ints("counted")
                require(counted.isNotEmpty() && !v["reason"].isNullOrBlank()) {
                    "Count a product and enter an adjustment reason."
                }
                require(
                    counted.keys.all {
                        c.objectAt("starting").optInt(it.toString()) ==
                            stock.objectAt(active).optInt(it.toString())
                    }
                ) {
                    "Stock changed during this count. Refresh starting stock and review differences."
                }
                counted.forEach { (p, n) ->
                    val delta = n - stock.objectAt(active).optInt(p.toString())
                    if (delta != 0) changeStock(p, delta, "Stocktake", "Count #$id", active, true)
                }
                c.put("status", "Finalised")
                c.put("reason", v["reason"])
                message = "Stocktake finalised. Your ledger is updated."
            }
            "batch" -> {
                val p = number(v, "product", 1)
                val qty = number(v, "quantity", 1)
                require(
                    !v["code"].isNullOrBlank() &&
                        runCatching { LocalDate.parse(v["expires"]) }.isSuccess
                ) {
                    "Enter a batch code and expiry date."
                }
                changeStock(p, qty, "Batch receipt", v["code"]!!)
                o.records("batches").last().put("code", v["code"]).put("expires", v["expires"])
            }
            "writeOff" -> {
                val b =
                    o.records("batches").firstOrNull {
                        it.optInt("id") == id && it.optString("branch") == active
                    } ?: error("Choose a batch at this branch.")
                val qty = b.optInt("quantity")
                require(qty > 0 && !v["reason"].isNullOrBlank()) {
                    "Choose a batch with stock and enter a reason."
                }
                b.put("quantity", 0)
                val p = b.optInt("productId")
                stock
                    .objectAt(active)
                    .put(p.toString(), stock.objectAt(active).optInt(p.toString()) - qty)
                append(
                    o,
                    "movements",
                    json(
                        "id" to next(o.records("movements")),
                        "productId" to p,
                        "branch" to active,
                        "delta" to -qty,
                        "reason" to "Write-off: ${v["reason"]}",
                        "reference" to b.optString("code"),
                        "date" to todayLocal(),
                    ),
                )
                message = "Batch written off locally."
            }
            "variant" -> {
                val parent =
                    products.firstOrNull {
                        it.id == number(v, "parent", 1) && it.components.isEmpty()
                    } ?: error("Choose an individual parent product.")
                require(
                    !v["name"].isNullOrBlank() &&
                        !v["sku"].isNullOrBlank() &&
                        products.none { it.sku.equals(v["sku"], true) }
                ) {
                    "Enter a name and unique SKU."
                }
                val key = (products.maxOfOrNull { it.id } ?: 0) + 1
                val price = amount(v, "price")
                require(price > 0) { "Enter a positive selling price." }
                products.add(
                    Product(
                        key,
                        v["name"]!!,
                        v["size"] ?: "Variant",
                        (price / 100).toInt(),
                        0,
                        parent.category,
                        parent.art,
                        price,
                        v["sku"]!!,
                        productBarcode(key),
                        parent.variantOf ?: parent.id,
                    )
                )
                stock.objectAt(active).put(key.toString(), 0)
                val opening = number(v, "stock")
                if (opening > 0) changeStock(key, opening, "Opening variant", v["sku"]!!)
            }
            "bundle" -> {
                val parts =
                    JSONObject(v["components"] ?: "{}").let { obj ->
                        obj.keys().asSequence().associate { it.toInt() to obj.optInt(it) }
                    }
                require(
                    parts.size >= 2 &&
                        parts.all { (p, n) ->
                            n > 0 && products.any { it.id == p && it.components.isEmpty() }
                        } &&
                        !v["name"].isNullOrBlank()
                ) {
                    "Choose at least two different individual products."
                }
                val price = amount(v, "price")
                require(price > 0) { "Enter a positive bundle price." }
                val key = (products.maxOfOrNull { it.id } ?: 0) + 1
                products.add(
                    Product(
                        key,
                        v["name"]!!,
                        "Bundle",
                        (price / 100).toInt(),
                        0,
                        "Bundles",
                        "flour",
                        price,
                        "BUNDLE-$key",
                        productBarcode(key),
                        components = parts,
                    )
                )
            }
            "barcode" -> {
                val code = v["code"] ?: ""
                require(validBarcode(code) && products.none { it.id != id && it.barcode == code }) {
                    "Enter a unique EAN-13 barcode with a valid check digit."
                }
                val i = products.indexOfFirst { it.id == id }
                require(i >= 0) { "Product not found." }
                products[i] = products[i].copy(barcode = code)
            }
            "transfer" -> {
                val p = number(v, "product", 1)
                val qty = number(v, "quantity", 1)
                val to = v["to"] ?: ""
                require(
                    to != active &&
                        o.records("branches").any { it.optString("id") == to } &&
                        qty <= available(p, active, o, products) &&
                        products.first { it.id == p }.components.isEmpty()
                ) {
                    "Choose another branch and an available individual product quantity."
                }
                append(
                    o,
                    "transfers",
                    json(
                        "id" to next(o.records("transfers")),
                        "productId" to p,
                        "quantity" to qty,
                        "from" to active,
                        "to" to to,
                        "status" to "Draft",
                    ),
                )
            }
            "dispatchTransfer",
            "receiveTransfer",
            "cancelTransfer" -> {
                val t =
                    o.records("transfers").firstOrNull { it.optInt("id") == id }
                        ?: error("Transfer not found.")
                val status = t.optString("status")
                val p = t.optInt("productId")
                val qty = t.optInt("quantity")
                when (action) {
                    "dispatchTransfer" -> {
                        require(
                            status == "Draft" &&
                                qty <= available(p, t.optString("from"), o, products)
                        ) {
                            "Only an available draft can be dispatched."
                        }
                        changeStock(p, -qty, "Transfer out", "Transfer #$id", t.optString("from"))
                        t.put("status", "Dispatched")
                    }
                    "receiveTransfer" -> {
                        require(status == "Dispatched") {
                            "Only an in-transit transfer can be received."
                        }
                        changeStock(p, qty, "Transfer in", "Transfer #$id", t.optString("to"))
                        t.put("status", "Received")
                    }
                    else -> {
                        require(status in listOf("Draft", "Dispatched")) {
                            "This transfer is already complete."
                        }
                        if (status == "Dispatched")
                            changeStock(
                                p,
                                qty,
                                "Transfer returned",
                                "Transfer #$id",
                                t.optString("from"),
                            )
                        t.put("status", "Cancelled")
                    }
                }
            }
            "compareBasket" -> {
                val values = JSONObject()
                v.forEach { (key, value) ->
                    val n = value.toIntOrNull()
                    require(n != null && n >= 0) { "Enter whole product quantities." }
                    if (n > 0) values.put(key, n)
                }
                o.put("compareCart", values)
            }
            "shopCart" -> {
                val p = number(v, "product", 1)
                val qty = number(v, "quantity")
                require(qty <= available(p, o.objectAt("shop").optString("branch"), o, products)) {
                    "This product quantity is unavailable."
                }
                o.objectAt("shopCart").put(p.toString(), qty)
            }
            "purchaseOrder" -> {
                val supplier = v["supplier"] ?: "KIFARU Wholesale"
                val key = next(o.records("purchaseOrders"))
                val lines =
                    price(
                            JSONObject(o.toString())
                                .put("discount", 0)
                                .put("promotion", "")
                                .put("redeem", 0),
                            o.ints("compareCart"),
                            products,
                        )
                        .records("lines")
                require(lines.isNotEmpty()) { "Add products to the comparison basket first." }
                append(
                    o,
                    "purchaseOrders",
                    json(
                        "id" to key,
                        "supplier" to supplier,
                        "branch" to active,
                        "lines" to JSONArray(lines),
                        "fee" to amount(v, "fee"),
                        "total" to
                            lines.sumOf { line ->
                                val p = products.first { it.id == line.optInt("productId") }
                                p.priceMinor * 8 / 10 *
                                    line.optInt("quantity") *
                                    (v["factor"]?.toLongOrNull() ?: 100) / 100
                            } + amount(v, "fee"),
                        "status" to "Draft",
                    ),
                )
                lastId = key
                message = "Local purchase order prepared. Nothing was sent to a supplier."
            }
            "receivePurchaseOrder" -> {
                val order =
                    o.records("purchaseOrders").firstOrNull {
                        it.optInt("id") == id && it.optString("status") == "Draft"
                    } ?: error("This purchase order is already received.")
                changeLines(
                    order.records("lines"),
                    1,
                    "Purchase receipt",
                    "Purchase #$id",
                    order.optString("branch", "main"),
                )
                order.put("status", "Received")
            }
            "shop" -> {
                val shop = o.objectAt("shop")
                listOf("name", "description", "branch").forEach { k ->
                    v[k]?.let { shop.put(k, it) }
                }
                v["published"]?.let { shop.put("published", it == "true") }
                v["fee"]?.let { shop.put("fee", parseMinor(it)) }
                v["hidden"]?.let { shop.put("hidden", JSONArray(it)) }
            }
            "placeOrder" -> {
                val shop = o.objectAt("shop")
                require(
                    shop.optBoolean("published") &&
                        !v["customer"].isNullOrBlank() &&
                        !v["address"].isNullOrBlank()
                ) {
                    "Enter a sample customer name and delivery or pickup details."
                }
                val lines =
                    price(
                        JSONObject(o.toString())
                            .put("discount", 0)
                            .put("promotion", "")
                            .put("redeem", 0),
                        o.ints("shopCart"),
                        products,
                    )
                val hidden = shop.optJSONArray("hidden") ?: JSONArray()
                require(
                    lines.records("lines").isNotEmpty() &&
                        lines.records("lines").all { l ->
                            l.optInt("quantity") <=
                                available(
                                    l.optInt("productId"),
                                    shop.optString("branch"),
                                    o,
                                    products,
                                ) &&
                                (0 until hidden.length()).none {
                                    hidden.getInt(it) == l.optInt("productId")
                                }
                        }
                ) {
                    "A product is hidden or unavailable at the shop’s fulfilment branch."
                }
                val key = next(o.records("deliveries"))
                append(
                    o,
                    "deliveries",
                    json(
                        "id" to key,
                        "customer" to v["customer"],
                        "branch" to shop.optString("branch"),
                        "lines" to lines.getJSONArray("lines"),
                        "fee" to shop.optLong("fee"),
                        "total" to lines.optLong("total") + shop.optLong("fee"),
                        "address" to v["address"],
                        "status" to "New",
                        "paid" to false,
                        "packed" to JSONArray(),
                        "events" to JSONArray(listOf("${todayLocal()} · Demo order created")),
                    ),
                )
                lastId = key
                o.put("shopCart", JSONObject())
                message = "Demo order saved locally. No payment or delivery request was sent."
            }
            "orderStatus" -> {
                val order =
                    o.records("deliveries").firstOrNull { it.optInt("id") == id }
                        ?: error("Customer order not found.")
                val before = order.optString("status")
                val next = v["status"] ?: ""
                val map =
                    mapOf(
                        "New" to "Confirmed",
                        "Confirmed" to "Packing",
                        "Packing" to "Dispatched",
                        "Dispatched" to "Delivered",
                    )
                require(
                    if (next == "Cancelled") before in listOf("New", "Confirmed", "Packing")
                    else map[before] == next
                ) {
                    "This order cannot move to that status."
                }
                if (next == "Confirmed")
                    require(
                        order.records("lines").all {
                            it.optInt("quantity") <=
                                available(
                                    it.optInt("productId"),
                                    order.optString("branch"),
                                    o,
                                    products,
                                )
                        }
                    ) {
                        "Stock changed. Restock before confirming."
                    }
                if (next == "Dispatched") {
                    val packed = order.strings("packed")
                    require(
                        order.records("lines").all { it.optInt("productId").toString() in packed }
                    ) {
                        "Check every item on the packing list."
                    }
                    changeLines(
                        order.records("lines"),
                        -1,
                        "Customer order dispatched",
                        "Order #$id",
                        order.optString("branch"),
                    )
                }
                order.put("status", next)
                order.put("events", JSONArray(order.strings("events") + "${todayLocal()} · $next"))
            }
            "pack" -> {
                val order =
                    o.records("deliveries").firstOrNull {
                        it.optInt("id") == id && it.optString("status") == "Packing"
                    } ?: error("Open a packing order first.")
                val p = number(v, "product", 1).toString()
                val packed = order.strings("packed").toMutableList()
                if (p in packed) packed.remove(p) else packed.add(p)
                order.put("packed", JSONArray(packed))
            }
            "orderPaid" -> {
                val order =
                    o.records("deliveries").firstOrNull { it.optInt("id") == id }
                        ?: error("Order not found.")
                require(!order.optBoolean("paid") && order.optString("status") == "Delivered") {
                    "Deliver this order before recording its payment. Each order can be paid once."
                }
                val receiptId =
                    maxOf(
                        1048,
                        store.sales.maxOfOrNull { it.id } ?: 0,
                        o.records("receipts").maxOfOrNull { it.optInt("id") } ?: 0,
                    ) + 1
                val total = order.optLong("total")
                val earned = (total / o.optLong("rewardRate", 10000)).toInt()
                append(
                    o,
                    "receipts",
                    json(
                        "id" to receiptId,
                        "branch" to order.optString("branch"),
                        "customer" to order.optString("customer"),
                        "lines" to order.getJSONArray("lines"),
                        "total" to total,
                        "deliveryFee" to order.optLong("fee"),
                        "discount" to 0,
                        "payments" to
                            JSONArray(listOf(json("method" to "Cash", "amount" to total))),
                        "date" to todayLocal(),
                        "earned" to earned,
                        "redeemed" to 0,
                        "returned" to JSONObject(),
                    ),
                )
                points(order.optString("customer"), earned, "Receipt #$receiptId")
                store.sales.add(
                    0,
                    Sale(
                        receiptId,
                        order.optString("customer"),
                        (total / 100).toInt(),
                        order.records("lines").sumOf { it.optInt("quantity") },
                        "Cash",
                        order.optString("branch"),
                        total,
                    ),
                )
                lastId = receiptId
                order.put("paid", true)
                cashEntry(order.optLong("total"), "Customer order #$id", order.optString("branch"))
                order.put(
                    "events",
                    JSONArray(
                        order.strings("events") + "${todayLocal()} · Payment recorded locally"
                    ),
                )
                message = "Demo payment recorded. No money was collected."
            }
            "rewardRate" -> {
                val rate = amount(v, "amount")
                require(rate >= 100) { "Set a spending threshold of at least KES 1 per point." }
                o.put("rewardRate", rate)
            }
            "preferences" -> {
                val prefs = o.objectAt("preferences")
                v["language"]?.let {
                    require(it in listOf("en", "sw"))
                    prefs.put("language", it)
                }
                v["theme"]?.let {
                    require(it in listOf("light", "dark", "system"))
                    prefs.put("theme", it)
                }
                v["textSize"]?.let {
                    require(it in listOf("100", "115", "130"))
                    prefs.put("textSize", it.toInt())
                }
            }
            "syncMode" -> {
                o.objectAt("sync").put("mode", v["mode"] ?: "Local only")
                message = "Connection scenario selected. There is no server sync in this preview."
            }
            "retrySync" -> {
                o.objectAt("sync")
                    .records("entries")
                    .firstOrNull { it.optInt("id") == id }
                    ?.put("status", "Saved on device")
                message = "Retry preview complete. Data stays on this device; nothing was uploaded."
            }
            else -> error("This action is unavailable.")
        }
        if (action !in listOf("cart", "basket", "count", "pack", "preferences", "retrySync")) {
            val sync = o.objectAt("sync")
            val entries = sync.records("entries")
            val status =
                when (sync.optString("mode")) {
                    "Conflict preview" -> "Review needed"
                    "Offline preview" -> "Retry preview"
                    else -> "Saved on device"
                }
            sync.put(
                "entries",
                JSONArray(
                    (listOf(
                            json(
                                "id" to next(entries),
                                "label" to
                                    if (message == "Saved in this demo on your device.") action
                                    else message,
                                "status" to status,
                            )
                        ) + entries)
                        .take(100)
                ),
            )
        }
        o.put("cart", JSONObject(cart.mapKeys { it.key.toString() }))
        Snapshot.withMutableSnapshot {
            store.products.clear()
            store.products.addAll(
                products.map { p ->
                    p.copy(
                        stock =
                            if (p.components.isEmpty())
                                stock.objectAt(active).optInt(p.id.toString())
                            else
                                p.components.minOf { (id, q) ->
                                    stock.objectAt(active).optInt(id.toString()) / q
                                }
                    )
                }
            )
            store.cart.clear()
            store.cart.putAll(cart)
            state = o
        }
        if (store.real) store.onDraftChanged()
        return message
    }
}
