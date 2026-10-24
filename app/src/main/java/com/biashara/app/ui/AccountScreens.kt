package com.biashara.app.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Shield
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.biashara.app.R
import com.biashara.app.data.LiveBackend

@Composable
fun AccountScreen(backend: LiveBackend, initialMode: String = "login") {
    var mode by rememberSaveable(initialMode) { mutableStateOf(initialMode) }
    var name by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmation by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var business by rememberSaveable { mutableStateOf("") }
    var location by rememberSaveable { mutableStateOf("") }
    val reconnect = backend.authenticated && !backend.workspaceLoaded && !backend.recovery
    val onboard = backend.authenticated && backend.workspaceLoaded && !backend.hasBusiness && !backend.recovery
    Column(Modifier.fillMaxSize().background(Canvas).imePadding().verticalScroll(rememberScrollState())) {
        Box(Modifier.fillMaxWidth().height(310.dp)) {
            Image(painterResource(R.drawable.shop_photo), contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0xAA102B23), Color(0x33102B23), Color(0xF2102B23)))))
            Column(Modifier.fillMaxSize().statusBarsPadding().padding(horizontal = 28.dp, vertical = 22.dp), verticalArrangement = Arrangement.SpaceBetween) {
                AppText("BiasharaOS", fontSize = 25.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    AppText("FOR YOUR NEXT BIG THING", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFFCFEBCE))
                    AppText(if (mode == "signup") "Small beginnings.\nBig possibilities." else "Your business.\nAll together.", fontSize = 32.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, lineHeight = 37.sp)
                    AppText("A little less juggling. A lot more growing.", fontSize = 13.sp, color = Color(0xFFE0ECE2))
                }
            }
        }
        Surface(modifier = Modifier.fillMaxWidth().offset(y = (-20).dp), shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp), color = Canvas) {
            Column(Modifier.widthIn(max = 520.dp).fillMaxWidth().navigationBarsPadding().padding(26.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Eyebrow(if (mode == "signup") "A SIMPLE START" else "ROOM TO GROW")
                AppText(if (backend.recovery) "Choose a new password" else if (reconnect) "Let’s open your business." else if (onboard) "Make it your business." else when (mode) { "signup" -> "Your next chapter starts here."; "forgot" -> "Let’s get you back in."; else -> "Welcome back." }, style = MaterialTheme.typography.headlineLarge)
                AppText(if (reconnect) "Your account is signed in. Retry the connection to load your workspace." else if (onboard) "Tell us about your business to open your private workspace." else if (mode == "signup") "One account for your shop, on your phone and the web." else "A clearer view of your day starts here.", fontSize = 14.sp, color = Muted)
                if (backend.error.isNotBlank()) SurfaceCard(color = RoseMist) { AppText(backend.error, color = Coral) }
                if (backend.notice.isNotBlank()) SurfaceCard(color = Mint) { AppText(backend.notice, color = Green) }
                if (reconnect) {
                    if (!onboard && (mode == "signup" || backend.recovery)) OutlinedTextField(confirmation, { confirmation = it }, label = { AppText("Confirm password") }, singleLine = true, enabled = !backend.busy, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password), modifier = Modifier.fillMaxWidth())
                    PrimaryButton(if (backend.busy) "Connecting…" else "Try again", { backend.action { backend.load() } }, enabled = !backend.busy, tone = Green)
                } else {
                    if (onboard || mode == "signup") OutlinedTextField(name, { name = it }, label = { AppText("Your name") }, singleLine = true, enabled = !backend.busy, modifier = Modifier.fillMaxWidth())
                    if (onboard) {
                        OutlinedTextField(business, { business = it }, label = { AppText("Business name") }, singleLine = true, enabled = !backend.busy, modifier = Modifier.fillMaxWidth())
                        OutlinedTextField(location, { location = it }, label = { AppText("Location") }, singleLine = true, enabled = !backend.busy, modifier = Modifier.fillMaxWidth())
                    } else if (!backend.recovery) OutlinedTextField(email, { email = it.trim() }, label = { AppText("Email address") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), singleLine = true, enabled = !backend.busy, modifier = Modifier.fillMaxWidth())
                    if ((mode != "forgot" && !onboard) || backend.recovery) OutlinedTextField(password, { password = it }, label = { AppText(if (backend.recovery) "New password (8+ characters)" else "Password") }, singleLine = true, enabled = !backend.busy, visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password), trailingIcon = { IconButton(onClick = { showPassword = !showPassword }) { Icon(if (showPassword) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, contentDescription = if (showPassword) "Hide password" else "Show password") } }, modifier = Modifier.fillMaxWidth())
                    if (!onboard && (mode == "signup" || backend.recovery)) OutlinedTextField(confirmation, { confirmation = it }, label = { AppText("Confirm password") }, singleLine = true, enabled = !backend.busy, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password), modifier = Modifier.fillMaxWidth())
                    PrimaryButton(if (backend.busy) "Please wait…" else if (onboard) "Create business" else if (backend.recovery) "Save password" else when (mode) { "signup" -> "Create account"; "forgot" -> "Send reset email"; else -> "Sign in" }, {
                        backend.action {
                            when {
                                backend.recovery -> backend.resetPassword(password)
                                onboard -> backend.createBusiness(name, business, location, "Retail shop")
                                mode == "signup" -> backend.signUp(email, password, name)
                                mode == "forgot" -> backend.forgot(email)
                                else -> backend.signIn(email, password)
                            }
                            password = ""; confirmation = ""
                        }
                    }, enabled = !backend.busy && if (onboard) name.isNotBlank() && business.isNotBlank() else if (backend.recovery) password.length >= 8 && password == confirmation else com.biashara.app.data.validEmail(email) && (mode == "forgot" || password.length >= 8) && (mode != "signup" || (name.isNotBlank() && password == confirmation)), tone = Green)
                    if (mode == "signup" && !backend.authenticated && backend.notice.isNotBlank()) TextButton(enabled = !backend.busy, onClick = { backend.action { backend.resendConfirmation(email) } }) { AppText("Resend confirmation email", color = Green) }
                    if (!onboard && !backend.recovery) {
                        TextButton(enabled = !backend.busy, onClick = { mode = if (mode == "signup") "login" else "signup"; password = ""; confirmation = "" }) { AppText(if (mode == "signup") "Already have an account? Sign in" else "New here? Create an account", color = Green) }
                        TextButton(enabled = !backend.busy, onClick = { mode = if (mode == "forgot") "login" else "forgot"; password = ""; confirmation = "" }) { AppText(if (mode == "forgot") "Back to sign in" else "Forgot password?", color = Muted) }
                    }
                }
                if (backend.authenticated) TextButton(enabled = !backend.busy, onClick = { backend.action { backend.signOut() } }) { AppText("Sign out") }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Shield, contentDescription = null, tint = Green, modifier = Modifier.size(18.dp))
                    AppText("Your business stays private. Confirm your email to get started.", fontSize = 11.sp, color = Muted)
                }
            }
        }
    }
}
