package org.tinapple.hub.ui

import androidx.annotation.DrawableRes
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.graphics.drawable.toBitmap
import org.tinapple.hub.R
import org.tinapple.hub.ui.theme.Expressive

/** The surface ladder from ii-tools: surfaces, not harsh lines. */
object Layer {
    val page: Color @Composable get() = MaterialTheme.colorScheme.surface
    val pane: Color @Composable get() = MaterialTheme.colorScheme.surfaceContainer
    val onPane: Color @Composable get() = MaterialTheme.colorScheme.surfaceContainerHigh
    val field: Color @Composable get() = MaterialTheme.colorScheme.surfaceContainerHighest
}

/** Radii from the Expressive scale. */
object Radius {
    val join = 8.dp
    val row = 24.dp
    val card = 32.dp
}

/** Which scheme family tints a row's badge. */
enum class Tint { PRIMARY, SECONDARY, TERTIARY, ERROR }

/** A dashboard card: one surface, its content in the `on` color of that surface. */
@Composable
fun ExpressiveCard(
    color: Color,
    contentColor: Color,
    modifier: Modifier = Modifier,
    radius: Dp = Radius.card,
    onClick: (() -> Unit)? = null,
    content: @Composable BoxScope.() -> Unit,
) {
    val haptics = LocalHapticFeedback.current
    val shape = RoundedCornerShape(radius)
    if (onClick != null) {
        Surface(
            onClick = {
                haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                onClick()
            },
            shape = shape,
            color = color,
            contentColor = contentColor,
            modifier = modifier.fillMaxWidth(),
        ) { Box(content = content) }
    } else {
        Surface(
            shape = shape,
            color = color,
            contentColor = contentColor,
            modifier = modifier.fillMaxWidth()
        ) { Box(content = content) }
    }
}

/** A small bold caption over a value, in capitals. */
@Composable
fun Caption(text: String, modifier: Modifier = Modifier, color: Color = LocalContentColor.current) {
    Text(
        text.uppercase(),
        style = Expressive.caption,
        color = color,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        modifier = modifier
    )
}

/** A section title with its action button or icon on the right. */
@Composable
fun SectionHeader(
    title: String,
    action: String? = null,
    @DrawableRes actionIcon: Int? = null,
    onAction: (() -> Unit)? = null
) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(start = 4.dp, top = 8.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(title, style = Expressive.wide(22.sp), modifier = Modifier.weight(1f))
        if (actionIcon != null && onAction != null) {
            IconButton(
                onClick = onAction,
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(Layer.pane)
            ) {
                Icon(
                    painter = painterResource(actionIcon),
                    contentDescription = action ?: title,
                    tint = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.size(18.dp)
                )
            }
        } else if (action != null && onAction != null) {
            TonalPill(
                action,
                onClick = onAction,
                trailingIcon = R.drawable.rounded_arrow_forward,
                height = 36.dp,
                color = Layer.pane
            )
        }
    }
}

/** A section title above a group: wide face typography. */
@Composable
fun GroupHeader(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        style = Expressive.wide(20.sp),
        color = MaterialTheme.colorScheme.onSurface,
        modifier = modifier.padding(start = 4.dp, top = 12.dp, bottom = 2.dp),
    )
}

/** Rows that belong together: outer corners Radius.row with subtle inner seams. */
@Composable
fun CardGroup(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(Radius.row)),
        verticalArrangement = Arrangement.spacedBy(3.dp),
        content = content,
    )
}

/** A 24dp glyph in a 44dp squircle shape: what leads every row. */
@Composable
fun IconBadge(@DrawableRes icon: Int, tint: Tint) = IconBadge(painterResource(icon), tint)

