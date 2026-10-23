package com.biashara.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.biashara.app.data.*

@Composable
private fun MenuRow(
    icon: ImageVector,
    title: String,
    description: String = "",
    onClick: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppIcon(icon, null, Modifier.size(21.dp), tint = Ink)
        Column(Modifier.weight(1f).padding(horizontal = 13.dp)) {
            AppText(title, fontSize = 13.sp)
            if (description.isNotEmpty())
                AppText(
                    description,
                    fontSize = 10.sp,
                    color = Muted,
                    modifier = Modifier.padding(top = 3.dp),
                )
        }
        AppIcon(Icons.Outlined.ChevronRight, null, Modifier.size(16.dp), tint = Muted)
    }
    HorizontalDivider(color = Line)
}

@Composable
fun MoreScreen(store: DemoStore, navigate: (Screen) -> Unit) {
    var dialog by remember { mutableStateOf<String?>(null) }
    var team by remember { mutableStateOf(false) }
    if (team) {
        LiveTeamScreen(store, { team = false })
        return
    }
    Page {
        Column(
            Modifier.fillMaxWidth().padding(top = 14.dp, bottom = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            ProfilePhoto(Modifier.size(76.dp).clip(CircleShape))
            Row(verticalAlignment = Alignment.CenterVertically) {
                AppText(store.ownerName, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                AppText(
                    if (store.real) store.backend?.role ?: "ACCOUNT" else "DEMO",
                    fontSize = 8.sp,
                    color = Color.White,
                    modifier =
                        Modifier.padding(start = 5.dp)
                            .background(Color(0xFF6259E9), RoundedCornerShape(4.dp))
                            .padding(horizontal = 4.dp, vertical = 2.dp),
                )
            }
            AppText(store.businessName, fontSize = 11.sp, color = Muted)
        }
        PrimaryButton(
            "Explore all 20 business tools",
            { navigate(Screen.TOOLS) },
            icon = Icons.Outlined.Apps,
            tone = Green,
        )
        Column {
            MenuRow(Icons.Outlined.PersonOutline, "Business Profile") { navigate(Screen.PROFILE) }
            MenuRow(
                Icons.Outlined.AccountBalanceWallet,
                "Payment Methods",
                "M-Pesa, Bank Accounts",
            ) {
                dialog = "Payment Methods"
            }
            MenuRow(Icons.Outlined.Groups, "Staff Management") {
                if (store.real) team = true else dialog = "Staff Management"
            }
            MenuRow(Icons.Outlined.NotificationsNone, "Notifications") { navigate(Screen.STOCK) }
            MenuRow(Icons.Outlined.Settings, "App Settings") { navigate(Screen.TOOLS) }
            MenuRow(Icons.AutoMirrored.Outlined.HelpOutline, "Help & Support") {
                dialog = "Help & Support"
            }
            Row(
                Modifier.fillMaxWidth()
                    .clickable {
                        if (store.real) store.backend?.action { store.backend?.signOut() }
                        else dialog = "Log Out"
                    }
                    .padding(vertical = 17.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AppIcon(
                    Icons.AutoMirrored.Outlined.Logout,
                    null,
                    Modifier.size(21.dp),
                    tint = Coral,
                )
                AppText(
                    "Log Out",
                    fontSize = 13.sp,
                    color = Coral,
                    modifier = Modifier.padding(start = 13.dp),
                )
            }
        }
        Column {
            Eyebrow("Business tools")
            MenuRow(Icons.Outlined.PeopleOutline, "Customers") { navigate(Screen.CUSTOMERS) }
            MenuRow(Icons.Outlined.LocalShipping, "Suppliers") { navigate(Screen.SUPPLIERS) }
            MenuRow(Icons.Outlined.BarChart, "Reports") { navigate(Screen.REPORTS) }
            MenuRow(Icons.Outlined.AutoAwesome, "BiasharaAI") { navigate(Screen.ASSISTANT) }
            MenuRow(Icons.Outlined.Spa, "Business Financing") { navigate(Screen.FINANCE) }
            MenuRow(Icons.Outlined.WavingHand, "Meet Biashara") { navigate(Screen.SETUP) }
        }
        AppText(
            "BiasharaOS · Early access 0.1.0",
            fontSize = 10.sp,
            color = Muted,
            modifier = Modifier.align(Alignment.CenterHorizontally),
        )
    }
    dialog?.let { title ->
        AlertDialog(
            onDismissRequest = { dialog = null },
            title = { AppText(title) },
            text = {
                AppText(
                    when (title) {
                        "Payment Methods" ->
                            "M-Pesa and bank account connections will be available when payments are integrated. Record payments after you receive them."
                        "Staff Management" ->
                            if (store.real)
                                store.liveState.records("members").joinToString("\n") {
                                    "${it.optString("name")} · ${it.optString("role")} · ${it.optString("status")}"
                                } + "\nManage invitations on the website."
                            else "Sample team"
                        "App Settings" ->
                            "Currency: KES – Kenyan Shilling\nLanguage: English\nTheme: Light\n\nYou are using the UI preview with local sample data."
                        "Log Out" ->
                            "You are exploring a demo store. Account sign-in and sign-out will be added with authentication."
                        else ->
                            "Manage sales, stock, customers, suppliers and reports. Saved changes are shared with your business account. Online payment collection, lending and external AI are coming later."
                    }
                )
            },
            confirmButton = { TextButton(onClick = { dialog = null }) { AppText("Done") } },
        )
    }
}

@Composable
fun ProfileScreen(store: DemoStore, onBack: () -> Unit) {
    var name by rememberSaveable { mutableStateOf(store.ownerName) }
    var business by rememberSaveable { mutableStateOf(store.businessName) }
    var location by rememberSaveable { mutableStateOf(store.location) }
    var saved by remember { mutableStateOf(false) }
    Page {
        PageTitle("Business Profile", onBack = onBack)
        Box(
            Modifier.align(Alignment.CenterHorizontally)
                .padding(top = 15.dp)
                .size(90.dp)
                .background(Color(0xFFEAE0C8), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            AppText(
                name.take(1).uppercase(),
                fontSize = 35.sp,
                fontWeight = FontWeight.Bold,
                color = Ink,
            )
        }
        Eyebrow("The person behind the business")
        OutlinedTextField(
            name,
            {
                name = it
                saved = false
            },
            label = { AppText("Your first name") },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            singleLine = true,
        )
        OutlinedTextField(
            business,
            {
                business = it
                saved = false
            },
            label = { AppText("Business name") },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            singleLine = true,
        )
        OutlinedTextField(
            location,
            {
                location = it
                saved = false
            },
            label = { AppText("Location") },
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            singleLine = true,
        )
        SurfaceCard {
            Eyebrow("Your currency")
            AppText(
                "KES · Kenyan shilling",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(top = 8.dp),
            )
        }
        PrimaryButton(
            if (saved) "Changes saved ✓" else "Save changes",
            {
                if (store.real) {
                    store.backend?.action {
                        store.backend?.command(
                            json(
                                "type" to "updateProfile",
                                "profile" to
                                    json(
                                        "name" to name.trim(),
                                        "business" to business.trim(),
                                        "location" to location.trim(),
                                    ),
                            )
                        )
                        saved = true
                    }
                    return@PrimaryButton
                }
                store.ownerName = name.trim()
                store.businessName = business.trim()
                store.location = location.trim()
                saved = true
            },
            enabled = name.isNotBlank() && business.isNotBlank() && location.isNotBlank(),
            icon = Icons.Outlined.Check,
        )
        AppText("Confirmed changes are shared with your website.", fontSize = 11.sp, color = Muted)
    }
}

@Composable
fun SetupScreen(store: DemoStore, done: () -> Unit) {
    var step by rememberSaveable { mutableIntStateOf(0) }
    var business by rememberSaveable { mutableStateOf(store.businessName) }
    var location by rememberSaveable { mutableStateOf(store.location) }
    if (step == 0) {
        Box(Modifier.fillMaxSize()) {
            ShopPhoto(Modifier.fillMaxSize())
            Box(
                Modifier.fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Black.copy(alpha = .25f), Color.Transparent)
                        )
                    )
            )
            Column(Modifier.padding(horizontal = 26.dp).padding(top = 72.dp)) {
                Row {
                    AppText(
                        "Biashara",
                        fontSize = 36.sp,
                        fontFamily = HeadingFont,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = (-1).sp,
                    )
                    AppText(
                        "OS",
                        fontSize = 36.sp,
                        fontFamily = HeadingFont,
                        color = Color(0xFFEF603A),
                        fontWeight = FontWeight.Bold,
                        letterSpacing = (-1).sp,
                    )
                }
                AppText(
                    "Your business.\nSmarter. Bigger. Anywhere.",
                    fontSize = 15.sp,
                    lineHeight = 21.sp,
                    color = Color.White,
                    modifier = Modifier.padding(top = 9.dp),
                )
            }
            Column(
                Modifier.align(Alignment.CenterEnd).padding(end = 18.dp, top = 90.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                listOf(
                        Icons.Outlined.BarChart to "Sales",
                        Icons.Outlined.Inventory2 to "Inventory",
                        Icons.Outlined.LocalShipping to "Suppliers",
                        Icons.Outlined.PeopleOutline to "Customers",
                        Icons.AutoMirrored.Outlined.TrendingUp to "Growth",
                    )
                    .forEach { (icon, text) ->
                        Row(
                            Modifier.width(128.dp)
                                .background(
                                    Color.White.copy(alpha = .93f),
                                    RoundedCornerShape(15.dp),
                                )
                                .padding(horizontal = 13.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            AppIcon(icon, null, Modifier.size(17.dp), tint = Green)
                            AppText(
                                text,
                                fontSize = 12.sp,
                                color = Ink,
                                modifier = Modifier.padding(start = 10.dp),
                            )
                        }
                    }
            }
            Column(
                Modifier.align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .background(
                        Surface.copy(alpha = .98f),
                        RoundedCornerShape(topStart = 30.dp, topEnd = 30.dp),
                    )
                    .padding(24.dp)
                    .navigationBarsPadding()
            ) {
                AppText(
                    "Join thousands of African\nbusinesses growing with AI.",
                    fontSize = 14.sp,
                    lineHeight = 21.sp,
                )
                Row(
                    Modifier.fillMaxWidth().padding(top = 20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(Modifier.weight(1f), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        (0..4).forEach { i ->
                            Box(
                                Modifier.size(6.dp)
                                    .background(if (i == 0) Forest else Line, CircleShape)
                            )
                        }
                    }
                    IconButton(
                        onClick = { step = 1 },
                        modifier = Modifier.size(49.dp).background(Forest, CircleShape),
                    ) {
                        AppIcon(
                            Icons.AutoMirrored.Outlined.ArrowForward,
                            "Continue welcome",
                            tint = Color.White,
                        )
                    }
                }
            }
        }
    } else
        Column(
            Modifier.fillMaxSize()
                .padding(horizontal = 18.dp)
                .padding(top = 12.dp)
                .navigationBarsPadding()
        ) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                if (step > 1)
                    IconButton(
                        onClick = { step-- },
                        modifier = Modifier.size(34.dp).background(Line, CircleShape),
                    ) {
                        AppIcon(Icons.Outlined.ChevronLeft, "Previous step")
                    }
                Spacer(Modifier.weight(1f))
                TextButton(onClick = done) { AppText("Skip", fontSize = 12.sp, color = Ink) }
            }
            Column(
                Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(top = 18.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                when (step) {
                    1 -> {
                        AppText(
                            "Everything\nyour business\nneeds in one app.",
                            fontSize = 30.sp,
                            lineHeight = 35.sp,
                            fontFamily = HeadingFont,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = (-.7).sp,
                        )
                        AppText(
                            "Sell, manage stock, track expenses,\nfind suppliers and get AI insights.",
                            fontSize = 13.sp,
                            lineHeight = 20.sp,
                            color = Muted,
                        )
                        androidx.compose.foundation.Image(
                            painter =
                                androidx.compose.ui.res.painterResource(
                                    com.biashara.app.R.drawable.features_collage
                                ),
                            contentDescription =
                                "Sales insights, a shopkeeper and a fresh produce market",
                            modifier = Modifier.fillMaxWidth().height(190.dp),
                            contentScale = androidx.compose.ui.layout.ContentScale.Fit,
                        )
                        listOf(
                                Triple(
                                    Icons.Outlined.ShoppingBag,
                                    "Track sales & payments",
                                    Color(0xFF6466DE),
                                ),
                                Triple(
                                    Icons.Outlined.Inventory2,
                                    "Manage inventory",
                                    Color(0xFFED6958),
                                ),
                                Triple(
                                    Icons.Outlined.PeopleOutline,
                                    "Find trusted suppliers",
                                    Color(0xFF326CCB),
                                ),
                                Triple(
                                    Icons.Outlined.AutoAwesome,
                                    "Get AI business advice",
                                    Color(0xFF7856DA),
                                ),
                            )
                            .forEach { (icon, text, color) ->
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    IconTile(icon, color, color.copy(alpha = .10f), 36)
                                    AppText(
                                        text,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium,
                                        modifier = Modifier.padding(start = 14.dp),
                                    )
                                }
                            }
                    }
                    2 -> {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            LinearProgressIndicator(
                                progress = { .5f },
                                modifier = Modifier.weight(1f).height(3.dp),
                                color = Green,
                                trackColor = Line,
                            )
                            AppText(
                                "2/4",
                                fontSize = 11.sp,
                                modifier = Modifier.padding(start = 14.dp),
                            )
                        }
                        Column {
                            AppText(
                                "Tell us about your business",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                            )
                            AppText(
                                "This helps us personalize your experience.",
                                fontSize = 12.sp,
                                color = Muted,
                                modifier = Modifier.padding(top = 6.dp),
                            )
                        }
                        Box(
                            Modifier.fillMaxWidth().height(135.dp).clip(RoundedCornerShape(16.dp))
                        ) {
                            ShopPhoto(Modifier.fillMaxSize())
                            AppIcon(
                                Icons.Outlined.PhotoCamera,
                                null,
                                Modifier.align(Alignment.BottomEnd)
                                    .padding(10.dp)
                                    .background(Color.White, CircleShape)
                                    .padding(9.dp)
                                    .size(20.dp),
                            )
                        }
                        OutlinedTextField(
                            business,
                            { business = it },
                            label = { AppText("Business name") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                        )
                        OutlinedTextField(
                            "Retail Shop",
                            {},
                            label = { AppText("Business type") },
                            readOnly = true,
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                        )
                        OutlinedTextField(
                            location,
                            { location = it },
                            label = { AppText("Location") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                        )
                        OutlinedTextField(
                            "🇰🇪  KES – Kenyan Shilling",
                            {},
                            label = { AppText("Currency") },
                            readOnly = true,
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                        )
                    }
                    else -> {
                        ShopPhoto(
                            Modifier.fillMaxWidth().height(250.dp).clip(RoundedCornerShape(22.dp))
                        )
                        AppText(
                            "Your business,\nready for more.",
                            style = MaterialTheme.typography.headlineLarge,
                        )
                        AppText(
                            "${store.businessName} is ready. Add your products and record your first sale.",
                            fontSize = 14.sp,
                            color = Muted,
                        )
                    }
                }
            }
            PrimaryButton(
                when (step) {
                    1 -> "Get Started  →"
                    2 -> "Continue  →"
                    else -> "Let's get started  →"
                },
                onClick = {
                    when (step) {
                        1 -> step = 2
                        2 -> {
                            if (store.real) {
                                store.backend?.action {
                                    store.backend?.command(
                                        json(
                                            "type" to "updateProfile",
                                            "profile" to
                                                json(
                                                    "business" to business.trim(),
                                                    "location" to location.trim(),
                                                ),
                                        )
                                    )
                                    done()
                                }
                                return@PrimaryButton
                            }
                            store.businessName = business.trim()
                            store.location = location.trim()
                            step = 3
                        }
                        else -> done()
                    }
                },
                enabled = step != 2 || (business.isNotBlank() && location.isNotBlank()),
                modifier = Modifier.padding(vertical = 20.dp),
            )
        }
}
