package com.biashara.app.ui

import androidx.compose.foundation.Canvas as DrawingCanvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun Page(content: @Composable ColumnScope.() -> Unit) {
    Column(
        Modifier.fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 18.dp)
            .padding(top = 12.dp, bottom = 22.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        content = content,
    )
}

@Composable
fun Eyebrow(text: String, color: Color = Muted) {
    AppText(
        text.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        letterSpacing = 1.1.sp,
        color = color,
    )
}

@Composable
fun PageTitle(
    title: String,
    subtitle: String? = null,
    onBack: (() -> Unit)? = null,
    action: @Composable (() -> Unit)? = null,
) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        if (onBack != null) {
            Box(
                modifier =
                    Modifier.padding(end = 10.dp)
                        .size(36.dp)
                        .background(Color(0xFFF3F5F7), CircleShape)
                        .clickable(onClick = onBack),
                contentAlignment = Alignment.Center,
            ) {
                AppIcon(Icons.AutoMirrored.Outlined.ArrowBack, "Go back", Modifier.size(20.dp))
            }
        }
        Column(Modifier.weight(1f)) {
            AppText(title, style = MaterialTheme.typography.headlineSmall)
            if (subtitle != null)
                AppText(
                    subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                    modifier = Modifier.padding(top = 3.dp),
                )
        }
        action?.invoke()
    }
}

@Composable
fun SurfaceCard(
    modifier: Modifier = Modifier,
    color: Color = Surface,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(color)
            .border(1.dp, Line.copy(alpha = 0.65f), RoundedCornerShape(16.dp))
            .padding(16.dp),
        content = content,
    )
}

@Composable
fun SectionTitle(title: String, link: String? = null, onClick: () -> Unit = {}) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        AppText(title, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
        if (link != null)
            TextButton(
                onClick = onClick,
                contentPadding = PaddingValues(0.dp),
                modifier = Modifier.height(32.dp),
            ) {
                AppText(link, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                AppIcon(
                    Icons.Outlined.ArrowOutward,
                    null,
                    Modifier.padding(start = 3.dp).size(14.dp),
                )
            }
    }
}

@Composable
fun PrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    icon: ImageVector? = null,
    tone: Color = Forest,
) {
    Button(
        onClick = onClick,
        modifier =
            modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp)
                .background(
                    if (enabled)
                        Brush.horizontalGradient(
                            listOf(
                                if (tone == Green) Color(0xFF00815D) else Color(0xFF26342F),
                                if (tone == Green) Color(0xFF007653) else tone,
                            )
                        )
                    else Brush.horizontalGradient(listOf(Line, Line)),
                    RoundedCornerShape(14.dp),
                ),
        enabled = enabled,
        shape = RoundedCornerShape(14.dp),
        colors =
            ButtonDefaults.buttonColors(
                containerColor = Color.Transparent,
                contentColor = Color.White,
                disabledContainerColor = Color.Transparent,
            ),
    ) {
        if (icon != null) AppIcon(icon, null, Modifier.padding(end = 10.dp).size(20.dp))
        AppText(text, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
    }
}

