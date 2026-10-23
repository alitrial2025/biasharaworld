@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.biashara.app.ui

import android.content.Context
import android.net.ConnectivityManager
import androidx.compose.foundation.Canvas as DrawCanvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.DialogProperties
import com.biashara.app.data.*
import java.time.LocalDate
import org.json.JSONArray
import org.json.JSONObject

internal data class BusinessFeature(
    val id: Int,
    val slug: String,
    val title: String,
    val detail: String,
    val group: String,
    val icon: ImageVector,
)

internal val businessFeatures =
    listOf(
        BusinessFeature(
            1,
            "scanner",
            "Barcode scanner",
            "A quicker way to find your products.",
            "Selling",
            Icons.Outlined.QrCodeScanner,
        ),
        BusinessFeature(
            2,
            "baskets",
            "Held baskets",
            "A little pause. Nothing lost.",
            "Selling",
            Icons.Outlined.PauseCircle,
        ),
        BusinessFeature(
            3,
            "promotions",
            "Offers & discounts",
            "Good reasons to come back.",
            "Selling",
            Icons.Outlined.LocalOffer,
        ),
        BusinessFeature(
            4,
            "split-payments",
            "Split payments",
            "One basket. Your way to pay.",
            "Selling",
            Icons.Outlined.CreditCard,
        ),
        BusinessFeature(
            5,
            "returns",
            "Returns & refunds",
            "A fair return. A clear record.",
            "Selling",
            Icons.Outlined.AssignmentReturn,
        ),
        BusinessFeature(
            6,
            "documents",
            "Quotes & invoices",
            "Give every agreement a place.",
            "Selling",
            Icons.Outlined.Description,
        ),
        BusinessFeature(
            7,
            "register",
            "Daily cash register",
            "Close the day with clarity.",
            "Selling",
            Icons.Outlined.Payments,
        ),
        BusinessFeature(
            8,
            "stocktakes",
            "Stocktaking",
            "Every shelf. Every little difference.",
            "Stock",
            Icons.Outlined.FactCheck,
        ),
        BusinessFeature(
            9,
            "expiry",
            "Batches & expiry",
            "Fresh stock. Fewer surprises.",
            "Stock",
            Icons.Outlined.EventAvailable,
        ),
        BusinessFeature(
            10,
            "variants",
            "Variants & bundles",
            "Every size. Every useful combination.",
            "Stock",
            Icons.Outlined.Layers,
        ),
        BusinessFeature(
            11,
            "movements",
            "Stock movements",
            "The story behind your shelves.",
            "Stock",
            Icons.Outlined.SwapVert,
        ),
        BusinessFeature(
            12,
            "transfers",
            "Branch transfers",
            "The right stock, in the right shop.",
            "Stock",
            Icons.Outlined.LocalShipping,
        ),
        BusinessFeature(
            13,
            "compare",
            "Compare suppliers",
            "A little comparison goes a long way.",
            "Growth",
            Icons.Outlined.CompareArrows,
        ),
        BusinessFeature(
            14,
            "deliveries",
            "Customer deliveries",
            "From your shelf to their doorstep.",
            "Growth",
            Icons.Outlined.DeliveryDining,
        ),
        BusinessFeature(
            15,
            "loyalty",
            "Customer loyalty",
            "Good customers. Little thank-yous.",
            "Growth",
            Icons.Outlined.CardGiftcard,
        ),
        BusinessFeature(
            16,
            "branches",
            "Your branches",
            "More places to grow.",
            "Growth",
            Icons.Outlined.Storefront,
        ),
        BusinessFeature(
            17,
            "online-shop",
            "Your online shop",
            "Your neighbourhood shop, online.",
            "Growth",
            Icons.Outlined.ShoppingBag,
        ),
        BusinessFeature(
            18,
            "customer-portal",
            "Customer portal",
            "A clearer view from their side.",
            "Growth",
            Icons.Outlined.AccountCircle,
        ),
        BusinessFeature(
            19,
            "sync",
            "Connection & saved work",
            "A little reassurance, wherever you work.",
            "Your space",
            Icons.Outlined.Sync,
        ),
        BusinessFeature(
            20,
            "preferences",
            "Language & appearance",
            "Your language. Your light. Your pace.",
            "Your space",
            Icons.Outlined.Tune,
        ),
    )

@Composable
fun ToolsHubScreen(store: DemoStore, onBack: () -> Unit, onOpen: (String) -> Unit) {
    var group by rememberSaveable { mutableStateOf("All tools") }
    Page {
        PageTitle(
            "Room for your next step.",
            "Twenty useful tools for your everyday business.",
            onBack,
        )
        SurfaceCard(color = Mint) {
            Eyebrow("A little more possible", Green)
            AppText(
                "Your business, growing.",
                style = MaterialTheme.typography.headlineMedium,
                modifier = Modifier.padding(top = 10.dp),
            )
            AppText(
                "Familiar tools. Fresh possibilities. Explore one little step at a time.",
                fontSize = 13.sp,
                color = Muted,
                modifier = Modifier.padding(top = 10.dp),
            )
            TextButton(onClick = { onOpen("branches") }) {
                AppText(store.operations.branchName, color = Green)
                AppIcon(Icons.Outlined.ExpandMore, null, Modifier.size(18.dp), tint = Green)
            }
        }
        FilterPills(
            listOf("All tools", "Selling", "Stock", "Growth", "Your space"),
            group,
            { group = it },
        )
        businessFeatures
            .filter { group == "All tools" || it.group == group }
            .forEach { f ->
                SurfaceCard(Modifier.clickable { onOpen(f.slug) }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconTile(
                            f.icon,
                            Green,
                            if (f.group == "Selling") Mint
                            else if (f.group == "Stock") BlueMist else Lavender,
                        )
                        Column(Modifier.weight(1f).padding(start = 13.dp)) {
                            AppText(f.title, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                            AppText(
                                f.detail,
                                fontSize = 11.sp,
                                color = Muted,
                                modifier = Modifier.padding(top = 5.dp),
                            )
                        }
                        AppText(f.id.toString().padStart(2, '0'), fontSize = 11.sp, color = Muted)
                    }
                }
            }
    }
}

private data class ToolField(
    val key: String,
    val label: String,
    val value: String = "",
    val options: List<Pair<String, String>> = emptyList(),
    val numeric: Boolean = false,
)

private data class ToolForm(
    val title: String,
    val description: String = "",
    val fields: List<ToolField>,
    val confirm: String = "Save",
    val submit: (Map<String, String>) -> Boolean,
)

