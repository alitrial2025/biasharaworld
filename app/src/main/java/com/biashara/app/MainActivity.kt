package com.biashara.app

import android.app.Application
import android.content.Intent
import androidx.lifecycle.ViewModelProvider
import com.biashara.app.data.LiveBackend
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.biashara.app.data.DemoPersistence
import com.biashara.app.data.DemoStore
import com.biashara.app.data.objectAt
import com.biashara.app.ui.*

class ShopViewModel(application: Application) : AndroidViewModel(application) {
    private val ephemeral=System.getProperty("biashara.demo.ephemeral")=="true"
    val store = DemoStore(real=!ephemeral)
    val backend:LiveBackend? = if(ephemeral)null else LiveBackend(application,viewModelScope,store)
    init {store.backend=backend;backend?.start()}

}

class MainActivity : ComponentActivity() {
    override fun onNewIntent(intent:Intent){super.onNewIntent(intent);setIntent(intent);ViewModelProvider(this)[ShopViewModel::class.java].backend?.handleLink(intent.data)}
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        ViewModelProvider(this)[ShopViewModel::class.java].backend?.handleLink(intent?.data)
        setContent {
            val model: ShopViewModel = viewModel()
            val entryPrefs = remember { getSharedPreferences("biashara_entry", MODE_PRIVATE) }
            var introComplete by rememberSaveable { mutableStateOf(entryPrefs.getBoolean("welcome_complete", false)) }
            var entryMode by rememberSaveable { mutableStateOf("login") }
            var setupInProgress by rememberSaveable(model.backend?.accountId) { mutableStateOf(false) }
            BiasharaTheme(model.store.operations.state.objectAt("preferences")) {
                val backend=model.backend
                when {
                    backend!=null&&!backend.ready->Box(Modifier.fillMaxSize(),contentAlignment=Alignment.Center){CircularProgressIndicator(color=Green)}
                    backend!=null&&!backend.authenticated&&!backend.recovery&&!introComplete->WelcomeOnboardingScreen(
                        onCreateAccount = { entryMode = "signup"; introComplete = true; entryPrefs.edit().putBoolean("welcome_complete", true).apply() },
                        onSignIn = { entryMode = "login"; introComplete = true; entryPrefs.edit().putBoolean("welcome_complete", true).apply() },
                    )
                    backend!=null&&backend.authenticated&&!backend.recovery&&(setupInProgress||(backend.workspaceLoaded&&!backend.hasBusiness))->BusinessOnboardingScreen(backend, onStarted = { setupInProgress = true }, onComplete = { setupInProgress = false })
                    backend!=null&&(!backend.authenticated||!backend.hasBusiness||backend.recovery)->AccountScreen(backend, initialMode = entryMode)
                    else->BiasharaApp(model)
                }
            }
        }
    }
}

