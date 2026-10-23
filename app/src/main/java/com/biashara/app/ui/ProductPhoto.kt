package com.biashara.app.ui

import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.ui.Alignment
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.BrokenImage
import androidx.compose.material3.IconButton
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import com.biashara.app.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@Composable
fun ProductPhoto(product: Product, store: DemoStore, modifier: Modifier = Modifier.size(52.dp, 62.dp)) {
    ProductPhotoPath(product.imagePath, product.name, product.art, store, modifier)
}

@Composable
fun ProductPhotoPath(path: String?, name: String, fallback: String, store: DemoStore, modifier: Modifier = Modifier) {
    var retry by remember(path) { mutableIntStateOf(0) }
    var failed by remember(path, store.backend?.businessId) { mutableStateOf(false) }
    val imageState = remember(path, store.backend?.businessId, retry) { mutableStateOf<android.graphics.Bitmap?>(null) }
    val image by imageState
    LaunchedEffect(path, store.backend?.businessId, retry) {
        failed = false; imageState.value = null
        if (!path.isNullOrBlank() && store.backend != null) {
            try { val bytes = store.backend!!.downloadProductImage(path); imageState.value = withContext(Dispatchers.IO) { run {
                    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
                    var sample = 1
                    while (maxOf(bounds.outWidth, bounds.outHeight) / sample > 640) sample *= 2
                    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample })
                } }; failed = imageState.value == null }
            catch (e: kotlinx.coroutines.CancellationException) { throw e }
            catch (_: Exception) { failed = true }
        }
    }
    Box(modifier.clip(RoundedCornerShape(12.dp))) {
        if (image != null) Image(image!!.asImageBitmap(), contentDescription = "$name photo", contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        else if (!store.real) ProductArt(fallback, Modifier.fillMaxSize())
        else Box(Modifier.fillMaxSize().background(Mint), contentAlignment = Alignment.Center) { AppIcon(Icons.Outlined.Inventory2, "No product photo", Modifier.size(28.dp), tint = Muted) }
        if (failed) IconButton(onClick = { retry++ }, modifier = Modifier.size(32.dp)) { AppIcon(Icons.Outlined.BrokenImage, "Retry $name photo", tint = Coral) }
    }
}
