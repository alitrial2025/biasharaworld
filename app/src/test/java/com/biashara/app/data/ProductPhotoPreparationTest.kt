package com.biashara.app.data

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.ExifInterface
import android.net.Uri
import androidx.test.core.app.ApplicationProvider
import java.io.File
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ProductPhotoPreparationTest {
    @Test fun photoIsResizedAndLocationMetadataDoesNotReachTheUpload() = runBlocking {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val source = File(context.cacheDir, "source-photo.jpg")
        val bitmap = Bitmap.createBitmap(2400, 1600, Bitmap.Config.ARGB_8888).apply { eraseColor(android.graphics.Color.BLUE) }
        source.outputStream().use { bitmap.compress(Bitmap.CompressFormat.JPEG, 95, it) }; bitmap.recycle()
        ExifInterface(source.path).apply { setAttribute(ExifInterface.TAG_GPS_LATITUDE, "1/1,2/1,3/1"); saveAttributes() }
        assertNotNull(ExifInterface(source.path).getAttribute(ExifInterface.TAG_GPS_LATITUDE))
        val bytes = prepareProductPhoto(context, Uri.fromFile(source))
        val result = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        assertTrue(result.width <= 1920); assertTrue(result.height <= 1920)
        assertTrue(bytes.size <= 3145728)
        assertNull(ExifInterface(bytes.inputStream()).getAttribute(ExifInterface.TAG_GPS_LATITUDE))
        result.recycle(); source.delete(); Unit
    }
}
