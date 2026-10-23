package com.biashara.app.ui
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.biashara.app.data.*

@Composable
fun LiveReportsScreen(store:DemoStore,onBack:()->Unit) {
 var period by remember{mutableStateOf("Today")};var adding by remember{mutableStateOf(false)}
 var name by remember{mutableStateOf("")};var amount by remember{mutableStateOf("")}
 val report=store.report(if(period=="Today")1 else if(period=="Week")7 else 30)
 Page {
  PageTitle("Business Reports",onBack=onBack)
  FilterPills(listOf("Today","Week","Month"),period,{period=it})
  SurfaceCard {Eyebrow("Recorded net sales");AppText(minorMoney(report.sales),style=MaterialTheme.typography.headlineLarge);SalesChart(bars=false,series=report.series)}
  SurfaceCard {Eyebrow("Operating profit");AppText(minorMoney(report.profit),style=MaterialTheme.typography.headlineMedium);AppText("Recorded sales less item costs, refunds and expenses.")}
  SurfaceCard {Eyebrow("Expenses");AppText(minorMoney(report.expenses),style=MaterialTheme.typography.headlineMedium)}
  SurfaceCard {Eyebrow("Transactions");AppText(report.receipts.size.toString());AppText("Average sale: "+minorMoney(if(report.receipts.isEmpty())0L else report.sales/report.receipts.size))}
  PrimaryButton("Record expense",{adding=true},tone=Green)
  store.liveState.records("expenses").forEach {e->SurfaceCard {AppText(e.optString("name"));AppText(minorMoney(kotlin.math.round(e.optDouble("amount")*100).toLong())+" · "+e.optString("date"))}}
  AppText("Record payments after you receive them. Online payments are coming later.")
 }
 if(adding)AlertDialog(onDismissRequest={adding=false},title={AppText("Record expense")},text={Column(verticalArrangement=Arrangement.spacedBy(12.dp)){OutlinedTextField(name,{name=it},label={AppText("Expense name")});OutlinedTextField(amount,{amount=it},label={AppText("Amount (KES)")});store.backend?.error?.takeIf{it.isNotBlank()}?.let{AppText(it,color=Coral)}}},confirmButton={TextButton(onClick={store.backend?.action{val minor=parseMinor(amount);require(minor>0){"Enter a positive amount."};store.backend?.command(json("type" to "addExpense","expense" to json("name" to name.trim(),"category" to "Other","amount" to minor/100.0,"date" to todayLocal(),"method" to "Cash")));adding=false;name="";amount=""}}){AppText("Save expense")}},dismissButton={TextButton(onClick={adding=false}){AppText("Cancel")}})
}
