package com.biashara.app.ui

import android.content.Intent
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import com.biashara.app.BuildConfig
import com.biashara.app.data.DemoStore
import com.biashara.app.data.json
import com.biashara.app.data.minorMoney
import java.util.UUID
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

@Composable
internal fun LiveShopSetupScreen(store: DemoStore, back: () -> Unit, orders: () -> Unit) {
    val backend = store.backend ?: return
    val context = LocalContext.current
    val uri = LocalUriHandler.current
    val scope = rememberCoroutineScope()
    val host = BuildConfig.API_URL.trimEnd('/').ifBlank { "https://biasharaworld.vercel.app" }
    var saved by remember(backend) { mutableStateOf<JSONObject?>(null) }
    var mode by remember { mutableStateOf("all") }
    var selected by remember { mutableStateOf<Set<Int>>(emptySet()) }
    var filter by remember { mutableStateOf("") }
    var limit by remember { mutableIntStateOf(40) }
    var notice by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var pending by remember { mutableStateOf<Pair<Pair<String, Long>, String>?>(null) }

    suspend fun load() {
        val setup = backend.storefront()
        val draft = setup.getJSONObject("draft")
        mode = draft.optString("catalog", "all")
        val ids = draft.optJSONArray("products") ?: JSONArray()
        selected = (0 until ids.length()).map { ids.getInt(it) }.toSet()
        saved = setup
    }
    fun run(action: String? = null) {
        if (busy) return
        busy = true
        error = ""
        notice = ""
        scope.launch {
            try {
                val setup = saved
                if (action == "save" && setup != null) {
                    val draft = JSONObject(setup.getJSONObject("draft").toString())
                        .put("catalog", mode).put("products", JSONArray(selected.toList()))
                    backend.storefront(json("action" to "save", "username" to setup.getString("username"),
                        "revision" to setup.getLong("revision"), "draft" to draft))
                    notice = "Catalogue draft saved."
                } else if (action != null && setup != null) {
                    val revision = setup.getLong("revision")
                    val signature = action to revision
                    val requestId = pending?.takeIf { it.first == signature }?.second ?: UUID.randomUUID().toString()
                    pending = signature to requestId
                    backend.storefront(json("action" to action, "revision" to revision, "requestId" to requestId))
                    pending = null
                    notice = if (action == "publish") "Shop published." else "Shop hidden."
                }
                load()
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (failure: Exception) {
                error = failure.message ?: "Could not update the shop."
            } finally {
                busy = false
            }
        }
    }
    LaunchedEffect(backend) { if (backend.role == "Owner") run() }

    val draft = saved?.optJSONObject("draft")
    val publication = saved?.optJSONObject("publication")
    val publicPath = publication?.takeUnless { it.isNull("publicPath") }?.optString("publicPath").orEmpty()
    val status = publication?.optString("status").orEmpty()
    val verified = publication?.optBoolean("verified") == true
    val issues = publication?.optJSONArray("issues")?.strings().orEmpty()
    val ready = saved?.optLong("revision")?.let { it > 0 } == true
    val storedIds = draft?.optJSONArray("products") ?: JSONArray()
    val dirty = ready && (draft?.optString("catalog") != mode || selected != (0 until storedIds.length()).map { storedIds.getInt(it) }.toSet())

    Page {
        PageTitle("Online shop", onBack = back)
        if (backend.role != "Owner") {
            AppText("Only the business owner can manage the shop.")
            return@Page
        }
        if (error.isNotEmpty()) AppText(error, color = Coral)
        if (notice.isNotEmpty()) AppText(notice, color = Green)
        SurfaceCard {
            AppText(if (status.isEmpty()) "Shop status" else status, style = MaterialTheme.typography.titleLarge)
            if (publicPath.isNotEmpty()) {
                AppText(host + publicPath)
                TextButton(onClick = { uri.openUri(host + publicPath) }) { AppText("View live shop") }
                TextButton(onClick = {
                    val intent = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, host + publicPath)
                    context.startActivity(Intent.createChooser(intent, "Share shop link"))
                }) { AppText("Share shop link") }
            }
            TextButton(onClick = orders) { AppText("Manage shop orders") }
            TextButton(onClick = { uri.openUri("$host/login?next=%2Fdashboard%2Fonline-shop") }) { AppText("Open Shop builder") }
            TextButton(enabled = !busy, onClick = { run() }) { AppText(if (busy) "Saving…" else "Reload saved setup") }
        }
        if (ready) {
            SurfaceCard {
                AppText("Catalogue visibility", style = MaterialTheme.typography.titleMedium)
                ToolSelect("Public product catalogue", mode, listOf("all" to "Show all inventory products",
                    "selected" to "Choose products", "off" to "No product checkout")) { mode = it }
                if (mode == "selected") {
                    OutlinedTextField(filter, { filter = it; limit = 40 }, label = { AppText("Find inventory products") },
                        modifier = Modifier.fillMaxWidth(), singleLine = true)
                    val results = store.products.filter { it.name.contains(filter.trim(), ignoreCase = true) }
                    results.take(limit).forEach { product ->
                        androidx.compose.foundation.layout.Row {
                            Checkbox(checked = product.id in selected, enabled = !busy, onCheckedChange = { checked ->
                                selected = if (checked) selected + product.id else selected - product.id
                            })
                            AppText(product.name + " · " + minorMoney(product.priceMinor))
                        }
                    }
                    if (results.size > limit) TextButton(onClick = { limit += 40 }) { AppText("Show more products") }
                }
                PrimaryButton("Save catalogue draft", { run("save") }, enabled = dirty && !busy)
                AppText("Publishing applies the saved shop draft, including edits made in Shop builder.", color = Muted)
            }
            SurfaceCard {
                AppText("Publication checklist", style = MaterialTheme.typography.titleMedium)
                AppText(if (verified) "Merchant verification complete" else "Merchant verification required")
                issues.forEach { issue -> AppText(issue, color = Muted) }
                PrimaryButton("Publish saved draft", { run("publish") }, enabled = !busy && !dirty && verified && issues.isEmpty())
                if (!saved!!.isNull("live") && saved?.optBoolean("published") == true)
                    TextButton(enabled = !busy, onClick = { run("unpublish") }) { AppText("Unpublish shop") }
            }
        }
    }
}
