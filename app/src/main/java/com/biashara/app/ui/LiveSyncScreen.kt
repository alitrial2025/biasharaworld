package com.biashara.app.ui
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import com.biashara.app.data.DemoStore

@Composable
fun LiveSyncScreen(store:DemoStore,onBack:()->Unit){
 val backend=store.backend?:return
 Page {
  PageTitle("Connection & sync",onBack=onBack)
  SurfaceCard {AppText("Shared business records",style=MaterialTheme.typography.headlineMedium);AppText("Your saved changes are available on all your devices. Refresh to see the latest updates.");AppText(backend.error.ifBlank{backend.notice.ifBlank{"Connected"}});PrimaryButton(if(backend.hasPending)"Retry unconfirmed request" else "Refresh records",{if(backend.hasPending)backend.retry()else backend.action{backend.load()}},enabled=!backend.busy,tone=Green)}
  AppText("Basket edits are drafts until you save them or complete a sale. Reconnect to save changes, or retry an interrupted save here.")
 }
}
