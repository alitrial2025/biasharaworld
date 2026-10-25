package com.biashara.app.ui

import android.animation.ValueAnimator
import android.database.ContentObserver
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas as DrawingCanvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asComposePath
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.graphics.PathParser

/** Startup follows actual initialization state. No timer, simulated progress or navigation delay. */
@Composable
fun StartupScreen(
    loading: Boolean = true,
    error: String = "",
    onRetry: () -> Unit = {},
    onSignOut: () -> Unit = {},
) {
    val failed = error.isNotBlank()
    val animate = startupAnimationsEnabled() && loading && !failed
    Column(
        Modifier.fillMaxSize().background(Canvas).statusBarsPadding().navigationBarsPadding()
            .verticalScroll(rememberScrollState()).padding(horizontal = 28.dp, vertical = 24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        StartupLogo(animate)
        AppText("BiasharaOS", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.ExtraBold, color = Ink)
        AppText("A WORLD OF BUSINESS", fontSize = 10.sp, letterSpacing = 2.sp, color = Green, modifier = Modifier.padding(top = 8.dp))
        Column(
            Modifier.widthIn(max = 360.dp).padding(top = 32.dp).semantics { liveRegion = LiveRegionMode.Polite },
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            AppText(
                if (failed) "Let’s reconnect" else if (loading) "Opening your workspace" else "Your workspace is ready",
                style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center, color = Ink,
            )
            AppText(
                if (failed) error else if (loading) "Securely loading your account and business." else "Everything is ready to continue.",
                style = MaterialTheme.typography.bodyMedium, color = Muted, textAlign = TextAlign.Center,
            )
        }
        if (failed) {
            Column(Modifier.widthIn(max = 360.dp).padding(top = 24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                PrimaryButton("Try again", onRetry, tone = Green)
                TextButton(onClick = onSignOut, modifier = Modifier.padding(top = 4.dp)) { AppText("Sign out", color = Green) }
            }
        }
    }
}

/** Respond to the system animation preference, including changes made while startup is visible. */
@Composable
private fun startupAnimationsEnabled(): Boolean {
    val context = LocalContext.current
    fun permitted() = Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) > 0f && ValueAnimator.areAnimatorsEnabled()
    var enabled by remember(context) { mutableStateOf(permitted()) }
    DisposableEffect(context) {
        val observer = object : ContentObserver(Handler(Looper.getMainLooper())) {
            override fun onChange(selfChange: Boolean) { enabled = permitted() }
        }
        context.contentResolver.registerContentObserver(Settings.Global.getUriFor(Settings.Global.ANIMATOR_DURATION_SCALE), false, observer)
        onDispose { context.contentResolver.unregisterContentObserver(observer) }
    }
    return enabled
}

@Composable
private fun StartupLogo(animate: Boolean) {
    val lift: Float
    if (animate) {
        val transition = rememberInfiniteTransition(label = "Business growth")
        val animatedLift by transition.animateFloat(
            initialValue = 0f, targetValue = 1f,
            animationSpec = infiniteRepeatable(tween(900, easing = FastOutSlowInEasing), RepeatMode.Reverse),
            label = "Seed growth",
        )
        lift = animatedLift
    } else lift = 0f
    // Shared SVG geometry is the website icon path, translated (-2,-3) within its 64-unit tile.
    val letter = remember { PathParser.createPathFromPathData("M20 14h13c10 0 15 5 15 11 0 4-2 7-6 9 5 1 8 5 8 9 0 8-6 12-17 12H20V14zm10 9v8h4c4 0 6-1 6-4s-2-4-6-4h-4zm0 16v8h5c5 0 7-1 7-4s-2-4-7-4h-5z")!!.asComposePath() }
    val plate = remember { PathParser.createPathFromPathData("M40 22H68A18 18 0 0 1 86 40V68A18 18 0 0 1 68 86H40A18 18 0 0 1 22 68V40A18 18 0 0 1 40 22Z")!!.asComposePath() }
    val sprout = remember { PathParser.createPathFromPathData("M85 79C82 73 85 66 92 64C94 71 91 77 85 79Z")!!.asComposePath() }
    val emerald = Color(0xFF00815D)
    val orange = Color(0xFFE89A42)
    DrawingCanvas(
        Modifier.size(288.dp).clearAndSetSemantics { testTag = if (animate) "startup-logo-animated" else "startup-logo-static" },
    ) {
        scale(size.width / 108f, size.height / 108f, pivot = Offset.Zero) {
            translate(top = -lift * 1.5f) {
                drawPath(plate, emerald)
                translate(left = 20f, top = 19f) { drawPath(letter, Color.White) }
            }
            scale(1f + lift * .08f, 1f + lift * .08f, pivot = Offset(85f, 82f)) {
                drawCircle(orange, radius = 4f, center = Offset(85f, 83f))
                drawPath(sprout, orange.copy(alpha = .9f))
            }
        }
    }
}
