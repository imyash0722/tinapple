package org.tinapple.hub.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ViewList
import androidx.compose.material.icons.rounded.Clear
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import org.tinapple.hub.data.ServiceItem
import org.tinapple.hub.ui.theme.StatusRunning
import org.tinapple.hub.ui.theme.TextMuted
import org.tinapple.hub.ui.theme.TextPrimary
import org.tinapple.hub.ui.theme.TextSecondary
import org.tinapple.hub.ui.theme.TinappleBorder
import org.tinapple.hub.ui.theme.TinappleSurfaceHigh
import org.tinapple.hub.ui.theme.TinappleSurfaceLow
import org.tinapple.hub.ui.theme.getGlassSurfaceColor

private val CATEGORIES = listOf("ALL", "MEDIA", "DOWNLOADS", "NETWORK", "SYSTEM", "CORE")

@Composable
fun ServicesSection(
    services: List<ServiceItem>,
    togglingServiceMap: Map<String, Boolean>,
    getPortalUrl: (ServiceItem) -> String?,
    onToggleService: (ServiceItem, Boolean) -> Unit,
    onOpenPortal: (String) -> Unit,
    glassTranslucency: Float = 0.82f,
    modifier: Modifier = Modifier
) {
    var selectedCategory by remember { mutableStateOf("ALL") }
    var searchQuery by remember { mutableStateOf("") }

    val runningCount = services.count { it.isRunning }
    val totalCount = services.size

    val filteredServices = remember(services, selectedCategory, searchQuery) {
        services.filter { item ->
            val matchesCategory = if (selectedCategory == "ALL") {
                true
            } else {
                item.category.equals(selectedCategory, ignoreCase = true)
            }

            val matchesSearch = if (searchQuery.isBlank()) {
                true
            } else {
                val q = searchQuery.trim().lowercase()
                item.name.lowercase().contains(q) ||
                        (item.displayName?.lowercase()?.contains(q) == true) ||
                        (item.tagline?.lowercase()?.contains(q) == true) ||
                        (item.port?.toString()?.contains(q) == true) ||
                        item.category.lowercase().contains(q)
            }

            matchesCategory && matchesSearch
        }
    }

    Column(modifier = modifier.fillMaxWidth()) {
        // Section Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 4.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.AutoMirrored.Rounded.ViewList,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "SERVICES & DAEMONS",
                    color = MaterialTheme.colorScheme.primary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
            }

            // Status chip: "X/Y Active"
            Box(
                modifier = Modifier
                    .clip(CircleShape)
                    .background(TinappleSurfaceHigh)
                    .border(1.dp, TinappleBorder, CircleShape)
                    .padding(horizontal = 10.dp, vertical = 4.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(StatusRunning)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "$runningCount / $totalCount ACTIVE",
                        color = TextSecondary,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        letterSpacing = 0.5.sp
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Search Input
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(getGlassSurfaceColor(glassTranslucency))
                .border(1.dp, TinappleBorder, RoundedCornerShape(12.dp))
                .padding(horizontal = 12.dp, vertical = 10.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    imageVector = Icons.Rounded.Search,
                    contentDescription = "Search",
                    tint = TextMuted,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                BasicTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    singleLine = true,
                    textStyle = TextStyle(
                        color = TextPrimary,
                        fontSize = 14.sp
                    ),
                    cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                    decorationBox = { innerTextField ->
                        if (searchQuery.isEmpty()) {
                            Text(
                                text = "Search services, port, description...",
                                color = TextMuted,
                                fontSize = 14.sp
                            )
                        }
                        innerTextField()
                    },
                    modifier = Modifier.weight(1f)
                )
                if (searchQuery.isNotEmpty()) {
                    IconButton(
                        onClick = { searchQuery = "" },
                        modifier = Modifier.size(20.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Rounded.Clear,
                            contentDescription = "Clear",
                            tint = TextMuted,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Horizontal Category Filter Chips
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            CATEGORIES.forEach { category ->
                val isSelected = selectedCategory == category
                val count = if (category == "ALL") {
                    services.size
                } else {
                    services.count { it.category.equals(category, ignoreCase = true) }
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(
                            if (isSelected) MaterialTheme.colorScheme.primaryContainer
                            else TinappleSurfaceLow
                        )
                        .border(
                            width = 1.dp,
                            color = if (isSelected) MaterialTheme.colorScheme.primary else TinappleBorder,
                            shape = RoundedCornerShape(20.dp)
                        )
                        .clickable { selectedCategory = category }
                        .padding(horizontal = 14.dp, vertical = 7.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = category,
                            color = if (isSelected) MaterialTheme.colorScheme.primary else TextSecondary,
                            fontSize = 12.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            letterSpacing = 0.5.sp
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = count.toString(),
                            color = if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.75f) else TextMuted,
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Services list
        if (filteredServices.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(TinappleSurfaceLow)
                    .border(1.dp, TinappleBorder, RoundedCornerShape(16.dp))
                    .padding(vertical = 36.dp, horizontal = 20.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "No services found",
                        color = TextSecondary,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = if (searchQuery.isNotEmpty()) "Try a different search term" else "No services in this category",
                        color = TextMuted,
                        fontSize = 12.sp
                    )
                }
            }
        } else {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                filteredServices.forEach { service ->
                    val isToggling = togglingServiceMap[service.name] == true
                    val portalUrl = getPortalUrl(service)

                    ServiceCard(
                        service = service,
                        portalUrl = portalUrl,
                        isToggling = isToggling,
                        onToggle = onToggleService,
                        onOpenPortal = onOpenPortal,
                        glassTranslucency = glassTranslucency
                    )
                }
            }
        }
    }
}
