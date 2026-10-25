package com.biashara.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Shield
import androidx.compose.material.icons.outlined.Storefront
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.biashara.app.data.*
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

@Composable
fun WelcomeOnboardingScreen(onCreateAccount: () -> Unit, onSignIn: () -> Unit) {
    var page by rememberSaveable { mutableIntStateOf(0) }
    val titles = listOf("Your next chapter starts here.", "Know your business, every day.", "A secure start. Room to grow.")
    val messages = listOf("Sales, stock, customers and your business records, together on your phone and the web.", "We will help you set up your shop, owner contact, everyday tools and business registration readiness.", "Kenya is our launch market. Other African countries are coming soon. Identity verification and lending partners are being prepared.")
    Column(Modifier.fillMaxSize().background(Canvas).statusBarsPadding().navigationBarsPadding().verticalScroll(rememberScrollState())) {
        Box(Modifier.fillMaxWidth().height(280.dp)) {
            Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0xFF173D30), Color(0xFF102B23)))))
            BrandDoodleBackdrop(Modifier.fillMaxSize(), tint = Color(0xFF9BE5BE), opacity = .28f, tileWidth = 380.dp)
            Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0x22102B23), Color.Transparent, Color(0xDD102B23)))))
            AppText("A WORLD OF BUSINESS", color = Color.White.copy(alpha = .9f), fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.align(Alignment.TopStart).padding(24.dp))
            AppText("BiasharaOS", color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.align(Alignment.BottomStart).padding(24.dp))
        }
        Column(Modifier.fillMaxWidth().padding(24.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
            Eyebrow("A CLEAR START · ${page + 1} OF 3")
            AppText(titles[page], style = MaterialTheme.typography.headlineLarge)
            AppText(messages[page], color = Muted)
            LinearProgressIndicator(progress = { (page + 1) / 3f }, modifier = Modifier.fillMaxWidth(), color = Green)
            if (page < 2) PrimaryButton("Continue", { page++ }, tone = Green)
            else PrimaryButton("Set up my business", onCreateAccount, tone = Green)
            if (page > 0) TextButton(onClick = { page-- }) { AppText("Back", color = Muted) }
            TextButton(onClick = onSignIn) { AppText("I already have an account · Sign in", color = Green) }
            PolicyLinks()
        }
    }
}