@Composable
private fun FormDialog(form: ToolForm, errorProvider: () -> String, onClose: () -> Unit) {
    val values =
        remember(form) {
            mutableStateMapOf<String, String>().apply {
                form.fields.forEach {
                    put(it.key, it.value.ifBlank { it.options.firstOrNull()?.first ?: "" })
                }
            }
        }
    var error by remember(form) { mutableStateOf("") }
    AlertDialog(
        modifier = Modifier.fillMaxWidth(0.92f).widthIn(max = 560.dp),
        properties = DialogProperties(usePlatformDefaultWidth = false),
        onDismissRequest = onClose,
        containerColor = Surface,
        title = {
            AppText(
                form.title,
                fontSize = 22.sp,
                fontFamily = HeadingFont,
                fontWeight = FontWeight.Bold,
            )
        },
        text = {
            Column(
                Modifier.heightIn(max = 490.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                if (form.description.isNotBlank())
                    AppText(form.description, fontSize = 12.sp, color = Muted)
                form.fields.forEach { field ->
                    if (field.options.isEmpty())
                        Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                            AppText(field.label, fontSize = 12.sp, color = Muted)
                            BasicTextField(
                                value = values[field.key] ?: "",
                                onValueChange = {
                                    values[field.key] = it
                                    error = ""
                                },
                                modifier =
                                    Modifier.fillMaxWidth()
                                        .semantics { contentDescription = tr(field.label) }
                                        .border(1.dp, Line, RoundedCornerShape(12.dp))
                                        .background(Canvas, RoundedCornerShape(12.dp))
                                        .padding(15.dp),
                                singleLine = true,
                                textStyle =
                                    TextStyle(color = Ink, fontSize = 15.sp, fontFamily = AppFont),
                                cursorBrush = SolidColor(Green),
                                keyboardOptions =
                                    KeyboardOptions(
                                        keyboardType =
                                            if (field.numeric) KeyboardType.Decimal
                                            else KeyboardType.Text
                                    ),
                            )
                        }
                    else
                        ToolSelect(
                            field.label,
                            values[field.key] ?: "",
                            field.options,
                            { values[field.key] = it },
                        )
                }
                if (error.isNotEmpty())
                    AppText(errorProvider().ifBlank { error }, color = Coral, fontSize = 12.sp)
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    try {
                        if (form.submit(values.toMap())) onClose()
                        else
                            error =
                                errorProvider().ifBlank {
                                    "Please review the action and try again."
                                }
                    } catch (e: Exception) {
                        error = e.message ?: "Check your entries."
                    }
                }
            ) {
                AppText(form.confirm, color = Green, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = { TextButton(onClick = onClose) { AppText("Cancel", color = Muted) } },
    )
}

@Composable
private fun ToolSelect(
    label: String,
    value: String,
    options: List<Pair<String, String>>,
    onChange: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    Column {
        AppText(label, fontSize = 11.sp, color = Muted, modifier = Modifier.padding(bottom = 7.dp))
        Box {
            Row(
                Modifier.fillMaxWidth()
                    .border(1.dp, Line, RoundedCornerShape(12.dp))
                    .background(Surface, RoundedCornerShape(12.dp))
                    .clickable { expanded = true }
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AppText(
                    options.firstOrNull { it.first == value }?.second ?: value,
                    fontSize = 13.sp,
                    modifier = Modifier.weight(1f),
                )
                AppIcon(Icons.Outlined.ExpandMore, null, Modifier.size(19.dp), tint = Muted)
            }
            DropdownMenu(
                expanded,
                onDismissRequest = { expanded = false },
                modifier = Modifier.heightIn(max = 300.dp).background(Surface),
            ) {
                options.forEach { (id, title) ->
                    DropdownMenuItem(
                        text = { AppText(title, fontSize = 13.sp) },
                        onClick = {
                            onChange(id)
                            expanded = false
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun StatusLabel(text: String, tone: Color = Green) {
    Box(
        Modifier.background(tone.copy(alpha = .12f), RoundedCornerShape(7.dp))
            .padding(horizontal = 10.dp, vertical = 6.dp)
    ) {
        AppText(text, fontSize = 10.sp, color = tone, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun RecordCard(
    title: String,
    description: String = "",
    tone: Color = Surface,
    content: @Composable ColumnScope.() -> Unit = {},
) {
    SurfaceCard(color = tone) {
        AppText(title, fontSize = 17.sp, fontFamily = HeadingFont, fontWeight = FontWeight.Bold)
        if (description.isNotBlank())
            AppText(
                description,
                fontSize = 12.sp,
                color = Muted,
                modifier = Modifier.padding(top = 8.dp),
            )
        Column(
            Modifier.padding(top = 14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            content = content,
        )
    }
}

@Composable
private fun ActionRow(vararg actions: Pair<String, () -> Unit>) {
    Row(
        Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        actions.forEach { (label, action) ->
            OutlinedButton(onClick = action, shape = RoundedCornerShape(10.dp)) {
                AppText(label, fontSize = 12.sp, color = Green)
            }
        }
    }
}

@Composable
private fun BarcodePreview(code: String) {
    val bars = barcodeBars(code)
    Column(
        Modifier.fillMaxWidth().background(Color.White, RoundedCornerShape(9.dp)).padding(15.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        DrawCanvas(Modifier.width(230.dp).height(72.dp)) {
            val unit = size.width / 115
            bars.forEachIndexed { i, c ->
                if (c == '1')
                    drawRect(
                        Color(0xFF17242F),
                        Offset((i + 10) * unit, 0f),
                        Size(
                            unit,
                            if (i < 3 || i > 91 || i in 45..49) size.height else size.height * .87f,
                        ),
                    )
            }
        }
        AppText(code, color = Color(0xFF17242F), fontSize = 12.sp, letterSpacing = 1.sp)
    }
}

@Composable
fun FeatureScreen(store: DemoStore, slug: String, onBack: () -> Unit, onOpen: (String) -> Unit) {
    val ops = store.operations
    val o = ops.state
    val context = LocalContext.current
    val feature = businessFeatures.firstOrNull { it.slug == slug }
    var form by remember { mutableStateOf<ToolForm?>(null) }
    var feedback by remember { mutableStateOf("") }
    var failed by remember { mutableStateOf(false) }
    var query by rememberSaveable { mutableStateOf("") }
    var selected by rememberSaveable { mutableIntStateOf(0) }
    var tab by rememberSaveable { mutableStateOf("All") }
    var found by rememberSaveable { mutableIntStateOf(0) }
    fun run(action: String, values: Map<String, String> = emptyMap()): Boolean {
        if (
            store.real &&
                action !in listOf("cart", "basket", "clearCart", "compareBasket", "shopCart")
        ) {
            feedback = "Saving to your business…"
            failed = false
            store.backend?.perform(action, values) {
                feedback = "Saved to your business."
                failed = false
                form = null
                if (action in listOf("checkout", "startCount")) selected = ops.lastId
            }
            return false
        }
        try {
            feedback = ops.command(action, values)
            failed = false
            return true
        } catch (e: Exception) {
            feedback = e.message ?: "Please review your entries."
            failed = true
            return false
        }
    }
    fun ask(
        action: String,
        title: String,
        fields: List<ToolField>,
        extra: Map<String, String> = emptyMap(),
        confirm: String = "Save",
        description: String = "",
    ) {
        form =
            ToolForm(title, description, fields, confirm) { values -> run(action, extra + values) }
    }
    LaunchedEffect(store.backend?.error) {
        if (store.backend?.error?.isNotBlank() == true) {
            feedback = store.backend!!.error
            failed = true
        }
    }
    val products = store.products.toList()
    val productOptions =
        products
            .filter { it.components.isEmpty() }
            .map { it.id.toString() to "${it.name} · ${it.detail.substringBefore(" ·")}" }
    val branchOptions = o.records("branches").map { it.optString("id") to it.optString("name") }
    val namedCustomers = store.customers.map { it.name to it.name }
    fun qtyField(value: String = "1") = ToolField("quantity", "Quantity", value, numeric = true)
    val price =
        runCatching { ops.price() }
            .getOrElse { json("total" to 0, "discount" to 0, "lines" to JSONArray()) }
    val customer = o.optString("customer", "Walk-in customer")
    Page {
        PageTitle(
            feature?.title ?: if (slug == "storefront") "Your shop" else "Customer preview",
            feature?.detail,
            onBack,
        )
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            StatusLabel("Local UI preview")
            TextButton(onClick = { onOpen("branches") }) {
                AppText(ops.branchName, fontSize = 11.sp, color = Green)
                AppIcon(Icons.Outlined.ExpandMore, null, Modifier.size(17.dp), tint = Green)
            }
        }
        if (ops.storageWarning.isNotBlank())
            RecordCard("Device storage", ops.storageWarning, RoseMist)
        if (feedback.isNotBlank())
            SurfaceCard(color = if (failed) RoseMist else Mint) {
                AppText(feedback, fontSize = 12.sp, color = if (failed) Coral else Green)
            }
        when (slug) {
            "scanner" -> {
                SurfaceCard(color = Ink) {
                    Column(
                        Modifier.fillMaxWidth().padding(vertical = 25.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(13.dp),
                    ) {
                        AppIcon(
                            Icons.Outlined.QrCodeScanner,
                            null,
                            Modifier.size(72.dp),
                            tint = Color(0xFFB6DCC5),
                        )
                        AppText(
                            "Place a barcode inside the frame",
                            fontSize = 13.sp,
                            color = Color.White,
                        )
                        AppText(
                            "Use a barcode or keyboard scanner. Camera scanning is coming later.",
                            fontSize = 10.sp,
                            color = Color(0xFFBED4C6),
                        )
                    }
                }
                OutlinedTextField(
                    query,
                    { query = it },
                    label = { AppText("Barcode or SKU") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                )
                PrimaryButton(
                    "Find product",
                    {
                        val p =
                            products.firstOrNull {
                                it.barcode == query.trim() || it.sku.equals(query.trim(), true)
                            }
                        found = p?.id ?: 0
                        feedback =
                            if (p == null)
                                "No product matches this code. Try a SKU or search your catalogue."
                            else "Product found."
                        failed = p == null
                    },
                    tone = Green,
                )
                ActionRow("Open checkout" to { onOpen("checkout") })
                products
                    .firstOrNull { it.id == found }
                    ?.let { p ->
                        RecordCard(p.name, "${p.detail} · ${minorMoney(p.priceMinor)}", Mint) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                ProductArt(p.art)
                                AppText(
                                    "${ops.available(p.id)} available",
                                    fontSize = 13.sp,
                                    modifier = Modifier.padding(start = 15.dp),
                                )
                            }
                            BarcodePreview(p.barcode)
                            PrimaryButton(
                                "Add to basket",
                                {
                                    run(
                                        "cart",
                                        mapOf(
                                            "product" to p.id.toString(),
                                            "quantity" to ((store.cart[p.id] ?: 0) + 1).toString(),
                                        ),
                                    )
                                },
                                enabled = ops.available(p.id) > 0,
                                tone = Green,
                            )
                            ActionRow(
                                "Edit barcode" to
                                    {
                                        ask(
                                            "barcode",
                                            "Keep your labels clear.",
                                            listOf(ToolField("code", "EAN-13 barcode", p.barcode)),
                                            mapOf("id" to p.id.toString()),
                                        )
                                    },
                                "Print label / PDF" to
                                    {
                                        printDemo(
                                            context,
                                            "Product label",
                                            listOf(
                                                p.name,
                                                p.detail,
                                                minorMoney(p.priceMinor),
                                                p.barcode,
                                            ),
                                        )
                                    },
                            )
                        }
                    }
                Eyebrow("Your shelf labels")
                products.forEach { p ->
                    RecordCard(p.name, "${p.sku} · ${minorMoney(p.priceMinor)}") {
                        BarcodePreview(p.barcode)
                    }
                }
            }
            "baskets" -> {
                RecordCard(
                    "A little space for later.",
                    "Holding a sale saves its customer, quantities and offers without changing stock.",
                    Mint,
                ) {
                    AppText(
                        "${store.itemCount} items in current basket · ${minorMoney(price.optLong("total"))}",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                    PrimaryButton(
                        "Hold this sale",
                        {
                            ask(
                                "hold",
                                "Save a little space for later.",
                                listOf(ToolField("name", "Basket name", "A sale for later")),
                                confirm = "Hold basket",
                            )
                        },
                        enabled = store.itemCount > 0,
                        tone = Green,
                    )
                    ActionRow("Open checkout" to { onOpen("checkout") })
                }
                val held =
                    o.records("held").filter { it.optString("branch", ops.branch) == ops.branch }
                if (held.isEmpty())
                    EmptyState(
                        "A little room for later.",
                        "Parked baskets will be waiting here.",
                        Icons.Outlined.PauseCircle,
                    )
                held.forEach { b ->
                    RecordCard(
                        b.optString("name"),
                        "${b.optString("customer")} · ${b.ints("cart").values.sum()} items",
                    ) {
                        StatusLabel("Held · stock unchanged", Amber)
                        ActionRow(
                            "Resume basket" to
                                {
                                    run("resume", mapOf("id" to b.optInt("id").toString()))
                                },
                            "Discard" to
                                {
                                    ask(
                                        "discard",
                                        "Discard this parked basket?",
                                        emptyList(),
                                        mapOf("id" to b.optInt("id").toString()),
                                        "Discard",
                                        "This removes the local draft without changing stock.",
                                    )
                                },
                        )
                    }
                }
            }
            "promotions" -> {
                PrimaryButton(
                    "Create promotion",
                    {
                        ask(
                            "promotion",
                            "A little offer, thoughtfully made.",
                            listOf(
                                ToolField("name", "Offer name"),
                                ToolField("percent", "Percentage off", "5", numeric = true),
                                ToolField(
                                    "ends",
                                    "Offer ends (YYYY-MM-DD)",
                                    LocalDate.now().plusDays(7).toString(),
                                ),
                                ToolField(
                                    "product",
                                    "Eligible product",
                                    "all",
                                    listOf("all" to "All products") + productOptions,
                                ),
                            ),
                            confirm = "Create offer",
                        )
                    },
                    tone = Green,
                )
                RecordCard(
                    "Review your checkout offer.",
                    "Choose a named customer to earn or redeem reward points.",
                ) {
                    PrimaryButton(
                        "Discounts & rewards",
                        {
                            ask(
                                "basket",
                                "A little thank-you at checkout.",
                                listOf(
                                    ToolField(
                                        "customer",
                                        "Customer",
                                        customer,
                                        listOf("Walk-in customer" to "Walk-in customer") +
                                            namedCustomers,
                                    ),
                                    ToolField(
                                        "discountKind",
                                        "Discount type",
                                        o.optString("discountKind"),
                                        listOf("percent" to "Percentage", "fixed" to "Amount (KES)"),
                                    ),
                                    ToolField(
                                        "discount",
                                        "Discount value",
                                        if (o.optString("discountKind") == "fixed")
                                            (o.optLong("discount") / 100.0).toString()
                                        else o.optLong("discount").toString(),
                                        numeric = true,
                                    ),
                                    ToolField(
                                        "promotion",
                                        "Promotion",
                                        o.optString("promotion"),
                                        listOf("" to "No promotion") +
                                            o.records("promotions").map {
                                                it.optInt("id").toString() to
                                                    "${it.optString("name")} · ${it.optInt("percent")}%"
                                            },
                                    ),
                                    ToolField(
                                        "redeem",
                                        "Reward points to redeem",
                                        "${o.optInt("redeem")}",
                                        numeric = true,
                                    ),
                                ),
                                confirm = "Apply to basket",
                            )
                        },
                    )
                    AppText(
                        "Current total: ${minorMoney(price.optLong("total"))}",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                o.records("promotions").forEach { p ->
                    RecordCard(
                        p.optString("name"),
                        "Ends ${p.optString("ends")} · ${if(p.isNull("productId"))"All products" else products.firstOrNull{it.id==p.optInt("productId")}?.name}",
                        Sand,
                    ) {
                        AppText(
                            "${p.optInt("percent")}% off",
                            fontSize = 30.sp,
                            fontFamily = HeadingFont,
                            fontWeight = FontWeight.Bold,
                            color = Amber,
                        )
                        StatusLabel(
                            if (p.optString("ends") >= todayLocal()) "Available" else "Expired",
                            Amber,
                        )
                    }
                }
            }
            "split-payments" -> {
                RecordCard(
                    "One basket. Your way to pay.",
                    "Build your basket in New sale, then divide the exact amount across methods.",
                    BlueMist,
                ) {
                    AppText(
                        minorMoney(price.optLong("total")),
                        fontSize = 32.sp,
                        fontFamily = HeadingFont,
                        fontWeight = FontWeight.Bold,
                    )
                    AppText(
                        "${store.itemCount} items · ${customer}",
                        fontSize = 12.sp,
                        color = Muted,
                    )
                    price.records("lines").forEach { line ->
                        Row(Modifier.fillMaxWidth()) {
                            AppText(
                                "${line.optInt("quantity")} × ${line.optString("name")}",
                                fontSize = 12.sp,
                                modifier = Modifier.weight(1f),
                            )
                            AppText(
                                minorMoney(line.optLong("net")),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                    PrimaryButton(
                        "Split & record sale",
                        {
                            form =
                                ToolForm(
                                    "Every little portion, accounted for.",
                                    "Portions must equal ${minorMoney(price.optLong("total"))}. No money is collected.",
                                    listOf(
                                        ToolField(
                                            "mpesa",
                                            "M-Pesa portion (KES)",
                                            (price.optLong("total") / 100.0).toString(),
                                            numeric = true,
                                        ),
                                        ToolField(
                                            "cash",
                                            "Cash portion (KES)",
                                            "0",
                                            numeric = true,
                                        ),
                                        ToolField("card", "Card portion (KES)", "0", numeric = true),
                                    ),
                                    "Record sale",
                                ) { values ->
                                    if (run("checkout", values + mapOf("split" to "true"))) {
                                        selected = ops.lastId
                                        true
                                    } else false
                                }
                        },
                        enabled = store.itemCount > 0,
                        tone = Green,
                    )
                    ActionRow(
                        "Add products" to { onOpen("checkout") },
                        "Discounts & rewards" to { onOpen("promotions") },
                    )
                }
                o.records("receipts")
                    .firstOrNull { it.optInt("id") == selected }
                    ?.let { ReceiptCard(it, context) }
            }
            "returns" -> {
                RecordCard(
                    "Start with the original receipt.",
                    "Legacy receipts without line details remain in Sales. Detailed receipts support item-level returns.",
                )
                o.records("receipts")
                    .filter { it.optString("branch") == ops.branch }
                    .forEach { r ->
                        RecordCard(
                            "Receipt #${r.optInt("id")}",
                            "${r.optString("customer")} · ${minorMoney(r.optLong("total"))}",
                        ) {
                            r.records("lines").forEach { line ->
                                AppText(
                                    "${line.optString("name")} · ${line.optInt("quantity")-r.objectAt("returned").optInt(line.optInt("productId").toString())} eligible",
                                    fontSize = 12.sp,
                                )
                            }
                            PrimaryButton(
                                "Record a return",
                                {
                                    ask(
                                        "return",
                                        "A fair return. A clear record.",
                                        listOf(
                                            ToolField(
                                                "product",
                                                "Product",
                                                r.records("lines")
                                                    .first()
                                                    .optInt("productId")
                                                    .toString(),
                                                r.records("lines").map {
                                                    it.optInt("productId").toString() to
                                                        it.optString("name")
                                                },
                                            ),
                                            qtyField(),
                                            ToolField("reason", "Reason for return"),
                                            ToolField(
                                                "restock",
                                                "Return to sellable stock?",
                                                "true",
                                                listOf(
                                                    "true" to "Yes · undamaged goods",
                                                    "false" to "No · damaged or unsuitable",
                                                ),
                                            ),
                                        ),
                                        mapOf("id" to r.optInt("id").toString()),
                                        "Record refund",
                                        "Original net prices and payment portions are used. No money is sent.",
                                    )
                                },
                                tone = Green,
                            )
                        }
                    }
                Eyebrow("Return history")
                if (o.records("returns").isEmpty())
                    EmptyState(
                        "A fresh page for returns.",
                        "Recorded refunds and stock decisions appear here.",
                    )
                o.records("returns").forEach { r ->
                    RecordCard(
                        "${minorMoney(r.optLong("amount"))} · Receipt #${r.optInt("saleId")}",
                        "${r.optInt("quantity")} units · ${r.optString("reason")}",
                        RoseMist,
                    ) {
                        StatusLabel(
                            if (r.optBoolean("restock")) "Restocked" else "Not restocked",
                            Coral,
                        )
                    }
                }
            }
            "documents" -> {
                RecordCard(
                    "Your next agreement starts here.",
                    "Use the current basket and a named customer. Draft documents do not change stock.",
                    BlueMist,
                ) {
                    ToolSelect(
                        "Customer",
                        customer,
                        listOf("Walk-in customer" to "Walk-in customer") + namedCustomers,
                    ) {
                        run("basket", mapOf("customer" to it, "redeem" to "0"))
                    }
                    PrimaryButton(
                        "Create a document",
                        {
                            ask(
                                "document",
                                "Give this agreement a place.",
                                listOf(
                                    ToolField(
                                        "kind",
                                        "Document type",
                                        "Quotation",
                                        listOf("Quotation" to "Quotation", "Invoice" to "Invoice"),
                                    ),
                                    ToolField(
                                        "due",
                                        "Due date (YYYY-MM-DD)",
                                        LocalDate.now().plusDays(7).toString(),
                                    ),
                                ),
                                confirm = "Save draft",
                            )
                        },
                        enabled = store.itemCount > 0,
                        tone = Green,
                    )
                    ActionRow("Add products" to { onOpen("checkout") })
                }
                if (o.records("documents").isEmpty())
                    EmptyState(
                        "A clear page for your next agreement.",
                        "Quotations and invoices will appear here.",
                    )
                o.records("documents")
                    .filter { it.optString("branch") == ops.branch }
                    .forEach { d ->
                        RecordCard(
                            "${d.optString("kind")} #${kotlin.math.abs(d.optInt("id"))}",
                            "${d.optString("customer")} · Due ${d.optString("due")}",
                        ) {
                            AppText(
                                minorMoney(d.optLong("total")),
                                fontSize = 25.sp,
                                fontWeight = FontWeight.Bold,
                            )
                            StatusLabel(d.optString("status"))
                            d.records("lines").forEach { line ->
                                AppText(
                                    "${line.optInt("quantity")} × ${line.optString("name")} · ${minorMoney(line.optLong("net"))}",
                                    fontSize = 12.sp,
                                )
                            }
                            ActionRow(
                                "Print / save PDF" to
                                    {
                                        printDemo(
                                            context,
                                            d.optString("kind"),
                                            listOf(
                                                "${d.optString("kind")} #${d.optInt("id")}",
                                                d.optString("customer"),
                                                "Due ${d.optString("due")}",
                                            ) +
                                                d.records("lines").map {
                                                    "${it.optInt("quantity")} × ${it.optString("name")}  ${minorMoney(it.optLong("net"))}"
                                                } +
                                                listOf(
                                                    "Total ${minorMoney(d.optLong("total"))}",
                                                    "UI preview · not an official tax document",
                                                ),
                                        )
                                    }
                            )
                            if (d.optString("kind") == "Quotation")
                                ActionRow(
                                    "Convert to invoice" to
                                        {
                                            run(
                                                "convertDocument",
                                                mapOf("id" to d.optInt("id").toString()),
                                            )
                                        }
                                )
                            if (d.optString("status") == "Draft")
                                ActionRow(
                                    "Mark issued" to
                                        {
                                            run(
                                                "issueDocument",
                                                mapOf("id" to d.optInt("id").toString()),
                                            )
                                        }
                                )
                            if (
                                d.optString("kind") == "Invoice" &&
                                    d.optString("status") != "Paid locally"
                            )
                                PrimaryButton(
                                    "Record cash payment",
                                    {
                                        run("payDocument", mapOf("id" to d.optInt("id").toString()))
                                    },
                                    tone = Green,
                                )
                        }
                    }
            }
            "register" -> {
                val current =
                    o.records("registers").firstOrNull {
                        it.optString("branch") == ops.branch && it.optString("status") == "Open"
                    }
                if (current == null)
                    RecordCard(
                        "A clear beginning for the day.",
                        "Set the opening float for this branch.",
                        Mint,
                    ) {
                        PrimaryButton(
                            "Open cash register",
                            {
                                ask(
                                    "openRegister",
                                    "A clear beginning.",
                                    listOf(
                                        ToolField(
                                            "amount",
                                            "Opening float (KES)",
                                            "1000",
                                            numeric = true,
                                        )
                                    ),
                                    confirm = "Open register",
                                )
                            },
                            tone = Green,
                        )
                    }
                else {
                    val expected =
                        current.optLong("opening") +
                            current.records("entries").sumOf { it.optLong("amount") }
                    RecordCard("Your register is open.", "Expected cash in the drawer", Mint) {
                        AppText(
                            minorMoney(expected),
                            fontSize = 35.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = HeadingFont,
                        )
                        AppText(
                            "Opening float ${minorMoney(current.optLong("opening"))}",
                            fontSize = 12.sp,
                            color = Muted,
                        )
                        ActionRow(
                            "Cash in / out" to
                                {
                                    ask(
                                        "cashEntry",
                                        "Give this cash movement a reason.",
                                        listOf(
                                            ToolField(
                                                "direction",
                                                "Direction",
                                                "in",
                                                listOf("in" to "Cash in", "out" to "Cash out"),
                                            ),
                                            ToolField("amount", "Amount (KES)", numeric = true),
                                            ToolField("reason", "Reason"),
                                        ),
                                    )
                                },
                            "Close register" to
                                {
                                    ask(
                                        "closeRegister",
                                        "A clear count to close the day.",
                                        listOf(
                                            ToolField(
                                                "amount",
                                                "Cash counted (KES)",
                                                (expected / 100.0).toString(),
                                                numeric = true,
                                            )
                                        ),
                                        confirm = "Close & reconcile",
                                    )
                                },
                        )
                    }
                }
                o.records("registers")
                    .filter { it.optString("branch") == ops.branch }
                    .forEach { r ->
                        RecordCard(
                            "Session #${r.optInt("id")}",
                            "Opening ${minorMoney(r.optLong("opening"))}",
                        ) {
                            StatusLabel(r.optString("status"))
                            if (r.optString("status") == "Closed") {
                                AppText(
                                    "Expected ${minorMoney(r.optLong("expected"))}\nCounted ${minorMoney(r.optLong("counted"))}",
                                    fontSize = 13.sp,
                                )
                                StatusLabel(
                                    "Variance ${minorMoney(r.optLong("counted")-r.optLong("expected"))}",
                                    Amber,
                                )
                            }
                            r.records("entries").forEach { entry ->
                                Row(Modifier.fillMaxWidth()) {
                                    AppText(
                                        entry.optString("label"),
                                        fontSize = 12.sp,
                                        modifier = Modifier.weight(1f),
                                    )
                                    AppText(
                                        minorMoney(entry.optLong("amount")),
                                        fontSize = 12.sp,
                                        color = if (entry.optLong("amount") < 0) Coral else Green,
                                    )
                                }
                            }
                        }
                    }
            }
            "stocktakes" -> {
                PrimaryButton(
                    "Start stocktake",
                    {
                        form =
                            ToolForm(
                                "A little time with your shelves.",
                                fields = listOf(ToolField("name", "Count name", "Shelf count")),
                                confirm = "Start count",
                            ) { values ->
                                if (run("startCount", values)) {
                                    selected = ops.lastId
                                    true
                                } else false
                            }
                    },
                    tone = Green,
                )
                o.records("counts")
                    .filter { it.optString("branch") == ops.branch }
                    .forEach { c ->
                        SurfaceCard(
                            Modifier.clickable { selected = c.optInt("id") },
                            color = if (selected == c.optInt("id")) Mint else Surface,
                        ) {
                            AppText(
                                c.optString("name"),
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                            )
                            AppText(
                                "${c.ints("counted").size} products counted · ${c.optString("status")}",
                                fontSize = 11.sp,
                                color = Muted,
                                modifier = Modifier.padding(top = 6.dp),
                            )
                        }
                    }
                o.records("counts")
                    .firstOrNull {
                        it.optInt("id") == selected && it.optString("branch") == ops.branch
                    }
                    ?.let { c ->
                        Eyebrow("${c.optString("name")} · ${c.optString("status")}")
                        products
                            .filter { it.components.isEmpty() }
                            .forEach { p ->
                                RecordCard(
                                    p.name,
                                    "Starting ${c.objectAt("starting").optInt(p.id.toString())} · Current ${p.stock}",
                                ) {
                                    val counted = c.objectAt("counted")
                                    AppText(
                                        if (counted.has(p.id.toString()))
                                            "Counted ${counted.optInt(p.id.toString())} · Difference ${counted.optInt(p.id.toString())-c.objectAt("starting").optInt(p.id.toString())}"
                                        else "Not counted",
                                        fontSize = 13.sp,
                                    )
                                    if (c.optString("status") == "Draft")
                                        TextButton(
                                            onClick = {
                                                ask(
                                                    "count",
                                                    "Count ${p.name}",
                                                    listOf(
                                                        qtyField(
                                                            if (counted.has(p.id.toString()))
                                                                counted
                                                                    .optInt(p.id.toString())
                                                                    .toString()
                                                            else p.stock.toString()
                                                        )
                                                    ),
                                                    mapOf(
                                                        "id" to c.optInt("id").toString(),
                                                        "product" to p.id.toString(),
                                                    ),
                                                )
                                            }
                                        ) {
                                            AppText("Enter quantity", color = Green)
                                        }
                                }
                            }
                        if (c.optString("status") == "Draft") {
                            PrimaryButton(
                                "Review & finalise count",
                                {
                                    ask(
                                        "finaliseCount",
                                        "Give this stock adjustment a reason.",
                                        listOf(ToolField("reason", "Adjustment reason")),
                                        mapOf("id" to c.optInt("id").toString()),
                                        "Finalise count",
                                    )
                                },
                                tone = Green,
                            )
                            ActionRow(
                                "Refresh starting stock" to
                                    {
                                        run(
                                            "refreshCount",
                                            mapOf("id" to c.optInt("id").toString()),
                                        )
                                    }
                            )
                        }
                    }
            }
            "expiry" -> {
                PrimaryButton(
                    "Receive a batch",
                    {
                        ask(
                            "batch",
                            "A fresh batch for your shelves.",
                            listOf(
                                ToolField(
                                    "product",
                                    "Product",
                                    productOptions.firstOrNull()?.first ?: "1",
                                    productOptions,
                                ),
                                ToolField("code", "Batch code"),
                                qtyField(),
                                ToolField(
                                    "expires",
                                    "Expiry date (YYYY-MM-DD)",
                                    LocalDate.now().plusDays(30).toString(),
                                ),
                            ),
                            confirm = "Receive batch",
                        )
                    },
                    tone = Green,
                )
                FilterPills(listOf("All", "Expiring soon", "Expired"), tab, { tab = it })
                val batches =
                    o.records("batches").filter {
                        it.optString("branch") == ops.branch &&
                            it.optInt("quantity") > 0 &&
                            (tab == "All" ||
                                if (tab == "Expired") it.optString("expires") < todayLocal()
                                else
                                    it.optString("expires") in
                                        todayLocal()..LocalDate.now().plusDays(14).toString())
                    }
                if (batches.isEmpty())
                    EmptyState("A clear view of your fresh stock.", "No batches match this filter.")
                batches.forEach { b ->
                    val p = products.firstOrNull { it.id == b.optInt("productId") }
                    val expired = b.optString("expires") < todayLocal()
                    RecordCard(
                        p?.name ?: "Product",
                        "Batch ${b.optString("code")} · ${b.optInt("quantity")} units",
                        if (expired) RoseMist else Sand,
                    ) {
                        AppText(
                            "Expires ${b.optString("expires")}",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                        )
                        StatusLabel(
                            if (expired) "Expired · not sellable" else "Fresh stock",
                            if (expired) Coral else Amber,
                        )
                        ActionRow(
                            "Record write-off" to
                                {
                                    ask(
                                        "writeOff",
                                        "Give this stock change a reason.",
                                        listOf(ToolField("reason", "Write-off reason")),
                                        mapOf("id" to b.optInt("id").toString()),
                                        "Write off batch",
                                        "Remaining units in this batch will be removed from local stock.",
                                    )
                                }
                        )
                    }
                }
            }
            "variants" -> {
                FilterPills(listOf("All", "Variants", "Bundles"), tab, { tab = it })
                ActionRow(
                    "Add variant" to
                        {
                            ask(
                                "variant",
                                "Make room for another size.",
                                listOf(
                                    ToolField(
                                        "parent",
                                        "Parent product",
                                        productOptions.firstOrNull()?.first ?: "1",
                                        productOptions,
                                    ),
                                    ToolField("name", "Variant name"),
                                    ToolField("size", "Pack size"),
                                    ToolField("sku", "Unique SKU"),
                                    ToolField("price", "Selling price (KES)", numeric = true),
                                    ToolField("stock", "Opening stock", "0", numeric = true),
                                ),
                                confirm = "Save variant",
                            )
                        },
                    "Build bundle" to
                        {
                            form =
                                ToolForm(
                                    "A useful little combination.",
                                    "Choose at least two individual products.",
                                    listOf(
                                        ToolField("name", "Bundle name"),
                                        ToolField("price", "Bundle price (KES)", numeric = true),
                                    ) +
                                        products
                                            .filter { it.components.isEmpty() }
                                            .map {
                                                ToolField(
                                                    "p${it.id}",
                                                    "Units of ${it.name}",
                                                    "0",
                                                    numeric = true,
                                                )
                                            },
                                    "Create bundle",
                                ) { values ->
                                    val components =
                                        JSONObject(
                                            values
                                                .filter {
                                                    it.key.startsWith("p") &&
                                                        it.key != "price" &&
                                                        (it.value.toIntOrNull() ?: 0) > 0
                                                }
                                                .mapKeys { it.key.removePrefix("p") }
                                                .mapValues { it.value.toInt() }
                                        )
                                    run(
                                        "bundle",
                                        values + mapOf("components" to components.toString()),
                                    )
                                }
                        },
                )
                products
                    .filter {
                        tab == "All" ||
                            if (tab == "Bundles") it.components.isNotEmpty()
                            else it.components.isEmpty()
                    }
                    .forEach { p ->
                        RecordCard(p.name, "${p.detail} · ${p.sku}") {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                ProductArt(p.art)
                                Column(Modifier.padding(start = 15.dp)) {
                                    AppText(
                                        minorMoney(p.priceMinor),
                                        fontSize = 20.sp,
                                        fontWeight = FontWeight.Bold,
                                    )
                                    AppText(
                                        "${ops.available(p.id)} available",
                                        fontSize = 12.sp,
                                        color = Muted,
                                    )
                                }
                            }
                            if (p.components.isNotEmpty())
                                AppText(
                                    p.components.entries.joinToString(" + ") { (id, n) ->
                                        "$n × ${products.firstOrNull{it.id==id}?.name}"
                                    },
                                    fontSize = 12.sp,
                                )
                            else if (p.variantOf != null)
                                StatusLabel(
                                    "Variant of ${products.firstOrNull{it.id==p.variantOf}?.name}",
                                    Indigo,
                                )
                        }
                    }
            }
            "movements" -> {
                SearchBox(query, { query = it }, "Search products or stock changes")
                FilterPills(listOf("All", "This branch"), tab, { tab = it })
                o.records("movements")
                    .filter {
                        (tab == "All" || it.optString("branch") == ops.branch) &&
                            "${products.firstOrNull{p->p.id==it.optInt("productId")}?.name} ${it.optString("reason")} ${it.optString("reference")}"
                                .contains(query, true)
                    }
                    .forEach { m ->
                        RecordCard(
                            products.firstOrNull { it.id == m.optInt("productId") }?.name
                                ?: "Product",
                            "${m.optString("reason")} · ${m.optString("reference")}",
                        ) {
                            Row(
                                Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                AppText(
                                    "${m.optString("date")} · ${branchOptions.firstOrNull{it.first==m.optString("branch")}?.second}",
                                    fontSize = 11.sp,
                                    color = Muted,
                                )
                                AppText(
                                    "${if(m.optInt("delta")>0)"+" else ""}${m.optInt("delta")} units",
                                    fontSize = 16.sp,
                                    color = if (m.optInt("delta") < 0) Coral else Green,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    }
            }
            "transfers" -> {
                PrimaryButton(
                    "Prepare transfer",
                    {
                        ask(
                            "transfer",
                            "The right stock, in the right shop.",
                            listOf(
                                ToolField(
                                    "to",
                                    "Destination branch",
                                    branchOptions.firstOrNull { it.first != ops.branch }?.first
                                        ?: "",
                                    branchOptions.filter { it.first != ops.branch },
                                ),
                                ToolField(
                                    "product",
                                    "Product",
                                    productOptions.firstOrNull()?.first ?: "1",
                                    productOptions,
                                ),
                                qtyField(),
                            ),
                            confirm = "Save draft",
                            description = "From ${ops.branchName}. Drafts leave stock unchanged.",
                        )
                    },
                    tone = Green,
                )
                val transfers =
                    o.records("transfers").filter {
                        it.optString("from") == ops.branch || it.optString("to") == ops.branch
                    }
                if (transfers.isEmpty())
                    EmptyState(
                        "One transfer closer to a fuller shelf.",
                        "Prepare a transfer to another branch.",
                    )
                transfers.forEach { t ->
                    RecordCard(
                        "Transfer #${t.optInt("id")}",
                        "${products.firstOrNull{it.id==t.optInt("productId")}?.name} · ${t.optInt("quantity")} units",
                    ) {
                        AppText(
                            "${branchOptions.firstOrNull{it.first==t.optString("from")}?.second} → ${branchOptions.firstOrNull{it.first==t.optString("to")}?.second}",
                            fontSize = 13.sp,
                        )
                        StatusLabel(
                            t.optString("status"),
                            if (t.optString("status") == "Received") Green else Amber,
                        )
                        if (t.optString("status") == "Draft")
                            PrimaryButton(
                                "Dispatch stock",
                                {
                                    run(
                                        "dispatchTransfer",
                                        mapOf("id" to t.optInt("id").toString()),
                                    )
                                },
                                tone = Green,
                            )
                        if (t.optString("status") == "Dispatched")
                            PrimaryButton(
                                "Receive at destination",
                                {
                                    run("receiveTransfer", mapOf("id" to t.optInt("id").toString()))
                                },
                                tone = Green,
                            )
                        if (t.optString("status") in listOf("Draft", "Dispatched"))
                            ActionRow(
                                (if (t.optString("status") == "Draft") "Cancel draft"
                                else "Return to source") to
                                    {
                                        run(
                                            "cancelTransfer",
                                            mapOf("id" to t.optInt("id").toString()),
                                        )
                                    }
                            )
                    }
                }
            }
            "compare" -> {
                RecordCard(
                    "The same basket. A clearer comparison.",
                    "Choose products to compare your recorded supplier quotes, delivery fees and minimums.",
                    Sand,
                ) {
                    ActionRow(
                        "Choose comparison basket" to
                            {
                                form =
                                    ToolForm(
                                        "A useful basket to compare.",
                                        fields =
                                            products
                                                .filter { it.components.isEmpty() }
                                                .map {
                                                    ToolField(
                                                        "${it.id}",
                                                        "Units of ${it.name}",
                                                        o.objectAt("compareCart")
                                                            .optInt(it.id.toString())
                                                            .toString(),
                                                        numeric = true,
                                                    )
                                                },
                                        confirm = "Compare offers",
                                    ) { values ->
                                        run("compareBasket", values)
                                    }
                            }
                    )
                }
                val compare = o.ints("compareCart")
                store.suppliers.forEachIndexed { i, supplier ->
                    val recorded =
                        store.liveState.records("suppliers").firstOrNull {
                            it.optString("name") == supplier.name
                        }
                    val goods =
                        products.sumOf { p ->
                            if (store.real)
                                kotlin.math
                                    .round(
                                        (recorded
                                            ?.optJSONObject("quotes")
                                            ?.optDouble(p.id.toString(), Double.NaN)
                                            ?.takeIf { it.isFinite() }
                                            ?: store.liveState
                                                .records("products")
                                                .firstOrNull { it.optInt("id") == p.id }
                                                ?.optDouble("cost")
                                            ?: 0.0) * 100
                                    )
                                    .toLong() * (compare[p.id] ?: 0)
                            else
                                p.priceMinor * 8 / 10 *
                                    (compare[p.id] ?: 0) *
                                    listOf(100, 96, 103)[i] / 100
                        }
                    val fee =
                        if (store.real)
                            kotlin.math
                                .round((recorded?.optDouble("deliveryFee") ?: 0.0) * 100)
                                .toLong()
                        else listOf(30000L, 35000L, 20000L)[i]
                    val minimum =
                        if (store.real)
                            kotlin.math
                                .round((recorded?.optDouble("minimum") ?: 0.0) * 100)
                                .toLong()
                        else listOf(100000L, 150000L, 80000L)[i]
                    RecordCard(supplier.name, "${supplier.distance} · ${supplier.category}") {
                        AppText(
                            "Goods ${minorMoney(goods)}\nDelivery ${minorMoney(fee)}\nMinimum goods ${minorMoney(minimum)}",
                            fontSize = 13.sp,
                            lineHeight = 22.sp,
                        )
                        AppText(
                            "Total ${minorMoney(goods+fee)}",
                            fontSize = 23.sp,
                            fontWeight = FontWeight.Bold,
                        )
                        PrimaryButton(
                            "Create purchase order",
                            {
                                run(
                                    "purchaseOrder",
                                    mapOf(
                                        "supplier" to supplier.name,
                                        "fee" to
                                            java.math.BigDecimal.valueOf(fee, 2).toPlainString(),
                                        "factor" to
                                            if (store.real) "100" else listOf("100", "96", "103")[i],
                                    ),
                                )
                            },
                            enabled = goods >= minimum,
                            tone = Green,
                        )
                        if (goods < minimum)
                            AppText(
                                "Add ${minorMoney(minimum-goods)} in goods to meet the minimum.",
                                fontSize = 11.sp,
                                color = Amber,
                            )
                    }
                }
                Eyebrow("Local purchase orders")
                o.records("purchaseOrders")
                    .filter { it.optString("branch", "main") == ops.branch }
                    .forEach { order ->
                        RecordCard(
                            "Purchase #${order.optInt("id")} · ${order.optString("supplier")}",
                            minorMoney(order.optLong("total")),
                        ) {
                            StatusLabel(order.optString("status"))
                            if (order.optString("status") == "Draft")
                                PrimaryButton(
                                    "Receive goods",
                                    {
                                        run(
                                            "receivePurchaseOrder",
                                            mapOf("id" to order.optInt("id").toString()),
                                        )
                                    },
                                    tone = Green,
                                )
                        }
                    }
            }
            "deliveries" -> {
                ActionRow("Preview customer shop" to { onOpen("storefront") })
                val orders = o.records("deliveries").filter { it.optString("branch") == ops.branch }
                if (orders.isEmpty())
                    EmptyState(
                        "Your next delivery starts with an order.",
                        "Orders placed through your published shop appear here.",
                        Icons.Outlined.LocalShipping,
                    )
                orders.forEach { order ->
                    RecordCard(
                        "Order #${order.optInt("id")} · ${order.optString("customer")}",
                        order.optString("address"),
                    ) {
                        StatusLabel(order.optString("status"))
                        AppText(
                            minorMoney(order.optLong("total")),
                            fontSize = 25.sp,
                            fontWeight = FontWeight.Bold,
                        )
                        order.records("lines").forEach { line ->
                            val checked =
                                line.optInt("productId").toString() in order.strings("packed")
                            Row(
                                Modifier.fillMaxWidth().clickable(
                                    enabled = order.optString("status") == "Packing"
                                ) {
                                    run(
                                        "pack",
                                        mapOf(
                                            "id" to order.optInt("id").toString(),
                                            "product" to line.optInt("productId").toString(),
                                        ),
                                    )
                                },
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Checkbox(
                                    checked,
                                    onCheckedChange =
                                        if (order.optString("status") == "Packing") {
                                            {
                                                run(
                                                    "pack",
                                                    mapOf(
                                                        "id" to order.optInt("id").toString(),
                                                        "product" to
                                                            line.optInt("productId").toString(),
                                                    ),
                                                )
                                            }
                                        } else null,
                                )
                                AppText(
                                    "${line.optInt("quantity")} × ${line.optString("name")}",
                                    fontSize = 12.sp,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                        order.strings("events").forEach {
                            AppText("✓ $it", fontSize = 11.sp, color = Muted)
                        }
                        val next =
                            mapOf(
                                "New" to ("Confirmed" to "Confirm & reserve stock"),
                                "Confirmed" to ("Packing" to "Start packing"),
                                "Packing" to ("Dispatched" to "Dispatch order"),
                                "Dispatched" to ("Delivered" to "Mark delivered"),
                            )[order.optString("status")]
                        if (next != null)
                            PrimaryButton(
                                next.second,
                                {
                                    run(
                                        "orderStatus",
                                        mapOf(
                                            "id" to order.optInt("id").toString(),
                                            "status" to next.first,
                                        ),
                                    )
                                },
                                tone = Green,
                            )
                        if (!order.optBoolean("paid") && order.optString("status") == "Delivered")
                            ActionRow(
                                "Record cash payment" to
                                    {
                                        run(
                                            "orderPaid",
                                            mapOf("id" to order.optInt("id").toString()),
                                        )
                                    }
                            )
                        if (order.optString("status") in listOf("New", "Confirmed", "Packing"))
                            ActionRow(
                                "Cancel order" to
                                    {
                                        run(
                                            "orderStatus",
                                            mapOf(
                                                "id" to order.optInt("id").toString(),
                                                "status" to "Cancelled",
                                            ),
                                        )
                                    }
                            )
                        StatusLabel(
                            if (order.optBoolean("paid")) "Paid locally" else "Unpaid",
                            Amber,
                        )
                    }
                }
            }
            "loyalty" -> {
                val name =
                    if (customer == "Walk-in customer")
                        store.customers.firstOrNull()?.name ?: "Walk-in customer"
                    else customer
                ToolSelect("Customer", name, namedCustomers) {
                    run("basket", mapOf("customer" to it, "redeem" to "0"))
                }
                RecordCard("A little thank-you, every visit.", name, Mint) {
                    AppIcon(Icons.Outlined.CardGiftcard, null, Modifier.size(35.dp), tint = Green)
                    AppText(
                        "${o.objectAt("loyalty").optInt(name)} points",
                        fontSize = 37.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = HeadingFont,
                    )
                    AppText("1 point = KES 1 at checkout", fontSize = 12.sp, color = Muted)
                    PrimaryButton(
                        "Earn or redeem at checkout",
                        { onOpen("checkout") },
                        tone = Green,
                    )
                }
                ActionRow(
                    "Edit earning rule" to
                        {
                            ask(
                                "rewardRate",
                                "Clear rules for little rewards.",
                                listOf(
                                    ToolField(
                                        "amount",
                                        "Spend to earn one point (KES)",
                                        (o.optLong("rewardRate") / 100).toString(),
                                        numeric = true,
                                    )
                                ),
                                confirm = "Save rule",
                            )
                        }
                )
                AppText(
                    "Earn 1 point per ${minorMoney(o.optLong("rewardRate"))} spent. Returns adjust points proportionally.",
                    fontSize = 12.sp,
                    color = Muted,
                )
                val events = o.records("rewards").filter { it.optString("customer") == name }
                if (events.isEmpty())
                    EmptyState(
                        "Little rewards, still to come.",
                        "This customer’s point history will appear here.",
                    )
                events.forEach { r ->
                    RecordCard(r.optString("reason"), r.optString("date")) {
                        AppText(
                            "${if(r.optInt("points")>0)"+" else ""}${r.optInt("points")} points",
                            fontSize = 22.sp,
                            color = if (r.optInt("points") < 0) Coral else Green,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }
            }
            "branches" -> {
                RecordCard(
                    "${o.records("branches").size} places to grow.",
                    "Customers and rewards are shared. Stock, sales and registers belong to each branch.",
                    Mint,
                ) {
                    PrimaryButton(
                        "Add a branch",
                        {
                            ask(
                                "addBranch",
                                "A new place for your ambition.",
                                listOf(
                                    ToolField("name", "Branch name"),
                                    ToolField("location", "Location"),
                                ),
                                confirm = "Create branch",
                            )
                        },
                        tone = Green,
                    )
                }
                o.records("branches").forEach { b ->
                    val branchId = b.optString("id")
                    RecordCard(b.optString("name"), b.optString("location")) {
                        AppText(
                            "${o.objectAt("stock").objectAt(branchId).keys().asSequence().sumOf{o.objectAt("stock").objectAt(branchId).optInt(it)}} physical units",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                        AppText(
                            "Detailed receipts ${minorMoney(o.records("receipts").filter{it.optString("branch")==branchId}.sumOf{it.optLong("total")})}",
                            fontSize = 12.sp,
                            color = Muted,
                        )
                        if (branchId == ops.branch) StatusLabel("Current branch")
                        else
                            PrimaryButton(
                                "Switch to this branch",
                                { run("branch", mapOf("branch" to branchId)) },
                                tone = Green,
                            )
                        ActionRow("Manage transfers" to { onOpen("transfers") })
                    }
                }
            }
            "online-shop" -> {
                val shop = o.objectAt("shop")
                RecordCard(shop.optString("name"), shop.optString("description"), Mint) {
                    StatusLabel(
                        if (shop.optBoolean("published")) "Visible in local preview" else "Hidden",
                        Green,
                    )
                    ActionRow(
                        "Edit shop details" to
                            {
                                ask(
                                    "shop",
                                    "A shopfront that feels like you.",
                                    listOf(
                                        ToolField("name", "Shop name", shop.optString("name")),
                                        ToolField(
                                            "description",
                                            "A little about your shop",
                                            shop.optString("description"),
                                        ),
                                        ToolField(
                                            "branch",
                                            "Fulfilment branch",
                                            shop.optString("branch"),
                                            branchOptions,
                                        ),
                                        ToolField(
                                            "fee",
                                            "Delivery fee (KES)",
                                            (shop.optLong("fee") / 100.0).toString(),
                                            numeric = true,
                                        ),
                                    ),
                                )
                            },
                        (if (shop.optBoolean("published")) "Hide local shop"
                        else "Show local shop") to
                            {
                                run(
                                    "shop",
                                    mapOf("published" to (!shop.optBoolean("published")).toString()),
                                )
                            },
                    )
                    PrimaryButton(
                        "Preview your online shop",
                        { onOpen("storefront") },
                        tone = Green,
                    )
                    AppText(
                        "This switch changes only the local preview. It does not publish a real store.",
                        fontSize = 11.sp,
                        color = Muted,
                    )
                }
                Eyebrow("Choose the online shelf")
                val hidden = shop.optJSONArray("hidden") ?: JSONArray()
                products.forEach { p ->
                    val visible = (0 until hidden.length()).none { hidden.getInt(it) == p.id }
                    SurfaceCard {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            ProductArt(p.art)
                            Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                                AppText(p.name, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                AppText(minorMoney(p.priceMinor), fontSize = 11.sp, color = Muted)
                            }
                            Checkbox(
                                visible,
                                onCheckedChange = {
                                    val values =
                                        (0 until hidden.length())
                                            .map { hidden.getInt(it) }
                                            .toMutableList()
                                    if (visible) values.add(p.id) else values.remove(p.id)
                                    run("shop", mapOf("hidden" to JSONArray(values).toString()))
                                },
                            )
                        }
                    }
                }
            }
            "storefront" -> {
                NativeShopPreview(
                    store,
                    { action, values -> run(action, values) },
                    onOpen,
                    { it -> form = it },
                )
            }
            "customer-portal" -> {
                RecordCard(
                    "A clearer view from their side.",
                    "Review customer balances, rewards and documents. Customers sign in with a verified account on the website to view their private records.",
                    BlueMist,
                )
                store.customers.forEach { c ->
                    RecordCard(
                        c.name,
                        "Balance ${minorMoney(c.balanceMinor)} · ${o.objectAt("loyalty").optInt(c.name)} points",
                    ) {
                        PrimaryButton(
                            "Preview as customer",
                            {
                                run("basket", mapOf("customer" to c.name, "redeem" to "0"))
                                onOpen("portal")
                            },
                            tone = Green,
                        )
                    }
                }
            }
            "portal" -> {
                NativeCustomerPreview(store, onOpen)
            }
            "sync" -> {
                RecordCard(
                    "Your work has a home on this device.",
                    "Records persist locally. They are not synced to the website or another device.",
                    Mint,
                ) {
                    StatusLabel("Saved locally")
                    ActionRow(
                        "Check device connection" to
                            {
                                val cm =
                                    context.getSystemService(Context.CONNECTIVITY_SERVICE)
                                        as ConnectivityManager
                                feedback =
                                    if (cm.activeNetwork != null)
                                        "Device reports a network connection."
                                    else "Device reports offline. Local records remain available."
                                failed = false
                            }
                    )
                    ToolSelect(
                        "Explore a sync scenario",
                        o.objectAt("sync").optString("mode"),
                        listOf("Local only", "Offline preview", "Conflict preview").map { it to it },
                    ) {
                        run("syncMode", mapOf("mode" to it))
                    }
                    AppText(
                        "Scenarios are simulated. A retry never uploads data or claims server acceptance.",
                        fontSize = 11.sp,
                        color = Muted,
                    )
                }
                val entries = o.objectAt("sync").records("entries")
                if (entries.isEmpty())
                    EmptyState(
                        "A little activity, still to come.",
                        "Your local business actions will appear here.",
                    )
                entries.forEach { e ->
                    RecordCard(e.optString("label")) {
                        StatusLabel(
                            e.optString("status"),
                            if (e.optString("status") == "Saved on device") Green else Amber,
                        )
                        if (e.optString("status") != "Saved on device")
                            ActionRow(
                                "Review / retry preview" to
                                    {
                                        run("retrySync", mapOf("id" to e.optInt("id").toString()))
                                    }
                            )
                    }
                }
            }
            "preferences" -> {
                val prefs = o.objectAt("preferences")
                RecordCard(
                    "Your language. Your light. Your pace.",
                    "Preferences are saved on this device.",
                ) {
                    ToolSelect(
                        "Language / Lugha",
                        prefs.optString("language"),
                        listOf("en" to "English", "sw" to "Kiswahili"),
                    ) {
                        run("preferences", mapOf("language" to it))
                    }
                    ToolSelect(
                        "Appearance",
                        prefs.optString("theme"),
                        listOf("light" to "Light", "dark" to "Dark", "system" to "Follow device"),
                    ) {
                        run("preferences", mapOf("theme" to it))
                    }
                    ToolSelect(
                        "Reading size",
                        prefs.optInt("textSize", 100).toString(),
                        listOf(
                            "100" to "Standard · 100%",
                            "115" to "Comfortable · 115%",
                            "130" to "Large · 130%",
                        ),
                    ) {
                        run("preferences", mapOf("textSize" to it))
                    }
                }
                RecordCard(
                    "Your business. All together.",
                    "Your sales, shelves and people in one clear place.",
                    Mint,
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        listOf(Mint, BlueMist, RoseMist, Sand).forEach { color ->
                            Box(
                                Modifier.size(43.dp)
                                    .background(color, RoundedCornerShape(12.dp))
                                    .border(1.dp, Line, RoundedCornerShape(12.dp))
                            )
                        }
                    }
                }
                if (!store.real)
                    RecordCard(
                        "A fresh start, whenever you need it.",
                        "Reset local demo records and preferences to the original sample shop.",
                    ) {
                        OutlinedButton(
                            onClick = {
                                form =
                                    ToolForm(
                                        "Ready for a fresh start?",
                                        "This replaces local demo changes on this device.",
                                        emptyList(),
                                        "Reset demo",
                                    ) {
                                        DemoPersistence.restore(
                                            store,
                                            DemoPersistence.snapshot(DemoStore()),
                                        )
                                        feedback = "A fresh demo shop, ready for you."
                                        true
                                    }
                            }
                        ) {
                            AppText("Reset demo data", color = Coral)
                        }
                    }
            }
        }
        AppText(
            "UI preview · no live payments, messages or supplier requests.",
            fontSize = 10.sp,
            color = Muted,
        )
    }
    form?.let { FormDialog(it, { feedback }) { form = null } }
}

@Composable
private fun ReceiptCard(receipt: JSONObject, context: Context) {
    RecordCard(
        "Receipt #${receipt.optInt("id")}",
        "${receipt.optString("customer")} · ${receipt.optString("date")}",
        Mint,
    ) {
        AppText(
            minorMoney(receipt.optLong("total")),
            fontSize = 30.sp,
            fontWeight = FontWeight.Bold,
        )
        receipt.records("lines").forEach { l ->
            AppText(
                "${l.optInt("quantity")} × ${l.optString("name")} · ${minorMoney(l.optLong("net"))}",
                fontSize = 12.sp,
            )
        }
        receipt.records("payments").forEach { p ->
            AppText(
                "${p.optString("method")} · ${minorMoney(p.optLong("amount"))}",
                fontSize = 12.sp,
            )
        }
        AppText(
            "${receipt.optInt("earned")} points earned · ${receipt.optInt("redeemed")} redeemed",
            fontSize = 11.sp,
            color = Muted,
        )
        ActionRow(
            "Print / save PDF" to
                {
                    printDemo(
                        context,
                        "Demo receipt",
                        listOf("Receipt #${receipt.optInt("id")}", receipt.optString("customer")) +
                            receipt.records("lines").map {
                                "${it.optInt("quantity")} × ${it.optString("name")}  ${minorMoney(it.optLong("net"))}"
                            } +
                            listOf(
                                "Total ${minorMoney(receipt.optLong("total"))}",
                                "UI preview. No payment was collected.",
                            ),
                    )
                }
        )
    }
}

@Composable
private fun ColumnScope.NativeShopPreview(
    store: DemoStore,
    run: (String, Map<String, String>) -> Boolean,
    onOpen: (String) -> Unit,
    showForm: (ToolForm) -> Unit,
) {
    val o = store.operations.state
    val shop = o.objectAt("shop")
    val basket = o.ints("shopCart")
    SurfaceCard(color = Mint) {
        ShopPhoto(Modifier.fillMaxWidth().height(155.dp).clip(RoundedCornerShape(12.dp)))
        AppText(
            shop.optString("name"),
            fontSize = 26.sp,
            fontFamily = HeadingFont,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(top = 18.dp),
        )
        AppText(
            shop.optString("description"),
            fontSize = 13.sp,
            color = Muted,
            modifier = Modifier.padding(top = 10.dp),
        )
        AppText(
            "Delivery ${minorMoney(shop.optLong("fee"))}",
            fontSize = 12.sp,
            color = Green,
            modifier = Modifier.padding(top = 12.dp),
        )
        StatusLabel("Local demo shop · no real orders", Amber)
    }
    if (!shop.optBoolean("published")) {
        EmptyState("A little pause at the shop.", "The merchant has hidden this local preview.")
        return
    }
    val hidden = shop.optJSONArray("hidden") ?: JSONArray()
    store.products
        .filter { p -> (0 until hidden.length()).none { hidden.getInt(it) == p.id } }
        .forEach { p ->
            SurfaceCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ProductArt(p.art, Modifier.size(65.dp, 80.dp))
                    Column(Modifier.weight(1f).padding(horizontal = 13.dp)) {
                        AppText(p.name, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                        AppText(p.detail.substringBefore(" ·"), fontSize = 11.sp, color = Muted)
                        AppText(
                            minorMoney(p.priceMinor),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(top = 7.dp),
                        )
                    }
                }
                Row(
                    Modifier.fillMaxWidth().padding(top = 15.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    AppText(
                        "${store.operations.available(p.id,shop.optString("branch"))} available",
                        fontSize = 11.sp,
                        color = Muted,
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(
                            onClick = {
                                run(
                                    "shopCart",
                                    mapOf(
                                        "product" to p.id.toString(),
                                        "quantity" to
                                            ((basket[p.id] ?: 0) - 1).coerceAtLeast(0).toString(),
                                    ),
                                )
                            }
                        ) {
                            AppIcon(Icons.Outlined.Remove, "Remove ${p.name}", tint = Green)
                        }
                        AppText(
                            (basket[p.id] ?: 0).toString(),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                        )
                        IconButton(
                            onClick = {
                                run(
                                    "shopCart",
                                    mapOf(
                                        "product" to p.id.toString(),
                                        "quantity" to ((basket[p.id] ?: 0) + 1).toString(),
                                    ),
                                )
                            },
                            enabled =
                                (basket[p.id] ?: 0) <
                                    store.operations.available(p.id, shop.optString("branch")),
                        ) {
                            AppIcon(Icons.Outlined.Add, "Add ${p.name}", tint = Green)
                        }
                    }
                }
            }
        }
    val subtotal = store.products.sumOf { it.priceMinor * (basket[it.id] ?: 0) }
    RecordCard(
        "A little basket of essentials.",
        "${basket.values.sum()} items · Delivery ${minorMoney(shop.optLong("fee"))}",
    ) {
        AppText(
            "Total ${minorMoney(subtotal+if(basket.values.sum()>0)shop.optLong("fee")else 0)}",
            fontSize = 25.sp,
            fontWeight = FontWeight.Bold,
        )
        PrimaryButton(
            "Place demo order",
            {
                showForm(
                    ToolForm(
                        "Your next little basket.",
                        "No money is collected. This order stays on this device.",
                        listOf(
                            ToolField(
                                "customer",
                                "Customer name",
                                store.customers.firstOrNull()?.name ?: "Walk-in customer",
                                store.customers.map { it.name to it.name },
                            ),
                            ToolField("address", "Delivery or pickup details"),
                        ),
                        "Place demo order",
                    ) { values ->
                        run("placeOrder", values)
                    }
                )
            },
            enabled = basket.values.sum() > 0,
            tone = Green,
        )
        ActionRow(
            "Merchant deliveries" to { onOpen("deliveries") },
            "Shop settings" to { onOpen("online-shop") },
        )
    }
}

@Composable
private fun ColumnScope.NativeCustomerPreview(store: DemoStore, onOpen: (String) -> Unit) {
    val o = store.operations.state
    val c =
        store.customers.firstOrNull { it.name == o.optString("customer") }
            ?: store.customers.firstOrNull()
            ?: return
    RecordCard(
        "Hello, ${c.name.substringBefore(" ")}.",
        "Your orders, records and rewards with ${o.objectAt("shop").optString("name")}",
        BlueMist,
    ) {
        StatusLabel("Customer-view preview · no sign-in", Amber)
        AppText(
            "Balance ${minorMoney(c.balanceMinor)}",
            fontSize = 23.sp,
            fontWeight = FontWeight.Bold,
        )
        AppText(
            "${o.objectAt("loyalty").optInt(c.name)} loyalty points",
            fontSize = 18.sp,
            color = Green,
        )
        ActionRow(
            "Visit demo shop" to { onOpen("storefront") },
            "Back to merchant" to { onOpen("customer-portal") },
        )
    }
    Eyebrow("Your orders")
    val orders = o.records("deliveries").filter { it.optString("customer") == c.name }
    if (orders.isEmpty())
        EmptyState(
            "Your next order is waiting to happen.",
            "Explore the demo shop and place a sample order.",
        )
    orders.forEach { order ->
        RecordCard("Order #${order.optInt("id")}", minorMoney(order.optLong("total"))) {
            StatusLabel(order.optString("status"))
            order.records("lines").forEach {
                AppText("${it.optInt("quantity")} × ${it.optString("name")}", fontSize = 12.sp)
            }
            order.strings("events").forEach { AppText("✓ $it", fontSize = 11.sp, color = Muted) }
        }
        Eyebrow("Your invoices")
        val docs =
            o.records("documents").filter {
                it.optString("customer") == c.name && it.optString("kind") == "Invoice"
            }
        if (docs.isEmpty())
            AppText(
                "Invoices prepared for this sample customer will appear here.",
                fontSize = 12.sp,
                color = Muted,
            )
        docs.forEach { d ->
            RecordCard(
                "Invoice #${kotlin.math.abs(d.optInt("id"))}",
                "Due ${d.optString("due")} · ${minorMoney(d.optLong("total"))}",
            ) {
                StatusLabel(d.optString("status"))
            }
        }
        Eyebrow("Your rewards")
        o.records("rewards")
            .filter { it.optString("customer") == c.name }
            .forEach { r ->
                RecordCard(
                    r.optString("reason"),
                    "${r.optInt("points")} points · ${r.optString("date")}",
                )
            }
        AppText(
            "Sample records only. Authenticated accounts and secure sharing links come with the backend.",
            fontSize = 11.sp,
            color = Muted,
        )
    }
}