@Composable
fun BiasharaApp(model: ShopViewModel = viewModel()) {
    val store = model.store
    val online = rememberDeviceOnline()
    var routes by rememberSaveable { mutableStateOf<List<String>>(listOf(Screen.HOME.name)) }
    val tool = routes.last().substringAfter(":", "scanner")
    var supplier by rememberSaveable { mutableIntStateOf(0) }
    val supplierCart = store.supplierCart
    val screen = Screen.valueOf(routes.last().substringBefore(":"))
    val navigate: (Screen) -> Unit = { target ->
        routes =
            when {
                target in listOf(Screen.HOME, Screen.SALES, Screen.STOCK, Screen.MORE) ->
                    arrayListOf(target.name)
                target.name in routes -> ArrayList(routes.take(routes.indexOf(target.name) + 1))
                else -> ArrayList(routes + target.name)
            }
    }
    val back: () -> Unit = {
        routes =
            if (routes.size > 1) ArrayList(routes.dropLast(1)) else arrayListOf(Screen.HOME.name)
    }
    BackHandler(screen != Screen.HOME, onBack = back)
    val focused = screen in listOf(Screen.NEW_SALE, Screen.ASSISTANT, Screen.SETUP)
    val openTool: (String) -> Unit = { target ->
        if (target == "checkout") navigate(Screen.NEW_SALE)
        else {
            val route = "${Screen.FEATURE.name}:$target"
            if (routes.last() != route) routes = routes + route
        }
    }
    Box(Modifier.fillMaxSize().background(Canvas), contentAlignment = Alignment.TopCenter) {
        Scaffold(
            modifier = Modifier.widthIn(max = 600.dp).fillMaxSize(),
            containerColor = Canvas,
            contentWindowInsets =
                WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal),
            bottomBar = { if (!focused) BottomBar(screen, navigate) },
        ) { padding ->
            Column(Modifier.fillMaxSize().padding(padding)) {
                val backend=model.backend
                if(backend!=null){
                    Row(Modifier.fillMaxWidth().background(if(backend.error.isBlank())Mint else RoseMist).padding(8.dp),verticalAlignment=Alignment.CenterVertically){
                        AppText(if(backend.busy)"Working…" else backend.error.ifBlank{backend.notice.ifBlank{"Connected · ${backend.role}"}},modifier=Modifier.weight(1f),fontSize=11.sp,color=Ink)
                        TextButton(onClick={if(backend.hasPending)backend.retry()else backend.action{backend.load()}}){AppText(if(backend.hasPending)"Retry" else "Refresh",fontSize=11.sp)}
                    }
                }
                val status = store.operations.state.objectAt("sync").optString("mode")
                if (
                    store.operations.storageWarning.isNotBlank() ||
                        (!store.real && status != "Local only") ||
                        !online
                ) {
                    Row(
                        Modifier.fillMaxWidth()
                            .background(Sand)
                            .clickable { openTool("sync") }
                            .padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        AppText(
                            if (store.operations.storageWarning.isNotBlank())
                                store.operations.storageWarning
                            else
                                (if (!online) tr("Device reports offline") else tr(status)) +
                                    " · " +
                                    tr(if(store.real)"Reconnect before saving." else "Changes stay on this device. No server sync."),
                            modifier = Modifier.weight(1f),
                            fontSize = 11.sp,
                            color = Ink,
                        )
                    }
                }
                Box(Modifier.weight(1f)) {
                    Crossfade(
                        targetState = screen,
                        animationSpec = tween(180),
                        label = "Screen transition",
                    ) { destination ->
                        when (destination) {
                            Screen.HOME ->
                                DashboardScreen(store, navigate, { openTool("branches") }, { id -> routes = routes + "${Screen.STOCK.name}:$id" }, { name -> routes = routes + "${Screen.SUPPLIERS.name}:${android.net.Uri.encode(name)}" })
                            Screen.SALES -> SalesScreen(store, navigate)
                            Screen.NEW_SALE ->
                                NewSaleScreen(store, back, { navigate(Screen.SALES) }, openTool)
                            Screen.STOCK -> InventoryScreen(store, routes.last().substringAfter(":", "").toIntOrNull())
                            Screen.MORE -> MoreScreen(store, navigate)
                            Screen.CUSTOMERS -> CustomersScreen(store, back)
                            Screen.SUPPLIERS ->
                                if(store.real)LiveSuppliersScreen(store,back,openTool,android.net.Uri.decode(routes.last().substringAfter(":", "")))else SuppliersScreen(store, back) { i ->
                                    supplier = i
                                    supplierCart.clear()
                                    navigate(Screen.SUPPLIER)
                                }
                            Screen.SUPPLIER ->
                                SupplierDetailScreen(
                                    store.suppliers[supplier],
                                    store,
                                    supplierCart,
                                    { id, delta ->
                                        val v = (supplierCart[id] ?: 0) + delta
                                        if (v <= 0) supplierCart.remove(id)
                                        else supplierCart[id] = v
                                    },
                                    back,
                                    { navigate(Screen.ORDER) },
                                )
                            Screen.ORDER ->
                                OrderScreen(
                                    store.suppliers[supplier],
                                    store,
                                    supplierCart,
                                    back,
                                    {
                                        supplierCart.clear()
                                        navigate(Screen.SUPPLIERS)
                                    },
                                )
                            Screen.EXPENSES -> if(store.real)LiveReportsScreen(store, back, expensesOnly=true) else ReportsScreen(store, back)
                            Screen.TEAM -> LiveTeamScreen(store, back)
                            Screen.ALERTS -> BusinessAlertsScreen(store, back, openTool)
                            Screen.PREFERENCES -> FeatureScreen(store, "preferences", back, openTool)
                            Screen.REPORTS -> if(store.real)LiveReportsScreen(store,back)else ReportsScreen(store, back)
                            Screen.ASSISTANT -> AssistantScreen(store, back)
                            Screen.FINANCE -> FinanceScreen(back, store, onReports = { navigate(Screen.REPORTS) }, onVerification = { navigate(Screen.VERIFICATION) })
                            Screen.PROFILE -> ProfileScreen(store, back)
                            Screen.VERIFICATION -> if (store.backend != null) BusinessOnboardingScreen(store.backend!!, manage = true, onComplete = back) else Box(Modifier.padding(22.dp)) { AppText("Business verification is available with a signed-in owner account.") }
                            Screen.SETUP -> SetupScreen(store) { navigate(Screen.HOME) }
                            Screen.TOOLS -> ToolsHubScreen(store, back, openTool)
                            Screen.FEATURE ->
                                key(tool) { if(store.real&&tool=="sync")LiveSyncScreen(store,back)else FeatureScreen(store, tool, back, openTool) }
                        }
                    }
                }
            }
        }
        if(model.backend?.busy==true)Box(Modifier.fillMaxSize().background(Canvas.copy(alpha=.5f)).clickable{},contentAlignment=Alignment.Center){CircularProgressIndicator(color=Green)}
    }
}

