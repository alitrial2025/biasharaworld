package com.biashara.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.biashara.app.data.*

@Composable
private fun LiveFormError(store:DemoStore){store.backend?.error?.takeIf{it.isNotBlank()}?.let{AppText(it,color=Coral)}}

@Composable
fun LiveSuppliersScreen(store:DemoStore,onBack:()->Unit){
 var adding by remember{mutableStateOf(false)};var name by remember{mutableStateOf("")};var fee by remember{mutableStateOf("0")}
 var supplierId by remember{mutableStateOf("")};var productId by remember{mutableIntStateOf(0)};var quote by remember{mutableStateOf("")}
 Page {
  PageTitle("Suppliers",onBack=onBack)
  AppText("Your supplier directory and recorded quotes. Purchase orders are internal records; contact the supplier to arrange delivery.")
  PrimaryButton("Add supplier",{adding=true},tone=Green)
  if(store.suppliers.isEmpty())EmptyState("Your first supplier","Add the suppliers you buy from. No sample listings are imported.")
  store.liveState.records("suppliers").forEach{s->SurfaceCard{AppText(s.optString("name"),style=MaterialTheme.typography.titleLarge);AppText(s.optString("category"));AppText("Delivery fee: "+minorMoney(kotlin.math.round(s.optDouble("deliveryFee")*100).toLong()));PrimaryButton("Record a quote",{supplierId=s.optString("id");productId=store.products.firstOrNull()?.id?:0},enabled=store.products.isNotEmpty(),tone=Green)}}
 }
 if(adding)AlertDialog(onDismissRequest={adding=false},title={AppText("Add supplier")},text={Column(verticalArrangement=Arrangement.spacedBy(12.dp)){OutlinedTextField(name,{name=it},label={AppText("Supplier name")});OutlinedTextField(fee,{fee=it},label={AppText("Delivery fee (KES)")});LiveFormError(store)}},confirmButton={TextButton(onClick={store.backend?.action{store.backend?.command(json("type" to "addSupplier","name" to name.trim(),"category" to "Groceries","description" to "","delivery" to "Arrange with supplier","minimum" to 0,"deliveryFee" to parseMinor(fee)/100.0));adding=false;name=""}}){AppText("Save supplier")}},dismissButton={TextButton(onClick={adding=false}){AppText("Cancel")}})
 if(supplierId.isNotBlank())AlertDialog(onDismissRequest={supplierId=""},title={AppText("Record supplier quote")},text={Column(verticalArrangement=Arrangement.spacedBy(12.dp)){store.products.forEach{p->Row{RadioButton(selected=productId==p.id,onClick={productId=p.id});AppText(p.name)}};OutlinedTextField(quote,{quote=it},label={AppText("Quoted unit cost (KES)")});LiveFormError(store)}},confirmButton={TextButton(onClick={store.backend?.action{store.backend?.command(json("type" to "supplierQuote","id" to supplierId,"productId" to productId,"cost" to parseMinor(quote)/100.0));supplierId="";quote=""}}){AppText("Save quote")}},dismissButton={TextButton(onClick={supplierId=""}){AppText("Cancel")}})
}

@Composable
fun LiveTeamScreen(store:DemoStore,onBack:()->Unit){
 var adding by remember{mutableStateOf(false)};var name by remember{mutableStateOf("")};var email by remember{mutableStateOf("")};var role by remember{mutableStateOf("Cashier")}
 Page {
  PageTitle("Your team",onBack=onBack)
  AppText("Invited teammates join after signing up and confirming the invited email. Invitation email delivery is not connected yet.")
  if(store.backend?.role=="Owner")PrimaryButton("Invite teammate",{adding=true},tone=Green)
  store.liveState.records("members").forEach{m->SurfaceCard{AppText(m.optString("name"),style=MaterialTheme.typography.titleMedium);AppText(m.optString("email"));AppText(m.optString("role")+" · "+m.optString("status"));if(store.backend?.role=="Owner"&&m.optString("role")!="Owner"){FilterPills(listOf("Manager","Cashier","Viewer"),m.optString("role"),{next->store.backend?.action{store.backend?.command(json("type" to "updateMember","id" to m.optInt("id"),"role" to next))}});TextButton(onClick={store.backend?.action{store.backend?.command(json("type" to "removeMember","id" to m.optInt("id")))}}){AppText("Remove access",color=Coral)}}}}
 }
 if(adding)AlertDialog(onDismissRequest={adding=false},title={AppText("Invite teammate")},text={Column(verticalArrangement=Arrangement.spacedBy(12.dp)){OutlinedTextField(name,{name=it},label={AppText("Name")});OutlinedTextField(email,{email=it},label={AppText("Email address")});FilterPills(listOf("Manager","Cashier","Viewer"),role,{role=it});LiveFormError(store)}},confirmButton={TextButton(onClick={store.backend?.action{store.backend?.command(json("type" to "inviteMember","member" to json("name" to name.trim(),"email" to email.trim(),"role" to role)));adding=false;name="";email=""}}){AppText("Save invitation")}},dismissButton={TextButton(onClick={adding=false}){AppText("Cancel")}})
}
