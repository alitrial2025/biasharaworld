package com.biashara.app.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.core.view.WindowCompat
import android.graphics.drawable.ColorDrawable
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.sp
import com.biashara.app.R
import org.json.JSONObject

private val LocalAppDark = staticCompositionLocalOf { false }
internal val AppDark: Boolean
    @Composable get() = LocalAppDark.current
internal var AppLanguage by mutableStateOf("en")
val Surface: Color
    @Composable get() = if (AppDark) Color(0xFF1B3025) else Color.White

val Ink: Color
    @Composable get() = Color(if (AppDark) 0xFFEDF4EE else 0xFF17242F)
val Forest: Color
    @Composable get() = Color(if (AppDark) 0xFF111F1D else 0xFF111F1D)
val Green: Color
    @Composable get() = Color(if (AppDark) 0xFF78D8AE else 0xFF007A57)
val Lime: Color
    @Composable get() = Color(if (AppDark) 0xFF214C38 else 0xFFE4F7ED)
val Canvas: Color
    @Composable get() = Color(if (AppDark) 0xFF14251D else 0xFFF8FAFC)
val Muted: Color
    @Composable get() = Color(if (AppDark) 0xFFAFC0B5 else 0xFF5F6C7B)
val Line: Color
    @Composable get() = Color(if (AppDark) 0xFF34483E else 0xFFE9EEF2)
val Mint: Color
    @Composable get() = Color(if (AppDark) 0xFF214C38 else 0xFFEAF7F0)
val Amber: Color
    @Composable get() = Color(if (AppDark) 0xFFE3CC9A else 0xFF8E6123)
val Coral: Color
    @Composable get() = Color(if (AppDark) 0xFFF0ACB1 else 0xFFB7474B)
val Lavender: Color
    @Composable get() = Color(if (AppDark) 0xFF383148 else 0xFFF0EEF9)
val Indigo: Color
    @Composable get() = Color(if (AppDark) 0xFFB6C6F0 else 0xFF5464AD)
val BlueMist: Color
    @Composable get() = Color(if (AppDark) 0xFF29394F else 0xFFEEF1FA)
val RoseMist: Color
    @Composable get() = Color(if (AppDark) 0xFF4A3034 else 0xFFFCF0EF)
val Sand: Color
    @Composable get() = Color(if (AppDark) 0xFF443D2B else 0xFFFBF4E7)

@OptIn(ExperimentalTextApi::class)
private fun variableFont(resource: Int, weight: Int) =
    Font(
        resource,
        FontWeight(weight),
        variationSettings = FontVariation.Settings(FontVariation.weight(weight)),
    )

val AppFont =
    FontFamily(
        variableFont(R.font.inter, 400),
        variableFont(R.font.inter, 500),
        variableFont(R.font.inter, 600),
        variableFont(R.font.inter, 700),
        variableFont(R.font.inter, 800),
    )
val HeadingFont =
    FontFamily(
        variableFont(R.font.manrope, 600),
        variableFont(R.font.manrope, 700),
        variableFont(R.font.manrope, 800),
    )

private fun type(
    size: Int,
    weight: FontWeight = FontWeight.Normal,
    line: Int = size + 6,
    heading: Boolean = false,
) =
    TextStyle(
        fontFamily = if (heading) HeadingFont else AppFont,
        fontWeight = weight,
        fontSize = size.sp,
        lineHeight = line.sp,
        letterSpacing = if (heading) (-.4).sp else 0.sp,
        fontFeatureSettings = "tnum",
    )

