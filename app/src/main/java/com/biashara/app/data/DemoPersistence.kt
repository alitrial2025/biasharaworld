package com.biashara.app.data

import android.content.Context
import androidx.compose.runtime.snapshotFlow
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

private val Context.biasharaDataStore by preferencesDataStore(name = "biashara_demo_v2")

object DemoPersistence {
    private val key = stringPreferencesKey("snapshot")

    fun snapshot(store: DemoStore): String =
        json(
                "version" to 2,
                "business" to store.businessName,
                "owner" to store.ownerName,
                "location" to store.location,
                "products" to
                    JSONArray(
                        store.products.map { p ->
                            json(
                                "id" to p.id,
                                "name" to p.name,
                                "detail" to p.detail,
                                "price" to p.price,
                                "stock" to p.stock,
                                "category" to p.category,
                                "art" to p.art,
                                "priceMinor" to p.priceMinor,
                                "sku" to p.sku,
                                "barcode" to p.barcode,
                                "variantOf" to (p.variantOf ?: JSONObject.NULL),
                                "components" to
                                    JSONObject(p.components.mapKeys { it.key.toString() }),
                            )
                        }
                    ),
                "sales" to
                    JSONArray(
                        store.sales.map { s ->
                            json(
                                "id" to s.id,
                                "customer" to s.customer,
                                "amount" to s.amount,
                                "items" to s.items,
                                "method" to s.method,
                                "branch" to s.branch,
                                "amountMinor" to s.amountMinor,
                            )
                        }
                    ),
                "customers" to
                    JSONArray(
                        store.customers.map { c ->
                            json(
                                "name" to c.name,
                                "initial" to c.initial,
                                "balance" to c.balance,
                                "color" to c.color,
                            )
                        }
                    ),
                "cart" to JSONObject(store.cart.mapKeys { it.key.toString() }),
                "operations" to store.operations.state,
            )
            .toString()

    fun restore(store: DemoStore, raw: String) {
        require(!store.real) { "Sample snapshots cannot replace a live business." }
        val o = JSONObject(raw)
        require(o.optInt("version") == 2)
        val products =
            o.records("products").map { p ->
                Product(
                    p.getInt("id"),
                    p.getString("name"),
                    p.getString("detail"),
                    p.getInt("price"),
                    p.getInt("stock"),
                    p.getString("category"),
                    p.getString("art"),
                    p.getLong("priceMinor"),
                    p.getString("sku"),
                    p.getString("barcode"),
                    if (p.isNull("variantOf")) null else p.getInt("variantOf"),
                    p.ints("components"),
                )
            }
        require(products.all { it.stock >= 0 && it.priceMinor > 0 })
        val sales =
            o.records("sales").map { s ->
                Sale(
                    s.getInt("id"),
                    s.getString("customer"),
                    s.getInt("amount"),
                    s.getInt("items"),
                    s.getString("method"),
                    s.optString("branch", "main"),
                    s.optLong("amountMinor", s.getInt("amount") * 100L),
                )
            }
        val customers =
            o.records("customers").map { c ->
                Customer(
                    c.getString("name"),
                    c.getString("initial"),
                    c.getInt("balance"),
                    c.getInt("color"),
                )
            }
        val business = o.getString("business")
        val owner = o.getString("owner")
        val location = o.getString("location")
        val cart = o.ints("cart")
        val operations = o.getJSONObject("operations")
        require(
            operations.optInt("version") == 2 &&
                products.isNotEmpty() &&
                products.map { it.id }.distinct().size == products.size
        )
        operations.getJSONObject("preferences")
        operations.getJSONArray("batches")
        store.products.clear()
        store.products.addAll(products)
        store.sales.clear()
        store.sales.addAll(sales)
        store.customers.clear()
        store.customers.addAll(customers)
        store.businessName = business
        store.ownerName = owner
        store.location = location
        store.cart.clear()
        store.cart.putAll(cart)
        store.operations.restore(operations)
        store.operations.storageWarning = ""
    }

    fun attach(context: Context, scope: CoroutineScope, store: DemoStore) {
        scope.launch {
            try {
                context.biasharaDataStore.data.first()[key]?.let { restore(store, it) }
            } catch (_: Exception) {
                store.operations.storageWarning =
                    "The saved demo could not be read. Sample data is shown; reset from Preferences for a fresh start."
            }
            snapshotFlow { snapshot(store) }
                .collect { value ->
                    try {
                        context.biasharaDataStore.edit { it[key] = value }
                    } catch (_: Exception) {
                        store.operations.storageWarning =
                            "Device storage is unavailable. Changes remain in memory."
                    }
                }
        }
    }
}
