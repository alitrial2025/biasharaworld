package com.biashara.app.data

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.LocalDateTime

data class IndustryField(val key: String, val label: String, val type: String, val required: Boolean, val options: List<String>, val min: Double?, val max: Double?)
data class IndustryWorkflow(val id: String, val label: String, val singular: String, val description: String, val statuses: List<String>, val terminalStatuses: List<String>, val fields: List<IndustryField>, val amountLabel: String, val reservation: JSONObject?)
data class BusinessIndustry(val id: String, val label: String, val description: String, val group: String, val aliases: List<String>, val recommendedTools: List<String>, val catalogLabel: String, val customerLabel: String, val operationsLabel: String, val workflows: List<IndustryWorkflow>)

internal fun JSONArray.strings(): List<String> = (0 until length()).map { getString(it) }
fun industryCatalog(context: Context): List<BusinessIndustry> = parseIndustryCatalog(context.assets.open("industry-catalog.json").bufferedReader().use { it.readText() })
fun parseIndustryCatalog(raw: String): List<BusinessIndustry> {
    val records = JSONArray(raw)
    return (0 until records.length()).map { index ->
        val value = records.getJSONObject(index)
        val labels = value.getJSONObject("labels")
        val workflows = value.getJSONArray("workflows")
        BusinessIndustry(value.getString("id"), value.getString("label"), value.getString("description"), value.optString("group", "Business sectors"), value.getJSONArray("aliases").strings(), value.getJSONArray("recommendedTools").strings(), labels.getString("catalog"), labels.getString("customers"), labels.getString("operations"), (0 until workflows.length()).map { w ->
            val workflow = workflows.getJSONObject(w); val fields = workflow.getJSONArray("fields")
            IndustryWorkflow(workflow.getString("id"), workflow.getString("label"), workflow.getString("singular"), workflow.getString("description"), workflow.getJSONArray("statuses").strings(), workflow.getJSONArray("terminalStatuses").strings(), (0 until fields.length()).map { f ->
                val field = fields.getJSONObject(f)
                IndustryField(field.getString("key"), field.getString("label"), field.getString("type"), field.optBoolean("required"), field.optJSONArray("options")?.strings() ?: emptyList(), field.takeIf { it.has("min") }?.getDouble("min"), field.takeIf { it.has("max") }?.getDouble("max"))
            }, workflow.optString("amountLabel", "Agreed total (KES)"), workflow.optJSONObject("reservation"))
        })
    }
}
fun resolveIndustry(industries: List<BusinessIndustry>, type: String): BusinessIndustry {
    fun normalize(value: String) = value.trim().lowercase().replace(Regex("[^a-z0-9]"), "")
    val key = normalize(type)
    return industries.firstOrNull { industry -> (listOf(industry.id, industry.label) + industry.aliases).any { normalize(it) == key } }
        ?: industries.firstOrNull { it.id == "retail" } ?: industries.first()
}
fun industryFieldError(field: IndustryField, value: String): String? {
    if (value.isBlank()) return if (field.required) "Enter ${field.label.lowercase()}." else null
    if (value.length > 2000) return "${field.label} must be under 2,000 characters."
    return when (field.type) {
        "number" -> {
            val number = value.toDoubleOrNull()
            when { number == null || !number.isFinite() -> "Enter a valid ${field.label.lowercase()}."; field.min != null && number < field.min -> "${field.label} must be at least ${field.min}."; field.max != null && number > field.max -> "${field.label} must be no more than ${field.max}."; else -> null }
        }
        "select" -> if (value !in field.options) "Choose ${field.label.lowercase()}." else null
        "date" -> if (runCatching { LocalDate.parse(value) }.isFailure) "Use YYYY-MM-DD for ${field.label.lowercase()}." else null
        "datetime" -> if (!Regex("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}").matches(value) || runCatching { LocalDateTime.parse(value) }.isFailure) "Use YYYY-MM-DDTHH:mm (Nairobi time) for ${field.label.lowercase()}." else null
        else -> null
    }
}
fun industryRecordInput(industry: BusinessIndustry, workflow: IndustryWorkflow, title: String, customer: String, fields: JSONObject, amount: String, status: String = workflow.statuses.first()): JSONObject {
    val normalizedTitle = requiredInput(title, "a title")
    require(customer.trim().length <= 200) { "Customer or organisation must be under 200 characters." }
    require(status in workflow.statuses) { "Choose a valid status." }
    val normalizedFields = JSONObject()
    workflow.fields.forEach { field -> val value = fields.optString(field.key).trim(); industryFieldError(field, value)?.let { error(it) }; normalizedFields.put(field.key, value) }
    return json("industryId" to industry.id, "workflowId" to workflow.id, "title" to normalizedTitle, "customer" to customer.trim(), "status" to status, "fields" to normalizedFields, "amountMinor" to parseIndustryMinor(amount))
}

fun parseIndustryMinor(value: String): Long {
    require(Regex("\\d{1,11}(\\.\\d{1,2})?").matches(value.trim())) { "Enter a valid KES amount with up to two decimal places." }
    val amount = java.math.BigDecimal(value.trim()).movePointRight(2).longValueExact()
    require(amount in 0..1_000_000_000_000L) { "The amount must be between zero and KES 10 billion." }
    return amount
}