@Composable
fun BiasharaTheme(preferences: JSONObject = JSONObject(), content: @Composable () -> Unit) {
    val dark =
        when (preferences.optString("theme", "light")) {
            "dark" -> true
            "system" -> isSystemInDarkTheme()
            else -> false
        }
    val view = LocalView.current
    SideEffect {
        if (!view.isInEditMode) {
            var context: Context = view.context
            while (context is ContextWrapper && context !is Activity) context = context.baseContext
            (context as? Activity)?.let { activity ->
                activity.window.setBackgroundDrawable(ColorDrawable(if (dark) 0xFF14251D.toInt() else 0xFFF8FAFC.toInt()))
                WindowCompat.getInsetsController(activity.window, view).apply {
                    isAppearanceLightStatusBars = !dark
                    isAppearanceLightNavigationBars = !dark
                }
            }
        }
        AppLanguage = preferences.optString("language", "en")
    }
    val density = LocalDensity.current
    CompositionLocalProvider(
        LocalAppDark provides dark,
        LocalDensity provides
            Density(density.density, density.fontScale * preferences.optInt("textSize", 100) / 100f)
    ) {
        MaterialTheme(
            colorScheme =
                if (dark)
                    darkColorScheme(
                        primary = Green,
                        onPrimary = Canvas,
                        primaryContainer = Mint,
                        onPrimaryContainer = Ink,
                        secondary = Green,
                        onSecondary = Canvas,
                        secondaryContainer = Mint,
                        onSecondaryContainer = Ink,
                        tertiary = Indigo,
                        onTertiary = Canvas,
                        tertiaryContainer = Lavender,
                        onTertiaryContainer = Ink,
                        surfaceVariant = Color(0xFF243B2E),
                        onSurfaceVariant = Muted,
                        surfaceTint = Surface,
                        surfaceContainerLowest = Canvas,
                        surfaceContainerLow = Surface,
                        surfaceContainer = Surface,
                        surfaceContainerHigh = Color(0xFF243B2E),
                        surfaceContainerHighest = Color(0xFF2B4435),
                        outlineVariant = Line,
                        errorContainer = RoseMist,
                        onErrorContainer = Ink,
                        background = Color(0xFF14251D),
                        surface = Color(0xFF1B3025),
                        onSurface = Color(0xFFEDF4EE),
                        onBackground = Color(0xFFEDF4EE),
                        outline = Color(0xFF34483E),
                        error = Color(0xFFF0ACB1),
                    )
                else
                    lightColorScheme(
                        primary = Green,
                        onPrimary = Color.White,
                        primaryContainer = Lime,
                        onPrimaryContainer = Ink,
                        secondary = Green,
                        secondaryContainer = Mint,
                        onSecondaryContainer = Ink,
                        tertiary = Indigo,
                        tertiaryContainer = Lavender,
                        onTertiaryContainer = Ink,
                        surfaceTint = Color.White,
                        surfaceContainerLowest = Canvas,
                        surfaceContainerLow = Color.White,
                        surfaceContainer = Color.White,
                        surfaceContainerHigh = Canvas,
                        surfaceContainerHighest = Mint,
                        onSurfaceVariant = Muted,
                        outlineVariant = Line,
                        errorContainer = RoseMist,
                        onErrorContainer = Ink,
                        background = Canvas,
                        onBackground = Ink,
                        surface = Color.White,
                        onSurface = Ink,
                        surfaceVariant = Mint,
                        outline = Line,
                        error = Coral,
                    ),
            typography =
                Typography(
                    displayLarge = type(48, FontWeight.ExtraBold, 54, true),
                    displayMedium = type(40, FontWeight.ExtraBold, 47, true),
                    headlineLarge = type(28, FontWeight.Bold, 35, true),
                    headlineMedium = type(24, FontWeight.Bold, 31, true),
                    headlineSmall = type(20, FontWeight.Bold, 27, true),
                    titleLarge = type(19, FontWeight.SemiBold, 26),
                    titleMedium = type(16, FontWeight.SemiBold, 23),
                    titleSmall = type(14, FontWeight.SemiBold, 20),
                    bodyLarge = type(15, line = 23),
                    bodyMedium = type(13, line = 20),
                    bodySmall = type(11, line = 17),
                    labelLarge = type(14, FontWeight.SemiBold),
                    labelMedium = type(12, FontWeight.SemiBold),
                    labelSmall = type(10, FontWeight.SemiBold, 15),
                ),
            content = { CompositionLocalProvider(LocalContentColor provides Ink, content = content) },
        )
    }
}
