package com.biashara.app.ui

import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import androidx.core.content.FileProvider
import java.io.File
import kotlin.math.floor

private val code39 = mapOf(
    '0' to "nnnwwnwnn", '1' to "wnnwnnnnw", '2' to "nnwwnnnnw", '3' to "wnwwnnnnn", '4' to "nnnwwnnnw",
    '5' to "wnnwwnnnn", '6' to "nnwwwnnnn", '7' to "nnnwnnwnw", '8' to "wnnwnnwnn", '9' to "nnwwnnwnn",
    'A' to "wnnnnwnnw", 'B' to "nnwnnwnnw", 'C' to "wnwnnwnnn", 'D' to "nnnnwwnnw", 'E' to "wnnnwwnnn",
    'F' to "nnwnwwnnn", '*' to "nwnnwnwnn",
)

internal fun ticketWidths(code: String) = "*$code*".flatMap { (code39.getValue(it) + "n").map { bar -> if (bar == 'w') 3 else 1 } }

internal fun shareTicketImage(context: Context, code: String, title: String, details: List<String>) {
    val bitmap = Bitmap.createBitmap(920, 460, Bitmap.Config.ARGB_8888)
    try {
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        canvas.drawColor(Color.WHITE)
        paint.color = Color.rgb(23, 68, 44)
        canvas.drawRect(0f, 0f, 920f, 72f, paint)

        fun line(text: String, y: Float, size: Float) {
            paint.textSize = size
            val width = paint.measureText(text)
            paint.textScaleX = if (width > 840) 840f / width else 1f
            canvas.drawText(text, 40f, y, paint)
            paint.textScaleX = 1f
        }

        paint.color = Color.WHITE
        paint.typeface = Typeface.DEFAULT_BOLD
        line("BiasharaOS  ·  Admission ticket", 46f, 25f)
        paint.color = Color.rgb(23, 29, 25)
        line(title, 129f, 38f)
        paint.typeface = Typeface.DEFAULT
        details.forEachIndexed { index, text -> line(text, 177f + index * 37, 26f) }

        val widths = ticketWidths(code)
        val unit = floor(840f / widths.sum())
        var x = floor((920f - unit * widths.sum()) / 2)
        paint.color = Color.BLACK
        widths.forEachIndexed { index, width ->
            if (index % 2 == 0) canvas.drawRect(x, 312f, x + width * unit, 402f, paint)
            x += width * unit
        }
        paint.typeface = Typeface.MONOSPACE
        paint.textSize = 26f
        paint.textAlign = Paint.Align.CENTER
        canvas.drawText(code, 460f, 436f, paint)

        val directory = File(context.cacheDir, "ticket-images").apply { mkdirs() }
        directory.listFiles()?.filter { it.lastModified() < System.currentTimeMillis() - 86_400_000 }?.forEach { it.delete() }
        val file = File(directory, "biashara-ticket-$code.png")
        file.outputStream().use { check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, it)) }
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.tickets", file)
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "image/png"
            putExtra(Intent.EXTRA_STREAM, uri)
            clipData = ClipData.newRawUri("Admission ticket", uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(send, "Share ticket"))
    } finally {
        bitmap.recycle()
    }
}
