package com.biashara.app.data

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BusinessInputValidationTest {
    @Test fun ordinaryEmailAddressesReachAccountServices() {
        listOf("owner@example.com", "sales@shop.co.ke", "amina+shop@example.com", "  owner@example.com  ").forEach {
            assertTrue("Expected valid account email: $it", validEmail(it))
        }
    }

    @Test fun malformedAddressesAreRejectedBeforeNetworkRequests() {
        listOf("", "owner", "owner@example", "owner example.com", "owner @example.com", "owner@example com", "owner@@example.com").forEach {
            assertFalse("Expected invalid account email: $it", validEmail(it))
        }
    }
}
