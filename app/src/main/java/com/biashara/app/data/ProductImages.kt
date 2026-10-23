package com.biashara.app.data

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import com.biashara.app.BuildConfig
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

private val imageObject = Regex("[0-9a-f-]{36}/[0-9a-f-]{36}\\.(jpg|png|webp)")
fun productImageBelongsTo(path: String, businessId: String): Boolean = imageObject.matches(path) && path.substringBefore('/') == businessId

/** Uses the member's JWT; the private Storage bucket also enforces tenant/role RLS. */
private suspend fun LiveBackend.imageRequest(path: String, bytes: ByteArray? = null): ByteArray {
    require(productImageBelongsTo(path, businessId)) { "This product photo does not belong to your business." }
    val access = imageAccessToken()
    return withContext(Dispatchers.IO) {
        val route = if (bytes == null) "/storage/v1/object/authenticated/product-images/" else "/storage/v1/object/product-images/"
        val connection = URL(BuildConfig.SUPABASE_URL + route + path).openConnection() as HttpURLConnection
        try {
            connection.connectTimeout = 15000; connection.readTimeout = 30000
            connection.setRequestProperty("Authorization", "Bearer $access")
            connection.setRequestProperty("apikey", BuildConfig.SUPABASE_PUBLISHABLE_KEY)
            if (bytes != null) {
                connection.requestMethod = "POST"; connection.doOutput = true
                connection.setRequestProperty("Content-Type", "image/jpeg")
                connection.setRequestProperty("x-upsert", "false")
                connection.setFixedLengthStreamingMode(bytes.size)
                connection.outputStream.use { it.write(bytes) }
            }
            val status = connection.responseCode
            if (status !in 200..299) {
                val message = connection.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
                throw BackendException(if (status in listOf(401, 403)) "Your account cannot access this photo. Sign in again or ask the business owner." else if (status == 413) "This photo is too large. Choose a smaller image." else runCatching { JSONObject(message).optString("message") }.getOrNull()?.takeIf { it.isNotBlank() } ?: "Could not transfer the product photo. Try again.", status)
            }
            connection.inputStream.use { it.readBytes() }
        } finally { connection.disconnect() }
    }
}

suspend fun LiveBackend.uploadProductImage(bytes: ByteArray): String {
    require(roleAllows(role, "updateProduct")) { "Only an owner or manager can upload product photos." }
    require(bytes.size in 1..3_145_728) { "Choose a photo smaller than 3 MB." }
    val path = "$businessId/${UUID.randomUUID()}.jpg"
    imageRequest(path, bytes)
    return path
}

suspend fun LiveBackend.downloadProductImage(path: String): ByteArray {
    require(productImageBelongsTo(path, businessId)) { "This product photo does not belong to your business." }
    imageCache.get(path)?.let { return it }
    val bytes = imageRequest(path)
    imageCache.put(path, bytes)
    return bytes
}

/** Resize before upload, preserve camera orientation, and strip location/other EXIF data. */
suspend fun prepareProductPhoto(context: Context, uri: Uri): ByteArray = withContext(Dispatchers.IO) {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    require(bounds.outWidth > 0 && bounds.outHeight > 0) { "Choose a supported image file." }
    var sample = 1
    while (maxOf(bounds.outWidth, bounds.outHeight) / sample > 1920) sample *= 2
    val decoded = context.contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample }) }
        ?: error("Could not open this photo. Choose it again.")
    val orientation = runCatching { context.contentResolver.openInputStream(uri)?.use { ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL) } }.getOrNull()
    val matrix = Matrix().apply {
        when (orientation) {
            ExifInterface.ORIENTATION_ROTATE_90 -> postRotate(90f)
            ExifInterface.ORIENTATION_ROTATE_180 -> postRotate(180f)
            ExifInterface.ORIENTATION_ROTATE_270 -> postRotate(270f)
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> postScale(-1f, 1f)
            ExifInterface.ORIENTATION_FLIP_VERTICAL -> postScale(1f, -1f)
            ExifInterface.ORIENTATION_TRANSPOSE -> { postRotate(90f); postScale(-1f, 1f) }
            ExifInterface.ORIENTATION_TRANSVERSE -> { postRotate(270f); postScale(-1f, 1f) }
        }
    }
    val bitmap = if (matrix.isIdentity) decoded else Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)
    try {
        val output = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 85, output)
        require(output.size() <= 3_145_728) { "This photo is too large. Choose a smaller image." }
        output.toByteArray()
    } finally { if (bitmap !== decoded) bitmap.recycle(); decoded.recycle() }
}
