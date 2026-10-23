package com.biashara.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.biashara.app.data.LiveBackend

@Composable
fun AccountScreen(backend:LiveBackend) {
    var mode by remember { mutableStateOf("login") }
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var business by remember { mutableStateOf("") }
    var location by remember { mutableStateOf("") }
    val onboard=backend.authenticated&&!backend.hasBusiness&&!backend.recovery
    Box(Modifier.fillMaxSize().background(Canvas).safeDrawingPadding(),contentAlignment=Alignment.Center){
        Column(Modifier.widthIn(max=520.dp).fillMaxWidth().verticalScroll(rememberScrollState()).padding(26.dp),verticalArrangement=Arrangement.spacedBy(16.dp)) {
            AppText("BiasharaOS",fontSize=32.sp,fontWeight=FontWeight.ExtraBold,color=Green)
            Eyebrow("YOUR BUSINESS. ALL TOGETHER.")
            AppText(if(backend.recovery)"Choose a new password" else if(onboard)"Make it your business." else when(mode){"signup"->"Your next chapter starts here.";"forgot"->"Let’s get you back in.";else->"Welcome back."},style=MaterialTheme.typography.headlineLarge)
            AppText(if(onboard)"Start with an empty workspace. Your real stock, sales and customers stay private and sync with the website."else "A little less juggling. A lot more growing.",fontSize=14.sp,color=Muted)
            if(backend.error.isNotBlank()){SurfaceCard(color=RoseMist){AppText(backend.error,color=Coral)}}
            if(backend.notice.isNotBlank()){SurfaceCard(color=Mint){AppText(backend.notice,color=Green)}}
            if(onboard||mode=="signup")OutlinedTextField(name,{name=it},label={AppText("Your name")},singleLine=true,modifier=Modifier.fillMaxWidth())
            if(onboard){
                OutlinedTextField(business,{business=it},label={AppText("Business name")},singleLine=true,modifier=Modifier.fillMaxWidth())
                OutlinedTextField(location,{location=it},label={AppText("Location")},singleLine=true,modifier=Modifier.fillMaxWidth())
            } else if(!backend.recovery)OutlinedTextField(email,{email=it.trim()},label={AppText("Email address")},singleLine=true,modifier=Modifier.fillMaxWidth())
            if((mode!="forgot"&&!onboard)||backend.recovery)OutlinedTextField(password,{password=it},label={AppText(if(backend.recovery)"New password (8+ characters)" else "Password")},singleLine=true,visualTransformation=PasswordVisualTransformation(),modifier=Modifier.fillMaxWidth())
            PrimaryButton(if(backend.busy)"Please wait…" else if(onboard)"Create business" else if(backend.recovery)"Save password" else when(mode){"signup"->"Create account";"forgot"->"Send reset email";else->"Sign in"}, {
                backend.action {
                    when {
                        backend.recovery->backend.resetPassword(password)
                        onboard->backend.createBusiness(name,business,location,"Retail shop")
                        mode=="signup"->backend.signUp(email,password,name)
                        mode=="forgot"->backend.forgot(email)
                        else->backend.signIn(email,password)
                    }
                    password=""
                }
            },enabled=!backend.busy && if(onboard)name.isNotBlank()&&business.isNotBlank() else if(backend.recovery)password.length>=8 else email.contains("@")&&(mode=="forgot"||password.length>=8),tone=Green)
            if(!onboard&&!backend.recovery){
                TextButton(onClick={mode=if(mode=="signup")"login" else "signup"}){AppText(if(mode=="signup")"Already have an account? Sign in" else "New here? Create an account")}
                TextButton(onClick={mode=if(mode=="forgot")"login" else "forgot"}){AppText(if(mode=="forgot")"Back to sign in" else "Forgot password?")}
            }
            if(backend.authenticated)TextButton(onClick={backend.action{backend.signOut()}}){AppText("Sign out")}
            AppText("Confirm your email before signing in. Payment gateways are not connected yet.",fontSize=11.sp,color=Muted)
        }
    }
}
