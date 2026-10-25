package com.biashara.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.biashara.app.data.*
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.UUID

@Composable
fun ConnectedFundingScreen(
    store: DemoStore,
    onBack: () -> Unit,
    onReports: () -> Unit,
    onVerification: () -> Unit,
    repositoryFactory: (android.content.Context, LiveBackend) -> FundingRepository = { context, backend -> FundingRepository(context, backend) },
) {
    val backend = store.backend
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val repository = remember(backend?.businessId, backend?.accountId) { backend?.let { repositoryFactory(context, it) } }
    var snapshot by remember(repository) { mutableStateOf<JSONObject?>(null) }
    var error by remember(repository) { mutableStateOf("") }
    var notice by remember(repository) { mutableStateOf("") }
    var busy by remember(repository) { mutableStateOf(false) }
    var loading by remember(repository) { mutableStateOf(true) }
    var pending by remember(repository) { mutableStateOf(false) }
    var editor by rememberSaveable(backend?.accountId, backend?.businessId) { mutableStateOf<String?>(null) }
    var step by rememberSaveable(backend?.accountId, backend?.businessId) { mutableIntStateOf(0) }
    var detail by remember(repository) { mutableStateOf<JSONObject?>(null) }
    var withdraw by remember(repository) { mutableStateOf<JSONObject?>(null) }
    val owner = backend?.role == "Owner"
    fun refresh() {
        if (repository == null || !owner || busy) return
        loading = true; error = ""
        scope.launch {
            try { pending = repository.pending() != null; snapshot = repository.load() }
            catch (e: Exception) { error = e.message ?: "Could not load funding requests." }
            finally { loading = false }
        }
    }
    LaunchedEffect(repository, owner) { if (owner) refresh() else loading = false }
    fun save(action: String, record: JSONObject?, retry: Boolean = false) {
        if (repository == null || busy) return
        busy = true; error = ""; notice = ""
        scope.launch {
            try {
                val result = if (retry) repository.retry() else repository.save(record!!.getString("id"),record.optLong("revision"),action,record.getJSONObject("payload"))
                val changed = result.getJSONObject("application")
                val previous = snapshot?.optJSONArray("applications")
                val rows = org.json.JSONArray().put(changed)
                if (previous != null) for (i in 0 until previous.length()) if (previous.getJSONObject(i).optString("id") != changed.getString("id")) rows.put(previous.getJSONObject(i))
                snapshot = JSONObject(snapshot?.toString() ?: "{}").put("applications",rows)
                editor = null; detail = null; withdraw = null
                notice = when (changed.optString("status")) { "submitted" -> "Funding request recorded. A lending provider is not connected; no credit check or lender submission has taken place."; "withdrawn" -> "Funding request withdrawn."; else -> "Funding draft saved to your business account." }
            } catch (e: Exception) { error = e.message ?: "Save unconfirmed. Retry the saved request safely." }
            finally { pending = runCatching { repository.pending() != null }.getOrDefault(true); busy = false }
        }
    }
    fun openWeb(path: String) { openServiceWebsite(context,path) }
    val records = snapshot?.optJSONArray("applications")
    val readiness = snapshot?.optJSONObject("readiness")
    val verificationReady = snapshot?.optString("verificationStatus") == "submitted"
    val formStatus: @Composable () -> Unit = {
        if (error.isNotBlank()) SurfaceCard(color = RoseMist) { AppText(error, color = Coral) }
        if (busy) { LinearProgressIndicator(Modifier.fillMaxWidth(), color = Green); AppText("Saving funding request…", color = Muted) }
        if (pending && !busy) { AppText("A funding save is unconfirmed. Retry its original request safely.", color = Muted); PrimaryButton("Retry funding request", { save("",null,true) }, tone = Green) }
    }
    Page {
        PageTitle("Business funding", "Plan carefully. Keep your options clear.", onBack = onBack)
        if (!owner) {
            SurfaceCard {
                AppText("Owner access required", style = MaterialTheme.typography.titleLarge)
                AppText("Funding requests and financial plans are private to the business owner.", color = Muted)
            }
        } else {
            SurfaceCard(color = Mint) {
                Eyebrow("Kenya · launch market", Green)
                AppText("Prepare your next chapter", style = MaterialTheme.typography.headlineSmall)
                AppText("Prepare a funding request in KES and keep a clear financial picture.", color = Ink)
                FundingNoticeLabel("Lending-provider setup is pending", Green, Surface)
                AppText("No offer, approval, credit check or disbursement is created.", style = MaterialTheme.typography.bodySmall, color = Muted)
                AppText("Other African markets — Uganda, Tanzania, Rwanda, Ghana, Nigeria, South Africa and more — coming soon.", style = MaterialTheme.typography.bodySmall, color = Muted)
            }
            formStatus()
            if (notice.isNotBlank()) SurfaceCard(color = Mint) { AppText(notice, color = Ink) }
            if (loading) {
                LinearProgressIndicator(Modifier.fillMaxWidth(), color = Green)
                AppText("Loading funding requests…", color = Muted)
            }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                OutlinedButton(onClick = { refresh() }, enabled = !busy && !loading) { AppText("Refresh requests") }
                TextButton(onClick = onReports) { AppText("Business reports", color = Green) }
            }
            if (readiness != null) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    AppText("Your funding readiness", style = MaterialTheme.typography.titleLarge)
                    AppText("These checks describe record completeness, not creditworthiness or guaranteed finance.", color = Muted)
                    SurfaceCard {
                        FundingMetric("Net sales · 30 days", minorMoney(kotlin.math.round(readiness.optDouble("sales30") * 100).toLong()))
                        HorizontalDivider(color = Line)
                        FundingMetric("Operating profit · 30 days", minorMoney(kotlin.math.round(readiness.optDouble("profit30") * 100).toLong()))
                        HorizontalDivider(color = Line)
                        FundingMetric("Recorded receipts", readiness.optInt("receipts30").toString())
                    }
                    SurfaceCard(color = if (verificationReady) Mint else Sand) {
                        Eyebrow("Business details", if (verificationReady) Green else Amber)
                        AppText(
                            if (verificationReady) "Business verification readiness submitted. Identity verification provider setup is pending."
                            else "Submit your business verification readiness before recording a funding request.",
                            color = Ink,
                        )
                        TextButton(onClick = onVerification, modifier = Modifier.fillMaxWidth()) {
                            AppText("Review business verification readiness", color = Green)
                        }
                    }
                }
            }
            PrimaryButton("New funding request", {
                editor = json("id" to UUID.randomUUID().toString(), "revision" to 0, "payload" to emptyFundingDraft(backend?.accountEmail.orEmpty(), store.liveState.optJSONObject("profile")?.optString("phone").orEmpty())).toString()
                step = 0; error = ""
            }, enabled = !busy && !pending && snapshot != null, tone = Green)
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                AppText("Your requests and drafts", style = MaterialTheme.typography.titleLarge)
                if (records == null || records.length() == 0) SurfaceCard {
                    AppText("Start with a clear plan", style = MaterialTheme.typography.titleMedium)
                    AppText("Create a draft, save it to your account and return when your business information is ready.", color = Muted)
                }
                if (records != null) for (i in 0 until records.length()) {
                    val record = records.getJSONObject(i)
                    val payload = record.getJSONObject("payload")
                    val status = record.getString("status")
                    SurfaceCard {
                        FundingNoticeLabel(fundingStatus(status), if (status == "submitted") Green else Muted, if (status == "submitted") Mint else Canvas)
                        AppText("${payload.optString("amount").ifBlank { "Amount not entered" }} KES · ${payload.optString("purpose")}", style = MaterialTheme.typography.titleMedium)
                        AppText("Reference ${record.getString("id").take(8)} · updated ${record.optString("updated_at").take(10)}", style = MaterialTheme.typography.bodySmall, color = Muted)
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            OutlinedButton(onClick = { if (status == "draft") { editor = record.toString(); step = 0 } else detail = record }, enabled = !busy && !pending) {
                                AppText(if (status == "draft") "Continue draft" else "View request")
                            }
                            if (status != "withdrawn") TextButton(onClick = { withdraw = record }, enabled = !busy && !pending) { AppText("Withdraw", color = Coral) }
                        }
                    }
                }
            }
            FundingCalculatorSheet()
            SurfaceCard {
                AppText("Before you borrow", style = MaterialTheme.typography.titleLarge)
                AppText("Compare total repayment, fees, due dates, late charges, collateral and early-settlement terms directly with a licensed provider. Borrowing is optional.", color = Muted)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(onClick = { openWeb("/help") }) { AppText("Help", color = Green) }
                    TextButton(onClick = { openWeb("/privacy") }) { AppText("Privacy", color = Green) }
                    TextButton(onClick = { openWeb("/terms") }) { AppText("Terms", color = Green) }
                }
            }
        }
    }
    editor?.let { serialized ->
        val record = JSONObject(serialized); val draft = record.getJSONObject("payload")
        fun change(name: String, value: Any) { draft.put(name,value); record.put("payload",draft); editor = record.toString() }
        val disabled = busy || pending
        ActionSheet(onDismissRequest = { if (!busy) editor = null }, title = { AppText("Prepare your funding request", style = MaterialTheme.typography.headlineSmall) }, text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                AppText("Step ${step + 1} of 4 · ${listOf("Funding needs","Business finances","Contact details","Review and consent")[step]}", style = MaterialTheme.typography.labelLarge, color = Green)
                LinearProgressIndicator(progress = { (step + 1) / 4f }, modifier = Modifier.fillMaxWidth(), color = Green, trackColor = Mint)
                @Composable fun field(name: String, label: String, numeric: Boolean = false, multiline: Boolean = false) { OutlinedTextField(draft.optString(name), { change(name,it) }, label = { AppText(label) }, modifier = Modifier.fillMaxWidth(), enabled = !disabled, singleLine = !multiline, minLines = if (multiline) 3 else 1, keyboardOptions = KeyboardOptions(keyboardType = if (numeric) KeyboardType.Decimal else KeyboardType.Text)) }
                when (step) {
                    0 -> { field("amount","Requested amount (KES)",true); if (disabled) AppText("Purpose: ${draft.optString("purpose")}") else SheetChoice("What would you use it for?",draft.optString("purpose"),listOf("Stock","Equipment","Working capital","Expansion","Other").map { it to it },{ change("purpose",it) }); field("months","Requested repayment months",true); AppText("Requested terms express your needs. A provider has not offered these terms.", color = Muted) }
                    1 -> { field("monthlyRevenue","Typical monthly revenue (KES)",true); field("monthlyCosts","Typical monthly business costs (KES)",true); field("monthlyDebtPayments","Existing monthly debt payments (KES)",true); field("tradingYears","Years trading",true); field("registrationNumber","Business registration number (optional)"); field("plan","How would the funding help, and how would you repay it?",multiline = true) }
                    2 -> { field("contactEmail","Contact email"); field("contactPhone","Contact phone"); AppText("Do not enter bank passwords, payment PINs or government identity numbers here.", color = Muted) }
                    else -> { SurfaceCard(color = Canvas) { Eyebrow("Request summary"); AppText("Kenya · KES\n${draft.optString("amount").ifBlank { "Amount not entered" }} · ${draft.optString("purpose")}\n${draft.optString("months")} requested months\n${draft.optString("contactEmail")} · ${draft.optString("contactPhone")}"); AppText(draft.optString("plan").ifBlank { "Add a business plan before recording this request." }) }; Row(verticalAlignment = Alignment.Top) { Checkbox(draft.optBoolean("consent"), { change("consent",it) }, enabled = !disabled); AppText("I confirm these figures and consent to storing this request with BiasharaOS. No data is sent to a lender.", modifier = Modifier.weight(1f)) }; if (!verificationReady) AppText("Submit business verification readiness before recording this request. You can save a draft now.", color = Coral); TextButton(onClick = { openWeb("/privacy") }) { AppText("Read privacy policy", color = Green) } }
                }
                formStatus()
            }
        }, confirmButton = {
            PrimaryButton(if (step < 3) "Continue" else "Record funding request", { if (step < 3) step++ else save("submit",record) }, enabled = !disabled && (step < 3 || (draft.optBoolean("consent") && verificationReady)), tone = Green)
            OutlinedButton(onClick = { save("save",record) }, enabled = !disabled, modifier = Modifier.fillMaxWidth()) { AppText("Save draft") }
        }, dismissButton = { FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) { if (step > 0) TextButton(onClick = { step-- }, enabled = !disabled) { AppText("Back") }; TextButton(onClick = { editor = null }, enabled = !busy) { AppText("Close") } } })
    }
    detail?.let { record ->
        ActionSheet(
            onDismissRequest = { detail = null },
            title = { AppText("Funding request details", style = MaterialTheme.typography.headlineSmall) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    val payload = record.getJSONObject("payload")
                    FundingNoticeLabel(fundingStatus(record.optString("status")), Green, Mint)
                    SurfaceCard(color = Canvas) {
                        AppText("${payload.optString("amount")} KES · ${payload.optString("purpose")}\n${payload.optString("months")} requested months\n${payload.optString("plan")}")
                    }
                    AppText("No request has been sent to a lender. No offer or eligibility decision has been made.", color = Muted)
                    AppText("Activity", style = MaterialTheme.typography.titleMedium)
                    val history = record.optJSONArray("history")
                    if (history != null) for (i in 0 until history.length()) {
                        val event = history.getJSONObject(i)
                        AppText("${when(event.optString("action")) { "save" -> "Draft saved"; "submit" -> "Request recorded · provider pending"; else -> "Request withdrawn" }} · ${event.optString("at").take(10)}", style = MaterialTheme.typography.bodyMedium)
                        if (i < history.length() - 1) HorizontalDivider(color = Line)
                    }
                }
            },
            dismissButton = { TextButton(onClick = { detail = null }) { AppText("Close") } },
        )
    }
    withdraw?.let { record -> ActionSheet(onDismissRequest = { if (!busy) withdraw = null }, title = { AppText("Withdraw this funding request?", style = MaterialTheme.typography.headlineSmall) }, text = { Column(verticalArrangement = Arrangement.spacedBy(12.dp)) { AppText("It will remain in your private history and cannot be edited after withdrawal."); formStatus() } }, confirmButton = { PrimaryButton("Withdraw request", { save("withdraw",record) }, enabled = !busy && !pending, tone = Coral) }, dismissButton = { TextButton(onClick = { withdraw = null }, enabled = !busy) { AppText("Keep request") } }) }
}

