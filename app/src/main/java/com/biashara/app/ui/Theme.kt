package com.biashara.app.ui

import androidx.compose.foundation.isSystemInDarkTheme
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
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

internal var AppDark by mutableStateOf(false)
internal var AppLanguage by mutableStateOf("en")
val Surface: Color
    get() = if (AppDark) Color(0xFF1B3025) else Color.White

val Ink: Color
    get() = Color(if (AppDark) 0xFFEDF4EE else 0xFF17242F)
val Forest: Color
    get() = Color(if (AppDark) 0xFF111F1D else 0xFF111F1D)
val Green: Color
    get() = Color(if (AppDark) 0xFF78D8AE else 0xFF00815D)
val Lime: Color
    get() = Color(if (AppDark) 0xFF214C38 else 0xFFE4F7ED)
val Canvas: Color
    get() = Color(if (AppDark) 0xFF14251D else 0xFFF8FAFC)
val Muted: Color
    get() = Color(if (AppDark) 0xFFAFC0B5 else 0xFF5F6C7B)
val Line: Color
    get() = Color(if (AppDark) 0xFF34483E else 0xFFE9EEF2)
val Mint: Color
    get() = Color(if (AppDark) 0xFF214C38 else 0xFFEAF7F0)
val Amber: Color
    get() = Color(if (AppDark) 0xFFE3CC9A else 0xFF986B2B)
val Coral: Color
    get() = Color(if (AppDark) 0xFFF0ACB1 else 0xFFBF5154)
val Lavender: Color
    get() = Color(if (AppDark) 0xFF383148 else 0xFFF0EEF9)
val Indigo: Color
    get() = Color(if (AppDark) 0xFFB6C6F0 else 0xFF5464AD)
val BlueMist: Color
    get() = Color(if (AppDark) 0xFF29394F else 0xFFEEF1FA)
val RoseMist: Color
    get() = Color(if (AppDark) 0xFF4A3034 else 0xFFFCF0EF)
val Sand: Color
    get() = Color(if (AppDark) 0xFF443D2B else 0xFFFBF4E7)

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

private val LightScheme = lightColorScheme(
    primary = Color(0xFF007759),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE4F7ED),
    onPrimaryContainer = Color(0xFF183C2C),
    secondary = Color(0xFF486758),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFE0F1E5),
    onSecondaryContainer = Color(0xFF23392C),
    tertiary = Color(0xFF5464AD),
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFF0EEF9),
    onTertiaryContainer = Color(0xFF343258),
    background = Color(0xFFF8FAFC),
    onBackground = Color(0xFF17242F),
    surface = Color.White,
    onSurface = Color(0xFF17242F),
    surfaceVariant = Color(0xFFEAF7F0),
    onSurfaceVariant = Color(0xFF5F6C7B),
    surfaceContainer = Color(0xFFF4F7F6),
    surfaceContainerHigh = Color(0xFFEAF1EE),
    surfaceContainerHighest = Color(0xFFE3ECE7),
    outline = Color(0xFF74857C),
    outlineVariant = Color(0xFFE9EEF2),
    error = Color(0xFFAA3D44),
    onError = Color.White,
    errorContainer = Color(0xFFFCF0EF),
    onErrorContainer = Color(0xFF7B2329),
)

private val DarkScheme = darkColorScheme(
    primary = Color(0xFF78D8AE),
    onPrimary = Color(0xFF0A3523),
    primaryContainer = Color(0xFF214C38),
    onPrimaryContainer = Color(0xFFC9F4DE),
    secondary = Color(0xFFB1CEBC),
    onSecondary = Color(0xFF1D3628),
    secondaryContainer = Color(0xFF34483E),
    onSecondaryContainer = Color(0xFFD7E8DD),
    tertiary = Color(0xFFB6C6F0),
    onTertiary = Color(0xFF232E59),
    tertiaryContainer = Color(0xFF383148),
    onTertiaryContainer = Color(0xFFE2DEF6),
    background = Color(0xFF14251D),
    onBackground = Color(0xFFEDF4EE),
    surface = Color(0xFF1B3025),
    onSurface = Color(0xFFEDF4EE),
    surfaceVariant = Color(0xFF2B4136),
    onSurfaceVariant = Color(0xFFAFC0B5),
    surfaceContainer = Color(0xFF21362B),
    surfaceContainerHigh = Color(0xFF293E33),
    surfaceContainerHighest = Color(0xFF34483E),
    outline = Color(0xFF82998B),
    outlineVariant = Color(0xFF34483E),
    error = Color(0xFFF0ACB1),
    onError = Color(0xFF571E26),
    errorContainer = Color(0xFF4A3034),
    onErrorContainer = Color(0xFFFFDADE),
)

@Composable
fun BiasharaTheme(preferences: JSONObject = JSONObject(), content: @Composable () -> Unit) {
    val dark =
        when (preferences.optString("theme", "light")) {
            "dark" -> true
            "system" -> isSystemInDarkTheme()
            else -> false
        }
    SideEffect {
        AppDark = dark
        AppLanguage = preferences.optString("language", "en")
    }
    val density = LocalDensity.current
    CompositionLocalProvider(
        LocalDensity provides
            Density(density.density, density.fontScale * preferences.optInt("textSize", 100) / 100f)
    ) {
        MaterialTheme(
            colorScheme = if (dark) DarkScheme else LightScheme,
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
            content = content,
        )
    }
}
