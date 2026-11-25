package com.biashara.app.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
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
    fun allows(tool: String, role: String) = tool != "industry" ||
        modules.isNotEmpty() && (role in listOf("Owner", "Manager") || id == "entertainment" && role == "Cashier")

    fun shortcuts(role: String) = (listOfNotNull("industry".takeIf { modules.isNotEmpty() }) +
        tools + listOf("documents", "expenses", "reports")).distinct().take(7).filter { allows(it, role) }
}

internal data class WorkspaceTool(val slug: String, val label: String, val keywords: String = "", val module: String = "")

internal class IndustryCatalog(workspaces: JSONArray, tools: JSONArray) {
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

    fun search(industry: Industry, role: String, query: String): List<WorkspaceTool> {
        val term = query.trim()
        if (term.isBlank()) return industry.shortcuts(role).map { WorkspaceTool(it, label(it)) }
        val modules = if (industry.allows("industry", role) && role != "Cashier") industry.modules.filter {
            "${it.label} ${it.name} ${it.fields.joinToString(" ") { field -> field.label }}".contains(term, ignoreCase = true)
        }.map { WorkspaceTool("industry", it.label, module = it.id) } else emptyList()
        return modules + directory.filter {
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
        fun asset(path: String) = context.assets.open(path).bufferedReader().use { JSONArray(it.readText()) }
        IndustryCatalog(asset("workspaces.json"), asset("tools.json"))
    }
}
