package com.biashara.app.data

private val personalActions = setOf("branch", "cart", "basket", "clearCart", "hold", "resume", "discard", "preferences", "compareBasket", "shopCart")
private val cashierActions = personalActions + setOf("checkout", "document", "convertDocument", "issueDocument", "payDocument", "openRegister", "cashEntry", "closeRegister", "addCustomer", "payBalance", "placeOrder", "pack", "orderStatus", "orderPaid")
fun roleAllows(role: String, action: String): Boolean {
    if (action in setOf("inviteMember", "updateMember", "removeMember")) return role == "Owner"
    return role == "Owner" || role == "Manager" || (role == "Cashier" && action in cashierActions) || (role == "Viewer" && action in personalActions)
}
fun DemoStore.canPerform(action: String) = !real || roleAllows(backend?.role.orEmpty(), action)
val DemoStore.canSave: Boolean get() = backend?.let { !it.busy && !it.hasPending } ?: !real
fun moneyInput(value: Long): String = java.math.BigDecimal.valueOf(value, 2).toPlainString()
fun wholeInput(value: String, label: String, minimum: Int = 0, maximum: Int = 1_000_000): Int {
    val number = value.trim().toIntOrNull()
    require(number != null && number in minimum..maximum) { "$label must be a whole number from $minimum to $maximum." }
    return number
}
fun requiredInput(value: String, label: String, maximum: Int = 200): String {
    val trimmed = value.trim()
    require(trimmed.isNotEmpty() && trimmed.length <= maximum) { "Enter $label (up to $maximum characters)." }
    return trimmed
}
fun validEmail(value: String): Boolean = Regex("[^\\s@]+@[^\\s@]+\\.[^\\s@]+").matches(value.trim())
