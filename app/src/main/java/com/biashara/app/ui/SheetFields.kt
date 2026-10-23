package com.biashara.app.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ExpandMore
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun SheetChoice(label: String, value: String, options: List<Pair<String, String>>, onChange: (String) -> Unit) {
    var choosing by remember { mutableStateOf(false) }
    OutlinedButton(onClick = { choosing = true }, modifier = Modifier.fillMaxWidth(), enabled = options.isNotEmpty()) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            AppText(label, color = Muted)
            AppText(options.firstOrNull { it.first == value }?.second ?: "Choose…", color = Ink)
        }
        Icon(Icons.Outlined.ExpandMore, contentDescription = "Choose $label")
    }
    if (choosing) ActionSheet(onDismissRequest = { choosing = false }, title = { AppText(label, style = MaterialTheme.typography.headlineSmall) }, text = {
        Column {
            options.forEach { (id, title) ->
                Row(Modifier.fillMaxWidth().clickable { onChange(id); choosing = false }.padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    RadioButton(selected = value == id, onClick = { onChange(id); choosing = false })
                    AppText(title, modifier = Modifier.weight(1f))
                }
            }
        }
    }, dismissButton = { TextButton(onClick = { choosing = false }) { AppText("Cancel") } })
}
