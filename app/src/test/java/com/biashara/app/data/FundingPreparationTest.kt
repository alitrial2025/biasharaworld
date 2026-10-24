package com.biashara.app.data

import org.junit.Assert.*
import org.junit.Test

class FundingPreparationTest {
    @Test fun quotedTermComparisonPreservesCentsAndKeepsFeesSeparate() {
        val noInterest = compareFundingTerms(100000,3,0.0,125)
        assertEquals(33333L,noInterest.monthly)
        assertEquals(100125L,noInterest.total)
        assertEquals(125L,noInterest.cost)
        val interest = compareFundingTerms(100000,12,12.0,125)
        assertEquals(8885L,interest.monthly)
        assertEquals(106744L,interest.total)
        assertEquals(6744L,interest.cost)
    }
    @Test fun invalidComparisonTermsDoNotProduceARepaymentEstimate() {
        for (attempt in listOf<() -> FundingTerms>(
            { compareFundingTerms(0,6,12.0,0) },
            { compareFundingTerms(10000,0,12.0,0) },
            { compareFundingTerms(10000,6,Double.NaN,0) },
            { compareFundingTerms(10000,6,-1.0,0) },
            { compareFundingTerms(10000,6,12.0,-1) },
        )) assertThrows(IllegalArgumentException::class.java) { attempt() }
    }
}
