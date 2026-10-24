package com.biashara.app

import android.net.Uri
import com.biashara.app.ui.serviceWebsiteUrl
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class ServiceWebsiteTest {
    @Test fun helpAndPoliciesAlwaysUseTheConfiguredServiceOrigin() {
        val origin = Uri.parse(BuildConfig.API_URL)
        for (path in listOf("/help", "/privacy", "/cookies", "/terms", "/contact")) {
            val actual = Uri.parse(serviceWebsiteUrl(path))
            assertEquals("https", actual.scheme)
            assertEquals(origin.authority, actual.authority)
            assertEquals(path, actual.path)
        }
    }

    @Test fun arbitraryDestinationsCannotBePassedAsSupportLinks() {
        for (path in listOf("https://example.com", "//example.com", "/privacy?next=evil", "/unknown")) {
            assertThrows(IllegalArgumentException::class.java) { serviceWebsiteUrl(path) }
        }
    }
}
