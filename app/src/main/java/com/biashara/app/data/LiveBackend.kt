package com.biashara.app.data

import android.content.Context
import android.net.Uri
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.compose.runtime.*
import com.biashara.app.BuildConfig
import java.net.HttpURLConnection
import java.net.URL
import java.security.KeyStore
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONObject

/** Tokens are encrypted with a non-exportable Android Keystore key; passwords are never saved. */
internal class SessionVault(context: Context) {
    private val prefs = context.getSharedPreferences("biashara_auth", Context.MODE_PRIVATE)

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        return (store.getKey("biashara-session", null) as? SecretKey)
            ?: KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
                .apply {
                    init(
                        KeyGenParameterSpec.Builder(
                                "biashara-session",
                                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
                            )
                            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                            .build()
                    )
                }
                .generateKey()
    }

    private fun writeValue(value: JSONObject?, name: String) {
        if (value == null) {
            prefs.edit().remove(name).commit()
            return
        }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val bytes = cipher.doFinal(value.toString().toByteArray(Charsets.UTF_8))
        check(
            prefs
                .edit()
                .putString(name, Base64.encodeToString(cipher.iv + bytes, Base64.NO_WRAP))
                .commit()
        ) {
            "Could not securely save your session."
        }
    }

    private fun readValue(name: String): JSONObject? {
        val raw = prefs.getString(name, null) ?: return null
        return try {
            val bytes = Base64.decode(raw, Base64.NO_WRAP)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(0, 12)))
            JSONObject(String(cipher.doFinal(bytes.copyOfRange(12, bytes.size)), Charsets.UTF_8))
        } catch (_: Exception) {
            prefs.edit().remove(name).commit()
            null
        }
    }

    fun write(value: JSONObject?) {
        writeValue(value, "session")
    }

    fun read() = readValue("session")

    fun writePending(value: JSONObject?) {
        writeValue(value, "pending")
    }

    fun readPending() = readValue("pending")
}

class BackendException(message: String, val status: Int = 0) : Exception(message)

