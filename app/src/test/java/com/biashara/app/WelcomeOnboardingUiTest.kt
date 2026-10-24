package com.biashara.app

import androidx.activity.compose.setContent
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import com.biashara.app.ui.*
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
class WelcomeOnboardingUiTest {
    @get:Rule val compose = createAndroidComposeRule<MainActivity>()
    @Test fun firstEntryExplainsSetupBeforeOfferingAccountCreationAndKeepsExistingSignIn() {
        var create = false; var login = false
        compose.activity.setContent { BiasharaTheme { WelcomeOnboardingScreen({ create = true }, { login = true }) } }
        compose.onNodeWithText("Your next chapter starts here.").assertExists()
        compose.onNodeWithText("Create account").assertDoesNotExist()
        compose.onNodeWithText("Continue", substring = false).performClick()
        compose.onNodeWithText("Know your business, every day.").assertExists()
        compose.onNodeWithText("Continue", substring = false).performClick()
        compose.onNodeWithText("A secure start. Room to grow.").assertExists()
        compose.onNodeWithText("Set up my business", substring = false).performScrollTo().performClick()
        assertTrue(create); assertFalse(login)
        compose.onNodeWithText("I already have an account · Sign in", substring = false).performScrollTo().performClick()
        assertTrue(login)
    }
}
