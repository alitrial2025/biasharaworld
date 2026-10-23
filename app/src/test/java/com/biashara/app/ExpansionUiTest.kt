package com.biashara.app

import android.graphics.Bitmap
import androidx.compose.runtime.*
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import com.biashara.app.data.*
import com.biashara.app.ui.*
import java.io.File
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w393dp-h852dp-xhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ExpansionUiTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()

    private fun capture(name: String) {
        compose.waitForIdle()
        compose.runOnIdle {
            val view = compose.activity.window.decorView
            val image = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
            view.draw(android.graphics.Canvas(image))
            File("build/outputs/ui-previews/expansion")
                .apply { mkdirs() }
                .resolve("$name.png")
                .outputStream()
                .use { image.compress(Bitmap.CompressFormat.PNG, 100, it) }
            image.recycle()
        }
    }

    @Test
    fun allTwentyFeatureScreensRenderAndNavigateBack() {
        compose.onNodeWithText("More", useUnmergedTree = false).performClick()
        compose.onNodeWithText("Explore all 20 business tools").performScrollTo().performClick()
        businessFeatures.forEach { f ->
            compose.onNodeWithText(f.title, substring = false).performScrollTo().performClick()
            compose.onNodeWithText(f.title, substring = false).assertExists()
            capture("${f.id.toString().padStart(2,'0')}-${f.slug}")
            compose.onNodeWithContentDescription("Go back").performClick()
        }
        val model =
            androidx.lifecycle.ViewModelProvider(compose.activity)[ShopViewModel::class.java]
        compose.runOnIdle {
            val op = model.store.operations
            fun act(action: String, vararg values: Pair<String, String>) {
                op.command(action, mapOf(*values))
            }
            act("openRegister", "amount" to "1000")
            act("cart", "product" to "1", "quantity" to "3")
            act("basket", "customer" to "Mary Wambui", "discount" to "5")
            act("checkout", "method" to "Cash")
            act(
                "return",
                "id" to "1049",
                "product" to "1",
                "quantity" to "1",
                "restock" to "true",
                "reason" to "Unopened item",
            )
            act("cart", "product" to "2", "quantity" to "2")
            act("hold", "name" to "Mary · afternoon collection")
            act("cart", "product" to "1", "quantity" to "2")
            act("document", "kind" to "Quotation", "due" to "2099-12-31")
            act("convertDocument", "id" to "1")
            act("clearCart")
            act("startCount", "name" to "Monday shelf check")
            act("count", "id" to "1", "product" to "1", "quantity" to "39")
            act("transfer", "product" to "1", "quantity" to "2", "to" to "westlands")
            act("dispatchTransfer", "id" to "1")
            act("shopCart", "product" to "1", "quantity" to "2")
            act("placeOrder", "customer" to "Mary Wambui", "address" to "Pickup · main shop")
            act("orderStatus", "id" to "1", "status" to "Confirmed")
            act("orderStatus", "id" to "1", "status" to "Packing")
            act("pack", "id" to "1", "product" to "1")
        }
        businessFeatures
            .filter {
                it.slug in
                    listOf(
                        "baskets",
                        "returns",
                        "documents",
                        "register",
                        "stocktakes",
                        "movements",
                        "transfers",
                        "deliveries",
                    )
            }
            .forEach { f ->
                compose.onNodeWithText(f.title).performScrollTo().performClick()
                capture("populated-${f.slug}")
                compose.onNodeWithContentDescription("Go back").performClick()
            }
    }

    @Test
    fun registerFormOpensClosesAndPersists() {
        compose.onNodeWithText("More").performClick()
        compose.onNodeWithText("Explore all 20 business tools").performScrollTo().performClick()
        compose.onNodeWithText("Daily cash register").performScrollTo().performClick()
        compose.onNodeWithText("Open cash register").performScrollTo().performClick()
        compose.onNodeWithContentDescription("Opening float (KES)").performTextReplacement("1500")
        compose.onNodeWithText("Open register").performClick()
        compose.onNodeWithText("KES 1,500").assertExists()
        compose.onNodeWithText("Close register").performScrollTo().performClick()
        compose.onNodeWithText("Close & reconcile").performClick()
        compose.onNodeWithText("Closed").assertExists()
        capture("register-closed")
    }

    @Test
    fun darkKiswahiliAndLargeTypeRenderExistingAndNewScreens() {
        val model =
            androidx.lifecycle.ViewModelProvider(compose.activity)[ShopViewModel::class.java]
        compose.runOnIdle {
            model.store.operations.command(
                "preferences",
                mapOf("theme" to "dark", "language" to "sw", "textSize" to "130"),
            )
        }
        capture("dark-sw-large-home")
        compose.onNodeWithText(tr("More")).performClick()
        capture("dark-sw-large-more")
        compose.onNodeWithText(tr("Explore all 20 business tools")).performScrollTo().performClick()
        capture("dark-sw-large-tools")
        compose.onNodeWithText(tr("Language & appearance")).performScrollTo().performClick()
        capture("dark-sw-large-preferences")
    }
}