@Composable
fun BusinessOnboardingScreen(backend: LiveBackend, manage: Boolean = false, onStarted: () -> Unit = {}, onComplete: () -> Unit) {
    val context = LocalContext.current
    val industries = remember { industryCatalog(context) }
    val draftVault = remember(backend.accountId, backend.businessId) { VerificationDraftVault(context, backend.accountId, backend.businessId) }
    var step by rememberSaveable(backend.accountId) { mutableIntStateOf(0) }
    var saved by rememberSaveable(backend.accountId) { mutableStateOf(emptyVerificationProfile(backend.accountName, backend.accountEmail).toString()) }
    val profile = remember(saved) { JSONObject(saved) }
    var busy by remember { mutableStateOf(false) }
    var loaded by remember { mutableStateOf(!backend.hasBusiness) }
    var error by remember { mutableStateOf("") }
    var notice by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("") }
    var expanding by remember { mutableStateOf(false) }
    var clearing by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val titles = listOf("Your business", "Owner contact", "Everyday operations", "Registration & KYC", "Review & declaration", "Ready for business")
    fun update(key: String, value: Any) { saved = JSONObject(saved).put(key, value).toString(); notice = "" }
    LaunchedEffect(draftVault) {
        // Business creation changes the scope during an active save; its coroutine migrates the draft.
        if (busy) return@LaunchedEffect
        onStarted()
        loaded = false
        val local = draftVault.read()
        saved = local?.optJSONObject("profile")?.toString() ?: emptyVerificationProfile(backend.accountName, backend.accountEmail).toString()
        step = local?.optInt("step")?.coerceIn(0, 4) ?: 0
        if (local != null) notice = "Resumed your saved setup draft on this device."
        if (backend.hasBusiness) {
            busy = true
            try { val record = backend.getVerification().optJSONObject("verification"); if (record != null) { if (local == null) saved = record.getJSONObject("profile").toString(); status = record.optString("status") } }
            catch (e: Exception) { error = e.message.orEmpty() }
            finally { loaded = true; busy = false }
        } else loaded = true
    }
    LaunchedEffect(saved, step, loaded, draftVault) {
        if (loaded && step < 5) try { draftVault.write(JSONObject(saved), step) } catch (e: Exception) { notice = e.message.orEmpty() }
    }
    fun validateStep(): String = when (step) {
        0 -> if (listOf("tradingName", "legalName", "businessAddress").any { profile.optString(it).isBlank() }) "Enter your business name, legal owner or business name, and trading location." else ""
        1 -> if (profile.optString("contactName").isBlank() || profile.optString("phone").isBlank() || !validEmail(profile.optString("email"))) "Enter an owner name, phone number and valid contact email." else ""
        2 -> if (profile.optInt("yearsTrading", -1) !in 0..100 || profile.optInt("employees", 0) !in 1..100000) "Enter valid trading years and team size." else ""
        3 -> if (profile.optString("registrationStatus") == "registered" && profile.optString("registrationNumber").isBlank()) "Enter the business registration number or choose another registration status." else ""
        else -> ""
    }
    fun save(submit: Boolean) {
        if (busy) return
        error = ""
        if (submit && verificationMissing(profile).isNotEmpty()) { error = "Complete: ${verificationMissing(profile).joinToString(", ")}."; return }
        if (!backend.hasBusiness && !submit) { try { draftVault.write(profile, step); notice = "Draft saved securely on this device for your account. Complete setup to save it to your business." } catch (e: Exception) { error = e.message.orEmpty() }; return }
        busy = true
        scope.launch {
            try {
                if (!backend.hasBusiness) {
                    backend.createBusiness(profile.optString("contactName"), profile.optString("tradingName"), profile.optString("businessAddress"), profile.optString("businessType"))
                    // Retain a recoverable copy in the new business before removing the setup draft.
                    VerificationDraftVault(context, backend.accountId, backend.businessId).write(profile, step)
                    draftVault.clear()
                }
                val result = backend.saveVerification(profile, submit)
                status = result.getJSONObject("verification").optString("status")
                notice = result.optString("message")
                backend.load()
                if (submit) { step = 5; VerificationDraftVault(context, backend.accountId, backend.businessId).clear() }
            } catch (e: Exception) { error = e.message.orEmpty() }
            finally { busy = false }
        }
    }
    Column(Modifier.fillMaxSize().background(Canvas).statusBarsPadding().navigationBarsPadding().imePadding().verticalScroll(rememberScrollState()).padding(22.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        PageTitle(if (manage) "Business verification" else "Set up your business", onBack = if (manage) onComplete else if (step > 0) ({ step-- }) else null)
        if (!loaded) { CircularProgressIndicator(color = Green); return@Column }
        if (backend.hasBusiness && backend.role != "Owner") { AppText("Only the business owner can access private verification details."); PrimaryButton("Return to workspace", onComplete); return@Column }
        Eyebrow("STEP ${step + 1} OF ${titles.size}")
        LinearProgressIndicator(progress = { (step + 1) / titles.size.toFloat() }, modifier = Modifier.fillMaxWidth(), color = Green)
        AppText(titles[step], style = MaterialTheme.typography.headlineLarge)
        if (status.isNotBlank()) AppText(if (status == "submitted") "Readiness recorded · verification pending setup" else "Draft saved", color = Green)
        if (error.isNotBlank()) SurfaceCard(color = RoseMist) { AppText(error, color = Coral) }
        if (notice.isNotBlank()) SurfaceCard(color = Mint) { AppText(notice, color = Green) }
        when (step) {
            0 -> {
                Icon(Icons.Outlined.Storefront, null, tint = Green)
                AppText("Use the name your customers know, and the legal name of your business or its owner.", color = Muted)
                SetupField("Business or trading name", profile.optString("tradingName"), { update("tradingName", it) }, busy)
                SetupField("Legal business or owner name", profile.optString("legalName"), { update("legalName", it) }, busy)
                SheetChoice("Business sector", resolveIndustry(industries, profile.optString("businessType")).id, industries.map { it.id to it.label }, { selected -> update("businessType", industries.first { it.id == selected }.label) })
                SetupField("Business address or trading location", profile.optString("businessAddress"), { update("businessAddress", it) }, busy)
                SurfaceCard(color = Mint) { AppText("Kenya · launch market · KES", color = Green); AppText("We are starting in Kenya. Other African countries are coming soon.", color = Muted) }
                TextButton(onClick = { expanding = true }) { AppText("View African expansion markets", color = Green) }
            }
            1 -> {
                AppText("Use the details of an owner authorised to confirm this business. These details stay private from staff and customers.", color = Muted)
                SetupField("Owner contact name", profile.optString("contactName"), { update("contactName", it) }, busy)
                SetupField("Contact phone", profile.optString("phone"), { update("phone", it) }, busy, KeyboardType.Phone)
                SetupField("Contact email", profile.optString("email"), { update("email", it.trim()) }, busy, KeyboardType.Email)
            }
            2 -> {
                SetupField("Years trading", profile.optInt("yearsTrading").toString(), { update("yearsTrading", it.toIntOrNull() ?: -1) }, busy, KeyboardType.Number)
                SetupField("People working in the business", profile.optInt("employees").toString(), { update("employees", it.toIntOrNull() ?: 0) }, busy, KeyboardType.Number)
                SheetChoice("Typical monthly revenue (KES)", profile.optString("revenueBand"), listOf("prefer_not_to_say" to "Prefer not to say", "under_50000" to "Below 50,000", "50000_250000" to "50,000–250,000", "250000_1000000" to "250,000–1,000,000", "over_1000000" to "Over 1,000,000"), { update("revenueBand", it) })
                AppText("Choose your starting tools", fontWeight = FontWeight.Bold)
                val tools = profile.optJSONArray("tools") ?: JSONArray()
                listOf("Sales", "Stock", "Customers", "Suppliers", "Reports", "Funding").forEach { tool ->
                    val current = (0 until tools.length()).map { tools.getString(it) }
                    Row(verticalAlignment = Alignment.CenterVertically) { Checkbox(checked = tool in current, onCheckedChange = { selected -> update("tools", JSONArray(if (selected) current + tool else current - tool)) }, enabled = !busy); AppText(tool) }
                }
            }
            3 -> {
                Icon(Icons.Outlined.Shield, null, tint = Green)
                AppText("Prepare your business verification details. An identity verification provider is not connected yet.", color = Muted)
                SheetChoice("Business registration status", profile.optString("registrationStatus"), listOf("registered" to "Registered business", "unregistered" to "Not registered / sole trader", "in_progress" to "Registration in progress"), { update("registrationStatus", it) })
                if (profile.optString("registrationStatus") == "registered") SetupField("Business registration number", profile.optString("registrationNumber"), { update("registrationNumber", it) }, busy)
                SurfaceCard(color = Sand) { AppText("Do not provide a national ID, passport, tax PIN, bank password or biometric data. Only a business registration reference is requested here.", color = Ink) }
                AppText("Complete these mandatory business details to unlock workspace features. Identity verification and funding providers will be added later. No verified identity or funding eligibility is implied.", color = Muted)
            }
            4 -> {
                SurfaceCard { AppText(profile.optString("tradingName"), fontWeight = FontWeight.Bold); AppText("${profile.optString("legalName")}\n${profile.optString("contactName")} · ${profile.optString("phone")}\n${profile.optString("businessAddress")}, Kenya\n${profile.optString("businessType")}", color = Muted) }
                Row(verticalAlignment = Alignment.Top) { Checkbox(checked = profile.optBoolean("declaration"), onCheckedChange = { update("declaration", it) }, enabled = !busy); AppText("I am authorised to provide these business details and confirm they are accurate to the best of my knowledge.", modifier = Modifier.weight(1f)) }
                AppText("Only the owner can access these private readiness details. Recording them is not verification, a lender submission or approval. You can edit or clear them later.", color = Muted)
                PolicyLinks()
            }
            5 -> {
                AppText("Your business details and readiness profile are saved. Identity verification and lender services remain pending setup.", color = Muted)
                PrimaryButton("Open workspace", onComplete, tone = Green)
            }
        }
        if (busy) LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Green)
        if (step < 5) {
            PrimaryButton(if (busy) "Saving…" else if (step == 4) "Finish setup" else "Continue", { val invalid = validateStep(); if (invalid.isNotBlank()) error = invalid else if (step < 4) { error = ""; step++ } else save(true) }, enabled = !busy, tone = Green)
            TextButton(enabled = !busy, onClick = {
                if (backend.hasBusiness) { onComplete() }
                else if (profile.optString("tradingName").isBlank() || profile.optString("businessAddress").isBlank()) { error = "Enter your business name and trading location before opening the workspace."; step = 0 }
                else {
                    busy = true; error = ""
                    scope.launch {
                        try {
                            backend.createBusiness(profile.optString("contactName").ifBlank { backend.accountName.ifBlank { "Business owner" } }, profile.optString("tradingName"), profile.optString("businessAddress"), profile.optString("businessType"))
                            VerificationDraftVault(context, backend.accountId, backend.businessId).write(profile, step)
                            draftVault.clear(); onComplete()
                        } catch (e: Exception) { error = e.message.orEmpty() } finally { busy = false }
                    }
                }
            }) { AppText("Verify later · open locked workspace", color = Green) }
            AppText("Skipping keeps business features locked until the required readiness details are completed.", color = Muted)
            TextButton(enabled = !busy, onClick = { save(false) }) { AppText("Save draft and continue later", color = Green) }
            if (manage && status.isNotBlank()) TextButton(enabled = !busy, onClick = { clearing = true }) { AppText("Clear private readiness details", color = Coral) }
            if (step > 0) TextButton(enabled = !busy, onClick = { step--; error = "" }) { AppText("Back", color = Muted) }
        }
        if (!manage && !backend.hasBusiness) TextButton(enabled = !busy, onClick = { backend.action { backend.signOut() } }) { AppText("Sign out", color = Muted) }
    }
    if (expanding) ActionSheet(onDismissRequest = { expanding = false }, title = { AppText("Africa · coming soon", style = MaterialTheme.typography.headlineSmall) }, text = { Column(verticalArrangement = Arrangement.spacedBy(12.dp)) { AppText("Kenya launches first. Availability, verification and funding in other countries are not yet supported.", color = Muted); listOf("Uganda", "Tanzania", "Rwanda", "Ghana", "Nigeria", "South Africa", "Ethiopia", "Zambia", "Other African markets").forEach { AppText("$it · Coming soon") } } }, dismissButton = { TextButton(onClick = { expanding = false }) { AppText("Close") } })
    if (clearing) ActionSheet(onDismissRequest = { clearing = false }, title = { AppText("Clear readiness details?", style = MaterialTheme.typography.headlineSmall) }, text = { AppText("Your business records and any funding request history remain saved.") }, confirmButton = { PrimaryButton("Clear readiness details", { busy = true; scope.launch { try { notice = backend.clearVerification().optString("message"); backend.load(); saved = emptyVerificationProfile(backend.accountName, backend.accountEmail).toString(); status = ""; step = 0; clearing = false } catch (e: Exception) { error = e.message.orEmpty() } finally { busy = false } } }, enabled = !busy, tone = Coral) }, dismissButton = { TextButton(onClick = { clearing = false }) { AppText("Keep details") } })
}

@Composable
private fun SetupField(label: String, value: String, onChange: (String) -> Unit, busy: Boolean, keyboard: KeyboardType = KeyboardType.Text) {
    OutlinedTextField(value, onChange, label = { AppText(label) }, enabled = !busy, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = keyboard), modifier = Modifier.fillMaxWidth())
}

@Composable
private fun PolicyLinks() {
    val context = LocalContext.current
    FlowRow(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        listOf("Privacy" to "/privacy", "Terms" to "/terms", "Cookies" to "/cookies", "Help" to "/help").forEach { (label, path) ->
            TextButton(onClick = { openServiceWebsite(context, path) }) { AppText(label, color = Green, fontSize = 12.sp) }
        }
    }
}
