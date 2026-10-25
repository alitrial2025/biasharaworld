package com.biashara.app.ui

import androidx.compose.foundation.Canvas as DrawCanvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import com.biashara.app.R
import kotlin.math.ceil
import kotlin.math.roundToInt

/** Decorative artwork only: message bubbles and input panels retain solid backgrounds. */
@Composable
fun BrandDoodleBackdrop(
    modifier: Modifier = Modifier,
    tint: Color = Green,
    opacity: Float = if (AppDark) .13f else .09f,
    tileWidth: Dp = 420.dp,
) {
    val image = ImageBitmap.imageResource(R.drawable.biashara_doodle)
    val colorFilter = ColorFilter.tint(tint)
    DrawCanvas(modifier.clipToBounds()) {
        val width = tileWidth.toPx().roundToInt().coerceAtLeast(1)
        val height = (width.toDouble() * image.height / image.width).roundToInt().coerceAtLeast(1)
        val columns = ceil(size.width / width).toInt()
        val rows = ceil(size.height / height).toInt()
        for (row in 0 until rows) for (column in 0 until columns) {
            drawImage(
                image = image,
                srcOffset = IntOffset.Zero,
                srcSize = IntSize(image.width, image.height),
                dstOffset = IntOffset(column * width, row * height),
                dstSize = IntSize(width, height),
                alpha = opacity.coerceIn(0f, 1f),
                colorFilter = colorFilter,
                filterQuality = FilterQuality.Medium,
            )
        }
    }
}
