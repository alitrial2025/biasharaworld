package com.biashara.app.ui

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext

/** Actual device connectivity is separate from the deliberately simulated sync scenario. */
@Composable
fun rememberDeviceOnline(): Boolean {
    val context = LocalContext.current
    val manager =
        remember(context) {
            context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        }
    fun connected() =
        manager
            .getNetworkCapabilities(manager.activeNetwork)
            ?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
    var online by remember { mutableStateOf(connected()) }
    DisposableEffect(manager) {
        val callback =
            object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    online = connected()
                }

                override fun onLost(network: Network) {
                    online = connected()
                }

                override fun onCapabilitiesChanged(
                    network: Network,
                    capabilities: NetworkCapabilities,
                ) {
                    online = connected()
                }
            }
        manager.registerDefaultNetworkCallback(callback)
        onDispose { manager.unregisterNetworkCallback(callback) }
    }
    return online
}