@Composable
private fun FundingCalculatorSheet() {
    var open by rememberSaveable { mutableStateOf(false) }
    var amount by rememberSaveable { mutableStateOf("") }; var months by rememberSaveable { mutableStateOf("6") }; var rate by rememberSaveable { mutableStateOf("") }; var fees by rememberSaveable { mutableStateOf("0") }
    SurfaceCard { AppText("Compare quoted funding terms", style = MaterialTheme.typography.titleLarge); AppText("Enter terms received directly from a provider. This is a comparison estimate, not an offer.", color = Muted); TextButton(onClick = { open = true }) { AppText("Open repayment calculator", color = Green) } }
    if (open) ActionSheet(onDismissRequest = { open = false }, title = { AppText("Compare quoted terms", style = MaterialTheme.typography.headlineSmall) }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            AppText("Assumes equal monthly repayments on a reducing balance and fees paid separately. A provider’s schedule may differ.", color = Muted)
            OutlinedTextField(amount,{ amount = it },label = { AppText("Amount (KES)") },keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),modifier = Modifier.fillMaxWidth())
            OutlinedTextField(months,{ months = it },label = { AppText("Months") },keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),modifier = Modifier.fillMaxWidth())
            OutlinedTextField(rate,{ rate = it },label = { AppText("Quoted annual interest (%)") },keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),modifier = Modifier.fillMaxWidth())
            OutlinedTextField(fees,{ fees = it },label = { AppText("Total fees (KES)") },keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),modifier = Modifier.fillMaxWidth())
            if (amount.isNotBlank() && rate.isNotBlank()) {
                val result = runCatching { compareFundingTerms(parseMinor(amount),wholeInput(months,"Months",1),rate.toDouble(),parseMinor(fees)) }
                result.getOrNull()?.let { SurfaceCard(color = Mint) { FundingMetric("Estimated monthly repayment", minorMoney(it.monthly)); HorizontalDivider(color = Line); FundingMetric("Total including fees", minorMoney(it.total)); HorizontalDivider(color = Line); FundingMetric("Finance cost", minorMoney(it.cost)) } } ?: AppText(result.exceptionOrNull()?.message ?: "Check the terms.",color = Coral)
            }
        }
    }, dismissButton = { TextButton(onClick = { open = false }) { AppText("Close") } })
}

@Composable
private fun FundingMetric(label: String, value: String) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        AppText(label, style = MaterialTheme.typography.bodySmall, color = Muted)
        AppText(value, style = MaterialTheme.typography.headlineSmall, color = Ink)
    }
}

@Composable
private fun FundingNoticeLabel(text: String, color: Color, background: Color) {
    androidx.compose.material3.Surface(color = background, shape = RoundedCornerShape(10.dp)) {
        AppText(text, style = MaterialTheme.typography.labelMedium, color = color, modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp))
    }
}
