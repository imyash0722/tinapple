package org.tinapple.hub.ui.terminal

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight

object AnsiParser {

    private val ANSI_REGEX = Regex("""\u001B\[([0-9;]*)([A-Za-z])""")
    private val OSC_REGEX = Regex("""\u001B\].*?(\u0007|\u001B\\)""")

    private val COLOR_MAP = mapOf(
        30 to Color(0xFF4B5563), // Black / Gray
        31 to Color(0xFFEF4444), // Red
        32 to Color(0xFF22C55E), // Green
        33 to Color(0xFFEAB308), // Yellow
        34 to Color(0xFF3B82F6), // Blue
        35 to Color(0xFFA855F7), // Magenta
        36 to Color(0xFF06B6D4), // Cyan
        37 to Color(0xFFE5E7EB), // White
        90 to Color(0xFF9CA3AF), // Bright Black
        91 to Color(0xFFF87171), // Bright Red
        92 to Color(0xFF4ADE80), // Bright Green
        93 to Color(0xFFFDE047), // Bright Yellow
        94 to Color(0xFF60A5FA), // Bright Blue
        95 to Color(0xFFC084FC), // Bright Magenta
        96 to Color(0xFF22D3EE), // Bright Cyan
        97 to Color(0xFFFFFFFF)  // Bright White
    )

    fun parse(rawText: String): AnnotatedString {
        // Strip OSC sequences (like terminal window titles)
        val textWithoutOsc = OSC_REGEX.replace(rawText, "")

        return buildAnnotatedString {
            var currentIndex = 0
            var currentColor: Color? = null
            var isBold = false
            var isUnderline = false

            val matches = ANSI_REGEX.findAll(textWithoutOsc)
            for (match in matches) {
                // Append text before escape sequence
                if (match.range.first > currentIndex) {
                    val segment = textWithoutOsc.substring(currentIndex, match.range.first)
                    appendStyledSegment(segment, currentColor, isBold, isUnderline)
                }

                val codesStr = match.groupValues[1]
                val command = match.groupValues[2]

                // 'm' indicates SGR (Select Graphic Rendition: colors, bold, etc.)
                if (command == "m") {
                    if (codesStr.isEmpty() || codesStr == "0") {
                        currentColor = null
                        isBold = false
                        isUnderline = false
                    } else {
                        val codes = codesStr.split(";").mapNotNull { it.toIntOrNull() }
                        for (code in codes) {
                            when (code) {
                                0 -> {
                                    currentColor = null
                                    isBold = false
                                    isUnderline = false
                                }
                                1 -> isBold = true
                                4 -> isUnderline = true
                                22 -> isBold = false
                                24 -> isUnderline = false
                                39 -> currentColor = null
                                in COLOR_MAP.keys -> currentColor = COLOR_MAP[code]
                            }
                        }
                    }
                }
                currentIndex = match.range.last + 1
            }

            // Append remaining text
            if (currentIndex < textWithoutOsc.length) {
                val remaining = textWithoutOsc.substring(currentIndex)
                appendStyledSegment(remaining, currentColor, isBold, isUnderline)
            }
        }
    }

    private fun AnnotatedString.Builder.appendStyledSegment(
        text: String,
        color: Color?,
        bold: Boolean,
        underline: Boolean
    ) {
        if (text.isEmpty()) return
        val start = length
        append(text)
        val end = length

        val style = SpanStyle(
            color = color ?: Color(0xFFE2E8F0),
            fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal
        )
        addStyle(style, start, end)
    }
}
