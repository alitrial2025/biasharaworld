package com.biashara.app.ui

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import com.biashara.app.BuildConfig

private val servicePages = setOf("/help", "/privacy", "/cookies", "/terms", "/contact")

/** Policy/support pages use the same trusted service origin as the connected API. */
fun serviceWebsiteUrl(path: String): String {
    require(path in servicePages) { "This support page is unavailable." }
    val service = Uri.parse(BuildConfig.API_URL)
    require(service.scheme == "https" && !service.host.isNullOrBlank()) { "The service website is unavailable." }
    return service.buildUpon().encodedPath(path).clearQuery().fragment(null).build().toString()
}

fun openServiceWebsite(context: Context, path: String) {
    try {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(serviceWebsiteUrl(path))).apply {
            addCategory(Intent.CATEGORY_BROWSABLE)
        })
    } catch (_: ActivityNotFoundException) {
        Toast.makeText(context, "No browser is available. Open the BiasharaOS website on another device.", Toast.LENGTH_LONG).show()
    } catch (_: IllegalArgumentException) {
        Toast.makeText(context, "This website page is unavailable. Try again later.", Toast.LENGTH_LONG).show()
    }
}
