package com.biashara.app

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.lifecycle.ViewModelProvider
import com.biashara.app.ui.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[35],qualifiers="w393dp-h852dp-xhdpi")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class LiveEmptyUiTest {
 @get:Rule val compose=createAndroidComposeRule<MainActivity>()
 @Test fun everyToolRendersWithoutSampleProductsOrCustomers(){
  val model=ViewModelProvider(compose.activity)[ShopViewModel::class.java]
  compose.runOnIdle{model.store.clearLive()}
  compose.onNodeWithText("More").performClick()
  compose.onNodeWithText("Explore all business tools").performScrollTo().performClick()
  businessFeatures.forEach {f->compose.onNodeWithText(f.title,substring=false).performScrollTo().performClick();compose.onNodeWithText(f.title,substring=false).assertExists();compose.waitForIdle();compose.onNodeWithContentDescription("Go back").performClick()}
 }
}
