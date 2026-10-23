package com.biashara.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.biashara.app.data.*

@Composable
fun AccountSecuritySheet(store: DemoStore, onClose: () -> Unit) {
    var current by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmation by remember { mutableStateOf("") }
    ActionSheet(onDismissRequest = onClose, title = { AppText("Change password", style = MaterialTheme.typography.headlineSmall) }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            AppText(store.backend?.accountEmail.orEmpty(), color = Muted)
            OutlinedTextField(current, { current = it }, label = { AppText("Current password") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password), enabled = store.canSave, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(password, { password = it }, label = { AppText("New password (8+ characters)") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password), enabled = store.canSave, modifier = Modifier.fillMaxWidth())
            OutlinedTextField(confirmation, { confirmation = it }, label = { AppText("Confirm new password") }, singleLine = true, visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password), enabled = store.canSave, modifier = Modifier.fillMaxWidth())
            if (confirmation.isNotEmpty() && confirmation != password) AppText("Passwords do not match.", color = Coral)
            BusinessFormStatus(store)
        }
    }, confirmButton = { PrimaryButton("Save new password", { store.backend?.action { store.backend?.changePassword(current, password); current = ""; password = ""; confirmation = ""; onClose() } }, enabled = store.canSave && current.isNotBlank() && password.length >= 8 && password == confirmation, tone = Green) }, dismissButton = { TextButton(onClick = onClose) { AppText("Cancel") } })
}