@Composable
private fun BottomBar(screen: Screen, navigate: (Screen) -> Unit) {
    val active =
        when (screen) {
            Screen.HOME -> Screen.HOME
            Screen.SALES -> Screen.SALES
            Screen.STOCK -> Screen.STOCK
            else -> Screen.MORE
        }
    Column(Modifier.fillMaxWidth().background(Surface).navigationBarsPadding()) {
        HorizontalDivider(color = Line)
        Row(Modifier.fillMaxWidth().height(62.dp), verticalAlignment = Alignment.CenterVertically) {
            val tabs =
                listOf(
                    Triple("Home", Icons.Outlined.Home, Screen.HOME),
                    Triple("Sales", Icons.Outlined.ShoppingBag, Screen.SALES),
                    Triple("New sale", Icons.Outlined.Add, Screen.NEW_SALE),
                    Triple("Stock", Icons.Outlined.Inventory2, Screen.STOCK),
                    Triple("More", Icons.Outlined.MoreHoriz, Screen.MORE),
                )
            tabs.forEach { (label, icon, target) ->
                Column(
                    Modifier.weight(1f).clickable { navigate(target) }.padding(vertical = 5.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(5.dp),
                ) {
                    if (target == Screen.NEW_SALE)
                        Box(
                            Modifier.size(43.dp).background(Forest, CircleShape),
                            contentAlignment = Alignment.Center,
                        ) {
                            AppIcon(icon, label, Modifier.size(23.dp), tint = Color.White)
                        }
                    else {
                        AppIcon(
                            icon,
                            null,
                            Modifier.size(20.dp),
                            tint = if (target == active) Green else Muted,
                        )
                        AppText(
                            label,
                            fontSize = 9.sp,
                            color = if (target == active) Green else Muted,
                            fontWeight =
                                if (target == active) FontWeight.SemiBold else FontWeight.Normal,
                        )
                    }
                }
            }
        }
    }
}
