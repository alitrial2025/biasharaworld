@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.biashara.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.dp
import com.biashara.app.data.DemoStore

/** Shared, keyboard-safe sheet. Long forms scroll while their actions remain reachable. */
@Composable
fun ActionSheet(
    onDismissRequest: () -> Unit,
    title: @Composable () -> Unit,
    text: @Composable () -> Unit = {},
    confirmButton: @Composable () -> Unit = {},
    dismissButton: (@Composable () -> Unit)? = null,
    icon: (@Composable () -> Unit)? = null,
    modifier: Modifier = Modifier,
    containerColor: Color = Surface,
) {
    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = containerColor,
        modifier = modifier.widthIn(max = 640.dp),
    ) {
        Column(
            Modifier.fillMaxWidth().heightIn(max = (LocalConfiguration.current.screenHeightDp * .88f).dp)
                .imePadding().navigationBarsPadding().padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            icon?.invoke()
            title()
            Column(Modifier.weight(1f, fill = false).fillMaxWidth().verticalScroll(rememberScrollState())) { text() }
            Column(Modifier.fillMaxWidth().padding(bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                confirmButton()
                dismissButton?.invoke()
            }
        }
    }
}

@Composable
fun BusinessFormStatus(store: DemoStore, localError: String = "") {
    val backend = store.backend
    val message = localError.ifBlank { backend?.error.orEmpty() }
    if (message.isNotBlank()) SurfaceCard(color = RoseMist) { AppText(message, color = Coral) }
    if (backend?.busy == true) {
        LinearProgressIndicator(modifier = Modifier.fillMaxWidth(), color = Green)
        AppText("Saving…", color = Muted)
    }
    if (backend?.hasPending == true && !backend.busy) {
        AppText("This save has not been confirmed. Retry it before making another change.", color = Muted)
        TextButton(onClick = { backend.retry() }) { AppText("Retry saved request", color = Green) }
    }
}

/** A retried save must close its original editor instead of inviting a duplicate submission. */
@Composable
fun CloseSheetAfterSave(store: DemoStore, onClose: () -> Unit) {
    val initial = androidx.compose.runtime.remember { store.backend?.confirmedRequestId }
    val confirmed = store.backend?.confirmedRequestId
    val close = androidx.compose.runtime.rememberUpdatedState(onClose)
    androidx.compose.runtime.LaunchedEffect(confirmed) {
        if (!confirmed.isNullOrEmpty() && confirmed != initial) close.value()
    }
}
