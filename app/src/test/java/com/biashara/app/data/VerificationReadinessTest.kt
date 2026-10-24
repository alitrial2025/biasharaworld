package com.biashara.app.data

import org.junit.Assert.*
import org.junit.Test

class VerificationReadinessTest {
    @Test fun privateDraftKeysSeparateBusinessesAndTheNewBusinessSetup() {
        val accountId = "11111111-1111-4111-8111-111111111111"
        val first = verificationDraftStorageKey(accountId, "first-business")
        assertEquals(first, verificationDraftStorageKey(accountId, "first-business"))
        assertNotEquals(first, verificationDraftStorageKey(accountId, "second-business"))
        assertNotEquals(first, verificationDraftStorageKey("22222222-2222-4222-8222-222222222222", "first-business"))
        assertNotEquals(first, verificationDraftStorageKey(accountId, ""))
    }
    @Test fun readinessNeedsOwnerContactAndDeclarationWithoutPretendingIdentityVerification() {
        val draft = emptyVerificationProfile("Amina", "amina@example.com")
        assertEquals("KE", draft.getString("country"))
        assertTrue(verificationMissing(draft).contains("Owner declaration"))
        draft.put("legalName", "Amina owner").put("tradingName", "Amina shop").put("phone", "+254 700 123456").put("businessAddress", "Nairobi").put("declaration", true)
        assertEquals(emptyList<String>(), verificationMissing(draft))
        draft.put("phone", "not a phone")
        assertTrue(verificationMissing(draft).contains("Valid contact phone"))
        draft.put("phone", "+254700123456").put("registrationStatus", "registered")
        assertTrue(verificationMissing(draft).contains("Business registration number"))
    }
}
