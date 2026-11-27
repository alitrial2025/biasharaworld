package com.biashara.app.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import java.time.Instant
import java.time.LocalDate
import org.json.JSONArray
import org.json.JSONObject

internal data class IndustryField(val key: String, val label: String, val type: String, val module: String, val optional: Boolean)

internal data class IndustryModule(
    val id: String,
    val label: String,
    val name: String,
    val fields: List<IndustryField>,
    val flow: JSONObject,
)

internal data class Industry(val id: String, val label: String, val aliases: List<String>, val tools: List<String>, val modules: List<IndustryModule>) {
    fun allows(tool: String, role: String) = when (tool) {
        "industry" -> modules.isNotEmpty() && (role in listOf("Owner", "Manager") || id == "entertainment" && role == "Cashier")
        "online-shop" -> role == "Owner"
        "bookings" -> role in listOf("Owner", "Manager")
        "customer-access" -> id in listOf("services", "entertainment", "real-estate") && role in listOf("Owner", "Manager")
        "sales/new" -> role in listOf("Owner", "Manager", "Cashier")
        else -> true
    }

    fun shortcuts(role: String) = (listOfNotNull("industry".takeIf { modules.isNotEmpty() }) +
        tools + listOf("documents", "expenses", "reports")).distinct().take(7).filter { allows(it, role) }
}

internal data class WorkspaceTool(val slug: String, val label: String, val keywords: String = "", val module: String = "")

internal data class ActivityQueue(
    val module: String, val statuses: List<String>, val field: String?, val throughDays: Long, val futureField: String?,
) {
    fun matcher(today: LocalDate, now: Instant = Instant.now()): (JSONObject) -> Boolean {
        val through = today.plusDays(throughDays).toString()
        val current = now.toEpochMilli()
        return { record ->
            record.optString("module") == module && record.optString("status") in statuses &&
                (futureField == null || record.optJSONObject("values")?.optString(futureField).orEmpty().let {
                    runCatching { Instant.parse(it).toEpochMilli() > current }.getOrDefault(false)
                }) &&
                (field == null || record.optJSONObject("values")?.optString(field).orEmpty().let {
                    it.isNotEmpty() && it <= through
                })
        }
    }
}

internal data class DailyAction(
    val slug: String,
    val label: String,
    val metric: String?,
    val question: String?,
    val queue: ActivityQueue?,
    val view: String?,
) {
    val destination get() = when {
        queue != null -> "industry/attention"
        view != null -> "$slug/$view"
        else -> slug
    }
    val module get() = queue?.module.orEmpty()
}

internal class IndustryCatalog(workspaces: JSONArray, tools: JSONArray, private val dailyWork: JSONObject = JSONObject()) {
    private val industries = List(workspaces.length()) { index ->
        val data = workspaces.getJSONObject(index)
        Industry(data.getString("id"), data.getString("label"), data.getJSONArray("aliases").strings(),
            data.getJSONArray("tools").strings(), data.getJSONArray("modules").objects().map { module ->
                IndustryModule(module.getString("id"), module.getString("label"), module.getString("name"),
                    module.getJSONArray("fields").objects().map { field ->
                        IndustryField(field.getString("key"), field.getString("label"), field.getString("type"),
                            field.optString("module"), field.optBoolean("optional"))
                    }, module.getJSONObject("flow"))
            })
    }
    private val directory = List(tools.length()) { index ->
        val item = tools.getJSONArray(index)
        WorkspaceTool(item.getString(0), item.getString(1), item.getString(2))
    }
    val options = industries.map { it.id to it.label }

    fun industry(value: String) = industries.firstOrNull {
        (listOf(it.id, it.label) + it.aliases).any { label -> label.equals(value.trim(), ignoreCase = true) }
    } ?: industries.first { it.id == "general" }

    fun label(slug: String) = directory.firstOrNull { it.slug == slug }?.label ?: slug

    fun dailyActions(industry: Industry, role: String): List<DailyAction>? =
        dailyWork.optJSONArray(industry.id)?.objects()
            ?.filter { it.optJSONArray("roles")?.strings()?.contains(role) ?: true }
            ?.take(3)
            ?.map { action ->
                val queue = action.optJSONObject("queue")?.let {
                    ActivityQueue(it.getString("module"), it.getJSONArray("statuses").strings(),
                        it.optString("field").ifEmpty { null }, it.optLong("throughDays"),
                        it.optString("futureField").ifEmpty { null })
                }
                DailyAction(action.getString("slug"), action.getString("label"),
                    action.optString("metric").ifEmpty { null }, action.optString("question").ifEmpty { null },
                    queue, action.optString("view").ifEmpty { null })
            }

    fun search(industry: Industry, role: String, query: String): List<WorkspaceTool> {
        val term = query.trim()
        if (term.isBlank()) {
            return dailyActions(industry, role)?.map { WorkspaceTool(it.destination, it.label, module = it.module) }
                ?: industry.shortcuts(role).map { WorkspaceTool(it, label(it)) }
        }
        val modules = if (industry.allows("industry", role) && role != "Cashier") industry.modules.filter {
            "${it.label} ${it.name} ${it.fields.joinToString(" ") { field -> field.label }}".contains(term, ignoreCase = true)
        }.map { WorkspaceTool("industry", it.label, module = it.id) } else emptyList()
        val priority = dailyActions(industry, role).orEmpty().filter {
            (it.slug == "industry" || it.view != null) && it.label.contains(term, ignoreCase = true)
        }.map { WorkspaceTool(it.destination, it.label, module = it.module) }
        return priority + modules + directory.filter {
            industry.allows(it.slug, role) && "${it.label} ${if (it.slug == "industry") industry.label else it.keywords}".contains(term, ignoreCase = true)
        }
    }
}

internal fun JSONArray.strings() = List(length()) { getString(it) }
internal fun JSONArray.objects() = List(length()) { getJSONObject(it) }

@Composable
internal fun rememberIndustryCatalog(): IndustryCatalog {
    val context = LocalContext.current
    return remember(context) {
        fun asset(path: String) = context.assets.open(path).bufferedReader().use { it.readText() }
        IndustryCatalog(JSONArray(asset("workspaces.json")), JSONArray(asset("tools.json")), JSONObject(asset("daily-work.json")))
    }
}
