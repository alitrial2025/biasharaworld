package com.biashara.app.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.os.Bundle
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintDocumentInfo
import android.print.PrintManager
import com.biashara.app.data.barcodeBars
import com.biashara.app.data.validBarcode
import java.io.FileOutputStream

/** Android's print dialog can print or save the actual generated preview document as PDF. */
fun printDemo(context: Context, title: String, lines: List<String>) {
    val manager = context.getSystemService(Context.PRINT_SERVICE) as PrintManager
    manager.print(
        "BiasharaOS · $title",
        object : PrintDocumentAdapter() {
            override fun onLayout(
                oldAttributes: PrintAttributes?,
                newAttributes: PrintAttributes?,
                cancellationSignal: CancellationSignal?,
                callback: LayoutResultCallback?,
                extras: Bundle?,
            ) {
                if (cancellationSignal?.isCanceled == true) {
                    callback?.onLayoutCancelled()
                    return
                }
                callback?.onLayoutFinished(
                    PrintDocumentInfo.Builder("BiasharaOS-$title.pdf")
                        .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                        .setPageCount(maxOf(1, (lines.size + 27) / 28))
                        .build(),
                    true,
                )
            }

            override fun onWrite(
                pages: Array<out PageRange>?,
                destination: ParcelFileDescriptor?,
                cancellationSignal: CancellationSignal?,
                callback: WriteResultCallback?,
            ) {
                val pdf = PdfDocument()
                try {
                    val chunks = lines.chunked(28).ifEmpty { listOf(emptyList()) }
                    chunks.forEachIndexed { index, chunk ->
                        if (cancellationSignal?.isCanceled == true) {
                            callback?.onWriteCancelled()
                            return
                        }
                        val page =
                            pdf.startPage(
                                PdfDocument.PageInfo.Builder(595, 842, index + 1).create()
                            )
                        val c: Canvas = page.canvas
                        val paint =
                            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                                color = Color.rgb(23, 36, 47)
                                textSize = 12f
                            }
                        paint.textSize = 24f
                        paint.isFakeBoldText = true
                        c.drawText("BiasharaOS", 40f, 55f, paint)
                        paint.textSize = 17f
                        c.drawText(title, 40f, 90f, paint)
                        paint.textSize = 12f
                        paint.isFakeBoldText = false
                        var y = 130f
                        chunk.forEach { line ->
                            c.drawText(tr(line).take(80), 40f, y, paint)
                            if (validBarcode(line.trim())) {
                                barcodeBars(line.trim()).forEachIndexed { bar, bit ->
                                    if (bit == '1')
                                        c.drawRect(
                                            80f + bar * 2,
                                            y + 15f,
                                            82f + bar * 2,
                                            y + 80f,
                                            paint,
                                        )
                                }
                                y += 100f
                            } else y += 23f
                        }
                        paint.textSize = 9f
                        paint.color = Color.GRAY
                        c.drawText(
                            "UI preview · local sample records · no live payment or tax certification",
                            40f,
                            800f,
                            paint,
                        )
                        pdf.finishPage(page)
                    }
                    FileOutputStream(destination!!.fileDescriptor).use { pdf.writeTo(it) }
                    callback?.onWriteFinished(arrayOf(PageRange.ALL_PAGES))
                } catch (e: Exception) {
                    callback?.onWriteFailed(e.message)
                } finally {
                    pdf.close()
                }
            }
        },
        PrintAttributes.Builder()
            .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
            .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
            .build(),
    )
}