class LiveBackend(
    context: Context,
    private val scope: CoroutineScope,
    private val store: DemoStore,
) {
    private val vault = SessionVault(context)
    private var session: JSONObject? = null
    private val mutex = Mutex()
    var ready by mutableStateOf(false)
        private set

    var authenticated by mutableStateOf(false)
        private set

    var hasBusiness by mutableStateOf(false)
        private set

    var workspaceLoaded by mutableStateOf(false)
        private set

    var busy by mutableStateOf(false)
        private set

    var error by mutableStateOf("")
        private set

    var notice by mutableStateOf("")
        private set

    var recovery by mutableStateOf(false)
        private set

    var revision by mutableLongStateOf(0)
        private set

    var businessId by mutableStateOf("")
        private set

    var slug by mutableStateOf("")
        private set

    var role by mutableStateOf("")
        private set

    private var pending: JSONObject? = null
    val hasPending: Boolean
        get() = pending != null

    private suspend fun http(
        base: String,
        path: String,
        method: String = "GET",
        body: JSONObject? = null,
        token: String? = null,
        auth: Boolean = false,
    ): JSONObject =
        withContext(Dispatchers.IO) {
            require(base.startsWith("https://")) {
                "Connection unavailable. Please try again later."
            }
            val connection = URL(base + path).openConnection() as HttpURLConnection
            try {
                connection.connectTimeout = 15000
                connection.readTimeout = 25000
                connection.requestMethod = method
                connection.setRequestProperty("Accept", "application/json")
                if (auth)
                    connection.setRequestProperty("apikey", BuildConfig.SUPABASE_PUBLISHABLE_KEY)
                token?.let { connection.setRequestProperty("Authorization", "Bearer $it") }
                if (body != null) {
                    connection.doOutput = true
                    connection.setRequestProperty("Content-Type", "application/json")
                    connection.outputStream.use {
                        it.write(body.toString().toByteArray(Charsets.UTF_8))
                    }
                }
                val status = connection.responseCode
                val raw =
                    (if (status in 200..299) connection.inputStream else connection.errorStream)
                        ?.bufferedReader()
                        ?.use { it.readText() } ?: "{}"
                val result = runCatching { JSONObject(raw) }.getOrElse { JSONObject() }
                if (status == 404 && !auth)
                    throw BackendException("The business service is temporarily unavailable. Please try again shortly.", status)
                if (status !in 200..299)
                    throw BackendException(
                        result.optString(
                            "error_description",
                            result.optString(
                                "msg",
                                result.optString(
                                    "message",
                                    result.optString(
                                        "error",
                                        "Could not complete request ($status).",
                                    ),
                                ),
                            ),
                        ),
                        status,
                    )
                result
            } finally {
                connection.disconnect()
            }
        }

    private suspend fun token(): String {
        val current = session ?: throw BackendException("Sign in to continue.", 401)
        if (current.optLong("expires_at") <= System.currentTimeMillis() / 1000 + 60) {
            try {
                val refreshed =
                    http(
                        BuildConfig.SUPABASE_URL,
                        "/auth/v1/token?grant_type=refresh_token",
                        "POST",
                        json("refresh_token" to current.getString("refresh_token")),
                        auth = true,
                    )
                vault.write(refreshed)
                session = refreshed
            } catch (e: BackendException) {
                if (e.status in listOf(400, 401)) {
                    clear()
                    error = "Your session expired. Sign in again."
                }
                throw e
            }
        }
        return session!!.getString("access_token")
    }

    private suspend fun api(body: JSONObject? = null) =
        http(
            BuildConfig.API_URL,
            "/api/workspace",
            if (body == null) "GET" else "POST",
            body,
            token(),
        )

    private fun clear() {
        session = null
        vault.write(null)
        vault.writePending(null)
        authenticated = false
        hasBusiness = false
        workspaceLoaded = false
        pending = null
        store.clearLive()
        revision = 0
        businessId = ""
        slug = ""
        role = ""
    }

    fun start() {
        scope.launch {
            busy = true
            try {
                session = vault.read()
                if (session != null) {
                    pending = vault.readPending()
                    authenticated = true
                    token()
                    load()
                }
            } catch (e: Exception) {
                error =
                    if (e is BackendException) e.message ?: "Could not reconnect."
                    else "Connection unavailable. Please try again."
            } finally {
                ready = true
                busy = false
            }
        }
    }

    fun action(block: suspend () -> Unit) {
        if (busy) return
        scope.launch {
            busy = true
            error = ""
            notice = ""
            try {
                block()
            } catch (e: Exception) {
                error =
                    if (e is BackendException || e is IllegalArgumentException)
                        e.message ?: "Please check your details."
                    else "Connection unavailable. Please try again."
            } finally {
                busy = false
                ready = true
            }
        }
    }

    suspend fun signIn(email: String, password: String) {
        val result =
            http(
                BuildConfig.SUPABASE_URL,
                "/auth/v1/token?grant_type=password",
                "POST",
                json("email" to email.trim(), "password" to password),
                auth = true,
            )
        vault.write(result)
        session = result
        authenticated = true
        load()
    }

    suspend fun signUp(email: String, password: String, name: String) {
        val result =
            http(
                BuildConfig.SUPABASE_URL,
                "/auth/v1/signup?redirect_to=biasharaos%3A%2F%2Fauth%2Fcallback",
                "POST",
                json(
                    "email" to email.trim(),
                    "password" to password,
                    "data" to json("name" to name.trim()),
                ),
                auth = true,
            )
        if (result.has("access_token")) {
            vault.write(result)
            session = result
            authenticated = true
            load()
        } else notice = "Check your email to confirm your account, then sign in."
    }

    suspend fun forgot(email: String) {
        http(
            BuildConfig.SUPABASE_URL,
            "/auth/v1/recover?redirect_to=biasharaos%3A%2F%2Fauth%2Fcallback",
            "POST",
            json("email" to email.trim()),
            auth = true,
        )
        notice = "If this account exists, a password reset link will arrive by email."
    }

    suspend fun resetPassword(password: String) {
        http(
            BuildConfig.SUPABASE_URL,
            "/auth/v1/user",
            "PUT",
            json("password" to password),
            token(),
            true,
        )
        recovery = false
        notice = "Password updated."
        load()
    }

    fun handleLink(uri: Uri?) {
        if (uri?.scheme != "biasharaos" || uri.host != "auth") return
        if (!ready || busy) {
            scope.launch {
                while (!ready || busy) delay(50)
                handleLink(uri)
            }
            return
        }
        action {
            val parts =
                Uri.parse("https://callback/?" + (uri.encodedFragment ?: uri.encodedQuery ?: ""))
            val access =
                parts.getQueryParameter("access_token")
                    ?: throw BackendException(
                        parts.getQueryParameter("error_description")
                            ?: "This account link expired. Request a new one."
                    )
            val refresh =
                parts.getQueryParameter("refresh_token")
                    ?: throw BackendException("Incomplete account link.")
            val user = http(BuildConfig.SUPABASE_URL, "/auth/v1/user", token = access, auth = true)
            val value =
                json(
                    "access_token" to access,
                    "refresh_token" to refresh,
                    "expires_at" to
                        (System.currentTimeMillis() / 1000 +
                            (parts.getQueryParameter("expires_in")?.toLongOrNull() ?: 3600)),
                    "user" to user,
                )
            clear()
            vault.write(value)
            session = value
            authenticated = true
            recovery = parts.getQueryParameter("type") == "recovery"
            load()
        }
    }

    suspend fun load() {
        accept(api().optJSONObject("workspace"))
    }

    private fun accept(workspace: JSONObject?) {
        workspaceLoaded = true
        hasBusiness = workspace != null
        if (workspace == null) {
            store.clearLive()
            return
        }
        businessId = workspace.getString("businessId")
        revision = workspace.getLong("revision")
        slug = workspace.getString("slug")
        role = workspace.getString("role")
        store.restoreLive(workspace.getJSONObject("state"))
    }

    suspend fun createBusiness(name: String, business: String, location: String, type: String) {
        accept(
            api(
                    json(
                        "type" to "createBusiness",
                        "profile" to
                            json(
                                "name" to name.trim(),
                                "business" to business.trim(),
                                "location" to location.trim(),
                                "type" to type,
                            ),
                    )
                )
                .getJSONObject("workspace")
        )
    }

    suspend fun signOut() {
        check(pending == null) { "Retry the unconfirmed request before signing out." }
        runCatching {
            http(BuildConfig.SUPABASE_URL, "/auth/v1/logout", "POST", json(), token(), true)
        }
        clear()
    }

    private fun draft() =
        store.operations.state.let { o ->
            json(
                "cart" to JSONObject(store.cart.mapKeys { it.key.toString() }),
                "customer" to o.optString("customer", "Walk-in customer"),
                "discount" to o.optLong("discount"),
                "discountKind" to o.optString("discountKind", "percent"),
                "promotion" to o.optString("promotion"),
                "redeem" to o.optInt("redeem"),
            )
        }

    suspend fun command(command: JSONObject): JSONObject =
        mutex.withLock {
            check(pending == null) { "Retry the previous unconfirmed request first." }
            pending =
                json(
                    "businessId" to businessId,
                    "requestId" to UUID.randomUUID().toString(),
                    "revision" to revision,
                    "command" to command,
                    "draft" to draft(),
                )
            try {
                vault.writePending(pending)
            } catch (e: Exception) {
                pending = null
                throw e
            }
            sendPending()
        }

    private suspend fun sendPending(): JSONObject {
        try {
            val response = api(pending ?: throw BackendException("No request to retry."))
            pending = null
            vault.writePending(null)
            accept(response.getJSONObject("workspace"))
            val result = response.getJSONObject("result")
            store.operations.confirmedId(result.optInt("id"))
            notice = result.optString("message", "Saved to your business.")
            return result
        } catch (e: BackendException) {
            if (e.status in 400..499) {
                pending = null
                vault.writePending(null)
                if (e.status == 409) load()
            }
            throw e
        }
    }

    fun retry() {
        action { sendPending() }
    }

    fun perform(action: String, values: Map<String, String> = emptyMap(), done: () -> Unit = {}) {
        this.action {
            command(nativeCommand(action, values, store))
            if (action in listOf("placeOrder", "purchaseOrder")) {
                val next = JSONObject(store.operations.state.toString())
                next.put(if (action == "placeOrder") "shopCart" else "compareCart", JSONObject())
                store.operations.restore(next)
            }
            done()
        }
    }
}
