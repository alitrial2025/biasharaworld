package com.biashara.app.data

import org.json.JSONArray
import org.json.JSONObject

/** Converts native form strings to the same strictly validated commands used by the website. */
fun nativeCommand(action: String, v: Map<String, String>, store: DemoStore): JSONObject {
    val result = json("type" to action)
    fun text(key: String, target: String = key, default: String = "") {
        result.put(target, v[key] ?: default)
    }
    fun number(key: String, target: String = key, default: Int = 0) {
        result.put(target, v[key]?.let { raw -> raw.trim().toIntOrNull() ?: error("Enter a whole number for $key.") } ?: default)
    }
    fun amount(key: String, target: String = key) {
        result.put(target, parseMinor(v[key] ?: "0"))
    }
    fun id() {
        val value = v["id"]?.toIntOrNull() ?: error("Select an existing record.")
        require(value != 0) { "Select an existing record." }
        result.put("id", value)
    }
    when (action) {
        "updateProduct" -> {
            id()
            result.put("changes", JSONObject(v["changes"] ?: error("Enter product changes.")))
        }
        "setTarget" -> result.put("target", parseMinor(v["target"] ?: "0") / 100.0)
        "toggleNotification" -> text("name")
        "removeExpense" -> id()
        "branch" -> text("branch", "id", "main")
        "addBranch" -> {
            text("name")
            text("location")
        }
        "cart" -> {
            number("product", "id")
            number("quantity")
        }
        "basket" -> {
            v.keys.forEach { key ->
                when (key) {
                    "redeem" -> number(key)
                    "discount" ->
                        if (
                            (v["discountKind"]
                                ?: store.operations.state.optString("discountKind")) == "fixed"
                        )
                            amount(key)
                        else number(key)
                    else -> text(key)
                }
            }
        }
        "hold" -> text("name", default = "A sale for later")
        "resume",
        "discard",
        "convertDocument",
        "issueDocument",
        "payDocument",
        "refreshCount",
        "receiveTransfer",
        "dispatchTransfer",
        "cancelTransfer",
        "orderPaid" -> id()
        "checkout" -> {
            val total = store.operations.price().optLong("total")
            val payments =
                if (v["split"] == "true")
                    listOf(
                        json("method" to "M-Pesa", "amount" to parseMinor(v["mpesa"] ?: "0")),
                        json("method" to "Cash", "amount" to parseMinor(v["cash"] ?: "0")),
                        json("method" to "Card", "amount" to parseMinor(v["card"] ?: "0")),
                    )
                else listOf(json("method" to (v["method"] ?: "Cash"), "amount" to total))
            result.put("payments", JSONArray(payments))
        }
        "promotion" -> {
            text("name")
            number("percent")
            text("ends")
            result.put(
                "productId",
                v["product"]?.toIntOrNull()?.takeIf { it > 0 } ?: JSONObject.NULL,
            )
        }
        "return" -> {
            id()
            number("product", "productId")
            number("quantity")
            result.put("restock", v["restock"] != "false")
            text("reason")
        }
        "document" -> {
            text("kind", default = "Quotation")
            text("due", default = todayLocal())
        }
        "openRegister",
        "cashEntry",
        "closeRegister",
        "rewardRate" -> {
            amount("amount")
            if (action == "cashEntry") {
                text("reason", "label")
                if (v["direction"].equals("out", ignoreCase = true))
                    result.put("amount", -result.getLong("amount"))
            }
        }
        "startCount" -> text("name")
        "count" -> {
            id()
            number("product", "productId")
            number("quantity")
        }
        "finaliseCount" -> {
            id()
            text("reason")
        }
        "batch" -> {
            number("product", "productId")
            number("quantity")
            text("code")
            text("expires")
        }
        "writeOff" -> {
            id()
            text("reason")
        }
        "variant" -> {
            number("parent", "parentId")
            text("name")
            text("size")
            text("sku")
            amount("price")
            number("stock")
        }
        "bundle" -> {
            text("name")
            amount("price")
            val obj = JSONObject(v["components"] ?: "{}")
            result.put(
                "components",
                JSONArray(
                    obj.keys()
                        .asSequence()
                        .map { k -> json("productId" to k.toInt(), "quantity" to obj.getInt(k)) }
                        .toList()
                ),
            )
        }
        "barcode" -> {
            number("product", "id", v["id"]?.toIntOrNull() ?: 0)
            text("code")
        }
        "transfer" -> {
            number("product", "productId")
            number("quantity")
            text("to")
        }
        "shop" -> {
            v.forEach { (k, value) ->
                when (k) {
                    "published" -> result.put(k, value == "true")
                    "fee" -> amount(k)
                    "hidden" -> result.put(k, JSONArray(value))
                    else -> text(k)
                }
            }
        }
        "placeOrder" -> {
            text("customer")
            text("address")
            result.put("cart", store.operations.state.objectAt("shopCart"))
        }
        "orderStatus" -> {
            id()
            text("status")
        }
        "pack" -> {
            id()
            number("product", "productId")
        }
        "preferences" -> {
            v.forEach { (k, value) ->
                if (k == "textSize") result.put(k, value.toInt()) else result.put(k, value)
            }
        }
        "receivePurchaseOrder" -> {
            result.put("type", "receiveOrder")
            id()
        }
        "purchaseOrder" -> {
            result.put("type", "createOrder")
            text("supplier")
            result.put("deliveryFee", parseMinor(v["fee"] ?: "0") / 100.0)
            result.put(
                "items",
                JSONArray(
                    store.operations.state
                        .ints("compareCart")
                        .filterValues { it > 0 }
                        .map { (id, q) ->
                            json(
                                "productId" to id,
                                "quantity" to q,
                                "cost" to
                                    (store.liveState
                                        .records("suppliers")
                                        .firstOrNull { it.optString("name") == v["supplier"] }
                                        ?.optJSONObject("quotes")
                                        ?.optDouble(id.toString(), Double.NaN)
                                        ?.takeIf { it.isFinite() }
                                        ?: store.liveState
                                            .records("products")
                                            .firstOrNull { it.optInt("id") == id }
                                            ?.optDouble("cost")
                                        ?: 0.0),
                            )
                        }
                ),
            )
        }
        "clearCart" -> Unit
        else -> error("This action is not connected yet. No business records were changed.")
    }
    return result
}
