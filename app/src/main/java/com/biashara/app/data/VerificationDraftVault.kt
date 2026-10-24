package com.biashara.app.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import java.security.MessageDigest
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONObject

internal fun verificationDraftStorageKey(accountId: String, businessId: String): String = MessageDigest.getInstance("SHA-256")
    .digest((accountId + "\u0000" + businessId.ifBlank { "new-business" }).toByteArray(Charsets.UTF_8))
    .joinToString("") { "%02x".format(it) }

/** Owner/business-scoped setup drafts stay encrypted and separate from sales/session tokens. */
class VerificationDraftVault(context: Context, accountId: String, businessId: String) {
    private val prefs = context.getSharedPreferences("biashara_verification_drafts", Context.MODE_PRIVATE)
    private val item = verificationDraftStorageKey(accountId, businessId)
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        return store.getKey("biashara-verification-draft", null) as? SecretKey ?: KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder("biashara-verification-draft", KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }
    fun read(): JSONObject? {
        val raw = prefs.getString(item, null) ?: return null
        return try {
            val bytes = Base64.decode(raw, Base64.NO_WRAP)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(0, 12)))
            JSONObject(String(cipher.doFinal(bytes.copyOfRange(12, bytes.size)), Charsets.UTF_8))
        } catch (_: Exception) { prefs.edit().remove(item).commit(); null }
    }
    fun write(profile: JSONObject, step: Int) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val bytes = cipher.doFinal(json("profile" to profile, "step" to step).toString().toByteArray(Charsets.UTF_8))
        check(prefs.edit().putString(item, Base64.encodeToString(cipher.iv + bytes, Base64.NO_WRAP)).commit()) { "Could not retain the setup draft on this device. Keep setup open until you save." }
    }
    fun clear() { check(prefs.edit().remove(item).commit()) { "Could not clear the setup draft from this device." } }
}