@Composable
fun IconBadge(icon: Painter, tint: Tint) {
    val cs = MaterialTheme.colorScheme
    val (container, content) = when (tint) {
        Tint.PRIMARY -> cs.primaryContainer to cs.onPrimaryContainer
        Tint.SECONDARY -> Layer.field to cs.onSurface
        Tint.TERTIARY -> cs.tertiaryContainer to cs.onTertiaryContainer
        Tint.ERROR -> cs.errorContainer to cs.onErrorContainer
    }
    Box(
        modifier = Modifier
            .size(44.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(container),
        contentAlignment = Alignment.Center
    ) {
        Icon(icon, null, tint = content, modifier = Modifier.size(24.dp))
    }
}

/** Another app's launcher icon, loaded once per package. */
@Composable
fun AppIcon(pkg: String, size: Dp = 44.dp) {
    val ctx = LocalContext.current
    val bitmap = remember(pkg) {
        runCatching { ctx.packageManager.getApplicationIcon(pkg).toBitmap(128, 128).asImageBitmap() }.getOrNull()
    }
    if (bitmap != null) {
        Image(
            bitmap,
            contentDescription = null,
            modifier = Modifier
                .size(size)
                .clip(RoundedCornerShape(14.dp))
        )
    } else {
        Box(
            Modifier
                .size(size)
                .clip(RoundedCornerShape(14.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
        )
    }
}

/** One row of a CardGroup: an Expressive ListItem on the pane. */
@Composable
fun ToolRow(
    title: String,
    modifier: Modifier = Modifier,
    summary: String? = null,
    @DrawableRes icon: Int? = null,
    tint: Tint = Tint.SECONDARY,
    painter: Painter? = null,
    leading: (@Composable () -> Unit)? = null,
    onClick: (() -> Unit)? = null,
    container: Color = Layer.pane,
    trailing: (@Composable RowScope.() -> Unit)? = null,
) {
    val cs = MaterialTheme.colorScheme
    val haptics = LocalHapticFeedback.current
    val leadingContent: (@Composable () -> Unit)? = when {
        leading != null -> leading
        painter != null -> { { IconBadge(painter, tint) } }
        icon != null -> { { IconBadge(icon, tint) } }
        else -> null
    }
    val supporting: (@Composable () -> Unit)? = summary?.takeIf { it.isNotEmpty() }?.let {
        { Text(it, style = MaterialTheme.typography.bodyMedium, color = cs.onSurfaceVariant) }
    }
    val trailingContent: (@Composable () -> Unit)? = trailing?.let {
        { Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { it() } }
    }
    val colors = ListItemDefaults.colors(containerColor = container)
    val titleText: @Composable () -> Unit = {
        Text(title, style = Expressive.title(16.sp), color = cs.onSurface, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
    val rowModifier = modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(Radius.join))

    if (onClick != null) {
        ListItem(
            headlineContent = titleText,
            supportingContent = supporting,
            leadingContent = leadingContent,
            trailingContent = trailingContent,
            colors = colors,
            modifier = rowModifier.clickable {
                haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                onClick()
            }
        )
    } else {
        ListItem(
            headlineContent = titleText,
            supportingContent = supporting,
            leadingContent = leadingContent,
            trailingContent = trailingContent,
            colors = colors,
            modifier = rowModifier
        )
    }
}

/** The signature 3 or 4-column load gauge: digits, unit, label, and load bar. */
@Composable
fun LoadColumn(
    value: String,
    unit: String,
    label: String,
    fraction: Float?,
    modifier: Modifier = Modifier,
    activeColor: Color = MaterialTheme.colorScheme.primary
) {
    val cs = MaterialTheme.colorScheme
    Column(modifier, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(Modifier.height(36.dp), verticalAlignment = Alignment.Bottom) {
            Text(
                value,
                style = Expressive.digits(26.sp),
                maxLines = 1,
                softWrap = false,
                modifier = Modifier.weight(1f, fill = false),
            )
            Text(
                unit,
                style = Expressive.digitsSoft(12.sp),
                color = cs.onSurfaceVariant,
                maxLines = 1,
                softWrap = false,
                modifier = Modifier.padding(bottom = 3.dp, start = 2.dp)
            )
        }
        Text(label, style = Expressive.title(11.sp), color = cs.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Box(
            Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(CircleShape)
                .background(cs.secondaryContainer.copy(alpha = 0.5f))
        ) {
            Box(
                Modifier
                    .fillMaxWidth((fraction ?: 0f).coerceIn(0.04f, 1f))
                    .fillMaxHeight()
                    .clip(CircleShape)
                    .background(activeColor)
            )
        }
    }
}

/** Tonal action pill with optional trailing icon. */
@Composable
fun TonalPill(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    @DrawableRes trailingIcon: Int? = null,
    height: Dp = 40.dp,
    color: Color = Layer.pane,
) {
    val cs = MaterialTheme.colorScheme
    val haptics = LocalHapticFeedback.current
    Surface(
        onClick = {
            haptics.performHapticFeedback(HapticFeedbackType.LongPress)
            onClick()
        },
        shape = RoundedCornerShape(height / 2),
        color = color,
        modifier = modifier.height(height)
    ) {
        Row(
            Modifier.padding(horizontal = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(text, style = Expressive.title(13.sp), color = cs.onSurface)
            if (trailingIcon != null) {
                Icon(painterResource(trailingIcon), null, tint = cs.onSurface, modifier = Modifier.size(16.dp))
            }
        }
    }
}

/** Small filled pill badge ("On", "App", "Web"). */
@Composable
fun Pill(text: String, container: Color, content: Color) {
    Surface(color = container, contentColor = content, shape = RoundedCornerShape(50)) {
        Text(
            text,
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
        )
    }
}