@Composable
fun SearchBox(
    value: String,
    onChange: (String) -> Unit,
    placeholder: String,
    trailing: @Composable (() -> Unit)? = null,
) {
    Row(
        Modifier.fillMaxWidth()
            .height(44.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(Surface)
            .border(1.dp, Line, RoundedCornerShape(16.dp))
            .padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppIcon(Icons.Outlined.Search, null, Modifier.size(20.dp), tint = Muted)
        BasicTextField(
            value,
            onChange,
            modifier = Modifier.weight(1f).padding(horizontal = 10.dp),
            singleLine = true,
            textStyle = TextStyle(color = Ink, fontFamily = AppFont, fontSize = 13.sp),
            decorationBox = { inner ->
                Box {
                    if (value.isEmpty()) AppText(placeholder, fontSize = 12.sp, color = Muted)
                    inner()
                }
            },
        )
        trailing?.invoke()
    }
}

@Composable
fun FilterPills(items: List<String>, selected: String, onSelect: (String) -> Unit) {
    Row(
        Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items.forEach { item ->
            val active = item == selected
            Box(
                Modifier.clip(RoundedCornerShape(50))
                    .background(if (active) Green else Color(0xFFF3F5F8))
                    .border(1.dp, if (active) Green else Color(0xFFF3F5F8), RoundedCornerShape(50))
                    .clickable { onSelect(item) }
                    .padding(horizontal = 13.dp, vertical = 8.dp)
            ) {
                AppText(
                    item,
                    fontSize = 12.sp,
                    fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
                    color = if (active) Color.White else Muted,
                )
            }
        }
    }
}

@Composable
fun IconTile(icon: ImageVector, color: Color = Forest, background: Color = Mint, size: Int = 44) {
    Box(
        Modifier.size(size.dp).background(background, RoundedCornerShape(14.dp)),
        contentAlignment = Alignment.Center,
    ) {
        AppIcon(icon, null, Modifier.size((size / 2).dp), tint = color)
    }
}

@Composable
fun EmptyState(title: String, subtitle: String, icon: ImageVector = Icons.Outlined.SearchOff) {
    Column(
        Modifier.fillMaxWidth().padding(vertical = 36.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        IconTile(icon, size = 56)
        AppText(title, style = MaterialTheme.typography.titleMedium)
        AppText(subtitle, style = MaterialTheme.typography.bodySmall, color = Muted)
    }
}

@Composable
fun ShopPhoto(modifier: Modifier = Modifier, alignment: Alignment = Alignment.Center) {
    androidx.compose.foundation.Image(
        painter = androidx.compose.ui.res.painterResource(com.biashara.app.R.drawable.shop_photo),
        contentDescription = "Kenyan shopkeeper in her grocery shop",
        modifier = modifier,
        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
        alignment = alignment,
    )
}

@Composable
fun ProfilePhoto(modifier: Modifier = Modifier) {
    val source =
        androidx.compose.ui.graphics.ImageBitmap.imageResource(
            com.biashara.app.R.drawable.shop_photo
        )
    DrawingCanvas(modifier) {
        val unit = source.width / 1024f
        drawImage(
            source,
            srcOffset =
                androidx.compose.ui.unit.IntOffset((260 * unit).toInt(), (580 * unit).toInt()),
            srcSize = androidx.compose.ui.unit.IntSize((500 * unit).toInt(), (500 * unit).toInt()),
            dstSize = androidx.compose.ui.unit.IntSize(size.width.toInt(), size.height.toInt()),
        )
    }
}

@Composable
fun ProductArt(kind: String, modifier: Modifier = Modifier) {
    val source =
        androidx.compose.ui.graphics.ImageBitmap.imageResource(
            com.biashara.app.R.drawable.product_grid
        )
    val index =
        when (kind) {
            "flour" -> 0
            "spread" -> 1
            "soda" -> 2
            "water" -> 3
            "soap" -> 4
            "royco" -> 5
            "milk" -> 6
            else -> 7
        }
    val tileWidth = source.width / 4
    val tileHeight = source.height / 2
    DrawingCanvas(
        modifier.size(45.dp, 55.dp).clip(RoundedCornerShape(8.dp)).background(Surface).semantics {
            contentDescription = "$kind product photo"
        }
    ) {
        drawImage(
            source,
            srcOffset =
                androidx.compose.ui.unit.IntOffset(
                    (index % 4) * tileWidth,
                    (index / 4) * tileHeight,
                ),
            srcSize = androidx.compose.ui.unit.IntSize(tileWidth, tileHeight),
            dstSize = androidx.compose.ui.unit.IntSize(size.width.toInt(), size.height.toInt()),
        )
    }
}

@Composable
fun SalesChart(modifier: Modifier = Modifier, bars: Boolean = true,series:List<Float>?=null) {
    val values = if(series!=null)series.map{it.coerceAtLeast(0f)/maxOf(1f,series.maxOrNull()?:1f)*.9f} else
        listOf(
            .18f,
            .29f,
            .22f,
            .42f,
            .34f,
            .52f,
            .32f,
            .42f,
            .61f,
            .47f,
            .68f,
            .53f,
            .77f,
            .68f,
            .91f,
            .82f,
        )
    Column(modifier) {
        DrawingCanvas(
            Modifier.fillMaxWidth().height(130.dp).semantics {
                contentDescription = if(series!=null)"Sales from recorded receipts" else "Sample sales trend, increasing throughout the day"
            }
        ) {
            val w = size.width
            val h = size.height - 6.dp.toPx()
            (0..3).forEach { n ->
                drawLine(Line, Offset(0f, h * n / 3), Offset(w, h * n / 3), 1.dp.toPx())
            }
            if (bars) {
                val gap = w / values.size.coerceAtLeast(1)
                values.forEachIndexed { i, v ->
                    val height = h * v
                    drawRoundRect(
                        if (i == 7 || i == 14) Color(0xFF0C9D72) else Color(0xFFA6DCC7),
                        Offset(i * gap + gap * .2f, h - height),
                        Size(gap * .6f, height),
                        CornerRadius(4.dp.toPx(), 4.dp.toPx()),
                    )
                }
            } else {
                val p = Path()
                val fill = Path()
                values.forEachIndexed { i, v ->
                    val x = w * i / (values.size - 1).coerceAtLeast(1)
                    val y = h * (1 - v)
                    if (i == 0) {
                        p.moveTo(x, y)
                        fill.moveTo(x, h)
                        fill.lineTo(x, y)
                    } else {
                        p.lineTo(x, y)
                        fill.lineTo(x, y)
                    }
                }
                fill.lineTo(w, h)
                fill.close()
                drawPath(
                    fill,
                    Brush.verticalGradient(listOf(Green.copy(alpha = .20f), Green.copy(alpha = 0f))),
                )
                drawPath(p, Green, style = Stroke(2.5.dp.toPx(), cap = StrokeCap.Round))
                drawCircle(Forest, 4.dp.toPx(), Offset(w, h * (1 - values.last())))
            }
        }
        Row(
            Modifier.fillMaxWidth().padding(top = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            (if (series != null) (if (series.size == 1) listOf("Today") else listOf("First day", "Latest day"))
                else if (bars) listOf("8 AM", "11 AM", "2 PM", "5 PM", "8 PM")
                else listOf("MON", "TUE", "WED", "THU", "FRI", "SAT"))
                .forEach {
                    AppText(
                        it,
                        style = MaterialTheme.typography.labelSmall,
                        color = Muted,
                        fontSize = 9.sp,
                    )
                }
        }
    }
}

@Composable
fun ShopIllustration(modifier: Modifier = Modifier) {
    DrawingCanvas(
        modifier.semantics { contentDescription = "Illustration of a neighbourhood shop" }
    ) {
        val sx = size.width / 180f
        val sy = size.height / 135f
        fun r(c: Color, x: Float, y: Float, w: Float, h: Float, rad: Float = 0f) =
            drawRoundRect(
                c,
                Offset(x * sx, y * sy),
                Size(w * sx, h * sy),
                CornerRadius(rad * sx, rad * sy),
            )
        drawCircle(Lime.copy(alpha = .12f), 72 * sx, Offset(100 * sx, 70 * sy))
        r(Color(0xFFE8DAB8), 25f, 43f, 130f, 84f, 4f)
        r(Color(0xFF324C3C), 38f, 72f, 45f, 55f, 2f)
        r(Color(0xFF54846B), 93f, 72f, 49f, 40f, 2f)
        r(Color(0xFFABC0A0), 97f, 77f, 19f, 28f, 1f)
        r(Color(0xFFABC0A0), 120f, 77f, 17f, 28f, 1f)
        r(Lime, 22f, 35f, 136f, 19f, 3f)
        (0..6).forEach { i ->
            r(
                if (i % 2 == 0) Color(0xFFB9C987) else Color(0xFFF3EACC),
                22f + i * 19.4f,
                53f,
                19.5f,
                13f,
                4f,
            )
        }
        r(Color(0xFFDBBB77), 32f, 22f, 116f, 15f, 3f)
        r(Color(0xFF54794E), 13f, 102f, 17f, 27f, 3f)
        drawCircle(Color(0xFF7BA566), 13 * sx, Offset(21 * sx, 94 * sy))
        drawCircle(Color(0xFF96B47A), 10 * sx, Offset(15 * sx, 84 * sy))
        r(Color(0xFFB88F60), 142f, 110f, 28f, 18f, 2f)
        (0..2).forEach { i ->
            drawCircle(Color(0xFFE8BC65), 5 * sx, Offset((148 + i * 8) * sx, 107 * sy))
        }
    }
}

@Composable
fun AppIcon(
    imageVector: ImageVector,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    tint: Color = androidx.compose.material3.LocalContentColor.current,
) {
    androidx.compose.material3.Icon(imageVector, contentDescription?.let { tr(it) }, modifier, tint)
}
