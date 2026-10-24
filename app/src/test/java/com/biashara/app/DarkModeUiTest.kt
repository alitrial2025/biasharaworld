package com.biashara.app

import android.graphics.Bitmap
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import com.biashara.app.data.DemoStore
import com.biashara.app.data.json
import com.biashara.app.ui.*
import java.io.File
import kotlin.math.pow
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w393dp-h852dp-xhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class DarkModeUiTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()

    private fun contrast(a: Color, b: Color): Double {
        fun luminance(c: Color): Double {
            fun linear(v: Float) = if (v <= .04045f) v.toDouble() / 12.92 else ((v + .055) / 1.055).pow(2.4)
            return .2126 * linear(c.red) + .7152 * linear(c.green) + .0722 * linear(c.blue)
        }
        val x = luminance(a); val y = luminance(b)
        return (maxOf(x, y) + .05) / (minOf(x, y) + .05)
    }

    @Test fun nestedThemesKeepTheirOwnPaletteAndReadableControls() {
        val palettes = mutableMapOf<String, List<Color>>()
        compose.activity.setContent {
            BiasharaTheme(json("theme" to "light")) {
                val outer = listOf(Surface, Ink, Muted, Mint, Green, MaterialTheme.colorScheme.onPrimary, LocalContentColor.current)
                SideEffect { palettes["light-before"] = outer }
                BiasharaTheme(json("theme" to "dark")) {
                    val dark = listOf(Surface, Ink, Muted, Mint, Green, MaterialTheme.colorScheme.onPrimary, LocalContentColor.current)
                    SideEffect { palettes["dark"] = dark }
                }
                val restored = listOf(Surface, Ink, Muted, Mint, Green, MaterialTheme.colorScheme.onPrimary, LocalContentColor.current)
                SideEffect { palettes["light-after"] = restored }
            }
        }
        compose.waitForIdle()
        assertEquals(palettes["light-before"], palettes["light-after"])
        assertNotEquals(palettes["light-before"]!![0], palettes["dark"]!![0])
        for ((name, colors) in palettes) {
            assertEquals("$name default text follows the theme", colors[1], colors[6])
            assertTrue("$name body text contrast", contrast(colors[1], colors[0]) >= 4.5)
            assertTrue("$name secondary text contrast", contrast(colors[2], colors[0]) >= 4.5)
            assertTrue("$name accent text contrast", contrast(colors[4], colors[3]) >= 4.5)
            assertTrue("$name selected filter text contrast", contrast(colors[5], colors[4]) >= 4.5)
        }
    }

    @Test fun darkInventoryRendersUsingTheSelectedPalette() {
        val store = DemoStore()
        compose.activity.setContent {
            BiasharaTheme(json("theme" to "dark")) {
                Column(Modifier.fillMaxSize().background(Canvas)) { InventoryScreen(store) }
            }
        }
        compose.waitForIdle()
        compose.runOnIdle {
            val view = compose.activity.window.decorView
            val bitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
            view.draw(android.graphics.Canvas(bitmap))
            val output = File("build/outputs/ui-previews/dark-inventory.png")
            output.parentFile!!.mkdirs()
            output.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
            bitmap.recycle()
        }
    }
}
