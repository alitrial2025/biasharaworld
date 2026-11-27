package com.biashara.app.data
import java.time.LocalDate
import org.json.JSONObject

data class BusinessReport(val sales:Long,val expenses:Long,val cost:Long,val receipts:List<JSONObject>,val series:List<Float>) {
 val profit get()=sales-expenses-cost
}
fun DemoStore.report(days:Int=1):BusinessReport {
 val end=todayLocal();val start=LocalDate.parse(end).minusDays(days.toLong()-1).toString()
 val branch = operations.branch
 val branchReceipts = operations.state.records("receipts").filter { it.optString("branch") == branch }
 val receiptsById = branchReceipts.associateBy { it.optInt("id") }
 val receipts = branchReceipts.filter { it.optString("date") in start..end }
 val refunds = operations.state.records("returns").filter {
  it.optString("date") in start..end && receiptsById.containsKey(it.optInt("saleId"))
 }
 val revenue=receipts.sumOf{it.optLong("total")}-refunds.sumOf{it.optLong("amount")}
 val expense=liveState.records("expenses").filter{it.optString("date") in start..end}.sumOf{kotlin.math.round(it.optDouble("amount")*100).toLong()}
 val cost=receipts.sumOf{it.records("lines").sumOf{l->l.optLong("cost")*l.optInt("quantity")}}-refunds.filter{it.optBoolean("restock")}.sumOf{r->(receiptsById[r.optInt("saleId")]?.records("lines")?.firstOrNull{it.optInt("productId")==r.optInt("productId")}?.optLong("cost")?:0L)*r.optInt("quantity")}
 val totals=List(days.coerceAtLeast(2)){index->val date=LocalDate.parse(start).plusDays(index.toLong()).toString();receipts.filter{it.optString("date")==date}.sumOf{it.optLong("total")}.toFloat()}
 return BusinessReport(revenue,expense,cost,receipts,totals)
}
