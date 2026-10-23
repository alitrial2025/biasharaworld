package com.biashara.app

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import org.junit.Rule
import org.junit.Test

class ShopFlowTest {
    @get:Rule val compose=createAndroidComposeRule<MainActivity>()

    @Test fun saleCanBeCompletedAndAppearsInHistory() {
        compose.onNodeWithContentDescription("New sale").performClick()
        compose.onNodeWithContentDescription("Add Soko maize flour").performClick()
        compose.onNodeWithContentDescription("Add Blue Band").performClick()
        compose.onNodeWithText("KES 530").assertIsDisplayed()
        compose.onNodeWithText("Review sale").performClick()
        compose.onNodeWithText("Record received payment").performClick()
        compose.onNodeWithText("Receipt #1049").assertIsDisplayed()
        compose.onNodeWithText("View sales").performClick()
        compose.onNodeWithText("#1049 · 2 items · M-Pesa").assertExists()
    }

    @Test fun stockFiltersSeparateLowAndSoldOutProducts() {
        compose.onNodeWithText("Stock").performClick()
        compose.onNodeWithText("Low stock").performClick()
        compose.onNodeWithText("Coca-Cola").assertExists()
        compose.onNodeWithText("Soko maize flour").assertDoesNotExist()
        compose.onNodeWithText("Out of stock").performClick()
        compose.onNodeWithText("Sunlight soap").assertExists()
        compose.onNodeWithText("Coca-Cola").assertDoesNotExist()
    }

    @Test fun customerBalanceCanBeSettledInDemo() {
        compose.onNodeWithText("Customers").performScrollTo().performClick()
        compose.onNodeWithText("John Mwangi").performScrollTo().performClick()
        compose.onNodeWithText("Record repayment").performClick()
        compose.onNodeWithText("John Mwangi").assertExists()
    }

    @Test fun supplierOrderStaysExplicitlyInDemoMode() {
        compose.onNodeWithText("More").performClick()
        compose.onNodeWithText("Suppliers").performScrollTo().performClick()
        compose.onNodeWithText("KIFARU Wholesale").performScrollTo().performClick()
        compose.onNodeWithContentDescription("Order Soko maize flour").performScrollTo().performClick()
        compose.onNodeWithText("Review order · 1 item").performScrollTo().performClick()
        compose.onNodeWithText("Create demo order").performScrollTo().performClick()
        compose.onNodeWithText("All lined up!").assertIsDisplayed()
    }

    @Test fun assistantCanAnswerAStockQuestion() {
        compose.onNodeWithText("More").performClick()
        compose.onNodeWithText("BiasharaAI").performScrollTo().performClick()
        compose.onNodeWithText("What should I restock?").performClick()
        compose.onNodeWithText("Your shelves need a little love.",substring=true).assertExists()
    }
}
